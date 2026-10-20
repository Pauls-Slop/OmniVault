// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Item detail view: every field of every item type, copy/reveal, live TOTP.
import { ext } from '../lib/browser.js';
import { totp } from '../lib/totp.js';
import { AZURE_BLOB_ORIGINS, endpoints } from '../providers/bitwarden/api.js';
import { requestPermissions } from './resume.js';
import { openEditor } from './editor.js';
import { fillItem, hostOf } from './list.js';
import { openMenu } from './menu.js';
import { S, accountOf, providerOf, refresh, writableAccounts } from './state.js';
import { openMoveToOrganization } from './organization.js';
import { openShare } from './share.js';
import { transferWithDialog } from './tools.js';
import { formatDateTime, mark } from '../i18n/index.js';
import { $, TYPE_LABEL, ask, back, badge, call, copy, el, icon, iconButton, onLeave, show, t, toast, typeIcon } from './ui.js';

let totpTimer = null;
onLeave('item', () => { clearInterval(totpTimer); totpTimer = null; });

const MASK = '••••••••';

/**
 * One labelled value with tools. `key` is the German label (translated here, and kept as data-field for tests);
 * `own: true` marks a name the user gave (custom fields), which is shown as it is.
 */
function field(key, value, { secret = false, plain = false, link = null, copyLabel, own = false } = {}) {
  if (value == null || value === '') return null;
  const label = own ? key : t(key);
  copyLabel = copyLabel ? t(copyLabel) : label;
  const v = el('div', { className: `v${plain ? ' plain' : ''}` }, secret ? MASK : String(value));
  let shown = !secret;
  const tools = el('div', { className: 'tools' },
    secret ? iconButton('eye', t('Anzeigen'), {
      'aria-label': t('{label} anzeigen', { label }), 'aria-pressed': 'false',
      onclick: (e) => {
        shown = !shown;
        v.textContent = shown ? String(value) : MASK;
        e.currentTarget.setAttribute('aria-pressed', String(shown));
        e.currentTarget.replaceChildren(icon(shown ? 'eyeOff' : 'eye'));
      },
    }) : null,
    link ? iconButton('external', t('Öffnen'), { 'aria-label': t('{label} öffnen', { label }), onclick: () => window.open(link, '_blank', 'noopener') }) : null,
    iconButton('copy', t('Kopieren'), { 'aria-label': t('{label} kopieren', { label }), onclick: () => copy(String(value), copyLabel) }));
  return el('div', { className: 'field', 'data-field': key }, el('span', { className: 'k' }, label), v, tools);
}

/**
 * Live TOTP code. `source` is the otpauth URI, or a function that fetches the current code (providers that hand
 * out codes but not the secret, e.g. KeePassXC): then it is fetched once per period and counted down here.
 */
function totpField(source) {
  const code = el('span', {}, '······');
  const ring = el('span', { className: 'totp-ring' });
  let fetched = null;
  const current = async () => {
    if (typeof source !== 'function') return totp(source);
    const now = Date.now();
    if (!fetched || now >= fetched.until) {
      const otp = await source();
      if (!otp) throw new Error('no code');
      fetched = { code: otp.code, until: now + otp.remaining * 1000 };
    }
    return { code: fetched.code, remaining: Math.max(1, Math.ceil((fetched.until - now) / 1000)) };
  };
  const row = el('div', { className: 'field', 'data-field': 'TOTP' },
    el('span', { className: 'k' }, t('Einmalcode (TOTP)')),
    el('div', { className: 'v' }, code, ring),
    el('div', { className: 'tools' }, iconButton('copy', t('Kopieren'), {
      'aria-label': t('TOTP kopieren'), onclick: async () => copy((await current()).code, 'TOTP'),
    })));
  const tick = async () => {
    try {
      const otp = await current();
      code.textContent = `${otp.code.slice(0, Math.ceil(otp.code.length / 2))} ${otp.code.slice(Math.ceil(otp.code.length / 2))}`;
      ring.textContent = t('{n} s', { n: otp.remaining });
    } catch { code.textContent = t('ungültig'); }
  };
  tick();
  clearInterval(totpTimer);
  totpTimer = setInterval(tick, 1000);
  return row;
}

