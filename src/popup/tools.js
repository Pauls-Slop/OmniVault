// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Tools view: duplicates, bulk selection (copy / move / delete), mirror rules between accounts, import, trash.
import { FORMATS, parseImport } from '../lib/import.js';
import { openItem } from './detail.js';
import { S, accountOf, folderPicker, providerOf, refresh, writableAccounts } from './state.js';
import { formatDateTime, markn } from '../i18n/index.js';
import { $, ask, back, badge, call, el, show, t, tn, toast, typeIcon, uiLanguage } from './ui.js';

let tab = 'dupes';
let scope = 'all';
const selected = new Set(); // "accountId\u0000itemId"
const keyOf = (i) => `${i.accountId}\u0000${i.id}`;
const refsOf = (keys) => [...keys].map((k) => { const [accountId, itemId] = k.split('\u0000'); return { accountId, itemId }; });
const typesOf = (a) => providerOf(a.provider)?.capabilities?.types ?? [];
const dateOf = (d) => (d ? formatDateTime(d, { dateStyle: 'medium' }) : '');
const ENTRIES = markn('{n} Eintrag', '{n} Einträge');
/** Outcome of a bulk action: '3 Einträge kopiert'. */
const DONE = {
  copy: markn('{n} Eintrag kopiert', '{n} Einträge kopiert'),
  move: markn('{n} Eintrag verschoben', '{n} Einträge verschoben'),
  restore: markn('{n} Eintrag wiederhergestellt', '{n} Einträge wiederhergestellt'),
  purge: markn('{n} Eintrag endgültig gelöscht', '{n} Einträge endgültig gelöscht'),
  delete: markn('{n} Eintrag gelöscht', '{n} Einträge gelöscht'),
};

/* ---------- target dialog (shared with detail view) ---------- */

/** Asks for target account + folder. Resolves {targetAccountId, targetFolderId} or null. */
export async function chooseTarget({ refs, mode }) {
  const types = new Set(refs.map((r) => S.items.find((i) => i.accountId === r.accountId && i.id === r.itemId)?.type).filter(Boolean));
  const accounts = writableAccounts().filter((a) => [...types].every((type) => typesOf(a).includes(type)));
  if (!accounts.length) { toast(t('Kein entsperrtes Konto, das diese Einträge aufnehmen kann')); return null; }
  const d = $('#dialog-transfer');
  // propose another account first: copying into the same account is possible, but rarely what is meant
  const sources = new Set(refs.map((r) => r.accountId));
  accounts.sort((a, b) => sources.has(a.id) - sources.has(b.id));
  const accSel = el('select', { name: 'target' }, accounts.map((a) => el('option', { value: a.id }, sources.has(a.id) ? t('{account} (gleiches Konto)', { account: a.label }) : a.label)));
  const { select: folderSel, label: folderLabel, load } = folderPicker({ name: 'folder' });
  const loadFolders = () => load(accSel.value);
  accSel.addEventListener('change', loadFolders);
  const lostHint = el('p', { className: 'hint warn', hidden: true });
  const loadLoss = async () => {
    const info = await call('transferInfo', { items: refs, targetAccountId: accSel.value }).catch(() => ({ lost: [] }));
    lostHint.textContent = t('Nicht übertragen werden: {list}.', { list: info.lost.join(', ') });
    lostHint.hidden = !info.lost.length;
  };
  accSel.addEventListener('change', loadLoss);
  await loadLoss();
  d.replaceChildren(el('form', { method: 'dialog' },
    el('h3', {}, mode === 'move' ? tn(refs.length, '{n} Eintrag verschieben', '{n} Einträge verschieben')
      : tn(refs.length, '{n} Eintrag kopieren', '{n} Einträge kopieren')),
    el('label', {}, t('Ziel-Konto'), accSel), folderLabel,
    lostHint,
    mode === 'move' ? el('p', { className: 'hint' }, t('Das Original wird erst gelöscht, wenn die Kopie angelegt ist.')) : null,
    el('div', { className: 'row' },
      el('button', { value: 'cancel', className: 'secondary' }, t('Abbrechen')),
      el('button', { value: 'ok', id: 'transfer-ok' }, mode === 'move' ? t('Verschieben') : t('Kopieren')))));
  await loadFolders();
  d.returnValue = '';
  d.showModal();
  await new Promise((r) => d.addEventListener('close', r, { once: true }));
  if (d.returnValue !== 'ok') return null;
  return { targetAccountId: accSel.value, targetFolderId: folderSel.value || null };
}

