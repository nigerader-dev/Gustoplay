/**
 * Дымовой тест интерфейса в jsdom: поднимает index.html, подключает app.js и проходит по всем
 * маршрутам — проверяет, что каждая страница рендерится, карточки и фильтры работают.
 *
 * Запуск:  npm install --no-save jsdom && node tools/smoke-test.mjs
 * (не входит в зависимости рантайма: сайт работает без сборки и без npm-пакетов).
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

const dom = new JSDOM(html, { url: `${'http://localhost'}/#/`, pretendToBeVisual: true });
const { window } = dom;

// глобальные объекты, которые ожидает код приложения
for (const key of ['document', 'localStorage', 'sessionStorage', 'CustomEvent', 'Event', 'HTMLElement', 'Node']) {
  try { globalThis[key] = window[key]; } catch { /* свойство только для чтения — используем window напрямую */ }
}
try { Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true }); } catch { /* ignore */ }
globalThis.window = window;
// в браузере location/document/навигация — глобальные объекты, в Node их нужно подложить
for (const key of ['location', 'history']) {
  try { Object.defineProperty(globalThis, key, { value: window[key], configurable: true }); } catch { /* ignore */ }
}
window.scrollTo = () => {};
window.confirm = () => true;
window.prompt = () => null;
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

const failures = [];
const check = (name, condition, extra = '') => {
  if (condition) console.log(`  ✅ ${name}${extra ? ` — ${extra}` : ''}`);
  else { console.log(`  ❌ ${name}`); failures.push(name); }
};

const nav = await import('../js/nav.js');

/** Навигация через публичное API приложения: работает в обоих режимах адресов */
async function navigate(route) {
  nav.navigate(route.replace(/^#\/?/, ''));
  await new Promise((r) => setTimeout(r, 30));
}

const text = () => window.document.body.textContent || '';
const count = (selector) => window.document.querySelectorAll(selector).length;

console.log('Инициализация приложения…');
console.log(`  режим адресов: ${nav.PATH_MODE ? 'пути (/game/…) с History API' : 'hash (#/game/…)'}`);
await import('../js/app.js');

console.log('\n1. Главная страница');
check('шапка и подвал отрисованы', count('header.header') === 1 && count('footer.footer') === 1);
check('есть кнопка старта подбора', count('a[href="#/quiz"], a[href="/quiz"]') > 0);
check('есть блоки быстрого старта', count('.quick') >= 6);
check('отрисованы карточки игр', count('.game-card') >= 3, `${count('.game-card')} шт.`);
check('есть рекламный слот (заглушка)', count('.ad-slot, .ad-mock') >= 1);
check('обложки генерируются как SVG', count('img[src^="data:image/svg"]') > 0);

console.log('\n1b. Ссылки шапки (регресс: в PATH-режиме работают, а не уходят в hash)');
{
  const headerLink = window.document.querySelector('header a[href="/catalog"], header a[href="#/catalog"]');
  check('в шапке есть ссылка на каталог', Boolean(headerLink));
  headerLink?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 40));
  check('клик по шапке открывает каталог', nav.currentPath() === 'catalog' && count('.game-card') > 0, nav.currentPath());
  check('в адресе нет остатков hash', !window.location.hash, window.location.hash ? `hash: ${window.location.hash}` : 'hash пуст');
}

