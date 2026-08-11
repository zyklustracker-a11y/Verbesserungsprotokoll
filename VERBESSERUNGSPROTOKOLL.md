# Verbesserungsprotokoll

Chronik der Änderungen an der App – neueste Einträge oben.

## 2026-08-11 · Code einmal pro Sitzung statt pro Bereich

**Beschreibung**

Der Code muss nur noch **einmal je Sitzung und Gerät** eingegeben werden.
Danach sind für diese Sitzung alle verschlossenen Projekte **und** die
App-Ideen offen – vorher verlangte jedes Projekt und die Ideensammlung
jeweils eine eigene Eingabe.

- Die beiden Variablen `ideasUnlocked` und `entsperrtesProjekt` sind zu einer
  einzigen zusammengefasst: `codeEntsperrt`. Gesetzt wird sie in
  `openCodeModal()` selbst, damit es keine zwei Zustände geben kann.
- Unverändert gerätelokal: reiner Arbeitsspeicher, kein Firestore, kein
  `localStorage`, kein `sessionStorage`. Gerät B verlangt den Code weiterhin,
  auch wenn Gerät A mit demselben Konto gleichzeitig entsperrt ist.
- Unverändert flüchtig: Neuladen der Seite bzw. Neustart der App verlangt den
  Code erneut. Ebenso nach dem Abmelden und nach „Verstecken“ bei den
  App-Ideen – dieser Schalter sperrt jetzt alles hinter dem Code wieder ab.
- **Geändert gegenüber der ersten Fassung:** Das Zurücksperren beim Wechsel in
  den Hintergrund (`visibilitychange`/`pagehide`) ist entfernt. Ein
  Tab-Wechsel oder ein kurzer Blick in eine andere App ist keine neue
  Sitzung; die Sperre hielt sonst im Alltag nur wenige Sekunden.

**Geänderte Dateien**

- `index.html` – `codeEntsperrt` statt `ideasUnlocked`/`entsperrtesProjekt`,
  Setzen in `openCodeModal()`, Hintergrund-Handler entfernt, Router
  vereinfacht, „Verstecken“ sperrt alles
- `CLAUDE.md` – Abschnitt „Zugangscode & Projektsperre“ nachgezogen
- `VERBESSERUNGSPROTOKOLL.md` – dieser Eintrag

## 2026-08-11 · Aufgabenzähler auf jeder Projektkarte

**Beschreibung**

Nachbesserung zur Projekt-Sperre: Der Zähler der offenen Aufgaben stand bei
verschlossenen Projekten nicht mehr auf der Karte. Er ist jetzt bei **allen**
Projekten sichtbar – verschlossen wie öffentlich.

- Neue Hilfsfunktion `aufgabenText(n)` als einzige Stelle für den Text:
  „0 Aufgaben übrig“, „1 Aufgabe übrig“, „2 Aufgaben übrig“. Die Zahl steht
  immer da, auch die 0; die früheren Sonderformulierungen („Keine offenen
  Aufgaben“, „1 offene Aufgabe übrig“) entfallen.
- Verschlossene Projekte zeigen weiterhin das Schloss und weiterhin **kein**
  Host-Badge. Neu ist allein die Zahl – sie verrät nichts über den Inhalt.

**Geänderte Dateien**

- `index.html` – `aufgabenText()`, Kartenaufbau in `buildProjectCard()`,
  CSS-Regel `.card-count.locked` entfernt
- `CLAUDE.md` – Abschnitt „Zugangscode & Projektsperre“ nachgezogen
- `VERBESSERUNGSPROTOKOLL.md` – dieser Eintrag

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
- **Die Entsperrung bleibt gerätelokal.** Sie liegt ausschliesslich in einer
  Modul-Variable (reiner Arbeitsspeicher) – nicht in Firestore, nicht im
  `localStorage`, nicht in der Synchronisierung. Nach einem Neustart der App
  ist der Code wieder fällig. (Reichweite und Lebensdauer wurden im Eintrag
  vom selben Tag oben angepasst.)
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
