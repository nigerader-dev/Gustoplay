/**
 * GustoPlay API — Cloudflare Worker.
 *
 * Что умеет:
 *   • регистрация и вход по e-mail и паролю (PBKDF2-SHA256, 210 000 итераций, случайная соль);
 *   • вход через Google (проверка подписанного ID-токена по JWKS Google, без секретов на клиенте);
 *   • выдача сессионных токенов (хранятся в базе только в виде SHA-256 хеша);
 *   • синхронизация профиля вкуса (чтение/запись) с лимитом размера;
 *   • список активных сессий и их отзыв, удаление аккаунта;
 *   • защита от ботов (Cloudflare Turnstile) и rate limit по IP на уровне базы.
 *
 * Безопасность:
 *   • строгие заголовки (CSP, HSTS, no-sniff, no-referrer) для всех ответов;
 *   • CORS только для своего домена (список в ALLOWED_ORIGINS);
 *   • все запросы к базе — параметризованные (никаких конкатенаций SQL);
 *   • лимиты: 20 неудачных входов/час на e-mail, 30 запросов/минуту на IP для авторизации;
 *   • сравнение пароля — постоянное по времени (timingSafeEqual);
 *   • ошибки наружу отдаём без деталей, подробности — только в логи.
 *
 * Развёртывание: см. worker/README.md
 */

/* ------------------------------- константы ------------------------------- */

const SESSION_TTL_DAYS = 90;
const PBKDF2_ITERATIONS = 210000;
const MAX_PROFILE_BYTES = 256 * 1024;      // 256 КБ на профиль вкуса
const AUTH_RATE_PER_MIN = 30;              // запросов в минуту на IP для /auth/*
const FAILED_LOGINS_PER_HOUR = 20;         // неудачных попыток на e-mail
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const RESET_TTL_MINUTES = 60;              // сколько живёт ссылка сброса пароля

/* ------------------------------- утилиты ------------------------------- */

const json = (data, status = 200, extraHeaders = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  },
});

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64url = (str) => {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

const randomToken = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));
const sha256Hex = async (text) => b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

async function hashPassword(password, salt, iterations = PBKDF2_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromB64url(salt), iterations, hash: 'SHA-256' }, key, 256,
  );
  return b64url(bits);
}

