/** Каталог с фильтрами. Состояние фильтров живёт в адресе (#/catalog?mode=coopOnline&…),
 *  поэтому любую выборку можно скопировать ссылкой, а поисковики видят её как отдельную страницу. */
import { GAMES } from '../catalog/index.js';
import { GENRES, TAGS, MODES, MOODS, PLATFORMS, PRICE } from '../taxonomy.js';
import { t, tl, tp, getLang } from '../i18n.js';
import { adSlot, breadcrumbLd, faqLd, cardsGrid, gameCard, emptyState, esc, filterGroup, genreOptionList, platformOptionList, modeOptionList, tagOptions } from './components.js';
import { getProfile } from '../store.js';
import { icon } from '../icons.js';
import { FEATURES } from '../config.js';
import { currentPath, navigate, publicUrl } from '../nav.js';
import { COLLECTIONS, collectionById, collectionLinks, collectionTitle, collectionMeta } from './collections.js';
import { taxonomySeo } from './seo-titles.js';

const POPULAR_TAGS = [
  'coopfocused', 'splitscreen', 'storyrich', 'openworld', 'difficult', 'cozy', 'short',
  'long', 'replayable', 'lowsysreq', 'steamdeck', 'mods', 'crafting', 'dark',
].filter((id) => TAGS[id]);

const SORTS = {
  rating: (a, b) => b.rating - a.rating,
  year: (a, b) => b.y - a.y,
  short: (a, b) => (a.len[1] ?? Infinity) - (b.len[1] ?? Infinity),
  players: (a, b) => b.players[1] - a.players[1],
  title: (a, b) => a.t.localeCompare(b.t, getLang()),
};

/** Открыта ли шторка фильтров на мобиле (переживает перерендеры при выборе фильтров) */
let filtersOpen = false;
export const isFiltersOpen = () => filtersOpen;
export const setFiltersOpen = (value) => { filtersOpen = Boolean(value); };

/** Парсим фильтры из query-строки (все значения — простые списки через запятую) */
export function parseFilters(query = {}, preset = {}) {
  const list = (value) => (value ? String(value).split(',').filter(Boolean) : []);
  // Неизвестные id из рукописного query отбрасываем: иначе рендер падает на MODES[id].icon
  const keep = (value, dict) => list(value).filter((id) => dict[id]);
  return {
    q: query.q || '',
    modes: keep(query.mode, MODES),
    players: Number(query.players) || 0,
    platforms: keep(query.platform, PLATFORMS),
    genres: keep(query.genre, GENRES),
    tags: keep(query.tag, TAGS),
    moods: keep(query.mood, MOODS),
    price: query.price || 'any',
    time: query.time || 'any',
    coopLocal: query.coopLocal === '1',
    sort: query.sort || 'rating',
    page: Number(query.page) || FEATURES.pageSize,
    ...preset,
  };
}

const priceOk = (game, price) => {
  if (price === 'any') return true;
  if (price === 'free') return game.price === 'free' || game.price === 'subscription';
  if (price === 'upto1000') return ['free', 'subscription', 'cheap'].includes(game.price) || game.priceRub <= 1000;
  if (price === 'upto2500') return ['free', 'subscription', 'cheap', 'mid'].includes(game.price);
  return true;
};

const timeOk = (game, time) => {
  if (!time || time === 'any') return true;
  if (time === 'tiny') return game.len[0] != null && game.len[0] <= 8;
  if (time === 'short') return game.len[0] != null && game.len[0] <= 20;
  if (time === 'medium') return game.len[0] != null && game.len[1] != null && game.len[0] <= 60 && game.len[1] >= 15;
  if (time === 'long') return game.len[1] != null && game.len[1] >= 40;
  return true;
};

/**
 * Текст для поиска по игре: собирается один раз на язык, а не на каждое нажатие
 * клавиши для каждой из ~600 игр (join + toLowerCase описаний заметно тормозил ввод
 * на слабых телефонах).
 */
