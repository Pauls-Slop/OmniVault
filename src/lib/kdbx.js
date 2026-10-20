// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Reads KeePass databases (.kdbx 3.1 and 4.x) for the file import. Written from the published format description
// (keepass.info, "Documenting KeePass KDBX4 file format" by W. Palant); no code from KeePass, KeePassXC or kdbxweb.
//
// Cryptography: SHA-256/512, HMAC-SHA-256 and AES-256-CBC from WebCrypto (AES-KDF as AES-CBC over zero blocks, which
// chains the AES rounds inside one WebCrypto call); ChaCha20 and Salsa20 from @noble/ciphers; Argon2d/Argon2id from the
// Argon2 reference implementation (vendor/argon2.mjs). Password and key file stay in memory only.

import { t } from '../i18n/index.js';
import { concat, fromB64, fromHex, fromUtf8, utf8 } from './bytes.js';

export const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_XML_BYTES = 256 * 1024 * 1024;
const MAX_ARGON2_KIB = 2 * 1024 * 1024; // 2 GiB
const MAX_AES_ROUNDS = 2 ** 32;

export class KdbxError extends Error {
  /** code: 'not-kdbx' | 'unsupported' | 'credentials' | 'corrupt' | 'too-large' */
  constructor(code, message) { super(message); this.code = code; }
}
const corrupt = () => new KdbxError('corrupt', t('Die Datei ist beschädigt oder unvollständig.'));
const wrongKey = () => new KdbxError('credentials', t('Falsches Master-Passwort oder falsche Schlüsseldatei.'));
const unsupported = (msg) => new KdbxError('unsupported', msg);

const SIG1 = 0x9AA2D903;
const SIG2_KDBX = 0xB54BFB67;
const SIG2_KDB = 0xB54BFB65;
const uuid = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const CIPHERS = {
  '31c1f2e6bf714350be5805216afc5aff': 'aes',
  'd6038a2b8b6f4cb5a524339a31dbb59a': 'chacha20',
  'ad68f29f576f4bb9a36ad47af965346c': 'twofish',
};
const KDFS = {
  'c9d9f39a628a4460bf740d08c18a4fea': 'aes',
  '7c02bb8279a74ac0927d114a00648238': 'aes', // AES-KDF, the id KeePassXC writes in KDBX 4 (same function)
  'ef636ddf8c29444b91f7a9a403e30a0c': 'argon2d',
  '9e298b1956db4773b23dfc3ec6f0a1e6': 'argon2id',
};
const SALSA_NONCE = new Uint8Array([0xe8, 0x30, 0x09, 0x4b, 0x97, 0x20, 0x5d, 0x2a]);

/* ---------- small helpers ---------- */

const sha256 = async (b) => new Uint8Array(await crypto.subtle.digest('SHA-256', b));
const sha512 = async (b) => new Uint8Array(await crypto.subtle.digest('SHA-512', b));
const le32 = (n) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; };
const le64 = (n) => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, BigInt(n), true); return b; };
async function hmac256(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}
function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

class Reader {
  constructor(bytes) { this.b = bytes; this.v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); this.p = 0; }
  need(n) { if (this.p + n > this.b.length) throw corrupt(); }
  u8() { this.need(1); return this.b[this.p++]; }
  u16() { this.need(2); const x = this.v.getUint16(this.p, true); this.p += 2; return x; }
  u32() { this.need(4); const x = this.v.getUint32(this.p, true); this.p += 4; return x; }
  bytes(n) { this.need(n); const x = this.b.subarray(this.p, this.p + n); this.p += n; return x; }
}

const vendorCiphers = () => import('../../vendor/noble-ciphers.mjs');
let argon2;
const loadArgon2 = () => (argon2 ??= import('../../vendor/argon2.mjs').then((m) => m.default()));

/* ---------- keys ---------- */

/**
 * The 32-byte key a key file contributes, as KeePass computes it: XML key file v1 (base64) or v2 (hex with
 * checksum), otherwise 32 raw bytes, 64 hex characters, or the SHA-256 of any other file.
 */
