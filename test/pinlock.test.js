// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPinLock, seal, unseal, validPin } from '../src/lib/pinlock.js';

test('PIN lock: seal without the PIN, open only with it', async () => {
  assert.ok(!validPin('123') && !validPin('12a456') && !validPin('1234567890123') && validPin('1234') && validPin('123456789012'));
  await assert.rejects(createPinLock('123'), /4 bis 12/);
  const lock = await createPinLock('246810');
  assert.ok(!JSON.stringify(lock).includes('246810'));
  const sessions = { a1: { userKey: 'geheim', accessToken: 't' }, a2: { connected: true } };
  const sealed = await seal(lock, sessions);
  assert.ok(!JSON.stringify(sealed).includes('geheim'), 'sealed data is encrypted');
  await assert.rejects(unseal(lock, sealed, '135790'), /Falsche PIN/);
  assert.deepEqual(await unseal(lock, sealed, '246810'), sessions);
});
