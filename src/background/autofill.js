// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Fills credentials into the active tab. Runs only after an explicit user action in the popup.
import { ext } from '../lib/browser.js';

/** Injected into the page – must be self-contained. */
function fillInPage(username, password) {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.disabled;
  };
  const setValue = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    el.focus();
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const inputs = [...document.querySelectorAll('input')].filter(visible);
  const pw = inputs.find((i) => i.type === 'password');
  const userSel = (i) => ['text', 'email', 'tel', ''].includes(i.type) &&
    /user|mail|login|name|account|ident/i.test(`${i.name} ${i.id} ${i.autocomplete} ${i.placeholder}`);

  let user = null;
  if (pw) {
    const before = inputs.slice(0, inputs.indexOf(pw)).filter((i) => ['text', 'email', 'tel', ''].includes(i.type));
    user = before.reverse().find(userSel) ?? before[0] ?? null;
  } else {
    user = inputs.find(userSel) ?? null; // multi-step login: username page
  }

  let filled = 0;
  if (user && username) { setValue(user, username); filled++; }
  if (pw && password) { setValue(pw, password); filled++; }
  return filled;
}

/**
 * Injected: fills a payment or address form. `values` maps autocomplete tokens (cc-number, given-name …) to
 * values; fields are found by their autocomplete attribute first, then by name/id/label keywords.
 */
function fillFormInPage(values) {
  const HINTS = {
    'cc-name': /card.?holder|name.?on.?card|karteninhaber|ccname/i, 'cc-number': /card.?num|cc.?num|kartennummer|cardnumber/i,
    'cc-exp': /exp(iry|iration)?(.?date)?$|gültig|valid.?thru|mm.?\/?.?(yy|jj)/i, 'cc-exp-month': /exp.*m(onth|m)|monat/i,
    'cc-exp-year': /exp.*y(ear|y)|jahr/i, 'cc-csc': /cvc|cvv|csc|security.?code|prüf/i,
    'given-name': /first.?name|vorname|given/i, 'additional-name': /middle/i, 'family-name': /last.?name|nachname|surname|family/i,
    organization: /company|firma|organi/i, email: /e.?mail/i, tel: /phone|tel/i,
    'address-line1': /street|straße|strasse|address.?1|addr.?line.?1|adresse/i, 'address-line2': /address.?2|line.?2|zusatz/i,
    'postal-code': /zip|postal|plz|postleitzahl/i, 'address-level2': /city|ort|stadt|town/i, 'address-level1': /state|bundesland|region|province/i,
    country: /country|land/i, username: /user.?name|benutzer/i,
  };
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.disabled && !el.readOnly; };
  const fields = [...document.querySelectorAll('input, select')].filter(visible).filter((el) => !['hidden', 'submit', 'button', 'checkbox', 'radio', 'password'].includes(el.type) || /cc-csc|cvc|cvv/i.test(el.autocomplete + el.name + el.id));
  const labelOf = (el) => `${el.name} ${el.id} ${el.placeholder ?? ''} ${el.getAttribute('aria-label') ?? ''} ${el.labels?.[0]?.textContent ?? ''}`;
  const set = (el, v) => {
    if (el instanceof HTMLSelectElement) {
      const opt = [...el.options].find((o) => o.value === v || o.textContent.trim() === v || Number(o.value) === Number(v));
      if (!opt) return false;
      el.value = opt.value;
    } else {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  const used = new Set();
  let filled = 0;
  for (const [token, value] of Object.entries(values)) {
    if (!value) continue;
    const byAuto = fields.find((el) => !used.has(el) && el.autocomplete?.split(/\s+/).includes(token));
    const byName = byAuto ?? fields.find((el) => !used.has(el) && !el.autocomplete?.match(/cc-|name|address|postal|email|tel|country|organization/) && HINTS[token]?.test(labelOf(el)));
    if (byName && set(byName, value)) { used.add(byName); filled++; }
  }
  return filled;
}

/** autocomplete tokens → values of a card or identity item */
function formValues(item) {
  if (item.type === 'card') {
    const c = item.card ?? {};
    const month = String(c.expMonth ?? '').padStart(2, '0');
    const year = String(c.expYear ?? '');
    return {
      'cc-name': c.cardholderName, 'cc-number': c.number?.replace(/\s/g, ''), 'cc-exp-month': c.expMonth ? month : '',
      'cc-exp-year': year, 'cc-exp': c.expMonth && year ? `${month}/${year.slice(-2)}` : '', 'cc-csc': c.code,
    };
  }
  const d = item.identity ?? {};
  return {
    'given-name': d.firstName, 'additional-name': d.middleName, 'family-name': d.lastName, organization: d.company,
    email: d.email, tel: d.phone, 'address-line1': d.address1, 'address-line2': d.address2, 'postal-code': d.postalCode,
    'address-level2': d.city, 'address-level1': d.state, country: d.country, username: d.username,
  };
}

export async function fillActiveTab(tabId, item) {
  const form = item.type === 'card' || item.type === 'identity';
  const results = await ext.scripting.executeScript({
    target: { tabId, allFrames: false },
    func: form ? fillFormInPage : fillInPage,
    args: form ? [formValues(item)] : [item.username ?? '', item.password ?? ''],
  });
  return results?.[0]?.result ?? 0;
}

/** Injected: put a value into the focused input (used by the context menu generator). */
function insertInPage(value) {
  const el = document.activeElement;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
  const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

/** Keeps the last ten generated passwords (RAM only), so the user can still look them up in the generator. */
export async function rememberGenerated(value) {
  const { generated = [] } = await ext.storage.session.get('generated');
  await ext.storage.session.set({ generated: [{ value, at: Date.now() }, ...generated.filter((g) => g.value !== value)].slice(0, 10) });
}

export async function insertIntoFocused(tabId, frameId, value) {
  await rememberGenerated(value);
  const [r] = await ext.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, func: insertInPage, args: [value] });
  return r?.result ?? false;
}
