// Service worker minimo: serve solo a rendere l'app installabile. Niente cache offline (non richiesta).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
