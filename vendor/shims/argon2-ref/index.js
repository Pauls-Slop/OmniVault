// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Loader for the Argon2 reference implementation (P-H-C phc-winner-argon2, CC0/Apache-2.0), compiled to WebAssembly
// by vendor/build.mjs. Computes Argon2d, Argon2i and Argon2id in versions 0x10 and 0x13.
import wasm from 'argon2-ref-wasm';

const TYPES = { d: 0, i: 1, id: 2 };
const ERRORS = { '-22': 'memory allocation failed' };

/**
 * Resolves to hash({ type: 'd'|'i'|'id', version: 0x10|0x13, password, salt, passes, memorySize (KiB), parallelism,
 * tagLength }) → Uint8Array. All memory the computation used is zeroed before it returns.
 */
export default async function loadArgon2() {
  const { instance } = await WebAssembly.instantiate(wasm, {});
  const { memory, malloc, heap_reset: reset, argon2_hash: hash } = instance.exports;
  return ({ type, version = 0x13, password, salt, passes, memorySize, parallelism, tagLength = 32 }) => {
    if (!(type in TYPES)) throw new Error(`Argon2: unknown type ${type}`);
    try {
      const pw = malloc(Math.max(password.length, 1));
      const sl = malloc(salt.length);
      const out = malloc(tagLength);
      new Uint8Array(memory.buffer, pw, password.length).set(password);
      new Uint8Array(memory.buffer, sl, salt.length).set(salt);
      const rc = hash(passes, memorySize, parallelism, pw, password.length, sl, salt.length, out, tagLength, 0, 0, TYPES[type], version);
      if (rc !== 0) throw new Error(`Argon2: ${ERRORS[rc] ?? `error ${rc}`}`);
      return new Uint8Array(memory.buffer, out, tagLength).slice();
    } finally {
      reset();
    }
  };
}
