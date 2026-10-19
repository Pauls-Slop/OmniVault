// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// User settings (storage.local) with defaults.
import { LANGUAGES, PSEUDO } from '../i18n/index.js';
import { ext } from '../lib/browser.js';

export const DEFAULT_SETTINGS = {
  autoLockMinutes: 15, // 0 = never (still locked when the browser closes)
  lockOnSystemLock: true, // lock when the OS screen locks (idle API)
  clipboardSeconds: 30, // 0 = do not clear
  actionOpens: 'popup', // 'popup' | 'sidebar': what a click on the toolbar icon opens
  autoSyncMinutes: 0, // 0 = off; otherwise unlocked accounts are re-synced in the background
  inlineMenu: false, // OmniVault button in login fields (needs access to websites)
  offerSave: false, // offer to save / update logins after a form is sent (needs access to websites)
  passkeys: false, // answer passkey requests of websites with passkeys from the vault (needs access to websites)
  language: 'auto', // 'auto' = browser language, otherwise a code from LANGUAGES
  generator: { length: 20, lower: true, upper: true, digits: true, symbols: true, avoidAmbiguous: false },
};

export async function getSettings() {
  const { settings = {} } = await ext.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...settings, generator: { ...DEFAULT_SETTINGS.generator, ...(settings.generator ?? {}) } };
}

// one change at a time: two quick changes (e.g. after a permission prompt) must not overwrite each other
let queue = Promise.resolve();
export function setSettings(patch) {
  const run = queue.then(() => applySettings(patch));
  queue = run.catch(() => {});
  return run;
}

async function applySettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  next.autoLockMinutes = Math.max(0, Math.min(24 * 60, Math.round(Number(next.autoLockMinutes) || 0)));
  next.clipboardSeconds = Math.max(0, Math.min(600, Math.round(Number(next.clipboardSeconds) || 0)));
  next.autoSyncMinutes = Math.max(0, Math.min(24 * 60, Math.round(Number(next.autoSyncMinutes) || 0)));
  if (!['popup', 'sidebar'].includes(next.actionOpens)) next.actionOpens = 'popup';
  next.inlineMenu = !!next.inlineMenu;
  next.offerSave = !!next.offerSave;
  next.passkeys = !!next.passkeys;
  if (next.language !== 'auto' && next.language !== PSEUDO && !LANGUAGES.some((l) => l.code === next.language)) next.language = 'auto';
  await ext.storage.local.set({ settings: next });
  return next;
}
