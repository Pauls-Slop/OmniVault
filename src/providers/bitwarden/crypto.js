// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Bitwarden client-side cryptography (also used by Vaultwarden).
// Reference: Bitwarden Security Whitepaper + open-source clients. Encryption v2 (EncString type 7, COSE keys,
// XAES-256-GCM): format read from Bitwarden's public sources (no code taken), implemented here independently.
import { t } from '../../i18n/index.js';
import loadArgon2id from '../../../vendor/argon2id.mjs';
import { xchacha20poly1305 } from '../../../vendor/noble-ciphers.mjs';
import { b64, concat, equalBytes, fromB64, fromUtf8, utf8 } from '../../lib/bytes.js';
import { cbor, decodeCbor } from '../../lib/cbor.js';
import { ProviderError } from '../provider.js';

const subtle = globalThis.crypto.subtle;

export const KDF = { PBKDF2: 0, ARGON2ID: 1 };


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
    // A fresh WebAssembly instance per derivation: its memory (up to 1 GiB with Bitwarden's highest setting) cannot
    // shrink, and a cached instance would keep it allocated in the background for as long as the browser runs.
    const hash = await loadArgon2id();
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

/* ---------- encryption v2: COSE keys and EncString type 7 ---------- */

/** COSE algorithm ids Bitwarden uses (negative ids are Bitwarden's private range). */
export const COSE_ALG = { XAES_256_GCM: -70010, XCHACHA20_POLY1305: -70000, A256GCM: 3 };
/** Content types in the protected header (key 3). */
export const CONTENT = {
  UTF8_PADDED: 'application/x.bitwarden.utf8-padded', CBOR_PADDED: 'application/x.bitwarden.cbor-padded',
  LEGACY_KEY: 'application/x.bitwarden.legacy-key', PKCS8: 284, COSE_KEY: 101, OCTETS: 42, CBOR: 60,
};
const NONCE_LENGTH = { [COSE_ALG.XAES_256_GCM]: 24, [COSE_ALG.XCHACHA20_POLY1305]: 24, [COSE_ALG.A256GCM]: 12 };

/** Removes Bitwarden's padding: the last byte N says how many bytes (all equal to N, at least one) to drop. */
export function unpad(bytes) {
  const n = bytes[bytes.length - 1];
  if (!n || n > bytes.length || bytes.subarray(bytes.length - n).some((x) => x !== n)) {
    throw new ProviderError(t('Ungültige Polsterung'), 'crypto');
  }
  return bytes.slice(0, bytes.length - n);
}

/** Reads a symmetric COSE_Key {1: 4, 2: kid, 3: alg, -1: k} → key object of an encryption-v2 account. */
export function parseCoseKey(bytes) {
  let m;
  try { m = decodeCbor(bytes); } catch { m = null; }
  const k = m instanceof Map ? m.get(-1) : null;
  const alg = m instanceof Map ? m.get(3) : null;
  if (!(m instanceof Map) || m.get(1) !== 4 || !(k instanceof Uint8Array) || k.length !== 32 || !NONCE_LENGTH[alg]) {
    throw new ProviderError(t('Unbekanntes Schlüsselformat'), 'crypto');
  }
  const kid = m.get(2) instanceof Uint8Array ? m.get(2) : null;
  return { enc: k, mac: null, cose: { alg, kid } };
}

/**
 * Symmetric key from its bytes: 64 bytes = AES-256-CBC + HMAC (enc‖mac), 32 bytes = AES-256-CBC only;
 * longer = padded COSE key (encryption v2).
 */
export function splitKey(bytes) {
  if (bytes.length === 64) return { enc: bytes.slice(0, 32), mac: bytes.slice(32) };
  if (bytes.length === 32) return { enc: bytes, mac: null };
  if (bytes.length > 64) return parseCoseKey(unpad(bytes));
  throw new ProviderError(t('Unerwartete Schlüssellänge {n}', { n: bytes.length }), 'crypto');
}

/** Raw bytes of a key object for storage (session, item keys): what splitKey reads back. */
export function keyBytes(key) {
  if (key.cose) throw new ProviderError(t('Unbekanntes Schlüsselformat'), 'crypto');
  return new Uint8Array([...key.enc, ...(key.mac ?? [])]);
}

async function aesBlock(key, block) {
  // one AES block: AES-CBC with a zero IV, first 16 bytes of the output (WebCrypto has no raw ECB)
  const k = await subtle.importKey('raw', key, 'AES-CBC', false, ['encrypt']);
  return new Uint8Array(await subtle.encrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, k, block)).slice(0, 16);
}

/** XAES-256-GCM key derivation (https://c2sp.org/XAES-256-GCM): AES-256-GCM key for a 24-byte nonce. */
export async function xaesDerive(key, nonce) {
  const L = await aesBlock(key, new Uint8Array(16));
  const K1 = new Uint8Array(16);
  for (let i = 0; i < 16; i++) K1[i] = ((L[i] << 1) | (i < 15 ? L[i + 1] >> 7 : 0)) & 0xff;
  if (L[0] & 0x80) K1[15] ^= 0x87;
  const M = (i) => {
    const m = concat(new Uint8Array([0, i, 0x58, 0]), nonce.subarray(0, 12));
    for (let j = 0; j < 16; j++) m[j] ^= K1[j];
    return m;
  };
  return concat(await aesBlock(key, M(1)), await aesBlock(key, M(2)));
}

