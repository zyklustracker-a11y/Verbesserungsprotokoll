# Verbesserungsprotokoll

Persönliche Notiz-/Projektverwaltungs-App: Verbesserungsvorschläge pro Projekt
(mit Unternotizen), App-Ideen, gespeicherte Prompts und To-dos.
Sprache der UI und aller Texte/Kommentare: **Deutsch**.

## Architektur (wichtig!)

- **Single-File-App**: Die gesamte App lebt in `index.html` (HTML + CSS + JS).
  KEIN Build-Schritt, KEIN Framework, KEINE npm-Abhängigkeiten.
  Niemals React/Vue/Bundler vorschlagen oder die App in Module aufteilen.
  Ausnahmen gibt es nur, wo der Browser eine eigene Datei verlangt:
  `firebase-messaging-sw.js` (ein Service Worker muss eine eigene Datei
  sein), `manifest.json` sowie `icon-192.png` und `icon-512.png` (Manifest
  und dessen Icons lassen sich nicht einbetten). Das ist keine Einladung,
  weiteren App-Code auszulagern. Die Firebase-Konfiguration steht im
  Service Worker ein zweites Mal, weil ein Worker nichts aus `index.html`
  lesen kann: wird sie hier geändert, dort mitändern. Ebenso stehen die
  Farben in `manifest.json` als feste Werte – JSON kennt keine
  CSS-Variablen; sie entsprechen `--ink-bg`.
- `backup.html` ist ein separater, schlanker Backup-Viewer. Bei Design-Änderungen
  prüfen, ob die CSS-Variablen dort synchron bleiben.
- `firestore.rules` = Security-Regeln. Bei jeder neuen Collection MUSS hier
  ein Match-Block mit `isOwner()` ergänzt werden, sonst blockt Firestore alles
  (Standard-Fallback ist `allow read, write: if false`).

## Tech-Stack

- Vanilla JS als ES-Module, Firebase v10.13.0 per CDN-Import (gstatic.com)
- Firestore-Collections: `projects` (+ Subcollection `entries`), `appIdeas`,
  `savedPrompts`, `todos`, `savedFiles` (+ `files` + `parts`), `pushTokens`,
  `settings`, Legacy: `verbesserungsprotokoll`
- Auth: Firebase Auth, Zugriff nur für eine Owner-UID (siehe firestore.rules).
  Der apiKey im Code ist öffentlich und KEIN Geheimnis – Sicherheit kommt
  ausschliesslich aus den Rules. Nicht "verstecken" wollen.
- Legacy-Handling: `ensureLegacyProject()` + `entriesRefFor()` mappen den
  Altbestand. Beim Refactoring nicht entfernen.

## Zugangscode & Projektsperre (Abschnitt „ZUGANGSCODE" in index.html)

- Es gibt genau **eine** Code-Abfrage: `ACCESS_CODE` + `openCodeModal(titel,
  onSuccess, onCancel)`. App-Ideen und verschlossene Projekte rufen beide
  diese Funktion. Kommt ein weiterer geschützter Bereich dazu, ebenfalls
  hier andocken statt eine zweite Abfrage zu bauen.
- Der Code entscheidet nur über die **Anzeige**. Die Daten liegen unverändert
  in Firestore; geschützt sind sie ausschliesslich über die Owner-UID in den
  Rules. Kein Sicherheitsversprechen daraus ableiten.
- Projekte tragen ein **optionales** Feld `locked` (Bool). Gelesen wird nur
  über `projektIstGesperrt()`; fehlt das Feld (kompletter Altbestand), gilt
  das Projekt als öffentlich. Keine Migration.
- **Der Entsperr-Zustand darf niemals synchronisiert werden.** Er lebt allein
  in der Modul-Variable `codeEntsperrt` – reiner Arbeitsspeicher, kein
  Firestore, kein `localStorage`, kein `sessionStorage`. Sonst öffnete eine
  Code-Eingabe auf Gerät A den Bereich auch auf Gerät B.
- **Eine Eingabe entsperrt die ganze Sitzung**: App-Ideen und alle
  verschlossenen Projekte. Gesetzt wird `codeEntsperrt` deshalb in
  `openCodeModal()` selbst, nicht bei den Aufrufern – so kann es keine zwei
  Zustände geben. Nicht wieder in Einzelsperren aufteilen.
- Zurückgesetzt wird nur an zwei Stellen: „Verstecken“ bei den App-Ideen und
  Abmelden. Beim Neuladen ist die Variable ohnehin wieder `false`.
- **Kein Zurücksperren beim Wechsel in den Hintergrund.** Es gab dafür einmal
  `visibilitychange`/`pagehide`-Handler; sie sind bewusst entfernt, weil ein
  Tab-Wechsel keine neue Sitzung ist. Nicht wieder einbauen.
