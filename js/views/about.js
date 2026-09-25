/** «Как это работает» + политика конфиденциальности (нужна для модерации рекламных сетей). */
import { t, tp, getLang } from '../i18n.js';
import { icon } from '../icons.js';
import { GAMES, STATS } from '../catalog/index.js';
import { esc, adSlot, houseAd, cardsGrid } from './components.js';
import { GENRES, TAGS, MOODS } from '../taxonomy.js';
import { SITE } from '../config.js';

const FAQ = {
  ru: [
    ['Почему вы предлагаете именно эти игры?', 'Каждая игра получает скор из совпадений по настроению, жанрам, тегам и режимам, плюс качество, длина и цена. Отдельные веса у ваших отметок «играл / понравилось / не понравилось». Логика полностью видна в карточке — блок «Почему подходит».'],
    ['Как работают отметки игр?', '«Понравилось» усиливает теги, жанры и настроения этой игры, а «не понравилось» — ослабляет. Отметка «играл» убирает игру из выдачи, «хочу сыграть» поднимает её в начало. Пересчёт мгновенный, и его всегда можно отменить — достаточно снять отметку.'],
    ['Нужна ли регистрация?', 'Нет. Профиль вкуса хранится в localStorage браузера. На другом устройстве можно выгрузить профиль в JSON и вставить его там же.'],
    ['Как часто обновляется каталог?', 'Мы добавляем новые игры и правим теги каждую неделю. Если игры не хватает — напишите нам, мы поставим её в приоритет.'],
    ['Вы получаете деньги за рекомендации?', 'Нет. Рекомендации строит алгоритм, рекламные блоки помечены и не влияют на выдачу. В блоке покупки — только прямые ссылки: страница игры в Steam или официальный магазин издателя, без перепродавцов и накрутки позиций.'],
  ],
  en: [
    ['Why are these games recommended?', 'Each game gets a score from mood, genre, tag and mode matches plus quality, length and price. Your marks carry separate weights. Everything is visible in the "Why it fits" block.'],
    ['How do marks work?', 'Liked strengthens that game\u2019s tags, genres and moods; disliked weakens them. Played hides a game, wishlist pushes it up. Recalculation is instant and reversible.'],
    ['Do I need an account?', 'No. Your taste profile lives in browser localStorage and can be exported as JSON to move to another device.'],
    ['How often is the catalog updated?', 'We add games and fix tags weekly. Missing a game? Tell us and we will prioritise it.'],
    ['Do you get paid for recommendations?', 'No. Recommendations are algorithmic, ad blocks are labelled and do not affect results. The buy block shows direct links only: the game’s page in Steam or the publisher’s official store — no resellers, no paid placement.'],
  ],
};

// Текст политики конфиденциальности — один источник и для «Как это работает», и для /privacy.
const PRIVACY = {
  ru: [

        ['Какие данные мы собираем', 'Подбор игр работает без регистрации: профиль вкуса (ответы квиза и отметки игр) хранится в localStorage вашего браузера. Если вы создаёте аккаунт, на сервере сохраняются e-mail, имя (если указали) и тот же профиль вкуса — только чтобы синхронизировать его между устройствами.'],
        ['Пароль и вход через Google', 'Пароль хранится как необратимый хеш (PBKDF2-SHA256, 210 000 итераций) — восстановить его невозможно, только сбросить. При входе через Google мы получаем от Google только e-mail, имя и идентификатор аккаунта; пароль Google нам недоступен.'],
        ['Cookie и реклама', 'Для показа рекламы привлекаются сторонние сети (Яндекс.РСЯ, Google AdSense). Они могут устанавливать cookie и использовать идентификаторы устройства для персонализации объявлений. До вашего согласия рекламные скрипты не загружаются. Технические cookie используются только для сессии входа и не передаются рекламным сетям.'],
        ['Ваши права', `Вы можете в любой момент удалить профиль вкуса кнопкой «Сбросить всё» на странице «Мой вкус», выгрузить его в JSON, отозвать любую сессию или полностью удалить аккаунт на странице «Аккаунт» — вместе с ним удаляются все данные на сервере. Написать нам: ${SITE.email}.`],
        ['Безопасность', 'Соединение защищено HTTPS/HSTS, формы — Cloudflare Turnstile, попытки входа ограничены по частоте. Сессии можно отзывать по одной на странице «Аккаунт».'],
        ['Ссылки на магазины', 'Часть ссылок ведёт на сторонние магазины. Их политика конфиденциальности распространяется на действия на их стороне. Партнёрские метки (если включены) на стоимость для вас не влияют.']
],
  en: [
['What data we collect', 'Matching works without an account: your taste profile (quiz answers and game marks) lives in your browser localStorage. If you create an account, the server stores your e-mail, name (if given) and that same taste profile — solely to sync it across devices.'],
        ['Password and Google sign-in', 'Passwords are stored as irreversible hashes (PBKDF2-SHA256, 210 000 iterations) — they can be reset, never recovered. With Google sign-in we only receive your e-mail, name and account id; your Google password is never available to us.'],
        ['Cookies and ads', 'Third-party networks (Yandex, Google AdSense) may set cookies to personalise ads. Ad scripts are not loaded until you give consent. Technical cookies are used only for your sign-in session and are never shared with ad networks.'],
        ['Your rights', `You can delete your taste profile at any time with "Reset everything" on the My taste page, export it as JSON, revoke any session, or delete the whole account on the Account page — all server data goes with it. Contact us: ${SITE.email}.`],
        ['Security', 'Traffic is HTTPS/HSTS protected, forms are protected by Cloudflare Turnstile, and sign-in attempts are rate limited. Sessions can be revoked one by one on the Account page.'],
        ['Store links', 'Some links lead to third-party stores governed by their own policies. Affiliate tags, if enabled, never change your price.'],
],
};

