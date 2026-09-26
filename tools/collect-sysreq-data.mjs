#!/usr/bin/env node
/**
 * Забирает собранные требования к ПК из аннотаций прогона GitHub Actions
 * и записывает их в js/catalog/sysreq.js (см. .github/workflows/sysreq.yml,
 * tools/emit-sysreq-data.mjs).
 *
 *   node tools/collect-sysreq-data.mjs <run-id>
 *
 * Нужен `gh` с доступом к api.github.com. Если прогон смог закоммитить данные сам,
 * этот шаг не нужен — файл уже в ветке.
 */
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { renderSysreqFile } from './sysreq-format.mjs';

const runId = process.argv[2];
if (!runId) {
  console.error('Использование: node tools/collect-sysreq-data.mjs <run-id>');
  process.exit(1);
}

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8' });
const repo = JSON.parse(gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.']));

const run = JSON.parse(gh(['run', 'view', runId, '--json', 'jobs', '-q', '.']));
const job = run.jobs.find((j) => /требовани|sysreq|resolve/i.test(j.name)) || run.jobs[0];
if (!job) {
  console.error('У прогона нет джобов — нечего читать.');
  process.exit(1);
}

const annotations = [];
for (let page = 1; ; page += 1) {
  const chunk = JSON.parse(gh(['api', `repos/${repo.nameWithOwner}/check-runs/${job.databaseId}/annotations?per_page=100&page=${page}`]));
  annotations.push(...chunk);
  if (chunk.length < 100) break;
}

const chunks = annotations
  .filter((a) => a.message.startsWith('sysreq-b64'))
  .map((a) => ({ idx: Number(a.message.match(/\[(\d+)\//)[1]), data: a.message.split(': ').slice(1).join(': ').trim() }))
  .sort((a, b) => a.idx - b.idx);

if (!chunks.length) {
  console.error('Аннотации sysreq-b64 не найдены — прогон ещё идёт, упал до доставки или закоммитил данные сам.');
  process.exit(1);
}

const meta = annotations.find((a) => a.message.startsWith('sysreq-meta'))?.message;
const data = JSON.parse(Buffer.from(chunks.map((c) => c.data).join(''), 'base64').toString('utf8'));
console.log(meta || `чанков: ${chunks.length}`);

await writeFile(new URL('../js/catalog/sysreq.js', import.meta.url), renderSysreqFile(data));
console.log(`Записано ${Object.keys(data).length} записей в js/catalog/sysreq.js`);

for (const a of annotations.filter((x) => x.message.startsWith('sysreq-review'))) {
  console.log(`  • ${a.message.replace('sysreq-review: ', '')}`);
}
