// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Public suffixes and registrable domains after the Public Suffix List (https://publicsuffix.org/list/),
// using the algorithm described there: the longest matching rule wins, exception rules beat wildcards,
// and an unlisted top-level label counts as a suffix of its own ("*").
import { PSL_RULES } from './psl-data.js';

let rules = null; // Map: rule → 'normal' | 'wildcard' | 'exception'
function load() {
  rules = new Map();
  for (const r of PSL_RULES.split(' ')) {
    if (r.startsWith('!')) rules.set(r.slice(1), 'exception');
    else if (r.startsWith('*.')) rules.set(r.slice(2), rules.get(r.slice(2)) === 'normal' ? 'both' : 'wildcard');
    else rules.set(r, rules.get(r) === 'wildcard' ? 'both' : 'normal');
  }
}

const isIp = (host) => /^[\d.]+$/.test(host) || host.includes(':') || host.startsWith('[');

/** Public suffix of a host name (lower-case ASCII, as URL.hostname gives it); null for IP addresses. */
export function publicSuffix(host) {
  if (!host || isIp(host)) return null;
  if (!rules) load();
  const labels = host.replace(/\.$/, '').split('.');
  let best = 1; // default rule "*": the last label
  for (let i = 0; i < labels.length; i++) {
    const name = labels.slice(i).join('.');
    const kind = rules.get(name);
    if (kind === 'exception') return labels.slice(i + 1).join('.'); // "!www.ck" beats "*.ck": suffix "ck"
    const n = labels.length - i;
    if ((kind === 'normal' || kind === 'both') && n > best) best = n;
    const parent = rules.get(labels.slice(i + 1).join('.')); // "*.ck" matches "foo.ck"
    if (i < labels.length - 1 && (parent === 'wildcard' || parent === 'both') && n > best) best = n;
  }
  return labels.slice(labels.length - best).join('.');
}

/** Registrable domain ("eTLD+1") of a host; null for IP addresses and for hosts that are public suffixes. */
export function registrableDomain(host) {
  const suffix = publicSuffix(host);
  if (!suffix) return null;
  const labels = host.replace(/\.$/, '').split('.');
  const n = suffix.split('.').length;
  return labels.length > n ? labels.slice(labels.length - n - 1).join('.') : null;
}

/**
 * HTML's "is a registrable domain suffix of or is equal to", which WebAuthn uses for the relying party id:
 * `rpId` must be the host itself or a parent domain of it that is not a public suffix (so example.co.uk may
 * claim example.co.uk, but nobody may claim co.uk or github.io for all their sites).
 */
export function isRegistrableSuffixOf(rpId, host) {
  if (!rpId || !host) return false;
  rpId = rpId.toLowerCase();
  host = host.toLowerCase();
  if (rpId === host) return true;
  if (isIp(rpId) || isIp(host)) return false;
  if (!host.endsWith(`.${rpId}`)) return false;
  return publicSuffix(rpId) !== rpId;
}
