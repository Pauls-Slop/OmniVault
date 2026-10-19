// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Item list with search and type filter.
import { ext } from '../lib/browser.js';
import { openItem } from './detail.js';
import { S, isToolbarPopup, refresh, windowed } from './state.js';
import { $, TYPE_LABEL, ask, badge, call, copy, el, icon, t, tn, toast, typeIcon, uiLanguage } from './ui.js';

export function hostOf(u) {
  try { return new URL(u).hostname; } catch { return u; }
}

export async function fillItem(i) {
  const tab = S.tab;
  if (!tab) return toast(t('Keine Webseite zum Ausfüllen'));
  // logins belong to a site; cards and identities fill any payment or address form
  if (i.type === 'login' && !i.matches && !await ask(t('Dieser Eintrag gehört nicht zur aktuellen Seite. Trotzdem ausfüllen?'), { ok: t('Ausfüllen') })) return;
  const n = await call('fill', { accountId: i.accountId, itemId: i.id, tabId: tab.id });
  if (!n) return toast(i.type === 'login' ? t('Kein Anmeldeformular gefunden') : t('Kein passendes Formular gefunden'));
  if (windowed) {
    toast(t('Ausgefüllt'));
    await ext.windows.update(tab.windowId, { focused: true });
  } else if (await isToolbarPopup()) {
    window.close();
  } else toast(t('Ausgefüllt'));
}

export function renderItems() {
  const q = $('#search').value.trim().toLowerCase();
  const type = $('#filter-type').value;
  const filtered = S.items.filter((i) => (!type || (type === 'fav' ? i.favorite : i.type === type)) && (!q ||
    [i.name, i.username, i.folder, i.subtitle, i.accountLabel, i.accountShort, ...(i.uris ?? [])]
      .some((v) => v?.toLowerCase().includes(q))));
  const matching = filtered.filter((i) => i.matches);
  const rest = filtered.filter((i) => !i.matches)
    .sort((a, b) => (b.favorite - a.favorite) || a.name.localeCompare(b.name, uiLanguage()));

  const group = (title, list) => list.length && el('div', { className: 'group' },
    el('h3', { className: 'group-title' }, title), el('div', { className: 'rows' }, list.map(itemNode)));
  $('#items').replaceChildren(...[
    group(t('Passend zu dieser Seite'), matching),
    group(q || type ? t('Treffer') : t('Alle Einträge'), rest.slice(0, 300)),
  ].filter(Boolean));

  // all accounts locked by the timer and a PIN set up: offer the PIN right here
  const pinForm = $('#pin-unlock');
  const pinWanted = !!S.state.pin?.sealed && !S.state.accounts.some((a) => a.unlocked);
  if (pinForm.hidden === pinWanted) { pinForm.hidden = !pinWanted; if (pinWanted) $('#pin-input').focus(); }

  const empty = $('#empty');
  empty.hidden = filtered.length > 0;
  empty.textContent = !S.state.accounts.length
    ? t('Noch kein Konto verbunden. Über „Neu“ oben rechts ein Konto hinzufügen.')
    : !S.state.accounts.some((a) => a.unlocked)
      ? t('Alle Konten sind gesperrt. Konto oben anklicken zum Entsperren.')
      : t('Keine Einträge gefunden.');
}

function itemNode(i) {
  const quick = (field, label) => el('button', {
    className: 'secondary',
    onclick: async (e) => {
      e.stopPropagation();
      const v = await call('secret', { accountId: i.accountId, itemId: i.id, field });
      await copy(field === 'totp' ? v?.code : v, field === 'totp' ? t('TOTP ({s} s)', { s: v?.remaining }) : label);
    },
  }, label);
  const host = i.uris?.[0] ? hostOf(i.uris[0]) : '';
  const meta = [i.username ?? i.subtitle, host, i.folder].filter(Boolean).join(' · ');
  return el('div', {
    className: 'item', vars: { '--acc-h': i.accountHue }, 'data-account': i.accountId, 'data-id': i.id,
    tabindex: '0', role: 'button', 'aria-label': t('{name} öffnen', { name: i.name }),
    onclick: () => openItem(i.accountId, i.id),
    onkeydown: (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openItem(i.accountId, i.id); },
  },
  el('div', { className: 'top' },
    el('span', { className: 'type-ico', title: TYPE_LABEL[i.type] ?? '' }, typeIcon(i.type)),
    el('div', { className: 'name', title: i.name }, i.name || t('(ohne Namen)')),
    i.favorite ? el('span', { className: 'fav', title: t('Favorit') }, icon('starFilled', { size: 14 })) : null,
    i.hasPasskey ? el('span', { className: 'pk', title: t('Mit Passkey') }, icon('passkey', { size: 14 })) : null,
    badge(i.accountShort, i.accountHue, i.accountLabel)),
  el('div', { className: 'meta' }, meta || ' '),
  i.type === 'login' ? el('div', { className: 'btns' },
    S.tab ? el('button', { onclick: (e) => { e.stopPropagation(); fillItem(i).catch((x) => toast(x.message)); } }, t('Ausfüllen')) : null,
    i.username ? quick('username', t('Benutzer')) : null,
    i.hasPassword ? quick('password', t('Passwort')) : null,
    i.hasTotp ? quick('totp', 'TOTP') : null) : null);
}

export function initList() {
  $('#pin-unlock').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#pin-error');
    err.hidden = true;
    $('#pin-submit').disabled = true;
    try {
      const { unlocked } = await call('unlockWithPin', { pin: $('#pin-input').value });
      $('#pin-input').value = '';
      toast(tn(unlocked, '{n} Konto entsperrt', '{n} Konten entsperrt'));
    } catch (x) {
      err.textContent = x.message; err.hidden = false;
    } finally {
      $('#pin-submit').disabled = false;
      await refresh();
    }
  });
  $('#search').addEventListener('input', renderItems);
  $('#filter-type').addEventListener('change', renderItems);
}
