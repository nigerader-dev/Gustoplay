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
// Витрина магазина для третьей попытки: часть игр Steam отдаёт только с явной
// страной (например, возрастной фильтр). Пустая строка отключает попытку.
const cc = arg('cc') === undefined ? 'us' : String(arg('cc'));
const diagLimit = Math.max(0, Number(arg('diag') || 12));
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

/**
 * Запрос с ретраями. Возвращает не только тело, но и факт ответа: без этого нельзя
 * отличить «магазин не публикует требования» от «запрос не прошёл», а в отчёте
 * такие случаи нельзя смешивать (первый прогон именно так и потерял 401 игру).
 */
async function fetchInfo(url, tries = 3) {
  let last = { status: 0, error: 'запросов не было' };
  for (let i = 1; i <= tries; i += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT) });
      const text = await res.text();
      if (res.status === 429) { last = { status: 429, error: 'HTTP 429', bytes: text.length }; await sleep(4000 * i); continue; }
      if (!res.ok) { last = { status: res.status, error: `HTTP ${res.status}`, bytes: text.length }; await sleep(1200 * i); continue; }
      try {
        return { status: res.status, json: JSON.parse(text), bytes: text.length };
      } catch (error) {
        last = { status: res.status, error: `разбор JSON: ${String(error?.message || error).slice(0, 50)}`, bytes: text.length };
      }
    } catch (error) {
      last = { status: 0, error: `сеть: ${String(error?.message || error).slice(0, 60)}` };
    }
    await sleep(1200 * i);
  }
  return last;
}

/** Короткое описание ответа магазина — для отчёта и аннотаций */
function describeAnswer(res) {
  if (!res) return 'нет ответа';
  if (!res.json) return `HTTP ${res.status || '—'} ${res.error || ''}`.trim();
  const json = res.json;
  const keys = Object.keys(json);
  const app = json[keys[0]];
  const data = app?.data;
  return `HTTP ${res.status} success=${app?.success} data=${Array.isArray(data) ? `array(${data.length})` : typeof data}`
    + ` pc_requirements=${data?.pc_requirements ? 'есть' : 'нет'} байт=${res.bytes}`;
}

const fetchJson = async (url, tries = 3) => (await fetchInfo(url, tries)).json ?? null;

const detailsUrl = (id, lang, filters = true, cc = '') =>
  `${API_BASE}/api/appdetails?appids=${id}&l=${lang}${filters ? '&filters=pc_requirements' : ''}${cc ? `&cc=${cc}` : ''}`;

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

/**
 * Метки полей. Магазин пишет их по-разному: «OS:», «OS *:», «Операционная система:»,
 * «Дополнительно:». Поэтому сравниваем саму метку уже нормализованной (без «*»,
 * точек и пробелов по краям), а не строку целиком — так поле не теряется из-за
 * звёздочки, а «Requires a 64-bit…» не уезжает в примечания.
 */
const FIELD_LABELS = [
  [/^(os|операционная система|ос)$/i, 'os'],
  [/^(processor|процессор)$/i, 'cpu'],
  [/^(memory|оперативная память|память|озу)$/i, 'ram'],
  [/^(graphics|video card|видеокарта|графика|видео)$/i, 'gpu'],
  [/^(directx|директх)$/i, 'dx'],
  [/^(storage|hard drive|место на диске|жёсткий диск|жесткий диск|диск|накопитель)$/i, 'disk'],
  [/^(sound card|звуковая карта)$/i, 'sound'],
  [/^(network|сеть|интернет)$/i, 'net'],
  [/^(additional notes|дополнительно|примечания|дополнительная информация)$/i, 'note'],
];

const REQUIRE_64 = [
  /requires a 64-bit processor and operating system/i,
  /требуется 64-битный процессор и операционная система/i,
  /requires a 64-bit processor/i,
];