/** Runs copy/move with the target dialog and reports the outcome. Returns the results (or null). */
export async function transferWithDialog(refs, mode) {
  const target = await chooseTarget({ refs, mode });
  if (!target) return null;
  toast(mode === 'move' ? t('Verschiebe …') : t('Kopiere …'), 60_000);
  const results = await call('transfer', { items: refs, ...target, mode });
  await refresh();
  report(results, mode);
  return results;
}

function report(results, kind, pool = S.items) {
  const failed = results.filter((r) => !r.ok);
  const done = tn(results.length - failed.length, ...DONE[kind]);
  if (!failed.length) return toast(done);
  const names = failed.slice(0, 5).map((r) => `• ${pool.find((i) => i.id === r.itemId)?.name ?? r.itemId}: ${r.error}`).join('\n');
  ask(`${t('{done}, {failed} fehlgeschlagen:', { done, failed: failed.length })}\n${names}${failed.length > 5 ? '\n…' : ''}`, { ok: t('OK') });
}

/* ---------- view ---------- */

export async function openTools(which) {
  if (which) tab = which;
  selected.clear();
  const opened = tab;
  show('tools', { restore: () => openTools(opened) });
  await render();
}

async function render() {
  const view = $('#view-tools');
  const tabs = el('div', { className: 'tabs', role: 'tablist' },
    [['dupes', t('Prüfen')], ['bulk', t('Auswahl')], ['mirror', t('Spiegeln')], ['import', t('Import/Export')],
      ...(hasTrash() ? [['trash', t('Papierkorb')]] : [])].map(([id, label]) =>
      el('button', { type: 'button', role: 'tab', 'aria-selected': String(tab === id), className: tab === id ? 'active' : '',
        onclick: () => { tab = id; selected.clear(); render(); } }, label)));
  const body = el('div', { className: 'tool-body' });
  view.replaceChildren(el('h2', {}, t('Werkzeuge')), tabs, body);
  if (!S.state.accounts.some((a) => a.unlocked)) {
    body.append(el('p', { className: 'hint' }, t('Entsperre mindestens ein Konto, um die Werkzeuge zu nutzen.')), footer([]));
    return;
  }
  if (tab === 'dupes') await renderDupes(body);
  else if (tab === 'bulk') renderBulk(body);
  else if (tab === 'import') await renderImport(body);
  else if (tab === 'trash') await renderTrash(body);
  else await renderMirror(body);
}

const hasTrash = () => S.state.accounts.some((a) => a.unlocked && providerOf(a.provider)?.capabilities?.restore);

/* ---------- trash ---------- */

async function renderTrash(body) {
  const items = await call('trash');
  const list = el('div', { className: 'pick-list' });
  const actions = el('div', { className: 'row actions compact' });
  const run = async (handler, kind, progress) => {
    const refs = refsOf(selected);
    toast(progress, 60_000);
    const results = await call(handler, { items: refs });
    selected.clear();
    await refresh();
    report(results, kind, items);
    render();
  };
  const update = () => actions.replaceChildren(
    el('button', { type: 'button', className: 'secondary', onclick: () => back() }, t('Zurück')),
    el('button', { type: 'button', disabled: !selected.size, onclick: () => run('restoreItems', 'restore', t('Stelle wieder her …')) }, t('Wiederherstellen')),
    el('button', { type: 'button', className: 'secondary danger-text', disabled: !selected.size, onclick: async () => {
      if (!await ask(tn(selected.size, '{n} Eintrag endgültig löschen? Das lässt sich nicht rückgängig machen.', '{n} Einträge endgültig löschen? Das lässt sich nicht rückgängig machen.'), { ok: t('Endgültig löschen'), danger: true })) return;
      run('purgeItems', 'purge', t('Lösche …'));
    } }, t('Endgültig löschen')));
  list.replaceChildren(...(items.length
    ? items.map((i) => itemRow({ ...i, revisionDate: i.deletedDate }, { onToggle: update, open: false }))
    : [el('p', { className: 'empty-note' }, t('Der Papierkorb ist leer.'))]));
  body.append(el('p', { className: 'hint' }, t('Gelöschte Einträge der Konten, deren Anbieter einen Papierkorb hat (Bitwarden, Vaultwarden). Das Datum ist der Löschzeitpunkt.')), list, actions);
  update();
}

