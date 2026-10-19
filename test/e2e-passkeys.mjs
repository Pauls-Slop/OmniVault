// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Passkeys on a website, end to end: a test site (relying party "localhost", test/servers.mjs) registers and signs
// in; its server checks every answer independently (test/webauthn-rp.js). OmniVault stores the passkeys in the
// simulated Bitwarden account. The browser's own authenticator is Chromium's virtual authenticator (CDP), so the
// way back to the browser ("other device", nothing found) is tested too.
// Usage: node test/e2e-passkeys.mjs [path-to-playwright] [screenshot-dir]
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EMAIL, PASSWORD } from './fake-bitwarden.js';
import { extensionCopy, launch, startServers } from './servers.mjs';

const pwPath = process.argv[2] ?? 'playwright';
const shots = process.argv[3] ?? tmpdir();
const { chromium } = await import(pwPath);
const { ORIGIN, rp, close: closeServers } = await startServers({ bwPort: 8807, pbPort: 8808, extraItems: 0 });
const ext = await extensionCopy();
const { ctx, extId } = await launch(chromium, ext);
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failures++; };
const frameOf = (page, file) => page.frames().find((f) => f.url().includes(`/${file}`));
const waitFrame = async (page, file) => {
  for (let i = 0; i < 100; i++) { const f = frameOf(page, file); if (f) { await f.waitForLoadState(); return f; } await page.waitForTimeout(100); }
  throw new Error(`${file} nicht erschienen`);
};
const gone = async (page, file) => { for (let i = 0; i < 50 && frameOf(page, file); i++) await page.waitForTimeout(100); return !frameOf(page, file); };

