// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Passkeys outside the browser: which page requests OmniVault takes, which passkeys match, and what happens to
// passkeys when items are copied, exported and imported.
import assert from 'node:assert/strict';
import test from 'node:test';
import { checkRequest, matchingPasskeys, pageOrigin } from '../src/background/passkeys.js';
import { passkeysWithKeys, transferData, transferLoss } from '../src/background/tools.js';
import { toBitwardenJson } from '../src/lib/export.js';
import { importBitwardenJson } from '../src/lib/import.js';

const create = (extra = {}) => ({
  challenge: 'Y2g', rp: { id: 'example.com', name: 'Example' }, user: { id: 'dQ', name: 'ada' },
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }], ...extra,
});

test('page requests: secure origin, relying party, algorithm', () => {
  assert.equal(pageOrigin('https://example.com/a')?.origin, 'https://example.com');
  assert.ok(pageOrigin('http://localhost:8080/'));
  assert.equal(pageOrigin('http://example.com/'), null, 'plain http only on localhost');
  assert.equal(pageOrigin('file:///x'), null);

  assert.deepEqual(checkRequest({ kind: 'create', options: create(), url: 'https://login.example.com/' }), { ok: true, rpId: 'example.com', origin: 'https://login.example.com' });
  assert.equal(checkRequest({ kind: 'create', options: create({ rp: { name: 'x' } }), url: 'https://login.example.com/' }).rpId, 'login.example.com', 'rp.id defaults to the host');
  assert.equal(checkRequest({ kind: 'create', options: create({ rp: { id: 'other.com' } }), url: 'https://example.com/' }).reason, 'rpId');
  assert.equal(checkRequest({ kind: 'get', options: { challenge: 'Y2g', rpId: 'co.uk' }, url: 'https://example.co.uk/' }).reason, 'rpId');
  assert.equal(checkRequest({ kind: 'create', options: create({ pubKeyCredParams: [{ type: 'public-key', alg: -257 }] }), url: 'https://example.com/' }).reason, 'algorithm', 'RSA only: browser');
  assert.equal(checkRequest({ kind: 'create', options: create({ pubKeyCredParams: [] }), url: 'https://example.com/' }).ok, true, 'empty list means the defaults (ES256 among them)');
  assert.equal(checkRequest({ kind: 'create', options: create({ authenticatorSelection: { authenticatorAttachment: 'cross-platform' } }), url: 'https://example.com/' }).reason, 'attachment', 'security key wanted');
  assert.equal(checkRequest({ kind: 'get', options: {}, url: 'https://example.com/' }).reason, 'challenge');
  assert.equal(checkRequest({ kind: 'get', options: { challenge: 'Y2g' }, url: 'http://example.com/' }).reason, 'insecure');
});

test('matching passkeys: same relying party, allowed ids only', () => {
  const items = [
    { id: 'a', passkeys: [{ rpId: 'example.com', credentialId: '00112233-4455-6677-8899-aabbccddeeff' }] },
    { id: 'b', passkeys: [{ rpId: 'example.com', credentialId: 'b64.AQID' }] },
    { id: 'c', passkeys: [{ rpId: 'example.org', credentialId: 'b64.AQID' }] },
    { id: 'd' },
  ];
  assert.deepEqual(matchingPasskeys(items, 'example.com').map((m) => m.item.id), ['a', 'b']);
  assert.deepEqual(matchingPasskeys(items, 'example.com', ['AQID']).map((m) => m.item.id), ['b']);
  assert.deepEqual(matchingPasskeys(items, 'example.com', ['ABEiM0RVZneImaq7zN3u_w']).map((m) => m.item.id), ['a'], 'UUID id as bytes');
  assert.deepEqual(matchingPasskeys(items, 'example.com', ['BAU']), []);
});

test('copying and moving: passkeys go along to accounts that store them, otherwise they are named as lost', () => {
  const item = {
    type: 'login', name: 'Shop', username: 'ada', uris: [],
    passkeys: [{ credentialId: 'x', rpId: 'shop.example', userName: 'ada' }], _passkeyKeys: { x: 'PKCS8' },
  };
  assert.deepEqual(passkeysWithKeys(item), [{ credentialId: 'x', rpId: 'shop.example', userName: 'ada', keyValue: 'PKCS8' }]);
  assert.deepEqual(transferData(item, null, { passkeys: true }).passkeys[0].keyValue, 'PKCS8');
  assert.equal(transferData(item, null, { passkeys: false }).passkeys, undefined);
  assert.deepEqual(transferLoss(item, { passkeys: true }), []);
  assert.deepEqual(transferLoss(item, {}), ['Passkeys']);
  // Proton Pass passkeys: only shown, their keys stay in Proton Pass
  assert.deepEqual(transferLoss({ type: 'login', passkeys: [{ rpId: 'a.example' }] }, { passkeys: true }), ['Passkeys']);
});

test('export and import keep passkeys in Bitwarden\'s JSON format', () => {
  const passkey = {
    credentialId: '00112233-4455-6677-8899-aabbccddeeff', keyType: 'public-key', keyAlgorithm: 'ECDSA', keyCurve: 'P-256',
    keyValue: 'MIGH', rpId: 'shop.example', userHandle: 'dQ', userName: 'ada', counter: '0', rpName: 'Shop',
    userDisplayName: 'Ada', discoverable: 'true', creationDate: '2026-10-16T10:00:00.000Z',
  };
  const json = JSON.parse(toBitwardenJson([{ type: 'login', name: 'Shop', username: 'ada', uris: ['https://shop.example'], passkeys: [passkey] }]));
  assert.deepEqual(json.items[0].login.fido2Credentials, [passkey]);
  const [back] = importBitwardenJson(json);
  assert.deepEqual(back.passkeys, [passkey]);
  assert.equal(transferData(back, null, { passkeys: true }).passkeys[0].keyValue, 'MIGH');
  const [plain] = importBitwardenJson({ items: [{ type: 1, name: 'x', login: { username: 'u' } }] });
  assert.equal(plain.passkeys, undefined);
});
