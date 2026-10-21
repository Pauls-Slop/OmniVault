#!/bin/sh
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
#
# Firefox for the browser test: test/firefox.sh fetch   → prints the path of the firefox binary
#                              test/firefox.sh test    → fetch (unless $FIREFOX_BIN is set), then test/e2e-firefox.mjs
# Uses $FIREFOX_BIN if set, otherwise downloads a pinned, hash-checked Firefox 158.0 (Linux x86_64) once.
# NOTE: the default download is a third-party AppImage (github.com/ivan-hc/Firefox-appimage, release 20261019-232047)
# that repackages Mozilla's official release tarball unchanged (application.ini: mozilla-release, BuildID
# 20261007201254) plus a launcher; it is unpacked, never executed as an AppImage. Use $FIREFOX_BIN for a Firefox
# from Mozilla or your distribution. Any Firefox ≥ 140 works (WebDriver BiDi webExtension.install).
set -eu
DIR=${FIREFOX_DIR:-${TMPDIR:-/tmp}/omnivault-firefox}
URL=https://github.com/ivan-hc/Firefox-appimage/releases/download/20261019-232047/Firefox-stable-158.0-x86_64.AppImage
SHA256=71ad10166c883119ddd149f419f27303d11160e3ce94ad998be92a26c757109c

fetch() {
  if [ -n "${FIREFOX_BIN:-}" ]; then echo "$FIREFOX_BIN"; return; fi
  if [ ! -x "$DIR/firefox/firefox" ]; then
    mkdir -p "$DIR"
    curl -fsSL -o "$DIR/firefox.AppImage.part" "$URL"
    echo "$SHA256  $DIR/firefox.AppImage.part" | sha256sum -c - >/dev/null
    # an AppImage is an ELF runtime followed by a SquashFS image; unpack with the runtime's own extractor
    chmod +x "$DIR/firefox.AppImage.part"
    rm -rf "$DIR/squashfs-root" "$DIR/firefox"
    (cd "$DIR" && ./firefox.AppImage.part --appimage-extract >/dev/null)
    mv "$DIR/squashfs-root" "$DIR/firefox"
    rm -f "$DIR/firefox.AppImage.part"
  fi
  echo "$DIR/firefox/firefox"
}

case "${1:-fetch}" in
  fetch) fetch ;;
  test)
    shift
    BIN=$(fetch)
    FIREFOX_BIN=$BIN node test/e2e-firefox.mjs "$@" ;;
  *) echo "usage: $0 fetch|test [screenshot-dir]" >&2; exit 2 ;;
esac
