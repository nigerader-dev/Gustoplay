/**
 * Тест API аккаунтов GustoPlay (worker/index.js) на настоящей базе SQLite.
 *
 * Что проверяем:
 *   1. регистрацию, повторную регистрацию, слабый пароль, лимиты;
 *   2. вход по паролю: верный, неверный, несуществующий адрес (одинаковый ответ);
 *   3. вход через Google: подпись RS256 проверяется по JWKS (ключ генерируем сами),
 *      подделанная подпись и чужой `aud` отклоняются;
 *   4. синхронизацию профиля вкуса и лимит размера;
 *   5. список сессий, отзыв, выход;
 *   6. сброс пароля: письмо (заглушка), одноразовость токена, сброс сессий;
 *   7. удаление аккаунта — данные действительно исчезают.
 *
 * Запуск:  node --experimental-sqlite tools/test-api.mjs
 * Отдельный запуск нужен из-за node:sqlite — он ещё помечен экспериментальным.
 */
import { DatabaseSync } from 'node:sqlite';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const api = (await import(new URL('../worker/index.js', import.meta.url).href)).default;

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/* ------------------------------------------------------------------ *
 * Заглушка D1 поверх настоящего SQLite
 * ------------------------------------------------------------------ */

const db = new DatabaseSync(':memory:');
db.exec(readFileSync(join(root, 'worker/schema.sql'), 'utf8'));

const statement = (sql) => ({
  bind: (...params) => statement(sql, params),
  first: (...extra) => first(sql, extra),
  run: (...extra) => run(sql, extra),
  all: (...extra) => all(sql, extra),
});

let boundParams = [];
function statementFor(sql, params) {
  return {
    bind: (...more) => statementFor(sql, params.length ? params : more),
    first: () => {
      const row = db.prepare(sql).get(...params);
      return row ? Object.assign({}, row) : null;
    },
    run: () => ({ ok: true, changes: db.prepare(sql).run(...params).changes }),
    all: () => ({ results: db.prepare(sql).all(...boundParams.length ? boundParams : params).map((r) => Object.assign({}, r)) }),
  };
}
function first(sql, params) { const row = db.prepare(sql).get(...boundParams.length ? boundParams : params); return row ? Object.assign({}, row) : null; }
function run(sql, params) { db.prepare(sql).run(...boundParams.length ? boundParams : params); return { ok: true }; }
function all(sql, params) { return { results: db.prepare(sql).all(...boundParams.length ? boundParams : params).map((r) => Object.assign({}, r)) }; }

/** D1-совместимый фасад: prepare().bind(...) и цепочки */
const DB = {
  prepare(sql) {
    const params = [];
    const self = {
      bind: (...values) => { params.push(...values); return self; },
      first: () => { const row = db.prepare(sql).get(...params); return row ? Object.assign({}, row) : null; },
      run: () => { db.prepare(sql).run(...params); return { ok: true }; },
      all: () => ({ results: db.prepare(sql).all(...params).map((r) => Object.assign({}, r)) }),
    };
    return self;
  },
};

/* ------------------------------------------------------------------ *
 * Ключи Google и заглушка сети
 * ------------------------------------------------------------------ */

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };

const CLIENT_ID = 'test.apps.googleusercontent.com';
const base64url = (input) => Buffer.from(input).toString('base64url');

/** Собираем настоящий ID-токен Google и подписываем его нашим ключом */
function googleToken({ sub = '1234567890', email = 'player@gmail.com', name = 'Player One', aud = CLIENT_ID, kid = 'test-key', exp = Math.floor(Date.now() / 1000) + 600, badSignature = false } = {}) {
  const header = base64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ iss: 'https://accounts.google.com', aud, sub, email, email_verified: true, name, exp, iat: Date.now() / 1000 }));
  const data = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(data);
  const signature = badSignature ? Buffer.from('подделка').toString('base64url') : signer.sign(privateKey).toString('base64url');
  return `${data}.${signature}`;
}

