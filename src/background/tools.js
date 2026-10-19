// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Bulk tools: copy/move items between accounts and folders, and one-way mirror rules.
// All access to accounts goes through injected dependencies, so this module is testable without a browser:
//   deps.account(id)               → account or null
//   deps.provider(account)         → provider class
//   deps.items(accountId, force?)  → { items, folders } of an unlocked account (null when locked)
//   deps.reveal(accountId, itemId) → item with secrets
//   deps.write(accountId, fn)      → runs fn(provider, account, session), returns its result

import { mark, t } from '../i18n/index.js';

export const TRANSFERABLE = ['login', 'note', 'card', 'identity'];

const CARD_LABELS = { cardholderName: mark('Karteninhaber'), brand: mark('Marke'), number: mark('Kartennummer'), expMonth: mark('Ablaufmonat'), expYear: mark('Ablaufjahr'), code: mark('Prüfnummer') };
const IDENTITY_LABELS = {
  title: mark('Anrede'), firstName: mark('Vorname'), middleName: mark('Zweiter Vorname'), lastName: mark('Nachname'), company: mark('Firma'), email: mark('E-Mail'),
  phone: mark('Telefon'), address1: mark('Adresse'), address2: mark('Adresse 2'), address3: mark('Adresse 3'), postalCode: mark('PLZ'), city: mark('Ort'), state: mark('Bundesland'),
  country: mark('Land'), username: mark('Benutzername'), ssn: mark('Sozialversicherungsnummer'), passportNumber: mark('Reisepassnummer'), licenseNumber: mark('Führerscheinnummer'),
};
const TYPE_NAMES = { login: mark('Login'), note: mark('Notiz'), card: mark('Karte'), identity: mark('Identität'), ssh: mark('SSH-Schlüssel') };
const typeName = (type) => (TYPE_NAMES[type] ? t(TYPE_NAMES[type]) : type);
const lines = (obj, labels) => Object.entries(labels).filter(([k]) => obj?.[k]).map(([k, l]) => `${t(l)}: ${obj[k]}`);

/**
 * What a target account gets of an item: everything it can store. Custom fields go into the target's fields when
 * it has them, otherwise into the notes ("Name: Wert"); likewise card or identity details when the target cannot
 * store that type (the item then arrives as a note).
 */
export function transferData(item, folderId = null, caps = {}) {
  const data = {
    type: item.type, name: item.name ?? '', username: item.username ?? '', password: item.password ?? '',
    totp: item.totp ?? '', uris: [...(item.uris ?? [])], notes: item.notes ?? '',
    folderId, favorite: !!item.favorite,
  };
  const keys = passkeysWithKeys(item);
  if (keys.length && caps.passkeys && item.type === 'login') data.passkeys = keys;
  const extra = [];
  if (item.type === 'card' || item.type === 'identity') {
    const own = item.type === 'card' ? item.card : item.identity;
    if ((caps.types ?? []).includes(item.type)) data[item.type] = { ...(own ?? {}) };
    else { data.type = 'note'; extra.push(...lines(own, item.type === 'card' ? CARD_LABELS : IDENTITY_LABELS)); }
  }
  const fields = (item.fields ?? []).filter((f) => f.type !== 'linked' && (f.name || f.value));
  if (fields.length && caps.fields) { data.fields = fields.map(({ name, value, type }) => ({ name, value, type })); data.foldFields = true; } else extra.push(...fields.map((f) => `${f.name}: ${f.value}`));
  if (extra.length) data.notes = [data.notes, ...extra].filter(Boolean).join('\n');
  return data;
}

/**
 * Passkeys with their private keys: from a vault item (keys kept apart in _passkeyKeys) or from an import file
 * (keys in the records). Passkeys whose key is not available (other services) are left out.
 */
export function passkeysWithKeys(item) {
  return (item.passkeys ?? []).map((p) => ({ ...p, keyValue: p.keyValue ?? item._passkeyKeys?.[p.credentialId] })).filter((p) => p.keyValue);
}

/** What would be lost when the item is transferred to an account with `caps` (shown before copying/moving). */
export function transferLoss(item, caps = {}) {
  const lost = [];
  if (item.passwordHistory?.length) lost.push(t('Passwortverlauf'));
  const keys = passkeysWithKeys(item).length;
  if (item.passkeys?.length && (!caps.passkeys || keys < item.passkeys.length)) lost.push(t('Passkeys'));
  if (item.attachments?.length) lost.push(t('Anhänge'));
  return lost;
}

