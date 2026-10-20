// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Bitwarden "encryption v2": XAES-256-GCM against the C2SP vectors, COSE messages,
// padded COSE keys, and a whole v2 account built by an independent generator (test/fixtures/make-bitwarden-v2.py).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import BitwardenProvider from '../src/providers/bitwarden/index.js';
import {
  COSE_ALG, CONTENT, decryptKey, decryptSym, decryptSymString, openCose, parseCoseKey, sealCose, splitKey, unpad, xaesDerive,
} from '../src/providers/bitwarden/crypto.js';
import { concat, hex, utf8 } from '../src/lib/bytes.js';
import { cbor, decodeCbor } from '../src/lib/cbor.js';

const subtle = globalThis.crypto.subtle;

/** XAES-256-GCM encryption, built from the exported key derivation and WebCrypto (for the C2SP vectors). */
async function xaesEncrypt(key, nonce, plain, aad) {
  const k = await subtle.importKey('raw', await xaesDerive(key, nonce), 'AES-GCM', false, ['encrypt']);
  return new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce.subarray(12), additionalData: aad }, k, plain));
}

test('XAES-256-GCM: both vectors of the specification (c2sp.org/XAES-256-GCM)', async () => {
  const nonce = utf8('ABCDEFGHIJKLMNOPQRSTUVWX');
  const k1 = new Uint8Array(32).fill(1);
  assert.equal(hex(await xaesDerive(k1, nonce)), 'c8612c9ed53fe43e8e005b828a1631a0bbcb6ab2f46514ec4f439fcfd0fa969b');
  assert.equal(hex(await xaesEncrypt(k1, nonce, utf8('XAES-256-GCM'), new Uint8Array(0))), 'ce546ef63c9cc60765923609b33a9a1974e96e52daf2fcf7075e2271');
  const k3 = new Uint8Array(32).fill(3); // MSB of L set: the 0x87 branch
  assert.equal(hex(await xaesDerive(k3, nonce)), 'e9c621d4cdd9b11b00a6427ad7e559aeedd66b3857646677748f8ca796cb3fd8');
  assert.equal(hex(await xaesEncrypt(k3, nonce, utf8('XAES-256-GCM'), utf8('c2sp.org/XAES-256-GCM'))), '986ec1832593df5443a179437fd083bf3fdb41abd740a21f71eb769d');
});

test('XAES-256-GCM: accumulated randomized test, 10 000 iterations (C2SP)', async () => {
  // inputs from one SHAKE-128 stream with empty input: key[32], nonce[24], plaintext<0..255>, aad<0..255>
  const stream = createHash('shake128', { outputLength: 10_000 * 600 }).digest();
  assert.equal(stream.subarray(0, 16).toString('hex'), '7f9c2ba4e88f827d616045507605853e');
  let p = 0;
  const take = (n) => { const b = new Uint8Array(stream.subarray(p, p + n)); p += n; return b; };
  const out = createHash('shake128', { outputLength: 32 });
  for (let i = 0; i < 10_000; i++) {
    const key = take(32);
    const nonce = take(24);
    const plain = take(take(1)[0]);
    const aad = take(take(1)[0]);
    out.update(await xaesEncrypt(key, nonce, plain, aad));
  }
  assert.equal(out.digest('hex'), 'e6b9edf2df6cec60c8cbd864e2211b597fb69a529160cd040d56c0c210081939');
});

