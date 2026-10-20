// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test for Proton Pass: Chromium → extension → native messaging → native/omnivault_host.py (backend "proton")
// (registered with native/install.py into the test profile) → simulated pass-cli.
// Usage: node test/e2e-proton.mjs [path-to-playwright] [screenshot-dir]
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { extensionCopy, launch, startServers } from './servers.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const shots = process.argv[3] ?? tmpdir();
const { chromium } = await import(pwPath);

const work = mkdtempSync(join(tmpdir(), 'omnivault-proton-e2e-'));
const FAKE = resolve('test/fixtures/fake-pass-cli.py');
chmodSync(FAKE, 0o755);
const env = { OMNIVAULT_PASS_CLI: FAKE, FAKE_PASS_STATE: join(work, 'state.json'), FAKE_PASS_LOG: join(work, 'log.txt'), FAKE_PASS_LOGIN_URI: 'http://localhost:8787/login.html' };

const { ORIGIN, close: closeServers } = await startServers();
const ext = await extensionCopy({ permissions: ['nativeMessaging'] });
const { ctx, extId, profile } = await launch(chromium, ext, { env });
// Chromium reads host manifests from <user-data-dir>/NativeMessagingHosts when connectNative is called.
execFileSync('python3', ['native/install.py', '--chrome-id', extId, '--chrome-profile-dir', profile], { env: { ...process.env, XDG_DATA_HOME: work } });

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

  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]:has-text("Konto hinzufügen")');
  await popup.waitForSelector('#view-account:not([hidden])');
  await popup.selectOption('#acc-provider', 'protonpass');
  await popup.fill('#form-account input[name=label]', 'Proton');
  await popup.click('#acc-submit');
  await popup.waitForSelector('#view-unlock:not([hidden])');
  check(await popup.isHidden('#form-unlock input[name=password]'), 'no password field for Proton Pass');
  check((await popup.textContent('#unlock-submit')).includes('Verbinden'), 'button says "Verbinden"');
  await popup.click('#unlock-submit');
  await popup.waitForSelector('#view-main:not([hidden]) .item', { timeout: 15000 });
  const names = await popup.$$eval('.item .name', (n) => n.map((x) => x.textContent));
  check(names.length === 6 && names.includes('Proton Mail') && !names.includes('Alt'), `items via pass-cli: ${names.join(', ')}`);
  await popup.screenshot({ path: join(shots, 'proton-list.png') });

  // secrets are fetched on demand
  const secret = await popup.evaluate(async () => {
    const st = await chrome.runtime.sendMessage({ type: 'items' });
    const it = st.result.find((i) => i.name === 'Proton Mail');
    return (await chrome.runtime.sendMessage({ type: 'secret', accountId: it.accountId, itemId: it.id, field: 'password' })).result;
  });
  check(secret === 'proton-pw', 'password revealed through the host');

  // detail: pass-cli has no favorites, OmniVault keeps them locally
  await popup.click('.item:has-text("Wiki Arbeit")');
  await popup.waitForSelector('#view-item:not([hidden])');
  const favBtn = '#view-item .detail-head button[aria-label="Favorit"]';
  check((await popup.getAttribute(favBtn, 'title')).includes('nur in OmniVault'), 'local favorite offered');
  await popup.click(favBtn);
  await popup.waitForSelector(`${favBtn}[aria-pressed=true]`);
  await popup.click('#view-item button:has-text("Zurück")');
  await popup.waitForSelector('.item:has-text("Wiki Arbeit") .fav');
  check(true, 'local favorite shown in the list');
  await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'sync', id: (document.querySelector('.item[data-account]')).dataset.account }));
  await popup.reload();
  await popup.waitForSelector('.item:has-text("Wiki Arbeit") .fav');
  check(true, 'local favorite survives a sync');
  await popup.click('.item:has-text("Wiki Arbeit")');
  await popup.waitForSelector('#view-item:not([hidden])');
  await popup.click('#view-item button:has-text("Bearbeiten")');
  await popup.waitForSelector('#view-edit:not([hidden])');
  check(await popup.isHidden('#view-edit input[name=totp]'), 'TOTP not editable');
  // vault can be changed in the editor (pass-cli item move), no transfer needed
  check(!(await popup.isDisabled('#view-edit select[name=folder]')), 'vault selectable when editing');
  await popup.fill('#view-edit input[name=password]', 'wiki-2026');
  await popup.click('#view-edit button[type=submit]');
  await popup.waitForSelector('#view-item:not([hidden])');
  const state = JSON.parse(readFileSync(env.FAKE_PASS_STATE, 'utf8'));
  check(state.items.find((d) => d.item.id === 'i7').item.content.content.Login.password === 'wiki-2026', 'password changed in Proton Pass (simulated CLI)');
  // move to another vault from the editor
  await popup.click('#view-item button:has-text("Bearbeiten")');
  await popup.selectOption('#view-edit select[name=folder]', 's1');
  await popup.click('#view-edit button[type=submit]');
  await popup.waitForSelector('#view-main:not([hidden]), #view-item:not([hidden])');
  const moved = JSON.parse(readFileSync(env.FAKE_PASS_STATE, 'utf8')).items.find((d) => d.item.content.title === 'Wiki Arbeit');
  check(moved.item.share_id === 's1', 'item moved to the other vault with pass-cli item move');
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await popup.waitForSelector('#view-main:not([hidden]) .item');

  // fill the login page with the Proton Mail item (URL matches the test page)
  await site.bringToFront();
  await popup.evaluate(async () => {
    const st = await chrome.runtime.sendMessage({ type: 'items' });
    const it = st.result.find((i) => i.name === 'Proton Mail');
    const [tab] = await chrome.tabs.query({ url: 'http://localhost:8787/*' });
    return chrome.runtime.sendMessage({ type: 'fill', accountId: it.accountId, itemId: it.id, tabId: tab.id });
  });
  await site.waitForFunction(() => document.querySelector('input[type=password]').value !== '', null, { timeout: 5000 }).catch(() => {});
  check(await site.inputValue('input[type=password]') === 'proton-pw', 'login form filled from Proton Pass');

  // attachment: listed in the detail view, downloaded through the host (pass-cli item attachment download)
  await popup.bringToFront();
  await popup.click('.item:has-text("Gedanken")');
  await popup.waitForSelector('#view-item:not([hidden]) summary:has-text("Anhänge (1)")');
  check(await popup.isVisible('#view-item .field:has-text("skizze.txt")'), 'attachment listed in the detail view');
  const [download] = await Promise.all([popup.waitForEvent('download'), popup.click('#view-item [aria-label="skizze.txt herunterladen"]')]);
  const saved = join(work, 'download.txt');
  await download.saveAs(saved);
  check(download.suggestedFilename() === 'skizze.txt' && readFileSync(saved, 'utf8') === 'hallo welt', 'attachment downloaded through the host');
  await popup.click('#view-item button:has-text("Zurück")');

  // create + delete (permanent)
  await popup.bringToFront();
  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]:has-text("Neue Notiz")');
  await popup.waitForSelector('#view-edit:not([hidden])');
  await popup.fill('#view-edit input[name=name]', 'E2E-Notiz');
  await popup.fill('#view-edit textarea[name=notes]', 'nur ein Test');
  await popup.click('#view-edit button[type=submit]');
  await popup.waitForSelector('#view-item:not([hidden]) h2:has-text("E2E-Notiz")');
  await popup.click('#view-item button:has-text("Löschen")');
  check((await popup.textContent('#dialog')).includes('Papierkorb'), 'delete dialog: item goes to the trash');
  await popup.click('#dialog-ok');
  await popup.waitForSelector('#view-main:not([hidden])');
  check(!(await popup.isVisible('.item:has-text("E2E-Notiz")')), 'note created and deleted');
  const log = readFileSync(env.FAKE_PASS_LOG, 'utf8');
  check(!log.includes('nur ein Test'), 'note content never on the pass-cli command line');
  check(errors.length === 0, `no script errors (${errors.join('; ')})`);
} catch (e) {
  failures++;
  console.log('FAIL', e.message);
} finally {
  await ctx.close();
  await closeServers();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
