// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Packs the store uploads from dist/ and a source archive for reviewers (addons.mozilla.org asks for the sources
// of bundled code). The archives are reproducible: same files → same bytes (sorted entries, fixed timestamps).
// Usage: npm run package  (builds first)   ·   node tools/package.mjs --allow-dirty  (source from a dirty tree)
import { execFileSync } from 'node:child_process';
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

const allowDirty = process.argv.includes('--allow-dirty');
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const OUT = 'dist/packages';

/** Minimal deterministic ZIP writer (deflate, DOS time 1980-01-01 00:00, UTF-8 names, mode 0644). */
function zip(entries) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const nameBytes = Buffer.from(name, 'utf8');
    const packed = deflateRawSync(data, { level: 9 });
    const stored = packed.length >= data.length;
    const body = stored ? data : packed;
    const crc = crc32(data);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4); // version needed
    head.writeUInt16LE(0x0800, 6); // UTF-8 names
    head.writeUInt16LE(stored ? 0 : 8, 8);
    head.writeUInt16LE(0, 10); // time 00:00
    head.writeUInt16LE(0x21, 12); // date 1980-01-01
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(body.length, 18);
    head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(nameBytes.length, 26);
    head.writeUInt16LE(0, 28);
    local.push(head, nameBytes, body);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(0x0314, 4); // made by: Unix, 2.0
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(stored ? 0 : 8, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(0x21, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(body.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(nameBytes.length, 28);
    dir.writeUInt32LE((0o100644 << 16) >>> 0, 38); // regular file, rw-r--r--
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBytes);
    offset += head.length + nameBytes.length + body.length;
  }
  const centralSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

async function filesUnder(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await filesUnder(p));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

async function packDir(dir) {
  const files = await filesUnder(dir);
  return zip(await Promise.all(files.map(async (f) => ({ name: relative(dir, f).split(sep).join('/'), data: await readFile(f) }))));
}

execFileSync(process.execPath, ['build.mjs'], { stdio: 'inherit' });
await mkdir(OUT, { recursive: true });

const firefox = JSON.parse(await readFile('dist/firefox/manifest.json', 'utf8'));
const geckoId = firefox.browser_specific_settings?.gecko?.id ?? '';
const warnings = [];
if (/@example\.(org|com)$/.test(geckoId)) {
  warnings.push(`Firefox add-on ID is still the placeholder "${geckoId}". Set the final ID in build.mjs before the first upload to addons.mozilla.org – it can't be changed afterwards.`);
}

// the source archive: exactly the files tracked by git, under omnivault-<version>/
const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
if (dirty && !allowDirty) {
  console.error('The working tree has uncommitted changes; the source archive would not match a commit.\n'
    + 'Commit them, or run with --allow-dirty for a local test.');
  process.exit(1);
}
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const prefix = `omnivault-${version}`;
const sources = [];
for (const f of tracked) {
  if (!(await stat(f).catch(() => null))?.isFile()) continue; // deleted in the working tree
  sources.push({ name: `${prefix}/${f}`, data: await readFile(f) });
}

const results = [
  [`omnivault-${version}-chrome.zip`, await packDir('dist/chrome')],
  [`omnivault-${version}-firefox.zip`, await packDir('dist/firefox')],
  [`omnivault-${version}-source.zip`, zip(sources)],
];
const { createHash } = await import('node:crypto');
const sums = [];
for (const [name, data] of results) {
  await writeFile(join(OUT, name), data);
  sums.push(`${createHash('sha256').update(data).digest('hex')}  ${name}`);
}
await writeFile(join(OUT, 'SHA256SUMS'), `${sums.join('\n')}\n`);
console.log(`\n${OUT}/\n${sums.map((s) => `  ${s}`).join('\n')}`);
if (dirty) console.log('\nNote: source archive built from a working tree with uncommitted changes.');
for (const w of warnings) console.log(`\nWarning: ${w}`);
