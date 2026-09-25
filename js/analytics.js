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

function loadMetrika() {
  metrikaLoaded = true;
  const s = document.createElement('script');
  s.innerHTML = `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(${ANALYTICS.yandexMetrika},'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false});`;
  document.head.append(s);
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
