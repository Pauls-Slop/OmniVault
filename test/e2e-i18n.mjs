// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Language QA in the browser:
//  1. The browser language decides without being asked (English browser → English interface, manifest texts).
//  2. The language grid in the settings: keyboard, choice, reload in the new language, background messages.
//  3. Every view in every language and in the pseudo language: no horizontal scrolling, no clipped buttons,
//     tabs or headings; in the pseudo language every visible text must be marked (finds texts that bypass t()).
//  4. A contact sheet of screenshots per language for review by people who speak it.
// Usage: node test/e2e-i18n.mjs [path-to-playwright] [screenshot-dir]
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EMAIL, PASSWORD } from './fake-bitwarden.js';
import { extensionCopy, launch, startServers } from './servers.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const shots = process.argv[3] ?? join(tmpdir(), 'omnivault-i18n');
await mkdir(shots, { recursive: true });
const { chromium } = await import(pwPath);

const { ORIGIN, close: closeServers } = await startServers({ bwPort: 8797, pbPort: 8798 });
const ext = await extensionCopy();
const { ctx, extId } = await launch(chromium, ext, { lang: 'en-US' });

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };
const POPUP = `chrome-extension://${extId}/popup.html`;
// test data that is German on purpose (item names in the fake server), not interface text
const DATA = /^(Gelöscht|Team-Notiz|Server-Schlüssel)$|Langer-Eintrag-\d+-x+|benutzer\.mit\.sehr\.langem\.namen\.\d+@/;

/** Layout and (in the pseudo language) untranslated text of the current view. */
const audit = (pseudo) => {
  const visible = (el) => {
    for (let n = el; n; n = n.parentElement) if (n.hidden || getComputedStyle(n).display === 'none') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ')[0]}` : ''} “${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 50)}”`;
  const clipped = [...document.querySelectorAll('button, [role=tab], [role=option], h2, h3, summary, .tag, .chip')]
    .filter(visible)
    .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis' && !el.closest('.chip .label'))
    .map(describe);
  // a word of a button or tab broken across two lines ("Revisa|r"): each word must sit on one line
  const splitWord = (el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      for (const m of n.data.matchAll(/[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}]{2,}/gu)) {
        const r = document.createRange();
        r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        const tops = new Set([...r.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)));
        if (tops.size > 1) return true;
      }
    }
    return false;
  };
  clipped.push(...[...document.querySelectorAll('button, [role=tab], h2, h3, label')].filter(visible).filter(splitWord).map((el) => `${describe(el)} (word split across lines)`));
  const c = document.querySelector('#content');
  const boxes = [...document.querySelectorAll('input[type=checkbox]')].filter(visible).map((b) => { const r = b.getBoundingClientRect(); return `${Math.round(r.width)}×${Math.round(r.height)}`; });
  const out = { boxes: [...new Set(boxes)], hscroll: c.scrollWidth > c.clientWidth || document.documentElement.scrollWidth > document.documentElement.clientWidth, clipped, leaks: [] };
  if (pseudo) {
    const GERMAN = /[äöüÄÖÜß„]|\b(und|nicht|oder|mit|für|der|die|das|ein|eine|kein|keine|Konto|Konten|Eintrag|Einträge|Passwort|Speichern|Löschen|Zurück|Neu|Alle|Suchen)\b/;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.nodeValue.trim();
      const sentence = n.parentElement.closest('[data-i18n]'); // a sentence with links is split into several text nodes
      if (text && GERMAN.test(text) && !text.includes('⟦') && !sentence?.textContent.includes('⟦') && visible(n.parentElement) && !n.parentElement.closest('[translate=no], code')) out.leaks.push(text);
    }
    for (const el of document.querySelectorAll('[title], [aria-label], [placeholder]')) {
      if (!visible(el) || el.closest('[translate=no]')) continue;
      for (const a of ['title', 'aria-label', 'placeholder']) {
        const v = el.getAttribute(a);
        if (v && GERMAN.test(v) && !v.includes('⟦')) out.leaks.push(`${a}: ${v}`);
      }
    }
  }
  return out;
};

