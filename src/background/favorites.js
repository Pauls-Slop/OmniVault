// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Favorites for providers that have none of their own (pass, 1Password CLI, LastPass CLI, Proton Pass CLI):
// OmniVault keeps them itself, per account, in storage.local (item ids only, no secrets).
import { ext } from '../lib/browser.js';

const KEY = 'localFavorites';

export const usesLocalFavorites = (provider) => provider?.capabilities?.favorites === false;

async function load() {
  const { [KEY]: all = {} } = await ext.storage.local.get(KEY);
  return all;
}

export async function localFavorites(accountId) {
  return new Set((await load())[accountId] ?? []);
}

export async function setLocalFavorite(accountId, itemId, on) {
  const all = await load();
  const set = new Set(all[accountId] ?? []);
  if (on) set.add(itemId); else set.delete(itemId);
  all[accountId] = [...set];
  await ext.storage.local.set({ [KEY]: all });
}

export async function forgetLocalFavorites(accountId) {
  const all = await load();
  delete all[accountId];
  await ext.storage.local.set({ [KEY]: all });
}

/** Marks the synced items of such a provider with the favorites kept by OmniVault. */
export async function applyLocalFavorites(provider, accountId, items) {
  if (!usesLocalFavorites(provider)) return;
  const favs = await localFavorites(accountId);
  for (const i of items) i.favorite = favs.has(i.id);
}

/**
 * The write operations of a provider; for providers without favorites, the favorite flag is stored locally
 * instead of being sent (copy, move, import and mirror rules all write through this).
 */
export function writer(provider, accountId) {
  if (!usesLocalFavorites(provider)) return provider;
  const pass = (name) => provider[name] && ((...args) => provider[name](...args));
  return {
    label: provider.label,
    capabilities: provider.capabilities,
    createFolder: pass('createFolder'),
    restoreItem: pass('restoreItem'),
    purgeItem: pass('purgeItem'),
    async saveItem(config, session, existing, data) {
      const res = await provider.saveItem(config, session, existing, data);
      if (res?.item) {
        if (existing && existing.id !== res.item.id) await setLocalFavorite(accountId, existing.id, false);
        await setLocalFavorite(accountId, res.item.id, !!data.favorite);
        res.item.favorite = !!data.favorite;
      }
      return res;
    },
    async deleteItem(config, session, existing) {
      const res = await provider.deleteItem(config, session, existing);
      await setLocalFavorite(accountId, existing.id, false);
      return res;
    },
    async setFavorite(config, session, existing, favorite) {
      await setLocalFavorite(accountId, existing.id, favorite);
      return { item: { ...existing, favorite: !!favorite } };
    },
  };
}
