#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""
Self-test of the OmniVault host against YOUR own, unlocked CLI session.

  python3 selftest.py pass                         # read-only
  python3 selftest.py onepassword --write          # also create, edit and delete a throw-away entry
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

    if not step("Status", status):
        finish()
    if step("Liste ohne Geheimnisse", listing):
        step("Ein Geheimnis abrufen", reveal)
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
    finish()


if __name__ == "__main__":
    main()
