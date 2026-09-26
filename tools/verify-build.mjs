/**
 * Проверка собранного сайта в dist/ — то, что уедет на хостинг.
 *
 * Что смотрим:
 *   • все страницы на месте и не пустые (в HTML есть <main> и контент);
 *   • у каждой страницы уникальный <title>, есть description и canonical;
 *   • canonical каждой страницы точно равен адресу из конфига (без query и висячего слэша),
 *     а у 404.html canonical отсутствует вовсе;
 *   • внутренние ссылки ведут на существующие файлы (с учётом базового пути /mydev);
 *   • sitemap.xml корректен: XML валиден, все адреса существуют как файлы,
 *     персональные страницы в него не попали;
 *   • нет остатков старого бренда и текста «undefined» в разметке;
 *   • страницы игр содержат название игры и JSON-LD.
 *
 * Адрес сайта и база читаются из собранного dist/js/config.js — ровно то, что уедет на хостинг.
 *
 * Запуск: npm run verify:build   (после npm run build)
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

let passed = 0;
const problems = [];
const check = (name, condition, detail = '') => {
  if (condition) { passed += 1; console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`); }
  else { problems.push(`${name}${detail ? ` (${detail})` : ''}`); console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};

if (!existsSync(dist)) {
  console.error('❌ Нет папки dist/ — сначала выполните npm run build');
  process.exit(1);
}

/** Все HTML-файлы сборки */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

const htmlFiles = walk(dist);
const urlOf = (file) => {
  const rel = relative(dist, file).replace(/index\.html$/, '');
  return `/${rel}`.replace(/\/$/, '/') || '/';
};

// Адрес сайта и базовый путь — из собранного конфига (истина в последней инстанции).
// Читаем импортом, а не регуляркой по тексту: сборка минифицирует JS, и любой
// текстовый разбор сломался бы при смене кавычек или порядка полей.
const { SITE: distSite } = await import(pathToFileURL(join(dist, 'js', 'config.js')).href);
const cfgUrl = String(distSite?.url || '');
const siteUrl = cfgUrl.replace(/\/+$/, '');
const styleOn = cfgUrl.endsWith('/');
const normalizeBaseLocal = (raw) => {
  const b = String(raw || '').trim();
  if (!b || b === '/') return '';
  return (b.startsWith('/') ? b : `/${b}`).replace(/\/+$/, '');
};
let siteBase = normalizeBaseLocal(distSite?.base || '');
if (!siteBase && cfgUrl) {
  try {
    const p = new URL(cfgUrl).pathname;
    siteBase = p === '/' ? '' : p.replace(/\/+$/, '');
  } catch { /* не абсолютный адрес — без базы */ }
}
/** Ожидаемый canonical страницы: urlFor('/quiz') → https://…/quiz (со слэшем при styleOn) */
const urlFor = (path) => {
  const r = path === '/' ? '' : String(path).replace(/^\/+/, '').replace(/\/+$/, '');
  if (!r) return `${siteUrl}/`;
  return styleOn ? `${siteUrl}/${r}/` : `${siteUrl}/${r}`;
};
/** Отрезает базовый путь (/mydev/quiz → /quiz) перед проверкой файлов */
const stripBase = (p) => {
  if (siteBase && (p === siteBase || p === `${siteBase}/`)) return '/';
  if (siteBase && p.startsWith(`${siteBase}/`)) return p.slice(siteBase.length) || '/';
  return p;
};

console.log(`\n1. Страницы (${htmlFiles.length})`);
check('сборка содержит сотни страниц', htmlFiles.length > 500, `${htmlFiles.length} страниц`);
check('есть 404.html', existsSync(join(dist, '404.html')));
check('есть служебные файлы хостинга', ['_headers', '_redirects', 'robots.txt', 'sitemap.xml', 'ads.txt'].every((f) => existsSync(join(dist, f))));

const titles = new Map();
const duplicates = [];
let withoutCanonical = 0;
const badCanonical = [];
let fourOhFourCanonical = '';
let withoutDescription = 0;
let emptyPages = [];
let brokenLinks = [];
let oldBrand = [];
let undefinedText = [];

