// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Bulk tools: duplicate detection, copy/move, mirror rules – with in-memory providers.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findDuplicates, hostOf } from '../src/lib/dupes.js';
import { deleteItems, importItems, mirrorTargetSet, runMirrorRule, transferData, transferItems, validateRule } from '../src/background/tools.js';

test('hostOf normalizes URLs', () => {
  assert.equal(hostOf('https://www.GitHub.com/login'), 'github.com');
  assert.equal(hostOf('github.com/login'), 'github.com');
  assert.equal(hostOf('android://com.app'), null);
  assert.equal(hostOf(''), null);
});

test('duplicates within and across accounts, joined over several URLs', () => {
  const items = [
    { id: '1', accountId: 'A', type: 'login', username: 'Ada', uris: ['https://github.com'], revisionDate: '2026-01-01' },
    { id: '2', accountId: 'A', type: 'login', username: 'ada', uris: ['www.github.com/login'], revisionDate: '2026-03-01' },
    { id: '3', accountId: 'B', type: 'login', username: 'ada', uris: ['https://gitlab.com', 'https://github.com/x'] },
    { id: '4', accountId: 'B', type: 'login', username: 'ada', uris: ['https://gitlab.com/login'] },
    { id: '5', accountId: 'B', type: 'login', username: 'bob', uris: ['https://github.com'] },
    { id: '6', accountId: 'A', type: 'login', username: 'x', uris: ['https://bank.example'] },
    { id: '7', accountId: 'B', type: 'login', username: 'X', uris: ['https://bank.example/'] },
    { id: '8', accountId: 'A', type: 'note', name: 'n' },
    { id: '9', accountId: 'A', type: 'login', username: 'x', uris: [] },
  ];
  const all = findDuplicates(items);
  assert.deepEqual(all.map((g) => g.items.map((i) => i.id).sort()), [['6', '7'], ['1', '2', '3', '4']]);
  const gh = all.find((g) => g.host === 'github.com');
  assert.ok(gh.within && gh.across);
  assert.equal(gh.items[0].id, '2', 'newest first');
  assert.deepEqual(findDuplicates(items, { scope: 'within' }).map((g) => g.host), ['github.com']);
  assert.deepEqual(findDuplicates(items, { scope: 'across' }).map((g) => g.host), ['bank.example', 'github.com']);
});

/* ---------- in-memory accounts ---------- */

function memProvider({ label, types = ['login', 'note'], moveFolder = true, failCreate = false } = {}) {
  return class Mem {
    static label = label;
    static capabilities = { write: true, types, moveFolder };
    static async saveItem(config, session, existing, data) {
      const st = session.store;
      if (!existing && failCreate) throw new Error('Server lehnt ab');
      const id = existing?.id ?? `${config.id}-${++st.seq}`;
      const item = { ...data, id, accountId: config.id, revisionDate: `rev${++st.seq}` };
      st.items.set(id, item);
      return { item };
    }
    static async deleteItem(config, session, existing) {
      session.store.items.delete(existing.id);
      return { deletedId: existing.id };
    }
  };
}

function world(defs) {
  const accounts = {};
  for (const [id, { provider, items = [] }] of Object.entries(defs)) {
    const store = { seq: 0, items: new Map(items.map((i) => [i.id, { accountId: id, revisionDate: 'r0', ...i }])) };
    accounts[id] = { id, config: {}, provider, store, locked: false };
  }
  const deps = {
    account: async (id) => accounts[id] ?? null,
    provider: (a) => a.provider,
    items: async (id) => (accounts[id].locked ? null : { items: [...accounts[id].store.items.values()], folders: [] }),
    reveal: async (id, itemId) => {
      const i = accounts[id].store.items.get(itemId);
      if (!i) throw new Error('Eintrag nicht gefunden');
      return { ...i };
    },
    write: async (id, fn) => fn(accounts[id].provider, accounts[id], { store: accounts[id].store }),
  };
  return { accounts, deps, list: (id) => [...accounts[id].store.items.values()] };
}

const gh = { id: 'g', type: 'login', name: 'GitHub', username: 'ada', password: 'pw', uris: ['https://github.com'], folderId: 'f1', fields: [{ name: 'x' }] };
const note = { id: 'n', type: 'note', name: 'Notiz', notes: 'geheim' };
const card = { id: 'c', type: 'card', name: 'Visa' };

