// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Screenshots of the passkey dialog in every language (layout check by eye; texts are tested in i18n.test.js).
// Usage: node test/shot-passkeys.mjs [path-to-playwright] [screenshot-dir]
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EMAIL, PASSWORD } from './fake-bitwarden.js';
import { extensionCopy, launch, startServers } from './servers.mjs';

const { chromium } = await import(process.argv[2] ?? 'playwright');
const shots = process.argv[3] ?? tmpdir();
const ext = await extensionCopy();
let port = 8820;
for (const lang of ['de-DE', 'en-US', 'es-ES', 'fr-FR', 'it-IT', 'pt-BR', 'zh-CN', 'ja-JP']) {
  const { ORIGIN, close } = await startServers({ bwPort: port++, pbPort: port++, extraItems: 0 });
  const { ctx, extId } = await launch(chromium, ext, { lang });
  try {
    const popup = await ctx.newPage();
    await popup.goto(`chrome-extension://${extId}/popup.html`);
    const msg = (type, payload = {}) => popup.evaluate(([t, p]) => chrome.runtime.sendMessage({ type: t, ...p }).then((r) => { if (!r.ok) throw new Error(r.error); return r.result; }), [type, payload]);
    const { id } = await msg('addAccount', { provider: 'bitwarden', config: { server: ORIGIN, email: EMAIL }, label: 'Privat', short: 'PR', hue: 212 });
    await msg('login', { id, credentials: { password: PASSWORD } });
    await msg('setSettings', { patch: { passkeys: true } });
    const site = await ctx.newPage();
    await site.setViewportSize({ width: 900, height: 420 });
    await site.goto(`${ORIGIN}/webauthn.html`);
    await site.fill('#user', 'alice');
    await site.click('#register');
    const frame = async () => { for (let i = 0; i < 100; i++) { const f = site.frames().find((x) => x.url().includes('/passkey.html')); if (f) return f; await site.waitForTimeout(100); } throw new Error('kein Dialog'); };
    await (await frame()).waitForSelector('#save');
    await site.waitForTimeout(300);
    await site.screenshot({ path: join(shots, `passkey-create-${lang}.png`), clip: { x: 480, y: 0, width: 420, height: 240 } });
    await (await frame()).click('#save');
    await site.waitForFunction(() => document.querySelector('#out').textContent);
    await msg('lockAll');
    await site.click('#login');
    await (await frame()).waitForSelector('#unlock');
    await site.waitForTimeout(300);
    await site.screenshot({ path: join(shots, `passkey-locked-${lang}.png`), clip: { x: 480, y: 0, width: 420, height: 240 } });
    console.log('ok', lang);
  } catch (e) { console.log('FAIL', lang, e.message); } finally { await ctx.close(); close(); }
}
