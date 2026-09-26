/**
 * Точка входа: роутер, оболочка (шапка/подвал), согласие на cookie, реклама, темы и языки.
 * Отдельного фреймворка нет специально: сайт должен открываться моментально и без сборки —
 * это важно и для Core Web Vitals (влияет на SEO и доход с рекламы).
 */
import { setLang, getLang, t, tl } from './i18n.js';
import { icon } from './icons.js';
import { PATH_MODE, link, currentPath, navigate, isExternal, siteOrigin, publicUrl, base } from './nav.js';
import { GENRES, TAGS, MODES, MOODS, PLATFORMS } from './taxonomy.js';
import { ADS, SITE, FEATURES } from './config.js';
import { getProfile, setMeta, markGame, resetAdCounter, setConsent, getConsent, resetProfile, setSyncEnabled, isStorageBroken, getSyncError, isMarksCapped, marksLimit } from './store.js';
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
  { path: ['mode', ':id'], view: catalog, name: 'mode', preset: (p) => ({ modes: [p.id], heading: tl(MODES, p.id), icon: MODES[p.id]?.icon }) },
  { path: ['genre', ':id'], view: catalog, name: 'genre', preset: (p) => ({ genres: [p.id], heading: tl(GENRES, p.id), icon: GENRES[p.id]?.icon }) },
  { path: ['tag', ':id'], view: catalog, name: 'tag', preset: (p) => ({ tags: [p.id], heading: tl(TAGS, p.id) }) },
  { path: ['mood', ':id'], view: catalog, name: 'mood', preset: (p) => ({ moods: [p.id], heading: tl(MOODS, p.id), icon: MOODS[p.id]?.icon }) },
  { path: ['platform', ':id'], view: catalog, name: 'platform', preset: (p) => ({ platforms: [p.id], heading: tl(PLATFORMS, p.id), icon: PLATFORMS[p.id]?.icon }) },
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
        <span class="logo-mark">${icon('controller')}</span>
        <span class="logo-text">${t('site.name')}<small>${t('site.tagline')}</small></span>
      </a>
      <nav class="nav" id="main-nav" aria-label="main">
        <button type="button" class="nav-close" data-action="menu-close" aria-label="${t('common.close')}">${icon('x')}</button>
        ${navItem('#/quiz', icon('compass') + ' ' + t('nav.quiz'), 'quiz', ctx)}
        ${navItem('#/catalog', icon('grid') + ' ' + t('nav.catalog'), 'catalog', ctx)}
        ${navItem('#/party', icon('users') + ' ' + t('nav.party'), 'party', ctx)}
        ${navItem('#/profile', icon('heart') + ' ' + t('nav.profile'), 'profile', ctx)}
        ${navItem('#/account', (isLoggedIn() ? icon('user') : icon('lock')) + ' ' + t('nav.account'), 'account', ctx)}
        ${navItem('#/about', t('nav.about'), 'about', ctx, ' nav-link-soft')}
      </nav>
      <div class="header-tools">
        <button type="button" class="icon-btn" data-action="lang-toggle" title="${t('common.lang')}">${lang.toUpperCase()}</button>
        <button type="button" class="icon-btn" data-action="theme-toggle" title="${t('common.theme')}">${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}</button>
        <button type="button" class="icon-btn burger" data-action="menu-toggle" aria-expanded="false" aria-controls="main-nav" aria-label="${t('common.menu')}"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>
  <button type="button" class="nav-overlay" data-action="menu-close" aria-label="${t('common.close')}" tabindex="-1"></button>`;
}

function footer() {
  const lang = getLang();
  const topTags = ['coopfocused', 'splitscreen', 'storyrich', 'openworld', 'difficult', 'cozy', 'steamdeck', 'gacha'];
  return `
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-col">
        <div class="logo">
          <span class="logo-mark">${icon('controller')}</span><span class="logo-text">${t('site.name')}</span>
        </div>
        <p class="muted">${t('common.footer.note')}</p>
      </div>
      <div class="footer-col">
        <h2 class="footer-head">${t('common.footer.links')}</h2>
        <a href="#/quiz" data-action="nav">${t('nav.quiz')}</a>
        <a href="#/catalog" data-action="nav">${t('nav.catalog')}</a>
        <a href="#/party" data-action="nav">${t('nav.party')}</a>
        <a href="#/profile" data-action="nav">${t('nav.profile')}</a>
        <a href="#/about" data-action="nav">${t('nav.about')}</a>
      </div>
      <div class="footer-col">
        <h2 class="footer-head">${lang === 'ru' ? 'Жанры' : 'Genres'}</h2>
        ${Object.keys(GENRES).slice(0, 8).map((id) => `<a href="#/genre/${id}" data-action="nav">${tl(GENRES, id)}</a>`).join('')}
      </div>
      <div class="footer-col">
        <h2 class="footer-head">${lang === 'ru' ? 'Подборки' : 'Collections'}</h2>
        ${topTags.map((id) => `<a href="#/tag/${id}" data-action="nav">${tl(TAGS, id)}</a>`).join('')}
        <a href="#/privacy" data-action="nav">${t('about.privacy.title')}</a>
        <a href="#/terms" data-action="nav">${t('common.footer.terms')}</a>
        ${ADS.consentRequired ? `<button type="button" class="footer-link" data-action="consent-open">${t('consent.change')}</button>` : ''}
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} ${t('site.name')}</span>
      <a class="footer-mail" href="mailto:${SITE.email}">${icon('mail')} ${t('common.support')}: ${SITE.email}</a>
    </div>
  </footer>`;
}

let consentReopen = false;

/**
 * Предупреждение: браузер не сохраняет данные (приватный режим, переполнено хранилище).
 * Без него человек ставил отметки, перезагружал страницу и не понимал, почему всё пусто.
 */
function storageWarning() {
  const lines = [];
  if (isStorageBroken()) lines.push(t('storage.warning'));
  if (isMarksCapped()) lines.push(`${t('marks.limit')} ${marksLimit()}`);
  const syncErr = getSyncError();
  if (syncErr) lines.push(`${t('sync.warning')} ${syncErr}`);
  if (!lines.length) return '';
  return lines.map((line) => `
  <div class="notice notice-warn" role="status">
    <span>${icon('alert')} ${esc(line)}</span>
  </div>`).join('');
}

function consentBanner() {
  if (!ADS.consentRequired) return '';
  if (getConsent() && !consentReopen) return '';
  return `
  <div class="consent" id="consent">
    <div>
      <strong>${icon('cookie')} ${t('about.ads.title')}</strong>
      <p>${t('consent.text')}</p>
    </div>
    <div class="consent-actions">
      <button type="button" class="btn btn-primary" data-action="consent-accept">${t('consent.accept')}</button>
      <button type="button" class="btn btn-ghost" data-action="consent-decline">${t('consent.decline')}</button>
      <a class="btn btn-ghost" href="#/privacy" data-action="nav">${t('consent.policy')}</a>
    </div>
  </div>`;
}

/**
 * Ступенчатый откат обложек. Событие error не всплывает, поэтому слушаем на фазе
 * перехвата: 1) арт магазина → 2) сгенерированная обложка. При включённом
 * FEATURES.realCovers первой ступенью идёт локальный файл владельца.
 * Одна битая ссылка больше не оставляет пустую рамку вместо картинки.
 */
document.addEventListener('error', (event) => {
  const img = event.target;
  if (!img || img.tagName !== 'IMG') return;
  const step = img.dataset.fbStep || '0';
  if (step === '0' && img.dataset.fallback) {
    img.dataset.fbStep = '1';
    img.src = img.dataset.fallback;
    return;
  }
  if (step === '1' && img.dataset.fallback2) {
    img.dataset.fbStep = '2';
    img.src = img.dataset.fallback2;
  }
}, true);

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

/**
 * Позиция прокрутки, которую надо вернуть после перерисовки (переход с keepScroll,
 * например «Показать ещё»). null — обычное поведение: новая страница открывается сверху.
 */
let restoreScrollY = null;

function render(scroll = true) {
  const parsed = parseLocation();
  const ctx = parsed.notFound ? { name: 'notfound', params: {}, query: {} } : parsed;
  currentCtx = ctx;
  resetAdCounter();
  // мобильные панели не переживают смену страницы (шторка фильтров живёт
  // только на страницах каталога, где её состояние хранит модуль catalog)
  document.body.classList.remove('menu-open');
  if (!['catalog', 'mode', 'genre', 'tag', 'mood', 'platform'].includes(ctx.name)) {
    catalog.setFiltersOpen(false);
  }

  const view = ctx.route?.view;
  let html = '';
  let titleText = t('site.name');
  let description = t('site.description');

  if (!view) {
    html = `<section class="section"><div class="empty"><div class="empty-icon">${icon('compass')}</div>
      <h1>${t('common.notFound')}</h1><p>${t('common.notFound.text')}</p>
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
  const page = `${header(ctx)}${storageWarning()}<main id="main" class="main">${html}</main>${footer()}${consentBanner()}`;
  app.innerHTML = PATH_MODE ? page.replace(/href="#\/([^"]*)"/g, (_, rest) => `href="${link(rest)}"`) : page;
  setHead(titleText, description);
  trackPageview(PATH_MODE ? link(parsed.path || '') : `/${parsed.path || ''}`, titleText);
  injectJsonLd(ctx, view);
  view?.mount?.(app);
  ensureAdScripts();
  lastRouteName = ctx.name;
  if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
  // Возврат позиции для «Показать ещё»: разметка выше кнопки не меняется,
  // поэтому человек остаётся ровно там, где нажал. behavior: 'instant' — важно:
  // 'auto' подчиняется CSS `html { scroll-behavior: smooth }`, и страница
  // уезжала бы к цели анимацией (в браузерном тесте это выглядело как прыжок).
  if (restoreScrollY !== null) {
    const y = restoreScrollY;
    restoreScrollY = null;
    window.scrollTo({ top: y, behavior: 'instant' });
  }
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
    // Авторекламу AdSense включает только при явном ADS.adsense.autoAds: true,
    // иначе сети показывают блоки в местах, где мы их не планировали.
    if (ADS.adsense.autoAds) {
      s.addEventListener('load', () => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: ADS.adsense.client,
            enable_page_level_ads: true,
          });
        } catch { /* сеть недоступна — обычные блоки продолжат работать */ }
      });
    }
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

