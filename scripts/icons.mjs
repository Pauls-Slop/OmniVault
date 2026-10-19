// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Renders src/icons/icon.svg to the PNG sizes the manifests use, with the test browser (no extra tools).
// Usage: node scripts/icons.mjs [path-to-playwright]
import { readFile } from 'node:fs/promises';

const { chromium } = await import(process.argv[2] ?? 'playwright');
const svg = await readFile('src/icons/icon.svg', 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of [16, 32, 48, 128]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.locator('svg').screenshot({ path: `src/icons/icon${size}.png`, omitBackground: true });
}
await browser.close();
console.log('icons written');
