// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Builds vendor/tweetnacl.mjs (Unlicense) from TweetNaCl.js 1.0.3 as pinned in vendor/sources.json: NaCl box
// (X25519 + XSalsa20-Poly1305), which the KeePassXC browser protocol uses. The source file is bundled unchanged
// as an ES module with a default export (its Node fallback require('crypto') is served by WebCrypto). Runs as part of vendor/build.mjs; alone: node vendor/build-tweetnacl.mjs
import * as esbuild from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const s = JSON.parse(readFileSync(join(here, 'sources.json'), 'utf8'))['tweetnacl-upstream'];
const src = join(here, 'src/tweetnacl-upstream');
await esbuild.build({
  stdin: { contents: `import nacl from ${JSON.stringify(join(src, 'nacl-fast.js'))};\nexport default nacl;`, resolveDir: src, loader: 'js' },
  bundle: true, format: 'esm', platform: 'browser', target: ['chrome120', 'firefox128'], legalComments: 'inline', logLevel: 'warning',
  // nacl-fast.js takes its PRNG from self.crypto and only without `self` (Node) from require('crypto'):
  // that require is answered with WebCrypto, so the bundle needs no Node module
  plugins: [{
    name: 'crypto-shim',
    setup(b) {
      b.onResolve({ filter: /^crypto$/ }, () => ({ path: 'crypto', namespace: 'crypto-shim' }));
      b.onLoad({ filter: /.*/, namespace: 'crypto-shim' }, () => ({
        contents: 'module.exports = { randomBytes: (n) => globalThis.crypto.getRandomValues(new Uint8Array(n)) };', loader: 'js',
      }));
    },
  }],
  outfile: join(here, 'tweetnacl.mjs'),
  banner: { js: `/*! TweetNaCl.js 1.0.3 – public domain (Unlicense), see LICENSES/tweetnacl-js-Unlicense.txt. Unmodified nacl-fast.js from ${s.repo} ${s.commit.slice(0, 12)}. */` },
});
console.log('vendor/tweetnacl.mjs written');
