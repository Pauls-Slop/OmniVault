// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// SSO login against a real Vaultwarden with SSO enabled and a minimal local OpenID provider (test/fake-oidc.mjs).
// The browser tab is played by following the redirects by hand, cookies included.
// Run: npm run test:vaultwarden-sso (starts Vaultwarden with SSO pointing at the local provider), or by hand:
//      VW_PORT=8814 SSO_ENABLED=true SSO_AUTHORITY=http://127.0.0.1:8819 SSO_CLIENT_ID=vaultwarden \
//      SSO_CLIENT_SECRET=vw-secret HTTP_REQUEST_BLOCK_NON_GLOBAL_IPS=false test/vaultwarden-server.sh start
//      VAULTWARDEN_SSO_URL=http://localhost:8814 OIDC_PORT=8819 node --test test/vaultwarden-sso.test.js
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import BitwardenProvider from '../src/providers/bitwarden/index.js';
import { startOidc } from './fake-oidc.mjs';
import { seedVaultwarden } from './vaultwarden-seed.mjs';

const URL_ = process.env.VAULTWARDEN_SSO_URL;
const opts = { skip: !URL_ && 'VAULTWARDEN_SSO_URL nicht gesetzt' };
let oidc;
let seed;

before(async () => {
  if (!URL_) return;
  oidc = await startOidc({ port: Number(process.env.OIDC_PORT ?? 8819) });
  seed = await seedVaultwarden(URL_);
});
after(() => oidc?.close());

/** A browser tab: follows redirects (keeping cookies per host) until it reaches `stop`. */
async function tab(url, stop) {
  const jar = new Map();
  let u = new URL(url);
  for (let i = 0; i < 15; i++) {
    if (u.href.startsWith(stop)) return u.href;
    const r = await fetch(u, { redirect: 'manual', headers: jar.has(u.host) ? { Cookie: jar.get(u.host) } : {} });
    const set = r.headers.getSetCookie?.() ?? [];
    if (set.length) jar.set(u.host, [jar.get(u.host), ...set.map((c) => c.split(';')[0])].filter(Boolean).join('; '));
    const loc = r.headers.get('location');
    if (!loc) throw new Error(`stopped at ${u.href}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    u = new URL(loc, u);
  }
  throw new Error('too many redirects');
}

test('real Vaultwarden: SSO sign-in, code exchange with PKCE, then the master password', opts, async () => {
  oidc.state.email = seed.email;
  const config = { id: 'vws', server: URL_, email: seed.email, login: 'sso', ssoIdentifier: 'omnivault' };
  const first = await BitwardenProvider.login(config, {});
  assert.equal(first.status, 'needs_browser');
  Object.assign(config, first.configPatch);
  const back = await tab(first.browser.url, first.browser.returnUrl);
  assert.ok(back.startsWith(`${URL_}/sso-connector.html?`), back);
  assert.ok(oidc.state.log.includes('/authorize'), 'Vaultwarden sent the browser to the identity provider');

  const second = await BitwardenProvider.login(config, { pending: first.pending, browserUrl: back });
  assert.equal(second.status, 'needs_password', JSON.stringify(second));
  assert.ok(oidc.state.log.includes('/token'), 'Vaultwarden exchanged the code with the identity provider');
  await assert.rejects(BitwardenProvider.login(config, { pending: second.pending, password: 'falsch' }), { code: 'bad_password' });
  const done = await BitwardenProvider.login(config, { pending: second.pending, password: seed.password });
  assert.equal(done.status, 'ok');
  assert.ok(done.session.refreshToken, 'refresh token');

  const { items } = await BitwardenProvider.sync(config, done.session);
  assert.ok(items.some((i) => i.name === 'GitHub'));
  // refresh as after any login
  const { items: again } = await BitwardenProvider.sync(config, { ...done.session, expiresAt: 0 });
  assert.equal(again.length, items.length);
});

test('real Vaultwarden: SSO for an account without master password is refused clearly', opts, async () => {
  // an e-mail Vaultwarden does not know: SSO creates the user without keys or master password
  oidc.state.email = `sso-only-${Date.now()}@omnivault.test`;
  const config = { id: 'vws2', server: URL_, email: oidc.state.email, login: 'sso', ssoIdentifier: 'omnivault' };
  const first = await BitwardenProvider.login(config, {});
  Object.assign(config, first.configPatch);
  const back = await tab(first.browser.url, first.browser.returnUrl);
  await assert.rejects(BitwardenProvider.login(config, { pending: first.pending, browserUrl: back }),
    (e) => e.code === 'unsupported' && /Master-Passwort/.test(e.message));
});
