/** Accessible, bilingual support form with explicit mailto fallback and no client-side persistence. */
import { t, getLang } from '../i18n.js';
import { SITE } from '../config.js';
import { esc } from './components.js';
import { submitSupportMessage } from '../api.js';

export function render() {
  const lang = getLang();
  const title = t('support.title');
  return `
  <section class="section support-page">
    <header class="section-head">
      <h1>${esc(title)}</h1>
      <p>${esc(t('support.lead'))}</p>
    </header>
    <form id="support-form" class="auth-card auth-form support-card" novalidate>
      <label class="field" for="support-name">${esc(t('support.name'))}
        <input class="input" id="support-name" name="name" type="text" autocomplete="name" minlength="2" maxlength="80" required>
      </label>
      <label class="field" for="support-email">${esc(t('support.email'))}
        <input class="input" id="support-email" name="email" type="email" autocomplete="email" maxlength="254" required>
      </label>
      <label class="field" for="support-topic">${esc(t('support.topic'))}
        <select class="input" id="support-topic" name="topic" required>
          <option value="bug">${esc(t('support.topic.bug'))}</option>
          <option value="missing-game">${esc(t('support.topic.missing'))}</option>
          <option value="account">${esc(t('support.topic.account'))}</option>
          <option value="other">${esc(t('support.topic.other'))}</option>
        </select>
      </label>
      <label class="field" for="support-message">${esc(t('support.message'))}
        <textarea class="input support-textarea" id="support-message" name="message" minlength="20" maxlength="4000" rows="7" aria-describedby="support-message-hint" required></textarea>
        <small id="support-message-hint">${esc(t('support.message.hint'))}</small>
      </label>
      <div class="support-honeypot" aria-hidden="true">
        <label for="support-website">${esc(t('support.honeypot'))}</label>
        <input id="support-website" name="website" type="text" tabindex="-1" autocomplete="off">
      </div>
      <label class="switch support-consent" for="support-consent">
        <input id="support-consent" name="consent" type="checkbox" required>
        <span>${esc(t('support.consent'))}</span>
      </label>
      <p class="support-status" id="support-status" role="status" aria-live="polite" tabindex="-1"></p>
      <a class="btn btn-ghost support-mailto" id="support-mailto" hidden></a>
      <button class="btn btn-primary btn-lg" id="support-submit" type="submit">${esc(t('support.submit'))}</button>
      <noscript><p>${esc(lang === 'ru' ? 'Для формы требуется JavaScript. Напишите нам:' : 'JavaScript is required for the form. Email us:')} <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a></p></noscript>
    </form>
  </section>`;
}

export function title() { return `${t('support.title')} — GustoPlay`; }
export function description() { return t('support.lead'); }

function safeSessionGet(key) {
  try { return Number(globalThis.sessionStorage?.getItem(key) || 0); } catch { return 0; }
}
function safeSessionSet(key, value) {
  try { globalThis.sessionStorage?.setItem(key, String(value)); } catch { /* optional client-side throttle */ }
}

export function mount(root) {
  const form = root.querySelector('#support-form');
  if (!form) return;
  const status = form.querySelector('#support-status');
  const mailto = form.querySelector('#support-mailto');
  const submit = form.querySelector('#support-submit');
  const lang = getLang();
  const copy = (key) => t(key);
  const startedAt = Date.now();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    mailto.hidden = true;

    if (!form.reportValidity()) return;
    const now = Date.now();
    if (now - startedAt < 1800) {
      status.textContent = copy('support.tooFast');
      return;
    }
    const lastAttempt = safeSessionGet('gustoplay.support.attempt.v1');
    if (lastAttempt && now - lastAttempt < 30000) {
      status.textContent = copy('support.rateLimited');
      return;
    }

    const fields = new FormData(form);
    // The honeypot is deliberately silent; no form values are stored in browser storage.
    if (String(fields.get('website') || '').trim()) {
      form.reset();
      return;
    }
    const payload = {
      name: String(fields.get('name') || '').trim(),
      email: String(fields.get('email') || '').trim(),
      topic: String(fields.get('topic') || ''),
      message: String(fields.get('message') || '').trim(),
    };
    safeSessionSet('gustoplay.support.attempt.v1', now);
    submit.disabled = true;
    try {
      const result = await submitSupportMessage(payload);
      if (result?.sent === true) {
        status.textContent = copy('support.apiQueued');
        form.reset();
        return;
      }
      // A successful response without an explicit delivery receipt is not called "sent".
      showMailtoFallback({ status, mailto, payload, lang });
    } catch (error) {
      if (error?.status === 429) status.textContent = copy('support.rateLimited');
      else if (error?.status === 400) status.textContent = error.message || copy('support.tooFast');
      else showMailtoFallback({ status, mailto, payload, lang });
    } finally {
      submit.disabled = false;
    }
  });
}

function showMailtoFallback({ status, mailto, payload, lang }) {
  const subjectPrefix = lang === 'ru' ? 'Обращение в поддержку GustoPlay' : 'GustoPlay support request';
  const topicLabels = {
    bug: lang === 'ru' ? 'Ошибка или проблема' : 'Bug or problem',
    'missing-game': lang === 'ru' ? 'Предложить игру' : 'Suggest a game',
    account: lang === 'ru' ? 'Аккаунт и синхронизация' : 'Account and sync',
    other: lang === 'ru' ? 'Другое' : 'Other',
  };
  const subject = `${subjectPrefix}: ${topicLabels[payload.topic] || topicLabels.other}`;
  const body = [
    `${lang === 'ru' ? 'Имя' : 'Name'}: ${payload.name}`,
    `${lang === 'ru' ? 'E-mail для ответа' : 'Reply-to email'}: ${payload.email}`,
    '',
    payload.message,
  ].join(String.fromCharCode(10));
  mailto.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  mailto.textContent = t('support.openMail');
  mailto.hidden = false;
  status.textContent = t('support.fallback');
}
