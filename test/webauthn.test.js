// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// WebAuthn authenticator logic, checked by an independent relying party (test/webauthn-rp.js).
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { b64url } from '../src/lib/bytes.js';
import {
  cbor, clientDataJSON, createPasskey, credentialIdBytes, credentialIdString, p1363ToDer, signAssertion,
} from '../src/lib/webauthn.js';
import { decodeCbor, verifyAuthentication, verifyRegistration } from './webauthn-rp.js';

const ORIGIN = 'https://login.example.com';
const RP = 'example.com';
const asCredential = (r, kind) => ({
  id: r.id, rawId: r.id, type: 'public-key',
  response: kind === 'create'
    ? { clientDataJSON: r.clientDataJSON, attestationObject: r.attestationObject, publicKey: r.publicKey }
    : { clientDataJSON: r.clientDataJSON, authenticatorData: r.authenticatorData, signature: r.signature, userHandle: r.userHandle },
});

test('CBOR: CTAP2 canonical encodings', () => {
  assert.equal(Buffer.from(cbor(new Map([[1, 2], [3, -7], [-1, 1]]))).toString('hex'), 'a301020326 2001'.replace(/ /g, ''));
  assert.equal(Buffer.from(cbor(23)).toString('hex'), '17');
  assert.equal(Buffer.from(cbor(24)).toString('hex'), '1818');
  assert.equal(Buffer.from(cbor(1000)).toString('hex'), '1903e8');
  assert.equal(Buffer.from(cbor(-100)).toString('hex'), '3863');
  assert.equal(Buffer.from(cbor('fmt')).toString('hex'), '63666d74');
  const big = new Uint8Array(300).fill(7);
  assert.deepEqual([...decodeCbor(Buffer.from(cbor({ a: big, b: [1, 'x'] }))).value.get('a')], [...big]);
});

test('credential ids in Bitwarden form: UUID or "b64." prefix', () => {
  const id = 'd1e2f3a4-0b1c-4d2e-8f30-415263748596';
  const bytes = credentialIdBytes(id);
  assert.equal(bytes.length, 16);
  assert.equal(Buffer.from(bytes).toString('hex'), 'd1e2f3a40b1c4d2e8f30415263748596');
  assert.equal(credentialIdString(bytes), id);
  const long = new Uint8Array(32).map((_, i) => i);
  assert.equal(credentialIdString(long), `b64.${Buffer.from(long).toString('base64url')}`);
  assert.deepEqual([...credentialIdBytes(credentialIdString(long))], [...long]);
  assert.equal(credentialIdBytes('nicht-gültig'), null);
});

test('DER signatures: leading zeros dropped, high bit padded', () => {
  const r = new Uint8Array(32); r[0] = 0x80; r[31] = 1;
  const s = new Uint8Array(32); s[30] = 0x12; s[31] = 0x34;
  const der = p1363ToDer(new Uint8Array([...r, ...s]));
  assert.equal(Buffer.from(der).toString('hex'), `3027022100${Buffer.from(r).toString('hex')}02021234`);
});

test('registration and sign-in are accepted by an independent relying party', async () => {
  const userId = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const challenge = b64url(new Uint8Array(32).fill(9));
  const clientData = clientDataJSON({ type: 'webauthn.create', challenge, origin: ORIGIN });
  const { record, response } = await createPasskey({
    rpId: RP, rpName: 'Example', user: { id: userId, name: 'ada@example.com', displayName: 'Ada' },
    discoverable: true, clientData, userVerified: true,
  });
  assert.match(record.credentialId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(
    { keyType: record.keyType, keyAlgorithm: record.keyAlgorithm, keyCurve: record.keyCurve, counter: record.counter, discoverable: record.discoverable, userHandle: record.userHandle },
    { keyType: 'public-key', keyAlgorithm: 'ECDSA', keyCurve: 'P-256', counter: '0', discoverable: 'true', userHandle: b64url(userId) });
  const stored = verifyRegistration(asCredential(response, 'create'), { challenge, origin: ORIGIN, rpId: RP, requireUV: true });
  assert.ok(stored.flags.be && stored.flags.bs && stored.flags.uv, 'backup eligible + state, user verified');
  assert.equal(stored.counter, 0);

  const challenge2 = b64url(new Uint8Array(32).fill(3));
  const a = await signAssertion({ record, clientData: clientDataJSON({ type: 'webauthn.get', challenge: challenge2, origin: ORIGIN }), userVerified: true });
  const res = verifyAuthentication(asCredential(a, 'get'), { challenge: challenge2, origin: ORIGIN, rpId: RP, stored, requireUV: true });
  assert.equal(res.userHandle, b64url(userId));

  // a page on another origin cannot reuse an assertion, and a wrong challenge is caught
  await assert.rejects(async () => verifyAuthentication(asCredential(a, 'get'), { challenge: challenge2, origin: 'https://evil.example.org', rpId: RP, stored }), /origin/);
  await assert.rejects(async () => verifyAuthentication(asCredential(a, 'get'), { challenge: challenge, origin: ORIGIN, rpId: RP, stored }), /challenge/);
});

test('a passkey from another password manager (Bitwarden JSON export) signs in', async () => {
  // key pair made outside OmniVault, stored like Bitwarden exports it (PKCS #8 base64url, 32-byte id with "b64.")
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const idBytes = new Uint8Array(32).map((_, i) => 255 - i);
  const record = {
    credentialId: credentialIdString(idBytes), keyType: 'public-key', keyAlgorithm: 'ECDSA', keyCurve: 'P-256',
    keyValue: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64url'), rpId: RP, userHandle: 'AQID', counter: '0',
  };
  const challenge = b64url(new Uint8Array(16).fill(1));
  const a = await signAssertion({ record, clientData: clientDataJSON({ type: 'webauthn.get', challenge, origin: ORIGIN }), userVerified: false });
  const stored = { credentialId: Buffer.from(idBytes).toString('base64url'), jwk: publicKey.export({ format: 'jwk' }), counter: 0 };
  const res = verifyAuthentication(asCredential(a, 'get'), { challenge, origin: ORIGIN, rpId: RP, stored });
  assert.equal(res.flags.uv, false);
  assert.equal(res.userHandle, 'AQID');
});
