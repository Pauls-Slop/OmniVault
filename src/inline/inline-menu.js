// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Inline menu (iframe under a login field): logins of all unlocked accounts that belong to this site, and
// passkeys for it while the site waits for one.
import { initLanguage, t, translateDom } from '../i18n/index.js';
import { ext } from '../lib/browser.js';

await initLanguage();
translateDom();

const call = (type, payload = {}) => ext.runtime.sendMessage({ type, ...payload }).then((r) => { if (!r?.ok) throw new Error(r?.error ?? t('Fehler')); return r.result; });
const list = document.getElementById('list');
const note = (text) => { const p = document.createElement('p'); p.className = 'note'; p.textContent = text; list.replaceChildren(p); };

const row = (title, sub, i, onclick) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'row';
  b.style.setProperty('--h', i.accountHue);
  const who = document.createElement('div');
  const name = document.createElement('strong'); name.textContent = title;
  const user = document.createElement('span'); user.textContent = sub;
  who.append(name, user);
  const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = i.accountShort; badge.title = i.accountLabel;
  b.append(who, badge);
  b.addEventListener('click', onclick);
  return b;
};

try {
  const { host, items, locked, passkeys = [], requestId } = await call('inlineItems');
  document.getElementById('host').textContent = host;
  const keys = passkeys.map((p) => row(p.userName || p.name, t('Passkey · {name}', { name: p.name }), p, () => call('passkeyChoose', {
    requestId, choice: { accountId: p.accountId, itemId: p.itemId, credentialId: p.credentialId },
  }).catch((e) => note(e.message))));
  if (!items.length && !keys.length) note(locked ? t('OmniVault ist gesperrt. Zum Entsperren auf das OmniVault-Symbol in der Symbolleiste klicken.') : t('Keine Logins für diese Seite.'));
  else {
    list.replaceChildren(...keys, ...items.map((i) => row(i.name, i.username || t('(ohne Benutzername)'), i,
      () => call('inlineFill', { accountId: i.accountId, itemId: i.id }).catch((e) => note(e.message)))));
    if (!new URLSearchParams(location.search).has('auto')) list.querySelector('button')?.focus();
  }
} catch (e) {
  note(e.message);
}