test('copy and move between accounts; unsupported types and failures are reported per item', async () => {
  const w = world({ A: { provider: memProvider({ label: 'A' }), items: [gh, note, card] }, B: { provider: memProvider({ label: 'B', types: ['login'] }) } });
  const r1 = await transferItems(w.deps, { items: [{ accountId: 'A', itemId: 'g' }, { accountId: 'A', itemId: 'n' }, { accountId: 'A', itemId: 'c' }], targetAccountId: 'B', targetFolderId: 'fx', mode: 'copy' });
  assert.deepEqual(r1.map((r) => r.ok), [true, false, false]);
  assert.match(r1[1].error, /Notiz/);
  assert.match(r1[2].error, /Karte/);
  const copied = w.list('B')[0];
  assert.equal(copied.password, 'pw');
  assert.equal(copied.folderId, 'fx');
  assert.equal(w.list('A').length, 3, 'copy keeps the original');

  const r2 = await transferItems(w.deps, { items: [{ accountId: 'A', itemId: 'g' }], targetAccountId: 'B', mode: 'move' });
  assert.ok(r2[0].ok);
  assert.ok(!w.list('A').some((i) => i.id === 'g'), 'move deletes the original');
  assert.equal(w.list('B').length, 2);
});

test('move keeps the original when creating in the target fails', async () => {
  const w = world({ A: { provider: memProvider({ label: 'A' }), items: [gh] }, B: { provider: memProvider({ label: 'B', failCreate: true }) } });
  const [r] = await transferItems(w.deps, { items: [{ accountId: 'A', itemId: 'g' }], targetAccountId: 'B', mode: 'move' });
  assert.equal(r.ok, false);
  assert.ok(w.list('A').some((i) => i.id === 'g'));
});

test('move inside one account changes the folder in place (or copies+deletes if the provider cannot)', async () => {
  const w = world({ A: { provider: memProvider({ label: 'A' }), items: [gh] }, P: { provider: memProvider({ label: 'P', moveFolder: false }), items: [{ ...gh, id: 'pg' }] } });
  await transferItems(w.deps, { items: [{ accountId: 'A', itemId: 'g' }], targetAccountId: 'A', targetFolderId: 'f2', mode: 'move' });
  assert.deepEqual(w.list('A').map((i) => [i.id, i.folderId]), [['g', 'f2']], 'same id, new folder');
  await transferItems(w.deps, { items: [{ accountId: 'P', itemId: 'pg' }], targetAccountId: 'P', targetFolderId: 's2', mode: 'move' });
  assert.deepEqual(w.list('P').map((i) => i.folderId), ['s2']);
  assert.notEqual(w.list('P')[0].id, 'pg');
});

test('bulk delete respects permissions', async () => {
  const w = world({ A: { provider: memProvider({ label: 'A' }), items: [gh, { ...note, canDelete: false }] } });
  const r = await deleteItems(w.deps, { items: [{ accountId: 'A', itemId: 'g' }, { accountId: 'A', itemId: 'n' }] });
  assert.deepEqual(r.map((x) => x.ok), [true, false]);
  assert.equal(w.list('A').length, 1);
});

test('mirror rule: create, unchanged, update on source change, delete missing, no ping-pong', async () => {
  const w = world({ A: { provider: memProvider({ label: 'A' }), items: [gh, note, card] }, B: { provider: memProvider({ label: 'B' }) } });
  const rule = validateRule({ sourceAccountId: 'A', targetAccountId: 'B', targetFolderId: 'mir', deleteMissing: true });
  let { state, report } = await runMirrorRule(w.deps, rule, {});
  assert.deepEqual([report.created, report.skipped], [2, 1]);
  assert.ok(w.list('B').every((i) => i.folderId === 'mir'));

  ({ state, report } = await runMirrorRule(w.deps, rule, state));
  assert.deepEqual([report.created, report.updated, report.unchanged], [0, 0, 2]);

  // source changes → target updated; manual edit in target survives until then
  Object.assign(w.accounts.A.store.items.get('g'), { password: 'neu', revisionDate: 'r1' });
  ({ state, report } = await runMirrorRule(w.deps, rule, state));
  assert.equal(report.updated, 1);
  assert.equal(w.list('B').find((i) => i.name === 'GitHub').password, 'neu');

  // target deleted by hand → recreated
  w.accounts.B.store.items.delete(state.n.targetId);
  ({ state, report } = await runMirrorRule(w.deps, rule, state));
  assert.equal(report.created, 1);

  // source deleted → mirror deleted
  w.accounts.A.store.items.delete('n');
  ({ state, report } = await runMirrorRule(w.deps, rule, state));
  assert.equal(report.deleted, 1);
  assert.deepEqual(w.list('B').map((i) => i.name), ['GitHub']);

  // reverse rule B → A must not copy the mirrors back
  const back = validateRule({ sourceAccountId: 'B', targetAccountId: 'A' });
  const targets = mirrorTargetSet([rule, back], { [rule.id]: state });
  const r2 = await runMirrorRule(w.deps, back, {}, { mirrorTargets: targets });
  assert.equal(r2.report.created, 0);
});

