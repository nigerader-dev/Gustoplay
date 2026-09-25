/**
 * Точка входа: роутер, оболочка (шапка/подвал), согласие на cookie, реклама, темы и языки.
 * Отдельного фреймворка нет специально: сайт должен открываться моментально и без сборки —
 * это важно и для Core Web Vitals (влияет на SEO и доход с рекламы).
 */
import { setLang, getLang, t, tl } from './i18n.js';
import { PATH_MODE, link, currentPath, navigate, isExternal, siteOrigin, publicUrl } from './nav.js';
import { GENRES, TAGS, MODES, MOODS, PLATFORMS } from './taxonomy.js';
import { ADS, SITE } from './config.js';
import { getProfile, setMeta, markGame, resetAdCounter, setConsent, getConsent, resetProfile, setSyncEnabled } from './store.js';
import { initAnalytics, track, trackPageview } from './analytics.js';

import { byId } from './catalog/index.js';

import * as home from './views/home.js';
import * as quiz from './views/quiz.js';
import * as results from './views/results.js';
import * as catalog from './views/catalog.js';
import * as gameView from './views/game.js';
import * as party from './views/party.js';
import * as profileView from './views/profile.js';
import * as about from './views/about.js';
import * as account from './views/account.js';
import * as terms from './views/terms.js';
import { isLoggedIn, getUser, clearSession } from './api.js';

/* ------------------------------------------------------------------ *
 * Маршруты
 * ------------------------------------------------------------------ */

const ROUTES = [
  { path: [], view: home, name: 'home' },
  { path: ['quiz'], view: quiz, name: 'quiz' },
  { path: ['results'], view: results, name: 'results' },
  { path: ['catalog'], view: catalog, name: 'catalog' },
  { path: ['mode', ':id'], view: catalog, name: 'mode', preset: (p) => ({ modes: [p.id], heading: `${MODES[p.id]?.icon || ''} ${tl(MODES, p.id)}` }) },
  { path: ['genre', ':id'], view: catalog, name: 'genre', preset: (p) => ({ genres: [p.id], heading: `${GENRES[p.id]?.icon || ''} ${tl(GENRES, p.id)}` }) },
  { path: ['tag', ':id'], view: catalog, name: 'tag', preset: (p) => ({ tags: [p.id], heading: tl(TAGS, p.id) }) },
  { path: ['mood', ':id'], view: catalog, name: 'mood', preset: (p) => ({ moods: [p.id], heading: `${MOODS[p.id]?.icon || ''} ${tl(MOODS, p.id)}` }) },
  { path: ['platform', ':id'], view: catalog, name: 'platform', preset: (p) => ({ platforms: [p.id], heading: `${PLATFORMS[p.id]?.icon || ''} ${tl(PLATFORMS, p.id)}` }) },
  { path: ['game', ':slug'], view: gameView, name: 'game' },
  { path: ['party'], view: party, name: 'party' },
  { path: ['profile'], view: profileView, name: 'profile' },
  { path: ['account'], view: account, name: 'account' },
  { path: ['terms'], view: terms, name: 'terms' },
  { path: ['about'], view: about, name: 'about' },
  { path: ['privacy'], view: about, name: 'privacy' },
];

function parseLocation() {
  const raw = currentPath();
  const [pathPart, queryPart = ''] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  for (const route of ROUTES) {
    if (route.path.length !== segments.length) continue;
    const params = {};
    let ok = true;
    route.path.forEach((part, i) => {
      if (part.startsWith(':')) params[part.slice(1)] = segments[i];
      else if (part !== segments[i]) ok = false;
    });
    if (!ok) continue;
    // валидация id из справочников, чтобы не рендерить пустые разделы
    if (route.name === 'mode' && !MODES[params.id]) return { notFound: true };
    if (route.name === 'genre' && !GENRES[params.id]) return { notFound: true };
    if (route.name === 'tag' && !TAGS[params.id]) return { notFound: true };
    if (route.name === 'mood' && !MOODS[params.id]) return { notFound: true };
    if (route.name === 'platform' && !PLATFORMS[params.id]) return { notFound: true };
    if (route.name === 'game' && !byId(params.slug)) return { notFound: true };
    return { route, params, query, preset: route.preset ? route.preset(params) : null, name: route.name, path: segments.join('/') };
  }
  return { notFound: true };
}

