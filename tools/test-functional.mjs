/**
 * Глубокий функциональный тест (jsdom): программно проходит ВСЕ сценарии QA-PLAN §1 —
 * квиз целиком, ветвления, лимиты, результаты, каталог, компания, профиль, консент,
 * тема/язык, i18n-покрытие ключей, движок. Дополняет smoke-test.mjs (там — рендер
 * страниц, здесь — поведение и состояния).
 *
 * Запуск: npm run test:functional
 */
import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
// модули обращаются к confirm/prompt без window.: в Node-окружении их нужно положить в globals
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
const eng = await import('../js/engine.js');
const quizDef = await import('../js/quiz.js');
const i18n = await import('../js/i18n.js');
const taxonomy = await import('../js/taxonomy.js');
const config = await import('../js/config.js');
await import('../js/app.js');

async function navigate(route) {
  nav.navigate(route.replace(/^#\/?/, ''));
  await new Promise((r) => setTimeout(r, 40));
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const text = () => window.document.body.textContent || '';
const count = (selector) => window.document.querySelectorAll(selector).length;
const click = (selector) => window.document.querySelector(selector)
  ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const clickAll = (selector, n = Infinity) => [...window.document.querySelectorAll(selector)]
  .slice(0, n).forEach((b) => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const currentQ = () => window.document.querySelector('.quiz-card')?.dataset.q;
const poolNum = () => {
  const m = (window.document.querySelector('.quiz-pool')?.textContent || '').match(/\d+/);
  return m ? Number(m[0]) : -1;
};

/* ============================ 1. Квиз: валидация ============================ */
console.log('\n1. Квиз: обязательность, лимиты, пропуск');
store.resetProfile();
await navigate('quiz');
check('старт с вопроса настроения', currentQ() === 'mood', currentQ());
click('[data-action="quiz-next"]');
await wait(30);
check('min=1: дальше без выбора не пускает', currentQ() === 'mood');
clickAll('.opt', 3);
await wait(20);
check('выбрано 3 настроения', count('.opt.on') === 3);
clickAll('.opt:not(.on)', 1);
await wait(20);
check('max=3: четвёртое настроение не выбирается', count('.opt.on') === 3);
click('[data-action="quiz-next"]');
await wait(30);
check('переход к вопросу компании', currentQ() === 'modes', currentQ());
click('[data-action="quiz-back"]');
await wait(30);
check('«Назад» возвращает и сохраняет выбор', currentQ() === 'mood' && count('.opt.on') === 3);
click('[data-action="quiz-next"]');
await wait(30);
click('[data-action="quiz-skip"]');
await wait(30);
check('«Пропустить» очищает ответ и идёт дальше', currentQ() === 'players'
  && JSON.stringify(store.getProfile().answers.modes || []) === '[]', currentQ());

/* ============================ 2. Квиз: ветвление ============================ */
console.log('\n2. Квиз: ветвление (соло/кооп, время/сессия)');
store.resetProfile();
await navigate('quiz');
// соло-путь: настроение → solo → 1 игрок → НЕТ вопроса company
clickAll('.opt', 1); await wait(15);
click('[data-action="quiz-next"]'); await wait(25);
[...window.document.querySelectorAll('.opt')].find((b) => b.dataset.id === 'solo')
  ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(15);
click('[data-action="quiz-next"]'); await wait(25);
[...window.document.querySelectorAll('.opt')].find((b) => b.dataset.id === '1')
  ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(15);
click('[data-action="quiz-next"]'); await wait(25);
check('соло-путь: вопроса «с кем играете» нет', currentQ() === 'platforms', currentQ());
// кооп-путь: назад, меняем на кооп + 4 игроков → company появляется
click('[data-action="quiz-back"]'); await wait(25);
[...window.document.querySelectorAll('.opt')].find((b) => b.dataset.id === '4')
  ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(15);
click('[data-action="quiz-next"]'); await wait(25);
check('кооп-путь: вопрос «с кем играете» есть', currentQ() === 'company', currentQ());
// время tiny скрывает вопрос session
store.resetProfile();
store.setAnswers({ mood: ['relax'], modes: [], players: 1, time: 'tiny' });
check('time=tiny скрывает session в flow',
  !quizDef.visibleQuestions(store.getProfile().answers).some((q) => q.id === 'session'));
store.setAnswers({ time: 'medium' });
check('time=medium возвращает session в flow',
  quizDef.visibleQuestions(store.getProfile().answers).some((q) => q.id === 'session'));

/* ================== 3. Квиз: счётчик пула и полное прохождение ================== */
console.log('\n3. Квиз: живой счётчик и проход до результатов');
store.resetProfile();
await navigate('quiz');
const pool0 = poolNum();
check('счётчик пула показывает весь каталог', pool0 === 437, String(pool0));
clickAll('.opt', 2); await wait(15);
check('счётчик пересчитался после ответов', poolNum() >= 0 && poolNum() <= pool0, String(poolNum()));
// отвечаем на всё подряд и доходим до результатов
let guard = 0;
while (nav.currentPath() !== 'results' && guard < 25) {
  guard += 1;
  const qid = currentQ();
  if (!qid) break;
  if (window.document.querySelector('#seed-list')) {
    clickAll('[data-action="seed-toggle"]', 2);
  } else {
    const q = quizDef.QUESTIONS.find((x) => x.id === qid);
    const n = q?.type === 'single' ? 1 : Math.min(2, q?.max || 2);
    clickAll('.opt:not(.on)', n);
  }
  await wait(15);
  click('[data-action="quiz-next"]');
  await wait(25);
}
check('полный проход квиза ведёт в результаты', nav.currentPath() === 'results', nav.currentPath());
check('в результатах есть карточки', count('.game-card') >= 3, `${count('.game-card')} шт.`);
check('у карточек есть объяснения', count('.why li') > 0);
check('seed-игры стали лайками', (store.getProfile().answers.seed || []).length === 2
  && Object.values(store.getProfile().marks).some((m) => m.status === 'liked'));

/* ================== 4. Квиз: продолжение после перерыва ================== */
console.log('\n4. Квиз: продолжение с первого неотвеченного');
store.resetProfile();
store.setAnswers({ mood: ['relax'], modes: ['coop'] });
await navigate('quiz');
check('возврат в квиз продолжает с players, а не сначала', currentQ() === 'players', currentQ());

/* ============================ 5. Результаты ============================ */
console.log('\n5. Результаты: отметки, переключатели, пересчёт');
store.resetProfile();
store.setAnswers({
  mood: ['laugh'], modes: ['coop'], players: 4, platforms: ['pc'],
  time: 'any', difficulty: [], genres: [], vibes: [], price: 'any', avoid: [],
});
await navigate('results');
const firstSlug = window.document.querySelector('.game-card')?.dataset.slug;
store.markGame(firstSlug, 'played');
await navigate('results');
const slugsHidden = [...window.document.querySelectorAll('.game-card')].map((c) => c.dataset.slug);
check('сыгранное скрыто из выдачи', !slugsHidden.includes(firstSlug));
// чекбокс кликаем через .click(): только он в jsdom переключает checked (activation behavior)
window.document.querySelector('[data-action="toggle-played"]')?.click();
await wait(40);
const playedBack = eng.recommend(store.getProfile(),
  { limit: 120, seed: store.getProfile().meta?.seed || 1, includePlayed: true }).list
  .some((x) => x.game.slug === firstSlug);
check('переключатель «показывать сыгранное» работает',
  store.getProfile().meta?.lastPreset?.includePlayed === true
  && window.document.querySelector('[data-action="toggle-played"]')?.checked === true
  && playedBack);
const slugsShown = [...window.document.querySelectorAll('.game-card')].map((c) => c.dataset.slug);
const orderBefore = slugsShown.slice(0, 5).join(',');
click('[data-action="reshuffle"]');
await wait(40);
const orderAfter = [...window.document.querySelectorAll('.game-card')].map((c) => c.dataset.slug).slice(0, 5).join(',');
check('«обновить подбор» меняет порядок', orderBefore !== orderAfter, `${orderBefore} → ${orderAfter}`);
const cardsBefore = count('.game-card');
click('[data-action="show-more"]');
await wait(40);
check('«показать ещё» догружает карточки', count('.game-card') > cardsBefore,
  `${cardsBefore} → ${count('.game-card')}`);
// отметка на странице результатов → плашка пересчёта
window.document.querySelector('[data-action="mark"][data-status="liked"]')
  ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(30);
check('отметка вызывает плашку «пересчитать»', count('.refresh-pill') === 1);

/* ============================ 6. Каталог ============================ */
console.log('\n6. Каталог: фильтры, поиск, сортировка, пагинация');
store.resetProfile();
await navigate('catalog');
check('каталог показывает 12 карточек', count('.game-card') === 12, `${count('.game-card')} шт.`);
click('[data-action="f-mode"][data-id="coopLocal"]');
await wait(40);
check('фильтр режима в адресе', nav.currentPath().includes('mode=coopLocal'), nav.currentPath());
check('активный чип можно снять', count('[data-action="f-remove"]') >= 1);
click('[data-action="f-players"][data-id="4"]');
await wait(40);
check('фильтры комбинируются', nav.currentPath().includes('players=4')
  && count('#catalog-found') === 1, nav.currentPath());
click('[data-action="f-remove"][data-kind="mode"]');
await wait(40);
check('снятие чипа убирает фильтр из адреса', !nav.currentPath().includes('mode='), nav.currentPath());
click('[data-action="f-price"][data-id="free"]');
await wait(40);
check('фильтр цены работает', nav.currentPath().includes('price=free'));
// поиск проверяем на чистых фильтрах (иначе цена/игроки могут скрыть найденное)
click('[data-action="f-reset"]');
await wait(40);
// поиск с дебаунсом + фокус не теряется
const input = window.document.querySelector('#catalog-q');
input.focus();
input.value = 'Ведьмак';
input.dispatchEvent(new window.Event('input', { bubbles: true }));
await wait(450);
check('поиск попал в адрес', nav.currentPath().includes('q='), nav.currentPath());
check('фокус поиска не потерян после пересчёта',
  window.document.activeElement?.id === 'catalog-q');
check('поиск находит игру', count('.game-card') >= 1, `${count('.game-card')} шт.`);
window.document.querySelector('#catalog-sort').value = 'year';
window.document.querySelector('#catalog-sort').dispatchEvent(new window.Event('change', { bubbles: true }));
await wait(40);
check('сортировка в адресе', nav.currentPath().includes('sort=year'), nav.currentPath());
click('[data-action="f-reset"]');
await wait(40);
check('сброс фильтров чистит адрес', nav.currentPath() === 'catalog', nav.currentPath());
click('[data-action="show-more"]');
await wait(40);
check('пагинация каталога: стало 24', count('.game-card') === 24, `${count('.game-card')} шт.`);
await navigate('catalog?mode=xxx&genre=yyy');
check('битые id в адресе не роняют страницу', count('.game-card') === 12 && count('[data-action="f-remove"]') === 0);
await navigate('catalog?mode=coopLocal&players=4');
check('ссылкой с фильтрами можно делиться', count('[data-action="f-remove"]') === 2
  && count('.game-card') > 0);

/* ============================ 7. Игра и компания ============================ */
console.log('\n7. Страница игры и компания');
store.resetProfile();
await navigate('game/balatro');
check('страница Balatro открылась', text().includes('Balatro'));
click('.marks [data-action="mark"][data-status="wishlist"]');
await wait(30);
check('отметка со страницы игры сохраняется', store.getMark('balatro') === 'wishlist');
await navigate('game/no-such-game-xyz');
check('несуществующая игра → аккуратное пустое состояние', count('.empty') === 1);
await navigate('party?players=8');
check('игроков больше 5 сводится к «5+»', text().includes('5'), text().slice(0, 80));
check('пресет 5 подсвечен', count('[data-action="p-players"].on') === 1);
await navigate('party');
click('[data-action="p-players"][data-id="4"]');
await wait(40);
check('выбор игроков в адресе', nav.currentPath().includes('players=4'), nav.currentPath());
click('[data-action="p-platform"][data-id="pc"]');
await wait(40);
check('платформа компании в адресе', nav.currentPath().includes('platforms=pc'), nav.currentPath());
click('[data-action="p-free"]');
await wait(40);
check('«только бесплатное» в адресе', nav.currentPath().includes('free=1'), nav.currentPath());

/* ============================ 8. Профиль ============================ */
console.log('\n8. Профиль: ответы, экспорт/импорт, сброс');
store.resetProfile();
store.setAnswers({ mood: ['relax'], modes: ['coop'], players: 4 });
store.markGame('balatro', 'liked');
await navigate('profile');
const chips = [...window.document.querySelectorAll('.answer-row .chip')].map((c) => c.textContent);
check('ответы квиза показаны понятными подписями, а не id',
  chips.some((c) => c.includes('кооп')) && !chips.includes('coop'), chips.join(' | '));
const exported = store.exportProfile();
check('экспорт — валидный JSON с отметками',
  JSON.parse(exported).marks?.balatro?.status === 'liked');
store.resetProfile();
check('импорт битого JSON отклоняется и не трёт данные',
  store.importProfile('{oops') === false && Object.keys(store.getProfile().marks).length === 0);
check('импорт восстанавливает профиль', store.importProfile(exported) === true
  && store.getMark('balatro') === 'liked');
await navigate('profile');
click('[data-action="mark-remove"]');
await wait(40);
check('снятие отметки из профиля работает', store.getMark('balatro') === null);
store.markGame('balatro', 'liked');
await navigate('profile');
click('[data-action="profile-reset"]');
await wait(40);
check('сброс профиля ведёт в квиз с чистым профилем',
  nav.currentPath() === 'quiz' && Object.keys(store.getProfile().marks).length === 0);

/* ============================ 9. Консент, тема, язык ============================ */
console.log('\n9. Консент, тема, язык, 404');
window.localStorage.removeItem('gf.consent.v1');
await navigate('catalog');
check('баннер согласия показывается', count('#consent') === 1);
click('[data-action="consent-decline"]');
await wait(30);
check('отказ запоминается и прячет баннер',
  window.localStorage.getItem('gf.consent.v1') === 'necessary' && count('#consent') === 0);
click('[data-action="theme-toggle"]');
await wait(20);
check('переключение темы применяется и сохраняется',
  window.document.documentElement.dataset.theme === 'dark'
  && store.getProfile().meta?.theme === 'dark');
click('[data-action="theme-toggle"]');
await wait(20);
click('[data-action="lang-toggle"]');
await wait(40);
check('переключение на английский переводит интерфейс',
  text().includes('Catalog') && store.getProfile().meta?.lang === 'en');
click('[data-action="lang-toggle"]');
await wait(40);
check('возврат на русский', text().includes('Каталог'));
await navigate('definitely-no-such-route');
check('404: шапка и подвал на месте, есть навигация домой',
  count('header.header') === 1 && count('footer.footer') === 1 && count('.empty a') >= 1);

/* ============================ 10. Аккаунт: сессии (мок API) ============================ */
console.log('\n10. Аккаунт: список сессий и отзыв (мок API)');
{
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    calls.push(`${opts.method || 'GET'} ${url}`);
    if (String(url).endsWith('/me/sessions') && (opts.method || 'GET') === 'GET') {
      return { ok: true, status: 200, text: async () => JSON.stringify({ sessions: [{ id: 's1', device: 'Chrome-Test', createdAt: 'сегодня' }] }) };
    }
    if (String(url).includes('/me/sessions/') && opts.method === 'DELETE') {
      return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({}) };
  };
  const api = await import('../js/api.js');
  config.SITE.apiBase = '/api';
  api.setSession('tok', { email: 'qa@example.com' });
  await navigate('account');
  await wait(120);
  check('сессии подгрузились асинхронно', text().includes('Chrome-Test'));
  click('[data-action="session-revoke"]');
  await wait(120);
  check('отзыв сессии уходит на сервер и список обновляется',
    calls.some((c) => c.startsWith('DELETE')) && calls.filter((c) => c.startsWith('GET')).length >= 2,
    calls.join(' | '));
  api.clearSession();
  config.SITE.apiBase = '';
  globalThis.fetch = realFetch;
}

/* ============================ 11. i18n: покрытие ключей ============================ */
console.log('\n11. i18n: все ключи из кода есть в ru и en');
{
  const files = [];
  const walk = (dir) => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const p = resolve(dir, f.name);
      if (f.isDirectory()) walk(p);
      else if (f.name.endsWith('.js')) files.push(p);
    }
  };
  walk(resolve(root, 'js'));
  const literalKeys = new Set();
  const labelKeys = new Set();
  for (const f of files) {
    if (f.endsWith('i18n.js')) continue;
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(?<![\w$])t\(\s*['"]([^'"]+)['"]/g)) literalKeys.add(m[1]);
    for (const m of src.matchAll(/labelKey:\s*['"]([^'"]+)['"]/g)) labelKeys.add(m[1]);
  }
  const missing = [...literalKeys, ...labelKeys].filter((k) => !i18n.STRINGS.ru[k] || !i18n.STRINGS.en[k]);
  check('литеральные t()/labelKey покрыты словарями', missing.length === 0,
    `${literalKeys.size + labelKeys.size} ключей${missing.length ? `, нет: ${missing.slice(0, 5).join(', ')}` : ''}`);
  // динамические семейства ключей
  const dyn = [];
  for (let n = 1; n <= 3; n++) dyn.push(`home.how.${n}.title`, `home.how.${n}.text`);
  for (const id of ['pool', 'explain', 'party', 'privacy']) dyn.push(`home.feature.${id}.title`, `home.feature.${id}.text`);
  for (const id of ['rating', 'year', 'short', 'players', 'title']) dyn.push(`catalog.sort.${id}`);
  for (const q of quizDef.QUESTIONS) dyn.push(`${q.key}.title`, `${q.key}.text`);
  for (const s of ['played', 'liked', 'disliked', 'wishlist']) dyn.push(`mark.${s}`);
  for (const vals of Object.values(quizDef.ANSWER_LABELS)) dyn.push(...Object.values(vals));
  for (const o of quizDef.AVOID_OPTIONS) dyn.push(`avoid.${o.id}`);
  const missingDyn = [...new Set(dyn)].filter((k) => !i18n.STRINGS.ru[k] || !i18n.STRINGS.en[k]);
  check('динамические семейства ключей покрыты', missingDyn.length === 0,
    `${new Set(dyn).size} ключей${missingDyn.length ? `, нет: ${missingDyn.slice(0, 5).join(', ')}` : ''}`);
  // словари таксономии полные
  const dicts = { GENRES: taxonomy.GENRES, TAGS: taxonomy.TAGS, MODES: taxonomy.MODES, MOODS: taxonomy.MOODS, PLATFORMS: taxonomy.PLATFORMS, PRICE: taxonomy.PRICE };
  const badDict = [];
  for (const [name, dict] of Object.entries(dicts)) {
    for (const [id, v] of Object.entries(dict)) {
      if (typeof v?.ru !== 'string' || !v.ru || typeof v?.en !== 'string' || !v.en) badDict.push(`${name}.${id}`);
    }
  }
  check('таксономия: у всех записей есть ru и en', badDict.length === 0, badDict.slice(0, 5).join(', '));
  // ссылки квиза на таксономию валидны
  const badRef = [
    ...quizDef.VIBE_TAGS.filter((id) => !taxonomy.TAGS[id]).map((id) => `VIBE:${id}`),
    ...quizDef.AVOID_OPTIONS.flatMap((o) => [
      ...(o.tags || []).filter((id) => !taxonomy.TAGS[id]).map((id) => `AVOID.tag:${id}`),
      ...(o.genres || []).filter((id) => !taxonomy.GENRES[id]).map((id) => `AVOID.genre:${id}`),
    ]),
  ];
  for (const group of Object.values(eng.PREFERENCES)) {
    for (const pref of Object.values(group)) {
      for (const id of pref.tags || []) if (!taxonomy.TAGS[id]) badRef.push(`PREF.tag:${id}`);
      for (const id of pref.genres || []) if (!taxonomy.GENRES[id]) badRef.push(`PREF.genre:${id}`);
      for (const id of Object.keys(pref.mood || {})) if (!taxonomy.MOODS[id]) badRef.push(`PREF.mood:${id}`);
      for (const id of pref.price || []) if (!taxonomy.PRICE[id]) badRef.push(`PREF.price:${id}`);
    }
  }
  check('движок ссылается только на существующие id', badRef.length === 0, badRef.slice(0, 8).join(', '));
}

