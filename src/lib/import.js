// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Importing export files from other password managers into an existing OmniVault account.
// Everything here is pure: text (and parsed JSON) in, a normalized item list out. No secrets leave the browser.
//
// A normalized item: { type:'login'|'note', name, username, password, totp, uris:[], notes, favorite }.
// Only login and note are produced; richer types (cards, identities) are flattened into a note so nothing is lost.

import { mark, t } from '../i18n/index.js';
/** RFC 4180 CSV parser: handles quoted fields, embedded commas, quotes ("") and CR/LF inside quotes. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const s = text.replace(/^﻿/, ''); // strip BOM
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.length > 1 || row[0] !== '') rows.push(row); }
  return rows;
}

const norm = (h) => h.toLowerCase().replace(/[\s_-]+/g, '');
// Column aliases → canonical field. First match wins, in listed order.
const COLUMN_MAP = {
  name: ['name', 'title', 'account', 'itemname', 'entryname'],
  username: ['username', 'loginusername', 'user', 'loginname', 'login', 'accountusername'],
  email: ['email', 'loginemail', 'emailaddress'],
  password: ['password', 'loginpassword', 'pass', 'accountpassword'],
  uri: ['uri', 'url', 'urls', 'loginuri', 'website', 'websiteurl', 'link', 'loginurl'],
  totp: ['totp', 'logintotp', 'otpauth', 'otp', 'otpsecret', 'twofactor', '2fa', 'authkey', 'verificationcode'],
  notes: ['notes', 'note', 'comment', 'comments', 'extra', 'description'],
  type: ['type'],
  favorite: ['favorite', 'fav', 'favourite', 'starred'],
  folder: ['folder', 'grouping', 'group', 'category', 'collection'],
};

/** Builds a header→field index map for a CSV header row. */
function mapHeaders(header) {
  const idx = {};
  const cols = header.map(norm);
  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    for (const a of aliases) {
      const i = cols.indexOf(a);
      if (i >= 0) { idx[field] = i; break; }
    }
  }
  return idx;
}

const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';

/** Maps a CSV data row to a normalized item using the header index. Extra columns are appended to notes. */
function rowToItem(row, idx, header) {
  const get = (f) => (idx[f] != null ? (row[idx[f]] ?? '').trim() : '');
  const username = get('username') || get('email');
  const uriRaw = get('uri');
  const uris = uriRaw ? uriRaw.split(/[\n,]/).map((u) => u.trim()).filter(Boolean) : [];
  const mapped = new Set(Object.values(idx));
  // keep unmapped, non-empty columns as "Label: value" lines so nothing is silently dropped
  const extra = [];
  for (let i = 0; i < row.length; i++) {
    if (mapped.has(i)) continue;
    const label = (header[i] ?? t('Feld {n}', { n: i + 1 })).trim();
    const val = (row[i] ?? '').trim();
    if (val && !/^folder$|^grouping$/i.test(label)) extra.push(`${label}: ${val}`);
  }
  const notesParts = [get('notes'), ...extra].filter(nonEmpty);
  const hasLogin = nonEmpty(username) || nonEmpty(get('password')) || uris.length || nonEmpty(get('totp'));
  const declaredType = norm(get('type'));
  const isNote = /note|securenote/.test(declaredType) || (!hasLogin && notesParts.length);
  return {
    type: isNote ? 'note' : 'login',
    name: get('name') || username || uris[0] || t('Ohne Namen'),
    username, password: get('password'), totp: get('totp'),
    uris, notes: notesParts.join('\n'),
    favorite: /^(1|true|yes|ja)$/i.test(get('favorite')),
    folder: get('folder') || undefined,
  };
}

/** CSV with a header row (Bitwarden, LastPass, Chrome, Firefox, 1Password, NordPass, Dashlane, KeePass, Safari …). */
export function importCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error(t('CSV ohne Datenzeilen'));
  const header = rows[0];
  const idx = mapHeaders(header);
  if (idx.name == null && idx.username == null && idx.password == null && idx.uri == null) {
    throw new Error(t('CSV-Spalten nicht erkannt (keine Spalte für Name, Benutzer, Passwort oder URL gefunden)'));
  }
  return rows.slice(1).map((r) => rowToItem(r, idx, header)).filter((i) => i.name || i.username || i.password);
}

/* ---------- JSON formats ---------- */

const flattenFields = (obj, labels) => Object.entries(obj || {})
  .filter(([k, v]) => labels.includes(k) && nonEmpty(String(v ?? '')))
  .map(([k, v]) => `${k}: ${v}`);

/** Bitwarden / Vaultwarden JSON export ({ items: [...] } or { encrypted:false, items }). */
export function importBitwardenJson(data) {
  if (!Array.isArray(data.items)) throw new Error(t('Kein Bitwarden-JSON (items fehlt)'));
  if (data.encrypted) throw new Error(t('Verschlüsselter Bitwarden-Export wird nicht unterstützt – bitte unverschlüsselt exportieren'));
  const folders = Object.fromEntries((data.folders ?? []).map((f) => [f.id, f.name]));
  return data.items.map((i) => {
    const login = i.login ?? {};
    const uris = (login.uris ?? []).map((u) => u.uri).filter(Boolean);
    // cards, identities and custom fields stay structured; the target account decides what it can store
    const fields = (i.fields ?? []).filter((f) => f.type !== 3 && (nonEmpty(f.name) || nonEmpty(f.value)))
      .map((f) => ({ name: f.name ?? '', value: f.value ?? '', type: { 1: 'hidden', 2: 'boolean' }[f.type] ?? 'text' }));
    const clean = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v != null && v !== ''));
    return {
      type: { 1: 'login', 3: 'card', 4: 'identity' }[i.type] ?? 'note',
      name: i.name || t('Ohne Namen'),
      username: login.username ?? '', password: login.password ?? '', totp: login.totp ?? '',
      uris, notes: i.notes ?? '', fields,
      ...(i.type === 3 ? { card: clean(i.card) } : {}), ...(i.type === 4 ? { identity: clean(i.identity) } : {}),
      favorite: !!i.favorite, folder: folders[i.folderId] || undefined,
      // passkeys with their private keys; accounts that store passkeys (Bitwarden) take them over
      ...((login.fido2Credentials ?? []).some((p) => p?.keyValue) ? { passkeys: login.fido2Credentials.filter((p) => p?.keyValue).map((p) => ({ ...p })) } : {}),
    };
  });
}

