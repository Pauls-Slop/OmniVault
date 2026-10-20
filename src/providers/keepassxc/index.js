// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// KeePassXC provider via KeePassXC's own browser protocol (keepassxc-browser/keepassxc-protocol.md), spoken over
// native messaging to the official `keepassxc-proxy` under OmniVault's own host name (native/install.py
// --keepassxc). Messages are encrypted with a NaCl box (TweetNaCl.js, vendor/tweetnacl.mjs). OmniVault is
// associated once (the user confirms in KeePassXC and names the connection); KeePassXC keeps the public
// identification key, OmniVault keeps the connection name and that key.
//
// What the protocol allows: list entries (title, URL, UUID) when "list all entries" is allowed in KeePassXC,
// user name and password per entry through its URL (KeePassXC may ask for access), the current TOTP code,
// create and update logins (KeePassXC names new entries after the site), groups, delete (KeePassXC asks).
import nacl from '../../../vendor/tweetnacl.mjs';
import { mark, t } from '../../i18n/index.js';
import { b64, fromB64, fromUtf8, utf8 } from '../../lib/bytes.js';
import { ext } from '../../lib/browser.js';
import { Provider, ProviderError } from '../provider.js';

export const KPXC_HOST = 'org.omnivault.keepassxc';

/** KeePassXC error codes (src/browser/BrowserMessageBuilder.h) → message and OmniVault error code. */
const ERRORS = {
  1: [mark('KeePassXC: Die Datenbank ist gesperrt. Bitte in KeePassXC entsperren.'), 'locked'],
  3: [mark('KeePassXC hat die Verbindung nicht angenommen.'), 'host'],
  4: [mark('KeePassXC konnte die Nachricht nicht entschlüsseln.'), 'crypto'],
  6: [mark('In KeePassXC abgelehnt oder abgebrochen.'), 'cancelled'],
  8: [mark('KeePassXC kennt diese Verbindung nicht (mehr). Bitte das Konto bearbeiten und neu verbinden.'), 'bad_password'],
  14: [mark('Für KeePassXC braucht ein Login eine Website-Adresse.'), 'config'],
  15: [mark('KeePassXC hat zu dieser Adresse keinen Login herausgegeben.'), 'not_found'],
  16: [mark('KeePassXC hat keine Gruppen geliefert.'), 'not_found'],
  17: [mark('KeePassXC konnte die Gruppe nicht anlegen.'), 'server'],
  18: [mark('Eintrag nicht gefunden'), 'not_found'],
  19: [mark('KeePassXC erlaubt das Auflisten der Einträge nicht. In KeePassXC unter Einstellungen → Browser-Integration → Erweitert die Option „Allow keepassxc-proxy to list all entries …“ einschalten.'), 'config'],
  34: [mark('KeePassXC nimmt keine Feldverweise an.'), 'config'],
};
const errorFrom = (r) => {
  const [text, code] = ERRORS[Number(r.errorCode)] ?? [null, 'host'];
  return new ProviderError(text ? t(text) : t('KeePassXC-Fehler {code}: {message}', { code: r.errorCode, message: r.error ?? '' }), code);
};

/** Native messaging channel to keepassxc-proxy (replaceable in tests). */
export function portChannel() {
  if (!ext?.runtime?.connectNative) throw new ProviderError(t('Native Messaging ist nicht verfügbar'), 'unsupported');
  const port = ext.runtime.connectNative(KPXC_HOST);
  return {
    post: (m) => port.postMessage(m),
    onMessage: (cb) => port.onMessage.addListener(cb),
    onDisconnect: (cb) => port.onDisconnect.addListener(() => cb(ext.runtime.lastError?.message)),
    close: () => port.disconnect(),
  };
}

const increment = (nonce) => {
  const n = nonce.slice();
  for (let i = 0, carry = 1; i < n.length && carry; i++) { const v = n[i] + carry; n[i] = v & 0xff; carry = v >> 8; }
  return n;
};

/** One connection to KeePassXC: key exchange, association state, one request at a time. */
class Connection {
  constructor(channel) {
    this.channel = channel;
    this.keys = nacl.box.keyPair.fromSecretKey(crypto.getRandomValues(new Uint8Array(32)));
    this.clientID = b64(crypto.getRandomValues(new Uint8Array(24)));
    this.hostKey = null;
    this.associatedAs = null;
    this.waiting = null;
    this.queue = Promise.resolve();
    this.closed = false;
    channel.onMessage((m) => {
      // database-locked / database-unlocked are signals, not answers; after either, test the association again
      if (/^database-(un)?locked$/.test(m?.action ?? '')) { this.associatedAs = null; return; }
      if (!this.waiting || m?.action !== this.waiting.action) return;
      const w = this.waiting; this.waiting = null; clearTimeout(w.timer); w.resolve(m);
    });
    channel.onDisconnect((reason) => {
      this.closed = true;
      const hint = /not found|not exist|forbidden|no such/i.test(reason ?? '')
        ? t('Die KeePassXC-Verbindung ist nicht eingerichtet (native/install.py --keepassxc).') : t('Verbindung zu KeePassXC getrennt');
      if (this.waiting) { const w = this.waiting; this.waiting = null; clearTimeout(w.timer); w.reject(new ProviderError(hint, 'host_missing')); }
    });
  }

