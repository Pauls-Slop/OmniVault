// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Bitwarden client-side cryptography (also used by Vaultwarden).
// Reference: Bitwarden Security Whitepaper + open-source clients.
import { t } from '../../i18n/index.js';
import loadArgon2id from '../../../vendor/argon2id.mjs';
import { b64, concat, equalBytes, fromB64, fromUtf8, utf8 } from '../../lib/bytes.js';
import { ProviderError } from '../provider.js';

const subtle = globalThis.crypto.subtle;

export const KDF = { PBKDF2: 0, ARGON2ID: 1 };

/** argon2id library (MIT, WASM), loaded on first use. */
let argon2;

async function pbkdf2(password, salt, iterations, bytes = 32) {
  const key = await subtle.importKey('raw', password, 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, bytes * 8);
  return new Uint8Array(bits);
}

export async function hmacSha256(key, data) {
  const k = await subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await subtle.sign('HMAC', k, data));
}

/** HKDF-Expand (RFC 5869 §2.3) with SHA-256. Bitwarden uses expand only. */
export async function hkdfExpand(prk, info, length) {
  const infoBytes = typeof info === 'string' ? utf8(info) : info;
  const blocks = Math.ceil(length / 32);
  let block = new Uint8Array(0);
  const out = [];
  for (let i = 1; i <= blocks; i++) {
    block = await hmacSha256(prk, concat(block, infoBytes, new Uint8Array([i])));
    out.push(block);
  }
  return concat(...out).slice(0, length);
}

/**
 * Master key from password + email using the account's KDF settings
 * (as returned by the prelogin endpoint).
 */
export async function deriveMasterKey(password, email, kdf) {
  const pw = utf8(password);
  const normalizedEmail = email.trim().toLowerCase();
  if (kdf.kdf === KDF.PBKDF2) {
    return pbkdf2(pw, utf8(normalizedEmail), kdf.kdfIterations);
  }
  if (kdf.kdf === KDF.ARGON2ID) {
    const salt = new Uint8Array(await subtle.digest('SHA-256', utf8(normalizedEmail)));
    argon2 ??= loadArgon2id();
    const hash = await argon2;
    return hash({
      password: pw,
      salt,
      passes: kdf.kdfIterations,
      memorySize: kdf.kdfMemory * 1024, // MiB → KiB
      parallelism: kdf.kdfParallelism,
      tagLength: 32,
    });
  }
  throw new ProviderError(t('Unbekannter KDF-Typ {kdf}', { kdf: kdf.kdf }), 'unsupported');
}

/** Server-side authentication hash: PBKDF2(masterKey, salt=password, 1). */
export async function masterPasswordHash(masterKey, password) {
  return b64(await pbkdf2(masterKey, utf8(password), 1));
}

/** Stretched master key: 32-byte enc key + 32-byte mac key. */
export async function stretchMasterKey(masterKey) {
  return {
    enc: await hkdfExpand(masterKey, 'enc', 32),
    mac: await hkdfExpand(masterKey, 'mac', 32),
  };
}

/** Split a 64-byte symmetric key (user key, org key, item key). */
export function splitKey(bytes) {
  if (bytes.length === 64) return { enc: bytes.slice(0, 32), mac: bytes.slice(32) };
  if (bytes.length === 32) return { enc: bytes, mac: null };
  throw new ProviderError(t('Unerwartete Schlüssellänge {n}', { n: bytes.length }), 'crypto');
}

/**
 * EncString: "<type>.<b64 iv>|<b64 ct>|<b64 mac>" (symmetric)
 *            "<type>.<b64 ct>"                     (asymmetric)
 */
export function parseEncString(s) {
  const dot = s.indexOf('.');
  if (dot < 0) throw new ProviderError(t('Ungültiger EncString'), 'crypto');
  const type = Number(s.slice(0, dot));
  const parts = s.slice(dot + 1).split('|').map(fromB64);
  switch (type) {
    case 0: return { type, iv: parts[0], ct: parts[1] };
    case 2: return { type, iv: parts[0], ct: parts[1], mac: parts[2] };
    case 3: case 4: return { type, ct: parts[0] };
    case 5: case 6: return { type, ct: parts[0], mac: parts[1] }; // legacy HMAC variants
    default:
      throw new ProviderError(t('EncString-Typ {type} wird noch nicht unterstützt', { type }), 'unsupported');
  }
}

