/**
 * Хранилище профиля вкуса. Всё живёт в localStorage браузера пользователя —
 * регистрации нет, на сервер ничего не уходит.
 *
 * Ключи:
 *   gf.profile.v1  — профиль (ответы квиза, отметки, показы)
 *   gf.consent.v1  — согласие на рекламные cookie
 *   gf.seen.v1     — какие игры уже показывались (для «обновить подбор»)
 */
import { emptyProfile } from './engine.js';
import { CONTENT, AUTH } from './config.js';
import { normalizeAnswers } from './quiz.js';

const PROFILE_KEY = 'gf.profile.v1';
const CONSENT_KEY = 'gf.consent.v1';

const listeners = new Set();
let cache = null;

const safeParse = (raw, fallback) => {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};

/**
 * Любой внешний профиль (localStorage, файл импорта, аккаунт) → форма текущей версии.
 * Ответы нормализуем: в старом профиле мульти-ответ (modes, genres, mood…) мог оказаться
 * скаляром, и тогда страницы «Результаты» и «Мой вкус» падали с TypeError.
 */
function mergeProfile(next = {}) {
  const base = emptyProfile();
  return {
    ...base,
    ...next,
    answers: normalizeAnswers({ ...base.answers, ...(next.answers || {}) }),
    marks: next.marks || {},
    impressions: normalizeImpressions(next.impressions),
  };
}

/**
 * Браузер может запретить запись (приватный режим Safari, переполненная квота,
 * запрет сторонних данных). Раньше это происходило молча: человек ставил отметки,
 * а после перезагрузки они исчезали, и было непонятно почему. Теперь факт запоминаем
 * и показываем в интерфейсе предупреждение.
 */
let storageBroken = false;
export const isStorageBroken = () => storageBroken;

/** Чтение из localStorage: в приватном режиме само обращение может бросить исключение */
function readRaw() {
  try { return globalThis.localStorage?.getItem(PROFILE_KEY) ?? null; } catch { return null; }
}

function read() {
  if (cache) return cache;
  const stored = safeParse(readRaw(), null);
  cache = stored ? mergeProfile(stored) : emptyProfile();
  return cache;
}

function write(profile, { skipSync = false } = {}) {
  cache = profile;
  try {
    globalThis.localStorage?.setItem(PROFILE_KEY, JSON.stringify(profile));
    storageBroken = false;
  } catch { storageBroken = true; /* приватный режим — работаем в памяти */ }
  listeners.forEach((fn) => fn(profile));
  if (!skipSync) scheduleSync(profile);
}

/**
 * Ответы квиза: свежая версия главнее, но пустое не затирает заполненное.
 * Без этого свежий, но неполный профиль (например, квиз прошли заново и ответили
 * на часть вопросов) вычищал ответы из второй копии — в «Моём вкусе» пропадали жанры.
 */
const isBlank = (value) => value === null || value === undefined || value === ''
  || value === false || (Array.isArray(value) && value.length === 0);

function mergeAnswers(newer, older) {
  const out = { ...older, ...newer };
  for (const [key, value] of Object.entries(older)) {
    if (isBlank(out[key]) && !isBlank(value)) out[key] = value;
  }
  return out;
}

/** Попросить интерфейс перерисоваться (без прямого импорта app.js) */
function dispatchUiEvent() {
  try {
    if (typeof CustomEvent === 'function' && typeof globalThis.dispatchEvent === 'function') {
      globalThis.dispatchEvent(new CustomEvent('gf:rerender'));
    }
  } catch { /* интерфейс обновится при следующем переходе */ }
}

/* --------------------------- синхронизация с аккаунтом --------------------------- */

let syncTimer = null;
let syncEnabled = true;
/** Профиль, который ещё не уехал на сервер (ждёт таймера или отправлен в keepalive) */
let pending = null;
/** Причина, по которой сервер отказался принять профиль (пустая строка — всё в порядке) */
let syncError = '';
/** Отметок стало больше лимита CONTENT.maxMarks — новые уже не помещаются в профиль */
let marksCapped = false;

export const getSyncError = () => syncError;
export const clearSyncError = () => { syncError = ''; };
export const isMarksCapped = () => marksCapped;
export const marksLimit = () => CONTENT.maxMarks;

/** Сколько игр отмечено в профиле — для понятных сообщений в интерфейсе */
export const countMarks = (profile) => Object.keys(profile?.marks || {}).length;

/**
 * Слияние локального профиля с серверным — вместо прежней полной замены.
 *
 * Почему: при загрузке страницы и после входа профиль с сервера подменял локальный
 * целиком. Если пользователь отметил игру только что (автоотправка ждёт 4 секунды)
 * или был офлайн, эти отметки молча пропадали; вместе с ними сбрасывались тема
 * и язык, потому что они тоже лежат в профиле. Теперь ничего не теряется:
 *   • отметки — по одной: у кого новее `ts`, тот и прав; отметка, которой нет
 *     на другой стороне, остаётся;
 *   • показы (impressions) — берём большее число и свежую дату;
 *   • история показов — объединение без повторов;
 *   • ответы квиза — по более поздней дате прохождения, недостающие поля
 *     добираются из второй стороны;
 *   • meta — локальные настройки устройства (тема, язык) не трогаем, остальное
 *     добираем из серверных.
 */
