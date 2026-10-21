# OmniVault – Entwicklung

Browser-Erweiterung (Chrome und Firefox, Manifest V3), die mehrere Passwortmanager in einer Oberfläche
zusammenführt: Einträge aus allen Konten suchen, kopieren und auf Webseiten ausfüllen (auf Wunsch mit Knopf im
Anmeldefeld und „Login speichern?“), Passkeys anlegen und damit anmelden (in Bitwarden-/Vaultwarden-Konten, im
Format der Bitwarden-Apps), Einträge zwischen Konten kopieren, verschieben und spiegeln, Duplikate und schwache
Passwörter finden, Exporte anderer Manager importieren und alles wieder exportieren.

| Anbieter | Anbindung | Stand |
|---|---|---|
| Bitwarden (bitwarden.com, bitwarden.eu) | direkt, Entschlüsselung im Browser | lesen und schreiben, gegen echtes Vaultwarden getestet |
| Vaultwarden / selbst gehostetes Bitwarden | direkt | wie oben |
| Passbolt v4 und v5 | direkt, OpenPGP im Browser | lesen, schreiben, teilen; gegen echten Passbolt CE 5.16 getestet |
| pass (password-store) | lokaler Host → `pass` + GnuPG | lesen und schreiben, gegen echtes pass getestet |
| 1Password | lokaler Host → offizielles `op` | lesen und schreiben, gegen simuliertes CLI getestet |
| LastPass | lokaler Host → offizielles `lpass` | lesen und schreiben, gegen simuliertes CLI getestet |
| KeePassXC | KeePassXCs Browser-Schnittstelle über `keepassxc-proxy` | Logins lesen, anlegen, ändern, löschen; gegen simulierten KeePassXC getestet |
| Proton Pass | lokaler Host → offizielles `pass-cli` | zurückgestellt: Proton gibt das CLI nur für kostenpflichtige Tarife frei |
| KeePass-Dateien, Browser und andere | Dateiimport (KeePass-Datenbank `.kdbx`, CSV, JSON, KeePass-XML) | in ein beliebiges beschreibbares Konto |

- **Stand je Funktion und Anbieter:** [FEATURES.md](FEATURES.md)
- **Lokaler Host für pass, 1Password, LastPass, Proton:** [native/README.md](native/README.md)
- Fremdsoftware und Lizenzen: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

OmniVault ist ein unabhängiges Projekt und nicht mit Bitwarden Inc., Passbolt S.A., Proton AG, AgileBits Inc.
(1Password) oder LastPass US LP verbunden. Alle genannten Marken gehören ihren Inhabern.

## Bauen

```bash
npm install
npm run build        # → dist/chrome, dist/firefox
npm run package      # baut und packt dist/packages/: Chrome-, Firefox- und Quellpaket (reproduzierbar) + SHA256SUMS
npm test             # Unit-Tests: Krypto-Testvektoren, simulierte Server und CLIs, Import, Werkzeuge
npm run test:cli     # pass (echtes pass + gpg), 1Password und LastPass (simulierte CLIs) über den Host
npm run test:e2e     # Erweiterung in Chromium: Popup als Tab, eigenes Fenster (Playwright)
npm run test:popup   # echtes Toolbar-Popup über CDP; mit `xvfb-run -a` sichtbar statt headless
npm run test:proton  # Proton Pass: Chromium → Native Messaging → Host → simuliertes pass-cli
npm run test:vaultwarden  # startet ein lokales Vaultwarden und testet Provider, Werkzeuge, Import, Anhänge, Organisationen
                          # (Verschieben, Sammlungen) und den automatischen Abgleich über einen Neustart des Service Workers
npm run test:passbolt     # richtet einen lokalen Passbolt CE ein (PostgreSQL) und testet Provider und Teilen dagegen
npm run test:inline       # Knopf im Anmeldefeld, „Login speichern?“, Karten ausfüllen
npm run test:i18n         # Sprachen: Browsersprache, Sprachwahl, alle Ansichten in allen Sprachen + Pseudosprache
npm run test:passkeys     # Passkeys: Testseite mit Prüfung auf dem Server, OmniVault-Dialog, Rückfall auf den Browser
npm run test:hibp         # Prüfung gegen Datenlecks: Zustimmung zuerst, nur 5-stellige Präfixe (Dienst simuliert)
npm run test:shortcuts    # Tastenkürzel und Kontextmenü mit echten X11-Eingaben (sichtbarer Browser unter Xvfb)
npm run test:firefox      # dieselben Funktionen in Firefox (WebDriver BiDi, siehe unten)
```

Die e2e-Skripte nehmen den Pfad zu Playwright als erstes Argument, falls es nicht im Projekt installiert ist.
`test:popup` prüft die feste Popup-Größe; das gelingt nur mit sichtbarem Browser (`xvfb-run -a npm run test:popup`).
`test:vaultwarden` lädt beim ersten Lauf ein statisches Vaultwarden-Linux-Binary (Fremd-Build, Hash geprüft, siehe
`test/vaultwarden-server.sh`); mit `VAULTWARDEN_BIN=/pfad/zu/vaultwarden` nutzt es ein eigenes. Die GnuPG-Gegenproben
in `npm test` brauchen ein installiertes `gpg`, sonst werden sie übersprungen; die pass-Tests laufen mit
`OMNIVAULT_PASS_BIN=/pfad/zu/pass`. `test:passbolt` braucht PHP ≥ 8.2 mit der gnupg-Erweiterung, Composer, git und
die PostgreSQL-Programme (Details in `test/passbolt-server.sh`).