/* ============================ 12. Движок: свойства ============================ */
console.log('\n12. Движок: детерминизм, фильтры, устойчивость');
{
  const p = {
    answers: { mood: ['relax'], modes: ['coop'], players: 4, time: 'any', price: 'any', avoid: [] },
    marks: {}, impressions: {},
  };
  const r1 = eng.recommend(p, { limit: 12, seed: 5 });
  const r2 = eng.recommend(p, { limit: 12, seed: 5 });
  const r3 = eng.recommend(p, { limit: 12, seed: 6 });
  check('одинаковый seed → одинаковый порядок',
    r1.list.map((x) => x.game.slug).join(',') === r2.list.map((x) => x.game.slug).join(','));
  check('другой seed → другие баллы',
    r1.list.map((x) => x.score.toFixed(3)).join(',') !== r3.list.map((x) => x.score.toFixed(3)).join(','));
  check('у топа есть объяснения «почему»', r1.list[0]?.why?.length > 0);
  check('пул меньше каталога при фильтрах', r1.poolSize > 0 && r1.poolSize < 437, String(r1.poolSize));
  const empty = eng.recommend({ answers: {}, marks: {}, impressions: {} }, { limit: 12, seed: 1 });
  check('пустой профиль даёт полный пул без падений', empty.poolSize === 437 && empty.list.length > 0);
  const weird = eng.recommend(
    { answers: { modes: ['mmo'], players: 8, time: 'tiny', price: 'free' }, marks: { 'no-such-game': { status: 'liked', ts: 1 } }, impressions: {} },
    { limit: 12, seed: 1 },
  );
  check('странный профиль (битые отметки, жёсткие фильтры) не роняет движок',
    Array.isArray(weird.list), `пул: ${weird.poolSize}, relaxed: ${weird.relaxed}`);
  const { score, neighbours } = eng.scoreGame(r1.list[0].game, p, eng.computeWeights(p));
  check('скоринг возвращает число и корректный neighbours',
    Number.isFinite(score) && (neighbours === null || typeof neighbours.slug === 'string'));
  const party = eng.recommendForParty({ players: 4, platforms: ['pc'], limit: 24, seed: 7 });
  check('подбор для компании возвращает игры', party.length > 0
    && party.every((g) => g.players[1] >= 4), `${party.length} шт.`);
  check('похожие игры находятся', eng.similarTo('balatro', 6).length === 6);
}

console.log(`\nПроверок: ${passed + failures.length} · ✅ ${passed} · ❌ ${failures.length}`);
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
