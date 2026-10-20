// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Minimal WebDriver BiDi client for Firefox, without extra packages (Node ≥ 22: global WebSocket).
// Playwright's Firefox cannot load extensions; this starts a stock Firefox, installs the extension temporarily
// (webExtension.install) and drives pages with real input events.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Starts Firefox with a fresh profile. `prefs` go into user.js; `uuid` fixes the moz-extension:// host of `addonId`.
 * Returns a client with send(), the browser process, the profile directory and the collected browser output.
 */
export async function launchFirefox({ bin = process.env.FIREFOX_BIN, port = 9300 + Math.floor(Math.random() * 600),
  headless = true, prefs = {}, addonId, uuid, env } = {}) {
  if (!bin) throw new Error('FIREFOX_BIN nicht gesetzt (test/firefox.sh fetch)');
  const profile = await mkdtemp(join(tmpdir(), 'omnivault-ff-profile-'));
  const all = {
    'browser.shell.checkDefaultBrowser': false,
    'browser.startup.homepage_override.mstone': 'ignore',
    'datareporting.policy.dataSubmissionEnabled': false,
    'toolkit.telemetry.reportingpolicy.firstRun': false,
    'app.update.disabledForTesting': true,
    'devtools.console.stdout.content': true,
    'devtools.console.stdout.chrome': true,
    'extensions.webextensions.restrictedDomains': '',
    'intl.locale.requested': 'de',
    'intl.accept_languages': 'de-DE, de',
    ...(addonId && uuid ? { 'extensions.webextensions.uuids': JSON.stringify({ [addonId]: uuid }) } : {}),
    ...prefs,
  };
  await writeFile(join(profile, 'user.js'), Object.entries(all).map(([k, v]) => `user_pref(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join('\n'));
  const args = ['--no-remote', '--profile', profile, `--remote-debugging-port=${port}`, '-remote-allow-system-access'];
  if (headless) args.unshift('--headless');
  const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, MOZ_CRASHREPORTER_DISABLE: '1', ...(env ?? {}) } });
  const output = [];
  const collect = (d) => output.push(...String(d).split('\n').filter(Boolean));
  proc.stdout.on('data', collect);
  proc.stderr.on('data', collect);

  let ws;
  for (let i = 0; i < 100 && !ws; i++) {
    await sleep(200);
    if (!output.some((l) => l.includes('WebDriver BiDi listening'))) continue;
    ws = await new Promise((resolve) => {
      const s = new WebSocket(`ws://127.0.0.1:${port}/session`);
      s.onopen = () => resolve(s);
      s.onerror = () => resolve(null);
    });
  }
  if (!ws) { proc.kill(); throw new Error(`Firefox-Fernsteuerung nicht erreichbar:\n${output.slice(-10).join('\n')}`); }

  let next = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id != null && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      if (m.type === 'error') reject(new Error(`${m.error}: ${m.message}`)); else resolve(m.result);
    } else if (m.type === 'event') for (const l of listeners) l(m);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++next;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send('session.new', { capabilities: { alwaysMatch: { acceptInsecureCerts: true, unhandledPromptBehavior: { default: 'ignore' } } } });
  /** Runs `expression` in the browser window itself (needs -remote-allow-system-access): toolbar, sidebar, menus. */
  let chromeContext;
  const chrome = async (expression) => {
    chromeContext ??= (await send('browsingContext.getTree', { 'moz:scope': 'chrome', maxDepth: 0 })).contexts[0].context;
    const r = await send('script.evaluate', { target: { context: chromeContext }, expression: `(async () => JSON.stringify(await (${expression})))()`, awaitPromise: true });
    if (r.type === 'exception') throw new Error(`Browserfenster: ${r.exceptionDetails?.text}`);
    return r.result.value === undefined ? undefined : JSON.parse(r.result.value);
  };
  return {
    send, proc, profile, output, chrome,
    onEvent: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    async close() {
      await send('browser.close').catch(() => {});
      ws.close();
      await Promise.race([new Promise((r) => proc.once('exit', r)), sleep(5000)]);
      proc.kill('SIGKILL');
    },
  };
}

/** Deserializes a BiDi RemoteValue (enough for JSON-like results). */
export function fromRemote(v) {
  if (!v) return undefined;
  switch (v.type) {
    case 'undefined': return undefined;
    case 'null': return null;
    case 'string': case 'boolean': return v.value;
    case 'number': return typeof v.value === 'string' ? Number(v.value) : v.value;
    case 'array': return v.value.map(fromRemote);
    case 'object': return Object.fromEntries(v.value.map(([k, x]) => [typeof k === 'string' ? k : fromRemote(k), fromRemote(x)]));
    default: return `[${v.type}]`;
  }
}

/** A tab (top-level browsing context) with Playwright-like helpers built on BiDi. */
export class Tab {
  constructor(ff, context) { this.ff = ff; this.context = context; }

  static async open(ff, url) {
    const { context } = await ff.send('browsingContext.create', { type: 'tab' });
    const tab = new Tab(ff, context);
    if (url) await tab.goto(url);
    return tab;
  }

  goto(url) { return this.ff.send('browsingContext.navigate', { context: this.context, url, wait: 'complete' }); }
  reload() { return this.ff.send('browsingContext.reload', { context: this.context, wait: 'complete' }); }
  activate() { return this.ff.send('browsingContext.activate', { context: this.context }); }
  close() { return this.ff.send('browsingContext.close', { context: this.context }).catch(() => {}); }

