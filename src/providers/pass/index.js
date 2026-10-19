// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// pass (zx2c4 password-store) provider. OmniVault talks to the user's local `pass` + gpg through the
// OmniVault native host (native/omnivault_host.py, backend "pass"). Each entry is a gpg-encrypted file; its first line is
// the password, the rest is freeform metadata (login:/url:/otpauth://…).
import { mark, t } from '../../i18n/index.js';
import { CliProvider, virtualFolder } from '../native-host.js';
import { ProviderError } from '../provider.js';

class PassProvider extends CliProvider {
  static backend = 'pass';
  static id = 'pass';
  static label = 'pass (password-store)';
  static note = mark('Über das lokale „pass“ (zx2c4 password-store) mit gpg und den OmniVault-Host (native/README.md).');
  static capabilities = { write: true, types: ['login'], favorites: false, folderLabel: 'Ordner', trash: false, moveFolder: true, fields: true, createFolder: true };

  static async login() {
    const st = await this.call('status');
    if (!st.gpg) throw new ProviderError(t('gpg wurde nicht gefunden. Bitte GnuPG installieren.'), 'config');
    if (!st.cli) throw new ProviderError(t('„pass“ wurde nicht gefunden. Bitte password-store installieren.'), 'config');
    if (!st.initialized) throw new ProviderError(t('Kein pass-Speicher gefunden. Bitte zuerst „pass init <gpg-id>“ ausführen.'), 'config');
    return { status: 'ok', session: { connected: true, store: st.store ?? null } };
  }

  static #map(e) {
    return {
      id: e.id, accountId: undefined, provider: 'pass', type: 'login',
      name: e.name || e.id, username: e.username || undefined, uris: e.uris ?? [],
      password: e.password || undefined, totp: e.totp || undefined, notes: e.notes || undefined, fields: e.fields ?? [],
      folderId: e.folder ?? null, folder: e.folder ?? undefined, favorite: false,
      canEdit: true, canDelete: true,
    };
  }

  static async sync(config) {
    const { items } = await this.call('list');
    const folders = new Set();
    const mapped = items.map((e) => { const m = this.#map(e); m.accountId = config.id; if (m.folder) folders.add(m.folder); return m; });
    return {
      items: mapped,
      folders: [...folders].sort().map((f) => ({ id: f, name: f })),
    };
  }

  static async reveal() { return {}; } // sync already returns full entries

  /** A folder in pass is a directory; it exists as soon as an entry is saved into it. */
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
      return { item: { ...this.#map({ ...payload, id }), accountId: config.id } };
    }
    // moving to another folder = new path: create at the target, then remove the old entry
    const targetFolder = data.folderId ?? existing.folderId ?? null;
    if ((targetFolder ?? '') !== (existing.folderId ?? '')) {
      const { id } = await this.call('create', payload);
      await this.call('delete', { id: existing.id });
      return { item: { ...this.#map({ ...payload, id }), accountId: config.id }, deletedId: existing.id };
    }
    await this.call('update', { ...payload, id: existing.id });
    return { item: { ...this.#map({ ...payload, id: existing.id }), accountId: config.id } };
  }

}

export default PassProvider;
