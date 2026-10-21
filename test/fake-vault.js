// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Simulated HashiCorp Vault / OpenBao server: token and userpass auth, renew-self, KV v2 (list, read, write with
// check-and-set, soft delete, undelete, metadata delete), optional namespace and forbidden paths. Used through fetch.

export function fakeVault({ mount = 'secret', namespace = null, users = { ada: 'ada-pw' }, ttl = 3600, denied = [] } = {}) {
  const tokens = new Map([['root', { ttl: 0, renewable: false }]]);
  const kv = new Map(); // path → { versions: [{ data, created, deleted }], current }
  const log = [];
  let clock = 0;
  const now = () => new Date(Date.UTC(2026, 0, 1, 0, 0, clock++)).toISOString();

  const put = (path, data) => {
    const e = kv.get(path) ?? { versions: [], current: 0 };
    e.versions.push({ data, created: now(), deleted: '' });
    e.current = e.versions.length;
    kv.set(path, e);
    return e;
  };
  const meta = (e, v = e.current) => ({ version: v, created_time: e.versions[v - 1].created, deletion_time: e.versions[v - 1].deleted, destroyed: false });

  const res = (status, body) => ({ status, body });
  const err = (status, ...errors) => res(status, { errors });

  function handle(method, url, headers, body) {
    const u = new URL(url);
    let path = decodeURIComponent(u.pathname.replace(/^\/v1\//, ''));
    log.push(`${method} ${path}${u.search}`);
    if (namespace && headers['X-Vault-Namespace'] !== namespace) return err(403, 'permission denied');
    if (method === 'POST' && path.startsWith('auth/userpass/login/')) {
      const user = path.split('/').pop();
      if (users[user] == null || users[user] !== body?.password) return err(400, 'invalid username or password');
      const token = `s.${user}.${tokens.size}`;
      tokens.set(token, { ttl, renewable: true, user });
      return res(200, { auth: { client_token: token, lease_duration: ttl, renewable: true, policies: ['default'] } });
    }
    const tok = tokens.get(headers['X-Vault-Token']);
    if (!tok) return err(403, 'permission denied');
    if (path === 'auth/token/lookup-self') return res(200, { data: { ttl: tok.ttl, renewable: tok.renewable } });
    if (path === 'auth/token/renew-self' && method === 'POST') {
      if (!tok.renewable) return err(400, 'lease is not renewable');
      tok.renewed = (tok.renewed ?? 0) + 1;
      return res(200, { auth: { client_token: headers['X-Vault-Token'], lease_duration: tok.ttl, renewable: true } });
    }
    const [m, kind, ...rest] = path.split('/');
    if (m !== mount) return err(404, `no handler for route "${path}". route entry not found.`);
    const rel = rest.join('/').replace(/\/$/, '');
    if (denied.some((d) => rel === d || rel.startsWith(`${d}/`))) return err(403, '1 error occurred:\n\t* permission denied\n\n');
    if (kind === 'metadata' && u.searchParams.get('list') === 'true') {
      const pre = rel ? `${rel}/` : '';
      const keys = new Set();
      for (const k of kv.keys()) {
        if (!k.startsWith(pre)) continue;
        const restKey = k.slice(pre.length);
        keys.add(restKey.includes('/') ? `${restKey.split('/')[0]}/` : restKey);
      }
      return keys.size ? res(200, { data: { keys: [...keys].sort() } }) : err(404);
    }
    const e = kv.get(rel);
    if (kind === 'data' && method === 'GET') {
      if (!e) return err(404);
      const v = e.versions[e.current - 1];
      if (v.deleted) return res(404, { data: { data: null, metadata: meta(e) } });
      return res(200, { data: { data: v.data, metadata: meta(e) } });
    }
    if (kind === 'data' && method === 'POST') {
      const cas = body?.options?.cas;
      if (cas != null && cas !== (e?.current ?? 0)) return err(400, 'check-and-set parameter did not match the current version');
      const ne = put(rel, body.data);
      return res(200, { data: meta(ne) });
    }
    if (kind === 'data' && method === 'DELETE') {
      if (e) e.versions[e.current - 1].deleted = now();
      return res(204, null);
    }
    if (kind === 'undelete' && method === 'POST') {
      for (const v of body?.versions ?? []) if (e?.versions[v - 1]) e.versions[v - 1].deleted = '';
      return res(204, null);
    }
    if (kind === 'metadata' && method === 'DELETE') { kv.delete(rel); return res(204, null); }
    return err(405, 'unsupported operation');
  }

  return {
    kv, log, tokens, put,
    install() {
      globalThis.fetch = async (url, init = {}) => {
        const r = handle(init.method ?? 'GET', url, init.headers ?? {}, init.body ? JSON.parse(init.body) : null);
        return new Response(r.body == null ? null : JSON.stringify(r.body), { status: r.status });
      };
    },
  };
}
