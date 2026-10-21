// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test of the login steps in a tab: Duo Universal Prompt and Enterprise SSO against simulated servers
// (connector pages on the server's own address, Duo and the identity provider as clickable pages). Uses the real
// toolbar popup, which closes when the tab opens, and checks that it continues when opened again.
// Usage: xvfb-run -a node test/e2e-bitwarden-login.mjs [path-to-playwright]
import { EMAIL, PASSWORD, fakeBitwarden } from './fake-bitwarden.js';
import { openToolbarPopup } from './popup-cdp.mjs';
import { extensionCopy, launch, listen } from './servers.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const { chromium } = await import(pwPath);
const DEBUG_PORT = 9361;
const DUO_PORT = 8817;
const SSO_PORT = 8818;
const headless = !process.env.DISPLAY;
const DUO_ORIGIN = `http://localhost:${DUO_PORT}`;
const SSO_ORIGIN = `http://localhost:${SSO_PORT}`;
const KDF = { kdf: 0, kdfIterations: 5000 };

const duoServer = await fakeBitwarden({ kdf: KDF, origin: DUO_ORIGIN, duo: 2, duoOrigin: DUO_ORIGIN });
const ssoServer = await fakeBitwarden({ kdf: KDF, origin: SSO_ORIGIN, sso: { identifier: 'acme' } });
const servers = [await listen(duoServer, DUO_PORT), await listen(ssoServer, SSO_PORT)];
const ext = await extensionCopy();
const { ctx, sw } = await launch(chromium, ext, { headless, debugPort: DEBUG_PORT });

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, what, timeout = 10_000) => {
  const end = Date.now() + timeout;
  for (;;) {
    const v = await fn().catch(() => null);
    if (v) return v;
    if (Date.now() > end) throw new Error(`Timeout: ${what}`);
    await sleep(100);
  }
};
/** Closes the toolbar popup itself (the CDP connection alone keeps it open). */
const withTimeout = (promise, ms) => Promise.race([promise, sleep(ms).then(() => null)]);
const shut = async (popup) => {
  // the page answers nothing once it closes: do not wait for the reply
  withTimeout(popup.evaluate('(setTimeout(() => window.close(), 0), true)'), 500).catch(() => {});
  await until(async () => !await withTimeout(popup.isOpen(), 1000), 'popup closed');
  popup.close();
};
const pageAt = (part) => until(async () => ctx.pages().find((pg) => pg.url().includes(part)), `tab ${part}`);
console.log(`(${headless ? 'headless' : 'headful'} Chromium)`);

