/**
 * Визуальный QA в реальном браузере: скриншоты всех страниц на контрольных
 * ширинах + замеры (горизонтальное переполнение, консоль, h1, alt, тач-цели).
 * Требует puppeteer с браузером (npm i -D puppeteer && npx puppeteer install chrome)
 * и сам поднимает dev-сервер на свободном порту. Без браузера — вежливый пропуск
 * (exit 0), чтобы не краснить CI там, где браузера нет.
 *
 * Запуск: npm run test:visual [-- --widths=360,768,1440 --theme=dark --shots=all --dir=dist]
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
const INTERACTION = args.interaction !== '0';   // интерактивные проверки (hover, шторка, сдвиги)
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
// --dir=dist — прогон по собранному сайту: ловит поломки, которые видны только
// после сборки (минификация CSS/JS, пре-рендер страниц)
const server = spawn('node', ['server.js', ...(args.dir ? [`--dir=${args.dir}`] : [])], {
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

    // Плашки на обложке: оценка справа сверху, «сколько игроков» слева сверху —
    // они не должны пересекаться между собой и вылезать за картинку
    const cover = await page.evaluate(() => {
      const card = document.querySelector('.game-card');
      if (!card) return null;
      const img = card.querySelector('.card-cover');
      const badge = card.querySelector('.cover-badge');
      const rating = card.querySelector('.rating');
      if (!img || !badge) return null;
      const a = img.getBoundingClientRect(), b = badge.getBoundingClientRect();
      const r = rating?.getBoundingClientRect();
      const overlap = (x, y) => !(x.right <= y.left || y.right <= x.left || x.bottom <= y.top || y.bottom <= x.top);
      return {
        outside: b.left < a.left - 0.5 || b.right > a.right + 0.5 || b.top < a.top - 0.5 || b.bottom > a.bottom + 0.5,
        withRating: r ? overlap(b, r) : false,
        // внизу обложки подпись «год · студия» (у официального арта и у нашей запасной
        // обложки), поэтому плашка игроков должна стоять в верхней половине картинки
        overCaption: b.top - a.top > a.height / 2,
      };
    });
    if (cover?.outside) failures.push(`плашка игроков вылезает за обложку (${name} @${width})`);
    if (cover?.withRating) failures.push(`плашка игроков налезает на оценку (${name} @${width})`);
    if (cover?.overCaption) failures.push(`плашка игроков перекрывает подпись обложки (${name} @${width})`);
    if (cover && !cover.outside && !cover.withRating && !cover.overCaption) console.log(`   ↳ плашки обложки не пересекаются`);

    if (SHOTS === 'all' || (SHOTS === 'key' && KEY.has(name))) {
      const { join } = await import('node:path');
      // тема в имени файла: прогоны светлой и тёмной темы затирали скриншоты друг друга
      await page.screenshot({ path: join(OUT, `${name}-${width}-${THEME}${TAG ? '-' + TAG : ''}.png`) });
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
/* ------------------------------------------------------------------ *
 * Интерактивные проверки: наведение на отметки, шторка меню на телефоне,
 * сдвиги макета (CLS) и обрезанный текст.
 *
 * Идут в отдельном браузере с Blink-флагами «мышь + hover»: headless Chrome
 * по умолчанию сообщает `hover: none`, из-за чего баг с мерцанием отметок
 * (п. 1 плана) не воспроизводился вовсе. Свой браузер нужен, чтобы флаги
 * не меняли мобильные проверки выше: там важны тач-медиазапросы.
 * ------------------------------------------------------------------ */
const interactionFailures = [];
const markBad = (msg) => { interactionFailures.push(msg); console.log(`  ❌ ${msg}`); };
const markOk = (msg) => console.log(`  ✅ ${msg}`);

