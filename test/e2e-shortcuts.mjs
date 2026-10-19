// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test for the browser-level entry points: the keyboard shortcuts (Alt+Shift+O opens OmniVault,
// Ctrl+Shift+L fills the matching login) and the context menu ("Mit OmniVault ausfüllen", "Sicheres Passwort
// einfügen"). Chromium handles these outside the page, so the test runs a visible browser under Xvfb and sends
// real X11 key and mouse events (test/xinput.py, XTEST).
// Usage: xvfb-run -a -s "-screen 0 1400x900x24" node test/e2e-shortcuts.mjs [path-to-playwright] [screenshot-dir]
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EMAIL, PASSWORD } from './fake-bitwarden.js';
import { targets } from './popup-cdp.mjs';
import { extensionCopy, launch, startServers } from './servers.mjs';

if (!process.env.DISPLAY) {
  console.error('Braucht ein X-Display: xvfb-run -a -s "-screen 0 1400x900x24" node test/e2e-shortcuts.mjs …');
  process.exit(2);
}
const pwPath = process.argv[2] ?? 'playwright';
const shots = process.argv[3] ?? tmpdir();
const { chromium } = await import(pwPath);
const DEBUG_PORT = 9334;
const { ORIGIN, close: closeServers } = await startServers({ bwPort: 8807, pbPort: 8808, extraItems: 0 });
const ext = await extensionCopy();
const { ctx, sw, extId } = await launch(chromium, ext, { headless: false, debugPort: DEBUG_PORT });

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };
const x = (...args) => execFileSync('python3', [new URL('./xinput.py', import.meta.url).pathname, ...args.map(String)]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Screen coordinates of the centre of `selector` (the window has no frame under Xvfb without a window manager). */
async function screenPoint(page, selector) {
  return page.$eval(selector, (el) => {
    const r = el.getBoundingClientRect();
    const top = window.outerHeight - window.innerHeight; // tab strip and toolbar above the page
    const left = (window.outerWidth - window.innerWidth) / 2;
    return { x: window.screenX + left + r.x + r.width / 2, y: window.screenY + top + r.y + r.height / 2 };
  });
}

/** Opens the context menu on a field with the right mouse button and picks an OmniVault entry by keyboard. */
async function contextMenu(page, selector, keys) {
  const p = await screenPoint(page, selector);
  x('click', p.x, p.y, 1);
  await sleep(150);
  x('click', p.x, p.y, 3);
  await sleep(600);
  x('keys', ...keys);
  await sleep(300);
}

try {
  // account with the simulated Bitwarden server, unlocked
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html`);
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
  await popup.close();

  const site = await ctx.newPage();
  await site.goto(`${ORIGIN}/login.html`);
  await site.bringToFront();
  await sleep(500);

  // Ctrl+Shift+L: matching login filled
  const u = await screenPoint(site, '#u');
  x('click', u.x, u.y, 1);
  await sleep(200);
  x('key', 'ctrl+shift+l');
  await site.waitForFunction(() => document.querySelector('#p').value !== '', null, { timeout: 5000 }).catch(() => {});
  check(await site.inputValue('#u') === 'alice' && await site.inputValue('#p') === 'gh-pass', 'Strg+Umschalt+L füllt den passenden Login aus');

  // Alt+Shift+O: the toolbar popup opens
  x('key', 'alt+shift+o');
  let popupOpen = false;
  for (let i = 0; i < 30 && !popupOpen; i++) {
    popupOpen = (await targets(DEBUG_PORT)).some((t) => t.url === `chrome-extension://${extId}/popup.html`);
    if (!popupOpen) await sleep(100);
  }
  check(popupOpen, 'Alt+Umschalt+O öffnet das OmniVault-Popup');
  x('key', 'Escape');
  await sleep(300);
  await site.bringToFront();

  // context menu → OmniVault → "Mit OmniVault ausfüllen"
  await site.fill('#u', '');
  await site.fill('#p', '');
  await contextMenu(site, '#u', (process.env.OV_MENU_FILL ?? 'Up Up Right Return').split(' '));
  await site.waitForFunction(() => document.querySelector('#p').value !== '', null, { timeout: 5000 }).catch(() => {});
  check(await site.inputValue('#u') === 'alice' && await site.inputValue('#p') === 'gh-pass', 'Kontextmenü „Mit OmniVault ausfüllen“ füllt den Login aus');

  // context menu in the password field → "Sicheres Passwort einfügen"
  await site.fill('#p', '');
  await contextMenu(site, '#p', (process.env.OV_MENU_GENERATE ?? 'Up Up Right Down Return').split(' '));
  await site.waitForFunction(() => document.querySelector('#p').value !== '', null, { timeout: 5000 }).catch(() => {});
  const generated = await site.inputValue('#p');
  check(generated.length >= 12 && generated !== 'gh-pass', `Kontextmenü „Sicheres Passwort einfügen“ setzt ein neues Passwort (${generated.length} Zeichen)`);
  const recent = await sw.evaluate(() => chrome.storage.session.get('generated').then((r) => r.generated?.[0]?.value));
  check(recent === generated, 'eingefügtes Passwort steht in der Liste zuletzt erzeugter Passwörter');

  await site.screenshot({ path: join(shots, 'shortcuts.png') });
} catch (e) {
  console.log('FAIL', e.stack ?? e);
  failures++;
} finally {
  await ctx.close();
  closeServers();
}
console.log(failures ? `\n${failures} Fehler` : '\nalle Prüfungen bestanden');
process.exit(failures ? 1 : 0);
