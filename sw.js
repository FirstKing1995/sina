/* SINA · guarda o jogo no aparelho: abre sem internet e carrega na hora da segunda vez em diante.
   A página sempre tenta a rede primeiro (para pegar versão nova); o resto vem da memória quando já veio uma vez. */
const VERSAO = 'sina-23';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(['./', './index.html']).catch(() => {}))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || r.headers.has('range')) return; // vídeo e áudio em pedaços seguem direto
  if (r.mode === 'navigate') { e.respondWith(fetch(r).then((res) => { const c = res.clone(); caches.open(VERSAO).then((k) => k.put(r, c)); return res; }).catch(() => caches.match(r).then((m) => m || caches.match('./index.html')))); return; }
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res.ok && res.type === 'basic') { const c = res.clone(); caches.open(VERSAO).then((k) => k.put(r, c)); } return res; })));
});
