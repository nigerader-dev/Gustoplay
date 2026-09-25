/**
 * Визуальный QA в реальном браузере: скриншоты всех страниц на контрольных
 * ширинах + замеры (горизонтальное переполнение, консоль, h1, alt, тач-цели).
 * Требует puppeteer с браузером (npm i -D puppeteer && npx puppeteer install chrome)
 * и сам поднимает dev-сервер. Без браузера — вежливый пропуск (exit 0),
 * чтобы не краснить CI там, где браузера нет.
 *
 * Запуск: npm run test:visual [-- --widths=360,768,1440 --theme=dark --shots=all]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

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

const SEED = {
  answers: { mood: ['relax', 'laugh'], modes: 'coop', players: 4, company: 'friends' },
  marks: {
    balatro: { status: 'liked', ts: 1 },
    'it-takes-two': { status: 'wishlist', ts: 2 },
    hades: { status: 'played', ts: 3 },
  },
  meta: { completedAt: 1, seed: 7, lang: 'ru', theme: THEME },
};

/* --- dev-сервер для съёмки --- */
const PORT = 5199;
const server = spawn('node', ['server.js'], {
  cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
});
const BASE = `http://127.0.0.1:${PORT}`;
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

const failures = [];
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
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on('pageerror', (err) => {
    consoleErrors.push('PAGEERROR: ' + String(err).slice(0, 200));
  });
  await page.evaluateOnNewDocument((seed) => {
    localStorage.setItem('gf.profile.v1', JSON.stringify(seed));
    localStorage.setItem('gf.consent.v1', '"necessary"');
  }, SEED);

  for (const [name, route] of ROUTES) {
    const loadErrors = [];
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle0', timeout: 20000 });
      await page.waitForSelector('#app .header', { timeout: 8000 });
    } catch (e) {
      loadErrors.push('LOAD: ' + String(e).slice(0, 150));
    }
    await new Promise((r) => setTimeout(r, 350));

    const data = await page.evaluate(() => {
      const doc = document.documentElement;
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
        if (!img.complete || img.naturalWidth === 0) big.push(img.alt || img.src.slice(0, 60));
      });
      return {
        title: document.title,
        h1: document.querySelectorAll('h1').length,
        undefinedInText: bodyText.includes('undefined'),
        overflowX: doc.scrollWidth - doc.clientWidth,
        smallTargets: small.slice(0, 8),
        smallCount: small.length,
        brokenImgs: big.slice(0, 5),
        cards: document.querySelectorAll('.game-card').length,
      };
    });

    if (SHOTS === 'all' || (SHOTS === 'key' && KEY.has(name))) {
      const { join } = await import('node:path');
      await page.screenshot({ path: join(OUT, `${name}-${width}${TAG ? '-' + TAG : ''}.png`) });
    }
    results.push({ width, route: name, loadErrors, consoleErrors: [...consoleErrors], ...data });
    const bad = data.overflowX > 1 || data.undefinedInText || loadErrors.length > 0
      || consoleErrors.length > 0 || data.h1 !== 1 || data.brokenImgs.length > 0;
    if (bad) failures.push(`${name} @${width}`);
    console.log(`${bad ? '❌' : '✅'} ${name} @${width}: h1=${data.h1} overflow=${data.overflowX} cerr=${consoleErrors.length} small=${data.smallCount}`);
    consoleErrors.length = 0;
  }
  await page.close();
}
await browser.close();
server.kill();

writeFileSync(resolve(OUT, `report${TAG ? '-' + TAG : ''}-${THEME}.json`), JSON.stringify(results, null, 1));
console.log(`\nСкриншоты: ${OUT}\nПроверок: ${results.length} · ❌ ${failures.length}`);
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
