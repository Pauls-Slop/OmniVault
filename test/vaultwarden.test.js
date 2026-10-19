// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Bitwarden provider against a REAL Vaultwarden server (not simulated). Skipped unless VAULTWARDEN_URL is set,
// e.g. after `test/vaultwarden-server.sh start` → VAULTWARDEN_URL=http://127.0.0.1:8800 node --test test/vaultwarden.test.js
import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import BitwardenProvider from '../src/providers/bitwarden/index.js';
import { deriveMasterKey, encryptBuffer, encryptSym, masterPasswordHash, splitKey } from '../src/providers/bitwarden/crypto.js';
import { fromB64 } from '../src/lib/bytes.js';
import { seedVaultwarden } from './vaultwarden-seed.mjs';

const URL_ = process.env.VAULTWARDEN_URL;
const opts = { skip: !URL_ && 'VAULTWARDEN_URL nicht gesetzt' };
let seed;
let config;

before(async () => {
  if (!URL_) return;
  seed = await seedVaultwarden(URL_);
  config = { id: 'vw1', server: URL_, email: seed.email };
});

async function login(cfg = config, creds = { password: seed.password }) {
  const res = await BitwardenProvider.login(cfg, creds);
  assert.equal(res.status, 'ok', JSON.stringify(res));
  if (res.configPatch) Object.assign(cfg, res.configPatch);
  return res.session;
}

test('real Vaultwarden: wrong password is rejected', opts, async () => {
  await assert.rejects(BitwardenProvider.login({ ...config }, { password: 'falsch' }), (e) => /bad_password|invalid|Benutzer|Passwort/i.test(`${e.code} ${e.message}`));
});

test('real Vaultwarden: login, sync, folders, organization items', opts, async () => {
  const session = await login();
  const { items, folders, session: s2 } = await BitwardenProvider.sync(config, session);
  const by = Object.fromEntries(items.map((i) => [i.name, i]));
  assert.deepEqual(Object.keys(by).sort(), ['Bank', 'GitHub', 'Notiz', 'Team-Notiz', 'Team-Wiki']);
  assert.equal(by.GitHub.password, 'gh-pass');
  assert.equal(by.GitHub.folder, 'Arbeit');
  assert.deepEqual(folders.map((f) => f.name), ['Arbeit']);
  assert.equal(by['Team-Notiz'].notes, 'Nur für das Team', 'organization key via RSA-OAEP');
  assert.equal(by['Team-Wiki'].password, 'wiki-pass');
  assert.equal(s2?.userId, seed.userId, 'user id remembered from the profile');
});

test('real Vaultwarden: create, edit (history), favorite, delete', opts, async () => {
  let session = await login();
  const keep = (r) => { if (r.session) session = r.session; return r; };
  const { item } = keep(await BitwardenProvider.saveItem(config, session, null, {
    type: 'login', name: 'Neu', username: 'bob', password: 'erst', totp: 'JBSWY3DPEHPK3PXP', uris: ['https://neu.example'], notes: 'n1',
  }));
  assert.equal(item.name, 'Neu');
  let { items } = keep(await BitwardenProvider.sync(config, session));
  const neu = items.find((i) => i.id === item.id);
  assert.equal(neu.password, 'erst');
  assert.equal(neu.totp, 'JBSWY3DPEHPK3PXP');

  keep(await BitwardenProvider.saveItem(config, session, neu, { ...neu, type: 'login', password: 'zweit', folderId: seed.folderId }));
  ({ items } = keep(await BitwardenProvider.sync(config, session)));
  const edited = items.find((i) => i.id === item.id);
  assert.equal(edited.password, 'zweit');
  assert.equal(edited.folder, 'Arbeit');
  assert.deepEqual(edited.passwordHistory?.map((h) => h.password), ['erst']);

  keep(await BitwardenProvider.setFavorite(config, session, edited, true));
  ({ items } = keep(await BitwardenProvider.sync(config, session)));
  assert.equal(items.find((i) => i.id === item.id).favorite, true);

  // stale revision is refused by the server (no silent overwrite); Vaultwarden tolerates up to 1 s difference
  await new Promise((r) => setTimeout(r, 2100));
  keep(await BitwardenProvider.saveItem(config, session, items.find((i) => i.id === item.id), { ...edited, type: 'login', notes: 'n2' }));
  await assert.rejects(BitwardenProvider.saveItem(config, session, neu, { ...neu, type: 'login', name: 'alt' }));

  keep(await BitwardenProvider.deleteItem(config, session, items.find((i) => i.id === item.id)));
  ({ items } = keep(await BitwardenProvider.sync(config, session)));
  assert.ok(!items.some((i) => i.id === item.id), 'moved to trash');
});

