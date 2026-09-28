/**
 * Валидатор каталога. Запуск: node tools/check-catalog.mjs
 * Проверяет дубли, неизвестные id, обязательные поля и показывает покрытие по режимам/настроениям.
 * Полезно запускать перед деплоем — битый каталог лучше поймать локально.
 */
import { GAMES, validate, STATS } from '../js/catalog/index.js';
import { GENRES, TAGS, MODES, MOODS, PRICE, PLATFORMS } from '../js/taxonomy.js';
import { PART_A } from '../js/catalog/part-a.js';
import { PART_B } from '../js/catalog/part-b.js';
import { PART_C } from '../js/catalog/part-c.js';
import { PART_D } from '../js/catalog/part-d.js';
import { PART_E } from '../js/catalog/part-e.js';
import { PART_F } from '../js/catalog/part-f.js';
import { PART_G } from '../js/catalog/part-g.js';
import { PART_H } from '../js/catalog/part-h.js';
import { PART_I } from '../js/catalog/part-i.js';
import { SYSREQ } from '../js/catalog/sysreq.js';

const raw = [...PART_A, ...PART_B, ...PART_C, ...PART_D, ...PART_E, ...PART_F, ...PART_G, ...PART_H, ...PART_I];

// Проблемы начинаем собирать здесь, а не после проверок: раньше `problems` объявлялся
// ниже цикла типов, и первая же найденная ошибка типа роняла скрипт ReferenceError.
const problems = [...validate()];

// проверка типов: сдвиг позиционных аргументов в dsl.js ловится здесь
const numberKeys = ['y', 'pv', 'dif', 'pace', 'rat', 'coopQ'];
for (const game of raw) {
  for (const key of numberKeys) {
    const optionalUnknown = ['dif', 'pace'].includes(key) && game[key] === null;
    if (game[key] !== undefined && !optionalUnknown && typeof game[key] !== 'number') {
      problems.push(`${game.t}: поле ${key} должно быть числом${['dif', 'pace'].includes(key) ? ' или null' : ''}, получено ${JSON.stringify(game[key])}`);
    }
  }
  if (!Array.isArray(game.len) || game.len.length !== 2 || game.len.some((x) => x !== null && typeof x !== 'number')) {
    problems.push(`${game.t}: len должен быть массивом из двух чисел или [null, null], получено ${JSON.stringify(game.len)}`);
  }
  if (!Array.isArray(game.mood)) problems.push(`${game.t}: mood должен быть массивом`);
  if (Array.isArray(game.pl) === false) problems.push(`${game.t}: pl должен быть массивом`);
}

for (const g of raw) {
  const check = (list, dict, name) => {
    for (const id of g[list] || []) {
      if (!dict[id]) problems.push(`${g.t}: неизвестный ${name} «${id}»`);
      else if (list === 'tg' && (MODES[id] || GENRES[id] || PLATFORMS[id])) problems.push(`${g.t}: «${id}» — не тег, а режим/жанр/платформа (уберите из tg)`);
    }
  };
  check('tg', TAGS, 'тег');
  check('gr', GENRES, 'жанр');
  check('md', MODES, 'режим');
  check('mood', MOODS, 'настроение');
  check('pf', PLATFORMS, 'платформа');
  if (g.pr && !PRICE[g.pr]) problems.push(`${g.t}: неизвестная цена «${g.pr}»`);
  if (!g.mood || !g.mood.length) problems.push(`${g.t}: не указано ни одного настроения`);
  if (!g.desc || !g.desc.ru || !g.desc.en) problems.push(`${g.t}: неполное описание ru/en`);
}

