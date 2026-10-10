#!/usr/bin/env node
/**
 * IndexNow: сообщить Яндексу и Bing, что страницы сайта обновились.
 * Без аккаунтов и ключей API — протокол открытый: поисковик проверяет, что
 * файл /<ключ>.txt лежит на нашем домене, и ставит адреса в очередь на обход.
 *
 *   node tools/indexnow.mjs                 # все адреса из dist/sitemap.xml
 *   node tools/indexnow.mjs --dry-run       # только показать, что будет отправлено
 *   node tools/indexnow.mjs /game/hades /   # отдельные страницы
 *
 * Запускается в деплое (.github/workflows/deploy.yml) после проверки продакшена.
 * Ошибка отправки деплой не роняет: индексация — не критичный путь.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');
const explicit = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// Ключ — имя файла <32 hex>.txt в корне репозитория (сборка копирует его в dist/)
const keyFile = readdirSync(root).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
  console.log('IndexNow: файла ключа нет в корне репозитория — пропускаю.');
  process.exit(0);
}
const key = readFileSync(join(root, keyFile), 'utf8').trim();

const { SITE } = await import('../js/config.js');
const site = new URL(SITE.url);
const host = site.host;

let urls;
if (explicit.length) {
  urls = explicit.map((p) => new URL(p, site).href);
} else {
  const sitemapPath = join(root, 'dist', 'sitemap.xml');
  if (!existsSync(sitemapPath)) {
    console.log('IndexNow: нет dist/sitemap.xml — сначала npm run build.');
    process.exit(0);
  }
  urls = [...readFileSync(sitemapPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
urls = urls.filter((u) => new URL(u).host === host);

console.log(`IndexNow: ${urls.length} адресов для ${host}${dryRun ? ' (dry run)' : ''}`);
if (dryRun || !urls.length) process.exit(0);

// Один запрос на общий эндпоинт достаточно: участники протокола обмениваются адресами.
// Яндекс отправляем отдельно — это основной поисковик аудитории сайта.
const endpoints = ['https://yandex.com/indexnow', 'https://api.indexnow.org/indexnow'];
const body = JSON.stringify({ host, key, keyLocation: `${site.origin}/${keyFile}`, urlList: urls.slice(0, 10000) });

let ok = 0;
for (const endpoint of endpoints) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body,
      signal: AbortSignal.timeout(20000),
    });
    // 200/202 — принято; 422 — адреса не с этого хоста; 403 — ключ не найден на сайте
    console.log(`  ${endpoint}: HTTP ${res.status}`);
    if (res.status === 200 || res.status === 202) ok += 1;
  } catch (error) {
    console.log(`  ${endpoint}: ошибка сети (${error.message})`);
  }
}
if (!ok) console.log('::warning::IndexNow не принял адреса — индексация пойдёт обычным обходом по sitemap.');
