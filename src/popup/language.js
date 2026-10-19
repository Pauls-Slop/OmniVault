// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Language picker for the settings: a button that opens a grid of languages (listbox, arrow keys in two
// dimensions). "Automatisch" follows the browser language and is the default.
import { LANGUAGES, browserLanguages, language, resolveLanguage } from '../i18n/index.js';
import { el, icon, t } from './ui.js';

const COLUMNS = 2;

/** Name of a language in the current interface language (Intl.DisplayNames), e.g. "Japanisch". */
function localName(code) {
  try { return new Intl.DisplayNames([language()], { type: 'language' }).of(code); } catch { return code; }
}

/**
 * value: 'auto' or a language code. onChange(value) is called after a choice. Returns the label element with the
 * button; the grid is attached to the label so it scrolls with the settings.
 */
export function languagePicker(value, onChange) {
  const auto = resolveLanguage('auto', browserLanguages());
  const nameOf = (code) => LANGUAGES.find((l) => l.code === code)?.name ?? code;
  const choices = [
    { value: 'auto', title: t('Automatisch'), sub: t('Browsersprache: {name}', { name: nameOf(auto) }), wide: true },
    ...LANGUAGES.map((l) => ({ value: l.code, title: l.name, sub: l.code === language() ? '' : localName(l.code), lang: l.code })),
  ];
  const id = `lang-grid-${Math.random().toString(36).slice(2, 8)}`;
  const current = el('span', { className: 'lang-current' });
  const labelId = `${id}-label`;
  current.id = `${id}-current`;
  const button = el('button', {
    type: 'button', className: 'lang-button secondary', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': id,
    'aria-labelledby': `${labelId} ${current.id}`,
  }, icon('globe', { size: 15 }), current, icon('chevronDown', { size: 14 }));
  const options = choices.map((c) => el('div', {
    role: 'option', id: `${id}-${c.value}`, className: c.wide ? 'lang-option wide' : 'lang-option', tabindex: '-1',
    'data-value': c.value, lang: c.lang ?? null, 'aria-selected': String(c.value === value),
  }, el('span', { className: 'lang-title' }, c.title), c.sub ? el('span', { className: 'lang-sub' }, c.sub) : null));
  const grid = el('div', { role: 'listbox', id, className: 'lang-grid', hidden: true, 'aria-label': t('Sprache') }, options);

  const show = (v) => {
    const c = choices.find((x) => x.value === v) ?? choices[0];
    current.replaceChildren(c.value === 'auto' ? t('Automatisch ({name})', { name: nameOf(auto) }) : c.title);
    current.lang = c.lang ?? '';
  };
  show(value);

  const open = () => {
    grid.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    (options.find((o) => o.getAttribute('aria-selected') === 'true') ?? options[0]).focus();
  };
  const close = (focus = true) => {
    grid.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (focus) button.focus();
  };
  const choose = (o) => {
    for (const x of options) x.setAttribute('aria-selected', String(x === o));
    show(o.dataset.value);
    close();
    if (o.dataset.value !== value) { value = o.dataset.value; onChange(value); }
  };

  button.addEventListener('click', () => (grid.hidden ? open() : close()));
  button.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); open(); } });
  grid.addEventListener('click', (e) => { const o = e.target.closest('[role=option]'); if (o) choose(o); });
  grid.addEventListener('keydown', (e) => {
    const i = options.indexOf(document.activeElement);
    // index 0 spans the whole row; the languages follow in rows of COLUMNS
    const move = (to) => { e.preventDefault(); options[Math.max(0, Math.min(options.length - 1, to))].focus(); };
    if (e.key === 'ArrowRight') move(i + 1);
    else if (e.key === 'ArrowLeft') move(i - 1);
    else if (e.key === 'ArrowDown') move(i === 0 ? 1 : i + COLUMNS);
    else if (e.key === 'ArrowUp') move(i <= COLUMNS ? 0 : i - COLUMNS);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(options.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i >= 0) choose(options[i]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') close(false);
  });
  document.addEventListener('pointerdown', (e) => { if (!grid.hidden && !grid.contains(e.target) && !button.contains(e.target)) close(false); });

  return el('div', { className: 'lang-picker' }, el('span', { id: labelId, className: 'lang-label' }, t('Sprache')), button, grid);
}
