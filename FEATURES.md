# Featureliste

Stand 19.10.2026, Version 0.5.3. Diese Datei ist die Tracking-Liste: Jede Zeile sagt, ob **OmniVault** eine Funktion
umsetzt und womit das geprüft ist. Wer einen Provider ändert, passt die Zeile im selben Commit an.

**Legende**

| Zeichen | Bedeutung |
|---|---|
| ✅ R | umgesetzt, gegen die **echte Gegenstelle** getestet: lokales Vaultwarden, lokaler Passbolt CE 5.16, echtes `pass` + GnuPG |
| ✅ S | umgesetzt, gegen einen **simulierten** Server bzw. ein simuliertes CLI getestet |
| ✅ U | umgesetzt, durch Unit-Tests mit Beispieldaten abgedeckt |
| ✅ | umgesetzt, nur manuell bzw. indirekt geprüft |
| ✅ L | umgesetzt **in OmniVault**, weil der Anbieter es nicht kennt (z. B. Favoriten lokal gespeichert) |
| 🟡 | teilweise (Einschränkung in der Fußnote) |
| ❌ | vom Anbieter möglich, in OmniVault **noch nicht** umgesetzt |
| ⛔ | über die verfügbare Schnittstelle **nicht möglich** |
| ❓ | umgesetzt, aber in diesem Browser noch nicht getestet |
| – | gibt es beim Anbieter nicht |

## Anbieter auf einen Blick

| Anbieter | Anbindung | Testbasis |
|---|---|---|
| Bitwarden (Cloud) und Vaultwarden | direkt über die Server-API, Entschlüsselung im Browser | R (Vaultwarden) |
| Passbolt v4 und v5 | direkt über die Server-API, OpenPGP im Browser | R (Passbolt CE 5.16, zwei Nutzer) |
| pass (password-store) | Native-Host → `pass` + GnuPG | R |
| 1Password | Native-Host → offizielles `op` | S |
| LastPass | Native-Host → offizielles `lpass` | S |
| Proton Pass | Native-Host → offizielles `pass-cli` | S, **zurückgestellt** ¹ |
| alle anderen (KeePass, KeePassXC, Chrome, Firefox …) | Dateiimport in ein beschreibbares Konto | siehe Import |

¹ Proton gibt `pass-cli` derzeit nur für kostenpflichtige Tarife frei („Your account is not yet allowed to use our
CLI“). Der Provider bleibt im Code und in den Tests, wird aber nicht weiterentwickelt, bis das CLI für alle Konten
nutzbar ist. Ein Ersatz für das offizielle CLI ist bewusst nicht vorgesehen.

Bitwarden Cloud und Vaultwarden nutzen denselben Provider; gegen bitwarden.com/.eu ist nichts automatisiert getestet.

## Parität zwischen den Anbietern

| Funktion | Bitwarden / Vaultwarden | Passbolt | pass | 1Password | LastPass | Proton Pass |
|---|---|---|---|---|---|---|
| Logins lesen, anlegen, bearbeiten, löschen | ✅ R | ✅ R | ✅ R | ✅ S | ✅ S | ✅ S |
| Notizen | ✅ R | ✅ R (v5) ² | – ³ | ✅ S | ✅ S | ✅ S |
| Karten, Identitäten lesen | ✅ R | – | – | 🟡 S (Karten) ⁴ | – | ✅ S |
| Karten, Identitäten anlegen und bearbeiten | ✅ R | – | – | ❌ ⁴ | – | ⛔ |
| Zusatzfelder lesen | ✅ R | ✅ R (v5) | ✅ R | ✅ S | ⛔ | ✅ S |
| Zusatzfelder bearbeiten | ✅ R | ✅ R (v5-Logins) | ✅ R ⁵ | ✅ S | ⛔ | ⛔ |
| TOTP lesen und ändern | ✅ R | ✅ R | ✅ R | ✅ S | ⛔ | 🟡 S (nur lesen) |
| Favoriten | ✅ R | ✅ R | ✅ L | ✅ S | ✅ L | ✅ L |
| Ordner / Tresore anzeigen und verschieben | ✅ R | ✅ R (anzeigen), ✅ S (verschieben) | ✅ R (Pfade) | ✅ S (Tresore) | ✅ S (Gruppen) | ✅ S (Tresore) |
| Ordner / Tresor anlegen | ✅ R | ✅ R ⁶ | ✅ R | ✅ S | ✅ S | ❌ |
| Papierkorb: Löschen landet dort | ✅ R | – (endgültig) | – (endgültig) | ✅ S („Zuletzt gelöscht“) | – (endgültig) | ✅ S |
| Papierkorb in OmniVault anzeigen, wiederherstellen, endgültig löschen | ✅ R | – | – | ❌ | – | ❌ |
| Anhänge herunterladen | ✅ R | – | – | ❌ | ❌ | ❌ |
| Passwortverlauf | ✅ R | – | – | ❌ | ❌ | ❌ |
| Passkeys anzeigen | ✅ R | – ⁹ | – ⁹ | ❌ | ❌ | ✅ S (nur Seite und Benutzer) |
| Passkeys auf Webseiten anlegen und damit anmelden, entfernen | ✅ R (Bitwarden-Format, mit den offiziellen Apps austauschbar) | – ⁹ | – ⁹ | ⛔ ¹⁰ | ⛔ ¹⁰ | ⛔ ¹⁰ |
| Teilen, Rechte ändern, Zugriff entziehen | ❌ ⁷ | ✅ R | – | ⛔ | ⛔ | ⛔ |
| Geteilte Einträge bearbeiten | ✅ R (Organisation) | ✅ R (Geheimnis für alle Leser neu verschlüsselt) | – | 🟡 (wie eigene, ungetestet) | 🟡 (wie eigene, ungetestet) | ❌ |
| Konflikterkennung (veralteter Stand wird nicht überschrieben) | ✅ R | ✅ R | – | ❌ | ❌ | ❌ |
| Geheimnisse erst bei Bedarf entschlüsseln | – (alles lokal) | ✅ R | ❌ ⁸ | ✅ S | ✅ S | ✅ S |
| Rate-Limit verständlich melden | ✅ R | ✅ | – | – | – | – |

