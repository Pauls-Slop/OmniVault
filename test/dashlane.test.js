// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Dashlane provider + the real CLI host, driven against a simulated `dcli` (test/fixtures/fake-dcli.py) and, without
// an account, against the real dcli 6.2642.0 release: $OMNIVAULT_DCLI_BIN or OMNIVAULT_DCLI_DOWNLOAD=1 (test/dcli-bin.sh).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ProcessTransport } from './native-transport.mjs';
import DashlaneProvider from '../src/providers/dashlane/index.js';
import { describeProviders } from '../src/providers/registry.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const FAKE = join(root, 'test/fixtures/fake-dcli.py');
chmodSync(FAKE, 0o755);
const dir = mkdtempSync(join(tmpdir(), 'omnivault-dcli-'));
after(() => rmSync(dir, { recursive: true, force: true }));

let n = 0;
function setup(extra = {}) {
  const state = join(dir, `dl-${++n}.json`); const log = join(dir, `dl-log-${n}.txt`);
  const t = new ProcessTransport({ OMNIVAULT_DCLI_BIN: FAKE, FAKE_DCLI_STATE: state, FAKE_DCLI_LOG: log, ...extra });
  DashlaneProvider.transport = t;
  return { t, state, log: () => { try { return readFileSync(log, 'utf8'); } catch { return ''; } }, config: { id: 'dl1' } };
}

test('Dashlane: login, listing without secrets, lazy reveal of logins, notes and secrets', async () => {
  const { t, config, log } = setup();
  const res = await DashlaneProvider.login(config, {});
  assert.equal(res.status, 'ok');
  assert.equal(res.configPatch.email, 'ada@example.com');

  const out = await DashlaneProvider.sync(config);
  assert.equal(out.readOnly, true);
  const by = Object.fromEntries(out.items.map((i) => [i.name, i]));
  assert.deepEqual(Object.keys(by).sort(), ['App', 'GitHub', 'WLAN zuhause', 'deploy.key', 'https://shop.example']);
  const listing = JSON.stringify(out.items);
  for (const secret of ['dl-secret', 'shop-pw', 'JBSWY3DP', 'GEZDGNBV', 'wlan-geheim', 'OPENSSH', 'Safe']) {
    assert.ok(!listing.includes(secret), `no ${secret} in the listing`);
  }
  assert.equal(by.GitHub.username, 'ada');
  assert.deepEqual(by.GitHub.uris, ['https://github.com']);
  assert.equal(by.GitHub.hasTotp, true);
  assert.equal(by.GitHub.canEdit, false);
  assert.equal(by['https://shop.example'].username, 'kunde@example.com', 'email when there is no login');
  assert.equal(by['WLAN zuhause'].type, 'note');
  assert.equal(by['deploy.key'].type, 'note');

  const gh = await DashlaneProvider.reveal(config, {}, by.GitHub);
  assert.equal(gh.password, 'dl-secret');
  assert.equal(gh.totp, 'JBSWY3DPEHPK3PXP');
  assert.equal(gh.notes, 'Wiederherstellung im Safe');
  assert.deepEqual(gh.fields, [{ name: 'email', value: 'ada@example.com', type: 'text' }]);
  const shop = await DashlaneProvider.reveal(config, {}, by['https://shop.example']);
  assert.match(shop.totp, /^otpauth:\/\/totp\/Shop/);
  assert.deepEqual(shop.fields, []);
  assert.deepEqual((await DashlaneProvider.reveal(config, {}, by.App)).fields, [{ name: 'secondaryLogin', value: 'team-42', type: 'text' }]);
  assert.match((await DashlaneProvider.reveal(config, {}, by['WLAN zuhause'])).notes, /wlan-geheim/);
  const key = await DashlaneProvider.reveal(config, {}, by['deploy.key']);
  assert.match(key.notes, /BEGIN OPENSSH PRIVATE KEY/);
  assert.equal(key.password, undefined);

  // only fixed, read-only commands; reveal filters by id, never by a title from the page
  const calls = log().trim().split('\n');
  assert.ok(calls.every((c) => /^(status|password --output json|note --output json|secret --output json)( id=\{[0-9A-F-]+\})?$/.test(c)), calls.join(' | '));
  assert.ok(calls.includes(`password --output json id=${by.GitHub.id}`));
  assert.ok(calls.includes(`secret --output json id=${by['deploy.key'].id}`));
  t.close();
});

test('Dashlane: read only – no write capability, saving and deleting refused, host has no write commands', async () => {
  const { t, config } = setup();
  const d = describeProviders().find((p) => p.id === 'dashlane');
  assert.equal(d.capabilities.write, false);
  assert.match(d.note, /dcli sync/);
  await assert.rejects(DashlaneProvider.saveItem(config, {}, null, { name: 'x' }), /kann nur lesen/);
  await assert.rejects(DashlaneProvider.deleteItem(config, {}, { id: 'x' }), /kann nur lesen/);
  for (const cmd of ['create', 'update', 'delete', 'move', 'attachment']) {
    await assert.rejects(t.request('dashlane', cmd, {}), /Unbekannter Befehl/);
  }
  t.close();
});

