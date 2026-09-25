/** Страница игры: полная карточка, объяснение «почему вам подходит» и похожие игры. */
import { byId } from '../catalog/index.js';
import { GENRES, TAGS, MODES, PLATFORMS, PRICE, MOODS } from '../taxonomy.js';
import { t, tl, getLang } from '../i18n.js';
import { similarTo, computeWeights, scoreGame } from '../engine.js';
import { getProfile } from '../store.js';
import { FEATURES } from '../config.js';
import { adSlot, breadcrumbs, cardsGrid, coverImage, esc, lengthLabel, markButtons, meters, platformIcons, priceLabel, ratingPill, storeLinks, tagChips } from './components.js';

export function render(ctx) {
  const game = byId(ctx.params.slug);
  if (!game) {
    return `<section class="section"><div class="empty"><div class="empty-icon">🎮</div>
      <h3>${esc(t('common.notFound'))}</h3><p>${esc(t('common.notFound.text'))}</p>
      <a class="btn btn-primary" href="#/catalog" data-action="nav">${esc(t('catalog.title'))}</a></div></section>`;
  }

  const lang = getLang();
  const profile = getProfile();
  const weights = computeWeights(profile);
  const { reasons } = scoreGame(game, profile, weights);
  const mark = profile.marks?.[game.slug]?.status || null;

  const moodReasons = (reasons.find((r) => r.type === 'mood')?.ids || []).map((id) => tl(MOODS, id));
  const tagReasons = (reasons.find((r) => r.type === 'tag')?.ids || []).map((id) => tl(TAGS, id));
  const genreReasons = (reasons.find((r) => r.type === 'genre')?.ids || []).map((id) => tl(GENRES, id));
  const whyAll = [...new Set([...genreReasons, ...tagReasons, ...moodReasons])].slice(0, 8);

  const similar = FEATURES.similar ? similarTo(game.slug, 6) : [];

  const facts = [
    { label: t('game.year'), value: String(game.y) },
    { label: t('game.developer'), value: game.dev },
    { label: t('game.players'), value: `${game.players[0]}–${game.players[1]}` },
    { label: t('game.length'), value: lengthLabel(game) },
    { label: t('game.price'), value: game.price === 'free' ? t('game.free') : tl(PRICE, game.price) },
    { label: t('game.coopQ'), value: game.coopQ ? `${game.coopQ}/10` : '—' },
  ];

  return `
  <section class="section game-page">
    ${breadcrumbs([
      { label: t('nav.catalog'), href: '#/catalog' },
      { label: tl(GENRES, game.genres[0]), href: `#/genre/${game.genres[0]}` },
      { label: game.t },
    ])}

    <div class="game-hero">
      <div class="game-cover">
        ${coverImage(game, 'cover-hero')}
        ${ratingPill(game)}
      </div>
      <div class="game-info">
        <h1>${esc(game.t)}</h1>
        <div class="game-sub">
          <span>${game.y}</span><span class="dot-sep">•</span><span>${esc(game.dev)}</span>
          <span class="dot-sep">•</span>${priceLabel(game)}
        </div>
        <p class="game-desc">${esc(game.desc?.[lang] || '')}</p>

        <div class="badges">${game.modes.map((m) => `<span class="badge badge-mode">${MODES[m].icon} ${esc(tl(MODES, m))}</span>`).join('')}</div>

        ${whyAll.length ? `<div class="why-box">
          <strong>${esc(t('results.why'))}</strong>
          <ul class="why">${whyAll.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
        </div>` : ''}

        ${markButtons(game.slug, mark)}
        ${storeLinks(game)}
      </div>

      <aside class="game-side">
        ${adSlot('game-side')}
      </aside>
    </div>

    <div class="game-details">
      <div class="detail-card">
        <h3>${esc(t('game.about'))}</h3>
        <dl class="facts">${facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>
      </div>
      <div class="detail-card">
        <h3>${esc(t('game.modes'))} · ${esc(t('game.platforms'))}</h3>
        <div class="badges">${game.platforms.map((p) => `<span class="badge">${PLATFORMS[p].icon} ${esc(tl(PLATFORMS, p))}</span>`).join('')}</div>
      </div>
      <div class="detail-card">
        <h3>${esc(t('game.genres'))}</h3>
        <div class="chips-cloud small">${game.genres.map((id) => `<a class="chip chip-genre" href="#/genre/${id}" data-action="nav">${GENRES[id].icon} ${esc(tl(GENRES, id))}</a>`).join('')}</div>
      </div>
      <div class="detail-card">
        <h3>${esc(t('game.tags'))}</h3>
        <div class="chips-cloud small">${tagChips(game, 20)}</div>
        ${meters(game)}
      </div>
      <div class="detail-card">
        <h3>${esc(t('game.players'))}</h3>
        <p class="detail-note">${platformIcons(game)}</p>
      </div>
    </div>

    ${similar.length ? `<section class="section">
      <header class="section-head"><h2>${esc(t('game.similar'))}</h2></header>
      ${cardsGrid(similar, { marks: getProfile().marks })}
    </section>` : ''}
  </section>`;
}

/** Структурированные данные для поисковиков */
export function jsonLd(ctx) {
  const game = byId(ctx.params.slug);
  if (!game) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.t,
    datePublished: String(game.y),
    author: { '@type': 'Organization', name: game.dev },
    genre: game.genres.map((id) => tl(GENRES, id)),
    gamePlatform: game.platforms.map((id) => tl(PLATFORMS, id)),
    applicationCategory: 'Game',
    aggregateRating: { '@type': 'AggregateRating', ratingValue: game.rating / 10, bestRating: 10, ratingCount: 1200 },
    description: game.desc?.[getLang()] || game.desc?.ru,
  };
}

export const title = (ctx) => {
  const game = byId(ctx?.params?.slug);
  return game ? `${game.t} — ${t('game.about')} · ${t('site.name')}` : t('common.notFound');
};

export const description = (ctx) => {
  const game = byId(ctx?.params?.slug);
  return game ? game.desc?.[getLang()] || game.desc?.ru : '';
};
