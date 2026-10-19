// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Local password generator (no network, no third-party word lists).
import { t } from '../i18n/index.js';
export const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/~',
};
const AMBIGUOUS = /[Il1O0o]/g;

/** Uniform random integer in [0, n) via rejection sampling. */
export function randomInt(n) {
  if (n <= 0 || n > 2 ** 32) throw new RangeError('n');
  const limit = Math.floor(2 ** 32 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

export const DEFAULT_OPTIONS = { length: 20, lower: true, upper: true, digits: true, symbols: true, avoidAmbiguous: false };

export function charsets(o) {
  return Object.keys(SETS).filter((k) => o[k]).map((k) => (o.avoidAmbiguous ? SETS[k].replace(AMBIGUOUS, '') : SETS[k]));
}

/** Password with at least one character from every selected class. */
export function generatePassword(options = {}) {
  const o = { ...DEFAULT_OPTIONS, ...options };
  const sets = charsets(o);
  if (!sets.length) throw new Error(t('Mindestens eine Zeichenart auswählen'));
  const length = Math.max(Math.min(Math.floor(o.length), 128), sets.length, 4);
  const all = sets.join('');
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) { // Fisher–Yates
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function generatePin(length = 6) {
  return Array.from({ length: Math.max(4, Math.min(32, length)) }, () => SETS.digits[randomInt(10)]).join('');
}

/** Approximate entropy in bits for a generated password with these options. */
export function entropyBits(options = {}) {
  const o = { ...DEFAULT_OPTIONS, ...options };
  const pool = charsets(o).join('').length;
  return pool ? Math.floor(o.length * Math.log2(pool)) : 0;
}

export function strengthLabel(bits) {
  if (bits >= 100) return t('sehr stark');
  if (bits >= 75) return t('stark');
  if (bits >= 50) return t('mittel');
  return t('schwach');
}
