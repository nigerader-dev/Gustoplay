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
 * ВАЖНО про ключ ответа: магазин отвечает объектом, ключ которого НЕ ВСЕГДА равен
 * запрошенному appid (проверено 26.09.2026 на живом API: appids=548430 →
 * {"4207930":{…,"steam_appid":548430,…}}). Поэтому карточка ищется по ключу appid,
 * затем по совпадению steam_appid внутри карточки, затем как единственная карточка
 * в ответе — см. readCard(). Именно на этом сломался прогон 6: 12 игр получили
 * полную карточку с требованиями, но записались в отчёт как «нет данных».
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
// Витрина магазина для повторных проходов: часть игр Steam отдаёт только с явной
// страной (например, возрастной фильтр). Пустая строка отключает витрину.
const cc = arg('cc') === undefined ? 'us' : String(arg('cc'));
const diagLimit = Math.max(0, Number(arg('diag') || 12));
// Проходы по недостающим играм. Магазин отвечает `success: true, data: []` на часть
// запросов (троттлинг): прогон 3 показал так 293 игры из 401. Повторный проход по
// ним — с большей паузой, в один-два потока и с явной витриной cc — обычно отдаёт данные.
const passes = Math.max(1, Math.min(6, Number(arg('passes') || 1)));
// Таймаут запроса. 30 секунд на «залипший» запрос в сумме с ретраями съедали
// минуты (прогон 4 упёрся в лимит джоба), поэтому 12 секунд: магазин либо отвечает
// быстро, либо ответ приходит в следующем проходе.
const TIMEOUT = Math.max(3000, Number(arg('timeout') || 12000));
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

/**
 * Достаёт карточку приложения из ответа appdetails.
 *
 * Магазин отвечает объектом с ключом appid — но НЕ ВСЕГДА запрошенным. Проверено
 * 26.09.2026 на живом API:
 *   appdetails?appids=548430&l=english → {"4207930":{"success":true,"data":{…,"steam_appid":548430,…}}}
 *   appdetails?appids=550&l=russian&cc=us → {"322070":{"success":true,"data":{…,"steam_appid":550,…}}}
 * Старый разбор искал json[appid] и объявлял такие ответы пустыми: в прогоне 6 из-за
 * этого 12 игр (deep-rock-galactic, left-4-dead-2, it-takes-two …) попали в отчёт
 * строкой «pc_requirements=есть», но с пометкой «нет данных». Поэтому карточку ищем
 * так: ключ appid → карточка с совпадающим steam_appid → единственная карточка
 * в ответе. Способ поиска (`via`) попадает в отчёт, чтобы это не пряталось.
 */
function readCard(json, id) {
  if (!json || typeof json !== 'object') return { app: null, via: 'нет ответа' };
  const direct = json[String(id)];
  if (direct) return { app: direct, via: 'ключ appid' };
  const cards = (Array.isArray(json) ? json : Object.values(json))
    .filter((v) => v && typeof v === 'object' && 'data' in v);
  const byAppId = cards.find((v) => String(v.data?.steam_appid ?? '') === String(id));
  if (byAppId) return { app: byAppId, via: 'steam_appid в карточке' };
  if (cards.length === 1) return { app: cards[0], via: 'единственная карточка в ответе' };
  if (cards.length) return { app: cards[0], via: `первая из ${cards.length} карточек` };
  return { app: null, via: 'карточки нет' };
}

/**
 * pc_requirements приходит либо объектом { minimum, recommended }, либо строкой HTML
 * (так магазин отдаёт требования старых приложений). Раньше строка молча терялась.
 */
function reqLevels(pc) {
  if (!pc) return {};
  const raw = typeof pc === 'string' ? { minimum: pc } : {
    minimum: typeof pc.minimum === 'string' && pc.minimum ? pc.minimum : undefined,
    recommended: typeof pc.recommended === 'string' && pc.recommended ? pc.recommended : undefined,
  };
  // У старых приложений обе части лежат в одном поле minimum
  // («Minimum: … Recommended: …») — разделяем, иначе рекомендуемые теряются.
  if (raw.minimum && !raw.recommended) {
    const cut = splitRecommended(raw.minimum);
    if (cut) return cut;
  }
  return raw;
}

