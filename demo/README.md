# Web-Demo des Popups

Die Projektseite (omni-vault.github.io) zeigt das **echte Popup** der Erweiterung, nicht einen Nachbau. Popup und
Hintergrund laufen unverändert als ES-Module in einer Webseite; ausgetauscht werden nur zwei Dateien:

| Datei im Demo-Build | Quelle | Zweck |
|---|---|---|
| `src/lib/browser.js` | `demo/browser.js` | die genutzten `chrome.*`-APIs, im selben Fenster; Speicher im `sessionStorage` des Tabs |
| `src/providers/registry.js` | aus dem echten `registry.js` erzeugt | Anbieter mit den echten Metadaten (Name, Kontoformular, Fähigkeiten), aber simulierten Tresoren (`demo/vault.js`) |

Dazu kommen Beispielkonten und -einträge (`demo/data.js`), eine neutrale Beispielseite zum Ausfüllen (`demo/page.html`,
example.com) und eine Browser-Symbolleiste drumherum (`demo/index.html`). Die Beispielseite liegt hinter dem Knopf
„Show sample website“ und wird automatisch eingeblendet, wenn das Popup ausfüllt: „Ausfüllen“ führt die echte
`fillInPage`- bzw. `fillFormInPage`-Funktion darin aus. Das Popup bleibt offen und schließt sich nur über das
OmniVault-Symbol. Eingebettet meldet `index.html` der umgebenden Seite per `postMessage`
(`{ omnivaultDemo: 'layout', expanded }`), ob die Beispielseite offen ist, damit diese mehr Platz gibt.

```bash
npm run build:demo        # → dist/demo (keine Abhängigkeiten, kein Bundler)
python3 -m http.server -d dist/demo 8765   # ES-Module brauchen http://, nicht file://
```

Für die Projektseite den Inhalt von `dist/demo` nach `demo/` im Repository `omni-vault.github.io` kopieren.

Hinweise:

- Jeder Tab startet mit vier entsperrten Konten (Bitwarden, Passbolt, 1Password, KeePassXC). Gesperrte Konten
  lassen sich mit einem beliebigen Passwort entsperren; neu angelegte Konten sind leer.
- `demo/build.mjs` bricht ab, wenn sich `popup.html` oder die Importe in `registry.js` so ändern, dass der Austausch
  nicht mehr greift.
- Nicht in der Demo: Seitenleiste (der Browser „bietet keine an“), Inhaltsskripte (Knopf im Anmeldefeld, „Login
  speichern?“, Passkeys auf Webseiten) und echte Server.
