// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Checks our OpenPGP.js build (vendor/openpgp.mjs) against GnuPG 2.4 in both directions,
// in the exact way the Passbolt provider uses it. Skipped when gpg is not installed.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import * as openpgp from '../vendor/openpgp.mjs';

test('vendored OpenPGP.js reports its version', () => {
  assert.equal(openpgp.config.versionString, 'OpenPGP.js 6.3.2');
});

let hasGpg = true;
try { execFileSync('gpg', ['--version'], { stdio: 'ignore' }); } catch { hasGpg = false; }

let home;
const PASS = 'correct horse battery staple';
const gpg = (args, input) => execFileSync('gpg', ['--batch', '--yes', '--pinentry-mode', 'loopback', '--passphrase', PASS, ...args], {
  env: { ...process.env, GNUPGHOME: home }, input, stdio: ['pipe', 'pipe', 'pipe'],
});
const keys = {};

before(() => {
  if (!hasGpg) return;
  home = mkdtempSync(join(tmpdir(), 'omnivault-gpg-'));
  for (const [name, primary, sub] of [['rsa', 'rsa3072', 'rsa3072'], ['ecc', 'ed25519', 'cv25519']]) {
    const uid = `${name} <${name}@test.invalid>`;
    gpg(['--quick-gen-key', uid, primary, 'sign,cert', 'never']);
    const fpr = gpg(['--with-colons', '--list-keys', uid]).toString().split('\n').find((l) => l.startsWith('fpr')).split(':')[9];
    gpg(['--quick-add-key', fpr, sub, 'encr', 'never']);
    if (name === 'rsa') {
      // Like keys made by OpenPGP.js / Passbolt: no AEAD feature → GnuPG writes SEIPD v1 (CFB+MDC).
      gpg(['--command-fd', '0', '--edit-key', fpr], 'setpref AES256 AES SHA256 SHA512 ZLIB ZIP Uncompressed MDC\ny\nsave\n');
    }
    keys[name] = {
      fpr,
      pub: gpg(['--armor', '--export', fpr]).toString(),
      sec: gpg(['--armor', '--export-secret-keys', fpr]).toString(),
    };
  }
});
after(() => {
  if (!hasGpg) return;
  try { execFileSync('gpgconf', ['--kill', 'gpg-agent'], { env: { ...process.env, GNUPGHOME: home } }); } catch { /* ignore */ }
  rmSync(home, { recursive: true, force: true });
});

const unlock = async (armoredKey) => openpgp.decryptKey({ privateKey: await openpgp.readPrivateKey({ armoredKey }), passphrase: PASS });

for (const name of hasGpg ? ['rsa', 'ecc'] : []) {
  const other = name === 'rsa' ? 'ecc' : 'rsa';

  test(`${name}: decrypt + verify a GnuPG message (${name === 'rsa' ? 'SEIPD v1' : 'OCB'}, compressed)`, async () => {
    const text = `Hallo von GnuPG – äöü ß ${name}\n`.repeat(400);
    const armored = gpg(['--armor', '--encrypt', '--sign', '--recipient', keys[name].fpr, '--local-user', keys[other].fpr], text).toString();
    const listing = execFileSync('gpg', ['--list-packets'], { input: armored, env: { ...process.env, GNUPGHOME: home } }).toString();
    assert.match(listing, name === 'rsa' ? /^:encrypted data packet:/m : /^:aead encrypted packet:/m);
    const me = await unlock(keys[name].sec);
    const { data, signatures } = await openpgp.decrypt({
      message: await openpgp.readMessage({ armoredMessage: armored }), decryptionKeys: me,
      verificationKeys: await openpgp.readKey({ armoredKey: keys[other].pub }), expectSigned: true,
    });
    assert.equal(data, text);
    await signatures[0].verified;
    await assert.rejects(openpgp.decrypt({
      message: await openpgp.readMessage({ armoredMessage: armored }), decryptionKeys: me,
      verificationKeys: await openpgp.readKey({ armoredKey: keys[name].pub }), expectSigned: true,
    }), 'signature from the wrong key is not accepted');
  });

  test(`${name}: GnuPG decrypts and verifies a Passbolt-style challenge from OpenPGP.js`, async () => {
    const msg = JSON.stringify({ version: '1.0.0', verify_token: crypto.randomUUID(), note: 'ü' });
    const armored = await openpgp.encrypt({
      message: await openpgp.createMessage({ text: msg }),
      encryptionKeys: await openpgp.readKey({ armoredKey: keys[name].pub }),
      signingKeys: await unlock(keys[other].sec),
    });
    const plain = execFileSync('gpg', ['--batch', '--pinentry-mode', 'loopback', '--passphrase', PASS, '--decrypt'], {
      env: { ...process.env, GNUPGHOME: home }, input: armored, stdio: ['pipe', 'pipe', 'pipe'],
    }).toString();
    assert.equal(plain, msg);
    const status = execFileSync('gpg', ['--batch', '--pinentry-mode', 'loopback', '--passphrase', PASS, '--status-fd', '1', '--output', '/dev/null', '--decrypt'], {
      env: { ...process.env, GNUPGHOME: home }, input: armored, stdio: ['pipe', 'pipe', 'pipe'],
    }).toString();
    assert.match(status, /GOODSIG/);
    assert.match(status, new RegExp(`VALIDSIG ${keys[other].fpr}`));
    assert.match(status, /DECRYPTION_OKAY/);
  });
}
