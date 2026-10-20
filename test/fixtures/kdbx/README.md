# KeePass test databases

All files contain the entries of `source.xml` (four entries in groups, one in the recycle bin, one attachment) and are
opened with the password `omnivault-test`; the `*-keyfile` files also need `keepassxc.keyx`.

| File | Written by | Format |
|---|---|---|
| `keepassxc-3.1-aeskdf-aes.kdbx` | KeePassXC 2.7 (`keepassxc-cli import`) | KDBX 3.1, AES-KDF, AES-256 |
| `keepassxc-4-*.kdbx` | KeePassXC 2.7 (`keepassxc-cli merge` into a database from `generate.py`, so KeePassXC writes the whole file with fresh seeds) | KDBX 4.0, Argon2d/Argon2id/AES-KDF, AES-256/ChaCha20, with and without key file |
| `py-*.kdbx` | `generate.py` (independent of OmniVault's reader; checked with `keepassxc-cli`) | KDBX 3.1 with Salsa20 inner stream, 4.0 without compression and with key file, 4.1 |
| `kdbxweb/` | sample databases from the test suite of [kdbxweb](https://github.com/keeweb/kdbxweb) (MIT, see `kdbxweb/LICENSE`) | KDBX 3.1/4.x, key files (XML v1/v2, 32/64 byte, binary, with BOM), empty password, Cyrillic password |

Passwords of the kdbxweb samples: `demo` with `demo.key` (demo, AesChaCha, Argon2, Argon2id, Argon2ChaCha), `test`
(KDBX4.1, Key32, Key64, KeyWithBom, binkey with their key files), empty (EmptyPass; KeyV2 and NoPassWithKeyFile with their
key files), `пароль` (cyrillic).

Regenerate the Python-written files, e.g.:

```bash
python3 generate.py source.xml py-4.1-argon2d-chacha20.kdbx --password omnivault-test --version 4.1 --kdf argon2d --cipher chacha20
```
