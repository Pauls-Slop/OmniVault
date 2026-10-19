// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// CBOR (RFC 8949): encoder for the subset WebAuthn and COSE need, and a decoder for definite-length data as
// Bitwarden's encryption v2 (COSE, cipher blobs) and WebAuthn produce it.
import { concat, fromUtf8, utf8 } from './bytes.js';

function head(major, n) {
  if (n < 24) return new Uint8Array([(major << 5) | n]);
  if (n < 0x100) return new Uint8Array([(major << 5) | 24, n]);
  if (n < 0x10000) return new Uint8Array([(major << 5) | 25, n >> 8, n & 0xff]);
  return new Uint8Array([(major << 5) | 26, n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
}

/**
 * Encodes integers, byte strings (Uint8Array), text, arrays and maps. Maps are a Map or a plain object and
 * keep their order – callers list keys in CTAP2 canonical order (shorter keys first, integers before negatives).
 */
export function cbor(v) {
  if (typeof v === 'number') {
    if (!Number.isInteger(v)) throw new TypeError('CBOR: nur ganze Zahlen');
    return v >= 0 ? head(0, v) : head(1, -1 - v);
  }
  if (v instanceof Uint8Array) return concat(head(2, v.length), v);
  if (typeof v === 'string') { const b = utf8(v); return concat(head(3, b.length), b); }
  if (Array.isArray(v)) return concat(head(4, v.length), ...v.map(cbor));
  const entries = v instanceof Map ? [...v] : Object.entries(v);
  return concat(head(5, entries.length), ...entries.flatMap(([k, x]) => [cbor(k), cbor(x)]));
}

/** Malformed CBOR (internal: callers turn it into a translated message). */
export class CborError extends Error {}

/**
 * Decodes one CBOR item. Maps become `Map` (keys may be numbers or strings), byte strings `Uint8Array`
 * (copies of the original bytes, which COSE needs for its authenticated data), tags are dropped (the tagged
 * value is returned). Integers beyond 2^53 are refused rather than rounded. `trailing: false` (default)
 * refuses bytes after the item.
 */
export function decodeCbor(bytes, { trailing = false } = {}) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let p = 0;
  const need = (n) => { if (p + n > b.length) throw new CborError('CBOR: truncated'); };
  const uint = (info) => {
    if (info < 24) return info;
    if (info === 24) { need(1); return b[p++]; }
    if (info === 25) { need(2); const v = (b[p] << 8) | b[p + 1]; p += 2; return v; }
    if (info === 26) { need(4); const v = ((b[p] << 24) >>> 0) + (b[p + 1] << 16) + (b[p + 2] << 8) + b[p + 3]; p += 4; return v; }
    if (info === 27) {
      need(8);
      const hi = ((b[p] << 24) >>> 0) + (b[p + 1] << 16) + (b[p + 2] << 8) + b[p + 3];
      const lo = ((b[p + 4] << 24) >>> 0) + (b[p + 5] << 16) + (b[p + 6] << 8) + b[p + 7];
      p += 8;
      const v = hi * 0x100000000 + lo;
      if (!Number.isSafeInteger(v)) throw new CborError('CBOR: integer too large');
      return v;
    }
    throw new CborError('CBOR: indefinite lengths are not supported');
  };
  const float = (info) => {
    const view = new DataView(b.buffer, b.byteOffset + p);
    if (info === 25) {
      need(2);
      const h = view.getUint16(0); p += 2;
      const exp = (h >> 10) & 0x1f; const frac = h & 0x3ff; const sign = h & 0x8000 ? -1 : 1;
      if (exp === 0) return sign * 2 ** -14 * (frac / 1024);
      if (exp === 31) return frac ? NaN : sign * Infinity;
      return sign * 2 ** (exp - 15) * (1 + frac / 1024);
    }
    if (info === 26) { need(4); const v = view.getFloat32(0); p += 4; return v; }
    need(8); const v = view.getFloat64(0); p += 8; return v;
  };
  let depth = 0;
  const item = () => {
    need(1);
    const ib = b[p++];
    const major = ib >> 5;
    const info = ib & 0x1f;
    if (++depth > 64) throw new CborError('CBOR: nested too deeply');
    try {
      switch (major) {
        case 0: return uint(info);
        case 1: return -1 - uint(info);
        case 2: { const n = uint(info); need(n); const v = b.slice(p, p + n); p += n; return v; }
        case 3: { const n = uint(info); need(n); const v = fromUtf8(b.subarray(p, p + n)); p += n; return v; }
        case 4: { const n = uint(info); const out = []; for (let i = 0; i < n; i++) out.push(item()); return out; }
        case 5: { const n = uint(info); const m = new Map(); for (let i = 0; i < n; i++) { const k = item(); m.set(k, item()); } return m; }
        case 6: uint(info); return item();
        default:
          if (info === 20) return false;
          if (info === 21) return true;
          if (info === 22) return null;
          if (info === 23) return undefined;
          if (info >= 25 && info <= 27) return float(info);
          throw new CborError('CBOR: unknown simple value');
      }
    } finally { depth--; }
  };
  const value = item();
  if (!trailing && p !== b.length) throw new CborError('CBOR: trailing bytes');
  return value;
}

/** Turns decoded CBOR maps with text keys into plain objects, recursively (for JSON-like payloads). */
export function cborToPlain(v) {
  if (v instanceof Map) return Object.fromEntries([...v].map(([k, x]) => [String(k), cborToPlain(x)]));
  if (Array.isArray(v)) return v.map(cborToPlain);
  return v;
}
