// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// "Save this login?" bar (iframe at the top right of the page after a login form was sent).
import { initLanguage, t, translateDom } from '../i18n/index.js';
import { ext } from '../lib/browser.js';

await initLanguage();
translateDom();

const call = (type, payload = {}) => ext.runtime.sendMessage({ type, ...payload }).then((r) => { if (!r?.ok) throw new Error(r?.error ?? t('Fehler')); return r.result; });
const $ = (id) => document.getElementById(id);

const info = await call('pendingSaveInfo').catch(() => null);
if (!info) {
  call('dismissPending', {}).catch(() => {});
} else {
  const update = info.kind === 'update';
  $('question').textContent = update ? t('Passwort aktualisieren?') : t('Login speichern?');
  $('detail').textContent = update
    ? (info.username ? t('Neues Passwort für {username} auf {host} in „{account}“ übernehmen.', { username: info.username, host: info.host, account: info.targetLabel })
      : t('Neues Passwort für diesen Login auf {host} in „{account}“ übernehmen.', { host: info.host, account: info.targetLabel }))
    : t('{username} auf {host}', { username: info.username || t('(ohne Benutzername)'), host: info.host });
  $('save').textContent = update ? t('Aktualisieren') : t('Speichern');
  $('account').hidden = update;
  for (const a of info.accounts) $('account').append(new Option(a.label, a.id));
  $('form').style.gridTemplateColumns = update ? '1fr' : '';
  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('save').disabled = true;
    try { await call('savePending', { accountId: $('account').value }); } catch (x) { $('detail').textContent = x.message; $('save').disabled = false; }
  });
  $('later').addEventListener('click', () => call('dismissPending', {}));
  $('never').addEventListener('click', () => call('dismissPending', { never: true }));
}