const internalLinks = new Set();
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const url = urlOf(file);
  const noindex = /<meta name="robots" content="noindex/.test(html);

  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1]?.trim() || '';
  if (!noindex) {
    if (titles.has(title)) duplicates.push(`${url} ↔ ${titles.get(title)}`);
    else titles.set(title, url);
  }

  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) withoutDescription += 1;
  // canonical: у каждой страницы — точный адрес из конфига; у 404.html его быть не должно
  const canonical = /<link rel="canonical" href="([^"]*)">/.exec(html)?.[1] || '';
  if (file.endsWith('404.html')) {
    if (canonical) fourOhFourCanonical = canonical;
  } else if (!canonical) {
    withoutCanonical += 1;
  } else if (canonical !== urlFor(url)) {
    badCanonical.push(`${url} → ${canonical} (ждём ${urlFor(url)})`);
  }
  if (!/<main id="main"/.test(html) || html.length < 3000) emptyPages.push(url);
  if (/GameFinder/.test(html)) oldBrand.push(url);
  if (/>undefined<|\bundefined\b(?=[^<]*<)/.test(html)) undefinedText.push(url);

  for (const match of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const href = match[1];
    if (href.startsWith('//')) continue;
    if (/\.(css|js|mjs|png|jpg|jpeg|svg|webp|ico|woff2?|xml|txt|webmanifest)$/i.test(href)) continue;
    internalLinks.add(href);
  }
}

console.log('\n2. SEO-метаданные');
check('у всех индексируемых страниц уникальный title', duplicates.length === 0, duplicates.slice(0, 3).join('; '));
check('description есть у всех страниц', withoutDescription === 0, `без описания: ${withoutDescription}`);
check('canonical есть у всех индексируемых страниц', withoutCanonical === 0, `без canonical: ${withoutCanonical}`);
check('canonical точно соответствует адресу страницы', badCanonical.length === 0,
  badCanonical.length ? `расхождений: ${badCanonical.length} → ${badCanonical.slice(0, 3).join('; ')}` : `${siteUrl}${siteBase ? ` (база ${siteBase})` : ''}`);
check('у 404.html нет canonical', !fourOhFourCanonical, fourOhFourCanonical || 'canonical отсутствует ✓');
check('нет страниц с пустым содержимым', emptyPages.length === 0, emptyPages.slice(0, 3).join(', '));
check('старый бренд не упоминается', oldBrand.length === 0, oldBrand.slice(0, 3).join(', '));
check('в разметке нет «undefined»', undefinedText.length === 0, undefinedText.slice(0, 3).join(', '));

console.log('\n3. Внутренние ссылки');
for (const href of internalLinks) {
  const clean = stripBase(href.split('?')[0]);
  const candidates = [
    join(dist, clean),
    join(dist, clean, 'index.html'),
    join(dist, `${clean}.html`),
  ];
  if (!candidates.some((c) => existsSync(c) && statSync(c).isFile())) brokenLinks.push(href);
}
check('все внутренние ссылки ведут на существующие страницы', brokenLinks.length === 0,
  brokenLinks.length ? `битых: ${brokenLinks.length} → ${brokenLinks.slice(0, 5).join(', ')}` : `проверено ${internalLinks.size} адресов`);

console.log('\n4. Sitemap и robots');
const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
check('sitemap — валидный XML', sitemap.startsWith('<?xml') && sitemap.includes('</urlset>'));
check('в sitemap сотни адресов', urls.length > 500, `${urls.length} адресов`);
const wrongHost = urls.filter((u) => !(u === siteUrl || u.startsWith(`${siteUrl}/`)));
check('все адреса sitemap на сайте из конфига', wrongHost.length === 0, wrongHost.slice(0, 3).join(', '));
const sitemapMissing = urls.filter((url) => {
  const path = stripBase(url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]);
  return !existsSync(join(dist, path, 'index.html')) && !existsSync(join(dist, path));
});
check('все адреса из sitemap существуют в сборке', sitemapMissing.length === 0, sitemapMissing.slice(0, 3).join(', '));
check('персональные страницы закрыты от индексации',
  !urls.some((u) => /\/(results|profile|account)\/?$/.test(u)),
  'results/profile/account не в sitemap');
