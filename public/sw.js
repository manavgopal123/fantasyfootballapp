// Minimal service worker — just enough for "add to home screen" installability.
// No offline caching yet; every request still goes to the network as normal.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
