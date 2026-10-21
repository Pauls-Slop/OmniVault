#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""
Installs (or removes) the OmniVault native messaging host for the current user.

  python3 install.py --chrome-id <EXTENSION_ID>     # Chrome/Chromium/Brave/Edge + Firefox
  python3 install.py --firefox-only
  python3 install.py --chrome-id <ID> --keepassxc   # also connect KeePassXC (via its own keepassxc-proxy)
  python3 install.py --uninstall

One host (org.omnivault.host) serves Proton Pass (`pass-cli`), pass (+ gpg), gopass (+ gpg), 1Password (`op`),
LastPass (`lpass`) and Dashlane (`dcli`). The Chrome extension ID is shown on chrome://extensions (developer mode); Firefox uses the
fixed add-on ID. Only the Python 3 standard library is required; each CLI is installed and unlocked separately.
"""
import argparse
import json
import os
import platform
import shutil
import stat
import sys

FIREFOX_ID = "omnivault@example.org"
HERE = os.path.dirname(os.path.abspath(__file__))
SYSTEM = platform.system()

# The host: its native-messaging name, the files to copy (first one is the entry point) and a description.
HOSTS = [
    {"name": "org.omnivault.host",
     "files": ["omnivault_host.py", "ov_common.py", "ov_proton.py", "ov_pass.py", "ov_gopass.py", "ov_onepassword.py", "ov_lastpass.py", "ov_dashlane.py"],
     "desc": "OmniVault – Proton Pass, pass, gopass, 1Password, LastPass, Dashlane (CLI)"},
]
LEGACY_HOST_NAMES = ["org.omnivault.proton", "org.omnivault.cli"]  # before 2.0: removed on install/uninstall
# KeePassXC: no OmniVault code runs; the manifest under OmniVault's own name points to KeePassXC's keepassxc-proxy
# (KeePassXC's own manifest only admits the official extensions and is rewritten by KeePassXC).
KEEPASSXC_HOST = "org.omnivault.keepassxc"
ALL_HOST_NAMES = [h["name"] for h in HOSTS] + LEGACY_HOST_NAMES + [KEEPASSXC_HOST]


def find_keepassxc_proxy():
    """Where keepassxc-proxy usually lives; None if not found (then --keepassxc-proxy PATH)."""
    found = shutil.which("keepassxc-proxy")
    if found:
        return found
    candidates = {
        "Darwin": ["/Applications/KeePassXC.app/Contents/MacOS/keepassxc-proxy"],
        "Windows": [os.path.join(os.environ.get(v, ""), "KeePassXC", "keepassxc-proxy.exe") for v in ("ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA")],
        "Linux": ["/usr/bin/keepassxc-proxy", "/usr/local/bin/keepassxc-proxy", "/snap/bin/keepassxc.proxy"],
    }.get(SYSTEM, [])
    return next((c for c in candidates if c and os.path.isfile(c)), None)


def install_dir():
    if SYSTEM == "Windows":
        return os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "OmniVault")
    if SYSTEM == "Darwin":
        return os.path.expanduser("~/Library/Application Support/OmniVault")
    return os.path.join(os.environ.get("XDG_DATA_HOME", os.path.expanduser("~/.local/share")), "omnivault")


def manifest_dirs():
    home = os.path.expanduser("~")
    if SYSTEM == "Darwin":
        base = os.path.join(home, "Library", "Application Support")
        return {
            "chrome": [os.path.join(base, p, "NativeMessagingHosts") for p in
                       ("Google/Chrome", "Chromium", "BraveSoftware/Brave-Browser", "Microsoft Edge")],
            "firefox": [os.path.join(base, "Mozilla", "NativeMessagingHosts")],
        }
    if SYSTEM == "Linux":
        cfg = os.environ.get("XDG_CONFIG_HOME", os.path.join(home, ".config"))
        return {
            "chrome": [os.path.join(cfg, p, "NativeMessagingHosts") for p in
                       ("google-chrome", "chromium", "BraveSoftware/Brave-Browser", "microsoft-edge")],
            "firefox": [os.path.join(home, ".mozilla", "native-messaging-hosts")],
        }
    return {"chrome": [], "firefox": []}  # Windows: registry, see below


WINDOWS_KEYS = {
    "chrome": [r"Software\Google\Chrome\NativeMessagingHosts", r"Software\Chromium\NativeMessagingHosts",
               r"Software\BraveSoftware\Brave-Browser\NativeMessagingHosts", r"Software\Microsoft\Edge\NativeMessagingHosts"],
    "firefox": [r"Software\Mozilla\NativeMessagingHosts"],
}


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def install_host_files(host):
    """Copies a host's files into the install dir, returns the path browsers should launch (entry point)."""
    target = install_dir()
    os.makedirs(target, exist_ok=True)
    entry = None
    for i, fname in enumerate(host["files"]):
        dest = os.path.join(target, fname)
        shutil.copyfile(os.path.join(HERE, fname), dest)
        if i == 0:
            entry = dest
    if SYSTEM == "Windows":
        launcher = os.path.join(target, os.path.splitext(host["files"][0])[0] + ".bat")
        with open(launcher, "w", encoding="utf-8") as f:
            f.write(f'@echo off\r\n"{sys.executable}" -u "{entry}" %*\r\n')
        return launcher
    os.chmod(entry, os.stat(entry).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    # Pin the interpreter that ran the installer (browsers start hosts without the user's shell PATH).
    with open(entry, encoding="utf-8") as f:
        src = f.read().split("\n", 1)[1]
    with open(entry, "w", encoding="utf-8") as f:
        f.write(f"#!{sys.executable}\n{src}")
    return entry


def manifests(host, path, chrome_ids):
    chrome = {"name": host["name"], "description": host["desc"], "path": path, "type": "stdio",
              "allowed_origins": [f"chrome-extension://{i}/" for i in chrome_ids]}
    firefox = {"name": host["name"], "description": host["desc"], "path": path, "type": "stdio",
               "allowed_extensions": [FIREFOX_ID]}
    return chrome, firefox


def remove_legacy(dirs):
    """Removes host registrations and files of OmniVault before 2.0 (separate Proton and CLI hosts)."""
    for d in dirs["chrome"] + dirs["firefox"]:
        for name in LEGACY_HOST_NAMES:
            p = os.path.join(d, f"{name}.json")
            if os.path.exists(p):
                os.remove(p)
    for old in ("omnivault_proton_host.py", "omnivault_cli_host.py", "omnivault_cli_backends.py",
                "omnivault_proton_host.bat", "omnivault_cli_host.bat"):
        p = os.path.join(install_dir(), old)
        if os.path.exists(p):
            os.remove(p)
    if SYSTEM == "Windows":
        import winreg
        for key in WINDOWS_KEYS["chrome"] + WINDOWS_KEYS["firefox"]:
            for name in LEGACY_HOST_NAMES:
                try:
                    winreg.DeleteKey(winreg.HKEY_CURRENT_USER, f"{key}\\{name}")
                except OSError:
                    pass


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--chrome-id", action="append", default=[], help="ID der OmniVault-Erweiterung in Chrome (mehrfach möglich)")
    ap.add_argument("--firefox-only", action="store_true")
    ap.add_argument("--chrome-profile-dir", help="nur für Tests: Chromium-Benutzerdatenordner (--user-data-dir)")
    ap.add_argument("--uninstall", action="store_true")
    ap.add_argument("--keepassxc", action="store_true", help="KeePassXC über dessen keepassxc-proxy anbinden")
    ap.add_argument("--keepassxc-proxy", help="Pfad zu keepassxc-proxy, falls nicht automatisch gefunden")
    a = ap.parse_args()

    dirs = manifest_dirs()
    if a.chrome_profile_dir:
        dirs = {"chrome": [os.path.join(a.chrome_profile_dir, "NativeMessagingHosts")], "firefox": []}
    if a.uninstall:
        for d in dirs["chrome"] + dirs["firefox"]:
            for name in ALL_HOST_NAMES:
                p = os.path.join(d, f"{name}.json")
                if os.path.exists(p):
                    os.remove(p)
                    print(f"entfernt: {p}")
        if SYSTEM == "Windows":
            import winreg
            for key in WINDOWS_KEYS["chrome"] + WINDOWS_KEYS["firefox"]:
                for name in ALL_HOST_NAMES:
                    try:
                        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, f"{key}\\{name}")
                    except OSError:
                        pass
        shutil.rmtree(install_dir(), ignore_errors=True)
        return

    if not a.firefox_only and not a.chrome_id:
        ap.error("--chrome-id fehlt (oder --firefox-only angeben)")
    remove_legacy(dirs)
    written = []
    targets = ([] if a.firefox_only else [("chrome", d) for d in dirs["chrome"]]) + [("firefox", d) for d in dirs["firefox"]]
    hosts = list(HOSTS)
    if a.keepassxc or a.keepassxc_proxy:
        proxy = a.keepassxc_proxy or find_keepassxc_proxy()
        if not proxy or not os.path.isfile(proxy):
            print("keepassxc-proxy wurde nicht gefunden. Bitte mit --keepassxc-proxy PFAD angeben "
                  "(bei Flatpak: siehe native/README.md).", file=sys.stderr)
            sys.exit(1)
        hosts.append({"name": KEEPASSXC_HOST, "proxy": os.path.abspath(proxy), "desc": "OmniVault – KeePassXC (keepassxc-proxy)"})
    for host in hosts:
        path = host["proxy"] if "proxy" in host else install_host_files(host)
        chrome, firefox = manifests(host, path, a.chrome_id)
        if SYSTEM == "Windows":
            import winreg
            base = install_dir()
            for kind, data in (("chrome", chrome), ("firefox", firefox)):
                if kind == "chrome" and a.firefox_only:
                    continue
                mpath = os.path.join(base, f"{host['name']}.{kind}.json")
                write_json(mpath, data)
                for key in WINDOWS_KEYS[kind]:
                    k = winreg.CreateKey(winreg.HKEY_CURRENT_USER, f"{key}\\{host['name']}")
                    winreg.SetValueEx(k, "", 0, winreg.REG_SZ, mpath)
                    written.append(f"HKCU\\{key}\\{host['name']}")
        else:
            for kind, d in targets:
                # only register for browsers that exist (their config folder is present)
                if not a.chrome_profile_dir and not os.path.isdir(os.path.dirname(d)):
                    continue
                p = os.path.join(d, f"{host['name']}.json")
                write_json(p, chrome if kind == "chrome" else firefox)
                written.append(p)
        print(f"KeePassXC-Proxy verwendet: {path}" if "proxy" in host else f"Host installiert: {path}")
    for w in written:
        print(f"registriert: {w}")
    if not written:
        print("Kein unterstützter Browser gefunden.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
