// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SETS, entropyBits, generatePassword, generatePin, randomInt } from '../src/lib/generator.js';

test('every selected character class is present, others absent', () => {
  for (let n = 0; n < 200; n++) {
    const pw = generatePassword({ length: 12, upper: true, lower: true, digits: true, symbols: false });
    assert.equal(pw.length, 12);
    assert.match(pw, /[A-Z]/);
    assert.match(pw, /[a-z]/);
    assert.match(pw, /[0-9]/);
    assert.doesNotMatch(pw, /[^A-Za-z0-9]/);
  }
  assert.throws(() => generatePassword({ upper: false, lower: false, digits: false, symbols: false }));
});

test('avoidAmbiguous removes look-alike characters', () => {
  const pw = Array.from({ length: 50 }, () => generatePassword({ length: 64, avoidAmbiguous: true })).join('');
  assert.doesNotMatch(pw, /[Il1O0o]/);
});

test('randomInt is unbiased (chi-square, 6 buckets)', () => {
  const counts = new Array(6).fill(0);
  const N = 60000;
  for (let i = 0; i < N; i++) counts[randomInt(6)]++;
  const exp = N / 6;
  const chi = counts.reduce((s, c) => s + (c - exp) ** 2 / exp, 0);
  assert.ok(chi < 20.5, `chi² ${chi.toFixed(2)} (p<0.001 bound for 5 dof)`);
});

test('PIN and entropy', () => {
  assert.match(generatePin(8), /^\d{8}$/);
  assert.equal(entropyBits({ length: 20, lower: true, upper: true, digits: true, symbols: false }), Math.floor(20 * Math.log2(62)));
  assert.equal(SETS.digits.length, 10);
});

test('weak password check', async () => {
  const { weakness } = await import('../src/lib/strength.js');
  for (const pw of ['123456', 'Passwort1', 'kurz', 'aaaaaaaaaaaa', 'qwertzui', 'adalovelace!1', 'sommer2026']) assert.ok(weakness(pw, ['adalovelace@example.org']), pw);
  for (const pw of ['Kq7#mZ2!pL9x', 'korrekt-pferd-batterie-heftklammer', 'gh-neu-2026-Xy!q']) assert.equal(weakness(pw), null, pw);
});

test('sample identities: every language, reserved e-mail domain, no document numbers', async () => {
  const { sampleIdentity, SAMPLE_LANGUAGES } = await import('../src/lib/sample-identity.js');
  for (const lang of SAMPLE_LANGUAGES) {
    for (let n = 0; n < 20; n++) {
      const { name, identity } = sampleIdentity(lang);
      assert.ok(name && identity.firstName && identity.lastName && identity.city && identity.postalCode && identity.address1, lang);
      assert.match(identity.email, /^[a-z]+\.[a-z0-9]+\d\d@example\.com$/, `${lang}: ${identity.email}`);
      assert.ok(!identity.phone || /^\+1 555-01\d\d$/.test(identity.phone), identity.phone);
      assert.ok(!('ssn' in identity) && !('passportNumber' in identity) && !('licenseNumber' in identity));
    }
  }
  assert.equal(sampleIdentity('fr-CA').identity.country, 'France', 'region falls back to the language');
});