- In der Übersicht zeigt `buildProjectCard()` bei gesperrten Projekten Name,
  Icon, Schloss und die Anzahl offener Aufgaben – aber **kein** Host-Badge.
  Die blosse Zahl ist ausdrücklich gewollt (Wunsch des Nutzers), Texte oder
  andere Inhalte des Projekts gehören dort nicht hin.
- Der Zählertext kommt einheitlich aus `aufgabenText(n)`: „0 Aufgaben übrig“,
  „1 Aufgabe übrig“, „2 Aufgaben übrig“. Die Zahl steht immer da, auch die 0 –
  keine Sonderformulierung wie „Keine offenen Aufgaben“ wieder einführen.

## Hosting-Erkennung (Abschnitt „HOSTING" in index.html)

- Projekte tragen ein **optionales** `hosting`-Objekt: `host`, `liveUrl`,
  `repoUrl`, `dashboardUrl`, `deployNote`, `updatedAt`. Gelesen wird
  ausschliesslich über `readHosting()`, das fehlende und falsch typisierte
  Werte zu `''` normalisiert. Es gibt bewusst KEINE Migration – Projekte
  ohne das Feld müssen fehlerfrei weiterlaufen.
- `parseRepoInput()` akzeptiert `owner/repo`, vollständige GitHub-URLs, die
  SSH-Form und die Kurzform ohne Schrägstrich. Bei der Kurzform wird
  `GITHUB_OWNER` ergänzt – diese Konstante ist der Konto-Name des Nutzers.
- URLs aus Eingabefeldern immer durch `normalizeUrl()` schicken: filtert
  `javascript:`/`data:` heraus und ergänzt fehlendes `https://`.
- `dashboardUrl` nur bei GitHub Pages ableiten. Bei Netlify/Vercel/Render
  steckt dort eine interne Projekt-ID, die nicht im Repo steht – NICHTS
  raten, lieber leer lassen.
- Der optionale GitHub-Token liegt in `settings/github` und wird von
  `githubGet()` als `Authorization: Bearer` mitgeschickt. Ohne Token
  funktioniert alles weiter, nur ohne private Repos und mit 60 statt 5000
  Abfragen pro Stunde – diesen Pfad bei Änderungen nicht kaputt machen.
- Der Token gehört NICHT in eine der von `backup.html` gesicherten
  Collections (`projects`, `appIdeas`, `todos`, `verbesserungsprotokoll`),
  sonst landet er in heruntergeladenen Backup-Dateien. Deshalb `settings`.

## Gespeicherte Dateien (Abschnitt „GESPEICHERTE DATEIEN")

- `savedFiles/{id}` hält Titel/Beschreibung, die Anhänge liegen in
  `files`, deren Inhalt als Base64 im Feld `data`. Ein Firestore-Dokument
  fasst nur 1 MiB, deshalb wandern Dateien über `CHUNK_CHARS` (700.000
  Base64-Zeichen) in Teilstücke der Subcollection `parts`; `chunks` am
  Datei-Dokument hält deren Anzahl. **Immer an einer durch 4 teilbaren
  Stelle trennen**, sonst lassen sich die Base64-Teile nicht mehr
  zusammensetzen.
- Dateien ohne `chunks`/`thumb`/`path` sind Altbestand und müssen
  weiterlaufen – gelesen wird überall defensiv, keine Migration.
- Löschen geht immer über `deleteFileDoc()` bzw. `deleteSavedFile()`:
  Firestore räumt Subcollections nicht selbst ab.
- Jedes Bild bekommt ein kleines `thumb`. Ohne das hätten aufgeteilte
  Bilder keine Vorschau, weil ihr `data`-Feld leer ist.
- Ordner: `webkitdirectory` und Drag & Drop gibt es nur am Rechner
  (`canPickFolders`). iOS Safari kann beides nicht – dort die Bedienelemente
  ausblenden statt tote Schalter zu zeigen.

## Benachrichtigungen (Abschnitt „EINSTELLUNGEN")

- Eine Webseite kann sich selbst keine Benachrichtigung auf eine Uhrzeit
  legen. Der Versand kommt von `.github/workflows/todo-erinnerung.yml`:
  läuft alle 15 Minuten, `send-reminder.mjs` entscheidet anhand von
  `settings/notifications`, ob gerade zu senden ist (Zeitfenster von zwei
  Stunden ab der Wunschuhrzeit, `lastSentDate` verhindert Doppelversand).
