// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// RFC 6238 TOTP from a base32 secret or an otpauth:// URI.
import { t } from '../i18n/index.js';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(s) {
  const clean = s.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error(t('Ungültiges Base32'));
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(out);
}

export function parseTotp(input) {
  if (input.startsWith('otpauth://')) {
    const u = new URL(input);
    const p = u.searchParams;
    return {
      secret: p.get('secret') ?? '',
      digits: Number(p.get('digits') ?? 6),
      period: Number(p.get('period') ?? 30),
      algorithm: (p.get('algorithm') ?? 'SHA1').toUpperCase().replace('SHA', 'SHA-'),
    };
  }
  return { secret: input, digits: 6, period: 30, algorithm: 'SHA-1' };
}

export async function totp(input, now = Date.now()) {
  const { secret, digits, period, algorithm } = parseTotp(input);
  const counter = Math.floor(now / 1000 / period);
  const msg = new Uint8Array(8);
  new DataView(msg.buffer).setBigUint64(0, BigInt(counter));
  const key = await crypto.subtle.importKey('raw', base32Decode(secret),
    { name: 'HMAC', hash: algorithm }, false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const o = h[h.length - 1] & 0xf;
  const code = ((h[o] & 0x7f) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 10 ** digits;
  return {
    code: String(code).padStart(digits, '0'),
    remaining: period - (Math.floor(now / 1000) % period),
  };
}