if (INTERACTION) {
  console.log('\n=== Интерактивные проверки (hover, шторка, сдвиги) ===');
  let ib = null;
  try {
    ib = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', '--disable-dev-shm-usage',
        // «есть мышь и она умеет hover» + «точный указатель» — без этого медиазапросы
        // hover/pointer ведут себя как на тачскрине и баг не ловится
        '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4',
      ],
    });
  } catch (e) {
    console.log(`  SKIP интерактивных проверок — браузер недоступен (${String(e.message || e).slice(0, 100)})`);
  }

  if (ib) {
    const newPage = async (width, height = 900) => {
      const page = await ib.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.evaluateOnNewDocument((seed) => {
        try {
          localStorage.setItem('gf.profile.v1', JSON.stringify(seed));
          localStorage.setItem('gf.consent.v1', '"necessary"');
          // сдвиги макета: копим всё, что произошло не по вине пользователя (CLS)
          window.__cls = 0;
          window.__clsMax = 0;
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              if (e.hadRecentInput) continue;
              window.__cls += e.value;
              window.__clsMax = Math.max(window.__clsMax, e.value);
            }
          }).observe({ type: 'layout-shift', buffered: true });
        } catch { /* документ без localStorage */ }
      }, SEED);
      return page;
    };
    const goto = async (page, route) => {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForSelector('#app .header', { timeout: 8000 });
      await page.waitForFunction(() => [...document.images].every((i) => i.complete), { timeout: 5000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 300));
    };

    /* --- A. Отметки: наведение не двигает кнопки (регресс к п. 1 плана) --- */
    for (const width of [1024, 1440]) {
      const page = await newPage(width);
      await goto(page, '/catalog');
      await page.waitForSelector('.game-card .marks .mark');
      // строку кнопок — в центр экрана: иначе курсор уходит ниже вьюпорта и наведение не считается
      await page.evaluate(() => document.querySelector('.game-card .marks').scrollIntoView({ block: 'center' }));
      await new Promise((r) => setTimeout(r, 250));

      // Раскладку меряем позицией кнопки ОТНОСИТЕЛЬНО строки отметок: при наведении
      // карточка приподнимается на 4px (задумка дизайна), и это общий сдвиг всей карточки,
      // а не «поехавшая» раскладка кнопок. Разница координат его не замечает.
      const snapshot = () => page.evaluate(() => {
        const row = document.querySelector('.game-card .marks');
        const r = row.getBoundingClientRect();
        return {
          row: { w: Math.round(r.width), h: Math.round(r.height) },
          btns: [...row.querySelectorAll('.mark')].map((b) => {
            const q = b.getBoundingClientRect();
            return {
              dx: Math.round(q.left - r.left), dy: Math.round(q.top - r.top),
              w: Math.round(q.width), h: Math.round(q.height),
              rectLeft: Math.round(q.left), rectTop: Math.round(q.top),
            };
          }),
          cls: window.__cls,
        };
      });

      const count = (await snapshot()).btns.length;
      for (let i = 0; i < count; i++) {
        // курсор уводим в угол: база всегда снимается «без наведения»
        await page.mouse.move(5, 5);
        await new Promise((r) => setTimeout(r, 250));
        const before = await snapshot();

        await page.evaluate((idx) => {
          const el = document.querySelectorAll('.game-card .marks .mark')[idx];
          window.__enter = 0; window.__leave = 0;
          el.addEventListener('mouseenter', () => { window.__enter += 1; });
          el.addEventListener('mouseleave', () => { window.__leave += 1; });
        }, i);
        const b = before.btns[i];
        await page.mouse.move(b.rectLeft + b.w / 2, b.rectTop + b.h / 2);
        await new Promise((r) => setTimeout(r, 700));   // дольше любого цикла перерисовки

        const after = await page.evaluate((idx) => {
          const row = document.querySelector('.game-card .marks');
          const r = row.getBoundingClientRect();
          const q = row.querySelectorAll('.mark')[idx].getBoundingClientRect();
          const el = row.querySelectorAll('.mark')[idx];
          return {
            row: { w: Math.round(r.width), h: Math.round(r.height) },
            btn: {
              dx: Math.round(q.left - r.left), dy: Math.round(q.top - r.top),
              w: Math.round(q.width), h: Math.round(q.height),
              rectLeft: Math.round(q.left), rectTop: Math.round(q.top),
            },
            under: (() => {
              const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
              return e?.closest('.mark')?.dataset.status || e?.tagName || 'курсор вне экрана';
            })(),
            status: el.dataset.status,
            hasLabel: Boolean(el.title || el.getAttribute('aria-label')),
            enter: window.__enter, leave: window.__leave,
            cls: window.__cls,
          };
        }, i);

        // допуск 1px: карточка на наведении едет на 4px (transform), и округление
        // дробных пикселей даёт ±1 в разнице координат — это не перестроение раскладки
        const near = (a, b) => Math.abs(a - b) <= 1;
        const same = near(after.btn.dx, before.btns[i].dx) && near(after.btn.dy, before.btns[i].dy)
          && near(after.btn.w, before.btns[i].w) && near(after.btn.h, before.btns[i].h)
          && near(after.row.w, before.row.w) && near(after.row.h, before.row.h);
        const name = `@${width} «${after.status}»`;
        if (same) markOk(`${name}: под курсором размер и позиция не изменились (${after.btn.w}×${after.btn.h})`);
        else markBad(`${name}: раскладка поехала — было ${before.btns[i].w}×${before.btns[i].h} со сдвигом ${before.btns[i].dx},${before.btns[i].dy} от строки, стало ${after.btn.w}×${after.btn.h} со сдвигом ${after.btn.dx},${after.btn.dy}`);
        if (after.under === after.status) markOk(`${name}: курсор остаётся на кнопке (нет цикла mouseover/mouseout)`);
        else markBad(`${name}: под курсором оказался «${after.under}» вместо кнопки`);
        if (after.enter === 1 && after.leave === 0) markOk(`${name}: браузер засчитал ровно один вход курсора (${after.enter}), выходов ${after.leave}`);
        else markBad(`${name}: курсор входит/выходит повторно — enter=${after.enter}, leave=${after.leave} (мерцание)`);
        if (after.hasLabel) markOk(`${name}: у кнопки есть текстовая подпись для подсказки и скринридера`);
        else markBad(`${name}: у кнопки нет ни title, ни aria-label`);
        if (after.cls - before.cls < 0.01) markOk(`${name}: наведение не вызвало сдвига макета (CLS 0)`);
        else markBad(`${name}: наведение сдвинуло макет, CLS +${(after.cls - before.cls).toFixed(3)}`);
      }
      await page.close();
    }

    /* --- B. Шторка меню на телефоне --- */
    for (const width of [360, 768]) {
      const page = await newPage(width, 800);
      await goto(page, '/catalog');
      const headerBefore = await page.evaluate(() => {
        const h = document.querySelector('.header-inner').getBoundingClientRect();
        return { left: Math.round(h.left), w: Math.round(h.width), cls: window.__cls };
      });
      await page.click('.burger');
      await new Promise((r) => setTimeout(r, 450));

      const open = await page.evaluate(() => {
        const nav = document.querySelector('#main-nav');
        const r = nav.getBoundingClientRect();
        const close = nav.querySelector('.nav-close');
        const cr = close ? close.getBoundingClientRect() : null;
        const se = document.scrollingElement;
        const wasX = se.scrollLeft; se.scrollLeft = 40;
        const canScrollX = se.scrollLeft > 0; se.scrollLeft = wasX;
        const h = document.querySelector('.header-inner').getBoundingClientRect();
        const links = [...nav.querySelectorAll('.nav-link')].map((a) => {
          const b = a.getBoundingClientRect();
          return { text: a.innerText.trim().slice(0, 20), h: Math.round(b.height), clipped: a.scrollWidth > a.clientWidth + 1 };
        });
        return {
          width: Math.round(r.width), vw: window.innerWidth,
          visible: Math.round(window.innerWidth - r.width),
          close: cr ? { w: Math.round(cr.width), h: Math.round(cr.height), top: Math.round(cr.top), right: Math.round(cr.right) } : null,
          expanded: document.querySelector('.burger').getAttribute('aria-expanded'),
          overlayShown: document.querySelector('.nav-overlay')?.classList.contains('show') ?? null,
          bodyLocked: document.body.classList.contains('menu-open'),
          canScrollX,
          headerLeft: Math.round(h.left), headerWidth: Math.round(h.width),
          links, cls: window.__cls,
        };
      });

      const share = Math.round((open.width / open.vw) * 100);
      if (share <= 82) markOk(`@${width}: шторка ${open.width}px = ${share}% экрана, страница видна полосой ${open.visible}px`);
      else markBad(`@${width}: шторка закрывает ${share}% экрана (${open.width}px из ${open.vw}) — пол-экрана и больше`);
      if (open.visible >= 60) markOk(`@${width}: видимая часть страницы ${open.visible}px — понятно, что это панель поверх сайта`);
      else markBad(`@${width}: за шторкой остаётся всего ${open.visible}px страницы`);
      if (open.close && open.close.w >= 44 && open.close.h >= 44 && open.close.top >= 0 && open.close.right <= open.vw)
        markOk(`@${width}: кнопка закрытия ${open.close.w}×${open.close.h} и целиком в экране`);
      else markBad(`@${width}: кнопка закрытия ${open.close ? `${open.close.w}×${open.close.h}` : 'не найдена или вне экрана'}`);
      if (open.expanded === 'true' && open.overlayShown && open.bodyLocked)
        markOk(`@${width}: панель открыта (aria-expanded=true, затемнение есть, скролл страницы заблокирован)`);
      else markBad(`@${width}: неполное открытие — aria-expanded=${open.expanded}, оверлей=${open.overlayShown}, блокировка=${open.bodyLocked}`);
      if (!open.canScrollX) markOk(`@${width}: открытая шторка не даёт горизонтальной прокрутки`);
      else markBad(`@${width}: открытая шторка сдвигает страницу вбок`);
      const wrapped = open.links.filter((l) => l.h > 56 || l.clipped);
      if (!wrapped.length) markOk(`@${width}: все пункты меню (${open.links.length}) в одну строку, ничего не обрезано`);
      else markBad(`@${width}: пункты меню не влезают: ${wrapped.map((l) => `«${l.text}» h=${l.h}`).join(', ')}`);
      if (open.headerLeft === headerBefore.left && open.headerWidth === headerBefore.w)
        markOk(`@${width}: открытие меню не сдвинуло шапку и текст страницы`);
      else markBad(`@${width}: шапка «прыгнула» при открытии меню: left ${headerBefore.left}→${open.headerLeft}`);
      if (open.cls - headerBefore.cls < 0.01) markOk(`@${width}: открытие меню без сдвига макета (CLS 0)`);
      else markBad(`@${width}: открытие меню сдвинуло макет, CLS +${(open.cls - headerBefore.cls).toFixed(3)}`);

      // закрытие крестиком + возврат фокуса
      await page.click('#main-nav .nav-close');
      await new Promise((r) => setTimeout(r, 450));
      const closed = await page.evaluate(() => ({
        wide: document.querySelector('#main-nav').getBoundingClientRect().width,
        left: Math.round(document.querySelector('#main-nav').getBoundingClientRect().left),
        expanded: document.querySelector('.burger').getAttribute('aria-expanded'),
        focus: document.activeElement?.className || document.activeElement?.tagName,
        vw: window.innerWidth,
        isOpen: document.querySelector('#main-nav').classList.contains('open'),
      }));
      if (!closed.isOpen && closed.expanded === 'false' && !closed.canScrollX)
        markOk(`@${width}: крестик убрал панель (aria-expanded=false)`);
      else markBad(`@${width}: крестик не закрыл панель — open=${closed.isOpen}, aria-expanded=${closed.expanded}`);
      if (/burger/.test(closed.focus)) markOk(`@${width}: фокус вернулся на кнопку меню (${closed.focus.split(' ')[0]})`);
      else markBad(`@${width}: после закрытия фокус остался на «${closed.focus}»`);

      // закрытие по затемнению и по Esc
      await page.click('.burger');
      await new Promise((r) => setTimeout(r, 400));
      await page.click('.nav-overlay', { offset: { x: 10, y: 300 } }).catch(() => {});
      await new Promise((r) => setTimeout(r, 400));
      const byOverlay = await page.evaluate(() => document.querySelector('#main-nav').classList.contains('open'));
      if (!byOverlay) markOk(`@${width}: клик по затемнению закрывает меню`);
      else markBad(`@${width}: клик по затемнению не закрыл меню`);

      await page.click('.burger');
      await new Promise((r) => setTimeout(r, 400));
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 400));
      const byEsc = await page.evaluate(() => document.querySelector('#main-nav').classList.contains('open'));
      if (!byEsc) markOk(`@${width}: Esc закрывает меню`);
      else markBad(`@${width}: Esc не закрыл меню`);

      await page.close();
    }

    /* --- C. Сдвиги текста при загрузке (CLS) --- */
    for (const width of [360, 1440]) {
      const page = await newPage(width);
      await goto(page, '/catalog');
      const cls = await page.evaluate(() => ({ total: window.__cls, max: window.__clsMax }));
      if (cls.total < 0.1) markOk(`@${width}: загрузка каталога без заметных сдвигов текста (CLS ${cls.total.toFixed(3)})`);
      else markBad(`@${width}: страница «прыгает» при загрузке — CLS ${cls.total.toFixed(3)}, худший сдвиг ${cls.max.toFixed(3)}`);

      // карточки не должны менять позицию после подгрузки обложек
      const stable = await page.evaluate(async () => {
        const card = document.querySelector('.game-card');
        const a = card.getBoundingClientRect();
        await Promise.all([...document.images].map((i) => i.decode?.().catch(() => {}) || Promise.resolve()));
        await new Promise((r) => setTimeout(r, 400));
        const b = card.getBoundingClientRect();
        return { dx: Math.round(Math.abs(a.left - b.left)), dy: Math.round(Math.abs(a.top - b.top)), cls: window.__cls };
      });
      if (stable.dx === 0 && stable.dy === 0) markOk(`@${width}: карточки не сдвигаются после загрузки обложек`);
      else markBad(`@${width}: карточки сдвинулись после загрузки обложек (dx=${stable.dx}, dy=${stable.dy})`);
      await page.close();
    }

    /* --- D. Обрезанный и вылезающий текст --- */
    for (const width of [360, 768, 1440]) {
      const page = await newPage(width);
      await goto(page, '/catalog');
      const clip = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('#app *').forEach((el) => {
          if (!el.childNodes.length) return;
          const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
          if (text.length < 3) return;
          const cs = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          // «визуально скрытый» текст (подписи для скринридера) — это не обрезка:
          // у него размер 1×1 или обрезка через clip-path
          if (rect.width <= 2 || rect.height <= 2 || cs.clipPath !== 'none') return;
          if (cs.overflow !== 'hidden' && cs.overflow !== 'clip' && cs.textOverflow !== 'ellipsis') return;
          if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 2) {
            out.push(`${el.className || el.tagName}: «${text.slice(0, 30)}» (${el.scrollWidth} в ${el.clientWidth})`);
          }
        });
        return out.slice(0, 6);
      });
      if (!clip.length) markOk(`@${width}: нет обрезанного по ширине текста в интерфейсе`);
      else markBad(`@${width}: текст не влезает: ${clip.join(' · ')}`);
      await page.close();
    }

    /* --- E. Ничего не вылезает за экран (нашёл на /profile) --- */
    // Прошлая проверка обрезки смотрела только каталог, поэтому не поймала, что на
    // 360px строка отметки в профиле шире своей панели: колонка грида растягивалась
    // под неразрывное название игры, и подпись статуса уезжала за край экрана.
    // 280/320 — сгибаемые телефоны: на 280px у шапки уезжала за край кнопка меню,
    // на 320px не влезали три кнопки панели квиза.
    for (const width of [280, 320, 360, 768]) {
      for (const [name, route] of [['profile', '/profile'], ['quiz', '/quiz'], ['party', '/party'], ['game', '/game/balatro'], ['about', '/about']]) {
        const page = await newPage(width);
        await goto(page, route);
        const over = await page.evaluate(() => {
          const vw = window.innerWidth;
          // спрятанное «по замыслу» не считаем вылетом: skip-ссылка уезжает за левый
          // край, а панель меню ждёт открытия за правым (visibility: hidden + transform)
          const hiddenByDesign = (el) => {
            if (el.closest('.skip')) return true;
            for (let p = el; p && p !== document.body; p = p.parentElement) {
              const cs = getComputedStyle(p);
              if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return true;
            }
            const nav = el.closest('.nav');
            return Boolean(nav && !nav.classList.contains('open'));
          };
          const insideScroller = (el) => {
            for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
              const cs = getComputedStyle(p);
              if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return true;
            }
            return false;
          };
          const out = [];
          document.querySelectorAll('#app *').forEach((el) => {
            if (insideScroller(el) || hiddenByDesign(el)) return;
            const r = el.getBoundingClientRect();
            if (r.width <= 2 || r.height <= 2) return;
            // вылет вправо/влево больше пикселя — элемент обрезан краем экрана
            if (r.right > vw + 1 || r.left < -1) {
              out.push(`${el.className || el.tagName}: ${Math.round(r.left)}…${Math.round(r.right)} при экране ${vw}`);
            }
          });
          return out.slice(0, 5);
        });
        // заодно обрезанный рамкой текст: раньше это проверялось только на каталоге,
        // поэтому не поймало обрезанные подписи шкал и названия в «Моём вкусе»
        const clip = await page.evaluate(() => {
          const out = [];
          document.querySelectorAll('#app *').forEach((el) => {
            if (!el.childNodes.length) return;
            const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
            if (text.length < 3) return;
            const cs = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (rect.width <= 2 || rect.height <= 2 || cs.clipPath !== 'none') return;
            if (cs.overflow !== 'hidden' && cs.overflow !== 'clip' && cs.textOverflow !== 'ellipsis') return;
            if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 2) out.push(`${el.className || el.tagName}: «${text.slice(0, 30)}»`);
          });
          return out.slice(0, 5);
        });
        const bad = [...over.map((x) => `вылезает за экран (${x})`), ...clip.map((x) => `обрезан текст (${x})`)];
        if (!bad.length) markOk(`@${width} ${name}: все блоки внутри экрана, текст не обрезан`);
        else markBad(`@${width} ${name}: ${bad.join(' · ')}`);
        await page.close();
      }
    }

    /* --- З. Слова не рвутся посередине (нашёл на скриншоте каталога) --- */
    // Студия «ConcernedApe» на 360px рвалась на «ConcernedA» и «pe», а цены
    // («50–200», «2500 ₽ и выше») и год-студия — внутри себя. Описания исключены
    // осознанно: там `hyphens: auto`, а браузер без словарей переносов (Chromium
    // на Linux без RU-словаря) всё равно рвёт длинные слова — это ограничение
    // браузера, а не вёрстки, поэтому для них считаем и печатаем отдельно.
    const NO_BREAK = '.card-sub, .card-foot, .price, .price-rub, .len, .badge, .mark-row-status, .chip, .card-cover-meta';
    for (const width of [360, 480]) {
      const page = await newPage(width);
      await goto(page, '/catalog');
      await page.waitForSelector('.game-card', { timeout: 5000 }).catch(() => {});
      const res = await page.evaluate((sel) => {
        const hard = []; const soft = [];
        const walk = (node, inSoft) => {
          for (const n of node.childNodes) {
            if (n.nodeType === 3) {
              const text = n.textContent;
              const re = /\S+/g;
              let m;
              while ((m = re.exec(text))) {
                if (m[0].length < 3) continue;
                const r = document.createRange();
                r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
                const rects = [...r.getClientRects()].filter((x) => x.width > 0.5 && x.height > 0.5);
                if (!rects.length) continue;
                const tops = new Set(rects.map((x) => Math.round(x.top)));
                if (tops.size > 1) (inSoft ? soft : hard).push(`${n.parentElement.className || n.parentElement.tagName}: «${m[0].slice(0, 20)}»`);
              }
            } else if (n.nodeType === 1) {
              const softHere = inSoft || /card-desc|why|card-title|game-title|lead|faq/.test(String(n.className || ''));
              walk(n, softHere);
            }
          }
        };
        document.querySelectorAll(sel).forEach((el) => walk(el, false));
        return { hard: [...new Set(hard)].slice(0, 5), soft: [...new Set(soft)].slice(0, 5) };
      }, NO_BREAK);
      if (!res.hard.length) markOk(`@${width}: числа, цены и подписи не рвутся посередине`);
      else markBad(`@${width}: слово разорвано посередине — ${res.hard.join(' · ')}`);
      if (res.soft.length) console.log(`   ↳ @${width}: длинные слова в описаниях переносятся (${res.soft.length}): браузер без словаря переносов; с hyphens: auto на телефонах — с дефисом`);
      await page.close();
    }

    /* --- Ж. Панель навигации квиза: липнет к низу и не просвечивает --- */
    for (const width of [360, 480]) {
      const page = await newPage(width);
      await goto(page, '/quiz');
      await page.waitForSelector('.quiz-nav', { timeout: 5000 }).catch(() => {});
      const nav = await page.evaluate(() => {
        const n = document.querySelector('.quiz-nav');
        if (!n) return null;
        const r = n.getBoundingClientRect();
        const cs = getComputedStyle(n);
        const btn = n.querySelector('.btn')?.getBoundingClientRect();
        // альфа фона: chrome отдаёт и `rgba(…)`, и `color(srgb … / a)`
        const alpha = (() => {
          const m = cs.backgroundColor.match(/\/\s*([\d.]+)\s*\)/);
          if (m) return Number(m[1]);
          const m2 = cs.backgroundColor.match(/,\s*([\d.]+)\s*\)$/);
          return m2 ? Number(m2[1]) : 1;
        })();
        return {
          top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight,
          backdrop: cs.backdropFilter, bg: cs.backgroundColor, alpha,
          btnBottom: btn ? Math.round(btn.bottom) : null,
        };
      });
      if (!nav) markBad(`@${width}: панель квиза не найдена`);
      else if (nav.top >= nav.vh) markBad(`@${width}: панель квиза уехала ниже экрана (${nav.top} ≥ ${nav.vh})`);
      else if (nav.bottom < nav.vh - 2) markBad(`@${width}: панель квиза не достаёт до низа экрана (${nav.bottom} при ${nav.vh})`);
      else if (nav.btnBottom && nav.btnBottom > nav.vh + 1) markBad(`@${width}: кнопка панели квиза обрезана (${nav.btnBottom} при ${nav.vh})`);
      else if (nav.alpha < 1 && nav.backdrop === 'none') markBad(`@${width}: панель квиза просвечивает без размытия (фон ${nav.bg})`);
      else markOk(`@${width}: панель квиза липнет к низу (${nav.top}…${nav.bottom} при ${nav.vh}), фон ${nav.backdrop === 'none' ? 'сплошной' : 'с размытием'}`);
      await page.close();
    }

    await ib.close();
  }
}

await browser.close();
server.kill();

writeFileSync(resolve(OUT, `report${TAG ? '-' + TAG : ''}-${THEME}.json`), JSON.stringify(results, null, 1));
console.log(`\nСкриншоты: ${OUT}\nПроверок: ${results.length} · ❌ ${failures.length}`
  + (externalNotes ? ` · проверок с недоступным внешним CDN: ${externalNotes}` : ''));
if (interactionFailures.length) {
  console.log(`\nИнтерактивные проверки: ❌ ${interactionFailures.length}`
    + interactionFailures.map((f) => `\n - ${f}`).join(''));
}
if (failures.length || interactionFailures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
if (STRICT && externalNotes) {
  console.log('❌ --strict: есть проверки с недоступными внешними ресурсами');
  process.exit(1);
}