function typeFields(i) {
  const out = [];
  if (i.type === 'login') {
    out.push(field(mark('Benutzername'), i.username, { copyLabel: mark('Benutzer') }));
    out.push(field(mark('Passwort'), i.password, { secret: true }));
    if (i.totp) out.push(totpField(i.totp));
    else if (i.hasTotp) out.push(totpField(() => call('secret', { accountId: i.accountId, itemId: i.id, field: 'totp' })));
    (i.uris ?? []).forEach((u, n) => out.push(field(n ? t('Website {n}', { n: n + 1 }) : mark('Website'), u, { own: !!n, link: /^https?:/.test(u) ? u : null, plain: true })));
  }
  if (i.type === 'card' && i.card) {
    const c = i.card;
    out.push(field(mark('Karteninhaber'), c.cardholderName, { plain: true }));
    out.push(field(mark('Marke'), c.brand, { plain: true }));
    out.push(field(mark('Kartennummer'), c.number, { secret: true }));
    if (c.expMonth || c.expYear) out.push(field(mark('Gültig bis'), `${String(c.expMonth ?? '').padStart(2, '0')}/${c.expYear ?? ''}`));
    out.push(field(mark('Prüfnummer'), c.code, { secret: true }));
  }
  if (i.type === 'identity' && i.identity) {
    const d = i.identity;
    const name = [d.title, d.firstName, d.middleName, d.lastName].filter(Boolean).join(' ');
    const address = [d.address1, d.address2, d.address3, [d.postalCode, d.city].filter(Boolean).join(' '), d.state, d.country].filter(Boolean).join('\n');
    out.push(field(mark('Name'), name, { plain: true }));
    out.push(field(mark('Benutzername'), d.username));
    out.push(field(mark('Firma'), d.company, { plain: true }));
    out.push(field(mark('E-Mail'), d.email));
    out.push(field(mark('Telefon'), d.phone));
    out.push(field(mark('Adresse'), address, { plain: true }));
    out.push(field(mark('Sozialversicherungsnummer'), d.ssn, { secret: true }));
    out.push(field(mark('Reisepassnummer'), d.passportNumber, { secret: true }));
    out.push(field(mark('Führerscheinnummer'), d.licenseNumber, { secret: true }));
  }
  if (i.type === 'ssh' && i.ssh) {
    out.push(field(mark('Öffentlicher Schlüssel'), i.ssh.publicKey));
    out.push(field(mark('Fingerabdruck'), i.ssh.fingerprint));
    out.push(field(mark('Privater Schlüssel'), i.ssh.privateKey, { secret: true }));
  }
  for (const f of i.fields ?? []) {
    const name = f.name || t('Feld');
    if (f.type === 'boolean') out.push(field(name, f.value === 'true' || f.value === true ? t('Ja') : t('Nein'), { plain: true, own: true }));
    else if (f.type === 'linked') out.push(field(name, t('verknüpft mit {field}', { field: f.linkedLabel ?? t('Feld') }), { plain: true, own: true }));
    else out.push(field(name, f.value, { secret: f.type === 'hidden', own: true }));
  }
  out.push(field(mark('Beschreibung'), i.description, { plain: true }));
  out.push(field(mark('Notizen'), i.notes, { plain: true }));
  return out.filter(Boolean);
}

/**
 * A passkey: for whom and which site, since when. Accounts that store passkeys (Bitwarden) can remove it here;
 * passkeys of other services (Proton Pass) are only shown – OmniVault cannot use their keys.
 */
