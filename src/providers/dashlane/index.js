// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Dashlane provider via the official Dashlane CLI `dcli` and the OmniVault host, read only: dcli itself can only read
// the vault. The host drops passwords, notes and OTP secrets from the listing; each one is fetched on demand.
// Logins come from `dcli password`, secure notes from `dcli note`, Dashlane "secrets" from `dcli secret` (as notes).
import { mark, t } from '../../i18n/index.js';
import { CliProvider } from '../native-host.js';
import { ProviderError } from '../provider.js';

class DashlaneProvider extends CliProvider {
  static backend = 'dashlane';
  static id = 'dashlane';
  static label = 'Dashlane';
  static note = mark('Nur lesen, über das offizielle Dashlane-CLI (dcli) und den OmniVault-Host (native/README.md). Voraussetzung: dcli installiert (Release-Datei von github.com/Dashlane/dashlane-cli oder „brew install dashlane/tap/dashlane-cli“) und einmal im Terminal mit „dcli sync“ angemeldet; das Master-Passwort muss dcli gespeichert haben (Standard).');
  static capabilities = { write: false, types: ['login', 'note'], favorites: false, attachments: false };

  static async login() {
    const st = await this.call('status');
    if (!st.cli) throw new ProviderError(t('dcli (Dashlane CLI) wurde nicht gefunden.'), 'config');
    if (!st.loggedIn) throw new ProviderError(t('Dashlane: nicht angemeldet. Bitte im Terminal „dcli sync“ ausführen.'), 'bad_password');
    if (st.locked) throw new ProviderError(t('Dashlane: Der Tresor ist gesperrt. Bitte im Terminal „dcli sync“ ausführen; das Master-Passwort muss gespeichert sein (dcli configure save-master-password true).'), 'bad_password');
    return { status: 'ok', configPatch: st.email ? { email: st.email } : undefined, session: { connected: true } };
  }

  /** The host needs the kind to know which dcli command holds the entry. */
  static ref(item) { return { id: item.id, kind: item._kind ?? (item.type === 'note' ? 'note' : 'login') }; }

  static async sync(config) {
    const { items } = await this.call('list');
    return {
      items: items.map((e) => ({
        id: e.id, accountId: config.id, provider: 'dashlane', type: e.type === 'note' ? 'note' : 'login', _kind: e.kind,
        name: e.name || '', username: e.username || undefined, uris: e.uris ?? [],
        folderId: null, favorite: false, canEdit: false, canDelete: false,
        lazy: true, hasPassword: e.type !== 'note', hasTotp: !!e.hasTotp,
      })),
      folders: [],
      readOnly: true,
    };
  }

  static async reveal(config, session, item) {
    const r = await this.call('reveal', this.ref(item));
    const out = { notes: r.notes || undefined, fields: (r.fields ?? []).map((f) => ({ name: f.name, value: f.value, type: 'text' })) };
    if (r.type !== 'note') {
      out.password = r.password ?? '';
      if (r.username) out.username = r.username;
      if (r.uris?.length) out.uris = r.uris;
      if (r.totp) out.totp = r.totp;
    }
    return out;
  }

  static async saveItem() { throw new ProviderError(t('Dashlane: Das CLI kann nur lesen. Bitte in der Dashlane-App ändern.'), 'unsupported'); }
  static async deleteItem() { throw new ProviderError(t('Dashlane: Das CLI kann nur lesen. Bitte in der Dashlane-App ändern.'), 'unsupported'); }
}

export default DashlaneProvider;
