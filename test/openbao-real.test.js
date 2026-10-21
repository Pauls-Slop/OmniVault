// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Vault / OpenBao provider against a REAL OpenBao (test/openbao-server.sh start).
// Usage: OPENBAO_URL=http://127.0.0.1:8820 node --test test/openbao-real.test.js  (skipped without OPENBAO_URL)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import VaultProvider from '../src/providers/vault/index.js';
import { bao, seedOpenBao } from './openbao-seed.mjs';

const BASE = process.env.OPENBAO_URL;
const skip = !BASE && 'OPENBAO_URL not set';
const seed = BASE ? await seedOpenBao(BASE) : null;

test('token login: list, lazy read, mapping, denied sub-path', { skip }, async () => {
  const config = { id: 'b1', server: BASE, auth: 'token', mount: 'secret', prefix: seed.run };
  await assert.rejects(VaultProvider.login(config, { password: 'kein-token' }), /Token ungültig/);
  const { session } = await VaultProvider.login(config, { password: seed.token });
  assert.ok(session.renewable && session.expiresAt);
  const out = await VaultProvider.sync(config, session);
  const by = Object.fromEntries(out.items.map((i) => [i.id, i]));
  assert.deepEqual(Object.keys(by).sort(), ['notiz', 'server/db/prod', 'web/github', 'web/shop']);
  assert.match(out.warning ?? '', /ohne Leserecht/, 'denied folder reported, not fatal');
  assert.equal(by['server/db/prod'].username, 'postgres');
  assert.equal(by['server/db/prod'].folder, 'server/db');
  assert.equal(by.notiz.type, 'note');
  assert.equal(by['web/github'].password, undefined);
  const gh = await VaultProvider.reveal(config, session, by['web/github']);
  assert.equal(gh.password, 'gh-geheim');
  assert.equal(gh.totp, 'JBSWY3DPEHPK3PXP');
  assert.deepEqual(gh.fields, [{ name: 'team', value: 'core', type: 'hidden' }]);
  const shop = await VaultProvider.reveal(config, session, by['web/shop']);
  assert.equal(shop.username, 'kunde');
  assert.deepEqual(shop.uris, ['http://localhost/login']);
  assert.deepEqual(shop.fields, [{ name: 'port', value: '8080', type: 'hidden' }]);
});

test('userpass login, renew-self, check-and-set conflict, move, delete, restore, purge', { skip }, async () => {
  const config = { id: 'b2', server: BASE, auth: 'userpass', username: seed.user, mount: 'secret', prefix: seed.run };
  await assert.rejects(VaultProvider.login(config, { password: 'falsch' }), /Benutzername oder Passwort falsch/);
  const { session } = await VaultProvider.login(config, { password: seed.password });
  assert.ok(session.token.length > 10 && session.renewable);

  // renewal when less than half of the lifetime is left
  const out0 = await VaultProvider.sync(config, { ...session, expiresAt: Date.now() + 60_000 });
  assert.ok(out0.session?.expiresAt > Date.now() + 30 * 60_000, 'renewed by renew-self');

  const { items } = out0;
  const shop = items.find((i) => i.id === 'web/shop');
  Object.assign(shop, await VaultProvider.reveal(config, session, shop));
  const saved = await VaultProvider.saveItem(config, session, shop, { ...shop, password: 'shop-neu', folderId: 'web' });
  assert.equal(saved.item._version, 2);
  let raw = await seed.read('web/shop');
  assert.deepEqual(raw.data.data, { login: 'kunde', password: 'shop-neu', website: 'http://localhost/login', notes: 'Kundennr. 7', port: 8080 },
    'key names and number type kept');

  // another client writes → OmniVault's stale edit is refused
  await seed.put('web/shop', { ...raw.data.data, password: 'anderer-client' });
  await assert.rejects(VaultProvider.saveItem(config, session, saved.item, { ...saved.item, password: 'veraltet' }), (e) => e.code === 'conflict');
  raw = await seed.read('web/shop');
  assert.equal(raw.data.data.password, 'anderer-client');

  // create (cas 0), then the same path again → refused
  const created = await VaultProvider.saveItem(config, session, null, { type: 'login', name: 'mail', username: 'm', password: 'mail-pw', uris: ['https://mail.example'], folderId: 'neu' });
  assert.equal(created.item.id, 'neu/mail');
  await assert.rejects(VaultProvider.saveItem(config, session, null, { type: 'login', name: 'mail', password: 'x', folderId: 'neu' }), /schon einen Eintrag/);

  // move into another folder
  const moved = await VaultProvider.saveItem(config, session, created.item, { ...created.item, folderId: 'web' });
  assert.equal(moved.item.id, 'web/mail');
  assert.equal(moved.deletedId, 'neu/mail');

  // soft delete → trash → undelete
  await VaultProvider.deleteItem(config, session, moved.item);
  let out = await VaultProvider.sync(config, session);
  assert.ok(!out.items.some((i) => i.id === 'web/mail'));
  const trashed = out.trash.find((i) => i.id === 'web/mail');
  assert.ok(trashed?.deletedDate, 'in the trash with its deletion time');
  assert.ok(out.trash.some((i) => i.id === 'neu/mail'), 'old path of the move in the trash');
  const restored = await VaultProvider.restoreItem(config, session, trashed);
  assert.equal(restored.item.password, 'mail-pw');
  out = await VaultProvider.sync(config, session);
  assert.ok(out.items.some((i) => i.id === 'web/mail'));

  // purge: metadata and all versions gone
  await VaultProvider.purgeItem(config, session, out.trash.find((i) => i.id === 'neu/mail'));
  const gone = await bao(BASE, 'GET', `secret/metadata/${seed.run}/neu/mail`);
  assert.ok(!gone?.data, 'metadata deleted');
});

test('wrong mount and revoked token', { skip }, async () => {
  await assert.rejects(VaultProvider.login({ id: 'b3', server: BASE, auth: 'token', mount: 'gibtsnicht' }, { password: 'root' }), /keine KV-Engine/);
  const tok = await bao(BASE, 'POST', 'auth/token/create', { policies: [seed.run], ttl: '1h' });
  const config = { id: 'b4', server: BASE, auth: 'token', mount: 'secret', prefix: seed.run };
  const { session } = await VaultProvider.login(config, { password: tok.auth.client_token });
  await bao(BASE, 'POST', 'auth/token/revoke', { token: tok.auth.client_token });
  await assert.rejects(VaultProvider.sync(config, session), (e) => e.code === 'session_expired');
});
