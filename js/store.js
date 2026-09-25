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

const PROFILE_KEY = 'gf.profile.v1';
const CONSENT_KEY = 'gf.consent.v1';

const listeners = new Set();
let cache = null;

const safeParse = (raw, fallback) => {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};

function read() {
  if (cache) return cache;
  const stored = safeParse(globalThis.localStorage?.getItem(PROFILE_KEY), null);
  cache = stored ? { ...emptyProfile(), ...stored, answers: { ...emptyProfile().answers, ...stored.answers } } : emptyProfile();
  return cache;
}

function write(profile, { skipSync = false } = {}) {
  cache = profile;
  try { globalThis.localStorage?.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* приватный режим — работаем в памяти */ }
  listeners.forEach((fn) => fn(profile));
  if (!skipSync) scheduleSync(profile);
}

/* --------------------------- синхронизация с аккаунтом --------------------------- */

let syncTimer = null;
let syncEnabled = true;

/**
 * Автоотправка профиля на сервер с задержкой (чтобы не спамить API при быстрых правках).
 * Импорт api.js делаем ленивым: без настроенного API модуль просто не загрузится.
 */
function scheduleSync(profile) {
  if (!syncEnabled) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const { isLoggedIn, pushProfile } = await import('./api.js');
      if (!isLoggedIn()) return;
      await pushProfile(profile);
    } catch { /* нет связи — данные уже сохранены локально */ }
  }, 4000);
}

/** Полностью заменяет профиль (используется при загрузке с сервера или импорте) */
export function replaceProfile(next) {
  const base = emptyProfile();
  write({
    ...base,
    ...next,
    answers: { ...base.answers, ...(next.answers || {}) },
    marks: next.marks || {},
    impressions: normalizeImpressions(next.impressions),
  }, { skipSync: true });
  return cache;
}

/** Выключить автосинхронизацию (например, при выходе из аккаунта) */
export function setSyncEnabled(value) {
  syncEnabled = Boolean(value);
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
  write({ ...p, answers: { ...p.answers, ...patch }, meta: { ...p.meta, completedAt: Date.now(), syncAt: new Date().toISOString() } });
  return read();
}

/** Отметка игры: played | liked | disliked | wishlist | null (снять) */
export function markGame(slug, status) {
  const p = read();
  const marks = { ...p.marks };
  if (!status || marks[slug]?.status === status) delete marks[slug];
  else marks[slug] = { status, ts: Date.now() };
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

export function importProfile(json) {
  const parsed = safeParse(json, null);
  if (!parsed || typeof parsed !== 'object') return false;
  const base = emptyProfile();
  write({
    ...base,
    ...parsed,
    answers: { ...base.answers, ...(parsed.answers || {}) },
    marks: parsed.marks || {},
    impressions: normalizeImpressions(parsed.impressions),
  });
  return true;
}

/* ---------- согласие на cookie рекламных сетей ---------- */

export const getConsent = () => globalThis.localStorage?.getItem(CONSENT_KEY) || null;
export const setConsent = (value) => {
  try { globalThis.localStorage?.setItem(CONSENT_KEY, value); } catch { /* ignore */ }
  return value;
};

/* ---------- реклама: локальный счётчик показов на страницу ---------- */

const adCounter = { page: 0 };
export const resetAdCounter = () => { adCounter.page = 0; };
export const bumpAdCounter = () => { adCounter.page += 1; return adCounter.page; };
export const adCount = () => adCounter.page;
