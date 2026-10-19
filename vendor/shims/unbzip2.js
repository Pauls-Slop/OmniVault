// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// BZip2 decompression is deliberately not shipped (rarely used, extra code). OpenPGP.js imports this lazily.
export default function unbzip2Stream() {
  throw new Error('BZip2-komprimierte OpenPGP-Nachrichten werden von OmniVault nicht unterstützt');
}
