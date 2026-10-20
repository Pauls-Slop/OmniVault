// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// KeePassXC provider against a simulated KeePassXC + keepassxc-proxy (test/fixtures/fake-keepassxc.py, NaCl box
// from libsodium), over the native messaging framing.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import KeePassXCProvider from '../src/providers/keepassxc/index.js';

const FAKE = fileURLToPath(new URL('./fixtures/fake-keepassxc.py', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'omnivault-kpxc-'));
after(() => rmSync(dir, { recursive: true, force: true }));
afterEach(() => KeePassXCProvider.reset());

/** keepassxc-proxy stand-in: one process, 4-byte length + JSON in both directions. */
function processChannel(env) {
  return () => {
    const proc = spawn('python3', [FAKE], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'inherit'] });
    let buf = Buffer.alloc(0);
    const listeners = [];
    const gone = [];
    proc.stdout.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 4) {
        const n = buf.readUInt32LE(0);
        if (buf.length < 4 + n) break;
        const msg = JSON.parse(buf.subarray(4, 4 + n).toString('utf8'));
        buf = buf.subarray(4 + n);
        for (const l of listeners) l(msg);
      }
    });
    proc.on('exit', () => gone.forEach((cb) => cb('exited')));
    return {
      post: (m) => { const b = Buffer.from(JSON.stringify(m)); const h = Buffer.alloc(4); h.writeUInt32LE(b.length); proc.stdin.write(Buffer.concat([h, b])); },
      onMessage: (cb) => listeners.push(cb),
      onDisconnect: (cb) => gone.push(cb),
      close: () => proc.kill(),
    };
  };
}

let n = 0;
function setup(extra = {}) {
  const env = { FAKE_KPXC_STATE: join(dir, `db-${++n}.json`), FAKE_KPXC_LOG: join(dir, `log-${n}.txt`), ...extra };
  KeePassXCProvider.channel = processChannel(env);
  return { env, log: () => { try { return readFileSync(env.FAKE_KPXC_LOG, 'utf8'); } catch { return ''; } } };
}

test('associate once, then reconnect with the stored association', async () => {
  const { env } = setup();
  const first = await KeePassXCProvider.login({ id: 'k1' });
  assert.equal(first.status, 'ok');
  assert.match(first.configPatch.kpxcId, /^omnivault-/);
  assert.equal(Buffer.from(first.configPatch.kpxcKey, 'base64').length, 32);
  const config = { id: 'k1', ...first.configPatch };
  KeePassXCProvider.reset(); // a new browser session: new connection, new session keys
  const again = await KeePassXCProvider.login(config);
  assert.equal(again.status, 'ok');
  assert.equal(again.configPatch, undefined, 'no new association needed');
  const state = JSON.parse(readFileSync(env.FAKE_KPXC_STATE, 'utf8'));
  assert.equal(Object.keys(state.associations).length, 1);
});

test('list without secrets, groups as folders, secrets per entry through its URL, current TOTP', async () => {
  const { log } = setup();
  const config = { id: 'k1', ...(await KeePassXCProvider.login({ id: 'k1' })).configPatch };
  const { items, folders } = await KeePassXCProvider.sync(config, {});
  assert.deepEqual(items.map((i) => i.name).sort(), ['GitHub', 'Intranet', 'Ohne Adresse']);
  assert.ok(items.every((i) => i.password === undefined && i.username === undefined), 'listing holds no secrets');
  assert.deepEqual(folders.map((f) => f.name), ['Arbeit', 'Arbeit/Web', 'Papierkorb']);
  const gh = items.find((i) => i.name === 'GitHub');
  const r = await KeePassXCProvider.reveal(config, {}, gh);
  assert.deepEqual([r.username, r.password, r.hasTotp, r.folder], ['ada', 'kpxc-gh', true, 'Arbeit']);
  assert.equal((await KeePassXCProvider.currentTotp(config, {}, gh)).code, '123456');
  await assert.rejects(KeePassXCProvider.reveal(config, {}, items.find((i) => i.name === 'Ohne Adresse')), (e) => e.code === 'unsupported');
  assert.ok(!log().includes('kpxc-gh'), 'passwords never in the requests');
});