/* ------------------------------------------------------------------ *
 * Оболочка
 * ------------------------------------------------------------------ */

const app = document.getElementById('app');
let currentCtx = null;
let lastRouteName = null;

function navItem(href, label, name, ctx, extraClass = '') {
  const active = ctx?.name === name ? ' active' : '';
  return `<a class="nav-link${active}${extraClass}" href="${href}" data-action="nav">${label}</a>`;
}

function header(ctx) {
  const lang = getLang();
  return `
  <a class="skip" href="#main">${lang === 'ru' ? 'К основному содержимому' : 'Skip to content'}</a>
  <header class="header">
    <div class="header-inner">
      <a class="logo" href="#/" data-action="nav" aria-label="${t('site.name')}">
        <span class="logo-mark">🎮</span>
        <span class="logo-text">${t('site.name')}<small>${t('site.tagline')}</small></span>
      </a>
      <nav class="nav" aria-label="main">
        ${navItem('#/quiz', '🎯 ' + t('nav.quiz'), 'quiz', ctx)}
        ${navItem('#/catalog', '🗂️ ' + t('nav.catalog'), 'catalog', ctx)}
        ${navItem('#/party', '👫 ' + t('nav.party'), 'party', ctx)}
        ${navItem('#/profile', '⭐ ' + t('nav.profile'), 'profile', ctx)}
        ${navItem('#/account', (isLoggedIn() ? '👤 ' : '🔐 ') + t('nav.account'), 'account', ctx)}
        ${navItem('#/about', t('nav.about'), 'about', ctx, ' nav-link-soft')}
      </nav>
      <div class="header-tools">
        <button type="button" class="icon-btn" data-action="lang-toggle" title="${t('common.lang')}">${lang.toUpperCase()}</button>
        <button type="button" class="icon-btn" data-action="theme-toggle" title="${t('common.theme')}">🌗</button>
      </div>
    </div>
  </header>`;
}

function footer() {
  const lang = getLang();
  const topTags = ['coopfocused', 'splitscreen', 'storyrich', 'openworld', 'difficult', 'cozy', 'steamdeck', 'gacha'];
  return `
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-col">
        <div class="logo">
          <span class="logo-mark">🎮</span><span class="logo-text">${t('site.name')}</span>
        </div>
        <p class="muted">${t('common.footer.note')}</p>
      </div>
      <div class="footer-col">
        <h4>${t('common.footer.links')}</h4>
        <a href="#/quiz" data-action="nav">${t('nav.quiz')}</a>
        <a href="#/catalog" data-action="nav">${t('nav.catalog')}</a>
        <a href="#/party" data-action="nav">${t('nav.party')}</a>
        <a href="#/profile" data-action="nav">${t('nav.profile')}</a>
        <a href="#/about" data-action="nav">${t('nav.about')}</a>
      </div>
      <div class="footer-col">
        <h4>${lang === 'ru' ? 'Жанры' : 'Genres'}</h4>
        ${Object.keys(GENRES).slice(0, 8).map((id) => `<a href="#/genre/${id}" data-action="nav">${tl(GENRES, id)}</a>`).join('')}
      </div>
      <div class="footer-col">
        <h4>${lang === 'ru' ? 'Подборки' : 'Collections'}</h4>
        ${topTags.map((id) => `<a href="#/tag/${id}" data-action="nav">${tl(TAGS, id)}</a>`).join('')}
        <a href="#/privacy" data-action="nav">${t('about.privacy.title')}</a>
        <a href="#/terms" data-action="nav">${t('common.footer.terms')}</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} ${t('site.name')}</span>
      <span>${SITE.email}</span>
    </div>
  </footer>`;
}

