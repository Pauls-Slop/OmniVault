// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { importBitwardenJson, importCsv, importProtonJson, parseCsv, parseImport } from '../src/lib/import.js';

test('parseCsv handles quotes, commas and newlines inside fields', () => {
  const rows = parseCsv('a,b,c\r\n"x,y","line1\nline2","he said ""hi"""\n');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['x,y', 'line1\nline2', 'he said "hi"']]);
});

test('generic CSV maps common columns and keeps unmapped ones in notes', () => {
  const csv = 'name,url,username,password,otpauth,notes,favorite\n'
    + 'GitHub,https://github.com,ada,pw1,otpauth://x,hello,1\n'
    + 'Mail,https://mail.com,bob,pw2,,,\n';
  const items = importCsv(csv);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { type: 'login', name: 'GitHub', username: 'ada', password: 'pw1', totp: 'otpauth://x', uris: ['https://github.com'], notes: 'hello', favorite: true, folder: undefined });
  assert.equal(items[1].favorite, false);
});

test('CSV: email fills username when username column absent; extra columns preserved', () => {
  const items = importCsv('title,email,password,cardnumber\nBank,ada@x.de,p,4111\n');
  assert.equal(items[0].username, 'ada@x.de');
  assert.match(items[0].notes, /cardnumber: 4111/);
});

test('CSV: note-only row becomes a note', () => {
  const items = importCsv('name,notes,username,password,url\nMeine Notiz,geheim,,,\n');
  assert.equal(items[0].type, 'note');
  assert.equal(items[0].notes, 'geheim');
});

test('LastPass-style CSV (url,username,password,totp,extra,name,grouping,fav)', () => {
  const items = importCsv('url,username,password,totp,extra,name,grouping,fav\nhttps://a.com,ada,pw,,note here,Site A,Work,1\n');
  assert.deepEqual(items[0].uris, ['https://a.com']);
  assert.equal(items[0].name, 'Site A');
  assert.equal(items[0].notes, 'note here');
  assert.equal(items[0].favorite, true);
});

test('Bitwarden JSON: logins, notes, cards and custom fields stay structured', () => {
  const data = {
    encrypted: false,
    folders: [{ id: 'f1', name: 'Arbeit' }],
    items: [
      { type: 1, name: 'GitHub', folderId: 'f1', favorite: true, login: { username: 'ada', password: 'pw', totp: 'seed', uris: [{ uri: 'https://github.com' }] }, fields: [{ name: 'PIN', value: '1234' }] },
      { type: 2, name: 'Notiz', notes: 'geheim', secureNote: { type: 0 } },
      { type: 3, name: 'Visa', card: { cardholderName: 'Ada', number: '4111', expMonth: '09', expYear: '2030', code: '123' } },
    ],
  };
  const items = importBitwardenJson(data);
  assert.equal(items[0].folder, 'Arbeit');
  assert.deepEqual(items[0].fields, [{ name: 'PIN', value: '1234', type: 'text' }]);
  assert.equal(items[1].type, 'note');
  assert.equal(items[2].type, 'card');
  assert.deepEqual(items[2].card, { cardholderName: 'Ada', number: '4111', expMonth: '09', expYear: '2030', code: '123' });
});

test('Bitwarden JSON rejects encrypted export', () => {
  assert.throws(() => importBitwardenJson({ encrypted: true, items: [] }), /unverschlüsselt/);
});

test('Proton Pass JSON export', () => {
  const data = {
    vaults: {
      v1: {
        name: 'Persönlich',
        items: [
          { pinned: true, data: { type: 'login', metadata: { name: 'Proton', note: 'n' }, content: { itemEmail: 'ada@proton.me', password: 'pw', urls: ['https://proton.me'], totpUri: 'otpauth://y' }, extraFields: [{ fieldName: 'Code', data: { content: 'abc' } }] } },
          { data: { type: 'note', metadata: { name: 'Idee', note: 'Inhalt' }, content: {} } },
        ],
      },
    },
  };
  const items = importProtonJson(data);
  assert.equal(items[0].username, 'ada@proton.me');
  assert.equal(items[0].totp, 'otpauth://y');
  assert.equal(items[0].favorite, true);
  assert.match(items[0].notes, /Code: abc/);
  assert.equal(items[1].type, 'note');
  assert.equal(items[1].folder, 'Persönlich');
});

test('parseImport auto-detects JSON vs CSV', () => {
  assert.equal(parseImport('{"items":[{"type":1,"name":"x","login":{"username":"a"}}]}').format, 'bitwarden');
  assert.equal(parseImport('{"vaults":{"v":{"name":"V","items":[{"data":{"type":"note","metadata":{"name":"n"},"content":{}}}]}}}').format, 'proton');
  assert.equal(parseImport('name,username,password\nA,b,c\n').format, 'csv');
});

test('export → import round trip (Bitwarden JSON keeps everything, CSV the logins and notes)', async () => {
  const { toBitwardenJson, toCsv } = await import('../src/lib/export.js');
  const items = [
    { type: 'login', name: 'Git, "Hub"', username: 'ada', password: 'p,w\n2', totp: 'otpauth://totp/x?secret=AB', uris: ['https://github.com'], notes: 'n', folder: 'Arbeit', favorite: true, fields: [{ name: 'PIN', value: '1', type: 'hidden' }] },
    { type: 'note', name: 'Notiz', notes: 'mehr\nZeilen' },
    { type: 'card', name: 'Visa', card: { number: '4111', code: '123' } },
  ];
  const back = parseImport(toBitwardenJson(items));
  assert.equal(back.format, 'bitwarden');
  assert.deepEqual(back.items.map((i) => i.type), ['login', 'note', 'card']);
  assert.deepEqual([back.items[0].password, back.items[0].folder, back.items[0].favorite, back.items[0].fields[0].type], ['p,w\n2', 'Arbeit', true, 'hidden']);
  assert.equal(back.items[2].card.number, '4111');
  const csv = parseImport(toCsv(items));
  assert.equal(csv.items.length, 2);
  assert.deepEqual([csv.items[0].name, csv.items[0].password, csv.items[0].uris[0]], ['Git, "Hub"', 'p,w\n2', 'https://github.com']);
});
