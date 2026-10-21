# OmniVault

**One browser extension for all your password managers.**

OmniVault brings the entries from several password managers into a single interface in Chrome, Firefox and other
Chromium-based browsers. Search across all your accounts at once, copy and fill logins, sign in with passkeys, and
move entries between managers – without giving up the manager you already use.

> OmniVault is an independent open-source project. It is not affiliated with, endorsed by or sponsored by Bitwarden
> Inc., Passbolt S.A., Proton AG, AgileBits Inc. (1Password) or LastPass US LP. All trademarks belong to their owners.

## Supported password managers

| Password manager | How OmniVault connects | Read | Write |
|---|---|:-:|:-:|
| **Bitwarden** (bitwarden.com, bitwarden.eu) | Directly; your vault is decrypted in the browser | ✅ | ✅ |
| **Vaultwarden** and self-hosted Bitwarden | Directly | ✅ | ✅ |
| **Passbolt** v4 and v5 (incl. sharing) | Directly; OpenPGP in the browser | ✅ | ✅ |
| **HashiCorp Vault / OpenBao** (KV secrets engine v2) | Directly over the HTTP API (token or userpass) | ✅ | ✅ |
| **pass** (password-store) | Local helper → `pass` + GnuPG | ✅ | ✅ |
| **1Password** | Local helper → official `op` CLI | ✅ | ✅ |
| **LastPass** | Local helper → official `lpass` CLI | ✅ | ✅ |
| **Proton Pass** | Local helper → official `pass-cli` | ✅ | ✅ |
| **KeePassXC** | KeePassXC's own browser integration (`keepassxc-proxy`) | ✅ | ✅ (logins) |
| **KeePass files, browser exports and others** | Import a KeePass database (`.kdbx`), a CSV, JSON or KeePass XML export into any account above | – | – |

Proton Pass support is on hold: Proton currently only offers its CLI on paid plans. It works once the CLI is enabled
for your account.

For a detailed, per-feature overview see [FEATURES.md](FEATURES.md) (German).

### HashiCorp Vault / OpenBao

OmniVault reads and writes the KV secrets engine (version 2) of a HashiCorp Vault or OpenBao server. In the account
form you enter the server address, the KV mount (default `secret`), optionally a path prefix (only secrets below it
are shown) and a namespace (sent as `X-Vault-Namespace`), and choose how to sign in: with a token or with username
and password (`userpass` auth method). The token is kept in session memory only and renewed (`renew-self`) while
you use it.

How secrets map to entries:

| In Vault / OpenBao | In OmniVault |
|---|---|
| Path `web/github` (below mount and prefix) | Folder `web`, title `github` |
| Key `username` (or `login`, `user`) | Username |
| Key `password` | Password |
| Key `url` (or `uri`, `website`; several addresses separated by spaces or line breaks) | Website addresses |
| Key `notes` | Notes |
| Key `totp` (or `otp`; a secret or an `otpauth://` URI) | TOTP |
| Any other key | Hidden custom field |
| Secret without a `password` key | Secure note |

Key names are matched case-insensitively and written back as they were; new entries use the first name in each row.
Values that are not strings (numbers, lists) stay unchanged unless you edit them. The list is built recursively
with `LIST` on the metadata path (at most 2000 entries and 12 folder levels); secret values are read only when an
entry is opened, copied or filled. Edits use check-and-set, so a change made elsewhere in the meantime is reported
as a conflict instead of being overwritten. Deleting is a soft delete of the current version: the entry appears in
*Tools → Trash* and can be restored (`undelete`) or removed for good (all versions and metadata). Renaming or moving
writes the secret at the new path and soft-deletes the old one. Paths the token may not list or read are skipped
with a notice.

## Features

**Everyday use**
- All accounts in one list, even several of the same manager, each with its own color tag
- Logins for the current website shown first; search by name, username, address, folder or account
- One-click copy of username, password and TOTP code; live TOTP codes in the detail view
- Fill logins with a click or a keyboard shortcut; optional OmniVault button inside login fields and a
  "Save login?" prompt
- Create and edit logins, notes, cards and identities, custom fields and folders (as far as each manager supports them)
- Password generator with strength meter and a history of recently generated passwords
- Sharing: Passbolt items with people and groups; Bitwarden / Vaultwarden items by moving them into an organization
  and its collections, and by changing the collections of organization items

**Passkeys**
- Create passkeys on websites and sign in with them, stored in your Bitwarden or Vaultwarden account in the same
  format the official Bitwarden apps use
- If OmniVault has no matching passkey, your browser's own passkey handling takes over

**Tools across managers**
- Copy, move or mirror entries between accounts and providers
- Find duplicates within and across accounts, plus reused and weak passwords (checked locally only) and, if you
  allow it, passwords known from data breaches (Have I Been Pwned; only the first 5 characters of each password's
  SHA-1 hash are sent)
