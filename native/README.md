# Native-Host: pass, 1Password, LastPass und Proton Pass

Einige Passwortmanager haben keine für Fremd-Clients offene Netz-API, aber ein offizielles Kommandozeilen-Programm.
OmniVault spricht mit diesen Programmen über **einen** kleinen lokalen Host per *Native Messaging*. Der Host
(`omnivault_host.py`, Name `org.omnivault.host`) braucht nur Python 3 (≥ 3.8) mit der Standardbibliothek. Er enthält
keinen Code der Anbieter und liefert keines ihrer Programme mit: Sie installieren und entsperren das Programm selbst.

```
Browser-Erweiterung ⇄ (Native Messaging, JSON) ⇄ omnivault_host.py ⇄ pass | op | lpass | pass-cli
```

| Anbieter | Programm | Anmeldung | Modul |
|---|---|---|---|
| pass | `pass` (password-store) + `gpg` | `pass init <gpg-id>`; der gpg-Agent entsperrt den Schlüssel | `ov_pass.py` |
| 1Password | `op` (1Password CLI 2.x) | `op signin`, Desktop-App-Integration oder Service-Account | `ov_onepassword.py` |
| LastPass | `lpass` (lastpass-cli) | `lpass login <E-Mail>` | `ov_lastpass.py` |
| Proton Pass | `pass-cli` (≥ 2.3 empfohlen) | `pass-cli login` | `ov_proton.py` |

Gemeinsame Bausteine (Nachrichtenformat, Programmaufruf, ID-Prüfung) liegen in `ov_common.py`.

**Proton Pass ist zurückgestellt.** Proton gibt `pass-cli` derzeit nur für kostenpflichtige Tarife frei; andere
Konten bekommen „Your account is not yet allowed to use our CLI“. Der Provider bleibt erhalten und funktioniert,
sobald das CLI für Ihr Konto freigeschaltet ist.

## 1. Programm installieren und anmelden

Installieren Sie das Programm nach der Anleitung des Anbieters und melden Sie sich im Terminal an. Prüfen Sie die
Anmeldung mit `pass ls`, `op whoami`, `lpass status` bzw. `pass-cli info`.

OmniVault sieht nie Ihr Master-Passwort. Die Sitzung gehört dem jeweiligen Programm; `op signout`, `lpass logout`
oder `pass-cli logout` beenden sie.

## 2. Host registrieren

Die Chrome-ID der Erweiterung steht unter `chrome://extensions` (Entwicklermodus).

```bash
python3 install.py --chrome-id <ERWEITERUNGS-ID>   # Chrome, Chromium, Brave, Edge und Firefox
python3 install.py --firefox-only                  # nur Firefox
python3 install.py --uninstall                     # alles wieder entfernen
```

Das Skript kopiert den Host nach `~/.local/share/omnivault` (Linux), `~/Library/Application Support/OmniVault`
(macOS) oder `%LOCALAPPDATA%\OmniVault` (Windows) und registriert ihn für jeden gefundenen Browser: unter Linux und
macOS im `NativeMessagingHosts`-Ordner des Browsers, unter Windows in der Registry unter `HKCU`. Hosts älterer
OmniVault-Versionen (`org.omnivault.proton`, `org.omnivault.cli`) entfernt es dabei.

Die erste Zeile des Hosts zeigt fest auf das Python, mit dem `install.py` lief, weil Browser Hosts ohne den `PATH`
der Shell starten. Der Host sucht die Programme im `PATH` und zusätzlich in `/opt/homebrew/bin`, `/usr/local/bin`,
`~/.local/bin` und `~/bin`. Liegt ein Programm woanders, setzen Sie seinen Ort per Umgebungsvariable:

| Programm | Variable |
|---|---|
| `pass` / `gpg` | `OMNIVAULT_PASS_BIN` / `OMNIVAULT_GPG_BIN` |
| `op` | `OMNIVAULT_OP_BIN` |
| `lpass` | `OMNIVAULT_LPASS_BIN` |
| `pass-cli` | `OMNIVAULT_PASS_CLI` |

## 3. In OmniVault verbinden

*Neu* (Plus-Symbol oben rechts) → *Konto hinzufügen* → Anbieter wählen → *Verbinden*. Der Browser fragt einmalig
nach der Berechtigung „Mit kooperierenden nativen Anwendungen kommunizieren“.

## Was geht

