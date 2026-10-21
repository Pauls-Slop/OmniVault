// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Bitwarden login steps outside the popup: Duo Universal Prompt and Enterprise SSO (with master password), against
// the simulated server (fetch mocked; the "tab" is followed by hand: Duo's / the identity provider's redirects).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import BitwardenProvider from '../src/providers/bitwarden/index.js';
import { EMAIL, PASSWORD, fakeBitwarden } from './fake-bitwarden.js';

const ORIGIN = 'https://vault.example.org';
const KDF = { kdf: 0, kdfIterations: 5000 };

async function server(opts) {
  const handle = await fakeBitwarden({ kdf: KDF, origin: ORIGIN, ...opts });
  const seen = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    seen.push({ url: u.href, headers: init.headers ?? {} });
    const body = init.body instanceof URLSearchParams ? init.body.toString() : init.body;
    const r = handle(u.pathname, { ...init, body, query: u.searchParams });
    return new Response(JSON.stringify(r.body), { status: r.status });
  };
  return { handle, seen };
}

/** What a browser tab does with the address: follow the simulated server's redirects until a page is shown. */
async function browse(handle, url) {
  let u = new URL(url);
  for (let i = 0; i < 10; i++) {
    const r = handle(u.pathname, { query: u.searchParams });
    if (r.status === 302) { u = new URL(r.headers.Location, u); continue; }
    return { url: u.href, html: r.html ?? '' };
  }
  throw new Error('too many redirects');
}

/** Clicks the link with the id on the shown page. */
function click(handle, page, id) {
  const href = new RegExp(`id="${id}" href="([^"]+)"`).exec(page.html)?.[1];
  assert.ok(href, `link #${id} on ${page.url}`);
  return browse(handle, new URL(href.replace(/&amp;/g, '&'), page.url).href);
}

test('Duo: the server names Duo’s address, OmniVault waits for the connector page and finishes the login', async () => {
  const { handle, seen } = await server({ duo: 2 });
  const config = { id: 'a', server: ORIGIN, email: EMAIL };
  const first = await BitwardenProvider.login(config, { password: PASSWORD });
  assert.equal(first.status, 'needs_browser', 'only Duo → straight to the tab');
  assert.equal(first.browser.kind, 'duo');
  assert.equal(first.browser.url, handle.flow.duoUrls[0], 'the address the server gave');
  assert.equal(first.browser.returnUrl, `${ORIGIN}/duo-redirect-connector.html?client=browser`, 'return address as the server builds it');
  assert.equal(seen.find((s) => s.url.endsWith('/connect/token')).headers['Bitwarden-Client-Name'], 'browser');
  assert.ok(first.pending.masterKey && first.pending.grant.hash, 'the master key waits in the background, not in the popup');

  const duoPage = await browse(handle, first.browser.url);
  const back = await click(handle, duoPage, 'duo-approve');
  assert.ok(back.url.startsWith(`${ORIGIN}/duo-redirect-connector.html?`), back.url);

  const done = await BitwardenProvider.login({ ...config, deviceId: first.configPatch.deviceId }, { pending: first.pending, browserUrl: back.url });
  assert.equal(done.status, 'ok');
  const form = handle.flow.tokenForms.at(-1);
  assert.equal(form.twoFactorProvider, '2');
  assert.match(form.twoFactorToken, /^duo[a-z0-9]+\|st[0-9a-f]+$/, 'twoFactorToken = code|state');
  const { items } = await BitwardenProvider.sync(config, done.session);
  assert.equal(items.find((i) => i.id === 'c1').password, 'gh-pass');
});

test('Duo (organization) with Duo’s duo_code parameter; a foreign state is refused', async () => {
  const { handle } = await server({ duo: 6, duoCodeParam: 'duo_code' });
  const config = { id: 'a', server: ORIGIN, email: EMAIL, deviceId: 'dev-1' };
  const first = await BitwardenProvider.login(config, { password: PASSWORD });
  assert.equal(first.status, 'needs_browser');
  assert.equal(first.pending.provider, 6);
  const back = await click(handle, await browse(handle, first.browser.url), 'duo-approve');
  assert.match(back.url, /duo_code=/);

  const forged = new URL(back.url);
  forged.searchParams.set('state', 'stOTHER');
  await assert.rejects(BitwardenProvider.login(config, { pending: first.pending, browserUrl: forged.href }), /passt nicht/);

  const done = await BitwardenProvider.login(config, { pending: first.pending, browserUrl: back.url });
  assert.equal(done.status, 'ok');
  assert.equal(handle.flow.tokenForms.at(-1).twoFactorProvider, '6');
});