test('Dashlane: strict ids and kinds', async () => {
  const { t, log } = setup();
  for (const id of ['GitHub', '{6A1C3E0B-2F4D-4B7A-9C11-0D2E3F4A5B6C', '6A1C3E0B-2F4D-4B7A-9C11-0D2E3F4A5B6C', 'id=x', '--output=text', '{6A1C3E0B-2F4D-4B7A-9C11-0D2E3F4A5B6C} title=x']) {
    await assert.rejects(t.request('dashlane', 'reveal', { id, kind: 'login' }), /Ungültige Eintrags-ID/, id);
  }
  await assert.rejects(t.request('dashlane', 'reveal', { id: '{6A1C3E0B-2F4D-4B7A-9C11-0D2E3F4A5B6C}', kind: 'id' }), /Ungültige Eintragsart/);
  await assert.rejects(t.request('dashlane', 'reveal', { id: '{00000000-0000-0000-0000-000000000000}', kind: 'login' }), /Eintrag nicht gefunden/);
  assert.ok(!/reveal|GitHub|title/.test(log()), 'nothing invalid reaches dcli');
  t.close();
});

test('Dashlane: not signed in, locked vault and prompts are reported, never answered', async () => {
  let { t, config } = setup({ FAKE_DCLI_MODE: 'logged-out' });
  await assert.rejects(DashlaneProvider.login(config, {}), (e) => e.code === 'bad_password' && /nicht angemeldet.*dcli sync/.test(e.message));
  await assert.rejects(t.request('dashlane', 'list'), /nicht angemeldet/);
  t.close();
  ({ t, config } = setup({ FAKE_DCLI_MODE: 'locked' }));
  await assert.rejects(DashlaneProvider.login(config, {}), /Tresor ist gesperrt.*save-master-password/);
  await assert.rejects(t.request('dashlane', 'sync'), /gesperrt/);
  t.close();
});

test('Dashlane: sync runs dcli sync; a warning before the JSON does not break the listing', async () => {
  const { t, state, log } = setup({ FAKE_DCLI_WARN: '1' });
  assert.deepEqual(await t.request('dashlane', 'sync'), { synced: true });
  assert.equal(JSON.parse(readFileSync(state, 'utf8')).syncs, 1);
  const { items } = await t.request('dashlane', 'list', { sync: true });
  assert.equal(items.length, 5);
  assert.equal(JSON.parse(readFileSync(state, 'utf8')).syncs, 2);
  assert.match(log(), /^sync$/m);
  t.close();
});

// ---------- the real dcli, without an account ----------

let BIN = process.env.OMNIVAULT_DCLI_BIN_REAL || null;
if (!BIN && process.env.OMNIVAULT_DCLI_DOWNLOAD === '1') BIN = execFileSync(join(root, 'test/dcli-bin.sh'), { encoding: 'utf8', env: { ...process.env, OMNIVAULT_DCLI_BIN: '' } }).trim();
const real = { skip: BIN && existsSync(BIN) ? false : 'echtes dcli nicht verfügbar (OMNIVAULT_DCLI_BIN_REAL oder OMNIVAULT_DCLI_DOWNLOAD=1 setzen)', timeout: 120_000 };

test('Dashlane: real dcli without an account – status, not signed in, no prompt answered', real, async () => {
  const home = join(dir, 'home'); mkdirSync(home, { recursive: true });
  const env = { OMNIVAULT_DCLI_BIN: BIN, HOME: home, XDG_DATA_HOME: join(home, '.local/share') };
  assert.match(execFileSync(BIN, ['--version'], { encoding: 'utf8', env: { ...process.env, ...env } }), /^6\.2642\.0\s*$/);
  const t = new ProcessTransport(env);
  DashlaneProvider.transport = t;
  const st = await t.request('dashlane', 'status');
  assert.equal(st.cli, BIN);
  assert.equal(st.loggedIn, false);
  assert.equal(st.ready, false);
  await assert.rejects(DashlaneProvider.login({ id: 'r' }, {}), /nicht angemeldet/);
  // bypass the status check: dcli itself asks for the e-mail address on a closed stdin and the host reports it
  const out = execFileSync('python3', ['-I', '-c', [
    'import sys; sys.path.insert(0, sys.argv[1]); import ov_dashlane as d',
    'from ov_common import HostError',
    'try:\n  d._run(["password", "--output", "json"])\nexcept HostError as e:\n  print(e)',
  ].join('\n'), join(root, 'native')], { encoding: 'utf8', env: { ...process.env, ...env } });
  assert.match(out, /nicht angemeldet/);
  t.close();
});
