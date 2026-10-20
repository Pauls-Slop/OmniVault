// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Create / edit items: logins, notes, cards and identities (where the provider stores them) and custom fields.
// For other types (SSH keys) the editor changes name, folder, favorite and notes and leaves the rest untouched.
import { mark } from '../i18n/index.js';
import { generatePassword } from '../lib/generator.js';
import { sampleIdentity } from '../lib/sample-identity.js';
import { openItem } from './detail.js';
import { openGenerator } from './generator.js';
import { S, accountOf, folderPicker, providerOf, refresh, writableAccounts } from './state.js';
import { $, TYPE_LABEL, back, badge, call, el, icon, iconButton, show, t, toast, uiLanguage } from './ui.js';

export async function openEditor({ accountId, item = null, preset = {} } = {}) {
  const editing = !!item;
  const accounts = writableAccounts();
  if (!editing && !accounts.length) return toast(t('Kein entsperrtes Konto, in dem Einträge angelegt werden können'));
  let acc = accountOf(accountId) ?? accounts[0];
  const origAcc = acc;
  const view = $('#view-edit');
  const typesFor = (a) => providerOf(a.provider)?.capabilities?.types ?? ['login'];
  // Existing logins/notes can be moved or copied to another account right from the editor.
  const transferable = editing && ['login', 'note'].includes(item.type);
  const targets = transferable ? accounts.filter((a) => a.id === origAcc.id || typesFor(a).includes(item.type)) : [acc];

  const form = el('form', { id: 'form-item', novalidate: true });
  const accountSel = el('select', { name: 'account', disabled: editing && targets.length < 2 },
    (editing ? targets : accounts).map((a) => el('option', { value: a.id }, a.label)));
  accountSel.value = acc.id;
  const keepOriginal = el('input', { type: 'checkbox', name: 'keepOriginal' });
  const transferBox = el('div', { className: 'transfer-note', hidden: true },
    el('label', { className: 'inline-check' }, keepOriginal, t('Original behalten (kopieren statt verschieben)')),
    el('p', { className: 'hint' }, t('Beim Speichern wird der Eintrag in das gewählte Konto übertragen. Zusatzfelder, Anhänge und Passwortverlauf werden nicht mitgenommen.')));
  if (editing && item.canDelete === false) { keepOriginal.checked = true; keepOriginal.disabled = true; }
  const caps = () => providerOf(acc.provider)?.capabilities ?? {};
  const typeSel = el('select', { name: 'type', disabled: editing });
  const fillTypes = () => {
    const types = editing ? [item.type] : typesFor(acc);
    typeSel.replaceChildren(...types.map((type) => el('option', { value: type }, TYPE_LABEL[type] ?? type)));
    typeSel.value = editing ? item.type : (preset.type && types.includes(preset.type) ? preset.type : types[0]);
  };
  fillTypes();

  const v = (k, d = '') => (editing ? item[k] ?? d : preset[k] ?? d);
  const name = el('input', { name: 'name', required: true, value: v('name'), autocomplete: 'off' });
  const username = el('input', { name: 'username', value: v('username'), autocomplete: 'off', spellcheck: 'false' });
  const password = el('input', { name: 'password', type: 'password', value: v('password'), autocomplete: 'new-password', spellcheck: 'false' });
  const totpIn = el('input', { name: 'totp', value: v('totp'), autocomplete: 'off', spellcheck: 'false', placeholder: t('otpauth://… oder Geheimnis') });
  const notes = el('textarea', { name: 'notes', rows: 4, value: v('notes'), spellcheck: 'true', style: { fontFamily: 'inherit', fontSize: '13px' } });
  const favorite = el('input', { type: 'checkbox', name: 'favorite', checked: !!v('favorite', false) });
  const picker = folderPicker();
  const folderSel = picker.select;
  const uriBox = el('div', { className: 'uris' });
  const addUri = (value = '') => {
    const input = el('input', { value, placeholder: 'https://…', spellcheck: 'false', 'data-uri': '' });
    const row = el('div', { className: 'uri-row' }, input,
      iconButton('x', t('Entfernen'), { 'aria-label': t('Website entfernen'), onclick: () => row.remove() }));
    uriBox.append(row);
    return input;
  };
  for (const u of v('uris', [])) addUri(u);
  if (!uriBox.children.length) addUri(preset.uri ?? '');

  const loadFolders = async () => {
    const sameAcc = acc.id === origAcc.id;
    const { required } = await picker.load(acc.id, editing && sameAcc ? item.folderId ?? '' : undefined);
    folderSel.disabled = editing && required && !transferable;
  };

  // cards and identities: one input per field, named like the provider fields
  const group = (key, defs) => {
    const src = v(key, {}) ?? {};
    const inputs = Object.fromEntries(defs.map(([n, , attrs = {}]) => [n, el('input', { name: `${key}.${n}`, value: src[n] ?? '', autocomplete: 'off', spellcheck: 'false', ...attrs })]));
    const box = el('div', { className: 'group-fields' }, defs.map(([n, lbl, , wide]) => el('label', { className: wide ? 'wide' : '' }, t(lbl), inputs[n])));
    return { box, read: () => Object.fromEntries(Object.entries(inputs).map(([n, i]) => [n, i.value.trim()])) };
  };
  const card = group('card', [
    ['cardholderName', mark('Karteninhaber'), {}, true], ['number', mark('Kartennummer'), { inputmode: 'numeric', type: 'password' }, true],
    ['brand', mark('Marke')], ['code', mark('Prüfnummer'), { inputmode: 'numeric', type: 'password' }],
    ['expMonth', mark('Ablaufmonat'), { inputmode: 'numeric', placeholder: t('MM') }], ['expYear', mark('Ablaufjahr'), { inputmode: 'numeric', placeholder: t('JJJJ') }],
  ]);
  const identity = group('identity', [
    ['title', mark('Anrede')], ['firstName', mark('Vorname')], ['middleName', mark('Zweiter Vorname')], ['lastName', mark('Nachname')],
    ['company', mark('Firma')], ['username', mark('Benutzername')], ['email', mark('E-Mail'), { type: 'email' }, true], ['phone', mark('Telefon'), { type: 'tel' }, true],
    ['address1', mark('Straße und Hausnummer'), {}, true], ['address2', mark('Adresszusatz'), {}, true], ['postalCode', mark('PLZ')], ['city', mark('Ort')],
    ['state', mark('Bundesland')], ['country', mark('Land')],
    ['ssn', mark('Sozialversicherungsnummer'), {}, true], ['passportNumber', mark('Reisepassnummer')], ['licenseNumber', mark('Führerscheinnummer')],
  ]);

  // invented data for sign-ups that do not need the real one (see lib/sample-identity.js)
  const sampleBtn = el('button', { type: 'button', className: 'secondary sample-identity', onclick: () => {
    const sample = sampleIdentity(uiLanguage());
    for (const [k, value] of Object.entries(sample.identity)) {
      const input = identity.box.querySelector(`[name="identity.${k}"]`);
      if (input) input.value = value;
    }
    const prefix = t('Muster-Identität – {name}', { name: '' });
    if (!name.value.trim() || name.value.startsWith(prefix)) name.value = t('Muster-Identität – {name}', { name: sample.name });
  } }, t('Muster-Identität einsetzen'));
  identity.box.prepend(el('p', { className: 'wide sample-row' }, sampleBtn,
    el('span', { className: 'hint' }, t('Erfundene Daten mit E-Mail-Adresse unter example.com, z. B. für Anmeldungen, die keine echten Angaben brauchen.'))));

  // custom fields: name, value, kind (text, hidden, yes/no)
  const fieldBox = el('div', { className: 'custom-fields' });
  const addField = (f = { name: '', value: '', type: 'text' }) => {
    const nameIn = el('input', { value: f.name ?? '', placeholder: t('Name'), 'aria-label': t('Feldname'), 'data-field-name': '' });
    const valueIn = el('input', { value: f.type === 'boolean' ? '' : f.value ?? '', placeholder: t('Wert'), 'aria-label': t('Feldwert'), spellcheck: 'false', type: f.type === 'hidden' ? 'password' : 'text' });
    const check = el('input', { type: 'checkbox', checked: f.type === 'boolean' && (f.value === true || f.value === 'true'), 'aria-label': t('Ja') });
    const kind = el('select', { 'aria-label': t('Feldart') }, el('option', { value: 'text' }, t('Text')), el('option', { value: 'hidden' }, t('Verborgen')), el('option', { value: 'boolean' }, t('Ja/Nein')));
    kind.value = ['text', 'hidden', 'boolean'].includes(f.type) ? f.type : 'text';
    const valueCell = el('div', { className: 'field-value' }, valueIn, el('label', { className: 'inline-check' }, check, t('Ja')));
    const sync = () => { valueIn.hidden = kind.value === 'boolean'; check.closest('label').hidden = kind.value !== 'boolean'; valueIn.type = kind.value === 'hidden' ? 'password' : 'text'; };
    kind.addEventListener('change', sync);
    const row = el('div', { className: 'field-row' }, nameIn, valueCell, kind,
      iconButton('x', t('Entfernen'), { 'aria-label': t('Feld entfernen'), onclick: () => row.remove() }));
    row.read = () => ({ name: nameIn.value.trim(), type: kind.value, value: kind.value === 'boolean' ? String(check.checked) : valueIn.value });
    sync();
    fieldBox.append(row);
    return nameIn;
  };
  for (const f of v('fields', []) ?? []) if (f.type !== 'linked') addField(f);
  const fieldsSection = el('div', { className: 'fields-edit' }, el('span', { className: 'hint' }, t('Zusatzfelder')), fieldBox,
    el('button', { type: 'button', className: 'link', onclick: () => addField().focus() }, t('+ Feld')));

  const loginOnly = el('div', {},
    el('label', {}, t('Benutzername'), username),
    el('label', {}, t('Passwort'), el('div', { className: 'pw-row' }, password,
      iconButton('eye', t('Anzeigen'), { 'aria-label': t('Passwort anzeigen'), onclick: (e) => {
        password.type = password.type === 'password' ? 'text' : 'password';
        e.currentTarget.replaceChildren(icon(password.type === 'password' ? 'eye' : 'eyeOff'));
      } }),
      iconButton('dice', t('Generieren'), { 'aria-label': t('Passwort generieren'), onclick: async () => {
        password.value = generatePassword(S.state.settings?.generator); // stays hidden; the eye shows it
        call('rememberGenerated', { value: password.value }).catch(() => {});
      }, oncontextmenu: (e) => { e.preventDefault(); openGenerator({ onUse: (pw) => { password.value = pw; back(); } }); } }))),
    el('p', { className: 'hint', style: { marginTop: '-6px' } }, t('Der Würfel erzeugt ein Passwort nach deinen Generator-Einstellungen; Rechtsklick öffnet den Generator.')),
    el('label', {}, t('Einmalcode (TOTP)'), totpIn),
    el('div', {}, el('span', { className: 'hint' }, t('Websites')), uriBox,
      el('button', { type: 'button', className: 'link', onclick: () => addUri().focus() }, t('+ Website'))));

  const save = el('button', { type: 'submit' }, t('Speichern'));
  const folderLabel = picker.label;
  const otherHint = el('p', { className: 'hint' }, t('Bei diesem Typ werden Name, Ordner, Favorit und Notizen bearbeitet; die übrigen Felder bleiben unverändert.'));
  // some providers keep only part of a login (KeePassXC: no name, notes or TOTP secret through its interface)
  const nameLabel = el('label', {}, t('Name'), name);
  const nameHint = el('p', { className: 'hint', 'data-hint': 'name-from-site' }, t('Den Namen vergibt der Anbieter selbst (nach der Website).'));
  const notesLabel = el('label', {}, t('Notizen'), notes);
  const editable = (type) => ['login', 'note'].includes(type) || typesFor(acc).includes(type);
  const updateType = () => {
    const type = typeSel.value;
    loginOnly.hidden = type !== 'login';
    card.box.hidden = type !== 'card' || !editable(type);
    identity.box.hidden = type !== 'identity' || !editable(type);
    fieldsSection.hidden = !caps().fields;
    totpIn.closest('label').hidden = caps().totp === false || (editing && caps().editTotp === false);
    nameLabel.hidden = caps().name === false;
    nameHint.hidden = caps().name !== false;
    name.required = caps().name !== false;
    notesLabel.hidden = caps().notes === false;
    otherHint.hidden = !editing || editable(type);
  };
  typeSel.addEventListener('change', updateType);
  const isTransfer = () => editing && (acc.id !== origAcc.id
    || (caps().moveFolder === false && (folderSel.value || null) !== (item.folderId ?? null)));
  const updateTransfer = () => {
    transferBox.hidden = !isTransfer();
    save.textContent = isTransfer() ? (keepOriginal.checked ? t('Speichern und kopieren') : t('Speichern und verschieben')) : t('Speichern');
  };
  accountSel.addEventListener('change', async () => {
    acc = accountOf(accountSel.value);
    if (!editing) fillTypes();
    updateType();
    await loadFolders();
    updateTransfer();
  });
  folderSel.addEventListener('change', updateTransfer);
  keepOriginal.addEventListener('change', updateTransfer);

  const err = el('p', { className: 'error', hidden: true });
  form.append(
    el('div', { className: 'two', style: { gridTemplateColumns: '1fr 1fr' } },
      el('label', {}, t('Konto'), accountSel), el('label', {}, t('Typ'), typeSel)),
    nameLabel, nameHint,
    loginOnly, card.box, identity.box, otherHint,
    folderLabel,
    transferBox,
    notesLabel,
    fieldsSection,
    item?.passkeys?.length ? el('p', { className: 'hint', 'data-hint': 'passkey' }, t('Der Passkey für {site} bleibt beim Speichern erhalten.', { site: item.passkeys[0].rpId })) : null,
    el('label', { className: 'inline-check', title: caps().favorites === false ? t('Wird nur in OmniVault gespeichert') : null }, favorite, t('Favorit')),
    err,
    el('div', { className: 'row actions' },
      el('button', { type: 'button', className: 'secondary', onclick: () => back() }, t('Abbrechen')), save));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    if (caps().name !== false && !name.value.trim()) { err.textContent = t('Bitte einen Namen angeben.'); err.hidden = false; name.focus(); return; }
    const type = typeSel.value;
    if (type === 'login' && caps().needsUrl && ![...uriBox.querySelectorAll('[data-uri]')].some((x) => x.value.trim())) {
      err.textContent = t('Dieser Anbieter braucht für einen Login eine Website-Adresse.'); err.hidden = false;
      uriBox.querySelector('[data-uri]')?.focus(); return;
    }
    const data = {
      type, name: name.value.trim(), notes: notes.value, favorite: favorite.checked,
      folderId: folderSel.value || null,
      ...(type === 'login' ? {
        username: username.value, password: password.value, totp: totpIn.value.trim(),
        uris: [...uriBox.querySelectorAll('[data-uri]')].map((x) => x.value.trim()).filter(Boolean),
      } : {}),
      ...(type === 'card' && editable(type) ? { card: card.read() } : {}),
      ...(type === 'identity' && editable(type) ? { identity: identity.read() } : {}),
      ...(caps().fields ? { fields: [...fieldBox.children].map((r) => r.read()).filter((f) => f.name || (f.type !== 'boolean' && f.value)) } : {}),
    };
    const transfer = isTransfer();
    const label = save.textContent;
    save.disabled = true;
    save.textContent = t('Speichere …');
    try {
      if (transfer) {
        // 1. keep the edits in the original, 2. transfer it (the original is deleted only after the copy exists)
        await call('saveItem', { accountId: origAcc.id, itemId: item.id, data: { ...data, folderId: item.folderId ?? null } });
        const [r] = await call('transfer', {
          items: [{ accountId: origAcc.id, itemId: item.id }], targetAccountId: acc.id,
          targetFolderId: data.folderId, mode: keepOriginal.checked ? 'copy' : 'move',
        });
        if (!r.ok) throw new Error(t('Gespeichert, aber nicht übertragen: {error}', { error: r.error }));
        toast(keepOriginal.checked ? t('Kopiert nach {account}', { account: acc.label }) : t('Verschoben nach {account}', { account: acc.label }));
        await refresh();
        back({ discard: true, render: false }); // the editor is done: not a forward() target
        await openItem(acc.id, r.newId);
        return;
      }
      const saved = await call('saveItem', { accountId: acc.id, itemId: editing ? item.id : null, data });
      toast(editing ? t('Gespeichert') : t('Angelegt'));
      await refresh();
      back({ discard: true, render: false }); // the editor is done: not a forward() target
      if (saved) await openItem(acc.id, saved.id); else show('main');
    } catch (x) {
      err.textContent = x.message;
      err.hidden = false;
    } finally {
      save.disabled = false;
      save.textContent = label;
    }
  });

  view.replaceChildren(
    el('div', { className: 'detail-head' }, el('h2', {}, editing ? t('{name} bearbeiten', { name: item.name }) : t('Neuer Eintrag')), badge(acc.short, acc.hue, acc.label)),
    form);
  updateType();
  await loadFolders();
  show('edit', { restore: () => openEditor({ accountId, item, preset }), keep: true });
  name.focus();
}
