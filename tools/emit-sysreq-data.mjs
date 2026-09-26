#!/usr/bin/env node
/**
 * Печатает собранные требования к ПК аннотациями GitHub Actions.
 *
 * Зачем: пуш в ветку из воркфлоу может быть недоступен (токен только на чтение).
 * Тогда данные забирает tools/collect-sysreq-data.mjs через API чек-рана —
 * тем же способом, что и обложки (см. tools/emit-cover-data.mjs).
 *
 *   node tools/emit-sysreq-data.mjs [tools/sysreq-review.txt]
 *
 * Ограничение GitHub: одна аннотация несёт до ~4 КБ текста, поэтому JSON режется
 * на куски по 3000 символов — мелкие куски надёжнее крупных.
 */
import { readFile } from 'node:fs/promises';
import { SYSREQ } from '../js/catalog/sysreq.js';

const logPath = process.argv[2];
const CHUNK = 3000;

const json = JSON.stringify(SYSREQ);
const b64 = Buffer.from(json, 'utf8').toString('base64');
const chunks = [];
for (let i = 0; i < b64.length; i += CHUNK) chunks.push(b64.slice(i, i + CHUNK));
chunks.forEach((c, i) => console.log(`::notice::sysreq-b64 [${i + 1}/${chunks.length}]: ${c}`));
console.log(`::notice::sysreq-meta: ${Object.keys(SYSREQ).length} записей, ${chunks.length} чанков, ${b64.length} байт b64`);

let log = '';
if (logPath) { try { log = await readFile(logPath, 'utf8'); } catch { /* отчёта может не быть */ } }
for (const line of log.split('\n')) {
  if (line.startsWith('MISS') || line.startsWith('LANG') || line.startsWith('Ошибка')) {
    console.log(`::notice::sysreq-review: ${line}`);
  }
}
for (const line of log.split('\n').slice(0, 6)) {
  if (line.trim()) console.log(`::notice::sysreq-report: ${line}`);
}
