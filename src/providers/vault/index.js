// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// HashiCorp Vault / OpenBao provider (KV secrets engine, version 2), spoken to directly over the HTTP API.
// Login with a token or userpass; the token lives only in storage.session and is renewed (renew-self) while in use.
// A secret's path becomes folder + title; well-known keys (username, password, url, notes, totp and aliases) become
// login fields, every other key a hidden custom field. Writes use check-and-set, deletes are soft (trash + undelete).
import { mark, t, tn } from '../../i18n/index.js';
import { virtualFolder } from '../native-host.js';
import { Provider, ProviderError } from '../provider.js';

/** Limits of the recursive listing (each entry costs one request). */
export const LIMITS = { entries: 2000, depth: 12, parallel: 4 };

/** Keys read as login fields (first match wins); the first name is the one OmniVault writes for new entries. */
const ROLES = {
  username: ['username', 'login', 'user'],
  password: ['password'],
  url: ['url', 'uri', 'website'],
  notes: ['notes'],
  totp: ['totp', 'otp'],
};

export function baseUrl(server) {
  const s = String(server || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^/]+/.test(s)) throw new ProviderError(t('Bitte die vollständige Server-Adresse angeben (https://…)'), 'config');
  return s;
}

const clean = (p) => String(p ?? '').split('/').map((x) => x.trim()).filter((x) => x && x !== '.' && x !== '..');
const enc = (p) => clean(p).map(encodeURIComponent).join('/');

/** Mount and path prefix of an account: { mount: 'secret', prefix: ['team'] }. */
function location(config) {
  const mount = clean(config.mount || 'secret').join('/');
  if (!mount) throw new ProviderError(t('Ungültiger Mount'), 'config');
  return { mount, prefix: clean(config.prefix) };
}

const isTokenError = (msg) => /permission denied|invalid token|bad token|token.*(expired|revoked)/i.test(msg);

