// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// End-to-end test of the Bitwarden provider against a simulated server (fetch is mocked).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import BitwardenProvider from '../src/providers/bitwarden/index.js';
import { API_CLIENT_ID, API_CLIENT_SECRET, EMAIL, PASSWORD, SHOP_PASSKEY_PKCS8, fakeBitwarden } from './fake-bitwarden.js';
import { clientDataJSON, createPasskey } from '../src/lib/webauthn.js';

async function makeServer(opts) {
  const handle = await fakeBitwarden(opts);
  serverHandle = handle;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push(url);
    const body = init.body instanceof URLSearchParams ? init.body.toString() : init.body;
    const r = handle(new URL(url).pathname, { ...init, body });
    return new Response(JSON.stringify(r.body), { status: r.status });
  };
  return { calls };
}

let serverHandle;
const config = { id: 'acc1', server: 'https://vault.example.org', email: EMAIL };

test('login + sync with PBKDF2 (Vaultwarden URL layout)', async () => {
  const { calls } = await makeServer({ kdf: { kdf: 0, kdfIterations: 600000 } });
  const res = await BitwardenProvider.login(config, { password: PASSWORD });
  assert.equal(res.status, 'ok');
  assert.ok(res.configPatch.deviceId);
  assert.equal(calls[0], 'https://vault.example.org/identity/accounts/prelogin');

  const { items } = await BitwardenProvider.sync(config, res.session);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  assert.equal(items.length, 7, 'deleted item skipped');
  assert.equal(byId.c1.name, 'GitHub');
  assert.equal(byId.c1.password, 'gh-pass');
  assert.equal(byId.c1.folder, 'Arbeit');
  assert.deepEqual(byId.c1.uris, ['https://github.com/login']);
  assert.equal(byId.c2.password, 'bank-pass', 'per-item key');
  assert.equal(byId.c3.notes, 'Nur für das Team', 'organization key via RSA-OAEP');
  assert.equal(byId.c3.type, 'note');
});

test('wrong password is reported', async () => {
  await makeServer({ kdf: { kdf: 0, kdfIterations: 1000 } });
  await assert.rejects(BitwardenProvider.login(config, { password: 'nope' }), { code: 'bad_password' });
});

test('Argon2id account with 2FA challenge', async () => {
  await makeServer({ kdf: { kdf: 1, kdfIterations: 3, kdfMemory: 64, kdfParallelism: 4 }, twoFactor: true });
  const t0 = Date.now();
  const first = await BitwardenProvider.login(config, { password: PASSWORD });
  const ms = Date.now() - t0;
  assert.equal(first.status, 'needs_2fa');
  assert.deepEqual(first.twoFactorProviders.map((p) => p.id), ['0'], 'WebAuthn filtered out');
  const second = await BitwardenProvider.login(config, { password: PASSWORD, twoFactorCode: '123 456', twoFactorProvider: '0' });
  assert.equal(second.status, 'ok');
  console.log(`  Argon2id 64 MiB / t=3 / p=4: ${ms} ms`);
});

test('expired access token is refreshed during sync', async () => {
  await makeServer({ kdf: { kdf: 0, kdfIterations: 1000 } });
  const res = await BitwardenProvider.login(config, { password: PASSWORD });
  const { items, session } = await BitwardenProvider.sync(config, { ...res.session, expiresAt: 0 });
  assert.equal(items.length, 7);
  assert.equal(session.accessToken, 'AT2');
  assert.equal(session.refreshToken, 'RT1');
});

async function loggedIn() {
  await makeServer({ kdf: { kdf: 0, kdfIterations: 1000 } });
  const res = await BitwardenProvider.login(config, { password: PASSWORD });
  const out = await BitwardenProvider.sync(config, res.session);
  return { ...out, session: out.session ?? res.session, by: Object.fromEntries(out.items.map((i) => [i.id, i])) };
}

