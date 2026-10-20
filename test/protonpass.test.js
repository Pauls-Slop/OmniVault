// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Proton Pass provider + real native host (Python) + simulated pass-cli, over the native messaging protocol.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ProtonPassProvider from '../src/providers/protonpass/index.js';
import { ProcessTransport } from './native-transport.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const FAKE = join(root, 'test/fixtures/fake-pass-cli.py');
chmodSync(FAKE, 0o755);
const dir = mkdtempSync(join(tmpdir(), 'omnivault-proton-'));
after(() => rmSync(dir, { recursive: true, force: true }));


let n = 0;
function setup(extraEnv = {}) {
  const state = join(dir, `state-${++n}.json`);
  const log = join(dir, `log-${n}.txt`);
  const t = new ProcessTransport({ OMNIVAULT_PASS_CLI: FAKE, FAKE_PASS_STATE: state, FAKE_PASS_LOG: log, ...extraEnv });
  ProtonPassProvider.transport = t;
  return { t, log: () => readFileSync(log, 'utf8'), config: { id: 'pp1' } };
}

test('connect: status via the host; missing CLI session is reported', async () => {
  const { t, config } = setup();
  const res = await ProtonPassProvider.login(config, {});
  assert.equal(res.status, 'ok');
  assert.equal(res.configPatch.email, 'ada@proton.me');
  t.close();
  const out = setup({ FAKE_PASS_LOGGED_OUT: '1' });
  await assert.rejects(ProtonPassProvider.login(out.config, {}), /pass-cli login/);
  out.t.close();
  const none = setup({ OMNIVAULT_PASS_CLI: join(dir, 'does-not-exist') });
  await assert.rejects(ProtonPassProvider.login(none.config, {}), /pass-cli|Host/);
  none.t.close();
});

test('sync lists all vaults without secrets; reveal returns them on demand', async () => {
  const { t, config } = setup();
  const { items, folders } = await ProtonPassProvider.sync(config);
  assert.deepEqual(folders.map((f) => f.name), ['Persönlich', 'Arbeit']);
  const by = Object.fromEntries(items.map((i) => [i.name, i]));
  assert.deepEqual(Object.keys(by).sort(), ['Deploy-Key', 'Gedanken', 'Proton Mail', 'Reisepass', 'Visa', 'Wiki Arbeit'], 'trashed item skipped');
  assert.equal(by['Proton Mail'].username, 'ada@proton.me', 'email used when username empty');
  assert.equal(by['Proton Mail'].folder, 'Persönlich');
  assert.ok(by['Proton Mail'].hasTotp && by['Proton Mail'].hasPassword);
  assert.equal(by.Visa.subtitle, 'Visa *1111');
  assert.equal(by.Visa.type, 'card');
  assert.ok(!JSON.stringify(items).includes('proton-pw') && !JSON.stringify(items).includes('4111111111111111'), 'no secrets in the list');

  const r = await ProtonPassProvider.reveal(config, {}, by['Proton Mail']);
  assert.equal(r.password, 'proton-pw');
  assert.match(r.totp, /^otpauth:/);
  assert.equal(r.notes, 'Wiederherstellung im Safe');
  assert.deepEqual(r.fields.map((f) => [f.name, f.type, f.value]), [['Recovery', 'hidden', 'abc-def'], ['Hinweis', 'text', 'Hauptkonto']]);
  const card = await ProtonPassProvider.reveal(config, {}, by.Visa);
  assert.equal(card.card.number, '4111111111111111');
  assert.equal(card.card.expMonth, '09');
  const id = await ProtonPassProvider.reveal(config, {}, by.Reisepass);
  assert.equal(id.identity.passportNumber, 'C99');
  const ssh = await ProtonPassProvider.reveal(config, {}, by['Deploy-Key']);
  assert.match(ssh.ssh.privateKey, /OPENSSH/);
  t.close();
});

