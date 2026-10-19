// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Builds vendor/noble-ciphers.mjs (MIT) from the noble-ciphers sources pinned in vendor/sources.json: only
// XChaCha20-Poly1305, which WebCrypto lacks and Bitwarden's encryption v2 uses for older envelopes.
// Runs as part of vendor/build.mjs; alone (no clang needed): node vendor/build-noble.mjs
import * as esbuild from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const s = JSON.parse(readFileSync(join(here, 'sources.json'), 'utf8'))['noble-ciphers'];
const src = join(here, 'src/noble-ciphers/src');
await esbuild.build({
  stdin: { contents: `export { xchacha20poly1305 } from ${JSON.stringify(join(src, 'chacha.ts'))};`, resolveDir: src, loader: 'js' },
  bundle: true, format: 'esm', platform: 'browser', target: ['chrome120', 'firefox128'], legalComments: 'inline', logLevel: 'warning',
  tsconfigRaw: { compilerOptions: { useDefineForClassFields: false } },
  outfile: join(here, 'noble-ciphers.mjs'),
  banner: { js: `/*! @noble/ciphers ${s.ref} – MIT, see LICENSES/noble-ciphers-MIT.txt. Unmodified sources (only xchacha20poly1305 exported), built from ${s.repo} ${s.commit.slice(0, 12)}. */` },
});
console.log('vendor/noble-ciphers.mjs written');
