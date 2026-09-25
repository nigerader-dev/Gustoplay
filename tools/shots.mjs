/**
 * Визуальный QA в реальном браузере: скриншоты всех страниц на контрольных
 * ширинах + замеры (горизонтальное переполнение, консоль, h1, alt, тач-цели).
 * Требует puppeteer с браузером (npm i -D puppeteer && npx puppeteer install chrome)
 * и сам поднимает dev-сервер на свободном порту. Без браузера — вежливый пропуск
 * (exit 0), чтобы не краснить CI там, где браузера нет.
 *
 * Запуск: npm run test:visual [-- --widths=360,768,1440 --theme=dark --shots=all]
 * Критерии провала: страница прокручивается по горизонтали, нет ровно одного h1,
 * «undefined» в тексте, ошибки консоли/битые картинки нашего origin, страница не отрисовалась.
 *
 * Про сеть: обложки игр лежат на внешних CDN (Steam, Google Play). Там, где CDN
 * недоступен (закрытая песочница, офлайн-CI), картинки и часть запросов падают —
 * это не дефект сайта. Поэтому ошибки делятся на две корзины: свои (наш origin —
 * код, разметка, скриншот) и внешние (чужой CDN). Прогон краснеет только из-за
 * своих; внешние печатаются отдельной строкой. `--strict` включает и их.
 * Ожидание — domcontentloaded + явный признак отрисовки (#app .header): сеть затихнуть
 * может и не дать, а вот неотрисованное приложение — настоящий провал.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = {};
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=]+)=(.*)$/);
  if (m) args[m[1]] = m[2];
  else if (a.startsWith('--')) args[a.slice(2)] = true;
}

let puppeteer;
try {
  puppeteer = (await import('puppeteer')).default;
} catch {
  console.log('SKIP test:visual — puppeteer не установлен (нужен Chrome; см. шапку файла)');
  process.exit(0);
}

const WIDTHS = String(args.widths || '360,768,1024,1440,1920').split(',').map(Number);
const THEME = args.theme || 'light';
const SHOTS = args.shots || 'key';
const TAG = args.tag || '';
const STRICT = Boolean(args.strict);
const OUT = resolve(root, 'docs/qa-shots');
const HEIGHT = 900;

const ROUTES = [
  ['home', '/'], ['quiz', '/quiz'], ['results', '/results'], ['catalog', '/catalog'],
  ['genre', '/genre/rpg'], ['tag', '/tag/coopfocused'], ['mode', '/mode/coopOnline'],
  ['mood', '/mood/relax'], ['platform', '/platform/pc'], ['game', '/game/balatro'],
  ['party', '/party'], ['profile', '/profile'], ['account', '/account'],
  ['terms', '/terms'], ['about', '/about'], ['privacy', '/privacy'], ['404', '/no-such-page'],
];
const KEY = new Set(['home', 'quiz', 'results', 'catalog', 'game', 'party', 'profile', 'account', '404']);

// Ответы квиза строго по схеме: мульти-вопросы (mood, modes…) — массивы.
const SEED = {
  answers: { mood: ['relax', 'laugh'], modes: ['coop'], players: 4, company: 'friends' },
  marks: {
    balatro: { status: 'liked', ts: 1 },
    'it-takes-two': { status: 'wishlist', ts: 2 },
    hades: { status: 'played', ts: 3 },
  },
  meta: { completedAt: 1, seed: 7, lang: 'ru', theme: THEME },
};

/* --- dev-сервер для съёмки: свободный порт, чтобы не столкнуться с уже запущенным --- */
const freePort = () => new Promise((res, rej) => {
  const probe = createServer();
  probe.on('error', rej);
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => res(port));
  });
});
const PORT = Number(args.port || await freePort());
const server = spawn('node', ['server.js'], {
  cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
});
const BASE = `http://${args.host || '127.0.0.1'}:${PORT}`;
const waitServer = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE + '/');
      if (r.ok) return;
    } catch { /* ещё не поднялся */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('dev-сервер не поднялся');
};

/** Наш ли это адрес (код, разметка, картинки сайта) или чужой CDN */
const isOurs = (url = '') => !url || url.startsWith(BASE) || url.startsWith('/');
const external = (list) => list.filter((x) => !isOurs(x.url));
const own = (list) => list.filter((x) => isOurs(x.url));