test('mirror rule: without revision dates the stored state holds a hash, never the secrets', async () => {
  const w = world({ A: { provider: memProvider({ label: 'A' }), items: [{ ...gh, revisionDate: undefined }] }, B: { provider: memProvider({ label: 'B' }) } });
  const rule = validateRule({ sourceAccountId: 'A', targetAccountId: 'B' });
  let { state, report } = await runMirrorRule(w.deps, rule, {});
  assert.equal(report.created, 1);
  assert.match(state.g.rev, /^sha256:[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(state).includes('pw'), 'no password in the mirror state');

  ({ state, report } = await runMirrorRule(w.deps, rule, state));
  assert.deepEqual([report.updated, report.unchanged], [0, 1]);

  // a state from before revisions were hashed (the content itself) counts as unchanged and is replaced
  const legacy = { g: { ...state.g, rev: JSON.stringify(transferData(w.list('A')[0])) } };
  ({ state, report } = await runMirrorRule(w.deps, rule, legacy));
  assert.deepEqual([report.updated, report.unchanged], [0, 1]);
  assert.match(state.g.rev, /^sha256:/);

  Object.assign(w.accounts.A.store.items.get('g'), { password: 'neu' });
  ({ state, report } = await runMirrorRule(w.deps, rule, state));
  assert.equal(report.updated, 1);
  assert.equal(w.list('B')[0].password, 'neu');
});

test('mirror rule: locked account and invalid rules', async () => {
  const w = world({ A: { provider: memProvider({ label: 'A' }), items: [gh] }, B: { provider: memProvider({ label: 'B' }) } });
  w.accounts.B.locked = true;
  await assert.rejects(runMirrorRule(w.deps, validateRule({ sourceAccountId: 'A', targetAccountId: 'B' }), {}), /gesperrt/);
  assert.throws(() => validateRule({ sourceAccountId: 'A', targetAccountId: 'A' }), /identisch/);
});

test('transfer data: fields and cards kept where the target stores them, otherwise written into the notes', async () => {
  const { transferData } = await import('../src/background/tools.js');
  const card = { type: 'card', name: 'Visa', notes: 'n', card: { cardholderName: 'Ada', number: '4111' }, fields: [{ name: 'PIN', value: '1', type: 'hidden' }, { name: 'L', type: 'linked' }] };
  const full = transferData(card, 'f', { types: ['login', 'note', 'card'], fields: true });
  assert.deepEqual([full.type, full.card.number, full.fields.length, full.notes], ['card', '4111', 1, 'n']);
  const flat = transferData(card, null, { types: ['login', 'note'] });
  assert.equal(flat.type, 'note');
  assert.equal(flat.notes, 'n\nKarteninhaber: Ada\nKartennummer: 4111\nPIN: 1');
});

test('import: logins and notes; a login becomes a note (secrets in the text) where logins are not storable', async () => {
  const w = world({ A: { provider: memProvider({ label: 'A' }) }, N: { provider: memProvider({ label: 'N', types: ['note'] }) } });
  const items = [
    { type: 'login', name: 'Site', username: 'ada', password: 'pw', totp: '', uris: ['https://site.example'], notes: 'n', favorite: true },
    { type: 'note', name: '', notes: 'nur Text' },
  ];
  const r = await importItems(w.deps, { accountId: 'A', items, folderId: 'f9' });
  assert.deepEqual(r.map((x) => x.ok), [true, true]);
  const [site, note] = w.list('A');
  assert.deepEqual([site.type, site.password, site.folderId, site.favorite], ['login', 'pw', 'f9', true]);
  assert.deepEqual([note.type, note.name], ['note', 'Ohne Namen']);

  await importItems(w.deps, { accountId: 'N', items: [items[0]] });
  const [flat] = w.list('N');
  assert.equal(flat.type, 'note');
  assert.equal(flat.password, '', 'no password field on a note');
  assert.match(flat.notes, /Benutzer: ada\nPasswort: pw\nURL: https:\/\/site\.example\nn/);
});
