// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Creates the test users on a REAL Passbolt started with test/passbolt-server.sh: Ada (admin, RSA key) and
// Bob (user, ECC key), both with the test-only keys from fixtures/passbolt-keys.json. Registration runs through
// Passbolt's own CLI, the account setup through the public setup API – exactly like the browser extension does it.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as openpgp from '../vendor/openpgp.mjs';
import PassboltProvider from '../src/providers/passbolt/index.js';
import { KEYS } from './fake-passbolt.js';

const SCRIPT = fileURLToPath(new URL('./passbolt-server.sh', import.meta.url));

async function api(base, path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${base}${path}`, {
    method, headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body && JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(json.body ?? json).slice(0, 300)}`);
  return json.body;
}

async function createUser(base, { email, first, last, role, key }) {
  const url = execFileSync('sh', [SCRIPT, 'register', email, first, last, role], { encoding: 'utf8', env: process.env }).trim();
  const m = url.match(/setup\/start\/([0-9a-f-]{36})\/([0-9a-f-]{36})/);
  if (!m) throw new Error(`Registrierung von ${email} fehlgeschlagen: ${url}`);
  const [, userId, token] = m;
  await api(base, `/setup/start/${userId}/${token}.json`);
  await api(base, `/setup/complete/${userId}.json`, {
    method: 'POST', body: { authentication_token: { token }, gpgkey: { armored_key: key.public }, user: { locale: 'de-DE' } },
  });
  return { userId, email, privateKey: key.private, publicKey: key.public, passphrase: key.passphrase };
}

/** → { ada, bob } with userId, email, privateKey, passphrase */
export async function seedPassbolt(base) {
  const ada = await createUser(base, { email: 'ada@passbolt.test', first: 'Ada', last: 'Test', role: 'admin', key: KEYS.userRsa });
  const bob = await createUser(base, { email: 'bob@passbolt.test', first: 'Bob', last: 'Test', role: 'user', key: KEYS.userEcc });
  return { ada, bob };
}

/**
 * Turns on encrypted metadata (v5 resources) the way Passbolt's admin screen does it: Ada creates a shared
 * metadata key, gives the private part to the server, to herself and to `members` (each copy encrypted to the
 * recipient and signed by Ada), and switches the default resource type to v5.
 */
export async function enableV5(base, ada, members = []) {
  const login = await PassboltProvider.login({ server: base, userId: ada.userId, privateKey: ada.privateKey }, { password: ada.passphrase });
  const token = login.session.accessToken;
  const adaKey = await openpgp.decryptKey({ privateKey: await openpgp.readPrivateKey({ armoredKey: ada.privateKey }), passphrase: ada.passphrase });
  const { privateKey, publicKey } = await openpgp.generateKey({ type: 'ecc', curve: 'curve25519Legacy', userIDs: [{ name: 'Passbolt Metadata Key', email: 'no-reply@passbolt.test' }], format: 'object' });
  const fingerprint = privateKey.getFingerprint().toUpperCase();
  const payload = JSON.stringify({ object_type: 'PASSBOLT_METADATA_PRIVATE_KEY', domain: base, fingerprint, armored_key: privateKey.armor(), passphrase: '' });
  const copyFor = async (armoredKey) => openpgp.encrypt({
    message: await openpgp.createMessage({ text: payload }), encryptionKeys: await openpgp.readKey({ armoredKey }), signingKeys: adaKey,
  });
  const serverKey = (await api(base, '/auth/verify.json')).keydata;
  const metadata_private_keys = [
    { user_id: null, data: await copyFor(serverKey) },
    { user_id: ada.userId, data: await copyFor(KEYS.userRsa.public) },
    ...await Promise.all(members.map(async (m) => ({ user_id: m.userId, data: await copyFor(m.publicKey) }))),
  ];
  await api(base, '/metadata/keys.json?api-version=v2', { method: 'POST', token, body: { fingerprint, armored_key: publicKey.armor(), metadata_private_keys } });
  await api(base, '/metadata/types/settings.json?api-version=v2', {
    method: 'POST', token, body: {
      default_resource_types: 'v5', default_folder_type: 'v5', default_tag_type: 'v5', default_comment_type: 'v5',
      allow_creation_of_v5_resources: true, allow_creation_of_v5_folders: true, allow_creation_of_v5_tags: true, allow_creation_of_v5_comments: true,
      allow_creation_of_v4_resources: true, allow_creation_of_v4_folders: true, allow_creation_of_v4_tags: true, allow_creation_of_v4_comments: true,
      allow_v5_v4_downgrade: false, allow_v4_v5_upgrade: true,
    },
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = await seedPassbolt(process.argv[2] ?? 'http://127.0.0.1:8900');
  console.log(JSON.stringify({ ada: out.ada.userId, bob: out.bob.userId }));
}
