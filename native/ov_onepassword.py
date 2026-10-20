# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""
1Password backend via the official `op` CLI (2.x). The listing holds no secrets; `reveal` fetches one item.
Writes pipe a JSON item to `op item create -` / `op item edit <id>`, so secrets never appear on argv. Cards and
identities start from the category template the installed `op` hands out (`op item template get`), so the
built-in fields keep 1Password's own ids, types and sections. Attachments are read with `op read` (files on
items) or `op document get` (Document items) into a private temporary directory.
"""
import json
import os
import re
import time

from ov_common import (HostError, assert_unchanged, attachment_result, check_id, read_output_file, run,
                       too_large, which)

OP_ID = re.compile(r"^[A-Za-z0-9]{1,64}$")  # 1Password ids of vaults, items and files


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
# when a template names a field differently, its type still tells what it is
CARD_TYPES = {"CREDIT_CARD_NUMBER": "ccnum"}
TEMPLATE_NAMES = {"CREDIT_CARD": "Credit Card", "IDENTITY": "Identity"}
ADDRESS_KEYS = (("street", "address1"), ("city", "city"), ("state", "state"), ("zip", "postalCode"), ("country", "country"))


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
    if category == "IDENTITY" and (fid in IDENTITY_IDS or fid == "address"):
        return False
    return True





def _expiry(value):
    """1Password MONTH_YEAR values come as YYYYMM or MM/YYYY."""
    v = str(value or "")
    m = re.match(r"^(\d{4})(\d{2})$", v) or None
    if m:
        return m.group(2), m.group(1)
    m = re.match(r"^(\d{4})/(\d{1,2})$", v)
    if m:
        return m.group(2).zfill(2), m.group(1)
    m = re.match(r"^(\d{1,2})/(\d{2,4})$", v)
    return (m.group(1).zfill(2), m.group(2)) if m else ("", "")


def _address(value):
    """ADDRESS values: an object {street, city, state, zip, country}, or one line of text."""
    if isinstance(value, dict):
        return {ours: str(value.get(theirs) or "") for theirs, ours in ADDRESS_KEYS if value.get(theirs)}
    return {"address1": str(value)} if value else {}


def _history(field):
    """Earlier passwords as `op` reports them in password_details.history (plain strings, or {value, time}).
    The format is not documented by 1Password; `selftest.py` shows whether the installed `op` delivers it."""
    out = []
    for h in ((field.get("password_details") or {}).get("history") or []):
        if isinstance(h, str) and h:
            out.append({"password": h, "lastUsedDate": None})
        elif isinstance(h, dict) and h.get("value"):
            when = h.get("time")
            out.append({"password": str(h["value"]),
                        "lastUsedDate": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(int(when))) if isinstance(when, int) else None})
    return out


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
            if _history(f):
                out["passwordHistory"] = _history(f)
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
        elif category == "IDENTITY" and fid == "address":
            identity.update(_address(val))
        elif _is_custom(f, category) and val != "":
            out["fields"].append({"name": f["label"], "value": val, "type": "hidden" if ftype == "CONCEALED" else "text"})
    if category == "CREDIT_CARD":
        out["card"] = card
    if category == "IDENTITY":
        out["identity"] = identity
    out["attachments"] = [{"id": f.get("id"), "fileName": f.get("name") or "", "size": int(f.get("size") or 0)}
                          for f in doc.get("files") or [] if f.get("id")]
    if category == "DOCUMENT" and not out["attachments"]:
        out["attachments"] = [{"id": "document", "fileName": doc.get("title") or "", "size": 0}]
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


# What OmniVault writes of a card or identity, by 1Password field id. Not written: the card type (1Password
# derives it from the number) and the identity's address (ADDRESS values are not accepted reliably through
# JSON templates); both stay as they are.
CARD_WRITE = {"cardholder": "cardholderName", "ccnum": "number", "cvv": "code"}
IDENTITY_WRITE = {"firstname": "firstName", "initial": "middleName", "lastname": "lastName", "company": "company",
                  "email": "email", "defphone": "phone", "username": "username"}


def _template(category):
    """The category template of the installed `op` (built-in field ids, types and sections)."""
    doc = op_json(["item", "template", "get", TEMPLATE_NAMES[category]]) or {}
    if not isinstance(doc.get("fields"), list):
        raise HostError("1Password CLI lieferte keine Vorlage")
    return doc


def _month_year(card):
    """MONTH_YEAR as op expects it: YYYYMM (empty when no expiry is set)."""
    month, year = str(card.get("expMonth") or "").strip(), str(card.get("expYear") or "").strip()
    if not month and not year:
        return ""
    if not (re.match(r"^\d{1,2}$", month) and 1 <= int(month) <= 12 and re.match(r"^\d{2}(\d{2})?$", year)):
        raise HostError("Ungültiges Ablaufdatum")
    return f"{'20' + year if len(year) == 2 else year}{month.zfill(2)}"


def _wanted(category, a):
    """field id → value for the card/identity fields OmniVault edits."""
    if category == "CREDIT_CARD":
        card = a.get("card") or {}
        out = {fid: str(card.get(k) or "") for fid, k in CARD_WRITE.items()}
        out["expiry"] = _month_year(card)
        return out
    identity = a.get("identity") or {}
    return {fid: str(identity.get(k) or "") for fid, k in IDENTITY_WRITE.items()}


def _field_key(f, category):
    """The field id OmniVault knows a template/item field by (for cards also by its type)."""
    fid = f.get("id")
    if category == "CREDIT_CARD" and fid not in CARD_WRITE and fid != "expiry":
        return CARD_TYPES.get(f.get("type"), fid)
    return fid


def _apply(fields, category, a, template=None):
    """Sets the edited card/identity values on `fields` (in place). A value whose field is missing is taken from
    the category template; if even that lacks it, nothing is written and the user learns which field is missing."""
    wanted = _wanted(category, a)
    for f in fields:
        key = _field_key(f, category)
        if key in wanted:
            f["value"] = wanted.pop(key)
    missing = {k: v for k, v in wanted.items() if v}
    if missing:
        tpl = template or _template(category)
        for f in tpl["fields"]:
            key = _field_key(f, category)
            if key in missing:
                fields.append({**f, "value": missing.pop(key)})
                sid = (f.get("section") or {}).get("id")
                if sid:
                    yield next((s for s in tpl.get("sections") or [] if s.get("id") == sid), f["section"])
    if missing:
        raise HostError(f"Feld {next(iter(missing))} fehlt in der 1Password-Vorlage")


def _with_sections(doc, sections):
    have = {s.get("id") for s in doc.get("sections") or []}
    for sec in sections:
        if sec.get("id") not in have:
            doc.setdefault("sections", []).append(sec)
            have.add(sec.get("id"))


ADDRESS_PARTS = ("address1", "postalCode", "city", "state", "country")


def _address_line(identity):
    return ", ".join(str(identity.get(k)).strip() for k in ADDRESS_PARTS if str(identity.get(k) or "").strip())


def _address_unchanged(current_doc, a):
    """The identity's address cannot be written through `op` (see IDENTITY_WRITE); refuse an edit that changes it
    instead of dropping the change silently."""
    if a.get("identity") is None:
        return
    before = _address_line(op_parse(current_doc).get("identity") or {})
    if _address_line(a["identity"]) != before:
        raise HostError("Die Adresse lässt sich über op nicht ändern – bitte in der 1Password-App ändern")


def op_typed_json(a, category):
    """A new card or identity: the category template with OmniVault's values filled in. An identity's address
    goes into the notes (it cannot be written through `op`, see IDENTITY_WRITE)."""
    if category == "IDENTITY" and _address_line(a.get("identity") or {}):
        a = {**a, "notes": "\n".join(x for x in (a.get("notes"), _address_line(a["identity"])) if x)}
    doc = _template(category)
    doc = {"title": a.get("name") or "", "category": doc.get("category") or category,
           "sections": list(doc.get("sections") or []), "fields": [dict(f) for f in doc["fields"]]}
    _with_sections(doc, list(_apply(doc["fields"], category, a, doc)))
    notes = next((f for f in doc["fields"] if f.get("purpose") == "NOTES"), None)
    if notes is not None:
        notes["value"] = a.get("notes") or ""
    elif a.get("notes"):
        doc["fields"].append({"id": "notesPlain", "type": "STRING", "purpose": "NOTES", "value": a["notes"]})
    doc["fields"] += [_custom_field(f) for f in a.get("fields") or [] if f.get("name")]
    return doc


CREATE_CATEGORIES = {"login": "LOGIN", "note": "SECURE_NOTE", "card": "CREDIT_CARD", "identity": "IDENTITY"}


def op_create(a):
    category = CREATE_CATEGORIES.get(a.get("type") or "login")
    if category is None:
        raise HostError("Nur Logins, Notizen, Karten und Identitäten können angelegt werden")
    argv = ["item", "create", "-", "--format", "json"]
    if a.get("vaultId"):
        argv += ["--vault", check_id(a["vaultId"], "Tresor-ID")]
    if a.get("favorite"):
        argv.append("--favorite")
    doc = op_typed_json(a, category) if category in TEMPLATE_NAMES else op_item_json(a, category)
    proc = run(op_bin(), argv, stdin=json.dumps(doc))
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
    if category in TEMPLATE_NAMES and (a.get("card") is not None or a.get("identity") is not None):
        _with_sections(doc, list(_apply(fields, category, a)))
    put("NOTES", a.get("notes") or "", "STRING", "notesPlain")
    if a.get("fields") is not None:
        fields = [f for f in fields if not _is_custom(f, category)] + [_custom_field(f) for f in a["fields"] if f.get("name")]
    doc["fields"] = fields
    return doc


def op_update(a):
    iid = check_id(a.get("id"), "Eintrags-ID")
    current = op_json(["item", "get", iid])
    assert_unchanged(a.get("revision"), revision(current))
    if current.get("category") == "IDENTITY":
        _address_unchanged(current, a)
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


def op_attachment(a):
    """A file attached to an item (`op read` with a secret reference made of ids), or the file of a Document item
    (`op document get`). Written into a private temporary directory, never through the shell."""
    iid = check_id(a.get("id"), "Eintrags-ID", OP_ID)
    doc = op_json(["item", "get", iid])
    vault = check_id((doc.get("vault") or {}).get("id"), "Tresor-ID", OP_ID)
    if a.get("fileId") == "document" and doc.get("category") == "DOCUMENT":
        name = doc.get("title") or "Dokument"
        data = read_output_file(lambda path: run(op_bin(), ["document", "get", iid, "--vault", vault, "--out-file", path]))
        return attachment_result(name, data)
    fid = check_id(a.get("fileId"), "Anhang-ID", OP_ID)
    meta = next((f for f in doc.get("files") or [] if f.get("id") == fid), None)
    if meta is None:
        raise HostError("Anhang nicht gefunden")
    err = too_large(int(meta.get("size") or 0))
    if err:
        raise err
    data = read_output_file(lambda path: run(op_bin(), ["read", "--out-file", path, f"op://{vault}/{iid}/{fid}"]))
    return attachment_result(meta.get("name"), data)


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
            "favorite": op_favorite, "vault_create": op_vault_create, "delete": op_delete, "attachment": op_attachment}
