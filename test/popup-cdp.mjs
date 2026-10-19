// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Drives the real toolbar popup (attached mode) via the Chrome DevTools Protocol. Playwright does not
// expose extension action popups as pages, so we attach to the popup target directly and send
// genuine mouse/keyboard input events.
export async function openToolbarPopup(ctx, sw, debugPort) {
  await sw.evaluate(() => chrome.action.openPopup());
  return attachTarget(debugPort, (t) => t.url.endsWith('/popup.html'), 'Toolbar-Popup');
}

/** The DevTools targets right now (pages, the side panel, popups …). */
export const targets = async (debugPort) => (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();

/** Attaches to the first target matching `match` (also used for the side panel, which Playwright does not list). */
export async function attachTarget(debugPort, match, what = 'Ziel') {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    target = (await targets(debugPort)).find((t) => match(t) && t.webSocketDebuggerUrl);
    if (!target) await new Promise((r) => setTimeout(r, 100));
  }
  if (!target) throw new Error(`${what} nicht gefunden`);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails?.exception?.description ?? msg.params.exceptionDetails?.text);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  await send('Runtime.enable');

  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: `(async () => (${expr}))()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const waitFor = async (expr, timeout = 5000) => {
    const end = Date.now() + timeout;
    for (;;) {
      if (await evaluate(expr)) return;
      if (Date.now() > end) throw new Error(`Timeout: ${expr}`);
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  /** Real mouse click at the centre of the first element matching `selector` (optionally containing text). */
  const click = async (selector, text) => {
    const box = await evaluate(`(() => {
      const els = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .filter((e) => ${JSON.stringify(text ?? '')} === '' || e.textContent.includes(${JSON.stringify(text ?? '')}));
      const e = els[0]; if (!e) return null;
      let r = e.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) { e.scrollIntoView({ block: 'center' }); r = e.getBoundingClientRect(); } // like a user scrolling
 return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: innerWidth, h: innerHeight };
    })()`);
    if (!box) throw new Error(`Element nicht gefunden: ${selector} ${text ?? ''}`);
    if (box.x < 0 || box.y < 0 || box.x > box.w || box.y > box.h) throw new Error(`Element außerhalb des Popups: ${selector} ${JSON.stringify(box)}`);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
    }
  };
  /** True if the element is fully inside the popup viewport without scrolling and not covered. */
  const inViewport = (selector) => evaluate(`(() => {
    const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return false;
    const r = e.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight || r.width === 0) return false;
    return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest(${JSON.stringify(selector)}) === e;
  })()`);
  const type = async (text) => send('Input.insertText', { text });
  const VK = { ArrowLeft: 37, ArrowRight: 39, Escape: 27, Enter: 13 };
  /** Real key press; `modifiers` as in CDP (Alt 1, Ctrl 2, Meta 4, Shift 8). */
  const key = async (k, modifiers = 0) => {
    const e = { key: k, code: k, modifiers, windowsVirtualKeyCode: VK[k] };
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...e });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...e });
  };
  /** The mouse's own back/forward buttons (4 and 5), pressed in the middle of the popup. */
  const sideButton = async (button) => {
    const { x, y } = await evaluate('({ x: innerWidth / 2, y: innerHeight / 2 })');
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1 });
  };
  const screenshot = async () => Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64');
  const isOpen = async () => {
    const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    return list.some((t) => t.id === target.id);
  };
  return { evaluate, waitFor, click, inViewport, type, key, sideButton, screenshot, isOpen, errors, close: () => ws.close() };
}
