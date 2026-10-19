// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test against a REAL Passbolt (test/passbolt-server.sh start): connect Ada's account in the popup, create a
// login with a custom field in a new folder, share it with Bob through the share dialog, edit it – and check with
// Bob's own key that he can read every version.
// Usage: PASSBOLT_URL=http://127.0.0.1:8900 node test/e2e-passbolt.mjs [path-to-playwright] [screenshot-dir]
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import PassboltProvider from '../src/providers/passbolt/index.js';
import { enableV5, seedPassbolt } from './passbolt-seed.mjs';
import { extensionCopy, launch } from './servers.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const shots = process.argv[3] ?? tmpdir();
const BASE = process.env.PASSBOLT_URL ?? 'http://127.0.0.1:8900';
const { chromium } = await import(pwPath);

const seed = await seedPassbolt(BASE);
await enableV5(BASE, seed.ada, [seed.bob]);
const bobCfg = { id: 'bob', server: BASE, userId: seed.bob.userId, privateKey: seed.bob.privateKey };
const bobLogin = await PassboltProvider.login(bobCfg, { password: seed.bob.passphrase });
Object.assign(bobCfg, bobLogin.configPatch);
const bobSees = async (name) => {
  const { items } = await PassboltProvider.sync(bobCfg, bobLogin.session);
  const it = items.find((i) => i.name === name);
  return it && { ...it, ...(await PassboltProvider.reveal(bobCfg, bobLogin.session, it)) };
};

const ext = await extensionCopy({ hosts: ['http://127.0.0.1/*'] });
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

  // connect Ada's account
  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]:has-text("Konto hinzufügen")');
  await popup.selectOption('#acc-provider', 'passbolt');
  await popup.fill('#acc-fields input[name=server]', BASE);
  await popup.fill('#acc-fields input[name=userId]', seed.ada.userId);
  await popup.fill('#acc-fields textarea[name=privateKey]', seed.ada.privateKey);
  await popup.fill('#form-account input[name=label]', 'Passbolt echt');
  await popup.click('#acc-submit');
  await popup.waitForSelector('#view-unlock:not([hidden])');
  await popup.fill('#form-unlock input[name=password]', seed.ada.passphrase);
  await popup.click('#unlock-submit');
  await popup.waitForSelector('#view-main:not([hidden])');
  await popup.waitForSelector('#accounts .chip:not(.locked)');
  check(true, 'real Passbolt account unlocked in the popup');

  // new login with a custom field in a new folder
  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]:has-text("Neuer Login")');
  await popup.waitForSelector('#view-edit:not([hidden])');
  await popup.fill('#view-edit input[name=name]', 'Team-Zugang');
  await popup.fill('#view-edit input[name=username]', 'team');
  await popup.fill('#view-edit input[name=password]', 'erstes-pw');
  await popup.fill('#view-edit [data-uri]', 'https://team.example');
  await popup.click('#view-edit button:has-text("+ Feld")');
  await popup.fill('#view-edit .field-row input[aria-label=Feldname]', 'Kundennummer');
  await popup.fill('#view-edit .field-row input[aria-label=Feldwert]', 'K-42');
  await popup.selectOption('#view-edit select[name=folder]', '__new');
  await popup.fill('#dialog-input', 'Team');
  await popup.click('#dialog-ok');
  await popup.waitForFunction(() => document.querySelector('#view-edit select[name=folder]').selectedOptions[0]?.textContent === 'Team');
  await popup.click('#view-edit button[type=submit]');
  await popup.waitForSelector('#view-item:not([hidden]) h2:has-text("Team-Zugang")');
  const detail = await popup.textContent('#view-item');
  check(detail.includes('Kundennummer') && detail.includes('K-42') && detail.includes('Team'), 'login with custom field saved in the new folder');

  // share with Bob (update rights) through the dialog
  await popup.click('#view-item button[aria-label="Kopieren, verschieben, teilen"]');
  await popup.click('#menu [role=menuitem]:has-text("Teilen")');
  await popup.waitForSelector('#dialog-transfer[open] .share-row');
  check((await popup.textContent('#dialog-transfer .share-list')).includes('Ada Test'), 'share dialog lists the owner');
  await popup.fill('#dialog-transfer input[type=search]', 'bob');
  await popup.click('#dialog-transfer .share-target:has-text("Bob")');
  await popup.selectOption('#dialog-transfer select[aria-label="Rechte von Bob Test"]', '7');
  await popup.screenshot({ path: join(shots, 'passbolt-share.png') });
  await popup.click('#dialog-transfer button:has-text("Speichern")');
  await popup.waitForFunction(() => /Freigaben gespeichert/.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 20000 });
  let forBob = await bobSees('Team-Zugang');
  check(forBob?.password === 'erstes-pw' && forBob.canEdit === true, 'Bob reads the shared login and may edit it');
  check(forBob?.fields?.[0]?.value === 'K-42', 'Bob sees the custom field');

  // edit the shared login in the popup: the new secret is encrypted for Bob too
  await popup.waitForSelector('#view-item:not([hidden]) h2:has-text("Team-Zugang")');
  await popup.click('#view-item button:has-text("Bearbeiten")');
  await popup.fill('#view-edit input[name=password]', 'zweites-pw');
  await popup.click('#view-edit button[type=submit]');
  await popup.waitForSelector('#view-item:not([hidden]) h2:has-text("Team-Zugang")');
  forBob = await bobSees('Team-Zugang');
  check(forBob?.password === 'zweites-pw', 'Bob reads the password edited in OmniVault');
  check(errors.length === 0, `no script errors (${errors.join('; ')})`);
} catch (e) {
  failures++;
  console.log('FAIL', e.message);
} finally {
  await ctx.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
