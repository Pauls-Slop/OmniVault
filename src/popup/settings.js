// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Settings view: auto-lock, clipboard, shortcuts, about.
import { ext } from '../lib/browser.js';
import { PIN_MAX, PIN_MIN, validPin } from '../lib/pin-rules.js';
import { accountStatus, openAccountForm, openUnlock } from './accounts.js';
import { requestPermissions } from './resume.js';
import { S, providerOf, refresh } from './state.js';
import { languagePicker } from './language.js';
import { $, ask, back, badge, call, el, iconButton, promptText, show, t, tn, toast, tx } from './ui.js';

const select = (name, value, options) => {
  const s = el('select', { name }, options.map(([v, l]) => el('option', { value: String(v) }, l)));
  s.value = String(value);
  if (s.value !== String(value)) s.append(el('option', { value: String(value), selected: true }, String(value)));
  s.value = String(value);
  return s;
};

const minutes = (n) => tn(n, '{n} Minute', '{n} Minuten');
const hours = (n) => tn(n, '{n} Stunde', '{n} Stunden');
const seconds = (n) => tn(n, '{n} Sekunde', '{n} Sekunden');

export async function openSettings() {
  const s = await call('settings');
  const view = $('#view-settings');
  const autoLock = select('autoLockMinutes', s.autoLockMinutes, [[1, minutes(1)], [5, minutes(5)], [15, minutes(15)], [30, minutes(30)], [60, hours(1)], [240, hours(4)], [0, t('nie (nur beim Beenden des Browsers)')]]);
  const clip = select('clipboardSeconds', s.clipboardSeconds, [[10, seconds(10)], [30, seconds(30)], [60, minutes(1)], [120, minutes(2)], [0, t('nie')]]);
  const sidebarSupported = !!(ext.sidePanel || ext.sidebarAction);
  const actionOpens = select('actionOpens', s.actionOpens, [['popup', t('Popup')], ['sidebar', t('Seitenleiste')]]);
  actionOpens.disabled = !sidebarSupported;
  const autoSync = select('autoSyncMinutes', s.autoSyncMinutes, [[0, t('aus')], [5, t('alle {n} Minuten', { n: 5 })], [15, t('alle {n} Minuten', { n: 15 })], [30, t('alle {n} Minuten', { n: 30 })], [60, t('stündlich')]]);
  const sysLock = el('input', { type: 'checkbox', name: 'lockOnSystemLock', checked: s.lockOnSystemLock });
  const commands = await ext.commands?.getAll?.().catch(() => []) ?? [];
  const shortcut = (name) => commands.find((c) => c.name === name)?.shortcut || t('nicht belegt');

  const save = async () => {
    S.state.settings = await call('setSettings', { patch: {
      autoLockMinutes: Number(autoLock.value), clipboardSeconds: Number(clip.value), lockOnSystemLock: sysLock.checked,
      actionOpens: actionOpens.value, autoSyncMinutes: Number(autoSync.value),
    } });
    toast(t('Einstellungen gespeichert'));
  };
  for (const c of [autoLock, clip, sysLock, actionOpens, autoSync]) c.addEventListener('change', () => save().catch((e) => toast(e.message)));

  view.replaceChildren(
    el('h2', {}, t('Einstellungen')),
    el('h3', {}, t('Darstellung')),
    languagePicker(s.language ?? 'auto', (language) => changeLanguage(language).catch((e) => toast(e.message))),
    el('label', {}, t('Klick auf das OmniVault-Symbol öffnet'), actionOpens),
    el('p', { className: 'hint' }, sidebarSupported
      ? t('Die Seitenleiste bleibt neben der Webseite offen; das Seitenleisten-Symbol im Kopf öffnet sie jederzeit.')
      : t('Dieser Browser bietet keine Seitenleiste für Erweiterungen.')),
    el('h3', {}, t('Sicherheit')),
    el('label', {}, t('Automatisch sperren nach Inaktivität'), autoLock),
    el('label', { className: 'inline-check' }, sysLock, t('Sperren, wenn der Bildschirm gesperrt wird')),
    el('label', {}, t('Kopierte Werte aus der Zwischenablage entfernen nach'), clip),
    pinSection(),
    el('h3', {}, t('Auf Webseiten')),
    webCheck('inlineMenu', s.inlineMenu, t('OmniVault-Knopf in Anmeldefeldern (passende Logins auswählen)')),
    webCheck('offerSave', s.offerSave, t('Nach dem Anmelden anbieten, neue Logins zu speichern und geänderte Passwörter zu übernehmen')),
    webCheck('passkeys', s.passkeys, t('Passkeys mit OmniVault anlegen und damit anmelden')),
    el('p', { className: 'hint' }, t('Alle drei brauchen Zugriff auf Webseiten; der Browser fragt beim Einschalten. Ausgefüllt wird nur, was zur Seite gehört, und nur auf Klick.')),
    el('p', { className: 'hint' }, passkeyHint()),
    s.passkeys ? passkeyStatus() : null,
    el('h3', {}, t('Synchronisieren')),
    el('label', {}, t('Entsperrte Konten automatisch abgleichen'), autoSync),
    el('p', { className: 'hint' }, t('Spiegel-Regeln zwischen Konten laufen bei jedem Abgleich mit (Werkzeuge → Spiegeln).')),
    el('h3', {}, t('Tastenkürzel')),
    el('p', { className: 'hint' }, tx('OmniVault öffnen: {key}', { key: el('span', { className: 'kbd' }, shortcut('_execute_action')) })),
    el('p', { className: 'hint' }, tx('Passenden Login ausfüllen: {key}', { key: el('span', { className: 'kbd' }, shortcut('autofill')) })),
    el('p', { className: 'hint' }, t('Ändern unter chrome://extensions/shortcuts bzw. in Firefox unter Add-ons → Zahnrad → Tastenkombinationen. Rechtsklick in ein Eingabefeld bietet „Mit OmniVault ausfüllen“ und „Sicheres Passwort einfügen“.')),
    el('h3', {}, t('Konten')),
    accountsSection(),
    el('p', {}, el('button', { type: 'button', id: 'settings-add-account', className: 'secondary', onclick: () => openAccountForm({ mode: 'add' }) }, t('Konto hinzufügen …'))),
    el('h3', {}, t('Info')),
    el('p', {}, el('button', { type: 'button', id: 'settings-about', className: 'secondary', onclick: () => {
      $('#about-version').textContent = t('Version {version}', { version: ext.runtime.getManifest().version });
      show('about');
    } }, t('Über OmniVault, Lizenzen und Marken'))),
    el('div', { className: 'row actions' }, el('button', { type: 'button', className: 'secondary', onclick: () => back() }, t('Zurück'))));
  show('settings', { restore: openSettings });
}

