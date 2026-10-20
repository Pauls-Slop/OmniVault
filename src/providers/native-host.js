// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Native-messaging transport for the CLI-backed providers (Proton Pass, pass, 1Password, LastPass).
// All talk to one host (native/omnivault_host.py) and differ only by the `backend` field of a request.
import { mark, t } from '../i18n/index.js';
import { ext } from '../lib/browser.js';
import { Provider, ProviderError } from './provider.js';

export const HOST_NAME = 'org.omnivault.host';

/**
 * The host (native/*.py) answers in German. Its fixed messages are translated here; messages with a variable part
 * are matched by pattern. Anything else (output of the CLI programs themselves) is passed on unchanged.
 */
const HOST_MESSAGES = new Set([
  mark('Das Programm antwortet nicht (Zeitüberschreitung)'), mark('Eintrag nicht gefunden'), mark('Ungültiger Name'),
  mark('Ungültiger Tresorname'), mark('`lpass` (LastPass CLI) wurde nicht gefunden.'), mark('`op` (1Password CLI) wurde nicht gefunden.'),
  mark('1Password CLI lieferte kein gültiges JSON'), mark('`pass` wurde nicht gefunden. Bitte das Programm „pass“ (password-store) installieren.'),
  mark('pass-cli nicht gefunden. Bitte das offizielle Proton Pass CLI installieren.'), mark('pass-cli lieferte kein gültiges JSON'),
  mark('Nur Logins und Notizen können angelegt werden'),
  mark('Diese pass-cli-Version hat keinen Papierkorb – bitte pass-cli aktualisieren (≥ 2.3).'),
  mark('Diese pass-cli-Version kann Einträge nicht verschieben – bitte pass-cli aktualisieren (≥ 2.3).'),
  mark('Die pass-cli-Sitzung ist mit einem Sperrcode gesperrt. Bitte im Terminal `pass-cli session unlock` ausführen.'),
  mark('Proton Pass: nicht angemeldet. Bitte im Terminal `pass-cli login` ausführen.'),
  mark('Der Eintrag wurde inzwischen geändert. Bitte synchronisieren und erneut bearbeiten.'),
  mark('Anhang nicht gefunden'), mark('Das Programm hat keine Datei geschrieben'), mark('Ungültiges Ablaufdatum'),
  mark('1Password CLI lieferte keine Vorlage'), mark('Nur Logins, Notizen, Karten und Identitäten können angelegt werden'),
  mark('Die Adresse lässt sich über op nicht ändern – bitte in der 1Password-App ändern'),
]);
const HOST_PATTERNS = [
  [/^Ungültige (.+)$/, (m) => t('Ungültige {name}', { name: m[1] })],
  [/^Feld (.+) kann nicht geändert werden$/, (m) => t('Feld {name} kann nicht geändert werden', { name: m[1] })],
  [/^Anhang zu groß \(höchstens (\d+) MB\)$/, (m) => t('Anhang zu groß (höchstens {n} MB)', { n: m[1] })],
  [/^Feld (.+) fehlt in der 1Password-Vorlage$/, (m) => t('Feld {name} fehlt in der 1Password-Vorlage', { name: m[1] })],
  [/^Programm konnte nicht gestartet werden: (.+)$/, (m) => t('Programm konnte nicht gestartet werden: {error}', { error: m[1] })],
  [/^Exit-Code (\d+)$/, (m) => t('Exit-Code {code}', { code: m[1] })],
  [/^Unbekannter Befehl (.*)$/, (m) => t('Unbekannter Befehl {command}', { command: m[1] })],
  [/^Unbekanntes Backend (.*)$/, (m) => t('Unbekanntes Backend {backend}', { backend: m[1] })],
];
export function hostMessage(text) {
  if (!text) return t('Fehler im Host');
  if (HOST_MESSAGES.has(text)) return t(text);
  for (const [re, fn] of HOST_PATTERNS) { const m = re.exec(text); if (m) return fn(m); }
  return text;
}

