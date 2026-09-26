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

/**
 * Отказ по частоте (403/429/5xx) — это «нас не пустили», а не битая обложка.
 * CDN магазинов ограничивают запросы с адресов CI, и без такого различия один
 * и тот же коммит проходит проверку в одном прогоне и падает в другом.
 */
const THROTTLED = new Set([403, 408, 425, 429, 500, 502, 503, 504]);

async function probeOnce(url) {
  const opts = { signal: AbortSignal.timeout(20000) };
  try {
    let res = await fetch(url, { ...opts, method: 'HEAD', redirect: 'follow' });
    // некоторые CDN не любят HEAD — пробуем обычный GET
    if (!res.ok && (res.status === 405 || res.status === 403)) {
      res = await fetch(url, { ...opts, method: 'GET', redirect: 'follow' });
    }
    if (res.ok) return null;
    return {
      problem: `HTTP ${res.status}`,
      kind: res.status === 404 || res.status === 410 ? 'dead' : THROTTLED.has(res.status) ? 'throttled' : 'http',
    };
  } catch (error) {
    return { problem: String(error?.cause?.code || error.message), kind: 'network' };
  }
}

/** До трёх попыток с растущей паузой: CDN иногда «икают» (429/503/таймаут). */
async function isAlive(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const problem = await probeOnce(url);
    if (!problem) return null;
    if (problem.kind === 'dead') return problem;          // 404 повторять бессмысленно
    if (attempt < 2) await sleep(1500 * (attempt + 1));
    else return problem;
  }
  return { problem: 'не проверено', kind: 'network' };
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

/**
 * Ранний выход: если первые запросы дружно провалились по сети, ждать остальные
 * бессмысленно (в закрытой среде это 437 бесполезных попыток). Такое же условие
 * используется ниже для вывода «нет доступа к CDN».
 */
let stopped = false;

async function worker() {
  while (queue.length && !stopped) {
    const game = queue.shift();
    if (!game) break;
    const problem = await isAlive(game.cover);
    if (problem) broken.push({ slug: game.slug, title: game.t, url: game.cover, ...problem });
    else alive += 1;
    done += 1;
    if (done % 50 === 0) console.log(`  …проверено ${done}/${total}`);
    if (done >= 20 && alive === 0 && !broken.some((b) => b.kind !== 'network')) {
      stopped = true;
      console.log(`  …сеть недоступна: остановился на ${done} из ${total}, чтобы не ждать впустую`);
    }
  }
}

console.log(`Проверяю обложки ${GAMES.length} игр (заполнено: ${GAMES.length - missing.length})…`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const network = broken.filter((b) => b.kind === 'network');
const throttled = broken.filter((b) => b.kind === 'throttled');
// «Не ответили» — это про сеть/CDN, а не про каталог: такие ссылки показываем
// отдельно и не считаем ошибкой данных
const unavailable = [...network, ...throttled];
const hard = broken.filter((b) => b.kind !== 'network' && b.kind !== 'throttled');
const dead = hard.filter((b) => b.kind === 'dead');
const other = hard.filter((b) => b.kind !== 'dead');

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

if (hard.length) {
  console.error(`\n❌ Не отвечают (${hard.length}): ${alive} ок, ${dead.length} битых ссылок, ${other.length} прочих ответов`);
  hard.forEach((b) => console.error(`  • ${b.slug} (${b.title}): ${b.problem} — ${b.url}`));
  console.error('Замените запись в tools/steam-overrides.json и перезапустите covers:resolve.');
}

if (unavailable.length) {
  console.error(`\n⚠️  Не удалось проверить (${unavailable.length}) — это про сеть и ограничения CDN, не про каталог:`);
  console.error(`   ${throttled.length} отказов по частоте (403/429/5xx), ${network.length} сетевых сбоев.`);
  unavailable.slice(0, 10).forEach((b) => console.error(`  • ${b.slug}: ${b.problem} — ${b.url}`));
  if (unavailable.length > 10) console.error(`  … и ещё ${unavailable.length - 10}`);
  console.error('   Повторить: npm run check:covers (или прогнать CI ещё раз).');
}

// Особый случай: сеть до CDN закрыта целиком. Это не «437 битых обложек», и без
// пояснения такой лог легко принять за проблему каталога.
const offline = alive === 0 && total > 0 && !missing.length && !stubs.length;
if (offline) {
  console.error('\n⚠️  Ни один URL не ответил — похоже, нет доступа к CDN обложек (Steam/Google Play).');
  console.error('   Локально без интернета это ожидаемо: проверку гоняет CI — шаг «Обложки» в .github/workflows/ci.yml.');
  console.error('   Каталог при этом не считается битым — проверку нужно повторить там, где сеть есть.');
}

// Ошибка данных — это пропавшая обложка, заглушка или мёртвая ссылка (404/410).
// Недоступность CDN (троттлинг, сеть) ошибкой не считается: она не про каталог,
// а из-за неё один и тот же коммит падал в одном прогоне и проходил в другом.
const ok = !missing.length && !stubs.length && !hard.length;
// Проверено ровно то, что ответило: остальное — «не удалось проверить» (сеть, троттлинг,
// либо проверка остановилась рано). Считать их «в порядке» было бы неправдой.
const uncheckedTotal = total - alive - hard.length;
console.log(ok
  ? `\n${uncheckedTotal ? '⚠️ ' : '✅'} Обложки: у всех ${GAMES.length} игр официальный арт, `
    + `URL ответил у ${alive} из ${total}`
    + (uncheckedTotal ? `, ${uncheckedTotal} проверить не удалось (CDN/сеть).` : ', все URL отвечают.')
  : `\n❌ Обложек в порядке: ${alive}/${total}`
    + ` (без обложки: ${missing.length}, заглушек: ${stubs.length}, битых: ${hard.length}`
    + (uncheckedTotal ? `, не проверено: ${uncheckedTotal}` : '') + ').');
process.exit(ok ? 0 : 1);
