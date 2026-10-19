/*! argon2id v1.0.1 – MIT, see LICENSES/argon2id-MIT.txt. Built from argon2id v1.0.1 (6fc76bcf69fb, MIT). */
var __toBinary = Uint8Array.fromBase64 || /* @__PURE__ */ (() => {
  var table = new Uint8Array(128);
  for (var i = 0; i < 64; i++) table[i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i * 4 - 205] = i;
  return (base64) => {
    var n = base64.length, bytes = new Uint8Array((n - (base64[n - 1] == "=") - (base64[n - 2] == "=")) * 3 / 4 | 0);
    for (var i2 = 0, j = 0; i2 < n; ) {
      var c0 = table[base64.charCodeAt(i2++)], c1 = table[base64.charCodeAt(i2++)];
      var c2 = table[base64.charCodeAt(i2++)], c3 = table[base64.charCodeAt(i2++)];
      bytes[j++] = c0 << 2 | c1 >> 4;
      bytes[j++] = c1 << 4 | c2 >> 2;
      bytes[j++] = c2 << 6 | c3;
    }
    return bytes;
  };
})();

// vendor/src/argon2id/lib/blake2b.js
function ADD64(a, i, b, j) {
  a[i] += b[j];
  a[i + 1] += b[j + 1] + (a[i] < b[j]);
}
function INC64(a, c) {
  a[0] += c;
  a[1] += a[0] < c;
}
function G(v, m, a, b, c, d, ix, iy) {
  ADD64(v, a, v, b);
  ADD64(v, a, m, ix);
  let xor0 = v[d] ^ v[a];
  let xor1 = v[d + 1] ^ v[a + 1];
  v[d] = xor1;
  v[d + 1] = xor0;
  ADD64(v, c, v, d);
  xor0 = v[b] ^ v[c];
  xor1 = v[b + 1] ^ v[c + 1];
  v[b] = xor0 >>> 24 ^ xor1 << 8;
  v[b + 1] = xor1 >>> 24 ^ xor0 << 8;
  ADD64(v, a, v, b);
  ADD64(v, a, m, iy);
  xor0 = v[d] ^ v[a];
  xor1 = v[d + 1] ^ v[a + 1];
  v[d] = xor0 >>> 16 ^ xor1 << 16;
  v[d + 1] = xor1 >>> 16 ^ xor0 << 16;
  ADD64(v, c, v, d);
  xor0 = v[b] ^ v[c];
  xor1 = v[b + 1] ^ v[c + 1];
  v[b] = xor1 >>> 31 ^ xor0 << 1;
  v[b + 1] = xor0 >>> 31 ^ xor1 << 1;
}
var BLAKE2B_IV32 = new Uint32Array([
  4089235720,
  1779033703,
  2227873595,
  3144134277,
  4271175723,
  1013904242,
  1595750129,
  2773480762,
  2917565137,
  1359893119,
  725511199,
  2600822924,
  4215389547,
  528734635,
  327033209,
  1541459225
]);
var SIGMA = new Uint8Array([
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3,
  11,
  8,
  12,
  0,
  5,
  2,
  15,
  13,
  10,
  14,
  3,
  6,
  7,
  1,
  9,
  4,
  7,
  9,
  3,
  1,
  13,
  12,
  11,
  14,
  2,
  6,
  5,
  10,
  4,
  0,
  15,
  8,
  9,
  0,
  5,
  7,
  2,
  4,
  10,
  15,
  14,
  1,
  11,
  12,
  6,
  8,
  3,
  13,
  2,
  12,
  6,
  10,
  0,
  11,
  8,
  3,
  4,
  13,
  7,
  5,
  15,
  14,
  1,
  9,
  12,
  5,
  1,
  15,
  14,
  13,
  4,
  10,
  0,
  7,
  6,
  3,
  9,
  2,
  8,
  11,
  13,
  11,
  7,
  14,
  12,
  1,
  3,
  9,
  5,
  0,
  15,
  4,
  8,
  6,
  2,
  10,
  6,
  15,
  14,
  9,
  11,
  3,
  0,
  8,
  12,
  2,
  13,
  7,
  1,
  4,
  10,
  5,
  10,
  2,
  8,
  4,
  7,
  6,
  1,
  5,
  15,
  11,
  9,
  14,
  3,
  12,
  13,
  0,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3
].map((x) => x * 2));
function compress(S, last) {
  const v = new Uint32Array(32);
  const m = new Uint32Array(S.b.buffer, S.b.byteOffset, 32);
  for (let i = 0; i < 16; i++) {
    v[i] = S.h[i];
    v[i + 16] = BLAKE2B_IV32[i];
  }
  v[24] ^= S.t0[0];
  v[25] ^= S.t0[1];
  const f0 = last ? 4294967295 : 0;
  v[28] ^= f0;
  v[29] ^= f0;
  for (let i = 0; i < 12; i++) {
    const i16 = i << 4;
    G(v, m, 0, 8, 16, 24, SIGMA[i16 + 0], SIGMA[i16 + 1]);
    G(v, m, 2, 10, 18, 26, SIGMA[i16 + 2], SIGMA[i16 + 3]);
    G(v, m, 4, 12, 20, 28, SIGMA[i16 + 4], SIGMA[i16 + 5]);
    G(v, m, 6, 14, 22, 30, SIGMA[i16 + 6], SIGMA[i16 + 7]);
    G(v, m, 0, 10, 20, 30, SIGMA[i16 + 8], SIGMA[i16 + 9]);
    G(v, m, 2, 12, 22, 24, SIGMA[i16 + 10], SIGMA[i16 + 11]);
    G(v, m, 4, 14, 16, 26, SIGMA[i16 + 12], SIGMA[i16 + 13]);
    G(v, m, 6, 8, 18, 28, SIGMA[i16 + 14], SIGMA[i16 + 15]);
  }
  for (let i = 0; i < 16; i++) {
    S.h[i] ^= v[i] ^ v[i + 16];
  }
}
var Blake2b = class {
  constructor(outlen, key, salt, personal) {
    const params = new Uint8Array(64);
    this.S = {
      b: new Uint8Array(BLOCKBYTES),
      h: new Uint32Array(OUTBYTES_MAX / 4),
      t0: new Uint32Array(2),
      // input counter `t`, lower 64-bits only
      c: 0,
      // `fill`, pointer within buffer, up to `BLOCKBYTES`
      outlen
      // output length in bytes
    };
    params[0] = outlen;
    if (key) params[1] = key.length;
    params[2] = 1;
    params[3] = 1;
    if (salt) params.set(salt, 32);
    if (personal) params.set(personal, 48);
    const params32 = new Uint32Array(params.buffer, params.byteOffset, params.length / Uint32Array.BYTES_PER_ELEMENT);
    for (let i = 0; i < 16; i++) {
      this.S.h[i] = BLAKE2B_IV32[i] ^ params32[i];
    }
    if (key) {
      const block = new Uint8Array(BLOCKBYTES);
      block.set(key);
      this.update(block);
    }
  }
  // Updates a BLAKE2b streaming hash
  // Requires Uint8Array (byte array)
  update(input) {
    if (!(input instanceof Uint8Array)) throw new Error("Input must be Uint8Array or Buffer");
    let i = 0;
    while (i < input.length) {
      if (this.S.c === BLOCKBYTES) {
        INC64(this.S.t0, this.S.c);
        compress(this.S, false);
        this.S.c = 0;
      }
      let left = BLOCKBYTES - this.S.c;
      this.S.b.set(input.subarray(i, i + left), this.S.c);
      const fill = Math.min(left, input.length - i);
      this.S.c += fill;
      i += fill;
    }
    return this;
  }
  /**
   * Return a BLAKE2b hash, either filling the given Uint8Array or allocating a new one
   * @param {Uint8Array} [prealloc] - optional preallocated buffer
   * @returns {ArrayBuffer} message digest
   */
  digest(prealloc) {
    INC64(this.S.t0, this.S.c);
    this.S.b.fill(0, this.S.c);
    this.S.c = BLOCKBYTES;
    compress(this.S, true);
    const out = prealloc || new Uint8Array(this.S.outlen);
    for (let i = 0; i < this.S.outlen; i++) {
      out[i] = this.S.h[i >> 2] >> 8 * (i & 3);
    }
    this.S.h = null;
    return out.buffer;
  }
};
function createHash(outlen, key, salt, personal) {
  if (outlen > OUTBYTES_MAX) throw new Error(`outlen must be at most ${OUTBYTES_MAX} (given: ${outlen})`);
  if (key) {
    if (!(key instanceof Uint8Array)) throw new Error("key must be Uint8Array or Buffer");
    if (key.length > KEYBYTES_MAX) throw new Error(`key size must be at most ${KEYBYTES_MAX} (given: ${key.length})`);
  }
  if (salt) {
    if (!(salt instanceof Uint8Array)) throw new Error("salt must be Uint8Array or Buffer");
    if (salt.length !== SALTBYTES) throw new Error(`salt must be exactly ${SALTBYTES} (given: ${salt.length}`);
  }
  if (personal) {
    if (!(personal instanceof Uint8Array)) throw new Error("personal must be Uint8Array or Buffer");
    if (personal.length !== PERSONALBYTES) throw new Error(`salt must be exactly ${PERSONALBYTES} (given: ${personal.length}`);
  }
  return new Blake2b(outlen, key, salt, personal);
}
var OUTBYTES_MAX = 64;
var KEYBYTES_MAX = 64;
var SALTBYTES = 16;
var PERSONALBYTES = 16;
var BLOCKBYTES = 128;

