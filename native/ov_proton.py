# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""
Proton Pass backend: drives the official Proton Pass CLI (`pass-cli`), installed and logged in by the user.
`list` returns non-secret fields only; secrets (passwords, TOTP, notes, card numbers …) only come with `reveal`.
"""
import json
import re
from concurrent.futures import ThreadPoolExecutor

from ov_common import VERSION, HostError, check_id as _check_id, run, which

ID_RE = re.compile(r"^[A-Za-z0-9_=\-]{1,200}$")
# no update check (it may try to download), no colours, no Rust backtraces in error output
CLI_ENV = {"PROTON_PASS_NO_UPDATE_CHECK": "1", "RUST_BACKTRACE": "0", "RUST_LIB_BACKTRACE": "0"}


def find_cli():
    return which("pass-cli", "OMNIVAULT_PASS_CLI")


def check_id(value, name):
    return _check_id(value, name, ID_RE)


def _describe(proc):
    """pass-cli errors: the line starting with "Error:" (anyhow), mapped to actionable messages."""
    lines = [re.sub(r"\x1b\[[0-9;]*m", "", l).strip() for l in (proc.stderr or proc.stdout or "").splitlines()]
    lines = [l for l in lines if l]
    text = next((l[len("Error:"):].strip() for l in lines if l.startswith("Error:")), lines[0] if lines else f"Exit-Code {proc.returncode}")
    if re.search(r"lock code|session is locked|locked session", text, re.I):
        return "Die pass-cli-Sitzung ist mit einem Sperrcode gesperrt. Bitte im Terminal `pass-cli session unlock` ausführen."
    if re.search(r"authenticated client|no session|not logged|log ?in|unauthori[sz]ed", text, re.I):
        return "Proton Pass: nicht angemeldet. Bitte im Terminal `pass-cli login` ausführen."
    return f"pass-cli: {text}"


def run_cli(args, stdin=None, check=True):
    cli = find_cli()
    if not cli:
        raise HostError("pass-cli nicht gefunden. Bitte das offizielle Proton Pass CLI installieren.")
    return run(cli, args, stdin=stdin, check=check, env=CLI_ENV, describe=_describe)


def unsupported(err):
    return re.search(r"unrecognized subcommand|unexpected argument|invalid value", str(err), re.I) is not None


def cli_json(args):
    try:
        return json.loads(run_cli([*args, "--output", "json"]).stdout)
    except json.JSONDecodeError:
        raise HostError("pass-cli lieferte kein gültiges JSON")


# ---------- item normalization ----------

def variant(obj):
    """Serde externally tagged enum: {"Login": {...}} -> ("Login", {...})."""
    if isinstance(obj, dict) and len(obj) == 1:
        k = next(iter(obj))
        return k, obj[k]
    if isinstance(obj, str):
        return obj, None
    return None, None


TYPE_MAP = {"Login": "login", "Note": "note", "CreditCard": "card", "Identity": "identity",
            "SshKey": "ssh", "Alias": "other", "Wifi": "other", "Custom": "other"}


def extra_fields(fields):
    out = []
    for f in fields or []:
        kind, value = variant(f.get("content"))
        if kind is None:
            continue
        out.append({
            "name": f.get("name") or "Feld",
            "type": {"Hidden": "hidden", "Totp": "totp", "Timestamp": "text"}.get(kind, "text"),
            "value": str(value) if value is not None else "",
        })
    return out


def passkey_info(p):
    """What OmniVault shows of a Proton passkey: site and user. The key itself stays in Proton Pass."""
    p = p if isinstance(p, dict) else {}
    pick = lambda *names: next((p.get(n) for n in names if p.get(n)), None)
    return {"rpId": pick("rp_id", "rpId", "domain"), "rpName": pick("rp_name", "rpName"),
            "userName": pick("user_name", "userName"), "creationDate": None}


def normalize(details, vault_name):
    item = details.get("item", details)
    data = item.get("content") or {}
    kind, content = variant(data.get("content"))
    content = content or {}
    entry = {
        "shareId": item.get("share_id"), "itemId": item.get("id"), "vault": vault_name,
        "folderId": item.get("folder_id"), "modifyTime": item.get("modify_time"),
        "title": data.get("title", ""), "type": TYPE_MAP.get(kind, "other"),
        "trashed": str(item.get("state")) in ("Trashed", "2"),
    }
    public = {"username": None, "email": None, "urls": [], "subtitle": None, "hasPassword": False, "hasTotp": False}
    secret = {"note": data.get("note") or "", "fields": extra_fields(data.get("extra_fields"))}
    if kind == "Login":
        public.update(username=content.get("username") or content.get("email") or None,
                      email=content.get("email") or None, urls=content.get("urls") or [],
                      hasPassword=bool(content.get("password")), hasTotp=bool(content.get("totp_uri")),
                      passkeys=[passkey_info(p) for p in content.get("passkeys") or []])
        secret.update(password=content.get("password") or "", totp=content.get("totp_uri") or "")
    elif kind == "CreditCard":
        number = content.get("number") or ""
        brand_kind, _ = variant(content.get("card_type"))
        brand = None if brand_kind in (None, "Unspecified", "Other") else brand_kind
        public["subtitle"] = " ".join(x for x in [brand, f"*{number[-4:]}" if number else None] if x)
        exp = (content.get("expiration_date") or "").split("-")
        secret["card"] = {"cardholderName": content.get("cardholder_name"), "brand": brand, "number": number,
                          "expYear": exp[0] if len(exp) == 2 else None, "expMonth": exp[1] if len(exp) == 2 else None,
                          "code": content.get("verification_number"), "pin": content.get("pin")}
    elif kind == "Identity":
        public["subtitle"] = content.get("full_name") or content.get("email")
        secret["identity"] = {
            "firstName": content.get("first_name"), "middleName": content.get("middle_name"),
            "lastName": content.get("last_name") or (None if content.get("first_name") else content.get("full_name")),
            "email": content.get("email"), "phone": content.get("phone_number"),
            "company": content.get("organization") or content.get("company"),
            "address1": content.get("street_address"), "postalCode": content.get("zip_or_postal_code"),
            "city": content.get("city"), "state": content.get("state_or_province"),
            "country": content.get("country_or_region"), "ssn": content.get("social_security_number"),
            "passportNumber": content.get("passport_number"), "licenseNumber": content.get("license_number"),
        }
    elif kind == "SshKey":
        public["subtitle"] = (content.get("public_key") or "")[:40] or None
        secret["ssh"] = {"privateKey": content.get("private_key"), "publicKey": content.get("public_key")}
    entry.update(public)
    return entry, secret


def view(share_id, item_id):
    return cli_json(["item", "view", "--share-id", share_id, "--item-id", item_id])


# ---------- commands ----------

def cmd_status(_args):
    cli = find_cli()
    if not cli:
        return {"version": VERSION, "cli": None, "loggedIn": False}
    ver = run_cli(["--version"], check=False).stdout.strip()
    info = run_cli(["info", "--output", "json"], check=False)
    if info.returncode != 0 and re.search(r"unexpected argument|unrecognized", info.stderr or "", re.I):
        info = run_cli(["info"], check=False)  # older pass-cli without JSON output
    email = None
    try:
        data = json.loads(info.stdout)
        found = [v for k, v in (data.items() if isinstance(data, dict) else []) if "email" in k.lower() and isinstance(v, str)]
        email = found[0] if found else None
    except (json.JSONDecodeError, TypeError):
        m = re.search(r"Email:\s*(\S+)", info.stdout or "")
        email = m.group(1) if m else None
    return {"version": VERSION, "cli": ver or cli, "loggedIn": info.returncode == 0, "email": email}


def cmd_list(_args):
    vaults = cli_json(["vault", "list"]).get("vaults", [])
    summaries = []
    for v in vaults:
        share_id = v.get("share_id")
        if not share_id:
            continue
        for it in cli_json(["item", "list", "--share-id", share_id]).get("items", []):
            if str(it.get("state")) in ("Trashed", "2"):
                continue
            summaries.append((share_id, it.get("id"), v.get("name")))
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(lambda s: (s, view(s[0], s[1])), summaries))
    items = []
    for (share_id, item_id, vault_name), details in results:
        entry, _secret = normalize(details, vault_name)
        if not entry["trashed"]:
            items.append(entry)
    return {"items": items, "vaults": [{"shareId": v.get("share_id"), "name": v.get("name")} for v in vaults]}


def cmd_reveal(args):
    share_id = check_id(args.get("shareId"), "Tresor-ID")
    item_id = check_id(args.get("itemId"), "Eintrags-ID")
    entry, secret = normalize(view(share_id, item_id), None)
    return {**secret, "type": entry["type"]}


def cmd_create(args):
    share_id = check_id(args.get("shareId"), "Tresor-ID")
    kind = args.get("type")
    if kind == "login":
        template = {"title": args.get("title") or "", "username": args.get("username") or None,
                    "email": args.get("email") or None, "password": args.get("password") or None,
                    "totp_uri": args.get("totp") or None, "urls": [u for u in args.get("urls") or [] if u]}
        sub = "login"
    elif kind == "note":
        template = {"title": args.get("title") or "", "note": args.get("note") or None}
        sub = "note"
    else:
        raise HostError("Nur Logins und Notizen können angelegt werden")
    # secrets go through stdin, never through the command line
    out = run_cli(["item", "create", sub, "--share-id", share_id, "--from-template", "-"], stdin=json.dumps(template)).stdout.strip()
    item_id = out.splitlines()[-1].strip() if out else ""
    if not ID_RE.match(item_id):
        item_id = None
    if item_id and kind == "login" and args.get("note"):
        run_cli(["item", "update", "--share-id", share_id, "--item-id", item_id, "--field", f"note={args['note']}"])
    return {"itemId": item_id}


def cmd_update(args):
    share_id = check_id(args.get("shareId"), "Tresor-ID")
    item_id = check_id(args.get("itemId"), "Eintrags-ID")
    fields = args.get("fields") or {}
    allowed = {"title", "username", "password", "email", "url", "note"}
    cli_args = ["item", "update", "--share-id", share_id, "--item-id", item_id]
    for k, v in fields.items():
        if k not in allowed:
            raise HostError(f"Feld {k} kann nicht geändert werden")
        cli_args += ["--field", f"{k}={'' if v is None else v}"]
    if len(cli_args) == 6:
        return {"updated": 0}
    run_cli(cli_args)
    return {"updated": len(fields)}


def cmd_delete(args):
    """Moves the item to the trash (pass-cli ≥ 2.3). Only with permanent=True, or on old versions without
    `item trash`, is it deleted for good – the answer says which happened."""
    share_id = check_id(args.get("shareId"), "Tresor-ID")
    item_id = check_id(args.get("itemId"), "Eintrags-ID")
    if not args.get("permanent"):
        try:
            run_cli(["item", "trash", "--share-id", share_id, "--item-id", item_id])
            return {"deleted": True, "trashed": True}
        except HostError as e:
            if not unsupported(e):
                raise
            if not args.get("allowPermanentFallback"):
                raise HostError("Diese pass-cli-Version hat keinen Papierkorb – bitte pass-cli aktualisieren (≥ 2.3).")
    run_cli(["item", "delete", "--share-id", share_id, "--item-id", item_id])
    return {"deleted": True, "trashed": False}


def cmd_untrash(args):
    share_id = check_id(args.get("shareId"), "Tresor-ID")
    item_id = check_id(args.get("itemId"), "Eintrags-ID")
    run_cli(["item", "untrash", "--share-id", share_id, "--item-id", item_id])
    return {"restored": True}


def cmd_move(args):
    """Moves an item to another vault with `item move` (keeps passkeys, attachments, history)."""
    share_id = check_id(args.get("shareId"), "Tresor-ID")
    item_id = check_id(args.get("itemId"), "Eintrags-ID")
    to_share = check_id(args.get("toShareId"), "Ziel-Tresor-ID")
    ids = lambda: {it.get("id") for it in cli_json(["item", "list", "--share-id", to_share]).get("items", [])}
    before = ids()
    try:
        out = run_cli(["item", "move", "--from-share-id", share_id, "--item-id", item_id, "--to-share-id", to_share]).stdout.strip()
    except HostError as e:
        if unsupported(e):
            raise HostError("Diese pass-cli-Version kann Einträge nicht verschieben – bitte pass-cli aktualisieren (≥ 2.3).")
        raise
    last = out.splitlines()[-1].strip() if out else ""
    if ID_RE.match(last):
        return {"itemId": last}
    # pass-cli does not print the new id: it is the one item that appeared in the target vault
    new = [i for i in ids() - before if i]
    return {"itemId": new[0] if len(new) == 1 else None}


COMMANDS = {"status": cmd_status, "list": cmd_list, "reveal": cmd_reveal, "create": cmd_create,
            "update": cmd_update, "delete": cmd_delete, "untrash": cmd_untrash, "move": cmd_move}
