// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Account chips, account menu, add/edit form and unlock form.
import { ACCOUNT_HUES, defaultShort } from '../background/accounts.js';
import { ext } from '../lib/browser.js';
import { hostPatterns } from '../providers/hosts.js';
import { openMenu } from './menu.js';
import { requestPermissions } from './resume.js';
import { S, accountOf, providerOf, refresh } from './state.js';
import { $, ask, badge, call, el, icon, show, t, tn, toast } from './ui.js';

const CUSTOM = '__custom';
let formMode = { mode: 'add' };
let unlockAccount = null;
let useApiKey = false;

export function accountStatus(a) {
  if (a.error) return t('Fehler: {error}', { error: a.error });
  if (!a.unlocked) return t('Gesperrt');
  const n = a.itemCount == null ? t('Entsperrt') : tn(a.itemCount, '{n} Eintrag', '{n} Einträge');
  return a.warning ? t('{status} – Hinweis: {warning}', { status: n, warning: a.warning }) : n;
}

export function renderAccounts() {
  $('#accounts').replaceChildren(...S.state.accounts.map((a) => el('li', {},
    el('button', {
      className: `chip${a.unlocked ? '' : ' locked'}`,
      vars: { '--acc-h': a.hue },
      title: `${a.label} – ${accountStatus(a)}`,
      'aria-haspopup': 'menu',
      'data-account': a.id,
      onclick: (e) => accountMenu(a, e.currentTarget),
    },
    badge(a.short, a.hue),
    el('span', { className: 'label' }, a.label),
    a.unlocked
      ? el('span', { className: a.error ? 'dot err' : a.warning ? 'dot warn' : 'dot ok', 'aria-label': accountStatus(a) })
      : el('span', { className: 'state', title: t('Gesperrt'), role: 'img', 'aria-label': t('Gesperrt') }, icon('lock', { size: 13 }))))));
}

function accountMenu(a, anchor) {
  const p = providerOf(a.provider);
  const where = [p?.label, a.server, a.email].filter(Boolean).join(' · ');
  const head = el('div', { className: 'menu-head' },
    el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, badge(a.short, a.hue), el('strong', {}, a.label)),
    el('div', { className: 'sub', title: where }, where),
    el('div', { className: 'sub' }, accountStatus(a)));
  const entries = a.unlocked
    ? [
      { ico: 'sync', text: t('Synchronisieren'), onSelect: async () => {
        const r = await call('sync', { id: a.id });
        const count = tn(r.itemCount, '{n} Eintrag', '{n} Einträge');
        toast(r.error ? t('Fehler: {error}', { error: r.error })
          : r.warning ? t('{account}: {count} (Hinweis: {warning})', { account: a.label, count, warning: r.warning })
            : t('{account}: {count}', { account: a.label, count }));
        await refresh();
      } },
      { ico: 'lock', text: t('Sperren'), onSelect: async () => { await call('lock', { id: a.id }); toast(t('{account} gesperrt', { account: a.label })); await refresh(); } },
    ]
    : [{ ico: 'unlock', text: t('Entsperren'), onSelect: () => openUnlock(a) }];
  openMenu(anchor, [
    ...entries,
    { ico: 'edit', text: t('Bearbeiten'), onSelect: () => openAccountForm({ mode: 'edit', account: a }) },
    'hr',
    { ico: 'trash', text: t('Entfernen …'), danger: true, onSelect: async () => {
      if (!await ask(t('Konto „{account}“ aus OmniVault entfernen? Die Daten beim Anbieter bleiben unberührt.', { account: a.label }), { ok: t('Entfernen'), danger: true })) return;
      await call('removeAccount', { id: a.id });
      toast(t('{account} entfernt', { account: a.label }));
      await refresh();
    } },
  ], head);
}

/* ---------- add / edit account ---------- */