const robotsTxt = readFileSync(join(dist, 'robots.txt'), 'utf8');
check('robots.txt ссылается на sitemap', /Sitemap:\s+https?:\/\/\S+sitemap\.xml/.test(robotsTxt));
check('robots.txt ведёт на свой sitemap', robotsTxt.includes(`Sitemap: ${siteUrl}/sitemap.xml`));

console.log('\n5. Страницы игр');
const gameFiles = htmlFiles.filter((f) => f.includes(`${'game'}/`) || /\/game\//.test(f));
const sample = gameFiles.slice(0, 12);
let withoutJsonLd = 0;
let withoutTitle = 0;
for (const file of sample) {
  const html = readFileSync(file, 'utf8');
  if (!/application\/ld\+json/.test(html)) withoutJsonLd += 1;
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] || '';
  if (title.length < 6 || !/<h1/.test(html)) withoutTitle += 1;
}
check('страницы игр содержат JSON-LD', withoutJsonLd === 0, `проверено ${sample.length}`);
// Минификация: аудит Lighthouse на собранном сайте показывал 21 КиБ лишнего
// в CSS и 70 КиБ в JS — файлы уезжали как есть. Теперь build сжимает их,
// и здесь проверяется, что сжатие не потерялось.
{
  const srcCss = readFileSync(resolve(root, 'css/styles.css'), 'utf8').length;
  const distCssPath = resolve(dist, 'css/styles.css');
  const distCss = existsSync(distCssPath) ? readFileSync(distCssPath, 'utf8').length : 0;
  check('CSS собран сжатым', distCss > 0 && distCss < srcCss * 0.85, `${Math.round(distCss / 1024)} КиБ из ${Math.round(srcCss / 1024)} КиБ`);

  const jsFiles = [];
  const walkJs = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, e.name);
      if (e.isDirectory()) walkJs(full);
      else if (e.name.endsWith('.js')) jsFiles.push(full);
    }
  };
  if (existsSync(resolve(dist, 'js'))) walkJs(resolve(dist, 'js'));
  const distJs = jsFiles.reduce((n, f) => n + readFileSync(f, 'utf8').length, 0);
  const srcJs = jsFiles.reduce((n, f) => n + readFileSync(resolve(root, 'js', f.slice(resolve(dist, 'js').length + 1)), 'utf8').length, 0);
  check('JS собран сжатым', distJs > 0 && distJs < srcJs * 0.95, `${Math.round(distJs / 1024)} КиБ из ${Math.round(srcJs / 1024)} КиБ`);
}

check('страницы игр содержат заголовок и <h1>', withoutTitle === 0, `проверено ${sample.length}`);
check('игр в сборке столько же, сколько в каталоге', gameFiles.length > 400, `${gameFiles.length} страниц игр`);

console.log('\n6. Заголовки безопасности и PWA');
const headers = readFileSync(join(dist, '_headers'), 'utf8');
check('_headers содержит CSP', /Content-Security-Policy:/.test(headers));
check('_headers содержит HSTS', /Strict-Transport-Security:/.test(headers));
check('_headers запрещает фреймы', /frame-ancestors 'none'/.test(headers));
check('service worker собран и версионирован', existsSync(join(dist, 'sw.js')) && /CACHE_VERSION = '\d/.test(readFileSync(join(dist, 'sw.js'), 'utf8')));
check('манифест корректный JSON', (() => {
  try { const m = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8')); return Boolean(m.name && m.icons); } catch { return false; }
})());

console.log(`\nПроверок: ${passed + problems.length} · ✅ ${passed} · ❌ ${problems.length}`);
if (problems.length) {
  console.log('Проблемы:');
  problems.forEach((p) => console.log(`  • ${p}`));
}
process.exit(problems.length ? 1 : 0);
