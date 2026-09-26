#!/usr/bin/env node
/**
 * Вкатывает полные описания (about) и буллеты (feats) в part-файл каталога.
 * Контент батча лежит в tools/content/part-<x>.mjs (массив записей).
 * Существующие данные не трогаются — поля дописываются в конец записи.
 *
 *   node tools/apply-content.mjs a
 *   node tools/apply-content.mjs a --force   # перезаписать существующие about/feats
 *                                           # значениями из файла контента (для правок текста)
 *
 * Поддерживает оба формата: объектные записи (part-a..d) и однострочные
 * вызовы g(...) (part-e..i, с объектом доп. полей и без него).
 * Повторный запуск идемпотентен: запись с уже заполненным about пропускается.
 */
import { readFile, writeFile } from 'node:fs/promises';

const letter = process.argv[2];
const FORCE = process.argv.includes('--force');
if (!letter || !/^[a-i]$/.test(letter)) {
  console.error('Использование: node tools/apply-content.mjs <a..i>');
  process.exit(1);
}

const partPath = new URL(`../js/catalog/part-${letter}.js`, import.meta.url);
const contentPath = new URL(`./content/part-${letter}.mjs`, import.meta.url);

const { default: content } = await import(contentPath);
let src = await readFile(partPath, 'utf8');

const js = (v) => JSON.stringify(v);
let applied = 0;
const problems = [];


/**
 * Границы значения поля в исходнике записи: `about: {…}` / `feats: {…}`.
 * Считаем вложенность скобок и не трогаем то, что внутри строк — иначе описание
 * с фигурной скобкой в тексте ломало бы разбор.
 */
function fieldRange(text, field) {
  const key = text.indexOf(`${field}: `);
  if (key < 0) return null;
  let i = key + field.length + 2;
  while (i < text.length && /\s/.test(text[i])) i++;
  const open = text[i];
  if (open !== '{' && open !== '[') return null;
  const close = open === '{' ? '}' : ']';
  let depth = 0; let inStr = false; let quote = ''; let esc = false;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = true; quote = c; continue; }
    if (c === open) depth += 1;
    else if (c === close) {
      depth -= 1;
      if (!depth) return { start: i, end: j + 1 };
    }
  }
  return null;
}

/** Перезаписать about/feats значениями из файла контента (режим --force) */
function overwrite(region, entry) {
  let out = region;
  for (const [field, value] of [['about', js(entry.about)], ['feats', js(entry.feats)]]) {
    const range = fieldRange(out, field);
    if (!range) return null;
    out = out.slice(0, range.start) + value + out.slice(range.end);
  }
  return out;
}

for (const entry of content) {
  if (!entry.title || !entry.about?.ru || !entry.about?.en || !entry.feats?.ru?.length || !entry.feats?.en?.length) {
    problems.push(`${entry.slug}: неполный контент (about/feats)`);
    continue;
  }
  const A = js(entry.about);
  const F = js(entry.feats);

  // 1) объектный формат: `t: 'Название',` … конец записи `\n  },`
  //    (названия с апострофом в исходнике в двойных кавычках)
  let tIdx = src.indexOf(`t: '${entry.title}',`);
  if (tIdx < 0) tIdx = src.indexOf(`t: "${entry.title}",`);
  if (tIdx >= 0) {
    const endIdx = src.indexOf('\n  },', tIdx);
    if (endIdx < 0) { problems.push(`${entry.slug}: не найден конец записи`); continue; }
    const region = src.slice(tIdx, endIdx);
    if (FORCE && region.includes('about:')) {
      const updated = overwrite(region, entry);
      if (!updated) { problems.push(`${entry.slug}: не удалось разобрать about/feats`); continue; }
      src = src.slice(0, tIdx) + updated + src.slice(endIdx);
      applied += 1;
    } else if (!region.includes('about:')) {
      src = src.slice(0, endIdx) + `\n    about: ${A},\n    feats: ${F},` + src.slice(endIdx);
      applied += 1;
    }
    continue;
  }

  // 2) g()-формат: однострочный вызов, название — первый аргумент
  //    (названия с апострофом в исходнике в двойных кавычках)
  let gIdx = src.indexOf(`g('${entry.title.replace(/'/g, "\\'")}',`);
  if (gIdx < 0) gIdx = src.indexOf(`g('${entry.title}',`);
  if (gIdx < 0) gIdx = src.indexOf(`g("${entry.title}",`);
  if (gIdx < 0) { problems.push(`${entry.slug}: запись не найдена в part-${letter}`); continue; }
  const lineEnd = src.indexOf('\n', gIdx);
  const lineStart = src.lastIndexOf('\n', gIdx) + 1;
  const line = src.slice(lineStart, lineEnd);
  if (line.includes('about:')) {
    if (!FORCE) continue;                     // уже заполнено
    const updated = overwrite(line, entry);
    if (!updated) { problems.push(`${entry.slug}: не удалось разобрать about/feats`); continue; }
    src = src.slice(0, lineStart) + updated + src.slice(lineEnd);
    applied += 1;
    continue;
  }

  let newLine;
  if (/}, \{/.test(line)) {
    // объект доп. полей есть: дописываем about/feats внутрь него
    newLine = line.replace(/ \}\),?\s*$/, `, about: ${A}, feats: ${F} }),`);
  } else {
    // доп. объекта нет: создаём его перед закрывающей скобкой
    newLine = line.replace(/\}\),?\s*$/, `}, { about: ${A}, feats: ${F} }),`);
  }
  if (newLine === line) { problems.push(`${entry.slug}: не удалось вставить поля`); continue; }
  src = src.slice(0, lineStart) + newLine + src.slice(lineEnd);
  applied += 1;
}

await writeFile(partPath, src);
console.log(`part-${letter}: ${FORCE ? 'перезаписано' : 'добавлено'} описаний ${applied} (в батче ${content.length})`);
if (problems.length) {
  console.warn('Проблемы:');
  problems.forEach((m) => console.warn(`  • ${m}`));
  process.exit(1);
}
