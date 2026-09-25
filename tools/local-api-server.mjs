#!/usr/bin/env node
/**
 * Локальный сервер GustoPlay: сайт + настоящий API аккаунтов.
 *
 * Зачем нужен:
 *   • локальная разработка и предпросмотр ровно в том виде, в каком сайт уедет на хостинг;
 *   • аккаунты работают по-настоящему: регистрация, вход, смена и сброс пароля,
 *     синхронизация профиля вкуса между устройствами;
 *   • данные лежат в файле .data/gustoplay.sqlite и переживают перезапуск.
 *
 * Технически: тот же код, что и в продакшене (worker/index.js), но база — локальный
 * SQLite вместо Cloudflare D1, а вместо Resend письмо со ссылкой сброса печатается в лог.
 *
 * Запуск:
 *   node --experimental-sqlite tools/local-api-server.mjs --dir=dist
 *   PORT=5174 node --experimental-sqlite tools/local-api-server.mjs            (папка сайта)
 */
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReloader, injectReload } from './live-reload.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const explicitDir = process.argv.find((a) => a.startsWith('--dir='))?.slice(6);
const siteRoot = resolve(projectRoot, explicitDir || '.');
// Live reload — только при разработке из корня проекта, для dist/ выключен (там прод).
const live = !process.argv.includes('--no-reload') && (!explicitDir || process.argv.includes('--reload'));
const reloader = live ? createReloader({ root: siteRoot }) : null;
const port = Number(process.env.PORT || 5173);
const host = '0.0.0.0';
const dataDir = join(projectRoot, '.data');
const dbPath = process.env.GUSTOPLAY_DB || join(dataDir, 'gustoplay.sqlite');

mkdirSync(dataDir, { recursive: true });

const worker = (await import(new URL('../worker/index.js', import.meta.url).href)).default;

/* ------------------------------ база ------------------------------ */

const sqlite = new DatabaseSync(dbPath);
sqlite.exec(readFileSync(join(projectRoot, 'worker/schema.sql'), 'utf8'));

/** D1-совместимый фасад поверх node:sqlite */
const DB = {
  prepare(sql) {
    const params = [];
    const self = {
      bind: (...values) => { params.push(...values); return self; },
      first: () => { const row = sqlite.prepare(sql).get(...params); return row ? Object.assign({}, row) : null; },
      run: () => { const r = sqlite.prepare(sql).run(...params); return { ok: true, changes: Number(r.changes || 0) }; },
      all: () => ({ results: sqlite.prepare(sql).all(...params).map((r) => Object.assign({}, r)) }),
    };
    return self;
  },
};

const env = {
  DB,
  ALLOWED_ORIGINS: 'http://localhost:5173',   // подменяется на Origin каждого запроса → удобно в превью
  MIN_PASSWORD_LENGTH: process.env.MIN_PASSWORD_LENGTH || '10',
  SITE_URL: process.env.SITE_URL || `http://localhost:${port}`,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  TURNSTILE_SECRET: process.env.TURNSTILE_SECRET || '',
  RESEND_API_KEY: '',                          // писем нет: ссылка сброса печатается в лог
  MAIL_FROM: 'GustoPlay <no-reply@localhost>',
  ALLOW_RESET_DEBUG: 'true',                   // в ответе придёт ссылка сброса — удобно для проверки
};

/* ------------------------- заглушка Resend ------------------------- */