/**
 * Отметка на странице подбора сразу пересчитывает список — как и обещает главная
 * («список пересчитается на ходу»). Раньше появлялась плашка, которая через 12 секунд
 * просто исчезала: если её не заметить, подбор выглядел так, будто отметку проигнорировали.
 * Теперь список обновляется сам, а плашка стала коротким подтверждением «Подбор обновлён».
 */
window.addEventListener('gf:marks-changed', () => {
  if (currentCtx?.name !== 'results') return;
  render(false);
  if (refreshPill) return;
  const node = document.createElement('div');
  node.className = 'refresh-pill refresh-pill-info';
  node.setAttribute('role', 'status');
  node.innerHTML = `${icon('refresh')} ${t('results.updated')}`;
  document.body.append(node);
  refreshPill = node;
  setTimeout(() => { if (refreshPill === node) { node.remove(); refreshPill = null; } }, 2600);
});

/* ------------------------------------------------------------------ *
 * Глобальные действия (делегирование событий)
 * ------------------------------------------------------------------ */

/** Закрыть мобильное меню (панель, оверлей, блокировка скролла) */
function closeMenu(restoreFocus = false) {
  document.getElementById('main-nav')?.classList.remove('open');
  document.querySelector('.nav-overlay')?.classList.remove('show');
  document.body.classList.remove('menu-open');
  document.querySelector('.burger')?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) document.querySelector('.burger')?.focus();
}

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
      // Пагинация не должна перебрасывать страницу вверх: человек остаётся там,
      // где нажал кнопку, а новые карточки добавляются ниже (render(false) + keepScroll).
      if (currentCtx?.name === 'results') {
        results.showMore(more);
        render(false);
      } else if (currentCtx?.name === 'party') {
        party.showMore(more);
        render(false);
      } else {
        catalog.updateQuery({ page: (Number(currentCtx?.query?.page) || FEATURES.pageSize) + more }, { keepScroll: true });
      }
      break;
    }
    case 'reshuffle': {
      const p = getProfile();
      setMeta({ seed: (p.meta?.seed || 1) + 1 });
      render(false);
      break;
    }
    case 'toggle-played': {
      // чекбокс «показывать сыгранное»: checked уже обновлён браузером, сохраняем и пересчитываем
      const p = getProfile();
      setMeta({ lastPreset: { ...(p.meta?.lastPreset || {}), includePlayed: Boolean(target.checked) } });
      render(false);
      break;
    }
    case 'reset-all': {
      if (!confirm(t('profile.reset.confirm'))) return;
      resetProfile();
      navigate('quiz');
      break;
    }
    case 'menu-toggle': {
      const panel = document.getElementById('main-nav');
      const willOpen = !panel?.classList.contains('open');
      panel?.classList.toggle('open', willOpen);
      document.querySelector('.nav-overlay')?.classList.toggle('show', willOpen);
      document.body.classList.toggle('menu-open', willOpen);
      target.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) panel?.querySelector('.nav-link')?.focus();
      break;
    }
    case 'menu-close': {
      closeMenu(true);
      break;
    }
    case 'filters-toggle': {
      const willOpen = !catalog.isFiltersOpen();
      catalog.setFiltersOpen(willOpen);
      document.getElementById('catalog-filters')?.classList.toggle('open', willOpen);
      document.querySelector('.filters-toggle')?.setAttribute('aria-expanded', String(willOpen));
      break;
    }
    case 'filters-apply': {
      // «Показать N игр»: сворачиваем панель и подкручиваем к результатам
      catalog.setFiltersOpen(false);
      document.getElementById('catalog-filters')?.classList.remove('open');
      document.querySelector('.filters-toggle')?.setAttribute('aria-expanded', 'false');
      try { document.getElementById('catalog-found')?.scrollIntoView({ block: 'start' }); } catch { /* ignore */ }
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
      consentReopen = false;
      initAnalytics({ consent: 'all' });
      adScriptsLoaded = false;
      render(false);
      break;
    }
    case 'consent-decline': {
      setConsent('necessary');
      consentReopen = false;
      document.getElementById('consent')?.remove();
      break;
    }
    case 'consent-open': {
      // Решение можно изменить в любой момент: было «только необходимые» — вернули баннер
      consentReopen = true;
      render(false);
      document.getElementById('consent')?.scrollIntoView({ block: 'nearest' });
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
  if (event.key === 'Escape') {
    if (document.querySelector('.nav.open')) closeMenu(true);
    else if (catalog.isFiltersOpen()) {
      catalog.setFiltersOpen(false);
      document.getElementById('catalog-filters')?.classList.remove('open');
      document.querySelector('.filters-toggle')?.setAttribute('aria-expanded', 'false');
      document.querySelector('.filters-toggle')?.focus();
    }
  }
});

