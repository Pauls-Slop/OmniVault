// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Passbolt provider: JWT login via GPG challenge, v4 and v5 (encrypted metadata) resources, folders.
// OpenPGP operations use OpenPGP.js (LGPL-3.0-or-later, shipped as the separate file vendor/openpgp.mjs).
// Secrets are decrypted lazily (reveal) because each one is a separate OpenPGP message.
import { mark, t, tn } from '../../i18n/index.js';
import * as openpgp from '../../../vendor/openpgp.mjs';
import { fromB64, fromUtf8 } from '../../lib/bytes.js';
import { Provider, ProviderError } from '../provider.js';

const SYM = { 7: 'aes128', 8: 'aes192', 9: 'aes256' };

function baseUrl(server) {
  const s = String(server || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//.test(s)) throw new ProviderError(t('Bitte die vollständige Passbolt-Adresse angeben (https://…)'), 'config');
  return s;
}

async function api(base, path, { method = 'GET', token, body } = {}) {
  const url = `${base}${path}${path.includes('?') ? '&' : '?'}api-version=v2`;
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'include', // the passbolt_mfa cookie proves the second factor
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ProviderError(t('Passbolt nicht erreichbar ({base}): {error}', { base, error: e.message }), 'network');
  }
  let json = null;
  try { json = await res.json(); } catch { /* not JSON */ }
  if (res.status === 401) throw new ProviderError(t('Sitzung abgelaufen – bitte neu anmelden'), 'session_expired');
  if (res.status === 429) throw new ProviderError(t('Zu viele Anfragen – Passbolt bremst gerade (Rate-Limit). Bitte etwa eine Minute warten.'), 'rate_limited');
  if (res.status === 403 && json?.body?.mfa_providers) {
    throw new ProviderError(t('Zweiter Faktor erforderlich – bitte neu entsperren'), 'session_expired');
  }
  if (!res.ok) {
    const e = new ProviderError(t('Passbolt: {message}', { message: `${json?.header?.message ?? `HTTP ${res.status}`}${validationDetail(json?.body)}` }), 'server');
    e.status = res.status;
    e.body = json?.body;
    throw e;
  }
  return json?.body;
}

/** First validation message of a 400 response ({field: {rule: message}}), so errors are actionable. */
function validationDetail(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '';
  const walk = (o, path) => {
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string') return `${path.concat(k === '_empty' ? [] : [k]).join('.')}: ${v}`;
      if (v && typeof v === 'object') { const r = walk(v, [...path, k]); if (r) return r; }
    }
    return '';
  };
  const d = walk(body, []);
  return d ? ` (${d})` : '';
}

/** Decode the `exp` claim of a JWT without verifying it (only used for refresh timing). */
function jwtExpiry(token) {
  try {
    const payload = JSON.parse(fromUtf8(fromB64(token.split('.')[1])));
    return payload.exp ? payload.exp * 1000 : Date.now() + 5 * 60_000;
  } catch { return Date.now() + 5 * 60_000; }
}

const fpr = (key) => key.getFingerprint().toUpperCase();

async function unlockPrivateKey(armoredKey, passphrase) {
  const key = await openpgp.readPrivateKey({ armoredKey });
  if (key.isDecrypted()) return key;
  return openpgp.decryptKey({ privateKey: key, passphrase });
}

/** Decrypt an armored message to text. Throws if `expectSigned` and no signature from `verificationKeys` is valid. */
async function decryptText(armoredMessage, { decryptionKeys, verificationKeys, expectSigned = false, sessionKeys } = {}) {
  const message = await openpgp.readMessage({ armoredMessage });
  const { data, signatures } = await openpgp.decrypt({
    message, decryptionKeys, verificationKeys, expectSigned, sessionKeys,
  });
  let verified = false;
  for (const s of signatures ?? []) {
    try { await s.verified; verified = true; break; } catch { /* invalid or unknown signer */ }
  }
  return { text: data, verified };
}

function totpUri(spec) {
  if (!spec?.secret_key) return undefined;
  const p = new URLSearchParams({ secret: spec.secret_key, digits: String(spec.digits ?? 6), period: String(spec.period ?? 30), algorithm: spec.algorithm ?? 'SHA1' });
  return `otpauth://totp/passbolt?${p}`;
}