function footer(extra) {
  return el('div', { className: 'row actions' }, el('button', { type: 'button', className: 'secondary', onclick: () => back() }, t('Zurück')), ...extra);
}

function itemRow(i, { onToggle, open = true } = {}) {
  const box = el('input', { type: 'checkbox', checked: selected.has(keyOf(i)), 'aria-label': t('{name} auswählen', { name: i.name }),
    onchange: (e) => { if (e.target.checked) selected.add(keyOf(i)); else selected.delete(keyOf(i)); onToggle?.(); } });
  return el('div', { className: 'pick', vars: { '--acc-h': i.accountHue } },
    box,
    el('span', { className: 'type-ico' }, typeIcon(i.type, { size: 14 })),
    open ? el('button', { type: 'button', className: 'link pick-name', title: t('Details öffnen'), onclick: () => openItem(i.accountId, i.id) }, i.name || t('(ohne Namen)'))
      : el('span', { className: 'pick-name' }, i.name || t('(ohne Namen)')),
    el('span', { className: 'pick-sub' }, [i.username, i.folder, dateOf(i.revisionDate)].filter(Boolean).join(' · ')),
    badge(i.accountShort, i.accountHue, i.accountLabel));
}

function selectionActions(onDone) {
  const n = selected.size;
  const refs = refsOf(selected);
  const run = async (fn) => { await fn(); selected.clear(); await onDone(); };
  return [
    el('button', { type: 'button', className: 'secondary', disabled: !n, title: t('Auswahl in ein anderes Konto oder einen Ordner kopieren'), onclick: () => run(() => transferWithDialog(refs, 'copy')) }, t('Kopieren')),
    el('button', { type: 'button', className: 'secondary', disabled: !n, title: t('Auswahl in ein anderes Konto oder einen Ordner verschieben'), onclick: () => run(() => transferWithDialog(refs, 'move')) }, t('Verschieben')),
    el('button', { type: 'button', className: 'secondary danger-text', disabled: !n, onclick: () => run(async () => {
      if (!await ask(tn(n, '{n} Eintrag löschen? Bitwarden und Proton Pass legen sie in den Papierkorb, bei den übrigen Anbietern ist das Löschen endgültig.',
        '{n} Einträge löschen? Bitwarden und Proton Pass legen sie in den Papierkorb, bei den übrigen Anbietern ist das Löschen endgültig.'), { ok: t('Löschen'), danger: true })) return;
      const results = await call('bulkDelete', { items: refs });
      await refresh();
      report(results, 'delete');
    }) }, n ? t('Löschen ({n})', { n }) : t('Löschen')),
  ];
}

/* ---------- duplicates ---------- */