export function openAccountForm(mode) {
  formMode = mode;
  const draft = mode.draft;
  const f = $('#form-account');
  f.reset();
  const editing = mode.mode === 'edit';
  const a = mode.account;
  $('#account-title').textContent = editing ? t('{name} bearbeiten', { name: a.label }) : t('Konto hinzufügen');
  $('#acc-submit').textContent = editing ? t('Speichern') : t('Hinzufügen');
  $('#provider-row').hidden = editing;

  const sel = $('#acc-provider');
  sel.replaceChildren(...S.state.providers.map((p) =>
    el('option', { value: p.id }, p.status === 'ready' ? p.label : t('{provider} (geplant)', { provider: p.label }))));
  sel.value = editing ? a.provider : draft?.provider ?? S.state.providers.find((p) => p.status === 'ready')?.id;

  f.label.value = editing ? a.label : draft?.label ?? '';
  f.short.value = editing ? a.short : draft?.short ?? '';
  const used = new Set(S.state.accounts.map((x) => x.hue));
  const hue = editing ? a.hue : draft?.hue ?? (ACCOUNT_HUES.find((h) => !used.has(h)) ?? ACCOUNT_HUES[0]);
  renderSwatches(hue);
  renderConfigFields(editing ? a.config : draft?.config ?? {});
  $('#acc-warn').hidden = true;
  updatePreview();
  show('account', { restore: () => openAccountForm(mode), keep: true });
  (editing ? f.label : f.querySelector('#acc-fields input, #acc-fields select'))?.focus();
}

function renderSwatches(hue) {
  const f = $('#form-account');
  f.hue.value = hue;
  $('#swatches').replaceChildren(...ACCOUNT_HUES.map((h) => el('button', {
    type: 'button', className: 'swatch', vars: { '--sw': h }, 'aria-label': t('Farbton {n}°', { n: h }),
    'aria-pressed': String(h === Number(hue)),
    onclick: () => { f.hue.value = h; updatePreview(); },
  })));
}

function updatePreview() {
  const f = $('#form-account');
  const hue = Number(f.hue.value);
  const fallbackLabel = f.label.value || f.querySelector('[name=email]')?.value || t('Konto');
  const short = (f.short.value.trim() || defaultShort(fallbackLabel)).toUpperCase().slice(0, 3);
  f.short.placeholder = defaultShort(fallbackLabel);
  const p = $('#acc-preview');
  p.textContent = short;
  p.style.setProperty('--acc-h', hue);
  f.hue.style.setProperty('--acc-h', hue);
  for (const s of $('#swatches').children) s.setAttribute('aria-pressed', String(Number(s.style.getPropertyValue('--sw')) === hue));
  if (formMode.mode === 'edit') {
    const cfg = readConfig();
    $('#acc-warn').hidden = !Object.entries(cfg).some(([k, v]) => (formMode.account.config[k] ?? '') !== v);
  }
}

function fileButton(f, ta) {
  const file = el('input', {
    type: 'file', accept: f.accept ?? '.asc,.txt,.key', hidden: true,
    onchange: async () => { if (file.files[0]) { ta.value = await file.files[0].text(); updatePreview(); } },
  });
  return [el('button', { type: 'button', className: 'secondary', onclick: () => file.click() }, f.fileLabel ?? t('Datei wählen …')), file];
}

function fieldNode(f, value) {
  // URL fields start with the scheme already typed, so the user only adds the host.
  const v = value ?? f.default ?? (f.type === 'url' ? 'https://' : '');
  if (f.type === 'select') {
    const known = f.options.some((o) => o.value === v);
    // The address field only takes part in the form while "custom" is chosen: a hidden type=url input holding the
    // bare prefill "https://" is invalid and would silently block submitting with a preset server.
    const custom = el('input', {
      className: 'custom-server', name: `${f.name}__custom`, type: 'url', placeholder: f.custom?.placeholder, value: known ? '' : v,
    });
    const setCustom = (on) => { custom.hidden = !on; custom.disabled = !on; custom.required = on; };
    const select = el('select', {
      name: f.name,
      onchange: () => {
        setCustom(select.value === CUSTOM);
        if (!custom.hidden) { if (!custom.value) custom.value = 'https://'; custom.focus(); custom.setSelectionRange(custom.value.length, custom.value.length); }
      },
    },
    ...f.options.map((o) => el('option', { value: o.value }, o.label)),
    f.custom ? el('option', { value: CUSTOM }, f.custom.label) : null);
    select.value = known ? v : CUSTOM;
    setCustom(!known);
    return el('label', {}, f.label, select, custom);
  }
  if (f.type === 'keyfile' && formMode.mode === 'edit' && v) {
    // Editing: keep the stored key unless the user explicitly replaces it (keeps the form short).
    const ta = el('textarea', { name: f.name, placeholder: f.placeholder, rows: 4, spellcheck: 'false', 'data-keep-if-empty': '' });
    const replace = el('div', { hidden: true }, ta, el('div', { className: 'file-pick' }, fileButton(f, ta)));
    const stored = el('div', { className: 'stored-key' }, el('span', { className: 'with-icon' }, icon('key', { size: 14 }), t('Schlüssel hinterlegt')),
      el('button', { type: 'button', className: 'link', onclick: () => { stored.hidden = true; replace.hidden = false; ta.focus(); } }, t('Ersetzen …')));
    return [el('label', { style: { marginBottom: '0' } }, f.label), stored, replace];
  }
  if (f.type === 'textarea' || f.type === 'keyfile') {
    const ta = el('textarea', { name: f.name, placeholder: f.placeholder, required: f.required, rows: 4, spellcheck: 'false', value: v });
    const parts = [el('label', {}, f.label, ta)];
    if (f.type === 'keyfile') {
      parts.push(el('div', { className: 'file-pick' }, fileButton(f, ta), f.hint ? el('span', { className: 'hint', style: { margin: 0 } }, f.hint) : null));
    } else if (f.hint) parts.push(el('p', { className: 'hint' }, f.hint));
    return parts;
  }
  const input = el('input', { name: f.name, type: f.type ?? 'text', placeholder: f.placeholder, required: f.required, value: v });
  return f.hint ? [el('label', {}, f.label, input), el('p', { className: 'hint', style: { marginTop: '-6px' } }, f.hint)] : el('label', {}, f.label, input);
}

