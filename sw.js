/**
 * Service worker GustoPlay: быстрые повторные заходы и офлайн-доступ к последним страницам.
 *
 * Стратегии:
 *   • HTML и данные — network-first: свежесть важнее, кэш используется только если сети нет;
 *   • статика (css/js/обложки) — cache-first: файлы не меняются без смены версии;
 *   • оболочка кэшируется при установке, чтобы офлайн-режим не был пустым экраном.
 *
 * Версия кэша меняется при сборке (CACHE_VERSION подставляется build-static) —
 * старые кэши удаляются в activate.
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `pn-static-${CACHE_VERSION}`;
const PAGE_CACHE = `pn-pages-${CACHE_VERSION}`;

const PRECACHE = ['/', '/quiz', '/catalog', '/manifest.webmanifest', '/css/styles.css'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => !key.endsWith(CACHE_VERSION)).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

const isStatic = (url) => /\.(css|js|mjs|png|jpg|jpeg|svg|webp|woff2?|ico)$/i.test(url.pathname);
const isHtml = (request) => request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
const isApi = (url) => url.pathname.startsWith('/api/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // чужие домены (Google, реклама) не трогаем
  if (isApi(url)) return;                            // API всегда идёт в сеть

  // Статика: сначала кэш, потом сеть с дозаписью в кэш
  if (isStatic(url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
    return;
  }

  // Страницы: сеть, при обрыве — кэш, в крайнем случае — оболочка
  if (isHtml(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
    );
  }
});