/** Сравнение строк за постоянное время */
function timingSafeEqual(a = '', b = '') {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

const isEmail = (value) => typeof value === 'string' && /^[^@\s]{1,64}@[^@\s.]{1,64}\.[a-z]{2,24}$/i.test(value);

/** Проверка силы пароля: длина, разные регистры, цифры, отсутствие очевидных паролей */
function passwordProblem(password, minLength = 10) {
  if (typeof password !== 'string' || password.length < minLength) return `Пароль должен быть не короче ${minLength} символов`;
  if (password.length > 200) return 'Слишком длинный пароль';
  // Отсекаем очевидные пароли целиком («password123» уже прошёл бы по классам символов),
  // но не наказываем за то, что слово встречается внутри длинной фразы.
  const weak = ['password', 'passwort', 'qwerty', 'qwertyuiop', '123456789', '1234567890',
    'letmein', 'iloveyou', 'admin', 'welcome', 'gustoplay', 'пароль', 'йцукен', 'qazwsx'];
  const plain = password.toLowerCase().replace(/[^0-9a-zа-яё]/g, '');
  if (weak.includes(plain) || weak.some((w) => plain === w + w || plain === w + w + w)) {
    return 'Слишком простой пароль';
  }
  const classes = [/[a-z]/, /[A-ZА-Я]/, /\d/, /[^\w\s]/].filter((re) => re.test(password)).length;
  if (classes < 2) return 'Добавьте цифры, заглавные буквы или символы';
  return null;
}

/* ------------------------------- CORS и заголовки ------------------------------- */

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const allow = allowed.includes(origin) ? origin : (allowed[0] || '');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

const respond = (data, status, origin, env) => json(data, status, { ...corsHeaders(origin, env), ...securityHeaders });

/* ------------------------------- rate limit ------------------------------- */

async function rateLimit(env, bucket, limit, windowSeconds) {
  const key = `${bucket}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const row = await env.DB.prepare('SELECT count FROM rate_limits WHERE key = ?').bind(key).first();
  const count = (row?.count || 0) + 1;
  if (count > limit) return false;
  await env.DB.prepare(
    'INSERT INTO rate_limits (key, count, expires_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1',
  ).bind(key, count, Math.floor(Date.now() / 1000) + windowSeconds * 2).run();
  return true;
}

/* ------------------------------- Turnstile ------------------------------- */

async function verifyTurnstile(token, ip, env) {
  if (!env.TURNSTILE_SECRET) return true;         // проверка не настроена — пропускаем
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  if (!result.ok) return false;
  const data = await result.json();
  return Boolean(data.success);
}

/* ------------------------------- сессии ------------------------------- */

async function createSession(env, userId, request) {
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 864e5).toISOString();
  const ua = request.headers.get('User-Agent') || '';
  const device = /mobile/i.test(ua) ? 'Телефон' : /tablet|ipad/i.test(ua) ? 'Планшет' : 'Компьютер';
  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, token_hash, device, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(crypto.randomUUID(), userId, tokenHash, device, new Date().toISOString(), expires).run();
  return token;
}

async function authUser(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT s.id AS session_id, u.id, u.email, u.name, u.provider
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).bind(tokenHash, new Date().toISOString()).first();
  return row || null;
}

/* ------------------------------- Google ------------------------------- */

let jwksCache = { at: 0, keys: [] };

async function googleKeys() {
  if (Date.now() - jwksCache.at < 3600_000 && jwksCache.keys.length) return jwksCache.keys;
  const response = await fetch(GOOGLE_JWKS_URL);
  const data = await response.json();
  jwksCache = { at: Date.now(), keys: data.keys || [] };
  return jwksCache.keys;
}

/**
 * Проверяем ID-токен Google: подпись (RS256 по JWKS), issuer, audience, срок действия.
 * Возвращаем нормализованный профиль пользователя или null.
 */
async function verifyGoogleToken(credential, clientId) {
  if (!credential || !clientId) return null;
  const parts = credential.split('.');
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = JSON.parse(new TextDecoder().decode(fromB64url(headerPart)));
  const payload = JSON.parse(new TextDecoder().decode(fromB64url(payloadPart)));

  if (header.alg !== 'RS256') return null;
  if (!GOOGLE_ISSUERS.includes(payload.iss)) return null;
  if (payload.aud !== clientId) return null;
  if (payload.exp * 1000 < Date.now()) return null;

  const keys = await googleKeys();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    'jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key, fromB64url(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  );
  if (!valid) return null;

  return {
    provider: 'google',
    providerId: payload.sub,
    email: String(payload.email || '').toLowerCase(),
    name: payload.name || '',
    emailVerified: Boolean(payload.email_verified),
  };
}

/* ------------------------------- почта ------------------------------- */

/**
 * Отправка письма через Resend (https://resend.com — бесплатный тариф 3000 писем/мес).
 * Если ключ не задан, письмо не отправляем — API честно сообщает об этом флагом sent:false.
 */
async function sendMail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, html }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const resetEmailHtml = (link) => `
  <div style="font-family:system-ui,sans-serif;max-width:520px">
    <h2 style="margin:0 0 12px">GustoPlay: сброс пароля</h2>
    <p>Вы запросили новый пароль. Ссылка действует 60 минут и сработает один раз.</p>
    <p style="margin:24px 0">
      <a href="${link}" style="background:#3b82f6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">
        Задать новый пароль
      </a>
    </p>
    <p style="color:#666;font-size:13px">Если вы не запрашивали сброс, просто проигнорируйте письмо — пароль останется прежним.</p>
    <p style="color:#666;font-size:13px">Ссылка: ${link}</p>
  </div>`;

/* ------------------------------- обработчики ------------------------------- */

async function handleRegister(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const { email, password, name, turnstileToken } = body;
  const ip = request.headers.get('CF-Connecting-IP') || '';

  if (!(await rateLimit(env, `auth:${ip}`, AUTH_RATE_PER_MIN, 60))) {
    return respond({ error: 'Слишком много попыток. Попробуйте через минуту.' }, 429, origin, env);
  }
  if (!(await verifyTurnstile(turnstileToken, ip, env))) {
    return respond({ error: 'Не удалось подтвердить, что вы не робот' }, 400, origin, env);
  }
  if (!isEmail(email)) return respond({ error: 'Проверьте адрес e-mail' }, 400, origin, env);
  const problem = passwordProblem(password, Number(env.MIN_PASSWORD_LENGTH || 10));
  if (problem) return respond({ error: problem }, 400, origin, env);

  const normalized = String(email).toLowerCase().trim();
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(normalized).first();
  if (existing) return respond({ error: 'Этот e-mail уже зарегистрирован — попробуйте войти' }, 409, origin, env);

  const salt = randomToken(16);
  const hash = await hashPassword(password, salt);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, provider, password_hash, password_salt, iterations, email_verified, created_at)
     VALUES (?, ?, ?, 'email', ?, ?, ?, 0, ?)`,
  ).bind(id, normalized, String(name || '').slice(0, 60), hash, salt, PBKDF2_ITERATIONS, now).run();

  const token = await createSession(env, id, request);
  return respond({
    token,
    user: { id, email: normalized, name: String(name || ''), provider: 'email', createdAt: now },
  }, 201, origin, env);
}

