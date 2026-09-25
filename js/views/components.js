/**
 * Переиспользуемые куски интерфейса. Всё возвращает HTML-строку, события ловим
 * делегированием в js/app.js (data-action / data-slug / data-id).
 */
import { GENRES, TAGS, MODES, PLATFORMS, PRICE } from '../taxonomy.js';
import { coverDataUri, tagColor } from '../cover.js';
import { t, tl, getLang } from '../i18n.js';
import { ADS, AD_SLOTS, SITE, FEATURES } from '../config.js';
import { getConsent, adCount, bumpAdCounter } from '../store.js';

export const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ *
 * Плашки и ярлыки
 * ------------------------------------------------------------------ */

export const modeBadges = (game, limit = 3) => game.modes.slice(0, limit)
  .map((m) => `<span class="badge badge-mode" title="${esc(tl(MODES, m))}">${MODES[m]?.icon || ''} ${esc(tl(MODES, m))}</span>`)
  .join('');

export const playersLabel = (game) => (game.players[0] === game.players[1]
  ? `${game.players[0]}`
  : `${game.players[0]}–${game.players[1]}`);

export const platformIcons = (game) => game.platforms
  .map((p) => `<span class="plat" title="${esc(tl(PLATFORMS, p))}">${PLATFORMS[p]?.icon || ''}</span>`)
  .join('');

export const tagChips = (game, limit = 6, link = true) => game.tags.slice(0, limit)
  .map((id) => {
    const c = tagColor(id);
    const style = `--chip-bg:${c.bg};--chip-fg:${c.fg}`;
    return link
      ? `<a class="chip" style="${style}" href="#/tag/${id}" data-action="nav">${esc(tl(TAGS, id))}</a>`
      : `<span class="chip" style="${style}">${esc(tl(TAGS, id))}</span>`;
  })
  .join('');

export const genreChips = (game, limit = 3, link = true) => game.genres.slice(0, limit)
  .map((id) => (link
    ? `<a class="chip chip-genre" href="#/genre/${id}" data-action="nav">${GENRES[id]?.icon || ''} ${esc(tl(GENRES, id))}</a>`
    : `<span class="chip chip-genre">${GENRES[id]?.icon || ''} ${esc(tl(GENRES, id))}</span>`))
  .join('');

export const ratingPill = (game) => {
  const cls = game.rating >= 90 ? 'rating-top' : game.rating >= 80 ? 'rating-good' : 'rating-mid';
  return `<span class="rating ${cls}" title="${esc(t('game.rating'))}">${game.rating}</span>`;
};

export const priceLabel = (game) => {
  if (game.price === 'free') return `<span class="price price-free">${esc(t('game.free'))}</span>`;
  const label = tl(PRICE, game.price);
  return `<span class="price">${esc(label)}${game.priceRub ? ` · ~${game.priceRub} ₽` : ''}</span>`;
};

export const lengthLabel = (game) => {
  const [a, b] = game.len;
  if (b >= 400) return `${a}+ ${t('common.hours')}`;
  return `${a}–${b} ${t('common.hours')}`;
};

/** Полоска «сложность / темп» */
const dots = (value, max = 5, cls = '') =>
  `<span class="dots ${cls}">${Array.from({ length: max }, (_, i) => `<i class="${i < value ? 'on' : ''}"></i>`).join('')}</span>`;

export const meters = (game) => `
  <div class="meters">
    <div class="meter"><span class="meter-label">${esc(t('game.difficulty'))}</span>${dots(game.difficulty)}</div>
    <div class="meter"><span class="meter-label">${esc(t('game.pace'))}</span>${dots(game.pace, 5, 'dots-pace')}</div>
  </div>`;

/* ------------------------------------------------------------------ *
 * Обложка игры
 * ------------------------------------------------------------------ */

export function coverImage(game, cls = 'cover-img') {
  const icon = GENRES[game.genres[0]]?.icon || '🎮';
  const generated = coverDataUri(game, icon);
  // По умолчанию рисуем собственную обложку. Если владелец сайта положил официальные арты
  // в /covers (FEATURES.realCovers = true), показываем их, а сгенерированную используем как запас.
  const src = FEATURES.realCovers ? `covers/${game.slug}.jpg` : generated;
  return `<img class="${cls}" src="${esc(src)}" data-fallback="${esc(generated)}" alt="${esc(game.t)}" loading="lazy" width="480" height="640"
    onerror="this.onerror=null;this.src=this.dataset.fallback">`;
}

