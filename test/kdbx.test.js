// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// KeePass databases (.kdbx): files written by KeePassXC, by an independent Python writer and by kdbxweb's test suite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KdbxError, isKdbx, openKdbx } from '../src/lib/kdbx.js';

const dir = new URL('./fixtures/kdbx/', import.meta.url);
const read = (name) => readFileSync(new URL(name, dir));
const PW = 'omnivault-test';

/** The four entries of source.xml, as every writer must reproduce them. */
function checkSource(db, version) {
  assert.equal(db.version, version);
  assert.equal(db.name, 'Testdatenbank');
  assert.equal(db.recycled, 1, 'the entry in the recycle bin is left out');
  assert.deepEqual(db.attachments, ['GitHub']);
  const byName = Object.fromEntries(db.items.map((i) => [i.name, i]));
  assert.deepEqual(Object.keys(byName).sort(), ['GitHub', 'Mailserver', 'Router', 'Tresorcode']);
  const gh = byName.GitHub;
  assert.equal(gh.type, 'login');
  assert.equal(gh.username, 'ada');
  assert.equal(gh.password, 'gh-geheim & <sicher>', 'protected value with XML characters');
  assert.equal(gh.notes, 'Zeile 1\nZeile 2 – äöü');
  assert.deepEqual(gh.uris, ['https://github.com/login']);
  assert.match(gh.totp, /^otpauth:\/\/totp\/.*secret=JBSWY3DPEHPK3PXP/);
  assert.deepEqual(gh.fields, [{ name: 'Kundennummer', value: 'K-4711', type: 'text' }, { name: 'PIN', value: '9876', type: 'hidden' }]);
  assert.equal(gh.folder, undefined, 'entries in the root group have no folder');
  assert.equal(byName.Mailserver.folder, 'Arbeit');
  assert.match(byName.Mailserver.totp, /period=60&digits=8/, 'TOTP settings from KeePassXC fields');
  assert.equal(byName.Router.folder, 'Arbeit/Server');
  assert.equal(byName.Router.password, 'r0uter!');
  assert.equal(byName.Tresorcode.type, 'note');
  assert.equal(byName.Tresorcode.notes, '12-34-56');
}

const keyx = () => read('keepassxc.keyx');
for (const [file, version, keyFile] of [
  ['keepassxc-3.1-aeskdf-aes.kdbx', '3.1'],
  ['keepassxc-4-argon2d-aes.kdbx', '4.0'],
  ['keepassxc-4-argon2id-chacha20.kdbx', '4.0'],
  ['keepassxc-4-aeskdf-chacha20.kdbx', '4.0'],
  ['keepassxc-4-argon2d-keyfile.kdbx', '4.0', keyx],
  ['py-3.1-aeskdf-aes-salsa20.kdbx', '3.1'],
  ['py-4.1-argon2d-chacha20.kdbx', '4.1'],
  ['py-4-argon2id-nocompress-keyfile.kdbx', '4.0', keyx],
]) {
  test(`kdbx: ${file}`, async () => {
    const bytes = read(file);
    assert.ok(isKdbx(bytes));
    checkSource(await openKdbx(bytes, { password: PW, keyFile: keyFile?.() ?? null }), version);
  });
}

test('kdbx: wrong password and missing key file are reported as credentials errors', async () => {
  for (const [file, opts] of [
    ['keepassxc-3.1-aeskdf-aes.kdbx', { password: 'falsch' }],
    ['keepassxc-4-argon2d-aes.kdbx', { password: 'falsch' }],
    ['py-4.1-argon2d-chacha20.kdbx', { password: '' }],
    ['keepassxc-4-argon2d-keyfile.kdbx', { password: PW }],
  ]) {
    await assert.rejects(openKdbx(read(file), opts), (e) => e instanceof KdbxError && e.code === 'credentials', file);
  }
});

test('kdbx: damaged and foreign files', async () => {
  const bytes = new Uint8Array(read('keepassxc-4-argon2d-aes.kdbx'));
  bytes[bytes.length - 40] ^= 1; // inside the encrypted payload: the block HMAC no longer matches
  await assert.rejects(openKdbx(bytes, { password: PW }), (e) => e instanceof KdbxError && e.code === 'corrupt');
  await assert.rejects(openKdbx(new TextEncoder().encode('name,password\na,b\n'), { password: PW }), (e) => e instanceof KdbxError && e.code === 'not-kdbx');
  assert.equal(isKdbx(new Uint8Array(4)), false);
});

// Sample databases from kdbxweb's test suite (MIT, see kdbxweb/LICENSE): other writers, key file formats, empty password
const kw = (name) => read(`kdbxweb/${name}`);
for (const [file, password, keyFile, version, count] of [
  ['demo.kdbx', 'demo', 'demo.key', '3.1', 3],
  ['AesChaCha.kdbx', 'demo', 'demo.key', '3.1', 3],
  ['Argon2.kdbx', 'demo', 'demo.key', '4.0', 3],
  ['Argon2id.kdbx', 'demo', 'demo.key', '4.0', 3],
  ['Argon2ChaCha.kdbx', 'demo', 'demo.key', '4.0', 3],
  ['KDBX4.1.kdbx', 'test', null, '4.1', 3],
  ['EmptyPass.kdbx', '', null, '3.1', 2],
  ['Key32.kdbx', 'test', 'Key32.key', '3.1', 2],
  ['Key64.kdbx', 'test', 'Key64.key', '3.1', 2],
  ['KeyV2.kdbx', '', 'KeyV2.keyx', '3.1', 2],
  ['KeyWithBom.kdbx', 'test', 'KeyWithBom.key', '3.1', 2],
  ['NoPassWithKeyFile.kdbx', '', 'NoPassWithKeyFile.key', '3.1', 2],
  ['binkey.kdbx', 'test', 'binkey.key', '3.1', 1],
  ['cyrillic.kdbx', 'пароль', null, '3.1', 2],
]) {
  test(`kdbx (kdbxweb sample): ${file}`, async () => {
    const db = await openKdbx(kw(file), { password, keyFile: keyFile ? kw(keyFile) : null });
    assert.equal(db.version, version);
    assert.equal(db.items.length, count);
    for (const i of db.items) assert.equal(typeof i.name, 'string');
  });
}