try {
  const site = await ctx.newPage();
  await site.goto(`${DUO_ORIGIN}/login.html`);
  await site.bringToFront();

  // the account form: "Organisations-Kennung" only with SSO chosen
  const form = await ctx.newPage();
  await form.goto(`chrome-extension://${new URL(sw.url()).host}/popup.html`);
  await form.click('#btn-new');
  await form.click('#menu [role=menuitem]:has-text("Konto hinzufügen")');
  await form.waitForSelector('#view-account:not([hidden])');
  const idField = '#acc-fields input[name=ssoIdentifier]';
  check(!await form.isVisible(idField), 'account form: no organization identifier with master password');
  await form.selectOption('#acc-fields select[name=login]', 'sso');
  check(await form.isVisible(idField), 'account form: organization identifier shown with SSO');
  // two accounts, through the background's own call (as the form submits them)
  const add = (config, label) => form.evaluate(([c, l]) => chrome.runtime.sendMessage({ type: 'addAccount', provider: 'bitwarden', config: c, label: l })
    .then((r) => r.result.id), [config, label]);
  const duoId = await add({ server: DUO_ORIGIN, email: EMAIL, login: 'password' }, 'Duo');
  const ssoId = await add({ server: SSO_ORIGIN, email: EMAIL, login: 'sso', ssoIdentifier: 'acme' }, 'Firma');
  await form.close();

  /* ---------- Duo ---------- */
  await site.bringToFront();
  let p = await openToolbarPopup(ctx, sw, DEBUG_PORT);
  await p.waitFor(`!!document.querySelector('[data-account="${duoId}"]')`);
  await p.click(`[data-account="${duoId}"]`);
  await p.click('#menu [role=menuitem]', 'Entsperren');
  await p.waitFor(`!document.querySelector('#view-unlock').hidden`);
  await p.evaluate(`(document.querySelector('#form-unlock').password.value = ${JSON.stringify(PASSWORD)}, true)`);
  await p.click('#unlock-submit');

  const duoTab = await pageAt('/oauth/v1/authorize');
  check(true, `Duo opens in a tab (${new URL(duoTab.url()).pathname})`);
  await sleep(300);
  check(!await p.isOpen(), 'the toolbar popup closed for the tab');
  p.close();
  const duoFlow = await sw.evaluate(async () => Object.values((await chrome.storage.session.get('loginFlows')).loginFlows ?? {})[0]);
  check(duoFlow?.phase === 'browser' && duoFlow.returnUrl === `${DUO_ORIGIN}/duo-redirect-connector.html?client=browser`, `background waits for the connector page (${duoFlow?.returnUrl})`);

  // reopened while Duo is still open: the unlock form says so
  await site.bringToFront();
  p = await openToolbarPopup(ctx, sw, DEBUG_PORT);
  await p.waitFor(`!document.querySelector('#unlock-browser').hidden`);
  check((await p.evaluate(`document.querySelector('#unlock-browser-text').textContent`)).includes('Duo'), 'reopened popup: waiting for Duo');
  await shut(p);

  await duoTab.bringToFront();
  await duoTab.click('#duo-approve');
  await until(async () => duoTab.isClosed(), 'Duo tab closed by OmniVault');
  check(true, 'the tab closes once Duo returns to the connector page');
  await until(async () => (await sw.evaluate(async () => Object.values((await chrome.storage.session.get('loginFlows')).loginFlows ?? {})[0]?.phase)) === 'done', 'login finished');
  const form2 = duoServer.flow.tokenForms.at(-1) ?? {};
  check(form2.twoFactorProvider === '2' && /^duo[a-z0-9]+\|st[0-9a-f]+$/.test(form2.twoFactorToken), `login with provider 2 and code|state (${form2.twoFactorToken})`);

  await site.bringToFront();
  p = await openToolbarPopup(ctx, sw, DEBUG_PORT);
  await p.waitFor(`!!document.querySelector('[data-account="${duoId}"]:not(.locked)')`);
  check(true, 'popup reopened: Duo account unlocked');
  check(await p.waitFor(`!document.querySelector('#view-main').hidden`).then(() => true, () => false), 'popup shows the list');
  check(await p.evaluate(`[...document.querySelectorAll('#items .item')].some((li) => li.textContent.includes('GitHub'))`), 'items of the Duo account listed');
  const left = await until(async () => {
    const all = (await sw.evaluate(async () => (await chrome.storage.session.get('loginFlows')).loginFlows ?? {}));
    return Object.keys(all).length ? null : 'empty';
  }, 'login state cleared', 3000).catch(async () => JSON.stringify(await sw.evaluate(async () => (await chrome.storage.session.get('loginFlows')).loginFlows)));
  check(left === 'empty', `nothing of the login left behind (${left})`);
  await shut(p);

  /* ---------- SSO ---------- */
  await site.bringToFront();
  p = await openToolbarPopup(ctx, sw, DEBUG_PORT);
  await p.waitFor(`!!document.querySelector('[data-account="${ssoId}"]')`);
  await p.click(`[data-account="${ssoId}"]`);
  await p.click('#menu [role=menuitem]', 'Entsperren');
  await p.waitFor(`!document.querySelector('#view-unlock').hidden`);
  check(await p.evaluate(`document.querySelector('#form-unlock').password.closest('label').hidden`), 'SSO: no password field before the sign-in');
  check((await p.evaluate(`document.querySelector('#unlock-submit').textContent`)) === 'Mit SSO anmelden', 'SSO: button "Mit SSO anmelden"');
  await p.click('#unlock-submit');

  const idp = await pageAt('/idp/login');
  const authorize = ssoServer.flow.ssoAuthorize.at(-1);
  check(authorize.client_id === 'browser' && authorize.redirect_uri === `${SSO_ORIGIN}/sso-connector.html` && authorize.domain_hint === 'acme' && authorize.code_challenge_method === 'S256',
    `authorize: client browser, fixed return page, organization, PKCE (${authorize.redirect_uri})`);
  await sleep(300);
  check(!await p.isOpen(), 'the toolbar popup closed for the sign-in tab');
  p.close();
  await idp.bringToFront();
  await idp.click('#idp-approve');
  await until(async () => idp.isClosed(), 'sign-in tab closed');
  await until(async () => ssoServer.flow.tokenForms.at(-1)?.grant_type === 'authorization_code', 'code exchange');
  check(true, 'code exchanged for tokens (PKCE)');

  await site.bringToFront();
  p = await openToolbarPopup(ctx, sw, DEBUG_PORT);
  await p.waitFor(`!document.querySelector('#form-unlock').password.closest('label').hidden && !document.querySelector('#view-unlock').hidden`);
  check((await p.evaluate(`document.querySelector('#unlock-hint')?.textContent ?? ''`)).includes('Master-Passwort'), 'reopened popup asks for the master password');
  await p.evaluate(`(document.querySelector('#form-unlock').password.value = 'falsch', true)`);
  await p.click('#unlock-submit');
  await p.waitFor(`!document.querySelector('#unlock-error').hidden`);
  check(true, `wrong master password reported: ${await p.evaluate(`document.querySelector('#unlock-error').textContent`)}`);
  await p.evaluate(`(document.querySelector('#form-unlock').password.value = ${JSON.stringify(PASSWORD)}, true)`);
  await p.click('#unlock-submit');
  await p.waitFor(`!!document.querySelector('[data-account="${ssoId}"]:not(.locked)')`);
  check(true, 'SSO account unlocked after the second try, without signing in again');
  const exchanges = ssoServer.flow.tokenForms.filter((f) => f.grant_type === 'authorization_code').length;
  check(exchanges === 1, `one code exchange (${exchanges})`);
  check(p.errors.length === 0, `no errors in the popup${p.errors.length ? `: ${p.errors.join(' | ')}` : ''}`);
  p.close();
} catch (e) {
  console.error(e);
  failures++;
} finally {
  await ctx.close();
  for (const s of servers) s.close();
}
console.log(failures ? `\n${failures} Fehler` : '\nalles ok');
process.exit(failures ? 1 : 0);
