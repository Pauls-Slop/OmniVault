// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// 1Password and LastPass providers + the real CLI host, driven against simulated `op` / `lpass`.
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProcessTransport } from './native-transport.mjs';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import OnePasswordProvider from '../src/providers/onepassword/index.js';
import LastPassProvider from '../src/providers/lastpass/index.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const FAKE_OP = join(root, 'test/fixtures/fake-op.py');
const FAKE_LP = join(root, 'test/fixtures/fake-lpass.py');
chmodSync(FAKE_OP, 0o755); chmodSync(FAKE_LP, 0o755);
const dir = mkdtempSync(join(tmpdir(), 'omnivault-cli-'));
after(() => rmSync(dir, { recursive: true, force: true }));


let n = 0;
function opSetup(extra = {}) {
  const state = join(dir, `op-${++n}.json`); const log = join(dir, `op-log-${n}.txt`);
  const t = new ProcessTransport({ OMNIVAULT_OP_BIN: FAKE_OP, FAKE_OP_STATE: state, FAKE_OP_LOG: log, ...extra });
  OnePasswordProvider.transport = t;
  return { t, log: () => { try { return readFileSync(log, 'utf8'); } catch { return ''; } }, config: { id: 'op1' } };
}
function lpSetup(extra = {}) {
  const state = join(dir, `lp-${++n}.json`); const log = join(dir, `lp-log-${n}.txt`);
  const t = new ProcessTransport({ OMNIVAULT_LPASS_BIN: FAKE_LP, FAKE_LPASS_STATE: state, FAKE_LPASS_LOG: log, ...extra });
  LastPassProvider.transport = t;
  return { t, log: () => { try { return readFileSync(log, 'utf8'); } catch { return ''; } }, config: { id: 'lp1' } };
}

test('1Password: login, lazy sync, reveal, create/update/delete without secrets on argv', async () => {
  const { t, config, log } = opSetup();
  const res = await OnePasswordProvider.login(config, {});
  assert.equal(res.status, 'ok');
  assert.equal(res.configPatch.email, 'ada@1p.me');

  const { items } = await OnePasswordProvider.sync(config);
  const by = Object.fromEntries(items.map((i) => [i.name, i]));
  assert.equal(by.GitHub.username, 'ada');
  assert.equal(by.GitHub.type, 'login');
  assert.equal(by.Notiz.type, 'note');
  assert.ok(!JSON.stringify(items).includes('op-secret'), 'no secret in the listing');

  const r = await OnePasswordProvider.reveal(config, {}, by.GitHub);
  assert.equal(r.password, 'op-secret');
  assert.match(r.totp, /^otpauth:/);

  const { item } = await OnePasswordProvider.saveItem(config, {}, null, { type: 'login', name: 'Neu', username: 'bob', password: 'Geheim!', totp: '', uris: ['https://neu.example'], notes: '' });
  assert.ok(item.id);
  await OnePasswordProvider.saveItem(config, {}, item, { ...item, type: 'login', password: 'Geheim2!' });
  assert.ok(!log().includes('Geheim!') && !log().includes('Geheim2!'), 'passwords never on the op command line');
  const neu = (await OnePasswordProvider.sync(config)).items.find((i) => i.name === 'Neu');
  assert.equal((await OnePasswordProvider.reveal(config, {}, neu)).password, 'Geheim2!');

  await OnePasswordProvider.deleteItem(config, {}, neu);
  assert.ok(!(await OnePasswordProvider.sync(config)).items.some((i) => i.name === 'Neu'));
  t.close();
});

