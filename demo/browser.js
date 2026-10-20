// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Demo build only: replaces src/lib/browser.js. A web page has no extension APIs, so this provides the few the
// popup and the background use – in the same page, with storage in the tab's sessionStorage.
// Popup and background code stay unchanged; only the password managers behind them are simulated (registry.js).

const ROOT = new URL('../../', import.meta.url); // this file is src/lib/browser.js inside the demo build
const LOCAL = 'omnivault-demo:local';
const SESSION = 'omnivault-demo:session';

const listeners = () => {
  const set = new Set();
  return { addListener: (fn) => set.add(fn), removeListener: (fn) => set.delete(fn), hasListener: (fn) => set.has(fn), _set: set };
};

/** storage.local / storage.session on top of Web Storage (survives the popup closing and reopening). */
function area(web, key) {
  const read = () => { try { return JSON.parse(web().getItem(key) ?? '{}'); } catch { return {}; } };
  const write = (data) => { try { web().setItem(key, JSON.stringify(data)); } catch { /* storage blocked: memory only */ } };
  let mem = read();
  const pick = (keys) => {
    if (keys == null) return structuredClone(mem);
    if (typeof keys === 'string') keys = [keys];
    if (Array.isArray(keys)) return Object.fromEntries(keys.filter((k) => k in mem).map((k) => [k, structuredClone(mem[k])]));
    return Object.fromEntries(Object.entries(keys).map(([k, d]) => [k, k in mem ? structuredClone(mem[k]) : d]));
  };
  return {
    async get(keys) { mem = { ...read(), ...mem }; return pick(keys); },
    async set(items) { Object.assign(mem, structuredClone(items)); write(mem); },
    async remove(keys) { for (const k of [].concat(keys)) delete mem[k]; write(mem); },
    async clear() { mem = {}; write(mem); },
  };
}

/** The tab of the sample website next to the popup on the demo page. */
const TAB = { id: 1, windowId: 1, active: true, url: 'https://www.example.com/login', title: 'Example – Sign in' };
const pageWindow = () => { try { return window.parent?.document.getElementById('ov-page')?.contentWindow ?? null; } catch { return null; } };

const onMessage = listeners();
const runtime = {
  id: 'omnivault-demo',
  getURL: (path = '') => new URL(String(path).replace(/^\//, ''), ROOT).href,
  getManifest: () => ({ version: globalThis.OMNIVAULT_DEMO_VERSION ?? 'demo', name: 'OmniVault' }),
  onMessage,
  onInstalled: listeners(),
  onStartup: listeners(),
  /** Delivers to the background (same page), as the browser would, and resolves with its answer. */
  sendMessage(msg) {
    const sender = { id: runtime.id, url: runtime.getURL('popup.html') };
    return new Promise((resolve) => {
      let async = false;
      for (const fn of onMessage._set) {
        if (fn(structuredClone(msg), sender, (r) => resolve(structuredClone(r))) === true) async = true;
      }
      if (!async) resolve(undefined);
    });
  },
};

export const ext = {
  runtime,
  // both in sessionStorage: every visitor tab starts with the same unlocked sample accounts
  storage: { local: area(() => sessionStorage, LOCAL), session: area(() => sessionStorage, SESSION), onChanged: listeners() },
  i18n: { getUILanguage: () => navigator.language },
  action: { setPopup: async () => {}, onClicked: listeners() },
  commands: {
    getAll: async () => [{ name: '_execute_action', shortcut: 'Alt+Shift+O' }, { name: 'autofill', shortcut: /Mac/.test(navigator.platform) ? '⇧⌘L' : 'Ctrl+Shift+L' }],
    onCommand: listeners(),
  },
  permissions: { contains: async () => true, request: async () => true, remove: async () => true, getAll: async () => ({ origins: [], permissions: [] }) },
  tabs: {
    query: async () => [{ ...TAB }],
    getCurrent: async () => undefined, // the toolbar popup
    sendMessage: async () => undefined,
    reload: async () => { pageWindow()?.location.reload(); },
    onActivated: listeners(),
    onUpdated: listeners(),
  },
  windows: {
    getCurrent: async () => ({ id: 1, type: 'normal' }),
    getLastFocused: async () => ({ id: 1, type: 'normal' }),
    update: async (id) => ({ id }),
    create: async ({ url, width = 420, height = 640 }) => {
      window.open(url, 'omnivault-demo-window', `popup,width=${width},height=${height}`);
      return { id: 2 };
    },
    remove: async () => {},
    onFocusChanged: listeners(),
    onRemoved: listeners(),
  },
  /** Runs the extension's own injected function in the sample website next to the popup. */
  scripting: {
    async executeScript({ func, args = [] }) {
      await window.parent?.ovDemo?.showPage?.(); // the sample page is behind a button; filling needs it on screen
      const w = pageWindow();
      if (!w) return [{ result: 0 }];
      const fn = w.eval(`(${func.toString()})`);
      return [{ result: fn(...args) }];
    },
  },
};

globalThis.chrome = ext; // i18n reads the UI language from the global, as in the extension

/** The toolbar popup closes after filling; the demo window keeps it open and shows the sample page instead. */
window.close = () => { if (window.parent !== window) window.parent.postMessage({ omnivaultDemo: 'close' }, location.origin); };
