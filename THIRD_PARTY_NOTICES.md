# Verwendete Open-Source-Software und Lizenzen

Lizenztexte: Ordner [`LICENSES/`](LICENSES/). OmniVault selbst steht unter der MPL-2.0 ([LICENSE](LICENSE)).
Grundsatz: so wenig Fremdsoftware wie möglich. Fremdcode kommt nur für Kryptografie hinzu, und zwar als etablierte, quelloffene Bibliothek.

## In der Extension enthalten

Alle vier Dateien liegen als **separate, unveränderte Bibliotheken** in `vendor/` und werden zur Laufzeit importiert,
nicht in OmniVaults eigenen Code gebündelt. Sie werden reproduzierbar aus den in
[`vendor/sources.json`](vendor/sources.json) festgeschriebenen Upstream-Commits gebaut
(`vendor/fetch-sources.sh` prüft die Commit-Hashes, `vendor/build.mjs` baut).

| Datei | Bibliothek | Version | Lizenz | Verwendung |
|---|---|---|---|---|
| `vendor/openpgp.mjs` | [OpenPGP.js](https://github.com/openpgpjs/openpgpjs) | 6.3.2 | LGPL-3.0-or-later ([Text](LICENSES/openpgpjs-LGPL-3.0.txt), dazu [GPL-3.0](LICENSES/GPL-3.0.txt)) | Passbolt: Schlüssel entsperren, Login-Challenge signieren und verschlüsseln, Geheimnisse und Metadaten entschlüsseln, Signaturen prüfen |
| ↳ enthalten | [@noble/ciphers](https://github.com/paulmillr/noble-ciphers) | 1.3.0 | MIT ([Text](LICENSES/noble-ciphers-MIT.txt)) | AES für OpenPGP.js |
| ↳ enthalten | [@noble/curves](https://github.com/paulmillr/noble-curves) | 1.9.7 | MIT ([Text](LICENSES/noble-curves-MIT.txt)) | Elliptische Kurven für OpenPGP.js |
| ↳ enthalten | [@noble/hashes](https://github.com/paulmillr/noble-hashes) | 1.8.0 | MIT ([Text](LICENSES/noble-hashes-MIT.txt)) | Hashfunktionen für OpenPGP.js |
| ↳ enthalten | [web-stream-tools](https://github.com/openpgpjs/web-stream-tools) | 0.3.1 | MIT ([Text](LICENSES/web-stream-tools-MIT.txt)) | Stream-Verarbeitung in OpenPGP.js |
| ↳ enthalten | [bn.js](https://github.com/indutny/bn.js) | 5.2.3 | MIT ([Text](LICENSES/bn.js-MIT.txt)) | Große Ganzzahlen (Fallback) in OpenPGP.js |
| ↳ enthalten | [fflate](https://github.com/101arrowz/fflate) | 0.8.3 | MIT ([Text](LICENSES/fflate-MIT.txt)) | Dekompression in OpenPGP.js |
| ↳ enthalten | [tweetnacl-js (OpenPGP.js-Fork)](https://github.com/openpgpjs/tweetnacl-js) | 1.0.4-2 | Unlicense ([Text](LICENSES/tweetnacl-js-Unlicense.txt)) | Fallback für Curve25519, falls WebCrypto es nicht bietet |
| ↳ enthalten | argon2id (siehe unten) | 1.0.1 | MIT | Argon2-S2K in OpenPGP.js |
| `vendor/argon2id.mjs` | [argon2id](https://github.com/openpgpjs/argon2id) (© Proton AG) | 1.0.1 | MIT ([Text](LICENSES/argon2id-MIT.txt)); C-Kern teils aus der Argon2-Referenzimplementierung (CC0) | Bitwarden: Schlüsselableitung für Konten mit Argon2id |
| `vendor/noble-ciphers.mjs` | [@noble/ciphers](https://github.com/paulmillr/noble-ciphers), nur `xchacha20poly1305` | 1.3.0 (gleicher Commit wie in OpenPGP.js) | MIT ([Text](LICENSES/noble-ciphers-MIT.txt)) | Bitwarden „Encryption V2“: ältere Umschläge mit XChaCha20-Poly1305, das WebCrypto nicht bietet |
| `vendor/tweetnacl.mjs` | [TweetNaCl.js](https://github.com/dchest/tweetnacl-js), `nacl-fast.js` unverändert | 1.0.3 | Unlicense ([Text](LICENSES/tweetnacl-js-Unlicense.txt)) | KeePassXC: NaCl-Box (X25519, XSalsa20-Poly1305) für das Browser-Protokoll |

**Abweichungen vom offiziellen Build:** gebaut mit esbuild statt rollup; der WebAssembly-Kern von argon2id wird mit
clang statt Emscripten kompiliert, nur in der portablen Variante ohne SIMD. Die SIMD-Variante entfällt, die Bibliothek
nutzt dann automatisch die portable. Die BZip2-Dekompression (`@openpgp/unbzip2-stream`) ist weggelassen, weil
Version 2.1.0 nicht als Quelltext veröffentlicht ist; BZip2-komprimierte Nachrichten werden mit einer Fehlermeldung
abgelehnt. Der Quelltext von OpenPGP.js selbst ist unverändert.

**Quelltext (LGPL):** `vendor/sources/openpgpjs-6.3.2-source.tar.gz` und `vendor/sources/argon2id-1.0.1-source.tar.gz`
im Quellcode-Paket von OmniVault; vollständige Quellen über die Commits in `vendor/sources.json`.
**Austauschbarkeit (LGPL):** `vendor/openpgp.mjs` kann durch einen eigenen Build von OpenPGP.js ersetzt werden
(gleiche ES-Modul-Schnittstelle), z. B. beim Laden der entpackten Extension.

Kryptografische Grundfunktionen für Bitwarden (AES-CBC, HMAC, PBKDF2, RSA-OAEP, SHA, AES-GCM – auch als Grundlage von
XAES-256-GCM), für TOTP und für Passkeys (ECDSA P-256) kommen aus der WebCrypto-API des Browsers.

### Daten

| Datei | Quelle | Stand | Lizenz | Verwendung |
|---|---|---|---|---|
| `vendor/public_suffix_list.dat` → `src/lib/psl-data.js` | [Public Suffix List](https://publicsuffix.org/) (Mozilla Foundation und Mitwirkende) | 17.10.2026 (SHA-256 `3d92f70d…25e5f33`, [publicsuffix/list](https://github.com/publicsuffix/list) Commit `52b71b3`) | MPL-2.0 (wie OmniVault, [LICENSE](LICENSE)) | Registrierbare Domain für den Seitenabgleich und die rpId-Prüfung bei Passkeys |
| `test/fixtures/psl-test.txt` | Prüffälle der Public Suffix List (`tests/test_psl.txt`, gleiches Repository und gleicher Commit) | 17.10.2026 | Public Domain (CC0) | nur Test: `test/psl.test.js` prüft OmniVaults Auswertung gegen alle Fälle |

`src/lib/psl-data.js` enthält nur die Regeln der Liste (Kommentare entfernt, Domains in ASCII-Schreibweise) und wird
mit `npm run psl:build` neu erzeugt. Aktualisieren (vor jedem Release): `git clone --depth 1
https://github.com/publicsuffix/list`, `public_suffix_list.dat` nach `vendor/` und `tests/test_psl.txt` nach
`test/fixtures/psl-test.txt` kopieren, `npm run psl:build`, `npm test`, Datum, Hash und Commit hier eintragen.

## Externe Programme (nicht enthalten, nur aufgerufen)

Der Native-Host (`native/omnivault_host.py`) startet diese Programme als eigenständige Prozesse ohne Shell, wenn der
Nutzer den jeweiligen Anbieter verbindet. Keines ist in OmniVault enthalten oder verlinkt; der Nutzer installiert sie
selbst.

| Programm | Lizenz | Verwendung |
|---|---|---|
| Python 3 | PSF-2.0 | Laufzeit des Hosts; nur die Standardbibliothek wird genutzt |
| [pass (zx2c4 password-store)](https://git.zx2c4.com/password-store/) | GPL-2.0-or-later | Anbieter „pass“ |
| GnuPG (`gpg`) | GPL-3.0-or-later | Von `pass` zum Ent- und Verschlüsseln genutzt |
| [1Password CLI](https://developer.1password.com/docs/cli/) (`op`) | proprietär | Anbieter 1Password |
| [lastpass-cli](https://github.com/lastpass/lastpass-cli) (`lpass`) | GPL-2.0-or-later | Anbieter LastPass |
| [Proton Pass CLI](https://github.com/protonpass/pass-cli) (`pass-cli`) | GPL-3.0 | Anbieter Proton Pass (zurückgestellt). Aus dem Quelltext von `pass-cli` und `proton-pass-common` wurde nur das JSON-Ausgabeformat abgelesen, kein Code übernommen. |

## Nur zum Testen heruntergeladen (nicht weitergegeben)

| Programm | Lizenz | Verwendung |
|---|---|---|
| [Passbolt CE API](https://github.com/passbolt/passbolt_api) (v5.16.0) mit seinen Composer-Abhängigkeiten | AGPL-3.0 (Abhängigkeiten MIT u. a.) | Lokaler Testserver für `npm run test:passbolt` (`test/passbolt-server.sh`), nur auf 127.0.0.1 mit Wegwerfdaten und PostgreSQL. OmniVault spricht nur über HTTP mit ihm. Das Skript überspringt für diese Testinstanz die PRO-Anforderung der PHP-ldap-Erweiterung. |
| [Vaultwarden](https://github.com/dani-garcia/vaultwarden), statischer Linux-Build aus [zouzonghao/vaultwarden](https://github.com/zouzonghao/vaultwarden) (Release `upstream-20261010-183532-64895524`, SHA-256 geprüft) | AGPL-3.0 | Lokaler Testserver für `npm run test:vaultwarden`, nur auf 127.0.0.1 mit Wegwerfdaten. Das Vaultwarden-Projekt veröffentlicht nur Container-Images, daher dieser Fremd-Build; mit `VAULTWARDEN_BIN` lässt sich ein eigener Build nutzen. OmniVault spricht nur über HTTP mit dem Server. |
| [Proton Pass CLI](https://github.com/protonpass/pass-cli) 2.3.1 (offizielles Release, SHA-256 geprüft) | GPL-3.0 | Abgleich der vom Host genutzten Befehle, Fehlermeldungen und Exit-Codes; nicht Teil des Repositorys. |

## Nur zum Bauen und Testen (nicht in der Extension)

| Paket | Version | Lizenz | Verwendung |
|---|---|---|---|
| [esbuild](https://github.com/evanw/esbuild) | 0.28 | MIT ([Text](LICENSES/esbuild-MIT.txt)) | Bündelt OmniVaults Code und die Vendor-Bibliotheken |
| [Playwright](https://github.com/microsoft/playwright) | 1.56 | Apache-2.0 ([Text](LICENSES/playwright-Apache-2.0.txt), [NOTICE](LICENSES/playwright-NOTICE.txt)) | Browsertests `test/e2e-*.mjs` |
| Chromium (über Playwright) | – | BSD-3-Clause u. a. | Testbrowser, wird nicht weitergegeben |
| clang / wasm-ld (LLVM, Systemprogramm) | 18 | Apache-2.0 mit LLVM-Ausnahme | Kompiliert den argon2id-WebAssembly-Kern; nicht Teil der Extension |
| GnuPG (optional, Systemprogramm) | 2.4 | GPL-3.0-or-later | Gegenprobe in `test/pgp.test.js`, Erzeugung der Testschlüssel; nur als externes Programm aufgerufen |

## Spezifikationen, nach denen OmniVault eigenen Code implementiert

| Spezifikation | Verwendung |
|---|---|
| RFC 5869 (HKDF) | Streckung des Bitwarden-Master-Keys (HMAC aus WebCrypto) |
| RFC 6238 / RFC 4226 | TOTP-Codes (HMAC aus WebCrypto) |
| Bitwarden Security Whitepaper / Client-API | `src/providers/bitwarden/`: eigenständig, kein Code aus den Bitwarden-Clients |
| Passbolt API-Dokumentation | `src/providers/passbolt/`: eigenständig, kein Code aus der Passbolt-Extension |