// vendor/src/argon2id/lib/argon2id.js
var TYPE = 2;
var VERSION = 19;
var TAGBYTES_MAX = 4294967295;
var TAGBYTES_MIN = 4;
var SALTBYTES_MAX = 4294967295;
var SALTBYTES_MIN = 8;
var passwordBYTES_MAX = 4294967295;
var passwordBYTES_MIN = 8;
var MEMBYTES_MAX = 4294967295;
var ADBYTES_MAX = 4294967295;
var SECRETBYTES_MAX = 32;
var ARGON2_BLOCK_SIZE = 1024;
var ARGON2_PREHASH_DIGEST_LENGTH = 64;
var isLittleEndian = new Uint8Array(new Uint16Array([43981]).buffer)[0] === 205;
function LE32(buf, n, i) {
  buf[i + 0] = n;
  buf[i + 1] = n >> 8;
  buf[i + 2] = n >> 16;
  buf[i + 3] = n >> 24;
  return buf;
}
function LE64(buf, n, i) {
  if (n > Number.MAX_SAFE_INTEGER) throw new Error("LE64: large numbers unsupported");
  let remainder = n;
  for (let offset = i; offset < i + 7; offset++) {
    buf[offset] = remainder;
    remainder = (remainder - buf[offset]) / 256;
  }
  return buf;
}
function H_(outlen, X, res) {
  const V = new Uint8Array(64);
  const V1_in = new Uint8Array(4 + X.length);
  LE32(V1_in, outlen, 0);
  V1_in.set(X, 4);
  if (outlen <= 64) {
    createHash(outlen).update(V1_in).digest(res);
    return res;
  }
  const r = Math.ceil(outlen / 32) - 2;
  for (let i = 0; i < r; i++) {
    createHash(64).update(i === 0 ? V1_in : V).digest(V);
    res.set(V.subarray(0, 32), i * 32);
  }
  const V_r1 = new Uint8Array(createHash(outlen - 32 * r).update(V).digest());
  res.set(V_r1, r * 32);
  return res;
}
function XOR(wasmContext, buf, xs, ys) {
  wasmContext.fn.XOR(
    buf.byteOffset,
    xs.byteOffset,
    ys.byteOffset
  );
  return buf;
}
function G2(wasmContext, X, Y, R) {
  wasmContext.fn.G(
    X.byteOffset,
    Y.byteOffset,
    R.byteOffset,
    wasmContext.refs.gZ.byteOffset
  );
  return R;
}
function G22(wasmContext, X, Y, R) {
  wasmContext.fn.G2(
    X.byteOffset,
    Y.byteOffset,
    R.byteOffset,
    wasmContext.refs.gZ.byteOffset
  );
  return R;
}
function* makePRNG(wasmContext, pass, lane, slice, m_, totalPasses, segmentLength, segmentOffset) {
  wasmContext.refs.prngTmp.fill(0);
  const Z = wasmContext.refs.prngTmp.subarray(0, 6 * 8);
  LE64(Z, pass, 0);
  LE64(Z, lane, 8);
  LE64(Z, slice, 16);
  LE64(Z, m_, 24);
  LE64(Z, totalPasses, 32);
  LE64(Z, TYPE, 40);
  for (let i = 1; i <= segmentLength; i++) {
    LE64(wasmContext.refs.prngTmp, i, Z.length);
    const g2 = G22(wasmContext, wasmContext.refs.ZERO1024, wasmContext.refs.prngTmp, wasmContext.refs.prngR);
    for (let k = i === 1 ? segmentOffset * 8 : 0; k < g2.length; k += 8) {
      yield g2.subarray(k, k + 8);
    }
  }
  return [];
}
function validateParams({ type, version, tagLength, password, salt, ad, secret, parallelism, memorySize, passes }) {
  const assertLength = (name, value, min, max) => {
    if (value < min || value > max) {
      throw new Error(`${name} size should be between ${min} and ${max} bytes`);
    }
  };
  if (type !== TYPE || version !== VERSION) throw new Error("Unsupported type or version");
  assertLength("password", password, passwordBYTES_MIN, passwordBYTES_MAX);
  assertLength("salt", salt, SALTBYTES_MIN, SALTBYTES_MAX);
  assertLength("tag", tagLength, TAGBYTES_MIN, TAGBYTES_MAX);
  assertLength("memory", memorySize, 8 * parallelism, MEMBYTES_MAX);
  ad && assertLength("associated data", ad, 0, ADBYTES_MAX);
  secret && assertLength("secret", secret, 0, SECRETBYTES_MAX);
  return { type, version, tagLength, password, salt, ad, secret, lanes: parallelism, memorySize, passes };
}
var KB = 1024;
var WASM_PAGE_SIZE = 64 * KB;
function argon2id(params, { memory, instance: wasmInstance }) {
  if (!isLittleEndian) throw new Error("BigEndian system not supported");
  const ctx = validateParams({ type: TYPE, version: VERSION, ...params });
  const { G: wasmG, G2: wasmG2, xor: wasmXOR, getLZ: wasmLZ } = wasmInstance.exports;
  const wasmRefs = {};
  const wasmFn = {};
  wasmFn.G = wasmG;
  wasmFn.G2 = wasmG2;
  wasmFn.XOR = wasmXOR;
  const m_ = 4 * ctx.lanes * Math.floor(ctx.memorySize / (4 * ctx.lanes));
  const requiredMemory = m_ * ARGON2_BLOCK_SIZE + 10 * KB;
  if (memory.buffer.byteLength < requiredMemory) {
    const missing = Math.ceil((requiredMemory - memory.buffer.byteLength) / WASM_PAGE_SIZE);
    memory.grow(missing);
  }
  let offset = 0;
  wasmRefs.gZ = new Uint8Array(memory.buffer, offset, ARGON2_BLOCK_SIZE);
  offset += wasmRefs.gZ.length;
  wasmRefs.prngR = new Uint8Array(memory.buffer, offset, ARGON2_BLOCK_SIZE);
  offset += wasmRefs.prngR.length;
  wasmRefs.prngTmp = new Uint8Array(memory.buffer, offset, ARGON2_BLOCK_SIZE);
  offset += wasmRefs.prngTmp.length;
  wasmRefs.ZERO1024 = new Uint8Array(memory.buffer, offset, 1024);
  offset += wasmRefs.ZERO1024.length;
  const lz = new Uint32Array(memory.buffer, offset, 2);
  offset += lz.length * Uint32Array.BYTES_PER_ELEMENT;
  const wasmContext = { fn: wasmFn, refs: wasmRefs };
  const newBlock = new Uint8Array(memory.buffer, offset, ARGON2_BLOCK_SIZE);
  offset += newBlock.length;
  const blockMemory = new Uint8Array(memory.buffer, offset, ctx.memorySize * ARGON2_BLOCK_SIZE);
  const allocatedMemory = new Uint8Array(memory.buffer, 0, offset);
  const H0 = getH0(ctx);
  const q = m_ / ctx.lanes;
  const B = new Array(ctx.lanes).fill(null).map(() => new Array(q));
  const initBlock = (i, j) => {
    B[i][j] = blockMemory.subarray(i * q * 1024 + j * 1024, i * q * 1024 + j * 1024 + ARGON2_BLOCK_SIZE);
    return B[i][j];
  };
  for (let i = 0; i < ctx.lanes; i++) {
    const tmp = new Uint8Array(H0.length + 8);
    tmp.set(H0);
    LE32(tmp, 0, H0.length);
    LE32(tmp, i, H0.length + 4);
    H_(ARGON2_BLOCK_SIZE, tmp, initBlock(i, 0));
    LE32(tmp, 1, H0.length);
    H_(ARGON2_BLOCK_SIZE, tmp, initBlock(i, 1));
  }
  const SL = 4;
  const segmentLength = q / SL;
  for (let pass = 0; pass < ctx.passes; pass++) {
    for (let sl = 0; sl < SL; sl++) {
      const isDataIndependent = pass === 0 && sl <= 1;
      for (let i = 0; i < ctx.lanes; i++) {
        let segmentOffset = sl === 0 && pass === 0 ? 2 : 0;
        const PRNG = isDataIndependent ? makePRNG(wasmContext, pass, i, sl, m_, ctx.passes, segmentLength, segmentOffset) : null;
        for (segmentOffset; segmentOffset < segmentLength; segmentOffset++) {
          const j = sl * segmentLength + segmentOffset;
          const prevBlock = j > 0 ? B[i][j - 1] : B[i][q - 1];
          const J1J2 = isDataIndependent ? PRNG.next().value : prevBlock;
          wasmLZ(lz.byteOffset, J1J2.byteOffset, i, ctx.lanes, pass, sl, segmentOffset, SL, segmentLength);
          const l = lz[0];
          const z = lz[1];
          if (pass === 0) initBlock(i, j);
          G2(wasmContext, prevBlock, B[l][z], pass > 0 ? newBlock : B[i][j]);
          if (pass > 0) XOR(wasmContext, B[i][j], newBlock, B[i][j]);
        }
      }
    }
  }
  const C = B[0][q - 1];
  for (let i = 1; i < ctx.lanes; i++) {
    XOR(wasmContext, C, C, B[i][q - 1]);
  }
  const tag = H_(ctx.tagLength, C, new Uint8Array(ctx.tagLength));
  allocatedMemory.fill(0);
  memory.grow(0);
  return tag;
}
function getH0(ctx) {
  const H = createHash(ARGON2_PREHASH_DIGEST_LENGTH);
  const ZERO32 = new Uint8Array(4);
  const params = new Uint8Array(24);
  LE32(params, ctx.lanes, 0);
  LE32(params, ctx.tagLength, 4);
  LE32(params, ctx.memorySize, 8);
  LE32(params, ctx.passes, 12);
  LE32(params, ctx.version, 16);
  LE32(params, ctx.type, 20);
  const toHash = [params];
  if (ctx.password) {
    toHash.push(LE32(new Uint8Array(4), ctx.password.length, 0));
    toHash.push(ctx.password);
  } else {
    toHash.push(ZERO32);
  }
  if (ctx.salt) {
    toHash.push(LE32(new Uint8Array(4), ctx.salt.length, 0));
    toHash.push(ctx.salt);
  } else {
    toHash.push(ZERO32);
  }
  if (ctx.secret) {
    toHash.push(LE32(new Uint8Array(4), ctx.secret.length, 0));
    toHash.push(ctx.secret);
  } else {
    toHash.push(ZERO32);
  }
  if (ctx.ad) {
    toHash.push(LE32(new Uint8Array(4), ctx.ad.length, 0));
    toHash.push(ctx.ad);
  } else {
    toHash.push(ZERO32);
  }
  H.update(concatArrays(toHash));
  const outputBuffer = H.digest();
  return new Uint8Array(outputBuffer);
}
function concatArrays(arrays) {
  if (arrays.length === 1) return arrays[0];
  let totalLength = 0;
  for (let i = 0; i < arrays.length; i++) {
    if (!(arrays[i] instanceof Uint8Array)) {
      throw new Error("concatArrays: Data must be in the form of a Uint8Array");
    }
    totalLength += arrays[i].length;
  }
  const result = new Uint8Array(totalLength);
  let pos = 0;
  arrays.forEach((element) => {
    result.set(element, pos);
    pos += element.length;
  });
  return result;
}

