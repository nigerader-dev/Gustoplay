#!/usr/bin/env node
/**
 * Проверка ссылок на магазины: каждая игра должна вести на КОНКРЕТНУЮ страницу
 * игры, а не на поиск по названию, и каждая ссылка должна быть живой.
 *
 * Что проверяется (нужен доступ к сети — Steam закрыт в песочнице, поэтому запуск в CI):
 *   1) игры со steamId — страница существует, а название на Steam действительно про эту игру;
 *   2) игры без steamId — ищем страницу в Steam; если она есть, печатаем готовый steamId,
 *      чтобы добавить его в данные (игра получает прямую ссылку вместо магазина издателя);
 *   3) официальные ссылки (js/catalog/store-links.js) — отвечают HTTP 200 и заголовок
 *      страницы похож на название игры (защита от выдуманных и «съехавших» адресов);
 *   4) игры вообще без ссылки — их быть не должно, каждая игра ведёт хоть куда-то.
 *
 * Запуск:
 *   node tools/check-store-links.mjs              # отчёт в консоль
 *   node tools/check-store-links.mjs --suggest    # + блок JSON с найденными steamId
 *   node tools/check-store-links.mjs --limit=20   # быстрый прогон (отладка)
 *
 * Код возврата: 1 — есть настоящие проблемы (мёртвая ссылка, чужой appid, игра без ссылки).
 * Найденные, но не добавленные страницы Steam — это предложение, а не ошибка.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAMES } from '../js/catalog/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const suggest = args.includes('--suggest');
const candidatesArg = (args.find((a) => a.startsWith('--candidates=')) || '').split('=')[1];
const limit = Number((args.find((a) => a.startsWith('--limit=')) || '').split('=')[1]) || Infinity;
const STEAM_DELAY = Number((args.find((a) => a.startsWith('--delay=')) || '').split('=')[1]) || 350;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Нормализация названия для сравнения: без марок, регистра, пунктуации и диакритики */
const norm = (s) => String(s || '')
  .replace(/[™®©]/g, '')
  // «S.T.A.L.K.E.R.» → «STALKER»: иначе точки разбивают название на отдельные буквы
  .replace(/\b(?:[a-z]\.){2,}/gi, (m) => m.replace(/\./g, ''))
  // притяжательное «'s» не должно оставлять одиночную «s» после чистки пунктуации
  .replace(/['’ʼ]s\b/gi, '')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\b(the|a|an|edition|remastered|remake|definitive|deluxe|complete|enhanced|goty|game of the year)\b/g, ' ')
  // приписки изданий: страница в Steam часто называется иначе, чем игра в каталоге
  // («Death Stranding» ↔ «DEATH STRANDING DIRECTOR'S CUT», «Control» ↔ «CONTROL Ultimate Edition»)
  .replace(/\b(director|directors|cut|ultimate|final|legacy|collection|anniversary|gold|premium|bundle|pack|trilogy|hd)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

/**
 * Похожесть двух названий: доля общих слов (1 — совпадают полностью).
 * Сравнение с приписками изданий («Director's Cut», «Ultimate Edition») не должно
 * выглядеть как «чужая игра», иначе проверка шумит на корректных данных.
 */
function nameScore(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // одно название целиком входит в другое: «Spiritfarer» ↔ «Spiritfarer Farewell»
  if (` ${nb} `.includes(` ${na} `) || ` ${na} `.includes(` ${nb} `)) return 0.9;
  // разница только в номере части: «Overwatch 2» ↔ «Overwatch»
  const stripNum = (x) => x.replace(/\s+\d+$/, '');
  if (stripNum(na) === stripNum(nb)) return 0.75;
  const A = new Set(na.split(' ').filter(Boolean));
  const B = new Set(nb.split(' ').filter(Boolean));
  let common = 0;
  for (const w of A) if (B.has(w)) common += 1;
  return common / Math.max(A.size, B.size);
}

/**
 * Слова, которых нет в названии игры. Для НОВОЙ ссылки (игра без appid) это главный
 * признак чужого продукта: «Minecraft» ↔ «Minecraft Dungeons II», «Arknights» ↔
 * «Arknights: Endfield», «Football Manager 2024» ↔ «Football Manager 2024 In-game Editor»,
 * «League of Legends» ↔ «CONVERGENCE: A League of Legends Story» — совпадение по словам
 * высокое, но Steam-страница про другую игру. Пустой список = название отличается только
 * припиской издания, которую norm() уже убрал.
 */
function extraWords(title, steamName) {
  const A = new Set(norm(title).split(' ').filter(Boolean));
  return norm(steamName).split(' ').filter((w) => w && !A.has(w));
}

/**
 * Пары, где страница в Steam называется иначе по объективной причине: на ПК игра
 * выходила только в составе сборника. Такие случаи перечисляются здесь поимённо,
 * чтобы проверка не считала их ошибкой — но и не пропускала всё подряд.
 */
const STEAM_ALLOW = {
  'uncharted-4-a-thiefs-end': { appid: 1659420, why: 'на ПК Uncharted 4 выходила только в сборнике Legacy of Thieves Collection' },
};

/**
 * Отказ по частоте (429 и родственные) — это не «мёртвая ссылка», а «нас не пустили».
 * Steam ограничивает запросы с адресов CI, поэтому такие ответы нельзя ни считать
 * живыми, ни записывать в проблемы: иначе проверка красит валидные данные.
 */
const THROTTLED = new Set([403, 429, 500, 502, 503, 504]);
const RETRIES = 3;

async function getJson(url, attempt = 0) {
  let res;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'GustoPlay-link-check/1.0 (+https://gustoplay.ru)' },
      signal: AbortSignal.timeout(25000),
      redirect: 'follow',
    });
  } catch (e) {
    // сети нет или хост недоступен — это окружение, а не свойство ссылки
    if (attempt < RETRIES) { await sleep(1000 * (attempt + 1)); return getJson(url, attempt + 1); }
    return { ok: false, status: String(e?.cause?.code || e?.name || 'network'), throttled: true };
  }
  if (!res.ok) {
    if (THROTTLED.has(res.status) && attempt < RETRIES) {
      await sleep(1500 * (attempt + 1));           // backoff: 1.5s, 3s, 4.5s
      return getJson(url, attempt + 1);
    }
    return { ok: false, status: res.status, throttled: THROTTLED.has(res.status) };
  }
  return { ok: true, data: await res.json() };
}

