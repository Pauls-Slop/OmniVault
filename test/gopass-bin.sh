#!/bin/sh
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
#
# Prints the path of a gopass binary for the tests: $OMNIVAULT_GOPASS_BIN if set, otherwise the pinned, hash-checked
# official release (github.com/gopasspw/gopass, v1.17.4, gopass-1.17.4-linux-amd64.tar.gz; hash as in the release's
# gopass_1.17.4_SHA256SUMS), downloaded once to $GOPASS_DIR (default /tmp/omnivault-gopass). Never shipped with OmniVault.
set -eu
if [ -n "${OMNIVAULT_GOPASS_BIN:-}" ]; then echo "$OMNIVAULT_GOPASS_BIN"; exit 0; fi
DIR=${GOPASS_DIR:-${TMPDIR:-/tmp}/omnivault-gopass}
URL=https://github.com/gopasspw/gopass/releases/download/v1.17.4/gopass-1.17.4-linux-amd64.tar.gz
SHA256=fe63584ba2275409c54d060d7f601de24d03ca980b11e617cd30cd9c4814597a
BIN=$DIR/gopass
if [ ! -x "$BIN" ]; then
  mkdir -p "$DIR" && rm -rf "$DIR/dl" && mkdir -p "$DIR/dl"
  curl -fsSL -o "$DIR/dl/gopass.tar.gz" "$URL"
  echo "$SHA256  $DIR/dl/gopass.tar.gz" | sha256sum -c - >/dev/null
  tar xzf "$DIR/dl/gopass.tar.gz" -C "$DIR/dl" gopass
  mv "$DIR/dl/gopass" "$BIN" && chmod +x "$BIN" && rm -rf "$DIR/dl"
fi
echo "$BIN"