**Firefox-Test** (`test/e2e-firefox.mjs`): Playwrights Firefox kann keine Erweiterungen laden, deshalb startet der
Test ein gewöhnliches Firefox ≥ 140 und steuert es über WebDriver BiDi (`test/firefox-bidi.mjs`, ohne Zusatzpakete,
Node ≥ 22). Die Erweiterung wird temporär installiert (`webExtension.install`, keine Signatur nötig). Mit
`-remote-allow-system-access` erreicht der Test auch das Browserfenster selbst: Toolbar-Popup, Seitenleiste,
Tastenkürzel, Kontextmenü, Browserkonsole. `npm run test:firefox` lädt beim ersten Lauf ein Firefox 158 (Fremd-Build
als AppImage, das Mozillas offizielles Release-Archiv unverändert enthält; Hash geprüft, siehe `test/firefox.sh`);
mit `FIREFOX_BIN=/pfad/zu/firefox` nutzt es ein eigenes. Headless reicht; unter `xvfb-run -a` läuft Firefox sichtbar,
und Strg+Umschalt+L wird als echte X11-Taste gedrückt.

**Argon2 im Hintergrund** (gemessen in Chromium, Service Worker, t=3, p=4): 64 MiB ≈ 0,7 s, 256 MiB ≈ 2,1 s,
512 MiB ≈ 4,3 s, 1 GiB ≈ 8,5 s – auch Bitwardens Höchstwert funktioniert. Während der Ableitung warten andere
Nachrichten an den Hintergrund. Jede Ableitung nutzt eine neue WebAssembly-Instanz, damit deren Speicher danach
freigegeben wird (sonst blieben nach einer 1-GiB-Ableitung über 1 GiB im Hintergrund belegt).

Kryptografie kommt aus etablierten Open-Source-Bibliotheken – OpenPGP.js (LGPL), argon2id (MIT), die
Argon2-Referenzimplementierung (CC0/Apache-2.0, für Argon2d in KeePass-Dateien) und für XChaCha20-Poly1305, ChaCha20 und
Salsa20 @noble/ciphers (MIT), alle als separate Dateien in `vendor/` – und aus WebCrypto. Sonst gibt es keine Laufzeitabhängigkeiten. Bibliotheken neu bauen
(normalerweise nicht nötig, die Ergebnisse liegen im Repository):

```bash
npm run vendor:fetch   # klont die Quellen an den Commits aus vendor/sources.json und prüft die Hashes
npm run vendor:build   # baut alle Dateien in vendor/ (braucht clang mit wasm32-Ziel)
```

## Sprachen

Die Oberfläche gibt es auf Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch (Brasilien),
Chinesisch (vereinfacht) und Japanisch. Ohne Einstellung gilt die Browsersprache; Einstellungen → Darstellung →
Sprache wählt eine andere.

Der deutsche Text im Code ist zugleich der Schlüssel: `t('Konto hinzufügen')`, `tn(n, '{n} Eintrag', '{n} Einträge')`.
Die Übersetzungen liegen in `src/i18n/locales/<sprache>.json`. Neue oder geänderte Texte findet
`npm run i18n:keys`; `npm test` meldet fehlende, veraltete und falsch übersetzte Einträge.

Was die Qualitätssicherung prüft:

- **Vollständigkeit:** Jeder Text, den der Code verwendet (aus `t()`, `tn()`, `tx()`, den HTML-Seiten und dem
  Manifest gesammelt), ist in jeder Sprache vorhanden; nichts Veraltetes bleibt liegen.
- **Platzhalter und Mehrzahl:** `{name}` usw. stimmen überein; Mehrzahlformen passen zu den Regeln der Sprache.
- **Reste:** keine deutschen Wörter oder Umlaute in Übersetzungen, kein HTML; kein deutscher Text im Code außerhalb von
  `t()`.
- **Pseudosprache** (`qps`, nur für Tests): markiert jeden übersetzten Text (⟦…⟧) und macht ihn 40 % länger. Der
  Browsertest klickt damit alle Ansichten durch und meldet jeden unmarkierten Text (am Übersetzer vorbei) sowie
  abgeschnittene Knöpfe, Reiter und Überschriften.
- **Jede Sprache im Browser:** dieselben Ansichten in allen acht Sprachen, ohne waagrechtes Scrollen und abgeschnittene
  Bedienelemente; dazu ein Kontaktabzug aller Bildschirme (`index.html` im Screenshot-Ordner) zur Durchsicht.
- **Sprachwahl:** Browsersprache ohne Rückfrage, Tastaturbedienung des Rasters, sofortiger Wechsel, Meldungen des
  Hintergrunds in der gewählten Sprache, Datumsformat.

