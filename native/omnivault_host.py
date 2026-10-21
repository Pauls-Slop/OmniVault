#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""
OmniVault native messaging host.

Bridges the browser extension to official command-line password managers that the user installed and
unlocked themselves – nothing of them is bundled:

  backend "proton"       Proton Pass   (`pass-cli`)
  backend "pass"         pass          (zx2c4 password-store + gpg)
  backend "gopass"       gopass        (`gopass` + gpg)
  backend "onepassword"  1Password     (`op`)
  backend "lastpass"     LastPass      (`lpass`)

Request {"id", "backend", "cmd", "args"} → response {"id", "ok", "result" | "error"}; large item lists are sent
in several messages with "more": true. Only commands from each backend's fixed list are accepted. Python 3
standard library only.
"""
import sys

import ov_gopass
import ov_lastpass
import ov_onepassword
import ov_pass
import ov_proton
from ov_common import HostError, read_message, respond, write_message

BACKENDS = {
    "proton": ov_proton.COMMANDS,
    "pass": ov_pass.COMMANDS,
    "gopass": ov_gopass.COMMANDS,
    "onepassword": ov_onepassword.COMMANDS,
    "lastpass": ov_lastpass.COMMANDS,
}


def dispatch(req):
    backend = BACKENDS.get(req.get("backend"))
    if backend is None:
        raise HostError(f"Unbekanntes Backend {req.get('backend')}")
    fn = backend.get(req.get("cmd"))
    if fn is None:
        raise HostError(f"Unbekannter Befehl {req.get('cmd')}")
    return fn(req.get("args") or {})


def main():
    stdin, stdout = sys.stdin.buffer, sys.stdout.buffer
    while True:
        req = read_message(stdin)
        if req is None:
            return
        req_id = req.get("id")
        try:
            respond(stdout, req_id, dispatch(req))
        except HostError as e:
            write_message(stdout, {"id": req_id, "ok": False, "error": str(e), **({"code": e.code} if e.code else {})})
        except Exception as e:  # never leak a traceback to the page, but report the type
            write_message(stdout, {"id": req_id, "ok": False, "error": f"Interner Fehler im Host: {type(e).__name__}"})


if __name__ == "__main__":
    main()
