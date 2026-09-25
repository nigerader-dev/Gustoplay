/** Главная страница: быстрый старт, статистика, объяснение механики. */
import { GAMES, STATS } from '../catalog/index.js';
import { GENRES, TAGS, MOODS, MODES, PLATFORMS } from '../taxonomy.js';
import { t, tl, getLang } from '../i18n.js';
import { adSlot, houseAd, cardsGrid, sectionTitle, esc } from './components.js';
import { markedGames } from '../store.js';

export function render() {
  const lang = getLang();
  const liked = markedGames().length;

  // «Хиты недели»: топ по рейтингу с небольшим разбором
  const top = [...GAMES].sort((a, b) => b.rating - a.rating).slice(0, 6);

  // Быстрые подборки — это ещё и внутренняя перелинковка, полезная для SEO
  const quickPicks = [
    { icon: '🛋️', key: 'opt.players2', href: '#/party?players=2', label: t('opt.players2') },
    { icon: '🎉', key: 'opt.players3', href: '#/party?players=4', label: t('opt.players3') },
    { icon: '🧍', key: 'solo', href: '#/mode/solo', label: tl(MODES, 'solo') },
    { icon: '🤝', key: 'coop', href: '#/mode/coopOnline', label: tl(MODES, 'coopOnline') },
    { icon: '⚔️', key: 'pvp', href: '#/mode/pvpOnline', label: tl(MODES, 'pvpOnline') },
    { icon: '🌿', key: 'relax', href: '#/mood/relax', label: tl(MOODS, 'relax') },
    { icon: '😱', key: 'scare', href: '#/mood/scare', label: tl(MOODS, 'scare') },
    { icon: '🚀', key: 'scifi', href: '#/tag/scifi', label: tl(TAGS, 'scifi') },
  ];

  const continueBlock = liked
    ? `<div class="continue">
        <strong>${esc(t('profile.stats', { liked, played: markedGames('played').length, wishlist: markedGames('wishlist').length, disliked: markedGames('disliked').length }))}</strong>
        <a class="btn btn-primary" href="#/results" data-action="nav">${esc(t('results.title'))}</a>
      </div>`
    : '';

  return `
  <section class="hero">
    <div class="hero-copy">
      <span class="pill">${esc(t('site.tagline'))}</span>
      <h1>${esc(t('site.name'))} — ${esc(t('home.hero.title'))}</h1>
      <p class="lead">${esc(t('home.hero.lead'))}</p>
      <div class="hero-cta">
        <a class="btn btn-primary btn-lg" href="#/quiz" data-action="nav">✨ ${esc(t('home.cta.start'))}</a>
        <a class="btn btn-outline btn-lg" href="#/party" data-action="nav">👫 ${esc(t('home.cta.company'))}</a>
        <a class="btn btn-ghost btn-lg" href="#/catalog" data-action="nav">${esc(t('home.cta.catalog'))}</a>
      </div>
      ${continueBlock}
      <div class="hero-stats">
        <div><strong>${STATS.total}</strong><span>${esc(t('home.stats.games'))}</span></div>
        <div><strong>${STATS.coop}</strong><span>${esc(t('home.stats.coop'))}</span></div>
        <div><strong>${STATS.pvp}</strong><span>${esc(t('home.stats.pvp'))}</span></div>
        <div><strong>${Object.keys(TAGS).length}</strong><span>${esc(t('home.stats.filters'))}</span></div>
      </div>
    </div>
    <div class="hero-art" aria-hidden="true">
      ${['🎮', '🕹️', '🎲', '🃏'].map((e, i) => `<span class="float float-${i + 1}">${e}</span>`).join('')}
      <div class="hero-orb"></div>
    </div>
  </section>

  ${adSlot('home-top')}

  <section class="section">
    ${sectionTitle(t('home.quick.title'), t('home.quick.text'))}
    <div class="quick-picks">
      ${quickPicks.map((q) => `<a class="quick" href="${q.href}" data-action="nav"><span>${q.icon}</span>${esc(q.label)}</a>`).join('')}
    </div>
  </section>

  <section class="section">
    ${sectionTitle(t('home.how.title'))}
    <div class="cols-3">
      ${[1, 2, 3].map((n) => `<div class="col">
        <div class="col-icon">${['📝', '🎯', '⭐'][n - 1]}</div>
        <h3>${esc(t(`home.how.${n}.title`))}</h3>
        <p>${esc(t(`home.how.${n}.text`))}</p>
      </div>`).join('')}
    </div>
  </section>

  <section class="section">
    ${sectionTitle(t('home.features.title'))}
    <div class="cols-4">
      ${[['pool', '🗂️'], ['explain', '🔍'], ['party', '👥'], ['privacy', '🔒']].map(([id, icon]) => `<div class="col">
        <div class="col-icon">${icon}</div>
        <h3>${esc(t(`home.feature.${id}.title`))}</h3>
        <p>${esc(t(`home.feature.${id}.text`))}</p>
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
      ${Object.keys(GENRES).map((id) => `<a class="chip chip-lg" href="#/genre/${id}" data-action="nav">${GENRES[id].icon} ${esc(tl(GENRES, id))}</a>`).join('')}
    </div>
    <div class="chips-cloud">
      ${['coopfocused', 'splitscreen', 'storyrich', 'openworld', 'difficult', 'cozy', 'short', 'long', 'replayable', 'lowsysreq', 'steamdeck', 'gacha']
        .filter((id) => TAGS[id])
        .map((id) => `<a class="chip" href="#/tag/${id}" data-action="nav">${esc(tl(TAGS, id))}</a>`).join('')}
    </div>
  </section>
  `;
}

export const title = () => `${t('site.name')} — ${t('site.tagline')}`;
export const description = () => t('site.description');
