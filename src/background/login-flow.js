// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Login steps in a browser tab (Duo, the organization's sign-in): the server only sends the browser back to a fixed
// page of its web vault. OmniVault opens the tab, waits until it reaches that page, reads code and state from the
// address, closes the tab and finishes the login here – the popup has closed by then and picks up the outcome when
// it opens again. Reading the address needs no extra permission: it lies on the server the account already may
// reach (host permission). Everything stays in storage.session (memory only) and expires after a few minutes.
import { t } from '../i18n/index.js';
import { ext } from '../lib/browser.js';

const KEY = 'loginFlows';
const MAX_AGE = 10 * 60_000;

async function flows() {
  const { [KEY]: all = {} } = await ext.storage.session.get(KEY).catch(() => ({}));
  const now = Date.now();
  for (const [id, f] of Object.entries(all)) if (now - f.at > MAX_AGE) delete all[id];
  return all;
}
const save = (all) => ext.storage.session.set({ [KEY]: all });

/** Same page (origin + path), whatever the query: the connector pages carry code and state there. */
export function isReturnPage(url, returnUrl) {
  try {
    const a = new URL(url); const b = new URL(returnUrl);
    return a.origin === b.origin && a.pathname.replace(/\/+$/, '') === b.pathname.replace(/\/+$/, '');
  } catch { return false; }
}

/**
 * deps: { finish(accountId, pending, browserUrl) → public outcome }. finish runs the provider's next step and
 * returns what the popup should show; when that step needs more input, it returns `pending` to keep.
 */
export function createLoginFlows({ finish }) {
  const busy = new Set();

  async function complete(accountId, url) {
    if (busy.has(accountId)) return;
    busy.add(accountId);
    try {
      const all = await flows();
      const f = all[accountId];
      if (!f || f.phase !== 'browser') return;
      f.phase = 'working';
      await save(all);
      await ext.tabs.remove(f.tabId).catch(() => {});
      let outcome;
      try {
        outcome = await finish(accountId, f.pending, url);
      } catch (e) {
        outcome = { status: 'error', error: e.message };
      }
      await settle(accountId, outcome);
    } finally {
      busy.delete(accountId);
    }
  }

  /** Stores what came out of a step: a new tab, more input (with the provider's pending state) or the end. */
  async function settle(accountId, outcome) {
    const all = await flows();
    if (outcome.status === 'needs_browser') {
      const tab = await ext.tabs.create({ url: outcome.browser.url, active: true });
      all[accountId] = { phase: 'browser', kind: outcome.browser.kind, tabId: tab.id, returnUrl: outcome.browser.returnUrl, pending: outcome.pending, at: Date.now() };
    } else {
      const { pending, ...visible } = outcome;
      all[accountId] = { phase: 'done', outcome: visible, pending, at: Date.now() };
    }
    await save(all);
    return all[accountId];
  }

  ext.tabs?.onUpdated?.addListener((tabId, change, tab) => {
    const url = change.url ?? tab?.url;
    if (!url) return;
    flows().then((all) => {
      for (const [accountId, f] of Object.entries(all)) {
        if (f.phase === 'browser' && f.tabId === tabId && isReturnPage(url, f.returnUrl)) complete(accountId, url);
      }
    }).catch(() => {});
  });

  ext.tabs?.onRemoved?.addListener((tabId) => {
    flows().then(async (all) => {
      let changed = false;
      for (const f of Object.values(all)) {
        if (f.phase === 'browser' && f.tabId === tabId) {
          Object.assign(f, { phase: 'done', outcome: { status: 'error', error: t('Der Tab wurde geschlossen, bevor die Anmeldung abgeschlossen war.') }, pending: undefined });
          changed = true;
        }
      }
      if (changed) await save(all);
    }).catch(() => {});
  });

  return {
    /** Opens the tab for a step that returned needs_browser. */
    start: (accountId, outcome) => settle(accountId, outcome),
    settle,
    /** What the popup shows: phase and outcome, never the pending secrets. */
    async status(accountId) {
      const f = (await flows())[accountId];
      if (!f) return null;
      return { phase: f.phase, kind: f.kind, outcome: f.outcome, awaitingInput: !!f.pending };
    },
    /** Pending state for the next step (taken: a step runs once). */
    async take(accountId) {
      const all = await flows();
      const f = all[accountId];
      if (!f?.pending || f.phase !== 'done') return null;
      delete all[accountId];
      await save(all);
      return f.pending;
    },
    /** The popup has shown the outcome. */
    async clear(accountId) {
      const all = await flows();
      const f = all[accountId];
      if (!f) return;
      if (f.phase === 'browser') await ext.tabs.remove(f.tabId).catch(() => {});
      delete all[accountId];
      await save(all);
    },
    /** Focus the open tab again (the user switched away). */
    async focus(accountId) {
      const f = (await flows())[accountId];
      if (f?.phase !== 'browser') return false;
      const tab = await ext.tabs.update(f.tabId, { active: true }).catch(() => null);
      if (tab?.windowId != null) await ext.windows?.update(tab.windowId, { focused: true }).catch(() => {});
      return !!tab;
    },
  };
}
