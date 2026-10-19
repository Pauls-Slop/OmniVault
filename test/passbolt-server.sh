#!/bin/sh
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
#
# Local Passbolt CE for tests (127.0.0.1 only, throw-away data, never shipped with OmniVault):
#   test/passbolt-server.sh start            fresh install, server on http://127.0.0.1:$PB_PORT (default 8900)
#   test/passbolt-server.sh register E F L R prints the setup URL of a new user (R = user | admin)
#   test/passbolt-server.sh cake ARGS…       runs bin/cake as the service user
#   test/passbolt-server.sh stop
#
# Needs: PHP ≥ 8.2 with the gnupg extension (php-gnupg; or set PHP_GNUPG_SO=/path/gnupg.so), composer, git,
# gpg and the PostgreSQL server binaries (PG_BIN, default from pg_config). Passbolt v$PB_VERSION is cloned from
# GitHub and its dependencies are installed from their git sources (composer --prefer-source).
# PHP's ldap extension is only used by Passbolt PRO; when it is missing, the requirement check is skipped for this
# test instance only. Run as root, everything runs as the user $PB_USER (created if missing), because
# PostgreSQL refuses to run as root.
set -eu
PB_VERSION=${PB_VERSION:-5.16.0}
PORT=${PB_PORT:-8900}
PG_PORT=${PB_PG_PORT:-5433}
DIR=${PB_DIR:-${TMPDIR:-/tmp}/omnivault-passbolt}
PB_USER=${PB_USER:-omnivault-pb}
PG_BIN=${PG_BIN:-$(pg_config --bindir 2>/dev/null || echo /usr/lib/postgresql/16/bin)}
APP=$DIR/passbolt_api
HOME_DIR=$DIR/home

as_user() { # run a shell snippet as the service user with Passbolt's environment
  env_line="export HOME=$HOME_DIR GNUPGHOME=$HOME_DIR/.gnupg PHP_INI_SCAN_DIR=${PHP_INI_SCAN_DIR:-$(php -r 'echo PHP_CONFIG_FILE_SCAN_DIR;')}:$DIR/php OMNIVAULT_TEST_NO_LDAP=1;"
  if [ "$(id -u)" = 0 ]; then su "$PB_USER" -s /bin/sh -c "$env_line $1"; else sh -c "$env_line $1"; fi
}
cake() { as_user "cd $APP && ./bin/cake $*"; }

install_app() {
  [ -f "$APP/vendor/autoload.php" ] && return
  git clone -q --depth 1 --branch "v$PB_VERSION" https://github.com/passbolt/passbolt_api.git "$APP"
  (cd "$APP" && COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_NO_INTERACTION=1 composer install -q --no-dev --prefer-source \
    --ignore-platform-req=ext-gnupg --ignore-platform-req=ext-ldap --no-scripts)
  # The ldap extension is a PRO requirement; allow this test instance to run without it.
  sed -i "s/if (!extension_loaded('ldap')) {/if (!extension_loaded('ldap') \&\& !getenv('OMNIVAULT_TEST_NO_LDAP')) {/" "$APP/config/requirements.php"
}

case "${1:-start}" in
  start)
    "$0" stop >/dev/null 2>&1 || true
    if [ "$(id -u)" = 0 ] && ! id "$PB_USER" >/dev/null 2>&1; then useradd -M -s /bin/sh "$PB_USER"; fi
    mkdir -p "$DIR/php"
    install_app
    if [ -n "${PHP_GNUPG_SO:-}" ]; then echo "extension=$PHP_GNUPG_SO" > "$DIR/php/gnupg.ini"; fi
    rm -rf "$DIR/pgdata" "$HOME_DIR" "$APP/config/jwt/jwt.key" "$APP/config/jwt/jwt.pem"
    mkdir -p "$DIR/pgdata" "$HOME_DIR/.gnupg"
    chmod 700 "$DIR/pgdata" "$HOME_DIR" "$HOME_DIR/.gnupg"
    [ "$(id -u)" = 0 ] && chown -R "$PB_USER" "$DIR"

    # database
    as_user "$PG_BIN/initdb -D $DIR/pgdata -U postgres --auth=trust -E UTF8 >/dev/null && \
      $PG_BIN/pg_ctl -D $DIR/pgdata -o '-p $PG_PORT -k /tmp -c listen_addresses=127.0.0.1' -l $DIR/pg.log -w start >/dev/null && \
      $PG_BIN/createdb -h 127.0.0.1 -p $PG_PORT -U postgres passbolt"

    # server key (RSA 3072, signing primary + encryption subkey, no passphrase)
    as_user "gpg --batch --quiet --passphrase '' --quick-gen-key 'Passbolt Test Server <server@passbolt.test>' rsa3072 sign never 2>/dev/null; \
      FP=\$(gpg --list-secret-keys --with-colons | awk -F: '/^fpr/ {print \$10; exit}'); \
      gpg --batch --quiet --passphrase '' --quick-add-key \$FP rsa3072 encr never 2>/dev/null; \
      gpg --armor --export \$FP > $APP/config/gpg/serverkey.asc; \
      gpg --armor --batch --pinentry-mode loopback --passphrase '' --export-secret-keys \$FP > $APP/config/gpg/serverkey_private.asc; \
      echo \$FP > $DIR/server.fpr"
    FPR=$(cat "$DIR/server.fpr")
    cat > "$APP/config/passbolt.php" <<EOF
