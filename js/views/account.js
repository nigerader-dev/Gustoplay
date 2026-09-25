/** Аккаунт: регистрация, вход (в том числе через Google), синхронизация вкуса, сессии, удаление. */
import { t, getLang } from '../i18n.js';
import { AUTH, SECURITY, SITE } from '../config.js';
import { esc, emptyState } from './components.js';
import { getProfile, replaceProfile } from '../store.js';
import {
  apiReady, apiBase, isLoggedIn, getUser, register, login, loginWithGoogle, logout,
  me, pullProfile, pushProfile, listSessions, revokeSession, deleteAccount,
  requestPasswordReset, confirmPasswordReset,
  renderGoogleButton, renderTurnstile,
} from '../api.js';

const state = {
  mode: 'login',        // login | register | forgot | reset
  resetToken: '',
  busy: false,
  error: '',
  notice: '',
  sessions: [],
};

const T = {
  ru: {
    title: 'Аккаунт',
    lead: 'Аккаунт нужен, чтобы профиль вкуса и отметки игр синхронизировались между устройствами. Можно не регистрироваться — тогда всё хранится только в этом браузере.',
    loginTab: 'Вход',
    registerTab: 'Регистрация',
    email: 'E-mail',
    password: 'Пароль',
    name: 'Имя (необязательно)',
    loginBtn: 'Войти',
    registerBtn: 'Создать аккаунт',
    googleBtn: 'Продолжить с Google',
    or: 'или',
    loggedAs: 'Вы вошли как',
    syncTitle: 'Синхронизация вкуса',
    syncText: 'Профиль вкуса хранится в аккаунте. При входе он загружается с сервера, а изменения отправляются автоматически.',
    pull: 'Загрузить с сервера',
    push: 'Отправить на сервер',
    sessions: 'Активные сессии',
    revoke: 'Завершить',
    logout: 'Выйти',
    deleteAccount: 'Удалить аккаунт',
    deleteConfirm: 'Удалить аккаунт и все данные вкуса на сервере? Действие необратимо.',
    noApi: 'Сервер аккаунтов не подключён',
    noApiText: 'Сайт работает в локальном режиме: профиль вкуса хранится в браузере. Чтобы включить аккаунты, разверните API (worker/README.md) и укажите apiBase в js/config.js.',
    passwordHint: 'Минимум {n} символов, желательно буквы разных регистров, цифры и символы.',
    passwordWeak: 'Слишком короткий пароль',
    passwordOk: 'Надёжный пароль',
    localMode: 'Локальный режим',
    synced: 'Профиль синхронизирован',
    checkEmail: 'Мы отправили письмо для подтверждения адреса.',
    forgot: 'Забыли пароль?',
    forgotTitle: 'Сброс пароля',
    forgotText: 'Укажите e-mail аккаунта — если он существует, мы отправим ссылку для нового пароля. Ссылка живёт час.',
    sendLink: 'Отправить ссылку',
    resetTitle: 'Новый пароль',
    resetText: 'Придумайте новый пароль. Все активные сессии будут завершены — это защита, если аккаунт увели.',
    resetBtn: 'Сохранить пароль',
    resetDone: 'Пароль обновлён. Теперь можно войти.',
    resetBadToken: 'Ссылка неполная или устарела — запросите новую.',
    backToLogin: '← Ко входу',
    resetSent: 'Если такой адрес зарегистрирован, письмо уже в пути. Проверьте папку «Спам».',
    emailBad: 'Проверьте адрес e-mail',
    deleted: 'Аккаунт удалён',
    browser: 'Браузер',
  },
  en: {
    title: 'Account',
    lead: 'An account syncs your taste profile and game marks between devices. Signing up is optional — otherwise everything stays in this browser.',
    loginTab: 'Sign in',
    registerTab: 'Sign up',
    email: 'E-mail',
    password: 'Password',
    name: 'Name (optional)',
    loginBtn: 'Sign in',
    registerBtn: 'Create account',
    googleBtn: 'Continue with Google',
    or: 'or',
    loggedAs: 'Signed in as',
    syncTitle: 'Taste sync',
    syncText: 'Your taste profile lives in the account. It is downloaded on sign-in and uploaded automatically.',
    pull: 'Pull from server',
    push: 'Push to server',
    sessions: 'Active sessions',
    revoke: 'Revoke',
    logout: 'Sign out',
    deleteAccount: 'Delete account',
    deleteConfirm: 'Delete the account and all taste data on the server? This cannot be undone.',
    noApi: 'Account server is not connected',
    noApiText: 'The site runs in local mode: your taste profile stays in the browser. To enable accounts, deploy the API (worker/README.md) and set apiBase in js/config.js.',
    passwordHint: 'At least {n} characters, ideally mixed case, digits and symbols.',
    passwordWeak: 'Password is too short',
    passwordOk: 'Strong password',
    localMode: 'Local mode',
    synced: 'Profile synced',
    checkEmail: 'We sent a confirmation e-mail.',
    forgot: 'Forgot your password?',
    forgotTitle: 'Password reset',
    forgotText: 'Enter your account e-mail — if it exists, we will send a link to set a new password. The link lives for one hour.',
    sendLink: 'Send the link',
    resetTitle: 'New password',
    resetText: 'Choose a new password. All active sessions will be closed — that is the point if your account was hijacked.',
    resetBtn: 'Save password',
    resetDone: 'Password updated. You can sign in now.',
    resetBadToken: 'The link is incomplete or expired — request a new one.',
    backToLogin: '← Back to sign in',
    resetSent: 'If that address exists, the e-mail is on its way. Check the Spam folder too.',
  },
};
const s = () => T[getLang()] || T.ru;

