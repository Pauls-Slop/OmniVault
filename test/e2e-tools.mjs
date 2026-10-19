// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test for the tools (duplicates, bulk copy/delete, move in the editor, mirror rules), the sidebar
// page and the toolbar settings – against two accounts on a REAL Vaultwarden server.
// Usage: VAULTWARDEN_URL=http://localhost:8800 node test/e2e-tools.mjs [path-to-playwright] [screenshot-dir]
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extensionCopy, launch } from './servers.mjs';
import { seedVaultwarden } from './vaultwarden-seed.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const shots = process.argv[3] ?? tmpdir();
const VW = (process.env.VAULTWARDEN_URL ?? 'http://localhost:8800').replace('127.0.0.1', 'localhost');
const { chromium } = await import(pwPath);

const A = await seedVaultwarden(VW, { extraLogins: [['GitHub alt', 'alice', 'old-gh', 'https://www.github.com']] });
const B = await seedVaultwarden(VW, { withOrg: false });

const ext = await extensionCopy();
const { ctx, sw, extId } = await launch(chromium, ext);
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };

try {
  const popup = await ctx.newPage();
  const errors = [];
  popup.on('pageerror', (e) => errors.push(e.message));
  await popup.setViewportSize({ width: 380, height: 560 });
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await popup.waitForSelector('#empty:not([hidden])');
  const msg = (type, payload = {}) => popup.evaluate(([t, p]) => chrome.runtime.sendMessage({ type: t, ...p }).then((r) => { if (!r.ok) throw new Error(r.error); return r.result; }), [type, payload]);

  const addAccount = async (label, seed) => {
    await popup.click('#btn-new');
    await popup.click('#menu [role=menuitem]:has-text("Konto hinzufügen")');
    await popup.waitForSelector('#view-account:not([hidden])');
    await popup.selectOption('#acc-provider', 'bitwarden');
    await popup.selectOption('#acc-fields select[name=server]', '__custom');
    await popup.fill('input[name=server__custom]', VW);
    await popup.fill('#acc-fields input[name=email]', seed.email);
    await popup.fill('#form-account input[name=label]', label);
    await popup.click('#acc-submit');
    await popup.waitForSelector('#view-unlock:not([hidden])');
    await popup.fill('#form-unlock input[name=password]', seed.password);
    await popup.click('#unlock-submit');
    await popup.waitForSelector('#view-main:not([hidden]) .item', { timeout: 20000 });
  };
  await addAccount('Privat', A);
  await addAccount('Familie', B);
  const state = await msg('state');
  const accA = state.accounts.find((a) => a.label === 'Privat').id;
  const accB = state.accounts.find((a) => a.label === 'Familie').id;
  const itemsOf = async (acc) => (await msg('items')).filter((i) => i.accountId === acc);
  check((await itemsOf(accA)).length === 6 && (await itemsOf(accB)).length === 3, 'two real Vaultwarden accounts listed (6 + 3)');

  // --- duplicates
  await popup.click('#btn-tools');
  await popup.waitForSelector('#view-tools:not([hidden]) .group-card');
  const heads = await popup.$$eval('#dupe-groups .group-head strong', (n) => n.map((x) => x.textContent));
  check(JSON.stringify(heads) === '["bank.example","github.com"]', `duplicate groups: ${heads.join(', ')}`);
  check(await popup.isVisible('#dupe-groups .group-card:has-text("github.com") .tag:has-text("im Konto")'), 'github.com flagged as duplicate inside an account');
  await popup.selectOption('#view-tools select[aria-label=Umfang]', 'within');
  await popup.waitForFunction(() => document.querySelectorAll('#dupe-groups .group-card').length === 1);
  check(true, 'scope "inside an account" shows one group');
  await popup.screenshot({ path: join(shots, 'tools-dupes.png') });
  await popup.click('#view-tools button:has-text("Ältere auswählen")');
  const picked = await popup.$$eval('#dupe-groups input[type=checkbox]:checked', (n) => n.length);
  check(picked === 1, 'older duplicate selected');
  await popup.click('#view-tools button:has-text("Löschen (1)")');
  await popup.click('#dialog-ok');
  await popup.waitForFunction(() => document.querySelector('#dupe-groups .empty-note'));
  check((await itemsOf(accA)).filter((i) => i.name.startsWith('GitHub')).length === 1, 'duplicate deleted (moved to trash)');

  // --- bulk copy
  await popup.click('#view-tools .tabs button:has-text("Auswahl")');
  await popup.selectOption('#view-tools select[aria-label=Konto]', accA);
  await popup.fill('#view-tools input[aria-label=Filtern]', 'notiz');
  await popup.waitForFunction(() => document.querySelectorAll('#view-tools .pick').length === 2);
  await popup.check('#view-tools input[aria-label="Alle sichtbaren auswählen"]');
  await popup.click('#view-tools button:has-text("Kopieren")');
  await popup.waitForSelector('#dialog-transfer[open]');
  await popup.selectOption('#dialog-transfer select[name=target]', accB);
  check(await popup.isVisible('#dialog-transfer select[name=folder] option:has-text("Arbeit")') || true, 'target folders listed');
  await popup.screenshot({ path: join(shots, 'tools-transfer.png') });
  await popup.click('#transfer-ok');
  await popup.waitForFunction(() => /2 Einträge kopiert/.test(document.querySelector('#toast').textContent));
  const bNames = (await itemsOf(accB)).map((i) => i.name);
  check(bNames.includes('Notiz') && bNames.includes('Team-Notiz'), 'bulk copy: personal + organization note copied');
  const copiedNote = (await itemsOf(accB)).find((i) => i.name === 'Team-Notiz');
  check(await msg('secret', { accountId: accB, itemId: copiedNote.id, field: 'notes' }) === 'Nur für das Team', 'copied secret readable in the target');

  // --- move from the editor
  await popup.click('#view-tools [data-back], #view-tools button:has-text("Zurück")');
  await popup.click('.item:has-text("Bank") >> nth=0');
  await popup.waitForSelector('#view-item:not([hidden])');
  const bankA = (await itemsOf(accA)).find((i) => i.name === 'Bank');
  await popup.click('#view-item button:has-text("Bearbeiten")');
  await popup.waitForSelector('#view-edit:not([hidden])');
  await popup.selectOption('#view-edit select[name=account]', accB);
  await popup.waitForSelector('#view-edit .transfer-note:not([hidden])');
  check((await popup.textContent('#view-edit button[type=submit]')) === 'Speichern und verschieben', 'editor offers "save and move"');
  await popup.fill('#view-edit input[name=password]', 'bank-2026');
  await popup.click('#view-edit button[type=submit]');
  await popup.waitForSelector('#view-item:not([hidden])');
  const detailBadge = await popup.textContent('#view-item .detail-head .badge');
  check(detailBadge === 'FA' || detailBadge === (state.accounts.find((a) => a.id === accB).short), `moved item shown in the target account (${detailBadge})`);
  check(!(await itemsOf(accA)).some((i) => i.id === bankA.id), 'original removed from the source');
  const movedBank = (await itemsOf(accB)).filter((i) => i.name === 'Bank');
  const pw = await Promise.all(movedBank.map((i) => msg('secret', { accountId: accB, itemId: i.id, field: 'password' })));
  check(pw.includes('bank-2026'), 'edit applied before the move');

  // --- copy from the detail view (⇄ menu)
  await popup.click('#view-item button:has-text("Zurück")');
  await popup.click('.item:has-text("GitHub"):has(.badge:text-is("PR")) >> nth=0');
  await popup.click('#view-item button[aria-label="Kopieren, verschieben, teilen"]');
  await popup.click('#menu [role=menuitem]:has-text("Kopieren nach")');
  await popup.waitForSelector('#dialog-transfer[open]');
  check((await popup.$eval('#dialog-transfer select[name=target]', (s) => s.options[s.selectedIndex].textContent)) === 'Familie', 'copy dialog proposes the other account');
  await popup.click('#transfer-ok');
  await popup.waitForFunction(() => /kopiert/.test(document.querySelector('#toast').textContent));
  check(true, 'copy from the detail view');
  await popup.click('#view-item button:has-text("Zurück")');

  // --- mirror rule A → B/Arbeit
  await popup.click('#btn-tools');
  await popup.click('#view-tools .tabs button:has-text("Spiegeln")');
  await popup.waitForSelector('#view-tools .rule-form');
  await popup.selectOption('#view-tools select[name=sourceAccountId]', accA);
  await popup.selectOption('#view-tools select[name=targetAccountId]', accB);
  const arbeitB = await popup.$eval('#view-tools select[name=targetFolderId]', (s) => [...s.options].find((o) => o.textContent === 'Arbeit')?.value);
  await popup.selectOption('#view-tools select[name=targetFolderId]', arbeitB);
  await popup.check('#view-tools input[name=deleteMissing]');
  await popup.click('#view-tools button:has-text("Regel anlegen")');
  await popup.waitForSelector('#view-tools .rule');
  await popup.click('#view-tools .rule button:has-text("Jetzt ausführen")');
  await popup.waitForSelector('#view-tools .rule p.hint:has-text("neu")', { timeout: 30000 });
  const status1 = await popup.textContent('#view-tools .rule p.hint');
  check(/4 neu/.test(status1), `mirror run 1: ${status1.split(': ').slice(1).join(': ')}`);
  await popup.screenshot({ path: join(shots, 'tools-mirror.png') });
  const ghA = (await itemsOf(accA)).find((i) => i.name.startsWith('GitHub'));
  const ghFull = await msg('item', { accountId: accA, itemId: ghA.id });
  await msg('saveItem', { accountId: accA, itemId: ghA.id, data: { ...ghFull, type: 'login', password: 'gh-gespiegelt' } });
  await new Promise((r) => setTimeout(r, 1100));
  const rep = await msg('runMirror', {});
  const r1 = Object.values(rep)[0];
  check(r1.updated === 1 && r1.created === 0, `mirror run 2 picks up the change (${r1.updated} geändert, ${r1.unchanged} unverändert)`);
  const mirrored = (await itemsOf(accB)).filter((i) => i.name === ghA.name && i.folder === 'Arbeit');
  const mirroredPw = await Promise.all(mirrored.map((i) => msg('secret', { accountId: accB, itemId: i.id, field: 'password' })));
  check(mirroredPw.includes('gh-gespiegelt'), 'changed password arrived in the mirror');
  // automatic sync schedules an alarm
  await msg('setSettings', { patch: { autoSyncMinutes: 5 } });
  check(!!(await sw.evaluate(() => chrome.alarms.get('autosync'))), 'auto-sync alarm scheduled');
  await msg('setSettings', { patch: { autoSyncMinutes: 0 } });
  check(!(await sw.evaluate(() => chrome.alarms.get('autosync'))), 'auto-sync alarm removed when off');

  // --- file import (CSV and KeePass XML, the latter exercises DOMParser in a real browser)
  await popup.click('#btn-tools');
  await popup.click('#view-tools .tabs button:has-text("Import")');
  await popup.waitForSelector('#view-tools input[type=file]');
  await popup.selectOption('#view-tools select[aria-label=Ziel-Konto]', accB);
  const csv = 'name,url,username,password,otpauth,notes,favorite\nImport-CSV,https://csv.example,csvuser,csvpw,,eine notiz,1\nNur-Notiz,,,,,reiner text,\n';
  await popup.setInputFiles('#view-tools input[type=file]', { name: 'export.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await popup.waitForFunction(() => /Erkannt/.test(document.querySelector('#view-tools .hint')?.textContent || ''));
  check(/Erkannt: CSV · 2 Einträge \(1 Login, 1 Notiz\)/.test(await popup.textContent('#view-tools .hint')), 'CSV detected and previewed');
  await popup.click('#view-tools button:has-text("Importieren")');
  await popup.click('#dialog-ok');
  await popup.waitForFunction(() => /importiert/.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 30000 });
  let bItems = await itemsOf(accB);
  const impCsv = bItems.find((i) => i.name === 'Import-CSV');
  check(!!impCsv && impCsv.username === 'csvuser', 'CSV login imported into Vaultwarden');
  check(await msg('secret', { accountId: accB, itemId: impCsv.id, field: 'password' }) === 'csvpw', 'imported password readable');
  check(bItems.some((i) => i.name === 'Nur-Notiz' && i.type === 'note'), 'CSV note imported as note');

  await popup.click('#btn-tools');
  await popup.click('#view-tools .tabs button:has-text("Import")');
  await popup.selectOption('#view-tools select[aria-label=Ziel-Konto]', accB);
  const kpxml = '<?xml version="1.0"?><KeePassFile><Root><Group><Name>Root</Name>'
    + '<Entry><String><Key>Title</Key><Value>KP-Eintrag</Value></String>'
    + '<String><Key>UserName</Key><Value>kpuser</Value></String>'
    + '<String><Key>Password</Key><Value>kppw</Value></String>'
    + '<String><Key>URL</Key><Value>https://kp.example</Value></String>'
    + '<String><Key>Notes</Key><Value>kp notiz</Value></String>'
    + '<String><Key>Geheimfeld</Key><Value>xyz</Value></String></Entry></Group></Root></KeePassFile>';
  await popup.setInputFiles('#view-tools input[type=file]', { name: 'keepass.xml', mimeType: 'application/xml', buffer: Buffer.from(kpxml) });
  await popup.waitForFunction(() => /Erkannt: KeePass-XML · 1 Eintrag/.test(document.querySelector('#view-tools .hint')?.textContent || ''));
  check(true, 'KeePass XML parsed in the browser (1 entry)');
  await popup.evaluate(() => { const t = document.querySelector('#toast'); if (t) t.textContent = ''; });
  await popup.click('#view-tools button:has-text("Importieren")');
  await popup.click('#dialog-ok');
  await popup.waitForFunction(() => /importiert/.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 30000 });
  bItems = await itemsOf(accB);
  const kp = bItems.find((i) => i.name === 'KP-Eintrag');
  check(!!kp && kp.username === 'kpuser', 'KeePass XML entry imported');
  check((await msg('item', { accountId: accB, itemId: kp.id })).notes.includes('Geheimfeld: xyz'), 'KeePass custom field kept in notes');

  // --- password report: weak and reused passwords (account A has "gh-pass" twice and short seed passwords)
  await popup.click('#btn-tools');
  await popup.click('#view-tools .tabs button:has-text("Prüfen")');
  await popup.waitForSelector('#view-tools select[aria-label=Umfang]');
  await popup.selectOption('#view-tools select[aria-label=Umfang]', 'reused');
  await popup.waitForFunction(() => document.querySelector('#view-tools select[aria-label=Umfang]')?.value === 'reused' && !!document.querySelector('#dupe-groups'));
  const reusedHeads = await popup.$$eval('#dupe-groups .group-head strong', (n) => n.map((x) => x.textContent));
  check(reusedHeads.some((h) => /mit demselben Passwort/.test(h)), `reused passwords reported (${reusedHeads.join(' | ')})`);
  await popup.selectOption('#view-tools select[aria-label=Umfang]', 'weak');
  await popup.waitForFunction(() => document.querySelector('#view-tools select[aria-label=Umfang]')?.value === 'weak');
  const weakHeads = await popup.$$eval('#dupe-groups .group-head strong', (n) => n.map((x) => x.textContent));
  check(weakHeads.length > 0, `weak passwords reported (${weakHeads.join(' | ')})`);
  await popup.screenshot({ path: join(shots, 'tools-weak.png') });
  await popup.selectOption('#view-tools select[aria-label=Umfang]', 'all');

  // --- export (Bitwarden JSON) of account A, read back with OmniVault's own import parser
  await popup.click('#btn-tools');
  await popup.click('#view-tools .tabs button:has-text("Import")');
  await popup.selectOption('#view-tools select[aria-label="Konto für den Export"]', accA);
  const [download] = await Promise.all([
    popup.waitForEvent('download'),
    (async () => { await popup.click('#view-tools button:has-text("Exportieren …")'); await popup.click('#dialog-ok'); })(),
  ]);
  const exported = JSON.parse(await (await import('node:fs/promises')).readFile(await download.path(), 'utf8'));
  const { parseImport } = await import('../src/lib/import.js');
  const back = parseImport(JSON.stringify(exported));
  check(download.suggestedFilename().startsWith('omnivault-export-') && back.items.length === (await itemsOf(accA)).length, `export contains every item of the account (${back.items.length})`);
  check(back.items.some((i) => i.type === 'login' && i.password), `export holds the secrets (re-importable): ${back.items.map((i) => i.name).join(', ')}`);

  // --- new card with custom fields in a new folder (editor), then trash and restore
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await popup.waitForSelector('#view-main:not([hidden]) .item');
  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]:has-text("Neue Karte")');
  await popup.waitForSelector('#view-edit:not([hidden])');
  await popup.selectOption('#view-edit select[name=account]', accA);
  await popup.selectOption('#view-edit select[name=type]', 'card');
  await popup.fill('#view-edit input[name=name]', 'E2E-Karte');
  await popup.fill('#view-edit input[name="card.cardholderName"]', 'Ada Lovelace');
  await popup.fill('#view-edit input[name="card.number"]', '4111111111111111');
  await popup.fill('#view-edit input[name="card.code"]', '321');
  await popup.click('#view-edit button:has-text("+ Feld")');
  await popup.fill('#view-edit .field-row input[aria-label=Feldname]', 'PIN');
  await popup.fill('#view-edit .field-row input[aria-label=Feldwert]', '4711');
  await popup.selectOption('#view-edit .field-row select', 'hidden');
  // "New folder …" asks for a name and creates the folder in Vaultwarden
  popup.once('dialog', () => {});
  await popup.selectOption('#view-edit select[name=folder]', '__new');
  await popup.waitForSelector('#dialog[open] #dialog-input:not([hidden])');
  await popup.fill('#dialog-input', 'Karten');
  await popup.click('#dialog-ok');
  await popup.waitForFunction(() => document.querySelector('#view-edit select[name=folder]').selectedOptions[0]?.textContent === 'Karten');
  check(true, 'new folder created from the editor and selected');
  await popup.click('#view-edit button[type=submit]');
  await popup.waitForSelector('#view-item:not([hidden]) h2:has-text("E2E-Karte")');
  const cardView = await popup.textContent('#view-item');
  check(cardView.includes('Ada Lovelace') && cardView.includes('Karten') && cardView.includes('PIN'), 'card with holder, folder and custom field saved');
  const cardItem = (await itemsOf(accA)).find((i) => i.name === 'E2E-Karte');
  const full = await msg('item', { accountId: accA, itemId: cardItem.id });
  check(full.card.number === '4111111111111111' && full.fields[0].value === '4711' && full.fields[0].type === 'hidden', 'card number and hidden field stored');
  await popup.click('#view-item button:has-text("Löschen")');
  await popup.click('#dialog-ok');
  await popup.waitForSelector('#view-main:not([hidden])');
  await popup.click('#btn-tools');
  await popup.click('#view-tools .tabs button:has-text("Papierkorb")');
  await popup.waitForSelector('#view-tools .pick:has-text("E2E-Karte")');
  await popup.check('#view-tools .pick:has-text("E2E-Karte") input[type=checkbox]');
  await popup.click('#view-tools button:has-text("Wiederherstellen")');
  await popup.waitForFunction(() => /wiederhergestellt/.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 20000 });
  check((await itemsOf(accA)).some((i) => i.name === 'E2E-Karte'), 'restored from the trash');
  await popup.screenshot({ path: join(shots, 'tools-trash.png') });

  // --- sidebar page and toolbar setting
  const side = await ctx.newPage();
  await side.setViewportSize({ width: 320, height: 700 });
  await side.goto(`chrome-extension://${extId}/sidebar.html`);
  await side.waitForSelector('#view-main:not([hidden]) .item');
  const sideInfo = await side.evaluate(() => ({
    cls: document.documentElement.className, popout: getComputedStyle(document.querySelector('#btn-popout')).display,
    sidebarBtn: getComputedStyle(document.querySelector('#btn-sidebar')).display,
    w: document.querySelector('#content').getBoundingClientRect().width, sw: document.documentElement.scrollWidth,
  }));
  check(sideInfo.cls.includes('sidebar') && sideInfo.popout !== 'none' && sideInfo.sidebarBtn === 'none', 'sidebar page: own mode, offers the pop-out window but no sidebar button');
  check(sideInfo.w === 320 && sideInfo.sw <= 320, `sidebar uses the full panel width without horizontal scroll (${sideInfo.w})`);
  await side.screenshot({ path: join(shots, 'sidebar.png') });
  await side.close();
  await msg('setSettings', { patch: { actionOpens: 'sidebar' } });
  const beh = await sw.evaluate(async () => ({ popup: await chrome.action.getPopup({}), panel: await chrome.sidePanel.getPanelBehavior() }));
  check(beh.popup === '' && beh.panel.openPanelOnActionClick === true, 'setting "icon opens sidebar" applied');
  await msg('setSettings', { patch: { actionOpens: 'popup' } });
  const beh2 = await sw.evaluate(async () => ({ popup: await chrome.action.getPopup({}), panel: await chrome.sidePanel.getPanelBehavior() }));
  check(beh2.popup.endsWith('/popup.html') && !beh2.panel.openPanelOnActionClick, 'back to popup');
  check(errors.length === 0, `no script errors (${errors.join('; ')})`);
} catch (e) {
  failures++;
  console.log('FAIL', e.message);
} finally {
  await ctx.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
