#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""
Self-test of the OmniVault host against YOUR own, unlocked CLI session.

  python3 selftest.py pass                         # read-only
  python3 selftest.py onepassword --write          # also create, edit and delete throw-away entries
                                                   # (1Password: a login, a card and an identity)
  python3 selftest.py proton --write --vault OmniVault-Test   # Proton: use an EMPTY test vault

Prints only counts, types and ok/fail – never titles, user names or secrets – so the output can be shared.
"""
import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import omnivault_host  # noqa: E402
from ov_common import HostError  # noqa: E402

results = []
NAME = "OmniVault-Selbsttest"


def step(name, fn):
    t = time.time()
    try:
        info = fn()
        results.append(True)
        print(f"ok    {name} ({time.time() - t:.1f} s){f' – {info}' if info else ''}")
        return True
    except Exception as e:  # report and continue
        results.append(False)
        print(f"FAIL  {name}: {e}")
        return False


def finish():
    print(f"\n{results.count(True)} ok, {results.count(False)} fehlgeschlagen")
    sys.exit(0 if all(results) else 1)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("backend", choices=sorted(omnivault_host.BACKENDS))
    ap.add_argument("--write", action="store_true", help="Wegwerf-Eintrag anlegen, ändern, löschen")
    ap.add_argument("--vault", help="Proton: Name des (leeren) Testtresors für --write")
    ap.add_argument("--limit", type=int, default=25, help="so viele Einträge auf Anhänge, Verlauf, Passkeys prüfen (Standard 25)")
    a = ap.parse_args()
    cmd = omnivault_host.BACKENDS[a.backend]
    proton = a.backend == "proton"
    # Proton addresses items by vault (shareId) + itemId, the other backends by a single id.
    ref = (lambda it: {"shareId": it["shareId"], "itemId": it["itemId"]}) if proton else (lambda it: {"id": it["id"]})
    state = {}

    def status():
        st = cmd["status"]({})
        if not st.get("cli"):
            raise RuntimeError("Programm nicht gefunden")
        if not (st.get("loggedIn") or st.get("ready")):
            raise RuntimeError("nicht angemeldet bzw. nicht initialisiert")
        return st.get("cli")

    def listing():
        r = cmd["list"]({})
        state["list"] = r
        types = {}
        for it in r["items"]:
            types[it.get("type", "login")] = types.get(it.get("type", "login"), 0) + 1
        return f"{len(r['items'])} Einträge {types}"

    def reveal():
        items = state["list"]["items"]
        if not items:
            return "kein Eintrag vorhanden"
        got = cmd["reveal"](ref(items[0]))
        return f"Felder: {sorted(k for k, v in got.items() if v not in (None, '', [], {}))}"

    def extras():
        """Attachments, password history and passkeys over a sample of entries (only counts are printed). The
        first attachment found is downloaded once and only its size is compared."""
        if "attachment" not in cmd:
            return "übersprungen (Anbieter ohne Anhänge über das CLI)"
        sample = state["list"]["items"][:a.limit]
        counts = {"Einträge geprüft": 0, "mit Anhängen": 0, "Anhänge": 0, "mit Passwortverlauf": 0, "mit Passkeys": 0}
        first = None
        for it in sample:
            got = cmd["reveal"](ref(it))
            counts["Einträge geprüft"] += 1
            att = got.get("attachments") or []
            counts["Anhänge"] += len(att)
            counts["mit Anhängen"] += bool(att)
            counts["mit Passwortverlauf"] += bool(got.get("passwordHistory"))
            counts["mit Passkeys"] += bool(got.get("passkeys") or it.get("passkeys"))
            if att and first is None:
                first = (it, att[0])
        state["attachment"] = first
        return ", ".join(f"{k}: {v}" for k, v in counts.items())

    def download():
        if not state.get("attachment"):
            return "übersprungen (kein Anhang in der Stichprobe; mehr mit --limit)"
        it, meta = state["attachment"]
        got = cmd["attachment"]({**ref(it), "fileId": meta["id"]})
        size = len(__import__("base64").b64decode(got["data"]))
        if meta.get("size") and meta["size"] != size:
            raise RuntimeError(f"Größe {size} B statt {meta['size']} B")
        return f"{size} B"

    if not step("Status", status):
        finish()
    if step("Liste ohne Geheimnisse", listing):
        step("Ein Geheimnis abrufen", reveal)
        step("Anhänge, Passwortverlauf, Passkeys zählen", extras)
        step("Einen Anhang herunterladen (nur Größe)", download)
    if not a.write:
        finish()

    created = {}
    if proton:
        vaults = {v["name"]: v["shareId"] for v in state["list"]["vaults"]}
        if a.vault not in vaults:
            print(f"FAIL  Testtresor „{a.vault}“ nicht gefunden – bitte leer anlegen und mit --vault angeben")
            results.append(False)
            finish()
        share = vaults[a.vault]

    def create():
        if proton:
            r = cmd["create"]({"shareId": share, "type": "login", "title": NAME, "username": "selftest",
                               "password": "Selbsttest-1!", "urls": ["https://example.org"]})
            created.update(shareId=share, itemId=r["itemId"])
        else:
            r = cmd["create"]({"type": "login", "name": NAME, "username": "selftest", "password": "Selbsttest-1!",
                               "uris": ["https://example.org"], "notes": "Notiz", "folder": None})
            created["id"] = r.get("id") or next(i["id"] for i in cmd["list"]({})["items"] if i.get("name") == NAME)
        return None

    def update():
        if proton:
            cmd["update"]({**created, "fields": {"password": "Selbsttest-2!"}})
        else:
            cmd["update"]({**created, "name": NAME, "username": "selftest", "password": "Selbsttest-2!",
                           "uris": ["https://example.org"], "notes": "Notiz", "folder": None})
        assert cmd["reveal"](created).get("password") == "Selbsttest-2!", "Passwort nicht geändert"
        return None

    def conflict():
        """The host must refuse an edit based on an outdated revision (item changed elsewhere meanwhile)."""
        if a.backend == "pass":
            return "übersprungen (pass kennt keinen Änderungsstand)"
        rev = cmd["reveal"](created).get("revision")
        if not rev:
            raise RuntimeError("das Programm meldet keinen Änderungsstand – die Konflikterkennung greift nicht")
        stale = {"revision": "veraltet-0"}
        try:
            if proton:
                cmd["update"]({**created, **stale, "fields": {"password": "Selbsttest-3!"}})
            else:
                cmd["update"]({**created, **stale, "name": NAME, "username": "selftest", "password": "Selbsttest-3!",
                               "uris": ["https://example.org"], "notes": "Notiz", "folder": None})
        except HostError as e:
            if e.code == "conflict":
                return "veralteter Stand wird abgelehnt"
            raise
        raise RuntimeError("ein veralteter Stand wurde überschrieben")

    def move():
        other = next((s for n, s in vaults.items() if n != a.vault), None)
        if not other:
            return "übersprungen (nur ein Tresor)"
        there = cmd["move"]({**created, "toShareId": other})
        back = cmd["move"]({"shareId": other, "itemId": there["itemId"], "toShareId": share})
        created["itemId"] = back["itemId"] or created["itemId"]
        return "hin und zurück"

    def delete():
        cmd["delete"](created)
        return "Papierkorb" if proton else "gelöscht"

    if step("Anlegen (Geheimnisse über stdin)", create):
        step("Ändern", update)
        step("Konflikterkennung (Änderungsstand des Programms)", conflict)
        if proton:
            step("In anderen Tresor verschieben", move)
        step("Löschen", delete)
    if a.backend == "onepassword":
        typed_items(cmd)
    finish()


CARD = {"cardholderName": "Selbst Test", "number": "4111111111111111", "code": "123", "expMonth": "07", "expYear": "2031"}
IDENTITY = {"firstName": "Selbst", "middleName": "T", "lastName": "Test", "company": "Beispiel GmbH",
            "email": "selbsttest@example.com", "phone": "+49 30 000000", "username": "selbsttest"}


def typed_items(cmd):
    """1Password: a card and an identity from the category templates of the installed `op` – created, read back,
    edited and deleted. Compares values, prints only which fields matched."""
    for kind, data, change in (("card", CARD, {"code": "456", "expMonth": "12", "expYear": "2032"}),
                               ("identity", IDENTITY, {"phone": "+49 30 111111", "company": "Beispiel AG"})):
        label = "Karte" if kind == "card" else "Identität"
        made = {}

        def create():
            r = cmd["create"]({"type": kind, "name": f"{NAME} {label}", "notes": "Notiz", kind: data})
            made["id"] = r["id"]
            return None

        def check(expected):
            got = (cmd["reveal"](made).get(kind) or {})
            wrong = sorted(k for k, v in expected.items() if str(got.get(k) or "") != v)
            if wrong:
                raise RuntimeError(f"Felder weichen ab: {wrong}")
            return f"{len(expected)} Felder stimmen"

        def update():
            current = cmd["reveal"](made)
            cmd["update"]({**made, "type": kind, "name": f"{NAME} {label}", "notes": "Notiz", "revision": current.get("revision"),
                           kind: {**(current.get(kind) or {}), **change}})
            return check({**data, **change})

        if step(f"{label} aus der op-Vorlage anlegen", create):
            step(f"{label} zurücklesen", lambda: check(data))
            step(f"{label} ändern", update)
            step(f"{label} löschen", lambda: cmd["delete"](made) and None)


if __name__ == "__main__":
    main()
