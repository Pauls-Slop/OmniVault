# Native-Host: pass, gopass, 1Password, LastPass und Proton Pass

Einige Passwortmanager haben keine für Fremd-Clients offene Netz-API, aber ein offizielles Kommandozeilen-Programm.
OmniVault spricht mit diesen Programmen über **einen** kleinen lokalen Host per *Native Messaging*. Der Host
(`omnivault_host.py`, Name `org.omnivault.host`) braucht nur Python 3 (≥ 3.8) mit der Standardbibliothek. Er enthält
keinen Code der Anbieter und liefert keines ihrer Programme mit: Sie installieren und entsperren das Programm selbst.

```
Browser-Erweiterung ⇄ (Native Messaging, JSON) ⇄ omnivault_host.py ⇄ pass | gopass | op | lpass | pass-cli
```

| Anbieter | Programm | Anmeldung | Modul |
|---|---|---|---|
| pass | `pass` (password-store) + `gpg` | `pass init <gpg-id>`; der gpg-Agent entsperrt den Schlüssel | `ov_pass.py` |
| gopass | `gopass` (≥ 1.15, mit gpg) + `gpg` | `gopass setup` bzw. `gopass init`; der gpg-Agent entsperrt den Schlüssel | `ov_gopass.py` |
| 1Password | `op` (1Password CLI 2.x) | `op signin`, Desktop-App-Integration oder Service-Account | `ov_onepassword.py` |
| LastPass | `lpass` (lastpass-cli) | `lpass login <E-Mail>` | `ov_lastpass.py` |
| Proton Pass | `pass-cli` (≥ 2.3 empfohlen) | `pass-cli login` | `ov_proton.py` |

Gemeinsame Bausteine (Nachrichtenformat, Programmaufruf, ID-Prüfung) liegen in `ov_common.py`.

**Proton Pass ist zurückgestellt.** Proton gibt `pass-cli` derzeit nur für kostenpflichtige Tarife frei; andere
Konten bekommen „Your account is not yet allowed to use our CLI“. Der Provider bleibt erhalten und funktioniert,
sobald das CLI für Ihr Konto freigeschaltet ist.

## 1. Programm installieren und anmelden

Installieren Sie das Programm nach der Anleitung des Anbieters und melden Sie sich im Terminal an. Prüfen Sie die
Anmeldung mit `pass ls`, `gopass ls`, `op whoami`, `lpass status` bzw. `pass-cli info`.

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
| `gopass` | `OMNIVAULT_GOPASS_BIN` |
| `op` | `OMNIVAULT_OP_BIN` |
| `lpass` | `OMNIVAULT_LPASS_BIN` |
| `pass-cli` | `OMNIVAULT_PASS_CLI` |

## 3. In OmniVault verbinden

*Neu* (Plus-Symbol oben rechts) → *Konto hinzufügen* → Anbieter wählen → *Verbinden*. Der Browser fragt einmalig
nach der Berechtigung „Mit kooperierenden nativen Anwendungen kommunizieren“.

## Was geht

| Funktion | pass | gopass | 1Password | LastPass | Proton Pass |
|---|---|---|---|---|---|
| Lesen (Benutzer, Passwort, URL, Notizen) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Karten, Identitäten, SSH-Schlüssel lesen | – | – | ✅ (Karten, Identitäten) | – | ✅ |
| Karten, Identitäten anlegen und ändern | – | – | ✅ (aus der `op`-Vorlage; Adresse nur lesen) | – | – |
| Anhänge herunterladen (bis 30 MB) | – | – | ✅ (`op read`, `op document get`) | ✅ (`lpass show --attach`) | ✅ (`item attachment download`) |
| Passwortverlauf | – | – | wenn `op` ihn ausgibt | – | – |
| TOTP lesen | ✅ (`otpauth://`-Zeile) | ✅ (`otpauth://`-Zeile) | ✅ | – | ✅ |
| Login / Notiz anlegen, ändern, löschen | ✅ (nur Logins) | ✅ (nur Logins) | ✅ (Löschen nach „Zuletzt gelöscht“) | ✅ | ✅ (Löschen in den Papierkorb) |
| Zusatzfelder lesen und ändern | ✅ (`Name: Wert`-Zeilen) | ✅ (`Name: Wert`-Zeilen) | ✅ (andere Felder und Abschnitte bleiben erhalten) | – | nur lesen |
| Ordner / Gruppe / Tresor | ✅ (Pfad, neu anlegen) | ✅ (Pfad und eingehängte Speicher; verschieben mit `gopass mv`) | ✅ (Tresore: verschieben, neu anlegen) | ✅ (Gruppe, neu anlegen) | ✅ (Tresor, verschieben ab 2.3) |
| Geheimnisse erst bei Bedarf laden | – (lädt beim Abgleich) | – (lädt beim Abgleich) | ✅ | ✅ | ✅ |
| Favoriten | in OmniVault gespeichert | in OmniVault gespeichert | ✅ (`--favorite`) | in OmniVault gespeichert | in OmniVault gespeichert |
| TOTP ändern | ✅ | ✅ | ✅ | – | – |
| Konflikterkennung (Änderung von anderswo wird nicht überschrieben) | – | – | ✅ (`version`) | ✅ (`last_modified_gmt`) | ✅ (`modify_time`) |