async function canWrite(deps, accountId, type) {
  const account = await deps.account(accountId);
  if (!account) throw new Error(t('Konto nicht gefunden'));
  const p = deps.provider(account);
  if (!p.capabilities?.write) throw new Error(t('{provider}: Schreiben wird nicht unterstützt', { provider: p.label }));
  if (type && !(p.capabilities.types ?? []).includes(type)) {
    throw new Error(t('{provider}: Einträge vom Typ „{type}“ können nicht angelegt werden', { provider: p.label, type: typeName(type) }));
  }
  return { account, provider: p };
}

/**
 * Copy or move items. Each entry: {accountId, itemId}. Target: account + folder (null = none/default).
 * Moving inside one account changes only the folder where the provider allows it; otherwise the item is
 * created in the target and the original is deleted afterwards (only if creating succeeded).
 * Returns one result per item: {accountId, itemId, ok, newId?, error?}.
 */
export async function transferItems(deps, { items, targetAccountId, targetFolderId = null, mode = 'copy' }) {
  const results = [];
  for (const { accountId, itemId } of items) {
    try {
      const src = await deps.reveal(accountId, itemId);
      if (!TRANSFERABLE.includes(src.type)) throw new Error(t('Typ „{type}“ kann nicht übertragen werden', { type: typeName(src.type) }));
      const { provider: tp } = await canWrite(deps, targetAccountId);
      const data = transferData(src, targetFolderId, tp.capabilities);
      if (!(tp.capabilities.types ?? []).includes(data.type)) throw new Error(t('{provider}: Einträge vom Typ „{type}“ können nicht angelegt werden', { provider: tp.label, type: typeName(src.type) }));
      if (mode === 'move' && accountId === targetAccountId && tp.capabilities.moveFolder !== false) {
        if (src.canEdit === false) throw new Error(t('Keine Berechtigung zum Verschieben'));
        const res = await deps.write(accountId, (p, a, s) => p.saveItem({ ...a.config, id: a.id }, s, src, { ...data, folderId: targetFolderId }));
        results.push({ accountId, itemId, ok: true, newId: res.item?.id ?? itemId });
        continue;
      }
      if (mode === 'move' && src.canDelete === false) throw new Error(t('Keine Berechtigung zum Löschen des Originals'));
      const res = await deps.write(targetAccountId, (p, a, s) => p.saveItem({ ...a.config, id: a.id }, s, null, data));
      if (mode === 'move') await deps.write(accountId, (p, a, s) => p.deleteItem({ ...a.config, id: a.id }, s, src));
      results.push({ accountId, itemId, ok: true, newId: res.item?.id });
    } catch (e) {
      results.push({ accountId, itemId, ok: false, error: e.message });
    }
  }
  return results;
}

export async function deleteItems(deps, { items }) {
  const results = [];
  for (const { accountId, itemId } of items) {
    try {
      const src = await deps.reveal(accountId, itemId);
      if (src.canDelete === false || src.canEdit === false) throw new Error(t('Keine Berechtigung zum Löschen'));
      await deps.write(accountId, (p, a, s) => p.deleteItem({ ...a.config, id: a.id }, s, src));
      results.push({ accountId, itemId, ok: true });
    } catch (e) {
      results.push({ accountId, itemId, ok: false, error: e.message });
    }
  }
  return results;
}

/* ---------- mirror rules ---------- */

/**
 * Rule: {id, sourceAccountId, sourceFolderId (null = all), targetAccountId, targetFolderId, deleteMissing, enabled}
 * State per rule: {sourceItemId: {targetId, rev}} – remembers which target item mirrors which source item.
 * The source always wins: changed source items overwrite their mirror; manual edits in the target are kept
 * until the source changes again. Items that are themselves mirrors (of any rule) are never used as source,
 * so A→B plus B→A does not ping-pong.
 */