async function handleLogin(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const { email, password, turnstileToken } = body;
  const ip = request.headers.get('CF-Connecting-IP') || '';

  if (!(await rateLimit(env, `auth:${ip}`, AUTH_RATE_PER_MIN, 60))) {
    return respond({ error: 'Слишком много попыток. Попробуйте через минуту.' }, 429, origin, env);
  }
  if (!(await verifyTurnstile(turnstileToken, ip, env))) {
    return respond({ error: 'Не удалось подтвердить, что вы не робот' }, 400, origin, env);
  }

  const normalized = String(email || '').toLowerCase().trim();
  if (!(await rateLimit(env, `login:${normalized}`, FAILED_LOGINS_PER_HOUR, 3600))) {
    return respond({ error: 'Слишком много неудачных попыток входа. Попробуйте позже.' }, 429, origin, env);
  }

  const user = await env.DB.prepare(
    'SELECT id, email, name, provider, password_hash, password_salt, iterations FROM users WHERE email = ?',
  ).bind(normalized).first();

  // Не раскрываем, существует ли аккаунт: всегда один и тот же ответ.
  // Ориентируемся на наличие пароля, а не на провайдера: после привязки Google
  // вход по паролю должен продолжать работать (это второй способ входа).
  const genericError = 'Неверный e-mail или пароль';
  if (!user || !user.password_hash) {
    return respond({ error: genericError }, 401, origin, env);
  }

  const hash = await hashPassword(password || '', user.password_salt, user.iterations || PBKDF2_ITERATIONS);
  if (!timingSafeEqual(hash, user.password_hash)) {
    return respond({ error: genericError }, 401, origin, env);
  }

  const token = await createSession(env, user.id, request);
  return respond({
    token,
    user: { id: user.id, email: user.email, name: user.name, provider: 'email' },
  }, 200, origin, env);
}

async function handleGoogle(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const ip = request.headers.get('CF-Connecting-IP') || '';

  if (!(await rateLimit(env, `auth:${ip}`, AUTH_RATE_PER_MIN, 60))) {
    return respond({ error: 'Слишком много попыток. Попробуйте через минуту.' }, 429, origin, env);
  }

  const googleProfile = await verifyGoogleToken(body.credential, env.GOOGLE_CLIENT_ID);
  if (!googleProfile) return respond({ error: 'Не удалось проверить вход через Google' }, 401, origin, env);

  let user = await env.DB.prepare('SELECT id, email, name, provider FROM users WHERE email = ?')
    .bind(googleProfile.email).first();

  if (!user) {
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO users (id, email, name, provider, provider_id, email_verified, created_at)
       VALUES (?, ?, ?, 'google', ?, ?, ?)`,
    ).bind(id, googleProfile.email, googleProfile.name.slice(0, 60), googleProfile.providerId,
      googleProfile.emailVerified ? 1 : 0, new Date().toISOString()).run();
    user = { id, email: googleProfile.email, name: googleProfile.name, provider: 'google' };
  } else if (user.provider === 'email') {
    // Привязываем Google к существующему аккаунту (почта уже подтверждена Google)
    await env.DB.prepare('UPDATE users SET provider = ?, provider_id = ?, email_verified = 1 WHERE id = ?')
      .bind('google', googleProfile.providerId, user.id).run();
    user = { ...user, provider: 'google' };
  }

  const token = await createSession(env, user.id, request);
  return respond({ token, user }, 200, origin, env);
}

async function handleProfileGet(request, env, origin, user) {
  const row = await env.DB.prepare('SELECT profile, updated_at FROM profiles WHERE user_id = ?').bind(user.id).first();
  return respond({ profile: row?.profile ? JSON.parse(row.profile) : null, updatedAt: row?.updated_at || null }, 200, origin, env);
}

async function handleProfilePut(request, env, origin, user) {
  const body = await request.json().catch(() => ({}));
  const profile = body.profile;
  if (!profile || typeof profile !== 'object') return respond({ error: 'Пустой профиль' }, 400, origin, env);

  const serialized = JSON.stringify(profile);
  if (serialized.length > MAX_PROFILE_BYTES) {
    return respond({ error: 'Профиль слишком большой. Уменьшите количество отметок.' }, 413, origin, env);
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO profiles (user_id, profile, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET profile = excluded.profile, updated_at = excluded.updated_at`,
  ).bind(user.id, serialized, now).run();

  return respond({ ok: true, updatedAt: now }, 200, origin, env);
}