/** Делит строку «Minimum: … Recommended: …» на два уровня (так пишут старые игры) */
function splitRecommended(html) {
  // Без \b: он в JavaScript считается по ASCII-слову и перед кириллицей не срабатывает
  const m = String(html).match(/(recommended|рекомендуемые|рекомендуется)\s*:/i);
  if (!m || m.index < 10) return null;
  const head = html.slice(0, m.index);
  const tail = html.slice(m.index + m[0].length);
  return tail.trim().length > 10 ? { minimum: head, recommended: tail } : null;
}

/** Короткое описание ответа магазина — для отчёта и аннотаций */
function describeAnswer(res, id) {
  if (!res) return 'нет ответа';
  if (!res.json) return `HTTP ${res.status || '—'} ${res.error || ''}`.trim();
  const { app, via } = readCard(res.json, id);
  const data = app?.data;
  const pc = data?.pc_requirements;
  const kind = !pc ? 'нет' : (typeof pc === 'string' ? 'строкой' : 'объектом');
  return `HTTP ${res.status} success=${app?.success} data=${Array.isArray(data) ? `array(${data.length})` : typeof data}`
    + ` pc_requirements=${kind} найдено=${via} байт=${res.bytes}`;
}

/**
 * Почему у игры нет данных. Раньше всё сваливалось в одну строку «в ответе нет
 * pc_requirements» (прогон 3: 293 игры) — и было непонятно, где троттлинг
 * (магазин отвечает success:true с пустой карточкой), а где запрос не прошёл.
 * Различаем случаи по фактам из ответа, а не по догадке.
 */
function describeMissReason(results, id) {
  if (results.some((r) => !r.first?.json)) return 'запрос не прошёл';
  const cards = results.map((r) => readCard(r.first.json, id).app);
  if (cards.every((c) => !c || c.success === false)) return 'магазин ответил success=false';
  const datas = cards.map((c) => c?.data);
  if (datas.some((d) => d == null || (Array.isArray(d) && d.length === 0))) return 'магазин отдал пустую карточку (троттлинг)';
  if (datas.some((d) => d?.pc_requirements)) return 'требования пришли, но не разобрались';
  return 'в карточке нет pc_requirements';
}

const fetchJson = async (url, tries = 3) => (await fetchInfo(url, tries)).json ?? null;

const detailsUrl = (id, lang, filters = true, cc = '') =>
  `${API_BASE}/api/appdetails?appids=${id}&l=${lang}${filters ? '&filters=pc_requirements' : ''}${cc ? `&cc=${cc}` : ''}`;

/** Диагностика одной игры: HTTP-статус, тип data и наличие pc_requirements */
async function probeOne(id, lang, filters, storefront = '') {
  const label = `${filters ? 'фильтр' : 'без фильтра'}${storefront ? ` cc=${storefront}` : ''}`;
  const url = detailsUrl(id, lang, filters, storefront);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT) });
    const body = res.ok ? await res.json() : null;
    const { app, via } = readCard(body, id);
    const keys = body && typeof body === 'object' ? Object.keys(body).join(',') : '—';
    const levels = reqLevels(app?.data?.pc_requirements);
    console.log(`::notice::sysreq-probe: ${label} ${lang} HTTP ${res.status} success=${app?.success}`
      + ` key=${keys} найдено=${via} data=${Array.isArray(app?.data) ? `array(${app.data.length})` : typeof app?.data}`
      + ` уровни=${[levels.minimum ? 'min' : '', levels.recommended ? 'rec' : ''].filter(Boolean).join('+') || 'нет'}`);
    if (levels.minimum || levels.recommended) console.log(`::notice::sysreq-probe: ${JSON.stringify(levels).slice(0, 700)}`);
    return Boolean(levels.minimum || levels.recommended);
  } catch (error) {
    console.log(`::notice::sysreq-probe: ${label} ${lang} ошибка сети: ${String(error?.message || error).slice(0, 120)}`);
    return false;
  }
}

