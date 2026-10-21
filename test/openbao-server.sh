#!/bin/sh
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
#
# Local OpenBao dev server for tests: test/openbao-server.sh start|stop  (port $BAO_PORT, default 8820, root token "root")
# Uses $OPENBAO_BIN if set, otherwise downloads the pinned, hash-checked official release
# (github.com/openbao/openbao, v2.7.1, openbao_2.7.1_linux_amd64.tar.gz; hash as in the release's checksums.txt).
# Dev mode keeps everything in memory, listens only on 127.0.0.1 and mounts KV v2 at secret/. Never shipped with OmniVault.
set -eu
PORT=${BAO_PORT:-8820}
DIR=${BAO_DIR:-${TMPDIR:-/tmp}/omnivault-openbao}
URL=https://github.com/openbao/openbao/releases/download/v2.7.1/openbao_2.7.1_linux_amd64.tar.gz
SHA256=0e2f1ce10d124e03112b50dd2fbec6b78003783253bc3a91587938f39d1e2243
mkdir -p "$DIR"
case "${1:-start}" in
  start)
    "$0" stop
    BIN=${OPENBAO_BIN:-$DIR/bao}
    if [ ! -x "$BIN" ]; then
      rm -rf "$DIR/dl" && mkdir -p "$DIR/dl"
      curl -fsSL -o "$DIR/dl/bao.tar.gz" "$URL"
      echo "$SHA256  $DIR/dl/bao.tar.gz" | sha256sum -c - >/dev/null
      tar xzf "$DIR/dl/bao.tar.gz" -C "$DIR/dl" bao
      mv "$DIR/dl/bao" "$BIN" && chmod +x "$BIN" && rm -rf "$DIR/dl"
    fi
    HOME="$DIR" setsid nohup "$BIN" server -dev -dev-root-token-id=root -dev-listen-address="127.0.0.1:$PORT" -dev-no-store-token \
      -log-level=warn > "$DIR/openbao.log" 2>&1 < /dev/null &
    echo $! > "$DIR/pid"
    for i in $(seq 1 100); do
      curl -fs "http://127.0.0.1:$PORT/v1/sys/health" >/dev/null 2>&1 && { echo "OpenBao läuft: http://127.0.0.1:$PORT"; exit 0; }
      sleep 0.2
    done
    echo "OpenBao startet nicht, siehe $DIR/openbao.log" >&2; exit 1 ;;
  stop)
    if [ -f "$DIR/pid" ]; then
      kill "$(cat "$DIR/pid")" 2>/dev/null || true
      for i in $(seq 1 25); do kill -0 "$(cat "$DIR/pid")" 2>/dev/null || break; sleep 0.2; done
    fi
    rm -f "$DIR/pid" ;;
esac
