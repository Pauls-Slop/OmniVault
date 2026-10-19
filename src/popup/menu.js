// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Popover menu anchored to a button (keyboard: arrows, Home/End, Esc).
import { $, el, icon, toast } from './ui.js';

const menu = () => $('#menu');

export function closeMenu({ focusAnchor = true } = {}) {
  const m = menu();
  if (m.hidden) return;
  m.hidden = true;
  m.replaceChildren();
  m.anchor?.setAttribute('aria-expanded', 'false');
  if (focusAnchor && m.anchor?.isConnected) m.anchor.focus();
  m.anchor = null;
}

/** entries: [{ ico: icon name, text, onSelect, danger }] | 'hr'; head: optional node */
export function openMenu(anchor, entries, head) {
  const m = menu();
  if (!m.hidden && m.anchor === anchor) return closeMenu();
  closeMenu({ focusAnchor: false });
  const nodes = entries.map((e) => (e === 'hr' ? el('hr') : el('button', {
    role: 'menuitem', type: 'button', className: e.danger ? 'danger' : '', tabindex: '-1',
    onclick: async () => { closeMenu({ focusAnchor: false }); try { await e.onSelect(); } catch (err) { toast(err.message); } },
  }, el('span', { className: 'ico' }, e.ico ? icon(e.ico) : null), el('span', { className: 'txt' }, e.text))));
  m.replaceChildren(...(head ? [head] : []), ...nodes);
  m.anchor = anchor;
  anchor.setAttribute('aria-expanded', 'true');
  m.hidden = false;

  const r = anchor.getBoundingClientRect();
  const mw = m.offsetWidth, mh = m.offsetHeight;
  const left = Math.max(8, Math.min(r.left, window.innerWidth - mw - 8));
  const top = r.bottom + 4 + mh > window.innerHeight ? Math.max(8, r.top - mh - 4) : r.bottom + 4;
  m.style.left = `${left}px`;
  m.style.top = `${top}px`;
  m.querySelector('[role=menuitem]')?.focus();
}

export function initMenu() {
  menu().addEventListener('keydown', (e) => {
    const opts = [...menu().querySelectorAll('[role=menuitem]')];
    const i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
    if (e.key === 'Home') { e.preventDefault(); opts[0].focus(); }
    if (e.key === 'End') { e.preventDefault(); opts.at(-1).focus(); }
    if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeMenu(); }
  });
  document.addEventListener('pointerdown', (e) => {
    const m = menu();
    if (!m.hidden && !m.contains(e.target) && !m.anchor?.contains(e.target)) closeMenu({ focusAnchor: false });
  });
  // The list scrolls inside #content; a menu anchored to a scrolled-away element is closed.
  $('#content').addEventListener('scroll', () => closeMenu({ focusAnchor: false }), { passive: true });
  document.addEventListener('ov:navigate', () => closeMenu({ focusAnchor: false }));
}