try {
  const popup = await ctx.newPage();
  const errors = [];
  popup.on('pageerror', (e) => errors.push(e.message));
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  const msg = (type, payload = {}) => popup.evaluate(([t, p]) => chrome.runtime.sendMessage({ type: t, ...p }).then((r) => { if (!r.ok) throw new Error(r.error); return r.result; }), [type, payload]);
  await popup.click('#btn-new');
  await popup.click('#menu [role=menuitem]:has-text("Konto hinzufügen")');
  await popup.selectOption('#acc-fields select[name=server]', '__custom');
  await popup.fill('input[name=server__custom]', ORIGIN);
  await popup.fill('#acc-fields input[name=email]', EMAIL);
  await popup.fill('#form-account input[name=label]', 'Privat');
  await popup.click('#acc-submit');
  await popup.fill('#form-unlock input[name=password]', PASSWORD);
  await popup.click('#unlock-submit');
  await popup.waitForSelector('#view-main:not([hidden]) .item');
  const accountId = (await msg('state')).accounts[0].id;
  const passkeyItems = async () => (await Promise.all((await msg('items', {})).filter((i) => i.accountId === accountId)
    .map((i) => msg('item', { accountId, itemId: i.id })))).filter((i) => i.passkeys?.length);

  const site = await ctx.newPage();
  site.on('pageerror', (e) => errors.push(`Seite: ${e.message}`));
  await site.goto(`${ORIGIN}/webauthn.html`);
  check(await site.evaluate(() => !document.querySelector('omnivault-passkey') && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.name === 'isUserVerifyingPlatformAuthenticatorAvailable'), 'off by default: page untouched');

  // the browser's own authenticator: Chromium's virtual one (answers without any prompt)
  const cdp = await ctx.newCDPSession(site);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: {
    protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true,
  } });

  // switched on together with other settings (as after a permission prompt): nothing gets lost
  await Promise.all([msg('setSettings', { patch: { passkeys: true } }), msg('setSettings', { patch: { offerSave: false } }), msg('setSettings', { patch: { inlineMenu: false } })]);
  check((await msg('settings')).passkeys === true, 'concurrent settings changes keep each other');
  await site.reload();
  const ping = await popup.evaluate(async (o) => {
    const [tab] = await chrome.tabs.query({ url: `${o}/webauthn.html` });
    return chrome.tabs.sendMessage(tab.id, { type: 'ov-passkey-ping' }, { frameId: 0 });
  }, ORIGIN);
  check(ping?.bridge && ping?.page, `bridge and page script run on the page (${JSON.stringify(ping)})`);
  // waits for the next outcome of the page (each action first clears #out)
  const out = async () => {
    await site.waitForFunction(() => document.querySelector('#out').textContent !== '', null, { timeout: 15000 });
    const text = await site.textContent('#out');
    await site.evaluate(() => { document.querySelector('#out').textContent = ''; });
    return text;
  };

  check(await site.evaluate(() => PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()), 'with a Bitwarden account, OmniVault counts as a platform authenticator');
  // 1. register: dialog → new login in the account
  await site.fill('#user', 'ada');
  await site.click('#register');
  let dialog = await waitFrame(site, 'passkey.html');
  await dialog.waitForSelector('#save');
  check(await dialog.textContent('#title') === 'Passkey speichern?', 'dialog asks to save the passkey');
  check((await dialog.textContent('#detail')).includes('ada'), `dialog names the user (${await dialog.textContent('#detail')})`);
  check(await dialog.$eval('#target', (s) => s.selectedOptions[0].textContent) === 'Neuer Login in Privat', 'default target: new login in the account');
  await site.screenshot({ path: join(shots, 'passkey-create.png') });
  await dialog.click('#save');
  let o = await out();
  check(o === `registriert:ada:${'0'.repeat(32)}`, `site accepted the OmniVault passkey (${o})`);
  check(await gone(site, 'passkey.html'), 'dialog closed');
  let stored = await passkeyItems();
  const ada = stored.find((i) => i.passkeys[0].userName === 'ada');
  check(ada && ada.name === 'Passkey-Testseite' && ada.username === 'ada' && ada.uris[0] === ORIGIN, `saved as a login: ${ada?.name} / ${ada?.username} / ${ada?.uris}`);
  check(ada?.passkeys[0].rpId === 'localhost' && !('keyValue' in ada.passkeys[0]), 'passkey details visible to the interface, private key not');
  check(await site.evaluate(() => window.lastCredential.getClientExtensionResults().credProps?.rk === true), 'credProps: discoverable');

  // 2. sign in with it
  await site.click('#login');
  dialog = await waitFrame(site, 'passkey.html');
  await dialog.waitForSelector('.row');
  check(await dialog.textContent('#title') === 'Mit Passkey anmelden', 'sign-in dialog');
  await site.screenshot({ path: join(shots, 'passkey-get.png') });
  await dialog.click('.row:has-text("ada")');
  o = await out();
  check(o === 'angemeldet:ada', `signed in with the passkey (${o})`);

  // 3. cancel → NotAllowedError, as with the browser's own dialog
  await site.click('#login');
  dialog = await waitFrame(site, 'passkey.html');
  await dialog.click('#cancel');
  o = await out();
  check(o === 'fehler:NotAllowedError', `cancel: ${o}`);

  // 4. the site already has this passkey: excludeCredentials → InvalidStateError
  await site.click('#register');
  dialog = await waitFrame(site, 'passkey.html');
  await dialog.waitForSelector('.hint');
  check((await dialog.textContent('.hint')).includes('schon ein Passkey'), 'dialog says the passkey exists');
  await dialog.click('#cancel');
  o = await out();
  check(o === 'fehler:InvalidStateError', `existing passkey: ${o}`);

  // 5. "other device or the browser": the unchanged request goes to the browser's authenticator
  await site.fill('#user', 'bob');
  await site.click('#register');
  dialog = await waitFrame(site, 'passkey.html');
  await dialog.click('#other');
  o = await out();
  check(o.startsWith('registriert:bob:') && !o.endsWith('0'.repeat(32)), `browser's authenticator registered bob (${o})`);
  await site.click('#login');
  dialog = await waitFrame(site, 'passkey.html');
  await dialog.waitForSelector('.row');
  check((await dialog.$$('.row')).length === 1, 'OmniVault lists only its own passkey');
  await dialog.click('#other');
  o = await out();
  check(o === 'angemeldet:bob', `browser's passkey signs in after "other device" (${o})`);

  // 6. save into an existing login of the site (GitHub/alice matches localhost in the fixture)
  await site.fill('#user', 'alice');
  await site.click('#register');
  dialog = await waitFrame(site, 'passkey.html');
  await dialog.waitForSelector('#save');
  const picked = await dialog.$eval('#target', (s) => s.selectedOptions[0].textContent);
  check(picked.startsWith('„GitHub“ (alice)'), `existing login of this user preselected (${picked})`);
  await dialog.click('#save');
  o = await out();
  check(o.startsWith('registriert:alice:'), `registered into the existing login (${o})`);
  stored = await passkeyItems();
  const gh = stored.find((i) => i.name === 'GitHub');
  check(gh?.passkeys[0].userName === 'alice' && gh.password === 'gh-pass', 'GitHub login keeps its password and has the passkey');

  // 7. conditional: the page asks on load; the OmniVault list in the "username webauthn" field offers the passkeys
  // (the virtual authenticator would answer the browser's half of a conditional request by itself)
  await cdp.send('WebAuthn.setAutomaticPresenceSimulation', { authenticatorId, enabled: false });
  await site.goto(`${ORIGIN}/webauthn.html?conditional`);
  await site.waitForTimeout(500);
  check(await site.textContent('#out') === '', `page waits for a passkey (${await site.textContent('#out')})`);
  await site.click('#user');
  const menu = await waitFrame(site, 'inline-menu.html');
  await menu.waitForSelector('.row');
  const rows = await menu.$$eval('.row strong', (n) => n.map((x) => x.textContent));
  check(rows.includes('ada') && rows.includes('alice'), `field list offers the passkeys (${rows.join(', ')})`);
  check(await site.evaluate(() => document.activeElement?.id) === 'user', 'the field keeps the focus');
  await site.screenshot({ path: join(shots, 'passkey-conditional.png') });
  await menu.click('.row:has-text("alice")');
  o = await out();
  check(o === 'angemeldet:alice:conditional', `signed in from the field list (${o})`);
  check(await gone(site, 'inline-menu.html'), 'list closed');
  await cdp.send('WebAuthn.setAutomaticPresenceSimulation', { authenticatorId, enabled: true });

  // 8. locked: the dialog offers to unlock (the account is known to hold a passkey for this site), then continues
  await msg('lockAll');
  await site.goto(`${ORIGIN}/webauthn.html`);
  await site.click('#login');
  dialog = await waitFrame(site, 'passkey.html');
  await dialog.waitForSelector('#unlock');
  check((await dialog.textContent('.locked p')).includes('Privat'), 'locked account named');
  await site.screenshot({ path: join(shots, 'passkey-locked.png') });
  await msg('login', { id: accountId, credentials: { password: PASSWORD } });
  await dialog.waitForSelector('.row', { timeout: 8000 });
  check(true, 'dialog continues after unlocking');
  await dialog.click('.row:has-text("ada")');
  o = await out();
  check(o === 'angemeldet:ada', `signed in after unlocking (${o})`);

  // 9. the popup shows the passkeys and removes them
  await popup.reload();
  await popup.waitForSelector('#view-main:not([hidden]) .item');
  check(await popup.locator('.item:has-text("GitHub") .pk').count() === 1, 'list marks logins with a passkey');
  await popup.click('.item .name:text-is("GitHub")');
  await popup.waitForSelector('#view-item:not([hidden]) [data-field="Passkey"]');
  const pkText = await popup.textContent('#view-item [data-field="Passkey"] .v');
  check(pkText.includes('alice auf localhost') && pkText.includes('Angelegt:'), `detail shows the passkey (${pkText.replace(/\n/g, ' / ')})`);
  await popup.screenshot({ path: join(shots, 'passkey-detail.png') });
  await popup.click('#view-item button:has-text("Bearbeiten")');
  check((await popup.textContent('#view-edit [data-hint="passkey"]')).includes('localhost'), 'editor says the passkey is kept');
  await popup.click('#view-edit button:has-text("Abbrechen")');
  await popup.click('#view-item [data-field="Passkey"] button');
  await popup.click('#dialog-ok');
  await popup.waitForFunction(() => !document.querySelector('#view-item [data-field="Passkey"]') && !document.querySelector('#view-item').hidden);
  check(true, 'passkey removed from the detail view');
  const gh2 = await msg('item', { accountId, itemId: gh.id });
  check(!gh2.passkeys && gh2.password === 'gh-pass', 'login itself unchanged');
  for (const i of await passkeyItems()) {
    for (const p of i.passkeys.filter((x) => x.rpId === 'localhost')) await msg('removePasskey', { accountId, itemId: i.id, credentialId: p.credentialId });
  }
  const left = (await passkeyItems()).map((i) => `${i.name}:${i.passkeys[0].rpId}`);
  check(left.join() === 'Shop:shop.example.com', `only the fixture passkey left, for another site (${left.join()})`);

  // 10. nothing in OmniVault for the request: no dialog, the browser answers directly
  await site.reload();
  await site.click('#login');
  o = await out();
  check(o === 'angemeldet:bob' && !frameOf(site, 'passkey.html'), `no OmniVault passkey: browser answered without a dialog (${o})`);

  // 11. a page that tampers with nothing it should not see
  check(await site.evaluate(() => { try { return !!document.querySelector('omnivault-passkey')?.shadowRoot; } catch { return true; } }) === false, 'dialog host: closed shadow root');
  check(errors.length === 0, `no script errors${errors.length ? `: ${errors.join(' / ')}` : ''}`);
  check(rp.creds.size === 3, `site knows three passkeys (ada, alice from OmniVault, bob from the browser) (${rp.creds.size})`);
} catch (e) {
  failures++;
  console.log('FAIL', e.stack);
} finally {
  await ctx.close();
  closeServers();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
