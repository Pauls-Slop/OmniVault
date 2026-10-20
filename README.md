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
| **pass** (password-store) | Local helper → `pass` + GnuPG | ✅ | ✅ |
| **1Password** | Local helper → official `op` CLI | ✅ | ✅ |
| **LastPass** | Local helper → official `lpass` CLI | ✅ | ✅ |
| **Proton Pass** | Local helper → official `pass-cli` | ✅ | ✅ |
| **KeePassXC** | KeePassXC's own browser integration (`keepassxc-proxy`) | ✅ | ✅ (logins) |
| **KeePass files, browser exports and others** | Import a CSV, JSON or KeePass XML export into any account above | – | – |

Proton Pass support is on hold: Proton currently only offers its CLI on paid plans. It works once the CLI is enabled
for your account.

For a detailed, per-feature overview see [FEATURES.md](FEATURES.md) (German).

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
  and its collections

**Passkeys**
- Create passkeys on websites and sign in with them, stored in your Bitwarden or Vaultwarden account in the same
  format the official Bitwarden apps use
- If OmniVault has no matching passkey, your browser's own passkey handling takes over

**Tools across managers**
- Copy, move or mirror entries between accounts and providers
- Find duplicates within and across accounts, plus reused and weak passwords (checked locally only)
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
- **Firefox 128 or later:** open `about:debugging#/runtime/this-firefox`, click *Load Temporary Add-on…* and
  select `dist/firefox/manifest.json`. Temporary add-ons are removed when Firefox closes.

### 3. Add your accounts

Click the OmniVault icon, then *New* (the plus sign at the top right) → *Add account*, and pick your password manager.

- **Bitwarden, Vaultwarden, Passbolt:** sign in directly in OmniVault. For a self-hosted server, enter its address;
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
AgileBits Inc. Proton and Proton Pass are trademarks of Proton AG.
All other names are trademarks of their respective owners and are used only to describe compatibility. OmniVault is
not affiliated with, endorsed by or sponsored by any of them.
