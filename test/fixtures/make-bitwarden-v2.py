#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""
Builds test/fixtures/bitwarden-v2.json: a complete Bitwarden account in "encryption v2" (EncString type 7, COSE
keys, XAES-256-GCM, cipher blobs), as login response and /api/sync body.

Written independently of OmniVault's JavaScript (own CBOR, XAES-256-GCM, padding and type-2 code; only AES,
AES-GCM, RSA and PBKDF2 come from the `cryptography` package), so the test does not check the implementation
against itself. Run: python3 test/fixtures/make-bitwarden-v2.py
"""
import base64
import hashlib
import hmac
import json
import os
import struct
import uuid

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding as asympad
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import padding as sympad

EMAIL = "v2@example.org"
PASSWORD = "Neues-Format-2026"
ITERATIONS = 5000
XAES, A256GCM = -70010, 3
UTF8_PADDED = "application/x.bitwarden.utf8-padded"
CBOR_PADDED = "application/x.bitwarden.cbor-padded"
LEGACY_KEY = "application/x.bitwarden.legacy-key"
PKCS8 = 284

b64 = lambda b: base64.b64encode(b).decode()


# ---------- CBOR encoder (definite lengths, deterministic as written) ----------
def head(major, n):
    if n < 24:
        return bytes([major << 5 | n])
    if n < 0x100:
        return bytes([major << 5 | 24, n])
    if n < 0x10000:
        return bytes([major << 5 | 25]) + struct.pack(">H", n)
    if n < 0x100000000:
        return bytes([major << 5 | 26]) + struct.pack(">I", n)
    return bytes([major << 5 | 27]) + struct.pack(">Q", n)


def cbor(v):
    if v is None:
        return b"\xf6"
    if v is True:
        return b"\xf5"
    if v is False:
        return b"\xf4"
    if isinstance(v, int):
        return head(0, v) if v >= 0 else head(1, -1 - v)
    if isinstance(v, (bytes, bytearray)):
        return head(2, len(v)) + bytes(v)
    if isinstance(v, str):
        e = v.encode()
        return head(3, len(e)) + e
    if isinstance(v, list):
        return head(4, len(v)) + b"".join(cbor(x) for x in v)
    if isinstance(v, dict):
        return head(5, len(v)) + b"".join(cbor(k) + cbor(x) for k, x in v.items())
    raise TypeError(type(v))


# ---------- padding: last byte N = number of padding bytes, all equal to N ----------
def pad(data, block, minimum=0):
    n = block - (len(data) % block)
    out = data + bytes([n]) * n
    while len(out) < minimum:
        out += bytes([block]) * block  # never needed for the sizes below; kept for clarity
    return out


def pad_key(data):
    """A COSE key wrapped by a legacy key is padded to more than 64 bytes."""
    n = max(1, 65 - len(data))
    return data + bytes([n]) * n


# ---------- XAES-256-GCM (c2sp.org/XAES-256-GCM) ----------
def aes_block(key, block):
    e = Cipher(algorithms.AES(key), modes.ECB()).encryptor()
    return e.update(block) + e.finalize()


def xaes_key(key, nonce):
    L = int.from_bytes(aes_block(key, bytes(16)), "big")
    k1 = (L << 1) & ((1 << 128) - 1)
    if L >> 127:
        k1 ^= 0x87
    k1 = k1.to_bytes(16, "big")
    m = lambda i: bytes(a ^ b for a, b in zip(bytes([0, i, 0x58, 0]) + nonce[:12], k1))
    return aes_block(key, m(1)) + aes_block(key, m(2))


def seal(plain, key, kid, alg, content_type):
    protected = cbor({1: alg, 3: content_type, 4: kid})
    aad = cbor(["Encrypt0", protected, b""])
    if alg == XAES:
        nonce = os.urandom(24)
        ct = AESGCM(xaes_key(key, nonce)).encrypt(nonce[12:], plain, aad)
    else:
        nonce = os.urandom(12)
        ct = AESGCM(key).encrypt(nonce, plain, aad)
    return cbor([protected, {5: nonce}, ct])


def type7(plain, cose_key, content_type, padded=False):
    data = pad(plain, 32) if padded else plain
    return "7." + b64(seal(data, cose_key["k"], cose_key["kid"], cose_key["alg"], content_type))


def cose_key(alg):
    return {"k": os.urandom(32), "kid": os.urandom(16), "alg": alg}


def cose_key_bytes(k):
    return cbor({1: 4, 2: k["kid"], 3: k["alg"], 4: [3, 4, 5, 6], -1: k["k"]})


# ---------- legacy: AES-256-CBC + HMAC-SHA256 (EncString type 2) ----------
def type2(plain, key64):
    enc, mac = key64[:32], key64[32:]
    iv = os.urandom(16)
    p = sympad.PKCS7(128).padder()
    data = p.update(plain) + p.finalize()
    e = Cipher(algorithms.AES(enc), modes.CBC(iv)).encryptor()
    ct = e.update(data) + e.finalize()
    tag = hmac.new(mac, iv + ct, hashlib.sha256).digest()
    return f"2.{b64(iv)}|{b64(ct)}|{b64(tag)}"


def s2(text, key64):
    return type2(text.encode(), key64)


def hkdf_expand(prk, info, length=32):
    out, block, i = b"", b"", 1
    while len(out) < length:
        block = hmac.new(prk, block + info + bytes([i]), hashlib.sha256).digest()
        out += block
        i += 1
    return out[:length]


def main():
    master = hashlib.pbkdf2_hmac("sha256", PASSWORD.encode(), EMAIL.lower().encode(), ITERATIONS, 32)
    stretched = hkdf_expand(master, b"enc") + hkdf_expand(master, b"mac")
    auth_hash = b64(hashlib.pbkdf2_hmac("sha256", master, PASSWORD.encode(), 1, 32))

    user = cose_key(XAES)
    protected_user_key = type2(pad_key(cose_key_bytes(user)), stretched)

    rsa_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pkcs8 = rsa_key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    org_key = os.urandom(64)
    org_key_enc = "4." + b64(rsa_key.public_key().encrypt(org_key, asympad.OAEP(asympad.MGF1(hashes.SHA1()), hashes.SHA1(), None)))

    folder_id = str(uuid.uuid4())
    ciphers = []

    # 1. legacy fields under an item key that is wrapped with the v2 user key (type 7, legacy-key)
    item1 = os.urandom(64)
    ciphers.append({
        "id": "v2-legacy", "type": 1, "folderId": folder_id, "organizationId": None, "favorite": False, "edit": True,
        "revisionDate": "2026-10-01T10:00:00Z", "key": type7(item1, user, LEGACY_KEY),
        "name": s2("Altes Feldformat", item1), "notes": None,
        "login": {"username": s2("ada", item1), "password": s2("pw-alt", item1), "totp": None,
                  "uris": [{"uri": s2("https://alt.example.org", item1), "match": None}]},
        "fields": [{"type": 1, "name": s2("PIN", item1), "value": s2("1234", item1)}], "data": None,
    })

    # 2. cipher blob: everything sensitive sealed with a content key (AES-256-GCM) under the item key
    item2 = os.urandom(64)
    cek = cose_key(A256GCM)
    payload = {"version": "1", "content": {
        "name": "Blob-Login", "notes": "steht im Umschlag",
        "typeData": {"type": "login", "username": "blob@example.org", "password": "pw-blob", "passwordRevisionDate": None,
                     "uris": [{"uri": "https://blob.example.org/login", "match": None}], "totp": "otpauth://totp/x?secret=JBSWY3DPEHPK3PXP",
                     "autofillOnPageLoad": None,
                     "fido2Credentials": [{"credentialId": "4d8c3f6e-1111-4c4b-9d3d-000000000001", "keyType": "public-key",
                                           "keyAlgorithm": "ECDSA", "keyCurve": "P-256", "keyValue": "TUlHSEFnRUFNQk1H", "rpId": "blob.example.org",
                                           "userHandle": "dXNlcg", "userName": "blob@example.org", "counter": 0, "rpName": "Blob",
                                           "userDisplayName": "Blob", "discoverable": True, "creationDate": "2026-09-01T08:00:00Z"}]},
        "fields": [{"name": "Kundennummer", "value": "K-9", "type": 0, "linkedId": None}],
        "passwordHistory": [{"password": "pw-blob-alt", "lastUsedDate": "2026-08-01T09:00:00Z"}],
    }}
    envelope = seal(pad(cbor(payload), 64), cek["k"], cek["kid"], A256GCM, CBOR_PADDED)
    blob = {"format_version": 1, "wrapped_cek": type2(pad_key(cose_key_bytes(cek)), item2), "envelope": b64(envelope)}
    ciphers.append({
        "id": "v2-blob", "type": 1, "folderId": None, "organizationId": None, "favorite": True, "edit": True,
        "revisionDate": "2026-10-02T10:00:00Z", "key": type7(item2, user, LEGACY_KEY),
        "name": None, "notes": None, "login": None, "fields": None, "data": json.dumps(blob),
    })

    # 3. note without item key: fields directly under the v2 user key (type 7, padded text)
    ciphers.append({
        "id": "v2-direkt", "type": 2, "folderId": folder_id, "organizationId": None, "favorite": False, "edit": True,
        "revisionDate": "2026-10-03T10:00:00Z", "key": None,
        "name": type7("Notiz ohne Item-Key".encode(), user, UTF8_PADDED, padded=True),
        "notes": type7("Typ 7 direkt".encode(), user, UTF8_PADDED, padded=True), "secureNote": {"type": 0}, "data": None,
    })

    # 4. organization item: unchanged legacy format under the organization key
    ciphers.append({
        "id": "v2-org", "type": 1, "folderId": None, "organizationId": "org-v2", "favorite": False, "edit": True,
        "revisionDate": "2026-10-04T10:00:00Z", "key": None,
        "name": s2("Team-Login", org_key), "notes": None,
        "login": {"username": s2("team", org_key), "password": s2("pw-team", org_key), "uris": []}, "data": None,
    })

    fixture = {
        "_comment": "Generated by test/fixtures/make-bitwarden-v2.py – independent implementation, see there.",
        "email": EMAIL, "password": PASSWORD, "kdf": {"kdf": 0, "kdfIterations": ITERATIONS},
        "authHash": auth_hash,
        "token": {"access_token": "AT-V2", "refresh_token": "RT-V2", "expires_in": 3600, "Key": protected_user_key,
                  "AccountKeys": {"publicKeyEncryptionKeyPair": {"wrappedPrivateKey": type7(pkcs8, user, PKCS8)}}},
        "sync": {
            "profile": {"id": "u-v2", "email": EMAIL, "privateKey": type7(pkcs8, user, PKCS8),
                        "organizations": [{"id": "org-v2", "name": "Team", "key": org_key_enc}]},
            "folders": [{"id": folder_id, "name": type7("Neues Format".encode(), user, UTF8_PADDED, padded=True)}],
            "ciphers": ciphers,
        },
        "expected": {
            "folder": "Neues Format",
            "items": {
                "v2-legacy": {"name": "Altes Feldformat", "username": "ada", "password": "pw-alt", "uris": ["https://alt.example.org"],
                              "folder": "Neues Format", "fields": [["PIN", "1234", "hidden"]]},
                "v2-blob": {"name": "Blob-Login", "username": "blob@example.org", "password": "pw-blob", "notes": "steht im Umschlag",
                            "uris": ["https://blob.example.org/login"], "totp": "otpauth://totp/x?secret=JBSWY3DPEHPK3PXP",
                            "fields": [["Kundennummer", "K-9", "text"]], "passwordHistory": ["pw-blob-alt"],
                            "passkeyRpId": "blob.example.org", "favorite": True},
                "v2-direkt": {"name": "Notiz ohne Item-Key", "notes": "Typ 7 direkt", "type": "note", "folder": "Neues Format"},
                "v2-org": {"name": "Team-Login", "username": "team", "password": "pw-team"},
            },
        },
    }
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bitwarden-v2.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(fixture, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(f"geschrieben: {out}")


if __name__ == "__main__":
    main()
