// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Simulated Passbolt API: JWT auth, cookie-based TOTP MFA, v4 + v5 resources, folders,
// shared metadata keys (signed by an admin), metadata session keys.
// Uses the test-only keys in fixtures/passbolt-keys.json.
import { readFileSync } from 'node:fs';
import * as openpgp from '../vendor/openpgp.mjs';

export const KEYS = JSON.parse(readFileSync(new URL('./fixtures/passbolt-keys.json', import.meta.url)));
export const USER_ID = 'a8a1c3a0-0d73-4b4c-9a59-6d6e8d1d0001';
export const ADMIN_ID = 'a8a1c3a0-0d73-4b4c-9a59-6d6e8d1d00ad';

const TYPES = [
  { id: 'rt-pw', slug: 'password-string' },
  { id: 'rt-pwd', slug: 'password-and-description' },
  { id: 'rt-pwdt', slug: 'password-description-totp' },
  { id: 'rt-v5', slug: 'v5-default' },
  { id: 'rt-v5totp', slug: 'v5-default-with-totp' },
  { id: 'rt-v5note', slug: 'v5-note' },
];

const unlock = async (k) => {
  const key = await openpgp.readPrivateKey({ armoredKey: k.private });
  return key.isDecrypted() ? key : openpgp.decryptKey({ privateKey: key, passphrase: k.passphrase });
};

/**
 * @param {Object} o
 * @param {'userRsa'|'userEcc'} o.user   fixture key of the account; the other user key acts as admin
 * @param {string} o.domain              base URL the server believes it runs on
 * @param {boolean} [o.mfa]              require TOTP 123456 after login (cookie passbolt_mfa)
 * @param {boolean} [o.forgeMetadataKey] sign the shared metadata key with an untrusted key
 */
