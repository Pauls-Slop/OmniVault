// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Language QA without a browser: catalogs against the texts the code uses, placeholders, plural forms, leftovers of
// German, texts that bypass t(), language selection and formatting.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { CATALOGS } from '../src/i18n/catalogs.js';
import { LANGUAGES, PSEUDO, formatDateTime, pseudo, resolveLanguage, setLanguage, t, tn, tx } from '../src/i18n/index.js';
import { extractKeys } from '../tools/i18n-extract.mjs';

const keys = await extractKeys();
const placeholders = (s) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();
const GERMAN = /[äöüÄÖÜß]|\b(und|nicht|oder|mit|für|wird|werden|kein|keine|bitte|Bitte|eine?)\b/;

test('every offered language except German has a catalog, and only those', () => {
  assert.deepEqual(Object.keys(CATALOGS).sort(), LANGUAGES.map((l) => l.code).filter((c) => c !== 'de').sort());
});

test('the extraction finds the interface texts', () => {
  assert.ok(keys.size > 500, `${keys.size} keys`);
  for (const k of ['Konto hinzufügen', 'Einstellungen', 'Sprache', 'Login speichern?', 'Mit OmniVault ausfüllen']) assert.ok(keys.has(k), k);
  assert.equal(keys.get('{n} Einträge').plural, '{n} Eintrag');
});

for (const { code } of LANGUAGES.filter((l) => l.code !== 'de')) {
  const cat = CATALOGS[code];
  const rules = new Intl.PluralRules(code).resolvedOptions().pluralCategories;

  test(`${code}: complete – every text the code uses is translated`, () => {
    const missing = [...keys.keys()].filter((k) => !cat[k]);
    assert.deepEqual(missing, []);
  });

  test(`${code}: no stale entries for texts the code no longer uses`, () => {
    assert.deepEqual(Object.keys(cat).filter((k) => !keys.has(k)), []);
  });

  test(`${code}: placeholders and plural forms match`, () => {
    const problems = [];
    for (const [k, { plural }] of keys) {
      const v = cat[k];
      if (!v) continue;
      if (plural) {
        if (typeof v !== 'object' || !v.other) { problems.push(`plural expected: ${k}`); continue; }
        for (const [form, text] of Object.entries(v)) {
          if (!rules.includes(form)) problems.push(`form "${form}" unknown in ${code}: ${k}`);
          if (placeholders(text).join() !== placeholders(k).join()) problems.push(`placeholders [${form}]: ${text}`);
        }
        if (rules.includes('one') && !v.one) problems.push(`"one" missing: ${k}`);
      } else {
        if (typeof v !== 'string') { problems.push(`string expected: ${k}`); continue; }
        if (placeholders(v).join() !== placeholders(k).join()) problems.push(`placeholders: ${v}`);
      }
    }
    assert.deepEqual(problems, []);
  });

  test(`${code}: same shape as the German text (catches entries that slipped to the wrong key)`, () => {
    const shape = (s) => [s.trimEnd().endsWith('…'), /[?？]/.test(s), /[:：]$/.test(s.trimEnd()), s.startsWith('–'), s.startsWith('+')].join();
    const off = [];
    for (const [k, v] of Object.entries(cat)) {
      for (const text of typeof v === 'string' ? [v] : Object.values(v)) if (shape(text) !== shape(k)) off.push(`${k} → ${text}`);
    }
    assert.deepEqual(off, []);
  });

  test(`${code}: nothing left in German, no markup`, () => {
    const values = Object.entries(cat).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : Object.values(v).map((x) => [k, x])));
    assert.deepEqual(values.filter(([k, v]) => v === k && GERMAN.test(k)).map(([k]) => k), [], 'copied from German');
    assert.deepEqual(values.filter(([, v]) => /[äöÄÖß]/.test(v)).map(([, v]) => v), [], 'German letters');
    assert.deepEqual(values.filter(([, v]) => /<\/?[a-z]/i.test(v) && !/<(gpg-id|E-Mail|email|e-mail|correo|メールアドレス|电子邮件)>/.test(v)).map(([, v]) => v), [], 'markup');
  });
}

