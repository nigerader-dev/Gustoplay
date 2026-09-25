/**
 * Аудит типов в каталоге: ловит сдвиги позиционных аргументов (когда числовое поле
 * оказывается массивом или наоборот). Запускать после массовых правок данных.
 *
 * Быстрая проверка правил каталога и покрытия — tools/check-catalog.mjs,
 * этот скрипт — «глубокая» проверка формы записи.
 */
import { PART_A } from '../js/catalog/part-a.js';
import { PART_B } from '../js/catalog/part-b.js';
import { PART_C } from '../js/catalog/part-c.js';
import { PART_D } from '../js/catalog/part-d.js';
import { PART_E } from '../js/catalog/part-e.js';
import { PART_F } from '../js/catalog/part-f.js';
import { PART_G } from '../js/catalog/part-g.js';
import { PART_H } from '../js/catalog/part-h.js';
import { PART_I } from '../js/catalog/part-i.js';

const parts = { A: PART_A, B: PART_B, C: PART_C, D: PART_D, E: PART_E, F: PART_F, G: PART_G, H: PART_H, I: PART_I };

const rules = [
  ['t', (v) => typeof v === 'string' && v.length > 1],
  ['y', (v) => Number.isInteger(v) && v > 1970 && v < 2030],
  ['dev', (v) => typeof v === 'string' && v.length > 1],
  ['gr', (v) => Array.isArray(v) && v.length > 0],
  ['tg', (v) => Array.isArray(v) && v.length > 0],
  ['md', (v) => Array.isArray(v) && v.length > 0],
  ['pl', (v) => Array.isArray(v) && v.length === 2],
  ['pf', (v) => Array.isArray(v) && v.length > 0],
  ['pr', (v) => typeof v === 'string'],
  ['pv', (v) => typeof v === 'number'],
  ['len', (v) => Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'number')],
  ['dif', (v) => Number.isInteger(v) && v >= 1 && v <= 5],
  ['pace', (v) => Number.isInteger(v) && v >= 1 && v <= 5],
  ['rat', (v) => Number.isInteger(v) && v >= 20 && v <= 100],
  ['mood', (v) => Array.isArray(v) && v.length > 0],
];

let problems = 0;
for (const [name, list] of Object.entries(parts)) {
  for (const game of list) {
    const bad = rules.filter(([key, ok]) => !ok(game[key])).map(([key]) => `${key}=${JSON.stringify(game[key])}`);
    if (bad.length) {
      problems += 1;
      console.log(`part-${name} · ${game.t || '(без названия)'}: ${bad.join(' ')}`);
    }
    if (!game.desc?.ru || !game.desc?.en) {
      problems += 1;
      console.log(`part-${name} · ${game.t}: нет описания`);
    }
  }
}

const total = Object.values(parts).reduce((sum, list) => sum + list.length, 0);
console.log(`Проверено записей: ${total}`);
console.log(problems ? `❌ Проблем: ${problems}` : '✅ Все записи корректны');
process.exit(problems ? 1 : 0);