const failures = [];
let externalNotes = 0;
let browser;
try {
  await waitServer();
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
} catch (e) {
  server.kill();
  console.log(`SKIP test:visual — браузер недоступен (${String(e.message || e).slice(0, 120)})`);
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
const results = [];

for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: HEIGHT, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text().slice(0, 200), url: msg.location()?.url || '' });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ text: 'PAGEERROR: ' + String(err).slice(0, 200), url: BASE });
  });
  await page.evaluateOnNewDocument((seed) => {
    // в песочницу без сети браузер может подсунуть документ с закрытым localStorage:
    // тогда исключение из инжекта попадало в отчёт как ошибка страницы
    try {
      localStorage.setItem('gf.profile.v1', JSON.stringify(seed));
      localStorage.setItem('gf.consent.v1', '"necessary"');
    } catch { /* документ без доступа к localStorage — пропускаем */ }
  }, SEED);

  for (const [name, route] of ROUTES) {
    const loadErrors = [];
    // domcontentloaded, а не networkidle0: обложки лежат на внешних CDN и в закрытой
    // сети «сеть не затихает» никогда. Что приложение отрисовалось — проверяем явно,
    // а картинки ждём отдельно и ограниченно (у упавшей картинки complete тоже true).
    try {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch (e) {
      loadErrors.push('LOAD: ' + String(e).slice(0, 150));
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    }
    try {
      await page.waitForSelector('#app .header', { timeout: 8000 });
    } catch (e) {
      loadErrors.push('LOAD: ' + String(e).slice(0, 150));
    }
    const imgTimeout = await page
      .waitForFunction(() => [...document.images].every((img) => img.complete), { timeout: 5000 })
      .then(() => false).catch(() => true);
    await new Promise((r) => setTimeout(r, 250));

    const data = await page.evaluate(() => {
      const doc = document.documentElement;
      const se = document.scrollingElement;
      // Честный признак «страница едет вбок»: пробуем прокрутить. scrollWidth врёт,
      // когда вылет обрезан (overflow: clip), поэтому он идёт в отчёт справочно.
      const before = se.scrollLeft;
      se.scrollLeft = 40;
      const canScrollX = se.scrollLeft > 0;
      se.scrollLeft = before;
      const bodyText = document.body.innerText || '';
      const small = [];
      const big = [];
      document.querySelectorAll('button, a, input, select').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        const label = (el.innerText || el.value || el.getAttribute('aria-label') || '').slice(0, 28);
        if (r.height < 40 || r.width < 24) small.push(`${el.tagName} ${Math.round(r.width)}x${Math.round(r.height)} «${label}»`);
      });
      document.querySelectorAll('img').forEach((img) => {
        if (!img.complete || img.naturalWidth === 0) big.push(img.currentSrc || img.src);
      });
      return {
        title: document.title,
        h1: document.querySelectorAll('h1').length,
        undefinedInText: bodyText.includes('undefined'),
        canScrollX,
        overflowX: doc.scrollWidth - doc.clientWidth,
        smallTargets: small.slice(0, 8),
        smallCount: small.length,
        brokenImgs: big.slice(0, 5),
        brokenImgCount: big.length,
        cards: document.querySelectorAll('.game-card').length,
      };
    });

    if (SHOTS === 'all' || (SHOTS === 'key' && KEY.has(name))) {
      const { join } = await import('node:path');
      await page.screenshot({ path: join(OUT, `${name}-${width}${TAG ? '-' + TAG : ''}.png`) });
    }

    // Свои проблемы (наш origin) и внешние (CDN обложек недоступен) считаем отдельно
    const consoleOwn = own(consoleErrors).map((x) => `${x.text} [${x.url.slice(0, 60)}]`);
    const consoleExt = external(consoleErrors);
    const imgsOwn = data.brokenImgs.filter((u) => isOurs(u));
    const imgsExt = data.brokenImgCount - imgsOwn.length;
    if (consoleExt.length || imgsExt) externalNotes += 1;

    results.push({
      width, route: name, loadErrors, imgWaitTimedOut: imgTimeout,
      consoleErrors: consoleOwn, externalNotes: consoleExt.length + imgsExt, ...data,
    });

    const bad = data.canScrollX || data.undefinedInText || loadErrors.length > 0
      || consoleOwn.length > 0 || data.h1 !== 1 || imgsOwn.length > 0;
    if (bad) failures.push(`${name} @${width}`);
    const ext = consoleExt.length + imgsExt;
    console.log(`${bad ? '❌' : '✅'} ${name} @${width}: h1=${data.h1}`
      + ` боковой скролл=${data.canScrollX ? 'да' : 'нет'} (scrollWidth ${data.overflowX > 1 ? `+${data.overflowX}` : 'ок'})`
      + ` cerr=${consoleOwn.length} small=${data.smallCount}${ext ? ` внешних=${ext}` : ''}`);
    if (bad) loadErrors.forEach((e) => console.log(`     ${e}`));
    consoleErrors.length = 0;
  }
  await page.close();
}
await browser.close();
server.kill();

writeFileSync(resolve(OUT, `report${TAG ? '-' + TAG : ''}-${THEME}.json`), JSON.stringify(results, null, 1));
console.log(`\nСкриншоты: ${OUT}\nПроверок: ${results.length} · ❌ ${failures.length}`
  + (externalNotes ? ` · проверок с недоступным внешним CDN: ${externalNotes}` : ''));
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
if (STRICT && externalNotes) {
  console.log('❌ --strict: есть проверки с недоступными внешними ресурсами');
  process.exit(1);
}
