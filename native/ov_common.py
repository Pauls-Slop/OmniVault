# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""Shared core of the OmniVault native host: errors, program lookup, process calls, id checks, framing."""
import base64
import json
import os
import re
import shutil
import struct
import subprocess
import tempfile

VERSION = "2.0.0"
MAX_MESSAGE = 900_000  # browsers accept up to 1 MB per message from a host
TIMEOUT = 120
MAX_ATTACHMENT = 30 * 1024 * 1024  # largest attachment the host hands to the browser (as for Bitwarden)
PATH_ID = re.compile(r"^[A-Za-z0-9 _./@:+=-]{1,512}$")  # entry paths / ids of the CLI password managers


class HostError(Exception):
    """An error whose message is shown to the user as is. `code` lets the extension tell kinds apart
    (e.g. "conflict"); without it the error is a plain host error."""

    def __init__(self, message, code=None):
        super().__init__(message)
        self.code = code


CONFLICT = "Der Eintrag wurde inzwischen geändert. Bitte synchronisieren und erneut bearbeiten."


def assert_unchanged(expected, current):
    """Refuses to overwrite an item that changed since OmniVault last read it. `expected` is the revision the
    extension saw (None or "" when it never saw one: then there is nothing to compare)."""
    if expected not in (None, "") and current not in (None, "") and str(expected) != str(current):
        raise HostError(CONFLICT, "conflict")


def which(name, env_override):
    """Program path: $env_override, then PATH, then the usual user/Homebrew locations."""
    explicit = os.environ.get(env_override)
    if explicit:
        return explicit
    found = shutil.which(name)
    if found:
        return found
    for base in ("/opt/homebrew/bin", "/usr/local/bin", os.path.expanduser("~/.local/bin"), os.path.expanduser("~/bin")):
        cand = os.path.join(base, name)
        if os.path.isfile(cand) and os.access(cand, os.X_OK):
            return cand
    return None


def run(cmd, args, stdin=None, check=True, env=None, describe=None):
    """Runs a program without a shell. stdin is never inherited (it is the browser's pipe): without input the
    program gets /dev/null, so a prompt fails instead of reading protocol bytes. `describe(proc)` turns a failed
    run into a user-facing message (default: first output line)."""
    try:
        proc = subprocess.run(
            [cmd, *args], input=stdin, stdin=None if stdin is not None else subprocess.DEVNULL,
            capture_output=True, text=True, timeout=TIMEOUT, env={**os.environ, "NO_COLOR": "1", **(env or {})},
        )
    except subprocess.TimeoutExpired:
        raise HostError("Das Programm antwortet nicht (Zeitüberschreitung)")
    if check and proc.returncode != 0:
        if describe:
            raise HostError(describe(proc))
        line = next((l.strip() for l in (proc.stderr or proc.stdout or "").splitlines() if l.strip()), None)
        raise HostError(line or f"Exit-Code {proc.returncode}")
    return proc


def too_large(size):
    return HostError(f"Anhang zu groß (höchstens {MAX_ATTACHMENT // (1024 * 1024)} MB)") if size > MAX_ATTACHMENT else None


def attachment_result(file_name, data):
    """A downloaded attachment for the extension: name, size and the bytes as base64 (sent in parts when large)."""
    err = too_large(len(data))
    if err:
        raise err
    return {"fileName": file_name or "Anhang", "size": len(data), "data": base64.b64encode(data).decode("ascii")}


