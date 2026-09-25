/** «Мой вкус»: что мы поняли о ваших предпочтениях и откуда (полностью прозрачно). */
import { tasteSummary } from '../engine.js';
import { TAGS, GENRES, MOODS, MODES, PLATFORMS } from '../taxonomy.js';
import { t, tl } from '../i18n.js';
import { getProfile, exportProfile, importProfile, resetProfile, markGame, markedGames } from '../store.js';
import { byId } from '../catalog/index.js';
import { summarize, ANSWER_LABELS } from '../quiz.js';
import { coverImage, esc, emptyState } from './components.js';
import { navigate } from '../nav.js';

export function render() {
  const profile = getProfile();
  const stat = tasteSummary(profile);
  const totalMarks = Object.keys(profile.marks || {}).length;

  if (!totalMarks && !profile.meta?.completedAt) {
    return `<section class="section">${emptyState(t('profile.title'), t('profile.empty'),
      `<a class="btn btn-primary" href="#/quiz" data-action="nav">${esc(t('home.cta.start'))}</a>`)}</section>`;
  }

  const maxWeight = Math.max(1, ...Object.values(stat.weights.tag).filter((v) => v > 0));
  const bars = stat.topTags.slice(0, 10).map((id) => {
    const value = stat.weights.tag[id] || 0;
    const width = Math.round((value / maxWeight) * 100);
    return `<div class="bar-row">
      <span class="bar-label">${esc(tl(TAGS, id))}</span>
      <span class="bar"><i style="width:${width}%"></i></span>
      <span class="bar-value">${value.toFixed(1)}</span>
    </div>`;
  }).join('');

  const answerRows = summarize(profile.answers).map((row) => {
    const labels = row.ids.map((id) => {
      if (row.dict) return tl({ MOODS, GENRES, TAGS, PLATFORMS, MODES }[row.dict], id);
      const key = ANSWER_LABELS[fieldOf(row.key)]?.[id];
      return key ? t(key) : String(id);
    });
    return `<div class="answer-row"><span>${esc(t(row.key + '.title') || row.key)}</span><div class="chips-cloud small">${labels.map((l) => `<span class="chip">${esc(l)}</span>`).join('')}</div></div>`;
  }).join('');

  const markRows = markedGames()
    .sort((a, b) => b.ts - a.ts)
    .map((m) => {
      const game = byId(m.slug);
      if (!game) return '';
      const icons = { liked: '❤️', disliked: '👎', played: '🎮', wishlist: '🔖' };
      return `<div class="mark-row">
        <span class="mark-row-cover">${coverImage(game, 'mark-img')}</span>
        <a class="mark-row-title" href="#/game/${game.slug}" data-action="nav">${esc(game.t)}</a>
        <span class="mark-row-status">${icons[m.status]} ${esc(t(`mark.${m.status}`))}</span>
        <button type="button" class="btn btn-ghost btn-sm" data-action="mark-remove" data-slug="${game.slug}">✕</button>
      </div>`;
    }).join('');

  return `
  <section class="section profile">
    <header class="section-head">
      <h1>${esc(t('profile.title'))}</h1>
      <p>${esc(t('profile.stats', {
        liked: stat.liked, played: stat.played, wishlist: stat.wishlist, disliked: stat.disliked,
      }))}</p>
    </header>

    <div class="cols-2">
      <div class="panel">
        <h3>${esc(t('profile.topTags'))}</h3>
        <div class="bars">${bars || `<p class="muted">${esc(t('profile.empty'))}</p>`}</div>
        ${stat.negativeTags.length ? `<h4>${esc(t('profile.negativeTags'))}</h4>
          <div class="chips-cloud small">${stat.negativeTags.slice(0, 8).map((id) => `<span class="chip chip-warn">${esc(tl(TAGS, id))}</span>`).join('')}</div>` : ''}
      </div>

      <div class="panel">
        <h3>${esc(t('profile.answers'))}</h3>
        <div class="answers">${answerRows || `<p class="muted">${esc(t('quiz.intro'))}</p>`}</div>
        <div class="panel-actions">
          <a class="btn btn-outline" href="#/quiz" data-action="nav">✏️ ${esc(t('profile.restartQuiz'))}</a>
          <a class="btn btn-primary" href="#/results" data-action="nav">🎯 ${esc(t('results.title'))}</a>
        </div>
      </div>
    </div>

    <div class="panel">
      <h3>${esc(t('profile.marks'))}</h3>
      <div class="mark-rows">${markRows || `<p class="muted">${esc(t('profile.empty'))}</p>`}</div>
    </div>

    <div class="panel">
      <h3>${esc(t('about.privacy.title'))}</h3>
      <p class="muted">${esc(t('about.privacy.text'))}</p>
      <div class="panel-actions">
        <button type="button" class="btn btn-ghost" data-action="profile-export">⬇️ ${esc(t('profile.export'))}</button>
        <button type="button" class="btn btn-ghost" data-action="profile-import">⬆️ ${esc(t('profile.import'))}</button>
        <button type="button" class="btn btn-ghost btn-danger" data-action="profile-reset">🗑 ${esc(t('profile.reset'))}</button>
      </div>
    </div>
  </section>`;
}

const fieldOf = (key) => key.replace('q.', '');

export function mount(root) {
  root.querySelector('[data-action="profile-export"]')?.addEventListener('click', async () => {
    const json = exportProfile();
    try {
      await navigator.clipboard.writeText(json);
      toast(t('results.exported'));
    } catch {
      window.prompt(t('profile.export'), json);
    }
  });
  root.querySelector('[data-action="profile-import"]')?.addEventListener('click', () => {
    const json = window.prompt(t('profile.importPrompt'));
    if (!json) return;
    if (importProfile(json)) window.dispatchEvent(new CustomEvent('gf:rerender'));
  });
  root.querySelector('[data-action="profile-reset"]')?.addEventListener('click', () => {
    if (!confirm(t('profile.reset.confirm'))) return;
    resetProfile();
    navigate('quiz');
  });
  root.querySelectorAll('[data-action="mark-remove"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      markGame(btn.dataset.slug, null);
      window.dispatchEvent(new CustomEvent('gf:rerender'));
    });
  });
}

function toast(text) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = text;
  document.body.append(node);
  setTimeout(() => node.classList.add('show'), 10);
  setTimeout(() => { node.classList.remove('show'); setTimeout(() => node.remove(), 300); }, 2400);
}

export const title = () => `${t('profile.title')} — ${t('site.name')}`;
export const description = () => t('about.privacy.text');