test('Duo next to TOTP: the user chooses; choosing Duo opens the tab', async () => {
  const { handle } = await server({ duo: 2 });
  // let the challenge list two methods
  const orig = handle;
  const config = { id: 'a', server: ORIGIN, email: EMAIL, deviceId: 'dev-1' };
  const inner = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const r = await inner(url, init);
    if (!url.endsWith('/connect/token') || r.status !== 400) return r;
    const b = await r.json();
    b.TwoFactorProviders2 = { 0: null, ...b.TwoFactorProviders2 };
    return new Response(JSON.stringify(b), { status: 400 });
  };
  const first = await BitwardenProvider.login(config, { password: PASSWORD });
  assert.equal(first.status, 'needs_2fa');
  assert.deepEqual(first.twoFactorProviders.map((p) => p.id), ['0', '2']);
  const duo = await BitwardenProvider.login(config, { password: PASSWORD, twoFactorProvider: '2' });
  assert.equal(duo.status, 'needs_browser');
  assert.ok(orig.flow.duoUrls.length >= 2);
});

test('Duo: the server named no address → clear message', async () => {
  await server({ duo: 2 });
  const inner = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const r = await inner(url, init);
    if (!url.endsWith('/connect/token') || r.status !== 400) return r;
    return new Response(JSON.stringify({ error: 'invalid_grant', TwoFactorProviders2: { 2: null } }), { status: 400 });
  };
  await assert.rejects(BitwardenProvider.login({ id: 'a', server: ORIGIN, email: EMAIL }, { password: PASSWORD }), /keine Duo-Adresse/);
});

test('SSO: prevalidate, authorize with PKCE and the fixed return address, code exchange, then the master password', async () => {
  const { handle, seen } = await server({ sso: { identifier: 'acme' } });
  const config = { id: 'a', server: ORIGIN, email: EMAIL, login: 'sso', ssoIdentifier: 'acme' };
  const first = await BitwardenProvider.login(config, {});
  assert.equal(first.status, 'needs_browser');
  assert.equal(first.browser.kind, 'sso');
  assert.equal(first.browser.returnUrl, `${ORIGIN}/sso-connector.html`);
  assert.ok(seen[0].url.startsWith(`${ORIGIN}/identity/sso/prevalidate?domainHint=acme`));
  const authorize = new URL(first.browser.url);
  assert.equal(authorize.origin + authorize.pathname, `${ORIGIN}/identity/connect/authorize`);
  for (const [k, v] of Object.entries({ client_id: 'browser', redirect_uri: `${ORIGIN}/sso-connector.html`, domain_hint: 'acme', scope: 'api offline_access', code_challenge_method: 'S256', ssoToken: 'SSOTOKEN1' })) {
    assert.equal(authorize.searchParams.get(k), v, k);
  }
  assert.ok(!JSON.stringify(first.pending).includes(PASSWORD));

  const idp = await browse(handle, first.browser.url);
  assert.match(idp.html, /Company sign-in/);
  const back = await click(handle, idp, 'idp-approve');
  assert.ok(back.url.startsWith(`${ORIGIN}/sso-connector.html?code=`), back.url);

  const cfg2 = { ...config, deviceId: first.configPatch.deviceId };
  const second = await BitwardenProvider.login(cfg2, { pending: first.pending, browserUrl: back.url });
  assert.equal(second.status, 'needs_password');
  const exchange = handle.flow.tokenForms.at(-1);
  assert.equal(exchange.grant_type, 'authorization_code');
  assert.equal(exchange.redirect_uri, `${ORIGIN}/sso-connector.html`);
  assert.ok(exchange.code_verifier);
  assert.equal(second.pending.kdf.kdfIterations, KDF.kdfIterations, 'KDF from the token response');

  const before = handle.flow.tokenForms.length;
  await assert.rejects(BitwardenProvider.login(cfg2, { pending: second.pending, password: 'wrong' }), { code: 'bad_password' });
  const done = await BitwardenProvider.login(cfg2, { pending: second.pending, password: PASSWORD });
  assert.equal(done.status, 'ok');
  assert.equal(handle.flow.tokenForms.length, before, 'the master password only decrypts – no further request');
  assert.equal(done.session.refreshToken, 'RT1', 'refresh as with a password login');
  const { items } = await BitwardenProvider.sync(cfg2, { ...done.session, expiresAt: 0 });
  assert.equal(items.find((i) => i.id === 'c1').password, 'gh-pass');
  assert.equal(handle.flow.tokenForms.at(-1).grant_type, 'refresh_token');
});