function renderConfigFields(values = {}) {
  const p = providerOf($('#acc-provider').value);
  $('#acc-note').textContent = p.note ?? '';
  $('#acc-note').hidden = !p.note;
  $('#acc-submit').disabled = p.status !== 'ready';
  $('#acc-fields').replaceChildren(...p.configFields.flatMap((f) => fieldNode(f, values[f.name])));
}

function readConfig() {
  const p = providerOf($('#acc-provider').value);
  const f = $('#form-account');
  const cfg = {};
  for (const field of p.configFields) {
    const input = f.elements[field.name];
    let v = input?.value ?? '';
    if (field.type === 'select' && v === CUSTOM) v = f.elements[`${field.name}__custom`].value;
    if (input?.hasAttribute('data-keep-if-empty') && !v.trim()) continue; // stored key unchanged
    cfg[field.name] = v.trim();
  }
  return cfg;
}

async function submitAccount(ev) {
  ev.preventDefault();
  const f = ev.target;
  const display = { label: f.label.value.trim(), short: f.short.value.trim(), hue: Number(f.hue.value) };
  const config = readConfig();
  const provider = $('#acc-provider').value;
  if (formMode.mode !== 'edit') {
    // Ask for server access / native messaging now, before anything secret is typed: the browser may close the
    // popup for the prompt, and the form comes back from the note left for the next popup.
    const origins = hostPatterns(provider, config);
    const permissions = providerOf(provider)?.optionalPermissions ?? [];
    if ((origins.length || permissions.length)
      && !await requestPermissions({ origins, permissions }, { view: 'account', draft: { provider, config, ...display } })) {
      return toast(t('Ohne diese Berechtigung kann OmniVault das Konto nicht verbinden'));
    }
  }
  return saveAccount(provider, config, display);
}

/** Second half of submitting the form (also run when a reopened popup resumes it). */
async function saveAccount(provider, config, display) {
  if (formMode.mode === 'edit') {
    const r = await call('updateAccount', { id: formMode.account.id, ...display, config });
    await refresh();
    show('main');
    toast(r.locked ? t('Gespeichert – Konto wurde gesperrt') : t('Gespeichert'));
    return;
  }
  const account = await call('addAccount', { provider, config, ...display });
  await refresh();
  openUnlock(accountOf(account.id) ?? { ...account, ...account.config });
}

/* ---------- unlock ---------- */

export function openUnlock(a) {
  unlockAccount = a;
  useApiKey = false;
  const f = $('#form-unlock');
  f.reset();
  const p = providerOf(a.provider);
  $('#unlock-title').replaceChildren(badge(a.short, a.hue), ' ', t('{account} entsperren', { account: a.label }));
  $('#unlock-label').textContent = p?.unlockLabel ?? t('Passwort');
  const noPassword = p?.unlockMode === 'none';
  f.password.closest('label').hidden = noPassword;
  f.password.required = !noPassword;
  $('#unlock-submit').textContent = noPassword ? t('Verbinden') : t('Entsperren');
  $('#unlock-hint')?.remove();
  if (noPassword && p.note) $('#unlock-title').after(el('p', { className: 'hint', id: 'unlock-hint' }, p.note));
  $('#btn-apikey').hidden = !p?.unlockOptions?.includes('apikey');
  $('#unlock-apikey').hidden = true;
  $('#unlock-2fa').hidden = true;
  $('#unlock-device').hidden = true;
  $('#unlock-error').hidden = true;
  show('unlock', { restore: () => openUnlock(a), keep: true });
  (noPassword ? $('#unlock-submit') : f.password).focus();
}