def run_binary(cmd, args, env=None, describe=None, limit=MAX_ATTACHMENT):
    """Runs a program without a shell and returns its stdout as bytes; stops it once the output exceeds `limit`."""
    errfile = tempfile.TemporaryFile()  # a file, not a pipe: a chatty stderr cannot block the program
    try:
        proc = subprocess.Popen([cmd, *args], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=errfile,
                                env={**os.environ, "NO_COLOR": "1", **(env or {})})
    except OSError as e:
        errfile.close()
        raise HostError(f"Programm konnte nicht gestartet werden: {type(e).__name__}")
    chunks, total = [], 0
    try:
        while True:
            block = proc.stdout.read(65536)
            if not block:
                break
            total += len(block)
            if total > limit:
                proc.kill()
                proc.wait()
                raise too_large(total)
            chunks.append(block)
        proc.wait(timeout=TIMEOUT)
        errfile.seek(0)
        err = errfile.read().decode("utf-8", "replace")
    except subprocess.TimeoutExpired:
        proc.kill()
        raise HostError("Das Programm antwortet nicht (Zeitüberschreitung)")
    finally:
        errfile.close()
    if proc.returncode != 0:
        fake = subprocess.CompletedProcess([cmd, *args], proc.returncode, "", err)
        if describe:
            raise HostError(describe(fake))
        line = next((l.strip() for l in err.splitlines() if l.strip()), None)
        raise HostError(line or f"Exit-Code {proc.returncode}")
    return b"".join(chunks)


def read_output_file(produce):
    """Lets a program write a file into a fresh private directory (`produce(path)`), returns its bytes and removes
    it again. The file name inside is fixed, so nothing outside the directory can be touched."""
    with tempfile.TemporaryDirectory(prefix="omnivault-") as tmp:
        os.chmod(tmp, 0o700)
        path = os.path.join(tmp, "download")
        produce(path)
        if not os.path.isfile(path):
            raise HostError("Das Programm hat keine Datei geschrieben")
        size = os.path.getsize(path)
        err = too_large(size)
        if err:
            raise err
        with open(path, "rb") as f:
            return f.read()


def check_id(value, name="ID", pattern=PATH_ID):
    """Strict id check; path-like ids may not escape (no `..`, no empty segment, not absolute)."""
    if not isinstance(value, str) or not pattern.match(value):
        raise HostError(f"Ungültige {name}")
    if value.startswith("/") or any(seg in ("..", "") for seg in value.split("/")):
        raise HostError(f"Ungültige {name}")
    return value


# ---------- native messaging framing (4-byte native-endian length + UTF-8 JSON) ----------

def read_message(stream):
    raw = stream.read(4)
    if len(raw) < 4:
        return None
    (length,) = struct.unpack("=I", raw)
    return json.loads(stream.read(length).decode("utf-8"))


def write_message(stream, obj):
    data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    stream.write(struct.pack("=I", len(data)))
    stream.write(data)
    stream.flush()


def respond(stream, req_id, result):
    """Sends a result; item lists and file data above the browser's message limit are split into parts
    ("more": true; file data as consecutive "dataPart" strings)."""
    data = result.get("data") if isinstance(result, dict) else None
    if isinstance(data, str) and len(data) > MAX_MESSAGE - 10_000:
        step = MAX_MESSAGE - 10_000
        parts = [data[i:i + step] for i in range(0, len(data), step)]
        for part in parts[:-1]:
            write_message(stream, {"id": req_id, "ok": True, "result": {"dataPart": part}, "more": True})
        rest = {k: v for k, v in result.items() if k != "data"}
        write_message(stream, {"id": req_id, "ok": True, "result": {**rest, "dataPart": parts[-1]}})
        return
    items = result.get("items") if isinstance(result, dict) else None
    if items is not None and len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > MAX_MESSAGE:
        rest = {k: v for k, v in result.items() if k != "items"}
        chunk, size = [], 0
        for it in items:
            s = len(json.dumps(it, ensure_ascii=False).encode("utf-8")) + 1
            if chunk and size + s > MAX_MESSAGE - 10_000:
                write_message(stream, {"id": req_id, "ok": True, "result": {"items": chunk}, "more": True})
                chunk, size = [], 0
            chunk.append(it)
            size += s
        write_message(stream, {"id": req_id, "ok": True, "result": {**rest, "items": chunk}})
        return
    write_message(stream, {"id": req_id, "ok": True, "result": result})