test('SSO with a second factor: the code grant is repeated with TOTP', async () => {
  const { handle } = await server({ sso: { identifier: 'acme' }, ssoTwoFactor: true });
  const config = { id: 'a', server: ORIGIN, email: EMAIL, login: 'sso', ssoIdentifier: 'acme', deviceId: 'dev-1' };
  const first = await BitwardenProvider.login(config, {});
  const back = await click(handle, await browse(handle, first.browser.url), 'idp-approve');
  const second = await BitwardenProvider.login(config, { pending: first.pending, browserUrl: back.url });
  assert.equal(second.status, 'needs_2fa');
  assert.equal(second.pending.kind, 'code');
  const third = await BitwardenProvider.login(config, { pending: second.pending, twoFactorProvider: '0', twoFactorCode: '123 456' });
  assert.equal(third.status, 'needs_password');
  const ok = await BitwardenProvider.login(config, { pending: third.pending, password: PASSWORD });
  assert.equal(ok.status, 'ok');
});

test('SSO with Duo after the sign-in', async () => {
  const { handle } = await server({ sso: { identifier: 'acme' }, duo: 2 });
  const config = { id: 'a', server: ORIGIN, email: EMAIL, login: 'sso', ssoIdentifier: 'acme', deviceId: 'dev-1' };
  const first = await BitwardenProvider.login(config, {});
  const back = await click(handle, await browse(handle, first.browser.url), 'idp-approve');
  const duo = await BitwardenProvider.login(config, { pending: first.pending, browserUrl: back.url });
  assert.equal(duo.status, 'needs_browser');
  assert.equal(duo.browser.kind, 'duo');
  const duoBack = await click(handle, await browse(handle, duo.browser.url), 'duo-approve');
  const pw = await BitwardenProvider.login(config, { pending: duo.pending, browserUrl: duoBack.url });
  assert.equal(pw.status, 'needs_password');
  assert.equal((await BitwardenProvider.login(config, { pending: pw.pending, password: PASSWORD })).status, 'ok');
});

test('SSO: unknown organization identifier and a denied sign-in are reported', async () => {
  const { handle } = await server({ sso: { identifier: 'acme' } });
  const config = { id: 'a', server: ORIGIN, email: EMAIL, login: 'sso', ssoIdentifier: 'other', deviceId: 'd' };
  await assert.rejects(BitwardenProvider.login(config, {}), /Organization not found/);
  const ok = { ...config, ssoIdentifier: 'acme' };
  const first = await BitwardenProvider.login(ok, {});
  void handle;
  const denied = `${ORIGIN}/sso-connector.html?error=access_denied&error_description=User%20cancelled&state=${first.pending.state}`;
  await assert.rejects(BitwardenProvider.login(ok, { pending: first.pending, browserUrl: denied }), /User cancelled/);
});

for (const [kind, re] of [['tde', /vertrauenswürdige Geräte/], ['keyconnector', /Key Connector/], [false, /kein Master-Passwort/]]) {
  test(`account without master password (${kind || 'none'}) → clear message`, async () => {
    const { handle } = await server({ sso: { identifier: 'acme' }, masterPassword: kind });
    const config = { id: 'a', server: ORIGIN, email: EMAIL, login: 'sso', ssoIdentifier: 'acme', deviceId: 'd' };
    const first = await BitwardenProvider.login(config, {});
    const back = await click(handle, await browse(handle, first.browser.url), 'idp-approve');
    await assert.rejects(BitwardenProvider.login(config, { pending: first.pending, browserUrl: back.url }), (e) => e.code === 'unsupported' && re.test(e.message));
  });
}

test('API key login of an account without master password → clear message', async () => {
  await server({ masterPassword: 'keyconnector' });
  const inner = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith('/connect/token') && String(init.body).includes('client_credentials')) {
      return new Response(JSON.stringify({ access_token: 'ATK', expires_in: 3600, UserDecryptionOptions: { HasMasterPassword: false, KeyConnectorOption: { KeyConnectorUrl: 'https://kc' } } }), { status: 200 });
    }
    return inner(url, init);
  };
  await assert.rejects(BitwardenProvider.login({ id: 'a', server: ORIGIN, email: EMAIL }, { password: PASSWORD, clientId: 'user.x', clientSecret: 'y' }), /Key Connector/);
});

test('cloud regions: the return pages lie on the web vault', async () => {
  const { endpoints, ssoRedirectUri } = await import('../src/providers/bitwarden/api.js');
  assert.equal(ssoRedirectUri(endpoints('bitwarden.com')), 'https://vault.bitwarden.com/sso-connector.html');
  assert.equal(ssoRedirectUri(endpoints('bitwarden.eu')), 'https://vault.bitwarden.eu/sso-connector.html');
  assert.equal(ssoRedirectUri(endpoints('https://vw.example.net/')), 'https://vw.example.net/sso-connector.html');
});