/** Every connected account: name, provider, state; unlock or lock, edit, remove. */
function accountsSection() {
  const list = el('ul', { className: 'account-list', 'aria-label': t('Konten') });
  const draw = () => {
    if (!S.state.accounts.length) { list.replaceChildren(el('li', { className: 'hint' }, t('Noch kein Konto verbunden.'))); return; }
    list.replaceChildren(...S.state.accounts.map((a) => {
      const p = providerOf(a.provider);
      const where = [p?.label, a.server && !/^bitwarden\.(com|eu)$/.test(a.server) ? a.server.replace(/^https?:\/\//, '') : a.server, a.email].filter(Boolean).join(' · ');
      const after = async (fn) => { try { await fn(); } catch (e) { toast(e.message); } await refresh(); draw(); };
      return el('li', { className: `account-row${a.unlocked ? '' : ' locked'}`, vars: { '--acc-h': a.hue }, 'data-account': a.id },
        badge(a.short, a.hue),
        el('div', { className: 'who' },
          el('strong', { translate: 'no' }, a.label),
          el('span', { className: 'sub', translate: 'no', title: where }, where),
          el('span', { className: `sub state${a.error ? ' error' : ''}` }, accountStatus(a))),
        el('div', { className: 'tools' },
          a.unlocked
            ? iconButton('lock', t('{account} sperren', { account: a.label }), { onclick: () => after(() => call('lock', { id: a.id })) })
            : iconButton('unlock', t('{account} entsperren', { account: a.label }), { onclick: () => openUnlock(a) }),
          iconButton('edit', t('{name} bearbeiten', { name: a.label }), { onclick: () => openAccountForm({ mode: 'edit', account: a }) }),
          iconButton('trash', t('{account} entfernen …', { account: a.label }), { className: 'icon danger-text', onclick: async () => {
            if (!await ask(t('Konto „{account}“ aus OmniVault entfernen? Die Daten beim Anbieter bleiben unberührt.', { account: a.label }), { ok: t('Entfernen'), danger: true })) return;
            after(() => call('removeAccount', { id: a.id }));
          } })));
    }));
  };
  draw();
  return list;
}

/** Unlock with a PIN: set, change or remove it. */
function pinSection() {
  const box = el('div', { className: 'pin-setting' });
  const draw = () => {
    const on = S.state.pin?.configured;
    box.replaceChildren(
      el('p', { className: 'hint' }, on
        ? t('Entsperren mit PIN ist eingerichtet. Nach dem automatischen Sperren genügt die PIN; nach einem Neustart des Browsers ist das Master-Passwort nötig.')
        : t('Mit einer PIN lassen sich die Konten nach dem automatischen Sperren schneller wieder öffnen. Nach einem Neustart des Browsers ist das Master-Passwort nötig.')),
      el('p', { className: 'row', style: { justifyContent: 'flex-start', marginTop: '0' } },
        el('button', { type: 'button', className: 'secondary', onclick: async () => {
          const rule = { min: PIN_MIN, max: PIN_MAX };
          const pin = await promptText(t('Neue PIN ({min} bis {max} Ziffern):', rule), {
            ok: t('Weiter'), type: 'password', inputmode: 'numeric',
            validate: (v) => (validPin(v) ? null : t('Die PIN muss aus {min} bis {max} Ziffern bestehen', rule)),
          });
          if (!pin) return;
          const again = await promptText(t('PIN wiederholen:'), {
            ok: t('PIN festlegen'), type: 'password', inputmode: 'numeric',
            validate: (v) => (v === pin ? null : t('Die PINs stimmen nicht überein')),
          });
          if (!again) return;
          try { await call('setPin', { pin }); } catch (e) { return toast(e.message); }
          await refresh();
          toast(t('PIN festgelegt'));
          draw();
        } }, on ? t('PIN ändern …') : t('PIN festlegen …')),
        on ? el('button', { type: 'button', className: 'secondary danger-text', onclick: async () => {
          await call('removePin');
          await refresh();
          toast(t('PIN entfernt'));
          draw();
        } }, t('PIN entfernen')) : null));
  };
  draw();
  return box;
}

/** A setting that needs access to websites: asks for the permission when it is switched on. */
/** Where passkeys can be kept: accounts whose service stores them (Bitwarden/Vaultwarden). */
function passkeyHint() {
  const able = S.state.accounts.filter((a) => S.state.providers.find((p) => p.id === a.provider)?.capabilities?.passkeys);
  return able.length
    ? t('Passkeys werden in {accounts} gespeichert, im selben Format wie in den Bitwarden-Apps. Findet OmniVault keinen passenden Passkey, übernimmt der Browser.', { accounts: able.map((a) => a.label).join(', ') })
    : t('Passkeys speichern kann OmniVault nur in Bitwarden- und Vaultwarden-Konten. Ohne ein solches Konto übernimmt der Browser.');
}

/** Whether passkeys work on the open tab: the bridge answers, and it has heard from the page script. */
function passkeyStatus() {
  const out = el('p', { className: 'hint', id: 'passkey-status' });
  if (!S.tab) return null;
  const host = new URL(S.tab.url).host;
  ext.tabs.sendMessage(S.tab.id, { type: 'ov-passkey-ping' }, { frameId: 0 }).catch(() => null).then((r) => {
    out.textContent = r?.page ? t('Passkeys sind auf {host} aktiv.', { host })
      : r?.bridge ? t('Auf {host} läuft nur ein Teil der Passkey-Unterstützung (das Seitenskript fehlt). Bitte die Seite neu laden; hilft das nicht, liegt es am Browser.', { host })
        : t('Auf {host} ist die Passkey-Unterstützung noch nicht aktiv. Bitte die Seite neu laden.', { host });
  });
  return out;
}

function webCheck(name, value, text) {
  const box = el('input', { type: 'checkbox', name, checked: value });
  box.addEventListener('change', async () => {
    if (box.checked) {
      // permissions.request must be the first await in the user gesture (Firefox)
      const granted = await requestPermissions({ origins: ['https://*/*', 'http://*/*'] }, { view: 'settings', setting: name }).catch(() => false);
      if (!granted) { box.checked = false; return toast(t('Ohne Zugriff auf Webseiten geht das nicht')); }
    }
    S.state.settings = await call('setSettings', { patch: { [name]: box.checked } });
    if (box.checked) await reloadNotice(); else toast(t('Einstellungen gespeichert'));
  });
  return el('label', { className: 'inline-check' }, box, text);
}

/**
 * After switching on a feature for web pages: pages that are already open only get it after a reload (the browser
 * adds OmniVault's scripts when a page loads). Offers to reload the open tab right away.
 */
async function reloadNotice() {
  const text = t('Eingeschaltet. Schon geöffnete Webseiten bekommen das erst, wenn du sie neu lädst.');
  if (!S.tab) { await ask(text, { ok: t('OK'), cancel: false }); return; }
  if (await ask(`${text}\n\n${t('{host} jetzt neu laden?', { host: new URL(S.tab.url).host })}`, { ok: t('Neu laden'), cancel: t('Später') })) {
    await ext.tabs.reload(S.tab.id).catch(() => {});
    toast(t('Seite wird neu geladen'));
  }
}

/** A setting switched on while the permission prompt closed the popup: finish it when access was granted. */
export async function resumeSetting(r) {
  if (r.granted) S.state.settings = await call('setSettings', { patch: { [r.setting]: true } });
  await openSettings();
  if (r.granted) await reloadNotice();
}

/** Saves the language and reloads the interface in it (static texts are translated once, on load). */
async function changeLanguage(language) {
  S.state.settings = await call('setSettings', { patch: { language } });
  history.replaceState(null, '', '#settings'); // no new history entry the browser could go back to
  location.reload();
}
