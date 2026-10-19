// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Bitwarden & Vaultwarden provider: login (password or personal API key), sync of all item types,
// create / edit (logins, notes, cards, identities, custom fields) / favorite / folders / trash with restore.
import { mark, t, tn } from '../../i18n/index.js';
import { b64, fromB64 } from '../../lib/bytes.js';
import { Provider, ProviderError } from '../provider.js';
import * as api from './api.js';
import {
  decryptBuffer, decryptRsa, decryptSym, decryptSymString, decryptUserKey,
  deriveMasterKey, encryptSym, masterPasswordHash, splitKey,
} from './crypto.js';

const TWO_FACTOR_LABELS = {
  0: mark('Authenticator-App (TOTP)'),
  1: mark('E-Mail-Code'),
  2: mark('Duo'),
  3: mark('YubiKey OTP'),
  6: mark('Duo (Organisation)'),
  7: mark('FIDO2 / WebAuthn'),
};
const SUPPORTED_2FA = [0, 1, 3];

const CIPHER_TYPES = { 1: 'login', 2: 'note', 3: 'card', 4: 'identity', 5: 'ssh' };
const TYPE_IDS = { login: 1, note: 2, card: 3, identity: 4, ssh: 5 };
const FIELD_TYPES = { 0: 'text', 1: 'hidden', 2: 'boolean', 3: 'linked' };
// Bitwarden LinkedIdType values for login/card/identity fields that a "linked" custom field can point to.
const LINKED = {
  100: mark('Benutzername'), 101: mark('Passwort'),
  300: mark('Karteninhaber'), 301: mark('Ablaufmonat'), 302: mark('Ablaufjahr'), 303: mark('Prüfnummer'), 304: mark('Marke'), 305: mark('Kartennummer'),
};
const CARD_FIELDS = ['cardholderName', 'brand', 'number', 'expMonth', 'expYear', 'code'];
// Passkeys (login.fido2Credentials): every field is encrypted except creationDate.
const PASSKEY_FIELDS = ['credentialId', 'keyType', 'keyAlgorithm', 'keyCurve', 'keyValue', 'rpId', 'userHandle', 'userName',
  'counter', 'rpName', 'userDisplayName', 'discoverable'];
const IDENTITY_FIELDS = ['title', 'firstName', 'middleName', 'lastName', 'address1', 'address2', 'address3', 'city', 'state',
  'postalCode', 'country', 'company', 'email', 'phone', 'ssn', 'username', 'passportNumber', 'licenseNumber'];

const encOrNull = async (v, key) => (v == null || v === '' ? null : encryptSym(String(v), key));

async function encryptObject(src, names, key) {
  const out = {};
  for (const n of names) out[n] = await encOrNull(src[n], key);
  return out;
}

/** Passkey records (with their private keys) → login.fido2Credentials; null for none. */
async function encryptPasskeys(passkeys, key) {
  if (!passkeys?.length) return null;
  return Promise.all(passkeys.map(async (p) => ({
    ...await encryptObject(p, PASSKEY_FIELDS, key), creationDate: p.creationDate ?? new Date().toISOString(),
  })));
}

/** Custom fields from the editor (text, hidden, boolean); linked fields cannot be edited and are kept. */
async function encryptFields(fields, rawFields = [], key) {
  const kept = (rawFields ?? []).filter((f) => f.type === 3);
  const edited = [];
  for (const f of fields) {
    if (!f.name && !f.value) continue;
    const type = { text: 0, hidden: 1, boolean: 2 }[f.type] ?? 0;
    const value = type === 2 ? (f.value === true || f.value === 'true' ? 'true' : 'false') : f.value;
    edited.push({ name: await encOrNull(f.name, key), value: await encOrNull(value, key), type, linkedId: null });
  }
  return [...edited, ...kept];
}

function deviceName() {
  return api.DEVICE_TYPE === 3 ? 'firefox' : 'chrome';
}

