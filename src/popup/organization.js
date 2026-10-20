// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Dialog (Bitwarden): move a personal item into an organization and choose its collections.
import { $, call, el, t, toast } from './ui.js';

/** Opens the dialog for one personal item; resolves the moved item, or null if cancelled. */
export async function openMoveToOrganization(item) {
  const orgs = await call('organizations', { accountId: item.accountId });
  if (!orgs.length) { toast(t('Keine Organisation mit einer Sammlung, in die du Einträge legen darfst')); return null; }
  const d = $('#dialog-transfer');
  const orgSel = el('select', { name: 'organization' }, orgs.map((o) => el('option', { value: o.id }, o.name)));
  const boxes = el('fieldset', { className: 'collections' });
  const drawCollections = () => {
    const org = orgs.find((o) => o.id === orgSel.value);
    boxes.replaceChildren(el('legend', {}, t('Sammlungen')), ...org.collections.map((c) => el('label', { className: 'inline-check' },
      el('input', { type: 'checkbox', value: c.id, checked: org.collections.length === 1 }), c.name)));
  };
  orgSel.addEventListener('change', drawCollections);
  drawCollections();
  const err = el('p', { className: 'error', hidden: true });
  const ok = el('button', { type: 'button' }, t('Verschieben'));
  d.replaceChildren(el('div', {},
    el('h3', {}, t('„{name}“ in eine Organisation verschieben', { name: item.name })),
    orgs.length > 1 ? el('label', {}, t('Organisation'), orgSel) : el('p', {}, el('strong', {}, orgs[0].name)),
    boxes,
    el('p', { className: 'hint' }, t('Danach gehört der Eintrag der Organisation: Alle, die Zugriff auf die gewählten Sammlungen haben, sehen ihn. OmniVault kann das nicht rückgängig machen.')),
    err,
    el('div', { className: 'row' }, el('button', { type: 'button', className: 'secondary', onclick: () => d.close('cancel') }, t('Abbrechen')), ok)));

  let moved = null;
  ok.addEventListener('click', async () => {
    const collectionIds = [...boxes.querySelectorAll('input:checked')].map((b) => b.value);
    if (!collectionIds.length) { err.textContent = t('Bitte mindestens eine Sammlung wählen.'); err.hidden = false; return; }
    ok.disabled = true;
    try {
      moved = await call('moveToOrganization', { accountId: item.accountId, itemId: item.id, organizationId: orgSel.value, collectionIds });
      d.close('ok');
    } catch (x) {
      err.textContent = x.message; err.hidden = false; ok.disabled = false;
    }
  });
  d.returnValue = '';
  d.showModal();
  await new Promise((r) => d.addEventListener('close', r, { once: true }));
  return d.returnValue === 'ok' ? moved : null;
}
