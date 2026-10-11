/** Аккаунт: регистрация, вход (в том числе через Google), синхронизация вкуса, сессии, удаление. */
import { t, getLang } from '../i18n.js';
import { icon } from '../icons.js';
import { AUTH, SECURITY, SITE } from '../config.js';
import { esc, emptyState } from './components.js';
import { getProfile, adoptRemote, flushSync } from '../store.js';
import {
  apiReady, apiBase, isLoggedIn, getUser, register, login, loginWithGoogle, logout,
  me, pullProfile, pushProfile, listSessions, revokeSession,
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
  sessionsLoaded: false,
};

const T = {
  ru: {
    title: 'Аккаунт',
    lead: 'Войдите, чтобы ваш подбор и отметки игр сохранялись в аккаунте и были доступны на любом устройстве.',
    loginTab: 'Вход',
    registerTab: 'Регистрация',
    email: 'E-mail',
    password: 'Пароль',
    name: 'Имя (необязательно)',
    loginBtn: 'Войти',
    registerBtn: 'Создать аккаунт',
    googleBtn: 'Продолжить с Google',
    or: 'или',
    orEmail: 'или по e-mail',
    loggedAs: 'Вы вошли как',
    syncTitle: 'Ваши данные в аккаунте',
    syncText: 'Ответы и отметки сохраняются в аккаунте автоматически — войдите на любом устройстве, и всё будет на месте.',
    viaGoogle: 'вход через Google',
    viaEmail: 'вход по e-mail',
    toResults: 'Мой подбор',
    toProfile: 'Мой вкус',
    since: 'вход',
    thisDevice: 'Это устройство',
    deleteHint: 'Чтобы удалить аккаунт и все данные, напишите нам:',
    whyTitle: 'Зачем аккаунт',
    why: ['Подбор и отметки не потеряются, даже если очистить браузер', 'Всё доступно и с телефона, и с компьютера', 'Вход через Google — в один клик'],
    pull: 'Загрузить из аккаунта',
    push: 'Сохранить в аккаунт сейчас',
    sessions: 'Устройства, где выполнен вход',
    revoke: 'Выйти',
    logout: 'Выйти',
    deleteAccount: 'Удалить аккаунт',
    deleteConfirm: 'Удалить аккаунт вместе со всеми сохранёнными ответами и отметками? Это нельзя отменить.',
    noApi: 'Вход в аккаунт сейчас недоступен',
    noApiText: 'Подбор работает как обычно: ваши ответы и отметки сохраняются в этом браузере.',
    passwordHint: 'Минимум {n} символов, желательно буквы разных регистров, цифры и символы.',
    passwordWeak: 'Слишком короткий пароль',
    passwordOk: 'Надёжный пароль',
    localMode: 'Локальный режим',
    synced: 'Данные сохранены в аккаунте',
    checkEmail: 'Мы отправили письмо для подтверждения адреса.',
    forgot: 'Забыли пароль?',
    forgotTitle: 'Сброс пароля',
    forgotText: 'Укажите e-mail аккаунта — если он зарегистрирован, мы пришлём ссылку для нового пароля. Ссылка действует один час.',
    sendLink: 'Отправить ссылку',
    resetTitle: 'Новый пароль',
    resetText: 'Придумайте новый пароль. После сохранения вход будет завершён на всех устройствах.',
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
    lead: 'Sign in so your picks and game marks are saved to your account and available on any device.',
    loginTab: 'Sign in',
    registerTab: 'Sign up',
    email: 'E-mail',
    password: 'Password',
    name: 'Name (optional)',
    loginBtn: 'Sign in',
    registerBtn: 'Create account',
    googleBtn: 'Continue with Google',
    or: 'or',
    orEmail: 'or with e-mail',
    loggedAs: 'Signed in as',
    syncTitle: 'Your data in the account',
    syncText: 'Your answers and marks are saved to your account automatically — sign in on any device and they’re there.',
    viaGoogle: 'Google sign-in',
    viaEmail: 'e-mail sign-in',
    toResults: 'My picks',
    toProfile: 'My taste',
    since: 'signed in',
    thisDevice: 'This device',
    deleteHint: 'To delete your account and all data, email us:',
    whyTitle: 'Why an account',
    why: ['Your picks and marks are kept even if you clear the browser', 'Available on both your phone and computer', 'Google sign-in in one click'],
    browser: 'Browser',
    pull: 'Load from account',
    push: 'Save to account now',
    sessions: 'Devices you’re signed in on',
    revoke: 'Sign out',
    logout: 'Sign out',
    deleteAccount: 'Delete account',
    deleteConfirm: 'Delete the account with all saved answers and marks? This cannot be undone.',
    noApi: 'Sign-in is unavailable right now',
    noApiText: 'Matching works as usual: your answers and marks are saved in this browser.',
    passwordHint: 'At least {n} characters, ideally mixed case, digits and symbols.',
    passwordWeak: 'Password is too short',
    passwordOk: 'Strong password',
    localMode: 'Local mode',
    synced: 'Saved to your account',
    checkEmail: 'We sent a confirmation e-mail.',
    forgot: 'Forgot your password?',
    forgotTitle: 'Password reset',
    forgotText: 'Enter your account e-mail — if it’s registered, we’ll send a link to set a new password. The link is valid for one hour.',
    sendLink: 'Send the link',
    resetTitle: 'New password',
    resetText: 'Choose a new password. Once saved, you’ll be signed out on all devices.',
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
      ${isAuth ? '' : `<p>${esc(L.lead)}</p>`}
    </header>

    ${state.error ? `<div class="notice notice-error">${esc(state.error)}</div>` : ''}
    ${noticeHtml()}

    ${isAuth && state.mode !== 'reset' ? authBlock(user, L) : formBlock(L)}
  </section>`;
}

/**
 * Сообщение об успехе («Вы вышли», «Пароль обновлён») — короткое и зелёное. Раньше оно
 * висело жёлтой плашкой-предупреждением до перезагрузки страницы.
 */
let noticeShownAt = 0;
let noticeText = '';
function noticeHtml() {
  if (state.notice && state.notice !== noticeText) { noticeText = state.notice; noticeShownAt = Date.now(); }
  if (!state.notice || Date.now() - noticeShownAt > 6000) { state.notice = ''; return ''; }
  setTimeout(() => {
    if (Date.now() - noticeShownAt >= 6000) document.querySelector('.notice-success')?.remove();
  }, 6100);
  return `<div class="notice notice-success" role="status">${icon('check')} ${esc(state.notice)}</div>`;
}

function formBlock(L) {
  const isRegister = state.mode === 'register';
  const isForgot = state.mode === 'forgot';
  const isReset = state.mode === 'reset';

  if (isForgot) {
    return `
    <div class="auth-card">
      <h2 class="h-lg">${esc(L.forgotTitle)}</h2>
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
      <h2 class="h-lg">${esc(L.resetTitle)}</h2>
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

  const google = AUTH.googleClientId ? `<div id="google-button" class="google-slot"></div>
      <div class="auth-divider"><span>${esc(L.orEmail)}</span></div>` : '';
  return `
  <div class="auth-layout">
  <div class="auth-card">
    ${google}
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
        ${isRegister ? `<small class="muted">${esc(L.passwordHint.replace('{n}', String(SECURITY.minPasswordLength)))}</small>` : ''}
        ${SECURITY.passwordStrengthMeter && isRegister ? '<span class="pw-meter"><i></i></span>' : ''}
      </label>
      ${AUTH.turnstileSiteKey ? '<div id="turnstile-slot" class="turnstile-slot"></div>' : ''}
      <button type="submit" class="btn btn-primary btn-lg" ${state.busy ? 'disabled' : ''}>
        ${esc(isRegister ? L.registerBtn : L.loginBtn)}
      </button>
    </form>

    ${!isRegister ? `<p class="auth-aside"><button type="button" class="btn-link" data-action="auth-tab" data-mode="forgot">${esc(L.forgot)}</button></p>` : ''}
  </div>
  <aside class="auth-why">
    <h2 class="h-base">${esc(L.whyTitle)}</h2>
    <ul>${L.why.map((w) => `<li>${icon('check')} ${esc(w)}</li>`).join('')}</ul>
  </aside>
  </div>`;
}

function authBlock(user, L) {
  const name = user?.name || (user?.email || '').split('@')[0] || '';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'G';
  const stats = [
    ['liked', 'thumbsUp', t('mark.liked')],
    ['played', 'controller', t('mark.played')],
    ['wishlist', 'bookmark', t('mark.wishlist')],
    ['disliked', 'thumbsDown', t('mark.disliked')],
  ];
  return `
  <div class="account-layout">
    <div class="account-card">
      <div class="account-head">
        <span class="account-avatar" aria-hidden="true">${esc(initials)}</span>
        <div class="account-who">
          <h2>${esc(name)}</h2>
          <p class="muted">${esc(user?.email || '')} · ${esc(user?.provider === 'google' ? L.viaGoogle : L.viaEmail)}</p>
        </div>
        <button type="button" class="btn btn-outline" data-action="auth-logout">${esc(L.logout)}</button>
      </div>
      <div class="account-stats">
        ${stats.map(([status, ic, label]) => `<a class="account-stat" href="#/profile" data-action="nav">
          <span class="account-stat-icon">${icon(ic)}</span>
          <strong>${countMarks(status)}</strong>
          <span>${esc(label)}</span>
        </a>`).join('')}
      </div>
      <p class="account-sync">${icon('check')} ${esc(L.syncText)}</p>
      <div class="panel-actions">
        <a class="btn btn-primary" href="#/results" data-action="nav">${esc(L.toResults)}</a>
        <a class="btn btn-ghost" href="#/profile" data-action="nav">${esc(L.toProfile)}</a>
      </div>
    </div>

    ${AUTH.sessionsList ? `<div class="account-card">
      <h2 class="h-base">${esc(L.sessions)}</h2>
      <div class="sessions" id="sessions-list">${sessionsHtml(L)}</div>
    </div>` : ''}

    <p class="account-foot muted">${esc(L.deleteHint)} <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a></p>
  </div>`;
}

/** Дата входа человеческим языком: «11 октября 2026» вместо 2026-10-11 */
function prettyDate(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(getLang() === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function sessionsHtml(L) {
  if (!state.sessions.length) return `<p class="muted">${esc(state.sessionsLoaded ? t('account.noSessions') : t('common.loading'))}</p>`;
  // текущее устройство — первым и без кнопки выхода: для него есть «Выйти» сверху
  const items = [...state.sessions].sort((a, b) => Number(b.current) - Number(a.current));
  return items.map((item) => `<div class="session-row">
      <span class="session-device">${icon(/телефон|планшет|phone|tablet/i.test(item.device || '') ? 'smartphone' : 'monitor')} ${esc(deviceLabel(item.device, L))}</span>
      <span class="muted">${esc(L.since)} ${esc(prettyDate(item.createdAt))}</span>
      ${item.current
        ? `<span class="session-current">${esc(L.thisDevice)}</span>`
        : `<button type="button" class="btn btn-ghost btn-sm" data-action="session-revoke" data-id="${esc(item.id)}">${esc(L.revoke)}</button>`}
    </div>`).join('');
}

const DEVICE_EN = { Телефон: 'Phone', Планшет: 'Tablet', Компьютер: 'Computer' };
const deviceLabel = (device, L) => (getLang() === 'ru' ? device || L.browser : DEVICE_EN[device] || device || L.browser);

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
    // Сначала дошлём профиль: после выхода токен стёрт, и отправлять будет нечем —
    // последние отметки, сделанные минуту назад, остались бы только в этом браузере.
    await flushSync();
    await logout();
    // после выхода возвращаем форму в режим входа: заново регистрироваться незачем
    state.mode = 'login';
    state.error = '';
    state.notice = getLang() === 'ru' ? 'Вы вышли из аккаунта' : 'You are signed out';
    window.dispatchEvent(new CustomEvent('gf:rerender'));
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
      state.sessionsLoaded = true;
    } catch (error) { fail(error.message); return; }
    window.dispatchEvent(new CustomEvent('gf:rerender'));
  });

  if (isLoggedIn() && AUTH.sessionsList) {
    listSessions().then((items) => {
      state.sessions = items;
      state.sessionsLoaded = true;
      const list = app$('#sessions-list');
      if (list) list.innerHTML = sessionsHtml(s());
    }).catch(() => { state.sessionsLoaded = true; });
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
      // Вход не должен «обнулять» то, что отмечено в этом браузере: сливаем профили
      // (отметки — по более свежей дате) и отправляем объединённый на сервер.
      const merged = adoptRemote(remote);
      if (remote) await pushProfile(merged);
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
