// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Interface language. The German source text is the key: t('Konto hinzufügen') returns the text in the current
// language, or the German text when a catalog lacks it. Placeholders are written {name} and filled from `params`.
// Catalogs: src/i18n/locales/<code>.json, { "<German>": "<translation>" }; plural entries are { "one": …, "other": … }.
import { CATALOGS } from './catalogs.js';

/** Selectable languages in their own names (`english` for the settings tooltip and the docs). */
export const LANGUAGES = [
  { code: 'de', name: 'Deutsch', english: 'German' },
  { code: 'en', name: 'English', english: 'English' },
  { code: 'es', name: 'Español', english: 'Spanish' },
  { code: 'fr', name: 'Français', english: 'French' },
  { code: 'it', name: 'Italiano', english: 'Italian' },
  { code: 'pt-BR', name: 'Português (Brasil)', english: 'Portuguese (Brazil)' },
  { code: 'zh-CN', name: '简体中文', english: 'Chinese (Simplified)' },
  { code: 'ja', name: '日本語', english: 'Japanese' },
];
/** Pseudo-language for testing only (not offered in the settings): marks every translated text and makes it longer. */
export const PSEUDO = 'qps';
const CODES = LANGUAGES.map((l) => l.code);

let current = 'de'; // the source language until setLanguage() runs (unit tests rely on German messages)

/**
 * The language to use: the setting when it names a known language, otherwise the first browser language that
 * OmniVault offers (exact, then by base language: pt-PT → pt-BR, zh-TW → zh-CN), otherwise English.
 */
export function resolveLanguage(setting, browserLanguages = []) {
  if (setting === PSEUDO || CODES.includes(setting)) return setting;
  const wanted = (Array.isArray(browserLanguages) ? browserLanguages : [browserLanguages]).filter(Boolean);
  for (const w of wanted) {
    const exact = CODES.find((c) => c.toLowerCase() === w.toLowerCase().replace('_', '-'));
    const base = w.toLowerCase().split(/[-_]/)[0];
    const near = exact ?? CODES.find((c) => c.toLowerCase().split('-')[0] === base);
    if (near) return near;
  }
  return 'en';
}

/** The browser's languages, most important first (UI language, then the preferred content languages). */
export function browserLanguages() {
  const ext = globalThis.browser ?? globalThis.chrome;
  const ui = (() => { try { return ext?.i18n?.getUILanguage?.(); } catch { return null; } })();
  return [ui, ...(globalThis.navigator?.languages ?? []), globalThis.navigator?.language].filter(Boolean);
}

export function setLanguage(code) {
  current = code === PSEUDO || CODES.includes(code) ? code : 'de';
  plural = null;
  if (globalThis.document?.documentElement) {
    document.documentElement.lang = current === PSEUDO ? 'en-XA' : current;
  }
  return current;
}

export const language = () => current;

/** Reads the setting from storage.local and applies it (extension pages; the background passes its settings). */
export async function initLanguage(settings) {
  const ext = globalThis.browser ?? globalThis.chrome;
  const s = settings ?? (await ext.storage.local.get('settings').then((r) => r.settings ?? {}).catch(() => ({})));
  return setLanguage(resolveLanguage(s.language ?? 'auto', browserLanguages()));
}

const fill = (text, params) => (params
  ? text.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined && params[k] !== null ? String(params[k]) : m))
  : text);

/** Pseudo-translation: accented look-alikes, about 40 % longer, in brackets; {placeholders} stay intact. */
// (no ä/ö/ü, so a German text that slips through stays recognizable next to pseudo-translated ones)
const ACCENTS = { a: 'á', e: 'é', i: 'í', o: 'ô', u: 'û', c: 'ç', n: 'ñ', y: 'ý', s: 'š', z: 'ž', A: 'Å', E: 'É', I: 'Î', O: 'Ø', U: 'Û', C: 'Ç', N: 'Ñ', S: 'Š' };
export function pseudo(text) {
  const out = text.split(/(\{\w+\})/).map((part, i) => (i % 2 ? part : part.replace(/[a-zA-Z]/g, (ch) => ACCENTS[ch] ?? ch))).join('');
  const pad = '·'.repeat(Math.max(2, Math.round(text.length * 0.4)));
  return `⟦${out}${pad}⟧`;
}

