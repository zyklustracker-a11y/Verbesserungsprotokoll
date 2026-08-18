# Verbesserungsprotokoll

Chronik der Änderungen an der App – neueste Einträge oben.

## 2026-08-18 · Dateien ablegen und einfügen

**Beschreibung**

Nachbesserung zum Dateien-Bereich: `.md`-Dateien liessen sich schwer
hinzufügen. Am Speichern lag es nicht – der Weg dorthin nimmt jeden Dateityp
an und filtert nichts (am Datei-Input steht bewusst kein `accept`). Es
scheiterte am Dateidialog des Geräts. Deshalb gibt es jetzt zwei Wege daran
vorbei, und der Auswahlbereich wurde grosszügiger:

- **Ablegen überall**: Die Fläche erscheint nicht mehr nur am Rechner,
  sondern auf jedem Gerät ausser dem iPhone (`canDropFiles`) – das iPad kann
  aus der Dateien-App ins Fenster ziehen, obwohl es keine Ordner auswählen
  darf. Ziel ist ausserdem nicht mehr nur das gestrichelte Rechteck: das
  ganze Formular bzw. das ganze App-Idee-Popup nimmt Dateien an.
- **Einfügen**: ⌘V bzw. Strg+V übernimmt kopierte Dateien und
  Bildschirmfotos direkt in die Auswahl; daneben gibt es den Knopf
  „Einfügen“ für Browser, die die Zwischenablage hergeben. Reiner Text wird
  nicht abgefangen und landet weiter im Textfeld. Eingefügtes heisst
  systemweit immer „image.png“ und bekommt deshalb einen Namen mit
  Zeitstempel.
- **Nichts geht mehr verloren**: Eine neben dem Feld abgelegte Datei öffnete
  bisher der Browser – die halb ausgefüllte Eingabe war weg. Ein Fänger am
  Fenster verhindert das.
- Auf dem iPhone steht jetzt im Hinweis, dass im Auswahlmenü „Dateien
  auswählen“ zu tippen ist – über „Fotomediathek“ erscheinen nur Bilder.

**Geänderte Dateien**

- `index.html` – `buildFilePicker()` neu (Ablegen, Einfügen, `bindDrop`,
  `aktiverPicker`), `canDropFiles`, `eingefuegterName()`, Fänger am `window`,
  `opts.name` in `prepareFile`/`storeFiles`, `dropTarget` in
  `buildFileAdder`
- `CLAUDE.md` – Abschnitt „Gespeicherte Dateien“ nachgezogen
- `VERBESSERUNGSPROTOKOLL.md` – dieser Eintrag

## 2026-08-18 · Dateien direkt an einer App-Idee

**Beschreibung**

Jede App-Idee hat neben „Konzept“ und „Prompt“ jetzt einen dritten Knopf
**„Dateien“** – gleiche Optik, gleiches Muster (Pill-Button ⇒ Popup). Dort
lassen sich Bilder, Texte, Code und ganze Ordner ablegen, mit derselben
Auswahl, denselben Grenzen und denselben Fehlermeldungen wie in der Kategorie
„Dateien“.

- **Eine Ablage, kein zweiter Speicher.** Die Dateien landen in einem ganz
  normalen `savedFiles`-Eintrag und erscheinen dadurch automatisch in der
  Kategorie „Dateien“. Nichts wird kopiert oder doppelt gespeichert; beide
  Ansichten lesen dieselben Dokumente. Die Zuordnung ist ein Feld:
  `appIdeaId` am Eintrag und an jeder Datei.
- **Erkennbar in der Ablage:** Der Eintrag trägt unter dem Titel ein
  Kennzeichen „💡 App-Idee · <Ideentext>“. An den einzelnen Zeilen wird es
  nicht wiederholt – dort steht nur etwas, wenn es abweicht (z. B. „⊖ nicht
  mehr zugeordnet“). Der Ideentext erscheint nur bei entsperrter Sitzung,
  sonst bleibt es beim neutralen „💡 App-Idee“: der Zugangscode gilt weiter.
- **Zwei klar getrennte Aktionen** in der Idee: „⊖ Aus Idee entfernen“ löst
  nur die Zuordnung (die Datei bleibt in „Dateien“), „🗑 Endgültig löschen“
  löscht überall – mit deutlicher Rückfrage.
- **Eine App-Idee zu löschen löscht keine Dateien.** `unlinkIdeaFiles()` löst
  nur die Verknüpfungen; der Bestätigungstext sagt das ausdrücklich.
- Umgekehrt wirkt das Löschen in „Dateien“ sofort auch in der Idee – es gibt
  keine verwaisten Verknüpfungen, weil der Eintrag über eine Abfrage gefunden
  und nicht als ID an der Idee gespeichert wird.
- **Neu für beide Bereiche:** eine Vorschau. Bilder gross (auch per Klick aufs
  Vorschaubild), `.md` gerendert, andere Textdateien lesbar, alles Übrige mit
  Name, Grösse, Typ und Herunterladen.

**Geänderte Dateien**

- `index.html` – Abschnitt „DATEIEN EINER APP-IDEE“ (`ensureIdeaEntry`,
  `refreshIdeaLinkCount`, `unlinkIdeaFiles`, `openIdeaFilesModal`),
  `openFilePreview()` + `renderMarkdown()`, `buildFileRow`/`paintFileList`/
  `buildFileAdder`/`writeFileDoc` um Vorschau, Kennzeichen und Zusatzfelder
  erweitert, dritter Knopf in `buildIdeaItem()`, CSS für Kennzeichen,
  Vorschau und Markdown
- `CLAUDE.md` – neuer Abschnitt „Dateien einer App-Idee“
- `VERBESSERUNGSPROTOKOLL.md` – dieser Eintrag

**Firestore-Regeln:** unverändert – es kam keine neue Collection dazu.

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