test('all item types, custom fields, history and passkeys are decrypted', async () => {
  const { by } = await loggedIn();
  assert.equal(by.c5.type, 'card');
  assert.equal(by.c5.card.number, '4111 1111 1111 1111');
  assert.equal(by.c5.subtitle, 'Visa *1111');
  assert.equal(by.c6.identity.passportNumber, 'C01X00T47');
  assert.equal(by.c6.subtitle, 'Alice Example');
  assert.equal(by.c7.ssh.fingerprint, 'SHA256:abc123');
  assert.match(by.c7.ssh.privateKey, /OPENSSH PRIVATE KEY/);
  assert.deepEqual(by.c8.fields.map((f) => [f.name, f.type]), [['Kundennummer', 'text'], ['PIN', 'hidden'], ['Newsletter', 'boolean'], ['Login-Name', 'linked']]);
  assert.equal(by.c8.fields[3].linkedLabel, 'Benutzername');
  assert.equal(by.c8.passwordHistory[0].password, 'shop-older');
  assert.deepEqual(by.c8.passkeys, [{
    credentialId: 'c0ffee00-1111-4222-8333-444455556666', keyType: 'public-key', keyAlgorithm: 'ECDSA', keyCurve: 'P-256',
    rpId: 'shop.example.com', userHandle: 'YWxpY2UtaWQ', userName: 'alice', counter: '0', rpName: 'Shop', userDisplayName: 'Alice',
    discoverable: 'true', creationDate: '2026-02-03T04:05:06.000Z',
  }], 'passkey details, without the private key');
  assert.equal(by.c8._passkeyKeys['c0ffee00-1111-4222-8333-444455556666'], SHOP_PASSKEY_PKCS8, 'private key kept internally');
});

test('login with personal API key (client_credentials)', async () => {
  await makeServer({ kdf: { kdf: 0, kdfIterations: 1000 }, twoFactor: true });
  await assert.rejects(BitwardenProvider.login(config, { password: PASSWORD, clientId: API_CLIENT_ID, clientSecret: 'wrong' }), /client_secret/);
  const res = await BitwardenProvider.login(config, { password: PASSWORD, clientId: API_CLIENT_ID, clientSecret: API_CLIENT_SECRET });
  assert.equal(res.status, 'ok', '2FA not needed with API key');
  assert.equal(res.session.refreshToken, null);
  const { items, session } = await BitwardenProvider.sync(config, { ...res.session, expiresAt: 0 });
  assert.equal(items.length, 7);
  assert.equal(session.accessToken, 'ATK', 'renewed by repeating the API key grant');
  await assert.rejects(BitwardenProvider.login(config, { password: 'falsch', clientId: API_CLIENT_ID, clientSecret: API_CLIENT_SECRET }), { code: 'bad_password' });
});

test('create a login and a note', async () => {
  const { session } = await loggedIn();
  const { item } = await BitwardenProvider.saveItem(config, session, null, {
    type: 'login', name: 'Neu', username: 'bob', password: 'pw-neu', totp: '', uris: ['https://neu.example'], notes: 'n', favorite: true, folderId: null,
  });
  assert.equal(item.name, 'Neu');
  assert.equal(item.password, 'pw-neu');
  const req = serverHandle.requests.at(-1);
  assert.equal(req.method, 'POST');
  assert.match(req.json.login.password, /^2\./, 'password sent encrypted');
  assert.ok(!JSON.stringify(req.json).includes('pw-neu'), 'no plaintext on the wire');
  const note = await BitwardenProvider.saveItem(config, session, null, { type: 'note', name: 'Notiz', notes: 'geheim' });
  assert.equal(note.item.type, 'note');
  const { items } = await BitwardenProvider.sync(config, session);
  assert.ok(items.some((i) => i.name === 'Neu' && i.favorite) && items.some((i) => i.name === 'Notiz' && i.notes === 'geheim'));
});