/** Decrypt a symmetric EncString (AES-256-CBC, optionally HMAC-SHA256 authenticated). */
export async function decryptSym(encString, key) {
  const e = typeof encString === 'string' ? parseEncString(encString) : encString;
  if (e.type === 2) {
    if (!key.mac) throw new ProviderError(t('MAC-Schlüssel fehlt'), 'crypto');
    const mac = await hmacSha256(key.mac, concat(e.iv, e.ct));
    if (!equalBytes(mac, e.mac)) throw new ProviderError(t('MAC-Prüfung fehlgeschlagen'), 'crypto');
  } else if (e.type !== 0) {
    throw new ProviderError(t('Kein symmetrischer EncString (Typ {type})', { type: e.type }), 'crypto');
  }
  const k = await subtle.importKey('raw', key.enc, 'AES-CBC', false, ['decrypt']);
  return new Uint8Array(await subtle.decrypt({ name: 'AES-CBC', iv: e.iv }, k, e.ct));
}

export async function decryptSymString(encString, key) {
  if (encString == null) return undefined;
  return fromUtf8(await decryptSym(encString, key));
}

/** Encrypt (type 2) – used by tests and later for write support. */
export async function encryptSym(plain, key) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const k = await subtle.importKey('raw', key.enc, 'AES-CBC', false, ['encrypt']);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-CBC', iv }, k,
    typeof plain === 'string' ? utf8(plain) : plain));
  const mac = await hmacSha256(key.mac, concat(iv, ct));
  return `2.${b64(iv)}|${b64(ct)}|${b64(mac)}`;
}

/** Decrypt an RSA-OAEP EncString (organization keys) with the user's PKCS#8 private key. */
export async function decryptRsa(encString, privateKeyPkcs8) {
  const e = parseEncString(encString);
  const hash = e.type === 3 ? 'SHA-256' : e.type === 4 || e.type === 6 ? 'SHA-1' : null;
  if (!hash) throw new ProviderError(t('Kein RSA-EncString (Typ {type})', { type: e.type }), 'crypto');
  const k = await subtle.importKey('pkcs8', privateKeyPkcs8,
    { name: 'RSA-OAEP', hash }, false, ['decrypt']);
  return new Uint8Array(await subtle.decrypt({ name: 'RSA-OAEP' }, k, e.ct));
}

/**
 * Decrypt the protected user key returned at login.
 * Modern accounts: type 2 with stretched master key.
 * Very old accounts: type 0 with the raw master key.
 */
export async function decryptUserKey(protectedKey, masterKey) {
  const e = parseEncString(protectedKey);
  const key = e.type === 0 ? { enc: masterKey, mac: null } : await stretchMasterKey(masterKey);
  try {
    return await decryptSym(e, key);
  } catch (err) {
    if (err.code === 'crypto') throw new ProviderError(t('Falsches Master-Passwort'), 'bad_password');
    throw err;
  }
}

/** Decrypt an encrypted file (EncArrayBuffer: type 2 | iv 16 | mac 32 | data), e.g. an attachment. */
export async function decryptBuffer(buf, key) {
  const b = new Uint8Array(buf);
  if (b[0] !== 2 || b.length < 49) throw new ProviderError(t('Unbekanntes Dateiformat'), 'crypto');
  return decryptSym({ type: 2, iv: b.slice(1, 17), mac: b.slice(17, 49), ct: b.slice(49) }, key);
}

/** Encrypt a file as EncArrayBuffer (tests upload attachments with it). */
export async function encryptBuffer(bytes, key) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const k = await subtle.importKey('raw', key.enc, 'AES-CBC', false, ['encrypt']);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-CBC', iv }, k, bytes));
  return concat(new Uint8Array([2]), iv, await hmacSha256(key.mac, concat(iv, ct)), ct);
}
