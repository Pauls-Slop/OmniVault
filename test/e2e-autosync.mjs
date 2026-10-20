// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Browser test: automatic sync across a real service worker restart – against a REAL Vaultwarden server.
// Auto-sync every minute and a mirror rule A → B are set up; the service worker is stopped (DevTools protocol);
// another client changes an item on the server; the "autosync" alarm wakes the worker, which syncs A from the server
// and runs the mirror rule, so the change arrives in A and in B. Also checks that a worker restart does not push the
// alarm back (otherwise a worker woken more often than the interval would never sync).
// Usage: VAULTWARDEN_URL=http://localhost:8800 node test/e2e-autosync.mjs [path-to-playwright]
import { extensionCopy, launch } from './servers.mjs';
import { seedVaultwarden } from './vaultwarden-seed.mjs';
import BitwardenProvider from '../src/providers/bitwarden/index.js';

const pwPath = process.argv[2] ?? 'playwright';
const VW = (process.env.VAULTWARDEN_URL ?? 'http://localhost:8800').replace('127.0.0.1', 'localhost');
const { chromium } = await import(pwPath);

const A = await seedVaultwarden(VW);
const B = await seedVaultwarden(VW, { withOrg: false });

const ext = await extensionCopy();
const { ctx, extId } = await launch(chromium, ext);
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Another client: the provider in Node, logged in on its own. */
async function otherClient(seed) {
  const config = { id: `other-${seed.email}`, server: VW, email: seed.email };
  const res = await BitwardenProvider.login(config, { password: seed.password });
  Object.assign(config, res.configPatch ?? {});
  let session = res.session;
  const keep = (r) => { if (r.session) session = r.session; return r; };
  return {
    items: async () => keep(await BitwardenProvider.sync(config, session)).items,
    save: async (item, data) => keep(await BitwardenProvider.saveItem(config, session, item, data)),
  };
}

try {
  const page = await ctx.newPage();
  await page.goto(`chrome-extension://${extId}/popup.html`);
  await page.waitForSelector('#empty:not([hidden])');
  const msg = (type, payload = {}) => page.evaluate(([t, p]) => chrome.runtime.sendMessage({ type: t, ...p }).then((r) => { if (!r.ok) throw new Error(r.error); return r.result; }), [type, payload]);
  // storage and alarms read from the page do not wake the service worker
  const local = (key) => page.evaluate(async (k) => (await chrome.storage.local.get(k))[k], key);
  const alarm = () => page.evaluate(() => chrome.alarms.get('autosync'));

  // service worker state through the DevTools protocol
  const cdp = await ctx.newCDPSession(page);
  const workers = new Map();
  cdp.on('ServiceWorker.workerVersionUpdated', ({ versions }) => {
    for (const v of versions) if (v.scriptURL.startsWith(`chrome-extension://${extId}/`)) workers.set(v.versionId, v.runningStatus);
  });
  await cdp.send('ServiceWorker.enable');
  const running = () => [...workers.values()].includes('running');
  const waitFor = async (cond, ms, what) => {
    for (const end = Date.now() + ms; Date.now() < end; await sleep(250)) if (await cond()) return true;
    console.log(`     (timed out waiting for ${what})`);
    return false;
  };
  const stopWorker = async () => {
    await cdp.send('ServiceWorker.stopAllWorkers');
    return waitFor(() => !running(), 10000, 'the worker to stop');
  };

  const add = async (label, seed) => {
    const acc = await msg('addAccount', { provider: 'bitwarden', config: { server: VW, email: seed.email }, label });
    const r = await msg('login', { id: acc.id, credentials: { password: seed.password } });
    if (r?.status && r.status !== 'ok') throw new Error(`login ${label}: ${JSON.stringify(r)}`);
    return acc.id;
  };
  const accA = await add('Privat', A);
  const accB = await add('Familie', B);
  await msg('saveMirrorRule', { rule: { sourceAccountId: accA, targetAccountId: accB, enabled: true } });
  const first = Object.values(await msg('runMirror', {}))[0];
  check(first?.created > 0 && !first.error, `mirror rule A → B set up (${first?.created} neu)`);
  const ghA = (await msg('items')).find((i) => i.accountId === accA && i.name === 'GitHub');

  // auto-sync every minute
  await msg('setSettings', { patch: { autoSyncMinutes: 1 } });
  const a0 = await alarm();
  check(a0?.periodInMinutes === 1, 'auto-sync alarm scheduled every minute');

  // a restart of the worker (here: stopped, then woken by a message) must keep the alarm's schedule
  check(await stopWorker(), 'service worker stopped');
  await sleep(1500);
  await msg('state');
  check(running(), 'worker running again after a message');
  const a1 = await alarm();
  check(a1?.scheduledTime === a0.scheduledTime, `worker restart keeps the alarm schedule (${a1 && Math.round((a1.scheduledTime - a0.scheduledTime) / 1000)} s later)`);

  // another client changes the GitHub login on the server, the worker is stopped
  const other = await otherClient(A);
  const gh = (await other.items()).find((i) => i.id === ghA.id);
  await other.save(gh, { ...gh, type: 'login', password: 'vom-anderen-client' });
  const reportBefore = (await local('mirrorReports'))?.[Object.keys(await local('mirrorReports'))[0]]?.at ?? 0;
  check(await stopWorker(), 'service worker stopped before the alarm fires');
  const stoppedAt = Date.now();
  console.log(`     waiting for the alarm (due in ${Math.max(0, Math.round(((await alarm()).scheduledTime - Date.now()) / 1000))} s) …`);

  // the alarm wakes the worker; it syncs A and runs the mirror rule (the report is written last)
  const fired = await waitFor(async () => {
    const reports = await local('mirrorReports');
    return Object.values(reports ?? {}).some((r) => r.at > reportBefore && r.at > stoppedAt);
  }, 150000, 'the auto-sync run');
  check(fired, 'alarm woke the worker and the mirror rule ran');
  const report = Object.values(await local('mirrorReports'))[0];
  check(!report.error && report.updated === 1, `mirror run after the alarm: ${report.updated} geändert, ${report.unchanged} unverändert${report.error ? `, ${report.error}` : ''}`);

  // A: the woken worker synced from the server (state does not sync on its own)
  const st = await msg('state');
  const a = st.accounts.find((x) => x.id === accA);
  check(a.unlocked && a.syncedAt > stoppedAt, 'account A re-synced by the woken worker, still unlocked');
  check(await msg('secret', { accountId: accA, itemId: ghA.id, field: 'password' }) === 'vom-anderen-client', 'change from the other client arrived in A');
  // B on the server: mirrored copy carries the new password
  const inB = (await (await otherClient(B)).items()).filter((i) => i.name === 'GitHub');
  check(inB.some((i) => i.password === 'vom-anderen-client'), 'change mirrored into B on the server');
  const a2 = await alarm();
  check(a2?.periodInMinutes === 1 && a2.scheduledTime > Date.now(), 'alarm stays scheduled for the next run');
} catch (e) {
  failures++;
  console.log('FAIL', e.message);
} finally {
  await ctx.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