async function submitUnlock(ev, extra = {}) {
  ev?.preventDefault();
  const f = $('#form-unlock');
  const err = $('#unlock-error');
  err.hidden = true;

  // Must run synchronously inside the user gesture (Firefox requirement).
  const origins = hostPatterns(unlockAccount.provider, unlockAccount.config ?? unlockAccount);
  const permissions = providerOf(unlockAccount.provider)?.optionalPermissions ?? [];
  const granted = origins.length || permissions.length
    ? await requestPermissions({ origins, permissions }, { view: 'unlock', accountId: unlockAccount.id }) : true;
  if (!granted) {
    err.textContent = permissions.length && !origins.length
      ? t('Ohne die Berechtigung „Mit kooperierenden nativen Anwendungen kommunizieren“ erreicht OmniVault den lokalen Host nicht.')
      : t('Ohne Zugriff auf den Server kann OmniVault nicht anmelden.');
    err.hidden = false;
    return;
  }

  const credentials = {
    password: f.password.value,
    twoFactorCode: $('#unlock-2fa').hidden ? undefined : f.twoFactorCode.value || undefined,
    twoFactorProvider: $('#unlock-2fa').hidden ? undefined : f.twoFactorProvider.value,
    deviceOtp: $('#unlock-device').hidden ? undefined : f.deviceOtp.value || undefined,
    ...(useApiKey ? { clientId: f.clientId.value.trim(), clientSecret: f.clientSecret.value.trim() } : {}),
    ...extra,
  };

  const btn = $('#unlock-submit');
  btn.disabled = true;
  btn.textContent = t('Entsperre …');
  try {
    const r = await call('login', { id: unlockAccount.id, credentials });
    if (r.status === 'needs_2fa') {
      f.twoFactorProvider.replaceChildren(...r.twoFactorProviders.map((p) => el('option', { value: p.id }, p.label)));
      $('#btn-email-code').hidden = !r.twoFactorProviders.some((p) => p.id === '1');
      $('#unlock-2fa').hidden = false;
      if (extra.requestEmailCode) toast(t('Code wurde gesendet'));
      f.twoFactorCode.focus();
      return;
    }
    if (r.status === 'needs_device_otp') {
      $('#unlock-device').hidden = false;
      f.deviceOtp.focus();
      return;
    }
    toast(r.error ? t('Angemeldet, Sync-Fehler: {error}', { error: r.error }) : tn(r.itemCount, '{n} Eintrag geladen', '{n} Einträge geladen'));
    show('main');
    await refresh();
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = providerOf(unlockAccount.provider)?.unlockMode === 'none' ? t('Verbinden') : t('Entsperren');
  }
}

export function initAccounts() {
  $('#acc-provider').addEventListener('change', () => { renderConfigFields(); updatePreview(); });
  $('#form-account').addEventListener('input', updatePreview);
  $('#form-account').addEventListener('change', updatePreview);
  $('#form-account').addEventListener('submit', (e) => submitAccount(e).catch((x) => toast(x.message)));
  $('#form-unlock').addEventListener('submit', submitUnlock);
  $('#btn-email-code').addEventListener('click', () => {
    $('#form-unlock').twoFactorProvider.value = '1';
    submitUnlock(null, { requestEmailCode: true, twoFactorCode: undefined });
  });
  $('#btn-apikey').addEventListener('click', () => {
    useApiKey = true;
    $('#unlock-apikey').hidden = false;
    $('#btn-apikey').hidden = true;
    $('#form-unlock').clientId.focus();
  });
}

/** Continues where a popup closed by a permission prompt left off. */
export async function resumeAccountStep(r) {
  if (r.view === 'account') {
    openAccountForm({ mode: 'add', draft: r.draft });
    if (r.granted) await saveAccount(r.draft.provider, r.draft.config, { label: r.draft.label, short: r.draft.short, hue: r.draft.hue });
  } else if (r.view === 'unlock' && accountOf(r.accountId)) {
    openUnlock(accountOf(r.accountId));
    if (r.granted) toast(t('Zugriff erteilt – bitte noch einmal entsperren'));
  }
}