/* ------------------------------------------------------------------ */

export function render(ctx = {}) {
  const L = s();
  // ссылка из письма: #/account?reset=ТОКЕН
  const tokenFromLink = ctx.query?.reset;
  if (tokenFromLink && state.mode !== 'reset') {
    state.mode = 'reset';
    state.resetToken = tokenFromLink;
  }
  if (!apiReady() || !apiBase()) {
    return `<section class="section account">
      <header class="section-head"><h1>${esc(L.title)}</h1><p>${esc(L.lead)}</p></header>
      ${emptyState(L.noApi, L.noApiText, `<a class="btn btn-primary" href="#/quiz" data-action="nav">${esc(t('home.cta.start'))}</a>`)}
    </section>`;
  }

  const user = getUser();
  const isAuth = isLoggedIn();

  return `<section class="section account">
    <header class="section-head">
      <h1>${esc(L.title)}</h1>
      <p>${esc(L.lead)}</p>
    </header>

    ${state.error ? `<div class="notice notice-error">${esc(state.error)}</div>` : ''}
    ${state.notice ? `<div class="notice">${esc(state.notice)}</div>` : ''}

    ${isAuth && state.mode !== 'reset' ? authBlock(user, L) : formBlock(L)}
  </section>`;
}

function formBlock(L) {
  const isRegister = state.mode === 'register';
  const isForgot = state.mode === 'forgot';
  const isReset = state.mode === 'reset';

  if (isForgot) {
    return `
    <div class="auth-card">
      <h3>${esc(L.forgotTitle)}</h3>
      <p class="muted">${esc(L.forgotText)}</p>
      <form id="forgot-form" class="auth-form" novalidate>
        <label class="field">
          <span>${esc(L.email)}</span>
          <input class="input" type="email" name="email" required autocomplete="email" maxlength="120" inputmode="email">
        </label>
        ${AUTH.turnstileSiteKey ? '<div id="turnstile-slot" class="turnstile-slot"></div>' : ''}
        <button type="submit" class="btn btn-primary btn-lg" ${state.busy ? 'disabled' : ''}>${esc(L.sendLink)}</button>
      </form>
      <p class="panel-actions"><button type="button" class="btn btn-ghost" data-action="auth-tab" data-mode="login">${esc(L.backToLogin)}</button></p>
    </div>`;
  }

  if (isReset) {
    return `
    <div class="auth-card">
      <h3>${esc(L.resetTitle)}</h3>
      <p class="muted">${esc(state.resetToken ? L.resetText : L.resetBadToken)}</p>
      ${state.resetToken ? `
      <form id="reset-form" class="auth-form" novalidate>
        <label class="field">
          <span>${esc(L.password)}</span>
          <input class="input" type="password" name="password" required
            minlength="${SECURITY.minPasswordLength}" autocomplete="new-password">
          <small class="muted">${esc(L.passwordHint.replace('{n}', String(SECURITY.minPasswordLength)))}</small>
          <span class="pw-meter"><i></i></span>
        </label>
        <button type="submit" class="btn btn-primary btn-lg" ${state.busy ? 'disabled' : ''}>${esc(L.resetBtn)}</button>
      </form>` : ''}
      <p class="panel-actions"><button type="button" class="btn btn-ghost" data-action="auth-tab" data-mode="login">${esc(L.backToLogin)}</button></p>
    </div>`;
  }

  return `
  <div class="auth-card">
    <div class="tabs">
      <button type="button" class="tab ${isRegister ? '' : 'on'}" data-action="auth-tab" data-mode="login">${esc(L.loginTab)}</button>
      <button type="button" class="tab ${isRegister ? 'on' : ''}" data-action="auth-tab" data-mode="register">${esc(L.registerTab)}</button>
    </div>

    <form id="auth-form" class="auth-form" autocomplete="on" novalidate>
      ${isRegister ? `<label class="field">
        <span>${esc(L.name)}</span>
        <input class="input" type="text" name="name" autocomplete="name" maxlength="60">
      </label>` : ''}
      <label class="field">
        <span>${esc(L.email)}</span>
        <input class="input" type="email" name="email" required autocomplete="email" maxlength="120" inputmode="email">
      </label>
      <label class="field">
        <span>${esc(L.password)}</span>
        <input class="input" type="password" name="password" required
          minlength="${SECURITY.minPasswordLength}" autocomplete="${isRegister ? 'new-password' : 'current-password'}">
        <small class="muted">${esc(L.passwordHint.replace('{n}', String(SECURITY.minPasswordLength)))}</small>
        ${SECURITY.passwordStrengthMeter && isRegister ? '<span class="pw-meter"><i></i></span>' : ''}
      </label>
      ${AUTH.turnstileSiteKey ? '<div id="turnstile-slot" class="turnstile-slot"></div>' : ''}
      <button type="submit" class="btn btn-primary btn-lg" ${state.busy ? 'disabled' : ''}>
        ${esc(isRegister ? L.registerBtn : L.loginBtn)}
      </button>
    </form>

    ${!isRegister ? `<p class="auth-aside"><button type="button" class="btn-link" data-action="auth-tab" data-mode="forgot">${esc(L.forgot)}</button></p>` : ''}

    ${AUTH.googleClientId ? `<div class="auth-divider"><span>${esc(L.or)}</span></div>
      <div id="google-button" class="google-slot"></div>` : ''}
  </div>`;
}