export function validateRule(rule) {
  if (!rule.sourceAccountId || !rule.targetAccountId) throw new Error(t('Quelle und Ziel auswählen'));
  if (rule.sourceAccountId === rule.targetAccountId && (rule.sourceFolderId ?? null) === (rule.targetFolderId ?? null)) {
    throw new Error(t('Quelle und Ziel sind identisch'));
  }
  return {
    id: rule.id ?? `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    sourceAccountId: rule.sourceAccountId, sourceFolderId: rule.sourceFolderId || null,
    targetAccountId: rule.targetAccountId, targetFolderId: rule.targetFolderId || null,
    deleteMissing: !!rule.deleteMissing, enabled: rule.enabled !== false,
  };
}

const revOf = (i) => i.revisionDate ?? JSON.stringify(transferData(i));

export async function runMirrorRule(deps, rule, state = {}, { mirrorTargets = new Set() } = {}) {
  const report = { created: 0, updated: 0, deleted: 0, unchanged: 0, skipped: 0, errors: [] };
  const next = { ...state };
  const src = await deps.items(rule.sourceAccountId, true);
  const dst = await deps.items(rule.targetAccountId, true);
  if (!src || !dst) throw new Error(t('Quelle oder Ziel ist gesperrt'));
  const { provider: tp } = await canWrite(deps, rule.targetAccountId);
  const types = tp.capabilities.types ?? [];
  const dstById = new Map(dst.items.map((i) => [i.id, i]));

  const sources = src.items.filter((i) => (rule.sourceFolderId == null || i.folderId === rule.sourceFolderId)
    && !mirrorTargets.has(`${rule.sourceAccountId}/${i.id}`));
  const seen = new Set();
  for (const s of sources) {
    seen.add(s.id);
    if (!TRANSFERABLE.includes(s.type) || !types.includes(s.type)) { report.skipped++; continue; }
    const m = next[s.id];
    const target = m && dstById.get(m.targetId);
    const rev = revOf(s);
    try {
      if (!target) {
        const full = await deps.reveal(rule.sourceAccountId, s.id);
        const res = await deps.write(rule.targetAccountId, (p, a, ss) => p.saveItem({ ...a.config, id: a.id }, ss, null, transferData(full, rule.targetFolderId, tp.capabilities)));
        next[s.id] = { targetId: res.item.id, rev };
        report.created++;
      } else if (m.rev !== rev) {
        const full = await deps.reveal(rule.sourceAccountId, s.id);
        const existing = await deps.reveal(rule.targetAccountId, target.id);
        const res = await deps.write(rule.targetAccountId, (p, a, ss) => p.saveItem({ ...a.config, id: a.id }, ss, existing,
          { ...transferData(full, existing.folderId ?? rule.targetFolderId, tp.capabilities), favorite: existing.favorite }));
        next[s.id] = { targetId: res.item?.id ?? target.id, rev };
        report.updated++;
      } else {
        report.unchanged++;
      }
    } catch (e) {
      report.errors.push(`${s.name}: ${e.message}`);
    }
  }
  for (const [sid, m] of Object.entries(next)) {
    if (seen.has(sid)) continue;
    // source item gone (deleted or moved out of the folder)
    if (rule.deleteMissing && dstById.has(m.targetId)) {
      try {
        const existing = await deps.reveal(rule.targetAccountId, m.targetId);
        await deps.write(rule.targetAccountId, (p, a, ss) => p.deleteItem({ ...a.config, id: a.id }, ss, existing));
        report.deleted++;
      } catch (e) {
        report.errors.push(t('Löschen: {error}', { error: e.message }));
        continue;
      }
    }
    delete next[sid];
  }
  return { state: next, report };
}

/** All "accountId/itemId" that are mirrors created by any rule. */
export function mirrorTargetSet(rules, states) {
  const out = new Set();
  for (const r of rules) for (const m of Object.values(states[r.id] ?? {})) out.add(`${r.targetAccountId}/${m.targetId}`);
  return out;
}

/* ---------- import ---------- */

/**
 * Writes normalized items (parsed from an export file in the popup, see lib/import.js) into an account.
 * Items of a type the provider cannot store become notes; a login stored as a note keeps its secrets in the text.
 * Returns one result per item: {name, ok, error?}.
 */
export async function importItems(deps, { accountId, items, folderId = null }) {
  const { provider } = await canWrite(deps, accountId);
  const types = provider.capabilities.types ?? [];
  const results = [];
  for (const raw of items) {
    const data = transferData({ ...raw, name: raw.name || t('Ohne Namen') }, folderId, provider.capabilities);
    if (!types.includes(data.type)) data.type = types.includes('note') ? 'note' : 'login';
    if (data.type === 'note') {
      if (raw.type === 'login') {
        data.notes = [raw.username && t('Benutzer: {username}', { username: raw.username }), raw.password && t('Passwort: {password}', { password: raw.password }),
          raw.totp && `TOTP: ${raw.totp}`, ...(raw.uris ?? []).map((u) => `URL: ${u}`), raw.notes]
          .filter(Boolean).join('\n');
      }
      Object.assign(data, { username: '', password: '', totp: '', uris: [] });
    }
    try {
      await deps.write(accountId, (p, a, s) => p.saveItem({ ...a.config, id: a.id }, s, null, data));
      results.push({ name: data.name, ok: true });
    } catch (e) {
      results.push({ name: data.name, ok: false, error: e.message });
    }
  }
  return results;
}
