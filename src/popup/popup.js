// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Popup entry point: header actions, target tab, wiring of all views.
import { ext } from '../lib/browser.js';
import { initAccounts, openAccountForm, renderAccounts, resumeAccountStep } from './accounts.js';
import { openItem } from './detail.js';
import { openEditor } from './editor.js';
import { openGenerator } from './generator.js';
import { initList, renderItems } from './list.js';
import { initMenu, openMenu } from './menu.js';
import { openSettings, resumeSetting } from './settings.js';
import { takeResume } from './resume.js';
import { openTools } from './tools.js';
import { S, isToolbarPopup, mode, onRefresh, providerOf, refresh, sidebar, windowed, writableAccounts } from './state.js';
import { hydrateIcons } from './icons.js';
import { $, $$, back, call, currentView, el, forward, show, t, toast, uiLanguage } from './ui.js';
import { initLanguage, mark, translateDom } from '../i18n/index.js';
import { sampleIdentity } from '../lib/sample-identity.js';

// the interface language first: everything below renders in it
try { await initLanguage(); translateDom(); } finally { document.documentElement.classList.remove('i18n-pending'); }

if (windowed) { document.documentElement.classList.add('windowed'); document.body.classList.add('windowed'); }
if (sidebar) {
  document.documentElement.classList.add('sidebar');
  $('#site-access-text').textContent = t('Zum Ausfüllen aus der Seitenleiste braucht OmniVault Zugriff auf Webseiten.');
}
const SITE_ORIGINS = ['https://*/*', 'http://*/*'];

/* ---------- target tab ---------- */

/**
 * The tab to fill into. In the toolbar popup: the active tab (granted via activeTab).
 * In the separate window: the active tab of the last focused normal browser window;
 * its URL is only visible once the user granted site access.
 */
async function resolveTab() {
  if (!windowed) {
    const [active] = await ext.tabs.query({ active: true, currentWindow: true });
    return { tab: active && /^https?:/.test(active.url ?? '') ? active : null, noAccess: false };
  }
  // sidebar: the window it is docked to; separate window: the last focused normal browser window
  const w = sidebar ? await ext.windows.getCurrent().catch(() => null)
    : await ext.windows.getLastFocused({ windowTypes: ['normal'] }).catch(() => null);
  const [active] = w ? await ext.tabs.query({ active: true, windowId: w.id }) : [];
  if (!active) return { tab: null, noAccess: false };
  if (active.url === undefined) return { tab: null, noAccess: true };
  return { tab: /^https?:/.test(active.url) ? active : null, noAccess: false };
}

async function updateTarget() {
  const r = await resolveTab();
  S.tab = r.tab;
  $('#site-access').hidden = !r.noAccess;
  const target = $('#target');
  target.hidden = !windowed || !S.tab;
  if (S.tab) target.textContent = t('Ziel: {host}', { host: new URL(S.tab.url).host });
}

let retargetTimer;
function retarget() {
  clearTimeout(retargetTimer);
  retargetTimer = setTimeout(() => updateTarget().then(refresh).catch((e) => toast(e.message)), 150);
}

/**
 * Window this OmniVault belongs to: the toolbar popup and the sidebar sit in their browser window; the pop-out
 * window fills into the last focused normal window, so its sidebar opens there. Looked up ahead of time, because
 * sidePanel.open() must run synchronously inside the click.
 */
let browserWindowId = null;
const rememberWindow = () => (mode === 'window' ? ext.windows?.getLastFocused({ windowTypes: ['normal'] }) : ext.windows?.getCurrent())
  ?.then((w) => { browserWindowId = w?.id ?? null; }).catch(() => {});
rememberWindow();

/** Closes this surface after switching to another one (popup, pop-out window or sidebar). */
function closeSelf() {
  if (sidebar) {
    if (ext.sidePanel?.close && browserWindowId != null) ext.sidePanel.close({ windowId: browserWindowId }).catch(() => window.close());
    else window.close();
  } else window.close(); // toolbar popup or pop-out window
}

