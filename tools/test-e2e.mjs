/**
 * Сквозной тест: интерфейс в jsdom + настоящий API-воркер + настоящая база SQLite.
 *
 * Проверяем то, что видит пользователь, целиком, без заглушек:
 *   регистрация через форму → создание аккаунта в базе → сохранение профиля вкуса →
 *   отметка игры и автосинхронизация → выход → вход с неверным и верным паролем →
 *   синхронизация на «другом устройстве» (новый профиль из базы).
 *
 * Запуск: node --experimental-sqlite tools/test-e2e.mjs
 */
import { JSDOM } from 'jsdom';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const api = (await import(new URL('../worker/index.js', import.meta.url).href)).default;

let passed = 0;
let failed = 0;
const check = (name, condition, detail = '') => {
  if (condition) { passed += 1; console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`); }
  else { failed += 1; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};

/* ------------------------------------------------------------------ *
 * 1. База и воркер под локальным /api
 * ------------------------------------------------------------------ */

const db = new DatabaseSync(':memory:');
db.exec(readFileSync(resolve(root, 'worker/schema.sql'), 'utf8'));

const DB = {
  prepare(sql) {
    const params = [];
    const self = {
      bind: (...values) => { params.push(...values); return self; },
      first: () => { const row = db.prepare(sql).get(...params); return row ? Object.assign({}, row) : null; },
      run: () => { db.prepare(sql).run(...params); return { ok: true }; },
      all: () => ({ results: db.prepare(sql).all(...params).map((r) => Object.assign({}, r)) }),
    };
    return self;
  },
};

const env = {
  DB,
  ALLOWED_ORIGINS: 'http://localhost',
  MIN_PASSWORD_LENGTH: '10',
  SITE_URL: 'http://localhost',
  GOOGLE_CLIENT_ID: '',
};

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  // клиент вызывает относительные адреса (/api/...), как в браузере
  const href = new URL(String(url), 'http://localhost').href;
  if (href.startsWith('http://localhost/api/')) {
    // реальный путь пользователя: браузер → /api/* → воркер
    const request = new Request(href, {
      method: options.method,
      headers: { ...options.headers, Origin: 'http://localhost', 'CF-Connecting-IP': '198.51.100.20' },
      body: options.body,
    });
    return api.fetch(request, env);
  }
  return realFetch(url, options);
};

/* ------------------------------------------------------------------ *
 * 2. jsdom и приложение
 * ------------------------------------------------------------------ */

const dom = new JSDOM(readFileSync(resolve(root, 'index.html'), 'utf8'), { url: 'http://localhost/#/', pretendToBeVisual: true });
const { window } = dom;
for (const key of ['document', 'localStorage', 'sessionStorage', 'CustomEvent', 'Event', 'HTMLElement', 'Node',
  'FormData', 'EventTarget', 'MouseEvent', 'KeyboardEvent', 'AbortController', 'Request', 'Response', 'Headers']) {
  try { if (window[key]) globalThis[key] = window[key]; } catch { /* read-only */ }
}
try { Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true }); } catch { /* ignore */ }
for (const key of ['location', 'history']) {
  try { Object.defineProperty(globalThis, key, { value: window[key], configurable: true }); } catch { /* ignore */ }
}
globalThis.window = window;
window.scrollTo = () => {};
window.confirm = () => true;
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

const config = await import('../js/config.js');
config.SITE.apiBase = '/api';                    // включаем серверный режим
const nav = await import('../js/nav.js');
await import('../js/app.js');

const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const navigate = async (route) => { nav.navigate(route); await tick(80); };
const text = () => window.document.body.textContent || '';
const count = (selector) => window.document.querySelectorAll(selector).length;
const click = (selector) => {
  const node = window.document.querySelector(selector);
  if (!node) throw new Error(`не найден элемент ${selector}`);
  node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
};

const EMAIL = 'e2e@gustoplay.ru';
const PASSWORD = 'E2e-Parol-2026!';

/* ------------------------------------------------------------------ *
 * 3. Регистрация через форму
 * ------------------------------------------------------------------ */

console.log('\n1. Регистрация через интерфейс');
await navigate('account');
check('форма входа открыта', count('#auth-form') === 1);

click('[data-action="auth-tab"][data-mode="register"]');
await tick();
const form = window.document.querySelector('#auth-form');
const setField = (name, value) => {
  const input = form.querySelector(`[name="${name}"]`);
  input.value = value;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
};
setField('name', 'Тестовый игрок');
setField('email', EMAIL);
setField('password', PASSWORD);
form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await tick(400);

check('после регистрации показан кабинет', text().includes('Вы вошли как'), text().slice(0, 40).replace(/\s+/g, ' '));
check('токен сохранён в браузере', Boolean(window.localStorage.getItem('pn.token.v1')));
check('пользователь появился в базе', db.prepare('SELECT COUNT(*) AS n FROM users WHERE email = ?').get(EMAIL).n === 1);
check('в базе нет открытого пароля', !JSON.stringify(db.prepare('SELECT * FROM users').all()).includes(PASSWORD));
check('профиль вкуса загружен на сервер при регистрации', db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n === 1, 'профиль создан');

/* ------------------------------------------------------------------ *
 * 4. Отметки игр и автосинхронизация
 * ------------------------------------------------------------------ */

console.log('\n2. Отметки игр и автосинхронизация');
const store = await import('../js/store.js');
store.setAnswers({ mood: ['relax'], modes: ['solo'], players: 1, time: 'any' });
await navigate('results');
check('выдача построилась', count('.game-card') > 0, `${count('.game-card')} карточек`);

const firstCard = window.document.querySelector('.game-card');
const slug = firstCard.dataset.slug;
click(`.game-card[data-slug="${slug}"] [data-action="mark"][data-status="liked"]`);
await tick(60);
check('отметка «понравилось» сохранена локально', JSON.parse(window.localStorage.getItem('gf.profile.v1')).marks[slug].status === 'liked');

console.log('   (ждём автоотправку профиля — 4 секунды)');
await tick(4800);
const remote = JSON.parse(db.prepare('SELECT profile FROM profiles LIMIT 1').get().profile);
check('профиль улетел на сервер автоматически', Boolean(remote.marks?.[slug]), `отмечено: ${slug}`);
check('ответы квиза тоже синхронизированы', remote.answers?.mood?.[0] === 'relax');

/* ------------------------------------------------------------------ *
 * 5. Выход и вход
 * ------------------------------------------------------------------ */

console.log('\n3. Выход и вход');
await navigate('account');
check('кабинет доступен по адресу /account', text().includes('Вы вошли как'));
click('[data-action="auth-logout"]');
await tick(200);
check('выход очистил токен', !window.localStorage.getItem('pn.token.v1'));
check('сессии пользователя в базе удалены', db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n === 0);

await navigate('account');
check('после выхода показывается форма входа, а не регистрация', count('#auth-form input[name="name"]') === 0);
const loginForm = window.document.querySelector('#auth-form');
const fill = (name, value) => {
  const input = loginForm.querySelector(`[name="${name}"]`);
  input.value = value;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
};
fill('email', EMAIL);
fill('password', 'Неверный-пароль-123');
loginForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await tick(300);
check('неверный пароль показывает понятную ошибку', /неверный e-mail или пароль/i.test(text()),
  (text().match(/Неверный[^]*?пароль/i) || [''])[0]);

const loginForm2 = window.document.querySelector('#auth-form');
const fill2 = (name, value) => {
  const input = loginForm2.querySelector(`[name="${name}"]`);
  input.value = value;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
};
fill2('email', EMAIL);
fill2('password', PASSWORD);
loginForm2.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await tick(400);
check('вход с верным паролем проходит', text().includes('Вы вошли как'));
check('профиль вкуса подтянулся из базы', JSON.parse(window.localStorage.getItem('gf.profile.v1')).marks?.[slug]?.status === 'liked');
check('на сервере создана новая сессия', db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n === 1);

/* ------------------------------------------------------------------ *
 * 6. «Другое устройство»
 * ------------------------------------------------------------------ */

console.log('\n4. Другое устройство (чистый браузер)');
window.localStorage.removeItem('gf.profile.v1');
const token = window.localStorage.getItem('pn.token.v1');
const { pullProfile, me } = await import('../js/api.js');
check('сессия жива на новом устройстве', (await me()) !== null && Boolean(token), `токен ${token.slice(0, 6)}…`);
const pulled = await pullProfile();
check('профиль вкуса доступен на новом устройстве', Boolean(pulled?.marks?.[slug]), `отметок: ${Object.keys(pulled?.marks || {}).length}`);

console.log(`\nПроверок: ${passed + failed} · ✅ ${passed} · ❌ ${failed}`);
process.exit(failed ? 1 : 0);
