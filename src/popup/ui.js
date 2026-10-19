// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Small DOM and messaging helpers shared by all popup views.
import { ext } from '../lib/browser.js';
import { mark, t } from '../i18n/index.js';
import { icon } from './icons.js';

export { icon, typeIcon } from './icons.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export async function call(type, payload = {}) {
  const res = await ext.runtime.sendMessage({ type, ...payload });
  if (!res) throw new Error(t('Keine Antwort vom Hintergrunddienst'));
  if (!res.ok) { const e = new Error(res.error); e.code = res.code; throw e; }
  return res.result;
}

/** Tiny hyperscript: el('div', { className, onclick, vars: {'--x': 1} }, ...children) */
export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'className') n.className = v;
    else if (k === 'style') Object.assign(n.style, v);
    else if (k === 'vars') for (const [vk, vv] of Object.entries(v)) n.style.setProperty(vk, vv);
    else if (k === 'value') n.value = v ?? '';
    else if (k === 'checked') n.checked = !!v;
    else if (v !== undefined && v !== false && v !== null) n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) n.append(c);
  return n;
}

export function toast(msg, ms = 2200) {
  const box = $('#toast');
  box.textContent = msg;
  box.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { box.hidden = true; }, ms);
}

/* ---------- views ---------- */

// Navigation works like a browser history: back() and forward() move between the views opened in this
// popup, opening a view from a button drops the forward entries, and the list ('main') is the start.
// Every entry remembers how it was opened (`restore`), so returning to it renders it afresh – the
// sections are shared (one item view for all items) and may show something else by then.
const viewHooks = new Map(); // name → { onLeave }
const MAIN = { view: 'main' };
let current = MAIN;
const past = [];
let future = [];
let replaying = null; // entry whose restore() is running; its show() call only displays it
const owner = new Map([['main', MAIN]]); // view → entry its section currently shows

export function onLeave(view, fn) { viewHooks.set(view, { ...(viewHooks.get(view) ?? {}), onLeave: fn }); }

function display(entry) {
  owner.set(entry.view, entry);
  for (const s of $$('#content > section')) s.hidden = s.id !== `view-${entry.view}`;
  $('#content').scrollTop = 0;
  const canBack = past.length > 0 || current !== MAIN;
  const nav = $('#nav');
  if (!nav) return;
  nav.hidden = !canBack && !future.length;
  $('#btn-nav-back').disabled = !canBack;
  $('#btn-nav-forward').disabled = !future.length;
}

function leave(next) {
  document.dispatchEvent(new CustomEvent('ov:navigate'));
  if (next.view !== current.view) viewHooks.get(current.view)?.onLeave?.();
}

/**
 * Show a view. `restore` re-opens it when the user comes back to it with back()/forward(); pass the
 * call that opened it. With `keep`, coming back shows the section as it was left (forms keep what was
 * typed) as long as no other entry has reused it. Showing the view that is already open updates it in place.
 */
export function show(view, { restore, keep = false } = {}) {
  if (replaying?.view === view) { // restore() of the entry we are navigating to
    const entry = replaying;
    replaying = null;
    document.dispatchEvent(new CustomEvent('ov:navigate'));
    return display(entry);
  }
  replaying = null;
  if (view === current.view) {
    document.dispatchEvent(new CustomEvent('ov:navigate'));
    if (restore) Object.assign(current, { restore, keep });
  } else {
    const entry = view === 'main' ? MAIN : { view, restore, keep };
    leave(entry);
    if (entry === MAIN) past.length = 0; else past.push(current);
    future = [];
    current = entry;
  }
  display(current);
}

async function go(entry) {
  leave(entry);
  current = entry;
  if (!entry.restore || (entry.keep && owner.get(entry.view) === entry)) return display(entry);
  replaying = entry;
  try {
    await entry.restore();
    if (replaying === entry) { replaying = null; display(entry); }
  } catch (e) { // e.g. the item was deleted or its account locked in the meantime
    if (replaying === entry) replaying = null;
    past.length = 0;
    future = [];
    current = MAIN;
    display(MAIN);
    toast(e.message);
  }
}

/**
 * One step back. `discard` drops the current view instead of keeping it for forward() (an editor
 * after saving); `render: false` leaves the display to the caller, which opens the next view itself.
 */
export function back({ discard = false, render = true } = {}) {
  const entry = past.pop() ?? (current !== MAIN ? MAIN : null);
  if (!entry) return Promise.resolve();
  if (!discard) future.push(current);
  if (!render) { leave(entry); current = entry; return Promise.resolve(); }
  return go(entry);
}

