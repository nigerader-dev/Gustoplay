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

/**
 * Базовый путь деплоя берём из адреса самого воркера: он лежит в <base>/sw.js.
 * При выкладке в подпапку (GitHub Pages) жёсткие '/quiz' и '/' указывали бы на
 * чужой корень — предзагрузка молча падала, а офлайн-переход отдавал пустоту
 * или главную чужого сайта.
 */
const BASE = self.location.pathname.replace(/\/sw\.js$/, '');
const withBase = (path) => `${BASE}${path}`;

const PRECACHE = ['/', '/quiz', '/catalog', '/manifest.webmanifest', '/css/styles.css'].map(withBase);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      // Кэшируем по одному файлу: раньше addAll падал целиком из-за одного
      // недоступного адреса, и офлайн-режим оставался пустым — «сайт не работает без сети».
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined))))
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
// API считаем и при выкладке в подпапку (<base>/api/...): иначе ответы сервера
// попадали в кэш страниц и профиль «не обновлялся» до полной очистки кэша.
const isApi = (url) => url.pathname === `${BASE}/api` || url.pathname.startsWith(`${BASE}/api/`);

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
        .catch(() => caches.match(request).then((cached) => cached || caches.match(withBase('/')))),
    );
  }
});