export async function fakePassbolt({ user = 'userRsa', domain, mfa = false, forgeMetadataKey = false, defaultTypes = 'v5', loginUri = 'https://gitlab.example.com/users/sign_in' }) {
  const admin = user === 'userRsa' ? 'userEcc' : 'userRsa';
  const server = await unlock(KEYS.server);
  const adminKey = await unlock(KEYS[admin]);
  const userPub = await openpgp.readKey({ armoredKey: KEYS[user].public });
  const metaPub = await openpgp.readKey({ armoredKey: KEYS.metadata.public });

  const enc = async (obj, { to = userPub, signer = server, sessionKey } = {}) => openpgp.encrypt({
    message: await openpgp.createMessage({ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }),
    encryptionKeys: to, signingKeys: signer ?? undefined, sessionKey,
  });

  const tokens = new Map(); // access token → { mfaCookie }
  const refresh = new Set();
  let counter = 0;
  const jwt = () => {
    const payload = Buffer.from(JSON.stringify({ sub: USER_ID, exp: Math.floor(Date.now() / 1000) + 300, n: ++counter })).toString('base64url');
    return `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;
  };

  // r4's metadata is encrypted to the *metadata* key although it claims user_key: only the
  // session key (from /metadata/session-keys.json) can open it – proves that path is used.
  const r4SessionKey = { data: crypto.getRandomValues(new Uint8Array(32)), algorithm: 'aes256' };
  const hex = (b) => Buffer.from(b).toString('hex').toUpperCase();

  const folders = [
    { id: 'f1', name: 'Team', folder_parent_id: null },
    { id: 'f2', name: 'Infra', folder_parent_id: 'f1' },
  ];
  const resources = [
    { // v4, plain metadata
      id: 'r1', resource_type_id: 'rt-pwd', name: 'Intranet', username: 'ada', uri: loginUri.replace('gitlab', 'intranet'),
      description: 'öffentliche Beschreibung', folder_parent_id: 'f1', permission: { type: 15 }, favorite: null,
      secrets: [{ data: await enc({ password: 'intranet-pw', description: 'geheime Notiz' }) }],
    },
    { // v4, bare password
      id: 'r2', resource_type_id: 'rt-pw', name: 'Router', username: 'admin', uri: '', description: null, folder_parent_id: null, permission: { type: 1 }, favorite: null,
      secrets: [{ data: await enc('router-pw') }],
    },
    { // v5, shared metadata key, secret with TOTP
      id: 'r3', resource_type_id: 'rt-v5totp', metadata_key_type: 'shared_key', metadata_key_id: 'mk1', folder_parent_id: 'f2', permission: { type: 15 }, favorite: { id: 'fav-r3' },
      metadata: await enc({
        object_type: 'PASSBOLT_RESOURCE_METADATA', resource_type_id: 'rt-v5totp', name: 'GitLab', username: 'ada@example.com',
        uris: [loginUri], description: 'Team-GitLab', icon: {}, custom_fields: [],
      }, { to: metaPub, signer: null }),
      secrets: [{ data: await enc({ object_type: 'PASSBOLT_SECRET_DATA', password: 'gitlab-pw', description: '', totp: { secret_key: 'JBSWY3DPEHPK3PXP', digits: 6, algorithm: 'SHA1', period: 30 } }) }],
    },
    { // v5, user_key metadata, readable only via its session key
      id: 'r4', resource_type_id: 'rt-v5note', metadata_key_type: 'user_key', metadata_key_id: null, folder_parent_id: null, permission: { type: 15 }, favorite: null,
      metadata: await enc({ object_type: 'PASSBOLT_RESOURCE_METADATA', resource_type_id: 'rt-v5note', name: 'Tresor-Notiz', username: null, uris: [], description: null },
        { to: metaPub, signer: null, sessionKey: r4SessionKey }),
      secrets: [{ data: await enc({ object_type: 'PASSBOLT_SECRET_DATA', description: 'Nur für mich' }) }],
    },
  ];
  const metadataKeys = [{
    id: 'mk1', fingerprint: KEYS.metadata.fingerprint, armored_key: KEYS.metadata.public,
    metadata_private_keys: [{
      user_id: USER_ID, created_by: ADMIN_ID, modified_by: ADMIN_ID,
      data: await enc({ object_type: 'PASSBOLT_METADATA_PRIVATE_KEY', domain, fingerprint: KEYS.metadata.fingerprint, armored_key: KEYS.metadata.private, passphrase: '' },
        { signer: forgeMetadataKey ? server : adminKey }),
    }],
  }];
  const sessionKeys = [{
    id: 'sk1', user_id: USER_ID,
    data: await enc({ object_type: 'PASSBOLT_SESSION_KEYS', session_keys: [{ foreign_model: 'Resource', foreign_id: 'r4', session_key: `9:${hex(r4SessionKey.data)}`, modified: '2026-10-01T00:00:00+00:00' }] }, { signer: await unlock(KEYS[user]) }),
  }];
  const users = { [ADMIN_ID]: { id: ADMIN_ID, gpgkey: { armored_key: KEYS[admin].public } } };
  const mine = (type = 15) => [{ aro: 'User', aro_foreign_key: USER_ID, type }];
  // r1 is shared with the admin; r2 is read-only for us
  const permissions = {
    r1: [...mine(), { aro: 'User', aro_foreign_key: ADMIN_ID, type: 1 }], r2: mine(1), r3: mine(), r4: mine(),
  };

  const sharedSecrets = {}; // resource id → secrets of the last update (all readers)
  const ok = (body, headers) => ({ status: 200, body: { header: { status: 'success' }, body }, headers });
  const err = (status, message, body = null) => ({ status, body: { header: { status: 'error', message }, body } });
  const log = [];

  async function handle(path, { method = 'GET', headers = {}, body } = {}) {
    const p = path.split('?')[0];
    log.push(`${method} ${p}`);
    const json = body ? JSON.parse(body) : null;
    const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    const auth = (h.authorization ?? '').replace(/^Bearer /, '');
    const cookie = /passbolt_mfa=([^;]+)/.exec(h.cookie ?? '')?.[1];

    if (p === '/auth/verify.json') return ok({ fingerprint: server.getFingerprint().toUpperCase(), keydata: KEYS.server.public });

    if (p === '/auth/jwt/login.json' && method === 'POST') {
      if (json.user_id !== USER_ID) return err(400, 'unknown user');
      let ch;
      try {
        const { data, signatures } = await openpgp.decrypt({
          message: await openpgp.readMessage({ armoredMessage: json.challenge }),
          decryptionKeys: server, verificationKeys: userPub, expectSigned: true,
        });
        await signatures[0].verified;
        ch = JSON.parse(data);
      } catch (e) { return err(400, `The challenge is not valid: ${e.message}`); }
      if (ch.version !== '1.0.0' || ch.domain !== domain || ch.verify_token_expiry < Date.now() / 1000) return err(400, 'invalid challenge');
      const access = jwt(); const rt = crypto.randomUUID();
      tokens.set(access, { mfaCookie: null }); refresh.add(rt);
      const answer = { version: '1.0.0', domain, verify_token: ch.verify_token, access_token: access, refresh_token: rt };
      if (mfa) answer.providers = ['totp'];
      return ok({ challenge: await enc(answer) });
    }

    if (p === '/auth/jwt/refresh.json' && method === 'POST') {
      if (!refresh.has(json.refresh_token)) return err(401, 'bad refresh token');
      refresh.delete(json.refresh_token);
      const access = jwt(); const rt = crypto.randomUUID();
      tokens.set(access, { mfaCookie: null }); refresh.add(rt);
      return ok({ access_token: access, refresh_token: rt });
    }

    const t = tokens.get(auth);
    if (!t) return err(401, 'Authentication is required to continue');

    if (p === '/mfa/verify/totp.json' && method === 'POST') {
      if (json.totp !== '123456') return err(400, 'The OTP is not valid.');
      const value = crypto.randomUUID();
      mfaCookies.add(value);
      return ok(null, { 'Set-Cookie': `passbolt_mfa=${value}; Path=/; HttpOnly; SameSite=Lax` });
    }
    if (mfa && !mfaCookies.has(cookie)) return err(403, 'MFA authentication is required.', { mfa_providers: ['totp'] });

    if (p === '/resource-types.json') return ok(TYPES);
    if (p === '/resources.json' && method === 'GET') return ok(resources);
    if (p === '/metadata/types/settings.json') return ok({ default_resource_types: defaultTypes });
    if (p === '/resources.json' && method === 'POST') {
      const r = { ...json, id: `new-${++counter}`, permission: { type: 15 }, favorite: null, modified: new Date().toISOString() };
      resources.push(r);
      permissions[r.id] = [{ aro: 'User', aro_foreign_key: USER_ID, type: 15 }];
      return ok(r);
    }
    let m;
    if ((m = /^\/resources\/([^/]+)\.json$/.exec(p))) {
      const i = resources.findIndex((r) => r.id === m[1]);
      if (i < 0) return err(404, 'not found');
      if (method === 'GET') return ok(resources[i]);
      if (method === 'PUT') {
        if (resources[i].permission.type < 7) return err(403, 'You are not allowed to update this resource.');
        // one secret per user with access, like the real server
        const readers = (permissions[m[1]] ?? []).map((x) => x.aro_foreign_key);
        if (json.secrets && (json.secrets.length !== readers.length || !readers.every((id) => json.secrets.some((x) => x.user_id === id)))) {
          return err(400, 'Could not validate resource data.', { secrets: { secrets_provided: { _required: 'secrets for all users with access' } } });
        }
        if (json.secrets) {
          sharedSecrets[m[1]] = json.secrets;
          json.secrets = json.secrets.filter((x) => x.user_id === USER_ID);
        }
        // like the real server (5.16): every secret of an update names its owner
        if ((json.secrets ?? []).some((x) => !x.user_id)) return err(400, 'Could not validate resource data.', { secrets: { 0: { user_id: { _required: 'A user identifier is required.' } } } });
        resources[i] = { ...resources[i], ...json, modified: new Date().toISOString() };
        return ok(resources[i]);
      }
      if (method === 'DELETE') {
        if (resources[i].permission.type < 15) return err(403, 'You are not allowed to delete this resource.');
        resources.splice(i, 1);
        return ok(null);
      }
    }
    if ((m = /^\/permissions\/resource\/([^/]+)\.json$/.exec(p))) return ok(permissions[m[1]] ?? []);
    if ((m = /^\/move\/resource\/([^/]+)\.json$/.exec(p)) && method === 'PUT') {
      const r = resources.find((x) => x.id === m[1]);
      r.folder_parent_id = json.folder_parent_id;
      return ok(r);
    }
    if ((m = /^\/favorites\/resource\/([^/]+)\.json$/.exec(p)) && method === 'POST') {
      const r = resources.find((x) => x.id === m[1]);
      r.favorite = { id: `fav-${m[1]}` };
      return ok(r.favorite);
    }
    if ((m = /^\/favorites\/([^/]+)\.json$/.exec(p)) && method === 'DELETE') {
      const r = resources.find((x) => x.favorite?.id === m[1]);
      if (r) r.favorite = null;
      return ok(null);
    }
    if (p === '/folders.json') return ok(folders);
    if (p === '/metadata/keys.json') return ok(metadataKeys);
    if (p === '/metadata/session-keys.json') return ok(sessionKeys);
    if (p === '/users.json') {
      const rid = new URLSearchParams(path.split('?')[1] ?? '').get('filter[has-access]');
      return ok((permissions[rid] ?? []).filter((x) => x.aro === 'User').map((x) => ({
        id: x.aro_foreign_key, gpgkey: { armored_key: x.aro_foreign_key === USER_ID ? KEYS[user].public : KEYS[admin].public },
      })));
    }
    const u = /^\/users\/([^/]+)\.json$/.exec(p);
    if (u) return users[decodeURIComponent(u[1])] ? ok(users[decodeURIComponent(u[1])]) : err(404, 'not found');
    return err(404, 'not found');
  }
  const mfaCookies = new Set();

  return { handle, log, resources, sharedSecrets, expireAll: () => tokens.clear() };
}
