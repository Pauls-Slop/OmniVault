// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test of the real toolbar popup ("attached" mode), driven via CDP with real input events.
// Runs headful when a display is available (e.g. `xvfb-run -a node test/e2e-popup.mjs …`) so the popup
// resizes with its content like in everyday use; otherwise headless.
// Usage: node test/e2e-popup.mjs [path-to-playwright] [screenshot-dir]
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EMAIL, PASSWORD } from './fake-bitwarden.js';
import { KEYS, USER_ID } from './fake-passbolt.js';
import { attachTarget, openToolbarPopup, targets } from './popup-cdp.mjs';
import { extensionCopy, launch, startServers } from './servers.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const shots = process.argv[3] ?? tmpdir();
const { chromium } = await import(pwPath);
const DEBUG_PORT = 9351;
const headless = !process.env.DISPLAY;

const { ORIGIN, PB_ORIGIN, close: closeServers } = await startServers({ bwPort: 8797, pbPort: 8798, pbMfa: true });
const ext = await extensionCopy();
const { ctx, sw } = await launch(chromium, ext, { headless, debugPort: DEBUG_PORT });

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
console.log(`(${headless ? 'headless' : 'headful'} Chromium)`);

try {
  const site = await ctx.newPage();
  await site.goto(`${ORIGIN}/login.html`);
  await site.bringToFront();

  let p = await openToolbarPopup(ctx, sw, DEBUG_PORT);
  const setValue = (sel, v) => p.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const typeInto = async (sel, text) => { await p.click(sel); await p.evaluate(`(document.querySelector(${JSON.stringify(sel)}).select?.(), true)`); await p.type(text); };
  const visible = (sel) => p.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.closest('[hidden]') && e.getClientRects().length > 0; })()`);

  // 1. add a Vaultwarden account from the attached popup
  const addAccount = async () => {
    await p.click('#btn-new');
    await p.waitFor(`!document.querySelector('#menu').hidden`);
    await p.click('#menu [role=menuitem]', 'Konto hinzufügen');
  };
  /** Popup must keep one size and header/content must be equally wide in every view. */
  const sizes = new Set();
  const layout = async (what) => {
    const r = await p.evaluate(`({ w: innerWidth, h: innerHeight, dsw: document.documentElement.scrollWidth,
      header: document.querySelector('header').getBoundingClientRect().width,
      content: document.querySelector('#content').getBoundingClientRect().width,
      csw: document.querySelector('#content').scrollWidth, ccw: document.querySelector('#content').clientWidth })`);
    sizes.add(`${r.w}x${r.h}`);
    check(r.dsw <= r.w && r.csw <= r.ccw && r.header === r.content && r.header === r.w,
      `layout ${what}: popup ${r.w}×${r.h}, header ${r.header} = content ${r.content}, no horizontal overflow`);
  };
  await p.waitFor(`!!document.querySelector('#btn-new')`);
  await layout('empty list');
  check(await p.evaluate(`document.querySelector('#nav').hidden`), 'navigation: no arrows at the start');
  await addAccount();
  await layout('account form');
  await p.waitFor(`!document.querySelector('#view-account').hidden`);
  await setValue('#acc-fields select[name=server]', '__custom');
  await typeInto('input[name=server__custom]', ORIGIN);
  await typeInto('#acc-fields input[name=email]', EMAIL);
  await typeInto('#form-account input[name=label]', 'Privat');
  await p.click('#acc-submit');
  await p.waitFor(`!document.querySelector('#view-unlock').hidden`);
  await typeInto('#form-unlock input[name=password]', PASSWORD);
  await p.click('#unlock-submit');
  await p.waitFor(`document.querySelectorAll('.item').length === 19`, 15000);
  await layout('long list');
  const size = await p.evaluate('({ w: innerWidth, h: innerHeight, sw: document.documentElement.scrollWidth })');
  check(true, `unlocked in attached popup (${size.w}×${size.h})`);
  check(size.sw <= size.w, `no horizontal scroll in attached popup (${size.sw} ≤ ${size.w})`);

  // 2. edit via the account menu (display only)
  await p.click('#accounts .chip');
  await p.waitFor(`!document.querySelector('#menu').hidden`);
  await sleep(300); // give a resizing popup time to settle
  check(await p.evaluate(`!document.querySelector('#menu').hidden`), 'menu stays open in attached popup');
  await writeFile(join(shots, 'attached-menu.png'), await p.screenshot());
  await p.click('#menu [role=menuitem]', 'Bearbeiten');
  await p.waitFor(`!document.querySelector('#view-account').hidden`);
  check(await p.inViewport('#acc-submit'), 'edit form shown, save button visible');
  await layout('account edit');
  await typeInto('#form-account input[name=short]', 'pv');
  await p.click('.swatch[aria-label="Farbton 148°"]');
  await writeFile(join(shots, 'attached-edit.png'), await p.screenshot());
  await p.click('#acc-submit');
  await p.waitFor(`!document.querySelector('#view-main').hidden && document.querySelector('.item .badge')?.textContent === 'PV'`);
  const stored = await sw.evaluate(async () => (await chrome.storage.local.get('accounts')).accounts.map((a) => [a.short, a.hue]));
  check(JSON.stringify(stored) === '[["PV",148]]', `edit saved from attached popup: ${JSON.stringify(stored)}`);

  // 3. edit connection data → account gets locked
  await p.click('#accounts .chip');
  await p.click('#menu [role=menuitem]', 'Bearbeiten');
  await p.waitFor(`!document.querySelector('#view-account').hidden`);
  await typeInto('#acc-fields input[name=email]', 'other@example.org');
  check(await visible('#acc-warn'), 'warning shown when connection data changes');
  await p.click('#acc-submit');
  await p.waitFor(`document.querySelector('#empty')?.textContent.includes('gesperrt')`);
  check(true, 'account locked after changing connection data');
  // revert
  await p.click('#accounts .chip');
  await p.click('#menu [role=menuitem]', 'Bearbeiten');
  await typeInto('#acc-fields input[name=email]', EMAIL);
  await p.click('#acc-submit');
  await p.waitFor(`!document.querySelector('#view-main').hidden`);

  // 4. Passbolt with MFA (passbolt_mfa cookie must be sent by the browser)
  await addAccount();
  await setValue('#acc-provider', 'passbolt');
  await typeInto('#acc-fields input[name=server]', PB_ORIGIN);
  await typeInto('#acc-fields input[name=userId]', USER_ID);
  await p.click('#acc-fields textarea[name=privateKey]');
  await p.type(KEYS.userEcc.private);
  await typeInto('#form-account input[name=label]', 'Firma');
  check(await p.evaluate(`(() => { const c = document.querySelector('#content'); return c.scrollHeight > c.clientHeight; })()`), 'Passbolt form is taller than the popup (content scrolls)');
  check(await p.inViewport('#acc-submit'), 'save button visible without scrolling (sticky)');
  await writeFile(join(shots, 'attached-passbolt-form.png'), await p.screenshot());
  await p.click('#acc-submit');
  await p.waitFor(`!document.querySelector('#view-unlock').hidden`);
  await typeInto('#form-unlock input[name=password]', KEYS.userEcc.passphrase);
  await p.click('#unlock-submit');
  await p.waitFor(`!document.querySelector('#unlock-2fa').hidden`, 15000);
  check(true, 'Passbolt asks for TOTP');
  await typeInto('#form-unlock input[name=twoFactorCode]', '123456');
  await p.click('#unlock-submit');
  await p.waitFor(`[...document.querySelectorAll('.item .badge')].filter((b) => b.textContent === 'FI').length === 4`, 15000);
  check(true, 'Passbolt unlocked with MFA cookie in the browser');
  const folders = await p.evaluate(`[...document.querySelectorAll('.item .meta')].map((m) => m.textContent).join(' | ')`);
  check(folders.includes('Team/Infra'), 'Passbolt folder path shown');

  // edit the Passbolt account too
  await p.click('#accounts .chip', 'Firma');
  await p.click('#menu [role=menuitem]', 'Bearbeiten');
  await p.waitFor(`!document.querySelector('#view-account').hidden`);
  check(await p.evaluate(`!!document.querySelector('.stored-key') && document.querySelector('textarea[name=privateKey]').closest('[hidden]') !== null`), 'edit shows stored key collapsed');
  check(await p.inViewport('#acc-submit'), 'save button visible when editing Passbolt');
  await typeInto('#form-account input[name=label]', 'Firma Passbolt');
  await p.click('#acc-submit');
  await p.waitFor(`[...document.querySelectorAll('#accounts .chip .label')].some((l) => l.textContent === 'Firma Passbolt')`);
  check(await p.evaluate(`[...document.querySelectorAll('#accounts .chip')].some((c) => c.textContent.includes('Firma Passbolt') && !c.classList.contains('locked'))`), 'Passbolt edited (label only), stays unlocked');
  const pbCfg = await sw.evaluate(async () => (await chrome.storage.local.get('accounts')).accounts.find((a) => a.provider === 'passbolt').config.privateKey);
  check(pbCfg.includes('BEGIN PGP PRIVATE KEY'), 'stored key kept after edit');
  await writeFile(join(shots, 'attached-two-accounts.png'), await p.screenshot());

  // detail, editor, generator and settings in the docked popup
  await p.click('.item .name', 'GitLab');
  await p.waitFor(`!document.querySelector('#view-item').hidden`);
  await layout('detail');
  check(await p.inViewport('#view-item .row.actions button:last-child'), 'detail actions visible without scrolling');
  await p.click('#view-item button', 'Zurück');
  await p.click('#btn-generator');
  await p.waitFor(`!document.querySelector('#view-generator').hidden`);
  await layout('generator');
  await p.click('#view-generator button', 'Zurück');
  await p.click('#btn-settings');
  await p.waitFor(`!document.querySelector('#view-settings').hidden`);
  await layout('settings');
  await p.click('#view-settings button', 'Zurück');
  for (const t of ['Prüfen', 'Auswahl', 'Spiegeln', 'Import/Export']) {
    if (t === 'Prüfen') await p.click('#btn-tools'); else await p.click('#view-tools .tabs button', t);
    await p.waitFor(`!document.querySelector('#view-tools').hidden && document.querySelector('#view-tools .tabs .active')?.textContent === ${JSON.stringify(t)}`);
    await sleep(200);
    await layout(`tools/${t}`);
    check(await p.inViewport('#view-tools .row.actions button'), `tools/${t}: footer visible without scrolling`);
    await writeFile(join(shots, `attached-tools-${t.replace(/\W+/g, "-")}.png`), await p.screenshot());
  }
  await p.click('#view-tools .row.actions button', 'Zurück');
  const headerFits = await p.evaluate(`(() => { const h = document.querySelector('header'); const a = h.querySelector('.actions');
    return a.getBoundingClientRect().right <= h.getBoundingClientRect().right && h.querySelector('h1').scrollWidth <= h.querySelector('h1').clientWidth + 1; })()`);
  check(headerFits, 'all header buttons fit next to the title');
  await p.click('#btn-new');
  await p.click('#menu [role=menuitem]', 'Neuer Login');
  await p.waitFor(`!document.querySelector('#view-edit').hidden`);
  await layout('editor');
  check(await p.inViewport('#view-edit button[type=submit]'), 'editor save button visible without scrolling');
  await writeFile(join(shots, 'attached-editor.png'), await p.screenshot());
  await p.click('#view-edit button', 'Abbrechen');

  // back/forward between views, like a browser: header arrows, Alt+←/→ and the mouse's side buttons
  const at = (view) => p.waitFor(`!document.querySelector('#view-${view}').hidden`);
  const navState = () => p.evaluate(`({ shown: !document.querySelector('#nav').hidden,
    back: !document.querySelector('#btn-nav-back').disabled, fwd: !document.querySelector('#btn-nav-forward').disabled })`);
  await p.click('#search');
  await p.evaluate(`(document.querySelector('#search').blur(), true)`);
  check(JSON.stringify(await navState()) === '{"shown":true,"back":false,"fwd":true}', 'navigation: after cancelling the editor, the list offers forward only');
  await p.click('.item .name', 'GitLab');
  await at('item');
  check(JSON.stringify(await navState()) === '{"shown":true,"back":true,"fwd":false}', 'navigation: arrows appear in a view, forward disabled');
  check(await p.evaluate(`getComputedStyle(document.querySelector('header h1 .name')).display === 'none'`), 'navigation: name gives way to the arrows');
  await layout('header with arrows');
  await writeFile(join(shots, 'attached-nav.png'), await p.screenshot());
  await p.click('#btn-generator');
  await at('generator');
  await p.key('ArrowLeft', 1);
  await p.waitFor(`!document.querySelector('#view-item').hidden && document.querySelector('#view-item h2')?.textContent.includes('GitLab')`);
  check(true, 'Alt+← goes back to the item');
  await p.key('ArrowLeft', 1);
  await at('main');
  check(JSON.stringify(await navState()) === '{"shown":true,"back":false,"fwd":true}', 'navigation: on the list, only forward is possible');
  await p.key('ArrowRight', 1);
  await p.waitFor(`!document.querySelector('#view-item').hidden && document.querySelector('#view-item h2')?.textContent.includes('GitLab')`);
  check(true, 'Alt+→ opens the item again');
  await p.sideButton('forward');
  await at('generator');
  check(true, 'mouse button 5 goes forward');
  await p.sideButton('back');
  await at('item');
  check(true, 'mouse button 4 goes back');
  await p.click('#btn-nav-back');
  await at('main');
  await p.click('#btn-nav-forward');
  await at('item');
  check(true, 'header arrows go back and forward');
  // a form keeps what was typed when coming back to it
  await p.click('#view-item button', 'Bearbeiten');
  await at('edit');
  await typeInto('#view-edit input[name=name]', 'GitLab Firma');
  await p.click('#btn-generator');
  await at('generator');
  await p.key('ArrowLeft', 1);
  await at('edit');
  check(await p.evaluate(`document.querySelector('#view-edit input[name=name]').value`) === 'GitLab Firma', 'navigation: back into the editor keeps the typed name');
  await p.click('#view-edit button', 'Abbrechen');
  await at('item');
  await p.key('ArrowRight', 1);
  await at('edit');
  check(await p.evaluate(`document.querySelector('#view-edit input[name=name]').value`) === 'GitLab Firma', 'navigation: forward into the editor, input still there');
  await p.key('Escape');
  await at('item');
  check(p.errors.length === 0, `navigation: no script errors${p.errors.length ? `: ${p.errors.join(' / ')}` : ''}`);
  await p.click('#btn-nav-back');
  await at('main');
  check(sizes.size === 1, `docked popup keeps one size in every view (${[...sizes].join(', ')})`);

  // 5. fill from the attached popup closes it and fills the page
  await p.click('.item .btns button', 'Ausfüllen');
  for (let i = 0; i < 30 && await p.isOpen(); i++) await sleep(100);
  check(!(await p.isOpen()), 'attached popup closes after filling');
  check(await site.inputValue('#p') !== '', `page filled (${await site.inputValue('#u')})`);
  check(p.errors.length === 0, `no script errors in popup${p.errors.length ? `: ${p.errors.join(' / ')}` : ''}`);
  p.close();

  // 6. the sidebar button opens the Chrome side panel for this window and closes the popup
  p = await openToolbarPopup(ctx, sw, DEBUG_PORT);
  await p.waitFor(`!!document.querySelector('#btn-sidebar')`);
  await sleep(300); // window id is looked up at start
  await p.click('#btn-sidebar');
  let panel;
  for (let i = 0; i < 40 && !panel; i++) {
    const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
    panel = list.find((t) => t.url.endsWith('/sidebar.html'));
    if (!panel) await sleep(100);
  }
  check(!!panel, 'side panel opened from the popup');
  for (let i = 0; i < 30 && await p.isOpen(); i++) await sleep(100);
  check(!(await p.isOpen()), 'popup closes after opening the side panel');
  p.close();

  // 7. sidebar → own window: the side panel offers the pop-out button, opens the window and closes itself
  const side = await attachTarget(DEBUG_PORT, (t) => t.url.endsWith('/sidebar.html'), 'Seitenleiste');
  await side.waitFor(`document.documentElement.classList.contains('sidebar') && !!document.querySelector('#btn-popout')`);
  check(await side.evaluate(`getComputedStyle(document.querySelector('#btn-popout')).display !== 'none'`), 'sidebar shows the pop-out button');
  check(await side.evaluate(`getComputedStyle(document.querySelector('#btn-sidebar')).display === 'none'`), 'sidebar: no sidebar button');
  const windowOpened = ctx.waitForEvent('page', { predicate: (pg) => pg.url().includes('popup.html?window=1'), timeout: 10000 });
  // the side panel of this test browser has no size, so the click is dispatched in the page (no gesture needed here)
  await side.evaluate(`(document.querySelector('#btn-popout').click(), true)`);
  const popout = await windowOpened;
  check(!!popout, 'pop-out window opened from the sidebar');
  for (let i = 0; i < 30 && await side.isOpen(); i++) await sleep(100);
  check(!(await side.isOpen()), 'sidebar closes after popping out');
  side.close();

  // 8. own window → sidebar: the sidebar opens in the browser window, the pop-out window closes
  await popout.waitForSelector('#btn-sidebar');
  check(await popout.isHidden('#btn-popout') && await popout.isVisible('#btn-sidebar'), 'pop-out window: sidebar button, no pop-out button');
  await site.bringToFront();
  await sleep(300); // the browser window is looked up when the focus changes
  const closed = popout.waitForEvent('close', { timeout: 10000 }).then(() => true, () => false);
  await popout.click('#btn-sidebar');
  let panel2;
  for (let i = 0; i < 40 && !panel2; i++) {
    panel2 = (await targets(DEBUG_PORT)).find((t) => t.url.endsWith('/sidebar.html'));
    if (!panel2) await sleep(100);
  }
  check(!!panel2, 'sidebar opened from the pop-out window');
  check(await closed, 'pop-out window closes after switching to the sidebar');

  // 9. Firefox (simulated): sidebarAction.open() would act on the pop-out window itself, so the pop-out hands
  //    over – the toolbar icon opens the sidebar until it is open, then the sidebar closes the pop-out.
  await ctx.addInitScript(() => {
    if (location.protocol !== 'chrome-extension:' || !location.search.includes('window=1')) return;
    Object.defineProperty(chrome, 'sidePanel', { value: undefined });
    chrome.sidebarAction = { open: async () => { globalThis.sidebarOpenCalled = true; }, close: async () => {}, toggle: async () => {} };
  });
  const extUrl = (path) => new URL(path, sw.url()).href;
  const opener = await ctx.newPage();
  await opener.goto(extUrl('popup.html'));
  const ffPopout = async () => {
    const opened = ctx.waitForEvent('page', { predicate: (pg) => pg.url().includes('popup.html?window=1'), timeout: 10000 });
    await opener.evaluate(() => chrome.runtime.sendMessage({ type: 'popOut' }));
    const w = await opened;
    await w.waitForSelector('#btn-sidebar');
    return w;
  };
  const actionPopup = () => sw.evaluate(() => chrome.action.getPopup({}));
  let ff = await ffPopout();
  await ff.click('#btn-sidebar');
  await ff.waitForSelector('#handoff');
  check(!(await ff.evaluate(() => globalThis.sidebarOpenCalled === true)), 'Firefox: pop-out does not open the sidebar in its own window');
  check(await ff.isVisible('#handoff') && !ff.isClosed(), 'Firefox: pop-out stays open and explains the next step');
  await ff.screenshot({ path: join(shots, 'firefox-handoff.png') });
  check(await actionPopup() === '', 'Firefox: toolbar icon now opens the sidebar');
  await ff.click('#handoff button');
  await sleep(300);
  check(!(await ff.$('#handoff')) && (await actionPopup()).endsWith('popup.html'), 'Firefox: cancelling restores the toolbar popup');
  await ff.click('#btn-sidebar');
  await ff.waitForSelector('#handoff');
  const ffClosed = ff.waitForEvent('close', { timeout: 10000 }).then(() => true, () => false);
  const sidePage = await ctx.newPage(); // stands in for the sidebar Firefox opens on the icon click
  await sidePage.goto(extUrl('sidebar.html'));
  check(await ffClosed, 'Firefox: the opened sidebar closes the pop-out window');
  for (let i = 0; i < 20 && !(await actionPopup()).endsWith('popup.html'); i++) await sleep(100);
  check((await actionPopup()).endsWith('popup.html'), 'Firefox: toolbar popup restored after the hand-over');
  await sidePage.close();
  ff = await ffPopout(); // closing the pop-out during a hand-over also restores the icon
  await ff.click('#btn-sidebar');
  await ff.waitForSelector('#handoff');
  await ff.close();
  for (let i = 0; i < 20 && !(await actionPopup()).endsWith('popup.html'); i++) await sleep(100);
  check((await actionPopup()).endsWith('popup.html'), 'Firefox: closing the pop-out ends the hand-over');
} catch (e) {
  failures++;
  console.log('FAIL', e.message);
} finally {
  await ctx.close();
  closeServers();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