test('create, update and delete a login; create a group', async () => {
  const { env } = setup();
  const config = { id: 'k1', ...(await KeePassXCProvider.login({ id: 'k1' })).configPatch };
  const { folder } = await KeePassXCProvider.createFolder(config, {}, { name: 'Privat/Shops' });
  assert.equal(folder.name, 'Privat/Shops');
  const created = await KeePassXCProvider.saveItem(config, {}, null, { type: 'login', name: 'egal', username: 'bob', password: 'neu-1', uris: ['https://shop.example.net/login'], folderId: folder.id });
  assert.equal(created.resync, true);
  let { items } = await KeePassXCProvider.sync(config, {});
  const shop = items.find((i) => i.name === 'shop.example.net');
  assert.ok(shop, 'KeePassXC names new entries after the site');
  const state = JSON.parse(readFileSync(env.FAKE_KPXC_STATE, 'utf8'));
  assert.equal(state.entries.find((e) => e.uuid === shop.id).group, folder.id, 'created in the chosen group');
  await KeePassXCProvider.saveItem(config, {}, shop, { type: 'login', username: 'bob', password: 'neu-2', uris: shop.uris });
  assert.equal((await KeePassXCProvider.reveal(config, {}, shop)).password, 'neu-2');
  await assert.rejects(KeePassXCProvider.saveItem(config, {}, null, { type: 'login', username: 'x', password: 'y', uris: [] }), (e) => e.code === 'config');
  await KeePassXCProvider.deleteItem(config, {}, shop);
  ({ items } = await KeePassXCProvider.sync(config, {}));
  assert.ok(!items.some((i) => i.id === shop.id));
});

test('KeePassXC says no: denied association, locked database, listing not allowed, delete refused', async () => {
  setup({ FAKE_KPXC_DENY_ASSOCIATE: '1' });
  await assert.rejects(KeePassXCProvider.login({ id: 'k1' }), (e) => e.code === 'cancelled');
  KeePassXCProvider.reset();

  setup();
  const config = { id: 'k1', ...(await KeePassXCProvider.login({ id: 'k1' })).configPatch };
  KeePassXCProvider.reset();
  KeePassXCProvider.channel = processChannel({ FAKE_KPXC_STATE: join(dir, `db-${n}.json`), FAKE_KPXC_LOCKED: '1' });
  await assert.rejects(KeePassXCProvider.sync(config, {}), (e) => e.code === 'locked');
  KeePassXCProvider.reset();
  KeePassXCProvider.channel = processChannel({ FAKE_KPXC_STATE: join(dir, `db-${n}.json`), FAKE_KPXC_NO_LIST: '1' });
  await assert.rejects(KeePassXCProvider.sync(config, {}), (e) => e.code === 'config' && /list all entries/.test(e.message));
  KeePassXCProvider.reset();
  KeePassXCProvider.channel = processChannel({ FAKE_KPXC_STATE: join(dir, `db-${n}.json`), FAKE_KPXC_DENY_DELETE: '1' });
  const { items } = await KeePassXCProvider.sync(config, {});
  await assert.rejects(KeePassXCProvider.deleteItem(config, {}, items[0]), (e) => e.code === 'cancelled');
});

test('a forgotten association is detected and a new one is made', async () => {
  const { env } = setup();
  const config = { id: 'k1', kpxcId: 'omnivault-alt', kpxcKey: Buffer.alloc(32, 1).toString('base64') };
  const res = await KeePassXCProvider.login(config);
  assert.notEqual(res.configPatch.kpxcId, 'omnivault-alt');
  KeePassXCProvider.reset();
  await assert.rejects(KeePassXCProvider.sync(config, {}), (e) => e.code === 'bad_password', 'the old association is refused');
  void env;
});
