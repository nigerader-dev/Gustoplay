/**
 * Переиспользуемые куски интерфейса. Всё возвращает HTML-строку, события ловим
 * делегированием в js/app.js (data-action / data-slug / data-id).
 */
import { GENRES, TAGS, MODES, PLATFORMS, PRICE } from '../taxonomy.js';
import { coverDataUri, tagColor } from '../cover.js';
import { t, tl, getLang } from '../i18n.js';
import { icon } from '../icons.js';
import { ADS, AD_SLOTS, SITE, FEATURES } from '../config.js';
import { getConsent, adCount, bumpAdCounter } from '../store.js';

export const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ *
 * Плашки и ярлыки
 * ------------------------------------------------------------------ */

export const modeBadges = (game, limit = 3) => game.modes.slice(0, limit)
  .map((m) => `<span class="badge badge-mode" title="${esc(tl(MODES, m))}">${icon(MODES[m]?.icon)} ${esc(tl(MODES, m))}</span>`)
  .join('');

export const playersLabel = (game) => (game.players[0] === game.players[1]
  ? `${game.players[0]}`
  : `${game.players[0]}–${game.players[1]}`);

export const platformIcons = (game) => game.platforms
  .map((p) => `<span class="plat" title="${esc(tl(PLATFORMS, p))}">${icon(PLATFORMS[p]?.icon)}</span>`)
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
    ? `<a class="chip chip-genre" href="#/genre/${id}" data-action="nav">${icon(GENRES[id]?.icon)} ${esc(tl(GENRES, id))}</a>`
    : `<span class="chip chip-genre">${icon(GENRES[id]?.icon)} ${esc(tl(GENRES, id))}</span>`))
  .join('');

export const ratingPill = (game) => {
  const cls = game.rating >= 90 ? 'rating-top' : game.rating >= 80 ? 'rating-good' : 'rating-mid';
  return `<span class="rating ${cls}" title="${esc(t('game.rating'))}">${game.rating}</span>`;
};

