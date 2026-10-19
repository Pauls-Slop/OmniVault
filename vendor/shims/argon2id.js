// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Loader for the argon2id library (MIT) with the portable (non-SIMD) WASM core.
// Upstream builds a SIMD variant with Emscripten; without it, setup.js falls back to this core.
import setupWasm from 'argon2id-src/lib/setup.js';
import wasm from 'argon2id-wasm';

export default function loadArgon2id() {
  return setupWasm(
    () => Promise.reject(new Error('SIMD build not included')),
    (importObject) => WebAssembly.instantiate(wasm, importObject),
  );
}