² Ein frisch installierter Passbolt 5.16 arbeitet mit v4-Ressourcen; Notizen ohne Passwort und Zusatzfelder gibt es
erst, wenn ein Admin die verschlüsselten Metadaten (v5) einschaltet. Beide Zustände sind gegen den echten Server getestet.
³ In pass beginnt jeder Eintrag mit einer Passwortzeile.
⁴ 1Password: Kartendaten werden gelesen; das Anlegen bräuchte die genauen Feldvorlagen von `op`, die hier nicht gegen
das echte Programm prüfbar sind.
⁵ pass: Zusatzfelder sind `Name: Wert`-Zeilen; pass kennt keine verborgenen Felder.
⁶ Passbolt 5.16 lehnt v5-Ordner ab, solange sein Aktionsprotokoll aktiv ist (es verlangt einen Klartextnamen);
OmniVault legt dann einen einfachen Ordner an, wenn der Server das erlaubt.
⁷ Bitwarden teilt über Organisationen und Sammlungen; das Verschieben in eine Organisation fehlt noch.
⁸ pass legt URL und Benutzer in der verschlüsselten Datei ab; ohne Entschlüsseln gäbe es keinen Seitenabgleich.
⁹ Passbolt und pass kennen keine Passkeys.
¹⁰ Die Programme `op`, `lpass` und `pass-cli` geben die privaten Schlüssel von Passkeys nicht heraus; Proton Pass
zeigt nur, für welche Seite und welchen Benutzer ein Passkey existiert.

## Anmeldung und Sitzung

| Funktion | Bitwarden / Vaultwarden | Passbolt | CLI-Anbieter |
|---|---|---|---|
| Anmelden mit Master-Passwort / Passphrase | ✅ R (PBKDF2, Argon2id) | ✅ R (privater Schlüssel + Passphrase) | im CLI (`op signin`, `lpass login`, gpg-Agent) |
| Anmelden mit API-Schlüssel | ✅ R | – | – |
| Zwei-Faktor | 🟡 S ¹¹ | 🟡 S ¹² | übernimmt das CLI |
| Bestätigung neuer Geräte (E-Mail-Code) | ✅ S | – | – |
| Selbst gehosteter Server | ✅ R | ✅ R | – |
| Token-Erneuerung / Sitzung halten | ✅ R | ✅ S | ✅ S |
| Serveridentität prüfen | – | ✅ R (Schlüssel-Pinning) | – |
| Entsperren mit PIN, 4–12 Ziffern, Prüfung schon bei der Eingabe (nach Auto-Sperre, bis zum Browser-Neustart) | ✅ S | ✅ S | ✅ (gleicher Weg, nicht eigens getestet) |
| SSO / vertrauenswürdige Geräte | ❌ | ❌ | – |
| Biometrie | ⛔ (Browser-Erweiterungen haben keinen Zugriff) | ⛔ | – |

¹¹ TOTP, E-Mail, YubiKey-OTP. WebAuthn und Duo fehlen; in diesem Fall hilft der API-Schlüssel.
¹² TOTP und YubiKey-OTP. Duo fehlt.

## Werkzeuge (anbieterübergreifend)

