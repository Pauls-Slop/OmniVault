// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test in Firefox: installs dist/firefox temporarily over WebDriver BiDi and checks the event page, the
// toolbar popup, the sidebar and the pop-out window, account + unlock against the simulated Bitwarden server,
// filling (click, shortcut, context menu), the content scripts on web pages, passkeys, native messaging,
// clipboard and auto-lock – and that nothing lands in the browser console.
// Usage: FIREFOX_BIN=… node test/e2e-firefox.mjs [screenshot-dir]   (or: test/firefox.sh test)
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { EMAIL, PASSWORD } from './fake-bitwarden.js';
import { launchFirefox, Tab } from './firefox-bidi.mjs';
import { startServers } from './servers.mjs';

const shots = process.argv[2] ?? tmpdir();
const ADDON = 'omnivault@example.org';
const UUID = '6f6d6e69-7661-4f75-8c74-000000000001';
const BASE = `moz-extension://${UUID}`;
const { ORIGIN, close: closeServers } = await startServers({ bwPort: 8827, pbPort: 8828 });

// copy of dist/firefox with localhost pre-granted and native messaging (no permission prompts in automation)
const ext = await mkdtemp(join(tmpdir(), 'omnivault-ff-'));
await cp('dist/firefox', ext, { recursive: true });
const manifest = JSON.parse(await readFile(join(ext, 'manifest.json'), 'utf8'));
// Firefox does not count http://localhost/* as covering other ports (permissions.contains), so name them
manifest.host_permissions.push('http://localhost/*', 'http://localhost:8827/*', 'http://localhost:8828/*');
manifest.permissions.push('nativeMessaging');
await writeFile(join(ext, 'manifest.json'), JSON.stringify(manifest));

// native messaging: host manifest in a private HOME (~/.mozilla/native-messaging-hosts), simulated pass-cli
const work = mkdtempSync(join(tmpdir(), 'omnivault-ff-native-'));
const FAKE = resolve('test/fixtures/fake-pass-cli.py');
chmodSync(FAKE, 0o755);
const nativeEnv = { HOME: work, OMNIVAULT_PASS_CLI: FAKE, FAKE_PASS_STATE: join(work, 'state.json'), FAKE_PASS_LOG: join(work, 'log.txt'), FAKE_PASS_LOGIN_URI: `${ORIGIN}/login.html` };
mkdirSync(join(work, '.mozilla'));
execFileSync('python3', ['native/install.py', '--firefox-only'], { env: { ...process.env, HOME: work, XDG_DATA_HOME: join(work, '.local/share') }, stdio: 'pipe' });
const hostManifestPath = join(work, '.mozilla/native-messaging-hosts/org.omnivault.host.json');

// with a display (xvfb-run) Firefox runs visibly and the shortcut is pressed with real X11 key events
const visible = !!process.env.DISPLAY;
const ff = await launchFirefox({ addonId: ADDON, uuid: UUID, env: nativeEnv, headless: !visible });
const WIDGET = 'omnivault_example_org';
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };
const consoleErrors = [];
// Firefox's own components without network access (remote settings, experiments)
const FIREFOX_NOISE = /RSLoader|Remote Settings|nimbus|RemoteSettings|services-settings/;
ff.onEvent((m) => {
  if (m.method === 'log.entryAdded' && m.params.level === 'error') consoleErrors.push(`${m.params.source?.context ?? ''} ${m.params.text}`);
});
await ff.send('session.subscribe', { events: ['log.entryAdded'] });

