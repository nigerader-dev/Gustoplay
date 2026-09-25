#!/usr/bin/env node
/**
 * GustoPlay → Cloudflare: развёртывание одной командой.
 *
 * Что делает (каждый шаг идемпотентен — повторный запуск безопасен):
 *   1) проверяет окружение (токен, аккаунт, wrangler);
 *   2) находит или создаёт базу D1 gustoplay и прописывает её id в worker/wrangler.toml;
 *   3) применяет схему базы;
 *   4) проверяет домен в Cloudflare и добавляет зону, если её ещё нет (NS печатается в лог);
 *      настраивает маршрут /api/*, Turnstile, домен для Pages;
 *   5) собирает сайт с адресом API (/api) и публичным ключом Turnstile;
 *   6) загружает секреты воркера из worker/.dev.vars;
 *   7) публикует API-воркер;
 *   8) публикует сайт в Cloudflare Pages и подключает домен;
 *   9) печатает адреса и то, что осталось включить в панелях (Google, почта, поисковики).
 *
 * Запуск:
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npm run deploy
 *   npm run deploy:check        # проверка готовности: без сети и без публикации
 *
 * Флаги: --check, --no-build (не пересобирать сайт), --skip-turnstile.
 *
 * Токен: панель Cloudflare → My Profile → API Tokens → Create Token.
 * Нужны права: Account → Workers Scripts → Edit, Account → D1 → Edit,
 * Account → Cloudflare Pages → Edit, Zone → DNS → Edit, Zone → Cache Purge (для домена, Turnstile и автоматической очистки edge-кэша).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, appendFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workerDir = join(root, 'worker');
const distDir = join(root, 'dist');
const tomlPath = join(workerDir, 'wrangler.toml');
const devVarsPath = join(workerDir, '.dev.vars');

const checkOnly = process.argv.includes('--check');
const skipBuild = process.argv.includes('--no-build');
const skipTurnstile = process.argv.includes('--skip-turnstile');

const configText = readFileSync(join(root, 'js/config.js'), 'utf8');
const DOMAIN = /domain:\s*'([^']+)'/.exec(configText)?.[1] || '';
const SITE_URL = /url:\s*'(https?:\/\/[^']+)'/.exec(configText)?.[1] || (DOMAIN ? `https://${DOMAIN}` : '');

const DB_NAME = 'gustoplay';
// Имя проекта Pages глобально уникально в *.pages.dev. Если основной кандидат
// занят чужим аккаунтом, создание падает с «unknown error» (код 8000000),
// поэтому берём первый свободный из списка (выбранный запоминается сам: на
// следующих запусках скрипт сперва ищет существующие проекты).
const PAGES_CANDIDATES = ['gustoplay', 'gustoplay-ru'];
let PAGES_PROJECT = '';
const WORKER_NAME = 'gustoplay-api';

let stepNo = 0;
const step = (text) => console.log(`\n${++stepNo}. ${text}`);
const ok = (text) => console.log(`   ✅ ${text}`);
const warn = (text) => console.log(`   ⚠️  ${text}`);
// Ошибки сразу дублируем аннотациями GitHub (::error::): они остаются
// в сводке запуска и видны в интерфейсе Actions даже без скачивания логов.
const bad = (text) => { problems.push(text); console.log(`::error::${text}`); };

const problems = [];
const notes = [];

/* ------------------------------------------------------------------ *
 * Окружение
 * ------------------------------------------------------------------ */

const token = process.env.CLOUDFLARE_API_TOKEN || '';
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const useNpx = process.env.GUSTOPLAY_NO_NPX !== '1';

// Отдельный токен для операций с зонами (необязательно). Нужен, только если
// основному деплой-токену не хватает права «Account → Zones → Edit», а домен
// ещё не добавлен в аккаунт. Если задан и недействителен — используем основной.
let zoneToken = process.env.CLOUDFLARE_ZONE_TOKEN || '';

const devVars = existsSync(devVarsPath) ? readFileSync(devVarsPath, 'utf8') : '';
const parseVars = (text) => {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
};
const secrets = parseVars(devVars);

let toml = existsSync(tomlPath) ? readFileSync(tomlPath, 'utf8') : '';
if (!toml) problems.push('не найден worker/wrangler.toml');

