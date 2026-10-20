// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Demo build only: sample accounts and entries. All names, addresses and secrets are made up.

/** Accounts the demo starts with, all unlocked. `config.demo` picks the sample vault below. */
export const DEMO_ACCOUNTS = [
  { id: 'demo-bw', provider: 'bitwarden', label: 'Personal', short: 'BW', hue: 212, config: { server: 'bitwarden.eu', email: 'ada@example.com', demo: 'personal' } },
  { id: 'demo-pb', provider: 'passbolt', label: 'Team', short: 'PB', hue: 148, config: { server: 'https://passbolt.example.com', userId: '8bb6e5e2-0000-4000-8000-000000000001', demo: 'team' } },
  { id: 'demo-op', provider: 'onepassword', label: 'Family', short: '1P', hue: 272, config: { demo: 'family' } },
  { id: 'demo-kx', provider: 'keepassxc', label: 'Offline', short: 'KX', hue: 32, config: { demo: 'offline' } },
];

const TOTP = (label, secret) => `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(label.split(':')[0])}`;
const day = (n) => new Date(Date.UTC(2026, 9, 20) - n * 864e5).toISOString();

const login = (id, name, username, password, uris, extra = {}) => ({
  id, type: 'login', name, username, password, uris, fields: [], favorite: false, folderId: null, revisionDate: day(extra.age ?? 30), ...extra,
});

export const DEMO_VAULTS = {
  personal: {
    folders: [{ id: 'f-web', name: 'Web' }, { id: 'f-money', name: 'Finance' }],
    items: [
      login('bw-example', 'Example', 'ada@example.com', 'v7#Qm2!rTz9@Lp4w', ['https://www.example.com/login'],
        { totp: TOTP('Example:ada@example.com', 'JBSWY3DPEHPK3PXP'), favorite: true, folderId: 'f-web', age: 3 }),
      login('bw-github', 'GitHub', 'ada-lovelace', 'kN8$wq3E!pX2zR6m', ['https://github.com'],
        { totp: TOTP('GitHub:ada-lovelace', 'KRSXG5CTMVRXEZLU'), folderId: 'f-web', age: 12,
          notes: 'Recovery codes are in the safe.' }),
      login('bw-mozilla', 'Mozilla Add-ons', 'ada@example.com', 'Hc4^yT9!eW2qLs7v', ['https://addons.mozilla.org'], { folderId: 'f-web', age: 40 }),
      login('bw-forum', 'Old forum', 'ada', 'sunshine1', ['https://forum.example.net'], { age: 900 }),
      login('bw-shop', 'Example Shop', 'ada@example.com', 'sunshine1', ['https://shop.example.org'], { age: 700 }),
      { id: 'bw-card', type: 'card', name: 'Visa', favorite: false, folderId: 'f-money', uris: [], fields: [], revisionDate: day(60),
        card: { cardholderName: 'Ada Lovelace', brand: 'Visa', number: '4111 1111 1111 1111', expMonth: '8', expYear: '2029', code: '123' },
        subtitle: 'Visa *1111' },
      { id: 'bw-identity', type: 'identity', name: 'Ada Lovelace', favorite: false, folderId: null, uris: [], fields: [], revisionDate: day(90),
        identity: { title: 'Ms', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', phone: '+44 20 7946 0000',
          address1: '12 Example Street', city: 'London', postalCode: 'EC1A 1AA', country: 'GB' },
        subtitle: 'Ada Lovelace' },
      { id: 'bw-note', type: 'note', name: 'Wi-Fi at home', favorite: false, folderId: null, uris: [], fields: [], revisionDate: day(200),
        notes: 'Network: Lovelace-5G\nPassword: analytical-engine-1843' },
    ],
  },
  team: {
    folders: [{ id: 'f-infra', name: 'Infrastructure' }],
    items: [
      login('pb-example-admin', 'Example admin', 'admin@example.com', 'Zr8!mQ4#tV1xNc6p', ['https://www.example.com/admin'], { age: 8 }),
      login('pb-grafana', 'Grafana', 'ops', 'gF5@pL9!wK2sXe7r', ['https://grafana.example.net'],
        { folderId: 'f-infra', age: 20, totp: TOTP('Grafana:ops', 'MFRGGZDFMZTWQ2LK') }),
      login('pb-deploy', 'Deploy server', 'deploy', 'Tq3#nY8!vB6cHz1m', ['ssh://deploy.example.net'],
        { folderId: 'f-infra', age: 45, fields: [{ name: 'Port', value: '2222', type: 'text' }, { name: 'Sudo password', value: 'Lk9!rW4#qP7sZx2n', type: 'hidden' }] }),
      login('pb-github-bot', 'GitHub release bot', 'release-bot', 'Wm2$hR7!kD4pQz9e', ['https://github.com'], { age: 15 }),
    ],
  },
  family: {
    folders: [{ id: 'v-family', name: 'Family' }, { id: 'v-private', name: 'Private' }],
    items: [
      login('op-streaming', 'Streaming', 'family@example.com', 'Np6!cX3#sT8wLq1v', ['https://streaming.example.org'], { folderId: 'v-family', age: 25 }),
      login('op-gitlab', 'GitLab', 'ada.lovelace', 'Ys4@bM9!rE2kHq7t', ['https://gitlab.com'],
        { folderId: 'v-private', age: 33, totp: TOTP('GitLab:ada.lovelace', 'NBSWY3DPO5XXE3DE') }),
      login('op-example', 'Example', 'family@example.com', 'Qd7#vJ2!pZ5mRx8c', ['https://example.com'], { folderId: 'v-family', age: 50 }),
      { id: 'op-note', type: 'note', name: 'Insurance numbers', favorite: false, folderId: 'v-family', uris: [], fields: [], revisionDate: day(120),
        notes: 'Household: 123-456-789\nCar: 987-654-321' },
    ],
  },
  offline: {
    folders: [{ id: 'g-home', name: 'Home' }],
    items: [
      login('kx-router', 'Router', 'admin', 'Rt5!xN2#kW8qMv4z', ['http://192.168.1.1'], { folderId: 'g-home', age: 300 }),
      login('kx-nas', 'NAS', 'ada', 'Ns3@pQ7!hL9wTc2e', ['http://nas.local:5000'], { folderId: 'g-home', age: 150 }),
      login('kx-forum', 'Old forum', 'ada', 'sunshine1', ['https://forum.example.net'], { age: 1000 }),
    ],
  },
};
