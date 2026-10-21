// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// gopass provider against the REAL `gopass` + gpg, driven through the real CLI host. The gopass binary comes from
// $OMNIVAULT_GOPASS_BIN or, with OMNIVAULT_GOPASS_DOWNLOAD=1, from the pinned release (test/gopass-bin.sh).
// Skipped if neither is given or gpg is missing.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import GopassProvider from '../src/providers/gopass/index.js';
import { ProcessTransport } from './native-transport.mjs';

let BIN = process.env.OMNIVAULT_GOPASS_BIN;
if (!BIN && process.env.OMNIVAULT_GOPASS_DOWNLOAD === '1') BIN = execFileSync('test/gopass-bin.sh', { encoding: 'utf8' }).trim();
let have = false;
try { execFileSync('gpg', ['--version']); have = !!BIN; } catch { have = false; }
const opts = { skip: have ? false : 'gopass/gpg nicht verfügbar (OMNIVAULT_GOPASS_BIN oder OMNIVAULT_GOPASS_DOWNLOAD=1 setzen)' };

// short path: gpg-agent's socket path must stay below ~100 characters
const dir = mkdtempSync('/tmp/ovgopass-');
let ENV;
after(() => {
  try { if (ENV) execFileSync('gpgconf', ['--kill', 'all'], { env: ENV }); } catch { /* ignore */ }
  rmSync(dir, { recursive: true, force: true });
});

const gp = (args, input) => execFileSync(BIN, args, { env: ENV, input, encoding: 'utf8' });

before(() => {
  if (!have) return;
  const home = join(dir, 'home');
  ENV = {
    ...process.env, GNUPGHOME: join(dir, 'gnupg'), HOME: home, XDG_CONFIG_HOME: join(home, '.config'),
    XDG_DATA_HOME: join(home, '.local/share'), GOPASS_HOMEDIR: home, GOPASS_NO_NOTIFY: 'true', NO_COLOR: '1',
  };
  execFileSync('mkdir', ['-p', ENV.GNUPGHOME, home]);
  execFileSync('chmod', ['700', ENV.GNUPGHOME]);
  const keyfile = join(dir, 'genkey');
  writeFileSync(keyfile, '%no-protection\nKey-Type: eddsa\nKey-Curve: ed25519\nSubkey-Type: ecdh\nSubkey-Curve: cv25519\nName-Real: OV Test\nName-Email: gopass@omnivault.local\nExpire-Date: 0\n%commit\n');
  execFileSync('gpg', ['--batch', '--quiet', '--gen-key', keyfile], { env: ENV });
  gp(['init', '--crypto', 'gpg', '--storage', 'fs', 'gopass@omnivault.local']);
  gp(['init', '--crypto', 'gpg', '--storage', 'fs', '--store', 'team', '--path', join(dir, 'team'), 'gopass@omnivault.local']);
  gp(['insert', '-f', 'web/github.com'], 'gh-pass\nlogin: ada\nurl: https://github.com\notpauth://totp/x?secret=JBSWY3DPEHPK3PXP\nkundennr: 42\nmehr Text\n');
  gp(['insert', '-f', 'team/db'], 'db-pass\nuser: postgres\n');
});

function setup() {
  const env = Object.fromEntries(['GNUPGHOME', 'HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'GOPASS_HOMEDIR'].map((k) => [k, ENV[k]]));
  const t = new ProcessTransport({ ...env, OMNIVAULT_GOPASS_BIN: BIN });
  GopassProvider.transport = t;
  return { t, config: { id: 'g1' } };
}

test('login, list with mounts as folders, parsing', opts, async () => {
  const { t, config } = setup();
  try {
    assert.equal((await GopassProvider.login(config, {})).status, 'ok');
    const { items, folders } = await GopassProvider.sync(config);
    const by = Object.fromEntries(items.map((i) => [i.id, i]));
    assert.deepEqual(Object.keys(by).sort(), ['team/db', 'web/github.com']);
    const gh = by['web/github.com'];
    assert.equal(gh.password, 'gh-pass');
    assert.equal(gh.username, 'ada');
    assert.deepEqual(gh.uris, ['https://github.com']);
    assert.equal(gh.totp, 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP');
    assert.deepEqual(gh.fields, [{ name: 'kundennr', value: '42', type: 'text' }]);
    assert.equal(gh.notes, 'mehr Text');
    assert.equal(by['team/db'].username, 'postgres');
    assert.equal(by['team/db'].folder, 'team', 'mounted store as folder');
    assert.ok(folders.some((f) => f.id === 'team') && folders.some((f) => f.id === 'web'));
  } finally { t.close(); }
});

test('create (stdin), update, move across mounts, rename, delete', opts, async () => {
  const { t, config } = setup();
  try {
    const { item } = await GopassProvider.saveItem(config, {}, null, {
      name: 'mail', username: 'm', password: 'geheim; $(rm -rf ~) "x"', uris: ['https://mail.example'], folderId: 'web',
      fields: [{ name: 'pin', value: '1234', type: 'text' }], notes: 'zweite\nZeile',
    });
    assert.equal(item.id, 'web/mail');
    assert.match(gp(['show', '-f', '-n', 'web/mail']), /^geheim; \$\(rm -rf ~\) "x"\nlogin: m\nurl: https:\/\/mail.example\npin: 1234\nzweite\nZeile/);
    // a second entry of the same name never overwrites the first
    const dup = await GopassProvider.saveItem(config, {}, null, { name: 'mail', password: 'x', folderId: 'web' });
    assert.notEqual(dup.item.id, 'web/mail');

    const upd = await GopassProvider.saveItem(config, {}, item, { ...item, password: 'neu', folderId: 'web' });
    assert.equal(upd.item.id, 'web/mail');
    assert.match(gp(['show', '-f', '-n', 'web/mail']), /^neu\n/);

    // into the mounted store (another directory on disk)
    const moved = await GopassProvider.saveItem(config, {}, upd.item, { ...upd.item, folderId: 'team' });
    assert.equal(moved.item.id, 'team/mail');
    assert.equal(moved.deletedId, 'web/mail');
    const list = gp(['ls', '--flat']);
    assert.match(list, /^team\/mail$/m);
    assert.doesNotMatch(list, /^web\/mail$/m);

    const renamed = await GopassProvider.saveItem(config, {}, moved.item, { ...moved.item, name: 'post' });
    assert.equal(renamed.item.id, 'team/post');

    await GopassProvider.deleteItem(config, {}, renamed.item);
    await GopassProvider.deleteItem(config, {}, dup.item);
    const { items } = await GopassProvider.sync(config);
    assert.deepEqual(items.map((i) => i.id).sort(), ['team/db', 'web/github.com']);
  } finally { t.close(); }
});

test('host refuses ids that leave the store', opts, async () => {
  const { t } = setup();
  try {
    await assert.rejects(t.request('gopass', 'reveal', { id: '../etc/passwd' }), /Ungültige/);
    await assert.rejects(t.request('gopass', 'delete', { id: '-rf' }), /Ungültige|nicht/);
  } finally { t.close(); }
});
