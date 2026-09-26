/**
 * Проверка «подойдёт ли мой ПК»: разбор требований магазина и сравнение с комплектующими.
 *
 * Здесь только логика — без DOM, чтобы её можно было проверить в Node (npm run test:pcfit).
 *
 * Что сравнивается и насколько это надёжно:
 *   • память и место на диске — числа из текста требований против выбранного объёма (точно);
 *   • версия Windows и разрядность — по порядку версий (точно);
 *   • DirectX — по версии, которую даёт выбранная система; поддержку на стороне видеокарты
 *     не проверяем и говорим об этом прямо (см. assumptions в результате);
 *   • процессор и видеокарта — по условной таблице производительности js/pcparts.js: и
 *     требование, и комплектующие пользователя ищутся в ОДНОЙ таблице. Если модель не
 *     распознана — пункт помечается «не проверено», а не «подходит».
 *
 * В одной строке требований бывает несколько альтернатив («GTX 660 или RX 460»). Требование
 * считается выполненным, если подходит ЛЮБАЯ из них, поэтому порог — самая слабая
 * распознанная альтернатива. Это одинаково верно и для минимальных, и для рекомендуемых.
 */

import { CPUS, GPUS, OS_OPTIONS, findCpu, findGpu, findOs, UNKNOWN } from './pcparts.js';

/** Параметры, которые мы вообще сравниваем (порядок — как в таблице результата) */
export const COMPARED = ['os', 'cpu', 'ram', 'gpu', 'dx', 'disk', 'bits'];

/* ------------------------------------------------------------------ *
 * Нормализация и сопоставление моделей
 * ------------------------------------------------------------------ */

/** Приводит текст к виду, удобному для поиска моделей: строчные, только буквы и цифры */
export const normalize = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[®™©]/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const VENDOR_PATTERNS = {
  nvidia: /nvidia|geforce/,
  amd: /amd|radeon|ati/,
  intel: /intel|arc/,
};

/** Названные в строке производители — чтобы «Intel HD 4000» не совпал с «Radeon HD 4000 series» */
function namedVendors(text) {
  const found = new Set();
  for (const [vendor, re] of Object.entries(VENDOR_PATTERNS)) if (re.test(text)) found.add(vendor);
  return found;
}

/**
 * Ищет модель в таблице по нормализованному тексту. Выигрывает самое длинное совпадение
 * (модель точнее семейства), при равной длине — конкретная модель вместо серии.
 * Совпадение должно начинаться и заканчиваться на границе слова, иначе «gtx 1660» поймалось
 * бы внутри «gtx 1660 super»... что как раз нужно, но «rx 580» внутри «rx 5800» — нет.
 */
export function matchPart(text, table) {
  const alt = normalize(text);
  if (!alt) return null;
  const vendors = namedVendors(alt);
  let best = null;
  for (const part of table) {
    if (part.vendor && [...vendors].some((v) => v !== part.vendor)) continue;
    for (const rawKey of part.keys) {
      const key = normalize(rawKey);
      if (!key) continue;
      let from = 0;
      for (;;) {
        const at = alt.indexOf(key, from);
        if (at === -1) break;
        from = at + 1;
        const before = alt[at - 1];
        const after = alt[at + key.length];
        if ((before && /[a-z0-9]/.test(before)) || (after && /[a-z0-9]/.test(after))) continue;
        const better = !best
          || key.length > best.key.length
          || (key.length === best.key.length && best.part.series && !part.series);
        if (better) best = { part, key };
        break;
      }
    }
  }
  return best?.part ?? null;
}

