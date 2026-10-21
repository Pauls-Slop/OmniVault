// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Pwned Passwords range lookup (k-anonymity): only 5-digit prefixes are requested, padding lines are ignored.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breachCounts } from '../src/lib/hibp.js';

// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8, SHA-1("hunter2") = F3BBBD66A63D4BF1747940578EC3D0103530E21D
test('hibp: counts from the range answer, one request per prefix, padding ignored', async () => {
  const asked = [];
  const range = async (prefix) => {
    asked.push(prefix);
    if (prefix === '5BAA6') return '003D68EB55068C33ACE09247EE4C639306B:3\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:9545824\r\n0018A45C4D1DEF81644B54AB7F969B88D65:0\r\n';
    return 'ABCDEF0123456789ABCDEF0123456789ABC:0\r\n';
  };
  const counts = await breachCounts(['password', 'hunter2', 'password', 'korrekt-pferd-batterie-heftklammer'], range);
  assert.deepEqual([...counts], [['password', 9545824]]);
  assert.equal(asked.filter((p) => p === '5BAA6').length, 1, 'each prefix once');
  assert.ok(asked.includes('F3BBB'));
  assert.ok(asked.every((p) => /^[0-9A-F]{5}$/.test(p)), 'only 5-digit prefixes leave the browser');
});

test('hibp: errors of the service reach the caller', async () => {
  await assert.rejects(breachCounts(['x'], async () => { throw Object.assign(new Error('HTTP 503'), { status: 503 }); }), /503/);
});
