const CACHE_NAME = 'chatconnect-cache-v1';

// App-shell files to pre-cache so the UI loads instantly (even offline).
// Note: this does NOT cache API/socket calls — chat data always needs
// the network. Only the UI shell is cached for speed + offline fallback.
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls or socket.io traffic — always go to network,
  // so chat messages are always fresh/live.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    return; // let the browser handle it normally
  }

  // App-shell files: cache-first, falling back to network.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          // Offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        })
      );
    })
  );
});
