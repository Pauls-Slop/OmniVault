#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""
Test double for KeePassXC behind keepassxc-proxy: speaks native messaging on stdin/stdout like the proxy and
answers the KeePassXC browser protocol (keepassxc-protocol.md and KeePassXC src/browser/BrowserAction.cpp as of
October 2026). The NaCl box comes from the system's libsodium (ctypes), independent of OmniVault's TweetNaCl.

State (database, stored associations) lives in $FAKE_KPXC_STATE. Behaviour switches:
  FAKE_KPXC_LOCKED=1          database locked (errorCode 1)
  FAKE_KPXC_DENY_ASSOCIATE=1  the user rejects the association dialog (errorCode 6)
  FAKE_KPXC_NO_LIST=1         "list all entries" is not allowed in KeePassXC's settings (errorCode 19)
  FAKE_KPXC_DENY_DELETE=1     the user answers "No" to the delete confirmation
  FAKE_KPXC_LOGIN_URI=url     one more entry for that address (browser tests fill a local login page)
Every request is appended (decrypted) to $FAKE_KPXC_LOG if set.
"""
import base64
import ctypes
import ctypes.util
import json
import os
import struct
import sys
import uuid as uuidlib

sodium = ctypes.CDLL(ctypes.util.find_library("sodium") or "libsodium.so.23")
assert sodium.sodium_init() >= 0
MAC, NONCE, KEY = 16, 24, 32
VERSION = "2.7.10"

STATE = os.environ["FAKE_KPXC_STATE"]
LOG = os.environ.get("FAKE_KPXC_LOG")
b64 = lambda b: base64.b64encode(b).decode()
unb64 = lambda s: base64.b64decode(s)


def box(plain, nonce, pk, sk):
    out = ctypes.create_string_buffer(len(plain) + MAC)
    assert sodium.crypto_box_easy(out, plain, ctypes.c_ulonglong(len(plain)), nonce, pk, sk) == 0
    return out.raw


def box_open(ct, nonce, pk, sk):
    if len(ct) < MAC:
        return None
    out = ctypes.create_string_buffer(len(ct) - MAC)
    if sodium.crypto_box_open_easy(out, ct, ctypes.c_ulonglong(len(ct)), nonce, pk, sk) != 0:
        return None
    return out.raw


def keypair():
    pk, sk = ctypes.create_string_buffer(KEY), ctypes.create_string_buffer(KEY)
    sodium.crypto_box_keypair(pk, sk)
    return pk.raw, sk.raw


def increment(nonce_b64):
    n = ctypes.create_string_buffer(unb64(nonce_b64), NONCE)
    sodium.sodium_increment(n, ctypes.c_size_t(NONCE))
    return b64(n.raw)


def seed():
    root, work, web = str(uuidlib.uuid4().hex), str(uuidlib.uuid4().hex), str(uuidlib.uuid4().hex)
    return {
        "hash": "9f1c0a4c2e7c4c8f8d1a6a0f5b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c",
        "groups": {"name": "Root", "uuid": root, "children": [
            {"name": "Arbeit", "uuid": work, "children": [{"name": "Web", "uuid": web, "children": []}]},
            {"name": "Papierkorb", "uuid": "0" * 32, "children": [], "recycleBin": True}]},
        "entries": [
            {"uuid": "1" * 32, "title": "GitHub", "url": "https://github.com/login", "login": "ada", "password": "kpxc-gh",
             "group": work, "totp": "123456"},
            {"uuid": "2" * 32, "title": "Intranet", "url": "https://intranet.example.org", "login": "a.lovelace",
             "password": "kpxc-intra", "group": web},
            {"uuid": "3" * 32, "title": "Ohne Adresse", "url": "", "login": "x", "password": "y", "group": root},
        ] + ([{"uuid": "4" * 32, "title": "Testseite", "url": os.environ["FAKE_KPXC_LOGIN_URI"], "login": "alice",
               "password": "kpxc-local", "group": root}] if os.environ.get("FAKE_KPXC_LOGIN_URI") else []),
        "associations": {},
    }


def load():
    if not os.path.exists(STATE):
        save(seed())
    with open(STATE, encoding="utf-8") as f:
        return json.load(f)


def save(s):
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(s, f)


def read_msg():
    raw = sys.stdin.buffer.read(4)
    if len(raw) < 4:
        return None
    (n,) = struct.unpack("=I", raw)
    return json.loads(sys.stdin.buffer.read(n).decode("utf-8"))


def write_msg(obj):
    data = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("=I", len(data)) + data)
    sys.stdout.buffer.flush()


def host(url):
    url = (url or "").lower()
    if "://" in url:
        url = url.split("://", 1)[1]
    return url.split("/")[0].split(":")[0]


ERRORS = {1: "Database not opened", 4: "Cannot decrypt message", 6: "Action cancelled or denied", 8: "KeePassXC association failed, try again",
          12: "Incorrect action", 14: "No URL provided", 15: "No logins found", 16: "No groups found", 18: "No valid UUID provided",
          19: "Access to all entries is denied", 3: "Client public key not received"}


def error(action, code):
    return {"action": action, "errorCode": str(code), "error": ERRORS.get(code, "error")}


class Session:
    def __init__(self):
        self.client_pk = None
        self.pk, self.sk = keypair()
        self.associated = False

    def reply(self, action, nonce, params):
        msg = {"version": VERSION, "success": "true", "nonce": nonce, **params}
        ct = box(json.dumps(msg).encode(), unb64(nonce), self.client_pk, self.sk)
        return {"action": action, "message": b64(ct), "nonce": nonce}

    def decode(self, req):
        if not self.client_pk or not req.get("message") or not req.get("nonce"):
            return None
        plain = box_open(unb64(req["message"]), unb64(req["nonce"]), self.client_pk, self.sk)
        return json.loads(plain) if plain is not None else None

    def handle(self, req):
        s = load()
        action = req.get("action", "")
        if LOG:
            with open(LOG, "a", encoding="utf-8") as f:
                f.write(json.dumps({"action": action, "decrypted": self.decode(req) if action != "change-public-keys" else None}) + "\n")
        if action == "change-public-keys":
            if not req.get("publicKey") or not req.get("nonce"):
                return error(action, 3)
            self.client_pk = unb64(req["publicKey"])
            self.pk, self.sk = keypair()
            self.associated = False
            return {"action": action, "version": VERSION, "success": "true", "nonce": increment(req["nonce"]), "publicKey": b64(self.pk)}
        if not self.client_pk:
            return error(action, 3)
        if os.environ.get("FAKE_KPXC_LOCKED") == "1":
            return error(action, 1)
        m = self.decode(req)
        if m is None:
            return error(action, 4)
        nxt = increment(req["nonce"])
        if action == "associate":
            if m.get("key") != b64(self.client_pk):
                return error(action, 8)
            if os.environ.get("FAKE_KPXC_DENY_ASSOCIATE") == "1":
                return error(action, 6)
            name = "omnivault-" + uuidlib.uuid4().hex[:6]
            s["associations"][name] = m.get("idKey") or m.get("key")
            save(s)
            self.associated = True
            return self.reply(action, nxt, {"hash": s["hash"], "id": name})
        if action == "test-associate":
            if not m.get("key") or not m.get("id"):
                return error(action, 1)
            if s["associations"].get(m["id"]) != m["key"]:
                return error(action, 8)
            self.associated = True
            return self.reply(action, nxt, {"hash": s["hash"], "id": m["id"]})
        if not self.associated:
            return error(action, 8)
        if action == "get-database-entries":
            if os.environ.get("FAKE_KPXC_NO_LIST") == "1":
                return error(action, 19)
            return self.reply(action, nxt, {"entries": [{"title": e["title"], "uuid": e["uuid"], "url": e["url"]} for e in s["entries"]]})
        if action == "get-database-groups":
            return self.reply(action, nxt, {"groups": {"groups": [strip(s["groups"])]}})
        if action == "get-logins":
            if not m.get("url"):
                return error(action, 14)
            found = [e for e in s["entries"] if e["url"] and host(e["url"]) == host(m["url"])]
            if not found:
                return error(action, 15)
            names = group_names(s["groups"])
            return self.reply(action, nxt, {"count": len(found), "hash": s["hash"], "id": m.get("id", ""), "entries": [
                {"login": e["login"], "password": e["password"], "name": e["title"], "uuid": e["uuid"], "group": names.get(e["group"], ""),
                 **({"totp": e["totp"]} if e.get("totp") else {})} for e in found]})
        if action == "get-totp":
            e = next((e for e in s["entries"] if e["uuid"] == m.get("uuid")), None)
            if not e:
                return error(action, 18)
            return self.reply(action, nxt, {"totp": e.get("totp", "")})
        if action == "set-login":
            if not m.get("url"):
                return error(action, 14)
            if m.get("uuid"):
                e = next((e for e in s["entries"] if e["uuid"] == m["uuid"]), None)
                ok = e is not None
                if e:
                    e.update(login=m.get("login", ""), password=m.get("password", ""), url=m["url"])
            else:
                grp = m.get("groupUuid") or s["groups"]["uuid"]
                s["entries"].append({"uuid": uuidlib.uuid4().hex, "title": host(m["url"]), "url": m["url"], "login": m.get("login", ""),
                                     "password": m.get("password", ""), "group": grp})
                ok = True
            save(s)
            return self.reply(action, nxt, {"count": None, "entries": None, "error": "success" if ok else "error", "hash": s["hash"]})
        if action == "create-new-group":
            name = m.get("groupName", "")
            if not name:
                return error(action, 17)
            parent = s["groups"]
            for part in name.split("/"):
                child = next((c for c in parent["children"] if c["name"] == part), None)
                if not child:
                    child = {"name": part, "uuid": uuidlib.uuid4().hex, "children": []}
                    parent["children"].append(child)
                parent = child
            save(s)
            return self.reply(action, nxt, {"name": parent["name"], "uuid": parent["uuid"]})
        if action == "delete-entry":
            e = next((e for e in s["entries"] if e["uuid"] == m.get("uuid")), None)
            if not e:
                return error(action, 18)
            if os.environ.get("FAKE_KPXC_DENY_DELETE") == "1":
                return self.reply(action, nxt, {"success": "false"})
            e["group"] = "0" * 32  # recycle bin
            s["entries"] = [x for x in s["entries"] if x["uuid"] != e["uuid"]]
            s.setdefault("recycled", []).append(e)
            save(s)
            return self.reply(action, nxt, {"success": "true"})
        return error(action, 12)


def strip(g):
    return {"name": g["name"], "uuid": g["uuid"], "children": [strip(c) for c in g["children"]]}


def group_names(g, out=None):
    out = {} if out is None else out
    out[g["uuid"]] = g["name"]
    for c in g["children"]:
        group_names(c, out)
    return out


def main():
    session = Session()
    while True:
        req = read_msg()
        if req is None:
            return
        write_msg(session.handle(req))


if __name__ == "__main__":
    main()
