// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// 1Password and LastPass providers + the real CLI host, driven against simulated `op` / `lpass`.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

  assert.equal(by.Visa.canEdit, true);
  const card = await OnePasswordProvider.reveal(config, {}, by.Visa);
  assert.deepEqual([card.card.cardholderName, card.card.number, card.card.code, card.card.expMonth, card.card.expYear], ['Ada Lovelace', '4111111111111111', '123', '12', '2030']);

  const bank = { ...by.Bank, ...(await OnePasswordProvider.reveal(config, {}, by.Bank)) };
  assert.deepEqual(bank.fields.map((f) => [f.name, f.value, f.type]), [['Kundennummer', 'K-77', 'text'], ['PIN', '4711', 'hidden']]);
  assert.deepEqual(bank.passwordHistory, [{ password: 'bank-alt-2', lastUsedDate: null }, { password: 'bank-alt-1', lastUsedDate: null }], 'password history as op lists it');

  // editing the password keeps the custom fields (the edit template replaces the whole item); like the
  // background, each later edit starts from the item the previous save returned
  let saved = await OnePasswordProvider.saveItem(config, {}, bank, { type: 'login', name: 'Bank', username: 'ada', password: 'bank-neu', totp: '', uris: bank.uris, notes: '', folderId: 'v1', favorite: true });
  let again = await OnePasswordProvider.reveal(config, {}, by.Bank);
  assert.equal(again.password, 'bank-neu');
  assert.deepEqual(again.fields.map((f) => f.name), ['Kundennummer', 'PIN'], 'fields not touched survive the edit');
  // editing the fields themselves
  saved = await OnePasswordProvider.saveItem(config, {}, saved.item, { type: 'login', name: 'Bank', username: 'ada', password: 'bank-neu', totp: '', uris: bank.uris, notes: '', folderId: 'v1', favorite: true,
    fields: [{ name: 'PIN', value: '0000', type: 'hidden' }] });
  again = await OnePasswordProvider.reveal(config, {}, by.Bank);
  assert.deepEqual(again.fields.map((f) => [f.name, f.value, f.type]), [['PIN', '0000', 'hidden']]);
  assert.ok(!log().includes('0000') && !log().includes('bank-neu'), 'field values never on argv');

  await OnePasswordProvider.setFavorite(config, {}, by.GitHub, true);
  assert.equal((await OnePasswordProvider.sync(config)).items.find((i) => i.name === 'GitHub').favorite, true);

  const { folder } = await OnePasswordProvider.createFolder(config, {}, { name: 'Familie' });
  const moved = await OnePasswordProvider.saveItem(config, {}, saved.item, { type: 'login', name: 'Bank', username: 'ada', password: 'bank-neu', totp: '', uris: bank.uris, notes: '', folderId: folder.id, favorite: true });
  assert.equal(moved.deletedId, by.Bank.id, 'old id reported as gone');
  assert.notEqual(moved.item.id, by.Bank.id);
  ({ items, folders } = await OnePasswordProvider.sync(config));
  assert.equal(items.find((i) => i.name === 'Bank').folder, 'Familie');
  t.close();
});

