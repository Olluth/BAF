'use strict';
/*
 * Service worker for the installable app (PWA), registered by js/pwa.js.
 * Network first for everything on this site: when online you always get the latest
 * deploy (no stale CSS/JS), and each successful response is kept as an offline copy.
 * Offline, pages and files come from that copy, or offline.html for unvisited pages.
 * /api/* is never cached: live standings must never be served stale.
 * Bump CACHE when the precached shell files change.
 */
const CACHE = 'baf-v1';
const SHELL = [
  '/offline.html',
  '/css/main.css',
  '/images/baf_logo.png',
  '/images/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

// Drop caches from older versions, then take control of open pages right away.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Leave other sites (fonts, Supabase, fabtcg), non-GET requests and the API alone.
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith((async () => {
    try {
      // no-cache: revalidate with the server so a new deploy shows up without Ctrl+Shift+R
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    } catch {
      const cached = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (cached) return cached;
      if (req.mode === 'navigate') return caches.match('/offline.html');
      return Response.error();
    }
  })());
});
