// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Node stand-in for the browser side of native messaging: spawns the real host (native/omnivault_host.py)
// and speaks its framing (4-byte length + JSON), including multi-part ("more") answers.
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectPart, hostMessage, joinParts } from '../src/providers/native-host.js';
import { ProviderError } from '../src/providers/provider.js';

export const HOST = join(fileURLToPath(new URL('..', import.meta.url)), 'native/omnivault_host.py');

export class ProcessTransport {
  constructor(env = {}) {
    this.proc = spawn('python3', [HOST], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'inherit'] });
    this.buf = Buffer.alloc(0);
    this.pending = new Map();
    this.seq = 0;
    this.proc.stdout.on('data', (d) => {
      this.buf = Buffer.concat([this.buf, d]);
      while (this.buf.length >= 4) {
        const len = this.buf.readUInt32LE(0);
        if (this.buf.length < 4 + len) break;
        const msg = JSON.parse(this.buf.subarray(4, 4 + len).toString('utf8'));
        this.buf = this.buf.subarray(4 + len);
        const p = this.pending.get(msg.id);
        if (!p) continue;
        if (!msg.ok) { this.pending.delete(msg.id); p.reject(new ProviderError(hostMessage(msg.error), msg.code ?? 'host')); continue; } // as the real transport does
        if (msg.more) { collectPart(p, msg.result); continue; }
        this.pending.delete(msg.id);
        p.resolve(joinParts(p, msg.result));
      }
    });
  }

  request(backend, cmd, args = {}) {
    const id = ++this.seq;
    const body = Buffer.from(JSON.stringify({ id, backend, cmd, args }));
    const head = Buffer.alloc(4);
    head.writeUInt32LE(body.length);
    this.proc.stdin.write(Buffer.concat([head, body]));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  close() { this.proc.stdin.end(); }
}
