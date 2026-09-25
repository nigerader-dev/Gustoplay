/**
 * Сборка статического сайта в dist/ для Cloudflare Pages (или любого статического хостинга).
 *
 * Что делает:
 *   1) копирует статику (css, js, manifest, covers);
 *   2) пре-рендерит каждую страницу в HTML (нужен jsdom: npm i -D jsdom) — так поисковики
 *      и «голые» клиенты видят готовый контент, а не пустой div;
 *   3) генерирует sitemap.xml, robots.txt, ads.txt, 404.html и _headers/_redirects для Cloudflare.
 *
 * Запуск:  node tools/build-static.mjs            (полная сборка с пре-рендером)
 *          node tools/build-static.mjs --no-prerender   (только оболочка + sitemap)
 *          node tools/build-static.mjs --site-url=https://user.github.io/repo --trailing-slash
 *                                                      (зеркало на GitHub Pages: canonical и
 *                                                       ссылки на адрес зеркала, база /repo)
 */
import { mkdirSync, writeFileSync, cpSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GAMES } from '../js/catalog/index.js';
import { GENRES, TAGS, MODES, MOODS, PLATFORMS } from '../js/taxonomy.js';
import { SITE, ADS } from '../js/config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const noPrerender = process.argv.includes('--no-prerender');
// Адрес API для сборки: --api-base=/api (или GUSTOPLAY_API_BASE). Пусто — локальный режим.
const apiBaseArg = process.argv.find((a) => a.startsWith('--api-base='));
const apiBase = apiBaseArg ? apiBaseArg.slice('--api-base='.length) : (process.env.GUSTOPLAY_API_BASE || '');
// Публичный ключ Turnstile: --turnstile-key=0x... (или GUSTOPLAY_TURNSTILE_KEY)
const turnstileArg = process.argv.find((a) => a.startsWith('--turnstile-key='));
const turnstileKey = turnstileArg ? turnstileArg.slice('--turnstile-key='.length) : (process.env.GUSTOPLAY_TURNSTILE_KEY || '');
// Google Client ID: --google-client-id=... (или GUSTOPLAY_GOOGLE_CLIENT_ID)
const googleArg = process.argv.find((a) => a.startsWith('--google-client-id='));
const googleClientId = googleArg ? googleArg.slice('--google-client-id='.length) : (process.env.GUSTOPLAY_GOOGLE_CLIENT_ID || '');
// Публичный адрес сайта для canonical/sitemap: --site-url=https://user.github.io/repo (или GUSTOPLAY_SITE_URL).
// Базовый путь (/repo) выводится из pathname адреса; явно задаётся флагом --base=/repo (или GUSTOPLAY_BASE).
// Стиль адресов с завершающим слэшем (GitHub Pages отдаёт 301 на /quiz/): --trailing-slash —
// либо просто завершающий слэш в самом --site-url.
const siteUrlArg = process.argv.find((a) => a.startsWith('--site-url='));
const siteUrlRaw = siteUrlArg ? siteUrlArg.slice('--site-url='.length) : (process.env.GUSTOPLAY_SITE_URL || '');
const baseArg = process.argv.find((a) => a.startsWith('--base='));
const baseRaw = baseArg ? baseArg.slice('--base='.length) : (process.env.GUSTOPLAY_BASE || '');
const trailingSlashFlag = process.argv.includes('--trailing-slash') || process.env.GUSTOPLAY_TRAILING_SLASH === '1';
const normalizeBase = (raw) => {
  const b = String(raw || '').trim();
  if (!b || b === '/') return '';
  return (b.startsWith('/') ? b : `/${b}`).replace(/\/+$/, '');
};
if (siteUrlRaw || baseRaw || trailingSlashFlag) {
  if (siteUrlRaw) SITE.url = siteUrlRaw.replace(/\/+$/, '');
  if (trailingSlashFlag || (siteUrlRaw && siteUrlRaw.endsWith('/'))) {
    if (!SITE.url.endsWith('/')) SITE.url += '/';
  }
  if (baseRaw) SITE.base = normalizeBase(baseRaw);
  else if (siteUrlRaw) {
    try { SITE.base = normalizeBase(new URL(siteUrlRaw).pathname); } catch { SITE.base = ''; }
  }
}
/** Корень сайта без завершающего слэша: https://user.github.io/mydev */
const siteRoot = () => String(SITE.url).replace(/\/+$/, '');
/** Стиль адресов с «/» в конце — маркер: SITE.url заканчивается на слэш */
const styleOn = () => String(SITE.url).endsWith('/');
/** Базовый путь деплоя: '' или /mydev */
const basePath = () => normalizeBase(SITE.base);
/** Абсолютный адрес страницы: urlFor('/quiz') → https://…/quiz (со слэшем при styleOn) */
const urlFor = (path) => {
  const r = path === '/' ? '' : String(path).replace(/^\/+/, '').replace(/\/+$/, '');
  if (!r) return `${siteRoot()}/`;
  return styleOn() ? `${siteRoot()}/${r}/` : `${siteRoot()}/${r}`;
};
const today = new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ *
 * 1. Список маршрутов
 * ------------------------------------------------------------------ */