- Import exports from other managers; export to Bitwarden JSON or CSV
- Trash view for Bitwarden / Vaultwarden
- Attachments: download them; in Bitwarden / Vaultwarden also add and delete them (up to 30 MB per file)

**Languages:** English, German, Spanish, French, Italian, Portuguese (Brazil), Simplified Chinese and Japanese.
OmniVault follows your browser language; you can change it under *Settings → Appearance → Language*.

## Installation

OmniVault is not yet available in the Chrome Web Store or on addons.mozilla.org. For now you build it from source
and load it into your browser.

### 1. Build

You need [Node.js](https://nodejs.org/) and git.

```bash
git clone https://github.com/omni-vault/OmniVault.git
cd OmniVault
npm install
npm run build        # creates dist/chrome and dist/firefox
```

### 2. Load into your browser

- **Chrome, Edge, Brave and other Chromium browsers:** open `chrome://extensions`, turn on *Developer mode*, click
  *Load unpacked* and select the `dist/chrome` folder.
- **Firefox 140 or later:** open `about:debugging#/runtime/this-firefox`, click *Load Temporary Add-on…* and
  select `dist/firefox/manifest.json`. Temporary add-ons are removed when Firefox closes.

### 3. Add your accounts

Click the OmniVault icon, then *New* (the plus sign at the top right) → *Add account*, and pick your password manager.

- **Bitwarden, Vaultwarden, Passbolt, HashiCorp Vault / OpenBao:** sign in directly in OmniVault. For a self-hosted server, enter its address;
  your browser will ask once for permission to access it.
- **pass, 1Password, LastPass, Proton Pass:** these need the local helper described below.
- **KeePassXC:** uses KeePassXC's own browser integration, see [KeePassXC](#keepassxc) below.

### Local helper for pass, 1Password, LastPass and Proton Pass

These managers have no open network API, but they do have official command-line tools. OmniVault talks to those tools
through a small local helper (Python 3.8+, standard library only). OmniVault never ships or replaces the official
tools – you install them and sign in yourself.

1. Install the official tool and sign in in your terminal, then check that it works:
   `pass ls`, `op whoami`, `lpass status` or `pass-cli info`.
2. Register the helper. Find your extension ID on `chrome://extensions` (Developer mode must be on):

   ```bash
   cd native
   python3 install.py --chrome-id <EXTENSION-ID>   # Chromium browsers and Firefox
   python3 install.py --firefox-only               # Firefox only
   python3 install.py --uninstall                  # remove everything again
   ```

3. In OmniVault, add the account and click *Connect*. Your browser asks once for permission to communicate with
   native applications.

What the official tools allow through the helper:

- **Attachments** can be downloaded from 1Password, LastPass and Proton Pass (up to 30 MB per file). Uploading is
  not possible through these tools.
- **1Password:** cards and identities can be created and edited. `op` cannot write an identity's address (a new
  address is kept in the notes) and does not show passkeys; saving a login with a passkey through `op` removes the
  passkey, so edit such logins in the 1Password app.
- **Password history:** LastPass's and Proton Pass's tools don't output it. For 1Password it is shown if `op`
  includes it in its output (not documented by 1Password; `native/selftest.py` tells you).

If a tool is installed in an unusual location, see [native/README.md](native/README.md) (German) for environment
variables and troubleshooting.

### KeePassXC

KeePassXC doesn't need the OmniVault helper: OmniVault speaks KeePassXC's publicly documented browser protocol
through the `keepassxc-proxy` program that comes with KeePassXC. Messages are end-to-end encrypted between
OmniVault and KeePassXC.

1. In KeePassXC, open *Settings → Browser Integration* and enable it. Under *Advanced*, turn on
   *Allow keepassxc-proxy to list all entries*, otherwise OmniVault can't show your entries.
2. Register OmniVault with the proxy:

   ```bash
   cd native
   python3 install.py --chrome-id <EXTENSION-ID> --keepassxc
   ```

   The script finds `keepassxc-proxy` in the usual places; otherwise pass `--keepassxc-proxy <PATH>`. It doesn't
   touch KeePassXC's own configuration.
3. In OmniVault, add a KeePassXC account and click *Connect*. KeePassXC asks you to accept the connection and to
   give it a name. You can remove it later in KeePassXC under *Database → Database Settings → Browser Integration*.

Through this protocol OmniVault can list, fill, create, edit and delete logins, show the current TOTP code and create
groups. Notes, custom fields, TOTP secrets and moving entries are not available via KeePassXC's interface.

## Keyboard shortcuts

