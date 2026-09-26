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
 *   node tools/pull-system-requirements.mjs --probe        # один запрос + диагностика
 *   node tools/pull-system-requirements.mjs --limit=40     # первые 40 (быстрая проверка)
 *   node tools/pull-system-requirements.mjs --batch=20 --delay=900
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
const limit = Number(arg('limit') || Infinity);
const batchSize = Math.max(1, Number(arg('batch') || 20));
const delay = Number(arg('delay') || 900);
const TIMEOUT = 30000;
const UA = 'Mozilla/5.0 (compatible; GustoPlay catalog resolver/1.0)';

const slugify = (s) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const games = PARTS.flatMap((list) => list).map((g) => ({ ...g, slug: g.slug || slugify(g.t) }));
const withId = games
  .map((g) => ({ slug: g.slug, title: g.t, id: STEAM_COVERS[g.slug]?.steamId }))
  .filter((g) => g.id)
  .slice(0, limit);
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

const detailsUrl = (ids, lang, filters = true) =>
  `https://store.steampowered.com/api/appdetails?appids=${ids.join(',')}&l=${lang}${filters ? '&filters=pc_requirements' : ''}`;

/**
 * Диагностика: у appdetails есть параметр filters, но у части приложений он отдаёт
 * пустой data. Пробуем оба варианта и печатаем, что именно вернул Steam.
 */
async function probe() {
  const sample = withId.find((g) => g.slug === 'deep-rock-galactic') || withId[0];
  console.log(`Проверка appid ${sample.id} (${sample.title})`);
  for (const [label, url] of [
    ['фильтр pc_requirements', detailsUrl([sample.id], 'russian')],
    ['без фильтра', detailsUrl([sample.id], 'russian', false)],
  ]) {
    const data = await fetchJson(url);
    const app = data && data[String(sample.id)];
    const req = app?.data?.pc_requirements;
    console.log(`\n— ${label}: success=${app?.success} dataType=${Array.isArray(app?.data) ? 'array' : typeof app?.data} pc_requirements=${req ? typeof req : 'нет'}`);
    if (req) console.log(JSON.stringify(req).slice(0, 900));
  }
  return sample;
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
    const match = FIELD_LABELS.map(([re, key]) => [line.match(re), key]).find(([m]) => m);
    if (match) {
      const [, m, key] = match;
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

/** «8 ГБ» → «8 GB»: единицы измерения одинаковы в обоих языках, а строки — нет */
const unifyUnits = (value) => (value
  ? clean(value).replace(/ГБ\b/g, 'GB').replace(/МБ\b/g, 'MB').replace(/Гб\b/g, 'GB').replace(/Мб\b/g, 'MB').replace(/[\s-]*и более$/i, '')
  : undefined);

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

  // Старые данные сохраняем: если Steam не ответит по части игр, файл не обеднеет
  let existing = {};
  try {
    const mod = await import(`${outFile.href}?t=${Date.now()}`);
    existing = mod.SYSREQ || {};
  } catch { /* файла ещё нет */ }

  const collected = {};
  const misses = [];
  const mismatches = [];
  const batches = [];
  for (let i = 0; i < withId.length; i += batchSize) batches.push(withId.slice(i, i + batchSize));

  console.log(`Игр со steamId: ${withId.length}; запросов: ${batches.length} × 2 языка (batch=${batchSize}, delay=${delay}мс)`);

  for (const [index, batch] of batches.entries()) {
    const ids = batch.map((g) => g.id);
    const perLang = {};
    for (const lang of ['russian', 'english']) {
      let data = null;
      try { data = await fetchJson(detailsUrl(ids, lang)); } catch (error) {
        console.log(`::warning::батч ${index + 1} (${lang}) не получен: ${String(error?.message || error).slice(0, 120)}`);
      }
      // Пустой ответ с фильтром — пробуем без фильтра (у части приложений иначе пусто)
      if (!data || !batch.some((g) => data[String(g.id)]?.data?.pc_requirements)) {
        try {
          const full = await fetchJson(detailsUrl(ids, lang, false));
          if (full) data = full;
        } catch { /* ниже отметим как «нет данных» */ }
      }
      for (const g of batch) perLang[`${g.slug}|${lang}`] = data?.[String(g.id)]?.data?.pc_requirements ?? null;
      await sleep(delay);
    }

    for (const g of batch) {
      const ru = perLang[`${g.slug}|russian`];
      const en = perLang[`${g.slug}|english`];
      const min = mergeLevel(parseRequirements(ru?.minimum), parseRequirements(en?.minimum));
      const rec = mergeLevel(parseRequirements(ru?.recommended), parseRequirements(en?.recommended));
      if (min || rec) {
        collected[g.slug] = { ...(min ? { min } : {}), ...(rec ? { rec } : {}) };
        const ruHas = Boolean(parseRequirements(ru?.minimum) || parseRequirements(ru?.recommended));
        const enHas = Boolean(parseRequirements(en?.minimum) || parseRequirements(en?.recommended));
        if (ruHas !== enHas) mismatches.push(`${g.slug}: язык магазина отдал данные только на ${ruHas ? 'ru' : 'en'}`);
      } else {
        misses.push(`${g.slug} (${g.id}) ${g.title}`);
      }
    }
    console.log(`батч ${index + 1}/${batches.length}: всего с данными ${Object.keys(collected).length}`);
  }

  // Оверрайды поверх сети; старые данные — только там, где сеть ничего не дала
  const merged = {};
  for (const g of withId) {
    const fresh = collected[g.slug];
    const old = existing[g.slug];
    const override = overrides[g.slug];
    const entry = override || fresh || old;
    if (entry) merged[g.slug] = entry;
  }

  await writeFile(outFile, renderSysreqFile(merged));

  const withoutReq = withId.filter((g) => !merged[g.slug]);
  const report = [
    `Требования к ПК: ${Object.keys(merged).length} из ${withId.length} игр со steamId`,
    `Игр без steamId (данные недоступны через Store API): ${withoutId.length} — ${withoutId.map((g) => g.slug).join(', ')}`,
    `Данные не получены (нет pc_requirements или запрос не прошёл): ${withoutReq.length}`,
    ...withoutReq.map((g) => `MISS ${g.slug} (${g.id}) ${g.title}`),
    ...mismatches.map((m) => `LANG ${m}`),
    'Минимальные и рекомендуемые есть у: ' + Object.values(merged).filter((e) => e.min && e.rec).length,
    'Только минимальные: ' + Object.values(merged).filter((e) => e.min && !e.rec).length,
    'Только рекомендуемые: ' + Object.values(merged).filter((e) => !e.min && e.rec).length,
  ].join('\n');
  await writeFile(reviewFile, `${report}\n`);
  console.log(`\n${report.split('\n').slice(0, 8).join('\n')}`);
}

main().catch((error) => {
  console.error(`Ошибка: ${error?.stack || error}`);
  process.exit(1);
});
