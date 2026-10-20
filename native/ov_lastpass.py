# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""
LastPass backend via the official `lpass` CLI (lastpass-cli 1.x). `lpass ls` lists without secrets; `reveal`
uses `lpass show --json`. Writes feed `Field: value` lines to `lpass add/edit --non-interactive` over stdin.
Attachments: `lpass show` lists them as fields named `att-<id>`; `lpass show --attach=att-<id> --quiet` prints one.
"""
import json
import re

from ov_common import HostError, assert_unchanged, attachment_result, check_id, run, run_binary, which

ATTACH_ID = re.compile(r"^att-[0-9]+(-[0-9]+)?$")
SEP = "\x1f"  # between field name and value in our --format (not part of names or file names)


def lp_bin():
    b = which("lpass", "OMNIVAULT_LPASS_BIN")
    if not b:
        raise HostError("`lpass` (LastPass CLI) wurde nicht gefunden.")
    return b

def lp_status(_a):
    b = which("lpass", "OMNIVAULT_LPASS_BIN")
    if not b:
        return {"cli": None, "ready": False}
    proc = run(b, ["status", "-q"], check=False)
    return {"cli": b, "ready": proc.returncode == 0, "loggedIn": proc.returncode == 0}

def lp_list(_a):
    # tab-separated id, fullname, username, url — no secrets
    proc = run(lp_bin(), ["ls", "--format", "%ai\t%aN\t%au\t%al"])
    items = []
    for line in proc.stdout.splitlines():
        parts = line.split("\t")
        if len(parts) < 2 or not parts[0]:
            continue
        iid, fullname = parts[0], parts[1]
        username = parts[2] if len(parts) > 2 else ""
        url = parts[3] if len(parts) > 3 else ""
        group = "/".join(fullname.split("/")[:-1]) or None
        items.append({"id": iid, "name": fullname.split("/")[-1], "username": username,
                      "uris": [url] if url and url != "http://" else [], "folder": group, "hasTotp": False})
    return {"items": items}

def lp_show(iid):
    data = run(lp_bin(), ["show", "--json", check_id(iid, "Eintrags-ID")]).stdout
    try:
        arr = json.loads(data or "[]")
    except json.JSONDecodeError:
        arr = []
    if not arr:
        raise HostError("Eintrag nicht gefunden")
    return arr[0]

def lp_attachments(iid):
    """Attachments of an entry: the `att-…` lines of `lpass show` (field format: name SEP value). Fields come
    before the notes, so reading stops at "Reprompt"/"Notes"."""
    out = run(lp_bin(), ["show", "--color=never", "--title-format=", f"--format=%fn{SEP}%fv", check_id(iid, "Eintrags-ID")]).stdout
    found = []
    for line in out.splitlines():
        name, sep, value = line.partition(SEP)
        if not sep:
            continue
        if name in ("Reprompt", "Notes"):
            break
        if ATTACH_ID.match(name):
            found.append({"id": name, "fileName": value, "size": 0})
    return found


def lp_attachment(a):
    iid = check_id(a.get("id"), "Eintrags-ID")
    fid = check_id(a.get("fileId"), "Anhang-ID", ATTACH_ID)
    meta = next((x for x in lp_attachments(iid) if x["id"] == fid), None)
    if meta is None:
        raise HostError("Anhang nicht gefunden")
    return attachment_result(meta["fileName"], run_binary(lp_bin(), ["show", f"--attach={fid}", "--quiet", iid]))


def lp_reveal(a):
    e = lp_show(a.get("id"))
    note = e.get("note") or ""
    is_note = not (e.get("username") or e.get("password") or e.get("url") not in ("", "http://", None))
    return {
        "id": e.get("id"), "name": e.get("name") or "", "username": e.get("username") or "",
        "password": e.get("password") or "", "uris": [e["url"]] if e.get("url") and e["url"] != "http://" else [],
        "totp": "", "notes": note, "type": "note" if is_note else "login",
        "folder": e.get("group") or None, "revision": e.get("last_modified_gmt") or None,
        "attachments": lp_attachments(e.get("id") or a.get("id")),
    }

def lp_body(a):
    lines = []
    if a.get("username"):
        lines.append(f"Username: {a['username']}")
    if a.get("password"):
        lines.append(f"Password: {a['password']}")
    for u in a.get("uris") or []:
        if u:
            lines.append(f"URL: {u}")
            break
    if a.get("notes"):
        lines.append(f"Notes: {a['notes']}")
    return "\n".join(lines) + "\n"

def lp_name(a):
    folder = a.get("folder")
    name = a.get("name") or "Ohne Namen"
    return f"{folder}/{name}" if folder else name

def lp_create(a):
    run(lp_bin(), ["add", lp_name(a), "--non-interactive", "--sync=now"], stdin=lp_body(a))
    # lpass add does not print the id; the extension re-syncs to pick it up
    return {"id": None}

def lp_update(a):
    iid = check_id(a.get("id"), "Eintrags-ID")
    if a.get("revision"):
        assert_unchanged(a["revision"], lp_show(iid).get("last_modified_gmt"))
    run(lp_bin(), ["edit", iid, "--non-interactive", "--sync=now"], stdin=lp_body(a))
    return {"id": iid, "revision": lp_show(iid).get("last_modified_gmt") or None}

def lp_delete(a):
    run(lp_bin(), ["rm", check_id(a.get("id"), "Eintrags-ID"), "--sync=now"])
    return {"deleted": True}

COMMANDS = {"status": lp_status, "list": lp_list, "reveal": lp_reveal,
      "create": lp_create, "update": lp_update, "delete": lp_delete, "attachment": lp_attachment}
