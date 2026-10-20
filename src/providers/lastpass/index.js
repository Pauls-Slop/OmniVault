// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// LastPass provider via the official `lpass` CLI and the OmniVault CLI host. Listing (lpass ls) holds no
// secrets; each secret is fetched on demand (lpass show --json). Writes feed `lpass add/edit` over stdin.
import { mark, t } from '../../i18n/index.js';
import { CliProvider, virtualFolder } from '../native-host.js';
import { ProviderError } from '../provider.js';

class LastPassProvider extends CliProvider {
  static backend = 'lastpass';
  static id = 'lastpass';
  static label = 'LastPass';
  static note = mark('Über das offizielle LastPass-CLI (lpass) und den OmniVault-Host (native/README.md). Voraussetzung: lpass installiert und mit „lpass login“ angemeldet.');
  static capabilities = { write: true, types: ['login', 'note'], favorites: false, folderLabel: 'Gruppe', moveFolder: true, createFolder: true, attachments: true };
  static async login() {
    const st = await this.call('status');
    if (!st.cli) throw new ProviderError(t('lpass (LastPass CLI) wurde nicht gefunden.'), 'config');
    if (!st.loggedIn) throw new ProviderError(t('LastPass: nicht angemeldet. Bitte „lpass login <E-Mail>“ ausführen.'), 'bad_password');
    return { status: 'ok', session: { connected: true } };
  }

  static async sync(config) {
    const { items } = await this.call('list');
    const folders = new Set();
    const mapped = items.map((e) => {
      if (e.folder) folders.add(e.folder);
      return {
        id: e.id, accountId: config.id, provider: 'lastpass', type: 'login',
        name: e.name || '', username: e.username || undefined, uris: e.uris ?? [],
        folderId: e.folder ?? null, folder: e.folder ?? undefined, favorite: false,
        canEdit: true, canDelete: true, lazy: true, hasPassword: true, hasTotp: false,
      };
    });
    return { items: mapped, folders: [...folders].sort().map((f) => ({ id: f, name: f })) };
  }

  /** A LastPass group exists as soon as an entry is saved into it ("Gruppe/Name"). */
  static async createFolder(config, session, { name }) {
    return { folder: virtualFolder(name) };
  }

  static async reveal(config, session, item) {
    const r = await this.call('reveal', { id: item.id });
    const out = { notes: r.notes || undefined, fields: [] };
    if (r.revision) out._revision = r.revision; // what an edit must still find (conflict check in the host)
    if (r.password !== undefined) out.password = r.password;
    if (r.username) out.username = r.username;
    if (r.uris) out.uris = r.uris;
    out.type = r.type === 'note' ? 'note' : 'login';
    if (r.attachments?.length) out.attachments = r.attachments;
    return out;
  }

  static async saveItem(config, session, existing, data) {
    const payload = {
      name: data.name, username: data.username, password: data.password,
      uris: data.uris ?? [], notes: data.notes, folder: data.folderId || null,
    };
    if (!existing) {
      await this.call('create', payload);
      return { item: this.#local(config, null, data), resync: true }; // lpass add prints no id
    }
    const { revision } = await this.call('update', { ...payload, id: existing.id, revision: existing._revision });
    // a group change in lpass is done by renaming to "Group/Name"; re-sync to get the new grouping
    const folderChanged = (data.folderId ?? null) !== (existing.folderId ?? null);
    return { item: { ...existing, ...this.#local(config, existing.id, data), _revision: revision ?? undefined }, resync: folderChanged };
  }

  static #local(config, id, data) {
    return {
      id, accountId: config.id, provider: 'lastpass', type: 'login', name: data.name,
      username: data.username || undefined, uris: data.uris ?? [], notes: data.notes || undefined,
      password: data.password, folderId: data.folderId ?? null, favorite: false,
      canEdit: true, canDelete: true, lazy: true, revealed: true, hasPassword: !!data.password, hasTotp: false, fields: [],
    };
  }

}

export default LastPassProvider;
