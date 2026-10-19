// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Shared setup for browser tests: fake Vaultwarden + fake Passbolt over HTTP, extension test copy.
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fakeBitwarden } from './fake-bitwarden.js';
import { fakePassbolt } from './fake-passbolt.js';
import { parseAuthData, decodeCbor, verifyAuthentication, verifyRegistration } from './webauthn-rp.js';

export const LOGIN_PAGE = `<!doctype html><title>Login</title><form method="post">
  <input id="u" name="username" type="text" placeholder="Username">
  <input id="p" name="password" type="password"><button>Sign in</button></form>`;

export const CHECKOUT_PAGE = `<!doctype html><title>Kasse</title><form method="post">
  <label>Karteninhaber <input id="cn" autocomplete="cc-name"></label>
  <label>Kartennummer <input id="cc" name="cardnumber"></label>
  <select id="mm" autocomplete="cc-exp-month"><option></option>${Array.from({ length: 12 }, (_, i) => `<option value="${String(i + 1).padStart(2, '0')}">${i + 1}</option>`).join('')}</select>
  <input id="yy" autocomplete="cc-exp-year"><input id="cvc" name="cvc">
  <input id="fn" autocomplete="given-name"><input id="ln" name="lastname"><input id="em" type="email" name="email">
  <input id="zip" name="plz"><input id="city" name="ort"></form>`;

/**
 * A website with passkeys (relying party "localhost"): /webauthn.html registers and signs in, the server checks
 * every answer with test/webauthn-rp.js. With ?conditional the page asks for a passkey as soon as it loads
 * (autofill suggestions in the "username webauthn" field). The page writes its outcome into #out.
 */
export const WEBAUTHN_PAGE = `<!doctype html><title>Passkey-Seite</title>
  <label>Name <input id="user" name="username" autocomplete="username webauthn"></label>
  <button id="register" type="button">Registrieren</button> <button id="login" type="button">Mit Passkey anmelden</button>
  <pre id="out"></pre>
  <script>
  const enc = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
  const dec = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const out = (t) => { document.getElementById('out').textContent = t; };
  const post = (path, body) => fetch(path, { method: 'POST', body: JSON.stringify(body) }).then((r) => r.json());
  const asJson = (c) => (c.toJSON ? c.toJSON() : c);
  window.lastCredential = null;
  async function register() {
    const o = await post('/rp/options', { kind: 'create', user: document.getElementById('user').value });
    try {
      const c = await navigator.credentials.create({ publicKey: { ...o, challenge: dec(o.challenge), user: { ...o.user, id: dec(o.user.id) },
        excludeCredentials: o.excludeCredentials.map((x) => ({ ...x, id: dec(x.id) })) } });
      window.lastCredential = c;
      const r = await post('/rp/verify', { kind: 'create', credential: asJson(c), instance: c instanceof PublicKeyCredential && c.response instanceof AuthenticatorAttestationResponse });
      out(r.ok ? 'registriert:' + r.user + ':' + r.aaguid : 'abgelehnt:' + r.error);
    } catch (e) { out('fehler:' + e.name); }
  }
  async function login(mediation) {
    const o = await post('/rp/options', { kind: 'get' });
    try {
      const c = await navigator.credentials.get({ mediation, publicKey: { ...o, challenge: dec(o.challenge), allowCredentials: [] } });
      window.lastCredential = c;
      const r = await post('/rp/verify', { kind: 'get', credential: asJson(c), instance: c instanceof PublicKeyCredential && c.response instanceof AuthenticatorAssertionResponse });
      out(r.ok ? 'angemeldet:' + r.user + (mediation ? ':' + mediation : '') : 'abgelehnt:' + r.error);
    } catch (e) { out('fehler:' + e.name); }
  }
  document.getElementById('register').onclick = register;
  document.getElementById('login').onclick = () => login();
  if (location.search.includes('conditional')) login('conditional');
  </script>`;