const searchCache = new Map();
function searchText(g) {
  const lang = getLang();
  const key = `${lang}:${g.slug}`;
  let text = searchCache.get(key);
  if (text === undefined) {
    text = [
      g.t, g.dev, String(g.y), g.desc?.[lang] || '',
      ...g.genres.map((id) => tl(GENRES, id)), ...g.tags.map((id) => tl(TAGS, id)),
    ].join(' ').toLowerCase();
    searchCache.set(key, text);
  }
  return text;
}

/** Применение фильтров к каталогу */
export function filterGames(filters) {
  const query = filters.q.trim().toLowerCase();
  return GAMES.filter((g) => {
    if (filters.modes.length && !filters.modes.some((m) => g.modes.includes(m))) return false;
    if (filters.players && g.players[1] < filters.players) return false;
    if (filters.platforms.length && !filters.platforms.some((p) => g.platforms.includes(p))) return false;
    if (filters.genres.length && !filters.genres.some((x) => g.genres.includes(x))) return false;
    if (filters.tags.length && !filters.tags.some((x) => g.tags.includes(x))) return false;
    if (filters.moods.length && !filters.moods.some((x) => g.moods.includes(x))) return false;
    if (filters.coopLocal && !g.modes.includes('coopLocal')) return false;
    if (!priceOk(g, filters.price)) return false;
    if (!timeOk(g, filters.time)) return false;
    if (query && !searchText(g).includes(query)) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ *
 * Страница
 * ------------------------------------------------------------------ */

/** Уникальный SEO-текст лендинга таксономии (/genre/:id, /mode/:id, /mood/:id).
 *  На страницах тегов и платформ уникального текста нет — там обычный каталог. */
export const landingFor = (ctx) => {
  if (ctx?.name === 'collection') {
    const c = collectionById(ctx.params?.id);
    return c ? { meta: c.meta, body: c.intro, related: c.related, faq: c.faq } : null;
  }
  const key = ctx?.name && ctx?.params?.id ? `${ctx.name}:${ctx.params.id}` : '';
  return LANDING_TEXTS?.[key] || null;
};

/**
 * Тексты лендингов (~20 КиБ после сжатия) нужны только на страницах таксономии —
 * грузим их по требованию, а не на каждой странице сайта.
 */
let LANDING_TEXTS = null;
let landingPromise = null;
export function loadLandingTexts() {
  landingPromise ||= import('./landing-texts.js').then((m) => { LANDING_TEXTS = m.LANDING_TEXTS; });
  return landingPromise;
}
const LANDING_ROUTES = ['genre', 'mode', 'mood', 'tag', 'platform'];
/** Перед рендером страницы таксономии подгружаем её текст: null — ждать нечего */
export const prepare = (ctx) => (LANDING_ROUTES.includes(ctx?.name) && !LANDING_TEXTS ? loadLandingTexts() : null);

/** Поисковый H1/заголовок вкладки страницы таксономии (только ru, en — шаблоны) */
const seoFor = (ctx) => {
  if (!ctx?.params?.id) return null;
  if (getLang() === 'ru') return taxonomySeo(ctx.name, ctx.params.id);
  // английский H1 жанра — «Stealth games», а не одно слово «Stealth»
  return ctx.name === 'genre' && ctx.preset?.heading ? { h1: `${ctx.preset.heading} games`, title: TITLE_TEMPLATES.en.genre(ctx.preset.heading) } : null;
};

/** Словари для related-ссылок: каждая ведёт на реальную страницу таксономии */
const RELATED_DICTS = { genre: GENRES, mode: MODES, mood: MOODS, tag: TAGS, platform: PLATFORMS };
const relatedChips = (ids = []) => ids
  .map((ref) => {
    const [kind, id] = String(ref).split(':');
    if (kind === 'top') {
      const c = COLLECTIONS[id];
      return c ? `<a class="chip" href="#/top/${encodeURIComponent(id)}" data-action="nav">${icon(c.icon)} ${esc(c.h1[getLang()] || c.h1.ru)}</a>` : '';
    }
    const dict = RELATED_DICTS[kind];
    if (!dict || !dict[id]) return '';
    const icn = dict[id].icon ? `${icon(dict[id].icon)} ` : '';
    return `<a class="chip" href="#/${kind}/${encodeURIComponent(id)}" data-action="nav">${icn}${esc(tl(dict, id))}</a>`;
  })
  .join('');

export function render(ctx) {
  const filters = parseFilters(ctx.query, ctx.preset || {});
  const found = filterGames(filters).sort(SORTS[filters.sort] || SORTS.rating);
  const shown = found.slice(0, filters.page);
  const more = Math.min(FEATURES.pageSize, Math.max(0, found.length - shown.length));

  const presetTitle = seoFor(ctx)?.h1 || ctx.preset?.heading;
  const heading = presetTitle || t('catalog.title');
  const subtitle = presetTitle
    ? tp('catalog.subtitle', found.length)
    : tp('catalog.subtitle', GAMES.length);
  const landing = landingFor(ctx);
  const landingBody = landing ? (landing.body[getLang()] || landing.body.ru) : null;

  // Все непустые фильтры собираем в ссылку-«поделиться»
  const activeChips = [
    ...filters.modes.map((id) => ({ icn: MODES[id].icon, label: tl(MODES, id), kind: 'mode', id })),
    ...filters.platforms.map((id) => ({ icn: PLATFORMS[id].icon, label: tl(PLATFORMS, id), kind: 'platform', id })),
    ...filters.genres.map((id) => ({ label: tl(GENRES, id), kind: 'genre', id })),
    ...filters.tags.map((id) => ({ label: tl(TAGS, id), kind: 'tag', id })),
    ...filters.moods.map((id) => ({ label: tl(MOODS, id), kind: 'mood', id })),
    ...(filters.players ? [{ label: `${filters.players}+ ${t('catalog.players')}`, kind: 'players', id: filters.players }] : []),
    ...(filters.price !== 'any' ? [{ label: tl(PRICE, filters.price), kind: 'price', id: filters.price }] : []),
    ...(filters.time !== 'any' ? [{ label: t(`opt.time${filters.time[0].toUpperCase()}${filters.time.slice(1)}`), kind: 'time', id: filters.time }] : []),
    ...(filters.coopLocal ? [{ label: tl(MODES, 'coopLocal'), kind: 'coopLocal', id: 1 }] : []),
  ];

  const activeFilterCount = filters.modes.length + filters.platforms.length + filters.genres.length
    + filters.tags.length + filters.moods.length + (filters.players ? 1 : 0)
    + (filters.price !== 'any' ? 1 : 0) + (filters.time !== 'any' ? 1 : 0) + (filters.coopLocal ? 1 : 0);

  // чипы пресетных разделов (/genre/rpg и т.п.) снять нельзя — рисуем их без крестика,
  // иначе крестик обещает то, чего не делает
  const presetKey = { mode: 'modes', platform: 'platforms', genre: 'genres', tag: 'tags', mood: 'moods' };
  const isPresetChip = (c) => {
    // у подборок (/top/…) в пресете бывают и одиночные фильтры: цена, длительность, игроки
    if (['price', 'time', 'players', 'coopLocal'].includes(c.kind)) return ctx.preset?.[c.kind] !== undefined;
    return (ctx.preset?.[presetKey[c.kind]] || []).some((x) => String(x) === String(c.id));
  };
  const faq = landing?.faq?.[getLang()] || [];
  const isCollection = ctx.name === 'collection';
  const chipHtml = (c) => {
    const icn = c.icn ? `${icon(c.icn)} ` : '';
    return isPresetChip(c)
      ? `<span class="chip chip-active">${icn}${esc(c.label)}</span>`
    : `<button type="button" class="chip chip-active" data-action="f-remove" data-kind="${c.kind}" data-id="${esc(String(c.id))}">${icn}${esc(c.label)} <span aria-hidden=\"true\">×</span></button>`;
  };

  return `
  <section class="section catalog">
    <header class="section-head">
      <h1>${ctx.preset?.icon ? `${icon(ctx.preset.icon)} ` : ''}${esc(heading)}</h1>
      <p>${esc(subtitle)}</p>
    </header>

    ${landingBody ? `
    <div class="landing-intro">
      ${landingBody.map((p) => `<p>${esc(p)}</p>`).join('')}
      ${landing.related?.length ? `<div class="landing-related"><span class="landing-related-title">${esc(t('catalog.related'))}</span><div class="chips-cloud small">${relatedChips(landing.related)}</div></div>` : ''}
    </div>` : ''}

    <button type="button" class="btn btn-outline filters-toggle" data-action="filters-toggle" aria-expanded="${filtersOpen}" aria-controls="catalog-filters">${icon('search')} ${esc(t('catalog.filters'))}${activeFilterCount ? ` <span class="filters-count">${activeFilterCount}</span>` : ''}</button>

    <div class="catalog-layout">
      <aside class="filters${filtersOpen ? ' open' : ''}" id="catalog-filters">
        <div class="filters-head"><span>${esc(t('catalog.filters'))}</span><button type="button" data-action="filters-toggle" aria-label="${esc(t('common.close'))}">${icon('x')}</button></div>
        <div class="filter-search">
          <input type="search" class="input" id="catalog-q" placeholder="${esc(t('catalog.search'))}" value="${esc(filters.q)}">
        </div>

        ${filterGroup(t('catalog.mode'), modeOptionList(), filters.modes, { action: 'f-mode' })}
        ${filterGroup(t('catalog.players'), [
          { id: 2, label: '2+', icon: 'users' }, { id: 4, label: '4+', icon: 'usersPlus' }, { id: 8, label: '8+', icon: 'crowd' },
        ], filters.players ? [filters.players] : [], { action: 'f-players' })}
        ${filterGroup(t('catalog.platform'), platformOptionList(), filters.platforms, { action: 'f-platform' })}
        ${filterGroup(t('catalog.genre'), genreOptionList(), filters.genres, { action: 'f-genre' })}
        ${filterGroup(t('catalog.price'), [
          { id: 'free', label: tl(PRICE, 'free'), icon: 'gift' },
          { id: 'upto1000', label: tl(PRICE, 'cheap'), icon: 'coin' },
          { id: 'upto2500', label: tl(PRICE, 'mid'), icon: 'coins' },
        ], filters.price !== 'any' ? [filters.price] : [], { action: 'f-price' })}
        ${filterGroup(t('catalog.time'), [
          { id: 'tiny', label: '≤ 8 ч', icon: 'bolt' },
          { id: 'short', label: '≤ 20 ч', icon: 'sun' },
          { id: 'medium', label: '20–60 ч', icon: 'calendar' },
          { id: 'long', label: '60+ ч', icon: 'mountain' },
        ], filters.time !== 'any' ? [filters.time] : [], { action: 'f-time' })}
        ${filterGroup(t('catalog.tags'), tagOptions(POPULAR_TAGS), filters.tags, { action: 'f-tag' })}
        ${filterGroup(t('catalog.localCoop'), [
          { id: 1, label: tl(MODES, 'coopLocal'), icon: 'users' },
        ], filters.coopLocal ? [1] : [], { action: 'f-cooplocal' })}

        <div class="filter-group">
          <div class="filter-title">${esc(t('catalog.sort'))}</div>
          <select class="input" id="catalog-sort" aria-label="${esc(t('catalog.sort'))}">
            ${Object.keys(SORTS).map((id) => `<option value="${id}" ${filters.sort === id ? 'selected' : ''}>${esc(t(`catalog.sort.${id}`))}</option>`).join('')}
          </select>
        </div>
        <button type="button" class="btn btn-ghost" data-action="f-reset">${esc(t('catalog.reset'))}</button>
        <div class="filters-foot"><button type="button" class="btn btn-primary" data-action="filters-apply">${esc(tp('catalog.show', found.length))}</button></div>
      </aside>

      <div class="catalog-main">
        <div class="catalog-topbar">
          <h2 id="catalog-found" class="h-base">${esc(tp('catalog.found', found.length))}</h2>
          ${activeChips.length ? `<div class="chips-cloud small">${activeChips.map(chipHtml).join('')}</div>` : ''}
        </div>

        ${found.length
          ? cardsGrid(shown, { id: 'catalog-grid', marks: getProfile().marks, insertAfter: 8, insertHtml: adSlot('catalog-inline') })
          : emptyState(t('results.empty'), t('catalog.reset'), `<button type="button" class="btn btn-primary" data-action="f-reset">${esc(t('catalog.reset'))}</button>`)}

        ${more ? `<div class="center"><button type="button" class="btn btn-outline" data-action="show-more" data-more="${more}">${esc(tp('catalog.showMore', more))}</button></div>` : ''}
      </div>
    </div>

    ${faq.length ? `
    <section class="faq" aria-labelledby="faq-title">
      <h2 id="faq-title">${esc(t('top.faq'))}</h2>
      ${faq.map(([q, a]) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
    </section>` : ''}

    ${isCollection || ctx.name === 'catalog' ? `
    <section class="more-collections" aria-labelledby="more-collections-title">
      <h2 id="more-collections-title">${esc(t(isCollection ? 'top.more' : 'top.title'))}</h2>
      <div class="quick-picks collections-list">${collectionLinks(undefined, { exclude: ctx.params?.id })}</div>
    </section>` : ''}
  </section>`;
}

/** Когда поиск вызвал пересчёт: вернём фокус в поле ввода (оно пересоздаётся при рендере) */
let searchFocusAt = 0;

export function mount(root) {
  const input = root.querySelector('#catalog-q');
  if (input) {
    // после пересчёта по вводу фокус слетает на body — возвращаем в поиск, каретку в конец
    if (searchFocusAt && Date.now() - searchFocusAt < 1500) input.focus();
    searchFocusAt = 0;
    try { if (document.activeElement === input) input.setSelectionRange(input.value.length, input.value.length); } catch { /* ignore */ }
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Поле уже убрано со страницы (человек перешёл по ссылке, пока шёл таймер):
        // раньше ?q= приклеивался к адресу чужой страницы — /game/x?q=…
        if (!input.isConnected) return;
        // фокус возвращаем, только если пользователь всё ещё печатает (а не ушёл на фильтры)
        searchFocusAt = document.activeElement === input ? Date.now() : 0;
        updateQuery({ q: input.value, page: FEATURES.pageSize });
      }, 260);
    });
  }
  root.querySelector('#catalog-sort')?.addEventListener('change', (e) => updateQuery({ sort: e.target.value }));
}

/**
 * Обновляет фильтры в адресе — таблица перерисовывается роутером.
 * keepScroll: true — не менять позицию прокрутки (пагинация «Показать ещё»).
 * Смена фильтров этим флагом не пользуется: там возврат наверх ожидаем.
 */
export function updateQuery(patch, { keepScroll = false } = {}) {
  const [path, queryString = ''] = currentPath().split('?');
  const params = new URLSearchParams(queryString);
  for (const [key, value] of Object.entries(patch)) {
    if (value === '' || value === null || value === undefined || value === 0 || value === 'any' || (Array.isArray(value) && !value.length)) params.delete(key);
    else params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const next = `${path}${params.toString() ? `?${params.toString()}` : ''}`;
  if (next === currentPath()) window.dispatchEvent(new CustomEvent('gf:rerender'));
  else navigate(next, { replace: true, keepScroll });
}

/** Общая точка для чипов-переключателей каталога (вызывается из app.js) */
export function toggleFilter(kind, id, current) {
  const map = { mode: 'mode', platform: 'platform', genre: 'genre', tag: 'tag', mood: 'mood' };
  if (map[kind]) {
    const list = current[`${map[kind]}s`].slice();
    const idx = list.findIndex((x) => String(x) === String(id));
    if (idx >= 0) list.splice(idx, 1); else list.push(String(id));
    updateQuery({ [map[kind]]: list, page: FEATURES.pageSize });
    return;
  }
  if (kind === 'players') return updateQuery({ players: String(id) === String(current.players) ? 0 : Number(id) });
  if (kind === 'price') return updateQuery({ price: String(id) === current.price ? 'any' : id });
  if (kind === 'time') return updateQuery({ time: String(id) === current.time ? 'any' : id });
  if (kind === 'coopLocal') return updateQuery({ coopLocal: current.coopLocal ? 0 : 1 });
}

export function removeFilter(kind, id, current) {
  const map = { mode: 'mode', platform: 'platform', genre: 'genre', tag: 'tag', mood: 'mood' };
  if (map[kind]) {
    const key = map[kind];
    return updateQuery({ [key]: current[`${key}s`].filter((x) => String(x) !== String(id)), page: FEATURES.pageSize });
  }
  if (['players', 'price', 'time', 'coopLocal'].includes(kind)) {
    return updateQuery({ [kind === 'coopLocal' ? 'coopLocal' : kind]: kind === 'price' || kind === 'time' ? 'any' : 0 });
  }
}

/** Заголовок вкладки и сниппета: формулировки, по которым ищут («игры в жанре RPG»), а не голое «RPG» */
const TITLE_TEMPLATES = {
  ru: {
    genre: (h) => `Игры в жанре «${h}»`,
    mode: (h) => `${h}: список игр`,
    mood: (h) => `Игры под настроение «${h}»`,
    tag: (h) => `«${h}»: подборка игр`,
    platform: (h) => `Игры для платформы «${h}»`,
    catalog: () => 'Каталог игр с фильтрами',
  },
  // Английская версия: заголовки под то, как ищут на английском («best stealth games»)
  en: {
    genre: (h) => `Best ${h} games: top-rated picks to play`,
    mode: (h) => `${h} games: the best picks with filters`,
    mood: (h) => `Best games for the mood: ${h}`,
    tag: (h) => `${h} games: list with ratings and filters`,
    platform: (h) => `Best ${h} games: top-rated picks`,
    catalog: () => 'Game catalog with filters',
  },
};
export const title = (ctx) => {
  if (ctx?.name === 'collection') return `${collectionTitle(ctx.params.id)} — ${t('site.name')}`;
  const seo = seoFor(ctx);
  if (seo) return `${seo.title} — ${t('site.name')}`;
  const set = TITLE_TEMPLATES[getLang()] || TITLE_TEMPLATES.ru;
  const make = set[ctx?.name] || set.catalog;
  return `${ctx?.preset?.heading ? make(ctx.preset.heading) : set.catalog()} — ${t('site.name')}`;
};
export const description = (ctx) => {
  // На лендингах жанров/режимов/настроений — уникальное мета-описание вместо шаблонного
  if (ctx?.name === 'collection') return collectionMeta(ctx.params.id);
  const landing = landingFor(ctx);
  if (landing) return landing.meta[getLang()] || landing.meta.ru;
  return `${ctx?.preset?.heading || t('catalog.title')}. ${tp('catalog.subtitle', GAMES.length)}`;
};

/**
 * Разметка для поисковиков: страница-список с первыми играми выборки.
 * Порядок — тот же, что видит человек (по оценке), без фильтров из адреса.
 */
export function jsonLd(ctx) {
  if (!['collection', 'genre', 'mode', 'tag', 'platform', 'mood'].includes(ctx?.name)) return null;
  const filters = parseFilters({}, ctx.preset || {});
  const games = filterGames(filters).sort(SORTS.rating).slice(0, 10);
  const path = `${ctx.name === 'collection' ? 'top' : ctx.name}/${ctx.params.id}`;
  const name = title(ctx).replace(/ — [^—]+$/, '');
  const parent = ctx.name === 'collection'
    ? { name: t('top.title'), url: publicUrl('podborki') }
    : { name: t('nav.catalog'), url: publicUrl('catalog') };
  const graph = [{
    '@type': 'CollectionPage',
    name,
    description: description(ctx),
    url: publicUrl(path),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: games.length,
      itemListElement: games.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: publicUrl(`game/${g.slug}`), name: g.t })),
    },
  }, breadcrumbLd([{ name: t('nav.home'), url: publicUrl('') }, parent, { name: seoFor(ctx)?.h1 || ctx.preset?.heading || name }])];
  // FAQ страницы — тот же текст, что виден в блоке «Вопросы и ответы»
  const faq = landingFor(ctx)?.faq?.[getLang()] || [];
  if (faq.length) graph.push(faqLd(faq));
  return { '@context': 'https://schema.org', '@graph': graph };
}