/**
 * Диагностика (--probe): печатаем, что именно отвечает магазин на один appid.
 * Проверяем три варианта — фильтр, без фильтра и без фильтра с витриной, — чтобы
 * в следующих прогонах было видно, какой из них живой. Заодно проверяем, почему
 * падают пакетные запросы (HTTP 400).
 */
async function probe() {
  const sample = withId.find((g) => g.slug === 'deep-rock-galactic') || withId[0];
  console.log(`Проверка appid ${sample.id} (${sample.title})`);
  await probeOne(sample.id, 'russian', true);
  await probeOne(sample.id, 'russian', false);
  await probeOne(sample.id, 'english', false);
  await probeOne(sample.id, 'english', false, cc || 'us');
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
  // Русская карточка Steam пишет «64-разрядные процессор и операционная система» —
  // без этих шаблонов прогон 36355500850 (234c1de) потерял bit64 у 9 ru-only игр
  // (persona-5-royal, baldurs-gate-3 и др.), и вердикт «рекомендуемые» в pcfit
  // падал до «минимальных» — тест test-plan ловит это на persona-5-royal.
  /64-разрядн[а-яё]*\s+процессор/i,
  /64-битн[а-яё]*\s+процессор/i,
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
  if (Object.keys(out).length) return out;

  // Требования одной строкой без меток: «Minimum: 500 mhz processor, 96mb ram, 16mb
  // video card, Windows XP, Mouse, Keyboard, Internet Connection» — так их публикуют
  // старые приложения (Half-Life, Civilization IV). По полям такое не разложить, но и
  // терять нельзя: иначе игра выглядит так, будто магазин требований не публикует.
  const prose = cleanValue(lines.join(' ').replace(/^(minimum|recommended|минимальные|рекомендуемые|минимум|рекомендуется)\s*:?\s*/i, ''));
  return prose && prose.length >= 25 && /\d/.test(prose) ? { note: prose.slice(0, 400) } : null;
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
  // После удаления служебных слов («ОЗУ», «и более») перед знаком препинания остаётся
  // пробел: «96 мб ОЗУ, мышь» → «96 мб , мышь». Такой пробел убираем.
  return clean(out.replace(/\s+([,.;:])/g, '$1'));
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
  // Свободные текстовые поля (note, sound, net) НЕ проверяем на «Метка: »:
  // примечания Steam легитимно содержат двоеточия («Video Preset: Lowest (720p)»
  // у assassins-creed-odyssey, «Expected Framerate: 60 FPS…» у octopath-traveler),
  // и прогон 36356582634 (f3b340b) из-за этого выкинул три целые записи из файла.
  // Страж нужен только структурированным полям (os/cpu/ram/gpu/dx/disk), где
  // «Метка: » внутри значения — признак старого мусора от кривого парсинга.
  const FREE_TEXT = new Set(['note', 'sound', 'net']);
  for (const value of Object.values(entry)) {
    if (!value || typeof value !== 'object') return undefined;
    for (const [key, field] of Object.entries(value)) {
      if (FREE_TEXT.has(key)) continue;
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
  const lastPass = {};

  console.log(`Игр со steamId: ${allWithId.length}; в этой порции: ${withId.length}`
    + `${offset ? ` (с ${offset + 1}-й)` : ''}; потоков: ${concurrency}, delay=${delay}мс`);

  /**
   * Один appid, один язык: одна карточка appdetails за запрос (магазин отвечает
   * HTTP 400, если запросить несколько appid сразу).
   *
   * Вариант с filters=pc_requirements больше не используется: 26.09.2026 магазин
   * отдаёт по нему успешный ответ с пустыми данными — `{"620":{"success":true,
   * "data":[]}}` (проверено на 550 и 620; в прогоне 6 первый проход на фильтре
   * собрал 0 игр из 401, потратив 802 запроса). Первый проход — обычная карточка
   * без витрины (её дешевле отдаёт кэш), повторные проходы — с явной витриной cc:
   * так магазин отвечает по возрастным играм и отпускает троттлинг.
   */
  async function readReqs(id, lang, pass = 1) {
    const url = pass > 1 ? detailsUrl(id, lang, false, cc) : detailsUrl(id, lang, false, '');
    const retry = await fetchInfo(url, 2);
    const { app, via } = readCard(retry.json, id);
    const levels = reqLevels(app?.data?.pc_requirements);
    const req = levels.minimum || levels.recommended ? levels : null;
    return {
      req,
      levels,
      how: req ? (pass > 1 ? `повторный проход (${pass})` : 'первый проход') : 'нет',
      first: retry,
      app,
      via,
    };
  }

  /**
   * Один проход по очереди игр: пул воркеров опрашивает по две страницы (ru и en)
   * на игру. Так прогон укладывается в лимит джоба, а данные получаются те же.
   * Возвращает число игр, у которых появились требования.
   */
  async function collectPass(list, { pass, passDelay, passConcurrency }) {
    const queue = [...list];
    let done = 0;
    let added = 0;
    const worker = async () => {
      while (queue.length) {
        const g = queue.shift();
        const [ruRes, enRes] = await Promise.all([readReqs(g.id, 'russian', pass), readReqs(g.id, 'english', pass)]);
        await sleep(passDelay);
        const ru = ruRes.levels || {};
        const en = enRes.levels || {};

        const min = mergeLevel(parseRequirements(ru.minimum), parseRequirements(en.minimum));
        const rec = mergeLevel(parseRequirements(ru.recommended), parseRequirements(en.recommended));
        if (min || rec) {
          collected[g.slug] = { ...(min ? { min } : {}), ...(rec ? { rec } : {}) };
          added += 1;
          if (pass > 1) lastPass[g.slug] = pass;
          const ruHas = Boolean(ru.minimum || ru.recommended);
          const enHas = Boolean(en.minimum || en.recommended);
          if (ruHas !== enHas) mismatches.push(`${g.slug}: язык магазина отдал данные только на ${ruHas ? 'ru' : 'en'}`);
          for (const res of [ruRes, enRes]) {
            if (res.req) how[res.how] = (how[res.how] || 0) + 1;
          }
        } else {
          // Почему нет данных: без этого отчёта «MISS» ничего не объясняет.
          // Разбираем честно: пустая карточка (троттлинг) — не то же самое, что
          // неудавшийся запрос или карточка без блока pc_requirements.
          const reason = describeMissReason([ruRes, enRes], g.id);
          if (pass === passes) {
            if (!misses.includes(`${g.slug} (${g.id}) ${g.title}`)) misses.push(`${g.slug} (${g.id}) ${g.title}`);
            reasons[reason] = (reasons[reason] || 0) + 1;
            if (diagnostics.length < diagLimit) {
              diagnostics.push(`DIAG ${g.slug} (${g.id}) ru[${describeAnswer(ruRes.first, g.id)} → ${ruRes.how}]`
                + ` en[${describeAnswer(enRes.first, g.id)} → ${enRes.how}]`);
            }
          }
        }

        done += 1;
        if (done % progressEvery === 0 || done === list.length) {
          console.log(`проход ${pass}/${passes}: ${done}/${list.length}, всего с требованиями ${Object.keys(collected).length}`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(passConcurrency, list.length || 1) }, worker));
    return added;
  }

  // Проход 1 — как настроено (потоки + задержка). Дальше — только недостающие игры,
  // медленнее и в один поток: пустой ответ магазина почти всегда снимается паузой.
  let pending = [...withId];
  const addedByPass = {};
  let lastAdded = Infinity;
  for (let pass = 1; pass <= passes && pending.length; pass += 1) {
    const passDelay = pass === 1 ? delay : Math.max(600, delay * 3 * pass);
    const passConcurrency = pass === 1 ? concurrency : Math.max(1, Math.min(2, concurrency));
    console.log(`\nПроход ${pass}/${passes}: игр ${pending.length}, потоков ${passConcurrency}, пауза ${passDelay}мс`);
    const added = await collectPass(pending, { pass, passDelay, passConcurrency });
    addedByPass[pass] = added;
    // Сохраняем то, что уже собрано: оборвись джоб по таймауту — данные останутся
    await flush(pass);
    console.log(`после прохода ${pass} в файле ${Object.keys(collected).length} игр с требованиями`
      + (pass > 1 ? ` (проход добавил ${added})` : ''));
    // Останавливаемся, только если ДВА прохода подряд не дали ничего: один пустой
    // проход объясняется троттлингом (магазин отвечает data: []), и следующая
    // попытка с большей паузой обычно данные отдаёт.
    if (pass > 1 && added === 0 && lastAdded === 0) {
      console.log(`два прохода подряд без данных — дальше повторять нечего`);
      break;
    }
    lastAdded = added;
    pending = pending.filter((g) => !collected[g.slug]);
  }

  /**
   * Собирает итог и пишет оба файла. Вызывается после каждого прохода: если джоб
   * оборвётся по таймауту, уже собранные данные останутся в ветке, а не пропадут
   * вместе с прогоном (файл и отчёт — единственный способ сохранить результат).
   */
  async function flush(pass) {
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
    const withoutReq = allWithId.filter((g) => !merged[g.slug]);
    const report = buildReport({ merged, withoutReq, pass });
    await writeFile(outPath, renderSysreqFile(merged));
    await writeFile(reviewPath, `${report}\n`);
    return { merged, report };
  }

  /** Текст отчёта: покрытие, причины, способы получения и строки MISS/DIAG */
  function buildReport({ merged, withoutReq, pass }) {
    return [
      `Требования к ПК: ${Object.keys(merged).length} из ${allWithId.length} игр со steamId`,
      `Состояние после прохода ${pass}`,
      `Игр без steamId (данные недоступны через Store API): ${withoutId.length} — ${withoutId.map((g) => g.slug).join(', ')}`,
      `Данные не получены (нет pc_requirements или запрос не прошёл): ${withoutReq.length}`,
      'Причины: ' + (Object.entries(reasons).map(([k, v]) => `${k} — ${v}`).join(' | ') || 'нет'),
      'Как получены: ' + (Object.entries(how).map(([k, v]) => `${k} — ${v}`).join(' | ') || 'нет'),
      'По проходам: ' + (Object.entries(addedByPass).map(([p, n]) => `проход ${p} — ${n} игр`).join(' | ') || 'нет'),
      ...diagnostics,
      `Запросов, которые не прошли (сеть/HTTP/разбор JSON): ${reasons['запрос не прошёл'] || 0}`,
      ...withoutReq.map((g) => `MISS ${g.slug} (${g.id}) ${g.title}`),
      ...mismatches.map((m) => `LANG ${m}`),
      'Минимальные и рекомендуемые есть у: ' + Object.values(merged).filter((e) => e.min && e.rec).length,
      'Только минимальные: ' + Object.values(merged).filter((e) => e.min && !e.rec).length,
      'Только рекомендуемые: ' + Object.values(merged).filter((e) => !e.min && e.rec).length,
    ].join('\n');
  }

  const { report } = await flush(Object.keys(addedByPass).length || 1);
  console.log(`\n${report.split('\n').slice(0, 10).join('\n')}`);
}

// Импорт модуля не должен ходить в сеть: main() запускается только при прямом вызове,
// иначе проверка tools/test-sysreq.mjs не смогла бы переиспользовать парсер.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Ошибка: ${error?.stack || error}`);
    process.exit(1);
  });
}

export { parseRequirements as parseSteamRequirements, readCard as readCardForTest };
