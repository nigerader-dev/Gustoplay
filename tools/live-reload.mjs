/**
 * Live reload для dev-сервера: браузер сам обновляется при любой правке.
 * Без зависимостей: fs.watch + Server-Sent Events.
 *
 *   GET /__reload.js     — клиентский скрипт (виртуальный, файла нет — в прод не попадёт)
 *   GET /__reload/events — SSE-поток с событиями об изменённых файлах
 *
 * Поведение в браузере:
 *   • изменился только CSS — стили подменяются на лету, без перезагрузки;
 *   • всё остальное (js/html/манифест/sw) — полная перезагрузка;
 *   • перед перезагрузкой снимаются service worker'ы: sw.js кеширует статику
 *     в cache-first, и без этого правки js/css прятались бы за кешем;
 *   • если сервер перезапустили — страница обновится сама при переподключении.
 *
 * Серверная часть следит за index.html, sw.js, manifest.webmanifest и деревьями
 * css/ и js/. Рекурсия — вручную по подпапкам: штатный recursive у fs.watch
 * на Linux не работает. dist/, node_modules и точка-файлы игнорируются.
 */
import { watch, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SNIPPET = '<script src="/__reload.js" defer></script>';
const ROOT_FILES = new Set(['index.html', 'sw.js', 'manifest.webmanifest']);
const DEEP_DIRS = ['css', 'js'];

/** Вставляет скрипт live reload в html перед </body> (идемпотентно). */
export function injectReload(html) {
  if (html.includes('__reload.js')) return html;
  if (/<\/body\s*>/i.test(html)) return html.replace(/<\/body\s*>/i, `${SNIPPET}$&`);
  return `${html}${SNIPPET}`;
}

const norm = (p) => p.split(sep).join('/');

export function createReloader({ root, debounceMs = 120, onChange = null } = {}) {
  const clients = new Set();
  const watchers = new Map(); // dir -> FSWatcher
  const pending = new Set();
  let timer = null;
  let keepalive = null;

  const interesting = (rel) => {
    if (!rel || rel.startsWith('.')) return false;
    if (ROOT_FILES.has(rel)) return true;
    return DEEP_DIRS.some((d) => rel === d || rel.startsWith(`${d}/`));
  };

  function broadcast() {
    const changed = [...pending];
    pending.clear();
    if (!changed.length) return;
    const line = `data: ${JSON.stringify({ changed })}\n\n`;
    for (const res of clients) res.write(line);
    onChange?.(changed);
  }

  function fire(abs) {
    const rel = norm(relative(root, abs));
    if (!interesting(rel)) return;
    pending.add(rel);
    clearTimeout(timer);
    timer = setTimeout(broadcast, debounceMs);
  }

  function watchDir(dir, deep) {
    if (watchers.has(dir)) return;
    let watcher;
    try {
      watcher = watch(dir, { persistent: true }, (event, filename) => {
        fire(filename ? join(dir, filename.toString()) : dir);
        // rename = файл/папка созданы или удалены: подхватываем новые подпапки
        if (event === 'rename') setTimeout(() => ensureTargets(), 60);
      });
    } catch {
      return; // нет прав или папки — молча пропускаем
    }
    watcher.on('error', () => {});
    watchers.set(dir, watcher);
    if (deep) {
      let entries = [];
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        watchDir(join(dir, entry.name), true);
      }
    }
  }

  function ensureTargets() {
    if (!existsSync(root)) return;
    watchDir(root, false); // index.html, sw.js, manifest — без рекурсии
    for (const d of DEEP_DIRS) {
      const dir = join(root, d);
      if (existsSync(dir)) watchDir(dir, true);
    }
  }

  ensureTargets();

  function handle(req, res) {
    const pathname = new URL(req.url, 'http://x').pathname;
    if (pathname === '/__reload.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(CLIENT_JS);
      return true;
    }
    if (pathname === '/__reload/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // не буферизовать за nginx-подобными прокси
      });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      if (!keepalive) keepalive = setInterval(() => {
        for (const client of clients) client.write(': ping\n\n');
      }, 20000);
      return true;
    }
    return false;
  }

  function close() {
    clearTimeout(timer);
    clearInterval(keepalive);
    for (const watcher of watchers.values()) watcher.close();
    watchers.clear();
    for (const res of clients) {
      try {
        res.end();
      } catch { /* ignore */ }
    }
    clients.clear();
  }

  return { handle, close, get clients() { return clients.size; } };
}

/* ------------------------------------------------------------------ *
 * Клиент: выполняется в браузере. Только dev — в прод-сборку не попадает.
 * ------------------------------------------------------------------ */
const CLIENT_JS = `(() => {
  'use strict';
  if (window.__gustoReload) return;
  window.__gustoReload = true;

  const showToast = (text) => {
    const el = document.createElement('div');
    el.textContent = text;
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;padding:8px 14px;'
      + 'border-radius:10px;background:#16181d;color:#fff;font:13px/1.4 system-ui,sans-serif;'
      + 'box-shadow:0 6px 24px rgba(0,0,0,.35);opacity:0;transition:opacity .25s;pointer-events:none';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 1600);
  };

  // CSS — без перезагрузки: дёргаем version у локальных <link>, кеш SW не совпадёт
  const hotSwapCss = () => {
    const v = Date.now();
    let n = 0;
    for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
      const href = link.getAttribute('href');
      if (!href || /^https?:\\/\\//i.test(href) && !href.startsWith(location.origin)) continue;
      const url = new URL(href, location.href);
      url.searchParams.set('v', String(v));
      const fresh = link.cloneNode();
      fresh.href = url.toString();
      fresh.onload = () => link.remove();
      link.after(fresh);
      n += 1;
    }
    return n;
  };

  // Полная перезагрузка: сначала снимаем SW, иначе cache-first отдаст старые файлы
  const hardReload = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister().catch(() => {}))))
        .then(() => location.reload())
        .catch(() => location.reload());
    } else {
      location.reload();
    }
  };

  let down = false;
  const src = new EventSource('/__reload/events');
  src.onopen = () => {
    if (down) location.reload(); // сервер перезапускали — подтягиваем свежее
    down = false;
  };
  src.onerror = () => { down = true; }; // EventSource переподключится сам
  src.onmessage = (event) => {
    let changed = [];
    try {
      changed = JSON.parse(event.data).changed || [];
    } catch { /* ignore */ }
    if (changed.length && changed.every((f) => f.endsWith('.css'))) {
      if (hotSwapCss()) {
        showToast('Стили обновлены');
        return;
      }
    }
    hardReload();
  };
})();
`;