function authBlock(user, L) {
  const profile = getProfile();
  const marks = Object.keys(profile.marks || {}).length;
  return `
  <div class="account-grid">
    <div class="panel">
      <h3>${esc(L.loggedAs)}: ${esc(user?.name || user?.email || '')}</h3>
      <p class="muted">${esc(user?.email || '')} · ${user?.provider === 'google' ? 'Google' : 'e-mail'}</p>
      <div class="panel-actions">
        <button type="button" class="btn btn-outline" data-action="auth-logout">${esc(L.logout)}</button>
        <button type="button" class="btn btn-ghost btn-danger" data-action="auth-delete">🗑 ${esc(L.deleteAccount)}</button>
      </div>
    </div>

    <div class="panel">
      <h3>${esc(L.syncTitle)}</h3>
      <p class="muted">${esc(L.syncText)}</p>
      <p class="muted">${esc(t('profile.stats', {
        liked: countMarks('liked'), played: countMarks('played'),
        wishlist: countMarks('wishlist'), disliked: countMarks('disliked'),
      }))} · ${marks}</p>
      <div class="panel-actions">
        <button type="button" class="btn btn-outline" data-action="sync-pull" ${state.busy ? 'disabled' : ''}>⬇️ ${esc(L.pull)}</button>
        <button type="button" class="btn btn-primary" data-action="sync-push" ${state.busy ? 'disabled' : ''}>⬆️ ${esc(L.push)}</button>
      </div>
    </div>

    <div class="panel">
      <h3>${esc(L.sessions)}</h3>
      <div class="sessions" id="sessions-list">
        ${state.sessions.length
          ? state.sessions.map((item) => `<div class="session-row">
              <span>${esc(item.device || 'Браузер')}</span>
              <span class="muted">${esc(item.createdAt || '')}</span>
              <button type="button" class="btn btn-ghost btn-sm" data-action="session-revoke" data-id="${esc(item.id)}">${esc(L.revoke)}</button>
            </div>`).join('')
          : `<p class="muted">${esc(t('common.loading'))}</p>`}
      </div>
      ${AUTH.sessionsList ? '' : ''}
    </div>

    <div class="panel">
      <h3>${esc(t('about.privacy.title'))}</h3>
      <p class="muted">${esc(t('about.privacy.text'))}</p>
      <p class="muted">GustoPlay · ${esc(SITE.domain)}</p>
    </div>
  </div>`;
}

