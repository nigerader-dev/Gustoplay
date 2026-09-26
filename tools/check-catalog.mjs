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
    if (game[key] !== undefined && typeof game[key] !== 'number') {
      problems.push(`${game.t}: поле ${key} должно быть числом, получено ${JSON.stringify(game[key])}`);
    }
  }
  if (!Array.isArray(game.len) || game.len.length !== 2 || game.len.some((x) => typeof x !== 'number')) {
    problems.push(`${game.t}: len должен быть массивом из двух чисел, получено ${JSON.stringify(game.len)}`);
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
      if (values.some((v) => /<|>/.test(v))) problems.push(`sysreq:${slug}: HTML в значении ${level}.${key}`);
    }
  }
}

// неиспользуемые справочники — просто информация
const unusedTags = Object.keys(TAGS).filter((id) => !raw.some((g) => (g.tg || []).includes(id)));
const unusedGenres = Object.keys(GENRES).filter((id) => !raw.some((g) => (g.gr || []).includes(id)));
const unusedMoods = Object.keys(MOODS).filter((id) => !raw.some((g) => (g.mood || []).includes(id)));

console.log(`Всего игр: ${GAMES.length}`);
console.log(`Покрытие: ${JSON.stringify({ coop: STATS.coop, pvp: STATS.pvp, solo: STATS.solo })}`);
console.log('Режимы: ' + Object.entries(MODES).map(([id, m]) => `${m.ru} — ${GAMES.filter((g) => g.modes.includes(id)).length}`).join(' | '));
console.log('Настроения: ' + Object.entries(MOODS).map(([id, m]) => `${id} — ${GAMES.filter((g) => g.moods.includes(id)).length}`).join(' | '));
if (unusedTags.length) console.log(`Неиспользуемые теги (${unusedTags.length}): ${unusedTags.join(', ')}`);
if (unusedGenres.length) console.log(`Неиспользуемые жанры: ${unusedGenres.join(', ')}`);
if (unusedMoods.length) console.log(`Неиспользуемые настроения: ${unusedMoods.join(', ')}`);
console.log(`Проблем: ${problems.length}`);
if (problems.length) console.log(problems.join('\n'));
process.exit(problems.length ? 1 : 0);