| Funktion | Stand |
|---|---|
| Duplikate in einem Konto und zwischen Konten (Website + Benutzer) | ✅ R + U |
| Mehrfach verwendete und schwache Passwörter (Werkzeuge → Prüfen, nur lokal) | ✅ R + U |
| Mehrfachauswahl: kopieren, verschieben, löschen | ✅ R |
| Kopieren / Verschieben aus Detailansicht und Editor | ✅ R |
| Übertragen zwischen Anbietern | ✅ R: Logins, Notizen, Karten, Identitäten und Zusatzfelder, soweit das Ziel sie speichern kann; sonst stehen sie lesbar in den Notizen. Passkeys gehen mit, wenn das Ziel sie speichern kann (Bitwarden → Bitwarden); Anhänge, Verlauf und sonst auch Passkeys bleiben im Original (Hinweis vorher, je nach Zielkonto). |
| Spiegel-Regeln (Quelle → Ziel, optional mit Löschen, ohne Ping-Pong) | ✅ R + U |
| Automatischer Abgleich entsperrter Konten | ✅ (Alarm geprüft) |
| Papierkorb (Werkzeuge → Papierkorb) | ✅ R (Bitwarden/Vaultwarden) |
| Export: Bitwarden-JSON (vollständig, mit Passkeys samt Schlüssel wie bei Bitwarden) und CSV, je Konto oder alle | ✅ R + U |

## Dateiimport

Import eines Exports in ein bestehendes, beschreibbares Konto (Werkzeuge → Import/Export). Die Datei wird nur im
Browser gelesen. Karten, Identitäten und Zusatzfelder bleiben erhalten, wenn das Zielkonto sie speichern kann, sonst
stehen sie in den Notizen. Nicht zugeordnete CSV-Spalten landen in den Notizen.

| Format | Stand |
|---|---|
| CSV mit Kopfzeile (Bitwarden, LastPass, Chrome, Firefox, NordPass, Dashlane, 1Password, KeePass, Safari …) | ✅ R + U |
| Bitwarden / Vaultwarden JSON (unverschlüsselt), auch OmniVaults eigener Export; Passkeys gehen in Bitwarden-Konten mit | ✅ R + U |
| Proton Pass JSON (`data.json` aus dem Export) | ✅ U |
| KeePass 2 XML (KeePass, KeePassXC) | ✅ R |
| Format automatisch erkennen | ✅ U |
| Ziel: Konto und Ordner wählbar | ✅ R |
| Verschlüsselte Exporte, ZIP-Archive (1PUX, Proton-ZIP) | ⛔ (vorher unverschlüsselt bzw. entpackt exportieren) |
| KeePass-Datenbank `.kdbx` direkt öffnen | ❌ zurückgestellt (Kryptografie hier nicht gegen echte Dateien prüfbar) |

## Oberfläche

| Funktion | Stand |
|---|---|
| Mehrere Konten gleichzeitig, auch vom selben Anbieter | ✅ R |
| Kontofarbe und Kürzel an jedem Eintrag | ✅ R |
| Passende Einträge zur aktuellen Seite oben | ✅ R |
| Suche über Name, Benutzer, Adresse, Ordner, Konto; Filter nach Typ und Favoriten | ✅ R |
| Schnellkopie: Benutzer, Passwort, TOTP | ✅ R |
| Detailansicht mit allen Feldern, verdeckte Werte auf Anfrage, Live-TOTP | ✅ R |
| Editor: Logins, Notizen, Karten, Identitäten, Zusatzfelder (Text, verborgen, Ja/Nein), mehrere Adressen | ✅ R |
| „Neuer Ordner …“ direkt im Ordnerfeld | ✅ R |
| Teilen-Dialog (Passbolt): Personen und Gruppen suchen, Rechte Lesen/Bearbeiten/Besitzer | ✅ R |
| Passwortgenerator (Zeichenklassen, ohne Verwechsler, PIN, Stärkeanzeige), Liste zuletzt erzeugter Passwörter; Passwörter verdeckt, Anzeigen per Auge | ✅ R + U |
| Helles und dunkles Erscheinungsbild (folgt dem System), eigene Strich-Icons | ✅ |
| Tastaturbedienung: Menüs mit Pfeiltasten, Esc geht zurück | ✅ R |
| Zurück/Vorwärts zwischen Ansichten wie im Browser: Pfeile im Kopf, Alt+←/→ (Mac: ⌘[ / ⌘]), Maustasten 4/5; Formulare behalten beim Zurückkehren ihre Eingaben | ✅ R (echtes Popup) |
| Einstellungen listen alle Konten mit Status; sperren, entsperren, bearbeiten, entfernen | ✅ R |
| Einheitliche Kontrollkästchen in allen Ansichten (Browsertest prüft die Größe) | ✅ R |
| Muster-Identitäten: erfundene Daten (E-Mail unter example.com, keine Ausweisnummern) im Neu-Menü und im Editor | ✅ R + U |
| Nach einer Berechtigungsabfrage (Popup schließt sich) geht es an derselben Stelle weiter, ohne Passwörter zu merken | ✅ R |

