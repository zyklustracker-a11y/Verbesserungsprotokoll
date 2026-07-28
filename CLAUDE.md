# Verbesserungsprotokoll

Persönliche Notiz-/Projektverwaltungs-App: Verbesserungsvorschläge pro Projekt
(mit Unternotizen), App-Ideen, gespeicherte Prompts und To-dos.
Sprache der UI und aller Texte/Kommentare: **Deutsch**.

## Architektur (wichtig!)

- **Single-File-App**: Die gesamte App lebt in `index.html` (HTML + CSS + JS).
  KEIN Build-Schritt, KEIN Framework, KEINE npm-Abhängigkeiten.
  Niemals React/Vue/Bundler vorschlagen oder die App in Module aufteilen.
- `backup.html` ist ein separater, schlanker Backup-Viewer. Bei Design-Änderungen
  prüfen, ob die CSS-Variablen dort synchron bleiben.
- `firestore.rules` = Security-Regeln. Bei jeder neuen Collection MUSS hier
  ein Match-Block mit `isOwner()` ergänzt werden, sonst blockt Firestore alles
  (Standard-Fallback ist `allow read, write: if false`).

## Tech-Stack

- Vanilla JS als ES-Module, Firebase v10.13.0 per CDN-Import (gstatic.com)
- Firestore-Collections: `projects` (+ Subcollection `entries`), `appIdeas`,
  `savedPrompts`, `todos`, Legacy: `verbesserungsprotokoll`
- Auth: Firebase Auth, Zugriff nur für eine Owner-UID (siehe firestore.rules).
  Der apiKey im Code ist öffentlich und KEIN Geheimnis – Sicherheit kommt
  ausschliesslich aus den Rules. Nicht "verstecken" wollen.
- Legacy-Handling: `ensureLegacyProject()` + `entriesRefFor()` mappen den
  Altbestand. Beim Refactoring nicht entfernen.

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
- Deployment: statisches Hosting (kein Build nötig). firestore.rules werden
  separat in der Firebase Console eingespielt – bei Rules-Änderungen den
  Nutzer explizit daran erinnern!

## Was Claude NICHT tun soll

- Keine Frameworks, Bundler oder package.json einführen
- Die Owner-UID in firestore.rules nicht verändern
- backup.html nicht löschen oder "aufräumen"
- Bestehende Firestore-Daten/Feldnamen nicht umbenennen (Altdaten haben
  kein Owner-Feld – siehe Kommentar in firestore.rules)