<?php
// Local test instance for OmniVault (127.0.0.1 only, throw-away data).
return [
    'App' => ['fullBaseUrl' => 'http://127.0.0.1:$PORT'],
    'Security' => ['salt' => '$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')'],
    'Datasources' => ['default' => [
        'className' => \Cake\Database\Connection::class, 'driver' => \Cake\Database\Driver\Postgres::class,
        'host' => '127.0.0.1', 'port' => $PG_PORT, 'username' => 'postgres', 'password' => '', 'database' => 'passbolt',
        'encoding' => 'utf8',
    ]],
    'EmailTransport' => ['default' => ['className' => 'Debug']],
    'Email' => ['default' => ['transport' => 'default', 'from' => ['passbolt@passbolt.test' => 'Passbolt']]],
    'passbolt' => [
        'ssl' => ['force' => false],
        'gpg' => ['serverKey' => [
            'fingerprint' => '$FPR',
            'public' => CONFIG . 'gpg' . DS . 'serverkey.asc',
            'private' => CONFIG . 'gpg' . DS . 'serverkey_private.asc',
        ]],
        'security' => ['cookies' => ['secure' => false]],
    ],
];
EOF
    [ -f "$APP/config/app.php" ] || cp "$APP/config/app.default.php" "$APP/config/app.php"
    [ "$(id -u)" = 0 ] && chown -R "$PB_USER" "$APP/config"
    chmod 750 "$APP/config/jwt"
    cake passbolt create_jwt_keys >/dev/null
    chmod 550 "$APP/config/jwt" && chmod 440 "$APP/config/jwt/jwt.key" "$APP/config/jwt/jwt.pem"
    cake passbolt install --no-admin --force > "$DIR/install.log" 2>&1 || { tail -20 "$DIR/install.log" >&2; exit 1; }

    as_user "cd $APP && PHP_CLI_SERVER_WORKERS=4 setsid nohup php -S 127.0.0.1:$PORT -t webroot webroot/index.php > $DIR/web.log 2>&1 < /dev/null & echo \$! > $DIR/web.pid"
    for i in $(seq 1 50); do
      curl -fs "http://127.0.0.1:$PORT/healthcheck/status.json" >/dev/null 2>&1 && { echo "Passbolt läuft: http://127.0.0.1:$PORT"; exit 0; }
      sleep 0.2
    done
    echo "Passbolt startet nicht, siehe $DIR/web.log" >&2; exit 1 ;;
  register)
    cake passbolt register_user -u "$2" -f "$3" -l "$4" -r "${5:-user}" 2>/dev/null | grep -o "http://[^ ]*/setup/start/[^ ]*" ;;
  cake)
    shift; cake "$@" ;;
  stop)
    # the web server runs in its own process group (setsid), so its worker processes stop with it
    [ -f "$DIR/web.pid" ] && kill -- "-$(cat "$DIR/web.pid")" 2>/dev/null || true
    [ -d "$DIR/pgdata" ] && as_user "$PG_BIN/pg_ctl -D $DIR/pgdata -m fast stop >/dev/null 2>&1" || true
    rm -f "$DIR/web.pid" ;;
esac