export function render(ctx) {
  // /privacy — самостоятельная страница (её ждут и люди, и модерация рекламных сетей)
  if (ctx?.name === 'privacy') return renderPrivacy(getLang());

  const lang = getLang();
  const blocks = [
    ['about.logic', 'bulb'],
    ['about.privacy', 'lock'],
    ['about.ads', 'tag'],
    ['about.data', 'grid'],
  ];

  return `
  <section class="section about">
    <header class="section-head">
      <h1>${esc(t('about.title'))}</h1>
      <p>${esc(t('site.tagline'))} · ${STATS.total} ${esc(tp('home.stats.games', STATS.total))}</p>
    </header>

    <div class="cols-2">
      ${blocks.map(([key, iconName]) => `<div class="col">
        <div class="col-icon">${icon(iconName)}</div>
        <h3>${esc(t(`${key}.title`))}</h3>
        <p>${esc(t(`${key}.text`))}</p>
      </div>`).join('')}
    </div>

    <div class="panel">
      <h3>${lang === 'ru' ? 'Частые вопросы' : 'FAQ'}</h3>
      <div class="faq">
        ${(FAQ[lang] || FAQ.ru).map(([q, a]) => `<details>
          <summary>${esc(q)}</summary>
          <p>${esc(a)}</p>
        </details>`).join('')}
      </div>
    </div>

    <div class="panel">
      <h3>${esc(t('about.missing.title'))}</h3>
      <p>${esc(t('about.missing.text'))}</p>
      <p class="muted">${(Object.keys(GENRES).length)} ${lang === 'ru' ? 'жанров' : 'genres'} · ${Object.keys(TAGS).length} ${lang === 'ru' ? 'тегов' : 'tags'} · ${Object.keys(MOODS).length} ${lang === 'ru' ? 'настроений' : 'moods'}</p>
    </div>

    ${adSlot('home-top')}
    ${houseAd()}

    <div class="panel legal" id="privacy">
      <h3>${lang === 'ru' ? 'Политика конфиденциальности' : 'Privacy policy'}</h3>
      ${PRIVACY[lang].map(([q, a]) => `<h4>${esc(q)}</h4><p>${esc(a)}</p>`).join('')}
    </div>

    <section class="section">
      <header class="section-head"><h2>${lang === 'ru' ? 'Проверенные игры, с которых стоит начать' : 'Proven games to start with'}</h2></header>
      ${cardsGrid([...GAMES].sort((a, b) => b.rating - a.rating).slice(0, 3))}
    </section>
  </section>`;
}

export const title = (ctx) => (ctx?.name === 'privacy'
  ? `${getLang() === 'ru' ? 'Политика конфиденциальности' : 'Privacy policy'} — ${t('site.name')}`
  : `${t('about.title')} — ${t('site.name')}`);
export const description = (ctx) => (ctx?.name === 'privacy'
  ? (getLang() === 'ru'
    ? 'Как GustoPlay обращается с данными: что хранится в браузере, что на сервере, как работает вход через Google, cookie и реклама, как удалить аккаунт.'
    : 'How GustoPlay handles your data: what stays in your browser, what is stored on the server, Google sign-in, cookies and ads, and how to delete your account.')
  : t('about.logic.text'));

/** Отдельная страница /privacy — на неё ведут ссылки из подвала и из баннера cookie. */
function renderPrivacy(lang) {
  const heading = lang === 'ru' ? 'Политика конфиденциальности' : 'Privacy policy';
  const tail = lang === 'ru'
    ? 'Полные правила сервиса — на странице «Условия использования»: они описывают те же данные и обязанности.'
    : 'The full terms of service are on the Terms page: they cover the same data and obligations.';
  return `
  <section class="section about legal-page">
    <header class="section-head">
      <h1>${heading}</h1>
      <p class="muted">${esc(SITE.name)} · ${esc(SITE.email)}</p>
    </header>
    <div class="panel legal" id="privacy">
      ${PRIVACY[lang].map(([q, a]) => `<h4>${esc(q)}</h4><p>${esc(a)}</p>`).join('')}
    </div>
    <p class="muted">${esc(tail)}</p>
    ${houseAd()}
  </section>`;
}