const DEFAULTS = {};
const clean = (s) => String(s || '').replace(/\s+/g, ' ').replace(/^[-–—:;,. ]+/, '').replace(/[;,]\s*$/, '').trim();
/** Значение требования: убираем служебные разделители по краям, пустое — не значение */
const cleanValue = (s) => {
  const out = String(s || '')
    .replace(/^[\s/\\|•·»«]+/, ' ')
    .replace(/[\s/\\|]+$/, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return /^[\-–—:;,.!?/\\|•·]+$/.test(out) ? '' : out;
};

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

    // «Метка: значение». Всё, что похоже на метку, но нам неизвестно («VR Support:»,
    // «Поддержка VR:»), пропускаем: раньше такие строки приклеивались к предыдущему
    // полю, и в «Место на диске» попадало «60 GB Поддержка VR: 10GB VRAM…».
    const labelMatch = line.match(/^([^:]{1,45}):\s*(.*)$/);
    if (labelMatch) {
      const label = labelMatch[1].toLowerCase().replace(/^[\s*•·-]+/, '').replace(/[\s*.]+$/, '').trim();
      // Пара «найденное совпадение + ключ поля»: раньше здесь стояла деструктуризация
      // [, m, key] — она давала key = undefined (в паре всего два элемента), и все поля
      // уезжали в свойство «undefined»: файл заполнялся мусором.
      const found = FIELD_LABELS.map(([re, key]) => [label.match(re), key]).find(([m]) => m);
      if (!found) { current = null; continue; }
      const key = found[1];
      const value = cleanValue(labelMatch[2]);
      if (value) { out[key] = out[key] ? `${out[key]} ${value}` : value; current = key; }
      continue;
    }

    // Строка без метки — продолжение предыдущего значения (магазин переносит его
    // на следующую строку). Служебный мусор («/», «-», «•») не приклеиваем.
    const cont = cleanValue(line);
    if (cont && current && out[current] && out[current].length < 200) out[current] = `${out[current]} ${cont}`;
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

/**
 * Проверка старых данных перед слиянием. Файл мог быть собран прошлой (ошибочной)
 * версией разбора: тогда в значения попадали чужие метки («60 GB Поддержка VR:
 * 10GB VRAM GPU…»). Такие записи лучше пересобрать, чем показывать в интерфейсе,
 * поэтому запись с внутренней меткой вида «Слово:» не используется как запасная.
 */
const SUSPICIOUS_VALUE = /(^|\s)[A-ZА-ЯЁ][\p{L}\p{N} .+-]{2,30}:\s/iu;
function cleanEntry(entry) {
  if (!entry || typeof entry !== 'object') return undefined;
  for (const value of Object.values(entry)) {
    if (!value || typeof value !== 'object') return undefined;
    for (const field of Object.values(value)) {
      const texts = typeof field === 'string' ? [field] : [field?.ru, field?.en].filter(Boolean);
      if (texts.some((t) => SUSPICIOUS_VALUE.test(String(t)))) return undefined;
    }
  }
  return entry;
}

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
  const diagnostics = [];
  const reasons = {};
  const how = {};

  console.log(`Игр со steamId: ${allWithId.length}; в этой порции: ${withId.length}`
    + `${offset ? ` (с ${offset + 1}-й)` : ''}; потоков: ${concurrency}, delay=${delay}мс`);

  /**
   * Один appid, один язык. Сначала с фильтром pc_requirements, если пусто — без
   * фильтра (у части приложений фильтр отдаёт пустой data), если и там пусто —
   * с явной витриной (cc): так магазин отвечает на возрастные игры.
   * Возвращает и сам ответ — по нему в отчёте видно причину «нет данных».
   */
  async function readReqs(id, lang) {
    const first = await fetchInfo(detailsUrl(id, lang));
    let req = first.json?.[String(id)]?.data?.pc_requirements ?? null;
    if (req) return { req, how: 'filter', first };

    const second = await fetchInfo(detailsUrl(id, lang, false));
    req = second.json?.[String(id)]?.data?.pc_requirements ?? null;
    if (req) return { req, how: 'без фильтра', first, second };

    if (!cc) return { req: null, how: 'нет', first, second };

    const third = await fetchInfo(detailsUrl(id, lang, false, cc));
    req = third.json?.[String(id)]?.data?.pc_requirements ?? null;
    return { req, how: req ? `cc=${cc}` : 'нет', first, second, third };
  }

  // Пул воркеров: каждый берёт следующую игру из очереди и опрашивает оба языка.
  // Так прогон укладывается в лимит джоба, а данные получаются те же.
  const queue = [...withId];
  let done = 0;
  const worker = async () => {
    while (queue.length) {
      const g = queue.shift();
      const [ruRes, enRes] = await Promise.all([readReqs(g.id, 'russian'), readReqs(g.id, 'english')]);
      await sleep(delay);
      const ru = ruRes.req;
      const en = enRes.req;

      const min = mergeLevel(parseRequirements(ru?.minimum), parseRequirements(en?.minimum));
      const rec = mergeLevel(parseRequirements(ru?.recommended), parseRequirements(en?.recommended));
      if (min || rec) {
        collected[g.slug] = { ...(min ? { min } : {}), ...(rec ? { rec } : {}) };
        const ruHas = Boolean(ru?.minimum || ru?.recommended);
        const enHas = Boolean(en?.minimum || en?.recommended);
        if (ruHas !== enHas) mismatches.push(`${g.slug}: язык магазина отдал данные только на ${ruHas ? 'ru' : 'en'}`);
        for (const [lang, res] of [['ru', ruRes], ['en', enRes]]) {
          if (res.req) how[res.how] = (how[res.how] || 0) + 1;
        }
      } else {
        misses.push(`${g.slug} (${g.id}) ${g.title}`);
        // Почему нет данных: без этого отчёта «MISS» ничего не объясняет
        const reason = /HTTP 4\d\d|HTTP 5\d\d|разбор JSON|сеть:/.test(describeAnswer(ruRes.first)) ? 'запрос не прошёл'
          : (ruRes.first.json?.[String(g.id)]?.success === false || enRes.first.json?.[String(g.id)]?.success === false ? 'магазин ответил success=false'
            : 'в ответе нет pc_requirements');
        reasons[reason] = (reasons[reason] || 0) + 1;
        if (diagnostics.length < diagLimit) {
          diagnostics.push(`DIAG ${g.slug} (${g.id}) ru[${describeAnswer(ruRes.first)} → ${ruRes.how}] en[${describeAnswer(enRes.first)} → ${enRes.how}]`);
        }
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
    const old = cleanEntry(existing[g.slug]);
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
    'Причины: ' + (Object.entries(reasons).map(([k, v]) => `${k} — ${v}`).join(' | ') || 'нет'),
    'Как получены: ' + (Object.entries(how).map(([k, v]) => `${k} — ${v}`).join(' | ') || 'нет'),
    ...diagnostics,
    `Запросов, которые не прошли (сеть/HTTP/разбор JSON): ${reasons['запрос не прошёл'] || 0}`,
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