test('1Password: cards and identities are created from the category template and edited; secrets only via stdin', async () => {
  const { t, config, log } = opSetup();
  const state = join(dir, `op-${n}.json`);
  try {
    const card = { cardholderName: 'Grace Hopper', number: '4012888888881881', code: '987', expMonth: '7', expYear: '2031', brand: '' };
    const created = await OnePasswordProvider.saveItem(config, {}, null, { type: 'card', name: 'Firmenkarte', notes: 'Reisen', card, folderId: 'v2' });
    assert.ok(created.item.id);
    const raw = JSON.parse(readFileSync(state, 'utf8')).items.find((i) => i.id === created.item.id);
    const byId = Object.fromEntries(raw.fields.map((f) => [f.id, f]));
    assert.deepEqual([raw.category, byId.ccnum.type, byId.expiry.type, byId.expiry.value, byId.cvv.type], ['CREDIT_CARD', 'CREDIT_CARD_NUMBER', 'MONTH_YEAR', '203107', 'CONCEALED']);
    assert.equal(byId.pin.section.id, 'details', 'template fields keep their section');
    let listed = (await OnePasswordProvider.sync(config)).items.find((i) => i.id === created.item.id);
    assert.deepEqual([listed.type, listed.canEdit, listed.folder], ['card', true, 'Arbeit']);
    let got = await OnePasswordProvider.reveal(config, {}, listed);
    assert.deepEqual(got.card, { cardholderName: 'Grace Hopper', brand: 'visa', number: '4012888888881881', code: '987', expMonth: '07', expYear: '2031' });
    assert.equal(got.notes, 'Reisen');

    const existing = { ...listed, ...got };
    await OnePasswordProvider.saveItem(config, {}, existing, { type: 'card', name: 'Firmenkarte', notes: 'Reisen', folderId: 'v2', card: { ...got.card, code: '111', expMonth: '12', expYear: '32' } });
    got = await OnePasswordProvider.reveal(config, {}, listed);
    assert.deepEqual([got.card.code, got.card.expMonth, got.card.expYear, got.card.number], ['111', '12', '2032', '4012888888881881']);
    await assert.rejects(OnePasswordProvider.saveItem(config, {}, { ...listed, ...got }, { type: 'card', name: 'X', folderId: 'v2', card: { ...got.card, expMonth: '13' } }), /Ablaufdatum/);

    // the read-only seed card (no template sections) becomes editable too
    const visa = (await OnePasswordProvider.sync(config)).items.find((i) => i.name === 'Visa');
    const visaFull = { ...visa, ...(await OnePasswordProvider.reveal(config, {}, visa)) };
    await OnePasswordProvider.saveItem(config, {}, visaFull, { type: 'card', name: 'Visa', folderId: 'v1', card: { ...visaFull.card, cardholderName: 'A. Lovelace' } });
    assert.equal((await OnePasswordProvider.reveal(config, {}, visa)).card.cardholderName, 'A. Lovelace');

    const identity = { firstName: 'Ada', middleName: 'A', lastName: 'Lovelace', company: 'Analytical', email: 'ada@example.com', phone: '+44 20 1', username: 'ada' };
    const id = await OnePasswordProvider.saveItem(config, {}, null, { type: 'identity', name: 'Ich', notes: '', identity: { ...identity, address1: 'Main St 1', city: 'London' } });
    listed = (await OnePasswordProvider.sync(config)).items.find((i) => i.id === id.item.id);
    assert.equal(listed.type, 'identity');
    got = await OnePasswordProvider.reveal(config, {}, listed);
    assert.deepEqual(Object.fromEntries(Object.entries(got.identity).filter(([, v]) => v)), identity);
    assert.match(got.notes, /Main St 1, London/, 'the address is kept in the notes (op cannot write it)');
    const idRaw = JSON.parse(readFileSync(state, 'utf8')).items.find((i) => i.id === id.item.id);
    assert.equal(idRaw.fields.find((f) => f.id === 'email').type, 'EMAIL');
    await OnePasswordProvider.saveItem(config, {}, { ...listed, ...got }, { type: 'identity', name: 'Ich', notes: got.notes, identity: { ...got.identity, phone: '+44 20 2' } });
    assert.equal((await OnePasswordProvider.reveal(config, {}, listed)).identity.phone, '+44 20 2');
    assert.ok(!/4012888888881881|987|111|ada@example.com|\+44/.test(log()), 'card and identity values never on argv');
  } finally { t.close(); }
});

test('1Password: an identity address set in 1Password is read and not silently changed', async () => {
  const { t, config } = opSetup();
  const state = join(dir, `op-${n}.json`);
  try {
    await OnePasswordProvider.sync(config); // seeds the state
    const s = JSON.parse(readFileSync(state, 'utf8'));
    s.items.push({ id: 'fff6', title: 'Daheim', category: 'IDENTITY', vault: { id: 'v1', name: 'Private' }, sections: [{ id: 'address', label: 'Address' }],
      fields: [{ id: 'firstname', type: 'STRING', label: 'first name', value: 'Ada' },
        { id: 'address', section: { id: 'address' }, type: 'ADDRESS', label: 'address', value: { street: 'Hauptstr. 1', city: 'Berlin', state: '', zip: '10115', country: 'de' } }], urls: [] });
    writeFileSync(state, JSON.stringify(s));
    const listed = (await OnePasswordProvider.sync(config)).items.find((i) => i.id === 'fff6');
    const got = await OnePasswordProvider.reveal(config, {}, listed);
    assert.deepEqual([got.identity.address1, got.identity.postalCode, got.identity.city, got.identity.country], ['Hauptstr. 1', '10115', 'Berlin', 'de']);
    const item = { ...listed, ...got };
    await OnePasswordProvider.saveItem(config, {}, item, { type: 'identity', name: 'Daheim', identity: { ...got.identity, firstName: 'Ada Augusta' } });
    const after = JSON.parse(readFileSync(state, 'utf8')).items.find((i) => i.id === 'fff6');
    assert.deepEqual(after.fields.find((f) => f.id === 'address').value.street, 'Hauptstr. 1', 'address kept as object');
    assert.equal(after.fields.find((f) => f.id === 'firstname').value, 'Ada Augusta');
    const fresh = { ...listed, ...(await OnePasswordProvider.reveal(config, {}, listed)) };
    await assert.rejects(OnePasswordProvider.saveItem(config, {}, fresh, { type: 'identity', name: 'Daheim', identity: { ...fresh.identity, city: 'Hamburg' } }), /Adresse/);
  } finally { t.close(); }
});