| Funktion | pass | 1Password | LastPass | Proton Pass |
|---|---|---|---|---|
| Lesen (Benutzer, Passwort, URL, Notizen) | ✅ | ✅ | ✅ | ✅ |
| Karten, Identitäten, SSH-Schlüssel lesen | – | – | – | ✅ |
| TOTP lesen | ✅ (`otpauth://`-Zeile) | ✅ | – | ✅ |
| Login / Notiz anlegen, ändern, löschen | ✅ (nur Logins) | ✅ (Löschen nach „Zuletzt gelöscht“) | ✅ | ✅ (Löschen in den Papierkorb) |
| Zusatzfelder lesen und ändern | ✅ (`Name: Wert`-Zeilen) | ✅ (andere Felder und Abschnitte bleiben erhalten) | – | nur lesen |
| Ordner / Gruppe / Tresor | ✅ (Pfad, neu anlegen) | ✅ (Tresore: verschieben, neu anlegen) | ✅ (Gruppe, neu anlegen) | ✅ (Tresor, verschieben ab 2.3) |
| Geheimnisse erst bei Bedarf laden | – (lädt beim Abgleich) | ✅ | ✅ | ✅ |
| Favoriten | in OmniVault gespeichert | ✅ (`--favorite`) | in OmniVault gespeichert | in OmniVault gespeichert |
| TOTP ändern | ✅ | ✅ | – | – |

pass kennt keinen eigenen Notiz-Typ: Jeder Eintrag beginnt mit einer Passwortzeile.

## Sicherheit

- Geheimnisse gehen beim Anlegen und Ändern über **stdin** an die Programme, nie über die Kommandozeile:
  `pass insert -m` liest den Inhalt, `op item create -` und `op item edit <id>` lesen ein JSON (beim Ändern das
  vollständige Element mit den geänderten Werten, weil die Vorlage das Element ersetzt),
  `lpass add/edit --non-interactive` liest `Feld: Wert`-Zeilen. So stehen sie nicht in der Prozessliste.
- **Ausnahme Proton Pass:** `pass-cli item update` nimmt neue Werte nur als Argument `--field name=wert` an. Während
  des kurzen Aufrufs kann ein anderes Programm **desselben Benutzers** das geänderte Feld in der Prozessliste sehen.
  Andere Benutzer sehen es auf üblichen Systemen nicht. Beim Anlegen gehen Passwort, TOTP und Notiz über stdin.
- Der Host gibt je Anbieter nur Befehle aus einer festen Liste weiter, prüft jede ID gegen ein striktes Muster
  (keine absoluten Pfade, kein `..`) und startet die Programme ohne Shell.
- Die Programme bekommen nie die Verbindung zum Browser als Eingabe, sondern `/dev/null` oder die Daten, die der
  Host selbst liefert. Fragt ein Programm etwas ab, schlägt der Befehl mit einer verständlichen Meldung fehl, statt
  zu hängen.
- Für `pass-cli` setzt der Host `PROTON_PASS_NO_UPDATE_CHECK=1`; aktualisieren Sie es wie gewohnt im Terminal.
- Nur die OmniVault-Erweiterung darf den Host starten (`allowed_origins` bzw. `allowed_extensions` im Manifest).
- Antworten über 1 MB (Browser-Grenze) werden in Teilen gesendet.

## Fehlersuche

| Meldung | Ursache und Abhilfe |
|---|---|
| „Der OmniVault-Host ist nicht installiert“ | `install.py` nicht ausgeführt oder falsche Erweiterungs-ID; erneut mit der richtigen ID ausführen |
| „… wurde nicht gefunden“ | Programm fehlt oder liegt nicht im Suchpfad; installieren oder die Variable aus der Tabelle oben setzen |
| Konto bleibt „gesperrt“ | Im Terminal anmelden (`op signin`, `lpass login`, `pass-cli login`) bzw. den gpg-Schlüssel entsperren |
| „Your account is not yet allowed to use our CLI“ | Proton hat das CLI für Ihr Konto (noch) nicht freigegeben |
| „mit einem Sperrcode gesperrt“ | `pass-cli`-Sitzung mit Sperrcode: im Terminal `pass-cli session unlock` |
| „bitte pass-cli aktualisieren“ | Version älter als 2.3: `pass-cli update` |

## Mit dem eigenen Konto testen

`selftest.py` ruft den Host so auf wie der Browser. Die Ausgabe enthält nur Zahlen, Typen und ok/Fehler, keine
Titel, Benutzernamen oder Passwörter, und lässt sich daher weitergeben:

```bash
python3 selftest.py pass                       # nur lesen
python3 selftest.py onepassword --write        # zusätzlich anlegen, ändern, löschen (Wegwerf-Eintrag)
python3 selftest.py lastpass --write
python3 selftest.py proton --write --vault OmniVault-Test   # Proton: vorher einen LEEREN Tresor anlegen
```

## Geprüft

pass ist gegen das echte `pass` + GnuPG getestet. 1Password und LastPass sind gegen simulierte Programme getestet,
die die Formate von `op` 2.x und `lastpass-cli` 1.x nachbilden; Proton Pass gegen ein simuliertes `pass-cli`, dessen
Befehle, Fehlermeldungen und Exit-Codes mit dem echten `pass-cli` 2.3.1 (ohne Anmeldung) abgeglichen sind. Prüfen Sie
diese drei vor dem produktiven Einsatz mit `selftest.py` gegen die echten Programme.

Alle genannten Namen sind Marken ihrer Inhaber; OmniVault ist mit ihnen nicht verbunden (siehe `../TRADEMARKS.md`).
