// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
import { t } from '../i18n/index.js';
/**
 * Contract every password-manager backend implements.
 *
 * A provider is stateless; per-account state lives in two places:
 *  - `config`  (persisted, non-secret): server URL, email, device id …
 *  - `session` (storage.session, RAM only): tokens, decrypted keys
 *
 * @typedef {Object} VaultItem
 * @property {string}   id
 * @property {string}   accountId
 * @property {string}   provider
 * @property {string}   name
 * @property {string}   [username]
 * @property {string}   [password]
 * @property {string[]} uris
 * @property {string}   [totp]
 * @property {string}   [notes]
 * @property {string}   [folder]
 *
 * @typedef {Object} LoginResult
 * @property {'ok'|'needs_2fa'|'needs_device_otp'} status
 * @property {Object}   [session]     session to store when status === 'ok'
 * @property {Object}   [configPatch] persisted config changes (e.g. device id)
 * @property {Array<{id:string,label:string}>} [twoFactorProviders]
 */

export class ProviderError extends Error {
  constructor(message, code = 'error') {
    super(message);
    this.code = code;
  }
}

export class Provider {
  /** Unique id, e.g. "bitwarden". */
  static id = 'abstract';
  /** Human-readable name shown in the UI. */
  static label = 'Abstract';
  /** Fields the "add account" form must render. */
  static configFields = [];
  /** Implementation status shown in the UI: 'ready' | 'planned' | 'readonly'. */
  static status = 'planned';

  /**
   * @param {Object} config
   * @param {Object} credentials  e.g. { password, twoFactorCode, twoFactorProvider }
   * @returns {Promise<LoginResult>}
   */
  static async login(config, credentials) {
    throw new ProviderError(t('{provider}: noch nicht implementiert', { provider: this.label }), 'not_implemented');
  }

  /**
   * Fetch and decrypt the vault.
   * @returns {Promise<{items: VaultItem[], session?: Object}>} a new session if tokens were refreshed
   */
  static async sync(config, session) {
    throw new ProviderError(t('{provider}: noch nicht implementiert', { provider: this.label }), 'not_implemented');
  }
}
