/**
 * Страница-оглавление /razdely: все жанры, режимы, настроения, платформы и теги
 * со счётчиками игр. Это хаб перелинковки: каждая страница таксономии оказывается
 * в двух кликах от главной, а голые адреса /genre, /tag, /mode, /mood, /platform
 * ведут сюда редиректом (tools/build-static.mjs → _redirects).
 */
import { GAMES } from '../catalog/index.js';
import { GENRES, TAGS, MODES, MOODS, PLATFORMS } from '../taxonomy.js';
import { t, tl } from '../i18n.js';
import { icon } from '../icons.js';
import { esc } from './components.js';

/** kind — сегмент адреса, dict — словарь таксономии, field — поле игры для подсчёта */
const GROUPS = [
  { kind: 'genre', dict: GENRES, field: 'genres', label: 'sections.genres' },
  { kind: 'mode', dict: MODES, field: 'modes', label: 'sections.modes' },
  { kind: 'mood', dict: MOODS, field: 'moods', label: 'sections.moods' },
  { kind: 'platform', dict: PLATFORMS, field: 'platforms', label: 'sections.platforms' },
  { kind: 'tag', dict: TAGS, field: 'tags', label: 'sections.tags' },
];

const countBy = (field, id) => GAMES.filter((g) => g[field].includes(id)).length;

function group({ kind, dict, field, label }) {
  const items = Object.keys(dict)
    .map((id) => ({ id, n: countBy(field, id) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  return `
    <section class="sections-group" id="${kind}" aria-labelledby="sections-${kind}">
      <h2 id="sections-${kind}" class="h-lg">${esc(t(label))}</h2>
      <div class="chips-cloud">${items.map(({ id, n }) => {
        const icn = dict[id].icon ? `${icon(dict[id].icon)} ` : '';
        return `<a class="chip" href="#/${kind}/${encodeURIComponent(id)}" data-action="nav">${icn}${esc(tl(dict, id))} <span class="muted">${n}</span></a>`;
      }).join('')}</div>
    </section>`;
}

export function render() {
  return `
  <section class="section sections-page">
    <header class="section-head">
      <h1>${esc(t('sections.title'))}</h1>
      <p>${esc(t('sections.text'))}</p>
    </header>
    ${GROUPS.map(group).join('')}
    <div class="center"><a class="btn btn-outline" href="#/podborki" data-action="nav">${esc(t('top.title'))} →</a></div>
  </section>`;
}

export const title = () => `${t('sections.title')} — ${t('site.name')}`;
export const description = () => t('sections.meta');
