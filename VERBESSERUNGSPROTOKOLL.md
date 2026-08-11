# Verbesserungsprotokoll

Chronik der Änderungen an der App – neueste Einträge oben.

## 2026-08-11 · Projekt-Sperre (Passwortschutz für einzelne Projekte)

**Beschreibung**

Einzelne Projekte lassen sich jetzt verschliessen. Ein verschlossenes
Projekt öffnet sich nur noch nach Eingabe des Codes `271201` – desselben
Codes, der schon die App-Ideen schützt.

- Neues optionales Projektfeld `locked` (Bool, Standard: öffentlich). Es
  wird mit dem Projekt gespeichert und synchronisiert: auf Gerät A
  gesperrt heisst auch auf Gerät B gesperrt. Projekte ohne das Feld
  (gesamter Altbestand) gelten weiterhin als öffentlich – keine Migration.
- Schalter „🔓 Öffentlich / 🔒 Verschlossen“ in der Kopfzeile der
  Projektansicht, direkt über der Hosting-Zeile.
- Die Code-Abfrage der App-Ideen wurde in einen zentralen Abschnitt
  „ZUGANGSCODE“ gezogen: aus `IDEAS_CODE`/`openIdeaCodeModal()` wurden
  `ACCESS_CODE`/`openCodeModal(titel, onSuccess, onCancel)`. Beide Bereiche
  nutzen dieselbe Funktion – es gibt nur noch eine Stelle mit dem Code.
- Vor einem verschlossenen Projekt steht ein Sperrschirm; erst nach
  richtigem Code werden Inhalte gezeichnet und Firestore-Listener
  abonniert. Falscher Code: Fehlermeldung, erneuter Versuch möglich.
  Abbrechen führt zurück zur Übersicht.
- **Die Entsperrung bleibt gerätelokal.** Sie liegt ausschliesslich in der
  Modul-Variable `entsperrtesProjekt` (reiner Arbeitsspeicher) – nicht in
  Firestore, nicht im `localStorage`, nicht in der Synchronisierung.
  Geleert wird sie beim Verlassen des Projekts, beim Wechsel in den
  Hintergrund (`visibilitychange`/`pagehide`) und beim Abmelden; nach einem
  Neustart der App ist der Code ohnehin wieder fällig.
- In der Projektübersicht tragen gesperrte Projekte ein Schloss und den
  Hinweis „Verschlossen“. Host-Badge und Anzahl offener Aufgaben werden
  weder angezeigt noch abgefragt.

Geprüft: Die bestehende App-Ideen-Sperre synchronisierte ihren
Entsperr-Status nie – `ideasUnlocked` war und bleibt eine reine
In-Memory-Variable. Es musste dafür nichts geändert werden.

**Geänderte Dateien**

- `index.html` – zentraler Zugangscode, Projektsperre, Sperrschirm,
  Kopfzeilen-Schalter, Kartendarstellung, Router- und
  Hintergrund-Behandlung, CSS
- `CLAUDE.md` – neuer Abschnitt „Zugangscode & Projektsperre“
- `VERBESSERUNGSPROTOKOLL.md` – diese Datei (neu angelegt)

Keine Änderung an `firestore.rules` nötig: `locked` ist ein Feld der
bestehenden Collection `projects`, keine neue Collection.