/** Страница игры в Steam по appid: существует ли и то ли это название */
/**
 * Страница игры в Steam: HTTP-статус + название из <title>.
 * Нужна как вторая проверка после API: под нагрузкой Steam отвечает
 * `{"appid":{"success":false}}` с кодом 200 (это троттлинг, а не отсутствие игры),
 * и тогда «мёртвым» appid считать нельзя, пока не спросили саму страницу.
 */
async function steamPage(appid) {
  let res;
  try {
    res = await fetch(`https://store.steampowered.com/app/${appid}/?l=english&cc=US`, {
      headers: { 'User-Agent': 'GustoPlay-link-check/1.0 (+https://gustoplay.ru)', 'Accept-Language': 'en-US,en;q=0.8' },
      signal: AbortSignal.timeout(25000),
      redirect: 'follow',
    });
  } catch (e) {
    return { status: String(e?.cause?.code || e?.name || 'network'), unchecked: true };
  }
  if (res.status === 404) return { status: 404, found: false, unchecked: false };
  if (!res.ok) return { status: res.status, unchecked: THROTTLED.has(res.status) };
  const html = await res.text();
  // у несуществующего appid Steam отдаёт страницу «Site Error» с кодом 200 —
  // это именно мёртвая ссылка, а не «не смогли проверить»
  if (/<title>\s*Site Error\s*<\/title>/i.test(html)) return { status: 404, found: false, unchecked: false };
  const m = /<title>([\s\S]*?) on Steam<\/title>/i.exec(html)
    || /<meta property="og:title" content="([^"]+)"/i.exec(html);
  if (!m) return { status: 200, unchecked: true };   // страница открылась, название не разобрали
  const name = m[1]
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    // у скидочных страниц title начинается со «Save 30% on …» — это не часть названия
    .replace(/^Save\s+\d+%\s+on\s+/i, '')
    .trim();
  return { status: 200, found: true, name };
}

/** Проверка appid: сначала API, при «успех: false» — переспрашиваем саму страницу игры */
async function steamApp(appid) {
  const { ok, data, status, throttled } = await getJson(
    `https://store.steampowered.com/api/appdetails?appids=${appid}&filters=basic&l=english`,
  );
  if (ok) {
    const entry = data?.[String(appid)];
    if (entry?.success && entry.data?.name) return { status: 200, found: true, name: entry.data.name };
  }
  if (!ok && !throttled) return { status, found: false, unchecked: false };   // 404 от API — игры нет
  const page = await steamPage(appid);
  if (page.found) return { ...page, viaPage: true };
  if (page.unchecked) return { status: page.status ?? status, found: false, unchecked: true };
  return { status: page.status === 404 ? 404 : (status ?? page.status), found: false, unchecked: false };
}

