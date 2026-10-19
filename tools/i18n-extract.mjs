// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Collects every German source text the interface uses: t('…'), tx('…'), mark('…'), tn(n, '…', '…'),
// markn('…', '…'), the static HTML pages (text, title, aria-label, placeholder, alt, data-i18n) and the manifest.
// Usage: node tools/i18n-extract.mjs [--json]   (prints the keys; the tests use extractKeys()).
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const STR = String.raw`'((?:[^'\\\n]|\\.)*)'`;
const unescape = (s) => s.replace(/\\(.)/g, '$1');

async function* files(dir, ext) {
  for (const e of await readdir(join(ROOT, dir), { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!p.startsWith(join('src', 'i18n', 'locales'))) yield* files(p, ext); } else if (ext.some((x) => e.name.endsWith(x))) yield p;
  }
}

/** Keys of one JavaScript source: Map key → { plural: one-form | null }. */
export function keysOfScript(src) {
  const out = new Map();
  const code = src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of code.matchAll(new RegExp(String.raw`\b(?:t|tx|mark)\(\s*${STR}`, 'g'))) out.set(unescape(m[1]), { plural: null });
  for (const m of code.matchAll(new RegExp(String.raw`\bmarkn\(\s*${STR}\s*,\s*${STR}`, 'g'))) out.set(unescape(m[2]), { plural: unescape(m[1]) });
  for (const m of code.matchAll(/\btn\(/g)) {
    const rest = code.slice(m.index + 3);
    const pair = new RegExp(String.raw`${STR}\s*,\s*${STR}`).exec(rest);
    const spread = rest.indexOf('...');
    const close = rest.indexOf(');');
    if (!pair || (spread >= 0 && spread < pair.index) || (close >= 0 && close < pair.index)) continue;
    out.set(unescape(pair[2]), { plural: unescape(pair[1]) });
  }
  return out;
}

const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
const VOID = new Set(['input', 'img', 'meta', 'link', 'br', 'hr', 'source']);
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** Keys of a static HTML page, mirroring translateDom() in src/i18n/index.js. */
export function keysOfHtml(html) {
  const out = new Map();
  const body = html.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<body[^>]*>/, '').replace(/<script[\s\S]*?<\/script>/g, '');
  const stack = []; // { tag, skip, sentence }
  const skipping = () => stack.some((s) => s.skip);
  const inSentence = () => stack.length && stack.at(-1).sentence;
  for (const m of body.matchAll(/<(\/?)([a-zA-Z0-9-]+)([^>]*?)(\/?)>|([^<]+)/g)) {
    if (m[5] !== undefined) {
      const text = decode(m[5]).replace(/\s+/g, ' ').trim();
      if (text && /\p{L}/u.test(text) && !skipping() && !inSentence()) out.set(text, { plural: null });
      continue;
    }
    const [, closing, tag, attrs, selfClose] = m;
    if (closing) { while (stack.length && stack.pop().tag !== tag); continue; }
    const attr = (n) => new RegExp(String.raw`\s${n}="([^"]*)"`).exec(attrs)?.[1];
    const skip = attr('translate') === 'no' || ['code', 'svg', 'style'].includes(tag.toLowerCase());
    if (!skip && !skipping()) {
      for (const a of ATTRS) { const v = attr(a); if (v && v.trim()) out.set(decode(v), { plural: null }); }
      const s = attr('data-i18n');
      if (s) out.set(decode(s).replace(/\s+/g, ' ').trim(), { plural: null });
    }
    if (!VOID.has(tag.toLowerCase()) && !selfClose) stack.push({ tag, skip, sentence: attr('data-i18n') !== undefined });
  }
  return out;
}

/** All keys: Map key → { plural, files: [...] }. */
export async function extractKeys() {
  const all = new Map();
  const add = (keys, file) => {
    for (const [k, v] of keys) {
      const e = all.get(k) ?? { plural: v.plural, files: [] };
      if (v.plural && !e.plural) e.plural = v.plural;
      e.files.push(file);
      all.set(k, e);
    }
  };
  for await (const f of files('src', ['.js'])) add(keysOfScript(await readFile(join(ROOT, f), 'utf8')), f);
  for await (const f of files('src', ['.html'])) if (!f.includes('offscreen')) add(keysOfHtml(await readFile(join(ROOT, f), 'utf8')), f);
  const manifest = JSON.parse(await readFile(join(ROOT, 'src/manifest.base.json'), 'utf8'));
  add(new Map([manifest.description, manifest.commands._execute_action.description, manifest.commands.autofill.description]
    .map((k) => [k, { plural: null }])), 'src/manifest.base.json');
  return all;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const keys = await extractKeys();
  if (process.argv.includes('--json')) console.log(JSON.stringify(Object.fromEntries([...keys].map(([k, v]) => [k, v.plural])), null, 2));
  else for (const [k, v] of keys) console.log(v.plural ? `${k}   [Plural; Singular: ${v.plural}]` : k);
}
