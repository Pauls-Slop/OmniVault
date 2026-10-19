#!/bin/sh
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
#
# Local Vaultwarden for tests: test/vaultwarden-server.sh start|stop  (port $VW_PORT, default 8800)
# Uses $VAULTWARDEN_BIN if set, otherwise downloads a pinned, hash-checked static Linux build.
# NOTE: the default download is a third-party build of upstream Vaultwarden (github.com/zouzonghao/vaultwarden,
# release upstream-20261010-183532-64895524); the Vaultwarden project itself only publishes container images.
# It runs only on 127.0.0.1 with throw-away data and is never shipped with OmniVault.
set -eu
PORT=${VW_PORT:-8800}
DIR=${VW_DIR:-${TMPDIR:-/tmp}/omnivault-vaultwarden}
URL=https://github.com/zouzonghao/vaultwarden/releases/download/upstream-20261010-183532-64895524/vaultwarden-linux-amd64-musl
SHA256=7d993ce39cc4d3b16bcff4e7aeaf97e452c4be822012e8baa2e54a55289d8ed9
mkdir -p "$DIR"
case "${1:-start}" in
  start)
    "$0" stop
    BIN=${VAULTWARDEN_BIN:-$DIR/vaultwarden}
    if [ ! -x "$BIN" ]; then
      curl -fsSL -o "$BIN.part" "$URL"
      echo "$SHA256  $BIN.part" | sha256sum -c - >/dev/null
      mv "$BIN.part" "$BIN" && chmod +x "$BIN"
    fi
    rm -rf "$DIR/data" && mkdir -p "$DIR/data"
    DATA_FOLDER="$DIR/data" ROCKET_ADDRESS=127.0.0.1 ROCKET_PORT=$PORT WEB_VAULT_ENABLED=false \
    SIGNUPS_ALLOWED=true SIGNUPS_VERIFY=false DOMAIN=http://localhost:$PORT LOG_LEVEL=warn \
    LOGIN_RATELIMIT_SECONDS=1 LOGIN_RATELIMIT_MAX_BURST=1000 ADMIN_RATELIMIT_SECONDS=1 ADMIN_RATELIMIT_MAX_BURST=1000 \
      setsid nohup "$BIN" > "$DIR/vaultwarden.log" 2>&1 < /dev/null &
    echo $! > "$DIR/pid"
    for i in $(seq 1 50); do
      curl -fs "http://127.0.0.1:$PORT/alive" >/dev/null 2>&1 && { echo "Vaultwarden läuft: http://127.0.0.1:$PORT"; exit 0; }
      sleep 0.2
    done
    echo "Vaultwarden startet nicht, siehe $DIR/vaultwarden.log" >&2; exit 1 ;;
  stop)
    if [ -f "$DIR/pid" ]; then
      kill "$(cat "$DIR/pid")" 2>/dev/null || true
      for i in $(seq 1 25); do kill -0 "$(cat "$DIR/pid")" 2>/dev/null || break; sleep 0.2; done
    fi
    rm -f "$DIR/pid" ;;
esac
