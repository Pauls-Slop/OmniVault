// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Passbolt provider against the simulated server (fetch is mocked, with a tiny cookie jar).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { totp } from '../src/lib/totp.js';
import PassboltProvider from '../src/providers/passbolt/index.js';
import * as openpgp from '../vendor/openpgp.mjs';
import { ADMIN_ID, KEYS, USER_ID, fakePassbolt } from './fake-passbolt.js';

const DOMAIN = 'https://passbolt.example.org';

async function setup(opts = {}) {
  const fake = await fakePassbolt({ domain: DOMAIN, ...opts });
  const jar = new Map();
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    assert.equal(u.searchParams.get('api-version'), 'v2');
    const headers = { ...(init.headers ?? {}) };
    if (init.credentials === 'include' && jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const r = await fake.handle(u.pathname + u.search, { ...init, headers });
    const setCookie = r.headers?.['Set-Cookie'];
    if (setCookie) { const [kv] = setCookie.split(';'); const [k, v] = kv.split('='); jar.set(k, v); }
    return new Response(JSON.stringify(r.body), { status: r.status });
  };
  const user = opts.user ?? 'userRsa';
  return { fake, jar, config: { id: 'pb1', server: DOMAIN, userId: USER_ID, privateKey: KEYS[user].private }, pass: KEYS[user].passphrase };
}

for (const user of ['userRsa', 'userEcc']) {
  test(`${user}: JWT login, v4 + v5 resources, folders, session keys, lazy secrets`, async () => {
    const { fake, config, pass } = await setup({ user });
    const res = await PassboltProvider.login(config, { password: pass });
    assert.equal(res.status, 'ok');
    assert.equal(res.configPatch.serverFingerprint, KEYS.server.fingerprint, 'server key pinned');
    assert.ok(res.session.accessToken && res.session.refreshToken);
    assert.match(res.session.unlockedKey, /BEGIN PGP PRIVATE KEY/);

    const out = await PassboltProvider.sync({ ...config, ...res.configPatch }, res.session);
    assert.equal(out.warning, undefined);
    const by = Object.fromEntries(out.items.map((i) => [i.name, i]));
    assert.deepEqual(Object.keys(by).sort(), ['GitLab', 'Intranet', 'Router', 'Tresor-Notiz']);
    assert.equal(by.GitLab.username, 'ada@example.com', 'v5 shared-key metadata decrypted (admin signature verified)');
    assert.deepEqual(by.GitLab.uris, ['https://gitlab.example.com/users/sign_in']);
    assert.equal(by.GitLab.folder, 'Team/Infra', 'nested folder path');
    assert.equal(by.Intranet.folder, 'Team');
    assert.equal(by.Router.folder, undefined);
    assert.ok(by.GitLab.hasTotp && by.GitLab.hasPassword);
    assert.equal(by['Tresor-Notiz'].type, 'note', 'metadata opened via session key');
    assert.ok(out.items.every((i) => i.password === undefined), 'secrets not decrypted during sync');
    assert.ok(fake.log.includes('GET /metadata/session-keys.json'));
    assert.ok(fake.log.some((l) => l.startsWith('GET /users/')), 'signer key fetched');

    const reveal = (i) => PassboltProvider.reveal(config, res.session, i);
    assert.equal((await reveal(by.Router)).password, 'router-pw');
    const intranet = await reveal(by.Intranet);
    assert.equal(intranet.password, 'intranet-pw');
    assert.match(intranet.notes, /geheime Notiz/);
    const gitlab = await reveal(by.GitLab);
    assert.equal(gitlab.password, 'gitlab-pw');
    assert.equal((await totp(gitlab.totp, 59_000)).code.length, 6);
    assert.equal((await reveal(by['Tresor-Notiz'])).notes, 'Nur für mich');
  });
}

test('shared metadata key with an untrusted signature is rejected', async () => {
  const { config, pass } = await setup({ forgeMetadataKey: true });
  const res = await PassboltProvider.login(config, { password: pass });
  const out = await PassboltProvider.sync(config, res.session);
  assert.ok(!out.items.some((i) => i.name === 'GitLab'), 'resource behind forged key not shown');
  assert.match(out.warning, /Signatur/);
  assert.equal(out.items.length, 3);
});

