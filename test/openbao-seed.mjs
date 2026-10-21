// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Seeds a local OpenBao dev server (test/openbao-server.sh, root token "root"): a userpass user with a policy for
// one KV v2 subtree, a token for it, and a few entries. Returns what the tests need.

export async function bao(base, method, path, body, token = 'root') {
  const res = await fetch(`${base}/v1/${path}`, {
    method, headers: { 'X-Vault-Token': token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok && res.status !== 404) throw new Error(`${method} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

/** Fresh subtree `<run>/` in secret/, user `ada-<run>` (password "ada-passwort") limited to it. */
export async function seedOpenBao(base) {
  const run = `ov${Date.now().toString(36)}`;
  const mounts = await bao(base, 'GET', 'sys/auth');
  if (!mounts.data?.['userpass/']) await bao(base, 'POST', 'sys/auth/userpass', { type: 'userpass' });
  const policy = `
path "secret/data/${run}/*"     { capabilities = ["create", "read", "update", "delete"] }
path "secret/metadata/${run}/*" { capabilities = ["list", "read", "delete"] }
path "secret/metadata/${run}"   { capabilities = ["list"] }
path "secret/undelete/${run}/*" { capabilities = ["update"] }
path "secret/data/${run}/geheim/*"     { capabilities = ["deny"] }
path "secret/metadata/${run}/geheim/*" { capabilities = ["deny"] }
`;
  await bao(base, 'PUT', `sys/policies/acl/${run}`, { policy });
  const user = `ada-${run}`;
  await bao(base, 'POST', `auth/userpass/users/${user}`, { password: 'ada-passwort', token_policies: run, token_ttl: '1h', token_max_ttl: '4h' });
  const tok = await bao(base, 'POST', 'auth/token/create', { policies: [run], ttl: '1h', renewable: true });
  const put = (p, data) => bao(base, 'POST', `secret/data/${run}/${p}`, { data });
  await put('web/github', { username: 'ada', password: 'gh-geheim', url: 'https://github.com', totp: 'JBSWY3DPEHPK3PXP', team: 'core' });
  await put('web/shop', { login: 'kunde', password: 'shop-geheim', website: 'http://localhost/login', notes: 'Kundennr. 7', port: 8080 });
  await put('server/db/prod', { user: 'postgres', password: 'db-geheim', uri: 'postgres://db.example' });
  await put('notiz', { notes: 'nur Text' });
  await put('geheim/x', { password: 'nicht-lesbar' });
  return { run, user, password: 'ada-passwort', token: tok.auth.client_token, put, read: (p) => bao(base, 'GET', `secret/data/${run}/${p}`) };
}
