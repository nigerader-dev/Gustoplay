/** Главная страница: быстрый старт, статистика, объяснение механики. */
import { GAMES, STATS } from '../catalog/index.js';
import { icon } from '../icons.js';
import { GENRES, TAGS, MOODS, MODES, PLATFORMS } from '../taxonomy.js';
import { t, tl, tp, getLang } from '../i18n.js';
import { adSlot, houseAd, cardsGrid, sectionTitle, esc, coverImage } from './components.js';
import { markedGames, getProfile } from '../store.js';
import { progress } from '../quiz.js';
import { collectionLinks } from './collections.js';

export function render() {
  const lang = getLang();
  const liked = markedGames().length;

  // «Хиты недели»: топ по рейтингу с небольшим разбором
  const top = [...GAMES].sort((a, b) => b.rating - a.rating).slice(0, 8);
  // Коллаж из настоящих обложек — вместо абстрактных иконок: сразу видно, что сайт про игры
  const collage = [...GAMES].filter((g) => g.cover && g.coopQ >= 8).sort((a, b) => b.rating - a.rating).slice(0, 5);

  // Быстрые подборки — готовые списки под частые запросы (/top/…): удобно человеку
  // и главная внутренняя перелинковка для поиска
  const quickPicks = [
    'igry-na-dvoih-na-odnom-pk', 'igry-na-dvoih-po-seti', 'igry-dlya-kompanii-druzej', 'besplatnye-koop-igry',
    'koop-dlya-slabyh-pk', 'igry-s-devushkoj', 'koop-horrory', 'korotkie-igry-na-vecher',
  ];


  // Блок «продолжить» показываем и без отметок: иначе человек, который прошёл подбор,
  // возвращался на главную и не видел ни своих результатов, ни возможности продолжить —
  // выглядело так, будто ответы пропали.
  const profile = getProfile();
  const answered = progress(profile.answers);
  // «Пройдено» считаем по доле отвеченных вопросов, а не по meta.completedAt:
  // это поле обновляется при каждом ответе и означает «когда отвечали в последний раз».
  const finished = answered === 100;
  const continueBlock = liked
    ? `<div class="continue">
        <strong>${esc(t('profile.stats', { liked, played: markedGames('played').length, wishlist: markedGames('wishlist').length, disliked: markedGames('disliked').length }))}</strong>
        <a class="btn btn-primary" href="#/results" data-action="nav">${esc(t('results.title'))}</a>
      </div>`
    : answered > 0
      ? `<div class="continue">
        <strong>${esc(finished ? t('home.continue.done') : t('home.continue.partial', { n: answered }))}</strong>
        <a class="btn btn-primary" href="${finished ? '#/results' : '#/quiz'}" data-action="nav">${esc(finished ? t('results.title') : t('quiz.title'))}</a>
      </div>`
      : '';

  return `
  <section class="hero">
    <div class="hero-copy">
      <span class="pill">${esc(t('home.hero.pill'))}</span>
      <h1>${esc(t('home.hero.title'))}</h1>
      <p class="lead">${esc(t('home.hero.lead'))}</p>
      <div class="hero-cta">
        <a class="btn btn-primary btn-lg" href="#/quiz" data-action="nav">${icon('sparkles')} ${esc(t('home.cta.start'))}</a>
        <a class="btn btn-outline btn-lg" href="#/party" data-action="nav">${icon('users')} ${esc(t('home.cta.company'))}</a>
        <a class="btn btn-link hero-link" href="#/catalog" data-action="nav">${esc(t('home.cta.catalog'))} →</a>
      </div>
      ${continueBlock}
      <div class="hero-stats">
        <div><strong>${STATS.total}</strong><span>${esc(tp('home.stats.games', STATS.total))}</span></div>
        <div><strong>${STATS.coop}</strong><span>${esc(t('home.stats.coop'))}</span></div>
        <div><strong>${STATS.pvp}</strong><span>${esc(t('home.stats.pvp'))}</span></div>
        <div><strong>${Object.keys(TAGS).length}</strong><span>${esc(tp('home.stats.filters', Object.keys(TAGS).length))}</span></div>
      </div>
    </div>
    <div class="hero-collage" aria-hidden="true">
      ${collage.map((g, i) => `<div class="hero-tile hero-tile-${i + 1}">${coverImage(g, 'cover-img').replace('loading="lazy"', i < 3 ? `loading="eager"${i === 0 ? ' fetchpriority="high"' : ''}` : 'loading="lazy"')}</div>`).join('')}
    </div>
  </section>

  ${adSlot('home-top')}

  <section class="section">
    ${sectionTitle(t('home.quick.title'), t('home.quick.text'))}
    <div class="quick-picks">
      ${collectionLinks(quickPicks)}
    </div>
    <div class="center"><a class="btn btn-link" href="#/podborki" data-action="nav">${esc(t('home.quick.all'))} →</a></div>
  </section>

  <section class="section">
    ${sectionTitle(t('home.how.title'))}
    <div class="steps">
      ${[1, 2, 3].map((n) => `<div class="step">
        <div class="step-num">${n}</div>
        <h3>${esc(t(`home.how.${n}.title`))}</h3>
        <p>${esc(t(`home.how.${n}.text`))}</p>
      </div>`).join('')}
    </div>
  </section>



  <section class="section">
    ${sectionTitle(t('home.top.title'), t('home.top.text'))}
    ${cardsGrid(top)}
    <div class="center"><a class="btn btn-outline" href="#/catalog" data-action="nav">${esc(t('home.cta.catalog'))} →</a></div>
  </section>

  ${houseAd()}

  <section class="section">
    ${sectionTitle(t('home.browse.title'), t('home.browse.text'))}
    <div class="chips-cloud">
      ${Object.keys(GENRES).map((id) => `<a class="chip chip-lg" href="#/genre/${id}" data-action="nav">${icon(GENRES[id].icon)} ${esc(tl(GENRES, id))}</a>`).join('')}
    </div>
    <div class="chips-cloud">
      ${['coopfocused', 'splitscreen', 'storyrich', 'openworld', 'difficult', 'cozy', 'short', 'long', 'replayable', 'lowsysreq', 'steamdeck', 'gacha']
        .filter((id) => TAGS[id])
        .map((id) => `<a class="chip" href="#/tag/${id}" data-action="nav">${esc(tl(TAGS, id))}</a>`).join('')}
    </div>
  </section>
  `;
}

// В заголовке — то, что люди набирают в поиске («во что поиграть»), а не только название бренда
export const title = () => t('home.meta.title');
export const description = () => t('site.description');
