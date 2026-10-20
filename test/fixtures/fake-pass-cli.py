#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""
Test double for the Proton Pass CLI. Emits the JSON shapes of pass-cli 2.x (serde defaults of
proton-pass-types 2.1.1: externally tagged enums, snake_case fields). State lives in $FAKE_PASS_STATE,
every invocation is appended to $FAKE_PASS_LOG. $FAKE_PASS_LOGGED_OUT=1 simulates a missing session.
"""
import base64
import json
import os
import sys
import uuid

STATE = os.environ["FAKE_PASS_STATE"]
LOG = os.environ.get("FAKE_PASS_LOG")
LOGIN_URI = os.environ.get("FAKE_PASS_LOGIN_URI", "https://mail.proton.me/login")


def item(share, iid, title, content, note="", extra=None, state="Active"):
    return {"item": {
        "id": iid, "share_id": share, "vault_id": "v-" + share, "state": state, "flags": [],
        "create_time": "2026-01-01T10:00:00", "modify_time": "2026-02-01T10:00:00",
        "content": {"title": title, "note": note, "item_uuid": uuid.uuid4().hex[:8], "content": content,
                    "extra_fields": extra or [], "platform_specific": None, "custom_icon": None},
    }, "attachments": []}


def seed():
    return {
        "vaults": [{"name": "Persönlich", "vault_id": "v-s1", "share_id": "s1"}, {"name": "Arbeit", "vault_id": "v-s2", "share_id": "s2"}],
        "items": [
            item("s1", "i1", "Proton Mail", {"Login": {"email": "ada@proton.me", "username": "", "password": "proton-pw",
                 "urls": [LOGIN_URI], "totp_uri": "otpauth://totp/x?secret=JBSWY3DPEHPK3PXP", "passkeys": [], "autofill_urls": []}},
                 note="Wiederherstellung im Safe", extra=[{"name": "Recovery", "content": {"Hidden": "abc-def"}},
                                                         {"name": "Hinweis", "content": {"Text": "Hauptkonto"}}]),
            item("s1", "i2", "Visa", {"CreditCard": {"cardholder_name": "Ada L", "card_type": "Visa", "number": "4111111111111111",
                 "verification_number": "321", "expiration_date": "2028-09", "pin": "1234"}}),
            item("s1", "i3", "Reisepass", {"Identity": {"full_name": "Ada Lovelace", "email": "ada@example.org", "phone_number": "+49 30 1",
                 "first_name": "Ada", "middle_name": "", "last_name": "Lovelace", "passport_number": "C99", "city": "Berlin"}}),
            item("s1", "i4", "Deploy-Key", {"SshKey": {"private_key": "-----BEGIN OPENSSH PRIVATE KEY-----\nxx\n-----END OPENSSH PRIVATE KEY-----",
                 "public_key": "ssh-ed25519 AAAA ada", "sections": []}}),
            {**item("s1", "i5", "Gedanken", {"Note": None}, note="streng geheim"), "attachments": [
                {"id": "att_A1", "size": 10, "encryption_version": 1, "content": {"name": "skizze.txt", "mime_type": "text/plain"},
                 "chunks": [{"chunk_id": "c1", "index": 0, "size": 10}], "encrypted_file_key": [1, 2, 3]}],
             "_files": {"att_A1": "aGFsbG8gd2VsdA=="}},
            item("s1", "i6", "Alt", {"Login": {"email": "", "username": "old", "password": "x", "urls": [], "totp_uri": "", "passkeys": [], "autofill_urls": []}}, state="Trashed"),
            item("s2", "i7", "Wiki Arbeit", {"Login": {"email": "", "username": "ada", "password": "wiki-pw",
                 "urls": ["https://wiki.example.com"], "totp_uri": "", "passkeys": [], "autofill_urls": []}}),
        ],
    }


def load():
    if not os.path.exists(STATE):
        save(seed())
    with open(STATE, encoding="utf-8") as f:
        return json.load(f)


def save(s):
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(s, f)


def opt(args, name):
    return args[args.index(name) + 1] if name in args else None


def fail(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)


def main():
    a = sys.argv[1:]
    if LOG:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(a) + "\n")
    if a[:1] == ["--version"]:
        print("pass-cli 2.2.4 (fake)")
        return
    if os.environ.get("FAKE_PASS_LOGGED_OUT") == "1":
        # exact output of pass-cli 2.3.1 without a session (with RUST_BACKTRACE=1 a backtrace follows)
        print("\x1b[2m2026-10-14T16:15:31Z\x1b[0m \x1b[31mERROR\x1b[0m pass-cli/src/main.rs:332: Command is not logout there is no session", file=sys.stderr)
        print("Error: This operation requires an authenticated client", file=sys.stderr)
        if os.environ.get("RUST_BACKTRACE") == "1":
            print("\nStack backtrace:\n   0: anyhow::error::msg\n  13: _start", file=sys.stderr)
        sys.exit(1)
    if os.environ.get("FAKE_PASS_LOCKED") == "1":
        print("Error: Error reading lock code", file=sys.stderr)
        sys.exit(1)
    if not sys.stdin.isatty() and a[:3] != ["item", "create", "login"] and a[:3] != ["item", "create", "note"]:
        # pass-cli must never be handed the browser pipe: with the host it gets /dev/null here
        if os.environ.get("FAKE_PASS_CHECK_STDIN") == "1" and os.path.realpath("/proc/self/fd/0") != "/dev/null":
            fail("Error: stdin is not /dev/null")
    s = load()
    if a[:1] == ["info"] and "--output" in a:
        print(json.dumps({"release_track": "stable", "user_id": "u1", "username": "ada", "email": "ada@proton.me", "session_has_lock": False}))
        return
    if a[:1] == ["info"]:
        print("- Release track: stable\n- ID: u1\n- Username: ada\n- Email: ada@proton.me\n- Session has lock: no")
        return
    if a[:2] == ["vault", "list"]:
        print(json.dumps({"vaults": s["vaults"]}))
        return
    if a[:2] == ["item", "list"]:
        share = opt(a, "--share-id")
        out = [{"id": d["item"]["id"], "share_id": share, "vault_id": d["item"]["vault_id"], "state": d["item"]["state"], "flags": [],
                "create_time": d["item"]["create_time"], "modify_time": d["item"]["modify_time"], "title": d["item"]["content"]["title"],
                "item_type": next(iter(d["item"]["content"]["content"])).lower()} for d in s["items"] if d["item"]["share_id"] == share]
        print(json.dumps({"items": out}))
        return
    if a[:2] == ["item", "view"]:
        share, iid = opt(a, "--share-id"), opt(a, "--item-id")
        for d in s["items"]:
            if d["item"]["share_id"] == share and d["item"]["id"] == iid:
                print(json.dumps({k: v for k, v in d.items() if not k.startswith("_")}))
                return
        fail("Error: Item not found")
    if a[:3] == ["item", "attachment", "download"]:
        share, iid, att, out = opt(a, "--share-id"), opt(a, "--item-id"), opt(a, "--attachment-id"), opt(a, "--output")
        if not out:
            fail("error: the following required arguments were not provided:\n  --output <OUTPUT>", 2)
        d = next((d for d in s["items"] if d["item"]["share_id"] == share and d["item"]["id"] == iid), None)
        if not d:
            fail("Error: Error retrieving item")
        if att not in d.get("_files", {}):
            fail("Error: Attachment not found")
        print("Downloading attachment...")
        with open(out, "wb") as f:
            f.write(base64.b64decode(d["_files"][att]))
        print(f"Successfully downloaded attachment to: {out}")
        return
    if a[:2] == ["item", "create"]:
        share = opt(a, "--share-id")
        tpl = json.load(sys.stdin)
        iid = "n" + uuid.uuid4().hex[:6]
        if a[2] == "login":
            content = {"Login": {"email": tpl.get("email") or "", "username": tpl.get("username") or "", "password": tpl.get("password") or "",
                                 "urls": tpl.get("urls") or [], "totp_uri": tpl.get("totp_uri") or "", "passkeys": [], "autofill_urls": []}}
            note = ""
        else:
            content, note = {"Note": None}, tpl.get("note") or ""
        s["items"].append(item(share, iid, tpl["title"], content, note=note))
        save(s)
        print(iid)
        return
    if a[:2] == ["item", "update"]:
        share, iid = opt(a, "--share-id"), opt(a, "--item-id")
        d = next((d for d in s["items"] if d["item"]["share_id"] == share and d["item"]["id"] == iid), None)
        if not d:
            fail("Error: Item not found")
        c = d["item"]["content"]
        login = c["content"].get("Login") if isinstance(c["content"], dict) else None
        for i, x in enumerate(a):
            if x == "--field":
                k, v = a[i + 1].split("=", 1)
                if k == "title":
                    c["title"] = v
                elif k == "note":
                    c["note"] = v
                elif k == "url" and login is not None:
                    login["urls"] = [v] + login["urls"][1:]
                elif k in ("username", "password", "email") and login is not None:
                    login[k] = v
                else:
                    fail(f"Error: unknown field {k}")
        # like Proton: every change moves the modification time forward
        d["item"]["modify_time"] = "2026-10-%02dT10:00:00" % (int(d["item"]["modify_time"][8:10]) % 28 + 1)
        save(s)
        print("Item updated successfully")
        return
    if a[:2] in (["item", "trash"], ["item", "untrash"], ["item", "move"]) and os.environ.get("FAKE_PASS_OLD") == "1":
        fail(f"error: unrecognized subcommand '{a[1]}'", 2)
    if a[:2] in (["item", "trash"], ["item", "untrash"]):
        share, iid = opt(a, "--share-id"), opt(a, "--item-id")
        d = next((d for d in s["items"] if d["item"]["share_id"] == share and d["item"]["id"] == iid), None)
        if not d:
            fail("Error: Item not found")
        d["item"]["state"] = "Trashed" if a[1] == "trash" else "Active"
        save(s)
        return
    if a[:2] == ["item", "move"]:
        share, iid, to = opt(a, "--from-share-id"), opt(a, "--item-id"), opt(a, "--to-share-id")
        d = next((d for d in s["items"] if d["item"]["share_id"] == share and d["item"]["id"] == iid), None)
        if not d or to not in [v["share_id"] for v in s["vaults"]]:
            fail("Error: Item or vault not found")
        # moving creates the item anew in the target vault; this version prints nothing
        d["item"]["share_id"], d["item"]["vault_id"], d["item"]["id"] = to, "v-" + to, "m" + uuid.uuid4().hex[:6]
        save(s)
        return
    if a[:2] == ["item", "delete"]:
        share, iid = opt(a, "--share-id"), opt(a, "--item-id")
        s["items"] = [d for d in s["items"] if not (d["item"]["share_id"] == share and d["item"]["id"] == iid)]
        save(s)
        return
    fail(f"Error: unsupported fake command {a}")


if __name__ == "__main__":
    main()