function passkeyField(i, p, removable) {
  const who = p.userName || p.userDisplayName || t('(ohne Benutzername)');
  const lines = [p.rpId ? t('{user} auf {site}', { user: who, site: p.rpId }) : who];
  if (p.creationDate) lines.push(t('Angelegt: {date}', { date: formatDateTime(p.creationDate) }));
  if (!providerOf(i.provider)?.capabilities?.passkeys) lines.push(t('Nur in {provider} nutzbar', { provider: providerOf(i.provider)?.label ?? i.provider }));
  return el('div', { className: 'field', 'data-field': 'Passkey' },
    el('span', { className: 'k' }, t('Passkey')),
    el('div', { className: 'v plain' }, lines.join('\n')),
    el('div', { className: 'tools' }, removable ? iconButton('trash', t('Passkey entfernen'), {
      'aria-label': t('Passkey entfernen'),
      onclick: async () => {
        if (!await ask(t('Passkey für {site} entfernen? Anmelden damit geht dann nicht mehr; Benutzername und Passwort bleiben.', { site: p.rpId }), { ok: t('Entfernen'), danger: true })) return;
        try {
          await call('removePasskey', { accountId: i.accountId, itemId: i.id, credentialId: p.credentialId });
          toast(t('Passkey entfernt'));
          await refresh();
          openItem(i.accountId, i.id);
        } catch (e) { toast(e.message); }
      },
    }) : null));
}