test('1Password: the simulated op rejects malformed item JSON like op does', () => {
  const state = join(dir, `op-raw-${++n}.json`);
  const env = { ...process.env, FAKE_OP_STATE: state };
  const create = (doc) => () => execFileSync(FAKE_OP, ['item', 'create', '-', '--format', 'json'], { input: JSON.stringify(doc), env, stdio: 'pipe' });
  assert.throws(create({ title: 'x', category: 'CREDIT_CARD', fields: [{ id: 'expiry', type: 'MONTH_YEAR', value: '07/2031' }] }), /YYYYMM/);
  assert.throws(create({ title: 'x', category: 'IDENTITY', fields: [{ id: 'address', type: 'ADDRESS', value: 'Main St 1' }] }), /object/);
  assert.throws(create({ title: 'x', category: 'IDENTITY', fields: [{ id: 'firstname', type: 'STRING', value: 'A', section: { id: 'name' } }] }), /section/);
  assert.throws(create({ title: 'x', category: 'LOGIN', fields: [{ id: 'f', type: 'TEXT', value: 'A' }] }), /field type/);
});

test('1Password: attachments of items and Document items are downloaded through op read / op document get', async () => {
  const { t, config, log } = opSetup();
  const state = join(dir, `op-${n}.json`);
  try {
    const items = (await OnePasswordProvider.sync(config)).items;
    const gh = items.find((i) => i.name === 'GitHub');
    const got = await OnePasswordProvider.reveal(config, {}, gh);
    assert.deepEqual(got.attachments, [{ id: 'f1lekey', fileName: 'recovery codes.txt', size: 18 }]);
    const file = await OnePasswordProvider.downloadAttachment(config, {}, gh, 'f1lekey');
    assert.equal(file.fileName, 'recovery codes.txt');
    assert.equal(Buffer.from(file.data, 'base64').toString(), 'code-1\ncode-2\nend\n');
    assert.match(log(), /\["read", "--out-file", "[^"]+", "op:\/\/v1\/aaa1\/f1lekey"\]/);

    const docItem = items.find((i) => i.name === 'Vertrag.pdf');
    const docGot = await OnePasswordProvider.reveal(config, {}, docItem);
    assert.equal(docGot.attachments[0].fileName, 'Vertrag.pdf');
    const pdf = await OnePasswordProvider.downloadAttachment(config, {}, docItem, docGot.attachments[0].id);
    assert.equal(Buffer.from(pdf.data, 'base64').toString(), '%PDF-1.7');

    await assert.rejects(OnePasswordProvider.downloadAttachment(config, {}, gh, '../etc'), /Ungültige/);
    await assert.rejects(OnePasswordProvider.downloadAttachment(config, {}, gh, 'nope'), /Anhang nicht gefunden/);

    // a large file arrives in several messages and is put back together; above the limit it is refused
    const s = JSON.parse(readFileSync(state, 'utf8'));
    const big = Buffer.alloc(2_500_000, 7);
    const g = s.items.find((i) => i.id === 'aaa1');
    g.files.push({ id: 'b1gfile', name: 'big.bin', size: big.length }, { id: 'hugefile', name: 'huge.bin', size: 31 * 1024 * 1024 });
    g._content.b1gfile = big.toString('base64');
    g._content.hugefile = '';
    writeFileSync(state, JSON.stringify(s));
    const back = await OnePasswordProvider.downloadAttachment(config, {}, gh, 'b1gfile');
    assert.ok(Buffer.from(back.data, 'base64').equals(big));
    await assert.rejects(OnePasswordProvider.downloadAttachment(config, {}, gh, 'hugefile'), /zu groß/);
  } finally { t.close(); }
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

test('LastPass: attachments are listed from lpass show and downloaded with --attach --quiet', async () => {
  const { t, config, log } = lpSetup();
  try {
    const gh = (await LastPassProvider.sync(config)).items.find((i) => i.name === 'GitHub');
    const r = await LastPassProvider.reveal(config, {}, gh);
    assert.deepEqual(r.attachments.map((a) => [a.id, a.fileName]), [['att-1001-77', 'backup codes.txt'], ['att-1001-78', 'scan.png']]);
    assert.equal(r.notes, 'att-9-1: nur Text', 'a note that looks like an attachment stays a note');
    const file = await LastPassProvider.downloadAttachment(config, {}, gh, 'att-1001-77');
    assert.deepEqual([file.fileName, Buffer.from(file.data, 'base64').toString()], ['backup codes.txt', 'code-1\ncode-2\n']);
    const png = await LastPassProvider.downloadAttachment(config, {}, gh, 'att-1001-78');
    assert.equal(Buffer.from(png.data, 'base64')[1], 0x50, 'binary data survives');
    assert.match(log(), /"show", "--attach=att-1001-77", "--quiet", "1001"/);
    await assert.rejects(LastPassProvider.downloadAttachment(config, {}, gh, '--sync=now'), /Ungültige/);
    await assert.rejects(LastPassProvider.downloadAttachment(config, {}, gh, 'att-1'), /Anhang nicht gefunden/);
  } finally { t.close(); }
});

test('1Password: an item changed elsewhere is not overwritten; own saves and favorites are no conflict', async () => {
  const { t, config } = opSetup();
  const state = join(dir, `op-${n}.json`);
  try {
    const listed = (await OnePasswordProvider.sync(config)).items.find((i) => i.name === 'GitHub');
    const stale = { ...listed, ...(await OnePasswordProvider.reveal(config, {}, listed)) };
    // marking a favourite changes the version too: the returned item carries the new one
    const fav = (await OnePasswordProvider.setFavorite(config, {}, stale, true)).item;
    const first = await OnePasswordProvider.saveItem(config, {}, fav, { type: 'login', name: 'GitHub', username: 'ada', password: 'eins', totp: '', uris: fav.uris, notes: '', folderId: 'v1', favorite: true });
    await OnePasswordProvider.saveItem(config, {}, first.item, { type: 'login', name: 'GitHub', username: 'ada', password: 'zwei', totp: '', uris: fav.uris, notes: '', folderId: 'v1', favorite: true });
    // another device edits the item; the copy OmniVault still holds is now outdated
    execFileSync(FAKE_OP, ['item', 'edit', listed.id, '--favorite', 'false', '--format', 'json'], { env: { ...process.env, FAKE_OP_STATE: state } });
    await assert.rejects(
      OnePasswordProvider.saveItem(config, {}, first.item, { type: 'login', name: 'GitHub', username: 'ada', password: 'drei', totp: '', uris: fav.uris, notes: '', folderId: 'v1' }),
      (e) => e.code === 'conflict');
    const now = (await OnePasswordProvider.sync(config)).items.find((i) => i.id === listed.id);
    assert.equal((await OnePasswordProvider.reveal(config, {}, now)).password, 'zwei', 'nothing was overwritten');
  } finally { t.close(); }
});

test('LastPass: an item changed elsewhere is not overwritten', async () => {
  const { t, config } = lpSetup();
  const state = join(dir, `lp-${n}.json`);
  try {
    const listed = (await LastPassProvider.sync(config)).items.find((i) => i.name === 'GitHub');
    const item = { ...listed, ...(await LastPassProvider.reveal(config, {}, listed)) };
    const data = { name: 'GitHub', username: 'ada', password: 'eins', uris: item.uris, notes: '', folderId: item.folderId };
    const first = await LastPassProvider.saveItem(config, {}, item, data);
    await LastPassProvider.saveItem(config, {}, first.item, { ...data, password: 'zwei' });
    execFileSync(FAKE_LP, ['edit', listed.id, '--non-interactive'], { input: 'Password: von-woanders\n', env: { ...process.env, FAKE_LPASS_STATE: state } });
    await assert.rejects(LastPassProvider.saveItem(config, {}, first.item, { ...data, password: 'drei' }), (e) => e.code === 'conflict');
    assert.equal((await LastPassProvider.reveal(config, {}, listed)).password, 'von-woanders');
  } finally { t.close(); }
});

test('CLI host: unknown backend and malformed id rejected', async () => {
  const { t } = opSetup();
  await assert.rejects(t.request('nope', 'status'), /Unbekanntes Backend/);
  await assert.rejects(t.request('onepassword', 'reveal', { id: '../x' }), /Ungültige/);
  t.close();
});