let resetLinks = 0;
globalThis.fetch = async (url, options = {}) => {
  const href = String(url);
  if (href.includes('api.resend.com')) {
    const body = (() => { try { return JSON.parse(options.body || '{}'); } catch { return {}; } })();
    const text = JSON.stringify(body);
    const link = (text.match(/https?:\/\/[^"\\\s]*reset=[A-Za-z0-9_-]+/) || [])[0];
    resetLinks += 1;
    console.log(`\n📧 [письмо #${resetLinks}] кому: ${(body.to || '—')}`);
    console.log(`   тема: ${(body.subject || '').slice(0, 80)}`);
    if (link) console.log(`   ссылка сброса пароля: ${link}\n`);
    return new Response(JSON.stringify({ id: `local-${resetLinks}` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (href.includes('googleapis.com/oauth2')) {
    return new Response(JSON.stringify({ keys: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (href.includes('challenges.cloudflare.com')) {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
};

/* --------------------------- статика --------------------------- */

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.map': 'application/json; charset=utf-8',
};

const send = (res, code, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
};

const serveFile = (res, file) => {
  const ext = extname(file).toLowerCase();
  if (reloader && ext === '.html') {
    return send(res, 200, injectReload(readFileSync(file, 'utf8')), MIME['.html']);
  }
  const noCache = ext === '.html' || (reloader && (ext === '.js' || ext === '.mjs' || ext === '.css'));
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': noCache ? 'no-store' : 'public, max-age=60',
    'Content-Length': statSync(file).size,
  });
  createReadStream(file).pipe(res);
};

/* ---------------------------- сервер ---------------------------- */

const server = http.createServer(async (req, res) => {
  if (reloader?.handle(req, res)) return;
  const url = new URL(req.url, `http://localhost:${port}`);
  const origin = req.headers.origin || `http://localhost:${port}`;

  // API отдаёт тот же воркер, что и в продакшене.
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    const headers = { ...req.headers, origin, 'cf-connecting-ip': req.headers['cf-connecting-ip'] || '127.0.0.1' };
    const body = await new Promise((done) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => done(Buffer.concat(chunks)));
    });

    const request = new Request(`http://localhost:${port}${req.url}`, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
    });

    // Origin всегда «свой»: локальный предпросмотр доступен с любого адреса превью.
    // Адрес сайта берём из запроса, чтобы ссылки в письмах вели туда, откуда пришли.
    const forwarded = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${port}`;
    const siteUrl = /^(localhost|127\.0\.0\.1)/.test(forwarded) ? `http://${forwarded}` : `https://${forwarded}`;
    const response = await worker.fetch(request, { ...env, ALLOWED_ORIGINS: origin, SITE_URL: siteUrl });
    const text = await response.text();
    const out = {};
    response.headers.forEach((value, key) => { out[key] = value; });
    res.writeHead(response.status, out);
    return res.end(text);
  }

  // Статика сайта — как на хостинге.
  let target = normalize(join(siteRoot, decodeURIComponent(url.pathname)));
  if (!target.startsWith(siteRoot)) return send(res, 403, 'Forbidden');

  if (existsSync(target) && statSync(target).isDirectory()) {
    const idx = join(target, 'index.html');
    if (existsSync(idx)) return serveFile(res, idx);
    const items = readdirSync(target).map((f) => `<li><a href="${f}">${f}</a></li>`).join('');
    return send(res, 200, `<!doctype html><meta charset=utf-8><h1>${url.pathname}</h1><ul>${items}</ul>`, MIME['.html']);
  }
  if (existsSync(target) && statSync(target).isFile()) return serveFile(res, target);

  if (extname(target)) {
    const segments = url.pathname.split('/').filter(Boolean);
    for (let i = 1; i < segments.length; i++) {
      const candidate = normalize(join(siteRoot, ...segments.slice(i)));
      if (candidate.startsWith(siteRoot) && existsSync(candidate) && statSync(candidate).isFile()) return serveFile(res, candidate);
    }
  }

  const fallback = join(siteRoot, 'index.html');
  if (existsSync(fallback)) return serveFile(res, fallback);
  return send(res, 404, 'Not found');
});

server.listen(port, host, () => {
  console.log(`GustoPlay (сайт + API аккаунтов) → http://${host}:${port}`);
  console.log(`   статика:  ${siteRoot}${reloader ? '  (live reload: ON)' : ''}`);
  console.log(`   база:     ${dbPath}`);
  console.log(`   проверить: http://${host}:${port}/api/health`);
  if (env.ALLOW_RESET_DEBUG === 'true') {
    console.log('   почта выключена: ссылка сброса пароля печатается здесь же в логе.');
  }
});
