// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test: loads dist/chrome into Chromium, connects to a local fake Vaultwarden,
// unlocks, searches and autofills a login form.
// Usage: node test/e2e-chrome.mjs [path-to-playwright] [screenshot-dir]
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EMAIL, PASSWORD } from './fake-bitwarden.js';
import { KEYS, USER_ID } from './fake-passbolt.js';
import { extensionCopy, launch, startServers } from './servers.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const shots = process.argv[3] ?? tmpdir();
const { chromium } = await import(pwPath);
const PORT = 8787;

const { ORIGIN, PB_ORIGIN, close: closeServers } = await startServers();
const ext = await extensionCopy();
const { ctx, extId } = await launch(chromium, ext);

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };

try {
  check(!!extId, `extension loaded (${extId})`);

  const site = await ctx.newPage();
  await site.goto(`${ORIGIN}/login.html`);

  const popup = await ctx.newPage();
  const errors = [];
  popup.on('pageerror', (e) => errors.push(e.message));
  popup.on('console', (m) => m.type() === 'error' && console.log('  popup console:', m.text()));
  await popup.setViewportSize({ width: 380, height: 560 });
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await popup.waitForSelector('#empty:not([hidden])');
  check((await popup.textContent('#empty')).includes('Noch kein Konto'), 'empty state shown');


  const noHScroll = async (page, what) => {
    const r = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      csw: document.querySelector('#content').scrollWidth, ccw: document.querySelector('#content').clientWidth,
      header: document.querySelector('header').getBoundingClientRect().width, content: document.querySelector('#content').getBoundingClientRect().width,
    }));
    check(r.sw <= r.cw && r.csw <= r.ccw && r.header === r.content, `no horizontal scroll, consistent width: ${what} (${r.csw}≤${r.ccw}, header ${r.header} = content ${r.content})`);
  };
  const openAddAccount = async () => {
    await popup.click('#btn-new');
    await popup.click('#menu [role=menuitem]:has-text("Konto hinzufügen")');
    await popup.waitForSelector('#view-account:not([hidden])');
  };

  // about view: independence statement, trademark notices, license files reachable
  await popup.click('#btn-settings');
  await popup.waitForSelector('#view-settings:not([hidden])');
  await popup.click('#view-settings button:has-text("Über OmniVault")');
  const about = await popup.textContent('#view-about');
  check(/nicht mit Bitwarden Inc\., Passbolt S\.A\., Proton AG, AgileBits Inc\. \(1Password\) oder\s+LastPass US LP verbunden/.test(about), 'about: independence statement');
  check(about.includes('Bitwarden® ist eine eingetragene Marke') && about.includes('passbolt.com'), 'about: trademark notices and Passbolt link');
  for (const href of await popup.$$eval('#view-about a[href]:not([href^="http"])', (a) => a.map((x) => x.getAttribute('href')))) {
    const r = await popup.evaluate(async (h) => (await fetch(h)).ok, href);
    check(r, `about: ${href} is shipped`);
  }
  await noHScroll(popup, 'about view');
  await popup.click('#view-about [data-back]');
  check(await popup.waitForSelector('#view-settings:not([hidden])', { timeout: 3000 }).then(() => true, () => false), 'back returns to settings');
  await popup.click('#view-settings button:has-text("Zurück")');
  check(await popup.isVisible('#view-main'), 'back returns to list');


  await openAddAccount();
  const options = await popup.$$eval('#acc-provider option', (o) => o.map((x) => x.textContent));
  check(options.length === 7, `providers listed: ${options.join(' | ')}`);
  const servers = await popup.$$eval('#acc-fields select[name=server] option', (o) => o.map((x) => x.textContent));
  check(servers.some((t) => t.includes('bitwarden.com')) && servers.some((t) => t.includes('bitwarden.eu')) && servers.length === 3,
    `server choices: ${servers.join(' | ')}`);
  check(await popup.isHidden('input[name=server__custom]'), 'custom URL hidden for cloud server');
  // regression: a cloud region must be addable (the hidden custom-URL field once blocked submitting)
  await popup.selectOption('#acc-fields select[name=server]', 'bitwarden.eu');
  await popup.fill('#acc-fields input[name=email]', 'eu@example.org');
  await popup.fill('#form-account input[name=label]', 'EU');
  check(await popup.evaluate(() => document.querySelector('#form-account').checkValidity()), 'form with bitwarden.eu is valid');
  await popup.click('#acc-submit');
  await popup.waitForSelector('#view-unlock:not([hidden])');
  const eu = (await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'state' }))).result.accounts.find((a) => a.label === 'EU');
  check(eu?.server === 'bitwarden.eu', `bitwarden.eu account added (${eu?.server})`);
  await popup.evaluate((id) => chrome.runtime.sendMessage({ type: 'removeAccount', id }), eu.id);
  await popup.click('#view-unlock [data-back]');
  await openAddAccount();
  await popup.selectOption('#acc-fields select[name=server]', '__custom');
  check(await popup.isVisible('input[name=server__custom]'), 'custom URL shown for self-hosted');
  check(await popup.inputValue('input[name=server__custom]') === 'https://', 'self-hosted URL prefilled with https://');
  await popup.fill('input[name=server__custom]', ORIGIN);
  await popup.fill('#acc-fields input[name=email]', EMAIL);
  await popup.fill('#form-account input[name=label]', 'Vaultwarden Test');
  check(await popup.textContent('#acc-preview') === 'VT', 'short code derived from label (VT)');
  await noHScroll(popup, 'account form');
  await popup.click('#acc-submit');
  await popup.waitForSelector('#view-unlock:not([hidden])');

  // wrong password first
  await popup.fill('#form-unlock input[name=password]', 'falsch');
  await popup.click('#unlock-submit');
  await popup.waitForSelector('#unlock-error:not([hidden])');
  check((await popup.textContent('#unlock-error')).includes('falsch'), `wrong password: "${await popup.textContent('#unlock-error')}"`);

  await popup.fill('#form-unlock input[name=password]', PASSWORD);
  await popup.click('#unlock-submit');
  await popup.waitForSelector('#view-main:not([hidden]) .item');
  const names = await popup.$$eval('.item .name', (n) => n.map((x) => x.textContent));
  check(names.length === 19 && names.includes('GitHub') && names.includes('Team-Notiz'), `items loaded: ${names.length}`);
  const badges = await popup.$$eval('.item .badge', (b) => b.map((x) => x.textContent));
  check(badges.length === 19 && badges.every((b) => b === 'VT'), 'every item carries the account badge');
  await noHScroll(popup, 'long item list');
  await popup.screenshot({ path: join(shots, 'popup-unlocked.png'), fullPage: false });

  await popup.fill('#search', 'bank');
  const filtered = await popup.$$eval('.item .name', (n) => n.map((x) => x.textContent));
  check(filtered.length === 1 && filtered[0] === 'Bank', 'search filters');
  await popup.fill('#search', '');

  // account menu
  const chip = popup.locator('#accounts .chip').first();
  await chip.click();
  await popup.waitForSelector('#menu:not([hidden])');
  const menuItems = await popup.$$eval('#menu [role=menuitem] .txt', (m) => m.map((x) => x.textContent));
  check(JSON.stringify(menuItems) === JSON.stringify(['Synchronisieren', 'Sperren', 'Bearbeiten', 'Entfernen …']),
    `menu (unlocked): ${menuItems.join(' | ')}`);
  check(await popup.evaluate(() => document.activeElement?.getAttribute('role') === 'menuitem'), 'menu focuses first item');
  await popup.keyboard.press('ArrowDown');
  check((await popup.evaluate(() => document.activeElement.textContent)).includes('Sperren'), 'arrow keys move focus');
  await popup.screenshot({ path: join(shots, 'popup-menu.png') });
  await popup.keyboard.press('Escape');
  check(await popup.isHidden('#menu'), 'Escape closes menu');

  await chip.click();
  await popup.click('#menu [role=menuitem]:has-text("Synchronisieren")');
  await popup.waitForSelector('#toast:has-text("19 Einträge")');
  check(true, 'menu: sync');

  await chip.click();
  await popup.click('#menu [role=menuitem]:has-text("Bearbeiten")');
  await popup.waitForSelector('#view-account:not([hidden])');
  check(await popup.isHidden('#provider-row'), 'edit: provider fixed');
  check(await popup.inputValue('input[name=server__custom]') === ORIGIN, 'edit: custom server prefilled');
  await popup.fill('#form-account input[name=short]', 'arb');
  await popup.click('.swatch[aria-label="Farbton 32°"]');
  check(await popup.isHidden('#acc-warn'), 'edit: display change does not lock');
  await popup.click('#acc-submit');
  await popup.waitForSelector('#view-main:not([hidden]) .item');
  const after = await popup.evaluate(() => {
    const b = document.querySelector('.item .badge');
    return { text: b.textContent, hue: b.style.getPropertyValue('--acc-h') };
  });
  check(after.text === 'ARB' && after.hue === '32', `edit applied to items: ${JSON.stringify(after)}`);

  await chip.click();
  await popup.click('#menu [role=menuitem]:has-text("Sperren")');
  await popup.waitForSelector('#empty:not([hidden])');
  await chip.click();
  const lockedMenu = await popup.$$eval('#menu [role=menuitem] .txt', (m) => m.map((x) => x.textContent));
  check(lockedMenu[0] === 'Entsperren', `menu (locked): ${lockedMenu.join(' | ')}`);
  await popup.click('#menu [role=menuitem]:has-text("Entsperren")');
  await popup.fill('#form-unlock input[name=password]', PASSWORD);
  await popup.click('#unlock-submit');
  await popup.waitForSelector('#view-main:not([hidden]) .item');
  check(true, 'menu: lock + unlock');

  // type filter
  await popup.selectOption('#filter-type', 'card');
  check(JSON.stringify(await popup.$$eval('.item .name', (n) => n.map((x) => x.textContent))) === '["Visa privat"]', 'type filter: cards');
  await popup.selectOption('#filter-type', '');

  // detail view: custom fields, masked secrets, history, passkey hint
  await popup.click('.item:has-text("Shop")');
  await popup.waitForSelector('#view-item:not([hidden])');
  const fieldNames = await popup.$$eval('#view-item .field .k', (k) => k.map((x) => x.textContent));
  check(['Benutzername', 'Passwort', 'Kundennummer', 'PIN', 'Newsletter', 'Login-Name', 'Passkey'].every((n) => fieldNames.includes(n)), `detail fields: ${fieldNames.join(', ')}`);
  const pinField = popup.locator('#view-item .field[data-field="PIN"]');
  check((await pinField.locator('.v').textContent()).startsWith('••'), 'hidden custom field masked');
  await pinField.locator('button[title="Anzeigen"]').click();
  check(await pinField.locator('.v').textContent() === '9876', 'hidden field revealed on request');
  check((await popup.textContent('#view-item details.history summary')).includes('(1)'), 'password history listed');
  await noHScroll(popup, 'detail view');
  check(!/(^|\s)null(\s|$)/.test(await popup.textContent('#view-item')), 'detail view has no stray "null" text');
  await popup.screenshot({ path: join(shots, 'popup-detail.png') });

  // edit from the detail view → old password moves to the history
  await popup.click('#view-item button:has-text("Bearbeiten")');
  await popup.waitForSelector('#view-edit:not([hidden])');
  check(await popup.inputValue('#view-edit input[name=password]') === 'shop-old', 'editor prefilled');
  await popup.fill('#view-edit input[name=password]', 'shop-2026');
  await noHScroll(popup, 'editor');
  await popup.screenshot({ path: join(shots, 'popup-editor.png') });
  await popup.click('#view-edit button[type=submit]');
  await popup.waitForSelector('#view-item:not([hidden]) details.history');
  check((await popup.textContent('#view-item details.history summary')).includes('(2)'), 'after edit: history has the old password');

  // favorite from the detail view
  await popup.click('#view-item .detail-head button[aria-label="Favorit"]');
  await popup.waitForSelector('#view-item .detail-head button[aria-pressed="true"]');
  await popup.click('#view-item button:has-text("Zurück")');
  check(await popup.isVisible('#view-main'), 'back after edit+save leads to the list, not the editor');
  check(await popup.isVisible('.item:has-text("Shop") .fav'), 'favorite star in list');

  // create a new login via the ＋ menu
  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]:has-text("Neuer Login")');
  await popup.waitForSelector('#view-edit:not([hidden])');
  await popup.fill('#view-edit input[name=name]', 'Neuer Dienst');
  await popup.fill('#view-edit input[name=username]', 'neu@example.org');
  await popup.click('#view-edit button[aria-label="Passwort generieren"]');
  const genPw = await popup.inputValue('#view-edit input[name=password]');
  check(genPw.length === 20, `generated password in editor (${genPw.length} chars)`);
  await popup.fill('#view-edit [data-uri]', 'https://neu.example.org');
  await popup.click('#view-edit button[type=submit]');
  await popup.waitForSelector('#view-item:not([hidden]) h2:has-text("Neuer Dienst")');
  check(true, 'new login created and shown');

  // delete it again
  await popup.click('#view-item button:has-text("Löschen")');
  await popup.click('#dialog-ok');
  await popup.waitForSelector('#view-main:not([hidden])');
  check(!(await popup.isVisible('.item:has-text("Neuer Dienst")')), 'deleted item gone from list');

  // generator
  await popup.click('#btn-generator');
  await popup.waitForSelector('#view-generator:not([hidden])');
  check(/^•+$/.test(await popup.textContent('#gen-out')), 'generator: password hidden until shown');
  check(await popup.getAttribute('#gen-out', 'data-length') === '20', 'generator: default length 20');
  await popup.click('#view-generator .gen-row button');
  check((await popup.textContent('#gen-out')).length === 20 && !/•/.test(await popup.textContent('#gen-out')), 'generator: eye shows the password');
  await popup.uncheck('#view-generator input[data-opt="symbols"]');
  check(/^[A-Za-z0-9]+$/.test(await popup.textContent('#gen-out')), 'generator: without symbols (stays shown once shown)');
  await popup.evaluate(() => { const r = document.querySelector('#view-generator input[type=range]'); r.value = '32'; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); });
  check((await popup.textContent('#gen-out')).length === 32, 'generator: length slider');
  await popup.click('#view-generator button:has-text("Kopieren")');
  await popup.waitForSelector('#view-generator details.history:not([hidden])');
  check(/^•+$/.test(await popup.textContent('#view-generator details.history .v')), 'generator: recent passwords hidden too');
  await noHScroll(popup, 'generator');
  await popup.screenshot({ path: join(shots, 'popup-generator.png') });
  await popup.click('#view-generator button:has-text("Zurück")');
  const genSettings = await popup.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'settings' })).result.generator);
  check(genSettings.length === 32 && genSettings.symbols === false, 'generator settings persisted');

  // settings
  await popup.click('#btn-settings');
  await popup.selectOption('#view-settings select[name=autoLockMinutes]', '5');
  await popup.waitForSelector('#toast:has-text("Einstellungen gespeichert")');
  const st = await popup.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'settings' })).result);
  check(st.autoLockMinutes === 5, 'settings: auto-lock saved');
  await noHScroll(popup, 'settings');
  await popup.click('#view-settings button:has-text("Zurück")');

  // secrets are fetched on demand from the background
  const pw = await popup.evaluate(async () => {
    const st = await chrome.runtime.sendMessage({ type: 'items', tabUrl: 'http://localhost:8787/login.html' });
    const gh = st.result.find((i) => i.name === 'GitHub');
    const sec = await chrome.runtime.sendMessage({ type: 'secret', accountId: gh.accountId, itemId: gh.id, field: 'password' });
    const t = await chrome.runtime.sendMessage({ type: 'secret', accountId: gh.accountId, itemId: gh.id, field: 'totp' });
    return { matches: gh.matches, hasPasswordField: 'password' in gh, password: sec.result, totp: t.result.code };
  });
  check(pw.matches, 'item matches login page domain');
  check(!pw.hasPasswordField, 'item list does not contain passwords');
  check(pw.password === 'gh-pass', 'password retrieved on demand');
  check(/^\d{6}$/.test(pw.totp), `TOTP generated (${pw.totp})`);

  // autofill into the login tab
  const filled = await popup.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ url: 'http://localhost:8787/*' });
    const st = await chrome.runtime.sendMessage({ type: 'items' });
    const gh = st.result.find((i) => i.name === 'GitHub');
    return chrome.runtime.sendMessage({ type: 'fill', accountId: gh.accountId, itemId: gh.id, tabId: tab.id });
  });
  check(filled.ok && filled.result === 2, `fill reported ${JSON.stringify(filled)}`);
  check(await site.inputValue('#u') === 'alice' && await site.inputValue('#p') === 'gh-pass', 'login form filled');

  // service worker restart: session survives in storage.session, items are re-synced
  const restarted = await popup.evaluate(async () => {
    const r = await chrome.runtime.sendMessage({ type: 'state' });
    return r.result.accounts[0].unlocked;
  });
  check(restarted, 'account reported unlocked');

  // pop-out window
  check(await popup.isVisible('#btn-popout'), 'pop-out button visible in popup');
  const [win] = await Promise.all([ctx.waitForEvent('page'), popup.click('#btn-popout')]);
  await win.waitForLoadState();
  check(win.url().endsWith('popup.html?window=1'), `pop-out window opened (${win.url().split('/').pop()})`);
  check(!(await win.isVisible('#btn-popout')), 'pop-out button hidden inside the window');
  await win.setViewportSize({ width: 420, height: 640 });

  await site.fill('#u', ''); await site.fill('#p', '');
  await site.bringToFront();
  await win.evaluate(() => window.dispatchEvent(new Event('focus')));
  await win.waitForSelector('#target:not([hidden])');
  check((await win.textContent('#target')).includes('localhost:8787'), `window targets login tab: "${await win.textContent('#target')}"`);
  check(!(await win.isVisible('#site-access')), 'no permission banner when site access exists');
  await win.waitForSelector('.item .btns button:text("Ausfüllen")');
  const ghCard = win.locator('.item', { hasText: 'GitHub' });
  await ghCard.locator('button', { hasText: 'Ausfüllen' }).click();
  await site.waitForFunction(() => document.querySelector('#p').value === 'gh-pass');
  check(await site.inputValue('#u') === 'alice', 'window filled the login tab');
  check(!win.isClosed(), 'window stays open after filling');
  await win.screenshot({ path: join(shots, 'popout-window.png') });

  // a site without granted access shows the permission banner
  const other = await ctx.newPage();
  await other.goto(`http://127.0.0.1:${PORT}/login.html`);
  await other.bringToFront();
  await win.evaluate(() => window.dispatchEvent(new Event('focus')));
  await win.waitForSelector('#site-access', { state: 'visible' });
  check(await win.isHidden('#target'), 'site-access banner shown, no target for site without permission');
  await other.close();

  // second click focuses the existing window instead of opening another one
  const pagesBefore = ctx.pages().length;
  await popup.click('#btn-popout');
  await popup.waitForTimeout(500);
  check(ctx.pages().length === pagesBefore, 'existing window reused');

  // Passbolt account (v4 + v5 resources) next to the Bitwarden account
  await openAddAccount();
  await popup.selectOption('#acc-provider', 'passbolt');
  check(await popup.isVisible('#acc-fields textarea[name=privateKey]'), 'passbolt form: key field shown');
  await popup.fill('#acc-fields input[name=server]', PB_ORIGIN);
  await popup.fill('#acc-fields input[name=userId]', USER_ID);
  await popup.fill('#acc-fields textarea[name=privateKey]', KEYS.userEcc.private);
  await popup.fill('#form-account input[name=label]', 'Firma Passbolt');
  await noHScroll(popup, 'passbolt form');
  await popup.click('#acc-submit');
  await popup.waitForSelector('#view-unlock:not([hidden])');
  check((await popup.textContent('#unlock-label')).includes('Passphrase'), 'unlock asks for the key passphrase');
  await popup.fill('#form-unlock input[name=password]', 'falsch');
  await popup.click('#unlock-submit');
  await popup.waitForSelector('#unlock-error:not([hidden])');
  check((await popup.textContent('#unlock-error')).includes('Passphrase'), `wrong passphrase: "${await popup.textContent('#unlock-error')}"`);
  await popup.fill('#form-unlock input[name=password]', KEYS.userEcc.passphrase);
  await popup.click('#unlock-submit');
  await popup.waitForSelector('#view-main:not([hidden]) .item');
  await popup.waitForFunction(() => document.querySelectorAll('.item .badge').length >= 23);
  const pbItems = await popup.$$eval('.item', (n) => n.map((x) => ({ name: x.querySelector('.name').textContent, badge: x.querySelector('.badge').textContent, hue: x.style.getPropertyValue('--acc-h') })));
  const fp = pbItems.filter((i) => i.badge === 'FP');
  check(fp.length === 4, `passbolt items: ${fp.map((i) => i.name).join(', ')}`);
  check(pbItems.length === 23, `both accounts listed together (${pbItems.length} items)`);
  check(new Set(pbItems.map((i) => i.hue)).size === 2, 'accounts have different colors');
  const chips = await popup.$$eval('#accounts .chip .badge', (b) => b.map((x) => x.textContent));
  check(JSON.stringify(chips) === JSON.stringify(['ARB', 'FP']), `account chips: ${chips.join(', ')}`);
  const pbSecrets = await popup.evaluate(async () => {
    const st = await chrome.runtime.sendMessage({ type: 'items', tabUrl: 'http://localhost:8787/login.html' });
    const gl = st.result.find((i) => i.name === 'GitLab');
    const pw = await chrome.runtime.sendMessage({ type: 'secret', accountId: gl.accountId, itemId: gl.id, field: 'password' });
    const t = await chrome.runtime.sendMessage({ type: 'secret', accountId: gl.accountId, itemId: gl.id, field: 'totp' });
    return { matches: gl.matches, hasTotp: gl.hasTotp, pw: pw.result, totp: t.result?.code };
  });
  check(pbSecrets.pw === 'gitlab-pw' && /^\d{6}$/.test(pbSecrets.totp) && pbSecrets.hasTotp, 'passbolt secret + TOTP decrypted on demand');
  check(pbSecrets.matches, 'passbolt item matches page by URI');
  await popup.screenshot({ path: join(shots, 'popup-passbolt.png') });

  // a permission prompt closes the toolbar popup: the next popup continues where it was
  await popup.evaluate((origin) => chrome.storage.session.set({ popupResume: {
    view: 'account', at: Date.now(), permissions: { origins: [`${origin}/*`], permissions: [] },
    draft: { provider: 'bitwarden', config: { server: origin, email: 'resume@example.org' }, label: 'Fortgesetzt', short: '', hue: 272 },
  } }), ORIGIN);
  await popup.reload();
  await popup.waitForSelector('#view-unlock:not([hidden])');
  check((await popup.textContent('#unlock-title')).includes('Fortgesetzt'), 'reopened popup finished adding the account and asks for the password');
  const resumed = (await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'state' }))).result.accounts.find((a) => a.label === 'Fortgesetzt');
  await popup.evaluate((id) => chrome.runtime.sendMessage({ type: 'removeAccount', id }), resumed.id);
  await popup.evaluate(() => chrome.storage.session.set({ popupResume: { view: 'settings', setting: 'offerSave', at: Date.now(), permissions: { origins: ['http://localhost/*'] } } }));
  await popup.reload();
  await popup.waitForSelector('#view-settings:not([hidden])');
  check(await popup.isChecked('#view-settings input[name=offerSave]'), 'reopened popup applied the setting switched on before the prompt');
  await popup.waitForFunction(() => document.querySelector('#dialog').open);
  check((await popup.textContent('#dialog-text')).includes('neu lädst') && await popup.isHidden('#dialog-cancel'),
    `notice after switching on: open pages need a reload ("${await popup.textContent('#dialog-text')}")`);
  await popup.click('#dialog-ok');
  await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'setSettings', patch: { offerSave: false } }));
  await popup.reload();
  await popup.waitForSelector('#view-main:not([hidden]) .item');

  // unlock with PIN: set it in the settings, lock everything, reopen both accounts with the PIN
  const itemCount = (await popup.$$('.item')).length;
  await popup.click('#btn-settings');
  await popup.click('#view-settings button:has-text("PIN festlegen")');
  check(await popup.isVisible('#dialog-cancel'), 'PIN dialog has its cancel button back');
  await popup.fill('#dialog-input', '123');
  await popup.click('#dialog-ok');
  check(await popup.isVisible('#dialog-error') && /4 bis 12/.test(await popup.textContent('#dialog-error')) && await popup.evaluate(() => document.querySelector('#dialog').open),
    `too short PIN refused at once, before the repeat: "${await popup.textContent('#dialog-error')}"`);
  await popup.fill('#dialog-input', '2468');
  check(await popup.isHidden('#dialog-error'), 'typing clears the error');
  await popup.press('#dialog-input', 'Enter');
  await popup.waitForFunction(() => document.querySelector('#dialog-text').textContent.includes('wiederholen'));
  await popup.fill('#dialog-input', '2469');
  await popup.click('#dialog-ok');
  check(/stimmen nicht überein/.test(await popup.textContent('#dialog-error')) && await popup.evaluate(() => document.querySelector('#dialog').open), 'different repeat: error, dialog stays open');
  await popup.fill('#dialog-input', '2468');
  await popup.click('#dialog-ok');
  await popup.waitForSelector('#view-settings button:has-text("PIN entfernen")', { timeout: 20000 });
  check(true, '4-digit PIN set');
  await popup.click('#view-settings button:has-text("Zurück")');
  await popup.click('#btn-lock-all');
  await popup.waitForSelector('#pin-unlock:not([hidden])');
  check((await popup.$$('.item')).length === 0, 'lock all clears items, PIN form offered');
  await popup.fill('#pin-input', '1111');
  await popup.click('#pin-submit');
  await popup.waitForSelector('#pin-error:not([hidden])', { timeout: 20000 });
  check((await popup.textContent('#pin-error')).includes('noch 4 Versuche'), `wrong PIN: ${await popup.textContent('#pin-error')}`);
  await popup.fill('#pin-input', '2468');
  await popup.click('#pin-submit');
  await popup.waitForSelector('#pin-unlock[hidden]', { state: 'attached', timeout: 20000 });

  await popup.waitForSelector('.item');
  check((await popup.$$('.item')).length === itemCount && !(await popup.$$('#accounts .chip.locked')).length, 'PIN reopened all accounts with all items');

  // delete via menu with confirmation dialog (cancel first, then confirm) – done at the very end
  await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'removePin' }));
  await popup.click('#btn-lock-all');
  await popup.waitForSelector('#empty:not([hidden])');
  check((await popup.textContent('#empty')).includes('gesperrt') && await popup.isHidden('#pin-unlock'), 'without PIN: lock all needs the master password');

  await chip.click();
  await popup.click('#menu [role=menuitem]:has-text("Entfernen")');
  await popup.waitForSelector('#dialog[open]');
  await popup.click('#dialog button[value=cancel]');
  check((await popup.$$('#accounts .chip')).length === 2, 'delete: cancel keeps account');
  for (let n = 2; n > 0; n--) {
    await popup.locator('#accounts .chip').first().click();
    await popup.click('#menu [role=menuitem]:has-text("Entfernen")');
    await popup.click('#dialog-ok');
    await popup.waitForFunction((left) => document.querySelectorAll('#accounts .chip').length === left, n - 1);
  }
  await popup.waitForSelector('#empty:has-text("Noch kein Konto")');
  check(true, 'delete: confirm removes account');

  // auto-lock: inactivity beyond the limit locks every account (alarm fired early; unpacked extensions may do so)
  const swAuto = ctx.serviceWorkers()[0];
  await popup.evaluate(async () => chrome.runtime.sendMessage({ type: 'setSettings', patch: { autoLockMinutes: 1 } }));
  await swAuto.evaluate(async () => {
    await chrome.storage.session.set({ lastActivity: Date.now() - 5 * 60_000 });
    await chrome.alarms.create('autolock', { when: Date.now() + 200 });
  });
  let lockedAll = false;
  for (let n = 0; n < 50 && !lockedAll; n++) {
    await popup.waitForTimeout(100);
    lockedAll = await popup.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state' })).result.accounts.every((a) => !a.unlocked));
  }
  check(lockedAll, 'auto-lock after inactivity locks all accounts');

  // clipboard is cleared after the configured delay (offscreen document in Chrome)
  // (the clipboard is browser-wide; it is read back from the test web page, which can be granted access)
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN });
  await popup.evaluate(async () => chrome.runtime.sendMessage({ type: 'setSettings', patch: { clipboardSeconds: 1 } }));
  await popup.bringToFront();
  await popup.evaluate(async () => {
    await navigator.clipboard.writeText('geheim-123');
    await chrome.runtime.sendMessage({ type: 'scheduleClipboardClear' });
  });
  await site.bringToFront();
  check(await site.evaluate(() => navigator.clipboard.readText()) === 'geheim-123', 'clipboard holds the copied value');
  await site.waitForTimeout(2500);
  const clip = await site.evaluate(() => navigator.clipboard.readText());
  check(clip.trim() === '', `clipboard cleared after delay (now "${clip}")`);
  await popup.bringToFront();

  // content pages must not be able to talk to the background
  const fromPage = await site.evaluate(() => typeof chrome !== 'undefined' && !!chrome.runtime?.sendMessage);
  check(!fromPage, 'web page has no access to extension messaging');
  check(errors.length === 0, `no script errors in the popup (${errors.join('; ')})`);
} finally {
  await ctx.close();
  closeServers();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