/** Opens OmniVault in its own window (or focuses the open one) and closes the popup or sidebar it came from. */
function popOut() {
  const opened = call('popOut'); // the background creates the window, so it survives this page closing
  // Firefox closes its sidebar only inside the click; the message above is already on its way
  if (sidebar && ext.sidebarAction?.close) { ext.sidebarAction.close(); return; }
  opened.then(async () => { if (sidebar || await isToolbarPopup()) closeSelf(); }).catch((e) => toast(e.message));
}

/**
 * Opens the sidebar of the browser window and closes the popup or pop-out window. Must run synchronously inside the
 * click (user gesture): Chrome needs the window id up front, Firefox opens its sidebar for the current window.
 */
function openSidebar() {
  let p;
  if (ext.sidePanel?.open && browserWindowId != null) p = ext.sidePanel.open({ windowId: browserWindowId });
  else if (ext.sidebarAction?.open && mode === 'window') return handOffToSidebar();
  else if (ext.sidebarAction?.open) p = ext.sidebarAction.open();
  else return toast(t('Seitenleiste wird von diesem Browser nicht unterstützt'));
  p.then(async () => { if (mode === 'window' || await isToolbarPopup()) closeSelf(); }).catch((e) => toast(e.message));
}

/**
 * Firefox opens the sidebar in the window in front, and from the pop-out window that is the pop-out itself
 * (which then closed, taking OmniVault with it). So the pop-out hands over instead: until the sidebar is open,
 * a click on the toolbar icon in the browser window opens it, and the sidebar closes this window once loaded.
 */
async function handOffToSidebar() {
  if ($('#handoff')) return;
  const cancel = el('button', { type: 'button', className: 'secondary', onclick: () => {
    banner.remove();
    call('sidebarHandoff', { cancel: true }).catch(() => {});
  } }, t('Abbrechen'));
  const banner = el('div', { id: 'handoff', className: 'banner handoff', role: 'status' },
    el('span', {}, t('Klicke jetzt im Browserfenster auf das OmniVault-Symbol in der Symbolleiste. OmniVault öffnet sich dort in der Seitenleiste, und dieses Fenster schließt sich.')),
    cancel);
  $('#app > header').after(banner);
  try { await call('sidebarHandoff'); } catch (e) { banner.remove(); toast(e.message); }
}

/* ---------- wiring ---------- */

hydrateIcons();
initMenu();
initAccounts();
initList();
onRefresh(() => { renderAccounts(); renderItems(); });

$('#btn-new').addEventListener('click', (e) => openMenu(e.currentTarget, [
  ...(writableAccounts().length ? [
    { ico: 'key', text: t('Neuer Login'), onSelect: () => openEditor({ preset: { type: 'login', uri: S.tab?.url ? new URL(S.tab.url).origin : '', name: S.tab?.url ? new URL(S.tab.url).hostname.replace(/^www\./, '') : '' } }) },
    { ico: 'note', text: t('Neue Notiz'), onSelect: () => openEditor({ preset: { type: 'note' } }) },
    ...[['card', mark('Neue Karte')], ['identity', mark('Neue Identität')]]
      .filter(([type]) => writableAccounts().some((a) => providerOf(a.provider)?.capabilities?.types?.includes(type)))
      .map(([type, text]) => ({ ico: type, text: t(text), onSelect: () => openEditor({ accountId: writableAccounts().find((a) => providerOf(a.provider).capabilities.types.includes(type)).id, preset: { type } }) })),
    ...(writableAccounts().some((a) => providerOf(a.provider)?.capabilities?.types?.includes('identity')) ? [{ ico: 'user', text: t('Neue Muster-Identität'), onSelect: () => {
      const sample = sampleIdentity(uiLanguage());
      openEditor({ accountId: writableAccounts().find((a) => providerOf(a.provider).capabilities.types.includes('identity')).id,
        preset: { type: 'identity', name: t('Muster-Identität – {name}', { name: sample.name }), identity: sample.identity } });
    } }] : []),
    'hr',
  ] : []),
  { ico: 'user', text: t('Konto hinzufügen'), onSelect: () => openAccountForm({ mode: 'add' }) },
]));
$('#btn-generator').addEventListener('click', () => openGenerator());
$('#btn-tools').addEventListener('click', () => openTools().catch((e) => toast(e.message)));
$('#btn-settings').addEventListener('click', () => openSettings().catch((e) => toast(e.message)));
$('#btn-popout').addEventListener('click', popOut);
$('#btn-sidebar').addEventListener('click', openSidebar);
$('#btn-lock-all').addEventListener('click', async () => {
  await call('lockAll');
  toast(t('Alle gesperrt'));
  show('main');
  await refresh();
});
$('#btn-site-access').addEventListener('click', async () => {
  // permissions.request must be the first await inside the click (Firefox).
  if (await ext.permissions.request({ origins: SITE_ORIGINS })) retarget();
});
for (const b of $$('[data-back]')) b.addEventListener('click', () => back());