async function renderDupes(body) {
  const scopeSel = el('select', { 'aria-label': t('Umfang') },
    el('optgroup', { label: t('Duplikate') },
      [['all', t('Alle Duplikate')], ['within', t('Innerhalb eines Kontos')], ['across', t('Zwischen Konten')]].map(([v, l]) => el('option', { value: v }, l))),
    el('optgroup', { label: t('Passwörter') },
      [['reused', t('Mehrfach verwendete Passwörter')], ['weak', t('Schwache Passwörter')]].map(([v, l]) => el('option', { value: v }, l))));
  scopeSel.value = scope;
  scopeSel.addEventListener('change', () => { scope = scopeSel.value; selected.clear(); render(); });
  const report = ['reused', 'weak'].includes(scope);
  if (report) toast(t('Prüfe Passwörter …'), 30_000);
  const groups = report ? await call('passwordReport', { kind: scope }) : await call('duplicates', { scope });
  if (report) toast(groups.length ? tn(groups.reduce((n, g) => n + g.items.length, 0), '{n} Eintrag gefunden', '{n} Einträge gefunden') : t('Nichts gefunden'));
  const actions = el('div', { className: 'row actions compact' });
  const updateActions = () => actions.replaceChildren(el('button', { type: 'button', className: 'secondary', onclick: () => back() }, t('Zurück')), ...selectionActions(render));
  body.append(
    el('p', { className: 'hint' }, report
      ? t('Geprüft werden die Passwörter aller Logins der entsperrten Konten, nur hier im Browser. Betroffene Einträge am besten mit einem neuen Passwort aus dem Generator ändern.')
      : t('Gleiche Website und gleicher Benutzername gelten als Duplikat. Gesperrte Konten werden nicht geprüft.')),
    el('div', { className: 'row filter' }, scopeSel,
      !report && groups.some((g) => g.within) ? el('button', { type: 'button', className: 'secondary', title: t('Je Konto alle außer dem neuesten Eintrag auswählen (Einträge in anderen Konten bleiben unberührt)'),
        onclick: () => {
          for (const g of groups) {
            const newest = new Set();
            for (const i of g.items) { // newest first
              if (newest.has(i.accountId)) selected.add(keyOf(i)); else newest.add(i.accountId);
            }
          }
          render0();
        } }, t('Ältere auswählen')) : null),
    el('div', { id: 'dupe-groups' }),
    actions);
  const render0 = () => {
    $('#dupe-groups', body).replaceChildren(...(groups.length ? groups.map((g) => el('div', { className: 'group-card' },
      el('div', { className: 'group-head' },
        el('strong', {}, g.host), el('span', {}, g.username || t('(ohne Benutzer)')),
        g.within ? el('span', { className: 'tag' }, t('im Konto')) : null,
        g.across ? el('span', { className: 'tag' }, t('kontenübergreifend')) : null),
      g.items.map((i) => itemRow(i, { onToggle: updateActions }))))
      : [el('p', { className: 'empty-note' }, report ? t('Keine auffälligen Passwörter.') : t('Keine Duplikate gefunden.'))]));
    updateActions();
  };
  render0();
}

/* ---------- bulk selection ---------- */

function renderBulk(body) {
  const accSel = el('select', { 'aria-label': t('Konto') }, el('option', { value: '' }, t('Alle Konten')),
    S.state.accounts.filter((a) => a.unlocked).map((a) => el('option', { value: a.id }, a.label)));
  const q = el('input', { type: 'search', placeholder: t('Filtern …'), 'aria-label': t('Filtern') });
  const list = el('div', { className: 'pick-list' });
  const actions = el('div', { className: 'row actions compact' });
  const all = el('input', { type: 'checkbox', 'aria-label': t('Alle sichtbaren auswählen') });
  let visible = [];
  const updateActions = () => {
    all.checked = visible.length > 0 && visible.every((i) => selected.has(keyOf(i)));
    actions.replaceChildren(el('button', { type: 'button', className: 'secondary', onclick: () => back() }, t('Zurück')), ...selectionActions(() => { draw(); return Promise.resolve(); }));
  };
  const draw = () => {
    const needle = q.value.trim().toLowerCase();
    visible = S.items.filter((i) => (!accSel.value || i.accountId === accSel.value) && (!needle
      || [i.name, i.username, i.folder, ...(i.uris ?? [])].some((v) => v?.toLowerCase().includes(needle))))
      .sort((a, b) => a.name.localeCompare(b.name, uiLanguage()));
    list.replaceChildren(...(visible.length ? visible.slice(0, 500).map((i) => itemRow(i, { onToggle: updateActions })) : [el('p', { className: 'empty-note' }, t('Keine Einträge.'))]));
    updateActions();
  };
  all.addEventListener('change', () => { for (const i of visible) { if (all.checked) selected.add(keyOf(i)); else selected.delete(keyOf(i)); } draw(); });
  accSel.addEventListener('change', draw);
  q.addEventListener('input', draw);
  body.append(el('div', { className: 'row filter' }, accSel, q), el('label', { className: 'inline-check' }, all, t('Alle sichtbaren auswählen')), list, actions);
  draw();
}

/* ---------- mirror rules ---------- */