test('COSE_Encrypt0: all three algorithms seal and open; tampering, wrong algorithm and wrong key id are refused', async () => {
  for (const alg of [COSE_ALG.XAES_256_GCM, COSE_ALG.XCHACHA20_POLY1305, COSE_ALG.A256GCM]) {
    const key = { enc: crypto.getRandomValues(new Uint8Array(32)), mac: null, cose: { alg, kid: crypto.getRandomValues(new Uint8Array(16)) } };
    const msg = await sealCose(utf8('Hallo, Welt'), key, CONTENT.UTF8_PADDED, { padTo: 32 });
    const opened = await openCose(msg, key);
    assert.equal(new TextDecoder().decode(opened.bytes), 'Hallo, Welt', `alg ${alg}`);
    assert.equal(opened.contentType, CONTENT.UTF8_PADDED);
    const bad = msg.slice(); bad[bad.length - 1] ^= 1;
    await assert.rejects(openCose(bad, key), (e) => e.code === 'crypto', 'tag checked');
    await assert.rejects(openCose(msg, { ...key, cose: { ...key.cose, alg: alg === 3 ? -70010 : 3 } }), (e) => e.code === 'crypto');
    await assert.rejects(openCose(msg, { ...key, cose: { ...key.cose, kid: new Uint8Array(16) } }), (e) => e.code === 'crypto');
  }
  // the protected header is authenticated: changing its content type breaks the tag
  const key = { enc: new Uint8Array(32).fill(7), mac: null, cose: { alg: COSE_ALG.XAES_256_GCM, kid: null } };
  const [prot, unprot, ct] = decodeCbor(await sealCose(utf8('x'), key, CONTENT.OCTETS));
  const forged = cbor([cbor(new Map([[1, COSE_ALG.XAES_256_GCM], [3, CONTENT.PKCS8]])), unprot, ct]);
  assert.ok(prot.length);
  await assert.rejects(openCose(forged, key), (e) => e.code === 'crypto');
});

test('padding and keys: padded COSE key, legacy key bytes, malformed input', () => {
  assert.deepEqual([...unpad(new Uint8Array([9, 9, 2, 2]))], [9, 9]);
  assert.throws(() => unpad(new Uint8Array([9, 3, 2])), (e) => e.code === 'crypto', 'padding bytes must all equal N');
  assert.throws(() => unpad(new Uint8Array([1, 0])), (e) => e.code === 'crypto');
  const cose = cbor(new Map([[1, 4], [2, new Uint8Array(16).fill(1)], [3, -70010], [4, [3, 4, 5, 6]], [-1, new Uint8Array(32).fill(2)]]));
  const k = splitKey(concat(cose, new Uint8Array([1])));
  assert.equal(k.cose.alg, -70010);
  assert.deepEqual([...k.enc], new Array(32).fill(2));
  assert.equal(splitKey(new Uint8Array(64)).cose, undefined, '64 bytes stay AES-CBC + HMAC');
  assert.throws(() => parseCoseKey(cbor(new Map([[1, 1], [3, -8]]))), (e) => e.code === 'crypto', 'a signing key is no symmetric key');
  assert.throws(() => splitKey(new Uint8Array(48)), (e) => e.code === 'crypto');
});

test('decryptKey: type 7 with legacy key bytes or a COSE key inside', async () => {
  const wrap = { enc: crypto.getRandomValues(new Uint8Array(32)), mac: null, cose: { alg: COSE_ALG.XAES_256_GCM, kid: null } };
  const legacy = crypto.getRandomValues(new Uint8Array(64));
  const k1 = await decryptKey(`7.${Buffer.from(await sealCose(legacy, wrap, CONTENT.LEGACY_KEY)).toString('base64')}`, wrap);
  assert.deepEqual([...k1.enc, ...k1.mac], [...legacy]);
  const inner = cbor(new Map([[1, 4], [2, new Uint8Array(16)], [3, 3], [4, [3, 4]], [-1, new Uint8Array(32).fill(5)]]));
  const k2 = await decryptKey(`7.${Buffer.from(await sealCose(inner, wrap, CONTENT.COSE_KEY)).toString('base64')}`, wrap);
  assert.equal(k2.cose.alg, 3);
  await assert.rejects(decryptSym('2.AAAA|AAAA|AAAA', k2), (e) => e.code === 'crypto', 'a v2 key never opens type 2');
});