/* back/forward between views, with the keys and mouse buttons the browser uses for its own history */
const mac = /Mac|iPhone|iPad/.test(navigator.platform);
const busy = () => $('#dialog').open || !$('#menu').hidden;
$('#btn-nav-back').title = t('Zurück ({key})', { key: mac ? '⌘ [' : 'Alt + ←' });
$('#btn-nav-forward').title = t('Vorwärts ({key})', { key: mac ? '⌘ ]' : 'Alt + →' });
$('#btn-nav-back').addEventListener('click', () => back());
$('#btn-nav-forward').addEventListener('click', () => forward());
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !busy() && currentView() !== 'main') return back();
  // on a Mac, Option/Cmd + arrow move the cursor in text fields, so there only ⌘ [ and ⌘ ] navigate
  const typing = e.target.matches?.('input:not([type=checkbox], [type=radio], [type=range]), textarea, select');
  const arrow = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
  const only = (k) => ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'].every((m) => !!e[m] === (m === k));
  let dir = 0;
  if (e.key === 'BrowserBack') dir = -1;
  else if (e.key === 'BrowserForward') dir = 1;
  else if (arrow && only('altKey') && !(mac && typing)) dir = arrow;
  else if (mac && only('metaKey') && (e.key === '[' || e.key === ']')) dir = e.key === '[' ? -1 : 1;
  else if (mac && arrow && only('metaKey') && !typing) dir = arrow;
  if (!dir || busy()) return;
  e.preventDefault();
  if (dir < 0) back(); else forward();
});
// mouse buttons 4 and 5; cancelling them also keeps the browser from acting on its own history
document.addEventListener('mousedown', (e) => { if (e.button === 3 || e.button === 4) e.preventDefault(); });
document.addEventListener('mouseup', (e) => {
  if (e.button !== 3 && e.button !== 4) return;
  e.preventDefault();
  if (busy()) return;
  if (e.button === 3) back(); else forward();
});
if (sidebar) call('sidebarOpened').catch(() => {}); // completes a hand-over from the pop-out window (Firefox)
if (windowed) {
  document.title = 'OmniVault';
  if (sidebar) document.addEventListener('visibilitychange', () => { if (!document.hidden) retarget(); });
  window.addEventListener('focus', retarget);
  ext.windows.onFocusChanged.addListener(rememberWindow);
  ext.tabs.onActivated.addListener(retarget);
  ext.tabs.onUpdated.addListener((_id, info) => { if (info.status === 'complete' || info.url) retarget(); });
  ext.windows.onFocusChanged.addListener(retarget);
}

(async () => {
  await updateTarget();
  await refresh();
  $('#search').focus();
  const r = await takeResume();
  if (r?.view === 'settings') await resumeSetting(r);
  else if (r?.view === 'item') { // asked for the cloud file storage while adding an attachment
    await openItem(r.accountId, r.itemId);
    toast(r.granted ? t('Zugriff erteilt – jetzt die Datei wählen.') : t('Ohne Zugriff auf Bitwardens Dateispeicher lassen sich keine Anhänge hochladen.'));
  } else if (r) await resumeAccountStep(r);
  else if (location.hash === '#settings') { // reloaded after a language change
    history.replaceState(null, '', location.pathname + location.search);
    await openSettings();
  }
})().catch((e) => toast(e.message));
