// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Minimal cross-browser shim: Firefox exposes promise-based `browser`,
// Chrome MV3 exposes promise-based `chrome` for the APIs we use.
export const ext = globalThis.browser ?? globalThis.chrome;
