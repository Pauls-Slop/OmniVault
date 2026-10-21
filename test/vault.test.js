// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// HashiCorp Vault / OpenBao provider against the simulated server (fetch is mocked).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import VaultProvider, { LIMITS, buildData, mapData } from '../src/providers/vault/index.js';
import { hostPatterns } from '../src/providers/hosts.js';
import { fakeVault } from './fake-vault.js';

const SERVER = 'https://vault.example.org:8200';

function setup(opts) {
  const fake = fakeVault(opts);
  fake.put('web/github', { username: 'ada', password: 'gh-pw', url: 'https://github.com', totp: 'JBSWY3DPEHPK3PXP', team: 'core' });
  fake.put('web/shop', { Login: 'kunde', password: 'shop-pw', website: 'https://shop.example https://m.shop.example', notes: 'Kundennr. 7', port: 8080 });
  fake.put('notiz', { notes: 'nur Text', otp: 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP' });
  fake.put('tief/a/b/c', { password: 'deep' });
  fake.install();
  return fake;
}

test('mapping: aliases, extra keys as hidden fields, no password → note', () => {
  const m = mapData({ User: 'u', uri: 'https://a https://b', OTP: 'X', pin: 1234, password: 'p' });
  assert.equal(m.username, 'u');
  assert.deepEqual(m.uris, ['https://a', 'https://b']);
  assert.equal(m.totp, 'X');
  assert.deepEqual(m.fields, [{ name: 'pin', value: '1234', type: 'hidden' }]);
  // writing back keeps the original key names and the number type
  const back = buildData({ username: 'u2', password: 'p', uris: ['https://a'], totp: 'X', fields: m.fields }, { keys: m.keys, raw: { pin: 1234 } });
  assert.deepEqual(back, { User: 'u2', password: 'p', uri: 'https://a', OTP: 'X', pin: 1234 });
  assert.deepEqual(buildData({ username: 'n', password: 'q', uris: [], notes: 'x', fields: [] }), { username: 'n', password: 'q', notes: 'x' });
});

test('token login, recursive listing, lazy secrets, host pattern', async () => {
  const fake = setup();
  const config = { id: 'v1', server: SERVER, auth: 'token', mount: 'secret' };
  assert.deepEqual(hostPatterns('vault', config), ['https://vault.example.org:8200/*']);
  await assert.rejects(VaultProvider.login(config, { password: 'falsch' }), /Token ungültig/);
  const { status, session } = await VaultProvider.login(config, { password: 'root' });
  assert.equal(status, 'ok');
  assert.equal(session.token, 'root');
  const out = await VaultProvider.sync(config, session);
  const by = Object.fromEntries(out.items.map((i) => [i.id, i]));
  assert.deepEqual(Object.keys(by).sort(), ['notiz', 'tief/a/b/c', 'web/github', 'web/shop']);
  assert.equal(by['web/github'].name, 'github');
  assert.equal(by['web/github'].folder, 'web');
  assert.equal(by['web/github'].username, 'ada');
  assert.equal(by['web/github'].password, undefined, 'no secret before it is needed');
  assert.ok(by['web/github'].lazy && by['web/github'].hasPassword && by['web/github'].hasTotp);
  assert.equal(by.notiz.type, 'note');
  assert.deepEqual(by['web/shop'].uris, ['https://shop.example', 'https://m.shop.example']);
  assert.deepEqual(out.folders.map((f) => f.id), ['tief', 'tief/a', 'tief/a/b', 'web']);
  const full = await VaultProvider.reveal(config, session, by['web/shop']);
  assert.equal(full.password, 'shop-pw');
  assert.equal(full.notes, 'Kundennr. 7');
  assert.deepEqual(full.fields, [{ name: 'port', value: '8080', type: 'hidden' }]);
  const note = await VaultProvider.reveal(config, session, by.notiz);
  assert.equal(note.totp, 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP');
  assert.ok(fake.log.every((l) => !l.includes('undefined')));
});

test('userpass login, renewal, namespace header, prefix', async () => {
  const fake = setup({ namespace: 'team', ttl: 100 });
  const config = { id: 'v2', server: `${SERVER}/`, auth: 'userpass', username: 'ada', mount: 'secret', prefix: '/web/', namespace: 'team' };
  await assert.rejects(VaultProvider.login(config, { password: 'nein' }), /Benutzername oder Passwort falsch/);
  await assert.rejects(VaultProvider.login({ ...config, namespace: '' }, { password: 'ada-pw' }), /Zugriff verweigert|Benutzername/);
  const { session } = await VaultProvider.login(config, { password: 'ada-pw' });
  assert.ok(session.renewable && session.expiresAt);
  let out = await VaultProvider.sync(config, session);
  assert.deepEqual(out.items.map((i) => i.id), ['github', 'shop'], 'only below the prefix');
  assert.equal(out.session, undefined, 'no renewal while the token is fresh');
  // less than half of the lifetime left → renew-self
  out = await VaultProvider.sync(config, { ...session, expiresAt: Date.now() + 30_000 });
  assert.ok(out.session && out.session.expiresAt > Date.now() + 90_000);
  assert.equal(fake.tokens.get(session.token).renewed, 1);
  await assert.rejects(VaultProvider.sync(config, { ...session, expiresAt: Date.now() - 1 }), (e) => e.code === 'session_expired');
});

test('write with check-and-set, conflict, move, soft delete, restore, purge', async () => {
  const fake = setup();
  const config = { id: 'v3', server: SERVER, auth: 'token', mount: 'secret' };
  const { session } = await VaultProvider.login(config, { password: 'root' });
  const { items } = await VaultProvider.sync(config, session);
  const gh = items.find((i) => i.id === 'web/github');
  Object.assign(gh, await VaultProvider.reveal(config, session, gh));
  assert.equal(gh._version, 1);

  // edit in place: cas = current version, extra key kept
  const r1 = await VaultProvider.saveItem(config, session, gh, { ...gh, password: 'neu', fields: gh.fields, folderId: 'web' });
  assert.equal(r1.item._version, 2);
  assert.deepEqual(fake.kv.get('web/github').versions[1].data, { username: 'ada', password: 'neu', url: 'https://github.com', totp: 'JBSWY3DPEHPK3PXP', team: 'core' });

  // someone else wrote in between → conflict, nothing overwritten
  fake.put('web/github', { password: 'fremd' });
  await assert.rejects(VaultProvider.saveItem(config, session, r1.item, { ...r1.item, password: 'meins' }), (e) => e.code === 'conflict');
  assert.equal(fake.kv.get('web/github').versions.at(-1).data.password, 'fremd');

  // new entry: cas 0; a second one at the same path is refused
  const created = await VaultProvider.saveItem(config, session, null, { type: 'login', name: 'mail', username: 'm', password: 'x', uris: [], folderId: 'neu/ordner' });
  assert.equal(created.item.id, 'neu/ordner/mail');
  await assert.rejects(VaultProvider.saveItem(config, session, null, { type: 'login', name: 'mail', password: 'y', folderId: 'neu/ordner' }), /schon einen Eintrag/);

  // move = write at the new path + soft delete of the old one
  const moved = await VaultProvider.saveItem(config, session, created.item, { ...created.item, folderId: null });
  assert.equal(moved.item.id, 'mail');
  assert.equal(moved.deletedId, 'neu/ordner/mail');
  assert.ok(fake.kv.get('neu/ordner/mail').versions[0].deleted, 'old path is in the trash');

  // delete → trash → restore
  await VaultProvider.deleteItem(config, session, moved.item);
  let out = await VaultProvider.sync(config, session);
  assert.ok(!out.items.some((i) => i.id === 'mail'));
  const trashed = out.trash.find((i) => i.id === 'mail');
  assert.ok(trashed?.deletedDate);
  const restored = await VaultProvider.restoreItem(config, session, trashed);
  assert.equal(restored.item.password, 'x');
  out = await VaultProvider.sync(config, session);
  assert.ok(out.items.some((i) => i.id === 'mail'));

  // purge removes every version
  const old = out.trash.find((i) => i.id === 'neu/ordner/mail');
  await VaultProvider.purgeItem(config, session, old);
  assert.equal(fake.kv.has('neu/ordner/mail'), false);
});

test('limits, progress, forbidden sub-paths, wrong mount', async () => {
  const fake = setup({ denied: ['tief/a'] });
  const config = { id: 'v4', server: SERVER, auth: 'token', mount: 'secret' };
  const { session } = await VaultProvider.login(config, { password: 'root' });
  const progress = [];
  VaultProvider.onProgress = (id, done, total) => progress.push([id, done, total]);
  const saved = { ...LIMITS };
  try {
    for (let i = 0; i < 25; i++) fake.put(`viele/e${String(i).padStart(2, '0')}`, { password: String(i) });
    let out = await VaultProvider.sync(config, session);
    assert.match(out.warning, /1 Pfad ohne Leserecht/);
    assert.ok(progress.length >= 2 && progress.at(-1)[1] === progress.at(-1)[2]);
    LIMITS.entries = 10;
    out = await VaultProvider.sync(config, session);
    assert.equal(out.items.length, 10);
    assert.match(out.warning, /höchstens 10 Einträge/);
  } finally {
    Object.assign(LIMITS, saved);
    VaultProvider.onProgress = null;
  }
  await assert.rejects(VaultProvider.login({ ...config, mount: 'kv' }, { password: 'root' }), /keine KV-Engine/);
});
