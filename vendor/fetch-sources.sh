#!/usr/bin/env bash
# Clones every vendored library at the exact commit listed in vendor/sources.json into vendor/src/.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p src
python3 - <<'PY' | while read -r name repo ref commit; do
import json
for name, s in json.load(open('sources.json')).items():
    if not name.startswith('_'):
        print(name, s['repo'], s['ref'], s['commit'])
PY
  dir="src/$name"
  if [ ! -d "$dir/.git" ]; then
    GIT_LFS_SKIP_SMUDGE=1 git -c advice.detachedHead=false clone -q --depth 1 --branch "$ref" "$repo" "$dir"
  fi
  actual=$(git -C "$dir" rev-parse HEAD)
  if [ "$actual" != "$commit" ]; then
    echo "FEHLER: $name ist $actual, erwartet $commit" >&2; exit 1
  fi
  echo "ok  $name $ref $commit"
done
