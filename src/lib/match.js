// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// URL matching between a tab and vault items, by registrable domain (Public Suffix List).
import { registrableDomain } from './psl.js';

export function hostOf(url) {
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Registrable domain ("example.co.uk" for "www.example.co.uk"); IP addresses, "localhost" and suffixes stay as they are. */
export function baseDomain(host) {
  if (!host) return null;
  return registrableDomain(host) ?? host;
}

/** True if any of the item's URIs shares the registrable domain with the tab URL. */
export function matchesUrl(item, tabUrl) {
  const tabBase = baseDomain(hostOf(tabUrl));
  if (!tabBase) return false;
  return (item.uris ?? []).some((u) => baseDomain(hostOf(u)) === tabBase);
}