async function renderMirror(body) {
  const rules = await call('mirrorRules');
  const label = (accId, folderId, folders) => {
    const a = accountOf(accId);
    const f = folderId ? folders[accId]?.find((x) => x.id === folderId)?.name ?? '?' : t('alle Ordner');
    return a ? `${a.label} / ${f}` : t('(Konto entfernt)');
  };
  const folders = {};
  for (const a of S.state.accounts.filter((x) => x.unlocked)) folders[a.id] = await call('folders', { accountId: a.id }).catch(() => []);

  const cards = rules.map((r) => {
    const last = r.last;
    const counts = () => [
      tn(last.created, '{n} neu', '{n} neu'), tn(last.updated, '{n} geändert', '{n} geändert'),
      tn(last.deleted, '{n} gelöscht', '{n} gelöscht'), tn(last.unchanged, '{n} unverändert', '{n} unverändert'),
      last.skipped ? tn(last.skipped, '{n} übersprungen', '{n} übersprungen') : null,
      last.errors?.length ? tn(last.errors.length, '{n} Fehler', '{n} Fehler') : null,
    ].filter(Boolean).join(', ');
    const status = !last ? t('Noch nicht ausgeführt')
      : last.error ? t('Fehler: {error}', { error: last.error })
        : `${formatDateTime(last.at)}: ${counts()}`;
    const enabled = el('input', { type: 'checkbox', checked: r.enabled, onchange: async (e) => { await call('saveMirrorRule', { rule: { ...r, enabled: e.target.checked } }); } });
    return el('div', { className: 'group-card rule' },
      el('div', { className: 'group-head' }, el('strong', {}, label(r.sourceAccountId, r.sourceFolderId, folders)), el('span', {}, '→'), el('strong', {}, label(r.targetAccountId, r.targetFolderId, folders))),
      el('p', { className: `hint${last?.error ? ' error' : ''}` }, status, r.deleteMissing ? ` · ${t('löscht entfernte Einträge im Ziel')}` : ''),
      last?.errors?.length ? el('details', {}, el('summary', {}, t('Fehler anzeigen')), el('ul', {}, last.errors.map((x) => el('li', {}, x)))) : null,
      el('div', { className: 'row' },
        el('label', { className: 'inline-check' }, enabled, t('automatisch')),
        el('button', { type: 'button', className: 'secondary', onclick: async (e) => {
          e.currentTarget.disabled = true;
          toast(t('Spiegle …'), 60_000);
          await call('runMirror', { id: r.id });
          await refresh();
          toast(t('Spiegeln abgeschlossen'));
          render();
        } }, t('Jetzt ausführen')),
        el('button', { type: 'button', className: 'secondary danger-text', onclick: async () => {
          if (!await ask(t('Regel löschen? Bereits gespiegelte Einträge bleiben im Ziel erhalten.'), { ok: t('Löschen'), danger: true })) return;
          await call('deleteMirrorRule', { id: r.id });
          render();
        } }, t('Löschen'))));
  });

  // new rule
  const unlocked = S.state.accounts.filter((a) => a.unlocked);
  const writable = writableAccounts();
  const srcAcc = el('select', { name: 'sourceAccountId' }, unlocked.map((a) => el('option', { value: a.id }, a.label)));
  const srcFolder = el('select', { name: 'sourceFolderId' });
  const dstAcc = el('select', { name: 'targetAccountId' }, writable.map((a) => el('option', { value: a.id }, a.label)));
  const dstFolder = el('select', { name: 'targetFolderId' });
  const del = el('input', { type: 'checkbox', name: 'deleteMissing' });
  const fill = (sel, accId, { required } = {}) => sel.replaceChildren(
    ...(required ? [] : [el('option', { value: '' }, sel === srcFolder ? t('– alle Ordner –') : t('– kein Ordner –'))]),
    ...(folders[accId] ?? []).map((f) => el('option', { value: f.id }, f.name)));
  const refill = () => {
    fill(srcFolder, srcAcc.value);
    const caps = providerOf(accountOf(dstAcc.value)?.provider)?.capabilities ?? {};
    fill(dstFolder, dstAcc.value, { required: caps.folderLabel === 'Tresor' });
  };
  srcAcc.addEventListener('change', refill);
  dstAcc.addEventListener('change', refill);
  if (writable.length > 1 && dstAcc.value === srcAcc.value) dstAcc.value = writable.find((a) => a.id !== srcAcc.value).id;
  refill();
  const err = el('p', { className: 'error', hidden: true });
  const form = el('form', { className: 'rule-form', novalidate: true },
    el('h3', {}, t('Neue Regel')),
    el('div', { className: 'two' }, el('label', {}, t('Quelle'), srcAcc), el('label', {}, t('Ordner'), srcFolder)),
    el('div', { className: 'two' }, el('label', {}, t('Ziel'), dstAcc), el('label', {}, t('Ordner'), dstFolder)),
    el('label', { className: 'inline-check' }, del, t('Im Ziel löschen, wenn der Eintrag in der Quelle entfernt wird')),
    err,
    el('button', { type: 'submit' }, t('Regel anlegen')));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    try {
      await call('saveMirrorRule', { rule: { sourceAccountId: srcAcc.value, sourceFolderId: srcFolder.value || null, targetAccountId: dstAcc.value, targetFolderId: dstFolder.value || null, deleteMissing: del.checked } });
      toast(t('Regel angelegt'));
      render();
    } catch (x) { err.textContent = x.message; err.hidden = false; }
  });

  body.append(
    el('p', { className: 'hint' }, t('Eine Regel überträgt Logins und Notizen einseitig von der Quelle ins Ziel und hält sie aktuell: Ändert sich ein Eintrag in der Quelle, wird die Kopie überschrieben. Regeln laufen beim automatischen Abgleich (Einstellungen) oder über „Jetzt ausführen“, solange beide Konten entsperrt sind.')),
    ...cards,
    writable.length ? form : el('p', { className: 'hint' }, t('Für eine Regel muss ein Ziel-Konto mit Schreibzugriff entsperrt sein.')),
    footer([]));
}

