// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
import { mark, t } from '../i18n/index.js';
import BitwardenProvider from './bitwarden/index.js';
import PassboltProvider from './passbolt/index.js';
import ProtonPassProvider from './protonpass/index.js';
import PassProvider from './pass/index.js';
import GopassProvider from './gopass/index.js';
import OnePasswordProvider from './onepassword/index.js';
import LastPassProvider from './lastpass/index.js';
import KeePassXCProvider from './keepassxc/index.js';
import VaultProvider from './vault/index.js';

// NordPass is postponed (no vault API or CLI).
const providers = [BitwardenProvider, PassboltProvider, KeePassXCProvider, VaultProvider, ProtonPassProvider, PassProvider, GopassProvider, OnePasswordProvider, LastPassProvider];

export const registry = Object.fromEntries(providers.map((p) => [p.id, p]));

/** Texts of the account form in the interface language (providers declare them in German, see mark()). */
const TEXT_KEYS = new Set(['label', 'hint', 'fileLabel']);
const translateFields = (v) => (Array.isArray(v) ? v.map(translateFields)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, TEXT_KEYS.has(k) && typeof x === 'string' ? t(x) : translateFields(x)]))
  : v);

export function describeProviders() {
  return providers.map((p) => ({
    id: p.id, label: p.label, status: p.status, note: p.note && t(p.note), configFields: translateFields(p.configFields),
    unlockLabel: t(p.unlockLabel ?? mark('Passwort')),
    unlockLabels: p.unlockLabels && { field: p.unlockLabelField, labels: Object.fromEntries(Object.entries(p.unlockLabels).map(([k, v]) => [k, t(v)])) },
    unlockOptions: p.unlockOptions ?? [],
    unlockMode: p.unlockMode ?? 'password',
    optionalPermissions: p.optionalPermissions ?? [],
    capabilities: p.capabilities ?? { write: false, types: [] },
  }));
}

export function getProvider(id) {
  const p = registry[id];
  if (!p) throw new Error(t('Unbekannter Anbieter: {id}', { id }));
  return p;
}
