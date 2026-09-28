#!/usr/bin/env node
/**
 * Собирает проверяемые данные для кандидатов каталога (tools/catalog-candidates.json):
 * appid, год, разработчика, издателя, жанры и категории Steam (режимы кооп/PvP
 * «как в магазине»), короткие описания ru/en, обычную цену, долю положительных
 * отзывов и — по возможности — оценки HowLongToBeat. Курс рубля берётся у ЦБ РФ.
 *
 * Запускать там, где есть доступ к Steam (локальная песочница сети не имеет):
 *   .github/workflows/catalog-batch.yml
 *   node tools/pull-catalog-candidates.mjs --delay=350
 *
 * Ничего не применяется автоматически: результат — tools/catalog-batch-data.json
 * (сырые данные с источниками) и tools/catalog-batch-review.txt (что не нашлось
 * и почему). Записи в каталог пишет человек по правилам docs/CONTENT.md, источники
 * фиксируются в docs/CONTENT-SOURCES.md.
 *
 * Честность данных:
 *   • appid находится только по точному совпадению нормализованного названия;
 *     «похожие» результаты не используются (см. resolve-steam-covers.mjs);
 *   • рейтинг — round(total_positive / total_reviews × 100) из Steam Reviews API,
 *     это пользовательский агрегат Steam, снимок на дату прогона;
 *   • цена — price_overview.initial (обычная цена, до скидки) с указанием валюты;
 *   • HLTB и ЦБ — best effort: недоступность честно пишется в отчёт, поля
 *     остаются пустыми, а не заменяются догадкой.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { PART_A } from '../js/catalog/part-a.js';
import { PART_B } from '../js/catalog/part-b.js';
import { PART_C } from '../js/catalog/part-c.js';
import { PART_D } from '../js/catalog/part-d.js';
import { PART_E } from '../js/catalog/part-e.js';
import { PART_F } from '../js/catalog/part-f.js';
import { PART_G } from '../js/catalog/part-g.js';
import { PART_H } from '../js/catalog/part-h.js';
import { PART_I } from '../js/catalog/part-i.js';

const candidatesPath = new URL('./catalog-candidates.json', import.meta.url);
const dataPath = new URL('./catalog-batch-data.json', import.meta.url);
const reviewPath = new URL('./catalog-batch-review.txt', import.meta.url);
const hltbDir = new URL('./hltb-pages/', import.meta.url);

const arg = (name) => process.argv.find((x) => x.startsWith(`--${name}=`))?.split('=')[1];
const DELAY = Number(arg('delay') || 350);
const TIMEOUT = Number(arg('timeout') || 15000);
const UA = 'Mozilla/5.0 (compatible; GustoPlay catalog collector/1.0)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Та же нормализация, что в резолвере обложек — сравнение должно быть одинаковым */
const norm = (s) => String(s || '').replace(/[™®©]/g, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const PARTS = [PART_A, PART_B, PART_C, PART_D, PART_E, PART_F, PART_G, PART_H, PART_I];
const existingNames = new Set(PARTS.flat().map((g) => norm(g.t)));

async function fetchJson(url, tries = 3) {
  for (let i = 1; i <= tries; i += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT) });
      if (res.status === 429) { await sleep(3000 * i); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      if (i === tries) throw error;
      await sleep(1200 * i);
    }
  }
  return null;
}