test('1Password: vaults as folders, custom fields kept and edited, cards read, native favorites, move between vaults', async () => {
  const { t, config, log } = opSetup();
  let { items, folders } = await OnePasswordProvider.sync(config);
  assert.deepEqual(folders.map((f) => f.name), ['Arbeit', 'Private']);
  const by = Object.fromEntries(items.map((i) => [i.name, i]));
  assert.deepEqual([by.Bank.folder, by.Bank.folderId, by.Bank.favorite], ['Private', 'v1', true]);
  assert.equal(by.Visa.type, 'card');

  const card = await OnePasswordProvider.reveal(config, {}, by.Visa);
  assert.deepEqual([card.card.cardholderName, card.card.number, card.card.code, card.card.expMonth, card.card.expYear], ['Ada Lovelace', '4111111111111111', '123', '12', '2030']);

  const bank = { ...by.Bank, ...(await OnePasswordProvider.reveal(config, {}, by.Bank)) };
  assert.deepEqual(bank.fields.map((f) => [f.name, f.value, f.type]), [['Kundennummer', 'K-77', 'text'], ['PIN', '4711', 'hidden']]);

  // editing the password keeps the custom fields (the edit template replaces the whole item)
  await OnePasswordProvider.saveItem(config, {}, bank, { type: 'login', name: 'Bank', username: 'ada', password: 'bank-neu', totp: '', uris: bank.uris, notes: '', folderId: 'v1', favorite: true });
  let again = await OnePasswordProvider.reveal(config, {}, by.Bank);
  assert.equal(again.password, 'bank-neu');
  assert.deepEqual(again.fields.map((f) => f.name), ['Kundennummer', 'PIN'], 'fields not touched survive the edit');
  // editing the fields themselves
  await OnePasswordProvider.saveItem(config, {}, bank, { type: 'login', name: 'Bank', username: 'ada', password: 'bank-neu', totp: '', uris: bank.uris, notes: '', folderId: 'v1', favorite: true,
    fields: [{ name: 'PIN', value: '0000', type: 'hidden' }] });
  again = await OnePasswordProvider.reveal(config, {}, by.Bank);
  assert.deepEqual(again.fields.map((f) => [f.name, f.value, f.type]), [['PIN', '0000', 'hidden']]);
  assert.ok(!log().includes('0000') && !log().includes('bank-neu'), 'field values never on argv');

  await OnePasswordProvider.setFavorite(config, {}, by.GitHub, true);
  assert.equal((await OnePasswordProvider.sync(config)).items.find((i) => i.name === 'GitHub').favorite, true);

  const { folder } = await OnePasswordProvider.createFolder(config, {}, { name: 'Familie' });
  const moved = await OnePasswordProvider.saveItem(config, {}, bank, { type: 'login', name: 'Bank', username: 'ada', password: 'bank-neu', totp: '', uris: bank.uris, notes: '', folderId: folder.id, favorite: true });
  assert.equal(moved.deletedId, by.Bank.id, 'old id reported as gone');
  assert.notEqual(moved.item.id, by.Bank.id);
  ({ items, folders } = await OnePasswordProvider.sync(config));
  assert.equal(items.find((i) => i.name === 'Bank').folder, 'Familie');
  t.close();
});

test('1Password: not signed in is reported', async () => {
  const { t, config } = opSetup({ FAKE_OP_LOGGED_OUT: '1' });
  await assert.rejects(OnePasswordProvider.login(config, {}), /nicht angemeldet/);
  t.close();
});

test('LastPass: login, lazy sync with groups, reveal, create/update/delete via stdin', async () => {
  const { t, config, log } = lpSetup();
  assert.equal((await LastPassProvider.login(config, {})).status, 'ok');
  const { items, folders } = await LastPassProvider.sync(config);
  const by = Object.fromEntries(items.map((i) => [i.name, i]));
  assert.equal(by.GitHub.username, 'ada');
  assert.equal(by.GitHub.folder, 'Arbeit');
  assert.ok(folders.some((f) => f.id === 'Arbeit'));
  assert.ok(!JSON.stringify(items).includes('lp-secret'), 'no secret in the listing');

  const r = await LastPassProvider.reveal(config, {}, by.GitHub);
  assert.equal(r.password, 'lp-secret');

  await LastPassProvider.saveItem(config, {}, null, { type: 'login', name: 'Neu', username: 'bob', password: 'Geheim!', uris: ['https://neu.example'], notes: '', folderId: 'Arbeit' });
  assert.ok(!log().includes('Geheim!'), 'password not on the lpass command line (stdin only)');
  const neu = (await LastPassProvider.sync(config)).items.find((i) => i.name === 'Neu');
  assert.equal(neu.folder, 'Arbeit');
  assert.equal((await LastPassProvider.reveal(config, {}, neu)).password, 'Geheim!');

  await LastPassProvider.saveItem(config, {}, neu, { ...neu, type: 'login', password: 'Geheim2!' });
  assert.equal((await LastPassProvider.reveal(config, {}, { id: neu.id })).password, 'Geheim2!');

  await LastPassProvider.deleteItem(config, {}, neu);
  assert.ok(!(await LastPassProvider.sync(config)).items.some((i) => i.name === 'Neu'));
  t.close();
});

test('CLI host: unknown backend and malformed id rejected', async () => {
  const { t } = opSetup();
  await assert.rejects(t.request('nope', 'status'), /Unbekanntes Backend/);
  await assert.rejects(t.request('onepassword', 'reveal', { id: '../x' }), /Ungültige/);
  t.close();
});