export async function keyFileKey(file) {
  const bytes = new Uint8Array(file);
  const text = (() => { try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '').trim(); } catch { return null; } })();
  if (text?.startsWith('<')) {
    const root = parseXml(text, { lenient: true });
    const kf = root?.child('KeyFile');
    const data = kf?.child('Key')?.child('Data');
    if (kf && data) {
      const version = kf.child('Meta')?.child('Version')?.text.trim() ?? '';
      if (version.startsWith('2')) {
        const h = data.text.replace(/\s+/g, '');
        if (!/^[0-9a-fA-F]{64}$/.test(h)) throw new KdbxError('corrupt', t('Die Schlüsseldatei ist beschädigt.'));
        const key = fromHex(h);
        const check = data.attrs.Hash?.replace(/\s+/g, '');
        if (check && !sameBytes(fromHex(check.toLowerCase()), (await sha256(key)).subarray(0, 4))) {
          throw new KdbxError('corrupt', t('Die Schlüsseldatei ist beschädigt.'));
        }
        return key;
      }
      if (version.startsWith('1')) {
        try { return fromB64(data.text.trim()); } catch { throw new KdbxError('corrupt', t('Die Schlüsseldatei ist beschädigt.')); }
      }
    }
  }
  if (bytes.length === 32) return bytes.slice();
  if (bytes.length === 64 && text && /^[0-9a-fA-F]{64}$/.test(text)) return fromHex(text);
  return sha256(bytes);
}

async function compositeKey(password, keyFile) {
  const parts = [];
  if (password != null) parts.push(await sha256(utf8(password)));
  if (keyFile) parts.push(keyFile);
  return sha256(concat(...parts));
}

/**
 * AES-KDF: `rounds` AES-256-ECB encryptions of each 16-byte half of the key with `seed` as AES key. AES-CBC over
 * zero blocks with the half as IV yields exactly that chain (each block is the encryption of the previous one), so
 * WebCrypto does millions of rounds per call.
 */
async function aesKdf(key, seed, rounds) {
  if (rounds > MAX_AES_ROUNDS) throw unsupported(t('Die Schlüsselableitung dieser Datenbank ist zu aufwendig.'));
  const k = await crypto.subtle.importKey('raw', seed, 'AES-CBC', false, ['encrypt']);
  const CHUNK = 1 << 20; // blocks per call (16 MiB)
  const zeros = new Uint8Array(Math.min(rounds, CHUNK) * 16);
  const half = async (iv) => {
    for (let left = rounds; left > 0;) {
      const n = Math.min(left, CHUNK);
      const out = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, k, zeros.subarray(0, n * 16)));
      iv = out.slice((n - 1) * 16, n * 16);
      left -= n;
    }
    return iv;
  };
  const [a, b] = await Promise.all([half(key.slice(0, 16)), half(key.slice(16, 32))]);
  return sha256(concat(a, b));
}

async function argon2Kdf(key, kdf, params) {
  const memoryKiB = Number(params.M ?? 0n) / 1024;
  const passes = Number(params.I ?? 0n);
  const parallelism = params.P ?? 0;
  if (!(params.S instanceof Uint8Array) || !memoryKiB || !passes || !parallelism) throw corrupt();
  if (params.K?.length || params.A?.length) throw unsupported(t('Diese Einstellungen der Schlüsselableitung werden nicht unterstützt.'));
  if (memoryKiB > MAX_ARGON2_KIB) {
    throw unsupported(t('Die Schlüsselableitung braucht {size} Arbeitsspeicher; unterstützt werden bis zu {max}.', { size: `${Math.round(memoryKiB / 1024)} MiB`, max: `${MAX_ARGON2_KIB / 1024} MiB` }));
  }
  const hash = await loadArgon2();
  try {
    return hash({ type: kdf === 'argon2d' ? 'd' : 'id', version: params.V ?? 0x13, password: key, salt: params.S, passes, memorySize: memoryKiB, parallelism, tagLength: 32 });
  } catch (e) {
    if (/memory/.test(e.message)) throw unsupported(t('Nicht genug Arbeitsspeicher für die Schlüsselableitung dieser Datenbank.'));
    throw unsupported(t('Diese Einstellungen der Schlüsselableitung werden nicht unterstützt.'));
  }
}

