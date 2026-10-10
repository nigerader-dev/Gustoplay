/** «Как это работает» + политика конфиденциальности (нужна для модерации рекламных сетей). */
import { t, tp, getLang } from '../i18n.js';
import { icon } from '../icons.js';
import { GAMES, STATS } from '../catalog/index.js';
import { esc, houseAd, cardsGrid } from './components.js';
import { GENRES, TAGS, MOODS } from '../taxonomy.js';
import { SITE } from '../config.js';

const FAQ = {
  ru: [
    ['Почему вы предлагаете именно эти игры?', 'Каждая игра получает баллы за совпадения с вашими ответами: настроение, жанры, особенности и режим игры, а также за рейтинг, длительность и цену. Ваши отметки «понравилось» и «не понравилось» тоже влияют на баллы. Главные причины написаны в карточке игры — в блоке «Почему подходит».'],
    ['Как работают отметки игр?', '«Понравилось» усиливает теги, жанры и настроения этой игры, а «не понравилось» — ослабляет. Отметка «играл» убирает игру из выдачи, «хочу сыграть» поднимает её в начало. Пересчёт мгновенный, и его всегда можно отменить — достаточно снять отметку.'],
    ['Нужна ли регистрация?', 'Нет. Ответы и отметки хранятся в вашем браузере. Чтобы перенести их на другое устройство, войдите в аккаунт или сохраните копию на странице «Мой вкус» и загрузите её там.'],
    ['Как пополняется каталог?', 'Мы добавляем игры партиями и сверяем данные с магазинами: Steam, официальными сайтами и HowLongToBeat. Если нужной игры нет — напишите нам, учтём её в следующем обновлении.'],
    ['Вы получаете деньги за рекомендации?', 'Нет. Рекомендации строит алгоритм, рекламные блоки помечены и не влияют на выдачу. В блоке покупки — только прямые ссылки: страница игры в Steam или официальный магазин издателя, без перепродавцов и накрутки позиций.'],
  ],
  en: [
    ['Why are these games recommended?', 'Each game gets points for matching your answers — mood, genres, features and play mode — plus rating, length and price. Your liked and disliked marks count too. The main reasons are listed on each game card under “Why it fits”.'],
    ['How do marks work?', 'Liked strengthens that game\u2019s tags, genres and moods; disliked weakens them. Played hides a game, wishlist pushes it up. Recalculation is instant and reversible.'],
    ['Do I need an account?', 'No. Your taste profile lives in browser localStorage and can be exported as JSON to move to another device.'],
    ['How is the catalog updated?', 'We add games in batches and check the data against Steam, official sites and HowLongToBeat. Missing a game? Tell us and we’ll consider it for the next update.'],
    ['Do you get paid for recommendations?', 'No. Recommendations are algorithmic, ad blocks are labelled and do not affect results. The buy block shows direct links only: the game’s page in Steam or the publisher’s official store — no resellers, no paid placement.'],
  ],
};

