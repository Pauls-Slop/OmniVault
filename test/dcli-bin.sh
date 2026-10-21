#!/bin/sh
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
#
# Prints the path of a Dashlane CLI binary for the tests: $OMNIVAULT_DCLI_BIN if set, otherwise the pinned official
# release (github.com/Dashlane/dashlane-cli, v6.2642.0, dcli-linux-x64; the release publishes no checksum file, the
# SHA-256 below was taken from the downloaded file), downloaded once to $DCLI_DIR (default /tmp/omnivault-dcli).
# Used without an account only (version, status, "not signed in"). Never shipped with OmniVault.
set -eu
if [ -n "${OMNIVAULT_DCLI_BIN:-}" ]; then echo "$OMNIVAULT_DCLI_BIN"; exit 0; fi
DIR=${DCLI_DIR:-${TMPDIR:-/tmp}/omnivault-dcli}
URL=https://github.com/Dashlane/dashlane-cli/releases/download/v6.2642.0/dcli-linux-x64
SHA256=d0e0bd0e237a5dcdff9be376a0f7cb3cea0fdc13b34dfc656492dde6d0618c88
BIN=$DIR/dcli
if [ ! -x "$BIN" ]; then
  mkdir -p "$DIR" && rm -rf "$DIR/dl" && mkdir -p "$DIR/dl"
  curl -fsSL -o "$DIR/dl/dcli" "$URL"
  echo "$SHA256  $DIR/dl/dcli" | sha256sum -c - >/dev/null
  mv "$DIR/dl/dcli" "$BIN" && chmod +x "$BIN" && rm -rf "$DIR/dl"
fi
echo "$BIN"
