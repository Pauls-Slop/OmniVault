// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Shared popup state.
import { ext } from '../lib/browser.js';
import { mark } from '../i18n/index.js';
import { call, el, promptText, t, toast } from './ui.js';

/** Folder nouns of the providers ('Ordner', 'Gruppe', 'Tresor') in the interface language. */
const FOLDER_TEXT = {
  Ordner: { noun: mark('Ordner'), none: mark('– kein Ordner –'), create: mark('Neuer Ordner …'), ask: mark('Name des neuen Ordners:') },
  Gruppe: { noun: mark('Gruppe'), none: mark('– keine Gruppe –'), create: mark('Neue Gruppe …'), ask: mark('Name der neuen Gruppe:') },
  Tresor: { noun: mark('Tresor'), none: mark('– kein Tresor –'), create: mark('Neuer Tresor …'), ask: mark('Name des neuen Tresors:') },
};
export const folderText = (label) => {
  const f = FOLDER_TEXT[label] ?? FOLDER_TEXT.Ordner;
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, t(v)]));
};

/** 'popup' (toolbar), 'window' (separate window), 'sidebar' (Chrome side panel / Firefox sidebar). */
export const mode = location.pathname.endsWith('/sidebar.html') ? 'sidebar'
  : new URLSearchParams(location.search).has('window') ? 'window' : 'popup';
/** Persistent, resizable surface (window or sidebar): full-size layout, explicit fill target. */
export const windowed = mode !== 'popup';
export const sidebar = mode === 'sidebar';

export const S = {
  state: { providers: [], accounts: [], settings: {} },
  items: [],
  tab: null,
};

export const providerOf = (id) => S.state.providers.find((p) => p.id === id);
export const accountOf = (id) => S.state.accounts.find((a) => a.id === id);
export const writableAccounts = () => S.state.accounts.filter((a) => a.unlocked && !a.readOnly && providerOf(a.provider)?.capabilities?.write);

const listeners = new Set();
export const onRefresh = (fn) => listeners.add(fn);

export async function refresh() {
  S.state = await call('state');
  S.items = await call('items', { tabUrl: S.tab?.url });
  for (const fn of listeners) fn();
}

/** True when running as the toolbar popup (not as a tab or separate window). */
export async function isToolbarPopup() {
  return !windowed && !(await ext.tabs.getCurrent());
}

/**
 * Folder chooser for one account: a labelled <select> that loads the account's folders. Providers whose
 * folders are vaults ("Tresor") require one; all others offer "– kein Ordner –". Hidden when there are none.
 */
export function folderPicker(attrs = { name: 'folder' }) {
  const NEW = '__new';
  const select = el('select', attrs);
  const label = el('label', {}, t('Ordner'), select);
  let accountId = null;
  let previous = '';
  let noun = 'Ordner';
  const picker = {
    select,
    label,
    /** Loads the folders of `accountId`; `value` preselects one, otherwise the default for the provider. */
    async load(id, value) {
      accountId = id;
      const caps = providerOf(accountOf(id)?.provider)?.capabilities ?? {};
      const folders = await call('folders', { accountId: id }).catch(() => []);
      const required = caps.folderLabel === 'Tresor';
      noun = caps.folderLabel ?? 'Ordner';
      const text = folderText(noun);
      select.replaceChildren(...(required ? [] : [el('option', { value: '' }, text.none)]),
        ...folders.map((f) => el('option', { value: f.id }, f.name)),
        caps.createFolder ? el('option', { value: NEW }, text.create) : null);
      select.value = value ?? (required ? folders[0]?.id ?? '' : '');
      previous = select.value;
      label.firstChild.textContent = text.noun;
      label.hidden = !folders.length && !caps.createFolder;
      return { folders, required };
    },
  };
  // "New folder …": ask for a name, create it in the account and select it
  select.addEventListener('change', async (e) => {
    if (select.value !== NEW) { previous = select.value; return; }
    e.stopImmediatePropagation();
    const name = await promptText(folderText(noun).ask, { ok: t('Anlegen'), placeholder: t('z. B. Arbeit') });
    if (!name) { select.value = previous; return; }
    try {
      const folder = await call('createFolder', { accountId, name });
      await picker.load(accountId, folder.id);
      select.dispatchEvent(new Event('change'));
    } catch (x) {
      select.value = previous;
      toast(x.message);
    }
  });
  return picker;
}