/* ---------- ciphers ---------- */

async function decryptPayload(cipher, key, iv, data) {
  if (cipher === 'aes') {
    if (iv.length !== 16 || data.length % 16) throw corrupt();
    const k = await crypto.subtle.importKey('raw', key, 'AES-CBC', false, ['decrypt']);
    try { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, k, data)); } catch { return null; } // bad padding: wrong key
  }
  if (iv.length !== 12) throw corrupt();
  const { chacha20 } = await vendorCiphers();
  return chacha20(key, iv, data);
}

/** Keystream for the protected values (inner random stream): 2 = Salsa20, 3 = ChaCha20. */
async function innerStream(id, key) {
  const c = await vendorCiphers();
  if (id === 2) { const k = await sha256(key); return (data) => c.salsa20(k, SALSA_NONCE, data); }
  if (id === 3) { const h = await sha512(key); return (data) => c.chacha20(h.subarray(0, 32), h.subarray(32, 44), data); }
  throw unsupported(t('Der Schutz der Feldwerte dieser Datenbank (Verfahren {id}) wird nicht unterstützt.', { id }));
}

async function gunzip(data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'));
  const parts = [];
  let size = 0;
  try {
    for await (const chunk of stream) {
      size += chunk.length;
      if (size > MAX_XML_BYTES) throw new KdbxError('too-large', t('Die Datenbank ist zu groß.'));
      parts.push(chunk);
    }
  } catch (e) {
    if (e instanceof KdbxError) throw e;
    throw corrupt();
  }
  return concat(...parts);
}

/* ---------- header ---------- */

function readVariantMap(bytes) {
  const r = new Reader(bytes);
  if ((r.u16() >> 8) !== 1) throw unsupported(t('Diese KDBX-Version wird nicht unterstützt.'));
  const out = {};
  for (;;) {
    const type = r.u8();
    if (type === 0) return out;
    const name = fromUtf8(r.bytes(r.u32()));
    const v = r.bytes(r.u32());
    const dv = new DataView(v.buffer, v.byteOffset, v.byteLength);
    if ((type === 0x04 || type === 0x0C) && v.length !== 4) throw corrupt();
    if ((type === 0x05 || type === 0x0D) && v.length !== 8) throw corrupt();
    out[name] = type === 0x04 ? dv.getUint32(0, true) : type === 0x05 ? dv.getBigUint64(0, true)
      : type === 0x0C ? dv.getInt32(0, true) : type === 0x0D ? dv.getBigInt64(0, true)
        : type === 0x08 ? v[0] !== 0 : type === 0x18 ? fromUtf8(v) : v.slice();
  }
}

function readHeader(bytes) {
  const r = new Reader(bytes);
  if (bytes.length < 12) throw new KdbxError('not-kdbx', t('Keine KeePass-Datenbank (.kdbx).'));
  const s1 = r.u32(), s2 = r.u32();
  if (s1 !== SIG1 || (s2 !== SIG2_KDBX && s2 !== SIG2_KDB)) throw new KdbxError('not-kdbx', t('Keine KeePass-Datenbank (.kdbx).'));
  if (s2 === SIG2_KDB) throw unsupported(t('KeePass-1-Datenbanken (.kdb) werden nicht unterstützt. Bitte in KeePass 2 oder KeePassXC öffnen und als .kdbx speichern.'));
  const minor = r.u16(), major = r.u16();
  if (major !== 3 && major !== 4) throw unsupported(t('KDBX-Version {version} wird nicht unterstützt.', { version: `${major}.${minor}` }));
  const h = { major, minor, fields: {} };
  for (;;) {
    const id = r.u8();
    const data = r.bytes(major === 4 ? r.u32() : r.u16());
    if (id === 0) break;
    h.fields[id] = data;
  }
  h.length = r.p;
  const f = h.fields;
  if (!f[2] || !f[4] || !f[7]) throw corrupt();
  h.cipher = CIPHERS[uuid(f[2])];
  if (h.cipher === 'twofish') throw unsupported(t('Twofish-Verschlüsselung wird nicht unterstützt. Bitte die Datenbank in KeePass oder KeePassXC auf AES-256 oder ChaCha20 umstellen.'));
  if (!h.cipher) throw unsupported(t('Das Verschlüsselungsverfahren dieser Datenbank wird nicht unterstützt.'));
  h.compressed = f[3] ? new DataView(f[3].buffer, f[3].byteOffset).getUint32(0, true) === 1 : false;
  if (major === 4) {
    if (!f[11]) throw corrupt();
    h.kdfParams = readVariantMap(f[11]);
    h.kdf = KDFS[uuid(h.kdfParams.$UUID ?? [])];
    if (!h.kdf) throw unsupported(t('Die Schlüsselableitung dieser Datenbank wird nicht unterstützt.'));
  } else {
    if (!f[5] || !f[6] || !f[9]) throw corrupt();
    h.kdf = 'aes';
    h.kdfParams = { S: f[5], R: new DataView(f[6].buffer, f[6].byteOffset).getBigUint64(0, true) };
  }
  return h;
}