const idMatch = /database_id\s*=\s*"([^"]*)"/.exec(toml);
const placeholder = !idMatch || !idMatch[1] || /ЗАМЕНИТЕ|PLACEHOLDER|your-/i.test(idMatch[1]);
let databaseId = placeholder ? '' : idMatch[1];

const exec = (args, { cwd = root, quiet = false, allowFail = false, input } = {}) => {
  const cmd = useNpx ? 'npx' : 'wrangler';
  const full = useNpx ? ['--yes', 'wrangler@4', ...args] : args;
  if (!quiet) console.log(`   $ ${cmd} ${full.join(' ')}`);
  const res = spawnSync(cmd, full, {
    cwd,
    encoding: 'utf8',
    input,
    env: { ...process.env, CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId, WRANGLER_SEND_METRICS: 'false' },
    stdio: quiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
  });
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  if (res.status !== 0 && !allowFail) {
    console.log(`\n❌ Команда завершилась с ошибкой (код ${res.status}).`);
    if (quiet && (stdout || stderr)) console.log(`${stdout}${stderr}`);
    process.exit(1);
  }
  return { status: res.status, stdout, stderr };
};

/** Прямой вызов Cloudflare API — для домена, DNS и Turnstile. */
const cf = async (path, { method = 'GET', body, bearer } = {}) => {
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      method,
      headers: { Authorization: `Bearer ${bearer || token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: Boolean(data.success), result: data.result, errors: data.errors || [] };
  } catch (error) {
    return { status: 0, ok: false, result: null, errors: [{ message: error.message }] };
  }
};

/** Операции с зонами: отдельным токеном, если он задан, иначе основным. */
const cfZone = (path, init = {}) => cf(path, { ...init, bearer: zoneToken || token });

/**
 * Проверяет токен, аккаунт и права — одинаково для --check и для деплоя.
 * Права проверяем лёгкими запросами: без нужного права wrangler падает
 * на первом же шаге с невнятной ошибкой про «fetch failed», и понять
 * причину по такому логу невозможно.
 */
const probeToken = async () => {
  const who = await cf('/user/tokens/verify');
  if (who.ok && who.result?.status === 'active') ok('токен Cloudflare действителен');
  else bad(`Cloudflare не принял CLOUDFLARE_API_TOKEN (${who.errors?.[0]?.message || 'нет ответа от API'}) — создайте новый токен: панель → My Profile → API Tokens`);

  const account = await cf(`/accounts/${encodeURIComponent(accountId)}`);
  if (account.ok && account.result?.name) ok(`аккаунт Cloudflare: ${account.result.name}`);
  else bad(`CLOUDFLARE_ACCOUNT_ID «${accountId}» не открывается (${account.errors?.[0]?.message || 'нет доступа'}) — скопируйте Account ID из правого сайдбара панели`);

  if (zoneToken) {
    const zt = await cf('/user/tokens/verify', { bearer: zoneToken });
    if (zt.ok && zt.result?.status === 'active') {
      ok('CLOUDFLARE_ZONE_TOKEN действителен — домен можно добавить автоматически');
      console.log('::notice::CLOUDFLARE_ZONE_TOKEN задан и действителен');
    }
    else {
      warn(`Cloudflare не принял CLOUDFLARE_ZONE_TOKEN (${zt.errors?.[0]?.message || 'нет ответа'}) — операции с зонами пойдут основным токеном`);
      zoneToken = '';
    }
  }

  const PERMS = [
    ['база D1', `/accounts/${accountId}/d1/database?per_page=1`, 'Account → D1 → Edit'],
    ['хостинг Pages', `/accounts/${accountId}/pages/projects?per_page=1`, 'Account → Cloudflare Pages → Edit'],
    ['воркер API', `/accounts/${accountId}/workers/scripts?per_page=1`, 'Account → Workers Scripts → Edit'],
  ];
  for (const [title, path, hint] of PERMS) {
    const res = await cf(path);
    if (res.status === 200) ok(`${title}: право есть`);
    else if (res.status === 403) bad(`нет права на «${title}» — добавьте токену «${hint}»`);
    else warn(`${title}: ответ ${res.status} ${res.errors?.[0]?.message || ''}`);
  }

  const zones = DOMAIN ? await cf(`/zones?name=${encodeURIComponent(DOMAIN)}`) : { result: [] };
  if (DOMAIN && zones.result?.[0]) ok(`домен ${DOMAIN} в аккаунте Cloudflare`);
  else notes.push(`домен ${DOMAIN} не найден в аккаунте — маршрут /api/* и адрес сайта подключите после переноса NS в Cloudflare`);
};

/* ------------------------------------------------------------------ *
 * Проверка готовности
 * ------------------------------------------------------------------ */

if (checkOnly) {
  step('Проверяю окружение');
  console.log(`   домен сайта: ${SITE_URL || 'не задан в js/config.js'}`);

  const wrangler = exec(['--version'], { quiet: true, allowFail: true });
  if (wrangler.status === 0) ok(`wrangler доступен: ${wrangler.stdout.trim().split('\n').pop()}`);
  else warn('wrangler не найден — подтянется через npx при запуске');

  if (Object.keys(secrets).length) ok(`секреты в worker/.dev.vars: ${Object.keys(secrets).join(', ')}`);
  else notes.push('worker/.dev.vars нет — аккаунты будут работать по e-mail и паролю, без Google и писем');

  if (!secrets.GOOGLE_CLIENT_ID) notes.push('GOOGLE_CLIENT_ID не задан — кнопка «Войти через Google» не появится (docs/ACCOUNTS.md)');
  if (!secrets.RESEND_API_KEY) notes.push('RESEND_API_KEY не задан — письма сброса пароля не уходят');
  if (!/^[0-9a-f-]{36}$/i.test(databaseId)) notes.push('id базы D1 ещё не прописан — создам автоматически при деплое');

  if (!token || !accountId) {
    bad('для деплоя нужны CLOUDFLARE_API_TOKEN и CLOUDFLARE_ACCOUNT_ID');
  } else {
    await probeToken();
  }

  console.log('\n📋 План развёртывания (npm run deploy делает всё сам):');
  console.log('   1) база D1 gustoplay + схема');
  console.log('   2) домен: маршрут /api/*, Turnstile, DNS для Pages');
  console.log('   3) сборка сайта с адресом API');
  console.log('   4) секреты воркера → публикация API → публикация сайта');
  if (notes.length) {
    console.log('\nℹ️  Что останется включить в панелях:');
    notes.forEach((n) => console.log(`   • ${n}`));
  }
  console.log(problems.length ? `\n❌ Проблем: ${problems.length}\n` : '\n✅ Проверка пройдена — можно запускать npm run deploy\n');
  process.exit(problems.length ? 1 : 0);
}

if (problems.length || !token || !accountId) {
  console.log('\n❌ Развёртывание остановлено:');
  if (!token) console.log('   • нет переменной CLOUDFLARE_API_TOKEN');
  if (!accountId) console.log('   • нет переменной CLOUDFLARE_ACCOUNT_ID');
  problems.forEach((p) => console.log(`   • ${p}`));
  console.log('\nПодсказка: npm run deploy:check — покажет, что именно не хватает.\n');
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Префлайт: токен, аккаунт и права — до любых изменений
 * ------------------------------------------------------------------ */

step('Проверяю токен и права Cloudflare');
await probeToken();

if (problems.length) {
  console.log('\n❌ Развёртывание остановлено: исправьте пункты выше и запустите снова.');
  console.log('   Подробная инструкция: docs/DEPLOY.md → «Если что-то не так»\n');
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * 1. База данных
 * ------------------------------------------------------------------ */

step('База данных D1');
if (!databaseId) {
  const list = exec(['d1', 'list', '--json'], { quiet: true, allowFail: true });
  let found = null;
  try {
    const parsed = JSON.parse(list.stdout.replace(/^[^\[]*/, ''));
    const rows = Array.isArray(parsed) ? parsed : parsed.result || [];
    found = rows.find((r) => r.name === DB_NAME);
  } catch { /* вывод не JSON — создадим ниже */ }

  if (found) {
    databaseId = found.uuid || found.database_id;
    ok(`база ${DB_NAME} уже есть: ${databaseId}`);
  } else {
    const created = exec(['d1', 'create', DB_NAME], { quiet: true, allowFail: true });
    const m = /"?(?:database_id|uuid)"?\s*[:=]\s*"([0-9a-f-]{36})"/i.exec(created.stdout + created.stderr);
    if (m) {
      databaseId = m[1];
      ok(`база ${DB_NAME} создана: ${databaseId}`);
    } else {
      // Создание могло ответить ошибкой, хотя база уже есть (например, если
      // wrangler не отдал её в списке). Проверяем через API — это точнее.
      const existing = await cf(`/accounts/${accountId}/d1/database?name=${encodeURIComponent(DB_NAME)}`);
      const row = (existing.result || []).find((r) => r.name === DB_NAME);
      if (row) {
        databaseId = row.uuid || row.database_id;
        ok(`база ${DB_NAME} уже существует: ${databaseId}`);
      } else {
        bad('не удалось создать базу D1 — создайте вручную: npx wrangler d1 create gustoplay');
        console.log(`${created.stdout}${created.stderr}`.slice(0, 800));
      }
    }
  }

  if (databaseId) {
    writeFileSync(tomlPath, toml.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${databaseId}"`));
    toml = readFileSync(tomlPath, 'utf8');
    ok('id базы прописан в worker/wrangler.toml');
  }
} else {
  ok(`id базы уже прописан: ${databaseId}`);
}

if (!databaseId) {
  console.log('\n❌ Без базы данных продолжить нельзя.\n');
  process.exit(1);
}

step('Схема базы');
exec(['d1', 'execute', DB_NAME, '--remote', '--file=schema.sql'], { cwd: workerDir });
ok('таблицы созданы (повторный запуск ничего не ломает)');

/* ------------------------------------------------------------------ *
 * 2. Домен, маршрут /api/* и Turnstile
 * ------------------------------------------------------------------ */

step('Домен и защита форм');

let zoneId = '';
let zoneActive = false;
let zoneNs = '';
if (DOMAIN) {
  const zones = await cfZone(`/zones?name=${encodeURIComponent(DOMAIN)}`);
  const zone = zones.result?.[0];
  zoneId = zone?.id || '';
  if (zone) {
    zoneActive = zone.status === 'active';
    zoneNs = (zone.name_servers || []).join(', ');
    ok(`домен ${DOMAIN} в аккаунте Cloudflare (статус: ${zone.status})`);
    if (!zoneActive) notes.push(`зона ${DOMAIN} ждёт NS у регистратора: ${zoneNs}`);
  } else {
    // Зоны нет — добавляем сами: домен можно купить и позже, зона будет ждать
    // переноса NS. Нужно право «Account → Zones → Edit» (или CLOUDFLARE_ZONE_TOKEN).
    const created = await cfZone('/zones', {
      method: 'POST',
      body: { name: DOMAIN, account: { id: accountId }, type: 'full' },
    });
    if (created.ok && created.result?.id) {
      zoneId = created.result.id;
      zoneActive = false;
      zoneNs = (created.result.name_servers || []).join(', ');
      ok(`домен ${DOMAIN} добавлен в аккаунт Cloudflare`);
      notes.push(`купите домен у регистратора .ru и пропишите там NS: ${zoneNs}`);
    } else {
      warn(`домен ${DOMAIN} не найден и не добавился (${created.errors?.[0]?.message || 'нет права на создание зон'}) — добавьте вручную: панель Cloudflare → Add a site, затем запустите деплой снова`);
    }
  }
}

const routePattern = DOMAIN ? `${DOMAIN}/api/*` : '';
if (zoneId && routePattern) {
  if (toml.includes(routePattern)) {
    ok(`маршрут ${routePattern} уже настроен`);
  } else {
    // Маршрут регистрируем через API заранее: зона может быть ещё не активна,
    // а у токена может не быть нужного права. Не вышло — не роняем деплой,
    // маршрут добавится повторным запуском после активации зоны.
    let routeReady = false;
    const route = await cfZone(`/zones/${zoneId}/workers/routes`, {
      method: 'POST',
      body: { pattern: routePattern, script: WORKER_NAME },
    });
    if (route.ok) { routeReady = true; ok(`маршрут ${routePattern} зарегистрирован`); }
    else {
      const routes = await cfZone(`/zones/${zoneId}/workers/routes`);
      if ((routes.result || []).some((r) => r.pattern === routePattern)) {
        routeReady = true;
        ok(`маршрут ${routePattern} уже зарегистрирован`);
      } else {
        warn(`маршрут ${routePattern} не регистрируется (${route.errors?.[0]?.message || 'нет права'}) — подключим после активации зоны повторным деплоем`);
        console.log(`::warning::Маршрут /api/* не зарегистрирован: ${route.errors?.[0]?.message || 'нет права'} — нужно право «Zone → Workers Routes → Edit» или повторный деплой после активации зоны`);
        notes.push('маршрут /api/* на домене — запустите деплой ещё раз после активации зоны');
      }
    }
    if (routeReady) {
      const marker = '\n# Секреты (только через';
      const block = `\n# Маршрут: запросы сайта /api/* обслуживает этот воркер.\n[[routes]]\npattern = "${routePattern}"\nzone_name = "${DOMAIN}"\n`;
      toml = toml.includes(marker) ? toml.replace(marker, `${block}${marker}`) : `${toml}${block}`;
      writeFileSync(tomlPath, toml);
      ok(`маршрут ${routePattern} добавлен в worker/wrangler.toml`);
    }
  }
}

// Turnstile: создаём виджет сами, чтобы формы были защищены без ручных шагов.
let turnstileSiteKey = secrets.TURNSTILE_SITE_KEY || process.env.GUSTOPLAY_TURNSTILE_KEY || '';
if (!skipTurnstile && !secrets.TURNSTILE_SECRET && zoneId) {
  const widget = await cfZone(`/accounts/${accountId}/challenges/widgets`, {
    method: 'POST',
    body: { name: 'GustoPlay', domains: [DOMAIN, `www.${DOMAIN}`], mode: 'managed', bot_fight_mode: false },
  });
  if (widget.ok && widget.result?.secret) {
    secrets.TURNSTILE_SECRET = widget.result.secret;
    turnstileSiteKey = widget.result.sitekey;
    ok('Turnstile создан автоматически: секрет сохранён, публичный ключ попадёт в сборку');
  } else {
    warn(`Turnstile не создан автоматически (${widget.errors?.[0]?.message || 'нет прав'}) — формы работают без капчи`);
    console.log(`::warning::Turnstile не создан автоматически: ${widget.errors?.[0]?.message || 'нет прав'} — нужно право «Account → Turnstile Widget → Edit» или создайте виджет в панели`);
    notes.push('включить Turnstile: dash.cloudflare.com → Turnstile → создать виджет, затем npm run deploy снова');
  }
} else if (secrets.TURNSTILE_SECRET) {
  ok('секрет Turnstile уже задан');
}

/* ------------------------------------------------------------------ *
 * 3. Сборка сайта
 * ------------------------------------------------------------------ */

step('Сборка сайта');
if (skipBuild) {
  warn('пропущена по флагу --no-build');
  if (!existsSync(join(distDir, 'index.html'))) bad('в dist/ нет готового сайта');
} else {
  const args = ['tools/build-static.mjs', '--api-base=/api'];
  if (turnstileSiteKey) args.push(`--turnstile-key=${turnstileSiteKey}`);
  if (secrets.GOOGLE_CLIENT_ID) args.push(`--google-client-id=${secrets.GOOGLE_CLIENT_ID}`);
    spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', stdio: 'inherit' });
  if (existsSync(join(distDir, 'index.html'))) ok('сайт собран: dist/ (адрес API и ключи уже внутри)');
  else bad('сборка не удалась — проверьте вывод npm run build');
}

if (problems.length) {
  console.log('\n❌ Продолжить нельзя, исправьте пункты выше.\n');
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * 4. Секреты
 * ------------------------------------------------------------------ */

step('Секреты воркера');
const deploySecrets = {};
for (const key of ['GOOGLE_CLIENT_ID', 'TURNSTILE_SECRET', 'RESEND_API_KEY', 'MAIL_FROM']) {
  if (secrets[key]) deploySecrets[key] = secrets[key];
}
if (Object.keys(deploySecrets).length) {
  const dir = mkdtempSync(join(tmpdir(), 'gustoplay-'));
  const file = join(dir, 'secrets.json');
  writeFileSync(file, JSON.stringify(deploySecrets, null, 2));
  const res = exec(['secret', 'bulk', file], { cwd: workerDir, quiet: true, allowFail: true });
  if (res.status === 0) ok(`загружены: ${Object.keys(deploySecrets).join(', ')}`);
  else {
    warn('пакетная загрузка не удалась, по одному');
    for (const [key, value] of Object.entries(deploySecrets)) {
      const one = exec(['secret', 'put', key], { cwd: workerDir, quiet: true, allowFail: true, input: `${value}\n` });
      if (one.status === 0) ok(`секрет ${key} загружен`);
      else bad(`не удалось загрузить секрет ${key}`);
    }
  }
} else {
  warn('секретов нет — вход по e-mail работает, Google и письма выключены');
}

/* ------------------------------------------------------------------ *
 * 5. Воркер
 * ------------------------------------------------------------------ */

step('Публикация API-воркера');
// Первая публикация нового воркера иногда падает сразу после успешной загрузки
// («This Worker does not exist on your account», код 10007) — скрипт к этому
// моменту уже загружен, и повторный запуск проходит. Пробуем дважды.
let workerOk = false;
for (let attempt = 1; attempt <= 2; attempt++) {
  const res = exec(['deploy'], { cwd: workerDir, allowFail: true });
  if (res.status === 0) { workerOk = true; break; }
  warn(attempt === 1 ? 'первая попытка публикации не удалась — повторяю' : 'вторая попытка тоже не удалась');
}
if (workerOk) ok(`воркер ${WORKER_NAME} опубликован${routePattern && zoneActive ? ` (адрес: ${SITE_URL}/api/*)` : ''}`);
else {
  bad(`не удалось опубликовать воркер ${WORKER_NAME} — посмотрите вывод wrangler выше`);
  console.log('\n❌ Без API-воркера продолжать нельзя.\n');
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * 6. Сайт и домен
 * ------------------------------------------------------------------ */

step('Публикация сайта в Cloudflare Pages');
// Проект создаём через API: wrangler pages project create в свежих версиях
// может молча завершиться с ошибкой, а нам важно отличать «создан» от «упал».
for (const name of PAGES_CANDIDATES) {
  const found = await cf(`/accounts/${accountId}/pages/projects/${name}`);
  if (found.ok && found.result?.name) { PAGES_PROJECT = name; ok(`проект Pages ${name} уже существует`); break; }
}
if (!PAGES_PROJECT) {
  for (const name of PAGES_CANDIDATES) {
    const created = await cf(`/accounts/${accountId}/pages/projects`, {
      method: 'POST',
      body: { name, production_branch: 'master' },
    });
    if (created.ok && created.result?.name) { PAGES_PROJECT = name; ok(`проект Pages ${name} создан`); break; }
    warn(`проект Pages ${name} не создаётся: ${created.errors?.[0]?.message || 'ошибка API'} (HTTP ${created.status})`);
  }
}

if (PAGES_PROJECT) {
  exec(['pages', 'deploy', distDir, `--project-name=${PAGES_PROJECT}`, '--branch=master'], { cwd: root });
  ok(`сайт опубликован: https://${PAGES_PROJECT}.pages.dev`);
  // Адрес пробрасываем в следующие шаги GitHub Actions (если запущены там).
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `PAGES_URL=https://${PAGES_PROJECT}.pages.dev\n`);
} else {
  bad('не удалось создать проект Pages — имя занято в pages.dev или нет права «Cloudflare Pages: Edit»');
  console.log('\n❌ Без проекта Pages сайт не опубликовать.\n');
  process.exit(1);
}

if (zoneId && DOMAIN) {
  const project = await cf(`/accounts/${accountId}/pages/projects/${PAGES_PROJECT}`);
  const existing = (project.result?.domains || []).map((d) => String(d).toLowerCase());
  for (const name of [DOMAIN, `www.${DOMAIN}`]) {
    if (existing.includes(name)) { ok(`домен ${name} уже подключён к сайту`); continue; }
    const added = await cf(`/accounts/${accountId}/pages/projects/${PAGES_PROJECT}/domains`, { method: 'POST', body: { name } });
    if (added.ok) ok(`домен ${name} подключён к сайту`);
    else if (String(added.errors?.[0]?.message || '').includes('already added')) ok(`домен ${name} уже подключён к сайту`);
    else {
      warn(`домен ${name} не подключён: ${added.errors?.[0]?.message || 'ошибка API'}`);
      console.log(`::warning::Домен ${name} не подключён к Pages: ${added.errors?.[0]?.message || 'ошибка API'}`);
    }
  }

  // DNS-записи на pages.dev (apex работает через CNAME с включённым проксированием).
  for (const host of [DOMAIN, `www.${DOMAIN}`]) {
    const dns = await cfZone(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(host)}`);
    const record = (dns.result || []).find((r) => r.type === 'CNAME' && String(r.content).includes('pages.dev'));
    if (record) { ok(`DNS-запись ${host} → pages.dev уже есть`); continue; }
    const created = await cfZone(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: { type: 'CNAME', name: host, content: `${PAGES_PROJECT}.pages.dev`, proxied: true, ttl: 1, comment: 'GustoPlay — Cloudflare Pages' },
    });
    if (created.ok) ok(`DNS-запись ${host} → ${PAGES_PROJECT}.pages.dev создана`);
    else {
      warn(`DNS-запись ${host} не создана (${created.errors?.[0]?.message || 'нет прав'}) — добавьте CNAME вручную`);
      console.log(`::warning::DNS-запись ${host} не создана: ${created.errors?.[0]?.message || 'нет прав'} — нужно право «Zone → DNS → Edit» для этой зоны`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * 7. Инвалидация edge-кэша
 * ------------------------------------------------------------------ *
 * Pages может обновиться раньше apex-домена. Purge после успешной публикации
 * закрывает это окно и не требует ручной очистки в панели Cloudflare.
 */
if (zoneId) {
  step('Очищаю edge-кэш зоны после публикации');
  const purged = await cfZone(`/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    body: { purge_everything: true },
  });
  if (purged.ok) ok(`кэш зоны ${DOMAIN} очищен`);
  else {
    bad(`не удалось очистить кэш зоны: ${purged.errors?.[0]?.message || `HTTP ${purged.status}`}`);
    console.log('::warning::Добавьте токену право Zone → Cache Purge, иначе apex может показывать старый релиз.');
  }
} else {
  warn('зона не подключена — purge пропущен; после подключения домена он выполнится автоматически');
}

/* ------------------------------------------------------------------ *
 * Итог
 * ------------------------------------------------------------------ */

console.log('\n🎉 Готово:');
console.log(`   • сайт:  https://${PAGES_PROJECT}.pages.dev${zoneActive ? `  и  ${SITE_URL}` : ''}`);
console.log(`   • API:   ${zoneActive ? `${SITE_URL}/api/*` : `воркер ${WORKER_NAME} (workers.dev)`}`);
console.log('   • проверка: откройте сайт → «Аккаунт» → зарегистрируйтесь');

// Ключевые итоги — аннотациями: видны в сводке запуска Actions без скачивания логов.
console.log(`::notice::Сайт опубликован: https://${PAGES_PROJECT}.pages.dev${zoneActive ? ` и ${SITE_URL}` : ''}`);
if (DOMAIN && zoneId && !zoneActive && zoneNs) console.log(`::notice::Зона ${DOMAIN} ожидает активации — пропишите у регистратора NS: ${zoneNs}`);

console.log('\nℹ️  Осталось сделать в панелях (код уже готов и ждёт):');
if (!secrets.GOOGLE_CLIENT_ID) console.log('   • Google Cloud → OAuth Client: Authorized JavaScript origins = ' + SITE_URL + ' → скопировать Client ID в worker/.dev.vars → npm run deploy (docs/ACCOUNTS.md)');
if (!secrets.RESEND_API_KEY) console.log('   • Resend: подтвердить домен и создать API-ключ → worker/.dev.vars → npm run deploy — включатся письма сброса пароля');
console.log(`   • ${SITE_URL}/sitemap.xml → Google Search Console и Яндекс.Вебмастер`);
console.log('   • реклама: js/config.js → ADS.mode = \'rsya\' | \'adsense\' | \'both\' после одобрения площадки (docs/MONETIZATION.md)');
console.log('\nПодробно и по шагам: docs/DEPLOY.md\n');
