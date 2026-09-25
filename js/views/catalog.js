/** Каталог с фильтрами. Состояние фильтров живёт в адресе (#/catalog?mode=coopOnline&…),
 *  поэтому любую выборку можно скопировать ссылкой, а поисковики видят её как отдельную страницу. */
import { GAMES } from '../catalog/index.js';
import { GENRES, TAGS, MODES, MOODS, PLATFORMS, PRICE } from '../taxonomy.js';
import { t, tl, getLang } from '../i18n.js';
import { adSlot, cardsGrid, gameCard, emptyState, esc, filterGroup, genreOptionList, platformOptionList, modeOptionList, tagOptions } from './components.js';
import { getProfile } from '../store.js';
import { FEATURES } from '../config.js';
import { currentPath, navigate } from '../nav.js';

const POPULAR_TAGS = [
  'coopfocused', 'splitscreen', 'storyrich', 'openworld', 'difficult', 'cozy', 'short',
  'long', 'replayable', 'lowsysreq', 'steamdeck', 'mods', 'crafting', 'dark', 'cozy',
].filter((id) => TAGS[id]);

const SORTS = {
  rating: (a, b) => b.rating - a.rating,
  year: (a, b) => b.y - a.y,
  short: (a, b) => a.len[1] - b.len[1],
  players: (a, b) => b.players[1] - a.players[1],
  title: (a, b) => a.t.localeCompare(b.t, getLang()),
};

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
  if (time === 'tiny') return game.len[0] <= 8;
  if (time === 'short') return game.len[0] <= 20;
  if (time === 'medium') return game.len[0] <= 60 && game.len[1] >= 15;
  if (time === 'long') return game.len[1] >= 40;
  return true;
};

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
    if (query) {
      const haystack = [
        g.t, g.dev, String(g.y), g.desc?.[getLang()] || '',
        ...g.genres.map((id) => tl(GENRES, id)), ...g.tags.map((id) => tl(TAGS, id)),
      ].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/* ------------------------------------------------------------------ *
 * Страница
 * ------------------------------------------------------------------ */

export function render(ctx) {
  const filters = parseFilters(ctx.query, ctx.preset || {});
  const found = filterGames(filters).sort(SORTS[filters.sort] || SORTS.rating);
  const shown = found.slice(0, filters.page);
  const more = Math.min(FEATURES.pageSize, Math.max(0, found.length - shown.length));

  const presetTitle = ctx.preset?.heading;
  const heading = presetTitle || t('catalog.title');
  const subtitle = presetTitle
    ? t('catalog.subtitle', { n: found.length })
    : t('catalog.subtitle', { n: GAMES.length });

  // Все непустые фильтры собираем в ссылку-«поделиться»
  const activeChips = [
    ...filters.modes.map((id) => ({ label: `${MODES[id].icon} ${tl(MODES, id)}`, kind: 'mode', id })),
    ...filters.platforms.map((id) => ({ label: `${PLATFORMS[id].icon} ${tl(PLATFORMS, id)}`, kind: 'platform', id })),
    ...filters.genres.map((id) => ({ label: tl(GENRES, id), kind: 'genre', id })),
    ...filters.tags.map((id) => ({ label: tl(TAGS, id), kind: 'tag', id })),
    ...filters.moods.map((id) => ({ label: tl(MOODS, id), kind: 'mood', id })),
    ...(filters.players ? [{ label: `${filters.players}+ ${t('catalog.players')}`, kind: 'players', id: filters.players }] : []),
    ...(filters.price !== 'any' ? [{ label: tl(PRICE, filters.price), kind: 'price', id: filters.price }] : []),
    ...(filters.time !== 'any' ? [{ label: t(`opt.time${filters.time[0].toUpperCase()}${filters.time.slice(1)}`), kind: 'time', id: filters.time }] : []),
    ...(filters.coopLocal ? [{ label: tl(MODES, 'coopLocal'), kind: 'coopLocal', id: 1 }] : []),
  ];

  return `
  <section class="section catalog">
    <header class="section-head">
      <h1>${esc(heading)}</h1>
      <p>${esc(subtitle)}</p>
    </header>

    <div class="catalog-layout">
      <aside class="filters" id="catalog-filters">
        <div class="filter-search">
          <input type="search" class="input" id="catalog-q" placeholder="${esc(t('catalog.search'))}" value="${esc(filters.q)}">
        </div>

        ${filterGroup(t('catalog.mode'), modeOptionList(), filters.modes, { action: 'f-mode' })}
        ${filterGroup(t('catalog.players'), [
          { id: 2, label: '2+', icon: '👫' }, { id: 4, label: '4+', icon: '👨‍👩‍👧' }, { id: 8, label: '8+', icon: '🎉' },
        ], filters.players ? [filters.players] : [], { action: 'f-players' })}
        ${filterGroup(t('catalog.platform'), platformOptionList(), filters.platforms, { action: 'f-platform' })}
        ${filterGroup(t('catalog.genre'), genreOptionList(), filters.genres, { action: 'f-genre' })}
        ${filterGroup(t('catalog.price'), [
          { id: 'free', label: tl(PRICE, 'free'), icon: '🆓' },
          { id: 'upto1000', label: tl(PRICE, 'cheap'), icon: '🪙' },
          { id: 'upto2500', label: tl(PRICE, 'mid'), icon: '💵' },
        ], filters.price !== 'any' ? [filters.price] : [], { action: 'f-price' })}
        ${filterGroup(t('catalog.time'), [
          { id: 'tiny', label: '≤ 8 ч', icon: '⚡' },
          { id: 'short', label: '≤ 20 ч', icon: '🌤️' },
          { id: 'medium', label: '20–60 ч', icon: '🗓️' },
          { id: 'long', label: '60+ ч', icon: '🏔️' },
        ], filters.time !== 'any' ? [filters.time] : [], { action: 'f-time' })}
        ${filterGroup(t('catalog.tags'), tagOptions(POPULAR_TAGS), filters.tags, { action: 'f-tag' })}
        ${filterGroup(t('catalog.localCoop'), [
          { id: 1, label: tl(MODES, 'coopLocal'), icon: '🛋️' },
        ], filters.coopLocal ? [1] : [], { action: 'f-cooplocal' })}

        <div class="filter-group">
          <div class="filter-title">${esc(t('catalog.sort'))}</div>
          <select class="input" id="catalog-sort">
            ${Object.keys(SORTS).map((id) => `<option value="${id}" ${filters.sort === id ? 'selected' : ''}>${esc(t(`catalog.sort.${id}`))}</option>`).join('')}
          </select>
        </div>
        <button type="button" class="btn btn-ghost" data-action="f-reset">${esc(t('catalog.reset'))}</button>
      </aside>

      <div class="catalog-main">
        <div class="catalog-topbar">
          <strong id="catalog-found">${esc(t('catalog.found', { n: found.length }))}</strong>
          ${activeChips.length ? `<div class="chips-cloud small">${activeChips.map((c) => `<button type="button" class="chip chip-active" data-action="f-remove" data-kind="${c.kind}" data-id="${esc(String(c.id))}">${esc(c.label)} ✕</button>`).join('')}</div>` : ''}
        </div>

        ${found.length
          ? `<div class="grid" id="catalog-grid">${shown.map((g) => gameCard(g, { mark: getProfile().marks?.[g.slug]?.status || null })).join('')}</div>`
          : emptyState(t('results.empty'), t('catalog.reset'), `<button type="button" class="btn btn-primary" data-action="f-reset">${esc(t('catalog.reset'))}</button>`)}

        ${more ? `<div class="center"><button type="button" class="btn btn-outline" data-action="show-more" data-more="${more}">${esc(t('catalog.showMore', { n: more }))}</button></div>` : ''}
        ${adSlot('catalog-inline')}
      </div>
    </div>
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
        // фокус возвращаем, только если пользователь всё ещё печатает (а не ушёл на фильтры)
        searchFocusAt = document.activeElement === input ? Date.now() : 0;
        updateQuery({ q: input.value, page: FEATURES.pageSize });
      }, 260);
    });
  }
  root.querySelector('#catalog-sort')?.addEventListener('change', (e) => updateQuery({ sort: e.target.value }));
}

/** Обновляет фильтры в адресе — таблица перерисовывается роутером */
export function updateQuery(patch) {
  const [path, queryString = ''] = currentPath().split('?');
  const params = new URLSearchParams(queryString);
  for (const [key, value] of Object.entries(patch)) {
    if (value === '' || value === null || value === undefined || value === 0 || value === 'any' || (Array.isArray(value) && !value.length)) params.delete(key);
    else params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const next = `${path}${params.toString() ? `?${params.toString()}` : ''}`;
  if (next === currentPath()) window.dispatchEvent(new CustomEvent('gf:rerender'));
  else navigate(next, { replace: true });
}

/** Общая точка для чипов-переключателей каталога (вызывается изapp.js) */
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

export const title = (ctx) => `${ctx?.preset?.heading || t('catalog.title')} — ${t('site.name')}`;
export const description = (ctx) => `${ctx?.preset?.heading || t('catalog.title')}. ${t('catalog.subtitle', { n: GAMES.length })}`;
