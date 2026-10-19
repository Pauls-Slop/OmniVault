// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// OmniVault's own line icons (24 × 24 grid, 1.75 stroke, round joins, currentColor). Drawn for this project
// instead of emoji, which render differently on every system.

const NS = 'http://www.w3.org/2000/svg';
const R = 'a1 1 0 0 1'; // rounded corner helper used in the paths below

/** name → { d: stroke path, c: stroked circles [cx, cy, r], f: filled circles, fill: fill the path } */
const ICONS = {
  plus: { d: 'M12 5v14M5 12h14' },
  tools: { d: `M3 9h18v10${R}-1 1H4${R}-1-1zM8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3M3 13h18M10 13v2h4v-2` },
  dice: { d: 'M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z', f: [[8.5, 8.5, 1.3], [15.5, 8.5, 1.3], [12, 12, 1.3], [8.5, 15.5, 1.3], [15.5, 15.5, 1.3]] },
  lock: { d: `M6 11h12${R} 1 1v8${R}-1 1H6${R}-1-1v-8${R} 1-1zM8 11V8a4 4 0 0 1 8 0v3` },
  unlock: { d: `M6 11h12${R} 1 1v8${R}-1 1H6${R}-1-1v-8${R} 1-1zM8 11V8a4 4 0 0 1 7.6-1.7` },
  sidebar: { d: `M4 4h16${R} 1 1v14${R}-1 1H4${R}-1-1V5${R} 1-1zM15 4v16` },
  window: { d: 'M8 8h12v12H8zM4 16V4h12' },
  settings: { d: 'M4 7h9M18 7h2M4 17h3M12 17h8', c: [[15.5, 7, 2.3], [9.5, 17, 2.3]] },
  copy: { d: `M9 9h10${R} 1 1v10${R}-1 1H9${R}-1-1V10${R} 1-1zM5 15H4${R}-1-1V4${R} 1-1h10${R} 1 1v1` },
  eye: { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', c: [[12, 12, 3]] },
  eyeOff: { d: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2' },
  external: { d: `M14 4h6v6M20 4l-9 9M19 14v5${R}-1 1H5${R}-1-1V6${R} 1-1h5` },
  star: { d: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z' },
  starFilled: { d: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z', fill: true },
  transfer: { d: 'M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4' },
  trash: { d: `M4 7h16M10 11v6M14 11v6M6 7l1 12${R} 1 1h8${R} 1-1l1-12M9 7V4h6v3` },
  edit: { d: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4' },
  sync: { d: 'M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2' },
  key: { d: 'M10.8 12.2L20 3M16.5 6.5l3 3M14.5 8.5l2 2', c: [[7.5, 15.5, 4.5]] },
  note: { d: `M6 3h9l4 4v13${R}-1 1H6${R}-1-1V4${R} 1-1zM15 3v4h4M8 12h8M8 16h5` },
  card: { d: `M4 6h16${R} 1 1v10${R}-1 1H4${R}-1-1V7${R} 1-1zM3 10h18M7 15h4` },
  identity: { d: `M4 5h16${R} 1 1v12${R}-1 1H4${R}-1-1V6${R} 1-1zM5.6 16.5c.8-1.5 2-2.2 3.4-2.2s2.6.7 3.4 2.2M15 10h3.5M15 14h3.5`, c: [[9, 10.7, 2.1]] },
  terminal: { d: `M4 5h16${R} 1 1v12${R}-1 1H4${R}-1-1V6${R} 1-1zM7.5 10l3 2-3 2M13 15h4` },
  user: { d: 'M4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5', c: [[12, 8.5, 4]] },
  x: { d: 'M6 6l12 12M18 6L6 18' },
  download: { d: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14' },
  dot: { f: [[12, 12, 2.5]] },
  chevronDown: { d: 'M6 9l6 6 6-6' },
  passkey: { d: 'M3 20v-1a5 5 0 0 1 5-5h2.5M17 12.5V21l1.5-1.5L17 18l1.5-1.5L17 15', c: [[9.5, 7.5, 3.5], [17, 10.5, 2]] },
  chevronLeft: { d: 'M15 6l-6 6 6 6' },
  chevronRight: { d: 'M9 6l6 6-6 6' },
  globe: { d: 'M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z', c: [[12, 12, 9]] },
};

/** An inline SVG icon; decorative (aria-hidden) – the surrounding button carries the accessible name. */
export function icon(name, { size = 16, className = 'icon-svg' } = {}) {
  const spec = ICONS[name] ?? ICONS.dot;
  const svg = document.createElementNS(NS, 'svg');
  for (const [k, v] of Object.entries({
    viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.75,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: className,
  })) svg.setAttribute(k, v);
  if (spec.d) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', spec.d);
    if (spec.fill) p.setAttribute('fill', 'currentColor');
    svg.append(p);
  }
  for (const [cx, cy, r] of spec.c ?? []) svg.append(circle(cx, cy, r, false));
  for (const [cx, cy, r] of spec.f ?? []) svg.append(circle(cx, cy, r, true));
  return svg;
}

function circle(cx, cy, r, filled) {
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
  if (filled) { c.setAttribute('fill', 'currentColor'); c.setAttribute('stroke', 'none'); }
  return c;
}

const TYPE = { login: 'key', note: 'note', card: 'card', identity: 'identity', ssh: 'terminal' };
/** Icon for an item type (login, note, card, identity, ssh, other). */
export const typeIcon = (type, opts) => icon(TYPE[type] ?? 'dot', opts);

/** Replaces the content of every element with data-icon="name" by that icon (for static markup). */
export function hydrateIcons(root = document) {
  for (const n of root.querySelectorAll('[data-icon]')) n.replaceChildren(icon(n.dataset.icon));
}
