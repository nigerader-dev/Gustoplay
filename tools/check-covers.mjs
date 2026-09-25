#!/usr/bin/env node
/**
 * Проверка обложек: у КАЖДОЙ игры каталога должен быть официальный арт,
 * и каждый URL обязан отвечать (методом, который отдаёт сервер).
 * Запуск: npm run check:covers (нужен доступ к интернету; в песочнице без сети
 * проверку гоняет GitHub Actions — .github/workflows/ci.yml).
 *
 * Отчёт различает ситуации, чтобы их не приходилось угадывать по логу:
 *   • URL отвечает            — всё хорошо;
 *   • HTTP 404/410 и прочие   — битая ссылка, лечится записью в tools/steam-overrides.json;
 *   • сетевые отказы (fetch failed, таймаут) — похоже, нет доступа к CDN.
 * Если не ответил НИ ОДИН URL, честно пишем про сеть, а не «437 обложек битые».
 *
 * Отдельно и без сети проверяется главное требование каталога — «ноль заглушек»:
 * cover обязан быть ссылкой на официальный арт магазина, а не data:-URI, не локальный
 * SVG-генератор и не файл из /covers. Такая проверка работает и в офлайне, поэтому
 * её результат не зависит от доступности CDN.
 */
import { GAMES } from '../js/catalog/index.js';

const CONCURRENCY = 8;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probeOnce(url) {
  const opts = { signal: AbortSignal.timeout(20000) };
  try {
    let res = await fetch(url, { ...opts, method: 'HEAD', redirect: 'follow' });
    // некоторые CDN не любят HEAD — пробуем обычный GET с ограничением тела
    if (res.status === 405 || res.status === 403) res = await fetch(url, { ...opts, method: 'GET', redirect: 'follow' });
    if (res.ok) return null;
    return {
      problem: `HTTP ${res.status}`,
      kind: res.status === 404 || res.status === 410 ? 'dead' : 'http',
    };
  } catch (error) {
    return { problem: error.message, kind: 'network' };
  }
}

/** Один повтор после паузы: сеть и CDN иногда «икуют» (429/503/таймаут). */
async function isAlive(url) {
  const problem = await probeOnce(url);
  if (!problem) return null;
  await sleep(2000);
  return probeOnce(url);
}

/**
 * Заглушка вместо официального арта: сгенерированный SVG (js/cover.js), инлайн data:-URI
 * или локальная картинка из /covers. Официальный арт — всегда абсолютная https-ссылка
 * на CDN магазина (Steam, GOG, Epic, Nintendo, Google Play, сайт издателя).
 */
const isStub = (url) => {
  const value = String(url || '').trim();
  if (!value) return true;
  if (/^data:/i.test(value)) return true;
  if (/\.svg(\?|#|$)/i.test(value)) return true;
  if (/^(?:\.\.?\/|\/)?covers\//i.test(value)) return true;
  return !/^https:\/\//i.test(value);
};

const missing = GAMES.filter((g) => !g.cover);
const stubs = GAMES.filter((g) => g.cover && isStub(g.cover));
const queue = GAMES.filter((g) => g.cover && !isStub(g.cover));
const total = queue.length;
const broken = [];
let alive = 0;
let done = 0;

async function worker() {
  while (queue.length) {
    const game = queue.shift();
    if (!game) break;
    const problem = await isAlive(game.cover);
    if (problem) broken.push({ slug: game.slug, title: game.t, url: game.cover, ...problem });
    else alive += 1;
    done += 1;
    if (done % 50 === 0) console.log(`  …проверено ${done}/${total}`);
  }
}

console.log(`Проверяю обложки ${GAMES.length} игр (заполнено: ${GAMES.length - missing.length})…`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const network = broken.filter((b) => b.kind === 'network');
const dead = broken.filter((b) => b.kind === 'dead');
const other = broken.filter((b) => b.kind !== 'network' && b.kind !== 'dead');

if (missing.length) {
  console.error(`\n❌ Без обложки (${missing.length}):`);
  missing.forEach((g) => console.error(`  • ${g.slug} — ${g.t}`));
  console.error('Запустите: npm run covers:resolve (или GitHub Actions → Covers)');
}

if (stubs.length) {
  console.error(`\n❌ Заглушки вместо официального арта (${stubs.length}):`);
  stubs.forEach((g) => console.error(`  • ${g.slug} (${g.t}): ${String(g.cover).slice(0, 90)}`));
  console.error('У каждой игры должен быть официальный арт магазина (Steam/GOG/Epic/Nintendo/Google Play/сайт издателя).');
  console.error('Добавьте AppID в tools/steam-overrides.json и запустите npm run covers:resolve.');
}

if (broken.length) {
  console.error(`\n❌ Не отвечают (${broken.length}): ${alive} ок, ${dead.length} битых ссылок, ${network.length} сетевых отказов`);
  broken.forEach((b) => console.error(`  • ${b.slug} (${b.title}): ${b.problem} — ${b.url}`));
  if (dead.length || other.length) {
    console.error('Замените запись в tools/steam-overrides.json и перезапустите covers:resolve.');
  }
}

// Особый случай: сеть до CDN закрыта целиком. Это не «437 битых обложек», и без
// пояснения такой лог легко принять за проблему каталога.
const offline = alive === 0 && total > 0 && !missing.length && !stubs.length;
if (offline) {
  console.error('\n⚠️  Ни один URL не ответил — похоже, нет доступа к CDN обложек (Steam/Google Play).');
  console.error('   Локально без интернета это ожидаемо: проверку гоняет CI — шаг «Обложки» в .github/workflows/ci.yml.');
  console.error('   Каталог при этом не считается битым — проверку нужно повторить там, где сеть есть.');
}

const ok = !missing.length && !stubs.length && !broken.length;
console.log(ok
  ? `\n✅ Все ${GAMES.length} обложек на месте, это официальные арты, и все URL отвечают.`
  : `\n❌ Обложек в порядке: ${GAMES.length - missing.length - stubs.length - broken.length}/${GAMES.length}`
    + ` (без обложки: ${missing.length}, заглушек: ${stubs.length}, недоступных: ${broken.length}).`);
process.exit(ok ? 0 : 1);