function lookup(key) {
  if (current === 'de') return key;
  if (current === PSEUDO) return pseudo(key);
  const v = CATALOGS[current]?.[key];
  return typeof v === 'string' && v ? v : key;
}

/** Marks a German text for the catalog extraction without translating it yet (translated later with t()). */
export const mark = (key) => key;
/** Same for a pair of singular and plural, used later as tn(n, ...pair). */
export const markn = (one, other) => [one, other];

/** Translated text with {placeholders} filled. */
export function t(key, params) {
  return fill(lookup(key), params);
}

let plural = null;
/**
 * Count-dependent text: tn(3, '{n} Eintrag', '{n} Einträge'). The German plural form is the catalog key; the entry
 * holds the forms the language needs ({ one, few, many, other }), `other` is the fallback.
 */
export function tn(n, one, other, params) {
  const all = { n, ...params };
  if (current === 'de') return fill(n === 1 ? one : other, all);
  if (current === PSEUDO) return fill(pseudo(n === 1 ? one : other), all);
  const v = CATALOGS[current]?.[other];
  if (!v) return fill(n === 1 ? one : other, all);
  if (typeof v === 'string') return fill(v, all);
  plural ??= new Intl.PluralRules(current);
  return fill(v[plural.select(n)] ?? v.other, all);
}

/**
 * Text with embedded nodes, e.g. tx('Lizenz: {link}', { link: anchor }): returns an array of strings and nodes for
 * append(), so a sentence with a link stays one sentence for the translators.
 */
export function tx(key, nodes = {}) {
  return lookup(key).split(/(\{\w+\})/).filter(Boolean).map((part) => {
    const m = /^\{(\w+)\}$/.exec(part);
    if (!m || !(m[1] in nodes)) return part;
    const v = nodes[m[1]];
    return v === null || v === undefined ? '' : (typeof v === 'object' ? v : String(v));
  });
}

/** Date and time in the interface language. */
export function formatDateTime(value, options = { dateStyle: 'medium', timeStyle: 'short' }) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(current === PSEUDO ? 'en' : current, options).format(d);
}

export function formatNumber(n, options) {
  return new Intl.NumberFormat(current === PSEUDO ? 'en' : current, options).format(n);
}

/** List "a, b und c" in the interface language. */
export function formatList(items, type = 'conjunction') {
  return new Intl.ListFormat(current === PSEUDO ? 'en' : current, { type }).format(items);
}

const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
/**
 * Translates the static text of an HTML page in place: text nodes and the attributes title, aria-label,
 * placeholder and alt. An element with data-i18n="Text mit {0} und {1}" is translated as one sentence; its child
 * elements fill {0}, {1} … in order (and are translated themselves). Elements with translate="no" are left alone.
 */
export function translateDom(root = document.body) {
  const source = current === 'de';
  const walk = (node) => {
    if (source) { // German: only assemble the data-i18n sentences
      if (node.nodeType !== 1) return;
      if (node.hasAttribute('data-i18n')) {
        const kids = [...node.children];
        node.replaceChildren(...tx(node.getAttribute('data-i18n').replace(/\s+/g, ' ').trim(), Object.fromEntries(kids.map((k, i) => [i, k]))));
      } else for (const c of [...node.children]) walk(c);
      return;
    }
    if (node.nodeType === 3) {
      const raw = node.nodeValue;
      const text = raw.replace(/\s+/g, ' ').trim();
      if (text && /\p{L}/u.test(text)) node.nodeValue = raw.replace(raw.trim(), t(text));
      return;
    }
    if (node.nodeType !== 1 || node.getAttribute('translate') === 'no' || ['SCRIPT', 'STYLE', 'CODE', 'svg'].includes(node.nodeName)) return;
    for (const a of ATTRS) if (node.hasAttribute(a) && node.getAttribute(a).trim()) node.setAttribute(a, t(node.getAttribute(a)));
    const sentence = node.getAttribute('data-i18n')?.replace(/\s+/g, ' ').trim();
    if (sentence !== undefined) {
      const kids = [...node.children];
      for (const k of kids) walk(k);
      const nodes = Object.fromEntries(kids.map((k, i) => [i, k]));
      node.replaceChildren(...tx(sentence, nodes));
      return;
    }
    for (const c of [...node.childNodes]) walk(c);
  };
  walk(root);
}
