// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Passkey dialog (iframe on the page while a site asks for a passkey): pick a passkey to sign in, or choose
// where to save a new one. "Other device or the browser" hands the request to the browser unchanged.
import { initLanguage, t, translateDom } from '../i18n/index.js';
import { ext } from '../lib/browser.js';

await initLanguage();
translateDom();

const call = (type, payload = {}) => ext.runtime.sendMessage({ type, ...payload }).then((r) => { if (!r?.ok) throw new Error(r?.error ?? t('Fehler')); return r.result; });
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...children) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...children.filter((c) => c != null));
  return n;
};
const requestId = new URLSearchParams(location.search).get('request');
const report = () => parent.postMessage({ ovPasskeyHeight: Math.ceil(document.body.getBoundingClientRect().height) }, '*');
const fail = (e) => { $('error').textContent = e.message; $('error').hidden = false; report(); };
let busy = false;
const act = (fn) => async () => {
  if (busy) return;
  busy = true;
  $('error').hidden = true;
  try { await fn(); } catch (e) { fail(e); } finally { busy = false; }
};

$('cancel').addEventListener('click', act(() => call('passkeyCancel', { requestId })));
$('other').addEventListener('click', act(() => call('passkeyCancel', { requestId, fallback: true })));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('cancel').click(); });

const badge = (a) => {
  const b = el('span', { className: 'badge', textContent: a.accountShort, title: a.accountLabel });
  b.style.setProperty('--h', a.accountHue);
  return b;
};

function lockedNote(info) {
  if (!info.locked.length) return null;
  const relevant = info.kind === 'get' ? info.locked.filter((l) => l.maybe) : info.locked;
  if (!relevant.length) return null;
  const text = info.kind === 'get'
    ? t('Gesperrt: {accounts}. Dort könnte ein Passkey für diese Seite liegen.', { accounts: relevant.map((l) => l.accountLabel).join(', ') })
    : t('Gesperrt: {accounts}.', { accounts: relevant.map((l) => l.accountLabel).join(', ') });
  return el('div', { className: 'locked' }, el('p', { textContent: text }),
    el('button', { type: 'button', id: 'unlock', textContent: t('Entsperren …'), onclick: act(async () => {
      await call('popOut');
      $('unlock').replaceWith(el('p', { className: 'hint', textContent: t('Nach dem Entsperren geht es hier weiter.') }));
      report();
    }) }));
}

function renderGet(info) {
  $('title').textContent = t('Mit Passkey anmelden');
  $('detail').textContent = info.candidates.length
    ? t('Passkey für {site} auswählen.', { site: info.host })
    : t('{site} fragt nach einem Passkey.', { site: info.host });
  const rows = info.candidates.map((c) => {
    const who = el('div', {}, el('strong', { textContent: c.userDisplayName || c.userName || c.name }), el('span', { textContent: c.userName && c.userName !== (c.userDisplayName || c.userName) ? c.userName : c.name }));
    const b = el('button', { type: 'button', className: 'row' }, who, badge(c));
    b.style.setProperty('--h', c.accountHue);
    b.addEventListener('click', act(() => call('passkeyChoose', { requestId, choice: { accountId: c.accountId, itemId: c.itemId, credentialId: c.credentialId } })));
    return b;
  });
  $('content').replaceChildren(rows.length ? el('div', { className: 'list' }, ...rows) : '', lockedNote(info) ?? '');
}

function renderCreate(info) {
  $('title').textContent = t('Passkey speichern?');
  const user = info.user.name || info.user.displayName;
  $('detail').textContent = user
    ? t('{site} möchte einen Passkey für {user} anlegen.', { site: info.rpName, user })
    : t('{site} möchte einen Passkey anlegen.', { site: info.rpName });
  if (info.excluded) {
    $('content').replaceChildren(el('p', { className: 'hint', textContent: t('Für diese Seite ist schon ein Passkey in OmniVault gespeichert.') }));
    return;
  }
  const parts = [];
  if (info.targets.length) {
    const select = el('select', { id: 'target', 'aria-label': t('Speichern in') });
    for (const [n, x] of info.targets.entries()) {
      let text = x.itemId
        ? t('„{name}“ ({user}) in {account}', { name: x.name, user: x.username || t('(ohne Benutzername)'), account: x.accountLabel })
        : t('Neuer Login in {account}', { account: x.accountLabel });
      if (x.hasPasskey) text = t('{target} – ersetzt den vorhandenen Passkey', { target: text });
      select.append(new Option(text, String(n)));
    }
    // preselect a login of this user without a passkey, otherwise a new login
    const same = info.targets.findIndex((x) => x.itemId && !x.hasPasskey && x.username && x.username === info.user.name);
    select.value = String(same >= 0 ? same : 0);
    const save = el('button', { type: 'submit', id: 'save', textContent: t('Speichern') });
    const form = el('form', { id: 'form' }, el('label', { htmlFor: 'target', textContent: t('Speichern in') }), el('div', { className: 'pick' }, select, save));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const x = info.targets[Number(select.value)];
      save.disabled = true;
      act(() => call('passkeyChoose', { requestId, choice: { accountId: x.accountId, itemId: x.itemId } }))().finally(() => { save.disabled = false; });
    });
    parts.push(form);
  }
  const locked = lockedNote(info);
  if (locked) parts.push(locked);
  $('content').replaceChildren(...parts);
}

let shown = '';
async function load() {
  let info;
  try { info = await call('passkeyInfo', { requestId }); } catch (e) { fail(e); return null; }
  const key = JSON.stringify(info);
  if (key !== shown && !busy) {
    shown = key;
    const focused = document.activeElement?.id;
    (info.kind === 'get' ? renderGet : renderCreate)(info);
    ($(focused) ?? document.querySelector('#content button, #content select, #cancel'))?.focus();
    report();
  }
  return info;
}

const first = await load();
// while accounts are locked, look again: unlocking in the OmniVault window continues here
if (first?.locked?.length) {
  const timer = setInterval(async () => { const info = await load(); if (!info?.locked.length) clearInterval(timer); }, 1200);
}
new ResizeObserver(report).observe(document.body);
