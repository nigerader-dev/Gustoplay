#!/usr/bin/env node
/**
 * Проверка обложек: у КАЖДОЙ игры каталога должен быть официальный арт,
 * и каждый URL обязан отвечать (методом, который отдаёт сервер).
 * Запуск: npm run check:covers (нужен доступ к интернету; в песочнице без сети
 * проверку гоняет GitHub Actions — .github/workflows/ci.yml).
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
    return res.ok ? null : `HTTP ${res.status}`;
  } catch (error) {
    return error.message;
  }
}

/** Один повтор после паузы: сеть и CDN иногда «икуют» (429/503/таймаут). */
async function isAlive(url) {
  const problem = await probeOnce(url);
  if (!problem) return null;
  await sleep(2000);
  return probeOnce(url);
}

const missing = GAMES.filter((g) => !g.cover);
const queue = GAMES.filter((g) => g.cover);
const broken = [];
let done = 0;

async function worker() {
  while (queue.length) {
    const game = queue.shift();
    if (!game) break;
    const problem = await isAlive(game.cover);
    if (problem) broken.push(`${game.slug} (${game.t}): ${problem} — ${game.cover}`);
    done += 1;
    if (done % 50 === 0) console.log(`  …проверено ${done}/${queue.length + done}`);
  }
}

console.log(`Проверяю обложки ${GAMES.length} игр (заполнено: ${GAMES.length - missing.length})…`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

if (missing.length) {
  console.error(`\n❌ Без обложки (${missing.length}):`);
  missing.forEach((g) => console.error(`  • ${g.slug} — ${g.t}`));
  console.error('Запустите: npm run covers:resolve (или GitHub Actions → Covers)');
}
if (broken.length) {
  console.error(`\n❌ Битые URL (${broken.length}):`);
  broken.forEach((b) => console.error(`  • ${b}`));
  console.error('Замените запись в tools/steam-overrides.json и перезапустите covers:resolve.');
}

const ok = !missing.length && !broken.length;
console.log(ok
  ? `\n✅ Все ${GAMES.length} обложек на месте и отвечают.`
  : `\n❌ Обложек в порядке: ${GAMES.length - missing.length - broken.length}/${GAMES.length}.`);
process.exit(ok ? 0 : 1);
