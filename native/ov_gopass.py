# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""
gopass backend. Same entry format as pass (line 1 = password, then `login:`, `url:`, `otpauth://…` and free text);
mounted sub-stores appear as top-level folders. Only a fixed set of gopass commands is run, never a shell; secrets
go to gopass over stdin.
"""
import os
import re

from ov_common import VERSION, HostError, check_id, run, which
from ov_pass import _pass_path, pass_parse, pass_serialize

# no desktop notifications, no colors, no update check, never ask anything (stdin is not a terminal)
ENV = {"GOPASS_NO_NOTIFY": "true", "NO_COLOR": "1", "GOPASS_NO_REMINDER": "true", "GOPASS_NO_AUTOUPDATE": "true"}


def gopass_bin():
    b = which("gopass", "OMNIVAULT_GOPASS_BIN")
    if not b:
        raise HostError("`gopass` wurde nicht gefunden. Bitte gopass installieren.")
    return b


def _run(args, **kw):
    return run(gopass_bin(), args, env=ENV, **kw)


def _names():
    proc = _run(["ls", "--flat"])
    return [l.strip() for l in proc.stdout.splitlines() if l.strip()]


def _mounts():
    """Mount points of sub-stores (`gopass mounts` prints a tree: `└── team (/path)`)."""
    proc = _run(["mounts"], check=False)
    out = []
    for line in proc.stdout.splitlines()[1:]:
        m = re.match(r"^[\s│├└─]+(\S+)\s+\(", line)
        if m:
            out.append(m.group(1))
    return out


def _id(value):
    """Entry id from the extension; no segment may start with "-" (gopass would read it as an option)."""
    name = check_id(value, "Eintrags-ID")
    if any(seg.startswith("-") for seg in name.split("/")):
        raise HostError("Ungültige Eintrags-ID")
    return name


def _show(name, check=True):
    return _run(["show", "-f", "-n", name], check=check)


def gopass_status(_args):
    gpg = which("gpg", "OMNIVAULT_GPG_BIN")
    b = which("gopass", "OMNIVAULT_GOPASS_BIN")
    initialized = False
    version = None
    if b:
        v = run(b, ["--version"], env=ENV, check=False)
        version = (v.stdout.split() + [None, None])[1]
        initialized = run(b, ["ls", "--flat"], env=ENV, check=False).returncode == 0
    return {"version": VERSION, "cli": b, "cliVersion": version, "gpg": bool(gpg),
            "ready": bool(b and initialized), "initialized": initialized}


def gopass_list(_args):
    items = []
    for name in _names():
        proc = _show(name, check=False)
        if proc.returncode != 0:
            continue
        items.append(pass_parse(name, proc.stdout.rstrip("\n")))
    return {"items": items, "mounts": _mounts()}


def gopass_reveal(args):
    name = _id(args.get("id"))
    return pass_parse(name, _show(name).stdout.rstrip("\n"))


def _target(args):
    path = _pass_path(args.get("name") or "")
    if args.get("folder"):
        path = f"{_pass_path(args['folder'])}/{path}"
    # a leading "-" would be read as an option
    return "/".join(("_" + seg[1:]) if seg.startswith("-") else seg for seg in path.split("/"))


def gopass_create(args):
    path = _target(args)
    existing = set(_names())
    if path in existing:  # never overwrite: create picks a free name
        base = path
        while path in existing:
            path = f"{base}-{os.urandom(2).hex()}"
    _run(["insert", "-f", path], stdin=pass_serialize(args))
    return {"id": path}


def gopass_update(args):
    name = _id(args.get("id"))
    if name not in set(_names()):
        raise HostError("Eintrag nicht gefunden")
    _run(["insert", "-f", name], stdin=pass_serialize(args))
    return {"id": name}


def gopass_move(args):
    """Moves an entry to another folder (also between mounts); its content is kept as it is."""
    name = _id(args.get("id"))
    names = set(_names())
    if name not in names:
        raise HostError("Eintrag nicht gefunden")
    target = _target({"name": args.get("name") or name.split("/")[-1], "folder": args.get("folder")})
    if target == name:
        return {"id": name}
    if target in names:
        raise HostError(f"Unter „{target}“ gibt es schon einen Eintrag")
    _run(["mv", "-f", name, target])
    return {"id": target}


def gopass_delete(args):
    name = _id(args.get("id"))
    _run(["rm", "-f", name])
    return {"deleted": True}


COMMANDS = {"status": gopass_status, "list": gopass_list, "reveal": gopass_reveal, "create": gopass_create,
            "update": gopass_update, "move": gopass_move, "delete": gopass_delete}