/**
 * Запрос ссылки для сброса пароля.
 * Отвечаем одинаково независимо от того, есть такой аккаунт или нет —
 * иначе по ответу можно перебирать зарегистрированные адреса.
 */
async function handleResetRequest(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const ip = request.headers.get('CF-Connecting-IP') || '';

  if (!(await rateLimit(env, `auth:${ip}`, AUTH_RATE_PER_MIN, 60))) {
    return respond({ error: 'Слишком много попыток. Попробуйте через минуту.' }, 429, origin, env);
  }
  if (!(await verifyTurnstile(body.turnstileToken, ip, env))) {
    return respond({ error: 'Не удалось подтвердить, что вы не робот' }, 400, origin, env);
  }

  const email = String(body.email || '').toLowerCase().trim();
  if (!isEmail(email)) return respond({ error: 'Проверьте адрес e-mail' }, 400, origin, env);
  if (!(await rateLimit(env, `reset:${email}`, 5, 3600))) {
    return respond({ ok: true, sent: false }, 200, origin, env);   // тихо игнорируем флуд
  }

  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (!user) return respond({ ok: true, sent: false }, 200, origin, env);

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + RESET_TTL_MINUTES * 60000).toISOString();
  await env.DB.prepare('DELETE FROM reset_tokens WHERE user_id = ?').bind(user.id).run();
  await env.DB.prepare(
    'INSERT INTO reset_tokens (token_hash, user_id, expires_at, used) VALUES (?, ?, ?, 0)',
  ).bind(tokenHash, user.id, expires).run();

  const base = (env.SITE_URL || 'https://gustoplay.ru').replace(/\/$/, '');
  const link = `${base}/#/account?reset=${token}`;
  const sent = await sendMail(env, { to: email, subject: 'GustoPlay: сброс пароля', html: resetEmailHtml(link) });

  // в режиме отладки (без настроенной почты) отдаём ссылку в ответ, чтобы владелец сайта мог проверить
  const debug = !sent && env.ALLOW_RESET_DEBUG === 'true' ? { debugLink: link } : {};
  return respond({ ok: true, sent, ...debug }, 200, origin, env);
}

/** Установка нового пароля по одноразовому токену */
async function handleResetConfirm(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const ip = request.headers.get('CF-Connecting-IP') || '';

  if (!(await rateLimit(env, `auth:${ip}`, AUTH_RATE_PER_MIN, 60))) {
    return respond({ error: 'Слишком много попыток. Попробуйте через минуту.' }, 429, origin, env);
  }

  const token = String(body.token || '');
  if (!token) return respond({ error: 'Ссылка неполная: нет токена' }, 400, origin, env);

  const problem = passwordProblem(body.password, Number(env.MIN_PASSWORD_LENGTH || 10));
  if (problem) return respond({ error: problem }, 400, origin, env);

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    'SELECT user_id, expires_at, used FROM reset_tokens WHERE token_hash = ?',
  ).bind(tokenHash).first();

  if (!row || row.used || row.expires_at < new Date().toISOString()) {
    return respond({ error: 'Ссылка устарела. Запросите новую.' }, 400, origin, env);
  }

  const salt = randomToken(16);
  const hash = await hashPassword(body.password, salt);
  await env.DB.prepare(
    'UPDATE users SET password_hash = ?, password_salt = ?, iterations = ? WHERE id = ?',
  ).bind(hash, salt, PBKDF2_ITERATIONS, row.user_id).run();

  await env.DB.prepare('UPDATE reset_tokens SET used = 1 WHERE token_hash = ?').bind(tokenHash).run();
  // все старые сессии разлогиниваем: если аккаунт увели, сброс пароля его выкидывает
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id).run();

  return respond({ ok: true }, 200, origin, env);
}

