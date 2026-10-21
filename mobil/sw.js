/* Enerji Akış telefon – çevrimdışı önbellek. Sürüm 1.0.26 (40fb4869be); yeni sürüm yayınlanınca önbellek yenilenir. */
const ON = 'enerji-mobil-1.0.26-40fb4869be', DOS = ["./", "index.html", "panel.js", "pipeline.js", "mobil.js", "worker.js", "sql-wasm.js", "sql-wasm.wasm", "res/tr_svg.json", "res/ilce_koordinat.csv", "res/terminal_depo_koordinat.csv", "icon-192.png", "icon-512.png", "icon-180.png", "manifest.webmanifest"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(ON).then((c) => c.addAll(DOS.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== ON).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// Önce ağ (güncel sürüm), ağ yoksa önbellek
self.addEventListener('fetch', (e) => { if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && new URL(e.request.url).origin === location.origin) { const k = r.clone(); caches.open(ON).then((c) => c.put(e.request, k)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || caches.match('index.html')))); });
