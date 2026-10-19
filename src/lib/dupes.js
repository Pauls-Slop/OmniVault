// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Duplicate detection without secrets: two logins are duplicates when they share a website (host without
// "www.") and the same user name (case-insensitive). Items with several URLs are joined transitively.

/** Normalized host of a stored URL ("github.com/login", "https://www.GitHub.com" → "github.com"). */
export function hostOf(uri) {
  if (!uri) return null;
  const s = String(uri).trim();
  if (!s) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`);
    if (!/^https?:$/.test(u.protocol) || !u.hostname) return null;
    return u.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  } catch {
    return null;
  }
}

const norm = (v) => String(v ?? '').trim().toLowerCase();

/**
 * Groups duplicate logins.
 * @param {Array} items  items as listed (id, accountId, type, username, uris, …)
 * @param {{scope?: 'all'|'within'|'across'}} opts
 *   within: duplicates inside one account; across: the same login in several accounts
 * @returns {Array<{key, host, username, items, accounts, within, across}>}
 */
export function findDuplicates(items, { scope = 'all' } = {}) {
  const logins = items.filter((i) => i.type === 'login');
  // union-find over item indices, joined by shared (host, user) keys
  const parent = logins.map((_, n) => n);
  const find = (n) => (parent[n] === n ? n : (parent[n] = find(parent[n])));
  const firstByKey = new Map();
  const keysOf = logins.map((i) => {
    const user = norm(i.username);
    const hosts = [...new Set((i.uris ?? []).map(hostOf).filter(Boolean))];
    return hosts.map((h) => `${h}\u0000${user}`);
  });
  keysOf.forEach((keys, n) => {
    for (const k of keys) {
      if (firstByKey.has(k)) parent[find(n)] = find(firstByKey.get(k));
      else firstByKey.set(k, n);
    }
  });
  const groups = new Map();
  logins.forEach((i, n) => {
    if (!keysOf[n].length) return; // without a website there is nothing reliable to compare
    const r = find(n);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(n);
  });

  const out = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const its = members.map((n) => logins[n]);
    const perAccount = new Map();
    for (const i of its) perAccount.set(i.accountId, (perAccount.get(i.accountId) ?? 0) + 1);
    const within = [...perAccount.values()].some((c) => c > 1);
    const across = perAccount.size > 1;
    if (scope === 'within' && !within) continue;
    if (scope === 'across' && !across) continue;
    const [host] = keysOf[members[0]][0].split('\u0000');
    out.push({
      key: keysOf[members[0]][0], host, username: its[0].username ?? '', within, across,
      accounts: [...perAccount.keys()],
      // newest first, so "keep the newest" is the first entry
      items: its.sort((a, b) => String(b.revisionDate ?? '').localeCompare(String(a.revisionDate ?? ''))),
    });
  }
  return out.sort((a, b) => a.host.localeCompare(b.host) || a.username.localeCompare(b.username));
}