export const ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/quiz', priority: '0.9', changefreq: 'weekly' },
  { path: '/catalog', priority: '0.9', changefreq: 'daily' },
  { path: '/party', priority: '0.8', changefreq: 'weekly' },
  { path: '/results', priority: '0.5', changefreq: 'monthly', noindex: true },
  { path: '/profile', priority: '0.3', changefreq: 'monthly', noindex: true },
  { path: '/account', priority: '0.2', changefreq: 'yearly', noindex: true },
  { path: '/about', priority: '0.4', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  ...Object.keys(GENRES).map((id) => ({ path: `/genre/${id}`, priority: '0.7', changefreq: 'weekly' })),
  ...Object.keys(TAGS).map((id) => ({ path: `/tag/${id}`, priority: '0.6', changefreq: 'weekly' })),
  ...Object.keys(MODES).map((id) => ({ path: `/mode/${id}`, priority: '0.6', changefreq: 'weekly' })),
  ...Object.keys(MOODS).map((id) => ({ path: `/mood/${id}`, priority: '0.5', changefreq: 'weekly' })),
  ...Object.keys(PLATFORMS).map((id) => ({ path: `/platform/${id}`, priority: '0.5', changefreq: 'weekly' })),
  ...GAMES.map((g) => ({ path: `/game/${g.slug}`, priority: '0.6', changefreq: 'monthly' })),
];

/* ------------------------------------------------------------------ *
 * 2. Очистка и копирование статики
 * ------------------------------------------------------------------ */

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const dir of ['css', 'js']) cpSync(join(root, dir), join(dist, dir), { recursive: true });