/* ------------------------------------------------------------------ *
 * Карточка игры
 * ------------------------------------------------------------------ */

export function gameCard(game, opts = {}) {
  const { why = [], mark = null } = opts;
  const lang = getLang();
  const whyHtml = why.length
    ? `<ul class="why">${why.slice(0, 4).map((w) => `<li>${esc(w[lang] ?? w.ru ?? '')}</li>`).join('')}</ul>`
    : `<p class="card-desc">${esc(game.desc?.[lang] || '')}</p>`;

  return `
  <article class="card game-card" data-slug="${game.slug}">
    <a class="card-cover" href="#/game/${game.slug}" data-action="nav" aria-label="${esc(game.t)}">
      ${coverImage(game)}
      ${ratingPill(game)}
      <div class="card-cover-meta">
        <span class="cover-badge">${MODES[game.modes[0]]?.icon || '🎮'} ${playersLabel(game)}</span>
      </div>
    </a>
    <div class="card-body">
      <h3 class="card-title"><a href="#/game/${game.slug}" data-action="nav">${esc(game.t)}</a></h3>
      <div class="card-sub">
        <span>${game.y}</span><span class="dot-sep">•</span><span>${esc(game.dev)}</span>
      </div>
      <div class="card-chips">${genreChips(game, 2)}${tagChips(game, 2)}</div>
      ${why.length ? `<div class="why-title">${esc(t('results.why'))}</div>` : ''}
      ${whyHtml}
      <div class="card-foot">
        ${priceLabel(game)}
        <span class="len">⏱ ${lengthLabel(game)}</span>
      </div>
      ${markButtons(game.slug, mark)}
    </div>
  </article>`;
}

/** Сетка карточек */
export const cardsGrid = (games, opts = {}) => `<div class="grid">${games.map((g) => gameCard(g, {
  why: opts.whyBySlug?.[g.slug] || [],
  mark: opts.marks?.[g.slug]?.status || null,
})).join('')}</div>`;

/* ------------------------------------------------------------------ *
 * Отметки игр («играл / понравилось / не понравилось / хочу»)
 * ------------------------------------------------------------------ */

export function markButtons(slug, status = null) {
  const items = [
    { id: 'played', icon: '🎮', label: t('mark.played'), tip: t('mark.played.tip') },
    { id: 'liked', icon: '❤️', label: t('mark.liked'), tip: t('mark.liked.tip') },
    { id: 'disliked', icon: '👎', label: t('mark.disliked'), tip: t('mark.disliked.tip') },
    { id: 'wishlist', icon: '🔖', label: t('mark.wishlist'), tip: '' },
  ];
  return `<div class="marks" data-slug="${slug}">
    <span class="marks-label">${esc(t('results.mark'))}:</span>
    ${items.map((i) => `<button type="button" class="mark ${status === i.id ? 'on' : ''}"
      data-action="mark" data-slug="${slug}" data-status="${i.id}" title="${esc(i.tip || i.label)}"
      aria-pressed="${status === i.id}">${i.icon} <span>${esc(i.label)}</span></button>`).join('')}
  </div>`;
}

/* ------------------------------------------------------------------ *
 * Фильтры-переключатели
 * ------------------------------------------------------------------ */

export function filterGroup(title, options, activeIds, { multi = true, action = 'filter-mode' } = {}) {
  return `
  <div class="filter-group">
    <div class="filter-title">${esc(title)}</div>
    <div class="filter-options">
      ${options.map((o) => `<button type="button" class="chip chip-btn ${activeIds.includes(o.id) ? 'on' : ''}"
        data-action="${action}" data-id="${o.id}" aria-pressed="${activeIds.includes(o.id)}">${o.icon || ''} ${esc(o.label)}</button>`).join('')}
    </div>
  </div>`;
}

export const tagOptions = (ids) => ids.map((id) => ({ id, label: tl(TAGS, id), icon: '' }));
export const genreOptionList = () => Object.keys(GENRES).map((id) => ({ id, label: tl(GENRES, id), icon: GENRES[id].icon }));
export const platformOptionList = () => Object.keys(PLATFORMS).map((id) => ({ id, label: tl(PLATFORMS, id), icon: PLATFORMS[id].icon }));
export const modeOptionList = () => Object.keys(MODES).map((id) => ({ id, label: tl(MODES, id), icon: MODES[id].icon }));

