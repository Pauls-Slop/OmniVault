/*! OpenPGP.js v6.3.2 – LGPL-3.0-or-later, see LICENSES/openpgpjs-LGPL-3.0.txt. Unmodified sources, bundled by OmniVault vendor/build.mjs from: openpgpjs v6.3.2 (5f33328a3b60, LGPL-3.0-or-later); noble-ciphers 1.3.0 (953f9aabb4dd, MIT); noble-curves 1.9.7 (a0ac59846ee7, MIT); noble-hashes 1.8.0 (32f700f38ec4, MIT); web-stream-tools v0.3.1 (510cf3f6d0e4, MIT); argon2id v1.0.1 (6fc76bcf69fb, MIT); bn.js v5.2.3 (ea6c072a9514, MIT); fflate v0.8.3 (dcb3714a6c25, MIT); tweetnacl-js master (58ab2c532fda, Unlicense). BZip2 support omitted. You may replace this file with your own build of OpenPGP.js. */
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res, err2) => function __init() {
  if (err2) throw err2[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err2 = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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

// vendor/src/noble-hashes/src/crypto.ts
var crypto2;
var init_crypto = __esm({
  "vendor/src/noble-hashes/src/crypto.ts"() {
    crypto2 = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
  }
});

// vendor/src/noble-hashes/src/utils.ts
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("positive integer expected, got " + n);
}
function abytes(b, ...lengths) {
  if (!isBytes(b)) throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function ahash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new Error("Hash should be wrapped by utils.createHasher");
  anumber(h.outputLen);
  anumber(h.blockLen);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed) throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished) throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
function rotl(word, shift) {
  return word << shift | word >>> 32 - shift >>> 0;
}
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
function bytesToHex(bytes) {
  abytes(bytes);
  if (hasHexBuiltin) return bytes.toHex();
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}
function asciiToBase16(ch2) {
  if (ch2 >= asciis._0 && ch2 <= asciis._9) return ch2 - asciis._0;
  if (ch2 >= asciis.A && ch2 <= asciis.F) return ch2 - (asciis.A - 10);
  if (ch2 >= asciis.a && ch2 <= asciis.f) return ch2 - (asciis.a - 10);
  return;
}
function hexToBytes(hex) {
  if (typeof hex !== "string") throw new Error("hex string expected, got " + typeof hex);
  if (hasHexBuiltin) return Uint8Array.fromHex(hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2) throw new Error("hex string expected, got unpadded hex of length " + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
function utf8ToBytes(str) {
  if (typeof str !== "string") throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes(data) {
  if (typeof data === "string") data = utf8ToBytes(data);
  abytes(data);
  return data;
}
function concatBytes(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    abytes(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad2 = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad2);
    pad2 += a.length;
  }
  return res;
}
function createHasher(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
function createXOFer(hashCons) {
  const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
  const tmp = hashCons({});
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (opts) => hashCons(opts);
  return hashC;
}
function randomBytes(bytesLength = 32) {
  if (crypto2 && typeof crypto2.getRandomValues === "function") {
    return crypto2.getRandomValues(new Uint8Array(bytesLength));
  }
  if (crypto2 && typeof crypto2.randomBytes === "function") {
    return Uint8Array.from(crypto2.randomBytes(bytesLength));
  }
  throw new Error("crypto.getRandomValues must be defined");
}
var isLE, swap32IfBE, hasHexBuiltin, hexes, asciis, Hash, wrapConstructor;
var init_utils = __esm({
  "vendor/src/noble-hashes/src/utils.ts"() {
    init_crypto();
    /*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
    swap32IfBE = isLE ? (u) => u : byteSwap32;
    hasHexBuiltin = /* @__PURE__ */ (() => (
      // @ts-ignore
      typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
    ))();
    hexes = /* @__PURE__ */ Array.from(
      { length: 256 },
      (_, i) => i.toString(16).padStart(2, "0")
    );
    asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
    Hash = class {
    };
    wrapConstructor = createHasher;
  }
});

// vendor/src/noble-hashes/src/_md.ts
function setBigUint64(view, byteOffset, value, isLE3) {
  if (typeof view.setBigUint64 === "function") return view.setBigUint64(byteOffset, value, isLE3);
  const _32n2 = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value >> _32n2 & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE3 ? 4 : 0;
  const l = isLE3 ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE3);
  view.setUint32(byteOffset + l, wl, isLE3);
}
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD, SHA256_IV, SHA224_IV, SHA384_IV, SHA512_IV;
var init_md = __esm({
  "vendor/src/noble-hashes/src/_md.ts"() {
    init_utils();
    HashMD = class extends Hash {
      constructor(blockLen, outputLen, padOffset, isLE3) {
        super();
        this.finished = false;
        this.length = 0;
        this.pos = 0;
        this.destroyed = false;
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE3;
        this.buffer = new Uint8Array(blockLen);
        this.view = createView(this.buffer);
      }
      update(data) {
        aexists(this);
        data = toBytes(data);
        abytes(data);
        const { view, buffer, blockLen } = this;
        const len = data.length;
        for (let pos = 0; pos < len; ) {
          const take = Math.min(blockLen - this.pos, len - pos);
          if (take === blockLen) {
            const dataView = createView(data);
            for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
            continue;
          }
          buffer.set(data.subarray(pos, pos + take), this.pos);
          this.pos += take;
          pos += take;
          if (this.pos === blockLen) {
            this.process(view, 0);
            this.pos = 0;
          }
        }
        this.length += data.length;
        this.roundClean();
        return this;
      }
      digestInto(out) {
        aexists(this);
        aoutput(out, this);
        this.finished = true;
        const { buffer, view, blockLen, isLE: isLE3 } = this;
        let { pos } = this;
        buffer[pos++] = 128;
        clean(this.buffer.subarray(pos));
        if (this.padOffset > blockLen - pos) {
          this.process(view, 0);
          pos = 0;
        }
        for (let i = pos; i < blockLen; i++) buffer[i] = 0;
        setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE3);
        this.process(view, 0);
        const oview = createView(out);
        const len = this.outputLen;
        if (len % 4) throw new Error("_sha2: outputLen should be aligned to 32bit");
        const outLen = len / 4;
        const state = this.get();
        if (outLen > state.length) throw new Error("_sha2: outputLen bigger than state");
        for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE3);
      }
      digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
      }
      _cloneInto(to) {
        to ||= new this.constructor();
        to.set(...this.get());
        const { blockLen, buffer, length, finished, destroyed, pos } = this;
        to.destroyed = destroyed;
        to.finished = finished;
        to.length = length;
        to.pos = pos;
        if (length % blockLen) to.buffer.set(buffer);
        return to;
      }
      clone() {
        return this._cloneInto();
      }
    };
    SHA256_IV = /* @__PURE__ */ Uint32Array.from([
      1779033703,
      3144134277,
      1013904242,
      2773480762,
      1359893119,
      2600822924,
      528734635,
      1541459225
    ]);
    SHA224_IV = /* @__PURE__ */ Uint32Array.from([
      3238371032,
      914150663,
      812702999,
      4144912697,
      4290775857,
      1750603025,
      1694076839,
      3204075428
    ]);
    SHA384_IV = /* @__PURE__ */ Uint32Array.from([
      3418070365,
      3238371032,
      1654270250,
      914150663,
      2438529370,
      812702999,
      355462360,
      4144912697,
      1731405415,
      4290775857,
      2394180231,
      1750603025,
      3675008525,
      1694076839,
      1203062813,
      3204075428
    ]);
    SHA512_IV = /* @__PURE__ */ Uint32Array.from([
      1779033703,
      4089235720,
      3144134277,
      2227873595,
      1013904242,
      4271175723,
      2773480762,
      1595750129,
      1359893119,
      2917565137,
      2600822924,
      725511199,
      528734635,
      4215389547,
      1541459225,
      327033209
    ]);
  }
});

// vendor/src/noble-hashes/src/_u64.ts
function fromBig(n, le = false) {
  if (le) return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
function add(Ah, Al, Bh, Bl) {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
}
var U32_MASK64, _32n, shrSH, shrSL, rotrSH, rotrSL, rotrBH, rotrBL, rotlSH, rotlSL, rotlBH, rotlBL, add3L, add3H, add4L, add4H, add5L, add5H;
var init_u64 = __esm({
  "vendor/src/noble-hashes/src/_u64.ts"() {
    U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
    _32n = /* @__PURE__ */ BigInt(32);
    shrSH = (h, _l, s) => h >>> s;
    shrSL = (h, l, s) => h << 32 - s | l >>> s;
    rotrSH = (h, l, s) => h >>> s | l << 32 - s;
    rotrSL = (h, l, s) => h << 32 - s | l >>> s;
    rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
    rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
    rotlSH = (h, l, s) => h << s | l >>> 32 - s;
    rotlSL = (h, l, s) => l << s | h >>> 32 - s;
    rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
    rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
    add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
    add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
    add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
    add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
    add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
    add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;
  }
});

// vendor/src/noble-hashes/src/sha2.ts
var SHA256_K, SHA256_W, SHA256, SHA224, K512, SHA512_Kh, SHA512_Kl, SHA512_W_H, SHA512_W_L, SHA512, SHA384, sha256, sha224, sha512, sha384;
var init_sha2 = __esm({
  "vendor/src/noble-hashes/src/sha2.ts"() {
    init_md();
    init_u64();
    init_utils();
    SHA256_K = /* @__PURE__ */ Uint32Array.from([
      1116352408,
      1899447441,
      3049323471,
      3921009573,
      961987163,
      1508970993,
      2453635748,
      2870763221,
      3624381080,
      310598401,
      607225278,
      1426881987,
      1925078388,
      2162078206,
      2614888103,
      3248222580,
      3835390401,
      4022224774,
      264347078,
      604807628,
      770255983,
      1249150122,
      1555081692,
      1996064986,
      2554220882,
      2821834349,
      2952996808,
      3210313671,
      3336571891,
      3584528711,
      113926993,
      338241895,
      666307205,
      773529912,
      1294757372,
      1396182291,
      1695183700,
      1986661051,
      2177026350,
      2456956037,
      2730485921,
      2820302411,
      3259730800,
      3345764771,
      3516065817,
      3600352804,
      4094571909,
      275423344,
      430227734,
      506948616,
      659060556,
      883997877,
      958139571,
      1322822218,
      1537002063,
      1747873779,
      1955562222,
      2024104815,
      2227730452,
      2361852424,
      2428436474,
      2756734187,
      3204031479,
      3329325298
    ]);
    SHA256_W = /* @__PURE__ */ new Uint32Array(64);
    SHA256 = class extends HashMD {
      constructor(outputLen = 32) {
        super(64, outputLen, 8, false);
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        this.A = SHA256_IV[0] | 0;
        this.B = SHA256_IV[1] | 0;
        this.C = SHA256_IV[2] | 0;
        this.D = SHA256_IV[3] | 0;
        this.E = SHA256_IV[4] | 0;
        this.F = SHA256_IV[5] | 0;
        this.G = SHA256_IV[6] | 0;
        this.H = SHA256_IV[7] | 0;
      }
      get() {
        const { A: A2, B, C, D: D3, E, F, G: G3, H } = this;
        return [A2, B, C, D3, E, F, G3, H];
      }
      // prettier-ignore
      set(A2, B, C, D3, E, F, G3, H) {
        this.A = A2 | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D3 | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G3 | 0;
        this.H = H | 0;
      }
      process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4) SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
          const W15 = SHA256_W[i - 15];
          const W2 = SHA256_W[i - 2];
          const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
          const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
          SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
        }
        let { A: A2, B, C, D: D3, E, F, G: G3, H } = this;
        for (let i = 0; i < 64; i++) {
          const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
          const T1 = H + sigma1 + Chi(E, F, G3) + SHA256_K[i] + SHA256_W[i] | 0;
          const sigma0 = rotr(A2, 2) ^ rotr(A2, 13) ^ rotr(A2, 22);
          const T2 = sigma0 + Maj(A2, B, C) | 0;
          H = G3;
          G3 = F;
          F = E;
          E = D3 + T1 | 0;
          D3 = C;
          C = B;
          B = A2;
          A2 = T1 + T2 | 0;
        }
        A2 = A2 + this.A | 0;
        B = B + this.B | 0;
        C = C + this.C | 0;
        D3 = D3 + this.D | 0;
        E = E + this.E | 0;
        F = F + this.F | 0;
        G3 = G3 + this.G | 0;
        H = H + this.H | 0;
        this.set(A2, B, C, D3, E, F, G3, H);
      }
      roundClean() {
        clean(SHA256_W);
      }
      destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        clean(this.buffer);
      }
    };
    SHA224 = class extends SHA256 {
      constructor() {
        super(28);
        this.A = SHA224_IV[0] | 0;
        this.B = SHA224_IV[1] | 0;
        this.C = SHA224_IV[2] | 0;
        this.D = SHA224_IV[3] | 0;
        this.E = SHA224_IV[4] | 0;
        this.F = SHA224_IV[5] | 0;
        this.G = SHA224_IV[6] | 0;
        this.H = SHA224_IV[7] | 0;
      }
    };
    K512 = /* @__PURE__ */ (() => split([
      "0x428a2f98d728ae22",
      "0x7137449123ef65cd",
      "0xb5c0fbcfec4d3b2f",
      "0xe9b5dba58189dbbc",
      "0x3956c25bf348b538",
      "0x59f111f1b605d019",
      "0x923f82a4af194f9b",
      "0xab1c5ed5da6d8118",
      "0xd807aa98a3030242",
      "0x12835b0145706fbe",
      "0x243185be4ee4b28c",
      "0x550c7dc3d5ffb4e2",
      "0x72be5d74f27b896f",
      "0x80deb1fe3b1696b1",
      "0x9bdc06a725c71235",
      "0xc19bf174cf692694",
      "0xe49b69c19ef14ad2",
      "0xefbe4786384f25e3",
      "0x0fc19dc68b8cd5b5",
      "0x240ca1cc77ac9c65",
      "0x2de92c6f592b0275",
      "0x4a7484aa6ea6e483",
      "0x5cb0a9dcbd41fbd4",
      "0x76f988da831153b5",
      "0x983e5152ee66dfab",
      "0xa831c66d2db43210",
      "0xb00327c898fb213f",
      "0xbf597fc7beef0ee4",
      "0xc6e00bf33da88fc2",
      "0xd5a79147930aa725",
      "0x06ca6351e003826f",
      "0x142929670a0e6e70",
      "0x27b70a8546d22ffc",
      "0x2e1b21385c26c926",
      "0x4d2c6dfc5ac42aed",
      "0x53380d139d95b3df",
      "0x650a73548baf63de",
      "0x766a0abb3c77b2a8",
      "0x81c2c92e47edaee6",
      "0x92722c851482353b",
      "0xa2bfe8a14cf10364",
      "0xa81a664bbc423001",
      "0xc24b8b70d0f89791",
      "0xc76c51a30654be30",
      "0xd192e819d6ef5218",
      "0xd69906245565a910",
      "0xf40e35855771202a",
      "0x106aa07032bbd1b8",
      "0x19a4c116b8d2d0c8",
      "0x1e376c085141ab53",
      "0x2748774cdf8eeb99",
      "0x34b0bcb5e19b48a8",
      "0x391c0cb3c5c95a63",
      "0x4ed8aa4ae3418acb",
      "0x5b9cca4f7763e373",
      "0x682e6ff3d6b2b8a3",
      "0x748f82ee5defb2fc",
      "0x78a5636f43172f60",
      "0x84c87814a1f0ab72",
      "0x8cc702081a6439ec",
      "0x90befffa23631e28",
      "0xa4506cebde82bde9",
      "0xbef9a3f7b2c67915",
      "0xc67178f2e372532b",
      "0xca273eceea26619c",
      "0xd186b8c721c0c207",
      "0xeada7dd6cde0eb1e",
      "0xf57d4f7fee6ed178",
      "0x06f067aa72176fba",
      "0x0a637dc5a2c898a6",
      "0x113f9804bef90dae",
      "0x1b710b35131c471b",
      "0x28db77f523047d84",
      "0x32caab7b40c72493",
      "0x3c9ebe0a15c9bebc",
      "0x431d67c49c100d4c",
      "0x4cc5d4becb3e42b6",
      "0x597f299cfc657e2a",
      "0x5fcb6fab3ad6faec",
      "0x6c44198c4a475817"
    ].map((n) => BigInt(n))))();
    SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
    SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
    SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
    SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
    SHA512 = class extends HashMD {
      constructor(outputLen = 64) {
        super(128, outputLen, 16, false);
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = SHA512_IV[0] | 0;
        this.Al = SHA512_IV[1] | 0;
        this.Bh = SHA512_IV[2] | 0;
        this.Bl = SHA512_IV[3] | 0;
        this.Ch = SHA512_IV[4] | 0;
        this.Cl = SHA512_IV[5] | 0;
        this.Dh = SHA512_IV[6] | 0;
        this.Dl = SHA512_IV[7] | 0;
        this.Eh = SHA512_IV[8] | 0;
        this.El = SHA512_IV[9] | 0;
        this.Fh = SHA512_IV[10] | 0;
        this.Fl = SHA512_IV[11] | 0;
        this.Gh = SHA512_IV[12] | 0;
        this.Gl = SHA512_IV[13] | 0;
        this.Hh = SHA512_IV[14] | 0;
        this.Hl = SHA512_IV[15] | 0;
      }
      // prettier-ignore
      get() {
        const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
      }
      // prettier-ignore
      set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
        this.Ah = Ah | 0;
        this.Al = Al | 0;
        this.Bh = Bh | 0;
        this.Bl = Bl | 0;
        this.Ch = Ch | 0;
        this.Cl = Cl | 0;
        this.Dh = Dh | 0;
        this.Dl = Dl | 0;
        this.Eh = Eh | 0;
        this.El = El | 0;
        this.Fh = Fh | 0;
        this.Fl = Fl | 0;
        this.Gh = Gh | 0;
        this.Gl = Gl | 0;
        this.Hh = Hh | 0;
        this.Hl = Hl | 0;
      }
      process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4) {
          SHA512_W_H[i] = view.getUint32(offset);
          SHA512_W_L[i] = view.getUint32(offset += 4);
        }
        for (let i = 16; i < 80; i++) {
          const W15h = SHA512_W_H[i - 15] | 0;
          const W15l = SHA512_W_L[i - 15] | 0;
          const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
          const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
          const W2h = SHA512_W_H[i - 2] | 0;
          const W2l = SHA512_W_L[i - 2] | 0;
          const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
          const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
          const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
          const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
          SHA512_W_H[i] = SUMh | 0;
          SHA512_W_L[i] = SUMl | 0;
        }
        let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        for (let i = 0; i < 80; i++) {
          const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
          const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
          const CHIh = Eh & Fh ^ ~Eh & Gh;
          const CHIl = El & Fl ^ ~El & Gl;
          const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
          const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
          const T1l = T1ll | 0;
          const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
          const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
          const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
          const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
          Hh = Gh | 0;
          Hl = Gl | 0;
          Gh = Fh | 0;
          Gl = Fl | 0;
          Fh = Eh | 0;
          Fl = El | 0;
          ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
          Dh = Ch | 0;
          Dl = Cl | 0;
          Ch = Bh | 0;
          Cl = Bl | 0;
          Bh = Ah | 0;
          Bl = Al | 0;
          const All = add3L(T1l, sigma0l, MAJl);
          Ah = add3H(All, T1h, sigma0h, MAJh);
          Al = All | 0;
        }
        ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
        ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
        ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
        ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
        ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
        ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
        ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
        ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
        this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
      }
      roundClean() {
        clean(SHA512_W_H, SHA512_W_L);
      }
      destroy() {
        clean(this.buffer);
        this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      }
    };
    SHA384 = class extends SHA512 {
      constructor() {
        super(48);
        this.Ah = SHA384_IV[0] | 0;
        this.Al = SHA384_IV[1] | 0;
        this.Bh = SHA384_IV[2] | 0;
        this.Bl = SHA384_IV[3] | 0;
        this.Ch = SHA384_IV[4] | 0;
        this.Cl = SHA384_IV[5] | 0;
        this.Dh = SHA384_IV[6] | 0;
        this.Dl = SHA384_IV[7] | 0;
        this.Eh = SHA384_IV[8] | 0;
        this.El = SHA384_IV[9] | 0;
        this.Fh = SHA384_IV[10] | 0;
        this.Fl = SHA384_IV[11] | 0;
        this.Gh = SHA384_IV[12] | 0;
        this.Gl = SHA384_IV[13] | 0;
        this.Hh = SHA384_IV[14] | 0;
        this.Hl = SHA384_IV[15] | 0;
      }
    };
    sha256 = /* @__PURE__ */ createHasher(() => new SHA256());
    sha224 = /* @__PURE__ */ createHasher(() => new SHA224());
    sha512 = /* @__PURE__ */ createHasher(() => new SHA512());
    sha384 = /* @__PURE__ */ createHasher(() => new SHA384());
  }
});

// vendor/src/noble-hashes/src/hmac.ts
var HMAC, hmac;
var init_hmac = __esm({
  "vendor/src/noble-hashes/src/hmac.ts"() {
    init_utils();
    HMAC = class extends Hash {
      constructor(hash, _key) {
        super();
        this.finished = false;
        this.destroyed = false;
        ahash(hash);
        const key = toBytes(_key);
        this.iHash = hash.create();
        if (typeof this.iHash.update !== "function")
          throw new Error("Expected instance of class which extends utils.Hash");
        this.blockLen = this.iHash.blockLen;
        this.outputLen = this.iHash.outputLen;
        const blockLen = this.blockLen;
        const pad2 = new Uint8Array(blockLen);
        pad2.set(key.length > blockLen ? hash.create().update(key).digest() : key);
        for (let i = 0; i < pad2.length; i++) pad2[i] ^= 54;
        this.iHash.update(pad2);
        this.oHash = hash.create();
        for (let i = 0; i < pad2.length; i++) pad2[i] ^= 54 ^ 92;
        this.oHash.update(pad2);
        clean(pad2);
      }
      update(buf) {
        aexists(this);
        this.iHash.update(buf);
        return this;
      }
      digestInto(out) {
        aexists(this);
        abytes(out, this.outputLen);
        this.finished = true;
        this.iHash.digestInto(out);
        this.oHash.update(out);
        this.oHash.digestInto(out);
        this.destroy();
      }
      digest() {
        const out = new Uint8Array(this.oHash.outputLen);
        this.digestInto(out);
        return out;
      }
      _cloneInto(to) {
        to ||= Object.create(Object.getPrototypeOf(this), {});
        const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
        to = to;
        to.finished = finished;
        to.destroyed = destroyed;
        to.blockLen = blockLen;
        to.outputLen = outputLen;
        to.oHash = oHash._cloneInto(to.oHash);
        to.iHash = iHash._cloneInto(to.iHash);
        return to;
      }
      clone() {
        return this._cloneInto();
      }
      destroy() {
        this.destroyed = true;
        this.oHash.destroy();
        this.iHash.destroy();
      }
    };
    hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
    hmac.create = (hash, key) => new HMAC(hash, key);
  }
});

// vendor/src/noble-curves/src/utils.ts
function _abool2(value, title = "") {
  if (typeof value !== "boolean") {
    const prefix = title && `"${title}"`;
    throw new Error(prefix + "expected boolean, got type=" + typeof value);
  }
  return value;
}
function _abytes2(value, length, title = "") {
  const bytes = isBytes(value);
  const len = value?.length;
  const needsLen = length !== void 0;
  if (!bytes || needsLen && len !== length) {
    const prefix = title && `"${title}" `;
    const ofLen = needsLen ? ` of length ${length}` : "";
    const got = bytes ? `length=${len}` : `type=${typeof value}`;
    throw new Error(prefix + "expected Uint8Array" + ofLen + ", got " + got);
  }
  return value;
}
function numberToHexUnpadded(num) {
  const hex = num.toString(16);
  return hex.length & 1 ? "0" + hex : hex;
}
function hexToNumber(hex) {
  if (typeof hex !== "string") throw new Error("hex string expected, got " + typeof hex);
  return hex === "" ? _0n : BigInt("0x" + hex);
}
function bytesToNumberBE(bytes) {
  return hexToNumber(bytesToHex(bytes));
}
function bytesToNumberLE(bytes) {
  abytes(bytes);
  return hexToNumber(bytesToHex(Uint8Array.from(bytes).reverse()));
}
function numberToBytesBE(n, len) {
  return hexToBytes(n.toString(16).padStart(len * 2, "0"));
}
function numberToBytesLE(n, len) {
  return numberToBytesBE(n, len).reverse();
}
function ensureBytes(title, hex, expectedLength) {
  let res;
  if (typeof hex === "string") {
    try {
      res = hexToBytes(hex);
    } catch (e) {
      throw new Error(title + " must be hex string or Uint8Array, cause: " + e);
    }
  } else if (isBytes(hex)) {
    res = Uint8Array.from(hex);
  } else {
    throw new Error(title + " must be hex string or Uint8Array");
  }
  const len = res.length;
  if (typeof expectedLength === "number" && len !== expectedLength)
    throw new Error(title + " of length " + expectedLength + " expected, got " + len);
  return res;
}
function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
function copyBytes(bytes) {
  return Uint8Array.from(bytes);
}
function asciiToBytes(ascii) {
  return Uint8Array.from(ascii, (c, i) => {
    const charCode = c.charCodeAt(0);
    if (c.length !== 1 || charCode > 127) {
      throw new Error(
        `string contains non-ASCII character "${ascii[i]}" with code ${charCode} at position ${i}`
      );
    }
    return charCode;
  });
}
function inRange(n, min, max2) {
  return isPosBig(n) && isPosBig(min) && isPosBig(max2) && min <= n && n < max2;
}
function aInRange(title, n, min, max2) {
  if (!inRange(n, min, max2))
    throw new Error("expected valid " + title + ": " + min + " <= n < " + max2 + ", got " + n);
}
function bitLen(n) {
  let len;
  for (len = 0; n > _0n; n >>= _1n, len += 1) ;
  return len;
}
function createHmacDrbg(hashLen, qByteLen, hmacFn) {
  if (typeof hashLen !== "number" || hashLen < 2) throw new Error("hashLen must be a number");
  if (typeof qByteLen !== "number" || qByteLen < 2) throw new Error("qByteLen must be a number");
  if (typeof hmacFn !== "function") throw new Error("hmacFn must be a function");
  const u8n = (len) => new Uint8Array(len);
  const u8of = (byte) => Uint8Array.of(byte);
  let v = u8n(hashLen);
  let k = u8n(hashLen);
  let i = 0;
  const reset = () => {
    v.fill(1);
    k.fill(0);
    i = 0;
  };
  const h = (...b) => hmacFn(k, v, ...b);
  const reseed = (seed = u8n(0)) => {
    k = h(u8of(0), seed);
    v = h();
    if (seed.length === 0) return;
    k = h(u8of(1), seed);
    v = h();
  };
  const gen2 = () => {
    if (i++ >= 1e3) throw new Error("drbg: tried 1000 values");
    let len = 0;
    const out = [];
    while (len < qByteLen) {
      v = h();
      const sl = v.slice();
      out.push(sl);
      len += v.length;
    }
    return concatBytes(...out);
  };
  const genUntil = (seed, pred) => {
    reset();
    reseed(seed);
    let res = void 0;
    while (!(res = pred(gen2()))) reseed();
    reset();
    return res;
  };
  return genUntil;
}
function _validateObject(object, fields, optFields = {}) {
  if (!object || typeof object !== "object") throw new Error("expected valid options object");
  function checkField(fieldName, expectedType, isOpt) {
    const val = object[fieldName];
    if (isOpt && val === void 0) return;
    const current = typeof val;
    if (current !== expectedType || val === null)
      throw new Error(`param "${fieldName}" is invalid: expected ${expectedType}, got ${current}`);
  }
  Object.entries(fields).forEach(([k, v]) => checkField(k, v, false));
  Object.entries(optFields).forEach(([k, v]) => checkField(k, v, true));
}
function memoized(fn) {
  const map = /* @__PURE__ */ new WeakMap();
  return (arg, ...args) => {
    const val = map.get(arg);
    if (val !== void 0) return val;
    const computed = fn(arg, ...args);
    map.set(arg, computed);
    return computed;
  };
}
var _0n, _1n, isPosBig, bitMask, notImplemented;
var init_utils2 = __esm({
  "vendor/src/noble-curves/src/utils.ts"() {
    init_utils();
    init_utils();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    _0n = /* @__PURE__ */ BigInt(0);
    _1n = /* @__PURE__ */ BigInt(1);
    isPosBig = (n) => typeof n === "bigint" && _0n <= n;
    bitMask = (n) => (_1n << BigInt(n)) - _1n;
    notImplemented = () => {
      throw new Error("not implemented");
    };
  }
});

// vendor/src/noble-curves/src/abstract/modular.ts
function mod(a, b) {
  const result = a % b;
  return result >= _0n2 ? result : b + result;
}
function pow2(x, power, modulo) {
  let res = x;
  while (power-- > _0n2) {
    res *= res;
    res %= modulo;
  }
  return res;
}
function invert(number, modulo) {
  if (number === _0n2) throw new Error("invert: expected non-zero number");
  if (modulo <= _0n2) throw new Error("invert: expected positive modulus, got " + modulo);
  let a = mod(number, modulo);
  let b = modulo;
  let x = _0n2, y = _1n2, u = _1n2, v = _0n2;
  while (a !== _0n2) {
    const q = b / a;
    const r = b % a;
    const m = x - u * q;
    const n = y - v * q;
    b = a, a = r, x = u, y = v, u = m, v = n;
  }
  const gcd2 = b;
  if (gcd2 !== _1n2) throw new Error("invert: does not exist");
  return mod(x, modulo);
}
function assertIsSquare(Fp5, root, n) {
  if (!Fp5.eql(Fp5.sqr(root), n)) throw new Error("Cannot find square root");
}
function sqrt3mod4(Fp5, n) {
  const p1div4 = (Fp5.ORDER + _1n2) / _4n;
  const root = Fp5.pow(n, p1div4);
  assertIsSquare(Fp5, root, n);
  return root;
}
function sqrt5mod8(Fp5, n) {
  const p5div8 = (Fp5.ORDER - _5n) / _8n;
  const n2 = Fp5.mul(n, _2n);
  const v = Fp5.pow(n2, p5div8);
  const nv = Fp5.mul(n, v);
  const i = Fp5.mul(Fp5.mul(nv, _2n), v);
  const root = Fp5.mul(nv, Fp5.sub(i, Fp5.ONE));
  assertIsSquare(Fp5, root, n);
  return root;
}
function sqrt9mod16(P) {
  const Fp_ = Field(P);
  const tn = tonelliShanks(P);
  const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
  const c2 = tn(Fp_, c1);
  const c3 = tn(Fp_, Fp_.neg(c1));
  const c4 = (P + _7n) / _16n;
  return (Fp5, n) => {
    let tv1 = Fp5.pow(n, c4);
    let tv2 = Fp5.mul(tv1, c1);
    const tv3 = Fp5.mul(tv1, c2);
    const tv4 = Fp5.mul(tv1, c3);
    const e1 = Fp5.eql(Fp5.sqr(tv2), n);
    const e2 = Fp5.eql(Fp5.sqr(tv3), n);
    tv1 = Fp5.cmov(tv1, tv2, e1);
    tv2 = Fp5.cmov(tv4, tv3, e2);
    const e3 = Fp5.eql(Fp5.sqr(tv2), n);
    const root = Fp5.cmov(tv1, tv2, e3);
    assertIsSquare(Fp5, root, n);
    return root;
  };
}
function tonelliShanks(P) {
  if (P < _3n) throw new Error("sqrt is not defined for small field");
  let Q = P - _1n2;
  let S2 = 0;
  while (Q % _2n === _0n2) {
    Q /= _2n;
    S2++;
  }
  let Z2 = _2n;
  const _Fp = Field(P);
  while (FpLegendre(_Fp, Z2) === 1) {
    if (Z2++ > 1e3) throw new Error("Cannot find square root: probably non-prime P");
  }
  if (S2 === 1) return sqrt3mod4;
  let cc = _Fp.pow(Z2, Q);
  const Q1div2 = (Q + _1n2) / _2n;
  return function tonelliSlow(Fp5, n) {
    if (Fp5.is0(n)) return n;
    if (FpLegendre(Fp5, n) !== 1) throw new Error("Cannot find square root");
    let M2 = S2;
    let c = Fp5.mul(Fp5.ONE, cc);
    let t = Fp5.pow(n, Q);
    let R = Fp5.pow(n, Q1div2);
    while (!Fp5.eql(t, Fp5.ONE)) {
      if (Fp5.is0(t)) return Fp5.ZERO;
      let i = 1;
      let t_tmp = Fp5.sqr(t);
      while (!Fp5.eql(t_tmp, Fp5.ONE)) {
        i++;
        t_tmp = Fp5.sqr(t_tmp);
        if (i === M2) throw new Error("Cannot find square root");
      }
      const exponent = _1n2 << BigInt(M2 - i - 1);
      const b = Fp5.pow(c, exponent);
      M2 = i;
      c = Fp5.sqr(b);
      t = Fp5.mul(t, c);
      R = Fp5.mul(R, b);
    }
    return R;
  };
}
function FpSqrt(P) {
  if (P % _4n === _3n) return sqrt3mod4;
  if (P % _8n === _5n) return sqrt5mod8;
  if (P % _16n === _9n) return sqrt9mod16(P);
  return tonelliShanks(P);
}
function validateField(field) {
  const initial = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "number",
    BITS: "number"
  };
  const opts = FIELD_FIELDS.reduce((map, val) => {
    map[val] = "function";
    return map;
  }, initial);
  _validateObject(field, opts);
  return field;
}
function FpPow(Fp5, num, power) {
  if (power < _0n2) throw new Error("invalid exponent, negatives unsupported");
  if (power === _0n2) return Fp5.ONE;
  if (power === _1n2) return num;
  let p = Fp5.ONE;
  let d = num;
  while (power > _0n2) {
    if (power & _1n2) p = Fp5.mul(p, d);
    d = Fp5.sqr(d);
    power >>= _1n2;
  }
  return p;
}
function FpInvertBatch(Fp5, nums, passZero = false) {
  const inverted = new Array(nums.length).fill(passZero ? Fp5.ZERO : void 0);
  const multipliedAcc = nums.reduce((acc, num, i) => {
    if (Fp5.is0(num)) return acc;
    inverted[i] = acc;
    return Fp5.mul(acc, num);
  }, Fp5.ONE);
  const invertedAcc = Fp5.inv(multipliedAcc);
  nums.reduceRight((acc, num, i) => {
    if (Fp5.is0(num)) return acc;
    inverted[i] = Fp5.mul(acc, inverted[i]);
    return Fp5.mul(acc, num);
  }, invertedAcc);
  return inverted;
}
function FpLegendre(Fp5, n) {
  const p1mod2 = (Fp5.ORDER - _1n2) / _2n;
  const powered = Fp5.pow(n, p1mod2);
  const yes = Fp5.eql(powered, Fp5.ONE);
  const zero2 = Fp5.eql(powered, Fp5.ZERO);
  const no = Fp5.eql(powered, Fp5.neg(Fp5.ONE));
  if (!yes && !zero2 && !no) throw new Error("invalid Legendre symbol result");
  return yes ? 1 : zero2 ? 0 : -1;
}
function nLength(n, nBitLength) {
  if (nBitLength !== void 0) anumber(nBitLength);
  const _nBitLength = nBitLength !== void 0 ? nBitLength : n.toString(2).length;
  const nByteLength = Math.ceil(_nBitLength / 8);
  return { nBitLength: _nBitLength, nByteLength };
}
function Field(ORDER, bitLenOrOpts, isLE3 = false, opts = {}) {
  if (ORDER <= _0n2) throw new Error("invalid field: expected ORDER > 0, got " + ORDER);
  let _nbitLength = void 0;
  let _sqrt = void 0;
  let modFromBytes = false;
  let allowedLengths = void 0;
  if (typeof bitLenOrOpts === "object" && bitLenOrOpts != null) {
    if (opts.sqrt || isLE3) throw new Error("cannot specify opts in two arguments");
    const _opts = bitLenOrOpts;
    if (_opts.BITS) _nbitLength = _opts.BITS;
    if (_opts.sqrt) _sqrt = _opts.sqrt;
    if (typeof _opts.isLE === "boolean") isLE3 = _opts.isLE;
    if (typeof _opts.modFromBytes === "boolean") modFromBytes = _opts.modFromBytes;
    allowedLengths = _opts.allowedLengths;
  } else {
    if (typeof bitLenOrOpts === "number") _nbitLength = bitLenOrOpts;
    if (opts.sqrt) _sqrt = opts.sqrt;
  }
  const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, _nbitLength);
  if (BYTES > 2048) throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let sqrtP;
  const f = Object.freeze({
    ORDER,
    isLE: isLE3,
    BITS,
    BYTES,
    MASK: bitMask(BITS),
    ZERO: _0n2,
    ONE: _1n2,
    allowedLengths,
    create: (num) => mod(num, ORDER),
    isValid: (num) => {
      if (typeof num !== "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof num);
      return _0n2 <= num && num < ORDER;
    },
    is0: (num) => num === _0n2,
    // is valid and invertible
    isValidNot0: (num) => !f.is0(num) && f.isValid(num),
    isOdd: (num) => (num & _1n2) === _1n2,
    neg: (num) => mod(-num, ORDER),
    eql: (lhs, rhs) => lhs === rhs,
    sqr: (num) => mod(num * num, ORDER),
    add: (lhs, rhs) => mod(lhs + rhs, ORDER),
    sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
    mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
    pow: (num, power) => FpPow(f, num, power),
    div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
    // Same as above, but doesn't normalize
    sqrN: (num) => num * num,
    addN: (lhs, rhs) => lhs + rhs,
    subN: (lhs, rhs) => lhs - rhs,
    mulN: (lhs, rhs) => lhs * rhs,
    inv: (num) => invert(num, ORDER),
    sqrt: _sqrt || ((n) => {
      if (!sqrtP) sqrtP = FpSqrt(ORDER);
      return sqrtP(f, n);
    }),
    toBytes: (num) => isLE3 ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES),
    fromBytes: (bytes, skipValidation = true) => {
      if (allowedLengths) {
        if (!allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
          throw new Error(
            "Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length
          );
        }
        const padded = new Uint8Array(BYTES);
        padded.set(bytes, isLE3 ? 0 : padded.length - bytes.length);
        bytes = padded;
      }
      if (bytes.length !== BYTES)
        throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
      let scalar = isLE3 ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
      if (modFromBytes) scalar = mod(scalar, ORDER);
      if (!skipValidation) {
        if (!f.isValid(scalar)) throw new Error("invalid field element: outside of range 0..ORDER");
      }
      return scalar;
    },
    // TODO: we don't need it here, move out to separate fn
    invertBatch: (lst) => FpInvertBatch(f, lst),
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov: (a, b, c) => c ? b : a
  });
  return Object.freeze(f);
}
function getFieldBytesLength(fieldOrder) {
  if (typeof fieldOrder !== "bigint") throw new Error("field order must be bigint");
  const bitLength2 = fieldOrder.toString(2).length;
  return Math.ceil(bitLength2 / 8);
}
function getMinHashLength(fieldOrder) {
  const length = getFieldBytesLength(fieldOrder);
  return length + Math.ceil(length / 2);
}
function mapHashToField(key, fieldOrder, isLE3 = false) {
  const len = key.length;
  const fieldLen = getFieldBytesLength(fieldOrder);
  const minLen = getMinHashLength(fieldOrder);
  if (len < 16 || len < minLen || len > 1024)
    throw new Error("expected " + minLen + "-1024 bytes of input, got " + len);
  const num = isLE3 ? bytesToNumberLE(key) : bytesToNumberBE(key);
  const reduced = mod(num, fieldOrder - _1n2) + _1n2;
  return isLE3 ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
}
var _0n2, _1n2, _2n, _3n, _4n, _5n, _7n, _8n, _9n, _16n, isNegativeLE, FIELD_FIELDS;
var init_modular = __esm({
  "vendor/src/noble-curves/src/abstract/modular.ts"() {
    init_utils2();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    _0n2 = BigInt(0);
    _1n2 = BigInt(1);
    _2n = /* @__PURE__ */ BigInt(2);
    _3n = /* @__PURE__ */ BigInt(3);
    _4n = /* @__PURE__ */ BigInt(4);
    _5n = /* @__PURE__ */ BigInt(5);
    _7n = /* @__PURE__ */ BigInt(7);
    _8n = /* @__PURE__ */ BigInt(8);
    _9n = /* @__PURE__ */ BigInt(9);
    _16n = /* @__PURE__ */ BigInt(16);
    isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n2) === _1n2;
    FIELD_FIELDS = [
      "create",
      "isValid",
      "is0",
      "neg",
      "inv",
      "sqrt",
      "sqr",
      "eql",
      "add",
      "sub",
      "mul",
      "pow",
      "div",
      "addN",
      "subN",
      "mulN",
      "sqrN"
    ];
  }
});

// vendor/src/noble-curves/src/abstract/curve.ts
function negateCt(condition, item) {
  const neg = item.negate();
  return condition ? neg : item;
}
function normalizeZ(c, points) {
  const invertedZs = FpInvertBatch(
    c.Fp,
    points.map((p) => p.Z)
  );
  return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
}
function validateW(W, bits2) {
  if (!Number.isSafeInteger(W) || W <= 0 || W > bits2)
    throw new Error("invalid window size, expected [1.." + bits2 + "], got W=" + W);
}
function calcWOpts(W, scalarBits) {
  validateW(W, scalarBits);
  const windows = Math.ceil(scalarBits / W) + 1;
  const windowSize = 2 ** (W - 1);
  const maxNumber = 2 ** W;
  const mask = bitMask(W);
  const shiftBy = BigInt(W);
  return { windows, windowSize, mask, maxNumber, shiftBy };
}
function calcOffsets(n, window, wOpts) {
  const { windowSize, mask, maxNumber, shiftBy } = wOpts;
  let wbits2 = Number(n & mask);
  let nextN = n >> shiftBy;
  if (wbits2 > windowSize) {
    wbits2 -= maxNumber;
    nextN += _1n3;
  }
  const offsetStart = window * windowSize;
  const offset = offsetStart + Math.abs(wbits2) - 1;
  const isZero = wbits2 === 0;
  const isNeg = wbits2 < 0;
  const isNegF = window % 2 !== 0;
  const offsetF = offsetStart;
  return { nextN, offset, isZero, isNeg, isNegF, offsetF };
}
function validateMSMPoints(points, c) {
  if (!Array.isArray(points)) throw new Error("array expected");
  points.forEach((p, i) => {
    if (!(p instanceof c)) throw new Error("invalid point at index " + i);
  });
}
function validateMSMScalars(scalars, field) {
  if (!Array.isArray(scalars)) throw new Error("array of scalars expected");
  scalars.forEach((s, i) => {
    if (!field.isValid(s)) throw new Error("invalid scalar at index " + i);
  });
}
function getW(P) {
  return pointWindowSizes.get(P) || 1;
}
function assert0(n) {
  if (n !== _0n3) throw new Error("invalid wNAF");
}
function mulEndoUnsafe(Point, point, k1, k2) {
  let acc = point;
  let p1 = Point.ZERO;
  let p2 = Point.ZERO;
  while (k1 > _0n3 || k2 > _0n3) {
    if (k1 & _1n3) p1 = p1.add(acc);
    if (k2 & _1n3) p2 = p2.add(acc);
    acc = acc.double();
    k1 >>= _1n3;
    k2 >>= _1n3;
  }
  return { p1, p2 };
}
function pippenger(c, fieldN, points, scalars) {
  validateMSMPoints(points, c);
  validateMSMScalars(scalars, fieldN);
  const plength = points.length;
  const slength = scalars.length;
  if (plength !== slength) throw new Error("arrays of points and scalars must have equal length");
  const zero2 = c.ZERO;
  const wbits2 = bitLen(BigInt(plength));
  let windowSize = 1;
  if (wbits2 > 12) windowSize = wbits2 - 3;
  else if (wbits2 > 4) windowSize = wbits2 - 2;
  else if (wbits2 > 0) windowSize = 2;
  const MASK = bitMask(windowSize);
  const buckets = new Array(Number(MASK) + 1).fill(zero2);
  const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
  let sum = zero2;
  for (let i = lastBits; i >= 0; i -= windowSize) {
    buckets.fill(zero2);
    for (let j = 0; j < slength; j++) {
      const scalar = scalars[j];
      const wbits3 = Number(scalar >> BigInt(i) & MASK);
      buckets[wbits3] = buckets[wbits3].add(points[j]);
    }
    let resI = zero2;
    for (let j = buckets.length - 1, sumI = zero2; j > 0; j--) {
      sumI = sumI.add(buckets[j]);
      resI = resI.add(sumI);
    }
    sum = sum.add(resI);
    if (i !== 0) for (let j = 0; j < windowSize; j++) sum = sum.double();
  }
  return sum;
}
function createField(order, field, isLE3) {
  if (field) {
    if (field.ORDER !== order) throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    validateField(field);
    return field;
  } else {
    return Field(order, { isLE: isLE3 });
  }
}
function _createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
  if (FpFnLE === void 0) FpFnLE = type === "edwards";
  if (!CURVE || typeof CURVE !== "object") throw new Error(`expected valid ${type} CURVE object`);
  for (const p of ["p", "n", "h"]) {
    const val = CURVE[p];
    if (!(typeof val === "bigint" && val > _0n3))
      throw new Error(`CURVE.${p} must be positive bigint`);
  }
  const Fp5 = createField(CURVE.p, curveOpts.Fp, FpFnLE);
  const Fn2 = createField(CURVE.n, curveOpts.Fn, FpFnLE);
  const _b = type === "weierstrass" ? "b" : "d";
  const params = ["Gx", "Gy", "a", _b];
  for (const p of params) {
    if (!Fp5.isValid(CURVE[p]))
      throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
  }
  CURVE = Object.freeze(Object.assign({}, CURVE));
  return { CURVE, Fp: Fp5, Fn: Fn2 };
}
var _0n3, _1n3, pointPrecomputes, pointWindowSizes, wNAF;
var init_curve = __esm({
  "vendor/src/noble-curves/src/abstract/curve.ts"() {
    init_utils2();
    init_modular();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    _0n3 = BigInt(0);
    _1n3 = BigInt(1);
    pointPrecomputes = /* @__PURE__ */ new WeakMap();
    pointWindowSizes = /* @__PURE__ */ new WeakMap();
    wNAF = class {
      // Parametrized with a given Point class (not individual point)
      constructor(Point, bits2) {
        this.BASE = Point.BASE;
        this.ZERO = Point.ZERO;
        this.Fn = Point.Fn;
        this.bits = bits2;
      }
      // non-const time multiplication ladder
      _unsafeLadder(elm, n, p = this.ZERO) {
        let d = elm;
        while (n > _0n3) {
          if (n & _1n3) p = p.add(d);
          d = d.double();
          n >>= _1n3;
        }
        return p;
      }
      /**
       * Creates a wNAF precomputation window. Used for caching.
       * Default window size is set by `utils.precompute()` and is equal to 8.
       * Number of precomputed points depends on the curve size:
       * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
       * - 𝑊 is the window size
       * - 𝑛 is the bitlength of the curve order.
       * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
       * @param point Point instance
       * @param W window size
       * @returns precomputed point tables flattened to a single array
       */
      precomputeWindow(point, W) {
        const { windows, windowSize } = calcWOpts(W, this.bits);
        const points = [];
        let p = point;
        let base = p;
        for (let window = 0; window < windows; window++) {
          base = p;
          points.push(base);
          for (let i = 1; i < windowSize; i++) {
            base = base.add(p);
            points.push(base);
          }
          p = base.double();
        }
        return points;
      }
      /**
       * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
       * More compact implementation:
       * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
       * @returns real and fake (for const-time) points
       */
      wNAF(W, precomputes, n) {
        if (!this.Fn.isValid(n)) throw new Error("invalid scalar");
        let p = this.ZERO;
        let f = this.BASE;
        const wo = calcWOpts(W, this.bits);
        for (let window = 0; window < wo.windows; window++) {
          const { nextN, offset, isZero, isNeg, isNegF, offsetF } = calcOffsets(n, window, wo);
          n = nextN;
          if (isZero) {
            f = f.add(negateCt(isNegF, precomputes[offsetF]));
          } else {
            p = p.add(negateCt(isNeg, precomputes[offset]));
          }
        }
        assert0(n);
        return { p, f };
      }
      /**
       * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
       * @param acc accumulator point to add result of multiplication
       * @returns point
       */
      wNAFUnsafe(W, precomputes, n, acc = this.ZERO) {
        const wo = calcWOpts(W, this.bits);
        for (let window = 0; window < wo.windows; window++) {
          if (n === _0n3) break;
          const { nextN, offset, isZero, isNeg } = calcOffsets(n, window, wo);
          n = nextN;
          if (isZero) {
            continue;
          } else {
            const item = precomputes[offset];
            acc = acc.add(isNeg ? item.negate() : item);
          }
        }
        assert0(n);
        return acc;
      }
      getPrecomputes(W, point, transform2) {
        let comp = pointPrecomputes.get(point);
        if (!comp) {
          comp = this.precomputeWindow(point, W);
          if (W !== 1) {
            if (typeof transform2 === "function") comp = transform2(comp);
            pointPrecomputes.set(point, comp);
          }
        }
        return comp;
      }
      cached(point, scalar, transform2) {
        const W = getW(point);
        return this.wNAF(W, this.getPrecomputes(W, point, transform2), scalar);
      }
      unsafe(point, scalar, transform2, prev) {
        const W = getW(point);
        if (W === 1) return this._unsafeLadder(point, scalar, prev);
        return this.wNAFUnsafe(W, this.getPrecomputes(W, point, transform2), scalar, prev);
      }
      // We calculate precomputes for elliptic curve point multiplication
      // using windowed method. This specifies window size and
      // stores precomputed values. Usually only base point would be precomputed.
      createCache(P, W) {
        validateW(W, this.bits);
        pointWindowSizes.set(P, W);
        pointPrecomputes.delete(P);
      }
      hasCache(elm) {
        return getW(elm) !== 1;
      }
    };
  }
});

// vendor/src/noble-curves/src/abstract/weierstrass.ts
function _splitEndoScalar(k, basis, n) {
  const [[a1, b1], [a2, b2]] = basis;
  const c1 = divNearest(b2 * k, n);
  const c2 = divNearest(-b1 * k, n);
  let k1 = k - c1 * a1 - c2 * a2;
  let k2 = -c1 * b1 - c2 * b2;
  const k1neg = k1 < _0n4;
  const k2neg = k2 < _0n4;
  if (k1neg) k1 = -k1;
  if (k2neg) k2 = -k2;
  const MAX_NUM = bitMask(Math.ceil(bitLen(n) / 2)) + _1n4;
  if (k1 < _0n4 || k1 >= MAX_NUM || k2 < _0n4 || k2 >= MAX_NUM) {
    throw new Error("splitScalar (endomorphism): failed, k=" + k);
  }
  return { k1neg, k1, k2neg, k2 };
}
function validateSigFormat(format) {
  if (!["compact", "recovered", "der"].includes(format))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return format;
}
function validateSigOpts(opts, def) {
  const optsn = {};
  for (let optName of Object.keys(def)) {
    optsn[optName] = opts[optName] === void 0 ? def[optName] : opts[optName];
  }
  _abool2(optsn.lowS, "lowS");
  _abool2(optsn.prehash, "prehash");
  if (optsn.format !== void 0) validateSigFormat(optsn.format);
  return optsn;
}
function _normFnElement(Fn2, key) {
  const { BYTES: expected } = Fn2;
  let num;
  if (typeof key === "bigint") {
    num = key;
  } else {
    let bytes = ensureBytes("private key", key);
    try {
      num = Fn2.fromBytes(bytes);
    } catch (error) {
      throw new Error(`invalid private key: expected ui8a of size ${expected}, got ${typeof key}`);
    }
  }
  if (!Fn2.isValidNot0(num)) throw new Error("invalid private key: out of range [1..N-1]");
  return num;
}
function weierstrassN(params, extraOpts = {}) {
  const validated = _createCurveFields("weierstrass", params, extraOpts);
  const { Fp: Fp5, Fn: Fn2 } = validated;
  let CURVE = validated.CURVE;
  const { h: cofactor, n: CURVE_ORDER } = CURVE;
  _validateObject(
    extraOpts,
    {},
    {
      allowInfinityPoint: "boolean",
      clearCofactor: "function",
      isTorsionFree: "function",
      fromBytes: "function",
      toBytes: "function",
      endo: "object",
      wrapPrivateKey: "boolean"
    }
  );
  const { endo } = extraOpts;
  if (endo) {
    if (!Fp5.is0(CURVE.a) || typeof endo.beta !== "bigint" || !Array.isArray(endo.basises)) {
      throw new Error('invalid endo: expected "beta": bigint and "basises": array');
    }
  }
  const lengths = getWLengths(Fp5, Fn2);
  function assertCompressionIsSupported() {
    if (!Fp5.isOdd) throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function pointToBytes(_c, point, isCompressed) {
    const { x, y } = point.toAffine();
    const bx = Fp5.toBytes(x);
    _abool2(isCompressed, "isCompressed");
    if (isCompressed) {
      assertCompressionIsSupported();
      const hasEvenY = !Fp5.isOdd(y);
      return concatBytes(pprefix(hasEvenY), bx);
    } else {
      return concatBytes(Uint8Array.of(4), bx, Fp5.toBytes(y));
    }
  }
  function pointFromBytes(bytes) {
    _abytes2(bytes, void 0, "Point");
    const { publicKey: comp, publicKeyUncompressed: uncomp } = lengths;
    const length = bytes.length;
    const head = bytes[0];
    const tail = bytes.subarray(1);
    if (length === comp && (head === 2 || head === 3)) {
      const x = Fp5.fromBytes(tail);
      if (!Fp5.isValid(x)) throw new Error("bad point: is not on curve, wrong x");
      const y2 = weierstrassEquation(x);
      let y;
      try {
        y = Fp5.sqrt(y2);
      } catch (sqrtError) {
        const err2 = sqrtError instanceof Error ? ": " + sqrtError.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + err2);
      }
      assertCompressionIsSupported();
      const isYOdd = Fp5.isOdd(y);
      const isHeadOdd = (head & 1) === 1;
      if (isHeadOdd !== isYOdd) y = Fp5.neg(y);
      return { x, y };
    } else if (length === uncomp && head === 4) {
      const L2 = Fp5.BYTES;
      const x = Fp5.fromBytes(tail.subarray(0, L2));
      const y = Fp5.fromBytes(tail.subarray(L2, L2 * 2));
      if (!isValidXY(x, y)) throw new Error("bad point: is not on curve");
      return { x, y };
    } else {
      throw new Error(
        `bad point: got length ${length}, expected compressed=${comp} or uncompressed=${uncomp}`
      );
    }
  }
  const encodePoint = extraOpts.toBytes || pointToBytes;
  const decodePoint = extraOpts.fromBytes || pointFromBytes;
  function weierstrassEquation(x) {
    const x2 = Fp5.sqr(x);
    const x3 = Fp5.mul(x2, x);
    return Fp5.add(Fp5.add(x3, Fp5.mul(x, CURVE.a)), CURVE.b);
  }
  function isValidXY(x, y) {
    const left = Fp5.sqr(y);
    const right = weierstrassEquation(x);
    return Fp5.eql(left, right);
  }
  if (!isValidXY(CURVE.Gx, CURVE.Gy)) throw new Error("bad curve params: generator point");
  const _4a3 = Fp5.mul(Fp5.pow(CURVE.a, _3n2), _4n2);
  const _27b2 = Fp5.mul(Fp5.sqr(CURVE.b), BigInt(27));
  if (Fp5.is0(Fp5.add(_4a3, _27b2))) throw new Error("bad curve params: a or b");
  function acoord(title, n, banZero = false) {
    if (!Fp5.isValid(n) || banZero && Fp5.is0(n)) throw new Error(`bad point coordinate ${title}`);
    return n;
  }
  function aprjpoint(other) {
    if (!(other instanceof Point)) throw new Error("ProjectivePoint expected");
  }
  function splitEndoScalarN(k) {
    if (!endo || !endo.basises) throw new Error("no endo");
    return _splitEndoScalar(k, endo.basises, Fn2.ORDER);
  }
  const toAffineMemo = memoized((p, iz) => {
    const { X: X2, Y: Y2, Z: Z2 } = p;
    if (Fp5.eql(Z2, Fp5.ONE)) return { x: X2, y: Y2 };
    const is0 = p.is0();
    if (iz == null) iz = is0 ? Fp5.ONE : Fp5.inv(Z2);
    const x = Fp5.mul(X2, iz);
    const y = Fp5.mul(Y2, iz);
    const zz = Fp5.mul(Z2, iz);
    if (is0) return { x: Fp5.ZERO, y: Fp5.ZERO };
    if (!Fp5.eql(zz, Fp5.ONE)) throw new Error("invZ was invalid");
    return { x, y };
  });
  const assertValidMemo = memoized((p) => {
    if (p.is0()) {
      if (extraOpts.allowInfinityPoint && !Fp5.is0(p.Y)) return;
      throw new Error("bad point: ZERO");
    }
    const { x, y } = p.toAffine();
    if (!Fp5.isValid(x) || !Fp5.isValid(y)) throw new Error("bad point: x or y not field elements");
    if (!isValidXY(x, y)) throw new Error("bad point: equation left != right");
    if (!p.isTorsionFree()) throw new Error("bad point: not in prime-order subgroup");
    return true;
  });
  function finishEndo(endoBeta, k1p, k2p, k1neg, k2neg) {
    k2p = new Point(Fp5.mul(k2p.X, endoBeta), k2p.Y, k2p.Z);
    k1p = negateCt(k1neg, k1p);
    k2p = negateCt(k2neg, k2p);
    return k1p.add(k2p);
  }
  class Point {
    static {
      // base / generator point
      this.BASE = new Point(CURVE.Gx, CURVE.Gy, Fp5.ONE);
    }
    static {
      // zero / infinity / identity point
      this.ZERO = new Point(Fp5.ZERO, Fp5.ONE, Fp5.ZERO);
    }
    static {
      // 0, 1, 0
      // math field
      this.Fp = Fp5;
    }
    static {
      // scalar field
      this.Fn = Fn2;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(X2, Y2, Z2) {
      this.X = acoord("x", X2);
      this.Y = acoord("y", Y2, true);
      this.Z = acoord("z", Z2);
      Object.freeze(this);
    }
    static CURVE() {
      return CURVE;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(p) {
      const { x, y } = p || {};
      if (!p || !Fp5.isValid(x) || !Fp5.isValid(y)) throw new Error("invalid affine point");
      if (p instanceof Point) throw new Error("projective point not allowed");
      if (Fp5.is0(x) && Fp5.is0(y)) return Point.ZERO;
      return new Point(x, y, Fp5.ONE);
    }
    static fromBytes(bytes) {
      const P = Point.fromAffine(decodePoint(_abytes2(bytes, void 0, "point")));
      P.assertValidity();
      return P;
    }
    static fromHex(hex) {
      return Point.fromBytes(ensureBytes("pointHex", hex));
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     *
     * @param windowSize
     * @param isLazy true will defer table computation until the first multiplication
     * @returns
     */
    precompute(windowSize = 8, isLazy = true) {
      wnaf.createCache(this, windowSize);
      if (!isLazy) this.multiply(_3n2);
      return this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      assertValidMemo(this);
    }
    hasEvenY() {
      const { y } = this.toAffine();
      if (!Fp5.isOdd) throw new Error("Field doesn't support isOdd");
      return !Fp5.isOdd(y);
    }
    /** Compare one point to another. */
    equals(other) {
      aprjpoint(other);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = other;
      const U1 = Fp5.eql(Fp5.mul(X1, Z2), Fp5.mul(X2, Z1));
      const U2 = Fp5.eql(Fp5.mul(Y1, Z2), Fp5.mul(Y2, Z1));
      return U1 && U2;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new Point(this.X, Fp5.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a, b } = CURVE;
      const b3 = Fp5.mul(b, _3n2);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      let X3 = Fp5.ZERO, Y3 = Fp5.ZERO, Z3 = Fp5.ZERO;
      let t0 = Fp5.mul(X1, X1);
      let t1 = Fp5.mul(Y1, Y1);
      let t2 = Fp5.mul(Z1, Z1);
      let t3 = Fp5.mul(X1, Y1);
      t3 = Fp5.add(t3, t3);
      Z3 = Fp5.mul(X1, Z1);
      Z3 = Fp5.add(Z3, Z3);
      X3 = Fp5.mul(a, Z3);
      Y3 = Fp5.mul(b3, t2);
      Y3 = Fp5.add(X3, Y3);
      X3 = Fp5.sub(t1, Y3);
      Y3 = Fp5.add(t1, Y3);
      Y3 = Fp5.mul(X3, Y3);
      X3 = Fp5.mul(t3, X3);
      Z3 = Fp5.mul(b3, Z3);
      t2 = Fp5.mul(a, t2);
      t3 = Fp5.sub(t0, t2);
      t3 = Fp5.mul(a, t3);
      t3 = Fp5.add(t3, Z3);
      Z3 = Fp5.add(t0, t0);
      t0 = Fp5.add(Z3, t0);
      t0 = Fp5.add(t0, t2);
      t0 = Fp5.mul(t0, t3);
      Y3 = Fp5.add(Y3, t0);
      t2 = Fp5.mul(Y1, Z1);
      t2 = Fp5.add(t2, t2);
      t0 = Fp5.mul(t2, t3);
      X3 = Fp5.sub(X3, t0);
      Z3 = Fp5.mul(t2, t1);
      Z3 = Fp5.add(Z3, Z3);
      Z3 = Fp5.add(Z3, Z3);
      return new Point(X3, Y3, Z3);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(other) {
      aprjpoint(other);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = other;
      let X3 = Fp5.ZERO, Y3 = Fp5.ZERO, Z3 = Fp5.ZERO;
      const a = CURVE.a;
      const b3 = Fp5.mul(CURVE.b, _3n2);
      let t0 = Fp5.mul(X1, X2);
      let t1 = Fp5.mul(Y1, Y2);
      let t2 = Fp5.mul(Z1, Z2);
      let t3 = Fp5.add(X1, Y1);
      let t4 = Fp5.add(X2, Y2);
      t3 = Fp5.mul(t3, t4);
      t4 = Fp5.add(t0, t1);
      t3 = Fp5.sub(t3, t4);
      t4 = Fp5.add(X1, Z1);
      let t5 = Fp5.add(X2, Z2);
      t4 = Fp5.mul(t4, t5);
      t5 = Fp5.add(t0, t2);
      t4 = Fp5.sub(t4, t5);
      t5 = Fp5.add(Y1, Z1);
      X3 = Fp5.add(Y2, Z2);
      t5 = Fp5.mul(t5, X3);
      X3 = Fp5.add(t1, t2);
      t5 = Fp5.sub(t5, X3);
      Z3 = Fp5.mul(a, t4);
      X3 = Fp5.mul(b3, t2);
      Z3 = Fp5.add(X3, Z3);
      X3 = Fp5.sub(t1, Z3);
      Z3 = Fp5.add(t1, Z3);
      Y3 = Fp5.mul(X3, Z3);
      t1 = Fp5.add(t0, t0);
      t1 = Fp5.add(t1, t0);
      t2 = Fp5.mul(a, t2);
      t4 = Fp5.mul(b3, t4);
      t1 = Fp5.add(t1, t2);
      t2 = Fp5.sub(t0, t2);
      t2 = Fp5.mul(a, t2);
      t4 = Fp5.add(t4, t2);
      t0 = Fp5.mul(t1, t4);
      Y3 = Fp5.add(Y3, t0);
      t0 = Fp5.mul(t5, t4);
      X3 = Fp5.mul(t3, X3);
      X3 = Fp5.sub(X3, t0);
      t0 = Fp5.mul(t3, t1);
      Z3 = Fp5.mul(t5, Z3);
      Z3 = Fp5.add(Z3, t0);
      return new Point(X3, Y3, Z3);
    }
    subtract(other) {
      return this.add(other.negate());
    }
    is0() {
      return this.equals(Point.ZERO);
    }
    /**
     * Constant time multiplication.
     * Uses wNAF method. Windowed method may be 10% faster,
     * but takes 2x longer to generate and consumes 2x memory.
     * Uses precomputes when available.
     * Uses endomorphism for Koblitz curves.
     * @param scalar by which the point would be multiplied
     * @returns New point
     */
    multiply(scalar) {
      const { endo: endo2 } = extraOpts;
      if (!Fn2.isValidNot0(scalar)) throw new Error("invalid scalar: out of range");
      let point, fake;
      const mul3 = (n) => wnaf.cached(this, n, (p) => normalizeZ(Point, p));
      if (endo2) {
        const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(scalar);
        const { p: k1p, f: k1f } = mul3(k1);
        const { p: k2p, f: k2f } = mul3(k2);
        fake = k1f.add(k2f);
        point = finishEndo(endo2.beta, k1p, k2p, k1neg, k2neg);
      } else {
        const { p, f } = mul3(scalar);
        point = p;
        fake = f;
      }
      return normalizeZ(Point, [point, fake])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(sc) {
      const { endo: endo2 } = extraOpts;
      const p = this;
      if (!Fn2.isValid(sc)) throw new Error("invalid scalar: out of range");
      if (sc === _0n4 || p.is0()) return Point.ZERO;
      if (sc === _1n4) return p;
      if (wnaf.hasCache(this)) return this.multiply(sc);
      if (endo2) {
        const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(sc);
        const { p1, p2 } = mulEndoUnsafe(Point, p, k1, k2);
        return finishEndo(endo2.beta, p1, p2, k1neg, k2neg);
      } else {
        return wnaf.unsafe(p, sc);
      }
    }
    multiplyAndAddUnsafe(Q, a, b) {
      const sum = this.multiplyUnsafe(a).add(Q.multiplyUnsafe(b));
      return sum.is0() ? void 0 : sum;
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(invertedZ) {
      return toAffineMemo(this, invertedZ);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree } = extraOpts;
      if (cofactor === _1n4) return true;
      if (isTorsionFree) return isTorsionFree(Point, this);
      return wnaf.unsafe(this, CURVE_ORDER).is0();
    }
    clearCofactor() {
      const { clearCofactor } = extraOpts;
      if (cofactor === _1n4) return this;
      if (clearCofactor) return clearCofactor(Point, this);
      return this.multiplyUnsafe(cofactor);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(cofactor).is0();
    }
    toBytes(isCompressed = true) {
      _abool2(isCompressed, "isCompressed");
      this.assertValidity();
      return encodePoint(Point, this, isCompressed);
    }
    toHex(isCompressed = true) {
      return bytesToHex(this.toBytes(isCompressed));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
    // TODO: remove
    get px() {
      return this.X;
    }
    get py() {
      return this.X;
    }
    get pz() {
      return this.Z;
    }
    toRawBytes(isCompressed = true) {
      return this.toBytes(isCompressed);
    }
    _setWindowSize(windowSize) {
      this.precompute(windowSize);
    }
    static normalizeZ(points) {
      return normalizeZ(Point, points);
    }
    static msm(points, scalars) {
      return pippenger(Point, Fn2, points, scalars);
    }
    static fromPrivateKey(privateKey) {
      return Point.BASE.multiply(_normFnElement(Fn2, privateKey));
    }
  }
  const bits2 = Fn2.BITS;
  const wnaf = new wNAF(Point, extraOpts.endo ? Math.ceil(bits2 / 2) : bits2);
  Point.BASE.precompute(8);
  return Point;
}
function pprefix(hasEvenY) {
  return Uint8Array.of(hasEvenY ? 2 : 3);
}
function getWLengths(Fp5, Fn2) {
  return {
    secretKey: Fn2.BYTES,
    publicKey: 1 + Fp5.BYTES,
    publicKeyUncompressed: 1 + 2 * Fp5.BYTES,
    publicKeyHasPrefix: true,
    signature: 2 * Fn2.BYTES
  };
}
function ecdh(Point, ecdhOpts = {}) {
  const { Fn: Fn2 } = Point;
  const randomBytes_ = ecdhOpts.randomBytes || randomBytes;
  const lengths = Object.assign(getWLengths(Point.Fp, Fn2), { seed: getMinHashLength(Fn2.ORDER) });
  function isValidSecretKey(secretKey) {
    try {
      return !!_normFnElement(Fn2, secretKey);
    } catch (error) {
      return false;
    }
  }
  function isValidPublicKey(publicKey, isCompressed) {
    const { publicKey: comp, publicKeyUncompressed } = lengths;
    try {
      const l = publicKey.length;
      if (isCompressed === true && l !== comp) return false;
      if (isCompressed === false && l !== publicKeyUncompressed) return false;
      return !!Point.fromBytes(publicKey);
    } catch (error) {
      return false;
    }
  }
  function randomSecretKey(seed = randomBytes_(lengths.seed)) {
    return mapHashToField(_abytes2(seed, lengths.seed, "seed"), Fn2.ORDER);
  }
  function getPublicKey(secretKey, isCompressed = true) {
    return Point.BASE.multiply(_normFnElement(Fn2, secretKey)).toBytes(isCompressed);
  }
  function keygen(seed) {
    const secretKey = randomSecretKey(seed);
    return { secretKey, publicKey: getPublicKey(secretKey) };
  }
  function isProbPub(item) {
    if (typeof item === "bigint") return false;
    if (item instanceof Point) return true;
    const { secretKey, publicKey, publicKeyUncompressed } = lengths;
    if (Fn2.allowedLengths || secretKey === publicKey) return void 0;
    const l = ensureBytes("key", item).length;
    return l === publicKey || l === publicKeyUncompressed;
  }
  function getSharedSecret(secretKeyA, publicKeyB, isCompressed = true) {
    if (isProbPub(secretKeyA) === true) throw new Error("first arg must be private key");
    if (isProbPub(publicKeyB) === false) throw new Error("second arg must be public key");
    const s = _normFnElement(Fn2, secretKeyA);
    const b = Point.fromHex(publicKeyB);
    return b.multiply(s).toBytes(isCompressed);
  }
  const utils = {
    isValidSecretKey,
    isValidPublicKey,
    randomSecretKey,
    // TODO: remove
    isValidPrivateKey: isValidSecretKey,
    randomPrivateKey: randomSecretKey,
    normPrivateKeyToScalar: (key) => _normFnElement(Fn2, key),
    precompute(windowSize = 8, point = Point.BASE) {
      return point.precompute(windowSize, false);
    }
  };
  return Object.freeze({ getPublicKey, getSharedSecret, keygen, Point, utils, lengths });
}
function ecdsa(Point, hash, ecdsaOpts = {}) {
  ahash(hash);
  _validateObject(
    ecdsaOpts,
    {},
    {
      hmac: "function",
      lowS: "boolean",
      randomBytes: "function",
      bits2int: "function",
      bits2int_modN: "function"
    }
  );
  const randomBytes2 = ecdsaOpts.randomBytes || randomBytes;
  const hmac2 = ecdsaOpts.hmac || ((key, ...msgs) => hmac(hash, key, concatBytes(...msgs)));
  const { Fp: Fp5, Fn: Fn2 } = Point;
  const { ORDER: CURVE_ORDER, BITS: fnBits } = Fn2;
  const { keygen, getPublicKey, getSharedSecret, utils, lengths } = ecdh(Point, ecdsaOpts);
  const defaultSigOpts = {
    prehash: false,
    lowS: typeof ecdsaOpts.lowS === "boolean" ? ecdsaOpts.lowS : false,
    format: void 0,
    //'compact' as ECDSASigFormat,
    extraEntropy: false
  };
  const defaultSigOpts_format = "compact";
  function isBiggerThanHalfOrder(number) {
    const HALF = CURVE_ORDER >> _1n4;
    return number > HALF;
  }
  function validateRS(title, num) {
    if (!Fn2.isValidNot0(num))
      throw new Error(`invalid signature ${title}: out of range 1..Point.Fn.ORDER`);
    return num;
  }
  function validateSigLength(bytes, format) {
    validateSigFormat(format);
    const size = lengths.signature;
    const sizer = format === "compact" ? size : format === "recovered" ? size + 1 : void 0;
    return _abytes2(bytes, sizer, `${format} signature`);
  }
  class Signature2 {
    constructor(r, s, recovery) {
      this.r = validateRS("r", r);
      this.s = validateRS("s", s);
      if (recovery != null) this.recovery = recovery;
      Object.freeze(this);
    }
    static fromBytes(bytes, format = defaultSigOpts_format) {
      validateSigLength(bytes, format);
      let recid;
      if (format === "der") {
        const { r: r2, s: s2 } = DER.toSig(_abytes2(bytes));
        return new Signature2(r2, s2);
      }
      if (format === "recovered") {
        recid = bytes[0];
        format = "compact";
        bytes = bytes.subarray(1);
      }
      const L2 = Fn2.BYTES;
      const r = bytes.subarray(0, L2);
      const s = bytes.subarray(L2, L2 * 2);
      return new Signature2(Fn2.fromBytes(r), Fn2.fromBytes(s), recid);
    }
    static fromHex(hex, format) {
      return this.fromBytes(hexToBytes(hex), format);
    }
    addRecoveryBit(recovery) {
      return new Signature2(this.r, this.s, recovery);
    }
    recoverPublicKey(messageHash) {
      const FIELD_ORDER = Fp5.ORDER;
      const { r, s, recovery: rec } = this;
      if (rec == null || ![0, 1, 2, 3].includes(rec)) throw new Error("recovery id invalid");
      const hasCofactor = CURVE_ORDER * _2n2 < FIELD_ORDER;
      if (hasCofactor && rec > 1) throw new Error("recovery id is ambiguous for h>1 curve");
      const radj = rec === 2 || rec === 3 ? r + CURVE_ORDER : r;
      if (!Fp5.isValid(radj)) throw new Error("recovery id 2 or 3 invalid");
      const x = Fp5.toBytes(radj);
      const R = Point.fromBytes(concatBytes(pprefix((rec & 1) === 0), x));
      const ir = Fn2.inv(radj);
      const h = bits2int_modN(ensureBytes("msgHash", messageHash));
      const u1 = Fn2.create(-h * ir);
      const u2 = Fn2.create(s * ir);
      const Q = Point.BASE.multiplyUnsafe(u1).add(R.multiplyUnsafe(u2));
      if (Q.is0()) throw new Error("point at infinify");
      Q.assertValidity();
      return Q;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return isBiggerThanHalfOrder(this.s);
    }
    toBytes(format = defaultSigOpts_format) {
      validateSigFormat(format);
      if (format === "der") return hexToBytes(DER.hexFromSig(this));
      const r = Fn2.toBytes(this.r);
      const s = Fn2.toBytes(this.s);
      if (format === "recovered") {
        if (this.recovery == null) throw new Error("recovery bit must be present");
        return concatBytes(Uint8Array.of(this.recovery), r, s);
      }
      return concatBytes(r, s);
    }
    toHex(format) {
      return bytesToHex(this.toBytes(format));
    }
    // TODO: remove
    assertValidity() {
    }
    static fromCompact(hex) {
      return Signature2.fromBytes(ensureBytes("sig", hex), "compact");
    }
    static fromDER(hex) {
      return Signature2.fromBytes(ensureBytes("sig", hex), "der");
    }
    normalizeS() {
      return this.hasHighS() ? new Signature2(this.r, Fn2.neg(this.s), this.recovery) : this;
    }
    toDERRawBytes() {
      return this.toBytes("der");
    }
    toDERHex() {
      return bytesToHex(this.toBytes("der"));
    }
    toCompactRawBytes() {
      return this.toBytes("compact");
    }
    toCompactHex() {
      return bytesToHex(this.toBytes("compact"));
    }
  }
  const bits2int = ecdsaOpts.bits2int || function bits2int_def(bytes) {
    if (bytes.length > 8192) throw new Error("input is too large");
    const num = bytesToNumberBE(bytes);
    const delta = bytes.length * 8 - fnBits;
    return delta > 0 ? num >> BigInt(delta) : num;
  };
  const bits2int_modN = ecdsaOpts.bits2int_modN || function bits2int_modN_def(bytes) {
    return Fn2.create(bits2int(bytes));
  };
  const ORDER_MASK = bitMask(fnBits);
  function int2octets(num) {
    aInRange("num < 2^" + fnBits, num, _0n4, ORDER_MASK);
    return Fn2.toBytes(num);
  }
  function validateMsgAndHash(message, prehash) {
    _abytes2(message, void 0, "message");
    return prehash ? _abytes2(hash(message), void 0, "prehashed message") : message;
  }
  function prepSig(message, privateKey, opts) {
    if (["recovered", "canonical"].some((k) => k in opts))
      throw new Error("sign() legacy options not supported");
    const { lowS, prehash, extraEntropy } = validateSigOpts(opts, defaultSigOpts);
    message = validateMsgAndHash(message, prehash);
    const h1int = bits2int_modN(message);
    const d = _normFnElement(Fn2, privateKey);
    const seedArgs = [int2octets(d), int2octets(h1int)];
    if (extraEntropy != null && extraEntropy !== false) {
      const e = extraEntropy === true ? randomBytes2(lengths.secretKey) : extraEntropy;
      seedArgs.push(ensureBytes("extraEntropy", e));
    }
    const seed = concatBytes(...seedArgs);
    const m = h1int;
    function k2sig(kBytes) {
      const k = bits2int(kBytes);
      if (!Fn2.isValidNot0(k)) return;
      const ik = Fn2.inv(k);
      const q = Point.BASE.multiply(k).toAffine();
      const r = Fn2.create(q.x);
      if (r === _0n4) return;
      const s = Fn2.create(ik * Fn2.create(m + r * d));
      if (s === _0n4) return;
      let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n4);
      let normS = s;
      if (lowS && isBiggerThanHalfOrder(s)) {
        normS = Fn2.neg(s);
        recovery ^= 1;
      }
      return new Signature2(r, normS, recovery);
    }
    return { seed, k2sig };
  }
  function sign8(message, secretKey, opts = {}) {
    message = ensureBytes("message", message);
    const { seed, k2sig } = prepSig(message, secretKey, opts);
    const drbg = createHmacDrbg(hash.outputLen, Fn2.BYTES, hmac2);
    const sig = drbg(seed, k2sig);
    return sig;
  }
  function tryParsingSig(sg) {
    let sig = void 0;
    const isHex = typeof sg === "string" || isBytes(sg);
    const isObj = !isHex && sg !== null && typeof sg === "object" && typeof sg.r === "bigint" && typeof sg.s === "bigint";
    if (!isHex && !isObj)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    if (isObj) {
      sig = new Signature2(sg.r, sg.s);
    } else if (isHex) {
      try {
        sig = Signature2.fromBytes(ensureBytes("sig", sg), "der");
      } catch (derError) {
        if (!(derError instanceof DER.Err)) throw derError;
      }
      if (!sig) {
        try {
          sig = Signature2.fromBytes(ensureBytes("sig", sg), "compact");
        } catch (error) {
          return false;
        }
      }
    }
    if (!sig) return false;
    return sig;
  }
  function verify8(signature, message, publicKey, opts = {}) {
    const { lowS, prehash, format } = validateSigOpts(opts, defaultSigOpts);
    publicKey = ensureBytes("publicKey", publicKey);
    message = validateMsgAndHash(ensureBytes("message", message), prehash);
    if ("strict" in opts) throw new Error("options.strict was renamed to lowS");
    const sig = format === void 0 ? tryParsingSig(signature) : Signature2.fromBytes(ensureBytes("sig", signature), format);
    if (sig === false) return false;
    try {
      const P = Point.fromBytes(publicKey);
      if (lowS && sig.hasHighS()) return false;
      const { r, s } = sig;
      const h = bits2int_modN(message);
      const is = Fn2.inv(s);
      const u1 = Fn2.create(h * is);
      const u2 = Fn2.create(r * is);
      const R = Point.BASE.multiplyUnsafe(u1).add(P.multiplyUnsafe(u2));
      if (R.is0()) return false;
      const v = Fn2.create(R.x);
      return v === r;
    } catch (e) {
      return false;
    }
  }
  function recoverPublicKey(signature, message, opts = {}) {
    const { prehash } = validateSigOpts(opts, defaultSigOpts);
    message = validateMsgAndHash(message, prehash);
    return Signature2.fromBytes(signature, "recovered").recoverPublicKey(message).toBytes();
  }
  return Object.freeze({
    keygen,
    getPublicKey,
    getSharedSecret,
    utils,
    lengths,
    Point,
    sign: sign8,
    verify: verify8,
    recoverPublicKey,
    Signature: Signature2,
    hash
  });
}
function _weierstrass_legacy_opts_to_new(c) {
  const CURVE = {
    a: c.a,
    b: c.b,
    p: c.Fp.ORDER,
    n: c.n,
    h: c.h,
    Gx: c.Gx,
    Gy: c.Gy
  };
  const Fp5 = c.Fp;
  let allowedLengths = c.allowedPrivateKeyLengths ? Array.from(new Set(c.allowedPrivateKeyLengths.map((l) => Math.ceil(l / 2)))) : void 0;
  const Fn2 = Field(CURVE.n, {
    BITS: c.nBitLength,
    allowedLengths,
    modFromBytes: c.wrapPrivateKey
  });
  const curveOpts = {
    Fp: Fp5,
    Fn: Fn2,
    allowInfinityPoint: c.allowInfinityPoint,
    endo: c.endo,
    isTorsionFree: c.isTorsionFree,
    clearCofactor: c.clearCofactor,
    fromBytes: c.fromBytes,
    toBytes: c.toBytes
  };
  return { CURVE, curveOpts };
}
function _ecdsa_legacy_opts_to_new(c) {
  const { CURVE, curveOpts } = _weierstrass_legacy_opts_to_new(c);
  const ecdsaOpts = {
    hmac: c.hmac,
    randomBytes: c.randomBytes,
    lowS: c.lowS,
    bits2int: c.bits2int,
    bits2int_modN: c.bits2int_modN
  };
  return { CURVE, curveOpts, hash: c.hash, ecdsaOpts };
}
function _ecdsa_new_output_to_legacy(c, _ecdsa) {
  const Point = _ecdsa.Point;
  return Object.assign({}, _ecdsa, {
    ProjectivePoint: Point,
    CURVE: Object.assign({}, c, nLength(Point.Fn.ORDER, Point.Fn.BITS))
  });
}
function weierstrass(c) {
  const { CURVE, curveOpts, hash, ecdsaOpts } = _ecdsa_legacy_opts_to_new(c);
  const Point = weierstrassN(CURVE, curveOpts);
  const signs = ecdsa(Point, hash, ecdsaOpts);
  return _ecdsa_new_output_to_legacy(c, signs);
}
var divNearest, DERErr, DER, _0n4, _1n4, _2n2, _3n2, _4n2;
var init_weierstrass = __esm({
  "vendor/src/noble-curves/src/abstract/weierstrass.ts"() {
    init_hmac();
    init_utils();
    init_utils2();
    init_curve();
    init_modular();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    divNearest = (num, den) => (num + (num >= 0 ? den : -den) / _2n2) / den;
    DERErr = class extends Error {
      constructor(m = "") {
        super(m);
      }
    };
    DER = {
      // asn.1 DER encoding utils
      Err: DERErr,
      // Basic building block is TLV (Tag-Length-Value)
      _tlv: {
        encode: (tag, data) => {
          const { Err: E } = DER;
          if (tag < 0 || tag > 256) throw new E("tlv.encode: wrong tag");
          if (data.length & 1) throw new E("tlv.encode: unpadded data");
          const dataLen = data.length / 2;
          const len = numberToHexUnpadded(dataLen);
          if (len.length / 2 & 128) throw new E("tlv.encode: long form length too big");
          const lenLen = dataLen > 127 ? numberToHexUnpadded(len.length / 2 | 128) : "";
          const t = numberToHexUnpadded(tag);
          return t + lenLen + len + data;
        },
        // v - value, l - left bytes (unparsed)
        decode(tag, data) {
          const { Err: E } = DER;
          let pos = 0;
          if (tag < 0 || tag > 256) throw new E("tlv.encode: wrong tag");
          if (data.length < 2 || data[pos++] !== tag) throw new E("tlv.decode: wrong tlv");
          const first = data[pos++];
          const isLong = !!(first & 128);
          let length = 0;
          if (!isLong) length = first;
          else {
            const lenLen = first & 127;
            if (!lenLen) throw new E("tlv.decode(long): indefinite length not supported");
            if (lenLen > 4) throw new E("tlv.decode(long): byte length is too big");
            const lengthBytes = data.subarray(pos, pos + lenLen);
            if (lengthBytes.length !== lenLen) throw new E("tlv.decode: length bytes not complete");
            if (lengthBytes[0] === 0) throw new E("tlv.decode(long): zero leftmost byte");
            for (const b of lengthBytes) length = length << 8 | b;
            pos += lenLen;
            if (length < 128) throw new E("tlv.decode(long): not minimal encoding");
          }
          const v = data.subarray(pos, pos + length);
          if (v.length !== length) throw new E("tlv.decode: wrong value length");
          return { v, l: data.subarray(pos + length) };
        }
      },
      // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
      // since we always use positive integers here. It must always be empty:
      // - add zero byte if exists
      // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
      _int: {
        encode(num) {
          const { Err: E } = DER;
          if (num < _0n4) throw new E("integer: negative integers are not allowed");
          let hex = numberToHexUnpadded(num);
          if (Number.parseInt(hex[0], 16) & 8) hex = "00" + hex;
          if (hex.length & 1) throw new E("unexpected DER parsing assertion: unpadded hex");
          return hex;
        },
        decode(data) {
          const { Err: E } = DER;
          if (data[0] & 128) throw new E("invalid signature integer: negative");
          if (data[0] === 0 && !(data[1] & 128))
            throw new E("invalid signature integer: unnecessary leading zero");
          return bytesToNumberBE(data);
        }
      },
      toSig(hex) {
        const { Err: E, _int: int, _tlv: tlv } = DER;
        const data = ensureBytes("signature", hex);
        const { v: seqBytes, l: seqLeftBytes } = tlv.decode(48, data);
        if (seqLeftBytes.length) throw new E("invalid signature: left bytes after parsing");
        const { v: rBytes, l: rLeftBytes } = tlv.decode(2, seqBytes);
        const { v: sBytes, l: sLeftBytes } = tlv.decode(2, rLeftBytes);
        if (sLeftBytes.length) throw new E("invalid signature: left bytes after parsing");
        return { r: int.decode(rBytes), s: int.decode(sBytes) };
      },
      hexFromSig(sig) {
        const { _tlv: tlv, _int: int } = DER;
        const rs = tlv.encode(2, int.encode(sig.r));
        const ss = tlv.encode(2, int.encode(sig.s));
        const seq = rs + ss;
        return tlv.encode(48, seq);
      }
    };
    _0n4 = BigInt(0);
    _1n4 = BigInt(1);
    _2n2 = BigInt(2);
    _3n2 = BigInt(3);
    _4n2 = BigInt(4);
  }
});

// vendor/src/noble-curves/src/_shortw_utils.ts
function createCurve(curveDef, defHash) {
  const create = (hash) => weierstrass({ ...curveDef, hash });
  return { ...create(defHash), create };
}
var init_shortw_utils = __esm({
  "vendor/src/noble-curves/src/_shortw_utils.ts"() {
    init_weierstrass();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
  }
});

// vendor/src/noble-curves/src/abstract/hash-to-curve.ts
var _DST_scalar;
var init_hash_to_curve = __esm({
  "vendor/src/noble-curves/src/abstract/hash-to-curve.ts"() {
    init_utils2();
    init_modular();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    _DST_scalar = utf8ToBytes("HashToScalar-");
  }
});

// vendor/src/noble-curves/src/nist.ts
var p256_CURVE, p384_CURVE, p521_CURVE, Fp256, Fp384, Fp521, p256, p384, p521;
var init_nist = __esm({
  "vendor/src/noble-curves/src/nist.ts"() {
    init_sha2();
    init_shortw_utils();
    init_hash_to_curve();
    init_modular();
    init_weierstrass();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    p256_CURVE = {
      p: BigInt("0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff"),
      n: BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551"),
      h: BigInt(1),
      a: BigInt("0xffffffff00000001000000000000000000000000fffffffffffffffffffffffc"),
      b: BigInt("0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b"),
      Gx: BigInt("0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296"),
      Gy: BigInt("0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5")
    };
    p384_CURVE = {
      p: BigInt(
        "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffff"
      ),
      n: BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973"
      ),
      h: BigInt(1),
      a: BigInt(
        "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000fffffffc"
      ),
      b: BigInt(
        "0xb3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aef"
      ),
      Gx: BigInt(
        "0xaa87ca22be8b05378eb1c71ef320ad746e1d3b628ba79b9859f741e082542a385502f25dbf55296c3a545e3872760ab7"
      ),
      Gy: BigInt(
        "0x3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c00a60b1ce1d7e819d7a431d7c90ea0e5f"
      )
    };
    p521_CURVE = {
      p: BigInt(
        "0x1ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      ),
      n: BigInt(
        "0x01fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa51868783bf2f966b7fcc0148f709a5d03bb5c9b8899c47aebb6fb71e91386409"
      ),
      h: BigInt(1),
      a: BigInt(
        "0x1fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc"
      ),
      b: BigInt(
        "0x0051953eb9618e1c9a1f929a21a0b68540eea2da725b99b315f3b8b489918ef109e156193951ec7e937b1652c0bd3bb1bf073573df883d2c34f1ef451fd46b503f00"
      ),
      Gx: BigInt(
        "0x00c6858e06b70404e9cd9e3ecb662395b4429c648139053fb521f828af606b4d3dbaa14b5e77efe75928fe1dc127a2ffa8de3348b3c1856a429bf97e7e31c2e5bd66"
      ),
      Gy: BigInt(
        "0x011839296a789a3bc0045c8a5fb42c7d1bd998f54449579b446817afbd17273e662c97ee72995ef42640c550b9013fad0761353c7086a272c24088be94769fd16650"
      )
    };
    Fp256 = Field(p256_CURVE.p);
    Fp384 = Field(p384_CURVE.p);
    Fp521 = Field(p521_CURVE.p);
    p256 = createCurve(
      { ...p256_CURVE, Fp: Fp256, lowS: false },
      sha256
    );
    p384 = createCurve(
      { ...p384_CURVE, Fp: Fp384, lowS: false },
      sha384
    );
    p521 = createCurve(
      { ...p521_CURVE, Fp: Fp521, lowS: false, allowedPrivateKeyLengths: [130, 131, 132] },
      sha512
    );
  }
});

// vendor/src/noble-curves/src/p256.ts
var p2562;
var init_p256 = __esm({
  "vendor/src/noble-curves/src/p256.ts"() {
    init_nist();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    p2562 = p256;
  }
});

// vendor/src/noble-curves/src/p384.ts
var p3842;
var init_p384 = __esm({
  "vendor/src/noble-curves/src/p384.ts"() {
    init_nist();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    p3842 = p384;
  }
});

// vendor/src/noble-curves/src/p521.ts
var p5212;
var init_p521 = __esm({
  "vendor/src/noble-curves/src/p521.ts"() {
    init_nist();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    p5212 = p521;
  }
});

// vendor/src/noble-hashes/src/sha3.ts
function keccakP(s, rounds = 24) {
  const B = new Uint32Array(5 * 2);
  for (let round = 24 - rounds; round < 24; round++) {
    for (let x = 0; x < 10; x++) B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    for (let x = 0; x < 10; x += 2) {
      const idx1 = (x + 8) % 10;
      const idx0 = (x + 2) % 10;
      const B0 = B[idx0];
      const B1 = B[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
      for (let y = 0; y < 50; y += 10) {
        s[x + y] ^= Th;
        s[x + y + 1] ^= Tl;
      }
    }
    let curH = s[2];
    let curL = s[3];
    for (let t = 0; t < 24; t++) {
      const shift = SHA3_ROTL[t];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = Th;
      s[PI + 1] = Tl;
    }
    for (let y = 0; y < 50; y += 10) {
      for (let x = 0; x < 10; x++) B[x] = s[y + x];
      for (let x = 0; x < 10; x++) s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
    }
    s[0] ^= SHA3_IOTA_H[round];
    s[1] ^= SHA3_IOTA_L[round];
  }
  clean(B);
}
var _0n5, _1n5, _2n3, _7n2, _256n, _0x71n, SHA3_PI, SHA3_ROTL, _SHA3_IOTA, IOTAS, SHA3_IOTA_H, SHA3_IOTA_L, rotlH, rotlL, Keccak, gen, sha3_256, sha3_512, genShake, shake256;
var init_sha3 = __esm({
  "vendor/src/noble-hashes/src/sha3.ts"() {
    init_u64();
    init_utils();
    _0n5 = BigInt(0);
    _1n5 = BigInt(1);
    _2n3 = BigInt(2);
    _7n2 = BigInt(7);
    _256n = BigInt(256);
    _0x71n = BigInt(113);
    SHA3_PI = [];
    SHA3_ROTL = [];
    _SHA3_IOTA = [];
    for (let round = 0, R = _1n5, x = 1, y = 0; round < 24; round++) {
      [x, y] = [y, (2 * x + 3 * y) % 5];
      SHA3_PI.push(2 * (5 * y + x));
      SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
      let t = _0n5;
      for (let j = 0; j < 7; j++) {
        R = (R << _1n5 ^ (R >> _7n2) * _0x71n) % _256n;
        if (R & _2n3) t ^= _1n5 << (_1n5 << /* @__PURE__ */ BigInt(j)) - _1n5;
      }
      _SHA3_IOTA.push(t);
    }
    IOTAS = split(_SHA3_IOTA, true);
    SHA3_IOTA_H = IOTAS[0];
    SHA3_IOTA_L = IOTAS[1];
    rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
    rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
    Keccak = class _Keccak extends Hash {
      // NOTE: we accept arguments in bytes instead of bits here.
      constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
        super();
        this.pos = 0;
        this.posOut = 0;
        this.finished = false;
        this.destroyed = false;
        this.enableXOF = false;
        this.blockLen = blockLen;
        this.suffix = suffix;
        this.outputLen = outputLen;
        this.enableXOF = enableXOF;
        this.rounds = rounds;
        anumber(outputLen);
        if (!(0 < blockLen && blockLen < 200))
          throw new Error("only keccak-f1600 function is supported");
        this.state = new Uint8Array(200);
        this.state32 = u32(this.state);
      }
      clone() {
        return this._cloneInto();
      }
      keccak() {
        swap32IfBE(this.state32);
        keccakP(this.state32, this.rounds);
        swap32IfBE(this.state32);
        this.posOut = 0;
        this.pos = 0;
      }
      update(data) {
        aexists(this);
        data = toBytes(data);
        abytes(data);
        const { blockLen, state } = this;
        const len = data.length;
        for (let pos = 0; pos < len; ) {
          const take = Math.min(blockLen - this.pos, len - pos);
          for (let i = 0; i < take; i++) state[this.pos++] ^= data[pos++];
          if (this.pos === blockLen) this.keccak();
        }
        return this;
      }
      finish() {
        if (this.finished) return;
        this.finished = true;
        const { state, suffix, pos, blockLen } = this;
        state[pos] ^= suffix;
        if ((suffix & 128) !== 0 && pos === blockLen - 1) this.keccak();
        state[blockLen - 1] ^= 128;
        this.keccak();
      }
      writeInto(out) {
        aexists(this, false);
        abytes(out);
        this.finish();
        const bufferOut = this.state;
        const { blockLen } = this;
        for (let pos = 0, len = out.length; pos < len; ) {
          if (this.posOut >= blockLen) this.keccak();
          const take = Math.min(blockLen - this.posOut, len - pos);
          out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
          this.posOut += take;
          pos += take;
        }
        return out;
      }
      xofInto(out) {
        if (!this.enableXOF) throw new Error("XOF is not possible for this instance");
        return this.writeInto(out);
      }
      xof(bytes) {
        anumber(bytes);
        return this.xofInto(new Uint8Array(bytes));
      }
      digestInto(out) {
        aoutput(out, this);
        if (this.finished) throw new Error("digest() was already called");
        this.writeInto(out);
        this.destroy();
        return out;
      }
      digest() {
        return this.digestInto(new Uint8Array(this.outputLen));
      }
      destroy() {
        this.destroyed = true;
        clean(this.state);
      }
      _cloneInto(to) {
        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
        to ||= new _Keccak(blockLen, suffix, outputLen, enableXOF, rounds);
        to.state32.set(this.state32);
        to.pos = this.pos;
        to.posOut = this.posOut;
        to.finished = this.finished;
        to.rounds = rounds;
        to.suffix = suffix;
        to.outputLen = outputLen;
        to.enableXOF = enableXOF;
        to.destroyed = this.destroyed;
        return to;
      }
    };
    gen = (suffix, blockLen, outputLen) => createHasher(() => new Keccak(blockLen, suffix, outputLen));
    sha3_256 = /* @__PURE__ */ (() => gen(6, 136, 256 / 8))();
    sha3_512 = /* @__PURE__ */ (() => gen(6, 72, 512 / 8))();
    genShake = (suffix, blockLen, outputLen) => createXOFer(
      (opts = {}) => new Keccak(blockLen, suffix, opts.dkLen === void 0 ? outputLen : opts.dkLen, true)
    );
    shake256 = /* @__PURE__ */ (() => genShake(31, 136, 256 / 8))();
  }
});

// vendor/src/noble-curves/src/abstract/edwards.ts
function isEdValidXY(Fp5, CURVE, x, y) {
  const x2 = Fp5.sqr(x);
  const y2 = Fp5.sqr(y);
  const left = Fp5.add(Fp5.mul(CURVE.a, x2), y2);
  const right = Fp5.add(Fp5.ONE, Fp5.mul(CURVE.d, Fp5.mul(x2, y2)));
  return Fp5.eql(left, right);
}
function edwards(params, extraOpts = {}) {
  const validated = _createCurveFields("edwards", params, extraOpts, extraOpts.FpFnLE);
  const { Fp: Fp5, Fn: Fn2 } = validated;
  let CURVE = validated.CURVE;
  const { h: cofactor } = CURVE;
  _validateObject(extraOpts, {}, { uvRatio: "function" });
  const MASK = _2n4 << BigInt(Fn2.BYTES * 8) - _1n6;
  const modP = (n) => Fp5.create(n);
  const uvRatio2 = extraOpts.uvRatio || ((u, v) => {
    try {
      return { isValid: true, value: Fp5.sqrt(Fp5.div(u, v)) };
    } catch (e) {
      return { isValid: false, value: _0n6 };
    }
  });
  if (!isEdValidXY(Fp5, CURVE, CURVE.Gx, CURVE.Gy))
    throw new Error("bad curve params: generator point");
  function acoord(title, n, banZero = false) {
    const min = banZero ? _1n6 : _0n6;
    aInRange("coordinate " + title, n, min, MASK);
    return n;
  }
  function aextpoint(other) {
    if (!(other instanceof Point)) throw new Error("ExtendedPoint expected");
  }
  const toAffineMemo = memoized((p, iz) => {
    const { X: X2, Y: Y2, Z: Z2 } = p;
    const is0 = p.is0();
    if (iz == null) iz = is0 ? _8n2 : Fp5.inv(Z2);
    const x = modP(X2 * iz);
    const y = modP(Y2 * iz);
    const zz = Fp5.mul(Z2, iz);
    if (is0) return { x: _0n6, y: _1n6 };
    if (zz !== _1n6) throw new Error("invZ was invalid");
    return { x, y };
  });
  const assertValidMemo = memoized((p) => {
    const { a, d } = CURVE;
    if (p.is0()) throw new Error("bad point: ZERO");
    const { X: X2, Y: Y2, Z: Z2, T } = p;
    const X22 = modP(X2 * X2);
    const Y22 = modP(Y2 * Y2);
    const Z22 = modP(Z2 * Z2);
    const Z4 = modP(Z22 * Z22);
    const aX2 = modP(X22 * a);
    const left = modP(Z22 * modP(aX2 + Y22));
    const right = modP(Z4 + modP(d * modP(X22 * Y22)));
    if (left !== right) throw new Error("bad point: equation left != right (1)");
    const XY = modP(X2 * Y2);
    const ZT = modP(Z2 * T);
    if (XY !== ZT) throw new Error("bad point: equation left != right (2)");
    return true;
  });
  class Point {
    static {
      // base / generator point
      this.BASE = new Point(CURVE.Gx, CURVE.Gy, _1n6, modP(CURVE.Gx * CURVE.Gy));
    }
    static {
      // zero / infinity / identity point
      this.ZERO = new Point(_0n6, _1n6, _1n6, _0n6);
    }
    static {
      // 0, 1, 1, 0
      // math field
      this.Fp = Fp5;
    }
    static {
      // scalar field
      this.Fn = Fn2;
    }
    constructor(X2, Y2, Z2, T) {
      this.X = acoord("x", X2);
      this.Y = acoord("y", Y2);
      this.Z = acoord("z", Z2, true);
      this.T = acoord("t", T);
      Object.freeze(this);
    }
    static CURVE() {
      return CURVE;
    }
    static fromAffine(p) {
      if (p instanceof Point) throw new Error("extended point not allowed");
      const { x, y } = p || {};
      acoord("x", x);
      acoord("y", y);
      return new Point(x, y, _1n6, modP(x * y));
    }
    // Uses algo from RFC8032 5.1.3.
    static fromBytes(bytes, zip215 = false) {
      const len = Fp5.BYTES;
      const { a, d } = CURVE;
      bytes = copyBytes(_abytes2(bytes, len, "point"));
      _abool2(zip215, "zip215");
      const normed = copyBytes(bytes);
      const lastByte = bytes[len - 1];
      normed[len - 1] = lastByte & ~128;
      const y = bytesToNumberLE(normed);
      const max2 = zip215 ? MASK : Fp5.ORDER;
      aInRange("point.y", y, _0n6, max2);
      const y2 = modP(y * y);
      const u = modP(y2 - _1n6);
      const v = modP(d * y2 - a);
      let { isValid, value: x } = uvRatio2(u, v);
      if (!isValid) throw new Error("bad point: invalid y coordinate");
      const isXOdd = (x & _1n6) === _1n6;
      const isLastByteOdd = (lastByte & 128) !== 0;
      if (!zip215 && x === _0n6 && isLastByteOdd)
        throw new Error("bad point: x=0 and x_0=1");
      if (isLastByteOdd !== isXOdd) x = modP(-x);
      return Point.fromAffine({ x, y });
    }
    static fromHex(bytes, zip215 = false) {
      return Point.fromBytes(ensureBytes("point", bytes), zip215);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    precompute(windowSize = 8, isLazy = true) {
      wnaf.createCache(this, windowSize);
      if (!isLazy) this.multiply(_2n4);
      return this;
    }
    // Useful in fromAffine() - not for fromBytes(), which always created valid points.
    assertValidity() {
      assertValidMemo(this);
    }
    // Compare one point to another.
    equals(other) {
      aextpoint(other);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = other;
      const X1Z2 = modP(X1 * Z2);
      const X2Z1 = modP(X2 * Z1);
      const Y1Z2 = modP(Y1 * Z2);
      const Y2Z1 = modP(Y2 * Z1);
      return X1Z2 === X2Z1 && Y1Z2 === Y2Z1;
    }
    is0() {
      return this.equals(Point.ZERO);
    }
    negate() {
      return new Point(modP(-this.X), this.Y, this.Z, modP(-this.T));
    }
    // Fast algo for doubling Extended Point.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
    // Cost: 4M + 4S + 1*a + 6add + 1*2.
    double() {
      const { a } = CURVE;
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const A2 = modP(X1 * X1);
      const B = modP(Y1 * Y1);
      const C = modP(_2n4 * modP(Z1 * Z1));
      const D3 = modP(a * A2);
      const x1y1 = X1 + Y1;
      const E = modP(modP(x1y1 * x1y1) - A2 - B);
      const G3 = D3 + B;
      const F = G3 - C;
      const H = D3 - B;
      const X3 = modP(E * F);
      const Y3 = modP(G3 * H);
      const T3 = modP(E * H);
      const Z3 = modP(F * G3);
      return new Point(X3, Y3, Z3, T3);
    }
    // Fast algo for adding 2 Extended Points.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
    // Cost: 9M + 1*a + 1*d + 7add.
    add(other) {
      aextpoint(other);
      const { a, d } = CURVE;
      const { X: X1, Y: Y1, Z: Z1, T: T1 } = this;
      const { X: X2, Y: Y2, Z: Z2, T: T2 } = other;
      const A2 = modP(X1 * X2);
      const B = modP(Y1 * Y2);
      const C = modP(T1 * d * T2);
      const D3 = modP(Z1 * Z2);
      const E = modP((X1 + Y1) * (X2 + Y2) - A2 - B);
      const F = D3 - C;
      const G3 = D3 + C;
      const H = modP(B - a * A2);
      const X3 = modP(E * F);
      const Y3 = modP(G3 * H);
      const T3 = modP(E * H);
      const Z3 = modP(F * G3);
      return new Point(X3, Y3, Z3, T3);
    }
    subtract(other) {
      return this.add(other.negate());
    }
    // Constant-time multiplication.
    multiply(scalar) {
      if (!Fn2.isValidNot0(scalar)) throw new Error("invalid scalar: expected 1 <= sc < curve.n");
      const { p, f } = wnaf.cached(this, scalar, (p2) => normalizeZ(Point, p2));
      return normalizeZ(Point, [p, f])[0];
    }
    // Non-constant-time multiplication. Uses double-and-add algorithm.
    // It's faster, but should only be used when you don't care about
    // an exposed private key e.g. sig verification.
    // Does NOT allow scalars higher than CURVE.n.
    // Accepts optional accumulator to merge with multiply (important for sparse scalars)
    multiplyUnsafe(scalar, acc = Point.ZERO) {
      if (!Fn2.isValid(scalar)) throw new Error("invalid scalar: expected 0 <= sc < curve.n");
      if (scalar === _0n6) return Point.ZERO;
      if (this.is0() || scalar === _1n6) return this;
      return wnaf.unsafe(this, scalar, (p) => normalizeZ(Point, p), acc);
    }
    // Checks if point is of small order.
    // If you add something to small order point, you will have "dirty"
    // point with torsion component.
    // Multiplies point by cofactor and checks if the result is 0.
    isSmallOrder() {
      return this.multiplyUnsafe(cofactor).is0();
    }
    // Multiplies point by curve order and checks if the result is 0.
    // Returns `false` is the point is dirty.
    isTorsionFree() {
      return wnaf.unsafe(this, CURVE.n).is0();
    }
    // Converts Extended point to default (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    toAffine(invertedZ) {
      return toAffineMemo(this, invertedZ);
    }
    clearCofactor() {
      if (cofactor === _1n6) return this;
      return this.multiplyUnsafe(cofactor);
    }
    toBytes() {
      const { x, y } = this.toAffine();
      const bytes = Fp5.toBytes(y);
      bytes[bytes.length - 1] |= x & _1n6 ? 128 : 0;
      return bytes;
    }
    toHex() {
      return bytesToHex(this.toBytes());
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
    // TODO: remove
    get ex() {
      return this.X;
    }
    get ey() {
      return this.Y;
    }
    get ez() {
      return this.Z;
    }
    get et() {
      return this.T;
    }
    static normalizeZ(points) {
      return normalizeZ(Point, points);
    }
    static msm(points, scalars) {
      return pippenger(Point, Fn2, points, scalars);
    }
    _setWindowSize(windowSize) {
      this.precompute(windowSize);
    }
    toRawBytes() {
      return this.toBytes();
    }
  }
  const wnaf = new wNAF(Point, Fn2.BITS);
  Point.BASE.precompute(8);
  return Point;
}
function eddsa(Point, cHash, eddsaOpts = {}) {
  if (typeof cHash !== "function") throw new Error('"hash" function param is required');
  _validateObject(
    eddsaOpts,
    {},
    {
      adjustScalarBytes: "function",
      randomBytes: "function",
      domain: "function",
      prehash: "function",
      mapToCurve: "function"
    }
  );
  const { prehash } = eddsaOpts;
  const { BASE, Fp: Fp5, Fn: Fn2 } = Point;
  const randomBytes2 = eddsaOpts.randomBytes || randomBytes;
  const adjustScalarBytes2 = eddsaOpts.adjustScalarBytes || ((bytes) => bytes);
  const domain = eddsaOpts.domain || ((data, ctx, phflag) => {
    _abool2(phflag, "phflag");
    if (ctx.length || phflag) throw new Error("Contexts/pre-hash are not supported");
    return data;
  });
  function modN_LE(hash) {
    return Fn2.create(bytesToNumberLE(hash));
  }
  function getPrivateScalar(key) {
    const len = lengths.secretKey;
    key = ensureBytes("private key", key, len);
    const hashed = ensureBytes("hashed private key", cHash(key), 2 * len);
    const head = adjustScalarBytes2(hashed.slice(0, len));
    const prefix = hashed.slice(len, 2 * len);
    const scalar = modN_LE(head);
    return { head, prefix, scalar };
  }
  function getExtendedPublicKey(secretKey) {
    const { head, prefix, scalar } = getPrivateScalar(secretKey);
    const point = BASE.multiply(scalar);
    const pointBytes = point.toBytes();
    return { head, prefix, scalar, point, pointBytes };
  }
  function getPublicKey(secretKey) {
    return getExtendedPublicKey(secretKey).pointBytes;
  }
  function hashDomainToScalar(context = Uint8Array.of(), ...msgs) {
    const msg = concatBytes(...msgs);
    return modN_LE(cHash(domain(msg, ensureBytes("context", context), !!prehash)));
  }
  function sign8(msg, secretKey, options = {}) {
    msg = ensureBytes("message", msg);
    if (prehash) msg = prehash(msg);
    const { prefix, scalar, pointBytes } = getExtendedPublicKey(secretKey);
    const r = hashDomainToScalar(options.context, prefix, msg);
    const R = BASE.multiply(r).toBytes();
    const k = hashDomainToScalar(options.context, R, pointBytes, msg);
    const s = Fn2.create(r + k * scalar);
    if (!Fn2.isValid(s)) throw new Error("sign failed: invalid s");
    const rs = concatBytes(R, Fn2.toBytes(s));
    return _abytes2(rs, lengths.signature, "result");
  }
  const verifyOpts = { zip215: true };
  function verify8(sig, msg, publicKey, options = verifyOpts) {
    const { context, zip215 } = options;
    const len = lengths.signature;
    sig = ensureBytes("signature", sig, len);
    msg = ensureBytes("message", msg);
    publicKey = ensureBytes("publicKey", publicKey, lengths.publicKey);
    if (zip215 !== void 0) _abool2(zip215, "zip215");
    if (prehash) msg = prehash(msg);
    const mid = len / 2;
    const r = sig.subarray(0, mid);
    const s = bytesToNumberLE(sig.subarray(mid, len));
    let A2, R, SB;
    try {
      A2 = Point.fromBytes(publicKey, zip215);
      R = Point.fromBytes(r, zip215);
      SB = BASE.multiplyUnsafe(s);
    } catch (error) {
      return false;
    }
    if (!zip215 && A2.isSmallOrder()) return false;
    const k = hashDomainToScalar(context, R.toBytes(), A2.toBytes(), msg);
    const RkA = R.add(A2.multiplyUnsafe(k));
    return RkA.subtract(SB).clearCofactor().is0();
  }
  const _size = Fp5.BYTES;
  const lengths = {
    secretKey: _size,
    publicKey: _size,
    signature: 2 * _size,
    seed: _size
  };
  function randomSecretKey(seed = randomBytes2(lengths.seed)) {
    return _abytes2(seed, lengths.seed, "seed");
  }
  function keygen(seed) {
    const secretKey = utils.randomSecretKey(seed);
    return { secretKey, publicKey: getPublicKey(secretKey) };
  }
  function isValidSecretKey(key) {
    return isBytes(key) && key.length === Fn2.BYTES;
  }
  function isValidPublicKey(key, zip215) {
    try {
      return !!Point.fromBytes(key, zip215);
    } catch (error) {
      return false;
    }
  }
  const utils = {
    getExtendedPublicKey,
    randomSecretKey,
    isValidSecretKey,
    isValidPublicKey,
    /**
     * Converts ed public key to x public key. Uses formula:
     * - ed25519:
     *   - `(u, v) = ((1+y)/(1-y), sqrt(-486664)*u/x)`
     *   - `(x, y) = (sqrt(-486664)*u/v, (u-1)/(u+1))`
     * - ed448:
     *   - `(u, v) = ((y-1)/(y+1), sqrt(156324)*u/x)`
     *   - `(x, y) = (sqrt(156324)*u/v, (1+u)/(1-u))`
     */
    toMontgomery(publicKey) {
      const { y } = Point.fromBytes(publicKey);
      const size = lengths.publicKey;
      const is25519 = size === 32;
      if (!is25519 && size !== 57) throw new Error("only defined for 25519 and 448");
      const u = is25519 ? Fp5.div(_1n6 + y, _1n6 - y) : Fp5.div(y - _1n6, y + _1n6);
      return Fp5.toBytes(u);
    },
    toMontgomerySecret(secretKey) {
      const size = lengths.secretKey;
      _abytes2(secretKey, size);
      const hashed = cHash(secretKey.subarray(0, size));
      return adjustScalarBytes2(hashed).subarray(0, size);
    },
    /** @deprecated */
    randomPrivateKey: randomSecretKey,
    /** @deprecated */
    precompute(windowSize = 8, point = Point.BASE) {
      return point.precompute(windowSize, false);
    }
  };
  return Object.freeze({
    keygen,
    getPublicKey,
    sign: sign8,
    verify: verify8,
    utils,
    Point,
    lengths
  });
}
function _eddsa_legacy_opts_to_new(c) {
  const CURVE = {
    a: c.a,
    d: c.d,
    p: c.Fp.ORDER,
    n: c.n,
    h: c.h,
    Gx: c.Gx,
    Gy: c.Gy
  };
  const Fp5 = c.Fp;
  const Fn2 = Field(CURVE.n, c.nBitLength, true);
  const curveOpts = { Fp: Fp5, Fn: Fn2, uvRatio: c.uvRatio };
  const eddsaOpts = {
    randomBytes: c.randomBytes,
    adjustScalarBytes: c.adjustScalarBytes,
    domain: c.domain,
    prehash: c.prehash,
    mapToCurve: c.mapToCurve
  };
  return { CURVE, curveOpts, hash: c.hash, eddsaOpts };
}
function _eddsa_new_output_to_legacy(c, eddsa2) {
  const Point = eddsa2.Point;
  const legacy = Object.assign({}, eddsa2, {
    ExtendedPoint: Point,
    CURVE: c,
    nBitLength: Point.Fn.BITS,
    nByteLength: Point.Fn.BYTES
  });
  return legacy;
}
function twistedEdwards(c) {
  const { CURVE, curveOpts, hash, eddsaOpts } = _eddsa_legacy_opts_to_new(c);
  const Point = edwards(CURVE, curveOpts);
  const EDDSA = eddsa(Point, hash, eddsaOpts);
  return _eddsa_new_output_to_legacy(c, EDDSA);
}
var _0n6, _1n6, _2n4, _8n2, PrimeEdwardsPoint;
var init_edwards = __esm({
  "vendor/src/noble-curves/src/abstract/edwards.ts"() {
    init_utils2();
    init_curve();
    init_modular();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    _0n6 = BigInt(0);
    _1n6 = BigInt(1);
    _2n4 = BigInt(2);
    _8n2 = BigInt(8);
    PrimeEdwardsPoint = class {
      constructor(ep) {
        this.ep = ep;
      }
      // Static methods that must be implemented by subclasses
      static fromBytes(_bytes) {
        notImplemented();
      }
      static fromHex(_hex) {
        notImplemented();
      }
      get x() {
        return this.toAffine().x;
      }
      get y() {
        return this.toAffine().y;
      }
      // Common implementations
      clearCofactor() {
        return this;
      }
      assertValidity() {
        this.ep.assertValidity();
      }
      toAffine(invertedZ) {
        return this.ep.toAffine(invertedZ);
      }
      toHex() {
        return bytesToHex(this.toBytes());
      }
      toString() {
        return this.toHex();
      }
      isTorsionFree() {
        return true;
      }
      isSmallOrder() {
        return false;
      }
      add(other) {
        this.assertSame(other);
        return this.init(this.ep.add(other.ep));
      }
      subtract(other) {
        this.assertSame(other);
        return this.init(this.ep.subtract(other.ep));
      }
      multiply(scalar) {
        return this.init(this.ep.multiply(scalar));
      }
      multiplyUnsafe(scalar) {
        return this.init(this.ep.multiplyUnsafe(scalar));
      }
      double() {
        return this.init(this.ep.double());
      }
      negate() {
        return this.init(this.ep.negate());
      }
      precompute(windowSize, isLazy) {
        return this.init(this.ep.precompute(windowSize, isLazy));
      }
      /** @deprecated use `toBytes` */
      toRawBytes() {
        return this.toBytes();
      }
    };
  }
});

// vendor/src/noble-curves/src/abstract/montgomery.ts
function validateOpts(curve) {
  _validateObject(curve, {
    adjustScalarBytes: "function",
    powPminus2: "function"
  });
  return Object.freeze({ ...curve });
}
function montgomery(curveDef) {
  const CURVE = validateOpts(curveDef);
  const { P, type, adjustScalarBytes: adjustScalarBytes2, powPminus2, randomBytes: rand } = CURVE;
  const is25519 = type === "x25519";
  if (!is25519 && type !== "x448") throw new Error("invalid type");
  const randomBytes_ = rand || randomBytes;
  const montgomeryBits = is25519 ? 255 : 448;
  const fieldLen = is25519 ? 32 : 56;
  const Gu = is25519 ? BigInt(9) : BigInt(5);
  const a24 = is25519 ? BigInt(121665) : BigInt(39081);
  const minScalar = is25519 ? _2n5 ** BigInt(254) : _2n5 ** BigInt(447);
  const maxAdded = is25519 ? BigInt(8) * _2n5 ** BigInt(251) - _1n7 : BigInt(4) * _2n5 ** BigInt(445) - _1n7;
  const maxScalar = minScalar + maxAdded + _1n7;
  const modP = (n) => mod(n, P);
  const GuBytes = encodeU(Gu);
  function encodeU(u) {
    return numberToBytesLE(modP(u), fieldLen);
  }
  function decodeU(u) {
    const _u = ensureBytes("u coordinate", u, fieldLen);
    if (is25519) _u[31] &= 127;
    return modP(bytesToNumberLE(_u));
  }
  function decodeScalar(scalar) {
    return bytesToNumberLE(adjustScalarBytes2(ensureBytes("scalar", scalar, fieldLen)));
  }
  function scalarMult(scalar, u) {
    const pu = montgomeryLadder(decodeU(u), decodeScalar(scalar));
    if (pu === _0n7) throw new Error("invalid private or public key received");
    return encodeU(pu);
  }
  function scalarMultBase(scalar) {
    return scalarMult(scalar, GuBytes);
  }
  function cswap2(swap, x_2, x_3) {
    const dummy = modP(swap * (x_2 - x_3));
    x_2 = modP(x_2 - dummy);
    x_3 = modP(x_3 + dummy);
    return { x_2, x_3 };
  }
  function montgomeryLadder(u, scalar) {
    aInRange("u", u, _0n7, P);
    aInRange("scalar", scalar, minScalar, maxScalar);
    const k = scalar;
    const x_1 = u;
    let x_2 = _1n7;
    let z_2 = _0n7;
    let x_3 = u;
    let z_3 = _1n7;
    let swap = _0n7;
    for (let t = BigInt(montgomeryBits - 1); t >= _0n7; t--) {
      const k_t = k >> t & _1n7;
      swap ^= k_t;
      ({ x_2, x_3 } = cswap2(swap, x_2, x_3));
      ({ x_2: z_2, x_3: z_3 } = cswap2(swap, z_2, z_3));
      swap = k_t;
      const A2 = x_2 + z_2;
      const AA = modP(A2 * A2);
      const B = x_2 - z_2;
      const BB = modP(B * B);
      const E = AA - BB;
      const C = x_3 + z_3;
      const D3 = x_3 - z_3;
      const DA = modP(D3 * A2);
      const CB = modP(C * B);
      const dacb = DA + CB;
      const da_cb = DA - CB;
      x_3 = modP(dacb * dacb);
      z_3 = modP(x_1 * modP(da_cb * da_cb));
      x_2 = modP(AA * BB);
      z_2 = modP(E * (AA + modP(a24 * E)));
    }
    ({ x_2, x_3 } = cswap2(swap, x_2, x_3));
    ({ x_2: z_2, x_3: z_3 } = cswap2(swap, z_2, z_3));
    const z2 = powPminus2(z_2);
    return modP(x_2 * z2);
  }
  const lengths = {
    secretKey: fieldLen,
    publicKey: fieldLen,
    seed: fieldLen
  };
  const randomSecretKey = (seed = randomBytes_(fieldLen)) => {
    abytes(seed, lengths.seed);
    return seed;
  };
  function keygen(seed) {
    const secretKey = randomSecretKey(seed);
    return { secretKey, publicKey: scalarMultBase(secretKey) };
  }
  const utils = {
    randomSecretKey,
    randomPrivateKey: randomSecretKey
  };
  return {
    keygen,
    getSharedSecret: (secretKey, publicKey) => scalarMult(secretKey, publicKey),
    getPublicKey: (secretKey) => scalarMultBase(secretKey),
    scalarMult,
    scalarMultBase,
    utils,
    GuBytes: GuBytes.slice(),
    lengths
  };
}
var _0n7, _1n7, _2n5;
var init_montgomery = __esm({
  "vendor/src/noble-curves/src/abstract/montgomery.ts"() {
    init_utils2();
    init_modular();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    _0n7 = BigInt(0);
    _1n7 = BigInt(1);
    _2n5 = BigInt(2);
  }
});

// vendor/src/noble-curves/src/ed448.ts
function ed448_pow_Pminus3div4(x) {
  const P = ed448_CURVE.p;
  const b2 = x * x * x % P;
  const b3 = b2 * b2 * x % P;
  const b6 = pow2(b3, _3n3, P) * b3 % P;
  const b9 = pow2(b6, _3n3, P) * b3 % P;
  const b11 = pow2(b9, _2n6, P) * b2 % P;
  const b22 = pow2(b11, _11n, P) * b11 % P;
  const b44 = pow2(b22, _22n, P) * b22 % P;
  const b88 = pow2(b44, _44n, P) * b44 % P;
  const b176 = pow2(b88, _88n, P) * b88 % P;
  const b220 = pow2(b176, _44n, P) * b44 % P;
  const b222 = pow2(b220, _2n6, P) * b2 % P;
  const b223 = pow2(b222, _1n8, P) * x % P;
  return pow2(b223, _223n, P) * b222 % P;
}
function adjustScalarBytes(bytes) {
  bytes[0] &= 252;
  bytes[55] |= 128;
  bytes[56] = 0;
  return bytes;
}
function uvRatio(u, v) {
  const P = ed448_CURVE.p;
  const u2v = mod(u * u * v, P);
  const u3v = mod(u2v * u, P);
  const u5v3 = mod(u3v * u2v * v, P);
  const root = ed448_pow_Pminus3div4(u5v3);
  const x = mod(u3v * root, P);
  const x2 = mod(x * x, P);
  return { isValid: mod(x2 * v, P) === u, value: x };
}
function dom4(data, ctx, phflag) {
  if (ctx.length > 255) throw new Error("context must be smaller than 255, got: " + ctx.length);
  return concatBytes(
    asciiToBytes("SigEd448"),
    new Uint8Array([phflag ? 1 : 0, ctx.length]),
    ctx,
    data
  );
}
function calcElligatorDecafMap(r0) {
  const { d } = ed448_CURVE;
  const P = Fp.ORDER;
  const mod3 = (n) => Fp.create(n);
  const r = mod3(-(r0 * r0));
  const u0 = mod3(d * (r - _1n8));
  const u1 = mod3((u0 + _1n8) * (u0 - r));
  const { isValid: was_square, value: v } = uvRatio(ONE_MINUS_TWO_D, mod3((r + _1n8) * u1));
  let v_prime = v;
  if (!was_square) v_prime = mod3(r0 * v);
  let sgn = _1n8;
  if (!was_square) sgn = mod3(-_1n8);
  const s = mod3(v_prime * (r + _1n8));
  let s_abs = s;
  if (isNegativeLE(s, P)) s_abs = mod3(-s);
  const s2 = s * s;
  const W0 = mod3(s_abs * _2n6);
  const W1 = mod3(s2 + _1n8);
  const W2 = mod3(s2 - _1n8);
  const W3 = mod3(v_prime * s * (r - _1n8) * ONE_MINUS_TWO_D + sgn);
  return new ed448.Point(mod3(W0 * W3), mod3(W2 * W1), mod3(W1 * W3), mod3(W0 * W2));
}
function decaf448_map(bytes) {
  abytes(bytes, 112);
  const skipValidation = true;
  const r1 = Fp448.create(Fp448.fromBytes(bytes.subarray(0, 56), skipValidation));
  const R1 = calcElligatorDecafMap(r1);
  const r2 = Fp448.create(Fp448.fromBytes(bytes.subarray(56, 112), skipValidation));
  const R2 = calcElligatorDecafMap(r2);
  return new _DecafPoint(R1.add(R2));
}
var ed448_CURVE, E448_CURVE, shake256_114, _1n8, _2n6, _3n3, _4n3, _11n, _22n, _44n, _88n, _223n, Fp, Fn, Fp448, Fn448, ED448_DEF, ed448, E448, x448, ONE_MINUS_D, ONE_MINUS_TWO_D, SQRT_MINUS_D, INVSQRT_MINUS_D, invertSqrt, _DecafPoint;
var init_ed448 = __esm({
  "vendor/src/noble-curves/src/ed448.ts"() {
    init_sha3();
    init_utils();
    init_curve();
    init_edwards();
    init_hash_to_curve();
    init_modular();
    init_montgomery();
    init_utils2();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    ed448_CURVE = {
      p: BigInt(
        "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      ),
      n: BigInt(
        "0x3fffffffffffffffffffffffffffffffffffffffffffffffffffffff7cca23e9c44edb49aed63690216cc2728dc58f552378c292ab5844f3"
      ),
      h: BigInt(4),
      a: BigInt(1),
      d: BigInt(
        "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffffffffffffffffffffffffffffffffffffffffffffffff6756"
      ),
      Gx: BigInt(
        "0x4f1970c66bed0ded221d15a622bf36da9e146570470f1767ea6de324a3d3a46412ae1af72ab66511433b80e18b00938e2626a82bc70cc05e"
      ),
      Gy: BigInt(
        "0x693f46716eb6bc248876203756c9c7624bea73736ca3984087789c1e05a0c2d73ad3ff1ce67c39c4fdbd132c4ed7c8ad9808795bf230fa14"
      )
    };
    E448_CURVE = Object.assign({}, ed448_CURVE, {
      d: BigInt(
        "0xd78b4bdc7f0daf19f24f38c29373a2ccad46157242a50f37809b1da3412a12e79ccc9c81264cfe9ad080997058fb61c4243cc32dbaa156b9"
      ),
      Gx: BigInt(
        "0x79a70b2b70400553ae7c9df416c792c61128751ac92969240c25a07d728bdc93e21f7787ed6972249de732f38496cd11698713093e9c04fc"
      ),
      Gy: BigInt(
        "0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffff80000000000000000000000000000000000000000000000000000001"
      )
    });
    shake256_114 = /* @__PURE__ */ createHasher(() => shake256.create({ dkLen: 114 }));
    _1n8 = BigInt(1);
    _2n6 = BigInt(2);
    _3n3 = BigInt(3);
    _4n3 = BigInt(4);
    _11n = BigInt(11);
    _22n = BigInt(22);
    _44n = BigInt(44);
    _88n = BigInt(88);
    _223n = BigInt(223);
    Fp = /* @__PURE__ */ (() => Field(ed448_CURVE.p, { BITS: 456, isLE: true }))();
    Fn = /* @__PURE__ */ (() => Field(ed448_CURVE.n, { BITS: 456, isLE: true }))();
    Fp448 = /* @__PURE__ */ (() => Field(ed448_CURVE.p, { BITS: 448, isLE: true }))();
    Fn448 = /* @__PURE__ */ (() => Field(ed448_CURVE.n, { BITS: 448, isLE: true }))();
    ED448_DEF = /* @__PURE__ */ (() => ({
      ...ed448_CURVE,
      Fp,
      Fn,
      nBitLength: Fn.BITS,
      hash: shake256_114,
      adjustScalarBytes,
      domain: dom4,
      uvRatio
    }))();
    ed448 = twistedEdwards(ED448_DEF);
    E448 = edwards(E448_CURVE);
    x448 = /* @__PURE__ */ (() => {
      const P = ed448_CURVE.p;
      return montgomery({
        P,
        type: "x448",
        powPminus2: (x) => {
          const Pminus3div4 = ed448_pow_Pminus3div4(x);
          const Pminus3 = pow2(Pminus3div4, _2n6, P);
          return mod(Pminus3 * x, P);
        },
        adjustScalarBytes
      });
    })();
    ONE_MINUS_D = /* @__PURE__ */ BigInt("39082");
    ONE_MINUS_TWO_D = /* @__PURE__ */ BigInt("78163");
    SQRT_MINUS_D = /* @__PURE__ */ BigInt(
      "98944233647732219769177004876929019128417576295529901074099889598043702116001257856802131563896515373927712232092845883226922417596214"
    );
    INVSQRT_MINUS_D = /* @__PURE__ */ BigInt(
      "315019913931389607337177038330951043522456072897266928557328499619017160722351061360252776265186336876723201881398623946864393857820716"
    );
    invertSqrt = (number) => uvRatio(_1n8, number);
    _DecafPoint = class __DecafPoint extends PrimeEdwardsPoint {
      static {
        // The following gymnastics is done because typescript strips comments otherwise
        // prettier-ignore
        this.BASE = /* @__PURE__ */ (() => new __DecafPoint(ed448.Point.BASE).multiplyUnsafe(_2n6))();
      }
      static {
        // prettier-ignore
        this.ZERO = /* @__PURE__ */ (() => new __DecafPoint(ed448.Point.ZERO))();
      }
      static {
        // prettier-ignore
        this.Fp = /* @__PURE__ */ (() => Fp448)();
      }
      static {
        // prettier-ignore
        this.Fn = /* @__PURE__ */ (() => Fn448)();
      }
      constructor(ep) {
        super(ep);
      }
      static fromAffine(ap) {
        return new __DecafPoint(ed448.Point.fromAffine(ap));
      }
      assertSame(other) {
        if (!(other instanceof __DecafPoint)) throw new Error("DecafPoint expected");
      }
      init(ep) {
        return new __DecafPoint(ep);
      }
      /** @deprecated use `import { decaf448_hasher } from '@noble/curves/ed448.js';` */
      static hashToCurve(hex) {
        return decaf448_map(ensureBytes("decafHash", hex, 112));
      }
      static fromBytes(bytes) {
        abytes(bytes, 56);
        const { d } = ed448_CURVE;
        const P = Fp.ORDER;
        const mod3 = (n) => Fp448.create(n);
        const s = Fp448.fromBytes(bytes);
        if (!equalBytes(Fn448.toBytes(s), bytes) || isNegativeLE(s, P))
          throw new Error("invalid decaf448 encoding 1");
        const s2 = mod3(s * s);
        const u1 = mod3(_1n8 + s2);
        const u1sq = mod3(u1 * u1);
        const u2 = mod3(u1sq - _4n3 * d * s2);
        const { isValid, value: invsqrt } = invertSqrt(mod3(u2 * u1sq));
        let u3 = mod3((s + s) * invsqrt * u1 * SQRT_MINUS_D);
        if (isNegativeLE(u3, P)) u3 = mod3(-u3);
        const x = mod3(u3 * invsqrt * u2 * INVSQRT_MINUS_D);
        const y = mod3((_1n8 - s2) * invsqrt * u1);
        const t = mod3(x * y);
        if (!isValid) throw new Error("invalid decaf448 encoding 2");
        return new __DecafPoint(new ed448.Point(x, y, _1n8, t));
      }
      /**
       * Converts decaf-encoded string to decaf point.
       * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-decode-2).
       * @param hex Decaf-encoded 56 bytes. Not every 56-byte string is valid decaf encoding
       */
      static fromHex(hex) {
        return __DecafPoint.fromBytes(ensureBytes("decafHex", hex, 56));
      }
      /** @deprecated use `import { pippenger } from '@noble/curves/abstract/curve.js';` */
      static msm(points, scalars) {
        return pippenger(__DecafPoint, Fn, points, scalars);
      }
      /**
       * Encodes decaf point to Uint8Array.
       * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-encode-2).
       */
      toBytes() {
        const { X: X2, Z: Z2, T } = this.ep;
        const P = Fp.ORDER;
        const mod3 = (n) => Fp.create(n);
        const u1 = mod3(mod3(X2 + T) * mod3(X2 - T));
        const x2 = mod3(X2 * X2);
        const { value: invsqrt } = invertSqrt(mod3(u1 * ONE_MINUS_D * x2));
        let ratio = mod3(invsqrt * u1 * SQRT_MINUS_D);
        if (isNegativeLE(ratio, P)) ratio = mod3(-ratio);
        const u2 = mod3(INVSQRT_MINUS_D * ratio * Z2 - T);
        let s = mod3(ONE_MINUS_D * invsqrt * X2 * u2);
        if (isNegativeLE(s, P)) s = mod3(-s);
        return Fn448.toBytes(s);
      }
      /**
       * Compare one point to another.
       * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-equals-2).
       */
      equals(other) {
        this.assertSame(other);
        const { X: X1, Y: Y1 } = this.ep;
        const { X: X2, Y: Y2 } = other.ep;
        return Fp.create(X1 * Y2) === Fp.create(Y1 * X2);
      }
      is0() {
        return this.equals(__DecafPoint.ZERO);
      }
    };
  }
});

// vendor/src/noble-curves/src/secp256k1.ts
function sqrtMod(y) {
  const P = secp256k1_CURVE.p;
  const _3n4 = BigInt(3), _6n = BigInt(6), _11n2 = BigInt(11), _22n2 = BigInt(22);
  const _23n = BigInt(23), _44n2 = BigInt(44), _88n2 = BigInt(88);
  const b2 = y * y * y % P;
  const b3 = b2 * b2 * y % P;
  const b6 = pow2(b3, _3n4, P) * b3 % P;
  const b9 = pow2(b6, _3n4, P) * b3 % P;
  const b11 = pow2(b9, _2n7, P) * b2 % P;
  const b22 = pow2(b11, _11n2, P) * b11 % P;
  const b44 = pow2(b22, _22n2, P) * b22 % P;
  const b88 = pow2(b44, _44n2, P) * b44 % P;
  const b176 = pow2(b88, _88n2, P) * b88 % P;
  const b220 = pow2(b176, _44n2, P) * b44 % P;
  const b223 = pow2(b220, _3n4, P) * b3 % P;
  const t1 = pow2(b223, _23n, P) * b22 % P;
  const t2 = pow2(t1, _6n, P) * b2 % P;
  const root = pow2(t2, _2n7, P);
  if (!Fpk1.eql(Fpk1.sqr(root), y)) throw new Error("Cannot find square root");
  return root;
}
var secp256k1_CURVE, secp256k1_ENDO, _2n7, Fpk1, secp256k1;
var init_secp256k1 = __esm({
  "vendor/src/noble-curves/src/secp256k1.ts"() {
    init_sha2();
    init_utils();
    init_shortw_utils();
    init_hash_to_curve();
    init_modular();
    init_weierstrass();
    init_utils2();
    /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    secp256k1_CURVE = {
      p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
      n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
      h: BigInt(1),
      a: BigInt(0),
      b: BigInt(7),
      Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
      Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
    };
    secp256k1_ENDO = {
      beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
      basises: [
        [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
        [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
      ]
    };
    _2n7 = /* @__PURE__ */ BigInt(2);
    Fpk1 = Field(secp256k1_CURVE.p, { sqrt: sqrtMod });
    secp256k1 = createCurve(
      { ...secp256k1_CURVE, Fp: Fpk1, lowS: true, endo: secp256k1_ENDO },
      sha256
    );
  }
});

// vendor/src/noble-hashes/src/sha256.ts
var sha2562, sha2242;
var init_sha256 = __esm({
  "vendor/src/noble-hashes/src/sha256.ts"() {
    init_sha2();
    sha2562 = sha256;
    sha2242 = sha224;
  }
});

// vendor/src/openpgpjs/src/crypto/public_key/elliptic/brainpool/brainpoolP256r1.ts
var Fp2, CURVE_A, CURVE_B, brainpoolP256r1;
var init_brainpoolP256r1 = __esm({
  "vendor/src/openpgpjs/src/crypto/public_key/elliptic/brainpool/brainpoolP256r1.ts"() {
    init_shortw_utils();
    init_sha256();
    init_modular();
    Fp2 = Field(BigInt("0xa9fb57dba1eea9bc3e660a909d838d726e3bf623d52620282013481d1f6e5377"));
    CURVE_A = Fp2.create(BigInt("0x7d5a0975fc2c3057eef67530417affe7fb8055c126dc5c6ce94a4b44f330b5d9"));
    CURVE_B = BigInt("0x26dc5c6ce94a4b44f330b5d9bbd77cbf958416295cf7e1ce6bccdc18ff8c07b6");
    brainpoolP256r1 = createCurve({
      a: CURVE_A,
      // Equation params: a, b
      b: CURVE_B,
      Fp: Fp2,
      // Curve order (q), total count of valid points in the field
      n: BigInt("0xa9fb57dba1eea9bc3e660a909d838d718c397aa3b561a6f7901e0e82974856a7"),
      // Base (generator) point (x, y)
      Gx: BigInt("0x8bd2aeb9cb7e57cb2c4b482ffc81b7afb9de27e1e3bd23c23a4453bd9ace3262"),
      Gy: BigInt("0x547ef835c3dac4fd97f8461a14611dc9c27745132ded8e545c1d54c72f046997"),
      h: BigInt(1),
      lowS: false
    }, sha2562);
  }
});

// vendor/src/noble-hashes/src/sha512.ts
var sha5122, sha3842;
var init_sha512 = __esm({
  "vendor/src/noble-hashes/src/sha512.ts"() {
    init_sha2();
    sha5122 = sha512;
    sha3842 = sha384;
  }
});

// vendor/src/openpgpjs/src/crypto/public_key/elliptic/brainpool/brainpoolP384r1.ts
var Fp3, CURVE_A2, CURVE_B2, brainpoolP384r1;
var init_brainpoolP384r1 = __esm({
  "vendor/src/openpgpjs/src/crypto/public_key/elliptic/brainpool/brainpoolP384r1.ts"() {
    init_shortw_utils();
    init_sha512();
    init_modular();
    Fp3 = Field(BigInt("0x8cb91e82a3386d280f5d6f7e50e641df152f7109ed5456b412b1da197fb71123acd3a729901d1a71874700133107ec53"));
    CURVE_A2 = Fp3.create(BigInt("0x7bc382c63d8c150c3c72080ace05afa0c2bea28e4fb22787139165efba91f90f8aa5814a503ad4eb04a8c7dd22ce2826"));
    CURVE_B2 = BigInt("0x04a8c7dd22ce28268b39b55416f0447c2fb77de107dcd2a62e880ea53eeb62d57cb4390295dbc9943ab78696fa504c11");
    brainpoolP384r1 = createCurve({
      a: CURVE_A2,
      // Equation params: a, b
      b: CURVE_B2,
      Fp: Fp3,
      // Curve order (q), total count of valid points in the field
      n: BigInt("0x8cb91e82a3386d280f5d6f7e50e641df152f7109ed5456b31f166e6cac0425a7cf3ab6af6b7fc3103b883202e9046565"),
      // Base (generator) point (x, y)
      Gx: BigInt("0x1d1c64f068cf45ffa2a63a81b7c13f6b8847a3e77ef14fe3db7fcafe0cbd10e8e826e03436d646aaef87b2e247d4af1e"),
      Gy: BigInt("0x8abe1d7520f9c2a45cb1eb8e95cfd55262b70b29feec5864e19c054ff99129280e4646217791811142820341263c5315"),
      h: BigInt(1),
      lowS: false
    }, sha3842);
  }
});

// vendor/src/openpgpjs/src/crypto/public_key/elliptic/brainpool/brainpoolP512r1.ts
var Fp4, CURVE_A3, CURVE_B3, brainpoolP512r1;
var init_brainpoolP512r1 = __esm({
  "vendor/src/openpgpjs/src/crypto/public_key/elliptic/brainpool/brainpoolP512r1.ts"() {
    init_shortw_utils();
    init_sha512();
    init_modular();
    Fp4 = Field(BigInt("0xaadd9db8dbe9c48b3fd4e6ae33c9fc07cb308db3b3c9d20ed6639cca703308717d4d9b009bc66842aecda12ae6a380e62881ff2f2d82c68528aa6056583a48f3"));
    CURVE_A3 = Fp4.create(BigInt("0x7830a3318b603b89e2327145ac234cc594cbdd8d3df91610a83441caea9863bc2ded5d5aa8253aa10a2ef1c98b9ac8b57f1117a72bf2c7b9e7c1ac4d77fc94ca"));
    CURVE_B3 = BigInt("0x3df91610a83441caea9863bc2ded5d5aa8253aa10a2ef1c98b9ac8b57f1117a72bf2c7b9e7c1ac4d77fc94cadc083e67984050b75ebae5dd2809bd638016f723");
    brainpoolP512r1 = createCurve({
      a: CURVE_A3,
      // Equation params: a, b
      b: CURVE_B3,
      Fp: Fp4,
      // Curve order (q), total count of valid points in the field
      n: BigInt("0xaadd9db8dbe9c48b3fd4e6ae33c9fc07cb308db3b3c9d20ed6639cca70330870553e5c414ca92619418661197fac10471db1d381085ddaddb58796829ca90069"),
      // Base (generator) point (x, y)
      Gx: BigInt("0x81aee4bdd82ed9645a21322e9c4c6a9385ed9f70b5d916c1b43b62eef4d0098eff3b1f78e2d0d48d50d1687b93b97d5f7c6d5047406a5e688b352209bcb9f822"),
      Gy: BigInt("0x7dde385d566332ecc0eabfa9cf7822fdf209f70024a57b1aa000c55b881f8111b2dcde494a5f485e5bca4bd88a2763aed1ca2b2fa8f0540678cd1e0f3ad80892"),
      h: BigInt(1),
      lowS: false
    }, sha5122);
  }
});

// vendor/src/openpgpjs/src/crypto/public_key/elliptic/noble_curves.js
var noble_curves_exports = {};
__export(noble_curves_exports, {
  nobleCurves: () => nobleCurves
});
var nobleCurves;
var init_noble_curves = __esm({
  "vendor/src/openpgpjs/src/crypto/public_key/elliptic/noble_curves.js"() {
    init_p256();
    init_p384();
    init_p521();
    init_ed448();
    init_secp256k1();
    init_brainpoolP256r1();
    init_brainpoolP384r1();
    init_brainpoolP512r1();
    nobleCurves = new Map(Object.entries({
      nistP256: p2562,
      nistP384: p3842,
      nistP521: p5212,
      brainpoolP256r1,
      brainpoolP384r1,
      brainpoolP512r1,
      secp256k1,
      x448,
      ed448
    }));
  }
});

// vendor/src/noble-hashes/src/legacy.ts
function ripemd_f(group, x, y, z) {
  if (group === 0) return x ^ y ^ z;
  if (group === 1) return x & y | ~x & z;
  if (group === 2) return (x | ~y) ^ z;
  if (group === 3) return x & z | y & ~z;
  return x ^ (y | ~z);
}
var SHA1_IV, SHA1_W, SHA1, sha1, Rho160, Id160, Pi160, idxLR, idxL, idxR, shifts160, shiftsL160, shiftsR160, Kl160, Kr160, BUF_160, RIPEMD160, ripemd160;
var init_legacy = __esm({
  "vendor/src/noble-hashes/src/legacy.ts"() {
    init_md();
    init_utils();
    SHA1_IV = /* @__PURE__ */ Uint32Array.from([
      1732584193,
      4023233417,
      2562383102,
      271733878,
      3285377520
    ]);
    SHA1_W = /* @__PURE__ */ new Uint32Array(80);
    SHA1 = class extends HashMD {
      constructor() {
        super(64, 20, 8, false);
        this.A = SHA1_IV[0] | 0;
        this.B = SHA1_IV[1] | 0;
        this.C = SHA1_IV[2] | 0;
        this.D = SHA1_IV[3] | 0;
        this.E = SHA1_IV[4] | 0;
      }
      get() {
        const { A: A2, B, C, D: D3, E } = this;
        return [A2, B, C, D3, E];
      }
      set(A2, B, C, D3, E) {
        this.A = A2 | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D3 | 0;
        this.E = E | 0;
      }
      process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4) SHA1_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 80; i++)
          SHA1_W[i] = rotl(SHA1_W[i - 3] ^ SHA1_W[i - 8] ^ SHA1_W[i - 14] ^ SHA1_W[i - 16], 1);
        let { A: A2, B, C, D: D3, E } = this;
        for (let i = 0; i < 80; i++) {
          let F, K3;
          if (i < 20) {
            F = Chi(B, C, D3);
            K3 = 1518500249;
          } else if (i < 40) {
            F = B ^ C ^ D3;
            K3 = 1859775393;
          } else if (i < 60) {
            F = Maj(B, C, D3);
            K3 = 2400959708;
          } else {
            F = B ^ C ^ D3;
            K3 = 3395469782;
          }
          const T = rotl(A2, 5) + F + E + K3 + SHA1_W[i] | 0;
          E = D3;
          D3 = C;
          C = rotl(B, 30);
          B = A2;
          A2 = T;
        }
        A2 = A2 + this.A | 0;
        B = B + this.B | 0;
        C = C + this.C | 0;
        D3 = D3 + this.D | 0;
        E = E + this.E | 0;
        this.set(A2, B, C, D3, E);
      }
      roundClean() {
        clean(SHA1_W);
      }
      destroy() {
        this.set(0, 0, 0, 0, 0);
        clean(this.buffer);
      }
    };
    sha1 = /* @__PURE__ */ createHasher(() => new SHA1());
    Rho160 = /* @__PURE__ */ Uint8Array.from([
      7,
      4,
      13,
      1,
      10,
      6,
      15,
      3,
      12,
      0,
      9,
      5,
      2,
      14,
      11,
      8
    ]);
    Id160 = /* @__PURE__ */ (() => Uint8Array.from(new Array(16).fill(0).map((_, i) => i)))();
    Pi160 = /* @__PURE__ */ (() => Id160.map((i) => (9 * i + 5) % 16))();
    idxLR = /* @__PURE__ */ (() => {
      const L2 = [Id160];
      const R = [Pi160];
      const res = [L2, R];
      for (let i = 0; i < 4; i++) for (let j of res) j.push(j[i].map((k) => Rho160[k]));
      return res;
    })();
    idxL = /* @__PURE__ */ (() => idxLR[0])();
    idxR = /* @__PURE__ */ (() => idxLR[1])();
    shifts160 = /* @__PURE__ */ [
      [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
      [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
      [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
      [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
      [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
    ].map((i) => Uint8Array.from(i));
    shiftsL160 = /* @__PURE__ */ idxL.map((idx, i) => idx.map((j) => shifts160[i][j]));
    shiftsR160 = /* @__PURE__ */ idxR.map((idx, i) => idx.map((j) => shifts160[i][j]));
    Kl160 = /* @__PURE__ */ Uint32Array.from([
      0,
      1518500249,
      1859775393,
      2400959708,
      2840853838
    ]);
    Kr160 = /* @__PURE__ */ Uint32Array.from([
      1352829926,
      1548603684,
      1836072691,
      2053994217,
      0
    ]);
    BUF_160 = /* @__PURE__ */ new Uint32Array(16);
    RIPEMD160 = class extends HashMD {
      constructor() {
        super(64, 20, 8, true);
        this.h0 = 1732584193 | 0;
        this.h1 = 4023233417 | 0;
        this.h2 = 2562383102 | 0;
        this.h3 = 271733878 | 0;
        this.h4 = 3285377520 | 0;
      }
      get() {
        const { h0, h1, h2, h3, h4 } = this;
        return [h0, h1, h2, h3, h4];
      }
      set(h0, h1, h2, h3, h4) {
        this.h0 = h0 | 0;
        this.h1 = h1 | 0;
        this.h2 = h2 | 0;
        this.h3 = h3 | 0;
        this.h4 = h4 | 0;
      }
      process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4) BUF_160[i] = view.getUint32(offset, true);
        let al = this.h0 | 0, ar = al, bl = this.h1 | 0, br = bl, cl = this.h2 | 0, cr = cl, dl = this.h3 | 0, dr = dl, el = this.h4 | 0, er = el;
        for (let group = 0; group < 5; group++) {
          const rGroup = 4 - group;
          const hbl = Kl160[group], hbr = Kr160[group];
          const rl = idxL[group], rr = idxR[group];
          const sl = shiftsL160[group], sr = shiftsR160[group];
          for (let i = 0; i < 16; i++) {
            const tl = rotl(al + ripemd_f(group, bl, cl, dl) + BUF_160[rl[i]] + hbl, sl[i]) + el | 0;
            al = el, el = dl, dl = rotl(cl, 10) | 0, cl = bl, bl = tl;
          }
          for (let i = 0; i < 16; i++) {
            const tr = rotl(ar + ripemd_f(rGroup, br, cr, dr) + BUF_160[rr[i]] + hbr, sr[i]) + er | 0;
            ar = er, er = dr, dr = rotl(cr, 10) | 0, cr = br, br = tr;
          }
        }
        this.set(
          this.h1 + cl + dr | 0,
          this.h2 + dl + er | 0,
          this.h3 + el + ar | 0,
          this.h4 + al + br | 0,
          this.h0 + bl + cr | 0
        );
      }
      roundClean() {
        clean(BUF_160);
      }
      destroy() {
        this.destroyed = true;
        clean(this.buffer);
        this.set(0, 0, 0, 0, 0);
      }
    };
    ripemd160 = /* @__PURE__ */ createHasher(() => new RIPEMD160());
  }
});

// vendor/src/noble-hashes/src/sha1.ts
var sha12;
var init_sha1 = __esm({
  "vendor/src/noble-hashes/src/sha1.ts"() {
    init_legacy();
    sha12 = sha1;
  }
});

// vendor/src/noble-hashes/src/ripemd160.ts
var ripemd1602;
var init_ripemd160 = __esm({
  "vendor/src/noble-hashes/src/ripemd160.ts"() {
    init_legacy();
    ripemd1602 = ripemd160;
  }
});

// vendor/src/openpgpjs/src/crypto/hash/md5.ts
var K, Chi2, IV, MD5_W, MD5, md5;
var init_md5 = __esm({
  "vendor/src/openpgpjs/src/crypto/hash/md5.ts"() {
    init_md();
    init_utils();
    K = Array.from({ length: 64 }, (_, i) => Math.floor(2 ** 32 * Math.abs(Math.sin(i + 1))));
    Chi2 = (a, b, c) => a & b ^ ~a & c;
    IV = /* @__PURE__ */ new Uint32Array([1732584193, 4023233417, 2562383102, 271733878]);
    MD5_W = /* @__PURE__ */ new Uint32Array(16);
    MD5 = class extends HashMD {
      constructor() {
        super(64, 16, 8, true);
        this.A = IV[0] | 0;
        this.B = IV[1] | 0;
        this.C = IV[2] | 0;
        this.D = IV[3] | 0;
      }
      get() {
        const { A: A2, B, C, D: D3 } = this;
        return [A2, B, C, D3];
      }
      set(A2, B, C, D3) {
        this.A = A2 | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D3 | 0;
      }
      process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4) MD5_W[i] = view.getUint32(offset, true);
        let { A: A2, B, C, D: D3 } = this;
        for (let i = 0; i < 64; i++) {
          let F, g, s;
          if (i < 16) {
            F = Chi2(B, C, D3);
            g = i;
            s = [7, 12, 17, 22];
          } else if (i < 32) {
            F = Chi2(D3, B, C);
            g = (5 * i + 1) % 16;
            s = [5, 9, 14, 20];
          } else if (i < 48) {
            F = B ^ C ^ D3;
            g = (3 * i + 5) % 16;
            s = [4, 11, 16, 23];
          } else {
            F = C ^ (B | ~D3);
            g = 7 * i % 16;
            s = [6, 10, 15, 21];
          }
          F = F + A2 + K[i] + MD5_W[g];
          A2 = D3;
          D3 = C;
          C = B;
          B = B + rotl(F, s[i % 4]);
        }
        A2 = A2 + this.A | 0;
        B = B + this.B | 0;
        C = C + this.C | 0;
        D3 = D3 + this.D | 0;
        this.set(A2, B, C, D3);
      }
      roundClean() {
        MD5_W.fill(0);
      }
      destroy() {
        this.set(0, 0, 0, 0);
        this.buffer.fill(0);
      }
    };
    md5 = /* @__PURE__ */ wrapConstructor(() => new MD5());
  }
});

// vendor/src/openpgpjs/src/crypto/hash/noble_hashes.js
var noble_hashes_exports = {};
__export(noble_hashes_exports, {
  nobleHashes: () => nobleHashes
});
var nobleHashes;
var init_noble_hashes = __esm({
  "vendor/src/openpgpjs/src/crypto/hash/noble_hashes.js"() {
    init_sha1();
    init_sha256();
    init_sha512();
    init_sha3();
    init_ripemd160();
    init_md5();
    nobleHashes = new Map(Object.entries({
      md5,
      sha1: sha12,
      sha224: sha2242,
      sha256: sha2562,
      sha384: sha3842,
      sha512: sha5122,
      sha3_256,
      sha3_512,
      ripemd160: ripemd1602
    }));
  }
});

// vendor/src/tweetnacl-js/cryptoBrowser.js
var crypto3;
var init_cryptoBrowser = __esm({
  "vendor/src/tweetnacl-js/cryptoBrowser.js"() {
    crypto3 = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
  }
});

// vendor/src/tweetnacl-js/nacl-fast.js
var nacl_fast_exports = {};
__export(nacl_fast_exports, {
  default: () => nacl_fast_default
});
function ts64(x, i, h, l) {
  x[i] = h >> 24 & 255;
  x[i + 1] = h >> 16 & 255;
  x[i + 2] = h >> 8 & 255;
  x[i + 3] = h & 255;
  x[i + 4] = l >> 24 & 255;
  x[i + 5] = l >> 16 & 255;
  x[i + 6] = l >> 8 & 255;
  x[i + 7] = l & 255;
}
function vn(x, xi, y, yi, n) {
  var i, d = 0;
  for (i = 0; i < n; i++) d |= x[xi + i] ^ y[yi + i];
  return (1 & d - 1 >>> 8) - 1;
}
function crypto_verify_32(x, xi, y, yi) {
  return vn(x, xi, y, yi, 32);
}
function set25519(r, a) {
  var i;
  for (i = 0; i < 16; i++) r[i] = a[i] | 0;
}
function car25519(o) {
  var i, v, c = 1;
  for (i = 0; i < 16; i++) {
    v = o[i] + c + 65535;
    c = Math.floor(v / 65536);
    o[i] = v - c * 65536;
  }
  o[0] += c - 1 + 37 * (c - 1);
}
function sel25519(p, q, b) {
  var t, c = ~(b - 1);
  for (var i = 0; i < 16; i++) {
    t = c & (p[i] ^ q[i]);
    p[i] ^= t;
    q[i] ^= t;
  }
}
function pack25519(o, n) {
  var i, j, b;
  var m = gf(), t = gf();
  for (i = 0; i < 16; i++) t[i] = n[i];
  car25519(t);
  car25519(t);
  car25519(t);
  for (j = 0; j < 2; j++) {
    m[0] = t[0] - 65517;
    for (i = 1; i < 15; i++) {
      m[i] = t[i] - 65535 - (m[i - 1] >> 16 & 1);
      m[i - 1] &= 65535;
    }
    m[15] = t[15] - 32767 - (m[14] >> 16 & 1);
    b = m[15] >> 16 & 1;
    m[14] &= 65535;
    sel25519(t, m, 1 - b);
  }
  for (i = 0; i < 16; i++) {
    o[2 * i] = t[i] & 255;
    o[2 * i + 1] = t[i] >> 8;
  }
}
function neq25519(a, b) {
  var c = new Uint8Array(32), d = new Uint8Array(32);
  pack25519(c, a);
  pack25519(d, b);
  return crypto_verify_32(c, 0, d, 0);
}
function par25519(a) {
  var d = new Uint8Array(32);
  pack25519(d, a);
  return d[0] & 1;
}
function unpack25519(o, n) {
  var i;
  for (i = 0; i < 16; i++) o[i] = n[2 * i] + (n[2 * i + 1] << 8);
  o[15] &= 32767;
}
function A(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
}
function Z(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
}
function M(o, a, b) {
  var v, c, t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0, t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0, b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11], b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
  v = a[0];
  t0 += v * b0;
  t1 += v * b1;
  t2 += v * b2;
  t3 += v * b3;
  t4 += v * b4;
  t5 += v * b5;
  t6 += v * b6;
  t7 += v * b7;
  t8 += v * b8;
  t9 += v * b9;
  t10 += v * b10;
  t11 += v * b11;
  t12 += v * b12;
  t13 += v * b13;
  t14 += v * b14;
  t15 += v * b15;
  v = a[1];
  t1 += v * b0;
  t2 += v * b1;
  t3 += v * b2;
  t4 += v * b3;
  t5 += v * b4;
  t6 += v * b5;
  t7 += v * b6;
  t8 += v * b7;
  t9 += v * b8;
  t10 += v * b9;
  t11 += v * b10;
  t12 += v * b11;
  t13 += v * b12;
  t14 += v * b13;
  t15 += v * b14;
  t16 += v * b15;
  v = a[2];
  t2 += v * b0;
  t3 += v * b1;
  t4 += v * b2;
  t5 += v * b3;
  t6 += v * b4;
  t7 += v * b5;
  t8 += v * b6;
  t9 += v * b7;
  t10 += v * b8;
  t11 += v * b9;
  t12 += v * b10;
  t13 += v * b11;
  t14 += v * b12;
  t15 += v * b13;
  t16 += v * b14;
  t17 += v * b15;
  v = a[3];
  t3 += v * b0;
  t4 += v * b1;
  t5 += v * b2;
  t6 += v * b3;
  t7 += v * b4;
  t8 += v * b5;
  t9 += v * b6;
  t10 += v * b7;
  t11 += v * b8;
  t12 += v * b9;
  t13 += v * b10;
  t14 += v * b11;
  t15 += v * b12;
  t16 += v * b13;
  t17 += v * b14;
  t18 += v * b15;
  v = a[4];
  t4 += v * b0;
  t5 += v * b1;
  t6 += v * b2;
  t7 += v * b3;
  t8 += v * b4;
  t9 += v * b5;
  t10 += v * b6;
  t11 += v * b7;
  t12 += v * b8;
  t13 += v * b9;
  t14 += v * b10;
  t15 += v * b11;
  t16 += v * b12;
  t17 += v * b13;
  t18 += v * b14;
  t19 += v * b15;
  v = a[5];
  t5 += v * b0;
  t6 += v * b1;
  t7 += v * b2;
  t8 += v * b3;
  t9 += v * b4;
  t10 += v * b5;
  t11 += v * b6;
  t12 += v * b7;
  t13 += v * b8;
  t14 += v * b9;
  t15 += v * b10;
  t16 += v * b11;
  t17 += v * b12;
  t18 += v * b13;
  t19 += v * b14;
  t20 += v * b15;
  v = a[6];
  t6 += v * b0;
  t7 += v * b1;
  t8 += v * b2;
  t9 += v * b3;
  t10 += v * b4;
  t11 += v * b5;
  t12 += v * b6;
  t13 += v * b7;
  t14 += v * b8;
  t15 += v * b9;
  t16 += v * b10;
  t17 += v * b11;
  t18 += v * b12;
  t19 += v * b13;
  t20 += v * b14;
  t21 += v * b15;
  v = a[7];
  t7 += v * b0;
  t8 += v * b1;
  t9 += v * b2;
  t10 += v * b3;
  t11 += v * b4;
  t12 += v * b5;
  t13 += v * b6;
  t14 += v * b7;
  t15 += v * b8;
  t16 += v * b9;
  t17 += v * b10;
  t18 += v * b11;
  t19 += v * b12;
  t20 += v * b13;
  t21 += v * b14;
  t22 += v * b15;
  v = a[8];
  t8 += v * b0;
  t9 += v * b1;
  t10 += v * b2;
  t11 += v * b3;
  t12 += v * b4;
  t13 += v * b5;
  t14 += v * b6;
  t15 += v * b7;
  t16 += v * b8;
  t17 += v * b9;
  t18 += v * b10;
  t19 += v * b11;
  t20 += v * b12;
  t21 += v * b13;
  t22 += v * b14;
  t23 += v * b15;
  v = a[9];
  t9 += v * b0;
  t10 += v * b1;
  t11 += v * b2;
  t12 += v * b3;
  t13 += v * b4;
  t14 += v * b5;
  t15 += v * b6;
  t16 += v * b7;
  t17 += v * b8;
  t18 += v * b9;
  t19 += v * b10;
  t20 += v * b11;
  t21 += v * b12;
  t22 += v * b13;
  t23 += v * b14;
  t24 += v * b15;
  v = a[10];
  t10 += v * b0;
  t11 += v * b1;
  t12 += v * b2;
  t13 += v * b3;
  t14 += v * b4;
  t15 += v * b5;
  t16 += v * b6;
  t17 += v * b7;
  t18 += v * b8;
  t19 += v * b9;
  t20 += v * b10;
  t21 += v * b11;
  t22 += v * b12;
  t23 += v * b13;
  t24 += v * b14;
  t25 += v * b15;
  v = a[11];
  t11 += v * b0;
  t12 += v * b1;
  t13 += v * b2;
  t14 += v * b3;
  t15 += v * b4;
  t16 += v * b5;
  t17 += v * b6;
  t18 += v * b7;
  t19 += v * b8;
  t20 += v * b9;
  t21 += v * b10;
  t22 += v * b11;
  t23 += v * b12;
  t24 += v * b13;
  t25 += v * b14;
  t26 += v * b15;
  v = a[12];
  t12 += v * b0;
  t13 += v * b1;
  t14 += v * b2;
  t15 += v * b3;
  t16 += v * b4;
  t17 += v * b5;
  t18 += v * b6;
  t19 += v * b7;
  t20 += v * b8;
  t21 += v * b9;
  t22 += v * b10;
  t23 += v * b11;
  t24 += v * b12;
  t25 += v * b13;
  t26 += v * b14;
  t27 += v * b15;
  v = a[13];
  t13 += v * b0;
  t14 += v * b1;
  t15 += v * b2;
  t16 += v * b3;
  t17 += v * b4;
  t18 += v * b5;
  t19 += v * b6;
  t20 += v * b7;
  t21 += v * b8;
  t22 += v * b9;
  t23 += v * b10;
  t24 += v * b11;
  t25 += v * b12;
  t26 += v * b13;
  t27 += v * b14;
  t28 += v * b15;
  v = a[14];
  t14 += v * b0;
  t15 += v * b1;
  t16 += v * b2;
  t17 += v * b3;
  t18 += v * b4;
  t19 += v * b5;
  t20 += v * b6;
  t21 += v * b7;
  t22 += v * b8;
  t23 += v * b9;
  t24 += v * b10;
  t25 += v * b11;
  t26 += v * b12;
  t27 += v * b13;
  t28 += v * b14;
  t29 += v * b15;
  v = a[15];
  t15 += v * b0;
  t16 += v * b1;
  t17 += v * b2;
  t18 += v * b3;
  t19 += v * b4;
  t20 += v * b5;
  t21 += v * b6;
  t22 += v * b7;
  t23 += v * b8;
  t24 += v * b9;
  t25 += v * b10;
  t26 += v * b11;
  t27 += v * b12;
  t28 += v * b13;
  t29 += v * b14;
  t30 += v * b15;
  t0 += 38 * t16;
  t1 += 38 * t17;
  t2 += 38 * t18;
  t3 += 38 * t19;
  t4 += 38 * t20;
  t5 += 38 * t21;
  t6 += 38 * t22;
  t7 += 38 * t23;
  t8 += 38 * t24;
  t9 += 38 * t25;
  t10 += 38 * t26;
  t11 += 38 * t27;
  t12 += 38 * t28;
  t13 += 38 * t29;
  t14 += 38 * t30;
  c = 1;
  v = t0 + c + 65535;
  c = Math.floor(v / 65536);
  t0 = v - c * 65536;
  v = t1 + c + 65535;
  c = Math.floor(v / 65536);
  t1 = v - c * 65536;
  v = t2 + c + 65535;
  c = Math.floor(v / 65536);
  t2 = v - c * 65536;
  v = t3 + c + 65535;
  c = Math.floor(v / 65536);
  t3 = v - c * 65536;
  v = t4 + c + 65535;
  c = Math.floor(v / 65536);
  t4 = v - c * 65536;
  v = t5 + c + 65535;
  c = Math.floor(v / 65536);
  t5 = v - c * 65536;
  v = t6 + c + 65535;
  c = Math.floor(v / 65536);
  t6 = v - c * 65536;
  v = t7 + c + 65535;
  c = Math.floor(v / 65536);
  t7 = v - c * 65536;
  v = t8 + c + 65535;
  c = Math.floor(v / 65536);
  t8 = v - c * 65536;
  v = t9 + c + 65535;
  c = Math.floor(v / 65536);
  t9 = v - c * 65536;
  v = t10 + c + 65535;
  c = Math.floor(v / 65536);
  t10 = v - c * 65536;
  v = t11 + c + 65535;
  c = Math.floor(v / 65536);
  t11 = v - c * 65536;
  v = t12 + c + 65535;
  c = Math.floor(v / 65536);
  t12 = v - c * 65536;
  v = t13 + c + 65535;
  c = Math.floor(v / 65536);
  t13 = v - c * 65536;
  v = t14 + c + 65535;
  c = Math.floor(v / 65536);
  t14 = v - c * 65536;
  v = t15 + c + 65535;
  c = Math.floor(v / 65536);
  t15 = v - c * 65536;
  t0 += c - 1 + 37 * (c - 1);
  c = 1;
  v = t0 + c + 65535;
  c = Math.floor(v / 65536);
  t0 = v - c * 65536;
  v = t1 + c + 65535;
  c = Math.floor(v / 65536);
  t1 = v - c * 65536;
  v = t2 + c + 65535;
  c = Math.floor(v / 65536);
  t2 = v - c * 65536;
  v = t3 + c + 65535;
  c = Math.floor(v / 65536);
  t3 = v - c * 65536;
  v = t4 + c + 65535;
  c = Math.floor(v / 65536);
  t4 = v - c * 65536;
  v = t5 + c + 65535;
  c = Math.floor(v / 65536);
  t5 = v - c * 65536;
  v = t6 + c + 65535;
  c = Math.floor(v / 65536);
  t6 = v - c * 65536;
  v = t7 + c + 65535;
  c = Math.floor(v / 65536);
  t7 = v - c * 65536;
  v = t8 + c + 65535;
  c = Math.floor(v / 65536);
  t8 = v - c * 65536;
  v = t9 + c + 65535;
  c = Math.floor(v / 65536);
  t9 = v - c * 65536;
  v = t10 + c + 65535;
  c = Math.floor(v / 65536);
  t10 = v - c * 65536;
  v = t11 + c + 65535;
  c = Math.floor(v / 65536);
  t11 = v - c * 65536;
  v = t12 + c + 65535;
  c = Math.floor(v / 65536);
  t12 = v - c * 65536;
  v = t13 + c + 65535;
  c = Math.floor(v / 65536);
  t13 = v - c * 65536;
  v = t14 + c + 65535;
  c = Math.floor(v / 65536);
  t14 = v - c * 65536;
  v = t15 + c + 65535;
  c = Math.floor(v / 65536);
  t15 = v - c * 65536;
  t0 += c - 1 + 37 * (c - 1);
  o[0] = t0;
  o[1] = t1;
  o[2] = t2;
  o[3] = t3;
  o[4] = t4;
  o[5] = t5;
  o[6] = t6;
  o[7] = t7;
  o[8] = t8;
  o[9] = t9;
  o[10] = t10;
  o[11] = t11;
  o[12] = t12;
  o[13] = t13;
  o[14] = t14;
  o[15] = t15;
}
function S(o, a) {
  M(o, a, a);
}
function inv25519(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 253; a >= 0; a--) {
    S(c, c);
    if (a !== 2 && a !== 4) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}
function pow2523(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 250; a >= 0; a--) {
    S(c, c);
    if (a !== 1) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}
function crypto_scalarmult(q, n, p) {
  var z = new Uint8Array(32);
  var x = new Float64Array(80), r, i;
  var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf();
  for (i = 0; i < 31; i++) z[i] = n[i];
  z[31] = n[31] & 127 | 64;
  z[0] &= 248;
  unpack25519(x, p);
  for (i = 0; i < 16; i++) {
    b[i] = x[i];
    d[i] = a[i] = c[i] = 0;
  }
  a[0] = d[0] = 1;
  for (i = 254; i >= 0; --i) {
    r = z[i >>> 3] >>> (i & 7) & 1;
    sel25519(a, b, r);
    sel25519(c, d, r);
    A(e, a, c);
    Z(a, a, c);
    A(c, b, d);
    Z(b, b, d);
    S(d, e);
    S(f, a);
    M(a, c, a);
    M(c, b, e);
    A(e, a, c);
    Z(a, a, c);
    S(b, a);
    Z(c, d, f);
    M(a, c, _121665);
    A(a, a, d);
    M(c, c, a);
    M(a, d, f);
    M(d, b, x);
    S(b, e);
    sel25519(a, b, r);
    sel25519(c, d, r);
  }
  for (i = 0; i < 16; i++) {
    x[i + 16] = a[i];
    x[i + 32] = c[i];
    x[i + 48] = b[i];
    x[i + 64] = d[i];
  }
  var x32 = x.subarray(32);
  var x16 = x.subarray(16);
  inv25519(x32, x32);
  M(x16, x16, x32);
  pack25519(q, x16);
  return 0;
}
function crypto_scalarmult_base(q, n) {
  return crypto_scalarmult(q, n, _9);
}
function crypto_box_keypair(y, x) {
  randombytes(x, 32);
  return crypto_scalarmult_base(y, x);
}
function crypto_hashblocks_hl(hh, hl, m, n) {
  var wh = new Int32Array(16), wl = new Int32Array(16), bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7, bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7, th, tl, i, j, h, l, a, b, c, d;
  var ah0 = hh[0], ah1 = hh[1], ah2 = hh[2], ah3 = hh[3], ah4 = hh[4], ah5 = hh[5], ah6 = hh[6], ah7 = hh[7], al0 = hl[0], al1 = hl[1], al2 = hl[2], al3 = hl[3], al4 = hl[4], al5 = hl[5], al6 = hl[6], al7 = hl[7];
  var pos = 0;
  while (n >= 128) {
    for (i = 0; i < 16; i++) {
      j = 8 * i + pos;
      wh[i] = m[j + 0] << 24 | m[j + 1] << 16 | m[j + 2] << 8 | m[j + 3];
      wl[i] = m[j + 4] << 24 | m[j + 5] << 16 | m[j + 6] << 8 | m[j + 7];
    }
    for (i = 0; i < 80; i++) {
      bh0 = ah0;
      bh1 = ah1;
      bh2 = ah2;
      bh3 = ah3;
      bh4 = ah4;
      bh5 = ah5;
      bh6 = ah6;
      bh7 = ah7;
      bl0 = al0;
      bl1 = al1;
      bl2 = al2;
      bl3 = al3;
      bl4 = al4;
      bl5 = al5;
      bl6 = al6;
      bl7 = al7;
      h = ah7;
      l = al7;
      a = l & 65535;
      b = l >>> 16;
      c = h & 65535;
      d = h >>> 16;
      h = (ah4 >>> 14 | al4 << 32 - 14) ^ (ah4 >>> 18 | al4 << 32 - 18) ^ (al4 >>> 41 - 32 | ah4 << 32 - (41 - 32));
      l = (al4 >>> 14 | ah4 << 32 - 14) ^ (al4 >>> 18 | ah4 << 32 - 18) ^ (ah4 >>> 41 - 32 | al4 << 32 - (41 - 32));
      a += l & 65535;
      b += l >>> 16;
      c += h & 65535;
      d += h >>> 16;
      h = ah4 & ah5 ^ ~ah4 & ah6;
      l = al4 & al5 ^ ~al4 & al6;
      a += l & 65535;
      b += l >>> 16;
      c += h & 65535;
      d += h >>> 16;
      h = K2[i * 2];
      l = K2[i * 2 + 1];
      a += l & 65535;
      b += l >>> 16;
      c += h & 65535;
      d += h >>> 16;
      h = wh[i % 16];
      l = wl[i % 16];
      a += l & 65535;
      b += l >>> 16;
      c += h & 65535;
      d += h >>> 16;
      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;
      th = c & 65535 | d << 16;
      tl = a & 65535 | b << 16;
      h = th;
      l = tl;
      a = l & 65535;
      b = l >>> 16;
      c = h & 65535;
      d = h >>> 16;
      h = (ah0 >>> 28 | al0 << 32 - 28) ^ (al0 >>> 34 - 32 | ah0 << 32 - (34 - 32)) ^ (al0 >>> 39 - 32 | ah0 << 32 - (39 - 32));
      l = (al0 >>> 28 | ah0 << 32 - 28) ^ (ah0 >>> 34 - 32 | al0 << 32 - (34 - 32)) ^ (ah0 >>> 39 - 32 | al0 << 32 - (39 - 32));
      a += l & 65535;
      b += l >>> 16;
      c += h & 65535;
      d += h >>> 16;
      h = ah0 & ah1 ^ ah0 & ah2 ^ ah1 & ah2;
      l = al0 & al1 ^ al0 & al2 ^ al1 & al2;
      a += l & 65535;
      b += l >>> 16;
      c += h & 65535;
      d += h >>> 16;
      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;
      bh7 = c & 65535 | d << 16;
      bl7 = a & 65535 | b << 16;
      h = bh3;
      l = bl3;
      a = l & 65535;
      b = l >>> 16;
      c = h & 65535;
      d = h >>> 16;
      h = th;
      l = tl;
      a += l & 65535;
      b += l >>> 16;
      c += h & 65535;
      d += h >>> 16;
      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;
      bh3 = c & 65535 | d << 16;
      bl3 = a & 65535 | b << 16;
      ah1 = bh0;
      ah2 = bh1;
      ah3 = bh2;
      ah4 = bh3;
      ah5 = bh4;
      ah6 = bh5;
      ah7 = bh6;
      ah0 = bh7;
      al1 = bl0;
      al2 = bl1;
      al3 = bl2;
      al4 = bl3;
      al5 = bl4;
      al6 = bl5;
      al7 = bl6;
      al0 = bl7;
      if (i % 16 === 15) {
        for (j = 0; j < 16; j++) {
          h = wh[j];
          l = wl[j];
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = wh[(j + 9) % 16];
          l = wl[(j + 9) % 16];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          th = wh[(j + 1) % 16];
          tl = wl[(j + 1) % 16];
          h = (th >>> 1 | tl << 32 - 1) ^ (th >>> 8 | tl << 32 - 8) ^ th >>> 7;
          l = (tl >>> 1 | th << 32 - 1) ^ (tl >>> 8 | th << 32 - 8) ^ (tl >>> 7 | th << 32 - 7);
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          th = wh[(j + 14) % 16];
          tl = wl[(j + 14) % 16];
          h = (th >>> 19 | tl << 32 - 19) ^ (tl >>> 61 - 32 | th << 32 - (61 - 32)) ^ th >>> 6;
          l = (tl >>> 19 | th << 32 - 19) ^ (th >>> 61 - 32 | tl << 32 - (61 - 32)) ^ (tl >>> 6 | th << 32 - 6);
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          wh[j] = c & 65535 | d << 16;
          wl[j] = a & 65535 | b << 16;
        }
      }
    }
    h = ah0;
    l = al0;
    a = l & 65535;
    b = l >>> 16;
    c = h & 65535;
    d = h >>> 16;
    h = hh[0];
    l = hl[0];
    a += l & 65535;
    b += l >>> 16;
    c += h & 65535;
    d += h >>> 16;
    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;
    hh[0] = ah0 = c & 65535 | d << 16;
    hl[0] = al0 = a & 65535 | b << 16;
    h = ah1;
    l = al1;
    a = l & 65535;
    b = l >>> 16;
    c = h & 65535;
    d = h >>> 16;
    h = hh[1];
    l = hl[1];
    a += l & 65535;
    b += l >>> 16;
    c += h & 65535;
    d += h >>> 16;
    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;
    hh[1] = ah1 = c & 65535 | d << 16;
    hl[1] = al1 = a & 65535 | b << 16;
    h = ah2;
    l = al2;
    a = l & 65535;
    b = l >>> 16;
    c = h & 65535;
    d = h >>> 16;
    h = hh[2];
    l = hl[2];
    a += l & 65535;
    b += l >>> 16;
    c += h & 65535;
    d += h >>> 16;
    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;
    hh[2] = ah2 = c & 65535 | d << 16;
    hl[2] = al2 = a & 65535 | b << 16;
    h = ah3;
    l = al3;
    a = l & 65535;
    b = l >>> 16;
    c = h & 65535;
    d = h >>> 16;
    h = hh[3];
    l = hl[3];
    a += l & 65535;
    b += l >>> 16;
    c += h & 65535;
    d += h >>> 16;
    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;
    hh[3] = ah3 = c & 65535 | d << 16;
    hl[3] = al3 = a & 65535 | b << 16;
    h = ah4;
    l = al4;
    a = l & 65535;
    b = l >>> 16;
    c = h & 65535;
    d = h >>> 16;
    h = hh[4];
    l = hl[4];
    a += l & 65535;
    b += l >>> 16;
    c += h & 65535;
    d += h >>> 16;
    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;
    hh[4] = ah4 = c & 65535 | d << 16;
    hl[4] = al4 = a & 65535 | b << 16;
    h = ah5;
    l = al5;
    a = l & 65535;
    b = l >>> 16;
    c = h & 65535;
    d = h >>> 16;
    h = hh[5];
    l = hl[5];
    a += l & 65535;
    b += l >>> 16;
    c += h & 65535;
    d += h >>> 16;
    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;
    hh[5] = ah5 = c & 65535 | d << 16;
    hl[5] = al5 = a & 65535 | b << 16;
    h = ah6;
    l = al6;
    a = l & 65535;
    b = l >>> 16;
    c = h & 65535;
    d = h >>> 16;
    h = hh[6];
    l = hl[6];
    a += l & 65535;
    b += l >>> 16;
    c += h & 65535;
    d += h >>> 16;
    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;
    hh[6] = ah6 = c & 65535 | d << 16;
    hl[6] = al6 = a & 65535 | b << 16;
    h = ah7;
    l = al7;
    a = l & 65535;
    b = l >>> 16;
    c = h & 65535;
    d = h >>> 16;
    h = hh[7];
    l = hl[7];
    a += l & 65535;
    b += l >>> 16;
    c += h & 65535;
    d += h >>> 16;
    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;
    hh[7] = ah7 = c & 65535 | d << 16;
    hl[7] = al7 = a & 65535 | b << 16;
    pos += 128;
    n -= 128;
  }
  return n;
}
function crypto_hash(out, m, n) {
  var hh = new Int32Array(8), hl = new Int32Array(8), x = new Uint8Array(256), i, b = n;
  hh[0] = 1779033703;
  hh[1] = 3144134277;
  hh[2] = 1013904242;
  hh[3] = 2773480762;
  hh[4] = 1359893119;
  hh[5] = 2600822924;
  hh[6] = 528734635;
  hh[7] = 1541459225;
  hl[0] = 4089235720;
  hl[1] = 2227873595;
  hl[2] = 4271175723;
  hl[3] = 1595750129;
  hl[4] = 2917565137;
  hl[5] = 725511199;
  hl[6] = 4215389547;
  hl[7] = 327033209;
  crypto_hashblocks_hl(hh, hl, m, n);
  n %= 128;
  for (i = 0; i < n; i++) x[i] = m[b - n + i];
  x[n] = 128;
  n = 256 - 128 * (n < 112 ? 1 : 0);
  x[n - 9] = 0;
  ts64(x, n - 8, b / 536870912 | 0, b << 3);
  crypto_hashblocks_hl(hh, hl, x, n);
  for (i = 0; i < 8; i++) ts64(out, 8 * i, hh[i], hl[i]);
  return 0;
}
function add2(p, q) {
  var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf(), g = gf(), h = gf(), t = gf();
  Z(a, p[1], p[0]);
  Z(t, q[1], q[0]);
  M(a, a, t);
  A(b, p[0], p[1]);
  A(t, q[0], q[1]);
  M(b, b, t);
  M(c, p[3], q[3]);
  M(c, c, D2);
  M(d, p[2], q[2]);
  A(d, d, d);
  Z(e, b, a);
  Z(f, d, c);
  A(g, d, c);
  A(h, b, a);
  M(p[0], e, f);
  M(p[1], h, g);
  M(p[2], g, f);
  M(p[3], e, h);
}
function cswap(p, q, b) {
  var i;
  for (i = 0; i < 4; i++) {
    sel25519(p[i], q[i], b);
  }
}
function pack(r, p) {
  var tx = gf(), ty = gf(), zi = gf();
  inv25519(zi, p[2]);
  M(tx, p[0], zi);
  M(ty, p[1], zi);
  pack25519(r, ty);
  r[31] ^= par25519(tx) << 7;
}
function scalarmult(p, q, s) {
  var b, i;
  set25519(p[0], gf0);
  set25519(p[1], gf1);
  set25519(p[2], gf1);
  set25519(p[3], gf0);
  for (i = 255; i >= 0; --i) {
    b = s[i / 8 | 0] >> (i & 7) & 1;
    cswap(p, q, b);
    add2(q, p);
    add2(p, p);
    cswap(p, q, b);
  }
}
function scalarbase(p, s) {
  var q = [gf(), gf(), gf(), gf()];
  set25519(q[0], X);
  set25519(q[1], Y);
  set25519(q[2], gf1);
  M(q[3], X, Y);
  scalarmult(p, q, s);
}
function crypto_sign_keypair(pk, sk, seeded) {
  var d = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()];
  var i;
  if (!seeded) randombytes(sk, 32);
  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;
  scalarbase(p, d);
  pack(pk, p);
  for (i = 0; i < 32; i++) sk[i + 32] = pk[i];
  return 0;
}
function modL(r, x) {
  var carry, i, j, k;
  for (i = 63; i >= 32; --i) {
    carry = 0;
    for (j = i - 32, k = i - 12; j < k; ++j) {
      x[j] += carry - 16 * x[i] * L[j - (i - 32)];
      carry = Math.floor((x[j] + 128) / 256);
      x[j] -= carry * 256;
    }
    x[j] += carry;
    x[i] = 0;
  }
  carry = 0;
  for (j = 0; j < 32; j++) {
    x[j] += carry - (x[31] >> 4) * L[j];
    carry = x[j] >> 8;
    x[j] &= 255;
  }
  for (j = 0; j < 32; j++) x[j] -= carry * L[j];
  for (i = 0; i < 32; i++) {
    x[i + 1] += x[i] >> 8;
    r[i] = x[i] & 255;
  }
}
function reduce(r) {
  var x = new Float64Array(64), i;
  for (i = 0; i < 64; i++) x[i] = r[i];
  for (i = 0; i < 64; i++) r[i] = 0;
  modL(r, x);
}
function crypto_sign(sm, m, n, sk) {
  var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
  var i, j, x = new Float64Array(64);
  var p = [gf(), gf(), gf(), gf()];
  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;
  var smlen = n + 64;
  for (i = 0; i < n; i++) sm[64 + i] = m[i];
  for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];
  crypto_hash(r, sm.subarray(32), n + 32);
  reduce(r);
  scalarbase(p, r);
  pack(sm, p);
  for (i = 32; i < 64; i++) sm[i] = sk[i];
  crypto_hash(h, sm, n + 64);
  reduce(h);
  for (i = 0; i < 64; i++) x[i] = 0;
  for (i = 0; i < 32; i++) x[i] = r[i];
  for (i = 0; i < 32; i++) {
    for (j = 0; j < 32; j++) {
      x[i + j] += h[i] * d[j];
    }
  }
  modL(sm.subarray(32), x);
  return smlen;
}
function unpackneg(r, p) {
  var t = gf(), chk = gf(), num = gf(), den = gf(), den2 = gf(), den4 = gf(), den6 = gf();
  set25519(r[2], gf1);
  unpack25519(r[1], p);
  S(num, r[1]);
  M(den, num, D);
  Z(num, num, r[2]);
  A(den, r[2], den);
  S(den2, den);
  S(den4, den2);
  M(den6, den4, den2);
  M(t, den6, num);
  M(t, t, den);
  pow2523(t, t);
  M(t, t, num);
  M(t, t, den);
  M(t, t, den);
  M(r[0], t, den);
  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) M(r[0], r[0], I);
  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) return -1;
  if (par25519(r[0]) === p[31] >> 7) Z(r[0], gf0, r[0]);
  M(r[3], r[0], r[1]);
  return 0;
}
function crypto_sign_open(m, sm, n, pk) {
  var i;
  var t = new Uint8Array(32), h = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
  if (n < 64) return -1;
  if (unpackneg(q, pk)) return -1;
  for (i = 0; i < n; i++) m[i] = sm[i];
  for (i = 0; i < 32; i++) m[i + 32] = pk[i];
  crypto_hash(h, m, n);
  reduce(h);
  scalarmult(p, q, h);
  scalarbase(q, sm.subarray(32));
  add2(p, q);
  pack(t, p);
  n -= 64;
  if (crypto_verify_32(sm, 0, t, 0)) {
    for (i = 0; i < n; i++) m[i] = 0;
    return -1;
  }
  for (i = 0; i < n; i++) m[i] = sm[i + 64];
  return n;
}
function checkArrayTypes() {
  for (var i = 0; i < arguments.length; i++) {
    if (!(arguments[i] instanceof Uint8Array))
      throw new TypeError("unexpected type, use Uint8Array");
  }
}
function cleanup(arr) {
  for (var i = 0; i < arr.length; i++) arr[i] = 0;
}
var nacl, nacl_fast_default, gf, randombytes, _9, gf0, gf1, _121665, D, D2, X, Y, I, K2, L, crypto_scalarmult_BYTES, crypto_scalarmult_SCALARBYTES, crypto_box_PUBLICKEYBYTES, crypto_box_SECRETKEYBYTES, crypto_sign_BYTES, crypto_sign_PUBLICKEYBYTES, crypto_sign_SECRETKEYBYTES, crypto_sign_SEEDBYTES;
var init_nacl_fast = __esm({
  "vendor/src/tweetnacl-js/nacl-fast.js"() {
    init_cryptoBrowser();
    nacl = {};
    nacl_fast_default = nacl;
    gf = function(init) {
      var i, r = new Float64Array(16);
      if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
      return r;
    };
    randombytes = function() {
      throw new Error("no PRNG");
    };
    _9 = new Uint8Array(32);
    _9[0] = 9;
    gf0 = gf();
    gf1 = gf([1]);
    _121665 = gf([56129, 1]);
    D = gf([30883, 4953, 19914, 30187, 55467, 16705, 2637, 112, 59544, 30585, 16505, 36039, 65139, 11119, 27886, 20995]);
    D2 = gf([61785, 9906, 39828, 60374, 45398, 33411, 5274, 224, 53552, 61171, 33010, 6542, 64743, 22239, 55772, 9222]);
    X = gf([54554, 36645, 11616, 51542, 42930, 38181, 51040, 26924, 56412, 64982, 57905, 49316, 21502, 52590, 14035, 8553]);
    Y = gf([26200, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214]);
    I = gf([41136, 18958, 6951, 50414, 58488, 44335, 6150, 12099, 55207, 15867, 153, 11085, 57099, 20417, 9344, 11139]);
    K2 = [
      1116352408,
      3609767458,
      1899447441,
      602891725,
      3049323471,
      3964484399,
      3921009573,
      2173295548,
      961987163,
      4081628472,
      1508970993,
      3053834265,
      2453635748,
      2937671579,
      2870763221,
      3664609560,
      3624381080,
      2734883394,
      310598401,
      1164996542,
      607225278,
      1323610764,
      1426881987,
      3590304994,
      1925078388,
      4068182383,
      2162078206,
      991336113,
      2614888103,
      633803317,
      3248222580,
      3479774868,
      3835390401,
      2666613458,
      4022224774,
      944711139,
      264347078,
      2341262773,
      604807628,
      2007800933,
      770255983,
      1495990901,
      1249150122,
      1856431235,
      1555081692,
      3175218132,
      1996064986,
      2198950837,
      2554220882,
      3999719339,
      2821834349,
      766784016,
      2952996808,
      2566594879,
      3210313671,
      3203337956,
      3336571891,
      1034457026,
      3584528711,
      2466948901,
      113926993,
      3758326383,
      338241895,
      168717936,
      666307205,
      1188179964,
      773529912,
      1546045734,
      1294757372,
      1522805485,
      1396182291,
      2643833823,
      1695183700,
      2343527390,
      1986661051,
      1014477480,
      2177026350,
      1206759142,
      2456956037,
      344077627,
      2730485921,
      1290863460,
      2820302411,
      3158454273,
      3259730800,
      3505952657,
      3345764771,
      106217008,
      3516065817,
      3606008344,
      3600352804,
      1432725776,
      4094571909,
      1467031594,
      275423344,
      851169720,
      430227734,
      3100823752,
      506948616,
      1363258195,
      659060556,
      3750685593,
      883997877,
      3785050280,
      958139571,
      3318307427,
      1322822218,
      3812723403,
      1537002063,
      2003034995,
      1747873779,
      3602036899,
      1955562222,
      1575990012,
      2024104815,
      1125592928,
      2227730452,
      2716904306,
      2361852424,
      442776044,
      2428436474,
      593698344,
      2756734187,
      3733110249,
      3204031479,
      2999351573,
      3329325298,
      3815920427,
      3391569614,
      3928383900,
      3515267271,
      566280711,
      3940187606,
      3454069534,
      4118630271,
      4000239992,
      116418474,
      1914138554,
      174292421,
      2731055270,
      289380356,
      3203993006,
      460393269,
      320620315,
      685471733,
      587496836,
      852142971,
      1086792851,
      1017036298,
      365543100,
      1126000580,
      2618297676,
      1288033470,
      3409855158,
      1501505948,
      4234509866,
      1607167915,
      987167468,
      1816402316,
      1246189591
    ];
    L = new Float64Array([237, 211, 245, 92, 26, 99, 18, 88, 214, 156, 247, 162, 222, 249, 222, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16]);
    crypto_scalarmult_BYTES = 32;
    crypto_scalarmult_SCALARBYTES = 32;
    crypto_box_PUBLICKEYBYTES = 32;
    crypto_box_SECRETKEYBYTES = 32;
    crypto_sign_BYTES = 64;
    crypto_sign_PUBLICKEYBYTES = 32;
    crypto_sign_SECRETKEYBYTES = 64;
    crypto_sign_SEEDBYTES = 32;
    nacl.scalarMult = function(n, p) {
      checkArrayTypes(n, p);
      if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
      if (p.length !== crypto_scalarmult_BYTES) throw new Error("bad p size");
      var q = new Uint8Array(crypto_scalarmult_BYTES);
      crypto_scalarmult(q, n, p);
      return q;
    };
    nacl.box = {};
    nacl.box.keyPair = function() {
      var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
      var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
      crypto_box_keypair(pk, sk);
      return { publicKey: pk, secretKey: sk };
    };
    nacl.box.keyPair.fromSecretKey = function(secretKey) {
      checkArrayTypes(secretKey);
      if (secretKey.length !== crypto_box_SECRETKEYBYTES)
        throw new Error("bad secret key size");
      var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
      crypto_scalarmult_base(pk, secretKey);
      return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
    };
    nacl.sign = function(msg, secretKey) {
      checkArrayTypes(msg, secretKey);
      if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
        throw new Error("bad secret key size");
      var signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
      crypto_sign(signedMsg, msg, msg.length, secretKey);
      return signedMsg;
    };
    nacl.sign.detached = function(msg, secretKey) {
      var signedMsg = nacl.sign(msg, secretKey);
      var sig = new Uint8Array(crypto_sign_BYTES);
      for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
      return sig;
    };
    nacl.sign.detached.verify = function(msg, sig, publicKey) {
      checkArrayTypes(msg, sig, publicKey);
      if (sig.length !== crypto_sign_BYTES)
        throw new Error("bad signature size");
      if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
        throw new Error("bad public key size");
      var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
      var m = new Uint8Array(crypto_sign_BYTES + msg.length);
      var i;
      for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
      for (i = 0; i < msg.length; i++) sm[i + crypto_sign_BYTES] = msg[i];
      return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
    };
    nacl.sign.keyPair = function() {
      var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
      var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
      crypto_sign_keypair(pk, sk);
      return { publicKey: pk, secretKey: sk };
    };
    nacl.sign.keyPair.fromSecretKey = function(secretKey) {
      checkArrayTypes(secretKey);
      if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
        throw new Error("bad secret key size");
      var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
      for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32 + i];
      return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
    };
    nacl.sign.keyPair.fromSeed = function(seed) {
      checkArrayTypes(seed);
      if (seed.length !== crypto_sign_SEEDBYTES)
        throw new Error("bad seed size");
      var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
      var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
      for (var i = 0; i < 32; i++) sk[i] = seed[i];
      crypto_sign_keypair(pk, sk, true);
      return { publicKey: pk, secretKey: sk };
    };
    nacl.setPRNG = function(fn) {
      randombytes = fn;
    };
    (function() {
      if (crypto3 && crypto3.getRandomValues) {
        var QUOTA = 65536;
        nacl.setPRNG(function(x, n) {
          var i, v = new Uint8Array(n);
          for (i = 0; i < n; i += QUOTA) {
            crypto3.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
          }
          for (i = 0; i < n; i++) x[i] = v[i];
          cleanup(v);
        });
      }
    })();
  }
});

// vendor/src/openpgpjs/src/crypto/cipher/des.js
function des(keys, message, encrypt8, mode, iv, padding) {
  const spfunction1 = [
    16843776,
    0,
    65536,
    16843780,
    16842756,
    66564,
    4,
    65536,
    1024,
    16843776,
    16843780,
    1024,
    16778244,
    16842756,
    16777216,
    4,
    1028,
    16778240,
    16778240,
    66560,
    66560,
    16842752,
    16842752,
    16778244,
    65540,
    16777220,
    16777220,
    65540,
    0,
    1028,
    66564,
    16777216,
    65536,
    16843780,
    4,
    16842752,
    16843776,
    16777216,
    16777216,
    1024,
    16842756,
    65536,
    66560,
    16777220,
    1024,
    4,
    16778244,
    66564,
    16843780,
    65540,
    16842752,
    16778244,
    16777220,
    1028,
    66564,
    16843776,
    1028,
    16778240,
    16778240,
    0,
    65540,
    66560,
    0,
    16842756
  ];
  const spfunction2 = [
    -2146402272,
    -2147450880,
    32768,
    1081376,
    1048576,
    32,
    -2146435040,
    -2147450848,
    -2147483616,
    -2146402272,
    -2146402304,
    -2147483648,
    -2147450880,
    1048576,
    32,
    -2146435040,
    1081344,
    1048608,
    -2147450848,
    0,
    -2147483648,
    32768,
    1081376,
    -2146435072,
    1048608,
    -2147483616,
    0,
    1081344,
    32800,
    -2146402304,
    -2146435072,
    32800,
    0,
    1081376,
    -2146435040,
    1048576,
    -2147450848,
    -2146435072,
    -2146402304,
    32768,
    -2146435072,
    -2147450880,
    32,
    -2146402272,
    1081376,
    32,
    32768,
    -2147483648,
    32800,
    -2146402304,
    1048576,
    -2147483616,
    1048608,
    -2147450848,
    -2147483616,
    1048608,
    1081344,
    0,
    -2147450880,
    32800,
    -2147483648,
    -2146435040,
    -2146402272,
    1081344
  ];
  const spfunction3 = [
    520,
    134349312,
    0,
    134348808,
    134218240,
    0,
    131592,
    134218240,
    131080,
    134217736,
    134217736,
    131072,
    134349320,
    131080,
    134348800,
    520,
    134217728,
    8,
    134349312,
    512,
    131584,
    134348800,
    134348808,
    131592,
    134218248,
    131584,
    131072,
    134218248,
    8,
    134349320,
    512,
    134217728,
    134349312,
    134217728,
    131080,
    520,
    131072,
    134349312,
    134218240,
    0,
    512,
    131080,
    134349320,
    134218240,
    134217736,
    512,
    0,
    134348808,
    134218248,
    131072,
    134217728,
    134349320,
    8,
    131592,
    131584,
    134217736,
    134348800,
    134218248,
    520,
    134348800,
    131592,
    8,
    134348808,
    131584
  ];
  const spfunction4 = [
    8396801,
    8321,
    8321,
    128,
    8396928,
    8388737,
    8388609,
    8193,
    0,
    8396800,
    8396800,
    8396929,
    129,
    0,
    8388736,
    8388609,
    1,
    8192,
    8388608,
    8396801,
    128,
    8388608,
    8193,
    8320,
    8388737,
    1,
    8320,
    8388736,
    8192,
    8396928,
    8396929,
    129,
    8388736,
    8388609,
    8396800,
    8396929,
    129,
    0,
    0,
    8396800,
    8320,
    8388736,
    8388737,
    1,
    8396801,
    8321,
    8321,
    128,
    8396929,
    129,
    1,
    8192,
    8388609,
    8193,
    8396928,
    8388737,
    8193,
    8320,
    8388608,
    8396801,
    128,
    8388608,
    8192,
    8396928
  ];
  const spfunction5 = [
    256,
    34078976,
    34078720,
    1107296512,
    524288,
    256,
    1073741824,
    34078720,
    1074266368,
    524288,
    33554688,
    1074266368,
    1107296512,
    1107820544,
    524544,
    1073741824,
    33554432,
    1074266112,
    1074266112,
    0,
    1073742080,
    1107820800,
    1107820800,
    33554688,
    1107820544,
    1073742080,
    0,
    1107296256,
    34078976,
    33554432,
    1107296256,
    524544,
    524288,
    1107296512,
    256,
    33554432,
    1073741824,
    34078720,
    1107296512,
    1074266368,
    33554688,
    1073741824,
    1107820544,
    34078976,
    1074266368,
    256,
    33554432,
    1107820544,
    1107820800,
    524544,
    1107296256,
    1107820800,
    34078720,
    0,
    1074266112,
    1107296256,
    524544,
    33554688,
    1073742080,
    524288,
    0,
    1074266112,
    34078976,
    1073742080
  ];
  const spfunction6 = [
    536870928,
    541065216,
    16384,
    541081616,
    541065216,
    16,
    541081616,
    4194304,
    536887296,
    4210704,
    4194304,
    536870928,
    4194320,
    536887296,
    536870912,
    16400,
    0,
    4194320,
    536887312,
    16384,
    4210688,
    536887312,
    16,
    541065232,
    541065232,
    0,
    4210704,
    541081600,
    16400,
    4210688,
    541081600,
    536870912,
    536887296,
    16,
    541065232,
    4210688,
    541081616,
    4194304,
    16400,
    536870928,
    4194304,
    536887296,
    536870912,
    16400,
    536870928,
    541081616,
    4210688,
    541065216,
    4210704,
    541081600,
    0,
    541065232,
    16,
    16384,
    541065216,
    4210704,
    16384,
    4194320,
    536887312,
    0,
    541081600,
    536870912,
    4194320,
    536887312
  ];
  const spfunction7 = [
    2097152,
    69206018,
    67110914,
    0,
    2048,
    67110914,
    2099202,
    69208064,
    69208066,
    2097152,
    0,
    67108866,
    2,
    67108864,
    69206018,
    2050,
    67110912,
    2099202,
    2097154,
    67110912,
    67108866,
    69206016,
    69208064,
    2097154,
    69206016,
    2048,
    2050,
    69208066,
    2099200,
    2,
    67108864,
    2099200,
    67108864,
    2099200,
    2097152,
    67110914,
    67110914,
    69206018,
    69206018,
    2,
    2097154,
    67108864,
    67110912,
    2097152,
    69208064,
    2050,
    2099202,
    69208064,
    2050,
    67108866,
    69208066,
    69206016,
    2099200,
    0,
    2,
    69208066,
    0,
    2099202,
    69206016,
    2048,
    67108866,
    67110912,
    2048,
    2097154
  ];
  const spfunction8 = [
    268439616,
    4096,
    262144,
    268701760,
    268435456,
    268439616,
    64,
    268435456,
    262208,
    268697600,
    268701760,
    266240,
    268701696,
    266304,
    4096,
    64,
    268697600,
    268435520,
    268439552,
    4160,
    266240,
    262208,
    268697664,
    268701696,
    4160,
    0,
    0,
    268697664,
    268435520,
    268439552,
    266304,
    262144,
    266304,
    262144,
    268701696,
    4096,
    64,
    268697664,
    4096,
    266304,
    268439552,
    64,
    268435520,
    268697600,
    268697664,
    268435456,
    262144,
    268439616,
    0,
    268701760,
    262208,
    268435520,
    268697600,
    268439552,
    268439616,
    0,
    268701760,
    266240,
    266240,
    4160,
    4160,
    262208,
    268435456,
    268701696
  ];
  let m = 0;
  let i;
  let j;
  let temp;
  let right1;
  let right2;
  let left;
  let right;
  let looping;
  let cbcleft;
  let cbcleft2;
  let cbcright;
  let cbcright2;
  let endloop;
  let loopinc;
  let len = message.length;
  const iterations = keys.length === 32 ? 3 : 9;
  if (iterations === 3) {
    looping = encrypt8 ? [0, 32, 2] : [30, -2, -2];
  } else {
    looping = encrypt8 ? [0, 32, 2, 62, 30, -2, 64, 96, 2] : [94, 62, -2, 32, 64, 2, 30, -2, -2];
  }
  if (encrypt8) {
    message = desAddPadding(message, padding);
    len = message.length;
  }
  let result = new Uint8Array(len);
  let k = 0;
  if (mode === 1) {
    cbcleft = iv[m++] << 24 | iv[m++] << 16 | iv[m++] << 8 | iv[m++];
    cbcright = iv[m++] << 24 | iv[m++] << 16 | iv[m++] << 8 | iv[m++];
    m = 0;
  }
  while (m < len) {
    left = message[m++] << 24 | message[m++] << 16 | message[m++] << 8 | message[m++];
    right = message[m++] << 24 | message[m++] << 16 | message[m++] << 8 | message[m++];
    if (mode === 1) {
      if (encrypt8) {
        left ^= cbcleft;
        right ^= cbcright;
      } else {
        cbcleft2 = cbcleft;
        cbcright2 = cbcright;
        cbcleft = left;
        cbcright = right;
      }
    }
    temp = (left >>> 4 ^ right) & 252645135;
    right ^= temp;
    left ^= temp << 4;
    temp = (left >>> 16 ^ right) & 65535;
    right ^= temp;
    left ^= temp << 16;
    temp = (right >>> 2 ^ left) & 858993459;
    left ^= temp;
    right ^= temp << 2;
    temp = (right >>> 8 ^ left) & 16711935;
    left ^= temp;
    right ^= temp << 8;
    temp = (left >>> 1 ^ right) & 1431655765;
    right ^= temp;
    left ^= temp << 1;
    left = left << 1 | left >>> 31;
    right = right << 1 | right >>> 31;
    for (j = 0; j < iterations; j += 3) {
      endloop = looping[j + 1];
      loopinc = looping[j + 2];
      for (i = looping[j]; i !== endloop; i += loopinc) {
        right1 = right ^ keys[i];
        right2 = (right >>> 4 | right << 28) ^ keys[i + 1];
        temp = left;
        left = right;
        right = temp ^ (spfunction2[right1 >>> 24 & 63] | spfunction4[right1 >>> 16 & 63] | spfunction6[right1 >>> 8 & 63] | spfunction8[right1 & 63] | spfunction1[right2 >>> 24 & 63] | spfunction3[right2 >>> 16 & 63] | spfunction5[right2 >>> 8 & 63] | spfunction7[right2 & 63]);
      }
      temp = left;
      left = right;
      right = temp;
    }
    left = left >>> 1 | left << 31;
    right = right >>> 1 | right << 31;
    temp = (left >>> 1 ^ right) & 1431655765;
    right ^= temp;
    left ^= temp << 1;
    temp = (right >>> 8 ^ left) & 16711935;
    left ^= temp;
    right ^= temp << 8;
    temp = (right >>> 2 ^ left) & 858993459;
    left ^= temp;
    right ^= temp << 2;
    temp = (left >>> 16 ^ right) & 65535;
    right ^= temp;
    left ^= temp << 16;
    temp = (left >>> 4 ^ right) & 252645135;
    right ^= temp;
    left ^= temp << 4;
    if (mode === 1) {
      if (encrypt8) {
        cbcleft = left;
        cbcright = right;
      } else {
        left ^= cbcleft2;
        right ^= cbcright2;
      }
    }
    result[k++] = left >>> 24;
    result[k++] = left >>> 16 & 255;
    result[k++] = left >>> 8 & 255;
    result[k++] = left & 255;
    result[k++] = right >>> 24;
    result[k++] = right >>> 16 & 255;
    result[k++] = right >>> 8 & 255;
    result[k++] = right & 255;
  }
  if (!encrypt8) {
    result = desRemovePadding(result, padding);
  }
  return result;
}
function desCreateKeys(key) {
  const pc2bytes0 = [
    0,
    4,
    536870912,
    536870916,
    65536,
    65540,
    536936448,
    536936452,
    512,
    516,
    536871424,
    536871428,
    66048,
    66052,
    536936960,
    536936964
  ];
  const pc2bytes1 = [
    0,
    1,
    1048576,
    1048577,
    67108864,
    67108865,
    68157440,
    68157441,
    256,
    257,
    1048832,
    1048833,
    67109120,
    67109121,
    68157696,
    68157697
  ];
  const pc2bytes2 = [
    0,
    8,
    2048,
    2056,
    16777216,
    16777224,
    16779264,
    16779272,
    0,
    8,
    2048,
    2056,
    16777216,
    16777224,
    16779264,
    16779272
  ];
  const pc2bytes3 = [
    0,
    2097152,
    134217728,
    136314880,
    8192,
    2105344,
    134225920,
    136323072,
    131072,
    2228224,
    134348800,
    136445952,
    139264,
    2236416,
    134356992,
    136454144
  ];
  const pc2bytes4 = [
    0,
    262144,
    16,
    262160,
    0,
    262144,
    16,
    262160,
    4096,
    266240,
    4112,
    266256,
    4096,
    266240,
    4112,
    266256
  ];
  const pc2bytes5 = [
    0,
    1024,
    32,
    1056,
    0,
    1024,
    32,
    1056,
    33554432,
    33555456,
    33554464,
    33555488,
    33554432,
    33555456,
    33554464,
    33555488
  ];
  const pc2bytes6 = [
    0,
    268435456,
    524288,
    268959744,
    2,
    268435458,
    524290,
    268959746,
    0,
    268435456,
    524288,
    268959744,
    2,
    268435458,
    524290,
    268959746
  ];
  const pc2bytes7 = [
    0,
    65536,
    2048,
    67584,
    536870912,
    536936448,
    536872960,
    536938496,
    131072,
    196608,
    133120,
    198656,
    537001984,
    537067520,
    537004032,
    537069568
  ];
  const pc2bytes8 = [
    0,
    262144,
    0,
    262144,
    2,
    262146,
    2,
    262146,
    33554432,
    33816576,
    33554432,
    33816576,
    33554434,
    33816578,
    33554434,
    33816578
  ];
  const pc2bytes9 = [
    0,
    268435456,
    8,
    268435464,
    0,
    268435456,
    8,
    268435464,
    1024,
    268436480,
    1032,
    268436488,
    1024,
    268436480,
    1032,
    268436488
  ];
  const pc2bytes10 = [
    0,
    32,
    0,
    32,
    1048576,
    1048608,
    1048576,
    1048608,
    8192,
    8224,
    8192,
    8224,
    1056768,
    1056800,
    1056768,
    1056800
  ];
  const pc2bytes11 = [
    0,
    16777216,
    512,
    16777728,
    2097152,
    18874368,
    2097664,
    18874880,
    67108864,
    83886080,
    67109376,
    83886592,
    69206016,
    85983232,
    69206528,
    85983744
  ];
  const pc2bytes12 = [
    0,
    4096,
    134217728,
    134221824,
    524288,
    528384,
    134742016,
    134746112,
    16,
    4112,
    134217744,
    134221840,
    524304,
    528400,
    134742032,
    134746128
  ];
  const pc2bytes13 = [0, 4, 256, 260, 0, 4, 256, 260, 1, 5, 257, 261, 1, 5, 257, 261];
  const iterations = key.length > 8 ? 3 : 1;
  const keys = new Array(32 * iterations);
  const shifts = [0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0];
  let lefttemp;
  let righttemp;
  let m = 0;
  let n = 0;
  let temp;
  for (let j = 0; j < iterations; j++) {
    let left = key[m++] << 24 | key[m++] << 16 | key[m++] << 8 | key[m++];
    let right = key[m++] << 24 | key[m++] << 16 | key[m++] << 8 | key[m++];
    temp = (left >>> 4 ^ right) & 252645135;
    right ^= temp;
    left ^= temp << 4;
    temp = (right >>> -16 ^ left) & 65535;
    left ^= temp;
    right ^= temp << -16;
    temp = (left >>> 2 ^ right) & 858993459;
    right ^= temp;
    left ^= temp << 2;
    temp = (right >>> -16 ^ left) & 65535;
    left ^= temp;
    right ^= temp << -16;
    temp = (left >>> 1 ^ right) & 1431655765;
    right ^= temp;
    left ^= temp << 1;
    temp = (right >>> 8 ^ left) & 16711935;
    left ^= temp;
    right ^= temp << 8;
    temp = (left >>> 1 ^ right) & 1431655765;
    right ^= temp;
    left ^= temp << 1;
    temp = left << 8 | right >>> 20 & 240;
    left = right << 24 | right << 8 & 16711680 | right >>> 8 & 65280 | right >>> 24 & 240;
    right = temp;
    for (let i = 0; i < shifts.length; i++) {
      if (shifts[i]) {
        left = left << 2 | left >>> 26;
        right = right << 2 | right >>> 26;
      } else {
        left = left << 1 | left >>> 27;
        right = right << 1 | right >>> 27;
      }
      left &= -15;
      right &= -15;
      lefttemp = pc2bytes0[left >>> 28] | pc2bytes1[left >>> 24 & 15] | pc2bytes2[left >>> 20 & 15] | pc2bytes3[left >>> 16 & 15] | pc2bytes4[left >>> 12 & 15] | pc2bytes5[left >>> 8 & 15] | pc2bytes6[left >>> 4 & 15];
      righttemp = pc2bytes7[right >>> 28] | pc2bytes8[right >>> 24 & 15] | pc2bytes9[right >>> 20 & 15] | pc2bytes10[right >>> 16 & 15] | pc2bytes11[right >>> 12 & 15] | pc2bytes12[right >>> 8 & 15] | pc2bytes13[right >>> 4 & 15];
      temp = (righttemp >>> 16 ^ lefttemp) & 65535;
      keys[n++] = lefttemp ^ temp;
      keys[n++] = righttemp ^ temp << 16;
    }
  }
  return keys;
}
function desAddPadding(message, padding) {
  const padLength = 8 - message.length % 8;
  let pad2;
  if (padding === 2 && padLength < 8) {
    pad2 = " ".charCodeAt(0);
  } else if (padding === 1) {
    pad2 = padLength;
  } else if (!padding && padLength < 8) {
    pad2 = 0;
  } else if (padLength === 8) {
    return message;
  } else {
    throw new Error("des: invalid padding");
  }
  const paddedMessage = new Uint8Array(message.length + padLength);
  for (let i = 0; i < message.length; i++) {
    paddedMessage[i] = message[i];
  }
  for (let j = 0; j < padLength; j++) {
    paddedMessage[message.length + j] = pad2;
  }
  return paddedMessage;
}
function desRemovePadding(message, padding) {
  let padLength = null;
  let pad2;
  if (padding === 2) {
    pad2 = " ".charCodeAt(0);
  } else if (padding === 1) {
    padLength = message[message.length - 1];
  } else if (!padding) {
    pad2 = 0;
  } else {
    throw new Error("des: invalid padding");
  }
  if (!padLength) {
    padLength = 1;
    while (message[message.length - padLength] === pad2) {
      padLength++;
    }
    padLength--;
  }
  return message.subarray(0, message.length - padLength);
}
function TripleDES(key) {
  this.key = [];
  for (let i = 0; i < 3; i++) {
    this.key.push(new Uint8Array(key.subarray(i * 8, i * 8 + 8)));
  }
  this.encrypt = function(block) {
    return des(
      desCreateKeys(this.key[2]),
      des(
        desCreateKeys(this.key[1]),
        des(
          desCreateKeys(this.key[0]),
          block,
          true,
          0,
          null,
          null
        ),
        false,
        0,
        null,
        null
      ),
      true,
      0,
      null,
      null
    );
  };
}
var init_des = __esm({
  "vendor/src/openpgpjs/src/crypto/cipher/des.js"() {
    TripleDES.keySize = TripleDES.prototype.keySize = 24;
    TripleDES.blockSize = TripleDES.prototype.blockSize = 8;
  }
});

// vendor/src/openpgpjs/src/crypto/cipher/cast5.js
function OpenPGPSymEncCAST5() {
  this.BlockSize = 8;
  this.KeySize = 16;
  this.setKey = function(key) {
    this.masking = new Array(16);
    this.rotate = new Array(16);
    this.reset();
    if (key.length === this.KeySize) {
      this.keySchedule(key);
    } else {
      throw new Error("CAST-128: keys must be 16 bytes");
    }
    return true;
  };
  this.reset = function() {
    for (let i = 0; i < 16; i++) {
      this.masking[i] = 0;
      this.rotate[i] = 0;
    }
  };
  this.getBlockSize = function() {
    return this.BlockSize;
  };
  this.encrypt = function(src) {
    const dst = new Array(src.length);
    for (let i = 0; i < src.length; i += 8) {
      let l = src[i] << 24 | src[i + 1] << 16 | src[i + 2] << 8 | src[i + 3];
      let r = src[i + 4] << 24 | src[i + 5] << 16 | src[i + 6] << 8 | src[i + 7];
      let t;
      t = r;
      r = l ^ f1(r, this.masking[0], this.rotate[0]);
      l = t;
      t = r;
      r = l ^ f2(r, this.masking[1], this.rotate[1]);
      l = t;
      t = r;
      r = l ^ f3(r, this.masking[2], this.rotate[2]);
      l = t;
      t = r;
      r = l ^ f1(r, this.masking[3], this.rotate[3]);
      l = t;
      t = r;
      r = l ^ f2(r, this.masking[4], this.rotate[4]);
      l = t;
      t = r;
      r = l ^ f3(r, this.masking[5], this.rotate[5]);
      l = t;
      t = r;
      r = l ^ f1(r, this.masking[6], this.rotate[6]);
      l = t;
      t = r;
      r = l ^ f2(r, this.masking[7], this.rotate[7]);
      l = t;
      t = r;
      r = l ^ f3(r, this.masking[8], this.rotate[8]);
      l = t;
      t = r;
      r = l ^ f1(r, this.masking[9], this.rotate[9]);
      l = t;
      t = r;
      r = l ^ f2(r, this.masking[10], this.rotate[10]);
      l = t;
      t = r;
      r = l ^ f3(r, this.masking[11], this.rotate[11]);
      l = t;
      t = r;
      r = l ^ f1(r, this.masking[12], this.rotate[12]);
      l = t;
      t = r;
      r = l ^ f2(r, this.masking[13], this.rotate[13]);
      l = t;
      t = r;
      r = l ^ f3(r, this.masking[14], this.rotate[14]);
      l = t;
      t = r;
      r = l ^ f1(r, this.masking[15], this.rotate[15]);
      l = t;
      dst[i] = r >>> 24 & 255;
      dst[i + 1] = r >>> 16 & 255;
      dst[i + 2] = r >>> 8 & 255;
      dst[i + 3] = r & 255;
      dst[i + 4] = l >>> 24 & 255;
      dst[i + 5] = l >>> 16 & 255;
      dst[i + 6] = l >>> 8 & 255;
      dst[i + 7] = l & 255;
    }
    return dst;
  };
  this.decrypt = function(src) {
    const dst = new Array(src.length);
    for (let i = 0; i < src.length; i += 8) {
      let l = src[i] << 24 | src[i + 1] << 16 | src[i + 2] << 8 | src[i + 3];
      let r = src[i + 4] << 24 | src[i + 5] << 16 | src[i + 6] << 8 | src[i + 7];
      let t;
      t = r;
      r = l ^ f1(r, this.masking[15], this.rotate[15]);
      l = t;
      t = r;
      r = l ^ f3(r, this.masking[14], this.rotate[14]);
      l = t;
      t = r;
      r = l ^ f2(r, this.masking[13], this.rotate[13]);
      l = t;
      t = r;
      r = l ^ f1(r, this.masking[12], this.rotate[12]);
      l = t;
      t = r;
      r = l ^ f3(r, this.masking[11], this.rotate[11]);
      l = t;
      t = r;
      r = l ^ f2(r, this.masking[10], this.rotate[10]);
      l = t;
      t = r;
      r = l ^ f1(r, this.masking[9], this.rotate[9]);
      l = t;
      t = r;
      r = l ^ f3(r, this.masking[8], this.rotate[8]);
      l = t;
      t = r;
      r = l ^ f2(r, this.masking[7], this.rotate[7]);
      l = t;
      t = r;
      r = l ^ f1(r, this.masking[6], this.rotate[6]);
      l = t;
      t = r;
      r = l ^ f3(r, this.masking[5], this.rotate[5]);
      l = t;
      t = r;
      r = l ^ f2(r, this.masking[4], this.rotate[4]);
      l = t;
      t = r;
      r = l ^ f1(r, this.masking[3], this.rotate[3]);
      l = t;
      t = r;
      r = l ^ f3(r, this.masking[2], this.rotate[2]);
      l = t;
      t = r;
      r = l ^ f2(r, this.masking[1], this.rotate[1]);
      l = t;
      t = r;
      r = l ^ f1(r, this.masking[0], this.rotate[0]);
      l = t;
      dst[i] = r >>> 24 & 255;
      dst[i + 1] = r >>> 16 & 255;
      dst[i + 2] = r >>> 8 & 255;
      dst[i + 3] = r & 255;
      dst[i + 4] = l >>> 24 & 255;
      dst[i + 5] = l >> 16 & 255;
      dst[i + 6] = l >> 8 & 255;
      dst[i + 7] = l & 255;
    }
    return dst;
  };
  const scheduleA = new Array(4);
  scheduleA[0] = new Array(4);
  scheduleA[0][0] = [4, 0, 13, 15, 12, 14, 8];
  scheduleA[0][1] = [5, 2, 16 + 0, 16 + 2, 16 + 1, 16 + 3, 10];
  scheduleA[0][2] = [6, 3, 16 + 7, 16 + 6, 16 + 5, 16 + 4, 9];
  scheduleA[0][3] = [7, 1, 16 + 10, 16 + 9, 16 + 11, 16 + 8, 11];
  scheduleA[1] = new Array(4);
  scheduleA[1][0] = [0, 6, 16 + 5, 16 + 7, 16 + 4, 16 + 6, 16 + 0];
  scheduleA[1][1] = [1, 4, 0, 2, 1, 3, 16 + 2];
  scheduleA[1][2] = [2, 5, 7, 6, 5, 4, 16 + 1];
  scheduleA[1][3] = [3, 7, 10, 9, 11, 8, 16 + 3];
  scheduleA[2] = new Array(4);
  scheduleA[2][0] = [4, 0, 13, 15, 12, 14, 8];
  scheduleA[2][1] = [5, 2, 16 + 0, 16 + 2, 16 + 1, 16 + 3, 10];
  scheduleA[2][2] = [6, 3, 16 + 7, 16 + 6, 16 + 5, 16 + 4, 9];
  scheduleA[2][3] = [7, 1, 16 + 10, 16 + 9, 16 + 11, 16 + 8, 11];
  scheduleA[3] = new Array(4);
  scheduleA[3][0] = [0, 6, 16 + 5, 16 + 7, 16 + 4, 16 + 6, 16 + 0];
  scheduleA[3][1] = [1, 4, 0, 2, 1, 3, 16 + 2];
  scheduleA[3][2] = [2, 5, 7, 6, 5, 4, 16 + 1];
  scheduleA[3][3] = [3, 7, 10, 9, 11, 8, 16 + 3];
  const scheduleB = new Array(4);
  scheduleB[0] = new Array(4);
  scheduleB[0][0] = [16 + 8, 16 + 9, 16 + 7, 16 + 6, 16 + 2];
  scheduleB[0][1] = [16 + 10, 16 + 11, 16 + 5, 16 + 4, 16 + 6];
  scheduleB[0][2] = [16 + 12, 16 + 13, 16 + 3, 16 + 2, 16 + 9];
  scheduleB[0][3] = [16 + 14, 16 + 15, 16 + 1, 16 + 0, 16 + 12];
  scheduleB[1] = new Array(4);
  scheduleB[1][0] = [3, 2, 12, 13, 8];
  scheduleB[1][1] = [1, 0, 14, 15, 13];
  scheduleB[1][2] = [7, 6, 8, 9, 3];
  scheduleB[1][3] = [5, 4, 10, 11, 7];
  scheduleB[2] = new Array(4);
  scheduleB[2][0] = [16 + 3, 16 + 2, 16 + 12, 16 + 13, 16 + 9];
  scheduleB[2][1] = [16 + 1, 16 + 0, 16 + 14, 16 + 15, 16 + 12];
  scheduleB[2][2] = [16 + 7, 16 + 6, 16 + 8, 16 + 9, 16 + 2];
  scheduleB[2][3] = [16 + 5, 16 + 4, 16 + 10, 16 + 11, 16 + 6];
  scheduleB[3] = new Array(4);
  scheduleB[3][0] = [8, 9, 7, 6, 3];
  scheduleB[3][1] = [10, 11, 5, 4, 7];
  scheduleB[3][2] = [12, 13, 3, 2, 8];
  scheduleB[3][3] = [14, 15, 1, 0, 13];
  this.keySchedule = function(inn) {
    const t = new Array(8);
    const k = new Array(32);
    let j;
    for (let i = 0; i < 4; i++) {
      j = i * 4;
      t[i] = inn[j] << 24 | inn[j + 1] << 16 | inn[j + 2] << 8 | inn[j + 3];
    }
    const x = [6, 7, 4, 5];
    let ki = 0;
    let w;
    for (let half = 0; half < 2; half++) {
      for (let round = 0; round < 4; round++) {
        for (j = 0; j < 4; j++) {
          const a = scheduleA[round][j];
          w = t[a[1]];
          w ^= sBox[4][t[a[2] >>> 2] >>> 24 - 8 * (a[2] & 3) & 255];
          w ^= sBox[5][t[a[3] >>> 2] >>> 24 - 8 * (a[3] & 3) & 255];
          w ^= sBox[6][t[a[4] >>> 2] >>> 24 - 8 * (a[4] & 3) & 255];
          w ^= sBox[7][t[a[5] >>> 2] >>> 24 - 8 * (a[5] & 3) & 255];
          w ^= sBox[x[j]][t[a[6] >>> 2] >>> 24 - 8 * (a[6] & 3) & 255];
          t[a[0]] = w;
        }
        for (j = 0; j < 4; j++) {
          const b = scheduleB[round][j];
          w = sBox[4][t[b[0] >>> 2] >>> 24 - 8 * (b[0] & 3) & 255];
          w ^= sBox[5][t[b[1] >>> 2] >>> 24 - 8 * (b[1] & 3) & 255];
          w ^= sBox[6][t[b[2] >>> 2] >>> 24 - 8 * (b[2] & 3) & 255];
          w ^= sBox[7][t[b[3] >>> 2] >>> 24 - 8 * (b[3] & 3) & 255];
          w ^= sBox[4 + j][t[b[4] >>> 2] >>> 24 - 8 * (b[4] & 3) & 255];
          k[ki] = w;
          ki++;
        }
      }
    }
    for (let i = 0; i < 16; i++) {
      this.masking[i] = k[i];
      this.rotate[i] = k[16 + i] & 31;
    }
  };
  function f1(d, m, r) {
    const t = m + d;
    const I2 = t << r | t >>> 32 - r;
    return (sBox[0][I2 >>> 24] ^ sBox[1][I2 >>> 16 & 255]) - sBox[2][I2 >>> 8 & 255] + sBox[3][I2 & 255];
  }
  function f2(d, m, r) {
    const t = m ^ d;
    const I2 = t << r | t >>> 32 - r;
    return sBox[0][I2 >>> 24] - sBox[1][I2 >>> 16 & 255] + sBox[2][I2 >>> 8 & 255] ^ sBox[3][I2 & 255];
  }
  function f3(d, m, r) {
    const t = m - d;
    const I2 = t << r | t >>> 32 - r;
    return (sBox[0][I2 >>> 24] + sBox[1][I2 >>> 16 & 255] ^ sBox[2][I2 >>> 8 & 255]) - sBox[3][I2 & 255];
  }
  const sBox = new Array(8);
  sBox[0] = [
    821772500,
    2678128395,
    1810681135,
    1059425402,
    505495343,
    2617265619,
    1610868032,
    3483355465,
    3218386727,
    2294005173,
    3791863952,
    2563806837,
    1852023008,
    365126098,
    3269944861,
    584384398,
    677919599,
    3229601881,
    4280515016,
    2002735330,
    1136869587,
    3744433750,
    2289869850,
    2731719981,
    2714362070,
    879511577,
    1639411079,
    575934255,
    717107937,
    2857637483,
    576097850,
    2731753936,
    1725645e3,
    2810460463,
    5111599,
    767152862,
    2543075244,
    1251459544,
    1383482551,
    3052681127,
    3089939183,
    3612463449,
    1878520045,
    1510570527,
    2189125840,
    2431448366,
    582008916,
    3163445557,
    1265446783,
    1354458274,
    3529918736,
    3202711853,
    3073581712,
    3912963487,
    3029263377,
    1275016285,
    4249207360,
    2905708351,
    3304509486,
    1442611557,
    3585198765,
    2712415662,
    2731849581,
    3248163920,
    2283946226,
    208555832,
    2766454743,
    1331405426,
    1447828783,
    3315356441,
    3108627284,
    2957404670,
    2981538698,
    3339933917,
    1669711173,
    286233437,
    1465092821,
    1782121619,
    3862771680,
    710211251,
    980974943,
    1651941557,
    430374111,
    2051154026,
    704238805,
    4128970897,
    3144820574,
    2857402727,
    948965521,
    3333752299,
    2227686284,
    718756367,
    2269778983,
    2731643755,
    718440111,
    2857816721,
    3616097120,
    1113355533,
    2478022182,
    410092745,
    1811985197,
    1944238868,
    2696854588,
    1415722873,
    1682284203,
    1060277122,
    1998114690,
    1503841958,
    82706478,
    2315155686,
    1068173648,
    845149890,
    2167947013,
    1768146376,
    1993038550,
    3566826697,
    3390574031,
    940016341,
    3355073782,
    2328040721,
    904371731,
    1205506512,
    4094660742,
    2816623006,
    825647681,
    85914773,
    2857843460,
    1249926541,
    1417871568,
    3287612,
    3211054559,
    3126306446,
    1975924523,
    1353700161,
    2814456437,
    2438597621,
    1800716203,
    722146342,
    2873936343,
    1151126914,
    4160483941,
    2877670899,
    458611604,
    2866078500,
    3483680063,
    770352098,
    2652916994,
    3367839148,
    3940505011,
    3585973912,
    3809620402,
    718646636,
    2504206814,
    2914927912,
    3631288169,
    2857486607,
    2860018678,
    575749918,
    2857478043,
    718488780,
    2069512688,
    3548183469,
    453416197,
    1106044049,
    3032691430,
    52586708,
    3378514636,
    3459808877,
    3211506028,
    1785789304,
    218356169,
    3571399134,
    3759170522,
    1194783844,
    1523787992,
    3007827094,
    1975193539,
    2555452411,
    1341901877,
    3045838698,
    3776907964,
    3217423946,
    2802510864,
    2889438986,
    1057244207,
    1636348243,
    3761863214,
    1462225785,
    2632663439,
    481089165,
    718503062,
    24497053,
    3332243209,
    3344655856,
    3655024856,
    3960371065,
    1195698900,
    2971415156,
    3710176158,
    2115785917,
    4027663609,
    3525578417,
    2524296189,
    2745972565,
    3564906415,
    1372086093,
    1452307862,
    2780501478,
    1476592880,
    3389271281,
    18495466,
    2378148571,
    901398090,
    891748256,
    3279637769,
    3157290713,
    2560960102,
    1447622437,
    4284372637,
    216884176,
    2086908623,
    1879786977,
    3588903153,
    2242455666,
    2938092967,
    3559082096,
    2810645491,
    758861177,
    1121993112,
    215018983,
    642190776,
    4169236812,
    1196255959,
    2081185372,
    3508738393,
    941322904,
    4124243163,
    2877523539,
    1848581667,
    2205260958,
    3180453958,
    2589345134,
    3694731276,
    550028657,
    2519456284,
    3789985535,
    2973870856,
    2093648313,
    443148163,
    46942275,
    2734146937,
    1117713533,
    1115362972,
    1523183689,
    3717140224,
    1551984063
  ];
  sBox[1] = [
    522195092,
    4010518363,
    1776537470,
    960447360,
    4267822970,
    4005896314,
    1435016340,
    1929119313,
    2913464185,
    1310552629,
    3579470798,
    3724818106,
    2579771631,
    1594623892,
    417127293,
    2715217907,
    2696228731,
    1508390405,
    3994398868,
    3925858569,
    3695444102,
    4019471449,
    3129199795,
    3770928635,
    3520741761,
    990456497,
    4187484609,
    2783367035,
    21106139,
    3840405339,
    631373633,
    3783325702,
    532942976,
    396095098,
    3548038825,
    4267192484,
    2564721535,
    2011709262,
    2039648873,
    620404603,
    3776170075,
    2898526339,
    3612357925,
    4159332703,
    1645490516,
    223693667,
    1567101217,
    3362177881,
    1029951347,
    3470931136,
    3570957959,
    1550265121,
    119497089,
    972513919,
    907948164,
    3840628539,
    1613718692,
    3594177948,
    465323573,
    2659255085,
    654439692,
    2575596212,
    2699288441,
    3127702412,
    277098644,
    624404830,
    4100943870,
    2717858591,
    546110314,
    2403699828,
    3655377447,
    1321679412,
    4236791657,
    1045293279,
    4010672264,
    895050893,
    2319792268,
    494945126,
    1914543101,
    2777056443,
    3894764339,
    2219737618,
    311263384,
    4275257268,
    3458730721,
    669096869,
    3584475730,
    3835122877,
    3319158237,
    3949359204,
    2005142349,
    2713102337,
    2228954793,
    3769984788,
    569394103,
    3855636576,
    1425027204,
    108000370,
    2736431443,
    3671869269,
    3043122623,
    1750473702,
    2211081108,
    762237499,
    3972989403,
    2798899386,
    3061857628,
    2943854345,
    867476300,
    964413654,
    1591880597,
    1594774276,
    2179821409,
    552026980,
    3026064248,
    3726140315,
    2283577634,
    3110545105,
    2152310760,
    582474363,
    1582640421,
    1383256631,
    2043843868,
    3322775884,
    1217180674,
    463797851,
    2763038571,
    480777679,
    2718707717,
    2289164131,
    3118346187,
    214354409,
    200212307,
    3810608407,
    3025414197,
    2674075964,
    3997296425,
    1847405948,
    1342460550,
    510035443,
    4080271814,
    815934613,
    833030224,
    1620250387,
    1945732119,
    2703661145,
    3966000196,
    1388869545,
    3456054182,
    2687178561,
    2092620194,
    562037615,
    1356438536,
    3409922145,
    3261847397,
    1688467115,
    2150901366,
    631725691,
    3840332284,
    549916902,
    3455104640,
    394546491,
    837744717,
    2114462948,
    751520235,
    2221554606,
    2415360136,
    3999097078,
    2063029875,
    803036379,
    2702586305,
    821456707,
    3019566164,
    360699898,
    4018502092,
    3511869016,
    3677355358,
    2402471449,
    812317050,
    49299192,
    2570164949,
    3259169295,
    2816732080,
    3331213574,
    3101303564,
    2156015656,
    3705598920,
    3546263921,
    143268808,
    3200304480,
    1638124008,
    3165189453,
    3341807610,
    578956953,
    2193977524,
    3638120073,
    2333881532,
    807278310,
    658237817,
    2969561766,
    1641658566,
    11683945,
    3086995007,
    148645947,
    1138423386,
    4158756760,
    1981396783,
    2401016740,
    3699783584,
    380097457,
    2680394679,
    2803068651,
    3334260286,
    441530178,
    4016580796,
    1375954390,
    761952171,
    891809099,
    2183123478,
    157052462,
    3683840763,
    1592404427,
    341349109,
    2438483839,
    1417898363,
    644327628,
    2233032776,
    2353769706,
    2201510100,
    220455161,
    1815641738,
    182899273,
    2995019788,
    3627381533,
    3702638151,
    2890684138,
    1052606899,
    588164016,
    1681439879,
    4038439418,
    2405343923,
    4229449282,
    167996282,
    1336969661,
    1688053129,
    2739224926,
    1543734051,
    1046297529,
    1138201970,
    2121126012,
    115334942,
    1819067631,
    1902159161,
    1941945968,
    2206692869,
    1159982321
  ];
  sBox[2] = [
    2381300288,
    637164959,
    3952098751,
    3893414151,
    1197506559,
    916448331,
    2350892612,
    2932787856,
    3199334847,
    4009478890,
    3905886544,
    1373570990,
    2450425862,
    4037870920,
    3778841987,
    2456817877,
    286293407,
    124026297,
    3001279700,
    1028597854,
    3115296800,
    4208886496,
    2691114635,
    2188540206,
    1430237888,
    1218109995,
    3572471700,
    308166588,
    570424558,
    2187009021,
    2455094765,
    307733056,
    1310360322,
    3135275007,
    1384269543,
    2388071438,
    863238079,
    2359263624,
    2801553128,
    3380786597,
    2831162807,
    1470087780,
    1728663345,
    4072488799,
    1090516929,
    532123132,
    2389430977,
    1132193179,
    2578464191,
    3051079243,
    1670234342,
    1434557849,
    2711078940,
    1241591150,
    3314043432,
    3435360113,
    3091448339,
    1812415473,
    2198440252,
    267246943,
    796911696,
    3619716990,
    38830015,
    1526438404,
    2806502096,
    374413614,
    2943401790,
    1489179520,
    1603809326,
    1920779204,
    168801282,
    260042626,
    2358705581,
    1563175598,
    2397674057,
    1356499128,
    2217211040,
    514611088,
    2037363785,
    2186468373,
    4022173083,
    2792511869,
    2913485016,
    1173701892,
    4200428547,
    3896427269,
    1334932762,
    2455136706,
    602925377,
    2835607854,
    1613172210,
    41346230,
    2499634548,
    2457437618,
    2188827595,
    41386358,
    4172255629,
    1313404830,
    2405527007,
    3801973774,
    2217704835,
    873260488,
    2528884354,
    2478092616,
    4012915883,
    2555359016,
    2006953883,
    2463913485,
    575479328,
    2218240648,
    2099895446,
    660001756,
    2341502190,
    3038761536,
    3888151779,
    3848713377,
    3286851934,
    1022894237,
    1620365795,
    3449594689,
    1551255054,
    15374395,
    3570825345,
    4249311020,
    4151111129,
    3181912732,
    310226346,
    1133119310,
    530038928,
    136043402,
    2476768958,
    3107506709,
    2544909567,
    1036173560,
    2367337196,
    1681395281,
    1758231547,
    3641649032,
    306774401,
    1575354324,
    3716085866,
    1990386196,
    3114533736,
    2455606671,
    1262092282,
    3124342505,
    2768229131,
    4210529083,
    1833535011,
    423410938,
    660763973,
    2187129978,
    1639812e3,
    3508421329,
    3467445492,
    310289298,
    272797111,
    2188552562,
    2456863912,
    310240523,
    677093832,
    1013118031,
    901835429,
    3892695601,
    1116285435,
    3036471170,
    1337354835,
    243122523,
    520626091,
    277223598,
    4244441197,
    4194248841,
    1766575121,
    594173102,
    316590669,
    742362309,
    3536858622,
    4176435350,
    3838792410,
    2501204839,
    1229605004,
    3115755532,
    1552908988,
    2312334149,
    979407927,
    3959474601,
    1148277331,
    176638793,
    3614686272,
    2083809052,
    40992502,
    1340822838,
    2731552767,
    3535757508,
    3560899520,
    1354035053,
    122129617,
    7215240,
    2732932949,
    3118912700,
    2718203926,
    2539075635,
    3609230695,
    3725561661,
    1928887091,
    2882293555,
    1988674909,
    2063640240,
    2491088897,
    1459647954,
    4189817080,
    2302804382,
    1113892351,
    2237858528,
    1927010603,
    4002880361,
    1856122846,
    1594404395,
    2944033133,
    3855189863,
    3474975698,
    1643104450,
    4054590833,
    3431086530,
    1730235576,
    2984608721,
    3084664418,
    2131803598,
    4178205752,
    267404349,
    1617849798,
    1616132681,
    1462223176,
    736725533,
    2327058232,
    551665188,
    2945899023,
    1749386277,
    2575514597,
    1611482493,
    674206544,
    2201269090,
    3642560800,
    728599968,
    1680547377,
    2620414464,
    1388111496,
    453204106,
    4156223445,
    1094905244,
    2754698257,
    2201108165,
    3757000246,
    2704524545,
    3922940700,
    3996465027
  ];
  sBox[3] = [
    2645754912,
    532081118,
    2814278639,
    3530793624,
    1246723035,
    1689095255,
    2236679235,
    4194438865,
    2116582143,
    3859789411,
    157234593,
    2045505824,
    4245003587,
    1687664561,
    4083425123,
    605965023,
    672431967,
    1336064205,
    3376611392,
    214114848,
    4258466608,
    3232053071,
    489488601,
    605322005,
    3998028058,
    264917351,
    1912574028,
    756637694,
    436560991,
    202637054,
    135989450,
    85393697,
    2152923392,
    3896401662,
    2895836408,
    2145855233,
    3535335007,
    115294817,
    3147733898,
    1922296357,
    3464822751,
    4117858305,
    1037454084,
    2725193275,
    2127856640,
    1417604070,
    1148013728,
    1827919605,
    642362335,
    2929772533,
    909348033,
    1346338451,
    3547799649,
    297154785,
    1917849091,
    4161712827,
    2883604526,
    3968694238,
    1469521537,
    3780077382,
    3375584256,
    1763717519,
    136166297,
    4290970789,
    1295325189,
    2134727907,
    2798151366,
    1566297257,
    3672928234,
    2677174161,
    2672173615,
    965822077,
    2780786062,
    289653839,
    1133871874,
    3491843819,
    35685304,
    1068898316,
    418943774,
    672553190,
    642281022,
    2346158704,
    1954014401,
    3037126780,
    4079815205,
    2030668546,
    3840588673,
    672283427,
    1776201016,
    359975446,
    3750173538,
    555499703,
    2769985273,
    1324923,
    69110472,
    152125443,
    3176785106,
    3822147285,
    1340634837,
    798073664,
    1434183902,
    15393959,
    216384236,
    1303690150,
    3881221631,
    3711134124,
    3960975413,
    106373927,
    2578434224,
    1455997841,
    1801814300,
    1578393881,
    1854262133,
    3188178946,
    3258078583,
    2302670060,
    1539295533,
    3505142565,
    3078625975,
    2372746020,
    549938159,
    3278284284,
    2620926080,
    181285381,
    2865321098,
    3970029511,
    68876850,
    488006234,
    1728155692,
    2608167508,
    836007927,
    2435231793,
    919367643,
    3339422534,
    3655756360,
    1457871481,
    40520939,
    1380155135,
    797931188,
    234455205,
    2255801827,
    3990488299,
    397000196,
    739833055,
    3077865373,
    2871719860,
    4022553888,
    772369276,
    390177364,
    3853951029,
    557662966,
    740064294,
    1640166671,
    1699928825,
    3535942136,
    622006121,
    3625353122,
    68743880,
    1742502,
    219489963,
    1664179233,
    1577743084,
    1236991741,
    410585305,
    2366487942,
    823226535,
    1050371084,
    3426619607,
    3586839478,
    212779912,
    4147118561,
    1819446015,
    1911218849,
    530248558,
    3486241071,
    3252585495,
    2886188651,
    3410272728,
    2342195030,
    20547779,
    2982490058,
    3032363469,
    3631753222,
    312714466,
    1870521650,
    1493008054,
    3491686656,
    615382978,
    4103671749,
    2534517445,
    1932181,
    2196105170,
    278426614,
    6369430,
    3274544417,
    2913018367,
    697336853,
    2143000447,
    2946413531,
    701099306,
    1558357093,
    2805003052,
    3500818408,
    2321334417,
    3567135975,
    216290473,
    3591032198,
    23009561,
    1996984579,
    3735042806,
    2024298078,
    3739440863,
    569400510,
    2339758983,
    3016033873,
    3097871343,
    3639523026,
    3844324983,
    3256173865,
    795471839,
    2951117563,
    4101031090,
    4091603803,
    3603732598,
    971261452,
    534414648,
    428311343,
    3389027175,
    2844869880,
    694888862,
    1227866773,
    2456207019,
    3043454569,
    2614353370,
    3749578031,
    3676663836,
    459166190,
    4132644070,
    1794958188,
    51825668,
    2252611902,
    3084671440,
    2036672799,
    3436641603,
    1099053433,
    2469121526,
    3059204941,
    1323291266,
    2061838604,
    1018778475,
    2233344254,
    2553501054,
    334295216,
    3556750194,
    1065731521,
    183467730
  ];
  sBox[4] = [
    2127105028,
    745436345,
    2601412319,
    2788391185,
    3093987327,
    500390133,
    1155374404,
    389092991,
    150729210,
    3891597772,
    3523549952,
    1935325696,
    716645080,
    946045387,
    2901812282,
    1774124410,
    3869435775,
    4039581901,
    3293136918,
    3438657920,
    948246080,
    363898952,
    3867875531,
    1286266623,
    1598556673,
    68334250,
    630723836,
    1104211938,
    1312863373,
    613332731,
    2377784574,
    1101634306,
    441780740,
    3129959883,
    1917973735,
    2510624549,
    3238456535,
    2544211978,
    3308894634,
    1299840618,
    4076074851,
    1756332096,
    3977027158,
    297047435,
    3790297736,
    2265573040,
    3621810518,
    1311375015,
    1667687725,
    47300608,
    3299642885,
    2474112369,
    201668394,
    1468347890,
    576830978,
    3594690761,
    3742605952,
    1958042578,
    1747032512,
    3558991340,
    1408974056,
    3366841779,
    682131401,
    1033214337,
    1545599232,
    4265137049,
    206503691,
    103024618,
    2855227313,
    1337551222,
    2428998917,
    2963842932,
    4015366655,
    3852247746,
    2796956967,
    3865723491,
    3747938335,
    247794022,
    3755824572,
    702416469,
    2434691994,
    397379957,
    851939612,
    2314769512,
    218229120,
    1380406772,
    62274761,
    214451378,
    3170103466,
    2276210409,
    3845813286,
    28563499,
    446592073,
    1693330814,
    3453727194,
    29968656,
    3093872512,
    220656637,
    2470637031,
    77972100,
    1667708854,
    1358280214,
    4064765667,
    2395616961,
    325977563,
    4277240721,
    4220025399,
    3605526484,
    3355147721,
    811859167,
    3069544926,
    3962126810,
    652502677,
    3075892249,
    4132761541,
    3498924215,
    1217549313,
    3250244479,
    3858715919,
    3053989961,
    1538642152,
    2279026266,
    2875879137,
    574252750,
    3324769229,
    2651358713,
    1758150215,
    141295887,
    2719868960,
    3515574750,
    4093007735,
    4194485238,
    1082055363,
    3417560400,
    395511885,
    2966884026,
    179534037,
    3646028556,
    3738688086,
    1092926436,
    2496269142,
    257381841,
    3772900718,
    1636087230,
    1477059743,
    2499234752,
    3811018894,
    2675660129,
    3285975680,
    90732309,
    1684827095,
    1150307763,
    1723134115,
    3237045386,
    1769919919,
    1240018934,
    815675215,
    750138730,
    2239792499,
    1234303040,
    1995484674,
    138143821,
    675421338,
    1145607174,
    1936608440,
    3238603024,
    2345230278,
    2105974004,
    323969391,
    779555213,
    3004902369,
    2861610098,
    1017501463,
    2098600890,
    2628620304,
    2940611490,
    2682542546,
    1171473753,
    3656571411,
    3687208071,
    4091869518,
    393037935,
    159126506,
    1662887367,
    1147106178,
    391545844,
    3452332695,
    1891500680,
    3016609650,
    1851642611,
    546529401,
    1167818917,
    3194020571,
    2848076033,
    3953471836,
    575554290,
    475796850,
    4134673196,
    450035699,
    2351251534,
    844027695,
    1080539133,
    86184846,
    1554234488,
    3692025454,
    1972511363,
    2018339607,
    1491841390,
    1141460869,
    1061690759,
    4244549243,
    2008416118,
    2351104703,
    2868147542,
    1598468138,
    722020353,
    1027143159,
    212344630,
    1387219594,
    1725294528,
    3745187956,
    2500153616,
    458938280,
    4129215917,
    1828119673,
    544571780,
    3503225445,
    2297937496,
    1241802790,
    267843827,
    2694610800,
    1397140384,
    1558801448,
    3782667683,
    1806446719,
    929573330,
    2234912681,
    400817706,
    616011623,
    4121520928,
    3603768725,
    1761550015,
    1968522284,
    4053731006,
    4192232858,
    4005120285,
    872482584,
    3140537016,
    3894607381,
    2287405443,
    1963876937,
    3663887957,
    1584857e3,
    2975024454,
    1833426440,
    4025083860
  ];
  sBox[5] = [
    4143615901,
    749497569,
    1285769319,
    3795025788,
    2514159847,
    23610292,
    3974978748,
    844452780,
    3214870880,
    3751928557,
    2213566365,
    1676510905,
    448177848,
    3730751033,
    4086298418,
    2307502392,
    871450977,
    3222878141,
    4110862042,
    3831651966,
    2735270553,
    1310974780,
    2043402188,
    1218528103,
    2736035353,
    4274605013,
    2702448458,
    3936360550,
    2693061421,
    162023535,
    2827510090,
    687910808,
    23484817,
    3784910947,
    3371371616,
    779677500,
    3503626546,
    3473927188,
    4157212626,
    3500679282,
    4248902014,
    2466621104,
    3899384794,
    1958663117,
    925738300,
    1283408968,
    3669349440,
    1840910019,
    137959847,
    2679828185,
    1239142320,
    1315376211,
    1547541505,
    1690155329,
    739140458,
    3128809933,
    3933172616,
    3876308834,
    905091803,
    1548541325,
    4040461708,
    3095483362,
    144808038,
    451078856,
    676114313,
    2861728291,
    2469707347,
    993665471,
    373509091,
    2599041286,
    4025009006,
    4170239449,
    2149739950,
    3275793571,
    3749616649,
    2794760199,
    1534877388,
    572371878,
    2590613551,
    1753320020,
    3467782511,
    1405125690,
    4270405205,
    633333386,
    3026356924,
    3475123903,
    632057672,
    2846462855,
    1404951397,
    3882875879,
    3915906424,
    195638627,
    2385783745,
    3902872553,
    1233155085,
    3355999740,
    2380578713,
    2702246304,
    2144565621,
    3663341248,
    3894384975,
    2502479241,
    4248018925,
    3094885567,
    1594115437,
    572884632,
    3385116731,
    767645374,
    1331858858,
    1475698373,
    3793881790,
    3532746431,
    1321687957,
    619889600,
    1121017241,
    3440213920,
    2070816767,
    2833025776,
    1933951238,
    4095615791,
    890643334,
    3874130214,
    859025556,
    360630002,
    925594799,
    1764062180,
    3920222280,
    4078305929,
    979562269,
    2810700344,
    4087740022,
    1949714515,
    546639971,
    1165388173,
    3069891591,
    1495988560,
    922170659,
    1291546247,
    2107952832,
    1813327274,
    3406010024,
    3306028637,
    4241950635,
    153207855,
    2313154747,
    1608695416,
    1150242611,
    1967526857,
    721801357,
    1220138373,
    3691287617,
    3356069787,
    2112743302,
    3281662835,
    1111556101,
    1778980689,
    250857638,
    2298507990,
    673216130,
    2846488510,
    3207751581,
    3562756981,
    3008625920,
    3417367384,
    2198807050,
    529510932,
    3547516680,
    3426503187,
    2364944742,
    102533054,
    2294910856,
    1617093527,
    1204784762,
    3066581635,
    1019391227,
    1069574518,
    1317995090,
    1691889997,
    3661132003,
    510022745,
    3238594800,
    1362108837,
    1817929911,
    2184153760,
    805817662,
    1953603311,
    3699844737,
    120799444,
    2118332377,
    207536705,
    2282301548,
    4120041617,
    145305846,
    2508124933,
    3086745533,
    3261524335,
    1877257368,
    2977164480,
    3160454186,
    2503252186,
    4221677074,
    759945014,
    254147243,
    2767453419,
    3801518371,
    629083197,
    2471014217,
    907280572,
    3900796746,
    940896768,
    2751021123,
    2625262786,
    3161476951,
    3661752313,
    3260732218,
    1425318020,
    2977912069,
    1496677566,
    3988592072,
    2140652971,
    3126511541,
    3069632175,
    977771578,
    1392695845,
    1698528874,
    1411812681,
    1369733098,
    1343739227,
    3620887944,
    1142123638,
    67414216,
    3102056737,
    3088749194,
    1626167401,
    2546293654,
    3941374235,
    697522451,
    33404913,
    143560186,
    2595682037,
    994885535,
    1247667115,
    3859094837,
    2699155541,
    3547024625,
    4114935275,
    2968073508,
    3199963069,
    2732024527,
    1237921620,
    951448369,
    1898488916,
    1211705605,
    2790989240,
    2233243581,
    3598044975
  ];
  sBox[6] = [
    2246066201,
    858518887,
    1714274303,
    3485882003,
    713916271,
    2879113490,
    3730835617,
    539548191,
    36158695,
    1298409750,
    419087104,
    1358007170,
    749914897,
    2989680476,
    1261868530,
    2995193822,
    2690628854,
    3443622377,
    3780124940,
    3796824509,
    2976433025,
    4259637129,
    1551479e3,
    512490819,
    1296650241,
    951993153,
    2436689437,
    2460458047,
    144139966,
    3136204276,
    310820559,
    3068840729,
    643875328,
    1969602020,
    1680088954,
    2185813161,
    3283332454,
    672358534,
    198762408,
    896343282,
    276269502,
    3014846926,
    84060815,
    197145886,
    376173866,
    3943890818,
    3813173521,
    3545068822,
    1316698879,
    1598252827,
    2633424951,
    1233235075,
    859989710,
    2358460855,
    3503838400,
    3409603720,
    1203513385,
    1193654839,
    2792018475,
    2060853022,
    207403770,
    1144516871,
    3068631394,
    1121114134,
    177607304,
    3785736302,
    326409831,
    1929119770,
    2983279095,
    4183308101,
    3474579288,
    3200513878,
    3228482096,
    119610148,
    1170376745,
    3378393471,
    3163473169,
    951863017,
    3337026068,
    3135789130,
    2907618374,
    1183797387,
    2015970143,
    4045674555,
    2182986399,
    2952138740,
    3928772205,
    384012900,
    2454997643,
    10178499,
    2879818989,
    2596892536,
    111523738,
    2995089006,
    451689641,
    3196290696,
    235406569,
    1441906262,
    3890558523,
    3013735005,
    4158569349,
    1644036924,
    376726067,
    1006849064,
    3664579700,
    2041234796,
    1021632941,
    1374734338,
    2566452058,
    371631263,
    4007144233,
    490221539,
    206551450,
    3140638584,
    1053219195,
    1853335209,
    3412429660,
    3562156231,
    735133835,
    1623211703,
    3104214392,
    2738312436,
    4096837757,
    3366392578,
    3110964274,
    3956598718,
    3196820781,
    2038037254,
    3877786376,
    2339753847,
    300912036,
    3766732888,
    2372630639,
    1516443558,
    4200396704,
    1574567987,
    4069441456,
    4122592016,
    2699739776,
    146372218,
    2748961456,
    2043888151,
    35287437,
    2596680554,
    655490400,
    1132482787,
    110692520,
    1031794116,
    2188192751,
    1324057718,
    1217253157,
    919197030,
    686247489,
    3261139658,
    1028237775,
    3135486431,
    3059715558,
    2460921700,
    986174950,
    2661811465,
    4062904701,
    2752986992,
    3709736643,
    367056889,
    1353824391,
    731860949,
    1650113154,
    1778481506,
    784341916,
    357075625,
    3608602432,
    1074092588,
    2480052770,
    3811426202,
    92751289,
    877911070,
    3600361838,
    1231880047,
    480201094,
    3756190983,
    3094495953,
    434011822,
    87971354,
    363687820,
    1717726236,
    1901380172,
    3926403882,
    2481662265,
    400339184,
    1490350766,
    2661455099,
    1389319756,
    2558787174,
    784598401,
    1983468483,
    30828846,
    3550527752,
    2716276238,
    3841122214,
    1765724805,
    1955612312,
    1277890269,
    1333098070,
    1564029816,
    2704417615,
    1026694237,
    3287671188,
    1260819201,
    3349086767,
    1016692350,
    1582273796,
    1073413053,
    1995943182,
    694588404,
    1025494639,
    3323872702,
    3551898420,
    4146854327,
    453260480,
    1316140391,
    1435673405,
    3038941953,
    3486689407,
    1622062951,
    403978347,
    817677117,
    950059133,
    4246079218,
    3278066075,
    1486738320,
    1417279718,
    481875527,
    2549965225,
    3933690356,
    760697757,
    1452955855,
    3897451437,
    1177426808,
    1702951038,
    4085348628,
    2447005172,
    1084371187,
    3516436277,
    3068336338,
    1073369276,
    1027665953,
    3284188590,
    1230553676,
    1368340146,
    2226246512,
    267243139,
    2274220762,
    4070734279,
    2497715176,
    2423353163,
    2504755875
  ];
  sBox[7] = [
    3793104909,
    3151888380,
    2817252029,
    895778965,
    2005530807,
    3871412763,
    237245952,
    86829237,
    296341424,
    3851759377,
    3974600970,
    2475086196,
    709006108,
    1994621201,
    2972577594,
    937287164,
    3734691505,
    168608556,
    3189338153,
    2225080640,
    3139713551,
    3033610191,
    3025041904,
    77524477,
    185966941,
    1208824168,
    2344345178,
    1721625922,
    3354191921,
    1066374631,
    1927223579,
    1971335949,
    2483503697,
    1551748602,
    2881383779,
    2856329572,
    3003241482,
    48746954,
    1398218158,
    2050065058,
    313056748,
    4255789917,
    393167848,
    1912293076,
    940740642,
    3465845460,
    3091687853,
    2522601570,
    2197016661,
    1727764327,
    364383054,
    492521376,
    1291706479,
    3264136376,
    1474851438,
    1685747964,
    2575719748,
    1619776915,
    1814040067,
    970743798,
    1561002147,
    2925768690,
    2123093554,
    1880132620,
    3151188041,
    697884420,
    2550985770,
    2607674513,
    2659114323,
    110200136,
    1489731079,
    997519150,
    1378877361,
    3527870668,
    478029773,
    2766872923,
    1022481122,
    431258168,
    1112503832,
    897933369,
    2635587303,
    669726182,
    3383752315,
    918222264,
    163866573,
    3246985393,
    3776823163,
    114105080,
    1903216136,
    761148244,
    3571337562,
    1690750982,
    3166750252,
    1037045171,
    1888456500,
    2010454850,
    642736655,
    616092351,
    365016990,
    1185228132,
    4174898510,
    1043824992,
    2023083429,
    2241598885,
    3863320456,
    3279669087,
    3674716684,
    108438443,
    2132974366,
    830746235,
    606445527,
    4173263986,
    2204105912,
    1844756978,
    2532684181,
    4245352700,
    2969441100,
    3796921661,
    1335562986,
    4061524517,
    2720232303,
    2679424040,
    634407289,
    885462008,
    3294724487,
    3933892248,
    2094100220,
    339117932,
    4048830727,
    3202280980,
    1458155303,
    2689246273,
    1022871705,
    2464987878,
    3714515309,
    353796843,
    2822958815,
    4256850100,
    4052777845,
    551748367,
    618185374,
    3778635579,
    4020649912,
    1904685140,
    3069366075,
    2670879810,
    3407193292,
    2954511620,
    4058283405,
    2219449317,
    3135758300,
    1120655984,
    3447565834,
    1474845562,
    3577699062,
    550456716,
    3466908712,
    2043752612,
    881257467,
    869518812,
    2005220179,
    938474677,
    3305539448,
    3850417126,
    1315485940,
    3318264702,
    226533026,
    965733244,
    321539988,
    1136104718,
    804158748,
    573969341,
    3708209826,
    937399083,
    3290727049,
    2901666755,
    1461057207,
    4013193437,
    4066861423,
    3242773476,
    2421326174,
    1581322155,
    3028952165,
    786071460,
    3900391652,
    3918438532,
    1485433313,
    4023619836,
    3708277595,
    3678951060,
    953673138,
    1467089153,
    1930354364,
    1533292819,
    2492563023,
    1346121658,
    1685000834,
    1965281866,
    3765933717,
    4190206607,
    2052792609,
    3515332758,
    690371149,
    3125873887,
    2180283551,
    2903598061,
    3933952357,
    436236910,
    289419410,
    14314871,
    1242357089,
    2904507907,
    1616633776,
    2666382180,
    585885352,
    3471299210,
    2699507360,
    1432659641,
    277164553,
    3354103607,
    770115018,
    2303809295,
    3741942315,
    3177781868,
    2853364978,
    2269453327,
    3774259834,
    987383833,
    1290892879,
    225909803,
    1741533526,
    890078084,
    1496906255,
    1111072499,
    916028167,
    243534141,
    1252605537,
    2204162171,
    531204876,
    290011180,
    3916834213,
    102027703,
    237315147,
    209093447,
    1486785922,
    220223953,
    2758195998,
    4175039106,
    82940208,
    3127791296,
    2569425252,
    518464269,
    1353887104,
    3941492737,
    2377294467,
    3935040926
  ];
}
function CAST5(key) {
  this.cast5 = new OpenPGPSymEncCAST5();
  this.cast5.setKey(key);
  this.encrypt = function(block) {
    return this.cast5.encrypt(block);
  };
}
var cast5_default;
var init_cast5 = __esm({
  "vendor/src/openpgpjs/src/crypto/cipher/cast5.js"() {
    CAST5.blockSize = CAST5.prototype.blockSize = 8;
    CAST5.keySize = CAST5.prototype.keySize = 16;
    cast5_default = CAST5;
  }
});

// vendor/src/openpgpjs/src/crypto/cipher/twofish.js
function rotw(w, n) {
  return (w << n | w >>> 32 - n) & MAXINT;
}
function getW2(a, i) {
  return a[i] | a[i + 1] << 8 | a[i + 2] << 16 | a[i + 3] << 24;
}
function setW(a, i, w) {
  a.splice(i, 4, w & 255, w >>> 8 & 255, w >>> 16 & 255, w >>> 24 & 255);
}
function getB(x, n) {
  return x >>> n * 8 & 255;
}
function createTwofish() {
  let keyBytes = null;
  let dataBytes = null;
  let dataOffset = -1;
  let tfsKey = [];
  let tfsM = [
    [],
    [],
    [],
    []
  ];
  function tfsInit(key) {
    keyBytes = key;
    let i;
    let a;
    let b;
    let c;
    let d;
    const meKey = [];
    const moKey = [];
    const inKey = [];
    let kLen;
    const sKey = [];
    let f01;
    let f5b;
    let fef;
    const q0 = [
      [8, 1, 7, 13, 6, 15, 3, 2, 0, 11, 5, 9, 14, 12, 10, 4],
      [2, 8, 11, 13, 15, 7, 6, 14, 3, 1, 9, 4, 0, 10, 12, 5]
    ];
    const q1 = [
      [14, 12, 11, 8, 1, 2, 3, 5, 15, 4, 10, 6, 7, 0, 9, 13],
      [1, 14, 2, 11, 4, 12, 3, 7, 6, 13, 10, 5, 15, 9, 0, 8]
    ];
    const q2 = [
      [11, 10, 5, 14, 6, 13, 9, 0, 12, 8, 15, 3, 2, 4, 7, 1],
      [4, 12, 7, 5, 1, 6, 9, 10, 0, 14, 13, 8, 2, 11, 3, 15]
    ];
    const q3 = [
      [13, 7, 15, 4, 1, 2, 6, 14, 9, 11, 3, 0, 8, 5, 12, 10],
      [11, 9, 5, 1, 12, 3, 13, 14, 6, 4, 7, 15, 2, 0, 8, 10]
    ];
    const ror4 = [0, 8, 1, 9, 2, 10, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
    const ashx = [0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 5, 14, 7];
    const q = [
      [],
      []
    ];
    const m = [
      [],
      [],
      [],
      []
    ];
    function ffm5b(x) {
      return x ^ x >> 2 ^ [0, 90, 180, 238][x & 3];
    }
    function ffmEf(x) {
      return x ^ x >> 1 ^ x >> 2 ^ [0, 238, 180, 90][x & 3];
    }
    function mdsRem(p, q4) {
      let i2;
      let t;
      let u;
      for (i2 = 0; i2 < 8; i2++) {
        t = q4 >>> 24;
        q4 = q4 << 8 & MAXINT | p >>> 24;
        p = p << 8 & MAXINT;
        u = t << 1;
        if (t & 128) {
          u ^= 333;
        }
        q4 ^= t ^ u << 16;
        u ^= t >>> 1;
        if (t & 1) {
          u ^= 166;
        }
        q4 ^= u << 24 | u << 8;
      }
      return q4;
    }
    function qp(n, x) {
      const a2 = x >> 4;
      const b2 = x & 15;
      const c2 = q0[n][a2 ^ b2];
      const d2 = q1[n][ror4[b2] ^ ashx[a2]];
      return q3[n][ror4[d2] ^ ashx[c2]] << 4 | q2[n][c2 ^ d2];
    }
    function hFun(x, key2) {
      let a2 = getB(x, 0);
      let b2 = getB(x, 1);
      let c2 = getB(x, 2);
      let d2 = getB(x, 3);
      switch (kLen) {
        case 4:
          a2 = q[1][a2] ^ getB(key2[3], 0);
          b2 = q[0][b2] ^ getB(key2[3], 1);
          c2 = q[0][c2] ^ getB(key2[3], 2);
          d2 = q[1][d2] ^ getB(key2[3], 3);
        // eslint-disable-next-line no-fallthrough
        case 3:
          a2 = q[1][a2] ^ getB(key2[2], 0);
          b2 = q[1][b2] ^ getB(key2[2], 1);
          c2 = q[0][c2] ^ getB(key2[2], 2);
          d2 = q[0][d2] ^ getB(key2[2], 3);
        // eslint-disable-next-line no-fallthrough
        case 2:
          a2 = q[0][q[0][a2] ^ getB(key2[1], 0)] ^ getB(key2[0], 0);
          b2 = q[0][q[1][b2] ^ getB(key2[1], 1)] ^ getB(key2[0], 1);
          c2 = q[1][q[0][c2] ^ getB(key2[1], 2)] ^ getB(key2[0], 2);
          d2 = q[1][q[1][d2] ^ getB(key2[1], 3)] ^ getB(key2[0], 3);
      }
      return m[0][a2] ^ m[1][b2] ^ m[2][c2] ^ m[3][d2];
    }
    keyBytes = keyBytes.slice(0, 32);
    i = keyBytes.length;
    while (i !== 16 && i !== 24 && i !== 32) {
      keyBytes[i++] = 0;
    }
    for (i = 0; i < keyBytes.length; i += 4) {
      inKey[i >> 2] = getW2(keyBytes, i);
    }
    for (i = 0; i < 256; i++) {
      q[0][i] = qp(0, i);
      q[1][i] = qp(1, i);
    }
    for (i = 0; i < 256; i++) {
      f01 = q[1][i];
      f5b = ffm5b(f01);
      fef = ffmEf(f01);
      m[0][i] = f01 + (f5b << 8) + (fef << 16) + (fef << 24);
      m[2][i] = f5b + (fef << 8) + (f01 << 16) + (fef << 24);
      f01 = q[0][i];
      f5b = ffm5b(f01);
      fef = ffmEf(f01);
      m[1][i] = fef + (fef << 8) + (f5b << 16) + (f01 << 24);
      m[3][i] = f5b + (f01 << 8) + (fef << 16) + (f5b << 24);
    }
    kLen = inKey.length / 2;
    for (i = 0; i < kLen; i++) {
      a = inKey[i + i];
      meKey[i] = a;
      b = inKey[i + i + 1];
      moKey[i] = b;
      sKey[kLen - i - 1] = mdsRem(a, b);
    }
    for (i = 0; i < 40; i += 2) {
      a = 16843009 * i;
      b = a + 16843009;
      a = hFun(a, meKey);
      b = rotw(hFun(b, moKey), 8);
      tfsKey[i] = a + b & MAXINT;
      tfsKey[i + 1] = rotw(a + 2 * b, 9);
    }
    for (i = 0; i < 256; i++) {
      a = b = c = d = i;
      switch (kLen) {
        case 4:
          a = q[1][a] ^ getB(sKey[3], 0);
          b = q[0][b] ^ getB(sKey[3], 1);
          c = q[0][c] ^ getB(sKey[3], 2);
          d = q[1][d] ^ getB(sKey[3], 3);
        // eslint-disable-next-line no-fallthrough
        case 3:
          a = q[1][a] ^ getB(sKey[2], 0);
          b = q[1][b] ^ getB(sKey[2], 1);
          c = q[0][c] ^ getB(sKey[2], 2);
          d = q[0][d] ^ getB(sKey[2], 3);
        // eslint-disable-next-line no-fallthrough
        case 2:
          tfsM[0][i] = m[0][q[0][q[0][a] ^ getB(sKey[1], 0)] ^ getB(sKey[0], 0)];
          tfsM[1][i] = m[1][q[0][q[1][b] ^ getB(sKey[1], 1)] ^ getB(sKey[0], 1)];
          tfsM[2][i] = m[2][q[1][q[0][c] ^ getB(sKey[1], 2)] ^ getB(sKey[0], 2)];
          tfsM[3][i] = m[3][q[1][q[1][d] ^ getB(sKey[1], 3)] ^ getB(sKey[0], 3)];
      }
    }
  }
  function tfsG0(x) {
    return tfsM[0][getB(x, 0)] ^ tfsM[1][getB(x, 1)] ^ tfsM[2][getB(x, 2)] ^ tfsM[3][getB(x, 3)];
  }
  function tfsG1(x) {
    return tfsM[0][getB(x, 3)] ^ tfsM[1][getB(x, 0)] ^ tfsM[2][getB(x, 1)] ^ tfsM[3][getB(x, 2)];
  }
  function tfsFrnd(r, blk) {
    let a = tfsG0(blk[0]);
    let b = tfsG1(blk[1]);
    blk[2] = rotw(blk[2] ^ a + b + tfsKey[4 * r + 8] & MAXINT, 31);
    blk[3] = rotw(blk[3], 1) ^ a + 2 * b + tfsKey[4 * r + 9] & MAXINT;
    a = tfsG0(blk[2]);
    b = tfsG1(blk[3]);
    blk[0] = rotw(blk[0] ^ a + b + tfsKey[4 * r + 10] & MAXINT, 31);
    blk[1] = rotw(blk[1], 1) ^ a + 2 * b + tfsKey[4 * r + 11] & MAXINT;
  }
  function tfsIrnd(i, blk) {
    let a = tfsG0(blk[0]);
    let b = tfsG1(blk[1]);
    blk[2] = rotw(blk[2], 1) ^ a + b + tfsKey[4 * i + 10] & MAXINT;
    blk[3] = rotw(blk[3] ^ a + 2 * b + tfsKey[4 * i + 11] & MAXINT, 31);
    a = tfsG0(blk[2]);
    b = tfsG1(blk[3]);
    blk[0] = rotw(blk[0], 1) ^ a + b + tfsKey[4 * i + 8] & MAXINT;
    blk[1] = rotw(blk[1] ^ a + 2 * b + tfsKey[4 * i + 9] & MAXINT, 31);
  }
  function tfsClose() {
    tfsKey = [];
    tfsM = [
      [],
      [],
      [],
      []
    ];
  }
  function tfsEncrypt(data, offset) {
    dataBytes = data;
    dataOffset = offset;
    const blk = [
      getW2(dataBytes, dataOffset) ^ tfsKey[0],
      getW2(dataBytes, dataOffset + 4) ^ tfsKey[1],
      getW2(dataBytes, dataOffset + 8) ^ tfsKey[2],
      getW2(dataBytes, dataOffset + 12) ^ tfsKey[3]
    ];
    for (let j = 0; j < 8; j++) {
      tfsFrnd(j, blk);
    }
    setW(dataBytes, dataOffset, blk[2] ^ tfsKey[4]);
    setW(dataBytes, dataOffset + 4, blk[3] ^ tfsKey[5]);
    setW(dataBytes, dataOffset + 8, blk[0] ^ tfsKey[6]);
    setW(dataBytes, dataOffset + 12, blk[1] ^ tfsKey[7]);
    dataOffset += 16;
    return dataBytes;
  }
  function tfsDecrypt(data, offset) {
    dataBytes = data;
    dataOffset = offset;
    const blk = [
      getW2(dataBytes, dataOffset) ^ tfsKey[4],
      getW2(dataBytes, dataOffset + 4) ^ tfsKey[5],
      getW2(dataBytes, dataOffset + 8) ^ tfsKey[6],
      getW2(dataBytes, dataOffset + 12) ^ tfsKey[7]
    ];
    for (let j = 7; j >= 0; j--) {
      tfsIrnd(j, blk);
    }
    setW(dataBytes, dataOffset, blk[2] ^ tfsKey[0]);
    setW(dataBytes, dataOffset + 4, blk[3] ^ tfsKey[1]);
    setW(dataBytes, dataOffset + 8, blk[0] ^ tfsKey[2]);
    setW(dataBytes, dataOffset + 12, blk[1] ^ tfsKey[3]);
    dataOffset += 16;
  }
  function tfsFinal() {
    return dataBytes;
  }
  return {
    name: "twofish",
    blocksize: 128 / 8,
    open: tfsInit,
    close: tfsClose,
    encrypt: tfsEncrypt,
    decrypt: tfsDecrypt,
    // added by Recurity Labs
    finalize: tfsFinal
  };
}
function TF(key) {
  this.tf = createTwofish();
  this.tf.open(Array.from(key), 0);
  this.encrypt = function(block) {
    return this.tf.encrypt(Array.from(block), 0);
  };
}
var MAXINT, twofish_default;
var init_twofish = __esm({
  "vendor/src/openpgpjs/src/crypto/cipher/twofish.js"() {
    MAXINT = 4294967295;
    TF.keySize = TF.prototype.keySize = 32;
    TF.blockSize = TF.prototype.blockSize = 16;
    twofish_default = TF;
  }
});

// vendor/src/openpgpjs/src/crypto/cipher/blowfish.js
function Blowfish() {
}
function BF(key) {
  this.bf = new Blowfish();
  this.bf.init(key);
  this.encrypt = function(block) {
    return this.bf.encryptBlock(block);
  };
}
var blowfish_default;
var init_blowfish = __esm({
  "vendor/src/openpgpjs/src/crypto/cipher/blowfish.js"() {
    Blowfish.prototype.BLOCKSIZE = 8;
    Blowfish.prototype.SBOXES = [
      [
        3509652390,
        2564797868,
        805139163,
        3491422135,
        3101798381,
        1780907670,
        3128725573,
        4046225305,
        614570311,
        3012652279,
        134345442,
        2240740374,
        1667834072,
        1901547113,
        2757295779,
        4103290238,
        227898511,
        1921955416,
        1904987480,
        2182433518,
        2069144605,
        3260701109,
        2620446009,
        720527379,
        3318853667,
        677414384,
        3393288472,
        3101374703,
        2390351024,
        1614419982,
        1822297739,
        2954791486,
        3608508353,
        3174124327,
        2024746970,
        1432378464,
        3864339955,
        2857741204,
        1464375394,
        1676153920,
        1439316330,
        715854006,
        3033291828,
        289532110,
        2706671279,
        2087905683,
        3018724369,
        1668267050,
        732546397,
        1947742710,
        3462151702,
        2609353502,
        2950085171,
        1814351708,
        2050118529,
        680887927,
        999245976,
        1800124847,
        3300911131,
        1713906067,
        1641548236,
        4213287313,
        1216130144,
        1575780402,
        4018429277,
        3917837745,
        3693486850,
        3949271944,
        596196993,
        3549867205,
        258830323,
        2213823033,
        772490370,
        2760122372,
        1774776394,
        2652871518,
        566650946,
        4142492826,
        1728879713,
        2882767088,
        1783734482,
        3629395816,
        2517608232,
        2874225571,
        1861159788,
        326777828,
        3124490320,
        2130389656,
        2716951837,
        967770486,
        1724537150,
        2185432712,
        2364442137,
        1164943284,
        2105845187,
        998989502,
        3765401048,
        2244026483,
        1075463327,
        1455516326,
        1322494562,
        910128902,
        469688178,
        1117454909,
        936433444,
        3490320968,
        3675253459,
        1240580251,
        122909385,
        2157517691,
        634681816,
        4142456567,
        3825094682,
        3061402683,
        2540495037,
        79693498,
        3249098678,
        1084186820,
        1583128258,
        426386531,
        1761308591,
        1047286709,
        322548459,
        995290223,
        1845252383,
        2603652396,
        3431023940,
        2942221577,
        3202600964,
        3727903485,
        1712269319,
        422464435,
        3234572375,
        1170764815,
        3523960633,
        3117677531,
        1434042557,
        442511882,
        3600875718,
        1076654713,
        1738483198,
        4213154764,
        2393238008,
        3677496056,
        1014306527,
        4251020053,
        793779912,
        2902807211,
        842905082,
        4246964064,
        1395751752,
        1040244610,
        2656851899,
        3396308128,
        445077038,
        3742853595,
        3577915638,
        679411651,
        2892444358,
        2354009459,
        1767581616,
        3150600392,
        3791627101,
        3102740896,
        284835224,
        4246832056,
        1258075500,
        768725851,
        2589189241,
        3069724005,
        3532540348,
        1274779536,
        3789419226,
        2764799539,
        1660621633,
        3471099624,
        4011903706,
        913787905,
        3497959166,
        737222580,
        2514213453,
        2928710040,
        3937242737,
        1804850592,
        3499020752,
        2949064160,
        2386320175,
        2390070455,
        2415321851,
        4061277028,
        2290661394,
        2416832540,
        1336762016,
        1754252060,
        3520065937,
        3014181293,
        791618072,
        3188594551,
        3933548030,
        2332172193,
        3852520463,
        3043980520,
        413987798,
        3465142937,
        3030929376,
        4245938359,
        2093235073,
        3534596313,
        375366246,
        2157278981,
        2479649556,
        555357303,
        3870105701,
        2008414854,
        3344188149,
        4221384143,
        3956125452,
        2067696032,
        3594591187,
        2921233993,
        2428461,
        544322398,
        577241275,
        1471733935,
        610547355,
        4027169054,
        1432588573,
        1507829418,
        2025931657,
        3646575487,
        545086370,
        48609733,
        2200306550,
        1653985193,
        298326376,
        1316178497,
        3007786442,
        2064951626,
        458293330,
        2589141269,
        3591329599,
        3164325604,
        727753846,
        2179363840,
        146436021,
        1461446943,
        4069977195,
        705550613,
        3059967265,
        3887724982,
        4281599278,
        3313849956,
        1404054877,
        2845806497,
        146425753,
        1854211946
      ],
      [
        1266315497,
        3048417604,
        3681880366,
        3289982499,
        290971e4,
        1235738493,
        2632868024,
        2414719590,
        3970600049,
        1771706367,
        1449415276,
        3266420449,
        422970021,
        1963543593,
        2690192192,
        3826793022,
        1062508698,
        1531092325,
        1804592342,
        2583117782,
        2714934279,
        4024971509,
        1294809318,
        4028980673,
        1289560198,
        2221992742,
        1669523910,
        35572830,
        157838143,
        1052438473,
        1016535060,
        1802137761,
        1753167236,
        1386275462,
        3080475397,
        2857371447,
        1040679964,
        2145300060,
        2390574316,
        1461121720,
        2956646967,
        4031777805,
        4028374788,
        33600511,
        2920084762,
        1018524850,
        629373528,
        3691585981,
        3515945977,
        2091462646,
        2486323059,
        586499841,
        988145025,
        935516892,
        3367335476,
        2599673255,
        2839830854,
        265290510,
        3972581182,
        2759138881,
        3795373465,
        1005194799,
        847297441,
        406762289,
        1314163512,
        1332590856,
        1866599683,
        4127851711,
        750260880,
        613907577,
        1450815602,
        3165620655,
        3734664991,
        3650291728,
        3012275730,
        3704569646,
        1427272223,
        778793252,
        1343938022,
        2676280711,
        2052605720,
        1946737175,
        3164576444,
        3914038668,
        3967478842,
        3682934266,
        1661551462,
        3294938066,
        4011595847,
        840292616,
        3712170807,
        616741398,
        312560963,
        711312465,
        1351876610,
        322626781,
        1910503582,
        271666773,
        2175563734,
        1594956187,
        70604529,
        3617834859,
        1007753275,
        1495573769,
        4069517037,
        2549218298,
        2663038764,
        504708206,
        2263041392,
        3941167025,
        2249088522,
        1514023603,
        1998579484,
        1312622330,
        694541497,
        2582060303,
        2151582166,
        1382467621,
        776784248,
        2618340202,
        3323268794,
        2497899128,
        2784771155,
        503983604,
        4076293799,
        907881277,
        423175695,
        432175456,
        1378068232,
        4145222326,
        3954048622,
        3938656102,
        3820766613,
        2793130115,
        2977904593,
        26017576,
        3274890735,
        3194772133,
        1700274565,
        1756076034,
        4006520079,
        3677328699,
        720338349,
        1533947780,
        354530856,
        688349552,
        3973924725,
        1637815568,
        332179504,
        3949051286,
        53804574,
        2852348879,
        3044236432,
        1282449977,
        3583942155,
        3416972820,
        4006381244,
        1617046695,
        2628476075,
        3002303598,
        1686838959,
        431878346,
        2686675385,
        1700445008,
        1080580658,
        1009431731,
        832498133,
        3223435511,
        2605976345,
        2271191193,
        2516031870,
        1648197032,
        4164389018,
        2548247927,
        300782431,
        375919233,
        238389289,
        3353747414,
        2531188641,
        2019080857,
        1475708069,
        455242339,
        2609103871,
        448939670,
        3451063019,
        1395535956,
        2413381860,
        1841049896,
        1491858159,
        885456874,
        4264095073,
        4001119347,
        1565136089,
        3898914787,
        1108368660,
        540939232,
        1173283510,
        2745871338,
        3681308437,
        4207628240,
        3343053890,
        4016749493,
        1699691293,
        1103962373,
        3625875870,
        2256883143,
        3830138730,
        1031889488,
        3479347698,
        1535977030,
        4236805024,
        3251091107,
        2132092099,
        1774941330,
        1199868427,
        1452454533,
        157007616,
        2904115357,
        342012276,
        595725824,
        1480756522,
        206960106,
        497939518,
        591360097,
        863170706,
        2375253569,
        3596610801,
        1814182875,
        2094937945,
        3421402208,
        1082520231,
        3463918190,
        2785509508,
        435703966,
        3908032597,
        1641649973,
        2842273706,
        3305899714,
        1510255612,
        2148256476,
        2655287854,
        3276092548,
        4258621189,
        236887753,
        3681803219,
        274041037,
        1734335097,
        3815195456,
        3317970021,
        1899903192,
        1026095262,
        4050517792,
        356393447,
        2410691914,
        3873677099,
        3682840055
      ],
      [
        3913112168,
        2491498743,
        4132185628,
        2489919796,
        1091903735,
        1979897079,
        3170134830,
        3567386728,
        3557303409,
        857797738,
        1136121015,
        1342202287,
        507115054,
        2535736646,
        337727348,
        3213592640,
        1301675037,
        2528481711,
        1895095763,
        1721773893,
        3216771564,
        62756741,
        2142006736,
        835421444,
        2531993523,
        1442658625,
        3659876326,
        2882144922,
        676362277,
        1392781812,
        170690266,
        3921047035,
        1759253602,
        3611846912,
        1745797284,
        664899054,
        1329594018,
        3901205900,
        3045908486,
        2062866102,
        2865634940,
        3543621612,
        3464012697,
        1080764994,
        553557557,
        3656615353,
        3996768171,
        991055499,
        499776247,
        1265440854,
        648242737,
        3940784050,
        980351604,
        3713745714,
        1749149687,
        3396870395,
        4211799374,
        3640570775,
        1161844396,
        3125318951,
        1431517754,
        545492359,
        4268468663,
        3499529547,
        1437099964,
        2702547544,
        3433638243,
        2581715763,
        2787789398,
        1060185593,
        1593081372,
        2418618748,
        4260947970,
        69676912,
        2159744348,
        86519011,
        2512459080,
        3838209314,
        1220612927,
        3339683548,
        133810670,
        1090789135,
        1078426020,
        1569222167,
        845107691,
        3583754449,
        4072456591,
        1091646820,
        628848692,
        1613405280,
        3757631651,
        526609435,
        236106946,
        48312990,
        2942717905,
        3402727701,
        1797494240,
        859738849,
        992217954,
        4005476642,
        2243076622,
        3870952857,
        3732016268,
        765654824,
        3490871365,
        2511836413,
        1685915746,
        3888969200,
        1414112111,
        2273134842,
        3281911079,
        4080962846,
        172450625,
        2569994100,
        980381355,
        4109958455,
        2819808352,
        2716589560,
        2568741196,
        3681446669,
        3329971472,
        1835478071,
        660984891,
        3704678404,
        4045999559,
        3422617507,
        3040415634,
        1762651403,
        1719377915,
        3470491036,
        2693910283,
        3642056355,
        3138596744,
        1364962596,
        2073328063,
        1983633131,
        926494387,
        3423689081,
        2150032023,
        4096667949,
        1749200295,
        3328846651,
        309677260,
        2016342300,
        1779581495,
        3079819751,
        111262694,
        1274766160,
        443224088,
        298511866,
        1025883608,
        3806446537,
        1145181785,
        168956806,
        3641502830,
        3584813610,
        1689216846,
        3666258015,
        3200248200,
        1692713982,
        2646376535,
        4042768518,
        1618508792,
        1610833997,
        3523052358,
        4130873264,
        2001055236,
        3610705100,
        2202168115,
        4028541809,
        2961195399,
        1006657119,
        2006996926,
        3186142756,
        1430667929,
        3210227297,
        1314452623,
        4074634658,
        4101304120,
        2273951170,
        1399257539,
        3367210612,
        3027628629,
        1190975929,
        2062231137,
        2333990788,
        2221543033,
        2438960610,
        1181637006,
        548689776,
        2362791313,
        3372408396,
        3104550113,
        3145860560,
        296247880,
        1970579870,
        3078560182,
        3769228297,
        1714227617,
        3291629107,
        3898220290,
        166772364,
        1251581989,
        493813264,
        448347421,
        195405023,
        2709975567,
        677966185,
        3703036547,
        1463355134,
        2715995803,
        1338867538,
        1343315457,
        2802222074,
        2684532164,
        233230375,
        2599980071,
        2000651841,
        3277868038,
        1638401717,
        4028070440,
        3237316320,
        6314154,
        819756386,
        300326615,
        590932579,
        1405279636,
        3267499572,
        3150704214,
        2428286686,
        3959192993,
        3461946742,
        1862657033,
        1266418056,
        963775037,
        2089974820,
        2263052895,
        1917689273,
        448879540,
        3550394620,
        3981727096,
        150775221,
        3627908307,
        1303187396,
        508620638,
        2975983352,
        2726630617,
        1817252668,
        1876281319,
        1457606340,
        908771278,
        3720792119,
        3617206836,
        2455994898,
        1729034894,
        1080033504
      ],
      [
        976866871,
        3556439503,
        2881648439,
        1522871579,
        1555064734,
        1336096578,
        3548522304,
        2579274686,
        3574697629,
        3205460757,
        3593280638,
        3338716283,
        3079412587,
        564236357,
        2993598910,
        1781952180,
        1464380207,
        3163844217,
        3332601554,
        1699332808,
        1393555694,
        1183702653,
        3581086237,
        1288719814,
        691649499,
        2847557200,
        2895455976,
        3193889540,
        2717570544,
        1781354906,
        1676643554,
        2592534050,
        3230253752,
        1126444790,
        2770207658,
        2633158820,
        2210423226,
        2615765581,
        2414155088,
        3127139286,
        673620729,
        2805611233,
        1269405062,
        4015350505,
        3341807571,
        4149409754,
        1057255273,
        2012875353,
        2162469141,
        2276492801,
        2601117357,
        993977747,
        3918593370,
        2654263191,
        753973209,
        36408145,
        2530585658,
        25011837,
        3520020182,
        2088578344,
        530523599,
        2918365339,
        1524020338,
        1518925132,
        3760827505,
        3759777254,
        1202760957,
        3985898139,
        3906192525,
        674977740,
        4174734889,
        2031300136,
        2019492241,
        3983892565,
        4153806404,
        3822280332,
        352677332,
        2297720250,
        60907813,
        90501309,
        3286998549,
        1016092578,
        2535922412,
        2839152426,
        457141659,
        509813237,
        4120667899,
        652014361,
        1966332200,
        2975202805,
        55981186,
        2327461051,
        676427537,
        3255491064,
        2882294119,
        3433927263,
        1307055953,
        942726286,
        933058658,
        2468411793,
        3933900994,
        4215176142,
        1361170020,
        2001714738,
        2830558078,
        3274259782,
        1222529897,
        1679025792,
        2729314320,
        3714953764,
        1770335741,
        151462246,
        3013232138,
        1682292957,
        1483529935,
        471910574,
        1539241949,
        458788160,
        3436315007,
        1807016891,
        3718408830,
        978976581,
        1043663428,
        3165965781,
        1927990952,
        4200891579,
        2372276910,
        3208408903,
        3533431907,
        1412390302,
        2931980059,
        4132332400,
        1947078029,
        3881505623,
        4168226417,
        2941484381,
        1077988104,
        1320477388,
        886195818,
        18198404,
        3786409e3,
        2509781533,
        112762804,
        3463356488,
        1866414978,
        891333506,
        18488651,
        661792760,
        1628790961,
        3885187036,
        3141171499,
        876946877,
        2693282273,
        1372485963,
        791857591,
        2686433993,
        3759982718,
        3167212022,
        3472953795,
        2716379847,
        445679433,
        3561995674,
        3504004811,
        3574258232,
        54117162,
        3331405415,
        2381918588,
        3769707343,
        4154350007,
        1140177722,
        4074052095,
        668550556,
        3214352940,
        367459370,
        261225585,
        2610173221,
        4209349473,
        3468074219,
        3265815641,
        314222801,
        3066103646,
        3808782860,
        282218597,
        3406013506,
        3773591054,
        379116347,
        1285071038,
        846784868,
        2669647154,
        3771962079,
        3550491691,
        2305946142,
        453669953,
        1268987020,
        3317592352,
        3279303384,
        3744833421,
        2610507566,
        3859509063,
        266596637,
        3847019092,
        517658769,
        3462560207,
        3443424879,
        370717030,
        4247526661,
        2224018117,
        4143653529,
        4112773975,
        2788324899,
        2477274417,
        1456262402,
        2901442914,
        1517677493,
        1846949527,
        2295493580,
        3734397586,
        2176403920,
        1280348187,
        1908823572,
        3871786941,
        846861322,
        1172426758,
        3287448474,
        3383383037,
        1655181056,
        3139813346,
        901632758,
        1897031941,
        2986607138,
        3066810236,
        3447102507,
        1393639104,
        373351379,
        950779232,
        625454576,
        3124240540,
        4148612726,
        2007998917,
        544563296,
        2244738638,
        2330496472,
        2058025392,
        1291430526,
        424198748,
        50039436,
        29584100,
        3605783033,
        2429876329,
        2791104160,
        1057563949,
        3255363231,
        3075367218,
        3463963227,
        1469046755,
        985887462
      ]
    ];
    Blowfish.prototype.PARRAY = [
      608135816,
      2242054355,
      320440878,
      57701188,
      2752067618,
      698298832,
      137296536,
      3964562569,
      1160258022,
      953160567,
      3193202383,
      887688300,
      3232508343,
      3380367581,
      1065670069,
      3041331479,
      2450970073,
      2306472731
    ];
    Blowfish.prototype.NN = 16;
    Blowfish.prototype._clean = function(xx) {
      if (xx < 0) {
        const yy = xx & 2147483647;
        xx = yy + 2147483648;
      }
      return xx;
    };
    Blowfish.prototype._F = function(xx) {
      let yy;
      const dd = xx & 255;
      xx >>>= 8;
      const cc = xx & 255;
      xx >>>= 8;
      const bb = xx & 255;
      xx >>>= 8;
      const aa = xx & 255;
      yy = this.sboxes[0][aa] + this.sboxes[1][bb];
      yy ^= this.sboxes[2][cc];
      yy += this.sboxes[3][dd];
      return yy;
    };
    Blowfish.prototype._encryptBlock = function(vals) {
      let dataL = vals[0];
      let dataR = vals[1];
      let ii;
      for (ii = 0; ii < this.NN; ++ii) {
        dataL ^= this.parray[ii];
        dataR = this._F(dataL) ^ dataR;
        const tmp = dataL;
        dataL = dataR;
        dataR = tmp;
      }
      dataL ^= this.parray[this.NN + 0];
      dataR ^= this.parray[this.NN + 1];
      vals[0] = this._clean(dataR);
      vals[1] = this._clean(dataL);
    };
    Blowfish.prototype.encryptBlock = function(vector) {
      let ii;
      const vals = [0, 0];
      const off = this.BLOCKSIZE / 2;
      for (ii = 0; ii < this.BLOCKSIZE / 2; ++ii) {
        vals[0] = vals[0] << 8 | vector[ii + 0] & 255;
        vals[1] = vals[1] << 8 | vector[ii + off] & 255;
      }
      this._encryptBlock(vals);
      const ret = [];
      for (ii = 0; ii < this.BLOCKSIZE / 2; ++ii) {
        ret[ii + 0] = vals[0] >>> 24 - 8 * ii & 255;
        ret[ii + off] = vals[1] >>> 24 - 8 * ii & 255;
      }
      return ret;
    };
    Blowfish.prototype._decryptBlock = function(vals) {
      let dataL = vals[0];
      let dataR = vals[1];
      let ii;
      for (ii = this.NN + 1; ii > 1; --ii) {
        dataL ^= this.parray[ii];
        dataR = this._F(dataL) ^ dataR;
        const tmp = dataL;
        dataL = dataR;
        dataR = tmp;
      }
      dataL ^= this.parray[1];
      dataR ^= this.parray[0];
      vals[0] = this._clean(dataR);
      vals[1] = this._clean(dataL);
    };
    Blowfish.prototype.init = function(key) {
      let ii;
      let jj = 0;
      this.parray = [];
      for (ii = 0; ii < this.NN + 2; ++ii) {
        let data = 0;
        for (let kk = 0; kk < 4; ++kk) {
          data = data << 8 | key[jj] & 255;
          if (++jj >= key.length) {
            jj = 0;
          }
        }
        this.parray[ii] = this.PARRAY[ii] ^ data;
      }
      this.sboxes = [];
      for (ii = 0; ii < 4; ++ii) {
        this.sboxes[ii] = [];
        for (jj = 0; jj < 256; ++jj) {
          this.sboxes[ii][jj] = this.SBOXES[ii][jj];
        }
      }
      const vals = [0, 0];
      for (ii = 0; ii < this.NN + 2; ii += 2) {
        this._encryptBlock(vals);
        this.parray[ii + 0] = vals[0];
        this.parray[ii + 1] = vals[1];
      }
      for (ii = 0; ii < 4; ++ii) {
        for (jj = 0; jj < 256; jj += 2) {
          this._encryptBlock(vals);
          this.sboxes[ii][jj + 0] = vals[0];
          this.sboxes[ii][jj + 1] = vals[1];
        }
      }
    };
    BF.keySize = BF.prototype.keySize = 16;
    BF.blockSize = BF.prototype.blockSize = 8;
    blowfish_default = BF;
  }
});

// vendor/src/openpgpjs/src/crypto/cipher/legacy_ciphers.js
var legacy_ciphers_exports = {};
__export(legacy_ciphers_exports, {
  legacyCiphers: () => legacyCiphers
});
var legacyCiphers;
var init_legacy_ciphers = __esm({
  "vendor/src/openpgpjs/src/crypto/cipher/legacy_ciphers.js"() {
    init_des();
    init_cast5();
    init_twofish();
    init_blowfish();
    legacyCiphers = new Map(Object.entries({
      tripledes: TripleDES,
      cast5: cast5_default,
      twofish: twofish_default,
      blowfish: blowfish_default
    }));
  }
});

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
function compress(S2, last) {
  const v = new Uint32Array(32);
  const m = new Uint32Array(S2.b.buffer, S2.b.byteOffset, 32);
  for (let i = 0; i < 16; i++) {
    v[i] = S2.h[i];
    v[i + 16] = BLAKE2B_IV32[i];
  }
  v[24] ^= S2.t0[0];
  v[25] ^= S2.t0[1];
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
    S2.h[i] ^= v[i] ^ v[i + 16];
  }
}
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
var BLAKE2B_IV32, SIGMA, Blake2b, OUTBYTES_MAX, KEYBYTES_MAX, SALTBYTES, PERSONALBYTES, BLOCKBYTES;
var init_blake2b = __esm({
  "vendor/src/argon2id/lib/blake2b.js"() {
    BLAKE2B_IV32 = new Uint32Array([
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
    SIGMA = new Uint8Array([
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
    Blake2b = class {
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
    OUTBYTES_MAX = 64;
    KEYBYTES_MAX = 64;
    SALTBYTES = 16;
    PERSONALBYTES = 16;
    BLOCKBYTES = 128;
  }
});

// vendor/src/argon2id/lib/argon2id.js
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
function H_(outlen, X2, res) {
  const V = new Uint8Array(64);
  const V1_in = new Uint8Array(4 + X2.length);
  LE32(V1_in, outlen, 0);
  V1_in.set(X2, 4);
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
function G2(wasmContext, X2, Y2, R) {
  wasmContext.fn.G(
    X2.byteOffset,
    Y2.byteOffset,
    R.byteOffset,
    wasmContext.refs.gZ.byteOffset
  );
  return R;
}
function G22(wasmContext, X2, Y2, R) {
  wasmContext.fn.G2(
    X2.byteOffset,
    Y2.byteOffset,
    R.byteOffset,
    wasmContext.refs.gZ.byteOffset
  );
  return R;
}
function* makePRNG(wasmContext, pass, lane, slice2, m_, totalPasses, segmentLength, segmentOffset) {
  wasmContext.refs.prngTmp.fill(0);
  const Z2 = wasmContext.refs.prngTmp.subarray(0, 6 * 8);
  LE64(Z2, pass, 0);
  LE64(Z2, lane, 8);
  LE64(Z2, slice2, 16);
  LE64(Z2, m_, 24);
  LE64(Z2, totalPasses, 32);
  LE64(Z2, TYPE, 40);
  for (let i = 1; i <= segmentLength; i++) {
    LE64(wasmContext.refs.prngTmp, i, Z2.length);
    const g2 = G22(wasmContext, wasmContext.refs.ZERO1024, wasmContext.refs.prngTmp, wasmContext.refs.prngR);
    for (let k = i === 1 ? segmentOffset * 8 : 0; k < g2.length; k += 8) {
      yield g2.subarray(k, k + 8);
    }
  }
  return [];
}
function validateParams10({ type, version, tagLength: tagLength4, password, salt, ad, secret, parallelism, memorySize, passes }) {
  const assertLength = (name, value, min, max2) => {
    if (value < min || value > max2) {
      throw new Error(`${name} size should be between ${min} and ${max2} bytes`);
    }
  };
  if (type !== TYPE || version !== VERSION) throw new Error("Unsupported type or version");
  assertLength("password", password, passwordBYTES_MIN, passwordBYTES_MAX);
  assertLength("salt", salt, SALTBYTES_MIN, SALTBYTES_MAX);
  assertLength("tag", tagLength4, TAGBYTES_MIN, TAGBYTES_MAX);
  assertLength("memory", memorySize, 8 * parallelism, MEMBYTES_MAX);
  ad && assertLength("associated data", ad, 0, ADBYTES_MAX);
  secret && assertLength("secret", secret, 0, SECRETBYTES_MAX);
  return { type, version, tagLength: tagLength4, password, salt, ad, secret, lanes: parallelism, memorySize, passes };
}
function argon2id(params, { memory, instance: wasmInstance }) {
  if (!isLittleEndian2) throw new Error("BigEndian system not supported");
  const ctx = validateParams10({ type: TYPE, version: VERSION, ...params });
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
var TYPE, VERSION, TAGBYTES_MAX, TAGBYTES_MIN, SALTBYTES_MAX, SALTBYTES_MIN, passwordBYTES_MAX, passwordBYTES_MIN, MEMBYTES_MAX, ADBYTES_MAX, SECRETBYTES_MAX, ARGON2_BLOCK_SIZE, ARGON2_PREHASH_DIGEST_LENGTH, isLittleEndian2, KB, WASM_PAGE_SIZE;
var init_argon2id = __esm({
  "vendor/src/argon2id/lib/argon2id.js"() {
    init_blake2b();
    TYPE = 2;
    VERSION = 19;
    TAGBYTES_MAX = 4294967295;
    TAGBYTES_MIN = 4;
    SALTBYTES_MAX = 4294967295;
    SALTBYTES_MIN = 8;
    passwordBYTES_MAX = 4294967295;
    passwordBYTES_MIN = 8;
    MEMBYTES_MAX = 4294967295;
    ADBYTES_MAX = 4294967295;
    SECRETBYTES_MAX = 32;
    ARGON2_BLOCK_SIZE = 1024;
    ARGON2_PREHASH_DIGEST_LENGTH = 64;
    isLittleEndian2 = new Uint8Array(new Uint16Array([43981]).buffer)[0] === 205;
    KB = 1024;
    WASM_PAGE_SIZE = 64 * KB;
  }
});

// vendor/src/argon2id/lib/setup.js
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
var isSIMDSupported;
var init_setup = __esm({
  "vendor/src/argon2id/lib/setup.js"() {
    init_argon2id();
  }
});

// vendor/build/argon2id-no-simd.wasm
var argon2id_no_simd_default;
var init_argon2id_no_simd = __esm({
  "vendor/build/argon2id-no-simd.wasm"() {
    argon2id_no_simd_default = __toBinary("AGFzbQEAAAABLwRgA39/fwBgEX9/f39/f39/f39/f39/f39/AGAEf39/fwBgCX9/f39/f39/fwF/Ag8BA2VudgZtZW1vcnkCAAIDBgUAAQICAwQFAXABAQEGCAF/AUGAiAQLBxgEA3hvcgAAAUcAAgJHMgADBWdldExaAAQKhBoFUAEEf0EAIQMDQCAAIANqIgQgAiADaiIFKQMAIAEgA2oiBikDAIU3AwAgBEEIaiAFQQhqKQMAIAZBCGopAwCFNwMAIANBEGoiA0GACEcNAAsL4A8DAX8CfgJ/IAAgAUEDdGoiESARKQMAIhIgACAFQQN0aiIFKQMAIhN8IBJCAYZC/v///x+DIBNC/////w+DfnwiEjcDACAAIA1BA3RqIhQgEiAUKQMAhUIgiSISNwMAIAAgCUEDdGoiFSASIBUpAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIAUgEiAFKQMAhUIoiSISNwMAIBEgEiARKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACAUIBIgFCkDAIVCMIkiEjcDACAVIBIgFSkDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgBSASIAUpAwCFQgGJNwMAIAAgAkEDdGoiAiACKQMAIhIgACAGQQN0aiIBKQMAIhN8IBJCAYZC/v///x+DIBNC/////w+DfnwiEjcDACAAIA5BA3RqIgYgEiAGKQMAhUIgiSISNwMAIAAgCkEDdGoiDiASIA4pAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIAEgEiABKQMAhUIoiSISNwMAIAIgEiACKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACAGIBIgBikDAIVCMIkiEjcDACAOIBIgDikDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgASASIAEpAwCFQgGJNwMAIAAgA0EDdGoiCiAKKQMAIhIgACAHQQN0aiINKQMAIhN8IBJCAYZC/v///x+DIBNC/////w+DfnwiEjcDACAAIA9BA3RqIgcgEiAHKQMAhUIgiSISNwMAIAAgC0EDdGoiAyASIAMpAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIA0gEiANKQMAhUIoiSISNwMAIAogEiAKKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACAHIBIgBykDAIVCMIkiEjcDACADIBIgAykDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgDSASIA0pAwCFQgGJNwMAIAAgBEEDdGoiDyAPKQMAIhIgACAIQQN0aiIJKQMAIhN8IBJCAYZC/v///x+DIBNC/////w+DfnwiEjcDACAAIBBBA3RqIgsgEiALKQMAhUIgiSISNwMAIAAgDEEDdGoiACASIAApAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIAkgEiAJKQMAhUIoiSISNwMAIA8gEiAPKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACALIBIgCykDAIVCMIkiEjcDACAAIBIgACkDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgCSASIAkpAwCFQgGJNwMAIBEgESkDACISIAEpAwAiE3wgEkIBhkL+////H4MgE0L/////D4N+fCISNwMAIAsgEiALKQMAhUIgiSISNwMAIAMgEiADKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACABIBIgASkDAIVCKIkiEjcDACARIBIgESkDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgCyASIAspAwCFQjCJIhI3AwAgAyASIAMpAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIAEgEiABKQMAhUIBiTcDACACIAIpAwAiEiANKQMAIhN8IBJCAYZC/v///x+DIBNC/////w+DfnwiEjcDACAUIBIgFCkDAIVCIIkiEjcDACAAIBIgACkDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgDSASIA0pAwCFQiiJIhI3AwAgAiASIAIpAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIBQgEiAUKQMAhUIwiSISNwMAIAAgEiAAKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACANIBIgDSkDAIVCAYk3AwAgCiAKKQMAIhIgCSkDACITfCASQgGGQv7///8fgyATQv////8Pg358IhI3AwAgBiASIAYpAwCFQiCJIhI3AwAgFSASIBUpAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIAkgEiAJKQMAhUIoiSISNwMAIAogEiAKKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACAGIBIgBikDAIVCMIkiEjcDACAVIBIgFSkDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgCSASIAkpAwCFQgGJNwMAIA8gDykDACISIAUpAwAiE3wgEkIBhkL+////H4MgE0L/////D4N+fCISNwMAIAcgEiAHKQMAhUIgiSISNwMAIA4gEiAOKQMAIhN8IBJC/////w+DIBNCAYZC/v///x+DfnwiEjcDACAFIBIgBSkDAIVCKIkiEjcDACAPIBIgDykDACITfCASQv////8PgyATQgGGQv7///8fg358IhI3AwAgByASIAcpAwCFQjCJIhI3AwAgDiASIA4pAwAiE3wgEkL/////D4MgE0IBhkL+////H4N+fCISNwMAIAUgEiAFKQMAhUIBiTcDAAuwCAEEf0EAIQQDQCACIARqIgUgASAEaiIGKQMAIAAgBGoiBykDAIU3AwAgBUEIaiAGQQhqKQMAIAdBCGopAwCFNwMAIARBEGoiBEGACEcNAAtBACEHQQ8hBANAIAMgB2oiBSACIAdqIgYpAwA3AwAgBUEIaiAGQQhqKQMANwMAIAVBEGogBkEQaikDADcDACAFQRhqIAZBGGopAwA3AwAgBUEgaiAGQSBqKQMANwMAIAVBKGogBkEoaikDADcDACAFQTBqIAZBMGopAwA3AwAgBUE4aiAGQThqKQMANwMAIAVBwABqIAZBwABqKQMANwMAIAVByABqIAZByABqKQMANwMAIAVB0ABqIAZB0ABqKQMANwMAIAVB2ABqIAZB2ABqKQMANwMAIAVB4ABqIAZB4ABqKQMANwMAIAVB6ABqIAZB6ABqKQMANwMAIAVB8ABqIAZB8ABqKQMANwMAIAVB+ABqIAZB+ABqKQMANwMAIAMgBEFxaiIFQf//A3EgBEFyakH//wNxIARBc2pB//8DcSAEQXRqQf//A3EgBEF1akH//wNxIARBdmpB//8DcSAEQXdqQf//A3EgBEF4akH//wNxIARBeWpB//8DcSAEQXpqQf//A3EgBEF7akH//wNxIARBfGpB//8DcSAEQX1qQf//A3EgBEF+akH//wNxIARBf2pB//8DcSAEQf//A3EQgYCAgAAgBEEQaiEEIAdBgAFqIQcgBUHwAEkNAAsgA0EAQQFBEEERQSBBIUEwQTFBwABBwQBB0ABB0QBB4ABB4QBB8ABB8QAQgYCAgAAgA0ECQQNBEkETQSJBI0EyQTNBwgBBwwBB0gBB0wBB4gBB4wBB8gBB8wAQgYCAgAAgA0EEQQVBFEEVQSRBJUE0QTVBxABBxQBB1ABB1QBB5ABB5QBB9ABB9QAQgYCAgAAgA0EGQQdBFkEXQSZBJ0E2QTdBxgBBxwBB1gBB1wBB5gBB5wBB9gBB9wAQgYCAgAAgA0EIQQlBGEEZQShBKUE4QTlByABByQBB2ABB2QBB6ABB6QBB+ABB+QAQgYCAgAAgA0EKQQtBGkEbQSpBK0E6QTtBygBBywBB2gBB2wBB6gBB6wBB+gBB+wAQgYCAgAAgA0EMQQ1BHEEdQSxBLUE8QT1BzABBzQBB3ABB3QBB7ABB7QBB/ABB/QAQgYCAgAAgA0EOQQ9BHkEfQS5BL0E+QT9BzgBBzwBB3gBB3wBB7gBB7wBB/gBB/wAQgYCAgABBgHghBANAIAIgBGoiBUGACGoiByADIARqIgZBgAhqKQMAIAcpAwCFNwMAIAVBiAhqIgcgBkGICGopAwAgBykDAIU3AwAgBUGQCGoiByAGQZAIaikDACAHKQMAhTcDACAFQZgIaiIFIAZBmAhqKQMAIAUpAwCFNwMAIARBIGoiBA0ACwseACAAIAEgAiADEIKAgIAAIAAgAiACIAMQgoCAgAALfgIBfwF+IAIhCQJAIAUgBHJFDQAgASgCBCADcCEJCyABNQIAIQogACAJNgIAIAAgBkF/akEAQX8gBhsgCSACRhsgB0F/aiAFIAQbIAhsaiIJIAVBAWogCGxBACAEG2ogCiAKfkIgiCAJrX5CIIinQX9zaiAIIAdscDYCBCAACw==");
  }
});

// vendor/shims/argon2id.js
var argon2id_exports = {};
__export(argon2id_exports, {
  default: () => loadArgon2id
});
function loadArgon2id() {
  return setupWasm(
    () => Promise.reject(new Error("SIMD build not included")),
    (importObject) => WebAssembly.instantiate(argon2id_no_simd_default, importObject)
  );
}
var init_argon2id2 = __esm({
  "vendor/shims/argon2id.js"() {
    init_setup();
    init_argon2id_no_simd();
  }
});

// vendor/shims/unbzip2.js
var unbzip2_exports = {};
__export(unbzip2_exports, {
  default: () => unbzip2Stream
});
function unbzip2Stream() {
  throw new Error("BZip2-komprimierte OpenPGP-Nachrichten werden von OmniVault nicht unterst\xFCtzt");
}
var init_unbzip2 = __esm({
  "vendor/shims/unbzip2.js"() {
  }
});

// vendor/src/web-stream-tools/lib/writer.js
var doneWritingPromise = /* @__PURE__ */ Symbol("doneWritingPromise");
var doneWritingResolve = /* @__PURE__ */ Symbol("doneWritingResolve");
var doneWritingReject = /* @__PURE__ */ Symbol("doneWritingReject");
var readingIndex = /* @__PURE__ */ Symbol("readingIndex");
var ArrayStream = class _ArrayStream extends Array {
  constructor() {
    super();
    Object.setPrototypeOf(this, _ArrayStream.prototype);
    this[doneWritingPromise] = new Promise((resolve, reject) => {
      this[doneWritingResolve] = resolve;
      this[doneWritingReject] = reject;
    });
    this[doneWritingPromise].catch(() => {
    });
  }
};
ArrayStream.prototype.getReader = function() {
  if (this[readingIndex] === void 0) {
    this[readingIndex] = 0;
  }
  return {
    read: async () => {
      await this[doneWritingPromise];
      if (this[readingIndex] === this.length) {
        return { value: void 0, done: true };
      }
      return { value: this[this[readingIndex]++], done: false };
    }
  };
};
ArrayStream.prototype.readToEnd = async function(join) {
  await this[doneWritingPromise];
  const result = join(this.slice(this[readingIndex]));
  this.length = 0;
  return result;
};
ArrayStream.prototype.clone = function() {
  const clone2 = new ArrayStream();
  clone2[doneWritingPromise] = this[doneWritingPromise].then(() => {
    clone2.push(...this);
  });
  return clone2;
};
function isArrayStream(input) {
  return input && input.getReader && Array.isArray(input);
}
function Writer(input) {
  if (!isArrayStream(input)) {
    const writer = input.getWriter();
    const releaseLock = writer.releaseLock;
    writer.releaseLock = () => {
      writer.closed.catch(function() {
      });
      releaseLock.call(writer);
    };
    return writer;
  }
  this.stream = input;
}
Writer.prototype.write = async function(chunk) {
  this.stream.push(chunk);
};
Writer.prototype.close = async function() {
  this.stream[doneWritingResolve]();
};
Writer.prototype.abort = async function(reason) {
  this.stream[doneWritingReject](reason);
  return reason;
};
Writer.prototype.releaseLock = function() {
};

// vendor/src/web-stream-tools/lib/util.js
var isNode = typeof globalThis.process === "object" && typeof globalThis.process.versions === "object";
function isStream(input) {
  if (isArrayStream(input)) {
    return "array";
  }
  if (globalThis.ReadableStream && globalThis.ReadableStream.prototype.isPrototypeOf(input)) {
    return "web";
  }
  if (input && !(globalThis.ReadableStream && input instanceof globalThis.ReadableStream) && typeof input._read === "function" && typeof input._readableState === "object") {
    throw new Error("Native Node streams are no longer supported: please manually convert the stream to a WebStream, using e.g. `stream.Readable.toWeb`");
  }
  if (input && input.getReader) {
    return "web-like";
  }
  return false;
}
function isUint8Array(input) {
  return Uint8Array.prototype.isPrototypeOf(input);
}
function concatUint8Array(arrays) {
  if (arrays.length === 1) return arrays[0];
  let totalLength = 0;
  for (let i = 0; i < arrays.length; i++) {
    if (!isUint8Array(arrays[i])) {
      throw new Error("concatUint8Array: Data must be in the form of a Uint8Array");
    }
    totalLength += arrays[i].length;
  }
  const result = new Uint8Array(totalLength);
  let pos = 0;
  arrays.forEach(function(element) {
    result.set(element, pos);
    pos += element.length;
  });
  return result;
}

// vendor/src/web-stream-tools/lib/reader.js
var doneReadingSet = /* @__PURE__ */ new WeakSet();
var externalBuffer = /* @__PURE__ */ Symbol("externalBuffer");
function Reader(input) {
  this.stream = input;
  if (input[externalBuffer]) {
    this[externalBuffer] = input[externalBuffer].slice();
  }
  if (isArrayStream(input)) {
    const reader = input.getReader();
    this._read = reader.read.bind(reader);
    this._releaseLock = () => {
    };
    this._cancel = () => {
    };
    return;
  }
  let streamType = isStream(input);
  if (streamType) {
    const reader = input.getReader();
    this._read = reader.read.bind(reader);
    this._releaseLock = () => {
      reader.closed.catch(function() {
      });
      reader.releaseLock();
    };
    this._cancel = reader.cancel.bind(reader);
    return;
  }
  let doneReading = false;
  this._read = async () => {
    if (doneReading || doneReadingSet.has(input)) {
      return { value: void 0, done: true };
    }
    doneReading = true;
    return { value: input, done: false };
  };
  this._releaseLock = () => {
    if (doneReading) {
      try {
        doneReadingSet.add(input);
      } catch {
      }
    }
  };
}
Reader.prototype.read = async function() {
  if (this[externalBuffer] && this[externalBuffer].length) {
    const value = this[externalBuffer].shift();
    return { done: false, value };
  }
  return this._read();
};
Reader.prototype.releaseLock = function() {
  if (this[externalBuffer]) {
    this.stream[externalBuffer] = this[externalBuffer];
  }
  this._releaseLock();
};
Reader.prototype.cancel = function(reason) {
  return this._cancel(reason);
};
Reader.prototype.readLine = async function() {
  let buffer = [];
  let returnVal;
  while (!returnVal) {
    let { done, value } = await this.read();
    value += "";
    if (done) {
      if (buffer.length) return concat(buffer);
      return;
    }
    const lineEndIndex = value.indexOf("\n") + 1;
    if (lineEndIndex) {
      returnVal = concat(buffer.concat(value.substr(0, lineEndIndex)));
      buffer = [];
    }
    if (lineEndIndex !== value.length) {
      buffer.push(value.substr(lineEndIndex));
    }
  }
  this.unshift(...buffer);
  return returnVal;
};
Reader.prototype.readByte = async function() {
  const { done, value } = await this.read();
  if (done) return;
  const byte = value[0];
  this.unshift(slice(value, 1));
  return byte;
};
Reader.prototype.readBytes = async function(length) {
  const buffer = [];
  let bufferLength = 0;
  while (true) {
    const { done, value } = await this.read();
    if (done) {
      if (buffer.length) return concat(buffer);
      return;
    }
    buffer.push(value);
    bufferLength += value.length;
    if (bufferLength >= length) {
      const bufferConcat = concat(buffer);
      this.unshift(slice(bufferConcat, length));
      return slice(bufferConcat, 0, length);
    }
  }
};
Reader.prototype.peekBytes = async function(length) {
  const bytes = await this.readBytes(length);
  this.unshift(bytes);
  return bytes;
};
Reader.prototype.unshift = function(...values) {
  if (!this[externalBuffer]) {
    this[externalBuffer] = [];
  }
  if (values.length === 1 && isUint8Array(values[0]) && this[externalBuffer].length && values[0].length && this[externalBuffer][0].byteOffset >= values[0].length) {
    this[externalBuffer][0] = new Uint8Array(
      this[externalBuffer][0].buffer,
      this[externalBuffer][0].byteOffset - values[0].length,
      this[externalBuffer][0].byteLength + values[0].length
    );
    return;
  }
  this[externalBuffer].unshift(...values.filter((value) => value && value.length));
};
Reader.prototype.readToEnd = async function(join = concat) {
  const result = [];
  while (true) {
    const { done, value } = await this.read();
    if (done) break;
    result.push(value);
  }
  return join(result);
};

// vendor/src/web-stream-tools/lib/streams.js
function toStream(input) {
  if (isStream(input)) {
    return input;
  }
  return new ReadableStream({
    start(controller) {
      controller.enqueue(input);
      controller.close();
    }
  });
}
function toArrayStream(input) {
  const streamType = isStream(input);
  if (streamType) {
    if (streamType !== "array") {
      throw new Error("Can't convert Stream to ArrayStream here, call `readToEnd` first");
    }
    return input;
  }
  const stream = new ArrayStream();
  (async () => {
    const writer = getWriter(stream);
    await writer.write(input);
    await writer.close();
  })();
  return stream;
}
function concat(list) {
  if (list.some((stream) => isStream(stream) && !isArrayStream(stream))) {
    return concatStream(list);
  }
  if (list.some((stream) => isArrayStream(stream))) {
    return concatArrayStream(list);
  }
  if (typeof list[0] === "string") {
    return list.join("");
  }
  return concatUint8Array(list);
}
function concatStream(list) {
  const streamedList = list.map(toStream);
  const transform2 = transformWithCancel(async function(reason) {
    await Promise.all(transforms.map((stream) => cancel(stream, reason)));
  });
  let prev = Promise.resolve();
  const transforms = streamedList.map((stream, i) => transformPair(stream, (readable, _writable) => {
    prev = prev.then(() => pipe(readable, transform2.writable, {
      preventClose: i !== streamedList.length - 1
    }));
    return prev;
  }));
  return transform2.readable;
}
function concatArrayStream(list) {
  const result = new ArrayStream();
  let prev = Promise.resolve();
  list.forEach((stream, i) => {
    prev = prev.then(() => pipe(stream, result, {
      preventClose: i !== list.length - 1
    }));
    return prev;
  });
  return result;
}
async function pipe(input, target, {
  preventClose = false,
  preventAbort = false,
  preventCancel = false
} = {}) {
  if (isStream(input) && !isArrayStream(input) && !isArrayStream(target)) {
    input = toStream(input);
    try {
      if (input[externalBuffer]) {
        const writer2 = getWriter(target);
        for (let i = 0; i < input[externalBuffer].length; i++) {
          await writer2.ready;
          await writer2.write(input[externalBuffer][i]);
        }
        writer2.releaseLock();
      }
      await input.pipeTo(target, {
        preventClose,
        preventAbort,
        preventCancel
      });
    } catch {
    }
    return;
  }
  if (!isStream(input)) {
    input = toArrayStream(input);
  }
  const reader = getReader(input);
  const writer = getWriter(target);
  try {
    while (true) {
      await writer.ready;
      const { done, value } = await reader.read();
      if (done) {
        if (!preventClose) await writer.close();
        break;
      }
      await writer.write(value);
    }
  } catch (e) {
    if (!preventAbort) await writer.abort(e);
  } finally {
    reader.releaseLock();
    writer.releaseLock();
  }
}
function transformWithCancel(customCancel) {
  let pulled = false;
  let cancelled = false;
  let backpressureChangePromiseResolve, backpressureChangePromiseReject;
  let outputController;
  return {
    readable: new ReadableStream({
      start(controller) {
        outputController = controller;
      },
      pull() {
        if (backpressureChangePromiseResolve) {
          backpressureChangePromiseResolve();
        } else {
          pulled = true;
        }
      },
      async cancel(reason) {
        cancelled = true;
        if (customCancel) {
          await customCancel(reason);
        }
        if (backpressureChangePromiseReject) {
          backpressureChangePromiseReject(reason);
        }
      }
    }, { highWaterMark: 0 }),
    writable: new WritableStream({
      write: async function(chunk) {
        if (cancelled) {
          throw new Error("Stream is cancelled");
        }
        outputController.enqueue(chunk);
        if (!pulled) {
          await new Promise((resolve, reject) => {
            backpressureChangePromiseResolve = resolve;
            backpressureChangePromiseReject = reject;
          });
          backpressureChangePromiseResolve = null;
          backpressureChangePromiseReject = null;
        } else {
          pulled = false;
        }
      },
      close: outputController.close.bind(outputController),
      abort: outputController.error.bind(outputController)
    })
  };
}
function transform(input, process2 = () => void 0, finish = () => void 0, queuingStrategy = { highWaterMark: 0 }) {
  if (isStream(input)) {
    return _transformStream(input, process2, finish, queuingStrategy);
  }
  const result1 = process2(input);
  const result2 = finish();
  if (result1 !== void 0 && result2 !== void 0) return concat([result1, result2]);
  return result1 !== void 0 ? result1 : result2;
}
async function transformAsync(input, process2 = async () => void 0, finish = async () => void 0, queuingStrategy = { highWaterMark: 1 }) {
  if (isStream(input)) {
    return _transformStream(input, process2, finish, queuingStrategy);
  }
  const result1 = await process2(input);
  const result2 = await finish();
  if (result1 !== void 0 && result2 !== void 0) return concat([result1, result2]);
  return result1 !== void 0 ? result1 : result2;
}
function _transformStream(input, process2, finish, queuingStrategy) {
  if (isArrayStream(input)) {
    const output = new ArrayStream();
    (async () => {
      const writer = getWriter(output);
      try {
        const data = await readToEnd(input);
        const result1 = await process2(data);
        const result2 = await finish();
        let result;
        if (result1 !== void 0 && result2 !== void 0) result = concat([result1, result2]);
        else result = result1 !== void 0 ? result1 : result2;
        await writer.write(result);
        await writer.close();
      } catch (e) {
        await writer.abort(e);
      }
    })();
    return output;
  }
  if (isStream(input)) {
    let reader;
    let allDone = false;
    return new ReadableStream({
      start() {
        reader = input.getReader();
      },
      async pull(controller) {
        if (allDone) {
          controller.close();
          input.releaseLock();
          return;
        }
        try {
          while (true) {
            const { value, done } = await reader.read();
            allDone = done;
            const result = await (done ? finish : process2)(value);
            if (result !== void 0) {
              controller.enqueue(result);
              return;
            }
            if (done) {
              controller.close();
              input.releaseLock();
              return;
            }
          }
        } catch (e) {
          controller.error(e);
        }
      },
      async cancel(reason) {
        await reader.cancel(reason);
      }
    }, queuingStrategy);
  }
  throw new Error("Unreachable");
}
function transformPair(input, fn) {
  if (isStream(input) && !isArrayStream(input)) {
    let incomingTransformController;
    const incoming = new TransformStream({
      start(controller) {
        incomingTransformController = controller;
      }
    });
    const pipeDonePromise = pipe(input, incoming.writable);
    const outgoing = transformWithCancel(async function(reason) {
      incomingTransformController.error(reason);
      await pipeDonePromise;
      await new Promise((resolve) => setTimeout(resolve));
    });
    fn(incoming.readable, outgoing.writable);
    return outgoing.readable;
  }
  input = toArrayStream(input);
  const output = new ArrayStream();
  fn(input, output);
  return output;
}
function parse(input, fn) {
  let returnValue;
  const transformed = transformPair(input, (readable, writable) => {
    const reader = getReader(readable);
    reader.remainder = () => {
      reader.releaseLock();
      pipe(readable, writable);
      return transformed;
    };
    returnValue = fn(reader);
  });
  return returnValue;
}
function tee(input) {
  if (isArrayStream(input)) {
    throw new Error("ArrayStream cannot be tee()d, use clone() instead");
  }
  if (isStream(input)) {
    const teed = toStream(input).tee();
    teed[0][externalBuffer] = teed[1][externalBuffer] = input[externalBuffer];
    return teed;
  }
  return [slice(input), slice(input)];
}
function clone(input) {
  if (isArrayStream(input)) {
    return input.clone();
  }
  if (isStream(input)) {
    const teed = tee(input);
    overwrite(input, teed[0]);
    return teed[1];
  }
  return slice(input);
}
function passiveClone(input) {
  if (isArrayStream(input)) {
    return clone(input);
  }
  if (isStream(input)) {
    return new ReadableStream({
      start(controller) {
        const transformed = transformPair(input, async (readable, writable) => {
          const reader = getReader(readable);
          const writer = getWriter(writable);
          try {
            while (true) {
              await writer.ready;
              const { done, value } = await reader.read();
              if (done) {
                try {
                  controller.close();
                } catch {
                }
                await writer.close();
                return;
              }
              try {
                controller.enqueue(value);
              } catch {
              }
              await writer.write(value);
            }
          } catch (e) {
            controller.error(e);
            await writer.abort(e);
          }
        });
        overwrite(input, transformed);
      }
    });
  }
  return slice(input);
}
function overwrite(input, clone2) {
  Object.entries(Object.getOwnPropertyDescriptors(input.constructor.prototype)).forEach(([name, descriptor]) => {
    if (name === "constructor") {
      return;
    }
    if (descriptor.value) {
      descriptor.value = descriptor.value.bind(clone2);
    } else {
      descriptor.get = descriptor.get.bind(clone2);
    }
    Object.defineProperty(input, name, descriptor);
  });
}
function slice(input, begin = 0, end = Infinity) {
  if (isArrayStream(input)) {
    throw new Error("Not implemented");
  }
  if (isStream(input)) {
    if (begin >= 0 && end >= 0) {
      let reader;
      let bytesRead = 0;
      return new ReadableStream({
        start() {
          reader = input.getReader();
        },
        async pull(controller) {
          try {
            while (true) {
              if (bytesRead < end) {
                const { value, done } = await reader.read();
                if (done) {
                  controller.close();
                  input.releaseLock();
                  return;
                }
                let valueToEnqueue;
                if (bytesRead + value.length >= begin) {
                  valueToEnqueue = slice(value, Math.max(begin - bytesRead, 0), end - bytesRead);
                }
                bytesRead += value.length;
                if (valueToEnqueue) {
                  controller.enqueue(valueToEnqueue);
                  return;
                }
              } else {
                controller.close();
                input.releaseLock();
                return;
              }
            }
          } catch (e) {
            controller.error(e);
          }
        },
        async cancel(reason) {
          await reader.cancel(reason);
        }
      }, { highWaterMark: 0 });
    }
    if (begin < 0 && (end < 0 || end === Infinity)) {
      let lastBytes = [];
      return transform(input, (value) => {
        if (value.length >= -begin) lastBytes = [value];
        else lastBytes.push(value);
      }, () => slice(concat(lastBytes), begin, end));
    }
    if (begin === 0 && end < 0) {
      let lastBytes;
      return transform(input, (value) => {
        const returnValue = lastBytes ? concat([lastBytes, value]) : value;
        if (returnValue.length >= -end) {
          lastBytes = slice(returnValue, end);
          return slice(returnValue, begin, end);
        }
        lastBytes = returnValue;
      });
    }
    console.warn(`stream.slice(input, ${begin}, ${end}) not implemented efficiently.`);
    return fromAsync(async () => slice(await readToEnd(input), begin, end));
  }
  if (input[externalBuffer]) {
    input = concat(input[externalBuffer].concat([input]));
  }
  if (isUint8Array(input)) {
    return input.subarray(begin, end === Infinity ? input.length : end);
  }
  return input.slice(begin, end);
}
async function readToEnd(input, join = concat) {
  if (isArrayStream(input)) {
    return input.readToEnd(join);
  }
  if (isStream(input)) {
    return getReader(input).readToEnd(join);
  }
  return input;
}
async function cancel(input, reason) {
  if (isStream(input)) {
    if (input.cancel) {
      const cancelled = await input.cancel(reason);
      await new Promise((resolve) => setTimeout(resolve));
      return cancelled;
    }
    if (input.destroy) {
      input.destroy(reason);
      await new Promise((resolve) => setTimeout(resolve));
      return reason;
    }
  }
}
function fromAsync(fn) {
  const arrayStream = new ArrayStream();
  (async () => {
    const writer = getWriter(arrayStream);
    try {
      await writer.write(await fn());
      await writer.close();
    } catch (e) {
      await writer.abort(e);
    }
  })();
  return arrayStream;
}
function getReader(input) {
  return new Reader(input);
}
function getWriter(input) {
  return new Writer(input);
}

// vendor/shims/module.js
var createRequire = () => () => {
};

// vendor/src/openpgpjs/src/enums.js
var byValue = /* @__PURE__ */ Symbol("byValue");
var enums_default = {
  /** Maps curve names under various standards to one
   * @see {@link https://wiki.gnupg.org/ECC|ECC - GnuPG wiki}
   * @enum {String}
   * @readonly
   */
  curve: {
    /** NIST P-256 Curve */
    "nistP256": "nistP256",
    /** @deprecated use `nistP256` instead */
    "p256": "nistP256",
    /** NIST P-384 Curve */
    "nistP384": "nistP384",
    /** @deprecated use `nistP384` instead */
    "p384": "nistP384",
    /** NIST P-521 Curve */
    "nistP521": "nistP521",
    /** @deprecated use `nistP521` instead */
    "p521": "nistP521",
    /** SECG SECP256k1 Curve */
    "secp256k1": "secp256k1",
    /** Ed25519 - deprecated by crypto-refresh (replaced by standaone Ed25519 algo) */
    "ed25519Legacy": "ed25519Legacy",
    /** @deprecated use `ed25519Legacy` instead */
    "ed25519": "ed25519Legacy",
    /** Curve25519 - deprecated by crypto-refresh (replaced by standaone X25519 algo) */
    "curve25519Legacy": "curve25519Legacy",
    /** @deprecated use `curve25519Legacy` instead */
    "curve25519": "curve25519Legacy",
    /** BrainpoolP256r1 Curve */
    "brainpoolP256r1": "brainpoolP256r1",
    /** BrainpoolP384r1 Curve */
    "brainpoolP384r1": "brainpoolP384r1",
    /** BrainpoolP512r1 Curve */
    "brainpoolP512r1": "brainpoolP512r1"
  },
  /** A string to key specifier type
   * @enum {Integer}
   * @readonly
   */
  s2k: {
    simple: 0,
    salted: 1,
    iterated: 3,
    argon2: 4,
    gnu: 101
  },
  /** {@link https://tools.ietf.org/html/draft-ietf-openpgp-crypto-refresh-08.html#section-9.1|crypto-refresh RFC, section 9.1}
   * @enum {Integer}
   * @readonly
   */
  publicKey: {
    /** RSA (Encrypt or Sign) [HAC] */
    rsaEncryptSign: 1,
    /** RSA (Encrypt only) [HAC] */
    rsaEncrypt: 2,
    /** RSA (Sign only) [HAC] */
    rsaSign: 3,
    /** Elgamal (Encrypt only) [ELGAMAL] [HAC] */
    elgamal: 16,
    /** DSA (Sign only) [FIPS186] [HAC] */
    dsa: 17,
    /** ECDH (Encrypt only) [RFC6637] */
    ecdh: 18,
    /** ECDSA (Sign only) [RFC6637] */
    ecdsa: 19,
    /** EdDSA (Sign only) - deprecated by crypto-refresh (replaced by `ed25519` identifier below)
     * [{@link https://tools.ietf.org/html/draft-koch-eddsa-for-openpgp-04|Draft RFC}] */
    eddsaLegacy: 22,
    /** Reserved for AEDH */
    aedh: 23,
    /** Reserved for AEDSA */
    aedsa: 24,
    /** X25519 (Encrypt only) */
    x25519: 25,
    /** X448 (Encrypt only) */
    x448: 26,
    /** Ed25519 (Sign only) */
    ed25519: 27,
    /** Ed448 (Sign only) */
    ed448: 28
  },
  /** {@link https://tools.ietf.org/html/rfc4880#section-9.2|RFC4880, section 9.2}
   * @enum {Integer}
   * @readonly
   */
  symmetric: {
    /** Not implemented! */
    idea: 1,
    tripledes: 2,
    cast5: 3,
    blowfish: 4,
    aes128: 7,
    aes192: 8,
    aes256: 9,
    twofish: 10
  },
  /** {@link https://tools.ietf.org/html/rfc4880#section-9.3|RFC4880, section 9.3}
   * @enum {Integer}
   * @readonly
   */
  compression: {
    uncompressed: 0,
    /** RFC1951 */
    zip: 1,
    /** RFC1950 */
    zlib: 2,
    bzip2: 3
  },
  /** {@link https://tools.ietf.org/html/rfc4880#section-9.4|RFC4880, section 9.4}
   * @enum {Integer}
   * @readonly
   */
  hash: {
    md5: 1,
    sha1: 2,
    ripemd: 3,
    sha256: 8,
    sha384: 9,
    sha512: 10,
    sha224: 11,
    sha3_256: 12,
    sha3_512: 14
  },
  /** A list of hash names as accepted by webCrypto functions.
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest|Parameters, algo}
   * @enum {String}
   */
  webHash: {
    "SHA-1": 2,
    "SHA-256": 8,
    "SHA-384": 9,
    "SHA-512": 10
  },
  /** {@link https://www.rfc-editor.org/rfc/rfc9580.html#name-aead-algorithms}
   * @enum {Integer}
   * @readonly
   */
  aead: {
    eax: 1,
    ocb: 2,
    gcm: 3,
    /** @deprecated used by OpenPGP.js v5 for legacy AEAD support; use `gcm` instead for the RFC9580-standardized ID */
    experimentalGCM: 100
    // Private algorithm
  },
  /** A list of packet types and numeric tags associated with them.
   * @enum {Integer}
   * @readonly
   */
  packet: {
    publicKeyEncryptedSessionKey: 1,
    signature: 2,
    symEncryptedSessionKey: 3,
    onePassSignature: 4,
    secretKey: 5,
    publicKey: 6,
    secretSubkey: 7,
    compressedData: 8,
    symmetricallyEncryptedData: 9,
    marker: 10,
    literalData: 11,
    trust: 12,
    userID: 13,
    publicSubkey: 14,
    userAttribute: 17,
    symEncryptedIntegrityProtectedData: 18,
    modificationDetectionCode: 19,
    aeadEncryptedData: 20,
    // see IETF draft: https://tools.ietf.org/html/draft-ford-openpgp-format-00#section-2.1
    padding: 21
  },
  /** Data types in the literal packet
   * @enum {Integer}
   * @readonly
   */
  literal: {
    /** Binary data 'b' */
    binary: "b".charCodeAt(),
    /** Text data 't' */
    text: "t".charCodeAt(),
    /** Utf8 data 'u' */
    utf8: "u".charCodeAt(),
    /** MIME message body part 'm' */
    mime: "m".charCodeAt()
  },
  /** One pass signature packet type
   * @enum {Integer}
   * @readonly
   */
  signature: {
    /** 0x00: Signature of a binary document. */
    binary: 0,
    /** 0x01: Signature of a canonical text document.
     *
     * Canonicalyzing the document by converting line endings. */
    text: 1,
    /** 0x02: Standalone signature.
     *
     * This signature is a signature of only its own subpacket contents.
     * It is calculated identically to a signature over a zero-lengh
     * binary document.  Note that it doesn't make sense to have a V3
     * standalone signature. */
    standalone: 2,
    /** 0x10: Generic certification of a User ID and Public-Key packet.
     *
     * The issuer of this certification does not make any particular
     * assertion as to how well the certifier has checked that the owner
     * of the key is in fact the person described by the User ID. */
    certGeneric: 16,
    /** 0x11: Persona certification of a User ID and Public-Key packet.
     *
     * The issuer of this certification has not done any verification of
     * the claim that the owner of this key is the User ID specified. */
    certPersona: 17,
    /** 0x12: Casual certification of a User ID and Public-Key packet.
     *
     * The issuer of this certification has done some casual
     * verification of the claim of identity. */
    certCasual: 18,
    /** 0x13: Positive certification of a User ID and Public-Key packet.
     *
     * The issuer of this certification has done substantial
     * verification of the claim of identity.
     *
     * Most OpenPGP implementations make their "key signatures" as 0x10
     * certifications.  Some implementations can issue 0x11-0x13
     * certifications, but few differentiate between the types. */
    certPositive: 19,
    /** 0x30: Certification revocation signature
     *
     * This signature revokes an earlier User ID certification signature
     * (signature class 0x10 through 0x13) or direct-key signature
     * (0x1F).  It should be issued by the same key that issued the
     * revoked signature or an authorized revocation key.  The signature
     * is computed over the same data as the certificate that it
     * revokes, and should have a later creation date than that
     * certificate. */
    certRevocation: 48,
    /** 0x18: Subkey Binding Signature
     *
     * This signature is a statement by the top-level signing key that
     * indicates that it owns the subkey.  This signature is calculated
     * directly on the primary key and subkey, and not on any User ID or
     * other packets.  A signature that binds a signing subkey MUST have
     * an Embedded Signature subpacket in this binding signature that
     * contains a 0x19 signature made by the signing subkey on the
     * primary key and subkey. */
    subkeyBinding: 24,
    /** 0x19: Primary Key Binding Signature
     *
     * This signature is a statement by a signing subkey, indicating
     * that it is owned by the primary key and subkey.  This signature
     * is calculated the same way as a 0x18 signature: directly on the
     * primary key and subkey, and not on any User ID or other packets.
     *
     * When a signature is made over a key, the hash data starts with the
     * octet 0x99, followed by a two-octet length of the key, and then body
     * of the key packet.  (Note that this is an old-style packet header for
     * a key packet with two-octet length.)  A subkey binding signature
     * (type 0x18) or primary key binding signature (type 0x19) then hashes
     * the subkey using the same format as the main key (also using 0x99 as
     * the first octet). */
    keyBinding: 25,
    /** 0x1F: Signature directly on a key
     *
     * This signature is calculated directly on a key.  It binds the
     * information in the Signature subpackets to the key, and is
     * appropriate to be used for subpackets that provide information
     * about the key, such as the Revocation Key subpacket.  It is also
     * appropriate for statements that non-self certifiers want to make
     * about the key itself, rather than the binding between a key and a
     * name. */
    key: 31,
    /** 0x20: Key revocation signature
     *
     * The signature is calculated directly on the key being revoked.  A
     * revoked key is not to be used.  Only revocation signatures by the
     * key being revoked, or by an authorized revocation key, should be
     * considered valid revocation signatures.a */
    keyRevocation: 32,
    /** 0x28: Subkey revocation signature
     *
     * The signature is calculated directly on the subkey being revoked.
     * A revoked subkey is not to be used.  Only revocation signatures
     * by the top-level signature key that is bound to this subkey, or
     * by an authorized revocation key, should be considered valid
     * revocation signatures.
     *
     * Key revocation signatures (types 0x20 and 0x28)
     * hash only the key being revoked. */
    subkeyRevocation: 40,
    /** 0x40: Timestamp signature.
     * This signature is only meaningful for the timestamp contained in
     * it. */
    timestamp: 64,
    /** 0x50: Third-Party Confirmation signature.
     *
     * This signature is a signature over some other OpenPGP Signature
     * packet(s).  It is analogous to a notary seal on the signed data.
     * A third-party signature SHOULD include Signature Target
     * subpacket(s) to give easy identification.  Note that we really do
     * mean SHOULD.  There are plausible uses for this (such as a blind
     * party that only sees the signature, not the key or source
     * document) that cannot include a target subpacket. */
    thirdParty: 80
  },
  /** Signature subpacket type
   * @enum {Integer}
   * @readonly
   */
  signatureSubpacket: {
    signatureCreationTime: 2,
    signatureExpirationTime: 3,
    exportableCertification: 4,
    trustSignature: 5,
    regularExpression: 6,
    revocable: 7,
    keyExpirationTime: 9,
    placeholderBackwardsCompatibility: 10,
    preferredSymmetricAlgorithms: 11,
    revocationKey: 12,
    issuerKeyID: 16,
    notationData: 20,
    preferredHashAlgorithms: 21,
    preferredCompressionAlgorithms: 22,
    keyServerPreferences: 23,
    preferredKeyServer: 24,
    primaryUserID: 25,
    policyURI: 26,
    keyFlags: 27,
    signersUserID: 28,
    reasonForRevocation: 29,
    features: 30,
    signatureTarget: 31,
    embeddedSignature: 32,
    issuerFingerprint: 33,
    preferredAEADAlgorithms: 34,
    preferredCipherSuites: 39
  },
  /** Key flags
   * @enum {Integer}
   * @readonly
   */
  keyFlags: {
    /** 0x01 - This key may be used to certify other keys. */
    certifyKeys: 1,
    /** 0x02 - This key may be used to sign data. */
    signData: 2,
    /** 0x04 - This key may be used to encrypt communications. */
    encryptCommunication: 4,
    /** 0x08 - This key may be used to encrypt storage. */
    encryptStorage: 8,
    /** 0x10 - The private component of this key may have been split
     *        by a secret-sharing mechanism. */
    splitPrivateKey: 16,
    /** 0x20 - This key may be used for authentication. */
    authentication: 32,
    /** 0x80 - The private component of this key may be in the
     *        possession of more than one person. */
    sharedPrivateKey: 128
  },
  /** Armor type
   * @enum {Integer}
   * @readonly
   */
  armor: {
    multipartSection: 0,
    multipartLast: 1,
    signed: 2,
    message: 3,
    publicKey: 4,
    privateKey: 5,
    signature: 6
  },
  /** {@link https://tools.ietf.org/html/rfc4880#section-5.2.3.23|RFC4880, section 5.2.3.23}
   * @enum {Integer}
   * @readonly
   */
  reasonForRevocation: {
    /** No reason specified (key revocations or cert revocations) */
    noReason: 0,
    /** Key is superseded (key revocations) */
    keySuperseded: 1,
    /** Key material has been compromised (key revocations) */
    keyCompromised: 2,
    /** Key is retired and no longer used (key revocations) */
    keyRetired: 3,
    /** User ID information is no longer valid (cert revocations) */
    userIDInvalid: 32
  },
  /** {@link https://tools.ietf.org/html/draft-ietf-openpgp-rfc4880bis-04#section-5.2.3.25|RFC4880bis-04, section 5.2.3.25}
   * @enum {Integer}
   * @readonly
   */
  features: {
    /** 0x01 - Modification Detection (packets 18 and 19) */
    modificationDetection: 1,
    /** 0x02 - AEAD Encrypted Data Packet (packet 20) and version 5
     *         Symmetric-Key Encrypted Session Key Packets (packet 3) */
    aead: 2,
    /** 0x04 - Version 5 Public-Key Packet format and corresponding new
      *        fingerprint format */
    v5Keys: 4,
    seipdv2: 8
  },
  /**
   * Asserts validity of given value and converts from string/integer to integer.
   * @param {Object} type target enum type
   * @param {String|Integer} e value to check and/or convert
   * @returns {Integer} enum value if it exists
   * @throws {Error} if the value is invalid
   */
  write: function(type, e) {
    if (typeof e === "number") {
      e = this.read(type, e);
    }
    if (type[e] !== void 0) {
      return type[e];
    }
    throw new Error("Invalid enum value.");
  },
  /**
   * Converts enum integer value to the corresponding string, if it exists.
   * @param {Object} type target enum type
   * @param {Integer} e value to convert
   * @returns {String} name of enum value if it exists
   * @throws {Error} if the value is invalid
   */
  read: function(type, e) {
    if (!type[byValue]) {
      type[byValue] = [];
      Object.entries(type).forEach(([key, value]) => {
        type[byValue][value] = key;
      });
    }
    if (type[byValue][e] !== void 0) {
      return type[byValue][e];
    }
    throw new Error("Invalid enum value.");
  }
};

// vendor/src/openpgpjs/src/config.ts
var config = {
  /**
   * @memberof module:config
   * @property {Integer} preferredHashAlgorithm Default hash algorithm {@link module:enums.hash}
   */
  preferredHashAlgorithm: enums_default.hash.sha512,
  /**
   * @memberof module:config
   * @property {Integer} preferredSymmetricAlgorithm Default encryption cipher {@link module:enums.symmetric}
   */
  preferredSymmetricAlgorithm: enums_default.symmetric.aes256,
  /**
   * @memberof module:config
   * @property {Integer} compression Default compression algorithm {@link module:enums.compression}
   */
  preferredCompressionAlgorithm: enums_default.compression.uncompressed,
  /**
   * Use Authenticated Encryption with Additional Data (AEAD) protection for symmetric encryption.
   * This option is applicable to:
   * - key generation (encryption key preferences),
   * - password-based message encryption, and
   * - private key encryption.
   * In the case of message encryption using public keys, the encryption key preferences are respected instead.
   * Note: not all OpenPGP implementations are compatible with this option.
   * @see {@link https://tools.ietf.org/html/draft-ietf-openpgp-crypto-refresh-10.html|draft-crypto-refresh-10}
   * @memberof module:config
   * @property {Boolean} aeadProtect
   */
  aeadProtect: false,
  /**
   * When reading OpenPGP v4 private keys (e.g. those generated in OpenPGP.js when not setting `config.v5Keys = true`)
   * which were encrypted by OpenPGP.js v5 (or older) using `config.aeadProtect = true`,
   * this option must be set, otherwise key parsing and/or key decryption will fail.
   * Note: only set this flag if you know that the keys are of the legacy type, as non-legacy keys
   * will be processed incorrectly.
   */
  parseAEADEncryptedV4KeysAsLegacy: false,
  /**
   * Default Authenticated Encryption with Additional Data (AEAD) encryption mode
   * Only has an effect when aeadProtect is set to true.
   * @memberof module:config
   * @property {Integer} preferredAEADAlgorithm Default AEAD mode {@link module:enums.aead}
   */
  preferredAEADAlgorithm: enums_default.aead.gcm,
  /**
   * Chunk Size Byte for Authenticated Encryption with Additional Data (AEAD) mode
   * Only has an effect when aeadProtect is set to true.
   * Must be an integer value from 0 to 56.
   * @memberof module:config
   * @property {Integer} aeadChunkSizeByte
   */
  aeadChunkSizeByte: 12,
  /**
   * Use v6 keys.
   * Note: not all OpenPGP implementations are compatible with this option.
   * **FUTURE OPENPGP.JS VERSIONS MAY BREAK COMPATIBILITY WHEN USING THIS OPTION**
   * @memberof module:config
   * @property {Boolean} v6Keys
   */
  v6Keys: false,
  /**
   * Enable parsing v5 keys and v5 signatures (which is different from the AEAD-encrypted SEIPDv2 packet).
   * These are non-standard entities, which in the crypto-refresh have been superseded
   * by v6 keys and v6 signatures, respectively.
   * However, generation of v5 entities was supported behind config flag in OpenPGP.js v5, and some other libraries,
   * hence parsing them might be necessary in some cases.
   * @memberof module:config
   * @property {Boolean} enableParsingV5Entities
   */
  enableParsingV5Entities: false,
  /**
   * S2K (String to Key) type, used for key derivation in the context of secret key encryption
   * and password-encrypted data. Weaker s2k options are not allowed.
   * Note: Argon2 is the strongest option but not all OpenPGP implementations are compatible with it
   * (pending standardisation).
   * @memberof module:config
   * @property {enums.s2k.argon2|enums.s2k.iterated} s2kType {@link module:enums.s2k}
   */
  s2kType: enums_default.s2k.iterated,
  /**
   * {@link https://tools.ietf.org/html/rfc4880#section-3.7.1.3| RFC4880 3.7.1.3}:
   * Iteration Count Byte for Iterated and Salted S2K (String to Key).
   * Only relevant if `config.s2kType` is set to `enums.s2k.iterated`.
   * Note: this is the exponent value, not the final number of iterations (refer to specs for more details).
   * @memberof module:config
   * @property {Integer} s2kIterationCountByte
   */
  s2kIterationCountByte: 224,
  /**
   * {@link https://tools.ietf.org/html/draft-ietf-openpgp-crypto-refresh-07.html#section-3.7.1.4| draft-crypto-refresh 3.7.1.4}:
   * Argon2 parameters for S2K (String to Key).
   * Only relevant if `config.s2kType` is set to `enums.s2k.argon2`.
   * Default settings correspond to the second recommendation from RFC9106 ("uniformly safe option"),
   * to ensure compatibility with memory-constrained environments.
   * For more details on the choice of parameters, see https://tools.ietf.org/html/rfc9106#section-4.
   * @memberof module:config
   * @property {Object} params
   * @property {Integer} params.passes - number of iterations t
   * @property {Integer} params.parallelism - degree of parallelism p
   * @property {Integer} params.memoryExponent - one-octet exponent indicating the memory size, which will be: 2**memoryExponent kibibytes.
   */
  s2kArgon2Params: {
    passes: 3,
    parallelism: 4,
    // lanes
    memoryExponent: 16
    // 64 MiB of RAM
  },
  /**
   * Max memory exponent allowed for Argon2 memory allocation (e.g. `maxArgon2MemoryExponent: 20` corresponds
   * to a memory limit of 2**20 KiB = 1GiB).
   * This limit is applied both on encryption (if `config.s2kType` is set to `enums.s2k.argon2`)
   * and decryption.
   * If the input memory exponent exceeds this value, the library will not attempt the argon2 key derivation
   * and instead directly throw an `Argon2OutOfMemoryError` error.
   * NB: on encryption, if `s2kArgon2Params.memoryExponent` is larger than `maxArgon2MemoryExponent`,
   * the operation will fail.
   */
  maxArgon2MemoryExponent: 30,
  /**
   * Allow decryption of messages without integrity protection.
   * This is an **insecure** setting:
   *  - message modifications cannot be detected, thus processing the decrypted data is potentially unsafe.
   *  - it enables downgrade attacks against integrity-protected messages.
   * @memberof module:config
   * @property {Boolean} allowUnauthenticatedMessages
   */
  allowUnauthenticatedMessages: false,
  /**
   * Allow streaming unauthenticated data before its integrity has been checked. This would allow the application to
   * process large streams while limiting memory usage by releasing the decrypted chunks as soon as possible
   * and deferring checking their integrity until the decrypted stream has been read in full.
   *
   * This setting is **insecure** if the encrypted data has been corrupted by a malicious entity:
   * - if the partially decrypted message is processed further or displayed to the user, it opens up the possibility of attacks such as EFAIL
   *    (see https://efail.de/).
   * - an attacker with access to traces or timing info of internal processing errors could learn some info about the data.
   *
   * NB: this setting does not apply to AEAD-encrypted data, where the AEAD data chunk is never released until integrity is confirmed.
   * @memberof module:config
   * @property {Boolean} allowUnauthenticatedStream
   */
  allowUnauthenticatedStream: false,
  /**
   * Minimum RSA key size allowed for key generation and message signing, verification and encryption.
   * The default is 2047 since due to a bug, previous versions of OpenPGP.js could generate 2047-bit keys instead of 2048-bit ones.
   * @memberof module:config
   * @property {Number} minRSABits
   */
  minRSABits: 2047,
  /**
   * Work-around for rare GPG decryption bug when encrypting with multiple passwords.
   * **Slower and slightly less secure**
   * @memberof module:config
   * @property {Boolean} passwordCollisionCheck
   */
  passwordCollisionCheck: false,
  /**
   * Allow decryption using RSA keys without `encrypt` flag.
   * This setting is potentially insecure, but it is needed to get around an old openpgpjs bug
   * where key flags were ignored when selecting a key for encryption.
   * @memberof module:config
   * @property {Boolean} allowInsecureDecryptionWithSigningKeys
   */
  allowInsecureDecryptionWithSigningKeys: false,
  /**
   * Allow verification of message signatures with keys whose validity at the time of signing cannot be determined.
   * Instead, a verification key will also be consider valid as long as it is valid at the current time.
   * This setting is potentially insecure, but it is needed to verify messages signed with keys that were later reformatted,
   * and have self-signature's creation date that does not match the primary key creation date.
   * @memberof module:config
   * @property {Boolean} allowInsecureDecryptionWithSigningKeys
   */
  allowInsecureVerificationWithReformattedKeys: false,
  /**
   * Allow using keys that do not have any key flags set.
   * Key flags are needed to restrict key usage to specific purposes: for instance, a signing key could only be allowed to certify other keys, and not sign messages
   * (see https://www.ietf.org/archive/id/draft-ietf-openpgp-crypto-refresh-10.html#section-5.2.3.29).
   * Some older keys do not declare any key flags, which means they are not allowed to be used for any operation.
   * This setting allows using such keys for any operation for which they are compatible, based on their public key algorithm.
   */
  allowMissingKeyFlags: false,
  /**
   * Enable constant-time decryption of RSA- and ElGamal-encrypted session keys, to hinder Bleichenbacher-like attacks (https://link.springer.com/chapter/10.1007/BFb0055716).
   * This setting has measurable performance impact and it is only helpful in application scenarios where both of the following conditions apply:
   * - new/incoming messages are automatically decrypted (without user interaction);
   * - an attacker can determine how long it takes to decrypt each message (e.g. due to decryption errors being logged remotely).
   * See also `constantTimePKCS1DecryptionSupportedSymmetricAlgorithms`.
   * @memberof module:config
   * @property {Boolean} constantTimePKCS1Decryption
   */
  constantTimePKCS1Decryption: false,
  /**
   * This setting is only meaningful if `constantTimePKCS1Decryption` is enabled.
   * Decryption of RSA- and ElGamal-encrypted session keys of symmetric algorithms different from the ones specified here will fail.
   * However, the more algorithms are added, the slower the decryption procedure becomes.
   * @memberof module:config
   * @property {Set<Integer>} constantTimePKCS1DecryptionSupportedSymmetricAlgorithms {@link module:enums.symmetric}
   */
  constantTimePKCS1DecryptionSupportedSymmetricAlgorithms: /* @__PURE__ */ new Set([enums_default.symmetric.aes128, enums_default.symmetric.aes192, enums_default.symmetric.aes256]),
  /**
   * @memberof module:config
   * @property {Boolean} ignoreUnsupportedPackets Ignore unsupported/unrecognizable packets on parsing instead of throwing an error
   */
  ignoreUnsupportedPackets: true,
  /**
   * @memberof module:config
   * @property {Boolean} ignoreMalformedPackets Ignore malformed packets on parsing instead of throwing an error
   */
  ignoreMalformedPackets: false,
  /**
   * @memberof module:config
   * @property {Boolean} enforceGrammar whether parsed OpenPGP messages must comform to the OpenPGP grammar
   *    defined in https://www.rfc-editor.org/rfc/rfc9580.html#name-openpgp-messages .
   */
  enforceGrammar: true,
  /**
   * Parsing of packets is normally restricted to a predefined set of packets. For example a Sym. Encrypted Integrity Protected Data Packet can only
   * contain a certain set of packets including LiteralDataPacket. With this setting we can allow additional packets, which is probably not advisable
   * as a global config setting, but can be used for specific function calls (e.g. decrypt method of Message).
   * @memberof module:config
   * @property {Array} additionalAllowedPackets Allow additional packets on parsing. Defined as array of packet classes, e.g. [PublicKeyPacket]
   */
  additionalAllowedPackets: [],
  /**
   * @memberof module:config
   * @property {Boolean} showVersion Whether to include {@link module:config/config.versionString} in armored messages
   */
  showVersion: false,
  /**
   * @memberof module:config
   * @property {Boolean} showComment Whether to include {@link module:config/config.commentString} in armored messages
   */
  showComment: false,
  /**
   * @memberof module:config
   * @property {String} versionString A version string to be included in armored messages
   */
  versionString: "OpenPGP.js 6.3.2",
  /**
   * @memberof module:config
   * @property {String} commentString A comment string to be included in armored messages
   */
  commentString: "https://openpgpjs.org",
  /**
   * Max userID string length (used for parsing)
   * @memberof module:config
   * @property {Integer} maxUserIDLength
   */
  maxUserIDLength: 1024 * 5,
  /**
   * Maximum size of decompressed messages
   * When decompressing a larger message, OpenPGP.js will throw an error.
   * @memberof module:config
   * @property {Integer} maxDecompressedMessageSize
   */
  maxDecompressedMessageSize: Infinity,
  /**
   * Contains notatations that are considered "known". Known notations do not trigger
   * validation error when the notation is marked as critical.
   * @memberof module:config
   * @property {Array} knownNotations
   */
  knownNotations: [],
  /**
   * If true, a salt notation is used to randomize signatures generated by v4 and v5 keys (v6 signatures are always non-deterministic, by design).
   * This protects EdDSA signatures from potentially leaking the secret key in case of faults (i.e. bitflips) which, in principle, could occur
   * during the signing computation. It is added to signatures of any algo for simplicity, and as it may also serve as protection in case of
   * weaknesses in the hash algo, potentially hindering e.g. some chosen-prefix attacks.
   * NOTE: the notation is interoperable, but will reveal that the signature has been generated using OpenPGP.js, which may not be desirable in some cases.
   */
  nonDeterministicSignaturesViaNotation: true,
  /**
   * Whether to use the the noble-curves library for curves (other than Curve25519) that are not supported by the available native crypto API.
   * When false, certain standard curves will not be supported (depending on the platform).
   * @memberof module:config
   * @property {Boolean} useEllipticFallback
   */
  useEllipticFallback: true,
  /**
   * Reject insecure hash algorithms
   * @memberof module:config
   * @property {Set<Integer>} rejectHashAlgorithms {@link module:enums.hash}
   */
  rejectHashAlgorithms: /* @__PURE__ */ new Set([enums_default.hash.md5, enums_default.hash.ripemd]),
  /**
   * Reject insecure message hash algorithms
   * @memberof module:config
   * @property {Set<Integer>} rejectMessageHashAlgorithms {@link module:enums.hash}
   */
  rejectMessageHashAlgorithms: /* @__PURE__ */ new Set([enums_default.hash.md5, enums_default.hash.ripemd, enums_default.hash.sha1]),
  /**
   * Reject insecure public key algorithms for key generation and message encryption, signing or verification
   * @memberof module:config
   * @property {Set<Integer>} rejectPublicKeyAlgorithms {@link module:enums.publicKey}
   */
  rejectPublicKeyAlgorithms: /* @__PURE__ */ new Set([enums_default.publicKey.elgamal, enums_default.publicKey.dsa]),
  /**
   * Reject non-standard curves for key generation, message encryption, signing or verification
   * @memberof module:config
   * @property {Set<String>} rejectCurves {@link module:enums.curve}
   */
  rejectCurves: /* @__PURE__ */ new Set([enums_default.curve.secp256k1])
};
var config_default = config;

// vendor/src/openpgpjs/src/util.js
var debugMode = (() => {
  try {
    return true;
  } catch {
  }
  return false;
})();
var util = {
  isString: function(data) {
    return typeof data === "string" || data instanceof String;
  },
  nodeRequire: createRequire(import.meta.url),
  isArray: function(data) {
    return data instanceof Array;
  },
  isUint8Array,
  isStream,
  /**
   * Load noble-curves lib on demand and return the requested curve function
   * @param {enums.publicKey} publicKeyAlgo
   * @param {enums.curve} [curveName] - for algos supporting different curves (e.g. ECDSA)
   * @returns curve implementation
   * @throws on unrecognized curve, or curve not implemented by noble-curve
   */
  getNobleCurve: async (publicKeyAlgo, curveName) => {
    if (!config_default.useEllipticFallback) {
      throw new Error("This curve is only supported in the full build of OpenPGP.js");
    }
    const { nobleCurves: nobleCurves2 } = await Promise.resolve().then(() => (init_noble_curves(), noble_curves_exports));
    switch (publicKeyAlgo) {
      case enums_default.publicKey.ecdh:
      case enums_default.publicKey.ecdsa: {
        const curve = nobleCurves2.get(curveName);
        if (!curve) throw new Error("Unsupported curve");
        return curve;
      }
      case enums_default.publicKey.x448:
        return nobleCurves2.get("x448");
      case enums_default.publicKey.ed448:
        return nobleCurves2.get("ed448");
      default:
        throw new Error("Unsupported curve");
    }
  },
  readNumber: function(bytes) {
    let n = 0;
    for (let i = 0; i < bytes.length; i++) {
      n += 256 ** i * bytes[bytes.length - 1 - i];
    }
    return n;
  },
  writeNumber: function(n, bytes) {
    const b = new Uint8Array(bytes);
    for (let i = 0; i < bytes; i++) {
      b[i] = n >> 8 * (bytes - i - 1) & 255;
    }
    return b;
  },
  readDate: function(bytes) {
    const n = util.readNumber(bytes);
    const d = new Date(n * 1e3);
    return d;
  },
  writeDate: function(time) {
    const numeric = Math.floor(time.getTime() / 1e3);
    return util.writeNumber(numeric, 4);
  },
  normalizeDate: function(time = Date.now()) {
    return time === null || time === Infinity ? time : new Date(Math.floor(+time / 1e3) * 1e3);
  },
  /**
   * Read one MPI from bytes in input
   * @param {Uint8Array} bytes - Input data to parse
   * @returns {Uint8Array} Parsed MPI.
   */
  readMPI: function(bytes) {
    const bits2 = bytes[0] << 8 | bytes[1];
    const bytelen = bits2 + 7 >>> 3;
    return util.readExactSubarray(bytes, 2, 2 + bytelen);
  },
  /**
   * Read exactly `end - start` bytes from input.
   * This is a stricter version of `.subarray`.
   * @param {Uint8Array} input - Input data to parse
   * @returns {Uint8Array} subarray of size always equal to `end - start`
   * @throws if the input array is too short.
   */
  readExactSubarray: function(input, start, end) {
    if (input.length < end) {
      throw new Error("Input array too short");
    }
    return input.subarray(start, end);
  },
  /**
   * Left-pad Uint8Array to length by adding 0x0 bytes
   * @param {Uint8Array} bytes - Data to pad
   * @param {Number} length - Padded length
   * @returns {Uint8Array} Padded bytes.
   */
  leftPad(bytes, length) {
    if (bytes.length > length) {
      throw new Error("Input array too long");
    }
    const padded = new Uint8Array(length);
    const offset = length - bytes.length;
    padded.set(bytes, offset);
    return padded;
  },
  /**
   * Convert a Uint8Array to an MPI-formatted Uint8Array.
   * @param {Uint8Array} bin - An array of 8-bit integers to convert
   * @returns {Uint8Array} MPI-formatted Uint8Array.
   */
  uint8ArrayToMPI: function(bin) {
    const bitSize = util.uint8ArrayBitLength(bin);
    if (bitSize === 0) {
      throw new Error("Zero MPI");
    }
    const stripped = bin.subarray(bin.length - Math.ceil(bitSize / 8));
    const prefix = new Uint8Array([(bitSize & 65280) >> 8, bitSize & 255]);
    return util.concatUint8Array([prefix, stripped]);
  },
  /**
   * Return bit length of the input data
   * @param {Uint8Array} bin input data (big endian)
   * @returns bit length
   */
  uint8ArrayBitLength: function(bin) {
    let i;
    for (i = 0; i < bin.length; i++) if (bin[i] !== 0) break;
    if (i === bin.length) {
      return 0;
    }
    const stripped = bin.subarray(i);
    return (stripped.length - 1) * 8 + util.nbits(stripped[0]);
  },
  /**
   * Convert a hex string to an array of 8-bit integers
   * @param {String} hex - A hex string to convert
   * @returns {Uint8Array} An array of 8-bit integers.
   */
  hexToUint8Array: function(hex) {
    const result = new Uint8Array(hex.length >> 1);
    for (let k = 0; k < hex.length >> 1; k++) {
      result[k] = parseInt(hex.substr(k << 1, 2), 16);
    }
    return result;
  },
  /**
   * Convert an array of 8-bit integers to a hex string
   * @param {Uint8Array} bytes - Array of 8-bit integers to convert
   * @returns {String} Hexadecimal representation of the array.
   */
  uint8ArrayToHex: function(bytes) {
    const hexAlphabet = "0123456789abcdef";
    let s = "";
    bytes.forEach((v) => {
      s += hexAlphabet[v >> 4] + hexAlphabet[v & 15];
    });
    return s;
  },
  /**
   * Convert a string to an array of 8-bit integers
   * @param {String} str - String to convert
   * @returns {Uint8Array} An array of 8-bit integers.
   */
  stringToUint8Array: function(str) {
    return transform(str, (str2) => {
      if (!util.isString(str2)) {
        throw new Error("stringToUint8Array: Data must be in the form of a string");
      }
      const result = new Uint8Array(str2.length);
      for (let i = 0; i < str2.length; i++) {
        result[i] = str2.charCodeAt(i);
      }
      return result;
    });
  },
  /**
   * Convert an array of 8-bit integers to a string
   * @param {Uint8Array} bytes - An array of 8-bit integers to convert
   * @returns {String} String representation of the array.
   */
  uint8ArrayToString: function(bytes) {
    bytes = new Uint8Array(bytes);
    const result = [];
    const bs = 1 << 14;
    const j = bytes.length;
    for (let i = 0; i < j; i += bs) {
      result.push(String.fromCharCode.apply(String, bytes.subarray(i, i + bs < j ? i + bs : j)));
    }
    return result.join("");
  },
  /**
   * Convert a native javascript string to a Uint8Array of utf8 bytes
   * @param {String|ReadableStream} str - The string to convert
   * @returns {Uint8Array|ReadableStream} A valid squence of utf8 bytes.
   */
  encodeUTF8: function(str) {
    const encoder = new TextEncoder("utf-8");
    function process2(value, lastChunk = false) {
      return encoder.encode(value, { stream: !lastChunk });
    }
    return transform(str, process2, () => process2("", true));
  },
  /**
   * Convert a Uint8Array of utf8 bytes to a native javascript string
   * @param {Uint8Array|ReadableStream} utf8 - A valid squence of utf8 bytes
   * @returns {String|ReadableStream} A native javascript string.
   */
  decodeUTF8: function(utf8) {
    const decoder = new TextDecoder("utf-8");
    function process2(value, lastChunk = false) {
      return decoder.decode(value, { stream: !lastChunk });
    }
    return transform(utf8, process2, () => process2(new Uint8Array(), true));
  },
  /**
   * Concat a list of Uint8Arrays, Strings or Streams
   * The caller must not mix Uint8Arrays with Strings, but may mix Streams with non-Streams.
   * @param {Array<Uint8Array|String|ReadableStream>} Array - Of Uint8Arrays/Strings/Streams to concatenate
   * @returns {Uint8Array|String|ReadableStream} Concatenated array.
   */
  concat,
  /**
   * Concat Uint8Arrays
   * @param {Array<Uint8Array>} Array - Of Uint8Arrays to concatenate
   * @returns {Uint8Array} Concatenated array.
   */
  concatUint8Array,
  /**
   * Check Uint8Array equality
   * @param {Uint8Array} array1 - First array
   * @param {Uint8Array} array2 - Second array
   * @returns {Boolean} Equality.
   */
  equalsUint8Array: function(array1, array2) {
    if (!util.isUint8Array(array1) || !util.isUint8Array(array2)) {
      throw new Error("Data must be in the form of a Uint8Array");
    }
    if (array1.length !== array2.length) {
      return false;
    }
    for (let i = 0; i < array1.length; i++) {
      if (array1[i] !== array2[i]) {
        return false;
      }
    }
    return true;
  },
  /**
   * Same as Array.findLastIndex, which is not supported on Safari 14 .
   * @param {Array} arr
   * @param {function(element, index, arr): boolean} findFn
   * @return index of last element matching `findFn`, -1 if not found
   */
  findLastIndex: function(arr, findFn) {
    for (let i = arr.length; i >= 0; i--) {
      if (findFn(arr[i], i, arr)) {
        return i;
      }
    }
    return -1;
  },
  /**
   * Check Uint8Array equality in algorithmic constant time
   * @param {Uint8Array} array1 - First array
   * @param {Uint8Array} array2 - Second array
   * @returns {Boolean} Equality
   * @throws on input arrays of different lengths
   */
  timingSafeEqualsUint8Array: function(array1, array2) {
    if (array1.length !== array2.length) {
      throw new Error("Equal input arrays expected");
    }
    let equal = 1;
    for (let i = 0; i < array1.length; i++) {
      equal &= array1[i] === array2[i];
    }
    return !!equal;
  },
  /**
   * Calculates a 16bit sum of a Uint8Array by adding each character
   * codes modulus 65535
   * @param {Uint8Array} Uint8Array - To create a sum of
   * @returns {Uint8Array} 2 bytes containing the sum of all charcodes % 65535.
   */
  writeChecksum: function(text) {
    let s = 0;
    for (let i = 0; i < text.length; i++) {
      s = s + text[i] & 65535;
    }
    return util.writeNumber(s, 2);
  },
  /**
   * Helper function to print a debug message. Debug
   * messages are only printed if
   * @param {String} str - String of the debug message
   */
  printDebug: function(str) {
    if (debugMode) {
      console.log("[OpenPGP.js debug]", str);
    }
  },
  /**
   * Helper function to print a debug error. Debug
   * messages are only printed if
   * @param {String} str - String of the debug message
   */
  printDebugError: function(error) {
    if (debugMode) {
      console.error("[OpenPGP.js debug]", error);
    }
  },
  // returns bit length of the integer x
  nbits: function(x) {
    let r = 1;
    let t = x >>> 16;
    if (t !== 0) {
      x = t;
      r += 16;
    }
    t = x >> 8;
    if (t !== 0) {
      x = t;
      r += 8;
    }
    t = x >> 4;
    if (t !== 0) {
      x = t;
      r += 4;
    }
    t = x >> 2;
    if (t !== 0) {
      x = t;
      r += 2;
    }
    t = x >> 1;
    if (t !== 0) {
      x = t;
      r += 1;
    }
    return r;
  },
  /**
   * If S[1] == 0, then double(S) == (S[2..128] || 0);
   * otherwise, double(S) == (S[2..128] || 0) xor
   * (zeros(120) || 10000111).
   *
   * Both OCB and EAX (through CMAC) require this function to be constant-time.
   *
   * @param {Uint8Array} data
   */
  double: function(data) {
    const doubleVar = new Uint8Array(data.length);
    const last = data.length - 1;
    for (let i = 0; i < last; i++) {
      doubleVar[i] = data[i] << 1 ^ data[i + 1] >> 7;
    }
    doubleVar[last] = data[last] << 1 ^ (data[0] >> 7) * 135;
    return doubleVar;
  },
  /**
   * Shift a Uint8Array to the right by n bits
   * @param {Uint8Array} array - The array to shift
   * @param {Integer} bits - Amount of bits to shift (MUST be smaller
   * than 8)
   * @returns {String} Resulting array.
   */
  shiftRight: function(array, bits2) {
    if (bits2) {
      for (let i = array.length - 1; i >= 0; i--) {
        array[i] >>= bits2;
        if (i > 0) {
          array[i] |= array[i - 1] << 8 - bits2;
        }
      }
    }
    return array;
  },
  /**
   * Get native Web Cryptography API.
   * @returns {Object} The SubtleCrypto API
   * @throws if the API is not available
   */
  getWebCrypto: function() {
    const globalWebCrypto = typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle;
    const webCrypto10 = globalWebCrypto || this.getNodeCrypto()?.webcrypto.subtle;
    if (!webCrypto10) {
      throw new Error("The WebCrypto API is not available");
    }
    return webCrypto10;
  },
  /** @typedef {import('node:crypto')} NodeCrypto */
  /**
   * Get native Node.js crypto api.
   * @returns {NodeCrypto} The crypto module or 'undefined'.
   */
  getNodeCrypto: function() {
    return this.nodeRequire("crypto");
  },
  getNodeZlib: function() {
    return this.nodeRequire("zlib");
  },
  /**
   * Get native Node.js Buffer constructor. This should be used since
   * Buffer is not available under browserify.
   * @returns {Function} The Buffer constructor or 'undefined'.
   */
  getNodeBuffer: function() {
    return (this.nodeRequire("buffer") || {}).Buffer;
  },
  getHardwareConcurrency: function() {
    if (typeof navigator !== "undefined") {
      return navigator.hardwareConcurrency || 1;
    }
    const os = this.nodeRequire("os");
    return os.cpus().length;
  },
  /**
   * Test email format to ensure basic compliance:
   * - must include a single @
   * - no control or space unicode chars allowed
   * - no backslash and square brackets (as the latter can mess with the userID parsing)
   * - cannot end with a punctuation char
   * These checks are not meant to be exhaustive; applications are strongly encouraged to implement stricter validation,
   * e.g. based on the W3C HTML spec (https://html.spec.whatwg.org/multipage/input.html#email-state-(type=email)).
   */
  isEmailAddress: function(data) {
    if (!util.isString(data)) {
      return false;
    }
    const re = /^[^\p{C}\p{Z}@<>\\]+@[^\p{C}\p{Z}@<>\\]+[^\p{C}\p{Z}\p{P}]$/u;
    return re.test(data);
  },
  /**
   * Normalize line endings to <CR><LF>
   * Support any encoding where CR=0x0D, LF=0x0A
   */
  canonicalizeEOL: function(data) {
    const CR = 13;
    const LF = 10;
    let carryOverCR = false;
    return transform(data, (bytes) => {
      if (carryOverCR) {
        bytes = util.concatUint8Array([new Uint8Array([CR]), bytes]);
      }
      if (bytes[bytes.length - 1] === CR) {
        carryOverCR = true;
        bytes = bytes.subarray(0, -1);
      } else {
        carryOverCR = false;
      }
      let index;
      const indices = [];
      for (let i = 0; ; i = index) {
        index = bytes.indexOf(LF, i) + 1;
        if (index) {
          if (bytes[index - 2] !== CR) indices.push(index);
        } else {
          break;
        }
      }
      if (!indices.length) {
        return bytes;
      }
      const normalized = new Uint8Array(bytes.length + indices.length);
      let j = 0;
      for (let i = 0; i < indices.length; i++) {
        const sub = bytes.subarray(indices[i - 1] || 0, indices[i]);
        normalized.set(sub, j);
        j += sub.length;
        normalized[j - 1] = CR;
        normalized[j] = LF;
        j++;
      }
      normalized.set(bytes.subarray(indices[indices.length - 1] || 0), j);
      return normalized;
    }, () => carryOverCR ? new Uint8Array([CR]) : void 0);
  },
  /**
   * Convert line endings from canonicalized <CR><LF> to native <LF>
   * Support any encoding where CR=0x0D, LF=0x0A
   */
  nativeEOL: function(data) {
    const CR = 13;
    const LF = 10;
    let carryOverCR = false;
    return transform(data, (bytes) => {
      if (carryOverCR && bytes[0] !== LF) {
        bytes = util.concatUint8Array([new Uint8Array([CR]), bytes]);
      } else {
        bytes = new Uint8Array(bytes);
      }
      if (bytes[bytes.length - 1] === CR) {
        carryOverCR = true;
        bytes = bytes.subarray(0, -1);
      } else {
        carryOverCR = false;
      }
      let index;
      let j = 0;
      for (let i = 0; i !== bytes.length; i = index) {
        index = bytes.indexOf(CR, i) + 1;
        if (!index) index = bytes.length;
        const last = index - (bytes[index] === LF ? 1 : 0);
        if (i) bytes.copyWithin(j, i, last);
        j += last - i;
      }
      return bytes.subarray(0, j);
    }, () => carryOverCR ? new Uint8Array([CR]) : void 0);
  },
  /**
   * Remove trailing spaces, carriage returns and tabs from each line
   */
  removeTrailingSpaces: function(text) {
    return text.split("\n").map((line) => {
      let i = line.length - 1;
      for (; i >= 0 && (line[i] === " " || line[i] === "	" || line[i] === "\r"); i--) ;
      return line.substr(0, i + 1);
    }).join("\n");
  },
  wrapError: function(error, cause) {
    if (!cause) {
      if (error instanceof Error) {
        return error;
      }
      return new Error(error);
    }
    if (error instanceof Error) {
      try {
        error.message += ": " + cause.message;
        error.cause = cause;
      } catch {
      }
      return error;
    }
    return new Error(error + ": " + cause.message, { cause });
  },
  /**
   * Map allowed packet tags to corresponding classes
   * Meant to be used to format `allowedPacket` for Packetlist.read
   * @param {Array<Object>} allowedClasses
   * @returns {Object} map from enum.packet to corresponding *Packet class
   */
  constructAllowedPackets: function(allowedClasses) {
    const map = {};
    allowedClasses.forEach((PacketClass) => {
      if (!PacketClass.tag) {
        throw new Error("Invalid input: expected a packet class");
      }
      map[PacketClass.tag] = PacketClass;
    });
    return map;
  },
  /**
   * Return a Promise that will resolve as soon as one of the promises in input resolves
   * or will reject if all input promises all rejected
   * (similar to Promise.any, but with slightly different error handling)
   * @param {Array<Promise>} promises
   * @return {Promise<Any>} Promise resolving to the result of the fastest fulfilled promise
   *                          or rejected with the Error of the last resolved Promise (if all promises are rejected)
   */
  anyPromise: function(promises) {
    return new Promise((resolve, reject) => {
      let exception;
      void Promise.all(promises.map(async (promise) => {
        try {
          resolve(await promise);
        } catch (e) {
          exception = e;
        }
      })).then(() => {
        reject(exception);
      });
    });
  },
  /**
   * Return either `a` or `b` based on `cond`, in algorithmic constant time.
   * @param {Boolean} cond
   * @param {Uint8Array} a
   * @param {Uint8Array} b
   * @returns `a` if `cond` is true, `b` otherwise
   */
  selectUint8Array: function(cond, a, b) {
    const length = Math.max(a.length, b.length);
    const result = new Uint8Array(length);
    let end = 0;
    for (let i = 0; i < result.length; i++) {
      result[i] = a[i] & 256 - cond | b[i] & 255 + cond;
      end += cond & i < a.length | 1 - cond & i < b.length;
    }
    return result.subarray(0, end);
  },
  /**
   * Return either `a` or `b` based on `cond`, in algorithmic constant time.
   * NB: it only supports `a, b` with values between 0-255.
   * @param {Boolean} cond
   * @param {Uint8} a
   * @param {Uint8} b
   * @returns `a` if `cond` is true, `b` otherwise
   */
  selectUint8: function(cond, a, b) {
    return a & 256 - cond | b & 255 + cond;
  },
  /**
   * @param {module:enums.symmetric} cipherAlgo
   */
  isAES: function(cipherAlgo) {
    return cipherAlgo === enums_default.symmetric.aes128 || cipherAlgo === enums_default.symmetric.aes192 || cipherAlgo === enums_default.symmetric.aes256;
  }
};
var util_default = util;

// vendor/src/openpgpjs/src/encoding/base64.js
var Buffer2 = util_default.getNodeBuffer();
var encodeChunk;
var decodeChunk;
if (Buffer2) {
  encodeChunk = (buf) => Buffer2.from(buf).toString("base64");
  decodeChunk = (str) => {
    const b = Buffer2.from(str, "base64");
    return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  };
} else {
  encodeChunk = (buf) => btoa(util_default.uint8ArrayToString(buf));
  decodeChunk = (str) => util_default.stringToUint8Array(atob(str));
}
function encode(data) {
  let buf = new Uint8Array();
  return transform(data, (value) => {
    buf = util_default.concatUint8Array([buf, value]);
    const r = [];
    const bytesPerLine = 45;
    const lines = Math.floor(buf.length / bytesPerLine);
    const bytes = lines * bytesPerLine;
    const encoded = encodeChunk(buf.subarray(0, bytes));
    for (let i = 0; i < lines; i++) {
      r.push(encoded.substr(i * 60, 60));
      r.push("\n");
    }
    buf = buf.subarray(bytes);
    return r.join("");
  }, () => buf.length ? encodeChunk(buf) + "\n" : "");
}
function decode(data) {
  let buf = "";
  return transform(data, (value) => {
    buf += value;
    let spaces = 0;
    const spacechars = [" ", "	", "\r", "\n"];
    for (let i = 0; i < spacechars.length; i++) {
      const spacechar = spacechars[i];
      for (let pos = buf.indexOf(spacechar); pos !== -1; pos = buf.indexOf(spacechar, pos + 1)) {
        spaces++;
      }
    }
    let length = buf.length;
    for (; length > 0 && (length - spaces) % 4 !== 0; length--) {
      if (spacechars.includes(buf[length])) spaces--;
    }
    const decoded = decodeChunk(buf.substr(0, length));
    buf = buf.substr(length);
    return decoded;
  }, () => decodeChunk(buf));
}
function b64ToUint8Array(base64) {
  return decode(base64.replace(/-/g, "+").replace(/_/g, "/"));
}
function uint8ArrayToB64(bytes, url) {
  let encoded = encode(bytes).replace(/[\r\n]/g, "");
  if (url) {
    encoded = encoded.replace(/[+]/g, "-").replace(/[/]/g, "_").replace(/[=]/g, "");
  }
  return encoded;
}

// vendor/src/openpgpjs/src/encoding/armor.js
function getType(text) {
  const reHeader = /^-----BEGIN PGP (MESSAGE, PART \d+\/\d+|MESSAGE, PART \d+|SIGNED MESSAGE|MESSAGE|PUBLIC KEY BLOCK|PRIVATE KEY BLOCK|SIGNATURE)-----$/m;
  const header = text.match(reHeader);
  if (!header) {
    throw new Error("Unknown ASCII armor type");
  }
  if (/MESSAGE, PART \d+\/\d+/.test(header[1])) {
    return enums_default.armor.multipartSection;
  }
  if (/MESSAGE, PART \d+/.test(header[1])) {
    return enums_default.armor.multipartLast;
  }
  if (/SIGNED MESSAGE/.test(header[1])) {
    return enums_default.armor.signed;
  }
  if (/MESSAGE/.test(header[1])) {
    return enums_default.armor.message;
  }
  if (/PUBLIC KEY BLOCK/.test(header[1])) {
    return enums_default.armor.publicKey;
  }
  if (/PRIVATE KEY BLOCK/.test(header[1])) {
    return enums_default.armor.privateKey;
  }
  if (/SIGNATURE/.test(header[1])) {
    return enums_default.armor.signature;
  }
}
function addheader(customComment, config2) {
  let result = "";
  if (config2.showVersion) {
    result += "Version: " + config2.versionString + "\n";
  }
  if (config2.showComment) {
    result += "Comment: " + config2.commentString + "\n";
  }
  if (customComment) {
    result += "Comment: " + customComment + "\n";
  }
  result += "\n";
  return result;
}
function getCheckSum(data) {
  const crc = createcrc24(data);
  return encode(crc);
}
var crc_table = [
  new Array(255),
  new Array(255),
  new Array(255),
  new Array(255)
];
for (let i = 0; i <= 255; i++) {
  let crc = i << 16;
  for (let j = 0; j < 8; j++) {
    crc = crc << 1 ^ ((crc & 8388608) !== 0 ? 8801531 : 0);
  }
  crc_table[0][i] = (crc & 16711680) >> 16 | crc & 65280 | (crc & 255) << 16;
}
for (let i = 0; i <= 255; i++) {
  crc_table[1][i] = crc_table[0][i] >> 8 ^ crc_table[0][crc_table[0][i] & 255];
}
for (let i = 0; i <= 255; i++) {
  crc_table[2][i] = crc_table[1][i] >> 8 ^ crc_table[0][crc_table[1][i] & 255];
}
for (let i = 0; i <= 255; i++) {
  crc_table[3][i] = crc_table[2][i] >> 8 ^ crc_table[0][crc_table[2][i] & 255];
}
var isLittleEndian = (function() {
  const buffer = new ArrayBuffer(2);
  new DataView(buffer).setInt16(
    0,
    255,
    true
    /* littleEndian */
  );
  return new Int16Array(buffer)[0] === 255;
})();
function createcrc24(input) {
  let crc = 13501623;
  return transform(input, (value) => {
    const len32 = isLittleEndian ? Math.floor(value.length / 4) : 0;
    const arr32 = new Uint32Array(value.buffer, value.byteOffset, len32);
    for (let i = 0; i < len32; i++) {
      crc ^= arr32[i];
      crc = crc_table[0][crc >> 24 & 255] ^ crc_table[1][crc >> 16 & 255] ^ crc_table[2][crc >> 8 & 255] ^ crc_table[3][crc >> 0 & 255];
    }
    for (let i = len32 * 4; i < value.length; i++) {
      crc = crc >> 8 ^ crc_table[0][crc & 255 ^ value[i]];
    }
  }, () => new Uint8Array([crc, crc >> 8, crc >> 16]));
}
function verifyHeaders(headers) {
  for (let i = 0; i < headers.length; i++) {
    if (!/^([^\s:]|[^\s:][^:]*[^\s:]): .+$/.test(headers[i])) {
      util_default.printDebugError(new Error("Improperly formatted armor header: " + headers[i]));
    }
    if (!/^(Version|Comment|MessageID|Hash|Charset): .+$/.test(headers[i])) {
      util_default.printDebugError(new Error("Unknown header: " + headers[i]));
    }
  }
}
function removeChecksum(text) {
  let body = text;
  const lastEquals = text.lastIndexOf("=");
  if (lastEquals >= 0 && lastEquals !== text.length - 1) {
    body = text.slice(0, lastEquals);
  }
  return body;
}
function unarmor(input) {
  return new Promise((resolve, reject) => {
    try {
      const reSplit = /^-----[^-]+-----$/m;
      const reEmptyLine = /^[ \f\r\t\u00a0\u2000-\u200a\u202f\u205f\u3000]*$/;
      let type;
      const headers = [];
      let lastHeaders = headers;
      let headersDone;
      let text = [];
      let textDone;
      const data = decode(transformPair(input, async (readable, writable) => {
        const reader = getReader(readable);
        try {
          while (true) {
            let line = await reader.readLine();
            if (line === void 0) {
              throw new Error("Misformed armored text");
            }
            line = util_default.removeTrailingSpaces(line.replace(/[\r\n]/g, ""));
            if (!type) {
              if (reSplit.test(line)) {
                type = getType(line);
              }
            } else if (!headersDone) {
              if (reSplit.test(line)) {
                reject(new Error("Mandatory blank line missing between armor headers and armor data"));
              }
              if (!reEmptyLine.test(line)) {
                lastHeaders.push(line);
              } else {
                verifyHeaders(lastHeaders);
                headersDone = true;
                if (textDone || type !== enums_default.armor.signed) {
                  resolve({ text, data, headers, type });
                  break;
                }
              }
            } else if (!textDone && type === enums_default.armor.signed) {
              if (!reSplit.test(line)) {
                text.push(line.replace(/^- /, ""));
              } else {
                text = text.join("\r\n");
                textDone = true;
                verifyHeaders(lastHeaders);
                lastHeaders = [];
                headersDone = false;
              }
            }
          }
        } catch (e) {
          reject(e);
          return;
        }
        const writer = getWriter(writable);
        try {
          while (true) {
            await writer.ready;
            const { done, value } = await reader.read();
            if (done) {
              throw new Error("Misformed armored text");
            }
            const line = value + "";
            if (line.indexOf("=") === -1 && line.indexOf("-") === -1) {
              await writer.write(line);
            } else {
              let remainder = await reader.readToEnd();
              if (!remainder.length) remainder = "";
              remainder = line + remainder;
              remainder = util_default.removeTrailingSpaces(remainder.replace(/\r/g, ""));
              const parts = remainder.split(reSplit);
              if (parts.length === 1) {
                throw new Error("Misformed armored text");
              }
              const body = removeChecksum(parts[0].slice(0, -1));
              await writer.write(body);
              break;
            }
          }
          await writer.ready;
          await writer.close();
        } catch (e) {
          await writer.abort(e);
        }
      }));
    } catch (e) {
      reject(e);
    }
  }).then(async (result) => {
    if (isArrayStream(result.data)) {
      result.data = await readToEnd(result.data);
    }
    return result;
  });
}
function armor(messageType, body, partIndex, partTotal, customComment, emitChecksum = false, config2 = config_default) {
  let text;
  let hash;
  if (messageType === enums_default.armor.signed) {
    text = body.text;
    hash = body.hash;
    body = body.data;
  }
  const maybeBodyClone = emitChecksum && passiveClone(body);
  const result = [];
  switch (messageType) {
    case enums_default.armor.multipartSection:
      result.push("-----BEGIN PGP MESSAGE, PART " + partIndex + "/" + partTotal + "-----\n");
      result.push(addheader(customComment, config2));
      result.push(encode(body));
      maybeBodyClone && result.push("=", getCheckSum(maybeBodyClone));
      result.push("-----END PGP MESSAGE, PART " + partIndex + "/" + partTotal + "-----\n");
      break;
    case enums_default.armor.multipartLast:
      result.push("-----BEGIN PGP MESSAGE, PART " + partIndex + "-----\n");
      result.push(addheader(customComment, config2));
      result.push(encode(body));
      maybeBodyClone && result.push("=", getCheckSum(maybeBodyClone));
      result.push("-----END PGP MESSAGE, PART " + partIndex + "-----\n");
      break;
    case enums_default.armor.signed:
      result.push("-----BEGIN PGP SIGNED MESSAGE-----\n");
      result.push(hash ? `Hash: ${hash}

` : "\n");
      result.push(text.replace(/^-/mg, "- -"));
      result.push("\n-----BEGIN PGP SIGNATURE-----\n");
      result.push(addheader(customComment, config2));
      result.push(encode(body));
      maybeBodyClone && result.push("=", getCheckSum(maybeBodyClone));
      result.push("-----END PGP SIGNATURE-----\n");
      break;
    case enums_default.armor.message:
      result.push("-----BEGIN PGP MESSAGE-----\n");
      result.push(addheader(customComment, config2));
      result.push(encode(body));
      maybeBodyClone && result.push("=", getCheckSum(maybeBodyClone));
      result.push("-----END PGP MESSAGE-----\n");
      break;
    case enums_default.armor.publicKey:
      result.push("-----BEGIN PGP PUBLIC KEY BLOCK-----\n");
      result.push(addheader(customComment, config2));
      result.push(encode(body));
      maybeBodyClone && result.push("=", getCheckSum(maybeBodyClone));
      result.push("-----END PGP PUBLIC KEY BLOCK-----\n");
      break;
    case enums_default.armor.privateKey:
      result.push("-----BEGIN PGP PRIVATE KEY BLOCK-----\n");
      result.push(addheader(customComment, config2));
      result.push(encode(body));
      maybeBodyClone && result.push("=", getCheckSum(maybeBodyClone));
      result.push("-----END PGP PRIVATE KEY BLOCK-----\n");
      break;
    case enums_default.armor.signature:
      result.push("-----BEGIN PGP SIGNATURE-----\n");
      result.push(addheader(customComment, config2));
      result.push(encode(body));
      maybeBodyClone && result.push("=", getCheckSum(maybeBodyClone));
      result.push("-----END PGP SIGNATURE-----\n");
      break;
  }
  return util_default.concat(result);
}

// vendor/src/openpgpjs/src/crypto/public_key/rsa.js
var rsa_exports = {};
__export(rsa_exports, {
  decrypt: () => decrypt,
  encrypt: () => encrypt,
  generate: () => generate,
  sign: () => sign,
  validateParams: () => validateParams,
  verify: () => verify
});

// vendor/src/openpgpjs/src/crypto/biginteger.ts
var _0n8 = BigInt(0);
var _1n9 = BigInt(1);
function uint8ArrayToBigInt(bytes) {
  const hexAlphabet = "0123456789ABCDEF";
  let s = "";
  bytes.forEach((v) => {
    s += hexAlphabet[v >> 4] + hexAlphabet[v & 15];
  });
  return BigInt("0x0" + s);
}
function mod2(a, m) {
  const reduced = a % m;
  return reduced < _0n8 ? reduced + m : reduced;
}
function selectBigInt(cond, a, b) {
  const mask = -cond;
  return a & mask | b & ~mask;
}
function modExp(b, e, n) {
  if (n === _0n8) throw Error("Modulo cannot be zero");
  if (n === _1n9) return BigInt(0);
  if (e < _0n8) throw Error("Unsopported negative exponent");
  let exp = e;
  let x = b;
  x %= n;
  let r = BigInt(1);
  while (exp > _0n8) {
    const lsb = exp & _1n9;
    exp >>= _1n9;
    const rx = r * x % n;
    r = selectBigInt(lsb, rx, r);
    x = x * x % n;
  }
  return r;
}
function abs(x) {
  return x >= _0n8 ? x : -x;
}
function _egcd(aInput, bInput) {
  let x = BigInt(0);
  let y = BigInt(1);
  let xPrev = BigInt(1);
  let yPrev = BigInt(0);
  let a = abs(aInput);
  let b = abs(bInput);
  const aNegated = aInput < _0n8;
  const bNegated = bInput < _0n8;
  while (b !== _0n8) {
    const q = a / b;
    let tmp = x;
    x = xPrev - q * x;
    xPrev = tmp;
    tmp = y;
    y = yPrev - q * y;
    yPrev = tmp;
    tmp = b;
    b = a % b;
    a = tmp;
  }
  return {
    x: aNegated ? -xPrev : xPrev,
    y: bNegated ? -yPrev : yPrev,
    gcd: a
  };
}
function modInv(a, n) {
  const { gcd: gcd2, x } = _egcd(a, n);
  if (gcd2 !== _1n9) {
    throw new Error("Inverse does not exist");
  }
  return mod2(x + n, n);
}
function gcd(aInput, bInput) {
  let a = aInput;
  let b = bInput;
  while (b !== _0n8) {
    const tmp = b;
    b = a % b;
    a = tmp;
  }
  return a;
}
function bigIntToNumber(x) {
  const number = Number(x);
  if (number > Number.MAX_SAFE_INTEGER) {
    throw new Error("Number can only safely store up to 53 bits");
  }
  return number;
}
function getBit(x, i) {
  const bit = x >> BigInt(i) & _1n9;
  return bit === _0n8 ? 0 : 1;
}
function bitLength(x) {
  const target = x < _0n8 ? BigInt(-1) : _0n8;
  let bitlen = 1;
  let tmp = x;
  while ((tmp >>= _1n9) !== target) {
    bitlen++;
  }
  return bitlen;
}
function byteLength(x) {
  const target = x < _0n8 ? BigInt(-1) : _0n8;
  const _8n3 = BigInt(8);
  let len = 1;
  let tmp = x;
  while ((tmp >>= _8n3) !== target) {
    len++;
  }
  return len;
}
function bigIntToUint8Array(x, endian = "be", length) {
  let hex = x.toString(16);
  if (hex.length % 2 === 1) {
    hex = "0" + hex;
  }
  const rawLength = hex.length / 2;
  const bytes = new Uint8Array(length || rawLength);
  const offset = length ? length - rawLength : 0;
  let i = 0;
  while (i < rawLength) {
    bytes[i + offset] = parseInt(hex.slice(2 * i, 2 * i + 2), 16);
    i++;
  }
  if (endian !== "be") {
    bytes.reverse();
  }
  return bytes;
}

// vendor/src/openpgpjs/src/crypto/random.js
var nodeCrypto = util_default.getNodeCrypto();
function getRandomBytes(length) {
  const webcrypto = typeof crypto !== "undefined" ? crypto : nodeCrypto?.webcrypto;
  if (webcrypto?.getRandomValues) {
    const buf = new Uint8Array(length);
    return webcrypto.getRandomValues(buf);
  } else {
    throw new Error("No secure random number generator available.");
  }
}
function getRandomBigInteger(min, max2) {
  if (max2 < min) {
    throw new Error("Illegal parameter value: max <= min");
  }
  const modulus = max2 - min;
  const bytes = byteLength(modulus);
  const r = uint8ArrayToBigInt(getRandomBytes(bytes + 8));
  return mod2(r, modulus) + min;
}

// vendor/src/openpgpjs/src/crypto/public_key/prime.ts
var _1n10 = BigInt(1);
function randomProbablePrime(bits2, e, k) {
  const _30n = BigInt(30);
  const min = _1n10 << BigInt(bits2 - 1);
  const adds = [1, 6, 5, 4, 3, 2, 1, 4, 3, 2, 1, 2, 1, 4, 3, 2, 1, 2, 1, 4, 3, 2, 1, 6, 5, 4, 3, 2, 1, 2];
  let n = getRandomBigInteger(min, min << _1n10);
  let i = bigIntToNumber(mod2(n, _30n));
  do {
    n += BigInt(adds[i]);
    i = (i + adds[i]) % adds.length;
    if (bitLength(n) > bits2) {
      n = mod2(n, min << _1n10);
      n += min;
      i = bigIntToNumber(mod2(n, _30n));
    }
  } while (!isProbablePrime(n, e, k));
  return n;
}
function isProbablePrime(n, e, k) {
  if (e && gcd(n - _1n10, e) !== _1n10) {
    return false;
  }
  if (!divisionTest(n)) {
    return false;
  }
  if (!fermat(n)) {
    return false;
  }
  if (!millerRabin(n, k)) {
    return false;
  }
  return true;
}
function fermat(n, b = BigInt(2)) {
  return modExp(b, n - _1n10, n) === _1n10;
}
function divisionTest(n) {
  const _0n10 = BigInt(0);
  return smallPrimes.every((m) => mod2(n, m) !== _0n10);
}
var smallPrimes = [
  7,
  11,
  13,
  17,
  19,
  23,
  29,
  31,
  37,
  41,
  43,
  47,
  53,
  59,
  61,
  67,
  71,
  73,
  79,
  83,
  89,
  97,
  101,
  103,
  107,
  109,
  113,
  127,
  131,
  137,
  139,
  149,
  151,
  157,
  163,
  167,
  173,
  179,
  181,
  191,
  193,
  197,
  199,
  211,
  223,
  227,
  229,
  233,
  239,
  241,
  251,
  257,
  263,
  269,
  271,
  277,
  281,
  283,
  293,
  307,
  311,
  313,
  317,
  331,
  337,
  347,
  349,
  353,
  359,
  367,
  373,
  379,
  383,
  389,
  397,
  401,
  409,
  419,
  421,
  431,
  433,
  439,
  443,
  449,
  457,
  461,
  463,
  467,
  479,
  487,
  491,
  499,
  503,
  509,
  521,
  523,
  541,
  547,
  557,
  563,
  569,
  571,
  577,
  587,
  593,
  599,
  601,
  607,
  613,
  617,
  619,
  631,
  641,
  643,
  647,
  653,
  659,
  661,
  673,
  677,
  683,
  691,
  701,
  709,
  719,
  727,
  733,
  739,
  743,
  751,
  757,
  761,
  769,
  773,
  787,
  797,
  809,
  811,
  821,
  823,
  827,
  829,
  839,
  853,
  857,
  859,
  863,
  877,
  881,
  883,
  887,
  907,
  911,
  919,
  929,
  937,
  941,
  947,
  953,
  967,
  971,
  977,
  983,
  991,
  997,
  1009,
  1013,
  1019,
  1021,
  1031,
  1033,
  1039,
  1049,
  1051,
  1061,
  1063,
  1069,
  1087,
  1091,
  1093,
  1097,
  1103,
  1109,
  1117,
  1123,
  1129,
  1151,
  1153,
  1163,
  1171,
  1181,
  1187,
  1193,
  1201,
  1213,
  1217,
  1223,
  1229,
  1231,
  1237,
  1249,
  1259,
  1277,
  1279,
  1283,
  1289,
  1291,
  1297,
  1301,
  1303,
  1307,
  1319,
  1321,
  1327,
  1361,
  1367,
  1373,
  1381,
  1399,
  1409,
  1423,
  1427,
  1429,
  1433,
  1439,
  1447,
  1451,
  1453,
  1459,
  1471,
  1481,
  1483,
  1487,
  1489,
  1493,
  1499,
  1511,
  1523,
  1531,
  1543,
  1549,
  1553,
  1559,
  1567,
  1571,
  1579,
  1583,
  1597,
  1601,
  1607,
  1609,
  1613,
  1619,
  1621,
  1627,
  1637,
  1657,
  1663,
  1667,
  1669,
  1693,
  1697,
  1699,
  1709,
  1721,
  1723,
  1733,
  1741,
  1747,
  1753,
  1759,
  1777,
  1783,
  1787,
  1789,
  1801,
  1811,
  1823,
  1831,
  1847,
  1861,
  1867,
  1871,
  1873,
  1877,
  1879,
  1889,
  1901,
  1907,
  1913,
  1931,
  1933,
  1949,
  1951,
  1973,
  1979,
  1987,
  1993,
  1997,
  1999,
  2003,
  2011,
  2017,
  2027,
  2029,
  2039,
  2053,
  2063,
  2069,
  2081,
  2083,
  2087,
  2089,
  2099,
  2111,
  2113,
  2129,
  2131,
  2137,
  2141,
  2143,
  2153,
  2161,
  2179,
  2203,
  2207,
  2213,
  2221,
  2237,
  2239,
  2243,
  2251,
  2267,
  2269,
  2273,
  2281,
  2287,
  2293,
  2297,
  2309,
  2311,
  2333,
  2339,
  2341,
  2347,
  2351,
  2357,
  2371,
  2377,
  2381,
  2383,
  2389,
  2393,
  2399,
  2411,
  2417,
  2423,
  2437,
  2441,
  2447,
  2459,
  2467,
  2473,
  2477,
  2503,
  2521,
  2531,
  2539,
  2543,
  2549,
  2551,
  2557,
  2579,
  2591,
  2593,
  2609,
  2617,
  2621,
  2633,
  2647,
  2657,
  2659,
  2663,
  2671,
  2677,
  2683,
  2687,
  2689,
  2693,
  2699,
  2707,
  2711,
  2713,
  2719,
  2729,
  2731,
  2741,
  2749,
  2753,
  2767,
  2777,
  2789,
  2791,
  2797,
  2801,
  2803,
  2819,
  2833,
  2837,
  2843,
  2851,
  2857,
  2861,
  2879,
  2887,
  2897,
  2903,
  2909,
  2917,
  2927,
  2939,
  2953,
  2957,
  2963,
  2969,
  2971,
  2999,
  3001,
  3011,
  3019,
  3023,
  3037,
  3041,
  3049,
  3061,
  3067,
  3079,
  3083,
  3089,
  3109,
  3119,
  3121,
  3137,
  3163,
  3167,
  3169,
  3181,
  3187,
  3191,
  3203,
  3209,
  3217,
  3221,
  3229,
  3251,
  3253,
  3257,
  3259,
  3271,
  3299,
  3301,
  3307,
  3313,
  3319,
  3323,
  3329,
  3331,
  3343,
  3347,
  3359,
  3361,
  3371,
  3373,
  3389,
  3391,
  3407,
  3413,
  3433,
  3449,
  3457,
  3461,
  3463,
  3467,
  3469,
  3491,
  3499,
  3511,
  3517,
  3527,
  3529,
  3533,
  3539,
  3541,
  3547,
  3557,
  3559,
  3571,
  3581,
  3583,
  3593,
  3607,
  3613,
  3617,
  3623,
  3631,
  3637,
  3643,
  3659,
  3671,
  3673,
  3677,
  3691,
  3697,
  3701,
  3709,
  3719,
  3727,
  3733,
  3739,
  3761,
  3767,
  3769,
  3779,
  3793,
  3797,
  3803,
  3821,
  3823,
  3833,
  3847,
  3851,
  3853,
  3863,
  3877,
  3881,
  3889,
  3907,
  3911,
  3917,
  3919,
  3923,
  3929,
  3931,
  3943,
  3947,
  3967,
  3989,
  4001,
  4003,
  4007,
  4013,
  4019,
  4021,
  4027,
  4049,
  4051,
  4057,
  4073,
  4079,
  4091,
  4093,
  4099,
  4111,
  4127,
  4129,
  4133,
  4139,
  4153,
  4157,
  4159,
  4177,
  4201,
  4211,
  4217,
  4219,
  4229,
  4231,
  4241,
  4243,
  4253,
  4259,
  4261,
  4271,
  4273,
  4283,
  4289,
  4297,
  4327,
  4337,
  4339,
  4349,
  4357,
  4363,
  4373,
  4391,
  4397,
  4409,
  4421,
  4423,
  4441,
  4447,
  4451,
  4457,
  4463,
  4481,
  4483,
  4493,
  4507,
  4513,
  4517,
  4519,
  4523,
  4547,
  4549,
  4561,
  4567,
  4583,
  4591,
  4597,
  4603,
  4621,
  4637,
  4639,
  4643,
  4649,
  4651,
  4657,
  4663,
  4673,
  4679,
  4691,
  4703,
  4721,
  4723,
  4729,
  4733,
  4751,
  4759,
  4783,
  4787,
  4789,
  4793,
  4799,
  4801,
  4813,
  4817,
  4831,
  4861,
  4871,
  4877,
  4889,
  4903,
  4909,
  4919,
  4931,
  4933,
  4937,
  4943,
  4951,
  4957,
  4967,
  4969,
  4973,
  4987,
  4993,
  4999
].map((n) => BigInt(n));
function millerRabin(n, k, rand) {
  const len = bitLength(n);
  if (!k) {
    k = Math.max(1, len / 48 | 0);
  }
  const n1 = n - _1n10;
  let s = 0;
  while (!getBit(n1, s)) {
    s++;
  }
  const d = n >> BigInt(s);
  for (; k > 0; k--) {
    const a = rand ? rand() : getRandomBigInteger(BigInt(2), n1);
    let x = modExp(a, d, n);
    if (x === _1n10 || x === n1) {
      continue;
    }
    let i;
    for (i = 1; i < s; i++) {
      x = mod2(x * x, n);
      if (x === _1n10) {
        return false;
      }
      if (x === n1) {
        break;
      }
    }
    if (i === s) {
      return false;
    }
  }
  return true;
}

// vendor/src/openpgpjs/src/crypto/hash/index.js
var webCrypto = util_default.getWebCrypto();
var nodeCrypto2 = util_default.getNodeCrypto();
var nodeCryptoHashes = nodeCrypto2 && nodeCrypto2.getHashes();
function nodeHash(type) {
  if (!nodeCrypto2 || !nodeCryptoHashes.includes(type)) {
    return;
  }
  return async function(data) {
    const shasum = nodeCrypto2.createHash(type);
    return transform(data, (value) => {
      shasum.update(value);
    }, () => new Uint8Array(shasum.digest()));
  };
}
function nobleHash(nobleHashName, webCryptoHashName) {
  const getNobleHash = async () => {
    const { nobleHashes: nobleHashes2 } = await Promise.resolve().then(() => (init_noble_hashes(), noble_hashes_exports));
    const hash = nobleHashes2.get(nobleHashName);
    if (!hash) throw new Error("Unsupported hash");
    return hash;
  };
  return async function(data) {
    if (isArrayStream(data)) {
      data = await readToEnd(data);
    }
    if (util_default.isStream(data)) {
      const hash = await getNobleHash();
      const hashInstance = hash.create();
      return transform(data, (value) => {
        hashInstance.update(value);
      }, () => hashInstance.digest());
    } else if (webCrypto && webCryptoHashName) {
      return new Uint8Array(await webCrypto.digest(webCryptoHashName, data));
    } else {
      const hash = await getNobleHash();
      return hash(data);
    }
  };
}
var md52 = nodeHash("md5") || nobleHash("md5");
var sha13 = nodeHash("sha1") || nobleHash("sha1", "SHA-1");
var sha2243 = nodeHash("sha224") || nobleHash("sha224");
var sha2563 = nodeHash("sha256") || nobleHash("sha256", "SHA-256");
var sha3843 = nodeHash("sha384") || nobleHash("sha384", "SHA-384");
var sha5123 = nodeHash("sha512") || nobleHash("sha512", "SHA-512");
var ripemd = nodeHash("ripemd160") || nobleHash("ripemd160");
var sha3_2562 = nodeHash("sha3-256") || nobleHash("sha3_256");
var sha3_5122 = nodeHash("sha3-512") || nobleHash("sha3_512");
function computeDigest(algo, data) {
  switch (algo) {
    case enums_default.hash.md5:
      return md52(data);
    case enums_default.hash.sha1:
      return sha13(data);
    case enums_default.hash.ripemd:
      return ripemd(data);
    case enums_default.hash.sha256:
      return sha2563(data);
    case enums_default.hash.sha384:
      return sha3843(data);
    case enums_default.hash.sha512:
      return sha5123(data);
    case enums_default.hash.sha224:
      return sha2243(data);
    case enums_default.hash.sha3_256:
      return sha3_2562(data);
    case enums_default.hash.sha3_512:
      return sha3_5122(data);
    default:
      throw new Error("Unsupported hash function");
  }
}
function getHashByteLength(algo) {
  switch (algo) {
    case enums_default.hash.md5:
      return 16;
    case enums_default.hash.sha1:
    case enums_default.hash.ripemd:
      return 20;
    case enums_default.hash.sha256:
      return 32;
    case enums_default.hash.sha384:
      return 48;
    case enums_default.hash.sha512:
      return 64;
    case enums_default.hash.sha224:
      return 28;
    case enums_default.hash.sha3_256:
      return 32;
    case enums_default.hash.sha3_512:
      return 64;
    default:
      throw new Error("Invalid hash algorithm.");
  }
}

// vendor/src/openpgpjs/src/crypto/pkcs1.js
var hash_headers = [];
hash_headers[1] = [
  48,
  32,
  48,
  12,
  6,
  8,
  42,
  134,
  72,
  134,
  247,
  13,
  2,
  5,
  5,
  0,
  4,
  16
];
hash_headers[2] = [48, 33, 48, 9, 6, 5, 43, 14, 3, 2, 26, 5, 0, 4, 20];
hash_headers[3] = [48, 33, 48, 9, 6, 5, 43, 36, 3, 2, 1, 5, 0, 4, 20];
hash_headers[8] = [
  48,
  49,
  48,
  13,
  6,
  9,
  96,
  134,
  72,
  1,
  101,
  3,
  4,
  2,
  1,
  5,
  0,
  4,
  32
];
hash_headers[9] = [
  48,
  65,
  48,
  13,
  6,
  9,
  96,
  134,
  72,
  1,
  101,
  3,
  4,
  2,
  2,
  5,
  0,
  4,
  48
];
hash_headers[10] = [
  48,
  81,
  48,
  13,
  6,
  9,
  96,
  134,
  72,
  1,
  101,
  3,
  4,
  2,
  3,
  5,
  0,
  4,
  64
];
hash_headers[11] = [
  48,
  45,
  48,
  13,
  6,
  9,
  96,
  134,
  72,
  1,
  101,
  3,
  4,
  2,
  4,
  5,
  0,
  4,
  28
];
hash_headers[12] = [
  48,
  49,
  48,
  13,
  6,
  9,
  96,
  134,
  72,
  1,
  101,
  3,
  4,
  2,
  8,
  5,
  0,
  4,
  32
];
hash_headers[14] = [
  48,
  81,
  48,
  13,
  6,
  9,
  96,
  134,
  72,
  1,
  101,
  3,
  4,
  2,
  10,
  5,
  0,
  4,
  64
];
function getPKCS1Padding(length) {
  const result = new Uint8Array(length);
  let count = 0;
  while (count < length) {
    const randomBytes2 = getRandomBytes(length - count);
    for (let i = 0; i < randomBytes2.length; i++) {
      if (randomBytes2[i] !== 0) {
        result[count++] = randomBytes2[i];
      }
    }
  }
  return result;
}
function emeEncode(message, keyLength) {
  const mLength = message.length;
  if (mLength > keyLength - 11) {
    throw new Error("Message too long");
  }
  const PS = getPKCS1Padding(keyLength - mLength - 3);
  const encoded = new Uint8Array(keyLength);
  encoded[1] = 2;
  encoded.set(PS, 2);
  encoded.set(message, keyLength - mLength);
  return encoded;
}
function emeDecode(encoded, randomPayload) {
  let offset = 2;
  let separatorNotFound = 1;
  for (let j = offset; j < encoded.length; j++) {
    separatorNotFound &= encoded[j] !== 0;
    offset += separatorNotFound;
  }
  const psLen = offset - 2;
  const payload = encoded.subarray(offset + 1);
  const isValidPadding = encoded[0] === 0 & encoded[1] === 2 & psLen >= 8 & !separatorNotFound;
  if (randomPayload) {
    return util_default.selectUint8Array(isValidPadding, payload, randomPayload);
  }
  if (isValidPadding) {
    return payload;
  }
  throw new Error("Decryption error");
}
function emsaEncode(algo, hashed, emLen) {
  let i;
  if (hashed.length !== getHashByteLength(algo)) {
    throw new Error("Invalid hash length");
  }
  const hashPrefix = new Uint8Array(hash_headers[algo].length);
  for (i = 0; i < hash_headers[algo].length; i++) {
    hashPrefix[i] = hash_headers[algo][i];
  }
  const tLen = hashPrefix.length + hashed.length;
  if (emLen < tLen + 11) {
    throw new Error("Intended encoded message length too short");
  }
  const PS = new Uint8Array(emLen - tLen - 3).fill(255);
  const EM = new Uint8Array(emLen);
  EM[1] = 1;
  EM.set(PS, 2);
  EM.set(hashPrefix, emLen - tLen);
  EM.set(hashed, emLen - hashed.length);
  return EM;
}

// vendor/src/openpgpjs/src/crypto/public_key/rsa.js
var webCrypto2 = util_default.getWebCrypto();
var nodeCrypto3 = util_default.getNodeCrypto();
var _1n11 = BigInt(1);
async function sign(hashAlgo, data, n, e, d, p, q, u, hashed) {
  if (getHashByteLength(hashAlgo) >= n.length) {
    throw new Error("Digest size cannot exceed key modulus size");
  }
  if (data && !util_default.isStream(data)) {
    if (util_default.getWebCrypto()) {
      try {
        return await webSign(enums_default.read(enums_default.webHash, hashAlgo), data, n, e, d, p, q, u);
      } catch (err2) {
        util_default.printDebugError(err2);
      }
    } else if (util_default.getNodeCrypto()) {
      return nodeSign(hashAlgo, data, n, e, d, p, q, u);
    }
  }
  return bnSign(hashAlgo, n, d, hashed);
}
async function verify(hashAlgo, data, s, n, e, hashed) {
  if (data && !util_default.isStream(data)) {
    if (util_default.getWebCrypto()) {
      try {
        return await webVerify(enums_default.read(enums_default.webHash, hashAlgo), data, s, n, e);
      } catch (err2) {
        util_default.printDebugError(err2);
      }
    } else if (util_default.getNodeCrypto()) {
      return nodeVerify(hashAlgo, data, s, n, e);
    }
  }
  return bnVerify(hashAlgo, s, n, e, hashed);
}
async function encrypt(data, n, e) {
  if (util_default.getNodeCrypto()) {
    return nodeEncrypt(data, n, e);
  }
  return bnEncrypt(data, n, e);
}
async function decrypt(data, n, e, d, p, q, u, randomPayload) {
  if (util_default.getNodeCrypto() && !randomPayload) {
    try {
      return nodeDecrypt(data, n, e, d, p, q, u);
    } catch (err2) {
      util_default.printDebugError(err2);
    }
  }
  return bnDecrypt(data, n, e, d, p, q, u, randomPayload);
}
async function generate(bits2, e) {
  e = BigInt(e);
  if (util_default.getWebCrypto()) {
    const keyGenOpt = {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: bits2,
      // the specified keysize in bits
      publicExponent: bigIntToUint8Array(e),
      // take three bytes (max 65537) for exponent
      hash: {
        name: "SHA-1"
        // not required for actual RSA keys, but for crypto api 'sign' and 'verify'
      }
    };
    const keyPair = await webCrypto2.generateKey(keyGenOpt, true, ["sign", "verify"]);
    const jwk = await webCrypto2.exportKey("jwk", keyPair.privateKey);
    return jwkToPrivate(jwk, e);
  } else if (util_default.getNodeCrypto()) {
    const opts = {
      modulusLength: bits2,
      publicExponent: bigIntToNumber(e),
      publicKeyEncoding: { type: "pkcs1", format: "jwk" },
      privateKeyEncoding: { type: "pkcs1", format: "jwk" }
    };
    const jwk = await new Promise((resolve, reject) => {
      nodeCrypto3.generateKeyPair("rsa", opts, (err2, _, jwkPrivateKey) => {
        if (err2) {
          reject(err2);
        } else {
          resolve(jwkPrivateKey);
        }
      });
    });
    return jwkToPrivate(jwk, e);
  }
  let p;
  let q;
  let n;
  do {
    q = randomProbablePrime(bits2 - (bits2 >> 1), e, 40);
    p = randomProbablePrime(bits2 >> 1, e, 40);
    n = p * q;
  } while (bitLength(n) !== bits2);
  const phi = (p - _1n11) * (q - _1n11);
  if (q < p) {
    [p, q] = [q, p];
  }
  return {
    n: bigIntToUint8Array(n),
    e: bigIntToUint8Array(e),
    d: bigIntToUint8Array(modInv(e, phi)),
    p: bigIntToUint8Array(p),
    q: bigIntToUint8Array(q),
    // dp: d.mod(p.subn(1)),
    // dq: d.mod(q.subn(1)),
    u: bigIntToUint8Array(modInv(p, q))
  };
}
async function validateParams(n, e, d, p, q, u) {
  n = uint8ArrayToBigInt(n);
  p = uint8ArrayToBigInt(p);
  q = uint8ArrayToBigInt(q);
  if (p * q !== n) {
    return false;
  }
  const _2n8 = BigInt(2);
  u = uint8ArrayToBigInt(u);
  if (mod2(p * u, q) !== BigInt(1)) {
    return false;
  }
  e = uint8ArrayToBigInt(e);
  d = uint8ArrayToBigInt(d);
  const nSizeOver3 = BigInt(Math.floor(bitLength(n) / 3));
  const r = getRandomBigInteger(_2n8, _2n8 << nSizeOver3);
  const rde = r * d * e;
  const areInverses = mod2(rde, p - _1n11) === r && mod2(rde, q - _1n11) === r;
  if (!areInverses) {
    return false;
  }
  return true;
}
function bnSign(hashAlgo, n, d, hashed) {
  n = uint8ArrayToBigInt(n);
  const m = uint8ArrayToBigInt(emsaEncode(hashAlgo, hashed, byteLength(n)));
  d = uint8ArrayToBigInt(d);
  return bigIntToUint8Array(modExp(m, d, n), "be", byteLength(n));
}
async function webSign(hashName, data, n, e, d, p, q, u) {
  const jwk = privateToJWK(n, e, d, p, q, u);
  const algo = {
    name: "RSASSA-PKCS1-v1_5",
    hash: { name: hashName }
  };
  const key = await webCrypto2.importKey("jwk", jwk, algo, false, ["sign"]);
  return new Uint8Array(await webCrypto2.sign("RSASSA-PKCS1-v1_5", key, data));
}
function nodeSign(hashAlgo, data, n, e, d, p, q, u) {
  const sign8 = nodeCrypto3.createSign(enums_default.read(enums_default.hash, hashAlgo));
  sign8.write(data);
  sign8.end();
  const jwk = privateToJWK(n, e, d, p, q, u);
  return new Uint8Array(sign8.sign({ key: jwk, format: "jwk", type: "pkcs1" }));
}
function bnVerify(hashAlgo, s, n, e, hashed) {
  n = uint8ArrayToBigInt(n);
  s = uint8ArrayToBigInt(s);
  e = uint8ArrayToBigInt(e);
  if (s >= n) {
    throw new Error("Signature size cannot exceed modulus size");
  }
  const EM1 = bigIntToUint8Array(modExp(s, e, n), "be", byteLength(n));
  const EM2 = emsaEncode(hashAlgo, hashed, byteLength(n));
  return util_default.equalsUint8Array(EM1, EM2);
}
async function webVerify(hashName, data, s, n, e) {
  const jwk = publicToJWK(n, e);
  const key = await webCrypto2.importKey("jwk", jwk, {
    name: "RSASSA-PKCS1-v1_5",
    hash: { name: hashName }
  }, false, ["verify"]);
  return webCrypto2.verify("RSASSA-PKCS1-v1_5", key, s, data);
}
function nodeVerify(hashAlgo, data, s, n, e) {
  const jwk = publicToJWK(n, e);
  const key = { key: jwk, format: "jwk", type: "pkcs1" };
  const verify8 = nodeCrypto3.createVerify(enums_default.read(enums_default.hash, hashAlgo));
  verify8.write(data);
  verify8.end();
  try {
    return verify8.verify(key, s);
  } catch {
    return false;
  }
}
function nodeEncrypt(data, n, e) {
  const jwk = publicToJWK(n, e);
  const key = { key: jwk, format: "jwk", type: "pkcs1", padding: nodeCrypto3.constants.RSA_PKCS1_PADDING };
  return new Uint8Array(nodeCrypto3.publicEncrypt(key, data));
}
function bnEncrypt(data, n, e) {
  n = uint8ArrayToBigInt(n);
  data = uint8ArrayToBigInt(emeEncode(data, byteLength(n)));
  e = uint8ArrayToBigInt(e);
  if (data >= n) {
    throw new Error("Message size cannot exceed modulus size");
  }
  return bigIntToUint8Array(modExp(data, e, n), "be", byteLength(n));
}
function nodeDecrypt(data, n, e, d, p, q, u) {
  const jwk = privateToJWK(n, e, d, p, q, u);
  const key = { key: jwk, format: "jwk", type: "pkcs1", padding: nodeCrypto3.constants.RSA_PKCS1_PADDING };
  try {
    return new Uint8Array(nodeCrypto3.privateDecrypt(key, data));
  } catch {
    throw new Error("Decryption error");
  }
}
function bnDecrypt(data, n, e, d, p, q, u, randomPayload) {
  data = uint8ArrayToBigInt(data);
  n = uint8ArrayToBigInt(n);
  e = uint8ArrayToBigInt(e);
  d = uint8ArrayToBigInt(d);
  p = uint8ArrayToBigInt(p);
  q = uint8ArrayToBigInt(q);
  u = uint8ArrayToBigInt(u);
  if (data >= n) {
    throw new Error("Data too large.");
  }
  const dq = mod2(d, q - _1n11);
  const dp = mod2(d, p - _1n11);
  const unblinder = getRandomBigInteger(BigInt(2), n);
  const blinder = modExp(modInv(unblinder, n), e, n);
  data = mod2(data * blinder, n);
  const mp = modExp(data, dp, p);
  const mq = modExp(data, dq, q);
  const h = mod2(u * (mq - mp), q);
  let result = h * p + mp;
  result = mod2(result * unblinder, n);
  return emeDecode(bigIntToUint8Array(result, "be", byteLength(n)), randomPayload);
}
function privateToJWK(n, e, d, p, q, u) {
  const pNum = uint8ArrayToBigInt(p);
  const qNum = uint8ArrayToBigInt(q);
  const dNum = uint8ArrayToBigInt(d);
  let dq = mod2(dNum, qNum - _1n11);
  let dp = mod2(dNum, pNum - _1n11);
  dp = bigIntToUint8Array(dp);
  dq = bigIntToUint8Array(dq);
  return {
    kty: "RSA",
    n: uint8ArrayToB64(n, true),
    e: uint8ArrayToB64(e, true),
    d: uint8ArrayToB64(d, true),
    // switch p and q
    p: uint8ArrayToB64(q, true),
    q: uint8ArrayToB64(p, true),
    // switch dp and dq
    dp: uint8ArrayToB64(dq, true),
    dq: uint8ArrayToB64(dp, true),
    qi: uint8ArrayToB64(u, true),
    ext: true
  };
}
function publicToJWK(n, e) {
  return {
    kty: "RSA",
    n: uint8ArrayToB64(n, true),
    e: uint8ArrayToB64(e, true),
    ext: true
  };
}
function jwkToPrivate(jwk, e) {
  return {
    n: b64ToUint8Array(jwk.n),
    e: bigIntToUint8Array(e),
    d: b64ToUint8Array(jwk.d),
    // switch p and q
    p: b64ToUint8Array(jwk.q),
    q: b64ToUint8Array(jwk.p),
    // Since p and q are switched in places, u is the inverse of jwk.q
    u: b64ToUint8Array(jwk.qi)
  };
}

// vendor/src/openpgpjs/src/crypto/public_key/elgamal.js
var elgamal_exports = {};
__export(elgamal_exports, {
  decrypt: () => decrypt2,
  encrypt: () => encrypt2,
  validateParams: () => validateParams2
});
var _1n12 = BigInt(1);
async function encrypt2(data, p, g, y) {
  p = uint8ArrayToBigInt(p);
  g = uint8ArrayToBigInt(g);
  y = uint8ArrayToBigInt(y);
  const padded = emeEncode(data, byteLength(p));
  const m = uint8ArrayToBigInt(padded);
  const k = getRandomBigInteger(_1n12, p - _1n12);
  return {
    c1: bigIntToUint8Array(modExp(g, k, p)),
    c2: bigIntToUint8Array(mod2(modExp(y, k, p) * m, p))
  };
}
async function decrypt2(c1, c2, p, x, randomPayload) {
  c1 = uint8ArrayToBigInt(c1);
  c2 = uint8ArrayToBigInt(c2);
  p = uint8ArrayToBigInt(p);
  x = uint8ArrayToBigInt(x);
  const padded = mod2(modInv(modExp(c1, x, p), p) * c2, p);
  return emeDecode(bigIntToUint8Array(padded, "be", byteLength(p)), randomPayload);
}
async function validateParams2(pBytes, gBytes, yBytes, xBytes) {
  const p = uint8ArrayToBigInt(pBytes);
  const g = uint8ArrayToBigInt(gBytes);
  const y = uint8ArrayToBigInt(yBytes);
  if (g <= _1n12 || g >= p) {
    return false;
  }
  const pSize = BigInt(bitLength(p));
  const _1023n = BigInt(1023);
  if (pSize < _1023n) {
    return false;
  }
  if (modExp(g, p - _1n12, p) !== _1n12) {
    return false;
  }
  let res = g;
  let i = BigInt(1);
  const _2n8 = BigInt(2);
  const threshold = _2n8 << BigInt(17);
  while (i < threshold) {
    res = mod2(res * g, p);
    if (res === _1n12) {
      return false;
    }
    i++;
  }
  const x = uint8ArrayToBigInt(xBytes);
  const r = getRandomBigInteger(_2n8 << pSize - _1n12, _2n8 << pSize);
  const rqx = (p - _1n12) * r + x;
  if (y !== modExp(g, rqx, p)) {
    return false;
  }
  return true;
}

// vendor/src/openpgpjs/src/crypto/public_key/elliptic/index.js
var elliptic_exports = {};
__export(elliptic_exports, {
  CurveWithOID: () => CurveWithOID,
  ecdh: () => ecdh_exports,
  ecdhX: () => ecdh_x_exports,
  ecdsa: () => ecdsa_exports,
  eddsa: () => eddsa_exports,
  eddsaLegacy: () => eddsa_legacy_exports,
  generate: () => generate4,
  getPreferredHashAlgo: () => getPreferredHashAlgo2
});

// vendor/src/openpgpjs/src/type/oid.js
var knownOIDs = {
  "2a8648ce3d030107": enums_default.curve.nistP256,
  "2b81040022": enums_default.curve.nistP384,
  "2b81040023": enums_default.curve.nistP521,
  "2b8104000a": enums_default.curve.secp256k1,
  "2b06010401da470f01": enums_default.curve.ed25519Legacy,
  "2b060104019755010501": enums_default.curve.curve25519Legacy,
  "2b2403030208010107": enums_default.curve.brainpoolP256r1,
  "2b240303020801010b": enums_default.curve.brainpoolP384r1,
  "2b240303020801010d": enums_default.curve.brainpoolP512r1
};
var OID = class _OID {
  constructor(oid) {
    if (oid instanceof _OID) {
      this.oid = oid.oid;
    } else if (util_default.isArray(oid) || util_default.isUint8Array(oid)) {
      oid = new Uint8Array(oid);
      if (oid[0] === 6) {
        if (oid[1] !== oid.length - 2) {
          throw new Error("Length mismatch in DER encoded oid");
        }
        oid = oid.subarray(2);
      }
      this.oid = oid;
    } else {
      this.oid = "";
    }
  }
  /**
   * Method to read an OID object
   * @param {Uint8Array} input - Where to read the OID from
   * @returns {Number} Number of read bytes.
   */
  read(input) {
    if (input.length >= 1) {
      const length = input[0];
      if (input.length >= 1 + length) {
        this.oid = input.subarray(1, 1 + length);
        return 1 + this.oid.length;
      }
    }
    throw new Error("Invalid oid");
  }
  /**
   * Serialize an OID object
   * @returns {Uint8Array} Array with the serialized value the OID.
   */
  write() {
    return util_default.concatUint8Array([new Uint8Array([this.oid.length]), this.oid]);
  }
  /**
   * Serialize an OID object as a hex string
   * @returns {string} String with the hex value of the OID.
   */
  toHex() {
    return util_default.uint8ArrayToHex(this.oid);
  }
  /**
   * If a known curve object identifier, return the canonical name of the curve
   * @returns {enums.curve} String with the canonical name of the curve
   * @throws if unknown
   */
  getName() {
    const name = knownOIDs[this.toHex()];
    if (!name) {
      throw new Error("Unknown curve object identifier.");
    }
    return name;
  }
};
var oid_default = OID;

// vendor/src/openpgpjs/src/packet/packet.js
function readSimpleLength(bytes) {
  let len = 0;
  let offset;
  const type = bytes[0];
  if (type < 192) {
    [len] = bytes;
    offset = 1;
  } else if (type < 255) {
    len = (bytes[0] - 192 << 8) + bytes[1] + 192;
    offset = 2;
  } else if (type === 255) {
    len = util_default.readNumber(bytes.subarray(1, 1 + 4));
    offset = 5;
  }
  return {
    len,
    offset
  };
}
function writeSimpleLength(length) {
  if (length < 192) {
    return new Uint8Array([length]);
  } else if (length > 191 && length < 8384) {
    return new Uint8Array([(length - 192 >> 8) + 192, length - 192 & 255]);
  }
  return util_default.concatUint8Array([new Uint8Array([255]), util_default.writeNumber(length, 4)]);
}
function writePartialLength(power) {
  if (power < 0 || power > 30) {
    throw new Error("Partial Length power must be between 1 and 30");
  }
  return new Uint8Array([224 + power]);
}
function writeTag(tag_type) {
  return new Uint8Array([192 | tag_type]);
}
function writeHeader(tag_type, length) {
  return util_default.concatUint8Array([writeTag(tag_type), writeSimpleLength(length)]);
}
function supportsStreaming(tag) {
  return [
    enums_default.packet.literalData,
    enums_default.packet.compressedData,
    enums_default.packet.symmetricallyEncryptedData,
    enums_default.packet.symEncryptedIntegrityProtectedData,
    enums_default.packet.aeadEncryptedData
  ].includes(tag);
}
async function readPacket(reader, useStreamType, callback) {
  let writer;
  let callbackReturned;
  try {
    const peekedBytes = await reader.peekBytes(2);
    if (!peekedBytes || peekedBytes.length < 2 || (peekedBytes[0] & 128) === 0) {
      throw new Error("Error during parsing. This message / key probably does not conform to a valid OpenPGP format.");
    }
    const headerByte = await reader.readByte();
    let tag = -1;
    let format = -1;
    let packetLength;
    format = 0;
    if ((headerByte & 64) !== 0) {
      format = 1;
    }
    let packetLengthType;
    if (format) {
      tag = headerByte & 63;
    } else {
      tag = (headerByte & 63) >> 2;
      packetLengthType = headerByte & 3;
    }
    const packetSupportsStreaming = supportsStreaming(tag);
    let packet = null;
    if (useStreamType && packetSupportsStreaming) {
      if (useStreamType === "array") {
        const arrayStream = new ArrayStream();
        writer = getWriter(arrayStream);
        packet = arrayStream;
      } else {
        const transform2 = new TransformStream();
        writer = getWriter(transform2.writable);
        packet = transform2.readable;
      }
      callbackReturned = callback({ tag, packet });
    } else {
      packet = [];
    }
    let wasPartialLength;
    do {
      if (!format) {
        switch (packetLengthType) {
          case 0:
            packetLength = await reader.readByte();
            break;
          case 1:
            packetLength = await reader.readByte() << 8 | await reader.readByte();
            break;
          case 2:
            packetLength = (await reader.readByte() << 24 | await reader.readByte() << 16 | await reader.readByte() << 8 | await reader.readByte()) >>> 0;
            break;
          default:
            packetLength = Infinity;
            break;
        }
      } else {
        const lengthByte = await reader.readByte();
        wasPartialLength = false;
        if (lengthByte < 192) {
          packetLength = lengthByte;
        } else if (lengthByte >= 192 && lengthByte < 224) {
          packetLength = (lengthByte - 192 << 8) + await reader.readByte() + 192;
        } else if (lengthByte > 223 && lengthByte < 255) {
          packetLength = 1 << (lengthByte & 31);
          wasPartialLength = true;
          if (!packetSupportsStreaming) {
            throw new TypeError("This packet type does not support partial lengths.");
          }
        } else {
          packetLength = (await reader.readByte() << 24 | await reader.readByte() << 16 | await reader.readByte() << 8 | await reader.readByte()) >>> 0;
        }
      }
      if (packetLength > 0) {
        let bytesRead = 0;
        while (true) {
          if (writer) await writer.ready;
          const { done, value } = await reader.read();
          if (done) {
            if (packetLength === Infinity) break;
            throw new Error("Unexpected end of packet");
          }
          const chunk = packetLength === Infinity ? value : value.subarray(0, packetLength - bytesRead);
          if (writer) await writer.write(chunk);
          else packet.push(chunk);
          bytesRead += value.length;
          if (bytesRead >= packetLength) {
            reader.unshift(value.subarray(packetLength - bytesRead + value.length));
            break;
          }
        }
      }
    } while (wasPartialLength);
    if (writer) {
      await writer.ready;
      await writer.close();
    } else {
      packet = util_default.concatUint8Array(packet);
      await callback({ tag, packet });
    }
  } catch (e) {
    if (writer) {
      await writer.abort(e);
      return true;
    } else {
      throw e;
    }
  } finally {
    if (writer) {
      await callbackReturned;
    }
  }
}
var UnsupportedError = class _UnsupportedError extends Error {
  constructor(...params) {
    super(...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _UnsupportedError);
    }
    this.name = "UnsupportedError";
  }
};
var UnknownPacketError = class extends UnsupportedError {
  constructor(...params) {
    super(...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnsupportedError);
    }
    this.name = "UnknownPacketError";
  }
};
var MalformedPacketError = class extends UnsupportedError {
  constructor(...params) {
    super(...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnsupportedError);
    }
    this.name = "MalformedPacketError";
  }
};
var UnparseablePacket = class {
  constructor(tag, rawContent) {
    this.tag = tag;
    this.rawContent = rawContent;
  }
  write() {
    return this.rawContent;
  }
};

// vendor/src/openpgpjs/src/crypto/public_key/elliptic/eddsa.js
var eddsa_exports = {};
__export(eddsa_exports, {
  generate: () => generate2,
  getPayloadSize: () => getPayloadSize,
  getPreferredHashAlgo: () => getPreferredHashAlgo,
  sign: () => sign2,
  validateParams: () => validateParams3,
  verify: () => verify2
});
async function generate2(algo) {
  switch (algo) {
    case enums_default.publicKey.ed25519:
      try {
        const webCrypto10 = util_default.getWebCrypto();
        const webCryptoKey = await webCrypto10.generateKey("Ed25519", true, ["sign", "verify"]).catch((err2) => {
          if (err2.name === "OperationError") {
            const newErr = new Error("Unexpected key generation issue");
            newErr.name = "NotSupportedError";
            throw newErr;
          }
          throw err2;
        });
        const privateKey = await webCrypto10.exportKey("jwk", webCryptoKey.privateKey);
        const publicKey = await webCrypto10.exportKey("jwk", webCryptoKey.publicKey);
        return {
          A: new Uint8Array(b64ToUint8Array(publicKey.x)),
          seed: b64ToUint8Array(privateKey.d, true)
        };
      } catch (err2) {
        if (err2.name !== "NotSupportedError") {
          throw err2;
        }
        const { default: ed25519 } = await Promise.resolve().then(() => (init_nacl_fast(), nacl_fast_exports));
        const seed = getRandomBytes(getPayloadSize(algo));
        const { publicKey: A2 } = ed25519.sign.keyPair.fromSeed(seed);
        return { A: A2, seed };
      }
    case enums_default.publicKey.ed448: {
      const ed4482 = await util_default.getNobleCurve(enums_default.publicKey.ed448);
      const { secretKey: seed, publicKey: A2 } = ed4482.keygen();
      return { A: A2, seed };
    }
    default:
      throw new Error("Unsupported EdDSA algorithm");
  }
}
async function sign2(algo, hashAlgo, message, publicKey, privateKey, hashed) {
  if (getHashByteLength(hashAlgo) < getHashByteLength(getPreferredHashAlgo(algo))) {
    throw new Error("Hash algorithm too weak for EdDSA.");
  }
  switch (algo) {
    case enums_default.publicKey.ed25519:
      try {
        const webCrypto10 = util_default.getWebCrypto();
        const jwk = privateKeyToJWK(algo, publicKey, privateKey);
        const key = await webCrypto10.importKey("jwk", jwk, "Ed25519", false, ["sign"]);
        const signature = new Uint8Array(
          await webCrypto10.sign("Ed25519", key, hashed)
        );
        return { RS: signature };
      } catch (err2) {
        if (err2.name !== "NotSupportedError") {
          throw err2;
        }
        const { default: ed25519 } = await Promise.resolve().then(() => (init_nacl_fast(), nacl_fast_exports));
        const secretKey = util_default.concatUint8Array([privateKey, publicKey]);
        const signature = ed25519.sign.detached(hashed, secretKey);
        return { RS: signature };
      }
    case enums_default.publicKey.ed448: {
      const ed4482 = await util_default.getNobleCurve(enums_default.publicKey.ed448);
      const signature = ed4482.sign(hashed, privateKey);
      return { RS: signature };
    }
    default:
      throw new Error("Unsupported EdDSA algorithm");
  }
}
async function verify2(algo, hashAlgo, { RS }, m, publicKey, hashed) {
  if (getHashByteLength(hashAlgo) < getHashByteLength(getPreferredHashAlgo(algo))) {
    throw new Error("Hash algorithm too weak for EdDSA.");
  }
  switch (algo) {
    case enums_default.publicKey.ed25519:
      try {
        const webCrypto10 = util_default.getWebCrypto();
        const jwk = publicKeyToJWK(algo, publicKey);
        const key = await webCrypto10.importKey("jwk", jwk, "Ed25519", false, ["verify"]);
        const verified2 = await webCrypto10.verify("Ed25519", key, RS, hashed);
        return verified2;
      } catch (err2) {
        if (err2.name !== "NotSupportedError") {
          throw err2;
        }
        const { default: ed25519 } = await Promise.resolve().then(() => (init_nacl_fast(), nacl_fast_exports));
        return ed25519.sign.detached.verify(hashed, RS, publicKey);
      }
    case enums_default.publicKey.ed448: {
      const ed4482 = await util_default.getNobleCurve(enums_default.publicKey.ed448);
      return ed4482.verify(RS, hashed, publicKey);
    }
    default:
      throw new Error("Unsupported EdDSA algorithm");
  }
}
async function validateParams3(algo, A2, seed) {
  switch (algo) {
    case enums_default.publicKey.ed25519:
      try {
        const webCrypto10 = util_default.getWebCrypto();
        const jwkPrivate = privateKeyToJWK(algo, A2, seed);
        const jwkPublic = publicKeyToJWK(algo, A2);
        const privateCryptoKey = await webCrypto10.importKey("jwk", jwkPrivate, "Ed25519", false, ["sign"]);
        const publicCryptoKey = await webCrypto10.importKey("jwk", jwkPublic, "Ed25519", false, ["verify"]);
        const randomData = getRandomBytes(8);
        const signature = new Uint8Array(
          await webCrypto10.sign("Ed25519", privateCryptoKey, randomData)
        );
        const verified2 = await webCrypto10.verify("Ed25519", publicCryptoKey, signature, randomData);
        return verified2;
      } catch (err2) {
        if (err2.name !== "NotSupportedError") {
          return false;
        }
        const { default: ed25519 } = await Promise.resolve().then(() => (init_nacl_fast(), nacl_fast_exports));
        const { publicKey } = ed25519.sign.keyPair.fromSeed(seed);
        return util_default.equalsUint8Array(A2, publicKey);
      }
    case enums_default.publicKey.ed448: {
      const ed4482 = await util_default.getNobleCurve(enums_default.publicKey.ed448);
      const publicKey = ed4482.getPublicKey(seed);
      return util_default.equalsUint8Array(A2, publicKey);
    }
    default:
      return false;
  }
}
function getPayloadSize(algo) {
  switch (algo) {
    case enums_default.publicKey.ed25519:
      return 32;
    case enums_default.publicKey.ed448:
      return 57;
    default:
      throw new Error("Unsupported EdDSA algorithm");
  }
}
function getPreferredHashAlgo(algo) {
  switch (algo) {
    case enums_default.publicKey.ed25519:
      return enums_default.hash.sha256;
    case enums_default.publicKey.ed448:
      return enums_default.hash.sha512;
    default:
      throw new Error("Unknown EdDSA algo");
  }
}
var publicKeyToJWK = (algo, publicKey) => {
  switch (algo) {
    case enums_default.publicKey.ed25519: {
      const jwk = {
        kty: "OKP",
        crv: "Ed25519",
        x: uint8ArrayToB64(publicKey, true),
        ext: true
      };
      return jwk;
    }
    default:
      throw new Error("Unsupported EdDSA algorithm");
  }
};
var privateKeyToJWK = (algo, publicKey, privateKey) => {
  switch (algo) {
    case enums_default.publicKey.ed25519: {
      const jwk = publicKeyToJWK(algo, publicKey);
      jwk.d = uint8ArrayToB64(privateKey, true);
      return jwk;
    }
    default:
      throw new Error("Unsupported EdDSA algorithm");
  }
};

// vendor/src/openpgpjs/src/crypto/public_key/elliptic/ecdh_x.js
var ecdh_x_exports = {};
__export(ecdh_x_exports, {
  decrypt: () => decrypt4,
  encrypt: () => encrypt4,
  generate: () => generate3,
  generateEphemeralEncryptionMaterial: () => generateEphemeralEncryptionMaterial,
  getPayloadSize: () => getPayloadSize2,
  recomputeSharedSecret: () => recomputeSharedSecret,
  validateParams: () => validateParams4
});

// vendor/src/noble-ciphers/src/utils.ts
/*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) */
function isBytes2(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function abool(b) {
  if (typeof b !== "boolean") throw new Error(`boolean expected, not ${b}`);
}
function abytes2(b, ...lengths) {
  if (!isBytes2(b)) throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function aexists2(instance, checkFinished = true) {
  if (instance.destroyed) throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished) throw new Error("Hash#digest() has already been called");
}
function aoutput2(out, instance) {
  abytes2(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function u8(arr) {
  return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
}
function u322(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean2(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView2(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
var isLE2 = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
function utf8ToBytes2(str) {
  if (typeof str !== "string") throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes2(data) {
  if (typeof data === "string") data = utf8ToBytes2(data);
  else if (isBytes2(data)) data = copyBytes2(data);
  else throw new Error("Uint8Array expected, got " + typeof data);
  return data;
}
function overlapBytes(a, b) {
  return a.buffer === b.buffer && // best we can do, may fail with an obscure Proxy
  a.byteOffset < b.byteOffset + b.byteLength && // a starts before b end
  b.byteOffset < a.byteOffset + a.byteLength;
}
function complexOverlapBytes(input, output) {
  if (overlapBytes(input, output) && input.byteOffset < output.byteOffset)
    throw new Error("complex overlap of input and output is not supported");
}
function concatBytes2(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    abytes2(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad2 = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad2);
    pad2 += a.length;
  }
  return res;
}
function equalBytes2(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
var wrapCipher = /* @__NO_SIDE_EFFECTS__ */ (params, constructor) => {
  function wrappedCipher(key, ...args) {
    abytes2(key);
    if (!isLE2) throw new Error("Non little-endian hardware is not yet supported");
    if (params.nonceLength !== void 0) {
      const nonce = args[0];
      if (!nonce) throw new Error("nonce / iv required");
      if (params.varSizeNonce) abytes2(nonce);
      else abytes2(nonce, params.nonceLength);
    }
    const tagl = params.tagLength;
    if (tagl && args[1] !== void 0) {
      abytes2(args[1]);
    }
    const cipher = constructor(key, ...args);
    const checkOutput = (fnLength, output) => {
      if (output !== void 0) {
        if (fnLength !== 2) throw new Error("cipher output not supported");
        abytes2(output);
      }
    };
    let called = false;
    const wrCipher = {
      encrypt(data, output) {
        if (called) throw new Error("cannot encrypt() twice with same key + nonce");
        called = true;
        abytes2(data);
        checkOutput(cipher.encrypt.length, output);
        return cipher.encrypt(data, output);
      },
      decrypt(data, output) {
        abytes2(data);
        if (tagl && data.length < tagl)
          throw new Error("invalid ciphertext length: smaller than tagLength=" + tagl);
        checkOutput(cipher.decrypt.length, output);
        return cipher.decrypt(data, output);
      }
    };
    return wrCipher;
  }
  Object.assign(wrappedCipher, params);
  return wrappedCipher;
};
function getOutput(expectedLength, out, onlyAligned = true) {
  if (out === void 0) return new Uint8Array(expectedLength);
  if (out.length !== expectedLength)
    throw new Error("invalid output length, expected " + expectedLength + ", got: " + out.length);
  if (onlyAligned && !isAligned32(out)) throw new Error("invalid output, must be aligned");
  return out;
}
function setBigUint642(view, byteOffset, value, isLE3) {
  if (typeof view.setBigUint64 === "function") return view.setBigUint64(byteOffset, value, isLE3);
  const _32n2 = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value >> _32n2 & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE3 ? 4 : 0;
  const l = isLE3 ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE3);
  view.setUint32(byteOffset + l, wl, isLE3);
}
function u64Lengths(dataLength, aadLength, isLE3) {
  abool(isLE3);
  const num = new Uint8Array(16);
  const view = createView2(num);
  setBigUint642(view, 0, BigInt(aadLength), isLE3);
  setBigUint642(view, 8, BigInt(dataLength), isLE3);
  return num;
}
function isAligned32(bytes) {
  return bytes.byteOffset % 4 === 0;
}
function copyBytes2(bytes) {
  return Uint8Array.from(bytes);
}

// vendor/src/noble-ciphers/src/_polyval.ts
var BLOCK_SIZE = 16;
var ZEROS16 = /* @__PURE__ */ new Uint8Array(16);
var ZEROS32 = u322(ZEROS16);
var POLY = 225;
var mul2 = (s0, s1, s2, s3) => {
  const hiBit = s3 & 1;
  return {
    s3: s2 << 31 | s3 >>> 1,
    s2: s1 << 31 | s2 >>> 1,
    s1: s0 << 31 | s1 >>> 1,
    s0: s0 >>> 1 ^ POLY << 24 & -(hiBit & 1)
    // reduce % poly
  };
};
var swapLE = (n) => (n >>> 0 & 255) << 24 | (n >>> 8 & 255) << 16 | (n >>> 16 & 255) << 8 | n >>> 24 & 255 | 0;
function _toGHASHKey(k) {
  k.reverse();
  const hiBit = k[15] & 1;
  let carry = 0;
  for (let i = 0; i < k.length; i++) {
    const t = k[i];
    k[i] = t >>> 1 | carry;
    carry = (t & 1) << 7;
  }
  k[0] ^= -hiBit & 225;
  return k;
}
var estimateWindow = (bytes) => {
  if (bytes > 64 * 1024) return 8;
  if (bytes > 1024) return 4;
  return 2;
};
var GHASH = class {
  // We select bits per window adaptively based on expectedLength
  constructor(key, expectedLength) {
    this.blockLen = BLOCK_SIZE;
    this.outputLen = BLOCK_SIZE;
    this.s0 = 0;
    this.s1 = 0;
    this.s2 = 0;
    this.s3 = 0;
    this.finished = false;
    key = toBytes2(key);
    abytes2(key, 16);
    const kView = createView2(key);
    let k0 = kView.getUint32(0, false);
    let k1 = kView.getUint32(4, false);
    let k2 = kView.getUint32(8, false);
    let k3 = kView.getUint32(12, false);
    const doubles = [];
    for (let i = 0; i < 128; i++) {
      doubles.push({ s0: swapLE(k0), s1: swapLE(k1), s2: swapLE(k2), s3: swapLE(k3) });
      ({ s0: k0, s1: k1, s2: k2, s3: k3 } = mul2(k0, k1, k2, k3));
    }
    const W = estimateWindow(expectedLength || 1024);
    if (![1, 2, 4, 8].includes(W))
      throw new Error("ghash: invalid window size, expected 2, 4 or 8");
    this.W = W;
    const bits2 = 128;
    const windows = bits2 / W;
    const windowSize = this.windowSize = 2 ** W;
    const items = [];
    for (let w = 0; w < windows; w++) {
      for (let byte = 0; byte < windowSize; byte++) {
        let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
        for (let j = 0; j < W; j++) {
          const bit = byte >>> W - j - 1 & 1;
          if (!bit) continue;
          const { s0: d0, s1: d1, s2: d2, s3: d3 } = doubles[W * w + j];
          s0 ^= d0, s1 ^= d1, s2 ^= d2, s3 ^= d3;
        }
        items.push({ s0, s1, s2, s3 });
      }
    }
    this.t = items;
  }
  _updateBlock(s0, s1, s2, s3) {
    s0 ^= this.s0, s1 ^= this.s1, s2 ^= this.s2, s3 ^= this.s3;
    const { W, t, windowSize } = this;
    let o0 = 0, o1 = 0, o2 = 0, o3 = 0;
    const mask = (1 << W) - 1;
    let w = 0;
    for (const num of [s0, s1, s2, s3]) {
      for (let bytePos = 0; bytePos < 4; bytePos++) {
        const byte = num >>> 8 * bytePos & 255;
        for (let bitPos = 8 / W - 1; bitPos >= 0; bitPos--) {
          const bit = byte >>> W * bitPos & mask;
          const { s0: e0, s1: e1, s2: e2, s3: e3 } = t[w * windowSize + bit];
          o0 ^= e0, o1 ^= e1, o2 ^= e2, o3 ^= e3;
          w += 1;
        }
      }
    }
    this.s0 = o0;
    this.s1 = o1;
    this.s2 = o2;
    this.s3 = o3;
  }
  update(data) {
    aexists2(this);
    data = toBytes2(data);
    abytes2(data);
    const b32 = u322(data);
    const blocks = Math.floor(data.length / BLOCK_SIZE);
    const left = data.length % BLOCK_SIZE;
    for (let i = 0; i < blocks; i++) {
      this._updateBlock(b32[i * 4 + 0], b32[i * 4 + 1], b32[i * 4 + 2], b32[i * 4 + 3]);
    }
    if (left) {
      ZEROS16.set(data.subarray(blocks * BLOCK_SIZE));
      this._updateBlock(ZEROS32[0], ZEROS32[1], ZEROS32[2], ZEROS32[3]);
      clean2(ZEROS32);
    }
    return this;
  }
  destroy() {
    const { t } = this;
    for (const elm of t) {
      elm.s0 = 0, elm.s1 = 0, elm.s2 = 0, elm.s3 = 0;
    }
  }
  digestInto(out) {
    aexists2(this);
    aoutput2(out, this);
    this.finished = true;
    const { s0, s1, s2, s3 } = this;
    const o32 = u322(out);
    o32[0] = s0;
    o32[1] = s1;
    o32[2] = s2;
    o32[3] = s3;
    return out;
  }
  digest() {
    const res = new Uint8Array(BLOCK_SIZE);
    this.digestInto(res);
    this.destroy();
    return res;
  }
};
var Polyval = class extends GHASH {
  constructor(key, expectedLength) {
    key = toBytes2(key);
    abytes2(key);
    const ghKey = _toGHASHKey(copyBytes2(key));
    super(ghKey, expectedLength);
    clean2(ghKey);
  }
  update(data) {
    data = toBytes2(data);
    aexists2(this);
    const b32 = u322(data);
    const left = data.length % BLOCK_SIZE;
    const blocks = Math.floor(data.length / BLOCK_SIZE);
    for (let i = 0; i < blocks; i++) {
      this._updateBlock(
        swapLE(b32[i * 4 + 3]),
        swapLE(b32[i * 4 + 2]),
        swapLE(b32[i * 4 + 1]),
        swapLE(b32[i * 4 + 0])
      );
    }
    if (left) {
      ZEROS16.set(data.subarray(blocks * BLOCK_SIZE));
      this._updateBlock(
        swapLE(ZEROS32[3]),
        swapLE(ZEROS32[2]),
        swapLE(ZEROS32[1]),
        swapLE(ZEROS32[0])
      );
      clean2(ZEROS32);
    }
    return this;
  }
  digestInto(out) {
    aexists2(this);
    aoutput2(out, this);
    this.finished = true;
    const { s0, s1, s2, s3 } = this;
    const o32 = u322(out);
    o32[0] = s0;
    o32[1] = s1;
    o32[2] = s2;
    o32[3] = s3;
    return out.reverse();
  }
};
function wrapConstructorWithKey(hashCons) {
  const hashC = (msg, key) => hashCons(key, msg.length).update(toBytes2(msg)).digest();
  const tmp = hashCons(new Uint8Array(16), 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (key, expectedLength) => hashCons(key, expectedLength);
  return hashC;
}
var ghash = wrapConstructorWithKey(
  (key, expectedLength) => new GHASH(key, expectedLength)
);
var polyval = wrapConstructorWithKey(
  (key, expectedLength) => new Polyval(key, expectedLength)
);

// vendor/src/noble-ciphers/src/aes.ts
var BLOCK_SIZE2 = 16;
var BLOCK_SIZE32 = 4;
var EMPTY_BLOCK = /* @__PURE__ */ new Uint8Array(BLOCK_SIZE2);
var POLY2 = 283;
function mul22(n) {
  return n << 1 ^ POLY2 & -(n >> 7);
}
function mul(a, b) {
  let res = 0;
  for (; b > 0; b >>= 1) {
    res ^= a & -(b & 1);
    a = mul22(a);
  }
  return res;
}
var sbox = /* @__PURE__ */ (() => {
  const t = new Uint8Array(256);
  for (let i = 0, x = 1; i < 256; i++, x ^= mul22(x)) t[i] = x;
  const box = new Uint8Array(256);
  box[0] = 99;
  for (let i = 0; i < 255; i++) {
    let x = t[255 - i];
    x |= x << 8;
    box[t[i]] = (x ^ x >> 4 ^ x >> 5 ^ x >> 6 ^ x >> 7 ^ 99) & 255;
  }
  clean2(t);
  return box;
})();
var invSbox = /* @__PURE__ */ sbox.map((_, j) => sbox.indexOf(j));
var rotr32_8 = (n) => n << 24 | n >>> 8;
var rotl32_8 = (n) => n << 8 | n >>> 24;
var byteSwap2 = (word) => word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
function genTtable(sbox2, fn) {
  if (sbox2.length !== 256) throw new Error("Wrong sbox length");
  const T0 = new Uint32Array(256).map((_, j) => fn(sbox2[j]));
  const T1 = T0.map(rotl32_8);
  const T2 = T1.map(rotl32_8);
  const T3 = T2.map(rotl32_8);
  const T01 = new Uint32Array(256 * 256);
  const T23 = new Uint32Array(256 * 256);
  const sbox22 = new Uint16Array(256 * 256);
  for (let i = 0; i < 256; i++) {
    for (let j = 0; j < 256; j++) {
      const idx = i * 256 + j;
      T01[idx] = T0[i] ^ T1[j];
      T23[idx] = T2[i] ^ T3[j];
      sbox22[idx] = sbox2[i] << 8 | sbox2[j];
    }
  }
  return { sbox: sbox2, sbox2: sbox22, T0, T1, T2, T3, T01, T23 };
}
var tableEncoding = /* @__PURE__ */ genTtable(
  sbox,
  (s) => mul(s, 3) << 24 | s << 16 | s << 8 | mul(s, 2)
);
var tableDecoding = /* @__PURE__ */ genTtable(
  invSbox,
  (s) => mul(s, 11) << 24 | mul(s, 13) << 16 | mul(s, 9) << 8 | mul(s, 14)
);
var xPowers = /* @__PURE__ */ (() => {
  const p = new Uint8Array(16);
  for (let i = 0, x = 1; i < 16; i++, x = mul22(x)) p[i] = x;
  return p;
})();
function expandKeyLE(key) {
  abytes2(key);
  const len = key.length;
  if (![16, 24, 32].includes(len))
    throw new Error("aes: invalid key size, should be 16, 24 or 32, got " + len);
  const { sbox2 } = tableEncoding;
  const toClean = [];
  if (!isAligned32(key)) toClean.push(key = copyBytes2(key));
  const k32 = u322(key);
  const Nk = k32.length;
  const subByte = (n) => applySbox(sbox2, n, n, n, n);
  const xk = new Uint32Array(len + 28);
  xk.set(k32);
  for (let i = Nk; i < xk.length; i++) {
    let t = xk[i - 1];
    if (i % Nk === 0) t = subByte(rotr32_8(t)) ^ xPowers[i / Nk - 1];
    else if (Nk > 6 && i % Nk === 4) t = subByte(t);
    xk[i] = xk[i - Nk] ^ t;
  }
  clean2(...toClean);
  return xk;
}
function expandKeyDecLE(key) {
  const encKey = expandKeyLE(key);
  const xk = encKey.slice();
  const Nk = encKey.length;
  const { sbox2 } = tableEncoding;
  const { T0, T1, T2, T3 } = tableDecoding;
  for (let i = 0; i < Nk; i += 4) {
    for (let j = 0; j < 4; j++) xk[i + j] = encKey[Nk - i - 4 + j];
  }
  clean2(encKey);
  for (let i = 4; i < Nk - 4; i++) {
    const x = xk[i];
    const w = applySbox(sbox2, x, x, x, x);
    xk[i] = T0[w & 255] ^ T1[w >>> 8 & 255] ^ T2[w >>> 16 & 255] ^ T3[w >>> 24];
  }
  return xk;
}
function apply0123(T01, T23, s0, s1, s2, s3) {
  return T01[s0 << 8 & 65280 | s1 >>> 8 & 255] ^ T23[s2 >>> 8 & 65280 | s3 >>> 24 & 255];
}
function applySbox(sbox2, s0, s1, s2, s3) {
  return sbox2[s0 & 255 | s1 & 65280] | sbox2[s2 >>> 16 & 255 | s3 >>> 16 & 65280] << 16;
}
function encrypt3(xk, s0, s1, s2, s3) {
  const { sbox2, T01, T23 } = tableEncoding;
  let k = 0;
  s0 ^= xk[k++], s1 ^= xk[k++], s2 ^= xk[k++], s3 ^= xk[k++];
  const rounds = xk.length / 4 - 2;
  for (let i = 0; i < rounds; i++) {
    const t02 = xk[k++] ^ apply0123(T01, T23, s0, s1, s2, s3);
    const t12 = xk[k++] ^ apply0123(T01, T23, s1, s2, s3, s0);
    const t22 = xk[k++] ^ apply0123(T01, T23, s2, s3, s0, s1);
    const t32 = xk[k++] ^ apply0123(T01, T23, s3, s0, s1, s2);
    s0 = t02, s1 = t12, s2 = t22, s3 = t32;
  }
  const t0 = xk[k++] ^ applySbox(sbox2, s0, s1, s2, s3);
  const t1 = xk[k++] ^ applySbox(sbox2, s1, s2, s3, s0);
  const t2 = xk[k++] ^ applySbox(sbox2, s2, s3, s0, s1);
  const t3 = xk[k++] ^ applySbox(sbox2, s3, s0, s1, s2);
  return { s0: t0, s1: t1, s2: t2, s3: t3 };
}
function decrypt3(xk, s0, s1, s2, s3) {
  const { sbox2, T01, T23 } = tableDecoding;
  let k = 0;
  s0 ^= xk[k++], s1 ^= xk[k++], s2 ^= xk[k++], s3 ^= xk[k++];
  const rounds = xk.length / 4 - 2;
  for (let i = 0; i < rounds; i++) {
    const t02 = xk[k++] ^ apply0123(T01, T23, s0, s3, s2, s1);
    const t12 = xk[k++] ^ apply0123(T01, T23, s1, s0, s3, s2);
    const t22 = xk[k++] ^ apply0123(T01, T23, s2, s1, s0, s3);
    const t32 = xk[k++] ^ apply0123(T01, T23, s3, s2, s1, s0);
    s0 = t02, s1 = t12, s2 = t22, s3 = t32;
  }
  const t0 = xk[k++] ^ applySbox(sbox2, s0, s3, s2, s1);
  const t1 = xk[k++] ^ applySbox(sbox2, s1, s0, s3, s2);
  const t2 = xk[k++] ^ applySbox(sbox2, s2, s1, s0, s3);
  const t3 = xk[k++] ^ applySbox(sbox2, s3, s2, s1, s0);
  return { s0: t0, s1: t1, s2: t2, s3: t3 };
}
function ctrCounter(xk, nonce, src, dst) {
  abytes2(nonce, BLOCK_SIZE2);
  abytes2(src);
  const srcLen = src.length;
  dst = getOutput(srcLen, dst);
  complexOverlapBytes(src, dst);
  const ctr2 = nonce;
  const c32 = u322(ctr2);
  let { s0, s1, s2, s3 } = encrypt3(xk, c32[0], c32[1], c32[2], c32[3]);
  const src32 = u322(src);
  const dst32 = u322(dst);
  for (let i = 0; i + 4 <= src32.length; i += 4) {
    dst32[i + 0] = src32[i + 0] ^ s0;
    dst32[i + 1] = src32[i + 1] ^ s1;
    dst32[i + 2] = src32[i + 2] ^ s2;
    dst32[i + 3] = src32[i + 3] ^ s3;
    let carry = 1;
    for (let i2 = ctr2.length - 1; i2 >= 0; i2--) {
      carry = carry + (ctr2[i2] & 255) | 0;
      ctr2[i2] = carry & 255;
      carry >>>= 8;
    }
    ({ s0, s1, s2, s3 } = encrypt3(xk, c32[0], c32[1], c32[2], c32[3]));
  }
  const start = BLOCK_SIZE2 * Math.floor(src32.length / BLOCK_SIZE32);
  if (start < srcLen) {
    const b32 = new Uint32Array([s0, s1, s2, s3]);
    const buf = u8(b32);
    for (let i = start, pos = 0; i < srcLen; i++, pos++) dst[i] = src[i] ^ buf[pos];
    clean2(b32);
  }
  return dst;
}
function ctr32(xk, isLE3, nonce, src, dst) {
  abytes2(nonce, BLOCK_SIZE2);
  abytes2(src);
  dst = getOutput(src.length, dst);
  const ctr2 = nonce;
  const c32 = u322(ctr2);
  const view = createView2(ctr2);
  const src32 = u322(src);
  const dst32 = u322(dst);
  const ctrPos = isLE3 ? 0 : 12;
  const srcLen = src.length;
  let ctrNum = view.getUint32(ctrPos, isLE3);
  let { s0, s1, s2, s3 } = encrypt3(xk, c32[0], c32[1], c32[2], c32[3]);
  for (let i = 0; i + 4 <= src32.length; i += 4) {
    dst32[i + 0] = src32[i + 0] ^ s0;
    dst32[i + 1] = src32[i + 1] ^ s1;
    dst32[i + 2] = src32[i + 2] ^ s2;
    dst32[i + 3] = src32[i + 3] ^ s3;
    ctrNum = ctrNum + 1 >>> 0;
    view.setUint32(ctrPos, ctrNum, isLE3);
    ({ s0, s1, s2, s3 } = encrypt3(xk, c32[0], c32[1], c32[2], c32[3]));
  }
  const start = BLOCK_SIZE2 * Math.floor(src32.length / BLOCK_SIZE32);
  if (start < srcLen) {
    const b32 = new Uint32Array([s0, s1, s2, s3]);
    const buf = u8(b32);
    for (let i = start, pos = 0; i < srcLen; i++, pos++) dst[i] = src[i] ^ buf[pos];
    clean2(b32);
  }
  return dst;
}
var ctr = /* @__PURE__ */ wrapCipher(
  { blockSize: 16, nonceLength: 16 },
  function aesctr(key, nonce) {
    function processCtr(buf, dst) {
      abytes2(buf);
      if (dst !== void 0) {
        abytes2(dst);
        if (!isAligned32(dst)) throw new Error("unaligned destination");
      }
      const xk = expandKeyLE(key);
      const n = copyBytes2(nonce);
      const toClean = [xk, n];
      if (!isAligned32(buf)) toClean.push(buf = copyBytes2(buf));
      const out = ctrCounter(xk, n, buf, dst);
      clean2(...toClean);
      return out;
    }
    return {
      encrypt: (plaintext, dst) => processCtr(plaintext, dst),
      decrypt: (ciphertext, dst) => processCtr(ciphertext, dst)
    };
  }
);
function validateBlockDecrypt(data) {
  abytes2(data);
  if (data.length % BLOCK_SIZE2 !== 0) {
    throw new Error(
      "aes-(cbc/ecb).decrypt ciphertext should consist of blocks with size " + BLOCK_SIZE2
    );
  }
}
function validateBlockEncrypt(plaintext, pcks5, dst) {
  abytes2(plaintext);
  let outLen = plaintext.length;
  const remaining = outLen % BLOCK_SIZE2;
  if (!pcks5 && remaining !== 0)
    throw new Error("aec/(cbc-ecb): unpadded plaintext with disabled padding");
  if (!isAligned32(plaintext)) plaintext = copyBytes2(plaintext);
  const b = u322(plaintext);
  if (pcks5) {
    let left = BLOCK_SIZE2 - remaining;
    if (!left) left = BLOCK_SIZE2;
    outLen = outLen + left;
  }
  dst = getOutput(outLen, dst);
  complexOverlapBytes(plaintext, dst);
  const o = u322(dst);
  return { b, o, out: dst };
}
function validatePCKS(data, pcks5) {
  if (!pcks5) return data;
  const len = data.length;
  if (!len) throw new Error("aes/pcks5: empty ciphertext not allowed");
  const lastByte = data[len - 1];
  if (lastByte <= 0 || lastByte > 16) throw new Error("aes/pcks5: wrong padding");
  const out = data.subarray(0, -lastByte);
  for (let i = 0; i < lastByte; i++)
    if (data[len - i - 1] !== lastByte) throw new Error("aes/pcks5: wrong padding");
  return out;
}
function padPCKS(left) {
  const tmp = new Uint8Array(16);
  const tmp32 = u322(tmp);
  tmp.set(left);
  const paddingByte = BLOCK_SIZE2 - left.length;
  for (let i = BLOCK_SIZE2 - paddingByte; i < BLOCK_SIZE2; i++) tmp[i] = paddingByte;
  return tmp32;
}
var cbc = /* @__PURE__ */ wrapCipher(
  { blockSize: 16, nonceLength: 16 },
  function aescbc(key, iv, opts = {}) {
    const pcks5 = !opts.disablePadding;
    return {
      encrypt(plaintext, dst) {
        const xk = expandKeyLE(key);
        const { b, o, out: _out } = validateBlockEncrypt(plaintext, pcks5, dst);
        let _iv = iv;
        const toClean = [xk];
        if (!isAligned32(_iv)) toClean.push(_iv = copyBytes2(_iv));
        const n32 = u322(_iv);
        let s0 = n32[0], s1 = n32[1], s2 = n32[2], s3 = n32[3];
        let i = 0;
        for (; i + 4 <= b.length; ) {
          s0 ^= b[i + 0], s1 ^= b[i + 1], s2 ^= b[i + 2], s3 ^= b[i + 3];
          ({ s0, s1, s2, s3 } = encrypt3(xk, s0, s1, s2, s3));
          o[i++] = s0, o[i++] = s1, o[i++] = s2, o[i++] = s3;
        }
        if (pcks5) {
          const tmp32 = padPCKS(plaintext.subarray(i * 4));
          s0 ^= tmp32[0], s1 ^= tmp32[1], s2 ^= tmp32[2], s3 ^= tmp32[3];
          ({ s0, s1, s2, s3 } = encrypt3(xk, s0, s1, s2, s3));
          o[i++] = s0, o[i++] = s1, o[i++] = s2, o[i++] = s3;
        }
        clean2(...toClean);
        return _out;
      },
      decrypt(ciphertext, dst) {
        validateBlockDecrypt(ciphertext);
        const xk = expandKeyDecLE(key);
        let _iv = iv;
        const toClean = [xk];
        if (!isAligned32(_iv)) toClean.push(_iv = copyBytes2(_iv));
        const n32 = u322(_iv);
        dst = getOutput(ciphertext.length, dst);
        if (!isAligned32(ciphertext)) toClean.push(ciphertext = copyBytes2(ciphertext));
        complexOverlapBytes(ciphertext, dst);
        const b = u322(ciphertext);
        const o = u322(dst);
        let s0 = n32[0], s1 = n32[1], s2 = n32[2], s3 = n32[3];
        for (let i = 0; i + 4 <= b.length; ) {
          const ps0 = s0, ps1 = s1, ps2 = s2, ps3 = s3;
          s0 = b[i + 0], s1 = b[i + 1], s2 = b[i + 2], s3 = b[i + 3];
          const { s0: o0, s1: o1, s2: o2, s3: o3 } = decrypt3(xk, s0, s1, s2, s3);
          o[i++] = o0 ^ ps0, o[i++] = o1 ^ ps1, o[i++] = o2 ^ ps2, o[i++] = o3 ^ ps3;
        }
        clean2(...toClean);
        return validatePCKS(dst, pcks5);
      }
    };
  }
);
var cfb = /* @__PURE__ */ wrapCipher(
  { blockSize: 16, nonceLength: 16 },
  function aescfb(key, iv) {
    function processCfb(src, isEncrypt, dst) {
      abytes2(src);
      const srcLen = src.length;
      dst = getOutput(srcLen, dst);
      if (overlapBytes(src, dst)) throw new Error("overlapping src and dst not supported.");
      const xk = expandKeyLE(key);
      let _iv = iv;
      const toClean = [xk];
      if (!isAligned32(_iv)) toClean.push(_iv = copyBytes2(_iv));
      if (!isAligned32(src)) toClean.push(src = copyBytes2(src));
      const src32 = u322(src);
      const dst32 = u322(dst);
      const next32 = isEncrypt ? dst32 : src32;
      const n32 = u322(_iv);
      let s0 = n32[0], s1 = n32[1], s2 = n32[2], s3 = n32[3];
      for (let i = 0; i + 4 <= src32.length; ) {
        const { s0: e0, s1: e1, s2: e2, s3: e3 } = encrypt3(xk, s0, s1, s2, s3);
        dst32[i + 0] = src32[i + 0] ^ e0;
        dst32[i + 1] = src32[i + 1] ^ e1;
        dst32[i + 2] = src32[i + 2] ^ e2;
        dst32[i + 3] = src32[i + 3] ^ e3;
        s0 = next32[i++], s1 = next32[i++], s2 = next32[i++], s3 = next32[i++];
      }
      const start = BLOCK_SIZE2 * Math.floor(src32.length / BLOCK_SIZE32);
      if (start < srcLen) {
        ({ s0, s1, s2, s3 } = encrypt3(xk, s0, s1, s2, s3));
        const buf = u8(new Uint32Array([s0, s1, s2, s3]));
        for (let i = start, pos = 0; i < srcLen; i++, pos++) dst[i] = src[i] ^ buf[pos];
        clean2(buf);
      }
      clean2(...toClean);
      return dst;
    }
    return {
      encrypt: (plaintext, dst) => processCfb(plaintext, true, dst),
      decrypt: (ciphertext, dst) => processCfb(ciphertext, false, dst)
    };
  }
);
function computeTag(fn, isLE3, key, data, AAD) {
  const aadLength = AAD ? AAD.length : 0;
  const h = fn.create(key, data.length + aadLength);
  if (AAD) h.update(AAD);
  const num = u64Lengths(8 * data.length, 8 * aadLength, isLE3);
  h.update(data);
  h.update(num);
  const res = h.digest();
  clean2(num);
  return res;
}
var gcm = /* @__PURE__ */ wrapCipher(
  { blockSize: 16, nonceLength: 12, tagLength: 16, varSizeNonce: true },
  function aesgcm(key, nonce, AAD) {
    if (nonce.length < 8) throw new Error("aes/gcm: invalid nonce length");
    const tagLength4 = 16;
    function _computeTag(authKey, tagMask, data) {
      const tag = computeTag(ghash, false, authKey, data, AAD);
      for (let i = 0; i < tagMask.length; i++) tag[i] ^= tagMask[i];
      return tag;
    }
    function deriveKeys() {
      const xk = expandKeyLE(key);
      const authKey = EMPTY_BLOCK.slice();
      const counter = EMPTY_BLOCK.slice();
      ctr32(xk, false, counter, counter, authKey);
      if (nonce.length === 12) {
        counter.set(nonce);
      } else {
        const nonceLen = EMPTY_BLOCK.slice();
        const view = createView2(nonceLen);
        setBigUint642(view, 8, BigInt(nonce.length * 8), false);
        const g = ghash.create(authKey).update(nonce).update(nonceLen);
        g.digestInto(counter);
        g.destroy();
      }
      const tagMask = ctr32(xk, false, counter, EMPTY_BLOCK);
      return { xk, authKey, counter, tagMask };
    }
    return {
      encrypt(plaintext) {
        const { xk, authKey, counter, tagMask } = deriveKeys();
        const out = new Uint8Array(plaintext.length + tagLength4);
        const toClean = [xk, authKey, counter, tagMask];
        if (!isAligned32(plaintext)) toClean.push(plaintext = copyBytes2(plaintext));
        ctr32(xk, false, counter, plaintext, out.subarray(0, plaintext.length));
        const tag = _computeTag(authKey, tagMask, out.subarray(0, out.length - tagLength4));
        toClean.push(tag);
        out.set(tag, plaintext.length);
        clean2(...toClean);
        return out;
      },
      decrypt(ciphertext) {
        const { xk, authKey, counter, tagMask } = deriveKeys();
        const toClean = [xk, authKey, tagMask, counter];
        if (!isAligned32(ciphertext)) toClean.push(ciphertext = copyBytes2(ciphertext));
        const data = ciphertext.subarray(0, -tagLength4);
        const passedTag = ciphertext.subarray(-tagLength4);
        const tag = _computeTag(authKey, tagMask, data);
        toClean.push(tag);
        if (!equalBytes2(tag, passedTag)) throw new Error("aes/gcm: invalid ghash tag");
        const out = ctr32(xk, false, counter, data);
        clean2(...toClean);
        return out;
      }
    };
  }
);
function isBytes32(a) {
  return a instanceof Uint32Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint32Array";
}
function encryptBlock(xk, block) {
  abytes2(block, 16);
  if (!isBytes32(xk)) throw new Error("_encryptBlock accepts result of expandKeyLE");
  const b32 = u322(block);
  let { s0, s1, s2, s3 } = encrypt3(xk, b32[0], b32[1], b32[2], b32[3]);
  b32[0] = s0, b32[1] = s1, b32[2] = s2, b32[3] = s3;
  return block;
}
function decryptBlock(xk, block) {
  abytes2(block, 16);
  if (!isBytes32(xk)) throw new Error("_decryptBlock accepts result of expandKeyLE");
  const b32 = u322(block);
  let { s0, s1, s2, s3 } = decrypt3(xk, b32[0], b32[1], b32[2], b32[3]);
  b32[0] = s0, b32[1] = s1, b32[2] = s2, b32[3] = s3;
  return block;
}
var AESW = {
  /*
  High-level pseudocode:
  ```
  A: u64 = IV
  out = []
  for (let i=0, ctr = 0; i<6; i++) {
    for (const chunk of chunks(plaintext, 8)) {
      A ^= swapEndianess(ctr++)
      [A, res] = chunks(encrypt(A || chunk), 8);
      out ||= res
    }
  }
  out = A || out
  ```
  Decrypt is the same, but reversed.
  */
  encrypt(kek, out) {
    if (out.length >= 2 ** 32) throw new Error("plaintext should be less than 4gb");
    const xk = expandKeyLE(kek);
    if (out.length === 16) encryptBlock(xk, out);
    else {
      const o32 = u322(out);
      let a0 = o32[0], a1 = o32[1];
      for (let j = 0, ctr2 = 1; j < 6; j++) {
        for (let pos = 2; pos < o32.length; pos += 2, ctr2++) {
          const { s0, s1, s2, s3 } = encrypt3(xk, a0, a1, o32[pos], o32[pos + 1]);
          a0 = s0, a1 = s1 ^ byteSwap2(ctr2), o32[pos] = s2, o32[pos + 1] = s3;
        }
      }
      o32[0] = a0, o32[1] = a1;
    }
    xk.fill(0);
  },
  decrypt(kek, out) {
    if (out.length - 8 >= 2 ** 32) throw new Error("ciphertext should be less than 4gb");
    const xk = expandKeyDecLE(kek);
    const chunks = out.length / 8 - 1;
    if (chunks === 1) decryptBlock(xk, out);
    else {
      const o32 = u322(out);
      let a0 = o32[0], a1 = o32[1];
      for (let j = 0, ctr2 = chunks * 6; j < 6; j++) {
        for (let pos = chunks * 2; pos >= 1; pos -= 2, ctr2--) {
          a1 ^= byteSwap2(ctr2);
          const { s0, s1, s2, s3 } = decrypt3(xk, a0, a1, o32[pos], o32[pos + 1]);
          a0 = s0, a1 = s1, o32[pos] = s2, o32[pos + 1] = s3;
        }
      }
      o32[0] = a0, o32[1] = a1;
    }
    xk.fill(0);
  }
};
var AESKW_IV = /* @__PURE__ */ new Uint8Array(8).fill(166);
var aeskw = /* @__PURE__ */ wrapCipher(
  { blockSize: 8 },
  (kek) => ({
    encrypt(plaintext) {
      if (!plaintext.length || plaintext.length % 8 !== 0)
        throw new Error("invalid plaintext length");
      if (plaintext.length === 8)
        throw new Error("8-byte keys not allowed in AESKW, use AESKWP instead");
      const out = concatBytes2(AESKW_IV, plaintext);
      AESW.encrypt(kek, out);
      return out;
    },
    decrypt(ciphertext) {
      if (ciphertext.length % 8 !== 0 || ciphertext.length < 3 * 8)
        throw new Error("invalid ciphertext length");
      const out = copyBytes2(ciphertext);
      AESW.decrypt(kek, out);
      if (!equalBytes2(out.subarray(0, 8), AESKW_IV)) throw new Error("integrity check failed");
      out.subarray(0, 8).fill(0);
      return out.subarray(8);
    }
  })
);
var unsafe = {
  expandKeyLE,
  expandKeyDecLE,
  encrypt: encrypt3,
  decrypt: decrypt3,
  encryptBlock,
  decryptBlock,
  ctrCounter,
  ctr32
};

// vendor/src/openpgpjs/src/crypto/cipher/index.js
async function getLegacyCipher(algo) {
  switch (algo) {
    case enums_default.symmetric.aes128:
    case enums_default.symmetric.aes192:
    case enums_default.symmetric.aes256:
      throw new Error("Not a legacy cipher");
    case enums_default.symmetric.cast5:
    case enums_default.symmetric.blowfish:
    case enums_default.symmetric.twofish:
    case enums_default.symmetric.tripledes: {
      const { legacyCiphers: legacyCiphers2 } = await Promise.resolve().then(() => (init_legacy_ciphers(), legacy_ciphers_exports));
      const algoName = enums_default.read(enums_default.symmetric, algo);
      const cipher = legacyCiphers2.get(algoName);
      if (!cipher) {
        throw new Error("Unsupported cipher algorithm");
      }
      return cipher;
    }
    default:
      throw new Error("Unsupported cipher algorithm");
  }
}
function getCipherBlockSize(algo) {
  switch (algo) {
    case enums_default.symmetric.aes128:
    case enums_default.symmetric.aes192:
    case enums_default.symmetric.aes256:
    case enums_default.symmetric.twofish:
      return 16;
    case enums_default.symmetric.blowfish:
    case enums_default.symmetric.cast5:
    case enums_default.symmetric.tripledes:
      return 8;
    default:
      throw new Error("Unsupported cipher");
  }
}
function getCipherKeySize(algo) {
  switch (algo) {
    case enums_default.symmetric.aes128:
    case enums_default.symmetric.blowfish:
    case enums_default.symmetric.cast5:
      return 16;
    case enums_default.symmetric.aes192:
    case enums_default.symmetric.tripledes:
      return 24;
    case enums_default.symmetric.aes256:
    case enums_default.symmetric.twofish:
      return 32;
    default:
      throw new Error("Unsupported cipher");
  }
}
function getCipherParams(algo) {
  return { keySize: getCipherKeySize(algo), blockSize: getCipherBlockSize(algo) };
}

// vendor/src/openpgpjs/src/crypto/aes_kw.js
var webCrypto3 = util_default.getWebCrypto();
async function wrap(algo, key, dataToWrap) {
  const { keySize } = getCipherParams(algo);
  if (!util_default.isAES(algo) || key.length !== keySize) {
    throw new Error("Unexpected algorithm or key size");
  }
  try {
    const wrappingKey = await webCrypto3.importKey("raw", key, { name: "AES-KW" }, false, ["wrapKey"]);
    const keyToWrap = await webCrypto3.importKey("raw", dataToWrap, { name: "HMAC", hash: "SHA-256" }, true, ["sign"]);
    const wrapped = await webCrypto3.wrapKey("raw", keyToWrap, wrappingKey, { name: "AES-KW" });
    return new Uint8Array(wrapped);
  } catch (err2) {
    if (err2.name !== "NotSupportedError" && !(key.length === 24 && err2.name === "OperationError")) {
      throw err2;
    }
    util_default.printDebugError("Browser did not support operation: " + err2.message);
  }
  return aeskw(key).encrypt(dataToWrap);
}
async function unwrap(algo, key, wrappedData) {
  const { keySize } = getCipherParams(algo);
  if (!util_default.isAES(algo) || key.length !== keySize) {
    throw new Error("Unexpected algorithm or key size");
  }
  let wrappingKey;
  try {
    wrappingKey = await webCrypto3.importKey("raw", key, { name: "AES-KW" }, false, ["unwrapKey"]);
  } catch (err2) {
    if (err2.name !== "NotSupportedError" && !(key.length === 24 && err2.name === "OperationError")) {
      throw err2;
    }
    util_default.printDebugError("Browser did not support operation: " + err2.message);
    return aeskw(key).decrypt(wrappedData);
  }
  try {
    const unwrapped = await webCrypto3.unwrapKey("raw", wrappedData, wrappingKey, { name: "AES-KW" }, { name: "HMAC", hash: "SHA-256" }, true, ["sign"]);
    return new Uint8Array(await webCrypto3.exportKey("raw", unwrapped));
  } catch (err2) {
    if (err2.name === "OperationError") {
      throw new Error("Key Data Integrity failed");
    }
    throw err2;
  }
}

// vendor/src/openpgpjs/src/crypto/hkdf.js
async function computeHKDF(hashAlgo, inputKey, salt, info, outLen) {
  const webCrypto10 = util_default.getWebCrypto();
  const hash = enums_default.read(enums_default.webHash, hashAlgo);
  if (!hash) throw new Error("Hash algo not supported with HKDF");
  const importedKey = await webCrypto10.importKey("raw", inputKey, "HKDF", false, ["deriveBits"]);
  const bits2 = await webCrypto10.deriveBits({ name: "HKDF", hash, salt, info }, importedKey, outLen * 8);
  return new Uint8Array(bits2);
}

// vendor/src/openpgpjs/src/crypto/public_key/elliptic/ecdh_x.js
var HKDF_INFO = {
  x25519: util_default.encodeUTF8("OpenPGP X25519"),
  x448: util_default.encodeUTF8("OpenPGP X448")
};
async function generate3(algo) {
  switch (algo) {
    case enums_default.publicKey.x25519:
      try {
        const webCrypto10 = util_default.getWebCrypto();
        const webCryptoKey = await webCrypto10.generateKey("X25519", true, ["deriveKey", "deriveBits"]).catch((err2) => {
          if (err2.name === "OperationError") {
            const newErr = new Error("Unexpected key generation issue");
            newErr.name = "NotSupportedError";
            throw newErr;
          }
          throw err2;
        });
        const privateKey = await webCrypto10.exportKey("jwk", webCryptoKey.privateKey);
        const publicKey = await webCrypto10.exportKey("jwk", webCryptoKey.publicKey);
        if (privateKey.x !== publicKey.x) {
          const err2 = new Error("Unexpected mismatching public point");
          err2.name = "NotSupportedError";
          throw err2;
        }
        return {
          A: new Uint8Array(b64ToUint8Array(publicKey.x)),
          k: b64ToUint8Array(privateKey.d)
        };
      } catch (err2) {
        if (err2.name !== "NotSupportedError") {
          throw err2;
        }
        const { default: x25519 } = await Promise.resolve().then(() => (init_nacl_fast(), nacl_fast_exports));
        const { secretKey: k, publicKey: A2 } = x25519.box.keyPair();
        return { A: A2, k };
      }
    case enums_default.publicKey.x448: {
      const x4482 = await util_default.getNobleCurve(enums_default.publicKey.x448);
      const { secretKey: k, publicKey: A2 } = x4482.keygen();
      return { A: A2, k };
    }
    default:
      throw new Error("Unsupported ECDH algorithm");
  }
}
async function validateParams4(algo, A2, k) {
  switch (algo) {
    case enums_default.publicKey.x25519:
      try {
        const { ephemeralPublicKey, sharedSecret } = await generateEphemeralEncryptionMaterial(algo, A2);
        const recomputedSharedSecret = await recomputeSharedSecret(algo, ephemeralPublicKey, A2, k);
        return util_default.equalsUint8Array(sharedSecret, recomputedSharedSecret);
      } catch {
        return false;
      }
    case enums_default.publicKey.x448: {
      const x4482 = await util_default.getNobleCurve(enums_default.publicKey.x448);
      const publicKey = x4482.getPublicKey(k);
      return util_default.equalsUint8Array(A2, publicKey);
    }
    default:
      return false;
  }
}
async function encrypt4(algo, data, recipientA) {
  const { ephemeralPublicKey, sharedSecret } = await generateEphemeralEncryptionMaterial(algo, recipientA);
  const hkdfInput = util_default.concatUint8Array([
    ephemeralPublicKey,
    recipientA,
    sharedSecret
  ]);
  switch (algo) {
    case enums_default.publicKey.x25519: {
      const cipherAlgo = enums_default.symmetric.aes128;
      const { keySize } = getCipherParams(cipherAlgo);
      const encryptionKey = await computeHKDF(enums_default.hash.sha256, hkdfInput, new Uint8Array(), HKDF_INFO.x25519, keySize);
      const wrappedKey = await wrap(cipherAlgo, encryptionKey, data);
      return { ephemeralPublicKey, wrappedKey };
    }
    case enums_default.publicKey.x448: {
      const cipherAlgo = enums_default.symmetric.aes256;
      const { keySize } = getCipherParams(enums_default.symmetric.aes256);
      const encryptionKey = await computeHKDF(enums_default.hash.sha512, hkdfInput, new Uint8Array(), HKDF_INFO.x448, keySize);
      const wrappedKey = await wrap(cipherAlgo, encryptionKey, data);
      return { ephemeralPublicKey, wrappedKey };
    }
    default:
      throw new Error("Unsupported ECDH algorithm");
  }
}
async function decrypt4(algo, ephemeralPublicKey, wrappedKey, A2, k) {
  const sharedSecret = await recomputeSharedSecret(algo, ephemeralPublicKey, A2, k);
  const hkdfInput = util_default.concatUint8Array([
    ephemeralPublicKey,
    A2,
    sharedSecret
  ]);
  switch (algo) {
    case enums_default.publicKey.x25519: {
      const cipherAlgo = enums_default.symmetric.aes128;
      const { keySize } = getCipherParams(cipherAlgo);
      const encryptionKey = await computeHKDF(enums_default.hash.sha256, hkdfInput, new Uint8Array(), HKDF_INFO.x25519, keySize);
      return unwrap(cipherAlgo, encryptionKey, wrappedKey);
    }
    case enums_default.publicKey.x448: {
      const cipherAlgo = enums_default.symmetric.aes256;
      const { keySize } = getCipherParams(enums_default.symmetric.aes256);
      const encryptionKey = await computeHKDF(enums_default.hash.sha512, hkdfInput, new Uint8Array(), HKDF_INFO.x448, keySize);
      return unwrap(cipherAlgo, encryptionKey, wrappedKey);
    }
    default:
      throw new Error("Unsupported ECDH algorithm");
  }
}
function getPayloadSize2(algo) {
  switch (algo) {
    case enums_default.publicKey.x25519:
      return 32;
    case enums_default.publicKey.x448:
      return 56;
    default:
      throw new Error("Unsupported ECDH algorithm");
  }
}
async function generateEphemeralEncryptionMaterial(algo, recipientA) {
  switch (algo) {
    case enums_default.publicKey.x25519:
      try {
        const webCrypto10 = util_default.getWebCrypto();
        const ephemeralKeyPair = await webCrypto10.generateKey("X25519", true, ["deriveKey", "deriveBits"]).catch((err2) => {
          if (err2.name === "OperationError") {
            const newErr = new Error("Unexpected key generation issue");
            newErr.name = "NotSupportedError";
            throw newErr;
          }
          throw err2;
        });
        const ephemeralPublicKeyJwt = await webCrypto10.exportKey("jwk", ephemeralKeyPair.publicKey);
        const ephemeralPrivateKeyJwt = await webCrypto10.exportKey("jwk", ephemeralKeyPair.privateKey);
        if (ephemeralPrivateKeyJwt.x !== ephemeralPublicKeyJwt.x) {
          const err2 = new Error("Unexpected mismatching public point");
          err2.name = "NotSupportedError";
          throw err2;
        }
        const jwk = publicKeyToJWK2(algo, recipientA);
        const recipientPublicKey = await webCrypto10.importKey("jwk", jwk, "X25519", false, []);
        const sharedSecretBuffer = await webCrypto10.deriveBits(
          { name: "X25519", public: recipientPublicKey },
          ephemeralKeyPair.privateKey,
          getPayloadSize2(algo) * 8
          // in bits
        );
        return {
          sharedSecret: new Uint8Array(sharedSecretBuffer),
          ephemeralPublicKey: new Uint8Array(b64ToUint8Array(ephemeralPublicKeyJwt.x))
        };
      } catch (err2) {
        if (err2.name !== "NotSupportedError") {
          throw err2;
        }
        const { default: x25519 } = await Promise.resolve().then(() => (init_nacl_fast(), nacl_fast_exports));
        const { secretKey: ephemeralSecretKey, publicKey: ephemeralPublicKey } = x25519.box.keyPair();
        const sharedSecret = x25519.scalarMult(ephemeralSecretKey, recipientA);
        assertNonZeroArray(sharedSecret);
        return { ephemeralPublicKey, sharedSecret };
      }
    case enums_default.publicKey.x448: {
      const x4482 = await util_default.getNobleCurve(enums_default.publicKey.x448);
      const { secretKey: ephemeralSecretKey, publicKey: ephemeralPublicKey } = x4482.keygen();
      const sharedSecret = x4482.getSharedSecret(ephemeralSecretKey, recipientA);
      assertNonZeroArray(sharedSecret);
      return { ephemeralPublicKey, sharedSecret };
    }
    default:
      throw new Error("Unsupported ECDH algorithm");
  }
}
async function recomputeSharedSecret(algo, ephemeralPublicKey, A2, k) {
  switch (algo) {
    case enums_default.publicKey.x25519:
      try {
        const webCrypto10 = util_default.getWebCrypto();
        const privateKeyJWK = privateKeyToJWK2(algo, A2, k);
        const ephemeralPublicKeyJWK = publicKeyToJWK2(algo, ephemeralPublicKey);
        const privateKey = await webCrypto10.importKey("jwk", privateKeyJWK, "X25519", false, ["deriveKey", "deriveBits"]);
        const ephemeralPublicKeyReference = await webCrypto10.importKey("jwk", ephemeralPublicKeyJWK, "X25519", false, []);
        const sharedSecretBuffer = await webCrypto10.deriveBits(
          { name: "X25519", public: ephemeralPublicKeyReference },
          privateKey,
          getPayloadSize2(algo) * 8
          // in bits
        );
        return new Uint8Array(sharedSecretBuffer);
      } catch (err2) {
        if (err2.name !== "NotSupportedError") {
          throw err2;
        }
        const { default: x25519 } = await Promise.resolve().then(() => (init_nacl_fast(), nacl_fast_exports));
        const sharedSecret = x25519.scalarMult(k, ephemeralPublicKey);
        assertNonZeroArray(sharedSecret);
        return sharedSecret;
      }
    case enums_default.publicKey.x448: {
      const x4482 = await util_default.getNobleCurve(enums_default.publicKey.x448);
      const sharedSecret = x4482.getSharedSecret(k, ephemeralPublicKey);
      assertNonZeroArray(sharedSecret);
      return sharedSecret;
    }
    default:
      throw new Error("Unsupported ECDH algorithm");
  }
}
function assertNonZeroArray(sharedSecret) {
  let acc = 0;
  for (let i = 0; i < sharedSecret.length; i++) {
    acc |= sharedSecret[i];
  }
  if (acc === 0) {
    throw new Error("Unexpected low order point");
  }
}
function publicKeyToJWK2(algo, publicKey) {
  switch (algo) {
    case enums_default.publicKey.x25519: {
      const jwk = {
        kty: "OKP",
        crv: "X25519",
        x: uint8ArrayToB64(publicKey, true),
        ext: true
      };
      return jwk;
    }
    default:
      throw new Error("Unsupported ECDH algorithm");
  }
}
function privateKeyToJWK2(algo, publicKey, privateKey) {
  switch (algo) {
    case enums_default.publicKey.x25519: {
      const jwk = publicKeyToJWK2(algo, publicKey);
      jwk.d = uint8ArrayToB64(privateKey, true);
      return jwk;
    }
    default:
      throw new Error("Unsupported ECDH algorithm");
  }
}

// vendor/src/openpgpjs/src/crypto/public_key/elliptic/oid_curves.js
var webCrypto4 = util_default.getWebCrypto();
var nodeCrypto4 = util_default.getNodeCrypto();
var webCurves = {
  [enums_default.curve.nistP256]: "P-256",
  [enums_default.curve.nistP384]: "P-384",
  [enums_default.curve.nistP521]: "P-521"
};
var knownCurves = nodeCrypto4 ? nodeCrypto4.getCurves() : [];
var nodeCurves = nodeCrypto4 ? {
  [enums_default.curve.secp256k1]: knownCurves.includes("secp256k1") ? "secp256k1" : void 0,
  [enums_default.curve.nistP256]: knownCurves.includes("prime256v1") ? "prime256v1" : void 0,
  [enums_default.curve.nistP384]: knownCurves.includes("secp384r1") ? "secp384r1" : void 0,
  [enums_default.curve.nistP521]: knownCurves.includes("secp521r1") ? "secp521r1" : void 0,
  [enums_default.curve.ed25519Legacy]: knownCurves.includes("ED25519") ? "ED25519" : void 0,
  [enums_default.curve.curve25519Legacy]: knownCurves.includes("X25519") ? "X25519" : void 0,
  [enums_default.curve.brainpoolP256r1]: knownCurves.includes("brainpoolP256r1") ? "brainpoolP256r1" : void 0,
  [enums_default.curve.brainpoolP384r1]: knownCurves.includes("brainpoolP384r1") ? "brainpoolP384r1" : void 0,
  [enums_default.curve.brainpoolP512r1]: knownCurves.includes("brainpoolP512r1") ? "brainpoolP512r1" : void 0
} : {};
var curves = {
  [enums_default.curve.nistP256]: {
    oid: [6, 8, 42, 134, 72, 206, 61, 3, 1, 7],
    keyType: enums_default.publicKey.ecdsa,
    hash: enums_default.hash.sha256,
    cipher: enums_default.symmetric.aes128,
    node: nodeCurves[enums_default.curve.nistP256],
    web: webCurves[enums_default.curve.nistP256],
    payloadSize: 32,
    sharedSize: 256,
    wireFormatLeadingByte: 4
  },
  [enums_default.curve.nistP384]: {
    oid: [6, 5, 43, 129, 4, 0, 34],
    keyType: enums_default.publicKey.ecdsa,
    hash: enums_default.hash.sha384,
    cipher: enums_default.symmetric.aes192,
    node: nodeCurves[enums_default.curve.nistP384],
    web: webCurves[enums_default.curve.nistP384],
    payloadSize: 48,
    sharedSize: 384,
    wireFormatLeadingByte: 4
  },
  [enums_default.curve.nistP521]: {
    oid: [6, 5, 43, 129, 4, 0, 35],
    keyType: enums_default.publicKey.ecdsa,
    hash: enums_default.hash.sha512,
    cipher: enums_default.symmetric.aes256,
    node: nodeCurves[enums_default.curve.nistP521],
    web: webCurves[enums_default.curve.nistP521],
    payloadSize: 66,
    sharedSize: 528,
    wireFormatLeadingByte: 4
  },
  [enums_default.curve.secp256k1]: {
    oid: [6, 5, 43, 129, 4, 0, 10],
    keyType: enums_default.publicKey.ecdsa,
    hash: enums_default.hash.sha256,
    cipher: enums_default.symmetric.aes128,
    node: nodeCurves[enums_default.curve.secp256k1],
    payloadSize: 32,
    wireFormatLeadingByte: 4
  },
  [enums_default.curve.ed25519Legacy]: {
    oid: [6, 9, 43, 6, 1, 4, 1, 218, 71, 15, 1],
    keyType: enums_default.publicKey.eddsaLegacy,
    hash: enums_default.hash.sha512,
    node: false,
    // nodeCurves.ed25519 TODO
    payloadSize: 32,
    wireFormatLeadingByte: 64
  },
  [enums_default.curve.curve25519Legacy]: {
    oid: [6, 10, 43, 6, 1, 4, 1, 151, 85, 1, 5, 1],
    keyType: enums_default.publicKey.ecdh,
    hash: enums_default.hash.sha256,
    cipher: enums_default.symmetric.aes128,
    node: false,
    // nodeCurves.curve25519 TODO
    payloadSize: 32,
    wireFormatLeadingByte: 64
  },
  [enums_default.curve.brainpoolP256r1]: {
    oid: [6, 9, 43, 36, 3, 3, 2, 8, 1, 1, 7],
    keyType: enums_default.publicKey.ecdsa,
    hash: enums_default.hash.sha256,
    cipher: enums_default.symmetric.aes128,
    node: nodeCurves[enums_default.curve.brainpoolP256r1],
    payloadSize: 32,
    wireFormatLeadingByte: 4
  },
  [enums_default.curve.brainpoolP384r1]: {
    oid: [6, 9, 43, 36, 3, 3, 2, 8, 1, 1, 11],
    keyType: enums_default.publicKey.ecdsa,
    hash: enums_default.hash.sha384,
    cipher: enums_default.symmetric.aes192,
    node: nodeCurves[enums_default.curve.brainpoolP384r1],
    payloadSize: 48,
    wireFormatLeadingByte: 4
  },
  [enums_default.curve.brainpoolP512r1]: {
    oid: [6, 9, 43, 36, 3, 3, 2, 8, 1, 1, 13],
    keyType: enums_default.publicKey.ecdsa,
    hash: enums_default.hash.sha512,
    cipher: enums_default.symmetric.aes256,
    node: nodeCurves[enums_default.curve.brainpoolP512r1],
    payloadSize: 64,
    wireFormatLeadingByte: 4
  }
};
var CurveWithOID = class {
  constructor(oidOrName) {
    try {
      this.name = oidOrName instanceof oid_default ? oidOrName.getName() : enums_default.write(enums_default.curve, oidOrName);
    } catch {
      throw new UnsupportedError("Unknown curve");
    }
    const params = curves[this.name];
    this.keyType = params.keyType;
    this.oid = params.oid;
    this.hash = params.hash;
    this.cipher = params.cipher;
    this.node = params.node;
    this.web = params.web;
    this.payloadSize = params.payloadSize;
    this.sharedSize = params.sharedSize;
    this.wireFormatLeadingByte = params.wireFormatLeadingByte;
    if (this.web && util_default.getWebCrypto()) {
      this.type = "web";
    } else if (this.node && util_default.getNodeCrypto()) {
      this.type = "node";
    } else if (this.name === enums_default.curve.curve25519Legacy) {
      this.type = "curve25519Legacy";
    } else if (this.name === enums_default.curve.ed25519Legacy) {
      this.type = "ed25519Legacy";
    }
  }
  async genKeyPair() {
    switch (this.type) {
      case "web":
        try {
          return await webGenKeyPair(this.name, this.wireFormatLeadingByte);
        } catch (err2) {
          util_default.printDebugError("Browser did not support generating ec key " + err2.message);
          return jsGenKeyPair(this.name);
        }
      case "node":
        return nodeGenKeyPair(this.name);
      case "curve25519Legacy": {
        const { k, A: A2 } = await generate3(enums_default.publicKey.x25519);
        const privateKey = k.slice().reverse();
        privateKey[0] = privateKey[0] & 127 | 64;
        privateKey[31] &= 248;
        const publicKey = util_default.concatUint8Array([new Uint8Array([this.wireFormatLeadingByte]), A2]);
        return { publicKey, privateKey };
      }
      case "ed25519Legacy": {
        const { seed: privateKey, A: A2 } = await generate2(enums_default.publicKey.ed25519);
        const publicKey = util_default.concatUint8Array([new Uint8Array([this.wireFormatLeadingByte]), A2]);
        return { publicKey, privateKey };
      }
      default:
        return jsGenKeyPair(this.name);
    }
  }
};
async function generate4(curveName) {
  const curve = new CurveWithOID(curveName);
  const { oid, hash, cipher } = curve;
  const keyPair = await curve.genKeyPair();
  return {
    oid,
    Q: keyPair.publicKey,
    secret: util_default.leftPad(keyPair.privateKey, curve.payloadSize),
    hash,
    cipher
  };
}
function getPreferredHashAlgo2(oid) {
  return curves[oid.getName()].hash;
}
async function validateStandardParams(algo, oid, Q, d) {
  const supportedCurves = {
    [enums_default.curve.nistP256]: true,
    [enums_default.curve.nistP384]: true,
    [enums_default.curve.nistP521]: true,
    [enums_default.curve.secp256k1]: true,
    [enums_default.curve.curve25519Legacy]: algo === enums_default.publicKey.ecdh,
    [enums_default.curve.brainpoolP256r1]: true,
    [enums_default.curve.brainpoolP384r1]: true,
    [enums_default.curve.brainpoolP512r1]: true
  };
  const curveName = oid.getName();
  if (!supportedCurves[curveName]) {
    return false;
  }
  if (curveName === enums_default.curve.curve25519Legacy) {
    const dLittleEndian = d.slice().reverse();
    if (Q.length < 1 || Q[0] !== 64) {
      return false;
    }
    return validateParams4(enums_default.publicKey.x25519, Q.subarray(1), dLittleEndian);
  }
  const nobleCurve = await util_default.getNobleCurve(enums_default.publicKey.ecdsa, curveName);
  const dG = nobleCurve.getPublicKey(d, false);
  if (!util_default.equalsUint8Array(dG, Q)) {
    return false;
  }
  return true;
}
function checkPublicPointEnconding(curve, V) {
  const { payloadSize, wireFormatLeadingByte, name: curveName } = curve;
  const pointSize = curveName === enums_default.curve.curve25519Legacy || curveName === enums_default.curve.ed25519Legacy ? payloadSize : payloadSize * 2;
  if (V[0] !== wireFormatLeadingByte || V.length !== pointSize + 1) {
    throw new Error("Invalid point encoding");
  }
}
async function jsGenKeyPair(name) {
  const nobleCurve = await util_default.getNobleCurve(enums_default.publicKey.ecdsa, name);
  const { secretKey: privateKey } = nobleCurve.keygen();
  const publicKey = nobleCurve.getPublicKey(privateKey, false);
  return { publicKey, privateKey };
}
async function webGenKeyPair(name, wireFormatLeadingByte) {
  const webCryptoKey = await webCrypto4.generateKey({ name: "ECDSA", namedCurve: webCurves[name] }, true, ["sign", "verify"]);
  const privateKey = await webCrypto4.exportKey("jwk", webCryptoKey.privateKey);
  const publicKey = await webCrypto4.exportKey("jwk", webCryptoKey.publicKey);
  return {
    publicKey: jwkToRawPublic(publicKey, wireFormatLeadingByte),
    privateKey: b64ToUint8Array(privateKey.d, true)
  };
}
function nodeGenKeyPair(name) {
  const ecdh2 = nodeCrypto4.createECDH(nodeCurves[name]);
  ecdh2.generateKeys();
  return {
    publicKey: new Uint8Array(ecdh2.getPublicKey()),
    privateKey: new Uint8Array(ecdh2.getPrivateKey())
  };
}
function jwkToRawPublic(jwk, wireFormatLeadingByte) {
  const bufX = b64ToUint8Array(jwk.x);
  const bufY = b64ToUint8Array(jwk.y);
  const publicKey = new Uint8Array(bufX.length + bufY.length + 1);
  publicKey[0] = wireFormatLeadingByte;
  publicKey.set(bufX, 1);
  publicKey.set(bufY, bufX.length + 1);
  return publicKey;
}
function rawPublicToJWK(payloadSize, name, publicKey) {
  const len = payloadSize;
  const bufX = publicKey.slice(1, len + 1);
  const bufY = publicKey.slice(len + 1, len * 2 + 1);
  const jwk = {
    kty: "EC",
    crv: name,
    x: uint8ArrayToB64(bufX, true),
    y: uint8ArrayToB64(bufY, true),
    ext: true
  };
  return jwk;
}
function privateToJWK2(payloadSize, name, publicKey, privateKey) {
  const jwk = rawPublicToJWK(payloadSize, name, publicKey);
  jwk.d = uint8ArrayToB64(privateKey, true);
  return jwk;
}

// vendor/src/openpgpjs/src/crypto/public_key/elliptic/ecdsa.js
var ecdsa_exports = {};
__export(ecdsa_exports, {
  sign: () => sign3,
  validateParams: () => validateParams5,
  verify: () => verify3
});
var webCrypto5 = util_default.getWebCrypto();
var nodeCrypto5 = util_default.getNodeCrypto();
async function sign3(oid, hashAlgo, message, publicKey, privateKey, hashed) {
  const curve = new CurveWithOID(oid);
  checkPublicPointEnconding(curve, publicKey);
  if (message && !util_default.isStream(message)) {
    const keyPair = { publicKey, privateKey };
    switch (curve.type) {
      case "web":
        try {
          return await webSign2(curve, hashAlgo, message, keyPair);
        } catch (err2) {
          if (curve.name !== "nistP521" && (err2.name === "DataError" || err2.name === "OperationError")) {
            throw err2;
          }
          util_default.printDebugError("Browser did not support signing: " + err2.message);
        }
        break;
      case "node":
        return nodeSign2(curve, hashAlgo, message, privateKey);
    }
  }
  const nobleCurve = await util_default.getNobleCurve(enums_default.publicKey.ecdsa, curve.name);
  const signature = nobleCurve.sign(hashed, privateKey, { lowS: false });
  return {
    r: bigIntToUint8Array(signature.r, "be", curve.payloadSize),
    s: bigIntToUint8Array(signature.s, "be", curve.payloadSize)
  };
}
async function verify3(oid, hashAlgo, signature, message, publicKey, hashed) {
  const curve = new CurveWithOID(oid);
  checkPublicPointEnconding(curve, publicKey);
  const tryFallbackVerificationForOldBug = async () => hashed[0] === 0 ? jsVerify(curve, signature, hashed.subarray(1), publicKey) : false;
  if (message && !util_default.isStream(message)) {
    switch (curve.type) {
      case "web":
        try {
          const verified3 = await webVerify2(curve, hashAlgo, signature, message, publicKey);
          return verified3 || tryFallbackVerificationForOldBug();
        } catch (err2) {
          if (curve.name !== "nistP521" && (err2.name === "DataError" || err2.name === "OperationError")) {
            throw err2;
          }
          util_default.printDebugError("Browser did not support verifying: " + err2.message);
        }
        break;
      case "node": {
        const verified3 = nodeVerify2(curve, hashAlgo, signature, message, publicKey);
        return verified3 || tryFallbackVerificationForOldBug();
      }
    }
  }
  const verified2 = await jsVerify(curve, signature, hashed, publicKey);
  return verified2 || tryFallbackVerificationForOldBug();
}
async function validateParams5(oid, Q, d) {
  const curve = new CurveWithOID(oid);
  if (curve.keyType !== enums_default.publicKey.ecdsa) {
    return false;
  }
  switch (curve.type) {
    case "web":
    case "node": {
      const message = getRandomBytes(8);
      const hashAlgo = enums_default.hash.sha256;
      const hashed = await computeDigest(hashAlgo, message);
      try {
        const signature = await sign3(oid, hashAlgo, message, Q, d, hashed);
        return await verify3(oid, hashAlgo, signature, message, Q, hashed);
      } catch {
        return false;
      }
    }
    default:
      return validateStandardParams(enums_default.publicKey.ecdsa, oid, Q, d);
  }
}
async function jsVerify(curve, signature, hashed, publicKey) {
  const nobleCurve = await util_default.getNobleCurve(enums_default.publicKey.ecdsa, curve.name);
  return nobleCurve.verify(util_default.concatUint8Array([signature.r, signature.s]), hashed, publicKey, { lowS: false });
}
async function webSign2(curve, hashAlgo, message, keyPair) {
  const len = curve.payloadSize;
  const jwk = privateToJWK2(curve.payloadSize, webCurves[curve.name], keyPair.publicKey, keyPair.privateKey);
  const key = await webCrypto5.importKey(
    "jwk",
    jwk,
    {
      "name": "ECDSA",
      "namedCurve": webCurves[curve.name],
      "hash": { name: enums_default.read(enums_default.webHash, curve.hash) }
    },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await webCrypto5.sign(
    {
      "name": "ECDSA",
      "namedCurve": webCurves[curve.name],
      "hash": { name: enums_default.read(enums_default.webHash, hashAlgo) }
    },
    key,
    message
  ));
  return {
    r: signature.slice(0, len),
    s: signature.slice(len, len << 1)
  };
}
async function webVerify2(curve, hashAlgo, { r, s }, message, publicKey) {
  const jwk = rawPublicToJWK(curve.payloadSize, webCurves[curve.name], publicKey);
  const key = await webCrypto5.importKey(
    "jwk",
    jwk,
    {
      "name": "ECDSA",
      "namedCurve": webCurves[curve.name],
      "hash": { name: enums_default.read(enums_default.webHash, curve.hash) }
    },
    false,
    ["verify"]
  );
  const signature = util_default.concatUint8Array([r, s]).buffer;
  return webCrypto5.verify(
    {
      "name": "ECDSA",
      "namedCurve": webCurves[curve.name],
      "hash": { name: enums_default.read(enums_default.webHash, hashAlgo) }
    },
    key,
    signature,
    message
  );
}
function nodeSign2(curve, hashAlgo, message, privateKey) {
  const ecKeyUtils = util_default.nodeRequire("eckey-utils");
  const nodeBuffer = util_default.getNodeBuffer();
  const { privateKey: derPrivateKey } = ecKeyUtils.generateDer({
    curveName: nodeCurves[curve.name],
    privateKey: nodeBuffer.from(privateKey)
  });
  const sign8 = nodeCrypto5.createSign(enums_default.read(enums_default.hash, hashAlgo));
  sign8.write(message);
  sign8.end();
  const signature = new Uint8Array(sign8.sign({ key: derPrivateKey, format: "der", type: "sec1", dsaEncoding: "ieee-p1363" }));
  const len = curve.payloadSize;
  return {
    r: signature.subarray(0, len),
    s: signature.subarray(len, len << 1)
  };
}
function nodeVerify2(curve, hashAlgo, { r, s }, message, publicKey) {
  const ecKeyUtils = util_default.nodeRequire("eckey-utils");
  const nodeBuffer = util_default.getNodeBuffer();
  const { publicKey: derPublicKey } = ecKeyUtils.generateDer({
    curveName: nodeCurves[curve.name],
    publicKey: nodeBuffer.from(publicKey)
  });
  const verify8 = nodeCrypto5.createVerify(enums_default.read(enums_default.hash, hashAlgo));
  verify8.write(message);
  verify8.end();
  const signature = util_default.concatUint8Array([r, s]);
  try {
    return verify8.verify({ key: derPublicKey, format: "der", type: "spki", dsaEncoding: "ieee-p1363" }, signature);
  } catch {
    return false;
  }
}

// vendor/src/openpgpjs/src/crypto/public_key/elliptic/eddsa_legacy.js
var eddsa_legacy_exports = {};
__export(eddsa_legacy_exports, {
  sign: () => sign4,
  validateParams: () => validateParams6,
  verify: () => verify4
});
async function sign4(oid, hashAlgo, message, publicKey, privateKey, hashed) {
  const curve = new CurveWithOID(oid);
  checkPublicPointEnconding(curve, publicKey);
  if (getHashByteLength(hashAlgo) < getHashByteLength(enums_default.hash.sha256)) {
    throw new Error("Hash algorithm too weak for EdDSA.");
  }
  const { RS: signature } = await sign2(enums_default.publicKey.ed25519, hashAlgo, message, publicKey.subarray(1), privateKey, hashed);
  return {
    r: signature.subarray(0, 32),
    s: signature.subarray(32)
  };
}
async function verify4(oid, hashAlgo, { r, s }, m, publicKey, hashed) {
  const curve = new CurveWithOID(oid);
  checkPublicPointEnconding(curve, publicKey);
  if (getHashByteLength(hashAlgo) < getHashByteLength(enums_default.hash.sha256)) {
    throw new Error("Hash algorithm too weak for EdDSA.");
  }
  const RS = util_default.concatUint8Array([r, s]);
  return verify2(enums_default.publicKey.ed25519, hashAlgo, { RS }, m, publicKey.subarray(1), hashed);
}
async function validateParams6(oid, Q, k) {
  if (oid.getName() !== enums_default.curve.ed25519Legacy) {
    return false;
  }
  if (Q.length < 1 || Q[0] !== 64) {
    return false;
  }
  return validateParams3(enums_default.publicKey.ed25519, Q.subarray(1), k);
}

// vendor/src/openpgpjs/src/crypto/public_key/elliptic/ecdh.js
var ecdh_exports = {};
__export(ecdh_exports, {
  decrypt: () => decrypt5,
  encrypt: () => encrypt5,
  validateParams: () => validateParams7
});

// vendor/src/openpgpjs/src/crypto/pkcs5.js
function encode2(message) {
  const c = 8 - message.length % 8;
  const padded = new Uint8Array(message.length + c).fill(c);
  padded.set(message);
  return padded;
}
function decode2(message) {
  const len = message.length;
  if (len > 0) {
    const c = message[len - 1];
    if (c >= 1) {
      const provided = message.subarray(len - c);
      const computed = new Uint8Array(c).fill(c);
      if (util_default.equalsUint8Array(provided, computed)) {
        return message.subarray(0, len - c);
      }
    }
  }
  throw new Error("Invalid padding");
}

// vendor/src/openpgpjs/src/crypto/public_key/elliptic/ecdh.js
async function validateParams7(oid, Q, d) {
  return validateStandardParams(enums_default.publicKey.ecdh, oid, Q, d);
}
function buildEcdhParam(public_algo, oid, kdfParams, fingerprint) {
  return util_default.concatUint8Array([
    oid.write(),
    new Uint8Array([public_algo]),
    kdfParams.write(),
    util_default.stringToUint8Array("Anonymous Sender    "),
    fingerprint
  ]);
}
async function kdf(hashAlgo, X2, length, param, stripLeading = false, stripTrailing = false) {
  let i;
  if (stripLeading) {
    for (i = 0; i < X2.length && X2[i] === 0; i++) ;
    X2 = X2.subarray(i);
  }
  if (stripTrailing) {
    for (i = X2.length - 1; i >= 0 && X2[i] === 0; i--) ;
    X2 = X2.subarray(0, i + 1);
  }
  const digest = await computeDigest(hashAlgo, util_default.concatUint8Array([
    new Uint8Array([0, 0, 0, 1]),
    X2,
    param
  ]));
  return digest.subarray(0, length);
}
async function genPublicEphemeralKey(curve, Q) {
  switch (curve.type) {
    case "curve25519Legacy": {
      const { sharedSecret: sharedKey, ephemeralPublicKey } = await generateEphemeralEncryptionMaterial(enums_default.publicKey.x25519, Q.subarray(1));
      const publicKey = util_default.concatUint8Array([new Uint8Array([curve.wireFormatLeadingByte]), ephemeralPublicKey]);
      return { publicKey, sharedKey };
    }
    case "web":
      if (curve.web && util_default.getWebCrypto()) {
        try {
          return await webPublicEphemeralKey(curve, Q);
        } catch (err2) {
          util_default.printDebugError(err2);
          return jsPublicEphemeralKey(curve, Q);
        }
      }
      break;
    case "node":
      return nodePublicEphemeralKey(curve, Q);
    default:
      return jsPublicEphemeralKey(curve, Q);
  }
}
async function encrypt5(oid, kdfParams, data, Q, fingerprint) {
  const m = encode2(data);
  const curve = new CurveWithOID(oid);
  checkPublicPointEnconding(curve, Q);
  const { publicKey, sharedKey } = await genPublicEphemeralKey(curve, Q);
  const param = buildEcdhParam(enums_default.publicKey.ecdh, oid, kdfParams, fingerprint);
  const { keySize } = getCipherParams(kdfParams.cipher);
  const Z2 = await kdf(kdfParams.hash, sharedKey, keySize, param);
  const wrappedKey = await wrap(kdfParams.cipher, Z2, m);
  return { publicKey, wrappedKey };
}
async function genPrivateEphemeralKey(curve, V, Q, d) {
  if (d.length !== curve.payloadSize) {
    const privateKey = new Uint8Array(curve.payloadSize);
    privateKey.set(d, curve.payloadSize - d.length);
    d = privateKey;
  }
  switch (curve.type) {
    case "curve25519Legacy": {
      const secretKey = d.slice().reverse();
      const sharedKey = await recomputeSharedSecret(enums_default.publicKey.x25519, V.subarray(1), Q.subarray(1), secretKey);
      return { secretKey, sharedKey };
    }
    case "web":
      if (curve.web && util_default.getWebCrypto()) {
        try {
          return await webPrivateEphemeralKey(curve, V, Q, d);
        } catch (err2) {
          util_default.printDebugError(err2);
          return jsPrivateEphemeralKey(curve, V, d);
        }
      }
      break;
    case "node":
      return nodePrivateEphemeralKey(curve, V, d);
    default:
      return jsPrivateEphemeralKey(curve, V, d);
  }
}
async function decrypt5(oid, kdfParams, V, C, Q, d, fingerprint) {
  const curve = new CurveWithOID(oid);
  checkPublicPointEnconding(curve, Q);
  checkPublicPointEnconding(curve, V);
  const { sharedKey } = await genPrivateEphemeralKey(curve, V, Q, d);
  const param = buildEcdhParam(enums_default.publicKey.ecdh, oid, kdfParams, fingerprint);
  const { keySize } = getCipherParams(kdfParams.cipher);
  let err2;
  for (let i = 0; i < 3; i++) {
    try {
      const Z2 = await kdf(kdfParams.hash, sharedKey, keySize, param, i === 1, i === 2);
      return decode2(await unwrap(kdfParams.cipher, Z2, C));
    } catch (e) {
      err2 = e;
    }
  }
  throw err2;
}
async function jsPrivateEphemeralKey(curve, V, d) {
  const nobleCurve = await util_default.getNobleCurve(enums_default.publicKey.ecdh, curve.name);
  const sharedSecretWithParity = nobleCurve.getSharedSecret(d, V);
  const sharedKey = sharedSecretWithParity.subarray(1);
  return { secretKey: d, sharedKey };
}
async function jsPublicEphemeralKey(curve, Q) {
  const nobleCurve = await util_default.getNobleCurve(enums_default.publicKey.ecdh, curve.name);
  const { publicKey: V, privateKey: v } = await curve.genKeyPair();
  const sharedSecretWithParity = nobleCurve.getSharedSecret(v, Q);
  const sharedKey = sharedSecretWithParity.subarray(1);
  return { publicKey: V, sharedKey };
}
async function webPrivateEphemeralKey(curve, V, Q, d) {
  const webCrypto10 = util_default.getWebCrypto();
  const recipient = privateToJWK2(curve.payloadSize, curve.web, Q, d);
  let privateKey = webCrypto10.importKey(
    "jwk",
    recipient,
    {
      name: "ECDH",
      namedCurve: curve.web
    },
    true,
    ["deriveKey", "deriveBits"]
  );
  const jwk = rawPublicToJWK(curve.payloadSize, curve.web, V);
  let sender = webCrypto10.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: curve.web
    },
    true,
    []
  );
  [privateKey, sender] = await Promise.all([privateKey, sender]);
  let S2 = webCrypto10.deriveBits(
    {
      name: "ECDH",
      namedCurve: curve.web,
      public: sender
    },
    privateKey,
    curve.sharedSize
  );
  let secret = webCrypto10.exportKey(
    "jwk",
    privateKey
  );
  [S2, secret] = await Promise.all([S2, secret]);
  const sharedKey = new Uint8Array(S2);
  const secretKey = b64ToUint8Array(secret.d, true);
  return { secretKey, sharedKey };
}
async function webPublicEphemeralKey(curve, Q) {
  const webCrypto10 = util_default.getWebCrypto();
  const jwk = rawPublicToJWK(curve.payloadSize, curve.web, Q);
  let keyPair = webCrypto10.generateKey(
    {
      name: "ECDH",
      namedCurve: curve.web
    },
    true,
    ["deriveKey", "deriveBits"]
  );
  let recipient = webCrypto10.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: curve.web
    },
    false,
    []
  );
  [keyPair, recipient] = await Promise.all([keyPair, recipient]);
  let s = webCrypto10.deriveBits(
    {
      name: "ECDH",
      namedCurve: curve.web,
      public: recipient
    },
    keyPair.privateKey,
    curve.sharedSize
  );
  let p = webCrypto10.exportKey(
    "jwk",
    keyPair.publicKey
  );
  [s, p] = await Promise.all([s, p]);
  const sharedKey = new Uint8Array(s);
  const publicKey = new Uint8Array(jwkToRawPublic(p, curve.wireFormatLeadingByte));
  return { publicKey, sharedKey };
}
function nodePrivateEphemeralKey(curve, V, d) {
  const nodeCrypto10 = util_default.getNodeCrypto();
  const recipient = nodeCrypto10.createECDH(curve.node);
  recipient.setPrivateKey(d);
  const sharedKey = new Uint8Array(recipient.computeSecret(V));
  const secretKey = new Uint8Array(recipient.getPrivateKey());
  return { secretKey, sharedKey };
}
function nodePublicEphemeralKey(curve, Q) {
  const nodeCrypto10 = util_default.getNodeCrypto();
  const sender = nodeCrypto10.createECDH(curve.node);
  sender.generateKeys();
  const sharedKey = new Uint8Array(sender.computeSecret(Q));
  const publicKey = new Uint8Array(sender.getPublicKey());
  return { publicKey, sharedKey };
}

// vendor/src/openpgpjs/src/crypto/public_key/dsa.js
var dsa_exports = {};
__export(dsa_exports, {
  sign: () => sign5,
  validateParams: () => validateParams8,
  verify: () => verify5
});
var _0n9 = BigInt(0);
var _1n13 = BigInt(1);
async function sign5(hashAlgo, hashed, g, p, q, x) {
  const _0n10 = BigInt(0);
  p = uint8ArrayToBigInt(p);
  q = uint8ArrayToBigInt(q);
  g = uint8ArrayToBigInt(g);
  x = uint8ArrayToBigInt(x);
  let k;
  let r;
  let s;
  let t;
  g = mod2(g, p);
  x = mod2(x, q);
  const h = mod2(uint8ArrayToBigInt(hashed.subarray(0, byteLength(q))), q);
  while (true) {
    k = getRandomBigInteger(_1n13, q);
    r = mod2(modExp(g, k, p), q);
    if (r === _0n10) {
      continue;
    }
    const xr = mod2(x * r, q);
    t = mod2(h + xr, q);
    s = mod2(modInv(k, q) * t, q);
    if (s === _0n10) {
      continue;
    }
    break;
  }
  return {
    r: bigIntToUint8Array(r, "be", byteLength(p)),
    s: bigIntToUint8Array(s, "be", byteLength(p))
  };
}
async function verify5(hashAlgo, r, s, hashed, g, p, q, y) {
  r = uint8ArrayToBigInt(r);
  s = uint8ArrayToBigInt(s);
  p = uint8ArrayToBigInt(p);
  q = uint8ArrayToBigInt(q);
  g = uint8ArrayToBigInt(g);
  y = uint8ArrayToBigInt(y);
  if (r <= _0n9 || r >= q || s <= _0n9 || s >= q) {
    util_default.printDebug("invalid DSA Signature");
    return false;
  }
  const h = mod2(uint8ArrayToBigInt(hashed.subarray(0, byteLength(q))), q);
  const w = modInv(s, q);
  if (w === _0n9) {
    util_default.printDebug("invalid DSA Signature");
    return false;
  }
  g = mod2(g, p);
  y = mod2(y, p);
  const u1 = mod2(h * w, q);
  const u2 = mod2(r * w, q);
  const t1 = modExp(g, u1, p);
  const t2 = modExp(y, u2, p);
  const v = mod2(mod2(t1 * t2, p), q);
  return v === r;
}
async function validateParams8(pBytes, qBytes, gBytes, yBytes, xBytes) {
  const p = uint8ArrayToBigInt(pBytes);
  const q = uint8ArrayToBigInt(qBytes);
  const g = uint8ArrayToBigInt(gBytes);
  const y = uint8ArrayToBigInt(yBytes);
  if (g <= _1n13 || g >= p) {
    return false;
  }
  if (mod2(p - _1n13, q) !== _0n9) {
    return false;
  }
  if (modExp(g, q, p) !== _1n13) {
    return false;
  }
  const qSize = BigInt(bitLength(q));
  const _150n = BigInt(150);
  if (qSize < _150n || !isProbablePrime(q, null, 32)) {
    return false;
  }
  const x = uint8ArrayToBigInt(xBytes);
  const _2n8 = BigInt(2);
  const r = getRandomBigInteger(_2n8 << qSize - _1n13, _2n8 << qSize);
  const rqx = q * r + x;
  if (y !== modExp(g, rqx, p)) {
    return false;
  }
  return true;
}

// vendor/src/openpgpjs/src/type/ecdh_symkey.js
var ECDHSymmetricKey = class {
  constructor(data) {
    if (data) {
      this.data = data;
    }
  }
  /**
   * Read an ECDHSymmetricKey from an Uint8Array:
   * - 1 octect for the length `l`
   * - `l` octects of encoded session key data
   * @param {Uint8Array} bytes
   * @returns {Number} Number of read bytes.
   */
  read(bytes) {
    if (bytes.length >= 1) {
      const length = bytes[0];
      if (bytes.length >= 1 + length) {
        this.data = bytes.subarray(1, 1 + length);
        return 1 + this.data.length;
      }
    }
    throw new Error("Invalid symmetric key");
  }
  /**
   * Write an ECDHSymmetricKey as an Uint8Array
   * @returns  {Uint8Array} Serialised data
   */
  write() {
    return util_default.concatUint8Array([new Uint8Array([this.data.length]), this.data]);
  }
};
var ecdh_symkey_default = ECDHSymmetricKey;

// vendor/src/openpgpjs/src/type/kdf_params.js
var KDFParams = class {
  /**
   * @param {enums.hash} hash - Hash algorithm
   * @param {enums.symmetric} cipher - Symmetric algorithm
   */
  constructor(data) {
    if (data) {
      const { hash, cipher } = data;
      this.hash = hash;
      this.cipher = cipher;
    } else {
      this.hash = null;
      this.cipher = null;
    }
  }
  /**
   * Read KDFParams from an Uint8Array
   * @param {Uint8Array} input - Where to read the KDFParams from
   * @returns {Number} Number of read bytes.
   */
  read(input) {
    if (input.length < 4 || input[0] !== 3 || input[1] !== 1) {
      throw new UnsupportedError("Cannot read KDFParams");
    }
    this.hash = input[2];
    this.cipher = input[3];
    return 4;
  }
  /**
   * Write KDFParams to an Uint8Array
   * @returns  {Uint8Array}  Array with the KDFParams value
   */
  write() {
    return new Uint8Array([3, 1, this.hash, this.cipher]);
  }
};
var kdf_params_default = KDFParams;

// vendor/src/openpgpjs/src/type/ecdh_x_symkey.js
var ECDHXSymmetricKey = class _ECDHXSymmetricKey {
  static fromObject({ wrappedKey, algorithm }) {
    const instance = new _ECDHXSymmetricKey();
    instance.wrappedKey = wrappedKey;
    instance.algorithm = algorithm;
    return instance;
  }
  /**
   * - 1 octect for the length `l`
   * - `l` octects of encoded session key data (with optional leading algorithm byte)
   * @param {Uint8Array} bytes
   * @returns {Number} Number of read bytes.
   */
  read(bytes) {
    let read = 0;
    let followLength = bytes[read++];
    this.algorithm = followLength % 2 ? bytes[read++] : null;
    followLength -= followLength % 2;
    this.wrappedKey = util_default.readExactSubarray(bytes, read, read + followLength);
    read += followLength;
  }
  /**
   * Write an MontgomerySymmetricKey as an Uint8Array
   * @returns  {Uint8Array} Serialised data
   */
  write() {
    return util_default.concatUint8Array([
      this.algorithm ? new Uint8Array([this.wrappedKey.length + 1, this.algorithm]) : new Uint8Array([this.wrappedKey.length]),
      this.wrappedKey
    ]);
  }
};
var ecdh_x_symkey_default = ECDHXSymmetricKey;

// vendor/src/openpgpjs/src/crypto/crypto.js
async function publicKeyEncrypt(keyAlgo, symmetricAlgo, publicParams, data, fingerprint) {
  switch (keyAlgo) {
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.rsaEncryptSign: {
      const { n, e } = publicParams;
      const c = await rsa_exports.encrypt(data, n, e);
      return { c };
    }
    case enums_default.publicKey.elgamal: {
      const { p, g, y } = publicParams;
      return elgamal_exports.encrypt(data, p, g, y);
    }
    case enums_default.publicKey.ecdh: {
      const { oid, Q, kdfParams } = publicParams;
      const { publicKey: V, wrappedKey: C } = await elliptic_exports.ecdh.encrypt(
        oid,
        kdfParams,
        data,
        Q,
        fingerprint
      );
      return { V, C: new ecdh_symkey_default(C) };
    }
    case enums_default.publicKey.x25519:
    case enums_default.publicKey.x448: {
      if (symmetricAlgo && !util_default.isAES(symmetricAlgo)) {
        throw new Error("X25519 and X448 keys can only encrypt AES session keys");
      }
      const { A: A2 } = publicParams;
      const { ephemeralPublicKey, wrappedKey } = await elliptic_exports.ecdhX.encrypt(
        keyAlgo,
        data,
        A2
      );
      const C = ecdh_x_symkey_default.fromObject({ algorithm: symmetricAlgo, wrappedKey });
      return { ephemeralPublicKey, C };
    }
    default:
      return [];
  }
}
async function publicKeyDecrypt(algo, publicKeyParams, privateKeyParams, sessionKeyParams, fingerprint, randomPayload) {
  switch (algo) {
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.rsaEncrypt: {
      const { c } = sessionKeyParams;
      const { n, e } = publicKeyParams;
      const { d, p, q, u } = privateKeyParams;
      return rsa_exports.decrypt(c, n, e, d, p, q, u, randomPayload);
    }
    case enums_default.publicKey.elgamal: {
      const { c1, c2 } = sessionKeyParams;
      const p = publicKeyParams.p;
      const x = privateKeyParams.x;
      return elgamal_exports.decrypt(c1, c2, p, x, randomPayload);
    }
    case enums_default.publicKey.ecdh: {
      const { oid, Q, kdfParams } = publicKeyParams;
      const { d } = privateKeyParams;
      const { V, C } = sessionKeyParams;
      return elliptic_exports.ecdh.decrypt(
        oid,
        kdfParams,
        V,
        C.data,
        Q,
        d,
        fingerprint
      );
    }
    case enums_default.publicKey.x25519:
    case enums_default.publicKey.x448: {
      const { A: A2 } = publicKeyParams;
      const { k } = privateKeyParams;
      const { ephemeralPublicKey, C } = sessionKeyParams;
      if (C.algorithm !== null && !util_default.isAES(C.algorithm)) {
        throw new Error("AES session key expected");
      }
      return elliptic_exports.ecdhX.decrypt(
        algo,
        ephemeralPublicKey,
        C.wrappedKey,
        A2,
        k
      );
    }
    default:
      throw new Error("Unknown public key encryption algorithm.");
  }
}
function parsePublicKeyParams(algo, bytes) {
  let read = 0;
  switch (algo) {
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.rsaSign: {
      const n = util_default.readMPI(bytes.subarray(read));
      read += n.length + 2;
      const e = util_default.readMPI(bytes.subarray(read));
      read += e.length + 2;
      return { read, publicParams: { n, e } };
    }
    case enums_default.publicKey.dsa: {
      const p = util_default.readMPI(bytes.subarray(read));
      read += p.length + 2;
      const q = util_default.readMPI(bytes.subarray(read));
      read += q.length + 2;
      const g = util_default.readMPI(bytes.subarray(read));
      read += g.length + 2;
      const y = util_default.readMPI(bytes.subarray(read));
      read += y.length + 2;
      return { read, publicParams: { p, q, g, y } };
    }
    case enums_default.publicKey.elgamal: {
      const p = util_default.readMPI(bytes.subarray(read));
      read += p.length + 2;
      const g = util_default.readMPI(bytes.subarray(read));
      read += g.length + 2;
      const y = util_default.readMPI(bytes.subarray(read));
      read += y.length + 2;
      return { read, publicParams: { p, g, y } };
    }
    case enums_default.publicKey.ecdsa: {
      const oid = new oid_default();
      read += oid.read(bytes);
      checkSupportedCurve(oid);
      const Q = util_default.readMPI(bytes.subarray(read));
      read += Q.length + 2;
      return { read, publicParams: { oid, Q } };
    }
    case enums_default.publicKey.eddsaLegacy: {
      const oid = new oid_default();
      read += oid.read(bytes);
      checkSupportedCurve(oid);
      if (oid.getName() !== enums_default.curve.ed25519Legacy) {
        throw new Error("Unexpected OID for eddsaLegacy");
      }
      let Q = util_default.readMPI(bytes.subarray(read));
      read += Q.length + 2;
      Q = util_default.leftPad(Q, 33);
      return { read, publicParams: { oid, Q } };
    }
    case enums_default.publicKey.ecdh: {
      const oid = new oid_default();
      read += oid.read(bytes);
      checkSupportedCurve(oid);
      const Q = util_default.readMPI(bytes.subarray(read));
      read += Q.length + 2;
      const kdfParams = new kdf_params_default();
      read += kdfParams.read(bytes.subarray(read));
      return { read, publicParams: { oid, Q, kdfParams } };
    }
    case enums_default.publicKey.ed25519:
    case enums_default.publicKey.ed448:
    case enums_default.publicKey.x25519:
    case enums_default.publicKey.x448: {
      const A2 = util_default.readExactSubarray(bytes, read, read + getCurvePayloadSize(algo));
      read += A2.length;
      return { read, publicParams: { A: A2 } };
    }
    default:
      throw new UnsupportedError("Unknown public key encryption algorithm.");
  }
}
function parsePrivateKeyParams(algo, bytes, publicParams) {
  let read = 0;
  switch (algo) {
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.rsaSign: {
      const d = util_default.readMPI(bytes.subarray(read));
      read += d.length + 2;
      const p = util_default.readMPI(bytes.subarray(read));
      read += p.length + 2;
      const q = util_default.readMPI(bytes.subarray(read));
      read += q.length + 2;
      const u = util_default.readMPI(bytes.subarray(read));
      read += u.length + 2;
      return { read, privateParams: { d, p, q, u } };
    }
    case enums_default.publicKey.dsa:
    case enums_default.publicKey.elgamal: {
      const x = util_default.readMPI(bytes.subarray(read));
      read += x.length + 2;
      return { read, privateParams: { x } };
    }
    case enums_default.publicKey.ecdsa:
    case enums_default.publicKey.ecdh: {
      const payloadSize = getCurvePayloadSize(algo, publicParams.oid);
      let d = util_default.readMPI(bytes.subarray(read));
      read += d.length + 2;
      d = util_default.leftPad(d, payloadSize);
      return { read, privateParams: { d } };
    }
    case enums_default.publicKey.eddsaLegacy: {
      const payloadSize = getCurvePayloadSize(algo, publicParams.oid);
      if (publicParams.oid.getName() !== enums_default.curve.ed25519Legacy) {
        throw new Error("Unexpected OID for eddsaLegacy");
      }
      let seed = util_default.readMPI(bytes.subarray(read));
      read += seed.length + 2;
      seed = util_default.leftPad(seed, payloadSize);
      return { read, privateParams: { seed } };
    }
    case enums_default.publicKey.ed25519:
    case enums_default.publicKey.ed448: {
      const payloadSize = getCurvePayloadSize(algo);
      const seed = util_default.readExactSubarray(bytes, read, read + payloadSize);
      read += seed.length;
      return { read, privateParams: { seed } };
    }
    case enums_default.publicKey.x25519:
    case enums_default.publicKey.x448: {
      const payloadSize = getCurvePayloadSize(algo);
      const k = util_default.readExactSubarray(bytes, read, read + payloadSize);
      read += k.length;
      return { read, privateParams: { k } };
    }
    default:
      throw new UnsupportedError("Unknown public key encryption algorithm.");
  }
}
function parseEncSessionKeyParams(algo, bytes) {
  let read = 0;
  switch (algo) {
    //   Algorithm-Specific Fields for RSA encrypted session keys:
    //       - MPI of RSA encrypted value m**e mod n.
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.rsaEncryptSign: {
      const c = util_default.readMPI(bytes.subarray(read));
      return { c };
    }
    //   Algorithm-Specific Fields for Elgamal encrypted session keys:
    //       - MPI of Elgamal value g**k mod p
    //       - MPI of Elgamal value m * y**k mod p
    case enums_default.publicKey.elgamal: {
      const c1 = util_default.readMPI(bytes.subarray(read));
      read += c1.length + 2;
      const c2 = util_default.readMPI(bytes.subarray(read));
      return { c1, c2 };
    }
    //   Algorithm-Specific Fields for ECDH encrypted session keys:
    //       - MPI containing the ephemeral key used to establish the shared secret
    //       - ECDH Symmetric Key
    case enums_default.publicKey.ecdh: {
      const V = util_default.readMPI(bytes.subarray(read));
      read += V.length + 2;
      const C = new ecdh_symkey_default();
      C.read(bytes.subarray(read));
      return { V, C };
    }
    //   Algorithm-Specific Fields for X25519 or X448 encrypted session keys:
    //       - 32 octets representing an ephemeral X25519 public key (or 57 octets for X448).
    //       - A one-octet size of the following fields.
    //       - The one-octet algorithm identifier, if it was passed (in the case of a v3 PKESK packet).
    //       - The encrypted session key.
    case enums_default.publicKey.x25519:
    case enums_default.publicKey.x448: {
      const pointSize = getCurvePayloadSize(algo);
      const ephemeralPublicKey = util_default.readExactSubarray(bytes, read, read + pointSize);
      read += ephemeralPublicKey.length;
      const C = new ecdh_x_symkey_default();
      C.read(bytes.subarray(read));
      return { ephemeralPublicKey, C };
    }
    default:
      throw new UnsupportedError("Unknown public key encryption algorithm.");
  }
}
function serializeParams(algo, params) {
  const algosWithNativeRepresentation = /* @__PURE__ */ new Set([
    enums_default.publicKey.ed25519,
    enums_default.publicKey.x25519,
    enums_default.publicKey.ed448,
    enums_default.publicKey.x448
  ]);
  const orderedParams = Object.keys(params).map((name) => {
    const param = params[name];
    if (!util_default.isUint8Array(param)) return param.write();
    return algosWithNativeRepresentation.has(algo) ? param : util_default.uint8ArrayToMPI(param);
  });
  return util_default.concatUint8Array(orderedParams);
}
function generateParams(algo, bits2, oid) {
  switch (algo) {
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.rsaSign:
      return rsa_exports.generate(bits2, 65537).then(({ n, e, d, p, q, u }) => ({
        privateParams: { d, p, q, u },
        publicParams: { n, e }
      }));
    case enums_default.publicKey.ecdsa:
      return elliptic_exports.generate(oid).then(({ oid: oid2, Q, secret }) => ({
        privateParams: { d: secret },
        publicParams: { oid: new oid_default(oid2), Q }
      }));
    case enums_default.publicKey.eddsaLegacy:
      return elliptic_exports.generate(oid).then(({ oid: oid2, Q, secret }) => ({
        privateParams: { seed: secret },
        publicParams: { oid: new oid_default(oid2), Q }
      }));
    case enums_default.publicKey.ecdh:
      return elliptic_exports.generate(oid).then(({ oid: oid2, Q, secret, hash, cipher }) => ({
        privateParams: { d: secret },
        publicParams: {
          oid: new oid_default(oid2),
          Q,
          kdfParams: new kdf_params_default({ hash, cipher })
        }
      }));
    case enums_default.publicKey.ed25519:
    case enums_default.publicKey.ed448:
      return elliptic_exports.eddsa.generate(algo).then(({ A: A2, seed }) => ({
        privateParams: { seed },
        publicParams: { A: A2 }
      }));
    case enums_default.publicKey.x25519:
    case enums_default.publicKey.x448:
      return elliptic_exports.ecdhX.generate(algo).then(({ A: A2, k }) => ({
        privateParams: { k },
        publicParams: { A: A2 }
      }));
    case enums_default.publicKey.dsa:
    case enums_default.publicKey.elgamal:
      throw new Error("Unsupported algorithm for key generation.");
    default:
      throw new Error("Unknown public key algorithm.");
  }
}
async function validateParams9(algo, publicParams, privateParams) {
  if (!publicParams || !privateParams) {
    throw new Error("Missing key parameters");
  }
  switch (algo) {
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.rsaSign: {
      const { n, e } = publicParams;
      const { d, p, q, u } = privateParams;
      return rsa_exports.validateParams(n, e, d, p, q, u);
    }
    case enums_default.publicKey.dsa: {
      const { p, q, g, y } = publicParams;
      const { x } = privateParams;
      return dsa_exports.validateParams(p, q, g, y, x);
    }
    case enums_default.publicKey.elgamal: {
      const { p, g, y } = publicParams;
      const { x } = privateParams;
      return elgamal_exports.validateParams(p, g, y, x);
    }
    case enums_default.publicKey.ecdsa:
    case enums_default.publicKey.ecdh: {
      const algoModule = elliptic_exports[enums_default.read(enums_default.publicKey, algo)];
      const { oid, Q } = publicParams;
      const { d } = privateParams;
      return algoModule.validateParams(oid, Q, d);
    }
    case enums_default.publicKey.eddsaLegacy: {
      const { Q, oid } = publicParams;
      const { seed } = privateParams;
      return elliptic_exports.eddsaLegacy.validateParams(oid, Q, seed);
    }
    case enums_default.publicKey.ed25519:
    case enums_default.publicKey.ed448: {
      const { A: A2 } = publicParams;
      const { seed } = privateParams;
      return elliptic_exports.eddsa.validateParams(algo, A2, seed);
    }
    case enums_default.publicKey.x25519:
    case enums_default.publicKey.x448: {
      const { A: A2 } = publicParams;
      const { k } = privateParams;
      return elliptic_exports.ecdhX.validateParams(algo, A2, k);
    }
    default:
      throw new Error("Unknown public key algorithm.");
  }
}
function generateSessionKey(algo) {
  const { keySize } = getCipherParams(algo);
  return getRandomBytes(keySize);
}
function checkSupportedCurve(oid) {
  try {
    oid.getName();
  } catch {
    throw new UnsupportedError("Unknown curve OID");
  }
}
function getCurvePayloadSize(algo, oid) {
  switch (algo) {
    case enums_default.publicKey.ecdsa:
    case enums_default.publicKey.ecdh:
    case enums_default.publicKey.eddsaLegacy:
      return new elliptic_exports.CurveWithOID(oid).payloadSize;
    case enums_default.publicKey.ed25519:
    case enums_default.publicKey.ed448:
      return elliptic_exports.eddsa.getPayloadSize(algo);
    case enums_default.publicKey.x25519:
    case enums_default.publicKey.x448:
      return elliptic_exports.ecdhX.getPayloadSize(algo);
    default:
      throw new Error("Unknown elliptic algo");
  }
}
function getPreferredCurveHashAlgo(algo, oid) {
  switch (algo) {
    case enums_default.publicKey.ecdsa:
    case enums_default.publicKey.eddsaLegacy:
      return elliptic_exports.getPreferredHashAlgo(oid);
    case enums_default.publicKey.ed25519:
    case enums_default.publicKey.ed448:
      return elliptic_exports.eddsa.getPreferredHashAlgo(algo);
    default:
      throw new Error("Unknown elliptic signing algo");
  }
}

// vendor/src/openpgpjs/src/crypto/cipherMode/index.js
var cipherMode_exports = {};
__export(cipherMode_exports, {
  cfb: () => cfb_exports,
  getAEADMode: () => getAEADMode
});

// vendor/src/openpgpjs/src/crypto/cipherMode/cfb.js
var cfb_exports = {};
__export(cfb_exports, {
  decrypt: () => decrypt6,
  encrypt: () => encrypt6,
  getPrefixRandom: () => getPrefixRandom
});
var webCrypto6 = util_default.getWebCrypto();
var nodeCrypto6 = util_default.getNodeCrypto();
var knownAlgos = nodeCrypto6 ? nodeCrypto6.getCiphers() : [];
var nodeAlgos = {
  idea: knownAlgos.includes("idea-cfb") ? "idea-cfb" : void 0,
  /* Unused, not implemented */
  tripledes: knownAlgos.includes("des-ede3-cfb") ? "des-ede3-cfb" : void 0,
  cast5: knownAlgos.includes("cast5-cfb") ? "cast5-cfb" : void 0,
  blowfish: knownAlgos.includes("bf-cfb") ? "bf-cfb" : void 0,
  aes128: knownAlgos.includes("aes-128-cfb") ? "aes-128-cfb" : void 0,
  aes192: knownAlgos.includes("aes-192-cfb") ? "aes-192-cfb" : void 0,
  aes256: knownAlgos.includes("aes-256-cfb") ? "aes-256-cfb" : void 0
  /* twofish is not implemented in OpenSSL */
};
function getPrefixRandom(algo) {
  const { blockSize } = getCipherParams(algo);
  const prefixrandom = getRandomBytes(blockSize);
  const repeat = new Uint8Array([prefixrandom[prefixrandom.length - 2], prefixrandom[prefixrandom.length - 1]]);
  return util_default.concat([prefixrandom, repeat]);
}
async function encrypt6(algo, key, plaintext, iv, config2) {
  const algoName = enums_default.read(enums_default.symmetric, algo);
  if (util_default.getNodeCrypto() && nodeAlgos[algoName]) {
    return nodeEncrypt2(algo, key, plaintext, iv);
  }
  if (util_default.isAES(algo)) {
    return aesEncrypt(algo, key, plaintext, iv, config2);
  }
  const LegacyCipher = await getLegacyCipher(algo);
  const cipherfn = new LegacyCipher(key);
  const block_size = cipherfn.blockSize;
  const blockc = iv.slice();
  let pt = new Uint8Array();
  const process2 = (chunk) => {
    if (chunk) {
      pt = util_default.concatUint8Array([pt, chunk]);
    }
    const ciphertext = new Uint8Array(pt.length);
    let i;
    let j = 0;
    while (chunk ? pt.length >= block_size : pt.length) {
      const encblock = cipherfn.encrypt(blockc);
      for (i = 0; i < block_size; i++) {
        blockc[i] = pt[i] ^ encblock[i];
        ciphertext[j++] = blockc[i];
      }
      pt = pt.subarray(block_size);
    }
    return ciphertext.subarray(0, j);
  };
  return transform(plaintext, process2, process2);
}
async function decrypt6(algo, key, ciphertext, iv) {
  const algoName = enums_default.read(enums_default.symmetric, algo);
  if (nodeCrypto6 && nodeAlgos[algoName]) {
    return nodeDecrypt2(algo, key, ciphertext, iv);
  }
  if (util_default.isAES(algo)) {
    return aesDecrypt(algo, key, ciphertext, iv);
  }
  const LegacyCipher = await getLegacyCipher(algo);
  const cipherfn = new LegacyCipher(key);
  const block_size = cipherfn.blockSize;
  let blockp = iv;
  let ct = new Uint8Array();
  const process2 = (chunk) => {
    if (chunk) {
      ct = util_default.concatUint8Array([ct, chunk]);
    }
    const plaintext = new Uint8Array(ct.length);
    let i;
    let j = 0;
    while (chunk ? ct.length >= block_size : ct.length) {
      const decblock = cipherfn.encrypt(blockp);
      blockp = ct.subarray(0, block_size);
      for (i = 0; i < block_size; i++) {
        plaintext[j++] = blockp[i] ^ decblock[i];
      }
      ct = ct.subarray(block_size);
    }
    return plaintext.subarray(0, j);
  };
  return transform(ciphertext, process2, process2);
}
var WebCryptoEncryptor = class {
  constructor(algo, key, iv) {
    const { blockSize } = getCipherParams(algo);
    this.key = key;
    this.iv = iv;
    this.prevBlock = iv.slice();
    this.nextBlock = new Uint8Array(blockSize);
    this.i = 0;
    this.blockSize = blockSize;
    this.zeroBlock = new Uint8Array(this.blockSize);
  }
  /**
   * @returns {Promise<boolean>}
   */
  static isSupported(algo) {
    const { keySize } = getCipherParams(algo);
    return webCrypto6.importKey("raw", new Uint8Array(keySize), "aes-cbc", false, ["encrypt"]).then(() => true, () => false);
  }
  async _runCBC(plaintext, nonZeroIV) {
    const mode = "AES-CBC";
    this.keyRef = this.keyRef || await webCrypto6.importKey("raw", this.key, mode, false, ["encrypt"]);
    const ciphertext = await webCrypto6.encrypt(
      { name: mode, iv: nonZeroIV || this.zeroBlock },
      this.keyRef,
      plaintext
    );
    return new Uint8Array(ciphertext).subarray(0, plaintext.length);
  }
  async encryptChunk(value) {
    const missing = this.nextBlock.length - this.i;
    const added = value.subarray(0, missing);
    this.nextBlock.set(added, this.i);
    if (this.i + value.length >= 2 * this.blockSize) {
      const leftover = (value.length - missing) % this.blockSize;
      const plaintext = util_default.concatUint8Array([
        this.nextBlock,
        value.subarray(missing, value.length - leftover)
      ]);
      const toEncrypt = util_default.concatUint8Array([
        this.prevBlock,
        plaintext.subarray(0, plaintext.length - this.blockSize)
        // stop one block "early", since we only need to xor the plaintext and pass it over as prevBlock
      ]);
      const encryptedBlocks = await this._runCBC(toEncrypt);
      xorMut(encryptedBlocks, plaintext);
      this.prevBlock = encryptedBlocks.slice(-this.blockSize);
      if (leftover > 0) this.nextBlock.set(value.subarray(-leftover));
      this.i = leftover;
      return encryptedBlocks;
    }
    this.i += added.length;
    let encryptedBlock;
    if (this.i === this.nextBlock.length) {
      const curBlock = this.nextBlock;
      encryptedBlock = await this._runCBC(this.prevBlock);
      xorMut(encryptedBlock, curBlock);
      this.prevBlock = encryptedBlock.slice();
      this.i = 0;
      const remaining = value.subarray(added.length);
      this.nextBlock.set(remaining, this.i);
      this.i += remaining.length;
    } else {
      encryptedBlock = new Uint8Array();
    }
    return encryptedBlock;
  }
  async finish() {
    let result;
    if (this.i === 0) {
      result = new Uint8Array();
    } else {
      this.nextBlock = this.nextBlock.subarray(0, this.i);
      const curBlock = this.nextBlock;
      const encryptedBlock = await this._runCBC(this.prevBlock);
      xorMut(encryptedBlock, curBlock);
      result = encryptedBlock.subarray(0, curBlock.length);
    }
    this.clearSensitiveData();
    return result;
  }
  clearSensitiveData() {
    this.nextBlock.fill(0);
    this.prevBlock.fill(0);
    this.keyRef = null;
    this.key = null;
  }
  async encrypt(plaintext) {
    const encryptedWithPadding = await this._runCBC(
      util_default.concatUint8Array([new Uint8Array(this.blockSize), plaintext]),
      this.iv
    );
    const ct = encryptedWithPadding.subarray(0, plaintext.length);
    xorMut(ct, plaintext);
    this.clearSensitiveData();
    return ct;
  }
};
var NobleStreamProcessor = class {
  constructor(forEncryption, algo, key, iv) {
    this.forEncryption = forEncryption;
    const { blockSize } = getCipherParams(algo);
    this.key = unsafe.expandKeyLE(key);
    if (iv.byteOffset % 4 !== 0) iv = iv.slice();
    this.prevBlock = getUint32Array(iv);
    this.nextBlock = new Uint8Array(blockSize);
    this.i = 0;
    this.blockSize = blockSize;
  }
  _runCFB(src) {
    const src32 = getUint32Array(src);
    const dst = new Uint8Array(src.length);
    const dst32 = getUint32Array(dst);
    for (let i = 0; i + 4 <= dst32.length; i += 4) {
      const { s0: e0, s1: e1, s2: e2, s3: e3 } = unsafe.encrypt(this.key, this.prevBlock[0], this.prevBlock[1], this.prevBlock[2], this.prevBlock[3]);
      dst32[i + 0] = src32[i + 0] ^ e0;
      dst32[i + 1] = src32[i + 1] ^ e1;
      dst32[i + 2] = src32[i + 2] ^ e2;
      dst32[i + 3] = src32[i + 3] ^ e3;
      this.prevBlock = (this.forEncryption ? dst32 : src32).slice(i, i + 4);
    }
    return dst;
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async processChunk(value) {
    const missing = this.nextBlock.length - this.i;
    const added = value.subarray(0, missing);
    this.nextBlock.set(added, this.i);
    if (this.i + value.length >= 2 * this.blockSize) {
      const leftover = (value.length - missing) % this.blockSize;
      const toProcess = util_default.concatUint8Array([
        this.nextBlock,
        value.subarray(missing, value.length - leftover)
      ]);
      const processedBlocks = this._runCFB(toProcess);
      if (leftover > 0) this.nextBlock.set(value.subarray(-leftover));
      this.i = leftover;
      return processedBlocks;
    }
    this.i += added.length;
    let processedBlock;
    if (this.i === this.nextBlock.length) {
      processedBlock = this._runCFB(this.nextBlock);
      this.i = 0;
      const remaining = value.subarray(added.length);
      this.nextBlock.set(remaining, this.i);
      this.i += remaining.length;
    } else {
      processedBlock = new Uint8Array();
    }
    return processedBlock;
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async finish() {
    let result;
    if (this.i === 0) {
      result = new Uint8Array();
    } else {
      const processedBlock = this._runCFB(this.nextBlock);
      result = processedBlock.subarray(0, this.i);
    }
    this.clearSensitiveData();
    return result;
  }
  clearSensitiveData() {
    this.nextBlock.fill(0);
    this.prevBlock.fill(0);
    this.key.fill(0);
  }
};
async function aesEncrypt(algo, key, pt, iv) {
  if (webCrypto6 && await WebCryptoEncryptor.isSupported(algo)) {
    const cfb2 = new WebCryptoEncryptor(algo, key, iv);
    return util_default.isStream(pt) ? transformAsync(pt, (value) => cfb2.encryptChunk(value), () => cfb2.finish()) : cfb2.encrypt(pt);
  } else if (util_default.isStream(pt)) {
    const cfb2 = new NobleStreamProcessor(true, algo, key, iv);
    return transformAsync(pt, (value) => cfb2.processChunk(value), () => cfb2.finish());
  }
  return cfb(key, iv).encrypt(pt);
}
function aesDecrypt(algo, key, ct, iv) {
  if (util_default.isStream(ct)) {
    const cfb2 = new NobleStreamProcessor(false, algo, key, iv);
    return transformAsync(ct, (value) => cfb2.processChunk(value), () => cfb2.finish());
  }
  return cfb(key, iv).decrypt(ct);
}
function xorMut(a, b) {
  const aLength = Math.min(a.length, b.length);
  for (let i = 0; i < aLength; i++) {
    a[i] = a[i] ^ b[i];
  }
}
var getUint32Array = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
function nodeEncrypt2(algo, key, pt, iv) {
  const algoName = enums_default.read(enums_default.symmetric, algo);
  const cipherObj = new nodeCrypto6.createCipheriv(nodeAlgos[algoName], key, iv);
  return transform(pt, (value) => new Uint8Array(cipherObj.update(value)));
}
function nodeDecrypt2(algo, key, ct, iv) {
  const algoName = enums_default.read(enums_default.symmetric, algo);
  const decipherObj = new nodeCrypto6.createDecipheriv(nodeAlgos[algoName], key, iv);
  return transform(ct, (value) => new Uint8Array(decipherObj.update(value)));
}

// vendor/src/openpgpjs/src/crypto/cmac.js
var webCrypto7 = util_default.getWebCrypto();
var nodeCrypto7 = util_default.getNodeCrypto();
var blockLength = 16;
function rightXORMut(data, padding) {
  const offset = data.length - blockLength;
  for (let i = 0; i < blockLength; i++) {
    data[i + offset] ^= padding[i];
  }
  return data;
}
function pad(data, padding, padding2) {
  if (data.length && data.length % blockLength === 0) {
    return rightXORMut(data, padding);
  }
  const padded = new Uint8Array(data.length + (blockLength - data.length % blockLength));
  padded.set(data);
  padded[data.length] = 128;
  return rightXORMut(padded, padding2);
}
var zeroBlock = new Uint8Array(blockLength);
async function CMAC(key) {
  const cbc2 = await CBC(key);
  const padding = util_default.double(await cbc2(zeroBlock));
  const padding2 = util_default.double(padding);
  return async function(data) {
    return (await cbc2(pad(data, padding, padding2))).subarray(-blockLength);
  };
}
async function CBC(key) {
  if (util_default.getNodeCrypto()) {
    return async function(pt) {
      const en = new nodeCrypto7.createCipheriv("aes-" + key.length * 8 + "-cbc", key, zeroBlock);
      const ct = en.update(pt);
      return new Uint8Array(ct);
    };
  }
  if (util_default.getWebCrypto()) {
    try {
      key = await webCrypto7.importKey("raw", key, { name: "AES-CBC", length: key.length * 8 }, false, ["encrypt"]);
      return async function(pt) {
        const ct = await webCrypto7.encrypt({ name: "AES-CBC", iv: zeroBlock, length: blockLength * 8 }, key, pt);
        return new Uint8Array(ct).subarray(0, ct.byteLength - blockLength);
      };
    } catch (err2) {
      if (err2.name !== "NotSupportedError" && !(key.length === 24 && err2.name === "OperationError")) {
        throw err2;
      }
      util_default.printDebugError("Browser did not support operation: " + err2.message);
    }
  }
  return async function(pt) {
    return cbc(key, zeroBlock, { disablePadding: true }).encrypt(pt);
  };
}

// vendor/src/openpgpjs/src/crypto/cipherMode/eax.js
var webCrypto8 = util_default.getWebCrypto();
var nodeCrypto8 = util_default.getNodeCrypto();
var Buffer3 = util_default.getNodeBuffer();
var blockLength2 = 16;
var ivLength = blockLength2;
var tagLength = blockLength2;
var zero = new Uint8Array(blockLength2);
var one = new Uint8Array(blockLength2);
one[blockLength2 - 1] = 1;
var two = new Uint8Array(blockLength2);
two[blockLength2 - 1] = 2;
async function OMAC(key) {
  const cmac = await CMAC(key);
  return function(t, message) {
    return cmac(util_default.concatUint8Array([t, message]));
  };
}
async function CTR(key) {
  if (util_default.getNodeCrypto()) {
    return async function(pt, iv) {
      const en = new nodeCrypto8.createCipheriv("aes-" + key.length * 8 + "-ctr", key, iv);
      const ct = Buffer3.concat([en.update(pt), en.final()]);
      return new Uint8Array(ct);
    };
  }
  if (util_default.getWebCrypto()) {
    try {
      const keyRef = await webCrypto8.importKey("raw", key, { name: "AES-CTR", length: key.length * 8 }, false, ["encrypt"]);
      return async function(pt, iv) {
        const ct = await webCrypto8.encrypt({ name: "AES-CTR", counter: iv, length: blockLength2 * 8 }, keyRef, pt);
        return new Uint8Array(ct);
      };
    } catch (err2) {
      if (err2.name !== "NotSupportedError" && !(key.length === 24 && err2.name === "OperationError")) {
        throw err2;
      }
      util_default.printDebugError("Browser did not support operation: " + err2.message);
    }
  }
  return async function(pt, iv) {
    return ctr(key, iv).encrypt(pt);
  };
}
async function EAX(cipher, key) {
  if (cipher !== enums_default.symmetric.aes128 && cipher !== enums_default.symmetric.aes192 && cipher !== enums_default.symmetric.aes256) {
    throw new Error("EAX mode supports only AES cipher");
  }
  const [
    omac,
    ctr2
  ] = await Promise.all([
    OMAC(key),
    CTR(key)
  ]);
  return {
    /**
     * Encrypt plaintext input.
     * @param {Uint8Array} plaintext - The cleartext input to be encrypted
     * @param {Uint8Array} nonce - The nonce (16 bytes)
     * @param {Uint8Array} adata - Associated data to sign
     * @returns {Promise<Uint8Array>} The ciphertext output.
     */
    encrypt: async function(plaintext, nonce, adata) {
      const [
        omacNonce,
        omacAdata
      ] = await Promise.all([
        omac(zero, nonce),
        omac(one, adata)
      ]);
      const ciphered = await ctr2(plaintext, omacNonce);
      const omacCiphered = await omac(two, ciphered);
      const tag = omacCiphered;
      for (let i = 0; i < tagLength; i++) {
        tag[i] ^= omacAdata[i] ^ omacNonce[i];
      }
      return util_default.concatUint8Array([ciphered, tag]);
    },
    /**
     * Decrypt ciphertext input.
     * @param {Uint8Array} ciphertext - The ciphertext input to be decrypted
     * @param {Uint8Array} nonce - The nonce (16 bytes)
     * @param {Uint8Array} adata - Associated data to verify
     * @returns {Promise<Uint8Array>} The plaintext output.
     */
    decrypt: async function(ciphertext, nonce, adata) {
      if (ciphertext.length < tagLength) throw new Error("Invalid EAX ciphertext");
      const ciphered = ciphertext.subarray(0, -tagLength);
      const ctTag = ciphertext.subarray(-tagLength);
      const [
        omacNonce,
        omacAdata,
        omacCiphered
      ] = await Promise.all([
        omac(zero, nonce),
        omac(one, adata),
        omac(two, ciphered)
      ]);
      const tag = omacCiphered;
      for (let i = 0; i < tagLength; i++) {
        tag[i] ^= omacAdata[i] ^ omacNonce[i];
      }
      if (!util_default.timingSafeEqualsUint8Array(ctTag, tag)) throw new Error("Authentication tag mismatch");
      const plaintext = await ctr2(ciphered, omacNonce);
      return plaintext;
    }
  };
}
EAX.getNonce = function(iv, chunkIndex) {
  const nonce = iv.slice();
  for (let i = 0; i < chunkIndex.length; i++) {
    nonce[8 + i] ^= chunkIndex[i];
  }
  return nonce;
};
EAX.blockLength = blockLength2;
EAX.ivLength = ivLength;
EAX.tagLength = tagLength;
var eax_default = EAX;

// vendor/src/openpgpjs/src/crypto/cipherMode/ocb.js
var blockLength3 = 16;
var ivLength2 = 15;
var tagLength2 = 16;
function ntz(n) {
  let ntz2 = 0;
  for (let i = 1; (n & i) === 0; i <<= 1) {
    ntz2++;
  }
  return ntz2;
}
function xorMut2(S2, T) {
  for (let i = 0; i < S2.length; i++) {
    S2[i] ^= T[i];
  }
  return S2;
}
function xor(S2, T) {
  return xorMut2(S2.slice(), T);
}
var zeroBlock2 = new Uint8Array(blockLength3);
var one2 = new Uint8Array([1]);
async function OCB(cipher, key) {
  const { keySize } = getCipherParams(cipher);
  if (!util_default.isAES(cipher) || key.length !== keySize) {
    throw new Error("Unexpected algorithm or key size");
  }
  let maxNtz = 0;
  const encipher = (block) => cbc(key, zeroBlock2, { disablePadding: true }).encrypt(block);
  const decipher = (block) => cbc(key, zeroBlock2, { disablePadding: true }).decrypt(block);
  let mask;
  constructKeyVariables(cipher, key);
  function constructKeyVariables() {
    const mask_x = encipher(zeroBlock2);
    const mask_$ = util_default.double(mask_x);
    mask = [];
    mask[0] = util_default.double(mask_$);
    mask.x = mask_x;
    mask.$ = mask_$;
  }
  function extendKeyVariables(text, adata) {
    const newMaxNtz = util_default.nbits(Math.max(text.length, adata.length) / blockLength3 | 0) - 1;
    for (let i = maxNtz + 1; i <= newMaxNtz; i++) {
      mask[i] = util_default.double(mask[i - 1]);
    }
    maxNtz = newMaxNtz;
  }
  function hash(adata) {
    if (!adata.length) {
      return zeroBlock2;
    }
    const m = adata.length / blockLength3 | 0;
    const offset = new Uint8Array(blockLength3);
    const sum = new Uint8Array(blockLength3);
    for (let i = 0; i < m; i++) {
      xorMut2(offset, mask[ntz(i + 1)]);
      xorMut2(sum, encipher(xor(offset, adata)));
      adata = adata.subarray(blockLength3);
    }
    if (adata.length) {
      xorMut2(offset, mask.x);
      const cipherInput = new Uint8Array(blockLength3);
      cipherInput.set(adata, 0);
      cipherInput[adata.length] = 128;
      xorMut2(cipherInput, offset);
      xorMut2(sum, encipher(cipherInput));
    }
    return sum;
  }
  function crypt(fn, text, nonce, adata) {
    const m = text.length / blockLength3 | 0;
    extendKeyVariables(text, adata);
    const paddedNonce = util_default.concatUint8Array([zeroBlock2.subarray(0, ivLength2 - nonce.length), one2, nonce]);
    const bottom = paddedNonce[blockLength3 - 1] & 63;
    paddedNonce[blockLength3 - 1] &= 192;
    const kTop = encipher(paddedNonce);
    const stretched = util_default.concatUint8Array([kTop, xor(kTop.subarray(0, 8), kTop.subarray(1, 9))]);
    const offset = util_default.shiftRight(stretched.subarray(0 + (bottom >> 3), 17 + (bottom >> 3)), 8 - (bottom & 7)).subarray(1);
    const checksum = new Uint8Array(blockLength3);
    const ct = new Uint8Array(text.length + tagLength2);
    let i;
    let pos = 0;
    for (i = 0; i < m; i++) {
      xorMut2(offset, mask[ntz(i + 1)]);
      ct.set(xorMut2(fn(xor(offset, text)), offset), pos);
      xorMut2(checksum, fn === encipher ? text : ct.subarray(pos));
      text = text.subarray(blockLength3);
      pos += blockLength3;
    }
    if (text.length) {
      xorMut2(offset, mask.x);
      const padding = encipher(offset);
      ct.set(xor(text, padding), pos);
      const xorInput = new Uint8Array(blockLength3);
      xorInput.set(fn === encipher ? text : ct.subarray(pos, -tagLength2), 0);
      xorInput[text.length] = 128;
      xorMut2(checksum, xorInput);
      pos += text.length;
    }
    const tag = xorMut2(encipher(xorMut2(xorMut2(checksum, offset), mask.$)), hash(adata));
    ct.set(tag, pos);
    return ct;
  }
  return {
    /**
     * Encrypt plaintext input.
     * @param {Uint8Array} plaintext - The cleartext input to be encrypted
     * @param {Uint8Array} nonce - The nonce (15 bytes)
     * @param {Uint8Array} adata - Associated data to sign
     * @returns {Promise<Uint8Array>} The ciphertext output.
     */
    encrypt: async function(plaintext, nonce, adata) {
      return crypt(encipher, plaintext, nonce, adata);
    },
    /**
     * Decrypt ciphertext input.
     * @param {Uint8Array} ciphertext - The ciphertext input to be decrypted
     * @param {Uint8Array} nonce - The nonce (15 bytes)
     * @param {Uint8Array} adata - Associated data to sign
     * @returns {Promise<Uint8Array>} The ciphertext output.
     */
    // eslint-disable-next-line @typescript-eslint/require-await
    decrypt: async function(ciphertext, nonce, adata) {
      if (ciphertext.length < tagLength2) throw new Error("Invalid OCB ciphertext");
      const tag = ciphertext.subarray(-tagLength2);
      ciphertext = ciphertext.subarray(0, -tagLength2);
      const crypted = crypt(decipher, ciphertext, nonce, adata);
      if (util_default.timingSafeEqualsUint8Array(tag, crypted.subarray(-tagLength2))) {
        return crypted.subarray(0, -tagLength2);
      }
      throw new Error("Authentication tag mismatch");
    }
  };
}
OCB.getNonce = function(iv, chunkIndex) {
  const nonce = iv.slice();
  for (let i = 0; i < chunkIndex.length; i++) {
    nonce[7 + i] ^= chunkIndex[i];
  }
  return nonce;
};
OCB.blockLength = blockLength3;
OCB.ivLength = ivLength2;
OCB.tagLength = tagLength2;
var ocb_default = OCB;

// vendor/src/openpgpjs/src/crypto/cipherMode/gcm.js
var webCrypto9 = util_default.getWebCrypto();
var nodeCrypto9 = util_default.getNodeCrypto();
var Buffer4 = util_default.getNodeBuffer();
var blockLength4 = 16;
var ivLength3 = 12;
var tagLength3 = 16;
var ALGO = "AES-GCM";
async function GCM(cipher, key) {
  if (cipher !== enums_default.symmetric.aes128 && cipher !== enums_default.symmetric.aes192 && cipher !== enums_default.symmetric.aes256) {
    throw new Error("GCM mode supports only AES cipher");
  }
  if (util_default.getNodeCrypto()) {
    return {
      // eslint-disable-next-line @typescript-eslint/require-await
      encrypt: async function(pt, iv, adata = new Uint8Array()) {
        const en = new nodeCrypto9.createCipheriv("aes-" + key.length * 8 + "-gcm", key, iv);
        en.setAAD(adata);
        const ct = Buffer4.concat([en.update(pt), en.final(), en.getAuthTag()]);
        return new Uint8Array(ct);
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      decrypt: async function(ct, iv, adata = new Uint8Array()) {
        const de = new nodeCrypto9.createDecipheriv("aes-" + key.length * 8 + "-gcm", key, iv);
        de.setAAD(adata);
        de.setAuthTag(ct.slice(ct.length - tagLength3, ct.length));
        const pt = Buffer4.concat([de.update(ct.slice(0, ct.length - tagLength3)), de.final()]);
        return new Uint8Array(pt);
      }
    };
  }
  if (util_default.getWebCrypto()) {
    try {
      const _key = await webCrypto9.importKey("raw", key, { name: ALGO }, false, ["encrypt", "decrypt"]);
      const webcryptoEmptyMessagesUnsupported = navigator.userAgent.match(/Version\/13\.\d(\.\d)* Safari/) || navigator.userAgent.match(/Version\/(13|14)\.\d(\.\d)* Mobile\/\S* Safari/);
      return {
        encrypt: async function(pt, iv, adata = new Uint8Array()) {
          if (webcryptoEmptyMessagesUnsupported && !pt.length) {
            return gcm(key, iv, adata).encrypt(pt);
          }
          const ct = await webCrypto9.encrypt({ name: ALGO, iv, additionalData: adata, tagLength: tagLength3 * 8 }, _key, pt);
          return new Uint8Array(ct);
        },
        decrypt: async function(ct, iv, adata = new Uint8Array()) {
          if (webcryptoEmptyMessagesUnsupported && ct.length === tagLength3) {
            return gcm(key, iv, adata).decrypt(ct);
          }
          try {
            const pt = await webCrypto9.decrypt({ name: ALGO, iv, additionalData: adata, tagLength: tagLength3 * 8 }, _key, ct);
            return new Uint8Array(pt);
          } catch (e) {
            if (e.name === "OperationError") {
              throw new Error("Authentication tag mismatch");
            }
          }
        }
      };
    } catch (err2) {
      if (err2.name !== "NotSupportedError" && !(key.length === 24 && err2.name === "OperationError")) {
        throw err2;
      }
      util_default.printDebugError("Browser did not support operation: " + err2.message);
    }
  }
  return {
    // eslint-disable-next-line @typescript-eslint/require-await
    encrypt: async function(pt, iv, adata) {
      return gcm(key, iv, adata).encrypt(pt);
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    decrypt: async function(ct, iv, adata) {
      return gcm(key, iv, adata).decrypt(ct);
    }
  };
}
GCM.getNonce = function(iv, chunkIndex) {
  const nonce = iv.slice();
  for (let i = 0; i < chunkIndex.length; i++) {
    nonce[4 + i] ^= chunkIndex[i];
  }
  return nonce;
};
GCM.blockLength = blockLength4;
GCM.ivLength = ivLength3;
GCM.tagLength = tagLength3;
var gcm_default = GCM;

// vendor/src/openpgpjs/src/crypto/cipherMode/index.js
function getAEADMode(algo, acceptExperimentalGCM = false) {
  switch (algo) {
    case enums_default.aead.eax:
      return eax_default;
    case enums_default.aead.ocb:
      return ocb_default;
    case enums_default.aead.gcm:
      return gcm_default;
    case enums_default.aead.experimentalGCM:
      if (!acceptExperimentalGCM) {
        throw new Error("Unexpected non-standard `experimentalGCM` AEAD algorithm provided in `config.preferredAEADAlgorithm`: use `gcm` instead");
      }
      return gcm_default;
    default:
      throw new Error("Unsupported AEAD mode");
  }
}

// vendor/src/openpgpjs/src/crypto/signature.js
var signature_exports = {};
__export(signature_exports, {
  parseSignatureParams: () => parseSignatureParams,
  sign: () => sign6,
  verify: () => verify6
});
function parseSignatureParams(algo, signature) {
  let read = 0;
  switch (algo) {
    // Algorithm-Specific Fields for RSA signatures:
    // -  MPI of RSA signature value m**d mod n.
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.rsaSign: {
      const s = util_default.readMPI(signature.subarray(read));
      read += s.length + 2;
      return { read, signatureParams: { s } };
    }
    // Algorithm-Specific Fields for DSA or ECDSA signatures:
    // -  MPI of DSA or ECDSA value r.
    // -  MPI of DSA or ECDSA value s.
    case enums_default.publicKey.dsa:
    case enums_default.publicKey.ecdsa: {
      const r = util_default.readMPI(signature.subarray(read));
      read += r.length + 2;
      const s = util_default.readMPI(signature.subarray(read));
      read += s.length + 2;
      return { read, signatureParams: { r, s } };
    }
    // Algorithm-Specific Fields for legacy EdDSA signatures:
    // -  MPI of an EC point r.
    // -  EdDSA value s, in MPI, in the little endian representation
    case enums_default.publicKey.eddsaLegacy: {
      const r = util_default.readMPI(signature.subarray(read));
      read += r.length + 2;
      const s = util_default.readMPI(signature.subarray(read));
      read += s.length + 2;
      return { read, signatureParams: { r, s } };
    }
    // Algorithm-Specific Fields for Ed25519 signatures:
    // - 64 octets of the native signature
    // Algorithm-Specific Fields for Ed448 signatures:
    // - 114 octets of the native signature
    case enums_default.publicKey.ed25519:
    case enums_default.publicKey.ed448: {
      const rsSize = 2 * elliptic_exports.eddsa.getPayloadSize(algo);
      const RS = util_default.readExactSubarray(signature, read, read + rsSize);
      read += RS.length;
      return { read, signatureParams: { RS } };
    }
    default:
      throw new UnsupportedError("Unknown signature algorithm.");
  }
}
async function verify6(algo, hashAlgo, signature, publicParams, data, hashed) {
  switch (algo) {
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.rsaSign: {
      const { n, e } = publicParams;
      const s = util_default.leftPad(signature.s, n.length);
      return rsa_exports.verify(hashAlgo, data, s, n, e, hashed);
    }
    case enums_default.publicKey.dsa: {
      const { g, p, q, y } = publicParams;
      const { r, s } = signature;
      return dsa_exports.verify(hashAlgo, r, s, hashed, g, p, q, y);
    }
    case enums_default.publicKey.ecdsa: {
      const { oid, Q } = publicParams;
      const curveSize = new elliptic_exports.CurveWithOID(oid).payloadSize;
      const r = util_default.leftPad(signature.r, curveSize);
      const s = util_default.leftPad(signature.s, curveSize);
      return elliptic_exports.ecdsa.verify(oid, hashAlgo, { r, s }, data, Q, hashed);
    }
    case enums_default.publicKey.eddsaLegacy: {
      const { oid, Q } = publicParams;
      const curveSize = new elliptic_exports.CurveWithOID(oid).payloadSize;
      const r = util_default.leftPad(signature.r, curveSize);
      const s = util_default.leftPad(signature.s, curveSize);
      return elliptic_exports.eddsaLegacy.verify(oid, hashAlgo, { r, s }, data, Q, hashed);
    }
    case enums_default.publicKey.ed25519:
    case enums_default.publicKey.ed448: {
      const { A: A2 } = publicParams;
      return elliptic_exports.eddsa.verify(algo, hashAlgo, signature, data, A2, hashed);
    }
    default:
      throw new Error("Unknown signature algorithm.");
  }
}
async function sign6(algo, hashAlgo, publicKeyParams, privateKeyParams, data, hashed) {
  if (!publicKeyParams || !privateKeyParams) {
    throw new Error("Missing key parameters");
  }
  switch (algo) {
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.rsaSign: {
      const { n, e } = publicKeyParams;
      const { d, p, q, u } = privateKeyParams;
      const s = await rsa_exports.sign(hashAlgo, data, n, e, d, p, q, u, hashed);
      return { s };
    }
    case enums_default.publicKey.dsa: {
      const { g, p, q } = publicKeyParams;
      const { x } = privateKeyParams;
      return dsa_exports.sign(hashAlgo, hashed, g, p, q, x);
    }
    case enums_default.publicKey.elgamal:
      throw new Error("Signing with Elgamal is not defined in the OpenPGP standard.");
    case enums_default.publicKey.ecdsa: {
      const { oid, Q } = publicKeyParams;
      const { d } = privateKeyParams;
      return elliptic_exports.ecdsa.sign(oid, hashAlgo, data, Q, d, hashed);
    }
    case enums_default.publicKey.eddsaLegacy: {
      const { oid, Q } = publicKeyParams;
      const { seed } = privateKeyParams;
      return elliptic_exports.eddsaLegacy.sign(oid, hashAlgo, data, Q, seed, hashed);
    }
    case enums_default.publicKey.ed25519:
    case enums_default.publicKey.ed448: {
      const { A: A2 } = publicKeyParams;
      const { seed } = privateKeyParams;
      return elliptic_exports.eddsa.sign(algo, hashAlgo, data, A2, seed, hashed);
    }
    default:
      throw new Error("Unknown signature algorithm.");
  }
}

// vendor/src/openpgpjs/src/type/s2k/argon2.js
var ARGON2_TYPE = 2;
var ARGON2_VERSION = 19;
var ARGON2_SALT_SIZE = 16;
var ARGON2_MAX_ENCODEDM = 30;
var Argon2OutOfMemoryError = class _Argon2OutOfMemoryError extends Error {
  constructor(...params) {
    super(...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _Argon2OutOfMemoryError);
    }
    this.name = "Argon2OutOfMemoryError";
  }
};
var loadArgonWasmModule;
var argon2Promise;
var ARGON2_WASM_MEMORY_THRESHOLD_RELOAD = 2 << 19;
var Argon2S2K = class {
  /**
  * @param {Object} [config] - Full configuration, defaults to openpgp.config
  */
  constructor(config2 = config_default) {
    const { passes, parallelism, memoryExponent } = config2.s2kArgon2Params;
    this.type = "argon2";
    this.salt = null;
    this.t = passes;
    this.p = parallelism;
    this.encodedM = memoryExponent;
  }
  generateSalt() {
    this.salt = getRandomBytes(ARGON2_SALT_SIZE);
  }
  /**
  * Parsing function for argon2 string-to-key specifier.
  * @param {Uint8Array} bytes - Payload of argon2 string-to-key specifier
  * @returns {Integer} Actual length of the object.
  */
  read(bytes) {
    let i = 0;
    this.salt = bytes.subarray(i, i + 16);
    i += 16;
    this.t = bytes[i++];
    this.p = bytes[i++];
    this.encodedM = bytes[i++];
    return i;
  }
  /**
  * Serializes s2k information
  * @returns {Uint8Array} Binary representation of s2k.
  */
  write() {
    const arr = [
      new Uint8Array([enums_default.write(enums_default.s2k, this.type)]),
      this.salt,
      new Uint8Array([this.t, this.p, this.encodedM])
    ];
    return util_default.concatUint8Array(arr);
  }
  /**
  * Produces a key using the specified passphrase and the defined
  * hashAlgorithm
  * @param {String} passphrase - Passphrase containing user input
  * @param {Number} keySize
  * @param {Object} config
  * @returns {Promise<Uint8Array>} Produced key with a length corresponding to `keySize`
  * @throws {Argon2OutOfMemoryError|Errors}
  * @async
  */
  async produceKey(passphrase, keySize, config2) {
    if (config2.maxArgon2MemoryExponent > ARGON2_MAX_ENCODEDM) {
      throw new Argon2OutOfMemoryError(`'config.maxArgon2MemoryExponent' exceeds the max allowed value of ${ARGON2_MAX_ENCODEDM}`);
    }
    if (this.encodedM > config2.maxArgon2MemoryExponent) {
      throw new Argon2OutOfMemoryError("Argon2 required memory exceeds `config.maxArgon2MemoryExponent`");
    }
    const decodedM = 1 << this.encodedM;
    try {
      loadArgonWasmModule = loadArgonWasmModule || (await Promise.resolve().then(() => (init_argon2id2(), argon2id_exports))).default;
      argon2Promise = argon2Promise || loadArgonWasmModule();
      const argon2 = await argon2Promise;
      const passwordBytes = util_default.encodeUTF8(passphrase);
      const hash = argon2({
        version: ARGON2_VERSION,
        type: ARGON2_TYPE,
        password: passwordBytes,
        salt: this.salt,
        tagLength: keySize,
        memorySize: decodedM,
        parallelism: this.p,
        passes: this.t
      });
      if (decodedM > ARGON2_WASM_MEMORY_THRESHOLD_RELOAD) {
        argon2Promise = loadArgonWasmModule();
        argon2Promise.catch(() => {
        });
      }
      return hash;
    } catch (e) {
      if (e.message && (e.message.includes("Unable to grow instance memory") || // Chrome
      e.message.includes("failed to grow memory") || // Firefox
      e.message.includes("WebAssembly.Memory.grow") || // Safari
      e.message.includes("Out of memory"))) {
        throw new Argon2OutOfMemoryError("Could not allocate required memory for Argon2");
      } else {
        throw e;
      }
    }
  }
};
var argon2_default = Argon2S2K;

// vendor/src/openpgpjs/src/type/s2k/generic.js
var GenericS2K = class {
  /**
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   */
  constructor(s2kType, config2 = config_default) {
    this.algorithm = enums_default.hash.sha256;
    this.type = enums_default.read(enums_default.s2k, s2kType);
    this.c = config2.s2kIterationCountByte;
    this.salt = null;
  }
  generateSalt() {
    switch (this.type) {
      case "salted":
      case "iterated":
        this.salt = getRandomBytes(8);
    }
  }
  getCount() {
    const expbias = 6;
    return 16 + (this.c & 15) << (this.c >> 4) + expbias;
  }
  /**
   * Parsing function for a string-to-key specifier ({@link https://tools.ietf.org/html/rfc4880#section-3.7|RFC 4880 3.7}).
   * @param {Uint8Array} bytes - Payload of string-to-key specifier
   * @returns {Integer} Actual length of the object.
   */
  read(bytes) {
    let i = 0;
    this.algorithm = bytes[i++];
    switch (this.type) {
      case "simple":
        break;
      case "salted":
        this.salt = bytes.subarray(i, i + 8);
        i += 8;
        break;
      case "iterated":
        this.salt = bytes.subarray(i, i + 8);
        i += 8;
        this.c = bytes[i++];
        break;
      case "gnu":
        if (util_default.uint8ArrayToString(bytes.subarray(i, i + 3)) === "GNU") {
          i += 3;
          const gnuExtType = 1e3 + bytes[i++];
          if (gnuExtType === 1001) {
            this.type = "gnu-dummy";
          } else {
            throw new UnsupportedError("Unknown s2k gnu protection mode.");
          }
        } else {
          throw new UnsupportedError("Unknown s2k type.");
        }
        break;
      default:
        throw new UnsupportedError("Unknown s2k type.");
    }
    return i;
  }
  /**
   * Serializes s2k information
   * @returns {Uint8Array} Binary representation of s2k.
   */
  write() {
    if (this.type === "gnu-dummy") {
      return new Uint8Array([101, 0, ...util_default.stringToUint8Array("GNU"), 1]);
    }
    const arr = [new Uint8Array([enums_default.write(enums_default.s2k, this.type), this.algorithm])];
    switch (this.type) {
      case "simple":
        break;
      case "salted":
        arr.push(this.salt);
        break;
      case "iterated":
        arr.push(this.salt);
        arr.push(new Uint8Array([this.c]));
        break;
      case "gnu":
        throw new Error("GNU s2k type not supported.");
      default:
        throw new Error("Unknown s2k type.");
    }
    return util_default.concatUint8Array(arr);
  }
  /**
   * Produces a key using the specified passphrase and the defined
   * hashAlgorithm
   * @param {String} passphrase - Passphrase containing user input
   * @returns {Promise<Uint8Array>} Produced key with a length corresponding to.
   * hashAlgorithm hash length
   * @async
   */
  async produceKey(passphrase, numBytes, _config) {
    passphrase = util_default.encodeUTF8(passphrase);
    const arr = [];
    let rlength = 0;
    let prefixlen = 0;
    while (rlength < numBytes) {
      let toHash;
      switch (this.type) {
        case "simple":
          toHash = util_default.concatUint8Array([new Uint8Array(prefixlen), passphrase]);
          break;
        case "salted":
          toHash = util_default.concatUint8Array([new Uint8Array(prefixlen), this.salt, passphrase]);
          break;
        case "iterated": {
          const data = util_default.concatUint8Array([this.salt, passphrase]);
          let datalen = data.length;
          const count = Math.max(this.getCount(), datalen);
          toHash = new Uint8Array(prefixlen + count);
          toHash.set(data, prefixlen);
          for (let pos = prefixlen + datalen; pos < count; pos += datalen, datalen *= 2) {
            toHash.copyWithin(pos, prefixlen, pos);
          }
          break;
        }
        case "gnu":
          throw new Error("GNU s2k type not supported.");
        default:
          throw new Error("Unknown s2k type.");
      }
      const result = await computeDigest(this.algorithm, toHash);
      arr.push(result);
      rlength += result.length;
      prefixlen++;
    }
    return util_default.concatUint8Array(arr).subarray(0, numBytes);
  }
};
var generic_default = GenericS2K;

// vendor/src/openpgpjs/src/type/s2k/index.js
var allowedS2KTypesForEncryption = /* @__PURE__ */ new Set([enums_default.s2k.argon2, enums_default.s2k.iterated]);
function newS2KFromType(type, config2 = config_default) {
  switch (type) {
    case enums_default.s2k.argon2:
      return new argon2_default(config2);
    case enums_default.s2k.iterated:
    case enums_default.s2k.gnu:
    case enums_default.s2k.salted:
    case enums_default.s2k.simple:
      return new generic_default(type, config2);
    default:
      throw new UnsupportedError("Unsupported S2K type");
  }
}
function newS2KFromConfig(config2) {
  const { s2kType } = config2;
  if (!allowedS2KTypesForEncryption.has(s2kType)) {
    throw new Error("The provided `config.s2kType` value is not allowed");
  }
  return newS2KFromType(s2kType, config2);
}

// vendor/src/fflate/src/node-worker.ts
var Worker;
var isMarkedAsUntransferable;
var workerAdd = ";var __w=require('worker_threads');__w.parentPort.on('message',function(m){onmessage({data:m})}),postMessage=function(m,t){__w.parentPort.postMessage(m,t)},close=process.exit;self=global";
try {
  ({ Worker, isMarkedAsUntransferable } = __require("worker_threads"));
} catch (e) {
}
var node_worker_default = Worker ? (c, _, msg, transfer, cb) => {
  let done = false;
  const w = new Worker(c + workerAdd, { eval: true }).on("error", (e) => cb(e, null)).on("message", (m) => cb(null, m)).on("exit", (c2) => {
    if (c2 && !done) cb(new Error("exited with code " + c2), null);
  });
  if (isMarkedAsUntransferable) transfer = transfer.filter((t) => !isMarkedAsUntransferable(t));
  w.postMessage(msg, transfer);
  w.terminate = () => {
    done = true;
    return Worker.prototype.terminate.call(w);
  };
  return w;
} : (_, __, ___, ____, cb) => {
  setImmediate(() => cb(new Error("async operations unsupported - update to Node 12+ (or Node 10-11 with the --experimental-worker CLI flag)"), null));
  const NOP = () => {
  };
  return {
    terminate: NOP,
    postMessage: NOP
  };
};

// vendor/src/fflate/src/index.ts
var u82 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u82([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u82([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u82([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = (eb, start) => {
  const b = new u16(31);
  for (let i = 0; i < 31; ++i) {
    b[i] = start += 1 << eb[i - 1];
  }
  const r = new i32(b[30]);
  for (let i = 1; i < 30; ++i) {
    for (let j = b[i]; j < b[i + 1]; ++j) {
      r[j] = j - b[i] << 5 | i;
    }
  }
  return { b, r };
};
var { b: fl, r: revfl } = freb(fleb, 2);
fl[28] = 258, revfl[258] = 28;
var { b: fd, r: revfd } = freb(fdeb, 0);
var rev = new u16(32768);
for (let i = 0; i < 32768; ++i) {
  let x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var hMap = ((cd, mb, r) => {
  const s = cd.length;
  let i = 0;
  const l = new u16(mb);
  for (; i < s; ++i) {
    if (cd[i]) ++l[cd[i] - 1];
  }
  const le = new u16(mb);
  for (i = 1; i < mb; ++i) {
    le[i] = le[i - 1] + l[i - 1] << 1;
  }
  let co;
  if (r) {
    co = new u16(1 << mb);
    const rvb = 15 - mb;
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        const sv = i << 4 | cd[i];
        const r2 = mb - cd[i];
        let v = le[cd[i] - 1]++ << r2;
        for (const m = v | (1 << r2) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
      }
    }
  }
  return co;
});
var flt = new u82(288);
for (let i = 0; i < 144; ++i) flt[i] = 8;
for (let i = 144; i < 256; ++i) flt[i] = 9;
for (let i = 256; i < 280; ++i) flt[i] = 7;
for (let i = 280; i < 288; ++i) flt[i] = 8;
var fdt = new u82(32);
for (let i = 0; i < 32; ++i) fdt[i] = 5;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = (a) => {
  let m = a[0];
  for (let i = 1; i < a.length; ++i) {
    if (a[i] > m) m = a[i];
  }
  return m;
};
var bits = (d, p, m) => {
  const o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = (d, p) => {
  const o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = (p) => (p + 7) / 8 | 0;
var slc = (v, s, e) => {
  if (s == null || s < 0) s = 0;
  if (e == null || e > v.length) e = v.length;
  return new u82(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = (ind, msg, nt) => {
  const e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace) Error.captureStackTrace(e, err);
  if (!nt) throw e;
  return e;
};
var inflt = (dat, st, buf, dict) => {
  const sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l) return buf || new u82(0);
  const noBuf = !buf;
  const resize = noBuf || st.i != 2;
  const noSt = st.i;
  if (noBuf) buf = new u82(sl * 3);
  const cbuf = (l) => {
    let bl = buf.length;
    if (l > bl) {
      const nbuf = new u82(Math.max(bl * 2, l));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  let final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  const tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      const type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        const s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt) err(0);
          break;
        }
        if (resize) cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1) lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        const hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        const tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        const ldt = new u82(tl);
        const clt = new u82(19);
        for (let i = 0; i < hcLen; ++i) {
          clt[clim[i]] = bits(dat, pos + i * 3, 7);
        }
        pos += hcLen * 3;
        const clb = max(clt), clbmsk = (1 << clb) - 1;
        const clm = hMap(clt, clb, 1);
        for (let i = 0; i < tl; ) {
          const r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          const s = r >> 4;
          if (s < 16) {
            ldt[i++] = s;
          } else {
            let c = 0, n = 0;
            if (s == 16) n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
            else if (s == 17) n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18) n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--) ldt[i++] = c;
          }
        }
        const lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else err(1);
      if (pos > tbts) {
        if (noSt) err(0);
        break;
      }
    }
    if (resize) cbuf(bt + 131072);
    const lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    let lpos = pos;
    for (; ; lpos = pos) {
      const c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt) err(0);
        break;
      }
      if (!c) err(2);
      if (sym < 256) buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        let add3 = sym - 254;
        if (sym > 264) {
          const i = sym - 257, b = fleb[i];
          add3 = bits(dat, pos, (1 << b) - 1) + fl[i];
          pos += b;
        }
        const d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d) err(3);
        pos += d & 15;
        let dt = fd[dsym];
        if (dsym > 3) {
          const b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt) err(0);
          break;
        }
        if (resize) cbuf(bt + 131072);
        const end = bt + add3;
        if (bt < dt) {
          const shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0) err(3);
          for (; bt < dend; ++bt) buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt) buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm) final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = (d, p, v) => {
  v <<= p & 7;
  const o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};
var wbits16 = (d, p, v) => {
  v <<= p & 7;
  const o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};
var hTree = (d, mb) => {
  const t = [];
  for (let i = 0; i < d.length; ++i) {
    if (d[i]) t.push({ s: i, f: d[i] });
  }
  const s = t.length;
  const t2 = t.slice();
  if (!s) return { t: et, l: 0 };
  if (s == 1) {
    const v = new u82(t[0].s + 1);
    v[t[0].s] = 1;
    return { t: v, l: 1 };
  }
  t.sort((a, b) => a.f - b.f);
  t.push({ s: -1, f: 25001 });
  let l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i2].f ? i0++ : i2++];
    r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  let maxSym = t2[0].s;
  for (let i = 1; i < s; ++i) {
    if (t2[i].s > maxSym) maxSym = t2[i].s;
  }
  const tr = new u16(maxSym + 1);
  let mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    let i = 0, dt = 0;
    const lft = mbt - mb, cst = 1 << lft;
    t2.sort((a, b) => tr[b.s] - tr[a.s] || a.f - b.f);
    for (; i < s; ++i) {
      const i22 = t2[i].s;
      if (tr[i22] > mb) {
        dt += cst - (1 << mbt - tr[i22]);
        tr[i22] = mb;
      } else break;
    }
    dt >>= lft;
    while (dt > 0) {
      const i22 = t2[i].s;
      if (tr[i22] < mb) dt -= 1 << mb - tr[i22]++ - 1;
      else ++i;
    }
    for (; i >= 0 && dt; --i) {
      const i22 = t2[i].s;
      if (tr[i22] == mb) {
        --tr[i22];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u82(tr), l: mbt };
};
var ln = (n, l, d) => {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = (c) => {
  let s = c.length;
  while (s && !c[--s]) ;
  const cl = new u16(++s);
  let cli = 0, cln = c[0], cls = 1;
  const w = (v) => {
    cl[cli++] = v;
  };
  for (let i = 1; i <= s; ++i) {
    if (c[i] == cln && i != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138) w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6) w(8304);
        if (cls > 2) w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--) w(cln);
      cls = 1;
      cln = c[i];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};
var clen = (cf, cl) => {
  let l = 0;
  for (let i = 0; i < cl.length; ++i) l += cf[i] * cl[i];
  return l;
};
var wfblk = (out, pos, dat) => {
  const s = dat.length;
  const o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (let i = 0; i < s; ++i) out[o + i + 4] = dat[i];
  return (o + 4 + s) * 8;
};
var wblk = (dat, out, final, syms, lf, df, eb, li, bs, bl, p) => {
  wbits(out, p++, final);
  ++lf[256];
  const { t: dlt, l: mlb } = hTree(lf, 15);
  const { t: ddt, l: mdb } = hTree(df, 15);
  const { c: lclt, n: nlc } = lc(dlt);
  const { c: lcdt, n: ndc } = lc(ddt);
  const lcfreq = new u16(19);
  for (let i = 0; i < lclt.length; ++i) ++lcfreq[lclt[i] & 31];
  for (let i = 0; i < lcdt.length; ++i) ++lcfreq[lcdt[i] & 31];
  const { t: lct, l: mlcb } = hTree(lcfreq, 7);
  let nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc) ;
  const flen = bl + 5 << 3;
  const ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  const dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen) return wfblk(out, p, dat.subarray(bs, bs + bl));
  let lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    const llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (let i = 0; i < nlcc; ++i) wbits(out, p + 3 * i, lct[clim[i]]);
    p += 3 * nlcc;
    const lcts = [lclt, lcdt];
    for (let it = 0; it < 2; ++it) {
      const clct = lcts[it];
      for (let i = 0; i < clct.length; ++i) {
        const len = clct[i] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15) wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (let i = 0; i < li; ++i) {
    const sym = syms[i];
    if (sym > 255) {
      const len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7) wbits(out, p, sym >> 23 & 31), p += fleb[len];
      const dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3) wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u82(0);
var dflt = (dat, lvl, plvl, pre, post, st) => {
  const s = st.z || dat.length;
  const o = new u82(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  const w = o.subarray(pre, o.length - post);
  const lst = st.l;
  let pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos) w[0] = st.r >> 3;
    const opt = deo[lvl - 1];
    const n = opt >> 13, c = opt & 8191;
    const msk = (1 << plvl) - 1;
    const prev = st.p || new u16(32768), head = st.h || new u16(msk + 1);
    const bs1 = Math.ceil(plvl / 3), bs2 = 2 * bs1;
    const hsh = (i2) => (dat[i2] ^ dat[i2 + 1] << bs1 ^ dat[i2 + 2] << bs2) & msk;
    const syms = new i32(25e3);
    const lf = new u16(288), df = new u16(32);
    let lc2 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i + 2 < s; ++i) {
      const hv = hsh(i);
      let imod = i & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i) {
        const rem = s - i;
        if ((lc2 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
          li = lc2 = eb = 0, bs = i;
          for (let j = 0; j < 286; ++j) lf[j] = 0;
          for (let j = 0; j < 30; ++j) df[j] = 0;
        }
        let l = 2, d = 0, ch2 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i - dif)) {
          const maxn = Math.min(n, rem) - 1;
          const maxd = Math.min(32767, i);
          const ml = Math.min(258, rem);
          while (dif <= maxd && --ch2 && imod != pimod) {
            if (dat[i + l] == dat[i + l - dif]) {
              let nl = 0;
              for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl) ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn) break;
                const mmd = Math.min(dif, nl - 2);
                let md = 0;
                for (let j = 0; j < mmd; ++j) {
                  const ti = i - dif + j & 32767;
                  const pti = prev[ti];
                  const cd = ti - pti & 32767;
                  if (cd > md) md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          const lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i + l;
          ++lc2;
        } else {
          syms[li++] = dat[i];
          ++lf[dat[i]];
        }
      }
    }
    for (i = Math.max(i, wi); i < s; ++i) {
      syms[li++] = dat[i];
      ++lf[dat[i]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i, st.w = wi;
    }
  } else {
    for (let i = st.w || 0; i < s + lst; i += 65535) {
      let e = i + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var adler = () => {
  let a = 1, b = 0;
  return {
    p(d) {
      let n = a, m = b;
      const l = d.length | 0;
      for (let i = 0; i != l; ) {
        const e = Math.min(i + 2655, l);
        for (; i < e; ++i) m += n += d[i];
        n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
      }
      a = n, b = m;
    },
    d() {
      a %= 65521, b %= 65521;
      return (a & 255) << 24 | (a & 65280) << 8 | (b & 255) << 8 | b >> 8;
    }
  };
};
var dopt = (dat, opt, pre, post, st) => {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      const dict = opt.dictionary.subarray(-32768);
      const newDat = new u82(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var mrg = (a, b) => {
  const o = {};
  for (const k in a) o[k] = a[k];
  for (const k in b) o[k] = b[k];
  return o;
};
var wcln = (fn, fnStr, td2) => {
  const dt = fn();
  const st = fn.toString();
  const ks = st.slice(st.indexOf("[") + 1, st.lastIndexOf("]")).replace(/\s+/g, "").split(",");
  for (let i = 0; i < dt.length; ++i) {
    let v = dt[i], k = ks[i];
    if (typeof v == "function") {
      fnStr += ";" + k + "=";
      const st2 = v.toString();
      if (v.prototype) {
        if (st2.indexOf("[native code]") != -1) {
          const spInd = st2.indexOf(" ", 8) + 1;
          fnStr += st2.slice(spInd, st2.indexOf("(", spInd));
        } else {
          fnStr += st2;
          for (const t in v.prototype) fnStr += ";" + k + ".prototype." + t + "=" + v.prototype[t].toString();
        }
      } else fnStr += st2;
    } else td2[k] = v;
  }
  return fnStr;
};
var ch = [];
var cbfs = (v) => {
  const tl = [];
  for (const k in v) {
    if (v[k].buffer) {
      tl.push((v[k] = new v[k].constructor(v[k])).buffer);
    }
  }
  return tl;
};
var wrkr = (fns, init, id, cb) => {
  if (!ch[id]) {
    let fnStr = "", td3 = {}, m = fns.length - 1;
    for (let i = 0; i < m; ++i)
      fnStr = wcln(fns[i], fnStr, td3);
    ch[id] = { c: wcln(fns[m], fnStr, td3), e: td3 };
  }
  const td2 = mrg({}, ch[id].e);
  return node_worker_default(ch[id].c + ";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=" + init.toString() + "}", id, td2, cbfs(td2), cb);
};
var bInflt = () => [u82, u16, i32, fleb, fdeb, clim, fl, fd, flrm, fdrm, rev, ec, hMap, max, bits, bits16, shft, slc, err, inflt, inflateSync, pbf, gopt];
var pbf = (msg) => postMessage(msg, [msg.buffer]);
var gopt = (o) => o && {
  out: o.size && new u82(o.size),
  dictionary: o.dictionary
};
var astrm = (strm) => {
  strm.ondata = (dat, final) => postMessage([dat, final], [dat.buffer]);
  return (ev) => {
    if (ev.data[0]) {
      strm.push(ev.data[0], ev.data[1]);
      postMessage([ev.data[0].length]);
    } else strm.flush(ev.data[1]);
  };
};
var astrmify = (fns, strm, opts, init, id, flush, ext) => {
  let t;
  const w = wrkr(
    fns,
    init,
    id,
    (err2, dat) => {
      if (err2) w.terminate(), strm.ondata.call(strm, err2);
      else if (!Array.isArray(dat)) ext(dat);
      else if (dat.length == 1) {
        strm.queuedSize -= dat[0];
        if (strm.ondrain) strm.ondrain(dat[0]);
      } else {
        if (dat[1]) w.terminate();
        strm.ondata.call(strm, err2, dat[0], dat[1]);
      }
    }
  );
  w.postMessage(opts);
  strm.queuedSize = 0;
  strm.push = (d, f) => {
    if (!strm.ondata) err(5);
    if (t) strm.ondata(err(4, 0, 1), null, !!f);
    strm.queuedSize += d.length;
    w.postMessage([d, t = f], d.buffer instanceof ArrayBuffer ? [d.buffer] : []);
  };
  strm.terminate = () => {
    w.terminate();
  };
  if (flush) {
    strm.flush = (sync) => {
      w.postMessage([0, sync]);
    };
  }
};
var wbytes = (d, b, v) => {
  for (; v; ++b) d[b] = v, v >>>= 8;
};
var zlh = (c, o) => {
  const lv = o.level, fl2 = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
  c[0] = 120, c[1] = fl2 << 6 | (o.dictionary && 32);
  c[1] |= 31 - (c[0] << 8 | c[1]) % 31;
  if (o.dictionary) {
    const h = adler();
    h.p(o.dictionary);
    wbytes(c, 2, h.d());
  }
};
var zls = (d, dict) => {
  if ((d[0] & 15) != 8 || d[0] >> 4 > 7 || (d[0] << 8 | d[1]) % 31) err(6, "invalid zlib data");
  if ((d[1] >> 5 & 1) == +!dict) err(6, "invalid zlib data: " + (d[1] & 32 ? "need" : "unexpected") + " dictionary");
  return (d[1] >> 3 & 4) + 2;
};
function StrmOpt(opts, cb) {
  if (typeof opts == "function") cb = opts, opts = {};
  this.ondata = cb;
  return opts;
}
var Deflate = class {
  constructor(opts, cb) {
    if (typeof opts == "function") cb = opts, opts = {};
    this.ondata = cb;
    this.o = opts || {};
    this.s = { l: 0, i: 32768, w: 32768, z: 32768 };
    this.b = new u82(98304);
    if (this.o.dictionary) {
      const dict = this.o.dictionary.subarray(-32768);
      this.b.set(dict, 32768 - dict.length);
      this.s.i = 32768 - dict.length;
    }
  }
  p(c, f) {
    this.ondata(dopt(c, this.o, 0, 0, this.s), f);
  }
  /**
   * Pushes a chunk to be deflated
   * @param chunk The chunk to push
   * @param final Whether this is the last chunk
   */
  push(chunk, final) {
    if (!this.ondata) err(5);
    if (this.s.l) err(4);
    const endLen = chunk.length + this.s.z;
    if (endLen > this.b.length) {
      if (endLen > 2 * this.b.length - 32768) {
        const newBuf = new u82(endLen & -32768);
        newBuf.set(this.b.subarray(0, this.s.z));
        this.b = newBuf;
      }
      const split2 = this.b.length - this.s.z;
      this.b.set(chunk.subarray(0, split2), this.s.z);
      this.s.z = this.b.length;
      this.p(this.b, false);
      this.b.set(this.b.subarray(-32768));
      this.b.set(chunk.subarray(split2), 32768);
      this.s.z = chunk.length - split2 + 32768;
      this.s.i = 32766, this.s.w = 32768;
    } else {
      this.b.set(chunk, this.s.z);
      this.s.z += chunk.length;
    }
    this.s.l = final & 1;
    if (this.s.z > this.s.w + 8191 || final) {
      this.p(this.b, final || false);
      this.s.w = this.s.i, this.s.i -= 2;
    }
    if (final) {
      this.s = this.o = {};
      this.b = et;
    }
  }
  /**
   * Flushes buffered uncompressed data. Useful to immediately retrieve the
   * deflated output for small inputs.
   * @param sync Whether to flush to a byte boundary. A sync flush takes 4-5
   *             extra bytes, but guarantees all pushed data is immediately
   *             decompressible. A separate DEFLATE stream may be concatenated
   *             with the current output after a sync flush.
   */
  flush(sync) {
    if (!this.ondata) err(5);
    if (this.s.l) err(4);
    this.p(this.b, false);
    this.s.w = this.s.i, this.s.i -= 2;
    if (sync) {
      const c = new u82(6);
      c[0] = this.s.r >> 3;
      const ep = wfblk(c, this.s.r, et);
      this.s.r = 0;
      this.ondata(c.subarray(0, ep >> 3), false);
    }
  }
};
var Inflate = class {
  constructor(opts, cb) {
    if (typeof opts == "function") cb = opts, opts = {};
    this.ondata = cb;
    const dict = opts && opts.dictionary && opts.dictionary.subarray(-32768);
    this.s = { i: 0, b: dict ? dict.length : 0 };
    this.o = new u82(32768);
    this.p = new u82(0);
    if (dict) this.o.set(dict);
  }
  e(c) {
    if (!this.ondata) err(5);
    if (this.d) err(4);
    if (!this.p.length) this.p = c;
    else if (c.length) {
      const n = new u82(this.p.length + c.length);
      n.set(this.p), n.set(c, this.p.length), this.p = n;
    }
  }
  c(final) {
    this.s.i = +(this.d = final || false);
    const bts = this.s.b;
    const dt = inflt(this.p, this.s, this.o);
    this.ondata(slc(dt, bts, this.s.b), this.d);
    this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
    this.p = slc(this.p, this.s.p / 8 | 0), this.s.p &= 7;
  }
  /**
   * Pushes a chunk to be inflated
   * @param chunk The chunk to push
   * @param final Whether this is the final chunk
   */
  push(chunk, final) {
    this.e(chunk), this.c(final);
  }
};
var AsyncInflate = class {
  constructor(opts, cb) {
    astrmify([
      bInflt,
      () => [astrm, Inflate]
    ], this, StrmOpt.call(this, opts, cb), (ev) => {
      const strm = new Inflate(ev.data);
      onmessage = astrm(strm);
    }, 7, 0);
  }
};
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var Zlib = class {
  constructor(opts, cb) {
    this.c = adler();
    this.v = 1;
    Deflate.call(this, opts, cb);
  }
  /**
   * Pushes a chunk to be zlibbed
   * @param chunk The chunk to push
   * @param final Whether this is the last chunk
   */
  push(chunk, final) {
    this.c.p(chunk);
    Deflate.prototype.push.call(this, chunk, final);
  }
  p(c, f) {
    const raw = dopt(c, this.o, this.v && (this.o.dictionary ? 6 : 2), f && 4, this.s);
    if (this.v) zlh(raw, this.o), this.v = 0;
    if (f) wbytes(raw, raw.length - 4, this.c.d());
    this.ondata(raw, f);
  }
  /**
   * Flushes buffered uncompressed data. Useful to immediately retrieve the
   * zlibbed output for small inputs.
   * @param sync Whether to flush to a byte boundary. A sync flush takes 4-5
   *             extra bytes, but guarantees all pushed data is immediately
   *             decompressible.
   */
  flush(sync) {
    Deflate.prototype.flush.call(this, sync);
  }
};
var Unzlib = class {
  constructor(opts, cb) {
    Inflate.call(this, opts, cb);
    this.v = opts && opts.dictionary ? 2 : 1;
  }
  /**
   * Pushes a chunk to be unzlibbed
   * @param chunk The chunk to push
   * @param final Whether this is the last chunk
   */
  push(chunk, final) {
    Inflate.prototype.e.call(this, chunk);
    if (this.v) {
      if (this.p.length < 6 && !final) return;
      this.p = this.p.subarray(zls(this.p, this.v - 1)), this.v = 0;
    }
    if (final) {
      if (this.p.length < 4) err(6, "invalid zlib data");
      this.p = this.p.subarray(0, -4);
    }
    Inflate.prototype.c.call(this, final);
  }
};
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var UnzipPassThrough = class {
  static {
    this.compression = 0;
  }
  push(chunk, final) {
    this.ondata(null, chunk, final);
  }
};
var UnzipInflate = class {
  static {
    this.compression = 8;
  }
  /**
   * Creates a DEFLATE decompression that can be used in ZIP archives
   */
  constructor() {
    this.i = new Inflate((dat, final) => {
      this.ondata(null, dat, final);
    });
  }
  push(chunk, final) {
    try {
      this.i.push(chunk, final);
    } catch (e) {
      this.ondata(e, null, final);
    }
  }
};
var AsyncUnzipInflate = class {
  static {
    this.compression = 8;
  }
  /**
   * Creates a DEFLATE decompression that can be used in ZIP archives
   */
  constructor(_, sz) {
    if (sz < 32e4) {
      this.i = new Inflate((dat, final) => {
        this.ondata(null, dat, final);
      });
    } else {
      this.i = new AsyncInflate((err2, dat, final) => {
        this.ondata(err2, dat, final);
      });
      this.terminate = this.i.terminate;
    }
  }
  push(chunk, final) {
    if (this.i.terminate) chunk = slc(chunk, 0);
    this.i.push(chunk, final);
  }
};

// vendor/src/openpgpjs/src/packet/literal_data.js
var LiteralDataPacket = class {
  static get tag() {
    return enums_default.packet.literalData;
  }
  /**
   * @param {Date} date - The creation date of the literal package
   */
  constructor(date = /* @__PURE__ */ new Date()) {
    this.format = enums_default.literal.utf8;
    this.date = util_default.normalizeDate(date);
    this.text = null;
    this.data = null;
    this.filename = "";
  }
  /**
   * Set the packet data to a javascript native string, end of line
   * will be normalized to \r\n and by default text is converted to UTF8
   * @param {String | ReadableStream<String>} text - Any native javascript string
   * @param {enums.literal} [format] - The format of the string of bytes
   */
  setText(text, format = enums_default.literal.utf8) {
    this.format = format;
    this.text = text;
    this.data = null;
  }
  /**
   * Returns literal data packets as native JavaScript string
   * with normalized end of line to \n
   * @param {Boolean} [clone] - Whether to return a clone so that getBytes/getText can be called again
   * @returns {String | ReadableStream<String>} Literal data as text.
   */
  getText(clone2 = false) {
    if (this.text === null || util_default.isStream(this.text)) {
      this.text = util_default.decodeUTF8(util_default.nativeEOL(this.getBytes(clone2)));
    }
    return this.text;
  }
  /**
   * Set the packet data to value represented by the provided string of bytes.
   * @param {Uint8Array | ReadableStream<Uint8Array>} bytes - The string of bytes
   * @param {enums.literal} format - The format of the string of bytes
   */
  setBytes(bytes, format) {
    this.format = format;
    this.data = bytes;
    this.text = null;
  }
  /**
   * Get the byte sequence representing the literal packet data
   * @param {Boolean} [clone] - Whether to return a clone so that getBytes/getText can be called again
   * @returns {Uint8Array | ReadableStream<Uint8Array>} A sequence of bytes.
   */
  getBytes(clone2 = false) {
    if (this.data === null) {
      this.data = util_default.canonicalizeEOL(util_default.encodeUTF8(this.text));
    }
    if (clone2) {
      return passiveClone(this.data);
    }
    return this.data;
  }
  /**
   * Sets the filename of the literal packet data
   * @param {String} filename - Any native javascript string
   */
  setFilename(filename) {
    this.filename = filename;
  }
  /**
   * Get the filename of the literal packet data
   * @returns {String} Filename.
   */
  getFilename() {
    return this.filename;
  }
  /**
   * Parsing function for a literal data packet (tag 11).
   *
   * @param {Uint8Array | ReadableStream<Uint8Array>} input - Payload of a tag 11 packet
   * @returns {Promise<LiteralDataPacket>} Object representation.
   * @async
   */
  async read(bytes) {
    await parse(bytes, async (reader) => {
      const format = await reader.readByte();
      const filename_len = await reader.readByte();
      this.filename = util_default.decodeUTF8(await reader.readBytes(filename_len));
      this.date = util_default.readDate(await reader.readBytes(4));
      let data = reader.remainder();
      if (isArrayStream(data)) data = await readToEnd(data);
      this.setBytes(data, format);
    });
  }
  /**
   * Creates a Uint8Array representation of the packet, excluding the data
   *
   * @returns {Uint8Array} Uint8Array representation of the packet.
   */
  writeHeader() {
    const filename = util_default.encodeUTF8(this.filename);
    const filename_length = new Uint8Array([filename.length]);
    const format = new Uint8Array([this.format]);
    const date = util_default.writeDate(this.date);
    return util_default.concatUint8Array([format, filename_length, filename, date]);
  }
  /**
   * Creates a Uint8Array representation of the packet
   *
   * @returns {Uint8Array | ReadableStream<Uint8Array>} Uint8Array representation of the packet.
   */
  write() {
    const header = this.writeHeader();
    const data = this.getBytes();
    return util_default.concat([header, data]);
  }
};
var literal_data_default = LiteralDataPacket;

// vendor/src/openpgpjs/src/type/keyid.js
var KeyID = class _KeyID {
  constructor() {
    this.bytes = "";
  }
  /**
   * Parsing method for a key id
   * @param {Uint8Array} bytes - Input to read the key id from
   */
  read(bytes) {
    this.bytes = util_default.uint8ArrayToString(bytes.subarray(0, 8));
    return this.bytes.length;
  }
  /**
   * Serializes the Key ID
   * @returns {Uint8Array} Key ID as a Uint8Array.
   */
  write() {
    return util_default.stringToUint8Array(this.bytes);
  }
  /**
   * Returns the Key ID represented as a hexadecimal string
   * @returns {String} Key ID as a hexadecimal string.
   */
  toHex() {
    return util_default.uint8ArrayToHex(util_default.stringToUint8Array(this.bytes));
  }
  /**
   * Checks equality of Key ID's
   * @param {KeyID} keyID
   * @param {Boolean} matchWildcard - Indicates whether to check if either keyID is a wildcard
   */
  equals(keyID, matchWildcard = false) {
    return matchWildcard && (keyID.isWildcard() || this.isWildcard()) || this.bytes === keyID.bytes;
  }
  /**
   * Checks to see if the Key ID is unset
   * @returns {Boolean} True if the Key ID is null.
   */
  isNull() {
    return this.bytes === "";
  }
  /**
   * Checks to see if the Key ID is a "wildcard" Key ID (all zeros)
   * @returns {Boolean} True if this is a wildcard Key ID.
   */
  isWildcard() {
    return /^0+$/.test(this.toHex());
  }
  static mapToHex(keyID) {
    return keyID.toHex();
  }
  static fromID(hex) {
    const keyID = new _KeyID();
    keyID.read(util_default.hexToUint8Array(hex));
    return keyID;
  }
  static wildcard() {
    const keyID = new _KeyID();
    keyID.read(new Uint8Array(8));
    return keyID;
  }
};
var keyid_default = KeyID;

// vendor/src/openpgpjs/src/packet/signature.js
var verified = /* @__PURE__ */ Symbol("verified");
var SALT_NOTATION_NAME = "salt@notations.openpgpjs.org";
var allowedUnhashedSubpackets = /* @__PURE__ */ new Set([
  enums_default.signatureSubpacket.issuerKeyID,
  enums_default.signatureSubpacket.issuerFingerprint,
  enums_default.signatureSubpacket.embeddedSignature
]);
var SignaturePacket = class _SignaturePacket {
  static get tag() {
    return enums_default.packet.signature;
  }
  constructor() {
    this.version = null;
    this.signatureType = null;
    this.hashAlgorithm = null;
    this.publicKeyAlgorithm = null;
    this.signatureData = null;
    this.unhashedSubpackets = [];
    this.unknownSubpackets = [];
    this.signedHashValue = null;
    this.salt = null;
    this.created = null;
    this.signatureExpirationTime = null;
    this.signatureNeverExpires = true;
    this.exportable = null;
    this.trustLevel = null;
    this.trustAmount = null;
    this.regularExpression = null;
    this.revocable = null;
    this.keyExpirationTime = null;
    this.keyNeverExpires = null;
    this.preferredSymmetricAlgorithms = null;
    this.revocationKeyClass = null;
    this.revocationKeyAlgorithm = null;
    this.revocationKeyFingerprint = null;
    this.issuerKeyID = new keyid_default();
    this.rawNotations = [];
    this.notations = {};
    this.preferredHashAlgorithms = null;
    this.preferredCompressionAlgorithms = null;
    this.keyServerPreferences = null;
    this.preferredKeyServer = null;
    this.isPrimaryUserID = null;
    this.policyURI = null;
    this.keyFlags = null;
    this.signersUserID = null;
    this.reasonForRevocationFlag = null;
    this.reasonForRevocationString = null;
    this.features = null;
    this.signatureTargetPublicKeyAlgorithm = null;
    this.signatureTargetHashAlgorithm = null;
    this.signatureTargetHash = null;
    this.embeddedSignature = null;
    this.issuerKeyVersion = null;
    this.issuerFingerprint = null;
    this.preferredAEADAlgorithms = null;
    this.preferredCipherSuites = null;
    this.revoked = null;
    this[verified] = null;
  }
  /**
   * parsing function for a signature packet (tag 2).
   * @param {String} bytes - Payload of a tag 2 packet
   * @returns {SignaturePacket} Object representation.
   */
  read(bytes, config2 = config_default) {
    let i = 0;
    this.version = bytes[i++];
    if (this.version === 5 && !config2.enableParsingV5Entities) {
      throw new UnsupportedError("Support for v5 entities is disabled; turn on `config.enableParsingV5Entities` if needed");
    }
    if (this.version !== 4 && this.version !== 5 && this.version !== 6) {
      throw new UnsupportedError(`Version ${this.version} of the signature packet is unsupported.`);
    }
    this.signatureType = bytes[i++];
    this.publicKeyAlgorithm = bytes[i++];
    this.hashAlgorithm = bytes[i++];
    i += this.readSubPackets(bytes.subarray(i, bytes.length), true);
    if (!this.created) {
      throw new Error("Missing signature creation time subpacket.");
    }
    this.signatureData = bytes.subarray(0, i);
    i += this.readSubPackets(bytes.subarray(i, bytes.length), false);
    this.signedHashValue = bytes.subarray(i, i + 2);
    i += 2;
    if (this.version === 6) {
      const saltLength = bytes[i++];
      this.salt = bytes.subarray(i, i + saltLength);
      i += saltLength;
    }
    const signatureMaterial = bytes.subarray(i, bytes.length);
    const { read, signatureParams } = signature_exports.parseSignatureParams(this.publicKeyAlgorithm, signatureMaterial);
    if (read < signatureMaterial.length) {
      throw new Error("Error reading MPIs");
    }
    this.params = signatureParams;
  }
  /**
   * @returns {Uint8Array | ReadableStream<Uint8Array>}
   */
  writeParams() {
    if (this.params instanceof Promise) {
      return fromAsync(
        async () => serializeParams(this.publicKeyAlgorithm, await this.params)
      );
    }
    return serializeParams(this.publicKeyAlgorithm, this.params);
  }
  write() {
    const arr = [];
    arr.push(this.signatureData);
    arr.push(this.writeUnhashedSubPackets());
    arr.push(this.signedHashValue);
    if (this.version === 6) {
      arr.push(new Uint8Array([this.salt.length]));
      arr.push(this.salt);
    }
    arr.push(this.writeParams());
    return util_default.concat(arr);
  }
  /**
   * Signs provided data. This needs to be done prior to serialization.
   * @param {SecretKeyPacket} key - Private key used to sign the message.
   * @param {Object} data - Contains packets to be signed.
   * @param {Date} [date] - The signature creation time.
   * @param {Boolean} [detached] - Whether to create a detached signature
   * @throws {Error} if signing failed
   * @async
   */
  async sign(key, data, date = /* @__PURE__ */ new Date(), detached = false, config2) {
    this.version = key.version;
    this.created = util_default.normalizeDate(date);
    this.issuerKeyVersion = key.version;
    this.issuerFingerprint = key.getFingerprintBytes();
    this.issuerKeyID = key.getKeyID();
    const arr = [new Uint8Array([this.version, this.signatureType, this.publicKeyAlgorithm, this.hashAlgorithm])];
    if (this.version === 6) {
      const saltLength = saltLengthForHash(this.hashAlgorithm);
      if (this.salt === null) {
        this.salt = getRandomBytes(saltLength);
      } else if (saltLength !== this.salt.length) {
        throw new Error("Provided salt does not have the required length");
      }
    } else if (config2.nonDeterministicSignaturesViaNotation) {
      const saltNotations = this.rawNotations.filter(({ name }) => name === SALT_NOTATION_NAME);
      if (saltNotations.length === 0) {
        const saltValue = getRandomBytes(saltLengthForHash(this.hashAlgorithm));
        this.rawNotations.push({
          name: SALT_NOTATION_NAME,
          value: saltValue,
          humanReadable: false,
          critical: false
        });
      } else {
        throw new Error("Unexpected existing salt notation");
      }
    }
    arr.push(this.writeHashedSubPackets());
    this.unhashedSubpackets = [];
    this.signatureData = util_default.concat(arr);
    const toHash = this.toHash(this.signatureType, data, detached);
    const hash = await this.hash(this.signatureType, data, toHash, detached);
    this.signedHashValue = slice(clone(hash), 0, 2);
    const signed = async () => signature_exports.sign(
      this.publicKeyAlgorithm,
      this.hashAlgorithm,
      key.publicParams,
      key.privateParams,
      toHash,
      await readToEnd(hash)
    );
    if (util_default.isStream(hash)) {
      this.params = signed();
    } else {
      this.params = await signed();
      this[verified] = true;
    }
  }
  /**
   * Creates Uint8Array of bytes of all subpacket data except Issuer and Embedded Signature subpackets
   * @returns {Uint8Array} Subpacket data.
   */
  writeHashedSubPackets() {
    const sub = enums_default.signatureSubpacket;
    const arr = [];
    let bytes;
    if (this.created === null) {
      throw new Error("Missing signature creation time");
    }
    arr.push(writeSubPacket(sub.signatureCreationTime, true, util_default.writeDate(this.created)));
    if (this.signatureExpirationTime !== null) {
      arr.push(writeSubPacket(sub.signatureExpirationTime, true, util_default.writeNumber(this.signatureExpirationTime, 4)));
    }
    if (this.exportable !== null) {
      arr.push(writeSubPacket(sub.exportableCertification, true, new Uint8Array([this.exportable ? 1 : 0])));
    }
    if (this.trustLevel !== null) {
      bytes = new Uint8Array([this.trustLevel, this.trustAmount]);
      arr.push(writeSubPacket(sub.trustSignature, true, bytes));
    }
    if (this.regularExpression !== null) {
      arr.push(writeSubPacket(sub.regularExpression, true, this.regularExpression));
    }
    if (this.revocable !== null) {
      arr.push(writeSubPacket(sub.revocable, true, new Uint8Array([this.revocable ? 1 : 0])));
    }
    if (this.keyExpirationTime !== null) {
      arr.push(writeSubPacket(sub.keyExpirationTime, true, util_default.writeNumber(this.keyExpirationTime, 4)));
    }
    if (this.preferredSymmetricAlgorithms !== null) {
      bytes = util_default.stringToUint8Array(util_default.uint8ArrayToString(this.preferredSymmetricAlgorithms));
      arr.push(writeSubPacket(sub.preferredSymmetricAlgorithms, false, bytes));
    }
    if (this.revocationKeyClass !== null) {
      bytes = new Uint8Array([this.revocationKeyClass, this.revocationKeyAlgorithm]);
      bytes = util_default.concat([bytes, this.revocationKeyFingerprint]);
      arr.push(writeSubPacket(sub.revocationKey, false, bytes));
    }
    if (!this.issuerKeyID.isNull() && this.issuerKeyVersion < 5) {
      arr.push(writeSubPacket(sub.issuerKeyID, false, this.issuerKeyID.write()));
    }
    this.rawNotations.forEach(({ name, value, humanReadable, critical }) => {
      bytes = [new Uint8Array([humanReadable ? 128 : 0, 0, 0, 0])];
      const encodedName = util_default.encodeUTF8(name);
      bytes.push(util_default.writeNumber(encodedName.length, 2));
      bytes.push(util_default.writeNumber(value.length, 2));
      bytes.push(encodedName);
      bytes.push(value);
      bytes = util_default.concat(bytes);
      arr.push(writeSubPacket(sub.notationData, critical, bytes));
    });
    if (this.preferredHashAlgorithms !== null) {
      bytes = util_default.stringToUint8Array(util_default.uint8ArrayToString(this.preferredHashAlgorithms));
      arr.push(writeSubPacket(sub.preferredHashAlgorithms, false, bytes));
    }
    if (this.preferredCompressionAlgorithms !== null) {
      bytes = util_default.stringToUint8Array(util_default.uint8ArrayToString(this.preferredCompressionAlgorithms));
      arr.push(writeSubPacket(sub.preferredCompressionAlgorithms, false, bytes));
    }
    if (this.keyServerPreferences !== null) {
      bytes = util_default.stringToUint8Array(util_default.uint8ArrayToString(this.keyServerPreferences));
      arr.push(writeSubPacket(sub.keyServerPreferences, false, bytes));
    }
    if (this.preferredKeyServer !== null) {
      arr.push(writeSubPacket(sub.preferredKeyServer, false, util_default.encodeUTF8(this.preferredKeyServer)));
    }
    if (this.isPrimaryUserID !== null) {
      arr.push(writeSubPacket(sub.primaryUserID, false, new Uint8Array([this.isPrimaryUserID ? 1 : 0])));
    }
    if (this.policyURI !== null) {
      arr.push(writeSubPacket(sub.policyURI, false, util_default.encodeUTF8(this.policyURI)));
    }
    if (this.keyFlags !== null) {
      bytes = util_default.stringToUint8Array(util_default.uint8ArrayToString(this.keyFlags));
      arr.push(writeSubPacket(sub.keyFlags, true, bytes));
    }
    if (this.signersUserID !== null) {
      arr.push(writeSubPacket(sub.signersUserID, false, util_default.encodeUTF8(this.signersUserID)));
    }
    if (this.reasonForRevocationFlag !== null) {
      bytes = util_default.stringToUint8Array(String.fromCharCode(this.reasonForRevocationFlag) + this.reasonForRevocationString);
      arr.push(writeSubPacket(sub.reasonForRevocation, true, bytes));
    }
    if (this.features !== null) {
      bytes = util_default.stringToUint8Array(util_default.uint8ArrayToString(this.features));
      arr.push(writeSubPacket(sub.features, false, bytes));
    }
    if (this.signatureTargetPublicKeyAlgorithm !== null) {
      bytes = [new Uint8Array([this.signatureTargetPublicKeyAlgorithm, this.signatureTargetHashAlgorithm])];
      bytes.push(util_default.stringToUint8Array(this.signatureTargetHash));
      bytes = util_default.concat(bytes);
      arr.push(writeSubPacket(sub.signatureTarget, true, bytes));
    }
    if (this.embeddedSignature !== null) {
      arr.push(writeSubPacket(sub.embeddedSignature, true, this.embeddedSignature.write()));
    }
    if (this.issuerFingerprint !== null) {
      bytes = [new Uint8Array([this.issuerKeyVersion]), this.issuerFingerprint];
      bytes = util_default.concat(bytes);
      arr.push(writeSubPacket(sub.issuerFingerprint, this.version >= 5, bytes));
    }
    if (this.preferredAEADAlgorithms !== null) {
      bytes = util_default.stringToUint8Array(util_default.uint8ArrayToString(this.preferredAEADAlgorithms));
      arr.push(writeSubPacket(sub.preferredAEADAlgorithms, false, bytes));
    }
    if (this.preferredCipherSuites !== null) {
      bytes = new Uint8Array([].concat(...this.preferredCipherSuites));
      arr.push(writeSubPacket(sub.preferredCipherSuites, false, bytes));
    }
    const result = util_default.concat(arr);
    const length = util_default.writeNumber(result.length, this.version === 6 ? 4 : 2);
    return util_default.concat([length, result]);
  }
  /**
   * Creates an Uint8Array containing the unhashed subpackets
   * @returns {Uint8Array} Subpacket data.
   */
  writeUnhashedSubPackets() {
    const arr = this.unhashedSubpackets.map(({ type, critical, body }) => {
      return writeSubPacket(type, critical, body);
    });
    const result = util_default.concat(arr);
    const length = util_default.writeNumber(result.length, this.version === 6 ? 4 : 2);
    return util_default.concat([length, result]);
  }
  // Signature subpackets
  readSubPacket(bytes, hashed = true) {
    let mypos = 0;
    const critical = !!(bytes[mypos] & 128);
    const type = bytes[mypos] & 127;
    mypos++;
    if (!hashed) {
      this.unhashedSubpackets.push({
        type,
        critical,
        body: bytes.subarray(mypos, bytes.length)
      });
      if (!allowedUnhashedSubpackets.has(type)) {
        return;
      }
    }
    switch (type) {
      case enums_default.signatureSubpacket.signatureCreationTime:
        this.created = util_default.readDate(bytes.subarray(mypos, bytes.length));
        break;
      case enums_default.signatureSubpacket.signatureExpirationTime: {
        const seconds = util_default.readNumber(bytes.subarray(mypos, bytes.length));
        this.signatureNeverExpires = seconds === 0;
        this.signatureExpirationTime = seconds;
        break;
      }
      case enums_default.signatureSubpacket.exportableCertification:
        this.exportable = bytes[mypos++] === 1;
        break;
      case enums_default.signatureSubpacket.trustSignature:
        this.trustLevel = bytes[mypos++];
        this.trustAmount = bytes[mypos++];
        break;
      case enums_default.signatureSubpacket.regularExpression:
        this.regularExpression = bytes[mypos];
        break;
      case enums_default.signatureSubpacket.revocable:
        this.revocable = bytes[mypos++] === 1;
        break;
      case enums_default.signatureSubpacket.keyExpirationTime: {
        const seconds = util_default.readNumber(bytes.subarray(mypos, bytes.length));
        this.keyExpirationTime = seconds;
        this.keyNeverExpires = seconds === 0;
        break;
      }
      case enums_default.signatureSubpacket.preferredSymmetricAlgorithms:
        this.preferredSymmetricAlgorithms = [...bytes.subarray(mypos, bytes.length)];
        break;
      case enums_default.signatureSubpacket.revocationKey:
        this.revocationKeyClass = bytes[mypos++];
        this.revocationKeyAlgorithm = bytes[mypos++];
        this.revocationKeyFingerprint = bytes.subarray(mypos, mypos + 20);
        break;
      case enums_default.signatureSubpacket.issuerKeyID:
        if (this.version === 4) {
          this.issuerKeyID.read(bytes.subarray(mypos, bytes.length));
        } else if (hashed) {
          throw new Error("Unexpected Issuer Key ID subpacket");
        }
        break;
      case enums_default.signatureSubpacket.notationData: {
        const humanReadable = !!(bytes[mypos] & 128);
        mypos += 4;
        const m = util_default.readNumber(bytes.subarray(mypos, mypos + 2));
        mypos += 2;
        const n = util_default.readNumber(bytes.subarray(mypos, mypos + 2));
        mypos += 2;
        const name = util_default.decodeUTF8(bytes.subarray(mypos, mypos + m));
        const value = bytes.subarray(mypos + m, mypos + m + n);
        this.rawNotations.push({ name, humanReadable, value, critical });
        if (humanReadable) {
          this.notations[name] = util_default.decodeUTF8(value);
        }
        break;
      }
      case enums_default.signatureSubpacket.preferredHashAlgorithms:
        this.preferredHashAlgorithms = [...bytes.subarray(mypos, bytes.length)];
        break;
      case enums_default.signatureSubpacket.preferredCompressionAlgorithms:
        this.preferredCompressionAlgorithms = [...bytes.subarray(mypos, bytes.length)];
        break;
      case enums_default.signatureSubpacket.keyServerPreferences:
        this.keyServerPreferences = [...bytes.subarray(mypos, bytes.length)];
        break;
      case enums_default.signatureSubpacket.preferredKeyServer:
        this.preferredKeyServer = util_default.decodeUTF8(bytes.subarray(mypos, bytes.length));
        break;
      case enums_default.signatureSubpacket.primaryUserID:
        this.isPrimaryUserID = bytes[mypos++] !== 0;
        break;
      case enums_default.signatureSubpacket.policyURI:
        this.policyURI = util_default.decodeUTF8(bytes.subarray(mypos, bytes.length));
        break;
      case enums_default.signatureSubpacket.keyFlags:
        this.keyFlags = [...bytes.subarray(mypos, bytes.length)];
        break;
      case enums_default.signatureSubpacket.signersUserID:
        this.signersUserID = util_default.decodeUTF8(bytes.subarray(mypos, bytes.length));
        break;
      case enums_default.signatureSubpacket.reasonForRevocation:
        this.reasonForRevocationFlag = bytes[mypos++];
        this.reasonForRevocationString = util_default.decodeUTF8(bytes.subarray(mypos, bytes.length));
        break;
      case enums_default.signatureSubpacket.features:
        this.features = [...bytes.subarray(mypos, bytes.length)];
        break;
      case enums_default.signatureSubpacket.signatureTarget: {
        this.signatureTargetPublicKeyAlgorithm = bytes[mypos++];
        this.signatureTargetHashAlgorithm = bytes[mypos++];
        const len = getHashByteLength(this.signatureTargetHashAlgorithm);
        this.signatureTargetHash = util_default.uint8ArrayToString(bytes.subarray(mypos, mypos + len));
        break;
      }
      case enums_default.signatureSubpacket.embeddedSignature:
        this.embeddedSignature = new _SignaturePacket();
        this.embeddedSignature.read(bytes.subarray(mypos, bytes.length));
        break;
      case enums_default.signatureSubpacket.issuerFingerprint:
        this.issuerKeyVersion = bytes[mypos++];
        this.issuerFingerprint = bytes.subarray(mypos, bytes.length);
        if (this.issuerKeyVersion >= 5) {
          this.issuerKeyID.read(this.issuerFingerprint);
        } else {
          this.issuerKeyID.read(this.issuerFingerprint.subarray(-8));
        }
        break;
      case enums_default.signatureSubpacket.preferredAEADAlgorithms:
        this.preferredAEADAlgorithms = [...bytes.subarray(mypos, bytes.length)];
        break;
      case enums_default.signatureSubpacket.preferredCipherSuites:
        this.preferredCipherSuites = [];
        for (let i = mypos; i < bytes.length; i += 2) {
          this.preferredCipherSuites.push([bytes[i], bytes[i + 1]]);
        }
        break;
      default:
        this.unknownSubpackets.push({
          type,
          critical,
          body: bytes.subarray(mypos, bytes.length)
        });
        break;
    }
  }
  readSubPackets(bytes, trusted = true, config2) {
    const subpacketLengthBytes = this.version === 6 ? 4 : 2;
    const subpacketLength = util_default.readNumber(bytes.subarray(0, subpacketLengthBytes));
    let i = subpacketLengthBytes;
    while (i < subpacketLengthBytes + subpacketLength) {
      const len = readSimpleLength(bytes.subarray(i, bytes.length));
      i += len.offset;
      this.readSubPacket(bytes.subarray(i, i + len.len), trusted, config2);
      i += len.len;
    }
    return i;
  }
  // Produces data to produce signature on
  toSign(type, data) {
    const t = enums_default.signature;
    switch (type) {
      case t.binary:
        if (data.text !== null) {
          return util_default.encodeUTF8(data.getText(true));
        }
        return data.getBytes(true);
      case t.text: {
        const bytes = data.getBytes(true);
        return util_default.canonicalizeEOL(bytes);
      }
      case t.standalone:
        return new Uint8Array(0);
      case t.certGeneric:
      case t.certPersona:
      case t.certCasual:
      case t.certPositive:
      case t.certRevocation: {
        let packet;
        let tag;
        if (data.userID) {
          tag = 180;
          packet = data.userID;
        } else if (data.userAttribute) {
          tag = 209;
          packet = data.userAttribute;
        } else {
          throw new Error("Either a userID or userAttribute packet needs to be supplied for certification.");
        }
        const bytes = packet.write();
        return util_default.concat([
          this.toSign(t.key, data),
          new Uint8Array([tag]),
          util_default.writeNumber(bytes.length, 4),
          bytes
        ]);
      }
      case t.subkeyBinding:
      case t.subkeyRevocation:
      case t.keyBinding:
        return util_default.concat([this.toSign(t.key, data), this.toSign(t.key, {
          key: data.bind
        })]);
      case t.key:
        if (data.key === void 0) {
          throw new Error("Key packet is required for this signature.");
        }
        return data.key.writeForHash(this.version);
      case t.keyRevocation:
        return this.toSign(t.key, data);
      case t.timestamp:
        return new Uint8Array(0);
      case t.thirdParty:
        throw new Error("Not implemented");
      default:
        throw new Error("Unknown signature type.");
    }
  }
  calculateTrailer(data, detached) {
    let length = 0;
    return transform(clone(this.signatureData), (value) => {
      length += value.length;
    }, () => {
      const arr = [];
      if (this.version === 5 && (this.signatureType === enums_default.signature.binary || this.signatureType === enums_default.signature.text)) {
        if (detached) {
          arr.push(new Uint8Array(6));
        } else {
          arr.push(data.writeHeader());
        }
      }
      arr.push(new Uint8Array([this.version, 255]));
      if (this.version === 5) {
        arr.push(new Uint8Array(4));
      }
      arr.push(util_default.writeNumber(length, 4));
      return util_default.concat(arr);
    });
  }
  toHash(signatureType, data, detached = false) {
    const bytes = this.toSign(signatureType, data);
    return util_default.concat([this.salt || new Uint8Array(), bytes, this.signatureData, this.calculateTrailer(data, detached)]);
  }
  async hash(signatureType, data, toHash, detached = false) {
    if (this.version === 6 && this.salt.length !== saltLengthForHash(this.hashAlgorithm)) {
      throw new Error("Signature salt does not have the expected length");
    }
    if (!toHash) toHash = this.toHash(signatureType, data, detached);
    return computeDigest(this.hashAlgorithm, toHash);
  }
  /**
   * verifies the signature packet. Note: not all signature types are implemented
   * @param {PublicSubkeyPacket|PublicKeyPacket|
   *         SecretSubkeyPacket|SecretKeyPacket} key - the public key to verify the signature
   * @param {module:enums.signature} signatureType - Expected signature type
   * @param {Uint8Array|Object} data - Data which on the signature applies
   * @param {Date} [date] - Use the given date instead of the current time to check for signature validity and expiration
   * @param {Boolean} [detached] - Whether to verify a detached signature
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @throws {Error} if signature validation failed
   * @async
   */
  async verify(key, signatureType, data, date = /* @__PURE__ */ new Date(), detached = false, config2 = config_default) {
    if (!this.issuerKeyID.equals(key.getKeyID())) {
      throw new Error("Signature was not issued by the given public key");
    }
    if (this.publicKeyAlgorithm !== key.algorithm) {
      throw new Error("Public key algorithm used to sign signature does not match issuer key algorithm.");
    }
    const isMessageSignature = signatureType === enums_default.signature.binary || signatureType === enums_default.signature.text;
    const skipVerify = this[verified] && !isMessageSignature;
    if (!skipVerify) {
      let toHash;
      let hash;
      if (this.hashed) {
        hash = await this.hashed;
      } else {
        toHash = this.toHash(signatureType, data, detached);
        hash = await this.hash(signatureType, data, toHash);
      }
      hash = await readToEnd(hash);
      if (this.signedHashValue[0] !== hash[0] || this.signedHashValue[1] !== hash[1]) {
        throw new Error("Signed digest did not match");
      }
      this.params = await this.params;
      this[verified] = await signature_exports.verify(
        this.publicKeyAlgorithm,
        this.hashAlgorithm,
        this.params,
        key.publicParams,
        toHash,
        hash
      );
      if (!this[verified]) {
        throw new Error("Signature verification failed");
      }
    }
    const normDate = util_default.normalizeDate(date);
    if (normDate && this.created > normDate) {
      throw new Error("Signature creation time is in the future");
    }
    if (normDate && normDate >= this.getExpirationTime()) {
      throw new Error("Signature is expired");
    }
    if (config2.rejectHashAlgorithms.has(this.hashAlgorithm)) {
      throw new Error("Insecure hash algorithm: " + enums_default.read(enums_default.hash, this.hashAlgorithm).toUpperCase());
    }
    if (config2.rejectMessageHashAlgorithms.has(this.hashAlgorithm) && [enums_default.signature.binary, enums_default.signature.text].includes(this.signatureType)) {
      throw new Error("Insecure message hash algorithm: " + enums_default.read(enums_default.hash, this.hashAlgorithm).toUpperCase());
    }
    this.unknownSubpackets.forEach(({ type, critical }) => {
      if (critical) {
        throw new Error(`Unknown critical signature subpacket type ${type}`);
      }
    });
    this.rawNotations.forEach(({ name, critical }) => {
      if (critical && config2.knownNotations.indexOf(name) < 0) {
        throw new Error(`Unknown critical notation: ${name}`);
      }
    });
    if (this.revocationKeyClass !== null) {
      throw new Error("This key is intended to be revoked with an authorized key, which OpenPGP.js does not support.");
    }
  }
  /**
   * Verifies signature expiration date
   * @param {Date} [date] - Use the given date for verification instead of the current time
   * @returns {Boolean} True if expired.
   */
  isExpired(date = /* @__PURE__ */ new Date()) {
    const normDate = util_default.normalizeDate(date);
    if (normDate !== null) {
      return !(this.created <= normDate && normDate < this.getExpirationTime());
    }
    return false;
  }
  /**
   * Returns the expiration time of the signature or Infinity if signature does not expire
   * @returns {Date | Infinity} Expiration time.
   */
  getExpirationTime() {
    return this.signatureNeverExpires ? Infinity : new Date(this.created.getTime() + this.signatureExpirationTime * 1e3);
  }
};
var signature_default = SignaturePacket;
function writeSubPacket(type, critical, data) {
  const arr = [];
  arr.push(writeSimpleLength(data.length + 1));
  arr.push(new Uint8Array([(critical ? 128 : 0) | type]));
  arr.push(data);
  return util_default.concat(arr);
}
function saltLengthForHash(hashAlgorithm) {
  switch (hashAlgorithm) {
    case enums_default.hash.sha256:
      return 16;
    case enums_default.hash.sha384:
      return 24;
    case enums_default.hash.sha512:
      return 32;
    case enums_default.hash.sha224:
      return 16;
    case enums_default.hash.sha3_256:
      return 16;
    case enums_default.hash.sha3_512:
      return 32;
    default:
      throw new Error("Unsupported hash function");
  }
}

// vendor/src/openpgpjs/src/packet/one_pass_signature.js
var OnePassSignaturePacket = class _OnePassSignaturePacket {
  static get tag() {
    return enums_default.packet.onePassSignature;
  }
  static fromSignaturePacket(signaturePacket, isLast) {
    const onePassSig = new _OnePassSignaturePacket();
    onePassSig.version = signaturePacket.version === 6 ? 6 : 3;
    onePassSig.signatureType = signaturePacket.signatureType;
    onePassSig.hashAlgorithm = signaturePacket.hashAlgorithm;
    onePassSig.publicKeyAlgorithm = signaturePacket.publicKeyAlgorithm;
    onePassSig.issuerKeyID = signaturePacket.issuerKeyID;
    onePassSig.salt = signaturePacket.salt;
    onePassSig.issuerFingerprint = signaturePacket.issuerFingerprint;
    onePassSig.flags = isLast ? 1 : 0;
    return onePassSig;
  }
  constructor() {
    this.version = null;
    this.signatureType = null;
    this.hashAlgorithm = null;
    this.publicKeyAlgorithm = null;
    this.salt = null;
    this.issuerKeyID = null;
    this.issuerFingerprint = null;
    this.flags = null;
  }
  /**
   * parsing function for a one-pass signature packet (tag 4).
   * @param {Uint8Array} bytes - Payload of a tag 4 packet
   * @returns {OnePassSignaturePacket} Object representation.
   */
  read(bytes) {
    let mypos = 0;
    this.version = bytes[mypos++];
    if (this.version !== 3 && this.version !== 6) {
      throw new UnsupportedError(`Version ${this.version} of the one-pass signature packet is unsupported.`);
    }
    this.signatureType = bytes[mypos++];
    this.hashAlgorithm = bytes[mypos++];
    this.publicKeyAlgorithm = bytes[mypos++];
    if (this.version === 6) {
      const saltLength = bytes[mypos++];
      this.salt = bytes.subarray(mypos, mypos + saltLength);
      mypos += saltLength;
      this.issuerFingerprint = bytes.subarray(mypos, mypos + 32);
      mypos += 32;
      this.issuerKeyID = new keyid_default();
      this.issuerKeyID.read(this.issuerFingerprint);
    } else {
      this.issuerKeyID = new keyid_default();
      this.issuerKeyID.read(bytes.subarray(mypos, mypos + 8));
      mypos += 8;
    }
    this.flags = bytes[mypos++];
    return this;
  }
  /**
   * creates a string representation of a one-pass signature packet
   * @returns {Uint8Array} A Uint8Array representation of a one-pass signature packet.
   */
  write() {
    const arr = [new Uint8Array([
      this.version,
      this.signatureType,
      this.hashAlgorithm,
      this.publicKeyAlgorithm
    ])];
    if (this.version === 6) {
      arr.push(
        new Uint8Array([this.salt.length]),
        this.salt,
        this.issuerFingerprint
      );
    } else {
      arr.push(this.issuerKeyID.write());
    }
    arr.push(new Uint8Array([this.flags]));
    return util_default.concatUint8Array(arr);
  }
  calculateTrailer(...args) {
    return fromAsync(async () => signature_default.prototype.calculateTrailer.apply(await this.correspondingSig, args));
  }
  async verify() {
    const correspondingSig = await this.correspondingSig;
    if (!correspondingSig || correspondingSig.constructor.tag !== enums_default.packet.signature) {
      throw new Error("Corresponding signature packet missing");
    }
    if (correspondingSig.signatureType !== this.signatureType || correspondingSig.hashAlgorithm !== this.hashAlgorithm || correspondingSig.publicKeyAlgorithm !== this.publicKeyAlgorithm || !correspondingSig.issuerKeyID.equals(this.issuerKeyID) || this.version === 3 && correspondingSig.version === 6 || this.version === 6 && correspondingSig.version !== 6 || this.version === 6 && !util_default.equalsUint8Array(correspondingSig.issuerFingerprint, this.issuerFingerprint) || this.version === 6 && !util_default.equalsUint8Array(correspondingSig.salt, this.salt)) {
      throw new Error("Corresponding signature packet does not match one-pass signature packet");
    }
    correspondingSig.hashed = this.hashed;
    return correspondingSig.verify.apply(correspondingSig, arguments);
  }
};
OnePassSignaturePacket.prototype.hash = signature_default.prototype.hash;
OnePassSignaturePacket.prototype.toHash = signature_default.prototype.toHash;
OnePassSignaturePacket.prototype.toSign = signature_default.prototype.toSign;
var one_pass_signature_default = OnePassSignaturePacket;

// vendor/src/openpgpjs/src/packet/packetlist.js
function newPacketFromTag(tag, allowedPackets7) {
  if (!allowedPackets7[tag]) {
    let packetType;
    try {
      packetType = enums_default.read(enums_default.packet, tag);
    } catch {
      throw new UnknownPacketError(`Unknown packet type with tag: ${tag}`);
    }
    throw new Error(`Packet not allowed in this context: ${packetType}`);
  }
  return new allowedPackets7[tag]();
}
var PacketList = class _PacketList extends Array {
  /**
   * Parses the given binary data and returns a list of packets.
   * Equivalent to calling `read` on an empty PacketList instance.
   * @param {Uint8Array | ReadableStream<Uint8Array>} bytes - binary data to parse
   * @param {Object} allowedPackets - mapping where keys are allowed packet tags, pointing to their Packet class
   * @param {Object} [config] - full configuration, defaults to openpgp.config
   * @param {function(enums.packet[], boolean, Object): void} [grammarValidator]
   * @param {Boolean} [delayErrors] - delay errors until the input stream has been read completely
   * @returns {Promise<PacketList>} parsed list of packets
   * @throws on parsing errors
   * @async
   */
  static async fromBinary(bytes, allowedPackets7, config2 = config_default, grammarValidator = null, delayErrors = false) {
    const packets = new _PacketList();
    await packets.read(bytes, allowedPackets7, config2, grammarValidator, delayErrors);
    return packets;
  }
  /**
   * Reads a stream of binary data and interprets it as a list of packets.
   * @param {Uint8Array | ReadableStream<Uint8Array>} bytes - binary data to parse
   * @param {Object} allowedPackets - mapping where keys are allowed packet tags, pointing to their Packet class
   * @param {Object} [config] - full configuration, defaults to openpgp.config
   * @param {function(enums.packet[], boolean, Object): void} [grammarValidator]
   * @param {Boolean} [delayErrors] - delay errors until the input stream has been read completely
   * @throws on parsing errors
   * @async
   */
  async read(bytes, allowedPackets7, config2 = config_default, grammarValidator = null, delayErrors = false) {
    let additionalAllowedPackets;
    if (config2.additionalAllowedPackets.length) {
      additionalAllowedPackets = util_default.constructAllowedPackets(config2.additionalAllowedPackets);
      allowedPackets7 = { ...allowedPackets7, ...additionalAllowedPackets };
    }
    this.stream = transformPair(bytes, async (readable, writable) => {
      const reader2 = getReader(readable);
      const writer = getWriter(writable);
      try {
        let useStreamType = util_default.isStream(readable);
        while (true) {
          await writer.ready;
          let unauthenticatedError;
          let wasStream;
          await readPacket(reader2, useStreamType, async (parsed) => {
            try {
              if (parsed.tag === enums_default.packet.marker || parsed.tag === enums_default.packet.trust || parsed.tag === enums_default.packet.padding) {
                return;
              }
              const packet = newPacketFromTag(parsed.tag, allowedPackets7);
              try {
                grammarValidator?.recordPacket(parsed.tag, additionalAllowedPackets);
              } catch (e) {
                if (config2.enforceGrammar) {
                  throw e;
                } else {
                  util_default.printDebugError(e);
                }
              }
              packet.packets = new _PacketList();
              packet.fromStream = util_default.isStream(parsed.packet);
              wasStream = packet.fromStream;
              try {
                await packet.read(parsed.packet, config2);
              } catch (e) {
                if (!(e instanceof UnsupportedError)) {
                  throw util_default.wrapError(new MalformedPacketError(`Parsing ${packet.constructor.name} failed`), e);
                }
                throw e;
              }
              await writer.write(packet);
            } catch (e) {
              const throwUnknownPacketError = e instanceof UnknownPacketError && parsed.tag <= 39;
              const throwUnsupportedError = e instanceof UnsupportedError && !(e instanceof UnknownPacketError) && !config2.ignoreUnsupportedPackets;
              const throwMalformedPacketError = e instanceof MalformedPacketError && !config2.ignoreMalformedPackets;
              const throwDataPacketError = supportsStreaming(parsed.tag);
              const throwOtherError = !(e instanceof UnknownPacketError || e instanceof UnsupportedError || e instanceof MalformedPacketError);
              if (throwUnknownPacketError || throwUnsupportedError || throwMalformedPacketError || throwDataPacketError || throwOtherError) {
                if (delayErrors) {
                  unauthenticatedError = e;
                } else {
                  await writer.abort(e);
                }
              } else {
                const unparsedPacket = new UnparseablePacket(parsed.tag, parsed.packet);
                await writer.write(unparsedPacket);
              }
              util_default.printDebugError(e);
            }
          });
          if (wasStream) {
            useStreamType = null;
          }
          if (unauthenticatedError) {
            await reader2.readToEnd();
            throw unauthenticatedError;
          }
          const nextPacket = await reader2.peekBytes(2);
          const done = !nextPacket || !nextPacket.length;
          if (done) {
            try {
              grammarValidator?.recordEnd();
            } catch (e) {
              if (config2.enforceGrammar) {
                throw e;
              } else {
                util_default.printDebugError(e);
              }
            }
            await writer.ready;
            await writer.close();
            return;
          }
        }
      } catch (e) {
        await writer.abort(e);
      }
    });
    const reader = getReader(this.stream);
    while (true) {
      const { done, value } = await reader.read();
      if (!done) {
        this.push(value);
      } else {
        this.stream = null;
      }
      if (done || supportsStreaming(value.constructor.tag)) {
        break;
      }
    }
    reader.releaseLock();
  }
  /**
   * Creates a binary representation of openpgp objects contained within the
   * class instance.
   * @returns {Uint8Array} A Uint8Array containing valid openpgp packets.
   */
  write() {
    const arr = [];
    for (let i = 0; i < this.length; i++) {
      const tag = this[i] instanceof UnparseablePacket ? this[i].tag : this[i].constructor.tag;
      const packetbytes = this[i].write();
      if (util_default.isStream(packetbytes) && supportsStreaming(this[i].constructor.tag)) {
        let buffer = [];
        let bufferLength = 0;
        const minLength = 512;
        arr.push(writeTag(tag));
        arr.push(transform(packetbytes, (value) => {
          buffer.push(value);
          bufferLength += value.length;
          if (bufferLength >= minLength) {
            const powerOf2 = Math.min(Math.log(bufferLength) / Math.LN2 | 0, 30);
            const chunkSize = 2 ** powerOf2;
            const bufferConcat = util_default.concat([writePartialLength(powerOf2)].concat(buffer));
            buffer = [bufferConcat.subarray(1 + chunkSize)];
            bufferLength = buffer[0].length;
            return bufferConcat.subarray(0, 1 + chunkSize);
          }
        }, () => util_default.concat([writeSimpleLength(bufferLength)].concat(buffer))));
      } else {
        if (util_default.isStream(packetbytes)) {
          let length = 0;
          arr.push(transform(clone(packetbytes), (value) => {
            length += value.length;
          }, () => writeHeader(tag, length)));
        } else {
          arr.push(writeHeader(tag, packetbytes.length));
        }
        arr.push(packetbytes);
      }
    }
    return util_default.concat(arr);
  }
  /**
   * Creates a new PacketList with all packets matching the given tag(s)
   * @param {...module:enums.packet} tags - packet tags to look for
   * @returns {PacketList}
   */
  filterByTag(...tags) {
    const filtered = new _PacketList();
    const handle = (tag) => (packetType) => tag === packetType;
    for (let i = 0; i < this.length; i++) {
      if (tags.some(handle(this[i].constructor.tag))) {
        filtered.push(this[i]);
      }
    }
    return filtered;
  }
  /**
   * Traverses packet list and returns first packet with matching tag
   * @param {module:enums.packet} tag - The packet tag
   * @returns {Packet|undefined}
   */
  findPacket(tag) {
    return this.find((packet) => packet.constructor.tag === tag);
  }
  /**
   * Find indices of packets with the given tag(s)
   * @param {...module:enums.packet} tags - packet tags to look for
   * @returns {Integer[]} packet indices
   */
  indexOfTag(...tags) {
    const tagIndex = [];
    const that = this;
    const handle = (tag) => (packetType) => tag === packetType;
    for (let i = 0; i < this.length; i++) {
      if (tags.some(handle(that[i].constructor.tag))) {
        tagIndex.push(i);
      }
    }
    return tagIndex;
  }
};
var packetlist_default = PacketList;

// vendor/src/openpgpjs/src/packet/grammar.ts
var GrammarError = class _GrammarError extends Error {
  constructor(...params) {
    super(...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _GrammarError);
    }
    this.name = "GrammarError";
  }
};
var MessageGrammarValidator = class {
  constructor() {
    // PDA validator inspired by https://blog.jabberhead.tk/2022/10/26/implementing-packet-sequence-validation-using-pushdown-automata/ .
    this.state = 0 /* EmptyMessage */;
    this.leadingOnePassSignatureCounter = 0;
  }
  /**
   * Determine validity of the next packet in the sequence.
   * NB: padding, marker and unknown packets are expected to already be filtered out on parsing,
   * and are not accepted by `recordPacket`.
   * @param packet - packet to validate
   * @param additionalAllowedPackets - object containing packets which are allowed anywhere in the sequence, except they cannot precede a OPS packet
   * @throws {GrammarError} on invalid `packet` input
   */
  recordPacket(packet, additionalAllowedPackets) {
    switch (this.state) {
      case 0 /* EmptyMessage */:
      case 3 /* StandaloneAdditionalAllowedData */:
        switch (packet) {
          case enums_default.packet.literalData:
          case enums_default.packet.compressedData:
          case enums_default.packet.aeadEncryptedData:
          case enums_default.packet.symEncryptedIntegrityProtectedData:
          case enums_default.packet.symmetricallyEncryptedData:
            this.state = 1 /* PlaintextOrEncryptedData */;
            return;
          case enums_default.packet.signature:
            if (this.state === 3 /* StandaloneAdditionalAllowedData */) {
              if (--this.leadingOnePassSignatureCounter < 0) {
                throw new GrammarError("Trailing signature packet without OPS");
              }
            }
            return;
          case enums_default.packet.onePassSignature:
            if (this.state === 3 /* StandaloneAdditionalAllowedData */) {
              throw new GrammarError("OPS following StandaloneAdditionalAllowedData");
            }
            this.leadingOnePassSignatureCounter++;
            return;
          case enums_default.packet.publicKeyEncryptedSessionKey:
          case enums_default.packet.symEncryptedSessionKey:
            this.state = 2 /* EncryptedSessionKeys */;
            return;
          default:
            if (!additionalAllowedPackets?.[packet]) {
              throw new GrammarError(`Unexpected packet ${packet} in state ${this.state}`);
            }
            this.state = 3 /* StandaloneAdditionalAllowedData */;
            return;
        }
      case 1 /* PlaintextOrEncryptedData */:
        switch (packet) {
          case enums_default.packet.signature:
            if (--this.leadingOnePassSignatureCounter < 0) {
              throw new GrammarError("Trailing signature packet without OPS");
            }
            this.state = 1 /* PlaintextOrEncryptedData */;
            return;
          default:
            if (!additionalAllowedPackets?.[packet]) {
              throw new GrammarError(`Unexpected packet ${packet} in state ${this.state}`);
            }
            this.state = 1 /* PlaintextOrEncryptedData */;
            return;
        }
      case 2 /* EncryptedSessionKeys */:
        switch (packet) {
          case enums_default.packet.publicKeyEncryptedSessionKey:
          case enums_default.packet.symEncryptedSessionKey:
            this.state = 2 /* EncryptedSessionKeys */;
            return;
          case enums_default.packet.symEncryptedIntegrityProtectedData:
          case enums_default.packet.aeadEncryptedData:
          case enums_default.packet.symmetricallyEncryptedData:
            this.state = 1 /* PlaintextOrEncryptedData */;
            return;
          case enums_default.packet.signature:
            if (--this.leadingOnePassSignatureCounter < 0) {
              throw new GrammarError("Trailing signature packet without OPS");
            }
            this.state = 1 /* PlaintextOrEncryptedData */;
            return;
          default:
            if (!additionalAllowedPackets?.[packet]) {
              throw new GrammarError(`Unexpected packet ${packet} in state ${this.state}`);
            }
            this.state = 2 /* EncryptedSessionKeys */;
        }
    }
  }
  /**
   * Signal end of the packet sequence for final validity check
   * @throws {GrammarError} on invalid sequence
   */
  recordEnd() {
    switch (this.state) {
      case 0 /* EmptyMessage */:
      // needs to be allowed for PacketLists that only include unknown packets
      case 1 /* PlaintextOrEncryptedData */:
      case 2 /* EncryptedSessionKeys */:
      case 3 /* StandaloneAdditionalAllowedData */:
        if (this.leadingOnePassSignatureCounter > 0) {
          throw new GrammarError("Missing trailing signature packets");
        }
    }
  }
};

// vendor/src/openpgpjs/src/packet/compressed_data.js
var allowedPackets = /* @__PURE__ */ util_default.constructAllowedPackets([
  literal_data_default,
  one_pass_signature_default,
  signature_default
]);
var CompressedDataPacket = class {
  static get tag() {
    return enums_default.packet.compressedData;
  }
  /**
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   */
  constructor(config2 = config_default) {
    this.packets = null;
    this.algorithm = config2.preferredCompressionAlgorithm;
    this.compressed = null;
  }
  /**
   * Parsing function for the packet.
   * @param {Uint8Array | ReadableStream<Uint8Array>} bytes - Payload of a tag 8 packet
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   */
  async read(bytes, config2 = config_default) {
    await parse(bytes, async (reader) => {
      this.algorithm = await reader.readByte();
      this.compressed = reader.remainder();
      await this.decompress(config2);
    });
  }
  /**
   * Return the compressed packet.
   * @returns {Uint8Array | ReadableStream<Uint8Array>} Binary compressed packet.
   */
  write() {
    if (this.compressed === null) {
      this.compress();
    }
    return util_default.concat([new Uint8Array([this.algorithm]), this.compressed]);
  }
  /**
   * Decompression method for decompressing the compressed data
   * read by read_packet
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   */
  async decompress(config2 = config_default) {
    const compressionName = enums_default.read(enums_default.compression, this.algorithm);
    const decompressionFn = decompress_fns[compressionName];
    if (!decompressionFn) {
      throw new Error(`${compressionName} decompression not supported`);
    }
    let decompressed = await decompressionFn(this.compressed, config2);
    if (config2.maxDecompressedMessageSize !== Infinity) {
      let decompressedSize = 0;
      decompressed = transform(decompressed, (chunk) => {
        decompressedSize += chunk.length;
        if (decompressedSize > config2.maxDecompressedMessageSize) {
          throw new Error("Maximum decompressed message size exceeded");
        }
        return chunk;
      });
    }
    if (!isStream(this.compressed) || isArrayStream(this.compressed)) {
      decompressed = await readToEnd(decompressed);
    }
    this.packets = await packetlist_default.fromBinary(decompressed, allowedPackets, config2, new MessageGrammarValidator());
  }
  /**
   * Compress the packet data (member decompressedData)
   */
  compress() {
    const compressionName = enums_default.read(enums_default.compression, this.algorithm);
    const compressionFn = compress_fns[compressionName];
    if (!compressionFn) {
      throw new Error(`${compressionName} compression not supported`);
    }
    const data = this.packets.write();
    let compressed = compressionFn(data);
    if (!isStream(data) || isArrayStream(data)) {
      compressed = fromAsync(() => readToEnd(compressed));
    }
    this.compressed = compressed;
  }
};
var compressed_data_default = CompressedDataPacket;
function splitStream(data) {
  const chunkSize = 65536;
  const reader = getReader(data);
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        for (let i = 0; i <= value.length; i += chunkSize) {
          if (!i || i < value.length) {
            controller.enqueue(value.subarray(i, i + chunkSize));
          }
        }
      } catch (e) {
        controller.error(e);
      }
    }
  }, { highWaterMark: 0 });
}
function zlib(compressionStreamInstantiator, ZlibStreamedConstructor) {
  return (data, _config) => {
    let stream;
    if (isArrayStream(data)) {
      stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(await readToEnd(data));
            controller.close();
          } catch (e) {
            controller.error(e);
          }
        }
      });
    } else if (isStream(data)) {
      stream = data;
    } else {
      stream = toStream(data);
    }
    stream = splitStream(stream);
    if (compressionStreamInstantiator) {
      try {
        const compressorOrDecompressor = compressionStreamInstantiator();
        return stream.pipeThrough(compressorOrDecompressor);
      } catch (err2) {
        if (err2.name !== "TypeError") {
          throw err2;
        }
      }
    }
    const inputReader = getReader(stream);
    const zlibStream = new ZlibStreamedConstructor();
    let providedData = false;
    let allDone = false;
    return new ReadableStream({
      start(controller) {
        zlibStream.ondata = (value, isLast) => {
          controller.enqueue(value);
          providedData = true;
          if (isLast) {
            controller.close();
            allDone = true;
          }
        };
      },
      async pull() {
        providedData = false;
        while (!providedData && !allDone) {
          const { done, value } = await inputReader.read();
          if (done) {
            zlibStream.push(new Uint8Array(), true);
            return;
          } else if (value.length) {
            zlibStream.push(value);
          }
        }
      }
    }, { highWaterMark: 0 });
  };
}
function bzip2Decompress() {
  return async function(data, config2) {
    const { default: unbzip2Stream2 } = await Promise.resolve().then(() => (init_unbzip2(), unbzip2_exports));
    return unbzip2Stream2(toStream(data), config2.maxDecompressedMessageSize);
  };
}
var getCompressionStreamInstantiators = (compressionFormat) => ({
  compressor: typeof CompressionStream !== "undefined" && (() => new CompressionStream(compressionFormat)),
  decompressor: typeof DecompressionStream !== "undefined" && (() => new DecompressionStream(compressionFormat))
});
var compress_fns = {
  zip: /* @__PURE__ */ zlib(getCompressionStreamInstantiators("deflate-raw").compressor, Deflate),
  zlib: /* @__PURE__ */ zlib(getCompressionStreamInstantiators("deflate").compressor, Zlib)
};
var decompress_fns = {
  uncompressed: (data, _config) => data,
  zip: /* @__PURE__ */ zlib(getCompressionStreamInstantiators("deflate-raw").decompressor, Inflate),
  zlib: /* @__PURE__ */ zlib(getCompressionStreamInstantiators("deflate").decompressor, Unzlib),
  bzip2: /* @__PURE__ */ bzip2Decompress()
  // NB: async due to dynamic lib import
};

// vendor/src/openpgpjs/src/packet/sym_encrypted_integrity_protected_data.js
function setUint64(dataView, byteOffset, value) {
  if (typeof dataView.setBigUint64 === "function") {
    return dataView.setBigUint64(byteOffset, BigInt(value));
  }
  if (value <= 4294967295) {
    dataView.setUint32(byteOffset, 0);
    dataView.setUint32(byteOffset + 4, value);
  } else {
    const bigValue = BigInt(value);
    dataView.setUint32(byteOffset, Number(bigValue >> BigInt(32)));
    dataView.setUint32(byteOffset + 4, Number(bigValue & BigInt(4294967295)));
  }
}
var allowedPackets2 = /* @__PURE__ */ util_default.constructAllowedPackets([
  literal_data_default,
  compressed_data_default,
  one_pass_signature_default,
  signature_default
]);
var SymEncryptedIntegrityProtectedDataPacket = class _SymEncryptedIntegrityProtectedDataPacket {
  static get tag() {
    return enums_default.packet.symEncryptedIntegrityProtectedData;
  }
  static fromObject({ version, aeadAlgorithm }) {
    if (version !== 1 && version !== 2) {
      throw new Error("Unsupported SEIPD version");
    }
    const seip = new _SymEncryptedIntegrityProtectedDataPacket();
    seip.version = version;
    if (version === 2) {
      seip.aeadAlgorithm = aeadAlgorithm;
    }
    return seip;
  }
  constructor() {
    this.version = null;
    this.cipherAlgorithm = null;
    this.aeadAlgorithm = null;
    this.chunkSizeByte = null;
    this.salt = null;
    this.encrypted = null;
    this.packets = null;
  }
  async read(bytes) {
    await parse(bytes, async (reader) => {
      this.version = await reader.readByte();
      if (this.version !== 1 && this.version !== 2) {
        throw new UnsupportedError(`Version ${this.version} of the SEIP packet is unsupported.`);
      }
      if (this.version === 2) {
        this.cipherAlgorithm = await reader.readByte();
        this.aeadAlgorithm = await reader.readByte();
        this.chunkSizeByte = await reader.readByte();
        this.salt = await reader.readBytes(32);
      }
      this.encrypted = reader.remainder();
    });
  }
  write() {
    if (this.version === 2) {
      return util_default.concat([new Uint8Array([this.version, this.cipherAlgorithm, this.aeadAlgorithm, this.chunkSizeByte]), this.salt, this.encrypted]);
    }
    return util_default.concat([new Uint8Array([this.version]), this.encrypted]);
  }
  /**
   * Encrypt the payload in the packet.
   * @param {enums.symmetric} sessionKeyAlgorithm - The symmetric encryption algorithm to use
   * @param {Uint8Array} key - The key of cipher blocksize length to be used
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Boolean>}
   * @throws {Error} on encryption failure
   * @async
   */
  async encrypt(sessionKeyAlgorithm, key, config2 = config_default) {
    const { blockSize, keySize } = getCipherParams(sessionKeyAlgorithm);
    if (key.length !== keySize) {
      throw new Error("Unexpected session key size");
    }
    let bytes = this.packets.write();
    if (isArrayStream(bytes)) bytes = await readToEnd(bytes);
    if (this.version === 2) {
      this.cipherAlgorithm = sessionKeyAlgorithm;
      this.salt = getRandomBytes(32);
      this.chunkSizeByte = config2.aeadChunkSizeByte;
      this.encrypted = await runAEAD(this, "encrypt", key, bytes);
    } else {
      const prefix = await cipherMode_exports.cfb.getPrefixRandom(sessionKeyAlgorithm);
      const mdc = new Uint8Array([211, 20]);
      const tohash = util_default.concat([prefix, bytes, mdc]);
      const hash = await computeDigest(enums_default.hash.sha1, passiveClone(tohash));
      const plaintext = util_default.concat([tohash, hash]);
      this.encrypted = await cipherMode_exports.cfb.encrypt(sessionKeyAlgorithm, key, plaintext, new Uint8Array(blockSize), config2);
    }
    return true;
  }
  /**
   * Decrypts the encrypted data contained in the packet.
   * @param {enums.symmetric} sessionKeyAlgorithm - The selected symmetric encryption algorithm to be used
   * @param {Uint8Array} key - The key of cipher blocksize length to be used
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Boolean>}
   * @throws {Error} on decryption failure
   * @async
   */
  async decrypt(sessionKeyAlgorithm, key, config2 = config_default) {
    if (key.length !== getCipherParams(sessionKeyAlgorithm).keySize) {
      throw new Error("Unexpected session key size");
    }
    let encrypted = clone(this.encrypted);
    if (isArrayStream(encrypted)) encrypted = await readToEnd(encrypted);
    let packetbytes;
    let delayErrors = false;
    if (this.version === 2) {
      if (this.cipherAlgorithm !== sessionKeyAlgorithm) {
        throw new Error("Unexpected session key algorithm");
      }
      packetbytes = await runAEAD(this, "decrypt", key, encrypted);
    } else {
      const { blockSize } = getCipherParams(sessionKeyAlgorithm);
      const decrypted = await cipherMode_exports.cfb.decrypt(sessionKeyAlgorithm, key, encrypted, new Uint8Array(blockSize));
      const realHash = slice(passiveClone(decrypted), -20);
      const tohash = slice(decrypted, 0, -20);
      const verifyHash = Promise.all([
        readToEnd(await computeDigest(enums_default.hash.sha1, passiveClone(tohash))),
        readToEnd(realHash)
      ]).then(([hash, mdc]) => {
        if (!util_default.equalsUint8Array(hash, mdc)) {
          throw new Error("Modification detected.");
        }
        return new Uint8Array();
      });
      const bytes = slice(tohash, blockSize + 2);
      packetbytes = slice(bytes, 0, -2);
      packetbytes = concat([packetbytes, fromAsync(() => verifyHash)]);
      if (util_default.isStream(encrypted) && config2.allowUnauthenticatedStream) {
        delayErrors = true;
      } else {
        packetbytes = await readToEnd(packetbytes);
      }
    }
    this.packets = await packetlist_default.fromBinary(packetbytes, allowedPackets2, config2, new MessageGrammarValidator(), delayErrors);
    return true;
  }
};
var sym_encrypted_integrity_protected_data_default = SymEncryptedIntegrityProtectedDataPacket;
async function runAEAD(packet, fn, key, data) {
  const isSEIPDv2 = packet instanceof SymEncryptedIntegrityProtectedDataPacket && packet.version === 2;
  const isAEADP = !isSEIPDv2 && packet.constructor.tag === enums_default.packet.aeadEncryptedData;
  if (!isSEIPDv2 && !isAEADP) throw new Error("Unexpected packet type");
  const mode = cipherMode_exports.getAEADMode(packet.aeadAlgorithm, isAEADP);
  const tagLengthIfDecrypting = fn === "decrypt" ? mode.tagLength : 0;
  const tagLengthIfEncrypting = fn === "encrypt" ? mode.tagLength : 0;
  const chunkSize = 2 ** (packet.chunkSizeByte + 6) + tagLengthIfDecrypting;
  const chunkIndexSizeIfAEADEP = isAEADP ? 8 : 0;
  const adataBuffer = new ArrayBuffer(13 + chunkIndexSizeIfAEADEP);
  const adataArray = new Uint8Array(adataBuffer, 0, 5 + chunkIndexSizeIfAEADEP);
  const adataTagArray = new Uint8Array(adataBuffer);
  const adataView = new DataView(adataBuffer);
  const chunkIndexArray = new Uint8Array(adataBuffer, 5, 8);
  adataArray.set([192 | packet.constructor.tag, packet.version, packet.cipherAlgorithm, packet.aeadAlgorithm, packet.chunkSizeByte], 0);
  let chunkIndex = 0;
  let latestPromise = Promise.resolve();
  let cryptedBytes = 0;
  let queuedBytes = 0;
  let iv;
  let ivView;
  if (isSEIPDv2) {
    const { keySize } = getCipherParams(packet.cipherAlgorithm);
    const { ivLength: ivLength4 } = mode;
    const info = new Uint8Array(adataBuffer, 0, 5);
    const derived = await computeHKDF(enums_default.hash.sha256, key, packet.salt, info, keySize + ivLength4);
    key = derived.subarray(0, keySize);
    iv = derived.subarray(keySize);
    iv.fill(0, iv.length - 8);
    ivView = new DataView(iv.buffer, iv.byteOffset, iv.byteLength);
  } else {
    iv = packet.iv;
  }
  const modeInstance = await mode(packet.cipherAlgorithm, key);
  return transformPair(data, async (readable, writable) => {
    if (util_default.isStream(readable) !== "array") {
      const buffer = new TransformStream({}, {
        highWaterMark: util_default.getHardwareConcurrency() * 2 ** (packet.chunkSizeByte + 6),
        size: (array) => array.length
      });
      pipe(buffer.readable, writable);
      writable = buffer.writable;
    }
    const reader = getReader(readable);
    const writer = getWriter(writable);
    try {
      while (true) {
        let chunk = await reader.readBytes(chunkSize + tagLengthIfDecrypting) || new Uint8Array();
        const finalChunk = chunk.subarray(chunk.length - tagLengthIfDecrypting);
        chunk = chunk.subarray(0, chunk.length - tagLengthIfDecrypting);
        let cryptedPromise;
        let done;
        let nonce;
        if (isSEIPDv2) {
          nonce = iv;
        } else {
          nonce = iv.slice();
          for (let i = 0; i < 8; i++) {
            nonce[iv.length - 8 + i] ^= chunkIndexArray[i];
          }
        }
        if (!chunkIndex || chunk.length) {
          reader.unshift(finalChunk);
          cryptedPromise = modeInstance[fn](chunk, nonce, adataArray);
          cryptedPromise.catch(() => {
          });
          queuedBytes += chunk.length - tagLengthIfDecrypting + tagLengthIfEncrypting;
        } else {
          setUint64(adataView, 5 + chunkIndexSizeIfAEADEP, cryptedBytes);
          cryptedPromise = modeInstance[fn](finalChunk, nonce, adataTagArray);
          cryptedPromise.catch(() => {
          });
          queuedBytes += tagLengthIfEncrypting;
          done = true;
        }
        cryptedBytes += chunk.length - tagLengthIfDecrypting;
        latestPromise = latestPromise.then(() => cryptedPromise).then(async (crypted) => {
          await writer.ready;
          await writer.write(crypted);
          queuedBytes -= crypted.length;
        }).catch((err2) => writer.abort(err2));
        if (done || queuedBytes > writer.desiredSize) {
          await latestPromise;
        }
        if (!done) {
          if (isSEIPDv2) {
            setUint64(ivView, iv.length - 8, ++chunkIndex);
          } else {
            setUint64(adataView, 5, ++chunkIndex);
          }
        } else {
          await writer.close();
          break;
        }
      }
    } catch (e) {
      await writer.ready.catch(() => {
      });
      await writer.abort(e);
    }
  });
}

// vendor/src/openpgpjs/src/packet/aead_encrypted_data.js
var allowedPackets3 = /* @__PURE__ */ util_default.constructAllowedPackets([
  literal_data_default,
  compressed_data_default,
  one_pass_signature_default,
  signature_default
]);
var VERSION2 = 1;
var AEADEncryptedDataPacket = class {
  static get tag() {
    return enums_default.packet.aeadEncryptedData;
  }
  constructor() {
    this.version = VERSION2;
    this.cipherAlgorithm = null;
    this.aeadAlgorithm = enums_default.aead.eax;
    this.chunkSizeByte = null;
    this.iv = null;
    this.encrypted = null;
    this.packets = null;
  }
  /**
   * Parse an encrypted payload of bytes in the order: version, IV, ciphertext (see specification)
   * @param {Uint8Array | ReadableStream<Uint8Array>} bytes
   * @throws {Error} on parsing failure
   */
  async read(bytes) {
    await parse(bytes, async (reader) => {
      const version = await reader.readByte();
      if (version !== VERSION2) {
        throw new UnsupportedError(`Version ${version} of the AEAD-encrypted data packet is not supported.`);
      }
      this.cipherAlgorithm = await reader.readByte();
      this.aeadAlgorithm = await reader.readByte();
      this.chunkSizeByte = await reader.readByte();
      const mode = cipherMode_exports.getAEADMode(this.aeadAlgorithm, true);
      this.iv = await reader.readBytes(mode.ivLength);
      this.encrypted = reader.remainder();
    });
  }
  /**
   * Write the encrypted payload of bytes in the order: version, IV, ciphertext (see specification)
   * @returns {Uint8Array | ReadableStream<Uint8Array>} The encrypted payload.
   */
  write() {
    return util_default.concat([new Uint8Array([this.version, this.cipherAlgorithm, this.aeadAlgorithm, this.chunkSizeByte]), this.iv, this.encrypted]);
  }
  /**
   * Decrypt the encrypted payload.
   * @param {enums.symmetric} sessionKeyAlgorithm - The session key's cipher algorithm
   * @param {Uint8Array} key - The session key used to encrypt the payload
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @throws {Error} if decryption was not successful
   * @async
   */
  async decrypt(sessionKeyAlgorithm, key, config2 = config_default) {
    this.packets = await packetlist_default.fromBinary(
      await runAEAD(this, "decrypt", key, clone(this.encrypted)),
      allowedPackets3,
      config2,
      new MessageGrammarValidator()
    );
  }
  /**
   * Encrypt the packet payload.
   * @param {enums.symmetric} sessionKeyAlgorithm - The session key's cipher algorithm
   * @param {Uint8Array} key - The session key used to encrypt the payload
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @throws {Error} if encryption was not successful
   * @async
   */
  async encrypt(sessionKeyAlgorithm, key, config2 = config_default) {
    this.cipherAlgorithm = sessionKeyAlgorithm;
    const { ivLength: ivLength4 } = cipherMode_exports.getAEADMode(this.aeadAlgorithm, true);
    this.iv = getRandomBytes(ivLength4);
    this.chunkSizeByte = config2.aeadChunkSizeByte;
    const data = this.packets.write();
    this.encrypted = await runAEAD(this, "encrypt", key, data);
  }
};
var aead_encrypted_data_default = AEADEncryptedDataPacket;

// vendor/src/openpgpjs/src/packet/public_key_encrypted_session_key.js
var PublicKeyEncryptedSessionKeyPacket = class _PublicKeyEncryptedSessionKeyPacket {
  static get tag() {
    return enums_default.packet.publicKeyEncryptedSessionKey;
  }
  constructor() {
    this.version = null;
    this.publicKeyID = new keyid_default();
    this.publicKeyVersion = null;
    this.publicKeyFingerprint = null;
    this.publicKeyAlgorithm = null;
    this.sessionKey = null;
    this.sessionKeyAlgorithm = null;
    this.encrypted = {};
  }
  static fromObject({
    version,
    encryptionKeyPacket,
    anonymousRecipient,
    sessionKey,
    sessionKeyAlgorithm
  }) {
    const pkesk = new _PublicKeyEncryptedSessionKeyPacket();
    if (version !== 3 && version !== 6) {
      throw new Error("Unsupported PKESK version");
    }
    pkesk.version = version;
    if (version === 6) {
      pkesk.publicKeyVersion = anonymousRecipient ? null : encryptionKeyPacket.version;
      pkesk.publicKeyFingerprint = anonymousRecipient ? null : encryptionKeyPacket.getFingerprintBytes();
    }
    pkesk.publicKeyID = anonymousRecipient ? keyid_default.wildcard() : encryptionKeyPacket.getKeyID();
    pkesk.publicKeyAlgorithm = encryptionKeyPacket.algorithm;
    pkesk.sessionKey = sessionKey;
    pkesk.sessionKeyAlgorithm = sessionKeyAlgorithm;
    return pkesk;
  }
  /**
   * Parsing function for a publickey encrypted session key packet (tag 1).
   *
   * @param {Uint8Array} bytes - Payload of a tag 1 packet
   */
  read(bytes) {
    let offset = 0;
    this.version = bytes[offset++];
    if (this.version !== 3 && this.version !== 6) {
      throw new UnsupportedError(`Version ${this.version} of the PKESK packet is unsupported.`);
    }
    if (this.version === 6) {
      const versionAndFingerprintLength = bytes[offset++];
      if (versionAndFingerprintLength) {
        this.publicKeyVersion = bytes[offset++];
        const fingerprintLength = versionAndFingerprintLength - 1;
        this.publicKeyFingerprint = bytes.subarray(offset, offset + fingerprintLength);
        offset += fingerprintLength;
        if (this.publicKeyVersion >= 5) {
          this.publicKeyID.read(this.publicKeyFingerprint);
        } else {
          this.publicKeyID.read(this.publicKeyFingerprint.subarray(-8));
        }
      } else {
        this.publicKeyID = keyid_default.wildcard();
      }
    } else {
      offset += this.publicKeyID.read(bytes.subarray(offset, offset + 8));
    }
    this.publicKeyAlgorithm = bytes[offset++];
    this.encrypted = parseEncSessionKeyParams(this.publicKeyAlgorithm, bytes.subarray(offset));
    if (this.publicKeyAlgorithm === enums_default.publicKey.x25519 || this.publicKeyAlgorithm === enums_default.publicKey.x448) {
      if (this.version === 3) {
        this.sessionKeyAlgorithm = enums_default.write(enums_default.symmetric, this.encrypted.C.algorithm);
      } else if (this.encrypted.C.algorithm !== null) {
        throw new Error("Unexpected cleartext symmetric algorithm");
      }
    }
  }
  /**
   * Create a binary representation of a tag 1 packet
   *
   * @returns {Uint8Array} The Uint8Array representation.
   */
  write() {
    const arr = [
      new Uint8Array([this.version])
    ];
    if (this.version === 6) {
      if (this.publicKeyFingerprint !== null) {
        arr.push(new Uint8Array(
          [
            this.publicKeyFingerprint.length + 1,
            this.publicKeyVersion
          ]
        ));
        arr.push(this.publicKeyFingerprint);
      } else {
        arr.push(new Uint8Array([0]));
      }
    } else {
      arr.push(this.publicKeyID.write());
    }
    arr.push(
      new Uint8Array([this.publicKeyAlgorithm]),
      serializeParams(this.publicKeyAlgorithm, this.encrypted)
    );
    return util_default.concatUint8Array(arr);
  }
  /**
   * Encrypt session key packet
   * @param {PublicKeyPacket} key - Public key
   * @throws {Error} if encryption failed
   * @async
   */
  async encrypt(key) {
    const algo = enums_default.write(enums_default.publicKey, this.publicKeyAlgorithm);
    const sessionKeyAlgorithm = this.version === 3 ? this.sessionKeyAlgorithm : null;
    const fingerprint = key.version === 5 ? key.getFingerprintBytes().subarray(0, 20) : key.getFingerprintBytes();
    const encoded = encodeSessionKey(this.version, algo, sessionKeyAlgorithm, this.sessionKey);
    this.encrypted = await publicKeyEncrypt(
      algo,
      sessionKeyAlgorithm,
      key.publicParams,
      encoded,
      fingerprint
    );
  }
  /**
   * Decrypts the session key (only for public key encrypted session key packets (tag 1)
   * @param {SecretKeyPacket} key - decrypted private key
   * @param {Object} [randomSessionKey] - Bogus session key to use in case of sensitive decryption error, or if the decrypted session key is of a different type/size.
   *                                      This is needed for constant-time processing. Expected object of the form: { sessionKey: Uint8Array, sessionKeyAlgorithm: enums.symmetric }
   * @throws {Error} if decryption failed, unless `randomSessionKey` is given
   * @async
   */
  async decrypt(key, randomSessionKey) {
    if (this.publicKeyAlgorithm !== key.algorithm) {
      throw new Error("Decryption error");
    }
    const randomPayload = randomSessionKey ? encodeSessionKey(this.version, this.publicKeyAlgorithm, randomSessionKey.sessionKeyAlgorithm, randomSessionKey.sessionKey) : null;
    const fingerprint = key.version === 5 ? key.getFingerprintBytes().subarray(0, 20) : key.getFingerprintBytes();
    const decryptedData = await publicKeyDecrypt(this.publicKeyAlgorithm, key.publicParams, key.privateParams, this.encrypted, fingerprint, randomPayload);
    const { sessionKey, sessionKeyAlgorithm } = decodeSessionKey(this.version, this.publicKeyAlgorithm, decryptedData, randomSessionKey);
    if (this.version === 3) {
      const hasEncryptedAlgo = this.publicKeyAlgorithm !== enums_default.publicKey.x25519 && this.publicKeyAlgorithm !== enums_default.publicKey.x448;
      this.sessionKeyAlgorithm = hasEncryptedAlgo ? sessionKeyAlgorithm : this.sessionKeyAlgorithm;
      if (sessionKey.length !== getCipherParams(this.sessionKeyAlgorithm).keySize) {
        throw new Error("Unexpected session key size");
      }
    }
    this.sessionKey = sessionKey;
  }
};
var public_key_encrypted_session_key_default = PublicKeyEncryptedSessionKeyPacket;
function encodeSessionKey(version, keyAlgo, cipherAlgo, sessionKeyData) {
  switch (keyAlgo) {
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.elgamal:
    case enums_default.publicKey.ecdh:
      return util_default.concatUint8Array([
        new Uint8Array(version === 6 ? [] : [cipherAlgo]),
        sessionKeyData,
        util_default.writeChecksum(sessionKeyData.subarray(sessionKeyData.length % 8))
      ]);
    case enums_default.publicKey.x25519:
    case enums_default.publicKey.x448:
      return sessionKeyData;
    default:
      throw new Error("Unsupported public key algorithm");
  }
}
function decodeSessionKey(version, keyAlgo, decryptedData, randomSessionKey) {
  switch (keyAlgo) {
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.elgamal:
    case enums_default.publicKey.ecdh: {
      const result = decryptedData.subarray(0, decryptedData.length - 2);
      const checksum = decryptedData.subarray(decryptedData.length - 2);
      const computedChecksum = util_default.writeChecksum(result.subarray(result.length % 8));
      const isValidChecksum = computedChecksum[0] === checksum[0] & computedChecksum[1] === checksum[1];
      const decryptedSessionKey = version === 6 ? { sessionKeyAlgorithm: null, sessionKey: result } : { sessionKeyAlgorithm: result[0], sessionKey: result.subarray(1) };
      if (randomSessionKey) {
        const isValidPayload = isValidChecksum & decryptedSessionKey.sessionKeyAlgorithm === randomSessionKey.sessionKeyAlgorithm & decryptedSessionKey.sessionKey.length === randomSessionKey.sessionKey.length;
        return {
          sessionKey: util_default.selectUint8Array(isValidPayload, decryptedSessionKey.sessionKey, randomSessionKey.sessionKey),
          sessionKeyAlgorithm: version === 6 ? null : util_default.selectUint8(
            isValidPayload,
            decryptedSessionKey.sessionKeyAlgorithm,
            randomSessionKey.sessionKeyAlgorithm
          )
        };
      } else {
        const isValidPayload = isValidChecksum && (version === 6 || enums_default.read(enums_default.symmetric, decryptedSessionKey.sessionKeyAlgorithm));
        if (isValidPayload) {
          return decryptedSessionKey;
        } else {
          throw new Error("Decryption error");
        }
      }
    }
    case enums_default.publicKey.x25519:
    case enums_default.publicKey.x448:
      return {
        sessionKeyAlgorithm: null,
        sessionKey: decryptedData
      };
    default:
      throw new Error("Unsupported public key algorithm");
  }
}

// vendor/src/openpgpjs/src/packet/sym_encrypted_session_key.js
var SymEncryptedSessionKeyPacket = class _SymEncryptedSessionKeyPacket {
  static get tag() {
    return enums_default.packet.symEncryptedSessionKey;
  }
  /**
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   */
  constructor(config2 = config_default) {
    this.version = config2.aeadProtect ? 6 : 4;
    this.sessionKey = null;
    this.sessionKeyEncryptionAlgorithm = null;
    this.sessionKeyAlgorithm = null;
    this.aeadAlgorithm = enums_default.write(enums_default.aead, config2.preferredAEADAlgorithm);
    this.encrypted = null;
    this.s2k = null;
    this.iv = null;
  }
  /**
   * Parsing function for a symmetric encrypted session key packet (tag 3).
   *
   * @param {Uint8Array} bytes - Payload of a tag 3 packet
   */
  read(bytes) {
    let offset = 0;
    this.version = bytes[offset++];
    if (this.version !== 4 && this.version !== 5 && this.version !== 6) {
      throw new UnsupportedError(`Version ${this.version} of the SKESK packet is unsupported.`);
    }
    if (this.version === 6) {
      offset++;
    }
    const algo = bytes[offset++];
    if (this.version >= 5) {
      this.aeadAlgorithm = bytes[offset++];
      if (this.version === 6) {
        offset++;
      }
    }
    const s2kType = bytes[offset++];
    this.s2k = newS2KFromType(s2kType);
    offset += this.s2k.read(bytes.subarray(offset, bytes.length));
    if (this.version >= 5) {
      const mode = cipherMode_exports.getAEADMode(this.aeadAlgorithm, true);
      this.iv = bytes.subarray(offset, offset += mode.ivLength);
    }
    if (this.version >= 5 || offset < bytes.length) {
      this.encrypted = bytes.subarray(offset, bytes.length);
      this.sessionKeyEncryptionAlgorithm = algo;
    } else {
      this.sessionKeyAlgorithm = algo;
    }
  }
  /**
   * Create a binary representation of a tag 3 packet
   *
   * @returns {Uint8Array} The Uint8Array representation.
  */
  write() {
    const algo = this.encrypted === null ? this.sessionKeyAlgorithm : this.sessionKeyEncryptionAlgorithm;
    let bytes;
    const s2k = this.s2k.write();
    if (this.version === 6) {
      const s2kLen = s2k.length;
      const fieldsLen = 3 + s2kLen + this.iv.length;
      bytes = util_default.concatUint8Array([new Uint8Array([this.version, fieldsLen, algo, this.aeadAlgorithm, s2kLen]), s2k, this.iv, this.encrypted]);
    } else if (this.version === 5) {
      bytes = util_default.concatUint8Array([new Uint8Array([this.version, algo, this.aeadAlgorithm]), s2k, this.iv, this.encrypted]);
    } else {
      bytes = util_default.concatUint8Array([new Uint8Array([this.version, algo]), s2k]);
      if (this.encrypted !== null) {
        bytes = util_default.concatUint8Array([bytes, this.encrypted]);
      }
    }
    return bytes;
  }
  /**
   * Decrypts the session key with the given passphrase
   * @param {String} passphrase - The passphrase in string form
   * @param {Object} config
   * @throws {Error} if decryption was not successful
   * @async
   */
  async decrypt(passphrase, config2 = config_default) {
    const algo = this.sessionKeyEncryptionAlgorithm !== null ? this.sessionKeyEncryptionAlgorithm : this.sessionKeyAlgorithm;
    const { blockSize, keySize } = getCipherParams(algo);
    const key = await this.s2k.produceKey(passphrase, keySize, config2);
    if (this.version >= 5) {
      const mode = cipherMode_exports.getAEADMode(this.aeadAlgorithm, true);
      const adata = new Uint8Array([192 | _SymEncryptedSessionKeyPacket.tag, this.version, this.sessionKeyEncryptionAlgorithm, this.aeadAlgorithm]);
      const encryptionKey = this.version === 6 ? await computeHKDF(enums_default.hash.sha256, key, new Uint8Array(), adata, keySize) : key;
      const modeInstance = await mode(algo, encryptionKey);
      this.sessionKey = await modeInstance.decrypt(this.encrypted, this.iv, adata);
    } else if (this.encrypted !== null) {
      const decrypted = await cipherMode_exports.cfb.decrypt(algo, key, this.encrypted, new Uint8Array(blockSize));
      this.sessionKeyAlgorithm = enums_default.write(enums_default.symmetric, decrypted[0]);
      this.sessionKey = decrypted.subarray(1, decrypted.length);
      if (this.sessionKey.length !== getCipherParams(this.sessionKeyAlgorithm).keySize) {
        throw new Error("Unexpected session key size");
      }
    } else {
      this.sessionKey = key;
    }
  }
  /**
   * Encrypts the session key with the given passphrase
   * @param {String} passphrase - The passphrase in string form
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @throws {Error} if encryption was not successful
   * @async
   */
  async encrypt(passphrase, config2 = config_default) {
    const algo = this.sessionKeyEncryptionAlgorithm !== null ? this.sessionKeyEncryptionAlgorithm : this.sessionKeyAlgorithm;
    this.sessionKeyEncryptionAlgorithm = algo;
    this.s2k = newS2KFromConfig(config2);
    this.s2k.generateSalt();
    const { blockSize, keySize } = getCipherParams(algo);
    const key = await this.s2k.produceKey(passphrase, keySize, config2);
    if (this.sessionKey === null) {
      this.sessionKey = generateSessionKey(this.sessionKeyAlgorithm);
    }
    if (this.version >= 5) {
      const mode = cipherMode_exports.getAEADMode(this.aeadAlgorithm);
      this.iv = getRandomBytes(mode.ivLength);
      const adata = new Uint8Array([192 | _SymEncryptedSessionKeyPacket.tag, this.version, this.sessionKeyEncryptionAlgorithm, this.aeadAlgorithm]);
      const encryptionKey = this.version === 6 ? await computeHKDF(enums_default.hash.sha256, key, new Uint8Array(), adata, keySize) : key;
      const modeInstance = await mode(algo, encryptionKey);
      this.encrypted = await modeInstance.encrypt(this.sessionKey, this.iv, adata);
    } else {
      const toEncrypt = util_default.concatUint8Array([
        new Uint8Array([this.sessionKeyAlgorithm]),
        this.sessionKey
      ]);
      this.encrypted = await cipherMode_exports.cfb.encrypt(algo, key, toEncrypt, new Uint8Array(blockSize), config2);
    }
  }
};
var sym_encrypted_session_key_default = SymEncryptedSessionKeyPacket;

// vendor/src/openpgpjs/src/packet/public_key.js
var PublicKeyPacket = class _PublicKeyPacket {
  static get tag() {
    return enums_default.packet.publicKey;
  }
  /**
   * @param {Date} [date] - Creation date
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   */
  constructor(date = /* @__PURE__ */ new Date(), config2 = config_default) {
    this.version = config2.v6Keys ? 6 : 4;
    this.created = util_default.normalizeDate(date);
    this.algorithm = null;
    this.publicParams = null;
    this.expirationTimeV3 = 0;
    this.fingerprint = null;
    this.keyID = null;
  }
  /**
   * Create a PublicKeyPacket from a SecretKeyPacket
   * @param {SecretKeyPacket} secretKeyPacket - key packet to convert
   * @returns {PublicKeyPacket} public key packet
   * @static
   */
  static fromSecretKeyPacket(secretKeyPacket) {
    const keyPacket = new _PublicKeyPacket();
    const { version, created, algorithm, publicParams, keyID, fingerprint } = secretKeyPacket;
    keyPacket.version = version;
    keyPacket.created = created;
    keyPacket.algorithm = algorithm;
    keyPacket.publicParams = publicParams;
    keyPacket.keyID = keyID;
    keyPacket.fingerprint = fingerprint;
    return keyPacket;
  }
  /**
   * Internal Parser for public keys as specified in {@link https://tools.ietf.org/html/rfc4880#section-5.5.2|RFC 4880 section 5.5.2 Public-Key Packet Formats}
   * @param {Uint8Array} bytes - Input array to read the packet from
   * @returns {Promise<number>} The number of bytes read from `bytes`
   * @async
   */
  async read(bytes, config2 = config_default) {
    let pos = 0;
    this.version = bytes[pos++];
    if (this.version === 5 && !config2.enableParsingV5Entities) {
      throw new UnsupportedError("Support for parsing v5 entities is disabled; turn on `config.enableParsingV5Entities` if needed");
    }
    if (this.version === 4 || this.version === 5 || this.version === 6) {
      this.created = util_default.readDate(bytes.subarray(pos, pos + 4));
      pos += 4;
      this.algorithm = bytes[pos++];
      if (this.version >= 5) {
        pos += 4;
      }
      const { read, publicParams } = parsePublicKeyParams(this.algorithm, bytes.subarray(pos));
      if (this.version === 6 && publicParams.oid && (publicParams.oid.getName() === enums_default.curve.curve25519Legacy || publicParams.oid.getName() === enums_default.curve.ed25519Legacy)) {
        throw new Error("Legacy curve25519 cannot be used with v6 keys");
      }
      this.publicParams = publicParams;
      pos += read;
      await this.computeFingerprintAndKeyID();
      return pos;
    }
    throw new UnsupportedError(`Version ${this.version} of the key packet is unsupported.`);
  }
  /**
   * Creates an OpenPGP public key packet for the given key.
   * @returns {Uint8Array} Bytes encoding the public key OpenPGP packet.
   */
  write() {
    const arr = [];
    arr.push(new Uint8Array([this.version]));
    arr.push(util_default.writeDate(this.created));
    arr.push(new Uint8Array([this.algorithm]));
    const params = serializeParams(this.algorithm, this.publicParams);
    if (this.version >= 5) {
      arr.push(util_default.writeNumber(params.length, 4));
    }
    arr.push(params);
    return util_default.concatUint8Array(arr);
  }
  /**
   * Write packet in order to be hashed; either for a signature or a fingerprint
   * @param {Integer} version - target version of signature or key
   */
  writeForHash(version) {
    const bytes = this.writePublicKey();
    const versionOctet = 149 + version;
    const lengthOctets = version >= 5 ? 4 : 2;
    return util_default.concatUint8Array([new Uint8Array([versionOctet]), util_default.writeNumber(bytes.length, lengthOctets), bytes]);
  }
  /**
   * Check whether secret-key data is available in decrypted form. Returns null for public keys.
   * @returns {Boolean|null}
   */
  isDecrypted() {
    return null;
  }
  /**
   * Returns the creation time of the key
   * @returns {Date}
   */
  getCreationTime() {
    return this.created;
  }
  /**
   * Return the key ID of the key
   * @returns {module:type/keyid~KeyID} The 8-byte key ID
   */
  getKeyID() {
    return this.keyID;
  }
  /**
   * Computes and set the key ID and fingerprint of the key
   * @async
   */
  async computeFingerprintAndKeyID() {
    await this.computeFingerprint();
    this.keyID = new keyid_default();
    if (this.version >= 5) {
      this.keyID.read(this.fingerprint.subarray(0, 8));
    } else if (this.version === 4) {
      this.keyID.read(this.fingerprint.subarray(12, 20));
    } else {
      throw new Error("Unsupported key version");
    }
  }
  /**
   * Computes and set the fingerprint of the key
   */
  async computeFingerprint() {
    const toHash = this.writeForHash(this.version);
    if (this.version >= 5) {
      this.fingerprint = await computeDigest(enums_default.hash.sha256, toHash);
    } else if (this.version === 4) {
      this.fingerprint = await computeDigest(enums_default.hash.sha1, toHash);
    } else {
      throw new Error("Unsupported key version");
    }
  }
  /**
   * Returns the fingerprint of the key, as an array of bytes
   * @returns {Uint8Array} A Uint8Array containing the fingerprint
   */
  getFingerprintBytes() {
    return this.fingerprint;
  }
  /**
   * Calculates and returns the fingerprint of the key, as a string
   * @returns {String} A string containing the fingerprint in lowercase hex
   */
  getFingerprint() {
    return util_default.uint8ArrayToHex(this.getFingerprintBytes());
  }
  /**
   * Calculates whether two keys have the same fingerprint without actually calculating the fingerprint
   * @returns {Boolean} Whether the two keys have the same version and public key data.
   */
  hasSameFingerprintAs(other) {
    return this.version === other.version && util_default.equalsUint8Array(this.writePublicKey(), other.writePublicKey());
  }
  /**
   * Returns algorithm information
   * @returns {Object} An object of the form {algorithm: String, bits:int, curve:String}.
   */
  getAlgorithmInfo() {
    const result = {};
    result.algorithm = enums_default.read(enums_default.publicKey, this.algorithm);
    const modulo = this.publicParams.n || this.publicParams.p;
    if (modulo) {
      result.bits = util_default.uint8ArrayBitLength(modulo);
    } else if (this.publicParams.oid) {
      result.curve = this.publicParams.oid.getName();
    }
    return result;
  }
};
PublicKeyPacket.prototype.readPublicKey = PublicKeyPacket.prototype.read;
PublicKeyPacket.prototype.writePublicKey = PublicKeyPacket.prototype.write;
var public_key_default = PublicKeyPacket;

// vendor/src/openpgpjs/src/packet/symmetrically_encrypted_data.js
var allowedPackets4 = /* @__PURE__ */ util_default.constructAllowedPackets([
  literal_data_default,
  compressed_data_default,
  one_pass_signature_default,
  signature_default
]);
var SymmetricallyEncryptedDataPacket = class {
  static get tag() {
    return enums_default.packet.symmetricallyEncryptedData;
  }
  constructor() {
    this.encrypted = null;
    this.packets = null;
  }
  read(bytes) {
    this.encrypted = bytes;
  }
  write() {
    return this.encrypted;
  }
  /**
     * Decrypt the symmetrically-encrypted packet data
     * See {@link https://tools.ietf.org/html/rfc4880#section-9.2|RFC 4880 9.2} for algorithms.
     * @param {module:enums.symmetric} sessionKeyAlgorithm - Symmetric key algorithm to use
     * @param {Uint8Array} key - The key of cipher blocksize length to be used
     * @param {Object} [config] - Full configuration, defaults to openpgp.config
  
     * @throws {Error} if decryption was not successful
     * @async
     */
  async decrypt(sessionKeyAlgorithm, key, config2 = config_default) {
    if (!config2.allowUnauthenticatedMessages) {
      throw new Error("Message is not authenticated.");
    }
    const { blockSize } = getCipherParams(sessionKeyAlgorithm);
    const encrypted = await readToEnd(clone(this.encrypted));
    const decrypted = await cipherMode_exports.cfb.decrypt(
      sessionKeyAlgorithm,
      key,
      encrypted.subarray(blockSize + 2),
      encrypted.subarray(2, blockSize + 2)
    );
    this.packets = await packetlist_default.fromBinary(decrypted, allowedPackets4, config2);
  }
  /**
   * Encrypt the symmetrically-encrypted packet data
   * See {@link https://tools.ietf.org/html/rfc4880#section-9.2|RFC 4880 9.2} for algorithms.
   * @param {module:enums.symmetric} sessionKeyAlgorithm - Symmetric key algorithm to use
   * @param {Uint8Array} key - The key of cipher blocksize length to be used
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @throws {Error} if encryption was not successful
   * @async
   */
  async encrypt(sessionKeyAlgorithm, key, config2 = config_default) {
    const data = this.packets.write();
    const { blockSize } = getCipherParams(sessionKeyAlgorithm);
    const prefix = await cipherMode_exports.cfb.getPrefixRandom(sessionKeyAlgorithm);
    const FRE = await cipherMode_exports.cfb.encrypt(sessionKeyAlgorithm, key, prefix, new Uint8Array(blockSize), config2);
    const ciphertext = await cipherMode_exports.cfb.encrypt(sessionKeyAlgorithm, key, data, FRE.subarray(2), config2);
    this.encrypted = util_default.concat([FRE, ciphertext]);
  }
};
var symmetrically_encrypted_data_default = SymmetricallyEncryptedDataPacket;

// vendor/src/openpgpjs/src/packet/marker.js
var MarkerPacket = class {
  static get tag() {
    return enums_default.packet.marker;
  }
  /**
   * Parsing function for a marker data packet (tag 10).
   * @param {Uint8Array} bytes - Payload of a tag 10 packet
   * @returns {Boolean} whether the packet payload contains "PGP"
   */
  read(bytes) {
    if (bytes[0] === 80 && // P
    bytes[1] === 71 && // G
    bytes[2] === 80) {
      return true;
    }
    return false;
  }
  write() {
    return new Uint8Array([80, 71, 80]);
  }
};
var marker_default = MarkerPacket;

// vendor/src/openpgpjs/src/packet/public_subkey.js
var PublicSubkeyPacket = class _PublicSubkeyPacket extends public_key_default {
  static get tag() {
    return enums_default.packet.publicSubkey;
  }
  /**
   * @param {Date} [date] - Creation date
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   */
  constructor(date, config2) {
    super(date, config2);
  }
  /**
   * Create a PublicSubkeyPacket from a SecretSubkeyPacket
   * @param {SecretSubkeyPacket} secretSubkeyPacket - subkey packet to convert
   * @returns {SecretSubkeyPacket} public key packet
   * @static
   */
  static fromSecretSubkeyPacket(secretSubkeyPacket) {
    const keyPacket = new _PublicSubkeyPacket();
    const { version, created, algorithm, publicParams, keyID, fingerprint } = secretSubkeyPacket;
    keyPacket.version = version;
    keyPacket.created = created;
    keyPacket.algorithm = algorithm;
    keyPacket.publicParams = publicParams;
    keyPacket.keyID = keyID;
    keyPacket.fingerprint = fingerprint;
    return keyPacket;
  }
};
var public_subkey_default = PublicSubkeyPacket;

// vendor/src/openpgpjs/src/packet/user_attribute.js
var UserAttributePacket = class _UserAttributePacket {
  static get tag() {
    return enums_default.packet.userAttribute;
  }
  constructor() {
    this.attributes = [];
  }
  /**
   * parsing function for a user attribute packet (tag 17).
   * @param {Uint8Array} input - Payload of a tag 17 packet
   */
  read(bytes) {
    let i = 0;
    while (i < bytes.length) {
      const len = readSimpleLength(bytes.subarray(i, bytes.length));
      i += len.offset;
      this.attributes.push(util_default.uint8ArrayToString(bytes.subarray(i, i + len.len)));
      i += len.len;
    }
  }
  /**
   * Creates a binary representation of the user attribute packet
   * @returns {Uint8Array} String representation.
   */
  write() {
    const arr = [];
    for (let i = 0; i < this.attributes.length; i++) {
      arr.push(writeSimpleLength(this.attributes[i].length));
      arr.push(util_default.stringToUint8Array(this.attributes[i]));
    }
    return util_default.concatUint8Array(arr);
  }
  /**
   * Compare for equality
   * @param {UserAttributePacket} usrAttr
   * @returns {Boolean} True if equal.
   */
  equals(usrAttr) {
    if (!usrAttr || !(usrAttr instanceof _UserAttributePacket)) {
      return false;
    }
    return this.attributes.every(function(attr, index) {
      return attr === usrAttr.attributes[index];
    });
  }
};
var user_attribute_default = UserAttributePacket;

// vendor/src/openpgpjs/src/packet/secret_key.js
var SecretKeyPacket = class extends public_key_default {
  static get tag() {
    return enums_default.packet.secretKey;
  }
  /**
   * @param {Date} [date] - Creation date
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   */
  constructor(date = /* @__PURE__ */ new Date(), config2 = config_default) {
    super(date, config2);
    this.keyMaterial = null;
    this.isEncrypted = null;
    this.s2kUsage = 0;
    this.s2k = null;
    this.symmetric = null;
    this.aead = null;
    this.isLegacyAEAD = null;
    this.privateParams = null;
    this.usedModernAEAD = null;
  }
  // 5.5.3.  Secret-Key Packet Formats
  /**
   * Internal parser for private keys as specified in
   * {@link https://tools.ietf.org/html/draft-ietf-openpgp-rfc4880bis-04#section-5.5.3|RFC4880bis-04 section 5.5.3}
   * @param {Uint8Array} bytes - Input string to read the packet from
   * @async
   */
  async read(bytes, config2 = config_default) {
    let i = await this.readPublicKey(bytes, config2);
    const startOfSecretKeyData = i;
    this.s2kUsage = bytes[i++];
    if (this.version === 5) {
      i++;
    }
    if (this.version === 6 && this.s2kUsage) {
      i++;
    }
    try {
      if (this.s2kUsage === 255 || this.s2kUsage === 254 || this.s2kUsage === 253) {
        this.symmetric = bytes[i++];
        if (this.s2kUsage === 253) {
          this.aead = bytes[i++];
        }
        if (this.version === 6) {
          i++;
        }
        const s2kType = bytes[i++];
        this.s2k = newS2KFromType(s2kType);
        i += this.s2k.read(bytes.subarray(i, bytes.length));
        if (this.s2k.type === "gnu-dummy") {
          return;
        }
      } else if (this.s2kUsage) {
        this.symmetric = this.s2kUsage;
      }
      if (this.s2kUsage) {
        this.isLegacyAEAD = this.s2kUsage === 253 && (this.version === 5 || this.version === 4 && config2.parseAEADEncryptedV4KeysAsLegacy);
        if (this.s2kUsage !== 253 || this.isLegacyAEAD) {
          this.iv = bytes.subarray(
            i,
            i + getCipherParams(this.symmetric).blockSize
          );
          this.usedModernAEAD = false;
        } else {
          this.iv = bytes.subarray(
            i,
            i + cipherMode_exports.getAEADMode(this.aead).ivLength
          );
          this.usedModernAEAD = true;
        }
        i += this.iv.length;
      }
    } catch (e) {
      if (!this.s2kUsage) throw e;
      this.unparseableKeyMaterial = bytes.subarray(startOfSecretKeyData);
      this.isEncrypted = true;
    }
    if (this.version === 5) {
      i += 4;
    }
    this.keyMaterial = bytes.subarray(i);
    this.isEncrypted = !!this.s2kUsage;
    if (!this.isEncrypted) {
      let cleartext;
      if (this.version === 6) {
        cleartext = this.keyMaterial;
      } else {
        cleartext = this.keyMaterial.subarray(0, -2);
        if (!util_default.equalsUint8Array(util_default.writeChecksum(cleartext), this.keyMaterial.subarray(-2))) {
          throw new Error("Key checksum mismatch");
        }
      }
      try {
        const { read, privateParams } = parsePrivateKeyParams(this.algorithm, cleartext, this.publicParams);
        if (read < cleartext.length) {
          throw new Error("Error reading MPIs");
        }
        this.privateParams = privateParams;
      } catch (err2) {
        if (err2 instanceof UnsupportedError) throw err2;
        throw new Error("Error reading MPIs");
      }
    }
  }
  /**
   * Creates an OpenPGP key packet for the given key.
   * @returns {Uint8Array} A string of bytes containing the secret key OpenPGP packet.
   */
  write() {
    const serializedPublicKey = this.writePublicKey();
    if (this.unparseableKeyMaterial) {
      return util_default.concatUint8Array([
        serializedPublicKey,
        this.unparseableKeyMaterial
      ]);
    }
    const arr = [serializedPublicKey];
    arr.push(new Uint8Array([this.s2kUsage]));
    const optionalFieldsArr = [];
    if (this.s2kUsage === 255 || this.s2kUsage === 254 || this.s2kUsage === 253) {
      optionalFieldsArr.push(this.symmetric);
      if (this.s2kUsage === 253) {
        optionalFieldsArr.push(this.aead);
      }
      const s2k = this.s2k.write();
      if (this.version === 6) {
        optionalFieldsArr.push(s2k.length);
      }
      optionalFieldsArr.push(...s2k);
    }
    if (this.s2kUsage && this.s2k.type !== "gnu-dummy") {
      optionalFieldsArr.push(...this.iv);
    }
    if (this.version === 5 || this.version === 6 && this.s2kUsage) {
      arr.push(new Uint8Array([optionalFieldsArr.length]));
    }
    arr.push(new Uint8Array(optionalFieldsArr));
    if (!this.isDummy()) {
      if (!this.s2kUsage) {
        this.keyMaterial = serializeParams(this.algorithm, this.privateParams);
      }
      if (this.version === 5) {
        arr.push(util_default.writeNumber(this.keyMaterial.length, 4));
      }
      arr.push(this.keyMaterial);
      if (!this.s2kUsage && this.version !== 6) {
        arr.push(util_default.writeChecksum(this.keyMaterial));
      }
    }
    return util_default.concatUint8Array(arr);
  }
  /**
   * Check whether secret-key data is available in decrypted form.
   * Returns false for gnu-dummy keys and null for public keys.
   * @returns {Boolean|null}
   */
  isDecrypted() {
    return this.isEncrypted === false;
  }
  /**
   * Check whether the key includes secret key material.
   * Some secret keys do not include it, and can thus only be used
   * for public-key operations (encryption and verification).
   * Such keys are:
   * - GNU-dummy keys, where the secret material has been stripped away
   * - encrypted keys with unsupported S2K or cipher
   */
  isMissingSecretKeyMaterial() {
    return this.unparseableKeyMaterial !== void 0 || this.isDummy();
  }
  /**
   * Check whether this is a gnu-dummy key
   * @returns {Boolean}
   */
  isDummy() {
    return !!(this.s2k && this.s2k.type === "gnu-dummy");
  }
  /**
   * Remove private key material, converting the key to a dummy one.
   * The resulting key cannot be used for signing/decrypting but can still verify signatures.
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   */
  makeDummy(config2 = config_default) {
    if (this.isDummy()) {
      return;
    }
    if (this.isDecrypted()) {
      this.clearPrivateParams();
    }
    delete this.unparseableKeyMaterial;
    this.isEncrypted = null;
    this.keyMaterial = null;
    this.s2k = newS2KFromType(enums_default.s2k.gnu, config2);
    this.s2k.algorithm = 0;
    this.s2k.c = 0;
    this.s2k.type = "gnu-dummy";
    this.s2kUsage = 254;
    this.symmetric = enums_default.symmetric.aes256;
    this.isLegacyAEAD = null;
    this.usedModernAEAD = null;
  }
  /**
   * Encrypt the payload. By default, we use aes256 and iterated, salted string
   * to key specifier. If the key is in a decrypted state (isEncrypted === false)
   * and the passphrase is empty or undefined, the key will be set as not encrypted.
   * This can be used to remove passphrase protection after calling decrypt().
   * @param {String} passphrase
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @throws {Error} if encryption was not successful
   * @async
   */
  async encrypt(passphrase, config2 = config_default) {
    if (this.isDummy()) {
      return;
    }
    if (!this.isDecrypted()) {
      throw new Error("Key packet is already encrypted");
    }
    if (!passphrase) {
      throw new Error("A non-empty passphrase is required for key encryption.");
    }
    this.s2k = newS2KFromConfig(config2);
    this.s2k.generateSalt();
    const cleartext = serializeParams(this.algorithm, this.privateParams);
    this.symmetric = enums_default.symmetric.aes256;
    const { blockSize } = getCipherParams(this.symmetric);
    if (config2.aeadProtect) {
      this.s2kUsage = 253;
      this.aead = config2.preferredAEADAlgorithm;
      const mode = cipherMode_exports.getAEADMode(this.aead);
      this.isLegacyAEAD = this.version === 5;
      this.usedModernAEAD = !this.isLegacyAEAD;
      const serializedPacketTag = writeTag(this.constructor.tag);
      const key = await produceEncryptionKey(this.version, this.s2k, passphrase, this.symmetric, this.aead, serializedPacketTag, this.isLegacyAEAD, config2);
      const modeInstance = await mode(this.symmetric, key);
      this.iv = this.isLegacyAEAD ? getRandomBytes(blockSize) : getRandomBytes(mode.ivLength);
      const associateData = this.isLegacyAEAD ? new Uint8Array() : util_default.concatUint8Array([serializedPacketTag, this.writePublicKey()]);
      this.keyMaterial = await modeInstance.encrypt(cleartext, this.iv.subarray(0, mode.ivLength), associateData);
    } else {
      this.s2kUsage = 254;
      this.usedModernAEAD = false;
      const key = await produceEncryptionKey(this.version, this.s2k, passphrase, this.symmetric, void 0, void 0, void 0, config2);
      this.iv = getRandomBytes(blockSize);
      this.keyMaterial = await cipherMode_exports.cfb.encrypt(this.symmetric, key, util_default.concatUint8Array([
        cleartext,
        await computeDigest(enums_default.hash.sha1, cleartext, config2)
      ]), this.iv, config2);
    }
  }
  /**
   * Decrypts the private key params which are needed to use the key.
   * Successful decryption does not imply key integrity, call validate() to confirm that.
   * {@link SecretKeyPacket.isDecrypted} should be false, as
   * otherwise calls to this function will throw an error.
   * @param {String} passphrase - The passphrase for this private key as string
   * @param {Object} config
   * @throws {Error} if the key is already decrypted, or if decryption was not successful
   * @async
   */
  async decrypt(passphrase, config2 = config_default) {
    if (this.isDummy()) {
      return false;
    }
    if (this.unparseableKeyMaterial) {
      throw new Error("Key packet cannot be decrypted: unsupported S2K or cipher algo");
    }
    if (this.isDecrypted()) {
      throw new Error("Key packet is already decrypted.");
    }
    let key;
    const serializedPacketTag = writeTag(this.constructor.tag);
    if (this.s2kUsage === 254 || this.s2kUsage === 253) {
      key = await produceEncryptionKey(
        this.version,
        this.s2k,
        passphrase,
        this.symmetric,
        this.aead,
        serializedPacketTag,
        this.isLegacyAEAD,
        config2
      );
    } else if (this.s2kUsage === 255) {
      throw new Error("Encrypted private key is authenticated using an insecure two-byte hash");
    } else {
      throw new Error("Private key is encrypted using an insecure S2K function: unsalted MD5");
    }
    let cleartext;
    if (this.s2kUsage === 253) {
      const mode = cipherMode_exports.getAEADMode(this.aead, true);
      const modeInstance = await mode(this.symmetric, key);
      try {
        const associateData = this.isLegacyAEAD ? new Uint8Array() : util_default.concatUint8Array([serializedPacketTag, this.writePublicKey()]);
        cleartext = await modeInstance.decrypt(this.keyMaterial, this.iv.subarray(0, mode.ivLength), associateData);
      } catch (err2) {
        if (err2.message === "Authentication tag mismatch") {
          throw new Error("Incorrect key passphrase: " + err2.message);
        }
        throw err2;
      }
    } else {
      const cleartextWithHash = await cipherMode_exports.cfb.decrypt(this.symmetric, key, this.keyMaterial, this.iv);
      cleartext = cleartextWithHash.subarray(0, -20);
      const hash = await computeDigest(enums_default.hash.sha1, cleartext);
      if (!util_default.equalsUint8Array(hash, cleartextWithHash.subarray(-20))) {
        throw new Error("Incorrect key passphrase");
      }
    }
    try {
      const { privateParams } = parsePrivateKeyParams(this.algorithm, cleartext, this.publicParams);
      this.privateParams = privateParams;
    } catch {
      throw new Error("Error reading MPIs");
    }
    this.isEncrypted = false;
    this.keyMaterial = null;
    this.s2kUsage = 0;
    this.aead = null;
    this.symmetric = null;
    this.isLegacyAEAD = null;
  }
  /**
   * Checks that the key parameters are consistent
   * @throws {Error} if validation was not successful
   * @async
   */
  async validate() {
    if (this.isDummy()) {
      return;
    }
    if (!this.isDecrypted()) {
      throw new Error("Key is not decrypted");
    }
    if (this.usedModernAEAD) {
      return;
    }
    let validParams;
    try {
      validParams = await validateParams9(this.algorithm, this.publicParams, this.privateParams);
    } catch {
      validParams = false;
    }
    if (!validParams) {
      throw new Error("Key is invalid");
    }
  }
  async generate(bits2, curve) {
    if (this.version === 6 && (this.algorithm === enums_default.publicKey.ecdh && curve === enums_default.curve.curve25519Legacy || this.algorithm === enums_default.publicKey.eddsaLegacy)) {
      throw new Error(`Cannot generate v6 keys of type 'ecc' with curve ${curve}. Generate a key of type 'curve25519' instead`);
    }
    const { privateParams, publicParams } = await generateParams(this.algorithm, bits2, curve);
    this.privateParams = privateParams;
    this.publicParams = publicParams;
    this.isEncrypted = false;
  }
  /**
   * Clear private key parameters
   */
  clearPrivateParams() {
    if (this.isMissingSecretKeyMaterial()) {
      return;
    }
    Object.keys(this.privateParams).forEach((name) => {
      const param = this.privateParams[name];
      param.fill(0);
      delete this.privateParams[name];
    });
    this.privateParams = null;
    this.isEncrypted = true;
  }
};
async function produceEncryptionKey(keyVersion, s2k, passphrase, cipherAlgo, aeadMode, serializedPacketTag, isLegacyAEAD, config2) {
  if (s2k.type === "argon2" && !aeadMode) {
    throw new Error("Using Argon2 S2K without AEAD is not allowed");
  }
  if (s2k.type === "simple" && keyVersion === 6) {
    throw new Error("Using Simple S2K with version 6 keys is not allowed");
  }
  const { keySize } = getCipherParams(cipherAlgo);
  const derivedKey = await s2k.produceKey(passphrase, keySize, config2);
  if (!aeadMode || keyVersion === 5 || isLegacyAEAD) {
    return derivedKey;
  }
  const info = util_default.concatUint8Array([
    serializedPacketTag,
    new Uint8Array([keyVersion, cipherAlgo, aeadMode])
  ]);
  return computeHKDF(enums_default.hash.sha256, derivedKey, new Uint8Array(), info, keySize);
}
var secret_key_default = SecretKeyPacket;

// vendor/src/openpgpjs/src/packet/userid.js
var UserIDPacket = class _UserIDPacket {
  static get tag() {
    return enums_default.packet.userID;
  }
  constructor() {
    this.userID = "";
    this.name = "";
    this.email = "";
    this.comment = "";
  }
  /**
   * Create UserIDPacket instance from object
   * @param {Object} userID - Object specifying userID name, email and comment
   * @returns {UserIDPacket}
   * @static
   */
  static fromObject(userID) {
    if (util_default.isString(userID) || userID.name && !util_default.isString(userID.name) || userID.email && !util_default.isEmailAddress(userID.email) || userID.comment && !util_default.isString(userID.comment)) {
      throw new Error("Invalid user ID format");
    }
    const packet = new _UserIDPacket();
    Object.assign(packet, userID);
    const components = [];
    if (packet.name) components.push(packet.name);
    if (packet.comment) components.push(`(${packet.comment})`);
    if (packet.email) components.push(`<${packet.email}>`);
    packet.userID = components.join(" ");
    return packet;
  }
  /**
   * Parsing function for a user id packet (tag 13).
   * @param {Uint8Array} input - Payload of a tag 13 packet
   */
  read(bytes, config2 = config_default) {
    const userID = util_default.decodeUTF8(bytes);
    if (userID.length > config2.maxUserIDLength) {
      throw new Error("User ID string is too long");
    }
    const isValidEmail = (str) => /^[^\s@]+@[^\s@]+$/.test(str);
    const firstBracket = userID.indexOf("<");
    const lastBracket = userID.lastIndexOf(">");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const potentialEmail = userID.substring(firstBracket + 1, lastBracket);
      if (isValidEmail(potentialEmail)) {
        this.email = potentialEmail;
        const beforeEmail = userID.substring(0, firstBracket).trim();
        const firstParen = beforeEmail.indexOf("(");
        const lastParen = beforeEmail.lastIndexOf(")");
        if (firstParen !== -1 && lastParen !== -1 && lastParen > firstParen) {
          this.comment = beforeEmail.substring(firstParen + 1, lastParen).trim();
          this.name = beforeEmail.substring(0, firstParen).trim();
        } else {
          this.name = beforeEmail;
          this.comment = "";
        }
      }
    } else if (isValidEmail(userID.trim())) {
      this.email = userID.trim();
      this.name = "";
      this.comment = "";
    }
    this.userID = userID;
  }
  /**
   * Creates a binary representation of the user id packet
   * @returns {Uint8Array} Binary representation.
   */
  write() {
    return util_default.encodeUTF8(this.userID);
  }
  equals(otherUserID) {
    return otherUserID && otherUserID.userID === this.userID;
  }
};
var userid_default = UserIDPacket;

// vendor/src/openpgpjs/src/packet/secret_subkey.js
var SecretSubkeyPacket = class extends secret_key_default {
  static get tag() {
    return enums_default.packet.secretSubkey;
  }
  /**
   * @param {Date} [date] - Creation date
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   */
  constructor(date = /* @__PURE__ */ new Date(), config2 = config_default) {
    super(date, config2);
  }
};
var secret_subkey_default = SecretSubkeyPacket;

// vendor/src/openpgpjs/src/packet/trust.js
var TrustPacket = class {
  static get tag() {
    return enums_default.packet.trust;
  }
  /**
   * Parsing function for a trust packet (tag 12).
   * Currently not implemented as we ignore trust packets
   */
  read() {
    throw new UnsupportedError("Trust packets are not supported");
  }
  write() {
    throw new UnsupportedError("Trust packets are not supported");
  }
};
var trust_default = TrustPacket;

// vendor/src/openpgpjs/src/packet/padding.js
var PaddingPacket = class {
  static get tag() {
    return enums_default.packet.padding;
  }
  constructor() {
    this.padding = null;
  }
  /**
   * Read a padding packet
   * @param {Uint8Array | ReadableStream<Uint8Array>} bytes
   */
  read(bytes) {
  }
  /**
   * Write the padding packet
   * @returns {Uint8Array} The padding packet.
   */
  write() {
    return this.padding;
  }
  /**
   * Create random padding.
   * @param {Number} length - The length of padding to be generated.
   * @throws {Error} if padding generation was not successful
   * @async needed to avoid breaking change until next major release
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async createPadding(length) {
    this.padding = getRandomBytes(length);
  }
};
var padding_default = PaddingPacket;

// vendor/src/openpgpjs/src/signature.js
var allowedPackets5 = /* @__PURE__ */ util_default.constructAllowedPackets([signature_default]);
var Signature = class {
  /**
   * @param {PacketList} packetlist - The signature packets
   */
  constructor(packetlist) {
    this.packets = packetlist || new packetlist_default();
  }
  /**
   * Returns binary encoded signature
   * @returns {ReadableStream<Uint8Array>} Binary signature.
   */
  write() {
    return this.packets.write();
  }
  /**
   * Returns ASCII armored text of signature
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {ReadableStream<String>} ASCII armor.
   */
  armor(config2 = config_default) {
    const emitChecksum = this.packets.some((packet) => packet.constructor.tag === signature_default.tag && packet.version !== 6);
    return armor(enums_default.armor.signature, this.write(), void 0, void 0, void 0, emitChecksum, config2);
  }
  /**
   * Returns an array of KeyIDs of all of the issuers who created this signature
   * @returns {Array<KeyID>} The Key IDs of the signing keys
   */
  getSigningKeyIDs() {
    return this.packets.map((packet) => packet.issuerKeyID);
  }
};
async function readSignature({ armoredSignature, binarySignature, config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  let input = armoredSignature || binarySignature;
  if (!input) {
    throw new Error("readSignature: must pass options object containing `armoredSignature` or `binarySignature`");
  }
  if (armoredSignature && !util_default.isString(armoredSignature)) {
    throw new Error("readSignature: options.armoredSignature must be a string");
  }
  if (binarySignature && !util_default.isUint8Array(binarySignature)) {
    throw new Error("readSignature: options.binarySignature must be a Uint8Array");
  }
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  if (armoredSignature) {
    const { type, data } = await unarmor(input, config2);
    if (type !== enums_default.armor.signature) {
      throw new Error("Armored text not of type signature");
    }
    input = data;
  }
  const packetlist = await packetlist_default.fromBinary(input, allowedPackets5, config2);
  return new Signature(packetlist);
}

// vendor/src/openpgpjs/src/key/helper.js
async function generateSecretSubkey(options, config2) {
  const secretSubkeyPacket = new secret_subkey_default(options.date, config2);
  secretSubkeyPacket.packets = null;
  secretSubkeyPacket.algorithm = enums_default.write(enums_default.publicKey, options.algorithm);
  await secretSubkeyPacket.generate(options.rsaBits, options.curve);
  await secretSubkeyPacket.computeFingerprintAndKeyID();
  return secretSubkeyPacket;
}
async function generateSecretKey(options, config2) {
  const secretKeyPacket = new secret_key_default(options.date, config2);
  secretKeyPacket.packets = null;
  secretKeyPacket.algorithm = enums_default.write(enums_default.publicKey, options.algorithm);
  await secretKeyPacket.generate(options.rsaBits, options.curve, options.config);
  await secretKeyPacket.computeFingerprintAndKeyID();
  return secretKeyPacket;
}
async function getLatestValidSignature(signatures, publicKey, signatureType, dataToVerify, date = /* @__PURE__ */ new Date(), config2) {
  let latestValid;
  let exception;
  for (let i = signatures.length - 1; i >= 0; i--) {
    try {
      if (!latestValid || signatures[i].created >= latestValid.created) {
        await signatures[i].verify(publicKey, signatureType, dataToVerify, date, void 0, config2);
        latestValid = signatures[i];
      }
    } catch (e) {
      exception = e;
    }
  }
  if (!latestValid) {
    throw util_default.wrapError(
      `Could not find valid ${enums_default.read(enums_default.signature, signatureType)} signature in key ${publicKey.getKeyID().toHex()}`.replace("certGeneric ", "self-").replace(/([a-z])([A-Z])/g, (_, $1, $2) => $1 + " " + $2.toLowerCase()),
      exception
    );
  }
  return latestValid;
}
function isDataExpired(keyPacket, signature, date = /* @__PURE__ */ new Date()) {
  const normDate = util_default.normalizeDate(date);
  if (normDate !== null) {
    const expirationTime = getKeyExpirationTime(keyPacket, signature);
    return !(keyPacket.created <= normDate && normDate < expirationTime);
  }
  return false;
}
async function createBindingSignature(subkey, primaryKey, options, config2) {
  const dataToSign = {};
  dataToSign.key = primaryKey;
  dataToSign.bind = subkey;
  const signatureProperties = { signatureType: enums_default.signature.subkeyBinding };
  if (options.sign) {
    signatureProperties.keyFlags = [enums_default.keyFlags.signData];
    signatureProperties.embeddedSignature = await createSignaturePacket(dataToSign, [], subkey, {
      signatureType: enums_default.signature.keyBinding
    }, options.date, void 0, void 0, void 0, config2);
  } else {
    signatureProperties.keyFlags = [enums_default.keyFlags.encryptCommunication | enums_default.keyFlags.encryptStorage];
  }
  if (options.keyExpirationTime > 0) {
    signatureProperties.keyExpirationTime = options.keyExpirationTime;
    signatureProperties.keyNeverExpires = false;
  }
  const subkeySignaturePacket = await createSignaturePacket(dataToSign, [], primaryKey, signatureProperties, options.date, void 0, void 0, void 0, config2);
  return subkeySignaturePacket;
}
async function getPreferredHashAlgo3(targetKeys, signingKeyPacket, date = /* @__PURE__ */ new Date(), targetUserIDs = [], config2) {
  const defaultAlgo = enums_default.hash.sha256;
  const preferredSenderAlgo = config2.preferredHashAlgorithm;
  const supportedAlgosPerTarget = await Promise.all(targetKeys.map(async (key, i) => {
    const selfCertification = await key.getPrimarySelfSignature(date, targetUserIDs[i], config2);
    const targetPrefs = selfCertification.preferredHashAlgorithms;
    return targetPrefs || [];
  }));
  const supportedAlgosMap = /* @__PURE__ */ new Map();
  for (const supportedAlgos of supportedAlgosPerTarget) {
    for (const hashAlgo of supportedAlgos) {
      try {
        const supportedAlgo = enums_default.write(enums_default.hash, hashAlgo);
        supportedAlgosMap.set(
          supportedAlgo,
          supportedAlgosMap.has(supportedAlgo) ? supportedAlgosMap.get(supportedAlgo) + 1 : 1
        );
      } catch {
      }
    }
  }
  const isSupportedHashAlgo = (hashAlgo) => targetKeys.length === 0 || supportedAlgosMap.get(hashAlgo) === targetKeys.length || hashAlgo === defaultAlgo;
  const getStrongestSupportedHashAlgo = () => {
    if (supportedAlgosMap.size === 0) {
      return defaultAlgo;
    }
    const sortedHashAlgos = Array.from(supportedAlgosMap.keys()).filter((hashAlgo) => isSupportedHashAlgo(hashAlgo)).sort((algoA, algoB) => getHashByteLength(algoA) - getHashByteLength(algoB));
    const strongestHashAlgo = sortedHashAlgos[0];
    return getHashByteLength(strongestHashAlgo) >= getHashByteLength(defaultAlgo) ? strongestHashAlgo : defaultAlgo;
  };
  const eccAlgos = /* @__PURE__ */ new Set([
    enums_default.publicKey.ecdsa,
    enums_default.publicKey.eddsaLegacy,
    enums_default.publicKey.ed25519,
    enums_default.publicKey.ed448
  ]);
  if (eccAlgos.has(signingKeyPacket.algorithm)) {
    const preferredCurveAlgo = getPreferredCurveHashAlgo(signingKeyPacket.algorithm, signingKeyPacket.publicParams.oid);
    const preferredSenderAlgoIsSupported = isSupportedHashAlgo(preferredSenderAlgo);
    const preferredSenderAlgoStrongerThanCurveAlgo = getHashByteLength(preferredSenderAlgo) >= getHashByteLength(preferredCurveAlgo);
    if (preferredSenderAlgoIsSupported && preferredSenderAlgoStrongerThanCurveAlgo) {
      return preferredSenderAlgo;
    } else {
      const strongestSupportedAlgo = getStrongestSupportedHashAlgo();
      return getHashByteLength(strongestSupportedAlgo) >= getHashByteLength(preferredCurveAlgo) ? strongestSupportedAlgo : preferredCurveAlgo;
    }
  }
  return isSupportedHashAlgo(preferredSenderAlgo) ? preferredSenderAlgo : getStrongestSupportedHashAlgo();
}
async function getPreferredCompressionAlgo(keys = [], date = /* @__PURE__ */ new Date(), userIDs = [], config2 = config_default) {
  const defaultAlgo = enums_default.compression.uncompressed;
  const preferredSenderAlgo = config2.preferredCompressionAlgorithm;
  const senderAlgoSupport = await Promise.all(keys.map(async function(key, i) {
    const selfCertification = await key.getPrimarySelfSignature(date, userIDs[i], config2);
    const recipientPrefs = selfCertification.preferredCompressionAlgorithms;
    return !!recipientPrefs && recipientPrefs.indexOf(preferredSenderAlgo) >= 0;
  }));
  return senderAlgoSupport.every(Boolean) ? preferredSenderAlgo : defaultAlgo;
}
async function getPreferredCipherSuite(keys = [], date = /* @__PURE__ */ new Date(), userIDs = [], config2 = config_default) {
  const selfSigs = await Promise.all(keys.map((key, i) => key.getPrimarySelfSignature(date, userIDs[i], config2)));
  const withAEAD = keys.length ? selfSigs.every((selfSig) => selfSig.features && selfSig.features[0] & enums_default.features.seipdv2) : config2.aeadProtect;
  if (withAEAD) {
    const defaultCipherSuite = { symmetricAlgo: enums_default.symmetric.aes128, aeadAlgo: enums_default.aead.ocb };
    const desiredCipherSuites = [
      { symmetricAlgo: config2.preferredSymmetricAlgorithm, aeadAlgo: config2.preferredAEADAlgorithm },
      { symmetricAlgo: config2.preferredSymmetricAlgorithm, aeadAlgo: enums_default.aead.ocb },
      { symmetricAlgo: enums_default.symmetric.aes128, aeadAlgo: config2.preferredAEADAlgorithm }
    ];
    for (const desiredCipherSuite of desiredCipherSuites) {
      if (selfSigs.every((selfSig) => selfSig.preferredCipherSuites && selfSig.preferredCipherSuites.some(
        (cipherSuite) => cipherSuite[0] === desiredCipherSuite.symmetricAlgo && cipherSuite[1] === desiredCipherSuite.aeadAlgo
      ))) {
        return desiredCipherSuite;
      }
    }
    return defaultCipherSuite;
  }
  const defaultSymAlgo = enums_default.symmetric.aes128;
  const desiredSymAlgo = config2.preferredSymmetricAlgorithm;
  return {
    symmetricAlgo: selfSigs.every((selfSig) => selfSig.preferredSymmetricAlgorithms && selfSig.preferredSymmetricAlgorithms.includes(desiredSymAlgo)) ? desiredSymAlgo : defaultSymAlgo,
    aeadAlgo: void 0
  };
}
async function createSignaturePacket(dataToSign, recipientKeys, signingKeyPacket, signatureProperties, date, recipientUserIDs, notations = [], detached = false, config2) {
  if (signingKeyPacket.isDummy()) {
    throw new Error("Cannot sign with a gnu-dummy key.");
  }
  if (!signingKeyPacket.isDecrypted()) {
    throw new Error("Signing key is not decrypted.");
  }
  const signaturePacket = new signature_default();
  Object.assign(signaturePacket, signatureProperties);
  signaturePacket.publicKeyAlgorithm = signingKeyPacket.algorithm;
  signaturePacket.hashAlgorithm = await getPreferredHashAlgo3(recipientKeys, signingKeyPacket, date, recipientUserIDs, config2);
  signaturePacket.rawNotations = [...notations];
  await signaturePacket.sign(signingKeyPacket, dataToSign, date, detached, config2);
  return signaturePacket;
}
async function mergeSignatures(source, dest, attr, date = /* @__PURE__ */ new Date(), checkFn) {
  source = source[attr];
  if (source) {
    if (!dest[attr].length) {
      dest[attr] = source;
    } else {
      await Promise.all(source.map(async function(sourceSig) {
        if (!sourceSig.isExpired(date) && (!checkFn || await checkFn(sourceSig)) && !dest[attr].some(function(destSig) {
          return util_default.equalsUint8Array(destSig.writeParams(), sourceSig.writeParams());
        })) {
          dest[attr].push(sourceSig);
        }
      }));
    }
  }
}
async function isDataRevoked(primaryKey, signatureType, dataToVerify, revocations, signature, key, date = /* @__PURE__ */ new Date(), config2) {
  key = key || primaryKey;
  const revocationKeyIDs = [];
  await Promise.all(revocations.map(async function(revocationSignature) {
    try {
      if (
        // Note: a third-party revocation signature could legitimately revoke a
        // self-signature if the signature has an authorized revocation key.
        // However, we don't support passing authorized revocation keys, nor
        // verifying such revocation signatures. Instead, we indicate an error
        // when parsing a key with an authorized revocation key, and ignore
        // third-party revocation signatures here. (It could also be revoking a
        // third-party key certification, which should only affect
        // `verifyAllCertifications`.)
        !signature || revocationSignature.issuerKeyID.equals(signature.issuerKeyID)
      ) {
        const isHardRevocation = ![
          enums_default.reasonForRevocation.keyRetired,
          enums_default.reasonForRevocation.keySuperseded,
          enums_default.reasonForRevocation.userIDInvalid
        ].includes(revocationSignature.reasonForRevocationFlag);
        await revocationSignature.verify(
          key,
          signatureType,
          dataToVerify,
          isHardRevocation ? null : date,
          false,
          config2
        );
        revocationKeyIDs.push(revocationSignature.issuerKeyID);
      }
    } catch {
    }
  }));
  if (signature) {
    signature.revoked = revocationKeyIDs.some((keyID) => keyID.equals(signature.issuerKeyID)) ? true : signature.revoked || false;
    return signature.revoked;
  }
  return revocationKeyIDs.length > 0;
}
function getKeyExpirationTime(keyPacket, signature) {
  let expirationTime;
  if (signature.keyNeverExpires === false) {
    expirationTime = keyPacket.created.getTime() + signature.keyExpirationTime * 1e3;
  }
  return expirationTime ? new Date(expirationTime) : Infinity;
}
function sanitizeKeyOptions(options, subkeyDefaults = {}) {
  options.type = options.type || subkeyDefaults.type;
  options.curve = options.curve || subkeyDefaults.curve;
  options.rsaBits = options.rsaBits || subkeyDefaults.rsaBits;
  options.keyExpirationTime = options.keyExpirationTime !== void 0 ? options.keyExpirationTime : subkeyDefaults.keyExpirationTime;
  options.passphrase = util_default.isString(options.passphrase) ? options.passphrase : subkeyDefaults.passphrase;
  options.date = options.date || subkeyDefaults.date;
  options.sign = options.sign || false;
  switch (options.type) {
    case "ecc":
      try {
        options.curve = enums_default.write(enums_default.curve, options.curve);
      } catch {
        throw new Error("Unknown curve");
      }
      if (options.curve === enums_default.curve.ed25519Legacy || options.curve === enums_default.curve.curve25519Legacy || options.curve === "ed25519" || options.curve === "curve25519") {
        options.curve = options.sign ? enums_default.curve.ed25519Legacy : enums_default.curve.curve25519Legacy;
      }
      if (options.sign) {
        options.algorithm = options.curve === enums_default.curve.ed25519Legacy ? enums_default.publicKey.eddsaLegacy : enums_default.publicKey.ecdsa;
      } else {
        options.algorithm = enums_default.publicKey.ecdh;
      }
      break;
    case "curve25519":
      options.algorithm = options.sign ? enums_default.publicKey.ed25519 : enums_default.publicKey.x25519;
      break;
    case "curve448":
      options.algorithm = options.sign ? enums_default.publicKey.ed448 : enums_default.publicKey.x448;
      break;
    case "rsa":
      options.algorithm = enums_default.publicKey.rsaEncryptSign;
      break;
    default:
      throw new Error(`Unsupported key type ${options.type}`);
  }
  return options;
}
function validateSigningKeyPacket(keyPacket, signature, config2) {
  switch (keyPacket.algorithm) {
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.rsaSign:
    case enums_default.publicKey.dsa:
    case enums_default.publicKey.ecdsa:
    case enums_default.publicKey.eddsaLegacy:
    case enums_default.publicKey.ed25519:
    case enums_default.publicKey.ed448:
      if (!signature.keyFlags && !config2.allowMissingKeyFlags) {
        throw new Error("None of the key flags is set: consider passing `config.allowMissingKeyFlags`");
      }
      return !signature.keyFlags || (signature.keyFlags[0] & enums_default.keyFlags.signData) !== 0;
    default:
      return false;
  }
}
function validateEncryptionKeyPacket(keyPacket, signature, config2) {
  switch (keyPacket.algorithm) {
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.elgamal:
    case enums_default.publicKey.ecdh:
    case enums_default.publicKey.x25519:
    case enums_default.publicKey.x448:
      if (!signature.keyFlags && !config2.allowMissingKeyFlags) {
        throw new Error("None of the key flags is set: consider passing `config.allowMissingKeyFlags`");
      }
      return !signature.keyFlags || (signature.keyFlags[0] & enums_default.keyFlags.encryptCommunication) !== 0 || (signature.keyFlags[0] & enums_default.keyFlags.encryptStorage) !== 0;
    default:
      return false;
  }
}
function validateDecryptionKeyPacket(keyPacket, signature, config2) {
  if (!signature.keyFlags && !config2.allowMissingKeyFlags) {
    throw new Error("None of the key flags is set: consider passing `config.allowMissingKeyFlags`");
  }
  switch (keyPacket.algorithm) {
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.elgamal:
    case enums_default.publicKey.ecdh:
    case enums_default.publicKey.x25519:
    case enums_default.publicKey.x448: {
      const isValidSigningKeyPacket = !signature.keyFlags || (signature.keyFlags[0] & enums_default.keyFlags.signData) !== 0;
      if (isValidSigningKeyPacket && config2.allowInsecureDecryptionWithSigningKeys) {
        return true;
      }
      return !signature.keyFlags || (signature.keyFlags[0] & enums_default.keyFlags.encryptCommunication) !== 0 || (signature.keyFlags[0] & enums_default.keyFlags.encryptStorage) !== 0;
    }
    default:
      return false;
  }
}
function checkKeyRequirements(keyPacket, config2) {
  const keyAlgo = enums_default.write(enums_default.publicKey, keyPacket.algorithm);
  const algoInfo = keyPacket.getAlgorithmInfo();
  if (config2.rejectPublicKeyAlgorithms.has(keyAlgo)) {
    throw new Error(`${algoInfo.algorithm} keys are considered too weak.`);
  }
  switch (keyAlgo) {
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.rsaSign:
    case enums_default.publicKey.rsaEncrypt:
      if (algoInfo.bits < config2.minRSABits) {
        throw new Error(`RSA keys shorter than ${config2.minRSABits} bits are considered too weak.`);
      }
      break;
    case enums_default.publicKey.ecdsa:
    case enums_default.publicKey.eddsaLegacy:
    case enums_default.publicKey.ecdh:
      if (config2.rejectCurves.has(algoInfo.curve)) {
        throw new Error(`Support for ${algoInfo.algorithm} keys using curve ${algoInfo.curve} is disabled.`);
      }
      break;
    default:
      break;
  }
}

// vendor/src/openpgpjs/src/key/user.js
var User = class _User {
  constructor(userPacket, mainKey) {
    this.userID = userPacket.constructor.tag === enums_default.packet.userID ? userPacket : null;
    this.userAttribute = userPacket.constructor.tag === enums_default.packet.userAttribute ? userPacket : null;
    this.selfCertifications = [];
    this.otherCertifications = [];
    this.revocationSignatures = [];
    this.mainKey = mainKey;
  }
  /**
   * Transforms structured user data to packetlist
   * @returns {PacketList}
   */
  toPacketList() {
    const packetlist = new packetlist_default();
    packetlist.push(this.userID || this.userAttribute);
    packetlist.push(...this.revocationSignatures);
    packetlist.push(...this.selfCertifications);
    packetlist.push(...this.otherCertifications);
    return packetlist;
  }
  /**
   * Shallow clone
   * @returns {User}
   */
  clone() {
    const user = new _User(this.userID || this.userAttribute, this.mainKey);
    user.selfCertifications = [...this.selfCertifications];
    user.otherCertifications = [...this.otherCertifications];
    user.revocationSignatures = [...this.revocationSignatures];
    return user;
  }
  /**
   * Generate third-party certifications over this user and its primary key
   * @param {Array<PrivateKey>} signingKeys - Decrypted private keys for signing
   * @param {Date} [date] - Date to use as creation date of the certificate, instead of the current time
   * @param {Object} config - Full configuration
   * @returns {Promise<User>} New user with new certifications.
   * @async
   */
  async certify(signingKeys, date, config2) {
    const primaryKey = this.mainKey.keyPacket;
    const dataToSign = {
      userID: this.userID,
      userAttribute: this.userAttribute,
      key: primaryKey
    };
    const user = new _User(dataToSign.userID || dataToSign.userAttribute, this.mainKey);
    user.otherCertifications = await Promise.all(signingKeys.map(async function(privateKey) {
      if (!privateKey.isPrivate()) {
        throw new Error("Need private key for signing");
      }
      if (privateKey.hasSameFingerprintAs(primaryKey)) {
        throw new Error("The user's own key can only be used for self-certifications");
      }
      const signingKey = await privateKey.getSigningKey(void 0, date, void 0, config2);
      return createSignaturePacket(dataToSign, [privateKey], signingKey.keyPacket, {
        // Most OpenPGP implementations use generic certification (0x10)
        signatureType: enums_default.signature.certGeneric,
        keyFlags: [enums_default.keyFlags.certifyKeys | enums_default.keyFlags.signData]
      }, date, void 0, void 0, void 0, config2);
    }));
    await user.update(this, date, config2);
    return user;
  }
  /**
   * Checks if a given certificate of the user is revoked
   * @param {SignaturePacket} certificate - The certificate to verify
   * @param  {PublicSubkeyPacket|
   *          SecretSubkeyPacket|
   *          PublicKeyPacket|
   *          SecretKeyPacket} [keyPacket] The key packet to verify the signature, instead of the primary key
   * @param {Date} [date] - Use the given date for verification instead of the current time
   * @param {Object} config - Full configuration
   * @returns {Promise<Boolean>} True if the certificate is revoked.
   * @async
   */
  async isRevoked(certificate, keyPacket, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const primaryKey = this.mainKey.keyPacket;
    return isDataRevoked(primaryKey, enums_default.signature.certRevocation, {
      key: primaryKey,
      userID: this.userID,
      userAttribute: this.userAttribute
    }, this.revocationSignatures, certificate, keyPacket, date, config2);
  }
  /**
   * Verifies the user certificate.
   * @param {SignaturePacket} certificate - A certificate of this user
   * @param {Array<PublicKey>} verificationKeys - Array of keys to verify certificate signatures
   * @param {Date} [date] - Use the given date instead of the current time
   * @param {Object} config - Full configuration
   * @returns {Promise<true|null>} true if the certificate could be verified, or null if the verification keys do not correspond to the certificate
   * @throws if the user certificate is invalid.
   * @async
   */
  async verifyCertificate(certificate, verificationKeys, date = /* @__PURE__ */ new Date(), config2) {
    const that = this;
    const primaryKey = this.mainKey.keyPacket;
    const dataToVerify = {
      userID: this.userID,
      userAttribute: this.userAttribute,
      key: primaryKey
    };
    const { issuerKeyID } = certificate;
    const issuerKeys = verificationKeys.filter((key) => key.getKeys(issuerKeyID).length > 0);
    if (issuerKeys.length === 0) {
      return null;
    }
    await Promise.all(issuerKeys.map(async (key) => {
      const signingKey = await key.getSigningKey(issuerKeyID, certificate.created, void 0, config2);
      if (certificate.revoked || await that.isRevoked(certificate, signingKey.keyPacket, date, config2)) {
        throw new Error("User certificate is revoked");
      }
      try {
        await certificate.verify(signingKey.keyPacket, enums_default.signature.certGeneric, dataToVerify, date, void 0, config2);
      } catch (e) {
        throw util_default.wrapError("User certificate is invalid", e);
      }
    }));
    return true;
  }
  /**
   * Verifies all user certificates
   * @param {Array<PublicKey>} verificationKeys - Array of keys to verify certificate signatures
   * @param {Date} [date] - Use the given date instead of the current time
   * @param {Object} config - Full configuration
   * @returns {Promise<Array<{
   *   keyID: module:type/keyid~KeyID,
   *   valid: Boolean | null
   * }>>} List of signer's keyID and validity of signature.
   *      Signature validity is null if the verification keys do not correspond to the certificate.
   * @async
   */
  async verifyAllCertifications(verificationKeys, date = /* @__PURE__ */ new Date(), config2) {
    const that = this;
    const certifications = this.selfCertifications.concat(this.otherCertifications);
    return Promise.all(certifications.map(async (certification) => ({
      keyID: certification.issuerKeyID,
      valid: await that.verifyCertificate(certification, verificationKeys, date, config2).catch(() => false)
    })));
  }
  /**
   * Verify User. Checks for existence of self signatures, revocation signatures
   * and validity of self signature.
   * @param {Date} date - Use the given date instead of the current time
   * @param {Object} config - Full configuration
   * @returns {Promise<true>} Status of user.
   * @throws {Error} if there are no valid self signatures.
   * @async
   */
  async verify(date = /* @__PURE__ */ new Date(), config2) {
    if (!this.selfCertifications.length) {
      throw new Error("No self-certifications found");
    }
    const that = this;
    const primaryKey = this.mainKey.keyPacket;
    const dataToVerify = {
      userID: this.userID,
      userAttribute: this.userAttribute,
      key: primaryKey
    };
    let exception;
    for (let i = this.selfCertifications.length - 1; i >= 0; i--) {
      try {
        const selfCertification = this.selfCertifications[i];
        if (selfCertification.revoked || await that.isRevoked(selfCertification, void 0, date, config2)) {
          throw new Error("Self-certification is revoked");
        }
        try {
          await selfCertification.verify(primaryKey, enums_default.signature.certGeneric, dataToVerify, date, void 0, config2);
        } catch (e) {
          throw util_default.wrapError("Self-certification is invalid", e);
        }
        return true;
      } catch (e) {
        exception = e;
      }
    }
    throw exception;
  }
  /**
   * Update user with new components from specified user
   * @param {User} sourceUser - Source user to merge
   * @param {Date} date - Date to verify the validity of signatures
   * @param {Object} config - Full configuration
   * @returns {Promise<undefined>}
   * @async
   */
  async update(sourceUser, date, config2) {
    const primaryKey = this.mainKey.keyPacket;
    const dataToVerify = {
      userID: this.userID,
      userAttribute: this.userAttribute,
      key: primaryKey
    };
    await mergeSignatures(sourceUser, this, "selfCertifications", date, async function(srcSelfSig) {
      try {
        await srcSelfSig.verify(primaryKey, enums_default.signature.certGeneric, dataToVerify, date, false, config2);
        return true;
      } catch {
        return false;
      }
    });
    await mergeSignatures(sourceUser, this, "otherCertifications", date);
    await mergeSignatures(sourceUser, this, "revocationSignatures", date, function(srcRevSig) {
      return isDataRevoked(primaryKey, enums_default.signature.certRevocation, dataToVerify, [srcRevSig], void 0, void 0, date, config2);
    });
  }
  /**
   * Revokes the user
   * @param {SecretKeyPacket} primaryKey - decrypted private primary key for revocation
   * @param {Object} reasonForRevocation - optional, object indicating the reason for revocation
   * @param  {module:enums.reasonForRevocation} reasonForRevocation.flag optional, flag indicating the reason for revocation
   * @param  {String} reasonForRevocation.string optional, string explaining the reason for revocation
   * @param {Date} date - optional, override the creationtime of the revocation signature
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<User>} New user with revocation signature.
   * @async
   */
  async revoke(primaryKey, {
    flag: reasonForRevocationFlag = enums_default.reasonForRevocation.noReason,
    string: reasonForRevocationString = ""
  } = {}, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const dataToSign = {
      userID: this.userID,
      userAttribute: this.userAttribute,
      key: primaryKey
    };
    const user = new _User(dataToSign.userID || dataToSign.userAttribute, this.mainKey);
    user.revocationSignatures.push(await createSignaturePacket(dataToSign, [], primaryKey, {
      signatureType: enums_default.signature.certRevocation,
      reasonForRevocationFlag: enums_default.write(enums_default.reasonForRevocation, reasonForRevocationFlag),
      reasonForRevocationString
    }, date, void 0, void 0, false, config2));
    await user.update(this);
    return user;
  }
};
var user_default = User;

// vendor/src/openpgpjs/src/key/subkey.js
var Subkey = class _Subkey {
  /**
   * @param {SecretSubkeyPacket|PublicSubkeyPacket} subkeyPacket - subkey packet to hold in the Subkey
   * @param {Key} mainKey - reference to main Key object, containing the primary key packet corresponding to the subkey
   */
  constructor(subkeyPacket, mainKey) {
    this.keyPacket = subkeyPacket;
    this.bindingSignatures = [];
    this.revocationSignatures = [];
    this.mainKey = mainKey;
  }
  /**
   * Transforms structured subkey data to packetlist
   * @returns {PacketList}
   */
  toPacketList() {
    const packetlist = new packetlist_default();
    packetlist.push(this.keyPacket);
    packetlist.push(...this.revocationSignatures);
    packetlist.push(...this.bindingSignatures);
    return packetlist;
  }
  /**
   * Shallow clone
   * @return {Subkey}
   */
  clone() {
    const subkey = new _Subkey(this.keyPacket, this.mainKey);
    subkey.bindingSignatures = [...this.bindingSignatures];
    subkey.revocationSignatures = [...this.revocationSignatures];
    return subkey;
  }
  /**
   * Checks if a binding signature of a subkey is revoked
   * @param {SignaturePacket} signature - The binding signature to verify
   * @param  {PublicSubkeyPacket|
   *          SecretSubkeyPacket|
   *          PublicKeyPacket|
   *          SecretKeyPacket} key, optional The key to verify the signature
   * @param {Date} [date] - Use the given date for verification instead of the current time
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Boolean>} True if the binding signature is revoked.
   * @async
   */
  async isRevoked(signature, key, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const primaryKey = this.mainKey.keyPacket;
    return isDataRevoked(
      primaryKey,
      enums_default.signature.subkeyRevocation,
      {
        key: primaryKey,
        bind: this.keyPacket
      },
      this.revocationSignatures,
      signature,
      key,
      date,
      config2
    );
  }
  /**
   * Verify subkey. Checks for revocation signatures, expiration time
   * and valid binding signature.
   * @param {Date} date - Use the given date instead of the current time
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<SignaturePacket>}
   * @throws {Error}           if the subkey is invalid.
   * @async
   */
  async verify(date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const primaryKey = this.mainKey.keyPacket;
    const dataToVerify = { key: primaryKey, bind: this.keyPacket };
    const bindingSignature = await getLatestValidSignature(this.bindingSignatures, primaryKey, enums_default.signature.subkeyBinding, dataToVerify, date, config2);
    if (bindingSignature.revoked || await this.isRevoked(bindingSignature, null, date, config2)) {
      throw new Error("Subkey is revoked");
    }
    if (isDataExpired(this.keyPacket, bindingSignature, date)) {
      throw new Error("Subkey is expired");
    }
    return bindingSignature;
  }
  /**
   * Returns the expiration time of the subkey or Infinity if key does not expire.
   * Returns null if the subkey is invalid.
   * @param {Date} date - Use the given date instead of the current time
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Date | Infinity | null>}
   * @async
   */
  async getExpirationTime(date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const primaryKey = this.mainKey.keyPacket;
    const dataToVerify = { key: primaryKey, bind: this.keyPacket };
    let bindingSignature;
    try {
      bindingSignature = await getLatestValidSignature(this.bindingSignatures, primaryKey, enums_default.signature.subkeyBinding, dataToVerify, date, config2);
    } catch {
      return null;
    }
    const keyExpiry = getKeyExpirationTime(this.keyPacket, bindingSignature);
    const sigExpiry = bindingSignature.getExpirationTime();
    return keyExpiry < sigExpiry ? keyExpiry : sigExpiry;
  }
  /**
   * Update subkey with new components from specified subkey
   * @param {Subkey} subkey - Source subkey to merge
   * @param {Date} [date] - Date to verify validity of signatures
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @throws {Error} if update failed
   * @async
   */
  async update(subkey, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const primaryKey = this.mainKey.keyPacket;
    if (!this.hasSameFingerprintAs(subkey)) {
      throw new Error("Subkey update method: fingerprints of subkeys not equal");
    }
    if (this.keyPacket.constructor.tag === enums_default.packet.publicSubkey && subkey.keyPacket.constructor.tag === enums_default.packet.secretSubkey) {
      this.keyPacket = subkey.keyPacket;
    }
    const that = this;
    const dataToVerify = { key: primaryKey, bind: that.keyPacket };
    await mergeSignatures(subkey, this, "bindingSignatures", date, async function(srcBindSig) {
      for (let i = 0; i < that.bindingSignatures.length; i++) {
        if (that.bindingSignatures[i].issuerKeyID.equals(srcBindSig.issuerKeyID)) {
          if (srcBindSig.created > that.bindingSignatures[i].created) {
            that.bindingSignatures[i] = srcBindSig;
          }
          return false;
        }
      }
      try {
        await srcBindSig.verify(primaryKey, enums_default.signature.subkeyBinding, dataToVerify, date, void 0, config2);
        return true;
      } catch {
        return false;
      }
    });
    await mergeSignatures(subkey, this, "revocationSignatures", date, function(srcRevSig) {
      return isDataRevoked(primaryKey, enums_default.signature.subkeyRevocation, dataToVerify, [srcRevSig], void 0, void 0, date, config2);
    });
  }
  /**
   * Revokes the subkey
   * @param {SecretKeyPacket} primaryKey - decrypted private primary key for revocation
   * @param {Object} reasonForRevocation - optional, object indicating the reason for revocation
   * @param  {module:enums.reasonForRevocation} reasonForRevocation.flag optional, flag indicating the reason for revocation
   * @param  {String} reasonForRevocation.string optional, string explaining the reason for revocation
   * @param {Date} date - optional, override the creationtime of the revocation signature
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Subkey>} New subkey with revocation signature.
   * @async
   */
  async revoke(primaryKey, {
    flag: reasonForRevocationFlag = enums_default.reasonForRevocation.noReason,
    string: reasonForRevocationString = ""
  } = {}, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const dataToSign = { key: primaryKey, bind: this.keyPacket };
    const subkey = new _Subkey(this.keyPacket, this.mainKey);
    subkey.revocationSignatures.push(await createSignaturePacket(dataToSign, [], primaryKey, {
      signatureType: enums_default.signature.subkeyRevocation,
      reasonForRevocationFlag: enums_default.write(enums_default.reasonForRevocation, reasonForRevocationFlag),
      reasonForRevocationString
    }, date, void 0, void 0, false, config2));
    await subkey.update(this);
    return subkey;
  }
  hasSameFingerprintAs(other) {
    return this.keyPacket.hasSameFingerprintAs(other.keyPacket || other);
  }
};
["getKeyID", "getFingerprint", "getAlgorithmInfo", "getCreationTime", "isDecrypted"].forEach((name) => {
  Subkey.prototype[name] = function() {
    return this.keyPacket[name]();
  };
});
var subkey_default = Subkey;

// vendor/src/openpgpjs/src/key/key.js
var allowedRevocationPackets = /* @__PURE__ */ util_default.constructAllowedPackets([signature_default]);
var mainKeyPacketTags = /* @__PURE__ */ new Set([enums_default.packet.publicKey, enums_default.packet.secretKey]);
var keyPacketTags = /* @__PURE__ */ new Set([
  enums_default.packet.publicKey,
  enums_default.packet.secretKey,
  enums_default.packet.publicSubkey,
  enums_default.packet.secretSubkey
]);
var Key = class {
  /**
   * Transforms packetlist to structured key data
   * @param {PacketList} packetlist - The packets that form a key
   * @param {Set<enums.packet>} disallowedPackets - disallowed packet tags
   */
  packetListToStructure(packetlist, disallowedPackets = /* @__PURE__ */ new Set()) {
    let user;
    let primaryKeyID;
    let subkey;
    let ignoreUntil;
    for (const packet of packetlist) {
      if (packet instanceof UnparseablePacket) {
        const isUnparseableKeyPacket = keyPacketTags.has(packet.tag);
        if (isUnparseableKeyPacket && !ignoreUntil) {
          if (mainKeyPacketTags.has(packet.tag)) {
            ignoreUntil = mainKeyPacketTags;
          } else {
            ignoreUntil = keyPacketTags;
          }
        }
        continue;
      }
      const tag = packet.constructor.tag;
      if (ignoreUntil) {
        if (!ignoreUntil.has(tag)) continue;
        ignoreUntil = null;
      }
      if (disallowedPackets.has(tag)) {
        throw new Error(`Unexpected packet type: ${tag}`);
      }
      switch (tag) {
        case enums_default.packet.publicKey:
        case enums_default.packet.secretKey:
          if (this.keyPacket) {
            throw new Error("Key block contains multiple keys");
          }
          this.keyPacket = packet;
          primaryKeyID = this.getKeyID();
          if (!primaryKeyID) {
            throw new Error("Missing Key ID");
          }
          break;
        case enums_default.packet.userID:
        case enums_default.packet.userAttribute:
          user = new user_default(packet, this);
          this.users.push(user);
          break;
        case enums_default.packet.publicSubkey:
        case enums_default.packet.secretSubkey:
          user = null;
          subkey = new subkey_default(packet, this);
          this.subkeys.push(subkey);
          break;
        case enums_default.packet.signature:
          switch (packet.signatureType) {
            case enums_default.signature.certGeneric:
            case enums_default.signature.certPersona:
            case enums_default.signature.certCasual:
            case enums_default.signature.certPositive:
              if (!user) {
                util_default.printDebug("Dropping certification signatures without preceding user packet");
                continue;
              }
              if (packet.issuerKeyID.equals(primaryKeyID)) {
                user.selfCertifications.push(packet);
              } else {
                user.otherCertifications.push(packet);
              }
              break;
            case enums_default.signature.certRevocation:
              if (user) {
                user.revocationSignatures.push(packet);
              } else {
                this.directSignatures.push(packet);
              }
              break;
            case enums_default.signature.key:
              this.directSignatures.push(packet);
              break;
            case enums_default.signature.subkeyBinding:
              if (!subkey) {
                util_default.printDebug("Dropping subkey binding signature without preceding subkey packet");
                continue;
              }
              subkey.bindingSignatures.push(packet);
              break;
            case enums_default.signature.keyRevocation:
              this.revocationSignatures.push(packet);
              break;
            case enums_default.signature.subkeyRevocation:
              if (!subkey) {
                util_default.printDebug("Dropping subkey revocation signature without preceding subkey packet");
                continue;
              }
              subkey.revocationSignatures.push(packet);
              break;
          }
          break;
      }
    }
  }
  /**
   * Transforms structured key data to packetlist
   * @returns {PacketList} The packets that form a key.
   */
  toPacketList() {
    const packetlist = new packetlist_default();
    packetlist.push(this.keyPacket);
    packetlist.push(...this.revocationSignatures);
    packetlist.push(...this.directSignatures);
    this.users.map((user) => packetlist.push(...user.toPacketList()));
    this.subkeys.map((subkey) => packetlist.push(...subkey.toPacketList()));
    return packetlist;
  }
  /**
   * Clones the key object. The copy is shallow, as it references the same packet objects as the original. However, if the top-level API is used, the two key instances are effectively independent.
   * @param {Boolean} [clonePrivateParams=false] Only relevant for private keys: whether the secret key paramenters should be deeply copied. This is needed if e.g. `encrypt()` is to be called either on the clone or the original key.
   * @returns {Promise<Key>} Clone of the key.
   */
  clone(clonePrivateParams = false) {
    const key = new this.constructor(this.toPacketList());
    if (clonePrivateParams) {
      key.getKeys().forEach((k) => {
        k.keyPacket = Object.create(
          Object.getPrototypeOf(k.keyPacket),
          Object.getOwnPropertyDescriptors(k.keyPacket)
        );
        if (!k.keyPacket.isDecrypted()) return;
        const privateParams = {};
        Object.keys(k.keyPacket.privateParams).forEach((name) => {
          privateParams[name] = new Uint8Array(k.keyPacket.privateParams[name]);
        });
        k.keyPacket.privateParams = privateParams;
      });
    }
    return key;
  }
  /**
   * Returns an array containing all public or private subkeys matching keyID;
   * If no keyID is given, returns all subkeys.
   * @param {type/keyID} [keyID] - key ID to look for
   * @returns {Array<Subkey>} array of subkeys
   */
  getSubkeys(keyID = null) {
    const subkeys = this.subkeys.filter((subkey) => !keyID || subkey.getKeyID().equals(keyID, true));
    return subkeys;
  }
  /**
   * Returns an array containing all public or private keys matching keyID.
   * If no keyID is given, returns all keys, starting with the primary key.
   * @param {type/keyid~KeyID} [keyID] - key ID to look for
   * @returns {Array<Key|Subkey>} array of keys
   */
  getKeys(keyID = null) {
    const keys = [];
    if (!keyID || this.getKeyID().equals(keyID, true)) {
      keys.push(this);
    }
    return keys.concat(this.getSubkeys(keyID));
  }
  /**
   * Returns key IDs of all keys
   * @returns {Array<module:type/keyid~KeyID>}
   */
  getKeyIDs() {
    return this.getKeys().map((key) => key.getKeyID());
  }
  /**
   * Returns userIDs
   * @returns {Array<string>} Array of userIDs.
   */
  getUserIDs() {
    return this.users.map((user) => {
      return user.userID ? user.userID.userID : null;
    }).filter((userID) => userID !== null);
  }
  /**
   * Returns binary encoded key
   * @returns {Uint8Array} Binary key.
   */
  write() {
    return this.toPacketList().write();
  }
  /**
   * Returns last created key or key by given keyID that is available for signing and verification
   * @param  {module:type/keyid~KeyID} [keyID] - key ID of a specific key to retrieve
   * @param  {Date} [date] - use the fiven date date to  to check key validity instead of the current date
   * @param  {Object} [userID] - filter keys for the given user ID
   * @param  {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Key|Subkey>} signing key
   * @throws if no valid signing key was found
   * @async
   */
  async getSigningKey(keyID = null, date = /* @__PURE__ */ new Date(), userID = {}, config2 = config_default) {
    await this.verifyPrimaryKey(date, userID, config2);
    const primaryKey = this.keyPacket;
    try {
      checkKeyRequirements(primaryKey, config2);
    } catch (err2) {
      throw util_default.wrapError("Could not verify primary key", err2);
    }
    const subkeys = this.subkeys.slice().sort((a, b) => b.keyPacket.created - a.keyPacket.created || b.keyPacket.algorithm - a.keyPacket.algorithm);
    let exception;
    for (const subkey of subkeys) {
      if (!keyID || subkey.getKeyID().equals(keyID)) {
        try {
          await subkey.verify(date, config2);
          const dataToVerify = { key: primaryKey, bind: subkey.keyPacket };
          const bindingSignature = await getLatestValidSignature(
            subkey.bindingSignatures,
            primaryKey,
            enums_default.signature.subkeyBinding,
            dataToVerify,
            date,
            config2
          );
          if (!validateSigningKeyPacket(subkey.keyPacket, bindingSignature, config2)) {
            continue;
          }
          if (!bindingSignature.embeddedSignature) {
            throw new Error("Missing embedded signature");
          }
          await getLatestValidSignature(
            [bindingSignature.embeddedSignature],
            subkey.keyPacket,
            enums_default.signature.keyBinding,
            dataToVerify,
            date,
            config2
          );
          checkKeyRequirements(subkey.keyPacket, config2);
          return subkey;
        } catch (e) {
          exception = e;
        }
      }
    }
    try {
      const selfCertification = await this.getPrimarySelfSignature(date, userID, config2);
      if ((!keyID || primaryKey.getKeyID().equals(keyID)) && validateSigningKeyPacket(primaryKey, selfCertification, config2)) {
        checkKeyRequirements(primaryKey, config2);
        return this;
      }
    } catch (e) {
      exception = e;
    }
    throw util_default.wrapError("Could not find valid signing key packet in key " + this.getKeyID().toHex(), exception);
  }
  /**
   * Returns last created key or key by given keyID that is available for encryption or decryption
   * @param  {module:type/keyid~KeyID} [keyID] - key ID of a specific key to retrieve
   * @param  {Date}   [date] - use the fiven date date to  to check key validity instead of the current date
   * @param  {Object} [userID] - filter keys for the given user ID
   * @param  {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Key|Subkey>} encryption key
   * @throws if no valid encryption key was found
   * @async
   */
  async getEncryptionKey(keyID, date = /* @__PURE__ */ new Date(), userID = {}, config2 = config_default) {
    await this.verifyPrimaryKey(date, userID, config2);
    const primaryKey = this.keyPacket;
    try {
      checkKeyRequirements(primaryKey, config2);
    } catch (err2) {
      throw util_default.wrapError("Could not verify primary key", err2);
    }
    const subkeys = this.subkeys.slice().sort((a, b) => b.keyPacket.created - a.keyPacket.created || b.keyPacket.algorithm - a.keyPacket.algorithm);
    let exception;
    for (const subkey of subkeys) {
      if (!keyID || subkey.getKeyID().equals(keyID)) {
        try {
          await subkey.verify(date, config2);
          const dataToVerify = { key: primaryKey, bind: subkey.keyPacket };
          const bindingSignature = await getLatestValidSignature(subkey.bindingSignatures, primaryKey, enums_default.signature.subkeyBinding, dataToVerify, date, config2);
          if (validateEncryptionKeyPacket(subkey.keyPacket, bindingSignature, config2)) {
            checkKeyRequirements(subkey.keyPacket, config2);
            return subkey;
          }
        } catch (e) {
          exception = e;
        }
      }
    }
    try {
      const selfCertification = await this.getPrimarySelfSignature(date, userID, config2);
      if ((!keyID || primaryKey.getKeyID().equals(keyID)) && validateEncryptionKeyPacket(primaryKey, selfCertification, config2)) {
        checkKeyRequirements(primaryKey, config2);
        return this;
      }
    } catch (e) {
      exception = e;
    }
    throw util_default.wrapError("Could not find valid encryption key packet in key " + this.getKeyID().toHex(), exception);
  }
  /**
   * Checks if a signature on a key is revoked
   * @param {SignaturePacket} signature - The signature to verify
   * @param  {PublicSubkeyPacket|
   *          SecretSubkeyPacket|
   *          PublicKeyPacket|
   *          SecretKeyPacket} key, optional The key to verify the signature
   * @param {Date} [date] - Use the given date for verification, instead of the current time
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Boolean>} True if the certificate is revoked.
   * @async
   */
  async isRevoked(signature, key, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    return isDataRevoked(
      this.keyPacket,
      enums_default.signature.keyRevocation,
      { key: this.keyPacket },
      this.revocationSignatures,
      signature,
      key,
      date,
      config2
    );
  }
  /**
   * Verify primary key. Checks for revocation signatures, expiration time
   * and valid self signature. Throws if the primary key is invalid.
   * @param {Date} [date] - Use the given date for verification instead of the current time
   * @param {Object} [userID] - User ID
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @throws {Error} If key verification failed
   * @async
   */
  async verifyPrimaryKey(date = /* @__PURE__ */ new Date(), userID = {}, config2 = config_default) {
    const primaryKey = this.keyPacket;
    if (await this.isRevoked(null, null, date, config2)) {
      throw new Error("Primary key is revoked");
    }
    const selfCertification = await this.getPrimarySelfSignature(date, userID, config2);
    if (isDataExpired(primaryKey, selfCertification, date)) {
      throw new Error("Primary key is expired");
    }
    if (primaryKey.version !== 6) {
      const directSignature = await getLatestValidSignature(
        this.directSignatures,
        primaryKey,
        enums_default.signature.key,
        { key: primaryKey },
        date,
        config2
      ).catch(() => {
      });
      if (directSignature && isDataExpired(primaryKey, directSignature, date)) {
        throw new Error("Primary key is expired");
      }
    }
  }
  /**
   * Returns the expiration date of the primary key, considering self-certifications and direct-key signatures.
   * Returns `Infinity` if the key doesn't expire, or `null` if the key is revoked or invalid.
   * @param  {Object} [userID] - User ID to consider instead of the primary user
   * @param  {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Date | Infinity | null>}
   * @async
   */
  async getExpirationTime(userID, config2 = config_default) {
    let primaryKeyExpiry;
    try {
      const selfCertification = await this.getPrimarySelfSignature(null, userID, config2);
      const selfSigKeyExpiry = getKeyExpirationTime(this.keyPacket, selfCertification);
      const selfSigExpiry = selfCertification.getExpirationTime();
      const directSignature = this.keyPacket.version !== 6 && // For V6 keys, the above already returns the direct-key signature.
      await getLatestValidSignature(
        this.directSignatures,
        this.keyPacket,
        enums_default.signature.key,
        { key: this.keyPacket },
        null,
        config2
      ).catch(() => {
      });
      if (directSignature) {
        const directSigKeyExpiry = getKeyExpirationTime(this.keyPacket, directSignature);
        primaryKeyExpiry = Math.min(selfSigKeyExpiry, selfSigExpiry, directSigKeyExpiry);
      } else {
        primaryKeyExpiry = selfSigKeyExpiry < selfSigExpiry ? selfSigKeyExpiry : selfSigExpiry;
      }
    } catch {
      primaryKeyExpiry = null;
    }
    return util_default.normalizeDate(primaryKeyExpiry);
  }
  /**
   * For V4 keys, returns the self-signature of the primary user.
   * For V5 keys, returns the latest valid direct-key self-signature.
   * This self-signature is to be used to check the key expiration,
   * algorithm preferences, and so on.
   * @param {Date} [date] - Use the given date for verification instead of the current time
   * @param {Object} [userID] - User ID to get instead of the primary user for V4 keys, if it exists
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<SignaturePacket>} The primary self-signature
   * @async
   */
  async getPrimarySelfSignature(date = /* @__PURE__ */ new Date(), userID = {}, config2 = config_default) {
    const primaryKey = this.keyPacket;
    if (primaryKey.version === 6) {
      return getLatestValidSignature(
        this.directSignatures,
        primaryKey,
        enums_default.signature.key,
        { key: primaryKey },
        date,
        config2
      );
    }
    const { selfCertification } = await this.getPrimaryUser(date, userID, config2);
    return selfCertification;
  }
  /**
   * Returns primary user and most significant (latest valid) self signature
   * - if multiple primary users exist, returns the one with the latest self signature
   * - otherwise, returns the user with the latest self signature
   * @param {Date} [date] - Use the given date for verification instead of the current time
   * @param {Object} [userID] - User ID to get instead of the primary user, if it exists
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<{
   *   user: User,
   *   selfCertification: SignaturePacket
   * }>} The primary user and the self signature
   * @async
   */
  async getPrimaryUser(date = /* @__PURE__ */ new Date(), userID = {}, config2 = config_default) {
    const primaryKey = this.keyPacket;
    const users = [];
    let exception;
    for (let i = 0; i < this.users.length; i++) {
      try {
        const user2 = this.users[i];
        if (!user2.userID) {
          continue;
        }
        if (userID.name !== void 0 && user2.userID.name !== userID.name || userID.email !== void 0 && user2.userID.email !== userID.email || userID.comment !== void 0 && user2.userID.comment !== userID.comment) {
          throw new Error("Could not find user that matches that user ID");
        }
        const dataToVerify = { userID: user2.userID, key: primaryKey };
        const selfCertification = await getLatestValidSignature(user2.selfCertifications, primaryKey, enums_default.signature.certGeneric, dataToVerify, date, config2);
        users.push({ index: i, user: user2, selfCertification });
      } catch (e) {
        exception = e;
      }
    }
    if (!users.length) {
      throw exception || new Error("Could not find primary user");
    }
    await Promise.all(users.map(async (a) => {
      a.selfCertification.revoked || await a.user.isRevoked(a.selfCertification, null, date, config2);
    }));
    const primaryUser = users.sort(function(a, b) {
      const A2 = a.selfCertification;
      const B = b.selfCertification;
      return B.revoked - A2.revoked || A2.isPrimaryUserID - B.isPrimaryUserID || A2.created - B.created;
    }).pop();
    const { user, selfCertification: cert } = primaryUser;
    if (cert.revoked || await user.isRevoked(cert, null, date, config2)) {
      throw new Error("Primary user is revoked");
    }
    return primaryUser;
  }
  /**
   * Update key with new components from specified key with same key ID:
   * users, subkeys, certificates are merged into the destination key,
   * duplicates and expired signatures are ignored.
   *
   * If the source key is a private key and the destination key is public,
   * a private key is returned.
   * @param {Key} sourceKey - Source key to merge
   * @param {Date} [date] - Date to verify validity of signatures and keys
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Key>} updated key
   * @async
   */
  async update(sourceKey, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    if (!this.hasSameFingerprintAs(sourceKey)) {
      throw new Error("Primary key fingerprints must be equal to update the key");
    }
    if (!this.isPrivate() && sourceKey.isPrivate()) {
      const equal = this.subkeys.length === sourceKey.subkeys.length && this.subkeys.every((destSubkey) => {
        return sourceKey.subkeys.some((srcSubkey) => {
          return destSubkey.hasSameFingerprintAs(srcSubkey);
        });
      });
      if (!equal) {
        throw new Error("Cannot update public key with private key if subkeys mismatch");
      }
      return sourceKey.update(this, config2);
    }
    const updatedKey = this.clone();
    await mergeSignatures(sourceKey, updatedKey, "revocationSignatures", date, (srcRevSig) => {
      return isDataRevoked(updatedKey.keyPacket, enums_default.signature.keyRevocation, updatedKey, [srcRevSig], null, sourceKey.keyPacket, date, config2);
    });
    await mergeSignatures(sourceKey, updatedKey, "directSignatures", date);
    await Promise.all(sourceKey.users.map(async (srcUser) => {
      const usersToUpdate = updatedKey.users.filter((dstUser) => srcUser.userID && srcUser.userID.equals(dstUser.userID) || srcUser.userAttribute && srcUser.userAttribute.equals(dstUser.userAttribute));
      if (usersToUpdate.length > 0) {
        await Promise.all(
          usersToUpdate.map((userToUpdate) => userToUpdate.update(srcUser, date, config2))
        );
      } else {
        const newUser = srcUser.clone();
        newUser.mainKey = updatedKey;
        updatedKey.users.push(newUser);
      }
    }));
    await Promise.all(sourceKey.subkeys.map(async (srcSubkey) => {
      const subkeysToUpdate = updatedKey.subkeys.filter((dstSubkey) => dstSubkey.hasSameFingerprintAs(srcSubkey));
      if (subkeysToUpdate.length > 0) {
        await Promise.all(
          subkeysToUpdate.map((subkeyToUpdate) => subkeyToUpdate.update(srcSubkey, date, config2))
        );
      } else {
        const newSubkey = srcSubkey.clone();
        newSubkey.mainKey = updatedKey;
        updatedKey.subkeys.push(newSubkey);
      }
    }));
    return updatedKey;
  }
  /**
   * Get revocation certificate from a revoked key.
   *   (To get a revocation certificate for an unrevoked key, call revoke() first.)
   * @param {Date} date - Use the given date instead of the current time
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<String>} Armored revocation certificate.
   * @async
   */
  async getRevocationCertificate(date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const dataToVerify = { key: this.keyPacket };
    const revocationSignature = await getLatestValidSignature(this.revocationSignatures, this.keyPacket, enums_default.signature.keyRevocation, dataToVerify, date, config2);
    const packetlist = new packetlist_default();
    packetlist.push(revocationSignature);
    const emitChecksum = this.keyPacket.version !== 6;
    return armor(enums_default.armor.publicKey, packetlist.write(), null, null, "This is a revocation certificate", emitChecksum, config2);
  }
  /**
   * Applies a revocation certificate to a key
   * This adds the first signature packet in the armored text to the key,
   * if it is a valid revocation signature.
   * @param {String} revocationCertificate - armored revocation certificate
   * @param {Date} [date] - Date to verify the certificate
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Key>} Revoked key.
   * @async
   */
  async applyRevocationCertificate(revocationCertificate, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const input = await unarmor(revocationCertificate, config2);
    const packetlist = await packetlist_default.fromBinary(input.data, allowedRevocationPackets, config2);
    const revocationSignature = packetlist.findPacket(enums_default.packet.signature);
    if (!revocationSignature || revocationSignature.signatureType !== enums_default.signature.keyRevocation) {
      throw new Error("Could not find revocation signature packet");
    }
    if (!revocationSignature.issuerKeyID.equals(this.getKeyID())) {
      throw new Error("Revocation signature does not match key");
    }
    try {
      await revocationSignature.verify(this.keyPacket, enums_default.signature.keyRevocation, { key: this.keyPacket }, date, void 0, config2);
    } catch (e) {
      throw util_default.wrapError("Could not verify revocation signature", e);
    }
    const key = this.clone();
    key.revocationSignatures.push(revocationSignature);
    return key;
  }
  /**
   * Signs primary user of key
   * @param {Array<PrivateKey>} privateKeys - decrypted private keys for signing
   * @param {Date} [date] - Use the given date for verification instead of the current time
   * @param {Object} [userID] - User ID to get instead of the primary user, if it exists
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Key>} Key with new certificate signature.
   * @async
   */
  async signPrimaryUser(privateKeys, date, userID, config2 = config_default) {
    const { index, user } = await this.getPrimaryUser(date, userID, config2);
    const userSign = await user.certify(privateKeys, date, config2);
    const key = this.clone();
    key.users[index] = userSign;
    return key;
  }
  /**
   * Signs all users of key
   * @param {Array<PrivateKey>} privateKeys - decrypted private keys for signing
   * @param {Date} [date] - Use the given date for signing, instead of the current time
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Key>} Key with new certificate signature.
   * @async
   */
  async signAllUsers(privateKeys, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const key = this.clone();
    key.users = await Promise.all(this.users.map(function(user) {
      return user.certify(privateKeys, date, config2);
    }));
    return key;
  }
  /**
   * Verifies primary user of key
   * - if no arguments are given, verifies the self certificates;
   * - otherwise, verifies all certificates signed with given keys.
   * @param {Array<PublicKey>} [verificationKeys] - array of keys to verify certificate signatures, instead of the primary key
   * @param {Date} [date] - Use the given date for verification instead of the current time
   * @param {Object} [userID] - User ID to get instead of the primary user, if it exists
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Array<{
   *   keyID: module:type/keyid~KeyID,
   *   valid: Boolean|null
   * }>>} List of signer's keyID and validity of signature.
   *      Signature validity is null if the verification keys do not correspond to the certificate.
   * @async
   */
  async verifyPrimaryUser(verificationKeys, date = /* @__PURE__ */ new Date(), userID, config2 = config_default) {
    const primaryKey = this.keyPacket;
    const { user } = await this.getPrimaryUser(date, userID, config2);
    const results = verificationKeys ? await user.verifyAllCertifications(verificationKeys, date, config2) : [{ keyID: primaryKey.getKeyID(), valid: await user.verify(date, config2).catch(() => false) }];
    return results;
  }
  /**
   * Verifies all users of key
   * - if no arguments are given, verifies the self certificates;
   * - otherwise, verifies all certificates signed with given keys.
   * @param {Array<PublicKey>} [verificationKeys] - array of keys to verify certificate signatures
   * @param {Date} [date] - Use the given date for verification instead of the current time
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Array<{
   *   userID: String,
   *   keyID: module:type/keyid~KeyID,
   *   valid: Boolean|null
   * }>>} List of userID, signer's keyID and validity of signature.
   *      Signature validity is null if the verification keys do not correspond to the certificate.
   * @async
   */
  async verifyAllUsers(verificationKeys, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const primaryKey = this.keyPacket;
    const results = [];
    await Promise.all(this.users.map(async (user) => {
      const signatures = verificationKeys ? await user.verifyAllCertifications(verificationKeys, date, config2) : [{ keyID: primaryKey.getKeyID(), valid: await user.verify(date, config2).catch(() => false) }];
      results.push(
        ...signatures.map(
          (signature) => ({
            userID: user.userID ? user.userID.userID : null,
            userAttribute: user.userAttribute,
            keyID: signature.keyID,
            valid: signature.valid
          })
        )
      );
    }));
    return results;
  }
};
["getKeyID", "getFingerprint", "getAlgorithmInfo", "getCreationTime", "hasSameFingerprintAs"].forEach((name) => {
  Key.prototype[name] = subkey_default.prototype[name];
});
var key_default = Key;

// vendor/src/openpgpjs/src/key/public_key.js
var PublicKey = class extends key_default {
  /**
   * @param {PacketList} packetlist - The packets that form this key
   */
  constructor(packetlist) {
    super();
    this.keyPacket = null;
    this.revocationSignatures = [];
    this.directSignatures = [];
    this.users = [];
    this.subkeys = [];
    if (packetlist) {
      this.packetListToStructure(packetlist, /* @__PURE__ */ new Set([enums_default.packet.secretKey, enums_default.packet.secretSubkey]));
      if (!this.keyPacket) {
        throw new Error("Invalid key: missing public-key packet");
      }
    }
  }
  /**
   * Returns true if this is a private key
   * @returns {false}
   */
  isPrivate() {
    return false;
  }
  /**
   * Returns key as public key (shallow copy)
   * @returns {PublicKey} New public Key
   */
  toPublic() {
    return this;
  }
  /**
   * Returns ASCII armored text of key
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {ReadableStream<String>} ASCII armor.
   */
  armor(config2 = config_default) {
    const emitChecksum = this.keyPacket.version !== 6;
    return armor(enums_default.armor.publicKey, this.toPacketList().write(), void 0, void 0, void 0, emitChecksum, config2);
  }
};
var public_key_default2 = PublicKey;

// vendor/src/openpgpjs/src/key/private_key.js
var PrivateKey = class _PrivateKey extends public_key_default2 {
  /**
  * @param {PacketList} packetlist - The packets that form this key
  */
  constructor(packetlist) {
    super();
    this.packetListToStructure(packetlist, /* @__PURE__ */ new Set([enums_default.packet.publicKey, enums_default.packet.publicSubkey]));
    if (!this.keyPacket) {
      throw new Error("Invalid key: missing private-key packet");
    }
  }
  /**
   * Returns true if this is a private key
   * @returns {Boolean}
   */
  isPrivate() {
    return true;
  }
  /**
   * Returns key as public key (shallow copy)
   * @returns {PublicKey} New public Key
   */
  toPublic() {
    const packetlist = new packetlist_default();
    const keyPackets = this.toPacketList();
    for (const keyPacket of keyPackets) {
      switch (keyPacket.constructor.tag) {
        case enums_default.packet.secretKey: {
          const pubKeyPacket = public_key_default.fromSecretKeyPacket(keyPacket);
          packetlist.push(pubKeyPacket);
          break;
        }
        case enums_default.packet.secretSubkey: {
          const pubSubkeyPacket = public_subkey_default.fromSecretSubkeyPacket(keyPacket);
          packetlist.push(pubSubkeyPacket);
          break;
        }
        default:
          packetlist.push(keyPacket);
      }
    }
    return new public_key_default2(packetlist);
  }
  /**
   * Returns ASCII armored text of key
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {ReadableStream<String>} ASCII armor.
   */
  armor(config2 = config_default) {
    const emitChecksum = this.keyPacket.version !== 6;
    return armor(enums_default.armor.privateKey, this.toPacketList().write(), void 0, void 0, void 0, emitChecksum, config2);
  }
  /**
   * Returns all keys that are available for decryption, matching the keyID when given
   * This is useful to retrieve keys for session key decryption
   * @param  {module:type/keyid~KeyID} keyID, optional
   * @param  {Date}              date, optional
   * @param  {String}            userID, optional
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Array<Key|Subkey>>} Array of decryption keys.
   * @throws {Error} if no decryption key is found
   * @async
   */
  async getDecryptionKeys(keyID, date = /* @__PURE__ */ new Date(), userID = {}, config2 = config_default) {
    const primaryKey = this.keyPacket;
    const keys = [];
    let exception = null;
    for (let i = 0; i < this.subkeys.length; i++) {
      if (!keyID || this.subkeys[i].getKeyID().equals(keyID, true)) {
        if (this.subkeys[i].keyPacket.isDummy()) {
          exception = exception || new Error("Gnu-dummy key packets cannot be used for decryption");
          continue;
        }
        try {
          const dataToVerify = { key: primaryKey, bind: this.subkeys[i].keyPacket };
          const bindingSignature = await getLatestValidSignature(this.subkeys[i].bindingSignatures, primaryKey, enums_default.signature.subkeyBinding, dataToVerify, date, config2);
          if (validateDecryptionKeyPacket(this.subkeys[i].keyPacket, bindingSignature, config2)) {
            keys.push(this.subkeys[i]);
          }
        } catch (e) {
          exception = e;
        }
      }
    }
    const selfCertification = await this.getPrimarySelfSignature(date, userID, config2);
    if ((!keyID || primaryKey.getKeyID().equals(keyID, true)) && validateDecryptionKeyPacket(primaryKey, selfCertification, config2)) {
      if (primaryKey.isDummy()) {
        exception = exception || new Error("Gnu-dummy key packets cannot be used for decryption");
      } else {
        keys.push(this);
      }
    }
    if (keys.length === 0) {
      throw exception || new Error("No decryption key packets found");
    }
    return keys;
  }
  /**
   * Returns true if the primary key or any subkey is decrypted.
   * A dummy key is considered encrypted.
   */
  isDecrypted() {
    return this.getKeys().some(({ keyPacket }) => keyPacket.isDecrypted());
  }
  /**
   * Check whether the private and public primary key parameters correspond
   * Together with verification of binding signatures, this guarantees key integrity
   * In case of gnu-dummy primary key, it is enough to validate any signing subkeys
   *   otherwise all encryption subkeys are validated
   * If only gnu-dummy keys are found, we cannot properly validate so we throw an error
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @throws {Error} if validation was not successful and the key cannot be trusted
   * @async
   */
  async validate(config2 = config_default) {
    if (!this.isPrivate()) {
      throw new Error("Cannot validate a public key");
    }
    let signingKeyPacket;
    if (!this.keyPacket.isDummy()) {
      signingKeyPacket = this.keyPacket;
    } else {
      const signingKey = await this.getSigningKey(null, null, void 0, { ...config2, rejectPublicKeyAlgorithms: /* @__PURE__ */ new Set(), minRSABits: 0 });
      if (signingKey && !signingKey.keyPacket.isDummy()) {
        signingKeyPacket = signingKey.keyPacket;
      }
    }
    if (signingKeyPacket) {
      return signingKeyPacket.validate();
    } else {
      const keys = this.getKeys();
      const allDummies = keys.map((key) => key.keyPacket.isDummy()).every(Boolean);
      if (allDummies) {
        throw new Error("Cannot validate an all-gnu-dummy key");
      }
      return Promise.all(keys.map((key) => key.keyPacket.validate()));
    }
  }
  /**
   * Clear private key parameters
   */
  clearPrivateParams() {
    this.getKeys().forEach(({ keyPacket }) => {
      if (keyPacket.isDecrypted()) {
        keyPacket.clearPrivateParams();
      }
    });
  }
  /**
   * Revokes the key
   * @param {Object} reasonForRevocation - optional, object indicating the reason for revocation
   * @param  {module:enums.reasonForRevocation} reasonForRevocation.flag optional, flag indicating the reason for revocation
   * @param  {String} reasonForRevocation.string optional, string explaining the reason for revocation
   * @param {Date} date - optional, override the creationtime of the revocation signature
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<PrivateKey>} New key with revocation signature.
   * @async
   */
  async revoke({
    flag: reasonForRevocationFlag = enums_default.reasonForRevocation.noReason,
    string: reasonForRevocationString = ""
  } = {}, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    if (!this.isPrivate()) {
      throw new Error("Need private key for revoking");
    }
    const dataToSign = { key: this.keyPacket };
    const key = this.clone();
    key.revocationSignatures.push(await createSignaturePacket(dataToSign, [], this.keyPacket, {
      signatureType: enums_default.signature.keyRevocation,
      reasonForRevocationFlag: enums_default.write(enums_default.reasonForRevocation, reasonForRevocationFlag),
      reasonForRevocationString
    }, date, void 0, void 0, void 0, config2));
    return key;
  }
  /**
   * Generates a new OpenPGP subkey, and returns a clone of the Key object with the new subkey added.
   * Supports RSA and ECC keys, as well as the newer Curve448 and Curve25519.
   * Defaults to the algorithm and bit size/curve of the primary key. DSA primary keys default to RSA subkeys.
   * @param {ecc|rsa|curve25519|curve448} options.type The subkey algorithm: ECC, RSA, Curve448 or Curve25519 (new format).
   *                                                   Note: Curve448 and Curve25519 are not widely supported yet.
   * @param {String}  options.curve      (optional) Elliptic curve for ECC keys
   * @param {Integer} options.rsaBits    (optional) Number of bits for RSA subkeys
   * @param {Number}  options.keyExpirationTime (optional) Number of seconds from the key creation time after which the key expires
   * @param {Date}    options.date       (optional) Override the creation date of the key and the key signatures
   * @param {Boolean} options.sign       (optional) Indicates whether the subkey should sign rather than encrypt. Defaults to false
   * @param {Object}  options.config     (optional) custom configuration settings to overwrite those in [config]{@link module:config}
   * @returns {Promise<PrivateKey>}
   * @async
   */
  async addSubkey(options = {}) {
    const config2 = { ...config_default, ...options.config };
    if (options.passphrase) {
      throw new Error("Subkey could not be encrypted here, please encrypt whole key");
    }
    if (options.rsaBits < config2.minRSABits) {
      throw new Error(`rsaBits should be at least ${config2.minRSABits}, got: ${options.rsaBits}`);
    }
    const secretKeyPacket = this.keyPacket;
    if (secretKeyPacket.isDummy()) {
      throw new Error("Cannot add subkey to gnu-dummy primary key");
    }
    if (!secretKeyPacket.isDecrypted()) {
      throw new Error("Key is not decrypted");
    }
    const defaultOptions = secretKeyPacket.getAlgorithmInfo();
    defaultOptions.type = getDefaultSubkeyType(defaultOptions.algorithm);
    defaultOptions.rsaBits = defaultOptions.bits || 4096;
    defaultOptions.curve = defaultOptions.curve || "curve25519Legacy";
    options = sanitizeKeyOptions(options, defaultOptions);
    const keyPacket = await generateSecretSubkey(options, { ...config2, v6Keys: this.keyPacket.version === 6 });
    checkKeyRequirements(keyPacket, config2);
    const bindingSignature = await createBindingSignature(keyPacket, secretKeyPacket, options, config2);
    const packetList = this.toPacketList();
    packetList.push(keyPacket, bindingSignature);
    return new _PrivateKey(packetList);
  }
};
function getDefaultSubkeyType(algoName) {
  const algo = enums_default.write(enums_default.publicKey, algoName);
  switch (algo) {
    case enums_default.publicKey.rsaEncrypt:
    case enums_default.publicKey.rsaEncryptSign:
    case enums_default.publicKey.rsaSign:
    case enums_default.publicKey.dsa:
      return "rsa";
    case enums_default.publicKey.ecdsa:
    case enums_default.publicKey.eddsaLegacy:
      return "ecc";
    case enums_default.publicKey.ed25519:
      return "curve25519";
    case enums_default.publicKey.ed448:
      return "curve448";
    default:
      throw new Error("Unsupported algorithm");
  }
}
var private_key_default = PrivateKey;

// vendor/src/openpgpjs/src/key/factory.js
var allowedKeyPackets = /* @__PURE__ */ util_default.constructAllowedPackets([
  public_key_default,
  public_subkey_default,
  secret_key_default,
  secret_subkey_default,
  userid_default,
  user_attribute_default,
  signature_default
]);
function createKey(packetlist) {
  for (const packet of packetlist) {
    switch (packet.constructor.tag) {
      case enums_default.packet.secretKey:
        return new private_key_default(packetlist);
      case enums_default.packet.publicKey:
        return new public_key_default2(packetlist);
    }
  }
  throw new Error("No key packet found");
}
async function generate5(options, config2) {
  options.sign = true;
  options = sanitizeKeyOptions(options);
  options.subkeys = options.subkeys.map((subkey, index) => sanitizeKeyOptions(options.subkeys[index], options));
  let promises = [generateSecretKey(options, config2)];
  promises = promises.concat(options.subkeys.map((options2) => generateSecretSubkey(options2, config2)));
  const packets = await Promise.all(promises);
  const key = await wrapKeyObject(packets[0], packets.slice(1), options, config2);
  const revocationCertificate = await key.getRevocationCertificate(options.date, config2);
  key.revocationSignatures = [];
  return { key, revocationCertificate };
}
async function reformat(options, config2) {
  options = sanitize(options);
  const { privateKey } = options;
  if (!privateKey.isPrivate()) {
    throw new Error("Cannot reformat a public key");
  }
  if (privateKey.keyPacket.isDummy()) {
    throw new Error("Cannot reformat a gnu-dummy primary key");
  }
  const isDecrypted = privateKey.getKeys().every(({ keyPacket }) => keyPacket.isDecrypted());
  if (!isDecrypted) {
    throw new Error("Key is not decrypted");
  }
  const secretKeyPacket = privateKey.keyPacket;
  if (!options.subkeys) {
    options.subkeys = await Promise.all(privateKey.subkeys.map(async (subkey) => {
      const secretSubkeyPacket = subkey.keyPacket;
      const dataToVerify = { key: secretKeyPacket, bind: secretSubkeyPacket };
      const bindingSignature = await getLatestValidSignature(subkey.bindingSignatures, secretKeyPacket, enums_default.signature.subkeyBinding, dataToVerify, null, config2).catch(() => ({}));
      return {
        sign: bindingSignature.keyFlags && bindingSignature.keyFlags[0] & enums_default.keyFlags.signData
      };
    }));
  }
  const secretSubkeyPackets = privateKey.subkeys.map((subkey) => subkey.keyPacket);
  if (options.subkeys.length !== secretSubkeyPackets.length) {
    throw new Error("Number of subkey options does not match number of subkeys");
  }
  options.subkeys = options.subkeys.map((subkeyOptions) => sanitize(subkeyOptions, options));
  const key = await wrapKeyObject(secretKeyPacket, secretSubkeyPackets, options, config2);
  const revocationCertificate = await key.getRevocationCertificate(options.date, config2);
  key.revocationSignatures = [];
  return { key, revocationCertificate };
  function sanitize(options2, subkeyDefaults = {}) {
    options2.keyExpirationTime = options2.keyExpirationTime || subkeyDefaults.keyExpirationTime;
    options2.passphrase = util_default.isString(options2.passphrase) ? options2.passphrase : subkeyDefaults.passphrase;
    options2.date = options2.date || subkeyDefaults.date;
    return options2;
  }
}
async function wrapKeyObject(secretKeyPacket, secretSubkeyPackets, options, config2) {
  if (options.passphrase) {
    await secretKeyPacket.encrypt(options.passphrase, config2);
  }
  await Promise.all(secretSubkeyPackets.map(async function(secretSubkeyPacket, index) {
    const subkeyPassphrase = options.subkeys[index].passphrase;
    if (subkeyPassphrase) {
      await secretSubkeyPacket.encrypt(subkeyPassphrase, config2);
    }
  }));
  const packetlist = new packetlist_default();
  packetlist.push(secretKeyPacket);
  function createPreferredAlgos(algos, preferredAlgo) {
    return [preferredAlgo, ...algos.filter((algo) => algo !== preferredAlgo)];
  }
  function getKeySignatureProperties() {
    const signatureProperties = {};
    signatureProperties.keyFlags = [enums_default.keyFlags.certifyKeys | enums_default.keyFlags.signData];
    const symmetricAlgorithms = createPreferredAlgos([
      // prefer aes256, aes128, no aes192 (no Web Crypto support in Chrome: https://www.chromium.org/blink/webcrypto#TOC-AES-support)
      enums_default.symmetric.aes256,
      enums_default.symmetric.aes128
    ], config2.preferredSymmetricAlgorithm);
    signatureProperties.preferredSymmetricAlgorithms = symmetricAlgorithms;
    if (config2.aeadProtect) {
      const aeadAlgorithms = createPreferredAlgos([
        enums_default.aead.gcm,
        enums_default.aead.eax,
        enums_default.aead.ocb
      ], config2.preferredAEADAlgorithm);
      signatureProperties.preferredCipherSuites = aeadAlgorithms.flatMap((aeadAlgorithm) => {
        return symmetricAlgorithms.map((symmetricAlgorithm) => {
          return [symmetricAlgorithm, aeadAlgorithm];
        });
      });
    }
    signatureProperties.preferredHashAlgorithms = createPreferredAlgos([
      enums_default.hash.sha512,
      enums_default.hash.sha256,
      enums_default.hash.sha3_512,
      enums_default.hash.sha3_256
    ], config2.preferredHashAlgorithm);
    signatureProperties.preferredCompressionAlgorithms = createPreferredAlgos([
      enums_default.compression.uncompressed,
      enums_default.compression.zlib,
      enums_default.compression.zip
    ], config2.preferredCompressionAlgorithm);
    signatureProperties.features = [0];
    signatureProperties.features[0] |= enums_default.features.modificationDetection;
    if (config2.aeadProtect) {
      signatureProperties.features[0] |= enums_default.features.seipdv2;
    }
    if (options.keyExpirationTime > 0) {
      signatureProperties.keyExpirationTime = options.keyExpirationTime;
      signatureProperties.keyNeverExpires = false;
    }
    return signatureProperties;
  }
  if (secretKeyPacket.version === 6) {
    const dataToSign2 = {
      key: secretKeyPacket
    };
    const signatureProperties = getKeySignatureProperties();
    signatureProperties.signatureType = enums_default.signature.key;
    const signaturePacket = await createSignaturePacket(dataToSign2, [], secretKeyPacket, signatureProperties, options.date, void 0, options.signatureNotations, void 0, config2);
    packetlist.push(signaturePacket);
  }
  await Promise.all(options.userIDs.map(async function(userID, index) {
    const userIDPacket = userid_default.fromObject(userID);
    const dataToSign2 = {
      userID: userIDPacket,
      key: secretKeyPacket
    };
    const signatureProperties = secretKeyPacket.version !== 6 ? getKeySignatureProperties() : {};
    signatureProperties.signatureType = enums_default.signature.certPositive;
    if (index === 0) {
      signatureProperties.isPrimaryUserID = true;
    }
    const signaturePacket = await createSignaturePacket(dataToSign2, [], secretKeyPacket, signatureProperties, options.date, void 0, options.signatureNotations, void 0, config2);
    return { userIDPacket, signaturePacket };
  })).then((list) => {
    list.forEach(({ userIDPacket, signaturePacket }) => {
      packetlist.push(userIDPacket);
      packetlist.push(signaturePacket);
    });
  });
  await Promise.all(secretSubkeyPackets.map(async function(secretSubkeyPacket, index) {
    const subkeyOptions = options.subkeys[index];
    const subkeySignaturePacket = await createBindingSignature(secretSubkeyPacket, secretKeyPacket, subkeyOptions, config2);
    return { secretSubkeyPacket, subkeySignaturePacket };
  })).then((packets) => {
    packets.forEach(({ secretSubkeyPacket, subkeySignaturePacket }) => {
      packetlist.push(secretSubkeyPacket);
      packetlist.push(subkeySignaturePacket);
    });
  });
  const dataToSign = { key: secretKeyPacket };
  packetlist.push(await createSignaturePacket(dataToSign, [], secretKeyPacket, {
    signatureType: enums_default.signature.keyRevocation,
    reasonForRevocationFlag: enums_default.reasonForRevocation.noReason,
    reasonForRevocationString: ""
  }, options.date, void 0, void 0, void 0, config2));
  if (options.passphrase) {
    secretKeyPacket.clearPrivateParams();
  }
  secretSubkeyPackets.map(function(secretSubkeyPacket, index) {
    const subkeyPassphrase = options.subkeys[index].passphrase;
    if (subkeyPassphrase) {
      secretSubkeyPacket.clearPrivateParams();
    }
  });
  return new private_key_default(packetlist);
}
async function readKey({ armoredKey, binaryKey, config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  if (!armoredKey && !binaryKey) {
    throw new Error("readKey: must pass options object containing `armoredKey` or `binaryKey`");
  }
  if (armoredKey && !util_default.isString(armoredKey)) {
    throw new Error("readKey: options.armoredKey must be a string");
  }
  if (binaryKey && !util_default.isUint8Array(binaryKey)) {
    throw new Error("readKey: options.binaryKey must be a Uint8Array");
  }
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  let input;
  if (armoredKey) {
    const { type, data } = await unarmor(armoredKey, config2);
    if (!(type === enums_default.armor.publicKey || type === enums_default.armor.privateKey)) {
      throw new Error("Armored text not of type key");
    }
    input = data;
  } else {
    input = binaryKey;
  }
  const packetlist = await packetlist_default.fromBinary(input, allowedKeyPackets, config2);
  const keyIndex = packetlist.indexOfTag(enums_default.packet.publicKey, enums_default.packet.secretKey);
  if (keyIndex.length === 0) {
    throw new Error("No key packet found");
  }
  const firstKeyPacketList = packetlist.slice(keyIndex[0], keyIndex[1]);
  return createKey(firstKeyPacketList);
}
async function readPrivateKey({ armoredKey, binaryKey, config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  if (!armoredKey && !binaryKey) {
    throw new Error("readPrivateKey: must pass options object containing `armoredKey` or `binaryKey`");
  }
  if (armoredKey && !util_default.isString(armoredKey)) {
    throw new Error("readPrivateKey: options.armoredKey must be a string");
  }
  if (binaryKey && !util_default.isUint8Array(binaryKey)) {
    throw new Error("readPrivateKey: options.binaryKey must be a Uint8Array");
  }
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  let input;
  if (armoredKey) {
    const { type, data } = await unarmor(armoredKey, config2);
    if (!(type === enums_default.armor.privateKey)) {
      throw new Error("Armored text not of type private key");
    }
    input = data;
  } else {
    input = binaryKey;
  }
  const packetlist = await packetlist_default.fromBinary(input, allowedKeyPackets, config2);
  const keyIndex = packetlist.indexOfTag(enums_default.packet.publicKey, enums_default.packet.secretKey);
  for (let i = 0; i < keyIndex.length; i++) {
    if (packetlist[keyIndex[i]].constructor.tag === enums_default.packet.publicKey) {
      continue;
    }
    const firstPrivateKeyList = packetlist.slice(keyIndex[i], keyIndex[i + 1]);
    return new private_key_default(firstPrivateKeyList);
  }
  throw new Error("No secret key packet found");
}
async function readKeys({ armoredKeys, binaryKeys, config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  let input = armoredKeys || binaryKeys;
  if (!input) {
    throw new Error("readKeys: must pass options object containing `armoredKeys` or `binaryKeys`");
  }
  if (armoredKeys && !util_default.isString(armoredKeys)) {
    throw new Error("readKeys: options.armoredKeys must be a string");
  }
  if (binaryKeys && !util_default.isUint8Array(binaryKeys)) {
    throw new Error("readKeys: options.binaryKeys must be a Uint8Array");
  }
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  if (armoredKeys) {
    const { type, data } = await unarmor(armoredKeys, config2);
    if (type !== enums_default.armor.publicKey && type !== enums_default.armor.privateKey) {
      throw new Error("Armored text not of type key");
    }
    input = data;
  }
  const keys = [];
  const packetlist = await packetlist_default.fromBinary(input, allowedKeyPackets, config2);
  const keyIndex = packetlist.indexOfTag(enums_default.packet.publicKey, enums_default.packet.secretKey);
  if (keyIndex.length === 0) {
    throw new Error("No key packet found");
  }
  for (let i = 0; i < keyIndex.length; i++) {
    const oneKeyList = packetlist.slice(keyIndex[i], keyIndex[i + 1]);
    const newKey = createKey(oneKeyList);
    keys.push(newKey);
  }
  return keys;
}
async function readPrivateKeys({ armoredKeys, binaryKeys, config: config2 }) {
  config2 = { ...config_default, ...config2 };
  let input = armoredKeys || binaryKeys;
  if (!input) {
    throw new Error("readPrivateKeys: must pass options object containing `armoredKeys` or `binaryKeys`");
  }
  if (armoredKeys && !util_default.isString(armoredKeys)) {
    throw new Error("readPrivateKeys: options.armoredKeys must be a string");
  }
  if (binaryKeys && !util_default.isUint8Array(binaryKeys)) {
    throw new Error("readPrivateKeys: options.binaryKeys must be a Uint8Array");
  }
  if (armoredKeys) {
    const { type, data } = await unarmor(armoredKeys, config2);
    if (type !== enums_default.armor.privateKey) {
      throw new Error("Armored text not of type private key");
    }
    input = data;
  }
  const keys = [];
  const packetlist = await packetlist_default.fromBinary(input, allowedKeyPackets, config2);
  const keyIndex = packetlist.indexOfTag(enums_default.packet.publicKey, enums_default.packet.secretKey);
  for (let i = 0; i < keyIndex.length; i++) {
    if (packetlist[keyIndex[i]].constructor.tag === enums_default.packet.publicKey) {
      continue;
    }
    const oneKeyList = packetlist.slice(keyIndex[i], keyIndex[i + 1]);
    const newKey = new private_key_default(oneKeyList);
    keys.push(newKey);
  }
  if (keys.length === 0) {
    throw new Error("No secret key packet found");
  }
  return keys;
}

// vendor/src/openpgpjs/src/message.js
var allowedMessagePackets = /* @__PURE__ */ util_default.constructAllowedPackets([
  literal_data_default,
  compressed_data_default,
  aead_encrypted_data_default,
  sym_encrypted_integrity_protected_data_default,
  symmetrically_encrypted_data_default,
  public_key_encrypted_session_key_default,
  sym_encrypted_session_key_default,
  one_pass_signature_default,
  signature_default
]);
var allowedSymSessionKeyPackets = /* @__PURE__ */ util_default.constructAllowedPackets([sym_encrypted_session_key_default]);
var allowedDetachedSignaturePackets = /* @__PURE__ */ util_default.constructAllowedPackets([signature_default]);
var Message = class _Message {
  /**
   * @param {PacketList} packetlist - The packets that form this message
   */
  constructor(packetlist) {
    this.packets = packetlist || new packetlist_default();
  }
  /**
   * Returns the key IDs of the keys to which the session key is encrypted
   * @returns {Array<module:type/keyid~KeyID>} Array of keyID objects.
   */
  getEncryptionKeyIDs() {
    const keyIDs = [];
    const pkESKeyPacketlist = this.packets.filterByTag(enums_default.packet.publicKeyEncryptedSessionKey);
    pkESKeyPacketlist.forEach(function(packet) {
      keyIDs.push(packet.publicKeyID);
    });
    return keyIDs;
  }
  /**
   * Returns the key IDs of the keys that signed the message
   * @returns {Array<module:type/keyid~KeyID>} Array of keyID objects.
   */
  getSigningKeyIDs() {
    const msg = this.unwrapCompressed();
    const onePassSigList = msg.packets.filterByTag(enums_default.packet.onePassSignature);
    if (onePassSigList.length > 0) {
      return onePassSigList.map((packet) => packet.issuerKeyID);
    }
    const signatureList = msg.packets.filterByTag(enums_default.packet.signature);
    return signatureList.map((packet) => packet.issuerKeyID);
  }
  /**
   * Decrypt the message. Either a private key, a session key, or a password must be specified.
   * @param {Array<PrivateKey>} [decryptionKeys] - Private keys with decrypted secret data
   * @param {Array<String>} [passwords] - Passwords used to decrypt
   * @param {Array<Object>} [sessionKeys] - Session keys in the form: { data:Uint8Array, algorithm:String, [aeadAlgorithm:String] }
   * @param {Date} [date] - Use the given date for key verification instead of the current time
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Message>} New message with decrypted content.
   * @async
   */
  async decrypt(decryptionKeys, passwords, sessionKeys, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const symEncryptedPacketlist = this.packets.filterByTag(
      enums_default.packet.symmetricallyEncryptedData,
      enums_default.packet.symEncryptedIntegrityProtectedData,
      enums_default.packet.aeadEncryptedData
    );
    if (symEncryptedPacketlist.length === 0) {
      throw new Error("No encrypted data found");
    }
    const symEncryptedPacket = symEncryptedPacketlist[0];
    const expectedSymmetricAlgorithm = symEncryptedPacket.cipherAlgorithm;
    const sessionKeyObjects = sessionKeys || await this.decryptSessionKeys(decryptionKeys, passwords, expectedSymmetricAlgorithm, date, config2);
    let exception = null;
    const decryptedPromise = Promise.all(sessionKeyObjects.map(async ({ algorithm: algorithmName, data }) => {
      if (!util_default.isUint8Array(data) || !symEncryptedPacket.cipherAlgorithm && !util_default.isString(algorithmName)) {
        throw new Error("Invalid session key for decryption.");
      }
      try {
        const algo = symEncryptedPacket.cipherAlgorithm || enums_default.write(enums_default.symmetric, algorithmName);
        await symEncryptedPacket.decrypt(algo, data, config2);
      } catch (e) {
        util_default.printDebugError(e);
        exception = e;
      }
    }));
    cancel(symEncryptedPacket.encrypted);
    symEncryptedPacket.encrypted = null;
    await decryptedPromise;
    if (!symEncryptedPacket.packets || !symEncryptedPacket.packets.length) {
      throw exception || new Error("Decryption failed.");
    }
    const resultMsg = new _Message(symEncryptedPacket.packets);
    symEncryptedPacket.packets = new packetlist_default();
    return resultMsg;
  }
  /**
   * Decrypt encrypted session keys either with private keys or passwords.
   * @param {Array<PrivateKey>} [decryptionKeys] - Private keys with decrypted secret data
   * @param {Array<String>} [passwords] - Passwords used to decrypt
   * @param {enums.symmetric} [expectedSymmetricAlgorithm] - The symmetric algorithm the SEIPDv2 / AEAD packet is encrypted with (if applicable)
   * @param {Date} [date] - Use the given date for key verification, instead of current time
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Array<{
   *   data: Uint8Array,
   *   algorithm: String
   * }>>} array of object with potential sessionKey, algorithm pairs
   * @async
   */
  async decryptSessionKeys(decryptionKeys, passwords, expectedSymmetricAlgorithm, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    let decryptedSessionKeyPackets = [];
    let exception;
    if (passwords) {
      const skeskPackets = this.packets.filterByTag(enums_default.packet.symEncryptedSessionKey);
      if (skeskPackets.length === 0) {
        throw new Error("No symmetrically encrypted session key packet found.");
      }
      await Promise.all(passwords.map(async function(password, i) {
        let packets;
        if (i) {
          packets = await packetlist_default.fromBinary(skeskPackets.write(), allowedSymSessionKeyPackets, config2);
        } else {
          packets = skeskPackets;
        }
        await Promise.all(packets.map(async function(skeskPacket) {
          try {
            await skeskPacket.decrypt(password, config2);
            decryptedSessionKeyPackets.push(skeskPacket);
          } catch (err2) {
            util_default.printDebugError(err2);
            if (err2 instanceof Argon2OutOfMemoryError) {
              exception = err2;
            }
          }
        }));
      }));
    } else if (decryptionKeys) {
      const pkeskPackets = this.packets.filterByTag(enums_default.packet.publicKeyEncryptedSessionKey);
      if (pkeskPackets.length === 0) {
        throw new Error("No public key encrypted session key packet found.");
      }
      await Promise.all(pkeskPackets.map(async function(pkeskPacket) {
        await Promise.all(decryptionKeys.map(async function(decryptionKey) {
          let decryptionKeyPackets;
          try {
            decryptionKeyPackets = (await decryptionKey.getDecryptionKeys(pkeskPacket.publicKeyID, null, void 0, config2)).map((key) => key.keyPacket);
          } catch (err2) {
            exception = err2;
            return;
          }
          let algos = [
            enums_default.symmetric.aes256,
            // Old OpenPGP.js default fallback
            enums_default.symmetric.aes128,
            // RFC4880bis fallback
            enums_default.symmetric.tripledes,
            // RFC4880 fallback
            enums_default.symmetric.cast5
            // Golang OpenPGP fallback
          ];
          try {
            const selfCertification = await decryptionKey.getPrimarySelfSignature(date, void 0, config2);
            if (selfCertification.preferredSymmetricAlgorithms) {
              algos = algos.concat(selfCertification.preferredSymmetricAlgorithms);
            }
          } catch {
          }
          await Promise.all(decryptionKeyPackets.map(async function(decryptionKeyPacket) {
            if (!decryptionKeyPacket.isDecrypted()) {
              throw new Error("Decryption key is not decrypted.");
            }
            const doConstantTimeDecryption = config2.constantTimePKCS1Decryption && (pkeskPacket.publicKeyAlgorithm === enums_default.publicKey.rsaEncrypt || pkeskPacket.publicKeyAlgorithm === enums_default.publicKey.rsaEncryptSign || pkeskPacket.publicKeyAlgorithm === enums_default.publicKey.rsaSign || pkeskPacket.publicKeyAlgorithm === enums_default.publicKey.elgamal);
            if (doConstantTimeDecryption) {
              const serialisedPKESK = pkeskPacket.write();
              await Promise.all((expectedSymmetricAlgorithm ? [expectedSymmetricAlgorithm] : Array.from(config2.constantTimePKCS1DecryptionSupportedSymmetricAlgorithms)).map(async (sessionKeyAlgorithm) => {
                const pkeskPacketCopy = new public_key_encrypted_session_key_default();
                pkeskPacketCopy.read(serialisedPKESK);
                const randomSessionKey = {
                  sessionKeyAlgorithm,
                  sessionKey: generateSessionKey(sessionKeyAlgorithm)
                };
                try {
                  await pkeskPacketCopy.decrypt(decryptionKeyPacket, randomSessionKey);
                  decryptedSessionKeyPackets.push(pkeskPacketCopy);
                } catch (err2) {
                  util_default.printDebugError(err2);
                  exception = err2;
                }
              }));
            } else {
              try {
                await pkeskPacket.decrypt(decryptionKeyPacket);
                const symmetricAlgorithm = expectedSymmetricAlgorithm || pkeskPacket.sessionKeyAlgorithm;
                if (symmetricAlgorithm && !algos.includes(enums_default.write(enums_default.symmetric, symmetricAlgorithm))) {
                  throw new Error("A non-preferred symmetric algorithm was used.");
                }
                decryptedSessionKeyPackets.push(pkeskPacket);
              } catch (err2) {
                util_default.printDebugError(err2);
                exception = err2;
              }
            }
          }));
        }));
        cancel(pkeskPacket.encrypted);
        pkeskPacket.encrypted = null;
      }));
    } else {
      throw new Error("No key or password specified.");
    }
    if (decryptedSessionKeyPackets.length > 0) {
      if (decryptedSessionKeyPackets.length > 1) {
        const seen = /* @__PURE__ */ new Set();
        decryptedSessionKeyPackets = decryptedSessionKeyPackets.filter((item) => {
          const k = item.sessionKeyAlgorithm + util_default.uint8ArrayToString(item.sessionKey);
          if (seen.has(k)) {
            return false;
          }
          seen.add(k);
          return true;
        });
      }
      return decryptedSessionKeyPackets.map((packet) => ({
        data: packet.sessionKey,
        algorithm: packet.sessionKeyAlgorithm && enums_default.read(enums_default.symmetric, packet.sessionKeyAlgorithm)
      }));
    }
    throw exception || new Error("Session key decryption failed.");
  }
  /**
   * Get literal data that is the body of the message
   * @returns {(Uint8Array|null)} Literal body of the message as Uint8Array.
   */
  getLiteralData() {
    const msg = this.unwrapCompressed();
    const literal = msg.packets.findPacket(enums_default.packet.literalData);
    return literal && literal.getBytes() || null;
  }
  /**
   * Get filename from literal data packet
   * @returns {(String|null)} Filename of literal data packet as string.
   */
  getFilename() {
    const msg = this.unwrapCompressed();
    const literal = msg.packets.findPacket(enums_default.packet.literalData);
    return literal && literal.getFilename() || null;
  }
  /**
   * Get literal data as text
   * @returns {(String|null)} Literal body of the message interpreted as text.
   */
  getText() {
    const msg = this.unwrapCompressed();
    const literal = msg.packets.findPacket(enums_default.packet.literalData);
    if (literal) {
      return literal.getText();
    }
    return null;
  }
  /**
   * Generate a new session key object, taking the algorithm preferences of the passed encryption keys into account, if any.
   * @param {Array<PublicKey>} [encryptionKeys] - Public key(s) to select algorithm preferences for
   * @param {Date} [date] - Date to select algorithm preferences at
   * @param {Array<Object>} [userIDs] - User IDs to select algorithm preferences for
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<{ data: Uint8Array, algorithm: String, aeadAlgorithm: undefined|String }>} Object with session key data and algorithms.
   * @async
   */
  static async generateSessionKey(encryptionKeys = [], date = /* @__PURE__ */ new Date(), userIDs = [], config2 = config_default) {
    const { symmetricAlgo, aeadAlgo } = await getPreferredCipherSuite(encryptionKeys, date, userIDs, config2);
    const symmetricAlgoName = enums_default.read(enums_default.symmetric, symmetricAlgo);
    const aeadAlgoName = aeadAlgo ? enums_default.read(enums_default.aead, aeadAlgo) : void 0;
    await Promise.all(encryptionKeys.map(
      (key) => key.getEncryptionKey().catch(() => null).then((maybeKey) => {
        if (maybeKey && (maybeKey.keyPacket.algorithm === enums_default.publicKey.x25519 || maybeKey.keyPacket.algorithm === enums_default.publicKey.x448) && !aeadAlgoName && !util_default.isAES(symmetricAlgo)) {
          throw new Error("Could not generate a session key compatible with the given `encryptionKeys`: X22519 and X448 keys can only be used to encrypt AES session keys; change `config.preferredSymmetricAlgorithm` accordingly.");
        }
      })
    ));
    const sessionKeyData = generateSessionKey(symmetricAlgo);
    return { data: sessionKeyData, algorithm: symmetricAlgoName, aeadAlgorithm: aeadAlgoName };
  }
  /**
   * Encrypt the message either with public keys, passwords, or both at once.
   * @param {Array<PublicKey>} [encryptionKeys] - Public key(s) for message encryption
   * @param {Array<String>} [passwords] - Password(s) for message encryption
   * @param {Object} [sessionKey] - Session key in the form: { data:Uint8Array, algorithm:String, [aeadAlgorithm:String] }
   * @param {Boolean} [wildcard] - Use a key ID of 0 instead of the public key IDs
   * @param {Array<module:type/keyid~KeyID>} [encryptionKeyIDs] - Array of key IDs to use for encryption. Each encryptionKeyIDs[i] corresponds to keys[i]
   * @param {Date} [date] - Override the creation date of the literal package
   * @param {Array<Object>} [userIDs] - User IDs to encrypt for, e.g. [{ name:'Robert Receiver', email:'robert@openpgp.org' }]
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Message>} New message with encrypted content.
   * @async
   */
  async encrypt(encryptionKeys, passwords, sessionKey, wildcard = false, encryptionKeyIDs = [], date = /* @__PURE__ */ new Date(), userIDs = [], config2 = config_default) {
    if (sessionKey) {
      if (!util_default.isUint8Array(sessionKey.data) || !util_default.isString(sessionKey.algorithm)) {
        throw new Error("Invalid session key for encryption.");
      }
    } else if (encryptionKeys && encryptionKeys.length) {
      sessionKey = await _Message.generateSessionKey(encryptionKeys, date, userIDs, config2);
    } else if (passwords && passwords.length) {
      sessionKey = await _Message.generateSessionKey(void 0, void 0, void 0, config2);
    } else {
      throw new Error("No keys, passwords, or session key provided.");
    }
    const { data: sessionKeyData, algorithm: algorithmName, aeadAlgorithm: aeadAlgorithmName } = sessionKey;
    const msg = await _Message.encryptSessionKey(sessionKeyData, algorithmName, aeadAlgorithmName, encryptionKeys, passwords, wildcard, encryptionKeyIDs, date, userIDs, config2);
    const symEncryptedPacket = sym_encrypted_integrity_protected_data_default.fromObject({
      version: aeadAlgorithmName ? 2 : 1,
      aeadAlgorithm: aeadAlgorithmName ? enums_default.write(enums_default.aead, aeadAlgorithmName) : null
    });
    symEncryptedPacket.packets = this.packets;
    const algorithm = enums_default.write(enums_default.symmetric, algorithmName);
    await symEncryptedPacket.encrypt(algorithm, sessionKeyData, config2);
    msg.packets.push(symEncryptedPacket);
    symEncryptedPacket.packets = new packetlist_default();
    return msg;
  }
  /**
   * Encrypt a session key either with public keys, passwords, or both at once.
   * @param {Uint8Array} sessionKey - session key for encryption
   * @param {String} algorithmName - session key algorithm
   * @param {String} [aeadAlgorithmName] - AEAD algorithm, e.g. 'eax' or 'ocb'
   * @param {Array<PublicKey>} [encryptionKeys] - Public key(s) for message encryption
   * @param {Array<String>} [passwords] - For message encryption
   * @param {Boolean} [wildcard] - Use a key ID of 0 instead of the public key IDs
   * @param {Array<module:type/keyid~KeyID>} [encryptionKeyIDs] - Array of key IDs to use for encryption. Each encryptionKeyIDs[i] corresponds to encryptionKeys[i]
   * @param {Date} [date] - Override the date
   * @param {Array} [userIDs] - User IDs to encrypt for, e.g. [{ name:'Robert Receiver', email:'robert@openpgp.org' }]
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Message>} New message with encrypted content.
   * @async
   */
  static async encryptSessionKey(sessionKey, algorithmName, aeadAlgorithmName, encryptionKeys, passwords, wildcard = false, encryptionKeyIDs = [], date = /* @__PURE__ */ new Date(), userIDs = [], config2 = config_default) {
    const packetlist = new packetlist_default();
    const symmetricAlgorithm = enums_default.write(enums_default.symmetric, algorithmName);
    const aeadAlgorithm = aeadAlgorithmName && enums_default.write(enums_default.aead, aeadAlgorithmName);
    if (encryptionKeys) {
      const results = await Promise.all(encryptionKeys.map(async function(primaryKey, i) {
        const encryptionKey = await primaryKey.getEncryptionKey(encryptionKeyIDs[i], date, userIDs, config2);
        const pkESKeyPacket = public_key_encrypted_session_key_default.fromObject({
          version: aeadAlgorithm ? 6 : 3,
          encryptionKeyPacket: encryptionKey.keyPacket,
          anonymousRecipient: wildcard,
          sessionKey,
          sessionKeyAlgorithm: symmetricAlgorithm
        });
        await pkESKeyPacket.encrypt(encryptionKey.keyPacket);
        delete pkESKeyPacket.sessionKey;
        return pkESKeyPacket;
      }));
      packetlist.push(...results);
    }
    if (passwords) {
      const testDecrypt = async function(keyPacket, password) {
        try {
          await keyPacket.decrypt(password, config2);
          return 1;
        } catch {
          return 0;
        }
      };
      const sum = (accumulator, currentValue) => accumulator + currentValue;
      const encryptPassword = async function(sessionKey2, algorithm, aeadAlgorithm2, password) {
        const symEncryptedSessionKeyPacket = new sym_encrypted_session_key_default(config2);
        symEncryptedSessionKeyPacket.sessionKey = sessionKey2;
        symEncryptedSessionKeyPacket.sessionKeyAlgorithm = algorithm;
        if (aeadAlgorithm2) {
          symEncryptedSessionKeyPacket.aeadAlgorithm = aeadAlgorithm2;
        }
        await symEncryptedSessionKeyPacket.encrypt(password, config2);
        if (config2.passwordCollisionCheck) {
          const results2 = await Promise.all(passwords.map((pwd) => testDecrypt(symEncryptedSessionKeyPacket, pwd)));
          if (results2.reduce(sum) !== 1) {
            return encryptPassword(sessionKey2, algorithm, password);
          }
        }
        delete symEncryptedSessionKeyPacket.sessionKey;
        return symEncryptedSessionKeyPacket;
      };
      const results = await Promise.all(passwords.map((pwd) => encryptPassword(sessionKey, symmetricAlgorithm, aeadAlgorithm, pwd)));
      packetlist.push(...results);
    }
    return new _Message(packetlist);
  }
  /**
   * Sign the message (the literal data packet of the message)
   * @param {Array<PrivateKey>} signingKeys - private keys with decrypted secret key data for signing
   * @param {Array<Key>} recipientKeys - recipient keys to get the signing preferences from
   * @param {Signature} [signature] - Any existing detached signature to add to the message
   * @param {Array<module:type/keyid~KeyID>} [signingKeyIDs] - Array of key IDs to use for signing. Each signingKeyIDs[i] corresponds to signingKeys[i]
   * @param {Date} [date] - Override the creation time of the signature
   * @param {Array<UserID>} [signingUserIDs] - User IDs to sign with, e.g. [{ name:'Steve Sender', email:'steve@openpgp.org' }]
   * @param {Array<UserID>} [recipientUserIDs] - User IDs associated with `recipientKeys` to get the signing preferences from
   * @param {Array} [notations] - Notation Data to add to the signatures, e.g. [{ name: 'test@example.org', value: new TextEncoder().encode('test'), humanReadable: true, critical: false }]
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Message>} New message with signed content.
   * @async
   */
  async sign(signingKeys = [], recipientKeys = [], signature = null, signingKeyIDs = [], date = /* @__PURE__ */ new Date(), signingUserIDs = [], recipientUserIDs = [], notations = [], config2 = config_default) {
    const packetlist = new packetlist_default();
    const literalDataPacket = this.packets.findPacket(enums_default.packet.literalData);
    if (!literalDataPacket) {
      throw new Error("No literal data packet to sign.");
    }
    const signaturePackets = await createSignaturePackets(literalDataPacket, signingKeys, recipientKeys, signature, signingKeyIDs, date, signingUserIDs, recipientUserIDs, notations, false, config2);
    const onePassSignaturePackets = signaturePackets.map(
      (signaturePacket, i) => one_pass_signature_default.fromSignaturePacket(signaturePacket, i === 0)
    ).reverse();
    packetlist.push(...onePassSignaturePackets);
    packetlist.push(literalDataPacket);
    packetlist.push(...signaturePackets);
    return new _Message(packetlist);
  }
  /**
   * Compresses the message (the literal and -if signed- signature data packets of the message)
   * @param {module:enums.compression} algo - compression algorithm
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Message} New message with compressed content.
   */
  compress(algo, config2 = config_default) {
    if (algo === enums_default.compression.uncompressed) {
      return this;
    }
    const compressed = new compressed_data_default(config2);
    compressed.algorithm = algo;
    compressed.packets = this.packets;
    const packetList = new packetlist_default();
    packetList.push(compressed);
    return new _Message(packetList);
  }
  /**
   * Create a detached signature for the message (the literal data packet of the message)
   * @param {Array<PrivateKey>} signingKeys - private keys with decrypted secret key data for signing
   * @param {Array<Key>} recipientKeys - recipient keys to get the signing preferences from
   * @param {Signature} [signature] - Any existing detached signature
   * @param {Array<module:type/keyid~KeyID>} [signingKeyIDs] - Array of key IDs to use for signing. Each signingKeyIDs[i] corresponds to signingKeys[i]
   * @param {Date} [date] - Override the creation time of the signature
   * @param {Array<UserID>} [signingUserIDs] - User IDs to sign with, e.g. [{ name:'Steve Sender', email:'steve@openpgp.org' }]
   * @param {Array<UserID>} [recipientUserIDs] - User IDs associated with `recipientKeys` to get the signing preferences from
   * @param {Array} [notations] - Notation Data to add to the signatures, e.g. [{ name: 'test@example.org', value: new TextEncoder().encode('test'), humanReadable: true, critical: false }]
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Signature>} New detached signature of message content.
   * @async
   */
  async signDetached(signingKeys = [], recipientKeys = [], signature = null, signingKeyIDs = [], date = /* @__PURE__ */ new Date(), signingUserIDs = [], recipientUserIDs = [], notations = [], config2 = config_default) {
    const literalDataPacket = this.packets.findPacket(enums_default.packet.literalData);
    if (!literalDataPacket) {
      throw new Error("No literal data packet to sign.");
    }
    return new Signature(await createSignaturePackets(literalDataPacket, signingKeys, recipientKeys, signature, signingKeyIDs, date, signingUserIDs, recipientUserIDs, notations, true, config2));
  }
  /**
   * Verify message signatures
   * @param {Array<PublicKey>} verificationKeys - Array of public keys to verify signatures
   * @param {Date} [date] - Verify the signature against the given date, i.e. check signature creation time < date < expiration time
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Array<{
   *   keyID: module:type/keyid~KeyID,
   *   signature: Promise<Signature>,
   *   verified: Promise<true>
   * }>>} List of signer's keyID and validity of signatures.
   * @async
   */
  async verify(verificationKeys, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const msg = this.unwrapCompressed();
    const literalDataList = msg.packets.filterByTag(enums_default.packet.literalData);
    if (literalDataList.length !== 1) {
      throw new Error("Can only verify message with one literal data packet.");
    }
    let packets = msg.packets;
    if (isArrayStream(packets.stream)) {
      packets = packets.concat(await readToEnd(packets.stream, (_) => _ || []));
    }
    const onePassSigList = packets.filterByTag(enums_default.packet.onePassSignature).reverse();
    const signatureList = packets.filterByTag(enums_default.packet.signature);
    if (onePassSigList.length && !signatureList.length && util_default.isStream(packets.stream) && !isArrayStream(packets.stream)) {
      await Promise.all(onePassSigList.map(async (onePassSig) => {
        onePassSig.correspondingSig = new Promise((resolve, reject) => {
          onePassSig.correspondingSigResolve = resolve;
          onePassSig.correspondingSigReject = reject;
        });
        onePassSig.signatureData = fromAsync(async () => (await onePassSig.correspondingSig).signatureData);
        onePassSig.hashed = readToEnd(await onePassSig.hash(onePassSig.signatureType, literalDataList[0], void 0, false));
        onePassSig.hashed.catch(() => {
        });
      }));
      packets.stream = transformPair(packets.stream, async (readable, writable) => {
        const reader = getReader(readable);
        const writer = getWriter(writable);
        try {
          for (let i = 0; i < onePassSigList.length; i++) {
            const { value: signature } = await reader.read();
            onePassSigList[i].correspondingSigResolve(signature);
          }
          await reader.readToEnd();
          await writer.ready;
          await writer.close();
        } catch (e) {
          onePassSigList.forEach((onePassSig) => {
            onePassSig.correspondingSigReject(e);
          });
          await writer.abort(e);
        }
      });
      return createVerificationObjects(onePassSigList, literalDataList, verificationKeys, date, false, config2);
    }
    return createVerificationObjects(signatureList, literalDataList, verificationKeys, date, false, config2);
  }
  /**
   * Verify detached message signature
   * @param {Array<PublicKey>} verificationKeys - Array of public keys to verify signatures
   * @param {Signature} signature
   * @param {Date} date - Verify the signature against the given date, i.e. check signature creation time < date < expiration time
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Array<{
   *   keyID: module:type/keyid~KeyID,
   *   signature: Promise<Signature>,
   *   verified: Promise<true>
   * }>>} List of signer's keyID and validity of signature.
   * @async needed to avoid breaking change until next major release
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyDetached(signature, verificationKeys, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const msg = this.unwrapCompressed();
    const literalDataList = msg.packets.filterByTag(enums_default.packet.literalData);
    if (literalDataList.length !== 1) {
      throw new Error("Can only verify message with one literal data packet.");
    }
    const signatureList = signature.packets.filterByTag(enums_default.packet.signature);
    return createVerificationObjects(signatureList, literalDataList, verificationKeys, date, true, config2);
  }
  /**
   * Unwrap compressed message
   * @returns {Message} Message Content of compressed message.
   */
  unwrapCompressed() {
    const compressed = this.packets.filterByTag(enums_default.packet.compressedData);
    if (compressed.length) {
      return new _Message(compressed[0].packets);
    }
    return this;
  }
  /**
   * Append signature to unencrypted message object
   * @param {String|Uint8Array} detachedSignature - The detached ASCII-armored or Uint8Array PGP signature
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   */
  async appendSignature(detachedSignature, config2 = config_default) {
    await this.packets.read(
      util_default.isUint8Array(detachedSignature) ? detachedSignature : (await unarmor(detachedSignature)).data,
      allowedDetachedSignaturePackets,
      config2
    );
  }
  /**
   * Returns binary encoded message
   * @returns {ReadableStream<Uint8Array>} Binary message.
   */
  write() {
    return this.packets.write();
  }
  /**
   * Returns ASCII armored text of message
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {ReadableStream<String>} ASCII armor.
   */
  armor(config2 = config_default) {
    const trailingPacket = this.packets[this.packets.length - 1];
    const emitChecksum = trailingPacket.constructor.tag === sym_encrypted_integrity_protected_data_default.tag ? trailingPacket.version !== 2 : this.packets.some((packet) => packet.constructor.tag === signature_default.tag && packet.version !== 6);
    return armor(enums_default.armor.message, this.write(), null, null, null, emitChecksum, config2);
  }
};
async function createSignaturePackets(literalDataPacket, signingKeys, recipientKeys = [], signature = null, signingKeyIDs = [], date = /* @__PURE__ */ new Date(), signingUserIDs = [], recipientUserIDs = [], notations = [], detached = false, config2 = config_default) {
  const packetlist = new packetlist_default();
  const signatureType = literalDataPacket.text === null ? enums_default.signature.binary : enums_default.signature.text;
  await Promise.all(signingKeys.map(async (primaryKey, i) => {
    const signingUserID = signingUserIDs[i];
    if (!primaryKey.isPrivate()) {
      throw new Error("Need private key for signing");
    }
    const signingKey = await primaryKey.getSigningKey(signingKeyIDs[i], date, signingUserID, config2);
    return createSignaturePacket(literalDataPacket, recipientKeys.length ? recipientKeys : [primaryKey], signingKey.keyPacket, { signatureType }, date, recipientUserIDs, notations, detached, config2);
  })).then((signatureList) => {
    packetlist.push(...signatureList);
  });
  if (signature) {
    const existingSigPacketlist = signature.packets.filterByTag(enums_default.packet.signature);
    packetlist.push(...existingSigPacketlist);
  }
  return packetlist;
}
function createVerificationObject(signature, literalDataList, verificationKeys, date = /* @__PURE__ */ new Date(), detached = false, config2 = config_default) {
  let primaryKey;
  let unverifiedSigningKey;
  for (const key of verificationKeys) {
    const issuerKeys = key.getKeys(signature.issuerKeyID);
    if (issuerKeys.length > 0) {
      primaryKey = key;
      unverifiedSigningKey = issuerKeys[0];
      break;
    }
  }
  const isOnePassSignature = signature instanceof one_pass_signature_default;
  const signaturePacketPromise = isOnePassSignature ? signature.correspondingSig : signature;
  const verifiedSig = {
    keyID: signature.issuerKeyID,
    verified: (async () => {
      if (!unverifiedSigningKey) {
        throw new Error(`Could not find signing key with key ID ${signature.issuerKeyID.toHex()}`);
      }
      await signature.verify(unverifiedSigningKey.keyPacket, signature.signatureType, literalDataList[0], date, detached, config2);
      const signaturePacket = await signaturePacketPromise;
      if (unverifiedSigningKey.getCreationTime() > signaturePacket.created) {
        throw new Error("Key is newer than the signature");
      }
      try {
        await primaryKey.getSigningKey(unverifiedSigningKey.getKeyID(), signaturePacket.created, void 0, config2);
      } catch (e) {
        if (config2.allowInsecureVerificationWithReformattedKeys && e.message.match(/Signature creation time is in the future/)) {
          await primaryKey.getSigningKey(unverifiedSigningKey.getKeyID(), date, void 0, config2);
        } else {
          throw e;
        }
      }
      return true;
    })(),
    signature: (async () => {
      const signaturePacket = await signaturePacketPromise;
      const packetlist = new packetlist_default();
      signaturePacket && packetlist.push(signaturePacket);
      return new Signature(packetlist);
    })()
  };
  verifiedSig.signature.catch(() => {
  });
  verifiedSig.verified.catch(() => {
  });
  return verifiedSig;
}
function createVerificationObjects(signatureList, literalDataList, verificationKeys, date = /* @__PURE__ */ new Date(), detached = false, config2 = config_default) {
  return signatureList.filter((signature) => ["text", "binary"].includes(enums_default.read(enums_default.signature, signature.signatureType))).map((signature) => createVerificationObject(signature, literalDataList, verificationKeys, date, detached, config2));
}
async function readMessage({ armoredMessage, binaryMessage, config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  let input = armoredMessage || binaryMessage;
  if (!input) {
    throw new Error("readMessage: must pass options object containing `armoredMessage` or `binaryMessage`");
  }
  if (armoredMessage && !util_default.isString(armoredMessage) && !util_default.isStream(armoredMessage)) {
    throw new Error("readMessage: options.armoredMessage must be a string or stream");
  }
  if (binaryMessage && !util_default.isUint8Array(binaryMessage) && !util_default.isStream(binaryMessage)) {
    throw new Error("readMessage: options.binaryMessage must be a Uint8Array or stream");
  }
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  const streamType = util_default.isStream(input);
  if (armoredMessage) {
    const { type, data } = await unarmor(input, config2);
    if (type !== enums_default.armor.message) {
      throw new Error("Armored text not of type message");
    }
    input = data;
  }
  const packetlist = await packetlist_default.fromBinary(input, allowedMessagePackets, config2, new MessageGrammarValidator());
  const message = new Message(packetlist);
  message.fromStream = streamType;
  return message;
}
async function createMessage({ text, binary, filename, date = /* @__PURE__ */ new Date(), format = text !== void 0 ? "utf8" : "binary", ...rest }) {
  const input = text !== void 0 ? text : binary;
  if (input === void 0) {
    throw new Error("createMessage: must pass options object containing `text` or `binary`");
  }
  if (text && !util_default.isString(text) && !util_default.isStream(text)) {
    throw new Error("createMessage: options.text must be a string or stream");
  }
  if (binary && !util_default.isUint8Array(binary) && !util_default.isStream(binary)) {
    throw new Error("createMessage: options.binary must be a Uint8Array or stream");
  }
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  const streamType = util_default.isStream(input);
  const literalDataPacket = new literal_data_default(date);
  if (text !== void 0) {
    literalDataPacket.setText(input, enums_default.write(enums_default.literal, format));
  } else {
    literalDataPacket.setBytes(input, enums_default.write(enums_default.literal, format));
  }
  if (filename !== void 0) {
    literalDataPacket.setFilename(filename);
  }
  const literalDataPacketlist = new packetlist_default();
  literalDataPacketlist.push(literalDataPacket);
  const message = new Message(literalDataPacketlist);
  message.fromStream = streamType;
  return message;
}

// vendor/src/openpgpjs/src/cleartext.js
var allowedPackets6 = /* @__PURE__ */ util_default.constructAllowedPackets([signature_default]);
var CleartextMessage = class _CleartextMessage {
  /**
   * @param {String} text - The cleartext of the signed message
   * @param {Signature} signature - The detached signature or an empty signature for unsigned messages
   */
  constructor(text, signature) {
    this.text = util_default.removeTrailingSpaces(text).replace(/\r?\n/g, "\r\n");
    if (signature && !(signature instanceof Signature)) {
      throw new Error("Invalid signature input");
    }
    this.signature = signature || new Signature(new packetlist_default());
  }
  /**
   * Returns the key IDs of the keys that signed the cleartext message
   * @returns {Array<module:type/keyid~KeyID>} Array of keyID objects.
   */
  getSigningKeyIDs() {
    const keyIDs = [];
    const signatureList = this.signature.packets;
    signatureList.forEach(function(packet) {
      keyIDs.push(packet.issuerKeyID);
    });
    return keyIDs;
  }
  /**
   * Sign the cleartext message
   * @param {Array<Key>} signingKeys - private keys with decrypted secret key data for signing
   * @param {Array<Key>} recipientKeys - recipient keys to get the signing preferences from
   * @param {Signature} [signature] - Any existing detached signature
   * @param {Array<module:type/keyid~KeyID>} [signingKeyIDs] - Array of key IDs to use for signing. Each signingKeyIDs[i] corresponds to privateKeys[i]
   * @param {Date} [date] - The creation time of the signature that should be created
   * @param {Array} [signingKeyIDs] - User IDs to sign with, e.g. [{ name:'Steve Sender', email:'steve@openpgp.org' }]
   * @param {Array} [recipientUserIDs] - User IDs associated with `recipientKeys` to get the signing preferences from
   * @param {Array} [notations] - Notation Data to add to the signatures, e.g. [{ name: 'test@example.org', value: new TextEncoder().encode('test'), humanReadable: true, critical: false }]
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<CleartextMessage>} New cleartext message with signed content.
   * @async
   */
  async sign(signingKeys, recipientKeys = [], signature = null, signingKeyIDs = [], date = /* @__PURE__ */ new Date(), signingUserIDs = [], recipientUserIDs = [], notations = [], config2 = config_default) {
    const literalDataPacket = new literal_data_default();
    literalDataPacket.setText(this.text);
    const newSignature = new Signature(await createSignaturePackets(literalDataPacket, signingKeys, recipientKeys, signature, signingKeyIDs, date, signingUserIDs, recipientUserIDs, notations, true, config2));
    return new _CleartextMessage(this.text, newSignature);
  }
  /**
   * Verify signatures of cleartext signed message
   * @param {Array<Key>} keys - Array of keys to verify signatures
   * @param {Date} [date] - Verify the signature against the given date, i.e. check signature creation time < date < expiration time
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Array<{
   *   keyID: module:type/keyid~KeyID,
   *   signature: Promise<Signature>,
   *   verified: Promise<true>
   * }>>} List of signer's keyID and validity of signature.
   * @async
   */
  verify(keys, date = /* @__PURE__ */ new Date(), config2 = config_default) {
    const signatureList = this.signature.packets.filterByTag(enums_default.packet.signature);
    const literalDataPacket = new literal_data_default();
    literalDataPacket.setText(this.text);
    return createVerificationObjects(signatureList, [literalDataPacket], keys, date, true, config2);
  }
  /**
   * Get cleartext
   * @returns {String} Cleartext of message.
   */
  getText() {
    return this.text.replace(/\r\n/g, "\n");
  }
  /**
   * Returns ASCII armored text of cleartext signed message
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {String | ReadableStream<String>} ASCII armor.
   */
  armor(config2 = config_default) {
    const emitHeaderAndChecksum = this.signature.packets.some((packet) => packet.version !== 6);
    const hash = emitHeaderAndChecksum ? Array.from(new Set(this.signature.packets.map(
      (packet) => enums_default.read(enums_default.hash, packet.hashAlgorithm).toUpperCase()
    ))).join() : null;
    const body = {
      hash,
      text: this.text,
      data: this.signature.packets.write()
    };
    return armor(enums_default.armor.signed, body, void 0, void 0, void 0, emitHeaderAndChecksum, config2);
  }
};
async function readCleartextMessage({ cleartextMessage, config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  if (!cleartextMessage) {
    throw new Error("readCleartextMessage: must pass options object containing `cleartextMessage`");
  }
  if (!util_default.isString(cleartextMessage)) {
    throw new Error("readCleartextMessage: options.cleartextMessage must be a string");
  }
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  const input = await unarmor(cleartextMessage);
  if (input.type !== enums_default.armor.signed) {
    throw new Error("No cleartext signed message.");
  }
  const packetlist = await packetlist_default.fromBinary(input.data, allowedPackets6, config2);
  verifyHeaders2(input.headers, packetlist);
  const signature = new Signature(packetlist);
  return new CleartextMessage(input.text, signature);
}
function verifyHeaders2(headers, packetlist) {
  const checkHashAlgos = function(hashAlgos2) {
    const check = (packet) => (algo) => packet.hashAlgorithm === algo;
    for (let i = 0; i < packetlist.length; i++) {
      if (packetlist[i].constructor.tag === enums_default.packet.signature && !hashAlgos2.some(check(packetlist[i]))) {
        return false;
      }
    }
    return true;
  };
  const hashAlgos = [];
  headers.forEach((header) => {
    const hashHeader = header.match(/^Hash: (.+)$/);
    if (hashHeader) {
      const parsedHashIDs = hashHeader[1].replace(/\s/g, "").split(",").map((hashName) => {
        try {
          return enums_default.write(enums_default.hash, hashName.toLowerCase());
        } catch {
          throw new Error("Unknown hash algorithm in armor header: " + hashName.toLowerCase());
        }
      });
      hashAlgos.push(...parsedHashIDs);
    } else {
      throw new Error('Only "Hash" header allowed in cleartext signed message');
    }
  });
  if (hashAlgos.length && !checkHashAlgos(hashAlgos)) {
    throw new Error("Hash algorithm mismatch in armor header and signature");
  }
}
async function createCleartextMessage({ text, ...rest }) {
  if (!text) {
    throw new Error("createCleartextMessage: must pass options object containing `text`");
  }
  if (!util_default.isString(text)) {
    throw new Error("createCleartextMessage: options.text must be a string");
  }
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  return new CleartextMessage(text);
}

// vendor/src/openpgpjs/src/openpgp.js
async function generateKey({ userIDs = [], passphrase, type, curve, rsaBits = 4096, keyExpirationTime = 0, date = /* @__PURE__ */ new Date(), subkeys = [{}], format = "armored", signatureNotations = [], config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  checkConfig(config2);
  if (!type && !curve) {
    type = config2.v6Keys ? "curve25519" : "ecc";
    curve = "curve25519Legacy";
  } else {
    type = type || "ecc";
    curve = curve || "curve25519Legacy";
  }
  userIDs = toArray(userIDs);
  signatureNotations = toArray(signatureNotations);
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  if (userIDs.length === 0 && !config2.v6Keys) {
    throw new Error("UserIDs are required for V4 keys");
  }
  if (type === "rsa" && rsaBits < config2.minRSABits) {
    throw new Error(`rsaBits should be at least ${config2.minRSABits}, got: ${rsaBits}`);
  }
  const options = { userIDs, passphrase, type, rsaBits, curve, keyExpirationTime, date, subkeys, signatureNotations };
  try {
    const { key, revocationCertificate } = await generate5(options, config2);
    key.getKeys().forEach(({ keyPacket }) => checkKeyRequirements(keyPacket, config2));
    return {
      privateKey: formatObject(key, format, config2),
      publicKey: formatObject(key.toPublic(), format, config2),
      revocationCertificate
    };
  } catch (err2) {
    throw util_default.wrapError("Error generating keypair", err2);
  }
}
async function reformatKey({ privateKey, userIDs = [], passphrase, keyExpirationTime = 0, date, format = "armored", signatureNotations = [], config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  checkConfig(config2);
  userIDs = toArray(userIDs);
  signatureNotations = toArray(signatureNotations);
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  if (userIDs.length === 0 && privateKey.keyPacket.version !== 6) {
    throw new Error("UserIDs are required for V4 keys");
  }
  const options = { privateKey, userIDs, passphrase, keyExpirationTime, date, signatureNotations };
  try {
    const { key: reformattedKey, revocationCertificate } = await reformat(options, config2);
    return {
      privateKey: formatObject(reformattedKey, format, config2),
      publicKey: formatObject(reformattedKey.toPublic(), format, config2),
      revocationCertificate
    };
  } catch (err2) {
    throw util_default.wrapError("Error reformatting keypair", err2);
  }
}
async function revokeKey({ key, revocationCertificate, reasonForRevocation, date = /* @__PURE__ */ new Date(), format = "armored", config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  checkConfig(config2);
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  try {
    const revokedKey = revocationCertificate ? await key.applyRevocationCertificate(revocationCertificate, date, config2) : await key.revoke(reasonForRevocation, date, config2);
    return revokedKey.isPrivate() ? {
      privateKey: formatObject(revokedKey, format, config2),
      publicKey: formatObject(revokedKey.toPublic(), format, config2)
    } : {
      privateKey: null,
      publicKey: formatObject(revokedKey, format, config2)
    };
  } catch (err2) {
    throw util_default.wrapError("Error revoking key", err2);
  }
}
async function decryptKey({ privateKey, passphrase, config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  checkConfig(config2);
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  if (!privateKey.isPrivate()) {
    throw new Error("Cannot decrypt a public key");
  }
  const clonedPrivateKey = privateKey.clone(true);
  const passphrases = util_default.isArray(passphrase) ? passphrase : [passphrase];
  try {
    await Promise.all(clonedPrivateKey.getKeys().map((key) => (
      // try to decrypt each key with any of the given passphrases
      util_default.anyPromise(passphrases.map((passphrase2) => key.keyPacket.decrypt(passphrase2, config2)))
    )));
    await clonedPrivateKey.validate(config2);
    return clonedPrivateKey;
  } catch (err2) {
    clonedPrivateKey.clearPrivateParams();
    throw util_default.wrapError("Error decrypting private key", err2);
  }
}
async function encryptKey({ privateKey, passphrase, config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  checkConfig(config2);
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  if (!privateKey.isPrivate()) {
    throw new Error("Cannot encrypt a public key");
  }
  const clonedPrivateKey = privateKey.clone(true);
  const keys = clonedPrivateKey.getKeys();
  const passphrases = util_default.isArray(passphrase) ? passphrase : new Array(keys.length).fill(passphrase);
  if (passphrases.length !== keys.length) {
    throw new Error("Invalid number of passphrases given for key encryption");
  }
  try {
    await Promise.all(keys.map(async (key, i) => {
      const { keyPacket } = key;
      await keyPacket.encrypt(passphrases[i], config2);
      keyPacket.clearPrivateParams();
    }));
    return clonedPrivateKey;
  } catch (err2) {
    clonedPrivateKey.clearPrivateParams();
    throw util_default.wrapError("Error encrypting private key", err2);
  }
}
async function encrypt7({ message, encryptionKeys, signingKeys, passwords, sessionKey, format = "armored", signature = null, wildcard = false, signingKeyIDs = [], encryptionKeyIDs = [], date = /* @__PURE__ */ new Date(), signingUserIDs = [], encryptionUserIDs = [], signatureNotations = [], config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  checkConfig(config2);
  checkMessage(message);
  checkOutputMessageFormat(format);
  encryptionKeys = toArray(encryptionKeys);
  signingKeys = toArray(signingKeys);
  passwords = toArray(passwords);
  signingKeyIDs = toArray(signingKeyIDs);
  encryptionKeyIDs = toArray(encryptionKeyIDs);
  signingUserIDs = toArray(signingUserIDs);
  encryptionUserIDs = toArray(encryptionUserIDs);
  signatureNotations = toArray(signatureNotations);
  if (rest.detached) {
    throw new Error("The `detached` option has been removed from openpgp.encrypt, separately call openpgp.sign instead. Don't forget to remove the `privateKeys` option as well.");
  }
  if (rest.publicKeys) throw new Error("The `publicKeys` option has been removed from openpgp.encrypt, pass `encryptionKeys` instead");
  if (rest.privateKeys) throw new Error("The `privateKeys` option has been removed from openpgp.encrypt, pass `signingKeys` instead");
  if (rest.armor !== void 0) throw new Error("The `armor` option has been removed from openpgp.encrypt, pass `format` instead.");
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  if (!signingKeys) {
    signingKeys = [];
  }
  try {
    if (signingKeys.length || signature) {
      message = await message.sign(signingKeys, encryptionKeys, signature, signingKeyIDs, date, signingUserIDs, encryptionKeyIDs, signatureNotations, config2);
    }
    message = message.compress(
      await getPreferredCompressionAlgo(encryptionKeys, date, encryptionUserIDs, config2),
      config2
    );
    message = await message.encrypt(encryptionKeys, passwords, sessionKey, wildcard, encryptionKeyIDs, date, encryptionUserIDs, config2);
    if (format === "object") return message;
    const armor2 = format === "armored";
    const data = armor2 ? message.armor(config2) : message.write();
    return await convertStream(data);
  } catch (err2) {
    throw util_default.wrapError("Error encrypting message", err2);
  }
}
async function decrypt7({ message, decryptionKeys, passwords, sessionKeys, verificationKeys, expectSigned = false, format = "utf8", signature = null, date = /* @__PURE__ */ new Date(), config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  checkConfig(config2);
  checkMessage(message);
  verificationKeys = toArray(verificationKeys);
  decryptionKeys = toArray(decryptionKeys);
  passwords = toArray(passwords);
  sessionKeys = toArray(sessionKeys);
  if (rest.privateKeys) throw new Error("The `privateKeys` option has been removed from openpgp.decrypt, pass `decryptionKeys` instead");
  if (rest.publicKeys) throw new Error("The `publicKeys` option has been removed from openpgp.decrypt, pass `verificationKeys` instead");
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  try {
    const decrypted = await message.decrypt(decryptionKeys, passwords, sessionKeys, date, config2);
    if (!verificationKeys) {
      verificationKeys = [];
    }
    const result = {};
    result.signatures = signature ? await decrypted.verifyDetached(signature, verificationKeys, date, config2) : await decrypted.verify(verificationKeys, date, config2);
    result.data = format === "binary" ? decrypted.getLiteralData() : decrypted.getText();
    result.filename = decrypted.getFilename();
    linkStreams(result, message, .../* @__PURE__ */ new Set([decrypted, decrypted.unwrapCompressed()]));
    if (expectSigned) {
      if (verificationKeys.length === 0) {
        throw new Error("Verification keys are required to verify message signatures");
      }
      if (result.signatures.length === 0) {
        throw new Error("Message is not signed");
      }
      result.data = concat([
        result.data,
        fromAsync(async () => {
          await util_default.anyPromise(result.signatures.map((sig) => sig.verified));
          return format === "binary" ? new Uint8Array() : "";
        })
      ]);
    }
    result.data = await convertStream(result.data);
    return result;
  } catch (err2) {
    throw util_default.wrapError("Error decrypting message", err2);
  }
}
async function sign7({ message, signingKeys, recipientKeys = [], format = "armored", detached = false, signingKeyIDs = [], date = /* @__PURE__ */ new Date(), signingUserIDs = [], recipientUserIDs = [], signatureNotations = [], config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  checkConfig(config2);
  checkCleartextOrMessage(message);
  checkOutputMessageFormat(format);
  signingKeys = toArray(signingKeys);
  signingKeyIDs = toArray(signingKeyIDs);
  signingUserIDs = toArray(signingUserIDs);
  recipientKeys = toArray(recipientKeys);
  recipientUserIDs = toArray(recipientUserIDs);
  signatureNotations = toArray(signatureNotations);
  if (rest.privateKeys) throw new Error("The `privateKeys` option has been removed from openpgp.sign, pass `signingKeys` instead");
  if (rest.armor !== void 0) throw new Error("The `armor` option has been removed from openpgp.sign, pass `format` instead.");
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  if (message instanceof CleartextMessage && format === "binary") throw new Error("Cannot return signed cleartext message in binary format");
  if (message instanceof CleartextMessage && detached) throw new Error("Cannot detach-sign a cleartext message");
  if (!signingKeys || signingKeys.length === 0) {
    throw new Error("No signing keys provided");
  }
  try {
    let signature;
    if (detached) {
      signature = await message.signDetached(signingKeys, recipientKeys, void 0, signingKeyIDs, date, signingUserIDs, recipientUserIDs, signatureNotations, config2);
    } else {
      signature = await message.sign(signingKeys, recipientKeys, void 0, signingKeyIDs, date, signingUserIDs, recipientUserIDs, signatureNotations, config2);
    }
    if (format === "object") return signature;
    const armor2 = format === "armored";
    signature = armor2 ? signature.armor(config2) : signature.write();
    if (detached) {
      signature = transformPair(message.packets.write(), async (readable, writable) => {
        await Promise.all([
          pipe(signature, writable),
          readToEnd(readable).catch(() => {
          })
        ]);
      });
    }
    return await convertStream(signature);
  } catch (err2) {
    throw util_default.wrapError("Error signing message", err2);
  }
}
async function verify7({ message, verificationKeys, expectSigned = false, format = "utf8", signature = null, date = /* @__PURE__ */ new Date(), config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  checkConfig(config2);
  checkCleartextOrMessage(message);
  verificationKeys = toArray(verificationKeys);
  if (rest.publicKeys) throw new Error("The `publicKeys` option has been removed from openpgp.verify, pass `verificationKeys` instead");
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  if (message instanceof CleartextMessage && format === "binary") throw new Error("Can't return cleartext message data as binary");
  if (message instanceof CleartextMessage && signature) throw new Error("Can't verify detached cleartext signature");
  try {
    const result = {};
    if (signature) {
      result.signatures = await message.verifyDetached(signature, verificationKeys, date, config2);
    } else {
      result.signatures = await message.verify(verificationKeys, date, config2);
    }
    result.data = format === "binary" ? message.getLiteralData() : message.getText();
    if (message.fromStream && !signature) {
      linkStreams(result, .../* @__PURE__ */ new Set([message, message.unwrapCompressed()]));
    }
    if (expectSigned) {
      if (result.signatures.length === 0) {
        throw new Error("Message is not signed");
      }
      result.data = concat([
        result.data,
        fromAsync(async () => {
          await util_default.anyPromise(result.signatures.map((sig) => sig.verified));
          return format === "binary" ? new Uint8Array() : "";
        })
      ]);
    }
    result.data = await convertStream(result.data);
    return result;
  } catch (err2) {
    throw util_default.wrapError("Error verifying signed message", err2);
  }
}
async function generateSessionKey2({ encryptionKeys, date = /* @__PURE__ */ new Date(), encryptionUserIDs = [], config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  checkConfig(config2);
  encryptionKeys = toArray(encryptionKeys);
  encryptionUserIDs = toArray(encryptionUserIDs);
  if (rest.publicKeys) throw new Error("The `publicKeys` option has been removed from openpgp.generateSessionKey, pass `encryptionKeys` instead");
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  try {
    const sessionKeys = await Message.generateSessionKey(encryptionKeys, date, encryptionUserIDs, config2);
    return sessionKeys;
  } catch (err2) {
    throw util_default.wrapError("Error generating session key", err2);
  }
}
async function encryptSessionKey({ data, algorithm, aeadAlgorithm, encryptionKeys, passwords, format = "armored", wildcard = false, encryptionKeyIDs = [], date = /* @__PURE__ */ new Date(), encryptionUserIDs = [], config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  checkConfig(config2);
  checkBinary(data);
  checkString(algorithm, "algorithm");
  checkOutputMessageFormat(format);
  encryptionKeys = toArray(encryptionKeys);
  passwords = toArray(passwords);
  encryptionKeyIDs = toArray(encryptionKeyIDs);
  encryptionUserIDs = toArray(encryptionUserIDs);
  if (rest.publicKeys) throw new Error("The `publicKeys` option has been removed from openpgp.encryptSessionKey, pass `encryptionKeys` instead");
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  if ((!encryptionKeys || encryptionKeys.length === 0) && (!passwords || passwords.length === 0)) {
    throw new Error("No encryption keys or passwords provided.");
  }
  try {
    const message = await Message.encryptSessionKey(data, algorithm, aeadAlgorithm, encryptionKeys, passwords, wildcard, encryptionKeyIDs, date, encryptionUserIDs, config2);
    return formatObject(message, format, config2);
  } catch (err2) {
    throw util_default.wrapError("Error encrypting session key", err2);
  }
}
async function decryptSessionKeys({ message, decryptionKeys, passwords, date = /* @__PURE__ */ new Date(), config: config2, ...rest }) {
  config2 = { ...config_default, ...config2 };
  checkConfig(config2);
  checkMessage(message);
  decryptionKeys = toArray(decryptionKeys);
  passwords = toArray(passwords);
  if (rest.privateKeys) throw new Error("The `privateKeys` option has been removed from openpgp.decryptSessionKeys, pass `decryptionKeys` instead");
  const unknownOptions = Object.keys(rest);
  if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(", ")}`);
  try {
    const sessionKeys = await message.decryptSessionKeys(decryptionKeys, passwords, void 0, date, config2);
    return sessionKeys;
  } catch (err2) {
    throw util_default.wrapError("Error decrypting session keys", err2);
  }
}
function checkString(data, name) {
  if (!util_default.isString(data)) {
    throw new Error("Parameter [" + (name || "data") + "] must be of type String");
  }
}
function checkBinary(data, name) {
  if (!util_default.isUint8Array(data)) {
    throw new Error("Parameter [" + (name || "data") + "] must be of type Uint8Array");
  }
}
function checkMessage(message) {
  if (!(message instanceof Message)) {
    throw new Error("Parameter [message] needs to be of type Message");
  }
}
function checkCleartextOrMessage(message) {
  if (!(message instanceof CleartextMessage) && !(message instanceof Message)) {
    throw new Error("Parameter [message] needs to be of type Message or CleartextMessage");
  }
}
function checkOutputMessageFormat(format) {
  if (format !== "armored" && format !== "binary" && format !== "object") {
    throw new Error(`Unsupported format ${format}`);
  }
}
var defaultConfigPropsCount = Object.keys(config_default).length;
function checkConfig(config2) {
  const inputConfigProps = Object.keys(config2);
  if (inputConfigProps.length !== defaultConfigPropsCount) {
    for (const inputProp of inputConfigProps) {
      if (config_default[inputProp] === void 0) {
        throw new Error(`Unknown config property: ${inputProp}`);
      }
    }
  }
}
function toArray(param) {
  if (param && !util_default.isArray(param)) {
    param = [param];
  }
  return param;
}
async function convertStream(data) {
  const streamType = util_default.isStream(data);
  if (streamType === "array") {
    return readToEnd(data);
  }
  return data;
}
function linkStreams(result, inputMessage, ...intermediateMessages) {
  result.data = transformPair(inputMessage.packets.stream, async (readable, writable) => {
    await pipe(result.data, writable, {
      preventClose: true
    });
    const writer = getWriter(writable);
    try {
      await readToEnd(readable, (_) => _);
      await Promise.all(intermediateMessages.map((intermediate) => readToEnd(intermediate.packets.stream, (_) => _)));
      await writer.close();
    } catch (e) {
      await writer.abort(e);
    }
  });
}
function formatObject(object, format, config2) {
  switch (format) {
    case "object":
      return object;
    case "armored":
      return object.armor(config2);
    case "binary":
      return object.write();
    default:
      throw new Error(`Unsupported format ${format}`);
  }
}
export {
  aead_encrypted_data_default as AEADEncryptedDataPacket,
  CleartextMessage,
  compressed_data_default as CompressedDataPacket,
  GrammarError,
  literal_data_default as LiteralDataPacket,
  marker_default as MarkerPacket,
  Message,
  one_pass_signature_default as OnePassSignaturePacket,
  packetlist_default as PacketList,
  padding_default as PaddingPacket,
  private_key_default as PrivateKey,
  public_key_default2 as PublicKey,
  public_key_encrypted_session_key_default as PublicKeyEncryptedSessionKeyPacket,
  public_key_default as PublicKeyPacket,
  public_subkey_default as PublicSubkeyPacket,
  secret_key_default as SecretKeyPacket,
  secret_subkey_default as SecretSubkeyPacket,
  Signature,
  signature_default as SignaturePacket,
  subkey_default as Subkey,
  sym_encrypted_integrity_protected_data_default as SymEncryptedIntegrityProtectedDataPacket,
  sym_encrypted_session_key_default as SymEncryptedSessionKeyPacket,
  symmetrically_encrypted_data_default as SymmetricallyEncryptedDataPacket,
  trust_default as TrustPacket,
  UnparseablePacket,
  user_attribute_default as UserAttributePacket,
  userid_default as UserIDPacket,
  armor,
  config_default as config,
  createCleartextMessage,
  createMessage,
  decrypt7 as decrypt,
  decryptKey,
  decryptSessionKeys,
  encrypt7 as encrypt,
  encryptKey,
  encryptSessionKey,
  enums_default as enums,
  generateKey,
  generateSessionKey2 as generateSessionKey,
  readCleartextMessage,
  readKey,
  readKeys,
  readMessage,
  readPrivateKey,
  readPrivateKeys,
  readSignature,
  reformatKey,
  revokeKey,
  sign7 as sign,
  unarmor,
  verify7 as verify
};
