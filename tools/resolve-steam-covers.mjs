#!/usr/bin/env node
/**
 * Резолвит официальные обложки для каталога и пишет воспроизводимый источник данных
 * в js/catalog/steam-covers.js. Запускать там, где есть доступ к Steam Store API
 * (локальная песочница без сети — используйте GitHub Actions: .github/workflows/covers.yml).
 *
 *   npm run covers:resolve                 # все игры без обложек (инкрементально)
 *   node tools/resolve-steam-covers.mjs --part=c   # только игры из js/catalog/part-c.js
 *   node tools/resolve-steam-covers.mjs --limit=50 --delay=500
 *
 * Источники — только официальные арты магазинов:
 *   • Steam: storesearch API → CDN-картинка приложения (подавляющее большинство игр);
 *   • вне Steam: ручные записи в tools/steam-overrides.json (GOG / Epic / сайт издателя).
 * Случайные картинки из поиска не используются нигде в пайплайне.
 *
 * Несовпавшие названия попадают в tools/cover-review.log — их нужно либо вписать
 * в tools/steam-overrides.json (проверив вручную), либо поправить название в каталоге.
 */
import { writeFile, readFile } from 'node:fs/promises';
import { PART_A } from '../js/catalog/part-a.js';
import { PART_B } from '../js/catalog/part-b.js';
import { PART_C } from '../js/catalog/part-c.js';
import { PART_D } from '../js/catalog/part-d.js';
import { PART_E } from '../js/catalog/part-e.js';
import { PART_F } from '../js/catalog/part-f.js';
import { PART_G } from '../js/catalog/part-g.js';
import { PART_H } from '../js/catalog/part-h.js';
import { PART_I } from '../js/catalog/part-i.js';
import { STEAM_COVERS } from '../js/catalog/steam-covers.js';

const out = new URL('../js/catalog/steam-covers.js', import.meta.url);
const overridesPath = new URL('./steam-overrides.json', import.meta.url);
const reviewPath = new URL('./cover-review.log', import.meta.url);

const arg = (name) => process.argv.find((x) => x.startsWith(`--${name}=`))?.split('=')[1];
const limit = Number(arg('limit') || Infinity);
const delay = Number(arg('delay') || 400);
const part = (arg('part') || 'all').toLowerCase();

const PARTS = { a: PART_A, b: PART_B, c: PART_C, d: PART_D, e: PART_E, f: PART_F, g: PART_G, h: PART_H, i: PART_I };

/** Тот же slug, что считает каталог (см. js/catalog/index.js) */
const slugify = (s) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '');

const games = Object.entries(PARTS)
  .filter(([letter]) => part === 'all' || part === letter)
  .flatMap(([letter, list]) => list.map((g) => ({ ...g, slug: g.slug || slugify(g.t), part: letter })));

let overrides = {};
try { overrides = JSON.parse(await readFile(overridesPath, 'utf8')); } catch { /* файла ещё нет */ }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Нормализация для сравнения названий: регистр, пунктуация, диакритика не важны */
const norm = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const steamCoverUrl = (id) => `https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_600x900_2x.jpg`;

async function fetchJson(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GustoPlay catalog resolver/1.0)' },
        signal: AbortSignal.timeout(15000),
      });
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

const result = { ...STEAM_COVERS };
const review = [];
let matched = 0;
let byOverride = 0;
let pending = games.filter((g) => !result[g.slug]);

// 1) ручные сопоставления (игры с особыми названиями и игры вне Steam) — без сети
for (const game of [...pending]) {
  const ov = overrides[game.slug];
  if (!ov) continue;
  result[game.slug] = ov;
  pending = pending.filter((x) => x.slug !== game.slug);
  byOverride += 1;
}

// 2) Steam Store Search: точное совпадение по нормализованному названию
for (const game of pending.slice(0, limit)) {
  const term = game.t.replace(/’/g, "'");
  try {
    const data = await fetchJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=english&cc=us`);
    const apps = (data?.items || []).filter((x) => x.type === 'app');
    const exact = apps.find((x) => norm(x.name) === norm(game.t));
    if (exact?.id) {
      result[game.slug] = { steamId: exact.id, cover: steamCoverUrl(exact.id), src: 'steam' };
      matched += 1;
      if (apps.length > 1) {
        review.push(`CHECK ${game.slug} — «${game.t}»: выбрано ${exact.name} (${exact.id}); кандидаты: ${apps.slice(0, 4).map((x) => `${x.name} (${x.id})`).join(' | ')}`);
      } else {
        console.log(`  ✅ ${game.t} → ${exact.id}`);
      }
    } else {
      review.push(`MISS ${game.slug} — «${game.t}» (part-${game.part}): кандидаты ${apps.slice(0, 3).map((x) => `${x.name} (${x.id})`).join(' | ') || 'нет'}`);
      console.warn(`  ⚠️  ${game.t}: точного совпадения нет`);
    }
  } catch (error) {
    review.push(`ERROR ${game.slug} — «${game.t}»: ${error.message}`);
    console.warn(`  ⚠️  ${game.t}: ${error.message}`);
  }
  await sleep(delay);
}

// 3) запись: сортировка по slug, чтобы диффы были стабильными (детерминированная,
// без локали — иначе коммиты резолвера в CI и локальные будут «разъезжаться»)
const lines = Object.entries(result).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  .map(([slug, value]) => `  ${JSON.stringify(slug)}: ${JSON.stringify(value)},`);
await writeFile(out, `/** Generated by tools/resolve-steam-covers.mjs — review matches before publishing. Ручные правки: tools/steam-overrides.json. */\nexport const STEAM_COVERS = {\n${lines.join('\n')}\n};\n`);
review.sort();
await writeFile(reviewPath, `# cover-review.log (part=${part})\n# CHECK — совпадение с несколькими кандидатами (проверить вручную)\n# MISS — точного совпадения нет (добавить в tools/steam-overrides.json)\n${review.join('\n')}\n`);

const total = Object.keys(result).length;
console.log(`\nОбложки: ${total} игр (из них ${games.length} в выборке, +${matched} Steam за прогон, ${byOverride} из overrides)`);
console.log(`Сомнительные/пропущенные: ${review.length} → ${reviewPath.pathname}`);
