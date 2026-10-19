// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Host permissions an account needs. Kept free of crypto code so the popup can import it
// cheaply and call permissions.request() synchronously inside a click.
import { endpoints } from './bitwarden/api.js';

function originPattern(url) {
  try { return `${new URL(url).origin}/*`; } catch { return null; }
}

export function hostPatterns(provider, config) {
  switch (provider) {
    case 'bitwarden': {
      const ep = endpoints(config.server);
      return [...new Set([ep.api, ep.identity].map(originPattern).filter(Boolean))];
    }
    case 'passbolt': {
      const p = originPattern(config.server);
      return p ? [p] : [];
    }
    default:
      return [];
  }
}
