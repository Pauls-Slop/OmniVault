// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Public Suffix List: cases from the list's own test file (publicsuffix.org/list/test.txt, MPL-2.0) and the
// relying-party check that WebAuthn builds on.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { domainToASCII } from 'node:url';
import test from 'node:test';
import { baseDomain, matchesUrl } from '../src/lib/match.js';
import { isRegistrableSuffixOf, publicSuffix, registrableDomain } from '../src/lib/psl.js';

test('registrable domains (PSL test cases)', () => {
  const cases = [
    ['com', null], ['example.com', 'example.com'], ['b.example.com', 'example.com'], ['a.b.example.com', 'example.com'],
    ['uk.com', null], ['example.uk.com', 'example.uk.com'], ['b.example.uk.com', 'example.uk.com'],
    ['test.ac', 'test.ac'],
    ['mm', null], ['c.mm', null], ['b.c.mm', 'b.c.mm'], ['a.b.c.mm', 'b.c.mm'], // wildcard "*.mm"
    ['jp', null], ['test.jp', 'test.jp'], ['www.test.jp', 'test.jp'], ['ac.jp', null], ['test.ac.jp', 'test.ac.jp'],
    ['kyoto.jp', null], ['test.kyoto.jp', 'test.kyoto.jp'], ['ide.kyoto.jp', null], ['b.ide.kyoto.jp', 'b.ide.kyoto.jp'],
    ['c.kobe.jp', null], ['b.c.kobe.jp', 'b.c.kobe.jp'], ['city.kobe.jp', 'city.kobe.jp'], ['www.city.kobe.jp', 'city.kobe.jp'], // exception "!city.kobe.jp"
    ['ck', null], ['test.ck', null], ['b.test.ck', 'b.test.ck'], ['www.ck', 'www.ck'], ['www.www.ck', 'www.ck'],
    ['us', null], ['test.us', 'test.us'], ['ak.us', null], ['test.ak.us', 'test.ak.us'], ['k12.ak.us', null], ['test.k12.ak.us', 'test.k12.ak.us'],
    ['xn--85x722f.com.cn', 'xn--85x722f.com.cn'], ['xn--55qx5d.cn', null], ['shishi.xn--55qx5d.cn', 'shishi.xn--55qx5d.cn'],
    ['www.example.co.uk', 'example.co.uk'], ['user.github.io', 'user.github.io'], ['github.io', null],
    ['localhost', null], ['127.0.0.1', null], ['example.unknowntld', 'example.unknowntld'],
  ];
  for (const [host, want] of cases) assert.equal(registrableDomain(host), want, host);
  assert.equal(publicSuffix('www.example.co.uk'), 'co.uk');
});

test('all cases of the official test file (test/fixtures/psl-test.txt, public domain)', () => {
  // Same file as tests/test_psl.txt in github.com/publicsuffix/list. Inputs are lower-cased and converted to
  // ASCII first, as URL.hostname delivers them; a leading dot is not a valid host name.
  const src = readFileSync(new URL('./fixtures/psl-test.txt', import.meta.url), 'utf8');
  let n = 0;
  for (const m of src.matchAll(/^checkPublicSuffix\((null|'[^']*'), (null|'[^']*')\);/gm)) {
    const input = m[1] === 'null' ? null : m[1].slice(1, -1);
    const want = m[2] === 'null' ? null : domainToASCII(m[2].slice(1, -1));
    let got = null;
    if (input && !input.startsWith('.')) {
      const ascii = domainToASCII(input.toLowerCase());
      got = ascii ? registrableDomain(ascii) : null;
    }
    assert.equal(got, want, String(input));
    n++;
  }
  assert.ok(n > 70, `only ${n} cases found`);
});

test('URL matching uses the registrable domain', () => {
  assert.equal(baseDomain('login.example.co.uk'), 'example.co.uk');
  assert.equal(baseDomain('localhost'), 'localhost');
  assert.equal(baseDomain('10.0.0.1'), '10.0.0.1');
  assert.ok(matchesUrl({ uris: ['https://example.co.uk'] }, 'https://login.example.co.uk/x'));
  assert.ok(!matchesUrl({ uris: ['https://other.co.uk'] }, 'https://example.co.uk'), 'co.uk is not one site');
  assert.ok(!matchesUrl({ uris: ['https://alice.github.io'] }, 'https://mallory.github.io'), 'github.io pages belong to different people');
});

test('relying party id: host or a parent domain that is not a public suffix', () => {
  assert.ok(isRegistrableSuffixOf('example.com', 'example.com'));
  assert.ok(isRegistrableSuffixOf('example.com', 'login.example.com'));
  assert.ok(isRegistrableSuffixOf('example.co.uk', 'www.example.co.uk'));
  assert.ok(isRegistrableSuffixOf('localhost', 'localhost'));
  assert.ok(!isRegistrableSuffixOf('co.uk', 'example.co.uk'), 'public suffix');
  assert.ok(!isRegistrableSuffixOf('github.io', 'mallory.github.io'), 'private-section suffix');
  assert.ok(!isRegistrableSuffixOf('com', 'example.com'));
  assert.ok(!isRegistrableSuffixOf('example.com', 'example.org'));
  assert.ok(!isRegistrableSuffixOf('ample.com', 'example.com'), 'label boundary');
  assert.ok(!isRegistrableSuffixOf('login.example.com', 'example.com'), 'child of the host');
  assert.ok(!isRegistrableSuffixOf('0.0.1', '127.0.0.1'), 'IP addresses only as themselves');
  assert.ok(isRegistrableSuffixOf('127.0.0.1', '127.0.0.1'));
});