const countMarks = (status) => Object.values(getProfile().marks || {}).filter((m) => m.status === status).length;

/* ------------------------------------------------------------------ */

export function mount(root) {
  const L = s();
  root.querySelectorAll('[data-action="auth-tab"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      state.error = '';
      window.dispatchEvent(new CustomEvent('gf:rerender'));
    });
  });

  const forgotForm = root.querySelector('#forgot-form');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = String(new FormData(forgotForm).get('email') || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return fail('Проверьте адрес e-mail');
      state.busy = true;
      try {
        const result = await requestPasswordReset({ email, turnstileToken: await getTurnstileToken() });
        state.mode = 'login';
        state.error = '';
        state.notice = result?.debugLink
          ? `Почта не настроена. Ссылка для проверки: ${result.debugLink}`
          : s().resetSent;
      } catch (error) {
        fail(error.message);
        return;
      } finally {
        state.busy = false;
      }
      window.dispatchEvent(new CustomEvent('gf:rerender'));
    });
  }

  const resetForm = root.querySelector('#reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const password = String(new FormData(resetForm).get('password') || '');
      if (password.length < SECURITY.minPasswordLength) return fail(s().passwordWeak);
      state.busy = true;
      try {
        await confirmPasswordReset({ token: state.resetToken, password });
        state.mode = 'login';
        state.resetToken = '';
        state.error = '';
        state.notice = s().resetDone;
        if (globalThis.history?.replaceState) globalThis.history.replaceState(null, '', globalThis.location.pathname + '#/account');
      } catch (error) {
        fail(error.message);
        return;
      } finally {
        state.busy = false;
      }
      window.dispatchEvent(new CustomEvent('gf:rerender'));
    });
  }

  const form = root.querySelector('#auth-form');
  if (form) {
    // индикатор надёжности пароля
    const pw = form.querySelector('input[name="password"]');
    const meter = form.querySelector('.pw-meter i');
    pw?.addEventListener('input', () => {
      if (!meter) return;
      const score = strength(pw.value);
      meter.style.width = `${score}%`;
      meter.dataset.level = score >= 70 ? 'good' : score >= 40 ? 'mid' : 'bad';
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const email = String(data.get('email') || '').trim();
      const password = String(data.get('password') || '');
      const name = String(data.get('name') || '').trim();

      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return fail('Проверьте адрес e-mail');
      if (password.length < SECURITY.minPasswordLength) return fail(L.passwordWeak);

      state.busy = true;
      try {
        const turnstileToken = await getTurnstileToken();
        if (state.mode === 'register') {
          const user = await register({ email, password, name, turnstileToken });
          await afterAuth(user, { upload: true });
        } else {
          const user = await login({ email, password, turnstileToken });
          await afterAuth(user, { upload: false });
        }
      } catch (error) {
        fail(error.message);
      } finally {
        state.busy = false;
      }
    });
  }

  // официальная кнопка Google
  const googleSlot = root.querySelector('#google-button');
  if (googleSlot) {
    renderGoogleButton(googleSlot, async (credential) => {
      state.busy = true;
      try {
        const user = await loginWithGoogle(credential);
        await afterAuth(user, { upload: false });
      } catch (error) {
        fail(error.message);
      } finally {
        state.busy = false;
      }
    }).then((ok) => {
      if (!ok) googleSlot.innerHTML = `<p class="muted">${esc(t('common.loading'))}</p>`;
    });
  }

  const turnstileSlot = root.querySelector('#turnstile-slot');
  if (turnstileSlot) renderTurnstile(turnstileSlot);

  root.querySelector('[data-action="auth-logout"]')?.addEventListener('click', async () => {
    await logout();
    // после выхода возвращаем форму в режим входа: заново регистрироваться незачем
    state.mode = 'login';
    state.error = '';
    state.notice = getLang() === 'ru' ? 'Вы вышли из аккаунта' : 'You are signed out';
    window.dispatchEvent(new CustomEvent('gf:rerender'));
  });

  root.querySelector('[data-action="auth-delete"]')?.addEventListener('click', async () => {
    if (!confirm(s().deleteConfirm)) return;
    try {
      await deleteAccount();
      state.notice = 'Аккаунт удалён';
      window.dispatchEvent(new CustomEvent('gf:rerender'));
    } catch (error) { fail(error.message); }
  });

  root.querySelector('[data-action="sync-pull"]')?.addEventListener('click', async () => {
    state.busy = true;
    try {
      const remote = await pullProfile();
      if (remote) {
        replaceProfile(remote);
        state.notice = `${s().synced} · ${getLang() === 'ru' ? 'загружено с сервера' : 'pulled from server'}`;
      } else {
        state.notice = getLang() === 'ru' ? 'На сервере пока нет профиля — отправьте свой' : 'No profile on the server yet — push yours';
      }
    } catch (error) { fail(error.message); } finally {
      state.busy = false;
      window.dispatchEvent(new CustomEvent('gf:rerender'));
    }
  });

  root.querySelector('[data-action="sync-push"]')?.addEventListener('click', async () => {
    state.busy = true;
    try {
      await pushProfile(getProfile());
      state.notice = s().synced;
    } catch (error) { fail(error.message); } finally {
      state.busy = false;
      window.dispatchEvent(new CustomEvent('gf:rerender'));
    }
  });

  // Отзыв сессий — делегированием: список подгружается асинхронно и заменяет кнопки,
  // прямые обработчики на них умирали бы вместе со старыми узлами (кнопки не работали).
  root.querySelector('#sessions-list')?.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-action="session-revoke"]');
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    try {
      await revokeSession(btn.dataset.id);
      state.sessions = await listSessions();
    } catch (error) { fail(error.message); return; }
    window.dispatchEvent(new CustomEvent('gf:rerender'));
  });

  if (isLoggedIn()) {
    listSessions().then((items) => {
      state.sessions = items;
      const list = app$('#sessions-list');
      if (list) list.innerHTML = items.map((item) => `<div class="session-row">
        <span>${esc(item.device || 'Браузер')}</span>
        <span class="muted">${esc(item.createdAt || '')}</span>
        <button type="button" class="btn btn-ghost btn-sm" data-action="session-revoke" data-id="${esc(item.id)}">${esc(s().revoke)}</button>
      </div>`).join('');
    }).catch(() => {});
  }
}