- Das Skript kommt bewusst ohne npm-Pakete aus und braucht das Repo-Secret
  `FIREBASE_SERVICE_ACCOUNT`. Fehlt es, läuft der Workflow grün durch und
  verschickt nichts – diesen Pfad nicht kaputt machen.
- Verschickt werden reine `data`-Nachrichten; die Anzeige macht der Service
  Worker. Käme ein `notification`-Block dazu, erschienen zwei Mitteilungen.
- `pushTokens`-Dokument-ID ist der SHA-256 des Tokens, damit dasselbe Gerät
  sich nicht vervielfacht.
- Auf iPhone/iPad kommt Web-Push nur in der über „Zum Home-Bildschirm"
  installierten App an, nicht im Safari-Tab. Darauf weist `paintIosHint()`
  ausserhalb der Einstellungen hin – einmal je Sitzung, wegklickbar.
- Die Erlaubnis wird NIE beim Laden abgefragt, sondern erst beim
  Einschalten der Erinnerung. Scheitert sie, wird `enabled:false`
  gespeichert – eine eingeschaltete Erinnerung ohne Zustellweg wäre eine
  stille Lüge.

## Ladescreen (`#splash` in index.html)

- Markup, Stil und Logo stehen inline, damit der Schirm schon beim ersten
  Paint steht. Das Logo kommt per JS aus dem `apple-touch-icon` im Head –
  kein zweiter Base64-Block, keine Netzwerkanfrage.
- Die Schriften sind deshalb bewusst **nicht** renderblockierend geladen
  (`media="print"` + `onload`). Nicht zurückdrehen, sonst erscheint der
  Ladescreen erst, wenn Google geantwortet hat.
- Gesteuert wird er von einem klassischen `<script>` im Body, nicht aus
  dem Modul: es muss laufen, bevor Firebase über das Netz kommt.
- Freigegeben wird erst, wenn die Meilensteine `fonts`, `firebase`, `auth`
  und `daten` gemeldet sind UND 2,5 s vergangen sind. Neue Meilensteine
  über `splashMelde(name)`; `splashAlles()` gibt sofort alles frei.
- Zwei Sicherungen, die bleiben müssen: die Notbremse nach 12 s im
  Steuerskript und der 3-s-Ersatz für `daten` nach dem Auth-Wechsel.
  Sonst bliebe der Schirm z. B. über der Code-Abfrage der App-Ideen
  hängen. Ein zu früh freigegebener Ladescreen ist besser als ein ewiger.

## Code-Konventionen

- DOM-Erzeugung IMMER über den `el(tag, props, children)`-Helper,
  kein rohes `innerHTML` für neue Features (XSS + Konsistenz).
- Echtzeit-Daten über `onSnapshot`, Listener IMMER mit `track(fn)` registrieren,
  damit `cleanup()` sie beim Routing-Wechsel abräumt (sonst Memory-Leaks).
- Schreiboperationen: `addDoc`/`updateDoc`/`deleteDoc` mit `serverTimestamp()`,
  Fehler über `describeError(err)` benutzerfreundlich anzeigen.
- Sortierung von Listen über ein `order`-Feld (siehe `moveProject`/`moveIdea`).
- Design-Tokens NUR über die CSS-Variablen in `:root` (--ink-bg, --brass,
  --sage, --hairline, ...). Keine neuen Hex-Farben hardcoden.
- Schriften: Fraunces (Titel), Inter (Text), IBM Plex Mono (Labels/Eyebrows).

## Workflows

- Neuer Bereich/Sektion: Skill `/neuer-bereich` verwenden (Checkliste
  Collection → Rules → UI → Subscribe → Cleanup).
- Nach Änderungen an index.html läuft automatisch ein Syntax-Check-Hook.
  Wenn er fehlschlägt: Fehler fixen, bevor weitergearbeitet wird.
- Deployment: **GitHub Pages, gebaut aus `main`** (kein Build-Schritt). Ein
  Merge nach `main` löst den Workflow „pages build and deployment" aus, nach
  ca. einer Minute ist die Seite live. PRs immer gegen `main` öffnen.
  `main` ist auch der Default-Branch – das muss so bleiben, denn GitHub
  startet geplante Workflows ausschliesslich vom Default-Branch. Stünde er
  woanders, liefe die To-do-Erinnerung nie.
- firestore.rules werden separat in der Firebase Console eingespielt – bei
  Rules-Änderungen den Nutzer explizit daran erinnern!

## Was Claude NICHT tun soll

- Keine Frameworks, Bundler oder package.json einführen
- Die Owner-UID in firestore.rules nicht verändern
- backup.html nicht löschen oder "aufräumen"
- Bestehende Firestore-Daten/Feldnamen nicht umbenennen (Altdaten haben
  kein Owner-Feld – siehe Kommentar in firestore.rules)
