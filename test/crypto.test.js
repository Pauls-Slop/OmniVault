// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
import assert from 'node:assert/strict';
import { test } from 'node:test';
import loadArgon2id from '../vendor/argon2id.mjs';
import { fromHex, hex } from '../src/lib/bytes.js';
import { totp } from '../src/lib/totp.js';
import { baseDomain, matchesUrl } from '../src/lib/match.js';
import {
  decryptSym, decryptSymString, decryptUserKey, deriveMasterKey, encryptSym, hkdfExpand, splitKey, stretchMasterKey,
} from '../src/providers/bitwarden/crypto.js';

test('argon2id library build – RFC 9106 §5.3 test vector', async () => {
  const argon2id = await loadArgon2id();
  const tag = argon2id({
    password: new Uint8Array(32).fill(1),
    salt: new Uint8Array(16).fill(2),
    secret: new Uint8Array(8).fill(3),
    ad: new Uint8Array(12).fill(4),
    passes: 3, memorySize: 32, parallelism: 4, tagLength: 32,
  });
  assert.equal(hex(tag), '0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659');
});

test('HKDF-Expand – RFC 5869 test case 1', async () => {
  const prk = fromHex('077709362c2e32df0ddc3f0dc47bba6390b6c73bb50f9c3122ec844ad7c2b3e5');
  const info = fromHex('f0f1f2f3f4f5f6f7f8f9');
  assert.equal(hex(await hkdfExpand(prk, info, 42)),
    '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865');
});

test('EncString type 2 round trip and MAC check', async () => {
  const key = splitKey(crypto.getRandomValues(new Uint8Array(64)));
  const enc = await encryptSym('geheim äöü', key);
  assert.match(enc, /^2\./);
  assert.equal(await decryptSymString(enc, key), 'geheim äöü');
  const other = splitKey(crypto.getRandomValues(new Uint8Array(64)));
  await assert.rejects(decryptSym(enc, other), /MAC/);
});

test('User key unwrap with PBKDF2 master key; wrong password is detected', async () => {
  const kdf = { kdf: 0, kdfIterations: 600000 };
  const mk = await deriveMasterKey('correct horse', 'User@Example.com ', kdf);
  const userKey = crypto.getRandomValues(new Uint8Array(64));
  const protectedKey = await encryptSym(userKey, await stretchMasterKey(mk));
  assert.deepEqual(await decryptUserKey(protectedKey, mk), userKey);
  const wrong = await deriveMasterKey('wrong', 'user@example.com', kdf);
  await assert.rejects(decryptUserKey(protectedKey, wrong), { code: 'bad_password' });
});

test('TOTP – RFC 6238 SHA-1 vector at T=59s', async () => {
  const r = await totp('otpauth://totp/x?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&digits=8', 59_000);
  assert.equal(r.code, '94287082');
});

test('URL matching by registrable domain', () => {
  assert.equal(baseDomain('accounts.google.com'), 'google.com');
  assert.equal(baseDomain('www.bbc.co.uk'), 'bbc.co.uk');
  assert.ok(matchesUrl({ uris: ['https://login.example.org/x'] }, 'https://www.example.org/'));
  assert.ok(!matchesUrl({ uris: ['https://example.org'] }, 'https://example.org.evil.com/'));
});
