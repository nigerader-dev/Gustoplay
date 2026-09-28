#!/usr/bin/env node
/**
 * Собирает оценки времени HowLongToBeat для кандидатов каталога.
 *
 * Зачем отдельный инструмент: страница поиска HLTB — клиентское Next.js-приложение,
 * сырой HTML не содержит результатов (проверено 27.09.2026: GET из раннера отдаёт
 * только каркас с чанками _next/static, а POST /api/search закрывает Cloudflare —
 * HTTP 403). Поэтому здесь настоящий headless Chrome (на GitHub-раннерах
 предустановлен), который исполняет JS и ждёт появления карточек.
 *
 *   node tools/pull-hltb-pages.mjs            # по именам из tools/catalog-batch-data.json
 *   node tools/pull-hltb-pages.mjs --limit=5  # отладка
 *
 * Результат: tools/hltb-data.json (mainH/plusH/hundredH, часы) + сырой HTML каждой
 * страницы в tools/hltb-pages/ (артефакт, не в git) + аннотации hltb-b64 для
 * доставки в закрытую песочницу (как у обложек/sysreq: api.github.com доступен,
 * а артефакты и логи — нет).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const arg = (name) => process.argv.find((x) => x.startsWith(`--${name}=`))?.split('=')[1];
const LIMIT = Number(arg('limit') || Infinity);

const dataPath = new URL('./catalog-batch-data.json', import.meta.url);
const outPath = new URL('./hltb-data.json', import.meta.url);
const hltbDir = new URL('./hltb-pages/', import.meta.url);

const norm = (s) => String(s || '').replace(/[™®©]/g, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** «7½ Hours» / «54 Mins» → часы (число) */
function parseHltbTime(s) {
  if (!s) return null;
  const m = String(s).match(/([\d½¼¾⅓⅔,.]+)\s*(Hours?|Mins?)/i);
  if (!m) return null;
  const frac = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
  const num = Number(frac[m[1]] !== undefined ? frac[m[1]] : m[1].replace(',', '.'));
  if (!Number.isFinite(num)) return null;
  return /min/i.test(m[2]) ? Math.round((num / 60) * 10) / 10 : num;
}

const batch = JSON.parse(await readFile(dataPath, 'utf8'));
const names = batch.entries.map((e) => e.steamName).slice(0, LIMIT);
console.log(`HLTB: ${names.length} игр из batch ${batch.batch}`);

async function main() {


  /** Фатальную ошибку нельзя оставлять в логе (логи из закрытой песочницы не
   *  читаются) — уводим её аннотацией, как и данные. */
  process.on('unhandledRejection', (e) => {
    console.log(`::notice::hltb-fatal: ${String(e?.message || e).slice(0, 500)}`);
    process.exit(1);
  });

  // puppeteer-core ставится шагом workflow (npm i --no-save); Chrome берём системный
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer-core')).default;
  } catch (e) {
    console.log(`::notice::hltb-fatal: puppeteer-core не установлен (${String(e.message).slice(0, 200)}) — нужен шаг npm i --no-save puppeteer-core`);
    process.exit(1);
  }
