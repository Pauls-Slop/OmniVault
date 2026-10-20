// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test for KeePassXC: Chromium → extension → native messaging under org.omnivault.keepassxc (registered
// with native/install.py --keepassxc-proxy, as for the real keepassxc-proxy) → simulated KeePassXC.
// Usage: node test/e2e-keepassxc.mjs [path-to-playwright] [screenshot-dir]
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { extensionCopy, launch, startServers } from './servers.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const shots = process.argv[3] ?? tmpdir();
const { chromium } = await import(pwPath);

const work = mkdtempSync(join(tmpdir(), 'omnivault-kpxc-e2e-'));
const FAKE = resolve('test/fixtures/fake-keepassxc.py');
const { ORIGIN, close: closeServers } = await startServers({ bwPort: 8817, pbPort: 8818, extraItems: 0 });
const env = { FAKE_KPXC_STATE: join(work, 'db.json'), FAKE_KPXC_LOG: join(work, 'log.txt'), FAKE_KPXC_LOGIN_URI: `${ORIGIN}/login.html` };
const ext = await extensionCopy({ permissions: ['nativeMessaging'] });
const { ctx, extId, profile } = await launch(chromium, ext, { env });
execFileSync('python3', ['native/install.py', '--chrome-id', extId, '--chrome-profile-dir', profile, '--keepassxc-proxy', FAKE], { env: { ...process.env, XDG_DATA_HOME: work } });

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };

try {
  const site = await ctx.newPage();
  await site.goto(`${ORIGIN}/login.html`);
  const popup = await ctx.newPage();
  const errors = [];
  popup.on('pageerror', (e) => errors.push(e.message));
  await popup.setViewportSize({ width: 380, height: 560 });
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await popup.waitForSelector('#empty:not([hidden])');
  const msg = (type, payload = {}) => popup.evaluate(([t, p]) => chrome.runtime.sendMessage({ type: t, ...p }).then((r) => { if (!r.ok) throw new Error(r.error); return r.result; }), [type, payload]);

  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]:has-text("Konto hinzufügen")');
  await popup.waitForSelector('#view-account:not([hidden])');
  await popup.selectOption('#acc-provider', 'keepassxc');
  await popup.fill('#form-account input[name=label]', 'KeePassXC');
  await popup.click('#acc-submit');
  await popup.waitForSelector('#view-unlock:not([hidden])');
  check(await popup.isHidden('#form-unlock input[name=password]'), 'no password field: KeePassXC confirms the connection itself');
  await popup.click('#unlock-submit');
  await popup.waitForSelector('#view-main:not([hidden]) .item', { timeout: 15000 });
  const names = await popup.$$eval('.item .name', (n) => n.map((x) => x.textContent));
  check(['GitHub', 'Intranet', 'Testseite'].every((x) => names.includes(x)), `items listed: ${names.join(', ')}`);
  const state = JSON.parse(readFileSync(env.FAKE_KPXC_STATE, 'utf8'));
  check(Object.keys(state.associations).length === 1, 'associated once');

  const items = await msg('items');
  const gh = items.find((i) => i.name === 'GitHub');
  check(await msg('secret', { accountId: gh.accountId, itemId: gh.id, field: 'password' }) === 'kpxc-gh', 'password fetched through KeePassXC');

  // detail: current TOTP code from KeePassXC (KeePassXC never hands out the secret)
  await popup.click('.item:has-text("GitHub")');
  await popup.waitForSelector('#view-item:not([hidden])');
  await popup.waitForFunction(() => document.querySelector('[data-field="TOTP"] .v')?.textContent.includes('123 456'), null, { timeout: 5000 }).catch(() => {});
  check((await popup.textContent('[data-field="TOTP"] .v').catch(() => '')).includes('123 456'), 'TOTP code shown from KeePassXC');
  await popup.click('#view-item button:has-text("Zurück")');

  // fill the login page
  const tabId = await site.evaluate(() => 0).then(async () => (await popup.evaluate(async (u) => (await chrome.tabs.query({ url: u }))[0].id, `${ORIGIN}/login.html`)));
  const local = items.find((i) => i.name === 'Testseite');
  await msg('fill', { accountId: local.accountId, itemId: local.id, tabId });
  await site.waitForFunction(() => document.querySelector('#p').value !== '', null, { timeout: 5000 }).catch(() => {});
  check(await site.inputValue('#u') === 'alice' && await site.inputValue('#p') === 'kpxc-local', 'login filled from KeePassXC');

  // editor: only what KeePassXC stores (no name, notes, TOTP); a login needs a website
  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]:has-text("Neuer Login")').catch(() => popup.click('#menu [role=menuitem] >> nth=0'));
  await popup.waitForSelector('#view-edit:not([hidden])');
  check(await popup.isHidden('input[name=name]') && await popup.isHidden('textarea[name=notes]') && await popup.isHidden('input[name=totp]'),
    'editor hides name, notes and TOTP for KeePassXC');
  await popup.fill('input[name=username]', 'neu');
  await popup.fill('input[name=password]', 'neu-pw');
  await popup.click('#view-edit button[type=submit]');
  await popup.waitForSelector('#view-edit .error:not([hidden])');
  check((await popup.textContent('#view-edit .error')).includes('Website-Adresse'), 'a website is required');
  await popup.fill('#view-edit [data-uri]', 'https://neu.example.org/login');
  await popup.click('#view-edit button[type=submit]');
  await popup.waitForSelector('#view-main:not([hidden])', { timeout: 15000 });
  await popup.waitForSelector('.item:has-text("neu.example.org")', { timeout: 15000 }).catch(() => {});
  check(await popup.isVisible('.item:has-text("neu.example.org")'), 'new login saved in KeePassXC (named after the site)');
  await popup.screenshot({ path: join(shots, 'keepassxc-list.png') });
  check(!errors.length, `no script errors (${errors.join('; ')})`);
} catch (e) {
  console.log('FAIL', e.stack ?? e);
  failures++;
} finally {
  await ctx.close();
  closeServers();
}
console.log(failures ? `\n${failures} Fehler` : '\nall checks passed');
process.exit(failures ? 1 : 0);