/** Поиск страницы игры в Steam по названию */
async function steamSearch(title) {
  const { ok, data } = await getJson(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=US`,
  );
  if (!ok || !Array.isArray(data?.items)) return [];
  return data.items.map((i) => ({ id: i.id, name: i.name })).slice(0, 5);
}

/**
 * Официальная ссылка: живая и про эту игру.
 *
 * Магазины и сайты издателей различаются сильнее, чем Steam: одни отдают название
 * только в og:title, другие рисуют страницу скриптами (в HTML названия нет вовсе).
 * Поэтому название ищем в четырёх местах (<title>, og:title, twitter:title,
 * JSON-LD name) и просим браузерный User-Agent.
 */
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/** Все названия, которые страница о себе сообщает */
function pageTitles(html) {
  const out = [];
  const push = (v) => {
    const t = String(v || '')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    if (t && !out.includes(t)) out.push(t);
  };
  push(html.match(/<title[^>]*>([^<]{0,300})<\/title>/i)?.[1]);
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:title|twitter:title)["'][^>]+content=["']([^"']{0,300})["']/gi)) push(m[1]);
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']{0,300})["'][^>]+(?:property|name)=["'](?:og:title|twitter:title)["']/gi)) push(m[1]);
  for (const m of html.matchAll(/"name"\s*:\s*"((?:[^"\\]|\\.){0,200})"/gi)) push(m[1].replace(/\\"/g, '"'));
  return out;
}

async function officialPage(url, title) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(25000),
      redirect: 'follow',
    });
    if (!res.ok) return { ok: false, status: res.status };
    const html = (await res.text()).slice(0, 300000);
    const titles = pageTitles(html);
    let best = { score: 0, name: '' };
    for (const name of titles) {
      const score = nameScore(title, name);
      if (score > best.score) best = { score, name };
    }
    // страница отрисована скриптами: названия в HTML нет, но страница живая
    const jsRendered = best.score < 0.5 && /<div id="(root|app|__next)"|<script[^>]+type="module"/i.test(html);
    return {
      ok: true,
      status: res.status,
      score: best.score,
      title: (best.name || titles[0] || '').slice(0, 80),
      jsRendered,
    };
  } catch (error) {
    return { ok: false, status: String(error?.cause?.code || error.message) };
  }
}

/* ------------------------------------------------------------------ */

const list = GAMES.slice(0, limit);
const withSteam = list.filter((g) => g.steamId);
const withoutSteam = list.filter((g) => !g.steamId);

const deadSteam = [];
const wrongSteam = [];
const unchecked = [];   // Steam не дал проверить (троттлинг/сеть) — не проблема данных
const steamSuggestions = [];
const badOfficial = [];
const noLink = [];

console.log(`Проверяю ссылки на магазины у ${list.length} игр…\n`);

console.log(`1. Страницы в Steam (${withSteam.length} игр с известным appid)`);
for (const [i, game] of withSteam.entries()) {
  const app = await steamApp(game.steamId);
  if (!app.found && app.unchecked) {
    unchecked.push({ slug: game.slug, title: game.t, id: game.steamId, status: app.status });
    console.log(`  ⏳ ${game.slug}: appid ${game.steamId} не проверен — Steam ответил ${app.status}`);
  } else if (!app.found) {
    deadSteam.push({ slug: game.slug, title: game.t, id: game.steamId, status: app.status });
    console.log(`  ❌ ${game.slug}: appid ${game.steamId} не отвечает (${app.status})`);
  } else {
    const score = nameScore(game.t, app.name);
    const allowed = STEAM_ALLOW[game.slug];
    if (score < 0.6 && !(allowed && allowed.appid === game.steamId)) {
      wrongSteam.push({ slug: game.slug, title: game.t, id: game.steamId, steamName: app.name, score: score.toFixed(2) });
      console.log(`  ⚠️  ${game.slug}: «${game.t}» → Steam «${app.name}» (совпадение ${score.toFixed(2)})`);
    } else if (score < 0.6) {
      console.log(`  ℹ️  ${game.slug}: «${game.t}» → Steam «${app.name}» — известно и объяснено: ${allowed.why}`);
    }
  }
  await sleep(STEAM_DELAY);
  if ((i + 1) % 50 === 0) console.log(`  …проверено ${i + 1}/${withSteam.length}`);
}
console.log(`  Итог: живых ${withSteam.length - deadSteam.length - wrongSteam.length - unchecked.length}, подозрительных ${wrongSteam.length}, мёртвых ${deadSteam.length}, не проверено ${unchecked.length}\n`);

console.log(`2. Игры без appid (${withoutSteam.length}) — ищу страницы в Steam`);
for (const game of withoutSteam) {
  const items = await steamSearch(game.t);
  const best = items
    .map((it) => ({ ...it, score: nameScore(game.t, it.name) }))
    .sort((a, b) => b.score - a.score)[0];
  // Для предложения мало похожего названия: в названии на Steam не должно быть
  // лишних слов, иначе это спин-офф, DLC или редактор, а не та же игра
  const extra = best ? extraWords(game.t, best.name) : [];
  if (best && best.score >= 0.6 && extra.length === 0) {
    steamSuggestions.push({ slug: game.slug, title: game.t, steamId: best.id, steamName: best.name, score: Number(best.score.toFixed(2)) });
    console.log(`  ➕ ${game.slug}: «${game.t}» → Steam «${best.name}» appid=${best.id} (${best.score.toFixed(2)})`);
  } else if (best && best.score >= 0.6) {
    console.log(`  ⛔ ${game.slug}: «${best.name}» (${best.score.toFixed(2)}) — другой продукт: лишние слова «${extra.join(' ')}»`);
  } else {
    console.log(`  —  ${game.slug}: «${game.t}» страницы в Steam нет${best ? ` (ближайшее: ${best.name}, ${best.score.toFixed(2)})` : ''}`);
  }
  await sleep(STEAM_DELAY);
}
console.log('');

console.log('3. Официальные ссылки магазинов/издателей');
const withOfficial = list.filter((g) => g.links?.official);
for (const game of withOfficial) {
  const page = await officialPage(game.links.official, game.t);
  if (!page.ok) {
    badOfficial.push({ slug: game.slug, title: game.t, url: game.links.official, problem: `HTTP ${page.status}` });
    console.log(`  ❌ ${game.slug}: ${game.links.official} не открывается (${page.status})`);
  } else if (page.score < 0.5) {
    badOfficial.push({ slug: game.slug, title: game.t, url: game.links.official, problem: `заголовок «${page.title}»` });
    console.log(`  ⚠️  ${game.slug}: страница открывается, но заголовок «${page.title}» не похож на игру`);
  }
  await sleep(150);
}
console.log(`  Проверено ${withOfficial.length}, проблем ${badOfficial.length}\n`);

console.log('4. Игры без ссылки на магазин');
for (const game of list) {
  const hasSteam = Boolean(game.links?.steam);
  const hasOfficial = Boolean(game.links?.official);
  if (!hasSteam && !hasOfficial) {
    noLink.push({ slug: game.slug, title: game.t });
    console.log(`  ❌ ${game.slug}: «${game.t}» — ни Steam, ни официального магазина`);
  }
}
console.log(`  Без ссылки: ${noLink.length}\n`);

/* --------------------- режим проверки кандидатов --------------------- */

/**
 * Проверяет заготовленные адреса (tools/store-candidates.json) и печатает
 * готовый к применению JSON: только те ссылки, что открылись и чей заголовок
 * совпал с названием игры. Ничего не применяется автоматически.
 */
if (candidatesArg) {
  const file = readFileSync(resolve(root, candidatesArg), 'utf8');
  const data = JSON.parse(file);
  const verified = { stores: {}, steam: {} };
  const rejected = [];

  console.log('\n=== ПРОВЕРКА КАНДИДАТОВ ===');
  for (const [slug, list] of Object.entries(data.stores || {})) {
    const game = GAMES.find((g) => g.slug === slug);
    if (!game) { rejected.push({ slug, reason: 'нет игры с таким slug' }); continue; }
    let accepted = null;
    for (const c of list) {
      const page = await officialPage(c.url, game.t);
      const score = page.ok ? page.score : 0;
      if (page.ok && score >= 0.5) { accepted = { ...c, score: Number(score.toFixed(2)), pageTitle: page.title }; break; }
      const reason = !page.ok
        ? `HTTP ${page.status}`
        : page.jsRendered
          ? `страница отрисована скриптами, название в HTML не найдено («${page.title}»)`
          : `заголовок «${page.title}» (${score.toFixed(2)})`;
      rejected.push({ slug, url: c.url, reason });
      await sleep(150);
    }
    if (accepted) {
      verified.stores[slug] = { url: accepted.url, label: accepted.label };
      console.log(`  ✅ ${slug} → ${accepted.url} (${accepted.score}, «${accepted.pageTitle}»)`);
    } else {
      console.log(`  ❌ ${slug}: ни один адрес не подошёл`);
    }
    await sleep(150);
  }

  for (const [slug, id] of Object.entries(data.steam || {})) {
    const game = GAMES.find((g) => g.slug === slug);
    if (!game) { rejected.push({ slug, reason: 'нет игры с таким slug' }); continue; }
    const app = await steamApp(id);
    const score = app.found ? nameScore(game.t, app.name) : 0;
    if (app.found && score >= 0.6) {
      verified.steam[slug] = id;
      console.log(`  ✅ steam ${slug} → appid ${id} («${app.name}», ${score.toFixed(2)})`);
    } else {
      rejected.push({ slug, appid: id, reason: app.found ? `Steam называет игру «${app.name}» (${score.toFixed(2)})` : `appid не отвечает (${app.status})` });
      console.log(`  ❌ steam ${slug}: appid ${id} не подошёл`);
    }
    await sleep(STEAM_DELAY);
  }

  console.log('\n--- REJECTED_JSON ---');
  console.log(JSON.stringify(rejected, null, 1));
  console.log('--- END_REJECTED_JSON ---');

  console.log('\n--- VERIFIED_JSON ---');
  console.log(JSON.stringify(verified, null, 2));
  console.log('--- END_VERIFIED_JSON ---');
  if (rejected.length) {
    console.log('\nОтклонено:');
    for (const r of rejected) console.log(`  • ${r.slug}: ${r.url || r.appid} — ${r.reason}`);
  }
}

/* ------------------------------ итог ------------------------------ */

console.log('=== ИТОГ ===');
console.log(`Мёртвых appid: ${deadSteam.length}`);
console.log(`Подозрительных appid (возможно, чужая игра): ${wrongSteam.length}`);
console.log(`Предложений добавить Steam: ${steamSuggestions.length}`);
console.log(`Не проверено из-за ограничений Steam: ${unchecked.length}`);
console.log(`Проблемных официальных ссылок: ${badOfficial.length}`);
console.log(`Игр без ссылки: ${noLink.length}`);

// Список «Steam называет игру иначе» — относится к текущим данным, поэтому печатается
// всегда: в логе видно только число, а пары (slug → название на Steam) нужны для правки
console.log('\n--- WRONG_STEAM_JSON ---');
console.log(JSON.stringify(wrongSteam.map((w) => ({ slug: w.slug, title: w.title, appid: w.id, steamName: w.steamName, score: w.score })), null, 1));
console.log('--- END_WRONG_STEAM_JSON ---');

if (suggest) {
  console.log('\n--- STEAM_SUGGESTIONS_JSON ---');
  console.log(JSON.stringify(steamSuggestions, null, 1));
  console.log('--- END_STEAM_SUGGESTIONS_JSON ---');
}

const hardProblems = deadSteam.length + wrongSteam.length + badOfficial.length + noLink.length;
if (hardProblems) {
  console.log(`\n❌ Проблем, требующих правки данных: ${hardProblems}`);
  for (const s of wrongSteam) console.log(`  • ${s.slug}: «${s.title}» указывает на Steam «${s.steamName}»`);
  for (const s of deadSteam) console.log(`  • ${s.slug}: appid ${s.id} не существует`);
  for (const s of badOfficial) console.log(`  • ${s.slug}: ${s.url} — ${s.problem}`);
  for (const s of noLink) console.log(`  • ${s.slug}: нет ссылки на магазин`);
  process.exit(1);
}
if (unchecked.length) {
  // Честно: часть ссылок проверить не дали, поэтому «всё хорошо» сказать нельзя
  console.log(`\n⚠️  Проверка неполная: ${unchecked.length} ссылок Steam остались непроверенными`);
  console.log('   (Steam ограничил запросы с адресов CI — это не ошибка данных).');
  console.log('   Остальные ссылки ведут на конкретные страницы и отвечают.');
} else {
  console.log('\n✅ Все ссылки ведут на конкретные страницы и отвечают.');
}
