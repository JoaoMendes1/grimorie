const CACHE_NAME = 'grimoire-shell-v1';

// Só guardamos em cache o "esqueleto" visual do app (HTML/CSS/JS/ícones).
// As chamadas de API (/api/...) NUNCA são cacheadas, pois dependem do PIN
// e de dados que mudam a todo momento.
const SHELL_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca intercepta chamadas de API: sempre vai direto na rede.
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) {
    return; 
  }

  // Para o resto (HTML/CSS/JS/ícones): cache-first, com atualização em segundo plano.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((resposta) => {
          if (resposta && resposta.status === 200) {
            const clone = resposta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return resposta;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