/* ---------- import ---------- */

async function renderImport(body) {
  const writable = writableAccounts();
  if (!writable.length) {
    body.append(el('p', { className: 'hint' }, t('Zum Importieren muss ein Konto entsperrt sein, in das OmniVault schreiben kann.')), exportSection(), footer([]));
    return;
  }
  let parsed = null; // { format, items }

  const fileInput = el('input', { type: 'file', accept: '.csv,.json,.xml,.txt', 'aria-label': t('Exportdatei') });
  const formatSel = el('select', { 'aria-label': t('Format') }, FORMATS.map((f) => el('option', { value: f.id }, t(f.label))));
  const accSel = el('select', { 'aria-label': t('Ziel-Konto') }, writable.map((a) => el('option', { value: a.id }, a.label)));
  const { select: folderSel, label: folderLabel, load } = folderPicker({ 'aria-label': t('Ordner') });
  const info = el('p', { className: 'hint' }, t('Wähle eine Exportdatei eines anderen Passwortmanagers. Die Datei wird nur lokal gelesen.'));
  const preview = el('div', {});
  const runBtn = el('button', { type: 'button', disabled: true }, t('Importieren'));

  const loadFolders = () => load(accSel.value);

  const doParse = async () => {
    preview.replaceChildren();
    runBtn.disabled = true;
    parsed = null;
    const file = fileInput.files?.[0];
    if (!file) return;
    let text;
    try { text = await file.text(); } catch { info.textContent = t('Datei konnte nicht gelesen werden.'); return; }
    try {
      parsed = parseImport(text, formatSel.value);
    } catch (e) {
      info.className = 'hint error';
      info.textContent = t('Nicht erkannt: {error}', { error: e.message });
      return;
    }
    info.className = 'hint';
    const n = parsed.items.length;
    const logins = parsed.items.filter((i) => i.type === 'login').length;
    const fmt = FORMATS.find((f) => f.id === parsed.format)?.name;
    info.textContent = t('Erkannt: {format} · {entries} ({logins}, {notes})', {
      format: fmt ? t(fmt) : parsed.format, entries: tn(n, ...ENTRIES),
      logins: tn(logins, '{n} Login', '{n} Logins'), notes: tn(n - logins, '{n} Notiz', '{n} Notizen'),
    });
    preview.replaceChildren(el('div', { className: 'pick-list' },
      ...parsed.items.slice(0, 8).map((i) => el('div', { className: 'pick', vars: { '--acc-h': 210 } },
        el('span', { className: 'type-ico' }, typeIcon(i.type, { size: 14 })),
        el('span', { className: 'pick-name' }, i.name),
        el('span', { className: 'pick-sub' }, [i.username, i.uris?.[0]].filter(Boolean).join(' · ')))),
      n > 8 ? el('p', { className: 'hint' }, t('… und {n} weitere', { n: n - 8 })) : null));
    runBtn.disabled = !n;
  };

  fileInput.addEventListener('change', doParse);
  formatSel.addEventListener('change', () => { if (fileInput.files?.[0]) doParse(); });
  accSel.addEventListener('change', loadFolders);
  runBtn.addEventListener('click', async () => {
    if (!parsed?.items.length) return;
    const a = accountOf(accSel.value);
    if (!await ask(tn(parsed.items.length, '{n} Eintrag nach „{account}“ importieren?', '{n} Einträge nach „{account}“ importieren?', { account: a.label }), { ok: t('Importieren') })) return;
    runBtn.disabled = true;
    toast(t('Importiere …'), 120_000);
    const results = await call('importItems', { accountId: a.id, items: parsed.items, folderId: folderSel.value || null }).catch((e) => { toast(e.message); return null; });
    if (!results) { runBtn.disabled = false; return; }
    await refresh();
    const failed = results.filter((r) => !r.ok);
    const okN = results.length - failed.length;
    if (!failed.length) toast(tn(okN, '{n} Eintrag importiert', '{n} Einträge importiert'));
    else {
      const names = failed.slice(0, 5).map((r) => `• ${r.name}: ${r.error}`).join('\n');
      await ask(`${t('{done}, {failed} fehlgeschlagen:', { done: tn(okN, '{n} Eintrag importiert', '{n} Einträge importiert'), failed: failed.length })}\n${names}${failed.length > 5 ? '\n…' : ''}`, { ok: t('OK') });
    }
    tab = 'bulk';
    render();
  });

  await loadFolders();
  body.append(
    info,
    el('label', {}, t('Datei'), fileInput),
    el('label', {}, t('Format'), formatSel),
    el('div', { className: 'two' }, el('label', {}, t('Ziel-Konto'), accSel), folderLabel),
    preview,
    el('p', { className: 'hint' }, t('Zusatzfelder, Karten und Identitäten bleiben erhalten, wenn das Ziel-Konto sie speichern kann, sonst stehen sie in den Notizen. Nicht zugeordnete CSV-Spalten landen in den Notizen. Verschlüsselte Exporte bitte vorher entschlüsselt exportieren.')),
    exportSection(),
    el('div', { className: 'row actions' }, el('button', { type: 'button', className: 'secondary', onclick: () => back() }, t('Zurück')), runBtn));
}

