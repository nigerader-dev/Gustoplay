#!/usr/bin/env node
/**
 * Тянет требования к ПК (минимальные и рекомендуемые) из Steam Store API и пишет
 * воспроизводимый источник данных в js/catalog/sysreq.js.
 *
 * Запускать там, где есть доступ к store.steampowered.com: в песочнице разработки
 * сети к Steam нет (ответ 000), поэтому шаг живёт в GitHub Actions
 * (.github/workflows/sysreq.yml) — так же, как резолвер обложек.
 *
 *   npm run sysreq:pull                    # все игры каталога со steamId
 *   node tools/pull-system-requirements.mjs --probe        # диагностика: один appid
 *   node tools/pull-system-requirements.mjs --limit=40     # первые 40 (быстрая проверка)
 *   node tools/pull-system-requirements.mjs --delay=250
 *   node tools/pull-system-requirements.mjs --ids=100,200 --out=/tmp/x.js   # проверки
 *
 * ВАЖНО про формат запроса: Steam отвечает HTTP 400 на запрос сразу нескольких
 * appid (проверено прогоном 26.09.2026: батчи по 20 → «батч N не получен: HTTP 400»,
 * одиночный appid — нормальный ответ). Поэтому опрашиваем строго по одному appid
 * за раз: 401 игра × 2 языка ≈ 800 запросов, это минуты при задержке 250 мс.
 *
 * Источник данных — только официальный Store API (appdetails → pc_requirements).
 * Ничего не выдумывается: если магазин не публикует требования, игры просто нет
 * в результате, и это видно в отчёте tools/sysreq-review.txt.
 *
 * Ручные дополнения (игры вне Steam, редкие правки) — tools/sysreq-overrides.json:
 *   { "some-slug": { "min": { "os": "Windows 10", ... }, "rec": { ... } } }
 * Оверрайд применяется поверх сетевых данных и в файл попадает как есть.
 */
import { writeFile } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { PART_A } from '../js/catalog/part-a.js';
import { PART_B } from '../js/catalog/part-b.js';
import { PART_C } from '../js/catalog/part-c.js';
import { PART_D } from '../js/catalog/part-d.js';
import { PART_E } from '../js/catalog/part-e.js';
import { PART_F } from '../js/catalog/part-f.js';
import { PART_G } from '../js/catalog/part-g.js';
import { PART_H } from '../js/catalog/part-h.js';
import { PART_I } from '../js/catalog/part-i.js';
import { STEAM_COVERS } from '../js/catalog/steam-covers.js';
import { renderSysreqFile } from './sysreq-format.mjs';

const PARTS = [PART_A, PART_B, PART_C, PART_D, PART_E, PART_F, PART_G, PART_H, PART_I];

const outFile = new URL('../js/catalog/sysreq.js', import.meta.url);
const reviewFile = new URL('./sysreq-review.txt', import.meta.url);
const overridesFile = new URL('./sysreq-overrides.json', import.meta.url);

const arg = (name) => process.argv.find((x) => x.startsWith(`--${name}=`))?.split('=')[1];
const PROBE = process.argv.includes('--probe');
// limit/offset — порция игр для быстрого или частичного прогона (части
// накапливаются: ранее собранные данные сохраняются, см. merged ниже)
const limitArg = arg('limit');
const limit = limitArg ? Number(limitArg) : Infinity;
const offset = Math.max(0, Number(arg('offset') || 0));
const delay = Number(arg('delay') || 250);
// Сколько appid опрашиваем одновременно. Полный прогон — ~800 запросов; в один
// поток он упирается в лимит джоба (45 минут), поэтому по умолчанию два потока.
const concurrency = Math.max(1, Math.min(6, Number(arg('concurrency') || 2)));
const progressEvery = Math.max(1, Number(arg('progress') || 25));
const TIMEOUT = 30000;
// Куда писать результат: по умолчанию — рабочие файлы сайта; ключи нужны проверке
// tools/test-sysreq.mjs, которая поднимает локальную «Заглушку Steam» и не должна
// трогать настоящий js/catalog/sysreq.js.
const outPath = arg('out') || fileURLToPath(outFile);
const reviewPath = arg('review') || fileURLToPath(reviewFile);
// Хост Store API: ключ окружения — только для проверок (см. tools/test-sysreq.mjs),
// в бою всегда настоящий магазин.
const API_BASE = process.env.SYSREQ_API_BASE || 'https://store.steampowered.com';
const UA = 'Mozilla/5.0 (compatible; GustoPlay catalog resolver/1.0)';