/** Parts of a long answer: item lists ("items") or a file split into base64 pieces ("dataPart"). */
export function collectPart(pending, result) {
  if (result.dataPart !== undefined) (pending.data ??= []).push(result.dataPart);
  else (pending.items ??= []).push(...(result.items ?? []));
}
export function joinParts(pending, result) {
  if (result.dataPart !== undefined) {
    const { dataPart, ...rest } = result;
    return { ...rest, data: [...(pending.data ?? []), dataPart].join('') };
  }
  return pending.items ? { ...result, items: [...pending.items, ...(result.items ?? [])] } : result;
}

/** Request/response multiplexer over a native messaging port (reconnects lazily, closes when idle). */
export class NativeTransport {
  constructor(hostName = HOST_NAME) {
    this.hostName = hostName;
    this.port = null;
    this.seq = 0;
    this.pending = new Map();
    this.idle = null;
  }

  #connect() {
    if (this.port) return this.port;
    if (!ext?.runtime?.connectNative) throw new ProviderError(t('Native Messaging ist nicht verfügbar'), 'unsupported');
    const port = ext.runtime.connectNative(this.hostName);
    port.onMessage.addListener((msg) => {
      const p = this.pending.get(msg.id);
      if (!p) return;
      if (!msg.ok) { this.pending.delete(msg.id); p.reject(new ProviderError(hostMessage(msg.error), msg.code ?? 'host')); return; }
      if (msg.more) { collectPart(p, msg.result); return; }
      this.pending.delete(msg.id);
      p.resolve(joinParts(p, msg.result));
    });
    port.onDisconnect.addListener(() => {
      const err = ext.runtime.lastError?.message ?? t('Verbindung zum Host getrennt');
      const hint = /not found|not exist|nicht gefunden|forbidden|no such/i.test(err)
        ? t('Der OmniVault-Host ist nicht installiert (siehe native/README.md).') : err;
      for (const p of this.pending.values()) p.reject(new ProviderError(hint, 'host_missing'));
      this.pending.clear();
      this.port = null;
    });
    this.port = port;
    return port;
  }

  request(backend, cmd, args = {}) {
    const port = this.#connect();
    clearTimeout(this.idle);
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      port.postMessage({ id, backend, cmd, args });
    }).finally(() => {
      clearTimeout(this.idle);
      this.idle = setTimeout(() => { if (!this.pending.size) { this.port?.disconnect(); this.port = null; } }, 30_000);
    });
  }
}

/** One shared transport for all CLI providers (each provider class can override it in tests via `transport`). */
let shared = null;
export const getTransport = () => (shared ??= new NativeTransport());

/**
 * Base for providers that run through the native host (Proton Pass, pass, 1Password, LastPass): the CLI holds
 * the session, so there is nothing to type in OmniVault; the browser only needs the nativeMessaging permission.
 */
export class CliProvider extends Provider {
  /** Backend name in native/omnivault_host.py. */
  static backend = '';
  static status = 'ready';
  static unlockMode = 'none';
  static optionalPermissions = ['nativeMessaging'];
  static configFields = [];
  /** Replaceable in tests (an object with request(backend, cmd, args)). */
  static transport = null;

  static call(cmd, args = {}) {
    return (this.transport ?? getTransport()).request(this.backend, cmd, args);
  }

  /** How the host addresses an item. */
  static ref(item) { return { id: item.id }; }

  static async setFavorite() {
    throw new ProviderError(t('{provider}: Favoriten werden nicht unterstützt', { provider: this.label }), 'unsupported');
  }

  /** Downloads an attachment through the host (backends that list `attachments` on their items). */
  static async downloadAttachment(config, session, item, attachmentId) {
    const r = await this.call('attachment', { ...this.ref(item), fileId: attachmentId });
    return { fileName: r.fileName || t('Anhang'), data: r.data ?? '' };
  }

  static async deleteItem(config, session, existing) {
    await this.call('delete', this.ref(existing));
    return { deletedId: existing.id };
  }
}

/** A folder that only exists through its path (pass directories, LastPass groups): "Arbeit/Team". */
export function virtualFolder(name) {
  const path = String(name ?? '').split('/').map((p) => p.trim()).filter((p) => p && p !== '.' && p !== '..').join('/');
  if (!path || path.length > 200) throw new ProviderError(t('Ungültiger Name'), 'config');
  return { id: path, name: path };
}