  /** Sends a raw message and waits for the answer with the same action (requests are serialised). */
  raw(message, timeout = 60_000) {
    const run = () => new Promise((resolve, reject) => {
      if (this.closed) { reject(new ProviderError(t('Verbindung zu KeePassXC getrennt'), 'host_missing')); return; }
      const timer = setTimeout(() => { this.waiting = null; reject(new ProviderError(t('KeePassXC antwortet nicht (Zeitüberschreitung). Wartet KeePassXC auf eine Bestätigung?'), 'timeout')); }, timeout);
      this.waiting = { action: message.action, resolve, reject, timer };
      this.channel.post(message);
    });
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => {});
    return p;
  }

  async exchangeKeys() {
    const nonce = crypto.getRandomValues(new Uint8Array(24));
    const r = await this.raw({ action: 'change-public-keys', publicKey: b64(this.keys.publicKey), nonce: b64(nonce), clientID: this.clientID });
    if (r.errorCode) throw errorFrom(r);
    if (r.nonce !== b64(increment(nonce)) || !r.publicKey) throw new ProviderError(t('KeePassXC hat unerwartet geantwortet.'), 'crypto');
    this.hostKey = fromB64(r.publicKey);
    if (this.hostKey.length !== 32) throw new ProviderError(t('KeePassXC hat unerwartet geantwortet.'), 'crypto');
  }

  /** An encrypted request: {action, ...payload} sealed for KeePassXC, the answer opened and checked. */
  async call(action, payload = {}, timeout) {
    if (!this.hostKey) await this.exchangeKeys();
    const nonce = crypto.getRandomValues(new Uint8Array(24));
    const sealed = nacl.box(utf8(JSON.stringify({ action, ...payload })), nonce, this.hostKey, this.keys.secretKey);
    const r = await this.raw({ action, message: b64(sealed), nonce: b64(nonce), clientID: this.clientID }, timeout);
    if (r.errorCode) throw errorFrom(r);
    // KeePassXC answers with the request's nonce incremented by one; anything else is not an answer to us
    if (r.nonce !== b64(increment(nonce)) || !r.message) throw new ProviderError(t('KeePassXC hat unerwartet geantwortet.'), 'crypto');
    const opened = nacl.box.open(fromB64(r.message), fromB64(r.nonce), this.hostKey, this.keys.secretKey);
    if (!opened) throw new ProviderError(t('KeePassXC konnte die Nachricht nicht entschlüsseln.'), 'crypto');
    const m = JSON.parse(fromUtf8(opened));
    if (m.nonce !== r.nonce) throw new ProviderError(t('KeePassXC hat unerwartet geantwortet.'), 'crypto');
    return m;
  }
}

let shared = null;
const connection = (factory) => {
  if (!shared || shared.closed) shared = new Connection(factory());
  return shared;
};