test('real Vaultwarden: cards, identities, custom fields, new folder, trash and restore', opts, async () => {
  let session = await login();
  const keep = (r) => { if (r.session) session = r.session; return r; };
  const find = async (id, where = 'items') => (keep(await BitwardenProvider.sync(config, session)))[where].find((i) => i.id === id);

  const { folder } = keep(await BitwardenProvider.createFolder(config, session, { name: 'Neu/Unterordner' }));
  assert.ok(folder.id);
  const { folders } = keep(await BitwardenProvider.sync(config, session));
  assert.ok(folders.some((f) => f.id === folder.id && f.name === 'Neu/Unterordner'), 'folder created and its name decrypted');

  const { item: card } = keep(await BitwardenProvider.saveItem(config, session, null, {
    type: 'card', name: 'Visa', notes: '', folderId: folder.id,
    card: { cardholderName: 'Ada Lovelace', brand: 'Visa', number: '4111111111111111', expMonth: '12', expYear: '2030', code: '123' },
    fields: [{ name: 'PIN', value: '9999', type: 'hidden' }, { name: 'Bonus', value: 'true', type: 'boolean' }],
  }));
  let c = await find(card.id);
  assert.equal(c.type, 'card');
  assert.deepEqual([c.card.number, c.card.code, c.folder], ['4111111111111111', '123', 'Neu/Unterordner']);
  assert.deepEqual(c.fields.map((f) => [f.name, f.value, f.type]), [['PIN', '9999', 'hidden'], ['Bonus', 'true', 'boolean']]);

  keep(await BitwardenProvider.saveItem(config, session, c, { type: 'card', name: 'Visa privat', notes: 'n', folderId: folder.id,
    card: { ...c.card, code: '456' }, fields: [{ name: 'PIN', value: '1111', type: 'hidden' }] }));
  c = await find(card.id);
  assert.deepEqual([c.name, c.card.code, c.fields.length, c.fields[0].value], ['Visa privat', '456', 1, '1111']);

  const { item: id } = keep(await BitwardenProvider.saveItem(config, session, null, {
    type: 'identity', name: 'Ich', notes: '', identity: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.org', city: 'London' },
  }));
  const ident = await find(id.id);
  assert.deepEqual([ident.identity.firstName, ident.identity.city, ident.subtitle], ['Ada', 'London', 'Ada Lovelace']);

  // trash: delete → listed in the trash → restore → delete → purge
  keep(await BitwardenProvider.deleteItem(config, session, ident));
  const trashed = await find(ident.id, 'trash');
  assert.ok(trashed?.deletedDate, 'deleted item is in the trash');
  keep(await BitwardenProvider.restoreItem(config, session, trashed));
  assert.equal((await find(ident.id)).name, 'Ich', 'restored');
  keep(await BitwardenProvider.deleteItem(config, session, ident));
  keep(await BitwardenProvider.purgeItem(config, session, await find(ident.id, 'trash')));
  assert.equal(await find(ident.id, 'trash'), undefined, 'purged for good');
  keep(await BitwardenProvider.deleteItem(config, session, c));
});

test('real Vaultwarden: attachments are listed, downloaded and decrypted', opts, async () => {
  let session = await login();
  const keep = (r) => { if (r.session) session = r.session; return r; };
  const { item } = keep(await BitwardenProvider.saveItem(config, session, null, { type: 'note', name: 'Mit Anhang', notes: 'siehe Datei' }));
  // upload like the official clients: per-file key encrypted with the item key, file as EncArrayBuffer
  const itemKey = splitKey(fromB64(item._key));
  const fileKey = crypto.getRandomValues(new Uint8Array(64));
  const content = new TextEncoder().encode('Vertrag Seite 1\nÄnderung 2026');
  const encFile = await encryptBuffer(content, splitKey(fileKey));
  const auth = { authorization: `Bearer ${session.accessToken}` };
  const meta = await fetch(`${URL_}/api/ciphers/${item.id}/attachment/v2`, {
    method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ key: await encryptSym(fileKey, itemKey), fileName: await encryptSym('vertrag.txt', itemKey), fileSize: encFile.length, adminRequest: false }),
  }).then((r) => r.json());
  assert.ok(meta.attachmentId, JSON.stringify(meta));
  const form = new FormData();
  form.append('data', new Blob([encFile]), 'vertrag.txt');
  const up = await fetch(`${URL_}/api/ciphers/${item.id}/attachment/${meta.attachmentId}`, { method: 'POST', headers: auth, body: form });
  assert.ok(up.ok, `upload ${up.status}`);

  const { items } = keep(await BitwardenProvider.sync(config, session));
  const withFile = items.find((i) => i.id === item.id);
  assert.deepEqual(withFile.attachments.map((a) => a.fileName), ['vertrag.txt']);
  const dl = keep(await BitwardenProvider.downloadAttachment(config, session, withFile, withFile.attachments[0].id));
  assert.equal(dl.fileName, 'vertrag.txt');
  assert.equal(new TextDecoder().decode(fromB64(dl.data)), 'Vertrag Seite 1\nÄnderung 2026');
  keep(await BitwardenProvider.deleteItem(config, session, withFile));
});