test('texts in the code go through t(): no German string literal outside the translation functions', async () => {
  const offenders = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (!p.includes(join('src', 'i18n'))) await walk(p); continue; }
      if (!p.endsWith('.js') || p.endsWith('sample-identity.js')) continue;
      const lines = (await readFile(p, 'utf8')).split('\n');
      lines.forEach((line, i) => {
        const l = line.trim();
        if (/^(\/\/|\/\*|\*)/.test(l) || /console\.(warn|log|error)|justification:/.test(l)) return;
        if (/\b(tn|markn)\([^;]*,\s*$/.test(lines[i - 1] ?? '')) return; // second argument of tn() on its own line
        for (const m of line.matchAll(/(?<![\w$])'((?:[^'\\\n]|\\.)*)'/g)) {
          if (!/[äöüÄÖÜß„“]/.test(m[1])) continue;
          const before = line.slice(0, m.index);
          if (/\b(t|tx|mark)\(\s*$/.test(before) || /\b(tn|markn)\([^;]*$/.test(before)) continue;
          offenders.push(`${p}:${i + 1}: ${m[1]}`);
        }
      });
    }
  };
  await walk('src');
  assert.deepEqual(offenders, []);
});

test('static pages: data-i18n sentences have one placeholder per child element', async () => {
  const html = await readFile('src/popup/popup.html', 'utf8');
  for (const m of html.matchAll(/<(\w+)[^>]*data-i18n="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/g)) {
    const children = (m[3].match(/<(a|code|strong|span)\b/g) ?? []).length;
    assert.equal(placeholders(m[2]).length, children, m[2]);
  }
});

test('browser language decides by default; the setting wins', () => {
  assert.equal(resolveLanguage('auto', ['de-DE', 'en']), 'de');
  assert.equal(resolveLanguage('auto', ['fr-CA']), 'fr');
  assert.equal(resolveLanguage('auto', ['pt-PT', 'en']), 'pt-BR', 'first preference wins, by base language');
  assert.equal(resolveLanguage('auto', ['zh-TW']), 'zh-CN');
  assert.equal(resolveLanguage('auto', ['ko', 'nl']), 'en', 'unknown languages fall back to English');
  assert.equal(resolveLanguage('auto', ['ko', 'ja-JP']), 'ja');
  assert.equal(resolveLanguage(undefined, []), 'en');
  assert.equal(resolveLanguage('it', ['de-DE']), 'it');
  assert.equal(resolveLanguage('xx', ['es-MX']), 'es', 'an unknown setting counts as automatic');
});

test('t, tn and tx: translation, placeholders, plural rules, fallback to German', () => {
  try {
    setLanguage('en');
    assert.equal(t('Konto hinzufügen'), 'Add account');
    assert.equal(t('{account} entsperren', { account: 'Privat' }), 'Unlock Privat');
    assert.equal(t('Nicht im Katalog'), 'Nicht im Katalog', 'unknown text stays German');
    assert.equal(tn(1, '{n} Eintrag', '{n} Einträge'), '1 item');
    assert.equal(tn(5, '{n} Eintrag', '{n} Einträge'), '5 items');
    setLanguage('fr');
    assert.equal(tn(0, '{n} Eintrag', '{n} Einträge'), '0 élément', 'French: 0 is singular');
    setLanguage('ja');
    assert.equal(tn(1, '{n} Eintrag', '{n} Einträge'), '1 件');
    setLanguage('de');
    assert.equal(tn(1, '{n} Konto entsperrt', '{n} Konten entsperrt'), '1 Konto entsperrt');
    const parts = tx('OmniVault öffnen: {key}', { key: { nodeType: 1 } });
    assert.equal(parts.length, 2);
    assert.equal(parts[0], 'OmniVault öffnen: ');
  } finally { setLanguage('de'); }
});

test('pseudo language marks every text and keeps placeholders', () => {
  try {
    setLanguage(PSEUDO);
    const out = t('{account} entsperren', { account: 'Privat' });
    assert.match(out, /^⟦Privat éñ.*·+⟧$/);
    assert.ok(pseudo('Speichern').length > 'Speichern'.length * 1.3);
  } finally { setLanguage('de'); }
});

test('dates follow the interface language', () => {
  const d = Date.UTC(2026, 9, 14, 12, 0);
  try {
    setLanguage('de');
    assert.match(formatDateTime(d, { dateStyle: 'medium', timeZone: 'UTC' }), /14\.10\.2026/);
    setLanguage('en');
    assert.match(formatDateTime(d, { dateStyle: 'medium', timeZone: 'UTC' }), /Oct 14, 2026/);
    setLanguage('ja');
    assert.match(formatDateTime(d, { dateStyle: 'medium', timeZone: 'UTC' }), /2026\/10\/14/);
  } finally { setLanguage('de'); }
});
