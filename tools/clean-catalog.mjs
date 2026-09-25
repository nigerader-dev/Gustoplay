/**
 * Утилита разработчика для каталога:
 *  1) вычищает случайные выражения вида 'x' in {} ? '' : 'tag' и 'x' === '' ? '' : 'tag';
 *  2) из массивов tg убирает id, которые на самом деле режимы/жанры/платформы (там должны быть только теги).
 * Запуск: node tools/clean-catalog.mjs (после массового редактирования файлов каталога).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { GENRES, TAGS, MODES, PLATFORMS } from '../js/taxonomy.js';

const files = ['js/catalog/part-a.js', 'js/catalog/part-b.js', 'js/catalog/part-c.js', 'js/catalog/part-d.js',
  'js/catalog/part-e.js', 'js/catalog/part-f.js', 'js/catalog/part-g.js', 'js/catalog/part-h.js', 'js/catalog/part-i.js'];
const patterns = [
  // общий случай: 'условие' === '' ? 'что-то' : 'результат' → 'результат'
  /('[^']*'|[a-z][a-zA-Z0-9]*)\s*===\s*''\s*\?\s*'[^']*'\s*:\s*('[a-zA-Z0-9]+')/g,
  /('[^']*'|[a-z]+)\s*in\s*\{\}\s*\?\s*''\s*:\s*('[a-zA-Z0-9]+')/g,
  /('[a-zA-Z0-9]+'|[a-z]+)\s*===\s*''\s*\?\s*''\s*:\s*('[a-zA-Z0-9]+')/g,
];

for (const file of files) {
  let src = readFileSync(file, 'utf8');
  const original = src;

  for (let pass = 0; pass < 6; pass++) {
    const before = src;
    for (const re of patterns) src = src.replace(re, '$2');
    if (src === before) break;
  }

  src = src.replace(/tg: \[([^\]]*)\]/g, (_m, body) => {
    const items = body.split(',').map((s) => s.trim()).filter(Boolean);
    const keep = items.filter((item) => {
      const id = item.replace(/['"]/g, '');
      return TAGS[id] && !MODES[id] && !GENRES[id] && !PLATFORMS[id];
    });
    return `tg: [${keep.join(', ')}]`;
  });

  writeFileSync(file, src);
  const junk = src.split('\n').filter((l) => /in \{\}|=== ''/.test(l)).length;
  console.log(`${file}: ${src === original ? 'без изменений' : 'обновлён'}${junk ? `, ОСТАЛОСЬ мусора: ${junk}` : ''}`);
}
