#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""Test double for the LastPass CLI `lpass` (subset used by OmniVault). State in $FAKE_LPASS_STATE."""
import base64
import json
import os
import re
import sys
import uuid

STATE = os.environ["FAKE_LPASS_STATE"]
LOG = os.environ.get("FAKE_LPASS_LOG")


def load():
    if not os.path.exists(STATE):
        seed = {"items": [
            {"id": "1001", "name": "GitHub", "group": "Arbeit", "fullname": "Arbeit/GitHub",
             "username": "ada", "password": "lp-secret", "url": "https://github.com", "note": "att-9-1: nur Text",
             "attachments": [{"id": "1001-77", "filename": "backup codes.txt", "data": "Y29kZS0xCmNvZGUtMgo="},
                             {"id": "1001-78", "filename": "scan.png", "data": "iVBORw0KGgoAAAA="}]},
            {"id": "1002", "name": "Gedanke", "group": "", "fullname": "Gedanke",
             "username": "", "password": "", "url": "http://", "note": "nur text"},
        ]}
        save(seed)
    with open(STATE, encoding="utf-8") as f:
        return json.load(f)


def save(s):
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(s, f)


def read_fields():
    data = sys.stdin.read()
    out = {}
    for line in data.split("\n"):
        m = re.match(r"(Username|Password|URL|Notes):\s?(.*)$", line)
        if m:
            out[m.group(1).lower()] = m.group(2)
    return out


def main():
    a = sys.argv[1:]
    if LOG:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(a) + "\n")
    if a[:1] == ["status"]:
        sys.exit(1 if os.environ.get("FAKE_LPASS_LOGGED_OUT") == "1" else 0)
    s = load()
    if a[:1] == ["ls"]:
        fmt = a[a.index("--format") + 1] if "--format" in a else "%ai\t%aN\t%au\t%al"
        for it in s["items"]:
            line = (fmt.replace("%ai", it["id"]).replace("%aN", it["fullname"])
                    .replace("%au", it.get("username", "")).replace("%al", it.get("url", "")))
            print(line)
        return
    if a[:1] == ["show"]:
        iid = a[-1]
        it = next((i for i in s["items"] if i["id"] == iid), None)
        if not it:
            print("Error: Could not find specified account.", file=sys.stderr)
            sys.exit(1)
        attach = next((x.split("=", 1)[1] for x in a if x.startswith("--attach=")), None)
        if attach is not None:
            att = next((x for x in it.get("attachments", []) if "att-" + x["id"] == attach), None)
            if not att:
                print(f"Error: Could not find specified attachment '{attach}'.", file=sys.stderr)
                sys.exit(1)
            if "--quiet" not in a:  # lpass would ask whether to print a binary file
                print("Error: no prompt possible", file=sys.stderr)
                sys.exit(1)
            sys.stdout.buffer.write(base64.b64decode(att["data"]))
            return
        fmt = next((x.split("=", 1)[1] for x in a if x.startswith("--format=")), None)
        if "--json" not in a:  # like lpass show: title line, fields, attachments, then the notes
            fmt = fmt or "%fn: %fv"
            title = next((x.split("=", 1)[1] for x in a if x.startswith("--title-format=")), "%an [id: %ai]")
            print(title.replace("%an", it["name"]).replace("%ai", it["id"]))
            rows = [("Username", it["username"]), ("Password", it["password"])]
            rows += [("URL", it["url"])] if it["url"] and it["url"] != "http://" else []
            rows += [("att-" + x["id"], x["filename"]) for x in it.get("attachments", [])]
            rows += [("Notes", it["note"])] if it["note"] else []
            for name, value in rows:
                if value:
                    print(fmt.replace("%fn", name).replace("%fv", value))
            return
        it = {k: v for k, v in it.items() if k != "attachments"}  # --json does not list attachments
        print(json.dumps([{**it, "last_modified_gmt": it.get("last_modified_gmt", "1700000000"), "last_touch": "1700000000"}]))
        return
    if a[:1] == ["add"]:
        name = a[1]
        f = read_fields()
        group = "/".join(name.split("/")[:-1])
        it = {"id": str(1000 + len(s["items"]) + int(uuid.uuid4().int % 1000)), "name": name.split("/")[-1],
              "group": group, "fullname": name, "username": f.get("username", ""), "password": f.get("password", ""),
              "url": f.get("url", "http://"), "note": f.get("notes", "")}
        s["items"].append(it)
        save(s)
        return
    if a[:1] == ["edit"]:
        iid = a[1]
        it = next((i for i in s["items"] if i["id"] == iid), None)
        if not it:
            print("Error: Could not find specified account.", file=sys.stderr)
            sys.exit(1)
        f = read_fields()
        for k, col in (("username", "username"), ("password", "password"), ("url", "url"), ("notes", "note")):
            if k in f:
                it[col] = f[k]
        it["last_modified_gmt"] = str(int(it.get("last_modified_gmt", "1700000000")) + 1)
        save(s)
        return
    if a[:1] == ["rm"]:
        iid = a[1]
        s["items"] = [i for i in s["items"] if i["id"] != iid]
        save(s)
        return
    print(f"Error: unsupported fake lpass command {a}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
