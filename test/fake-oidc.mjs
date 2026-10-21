// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Minimal OpenID Connect provider for tests: discovery, JWKS, authorize (signs the user in at once and redirects
// back), token (RS256 ID token with nonce), userinfo. Enough for a real Vaultwarden with SSO_ENABLED to run its
// whole server side of an SSO login. Not a security component – test use only.
import { createHash, createSign, generateKeyPairSync, randomBytes } from 'node:crypto';
import http from 'node:http';

const b64u = (b) => Buffer.from(b).toString('base64url');

export async function startOidc({ port, clientId = 'vaultwarden', clientSecret = 'vw-secret' }) {
  const issuer = `http://127.0.0.1:${port}`;
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
  const codes = new Map(); // code → { nonce, email, challenge }
  const tokens = new Map(); // access token → email
  const state = { email: null, log: [] };

  const sign = (claims) => {
    const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'k1' }));
    const body = b64u(JSON.stringify(claims));
    const s = createSign('RSA-SHA256').update(`${head}.${body}`).sign(privateKey);
    return `${head}.${body}.${b64u(s)}`;
  };
  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const url = new URL(req.url, issuer);
      state.log.push(url.pathname);
      if (url.pathname === '/.well-known/openid-configuration') {
        return json(res, 200, {
          issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`,
          userinfo_endpoint: `${issuer}/userinfo`, jwks_uri: `${issuer}/jwks`,
          response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'],
          scopes_supported: ['openid', 'email', 'profile'], token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
          code_challenge_methods_supported: ['S256'],
        });
      }
      if (url.pathname === '/jwks') return json(res, 200, { keys: [jwk] });
      if (url.pathname === '/authorize') {
        const q = url.searchParams;
        if (q.get('client_id') !== clientId || !state.email) return json(res, 400, { error: 'unauthorized_client' });
        const code = b64u(randomBytes(16));
        codes.set(code, { nonce: q.get('nonce'), email: state.email, challenge: q.get('code_challenge'), redirect: q.get('redirect_uri') });
        const back = new URL(q.get('redirect_uri'));
        back.searchParams.set('code', code);
        back.searchParams.set('state', q.get('state'));
        res.writeHead(302, { Location: back.href });
        return res.end();
      }
      if (url.pathname === '/token' && req.method === 'POST') {
        const f = new URLSearchParams(body);
        const basic = (req.headers.authorization ?? '').replace(/^Basic /, '');
        const [id, secret] = basic ? Buffer.from(basic, 'base64').toString().split(':').map(decodeURIComponent) : [f.get('client_id'), f.get('client_secret')];
        if (id !== clientId || secret !== clientSecret) return json(res, 401, { error: 'invalid_client' });
        if (f.get('grant_type') === 'refresh_token') {
          const email = tokens.get(`r:${f.get('refresh_token')}`);
          if (!email) return json(res, 400, { error: 'invalid_grant' });
          const at = b64u(randomBytes(16));
          tokens.set(at, email);
          state.log.push('/token#refresh');
          return json(res, 200, { access_token: at, token_type: 'Bearer', expires_in: 3600 });
        }
        const c = codes.get(f.get('code'));
        codes.delete(f.get('code'));
        if (!c) return json(res, 400, { error: 'invalid_grant' });
        if (c.challenge && createHash('sha256').update(f.get('code_verifier') ?? '').digest('base64url') !== c.challenge) return json(res, 400, { error: 'invalid_grant', error_description: 'PKCE' });
        const now = Math.floor(Date.now() / 1000);
        const sub = `user-${createHash('sha256').update(c.email).digest('hex').slice(0, 12)}`;
        const at = b64u(randomBytes(16));
        const rt = b64u(randomBytes(16));
        tokens.set(at, c.email);
        tokens.set(`r:${rt}`, c.email);
        return json(res, 200, {
          access_token: at, refresh_token: rt, token_type: 'Bearer', expires_in: 3600,
          id_token: sign({ iss: issuer, sub, aud: clientId, iat: now, exp: now + 3600, nonce: c.nonce, email: c.email, email_verified: true }),
        });
      }
      if (url.pathname === '/userinfo') {
        const email = tokens.get((req.headers.authorization ?? '').replace(/^Bearer /, ''));
        if (!email) return json(res, 401, { error: 'invalid_token' });
        return json(res, 200, { sub: `user-${createHash('sha256').update(email).digest('hex').slice(0, 12)}`, email, email_verified: true });
      }
      json(res, 404, { error: 'not_found' });
    });
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { issuer, clientId, clientSecret, state, close: () => server.close() };
}
