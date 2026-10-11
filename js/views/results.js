/** Страница результатов: персональная выдача с объяснениями и пересчётом на ходу. */
import { recommend, tasteSummary } from '../engine.js';
import { icon } from '../icons.js';
import { GENRES, TAGS } from '../taxonomy.js';
import { t, tl, tp } from '../i18n.js';
import { getProfile, setMeta, trackImpressions, resetProfile } from '../store.js';
import { navigate } from '../nav.js';
import { progress } from '../quiz.js';
import { FEATURES } from '../config.js';
import { adSlot, cardsGrid, emptyState, esc } from './components.js';
import { apiReady, isLoggedIn } from '../api.js';

let limit = FEATURES.pageSize;

export function render() {
  const profile = getProfile();
  const seed = profile.meta?.seed || 1;
  const preset = profile.meta?.lastPreset || {};
  // запрашиваем сразу длинный хвост, чтобы «показать ещё» не пересобирал топ
  const result = recommend(profile, { limit: Math.max(limit, 60), seed, includePlayed: !!preset.includePlayed });
  const summary = tasteSummary(profile);
  // Есть ли ответы: считаем по доле отвеченных вопросов, а не по meta.completedAt —
  // это поле обновляется при каждом ответе и раньше означало «что-то когда-то отвечали».
  const answered = progress(profile.answers) > 0;

  // учитываем показы: следующая выдача не будет «залипать» на тех же играх
  trackImpressions(result.list.map((x) => x.game.slug));

  if (!result.list.length) {
    return `<section class="section"><h1>${esc(t('results.title'))}</h1>${emptyState(t('results.empty'), t('home.cta.start'), `<a class="btn btn-primary" href="#/quiz" data-action="nav">${esc(t('quiz.restart'))}</a>`)}</section>`;
  }

  const filtersBar = `
    <div class="results-bar">
      <div class="results-count">
        <h2>${esc(tp('results.pool', result.poolSize))}</h2>
        <span>${esc(t('results.subtitle'))}</span>
        ${result.confidence >= 25 ? `<span class="results-confidence" title="${esc(t('results.confidence.hint'))}">${esc(t('results.confidence', { n: result.confidence }))}</span>` : ''}
      </div>
      <div class="results-actions">
        <label class="switch">
          <input type="checkbox" data-action="toggle-played" ${preset.includePlayed ? 'checked' : ''}>
          <span>${esc(t('results.showPlayed'))}</span>
        </label>
        ${FEATURES.reshuffle ? `<button type="button" class="btn btn-outline" data-action="reshuffle">${icon('refresh')} ${esc(t('results.reshuffle'))}</button>` : ''}
        <a class="btn btn-ghost" href="#/quiz" data-action="nav">${icon('edit')} ${esc(t('quiz.restart'))}</a>
      </div>
    </div>`;

  const tasteBlock = (summary.topTags.length || summary.topGenres.length) ? `
    <aside class="taste-mini">
      <div>
        <span class="taste-label">${esc(t('profile.topTags'))}</span>
        <div class="chips-cloud small">
          ${summary.topTags.slice(0, 6).map((id) => `<a class="chip" href="#/tag/${id}" data-action="nav">${esc(tl(TAGS, id))}</a>`).join('')}
          ${summary.topGenres.slice(0, 3).map((id) => `<a class="chip chip-genre" href="#/genre/${id}" data-action="nav">${icon(GENRES[id]?.icon)} ${esc(tl(GENRES, id))}</a>`).join('')}
        </div>
      </div>
      ${summary.negativeTags.length ? `<div>
        <span class="taste-label">${esc(t('profile.negativeTags'))}</span>
        <div class="chips-cloud small">
          ${summary.negativeTags.slice(0, 4).map((id) => `<span class="chip chip-warn">${esc(tl(TAGS, id))}</span>`).join('')}
        </div>
      </div>` : ''}
    </aside>` : '';

  const shown = result.list.slice(0, limit);
  const more = Math.max(0, Math.min(FEATURES.pageSize, result.list.length - shown.length));

  return `
  <section class="section results">
    <header class="section-head">
      <h1>${esc(t('results.title'))}</h1>
      ${answered ? '' : `<p>${esc(t('home.hero.lead'))}</p>`}
    </header>

    ${result.relaxed ? `<div class="notice">${icon('alert')} ${esc(t('results.relaxed'))}</div>` : ''}
    ${filtersBar}
    ${tasteBlock}
    ${apiReady() && !isLoggedIn() ? `<div class="save-prompt">
      <div><strong>${icon('heart')} ${esc(t('results.saveTitle'))}</strong><p>${esc(t('results.saveText'))}</p></div>
      <a class="btn btn-primary" href="#/account" data-action="nav">${esc(t('results.saveBtn'))}</a>
    </div>` : ''}
    ${(() => {
      // Реклама — в ленте после первых шести игр, а не вплотную к фильтрам и кнопкам:
      // так она не провоцирует случайные клики (правила РСЯ)
      const opts = { whyBySlug: Object.fromEntries(result.list.map((x) => [x.game.slug, x.why])), marks: getProfile().marks };
      return cardsGrid(shown.map((x) => x.game), { ...opts, insertAfter: 8, insertHtml: adSlot('results-inline') });
    })()}
    <div class="center">
      ${more ? `<button type="button" class="btn btn-outline btn-lg" data-action="show-more" data-more="${more}">${esc(t('results.more'))} (+${more})</button>` : ''}
    </div>
  </section>`;
}

/** «Показать ещё»: увеличивает лимит и перерисовывает страницу */
export function showMore(n = FEATURES.pageSize) {
  limit += n;
}

/** Сброс пагинации при входе на страницу заново */
export function reset() { limit = FEATURES.pageSize; }

export const title = () => `${t('results.title')} — ${t('site.name')}`;
export const description = () => t('results.subtitle');