/* ------------------------------------------------------------------ *
 * Реклама
 * ------------------------------------------------------------------ */

/**
 * Рекламный блок. Пока ADS.mode = 'mock' — аккуратная заглушка (видно место и размер).
 * С реальными ID подключается РСЯ и/или AdSense, учитывая согласие на cookie и лимит блоков на страницу.
 */
export function adSlot(slotId) {
  const slot = AD_SLOTS[slotId];
  if (!slot) return '';
  if (ADS.mode === 'mock') {
    return `<aside class="ad-slot ad-mock" data-slot="${slotId}">
      <span class="ad-label">${esc(t('ad.label'))}</span>
      <div class="ad-body">
        <strong>${esc(t('ad.placeholder', { size: slot.size }))}</strong>
        <span>${esc(t('ad.hint'))}</span>
      </div>
    </aside>`;
  }
  // реальная сеть: согласие + лимит блоков
  if (ADS.consentRequired && getConsent() !== 'all') return '<div class="ad-slot ad-off" data-slot="off"></div>';
  if (adCount() >= ADS.maxPerPage) return '';
  bumpAdCounter();

  const rsya = ADS.rsya.blocks?.[slotId];
  const adsense = ADS.adsense.blocks?.[slotId];
  const parts = [];
  if ((ADS.mode === 'rsya' || ADS.mode === 'both') && rsya) {
    parts.push(`<div id="yandex_rtb_${slotId}" class="ad-network" data-rsya="${esc(rsya)}"></div>`);
  }
  if ((ADS.mode === 'adsense' || ADS.mode === 'both') && adsense) {
    parts.push(`<ins class="adsbygoogle ad-network" style="display:block" data-ad-client="${esc(ADS.adsense.client)}"
      data-ad-slot="${esc(adsense)}" data-ad-format="auto" data-full-width-responsive="true"></ins>`);
  }
  if (!parts.length) return '';
  return `<aside class="ad-slot" data-slot="${slotId}">
    <span class="ad-label">${esc(t('ad.label'))}</span>
    ${parts.join('')}
  </aside>`;
}

/** Наша собственная «реклама» — показывается, когда сеть не подключена */
export function houseAd() {
  if (!ADS.house?.enabled) return '';
  const lang = getLang();
  return `<aside class="house-ad">
    <div>
      <strong>${esc(ADS.house.title[lang])}</strong>
      <p>${esc(ADS.house.text[lang])}</p>
    </div>
    <a class="btn btn-ghost" href="${esc(ADS.house.url)}" target="_blank" rel="noopener nofollow sponsored">${esc(ADS.house.cta[lang])}</a>
  </aside>`;
}

/* ------------------------------------------------------------------ *
 * Прочее
 * ------------------------------------------------------------------ */

export const breadcrumbs = (items) => `<nav class="crumbs">${items
  .map((i, idx) => (idx === items.length - 1
    ? `<span>${esc(i.label)}</span>`
    : `<a href="${i.href}" data-action="nav">${esc(i.label)}</a><span class="dot-sep">/</span>`))
  .join('')}</nav>`;

export const emptyState = (title, text, cta = '') => `
  <div class="empty">
    <div class="empty-icon">🔍</div>
    <h3>${esc(title)}</h3>
    <p>${esc(text)}</p>
    ${cta}
  </div>`;

export const sectionTitle = (title, subtitle = '') => `
  <header class="section-head">
    <h2>${esc(title)}</h2>
    ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
  </header>`;

export const storeLinks = (game) => {
  const steam = `${game.links.steam}${SITE.affiliates.steam}`;
  const ig = `${game.links.instantGaming}${SITE.affiliates.instantGaming}`;
  return `<div class="stores">
    <a class="btn btn-ghost" href="${steam}" target="_blank" rel="noopener nofollow">🛒 ${esc(t('game.steam'))}</a>
    <a class="btn btn-ghost" href="${ig}" target="_blank" rel="noopener nofollow">💸 ${esc(t('game.instant'))}</a>
  </div>`;
};