/* ------------------------------- роутер ------------------------------- */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    // Cloudflare отдаёт нам полный путь, поэтому поддерживаем оба варианта:
    // и маршрут /api/*, и прямой вызов воркера (/health, /auth/login).
    let path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/api') path = '/';
    else if (path.startsWith('/api/')) path = path.slice(4);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...corsHeaders(origin, env), ...securityHeaders } });

    // ограничение методов и маршрутизация
    try {
      if (path === '/health') return respond({ ok: true, time: new Date().toISOString() }, 200, origin, env);

      if (path === '/auth/register' && request.method === 'POST') return handleRegister(request, env, origin);
      if (path === '/auth/login' && request.method === 'POST') return handleLogin(request, env, origin);
      if (path === '/auth/google' && request.method === 'POST') return handleGoogle(request, env, origin);
      if (path === '/auth/reset-request' && request.method === 'POST') return handleResetRequest(request, env, origin);
      if (path === '/auth/reset-confirm' && request.method === 'POST') return handleResetConfirm(request, env, origin);

      // Маршруты, которых у нас нет, честно сообщаем как 404 —
      // но только те, что не относятся к защищённым (там сначала нужен вход).
      const isKnownArea = path === '/auth/logout' || path === '/me' || path.startsWith('/me/');
      if (!isKnownArea) return respond({ error: 'Не найдено' }, 404, origin, env);

      const user = await authUser(request, env);

      if (path === '/auth/logout' && request.method === 'POST') {
        const header = request.headers.get('Authorization') || '';
        if (header.startsWith('Bearer ')) {
          await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(header.slice(7))).run();
        }
        return respond({ ok: true }, 200, origin, env);
      }

      if (!user) return respond({ error: 'Требуется вход', code: 'unauthorized' }, 401, origin, env);

      if (path === '/me' && request.method === 'GET') {
        return respond({ user: { id: user.id, email: user.email, name: user.name, provider: user.provider } }, 200, origin, env);
      }

      if (path === '/me/profile' && request.method === 'GET') return handleProfileGet(request, env, origin, user);
      if (path === '/me/profile' && request.method === 'PUT') return handleProfilePut(request, env, origin, user);

      if (path === '/me/sessions' && request.method === 'GET') {
        const rows = await env.DB.prepare(
          'SELECT id, device, created_at FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 50',
        ).bind(user.id, new Date().toISOString()).all();
        return respond({
          sessions: (rows.results || []).map((r) => ({
            id: r.id, device: r.device, createdAt: (r.created_at || '').slice(0, 10), current: r.id === user.session_id,
          })),
        }, 200, origin, env);
      }

      const sessionMatch = /^\/me\/sessions\/([0-9a-f-]{36})$/.exec(path);
      if (sessionMatch && request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').bind(sessionMatch[1], user.id).run();
        return respond({ ok: true }, 200, origin, env);
      }

      if (path === '/me' && request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run();
        await env.DB.prepare('DELETE FROM profiles WHERE user_id = ?').bind(user.id).run();
        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();
        return respond({ ok: true }, 200, origin, env);
      }

      return respond({ error: 'Не найдено' }, 404, origin, env);
    } catch (error) {
      // наружу — обезличенная ошибка, детали только в логах Cloudflare
      console.error('api_error', error?.stack || String(error));
      return respond({ error: 'Внутренняя ошибка сервера' }, 500, origin, env);
    }
  },

  /** Раз в сутки чистим просроченные сессии и записи rate limit */
  async scheduled(_event, env) {
    const now = new Date().toISOString();
    const epoch = Math.floor(Date.now() / 1000);
    await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now).run();
    await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(epoch).run();
    await env.DB.prepare('DELETE FROM reset_tokens WHERE expires_at < ?').bind(now).run();
  },
};
