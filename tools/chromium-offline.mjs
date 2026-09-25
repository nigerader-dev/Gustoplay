#!/usr/bin/env node
/**
 * Chrome для визуального QA там, где обычный путь недоступен.
 *
 * Обычный путь — `npm i -D puppeteer && npx puppeteer browsers install chrome`:
 * puppeteer тянет браузер с storage.googleapis.com. В закрытой среде (песочница,
 * корпоративный прокси, где разрешён только npm-реестр) этот домен не отвечает,
 * и `npm run test:visual` молча уходит в SKIP.
 *
 * Здесь браузер берётся из npm-пакета @sparticuz/chromium (бинарь внутри тарбола,
 * реестр — единственный нужный хост). Пакет собран под AWS Lambda, поэтому
 * отдельно распаковываем его бандл системных библиотек (al2023.tar.br) и
 * подсказываем LD_LIBRARY_PATH: на Debian/Ubuntu не хватает libnss3/libnspr4.
 *
 * Запуск:
 *   node tools/chromium-offline.mjs            — подготовить браузер и напечатать команду
 *   node tools/chromium-offline.mjs --run      — подготовить и сразу прогнать test:visual
 *   node tools/chromium-offline.mjs --run -- --widths=360,768 --shots=all
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { spawnSync, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

const binDir = join(tmpdir(), 'gustoplay-qa-bin');
const libRoot = join(tmpdir(), 'gustoplay-qa-lib');
const libDir = join(libRoot, 'lib'); // в тарболе библиотеки лежат в lib/
const chromePath = join(binDir, 'chromium');

/* --- 1. пакет с браузером (ставим при необходимости) --- */
let sparticuz;
try {
  sparticuz = (await import('@sparticuz/chromium')).default;
} catch {
  console.log('• @sparticuz/chromium не установлен — ставлю из npm (--no-save, package.json не меняется)…');
  const install = spawnSync('npm', ['i', '--no-save', '@sparticuz/chromium'], { stdio: 'inherit' });
  if (install.status !== 0) {
    console.error('❌ Не удалось поставить @sparticuz/chromium. Проверьте доступ к npm-реестру.');
    process.exit(1);
  }
  sparticuz = (await import('@sparticuz/chromium')).default;
}
const srcDir = join(dirname(new URL(import.meta.resolve('@sparticuz/chromium')).pathname), '..', 'bin');

/** Минимальный разбор tar: нужны только имена и содержимое обычных файлов */
function untar(buffer, dest) {
  const files = [];
  for (let offset = 0; offset + 512 <= buffer.length;) {
    const name = buffer.toString('utf8', offset, offset + 100).replace(/\0.*$/, '');
    if (!name) break;
    const size = parseInt(buffer.toString('utf8', offset + 124, offset + 136).replace(/\0.*$/, '').trim() || '0', 8);
    const dataStart = offset + 512;
    if (name.endsWith('/')) { offset = dataStart + Math.ceil(size / 512) * 512; continue; }
    const target = join(dest, name);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, buffer.subarray(dataStart, dataStart + size));
    files.push(target);
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return files;
}

/* --- 2. бинарь браузера --- */
mkdirSync(binDir, { recursive: true });
if (!existsSync(chromePath)) {
  console.log('• Распаковываю Chromium из npm-пакета…');
  writeFileSync(chromePath, brotliDecompressSync(readFileSync(join(srcDir, 'chromium.br'))));
  chmodSync(chromePath, 0o755);
}
console.log(`• Браузер: ${chromePath}`);

/* --- 3. системные библиотеки (libnss3 и прочее) --- */
mkdirSync(libRoot, { recursive: true });
const libs = untar(brotliDecompressSync(readFileSync(join(srcDir, 'al2023.tar.br'))), libRoot);
console.log(`• Библиотеки: ${libDir} (${libs.length} файлов)`);

const env = { ...process.env, LD_LIBRARY_PATH: libDir, PUPPETEER_EXECUTABLE_PATH: chromePath };
const manual = `LD_LIBRARY_PATH=${libDir} PUPPETEER_EXECUTABLE_PATH=${chromePath} npm run test:visual`;

if (!process.argv.includes('--run')) {
  console.log('\nГотово. Запуск визуального QA:\n  ' + manual);
  process.exit(0);
}

const extra = process.argv.slice(process.argv.indexOf('--') + 1).filter((a) => a !== '--');
console.log(`\n▶ npm run test:visual${extra.length ? ` — ${extra.join(' ')}` : ''}\n`);
const run = spawnSync('npm', ['run', 'test:visual', ...(extra.length ? ['--', ...extra] : [])], { env, stdio: 'inherit' });
process.exit(run.status ?? 1);