Nicht automatisch prüfbar sind Ton, Fachbegriffe und Sinn: Die Übersetzungen sind maschinell erstellt und sollten vor
einer Veröffentlichung von Muttersprachlern anhand des Kontaktabzugs gegengelesen werden.

## Laden

- **Chrome, Edge, Brave:** `chrome://extensions` → Entwicklermodus → „Entpackte Erweiterung laden“ → `dist/chrome`
- **Firefox (≥ 140):** `about:debugging#/runtime/this-firefox` → „Temporäres Add-on laden“ → `dist/firefox/manifest.json`

## Aufbau

```
src/
  background/        Router, Kontenspeicher, Autofill, Werkzeuge (hält als einziger Schlüssel und Klartext)
  popup/             Oberfläche – bekommt Geheimnisse nur auf Anforderung (Kopieren, Anzeigen, Ausfüllen)
    icons.js         eigene Strich-Icons (SVG)
  providers/
    provider.js      Schnittstelle für alle Anbieter
    native-host.js   gemeinsamer Native-Messaging-Transport und Basisklasse für CLI-Anbieter
    bitwarden/       API, Krypto, Provider (deckt Vaultwarden ab)
    passbolt/        JWT-Login, MFA, v4/v5-Ressourcen, Ordner, Geheimnisse bei Bedarf entschlüsseln
    pass/ onepassword/ lastpass/ protonpass/   dünne Provider über den Host
  content/inline.js  Inhaltsskript (Opt-in): Knopf im Anmeldefeld, „Login speichern?“
  inline/            Liste und Speichern-Leiste als Erweiterungsseiten in iframes
  lib/               TOTP, URL-Abgleich, Generator, Duplikate, Import (inkl. KeePass-Datenbanken), Export, Passwortprüfung, PIN-Sperre
  i18n/              Sprachwahl, t()/tn()/tx(), Übersetzungen (locales/*.json)
tools/i18n-extract.mjs  sammelt alle Texte für die Übersetzung
tools/store-screenshots.mjs  Bildschirmfotos (1280 × 800) aus der Web-Demo: `npm run build:demo`, dann
                     `node tools/store-screenshots.mjs <Zielordner> [Playwright-Pfad] [en,de]`
native/              ein Host für alle CLI-Anbieter (Python 3, nur Standardbibliothek), Installer, Selbsttest
vendor/              OpenPGP.js, argon2id, Argon2-Referenz, @noble/ciphers, TweetNaCl (separate Dateien), Quellen-Manifest, Build-Skripte
```

## Sicherheit in Kürze

- Master-Passwörter werden nie gespeichert. Entschlüsselte Schlüssel liegen nur in `storage.session` (Arbeitsspeicher)
  und verschwinden beim Sperren, nach der eingestellten Inaktivität, bei Bildschirmsperre und beim Beenden des Browsers.
- Die Hintergrundseite beantwortet nur Nachrichten von eigenen Erweiterungsseiten; die Inhaltsskripte dürfen nur
  wenige Aufrufe nutzen, keiner liefert Geheimnisse. Ausfüllen nur per Klick, mit Rückfrage, wenn die Adresse nicht passt;
  die Liste im Anmeldefeld füllt nur Logins der Seite aus.
- Entsperren mit PIN: Beim Sperren werden die Sitzungen mit einem öffentlichen Schlüssel versiegelt; den privaten
  öffnet nur die PIN (Argon2id). Das Siegel liegt nur im Arbeitsspeicher, fünf Fehlversuche verwerfen es. Deshalb
  genügen 4 bis 12 Ziffern: Ohne das Siegel nützt die PIN nichts, und nach einem Browser-Neustart gilt wieder das
  Master-Passwort.
- Passkeys: Die Seite erfährt nichts über Konten; sie bekommt nur ihren eigenen Passkey zurück. Origin und rpId
  nimmt OmniVault aus der Adresse des Tabs (rpId-Prüfung mit der Public Suffix List), private Schlüssel verlassen den
  Hintergrund nur verschlüsselt zum Server und erreichen nie die Oberfläche. Nur der oberste Frame einer Seite wird
  bedient. Für gesperrte Konten liegen nur gesalzene Hashes der Seiten mit Passkeys vor.
- Selbst gehostete Server: Die Host-Berechtigung wird erst beim Verbinden angefragt.
- Passbolt: Der private Schlüssel liegt passphrasegeschützt in `storage.local` (wie in der offiziellen Erweiterung);
  der Serverschlüssel wird beim ersten Login gemerkt, ändert er sich, bricht die Anmeldung ab. Beim Bearbeiten und
  Teilen werden Geheimnisse mit den öffentlichen Schlüsseln verschlüsselt, die der Server für die Leser nennt.
- CLI-Anbieter: Geheimnisse gehen über stdin an die Programme, nie über die Kommandozeile (Ausnahme: Ändern bei
  Proton Pass, siehe native/README.md).

## Lizenz

MPL-2.0 ([LICENSE](LICENSE)), © Die OmniVault-Mitwirkenden.
