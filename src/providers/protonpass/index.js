// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Proton Pass provider. Proton offers no public API; OmniVault talks to the official Proton Pass CLI
// (`pass-cli`, installed and logged in by the user) through the OmniVault native host
// (native/omnivault_host.py, backend "proton"). Listing returns non-secret fields only; secrets are fetched on demand.
import { mark, t } from '../../i18n/index.js';
import { CliProvider } from '../native-host.js';
import { ProviderError } from '../provider.js';

const splitId = (id) => {
  const i = id.indexOf('/');
  return { shareId: id.slice(0, i), itemId: id.slice(i + 1) };
};

class ProtonPassProvider extends CliProvider {
  static backend = 'proton';
  static id = 'protonpass';
  static label = 'Proton Pass';
  static note = mark('Über das offizielle Proton Pass CLI (pass-cli). Voraussetzung: pass-cli installiert, im Terminal mit „pass-cli login“ angemeldet und der OmniVault-Host eingerichtet (native/README.md). Proton gibt pass-cli derzeit nur für kostenpflichtige Tarife frei.');
  static capabilities = { write: true, types: ['login', 'note'], favorites: false, editTotp: false, folderLabel: 'Tresor', trash: true, moveFolder: true, attachments: true };

  /** Proton items are addressed by vault (share) and item id. */
  static ref(item) { return splitId(item.id); }

  static async login() {
    const st = await this.call('status');
    if (!st.cli) throw new ProviderError(t('pass-cli wurde nicht gefunden. Bitte das offizielle Proton Pass CLI installieren.'), 'config');
    if (!st.loggedIn) throw new ProviderError(t('Proton Pass: nicht angemeldet. Bitte im Terminal „pass-cli login“ ausführen und erneut verbinden.'), 'bad_password');
    return { status: 'ok', configPatch: st.email ? { email: st.email } : undefined, session: { connected: true, email: st.email ?? null } };
  }

  static async sync(config) {
    const { items, vaults } = await this.call('list');
    return {
      items: items.map((e) => ({
        id: `${e.shareId}/${e.itemId}`, accountId: config.id, provider: 'protonpass', type: e.type,
        name: e.title ?? '', username: e.username ?? undefined, uris: e.urls ?? [], subtitle: e.subtitle ?? undefined,
        folderId: e.shareId, folder: e.vault ?? undefined, favorite: false, canEdit: ['login', 'note'].includes(e.type),
        revisionDate: e.modifyTime ? `${e.modifyTime}Z` : undefined, _revision: e.modifyTime ?? undefined,
        passkeys: e.passkeys?.length ? e.passkeys : undefined,
        lazy: true, hasPassword: !!e.hasPassword, hasTotp: !!e.hasTotp,
      })),
      folders: vaults.map((v) => ({ id: v.shareId, name: v.name })),
    };
  }

  static async reveal(config, session, item) {
    const r = await this.call('reveal', this.ref(item));
    const out = { notes: r.note || undefined, fields: (r.fields ?? []).map((f) => ({ ...f, type: f.type === 'totp' ? 'hidden' : f.type })) };
    if (r.revision) out._revision = r.revision; // what an edit must still find (conflict check in the host)
    if (r.password !== undefined) out.password = r.password;
    if (r.totp) out.totp = r.totp;
    if (r.card) out.card = r.card;
    if (r.identity) out.identity = r.identity;
    if (r.ssh) out.ssh = r.ssh;
    if (r.attachments?.length) out.attachments = r.attachments;
    return out;
  }

  static async saveItem(config, session, existing, data) {
    if (!existing) {
      const shareId = data.folderId || (await this.sync(config)).folders[0]?.id;
      if (!shareId) throw new ProviderError(t('Kein Proton-Pass-Tresor gefunden'), 'config');
      const { itemId } = await this.call('create', {
        shareId, type: data.type, title: data.name, username: data.username, password: data.password,
        urls: data.uris, totp: data.totp, note: data.notes,
      });
      if (!itemId) throw new ProviderError(t('Eintrag angelegt, aber pass-cli lieferte keine ID – bitte synchronisieren'), 'server');
      return { item: this.#local(config, `${shareId}/${itemId}`, data, shareId) };
    }
    const { shareId, itemId } = splitId(existing.id);
    const toShare = data.folderId ?? shareId;
    if ((data.totp ?? '') !== (existing.totp ?? '') && data.type === 'login') {
      throw new ProviderError(t('Einmalcodes (TOTP) lassen sich über pass-cli nicht ändern – bitte in einer Proton-Pass-App ändern'), 'unsupported');
    }
    const fields = {};
    if (data.name !== existing.name) fields.title = data.name;
    if ((data.notes ?? '') !== (existing.notes ?? '')) fields.note = data.notes ?? '';
    if (data.type === 'login') {
      if ((data.username ?? '') !== (existing.username ?? '')) fields.username = data.username ?? '';
      if ((data.password ?? '') !== (existing.password ?? '')) fields.password = data.password ?? '';
      if ((data.uris?.[0] ?? '') !== (existing.uris?.[0] ?? '')) fields.url = data.uris?.[0] ?? '';
    }
    const { revision } = await this.call('update', { shareId, itemId, fields, revision: existing._revision });
    const local = {
      ...existing, ...this.#local(config, existing.id, { ...data, uris: data.uris?.length ? [data.uris[0], ...(existing.uris ?? []).slice(1)] : [] }, shareId),
      folder: existing.folder, _revision: revision ?? undefined, revisionDate: revision ? `${revision}Z` : existing.revisionDate,
    };
    if (toShare === shareId) return { item: local };
    // other vault: `pass-cli item move` (≥ 2.3) keeps passkeys, attachments and history
    const moved = await this.call('move', { shareId, itemId, toShareId: toShare });
    if (!moved.itemId) return { deletedId: existing.id, resync: true };
    return { item: { ...local, id: `${toShare}/${moved.itemId}`, folderId: toShare, folder: undefined, _revision: undefined }, deletedId: existing.id };
  }

  static #local(config, id, data, shareId) {
    return {
      id, accountId: config.id, provider: 'protonpass', type: data.type, name: data.name,
      username: data.type === 'login' ? data.username || undefined : undefined, uris: data.type === 'login' ? data.uris ?? [] : [],
      notes: data.notes || undefined, password: data.type === 'login' ? data.password : undefined, totp: data.totp || undefined,
      folderId: shareId, favorite: false, canEdit: true, lazy: true, revealed: true,
      hasPassword: data.type === 'login' && !!data.password, hasTotp: !!data.totp, fields: [],
    };
  }

}

export default ProtonPassProvider;