test('real Vaultwarden: edit an organization item', opts, async () => {
  let session = await login();
  let { items, session: s } = await BitwardenProvider.sync(config, session);
  if (s) session = s;
  const wiki = items.find((i) => i.name === 'Team-Wiki');
  const r = await BitwardenProvider.saveItem(config, session, wiki, { ...wiki, type: 'login', password: 'wiki-neu' });
  if (r.session) session = r.session;
  ({ items } = await BitwardenProvider.sync(config, session));
  const after = items.find((i) => i.id === wiki.id);
  assert.equal(after.password, 'wiki-neu');
  assert.equal(after.organizationId ?? after._raw?.organizationId, seed.orgId);
});

test('real Vaultwarden: personal API key login', opts, async () => {
  const session = await login();
  const mk = await deriveMasterKey(seed.password, seed.email, seed.kdf);
  const res = await fetch(`${URL_}/api/accounts/api-key`, {
    method: 'POST', headers: { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ masterPasswordHash: await masterPasswordHash(mk, seed.password) }),
  });
  assert.ok(res.ok, `api-key: ${res.status}`);
  const { apiKey } = await res.json();
  const cfg = { ...config, id: 'vw2', deviceId: undefined };
  const s = await login(cfg, { password: seed.password, clientId: `user.${seed.userId}`, clientSecret: apiKey });
  const { items } = await BitwardenProvider.sync(cfg, s);
  assert.ok(items.some((i) => i.name === 'GitHub'));
});

test('real Vaultwarden: Argon2id account', opts, async () => {
  const s = await seedVaultwarden(URL_, { kdf: { kdf: 1, kdfIterations: 3, kdfMemory: 64, kdfParallelism: 4 } });
  const cfg = { id: 'vw3', server: URL_, email: s.email };
  const session = await login(cfg, { password: s.password });
  const { items } = await BitwardenProvider.sync(cfg, session);
  assert.equal(items.length, 5);
});

test('real Vaultwarden: passkeys are stored, synced back unchanged and usable for signing in', opts, async () => {
  const { clientDataJSON, createPasskey, signAssertion } = await import('../src/lib/webauthn.js');
  const { verifyAuthentication, verifyRegistration } = await import('./webauthn-rp.js');
  let session = await login();
  const keep = (r) => { if (r.session) session = r.session; return r; };
  const origin = 'https://passkeys.example';
  const created = await createPasskey({
    rpId: 'passkeys.example', rpName: 'Passkey-Test', user: { id: new Uint8Array([1, 2, 3]), name: 'carol', displayName: 'Carol' },
    discoverable: true, clientData: clientDataJSON({ type: 'webauthn.create', challenge: 'Y2hhbGxlbmdl', origin }), userVerified: true,
  });
  const stored = verifyRegistration({ id: created.response.id, rawId: created.response.id, type: 'public-key', response: created.response },
    { challenge: 'Y2hhbGxlbmdl', origin, rpId: 'passkeys.example' });
  const { item } = keep(await BitwardenProvider.saveItem(config, session, null, {
    type: 'login', name: 'Passkey-Test', username: 'carol', password: '', uris: [origin], passkeys: [created.record],
  }));
  let { items } = keep(await BitwardenProvider.sync(config, session));
  const synced = items.find((i) => i.id === item.id);
  const { keyValue, ...meta } = created.record;
  assert.deepEqual(synced.passkeys, [meta], 'all fields back from the server');
  assert.equal(synced._passkeyKeys[created.record.credentialId], keyValue);

  const a = await signAssertion({
    record: { ...synced.passkeys[0], keyValue: synced._passkeyKeys[created.record.credentialId] },
    clientData: clientDataJSON({ type: 'webauthn.get', challenge: 'bG9naW4', origin }), userVerified: true,
  });
  verifyAuthentication({ id: a.id, rawId: a.id, type: 'public-key', response: a }, { challenge: 'bG9naW4', origin, rpId: 'passkeys.example', stored });

  keep(await BitwardenProvider.saveItem(config, session, synced, { ...synced, type: 'login', password: 'neu' }));
  ({ items } = keep(await BitwardenProvider.sync(config, session)));
  const edited = items.find((i) => i.id === item.id);
  assert.equal(edited.passkeys.length, 1, 'kept when the login is edited');
  keep(await BitwardenProvider.saveItem(config, session, edited, { ...edited, type: 'login', passkeys: [] }));
  ({ items } = keep(await BitwardenProvider.sync(config, session)));
  assert.equal(items.find((i) => i.id === item.id).passkeys, undefined, 'removed');
  keep(await BitwardenProvider.deleteItem(config, session, edited));
});