export async function openItem(accountId, itemId) {
  const i = await call('item', { accountId, itemId });
  const listItem = S.items.find((x) => x.id === itemId && x.accountId === accountId);
  const canWrite = providerOf(i.provider)?.capabilities?.write && i.canEdit !== false;
  const canDelete = canWrite && i.canDelete !== false;
  const view = $('#view-item');

  const caps = providerOf(i.provider)?.capabilities ?? {};
  // Bitwarden: a personal item can go into an organization the user may add items to
  const toOrganization = caps.organizations && canDelete && !i.organizationId && !!accountOf(accountId)?.canMoveToOrganization;
  // Providers without favorites of their own get them from OmniVault (stored locally, see background/favorites.js).
  const localFav = caps.favorites === false;
  const favTitle = i.favorite ? (localFav ? t('Kein Favorit mehr (nur in OmniVault)') : t('Kein Favorit mehr'))
    : (localFav ? t('Als Favorit markieren (nur in OmniVault)') : t('Als Favorit markieren'));
  const favBtn = canWrite || localFav ? iconButton(i.favorite ? 'starFilled' : 'star', favTitle, {
    className: `icon fav${i.favorite ? ' on' : ''}`, 'aria-pressed': String(!!i.favorite), 'aria-label': t('Favorit'),
    onclick: async () => {
      await call('setFavorite', { accountId, itemId, favorite: !i.favorite });
      await refresh();
      openItem(accountId, itemId);
    },
  }) : (i.favorite ? el('span', { className: 'fav on', title: t('Favorit') }, icon('starFilled')) : null);

  const history = (i.passwordHistory ?? []).length ? el('details', { className: 'history' },
    el('summary', {}, t('Passwortverlauf ({n})', { n: i.passwordHistory.length })),
    el('div', { className: 'fields' }, i.passwordHistory.map((h) =>
      field(h.lastUsedDate ? formatDateTime(h.lastUsedDate) : t('früher'), h.password, { secret: true, copyLabel: mark('Altes Passwort'), own: true })))) : null;

  // replaceChildren() is a native DOM call: unlike el(), it turns a null argument into a "null" text node,
  // so filter falsy entries (e.g. an absent password history or revision date) out first.
  view.replaceChildren(...[
    el('div', { className: 'detail-head', vars: { '--acc-h': i.accountHue } },
      el('span', { className: 'type-ico', title: TYPE_LABEL[i.type] ?? '' }, typeIcon(i.type, { size: 18 })),
      el('h2', {}, i.name || t('(ohne Namen)')),
      favBtn,
      badge(i.accountShort, i.accountHue, i.accountLabel)),
    el('div', { className: 'detail-sub' }, [TYPE_LABEL[i.type], i.folder, i.accountLabel, i.uris?.[0] ? hostOf(i.uris[0]) : null].filter(Boolean).join(' · ')),
    el('div', { className: 'fields' }, typeFields(i), (i.passkeys ?? []).map((p) => passkeyField(i, p, caps.passkeys && canWrite))),
    history,
    attachmentSection(i, accountId, itemId, canWrite && caps.attachmentUpload),
    i.revisionDate ? el('p', { className: 'hint' }, t('Zuletzt geändert: {date}', { date: formatDateTime(i.revisionDate) })) : null,
    el('div', { className: 'row actions' },
      el('button', { type: 'button', className: 'secondary', onclick: () => back() }, t('Zurück')),
      canDelete ? el('button', {
        type: 'button', className: 'secondary danger-text', onclick: async () => {
          const question = caps.trash ? t('„{name}“ löschen? Der Eintrag wandert in den Papierkorb.', { name: i.name })
            : t('„{name}“ löschen? Das Löschen ist endgültig.', { name: i.name });
          if (!await ask(question, { ok: t('Löschen'), danger: true })) return;
          await call('deleteItem', { accountId, itemId });
          toast(t('Gelöscht'));
          await refresh();
          show('main');
        },
      }, t('Löschen')) : null,
      (['login', 'note'].includes(i.type) && writableAccounts().length) || toOrganization ? iconButton('transfer', t('Kopieren, verschieben, teilen'), {
        'aria-haspopup': 'menu',
        onclick: (e) => openMenu(e.currentTarget, [
          ...(caps.share && canDelete ? [{ ico: 'user', text: t('Teilen …'), onSelect: async () => {
            if (await openShare({ ...i, accountId })) { toast(t('Freigaben gespeichert')); await refresh(); openItem(accountId, itemId); }
          } }] : []),
          ...(toOrganization ? [{ ico: 'user', text: t('In Organisation verschieben …'), onSelect: async () => {
            try {
              if (await openMoveToOrganization({ ...i, accountId })) { toast(t('In die Organisation verschoben')); await refresh(); openItem(accountId, itemId); }
            } catch (x) { toast(x.message); }
          } }] : []),
          ...(['login', 'note'].includes(i.type) && writableAccounts().length ? [
            { ico: 'copy', text: t('Kopieren nach …'), onSelect: () => transferWithDialog([{ accountId, itemId }], 'copy').catch((x) => toast(x.message)) },
            ...(canDelete && canWrite ? [{ ico: 'transfer', text: t('Verschieben nach …'), onSelect: () => transferWithDialog([{ accountId, itemId }], 'move').then((r) => { if (r?.[0]?.ok) show('main'); }).catch((x) => toast(x.message)) }] : []),
          ] : []),
        ]),
      }) : null,
      canWrite ? el('button', { type: 'button', className: 'secondary', onclick: () => openEditor({ accountId, item: i }) }, t('Bearbeiten')) : null,
      ['login', 'card', 'identity'].includes(i.type) && S.tab && listItem
        ? el('button', { type: 'button', onclick: () => fillItem(listItem).catch((e) => toast(e.message)) }, t('Ausfüllen')) : null),
  ].filter(Boolean));
  show('item', { restore: () => openItem(accountId, itemId) });
}

/** Largest file OmniVault uploads (it travels base64-encoded between popup and background). */
const MAX_UPLOAD_MB = 30;