/** Курс USD ЦБ РФ на текущую дату. Недоступность — не ошибка прогона. */
async function fetchCbrRate() {
  try {
    const res = await fetch('https://www.cbr.ru/scripts/XML_daily.asp', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const date = xml.match(/Date="([\d.]+)"/)?.[1] || null;
    const value = xml.match(/<Valute ID="R01235">[\s\S]*?<Value>([\d,]+)<\/Value>/)?.[1];
    if (!value) throw new Error('USD не найден в ответе');
    return { ok: true, rate: Number(value.replace(',', '.')), date, url: 'https://www.cbr.ru/scripts/XML_daily.asp' };
  } catch (error) {
    return { ok: false, error: String(error.message || error) };
  }
}

/** Оценки времени из HowLongToBeat. Основной путь — неофициальный POST /api/search;
 * если Cloudflare отдаёт 403 (так было 27.09.2026 с GitHub-раннера), fallback —
 * GET страница поиска /?q=…: она серверно-рендерится и содержит id игры,
 * Main Story, Main + Extra и Completionist. */
async function fetchHltb(name) {
  const api = await hltbApi(name);
  const result = (api.matched || api.error !== 'HLTB HTTP 403') ? api : await hltbSearchPage(name);
  // нормализуем времена до чисел (часы), сохраняя исходные строки, если они были
  if (result.matched) {
    if (result.mainH === undefined) result.mainH = parseHltbTime(result.main);
    if (result.plusH === undefined) result.plusH = parseHltbTime(result.plus);
    if (result.hundredH === undefined) result.hundredH = parseHltbTime(result.hundred);
  }
  return result;
}

async function hltbApi(name) {
  try {
    const res = await fetch('https://howlongtobeat.com/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://howlongtobeat.com',
        'Referer': 'https://howlongtobeat.com/',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
      body: JSON.stringify({
        searchType: 'games',
        searchTerms: name.split(/\s+/),
        searchPage: 1,
        size: 5,
        searchOptions: {
          games: { userId: 0, platform: '', sortCategory: 'popular', rangeCategory: 'main', rangeTime: { min: 0, max: 0 }, gameplay: { perspective: '', flow: '', genre: '' }, modifier: '' },
          users: { sortCategory: 'postcount' },
          filter: '',
          sort: 0,
          randomizer: 0,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) throw new Error(`HLTB HTTP ${res.status}`);
    const json = await res.json();
    const game = (json.data || []).find((x) => norm(x.game_name) === norm(name));
    if (!game) return { matched: false, note: 'точного совпадения нет' };
    return { matched: true, via: 'api', id: game.game_id, name: game.game_name, main: game.compMain || null, plus: game.comp_plus || null, hundred: game.comp100 || null };
  } catch (error) {
    return { matched: false, error: String(error.message || error) };
  }
}

/** Разбор «54 Mins» / «7½ Hours» / «1½ Hours» → часы (число). */
function parseHltbTime(s) {
  if (!s) return null;
  const m = String(s).match(/([\d½¼¾⅓⅔0-9,.]+)\s*(Hours?|Mins?|M)/i);
  if (!m) return null;
  const frac = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
  const num = Number(frac[m[1]] !== undefined ? frac[m[1]] : m[1].replace(',', '.'));
  if (!Number.isFinite(num)) return null;
  return /min/i.test(m[2]) ? Math.round((num / 60) * 10) / 10 : num;
}

/** Fallback: серверно-рендеренная страница поиска. Сырой HTML сохраняется в
 *  tools/hltb-pages/<slug>.html (коммит/артефакт) — структуру страницы нельзя
 *  угадывать заранее, поэтому разбор дублируется локально по сохранённому HTML.
 *  Здесь — две известные разметки: текущая (заголовок-ссылка /game/<id> +
 *  подписи Main Story/Main + Extra/Completionist) и старая (search_list_tidbit). */
async function hltbSearchPage(name) {
  const slug = norm(name);
  try {
    const res = await fetch(`https://howlongtobeat.com/?q=${encodeURIComponent(name)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) throw new Error(`HLTB page HTTP ${res.status}`);
    const html = await res.text();
    try {
      await mkdir(hltbDir, { recursive: true });
      await writeFile(new URL(`./hltb-pages/${slug}.html`, import.meta.url), html);
    } catch { /* сохранение — best effort, разбор важнее */ }

    // Разметка 1 (текущая): <a href="…/game/<id>" title="Name">…Name…</a> и подписи
    const cardRe = /<a[^>]+href="https:\/\/howlongtobeat\.com\/game\/(\d+)"[^>]*(?:title="([^"]*)")?[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    let picked = null;
    while ((m = cardRe.exec(html))) {
      const title = (m[2] || m[3] || '').replace(/<[^>]+>/g, '').trim();
      if (norm(title) === slug) { picked = { id: Number(m[1]), title }; break; }
    }
    if (!picked) {
      // Разметка 2 (старая): game?id=<id> + search_list_tidbit
      const oldRe = /<h3[^>]*><a[^>]+href="[^"]*game\?id=(\d+)"[^>]*(?:title="([^"]*)")?[^>]*>([\s\S]*?)<\/a>/g;
      while ((m = oldRe.exec(html))) {
        const title = (m[2] || m[3] || '').replace(/<[^>]+>/g, '').trim();
        if (norm(title) === slug) { picked = { id: Number(m[1]), title }; break; }
      }
    }
    if (!picked) return { matched: false, note: 'страница поиска: точного совпадения нет (HTML сохранён)' };

    const grab = (label) => {
      const after = html.slice(html.indexOf(`game/${picked.id}`) !== -1 ? html.indexOf(`game/${picked.id}`) : 0);
      const mm = after.match(new RegExp(`${label}[\\s\\S]{0,200}?([\\d½¼¾⅓⅔,.]+)\\s*(?:&#189;|&frac12;|½)?\\s*(Hours?|Mins?|h|m)`, 'i'));
      return mm ? parseHltbTime(mm[0]) : null;
    };
    return {
      matched: true, via: 'search-page', id: picked.id, name: picked.title,
      mainH: grab('Main Story'), plusH: grab('Main \\+ Extra'), hundredH: grab('Completionist'),
      raw: null,
    };
  } catch (error) {
    return { matched: false, error: String(error.message || error) };
  }
}

/**
 * Карточка appdetails: магазин отвечает объектом, ключ которого не всегда равен
 * запрошенному appid (пример: appids=448510 → ключ "544740"). Ищем и по ключу,
 * и по steam_appid внутри ответа — тот же урок, что у сборщика sysreq.
 */
function findCard(json, appid) {
  if (!json) return null;
  for (const card of Object.values(json)) {
    if (card?.data?.steam_appid === appid) return card;
  }
  return json[String(appid)] || null;
}

const raw = JSON.parse(await readFile(candidatesPath, 'utf8'));
const all = raw.candidates.map((c) => (typeof c === 'string' ? { name: c } : c));
const candidates = all.filter((c) => !existingNames.has(norm(c.name)));
const skipped = all.length - candidates.length;

console.log(`Кандидатов: ${all.length}, уже в каталоге (пропуск): ${skipped}, к сбору: ${candidates.length}`);

const cbr = await fetchCbrRate();
console.log(`Курс ЦБ РФ: ${cbr.ok ? `${cbr.rate} ₽/$ на ${cbr.date}` : `недоступен (${cbr.error}) — конвертация будет по последнему задокументированному курсу`}`);

const data = { batch: raw.batch, collectedAt: new Date().toISOString(), cbr, entries: [] };
const review = [];

for (const cand of candidates) {
  const line = { requested: cand.name };
  try {
    // 1) appid по точному названию
    const search = await fetchJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cand.name.replace(/’/g, "'"))}&l=english&cc=us`);
    const apps = (search?.items || []).filter((x) => x.type === 'app');
    const exact = apps.find((x) => norm(x.name) === norm(cand.name));
    if (!exact?.id) {
      review.push(`MISS ${cand.name} — точного совпадения нет; кандидаты: ${apps.slice(0, 4).map((x) => `${x.name} (${x.id})`).join(' | ') || 'нет'}`);
      continue;
    }
    line.appid = exact.id;
    line.steamName = exact.name;

    // 2) appdetails: en (факты) и ru (короткое описание)
    const en = findCard(await fetchJson(`https://store.steampowered.com/api/appdetails?appids=${exact.id}&cc=us&l=english`), exact.id);
    if (!en?.success || !en.data) { review.push(`ERR ${cand.name} — appdetails success:false`); continue; }
    const d = en.data;
    if (d.type !== 'game') { review.push(`SKIP ${cand.name} — type=${d.type}, не игра`); continue; }
    if (d.release_date?.coming_soon) { review.push(`SKIP ${cand.name} — ещё не вышла (${d.release_date.date})`); continue; }
    const year = Number(String(d.release_date?.date || '').match(/(\d{4})/)?.[1]);
    if (!year) { review.push(`ERR ${cand.name} — год релиза не разобран: ${d.release_date?.date}`); continue; }

    const ru = findCard(await fetchJson(`https://store.steampowered.com/api/appdetails?appids=${exact.id}&cc=us&l=russian`), exact.id);

    line.year = year;
    line.releaseDate = d.release_date?.date || null;
    line.developers = d.developers || [];
    line.publishers = d.publishers || [];
    line.genres = (d.genres || []).map((g) => ({ id: g.id, en: g.description, ru: (ru?.data?.genres || []).find((x) => x.id === g.id)?.description || null }));
    line.categories = (d.categories || []).map((c) => c.description);
    line.shortEn = d.short_description || null;
    line.shortRu = ru?.data?.short_description || null;
    line.detailEn = (d.detailed_description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1400) || null;
    line.free = Boolean(d.is_free);
    if (d.price_overview) line.price = { currency: d.price_overview.currency, initial: d.price_overview.initial, final: d.price_overview.final, discount: d.price_overview.discount_percent };
    line.platforms = { windows: Boolean(d.platforms?.windows), mac: Boolean(d.platforms?.mac), linux: Boolean(d.platforms?.linux) };
    line.controller = d.controller_support || null;
    if (d.metacritic?.score) line.metacritic = d.metacritic.score;
    if (d.required_age && d.required_age !== 0) line.requiredAge = d.required_age;
    if (d.recommendations?.total) line.steamReviewCount = d.recommendations.total;

    // 3) доля положительных отзывов (Steam Reviews API)
    try {
      const rev = await fetchJson(`https://store.steampowered.com/appreviews/${exact.id}?json=1&language=all&review_type=all&purchase_type=all`);
      const pos = rev?.query_summary?.total_positive;
      const total = rev?.query_summary?.total_reviews;
      if (Number.isFinite(pos) && Number.isFinite(total) && total > 0) {
        line.reviews = { positive: pos, total, ratio: Math.round((pos / total) * 100) };
      }
    } catch (e) { review.push(`WARN ${cand.name} — appreviews недоступны: ${String(e.message || e)}`); }

    // 4) HowLongToBeat собирается отдельным браузерным этапом workflow.
    // Не смешиваем его с быстрым Steam-потоком: иначе один зависший HLTB
    // задерживает и не даёт закоммитить проверенные Steam-факты.
    if (process.env.GUSTOPLAY_FETCH_HLTB === '1') {
      const hltb = await fetchHltb(exact.name);
      if (hltb.matched) line.hltb = hltb;
      else review.push(`HLTB ${cand.name} — ${hltb.error || hltb.note}`);
    }

    data.entries.push(line);
    console.log(`  ✅ ${cand.name} → ${exact.id} (${year}) ${line.reviews ? `rat=${line.reviews.ratio}` : ''}${line.hltb ? ' hltb✓' : ''}`);
  } catch (error) {
    review.push(`ERROR ${cand.name} — ${String(error.message || error)}`);
    console.warn(`  ⚠️  ${cand.name}: ${error.message}`);
  }
  await sleep(DELAY);
}

data.entries.sort((a, b) => (a.steamName < b.steamName ? -1 : a.steamName > b.steamName ? 1 : 0));
await writeFile(dataPath, `${JSON.stringify(data, null, 1)}\n`);

const withPrice = data.entries.filter((e) => e.price).length;
const withHltb = data.entries.filter((e) => e.hltb?.matched).length;
const withReviews = data.entries.filter((e) => e.reviews).length;
review.unshift(
  `# catalog-batch-review.txt (batch=${raw.batch}, собрано ${data.collectedAt})`,
  `# Собрано: ${data.entries.length} из ${candidates.length} кандидатов (${skipped} уже были в каталоге)`,
  `# Цена (price_overview): ${withPrice} · рейтинг отзывов: ${withReviews} · HLTB: ${withHltb}`,
  `# Курс ЦБ РФ: ${cbr.ok ? `${cbr.rate} ₽/$ на ${cbr.date}` : `недоступен: ${cbr.error}`}`,
  `# MISS — точного совпадения в Steam нет, ERR/SKIP — данные не получены/не игра, HLTB — времени нет`,
);
await writeFile(reviewPath, `${review.join('\n')}\n`);

console.log(`\nСобрано: ${data.entries.length} · с ценой: ${withPrice} · с рейтингом: ${withReviews} · с HLTB: ${withHltb}`);
console.log(`Данные: ${dataPath.pathname}`);
console.log(`Отчёт: ${reviewPath.pathname} (${review.length - 5} замечаний)`);