/* ---------- a whole v2 account from the independent generator ---------- */

const F = JSON.parse(readFileSync(new URL('./fixtures/bitwarden-v2.json', import.meta.url), 'utf8'));
const config = { id: 'v2', server: 'https://vault.example.org', email: F.email };

function server() {
  const writes = [];
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname;
    const body = init.body instanceof URLSearchParams ? init.body.toString() : init.body;
    const reply = (status, json) => new Response(JSON.stringify(json), { status });
    if (path.endsWith('/accounts/prelogin')) return reply(200, F.kdf);
    if (path.endsWith('/connect/token')) {
      return new URLSearchParams(body).get('password') === F.authHash ? reply(200, F.token) : reply(400, { error: 'invalid_grant' });
    }
    if (path.endsWith('/sync')) return reply(200, F.sync);
    writes.push({ method: init.method, path });
    return reply(200, {});
  };
  return writes;
}

test('v2 account: login, folders, item keys, cipher blob, items without item key, organization items', async () => {
  server();
  const res = await BitwardenProvider.login(config, { password: F.password });
  assert.equal(res.status, 'ok');
  const { items, folders, readOnly, warning } = await BitwardenProvider.sync(config, res.session);
  assert.equal(readOnly, true);
  assert.match(warning, /neues Verschlüsselungsformat/);
  assert.deepEqual(folders.map((f) => f.name), [F.expected.folder]);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  assert.equal(items.length, 4, 'every item decrypted');
  for (const [id, want] of Object.entries(F.expected.items)) {
    const i = byId[id];
    for (const k of ['name', 'username', 'password', 'notes', 'totp', 'folder', 'type', 'favorite']) {
      if (want[k] !== undefined) assert.deepEqual(i[k], want[k], `${id}.${k}`);
    }
    if (want.uris) assert.deepEqual(i.uris, want.uris, `${id}.uris`);
    if (want.fields) assert.deepEqual(i.fields.map((f) => [f.name, f.value, f.type]), want.fields, `${id}.fields`);
    if (want.passwordHistory) assert.deepEqual(i.passwordHistory.map((h) => h.password), want.passwordHistory);
    if (want.passkeyRpId) assert.equal(i.passkeys[0].rpId, want.passkeyRpId);
    assert.equal(i.canEdit, false, `${id} is read-only`);
  }
  assert.equal(byId['v2-blob']._passkeyKeys[byId['v2-blob'].passkeys[0].credentialId], 'TUlHSEFnRUFNQk1H', 'passkey key kept internally');
  assert.equal(await decryptSymString(F.sync.folders[0].name, splitKey(Buffer.from(res.session.userKey, 'base64'))), F.expected.folder);
});

test('v2 account: nothing is written in the old format', async () => {
  const writes = server();
  const { session } = await BitwardenProvider.login(config, { password: F.password });
  const { items } = await BitwardenProvider.sync(config, session);
  const login = items.find((i) => i.id === 'v2-legacy');
  await assert.rejects(BitwardenProvider.saveItem(config, session, login, { type: 'login', name: 'x', password: 'y' }), (e) => e.code === 'readonly');
  await assert.rejects(BitwardenProvider.saveItem(config, session, null, { type: 'login', name: 'Neu' }), (e) => e.code === 'readonly');
  await assert.rejects(BitwardenProvider.createFolder(config, session, { name: 'Neu' }), (e) => e.code === 'readonly');
  assert.deepEqual(writes, [], 'no request reached the server');
});

test('a wrong password is still reported as such for v2 accounts', async () => {
  server();
  await assert.rejects(BitwardenProvider.login(config, { password: 'falsch' }));
});

test('the generator output really is v2: user key is a padded COSE key, private key type 7', () => {
  assert.match(F.sync.profile.privateKey, /^7\./);
  assert.ok(F.sync.ciphers.some((c) => typeof c.data === 'string' && JSON.parse(c.data).format_version === 1));
});
