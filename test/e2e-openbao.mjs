// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test against a REAL OpenBao (test/openbao-server.sh start): add a userpass account in the popup, list the
// entries, fill a login form, edit an entry (check on the server), delete it and restore it from the trash.
// Usage: OPENBAO_URL=http://127.0.0.1:8820 node test/e2e-openbao.mjs [path-to-playwright] [screenshot-dir]
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seedOpenBao } from './openbao-seed.mjs';
import { LOGIN_PAGE, extensionCopy, launch } from './servers.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const shots = process.argv[3] ?? tmpdir();
const BASE = process.env.OPENBAO_URL ?? 'http://127.0.0.1:8820';
const { chromium } = await import(pwPath);

const site = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(LOGIN_PAGE); });
await new Promise((r) => site.listen(Number(process.env.SITE_PORT ?? 0), '127.0.0.1', r));
const SITE_PORT = site.address().port;
const seed = await seedOpenBao(BASE);
await seed.put('web/shop', { login: 'kunde', password: 'shop-geheim', website: `http://localhost:${SITE_PORT}/login.html`, notes: 'Kundennr. 7', port: 8080 });

const ext = await extensionCopy({ hosts: ['http://127.0.0.1/*'] });
const { ctx, extId } = await launch(chromium, ext);
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };

try {
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${SITE_PORT}/login.html`);
  const popup = await ctx.newPage();
  const errors = [];
  popup.on('pageerror', (e) => errors.push(e.message));
  await popup.setViewportSize({ width: 380, height: 560 });
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await popup.waitForSelector('#empty:not([hidden])');
  const msg = (type, payload = {}) => popup.evaluate(([t, p]) => chrome.runtime.sendMessage({ type: t, ...p }).then((r) => r.result), [type, payload]);

  // add the account: userpass, mount secret, prefix of this run
  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]:has-text("Konto hinzufügen")');
  await popup.selectOption('#acc-provider', 'vault');
  check(await popup.isHidden('#acc-fields input[name=username]'), 'user name hidden for token login');
  await popup.fill('#acc-fields input[name=server]', BASE);
  await popup.selectOption('#acc-fields select[name=auth]', 'userpass');
  check(await popup.isVisible('#acc-fields input[name=username]'), 'user name shown for userpass');
  await popup.fill('#acc-fields input[name=username]', seed.user);
  check(await popup.inputValue('#acc-fields input[name=mount]') === 'secret', 'mount defaults to secret');
  await popup.fill('#acc-fields input[name=prefix]', seed.run);
  await popup.fill('#form-account input[name=label]', 'OpenBao echt');
  await popup.screenshot({ path: join(shots, 'openbao-account.png') });
  await popup.click('#acc-submit');
  await popup.waitForSelector('#view-unlock:not([hidden])');
  check(await popup.textContent('#unlock-label') === 'Passwort', 'unlock asks for the userpass password');
  await popup.fill('#form-unlock input[name=password]', seed.password);
  await popup.click('#unlock-submit');
  await popup.waitForSelector('#view-main:not([hidden])');
  await popup.waitForSelector('#accounts .chip:not(.locked)');
  await popup.waitForFunction(() => document.querySelectorAll('.item').length >= 4);
  const names = await popup.$$eval('.item .name', (n) => n.map((x) => x.textContent));
  check(['github', 'shop', 'prod', 'notiz'].every((n) => names.includes(n)), `entries listed: ${names.join(', ')}`);
  const acc = (await msg('state')).accounts.find((a) => a.provider === 'vault');
  check(/ohne Leserecht/.test(acc.warning ?? ''), `denied sub-path reported (${acc.warning})`);

  // fill the login tab
  const items = await msg('items', { tabUrl: `http://localhost:${SITE_PORT}/login.html` });
  const shop = items.find((i) => i.name === 'shop');
  check(shop?.matches && !('password' in shop), 'entry matches the page, no password in the list');
  const filled = await popup.evaluate(async ([accountId, itemId, port]) => {
    const [tab] = await chrome.tabs.query({ url: `http://localhost:${port}/*` });
    return chrome.runtime.sendMessage({ type: 'fill', accountId, itemId, tabId: tab.id });
  }, [shop.accountId, shop.id, SITE_PORT]);
  check(filled.ok, `fill reported ${JSON.stringify(filled)}`);
  check(await page.inputValue('#u') === 'kunde' && await page.inputValue('#p') === 'shop-geheim', 'login form filled');

  // detail view and edit
  await popup.click('.item:has(.name:text-is("shop"))');
  await popup.waitForSelector('#view-item:not([hidden]) h2:has-text("shop")');
  const detail = await popup.textContent('#view-item');
  check(detail.includes('port') && detail.includes('web') && detail.includes('Kundennr. 7'), 'detail: extra key as field, folder, notes');
  await popup.click('#view-item button:has-text("Bearbeiten")');
  await popup.fill('#view-edit input[name=password]', 'shop-neu');
  await popup.click('#view-edit button[type=submit]');
  await popup.waitForSelector('#view-item:not([hidden]) h2:has-text("shop")');
  const raw = (await seed.read('web/shop')).data;
  check(raw.data.password === 'shop-neu' && raw.data.login === 'kunde' && raw.data.port === 8080 && raw.metadata.version === 3,
    `edit written with check-and-set (version ${raw.metadata.version}, keys kept)`);
  await popup.screenshot({ path: join(shots, 'openbao-detail.png') });

  // delete → trash → restore
  await popup.click('#view-item button:has-text("Löschen")');
  check(/Papierkorb/.test(await popup.textContent('#dialog')), 'delete asks with the trash hint');
  await popup.click('#dialog-ok');
  await popup.waitForSelector('#view-main:not([hidden])');
  check(!(await seed.read('web/shop')).data?.data, 'soft-deleted on the server');
  await popup.click('#btn-tools');
  await popup.click('#view-tools .tabs button:has-text("Papierkorb")');
  await popup.waitForSelector('#view-tools .pick:has-text("shop")');
  await popup.check('#view-tools .pick:has-text("shop") input[type=checkbox]');
  await popup.click('#view-tools button:has-text("Wiederherstellen")');
  await popup.waitForFunction(() => /wiederhergestellt/.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 20000 });
  check((await seed.read('web/shop')).data?.data?.password === 'shop-neu', 'restored on the server');
  check(errors.length === 0, `no script errors (${errors.join('; ')})`);
} catch (e) {
  failures++;
  console.log('FAIL', e.message);
} finally {
  await ctx.close();
  site.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
