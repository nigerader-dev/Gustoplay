#!/usr/bin/env node
/**
 * Вкатывает полные описания (about) и буллеты (feats) в part-файл каталога.
 * Контент батча лежит в tools/content/part-<x>.mjs (массив записей).
 * Существующие данные не трогаются — поля дописываются в конец записи.
 *
 *   node tools/apply-content.mjs a
 *
 * Поддерживает оба формата: объектные записи (part-a..d) и однострочные
 * вызовы g(...) (part-e..i, с объектом доп. полей и без него).
 * Повторный запуск идемпотентен: запись с уже заполненным about пропускается.
 */
import { readFile, writeFile } from 'node:fs/promises';

const letter = process.argv[2];
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
    if (!src.slice(tIdx, endIdx).includes('about:')) {
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
  if (line.includes('about:')) continue; // уже заполнено

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
console.log(`part-${letter}: добавлено описаний ${applied} (в батче ${content.length})`);
if (problems.length) {
  console.warn('Проблемы:');
  problems.forEach((m) => console.warn(`  • ${m}`));
  process.exit(1);
}