async function aead(alg, key, nonce, aad, data, encrypt) {
  try {
    if (alg === COSE_ALG.XCHACHA20_POLY1305) {
      const c = xchacha20poly1305(key, nonce, aad);
      return encrypt ? c.encrypt(data) : c.decrypt(data);
    }
    const gcmKey = alg === COSE_ALG.XAES_256_GCM ? await xaesDerive(key, nonce) : key;
    const iv = alg === COSE_ALG.XAES_256_GCM ? nonce.subarray(12, 24) : nonce;
    const k = await subtle.importKey('raw', gcmKey, 'AES-GCM', false, [encrypt ? 'encrypt' : 'decrypt']);
    const params = { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 };
    return new Uint8Array(await (encrypt ? subtle.encrypt(params, k, data) : subtle.decrypt(params, k, data)));
  } catch (e) {
    if (encrypt) throw e;
    throw new ProviderError(t('MAC-Prüfung fehlgeschlagen'), 'crypto');
  }
}

const encStructure = (protectedBytes) => cbor(['Encrypt0', protectedBytes, new Uint8Array(0)]);

/** Opens a COSE_Encrypt0 message (bytes) with a v2 key → { bytes, contentType } (padding already removed). */
export async function openCose(message, key) {
  if (!key?.cose) throw new ProviderError(t('Dieser Eintrag braucht einen Schlüssel im neuen Format'), 'crypto');
  let arr;
  try { arr = decodeCbor(message); } catch { arr = null; }
  if (!Array.isArray(arr) || arr.length !== 3 || !(arr[0] instanceof Uint8Array) || !(arr[2] instanceof Uint8Array)) {
    throw new ProviderError(t('Ungültiger EncString'), 'crypto');
  }
  const prot = arr[0].length ? decodeCbor(arr[0]) : new Map();
  const unprot = arr[1] instanceof Map ? arr[1] : new Map();
  const alg = prot.get(1);
  const kid = prot.get(4);
  const nonce = unprot.get(5) ?? prot.get(5);
  if (alg !== key.cose.alg) throw new ProviderError(t('Verfahren passt nicht zum Schlüssel'), 'crypto');
  if (kid instanceof Uint8Array && key.cose.kid && !equalBytes(kid, key.cose.kid)) {
    throw new ProviderError(t('Schlüssel-ID passt nicht'), 'crypto');
  }
  if (!(nonce instanceof Uint8Array) || nonce.length !== NONCE_LENGTH[alg]) throw new ProviderError(t('Ungültiger EncString'), 'crypto');
  const contentType = prot.get(3);
  let bytes = await aead(alg, key.enc, nonce, encStructure(arr[0]), arr[2], false);
  if (contentType === CONTENT.UTF8_PADDED || contentType === CONTENT.CBOR_PADDED) bytes = unpad(bytes);
  return { bytes, contentType };
}

/** Seals bytes as COSE_Encrypt0 under a v2 key (tests build v2 accounts with it; padding as Bitwarden does). */
export async function sealCose(bytes, key, contentType = CONTENT.OCTETS, { padTo = 0, extraHeader = [] } = {}) {
  let data = bytes;
  if (padTo) {
    const n = padTo - (bytes.length % padTo) || padTo;
    data = concat(bytes, new Uint8Array(n).fill(n));
  }
  const protectedBytes = cbor(new Map([[1, key.cose.alg], [3, contentType], ...(key.cose.kid ? [[4, key.cose.kid]] : []), ...extraHeader]));
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(NONCE_LENGTH[key.cose.alg]));
  const ct = await aead(key.cose.alg, key.enc, nonce, encStructure(protectedBytes), data, true);
  return cbor([protectedBytes, new Map([[5, nonce]]), ct]);
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
    case 7: return { type, cose: parts[0] }; // encryption v2: COSE_Encrypt0
    default:
      throw new ProviderError(t('EncString-Typ {type} wird noch nicht unterstützt', { type }), 'unsupported');
  }
}

/** Decrypt a symmetric EncString (AES-256-CBC, optionally HMAC-SHA256 authenticated). */
export async function decryptSym(encString, key) {
  const e = typeof encString === 'string' ? parseEncString(encString) : encString;
  if (e.type === 7) return (await openCose(e.cose, key)).bytes;
  if (key.cose) throw new ProviderError(t('Kein symmetrischer EncString (Typ {type})', { type: e.type }), 'crypto');
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

/**
 * Decrypts a wrapped symmetric key (item key, content key, signing key …) → key object. Type 7 says in its
 * content type whether it holds old key bytes or a COSE key; older types hold bytes (possibly a padded COSE key).
 */
export async function decryptKey(encString, wrappingKey) {
  const e = typeof encString === 'string' ? parseEncString(encString) : encString;
  if (e.type === 7) {
    const { bytes, contentType } = await openCose(e.cose, wrappingKey);
    return contentType === CONTENT.COSE_KEY ? parseCoseKey(bytes) : splitKey(bytes);
  }
  return splitKey(await decryptSym(e, wrappingKey));
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
