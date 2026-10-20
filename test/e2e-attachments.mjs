// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test: add, download and delete Bitwarden attachments in the item view – against a REAL Vaultwarden server.
// Usage: VAULTWARDEN_URL=http://localhost:8800 node test/e2e-attachments.mjs [path-to-playwright] [screenshot-dir]
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extensionCopy, launch } from './servers.mjs';
import { seedVaultwarden } from './vaultwarden-seed.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const shots = process.argv[3] ?? tmpdir();
const VW = (process.env.VAULTWARDEN_URL ?? 'http://localhost:8800').replace('127.0.0.1', 'localhost');
const { chromium } = await import(pwPath);

const A = await seedVaultwarden(VW);
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
  const toastSays = (re) => popup.waitForFunction((src) => new RegExp(src).test(document.querySelector('#toast')?.textContent || ''), re.source, { timeout: 20000 });

  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]:has-text("Konto hinzufügen")');
  await popup.waitForSelector('#view-account:not([hidden])');
  await popup.selectOption('#acc-provider', 'bitwarden');
  await popup.selectOption('#acc-fields select[name=server]', '__custom');
  await popup.fill('input[name=server__custom]', VW);
  await popup.fill('#acc-fields input[name=email]', A.email);
  await popup.fill('#form-account input[name=label]', 'Privat');
  await popup.click('#acc-submit');
  await popup.waitForSelector('#view-unlock:not([hidden])');
  await popup.fill('#form-unlock input[name=password]', A.password);
  await popup.click('#unlock-submit');
  await popup.waitForSelector('#view-main:not([hidden]) .item', { timeout: 20000 });
  const acc = (await msg('state')).accounts[0];
  const bank = (await msg('items')).find((i) => i.name === 'Bank');

  await popup.click('.item:has-text("Bank") >> nth=0');
  await popup.waitForSelector('#view-item:not([hidden])');
  check(await popup.isVisible('#view-item summary:has-text("Anhänge (0)")'), 'empty attachment section shown for a writable item');
  const add = '#view-item button:has-text("Anhang hinzufügen")';
  check(await popup.isVisible(add), '"Anhang hinzufügen …" offered');

  // the hidden file input next to the button takes the file (what the file dialog would do)
  await popup.setInputFiles(`${add} ~ input[type=file]`, { name: 'kontoauszug.txt', mimeType: 'text/plain', buffer: Buffer.from('Saldo 1.234,56 €') });
  await toastSays(/kontoauszug\.txt hochgeladen/);
  check(true, 'upload confirmed');
  await popup.waitForSelector('#view-item summary:has-text("Anhänge (1)")');
  check(await popup.isVisible('#view-item .field:has-text("kontoauszug.txt")'), 'file listed in the item view');
  await popup.screenshot({ path: join(shots, 'attachments.png') });

  // download: the browser receives the decrypted file
  const [download] = await Promise.all([
    popup.waitForEvent('download'),
    popup.click('#view-item button[aria-label="kontoauszug.txt herunterladen"]'),
  ]);
  const path = await download.path();
  const { readFile } = await import('node:fs/promises');
  check(download.suggestedFilename() === 'kontoauszug.txt' && (await readFile(path, 'utf8')) === 'Saldo 1.234,56 €', 'download returns the original file');

  // the server holds it too (fresh sync)
  await msg('sync', { id: acc.id });
  let item = await msg('item', { accountId: acc.id, itemId: bank.id });
  check(item.attachments?.map((a) => a.fileName).join() === 'kontoauszug.txt', 'attachment present after a fresh sync');

  // too large → refused before anything is sent
  await popup.setInputFiles(`${add} ~ input[type=file]`, { name: 'gross.bin', mimeType: 'application/octet-stream', buffer: Buffer.alloc(31 * 1024 * 1024) });
  await toastSays(/zu groß/);
  check(true, 'file over the limit refused');

  // delete with confirmation
  await popup.click('#view-item button[aria-label="kontoauszug.txt löschen"]');
  await popup.waitForSelector('dialog[open]:has-text("endgültig löschen")');
  await popup.click('dialog[open] button:has-text("Löschen")');
  await toastSays(/Anhang gelöscht/);
  await popup.waitForSelector('#view-item summary:has-text("Anhänge (0)")');
  check(true, 'deleted: section shows no files');
  await msg('sync', { id: acc.id });
  item = await msg('item', { accountId: acc.id, itemId: bank.id });
  check(!item.attachments?.length, 'gone on the server');
  check(errors.length === 0, `no script errors (${errors.join('; ')})`);
} catch (e) {
  failures++;
  console.log('FAIL', e.message);
} finally {
  await ctx.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