| Action | Default shortcut |
|---|---|
| Open OmniVault | `Alt+Shift+O` |
| Fill the matching login on the current page | `Ctrl+Shift+L` (macOS: `⌘+Shift+L`) |

Change them at `chrome://extensions/shortcuts`, or in Firefox under *Add-ons → gear menu → Manage Extension
Shortcuts*. You can also right-click any input field and choose *Fill with OmniVault* or *Insert strong password*.

## Security and privacy

What OmniVault stores and where it sends data is described in detail in the [privacy policy](PRIVACY.md).

- **No master passwords are stored.** Decrypted keys live only in the browser's session memory and are discarded
  when you lock OmniVault, after the inactivity timeout you choose, when your computer locks and when the browser
  closes.
- **PIN unlock (optional).** After an automatic lock you can unlock with a 4–12 digit PIN. The PIN only opens a
  sealed copy of your session that exists in memory; five wrong attempts discard it, and after a browser restart your
  master password is required again.
- **No telemetry, no OmniVault servers.** OmniVault talks only to your password manager's server or to its official
  local tool. Password checks, imports and exports happen entirely in your browser.
- **Filling only when you ask.** Websites never receive your entries on their own. OmniVault fills on a click and asks
  first if the page address doesn't match the entry.
- **Passkeys are site-bound.** A website only gets its own passkey back; private keys never reach the popup UI and
  leave the background only encrypted, on their way to your server.
- **Passbolt server pinning.** OmniVault remembers your Passbolt server's key on first sign-in and refuses to sign in
  if it changes.
- **Command-line tools get secrets via stdin,** never on the command line. One exception is editing entries in
  Proton Pass, whose CLI only accepts new values as arguments; see [native/README.md](native/README.md).
- **Established cryptography.** OmniVault uses WebCrypto, [OpenPGP.js](https://github.com/openpgpjs/openpgpjs),
  [argon2id](https://github.com/openpgpjs/argon2id) and [@noble/ciphers](https://github.com/paulmillr/noble-ciphers)
  instead of home-grown crypto, and contains no code from the official password manager clients.
- **Minimal permissions.** Access to self-hosted servers and to native applications is requested only when you
  add such an account. Access to Bitwarden's cloud file storage (Azure Blob Storage) is requested only when you
  first upload an attachment to a bitwarden.com or bitwarden.eu account.

Found a security issue? Please report it privately via
[GitHub's security advisories](https://github.com/omni-vault/OmniVault/security/advisories/new) instead of a public
issue.

## Reproducing the release build

The packages uploaded to the browser stores are built from this repository without any changes. To reproduce them
(e.g. for an add-on review):

- Node.js 22 (tested with 22.22.0), npm, and esbuild 0.28.2 (pinned in `package.json`) on Linux, macOS or Windows.
- `npm install`, then `npm run package`. This builds `dist/chrome` and `dist/firefox` and writes
  `omnivault-<version>-chrome.zip`, `omnivault-<version>-firefox.zip` and `omnivault-<version>-source.zip` together
  with `SHA256SUMS` to `dist/packages/`. The archives are reproducible: the same sources give byte-identical files.
- The only build step for OmniVault's own code is esbuild, which combines OmniVault's own files from `src/` into one file per entry point;
  nothing is minified, and source maps are included. The third-party libraries in `vendor/` (OpenPGP.js, argon2id,
  @noble/ciphers, TweetNaCl.js) are shipped as separate files, built from unmodified upstream sources. How they are built
  from those sources at pinned commits is described in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
  (`npm run vendor:fetch`, `npm run vendor:build`); `vendor/sources.json` pins every upstream commit, and the
  source archives of OpenPGP.js and argon2id are in `vendor/sources/`.

## Feedback and contributing

Bug reports and feature requests are welcome in the
[issue tracker](https://github.com/omni-vault/OmniVault/issues). The interface translations were machine-generated, so
corrections from native speakers are especially appreciated.

Developer documentation – build scripts, tests, project layout and how translations work – is in
[DEVELOPMENT.md](DEVELOPMENT.md) (German).

## License

OmniVault is licensed under the [Mozilla Public License 2.0](LICENSE). © The OmniVault contributors.

Third-party components and their licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Trademarks

Bitwarden is a registered trademark of Bitwarden Inc. Passbolt is a trademark of Passbolt S.A.
([passbolt.com](https://www.passbolt.com)). LastPass is a trademark of LastPass US LP. 1Password is a trademark of
AgileBits Inc. Proton and Proton Pass are trademarks of Proton AG. HashiCorp Vault is a trademark of HashiCorp.
OpenBao is a Linux Foundation project; its trademarks are held by LF Projects, LLC.
All other names are trademarks of their respective owners and are used only to describe compatibility. OmniVault is
not affiliated with, endorsed by or sponsored by any of them.