class BitwardenProvider extends Provider {
  static id = 'bitwarden';
  static label = 'Bitwarden / Vaultwarden';
  static status = 'ready';
  static unlockLabel = mark('Master-Passwort');
  static unlockOptions = ['apikey'];
  static capabilities = { write: true, types: ['login', 'note', 'card', 'identity'], fields: true, createFolder: true, trash: true, restore: true, attachments: true, passkeys: true };
  static configFields = [
    {
      // Bitwarden runs exactly two cloud regions; anything else is self-hosted (incl. Vaultwarden).
      name: 'server', label: mark('Server'), type: 'select', default: 'bitwarden.com',
      options: [
        { value: 'bitwarden.com', label: mark('bitwarden.com – Cloud USA') },
        { value: 'bitwarden.eu', label: mark('bitwarden.eu – Cloud EU') },
      ],
      custom: { label: mark('Selbst gehostet / Vaultwarden …'), placeholder: 'https://vault.example.org' },
    },
    { name: 'email', label: mark('E-Mail'), type: 'email', required: true },
  ];

  /** Host-permission pattern the extension must hold for this account. */
  static hostPatterns(config) {
    const ep = api.endpoints(config.server);
    return [...new Set([ep.api, ep.identity].map((u) => `${new URL(u).origin}/*`))];
  }

  /* ---------- login ---------- */

  static async login(config, creds) {
    const ep = api.endpoints(config.server);
    const email = config.email.trim();
    const deviceId = config.deviceId || crypto.randomUUID();
    const configPatch = config.deviceId ? undefined : { deviceId };

    const kdf = await api.prelogin(ep, email);
    const masterKey = await deriveMasterKey(creds.password, email, kdf);

    if (creds.clientId) {
      // Personal API key: the server authenticates the key, the master password only decrypts the vault.
      const tok = await api.apiKeyGrant(ep, { clientId: creds.clientId, clientSecret: creds.clientSecret, deviceId, deviceName: deviceName() });
      const protectedKey = tok.key ?? tok.userDecryptionOptions?.masterPasswordUnlock?.masterKeyEncryptedUserKey;
      if (!protectedKey) throw new ProviderError(t('Server lieferte keinen verschlüsselten Benutzerschlüssel'), 'server');
      const userKey = await decryptUserKey(protectedKey, masterKey);
      return {
        status: 'ok',
        configPatch,
        session: {
          accessToken: tok.access_token, refreshToken: null, expiresAt: Date.now() + (tok.expires_in ?? 3600) * 1000,
          apiKey: { clientId: creds.clientId, clientSecret: creds.clientSecret, deviceId },
          userKey: b64(userKey),
        },
      };
    }

    const hash = await masterPasswordHash(masterKey, creds.password);
    if (creds.requestEmailCode) {
      await api.sendEmailCode(ep, { email, hash, deviceId });
      return { status: 'needs_2fa', configPatch, twoFactorProviders: [{ id: '1', label: t(TWO_FACTOR_LABELS[1]) }] };
    }

    const res = await api.passwordGrant(ep, {
      email, hash, deviceId, deviceName: deviceName(),
      twoFactor: creds.twoFactorCode
        ? { code: creds.twoFactorCode.replace(/\s/g, ''), provider: Number(creds.twoFactorProvider ?? 0) }
        : null,
      newDeviceOtp: creds.deviceOtp?.trim(),
    });

    if (res.status === 'needs_2fa') {
      const usable = res.providers.filter((p) => SUPPORTED_2FA.includes(p));
      if (!usable.length) {
        throw new ProviderError(
          t('Nur nicht unterstützte 2FA-Methoden aktiv ({methods}). Anmeldung mit API-Schlüssel ist möglich.', { methods: res.providers.map((p) => (TWO_FACTOR_LABELS[p] ? t(TWO_FACTOR_LABELS[p]) : p)).join(', ') }),
          'unsupported');
      }
      return {
        status: 'needs_2fa', configPatch,
        twoFactorProviders: usable.map((p) => ({ id: String(p), label: t(TWO_FACTOR_LABELS[p]) })),
      };
    }
    if (res.status === 'needs_device_otp') return { status: 'needs_device_otp', configPatch };

    const tok = res.token;
    const protectedKey = tok.key ?? tok.userDecryptionOptions?.masterPasswordUnlock?.masterKeyEncryptedUserKey;
    if (!protectedKey) throw new ProviderError(t('Server lieferte keinen verschlüsselten Benutzerschlüssel'), 'server');
    const userKey = await decryptUserKey(protectedKey, masterKey);

    return {
      status: 'ok',
      configPatch,
      session: {
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        expiresAt: Date.now() + (tok.expires_in ?? 3600) * 1000,
        userKey: b64(userKey),
      },
    };
  }