test('editing keeps passkeys, custom fields and URI match; old password goes to history', async () => {
  const { session, by } = await loggedIn();
  const { item } = await BitwardenProvider.saveItem(config, session, by.c8, {
    type: 'login', name: 'Shop neu', username: 'alice2', password: 'shop-new', totp: '', uris: ['https://shop.example.com', 'https://m.shop.example.com'], notes: '', favorite: false, folderId: null,
  });
  assert.equal(item.password, 'shop-new');
  assert.deepEqual(item.passwordHistory.map((h) => h.password), ['shop-old', 'shop-older']);
  assert.equal(item.passkeys.length, 1, 'passkey preserved');
  assert.equal(item.fields.length, 4, 'custom fields preserved');
  const req = serverHandle.requests.at(-1).json;
  assert.equal(req.login.uris[0].match, 1, 'URI match setting preserved');
  assert.equal(req.login.fido2Credentials.length, 1);
  assert.equal(req.lastKnownRevisionDate, '2026-01-01T00:00:00Z');
  // stale edit is refused by the server and surfaces as an error
  await assert.rejects(BitwardenProvider.saveItem(config, session, by.c8, { type: 'login', name: 'x', uris: [] }), /out of date/);
});

test('editing an item with its own item key re-encrypts with that key', async () => {
  const { session, by } = await loggedIn();
  const { item } = await BitwardenProvider.saveItem(config, session, by.c2, { type: 'login', name: 'Bank neu', username: 'a123', password: 'bank-pass', uris: [] });
  assert.equal(item.name, 'Bank neu');
  assert.ok(serverHandle.requests.at(-1).json.key, 'item key kept');
  const { items } = await BitwardenProvider.sync(config, session);
  assert.equal(items.find((i) => i.id === 'c2').name, 'Bank neu', 'readable after a fresh sync');
});

test('favorite and soft delete', async () => {
  const { session, by } = await loggedIn();
  const fav = await BitwardenProvider.setFavorite(config, session, by.c1, true);
  assert.equal(fav.item.favorite, true);
  assert.match(serverHandle.requests.at(-1).path, /\/partial$/);
  await BitwardenProvider.deleteItem(config, session, by.c1);
  assert.match(serverHandle.requests.at(-1).path, /\/delete$/);
  const { items } = await BitwardenProvider.sync(config, session);
  assert.ok(!items.some((i) => i.id === 'c1'), 'item in trash is not listed');
  assert.ok(items.find((i) => i.id === 'c3') && by.c3.canEdit !== false);
});

test('passkeys: stored encrypted in Bitwarden form, added to a login, replaced and removed', async () => {
  const { session, by } = await loggedIn();
  const { record } = await createPasskey({
    rpId: 'neu.example', rpName: 'Neu', user: { id: new Uint8Array([7, 7]), name: 'bob', displayName: 'Bob' }, discoverable: true,
    clientData: clientDataJSON({ type: 'webauthn.create', challenge: 'AA', origin: 'https://neu.example' }), userVerified: true,
  });
  const created = await BitwardenProvider.saveItem(config, session, null, {
    type: 'login', name: 'Neu', username: 'bob', password: '', uris: ['https://neu.example'], passkeys: [record],
  });
  const wire = serverHandle.requests.at(-1).json.login.fido2Credentials;
  assert.equal(wire.length, 1);
  for (const f of ['credentialId', 'keyType', 'keyAlgorithm', 'keyCurve', 'keyValue', 'rpId', 'userHandle', 'userName', 'counter', 'rpName', 'userDisplayName', 'discoverable']) {
    assert.match(wire[0][f], /^2\./, `${f} encrypted`);
  }
  assert.equal(wire[0].creationDate, record.creationDate, 'creationDate in plain text, like Bitwarden');
  assert.ok(!JSON.stringify(wire).includes(record.keyValue), 'private key not in plain text');
  assert.equal(created.item.passkeys[0].userName, 'bob');
  assert.equal(created.item._passkeyKeys[record.credentialId], record.keyValue);

  // editing other fields keeps the passkey; passkeys: [] removes it
  const edited = await BitwardenProvider.saveItem(config, session, created.item, { type: 'login', name: 'Neu 2', username: 'bob', password: 'x', uris: [] });
  assert.equal(edited.item.passkeys.length, 1);
  const removed = await BitwardenProvider.saveItem(config, session, edited.item, { type: 'login', name: 'Neu 2', username: 'bob', password: 'x', uris: [], passkeys: [] });
  assert.equal(removed.item.passkeys, undefined);
  assert.equal(serverHandle.requests.at(-1).json.login.fido2Credentials, null);

  // replacing the passkey of an existing login (the fixture's key is kept as the private key of the new record)
  const replaced = await BitwardenProvider.saveItem(config, session, by.c8, {
    type: 'login', name: 'Shop', username: 'alice', password: 'shop-old', uris: [], passkeys: [{ ...record, keyValue: SHOP_PASSKEY_PKCS8 }],
  });
  assert.equal(replaced.item.passkeys.length, 1);
  assert.equal(replaced.item.passkeys[0].credentialId, record.credentialId);
});

