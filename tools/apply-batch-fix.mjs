#!/usr/bin/env node
/**
 * Правка записей-строк g(...) каталога по файлу исправлений.
 *
 *   node tools/apply-batch-fix.mjs tools/content/batch-54-fix.json js/catalog/part-a.js
 *
 * Файл исправлений: { "<slug>": { md, pl, tg, mood, desc, about, feats } } — любые поля
 * можно опустить. Остальные данные записи (цена, рейтинг, длительность, steamId…) не трогаются.
 * Подпись источника рейтинга приводится к виду «Рекомендации игроков Steam, снимок ДД.ММ.ГГГГ».
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [fixPath, partPath] = process.argv.slice(2);
if (!fixPath || !partPath) {
  console.error('Использование: node tools/apply-batch-fix.mjs <fix.json> <part.js>');
  process.exit(1);
}
const fixes = JSON.parse(readFileSync(resolve(fixPath), 'utf8'));
const { GAMES } = await import('../js/catalog/index.js');
const titleBySlug = Object.fromEntries(GAMES.map((g) => [g.slug, g.t]));

const src = readFileSync(resolve(partPath), 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
const lines = src.split(/\r?\n/);
const capture = (...args) => args;

const ARG = { tg: 4, md: 5, pl: 6, mood: 14, desc: 15 };
const pending = new Set(Object.keys(fixes));

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trimStart().startsWith('g(')) continue;
  let args;
  try {
    args = new Function('g', `return ${line.trim().replace(/,\s*$/, '')}`)(capture);
  } catch {
    continue;
  }
  const slug = Object.keys(fixes).find((s) => titleBySlug[s] === args[0]);
  if (!slug) continue;
  const fix = fixes[slug];
  for (const [field, idx] of Object.entries(ARG)) if (fix[field]) args[idx] = fix[field];
  const extra = { ...(args[16] || {}) };
  if (fix.about) extra.about = fix.about;
  if (fix.feats) extra.feats = fix.feats;
  const date = /(\d{4})-(\d{2})-(\d{2})/.exec(extra.ratingSource?.ru || '');
  if (date) {
    extra.ratingSource = {
      ru: `Рекомендации игроков Steam, снимок ${date[3]}.${date[2]}.${date[1]}`,
      en: `Steam player recommendations, snapshot ${date[1]}-${date[2]}-${date[3]}`,
    };
  }
  args[16] = extra;
  const indent = line.match(/^\s*/)[0];
  lines[i] = `${indent}g(${args.map((a) => JSON.stringify(a)).join(', ')}),`;
  pending.delete(slug);
}

writeFileSync(resolve(partPath), lines.join(eol));
console.log(`Исправлено записей: ${Object.keys(fixes).length - pending.size} из ${Object.keys(fixes).length}`);
if (pending.size) {
  console.log(`Не найдены: ${[...pending].join(', ')}`);
  process.exit(1);
}
