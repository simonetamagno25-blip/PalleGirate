// Service worker minimo: serve solo a rendere l'app installabile.
// Non mette nulla in cache (l'uso offline non è richiesto): ogni richiesta passa alla rete.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Nessun respondWith: il browser gestisce la richiesta normalmente.
})
