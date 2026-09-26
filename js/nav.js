/**
 * Навигация. Работает в двух режимах:
 *   • PATH-режим (обычный веб/хостинг) — адреса вида /game/it-takes-two. По ним поисковики
 *     видят пре-рендеренные страницы, а переходы внутри сайта идут через history.pushState
 *     без перезагрузки. Требует SPA-фолбэка на сервере (в сборке есть _redirects для Cloudflare;
 *     на GitHub Pages роль фолбэка играет 404.html).
 *   • HASH-режим — адреса вида #/game/it-takes-two. Включается автоматически, если страницу
 *     открыли с диска (file://) или если хостинг не поддерживает фолбэк.
 *
 * Если сайт живёт не в корне домена (например, https://user.github.io/mydev), базовый путь
 * берётся из SITE.base (а при пустом значении — из pathname у SITE.url). Все внутренние ссылки
 * строятся через link()/base(), а currentPath() базу отрезает — роутер её не видит.
 *
 * Все внутренние переходы делаются через navigate(), чтобы приложение не зависело от режима.
 */
import { SITE } from './config.js';

export const PATH_MODE = (() => {
  try {
    return location.protocol !== 'file:' && typeof history?.pushState === 'function';
  } catch {
    return false;
  }
})();

/** Нормализация базы: '' (корень), 'mydev' и '/mydev/' → '/mydev' */
function normalizeBase(raw) {
  const b = String(raw || '').trim();
  if (!b || b === '/') return '';
  return (b.startsWith('/') ? b : `/${b}`).replace(/\/+$/, '');
}

/**
 * Базовый путь деплоя: '' — корень домена, '/mydev' — подпапка (GitHub Pages).
 * Ленивая функция: сборка меняет SITE до загрузки приложения, поэтому читаем значение на вызове.
 */
export function base() {
  const explicit = normalizeBase(SITE.base);
  if (explicit) return explicit;
  try {
    return normalizeBase(new URL(SITE.url).pathname);
  } catch {
    return '';
  }
}

/** Стиль адресов с завершающим слэшем: SITE.url заканчивается на «/» (GitHub Pages отдаёт 301 на /quiz/) */
export const trailingSlash = () => String(SITE.url || '').endsWith('/');

/** Корень сайта без завершающего слэша: https://user.github.io/mydev */
export const siteOrigin = () => String(SITE.url || '').replace(/\/+$/, '');

/**
 * Абсолютный адрес страницы для canonical/OG/sitemap.
 * publicUrl('quiz') → https://…/quiz (со слэшем, если включён стиль), publicUrl('') → https://…/
 * Query-строка и висячий слэш отбрасываются — sitemap и canonical всегда совпадают.
 */
export function publicUrl(route = '') {
  const r = String(route).split('?')[0].replace(/^\/+/, '').replace(/\/+$/, '');
  if (!r) return `${siteOrigin()}/`;
  return trailingSlash() ? `${siteOrigin()}/${r}/` : `${siteOrigin()}/${r}`;
}

/** Путь без базы и ведущего слэша; ведущие '#', '/' (и база) отрезаются */
export const clean = (path = '') => {
  let p = String(path).replace(/^#?\/?/, '');
  const b = base().slice(1); // 'mydev' или ''
  if (b) {
    if (p === b) p = '';
    else if (p.startsWith(`${b}/`)) p = p.slice(b.length + 1);
  }
  return p;
};

/** Ссылка для разметки: href="/game/x" (плюс база и слэш стиля) либо href="#/game/x" */
export const link = (path) => {
  const c = clean(path);
  if (!PATH_MODE) return `#/${c}`;
  if (!trailingSlash()) return `${base()}/${c}`;
  const [p = '', q] = c.split('?');
  const withSlash = p && !p.endsWith('/') ? `${p}/` : p;
  return q !== undefined ? `${base()}/${withSlash}?${q}` : `${base()}/${withSlash}`;
};

/** Текущий путь без базы и ведущего слэша (плюс query-строка) */
export const currentPath = () => {
  if (!PATH_MODE) return clean(location.hash);
  let pathname = location.pathname;
  const b = base();
  if (b && (pathname === b || pathname === `${b}/`)) pathname = '/';
  else if (b && pathname.startsWith(`${b}/`)) pathname = pathname.slice(b.length);
  return `${pathname.replace(/^\/+/, '')}${location.search}`;
};

/**
 * Переход по сайту (без перезагрузки).
 *
 * keepScroll — «не менять позицию прокрутки»: так работает «Показать ещё»,
 * где перерисовка страницы не должна возвращать человека в верх документа.
 */
export function navigate(path, { replace = false, keepScroll = false } = {}) {
  const target = clean(path);
  window.dispatchEvent(new CustomEvent('gf:navigate', { detail: { path: target, replace, keepScroll } }));
}

/** Внешний ли это переход (его не перехватываем) */
export const isExternal = (url = '') => /^(https?:)?\/\//.test(url) || url.startsWith('mailto:') || url.startsWith('tel:');