test('wrong passphrase is rejected before contacting the server', async () => {
  const { fake, config } = await setup();
  await assert.rejects(PassboltProvider.login(config, { password: 'falsch' }), { code: 'bad_password', message: 'Falsche Passphrase' });
  assert.equal(fake.log.length, 0);
});

test('changed server key is refused (pinning)', async () => {
  const { config, pass } = await setup();
  await assert.rejects(
    PassboltProvider.login({ ...config, serverFingerprint: '0000000000000000000000000000000000000000' }, { password: pass }),
    { code: 'server_key_changed' });
});

test('TOTP MFA flow with passbolt_mfa cookie', async () => {
  const { config, pass, jar } = await setup({ mfa: true });
  const first = await PassboltProvider.login(config, { password: pass });
  assert.equal(first.status, 'needs_2fa');
  assert.deepEqual(first.twoFactorProviders.map((p) => p.id), ['totp']);
  await assert.rejects(PassboltProvider.login(config, { password: pass, twoFactorCode: '000000', twoFactorProvider: 'totp' }), /OTP/);
  const ok = await PassboltProvider.login(config, { password: pass, twoFactorCode: '123 456', twoFactorProvider: 'totp' });
  assert.equal(ok.status, 'ok');
  assert.ok(jar.has('passbolt_mfa'));
  const { items } = await PassboltProvider.sync(config, ok.session);
  assert.equal(items.length, 4);
  jar.clear();
  await assert.rejects(PassboltProvider.sync(config, ok.session), /Zweiter Faktor/);
});

test('expired access token is refreshed', async () => {
  const { fake, config, pass } = await setup();
  const res = await PassboltProvider.login(config, { password: pass });
  fake.expireAll(); // server forgets access tokens; refresh token still valid
  const { items, session } = await PassboltProvider.sync(config, res.session);
  assert.equal(items.length, 4);
  assert.notEqual(session.accessToken, res.session.accessToken);
  assert.ok(fake.log.includes('POST /auth/jwt/refresh.json'));
});

async function unlocked(opts = {}) {
  const env = await setup(opts);
  const res = await PassboltProvider.login(env.config, { password: env.pass });
  const out = await PassboltProvider.sync(env.config, res.session);
  const by = Object.fromEntries(out.items.map((i) => [i.name, i]));
  const revealed = async (i) => ({ ...i, ...(await PassboltProvider.reveal(env.config, res.session, i)), revealed: true });
  return { ...env, session: res.session, out, by, revealed };
}

test('permissions, favorites and public description are read', async () => {
  const { by, out } = await unlocked();
  assert.equal(by.Router.canEdit, false, 'read-only permission');
  assert.equal(by.GitLab.favorite, true);
  assert.equal(by.Intranet.description, 'öffentliche Beschreibung');
  assert.deepEqual(out.folders.map((f) => f.name), ['Team', 'Team/Infra']);
});

test('create a v5 login (shared metadata key) and a v5 note, then read them back', async () => {
  const { config, session, fake } = await unlocked();
  const { item } = await PassboltProvider.saveItem(config, session, null, {
    type: 'login', name: 'Wiki', username: 'ada', password: 'wiki-pw', totp: 'JBSWY3DPEHPK3PXP', uris: ['https://wiki.example'], notes: 'n1', folderId: 'f1', favorite: true,
  });
  const created = fake.resources.find((r) => r.id === item.id);
  assert.equal(created.resource_type_id, 'rt-v5totp');
  assert.equal(created.metadata_key_type, 'shared_key');
  assert.equal(created.folder_parent_id, 'f1');
  assert.ok(!('name' in created), 'no cleartext name for v5');
  assert.ok(created.favorite, 'favorite set');
  await PassboltProvider.saveItem(config, session, null, { type: 'note', name: 'Geheimnis', notes: 'nur Text' });
  const { items } = await PassboltProvider.sync(config, session);
  const wiki = items.find((i) => i.name === 'Wiki');
  assert.equal(wiki.username, 'ada');
  assert.equal(wiki.folder, 'Team');
  const r = await PassboltProvider.reveal(config, session, wiki);
  assert.equal(r.password, 'wiki-pw');
  assert.equal((await totp(r.totp, 59_000)).code.length, 6);
  const note = items.find((i) => i.name === 'Geheimnis');
  assert.equal(note.type, 'note');
  assert.equal((await PassboltProvider.reveal(config, session, note)).notes, 'nur Text');
});

