// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Have I Been Pwned "Pwned Passwords" range API: only the first 5 hex digits of a password's SHA-1 are sent; the
// answer lists all suffixes with that prefix (padded with fake entries), and the match happens locally.
export const HIBP_ORIGIN = 'https://api.pwnedpasswords.com/*';

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

/** Default range lookup: GET /range/<prefix> with padding, cookies and cache off. */
export async function fetchRange(prefix) {
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { 'Add-Padding': 'true' }, credentials: 'omit', cache: 'no-store' });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.text();
}

/**
 * Breach counts for a list of passwords: Map(password → count), only passwords that were found. Each 5-digit
 * prefix is requested once; padding lines (count 0) are ignored.
 */
export async function breachCounts(passwords, range = fetchRange) {
  const ranges = new Map();
  const out = new Map();
  for (const password of new Set(passwords)) {
    const sha1 = hex(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password)));
    const prefix = sha1.slice(0, 5);
    if (!ranges.has(prefix)) {
      const counts = new Map();
      for (const line of (await range(prefix)).split('\n')) {
        const [suffix, count] = line.trim().split(':');
        if (suffix && Number(count) > 0) counts.set(suffix.toUpperCase(), Number(count));
      }
      ranges.set(prefix, counts);
    }
    const count = ranges.get(prefix).get(sha1.slice(5));
    if (count) out.set(password, count);
  }
  return out;
}
