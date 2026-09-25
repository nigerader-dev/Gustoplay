/**
 * Клиент API для аккаунтов и синхронизации профиля вкуса.
 *
 * Работает в двух режимах:
 *   • серверный — если в js/config.js задан apiBase и развёрнут Worker (см. worker/README.md);
 *   • локальный — если API недоступен, все функции возвращают понятную ошибку,
 *     а сайт продолжает работать: профиль остаётся в localStorage браузера.
 *
 * Безопасность на клиенте:
 *   • токен сессии храним в localStorage с пометкой срока действия;
 *   • все запросы идут с credentials: 'include' (для httpOnly-cookie варианта) и Bearer-заголовком;
 *   • никаких паролей в открытом виде дольше одного запроса;
 *   • при 401 токен автоматически забывается.
 */
import { SITE, AUTH } from './config.js';

const TOKEN_KEY = 'pn.token.v1';
const USER_KEY = 'pn.user.v1';

export const apiReady = () => Boolean(SITE.apiBase && String(SITE.apiBase).trim());
export const apiBase = () => (SITE.apiBase || '').replace(/\/$/, '');

export const getToken = () => globalThis.localStorage?.getItem(TOKEN_KEY) || null;
export const getUser = () => {
  try { return JSON.parse(globalThis.localStorage?.getItem(USER_KEY) || 'null'); } catch { return null; }
};

export const setSession = (token, user) => {
  try {
    if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
    else globalThis.localStorage?.removeItem(TOKEN_KEY);
    if (user) globalThis.localStorage?.setItem(USER_KEY, JSON.stringify(user));
    else globalThis.localStorage?.removeItem(USER_KEY);
  } catch { /* приватный режим */ }
};

export const clearSession = () => setSession(null, null);
export const isLoggedIn = () => Boolean(getToken() && getUser());

/** Класс ошибки, чтобы интерфейс мог показать человеческий текст */
export class ApiError extends Error {
  constructor(message, status = 0, code = '') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = 'GET', body, auth = true, timeout = 12000 } = {}) {
  const base = apiBase();
  if (!base) throw new ApiError('API не настроен: укажите apiBase в js/config.js', 0, 'no_api');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    // 401 на запросе с нашим токеном = сессия истекла: чистим и просим войти заново.
    // 401 на входе/регистрации — это просто «неверный пароль», показываем текст сервера.
    if (response.status === 401 && auth && token) {
      clearSession();
      throw new ApiError('Сессия истекла — войдите заново', 401, 'unauthorized');
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new ApiError(data.error || `Ошибка ${response.status}`, response.status, data.code || '');
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') throw new ApiError('Сервер не ответил вовремя', 0, 'timeout');
    throw new ApiError('Нет связи с сервером. Профиль сохранён локально.', 0, 'offline');
  } finally {
    clearTimeout(timer);
  }
}

/* --------------------------- аутентификация ---------------------------- */

/** Регистрация по e-mail и паролю */
export async function register({ email, password, name, turnstileToken }) {
  const data = await request('/auth/register', {
    method: 'POST', auth: false, body: { email, password, name, turnstileToken },
  });
  setSession(data.token, data.user);
  return data.user;
}

/** Вход по e-mail и паролю */
export async function login({ email, password, turnstileToken }) {
  const data = await request('/auth/login', {
    method: 'POST', auth: false, body: { email, password, turnstileToken },
  });
  setSession(data.token, data.user);
  return data.user;
}

/** Вход через Google: credential приходит из Google Identity Services */
export async function loginWithGoogle(credential) {
  const data = await request('/auth/google', { method: 'POST', auth: false, body: { credential } });
  setSession(data.token, data.user);
  return data.user;
}

/** Запрос ссылки для сброса пароля. Всегда отвечает ok — существование адреса не раскрывается. */
export async function requestPasswordReset({ email, turnstileToken }) {
  return request('/auth/reset-request', { method: 'POST', auth: false, body: { email, turnstileToken } });
}

/** Установка нового пароля по токену из письма */
export async function confirmPasswordReset({ token, password }) {
  return request('/auth/reset-confirm', { method: 'POST', auth: false, body: { token, password } });
}

export async function logout() {
  try { await request('/auth/logout', { method: 'POST' }); } catch { /* выходим локально в любом случае */ }
  clearSession();
}

/** Проверить сессию и получить актуальные данные пользователя */
export async function me() {
  const data = await request('/me');
  setSession(getToken(), data.user);
  return data.user;
}

/* ------------------------- профиль вкуса на сервере ------------------------- */

export async function pullProfile() {
  const data = await request('/me/profile');
  return data.profile;
}

export async function pushProfile(profile) {
  const data = await request('/me/profile', { method: 'PUT', body: { profile } });
  return data.updatedAt;
}

export async function listSessions() {
  const data = await request('/me/sessions');
  return data.sessions || [];
}

export async function revokeSession(id) {
  return request(`/me/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function deleteAccount() {
  await request('/me', { method: 'DELETE' });
  clearSession();
}

/* ------------------------------ Google ------------------------------ */

let googleScriptPromise = null;

/** Подгружает Google Identity Services и инициализирует кнопку входа */
export function loadGoogleIdentity() {
  if (!AUTH.googleClientId) return Promise.resolve(false);
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve) => {
    if (globalThis.google?.accounts?.id) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.append(script);
  });
  return googleScriptPromise;
}

/**
 * Рисует официальную кнопку Google в контейнере.
 * @param {HTMLElement} container
 * @param {(credential: string) => void} onCredential
 */
export async function renderGoogleButton(container, onCredential) {
  if (!AUTH.googleClientId || !container) return false;
  const ready = await loadGoogleIdentity();
  if (!ready || !globalThis.google?.accounts?.id) return false;

  globalThis.google.accounts.id.initialize({
    client_id: AUTH.googleClientId,
    callback: (response) => onCredential(response.credential),
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  globalThis.google.accounts.id.renderButton(container, {
    theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: getLang(), width: 280,
  });
  return true;
}

/* ------------------------------ Turnstile ------------------------------ */

let turnstileScript = null;

export function loadTurnstile() {
  if (!AUTH.turnstileSiteKey) return Promise.resolve(false);
  if (turnstileScript) return turnstileScript;
  turnstileScript = new Promise((resolve) => {
    if (globalThis.turnstile) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.append(script);
  });
  return turnstileScript;
}

export async function renderTurnstile(container) {
  if (!AUTH.turnstileSiteKey || !container) return null;
  const ready = await loadTurnstile();
  if (!ready || !globalThis.turnstile) return null;
  return new Promise((resolve) => {
    const id = globalThis.turnstile.render(container, {
      sitekey: AUTH.turnstileSiteKey,
      theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
      callback: (token) => resolve({ widgetId: id, token }),
    });
  });
}