window.addEventListener('hashchange', () => render(true));
window.addEventListener('gf:track', (event) => track(event.detail?.name, event.detail?.params || {}));
window.addEventListener('gf:auth-changed', () => render(false));
window.addEventListener('popstate', () => render(true));
window.addEventListener('gf:rerender', () => render(false));

/** Программный переход, используется квизом, фильтрами и кнопками */
window.addEventListener('gf:navigate', (event) => {
  const { path, replace, keepScroll } = event.detail || {};
  if (!path && path !== '') return;
  // «Показать ещё»: перерисовка не должна менять позицию прокрутки. Запоминаем её
  // здесь, а возвращаем в конце render() — в том числе когда переход идёт через
  // hashchange (hash-режим без pushState), где рендер вызывает уже другое событие.
  restoreScrollY = keepScroll ? window.scrollY : null;
  if (PATH_MODE) {
    // link() уже включает базовый путь и слэш стиля (важно для GitHub Pages)
    const url = link(path);
    if (replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
    render(!keepScroll);
  } else if (location.hash !== link(path)) {
    location.hash = link(path);
  } else {
    render(!keepScroll);
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

  // Если сохранён токен — тихо проверяем сессию и подтягиваем актуальный профиль.
  // Серверный профиль не подменяет локальный, а сливается с ним: иначе только что
  // поставленные отметки (автоотправка ждёт 4 секунды) и настройки устройства
  // пропадали при перезагрузке страницы. Объединённый профиль отправляем обратно,
  // чтобы сервер тоже не остался со старой версией.
  if (isLoggedIn()) {
    import('./api.js').then(async ({ me, pullProfile, pushProfile }) => {
      try {
        await me();
        const remote = await pullProfile();
        const { adoptRemote, needsPush, getProfile } = await import('./store.js');
        const changed = needsPush(getProfile(), remote);
        adoptRemote(remote);
        // Отправляем только если в браузере были данные, которых нет на сервере
        if (changed) pushProfile(getProfile()).catch(() => { /* нет связи — дошлём позже */ });
        window.dispatchEvent(new CustomEvent('gf:rerender'));
      } catch (error) {
        // Сессию сбрасываем только при явном «токен недействителен» (401).
        // Раньше выход происходил при любой ошибке, включая пропавшую на минуту сеть:
        // пользователь входил заново и думал, что аккаунт «отключился» сам.
        if (error?.status === 401) clearSession();
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
  // Путь с базой деплоя: при выкладке в подпапку (GitHub Pages) жёсткий '/sw.js'
  // давал 404 — офлайн-режим молча отключался. base() возвращает '' для корня.
  const scopePath = `${base()}/sw.js`.replace(/\/{2,}/g, '/');
  navigator.serviceWorker.register(scopePath).catch(() => { /* офлайн — необязательная роскошь */ });
}
