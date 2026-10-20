// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Builds vendor/noble-ciphers.mjs (MIT) from the noble-ciphers sources pinned in vendor/sources.json, exporting only
// what WebCrypto lacks: XChaCha20-Poly1305 (Bitwarden encryption v2), ChaCha20 and Salsa20 (KeePass .kdbx).
// Runs as part of vendor/build.mjs; alone (no clang needed): node vendor/build-noble.mjs
import * as esbuild from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ciphers = join(here, 'src/noble-ciphers/src');
const c = JSON.parse(readFileSync(join(here, 'sources.json'), 'utf8'))['noble-ciphers'];
await esbuild.build({
  bundle: true, format: 'esm', platform: 'browser', target: ['chrome120', 'firefox128'], legalComments: 'inline', logLevel: 'warning',
  tsconfigRaw: { compilerOptions: { useDefineForClassFields: false } },
  stdin: {
    contents: `export { xchacha20poly1305, chacha20 } from ${JSON.stringify(join(ciphers, 'chacha.ts'))};\n`
      + `export { salsa20 } from ${JSON.stringify(join(ciphers, 'salsa.ts'))};`,
    resolveDir: ciphers, loader: 'js',
  },
  outfile: join(here, 'noble-ciphers.mjs'),
  banner: { js: `/*! @noble/ciphers ${c.ref} – MIT, see LICENSES/noble-ciphers-MIT.txt. Unmodified sources (only xchacha20poly1305, chacha20 and salsa20 exported), built from ${c.repo} ${c.commit.slice(0, 12)}. */` },
});
console.log('vendor/noble-ciphers.mjs written');