// Адрес API и настройки сайта вписываем в собранную копию конфига: исходник остаётся
// универсальным, а на хостинг уезжает сборка, которая сразу знает свой адрес и базовый путь.
{
  const rewrites = [];
  if (siteUrlRaw || trailingSlashFlag) rewrites.push([/url:\s*'[^']*'/, () => `url: '${SITE.url}'`]);
  if (siteUrlRaw || baseRaw) rewrites.push([/\bbase:\s*'[^']*'/, () => `base: '${SITE.base}'`]);
  if (apiBase) rewrites.push([/apiBase:\s*'[^']*'/, () => `apiBase: '${apiBase}'`]);
  if (turnstileKey) rewrites.push([/turnstileSiteKey:\s*'[^']*'/, () => `turnstileSiteKey: '${turnstileKey}'`]);
  if (googleClientId) rewrites.push([/googleClientId:\s*'[^']*'/, () => `googleClientId: '${googleClientId}'`]);
  if (rewrites.length) {
    const configPath = join(dist, 'js/config.js');
    let configSrc = readFileSync(configPath, 'utf8');
    const missing = [];
    for (const [re, replacer] of rewrites) {
      if (!re.test(configSrc)) missing.push(String(re));
      else configSrc = configSrc.replace(re, replacer);
    }
    if (missing.length) throw new Error(`не удалось вписать настройки в собранный config.js: ${missing.join(', ')}`);
    writeFileSync(configPath, configSrc);
  }
}
for (const file of ['manifest.webmanifest']) {
  if (existsSync(join(root, file))) cpSync(join(root, file), join(dist, file));
}

// Service worker: версия кэша = дата сборки, чтобы браузеры подхватывали обновления
if (existsSync(join(root, 'sw.js'))) {
  const stamp = `${today.replace(/-/g, '')}-${Date.now().toString(36).slice(-4)}`;
  const sw = readFileSync(join(root, 'sw.js'), 'utf8')
    .replace("const CACHE_VERSION = 'v1';", `const CACHE_VERSION = '${stamp}';`);
  writeFileSync(join(dist, 'sw.js'), sw);
}
if (existsSync(join(root, 'covers'))) cpSync(join(root, 'covers'), join(dist, 'covers'), { recursive: true });

const shell = readFileSync(join(root, 'index.html'), 'utf8')
  .replaceAll('href="css/', `href="${basePath()}/css/`)
  .replaceAll('src="js/', `src="${basePath()}/js/`)
  .replaceAll('href="manifest.webmanifest"', `href="${basePath()}/manifest.webmanifest"`)
  .replaceAll('src="covers/', `src="${basePath()}/covers/`)
  // canonical/og:url/JSON-LD в оболочке — адресом текущего сайта (важно для зеркал)
  .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${urlFor('/')}">`)
  .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${urlFor('/')}">`)
  .replace(/("url":\s*")[^"]*(")/, `$1${urlFor('/')}$2`);

writeFileSync(join(dist, 'index.html'), shell);

/* ------------------------------------------------------------------ *
 * 3. Пре-рендер (jsdom) — готовый HTML для поисковиков
 * ------------------------------------------------------------------ */

function absolutize(html, route) {
  const path = typeof route === 'string' ? route : route.path;
  const url = urlFor(path);
  let out = html
    .replaceAll('href="css/', `href="${basePath()}/css/`)
    .replaceAll('src="js/', `src="${basePath()}/js/`)
    .replaceAll('href="manifest.webmanifest"', `href="${basePath()}/manifest.webmanifest"`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}">`);

  // персональные страницы (результаты, профиль, аккаунт) закрываем от индексации
  if (route.noindex) {
    out = out
      .replace(/<meta name="robots"[^>]*>/, '')
      .replace('</head>', '  <meta name="robots" content="noindex, follow">\n</head>');
  }
  return out;
}

let prerendered = 0;
if (!noPrerender) {
  try {
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM(shell, { url: 'http://localhost/#/', pretendToBeVisual: true });
    const { window } = dom;
    for (const key of ['document', 'localStorage', 'sessionStorage', 'CustomEvent', 'Event', 'HTMLElement', 'Node']) {
      try { globalThis[key] = window[key]; } catch { /* read-only */ }
    }
    try { Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true }); } catch { /* ignore */ }
    for (const key of ['location', 'history']) {
      try { Object.defineProperty(globalThis, key, { value: window[key], configurable: true }); } catch { /* ignore */ }
    }
    globalThis.window = window;
    window.scrollTo = () => {};
    window.confirm = () => true;
    window.prompt = () => null;

    await import('../js/app.js');
    const tick = () => new Promise((r) => setTimeout(r, 20));

    for (const route of ROUTES) {
      // навигация через публичное API приложения (работает в PATH-режиме через History API)
      window.dispatchEvent(new window.CustomEvent('gf:navigate', { detail: { path: route.path, replace: true } }));
      await tick();
      const html = `<!DOCTYPE html>\n${window.document.documentElement.outerHTML}`;
      const out = route.path === '/' ? join(dist, 'index.html') : join(dist, route.path.replace(/^\//, ''), 'index.html');
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, absolutize(html, route));
      prerendered += 1;
    }
    // Самопроверка: страница игры обязана содержать название игры, иначе пре-рендер «сломался»
    const probe = GAMES[0];
    const probeHtml = readFileSync(join(dist, 'game', probe.slug, 'index.html'), 'utf8');
    if (!probeHtml.includes(probe.t)) {
      throw new Error(`пре-рендер сломан: на странице /game/${probe.slug} нет названия игры`);
    }
  } catch (error) {
    console.warn(`\n⚠️  Пре-рендер пропущен: ${error.message}`);
    console.warn('   Установите jsdom (npm i -D jsdom) и запустите сборку снова, либо оставьте как есть —');
    console.warn('   Cloudflare Pages отдаст SPA-оболочку, а поисковики отрендерят её самостоятельно.\n');
  }
}

/* ------------------------------------------------------------------ *
 * 4. SEO-файлы и конфиг хостинга
 * ------------------------------------------------------------------ */

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.filter((r) => !r.noindex).map((r) => `  <url><loc>${urlFor(r.path)}</loc><lastmod>${today}</lastmod><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`).join('\n')}
</urlset>`;
writeFileSync(join(dist, 'sitemap.xml'), sitemap);

writeFileSync(join(dist, 'robots.txt'), `# GustoPlay
User-agent: *
Allow: /
Disallow: ${basePath()}/results
Disallow: ${basePath()}/profile

# Sitemap
Sitemap: ${siteRoot()}/sitemap.xml
`);

const adsTxt = ADS.adsTxt.length
  ? `${ADS.adsTxt.join('\n')}\n`
  : `# ads.txt появится здесь после подключения рекламной сети.
# Примеры строк:
# yandex.com, 1234567, DIRECT
# google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
`;
writeFileSync(join(dist, 'ads.txt'), adsTxt);

// Cloudflare Pages: заголовки безопасности берём из корневого _headers (там CSP, HSTS,
// X-Frame-Options и правила кэша). Раньше сборка писала свой урезанный вариант и затирала их.
const headersSrc = join(root, '_headers');
// Имена CSS/JS без fingerprint — immutable-кэш здесь оставлять нельзя:
// старый релиз залипнет на edge и пользователи не увидят обновления.
const fallbackHeaders = `/*\
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/js/*
  Cache-Control: public, max-age=0, must-revalidate
/css/*
  Cache-Control: public, max-age=0, must-revalidate
/index.html
  Cache-Control: public, max-age=0, must-revalidate
/sw.js
  Cache-Control: no-cache
`;
if (existsSync(headersSrc)) {
  cpSync(headersSrc, join(dist, '_headers'));
} else {
  console.warn('⚠️  В корне нет _headers — собран сайт без CSP/HSTS. Смотрите docs/SECURITY.md.');
  writeFileSync(join(dist, '_headers'), fallbackHeaders);
}

writeFileSync(join(dist, '_redirects'), `# SPA-фолбэк: любые неизвестные пути отдаём индексом (200, не 404 — так работают hash-ссылки)
/*  /index.html  200
`);

// 404 отдаём отдельной страницей: свой заголовок и запрет индексации,
// иначе поисковик может проиндексировать её по любому несуществующему адресу.
// canonical и og:url убираем совсем — ссылаться на несуществующую страницу нельзя.
const builtShell = readFileSync(join(dist, 'index.html'), 'utf8');
const notFound = builtShell
  .replace(/<link rel="canonical"[^>]*>\s*/, '')
  .replace(/<meta property="og:url"[^>]*>\s*/, '')
  .replace(/<title>[^<]*<\/title>/, `<title>${SITE.name} — страница не найдена</title>`)
  .replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, follow">');
writeFileSync(join(dist, '404.html'), notFound);

console.log(`✅ Сборка готова: dist/`);
console.log(`   страниц: ${ROUTES.length}, пре-рендер: ${prerendered ? `${prerendered} страниц` : 'выключен'}`);
console.log(`   файлы: sitemap.xml, robots.txt, ads.txt, 404.html, _headers, _redirects`);
console.log(`   домен в конфиге: ${SITE.url}${basePath() ? ` (база: ${basePath()}, стиль слэша: ${styleOn() ? 'да' : 'нет'})` : ''}`);
console.log(`   API аккаунтов: ${apiBase || 'не подключён (локальный режим)'}`);
console.log(`   вход через Google: ${googleClientId ? 'включён' : 'выключен'} · защита форм Turnstile: ${turnstileKey ? 'включена' : 'выключена'}`);
