// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// gopass provider. OmniVault talks to the user's local `gopass` + gpg through the OmniVault native host
// (native/omnivault_host.py, backend "gopass"). Entries use the pass format (first line = password, then login:/url:/
// otpauth://… and free text); mounted sub-stores show up as top-level folders.
import { mark, t } from '../../i18n/index.js';
import { CliProvider, virtualFolder } from '../native-host.js';
import { ProviderError } from '../provider.js';

class GopassProvider extends CliProvider {
  static backend = 'gopass';
  static id = 'gopass';
  static label = 'gopass';
  static note = mark('Über das lokale „gopass“ mit gpg und den OmniVault-Host (native/README.md). Eingehängte Speicher erscheinen als Ordner.');
  static capabilities = { write: true, types: ['login'], favorites: false, folderLabel: 'Ordner', trash: false, moveFolder: true, fields: true, createFolder: true };

  static async login() {
    const st = await this.call('status');
    if (!st.cli) throw new ProviderError(t('„gopass“ wurde nicht gefunden. Bitte gopass installieren.'), 'config');
    if (!st.gpg) throw new ProviderError(t('gpg wurde nicht gefunden. Bitte GnuPG installieren.'), 'config');
    if (!st.initialized) throw new ProviderError(t('Kein gopass-Speicher gefunden. Bitte zuerst „gopass setup“ ausführen.'), 'config');
    return { status: 'ok', session: { connected: true } };
  }

  static #map(e, accountId) {
    return {
      id: e.id, accountId, provider: 'gopass', type: 'login',
      name: e.name || e.id, username: e.username || undefined, uris: e.uris ?? [],
      password: e.password || undefined, totp: e.totp || undefined, notes: e.notes || undefined, fields: e.fields ?? [],
      folderId: e.folder ?? null, folder: e.folder ?? undefined, favorite: false,
      canEdit: true, canDelete: true,
    };
  }

  static async sync(config) {
    const { items, mounts = [] } = await this.call('list');
    const folders = new Set(mounts);
    const mapped = items.map((e) => { const m = this.#map(e, config.id); if (m.folder) folders.add(m.folder); return m; });
    return { items: mapped, folders: [...folders].sort().map((f) => ({ id: f, name: f })) };
  }

  static async reveal() { return {}; } // sync already returns full entries

  /** A folder is a directory; it exists as soon as an entry is saved into it. */
  static async createFolder(config, session, { name }) {
    return { folder: virtualFolder(name) };
  }

  static async saveItem(config, session, existing, data) {
    const payload = {
      name: data.name, username: data.username, password: data.password,
      uris: data.uris ?? [], totp: data.totp, notes: data.notes, fields: data.fields ?? [],
      folder: data.folderId || null,
    };
    if (!existing) {
      const { id } = await this.call('create', payload);
      return { item: this.#map({ ...payload, id }, config.id) };
    }
    // another folder or name = another path: `gopass mv` (also across mounts), then write the new content
    let id = existing.id;
    const targetFolder = data.folderId !== undefined ? data.folderId : existing.folderId ?? null;
    const renamed = (data.name ?? existing.name) !== existing.name;
    if ((targetFolder ?? '') !== (existing.folderId ?? '') || renamed) {
      ({ id } = await this.call('move', { id, name: data.name ?? existing.name, folder: targetFolder }));
    }
    await this.call('update', { ...payload, folder: targetFolder, id });
    const item = this.#map({ ...payload, folder: targetFolder, id }, config.id);
    return { item, deletedId: id !== existing.id ? existing.id : undefined };
  }
}

export default GopassProvider;
