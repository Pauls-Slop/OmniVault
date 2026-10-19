// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Password generator view. Settings persist; generated values are kept in RAM only (last 10).
// Passwords are hidden until the user shows them (eye button), also in the list of recent ones.
import { entropyBits, generatePassword, generatePin, strengthLabel } from '../lib/generator.js';
import { S } from './state.js';
import { formatDateTime } from '../i18n/index.js';
import { $, back, call, copy, el, icon, iconButton, show, t } from './ui.js';

const MASK = '••••••••••••';

/** Eye button that shows/hides `target` (value from get()); hidden until the user asks. */
function revealButton(label, render) {
  let shown = false;
  const b = iconButton('eye', t('Anzeigen'), {
    'aria-label': t('{label} anzeigen', { label }), 'aria-pressed': 'false',
    onclick: () => {
      shown = !shown;
      b.setAttribute('aria-pressed', String(shown));
      b.title = shown ? t('Verbergen') : t('Anzeigen');
      b.replaceChildren(icon(shown ? 'eyeOff' : 'eye'));
      render(shown);
    },
  });
  return { button: b, shown: () => shown };
}

export async function openGenerator({ onUse } = {}) {
  const view = $('#view-generator');
  const opts = { ...(S.state.settings?.generator ?? {}) };
  let mode = 'password';
  let value = '';
  const out = el('div', { className: 'gen-out', id: 'gen-out' });
  const reveal = revealButton(t('Passwort'), (shown) => { out.textContent = shown ? value : MASK; });
  const meter = el('div', { className: 'meter' }, el('div'));
  const info = el('div', { className: 'hint' });
  const lenLabel = el('span');
  const len = el('input', { type: 'range', min: '4', max: '64', value: String(opts.length ?? 20), 'aria-label': t('Länge') });
  const box = (key, label) => el('label', {}, el('input', { type: 'checkbox', checked: opts[key] !== false && !!opts[key], 'data-opt': key }), label);
  const checks = el('div', { className: 'checks' },
    box('upper', 'A–Z'), box('lower', 'a–z'), box('digits', '0–9'), box('symbols', '!@#$…'), box('avoidAmbiguous', t('ohne I l 1 O 0')));
  const modeSel = el('select', { 'aria-label': t('Art') }, el('option', { value: 'password' }, t('Passwort')), el('option', { value: 'pin' }, t('PIN')));
  const historyBox = el('details', { className: 'history' });

  const regenerate = () => {
    opts.length = Number(len.value);
    for (const c of checks.querySelectorAll('[data-opt]')) opts[c.dataset.opt] = c.checked;
    try {
      value = mode === 'pin' ? generatePin(Math.min(opts.length, 12)) : generatePassword(opts);
    } catch (e) { value = ''; out.textContent = e.message; return; }
    out.textContent = reveal.shown() ? value : MASK;
    out.dataset.length = String(value.length);
    const bits = mode === 'pin' ? Math.floor(Math.min(opts.length, 12) * Math.log2(10)) : entropyBits(opts);
    meter.firstChild.style.width = `${Math.min(100, bits)}%`;
    info.textContent = t('≈ {bits} Bit – {strength}', { bits, strength: strengthLabel(bits) });
    lenLabel.textContent = t('Länge: {n}', { n: mode === 'pin' ? Math.min(opts.length, 12) : opts.length });
    checks.hidden = mode === 'pin';
  };
  const persist = () => call('setSettings', { patch: { generator: { ...opts } } }).then((s) => { S.state.settings = s; }).catch(() => {});
  len.addEventListener('input', () => { regenerate(); });
  len.addEventListener('change', persist);
  checks.addEventListener('change', () => { regenerate(); persist(); });
  modeSel.addEventListener('change', () => { mode = modeSel.value; regenerate(); });

  const renderHistory = async () => {
    const list = await call('generated').catch(() => []);
    historyBox.hidden = !list.length;
    historyBox.replaceChildren(el('summary', {}, t('Zuletzt erzeugt ({n}, nur bis zum Schließen des Browsers)', { n: list.length })),
      el('div', { className: 'fields' }, list.map((g) => {
        const v = el('div', { className: 'v' }, MASK);
        const r = revealButton(t('Passwort'), (shown) => { v.textContent = shown ? g.value : MASK; });
        return el('div', { className: 'field' },
          el('span', { className: 'k' }, formatDateTime(g.at, { timeStyle: 'medium' })), v,
          el('div', { className: 'tools' }, r.button, iconButton('copy', t('Kopieren'), { onclick: () => copy(g.value, t('Passwort')) })));
      })));
  };
  const remember = async () => { await call('rememberGenerated', { value }); renderHistory(); };

  view.replaceChildren(
    el('h2', {}, t('Passwortgenerator')),
    el('div', { className: 'gen-row' }, out, reveal.button), meter, info,
    el('div', { className: 'two', style: { gridTemplateColumns: '1fr auto', alignItems: 'end', margin: '8px 0' } },
      el('label', { style: { margin: 0 } }, lenLabel, len), el('label', { style: { margin: 0 } }, t('Art'), modeSel)),
    checks,
    historyBox,
    el('div', { className: 'row actions' },
      el('button', { type: 'button', className: 'secondary', onclick: () => back() }, t('Zurück')),
      el('button', { type: 'button', className: 'secondary', onclick: regenerate }, t('Neu erzeugen')),
      el('button', { type: 'button', className: onUse ? 'secondary' : '', onclick: async () => { await copy(value, t('Passwort')); remember(); } }, t('Kopieren')),
      onUse ? el('button', { type: 'button', onclick: async () => { await remember(); onUse(value); } }, t('Übernehmen')) : null));
  regenerate();
  renderHistory();
  show('generator', { restore: () => openGenerator({ onUse }) });
}
