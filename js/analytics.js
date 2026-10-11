/**
 * Аналитика: цели по воронке подбора.
 *
 * Принципы:
 *   • ничего не грузим, пока счётчики не заданы в config.js;
 *   • Яндекс.Метрика ставит cookie, поэтому подключается только после согласия
 *     (ADS.consentRequired учитывается так же, как для рекламы);
 *   • Plausible/Umami — без cookie, их можно включать сразу;
 *   • события шлём в оба счётчика, если они есть, и никогда не роняем приложение.
 */
import { ANALYTICS, ADS } from './config.js';

let metrikaReady = false;
let metrikaLoaded = false;

const hasMetrika = () => Boolean(ANALYTICS.yandexMetrika);
const hasPlausible = () => Boolean(ANALYTICS.plausibleDomain);

/** Подключает счётчики: Plausible — сразу (без cookie), Метрику — только с согласием */
export function initAnalytics({ consent = null } = {}) {
  // при пре-рендере счётчики не ставим: тег попал бы в HTML и грузился дважды
  if (globalThis.__GP_PRERENDER__) return false;
  if (hasPlausible() && !document.querySelector('script[data-pn-analytics="plausible"]')) {
    const script = document.createElement('script');
    script.defer = true;
    script.dataset.pnAnalytics = 'plausible';
    script.dataset.domain = ANALYTICS.plausibleDomain;
    script.src = 'https://plausible.io/js/script.js';
    document.head.append(script);
  }

  const mayUseCookies = !ADS.consentRequired || consent === 'all';
  if (mayUseCookies && hasMetrika() && !metrikaLoaded) {
    loadMetrika();
  }
  return metrikaReady;
}

/**
 * Метрика без inline-скрипта: CSP сайта (_headers) не разрешает 'unsafe-inline',
 * и прежний сниппет через innerHTML браузер молча блокировал — счётчик не работал.
 * Очередь ym() создаём прямо в модуле, а tag.js подключаем обычным <script src>.
 */
function loadMetrika() {
  const counterId = Number(ANALYTICS.yandexMetrika);
  if (!Number.isSafeInteger(counterId) || counterId <= 0) return;
  metrikaLoaded = true;
  if (typeof globalThis.ym !== 'function') {
    const ym = function ym(...args) { (ym.a = ym.a || []).push(args); };
    ym.l = Date.now();
    globalThis.ym = ym;
  }
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.append(s);
  globalThis.ym(counterId, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
  metrikaReady = true;
}

/**
 * Событие воронки.
 * @param {string} event — имя цели: quiz_start, quiz_complete, mark_liked, game_open…
 * @param {object} [params] — плоские параметры (числа и строки)
 */
export function track(event, params = {}) {
  try {
    if (metrikaReady && typeof globalThis.ym === 'function') {
      globalThis.ym(ANALYTICS.yandexMetrika, 'reachGoal', event, params);
    }
    if (hasPlausible() && typeof globalThis.plausible === 'function') {
      globalThis.plausible(event, { props: params });
    }
  } catch { /* аналитика не должна мешать */ }
}

/** Просмотр страницы: SPA не перезагружает документ, поэтому сообщаем вручную */
export function trackPageview(path, title) {
  if (hasPlausible() && typeof globalThis.plausible === 'function') {
    try { globalThis.plausible('pageview', { u: `${location.origin}${path}`, props: { title } }); } catch { /* ignore */ }
  }
  if (metrikaReady && typeof globalThis.ym === 'function') {
    try { globalThis.ym(ANALYTICS.yandexMetrika, 'hit', `${location.origin}${path}`, { title }); } catch { /* ignore */ }
  }
}
