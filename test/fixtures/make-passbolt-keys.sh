#!/usr/bin/env bash
# Regenerates test-only OpenPGP keys for the simulated Passbolt server (test/fake-passbolt.js).
# These keys protect nothing and must never be used for real data.
set -euo pipefail
out="$(cd "$(dirname "$0")" && pwd)/passbolt-keys.json"
export GNUPGHOME="$(mktemp -d)"; trap 'gpgconf --kill gpg-agent; rm -rf "$GNUPGHOME"' EXIT
gen() { # name uid primary sub passphrase
  local G=(gpg --batch --yes --pinentry-mode loopback --passphrase "$5")
  "${G[@]}" --quick-gen-key "$2" "$3" sign,cert never 2>/dev/null
  local f; f=$(gpg --with-colons -k "$2" | awk -F: '/^fpr/{print $10; exit}')
  "${G[@]}" --quick-add-key "$f" "$4" encr never 2>/dev/null
  # Same preferences as keys created by OpenPGP.js / the Passbolt browser extension (no AEAD).
  printf 'setpref AES256 AES SHA256 SHA512 ZLIB ZIP Uncompressed MDC\ny\nsave\n' | "${G[@]}" --command-fd 0 --edit-key "$f" 2>/dev/null
  python3 - "$1" "$f" "$(gpg --armor --export "$f")" "$("${G[@]}" --armor --export-secret-keys "$f")" "$5" <<'PY'
import json, sys, os
name, fpr, pub, sec, pw = sys.argv[1:]
path = os.environ['OUT']
data = json.load(open(path)) if os.path.exists(path) and os.path.getsize(path) else {}
data[name] = {'fingerprint': fpr, 'passphrase': pw, 'public': pub + '\n', 'private': sec + '\n'}
json.dump(data, open(path, 'w'), indent=2)
PY
}
export OUT="$out"; : > "$out"
gen userRsa 'Ada Test <ada@passbolt.test>' rsa3072 rsa3072 'ada-passphrase'
gen userEcc 'Bob Test <bob@passbolt.test>' ed25519 cv25519 'bob-passphrase'
gen server 'Passbolt Server <server@passbolt.test>' rsa2048 rsa2048 ''
gen metadata 'Passbolt Metadata Key <no-reply@passbolt.test>' ed25519 cv25519 ''
echo "written $out"
