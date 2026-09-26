/** «Во что поиграть вместе»: подбор под конкретную компанию и платформы. */
import { recommendForParty } from '../engine.js';
import { icon } from '../icons.js';
import { MODES, PLATFORMS } from '../taxonomy.js';
import { t, tl, tp, getLang } from '../i18n.js';
import { getProfile } from '../store.js';
import { cardsGrid, esc, emptyState, filterGroup } from './components.js';
import { currentPath, navigate } from '../nav.js';
import { FEATURES } from '../config.js';

const PLAYER_PRESETS = [
  { id: 2, label: '2' },
  { id: 3, label: '3' },
  { id: 4, label: '4' },
  { id: 5, label: '5+' },
];

/**
 * Сколько карточек уже показано. Движок отдаёт весь подходящий пул (раньше вид
 * резал его жёсткими 24 играми — «Показать ещё» не было вовсе, а в заголовке
 * стояло число из выдачи), а страница показывает пул порциями, как «Результаты».
 */
let shownCount = FEATURES.pageSize;

/** «Показать ещё»: увеличивает порцию и перерисовывает страницу (см. js/app.js) */
export function showMore(n = FEATURES.pageSize) {
  shownCount += n;
}

/** Сброс пагинации при входе на вкладку заново или при смене фильтров компании */
export const reset = () => { shownCount = FEATURES.pageSize; };

export function render(ctx) {
  const profile = getProfile();
  // пресетов всего 4 (максимум «5+»): большее число сводим к 5, иначе подпись врёт,
  // а активный пресет не подсвечивается
  const players = Math.min(5, Number(ctx.query.players) || Number(profile.answers?.players) || 2);
  const platforms = (ctx.query.platforms ? String(ctx.query.platforms).split(',') : (profile.answers?.platforms || [])).filter((p) => PLATFORMS[p]);
  const freeOnly = ctx.query.free === '1';

  const games = recommendForParty({
    players,
    platforms,
    freeOnly,
    seed: (profile.meta?.seed || 1) + players,
    lang: getLang(),
  });

  const form = `
    <div class="party-form">
      ${filterGroup(t('party.players'), PLAYER_PRESETS, [players], { action: 'p-players' })}
      ${filterGroup(t('party.platforms'), Object.keys(PLATFORMS).map((id) => ({ id, label: tl(PLATFORMS, id), icon: PLATFORMS[id].icon })), platforms, { action: 'p-platform' })}
      ${filterGroup(' ', [{ id: 1, label: t('party.freeOnly'), icon: 'gift' }], freeOnly ? [1] : [], { action: 'p-free' })}
    </div>`;

  const localCoop = games.filter((g) => g.modes.includes('coopLocal')).length;
  const shown = games.slice(0, shownCount);
  const more = Math.max(0, Math.min(FEATURES.pageSize, games.length - shown.length));

  return `
  <section class="section party">
    <header class="section-head">
      <h1>${esc(t('party.title'))}</h1>
      <p>${esc(t('party.subtitle'))}</p>
    </header>
    ${form}
    <h2 class="notice h-base">${icon('target')} ${esc(tp('party.result', games.length, { n: players, m: games.length }))}
      ${localCoop ? `<span class="dot-sep">•</span> ${esc(tp('party.coopLine', localCoop, { n: localCoop }))}` : ''}
    </h2>
    ${games.length
      ? cardsGrid(shown, { marks: getProfile().marks })
      : emptyState(t('results.empty'), t('party.localHint'), `<a class="btn btn-primary" href="#/catalog?coopLocal=1" data-action="nav">${esc(tl(MODES, 'coopLocal'))}</a>`)}
    <div class="center">
      ${more ? `<button type="button" class="btn btn-outline" data-action="show-more" data-more="${more}">${esc(tp('catalog.showMore', more))}</button>` : ''}
      <a class="btn btn-ghost" href="#/catalog" data-action="nav">${esc(t('home.cta.catalog'))}</a>
    </div>
  </section>`;
}

/** Обновление параметров компании в адресе */
export function updateParty(patch) {
  const [, queryString = ''] = currentPath().split('?');
  const params = new URLSearchParams(queryString);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) params.delete(key);
    else params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  // Фильтры компании меняют пул целиком: показываем первые игры новой выдачи,
  // а не «докрученную» порцию от прошлого запроса.
  reset();
  navigate(`party${params.toString() ? `?${params}` : ''}`, { replace: true });
}

export const title = () => `${t('party.title')} — ${t('site.name')}`;
export const description = () => t('party.subtitle');
