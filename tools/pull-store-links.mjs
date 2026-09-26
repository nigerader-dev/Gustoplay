#!/usr/bin/env node
/**
 * Переносит в данные ссылки, которые проверил CI.
 *
 * Проверка ссылок ходит в интернет (Steam, Nintendo eShop, PlayStation Store, Epic,
 * Google Play и сайты издателей), поэтому живёт в GitHub Actions — в песочнице эти
 * домены недоступны. Workflow links.yml печатает проверенный JSON блоками
 * VERIFIED_JSON / STEAM_SUGGESTIONS_JSON: и в лог, и в аннотации проверки (логи и
 * артефакты прогонов из закрытых сред недоступны, аннотации — видны через API).
 *
 * Этот скрипт забирает такой блок и по флагу --apply переносит ссылки магазинов
 * в js/catalog/store-links.js. Ничего не применяется молча: по умолчанию только
 * печать, а подпись магазина должна существовать в js/i18n.js, иначе запись
 * отклоняется (иначе на странице показался бы ключ перевода вместо подписи).
 *
 * Запуск:
 *   node tools/pull-store-links.mjs                    # взять последний прогон links.yml
 *   node tools/pull-store-links.mjs --run=12345678     # конкретный прогон
 *   node tools/pull-store-links.mjs --file=/tmp/ci.log # из сохранённого лога
 *   node tools/pull-store-links.mjs --apply            # записать в данные
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { STRINGS } from '../js/i18n.js';
import { GAMES } from '../js/catalog/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name) => args.find((x) => x.startsWith(`--${name}=`))?.split('=')[1];
const APPLY = args.includes('--apply');

const gh = (path) => JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));

/**
 * Блок --- NAME --- … --- END_NAME --- из лога прогона.
 * В аннотациях проверки переводы строк приходят либо как есть, либо схлопнутыми
 * (`%0A` или вовсе без них) — разбираем все три вида.
 */
function block(text, name) {
  const flat = text.replace(/%0A/g, '\n');
  const m = new RegExp(`--- ${name} ---\\s*([\\s\\S]*?)\\s*--- END_${name} ---`).exec(flat);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

/** Лог последнего прогона links.yml (аннотации проверки, а не файл лога: он недоступен) */
function logFromRun(runId) {
  const repo = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], { encoding: 'utf8' }).trim();
  let run = runId;
  if (!run) {
    const runs = gh(`repos/${repo}/actions/workflows/links.yml/runs?per_page=20`);
    const ok = (runs.workflow_runs || []).find((r) => r.conclusion === 'success');
    if (!ok) throw new Error('успешных прогонов links.yml не нашлось — запустите workflow вручную');
    run = ok.id;
  }
  const jobs = gh(`repos/${repo}/actions/runs/${run}/jobs`);
  const parts = [];
  // Части больших блоков: заголовок VERIFIED_JSON_PART_2_OF_3 → склеиваем в один блок.
  const chunks = new Map();
  for (const job of jobs.jobs || []) {
    if (job.conclusion === 'skipped') continue;
    try {
      const list = gh(`repos/${repo}/check-runs/${job.id}/annotations`);
      // сообщение уже содержит маркеры блока (workflow их печатает), поэтому
      // оборачивать его второй раз нельзя — иначе парсер поймает пустое начало
      for (const a of list) {
        const m = /^([A-Z_]+)_PART_(\d+)_OF_(\d+)$/.exec(a.title || '');
        if (!m) { parts.push(a.message); continue; }
        const rec = chunks.get(m[1]) || { total: Number(m[3]), parts: [] };
        rec.parts[Number(m[2]) - 1] = a.message;
        rec.total = Number(m[3]);
        chunks.set(m[1], rec);
      }
    } catch { /* у job без аннотаций запрос тоже отвечает пустым списком */ }
  }
  for (const [label, rec] of chunks) {
    if (rec.parts.some((p) => p === undefined)) {
      console.log(`⚠️  ${label}: пришло частей ${rec.parts.filter(Boolean).length} из ${rec.total} — блок пропущен`);
      continue;
    }
    parts.push(`--- ${label} ---${rec.parts.join('')}--- END_${label} ---`);
  }
  console.log(`Прогон ${run}: аннотаций ${parts.length}\n`);
  return { text: parts.join('\n'), run };
}

