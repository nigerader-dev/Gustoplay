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
import { mkdirSync, writeFileSync, cpSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

import { GAMES, loadSysreq } from '../js/catalog/index.js';
import { GENRES, TAGS, MODES, MOODS, PLATFORMS } from '../js/taxonomy.js';
import { COLLECTIONS } from '../js/views/collections.js';
import { SITE, ADS } from '../js/config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const noPrerender = process.argv.includes('--no-prerender');
// --noindex: сборка зеркала (GitHub Pages). Все страницы закрываются от индексации,
// иначе копия сайта на чужом домене конкурирует в поиске с основным gustoplay.ru.
const noIndexAll = process.argv.includes('--noindex') || process.env.GUSTOPLAY_NOINDEX === '1';
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
/**
 * modulepreload для всех статически импортируемых модулей приложения. Без него браузер
 * узнаёт о модулях по цепочке import → import (3–4 последовательных запроса до первого
 * рендера); с ним все ~40 файлов запрашиваются параллельно сразу из HTML.
 */
function modulePreloads() {
  const seen = new Set();
  const walk = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const src = readFileSync(join(root, rel), 'utf8');
    for (const m of src.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]/gm)) {
      const next = join(dirname(rel), m[1]).replace(/\\/g, '/');
      if (existsSync(join(root, next))) walk(next);
    }
  };
  walk('js/app.js');
  seen.delete('js/app.js'); // сам вход уже подключён <script type="module">
  return [...seen].sort().map((rel) => `  <link rel="modulepreload" href="${basePath()}/${rel}">\n`).join('');
}

/** Мета-теги подтверждения прав на сайт: только безопасные символы кода */
function verificationMeta() {
  const v = SITE.verification || {};
  const safe = (code) => String(code || '').trim().replace(/[^A-Za-z0-9_-]/g, '');
  const tags = [];
  if (safe(v.yandex)) tags.push(`  <meta name="yandex-verification" content="${safe(v.yandex)}">\n`);
  if (safe(v.google)) tags.push(`  <meta name="google-site-verification" content="${safe(v.google)}">\n`);
  return tags.join('');
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
  { path: '/support', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/podborki', priority: '0.8', changefreq: 'weekly' },
  { path: '/razdely', priority: '0.7', changefreq: 'weekly' },
  ...Object.keys(COLLECTIONS).map((id) => ({ path: `/top/${id}`, priority: '0.8', changefreq: 'weekly' })),
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

/* ------------------------------------------------------------------ *
 * 2б. Минификация CSS и JS
 *
 * Аудит Lighthouse на собранном сайте показал 21 КиБ лишнего в CSS и 70 КиБ
 * в JS — файлы уезжали на хостинг как есть. CSS и JS сжимаем esbuild
 * (devDependency), CSS дополнительно проверяем через PostCSS. Без esbuild сборка
 * не падает: файлы просто копируются как раньше, с предупреждением.
 * ------------------------------------------------------------------ */
{
  let esbuild = null;
  try { esbuild = await import('esbuild'); } catch { /* необязательная зависимость */ }
  const files = readdirSync(join(dist, 'css')).filter((f) => f.endsWith('.css'));
  let savedCss = 0;
  let savedJs = 0;

  if (esbuild) {
    for (const f of files) {
      const file = join(dist, 'css', f);
      const src = readFileSync(file, 'utf8');
      const before = astCount(src);
      const out = (await esbuild.transform(src, { loader: 'css', minify: true })).code;
      const after = astCount(out);
      // Esbuild объединяет одинаковые правила с разными селекторами. Допускаем
      // только такое малое сокращение счётчика; существенная потеря оставит оригинал.
      if (after < 0 || after < before * 0.995 || !out.length) {
        console.warn(`⚠️  ${f}: минификация CSS существенно изменила число объявлений (${before} → ${after}) — оставляю исходник`);
        continue;
      }
      writeFileSync(file, out);
      savedCss += src.length - out.length;
    }
  } else {
    console.warn('⚠️  esbuild не установлен — CSS и JS уезжают без минификации (npm i -D esbuild)');
  }
  const jsFiles = [];
  const walkJs = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walkJs(full);
      else if (entry.name.endsWith('.js')) jsFiles.push(full);
    }
  };
  walkJs(join(dist, 'js'));
  if (esbuild) {
    for (const file of jsFiles) {
      const src = readFileSync(file, 'utf8');
      // charset: 'utf8' — без него esbuild экранирует кириллицу в \uXXXX и файл
      // с описаниями игр вырастает вдвое вместо того, чтобы сжаться
      const out = (await esbuild.transform(src, { loader: 'js', format: 'esm', target: 'es2020', minify: true, charset: 'utf8' })).code;
      if (out.length) { writeFileSync(file, out); savedJs += src.length - out.length; }
    }
  } else {
    console.warn('⚠️  esbuild не установлен — JS уезжает без минификации (npm i -D esbuild)');
  }
  console.log(`   минификация: CSS −${Math.round(savedCss / 1024)} КиБ, JS −${Math.round(savedJs / 1024)} КиБ`
    + (esbuild ? '' : ' (JS пропущен)'));
}

