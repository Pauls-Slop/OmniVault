// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Passbolt provider against a REAL Passbolt CE server (not simulated). Skipped unless PASSBOLT_URL is set:
//   test/passbolt-server.sh start && PASSBOLT_URL=http://127.0.0.1:8900 node --test test/passbolt-real.test.js
// The server must be fresh: the test creates the users Ada (admin) and Bob.
import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import PassboltProvider from '../src/providers/passbolt/index.js';
import { KEYS } from './fake-passbolt.js';
import { enableV5, seedPassbolt } from './passbolt-seed.mjs';

const BASE = process.env.PASSBOLT_URL;
const opts = { skip: !BASE && 'PASSBOLT_URL nicht gesetzt' };
let seed;

before(async () => {
  if (BASE) seed = await seedPassbolt(BASE);
});

/** Logs a user in and returns a small client that keeps the (possibly refreshed) session. */
async function client(who) {
  const u = seed[who];
  const config = { id: `pb-${who}`, server: BASE, userId: u.userId, privateKey: u.privateKey };
  const res = await PassboltProvider.login(config, { password: u.passphrase });
  assert.equal(res.status, 'ok');
  Object.assign(config, res.configPatch);
  let session = res.session;
  const keep = (r) => { if (r?.session) session = r.session; return r; };
  return {
    config,
    sync: async () => keep(await PassboltProvider.sync(config, session)),
    reveal: (i) => PassboltProvider.reveal(config, session, i),
    call: async (name, ...args) => keep(await PassboltProvider[name](config, session, ...args)),
    byName: async (name) => (await PassboltProvider.sync(config, session)).items.find((i) => i.name === name),
  };
}

test('real Passbolt: wrong passphrase is rejected, server key is pinned', opts, async () => {
  const u = seed.ada;
  await assert.rejects(PassboltProvider.login({ server: BASE, userId: u.userId, privateKey: u.privateKey }, { password: 'falsch' }), /Passphrase/);
  const ada = await client('ada');
  assert.match(ada.config.serverFingerprint, /^[0-9A-F]{40}$/);
  await assert.rejects(PassboltProvider.login({ ...ada.config, serverFingerprint: KEYS.server.fingerprint }, { password: u.passphrase }), /Serverschlüssel/);
});

test('real Passbolt v4 (fresh install default): create, read, edit, favorite, delete', opts, async () => {
  const ada = await client('ada');
  const { item } = await ada.call('saveItem', null, {
    type: 'login', name: 'Echt-Login', username: 'ada', password: 'pw-1', totp: 'JBSWY3DPEHPK3PXP', uris: ['https://echt.example/login'], notes: 'geheim',
  });
  let it = await ada.byName('Echt-Login');
  assert.equal(it.id, item.id);
  assert.deepEqual(it.uris, ['https://echt.example/login']);
  let sec = await ada.reveal(it);
  assert.equal(sec.password, 'pw-1');
  assert.match(sec.totp, /^otpauth:\/\/totp\/.*secret=JBSWY3DPEHPK3PXP/);
  assert.equal(sec.notes, 'geheim');

  await ada.call('saveItem', { ...it, ...sec }, { type: 'login', name: 'Echt-Login', username: 'ada2', password: 'pw-2', totp: '', uris: ['https://echt.example'], notes: '' });
  it = await ada.byName('Echt-Login');
  sec = await ada.reveal(it);
  assert.deepEqual([it.username, sec.password, sec.totp], ['ada2', 'pw-2', undefined]);

  await ada.call('setFavorite', it, true);
  assert.equal((await ada.byName('Echt-Login')).favorite, true);

  await assert.rejects(ada.call('saveItem', null, { type: 'note', name: 'Echt-Notiz', notes: 'x' }), /v5/, 'v4 has no note type');
  await ada.call('deleteItem', await ada.byName('Echt-Login'));
  assert.equal(await ada.byName('Echt-Login'), undefined);
});

test('real Passbolt v5 (encrypted metadata with a shared key): login and note, read by a second user', opts, async () => {
  await enableV5(BASE, seed.ada, [seed.bob]);
  const ada = await client('ada');
  const { item } = await ada.call('saveItem', null, { type: 'login', name: 'V5-Login', username: 'ada', password: 'v5-pw', totp: '', uris: ['https://v5.example'], notes: 'v5-notiz' });
  let it = await ada.byName('V5-Login');
  assert.equal(it._v5, true);
  assert.equal(it._metadataKeyType, 'shared_key');
  assert.deepEqual([it.username, it.uris[0]], ['ada', 'https://v5.example']);
  assert.equal((await ada.reveal(it)).password, 'v5-pw');

  await ada.call('saveItem', { ...it, ...(await ada.reveal(it)) }, { type: 'login', name: 'V5-Login', username: 'ada', password: 'v5-pw2', totp: '', uris: ['https://v5.example'], notes: '' });
  it = await ada.byName('V5-Login');
  assert.equal((await ada.reveal(it)).password, 'v5-pw2', 'v5 edit');

  const note = (await ada.call('saveItem', null, { type: 'note', name: 'V5-Notiz', notes: 'nur Text' })).item;
  assert.equal((await ada.reveal(await ada.byName('V5-Notiz'))).notes, 'nur Text');
  await ada.call('deleteItem', note);
  assert.equal(await ada.byName('V5-Notiz'), undefined);
  assert.ok(item.id);
});

