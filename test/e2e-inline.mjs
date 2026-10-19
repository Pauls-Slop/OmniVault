// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test for the features on web pages: the OmniVault button in login fields (fill from the inline list)
// and the "save this login?" / "update the password?" bar – with the simulated Bitwarden server.
// Usage: node test/e2e-inline.mjs [path-to-playwright] [screenshot-dir]
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EMAIL, PASSWORD } from './fake-bitwarden.js';
import { extensionCopy, launch, startServers } from './servers.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const shots = process.argv[3] ?? tmpdir();
const { chromium } = await import(pwPath);
const { ORIGIN, close: closeServers } = await startServers({ bwPort: 8797, pbPort: 8798, extraItems: 0 });
const ext = await extensionCopy();
const { ctx, extId } = await launch(chromium, ext);
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };
const frameOf = (page, file) => page.frames().find((f) => f.url().endsWith(`/${file}`));
const waitFrame = async (page, file) => {
  for (let i = 0; i < 100; i++) { const f = frameOf(page, file); if (f) { await f.waitForLoadState(); return f; } await page.waitForTimeout(100); }
  throw new Error(`${file} nicht erschienen`);
};

try {
  const popup = await ctx.newPage();
  const errors = [];
  popup.on('pageerror', (e) => errors.push(e.message));
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  const msg = (type, payload = {}) => popup.evaluate(([t, p]) => chrome.runtime.sendMessage({ type: t, ...p }).then((r) => { if (!r.ok) throw new Error(r.error); return r.result; }), [type, payload]);
  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]:has-text("Konto hinzufügen")');
  await popup.selectOption('#acc-fields select[name=server]', '__custom');
  await popup.fill('input[name=server__custom]', ORIGIN);
  await popup.fill('#acc-fields input[name=email]', EMAIL);
  await popup.fill('#form-account input[name=label]', 'Privat');
  await popup.click('#acc-submit');
  await popup.fill('#form-unlock input[name=password]', PASSWORD);
  await popup.click('#unlock-submit');
  await popup.waitForSelector('#view-main:not([hidden]) .item');
  const accountId = (await msg('state')).accounts[0].id;

  // turned off by default: no content script
  const site = await ctx.newPage();
  await site.goto(`${ORIGIN}/login.html`);
  await site.waitForTimeout(500);
  check(await site.evaluate(() => !document.querySelector('omnivault-inline')), 'off by default: nothing added to web pages');

  await msg('setSettings', { patch: { inlineMenu: true, offerSave: true } });
  await site.reload();
  await site.click('#u');
  await site.waitForFunction(() => !!document.querySelector('omnivault-inline'));
  // the button sits at the right edge of the field (closed shadow root → click by position)
  const box = await site.locator('#u').boundingBox();
  await site.mouse.click(box.x + box.width - 15, box.y + box.height / 2);
  const menu = await waitFrame(site, 'inline-menu.html');
  await menu.waitForSelector('.row');
  const rows = await menu.$$eval('.row strong', (n) => n.map((x) => x.textContent));
  check(rows.length >= 1 && rows.includes('GitHub'), `inline list shows the matching login (${rows.join(', ')})`);
  check(await site.evaluate(() => { try { return !!document.querySelector('omnivault-inline').shadowRoot; } catch { return true; } }) === false, 'page cannot open the shadow root');
  await site.screenshot({ path: join(shots, 'inline-menu.png') });
  await menu.click('.row:has-text("GitHub")');
  await site.waitForFunction(() => document.querySelector('#p').value !== '');
  check(await site.inputValue('#u') === 'alice' && await site.inputValue('#p') === 'gh-pass', 'filled from the inline list');
  await site.waitForTimeout(300);
  check(!frameOf(site, 'inline-menu.html'), 'menu closed after filling');

  // same login with the stored password: nothing to save
  await site.click('button');
  await site.waitForLoadState();
  await site.waitForTimeout(800);
  check(!frameOf(site, 'save-bar.html'), 'unchanged login: no save bar');

  // new login → save bar → saved in the account
  await site.fill('#u', 'neu@example.org');
  await site.fill('#p', 'Neu-Passwort-1');
  await site.click('button');
  let bar = await waitFrame(site, 'save-bar.html');
  await bar.waitForSelector('#save');
  check((await bar.textContent('#question')).includes('speichern') && (await bar.textContent('#detail')).includes('neu@example.org'), 'save bar offers the new login');
  await site.screenshot({ path: join(shots, 'inline-save.png') });
  await bar.click('#save');
  for (let i = 0; i < 50 && !(await msg('items')).some((x) => x.username === 'neu@example.org'); i++) await site.waitForTimeout(100);
  const saved = (await msg('items')).find((x) => x.username === 'neu@example.org');
  check(!!saved && saved.accountId === accountId, 'new login saved in the account');
  check(await msg('secret', { accountId, itemId: saved.id, field: 'password' }) === 'Neu-Passwort-1', 'saved password correct');

  // changed password of an existing login → update bar
  await site.goto(`${ORIGIN}/login.html`);
  await site.fill('#u', 'alice');
  await site.fill('#p', 'gh-neu-2026');
  await site.click('button');
  bar = await waitFrame(site, 'save-bar.html');
  await bar.waitForSelector('#save');
  check((await bar.textContent('#question')).includes('aktualisieren'), 'update bar for a changed password');
  await bar.click('#save');
  const gh = (await msg('items')).find((x) => x.name === 'GitHub');
  let pw = '';
  for (let i = 0; i < 50 && pw !== 'gh-neu-2026'; i++) { pw = await msg('secret', { accountId, itemId: gh.id, field: 'password' }); await site.waitForTimeout(100); }
  check(pw === 'gh-neu-2026', 'password of the existing login updated');

  // "never for this site"
  await site.goto(`${ORIGIN}/login.html`);
  await site.fill('#u', 'nochwer');
  await site.fill('#p', 'x-1');
  await site.click('button');
  bar = await waitFrame(site, 'save-bar.html');
  await bar.click('#never');
  await site.goto(`${ORIGIN}/login.html`);
  await site.fill('#u', 'nochmal');
  await site.fill('#p', 'x-2');
  await site.click('button');
  await site.waitForTimeout(1000);
  check(!frameOf(site, 'save-bar.html'), '"never for this site" is respected');

  // cards and identities fill payment and address forms (autocomplete tokens first, then field names)
  await site.goto(`${ORIGIN}/checkout.html`);
  const tabId = await popup.evaluate(async (o) => (await chrome.tabs.query({ url: `${o}/checkout.html` }))[0].id, ORIGIN);
  const all = await msg('items');
  await msg('fill', { accountId, itemId: all.find((x) => x.type === 'card').id, tabId });
  await msg('fill', { accountId, itemId: all.find((x) => x.type === 'identity').id, tabId });
  const form = await site.evaluate(() => Object.fromEntries([...document.querySelectorAll('input, select')].map((e) => [e.id, e.value])));
  check(form.cn === 'Alice Example' && form.cc === '4111111111111111' && form.mm === '07' && form.yy === '2029' && form.cvc === '123',
    `card filled (${form.cn}, ${form.cc}, ${form.mm}/${form.yy})`);
  check(form.fn === 'Alice' && form.ln === 'Example' && form.em === 'alice@example.org', 'identity filled (name, e-mail)');

  // sample identity: offered in the "New" menu and in the identity editor
  await popup.bringToFront();
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await popup.waitForSelector('#view-main:not([hidden]) .item');
  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]:has-text("Muster-Identität")');
  await popup.waitForSelector('#view-edit:not([hidden])');
  const sampleName = await popup.inputValue('#view-edit input[name=name]');
  const sampleMail = await popup.inputValue('#view-edit input[name="identity.email"]');
  check(sampleName.startsWith('Muster-Identität – ') && /@example\.com$/.test(sampleMail), `sample identity prefilled (${sampleName}, ${sampleMail})`);
  await popup.click('#view-edit button.sample-identity');
  await popup.click('#view-edit button[type=submit]');
  await popup.waitForSelector('#view-item:not([hidden]) h2:has-text("Muster-Identität")');
  check((await msg('items')).some((x) => x.type === 'identity' && x.name.startsWith('Muster-Identität')), 'sample identity saved');

  // a page cannot use OmniVault's messaging (only the content script can, and only for its three calls)
  check(await site.evaluate(() => typeof chrome === 'undefined' || !chrome.runtime?.sendMessage), 'page has no extension messaging');
  check(errors.length === 0, `no script errors (${errors.join('; ')})`);
} catch (e) {
  failures++;
  console.log('FAIL', e.message);
} finally {
  await ctx.close();
  closeServers();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