pass und gopass kennen keinen eigenen Notiz-Typ: Jeder Eintrag beginnt mit einer Passwortzeile. gopass: Der Host ruft
nur `gopass ls --flat`, `gopass mounts`, `gopass show -f -n`, `gopass insert -f` (Inhalt über stdin), `gopass mv -f`
und `gopass rm -f` auf; eingehängte Speicher (`gopass mounts`) erscheinen als Ordner der obersten Ebene, Verschieben
zwischen ihnen geht über `gopass mv`. Benachrichtigungen und Erinnerungen von gopass sind für diese Aufrufe abgeschaltet.

## Sicherheit

- Geheimnisse gehen beim Anlegen und Ändern über **stdin** an die Programme, nie über die Kommandozeile:
  `pass insert -m` und `gopass insert -f` lesen den Inhalt, `op item create -` und `op item edit <id>` lesen ein JSON (beim Ändern das
  vollständige Element mit den geänderten Werten, weil die Vorlage das Element ersetzt),
  `lpass add/edit --non-interactive` liest `Feld: Wert`-Zeilen. So stehen sie nicht in der Prozessliste.
- 1Password-Karten und -Identitäten beginnen mit der Vorlage des installierten `op` (`op item template get`), damit
  Feld-IDs, Typen und Abschnitte zu 1Password passen. **Passkeys:** Laut 1Password-Doku überschreibt `op item edit`
  mit JSON-Vorlage einen vorhandenen Passkey; `op` zeigt Passkeys nicht an. Logins mit Passkey daher in der
  1Password-App bearbeiten (der Editor weist darauf hin).
- Anhänge schreibt das Programm in einen frisch angelegten privaten Ordner (Rechte 0700) unter einem festen
  Dateinamen; der Host liest die Datei, löscht den Ordner und gibt höchstens 30 MB weiter. Große Dateien gehen in
  mehreren Nachrichten an den Browser. Befehle: `op read --out-file <Datei> op://<Tresor-ID>/<Eintrags-ID>/<Datei-ID>`,
  `op document get <ID> --vault <Tresor-ID> --out-file <Datei>`, `lpass show --attach=att-<ID> --quiet <ID>` (über
  stdout, mit Größengrenze) und `pass-cli item attachment download … --output <Datei>`.
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

## KeePassXC