/** One API call → parsed JSON (or null for 204/404 without body). Throws ProviderError with a readable message. */
async function api(config, path, { method = 'GET', token, body, allow404 = false } = {}) {
  const base = baseUrl(config.server);
  let res;
  try {
    res = await fetch(`${base}/v1/${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'X-Vault-Request': 'true',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { 'X-Vault-Token': token } : {}),
        ...(config.namespace?.trim() ? { 'X-Vault-Namespace': config.namespace.trim() } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ProviderError(t('Server nicht erreichbar ({base}): {error}', { base, error: e.message }), 'network');
  }
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (res.ok) return json;
  if (res.status === 404 && allow404) return { notFound: true, ...json };
  const msg = (json?.errors ?? []).filter(Boolean).join('; ') || `HTTP ${res.status}`;
  if (res.status === 429) throw new ProviderError(t('Zu viele Anfragen – der Server bremst gerade (Rate-Limit). Bitte etwa eine Minute warten.'), 'rate_limited');
  if (res.status === 503 && /sealed/i.test(msg)) throw new ProviderError(t('Der Server ist versiegelt (sealed). Bitte zuerst entsiegeln.'), 'server');
  if (res.status === 403) {
    const err = new ProviderError(isTokenError(msg) ? t('Zugriff verweigert – Token ungültig, abgelaufen oder ohne Berechtigung für diesen Pfad') : msg, 'forbidden');
    err.tokenError = isTokenError(msg);
    throw err;
  }
  if (res.status === 400 && /check-and-set/i.test(msg)) {
    throw new ProviderError(t('Der Eintrag wurde inzwischen auf dem Server geändert. Bitte synchronisieren und erneut bearbeiten.'), 'conflict');
  }
  throw new ProviderError(t('Server-Fehler: {error}', { error: msg }), 'server');
}

/** Session from a token description (auth block of a login or data of lookup-self). */
function sessionFrom(token, ttl, renewable) {
  return { token, ttl: ttl || 0, renewable: !!renewable, expiresAt: ttl ? Date.now() + ttl * 1000 : null };
}

const str = (v) => (v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v));

/** Secret data (key → value) → item fields; `keys` remembers which key held which role. */
export function mapData(data = {}) {
  const keys = {};
  const used = new Set();
  for (const [role, names] of Object.entries(ROLES)) {
    const lower = Object.keys(data).filter((k) => names.includes(k.toLowerCase()));
    const k = names.map((n) => lower.find((x) => x.toLowerCase() === n)).find(Boolean);
    if (k) { keys[role] = k; used.add(k); }
  }
  const v = (role) => (keys[role] ? str(data[keys[role]]) : '');
  const fields = Object.keys(data).filter((k) => !used.has(k)).sort((a, b) => a.localeCompare(b))
    .map((k) => ({ name: k, value: str(data[k]), type: 'hidden' }));
  const totp = v('totp').trim();
  return {
    username: v('username') || undefined,
    password: v('password') || undefined,
    uris: v('url').split(/\s+/).filter(Boolean),
    notes: v('notes') || undefined,
    totp: totp || undefined,
    fields,
    keys,
  };
}

/** Item fields from the editor → secret data, keeping key names and non-string values the user did not change. */
export function buildData(d, previous = null) {
  const keys = previous?.keys ?? {};
  const raw = previous?.raw ?? {};
  const out = {};
  const put = (role, value) => {
    if (value == null || value === '') return;
    out[keys[role] ?? ROLES[role][0]] = value;
  };
  put('username', d.username);
  put('password', d.password);
  put('url', (d.uris ?? []).filter(Boolean).join('\n'));
  put('notes', d.notes);
  put('totp', d.totp);
  for (const f of d.fields ?? []) {
    const name = String(f.name ?? '').trim();
    if (!name || name in out) continue;
    const value = f.type === 'boolean' ? String(f.value === true || f.value === 'true') : String(f.value ?? '');
    // a number, list or object read from the server comes back unchanged unless it was edited
    out[name] = name in raw && typeof raw[name] !== 'string' && str(raw[name]) === value ? raw[name] : value;
  }
  return out;
}

/** Runs fn over items with at most `n` at a time. */
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k], k); }
  }));
}

class VaultProvider extends Provider {
  static id = 'vault';
  static label = 'HashiCorp Vault / OpenBao';
  static status = 'ready';
  static note = mark('KV-Geheimnisse (Version 2) eines HashiCorp-Vault- oder OpenBao-Servers. Pfade werden zu Ordnern, Schlüssel wie username, password, url, notes und totp zu Login-Feldern.');
  static unlockLabel = mark('Token');
  /** The unlock field asks for what the chosen login method needs. */
  static unlockLabelField = 'auth';
  static unlockLabels = { token: mark('Token'), userpass: mark('Passwort') };
  static capabilities = {
    write: true, types: ['login', 'note'], fields: true, favorites: false, createFolder: true, moveFolder: true,
    trash: true, restore: true,
  };
  static configFields = [
    { name: 'server', label: mark('Server-Adresse'), type: 'url', required: true, placeholder: 'https://vault.example.org:8200' },
    {
      name: 'auth', label: mark('Anmeldung'), type: 'select', default: 'token',
      options: [
        { value: 'token', label: mark('Token') },
        { value: 'userpass', label: mark('Benutzername und Passwort (userpass)') },
      ],
    },
    { name: 'username', label: mark('Benutzername'), type: 'text', required: true, showWhen: { field: 'auth', value: 'userpass' } },
    { name: 'mount', label: mark('KV-Mount'), type: 'text', default: 'secret', required: true },
    { name: 'prefix', label: mark('Pfad-Präfix (optional)'), type: 'text', placeholder: 'team/web', hint: mark('Nur Geheimnisse unterhalb dieses Pfads werden angezeigt.') },
    { name: 'namespace', label: mark('Namespace (optional)'), type: 'text', placeholder: 'admin/team' },
  ];

  static hostPatterns(config) {
    try { return [`${new URL(baseUrl(config.server)).origin}/*`]; } catch { return []; }
  }

  /** Called with the number of entries read so far during a sync (set by the background page). */
  static onProgress = null;

  /* ---------- login and token ---------- */

  static async login(config, creds) {
    const secret = String(creds.password ?? '').trim();
    if (!secret) throw new ProviderError(t('Bitte Token bzw. Passwort eingeben'), 'bad_password');
    let session;
    if ((config.auth || 'token') === 'userpass') {
      const user = String(config.username ?? '').trim();
      if (!user) throw new ProviderError(t('Bitte den Benutzernamen im Konto eintragen'), 'config');
      let r;
      try {
        r = await api(config, `auth/userpass/login/${encodeURIComponent(user)}`, { method: 'POST', body: { password: creds.password } });
      } catch (e) {
        if (e.code === 'server' && /invalid (username|password)/i.test(e.message)) throw new ProviderError(t('Benutzername oder Passwort falsch'), 'bad_password');
        throw e;
      }
      if (!r?.auth?.client_token) throw new ProviderError(t('Server lieferte kein Token'), 'server');
      session = sessionFrom(r.auth.client_token, r.auth.lease_duration, r.auth.renewable);
    } else {
      let r;
      try {
        r = await api(config, 'auth/token/lookup-self', { token: secret });
      } catch (e) {
        if (e.code === 'forbidden') throw new ProviderError(t('Token ungültig oder abgelaufen'), 'bad_password');
        throw e;
      }
      session = sessionFrom(secret, r?.data?.ttl, r?.data?.renewable);
    }
    // a first listing shows at once whether mount and prefix are right
    await this.#list(config, session.token, location(config).prefix.join('/'), true);
    return { status: 'ok', session };
  }

  /** Renews a renewable token once less than half of its lifetime is left. */
  static async #fresh(config, session) {
    if (session.expiresAt && Date.now() >= session.expiresAt) throw new ProviderError(t('Sitzung abgelaufen – bitte neu anmelden'), 'session_expired');
    if (!session.renewable || !session.expiresAt || session.expiresAt - Date.now() > session.ttl * 500) return session;
    try {
      const r = await api(config, 'auth/token/renew-self', { method: 'POST', token: session.token, body: {} });
      return { ...session, ...sessionFrom(session.token, r?.auth?.lease_duration ?? session.ttl, r?.auth?.renewable ?? session.renewable) };
    } catch (e) {
      if (e.tokenError) throw new ProviderError(t('Sitzung abgelaufen – bitte neu anmelden'), 'session_expired');
      throw e;
    }
  }

  /** Runs fn(token) with a fresh token; returns { result, session } (session only when it changed). */
  static async #with(config, session, fn) {
    const s = await this.#fresh(config, session);
    try {
      return { result: await fn(s.token), session: s !== session ? s : undefined };
    } catch (e) {
      // "permission denied" means a missing policy or a dead token; only the latter locks the account
      if (e.tokenError && !await api(config, 'auth/token/lookup-self', { token: s.token }).then(() => true, () => false)) {
        throw new ProviderError(t('Sitzung abgelaufen – bitte neu anmelden'), 'session_expired');
      }
      throw e;
    }
  }

  /* ---------- reading ---------- */

  static async #list(config, token, rel, root = false) {
    const { mount } = location(config);
    const r = await api(config, `${mount}/metadata/${enc(rel)}${rel ? '/' : ''}?list=true`, { token, allow404: true });
    if (r?.notFound) {
      if (root && /no handler|unsupported path/i.test((r.errors ?? []).join(' '))) {
        throw new ProviderError(t('Unter „{mount}“ ist keine KV-Engine (Version 2) eingehängt', { mount }), 'config');
      }
      return [];
    }
    return r?.data?.keys ?? [];
  }

  /** Reads one secret: { data, metadata } or { deleted metadata } for a soft-deleted current version, or null. */
  static async #read(config, token, path) {
    const { mount } = location(config);
    const r = await api(config, `${mount}/data/${enc(path)}`, { token, allow404: true });
    if (r?.notFound) return r.data?.metadata ? { data: null, metadata: r.data.metadata } : null;
    return { data: r?.data?.data ?? {}, metadata: r?.data?.metadata ?? {} };
  }

  /** Item for a path relative to the account's prefix. Secret values are kept only when `full`. */
  static #item(config, rel, res, full) {
    const parts = clean(rel);
    const name = parts.pop();
    const folder = parts.join('/') || null;
    const m = mapData(res.data ?? {});
    const base = {
      id: rel, accountId: config.id, provider: 'vault', type: m.password ? 'login' : 'note',
      name, username: m.username, uris: m.uris, folderId: folder, folder: folder ?? undefined, favorite: false,
      canEdit: true, canDelete: true,
      revisionDate: res.metadata?.created_time || undefined,
      _version: res.metadata?.version ?? 0,
    };
    if (full) return { ...base, password: m.password, totp: m.totp, notes: m.notes, fields: m.fields, _keys: m.keys, _raw: res.data };
    return { ...base, lazy: true, hasPassword: !!m.password, hasTotp: !!m.totp };
  }

  static async sync(config, session) {
    const { prefix } = location(config);
    return this.#with(config, session, async (token) => {
      // 1. walk the tree breadth-first
      const paths = [];
      const folders = new Set();
      let level = [''];
      let truncated = false;
      let denied = 0;
      for (let depth = 0; level.length && depth < LIMITS.depth; depth++) {
        const next = [];
        await pool(level, LIMITS.parallel, async (dir) => {
          const abs = [...prefix, ...clean(dir)].join('/');
          let keys;
          try { keys = await this.#list(config, token, abs, depth === 0); } catch (e) {
            if (depth === 0 || e.code !== 'forbidden') throw e;
            denied++; return; // a sub-folder the token may not list
          }
          for (const k of keys) {
            const rel = dir ? `${dir}/${k}` : k;
            if (k.endsWith('/')) { next.push(rel.replace(/\/+$/, '')); folders.add(rel.replace(/\/+$/, '')); } else if (paths.length < LIMITS.entries) paths.push(rel);
            else truncated = true;
          }
        });
        if (depth === LIMITS.depth - 1 && next.length) truncated = true;
        level = next;
      }
      // 2. read each entry once: version, trash state and the non-secret login fields
      const items = [];
      const trash = [];
      let done = 0;
      await pool(paths, LIMITS.parallel, async (rel) => {
        let res;
        try { res = await this.#read(config, token, [...prefix, rel].join('/')); } catch (e) {
          if (e.code !== 'forbidden') throw e;
          res = null; denied++;
        }
        done++;
        if (done % 10 === 0 || done === paths.length) this.onProgress?.(config.id, done, paths.length);
        if (!res || res.metadata?.destroyed) return;
        const item = this.#item(config, rel, res, false);
        if (res.data === null) trash.push({ ...item, deletedDate: res.metadata.deletion_time, lazy: false, hasPassword: false });
        else items.push(item);
      });
      items.sort((a, b) => a.id.localeCompare(b.id));
      const warning = [
        truncated ? t('Nur ein Teil geladen: höchstens {n} Einträge und {depth} Ordnerebenen', { n: LIMITS.entries, depth: LIMITS.depth }) : '',
        denied ? tn(denied, '{n} Pfad ohne Leserecht übersprungen', '{n} Pfade ohne Leserecht übersprungen') : '',
      ].filter(Boolean).join('; ') || undefined;
      return {
        items, trash,
        folders: [...folders].sort().map((f) => ({ id: f, name: f })),
        warning,
      };
    }).then(({ result, session: s }) => ({ ...result, session: s }));
  }

  /** Reads the secret values of one entry (and its current version for check-and-set). */
  static async reveal(config, session, item) {
    const { prefix } = location(config);
    const { result } = await this.#with(config, session, (token) => this.#read(config, token, [...prefix, item.id].join('/')));
    if (!result?.data) throw new ProviderError(t('Eintrag nicht gefunden oder Tresor gesperrt'), 'not_found');
    const full = this.#item(config, item.id, result, true);
    return {
      username: full.username, uris: full.uris, type: full.type, password: full.password, totp: full.totp, notes: full.notes,
      fields: full.fields, revisionDate: full.revisionDate, _version: full._version, _keys: full._keys, _raw: full._raw,
    };
  }

  /* ---------- writing ---------- */

  static async #write(config, token, rel, data, cas) {
    const { mount, prefix } = location(config);
    const r = await api(config, `${mount}/data/${enc([...prefix, rel].join('/'))}`, { method: 'POST', token, body: { data, options: { cas } } });
    return r?.data ?? {};
  }

  static #target(data, existing) {
    // a name with slashes ("web/github") puts the entry into sub-folders, as in Vault itself
    const name = clean(data.name);
    if (!name.length) throw new ProviderError(t('Ungültiger Name'), 'config');
    const folder = data.folderId !== undefined ? data.folderId : existing?.folderId ?? null;
    return [...clean(folder), ...name].join('/');
  }

  static async saveItem(config, session, existing, data) {
    const rel = this.#target(data, existing);
    const body = buildData(data, existing ? { keys: existing._keys, raw: existing._raw } : null);
    const { result, session: s } = await this.#with(config, session, async (token) => {
      if (existing && rel === existing.id) {
        const meta = await this.#write(config, token, rel, body, existing._version ?? 0);
        return { meta };
      }
      // new path (new entry, renamed or moved): create it only if nothing lives there yet
      let meta;
      try {
        meta = await this.#write(config, token, rel, body, 0);
      } catch (e) {
        if (e.code === 'conflict') throw new ProviderError(t('Unter „{path}“ gibt es schon einen Eintrag', { path: rel }), 'conflict');
        throw e;
      }
      // the old path is deleted softly, so it can still be restored from the trash
      if (existing) await this.#softDelete(config, token, existing.id);
      return { meta, moved: !!existing };
    });
    const item = this.#item(config, rel, { data: body, metadata: result.meta }, true);
    return { item: { ...item, revealed: true }, deletedId: result.moved ? existing.id : undefined, session: s };
  }

  static async #softDelete(config, token, rel) {
    const { mount, prefix } = location(config);
    await api(config, `${mount}/data/${enc([...prefix, rel].join('/'))}`, { method: 'DELETE', token });
  }

  /** Soft delete of the current version: it goes to the trash and can be restored (undelete). */
  static async deleteItem(config, session, existing) {
    const { session: s } = await this.#with(config, session, (token) => this.#softDelete(config, token, existing.id));
    return { deletedId: existing.id, session: s };
  }

  static async restoreItem(config, session, existing) {
    const { mount, prefix } = location(config);
    const path = enc([...prefix, existing.id].join('/'));
    const { result, session: s } = await this.#with(config, session, async (token) => {
      await api(config, `${mount}/undelete/${path}`, { method: 'POST', token, body: { versions: [existing._version] } });
      return this.#read(config, token, [...prefix, existing.id].join('/'));
    });
    if (!result?.data) throw new ProviderError(t('Wiederherstellen fehlgeschlagen'), 'server');
    return { item: { ...this.#item(config, existing.id, result, true), revealed: true }, session: s };
  }

  /** Removes the entry with all its versions and metadata for good. */
  static async purgeItem(config, session, existing) {
    const { mount, prefix } = location(config);
    const { session: s } = await this.#with(config, session, (token) => api(config, `${mount}/metadata/${enc([...prefix, existing.id].join('/'))}`, { method: 'DELETE', token }));
    return { purgedId: existing.id, session: s };
  }

  /** A folder is a path; it exists as soon as an entry is saved into it. */
  static async createFolder(config, session, { name }) {
    return { folder: virtualFolder(name) };
  }

  static async setFavorite() {
    throw new ProviderError(t('{provider}: Favoriten werden nicht unterstützt', { provider: this.label }), 'unsupported');
  }
}

export default VaultProvider;
