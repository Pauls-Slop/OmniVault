# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""
1Password backend via the official `op` CLI (2.x). The listing holds no secrets; `reveal` fetches one item.
Writes pipe a JSON item to `op item create -` / `op item edit <id> -`, so secrets never appear on argv.
"""
import json
import os
import re

from ov_common import HostError, assert_unchanged, check_id, run, which


def op_bin():
    b = which("op", "OMNIVAULT_OP_BIN")
    if not b:
        raise HostError("`op` (1Password CLI) wurde nicht gefunden.")
    return b

def op_json(args, stdin=None):
    proc = run(op_bin(), [*args, "--format", "json"], stdin=stdin)
    try:
        return json.loads(proc.stdout or "null")
    except json.JSONDecodeError:
        raise HostError("1Password CLI lieferte kein gültiges JSON")

def op_status(_a):
    b = which("op", "OMNIVAULT_OP_BIN")
    if not b:
        return {"cli": None, "ready": False}
    proc = run(b, ["whoami", "--format", "json"], check=False)
    if proc.returncode != 0:
        return {"cli": b, "ready": False, "loggedIn": False}
    email = None
    try:
        email = (json.loads(proc.stdout or "{}") or {}).get("email")
    except json.JSONDecodeError:
        pass
    return {"cli": b, "ready": True, "loggedIn": True, "email": email}

CATEGORY_TYPES = {"LOGIN": "login", "SECURE_NOTE": "note", "CREDIT_CARD": "card", "IDENTITY": "identity"}
CARD_IDS = {"cardholder": "cardholderName", "type": "brand", "ccnum": "number", "cvv": "code"}
IDENTITY_IDS = {"firstname": "firstName", "initial": "middleName", "lastname": "lastName", "company": "company",
                "email": "email", "defphone": "phone", "username": "username"}


def op_cat_to_type(cat):
    return CATEGORY_TYPES.get(cat, "login")


def op_vault_list():
    return [{"id": v.get("id"), "name": v.get("name") or v.get("id")} for v in (op_json(["vault", "list"]) or [])]


def revision(doc):
    """Change marker of an item: its version number (op 2.x), else the time of the last change."""
    doc = doc or {}
    v = doc.get("version")
    return str(v) if v not in (None, "") else (doc.get("updated_at") or None)


def op_list(_a):
    data = op_json(["item", "list"]) or []
    items = []
    for it in data:
        items.append({
            "id": it.get("id"), "name": it.get("title") or "",
            "type": op_cat_to_type(it.get("category", "")),
            "vault": (it.get("vault") or {}).get("name"),
            "vaultId": (it.get("vault") or {}).get("id"),
            "username": it.get("additional_information") or "",
            "uris": [u.get("href") for u in it.get("urls", []) if u.get("href")],
            "favorite": bool(it.get("favorite")),
            "hasTotp": False,
            "revision": revision(it),
        })
    return {"items": items, "vaults": op_vault_list()}


def _is_custom(f, category):
    """A field the user added (not username/password/notes/OTP, not a built-in card or identity field)."""
    if f.get("purpose") or f.get("type") not in ("STRING", "CONCEALED") or not f.get("label"):
        return False
    fid = f.get("id")
    if category == "CREDIT_CARD" and (fid in CARD_IDS or fid in ("expiry", "validFrom")):
        return False
    if category == "IDENTITY" and fid in IDENTITY_IDS:
        return False
    return True


def _expiry(value):
    """1Password MONTH_YEAR values come as YYYYMM or MM/YYYY."""
    v = str(value or "")
    m = re.match(r"^(\d{4})(\d{2})$", v) or None
    if m:
        return m.group(2), m.group(1)
    m = re.match(r"^(\d{1,2})/(\d{2,4})$", v)
    return (m.group(1).zfill(2), m.group(2)) if m else ("", "")


def op_parse(doc):
    category = doc.get("category", "")
    out = {"id": doc.get("id"), "name": doc.get("title") or "", "username": "", "password": "",
           "totp": "", "uris": [u.get("href") for u in doc.get("urls", []) if u.get("href")], "notes": "",
           "fields": [], "type": op_cat_to_type(category), "favorite": bool(doc.get("favorite")),
           "revision": revision(doc)}
    card, identity = {}, {}
    for f in doc.get("fields", []) or []:
        purpose, ftype, fid = f.get("purpose"), f.get("type"), f.get("id")
        val = f.get("value", "")
        if purpose == "USERNAME":
            out["username"] = val
        elif purpose == "PASSWORD":
            out["password"] = val
        elif purpose == "NOTES":
            out["notes"] = val or out["notes"]
        elif ftype == "OTP" and val:
            out["totp"] = val
        elif category == "CREDIT_CARD" and fid in CARD_IDS:
            card[CARD_IDS[fid]] = val
        elif category == "CREDIT_CARD" and fid == "expiry":
            card["expMonth"], card["expYear"] = _expiry(val)
        elif category == "IDENTITY" and fid in IDENTITY_IDS:
            identity[IDENTITY_IDS[fid]] = val
        elif _is_custom(f, category) and val != "":
            out["fields"].append({"name": f["label"], "value": val, "type": "hidden" if ftype == "CONCEALED" else "text"})
    if category == "CREDIT_CARD":
        out["card"] = card
    if category == "IDENTITY":
        out["identity"] = identity
    return out


def op_reveal(a):
    return op_parse(op_json(["item", "get", check_id(a.get("id"), "Eintrags-ID")]))


def _custom_field(f):
    return {"id": "ov" + os.urandom(4).hex(), "type": "CONCEALED" if f.get("type") == "hidden" else "STRING",
            "label": str(f.get("name") or "")[:200], "value": str(f.get("value") or "")}


def op_item_json(a, category):
    fields = []
    if category == "LOGIN":
        fields = [
            {"id": "username", "type": "STRING", "purpose": "USERNAME", "value": a.get("username") or ""},
            {"id": "password", "type": "CONCEALED", "purpose": "PASSWORD", "value": a.get("password") or ""},
        ]
        if a.get("totp"):
            fields.append({"id": "onetimepassword", "label": "one-time password", "type": "OTP", "value": a["totp"]})
    fields.append({"id": "notesPlain", "type": "STRING", "purpose": "NOTES", "value": a.get("notes") or ""})
    fields += [_custom_field(f) for f in a.get("fields") or [] if f.get("name")]
    doc = {"title": a.get("name") or "", "category": category, "fields": fields}
    if category == "LOGIN":
        doc["urls"] = [{"href": u, "primary": i == 0} for i, u in enumerate(a.get("uris") or []) if u]
    return doc


def op_create(a):
    category = "LOGIN" if (a.get("type") or "login") == "login" else "SECURE_NOTE"
    argv = ["item", "create", "-", "--format", "json"]
    if a.get("vaultId"):
        argv += ["--vault", check_id(a["vaultId"], "Tresor-ID")]
    if a.get("favorite"):
        argv.append("--favorite")
    proc = run(op_bin(), argv, stdin=json.dumps(op_item_json(a, category)))
    doc = _json_or_none(proc.stdout)
    return {"id": doc.get("id"), "revision": revision(doc)}


def _json_or_none(text):
    try:
        return json.loads(text or "{}") or {}
    except json.JSONDecodeError:
        return {}


def _merge(current, a):
    """Applies the edited values to the full item as 1Password returned it: an edit template replaces the
    whole item, so every field OmniVault does not edit (sections, passkeys, card details …) is kept as it is."""
    doc = dict(current)
    category = current.get("category", "LOGIN")
    fields = [dict(f) for f in (current.get("fields") or [])]

    def put(purpose, value, ftype, fid):
        f = next((x for x in fields if x.get("purpose") == purpose), None)
        if f is not None:
            f["value"] = value
        elif value:
            fields.append({"id": fid, "type": ftype, "purpose": purpose, "value": value})

    doc["title"] = a.get("name") or current.get("title") or ""
    if category == "LOGIN":
        put("USERNAME", a.get("username") or "", "STRING", "username")
        put("PASSWORD", a.get("password") or "", "CONCEALED", "password")
        otp = next((x for x in fields if x.get("type") == "OTP"), None)
        if a.get("totp"):
            if otp is not None:
                otp["value"] = a["totp"]
            else:
                fields.append({"id": "onetimepassword", "label": "one-time password", "type": "OTP", "value": a["totp"]})
        elif otp is not None:
            fields.remove(otp)
        doc["urls"] = [{"href": u, "primary": i == 0} for i, u in enumerate(a.get("uris") or []) if u]
    put("NOTES", a.get("notes") or "", "STRING", "notesPlain")
    if a.get("fields") is not None:
        fields = [f for f in fields if not _is_custom(f, category)] + [_custom_field(f) for f in a["fields"] if f.get("name")]
    doc["fields"] = fields
    return doc


def op_update(a):
    iid = check_id(a.get("id"), "Eintrags-ID")
    current = op_json(["item", "get", iid])
    assert_unchanged(a.get("revision"), revision(current))
    argv = ["item", "edit", iid, "--format", "json"]
    if a.get("favorite") is not None:
        argv += ["--favorite", "true" if a["favorite"] else "false"]
    edited = _json_or_none(run(op_bin(), argv, stdin=json.dumps(_merge(current, a))).stdout)
    vault = (current.get("vault") or {}).get("id")
    if a.get("vaultId") and a["vaultId"] != vault:
        moved = op_json(["item", "move", iid, "--current-vault", check_id(vault, "Tresor-ID"),
                         "--destination-vault", check_id(a["vaultId"], "Tresor-ID")])
        return {"id": (moved or {}).get("id") or iid, "moved": True, "revision": revision(moved)}
    return {"id": iid, "revision": revision(edited)}


def op_favorite(a):
    iid = check_id(a.get("id"), "Eintrags-ID")
    proc = run(op_bin(), ["item", "edit", iid, "--favorite", "true" if a.get("favorite") else "false", "--format", "json"])
    return {"id": iid, "revision": revision(_json_or_none(proc.stdout))}


def op_vault_create(a):
    name = str(a.get("name") or "").strip()
    if not name or len(name) > 100 or name.startswith("-"):
        raise HostError("Ungültiger Tresorname")
    v = op_json(["vault", "create", name]) or {}
    return {"id": v.get("id"), "name": v.get("name") or name}


def op_delete(a):
    run(op_bin(), ["item", "delete", check_id(a.get("id"), "Eintrags-ID")])
    return {"deleted": True}


COMMANDS = {"status": op_status, "list": op_list, "reveal": op_reveal, "create": op_create, "update": op_update,
            "favorite": op_favorite, "vault_create": op_vault_create, "delete": op_delete}