KeePassXC braucht den OmniVault-Host nicht. OmniVault spricht KeePassXCs eigenes, öffentlich dokumentiertes
Browser-Protokoll ([keepassxc-protocol.md](https://github.com/keepassxreboot/keepassxc-browser/blob/develop/keepassxc-protocol.md))
über das mitgelieferte Programm `keepassxc-proxy`. Die Nachrichten sind mit einer NaCl-Box verschlüsselt
(TweetNaCl.js); der Proxy reicht sie nur weiter.

```
Browser-Erweiterung ⇄ (Native Messaging, NaCl-Box) ⇄ keepassxc-proxy ⇄ KeePassXC
```

1. In KeePassXC unter *Einstellungen → Browser-Integration* die Integration einschalten. Unter *Erweitert* die
   Option „Allow keepassxc-proxy to list all entries …“ einschalten, sonst kann OmniVault keine Liste zeigen.
2. Manifest registrieren: `python3 install.py --chrome-id <ERWEITERUNGS-ID> --keepassxc`. Das Skript sucht
   `keepassxc-proxy` (Linux `/usr/bin`, Snap `/snap/bin/keepassxc.proxy`, macOS im Programmpaket, Windows im
   Installationsordner); sonst `--keepassxc-proxy PFAD` angeben. Es legt ein Manifest unter OmniVaults eigenem
   Namen `org.omnivault.keepassxc` an. KeePassXCs eigenes Manifest bleibt unberührt: Es lässt nur die offiziellen
   Erweiterungen zu und wird von KeePassXC selbst neu geschrieben.
3. In OmniVault *Konto hinzufügen → KeePassXC → Verbinden*. KeePassXC fragt, ob es die Verbindung annehmen soll, und
   nach einem Namen dafür (z. B. „OmniVault“). Diese Zuordnung lässt sich in KeePassXC unter *Datenbank →
   Datenbankeinstellungen → Browser-Integration* jederzeit wieder entfernen.

**Flatpak:** Ein Manifest muss auf eine ausführbare Datei zeigen. Legen Sie ein kleines Skript an, z. B.
`~/.local/bin/keepassxc-proxy-flatpak` mit dem Inhalt `#!/bin/sh` und
`exec flatpak run --command=keepassxc-proxy org.keepassxc.KeePassXC "$@"`, machen Sie es ausführbar und geben Sie
es mit `--keepassxc-proxy` an. (Dieser Weg ist nicht getestet.)

Was über das Protokoll geht: Einträge auflisten (Titel, Adresse), Benutzer und Passwort je Eintrag über seine
Adresse holen (KeePassXC kann dabei nachfragen), den aktuellen TOTP-Code anzeigen, Logins anlegen und ändern
(KeePassXC benennt neue Einträge nach der Seite), Gruppen anlegen, löschen (KeePassXC fragt). Nicht möglich:
Notizen, Zusatzfelder, Titel ändern, TOTP-Schlüssel, Einträge ohne Website-Adresse auslesen, Verschieben.

## Fehlersuche

| Meldung | Ursache und Abhilfe |
|---|---|
| „Der OmniVault-Host ist nicht installiert“ | `install.py` nicht ausgeführt oder falsche Erweiterungs-ID; erneut mit der richtigen ID ausführen |
| „… wurde nicht gefunden“ | Programm fehlt oder liegt nicht im Suchpfad; installieren oder die Variable aus der Tabelle oben setzen |
| Konto bleibt „gesperrt“ | Im Terminal anmelden (`op signin`, `lpass login`, `pass-cli login`) bzw. den gpg-Schlüssel entsperren |
| „Your account is not yet allowed to use our CLI“ | Proton hat das CLI für Ihr Konto (noch) nicht freigegeben |
| „mit einem Sperrcode gesperrt“ | `pass-cli`-Sitzung mit Sperrcode: im Terminal `pass-cli session unlock` |
| „bitte pass-cli aktualisieren“ | Version älter als 2.3: `pass-cli update` |
| „KeePassXC erlaubt das Auflisten der Einträge nicht“ | in KeePassXC unter Browser-Integration → Erweitert „Allow keepassxc-proxy to list all entries“ einschalten |
| „KeePassXC: Die Datenbank ist gesperrt“ | Datenbank in KeePassXC entsperren |
| „KeePassXC kennt diese Verbindung nicht (mehr)“ | Zuordnung wurde in KeePassXC entfernt: Konto bearbeiten → neu verbinden |

## Mit dem eigenen Konto testen

`selftest.py` ruft den Host so auf wie der Browser. Die Ausgabe enthält nur Zahlen, Typen und ok/Fehler, keine
Titel, Benutzernamen oder Passwörter, und lässt sich daher weitergeben:

```bash
python3 selftest.py pass                       # nur lesen
python3 selftest.py gopass --write              # Wegwerf-Eintrag anlegen, ändern, verschieben, löschen
python3 selftest.py onepassword --write        # zusätzlich anlegen, ändern, löschen (Login, Karte, Identität)
python3 selftest.py lastpass --write
python3 selftest.py proton --write --vault OmniVault-Test   # Proton: vorher einen LEEREN Tresor anlegen
python3 selftest.py lastpass --limit 200       # mehr Einträge nach Anhängen durchsuchen (Standard 25)
```

Der Selbsttest zählt in den ersten Einträgen Anhänge, Passwortverläufe und Passkeys und lädt einen gefundenen Anhang
einmal herunter (ausgegeben wird nur die Größe). Bei 1Password legt `--write` zusätzlich eine Wegwerf-Karte und eine
Wegwerf-Identität aus der `op`-Vorlage an, liest sie zurück, ändert und löscht sie; gemeldet wird nur, ob die Felder
übereinstimmen. Beides zeigt, ob das echte Programm die Formate liefert, die die Tests simulieren.

## Geprüft

pass ist gegen das echte `pass` + GnuPG getestet, gopass gegen das offizielle Release 1.17.4 (Linux amd64,
Hash geprüft, `test/gopass-bin.sh`) + GnuPG, auch mit einem eingehängten zweiten Speicher. 1Password und LastPass sind gegen simulierte Programme getestet,
die die Formate von `op` 2.x und `lastpass-cli` 1.x nachbilden; Proton Pass gegen ein simuliertes `pass-cli`, dessen
Befehle, Fehlermeldungen und Exit-Codes mit dem echten `pass-cli` 2.3.1 (ohne Anmeldung) abgeglichen sind. Prüfen Sie
diese drei vor dem produktiven Einsatz mit `selftest.py` gegen die echten Programme.

Alle genannten Namen sind Marken ihrer Inhaber; OmniVault ist mit ihnen nicht verbunden.
