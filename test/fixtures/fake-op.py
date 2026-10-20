#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""Test double for the 1Password CLI `op` (subset used by OmniVault). State in $FAKE_OP_STATE.

Like op it checks item JSON before saving: known field types, MONTH_YEAR as YYYYMM, ADDRESS values as an object,
fields only in sections the item declares. Category templates follow the field ids of 1Password's built-in
categories; `selftest.py onepassword --write` checks them against the real `op`."""
import base64
import json
import os
import re
import sys
import uuid

FIELD_TYPES = {"STRING", "CONCEALED", "EMAIL", "URL", "DATE", "MONTH_YEAR", "PHONE", "OTP", "MENU", "ADDRESS",
               "CREDIT_CARD_NUMBER", "CREDIT_CARD_TYPE", "REFERENCE", "GENDER", "SSHKEY"}
TEMPLATES = {
    "Credit Card": {"title": "", "category": "CREDIT_CARD", "sections": [
        {"id": "contactInfo", "label": "Contact Information"}, {"id": "details", "label": "Additional Details"}], "fields": [
        {"id": "cardholder", "type": "STRING", "label": "cardholder name", "value": ""},
        {"id": "type", "type": "CREDIT_CARD_TYPE", "label": "type", "value": ""},
        {"id": "ccnum", "type": "CREDIT_CARD_NUMBER", "label": "number", "value": ""},
        {"id": "cvv", "type": "CONCEALED", "label": "verification number", "value": ""},
        {"id": "expiry", "type": "MONTH_YEAR", "label": "expiry date", "value": ""},
        {"id": "validFrom", "type": "MONTH_YEAR", "label": "valid from", "value": ""},
        {"id": "bank", "section": {"id": "contactInfo", "label": "Contact Information"}, "type": "STRING", "label": "issuing bank", "value": ""},
        {"id": "pin", "section": {"id": "details", "label": "Additional Details"}, "type": "CONCEALED", "label": "PIN", "value": ""},
        {"id": "notesPlain", "type": "STRING", "purpose": "NOTES", "label": "notesPlain", "value": ""}]},
    "Identity": {"title": "", "category": "IDENTITY", "sections": [
        {"id": "name", "label": "Identification"}, {"id": "address", "label": "Address"}, {"id": "internet", "label": "Internet Details"}], "fields": [
        {"id": "firstname", "section": {"id": "name", "label": "Identification"}, "type": "STRING", "label": "first name", "value": ""},
        {"id": "initial", "section": {"id": "name", "label": "Identification"}, "type": "STRING", "label": "initial", "value": ""},
        {"id": "lastname", "section": {"id": "name", "label": "Identification"}, "type": "STRING", "label": "last name", "value": ""},
        {"id": "birthdate", "section": {"id": "name", "label": "Identification"}, "type": "DATE", "label": "birth date", "value": ""},
        {"id": "company", "section": {"id": "name", "label": "Identification"}, "type": "STRING", "label": "company", "value": ""},
        {"id": "address", "section": {"id": "address", "label": "Address"}, "type": "ADDRESS", "label": "address", "value": None},
        {"id": "defphone", "section": {"id": "address", "label": "Address"}, "type": "PHONE", "label": "default phone", "value": ""},
        {"id": "username", "section": {"id": "internet", "label": "Internet Details"}, "type": "STRING", "label": "username", "value": ""},
        {"id": "email", "section": {"id": "internet", "label": "Internet Details"}, "type": "EMAIL", "label": "email", "value": ""},
        {"id": "notesPlain", "type": "STRING", "purpose": "NOTES", "label": "notesPlain", "value": ""}]},
}

STATE = os.environ["FAKE_OP_STATE"]
LOG = os.environ.get("FAKE_OP_LOG")


def load():
    if not os.path.exists(STATE):
        seed = {"vaults": [{"id": "v1", "name": "Private"}, {"id": "v2", "name": "Arbeit"}], "items": [
            {"id": "aaa1", "title": "GitHub", "category": "LOGIN", "vault": {"id": "v1", "name": "Private"},
             "fields": [{"id": "username", "type": "STRING", "purpose": "USERNAME", "value": "ada"},
                        {"id": "password", "type": "CONCEALED", "purpose": "PASSWORD", "value": "op-secret"},
                        {"label": "one-time password", "type": "OTP", "value": "otpauth://totp/x?secret=JBSWY3DPEHPK3PXP"}],
             "urls": [{"href": "https://github.com", "primary": True}], "additional_information": "ada",
             "files": [{"id": "f1lekey", "name": "recovery codes.txt", "size": 18, "content_path": "/v1/vaults/v1/items/aaa1/files/f1lekey/content"}],
             "_content": {"f1lekey": base64.b64encode(b"code-1\ncode-2\nend\n"[:18]).decode()}},
            {"id": "eee5", "title": "Vertrag.pdf", "category": "DOCUMENT", "vault": {"id": "v1", "name": "Private"},
             "fields": [{"id": "notesPlain", "type": "STRING", "purpose": "NOTES", "value": ""}],
             "files": [{"id": "d0cfile", "name": "Vertrag.pdf", "size": 8, "content_path": "/v1/vaults/v1/items/eee5/files/d0cfile/content"}],
             "_content": {"d0cfile": base64.b64encode(b"%PDF-1.7").decode()}, "urls": [], "additional_information": "8 B"},
            {"id": "ccc3", "title": "Bank", "category": "LOGIN", "vault": {"id": "v1", "name": "Private"}, "favorite": True,
             "fields": [{"id": "username", "type": "STRING", "purpose": "USERNAME", "value": "ada"},
                        {"id": "password", "type": "CONCEALED", "purpose": "PASSWORD", "value": "bank-pw",
                         "password_details": {"strength": "FAIR", "history": ["bank-alt-2", "bank-alt-1"]}},
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


def die(msg):
    print(f"[ERROR] {msg}", file=sys.stderr)
    sys.exit(1)


def validate(doc):
    """What op checks of an item JSON (subset): field types, value formats, section references."""
    if not isinstance(doc.get("fields", []), list):
        die("invalid item template: fields must be an array")
    sections = {s.get("id") for s in doc.get("sections") or []}
    for f in doc.get("fields") or []:
        ftype, val = f.get("type"), f.get("value")
        if ftype not in FIELD_TYPES:
            die(f'invalid field type "{ftype}" for field "{f.get("id")}"')
        if ftype == "ADDRESS":
            if val not in (None, "") and not isinstance(val, dict):
                die(f'validation failed: field "{f.get("id")}" Requires one of [object] value')
        elif val is not None and not isinstance(val, str):
            die("cannot unmarshal object into Go struct field ItemField.fields.value of type string")
        if ftype == "MONTH_YEAR" and val and not re.match(r"^\d{4}(0[1-9]|1[0-2])$", val):
            die(f'invalid value "{val}" for field "{f.get("id")}": expected YYYYMM')
        sid = (f.get("section") or {}).get("id")
        if sid and sid not in sections:
            die(f'field "{f.get("id")}" references section "{sid}", which is not part of the item')


def derive_card(it):
    """Like op: the card type follows from the number."""
    if it.get("category") != "CREDIT_CARD":
        return
    num = next((f.get("value") or "" for f in it.get("fields", []) if f.get("id") == "ccnum"), "")
    for f in it.get("fields", []):
        if f.get("id") == "type" and num.startswith("4"):
            f["value"] = "visa"
    it["additional_information"] = f"{num[:4]} ****" if num else ""


def write_out(path, data):
    """--out-file: like op, never overwrites an existing file."""
    if os.path.exists(path):
        die(f"{path} already exists")
    with open(path, "wb") as f:
        f.write(data)


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
    if a[:3] == ["item", "template", "get"]:
        tpl = TEMPLATES.get(a[3]) if len(a) > 3 else None
        if not tpl:
            die('"%s" isn\'t a category' % (a[3] if len(a) > 3 else ""))
        print(json.dumps(tpl))
        return
    if a[:1] == ["read"]:
        ref = a[-1]
        m = re.match(r"^op://([^/]+)/([^/]+)/([^/?]+)$", ref)
        it = next((i for i in s["items"] if m and i["id"] == m.group(2) and i["vault"]["id"] == m.group(1)), None)
        f = next((f for f in (it or {}).get("files", []) if f["id"] == m.group(3)), None) if it else None
        if not f:
            die(f'could not read secret "{ref}": no item or file found')
        data = base64.b64decode(it["_content"][f["id"]])
        if "--out-file" in a:
            write_out(flag(a, "--out-file"), data)
        else:
            sys.stdout.buffer.write(data)
        return
    if a[:2] == ["document", "get"]:
        it = next((i for i in s["items"] if i["id"] == a[2] and i["category"] == "DOCUMENT"), None)
        if not it or ("--vault" in a and flag(a, "--vault") != it["vault"]["id"]):
            die('"%s" isn\'t a document in this vault' % a[2])
        data = base64.b64decode(it["_content"][it["files"][0]["id"]])
        if "--out-file" in a:
            write_out(flag(a, "--out-file"), data)
        else:
            sys.stdout.buffer.write(data)
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
        public = {k: v for k, v in it.items() if not k.startswith("_")}
        print(json.dumps({**public, "version": it.get("version", 1), "updated_at": it.get("updated_at", "2026-01-01T10:00:00Z")}))
        return
    if a[:2] == ["item", "create"]:
        doc = stdin_doc()
        validate(doc)
        if doc.get("category") not in {"LOGIN", "SECURE_NOTE", "CREDIT_CARD", "IDENTITY", "PASSWORD"}:
            die('"%s" isn\'t a supported category' % doc.get("category"))
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
        derive_card(doc)
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
            validate(doc)
            if doc.get("category", it["category"]) != it["category"]:
                die("the category of an item cannot be changed")
            # like op: the template replaces the item's content (fields, sections, urls, title)
            it["fields"] = doc.get("fields", [])
            it["sections"] = doc.get("sections", [])
            it["urls"] = doc.get("urls", [])
            it["title"] = doc.get("title", "")
        if flag(a, "--favorite") is not None:
            it["favorite"] = flag(a, "--favorite") == "true"
        it["additional_information"] = next((f["value"] for f in it["fields"] if f.get("purpose") == "USERNAME"), "")
        derive_card(it)
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
