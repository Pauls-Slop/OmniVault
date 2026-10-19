// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Account configuration (storage.local, non-secret) and sessions (storage.session, RAM only).
import { t } from '../i18n/index.js';
import { ext } from '../lib/browser.js';

const ACCOUNTS_KEY = 'accounts';
const sessionKey = (id) => `session:${id}`;

/** Account hues, chosen to stay distinguishable from the 358° brand red. */
export const ACCOUNT_HUES = [212, 148, 32, 272, 186, 322, 88, 248];

/** "Vaultwarden Test" → "VT", "alice@example.org" → "AL", "Firma" → "FI" */
export function defaultShort(label) {
  const words = String(label || '?').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  const s = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2);
  return s.toUpperCase();
}

function normalizeShort(s, label) {
  const v = String(s ?? '').trim().toUpperCase().slice(0, 3);
  return v || defaultShort(label);
}

function nextHue(accounts) {
  const used = new Set(accounts.map((a) => a.hue));
  return ACCOUNT_HUES.find((h) => !used.has(h)) ?? ACCOUNT_HUES[accounts.length % ACCOUNT_HUES.length];
}

export async function listAccounts() {
  const { [ACCOUNTS_KEY]: accounts = [] } = await ext.storage.local.get(ACCOUNTS_KEY);
  // Fill defaults for accounts created before colors/short codes existed.
  let changed = false;
  for (const a of accounts) {
    if (a.hue == null) { a.hue = nextHue(accounts.filter((x) => x.hue != null)); changed = true; }
    if (!a.short) { a.short = defaultShort(a.label); changed = true; }
  }
  if (changed) await saveAccounts(accounts);
  return accounts;
}

async function saveAccounts(accounts) {
  await ext.storage.local.set({ [ACCOUNTS_KEY]: accounts });
}

export async function getAccount(id) {
  const a = (await listAccounts()).find((x) => x.id === id);
  if (!a) throw new Error(t('Konto nicht gefunden'));
  return a;
}

export async function addAccount(provider, config, { label, short, hue } = {}) {
  const accounts = await listAccounts();
  const l = label || config.email || provider;
  const account = {
    id: crypto.randomUUID(), provider, label: l, config,
    short: normalizeShort(short, l),
    hue: Number.isFinite(hue) ? hue : nextHue(accounts),
  };
  accounts.push(account);
  await saveAccounts(accounts);
  return account;
}

/**
 * Update display settings and/or config. Returns true when connection-relevant
 * config changed (caller must lock the account).
 */
export async function updateAccount(id, { label, short, hue, config }) {
  const accounts = await listAccounts();
  const a = accounts.find((x) => x.id === id);
  if (!a) throw new Error(t('Konto nicht gefunden'));
  if (label != null) a.label = label || a.label;
  if (short != null) a.short = normalizeShort(short, a.label);
  if (Number.isFinite(hue)) a.hue = ((Math.round(hue) % 360) + 360) % 360;
  let connectionChanged = false;
  if (config) {
    for (const [k, v] of Object.entries(config)) {
      if (a.config[k] !== v) { connectionChanged = true; a.config[k] = v; }
    }
  }
  await saveAccounts(accounts);
  return connectionChanged;
}

export async function patchAccountConfig(id, patch) {
  if (!patch) return;
  const accounts = await listAccounts();
  const a = accounts.find((x) => x.id === id);
  if (!a) return;
  a.config = { ...a.config, ...patch };
  await saveAccounts(accounts);
}

export async function removeAccount(id) {
  await saveAccounts((await listAccounts()).filter((a) => a.id !== id));
  await clearSession(id);
}

export async function getSession(id) {
  const k = sessionKey(id);
  return (await ext.storage.session.get(k))[k] ?? null;
}

export async function setSession(id, session) {
  await ext.storage.session.set({ [sessionKey(id)]: session });
}

export async function clearSession(id) {
  await ext.storage.session.remove(sessionKey(id));
}
