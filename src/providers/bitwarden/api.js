// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// HTTP layer for the Bitwarden / Vaultwarden client API.
import { t } from '../../i18n/index.js';
import { b64url, utf8 } from '../../lib/bytes.js';
import { ProviderError } from '../provider.js';

const CLIENT_ID = 'browser';
const CLIENT_VERSION = '2026.10.0';

/* global __BROWSER__ */
const BROWSER = typeof __BROWSER__ !== 'undefined' ? __BROWSER__ : 'chrome';
// Bitwarden DeviceType enum: 2 = ChromeExtension, 3 = FirefoxExtension
export const DEVICE_TYPE = BROWSER === 'firefox' ? 3 : 2;

/** Resolve api/identity base URLs from the configured server. */
export function endpoints(server) {
  const s = (server || 'bitwarden.com').trim().replace(/\/+$/, '');
  if (s === 'bitwarden.com' || s === 'https://vault.bitwarden.com') {
    return { api: 'https://api.bitwarden.com', identity: 'https://identity.bitwarden.com' };
  }
  if (s === 'bitwarden.eu' || s === 'https://vault.bitwarden.eu') {
    return { api: 'https://api.bitwarden.eu', identity: 'https://identity.bitwarden.eu' };
  }
  const base = /^https?:\/\//.test(s) ? s : `https://${s}`;
  return { api: `${base}/api`, identity: `${base}/identity` };
}

/** Recursively lower-case the first letter of every key (server mixes PascalCase/camelCase). */
export function normalizeKeys(v) {
  if (Array.isArray(v)) return v.map(normalizeKeys);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      out[k.charAt(0).toLowerCase() + k.slice(1)] = normalizeKeys(val);
    }
    return out;
  }
  return v;
}

function clientHeaders() {
  return {
    'Bitwarden-Client-Name': CLIENT_ID,
    'Bitwarden-Client-Version': CLIENT_VERSION,
    'Device-Type': String(DEVICE_TYPE),
  };
}

async function request(url, init) {
  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new ProviderError(t('Server nicht erreichbar ({url}): {error}', { url, error: e.message }), 'network');
  }
  if (res.status === 429) {
    throw new ProviderError(t('Zu viele Anfragen – der Server bremst gerade (Rate-Limit). Bitte etwa eine Minute warten.'), 'rate_limited');
  }
  const text = await res.text();
  let body = null;
  try { body = text ? normalizeKeys(JSON.parse(text)) : null; } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, body, text };
}

export async function prelogin(ep, email) {
  const init = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...clientHeaders() },
    body: JSON.stringify({ email }),
  };
  // Newer servers serve prelogin on identity, older Vaultwarden on api.
  let r = await request(`${ep.identity}/accounts/prelogin`, init);
  if (!r.ok && r.status === 404) r = await request(`${ep.api}/accounts/prelogin`, init);
  if (!r.ok) throw new ProviderError(t('Prelogin fehlgeschlagen ({status})', { status: r.status }), 'server');
  return r.body;
}

/**
 * Password grant. Returns { status: 'ok', token } or a challenge.
 */
export async function passwordGrant(ep, { email, hash, deviceId, deviceName, twoFactor, newDeviceOtp }) {
  const form = new URLSearchParams({
    grant_type: 'password',
    username: email,
    password: hash,
    scope: 'api offline_access',
    client_id: CLIENT_ID,
    deviceType: String(DEVICE_TYPE),
    deviceIdentifier: deviceId,
    deviceName,
  });
  if (twoFactor) {
    form.set('twoFactorToken', twoFactor.code);
    form.set('twoFactorProvider', String(twoFactor.provider));
    form.set('twoFactorRemember', '0');
  }
  if (newDeviceOtp) form.set('newDeviceOtp', newDeviceOtp);

  const r = await request(`${ep.identity}/connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Auth-Email': b64url(utf8(email)),
      ...clientHeaders(),
    },
    body: form,
  });
  if (r.ok) return { status: 'ok', token: r.body };

  const b = r.body || {};
  const tfp = b.twoFactorProviders2 || b.twoFactorProviders;
  if (tfp) {
    const ids = Array.isArray(tfp) ? tfp.map(String) : Object.keys(tfp);
    return { status: 'needs_2fa', providers: ids.map(Number) };
  }
  const msg = b.errorModel?.message || b.error_description || b.message || r.text || `HTTP ${r.status}`;
  if (/new device verification/i.test(msg) || /device.*verif/i.test(msg)) {
    return { status: 'needs_device_otp' };
  }
  if (/captcha/i.test(msg)) {
    throw new ProviderError(t('Server verlangt ein Captcha – bitte einmal im Web-Tresor anmelden und erneut versuchen.'), 'captcha');
  }
  if (/username or password/i.test(msg)) {
    throw new ProviderError(t('E-Mail oder Master-Passwort falsch'), 'bad_password');
  }
  throw new ProviderError(t('Anmeldung fehlgeschlagen: {msg}', { msg }), 'server');
}

export async function refreshGrant(ep, refreshToken) {
  const r = await request(`${ep.identity}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8', ...clientHeaders() },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: CLIENT_ID, refresh_token: refreshToken }),
  });
  if (!r.ok) throw new ProviderError(t('Sitzung abgelaufen – bitte neu anmelden'), 'session_expired');
  return r.body;
}