test('collections of an organization item: listed, changed (collections_v2), read-only ones kept', async () => {
  await makeServer({ kdf: { kdf: 0, kdfIterations: 600000 }, collections: true });
  const { session } = await BitwardenProvider.login(config, { password: PASSWORD });
  const { items, organizations } = await BitwardenProvider.sync(config, session);
  const org = organizations.find((o) => o.id === 'org1');
  assert.deepEqual(org.collections.map((c) => [c.name, c.readOnly]), [['Archiv', true], ['Team', false], ['Vertrieb', false]]);
  const note = items.find((i) => i.id === 'c3');
  assert.deepEqual(note.collectionIds, ['col1', 'col3']);
  assert.equal(items.find((i) => i.id === 'c1').collectionIds, undefined, 'personal items have no collections');

  const { item } = await BitwardenProvider.setCollections(config, session, note, { collectionIds: ['col2', 'col3'], readOnlyIds: ['col3'] });
  assert.deepEqual(item.collectionIds, ['col2', 'col3']);
  const req = serverHandle.requests.at(-1);
  assert.equal(req.path, '/api/ciphers/c3/collections_v2');
  assert.deepEqual(req.json, { collectionIds: ['col2'] }, 'read-only collections are not sent (the server keeps them)');
  assert.deepEqual((await BitwardenProvider.sync(config, session)).items.find((i) => i.id === 'c3').collectionIds, ['col3', 'col2']);

  // the server refuses changes to a read-only collection; at least one collection is required; personal items refused
  await assert.rejects(BitwardenProvider.setCollections(config, session, item, { collectionIds: ['col2', 'col3'] }), /No rights/);
  await assert.rejects(BitwardenProvider.setCollections(config, session, item, { collectionIds: [] }), /mindestens eine Sammlung/);
  await assert.rejects(BitwardenProvider.setCollections(config, session, items.find((i) => i.id === 'c1'), { collectionIds: ['col1'] }), /keiner Organisation/);
});

test('collections: older servers without collections_v2 get the classic endpoint', async () => {
  await makeServer({ kdf: { kdf: 0, kdfIterations: 600000 }, collections: true, collectionsV2: false });
  const { session } = await BitwardenProvider.login(config, { password: PASSWORD });
  const note = (await BitwardenProvider.sync(config, session)).items.find((i) => i.id === 'c3');
  const { item } = await BitwardenProvider.setCollections(config, session, note, { collectionIds: ['col1', 'col2', 'col3'], readOnlyIds: ['col3'] });
  assert.deepEqual(item.collectionIds, ['col1', 'col2', 'col3']);
  assert.deepEqual(serverHandle.requests.slice(-2).map((r) => r.path), ['/api/ciphers/c3/collections_v2', '/api/ciphers/c3/collections']);
});