export function mergeProfiles(local, remote) {
  const a = mergeProfile(local || {});
  const b = mergeProfile(remote || {});
  if (!remote) return a;
  if (!local) return b;

  const marks = { ...b.marks };
  for (const [slug, mine] of Object.entries(a.marks)) {
    const theirs = marks[slug];
    if (!theirs || (mine.ts || 0) >= (theirs.ts || 0)) marks[slug] = mine;
  }

  const impressions = { ...b.impressions };
  for (const [slug, mine] of Object.entries(a.impressions)) {
    const theirs = impressions[slug];
    if (!theirs) impressions[slug] = mine;
    else impressions[slug] = { n: Math.max(mine.n || 0, theirs.n || 0), ts: Math.max(mine.ts || 0, theirs.ts || 0) };
  }

  const history = [...new Set([...(a.history || []), ...(b.history || [])])].slice(0, 200);

  // ответы: у кого позже пройден квиз — те и главнее, но пустые поля добираем
  const aAt = Number(a.meta?.completedAt) || 0;
  const bAt = Number(b.meta?.completedAt) || 0;
  const answers = bAt > aAt
    ? normalizeAnswers(mergeAnswers(b.answers, a.answers))
    : normalizeAnswers(mergeAnswers(a.answers, b.answers));

  const meta = {
    ...b.meta,
    ...a.meta,                                   // настройки этого устройства важнее
    completedAt: Math.max(aAt, bAt) || (b.meta?.completedAt ?? a.meta?.completedAt),
  };
  return { ...b, ...a, answers, marks, impressions, history, meta };
}

/**
 * Принять серверный профиль, сохранив локальные отметки и настройки.
 * Возвращает объединённый профиль, чтобы вызывающий мог отправить его обратно
 * на сервер (иначе сервер остался бы со старой версией) и обновить интерфейс.
 */
export function adoptRemote(remote) {
  const merged = mergeProfiles(read(), remote);
  write(merged, { skipSync: true });
  return merged;
}

/**
 * Есть ли в локальном профиле то, чего нет на сервере (отметки и ответы).
 * Нужно, чтобы после слияния отправить на сервер только реальные изменения,
 * а не один и тот же профиль при каждой загрузке страницы.
 */
export function needsPush(local, remote) {
  const a = mergeProfile(local || {});
  const b = mergeProfile(remote || {});
  const line = (marks) => Object.entries(marks || {})
    .sort(([x], [y]) => (x < y ? -1 : 1))
    .map(([slug, m]) => `${slug}:${m?.status || ''}:${m?.ts || 0}`)
    .join('|');
  if (line(a.marks) !== line(b.marks)) return true;
  return JSON.stringify(a.answers) !== JSON.stringify(b.answers);
}

/**
 * Отправить профиль на сервер немедленно — вызывается при уходе со страницы
 * (pagehide/скрытие вкладки) и при возвращении связи. keepalive не даёт браузеру
 * оборвать запрос на закрытии страницы: раньше последние отметки терялись.
 */
export async function flushSync({ keepalive = true } = {}) {
  if (!syncEnabled || !pending) return false;
  const profile = pending;
  try {
    const { isLoggedIn, pushProfile } = await import('./api.js');
    if (!isLoggedIn()) return false;
    await pushProfile(profile, { keepalive });
    if (pending === profile) pending = null;
    if (syncError) { syncError = ''; dispatchUiEvent(); }
    return true;
  } catch (error) {
    // Молча терять отклонённый профиль нельзя: сервер мог отказать (слишком много
    // отметок, протухший токен, ошибка валидации) — тогда синхронизация «отключается»,
    // а человек думает, что всё сохранено. Запоминаем причину и показываем в интерфейсе.
    if (error?.status >= 400) {
      syncError = error.message || String(error);
      dispatchUiEvent();
    }
    return false;
  }
}

/**
 * Автоотправка профиля на сервер с задержкой (чтобы не спамить API при быстрых правках).
 * Импорт api.js делаем ленивым: без настроенного API модуль просто не загрузится.
 */
function scheduleSync(profile) {
  if (!syncEnabled) return;
  pending = profile;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  clearTimeout(syncTimer);
  // Задержка задаётся в конфиге (AUTH.syncDebounce, секунды): 0 — отправлять сразу
  const delay = Math.max(0, Number(AUTH?.syncDebounce ?? 4)) * 1000;
  syncTimer = setTimeout(() => { flushSync({ keepalive: false }); }, delay);
}

/**
 * Страховка от потери последних правок: при уходе со страницы, сворачивании вкладки
 * и возвращении сети отправляем профиль немедленно.
 */
