/** Квиз: пошаговые вопросы с выбором ответа, ветвлением, живым счётчиком пула и мгновенным сохранением. */
import { QUESTIONS, visibleQuestions, progress, SEED_LIMIT } from '../quiz.js';
import { GENRES, TAGS, MOODS, PLATFORMS } from '../taxonomy.js';
import { t, tl } from '../i18n.js';
import { GAMES } from '../catalog/index.js';
import { hardFilter } from '../engine.js';
import { getProfile, setAnswers, markGame } from '../store.js';
import { navigate } from '../nav.js';
import { FEATURES } from '../config.js';
import { esc, coverImage } from './components.js';

const DICTS = { MOODS, GENRES, TAGS, PLATFORMS };

let step = 0;
let answers = {};
let seedQuery = '';

/** Подписи опций: либо из таксономии, либо через i18n-ключ */
function optionLabel(opt) {
  if (opt.dict) return tl(DICTS[opt.dict], opt.id);
  if (opt.labelKey) return t(opt.labelKey);
  return String(opt.id);
}

/** Значение ответа всегда как массив: одиночный выбор приходит скаляром */
const toArray = (value) => (Array.isArray(value) ? value : value === null || value === undefined || value === '' ? [] : [value]);

function currentValue(q) {
  const value = answers[q.id];
  if (q.type === 'multi' || q.type === 'games') return Array.isArray(value) ? value : [];
  return value ?? null;
}

/** Список вопросов с учётом ветвления — по нему двигаемся вперёд и назад */
const flow = () => visibleQuestions(answers);

/** Сколько игр каталога проходит текущие жёсткие фильтры — «живой» счётчик в квизе */
function poolCount() {
  const profile = { answers };
  let count = 0;
  for (const game of GAMES) if (hardFilter(game, profile)) count += 1;
  return count;
}

/* ------------------------------------------------------------------ *
 * Разметка
 * ------------------------------------------------------------------ */

export function render(ctx) {
  const profile = getProfile();
  answers = { ...profile.answers };
  // Продолжаем с первого неотвеченного вопроса, а не с начала: ответы уже сохранены,
  // прогонять человека по пройденному заново — плохой UX. Если отвечено всё — с первого.
  let resume = ctx?.resumeStep;
  if (resume === undefined || resume === null) {
    resume = flow().findIndex((q) => {
      const v = answers[q.id];
      // пустой массив тоже считаем неотвеченным: свежий профиль хранит [] по умолчанию,
      // а пропущенный вопрос проще пропустить ещё раз, чем начинать всем с середины
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    });
    if (resume < 0) resume = 0;
  }
  step = Math.max(0, Math.min(resume, flow().length - 1));

  return `
  <section class="quiz-page">
    <header class="quiz-head">
      <div>
        <h1>${esc(t('quiz.title'))}</h1>
        <p>${esc(t('quiz.intro'))}</p>
      </div>
      <div class="quiz-progress-wrap">
        <div class="quiz-progress-label"><span id="quiz-step-label"></span><span id="quiz-progress-label"></span></div>
        <div class="progress"><div class="progress-bar" id="quiz-progress-bar"></div></div>
      </div>
    </header>
    <div id="quiz-body"></div>
    <div class="quiz-nav">
      <button type="button" class="btn btn-ghost" data-action="quiz-back">← ${esc(t('quiz.back'))}</button>
      <button type="button" class="btn btn-ghost" data-action="quiz-skip">${esc(t('quiz.skip'))}</button>
      <button type="button" class="btn btn-primary" data-action="quiz-next" id="quiz-next-btn"></button>
    </div>
  </section>`;
}

export function mount(root) {
  renderStep(root);
  root.querySelector('[data-action="quiz-back"]').addEventListener('click', () => {
    if (step === 0) return;
    step -= 1;
    renderStep(root);
  });
  root.querySelector('[data-action="quiz-skip"]').addEventListener('click', () => {
    const q = flow()[step];
    const empty = q.type === 'single' ? null : [];
    answers = { ...answers, [q.id]: empty };
    setAnswers({ [q.id]: empty });
    goNext(root, true);
  });
  root.querySelector('[data-action="quiz-next"]').addEventListener('click', () => goNext(root));
}

function goNext(root, skipped = false) {
  const q = flow()[step];
  const value = currentValue(q);
  if (!skipped && q.type === 'multi' && q.min && value.length < q.min) {
    flashHint(root, t('quiz.multi.hint'));
    return;
  }
  if (step >= flow().length - 1) {
    setAnswers(answers);
    window.dispatchEvent(new CustomEvent('gf:track', {
      detail: { name: 'quiz_complete', params: { marks: Object.keys(getProfile().marks || {}).length } },
    }));
    navigate('results');
    return;
  }
  step += 1;
  renderStep(root);
}

/* ------------------------------------------------------------------ *
 * Отрисовка шага
 * ------------------------------------------------------------------ */

