// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// The authenticator side of WebAuthn (https://www.w3.org/TR/webauthn-3/) for passkeys kept in a vault:
// ES256 key pairs (ECDSA P-256 with SHA-256, what Bitwarden and every password manager use), "none"
// attestation, authenticator data, assertions. Passkeys are stored in Bitwarden's Fido2Credential format so that
// the official Bitwarden apps can use what OmniVault created and the other way round:
//   credentialId  UUID string, or "b64." + base64url for ids that are not 16 bytes (imported passkeys)
//   keyValue      PKCS #8 private key, base64url        userHandle  user.id from the site, base64url
//   counter       "0" (synced passkeys do not count)   discoverable "true" | "false"
import { b64url, concat, fromB64, utf8 } from './bytes.js';
import { cbor } from './cbor.js';

const subtle = globalThis.crypto.subtle;

export const ES256 = -7;
/** No attestation, so no maker is named: the AAGUID stays all zeros (allowed for "none"). */
export const AAGUID = new Uint8Array(16);

export { cbor } from './cbor.js';

/* ---------- credential ids ---------- */

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Stored credential id → the bytes a site sees. null if it is neither form. */
export function credentialIdBytes(id) {
  if (typeof id !== 'string') return null;
  if (id.startsWith('b64.')) { try { return fromB64(id.slice(4)); } catch { return null; } }
  if (!GUID.test(id)) return null;
  const hex = id.replace(/-/g, '');
  return new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));
}

/** Bytes → stored form: a UUID for 16 bytes (like Bitwarden), otherwise "b64." + base64url. */
export function credentialIdString(bytes) {
  const u = new Uint8Array(bytes);
  if (u.length !== 16) return `b64.${b64url(u)}`;
  const h = [...u].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const sameBytes = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/* ---------- building blocks ---------- */

export const sha256 = async (data) => new Uint8Array(await subtle.digest('SHA-256', data));

export const FLAGS = { UP: 0x01, UV: 0x04, BE: 0x08, BS: 0x10, AT: 0x40 };

/** COSE_Key for an ES256 public key (kty EC2, alg -7, crv P-256, x, y). */
export function coseKey(jwk) {
  return cbor(new Map([[1, 2], [3, ES256], [-1, 1], [-2, fromB64(jwk.x)], [-3, fromB64(jwk.y)]]));
}

/**
 * Authenticator data: SHA-256(rpId) ‖ flags ‖ signCount (4 bytes, big-endian) ‖ attested credential data.
 * Passkeys in a vault are backed up and synced, so BE and BS are always set (as in Bitwarden).
 */
export async function authenticatorData({ rpId, userVerified, counter = 0, attested = null }) {
  let flags = FLAGS.UP | FLAGS.BE | FLAGS.BS;
  if (userVerified) flags |= FLAGS.UV;
  if (attested) flags |= FLAGS.AT;
  const count = new Uint8Array([counter >>> 24, (counter >> 16) & 0xff, (counter >> 8) & 0xff, counter & 0xff]);
  const parts = [await sha256(utf8(rpId)), new Uint8Array([flags]), count];
  if (attested) {
    const id = attested.credentialId;
    parts.push(AAGUID, new Uint8Array([id.length >> 8, id.length & 0xff]), id, attested.publicKey);
  }
  return concat(...parts);
}

/**
 * clientDataJSON as the browser would write it. `origin` must come from the browser (the tab), never from
 * the page; the challenge is base64url as the page gave it.
 */
export function clientDataJSON({ type, challenge, origin, crossOrigin = false }) {
  return utf8(JSON.stringify({ type, challenge, origin, crossOrigin }));
}

/** ECDSA signature: WebCrypto gives r ‖ s (IEEE P1363), WebAuthn wants ASN.1 DER. */
export function p1363ToDer(sig) {
  const int = (b) => {
    let i = 0;
    while (i < b.length - 1 && b[i] === 0) i++;
    let v = b.slice(i);
    if (v[0] & 0x80) v = concat(new Uint8Array([0]), v);
    return concat(new Uint8Array([0x02, v.length]), v);
  };
  const half = sig.length / 2;
  const body = concat(int(sig.slice(0, half)), int(sig.slice(half)));
  return concat(new Uint8Array([0x30, body.length]), body);
}

/* ---------- creating and using passkeys ---------- */

/**
 * New passkey for a registration. Returns the record to store (Bitwarden's Fido2Credential fields, all
 * strings except creationDate) and what the site gets back.
 * `user` is the site's user entity with `id` as bytes; `discoverable` whether the site asked for a resident key.
 */
export async function createPasskey({ rpId, rpName, user, discoverable, clientData, userVerified }) {
  const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', pair.privateKey));
  const jwk = await subtle.exportKey('jwk', pair.publicKey);
  const spki = new Uint8Array(await subtle.exportKey('spki', pair.publicKey));
  const credentialId = globalThis.crypto.randomUUID();
  const idBytes = credentialIdBytes(credentialId);
  const authData = await authenticatorData({
    rpId, userVerified, counter: 0, attested: { credentialId: idBytes, publicKey: coseKey(jwk) },
  });
  const attestationObject = cbor(new Map([['fmt', 'none'], ['attStmt', new Map()], ['authData', authData]]));
  return {
    record: {
      credentialId, keyType: 'public-key', keyAlgorithm: 'ECDSA', keyCurve: 'P-256', keyValue: b64url(pkcs8),
      rpId, rpName: rpName ?? rpId, userHandle: b64url(user.id), userName: user.name ?? '',
      userDisplayName: user.displayName ?? '', counter: '0', discoverable: String(!!discoverable),
      creationDate: new Date().toISOString(),
    },
    response: {
      id: b64url(idBytes), clientDataJSON: b64url(clientData), attestationObject: b64url(attestationObject),
      authenticatorData: b64url(authData), publicKey: b64url(spki), publicKeyAlgorithm: ES256, transports: ['internal', 'hybrid'],
    },
  };
}

/** Signs in with a stored passkey: authenticator data and a DER signature over it and the client data hash. */
export async function signAssertion({ record, clientData, userVerified, counter = 0 }) {
  if (record.keyAlgorithm && record.keyAlgorithm !== 'ECDSA') throw new Error(`Algorithmus ${record.keyAlgorithm} wird nicht unterstützt`);
  if (record.keyCurve && record.keyCurve !== 'P-256') throw new Error(`Kurve ${record.keyCurve} wird nicht unterstützt`);
  const key = await subtle.importKey('pkcs8', fromB64(record.keyValue), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const authData = await authenticatorData({ rpId: record.rpId, userVerified, counter });
  const signed = concat(authData, await sha256(clientData));
  const sig = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, signed));
  const idBytes = credentialIdBytes(record.credentialId);
  return {
    id: b64url(idBytes), clientDataJSON: b64url(clientData), authenticatorData: b64url(authData),
    signature: b64url(p1363ToDer(sig)), userHandle: record.userHandle ? b64url(fromB64(record.userHandle)) : null,
  };
}