const fromFile = arg('file');
const source = fromFile ? { text: readFileSync(fromFile, 'utf8'), run: null } : logFromRun(arg('run'));
const verified = block(source.text, 'VERIFIED_JSON');
const suggestions = block(source.text, 'STEAM_SUGGESTIONS_JSON');

if (!verified) {
  console.log('Блока VERIFIED_JSON нет — проверка кандидатов, похоже, не запускалась.');
  console.log('Запустить вручную: gh workflow run links.yml -f candidates=tools/store-candidates.json');
  process.exit(0);
}

/* ------------------------------- разбор ------------------------------- */

const known = new Set(GAMES.map((g) => g.slug));
const labelsRu = STRINGS.ru || {};
const stores = verified.stores || {};
const accepted = {};
const skipped = [];

for (const [slug, entry] of Object.entries(stores)) {
  if (!known.has(slug)) { skipped.push([slug, 'нет игры с таким slug']); continue; }
  if (!entry?.url || !/^https:\/\//.test(entry.url)) { skipped.push([slug, 'ссылка не https']); continue; }
  if (!labelsRu[entry.label]) { skipped.push([slug, `подписи ${entry.label} нет в i18n`]); continue; }
  accepted[slug] = { url: entry.url, label: entry.label };
}

console.log(`Проверено CI и готово к переносу: ${Object.keys(accepted).length} из ${Object.keys(stores).length}`);
for (const [slug, e] of Object.entries(accepted)) {
  const game = GAMES.find((g) => g.slug === slug);
  console.log(`  ✅ ${slug} («${game?.t}») → ${e.url} [${e.label}]`);
}
if (skipped.length) {
  console.log('\nОтклонено:');
  for (const [slug, why] of skipped) console.log(`  • ${slug}: ${why}`);
}

if (suggestions?.length) {
  console.log(`\nSteam-страницы, которых нет в данных (${suggestions.length}) — проверить глазами:`);
  for (const s of suggestions) console.log(`  • ${s.slug}: appid ${s.steamId || s.id}${s.name ? ` («${s.name}»)` : ''}`);
  console.log('  Такой appid добавляется в tools/steam-overrides.json и подхватывается');
  console.log('  резолвером обложек (npm run covers:resolve) — в песочнице для него нет сети.');
}

if (!Object.keys(accepted).length) process.exit(0);
if (!APPLY) {
  console.log('\nЭто предпросмотр. Записать в данные: node tools/pull-store-links.mjs --apply');
  process.exit(0);
}

/* ------------------------------ запись ------------------------------- */

const path = resolve(root, 'js/catalog/store-links.js');
// Сливаем с тем, что уже лежит в данных: CI проверяет только игры без ссылки,
// поэтому полная замена файла стирала ранее подтверждённые адреса (так потерялся
// PlayStation-адрес Bloodborne).
const previous = (await import(pathToFileURL(path).href)).STORE_LINKS || {};
const merged = { ...previous, ...accepted };
const kept = Object.keys(previous).filter((slug) => !(slug in accepted)).length;
const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
const body = Object.entries(sorted)
  .map(([slug, e]) => `  ${JSON.stringify(slug)}: { url: ${JSON.stringify(e.url)}, label: ${JSON.stringify(e.label)} },`)
  .join('\n');
const header = `/**
 * Официальные страницы магазинов для игр, которых нет в Steam.
 * Заполняется только проверенными адресами: tools/check-store-links.mjs открывает
 * каждую ссылку, сверяет заголовок страницы с названием игры, а затем
 * tools/pull-store-links.mjs --apply переносит сюда подтверждённое.
 * Обновлено: ${new Date().toISOString().slice(0, 10)} · ссылок: ${Object.keys(sorted).length}
 */
export const STORE_LINKS = {
${body}
};
`;
writeFileSync(path, header);
console.log(`\nЗаписано в js/catalog/store-links.js: ${Object.keys(sorted).length} ссылок`
  + ` (новых ${Object.keys(accepted).length}, сохранено прежних ${kept}).`);
console.log('Дальше: npm run check:text && npm test (проверка подписей и ссылок).');
