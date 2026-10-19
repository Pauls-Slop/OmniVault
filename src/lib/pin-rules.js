// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// What a PIN must look like – shared by the settings (checked while typing) and the PIN lock (checked again).
// Four digits are enough: the PIN only opens sessions sealed in memory, five wrong tries discard them, and after a
// browser restart the master password is needed anyway.
export const PIN_MIN = 4;
export const PIN_MAX = 12;

export function validPin(pin) {
  return new RegExp(`^\\d{${PIN_MIN},${PIN_MAX}}$`).test(String(pin ?? ''));
}