async function deriveKey(h, composite) {
  const p = h.kdfParams;
  if (h.kdf === 'aes') {
    if (!(p.S instanceof Uint8Array) || p.S.length !== 32 || p.R == null) throw corrupt();
    return aesKdf(composite, p.S, Number(p.R));
  }
  return argon2Kdf(composite, h.kdf, p);
}

/* ---------- KDBX 4 ---------- */

async function openKdbx4(bytes, h, composite) {
  const r = new Reader(bytes);
  r.p = h.length;
  const header = bytes.subarray(0, h.length);
  const headerHash = r.bytes(32);
  const headerHmac = r.bytes(32);
  if (!sameBytes(headerHash, await sha256(header))) throw corrupt();
  const derived = await deriveKey(h, composite);
  const seed = h.fields[4];
  const hmacBase = await sha512(concat(seed, derived, new Uint8Array([1])));
  const blockKey = (i) => sha512(concat(le64(i), hmacBase));
  if (!sameBytes(headerHmac, await hmac256(await blockKey(0xFFFFFFFFFFFFFFFFn), header))) throw wrongKey();

  const blocks = [];
  for (let i = 0; ; i++) {
    const mac = r.bytes(32);
    const size = r.u32();
    const data = r.bytes(size);
    if (!sameBytes(mac, await hmac256(await blockKey(i), concat(le64(i), le32(size), data)))) throw corrupt();
    if (!size) break;
    blocks.push(data);
  }
  const key = await sha256(concat(seed, derived));
  let payload = await decryptPayload(h.cipher, key, h.fields[7], concat(...blocks));
  if (!payload) throw corrupt(); // the HMAC proved the key, so a padding error means damage
  if (h.compressed) payload = await gunzip(payload);

  const ir = new Reader(payload);
  let streamId = 0, streamKey = null;
  for (;;) {
    const id = ir.u8();
    const data = ir.bytes(ir.u32());
    if (id === 0) break;
    if (id === 1) streamId = new DataView(data.buffer, data.byteOffset).getUint32(0, true);
    if (id === 2) streamKey = data;
  }
  if (!streamKey) throw corrupt();
  return { xml: payload.subarray(ir.p), stream: await innerStream(streamId, streamKey) };
}

/* ---------- KDBX 3.1 ---------- */

async function openKdbx3(bytes, h, composite) {
  const f = h.fields;
  const master = await sha256(concat(f[4], await deriveKey(h, composite)));
  const plain = await decryptPayload(h.cipher, master, f[7], bytes.subarray(h.length));
  if (!plain || plain.length < 32 || !sameBytes(plain.subarray(0, 32), f[9])) throw wrongKey();
  const r = new Reader(plain);
  r.p = 32;
  const parts = [];
  for (let i = 0; ; i++) {
    if (r.u32() !== i) throw corrupt();
    const hash = r.bytes(32);
    const size = r.u32();
    if (!size) { if (hash.some((x) => x)) throw corrupt(); break; }
    const data = r.bytes(size);
    if (!sameBytes(hash, await sha256(data))) throw corrupt();
    parts.push(data);
  }
  let xml = concat(...parts);
  if (h.compressed) xml = await gunzip(xml);
  const id = f[10] ? new DataView(f[10].buffer, f[10].byteOffset).getUint32(0, true) : 0;
  if (!f[8]) throw corrupt();
  return { xml, stream: await innerStream(id, f[8]), headerHash: await sha256(bytes.subarray(0, h.length)) };
}

