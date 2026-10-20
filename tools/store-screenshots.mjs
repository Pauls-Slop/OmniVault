// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Screenshots (1280 × 800) of the web demo: the real popup over the neutral sample website, with sample data.
// The demo itself is not changed; this script only picks which sample accounts the demo tab starts with.
//
// Usage:
//   npm run build:demo
//   node tools/store-screenshots.mjs <out-dir> [path-to-playwright] [languages, e.g. en,de]
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const outDir = resolve(process.argv[2] ?? 'dist/screenshots');
const pwPath = process.argv[3] ?? 'playwright';
const languages = (process.argv[4] ?? 'en,de').split(',').map((s) => s.trim()).filter(Boolean);
const DEMO = resolve('dist/demo');

try { await stat(join(DEMO, 'index.html')); } catch { console.error('dist/demo is missing – run `npm run build:demo` first.'); process.exit(1); }
const { chromium } = await import(pwPath);

/* ---------- a small static server for dist/demo (ES modules need http://) ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(DEMO, path === '/' ? 'index.html' : path));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

/*
 * The accounts the demo tab starts with (all unlocked). They reuse the demo's sample vaults (demo/data.js, picked
 * by `config.demo`) but only with these providers: Bitwarden, Passbolt, a self-hosted Vaultwarden server and pass.
 */
const ACCOUNTS = [
  { id: 'shot-bw', provider: 'bitwarden', label: 'Personal', short: 'BW', hue: 212, config: { server: 'bitwarden.eu', email: 'ada@example.com', demo: 'personal' } },
  { id: 'shot-pb', provider: 'passbolt', label: 'Team', short: 'PB', hue: 148, config: { server: 'https://passbolt.example.com', userId: '8bb6e5e2-0000-4000-8000-000000000001', demo: 'team' } },
  { id: 'shot-vw', provider: 'bitwarden', label: 'Family', short: 'VW', hue: 272, config: { server: 'https://vault.example.org', email: 'family@example.com', demo: 'family' } },
  { id: 'shot-ps', provider: 'pass', label: 'Offline', short: 'PS', hue: 32, config: { demo: 'offline' } },
];

function seed(accounts) {
  // runs in every frame before the page's scripts; frames of one tab and origin share sessionStorage
  if (sessionStorage.getItem('omnivault-demo:local')) return;
  sessionStorage.setItem('omnivault-demo:local', JSON.stringify({ accounts }));
  sessionStorage.setItem('omnivault-demo:session', JSON.stringify(Object.fromEntries(accounts.map((a) => [`session:${a.id}`, { demo: true }]))));
}

// the demo's own controls around the browser window are not part of the extension
const HIDE_DEMO_CONTROLS = '#site, #reload, .closed { display: none !important; }';

/** The motifs: each gets the popup frame and the top page, and leaves the popup in the state to capture. */
const MOTIFS = [
  { name: '1-all-accounts', async run() {} },
  { name: '2-item-totp', async run(f) {
    await f.click('.item[data-id="bw-example"] .name');
    await f.waitForSelector('#view-item:not([hidden]) [data-field="TOTP"]');
    await f.locator('#view-item .field').nth(1).locator('.tools button').first().click(); // reveal the password
  } },
  { name: '3-generator', async run(f) {
    await f.click('#btn-generator');
    await f.waitForSelector('#view-generator:not([hidden])');
    const actions = f.locator('#view-generator .row.actions button');
    // copy two passwords, so the list of recently generated ones has entries
    await actions.last().click();
    await actions.nth(1).click();
    await actions.last().click();
    await f.waitForSelector('#view-generator details.history:not([hidden])');
    await f.click('#view-generator .gen-row button'); // reveal the password
    await f.click('#view-generator details.history summary');
  } },
  { name: '4-fill', keepPointer: true, async run(f, top) {
    await f.locator('.item[data-id="bw-example"] button').first().click();
    await top.frameLocator('#ov-page').locator('#password').evaluate((e) => new Promise((r) => { const t = () => (e.value ? r() : setTimeout(t, 50)); t(); }));
    await top.waitForTimeout(250); // the sample page's short highlight of filled fields
  } },
  { name: '5-password-check', async run(f) {
    await f.click('#btn-tools');
    await f.waitForSelector('#view-tools:not([hidden]) select');
    await f.selectOption('#view-tools select', 'reused');
    await f.waitForSelector('#dupe-groups .group-card');
  } },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  for (const lang of languages) {
    for (const motif of MOTIFS) {
      const ctx = await browser.newContext({ viewport: { width: 1024, height: 640 }, deviceScaleFactor: 1.25, locale: lang, colorScheme: 'light' });
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN });
      await ctx.addInitScript(seed, ACCOUNTS);
      const page = await ctx.newPage();
      await page.goto(`${ORIGIN}/index.html`);
      await page.click('#site'); // show the sample website behind the popup
      await page.addStyleTag({ content: HIDE_DEMO_CONTROLS });
      const f = page.frame({ url: /popup\.html/ });
      await f.waitForSelector('.item[data-id="bw-example"]');
      await motif.run(f, page);
      await f.evaluate(() => { document.activeElement?.blur?.(); document.getElementById('toast').hidden = true; });
      if (!motif.keepPointer) await page.mouse.move(400, 780); // no hover highlight
      await page.waitForTimeout(400);
      const file = join(outDir, `omnivault-${lang}-${motif.name}.png`);
      await page.screenshot({ path: file });
      console.log(file);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
