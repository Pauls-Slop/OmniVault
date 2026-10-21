# OmniVault Privacy Policy

*Last updated: October 20, 2026*

OmniVault is a browser extension that shows the entries of the password managers you connect in one interface. This
policy explains what data OmniVault handles, where it is kept and where it is sent. It applies to the OmniVault
extension for Chrome, Firefox and other Chromium-based browsers, and to the optional local helper in the
[`native/`](native/) folder of this repository.

## In short

- **There are no OmniVault servers.** The OmniVault project does not receive, collect or store any of your data.
- **No telemetry, no analytics, no advertising, no tracking,** no crash reports and no remote configuration.
- OmniVault sends your data **only to the password manager servers you add yourself** and to **programs on your own
  computer** that you install and register yourself.
- Nothing is sold or shared with third parties.
- Master passwords are never stored. Decrypted keys and sign-in tokens are kept only in the browser's session memory.
- Firefox asks you at installation to agree to the transfer of **authentication information, personal information
  (identities) and payment information (cards)**. These are the categories OmniVault sends – encrypted where the
  password manager encrypts them – to the servers you add; nothing goes to the OmniVault project.

## Where your data goes

OmniVault only talks to the following destinations. All of them are chosen by you.

| Destination | When | What is sent |
|---|---|---|
| The **Bitwarden-compatible server** of an account you add: `bitwarden.com` or `bitwarden.eu` (`api.` and `identity.` subdomains) or the address of your self-hosted server (e.g. Vaultwarden) | When you sign in, unlock, sync, edit, share or delete entries and attachments | Your e-mail address, a hash derived from your master password (never the password itself), two-factor codes you enter, a random device identifier created by OmniVault, the browser type (`chrome` or `firefox`), sign-in tokens, and your vault data in the end-to-end encrypted form the server stores |
| **Azure Blob Storage** (`*.blob.core.windows.net`) | Only when you download or add an attachment of a `bitwarden.com` or `bitwarden.eu` account | The attachment, encrypted in the browser before upload, sent to the signed address your Bitwarden server hands out. This is where Bitwarden's cloud keeps attachments |
| The **Passbolt server** of an account you add | When you sign in, sync, edit, share or delete entries | Your user ID, the answers to the server's sign-in challenge, two-factor codes you enter, sign-in tokens and cookies set by your Passbolt server, and your entries encrypted with OpenPGP. Your private key and its passphrase never leave the browser |
| The **HashiCorp Vault or OpenBao server** of an account you add (only the address you enter) | When you sign in, sync, open, edit, delete or restore entries | Your token, or your username and password for the `userpass` sign-in (which returns a token); the namespace you entered; requests to list, read, write, delete and restore secrets below the mount and path you configured, and the secret values you save. The token is renewed with the server while you use the account |
| The **OmniVault local helper** on your computer (Native Messaging host `org.omnivault.host`) | Only if you install it and add a pass, gopass, 1Password, LastPass or Proton Pass account | Requests to list, read, create, change or delete entries. The helper passes them to the official command-line tool of that password manager (`pass`, `gopass`, `op`, `lpass`, `pass-cli`), which you installed and signed in to yourself. Those tools talk to their own services under their own privacy policies. The helper itself makes no network connections and writes no logs |
| **Have I Been Pwned** (`api.pwnedpasswords.com`) | Only when you check passwords against data breaches (Tools → Check) and have allowed access to this address | For each password, the first 5 characters of its SHA-1 hash (k-anonymity); the answer, padded with fake entries, is compared in your browser. No passwords, usernames or websites |
| **KeePassXC** on your computer (through `keepassxc-proxy`, registered as `org.omnivault.keepassxc`) | Only if you add a KeePassXC account | Requests in KeePassXC's browser-integration protocol, end-to-end encrypted between OmniVault and KeePassXC. KeePassXC asks you to approve the connection |

Bitwarden, Passbolt and the other services process the data they receive according to their own privacy policies.
OmniVault does not change what those services store; it acts like their own clients.

OmniVault does not contact any other server. In particular it does not load icons or favicons from the internet,
does not check for updates itself (your browser updates extensions) and does not send any data when it is installed
or removed.

## What is stored in your browser

OmniVault uses the extension storage of your browser. Nothing is stored anywhere else.

### Local storage (kept until you remove it or uninstall OmniVault)