/** "otpauth://…" or a bare base32 secret → Passbolt's totp object. */
function parseTotpInput(input) {
  const v = input.trim();
  if (v.startsWith('otpauth://')) {
    const u = new URL(v);
    const p = u.searchParams;
    return {
      secret_key: (p.get('secret') ?? '').toUpperCase(), digits: Number(p.get('digits') ?? 6),
      period: Number(p.get('period') ?? 30), algorithm: (p.get('algorithm') ?? 'SHA1').toUpperCase(),
    };
  }
  return { secret_key: v.replace(/\s/g, '').toUpperCase(), digits: 6, period: 30, algorithm: 'SHA1' };
}
const totpUriFrom = (spec) => totpUri(spec);

function parseSessionKey(s) {
  const m = /^(\d+):([0-9a-f]+)$/i.exec(s ?? '');
  if (!m || !SYM[m[1]]) return null;
  const data = new Uint8Array(m[2].length / 2);
  for (let i = 0; i < data.length; i++) data[i] = parseInt(m[2].substr(i * 2, 2), 16);
  return { data, algorithm: SYM[m[1]] };
}

class PassboltProvider extends Provider {
  static id = 'passbolt';
  static label = 'Passbolt';
  static status = 'ready';
  static unlockLabel = mark('Passphrase des privaten Schlüssels');
  static capabilities = { write: true, types: ['login', 'note'], fields: true, createFolder: true, share: true };
  static note = mark('Benötigt deinen privaten Schlüssel (Wiederherstellungs-Kit, passphrasegeschützt) und deine Benutzer-ID.');
  static configFields = [
    { name: 'server', label: mark('Passbolt-Adresse'), type: 'url', required: true, placeholder: 'https://passbolt.example.org' },
    {
      name: 'userId', label: mark('Benutzer-ID'), type: 'text', required: true, placeholder: '8bb6e5e2-…',
      hint: mark('In Passbolt unter Benutzer → dein Eintrag; die UUID steht in der Adresszeile.'),
    },
    {
      name: 'privateKey', label: mark('Privater Schlüssel'), type: 'keyfile', required: true,
      placeholder: '-----BEGIN PGP PRIVATE KEY BLOCK-----', fileLabel: mark('Kit-Datei laden …'),
      hint: 'passbolt-recovery-kit.asc', accept: '.asc,.txt,.key',
    },
  ];

  static async login(config, creds) {
    const base = baseUrl(config.server);
    let key;
    try {
      key = await unlockPrivateKey(config.privateKey, creds.password);
    } catch (e) {
      throw new ProviderError(/passphrase/i.test(e.message) ? t('Falsche Passphrase') : t('Schlüssel: {error}', { error: e.message }), 'bad_password');
    }

    const verify = await api(base, '/auth/verify.json');
    const serverKey = await openpgp.readKey({ armoredKey: verify.keydata });
    const serverFpr = fpr(serverKey);
    if (config.serverFingerprint && config.serverFingerprint !== serverFpr) {
      throw new ProviderError(t('Der Serverschlüssel hat sich geändert (jetzt {fingerprint}). Anmeldung abgebrochen.', { fingerprint: serverFpr }), 'server_key_changed');
    }
    const configPatch = config.serverFingerprint ? undefined : { serverFingerprint: serverFpr };

    const verifyToken = crypto.randomUUID();
    const challenge = await openpgp.encrypt({
      message: await openpgp.createMessage({
        text: JSON.stringify({
          version: '1.0.0', domain: base, verify_token: verifyToken,
          verify_token_expiry: Math.floor(Date.now() / 1000) + 120,
        }),
      }),
      encryptionKeys: serverKey,
      signingKeys: key,
    });

    const res = await api(base, '/auth/jwt/login.json', { method: 'POST', body: { user_id: config.userId.trim(), challenge } });
    // The verify_token can only be known to whoever decrypted our challenge with the server key.
    const answer = JSON.parse((await decryptText(res.challenge, { decryptionKeys: key, verificationKeys: serverKey })).text);
    if (answer.verify_token !== verifyToken) throw new ProviderError(t('Server-Antwort ungültig (verify_token)'), 'server');

    const mfa = answer.providers ?? answer.mfa_providers ?? [];
    if (mfa.length) {
      if (!creds.twoFactorCode) {
        const labels = { totp: t('Authenticator-App (TOTP)'), yubikey: 'YubiKey' };
        const usable = mfa.filter((p) => p in labels);
        if (!usable.length) throw new ProviderError(t('Nur nicht unterstützte MFA-Methoden aktiv: {methods}', { methods: mfa.join(', ') }), 'unsupported');
        return { status: 'needs_2fa', configPatch, twoFactorProviders: usable.map((id) => ({ id, label: labels[id] })) };
      }
      const provider = creds.twoFactorProvider || 'totp';
      await api(base, `/mfa/verify/${provider}.json`, {
        method: 'POST', token: answer.access_token,
        body: provider === 'yubikey' ? { hotp: creds.twoFactorCode.trim() } : { totp: creds.twoFactorCode.replace(/\s/g, '') },
      });
    }

    return {
      status: 'ok',
      configPatch,
      session: {
        accessToken: answer.access_token,
        refreshToken: answer.refresh_token,
        expiresAt: jwtExpiry(answer.access_token),
        // Decrypted key, ASCII-armored – lives only in storage.session (RAM), like Bitwarden's user key.
        unlockedKey: key.armor(),
      },
    };
  }

