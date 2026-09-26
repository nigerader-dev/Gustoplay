/** Страница игры: полная карточка, объяснение «почему вам подходит» и похожие игры. */
import { byId } from '../catalog/index.js';
import { icon } from '../icons.js';
import { GENRES, TAGS, MODES, PLATFORMS, PRICE, MOODS } from '../taxonomy.js';
import { t, tl, getLang } from '../i18n.js';
import { similarTo, computeWeights, scoreGame } from '../engine.js';
import { getProfile } from '../store.js';
import { FEATURES } from '../config.js';
import { adSlot, breadcrumbs, cardsGrid, coverImage, esc, lengthLabel, markButtons, meters, platformIcons, priceLabel, ratingPill, storeLinks, tagChips } from './components.js';

export function render(ctx) {
  const game = byId(ctx.params.slug);
  if (!game) {
    return `<section class="section"><div class="empty"><div class="empty-icon">${icon('compass')}</div>
      <h1>${esc(t('common.notFound'))}</h1><p>${esc(t('common.notFound.text'))}</p>
      <a class="btn btn-primary" href="#/catalog" data-action="nav">${esc(t('catalog.title'))}</a></div></section>`;
  }

  const lang = getLang();
  const profile = getProfile();
  const weights = computeWeights(profile);
  const { reasons } = scoreGame(game, profile, weights);
  const mark = profile.marks?.[game.slug]?.status || null;

  // Полное описание: 2–4 предложения (поле about) + буллеты «за что любят» (feats).
  // Пока about заполняется батчами, запасной вариант — короткое описание из карточек.
  const aboutText = game.about?.[lang] || game.about?.ru || game.desc?.[lang] || '';
  const feats = (game.feats?.[lang]?.length ? game.feats[lang] : game.feats?.ru || []).slice(0, 4);

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
        <p class="game-desc">${esc(aboutText)}</p>
        ${feats.length ? `<div class="game-feats">
          <strong>${icon('sparkles')} ${esc(t('game.features'))}</strong>
          <ul>${feats.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        </div>` : ''}

        <div class="badges">${game.modes.map((m) => `<span class="badge badge-mode">${icon(MODES[m].icon)} ${esc(tl(MODES, m))}</span>`).join('')}</div>

        ${FEATURES.scoreDebug && whyAll.length ? `<div class="why-box">
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
        <h2>${esc(t('game.about'))}</h2>
        <dl class="facts">${facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>
      </div>
      <div class="detail-card">
        <h2>${esc(t('game.modes'))} · ${esc(t('game.platforms'))}</h2>
        <div class="badges">${game.platforms.map((p) => `<span class="badge">${icon(PLATFORMS[p].icon)} ${esc(tl(PLATFORMS, p))}</span>`).join('')}</div>
      </div>
      <div class="detail-card">
        <h2>${esc(t('game.genres'))}</h2>
        <div class="chips-cloud small">${game.genres.map((id) => `<a class="chip chip-genre" href="#/genre/${id}" data-action="nav">${icon(GENRES[id].icon)} ${esc(tl(GENRES, id))}</a>`).join('')}</div>
      </div>
      <div class="detail-card">
        <h2>${esc(t('game.tags'))}</h2>
        <div class="chips-cloud small">${tagChips(game, 20)}</div>
        ${meters(game)}
      </div>
      <div class="detail-card">
        <h2>${esc(t('game.players'))}</h2>
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
  const lang = getLang();
  const about = game.about?.[lang] || game.about?.ru || game.desc?.[lang] || '';
  const feats = game.feats?.[lang]?.length ? game.feats[lang] : [];
  const fullDescription = feats.length ? `${about} ${feats.map((f) => `• ${f}`).join(' ')}` : about;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.t,
    datePublished: String(game.y),
    author: { '@type': 'Organization', name: game.dev },
    genre: game.genres.map((id) => tl(GENRES, id)),
    gamePlatform: game.platforms.map((id) => tl(PLATFORMS, id)),
    applicationCategory: 'Game',
    aggregateRating: { '@type': 'AggregateRating', ratingValue: game.rating / 10, bestRating: 10, ratingCount: 1200 },
    description: fullDescription || game.desc?.[lang] || game.desc?.ru,
  };
  // официальная обложка — в JSON-LD, чтобы поисковики показывали реальный арт
  if (game.cover) data.image = game.cover;
  if (game.steamId) data.url = `https://store.steampowered.com/app/${game.steamId}/`;
  return data;
}

export const title = (ctx) => {
  const game = byId(ctx?.params?.slug);
  return game ? `${game.t} — ${t('game.about')} · ${t('site.name')}` : t('common.notFound');
};

export const description = (ctx) => {
  const game = byId(ctx?.params?.slug);
  if (!game) return '';
  // meta description: полное описание, укороченное до читаемых ~180 символов
  const lang = getLang();
  const full = game.about?.[lang] || game.about?.ru || game.desc?.[lang] || game.desc?.ru || '';
  if (full.length <= 200) return full;
  const cut = full.slice(0, 197);
  return `${cut.slice(0, Math.max(80, cut.lastIndexOf(' ')))}…`;
};
