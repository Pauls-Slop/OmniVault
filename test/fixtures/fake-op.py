#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""Test double for the 1Password CLI `op` (subset used by OmniVault). State in $FAKE_OP_STATE."""
import json
import os
import sys
import uuid

STATE = os.environ["FAKE_OP_STATE"]
LOG = os.environ.get("FAKE_OP_LOG")


def load():
    if not os.path.exists(STATE):
        seed = {"vaults": [{"id": "v1", "name": "Private"}, {"id": "v2", "name": "Arbeit"}], "items": [
            {"id": "aaa1", "title": "GitHub", "category": "LOGIN", "vault": {"id": "v1", "name": "Private"},
             "fields": [{"id": "username", "type": "STRING", "purpose": "USERNAME", "value": "ada"},
                        {"id": "password", "type": "CONCEALED", "purpose": "PASSWORD", "value": "op-secret"},
                        {"label": "one-time password", "type": "OTP", "value": "otpauth://totp/x?secret=JBSWY3DPEHPK3PXP"}],
             "urls": [{"href": "https://github.com", "primary": True}], "additional_information": "ada"},
            {"id": "ccc3", "title": "Bank", "category": "LOGIN", "vault": {"id": "v1", "name": "Private"}, "favorite": True,
             "fields": [{"id": "username", "type": "STRING", "purpose": "USERNAME", "value": "ada"},
                        {"id": "password", "type": "CONCEALED", "purpose": "PASSWORD", "value": "bank-pw"},
                        {"id": "kdnr", "type": "STRING", "label": "Kundennummer", "value": "K-77"},
                        {"id": "pin", "type": "CONCEALED", "label": "PIN", "value": "4711", "section": {"id": "extra"}}],
             "sections": [{"id": "extra", "label": "Extra"}],
             "urls": [{"href": "https://bank.example", "primary": True}], "additional_information": "ada"},
            {"id": "ddd4", "title": "Visa", "category": "CREDIT_CARD", "vault": {"id": "v1", "name": "Private"},
             "fields": [{"id": "cardholder", "type": "STRING", "label": "cardholder name", "value": "Ada Lovelace"},
                        {"id": "ccnum", "type": "CREDIT_CARD_NUMBER", "label": "number", "value": "4111111111111111"},
                        {"id": "cvv", "type": "CONCEALED", "label": "verification number", "value": "123"},
                        {"id": "expiry", "type": "MONTH_YEAR", "label": "expiry date", "value": "203012"}],
             "urls": [], "additional_information": "4111 ****"},
            {"id": "bbb2", "title": "Notiz", "category": "SECURE_NOTE", "vault": {"id": "v1", "name": "Private"},
             "fields": [{"id": "notesPlain", "type": "STRING", "purpose": "NOTES", "value": "streng geheim"}],
             "urls": [], "additional_information": ""},
        ]}
        save(seed)
    with open(STATE, encoding="utf-8") as f:
        return json.load(f)


def save(s):
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(s, f)


def summary(it):
    return {"id": it["id"], "title": it["title"], "version": it.get("version", 1), "vault": it["vault"], "category": it["category"],
            "favorite": it.get("favorite", False), "updated_at": it.get("updated_at", "2026-01-01T10:00:00Z"),
            "additional_information": it.get("additional_information", ""), "urls": it.get("urls", [])}


def bump(it):
    """Like op: every change raises the item's version and its updated_at."""
    it["version"] = it.get("version", 1) + 1
    it["updated_at"] = "2026-10-%02dT10:00:00Z" % min(28, it["version"])


def stdin_doc():
    data = sys.stdin.read()
    return json.loads(data) if data.strip() else None


def flag(a, name):
    return a[a.index(name) + 1] if name in a else None


def main():
    a = sys.argv[1:]
    if LOG:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(a) + "\n")
    if a[:1] == ["whoami"]:
        if os.environ.get("FAKE_OP_LOGGED_OUT") == "1":
            print("[ERROR] you are not currently signed in", file=sys.stderr)
            sys.exit(1)
        print(json.dumps({"url": "https://my.1password.com", "email": "ada@1p.me", "user_uuid": "u1"}))
        return
    s = load()
    if a[:2] == ["vault", "list"]:
        print(json.dumps(s["vaults"]))
        return
    if a[:2] == ["vault", "create"]:
        v = {"id": "v" + uuid.uuid4().hex[:6], "name": a[2]}
        s["vaults"].append(v)
        save(s)
        print(json.dumps(v))
        return
    if a[:2] == ["item", "move"]:
        it = next((i for i in s["items"] if i["id"] == a[2]), None)
        dest = next((v for v in s["vaults"] if v["id"] == flag(a, "--destination-vault")), None)
        if not it or not dest or flag(a, "--current-vault") != it["vault"]["id"]:
            print("[ERROR] cannot move", file=sys.stderr)
            sys.exit(1)
        it["id"] = "m" + uuid.uuid4().hex[:6]  # like 1Password: a moved item gets a new id
        it["vault"] = dest
        save(s)
        print(json.dumps(it))
        return
    if a[:2] == ["item", "list"]:
        print(json.dumps([summary(i) for i in s["items"]]))
        return
    if a[:2] == ["item", "get"]:
        iid = a[2]
        it = next((i for i in s["items"] if i["id"] == iid), None)
        if not it:
            print("[ERROR] item not found", file=sys.stderr)
            sys.exit(1)
        print(json.dumps({**it, "version": it.get("version", 1), "updated_at": it.get("updated_at", "2026-01-01T10:00:00Z")}))
        return
    if a[:2] == ["item", "create"]:
        doc = stdin_doc()
        vault = {"id": "v1", "name": "Private"}
        if "--vault" in a:
            vid = flag(a, "--vault")
            vault = next((v for v in s["vaults"] if v["id"] == vid), {"id": vid, "name": vid})
        doc["favorite"] = "--favorite" in a
        doc["id"] = "n" + uuid.uuid4().hex[:6]
        doc["version"] = 1
        doc["vault"] = vault
        up = doc.get("fields", [])
        doc["additional_information"] = next((f["value"] for f in up if f.get("purpose") == "USERNAME"), "")
        s["items"].append(doc)
        save(s)
        print(json.dumps(doc))
        return
    if a[:2] == ["item", "edit"]:
        iid = a[2]
        it = next((i for i in s["items"] if i["id"] == iid), None)
        if not it:
            print("[ERROR] item not found", file=sys.stderr)
            sys.exit(1)
        if "-" in a[3:]:
            print("[ERROR] '-' is not a valid assignment statement", file=sys.stderr)
            sys.exit(1)
        doc = stdin_doc()
        if doc is not None:
            # like op: the template replaces the item's content (fields, sections, urls, title)
            it["fields"] = doc.get("fields", [])
            it["sections"] = doc.get("sections", [])
            it["urls"] = doc.get("urls", [])
            it["title"] = doc.get("title", "")
        if flag(a, "--favorite") is not None:
            it["favorite"] = flag(a, "--favorite") == "true"
        it["additional_information"] = next((f["value"] for f in it["fields"] if f.get("purpose") == "USERNAME"), "")
        bump(it)
        save(s)
        print(json.dumps(it))
        return
    if a[:2] == ["item", "delete"]:
        iid = a[2]
        s["items"] = [i for i in s["items"] if i["id"] != iid]
        save(s)
        return
    print(f"[ERROR] unsupported fake op command {a}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