async function setLanguage(page, language) {
  await page.evaluate(async (l) => { await chrome.runtime.sendMessage({ type: 'setSettings', patch: { language: l } }); }, language);
}

try {
  /* ---------- 1. browser language by default ---------- */
  const popup = await ctx.newPage();
  const errors = [];
  popup.on('pageerror', (e) => errors.push(e.message));
  await popup.setViewportSize({ width: 380, height: 560 });
  await popup.goto(POPUP);
  await popup.waitForSelector('#empty:not([hidden])');
  check((await popup.textContent('#empty')).startsWith('No accounts yet'), `English browser → English interface: "${await popup.textContent('#empty')}"`);
  check(await popup.evaluate(() => document.documentElement.lang) === 'en', 'html lang="en"');
  check(await popup.getAttribute('#btn-settings', 'title') === 'Settings' && await popup.getAttribute('#search', 'placeholder') === 'Search …', 'static texts and attributes translated');
  const stored = await popup.evaluate(async () => (await chrome.storage.local.get('settings')).settings?.language ?? 'unset');
  check(stored === 'unset', 'nobody was asked: no language stored, "auto" is the default');
  const manifest = await popup.evaluate(() => ({ d: chrome.runtime.getManifest().description, ui: chrome.i18n.getUILanguage(), msg: chrome.i18n.getMessage('cmdOpen') }));
  check(manifest.msg === 'Open OmniVault' && manifest.d.startsWith('One place for all your password managers'), `manifest texts from _locales (${manifest.ui}): ${manifest.msg}`);

  // the pages shown on websites (inline list, "save login?" bar) follow the same language
  const inline = await ctx.newPage();
  await inline.goto(`chrome-extension://${extId}/inline-menu.html`);
  await inline.waitForSelector('#list .note');
  check(await inline.textContent('#list .note') === 'No saved logins for this site.' && await inline.getAttribute('#list', 'aria-label') === 'Logins for this site', 'inline list in English');
  await inline.goto(`chrome-extension://${extId}/save-bar.html`);
  check(await inline.textContent('#never') === 'Never for this site' && await inline.textContent('#question') === 'Save login?', 'save bar in English');
  await inline.close();

  /* ---------- 2. the language grid ---------- */
  await popup.click('#btn-settings');
  await popup.waitForSelector('#view-settings:not([hidden])');
  check(await popup.textContent('#view-settings h2') === 'Settings', 'settings in English');
  const button = popup.locator('.lang-button');
  check((await button.textContent()).includes('Automatic (English)'), `picker shows "${(await button.textContent()).trim()}"`);
  await button.click();
  check(await popup.isVisible('.lang-grid') && await button.getAttribute('aria-expanded') === 'true', 'grid opens, aria-expanded');
  const opts = await popup.$$eval('.lang-grid [role=option]', (o) => o.map((x) => [x.dataset.value, x.querySelector('.lang-title').textContent, x.getAttribute('aria-selected')]));
  check(opts.length === 9 && opts[0][0] === 'auto' && opts[0][2] === 'true', `9 choices, "auto" selected: ${opts.map((o) => o[1]).join(' | ')}`);
  const cols = await popup.$$eval('.lang-grid [role=option]', (o) => new Set(o.slice(1).map((x) => Math.round(x.getBoundingClientRect().left))).size);
  check(cols === 2, `languages laid out in a grid (${cols} columns)`);
  check(await popup.evaluate(() => document.activeElement.dataset.value) === 'auto', 'focus on the selected choice');
  const focusAfter = async (key) => { await popup.keyboard.press(key); return popup.evaluate(() => document.activeElement.dataset.value); };
  check(await focusAfter('ArrowDown') === 'de', 'ArrowDown from "auto" → first language');
  check(await focusAfter('ArrowRight') === 'en', 'ArrowRight → next column');
  check(await focusAfter('ArrowDown') === 'fr', 'ArrowDown → same column, next row');
  check(await focusAfter('End') === 'ja' && await focusAfter('Home') === 'auto', 'Home / End');
  await popup.keyboard.press('Escape');
  check(await popup.isHidden('.lang-grid') && await popup.evaluate(() => document.activeElement.classList.contains('lang-button')), 'Escape closes the grid, focus back on the button');
  check(await popup.isVisible('#view-settings'), 'Escape in the grid does not leave the settings');
  await button.click();
  await popup.keyboard.press('ArrowDown'); await popup.keyboard.press('ArrowRight'); await popup.keyboard.press('ArrowDown');
  await Promise.all([popup.waitForEvent('load'), popup.keyboard.press('Enter')]);
  await popup.waitForSelector('#view-settings:not([hidden])');
  check(await popup.textContent('#view-settings h2') === 'Paramètres', 'chosen language applies at once, settings stay open');
  check(await popup.evaluate(() => document.documentElement.lang) === 'fr' && (await popup.textContent('.lang-button')).includes('Français'), 'html lang="fr", picker shows Français');
  check(await popup.evaluate(async () => (await chrome.storage.local.get('settings')).settings.language) === 'fr', 'setting stored');
  const bgError = await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'setFavorite', accountId: 'nope', itemId: 'x', favorite: true }));
  check(/introuvable/.test(bgError.error ?? ''), `background answers in French: "${bgError.error}"`);
  const datesFr = await popup.evaluate(() => new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'long' }).format(new Date(2026, 9, 14)));
  check(datesFr === '14 octobre 2026', `dates in French (${datesFr})`);

  /* ---------- 3. every view in every language ---------- */
  // an unlocked account with items, so the list, detail, editor and tools have content
  const acc = await popup.evaluate(async ({ origin, email }) => (await chrome.runtime.sendMessage({ type: 'addAccount', provider: 'bitwarden', config: { server: origin, email }, label: 'Test', short: 'TE' })).result, { origin: ORIGIN, email: EMAIL });
  const login = await popup.evaluate(async ({ id, password }) => chrome.runtime.sendMessage({ type: 'login', id, credentials: { password } }), { id: acc.id, password: PASSWORD });
  check(login.ok, `test account unlocked${login.ok ? '' : `: ${login.error}`}`);

  // the settings list the connected accounts, with their state and actions
  await popup.reload();
  await popup.waitForSelector('#view-settings:not([hidden]), #view-main:not([hidden])');
  await popup.click('#btn-settings');
  await popup.waitForSelector('#view-settings .account-row');
  const rows = await popup.$$eval('#view-settings .account-row', (r) => r.map((x) => x.textContent));
  check(rows.length === 1 && rows[0].includes('Test') && /19/.test(rows[0]), `settings list the accounts: ${rows.join(' | ')}`);
  await popup.click('#view-settings .account-row button[title*="Test"] >> nth=0'); // lock
  await popup.waitForFunction(() => document.querySelector('#view-settings .account-row')?.classList.contains('locked'));
  check(true, 'account locked from the settings list');
  await popup.evaluate(async ({ id, password }) => chrome.runtime.sendMessage({ type: 'login', id, credentials: { password } }), { id: acc.id, password: PASSWORD });

  const sheet = [];
  const boxSizes = new Set();
  const languages = ['de', 'en', 'es', 'fr', 'it', 'pt-BR', 'zh-CN', 'ja', 'qps'];
  for (const lang of languages) {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${lang}: ${e.message}`));
    await page.setViewportSize({ width: 380, height: 560 });
    await page.goto(POPUP);
    await setLanguage(page, lang);
    await page.goto(POPUP);
    await page.waitForSelector('#view-main:not([hidden]) .item');
    const problems = [];
    const views = [];
    const look = async (name) => {
      const r = await page.evaluate(audit, lang === 'qps');
      if (r.hscroll) problems.push(`${name}: horizontal scrolling`);
      for (const size of r.boxes) { boxSizes.add(size); if (r.boxes.length > 1) problems.push(`${name}: checkboxes of different sizes (${r.boxes.join(', ')})`); }
      for (const c of r.clipped) problems.push(`${name}: clipped ${c}`);
      for (const l of r.leaks.filter((x) => !DATA.test(x.replace(/^(title|aria-label|placeholder): /, '')))) problems.push(`${name}: not translated: ${l}`);
      const file = `${lang}-${name}.png`;
      await page.screenshot({ path: join(shots, file) });
      views.push([name, file]);
    };
    const back = () => page.evaluate(() => document.querySelector('section:not([hidden]) .row.actions button.secondary, section:not([hidden]) [data-back]')?.click());

    await look('list');
    await page.click('#btn-new');
    await page.waitForSelector('#menu:not([hidden])');
    await look('menu-new');
    await page.click('#menu [role=menuitem]');
    await page.waitForSelector('#view-edit:not([hidden])');
    await look('editor');
    await page.selectOption('#view-edit select[name=type]', 'identity');
    await look('editor-identity');
    await back();
    await page.click('#view-main .item');
    await page.waitForSelector('#view-item:not([hidden])');
    await look('detail');
    await back();
    await page.click('#accounts .chip');
    await page.waitForSelector('#menu:not([hidden])');
    await look('menu-account');
    await page.keyboard.press('Escape');
    await page.click('#btn-generator');
    await page.waitForSelector('#view-generator:not([hidden])');
    await look('generator');
    await back();
    await page.click('#btn-tools');
    await page.waitForSelector('#view-tools:not([hidden])');
    const tabs = await page.$$eval('#view-tools [role=tab]', (t) => t.length);
    for (let i = 0; i < tabs; i++) {
      await page.click(`#view-tools [role=tab] >> nth=${i}`);
      await page.waitForTimeout(250);
      await look(`tools-${i + 1}`);
    }
    await page.click('#view-tools [role=tab] >> nth=0');
    await back();
    await page.click('#btn-settings');
    await page.waitForSelector('#view-settings:not([hidden])');
    await look('settings');
    await page.click('.lang-button');
    await page.evaluate(() => document.querySelector('.lang-grid').scrollIntoView({ block: 'center' }));
    await look('settings-language');
    await page.keyboard.press('Escape');
    await page.click('#settings-about');
    await page.waitForSelector('#view-about:not([hidden])');
    await look('about');
    await page.click('#view-about [data-back]');
    await page.click('#settings-add-account');
    await page.waitForSelector('#view-account:not([hidden])');
    await look('account-form');
    await page.selectOption('#acc-provider', 'passbolt');
    await look('account-form-passbolt');
    check(!problems.length, `${lang}: ${views.length} views without layout problems${lang === 'qps' ? ' or untranslated text' : ''}${problems.length ? `\n       ${problems.join('\n       ')}` : ''}`);
    sheet.push([lang, views]);
    await page.close();
  }
  check(boxSizes.size === 1, `every checkbox in every view has the same size (${[...boxSizes].join(', ')})`);
  check(!errors.length, `no script errors (${errors.join('; ')})`);

  // contact sheet: one row per language, for review by people who speak it
  const html = `<!doctype html><meta charset="utf-8"><title>OmniVault – Sprachen</title><style>
    body{font:13px system-ui;margin:16px;background:#f4f4f6} h2{margin:24px 0 8px} .row{display:flex;gap:10px;flex-wrap:wrap}
    figure{margin:0;background:#fff;padding:6px;border-radius:8px;box-shadow:0 1px 3px #0002} img{width:190px;display:block} figcaption{font-size:11px;color:#555;margin-top:4px}
  </style>${sheet.map(([lang, views]) => `<h2>${lang}</h2><div class="row">${views.map(([n, f]) => `<figure><img src="${f}"><figcaption>${n}</figcaption></figure>`).join('')}</div>`).join('')}`;
  await writeFile(join(shots, 'index.html'), html);
  const sheetPage = await ctx.newPage();
  await sheetPage.setViewportSize({ width: 1700, height: 900 });
  await sheetPage.goto(`file://${join(shots, 'index.html')}`);
  await sheetPage.screenshot({ path: join(shots, 'contact-sheet.png'), fullPage: true });
  console.log(`screenshots: ${shots}/index.html`);
} catch (e) {
  console.error(e);
  failures++;
} finally {
  await ctx.close();
  closeServers();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
