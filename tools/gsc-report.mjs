#!/usr/bin/env node
/**
 * Сводка Google Search Console: показы, клики, позиции, запросы, страны и статус
 * индексации ключевых страниц. Только чтение (scope webmasters.readonly).
 *
 *   npm run gsc                      # последние 28 дней
 *   npm run gsc -- --days=7          # за неделю
 *   npm run gsc -- --resubmit        # ещё и переотправить sitemap.xml (нужен scope записи)
 *
 * Ключ сервисного аккаунта — google-sa.json в корне репозитория (в .gitignore, только
 * локально; аккаунт добавлен владельцем ресурса https://gustoplay.ru/ в Search Console).
 * Данные GSC приходят с задержкой 2–3 дня — это нормально.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sign } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const keyFile = resolve(root, 'google-sa.json');
if (!existsSync(keyFile)) {
  console.log('GSC: нет google-sa.json в корне репозитория — пропускаю.');
  process.exit(0);
}
const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? def;
const days = Number(arg('days', 28));
const resubmit = process.argv.includes('--resubmit');
const SITE = 'https://gustoplay.ru/';
const KEY_PAGES = ['/', '/en/', '/podborki', '/razdely', '/top/koop-igry-na-pk', '/genre/stealth', '/game/helldivers-2', '/en/game/helldivers-2'];

const sa = JSON.parse(readFileSync(keyFile, 'utf8'));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
async function token(scope) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const jwt = `${unsigned}.${sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key).toString('base64url')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`GSC: не удалось получить токен — ${JSON.stringify(data)}`);
  return data.access_token;
}

const scope = resubmit ? 'https://www.googleapis.com/auth/webmasters' : 'https://www.googleapis.com/auth/webmasters.readonly';
const H = { authorization: `Bearer ${await token(scope)}`, 'content-type': 'application/json' };
const site = encodeURIComponent(SITE);
const api = `https://www.googleapis.com/webmasters/v3/sites/${site}`;
const day = (offset) => new Date(Date.now() - offset * 864e5).toISOString().slice(0, 10);
const query = async (body) => (await (await fetch(`${api}/searchAnalytics/query`, {
  method: 'POST', headers: H, body: JSON.stringify({ startDate: day(days + 2), endDate: day(0), rowLimit: 1000, ...body }),
})).json()).rows || [];
const fmt = (r) => `${r.clicks} кл · ${r.impressions} пок · поз. ${r.position.toFixed(1)}`;

console.log(`\nGoogle Search Console — ${SITE}, ${day(days + 2)} … ${day(0)}\n`);
const [total] = await query({});
console.log(`Итого: ${total ? fmt(total) : 'данных нет'}`);

const byDate = await query({ dimensions: ['date'] });
if (byDate.length) console.log(`По дням (показы): ${byDate.map((r) => `${r.keys[0].slice(5)}:${r.impressions}`).join(' ')}`);

console.log('\nСтраны:');
for (const r of (await query({ dimensions: ['country'] })).sort((a, b) => b.impressions - a.impressions).slice(0, 8)) console.log(`  ${r.keys[0]} — ${fmt(r)}`);

console.log('\nТоп запросов по показам:');
const queries = (await query({ dimensions: ['query'] })).sort((a, b) => b.impressions - a.impressions);
for (const r of queries.slice(0, 20)) console.log(`  ${r.keys[0]} — ${fmt(r)}`);

// «Почти в топе»: позиции 8–20 — кандидаты на доработку страницы (текст, заголовок)
const near = queries.filter((r) => r.position >= 8 && r.position <= 20 && r.impressions >= 3);
if (near.length) {
  console.log('\nПочти в топе (поз. 8–20, ≥3 показов) — доработать страницы:');
  for (const r of near.slice(0, 15)) console.log(`  ${r.keys[0]} — ${fmt(r)}`);
}

const pages = await query({ dimensions: ['page'] });
const slashDupes = pages.filter((r) => /\/[^/]+\/$/.test(r.keys[0]) && !r.keys[0].endsWith('/en/')).length;
console.log(`\nСтраниц с показами: ${pages.length}; из них адресов со слэшем на конце (старые дубли): ${slashDupes}`);

console.log('\nSitemap:');
const sm = await (await fetch(`${api}/sitemaps`, { headers: H })).json();
for (const s of sm.sitemap || []) {
  const c = s.contents?.[0] || {};
  console.log(`  ${s.path}: отправлено ${c.submitted ?? '?'}, проиндексировано ${c.indexed ?? '?'}, скачан ${s.lastDownloaded || '—'}, ошибок ${s.errors}`);
}
if (resubmit) {
  const res = await fetch(`${api}/sitemaps/${encodeURIComponent(`${SITE}sitemap.xml`)}`, { method: 'PUT', headers: H });
  console.log(`  переотправка sitemap.xml: ${res.status === 200 || res.status === 204 ? 'готово' : `ошибка ${res.status}`}`);
}

console.log('\nИндексация ключевых страниц:');
for (const path of KEY_PAGES) {
  const url = new URL(path.replace(/^\//, ''), SITE).href;
  const res = await (await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST', headers: H, body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
  })).json();
  const x = res.inspectionResult?.indexStatusResult;
  console.log(x
    ? `  ${path} — ${x.coverageState}${x.lastCrawlTime ? `, обход ${x.lastCrawlTime.slice(0, 10)}` : ''}${x.googleCanonical && x.googleCanonical !== url ? `, канон Google: ${x.googleCanonical}` : ''}`
    : `  ${path} — ошибка: ${res.error?.message || 'нет данных'}`);
}