if (typeof globalThis.addEventListener === 'function') {
  const flush = () => { flushSync().catch(() => {}); };
  globalThis.addEventListener('pagehide', flush);
  globalThis.addEventListener('online', flush);
  globalThis.addEventListener('visibilitychange', () => {
    if (globalThis.document?.visibilityState === 'hidden') flush();
  });
}

/** Полностью заменяет профиль (используется при загрузке с сервера или импорте) */
export function replaceProfile(next) {
  write(mergeProfile(next), { skipSync: true });
  return cache;
}

/** Выключить автосинхронизацию (например, при выходе из аккаунта) */
export function setSyncEnabled(value) {
  syncEnabled = Boolean(value);
  if (!syncEnabled) pending = null;
}

export const getProfile = () => read();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function updateProfile(patch) {
  const next = { ...read(), ...patch };
  write(next);
  return next;
}

export function setAnswers(patch) {
  const p = read();
  write({
    ...p,
    answers: normalizeAnswers({ ...p.answers, ...patch }),
    meta: { ...p.meta, completedAt: Date.now(), syncAt: new Date().toISOString() },
  });
  return read();
}

/** Отметка игры: played | liked | disliked | wishlist | null (снять) */
export function markGame(slug, status) {
  const p = read();
  const marks = { ...p.marks };
  if (!status || marks[slug]?.status === status) {
    delete marks[slug];
    marksCapped = false;
  } else {
    // Лимит нужен не для красоты: слишком большой профиль сервер отвергает (413),
    // и синхронизация молча останавливалась. Лучше не дать вырасти за предел,
    // чем потерять отправку целиком.
    if (!marks[slug] && Object.keys(marks).length >= CONTENT.maxMarks) {
      marksCapped = true;
      return null;
    }
    marks[slug] = { status, ts: Date.now() };
  }
  write({ ...p, marks });
  return marks[slug]?.status ?? null;
}

export const getMark = (slug) => read().marks?.[slug]?.status ?? null;

export const markedGames = (status) => Object.entries(read().marks || {})
  .filter(([, m]) => !status || m.status === status)
  .map(([slug, m]) => ({ slug, ...m }));

/** Учёт показов: чтобы выдача не «залипала» на одних и тех же играх */
/** Старые профили хранили просто число показов — приводим к { n, ts }. */
function normalizeImpressions(source) {
  const out = {};
  for (const [slug, value] of Object.entries(source || {})) {
    out[slug] = typeof value === 'number' ? { n: value, ts: Date.now() } : value;
  }
  return out;
}

export function trackImpressions(slugs = []) {
  const p = read();
  const impressions = { ...p.impressions };
  const now = Date.now();
  for (const s of slugs) {
    const prev = impressions[s];
    // Храним не только сколько раз показывали, но и когда — движок гасит «приевшиеся»
    // игры по половине срока в 10 дней. Старый формат (число) читается так же.
    const n = (typeof prev === 'number' ? prev : prev?.n || 0) + 1;
    impressions[s] = { n, ts: now };
  }
  write({ ...p, impressions, history: [...slugs, ...(p.history || [])].slice(0, 200) });
}

export function setMeta(patch) {
  const p = read();
  write({ ...p, meta: { ...p.meta, ...patch } });
}

export function resetProfile() {
  write(emptyProfile());
}

export function exportProfile() {
  return JSON.stringify(read(), null, 2);
}

/**
 * Импорт копии профиля. По умолчанию — слияние с текущими данными, а не замена:
 * раньше загрузка копии на устройстве, где уже стояли отметки, молча их стирала
 * (экспорт с телефона → импорт на ноутбуке → отметки ноутбука исчезали).
 * Правила те же, что при синхронизации: отметки — по более свежей дате, ответы —
 * по более позднему прохождению квиза; настройки устройства (тема, язык) не трогаем.
 * `{ replace: true }` оставлен для явного «заменить всё».
 */
export function importProfile(json, { replace = false } = {}) {
  const parsed = safeParse(json, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  const before = read();
  const next = replace ? mergeProfile(parsed) : mergeProfiles(before, parsed);
  write(next);
  return {
    ok: true,
    marks: countMarks(next),
    added: countMarks(next) - countMarks(before),
  };
}

/* ---------- согласие на cookie рекламных сетей ---------- */

export const getConsent = () => {
  try { return globalThis.localStorage?.getItem(CONSENT_KEY) || null; } catch { return storageBroken ? 'necessary' : null; }
};
export const setConsent = (value) => {
  try { globalThis.localStorage?.setItem(CONSENT_KEY, value); } catch { /* ignore */ }
  return value;
};

/* ---------- реклама: локальный счётчик показов на страницу ---------- */

const adCounter = { page: 0 };
export const resetAdCounter = () => { adCounter.page = 0; };
export const bumpAdCounter = () => { adCounter.page += 1; return adCounter.page; };
export const adCount = () => adCounter.page;