/** Proton Pass JSON export (data.json: { vaults: { id: { items: [{ data: { type, metadata, content } }] } } }). */
export function importProtonJson(data) {
  const vaults = data.vaults ?? {};
  const out = [];
  for (const vault of Object.values(vaults)) {
    for (const entry of vault.items ?? []) {
      const d = entry.data ?? entry;
      const meta = d.metadata ?? {};
      const content = d.content ?? {};
      const type = d.type || (content.password != null || content.urls ? 'login' : 'note');
      const notes = [meta.note];
      for (const f of d.extraFields ?? []) if (f.data?.content) notes.push(`${f.fieldName}: ${f.data.content}`);
      if (type !== 'login' && type !== 'note') notes.push(...flattenFields(content, Object.keys(content)));
      out.push({
        type: type === 'login' ? 'login' : 'note',
        name: meta.name || t('Ohne Namen'),
        username: content.itemUsername || content.username || content.itemEmail || content.email || '',
        password: content.password ?? '',
        totp: content.totpUri ?? '',
        uris: (content.urls ?? []).filter(Boolean),
        notes: notes.filter(nonEmpty).join('\n'),
        favorite: !!(entry.pinned || entry.favorite), folder: vault.name || undefined,
      });
    }
  }
  if (!out.length) throw new Error(t('Kein Proton-Pass-JSON (keine Einträge gefunden)'));
  return out;
}

/** KeePass 2 XML export (<KeePassFile><Root><Group><Entry><String><Key>Title</Key><Value>…). */
export function importKeePassXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror') || !doc.querySelector('KeePassFile')) throw new Error(t('Kein KeePass-XML'));
  const entries = [...doc.querySelectorAll('Entry')].filter((e) => !e.closest('History'));
  return entries.map((e) => {
    const f = {};
    for (const str of e.querySelectorAll(':scope > String')) {
      f[str.querySelector('Key')?.textContent ?? ''] = str.querySelector('Value')?.textContent ?? '';
    }
    const known = ['Title', 'UserName', 'Password', 'URL', 'Notes', 'otp', 'TOTP'];
    const extra = Object.entries(f).filter(([k, v]) => !known.includes(k) && nonEmpty(v)).map(([k, v]) => `${k}: ${v}`);
    return {
      type: 'login',
      name: f.Title || f.UserName || t('Ohne Namen'),
      username: f.UserName ?? '', password: f.Password ?? '',
      totp: f.otp || f.TOTP || '',
      uris: f.URL ? [f.URL] : [],
      notes: [f.Notes, ...extra].filter(nonEmpty).join('\n'),
      favorite: false,
    };
  });
}

/* ---------- dispatch ---------- */

export const FORMATS = [
  { id: 'auto', name: mark('Automatisch'), label: mark('Automatisch erkennen') },
  { id: 'csv', name: mark('CSV'), label: mark('CSV (Bitwarden, LastPass, Chrome, NordPass, Dashlane, 1Password, KeePass, Safari …)') },
  { id: 'bitwarden', name: mark('Bitwarden-JSON'), label: mark('Bitwarden / Vaultwarden (.json, unverschlüsselt)') },
  { id: 'proton', name: mark('Proton-Pass-JSON'), label: mark('Proton Pass (data.json aus dem Export)') },
  { id: 'keepassxml', name: mark('KeePass-XML'), label: mark('KeePass 2 (.xml)') },
];

/** Detects the format of a text file and returns {format, items}. Throws with a clear message on failure. */
export function parseImport(text, format = 'auto') {
  const tryJson = () => { try { return JSON.parse(text); } catch { return null; } };
  if (format === 'csv') return { format: 'csv', items: importCsv(text) };
  if (format === 'keepassxml') return { format: 'keepassxml', items: importKeePassXml(text) };
  if (format === 'bitwarden') return { format: 'bitwarden', items: importBitwardenJson(tryJson() ?? {}) };
  if (format === 'proton') return { format: 'proton', items: importProtonJson(tryJson() ?? {}) };
  // auto
  const trimmed = text.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const json = tryJson();
    if (json) {
      if (Array.isArray(json.items) && (json.encrypted !== undefined || json.folders !== undefined || json.items.some((i) => i.login || i.type != null))) {
        return { format: 'bitwarden', items: importBitwardenJson(json) };
      }
      if (json.vaults) return { format: 'proton', items: importProtonJson(json) };
    }
  }
  if (trimmed.startsWith('<')) return { format: 'keepassxml', items: importKeePassXml(text) };
  return { format: 'csv', items: importCsv(text) };
}