let mailsSent = 0;
const sentMails = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const href = String(url);
  if (href.includes('googleapis.com/oauth2')) {
    return new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (href.includes('resend.com')) {
    mailsSent += 1;
    try { sentMails.push(JSON.parse(options.body)); } catch { /* ignore */ }
    return new Response(JSON.stringify({ id: 'mail_test' }), { status: 200 });
  }
  if (href.includes('cloudflare.com/turnstile')) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
  return realFetch(url, options);
};

const env = {
  DB,
  ALLOWED_ORIGINS: 'https://gustoplay.ru',
  MIN_PASSWORD_LENGTH: '10',
  GOOGLE_CLIENT_ID: CLIENT_ID,
  SITE_URL: 'https://gustoplay.ru',
  ALLOW_RESET_DEBUG: 'true',
  RESEND_API_KEY: 'test-key',
  MAIL_FROM: 'GustoPlay <no-reply@gustoplay.ru>',
};

const call = async (path, { method = 'GET', body, token, ip = '203.0.113.7' } = {}) => {
  const headers = { Origin: 'https://gustoplay.ru', 'CF-Connecting-IP': ip };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const request = new Request(`https://gustoplay.ru/api${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const response = await api.fetch(request, env);
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* не JSON */ }
  return { status: response.status, json, headers: response.headers };
};

const PASSWORD = 'Str0ng-Пароль-2026';

/* ------------------------------------------------------------------ *
 * 1. Служебные маршруты
 * ------------------------------------------------------------------ */

console.log('\n1. Служебные маршруты');
const health = await call('/health');
check('GET /health отвечает ok', health.status === 200 && health.json.ok === true);
check('есть заголовок HSTS', Boolean(health.headers.get('Strict-Transport-Security')));
check('CSP для API не мешает (нет X-Frame от чужого домена)', health.headers.get('X-Frame-Options') === 'DENY');

/* ------------------------------------------------------------------ *
 * 2. Регистрация
 * ------------------------------------------------------------------ */

console.log('\n2. Регистрация');
const weak = await call('/auth/register', { method: 'POST', body: { email: 'a@b.ru', password: 'short' } });
check('короткий пароль отклонён', weak.status === 400 && /не короче/.test(weak.json.error), weak.json?.error);

const noEmail = await call('/auth/register', { method: 'POST', body: { email: 'плохой-адрес', password: PASSWORD } });
check('некорректный e-mail отклонён', noEmail.status === 400);

const registered = await call('/auth/register', { method: 'POST', body: { email: 'Player@Example.com', password: PASSWORD, name: 'Игрок' } });
check('регистрация проходит', registered.status === 201 && Boolean(registered.json.token), `status ${registered.status}`);
check('e-mail нормализован в нижний регистр', registered.json?.user?.email === 'player@example.com');
const token = registered.json?.token;

const duplicate = await call('/auth/register', { method: 'POST', body: { email: 'player@example.com', password: PASSWORD } });
check('повторная регистрация даёт 409', duplicate.status === 409, duplicate.json?.error);

const stored = db.prepare('SELECT password_hash, password_salt, iterations FROM users WHERE email = ?').get('player@example.com');
check('пароль не хранится открытым текстом', stored.password_hash !== PASSWORD && !stored.password_hash.includes('Str0ng'));
check('соль индивидуальна и итераций не меньше 210 000', stored.password_salt.length > 10 && stored.iterations >= 210000);
const sessionRow = db.prepare('SELECT token_hash FROM sessions LIMIT 1').get();
check('в базе лежит только хеш токена сессии', sessionRow.token_hash !== token && sessionRow.token_hash.length > 20);

/* ------------------------------------------------------------------ *
 * 3. Вход по паролю
 * ------------------------------------------------------------------ */

console.log('\n3. Вход по паролю');
const wrongPassword = await call('/auth/login', { method: 'POST', body: { email: 'player@example.com', password: 'WrongPassw0rd!' } });
const unknownUser = await call('/auth/login', { method: 'POST', body: { email: 'nobody@example.com', password: 'WrongPassw0rd!' } });
check('неверный пароль → 401', wrongPassword.status === 401);
check('ответ не раскрывает, есть ли аккаунт', wrongPassword.json.error === unknownUser.json.error, wrongPassword.json.error);

const login = await call('/auth/login', { method: 'POST', body: { email: 'player@example.com', password: PASSWORD } });
check('верный пароль → вход', login.status === 200 && Boolean(login.json.token));
const loginToken = login.json?.token;

const me = await call('/me', { token: loginToken });
check('GET /me отдаёт пользователя', me.status === 200 && me.json.user.email === 'player@example.com');

const noToken = await call('/me');
check('без токена доступ закрыт', noToken.status === 401 && noToken.json.code === 'unauthorized');

/* ------------------------------------------------------------------ *
 * 4. Вход через Google
 * ------------------------------------------------------------------ */

console.log('\n4. Вход через Google');
const googleOk = await call('/auth/google', { method: 'POST', body: { credential: googleToken() } });
check('валидный ID-токен принимается', googleOk.status === 200 && Boolean(googleOk.json.token), googleOk.json?.error);
check('аккаунт создан с провайдером google', googleOk.json?.user?.provider === 'google' && googleOk.json.user.email === 'player@gmail.com');

const googleAgain = await call('/auth/google', { method: 'POST', body: { credential: googleToken() } });
check('повторный вход через Google не создаёт дубль', googleAgain.json?.user?.id === googleOk.json?.user?.id);

const badSignature = await call('/auth/google', { method: 'POST', body: { credential: googleToken({ badSignature: true, email: 'hacker@gmail.com' }) } });
check('подделанная подпись отклонена', badSignature.status === 401, badSignature.json?.error);

const badAudience = await call('/auth/google', { method: 'POST', body: { credential: googleToken({ aud: 'someone-else.apps.googleusercontent.com' }) } });
check('чужой aud отклонён', badAudience.status === 401);

const expired = await call('/auth/google', { method: 'POST', body: { credential: googleToken({ exp: Math.floor(Date.now() / 1000) - 60 }) } });
check('просроченный токен отклонён', expired.status === 401);

// привязка Google к аккаунту, созданному по паролю
const linkToken = googleToken({ email: 'player@example.com', sub: '5555555555' });
const linked = await call('/auth/google', { method: 'POST', body: { credential: linkToken } });
const boundUser = db.prepare('SELECT provider FROM users WHERE email = ?').get('player@example.com');
check('Google привязывается к аккаунту с тем же e-mail', linked.status === 200 && boundUser.provider === 'google');

const passwordStillWorks = await call('/auth/login', { method: 'POST', body: { email: 'player@example.com', password: PASSWORD } });
check('пароль продолжает работать после привязки', passwordStillWorks.status === 200);

/* ------------------------------------------------------------------ *
 * 5. Профиль вкуса
 * ------------------------------------------------------------------ */

console.log('\n5. Синхронизация профиля вкуса');
const emptyProfile = await call('/me/profile', { token });
check('до синхронизации профиль пуст', emptyProfile.status === 200 && emptyProfile.json.profile === null);

const profile = { answers: { mood: ['relax', 'story'], modes: ['coop'], players: 4 }, marks: { hades: { status: 'liked', ts: 1 } }, impressions: {} };
const saved = await call('/me/profile', { method: 'PUT', body: { profile }, token });
check('профиль сохраняется', saved.status === 200 && saved.json.ok === true);

const loaded = await call('/me/profile', { token });
check('профиль читается обратно без потерь', JSON.stringify(loaded.json.profile) === JSON.stringify(profile));

const huge = await call('/me/profile', { method: 'PUT', body: { profile: { blob: 'x'.repeat(300 * 1024) } }, token });
check('слишком большой профиль отклонён (413)', huge.status === 413, huge.json?.error);

/* ------------------------------------------------------------------ *
 * 6. Сессии
 * ------------------------------------------------------------------ */

console.log('\n6. Сессии');
const sessions = await call('/me/sessions', { token });
check('список сессий приходит', sessions.status === 200 && sessions.json.sessions.length >= 1, `${sessions.json?.sessions?.length} шт.`);
check('в списке нет хешей токенов', !JSON.stringify(sessions.json).includes('token_hash'));

const victim = sessions.json.sessions.find((s) => !s.current);
if (victim) {
  const revoked = await call(`/me/sessions/${victim.id}`, { method: 'DELETE', token });
  const left = await call('/me/sessions', { token });
  check('сессию можно отозвать', revoked.status === 200 && !left.json.sessions.some((s) => s.id === victim.id));
} else {
  const fresh = await call('/auth/login', { method: 'POST', body: { email: 'player@example.com', password: PASSWORD } });
  const after = await call('/me/sessions', { token });
  const other = after.json.sessions.find((s) => !s.current);
  const revoked = await call(`/me/sessions/${other.id}`, { method: 'DELETE', token });
  const stillAlive = await call('/me', { token: fresh.json.token });
  check('отзыв другой сессии выкидывает её токен', revoked.status === 200 && stillAlive.status === 401);
}

const loggedOut = await call('/auth/logout', { method: 'POST', token });
const afterLogout = await call('/me', { token });
check('выход обнуляет текущую сессию', loggedOut.status === 200 && afterLogout.status === 401);

/* ------------------------------------------------------------------ *
 * 7. Сброс пароля
 * ------------------------------------------------------------------ */

console.log('\n7. Сброс пароля');
const resetRequest = await call('/auth/reset-request', { method: 'POST', body: { email: 'player@example.com' } });
check('запрос сброса отправляет письмо', resetRequest.status === 200 && resetRequest.json.sent === true, `писем отправлено: ${mailsSent}`);
const mailHtml = sentMails.at(-1)?.html || '';
const resetToken = /reset=([\w-]+)/.exec(mailHtml)?.[1];
check('в письме есть ссылка с токеном', Boolean(resetToken), resetToken ? `токен ${resetToken.slice(0, 8)}…` : 'ссылки нет');
check('в письме нет пароля и секретов', !/password_hash|пароль:/i.test(mailHtml));

const unknownReset = await call('/auth/reset-request', { method: 'POST', body: { email: 'nobody@example.com' } });
check('для несуществующего адреса ответ такой же (нет перебора)', unknownReset.status === 200 && unknownReset.json.ok === true);

const tokensInDb = db.prepare('SELECT token_hash FROM reset_tokens').all();
check('токен сброса хранится как хеш', tokensInDb.every((r) => r.token_hash !== resetToken));

const weakReset = await call('/auth/reset-confirm', { method: 'POST', body: { token: resetToken, password: 'short' } });
check('слабый новый пароль отклонён', weakReset.status === 400);

const NEW_PASSWORD = 'Novy-Parol-2026!';
const resetDone = await call('/auth/reset-confirm', { method: 'POST', body: { token: resetToken, password: NEW_PASSWORD } });
check('новый пароль установлен', resetDone.status === 200 && resetDone.json.ok === true);

const oldPasswordNow = await call('/auth/login', { method: 'POST', body: { email: 'player@example.com', password: PASSWORD } });
const newPasswordNow = await call('/auth/login', { method: 'POST', body: { email: 'player@example.com', password: NEW_PASSWORD } });
check('старый пароль больше не работает', oldPasswordNow.status === 401);
check('новый пароль работает', newPasswordNow.status === 200);

const reuse = await call('/auth/reset-confirm', { method: 'POST', body: { token: resetToken, password: 'Eshche-Odin-2026!' } });
check('токен сброса одноразовый', reuse.status === 400, reuse.json?.error);

const leftoverSessions = db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ?)').get('player@example.com');
check('после сброса все сессии сброшены', leftoverSessions.n === 1, `осталось: ${leftoverSessions.n} (только новая)`);

/* ------------------------------------------------------------------ *
 * 8. Удаление аккаунта
 * ------------------------------------------------------------------ */

console.log('\n8. Удаление аккаунта');
const finalLogin = await call('/auth/login', { method: 'POST', body: { email: 'player@example.com', password: NEW_PASSWORD } });
const doomedUserId = finalLogin.json.user.id;
const googleUserBefore = db.prepare("SELECT id FROM users WHERE email = 'player@gmail.com'").get();
const deleteResult = await call('/me', { method: 'DELETE', token: finalLogin.json.token });
const userGone = db.prepare('SELECT COUNT(*) AS n FROM users WHERE email = ?').get('player@example.com');
const sessionsGone = db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?').get(doomedUserId);
const profilesGone = db.prepare('SELECT COUNT(*) AS n FROM profiles WHERE user_id = ?').get(doomedUserId);
check('DELETE /me отвечает ok', deleteResult.status === 200 && deleteResult.json.ok === true);
check('запись пользователя удалена', userGone.n === 0);
check('сессии удалённого аккаунта исчезли', sessionsGone.n === 0, `осталось: ${sessionsGone.n}`);
check('профиль вкуса удалён', profilesGone.n === 0, `осталось: ${profilesGone.n}`);
check('чужой аккаунт не пострадал', Boolean(googleUserBefore) && db.prepare("SELECT COUNT(*) AS n FROM users WHERE email = 'player@gmail.com'").get().n === 1);
const afterDelete = await call('/me', { token: finalLogin.json.token });
check('токен удалённого аккаунта не работает', afterDelete.status === 401);

/* ------------------------------------------------------------------ *
 * 9. Прочее
 * ------------------------------------------------------------------ */

console.log('\n9. Защита и устойчивость');
const unknownPath = await call('/nope');
const unknownApiPath = await call('/me/unknown-endpoint', { token: 'not-a-real-token' });
check('неизвестный маршрут → 404', unknownPath.status === 404 && unknownPath.json.error === 'Не найдено');
check('неизвестный защищённый маршрут → 401 (не раскрываем структуру)', unknownApiPath.status === 401);

let rateLimited = false;
for (let i = 0; i < 40; i += 1) {
  const attempt = await call('/auth/login', { method: 'POST', body: { email: `spam${i}@example.com`, password: 'WrongPassw0rd!' } });
  if (attempt.status === 429) { rateLimited = true; break; }
}
check('после десятков попыток включается rate limit', rateLimited);

const options = await api.fetch(new Request('https://gustoplay.ru/api/auth/login', { method: 'OPTIONS', headers: { Origin: 'https://gustoplay.ru' } }), env);
check('CORS preflight отвечает 204 и разрешает только наш домен',
  options.status === 204 && options.headers.get('Access-Control-Allow-Origin') === 'https://gustoplay.ru');
const foreignResponse = await api.fetch(new Request('https://gustoplay.ru/api/health', { headers: { Origin: 'https://evil.example' } }), env);
const allowOrigin = foreignResponse.headers.get('Access-Control-Allow-Origin');
check('чужой домен не получает разрешения CORS', allowOrigin !== 'https://evil.example', `отдаём: ${allowOrigin}`);
// отдельный «чистый» IP: к этому месту теста лимит по нашему адресу уже исчерпан
const badEmail = await call('/auth/register', { method: 'POST', body: { email: 'no-dog', password: PASSWORD }, ip: '198.51.100.9' });
check('некорректный e-mail на регистрации → 400', badEmail.status === 400);

console.log(`\nПроверок: ${passed + failed} · ✅ ${passed} · ❌ ${failed}`);
process.exit(failed ? 1 : 0);