- **Account settings:** the name, color and short code you give each account, the server address, your e-mail
  address or user ID, the random device identifier for Bitwarden-compatible servers, the fingerprint of your
  Passbolt server's key (to detect if it changes), and the connection ID and public identification key that KeePassXC
  assigns to OmniVault.
- **Passbolt private key:** the private key you load from your Passbolt recovery kit, in the passphrase-protected
  form it comes in. The passphrase is never stored.
- **Your settings,** such as the auto-lock time, clipboard clearing time, language, password generator options and
  which website features you turned on.
- **PIN unlock (if you turn it on):** a key pair whose private part is encrypted with a key derived from your PIN
  (Argon2id). The PIN itself is not stored.
- **Passkey site index:** salted SHA-256 hashes of the websites for which your accounts hold passkeys, so OmniVault
  can tell that a locked account may have a passkey for the current site. The website addresses themselves are not
  stored.
- **Favorites** for accounts whose password manager has no favorites of its own (entry IDs only).
- **Mirror rules** you create between accounts, the IDs of the entries they copied, a revision date or a hash of each
  copied entry, and the result of the last run (counts and error messages, which can include entry names).
- **Websites where you chose "never save"** for the "Save login?" prompt (host names).

### Session storage (in memory only, cleared when the browser closes)

- Decrypted vault keys and sign-in tokens of unlocked accounts (for HashiCorp Vault / OpenBao: the token) (and, if you sign in to a Bitwarden-compatible server
  with a personal API key, that key). They are deleted when you lock an account, when OmniVault locks itself after
  the inactivity time you set, when your computer's screen locks (if enabled) and when the browser closes.
- If PIN unlock is on: the locked sessions, sealed with the PIN key pair, and the count of wrong PIN attempts.
  Five wrong attempts delete them.
- The last ten passwords created with the password generator, so you can look them up again.
- A login you just submitted on a website, for up to three minutes, while the "Save login?" prompt is offered.
- Short-lived technical state, such as open passkey requests and when the clipboard is due to be cleared.

Your decrypted entries are kept only in the memory of the extension's background process while an account is
unlocked. They are not written to disk by OmniVault.

## Websites

- OmniVault does not read the websites you visit unless you allow it. Filling from the popup, the keyboard shortcut
  or the context menu only works on the page you are on, and only after you act.
- If you turn on the OmniVault button in login fields, the "Save login?" prompt or passkeys, OmniVault asks for
  access to websites. With that access it adds a small script to pages that looks for login forms, shows the
  OmniVault button, offers to save a login you submit (the user name and password stay in the browser and are only
  saved to the account you pick), and answers passkey requests of the page. The address of the page is used to find
  matching entries. Nothing from the page is sent anywhere unless you save it to one of your accounts.
- OmniVault fills a login only into the website it belongs to and asks first if the address does not match.

## Clipboard

When you copy a user name, password or code, OmniVault puts it on your system clipboard and clears the clipboard
again after the time you set (30 seconds by default; you can turn this off). OmniVault never reads your clipboard.

## Files

Exports, downloaded attachments and imported files are handled entirely in your browser. An export or attachment is
saved only where you choose; an import file is read only when you select it.

## Permissions

OmniVault asks for the browser permissions it needs to work. Access to websites, to self-hosted servers, to
Bitwarden's cloud file storage and to programs on your computer (Native Messaging) is optional and requested only
when you use a feature that needs it. You can withdraw these permissions at any time in your browser's extension
settings.

## Your choices

- Lock all accounts at any time with the lock button; remove an account to delete its stored settings and keys.
- Removing OmniVault from your browser deletes everything it stored.
- The local helper is removed with `python3 install.py --uninstall` (see [native/README.md](native/README.md)).
- Your data in Bitwarden, Passbolt and the other password managers is managed through those services.

## Children

OmniVault is a general-purpose tool and is not directed at children.

## Changes

If this policy changes, the new version is published in this file in OmniVault's public repository, together with
the date of the change. Its history shows every earlier version.

## Contact

OmniVault is an open-source project. Questions about this policy are welcome in the
[issue tracker](https://github.com/omni-vault/OmniVault/issues). Please report security issues privately through
[GitHub's security advisories](https://github.com/omni-vault/OmniVault/security/advisories/new).