function relyingParty(origin) {
  const users = new Map(); // name → user id
  const creds = new Map(); // credential id → { jwk, counter, user, aaguid }
  let challenge = null;
  let registering = null;
  const rand = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
  return {
    creds,
    handle(path, body) {
      if (!path.startsWith('/rp/')) return null;
      const req = JSON.parse(body || '{}');
      if (path === '/rp/options') {
        challenge = rand();
        if (req.kind === 'create') {
          if (!users.has(req.user)) users.set(req.user, Buffer.from(`id-${req.user}`).toString('base64url'));
          registering = req.user;
          const id = users.get(req.user);
          return {
            challenge, rp: { name: 'Passkey-Testseite', id: 'localhost' }, user: { id, name: req.user, displayName: req.user },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -8 }, { type: 'public-key', alg: -257 }],
            authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' }, timeout: 60000, attestation: 'none',
            excludeCredentials: [...creds].filter(([, c]) => c.user === req.user).map(([cid]) => ({ type: 'public-key', id: cid })),
            extensions: { credProps: true },
          };
        }
        return { challenge, rpId: 'localhost', userVerification: 'preferred', timeout: 60000 };
      }
      if (path === '/rp/verify') {
        try {
          if (!req.instance) throw new Error('kein PublicKeyCredential-Objekt');
          if (req.kind === 'create') {
            const s = verifyRegistration(req.credential, { challenge, origin, rpId: 'localhost' });
            const ad = parseAuthData(decodeCbor(Buffer.from(req.credential.response.attestationObject, 'base64url')).value.get('authData'));
            const aaguid = Buffer.from(ad.aaguid).toString('hex');
            creds.set(s.credentialId, { jwk: s.jwk, counter: s.counter, user: registering, aaguid });
            return { ok: true, user: registering, aaguid };
          }
          const stored = creds.get(req.credential.id);
          if (!stored) throw new Error('unbekannter Passkey');
          const r = verifyAuthentication(req.credential, { challenge, origin, rpId: 'localhost', stored: { ...stored, credentialId: req.credential.id } });
          const owner = Buffer.from(r.userHandle ?? '', 'base64url').toString().replace(/^id-/, '');
          if (owner !== stored.user) throw new Error('userHandle passt nicht');
          stored.counter = r.counter;
          return { ok: true, user: stored.user };
        } catch (e) {
          return { ok: false, error: e.message };
        } finally { challenge = null; }
      }
      return null;
    },
  };
}

function listen(handler, port) {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', async () => {
      const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
      if (req.url.split('?')[0] === '/login.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(LOGIN_PAGE); }
      if (req.url.split('?')[0] === '/checkout.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(CHECKOUT_PAGE); }
      if (req.url.split('?')[0] === '/webauthn.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(WEBAUTHN_PAGE); }
      const rp = handler.rp?.handle(req.url.split('?')[0], body);
      if (rp) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(rp)); }
      const r = await handler(req.url.split('?')[0], { method: req.method, headers: req.headers, body: body || undefined });
      res.writeHead(r.status, { 'Content-Type': 'application/json', ...cors, ...(r.headers ?? {}) });
      res.end(JSON.stringify(r.body));
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

export async function startServers({ bwPort = 8787, pbPort = 8788, extraItems = 12, pbMfa = false } = {}) {
  const ORIGIN = `http://localhost:${bwPort}`;
  const PB_ORIGIN = `http://localhost:${pbPort}`;
  const bw = await fakeBitwarden({ kdf: { kdf: 0, kdfIterations: 600000 }, loginUri: `${ORIGIN}/login.html`, extraItems });
  const pb = await fakePassbolt({ domain: PB_ORIGIN, user: 'userEcc', loginUri: `${ORIGIN}/login.html`, mfa: pbMfa });
  bw.rp = relyingParty(ORIGIN);
  const s1 = await listen(bw, bwPort);
  const s2 = await listen(pb.handle, pbPort);
  return { ORIGIN, PB_ORIGIN, pb, rp: bw.rp, close: () => { s1.close(); s2.close(); } };
}

/** Copy of dist/chrome with localhost pre-granted (no permission prompt in automation). */
export async function extensionCopy({ permissions = [], hosts = [] } = {}) {
  const ext = await mkdtemp(join(tmpdir(), 'omnivault-'));
  await cp('dist/chrome', ext, { recursive: true });
  const manifest = JSON.parse(await readFile(join(ext, 'manifest.json'), 'utf8'));
  manifest.host_permissions.push('http://localhost/*', ...hosts);
  manifest.permissions.push(...permissions);
  await writeFile(join(ext, 'manifest.json'), JSON.stringify(manifest));
  return ext;
}

/** Chromium with the extension. `lang` is the browser language (the tests expect the German interface by default). */
export async function launch(chromium, ext, { headless = true, debugPort, env, lang = 'de-DE' } = {}) {
  const profile = await mkdtemp(join(tmpdir(), 'omnivault-profile-'));
  const ctx = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless,
    locale: lang,
    env: { ...process.env, LANGUAGE: lang.replace('-', '_'), ...(env ?? {}) },
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, `--lang=${lang}`, ...(debugPort ? [`--remote-debugging-port=${debugPort}`] : [])],
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  for (let i = 0; i < 40; i++) {
    if (await sw.evaluate(() => !!(globalThis.chrome?.storage && chrome.action)).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  return { ctx, sw, profile, extId: new URL(sw.url()).host };
}