// Требования к ПК (js/catalog/sysreq.js): структура, допустимые поля и значения.
// Данные приходят из Steam Store API, поэтому важно ловить и «мусор» — HTML-теги,
// пустые строки, лишние ключи, уровни не из min/rec.
const SYSREQ_LEVELS = ['min', 'rec'];
const SYSREQ_FIELDS = ['os', 'cpu', 'ram', 'gpu', 'dx', 'disk', 'sound', 'net', 'note'];
const slugs = new Set(GAMES.map((g) => g.slug));
for (const [slug, entry] of Object.entries(SYSREQ)) {
  if (!slugs.has(slug)) problems.push(`sysreq: неизвестный slug «${slug}»`);
  if (!entry || typeof entry !== 'object') { problems.push(`sysreq:${slug}: запись должна быть объектом`); continue; }
  if (!entry.min && !entry.rec) problems.push(`sysreq:${slug}: нет ни минимальных, ни рекомендуемых требований`);
  for (const [level, data] of Object.entries(entry)) {
    if (!SYSREQ_LEVELS.includes(level)) { problems.push(`sysreq:${slug}: неизвестный уровень «${level}»`); continue; }
    if (!data || typeof data !== 'object') { problems.push(`sysreq:${slug}: уровень ${level} должен быть объектом`); continue; }
    for (const [key, value] of Object.entries(data)) {
      if (key === 'bit64') {
        if (value !== true) problems.push(`sysreq:${slug}: bit64 бывает только true`);
        continue;
      }
      if (!SYSREQ_FIELDS.includes(key)) problems.push(`sysreq:${slug}: неизвестное поле «${key}»`);
      const values = typeof value === 'string' ? [value] : [value?.ru, value?.en];
      if (!values.every((v) => typeof v === 'string' && v.trim())) problems.push(`sysreq:${slug}: пустое значение ${level}.${key}`);
      // Ищем именно разметку, а не любой «<»/«>»: в требованиях встречается обычный текст
      // («Options > Graphics» у Resident Evil 2), и это не повод считать данные грязными.
      if (values.some((v) => /<\/?[a-z][a-z0-9]*(\s[^>]*)?>/i.test(v) || /&(nbsp|amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/i.test(v))) {
        problems.push(`sysreq:${slug}: HTML в значении ${level}.${key}`);
      }
    }
  }
}

// Уникальные тексты SEO-лендингов (js/views/landing-texts.js): каждый жанр, режим
// и настроение обязан иметь собственный текст — иначе страница таксономии остаётся
// «тонким» дублем каталога (h1 + сетка карточек). Проверяем покрытие, структуру,
// уникальность и то, что related-ссылки ведут на реальные страницы таксономии.
const { LANDING_TEXTS } = await import('../js/views/landing-texts.js');
const LANDING_DICTS = { genre: GENRES, mode: MODES, mood: MOODS, tag: TAGS, platform: PLATFORMS };
const landingKeys = Object.keys(LANDING_TEXTS);
const landingRequired = [
  ...Object.keys(GENRES).map((id) => `genre:${id}`),
  ...Object.keys(MODES).map((id) => `mode:${id}`),
  ...Object.keys(MOODS).map((id) => `mood:${id}`),
];
for (const key of landingRequired) {
  if (!landingKeys.includes(key)) problems.push(`landing: нет текста для «${key}»`);
}
for (const key of landingKeys) {
  const [kind, id] = key.split(':');
  if (!['genre', 'mode', 'mood'].includes(kind)) { problems.push(`landing: «${key}» — тексты бывают только у жанров, режимов и настроений`); continue; }
  const text = LANDING_TEXTS[key];
  for (const lang of ['ru', 'en']) {
    const meta = text?.meta?.[lang];
    if (typeof meta !== 'string' || meta.trim().length < 50) problems.push(`landing:${key}: пустое или короткое meta.${lang}`);
    else if (meta.length > 160) problems.push(`landing:${key}: meta.${lang} длиннее 160 символов (${meta.length})`);
    const body = text?.body?.[lang];
    if (!Array.isArray(body) || body.length < 2 || body.some((p) => typeof p !== 'string' || p.trim().length < 100)) {
      problems.push(`landing:${key}: body.${lang} — нужно минимум 2 содержательных абзаца`);
    }
  }
  for (const ref of text?.related || []) {
    const [refKind, refId] = String(ref).split(':');
    if (!LANDING_DICTS[refKind] || !LANDING_DICTS[refKind][refId]) problems.push(`landing:${key}: related «${ref}» не является страницей таксономии`);
    else if (ref === key) problems.push(`landing:${key}: related ссылается на самого себя`);
  }
}
// дублей текстов быть не должно — иначе «уникальный» контент на деле шаблонный
const seenTexts = new Map();
for (const key of landingKeys) {
  const text = LANDING_TEXTS[key];
  for (const lang of ['ru', 'en']) {
    for (const field of ['meta', 'body']) {
      const sig = `${lang}:${field}:${JSON.stringify(text[field]?.[lang])}`;
      if (seenTexts.has(sig)) problems.push(`landing: «${key}» повторяет ${field}.${lang} из «${seenTexts.get(sig)}»`);
      seenTexts.set(sig, key);
    }
  }
}

// неиспользуемые справочники — просто информация
const unusedTags = Object.keys(TAGS).filter((id) => !raw.some((g) => (g.tg || []).includes(id)));
const unusedGenres = Object.keys(GENRES).filter((id) => !raw.some((g) => (g.gr || []).includes(id)));
const unusedMoods = Object.keys(MOODS).filter((id) => !raw.some((g) => (g.mood || []).includes(id)));

console.log(`Всего игр: ${GAMES.length}`);
console.log(`Лендинги таксономии: ${landingKeys.length} текстов (${landingRequired.length} обязательных: ${Object.keys(GENRES).length} жанров, ${Object.keys(MODES).length} режимов, ${Object.keys(MOODS).length} настроений)`);
console.log(`Покрытие: ${JSON.stringify({ coop: STATS.coop, pvp: STATS.pvp, solo: STATS.solo })}`);
console.log('Режимы: ' + Object.entries(MODES).map(([id, m]) => `${m.ru} — ${GAMES.filter((g) => g.modes.includes(id)).length}`).join(' | '));
console.log('Настроения: ' + Object.entries(MOODS).map(([id, m]) => `${id} — ${GAMES.filter((g) => g.moods.includes(id)).length}`).join(' | '));
if (unusedTags.length) console.log(`Неиспользуемые теги (${unusedTags.length}): ${unusedTags.join(', ')}`);
if (unusedGenres.length) console.log(`Неиспользуемые жанры: ${unusedGenres.join(', ')}`);
if (unusedMoods.length) console.log(`Неиспользуемые настроения: ${unusedMoods.join(', ')}`);
console.log(`Проблем: ${problems.length}`);
if (problems.length) console.log(problems.join('\n'));
process.exit(problems.length ? 1 : 0);