/** Attachments of an item: download each; with write access also add and delete. */
function attachmentSection(i, accountId, itemId, writable) {
  const list = i.attachments ?? [];
  if (!list.length && !writable) return null;
  const reopen = async () => { await refresh(); await openItem(accountId, itemId); };
  return el('details', { className: 'history', open: true },
    el('summary', {}, t('Anhänge ({n})', { n: list.length })),
    el('div', { className: 'fields' }, list.map((a) => el('div', { className: 'field' },
      el('span', { className: 'k' }, a.size ? t('{n} KB', { n: Math.max(1, Math.round(a.size / 1024)) }) : t('Anhang')),
      el('div', { className: 'v plain' }, a.fileName),
      el('div', { className: 'tools' },
        iconButton('download', t('Herunterladen'), {
          'aria-label': t('{name} herunterladen', { name: a.fileName }),
          onclick: () => downloadAttachment(accountId, itemId, a.id).catch((e) => toast(e.message)),
        }),
        writable ? iconButton('trash', t('Löschen'), {
          'aria-label': t('{name} löschen', { name: a.fileName }),
          onclick: async () => {
            if (!await ask(t('Anhang „{name}“ endgültig löschen?', { name: a.fileName }), { ok: t('Löschen'), danger: true })) return;
            try {
              await call('deleteAttachment', { accountId, itemId, attachmentId: a.id });
              toast(t('Anhang gelöscht'));
              await reopen();
            } catch (e) { toast(e.message); }
          },
        }) : null)))),
    writable ? uploadButton(accountId, itemId, reopen) : null);
}

/**
 * „Add attachment“. Bitwarden's cloud keeps files in Azure Blob Storage, which needs its own host permission;
 * it is asked for on the first upload (the prompt may close the popup – it reopens on this item).
 */
function uploadButton(accountId, itemId, reopen) {
  const server = accountOf(accountId)?.server;
  const cloud = /\.bitwarden\.(com|eu)$/.test(new URL(endpoints(server).api).hostname);
  const file = el('input', {
    type: 'file', hidden: true,
    onchange: async () => {
      const f = file.files?.[0];
      file.value = '';
      if (!f) return;
      if (f.size > MAX_UPLOAD_MB * 1024 * 1024) { toast(t('Die Datei ist zu groß (höchstens {n} MB).', { n: MAX_UPLOAD_MB })); return; }
      toast(t('Lade {name} hoch …', { name: f.name }), 120_000);
      try {
        const data = await fileToBase64(f);
        await call('addAttachment', { accountId, itemId, fileName: f.name, data });
        toast(t('{name} hochgeladen', { name: f.name }));
        await reopen();
      } catch (e) { toast(e.message); }
    },
  });
  let granted = !cloud;
  const button = el('button', {
    type: 'button', className: 'secondary',
    onclick: () => {
      if (granted) { file.click(); return; }
      requestPermissions({ origins: AZURE_BLOB_ORIGINS }, { view: 'item', accountId, itemId }).then((ok) => {
        granted = ok;
        toast(ok ? t('Zugriff erteilt – jetzt die Datei wählen.') : t('Ohne Zugriff auf Bitwardens Dateispeicher lassen sich keine Anhänge hochladen.'));
      }).catch((e) => toast(e.message));
    },
  }, t('Anhang hinzufügen …'));
  if (cloud) ext.permissions.contains({ origins: AZURE_BLOB_ORIGINS }).then((ok) => { granted = ok; }).catch(() => {});
  return el('div', { className: 'row' }, button, file);
}

/** Reads a file as base64 without building a huge intermediate string. */
function fileToBase64(f) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).slice(String(r.result).indexOf(',') + 1));
    r.onerror = () => reject(new Error(t('Datei konnte nicht gelesen werden.')));
    r.readAsDataURL(f);
  });
}

/** Decrypts an attachment in the background and hands it to the browser as a download. */
async function downloadAttachment(accountId, itemId, attachmentId) {
  toast(t('Lade Anhang …'), 30_000);
  const { fileName, data } = await call('attachment', { accountId, itemId, attachmentId });
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes]));
  const a = el('a', { href: url, download: fileName });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  toast(t('{name} heruntergeladen', { name: fileName }));
}