/** Group tree → folders with path names ("Arbeit/Web"); the root (the database itself) is not a folder. */
function flattenGroups(groups) {
  const roots = Array.isArray(groups) ? groups : Array.isArray(groups?.groups) ? groups.groups : [];
  const out = [];
  const walk = (g, path) => {
    for (const c of g.children ?? []) {
      const name = path ? `${path}/${c.name}` : c.name;
      out.push({ id: c.uuid, name });
      walk(c, name);
    }
  };
  for (const r of roots) walk(r, '');
  return out.sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

class KeePassXCProvider extends Provider {
  static id = 'keepassxc';
  static label = 'KeePassXC';
  static status = 'ready';
  static unlockMode = 'none';
  static optionalPermissions = ['nativeMessaging'];
  static note = mark('Über KeePassXCs Browser-Schnittstelle (keepassxc-proxy). Voraussetzung: KeePassXC läuft mit geöffneter Datenbank, Browser-Integration ist eingeschaltet, unter „Erweitert“ ist das Auflisten aller Einträge erlaubt, und die Verbindung ist eingerichtet (native/README.md). Beim ersten Verbinden fragt KeePassXC nach einem Namen für OmniVault.');
  static configFields = [];
  static capabilities = {
    write: true, types: ['login'], favorites: false, folderLabel: 'Gruppe', createFolder: true, moveFolder: false,
    fields: false, notes: false, totp: false, editTotp: false, name: false, needsUrl: true,
  };
  /** Replaceable in tests: () => channel ({ post, onMessage, onDisconnect, close }). */
  static channel = portChannel;

  static #conn() { return connection(this.channel); }
  static #keys(config) { return [{ id: config.kpxcId, key: config.kpxcKey }]; }

  /** Makes sure the shared connection is associated as this account (KeePassXC remembers one per connection). */
  static async #ready(config) {
    const c = this.#conn();
    if (!config.kpxcId || !config.kpxcKey) throw new ProviderError(t('KeePassXC kennt diese Verbindung nicht (mehr). Bitte das Konto bearbeiten und neu verbinden.'), 'bad_password');
    if (c.associatedAs !== config.kpxcId) {
      await c.call('test-associate', { id: config.kpxcId, key: config.kpxcKey });
      c.associatedAs = config.kpxcId;
    }
    return c;
  }

  /** Connect: test the stored association, or associate anew (the user confirms in KeePassXC). */
  static async login(config) {
    const c = this.#conn();
    if (config.kpxcId && config.kpxcKey) {
      try {
        await c.call('test-associate', { id: config.kpxcId, key: config.kpxcKey });
        c.associatedAs = config.kpxcId;
        return { status: 'ok', session: { connected: true } };
      } catch (e) {
        if (e.code !== 'bad_password') throw e; // KeePassXC forgot us: associate again below
      }
    }
    const idKey = nacl.box.keyPair.fromSecretKey(crypto.getRandomValues(new Uint8Array(32)));
    const r = await c.call('associate', { key: b64(c.keys.publicKey), idKey: b64(idKey.publicKey) }, 300_000);
    if (!r.id) throw new ProviderError(t('In KeePassXC abgelehnt oder abgebrochen.'), 'cancelled');
    c.associatedAs = r.id;
    return { status: 'ok', configPatch: { kpxcId: r.id, kpxcKey: b64(idKey.publicKey) }, session: { connected: true } };
  }

  static async sync(config) {
    const c = await this.#ready(config);
    const { entries = [] } = await c.call('get-database-entries');
    const folders = await c.call('get-database-groups').then((r) => flattenGroups(r.groups)).catch(() => []);
    return {
      items: entries.map((e) => ({
        id: e.uuid, accountId: config.id, provider: 'keepassxc', type: 'login', name: e.title ?? '',
        uris: e.url ? [e.url] : [], folderId: null, favorite: false, lazy: true, hasPassword: true, hasTotp: false,
        canEdit: !!e.url, canDelete: true,
      })),
      folders,
    };
  }

  /** User name and password come through get-logins for the entry's URL (KeePassXC may ask the user first). */
  static async reveal(config, session, item) {
    if (!item.uris?.[0]) throw new ProviderError(t('KeePassXC gibt Einträge ohne Website-Adresse nicht an Browser-Erweiterungen heraus.'), 'unsupported');
    const c = await this.#ready(config);
    const r = await c.call('get-logins', { url: item.uris[0], keys: this.#keys(config) }, 300_000);
    const e = (r.entries ?? []).find((x) => x.uuid === item.id);
    if (!e) throw new ProviderError(t('KeePassXC hat zu dieser Adresse keinen Login herausgegeben.'), 'not_found');
    return { username: e.login || undefined, password: e.password ?? '', hasTotp: !!e.totp, folder: e.group || undefined };
  }

  /** KeePassXC hands out the current code, never the TOTP secret. */
  static async currentTotp(config, session, item) {
    const c = await this.#ready(config);
    const { totp } = await c.call('get-totp', { uuid: item.id });
    if (!totp) return null;
    return { code: String(totp), remaining: 30 - (Math.floor(Date.now() / 1000) % 30) };
  }

  static async saveItem(config, session, existing, data) {
    const url = data.uris?.[0] || existing?.uris?.[0];
    if (!url) throw new ProviderError(t('Für KeePassXC braucht ein Login eine Website-Adresse.'), 'config');
    const c = await this.#ready(config);
    const r = await c.call('set-login', {
      url, submitUrl: url, id: config.kpxcId, login: data.username ?? '', password: data.password ?? '',
      ...(existing ? { uuid: existing.id } : { groupUuid: data.folderId || undefined }),
    }, 300_000);
    if (r.error && r.error !== 'success') throw new ProviderError(t('In KeePassXC abgelehnt oder abgebrochen.'), 'cancelled');
    // KeePassXC names new entries after the site and does not return the new UUID: read the list again
    return existing
      ? { item: { ...existing, username: data.username || undefined, password: data.password ?? '', uris: [url], revealed: true }, resync: true }
      : { item: null, resync: true };
  }

  static async deleteItem(config, session, existing) {
    const c = await this.#ready(config);
    const r = await c.call('delete-entry', { uuid: existing.id }, 300_000);
    if (r.success !== 'true') throw new ProviderError(t('In KeePassXC abgelehnt oder abgebrochen.'), 'cancelled');
    return { deletedId: existing.id };
  }

  static async createFolder(config, session, { name }) {
    const path = String(name ?? '').split('/').map((p) => p.trim()).filter(Boolean).join('/');
    if (!path) throw new ProviderError(t('Ungültiger Name'), 'config');
    const c = await this.#ready(config);
    const r = await c.call('create-new-group', { groupName: path });
    return { folder: { id: r.uuid, name: path } };
  }

  /** For tests: forget the shared connection. */
  static reset() { shared?.channel.close?.(); shared = null; }
}

export default KeePassXCProvider;
