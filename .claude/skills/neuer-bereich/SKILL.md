---
name: neuer-bereich
description: >
  Fügt dem Verbesserungsprotokoll einen neuen Bereich hinzu (wie zuvor die
  To-do-Sektion): neue Firestore-Collection samt Security-Rules, UI-Sektion
  auf der Startseite, Echtzeit-Anbindung. Verwenden, wenn der Nutzer eine
  neue Sektion, Liste oder einen neuen Datentyp in der App will.
---

# Neuen Bereich hinzufügen

Arbeite die Checkliste vollständig und in dieser Reihenfolge ab.
Vorbild ist die bestehende To-do-Sektion (todosRef, subscribeTodos,
buildTodoItem) – bei Unklarheiten dort nachschauen und das Muster kopieren.

## 1. Firestore-Grundlage

- [ ] Collection-Ref oben bei den anderen definieren:
      `const xyzRef = collection(db,'xyz');`
- [ ] `firestore.rules`: neuen Match-Block ergänzen:
      ```
      match /xyz/{docId} {
        allow read, write: if isOwner();
      }
      ```
- [ ] Am Ende der Antwort den Nutzer erinnern: Rules müssen manuell in der
      Firebase Console eingespielt werden, sonst permission-denied!

## 2. Datenmodell

- [ ] Felder minimal halten: `text`/inhaltliche Felder + `createdAt:
      serverTimestamp()`. Bei sortierbaren Listen zusätzlich `order` (Zahl)
      nach dem Muster von moveIdea/moveProject.

## 3. UI (in index.html)

- [ ] Sektion in renderHome() einhängen (Wrapper-div wie todosWrap)
- [ ] Alle Elemente mit dem el()-Helper bauen, KEIN innerHTML
- [ ] CSS: bestehende Klassen wiederverwenden wo möglich; neue Styles nur
      mit den CSS-Variablen aus :root (--brass, --sage, --hairline, ...)
- [ ] Eyebrow-Label im Stil der anderen Sektionen (IBM Plex Mono, Uppercase)

## 4. Echtzeit-Anbindung

- [ ] `subscribeXyz(container)` nach dem Muster von subscribeTodos:
      onSnapshot + Query, Listener mit `track(...)` registrieren
- [ ] Schreiben/Ändern/Löschen mit addDoc/updateDoc/deleteDoc,
      Fehler über describeError() anzeigen

## 5. Abschluss

- [ ] Syntax-Check abwarten (läuft automatisch als Hook)
- [ ] Kurz zusammenfassen: neue Collection, geänderte Dateien,
      offene manuelle Schritte (Rules einspielen)