## Sprachen

Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch (Brasilien), Chinesisch (vereinfacht) und
Japanisch. Ohne Einstellung gilt die Sprache des Browsers (bei anderen Sprachen Englisch); gefragt wird nicht.
Einstellungen → Darstellung → Sprache wechselt sofort.

| Funktion | Stand |
|---|---|
| Popup, Seitenleiste, Fenster, Liste im Anmeldefeld, „Login speichern?“ | ✅ R (alle Sprachen durchgeklickt) |
| Meldungen aus dem Hintergrund und der Anbieter, Kontextmenü, Texte des lokalen Hosts | ✅ U |
| Name, Beschreibung und Tastenkürzel im Browser (`_locales`) | ✅ R |
| Mehrzahl nach den Regeln der Sprache (`Intl.PluralRules`), Datum und Uhrzeit (`Intl.DateTimeFormat`) | ✅ U |
| Sprachwahl als Raster (Tastatur: Pfeiltasten in beiden Richtungen, Pos1/Ende, Esc) | ✅ R |
| Übersetzungen im Verwendungskontext formuliert (Knopf, Hinweis, Fehlermeldung), mit den üblichen Begriffen der Passwortmanager je Sprache | ✅ |
| Übersetzung durch Muttersprachler geprüft | ❌ (alle Übersetzungen außer Deutsch sind maschinell erstellt) |
| Sprachen mit Schrift von rechts nach links | ❌ (nicht angeboten) |

## Browser

| Funktion | Chrome / Chromium | Firefox |
|---|---|---|
| Toolbar-Popup | ✅ R (echtes Popup getestet) | ❓ |
| Eigenes Fenster, Seitenleiste; Wechsel Fenster ↔ Seitenleiste in beide Richtungen | ✅ R | ❓ Fenster → Seitenleiste über Klick auf das Symbol (Übergabe in Chromium simuliert, in Firefox ungetestet) |
| Ausfüllen per Klick, Tastenkürzel, Kontextmenü | ✅ R | ❓ |
| Karten und Identitäten in Zahlungs- und Adressformulare ausfüllen | ✅ S | ❓ |
| OmniVault-Knopf in Anmeldefeldern mit passenden Logins (Opt-in) | ✅ S | ❓ |
| „Login speichern?“ / „Passwort aktualisieren?“ nach dem Anmelden (Opt-in) | ✅ S | ❓ |
| Auto-Sperre (Zeit, Bildschirmsperre), Zwischenablage leeren | ✅ | ❓ |
| Native-Host für CLI-Anbieter | ✅ R | ❓ (Manifest wird installiert, nicht getestet) |
| Passkeys: Seite fragt → OmniVault-Dialog (anlegen in neuem oder vorhandenem Login, anmelden, „anderes Gerät oder Browser“), Opt-in | ✅ R (Prüfseite mit unabhängiger Signaturprüfung, Passkeys gegen echtes Vaultwarden); manuell auf webauthn.io bestätigt | ✅ (manuell auf webauthn.io: anlegen und anmelden, 19.10.2026) |
| Passkeys in der Liste eines `username webauthn`-Felds (bedingte Anfrage, „conditional mediation“) | ✅ S | ❓ |
| Gesperrtes Konto: Dialog bietet Entsperren an, wenn dort ein Passkey für die Seite liegen kann | ✅ S | ❓ |

## Was gegenüber den offiziellen Apps noch fehlt

| Funktion | Grund |
|---|---|
| Passkeys in Formularen innerhalb fremder iframes, Sicherheitsschlüssel-Erweiterungen (PRF, largeBlob) | nicht umgesetzt; der Browser übernimmt diese Anfragen |
| Passkeys für 1Password, LastPass, Proton Pass | deren Kommandozeilenprogramme geben die Schlüssel nicht heraus |
| Bitwarden Send, Notfallzugriff, Berichte über Datenlecks (HIBP) | nicht umgesetzt |
| Bitwarden: Einträge in Organisationen/Sammlungen verschieben, Anhänge hochladen | nicht umgesetzt |
| Bitwarden: WebAuthn- und Duo-Zweitfaktor, SSO | brauchen den Web-Tresor des Anbieters als Gegenstelle; Ausweg API-Schlüssel |
| Passbolt: Duo, Kontowiederherstellung, Ordner teilen | nicht umgesetzt |
| Entsperren nach Browser-Neustart ohne Master-Passwort | bewusst nicht: die versiegelten Sitzungen liegen nur im Arbeitsspeicher |