export const priceLabel = (game) => {
  if (game.price === 'free') return `<span class="price price-free">${esc(t('game.free'))}</span>`;
  const label = tl(PRICE, game.price);
  // Две части одним span'ом рвались на узкой карточке: «2500 ₽ и / выше · / ~3900 ₽».
  // Разделяем — перенос тогда идёт между частями, а не внутри числа с ценой.
  const rub = game.priceRub ? `<span class="price-rub">· ~${game.priceRub} ₽</span>` : '';
  return `<span class="price">${esc(label)}</span>${rub}`;
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
  const generated = coverDataUri(game);
  // Порядок источников обложки:
  //   1) официальный арт магазина (сопоставление в js/catalog/steam-covers.js);
  //   2) если включён FEATURES.realCovers — файл владельца /covers/<slug>.jpg идёт первым,
  //      а арт магазина остаётся первой ступенью отката;
  //   3) сгенерированная обложка — последняя ступень (битая ссылка, офлайн, игра без арта).
  // Если файла владельца нет, картинка тихо откатывается на арт магазина и генерацию:
  // раньше в этом случае показывался сломанный значок изображения.
  const shop = game.cover || '';
  const local = `covers/${game.slug}.jpg`;
  const src = FEATURES.realCovers ? local : (shop || generated);
  const fallback = FEATURES.realCovers ? (shop || generated) : generated;
  return `<img class="${cls}" src="${esc(src)}" data-fallback="${esc(fallback)}" data-fallback2="${esc(generated)}" alt="${esc(game.t)}" loading="lazy" decoding="async" width="600" height="900">`;
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
    <div class="card-cover-wrap">
      <a class="card-cover" href="#/game/${game.slug}" data-action="nav" aria-label="${esc(game.t)}">
        ${coverImage(game)}
      </a>
      ${ratingPill(game)}
      <div class="card-cover-meta">
        <span class="cover-badge">${icon(MODES[game.modes[0]]?.icon)} ${playersLabel(game)}</span>
      </div>
    </div>
    <div class="card-body">
      <h3 class="card-title"><a href="#/game/${game.slug}" data-action="nav">${esc(game.t)}</a></h3>
      <div class="card-sub">
        <span>${game.y}</span><span class="dot-sep">•</span><span>${esc(game.dev)}</span>
      </div>
      <div class="card-chips">${genreChips(game, 2)}${tagChips(game, 2)}</div>
      ${FEATURES.scoreDebug && why.length ? `<div class="why-title">${esc(t('results.why'))}</div>` : ''}
      ${FEATURES.scoreDebug ? whyHtml : ''}
      <div class="card-foot">
        ${priceLabel(game)}
        <span class="len">${icon('clock')} ${lengthLabel(game)}</span>
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
  // «Понравилось / не понравилось» — парные большие пальцы: так отметка «не понравилось»
  // читается как оценка, а не как «удалить» (раньше там был перечёркнутый минус).
  const items = [
    { id: 'played', icon: 'controller', label: t('mark.played'), tip: t('mark.played.tip') },
    { id: 'liked', icon: 'thumbsUp', label: t('mark.liked'), tip: t('mark.liked.tip') },
    { id: 'disliked', icon: 'thumbsDown', label: t('mark.disliked'), tip: t('mark.disliked.tip') },
    { id: 'wishlist', icon: 'bookmark', label: t('mark.wishlist'), tip: t('mark.wishlist.tip') },
  ];
  // title — нативная подсказка: не влияет на раскладку (кнопки не «скачут» под курсором)
  // и не обрезается границами карточки. Текст внутри <span> даёт кнопке доступное имя.
  return `<div class="marks" data-slug="${slug}">
    <span class="marks-label">${esc(t('results.mark'))}:</span>
    ${items.map((i) => `<button type="button" class="mark ${status === i.id ? 'on' : ''}"
      data-action="mark" data-slug="${slug}" data-status="${i.id}"
      title="${esc(i.tip ? `${i.label} — ${i.tip}` : i.label)}"
      aria-pressed="${status === i.id}">${icon(i.icon)} <span>${esc(i.label)}</span></button>`).join('')}
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
        data-action="${action}" data-id="${o.id}" aria-pressed="${activeIds.includes(o.id)}">${o.icon ? `${icon(o.icon)} ` : ''}${esc(o.label)}</button>`).join('')}
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

export const emptyState = (title, text, cta = '', iconName = 'search') => `
  <div class="empty">
    <div class="empty-icon">${icon(iconName)}</div>
    <h2 class="h-lg">${esc(title)}</h2>
    <p>${esc(text)}</p>
    ${cta}
  </div>`;

export const sectionTitle = (title, subtitle = '') => `
  <header class="section-head">
    <h2>${esc(title)}</h2>
    ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
  </header>`;

/**
 * Где купить. Только конкретные страницы: страница игры в Steam (если она есть)
 * и официальный магазин/сайт издателя. Поисковых ссылок-заглушек и сторонних
 * перепродавцов здесь нет — если конкретной страницы нет, кнопка не показывается.
 */
export const storeLinks = (game) => {
  const buttons = [];
  // game.links.steam === null у игр без страницы в Steam (Nintendo, мобильные, Battle.net):
  // раньше в этом случае подставлялся поиск по названию — вместо него официальный магазин
  if (game.links.steam) {
    buttons.push(`<a class="btn btn-ghost" href="${esc(game.links.steam)}${SITE.affiliates.steam}"
      target="_blank" rel="noopener nofollow">${icon('cart')} ${esc(t('game.steam'))}</a>`);
  }
  if (game.links.official) {
    buttons.push(`<a class="btn btn-ghost" href="${esc(game.links.official)}"
      target="_blank" rel="noopener nofollow">${icon('globe')} ${esc(t(game.links.officialLabel || 'game.official'))}</a>`);
  }
  return buttons.length ? `<div class="stores">${buttons.join('')}</div>` : '';
};
