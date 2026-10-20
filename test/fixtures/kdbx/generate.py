#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""Writes KeePass databases (.kdbx 3.1 and 4.x) from a KeePass 2 XML file, for OmniVault's tests.

Written independently of OmniVault's reader (src/lib/kdbx.js) from the published format description, so the two
check each other; every file it writes is also opened with keepassxc-cli (see README.md in this folder).
Needs Python 3 and the `cryptography` package (AES, ChaCha20, Argon2). Salsa20 (inner stream of KDBX 3.1) is not
in `cryptography` and is implemented below from the specification.

  generate.py SOURCE.xml OUT.kdbx --password PW [--key-file FILE] [--version 3.1|4.0|4.1]
              [--kdf aes|argon2d|argon2id] [--rounds N] [--memory KIB] [--iterations N] [--parallelism N]
              [--cipher aes|chacha20] [--no-compress]
"""
import argparse
import base64
import gzip
import hashlib
import hmac
import os
import struct
import xml.etree.ElementTree as ET

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.argon2 import Argon2d, Argon2id

SIG1, SIG2 = 0x9AA2D903, 0xB54BFB67
CIPHER = {'aes': bytes.fromhex('31c1f2e6bf714350be5805216afc5aff'), 'chacha20': bytes.fromhex('d6038a2b8b6f4cb5a524339a31dbb59a')}
KDF = {'aes': bytes.fromhex('c9d9f39a628a4460bf740d08c18a4fea'), 'argon2d': bytes.fromhex('ef636ddf8c29444b91f7a9a403e30a0c'),
       'argon2id': bytes.fromhex('9e298b1956db4773b23dfc3ec6f0a1e6')}
SALSA_NONCE = bytes.fromhex('e830094b97205d2a')

sha256 = lambda b: hashlib.sha256(b).digest()
sha512 = lambda b: hashlib.sha512(b).digest()
u32, u64 = (lambda n: struct.pack('<I', n)), (lambda n: struct.pack('<Q', n))


# ---------- Salsa20 (Bernstein, "Salsa20 specification"), keystream only ----------
def _rotl(v, c):
    return ((v << c) & 0xffffffff) | (v >> (32 - c))


def _salsa_block(key, nonce, counter):
    c = b'expand 32-byte k'
    w = lambda b, i: struct.unpack_from('<I', b, i)[0]
    s = [w(c, 0), w(key, 0), w(key, 4), w(key, 8), w(key, 12), w(c, 4), w(nonce, 0), w(nonce, 4),
         counter & 0xffffffff, counter >> 32, w(c, 8), w(key, 16), w(key, 20), w(key, 24), w(key, 28), w(c, 12)]
    x = list(s)

    def qr(a, b, cc, d):
        x[b] ^= _rotl((x[a] + x[d]) & 0xffffffff, 7)
        x[cc] ^= _rotl((x[b] + x[a]) & 0xffffffff, 9)
        x[d] ^= _rotl((x[cc] + x[b]) & 0xffffffff, 13)
        x[a] ^= _rotl((x[d] + x[cc]) & 0xffffffff, 18)
    for _ in range(10):
        qr(0, 4, 8, 12); qr(5, 9, 13, 1); qr(10, 14, 2, 6); qr(15, 3, 7, 11)
        qr(0, 1, 2, 3); qr(5, 6, 7, 4); qr(10, 11, 8, 9); qr(15, 12, 13, 14)
    return b''.join(struct.pack('<I', (x[i] + s[i]) & 0xffffffff) for i in range(16))


class Salsa20Stream:
    def __init__(self, key, nonce):
        self.key, self.nonce, self.counter, self.buf = key, nonce, 0, b''

    def take(self, n):
        while len(self.buf) < n:
            self.buf += _salsa_block(self.key, self.nonce, self.counter)
            self.counter += 1
        out, self.buf = self.buf[:n], self.buf[n:]
        return out


class ChaChaStream:
    def __init__(self, key, nonce12):
        self.enc = Cipher(algorithms.ChaCha20(key, b'\0\0\0\0' + nonce12), None).encryptor()

    def take(self, n):
        return self.enc.update(b'\0' * n)


# ---------- keys ----------
def key_file_key(path):
    data = open(path, 'rb').read()
    try:
        root = ET.fromstring(data)
        if root.tag == 'KeyFile':
            ver = root.findtext('Meta/Version').strip()
            text = root.find('Key/Data').text
            if ver.startswith('2'):
                return bytes.fromhex(''.join(text.split()))
            return base64.b64decode(text)
    except ET.ParseError:
        pass
    if len(data) == 32:
        return data
    if len(data) == 64:
        try:
            return bytes.fromhex(data.decode('ascii'))
        except ValueError:
            pass
    return sha256(data)


def composite_key(password, key_file):
    parts = b''
    if password is not None:
        parts += sha256(password.encode('utf-8'))
    if key_file:
        parts += key_file_key(key_file)
    return sha256(parts)


def argon2(kdf, key, salt, iterations, memory, parallelism):
    fn = Argon2d if kdf == 'argon2d' else Argon2id
    return fn(salt=salt, length=32, iterations=iterations, lanes=parallelism, memory_cost=memory).derive(key)


def aes_kdf(key, seed, rounds):
    enc = Cipher(algorithms.AES(seed), modes.ECB()).encryptor()
    for _ in range(rounds):
        key = enc.update(key)
    return sha256(key)


# ---------- XML: protect values, collect attachments ----------
def prepare_xml(source, stream, kdbx4):
    tree = ET.parse(source)
    root = tree.getroot()
    binaries = []
    meta_bins = root.find('Meta/Binaries')
    if meta_bins is not None:
        for b in meta_bins.findall('Binary'):
            data = base64.b64decode(b.text or '')
            if b.get('Compressed') == 'True':
                data = gzip.decompress(data)
            binaries.append(data)
        if kdbx4:
            root.find('Meta').remove(meta_bins)
    for el in root.iter():  # document order, as the reader expects
        if el.tag == 'Value' and el.get('ProtectInMemory') == 'True':
            del el.attrib['ProtectInMemory']
            plain = (el.text or '').encode('utf-8')
            ks = stream.take(len(plain))
            el.text = base64.b64encode(bytes(a ^ b for a, b in zip(plain, ks))).decode()
            el.set('Protected', 'True')
    return ET.tostring(root, encoding='utf-8', xml_declaration=True), binaries


def variant_dict(entries):
    out = struct.pack('<H', 0x100)
    for key, (typ, val) in entries.items():
        k = key.encode()
        out += bytes([typ]) + u32(len(k)) + k + u32(len(val)) + val
    return out + b'\0'


def encrypt(cipher, key, iv, data):
    if cipher == 'aes':
        p = padding.PKCS7(128).padder()
        data = p.update(data) + p.finalize()
        e = Cipher(algorithms.AES(key), modes.CBC(iv)).encryptor()
    else:
        e = Cipher(algorithms.ChaCha20(key, b'\0\0\0\0' + iv), None).encryptor()
    return e.update(data) + e.finalize()


def write_kdbx4(a, comp):
    minor = 1 if a.version == '4.1' else 0
    seed, iv = os.urandom(32), os.urandom(16 if a.cipher == 'aes' else 12)
    if a.kdf == 'aes':
        kseed = os.urandom(32)
        params = {'$UUID': (0x42, KDF['aes']), 'R': (0x05, u64(a.rounds)), 'S': (0x42, kseed)}
        derived = aes_kdf(comp, kseed, a.rounds)
    else:
        salt = os.urandom(32)
        params = {'$UUID': (0x42, KDF[a.kdf]), 'S': (0x42, salt), 'P': (0x04, u32(a.parallelism)),
                  'M': (0x05, u64(a.memory * 1024)), 'I': (0x05, u64(a.iterations)), 'V': (0x04, u32(0x13))}
        derived = argon2(a.kdf, comp, salt, a.iterations, a.memory, a.parallelism)
    fields = [(2, CIPHER[a.cipher]), (3, u32(0 if a.no_compress else 1)), (4, seed), (7, iv), (11, variant_dict(params)), (0, b'\r\n\r\n')]
    header = struct.pack('<IIHH', SIG1, SIG2, minor, 4) + b''.join(bytes([t]) + u32(len(d)) + d for t, d in fields)
    enc_key = sha256(seed + derived)
    hmac_base = sha512(seed + derived + b'\x01')
    block_key = lambda i: sha512(u64(i) + hmac_base)

    stream_key = os.urandom(64)
    h = sha512(stream_key)
    xml, binaries = prepare_xml(a.source, ChaChaStream(h[:32], h[32:44]), True)
    inner = bytes([1]) + u32(4) + u32(3) + bytes([2]) + u32(64) + stream_key
    for b in binaries:
        inner += bytes([3]) + u32(len(b) + 1) + b'\x01' + b
    inner += bytes([0]) + u32(0)
    payload = inner + xml
    if not a.no_compress:
        payload = gzip.compress(payload)
    ct = encrypt(a.cipher, enc_key, iv, payload)

    out = header + sha256(header) + hmac.new(block_key(0xFFFFFFFFFFFFFFFF), header, 'sha256').digest()
    blocks = [ct[i:i + a.block_size] for i in range(0, len(ct), a.block_size)] + [b'']
    for i, data in enumerate(blocks):
        out += hmac.new(block_key(i), u64(i) + u32(len(data)) + data, 'sha256').digest() + u32(len(data)) + data
    return out


def write_kdbx31(a, comp):
    if a.kdf != 'aes':
        raise SystemExit('KDBX 3.1 only knows AES-KDF')
    seed, kseed, iv = os.urandom(32), os.urandom(32), os.urandom(16 if a.cipher == 'aes' else 12)
    stream_key, start = os.urandom(32), os.urandom(32)
    master = sha256(seed + aes_kdf(comp, kseed, a.rounds))
    fields = [(2, CIPHER[a.cipher]), (3, u32(0 if a.no_compress else 1)), (4, seed), (5, kseed), (6, u64(a.rounds)),
              (7, iv), (8, stream_key), (9, start), (10, u32(2)), (0, b'\r\n\r\n')]
    header = struct.pack('<IIHH', SIG1, SIG2, 1, 3) + b''.join(bytes([t]) + struct.pack('<H', len(d)) + d for t, d in fields)
    root = ET.parse(a.source).getroot()
    hh = root.find('Meta/HeaderHash')
    if hh is None:
        hh = ET.SubElement(root.find('Meta'), 'HeaderHash')
    hh.text = base64.b64encode(sha256(header)).decode()
    tmp = a.out + '.tmp.xml'
    ET.ElementTree(root).write(tmp, encoding='utf-8', xml_declaration=True)
    xml, _ = prepare_xml(tmp, Salsa20Stream(sha256(stream_key), SALSA_NONCE), False)
    os.remove(tmp)
    body = xml if a.no_compress else gzip.compress(xml)
    hashed = b''
    chunks = [body[i:i + a.block_size] for i in range(0, len(body), a.block_size)]
    for i, data in enumerate(chunks):
        hashed += u32(i) + sha256(data) + u32(len(data)) + data
    hashed += u32(len(chunks)) + b'\0' * 32 + u32(0)
    return header + encrypt(a.cipher, master, iv, start + hashed)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('source'); p.add_argument('out')
    p.add_argument('--password'); p.add_argument('--key-file')
    p.add_argument('--version', default='4.0', choices=['3.1', '4.0', '4.1'])
    p.add_argument('--kdf', default='argon2d', choices=list(KDF))
    p.add_argument('--rounds', type=int, default=10000)
    p.add_argument('--memory', type=int, default=1024, help='KiB')
    p.add_argument('--iterations', type=int, default=2)
    p.add_argument('--parallelism', type=int, default=2)
    p.add_argument('--cipher', default='aes', choices=list(CIPHER))
    p.add_argument('--no-compress', action='store_true')
    p.add_argument('--block-size', type=int, default=1 << 20)
    a = p.parse_args()
    comp = composite_key(a.password, a.key_file)
    data = write_kdbx31(a, comp) if a.version == '3.1' else write_kdbx4(a, comp)
    open(a.out, 'wb').write(data)


if __name__ == '__main__':
    main()
