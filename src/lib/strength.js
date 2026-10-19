// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Rough password check for the report in Tools (offline, no password ever leaves the background).
// Deliberately simple: it flags what is clearly weak, it does not grade strong passwords.

import { t } from '../i18n/index.js';
const COMMON = new Set(['123456', '12345678', '123456789', '1234567890', 'password', 'passwort', 'qwerty', 'qwertz', 'abc123',
  'letmein', 'welcome', 'willkommen', 'iloveyou', 'admin', 'login', 'master', 'hallo', 'hallo123', 'test', 'test123', 'geheim',
  'sommer', 'winter', 'schatz', 'dragon', 'monkey', 'football', 'fussball', 'baseball', 'superman', 'trustno1', 'changeme', '111111', '000000']);
const SEQUENCES = ['abcdefghijklmnopqrstuvwxyz', 'qwertzuiop', 'qwertyuiop', 'asdfghjkl', 'yxcvbnm', 'zxcvbnm', '01234567890'];

/** Reason why `password` is weak, or null. `context`: words that should not appear (user name, item name). */
export function weakness(password, context = []) {
  const pw = String(password ?? '');
  if (!pw) return null;
  const low = pw.toLowerCase();
  if (COMMON.has(low) || COMMON.has(low.replace(/[\d!.?]+$/, ''))) return t('Häufig verwendetes Passwort');
  if (pw.length < 8) return t('Kürzer als 8 Zeichen');
  if (/^(.)\1+$/.test(pw)) return t('Nur ein wiederholtes Zeichen');
  if (pw.length < 12 && SEQUENCES.some((s) => s.includes(low))) return t('Tastatur- oder Zahlenfolge');
  for (const w of context) {
    const word = String(w ?? '').toLowerCase().split('@')[0];
    if (word.length >= 4 && low.includes(word) && pw.length - word.length < 6) return t('Enthält den Benutzer- oder Eintragsnamen');
  }
  const pool = (/[a-z]/.test(pw) ? 26 : 0) + (/[A-Z]/.test(pw) ? 26 : 0) + (/\d/.test(pw) ? 10 : 0) + (/[^A-Za-z\d]/.test(pw) ? 33 : 0);
  const distinct = new Set(pw).size;
  const bits = Math.min(pw.length, distinct * 2) * Math.log2(pool || 1);
  return bits < 50 ? t('Leicht zu erraten') : null;
}