/* ---------- XML ---------- */

class Node {
  constructor(name, attrs) { this.name = name; this.attrs = attrs; this.children = []; this.text = ''; }
  child(name) { return this.children.find((c) => c.name === name); }
  all(name) { return this.children.filter((c) => c.name === name); }
}

const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const unescapeXml = (s) => (s.includes('&') ? s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|\w+);/g, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENT[e] ?? m;
}) : s);

/**
 * Minimal XML parser for KeePass files (elements, attributes, text, CDATA; no DTDs or external entities).
 * Returns a document node whose children are the top-level elements, or throws (null with `lenient`).
 */
export function parseXml(text, { lenient = false } = {}) {
  const doc = new Node('#document', {});
  const stack = [doc];
  const fail = () => { if (lenient) return null; throw corrupt(); };
  let i = 0;
  const n = text.length;
  while (i < n) {
    const lt = text.indexOf('<', i);
    const top = stack[stack.length - 1];
    if (lt < 0) { top.text += unescapeXml(text.slice(i)); break; }
    if (lt > i) top.text += unescapeXml(text.slice(i, lt));
    if (text.startsWith('<!--', lt)) { const e = text.indexOf('-->', lt + 4); if (e < 0) return fail(); i = e + 3; continue; }
    if (text.startsWith('<![CDATA[', lt)) { const e = text.indexOf(']]>', lt + 9); if (e < 0) return fail(); top.text += text.slice(lt + 9, e); i = e + 3; continue; }
    if (text.startsWith('<?', lt)) { const e = text.indexOf('?>', lt + 2); if (e < 0) return fail(); i = e + 2; continue; }
    if (text.startsWith('<!', lt)) return fail(); // DOCTYPE: KeePass never writes one
    const gt = text.indexOf('>', lt);
    if (gt < 0) return fail();
    const tag = text.slice(lt + 1, gt);
    i = gt + 1;
    if (tag[0] === '/') {
      const name = tag.slice(1).trim();
      if (stack.length < 2 || stack[stack.length - 1].name !== name) return fail();
      stack.pop();
      continue;
    }
    const selfClosing = tag.endsWith('/');
    const body = selfClosing ? tag.slice(0, -1) : tag;
    const m = /^([^\s/>]+)/.exec(body);
    if (!m) return fail();
    const attrs = {};
    for (const a of body.slice(m[1].length).matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = unescapeXml(a[2] ?? a[3]);
    const node = new Node(m[1], attrs);
    top.children.push(node);
    if (!selfClosing) stack.push(node);
  }
  if (stack.length !== 1) return fail();
  return doc;
}

/* ---------- entries ---------- */

const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';
const STANDARD = ['Title', 'UserName', 'Password', 'URL', 'Notes'];
const ALGOS = { 'HMAC-SHA-1': 'SHA1', 'HMAC-SHA-256': 'SHA256', 'HMAC-SHA-512': 'SHA512' };

function base32(bytes) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += A[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits) out += A[(value << (5 - bits)) & 31];
  return out;
}

function otpUri(label, secret, { period = 30, digits = 6, algorithm = 'SHA1' } = {}) {
  const q = new URLSearchParams({ secret: secret.replace(/[\s=]/g, '').toUpperCase() });
  if (Number(period) !== 30) q.set('period', String(period));
  if (Number(digits) !== 6) q.set('digits', String(digits));
  if (algorithm !== 'SHA1') q.set('algorithm', algorithm);
  return `otpauth://totp/${encodeURIComponent(label || 'OTP')}?${q}`;
}

