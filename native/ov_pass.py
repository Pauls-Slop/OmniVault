# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""
pass backend (zx2c4 password-store + gpg). Each entry is a gpg file; line 1 is the password, the rest is
freeform metadata (`login:`, `url:`, `otpauth://…`). Entries are read from the store directory (no `tree`).
"""
import os
import re

from ov_common import VERSION, HostError, check_id, run, which


def pass_bin():
    b = which("pass", "OMNIVAULT_PASS_BIN")
    if not b:
        raise HostError("`pass` wurde nicht gefunden. Bitte das Programm „pass“ (password-store) installieren.")
    return b


def pass_store_dir():
    return os.environ.get("PASSWORD_STORE_DIR") or os.path.expanduser("~/.password-store")


def pass_entries():
    """Entry names (paths without the .gpg suffix), read from the store directory (no `tree` needed)."""
    root = pass_store_dir()
    out = []
    for dirpath, _dirs, files in os.walk(root):
        for f in files:
            if f.endswith(".gpg"):
                rel = os.path.relpath(os.path.join(dirpath, f), root)
                out.append(rel[:-4].replace(os.sep, "/"))
    return sorted(out)


def pass_parse(name, text):
    """pass convention: line 0 = password; following lines are freeform, usually `key: value`."""
    lines = text.split("\n")
    password = lines[0] if lines else ""
    username = ""
    uris = []
    totp = ""
    notes_lines = []
    fields = []
    for line in lines[1:]:
        low = line.lower()
        m = re.match(r"\s*([A-Za-z0-9 _-]+)\s*:\s*(.*)$", line)
        key = m.group(1).strip().lower() if m else ""
        val = m.group(2).strip() if m else ""
        if line.strip().startswith("otpauth://"):
            totp = line.strip()
        elif key in ("login", "user", "username") and val:
            username = val
        elif key in ("url", "uri", "website") and val:
            uris.append(val)
        elif key in ("totp", "otp", "otpauth") and val:
            totp = val
        elif m and val and not notes_lines and len(m.group(1)) <= 40:
            # further "key: value" lines before the first free-text line are custom fields (pass convention)
            fields.append({"name": m.group(1).strip(), "value": val, "type": "text"})
        else:
            notes_lines.append(line)
    while notes_lines and not notes_lines[-1].strip():
        notes_lines.pop()
    return {
        "id": name, "name": name.split("/")[-1], "path": name,
        "username": username, "password": password, "uris": uris, "totp": totp,
        "notes": "\n".join(notes_lines).strip(),
        "fields": fields,
        "folder": "/".join(name.split("/")[:-1]) or None,
    }


def pass_serialize(args):
    """Build the pass file body from item fields (password first, then metadata lines)."""
    lines = [args.get("password") or ""]
    if args.get("username"):
        lines.append(f"login: {args['username']}")
    for u in args.get("uris") or []:
        if u:
            lines.append(f"url: {u}")
    if args.get("totp"):
        lines.append(args["totp"] if args["totp"].startswith("otpauth://") else f"totp: {args['totp']}")
    for f in args.get("fields") or []:
        name = re.sub(r"[^\w .-]", "", str(f.get("name") or "")).strip()[:40]
        value = str(f.get("value") or "").replace("\n", " ")
        if name and value:
            lines.append(f"{name}: {value}")
    if args.get("notes"):
        lines.append(args["notes"])
    return "\n".join(lines) + "\n"


def pass_status(_args):
    gpg = which("gpg", "OMNIVAULT_GPG_BIN")
    b = which("pass", "OMNIVAULT_PASS_BIN")
    store = pass_store_dir()
    initialized = os.path.isfile(os.path.join(store, ".gpg-id"))
    return {"version": VERSION, "cli": b, "gpg": bool(gpg), "ready": bool(b and gpg and initialized),
            "store": store, "initialized": initialized}


def pass_list(_args):
    b = pass_bin()
    items = []
    for name in pass_entries():
        proc = run(b, ["show", name], check=False)
        if proc.returncode != 0:
            continue
        items.append(pass_parse(name, proc.stdout.rstrip("\n")))
    return {"items": items}


def pass_reveal(args):
    b = pass_bin()
    name = check_id(args.get("id"), "Eintrags-ID")
    proc = run(b, ["show", name])
    return pass_parse(name, proc.stdout.rstrip("\n"))


def _pass_path(name):
    # keep subfolders, drop anything that could escape the store
    parts = [re.sub(r"[^\w .@+-]", "_", p).strip() or "_" for p in str(name).split("/") if p not in ("", ".", "..")]
    if not parts:
        raise HostError("Ungültiger Name")
    return "/".join(parts)


def pass_create(args):
    b = pass_bin()
    path = _pass_path(args.get("name") or "")
    if args.get("folder"):
        path = f"{_pass_path(args['folder'])}/{path}"
    # -f overwrite guard: refuse if it already exists, so create never clobbers
    if os.path.isfile(os.path.join(pass_store_dir(), path + ".gpg")):
        path = f"{path}-{os.urandom(2).hex()}"
    run(b, ["insert", "-m", "-f", path], stdin=pass_serialize(args))
    return {"id": path}


def pass_update(args):
    b = pass_bin()
    name = check_id(args.get("id"), "Eintrags-ID")
    if not os.path.isfile(os.path.join(pass_store_dir(), name + ".gpg")):
        raise HostError("Eintrag nicht gefunden")
    run(b, ["insert", "-m", "-f", name], stdin=pass_serialize(args))
    return {"id": name}


def pass_delete(args):
    b = pass_bin()
    name = check_id(args.get("id"), "Eintrags-ID")
    run(b, ["rm", "-f", name])
    return {"deleted": True}


COMMANDS = {"status": pass_status, "list": pass_list, "reveal": pass_reveal,
        "create": pass_create, "update": pass_update, "delete": pass_delete}