console.log('\n2. Квиз');
await navigate('quiz');
check('первый вопрос про настроение', text().includes('Что сейчас хочется'));
check('вариантов ответа 10+', count('.opt') >= 10, `${count('.opt')} шт.`);
// выбираем два настроения и идём дальше
const firstTwo = [...window.document.querySelectorAll('.opt')].slice(0, 2);
firstTwo.forEach((b) => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
await new Promise((r) => setTimeout(r, 20));
check('выбор настроений подсвечен', count('.opt.on') === 2);
window.document.querySelector('[data-action="quiz-next"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));
check('перешли к вопросу о компании', text().includes('С кем играем'));

console.log('\n2b. Ветвление квиза и живой счётчик');
check('есть живой счётчик пула', count('.quiz-pool') === 1 && /\d/.test(window.document.querySelector('.quiz-pool')?.textContent || ''));
// выбираем кооп и 4 игрока, затем проверяем, что появился вопрос «с кем играете»
const coopBtn = [...window.document.querySelectorAll('.opt')].find((b) => b.textContent.includes('кооп'));
if (coopBtn) coopBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
window.document.querySelector('[data-action="quiz-next"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));
const fourBtn = [...window.document.querySelectorAll('.opt')].find((b) => b.textContent.includes('3–4'));
if (fourBtn) fourBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
window.document.querySelector('[data-action="quiz-next"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));
check('появился вопрос «с кем обычно играете»', text().includes('С кем обычно играете'), text().slice(0, 60));
const kidsBtn = [...window.document.querySelectorAll('.opt')].find((b) => b.textContent.includes('детьми'));
if (kidsBtn) kidsBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
window.document.querySelector('[data-action="quiz-next"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));
check('следующий вопрос — платформы', text().includes('На чём будете играть'));

console.log('\n3. Ответы и результаты');
const app = await import('../js/store.js');
app.setAnswers({
  mood: ['laugh', 'adrenaline'], modes: ['coop'], players: 4, platforms: ['pc'],
  time: 'short', difficulty: [], genres: ['horror'], vibes: ['coopfocused'], avoid: ['grind'], price: 'any',
});
await navigate('results');
check('страница результатов открылась', text().includes('Ваши игры'));
check('есть объяснения «почему подходит»', count('.why') > 0);
check('в выдаче есть кооперативные игры', count('.game-card') >= 3, `${count('.game-card')} карточек`);
check('видна уверенность подбора', count('.results-confidence') === 1);

const beforeMark = window.document.querySelector('.game-card .card-title a').textContent;
const likedBtn = window.document.querySelector('[data-action="mark"][data-status="liked"]');
likedBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));
check('отметка «понравилось» сохранена', app.getMark(window.document.querySelector('.game-card').dataset.slug) === 'liked', beforeMark);

console.log('\n4. Каталог и фильтры');
await navigate('catalog');
const total = count('.game-card');
check('каталог отрисован', total > 0, `${total} карточек на странице`);
window.document.querySelector('[data-action="f-mode"][data-id="coopLocal"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 40));
check('фильтр по локальному коопу попал в адрес', nav.currentPath().includes('mode=coopLocal'), nav.currentPath());
check('каталог сузился', count('.game-card') > 0 && count('.game-card') <= total, `${count('.game-card')} карточек`);
window.document.querySelector('[data-action="f-reset"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 40));

console.log('\n5. SEO-разделы (жанр/тег/режим/настроение)');
for (const hash of ['genre/rpg', 'tag/coopfocused', 'mode/solo', 'mood/relax', 'platform/pc']) {
  await navigate(hash);
  check(`раздел /${hash} рендерится`, count('.game-card') > 0, `${count('.game-card')} игр`);
}

console.log('\n6. Страница игры');
await navigate('game/it-takes-two');
check('заголовок игры на месте', text().includes('It Takes Two'));
check('есть блок похожих игр', text().includes('Похожие игры'));
check('есть ссылки в магазины', count('.stores a') >= 2);
check('есть JSON-LD для поисковиков', !!window.document.head.querySelector('script[data-gf-jsonld]'));

console.log('\n7. Компания');
await navigate('party?players=4&platforms=pc');
check('подбор для компании работает', count('.game-card') >= 3, `${count('.game-card')} игр`);
check('есть подпись про 4 игроков', text().includes('4'));

console.log('\n8. Профиль вкуса');
await navigate('profile');
check('страница профиля открылась', text().includes('Мой вкус'));
check('видно отметки игр', count('.mark-row') >= 1);
check('есть гистограмма тегов', count('.bar-row') > 0);

console.log('\n8b. Аккаунт (локальный режим без API)');
await navigate('account');
check('страница аккаунта открылась', text().includes('Аккаунт'));
check('видно объяснение локального режима', text().includes('Сервер аккаунтов не подключён'));

console.log('\n8c. Аккаунт с подключённым API (формы входа, сброса пароля)');
const config = await import('../js/config.js');
config.SITE.apiBase = '/api';           // включаем серверный режим «на сухую»: реальные запросы не отправляем
await navigate('account');
check('показана форма входа', text().includes('Вход') && count('#auth-form') === 1);
check('есть ссылка «Забыли пароль»', count('[data-action=\"auth-tab\"][data-mode=\"forgot\"]') === 1);
window.document.querySelector('[data-action="auth-tab"][data-mode="forgot"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 30));
check('форма сброса пароля открылась', count('#forgot-form') === 1 && text().includes('Сброс пароля'));
window.document.querySelector('[data-action="auth-tab"][data-mode="login"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 30));
window.history.pushState(null, '', '/account?reset=TESTTOKEN');
window.dispatchEvent(new window.PopStateEvent('popstate'));
await new Promise((r) => setTimeout(r, 30));
check('ссылка из письма открывает форму нового пароля', count('#reset-form') === 1);
check('есть индикатор надёжности пароля', count('.pw-meter') === 1);
config.SITE.apiBase = '';              // возвращаем локальный режим

console.log('\n9. Прочее');
await navigate('about');
check('страница «как это работает» рендерится', text().includes('Как это работает'));
await navigate('privacy');
check('политика конфиденциальности на месте', text().includes('Политика конфиденциальности') || text().includes('Privacy'));
await navigate('terms');
check('условия использования открываются', text().includes('Условия использования'));
check('есть раскрытие партнёрских ссылок', text().includes('партнёрск'));
check('есть пометка про рекламу', text().includes('реклам'));
await navigate('nonexistent-route');
check('404 отображается корректно', text().includes('не найдена') || text().includes('not found'));
await navigate('game/does-not-exist');
check('несуществующая игра не ломает страницу', text().includes('не найдена') || text().includes('Не нашли') || count('.empty') > 0);

console.log('\n9b. Canonical (регресс: query/слэш/база не должны ломать адрес)');
{
  const canonicalOf = () => window.document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
  const rootNoSlash = config.SITE.url.replace(/\/+$/, '');
  await navigate('catalog?mode=coop');
  check('canonical не наследует query-строку', canonicalOf() === `${rootNoSlash}/catalog`, canonicalOf());
  window.history.pushState(null, '', '/quiz/');
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  await new Promise((r) => setTimeout(r, 30));
  check('canonical без висячего слэша', canonicalOf() === `${rootNoSlash}/quiz`, canonicalOf());
  window.history.pushState(null, '', '/');
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  await new Promise((r) => setTimeout(r, 30));
  check('canonical корня заканчивается слэшем', canonicalOf() === `${rootNoSlash}/`, canonicalOf());
  // База деплоя (GitHub Pages): /mydev отрезается, canonical остаётся адресом сайта,
  // а в разметке появляются ссылки с префиксом базы.
  config.SITE.base = '/mydev';
  window.history.pushState(null, '', '/mydev/quiz/');
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  await new Promise((r) => setTimeout(r, 30));
  check('база /mydev отрезается от текущего пути', nav.currentPath().replace(/\/$/, '') === 'quiz', `currentPath: ${nav.currentPath()}`);
  check('canonical при базе без двойного префикса', canonicalOf() === `${rootNoSlash}/quiz`, canonicalOf());
  check('ссылки шапки получают базу', Boolean(window.document.querySelector('header a[href="/mydev/quiz"]')));
  config.SITE.base = '';
}

console.log('\n10. Вход по «настоящему» адресу (важно для SEO и пре-рендера)');
{
  const { JSDOM } = await import('jsdom');
  const html2 = readFileSync(resolve(root, 'index.html'), 'utf8');
  const dom2 = new JSDOM(html2, { url: 'http://localhost/game/balatro', pretendToBeVisual: true });
  const w2 = dom2.window;
  for (const key of ['document', 'localStorage', 'sessionStorage', 'CustomEvent', 'Event', 'HTMLElement', 'Node']) {
    try { globalThis[key] = w2[key]; } catch { /* ignore */ }
  }
  try { Object.defineProperty(globalThis, 'navigator', { value: w2.navigator, configurable: true }); } catch { /* ignore */ }
  for (const key of ['location', 'history']) {
    try { Object.defineProperty(globalThis, key, { value: w2[key], configurable: true }); } catch { /* ignore */ }
  }
  globalThis.window = w2;
  w2.scrollTo = () => {};
  const appModule = await import(`../js/app.js?direct=${Date.now()}`);
  await new Promise((r) => setTimeout(r, 40));
  check('открытие /game/balatro сразу рендерит игру', (w2.document.body.textContent || '').includes('Balatro'));
  void appModule;
}

console.log(`\n${failures.length ? `❌ Провалено проверок: ${failures.length}` : '✅ Все проверки пройдены'}`);
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