/**
 * TOTP of an entry in the formats KeePass users meet: `otp` (KeePassXC: otpauth:// URI; KeeOtp: key=…&step=…),
 * `TOTP Seed` + `TOTP Settings` (older KeePassXC, TrayTOTP) and KeePass 2.47's TimeOtp-* fields.
 * Returns { totp, used: [field names] }.
 */
function entryTotp(f, label) {
  const otp = f.otp?.trim();
  if (otp) {
    if (/^otpauth:\/\//i.test(otp)) return { totp: otp, used: ['otp'] };
    if (/(^|&)key=/.test(otp)) {
      const q = new URLSearchParams(otp);
      return { totp: otpUri(label, q.get('key') ?? '', { period: q.get('step') ?? 30, digits: q.get('size') ?? 6, algorithm: (q.get('otpHashMode') ?? 'SHA1').toUpperCase() }), used: ['otp'] };
    }
    return { totp: otp, used: ['otp'] };
  }
  const seed = f['TOTP Seed']?.trim();
  if (seed) {
    const [period = '30', digits = '6'] = (f['TOTP Settings'] ?? '').split(';').map((s) => s.trim());
    const used = ['TOTP Seed', 'TOTP Settings'];
    if (digits === 'S') return { totp: `steam://${seed.replace(/\s/g, '')}`, used };
    return { totp: otpUri(label, seed, { period: Number(period) || 30, digits: Number(digits) || 6 }), used };
  }
  const tk = ['TimeOtp-Secret-Base32', 'TimeOtp-Secret-Hex', 'TimeOtp-Secret-Base64', 'TimeOtp-Secret'].find((k) => nonEmpty(f[k]));
  if (tk) {
    const v = f[tk].trim();
    let secret;
    try {
      secret = tk.endsWith('Base32') ? v : base32(tk.endsWith('Hex') ? fromHex(v.replace(/\s/g, '')) : tk.endsWith('Base64') ? fromB64(v) : utf8(v));
    } catch { return { totp: '', used: [] }; }
    return {
      totp: otpUri(label, secret, { period: Number(f['TimeOtp-Period']) || 30, digits: Number(f['TimeOtp-Length']) || 6, algorithm: ALGOS[f['TimeOtp-Algorithm']] ?? 'SHA1' }),
      used: [tk, 'TimeOtp-Period', 'TimeOtp-Length', 'TimeOtp-Algorithm'],
    };
  }
  return { totp: '', used: [] };
}

function entryToItem(e, folder) {
  const f = {};
  const hidden = new Set();
  for (const s of e.all('String')) {
    const key = s.child('Key')?.text ?? '';
    const v = s.child('Value');
    f[key] = v?.plain ?? v?.text ?? '';
    if (v?.attrs.Protected === 'True' || v?.attrs.ProtectInMemory === 'True') hidden.add(key);
  }
  const label = f.Title || f.UserName;
  const { totp, used } = entryTotp(f, label);
  const extraUrls = Object.keys(f).filter((k) => /^(KP2A_URL(_\d+)?|URL_\d+)$/.test(k) && nonEmpty(f[k]));
  const skip = new Set([...STANDARD, ...used, ...extraUrls]);
  const fields = Object.keys(f).filter((k) => !skip.has(k) && nonEmpty(f[k]))
    .map((k) => ({ name: k, value: f[k], type: hidden.has(k) ? 'hidden' : 'text' }));
  const uris = [f.URL, ...extraUrls.map((k) => f[k])].filter(nonEmpty).map((u) => u.trim());
  const hasLogin = nonEmpty(f.UserName) || nonEmpty(f.Password) || uris.length || totp;
  return {
    type: !hasLogin && nonEmpty(f.Notes) ? 'note' : 'login',
    name: f.Title || f.UserName || t('Ohne Namen'),
    username: f.UserName ?? '', password: f.Password ?? '', totp, uris,
    notes: f.Notes ?? '', fields, favorite: false, folder: folder || undefined,
  };
}

/**
 * Items of a KeePass XML tree (shared by the .kdbx reader and the KeePass XML import). Group paths below the top
 * group become folders ("Arbeit/Server"); the recycle bin and entry histories are left out.
 * Returns { items, recycled, attachments: [names of entries with attachments], name }.
 */
export function keepassItems(doc) {
  const file = doc.child('KeePassFile');
  const root = file?.child('Root');
  if (!file || !root) throw new KdbxError('not-kdbx', t('Kein KeePass-XML'));
  const meta = file.child('Meta');
  const binEnabled = meta?.child('RecycleBinEnabled')?.text.trim() !== 'False';
  const binUuid = binEnabled ? meta?.child('RecycleBinUUID')?.text.trim() : null;
  const out = { items: [], recycled: 0, attachments: [], name: meta?.child('DatabaseName')?.text ?? '' };
  const count = (g) => g.all('Entry').length + g.all('Group').reduce((n, c) => n + count(c), 0);
  const walk = (group, path) => {
    for (const e of group.all('Entry')) {
      const item = entryToItem(e, path.join('/'));
      if (e.all('Binary').length) out.attachments.push(item.name);
      out.items.push(item);
    }
    for (const g of group.all('Group')) {
      if (binUuid && g.child('UUID')?.text.trim() === binUuid) { out.recycled += count(g); continue; }
      walk(g, [...path, (g.child('Name')?.text ?? '').trim() || t('Ohne Namen')]);
    }
  };
  for (const top of root.all('Group')) walk(top, []);
  return out;
}

/** Decrypts the protected values in document order with the inner stream (they share one keystream). */
function unprotect(doc, stream) {
  const values = [];
  const visit = (n) => {
    if (n.name === 'Value' && n.attrs.Protected === 'True') values.push(n);
    for (const c of n.children) visit(c);
  };
  visit(doc);
  if (!values.length) return;
  let raw;
  try { raw = values.map((v) => fromB64(v.text.trim())); } catch { throw corrupt(); }
  const plain = stream(concat(...raw));
  let o = 0;
  for (let i = 0; i < values.length; i++) {
    values[i].plain = fromUtf8(plain.subarray(o, o + raw[i].length));
    o += raw[i].length;
  }
}

/** True when the bytes start with the KeePass 2 signature. */
export function isKdbx(bytes) {
  if (bytes.length < 8) return false;
  const v = new DataView(bytes.buffer, bytes.byteOffset, 8);
  return v.getUint32(0, true) === SIG1 && v.getUint32(4, true) === SIG2_KDBX;
}

/**
 * Opens a .kdbx file. `password`: the master password ('' = empty password); `keyFile`: the key file's bytes or null.
 * With a key file and an empty password field, both "no password" and "empty password" are tried (KeePass can store
 * either). Returns { version, items, recycled, attachments, name }; throws KdbxError.
 */
export async function openKdbx(file, { password = '', keyFile = null } = {}) {
  const bytes = new Uint8Array(file);
  if (bytes.length > MAX_FILE_BYTES) throw new KdbxError('too-large', t('Die Datei ist zu groß (höchstens {size}).', { size: `${MAX_FILE_BYTES / 1024 / 1024} MiB` }));
  const h = readHeader(bytes);
  const kf = keyFile ? await keyFileKey(keyFile) : null;
  const candidates = kf && password === '' ? [null, ''] : [password];
  let opened;
  for (const [i, pw] of candidates.entries()) {
    try {
      const composite = await compositeKey(pw, kf);
      opened = await (h.major === 4 ? openKdbx4 : openKdbx3)(bytes, h, composite);
      break;
    } catch (e) {
      if (!(e instanceof KdbxError && e.code === 'credentials') || i === candidates.length - 1) throw e;
    }
  }
  const { xml, stream, headerHash } = opened;
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(xml).replace(/^﻿/, ''); } catch { throw corrupt(); }
  const doc = parseXml(text);
  if (headerHash) {
    const stored = doc.child('KeePassFile')?.child('Meta')?.child('HeaderHash')?.text.trim();
    if (stored && !sameBytes(fromB64(stored), headerHash)) throw corrupt();
  }
  unprotect(doc, stream);
  return { version: `${h.major}.${h.minor}`, ...keepassItems(doc) };
}