const { execFileSync } = await import('node:child_process');
const execPaths = [process.env.CHROME_PATH, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome'].filter(Boolean);
let executablePath = null;
for (const p of execPaths) {
  try {
    execFileSync(p, ['--version'], { stdio: 'pipe' });
    // puppeteer требует полный путь: fs.existsSync('google-chrome') = false
    const full = p.includes('/') ? p : execFileSync('which', [p]).toString().trim();
    if (full) { executablePath = full; break; }
  } catch { /* пробуем дальше */ }
}
  if (!executablePath) {
    console.log(`::notice::hltb-fatal: системный Chrome/Chromium не найден (пробовал: ${execPaths.join(', ')})`);
    process.exit(1);
  }
  console.log(`браузер: ${executablePath} (${execFileSync(executablePath, ['--version']).toString().trim()})`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900'],
  });

  const results = [];
  const misses = [];

  // Одна попытка = открытие страницы поиска + разбор; при неудаче — вторая
  // (Cloudflare/Ziff-антибот иногда отдаёт челлендж или таймаут на первый заход)
  async function attempt(name, attemptNo) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' });
    try {
      await page.goto(`https://howlongtobeat.com/?q=${encodeURIComponent(name)}`, { waitUntil: 'networkidle2', timeout: 45000 });
      // ждём появления карточек результатов (клиентский рендер)
      await page.waitForSelector('a[href*="/game/"]', { timeout: 25000 });
      const html = await page.content();
      const slug = norm(name);
      try {
        await mkdir(hltbDir, { recursive: true });
        await writeFile(new URL(`./hltb-pages/${slug}.html`, import.meta.url), html);
      } catch { /* сохранение — best effort */ }

    // Карточка: ссылка /game/<id> (в отрендеренном HTML — относительная; абсолютная
    // форма появляется не всегда, первый прогон из-за этого собрал 0 записей),
    // видимый текст ссылки — название игры
    const found = [];
    const re = /<a[^>]+href="(?:https:\/\/howlongtobeat\.com)?\/game\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html))) {
      const title = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (title) found.push({ id: Number(m[1]), title });
    }
    const exact = found.find((x) => norm(x.title) === slug);
    if (!exact) {
      return { miss: `точного совпадения нет (${found.slice(0, 3).map((x) => `${x.title}/${x.id}`).join(', ') || 'карточек нет'})` };
    } else {
      // Окно текста после заголовка карточки: там три пары «подпись → время»
      const anchor = html.indexOf(`game/${exact.id}`);
      const text = html.slice(anchor, anchor + 4000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const grab = (label) => parseHltbTime((text.match(new RegExp(`${label}\\s*([\\d½¼¾⅓⅔,.]+\\s*(?:Hours?|Mins?))`, 'i')) || [])[1]);
      const entry = {
        name, hltbId: exact.id, url: `https://howlongtobeat.com/game/${exact.id}`,
        mainH: grab('Main Story'), plusH: grab('Main \\+ Extra'), hundredH: grab('Completionist'),
      };

      // Страница игры: платформы и дата релиза — единственный бесплатный источник
      // консольных платформ для этого батча (страницы магазинов из песочницы
      // недоступны). HLTB — краудсорс-агрегатор: платформы сверяются с ним, а не
      // с магазинами; в журнал источников пишется именно HLTB.
      try {
        await page.goto(entry.url, { waitUntil: 'networkidle2', timeout: 45000 });
        await page.waitForSelector('table', { timeout: 20000 }).catch(() => {});
        const gameHtml = await page.content();
        const gameText = gameHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const platMatch = gameText.match(/Platform:\s*([A-Za-z0-9,\/ \-]{2,60}?)(?:\s*Genres|\s*Developer|\s*$)/);
        if (platMatch) entry.hltbPlatforms = platMatch[1].trim();
        const naMatch = gameText.match(/North America:\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/);
        if (naMatch) entry.hltbReleaseNa = naMatch[1].replace(/(\d{1,2})(st|nd|rd|th)/, '$1');
        const rows = [...gameHtml.matchAll(/<tr[^>]*>\s*<td[^>]*>([^<]{2,12})<\/td>/g)].map((x) => x[1].trim());
        if (rows.length) entry.hltbPlatformRows = [...new Set(rows)];
      } catch (e) {
        entry.hltbPageError = String(e.message || e).slice(0, 100);
      }

      if (entry.mainH == null && entry.plusH == null && entry.hundredH == null) {
        return { miss: `карточка найдена (${exact.id}), но времена не разобраны` };
      }
      results.push(entry);
      console.log(`  ✅ ${name} → ${exact.id}: main=${entry.mainH} plus=${entry.plusH} 100%=${entry.hundredH} [${entry.hltbPlatforms || 'платформы не разобраны'}]`);
      return { ok: true };
    }
    } catch (error) {
      if (attemptNo === 1) return attempt(name, 2);
      return { miss: String(error.message || error).slice(0, 120) };
    } finally {
      await page.close();
    }
  }

  for (const name of names) {
    await sleep(600 + Math.random() * 500); // не дёргаем сайт очередью запросов
    const outcome = await attempt(name, 1);
    if (outcome?.miss) {
      misses.push(`${name} — ${outcome.miss}`);
      console.warn(`  ⚠️  ${name}: ${outcome.miss}`);
    }
  }

  await browser.close();

  // Если конвейер собрал ничего — показываем текст первой отрендеренной страницы:
  // без этого «0 записей» из закрытой среды не разобрать (логи не читаются)
  if (!results.length) {
    try {
      const first = await readFile(new URL('./hltb-pages/' + norm(names[0]) + '.html', import.meta.url), 'utf8');
      const text = first.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 2400);
      console.log(`::notice::hltb-debug-page[0]: ${Buffer.from(text).toString('base64').slice(0, 3000)}`);
    } catch { /* страницы нет — уже есть miss с причиной */ }
  }

  const out = { batch: batch.batch, collectedAt: new Date().toISOString(), entries: results, misses };
  await writeFile(outPath, `${JSON.stringify(out, null, 1)}\n`);
  console.log(`\nСобрано: ${results.length} из ${names.length}; проблем: ${misses.length}`);

  // Аннотации: единственный канал, читаемый из закрытой песочницы (api.github.com)
  const b64 = Buffer.from(JSON.stringify(out), 'utf8').toString('base64');
  for (let i = 0; i < b64.length; i += 3000) {
    console.log(`::notice::hltb-b64 [${Math.floor(i / 3000) + 1}/${Math.ceil(b64.length / 3000)}]: ${b64.slice(i, i + 3000)}`);
  }
  console.log(`::notice::hltb-meta: ${results.length} записей, ${misses.length} проблем, ${b64.length} байт b64`);
  for (const line of misses.slice(0, 40)) console.log(`::notice::hltb-review: ${line}`);

}

try { await main(); }
catch (e) {
  console.log(`::notice::hltb-fatal: ${String(e?.stack || e?.message || e).slice(0, 900)}`);
  process.exit(1);
}