// vendor/src/argon2id/lib/setup.js
var isSIMDSupported;
async function wasmLoader(memory, getSIMD, getNonSIMD) {
  const importObject = { env: { memory } };
  if (isSIMDSupported === void 0) {
    try {
      const loaded = await getSIMD(importObject);
      isSIMDSupported = true;
      return loaded;
    } catch (e) {
      isSIMDSupported = false;
    }
  }
  const loader = isSIMDSupported ? getSIMD : getNonSIMD;
  return loader(importObject);
}
async function setupWasm(getSIMD, getNonSIMD) {
  const memory = new WebAssembly.Memory({
    // in pages of 64KiB each
    // these values need to be compatible with those declared when building in `build-wasm`
    initial: 1040,
    // 65MB
    maximum: 65536
    // 4GB
  });
  const wasmModule = await wasmLoader(memory, getSIMD, getNonSIMD);
  const computeHash = (params) => argon2id(params, { instance: wasmModule.instance, memory });
  return computeHash;
}

// vendor/build/argon2id-no-simd.wasm
var argon2id_no_simd_default = __toBinary("AGFzbQEAAAABLwRgA39/fwBgEX9/f39/f39/f39/f39/f39/AGAEf39/fwBgCX9/f39/f39/fwF/Ag8BA2VudgZtZW1vcnkCAAIDBgUAAQICAwQFAXABAQEGCAF/AUGAiAQLBxgEA3hvcgAAAUcAAgJHMgADBWdldExaAAQKhBoFUAEEf0EAIQMDQCAAIANqIgQgAiADaiIFKQMAIAEgA2oiBikDAIU3AwAgBEEIaiAFQQhqKQMAIAZBCGopAwCFNwMAIANBEGoiA0GACEcNAAsL4A8DAX8CfgJ/IAAgAUEDdGoiESARKQMAIhIgACAFQQN0aiIFKQMAIhN8IBJCAYZC/v///x+DIBNC/////w+DfnwiEjcDACAAIA1BA3RqIhQgEiAUKQMAhUIgiSISNwMAIAAgCUEDdGoiFSASIBUpAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIAUgEiAFKQMAhUIoiSISNwMAIBEgEiARKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACAUIBIgFCkDAIVCMIkiEjcDACAVIBIgFSkDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgBSASIAUpAwCFQgGJNwMAIAAgAkEDdGoiAiACKQMAIhIgACAGQQN0aiIBKQMAIhN8IBJCAYZC/v///x+DIBNC/////w+DfnwiEjcDACAAIA5BA3RqIgYgEiAGKQMAhUIgiSISNwMAIAAgCkEDdGoiDiASIA4pAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIAEgEiABKQMAhUIoiSISNwMAIAIgEiACKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACAGIBIgBikDAIVCMIkiEjcDACAOIBIgDikDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgASASIAEpAwCFQgGJNwMAIAAgA0EDdGoiCiAKKQMAIhIgACAHQQN0aiINKQMAIhN8IBJCAYZC/v///x+DIBNC/////w+DfnwiEjcDACAAIA9BA3RqIgcgEiAHKQMAhUIgiSISNwMAIAAgC0EDdGoiAyASIAMpAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIA0gEiANKQMAhUIoiSISNwMAIAogEiAKKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACAHIBIgBykDAIVCMIkiEjcDACADIBIgAykDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgDSASIA0pAwCFQgGJNwMAIAAgBEEDdGoiDyAPKQMAIhIgACAIQQN0aiIJKQMAIhN8IBJCAYZC/v///x+DIBNC/////w+DfnwiEjcDACAAIBBBA3RqIgsgEiALKQMAhUIgiSISNwMAIAAgDEEDdGoiACASIAApAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIAkgEiAJKQMAhUIoiSISNwMAIA8gEiAPKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACALIBIgCykDAIVCMIkiEjcDACAAIBIgACkDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgCSASIAkpAwCFQgGJNwMAIBEgESkDACISIAEpAwAiE3wgEkIBhkL+////H4MgE0L/////D4N+fCISNwMAIAsgEiALKQMAhUIgiSISNwMAIAMgEiADKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACABIBIgASkDAIVCKIkiEjcDACARIBIgESkDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgCyASIAspAwCFQjCJIhI3AwAgAyASIAMpAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIAEgEiABKQMAhUIBiTcDACACIAIpAwAiEiANKQMAIhN8IBJCAYZC/v///x+DIBNC/////w+DfnwiEjcDACAUIBIgFCkDAIVCIIkiEjcDACAAIBIgACkDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgDSASIA0pAwCFQiiJIhI3AwAgAiASIAIpAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIBQgEiAUKQMAhUIwiSISNwMAIAAgEiAAKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACANIBIgDSkDAIVCAYk3AwAgCiAKKQMAIhIgCSkDACITfCASQgGGQv7///8fgyATQv////8Pg358IhI3AwAgBiASIAYpAwCFQiCJIhI3AwAgFSASIBUpAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIAkgEiAJKQMAhUIoiSISNwMAIAogEiAKKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACAGIBIgBikDAIVCMIkiEjcDACAVIBIgFSkDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgCSASIAkpAwCFQgGJNwMAIA8gDykDACISIAUpAwAiE3wgEkIBhkL+////H4MgE0L/////D4N+fCISNwMAIAcgEiAHKQMAhUIgiSISNwMAIA4gEiAOKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACAFIBIgBSkDAIVCKIkiEjcDACAPIBIgDykDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgByASIAcpAwCFQjCJIhI3AwAgDiASIA4pAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIAUgEiAFKQMAhUIBiTcDAAuwCAEEf0EAIQQDQCACIARqIgUgASAEaiIGKQMAIAAgBGoiBykDAIU3AwAgBUEIaiAGQQhqKQMAIAdBCGopAwCFNwMAIARBEGoiBEGACEcNAAtBACEHQQ8hBANAIAMgB2oiBSACIAdqIgYpAwA3AwAgBUEIaiAGQQhqKQMANwMAIAVBEGogBkEQaikDADcDACAFQRhqIAZBGGopAwA3AwAgBUEgaiAGQSBqKQMANwMAIAVBKGogBkEoaikDADcDACAFQTBqIAZBMGopAwA3AwAgBUE4aiAGQThqKQMANwMAIAVBwABqIAZBwABqKQMANwMAIAVByABqIAZByABqKQMANwMAIAVB0ABqIAZB0ABqKQMANwMAIAVB2ABqIAZB2ABqKQMANwMAIAVB4ABqIAZB4ABqKQMANwMAIAVB6ABqIAZB6ABqKQMANwMAIAVB8ABqIAZB8ABqKQMANwMAIAVB+ABqIAZB+ABqKQMANwMAIAMgBEFxaiIFQf//A3EgBEFyakH//wNxIARBc2pB//8DcSAEQXRqQf//A3EgBEF1akH//wNxIARBdmpB//8DcSAEQXdqQf//A3EgBEF4akH//wNxIARBeWpB//8DcSAEQXpqQf//A3EgBEF7akH//wNxIARBfGpB//8DcSAEQX1qQf//A3EgBEF+akH//wNxIARBf2pB//8DcSAEQf//A3EQgYCAgAAgBEEQaiEEIAdBgAFqIQcgBUHwAEkNAAsgA0EAQQFBEEERQSBBIUEwQTFBwABBwQBB0ABB0QBB4ABB4QBB8ABB8QAQgYCAgAAgA0ECQQNBEkETQSJBI0EyQTNBwgBBwwBB0gBB0wBB4gBB4wBB8gBB8wAQgYCAgAAgA0EEQQVBFEEVQSRBJUE0QTVBxABBxQBB1ABB1QBB5ABB5QBB9ABB9QAQgYCAgAAgA0EGQQdBFkEXQSZBJ0E2QTdBxgBBxwBB1gBB1wBB5gBB5wBB9gBB9wAQgYCAgAAgA0EIQQlBGEEZQShBKUE4QTlByABByQBB2ABB2QBB6ABB6QBB+ABB+QAQgYCAgAAgA0EKQQtBGkEbQSpBK0E6QTtBygBBywBB2gBB2wBB6gBB6wBB+gBB+wAQgYCAgAAgA0EMQQ1BHEEdQSxBLUE8QT1BzABBzQBB3ABB3QBB7ABB7QBB/ABB/QAQgYCAgAAgA0EOQQ9BHkEfQS5BL0E+QT9BzgBBzwBB3gBB3wBB7gBB7wBB/gBB/wAQgYCAgABBgHghBANAIAIgBGoiBUGACGoiByADIARqIgZBgAhqKQMAIAcpAwCFNwMAIAVBiAhqIgcgBkGICGopAwAgBykDAIU3AwAgBUGQCGoiByAGQZAIaikDACAHKQMAhTcDACAFQZgIaiIFIAZBmAhqKQMAIAUpAwCFNwMAIARBIGoiBA0ACwseACAAIAEgAiADEIKAgIAAIAAgAiACIAMQgoCAgAALfgIBfwF+IAIhCQJAIAUgBHJFDQAgASgCBCADcCEJCyABNQIAIQogACAJNgIAIAAgBkF/akEAQX8gBhsgCSACRhsgB0F/aiAFIAQbIAhsaiIJIAVBAWogCGxBACAEG2ogCiAKfkIgiCAJrX5CIIinQX9zaiAIIAdscDYCBCAACw==");

// vendor/shims/argon2id.js
function loadArgon2id() {
  return setupWasm(
    () => Promise.reject(new Error("SIMD build not included")),
    (importObject) => WebAssembly.instantiate(argon2id_no_simd_default, importObject)
  );
}
export {
  loadArgon2id as default
};
