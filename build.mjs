// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Builds dist/chrome and dist/firefox from one source tree.
import * as esbuild from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const base = JSON.parse(await readFile('src/manifest.base.json', 'utf8'));

const targets = {
  chrome: {
    ...base,
    permissions: [...base.permissions, 'offscreen', 'sidePanel'],
    background: { service_worker: 'background.js', type: 'module' },
    side_panel: { default_path: 'sidebar.html' },
  },
  firefox: {
    ...base,
    background: { scripts: ['background.js'], type: 'module' },
    sidebar_action: {
      default_panel: 'sidebar.html', default_title: 'OmniVault', open_at_install: false,
      default_icon: { 16: 'icons/icon16.png', 32: 'icons/icon32.png' },
    },
    browser_specific_settings: {
      gecko: { id: 'omnivault@example.org', strict_min_version: '128.0' },
    },
  },
};

// Imports of vendor/*.mjs are kept as imports of ./vendor/*.mjs next to background.js.
const vendorExternal = {
  name: 'vendor-external',
  setup(b) {
    b.onResolve({ filter: /vendor\/[\w.-]+\.mjs$/ }, (args) => ({
      path: `./vendor/${args.path.split('/').pop()}`, external: true,
    }));
  },
};

/* ---------- manifest texts per language (_locales), from the same catalogs as the interface ---------- */

const LOCALES = { de: null, en: 'en', es: 'es', fr: 'fr', it: 'it', pt_BR: 'pt-BR', zh_CN: 'zh-CN', ja: 'ja' };
const catalogs = Object.fromEntries(await Promise.all(Object.values(LOCALES).filter(Boolean)
  .map(async (code) => [code, JSON.parse(await readFile(`src/i18n/locales/${code}.json`, 'utf8'))])));
const MANIFEST_TEXTS = {
  extDescription: base.description,
  cmdOpen: base.commands._execute_action.description,
  cmdAutofill: base.commands.autofill.description,
};

function localizeManifest(m) {
  const c = structuredClone(m);
  c.default_locale = 'en'; // browsers in a language OmniVault does not offer get English, like the interface
  c.description = '__MSG_extDescription__';
  c.commands._execute_action.description = '__MSG_cmdOpen__';
  c.commands.autofill.description = '__MSG_cmdAutofill__';
  return c;
}

async function writeLocales(out) {
  for (const [dir, code] of Object.entries(LOCALES)) {
    const messages = Object.fromEntries(Object.entries(MANIFEST_TEXTS).map(([key, german]) => {
      const text = code ? catalogs[code][german] : german;
      if (!text) throw new Error(`Übersetzung fehlt (${code}): ${german}`);
      return [key, { message: text }];
    }));
    await mkdir(`${out}/_locales/${dir}`, { recursive: true });
    await writeFile(`${out}/_locales/${dir}/messages.json`, JSON.stringify(messages, null, 2));
  }
}

const entryPointsFor = (name) => ({
  background: 'src/background/index.js',
  popup: 'src/popup/popup.js',
  'inline-menu': 'src/inline/inline-menu.js',
  'save-bar': 'src/inline/save-bar.js',
  passkey: 'src/inline/passkey.js',
  ...(name === 'chrome' ? { offscreen: 'src/offscreen/offscreen.js' } : {}),
});

for (const [name, manifest] of Object.entries(targets)) {
  const out = `dist/${name}`;
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  manifest.version = pkg.version;
  await writeFile(`${out}/manifest.json`, JSON.stringify(localizeManifest(manifest), null, 2));
  await writeLocales(out);
  await cp('src/popup/popup.html', `${out}/popup.html`);
  await cp('src/popup/popup.html', `${out}/sidebar.html`); // same UI, detected by file name
  await cp('src/popup/popup.css', `${out}/popup.css`);
  for (const f of ['inline-menu.html', 'save-bar.html', 'passkey.html', 'inline.css']) await cp(`src/inline/${f}`, `${out}/${f}`);
  if (name === 'chrome') await cp('src/offscreen/offscreen.html', `${out}/offscreen.html`);
  await cp('src/icons', `${out}/icons`, { recursive: true });
  await cp('THIRD_PARTY_NOTICES.md', `${out}/THIRD_PARTY_NOTICES.md`);
  await cp('LICENSE', `${out}/LICENSE`);
  await cp('LICENSES', `${out}/LICENSES`, { recursive: true });
  // Third-party libraries stay separate, unmodified files (OpenPGP.js is LGPL: must be replaceable).
  await mkdir(`${out}/vendor`, { recursive: true });
  for (const f of ['openpgp.mjs', 'argon2id.mjs', 'argon2.mjs', 'noble-ciphers.mjs', 'tweetnacl.mjs']) await cp(`vendor/${f}`, `${out}/vendor/${f}`);

  const opts = {
    plugins: [vendorExternal],
    entryPoints: entryPointsFor(name),
    outdir: out,
    bundle: true,
    format: 'esm',
    target: ['chrome120', 'firefox128'],
    sourcemap: 'linked',
    define: { __BROWSER__: JSON.stringify(name) },
    logLevel: 'info',
  };
  // the content script is a classic script (no modules on web pages)
  const content = {
    ...opts, plugins: [], format: 'iife',
    entryPoints: { inline: 'src/content/inline.js', webauthn: 'src/content/webauthn.js', 'webauthn-page': 'src/content/webauthn-page.js' },
  };
  if (watch) {
    await (await esbuild.context(opts)).watch();
    await (await esbuild.context(content)).watch();
  } else {
    await esbuild.build(opts);
    await esbuild.build(content);
  }
}