test('v4 server: creates password-and-description resources', async () => {
  const { config, session, fake } = await unlocked({ defaultTypes: 'v4' });
  const { item } = await PassboltProvider.saveItem(config, session, null, { type: 'login', name: 'Alt', username: 'u', password: 'p', uris: ['https://alt.example'], notes: 'x' });
  const r = fake.resources.find((x) => x.id === item.id);
  assert.equal(r.resource_type_id, 'rt-pwd');
  assert.equal(r.name, 'Alt');
  await assert.rejects(PassboltProvider.saveItem(config, session, null, { type: 'note', name: 'N', notes: 'x' }), /v5/);
});

test('edit own v5 resource keeps its metadata key; shared resources get a secret per reader; read-only is refused', async () => {
  const { config, session, by, revealed, fake } = await unlocked();
  const gitlab = await revealed(by.GitLab);
  const { item } = await PassboltProvider.saveItem(config, session, gitlab, {
    type: 'login', name: 'GitLab EE', username: 'ada@example.com', password: 'gitlab-neu', totp: gitlab.totp, uris: gitlab.uris, notes: '', folderId: 'f1', favorite: true,
  });
  const stored = fake.resources.find((r) => r.id === item.id);
  assert.equal(stored.metadata_key_type, 'shared_key');
  assert.equal(stored.metadata_key_id, 'mk1');
  assert.equal(stored.folder_parent_id, 'f1', 'moved to another folder');
  const { items } = await PassboltProvider.sync(config, session);
  const after = items.find((i) => i.id === item.id);
  assert.equal(after.name, 'GitLab EE');
  assert.equal((await PassboltProvider.reveal(config, session, after)).password, 'gitlab-neu');
  // Intranet is shared with the admin: the edited secret is encrypted for both readers
  await PassboltProvider.saveItem(config, session, await revealed(by.Intranet), { type: 'login', name: 'Intranet', username: 'ada', password: 'intranet-neu', uris: [], notes: '' });
  const secrets = fake.sharedSecrets.r1;
  assert.deepEqual(secrets.map((x) => x.user_id).sort(), [ADMIN_ID, USER_ID].sort());
  const adminKey = await openpgp.decryptKey({ privateKey: await openpgp.readPrivateKey({ armoredKey: KEYS.userEcc.private }), passphrase: KEYS.userEcc.passphrase });
  const forAdmin = await openpgp.decrypt({ message: await openpgp.readMessage({ armoredMessage: secrets.find((x) => x.user_id === ADMIN_ID).data }), decryptionKeys: adminKey });
  assert.equal(JSON.parse(forAdmin.data).password, 'intranet-neu', 'the other reader can decrypt the new secret');
  await assert.rejects(PassboltProvider.saveItem(config, session, await revealed(by.Router), { type: 'login', name: 'x', uris: [] }), /Schreibberechtigung/);
});

test('favorite toggle and delete (owner only)', async () => {
  const { config, session, by, fake } = await unlocked();
  const fav = await PassboltProvider.setFavorite(config, session, by.Intranet, true);
  assert.equal(fav.item.favorite, true);
  assert.ok(fake.resources.find((r) => r.id === 'r1').favorite);
  const unfav = await PassboltProvider.setFavorite(config, session, by.GitLab, false);
  assert.equal(unfav.item.favorite, false);
  assert.equal(fake.resources.find((r) => r.id === 'r3').favorite, null);
  await PassboltProvider.deleteItem(config, session, by['Tresor-Notiz']);
  assert.ok(!fake.resources.some((r) => r.id === 'r4'));
  await assert.rejects(PassboltProvider.deleteItem(config, session, by.Router), /Besitzer/);
});
