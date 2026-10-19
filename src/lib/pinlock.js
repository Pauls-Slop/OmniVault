// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Unlock with a PIN. Locking must work without the PIN (it happens on a timer), unlocking needs it. Hence a key
// pair: the public key seals the account sessions when OmniVault locks; the private key is stored encrypted with
// a key derived from the PIN (Argon2id), so only the PIN opens the sealed sessions again.
// The sealed sessions live only in memory (storage.session): after a browser restart the master password is
// needed again, like Bitwarden's default "lock with master password on restart".
import { t } from '../i18n/index.js';
import loadArgon2id from '../../vendor/argon2id.mjs';
import { b64, fromB64, fromUtf8, utf8 } from './bytes.js';
import { PIN_MAX, PIN_MIN, validPin } from './pin-rules.js';

const { subtle } = globalThis.crypto;
const ARGON = { passes: 3, memorySize: 64 * 1024, parallelism: 1, tagLength: 32 }; // 64 MiB
let argon2;

async function pinKey(pin, salt) {
  argon2 ??= loadArgon2id();
  const raw = (await argon2)({ password: utf8(pin), salt, ...ARGON });
  return subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export { validPin };

/** → lock object to store (public key, private key encrypted with the PIN). */
export async function createPinLock(pin) {
  if (!validPin(pin)) throw new Error(t('Die PIN muss aus {min} bis {max} Ziffern bestehen', { min: PIN_MIN, max: PIN_MAX }));
  const pair = await subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const priv = new Uint8Array(await subtle.exportKey('pkcs8', pair.privateKey));
  const enc = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, await pinKey(pin, salt), priv));
  return { v: 1, publicKey: b64(new Uint8Array(await subtle.exportKey('spki', pair.publicKey))), salt: b64(salt), iv: b64(iv), privateKey: b64(enc) };
}

/** Seals any JSON value with the lock's public key (no PIN needed). */
export async function seal(lock, value) {
  const pub = await subtle.importKey('spki', fromB64(lock.publicKey), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const dataKey = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, dataKey, utf8(JSON.stringify(value))));
  const wrapped = new Uint8Array(await subtle.encrypt({ name: 'RSA-OAEP' }, pub, new Uint8Array(await subtle.exportKey('raw', dataKey))));
  return { iv: b64(iv), key: b64(wrapped), data: b64(data) };
}

/** Opens a sealed value with the PIN; throws "Falsche PIN" for a wrong PIN. */
export async function unseal(lock, sealed, pin) {
  let priv;
  try {
    const k = await pinKey(String(pin ?? ''), fromB64(lock.salt));
    const pkcs8 = await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(lock.iv) }, k, fromB64(lock.privateKey));
    priv = await subtle.importKey('pkcs8', pkcs8, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
  } catch {
    throw new Error(t('Falsche PIN'));
  }
  const raw = await subtle.decrypt({ name: 'RSA-OAEP' }, priv, fromB64(sealed.key));
  const dataKey = await subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  return JSON.parse(fromUtf8(new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) }, dataKey, fromB64(sealed.data)))));
}
