#!/usr/bin/env node
/** Печатает результат резолвера обложек аннотациями GitHub Actions.
 *
 * Используется в CI, когда пуш в ветку из воркфлоу недоступен (токен только на
 * чтение): аннотации читаются через API чек-рана, и маппинг вкатывается коммитом
 * снаружи (см. tools/collect-cover-data.mjs).
 *
 *   node tools/emit-cover-data.mjs [tools/cover-review.log]
 *
 * Формат строк-аннотаций:
 *   covers-b64 [i/n]: <база64-кусок JSON всего STEAM_COVERS>
 *   covers-meta: N записей, M чанков, K байт
 *   covers-check: slug slug …            (кандидатов было >1 — проверить)
 *   cover-review: MISS …                 (не найдено — нужны оверрайды)
 */
import { readFile } from 'node:fs/promises';
import { STEAM_COVERS } from '../js/catalog/steam-covers.js';

const logPath = process.argv[2];

// Полный маппинг сериализуем целиком (включая не-Steam оверрайды без steamId),
// чтобы снаружи можно было восстановить файл 1-в-1.
const json = JSON.stringify(STEAM_COVERS);
const b64 = Buffer.from(json, 'utf8').toString('base64');
const CHUNK = 20000;
const chunks = [];
for (let i = 0; i < b64.length; i += CHUNK) chunks.push(b64.slice(i, i + CHUNK));
chunks.forEach((c, i) => {
  console.log(`::notice::covers-b64 [${i + 1}/${chunks.length}]: ${c}`);
});
console.log(`::notice::covers-meta: ${Object.keys(STEAM_COVERS).length} записей, ${chunks.length} чанков, ${b64.length} байт b64`);

let log = '';
if (logPath) { try { log = await readFile(logPath, 'utf8'); } catch { /* лога может не быть */ } }
const checks = log.split('\n').filter((l) => l.startsWith('CHECK')).map((l) => l.split(' ')[1]);
if (checks.length) {
  console.log(`::notice::covers-check: ${checks.join(' ')}`);
}
for (const line of log.split('\n')) {
  if (line.startsWith('MISS') || line.startsWith('ERROR')) {
    console.log(`::notice::cover-review: ${line}`);
  }
}