test('real Passbolt v5: custom fields, new folder, conflict detection', opts, async () => {
  const ada = await client('ada');
  const { folder } = await ada.call('createFolder', { name: 'Team' });
  const { folders } = await ada.sync();
  assert.ok(folders.some((f) => f.id === folder.id && f.name === 'Team'), 'v5 folder created, name from encrypted metadata');

  await ada.call('saveItem', null, { type: 'login', name: 'Mit Feldern', username: 'ada', password: 'f-pw', totp: '', uris: [], notes: '', folderId: folder.id,
    fields: [{ name: 'PIN', value: '1234', type: 'hidden' }, { name: 'Kundennummer', value: 'K-1', type: 'text' }, { name: 'Aktiv', value: 'true', type: 'boolean' }] });
  let it = await ada.byName('Mit Feldern');
  assert.equal(it.folder, 'Team');
  let sec = await ada.reveal(it);
  assert.deepEqual(sec.fields.map((f) => [f.name, f.value, f.type]), [['PIN', '1234', 'hidden'], ['Kundennummer', 'K-1', 'text'], ['Aktiv', 'true', 'boolean']]);

  await ada.call('saveItem', { ...it, ...sec }, { type: 'login', name: 'Mit Feldern', username: 'ada', password: 'f-pw', totp: '', uris: [], notes: '', folderId: folder.id,
    fields: [{ name: 'PIN', value: '9999', type: 'hidden' }] });
  it = await ada.byName('Mit Feldern');
  sec = await ada.reveal(it);
  assert.deepEqual(sec.fields.map((f) => [f.name, f.value]), [['PIN', '9999']], 'field changed, others removed');

  // someone else changes the resource → the stale copy is refused instead of silently overwriting
  const other = await client('ada');
  const fresh = await other.byName('Mit Feldern');
  await new Promise((r) => setTimeout(r, 1100));
  await other.call('saveItem', { ...fresh, ...(await other.reveal(fresh)) }, { type: 'login', name: 'Mit Feldern', username: 'ada', password: 'neu', totp: '', uris: [], notes: '', folderId: folder.id });
  await assert.rejects(ada.call('saveItem', { ...it, ...sec }, { type: 'login', name: 'Mit Feldern', username: 'ada', password: 'alt', totp: '', uris: [], notes: '', folderId: folder.id }), /inzwischen/);
});

test('real Passbolt: share with Bob, edit the shared entry, grant update, Bob edits, revoke', opts, async () => {
  const ada = await client('ada');
  const bob = await client('bob');
  await ada.call('saveItem', null, { type: 'login', name: 'Geteilt', username: 'team', password: 'team-1', totp: '', uris: ['https://team.example'], notes: '' });
  let it = await ada.byName('Geteilt');
  await ada.reveal(it);

  const { targets } = await ada.call('shareTargets', 'bob');
  const bobTarget = targets.find((t) => t.aro === 'User' && t.sub === 'bob@passbolt.test');
  assert.ok(bobTarget, 'Bob found');
  await ada.call('share', it, [{ aro: 'User', aroId: bobTarget.aroId, type: 1 }]);
  let perms = (await ada.call('permissions', it)).permissions;
  assert.deepEqual(perms.map((p) => [p.name, p.type]).sort(), [['Ada Test', 15], ['Bob Test', 1]]);

  let forBob = await bob.byName('Geteilt');
  assert.equal(forBob.canEdit, false, 'read-only for Bob');
  assert.equal((await bob.reveal(forBob)).password, 'team-1', 'Bob decrypts the secret encrypted for him');

  // Ada edits the shared entry: the secret is re-encrypted for Bob as well
  it = await ada.byName('Geteilt');
  await ada.call('saveItem', { ...it, ...(await ada.reveal(it)) }, { type: 'login', name: 'Geteilt', username: 'team', password: 'team-2', totp: '', uris: ['https://team.example'], notes: '' });
  forBob = await bob.byName('Geteilt');
  assert.equal((await bob.reveal(forBob)).password, 'team-2', 'Bob reads the edited secret');

  // update permission → Bob can edit, Ada reads Bob's change
  const bobPerm = perms.find((p) => p.name === 'Bob Test');
  await ada.call('share', await ada.byName('Geteilt'), [{ id: bobPerm.id, type: 7 }]);
  forBob = await bob.byName('Geteilt');
  assert.equal(forBob.canEdit, true);
  await bob.call('saveItem', { ...forBob, ...(await bob.reveal(forBob)) }, { type: 'login', name: 'Geteilt', username: 'team', password: 'von-bob', totp: '', uris: ['https://team.example'], notes: '' });
  assert.equal((await ada.reveal(await ada.byName('Geteilt'))).password, 'von-bob');

  // revoke
  perms = (await ada.call('permissions', await ada.byName('Geteilt'))).permissions;
  await ada.call('share', await ada.byName('Geteilt'), [{ id: perms.find((p) => p.name === 'Bob Test').id, delete: true }]);
  assert.equal(await bob.byName('Geteilt'), undefined, 'Bob lost access');
});