const slugify = (s) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const games = PARTS.flatMap((list) => list).map((g) => ({ ...g, slug: g.slug || slugify(g.t) }));
// Все игры, у которых есть steamId: по этому списку собирается итоговый файл,
// чтобы частичный прогон (--limit/--offset) не стирал ранее собранные данные.
const allWithId = games
  .map((g) => ({ slug: g.slug, title: g.t, id: STEAM_COVERS[g.slug]?.steamId }))
  .filter((g) => g.id);
let withId = allWithId.slice(offset, Number.isFinite(limit) ? offset + limit : undefined);
// Ключ проверок (tools/test-sysreq.mjs): подменяет appid первых игр на тестовые,
// чтобы прогнать сборщик против локальной заглушки магазина. В бою не используется.
const idsOverride = (arg('ids') || '').split(',').map((x) => x.trim()).filter(Boolean);
if (idsOverride.length) {
  withId = withId.slice(0, idsOverride.length).map((g, i) => ({ ...g, id: idsOverride[i] }));
}
const withoutId = games.filter((g) => !STEAM_COVERS[g.slug]?.steamId);

/* ------------------------------------------------------------------ *
 * Сеть
 * ------------------------------------------------------------------ */

async function fetchJson(url, tries = 3) {
  for (let i = 1; i <= tries; i += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT) });
      if (res.status === 429) { await sleep(4000 * i); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      if (i === tries) throw error;
      await sleep(1500 * i);
    }
  }
  return null;
}

const detailsUrl = (id, lang, filters = true) =>
  `${API_BASE}/api/appdetails?appids=${id}&l=${lang}${filters ? '&filters=pc_requirements' : ''}`;

/** Диагностика одной игры: HTTP-статус, тип data и наличие pc_requirements */
async function probeOne(id, lang, filters) {
  const url = detailsUrl(id, lang, filters);
  let status = 0;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT) });
    status = res.status;
    const app = res.ok ? (await res.json())?.[String(id)] : null;
    const req = app?.data?.pc_requirements;
    console.log(`::notice::sysreq-probe: ${filters ? 'фильтр' : 'без фильтра'} ${lang} HTTP ${status} success=${app?.success} data=${Array.isArray(app?.data) ? 'array' : typeof app?.data} pc_requirements=${req ? typeof req : 'нет'}`);
    if (req) console.log(`::notice::sysreq-probe: ${JSON.stringify(req).slice(0, 700)}`);
    return Boolean(req);
  } catch (error) {
    console.log(`::notice::sysreq-probe: ${filters ? 'фильтр' : 'без фильтра'} ${lang} ошибка сети: ${String(error?.message || error).slice(0, 120)}`);
    return false;
  }
}

/**
 * Диагностика: у appdetails есть параметр filters, но у части приложений он отдаёт
 * пустой data. Пробуем оба варианта на одном appid и печатаем, что именно вернул
 * Steam. Плюс отдельно проверяем, почему падают пакетные запросы (HTTP 400).
 */
