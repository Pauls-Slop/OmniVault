// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// The browser closes the toolbar popup while it shows a permission prompt, and with it everything typed so far.
// Before asking, the popup notes where it was (storage.session, memory only, never a password); the next time it
// opens it continues there – and finishes the step when the permission was granted.
import { ext } from '../lib/browser.js';

const KEY = 'popupResume';
const MAX_AGE = 10 * 60_000;

/**
 * permissions.request with a note for the next popup. Must be called synchronously in the click handler: the note
 * is written without awaiting it, so the request stays the first await (Firefox needs the user gesture).
 */
export function requestPermissions(permissions, resumeState) {
  ext.storage.session.set({ [KEY]: { ...resumeState, permissions, at: Date.now() } }).catch(() => {});
  return ext.permissions.request(permissions).finally(() => ext.storage.session.remove(KEY).catch(() => {}));
}

/** The note left by a popup that was closed by a permission prompt (removed when read), with `granted`. */
export async function takeResume() {
  const { [KEY]: r } = await ext.storage.session.get(KEY).catch(() => ({}));
  if (!r) return null;
  await ext.storage.session.remove(KEY).catch(() => {});
  if (Date.now() - r.at > MAX_AGE) return null;
  return { ...r, granted: await ext.permissions.contains(r.permissions).catch(() => false) };
}