function consentBanner() {
  if (!ADS.consentRequired || getConsent()) return '';
  return `
  <div class="consent" id="consent">
    <div>
      <strong>🍪 ${t('about.ads.title')}</strong>
      <p>${t('consent.text')}</p>
    </div>
    <div class="consent-actions">
      <button type="button" class="btn btn-primary" data-action="consent-accept">${t('consent.accept')}</button>
      <button type="button" class="btn btn-ghost" data-action="consent-decline">${t('consent.decline')}</button>
      <a class="btn btn-ghost" href="#/privacy" data-action="nav">${t('consent.policy')}</a>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ *
 * Рендер страницы
 * ------------------------------------------------------------------ */

function setHead(titleText, description) {
  document.title = titleText;
  const metaDesc = document.head.querySelector('meta[name="description"]') || document.createElement('meta');
  metaDesc.setAttribute('name', 'description');
  metaDesc.setAttribute('content', description || '');
  if (!metaDesc.parentNode) document.head.append(metaDesc);

  // canonical без query-строки и висячего слэша — иначе он разойдётся с sitemap
  const pageUrl = publicUrl(currentPath());
  const canonical = document.head.querySelector('link[rel="canonical"]') || document.createElement('link');
  canonical.setAttribute('rel', 'canonical');
  canonical.setAttribute('href', pageUrl);
  if (!canonical.parentNode) document.head.append(canonical);

  const og = [['og:title', titleText], ['og:description', description || ''], ['og:type', 'website'], ['og:url', pageUrl]];
  for (const [prop, value] of og) {
    let node = document.head.querySelector(`meta[property="${prop}"]`);
    if (!node) { node = document.createElement('meta'); node.setAttribute('property', prop); document.head.append(node); }
    node.setAttribute('content', value);
  }
}

function render(scroll = true) {
  const parsed = parseLocation();
  const ctx = parsed.notFound ? { name: 'notfound', params: {}, query: {} } : parsed;
  currentCtx = ctx;
  resetAdCounter();

  const view = ctx.route?.view;
  let html = '';
  let titleText = t('site.name');
  let description = t('site.description');

  if (!view) {
    html = `<section class="section"><div class="empty"><div class="empty-icon">🧭</div>
      <h3>${t('common.notFound')}</h3><p>${t('common.notFound.text')}</p>
      <div class="panel-actions"><a class="btn btn-primary" href="#/quiz" data-action="nav">${t('home.cta.start')}</a>
      <a class="btn btn-ghost" href="#/catalog" data-action="nav">${t('nav.catalog')}</a></div></div></section>`;
  } else {
    // при новом входе на страницу сбрасываем «показать ещё», чтобы не терять контекст
    if (view.reset && lastRouteName !== ctx.name) view.reset();
    if (ctx.name === 'quiz' && lastRouteName !== 'quiz') track('quiz_start');
    html = view.render(ctx);
    titleText = view.title?.(ctx) || titleText;
    description = view.description?.(ctx) || description;
  }

  // В PATH-режиме превращаем внутренние ссылки #/x в настоящие /base/x — это важно и для SEO,
  // и для того, чтобы «поделиться ссылкой» давало нормальный адрес. Заменяем весь собранный
  // документ (шапка/подвал/плашка тоже): раньше ссылки шапки оставались hash-ссылками
  // и в PATH-режиме не работали вовсе.
  const page = `${header(ctx)}<main id="main" class="main">${html}</main>${footer()}${consentBanner()}`;
  app.innerHTML = PATH_MODE ? page.replace(/href="#\/([^"]*)"/g, (_, rest) => `href="${link(rest)}"`) : page;
  setHead(titleText, description);
  trackPageview(PATH_MODE ? link(parsed.path || '') : `/${parsed.path || ''}`, titleText);
  injectJsonLd(ctx, view);
  view?.mount?.(app);
  ensureAdScripts();
  lastRouteName = ctx.name;
  if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
}

function injectJsonLd(ctx, view) {
  document.head.querySelectorAll('script[data-gf-jsonld]').forEach((n) => n.remove());
  const data = view?.jsonLd?.(ctx) || {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: PATH_MODE ? `${publicUrl('catalog')}?q={search_term_string}` : `${siteOrigin()}/#/catalog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
  const node = document.createElement('script');
  node.type = 'application/ld+json';
  node.dataset.gfJsonld = '1';
  node.textContent = JSON.stringify(data);
  document.head.append(node);
}

