// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test: move a personal Bitwarden item into an organization through the item menu – against a REAL
// Vaultwarden server (one account with an organization, one without).
// Usage: VAULTWARDEN_URL=http://localhost:8800 node test/e2e-organization.mjs [path-to-playwright] [screenshot-dir]
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extensionCopy, launch } from './servers.mjs';
import { seedVaultwarden } from './vaultwarden-seed.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const shots = process.argv[3] ?? tmpdir();
const VW = (process.env.VAULTWARDEN_URL ?? 'http://localhost:8800').replace('127.0.0.1', 'localhost');
const { chromium } = await import(pwPath);

const A = await seedVaultwarden(VW);
const B = await seedVaultwarden(VW, { withOrg: false });

const ext = await extensionCopy();
const { ctx, extId } = await launch(chromium, ext);
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
  const accA = state.accounts.find((a) => a.label === 'Privat');
  const accB = state.accounts.find((a) => a.label === 'Familie');
  check(accA.canMoveToOrganization && !accB.canMoveToOrganization, 'only the account with an organization offers the move');

  const openMenuOf = async (name, badge) => {
    await popup.click(`.item:has-text("${name}"):has(.badge:text-is("${badge}")) >> nth=0`);
    await popup.waitForSelector('#view-item:not([hidden])');
    await popup.click('#view-item button[aria-label="Kopieren, verschieben, teilen"]');
    await popup.waitForSelector('#menu:not([hidden]) [role=menuitem]');
    return popup.$$eval('#menu [role=menuitem]', (m) => m.map((x) => x.textContent));
  };
  // Esc closes the menu (and may already go back to the list, like everywhere in the popup)
  const closeMenu = async () => {
    await popup.keyboard.press('Escape');
    if (await popup.isVisible('#view-item button:has-text("Zurück")')) await popup.click('#view-item button:has-text("Zurück")');
    await popup.waitForSelector('#view-main:not([hidden])');
  };
  const badgeA = accA.short;
  const badgeB = accB.short;

  // not offered: account without organization, and an item that already belongs to the organization
  check(!(await openMenuOf('Bank', badgeB)).some((t) => t.includes('Organisation')), 'no organization entry for the account without one');
  await closeMenu();
  check(!(await openMenuOf('Team-Wiki', badgeA)).some((t) => t.includes('Organisation')), 'no organization entry for an organization item');
  await closeMenu();

  // the move through the dialog
  const bank = (await msg('items')).find((i) => i.accountId === accA.id && i.name === 'Bank');
  check((await openMenuOf('Bank', badgeA)).some((t) => t.includes('In Organisation verschieben')), 'menu offers "In Organisation verschieben …"');
  await popup.click('#menu [role=menuitem]:has-text("In Organisation verschieben")');
  await popup.waitForSelector('#dialog-transfer[open] fieldset.collections');
  const dialog = await popup.textContent('#dialog-transfer');
  check(dialog.includes('„Bank“ in eine Organisation verschieben') && dialog.includes('Team') && dialog.includes('Standard'), 'dialog names the item, the organization and its collection');
  check(await popup.isChecked('#dialog-transfer fieldset.collections input[type=checkbox]'), 'the only collection is preselected');
  await popup.screenshot({ path: join(shots, 'organization-move.png') });
  // nothing chosen → message, nothing happens
  await popup.uncheck('#dialog-transfer fieldset.collections input[type=checkbox]');
  await popup.click('#dialog-transfer button:has-text("Verschieben")');
  check(await popup.isVisible('#dialog-transfer .error:has-text("mindestens eine Sammlung")'), 'a collection is required');
  await popup.check('#dialog-transfer fieldset.collections input[type=checkbox]');
  await popup.click('#dialog-transfer button:has-text("Verschieben")');
  await popup.waitForFunction(() => /In die Organisation verschoben/.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 20000 });
  check(true, 'moved: confirmation shown');
  check(await popup.isVisible('#view-item h2:has-text("Bank")'), 'detail view of the item shown again');

  // after a fresh sync: same item, now in the organization, values intact
  await msg('sync', { id: accA.id });
  const after = await msg('item', { accountId: accA.id, itemId: bank.id });
  check(after?.organizationId === A.orgId, 'item belongs to the organization after a fresh sync');
  check(await msg('secret', { accountId: accA.id, itemId: bank.id, field: 'password' }) === 'bank-pass', 'password unchanged');
  await popup.click('#view-item button[aria-label="Kopieren, verschieben, teilen"]').catch(() => {});
  const again = await popup.$$eval('#menu [role=menuitem]', (m) => m.map((x) => x.textContent)).catch(() => []);
  check(!again.some((t) => t.includes('In Organisation verschieben')), 'not offered again for the moved item');
  check(errors.length === 0, `no script errors (${errors.join('; ')})`);
} catch (e) {
  failures++;
  console.log('FAIL', e.message);
} finally {
  await ctx.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
