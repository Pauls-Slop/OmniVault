// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Password check against data breaches: opt-in hint without access, then the report with a simulated Pwned Passwords
// service (requests from the service worker are answered by the test; only 5-digit prefixes may arrive).
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
import { createHash } from 'node:crypto';
import { EMAIL, PASSWORD } from './fake-bitwarden.js';
import { extensionCopy, launch, startServers } from './servers.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const { chromium } = await import(pwPath);
const { ORIGIN, close: closeServers } = await startServers({ bwPort: 8791, pbPort: 8792 });
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };

async function run({ granted }) {
  const ext = await extensionCopy({ hosts: granted ? ['https://api.pwnedpasswords.com/*'] : [] });
  const { ctx, extId } = await launch(chromium, ext);
  const asked = [];
  await ctx.route('https://api.pwnedpasswords.com/range/*', (route) => {
    const prefix = route.request().url().split('/').pop();
    asked.push(prefix);
    // every password of the test vault counts as breached, with its length as the count
    route.fulfill({ status: 200, contentType: 'text/plain', body: `${'0'.repeat(35)}:0\r\n${known.get(prefix) ?? ''}` });
  });
  const known = new Map();
  try {
    const page = await ctx.newPage();
    await page.goto(`chrome-extension://${extId}/popup.html`);
    const msg = (type, payload = {}) => page.evaluate(([t, p]) => chrome.runtime.sendMessage({ type: t, ...p }).then((r) => { if (!r.ok) throw new Error(r.error); return r.result; }), [type, payload]);
    const acc = await msg('addAccount', { provider: 'bitwarden', config: { server: ORIGIN, email: EMAIL }, label: 'Privat' });
    await msg('login', { id: acc.id, credentials: { password: PASSWORD } });
    for (const i of (await msg('items')).filter((x) => x.type === 'login' && x.hasPassword)) {
      const pw = await msg('secret', { accountId: i.accountId, itemId: i.id, field: 'password' });
      const sha = createHash('sha1').update(pw).digest('hex').toUpperCase();
      known.set(sha.slice(0, 5), `${known.get(sha.slice(0, 5)) ?? ''}${sha.slice(5)}:${pw.length}\r\n`);
    }
    await page.reload();
    await page.click('#btn-tools');
    await page.waitForSelector('#view-tools select[aria-label=Umfang]');
    await page.selectOption('#view-tools select[aria-label=Umfang]', 'breached');
    if (!granted) {
      await page.waitForSelector('#view-tools button:has-text("Zugriff erlauben und prüfen")');
      check(/ersten 5 Zeichen/.test(await page.textContent('#view-tools')), 'without access: explains what is sent and asks first');
      check(asked.length === 0, 'without access: nothing is sent');
    } else {
      await page.waitForSelector('#dupe-groups .group-head strong');
      const heads = await page.$$eval('#dupe-groups .group-head strong', (n) => n.map((x) => x.textContent));
      check(heads.length > 0 && heads.every((h) => /Datenleck/.test(h)), `breached passwords reported (${heads.join(' | ')})`);
      check(asked.length > 0 && asked.every((p) => /^[0-9A-F]{5}$/.test(p)), `only 5-digit prefixes requested (${asked.length})`);
    }
  } finally {
    await ctx.close();
  }
}

try {
  await run({ granted: false });
  await run({ granted: true });
} catch (e) {
  check(false, e.message);
} finally {
  closeServers();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
