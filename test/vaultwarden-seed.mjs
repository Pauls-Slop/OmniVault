// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Creates a fresh account on a real Vaultwarden server with the same client-side crypto a Bitwarden client
// uses (registration, folder, organization + collection, personal and organization items).
// Usage as script: node test/vaultwarden-seed.mjs http://127.0.0.1:8800  → prints {email,password,…} as JSON
import { b64 } from '../src/lib/bytes.js';
import { deriveMasterKey, encryptSym, masterPasswordHash, splitKey, stretchMasterKey } from '../src/providers/bitwarden/crypto.js';

async function rsaKeyPair() {
  const k = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-1' }, true, ['encrypt', 'decrypt']);
  return {
    key: k,
    spki: b64(new Uint8Array(await crypto.subtle.exportKey('spki', k.publicKey))),
    pkcs8: new Uint8Array(await crypto.subtle.exportKey('pkcs8', k.privateKey)),
  };
}

async function json(res, what) {
  const text = await res.text();
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

export async function seedVaultwarden(origin, {
  email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@omnivault.test`,
  password = 'Vaultwarden-Test-2026!',
  kdf = { kdf: 0, kdfIterations: 600000 },
  loginUri = 'https://github.com/login',
  extraLogins = [], // [[name, username, password, uri], …]
  withOrg = true,
} = {}) {
  const mk = await deriveMasterKey(password, email, kdf);
  const userKeyBytes = crypto.getRandomValues(new Uint8Array(64));
  const userKey = splitKey(userKeyBytes);
  const rsa = await rsaKeyPair();
  const body = {
    email, name: 'OmniVault Test', masterPasswordHash: await masterPasswordHash(mk, password), masterPasswordHint: null,
    key: await encryptSym(userKeyBytes, await stretchMasterKey(mk)),
    kdf: kdf.kdf, kdfIterations: kdf.kdfIterations, kdfMemory: kdf.kdfMemory ?? null, kdfParallelism: kdf.kdfParallelism ?? null,
    keys: { publicKey: rsa.spki, encryptedPrivateKey: await encryptSym(rsa.pkcs8, userKey) },
  };
  // Current registration flow: request a verification token (returned directly when the server sends no mail),
  // then finish with the keys. Older servers only know the single /register call.
  const post = (path, data) => fetch(`${origin}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  const verify = await post('/identity/accounts/register/send-verification-email', { email, name: body.name, receiveMarketingEmails: false });
  if (verify.ok) {
    const token = (await verify.text()).replace(/^"|"$/g, '');
    await json(await post('/identity/accounts/register/finish', {
      email, emailVerificationToken: token, masterPasswordHash: body.masterPasswordHash, masterPasswordHint: null,
      userSymmetricKey: body.key, userAsymmetricKeys: body.keys,
      kdf: body.kdf, kdfIterations: body.kdfIterations, kdfMemory: body.kdfMemory, kdfParallelism: body.kdfParallelism,
    }), 'register/finish');
  } else {
    await json(await post('/identity/accounts/register', body), 'register');
  }

  // token for seeding (independent of the code under test)
  const tok = await json(await fetch(`${origin}/identity/connect/token`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password', username: email, password: body.masterPasswordHash, scope: 'api offline_access',
      client_id: 'web', deviceType: '9', deviceIdentifier: crypto.randomUUID(), deviceName: 'seed',
    }),
  }), 'token');
  const call = async (method, path, data) => json(await fetch(`${origin}/api${path}`, {
    method, headers: { authorization: `Bearer ${tok.access_token}`, 'content-type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  }), `${method} ${path}`);

  const profile = await call('GET', '/accounts/profile');
  const userId = profile.id ?? profile.Id;
  const post0 = call;
  // current Vaultwarden requires `encryptedFor` on cipher writes
  const callC = (method, path, data) => post0(method, path, path === '/ciphers' ? { ...data, encryptedFor: userId }
    : path === '/ciphers/create' ? { ...data, cipher: { ...data.cipher, encryptedFor: userId } } : data);
  const folder = await call('POST', '/folders', { name: await encryptSym('Arbeit', userKey) });
  const login = (name, username, pw, uri, k = userKey, extra = {}) => Promise.all([
    encryptSym(name, k), encryptSym(username, k), encryptSym(pw, k), encryptSym(uri, k),
  ]).then(([n, u, p, ur]) => ({ type: 1, name: n, notes: null, favorite: false, folderId: null, login: { username: u, password: p, uris: [{ uri: ur, match: null }], totp: null }, ...extra }));

  const gh = await callC('POST', '/ciphers', { ...(await login('GitHub', 'alice', 'gh-pass', loginUri)), folderId: folder.id ?? folder.Id });
  await callC('POST', '/ciphers', await login('Bank', 'alice@bank', 'bank-pass', 'https://bank.example'));
  await callC('POST', '/ciphers', { type: 2, name: await encryptSym('Notiz', userKey), notes: await encryptSym('Privat', userKey), secureNote: { type: 0 }, favorite: false });

  for (const [n, u, p, uri] of extraLogins) await callC('POST', '/ciphers', await login(n, u, p, uri));
  if (!withOrg) return { email, password, kdf, userId, folderId: folder.id ?? folder.Id, githubId: gh.id ?? gh.Id };

  // organization with its own key, shared to us via RSA-OAEP
  const orgKeyBytes = crypto.getRandomValues(new Uint8Array(64));
  const orgKey = splitKey(orgKeyBytes);
  const orgRsa = await rsaKeyPair();
  const pubKey = await crypto.subtle.importKey('spki', Uint8Array.from(atob(rsa.spki), (c) => c.charCodeAt(0)), { name: 'RSA-OAEP', hash: 'SHA-1' }, false, ['encrypt']);
  const orgKeyEnc = `4.${b64(new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, orgKeyBytes)))}`;
  const org = await call('POST', '/organizations', {
    name: 'Team', billingEmail: email, collectionName: await encryptSym('Standard', orgKey), key: orgKeyEnc,
    keys: { publicKey: orgRsa.spki, encryptedPrivateKey: await encryptSym(orgRsa.pkcs8, orgKey) }, planType: 0,
  });
  const orgId = org.id ?? org.Id;
  const cols = await call('GET', `/organizations/${orgId}/collections`);
  const colId = (cols.data ?? cols.Data)[0].id ?? (cols.data ?? cols.Data)[0].Id;
  await callC('POST', '/ciphers/create', {
    cipher: { type: 2, organizationId: orgId, name: await encryptSym('Team-Notiz', orgKey), notes: await encryptSym('Nur für das Team', orgKey), secureNote: { type: 0 }, favorite: false },
    collectionIds: [colId],
  });
  await callC('POST', '/ciphers/create', {
    cipher: { ...(await login('Team-Wiki', 'team', 'wiki-pass', 'https://wiki.example', orgKey)), organizationId: orgId },
    collectionIds: [colId],
  });
  return { email, password, kdf, userId, folderId: folder.id ?? folder.Id, orgId, githubId: gh.id ?? gh.Id };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const origin = process.argv[2] ?? 'http://127.0.0.1:8800';
  console.log(JSON.stringify(await seedVaultwarden(origin, process.argv[3] ? { email: process.argv[3] } : {})));
}