// Текст политики конфиденциальности — один источник и для «Как это работает», и для /privacy.
const PRIVACY = {
  ru: [
    ['Кто отвечает за сайт', `Сайтом управляет проект GustoPlay. По любым вопросам, в том числе об удалении данных, пишите: ${SITE.email}.`],
    ['Какие данные мы собираем', 'Подбор работает без регистрации: ваши ответы и отметки игр хранятся только в вашем браузере. Если вы создаёте аккаунт, на сервере сохраняются e-mail, имя (если вы его указали) и те же ответы и отметки — только чтобы переносить их между устройствами. Сайт не предназначен для детей младше 16 лет.'],
    ['Обращения в поддержку', `Форма поддержки готовит письмо, которое вы отправляете из своей почты. Сайт сам текст обращения не хранит. Переписка с нами остаётся в почтовом ящике ${SITE.email}; удалить её можно по вашей просьбе.`],
    ['Пароль и вход через Google', 'Пароль хранится в зашифрованном виде, который нельзя расшифровать обратно: его можно только сбросить. При входе через Google мы получаем лишь e-mail, имя и номер аккаунта Google — ваш пароль от Google нам недоступен. Эти данные используются только для входа и переноса профиля, не передаются другим приложениям и не используются для рекламы (в соответствии с правилами Google API Services User Data Policy, режим Limited Use).'],
    ['Cookie и реклама', 'Рекламу показывает Рекламная сеть Яндекса, посещения может считать Яндекс Метрика. Яндекс может сохранять cookie, чтобы подбирать объявления. Пока вы не нажали «Согласен», их скрипты не загружаются. Сам сайт cookie не ставит: ответы, отметки, выбор по cookie и данные входа хранятся в памяти вашего браузера. Всё это можно удалить в настройках браузера.'],
    ['Ваши права', `В любой момент вы можете удалить свои ответы и отметки кнопкой «Удалить мои данные» на странице «Мой вкус», сохранить их копию, выйти со всех устройств или удалить аккаунт на странице «Аккаунт» — вместе с ним удаляются все данные на сервере. Написать нам: ${SITE.email}.`],
    ['Безопасность', 'Сайт работает только по защищённому соединению HTTPS, формы входа защищены от ботов, а число попыток входа ограничено. Если вы потеряли устройство, завершите его сеанс на странице «Аккаунт».'],
    ['Ссылки на магазины', 'Ссылки «Купить» ведут в сторонние магазины, где действуют их собственные правила. Цена для вас от перехода с нашего сайта не меняется.'],
  ],
  en: [
    ['Who runs the site', `The site is run by the GustoPlay project. For any questions, including deleting your data, write to: ${SITE.email}.`],
    ['What data we collect', 'Matching works without an account: your answers and game marks are stored only in your browser. If you create an account, the server stores your e-mail, your name (if given) and the same answers and marks — only to move them between devices. The site is not intended for children under 16.'],
    ['Support requests', `The support form prepares an e-mail that you send from your own mailbox. The site itself does not store your message. Our correspondence stays in the ${SITE.email} mailbox and can be deleted at your request.`],
    ['Password and Google sign-in', 'Your password is stored in an encrypted form that cannot be reversed: it can only be reset. With Google sign-in we receive only your e-mail, name and Google account number — your Google password is never available to us. This data is used only for sign-in and moving your profile, is not shared with other apps and is not used for advertising (in line with the Google API Services User Data Policy, Limited Use).'],
    ['Cookies and ads', 'Ads are served by the Yandex Advertising Network, and visits may be counted by Yandex Metrica. Yandex may set cookies to choose ads. Their scripts are not loaded until you click “Agree”. The site itself sets no cookies: answers, marks, your cookie choice and sign-in data are kept in your browser’s storage. You can delete all of it in your browser settings.'],
    ['Your rights', `At any time you can delete your answers and marks with “Delete my data” on the My taste page, save a copy, sign out of all devices or delete your account on the Account page — all server data is deleted with it. Contact us: ${SITE.email}.`],
    ['Security', 'The site works only over secure HTTPS, sign-in forms are protected from bots and sign-in attempts are limited. If you lose a device, end its session on the Account page.'],
    ['Store links', '“Buy” links lead to third-party stores with their own rules. Your price doesn’t change when you come from our site.'],
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
        <h2 class="h-lg">${esc(t(`${key}.title`))}</h2>
        <p>${esc(t(`${key}.text`))}</p>
      </div>`).join('')}
    </div>

    <div class="panel">
      <h2 class="h-lg">${lang === 'ru' ? 'Частые вопросы' : 'FAQ'}</h2>
      <div class="faq">
        ${(FAQ[lang] || FAQ.ru).map(([q, a]) => `<details>
          <summary>${esc(q)}</summary>
          <p>${esc(a)}</p>
        </details>`).join('')}
      </div>
    </div>

    <div class="panel">
      <h2 class="h-lg">${esc(t('about.missing.title'))}</h2>
      <p>${esc(t('about.missing.text'))}</p>
      <p class="muted">${(Object.keys(GENRES).length)} ${lang === 'ru' ? 'жанров' : 'genres'} · ${Object.keys(TAGS).length} ${lang === 'ru' ? 'тегов' : 'tags'} · ${Object.keys(MOODS).length} ${lang === 'ru' ? 'настроений' : 'moods'}</p>
    </div>

    <div class="panel">
      <h2 class="h-lg">${icon('mail')} ${esc(t('about.support.title'))}</h2>
      <p>${esc(t('about.support.text'))}</p>
      <p class="panel-actions">
        <a class="btn btn-primary" href="#/support" data-action="nav">${esc(t('common.support'))}</a>
        <a class="btn btn-outline btn-mail" href="mailto:${esc(SITE.email)}">${icon('mail')} ${esc(SITE.email)}</a>
      </p>
    </div>

    ${houseAd()}

    <div class="panel legal" id="privacy">
      <h2 class="h-lg">${lang === 'ru' ? 'Политика конфиденциальности' : 'Privacy policy'}</h2>
      ${PRIVACY[lang].map(([q, a]) => `<h2 class="h-base">${esc(q)}</h2><p>${esc(a)}</p>`).join('')}
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
      <h1>${esc(heading)}</h1>
      <p class="muted">${esc(SITE.name)} · ${esc(SITE.email)}</p>
    </header>
    <div class="panel legal" id="privacy">
      ${PRIVACY[lang].map(([q, a]) => `<h2 class="h-base">${esc(q)}</h2><p>${esc(a)}</p>`).join('')}
    </div>
    <p class="muted">${esc(tail)}</p>
    ${houseAd()}
  </section>`;
}
