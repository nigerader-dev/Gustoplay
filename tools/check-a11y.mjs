/**
 * Проверка доступности (a11y): структура заголовков, подписи элементов, alt,
 * aria-атрибуты переключателей + WCAG-контраст текстовых пар обеих тем.
 * Без браузера: jsdom + статический разбор CSS-переменных.
 *
 * Запуск: npm run test:a11y
 */
import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const css = require('css');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true });
const { window } = dom;

for (const key of ['document', 'localStorage', 'sessionStorage', 'CustomEvent', 'Event', 'HTMLElement', 'Node']) {
  try { globalThis[key] = window[key]; } catch { /* ignore */ }
}
try { Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true }); } catch { /* ignore */ }
globalThis.window = window;
for (const key of ['location', 'history']) {
  try { Object.defineProperty(globalThis, key, { value: window[key], configurable: true }); } catch { /* ignore */ }
}
window.scrollTo = () => {};
window.confirm = () => true;
window.prompt = () => null;
globalThis.confirm = window.confirm;
globalThis.prompt = window.prompt;
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

const failures = [];
let passed = 0;
const check = (name, condition, extra = '') => {
  if (condition) { passed += 1; console.log(`  ✅ ${name}${extra ? ` — ${extra}` : ''}`); }
  else { console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ''}`); failures.push(name); }
};

const nav = await import('../js/nav.js');
const store = await import('../js/store.js');
await import('../js/app.js');

async function navigate(route) {
  nav.navigate(route.replace(/^#\/?/, ''));
  await new Promise((r) => setTimeout(r, 40));
}
const count = (selector) => window.document.querySelectorAll(selector).length;

/* ---------- 1. Структура страниц ---------- */
console.log('\n1. Структура: один h1, lang, skip-link, main');
store.resetProfile();
store.setAnswers({ mood: ['relax'], modes: ['coop'], players: 4 });
store.markGame('balatro', 'liked');
const routes = ['/', 'quiz', 'results', 'catalog', 'genre/rpg', 'tag/coopfocused', 'mode/solo',
  'mood/relax', 'platform/pc', 'game/balatro', 'party', 'profile', 'account', 'terms', 'about',
  'privacy', 'no-such-route', 'game/no-such-game'];
const h1bad = [];
for (const r of routes) {
  await navigate(r);
  const h1 = count('h1');
  if (h1 !== 1) h1bad.push(`${r || '/'}:${h1}`);
}
check('ровно один h1 на каждой странице', h1bad.length === 0, h1bad.join(' ') || `${routes.length} маршрутов`);
// Порядок заголовков: уровни не должны перескакивать (Lighthouse heading-order).
// Раньше на каждой странице было h1 → h3 (карточки) и h2 → h4 (подвал).
const orderBad = [];
for (const r of routes) {
  await navigate(r);
  const levels = [...window.document.querySelectorAll('#app h1, #app h2, #app h3, #app h4, #app h5, #app h6')]
    .map((h) => Number(h.tagName[1]));
  let prev = 0;
  for (const l of levels) {
    if (prev && l > prev + 1) { orderBad.push(`${r || '/'}:${prev}→${l}`); break; }
    prev = l;
  }
}
check('уровни заголовков не перескакивают на всех страницах', orderBad.length === 0,
  orderBad.join(' ') || `${routes.length} маршрутов`);
// Имя ссылки-обложки должно содержать видимый текст (WCAG 2.5.3 Label in Name):
// внутри ссылки оценки и число игроков, а aria-label был только с названием игры.
await navigate('catalog');
const cover = window.document.querySelector('.card-cover');
const coverName = cover?.getAttribute('aria-label') || '';
const coverVisible = cover?.textContent.replace(/\s+/g, ' ').trim() || '';
const visibleParts = coverVisible.match(/\d+|\d+–\d+/g) || [];
check('имя ссылки-обложки включает видимый текст',
  !cover || visibleParts.every((part) => coverName.includes(part)),
  cover ? `aria-label «${coverName.slice(0, 60)}»` : 'нет карточек');

await navigate('/');
check('html lang соответствует языку', window.document.documentElement.lang === 'ru');
check('skip-link на месте', count('a.skip[href="#main"]') === 1);
check('main#main существует', count('main#main') === 1);

/* ---------- 2. Имена и подписи ---------- */
console.log('\n2. Доступные имена: кнопки, поля, картинки');
const unnamed = [];
const unlabelled = [];
let imgsNoAlt = 0;
for (const r of routes) {
  await navigate(r);
  window.document.querySelectorAll('button').forEach((b) => {
    const name = (b.textContent || '').trim() || b.getAttribute('aria-label') || b.title;
    if (!name) unnamed.push(`${r}:button.${b.className}`);
  });
  window.document.querySelectorAll('input, select').forEach((el) => {
    const ok = el.closest('label') || (el.id && window.document.querySelector(`label[for="${el.id}"]`))
      || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder');
    if (!ok) unlabelled.push(`${r}:${el.tagName}.${el.className}`);
  });
  window.document.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('alt')) imgsNoAlt += 1;
  });
}
check('все кнопки имеют имя', unnamed.length === 0, unnamed.slice(0, 4).join(' '));
check('все поля подписаны', unlabelled.length === 0, unlabelled.slice(0, 4).join(' '));
check('все картинки с alt', imgsNoAlt === 0);

/* ---------- 3. ARIA-состояния ---------- */
console.log('\n3. ARIA: переключатели, меню, фокус');
await navigate('catalog');
const chipsNoPressed = [...window.document.querySelectorAll('.chip-btn')]
  .filter((c) => !c.hasAttribute('aria-pressed')).length;
check('фильтры-чипы с aria-pressed', chipsNoPressed === 0);
const marksNoPressed = [...window.document.querySelectorAll('.mark')]
  .filter((c) => !c.hasAttribute('aria-pressed')).length;
check('отметки игр с aria-pressed', marksNoPressed === 0);
await navigate('quiz');
const optsNoPressed = [...window.document.querySelectorAll('.opt')]
  .filter((c) => !c.hasAttribute('aria-pressed')).length;
check('опции квиза с aria-pressed', optsNoPressed === 0);
const burger = window.document.querySelector('.burger');
check('бургер связан с меню через aria', burger?.getAttribute('aria-controls') === 'main-nav'
  && burger?.hasAttribute('aria-expanded') && Boolean(burger?.getAttribute('aria-label')));
const toggle = window.document.querySelector('.filters-toggle');
check('кнопка фильтров связана с панелью', !toggle || toggle.getAttribute('aria-controls') === 'catalog-filters');
const cssText = readFileSync(resolve(root, 'css/styles.css'), 'utf8');
check(':focus-visible оформлен', cssText.includes(':focus-visible'));
check('prefers-reduced-motion учтён', cssText.includes('prefers-reduced-motion'));

/* ---------- 4. Контраст текстовых пар ---------- */
console.log('\n4. WCAG-контраст ≥ 4.5:1 для текста (обе темы)');
const ast = css.parse(cssText);
const vars = { light: {}, dark: {} };
for (const rule of ast.stylesheet.rules) {
  if (rule.type !== 'rule') continue;
  const sel = (rule.selectors || []).join(',');
  const theme = sel === ':root' ? 'light' : sel === "[data-theme='dark']" ? 'dark' : null;
  if (!theme) continue;
  for (const d of rule.declarations || []) {
    if (d.type === 'declaration' && d.property?.startsWith('--')) vars[theme][d.property] = d.value.trim();
  }
}
const val = (theme, name) => vars[theme][name] || vars.light[name];
const lum = (hex) => {
  const h = hex.replace('#', '');
  const f = (i) => {
    const x = parseInt(h.slice(i, i + 2), 16) / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
// [текст, фон] — все пары, которыми реально набирается интерфейс
const pairs = [
  ['--text', '--bg'], ['--text-soft', '--bg'], ['--text-muted', '--bg'],
  ['--text-muted', '--bg-elevated'], ['--accent', '--bg'], ['--accent', '--accent-soft'],
  ['--accent-text', '--accent'], ['--warn', '--warn-soft'], ['--danger', '--danger-soft'],
  ['--danger', '--bg-elevated'], ['--success', '--bg-elevated'], ['--success', '--success-soft'],
  // блок рекламы: подпись и текст на «утопленном» фоне (Lighthouse нашёл 4.24 при пороге 4.5)
  ['--text-soft', '--bg-sunken'], ['--text-muted', '--bg-sunken'],
];
for (const theme of ['light', 'dark']) {
  const bad = [];
  for (const [fg, bg] of pairs) {
    const r = ratio(val(theme, fg), val(theme, bg));
    if (r < 4.5) bad.push(`${fg.replace('--', '')}/${bg.replace('--', '')}=${r.toFixed(2)}`);
  }
  check(`контрасты темы ${theme}`, bad.length === 0, bad.join(' ') || `${pairs.length} пар`);
}

/* ------------------------------------------------------------------ *
 * Заголовки в исходниках: открывающий и закрывающий теги одного уровня
 * ------------------------------------------------------------------ */

// Регресс: в кабинете было <h2 ...>…</h3> — браузер «чинил» разметку сам,
// и уровень заголовка на странице отличался от задуманного.
{
  const files = ['js/app.js', ...readdirSync(resolve(root, 'js/views')).map((f) => `js/views/${f}`)];
  const broken = [];
  for (const file of files) {
    const text = readFileSync(resolve(root, file), 'utf8');
    const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h([1-6])>/g;
    let match;
    while ((match = re.exec(text))) {
      if (match[1] !== match[3]) {
        const line = text.slice(0, match.index).split('\n').length;
        broken.push(`${file}:${line} h${match[1]}→h${match[3]}`);
      }
    }
  }
  check('уровень заголовка совпадает с закрывающим тегом', broken.length === 0, broken.join(', '));
}

console.log(`\nПроверок: ${passed + failures.length} · ✅ ${passed} · ❌ ${failures.length}`);
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