  static async #refresh(ep, s) {
    if (s.apiKey) {
      const tok = await api.apiKeyGrant(ep, { ...s.apiKey, deviceName: deviceName() });
      return { ...s, accessToken: tok.access_token, expiresAt: Date.now() + (tok.expires_in ?? 3600) * 1000 };
    }
    const tok = await api.refreshGrant(ep, s.refreshToken);
    return {
      ...s,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? s.refreshToken,
      expiresAt: Date.now() + (tok.expires_in ?? 3600) * 1000,
    };
  }

  /** Runs fn(token) with a valid access token; refreshes once on expiry or 401. */
  static async #withToken(ep, session, fn) {
    let s = session;
    if (Date.now() > s.expiresAt - 60_000) s = await this.#refresh(ep, s);
    let r = await fn(s.accessToken);
    if (r?.unauthorized) {
      s = await this.#refresh(ep, s);
      r = await fn(s.accessToken);
      if (r?.unauthorized) throw new ProviderError(t('Nicht autorisiert – bitte neu anmelden'), 'session_expired');
    }
    return { result: r, session: s !== session ? s : undefined };
  }

  /* ---------- sync ---------- */

  static async sync(config, session) {
    const ep = api.endpoints(config.server);
    const { result: data, session: renewed } = await this.#withToken(ep, session, (token) => api.sync(ep, token));
    const s = renewed ?? session;

    const userKey = splitKey(fromB64(s.userKey));
    const orgKeys = await this.#orgKeys(data.profile, userKey);

    const folderNames = {};
    for (const f of data.folders ?? []) {
      folderNames[f.id] = await decryptSymString(f.name, userKey).catch(() => '');
    }

    const items = [];
    const trash = [];
    let failed = 0;
    for (const c of data.ciphers ?? []) {
      try {
        const item = await this.#decryptCipher(c, { userKey, orgKeys, folderNames, accountId: config.id });
        if (c.deletedDate) trash.push({ ...item, deletedDate: c.deletedDate }); else items.push(item);
      } catch (e) {
        failed++;
        console.warn('OmniVault: Eintrag nicht entschlüsselbar', c.id, e);
      }
    }
    const userId = data.profile?.id;
    return {
      items,
      trash,
      folders: Object.entries(folderNames).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'de')),
      // remember the user id: current Vaultwarden requires it as `encryptedFor` when writing ciphers
      session: userId && userId !== s.userId ? { ...s, userId } : renewed,
      warning: failed ? tn(failed, '{n} Eintrag konnte nicht entschlüsselt werden', '{n} Einträge konnten nicht entschlüsselt werden') : undefined,
    };
  }

  static async #orgKeys(profile, userKey) {
    const keys = {};
    const orgs = profile?.organizations ?? [];
    if (!orgs.length || !profile.privateKey) return keys;
    const privateKey = await decryptSym(profile.privateKey, userKey);
    for (const o of orgs) {
      if (!o.key) continue;
      try {
        keys[o.id] = splitKey(await decryptRsa(o.key, privateKey));
      } catch (e) {
        console.warn('OmniVault: Organisationsschlüssel nicht entschlüsselbar', o.id, e);
      }
    }
    return keys;
  }

  static async #cipherKey(c, { userKey, orgKeys }) {
    let key = c.organizationId ? orgKeys[c.organizationId] : userKey;
    if (!key) throw new ProviderError(t('Schlüssel fehlt'), 'crypto');
    if (c.key) key = splitKey(await decryptSym(c.key, key)); // per-item key
    return key;
  }

  static async #decryptCipher(c, { userKey, orgKeys, folderNames, accountId }) {
    const key = await this.#cipherKey(c, { userKey, orgKeys });
    const d = (v) => (v == null ? undefined : decryptSymString(v, key));
    const obj = async (src, names) => {
      if (!src) return undefined;
      const out = {};
      for (const n of names) out[n] = await d(src[n]);
      return out;
    };

    const item = {
      id: c.id,
      accountId,
      provider: 'bitwarden',
      type: CIPHER_TYPES[c.type] ?? 'other',
      name: (await d(c.name)) ?? '',
      notes: await d(c.notes),
      folderId: c.folderId ?? null,
      folder: c.folderId ? folderNames[c.folderId] : undefined,
      favorite: !!c.favorite,
      canEdit: c.edit !== false,
      revisionDate: c.revisionDate,
      uris: [],
      fields: [],
      passwordHistory: [],
      // internal: raw cipher and its key for re-encryption on edit (memory only, stripped before reaching the UI)
      _raw: c,
      _key: b64(new Uint8Array([...key.enc, ...(key.mac ?? [])])),
    };
    if (c.login) {
      item.username = await d(c.login.username);
      item.password = await d(c.login.password);
      item.totp = await d(c.login.totp);
      for (const u of c.login.uris ?? []) {
        const uri = await d(u.uri);
        if (uri) item.uris.push(uri);
      }
      if (c.login.fido2Credentials?.length) {
        // what the interface may see; the private keys stay in _passkeyKeys (stripped like all internal fields)
        item.passkeys = [];
        item._passkeyKeys = {};
        for (const f of c.login.fido2Credentials) {
          const p = await obj(f, PASSKEY_FIELDS);
          p.creationDate = f.creationDate ?? null;
          item._passkeyKeys[p.credentialId] = p.keyValue;
          delete p.keyValue;
          item.passkeys.push(p);
        }
      }
    }
    item.card = await obj(c.card, CARD_FIELDS);
    item.identity = await obj(c.identity, IDENTITY_FIELDS);
    if (c.sshKey) {
      item.ssh = { privateKey: await d(c.sshKey.privateKey), publicKey: await d(c.sshKey.publicKey), fingerprint: await d(c.sshKey.keyFingerprint) };
    }
    for (const f of c.fields ?? []) {
      item.fields.push({
        name: await d(f.name), value: await d(f.value), type: FIELD_TYPES[f.type] ?? 'text',
        linkedLabel: f.linkedId != null && LINKED[f.linkedId] ? t(LINKED[f.linkedId]) : undefined,
      });
    }
    item.attachments = [];
    for (const a of c.attachments ?? []) {
      item.attachments.push({ id: a.id, fileName: (await d(a.fileName).catch(() => '')) || t('Anhang'), size: Number(a.size) || 0 });
    }
    for (const h of c.passwordHistory ?? []) {
      item.passwordHistory.push({ password: await d(h.password), lastUsedDate: h.lastUsedDate });
    }
    if (item.card) {
      const last = item.card.number ? `*${item.card.number.replace(/\s/g, '').slice(-4)}` : '';
      item.subtitle = [item.card.brand, last].filter(Boolean).join(' ');
    }
    if (item.identity) item.subtitle = [item.identity.firstName, item.identity.lastName].filter(Boolean).join(' ') || item.identity.email;
    if (item.ssh) item.subtitle = item.ssh.fingerprint;
    return item;
  }

  /* ---------- write ---------- */

  /** User id: from the session, the access token (JWT `sub`) or the profile endpoint. */
  static async #userId(ep, session) {
    if (session.userId) return { userId: session.userId };
    try {
      const sub = JSON.parse(atob(session.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
      if (sub) return { userId: sub, session: { ...session, userId: sub } };
    } catch { /* not a JWT */ }
    const { result, session: renewed } = await this.#withToken(ep, session, (token) => api.authed(ep, token, 'GET', '/accounts/profile'));
    const id = result.body?.id ?? result.body?.Id;
    return { userId: id, session: id ? { ...(renewed ?? session), userId: id } : renewed };
  }

  static #session(session) {
    return { userKey: splitKey(fromB64(session.userKey)) };
  }

  /**
   * Create or update. For updates, fields OmniVault does not edit (passkeys, attachments metadata,
   * card/identity details, custom fields …) are passed through unchanged as ciphertext.
   */
  static async saveItem(config, session, existing, data) {
    const ep = api.endpoints(config.server);
    const enc = async (v, key) => (v == null || v === '' ? null : encryptSym(String(v), key));
    let body;
    let key;
    if (existing) {
      const raw = existing._raw;
      key = splitKey(fromB64(existing._key));
      body = {
        type: raw.type, folderId: data.folderId !== undefined ? data.folderId : raw.folderId ?? null,
        organizationId: raw.organizationId ?? null, favorite: data.favorite ?? !!raw.favorite, reprompt: raw.reprompt ?? 0,
        key: raw.key ?? null, name: await enc(data.name ?? existing.name, key), notes: data.notes !== undefined ? await enc(data.notes, key) : raw.notes ?? null,
        login: raw.login ?? null, card: raw.card ?? null, identity: raw.identity ?? null, secureNote: raw.secureNote ?? null,
        sshKey: raw.sshKey ?? null, fields: raw.fields ?? null, passwordHistory: raw.passwordHistory ?? null,
        lastKnownRevisionDate: raw.revisionDate ?? null,
      };
      if (data.fields) body.fields = await encryptFields(data.fields, raw.fields, key);
      if (raw.type === 3 && data.card) body.card = await encryptObject(data.card, CARD_FIELDS, key);
      if (raw.type === 4 && data.identity) body.identity = await encryptObject(data.identity, IDENTITY_FIELDS, key);
      if (raw.type === 1 && data.type === 'login') {
        const login = { ...(raw.login ?? {}) };
        login.username = await enc(data.username, key);
        login.totp = await enc(data.totp, key);
        const oldUris = raw.login?.uris ?? [];
        login.uris = await Promise.all((data.uris ?? []).map(async (u, n) => ({ uri: await enc(u, key), match: oldUris[n]?.match ?? null })));
        if (data.passkeys !== undefined) login.fido2Credentials = await encryptPasskeys(data.passkeys, key);
        if ((data.password ?? '') !== (existing.password ?? '')) {
          login.password = await enc(data.password, key);
          login.passwordRevisionDate = new Date().toISOString();
          if (existing.password) {
            // like the official clients: keep the previous password in the history (max. 5)
            body.passwordHistory = [{ password: raw.login.password, lastUsedDate: new Date().toISOString() }, ...(raw.passwordHistory ?? [])].slice(0, 5);
          }
        }
        body.login = login;
      }
    } else {
      key = this.#session(session).userKey;
      const type = TYPE_IDS[data.type] ?? 1;
      body = {
        type, folderId: data.folderId ?? null, organizationId: null, favorite: !!data.favorite, reprompt: 0,
        name: await enc(data.name, key), notes: await enc(data.notes, key),
        login: type === 1 ? {
          username: await enc(data.username, key), password: await enc(data.password, key), totp: await enc(data.totp, key),
          uris: await Promise.all((data.uris ?? []).map(async (u) => ({ uri: await enc(u, key), match: null }))),
          fido2Credentials: await encryptPasskeys(data.passkeys, key),
        } : null,
        secureNote: type === 2 ? { type: 0 } : null,
        card: type === 3 ? await encryptObject(data.card ?? {}, CARD_FIELDS, key) : null,
        identity: type === 4 ? await encryptObject(data.identity ?? {}, IDENTITY_FIELDS, key) : null,
        fields: data.fields?.length ? await encryptFields(data.fields, [], key) : null,
      };
    }
    const path = existing ? `/ciphers/${existing.id}` : '/ciphers';
    let s = session;
    const userId = await this.#userId(ep, session).then((r) => { if (r.session) s = r.session; return r.userId; });
    if (userId) body.encryptedFor = userId;
    const { result, session: renewed } = await this.#withToken(ep, s, (token) => api.authed(ep, token, existing ? 'PUT' : 'POST', path, body));
    if (renewed) s = renewed;
    const saved = await this.#decryptAfterWrite(result.body, config, s, existing);
    return { item: saved, session: s !== session ? s : undefined };
  }

  static async #decryptAfterWrite(cipher, config, session, existing) {
    // The fields are encrypted with `fieldKey` (item key if present, otherwise user/org key).
    const fieldKey = existing ? splitKey(fromB64(existing._key)) : this.#session(session).userKey;
    const item = await this.#decryptCipher({ ...cipher, key: null }, {
      userKey: fieldKey, orgKeys: cipher.organizationId ? { [cipher.organizationId]: fieldKey } : {},
      folderNames: {}, accountId: config.id,
    });
    item._raw = cipher; // keeps the item key (cipher.key) for later edits
    item._key = b64(new Uint8Array([...fieldKey.enc, ...(fieldKey.mac ?? [])]));
    return item;
  }

  static async setFavorite(config, session, existing, favorite) {
    const ep = api.endpoints(config.server);
    const { session: s } = await this.#withToken(ep, session, (token) => api.authed(ep, token, 'PUT', `/ciphers/${existing.id}/partial`, {
      folderId: existing._raw.folderId ?? null, favorite: !!favorite,
    }));
    const item = { ...existing, favorite: !!favorite, _raw: { ...existing._raw, favorite: !!favorite } };
    return { item, session: s };
  }

  /** Downloads and decrypts one attachment → { fileName, data (base64) }. */
  static async downloadAttachment(config, session, item, attachmentId) {
    const ep = api.endpoints(config.server);
    const meta = item._raw.attachments?.find((a) => a.id === attachmentId);
    if (!meta) throw new ProviderError(t('Anhang nicht gefunden'), 'not_found');
    const { result, session: s } = await this.#withToken(ep, session, (token) => api.authed(ep, token, 'GET', `/ciphers/${item.id}/attachment/${attachmentId}`));
    const href = result.body?.url ?? meta.url;
    if (!href) throw new ProviderError(t('Keine Download-Adresse für den Anhang'), 'server');
    const res = await fetch(new URL(href, ep.api));
    if (!res.ok) throw new ProviderError(t('Anhang: HTTP {status}', { status: res.status }), 'server');
    const itemKey = splitKey(fromB64(item._key));
    const key = meta.key ? splitKey(await decryptSym(meta.key, itemKey)) : itemKey;
    const data = await decryptBuffer(await res.arrayBuffer(), key);
    return { fileName: (await decryptSymString(meta.fileName, itemKey).catch(() => '')) || t('Anhang'), data: b64(data), session: s };
  }

  static async createFolder(config, session, { name }) {
    const ep = api.endpoints(config.server);
    const enc = await encryptSym(name, this.#session(session).userKey);
    const { result, session: s } = await this.#withToken(ep, session, (token) => api.authed(ep, token, 'POST', '/folders', { name: enc }));
    return { folder: { id: result.body.id, name }, session: s };
  }

  /** Restores an item from the trash. */
  static async restoreItem(config, session, existing) {
    const ep = api.endpoints(config.server);
    const { result, session: s } = await this.#withToken(ep, session, (token) => api.authed(ep, token, 'PUT', `/ciphers/${existing.id}/restore`));
    const item = await this.#decryptAfterWrite(result.body, config, s ?? session, existing);
    return { item: { ...item, folder: existing.folder }, session: s };
  }

  /** Deletes an item from the trash for good. */
  static async purgeItem(config, session, existing) {
    const ep = api.endpoints(config.server);
    const { session: s } = await this.#withToken(ep, session, (token) => api.authed(ep, token, 'DELETE', `/ciphers/${existing.id}`));
    return { purgedId: existing.id, session: s };
  }

  static async deleteItem(config, session, existing) {
    const ep = api.endpoints(config.server);
    // Soft delete: the item goes to the trash and can be restored in the web vault.
    const { session: s } = await this.#withToken(ep, session, (token) => api.authed(ep, token, 'PUT', `/ciphers/${existing.id}/delete`));
    return { deletedId: existing.id, session: s };
  }
}

export default BitwardenProvider;