export function forward() {
  const entry = future.pop();
  if (!entry) return Promise.resolve();
  past.push(current);
  return go(entry);
}

export const currentView = () => current.view;
export const canGoBack = () => past.length > 0 || current !== MAIN;
export const canGoForward = () => future.length > 0;

/** Modal confirmation (confirm() is unreliable in Firefox extension popups). */
export function ask(text, { ok = t('OK'), danger = false, cancel = t('Abbrechen') } = {}) {
  const d = $('#dialog');
  $('#dialog-text').textContent = text;
  $('#dialog-input').hidden = true;
  // `cancel: false` makes it a notice with a single button
  $('#dialog-cancel').hidden = cancel === false;
  if (cancel !== false) $('#dialog-cancel').textContent = cancel;
  const okBtn = $('#dialog-ok');
  okBtn.textContent = ok;
  okBtn.classList.toggle('danger-ok', danger);
  d.returnValue = '';
  d.showModal();
  return new Promise((resolve) => {
    d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true });
  });
}

/**
 * Modal text input; resolves to the trimmed text, or null when cancelled or empty. `validate(text)` may return an
 * error message: the dialog then stays open and shows it under the field.
 */
export function promptText(text, { ok = t('OK'), value = '', placeholder = '', type = 'text', inputmode = null, validate = null } = {}) {
  const d = $('#dialog');
  const form = d.querySelector('form');
  const input = $('#dialog-input');
  const error = $('#dialog-error');
  $('#dialog-text').textContent = text;
  $('#dialog-ok').textContent = ok;
  $('#dialog-ok').classList.remove('danger-ok');
  $('#dialog-cancel').hidden = false;
  $('#dialog-cancel').textContent = t('Abbrechen');
  Object.assign(input, { hidden: false, value, placeholder, type });
  if (inputmode) input.setAttribute('inputmode', inputmode); else input.removeAttribute('inputmode');
  error.hidden = true;
  input.removeAttribute('aria-invalid');
  d.returnValue = '';
  d.showModal();
  input.focus();
  // true when the value may be accepted; otherwise the error is shown and the dialog stays open
  const accept = () => {
    const problem = validate?.(input.value.trim());
    error.hidden = !problem;
    error.textContent = problem || '';
    if (problem) { input.setAttribute('aria-invalid', 'true'); input.focus(); input.select(); return false; }
    return true;
  };
  const submit = (e) => { if (e.submitter?.value === 'ok' && !accept()) e.preventDefault(); };
  const enter = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (accept()) d.close('ok'); } };
  const typing = () => { if (!error.hidden) { error.hidden = true; input.removeAttribute('aria-invalid'); } };
  form.addEventListener('submit', submit);
  input.addEventListener('keydown', enter);
  input.addEventListener('input', typing);
  return new Promise((resolve) => {
    d.addEventListener('close', () => {
      form.removeEventListener('submit', submit);
      input.removeEventListener('keydown', enter);
      input.removeEventListener('input', typing);
      input.hidden = true;
      error.hidden = true;
      resolve(d.returnValue === 'ok' ? input.value.trim() || null : null);
    }, { once: true });
  });
}

export function badge(short, hue, title) {
  return el('span', { className: 'badge', vars: { '--acc-h': hue }, title, 'aria-label': title ? t('Konto: {name}', { name: title }) : null }, short);
}

/** Copy to clipboard; the background clears it again after the configured delay. */
export async function copy(text, label) {
  if (!text) return toast(t('Leer'));
  await navigator.clipboard.writeText(text);
  const { clipboardSeconds } = await call('settings');
  if (clipboardSeconds > 0) call('scheduleClipboardClear', { value: text }).catch(() => {});
  toast(clipboardSeconds > 0 ? t('{label} kopiert – wird nach {s} s geleert', { label, s: clipboardSeconds }) : t('{label} kopiert', { label }));
}

const TYPE_SOURCE = { login: mark('Login'), note: mark('Notiz'), card: mark('Karte'), identity: mark('Identität'), ssh: mark('SSH-Schlüssel'), other: mark('Sonstiges') };
/** Item type → name in the interface language. */
export const TYPE_LABEL = new Proxy(TYPE_SOURCE, { get: (o, k) => (typeof o[k] === 'string' ? t(o[k]) : o[k]) });
/** Borderless icon button; `label` is its tooltip and accessible name (attrs may override either). */
export const iconButton = (name, label, attrs = {}) =>
  el('button', { type: 'button', className: 'icon', title: label, 'aria-label': label, ...attrs }, icon(name));

export { language as uiLanguage, t, tn, tx } from '../i18n/index.js';
