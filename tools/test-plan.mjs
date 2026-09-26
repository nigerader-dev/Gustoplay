/**
 * Сквозная проверка требований пользователя от 26.09.2026 — «сделано ли то, что просили».
 * Прогоняется в реальном браузере и проверяет ровно то, что человек называл словами:
 *
 *   1) вкладка «На компанию» показывает весь пул, а не 24 игры, и у неё есть «Показать ещё»;
 *   2) «Показать ещё» не бросает страницу вверх — ни в каталоге, ни на «Компании», на 1440 и 360;
 *   3) отметка «не понравилось» — палец вниз, в одной стилистике с остальными отметками;
 *   4) на странице игры четыре вертикальных блока, ниже — широкий на всю строку с «Особенностями»,
 *      а на освободившемся месте — минимальные и рекомендуемые требования к ПК; пустых блоков нет;
 *   5) адрес поддержки gustoplaysupport@gmail.com стоит ссылкой на сайте (подвал, «Как это работает»,
 *      политика, условия) и в настройках нет других адресов.
 *
 * Почему отдельный тест: пункты 1–4 уже покрыты test:functional / test:visual, но разбросаны по
 * десяткам проверок, и по их выводу нельзя быстро ответить «всё ли из просьбы сделано».
 *
 * Запуск: npm run test:plan   (без браузера — аккуратный SKIP, как у test:visual)
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { browserOptions } from './qa-browser.mjs';
import { icon } from '../js/icons.js';

let puppeteer;
try {
  puppeteer = (await import('puppeteer')).default;
} catch {
  console.log('SKIP test:plan — puppeteer не установлен (нужен Chrome; см. шапку tools/shots.mjs)');
  process.exit(0);
}

const freePort = () => new Promise((res) => {
  const probe = createServer();
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => res(port));
  });
});
const PORT = await freePort();
const failures = [];
let passed = 0;
const check = (name, condition, extra = '') => {
  if (condition) { passed += 1; console.log(`  ✅ ${name}${extra ? ` — ${extra}` : ''}`); }
  else { console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ''}`); failures.push(name); }
};

const server = spawn('node', ['server.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2200));
const BASE = `http://127.0.0.1:${PORT}`;
let browser;
try {
  browser = await puppeteer.launch(browserOptions());
} catch (error) {
  server.kill('SIGTERM');
  console.log(`SKIP test:plan — браузер недоступен (${String(error.message || error).slice(0, 120)})`);
  process.exit(0);
}
const page = await browser.newPage();
const goto = async (route, width = 1440) => {
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForSelector('#app .header', { timeout: 10000 });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), { timeout: 6000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 400));
};

console.log('\n1. Вкладка «На компанию»: весь пул и «Показать ещё»');
await goto('/party');
const head1 = await page.$eval('#app', (el) => el.innerText.split('\n').find((l) => /вариант/.test(l)) || '');
const pool = Number((head1.match(/(\d+)\s*вариант/) || [])[1]);
const cards0 = await page.$$eval('.game-card', (els) => els.length);
check('заголовок называет весь пул, а не страницу', pool > 100, `«${head1.trim()}»`);
check('первая страница — 12 карточек, пул больше', cards0 === 12 && pool > cards0, `карточек ${cards0}, пул ${pool}`);
const moreText = await page.$eval('[data-action="show-more"]', (el) => el.textContent.trim()).catch(() => '');
check('кнопка «Показать ещё» есть и называет шаг', /Показать ещё/.test(moreText), `«${moreText}»`);
let cards = cards0;
let clicks = 0;
while (await page.$('[data-action="show-more"]')) {
  await page.click('[data-action="show-more"]');
  await new Promise((r) => setTimeout(r, 260));
  cards = await page.$$eval('.game-card', (els) => els.length);
  clicks += 1;
  if (clicks > 40) break;
}
check('кликами «Показать ещё» открывается весь пул', cards === pool, `${cards} из ${pool} за ${clicks} нажатий`);
check('на конце пула кнопка исчезает', (await page.$('[data-action="show-more"]')) === null);
const cardsOnScreen = await page.$$eval('.game-card', (els) => els.filter((e) => e.getBoundingClientRect().height > 0).length);
check('все карточки пула действительно отрисованы', cardsOnScreen === pool, `${cardsOnScreen} видимых`);

console.log('\n2. «Показать ещё» не бросает страницу вверх');
for (const [label, route, width] of [['каталог @1440', '/catalog', 1440], ['каталог @360', '/catalog', 360], ['компания @1440', '/party', 1440], ['компания @360', '/party', 360]]) {
  await goto(route, width);
  const before = await page.evaluate(() => {
    const btn = document.querySelector('[data-action="show-more"]');
    btn.scrollIntoView({ block: 'center', behavior: 'instant' });
    return { y: window.scrollY, count: document.querySelectorAll('.game-card').length };
  });
  await page.click('[data-action="show-more"]');
  await new Promise((r) => setTimeout(r, 400));
  const after = await page.evaluate(() => ({ y: window.scrollY, count: document.querySelectorAll('.game-card').length }));
  check(`${label}: страница осталась на месте и карточек стало больше`,
    Math.abs(after.y - before.y) <= 2 && after.count > before.count,
    `scrollY ${Math.round(before.y)} → ${Math.round(after.y)}, карточек ${before.count} → ${after.count}`);
}

console.log('\n3. Отметки игр: «не понравилось» — палец вниз');
await goto('/catalog');
const marks = await page.$$eval('.game-card:first-child .mark', (els) => els.map((e) => ({
  status: e.dataset.status, path: e.querySelector('svg path')?.getAttribute('d') || '', label: e.textContent.trim(),
})));
const byStatus = Object.fromEntries(marks.map((m) => [m.status, m]));
check('в карточке четыре отметки в одном стиле (контур, currentColor)',
  marks.length === 4 && marks.every((m) => m.path.length > 20), marks.map((m) => m.status).join(', '));
check('«не понравилось» — иконка большого пальца вниз',
  byStatus.disliked?.path === icon('thumbsDown').match(/d="([^"]+)"/)[1], byStatus.disliked?.label);
check('«понравилось» — палец вверх (парная иконка)', byStatus.liked?.path === icon('thumbsUp').match(/d="([^"]+)"/)[1]);
check('«играл» — геймпад, «хочу сыграть» — закладка',
  byStatus.played?.path === icon('controller').match(/d="([^"]+)"/)[1]
  && byStatus.wishlist?.path === icon('bookmark').match(/d="([^"]+)"/)[1]);
const strokeKind = await page.$eval('.game-card:first-child .mark svg', (el) => ({
  fill: el.getAttribute('fill'), stroke: el.getAttribute('stroke'), color: getComputedStyle(el).color,
}));
check('иконки контурные и наследуют цвет кнопки', strokeKind.fill === 'none' && Boolean(strokeKind.stroke), JSON.stringify(strokeKind));

console.log('\n4. Вёрстка страницы игры: 4 блока + широкий, «Особенности» переехали, требования на их месте');
for (const [slug, width] of [['persona-5-royal', 1440], ['persona-5-royal', 1024], ['persona-5-royal', 360], ['left-4-dead-2', 1440]]) {
  await goto(`/game/${slug}`, width);
  const info = await page.evaluate(() => {
    const details = document.querySelector('.game-details');
    const cards = [...details.querySelectorAll(':scope > .detail-card')];
    const wide = document.querySelector('.detail-card-wide');
    const sysreq = document.querySelector('.sysreq');
    return {
      cardCount: cards.length,
      widths: cards.map((c) => Math.round(c.getBoundingClientRect().width)),
      rowWidth: Math.round(details.getBoundingClientRect().width),
      heights: cards.map((c) => Math.round(c.getBoundingClientRect().height)),
      emptyCards: cards.filter((c) => c.innerText.replace(/\s+/g, ' ').trim().length < 20).length,
      wideHasFeats: Boolean(wide?.querySelector('.feats-wide li')),
      featsOutsideWide: [...document.querySelectorAll('.feats-wide')].filter((f) => !wide?.contains(f)).length,
      sysreqInHeader: Boolean(sysreq) && !details.contains(sysreq),
      sysreqLevels: [...(sysreq?.querySelectorAll('.sysreq-level') || [])].map((x) => x.textContent.trim()),
      sysreqRows: sysreq ? sysreq.querySelectorAll('dt').length : 0,
      firstRow: cards.slice(0, 4).map((c) => Math.round(c.getBoundingClientRect().top)).filter((v, i, a) => a.indexOf(v) === i).length,
      narrowSameRow: (() => {
        const tops = cards.map((c) => Math.round(c.getBoundingClientRect().top));
        return new Set(tops).size;
      })(),
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  const expectCols = width >= 1080 ? 4 : (width >= 640 ? 2 : 1);
  check(`@${width} ${slug}: ${expectCols} вертикальных карточек в ряд + широкая на всю строку`,
    info.cardCount === 5 && info.narrowSameRow === Math.ceil(4 / expectCols) + 1
    && info.widths[4] > info.widths[0] * (expectCols - 0.5),
    `карточек ${info.cardCount}, рядов ${info.narrowSameRow}, ширины ${info.widths.join('/')} при строке ${info.rowWidth}`);
  check(`@${width} ${slug}: «Особенности» внутри широкого блока, а не отдельно`,
    info.wideHasFeats && info.featsOutsideWide === 0, `внутри: ${info.wideHasFeats}, снаружи: ${info.featsOutsideWide}`);
  check(`@${width} ${slug}: пустых блоков нет`, info.emptyCards === 0, `пустых ${info.emptyCards} из ${info.cardCount}`);
  if (slug === 'persona-5-royal' && width >= 1024) {
    check(`@${width} ${slug}: требования к ПК на месте «Особенностей» — минимальные и рекомендуемые`,
      info.sysreqInHeader && info.sysreqLevels.length === 2 && info.sysreqRows >= 8,
      `уровни: ${info.sysreqLevels.join(', ')}, полей: ${info.sysreqRows}`);
  }
  if (slug === 'left-4-dead-2') {
    check(`@${width} ${slug}: у игры с новыми данными требования видны`,
      info.sysreqInHeader && info.sysreqRows >= 8, `полей: ${info.sysreqRows}`);
  }
  check(`@${width} ${slug}: нет горизонтального вылета`, !info.overflowX);
}

console.log('\n5. Почта поддержки gustoplaysupport@gmail.com');
for (const route of ['/', '/about', '/privacy', '/terms']) {
  await goto(route);
  const mail = await page.evaluate(() => ({
    links: [...document.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute('href')),
    text: document.body.innerText.includes('gustoplaysupport@gmail.com'),
  }));
  check(`${route}: адрес есть и он ссылка mailto`, mail.text && mail.links.includes('mailto:gustoplaysupport@gmail.com'),
    mail.links.join(' ') || 'нет ссылок');
}
const oldMail = await page.evaluate(async () => {
  const res = await fetch('/js/config.js');
  const text = await res.text();
  const found = [...text.matchAll(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)].map((m) => m[0]);
  return found;
});
check('в настройках сайта только новый адрес', oldMail.length === 1 && oldMail[0] === 'gustoplaysupport@gmail.com', oldMail.join(', '));

await browser.close();
server.kill('SIGTERM');

console.log(`\nПроверок: ${passed + failures.length} · ✅ ${passed} · ❌ ${failures.length}`);
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
