// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Builds vendor/openpgp.mjs (LGPL-3.0-or-later), vendor/argon2id.mjs (MIT) and vendor/noble-ciphers.mjs (MIT) from the sources pinned in
// vendor/sources.json (fetch them with vendor/fetch-sources.sh). Needs clang with the wasm32 target.
// The OpenPGP.js sources are bundled unmodified; only the module substitutions below are applied.
import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, 'src');
const out = join(here, 'build');
mkdirSync(out, { recursive: true });
const sources = JSON.parse(readFileSync(join(here, 'sources.json'), 'utf8'));
const version = JSON.parse(readFileSync(join(src, 'openpgpjs/package.json'), 'utf8')).version;

// 1. argon2id WASM core (portable C path of lib/wasm.c; no Emscripten runtime required)
const wasmFile = join(out, 'argon2id-no-simd.wasm');
execFileSync('clang', ['--target=wasm32', '-O3', '-nostdlib', '-fno-builtin',
  '-Wl,--no-entry', '-Wl,--import-memory', '-Wl,--strip-all',
  ...['G', 'G2', 'xor', 'getLZ'].map((f) => `-Wl,--export=${f}`),
  '-o', wasmFile, join(src, 'argon2id/lib/wasm.c')], { stdio: 'inherit' });

const alias = {
  '@noble/ciphers': join(src, 'noble-ciphers/src'),
  '@noble/curves': join(src, 'noble-curves/src'),
  '@noble/hashes': join(src, 'noble-hashes/src'),
  '@openpgp/web-stream-tools': join(src, 'web-stream-tools/lib/index.js'),
  '@openpgp/tweetnacl': join(src, 'tweetnacl-js/nacl-fast.js'),
  '@openpgp/unbzip2-stream': join(here, 'shims/unbzip2.js'),
  'bn.js': join(src, 'bn.js/lib/bn.js'),
  fflate: join(src, 'fflate/src/index.ts'),
  argon2id: join(here, 'shims/argon2id.js'),
  'argon2id-src': join(src, 'argon2id'),
  'argon2id-wasm': wasmFile,
  module: join(here, 'shims/module.js'),
};

const versionPlugin = {
  name: 'openpgp-version',
  setup(b) {
    b.onLoad({ filter: /openpgpjs[\\/]src[\\/]config\.ts$/ }, (args) => ({
      contents: readFileSync(args.path, 'utf8').replace('OpenPGP.js VERSION', `OpenPGP.js ${version}`),
      loader: 'ts',
    }));
  },
};

// OpenPGP.js imports e.g. './enums.ts' where only enums.js (+ enums.d.ts) exists; rollup's TypeScript
// plugin resolves that silently, so we do the same.
const tsExtPlugin = {
  name: 'ts-to-js-fallback',
  setup(b) {
    b.onResolve({ filter: /^\.\.?\/.*\.ts$/ }, (args) => {
      const p = resolve(args.resolveDir, args.path);
      if (existsSync(p)) return undefined;
      const js = p.replace(/\.ts$/, '.js');
      return existsSync(js) ? { path: js } : undefined;
    });
  },
};

const common = {
  bundle: true, format: 'esm', platform: 'browser', target: ['chrome120', 'firefox128'],
  alias, loader: { '.wasm': 'binary' }, legalComments: 'inline', logLevel: 'warning',
  // Upstream compiles OpenPGP.js (target es2021) and noble (target es2020) with TypeScript, which implies
  // useDefineForClassFields=false. Mirror that instead of reading their tsconfig files (which extend
  // a config package that is not part of the sources).
  tsconfigRaw: { compilerOptions: { useDefineForClassFields: false } },
};
const commits = (names) => names.map((n) => `${n} ${sources[n].ref} (${sources[n].commit.slice(0, 12)}, ${sources[n].license})`).join('; ');

await esbuild.build({
  ...common,
  entryPoints: [join(src, 'openpgpjs/src/index.js')],
  outfile: join(here, 'openpgp.mjs'),
  plugins: [versionPlugin, tsExtPlugin],
  banner: { js: `/*! OpenPGP.js v${version} – LGPL-3.0-or-later, see LICENSES/openpgpjs-LGPL-3.0.txt. Unmodified sources, ` +
    `bundled by OmniVault vendor/build.mjs from: ${commits(['openpgpjs', 'noble-ciphers', 'noble-curves', 'noble-hashes', 'web-stream-tools', 'argon2id', 'bn.js', 'fflate', 'tweetnacl-js'])}. ` +
    'BZip2 support omitted. You may replace this file with your own build of OpenPGP.js. */' },
});

await esbuild.build({
  ...common,
  entryPoints: [join(here, 'shims/argon2id.js')],
  outfile: join(here, 'argon2id.mjs'),
  banner: { js: `/*! argon2id ${sources.argon2id.ref} – MIT, see LICENSES/argon2id-MIT.txt. Built from ${commits(['argon2id'])}. */` },
});
console.log('vendor/openpgp.mjs and vendor/argon2id.mjs written');
await import('./build-noble.mjs');
