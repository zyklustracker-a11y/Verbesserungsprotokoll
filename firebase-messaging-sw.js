/* ═══════════════════════════════════════════════════════════════════
   Service Worker · tägliche To-do-Erinnerung

   Diese Datei MUSS getrennt von index.html liegen – der Browser lädt
   einen Service Worker grundsätzlich als eigene Datei. Die App selbst
   bleibt unverändert komplett in index.html; hier steht nur, was beim
   Eintreffen einer Benachrichtigung passieren soll.

   Der Versand kommt vom GitHub-Actions-Workflow „To-do-Erinnerung“
   (.github/workflows/todo-erinnerung.yml). Verschickt werden bewusst
   reine Daten-Nachrichten, damit unten genau eine Benachrichtigung
   entsteht – bei einer notification-Nachricht würde der Browser
   zusätzlich eine eigene anzeigen.

   Die Firebase-Konfiguration steht hier ein zweites Mal, weil ein
   Service Worker nichts aus index.html lesen kann. Wird sie dort
   geändert, muss sie hier mitgeändert werden.
   ═══════════════════════════════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBIq5Hq459a4RjJNgwVB0tyfP6I3_xW3tc",
  authDomain: "verbesserungsprotokoll.firebaseapp.com",
  projectId: "verbesserungsprotokoll",
  storageBucket: "verbesserungsprotokoll.firebasestorage.app",
  messagingSenderId: "739113569685",
  appId: "1:739113569685:web:8e16278286d6f4f7cafa9c"
});

const messaging = firebase.messaging();

// Standardziel, falls der Versand keines mitschickt.
const ZIEL = './#/todos';

messaging.onBackgroundMessage((payload) => {
  const d = (payload && payload.data) || {};
  // tag sorgt dafür, dass eine neue Erinnerung die alte ersetzt statt
  // sich zu stapeln, wenn die App ein paar Tage nicht geöffnet wurde.
  self.registration.showNotification(d.title || 'Verbesserungsprotokoll', {
    body: d.body || 'Schau in deine offenen To-dos.',
    // Relativ zum Geltungsbereich des Workers – funktioniert unter
    // github.io/Verbesserungsprotokoll/ genauso wie unter eigener Domain.
    icon: './icon-192.png',
    tag: 'todo-erinnerung',
    renotify: true,
    data: { url: d.url || ZIEL }
  });
});

// Antippen öffnet die App. Läuft sie schon irgendwo, wird dieses Fenster
// nach vorn geholt, statt ein zweites zu öffnen.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || ZIEL;
  event.waitUntil((async () => {
    const fenster = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of fenster) {
      if ('focus' in c) {
        await c.focus();
        if ('navigate' in c) { try { await c.navigate(url); } catch (e) {} }
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