/** Сколько CSS-объявлений: защита от потери деклараций при минификации. */
function astCount(text) {
  try {
    let n = 0;
    postcss.parse(text).walkDecls(() => { n += 1; });
    return n;
  } catch { return -1; }
}

// Service worker: версия кэша = дата сборки, чтобы браузеры подхватывали обновления
if (existsSync(join(root, 'sw.js'))) {
  const stamp = `${today.replace(/-/g, '')}-${Date.now().toString(36).slice(-4)}`;
  const sw = readFileSync(join(root, 'sw.js'), 'utf8')
    .replace("const CACHE_VERSION = 'v1';", `const CACHE_VERSION = '${stamp}';`);
  writeFileSync(join(dist, 'sw.js'), sw);
}
if (existsSync(join(root, 'covers'))) cpSync(join(root, 'covers'), join(dist, 'covers'), { recursive: true });
// Иконки сайта и картинка для превью ссылок (og:image)
if (existsSync(join(root, 'icons'))) cpSync(join(root, 'icons'), join(dist, 'icons'), { recursive: true });
if (existsSync(join(root, 'favicon.ico'))) cpSync(join(root, 'favicon.ico'), join(dist, 'favicon.ico'));
// Ключ IndexNow (<32 hex>.txt): поисковик проверяет его на домене (tools/indexnow.mjs)
for (const f of readdirSync(root)) if (/^[0-9a-f]{32}\.txt$/.test(f)) cpSync(join(root, f), join(dist, f));

