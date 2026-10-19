// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// 1Password provider via the official `op` CLI and the OmniVault CLI host. Listing holds no secrets; each
// secret is fetched on demand. Writes pipe a JSON item to `op item create -` / `op item edit`, never argv.
// Vaults are shown as folders; moving an item between vaults gives it a new id (op item move).
import { mark, t } from '../../i18n/index.js';
import { CliProvider } from '../native-host.js';
import { ProviderError } from '../provider.js';

class OnePasswordProvider extends CliProvider {
  static backend = 'onepassword';
  static id = 'onepassword';
  static label = '1Password';
  static note = mark('Über das offizielle 1Password-CLI (op) und den OmniVault-Host (native/README.md). Voraussetzung: op installiert und angemeldet.');
  static capabilities = {
    write: true, types: ['login', 'note'], editTotp: true, fields: true, trash: true,
    folderLabel: 'Tresor', moveFolder: true, createFolder: true,
  };

  static async login() {
    const st = await this.call('status');
    if (!st.cli) throw new ProviderError(t('op (1Password CLI) wurde nicht gefunden.'), 'config');
    if (!st.loggedIn) throw new ProviderError(t('1Password: nicht angemeldet. Bitte „op signin“ ausführen.'), 'bad_password');
    return { status: 'ok', configPatch: st.email ? { email: st.email } : undefined, session: { connected: true } };
  }

  static async sync(config) {
    const { items, vaults = [] } = await this.call('list');
    return {
      items: items.map((e) => ({
        id: e.id, accountId: config.id, provider: 'onepassword', type: e.type,
        name: e.name || '', username: e.username || undefined, uris: e.uris ?? [],
        folderId: e.vaultId ?? null, folder: e.vault || undefined, favorite: !!e.favorite,
        canEdit: ['login', 'note'].includes(e.type), canDelete: true, lazy: true, hasPassword: e.type === 'login', hasTotp: !!e.hasTotp,
        _revision: e.revision ?? undefined,
      })),
      folders: vaults.map((v) => ({ id: v.id, name: v.name })).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    };
  }

  static async reveal(config, session, item) {
    const r = await this.call('reveal', { id: item.id });
    const out = { notes: r.notes || undefined, fields: r.fields ?? [] };
    if (r.revision) out._revision = r.revision; // what an edit must still find (conflict check in the host)
    if (item.type === 'login') out.password = r.password;
    if (r.username) out.username = r.username;
    if (r.totp) out.totp = r.totp;
    if (r.uris?.length) out.uris = r.uris;
    if (r.card) {
      out.card = r.card;
      out.subtitle = [r.card.brand, r.card.number ? `*${String(r.card.number).slice(-4)}` : ''].filter(Boolean).join(' ');
    }
    if (r.identity) out.identity = r.identity;
    return out;
  }

  static async saveItem(config, session, existing, data) {
    const payload = {
      type: data.type, name: data.name, username: data.username, password: data.password,
      totp: data.totp, uris: data.uris ?? [], notes: data.notes, fields: data.fields,
      vaultId: data.folderId || undefined, favorite: data.favorite,
    };
    if (!existing) {
      const { id, revision } = await this.call('create', payload);
      if (!id) return { item: this.#local(config, null, data), resync: true };
      return { item: { ...this.#local(config, id, data), _revision: revision ?? undefined } };
    }
    const { id, revision } = await this.call('update', { ...payload, id: existing.id, revision: existing._revision });
    const item = { ...existing, ...this.#local(config, id ?? existing.id, data), _revision: revision ?? undefined };
    // a vault change is a move: 1Password gives the item a new id
    return id && id !== existing.id ? { item, deletedId: existing.id, resync: true } : { item };
  }

  static async setFavorite(config, session, existing, favorite) {
    const { revision } = await this.call('favorite', { id: existing.id, favorite: !!favorite });
    return { item: { ...existing, favorite: !!favorite, _revision: revision ?? existing._revision } };
  }

  static async createFolder(config, session, { name }) {
    const v = await this.call('vault_create', { name });
    if (!v.id) throw new ProviderError(t('1Password hat keinen Tresor angelegt'), 'server');
    return { folder: { id: v.id, name: v.name } };
  }

  static #local(config, id, data) {
    return {
      id, accountId: config.id, provider: 'onepassword', type: data.type, name: data.name,
      username: data.type === 'login' ? data.username || undefined : undefined,
      uris: data.type === 'login' ? data.uris ?? [] : [], notes: data.notes || undefined,
      password: data.type === 'login' ? data.password : undefined, totp: data.totp || undefined,
      folderId: data.folderId ?? null, favorite: !!data.favorite, canEdit: true, canDelete: true, lazy: true, revealed: true,
      hasPassword: data.type === 'login' && !!data.password, hasTotp: !!data.totp, fields: data.fields ?? [],
    };
  }
}

export default OnePasswordProvider;