test('create login and note: secrets go through stdin, never the command line', async () => {
  const { t, config, log } = setup();
  const { item } = await ProtonPassProvider.saveItem(config, {}, null, {
    type: 'login', name: 'Neu', username: 'bob', password: 'Geheim!42', totp: '', uris: ['https://neu.example'], notes: '', folderId: 's2',
  });
  assert.match(item.id, /^s2\//);
  await ProtonPassProvider.saveItem(config, {}, null, { type: 'note', name: 'Idee', notes: 'Inhalt der Notiz', folderId: 's1' });
  assert.ok(!log().includes('Geheim!42'), 'password not in argv');
  assert.ok(!log().includes('Inhalt der Notiz'), 'note not in argv');
  const { items } = await ProtonPassProvider.sync(config);
  const neu = items.find((i) => i.name === 'Neu');
  assert.equal(neu.folder, 'Arbeit');
  assert.equal((await ProtonPassProvider.reveal(config, {}, neu)).password, 'Geheim!42');
  assert.equal((await ProtonPassProvider.reveal(config, {}, items.find((i) => i.name === 'Idee'))).notes, 'Inhalt der Notiz');
  t.close();
});

test('update changed fields only; TOTP refused; move to another vault; delete = trash', async () => {
  const { t, config, log } = setup();
  const { items } = await ProtonPassProvider.sync(config);
  const wiki = { ...items.find((i) => i.name === 'Wiki Arbeit') };
  Object.assign(wiki, await ProtonPassProvider.reveal(config, {}, wiki));
  await ProtonPassProvider.saveItem(config, {}, wiki, { type: 'login', name: 'Wiki', username: 'ada', password: 'wiki-neu', totp: '', uris: ['https://wiki2.example.com'], notes: '', folderId: 's2' });
  const last = log().trim().split('\n').filter((l) => l.includes('"update"')).at(-1);
  assert.match(last, /title=Wiki/);
  assert.match(last, /password=wiki-neu/);
  assert.doesNotMatch(last, /username=/, 'unchanged field not sent');
  const after = (await ProtonPassProvider.sync(config)).items.find((i) => i.id === wiki.id);
  assert.equal(after.name, 'Wiki');
  assert.deepEqual(after.uris, ['https://wiki2.example.com']);
  await assert.rejects(ProtonPassProvider.saveItem(config, {}, wiki, { type: 'login', name: 'Wiki', totp: 'JBSWY3DPEHPK3PXP', uris: [], folderId: 's2' }), /TOTP/);
  // other vault: `item move`; pass-cli prints no new id, the host finds it in the target vault
  const fresh = { ...(await ProtonPassProvider.sync(config)).items.find((i) => i.id === wiki.id) };
  Object.assign(fresh, await ProtonPassProvider.reveal(config, {}, fresh));
  const mv = await ProtonPassProvider.saveItem(config, {}, fresh, { ...fresh, type: 'login', folderId: 's1' });
  assert.equal(mv.deletedId, wiki.id);
  const movedItem = (await ProtonPassProvider.sync(config)).items.find((i) => i.name === 'Wiki');
  assert.equal(mv.item.id, movedItem.id, 'new id known right away');
  assert.equal(movedItem.folder, 'Persönlich');
  assert.equal((await ProtonPassProvider.reveal(config, {}, movedItem)).password, 'wiki-neu', 'secrets survive the move');
  // delete = trash (restorable)
  await ProtonPassProvider.deleteItem(config, {}, movedItem);
  assert.ok(!(await ProtonPassProvider.sync(config)).items.some((i) => i.name === 'Wiki'));
  assert.match(log(), /"item", "trash"/);
  assert.doesNotMatch(log(), /"item", "delete"/, 'never deleted permanently');
  t.close();
});

test('conflict: an item changed elsewhere since OmniVault read it is not overwritten', async () => {
  const { t, config } = setup();
  try {
    const stale = { ...(await ProtonPassProvider.sync(config)).items.find((i) => i.name === 'Wiki Arbeit') };
    Object.assign(stale, await ProtonPassProvider.reveal(config, {}, stale));
    // another device changes the item (directly through pass-cli)
    execFileSync(FAKE, ['item', 'update', '--share-id', 's2', '--item-id', stale.id.split('/')[1], '--field', 'title=Von woanders'],
      { env: { ...process.env, FAKE_PASS_STATE: join(dir, `state-${n}.json`) } });
    await assert.rejects(
      ProtonPassProvider.saveItem(config, {}, stale, { ...stale, type: 'login', name: 'Meins', folderId: 's2' }),
      (e) => e.code === 'conflict' && /inzwischen geändert/.test(e.message));
    const fresh = { ...(await ProtonPassProvider.sync(config)).items.find((i) => i.id === stale.id) };
    assert.equal(fresh.name, 'Von woanders', 'the other change was kept');
    Object.assign(fresh, await ProtonPassProvider.reveal(config, {}, fresh));
    const first = await ProtonPassProvider.saveItem(config, {}, fresh, { ...fresh, type: 'login', name: 'Meins', folderId: 's2' });
    // saving again from what the first save returned is not a conflict
    await ProtonPassProvider.saveItem(config, {}, first.item, { ...first.item, type: 'login', name: 'Meins 2', folderId: 's2' });
    assert.equal((await ProtonPassProvider.sync(config)).items.find((i) => i.id === stale.id).name, 'Meins 2');
  } finally { t.close(); }
});

test('real pass-cli 2.3.1 behaviour: error line, locked session, stdin, old versions', async () => {
  // logged out: the message is taken from the "Error:" line, not from the backtrace
  const out = setup({ FAKE_PASS_LOGGED_OUT: '1', RUST_BACKTRACE: '1' });
  await assert.rejects(out.t.request('proton', 'list'), /nicht angemeldet/);
  out.t.close();
  const locked = setup({ FAKE_PASS_LOCKED: '1' });
  await assert.rejects(locked.t.request('proton', 'list'), /Sperrcode/);
  locked.t.close();
  // pass-cli never gets the browser pipe as stdin
  const pipe = setup({ FAKE_PASS_CHECK_STDIN: '1' });
  const { items } = await pipe.t.request('proton', 'list');
  assert.ok(items.length > 0);
  pipe.t.close();
  // old pass-cli without trash/move: clear message, no silent permanent delete
  const old = setup({ FAKE_PASS_OLD: '1' });
  await assert.rejects(old.t.request('proton', 'delete', { shareId: 's1', itemId: 'i5' }), /Papierkorb.*aktualisieren/);
  await assert.rejects(old.t.request('proton', 'move', { shareId: 's1', itemId: 'i5', toShareId: 's2' }), /aktualisieren/);
  assert.doesNotMatch(old.log(), /"item", "delete"/);
  old.t.close();
});

test('host rejects malformed ids and splits large results below the 1 MB limit', async () => {
  const { t } = setup();
  await assert.rejects(t.request('proton', 'reveal', { shareId: '../x', itemId: 'i1' }), /Ungültige/);
  await assert.rejects(t.request('proton', 'nope'), /Unbekannter Befehl/);
  t.close();
  const out = execFileSync('python3', ['-c', `
import io, json, struct, sys
sys.path.insert(0, ${JSON.stringify(join(root, 'native'))})
import ov_common as h
buf = io.BytesIO()
h.respond(buf, 7, {"items": [{"title": "x" * 1000, "n": i} for i in range(2500)], "vaults": []})
buf.seek(0)
sizes, total = [], 0
while True:
    raw = buf.read(4)
    if not raw: break
    (n,) = struct.unpack("=I", raw)
    m = json.loads(buf.read(n)); sizes.append(n); total += len(m["result"]["items"])
print(json.dumps({"sizes": sizes, "total": total}))
`]).toString();
  const { sizes, total } = JSON.parse(out);
  assert.equal(total, 2500);
  assert.ok(sizes.length >= 3 && sizes.every((s) => s < 1024 * 1024), `chunks ${sizes.join(', ')}`);
});

test('attachments: listed from item view, downloaded with item attachment download into a private file', async () => {
  const { t, config, log } = setup();
  try {
    const note = (await ProtonPassProvider.sync(config)).items.find((i) => i.name === 'Gedanken');
    const r = await ProtonPassProvider.reveal(config, {}, note);
    assert.deepEqual(r.attachments, [{ id: 'att_A1', fileName: 'skizze.txt', size: 10 }]);
    const file = await ProtonPassProvider.downloadAttachment(config, {}, note, 'att_A1');
    assert.deepEqual([file.fileName, Buffer.from(file.data, 'base64').toString()], ['skizze.txt', 'hallo welt']);
    assert.match(log(), /"item", "attachment", "download", "--share-id", "s1", "--item-id", "i5", "--attachment-id", "att_A1", "--output", "[^"]+\/download"/);
    await assert.rejects(ProtonPassProvider.downloadAttachment(config, {}, note, '../x'), /Ungültige/);
    await assert.rejects(ProtonPassProvider.downloadAttachment(config, {}, note, 'att_B2'), /Anhang nicht gefunden/);
  } finally { t.close(); }
});