/* ---------- export ---------- */

function exportSection() {
  const unlocked = S.state.accounts.filter((a) => a.unlocked);
  const accSel = el('select', { 'aria-label': t('Konto für den Export') }, el('option', { value: '' }, t('Alle entsperrten Konten')), unlocked.map((a) => el('option', { value: a.id }, a.label)));
  const fmtSel = el('select', { 'aria-label': t('Exportformat') },
    el('option', { value: 'json' }, t('Bitwarden-JSON (vollständig)')), el('option', { value: 'csv' }, t('CSV (Logins und Notizen)')));
  const btn = el('button', { type: 'button', className: 'secondary', onclick: async () => {
    const question = accSel.value
      ? t('Alle Einträge aus „{account}“ unverschlüsselt exportieren? Die Datei enthält sämtliche Passwörter im Klartext – nach Gebrauch löschen.', { account: accountOf(accSel.value).label })
      : t('Alle Einträge aus allen entsperrten Konten unverschlüsselt exportieren? Die Datei enthält sämtliche Passwörter im Klartext – nach Gebrauch löschen.');
    if (!await ask(question, { ok: t('Exportieren'), danger: true })) return;
    btn.disabled = true;
    toast(t('Exportiere …'), 120_000);
    try {
      const { fileName, content, count } = await call('exportItems', { accountIds: accSel.value ? [accSel.value] : unlocked.map((a) => a.id), format: fmtSel.value });
      const url = URL.createObjectURL(new Blob([content], { type: fmtSel.value === 'csv' ? 'text/csv' : 'application/json' }));
      const a = el('a', { href: url, download: fileName });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast(tn(count, '{n} Eintrag exportiert', '{n} Einträge exportiert'));
    } catch (e) { toast(e.message); } finally { btn.disabled = false; }
  } }, t('Exportieren …'));
  return el('div', { className: 'export' }, el('h3', {}, t('Exportieren')),
    el('div', { className: 'two' }, el('label', {}, t('Konto'), accSel), el('label', {}, t('Format'), fmtSel)),
    el('p', { className: 'hint' }, t('Unverschlüsselt, zum Umzug in einen anderen Passwortmanager oder als Sicherung. OmniVault selbst importiert beide Formate.')),
    el('p', {}, btn));
}