  static async #refresh(base, config, s) {
    const body = await api(base, '/auth/jwt/refresh.json', { method: 'POST', body: { user_id: config.userId.trim(), refresh_token: s.refreshToken } });
    return { ...s, accessToken: body.access_token, refreshToken: body.refresh_token ?? s.refreshToken, expiresAt: jwtExpiry(body.access_token) };
  }

  static async sync(config, session) {
    const base = baseUrl(config.server);
    const userId = config.userId.trim();
    let s = session;
    if (Date.now() > s.expiresAt - 30_000) s = await this.#refresh(base, config, s);
    const get = async (path) => {
      try { return await api(base, path, { token: s.accessToken }); } catch (e) {
        if (e.code !== 'session_expired' || !s.refreshToken) throw e;
        s = await this.#refresh(base, config, s);
        return api(base, path, { token: s.accessToken });
      }
    };
    const optional = async (path, fallback) => {
      try { return await get(path); } catch (e) { if (e.code === 'server' && [400, 404].includes(e.status)) return fallback; throw e; }
    };

    const key = await openpgp.readPrivateKey({ armoredKey: s.unlockedKey });
    const types = Object.fromEntries((await get('/resource-types.json')).map((rt) => [rt.id, rt.slug]));
    const resources = await get('/resources.json?contain[secret]=1&contain[favorite]=1&contain[permission]=1');
    const folders = await optional('/folders.json', []);
    const warnings = [];

    // v5: session keys let us skip one asymmetric decryption per resource (Passbolt ≥ 4.10)
    const sessionKeys = new Map();
    if (resources.some((r) => r.metadata)) {
      for (const bundle of await optional('/metadata/session-keys.json', [])) {
        try {
          const j = JSON.parse((await decryptText(bundle.data, { decryptionKeys: key })).text);
          for (const k of j.session_keys ?? []) {
            const parsed = parseSessionKey(k.session_key);
            if (parsed) sessionKeys.set(`${k.foreign_model}:${k.foreign_id}`, parsed);
          }
        } catch (e) { console.warn('OmniVault: Sitzungsschlüssel nicht lesbar', e); }
      }
    }

    // v5: shared metadata keys. The private part is encrypted for us and signed by whoever shared it;
    // a key whose signature cannot be verified is not used.
    const metaKeys = new Map();
    const shared = [...resources, ...folders].some((r) => r.metadata && r.metadata_key_type === 'shared_key');
    if (shared) {
      const signerCache = new Map();
      const signerKey = async (id) => {
        if (!id) return null;
        if (!signerCache.has(id)) {
          signerCache.set(id, optional(`/users/${encodeURIComponent(id)}.json`, null)
            .then((u) => (u?.gpgkey?.armored_key ? openpgp.readKey({ armoredKey: u.gpgkey.armored_key }) : null))
            .catch(() => null));
        }
        return signerCache.get(id);
      };
      for (const mk of await get('/metadata/keys.json?contain[metadata_private_keys]=1')) {
        const mine = (mk.metadata_private_keys ?? []).find((p) => p.user_id === userId);
        if (!mine?.data) continue;
        try {
          const signers = [key.toPublic()];
          for (const id of new Set([mine.modified_by, mine.created_by].filter(Boolean))) {
            const k = await signerKey(id);
            if (k) signers.push(k);
          }
          const { text, verified } = await decryptText(mine.data, { decryptionKeys: key, verificationKeys: signers });
          if (!verified) throw new ProviderError(t('Signatur des Metadaten-Schlüssels nicht verifizierbar'), 'crypto');
          const j = JSON.parse(text);
          if (j.object_type !== 'PASSBOLT_METADATA_PRIVATE_KEY') throw new ProviderError(t('Unerwarteter Metadaten-Schlüssel'), 'crypto');
          const mkey = await unlockPrivateKey(j.armored_key, j.passphrase ?? '');
          if (mk.fingerprint && fpr(mkey) !== mk.fingerprint.toUpperCase()) throw new ProviderError(t('Fingerprint des Metadaten-Schlüssels passt nicht'), 'crypto');
          metaKeys.set(mk.id, mkey);
        } catch (e) {
          console.warn('OmniVault: Metadaten-Schlüssel abgelehnt', mk.id, e);
          warnings.push(e.message);
        }
      }
    }

    const decryptMetadata = async (entity, model, objectType) => {
      const sk = sessionKeys.get(`${model}:${entity.id}`);
      let text;
      if (sk) {
        try { text = (await decryptText(entity.metadata, { sessionKeys: sk })).text; } catch { /* fall back */ }
      }
      if (text === undefined) {
        const mkey = entity.metadata_key_type === 'shared_key' ? metaKeys.get(entity.metadata_key_id) : key;
        if (!mkey) throw new ProviderError(t('Metadaten-Schlüssel fehlt'), 'crypto');
        text = (await decryptText(entity.metadata, { decryptionKeys: mkey })).text;
      }
      const j = JSON.parse(text);
      if (j.object_type !== objectType) throw new ProviderError(t('Unerwartete Metadaten'), 'crypto');
      return j;
    };

    // Folder paths ("Team/Infra")
    const folderById = new Map();
    for (const f of folders) {
      let name = f.name;
      if (f.metadata) {
        try { name = (await decryptMetadata(f, 'Folder', 'PASSBOLT_FOLDER_METADATA')).name; } catch { name = '…'; }
      }
      folderById.set(f.id, { name, parent: f.folder_parent_id });
    }
    const folderPath = (id) => {
      const parts = [];
      for (let cur = id, guard = 0; cur && folderById.has(cur) && guard < 32; guard++) {
        const f = folderById.get(cur);
        parts.unshift(f.name);
        cur = f.parent;
      }
      return parts.join('/') || undefined;
    };

    const items = [];
    let failed = 0;
    for (const r of resources) {
      try {
        let meta = { name: r.name, username: r.username, uris: r.uri ? [r.uri] : [], description: r.description };
        let rawMeta = null;
        if (r.metadata) {
          rawMeta = await decryptMetadata(r, 'Resource', 'PASSBOLT_RESOURCE_METADATA');
          meta = { name: rawMeta.name, username: rawMeta.username, uris: rawMeta.uris ?? [], description: rawMeta.description };
        }
        const slug = types[r.resource_type_id] ?? 'password-string';
        const hasTotp = /totp/.test(slug);
        const hasPassword = !/totp-standalone|^totp$|note/.test(slug);
        const secret = r.secrets?.[0]?.data ?? r.secret?.data;
        items.push({
          id: r.id,
          accountId: config.id,
          provider: 'passbolt',
          type: hasPassword ? 'login' : slug.includes('note') ? 'note' : 'login',
          name: meta.name ?? '',
          username: meta.username ?? undefined,
          uris: (meta.uris ?? []).filter(Boolean),
          description: meta.description ?? undefined, // public (searchable) description
          folderId: r.folder_parent_id ?? null,
          folder: folderPath(r.folder_parent_id),
          favorite: !!r.favorite,
          canEdit: (r.permission?.type ?? 15) >= 7,
          canDelete: (r.permission?.type ?? 15) >= 15,
          revisionDate: r.modified,
          lazy: true,
          _favoriteId: r.favorite?.id ?? null,
          _meta: rawMeta,
          _v5: !!r.metadata,
          _metadataKeyType: r.metadata_key_type ?? null,
          _metadataKeyId: r.metadata_key_id ?? null,
          hasPassword: hasPassword && !!secret,
          hasTotp: hasTotp && !!secret,
          slug,
          secretArmored: secret,
        });
      } catch (e) {
        failed++;
        console.warn('OmniVault: Passbolt-Ressource nicht lesbar', r.id, e);
      }
    }
    if (failed) warnings.push(tn(failed, '{n} Eintrag konnte nicht entschlüsselt werden', '{n} Einträge konnten nicht entschlüsselt werden'));
    const folderList = folders.map((f) => ({ id: f.id, name: folderPath(f.id) })).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return { items, folders: folderList, session: s !== session ? s : undefined, warning: warnings.join('; ') || undefined };
  }

  /** Decrypt one resource's secret: returns { password, totp, notes }. */
  static async reveal(config, session, item) {
    if (!item.secretArmored) return {};
    const key = await openpgp.readPrivateKey({ armoredKey: session.unlockedKey });
    const { text } = await decryptText(item.secretArmored, { decryptionKeys: key });
    if (item.slug === 'password-string' || item.slug === 'v5-password-string') return { password: text, _secret: { password: text } };
    let j;
    try { j = JSON.parse(text); } catch { return { password: text, _secret: { password: text } }; }
    // v5 custom fields: names live in the metadata, values in the secret
    const names = Object.fromEntries((item._meta?.custom_fields ?? []).map((f) => [f.id, f]));
    const fields = (j.custom_fields ?? []).map((f) => ({
      name: names[f.id]?.metadata_key ?? t('Feld'),
      value: typeof f.secret_value === 'boolean' ? String(f.secret_value) : f.secret_value,
      type: f.type === 'boolean' ? 'boolean' : f.type === 'password' ? 'hidden' : 'text',
    }));
    return {
      password: j.password,
      totp: totpUri(j.totp),
      notes: j.description || undefined, // secret note
      fields,
      _secret: j,
    };
  }

  /* ---------- write ---------- */

  static async #ctx(config, session) {
    const base = baseUrl(config.server);
    let s = session;
    if (Date.now() > s.expiresAt - 30_000) s = await this.#refresh(base, config, s);
    const call = async (path, opts = {}) => {
      try { return await api(base, path, { ...opts, token: s.accessToken }); } catch (e) {
        if (e.code !== 'session_expired' || !s.refreshToken) throw e;
        s = await this.#refresh(base, config, s);
        return api(base, path, { ...opts, token: s.accessToken });
      }
    };
    const key = await openpgp.readPrivateKey({ armoredKey: s.unlockedKey });
    return { base, call, key, renewed: () => (s !== session ? s : undefined) };
  }

  static async #encryptFor(text, encryptionKeys, signingKeys) {
    return openpgp.encrypt({ message: await openpgp.createMessage({ text }), encryptionKeys, signingKeys });
  }

  /**
   * Everyone who can read a resource (directly or through a group) with their public key: an edited secret has to
   * be encrypted for each of them. The keys come from the server, like in Passbolt's own extension.
   */
  static async #recipients(ctx, resourceId) {
    const users = await ctx.call(`/users.json?filter[has-access]=${encodeURIComponent(resourceId)}&contain[gpgkey]=1`);
    return Promise.all(users.filter((u) => u.gpgkey?.armored_key).map(async (u) => ({
      userId: u.id, key: await openpgp.readKey({ armoredKey: u.gpgkey.armored_key }),
    })));
  }

  /** Refuses to overwrite a resource that changed on the server since the last sync. */
  static async #assertUnchanged(ctx, existing) {
    if (!existing.revisionDate) return;
    const current = await ctx.call(`/resources/${encodeURIComponent(existing.id)}.json`);
    if (current?.modified && current.modified !== existing.revisionDate) {
      throw new ProviderError(t('Der Eintrag wurde inzwischen in Passbolt geändert. Bitte synchronisieren und erneut bearbeiten.'), 'conflict');
    }
  }

  static async #sharedMetadataKey(ctx, id = null) {
    const keys = (await ctx.call('/metadata/keys.json').catch(() => [])) ?? [];
    const mk = id ? keys.find((k) => k.id === id) : keys.find((k) => !k.expired && k.armored_key);
    return mk ? { id: mk.id, key: await openpgp.readKey({ armoredKey: mk.armored_key }) } : null;
  }

  static async saveItem(config, session, existing, data) {
    const ctx = await this.#ctx(config, session);
    const types = Object.fromEntries((await ctx.call('/resource-types.json')).map((rt) => [rt.slug, rt.id]));
    const me = ctx.key.toPublic();
    const wantTotp = !!data.totp?.trim();
    const totpObj = wantTotp ? parseTotpInput(data.totp) : undefined;

    let v5;
    let recipients = [{ userId: config.userId.trim(), key: me }];
    if (existing) {
      if (existing.canEdit === false) throw new ProviderError(t('Keine Schreibberechtigung für diesen Eintrag'), 'forbidden');
      await this.#assertUnchanged(ctx, existing);
      recipients = await this.#recipients(ctx, existing.id);
      if (!recipients.some((r) => r.userId === config.userId.trim())) recipients.push({ userId: config.userId.trim(), key: me });
      v5 = existing._v5;
    } else {
      const settings = await ctx.call('/metadata/types/settings.json').catch(() => null);
      v5 = (settings?.default_resource_types === 'v5' || !types['password-and-description']) && !!types['v5-default'];
    }

    let slug;
    if (data.type === 'note') {
      if (!v5) throw new ProviderError(t('Notizen ohne Passwort benötigen Passbolt-v5-Ressourcen'), 'unsupported');
      slug = 'v5-note';
    } else if (v5) slug = wantTotp ? 'v5-default-with-totp' : 'v5-default';
    else slug = wantTotp ? 'password-description-totp' : 'password-and-description';
    if (existing?.slug === 'password-string' && !wantTotp && !data.notes) slug = 'password-string';
    if (!types[slug]) throw new ProviderError(t('Ressourcentyp {slug} ist auf diesem Server nicht verfügbar', { slug }), 'unsupported');

    // custom fields (v5 logins): the names live in the metadata, the values in the secret, joined by an id
    let customFields = null;
    if (data.fields?.length && data.foldFields && (!v5 || data.type === 'note')) {
      // copied or imported: keep the fields as text where this server cannot store them
      data = { ...data, notes: [data.notes, ...data.fields.map((f) => `${f.name}: ${f.value}`)].filter(Boolean).join('\n'), fields: [] };
    }
    if (data.fields) {
      if (data.fields.length && (!v5 || data.type === 'note')) {
        throw new ProviderError(t('Zusatzfelder speichert Passbolt nur bei Logins mit verschlüsselten Metadaten (v5)'), 'unsupported');
      }
      if (v5 && data.type !== 'note') {
        const old = existing?._meta?.custom_fields ?? [];
        customFields = data.fields.map((f) => {
          const type = { hidden: 'password', boolean: 'boolean' }[f.type] ?? 'text';
          return {
            id: old.find((o) => o.metadata_key === f.name)?.id ?? crypto.randomUUID(), type, name: f.name,
            value: type === 'boolean' ? f.value === true || f.value === 'true' : f.value ?? '',
          };
        });
      }
    }

    // secret
    let secretText;
    if (slug === 'password-string') secretText = data.password ?? '';
    else if (v5) {
      secretText = JSON.stringify({
        ...(existing?._secret && typeof existing._secret === 'object' ? existing._secret : {}),
        object_type: 'PASSBOLT_SECRET_DATA',
        ...(data.type === 'note' ? {} : { password: data.password ?? '' }),
        description: data.notes ?? '',
        ...(totpObj ? { totp: totpObj } : { totp: undefined }),
        ...(customFields ? { custom_fields: customFields.length ? customFields.map(({ id, type, value }) => ({ id, type, secret_value: value })) : undefined } : {}),
      });
    } else {
      secretText = JSON.stringify({ password: data.password ?? '', description: data.notes ?? '', ...(totpObj ? { totp: totpObj } : {}) });
    }
    // One secret per reader. On update Passbolt requires the owner of each secret; on create the server fills it in.
    const secrets = existing
      ? await Promise.all(recipients.map(async (r) => ({ user_id: r.userId, data: await this.#encryptFor(secretText, r.key, ctx.key) })))
      : [{ data: await this.#encryptFor(secretText, me, ctx.key) }];
    const mySecret = existing ? secrets.find((x) => x.user_id === config.userId.trim()).data : secrets[0].data;

    const body = { resource_type_id: types[slug], secrets };
    let metaObj = null;
    if (v5) {
      const meta = metaObj = {
        ...(existing?._meta ?? { icon: {}, custom_fields: [] }),
        object_type: 'PASSBOLT_RESOURCE_METADATA', resource_type_id: types[slug],
        name: data.name, username: data.type === 'note' ? null : data.username || null,
        uris: data.type === 'note' ? [] : data.uris ?? [],
        description: existing?._meta?.description ?? null,
        ...(customFields ? { custom_fields: customFields.map(({ id, type, name }) => ({ id, type, metadata_key: name })) } : {}),
      };
      // keep the key type of an existing resource; new ones use the shared key when the server has one
      let keyType = existing?._metadataKeyType;
      let keyId = existing?._metadataKeyId ?? null;
      let metaRecipient = me;
      if (!existing) {
        const mk = await this.#sharedMetadataKey(ctx);
        keyType = mk ? 'shared_key' : 'user_key';
        keyId = mk?.id ?? null;
        if (mk) metaRecipient = mk.key;
      } else if (keyType === 'shared_key') {
        const mk = await this.#sharedMetadataKey(ctx, keyId);
        if (!mk) throw new ProviderError(t('Metadaten-Schlüssel nicht gefunden'), 'crypto');
        metaRecipient = mk.key;
      }
      body.metadata = await this.#encryptFor(JSON.stringify(meta), metaRecipient, ctx.key);
      body.metadata_key_type = keyType;
      body.metadata_key_id = keyId;
    } else {
      Object.assign(body, { name: data.name, username: data.username || null, uri: data.uris?.[0] ?? null, description: existing?.description ?? null });
    }

    let saved;
    if (existing) {
      saved = await ctx.call(`/resources/${encodeURIComponent(existing.id)}.json`, { method: 'PUT', body });
      if ((data.folderId ?? null) !== (existing.folderId ?? null)) {
        await ctx.call(`/move/resource/${encodeURIComponent(existing.id)}.json`, { method: 'PUT', body: { folder_parent_id: data.folderId ?? null } });
        saved = { ...saved, modified: (await ctx.call(`/resources/${encodeURIComponent(existing.id)}.json`))?.modified ?? saved?.modified };
      }
      if (data.favorite !== undefined && !!data.favorite !== !!existing.favorite) {
        await this.setFavorite(config, ctx.renewed() ?? session, existing, data.favorite);
      }
    } else {
      saved = await ctx.call('/resources.json', { method: 'POST', body: { ...body, folder_parent_id: data.folderId ?? null } });
      if (data.favorite) await ctx.call(`/favorites/resource/${encodeURIComponent(saved.id)}.json`, { method: 'POST' }).catch(() => null);
    }

    const item = {
      id: saved?.id ?? existing.id, accountId: config.id, provider: 'passbolt',
      type: data.type === 'note' ? 'note' : 'login', name: data.name, username: data.type === 'note' ? undefined : data.username || undefined,
      uris: data.type === 'note' ? [] : data.uris ?? [], description: existing?.description, folderId: data.folderId ?? null,
      favorite: !!data.favorite, canEdit: true, canDelete: existing?.canDelete ?? true, revisionDate: saved?.modified ?? new Date().toISOString(),
      lazy: true, revealed: true, slug, password: data.type === 'note' ? undefined : data.password, totp: totpObj ? totpUriFrom(totpObj) : undefined,
      notes: data.notes || undefined, hasPassword: data.type !== 'note', hasTotp: !!totpObj,
      fields: customFields ? customFields.map((f) => ({ name: f.name, value: String(f.value), type: { password: 'hidden', boolean: 'boolean' }[f.type] ?? 'text' })) : existing?.fields ?? [],
      secretArmored: mySecret, _secret: JSON.parse(slug === 'password-string' ? JSON.stringify({ password: secretText }) : secretText),
      _v5: v5, _meta: metaObj,
      _metadataKeyType: body.metadata_key_type ?? null, _metadataKeyId: body.metadata_key_id ?? null, _favoriteId: existing?._favoriteId ?? null,
    };
    return { item, session: ctx.renewed() };
  }

  static async createFolder(config, session, { name }) {
    const ctx = await this.#ctx(config, session);
    const settings = await ctx.call('/metadata/types/settings.json').catch(() => null);
    let body = { name, folder_parent_id: null };
    if (settings?.default_folder_type === 'v5') {
      const mk = await this.#sharedMetadataKey(ctx);
      const meta = { object_type: 'PASSBOLT_FOLDER_METADATA', name, color: null, description: null, icon: null };
      body = {
        folder_parent_id: null,
        metadata: await this.#encryptFor(JSON.stringify(meta), mk?.key ?? ctx.key.toPublic(), ctx.key),
        metadata_key_id: mk?.id ?? null, metadata_key_type: mk ? 'shared_key' : 'user_key',
      };
    }
    let saved;
    try {
      saved = await ctx.call('/folders.json', { method: 'POST', body });
    } catch (e) {
      // Passbolt 5.16 with its action log enabled rejects v5 folders (the log entry wants a plain name);
      // fall back to a plain folder where the server still allows them.
      if (!body.metadata || e.status !== 400 || !e.body?.name || settings?.allow_creation_of_v4_folders === false) throw e;
      saved = await ctx.call('/folders.json', { method: 'POST', body: { name, folder_parent_id: null } });
    }
    return { folder: { id: saved.id, name }, session: ctx.renewed() };
  }

  /* ---------- sharing ---------- */

  /** Who has access to a resource: [{ id, aro: 'User'|'Group', aroId, name, sub, type: 1 read | 7 update | 15 owner }]. */
  static async permissions(config, session, item) {
    const ctx = await this.#ctx(config, session);
    const perms = await ctx.call(`/permissions/resource/${encodeURIComponent(item.id)}.json?contain[user.profile]=1&contain[group]=1`);
    const name = (p) => (p.aro === 'User'
      ? [p.user?.profile?.first_name, p.user?.profile?.last_name].filter(Boolean).join(' ') || p.user?.username
      : p.group?.name) ?? p.aro_foreign_key;
    return {
      permissions: perms.map((p) => ({ id: p.id, aro: p.aro, aroId: p.aro_foreign_key, type: p.type, name: name(p), sub: p.aro === 'User' ? p.user?.username : t('Gruppe') })),
      session: ctx.renewed(),
    };
  }

  /** Users and groups to share with, matching `query`. */
  static async shareTargets(config, session, query) {
    const ctx = await this.#ctx(config, session);
    const aros = await ctx.call(`/share/search-aros.json?filter[search]=${encodeURIComponent(query)}`);
    return {
      targets: aros.map((a) => (a.username
        ? { aro: 'User', aroId: a.id, name: [a.profile?.first_name, a.profile?.last_name].filter(Boolean).join(' ') || a.username, sub: a.username }
        : { aro: 'Group', aroId: a.id, name: a.name, sub: t('Gruppe') })),
      session: ctx.renewed(),
    };
  }

  /**
   * Applies permission changes: [{ id } with type (change) or delete: true, or { aro, aroId, type } (add)].
   * New readers get the secret encrypted for them; a personal-key v5 resource is moved to the shared metadata key first.
   */
  static async share(config, session, item, changes) {
    const ctx = await this.#ctx(config, session);
    const id = encodeURIComponent(item.id);
    if (item._v5 && item._metadataKeyType === 'user_key') {
      const mk = await this.#sharedMetadataKey(ctx);
      if (!mk) throw new ProviderError(t('Zum Teilen braucht der Server einen gemeinsamen Metadaten-Schlüssel'), 'unsupported');
      await ctx.call(`/resources/${id}.json`, { method: 'PUT', body: {
        resource_type_id: item._meta.resource_type_id, metadata: await this.#encryptFor(JSON.stringify(item._meta), mk.key, ctx.key),
        metadata_key_id: mk.id, metadata_key_type: 'shared_key',
      } });
    }
    const permissions = changes.map((c) => (c.id
      ? (c.delete ? { id: c.id, delete: true } : { id: c.id, type: c.type })
      : { aro: c.aro, aro_foreign_key: c.aroId, type: c.type }));
    const dry = await ctx.call(`/share/simulate/resource/${id}.json`, { method: 'POST', body: { permissions } });
    const added = (dry?.changes?.added ?? []).map((a) => a.User?.id).filter(Boolean);
    const secrets = [];
    if (added.length) {
      const { text } = await decryptText(item.secretArmored, { decryptionKeys: ctx.key });
      for (const userId of added) {
        const u = await ctx.call(`/users/${encodeURIComponent(userId)}.json`);
        if (!u?.gpgkey?.armored_key) throw new ProviderError(t('Kein Schlüssel für {user}', { user: u?.username ?? userId }), 'crypto');
        secrets.push({ user_id: userId, data: await this.#encryptFor(text, await openpgp.readKey({ armoredKey: u.gpgkey.armored_key }), ctx.key) });
      }
    }
    await ctx.call(`/share/resource/${id}.json`, { method: 'PUT', body: { permissions, secrets } });
    return { session: ctx.renewed(), resync: true };
  }

  static async setFavorite(config, session, existing, favorite) {
    const ctx = await this.#ctx(config, session);
    let favoriteId = existing._favoriteId;
    if (favorite && !favoriteId) {
      const fav = await ctx.call(`/favorites/resource/${encodeURIComponent(existing.id)}.json`, { method: 'POST' });
      favoriteId = fav?.id ?? null;
    } else if (!favorite && favoriteId) {
      await ctx.call(`/favorites/${encodeURIComponent(favoriteId)}.json`, { method: 'DELETE' });
      favoriteId = null;
    }
    return { item: { ...existing, favorite: !!favorite, _favoriteId: favoriteId }, session: ctx.renewed() };
  }

  static async deleteItem(config, session, existing) {
    if (existing.canDelete === false) throw new ProviderError(t('Nur Besitzer können diesen Eintrag löschen'), 'forbidden');
    const ctx = await this.#ctx(config, session);
    await ctx.call(`/resources/${encodeURIComponent(existing.id)}.json`, { method: 'DELETE' });
    return { deletedId: existing.id, session: ctx.renewed() };
  }
}

export default PassboltProvider;
