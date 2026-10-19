// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Export of revealed items as unencrypted Bitwarden JSON (complete: cards, identities, custom fields, folders)
// or Bitwarden CSV (logins and notes; what most password managers import). OmniVault's own import reads both.

const TYPE_IDS = { login: 1, note: 2, card: 3, identity: 4 };
const FIELD_TYPES = { text: 0, hidden: 1, boolean: 2 };
const PASSKEY_FIELDS = ['credentialId', 'keyType', 'keyAlgorithm', 'keyCurve', 'keyValue', 'rpId', 'userHandle', 'userName',
  'counter', 'rpName', 'userDisplayName', 'discoverable', 'creationDate'];
/** A passkey as Bitwarden exports it (all values strings, private key included). */
const passkeyJson = (p) => Object.fromEntries(PASSKEY_FIELDS.map((k) => [k, p[k] ?? null]));

/** items: revealed items ({ type, name, username, password, totp, uris, notes, folder, favorite, fields, card, identity }) */
export function toBitwardenJson(items) {
  const folderIds = new Map();
  for (const i of items) if (i.folder && !folderIds.has(i.folder)) folderIds.set(i.folder, crypto.randomUUID());
  return JSON.stringify({
    encrypted: false,
    folders: [...folderIds].map(([name, id]) => ({ id, name })),
    items: items.filter((i) => TYPE_IDS[i.type]).map((i) => ({
      id: crypto.randomUUID(),
      folderId: i.folder ? folderIds.get(i.folder) : null,
      type: TYPE_IDS[i.type],
      reprompt: 0,
      name: i.name ?? '',
      notes: i.notes || null,
      favorite: !!i.favorite,
      fields: (i.fields ?? []).filter((f) => f.type !== 'linked').map((f) => ({ name: f.name, value: f.value ?? null, type: FIELD_TYPES[f.type] ?? 0, linkedId: null })),
      ...(i.type === 'login' ? { login: {
        uris: (i.uris ?? []).map((uri) => ({ match: null, uri })), username: i.username || null, password: i.password || null, totp: i.totp || null,
        ...(i.passkeys?.some((p) => p.keyValue) ? { fido2Credentials: i.passkeys.filter((p) => p.keyValue).map(passkeyJson) } : {}),
      } } : {}),
      ...(i.type === 'note' ? { secureNote: { type: 0 } } : {}),
      ...(i.type === 'card' ? { card: { ...(i.card ?? {}) } } : {}),
      ...(i.type === 'identity' ? { identity: { ...(i.identity ?? {}) } } : {}),
    })),
  }, null, 2);
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Bitwarden CSV: one row per login or note (cards and identities are only in the JSON export). */
export function toCsv(items) {
  const header = ['folder', 'favorite', 'type', 'name', 'notes', 'fields', 'reprompt', 'login_uri', 'login_username', 'login_password', 'login_totp'];
  const rows = items.filter((i) => i.type === 'login' || i.type === 'note').map((i) => [
    i.folder ?? '', i.favorite ? 1 : '', i.type, i.name ?? '', i.notes ?? '',
    (i.fields ?? []).filter((f) => f.type !== 'linked').map((f) => `${f.name}: ${f.value ?? ''}`).join('\n'), 0,
    i.type === 'login' ? (i.uris ?? []).join(',') : '', i.username ?? '', i.password ?? '', i.totp ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}