/* ------------------------------------------------------------------ *
 * Реклама: подключаем скрипты сетей только когда это разрешено
 * ------------------------------------------------------------------ */

let adScriptsLoaded = false;

function ensureAdScripts() {
  if (adScriptsLoaded || ADS.mode === 'mock') return;
  if (ADS.consentRequired && getConsent() !== 'all') return;
  adScriptsLoaded = true;

  if (ADS.mode === 'rsya' || ADS.mode === 'both') {
    const s = document.createElement('script');
    s.src = 'https://yandex.ru/ads/system/context.js';
    s.async = true;
    document.head.append(s);
  }
  if (ADS.mode === 'adsense' || ADS.mode === 'both') {
    const s = document.createElement('script');
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS.adsense.client}`;
    s.async = true;
    s.crossOrigin = 'anonymous';
    document.head.append(s);
  }

  // Инициализация блоков после загрузки скриптов
  setTimeout(() => {
    document.querySelectorAll('[data-rsya]').forEach((node) => {
      const blockId = node.dataset.rsya;
      if (window.Ya?.Context?.AdvManager) {
        try { window.Ya.Context.AdvManager.render({ blockId, renderTo: node.id, async: true }); } catch { /* блок уже отрисован */ }
      }
    });
    document.querySelectorAll('ins.adsbygoogle').forEach(() => {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* ignore */ }
    });
  }, 400);
}

/* ------------------------------------------------------------------ *
 * Плашка «пересчитать подбор» — появляется, когда пользователь отметил игру
 * ------------------------------------------------------------------ */

let refreshPill = null;

window.addEventListener('gf:marks-changed', () => {
  if (currentCtx?.name !== 'results') return;
  if (refreshPill) return;
  const node = document.createElement('button');
  node.type = 'button';
  node.className = 'refresh-pill';
  node.innerHTML = `🔄 ${t('results.recount')}`;
  node.addEventListener('click', () => {
    node.remove();
    refreshPill = null;
    render(false);
  });
  document.body.append(node);
  refreshPill = node;
  setTimeout(() => { if (refreshPill === node) { node.remove(); refreshPill = null; } }, 12000);
});

/* ------------------------------------------------------------------ *
 * Глобальные действия (делегирование событий)
 * ------------------------------------------------------------------ */

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  switch (action) {
    case 'mark': {
      event.preventDefault();
      const { slug, status } = target.dataset;
      markGame(slug, status);
      // обновляем кнопки на месте, чтобы не терять позицию скролла
      const wrap = target.closest('.marks');
      wrap?.querySelectorAll('.mark').forEach((b) => {
        const on = b.dataset.status === status && !b.classList.contains('on');
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      track(`mark_${status}`, { slug });
      window.dispatchEvent(new CustomEvent('gf:marks-changed', { detail: { slug, status } }));
      break;
    }
    case 'show-more': {
      event.preventDefault();
      const more = Number(target.dataset.more) || 12;
      if (currentCtx?.name === 'results') {
        results.showMore(more);
        render(false);
      } else {
        catalog.updateQuery({ page: (Number(currentCtx?.query?.page) || 12) + more });
      }
      break;
    }
    case 'reshuffle': {
      const p = getProfile();
      setMeta({ seed: (p.meta?.seed || 1) + 1 });
      render(false);
      break;
    }
    case 'reset-all': {
      if (!confirm(t('profile.reset.confirm'))) return;
      resetProfile();
      navigate('quiz');
      break;
    }
    case 'theme-toggle': {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      setMeta({ theme: next });
      break;
    }
    case 'lang-toggle': {
      const next = getLang() === 'ru' ? 'en' : 'ru';
      setLang(next);
      setMeta({ lang: next });
      render(false);
      break;
    }
    case 'consent-accept': {
      setConsent('all');
      initAnalytics({ consent: 'all' });
      adScriptsLoaded = false;
      render(false);
      break;
    }
    case 'consent-decline': {
      setConsent('necessary');
      document.getElementById('consent')?.remove();
      break;
    }
    /* --- фильтры каталога --- */
    case 'f-mode': case 'f-platform': case 'f-genre': case 'f-tag': case 'f-mood':
    case 'f-players': case 'f-price': case 'f-time': case 'f-cooplocal': {
      const kind = action.replace('f-', '');
      const filters = catalog.parseFilters(currentCtx.query, currentCtx.preset || {});
      catalog.toggleFilter(kind, target.dataset.id, filters);
      break;
    }
    case 'f-remove': {
      const filters = catalog.parseFilters(currentCtx.query, currentCtx.preset || {});
      catalog.removeFilter(target.dataset.kind, target.dataset.id, filters);
      break;
    }
    case 'f-reset': {
      navigate(currentCtx.name === 'catalog' ? 'catalog' : currentCtx.path);
      break;
    }
    /* --- компания --- */
    case 'p-players': {
      party.updateParty({ players: target.dataset.id });
      break;
    }
    case 'p-platform': {
      const current = (currentCtx.query.platforms ? String(currentCtx.query.platforms).split(',') : []).filter(Boolean);
      const id = target.dataset.id;
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      party.updateParty({ platforms: next });
      break;
    }
    case 'p-free': {
      party.updateParty({ free: currentCtx.query.free === '1' ? '' : '1' });
      break;
    }
    case 'nav': {
      // обычная навигация по hash-ссылке — просто даём браузеру обработать
      break;
    }
    default: break;
  }
});

// Ctrl/Cmd+K — быстрый переход в поиск каталога
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    navigate('catalog');
    setTimeout(() => document.getElementById('catalog-q')?.focus(), 160);
  }
});

window.addEventListener('hashchange', () => render(true));
window.addEventListener('gf:track', (event) => track(event.detail?.name, event.detail?.params || {}));
window.addEventListener('gf:auth-changed', () => render(false));
window.addEventListener('popstate', () => render(true));
window.addEventListener('gf:rerender', () => render(false));

/** Программный переход, используется квизом, фильтрами и кнопками */
window.addEventListener('gf:navigate', (event) => {
  const { path, replace } = event.detail || {};
  if (!path && path !== '') return;
  if (PATH_MODE) {
    // link() уже включает базовый путь и слэш стиля (важно для GitHub Pages)
    const url = link(path);
    if (replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
    render(true);
  } else if (location.hash !== link(path)) {
    location.hash = link(path);
  } else {
    render(true);
  }
});

/** Клики по внутренним ссылкам обрабатываем сами — без полной перезагрузки страницы */
document.addEventListener('click', (event) => {
  const anchor = event.target.closest('a[href]');
  if (!anchor || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || anchor.target) return;
  const href = anchor.getAttribute('href');
  if (!href || isExternal(href) || href.startsWith('#')) return;
  if (!href.startsWith('/')) return;
  event.preventDefault();
  navigate(href);
});

/* ------------------------------------------------------------------ *
 * Старт
 * ------------------------------------------------------------------ */

(function init() {
  const profile = getProfile();
  const lang = profile.meta?.lang || SITE.defaultLang || 'ru';
  setLang(lang);
  document.documentElement.dataset.theme = profile.meta?.theme || 'light';
  document.documentElement.lang = lang;

  // аналитика: Plausible — сразу, Метрика — только после согласия на cookie
  initAnalytics({ consent: getConsent() });

  render(true);

  // Если сохранён токен — тихо проверяем сессию и подтягиваем актуальный профиль
  if (isLoggedIn()) {
    import('./api.js').then(async ({ me, pullProfile }) => {
      try {
        await me();
        const remote = await pullProfile();
        if (remote) {
          const { replaceProfile } = await import('./store.js');
          replaceProfile(remote);
          window.dispatchEvent(new CustomEvent('gf:rerender'));
        }
      } catch {
        // токен мог устареть: работаем локально, без ошибок в интерфейсе
        clearSession();
      }
    });
  } else {
    setSyncEnabled(true);
  }

  registerServiceWorker();
})();

/**
 * Service worker включаем только на боевом домене: в разработке и в предпросмотре
 * кэш мешает видеть свежие правки.
 */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (globalThis.location?.protocol !== 'https:') return;
  const host = globalThis.location?.hostname || '';
  if (!host.endsWith(SITE.domain)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => { /* офлайн — необязательная роскошь */ });
}