function renderStep(root, scroll = true) {
  const questions = flow();
  step = Math.max(0, Math.min(step, questions.length - 1));
  const q = questions[step];
  const value = currentValue(q);

  root.querySelector('#quiz-step-label').textContent = t('quiz.step', { n: step + 1, total: questions.length });
  root.querySelector('#quiz-progress-label').textContent = t('quiz.progress', { n: progress(answers) });
  root.querySelector('#quiz-progress-bar').style.width = `${progress(answers)}%`;
  root.querySelector('#quiz-next-btn').textContent = step === questions.length - 1 ? t('quiz.finish') : t('quiz.next');
  root.querySelector('[data-action="quiz-back"]').disabled = step === 0;

  const body = root.querySelector('#quiz-body');
  const hint = q.type === 'single' ? t('quiz.single.hint') : t('quiz.multi.hint');
  const limit = q.max ? `<span class="quiz-limit">${esc(t('quiz.selected', { n: value.length }))} / ${q.max}</span>` : '';
  const count = FEATURES.livePoolCounter === false ? '' : poolCounter();

  body.innerHTML = `
    <div class="quiz-card" data-q="${q.id}">
      <div class="quiz-q-head">
        <span class="quiz-icon">${q.icon || '❓'}</span>
        <div>
          <h2>${esc(t(`${q.key}.title`))}</h2>
          <p>${esc(t(`${q.key}.text`))}</p>
        </div>
      </div>
      <div class="quiz-hint">${esc(hint)} ${limit}</div>
      <div class="quiz-options">${q.type === 'games' ? gamesPicker(value) : q.options().map((opt) => optionHtml(q, opt, value)).join('')}</div>
      ${count}
    </div>`;

  if (q.type === 'games') {
    const input = body.querySelector('#seed-search');
    input?.addEventListener('input', (e) => {
      seedQuery = e.target.value;
      const list = body.querySelector('#seed-list');
      list.innerHTML = seedCards(currentValue(q));
    });
  }

  body.querySelectorAll('[data-action="quiz-option"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const qid = btn.dataset.q;
      const id = btn.dataset.id;
      const question = flow().find((x) => x.id === qid) || QUESTIONS.find((x) => x.id === qid);
      const numeric = question.options().find((o) => String(o.id) === id)?.id;
      let next;
      if (question.type === 'single') {
        next = currentValue(question) === numeric ? null : numeric;
        answers = { ...answers, [qid]: next };
      } else {
        const list = currentValue(question).slice();
        const idx = list.indexOf(numeric);
        if (idx >= 0) list.splice(idx, 1);
        else {
          if (question.max && list.length >= question.max) {
            flashHint(root, t('quiz.limit', { n: question.max }));
            return;
          }
          list.push(numeric);
        }
        next = list;
        answers = { ...answers, [qid]: list };
      }
      setAnswers({ [qid]: next });
      renderStep(root);
    });
  });

  body.querySelectorAll('[data-action="seed-toggle"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slug = btn.dataset.slug;
      const list = currentValue(q).slice();
      const idx = list.indexOf(slug);
      if (idx >= 0) {
        list.splice(idx, 1);
        markGame(slug, null);
      } else {
        if (list.length >= SEED_LIMIT) { flashHint(root, t('quiz.limit', { n: SEED_LIMIT })); return; }
        list.push(slug);
        markGame(slug, 'liked');
      }
      answers = { ...answers, seed: list };
      setAnswers({ seed: list });
      renderStep(root);
    });
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** «Подходящих игр: N» — показывает, как ответы режут пул прямо сейчас */
function poolCounter() {
  const count = poolCount();
  const enough = count >= 12;
  return `<div class="quiz-pool ${enough ? '' : 'warn'}">
    <span class="quiz-pool-dot"></span>
    ${esc(t('quiz.pool', { n: count }))}
  </div>`;
}

function optionHtml(q, opt, value) {
  const on = toArray(value).some((v) => String(v) === String(opt.id));
  const icon = opt.icon ? `<span class="opt-icon">${opt.icon}</span>` : '';
  const hint = opt.hintKey ? `<small class="opt-hint">${esc(t(opt.hintKey))}</small>` : '';
  return `<button type="button" class="opt ${on ? 'on' : ''}" data-action="quiz-option" data-q="${q.id}" data-id="${esc(String(opt.id))}" aria-pressed="${on}">
    ${icon}<span class="opt-label">${esc(optionLabel(opt))}${hint}</span>
  </button>`;
}

/** Список игр для «посева вкуса»: поиск + популярные */
function gamesPicker(value) {
  return `
    <div class="seed">
      <input type="search" id="seed-search" class="input" placeholder="${esc(t('q.seed.search'))}" value="${esc(seedQuery)}">
      <div class="seed-note">${esc(t('q.seed.chosen', { n: (value || []).length }))} · ${esc(t('q.seed.popular'))}</div>
      <div class="seed-list" id="seed-list">${seedCards(value)}</div>
    </div>`;
}

function seedCards(value) {
  const query = seedQuery.trim().toLowerCase();
  const pool = [...GAMES]
    .filter((g) => !query || g.t.toLowerCase().includes(query) || g.genres.some((id) => tl(GENRES, id).toLowerCase().includes(query)))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 48);
  return pool.map((g) => {
    const on = (value || []).includes(g.slug);
    return `<button type="button" class="seed-item ${on ? 'on' : ''}" data-action="seed-toggle" data-slug="${g.slug}" aria-pressed="${on}">
      <span class="seed-cover">${coverImage(g, 'seed-img')}</span>
      <span class="seed-meta">
        <strong>${esc(g.t)}</strong>
        <small>${esc(g.y)} · ${esc(tl(GENRES, g.genres[0]))}</small>
      </span>
      <span class="seed-check">${on ? '✓' : '+'}</span>
    </button>`;
  }).join('');
}

function flashHint(root, text) {
  const node = root.querySelector('.quiz-hint');
  if (!node) return;
  const original = node.innerHTML;
  node.innerHTML = `<span class="warn">${esc(text)}</span>`;
  setTimeout(() => { node.innerHTML = original; }, 1600);
}

export const title = () => `${t('quiz.title')} — ${t('site.name')}`;
export const description = () => t('quiz.intro');
