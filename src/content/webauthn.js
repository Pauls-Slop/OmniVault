// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Bridge for passkeys (content script, only with "Passkeys" turned on): passes the page script's requests to
// OmniVault, shows the passkey dialog (an extension page in an iframe inside a closed shadow root, so the page
// cannot read or script it) and hands the result back to the page.
(() => {
  if (window.top !== window || window.__omnivaultPasskeys) return;
  window.__omnivaultPasskeys = true;
  const CHANNEL = 'omnivault-webauthn';
  const ext = globalThis.browser ?? globalThis.chrome;
  // see webauthn-page.js: DOM events with JSON text in both directions
  const toPage = (msg) => document.dispatchEvent(new CustomEvent(`${CHANNEL}:page`, { detail: JSON.stringify(msg) }));
  let pageSeen = false; // for the check in the settings: the page script runs in this tab
  const send = (type, payload = {}) => ext.runtime.sendMessage({ type, ...payload }).then((r) => (r?.ok ? r.result : null)).catch(() => null);

  const pageIds = new Map(); // requestId → id of the call in the page
  const requestIds = new Map(); // id in the page → requestId

  /* ---------- dialog ---------- */
  let host = null;
  let frame = null;
  let shownFor = null;
  function showDialog(requestId) {
    if (!host) {
      host = document.createElement('omnivault-passkey');
      host.style.cssText = 'all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647;';
      const root = host.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = `iframe { position: fixed; top: 12px; right: 12px; width: 380px; max-width: calc(100vw - 24px); height: 220px;
        border: 0; border-radius: 10px; box-shadow: 0 10px 32px #0005; background: transparent; color-scheme: normal; }`;
      frame = document.createElement('iframe');
      frame.title = 'OmniVault';
      frame.setAttribute('allow', '');
      root.append(style, frame);
    }
    (document.body ?? document.documentElement).append(host);
    shownFor = requestId;
    frame.src = `${ext.runtime.getURL('passkey.html')}?request=${encodeURIComponent(requestId)}`;
    frame.addEventListener('load', () => frame.focus(), { once: true });
  }
  function closeDialog(requestId) {
    if (!host || (requestId && shownFor !== requestId)) return;
    shownFor = null;
    frame.src = 'about:blank';
    host.remove();
  }
  // the dialog reports its height (only messages from our iframe count)
  const extOrigin = new URL(ext.runtime.getURL('')).origin;
  window.addEventListener('message', (e) => {
    if (!frame || e.origin !== extOrigin || typeof e.data?.ovPasskeyHeight !== 'number') return;
    frame.style.height = `${Math.max(120, Math.min(e.data.ovPasskeyHeight, window.innerHeight - 24))}px`;
  });

  /* ---------- page ↔ OmniVault ---------- */
  document.addEventListener(`${CHANNEL}:bridge`, async (e) => {
    let m;
    try { m = JSON.parse(typeof e.detail === 'string' ? e.detail : ''); } catch { return; }
    if (!m?.type) return;
    pageSeen = true;
    if (m.type === 'hello') { toPage({ type: 'ready' }); return; }
    if (m.type === 'capable') { toPage({ type: 'capable', id: m.id, capable: !!(await send('ovPasskeyCapable'))?.capable }); return; }
    if (m.type === 'request') {
      const d = await send('ovPasskey', { kind: m.kind, options: m.options, mediation: m.mediation });
      if (!d?.requestId) { toPage({ type: 'decision', id: m.id, action: 'fallback' }); return; }
      pageIds.set(d.requestId, m.id);
      requestIds.set(m.id, d.requestId);
      toPage({ type: 'decision', id: m.id, action: d.action });
      if (d.action === 'dialog') showDialog(d.requestId);
    }
    if (m.type === 'end') { // aborted by the page, or the browser answered a conditional request
      const requestId = requestIds.get(m.id);
      if (!requestId) return;
      requestIds.delete(m.id);
      pageIds.delete(requestId);
      closeDialog(requestId);
      send('ovPasskeyEnd', { requestId });
    }
  });

  ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'ov-passkey-ping') { sendResponse({ bridge: true, page: pageSeen }); return; }
    if (msg?.type !== 'ov-passkey-result') return;
    const id = pageIds.get(msg.requestId);
    closeDialog(msg.requestId);
    if (id == null) return;
    pageIds.delete(msg.requestId);
    requestIds.delete(id);
    toPage({ type: 'result', id, result: msg.result });
  });

  toPage({ type: 'ready' });
})();