const app$ = (selector) => document.querySelector(selector);

function fail(message) {
  state.error = message;
  state.busy = false;
  window.dispatchEvent(new CustomEvent('gf:rerender'));
}

/** После успешного входа: подтягиваем серверный профиль или загружаем локальный */
async function afterAuth(user, { upload = false } = {}) {
  state.error = '';
  try {
    if (upload) {
      await pushProfile(getProfile());
    } else {
      const remote = await pullProfile();
      if (remote) replaceProfile(remote);
      else await pushProfile(getProfile());
    }
    state.notice = s().synced;
  } catch {
    // сервер мог быть недоступен — не мешаем пользователю пользоваться сайтом
  }
  window.dispatchEvent(new CustomEvent('gf:auth-changed', { detail: { user } }));
  window.dispatchEvent(new CustomEvent('gf:rerender'));
}

async function getTurnstileToken() {
  const widget = document.querySelector('#turnstile-slot');
  if (!AUTH.turnstileSiteKey || !widget) return undefined;
  const result = await renderTurnstile(widget);
  return result?.token;
}

/** Оценка надёжности пароля 0..100 (для индикатора) */
function strength(value) {
  let score = Math.min(value.length * 5, 50);
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 15;
  if (/\d/.test(value)) score += 15;
  if (/[^\w\s]/.test(value)) score += 20;
  return Math.min(score, 100);
}

export const title = () => `${s().title} — ${SITE.name}`;
export const description = () => s().lead;