/** Разбирает строку требований на альтернативы: «A или B», «A / B», «A, B» */
export function splitAlternatives(text) {
  return String(text ?? '')
    .split(/\s+(?:or|или|and|и)\s+|\s*[|/;,]\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Порог по модели: самая слабая распознанная альтернатива (требование выполнимо любой из них) */
export function requirementPart(text, table) {
  const matched = splitAlternatives(text)
    .map((alt) => matchPart(alt, table))
    .filter(Boolean);
  if (!matched.length) return null;
  return matched.reduce((weakest, part) => (part.score < weakest.score ? part : weakest), matched[0]);
}

/* ------------------------------------------------------------------ *
 * Разбор значений требований
 * ------------------------------------------------------------------ */

/** Значения поля могут быть строкой или парой { ru, en } — сравниваем по обоим языкам */
export const fieldTexts = (value) => (typeof value === 'string'
  ? [value]
  : [value?.ru, value?.en].filter((v) => typeof v === 'string'));

/** Объём в гигабайтах: «8 GB RAM» → 8, «512 MB» → 0.5. Берём максимальное число в строке. */
export function parseGB(text) {
  let best = null;
  for (const m of String(text ?? '').toLowerCase().matchAll(/(\d+(?:[.,]\d+)?)\s*(gb|гб|mb|мб)/g)) {
    const value = Number(m[1].replace(',', '.'));
    const gb = /^(mb|мб)$/.test(m[2]) ? value / 1024 : value;
    if (best === null || gb > best) best = gb;
  }
  return best;
}

/** Версия DirectX: «11», «9.0c» → число. Требования в этом поле короткие, берём первое число. */
export function parseDx(text) {
  const m = String(text ?? '').match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

const OS_RANK_PATTERNS = [
  [/(?:windows|win|виндовс|вин)\s*(?:®|™)?\s*11\b/, 11],
  [/(?:windows|win|виндовс|вин)\s*(?:®|™)?\s*10\b/, 10],
  [/(?:windows|win|виндовс|вин)\s*(?:®|™)?\s*8[ .]?1\b/, 6.3],
  [/(?:windows|win|виндовс|вин)\s*(?:®|™)?\s*8\b/, 6.2],
  [/(?:windows|win|виндовс|вин)\s*(?:®|™)?\s*7\b/, 6.1],
  [/vista|виста/, 6.0],
  [/(?:windows|win|виндовс|вин)\s*(?:®|™)?\s*(?:xp|хр)\b|\bxp\b|\bхр\b/, 5.1],
  [/windows\s*2000|win\s*2000/, 5.0],
];

/**
 * Разбор строки «системные требования»: версия Windows (по порядку версий) и требование
 * 64-битной системы. Если в строке перечислены несколько версий («7 / Vista / XP»),
 * берём самую старую: подходит любая из списка, а новая система обратно совместима.
 */
export function parseOs(text) {
  const s = String(text ?? '').toLowerCase().replace(/[®™©]/g, ' ');
  const ranks = OS_RANK_PATTERNS.filter(([re]) => re.test(s)).map(([, rank]) => rank);
  const other = /linux|ubuntu|mac\s?os|macos|steam\s?os|android/.test(s);
  // Иногда магазин пишет в поле «ОС» просто номер: «10», «10 64-bit». Поле всё равно про
  // систему, поэтому номер читаем как версию Windows — но только если в строке нет других
  // слов (иначе «Windows 7 SP1, 8.1» дало бы неверную версию).
  if (!ranks.length && !other && /^\s*(10|11|8(\.1)?|7)\b/.test(s)) {
    const bare = /^\s*(11|10|8\.1|8|7)\b/.exec(s)[1];
    ranks.push({ 11: 11, 10: 10, '8.1': 6.3, 8: 6.2, 7: 6.1 }[bare]);
  }
  return {
    rank: ranks.length ? Math.min(...ranks) : null,
    other,
    bit64: /64\s*[-\s]?bit|64\s*бит|x64/.test(s),
  };
}

/**
 * Разбирает один уровень требований (min или rec) в сравнимые величины.
 * Каждое поле — либо значение, либо null («в требованиях этого нет / не распознано»).
 */
export function analyzeLevel(level) {
  if (!level) return null;
  const texts = (field) => fieldTexts(level[field]);
  const maxOf = (field, parse) => {
    const values = texts(field).map(parse).filter((v) => v !== null && v !== undefined);
    return values.length ? Math.max(...values) : null;
  };

  const osParsed = texts('os').map(parseOs).filter((o) => o.rank !== null || o.other);
  const cpuText = texts('cpu').join(' | ');
  const gpuText = texts('gpu').join(' | ');
  // У части игр требование к DirectX стоит только в строке видеокарты
  // («Direct X 11.0 compatible video card») — берём его оттуда, если поля dx нет.
  const dxFromGpu = texts('gpu')
    .map((t) => Number(/(?:direct\s*x|directx)\s*(\d+(?:\.\d+)?)/i.exec(t)?.[1]))
    .filter((v) => Number.isFinite(v));

  return {
    raw: {
      os: texts('os')[0] || '',
      cpu: texts('cpu')[0] || '',
      ram: texts('ram')[0] || '',
      gpu: texts('gpu')[0] || '',
      dx: texts('dx')[0] || '',
      disk: texts('disk')[0] || '',
    },
    ram: maxOf('ram', parseGB),
    disk: maxOf('disk', parseGB),
    dx: (() => {
      const fromField = maxOf('dx', parseDx);
      if (fromField !== null) return fromField;
      return dxFromGpu.length ? Math.max(...dxFromGpu) : null;
    })(),
    osRank: osParsed.length ? Math.max(...osParsed.map((o) => o.rank ?? -Infinity)) : null,
    osOtherOnly: !osParsed.length && texts('os').some((t) => parseOs(t).other),
    bit64: Boolean(level.bit64) || osParsed.some((o) => o.bit64),
    cpu: requirementPart(cpuText, CPUS),
    gpu: requirementPart(gpuText, GPUS),
  };
}

/* ------------------------------------------------------------------ *
 * Сравнение с комплектующими пользователя
 * ------------------------------------------------------------------ */

/** Допуск «на грани»: производительность ниже требования не больше чем на 10% */
const CLOSE_RATIO = 0.9;

/** Сравнивает две производительности (баллы из одной таблицы) */
function compareScore(have, need) {
  if (have === null || need === null || have === undefined || need === undefined) return 'unknown';
  if (have >= need) return 'ok';
  return have >= need * CLOSE_RATIO ? 'close' : 'fail';
}

/**
 * Сравнивает требования игры с комплектующими пользователя.
 *
 * pc — { cpu, gpu, ram, disk, os, bits } из профиля (id из js/pcparts.js, 'unknown' — не знаю).
 * Возвращает строки таблицы, статус по каждому параметру и общий вердикт:
 *   'recommended' — проходит и минимальные, и рекомендуемые;
 *   'minimum'     — проходит минимальные, но не дотягивает до рекомендуемых;
 *   'not-enough'  — не проходит минимальные (в missing перечислено, чего не хватает);
 *   'unknown'     — сравнить нечего (всё не распознано или не указано).
 */
export function compareWithPc(game, pc) {
  const min = analyzeLevel(game?.sysreq?.min);
  const rec = analyzeLevel(game?.sysreq?.rec);
  const hasData = Boolean(min || rec);

  const userCpu = pc?.cpu && pc.cpu !== UNKNOWN ? findCpu(pc.cpu) : null;
  const userGpu = pc?.gpu && pc.gpu !== UNKNOWN ? findGpu(pc.gpu) : null;
  const userOs = pc?.os && pc.os !== UNKNOWN ? findOs(pc.os) : null;
  const userRam = Number.isFinite(Number(pc?.ram)) && pc.ram !== UNKNOWN ? Number(pc.ram) : null;
  const userDisk = Number.isFinite(Number(pc?.disk)) && pc.disk !== UNKNOWN ? Number(pc.disk) : null;
  const userBits = pc?.bits === '32' ? 32 : (pc?.bits === '64' ? 64 : null);
  const userOsOther = Boolean(userOs?.other);

  /** Что у пользователя по каждому параметру — для колонки «у вас» */
  const have = {
    os: userOs?.name || null,
    cpu: userCpu?.name || null,
    ram: userRam !== null ? `${userRam} GB` : null,
    gpu: userGpu?.name || null,
    dx: userOs?.dx ? String(userOs.dx) : null,
    disk: userDisk !== null ? `${userDisk} GB` : null,
    bits: userBits ? String(userBits) : null,
  };

  /** Статус по параметру и уровню: ok | close | fail | unknown */
  const status = (id, level) => {
    if (!level) return 'unknown';
    switch (id) {
      case 'cpu':
        if (userOsOther) return 'unknown';
        return compareScore(userCpu?.score ?? null, level.cpu?.score ?? null);
      case 'gpu':
        return compareScore(userGpu?.score ?? null, level.gpu?.score ?? null);
      case 'ram':
        if (userRam === null || level.ram === null) return 'unknown';
        return userRam >= level.ram ? 'ok' : 'fail';
      case 'disk':
        if (userDisk === null || level.disk === null) return 'unknown';
        return userDisk >= level.disk ? 'ok' : 'fail';
      case 'os':
        if (!userOs || userOs.rank === null) return 'unknown';
        if (level.osOtherOnly) return 'unknown';    // в требованиях только Linux/macOS — сравнить не с чем
        if (level.osRank === null) return 'unknown';
        return userOs.rank >= level.osRank ? 'ok' : 'fail';
      case 'dx':
        // DirectX считаем по версии системы: поддержку на стороне видеокарты не проверяем
        if (!userOs?.dx || level.dx === null) return 'unknown';
        if (level.dx <= userOs.dx) return 'ok';
        return level.dx - userOs.dx <= 0.5 ? 'close' : 'fail';
      case 'bits':
        if (!level.bit64) return 'unknown';         // требования к разрядности в этой игре не заявлены
        if (userBits === null) return 'unknown';
        return userBits >= 64 ? 'ok' : 'fail';
      default:
        return 'unknown';
    }
  };

  const rows = COMPARED.map((id) => ({
    id,
    // «Требуется»: минимальные и рекомендуемые отдельно — как в блоке «Требования к ПК»
    need: { min: min ? levelNeed(min, id) : null, rec: rec ? levelNeed(rec, id) : null },
    // Идентификаторы распознанных моделей: по ним интерфейс показывает название на своём языке
    // (серии и поколения подписаны по-русски и по-английски, заводские имена совпадают)
    needPart: {
      min: id === 'cpu' ? (min?.cpu?.id ?? null) : (id === 'gpu' ? (min?.gpu?.id ?? null) : null),
      rec: id === 'cpu' ? (rec?.cpu?.id ?? null) : (id === 'gpu' ? (rec?.gpu?.id ?? null) : null),
    },
    havePart: id === 'cpu' ? (userCpu?.id ?? null) : (id === 'gpu' ? (userGpu?.id ?? null) : null),
    haveOs: id === 'os' ? (userOs?.id ?? null) : null,
    have: have[id],
    min: status(id, min),
    rec: status(id, rec),
  }));

  const missing = COMPARED.filter((id) => rows.find((r) => r.id === id).min === 'fail');
  const tested = COMPARED.filter((id) => {
    const row = rows.find((r) => r.id === id);
    return row.min !== 'unknown' || row.rec !== 'unknown';
  });
  const untested = COMPARED.filter((id) => !tested.includes(id));

  let verdict = 'unknown';
  if (!hasData) verdict = 'unknown';
  else if (!tested.length) verdict = 'unknown';
  else if (missing.length) verdict = 'not-enough';
  else {
    const recFail = COMPARED.filter((id) => rows.find((r) => r.id === id).rec === 'fail');
    const recUntested = COMPARED.filter((id) => rows.find((r) => r.id === id).rec === 'unknown');
    verdict = recFail.length === 0 && recUntested.length === 0 && rec ? 'recommended' : 'minimum';
  }

  return {
    hasData,
    verdict,
    missing,
    untested,
    rows,
    // Оговорки, которые блок показывает пользователю: приблизительность и что именно не проверяется
    assumptions: {
      approx: true,
      dxByOs: true,
      cpuUnknown: Boolean(min?.cpu || rec?.cpu) && !userCpu,
      gpuUnknown: Boolean(min?.gpu || rec?.gpu) && !userGpu,
    },
  };
}

/** Человекочитаемое значение требования для одного параметра и уровня */
function levelNeed(level, id) {
  switch (id) {
    case 'cpu': return level.cpu?.name || null;
    case 'gpu': return level.gpu?.name || null;
    case 'ram': return level.ram !== null ? `${level.ram} GB` : null;
    case 'disk': return level.disk !== null ? `${level.disk} GB` : null;
    case 'dx': return level.dx !== null ? String(level.dx) : null;
    case 'os': {
      if (level.osRank === null) return level.osOtherOnly ? 'Linux / macOS' : null;
      return OS_OPTIONS.find((o) => o.rank === level.osRank)?.name || null;
    }
    case 'bits': return level.bit64 ? '64' : null;
    default: return null;
  }
}

/* ------------------------------------------------------------------ *
 * Профиль ПК пользователя
 * ------------------------------------------------------------------ */

/** Пустой профиль: все поля «не знаю» */
export const emptyPc = () => ({ cpu: UNKNOWN, gpu: UNKNOWN, ram: UNKNOWN, disk: UNKNOWN, os: UNKNOWN, bits: UNKNOWN });

/** Готов ли профиль к сравнению: хотя бы одно поле заполнено */
export const pcFilled = (pc) => Boolean(pc) && Object.values(pc).some((v) => v && v !== UNKNOWN);

/** Нормализует то, что лежит в профиле (мог остаться мусор от старых версий или чужих данных) */
export function normalizePc(raw) {
  const pc = emptyPc();
  if (!raw || typeof raw !== 'object') return pc;
  if (findCpu(raw.cpu)) pc.cpu = raw.cpu;
  if (findGpu(raw.gpu)) pc.gpu = raw.gpu;
  if (findOs(raw.os)) pc.os = raw.os;
  if (raw.ram !== UNKNOWN && Number.isFinite(Number(raw.ram)) && Number(raw.ram) > 0) pc.ram = Number(raw.ram);
  if (raw.disk !== UNKNOWN && Number.isFinite(Number(raw.disk)) && Number(raw.disk) > 0) pc.disk = Number(raw.disk);
  if (raw.bits === '32' || raw.bits === '64') pc.bits = raw.bits;
  return pc;
}