/** Ask the server to e-mail a 2FA code (provider 1). */
export async function sendEmailCode(ep, { email, hash, deviceId }) {
  const r = await request(`${ep.api}/two-factor/send-email-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...clientHeaders() },
    body: JSON.stringify({ email, masterPasswordHash: hash, deviceIdentifier: deviceId }),
  });
  if (!r.ok) throw new ProviderError(t('E-Mail-Code konnte nicht gesendet werden ({status})', { status: r.status }), 'server');
}

export async function sync(ep, accessToken) {
  const r = await request(`${ep.api}/sync?excludeDomains=true`, {
    headers: { Authorization: `Bearer ${accessToken}`, ...clientHeaders() },
  });
  if (r.status === 401) return { unauthorized: true };
  if (!r.ok) throw new ProviderError(t('Sync fehlgeschlagen ({status})', { status: r.status }), 'server');
  return r.body;
}

/**
 * Personal API key login (client_credentials). Works for accounts whose second factor OmniVault cannot
 * handle (FIDO2, Duo) and for SSO users. There is no refresh token: the grant is simply repeated.
 */
export async function apiKeyGrant(ep, { clientId, clientSecret, deviceId, deviceName }) {
  const r = await request(`${ep.identity}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8', ...clientHeaders() },
    body: new URLSearchParams({
      grant_type: 'client_credentials', scope: 'api', client_id: clientId, client_secret: clientSecret,
      deviceType: String(DEVICE_TYPE), deviceIdentifier: deviceId, deviceName,
    }),
  });
  if (r.ok) return r.body;
  const msg = r.body?.errorModel?.message || r.body?.error_description || r.body?.error || `HTTP ${r.status}`;
  throw new ProviderError(/invalid_client/i.test(msg) ? t('client_id oder client_secret falsch') : t('Anmeldung mit API-Schlüssel fehlgeschlagen: {msg}', { msg }), 'bad_password');
}

/**
 * Authorized multipart upload of an encrypted file to the API server (direct uploads, e.g. Vaultwarden and
 * self-hosted Bitwarden). Returns { unauthorized } on 401.
 */
export async function authedUpload(ep, token, path, fileName, bytes) {
  const form = new FormData();
  form.append('data', new Blob([bytes], { type: 'application/octet-stream' }), fileName);
  const r = await request(`${ep.api}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, ...clientHeaders() }, body: form });
  if (r.status === 401) return { unauthorized: true };
  if (!r.ok) {
    const msg = r.body?.message || r.body?.errorModel?.message || r.text || `HTTP ${r.status}`;
    throw new ProviderError(t('Bitwarden: {msg}', { msg }), 'server');
  }
  return { body: r.body };
}

/** Origin pattern of the cloud file storage (Bitwarden.com/.eu keep attachments in Azure Blob Storage). */
export const AZURE_BLOB_ORIGINS = ['https://*.blob.core.windows.net/*'];

/** Uploads an encrypted file to the signed Azure Blob URL the server handed out (single PUT, like the apps). */
export async function azureUpload(url, bytes) {
  const version = new URL(url).searchParams.get('sv') || '2020-04-08';
  let res;
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: { 'x-ms-date': new Date().toUTCString(), 'x-ms-version': version, 'x-ms-blob-type': 'BlockBlob' },
      body: bytes,
    });
  } catch (e) {
    throw new ProviderError(t('Bitwardens Dateispeicher ist nicht erreichbar: {error}', { error: e.message }), 'network');
  }
  if (!res.ok) throw new ProviderError(t('Anhang konnte nicht hochgeladen werden (HTTP {status}).', { status: res.status }), 'server');
}

/** Authorized JSON call against the API server. Returns { unauthorized } on 401. */
export async function authed(ep, token, method, path, body) {
  const r = await request(`${ep.api}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...clientHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) return { unauthorized: true };
  if (!r.ok) {
    const msg = r.body?.message || r.body?.errorModel?.message || r.text || `HTTP ${r.status}`;
    throw new ProviderError(t('Bitwarden: {msg}', { msg }), 'server');
  }
  return { body: r.body };
}