  /** Runs `fn(...args)` in a frame of this tab (context id); args must be JSON values. */
  async evalIn(context, fn, ...args) {
    // results travel as JSON text (BiDi leaves out the value of objects that occur twice)
    const wrapper = `async (...a) => { const r = await (${fn.toString()})(...a.map((x) => JSON.parse(x))); return r === undefined ? undefined : JSON.stringify(r); }`;
    const r = await this.ff.send('script.callFunction', {
      functionDeclaration: wrapper, awaitPromise: true, target: { context },
      arguments: args.map((a) => ({ type: 'string', value: JSON.stringify(a) })),
      serializationOptions: { maxObjectDepth: 20 },
      userActivation: true,
    }).catch((e) => ({ type: 'exception', exceptionDetails: { text: e.message } }));
    if (r.type === 'exception') throw new Error(`Skriptfehler: ${r.exceptionDetails?.text}`);
    const v = fromRemote(r.result);
    return v === undefined ? undefined : JSON.parse(v);
  }

  async wait(fn, { timeout = 8000, what = 'Bedingung' } = {}, ...args) {
    const end = Date.now() + timeout;
    let last;
    while (Date.now() < end) {
      try { last = await this.evalWrapped(fn, args); if (last) return last; } catch (e) { last = e.message; }
      await sleep(100);
    }
    throw new Error(`Zeitüberschreitung: ${what} (${last})`);
  }

  evalWrapped(fn, args) { return this.evalIn(this.context, fn, ...args); }

  $eval(fn, ...args) { return this.evalWrapped(fn, args); }

  async waitFor(selector, opts = {}) {
    return this.wait((s) => { const e = document.querySelector(s); return !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length); },
      { what: selector, ...opts }, selector);
  }

  async text(selector) { return this.$eval((s) => document.querySelector(s)?.textContent ?? null, selector); }
  async value(selector) { return this.$eval((s) => document.querySelector(s)?.value ?? null, selector); }
  async visible(selector) { return this.$eval((s) => { const e = document.querySelector(s); return !!e && !!(e.offsetWidth || e.offsetHeight); }, selector); }

  /** Element center in viewport coordinates; `textMatch` picks the first element whose text contains it. */
  async center(selector, textMatch) {
    await this.wait((s, t) => [...document.querySelectorAll(s)].some((e) => (!t || e.textContent.includes(t)) && e.offsetWidth),
      { what: `${selector}${textMatch ? ` "${textMatch}"` : ''}` }, selector, textMatch ?? null);
    return this.$eval((s, t) => {
      const e = [...document.querySelectorAll(s)].find((x) => (!t || x.textContent.includes(t)) && x.offsetWidth);
      e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    }, selector, textMatch ?? null);
  }

  /** A child frame (context id from frames()/waitFrame()) as a Tab: same helpers, real input inside the frame. */
  frame(f) { return new Tab(this.ff, f.context ?? f); }

  async mouseClick(x, y) {
    await this.ff.send('input.performActions', {
      context: this.context,
      actions: [{ type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' }, actions: [
        { type: 'pointerMove', x: Math.round(x), y: Math.round(y) }, { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 }] }],
    });
  }

  /** Real mouse click on an element (trusted events, user activation for permission prompts etc.). */
  async click(selector, textMatch) {
    const { x, y } = await this.center(selector, textMatch);
    await this.mouseClick(x, y);
  }

  async type(text) {
    const keys = [...text].flatMap((c) => [{ type: 'keyDown', value: c }, { type: 'keyUp', value: c }]);
    await this.ff.send('input.performActions', { context: this.context, actions: [{ type: 'key', id: 'kbd', actions: keys }] });
  }

  async press(key) {
    const map = { Enter: '', Escape: '', Tab: '', ArrowDown: '', Backspace: '' };
    const v = map[key] ?? key;
    await this.ff.send('input.performActions', { context: this.context, actions: [{ type: 'key', id: 'kbd', actions: [{ type: 'keyDown', value: v }, { type: 'keyUp', value: v }] }] });
  }

  /** Sets a field's value like a user would see it (focus, value, input/change events). */
  async fill(selector, value) {
    await this.wait((s) => !!document.querySelector(s), { what: selector }, selector);
    await this.$eval((s, v) => {
      const e = document.querySelector(s);
      e.focus();
      const proto = e instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : e instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, v);
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector, value);
  }

  select(selector, value) { return this.fill(selector, value); }

  /** Child frames (context ids and URLs) of this tab. */
  async frames() {
    const { contexts } = await this.ff.send('browsingContext.getTree', { root: this.context });
    const out = [];
    const walk = (c) => { for (const k of c.children ?? []) { out.push({ context: k.context, url: k.url }); walk(k); } };
    walk(contexts[0]);
    return out;
  }

  async waitFrame(file, { timeout = 8000 } = {}) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const f = (await this.frames()).find((x) => x.url.split('?')[0].endsWith(`/${file}`));
      if (f) return f;
      await sleep(100);
    }
    throw new Error(`${file} nicht erschienen`);
  }

  /** Screenshot of a web page (BiDi refuses extension pages: "privileged scope"; then nothing is written). */
  async screenshot(path) {
    const r = await this.ff.send('browsingContext.captureScreenshot', { context: this.context }).catch(() => null);
    if (r) await writeFile(path, Buffer.from(r.data, 'base64'));
    return !!r;
  }
}