async function probe() {
  const sample = withId.find((g) => g.slug === 'deep-rock-galactic') || withId[0];
  console.log(`Проверка appid ${sample.id} (${sample.title})`);
  await probeOne(sample.id, 'russian', true);
  await probeOne(sample.id, 'russian', false);
  await probeOne(sample.id, 'english', false);
  // Пакетный запрос — чтобы в отчёте была видна причина прошлых HTTP 400
  const group = withId.slice(0, 5).map((g) => g.id);
  for (const [label, url] of [
    ['5 appid без фильтра', `${API_BASE}/api/appdetails?appids=${group.join(',')}&l=english`],
    ['20 appid с фильтром', `${API_BASE}/api/appdetails?appids=${withId.slice(0, 20).map((g) => g.id).join(',')}&l=english&filters=pc_requirements`],
  ]) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT) });
      const len = (await res.text()).length;
      console.log(`::notice::sysreq-probe: ${label} HTTP ${res.status}, тело ${len} символов`);
    } catch (error) {
      console.log(`::notice::sysreq-probe: ${label} ошибка сети: ${String(error?.message || error).slice(0, 120)}`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Разбор HTML магазина в структуру
 * ------------------------------------------------------------------ */

const stripTags = (html) => String(html || '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/li>/gi, '\n')
  .replace(/<li[^>]*>/gi, '')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#0?39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/[ \t\u00a0]+/g, ' ');

/** «ОС: Windows 10» / «OS: Windows 10» / «Processor: …» → ключ поля */
const FIELD_LABELS = [
  [/^(os|операционная система|ос)\s*:/i, 'os'],
  [/^(processor|процессор)\s*:/i, 'cpu'],
  [/^(memory|оперативная память|память|озу)\s*:/i, 'ram'],
  [/^(graphics|video card|видеокарта|графика|видео)\s*:/i, 'gpu'],
  [/^(directx|директх)\s*:/i, 'dx'],
  [/^(storage|hard drive|место на диске|жёсткий диск|жесткий диск|диск|накопитель)\s*:/i, 'disk'],
  [/^(sound card|звуковая карта)\s*:/i, 'sound'],
  [/^(network|сеть|интернет)\s*:/i, 'net'],
  [/^(additional notes|дополнительно|примечания|дополнительная информация)\s*:/i, 'note'],
];

const REQUIRE_64 = [
  /requires a 64-bit processor and operating system/i,
  /требуется 64-битный процессор и операционная система/i,
  /requires a 64-bit processor/i,
];

const DEFAULTS = {};
const clean = (s) => String(s || '').replace(/\s+/g, ' ').replace(/^[-–—:;,. ]+/, '').replace(/[;,]\s*$/, '').trim();

/**
 * Разбирает HTML требований в объект { os, cpu, ram, gpu, dx, disk, note, bit64 }.
 * Строки без «метки» (Steam иногда переносит значение на следующую строку)
 * дописываются к предыдущему полю; «Requires a 64-bit…» превращается в флаг bit64.
 */
export function parseRequirements(html) {
  if (!html || typeof html !== 'string') return null;
  const lines = stripTags(html).split('\n').map(clean).filter(Boolean);
  const out = { ...DEFAULTS };
  let current = null;
  for (const line of lines) {
    if (/^(minimum|recommended|минимальные|рекомендуемые|минимум|рекомендуется)\s*:?$/i.test(line)) continue;
    if (REQUIRE_64.some((re) => re.test(line))) { out.bit64 = true; continue; }
    // Пара «найденное совпадение + ключ поля»: раньше здесь стояла деструктуризация
    // [, m, key] — она давала key = undefined (в паре всего два элемента), и все поля
    // уезжали в свойство «undefined»: файл заполнялся мусором.
    const found = FIELD_LABELS.map(([re, key]) => [line.match(re), key]).find(([m]) => m);
    if (found) {
      const [m, key] = found;
      const value = clean(line.slice(m[0].length));
      if (value) { out[key] = out[key] ? `${out[key]} ${value}` : value; current = key; }
      continue;
    }
    if (current && out[current] && out[current].length < 200) out[current] = `${out[current]} ${line}`;
  }
  return Object.keys(out).length ? out : null;
}

/** DirectX храним коротко («11», «9.0c»), чтобы это не зависело от языка магазина */
const normalizeDx = (value) => {
  if (!value) return undefined;
  const m = String(value).match(/(\d+(?:\.\d+)?[a-z]?)/i);
  return m ? m[1] : clean(value);
};

/**
 * Приводит значение требования к общему виду, чтобы русская и английская страницы
 * магазина давали одинаковую строку и она не превращалась в пару { ru, en }.
 * «8 ГБ ОЗУ» и «8 GB RAM» — одно и то же требование; «30 ГБ» и «30 GB available
 * space» — тоже. Единицы и служебные слова («ОЗУ», «available space», «и более»)
 * убираем, смысл значения (число и слово-объём) остаётся.
 */
const NOISE_WORDS = [
  /\bavailable space\b/gi, /\bspace available\b/gi, /\bor more\b/gi, /\bRAM\b/g,
  /доступного места/gi, /доступное место/gi, /свободного места/gi, /свободное место/gi,
  /и более/gi, /ОЗУ/g,
];
const unifyUnits = (value) => {
  if (!value) return undefined;
  // Кириллические единицы: \b в JavaScript считается по ASCII-слову и рядом с «ГБ»
  // не срабатывает, поэтому проверяем, что следом не идёт буква.
  let out = clean(value)
    .replace(/ГБ(?!\p{L})/gu, 'GB').replace(/Гб(?!\p{L})/gu, 'GB')
    .replace(/МБ(?!\p{L})/gu, 'MB').replace(/Мб(?!\p{L})/gu, 'MB')
    .replace(/ГГц(?!\p{L})/gu, 'GHz').replace(/МГц(?!\p{L})/gu, 'MHz');
  for (const re of NOISE_WORDS) out = out.replace(re, ' ');
  return clean(out);
};

const FIELDS = ['os', 'cpu', 'ram', 'gpu', 'dx', 'disk', 'sound', 'net', 'note'];

/** Собирает один уровень (min/rec): одинаковые значения ru/en — строкой, разные — объектом { ru, en } */
function mergeLevel(ru, en) {
  if (!ru && !en) return null;
  const level = {};
  for (const key of FIELDS) {
    const a = key === 'dx' ? normalizeDx(ru?.[key]) : unifyUnits(ru?.[key]);
    const b = key === 'dx' ? normalizeDx(en?.[key]) : unifyUnits(en?.[key]);
    const value = a && b ? (a === b ? a : { ru: a, en: b }) : (a || b);
    if (value) level[key] = value;
  }
  const bit64 = Boolean(ru?.bit64 || en?.bit64);
  if (bit64) level.bit64 = true;
  return Object.keys(level).length ? level : null;
}

/* ------------------------------------------------------------------ *
 * Сбор данных
 * ------------------------------------------------------------------ */

async function readJson(path, fallback = {}) {
  try {
    const { readFile } = await import('node:fs/promises');
    return JSON.parse(await readFile(path, 'utf8'));
  } catch { return fallback; }
}

async function main() {
  if (PROBE) { await probe(); return; }

  const overrides = await readJson(overridesFile);

  // Старые данные сохраняем: если Steam не ответит по части игр или прогон идёт
  // порцией (--limit/--offset), файл не обеднеет. Читаем именно тот файл, в который
  // пишем (outPath), иначе частичный прогон затирал бы всё собранное ранее.
  let existing = {};
  try {
    const mod = await import(`${pathToFileURL(outPath).href}?t=${Date.now()}`);
    existing = mod.SYSREQ || {};
  } catch { /* файла ещё нет */ }

  const collected = {};
  const misses = [];
  const mismatches = [];
  const unreadable = [];

  console.log(`Игр со steamId: ${allWithId.length}; в этой порции: ${withId.length}`
    + `${offset ? ` (с ${offset + 1}-й)` : ''}; потоков: ${concurrency}, delay=${delay}мс`);

  /** Один appid, один язык: сначала с фильтром, пусто — повторяем без фильтра */
  async function readReqs(id, lang) {
    let app = null;
    try {
      app = (await fetchJson(detailsUrl(id, lang))) ?? null;
    } catch (error) {
      console.log(`::warning::appid ${id} (${lang}) не получен: ${String(error?.message || error).slice(0, 120)}`);
      unreadable.push(`${id}|${lang}|${String(error?.message || error).slice(0, 60)}`);
    }
    let req = app?.[String(id)]?.data?.pc_requirements ?? null;
    if (!req) {
      try {
        const full = (await fetchJson(detailsUrl(id, lang, false))) ?? null;
        req = full?.[String(id)]?.data?.pc_requirements ?? null;
      } catch { /* останется «нет данных» */ }
    }
    return req;
  }

  // Пул воркеров: каждый берёт следующую игру из очереди и опрашивает оба языка.
  // Так прогон укладывается в лимит джоба, а данные получаются те же.
  const queue = [...withId];
  let done = 0;
  const worker = async () => {
    while (queue.length) {
      const g = queue.shift();
      const [ru, en] = await Promise.all([readReqs(g.id, 'russian'), readReqs(g.id, 'english')]);
      await sleep(delay);

      const min = mergeLevel(parseRequirements(ru?.minimum), parseRequirements(en?.minimum));
      const rec = mergeLevel(parseRequirements(ru?.recommended), parseRequirements(en?.recommended));
      if (min || rec) {
        collected[g.slug] = { ...(min ? { min } : {}), ...(rec ? { rec } : {}) };
        const ruHas = Boolean(ru?.minimum || ru?.recommended);
        const enHas = Boolean(en?.minimum || en?.recommended);
        if (ruHas !== enHas) mismatches.push(`${g.slug}: язык магазина отдал данные только на ${ruHas ? 'ru' : 'en'}`);
      } else {
        misses.push(`${g.slug} (${g.id}) ${g.title}`);
      }

      done += 1;
      if (done % progressEvery === 0 || done === withId.length) {
        console.log(`прогресс ${done}/${withId.length}: с требованиями ${Object.keys(collected).length}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, withId.length) }, worker));

  // Оверрайды поверх сети; старые данные — только там, где сеть ничего не дала.
  // Идём по ВСЕМ играм со steamId: порционный прогон не должен терять остальные.
  const merged = {};
  for (const g of allWithId) {
    const fresh = collected[g.slug];
    const old = existing[g.slug];
    const override = overrides[g.slug];
    const entry = override || fresh || old;
    if (entry) merged[g.slug] = entry;
  }

  await writeFile(outPath, renderSysreqFile(merged));

  const withoutReq = allWithId.filter((g) => !merged[g.slug]);
  const report = [
    `Требования к ПК: ${Object.keys(merged).length} из ${allWithId.length} игр со steamId`,
    `Игр без steamId (данные недоступны через Store API): ${withoutId.length} — ${withoutId.map((g) => g.slug).join(', ')}`,
    `Данные не получены (нет pc_requirements или запрос не прошёл): ${withoutReq.length}`,
    `Ответы с ошибкой сети/HTTP (appid|язык|причина): ${unreadable.length}`,
    ...unreadable.slice(0, 40).map((u) => `ERR ${u}`),
    ...withoutReq.map((g) => `MISS ${g.slug} (${g.id}) ${g.title}`),
    ...mismatches.map((m) => `LANG ${m}`),
    'Минимальные и рекомендуемые есть у: ' + Object.values(merged).filter((e) => e.min && e.rec).length,
    'Только минимальные: ' + Object.values(merged).filter((e) => e.min && !e.rec).length,
    'Только рекомендуемые: ' + Object.values(merged).filter((e) => !e.min && e.rec).length,
  ].join('\n');
  await writeFile(reviewPath, `${report}\n`);
  console.log(`\n${report.split('\n').slice(0, 8).join('\n')}`);
}

// Импорт модуля не должен ходить в сеть: main() запускается только при прямом вызове,
// иначе проверка tools/test-sysreq.mjs не смогла бы переиспользовать парсер.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Ошибка: ${error?.stack || error}`);
    process.exit(1);
  });
}

export { parseRequirements as parseSteamRequirements };