try {
  const { extension } = await ff.send('webExtension.install', { extensionData: { type: 'path', path: ext } });
  check(extension === ADDON, `extension installed temporarily (${extension})`);

  const popup = await Tab.open(ff, `${BASE}/popup.html`);
  const msg = (type, payload = {}) => popup.$eval((t, p) => browser.runtime.sendMessage({ type: t, ...p }).then((r) => { if (!r.ok) throw new Error(r.error); return r.result; }), type, payload);
  await popup.waitFor('#empty');
  // the Firefox build is English: browser language → English interface; then switch to German like the other tests
  check((await popup.text('#empty')).includes('No accounts yet'), 'event page answers, popup shows the empty state in the browser language');
  await msg('setSettings', { patch: { language: 'de' } });
  await popup.reload();
  await popup.waitFor('#empty');
  check((await popup.text('#empty')).includes('Noch kein Konto'), 'language switched to German');
  check(await popup.$eval(async () => (await browser.runtime.getBackgroundPage()).location.pathname) === '/_generated_background_page.html', 'event page running (background scripts as module)');
  check(await ff.chrome(`WebExtensionPolicy.getByID('${ADDON}').extension.warnings`).then((w) => w.length === 0), 'Firefox reports no manifest warnings');

  // the real toolbar popup (opened like a click on the icon) and its fixed size
  const openToolbarPopup = () => ff.chrome(`(async () => {
    const ext = WebExtensionPolicy.getByID('${ADDON}').extension;
    await ext.apiManager.global.browserActionFor(ext).openPopup(window);
    for (let i = 0; i < 50; i++) {
      const b = document.querySelector('.webextension-popup-browser');
      if (b?.currentURI?.spec.endsWith('/popup.html') && b.getBoundingClientRect().width > 300) {
        await new Promise((r) => setTimeout(r, 300));
        const r = b.getBoundingClientRect();
        return { url: b.currentURI.spec, w: Math.round(r.width), h: Math.round(r.height) };
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  })()`);
  const closeToolbarPopup = () => ff.chrome(`(() => { document.querySelector('.webextension-popup-browser')?.closest('panel')?.hidePopup(); return true; })()`);
  const tp = await openToolbarPopup();
  check(tp?.url === `${BASE}/popup.html` && tp.w === 380 && tp.h === 560, `toolbar popup opens with its fixed size (${JSON.stringify(tp)})`);
  await closeToolbarPopup();

  // account against the simulated Bitwarden server
  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]', 'Konto hinzufügen');
  await popup.waitFor('#view-account');
  await popup.select('#acc-fields select[name=server]', '__custom');
  await popup.fill('input[name=server__custom]', ORIGIN);
  await popup.fill('#acc-fields input[name=email]', EMAIL);
  await popup.fill('#form-account input[name=label]', 'Vaultwarden Test');
  await popup.click('#acc-submit');
  await popup.waitFor('#view-unlock').catch(async (e) => {
    await popup.screenshot(join(shots, 'firefox-account-fail.png'));
    throw new Error(`${e.message}; sichtbar: ${await popup.$eval(() => [...document.querySelectorAll('[id^=view-]:not([hidden]), .error:not([hidden]), #toast')].map((x) => x.id + ':' + x.textContent.trim().slice(0, 120)).join(' / '))}`);
  });
  await popup.fill('#form-unlock input[name=password]', 'falsch');
  await popup.click('#unlock-submit');
  await popup.waitFor('#unlock-error');
  check((await popup.text('#unlock-error')).includes('falsch'), 'wrong master password rejected');
  await popup.fill('#form-unlock input[name=password]', PASSWORD);
  await popup.click('#unlock-submit');
  await popup.waitFor('#view-main .item', { timeout: 20000 });
  const names = await popup.$eval(() => [...document.querySelectorAll('.item .name')].map((n) => n.textContent));
  check(names.length === 19 && names.includes('GitHub'), `unlocked, items decrypted (${names.length})`);
  await popup.screenshot(join(shots, 'firefox-popup.png'));

  // fill into a login page (scripting.executeScript in Firefox)
  const site = await Tab.open(ff, `${ORIGIN}/login.html`);
  const filled = await popup.$eval(async (o) => {
    const tab = (await browser.tabs.query({})).find((t) => t.url === `${o}/login.html`); // Firefox: url patterns with a port match nothing
    const st = await browser.runtime.sendMessage({ type: 'items' });
    const gh = st.result.find((i) => i.name === 'GitHub');
    return browser.runtime.sendMessage({ type: 'fill', accountId: gh.accountId, itemId: gh.id, tabId: tab.id });
  }, ORIGIN);
  check(filled.ok && filled.result === 2, `fill reported ${JSON.stringify(filled)}`);
  check(await site.value('#u') === 'alice' && await site.value('#p') === 'gh-pass', 'login form filled');
  const pw = await msg('secret', { accountId: (await msg('state')).accounts[0].id, itemId: (await msg('items')).find((i) => i.name === 'GitHub').id, field: 'password' });
  check(pw === 'gh-pass', 'password revealed on request');
  const accountId = (await msg('state')).accounts[0].id;
  const tabIdOf = (url) => popup.$eval(async (u) => (await browser.tabs.query({})).find((t) => t.url === u)?.id, url);

  // cards and identities into a payment form
  await site.goto(`${ORIGIN}/checkout.html`);
  const all = await msg('items');
  const checkoutTab = await tabIdOf(`${ORIGIN}/checkout.html`);
  await msg('fill', { accountId, itemId: all.find((x) => x.type === 'card').id, tabId: checkoutTab });
  await msg('fill', { accountId, itemId: all.find((x) => x.type === 'identity').id, tabId: checkoutTab });
  const form = await site.$eval(() => Object.fromEntries([...document.querySelectorAll('input, select')].map((e) => [e.id, e.value])));
  check(form.cn === 'Alice Example' && form.cc === '4111111111111111' && form.mm === '07' && form.yy === '2029' && form.cvc === '123'
    && form.fn === 'Alice' && form.em === 'alice@example.org', `card and identity filled (${form.cc}, ${form.mm}/${form.yy}, ${form.fn})`);

  // the real Firefox sidebar: with the setting "sidebar" a click on the toolbar icon (no popup) toggles it
  const sidebarState = () => ff.chrome(`(() => {
    const b = SidebarController.browser?.contentDocument?.getElementById('webext-panels-browser');
    return { open: SidebarController.isOpen, id: SidebarController.currentID, url: b?.currentURI?.spec ?? null };
  })()`);
  const waitSidebar = async (open) => {
    for (let i = 0; i < 50; i++) {
      const s = await sidebarState();
      if (open ? s.open && s.url?.endsWith('/sidebar.html') : !s.open) return s;
      await new Promise((r) => setTimeout(r, 100));
    }
    return sidebarState();
  };
  const clickToolbarIcon = () => ff.chrome(`(() => {
    const ext = WebExtensionPolicy.getByID('${ADDON}').extension;
    const ba = ext.apiManager.global.browserActionFor(ext);
    // a real click first brings this browser window to the front, then takes the button's path:
    // popup if there is one, otherwise action.onClicked
    window.focus();
    ba.triggerAction(window);
    return true;
  })()`);
  await msg('setSettings', { patch: { actionOpens: 'sidebar' } });
  check(await popup.$eval(() => browser.action.getPopup({})) === '', 'setting "sidebar": toolbar icon has no popup');
  await clickToolbarIcon();
  let sb = await waitSidebar(true);
  check(sb.open && sb.url === `${BASE}/sidebar.html`, `toolbar icon opens the sidebar (${JSON.stringify(sb)})`);
  // the sidebar's browser is not a BiDi context; extension pages share a process, so look at it from the popup tab
  const sideView = await popup.wait(() => {
    const [v] = browser.extension.getViews({ type: 'sidebar' });
    if (!v || !v.document.querySelector('.item')) return null;
    const css = (sel) => v.getComputedStyle(v.document.querySelector(sel)).display;
    return { sidebar: v.document.documentElement.classList.contains('sidebar'), items: v.document.querySelectorAll('.item').length,
      popout: css('#btn-popout') !== 'none', sidebarBtn: css('#btn-sidebar') !== 'none' };
  }, { what: 'sidebar view' }).catch((e) => ({ error: e.message }));
  check(sideView.sidebar && sideView.items > 0, `sidebar shows the unlocked items (${JSON.stringify(sideView)})`);
  check(sideView.popout && !sideView.sidebarBtn, 'sidebar offers the pop-out button, not the sidebar button');
  await clickToolbarIcon();
  sb = await waitSidebar(false);
  check(!sb.open, 'second click on the icon closes the sidebar');
  await msg('setSettings', { patch: { actionOpens: 'popup' } });
  check((await popup.$eval(() => browser.action.getPopup({}))).endsWith('/popup.html'), 'setting "popup": toolbar popup restored');

  // keyboard shortcut and context menu (registered by Firefox from the manifest and contextMenus)
  await site.goto(`${ORIGIN}/login.html`);
  await site.activate();
  const keys = await ff.chrome(`[...document.querySelectorAll('#ext-keyset-id-${WIDGET} key')].map((k) => [k.getAttribute('key'), k.getAttribute('modifiers')])`);
  check(JSON.stringify(keys) === JSON.stringify([['O', 'alt,shift'], ['L', 'accel,shift']]), `shortcuts registered (${JSON.stringify(keys)})`);
  await site.click('#u');
  if (visible) execFileSync('python3', ['test/xinput.py', 'key', 'ctrl+shift+l']);
  else await ff.chrome(`(() => { [...document.querySelectorAll('#ext-keyset-id-${WIDGET} key')].find((k) => k.getAttribute('key') === 'L').doCommand(); return true; })()`);
  await site.wait(() => document.querySelector('#p').value === 'gh-pass', { what: 'shortcut fill' }).catch(() => {});
  check(await site.value('#u') === 'alice' && await site.value('#p') === 'gh-pass', `Ctrl+Shift+L fills the login${visible ? ' (real X11 keys)' : ' (key command)'}`);
  await site.fill('#u', ''); await site.fill('#p', '');
  const contextItem = async (selector, id) => {
    const { x, y } = await site.center(selector);
    await ff.send('input.performActions', { context: site.context, actions: [{ type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' },
      actions: [{ type: 'pointerMove', x, y }, { type: 'pointerDown', button: 2 }, { type: 'pointerUp', button: 2 }] }] });
    return ff.chrome(`(async () => {
      const m = document.getElementById('contentAreaContextMenu');
      for (let i = 0; i < 30 && m.state !== 'open'; i++) await new Promise((r) => setTimeout(r, 100));
      const labels = [...m.querySelectorAll('[id^="${WIDGET}-menuitem-_"]')].map((i) => i.label);
      const it = document.getElementById('${WIDGET}-menuitem-_${id}');
      it?.doCommand();
      m.hidePopup();
      return labels;
    })()`);
  };
  const labels = await contextItem('#u', 'ov-fill');
  check(labels.includes('Mit OmniVault ausfüllen') && labels.includes('Sicheres Passwort einfügen (OmniVault)'), `context menu entries (${labels.join(' | ')})`);
  await site.wait(() => document.querySelector('#p').value === 'gh-pass', { what: 'context menu fill' }).catch(() => {});
  check(await site.value('#u') === 'alice' && await site.value('#p') === 'gh-pass', 'context menu "Mit OmniVault ausfüllen" fills the login');
  await site.fill('#p', '');
  await contextItem('#p', 'ov-generate');
  const generated = await site.wait(() => document.querySelector('#p').value, { what: 'generated password' }).catch(() => '');
  check(generated.length >= 12 && generated !== 'gh-pass', `context menu inserts a generated password (${generated.length} characters)`);
  check((await msg('generated')).some((g) => g.password === generated || g === generated || JSON.stringify(g).includes(generated)), 'generated password remembered');

  // pop-out window, then the hand-over to the sidebar: Firefox opens a sidebar only in the window in front, so the
  // pop-out asks for a click on the toolbar icon in the browser window; the sidebar then closes the pop-out
  await popup.$eval(() => browser.runtime.sendMessage({ type: 'popOut' }));
  const popout = await popup.wait(async () => (await browser.tabs.query({})).find((t) => t.url?.includes('popup.html?window=1')) ?? null, { what: 'pop-out window' });
  check(!!popout, 'pop-out window opened');
  await msg('sidebarHandoff');
  check(await popup.$eval(() => browser.action.getPopup({})) === '', 'hand-over: the toolbar icon now opens the sidebar');
  await clickToolbarIcon();
  sb = await waitSidebar(true);
  check(sb.open, 'hand-over: click on the icon opens the sidebar');
  const popoutGone = await popup.wait(async (id) => !(await browser.windows.getAll()).some((w) => w.id === id), { what: 'pop-out closed' }, popout.windowId).catch(() => false);
  check(popoutGone, 'hand-over: the sidebar closed the pop-out window');
  check((await popup.$eval(() => browser.action.getPopup({}))).endsWith('/popup.html'), 'hand-over finished: toolbar popup restored');
  await ff.chrome('(() => { SidebarController.hide(); return true; })()');

  // clipboard: copied secrets are cleared (Firefox: directly in the event page, which has a DOM)
  const readClipboard = () => ff.chrome('navigator.clipboard.readText()');
  await popup.$eval(() => navigator.clipboard.writeText('geheim-123'));
  check(await readClipboard() === 'geheim-123', 'clipboard written from the extension');
  await msg('clearClipboard');
  check((await readClipboard()).trim() === '', 'clipboard cleared by the event page');

  // content scripts: OmniVault button in the login field, fill from the list, "save login?"
  await msg('setSettings', { patch: { inlineMenu: true, offerSave: true } });
  await site.goto(`${ORIGIN}/login.html`);
  await site.activate();
  await site.click('#u');
  await site.wait(() => !!document.querySelector('omnivault-inline'), { what: 'omnivault-inline' });
  const box = await site.$eval(() => { const r = document.querySelector('#u').getBoundingClientRect(); return { x: r.right - 15, y: r.top + r.height / 2 }; });
  await site.mouseClick(box.x, box.y);
  const menu = site.frame(await site.waitFrame('inline-menu.html'));
  await menu.waitFor('.row');
  const rows = await menu.$eval(() => [...document.querySelectorAll('.row strong')].map((x) => x.textContent));
  check(rows.includes('GitHub'), `inline list shows the matching login (${rows.join(', ')})`);
  check(await site.$eval(() => { try { return !!document.querySelector('omnivault-inline').shadowRoot; } catch { return true; } }) === false, 'page cannot open the shadow root');
  await site.screenshot(join(shots, 'firefox-inline-menu.png'));
  await menu.click('.row', 'GitHub');
  await site.wait(() => document.querySelector('#p').value !== '', { what: 'filled from the list' });
  check(await site.value('#u') === 'alice' && await site.value('#p') === 'gh-pass', 'filled from the inline list');

  await site.fill('#u', 'neu@example.org');
  await site.fill('#p', 'Neu-Passwort-1');
  await site.click('button');
  const bar = site.frame(await site.waitFrame('save-bar.html'));
  await bar.waitFor('#save');
  const detail = await bar.wait(() => document.querySelector('#detail').textContent, { what: 'save bar text' }).catch(() => '');
  check((await bar.text('#question')).includes('speichern') && detail.includes('neu@example.org'), `save bar offers the new login (${detail})`);
  await site.screenshot(join(shots, 'firefox-save-bar.png'));
  await bar.click('#save');
  const saved = await popup.wait(async () => (await browser.runtime.sendMessage({ type: 'items' })).result.find((x) => x.username === 'neu@example.org') ?? null, { what: 'saved login' });
  check(saved?.accountId === accountId, 'new login saved in the account');

  // changed password of an existing login → "update the password?"
  await site.goto(`${ORIGIN}/login.html`);
  await site.fill('#u', 'alice');
  await site.fill('#p', 'gh-neu-2026');
  await site.click('button');
  const ubar = site.frame(await site.waitFrame('save-bar.html'));
  await ubar.waitFor('#save');
  const question = await ubar.wait(() => (document.querySelector('#detail').textContent ? document.querySelector('#question').textContent : ''), { what: 'update bar' }).catch(() => '');
  check(question.includes('aktualisieren'), `update bar for a changed password (${question})`);
  await ubar.click('#save');
  const ghId = (await msg('items')).find((x) => x.name === 'GitHub').id;
  const updated = await popup.wait(async (a, i) => ((await browser.runtime.sendMessage({ type: 'secret', accountId: a, itemId: i, field: 'password' })).result === 'gh-neu-2026'),
    { what: 'password updated' }, accountId, ghId).catch(() => false);
  check(updated, 'password of the existing login updated');

  // passkeys: dialog for create and get, verified by the test site's server; then the conditional request
  await msg('setSettings', { patch: { passkeys: true, inlineMenu: true, offerSave: false } });
  await site.goto(`${ORIGIN}/webauthn.html`);
  const ping = await popup.$eval(async (o) => {
    const tab = (await browser.tabs.query({})).find((t) => t.url === `${o}/webauthn.html`);
    return browser.tabs.sendMessage(tab.id, { type: 'ov-passkey-ping' }, { frameId: 0 });
  }, ORIGIN);
  check(ping?.bridge && ping?.page, `passkey bridge and page script run (${JSON.stringify(ping)})`);
  const out = async () => {
    const text = await site.wait(() => document.querySelector('#out').textContent, { timeout: 15000, what: 'page outcome' });
    await site.$eval(() => { document.querySelector('#out').textContent = ''; });
    return text;
  };
  await site.fill('#user', 'ada');
  await site.click('#register');
  let dialog = site.frame(await site.waitFrame('passkey.html'));
  await dialog.waitFor('#save');
  check(await dialog.text('#title') === 'Passkey speichern?', 'passkey dialog asks to save');
  await site.screenshot(join(shots, 'firefox-passkey-create.png'));
  await dialog.click('#save');
  let o = await out();
  check(o === `registriert:ada:${'0'.repeat(32)}`, `site verified the OmniVault passkey (${o})`);
  await site.click('#login');
  dialog = site.frame(await site.waitFrame('passkey.html'));
  await dialog.waitFor('.row');
  await dialog.click('.row', 'ada');
  o = await out();
  check(o === 'angemeldet:ada', `signed in with the passkey (${o})`);
  await site.click('#login');
  dialog = site.frame(await site.waitFrame('passkey.html'));
  await dialog.click('#cancel');
  o = await out();
  check(o === 'fehler:NotAllowedError', `cancel → NotAllowedError (${o})`);

  await site.goto(`${ORIGIN}/webauthn.html?conditional`);
  await new Promise((r) => setTimeout(r, 500));
  check(await site.text('#out') === '', 'conditional request waits');
  await site.click('#user');
  const cmenu = site.frame(await site.waitFrame('inline-menu.html'));
  await cmenu.waitFor('.row');
  const crows = await cmenu.$eval(() => [...document.querySelectorAll('.row strong')].map((x) => x.textContent));
  check(crows.includes('ada'), `field list offers the passkey (${crows.join(', ')})`);
  await cmenu.click('.row', 'ada');
  o = await out();
  check(o === 'angemeldet:ada:conditional', `signed in from the field list (${o})`);

  // locked account: the dialog offers to unlock, then continues
  await msg('lockAll');
  await site.goto(`${ORIGIN}/webauthn.html`);
  await site.click('#login');
  dialog = site.frame(await site.waitFrame('passkey.html'));
  await dialog.waitFor('#unlock');
  check((await dialog.text('.locked p')).includes('Vaultwarden Test'), 'locked: dialog offers to unlock the account');
  await msg('login', { id: accountId, credentials: { password: PASSWORD } });
  await dialog.waitFor('.row', { timeout: 10000 });
  await dialog.click('.row', 'ada');
  o = await out();
  check(o === 'angemeldet:ada', `signed in after unlocking (${o})`);

  // native messaging: Firefox host manifest (path, allowed_extensions) → host → simulated pass-cli (Proton Pass)
  const hostManifest = JSON.parse(readFileSync(hostManifestPath, 'utf8'));
  check(JSON.stringify(hostManifest.allowed_extensions) === JSON.stringify([ADDON]) && existsSync(hostManifest.path) && hostManifest.type === 'stdio',
    `host manifest in ~/.mozilla/native-messaging-hosts (allowed_extensions ${hostManifest.allowed_extensions})`);
  const proton = await msg('addAccount', { provider: 'protonpass', config: {}, label: 'Proton', short: 'PP', hue: 200 });
  await msg('login', { id: proton.id, credentials: {} });
  const protonItems = (await msg('items')).filter((i) => i.accountId === proton.id);
  check(protonItems.some((i) => i.name === 'Proton Mail'), `items via native messaging (${protonItems.length})`);
  const protonPw = await msg('secret', { accountId: proton.id, itemId: protonItems.find((i) => i.name === 'Proton Mail').id, field: 'password' });
  check(protonPw === 'proton-pw', 'secret fetched through the host');

  // auto-lock after inactivity: the event page checks once a minute (alarm); pretend the last activity was long ago
  await msg('setSettings', { patch: { autoLockMinutes: 1 } });
  await popup.$eval(() => browser.storage.session.set({ lastActivity: Date.now() - 10 * 60_000 }));
  const locked = await popup.wait(async () => !(await browser.runtime.sendMessage({ type: 'state' })).result.accounts.some((a) => a.unlocked),
    { timeout: 75_000, what: 'auto-lock' }).catch(() => false);
  check(locked, 'auto-lock: all accounts locked after the inactivity period (alarm in the event page)');
} catch (e) {
  failures++;
  console.log('FAIL', e.message);
} finally {
  // the browser console goes to stdout (devtools.console.stdout.chrome): errors of the event page and extension pages
  const extErrors = ff.output.map((l, i) => [l, ff.output[i + 1] ?? ''])
    .filter(([l, n]) => /^JavaScript error: moz-extension:/.test(l) || (/^console\.error:/.test(l) && !FIREFOX_NOISE.test(l + n)))
    .map(([l]) => l);
  check(extErrors.length === 0 && consoleErrors.length === 0, `no errors in the extension's console (${[...extErrors, ...consoleErrors].slice(0, 5).join(' | ')})`);
  if (process.env.FIREFOX_LOG) console.log(ff.output.join('\n')); // whole browser output for debugging
  await ff.close();
  closeServers();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