const shell = readFileSync(join(root, 'index.html'), 'utf8')
  .replaceAll('href="css/', `href="${basePath()}/css/`)
  .replaceAll('src="js/', `src="${basePath()}/js/`)
  .replaceAll('href="manifest.webmanifest"', `href="${basePath()}/manifest.webmanifest"`)
  .replaceAll('src="covers/', `src="${basePath()}/covers/`)
  .replaceAll('href="icons/', `href="${basePath()}/icons/`)
  .replaceAll('href="/favicon.ico"', `href="${basePath()}/favicon.ico"`)
  .replaceAll('href="/catalog"', `href="${basePath()}/catalog"`)
  .replaceAll('href="/party"', `href="${basePath()}/party"`)
  .replaceAll('href="/about"', `href="${basePath()}/about"`)
  .replaceAll('content="https://gustoplay.ru/icons/og.jpg"', `content="${siteRoot()}/icons/og.jpg"`)
  // canonical/og:url/JSON-LD в оболочке — адресом текущего сайта (важно для зеркал)
  .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${urlFor('/')}">`)
  .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${urlFor('/')}">`)
  .replace(/("url":\s*")[^"]*(")/, `$1${urlFor('/')}$2`)
  // Подтверждение прав в Яндекс Вебмастере и Google Search Console (SITE.verification)
  .replace('</head>', `${verificationMeta()}${modulePreloads()}</head>`);

writeFileSync(join(dist, 'index.html'), noIndexAll
  ? shell.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, follow">')
  : shell);

/* ------------------------------------------------------------------ *
 * 3. Пре-рендер (jsdom) — готовый HTML для поисковиков
 * ------------------------------------------------------------------ */

/** Модули, которые приложение грузит динамически (import()) только на части страниц */
function lazyModulesFor(path) {
  if (/^\/game\//.test(path)) return ['js/catalog/sysreq.js'];
  if (/^\/(genre|mode|mood|tag|platform)\//.test(path)) return ['js/views/landing-texts.js'];
  return [];
}

function absolutize(html, route) {
  const path = typeof route === 'string' ? route : route.path;
  const url = urlFor(path);
  let out = html
    .replaceAll('href="css/', `href="${basePath()}/css/`)
    .replaceAll('src="js/', `src="${basePath()}/js/`)
    .replaceAll('href="manifest.webmanifest"', `href="${basePath()}/manifest.webmanifest"`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}">`);

  // Ленивые модули, которые нужны именно этой странице: подсказываем браузеру заранее,
  // иначе он узнает о них только после выполнения приложения
  const lazy = lazyModulesFor(path);
  if (lazy.length) {
    const links = lazy.map((rel) => `  <link rel="modulepreload" href="${basePath()}/${rel}">\n`).join('');
    out = out.replace('</head>', `${links}</head>`);
  }

  // персональные страницы (результаты, профиль, аккаунт) закрываем от индексации
  if (route.noindex || noIndexAll) {
    out = out
      .replace(/<meta name="robots"[^>]*>/, '')
      .replace('</head>', '  <meta name="robots" content="noindex, follow">\n</head>');
  }
  return out;
}

/**
 * Файл страницы в dist/. Без стиля «слэш в конце» страница кладётся как /genre/rpg.html:
 * Cloudflare Pages отдаёт её по адресу /genre/rpg без редиректа. Раньше это был
 * /genre/rpg/index.html — и каждый адрес из sitemap и canonical отвечал 308 на /genre/rpg/,
 * а canonical той страницы указывал обратно на адрес с редиректом (противоречивый сигнал
 * для поисковиков и лишний редирект на каждом переходе).
 * Со стилем слэша (зеркало на GitHub Pages) — папка с index.html, как ждёт тот хостинг.
 */
function pageFile(path) {
  const rel = String(path).replace(/^\/+/, '').replace(/\/+$/, '');
  if (!rel) return join(dist, 'index.html');
  return styleOn() ? join(dist, rel, 'index.html') : join(dist, `${rel}.html`);
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

    // Пре-рендер = боевой сайт: заглушки рекламы и прочие dev-подсказки не попадают в HTML
    globalThis.__GP_PRERENDER__ = true;
    // ленивые данные загружаем заранее: каждая страница рендерится синхронно и целиком
    const { loadLandingTexts } = await import('../js/views/catalog.js');
    await Promise.all([loadSysreq(), loadLandingTexts()]);
    await import('../js/app.js');
    const tick = () => new Promise((r) => setTimeout(r, 20));

    for (const route of ROUTES) {
      // навигация через публичное API приложения (работает в PATH-режиме через History API)
      window.dispatchEvent(new window.CustomEvent('gf:navigate', { detail: { path: route.path, replace: true } }));
      await tick();
      // Класс анимации переходов не должен попасть в HTML: на первой загрузке
      // контент обязан быть виден сразу, без opacity 0 (см. .nav-anim в CSS)
      window.document.documentElement.classList.remove('nav-anim');
      const html =`<!DOCTYPE html>\n${window.document.documentElement.outerHTML}`;
      const out = pageFile(route.path);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, absolutize(html, route));
      prerendered += 1;
    }
    // Самопроверка: страница игры обязана содержать название игры, иначе пре-рендер «сломался»
    const probe = GAMES[0];
    const probeHtml = readFileSync(pageFile(`/game/${probe.slug}`), 'utf8');
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
Disallow: ${basePath()}/account

# Яндекс: параметры фильтров не создают новых страниц (canonical — адрес без них)
User-agent: Yandex
Allow: /
Disallow: ${basePath()}/results
Disallow: ${basePath()}/profile
Disallow: ${basePath()}/account
Clean-param: q&page&sort&mode&platform&platforms&genre&tag&mood&players&price&time&coopLocal&free&lang

# Sitemap
Sitemap: ${siteRoot()}/sitemap.xml
`);

// llms.txt (llmstxt.org): краткая карта сайта для ИИ-поисковиков и ассистентов —
// что это за сайт и какие страницы отвечают на частые вопросы. Только реальные адреса.
{
  const pick = (o) => (o && (o.ru || o.en)) || '';
  const llms = `# ${SITE.name}

> ${pick(SITE.tagline)}. Бесплатный сервис подбора видеоигр на русском языке: короткий квиз
> о настроении, компании, платформе и бюджете выдаёт список игр с объяснением, почему каждая
> подходит. Игр в каталоге: ${GAMES.length} — для ПК, консолей и телефонов, с требованиями к ПК,
> режимами (кооп, PvP, за одним экраном), ценами в рублях и похожими играми.

## Главное
- [Подбор игры по вкусу](${urlFor('/quiz')}): квиз на минуту, персональная выдача
- [Каталог с фильтрами](${urlFor('/catalog')}): жанр, режим, число игроков, платформа, цена, длительность
- [Во что поиграть компанией](${urlFor('/party')}): подбор под 2–5+ игроков
- [Все жанры, режимы и теги](${urlFor('/razdely')})
- [Как устроен подбор](${urlFor('/about')})

## Подборки
${Object.keys(COLLECTIONS).map((id) => `- [${pick(COLLECTIONS[id].h1)}](${urlFor(`/top/${id}`)}): ${pick(COLLECTIONS[id].meta)}`).join('\n')}

## Жанры
${Object.keys(GENRES).map((id) => `- [${pick(GENRES[id])}](${urlFor(`/genre/${id}`)})`).join('\n')}

## Страницы игр
Адрес страницы игры: ${urlFor('/game/<slug>')} — описание, особенности, требования к ПК,
режимы и число игроков, ссылки на магазины и похожие игры. Полный список — в ${siteRoot()}/sitemap.xml.

## Контакты
- Почта: ${SITE.email}
`;
  writeFileSync(join(dist, 'llms.txt'), llms);
}

// RFC 9116 security contact. Use the existing public support address; do not add
// a fabricated mailbox or claim an unconfigured security policy URL.
const securityExpires = new Date();
securityExpires.setUTCFullYear(securityExpires.getUTCFullYear() + 1);
const securityTxt = `Contact: mailto:${SITE.email}
Expires: ${securityExpires.toISOString().replace(/\.\d{3}Z$/, 'Z')}
Preferred-Languages: ru, en
Canonical: ${siteRoot()}/.well-known/security.txt
`;
mkdirSync(join(dist, '.well-known'), { recursive: true });
writeFileSync(join(dist, '.well-known', 'security.txt'), securityTxt);

const adsTxt = ADS.adsTxt.length
  ? `${ADS.adsTxt.join('\n')}\n`
  : `# Рекламные сети не подключены; записей ads.txt пока нет.
`;
writeFileSync(join(dist, 'ads.txt'), adsTxt);

// Cloudflare Pages: заголовки безопасности берём из корневого _headers (там CSP, HSTS,
// X-Frame-Options и правила кэша). Раньше сборка писала свой урезанный вариант и затирала их.
const headersSrc = join(root, '_headers');
// Имена CSS/JS без fingerprint — immutable-кэш здесь оставлять нельзя:
// старый релиз залипнет на edge и пользователи не увидят обновления.
const fallbackHeaders = `/*
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
  // файл подтверждения Яндекса хранится как .txt — отдаём его как HTML
  const code = String(SITE.verification?.yandex || '').replace(/[^A-Za-z0-9_-]/g, '');
  if (code) {
    writeFileSync(join(dist, '_headers'), `${readFileSync(join(dist, '_headers'), 'utf8')}
/yandex_${code}.html
  Content-Type: text/html; charset=utf-8
`);
  }
} else {
  console.warn('⚠️  В корне нет _headers — собран сайт без CSP/HSTS. Смотрите docs/SECURITY.md.');
  writeFileSync(join(dist, '_headers'), fallbackHeaders);
}

// Файл подтверждения прав Яндекса: /yandex_<код>.html с текстом «Verification: <код>».
// Cloudflare Pages перенаправляет любой *.html на адрес без расширения (308), а проверка
// Яндекса ждёт файл ровно по адресу .html. Поэтому содержимое лежит в .txt, а правило
// _redirects отдаёт его по нужному адресу со статусом 200, без редиректа.
const yandexCode = String(SITE.verification?.yandex || '').replace(/[^A-Za-z0-9_-]/g, '');
let verificationRedirect = '';
if (yandexCode) {
  writeFileSync(join(dist, `yandex_${yandexCode}.txt`),
    `<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    </head>
    <body>Verification: ${yandexCode}</body>
</html>
`);
  verificationRedirect = `/yandex_${yandexCode}.html  /yandex_${yandexCode}.txt  200
`;
}

writeFileSync(join(dist, '_redirects'), `${verificationRedirect}# Голые адреса разделов (/genre, /tag, …) — не страницы: ведём на оглавление разделов и подборок
/genre  /razdely  301
/tag  /razdely  301
/mode  /razdely  301
/mood  /razdely  301
/platform  /razdely  301
/top  /podborki  301
/game  /catalog  301
# SPA-фолбэк: любые неизвестные пути отдаём индексом (200, не 404 — так работают hash-ссылки)
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
console.log(`   файлы: sitemap.xml, robots.txt, ads.txt, .well-known/security.txt, 404.html, _headers, _redirects`);
console.log(`   домен в конфиге: ${SITE.url}${basePath() ? ` (база: ${basePath()}, стиль слэша: ${styleOn() ? 'да' : 'нет'})` : ''}`);
console.log(`   API аккаунтов: ${apiBase || 'не подключён (локальный режим)'}`);
console.log(`   вход через Google: ${googleClientId ? 'включён' : 'выключен'} · защита форм Turnstile: ${turnstileKey ? 'включена' : 'выключена'}`);
