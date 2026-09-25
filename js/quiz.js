/**
 * Описание квиза. Вопросы декларативные: движок просто идёт по массиву,
 * а видимость и лимиты выборов считаются функциями — легко добавлять новые вопросы.
 *
 * Типы:
 *   multi  — несколько вариантов (есть min/max)
 *   single — один вариант
 *   games  — выбор игр из каталога (посев вкуса: то, во что уже играли и любите)
 */
import { GENRES, TAGS, MOODS, PLATFORMS, MODES } from './taxonomy.js';

const byMood = () => Object.keys(MOODS).map((id) => ({ id, icon: MOODS[id].icon, dict: 'MOODS' }));
const byGenre = () => Object.keys(GENRES).map((id) => ({ id, icon: GENRES[id].icon, dict: 'GENRES' }));
const byTag = (ids) => ids.map((id) => ({ id, dict: 'TAGS' }));
const byPlatform = () => Object.keys(PLATFORMS).map((id) => ({ id, icon: PLATFORMS[id].icon, dict: 'PLATFORMS' }));

/** «Что важно»: тонкие настройки, каждая ссылается на реальные теги каталога */
export const VIBE_TAGS = [
  'storyrich', 'openworld', 'exploration', 'choices', 'photomode', 'colorful',
  'soundtrack', 'mods', 'cozy', 'funny', 'cinematic', 'replayable', 'long',
  'short', 'endless', 'hardcoresim', 'collect', 'coopfocused', 'crosplay',
];

/** «Чего не хочу»: у каждого варианта — теги и жёсткие исключения */
export const AVOID_OPTIONS = [
  { id: 'mtx',       icon: 'card', tags: ['mtx'] },
  { id: 'timegate',  icon: 'hourglass', tags: ['timegate'] },
  { id: 'grind',     icon: 'refresh', tags: ['grind'] },
  { id: 'difficult', icon: 'skull', tags: ['difficult', 'soulslike', 'hardcoresim', 'bullethell'] },
  { id: 'horror',    icon: 'ghost', genres: ['horror'] },
  { id: 'cutscenes', icon: 'film', tags: ['cutscenes'] },
  { id: 'long',      icon: 'mountain', long: true },
  { id: 'pvp',       icon: 'clash', pvpOnly: true },
];

export const MOOD_LIMIT = 3;
export const GENRE_LIMIT = 5;
export const VIBE_LIMIT = 6;
export const SEED_LIMIT = 10;
export const PRIORITY_LIMIT = 2;

/** Варианты для «с кем чаще играете» — влияют на мягкие веса движка */
export const COMPANY_OPTIONS = [
  { id: 'friends', icon: 'users', labelKey: 'opt.companyFriends', hintKey: 'opt.companyFriends.hint' },
  { id: 'partner', icon: 'heart', labelKey: 'opt.companyPartner', hintKey: 'opt.companyPartner.hint' },
  { id: 'kids', icon: 'shapes', labelKey: 'opt.companyKids', hintKey: 'opt.companyKids.hint' },
  { id: 'randoms', icon: 'headphones', labelKey: 'opt.companyRandoms', hintKey: 'opt.companyRandoms.hint' },
];

/** Длина одной игровой сессии */
export const SESSION_OPTIONS = [
  { id: 'quick', icon: 'bolt', labelKey: 'opt.sessionQuick', hintKey: 'opt.sessionQuick.hint' },
  { id: 'medium', icon: 'clock', labelKey: 'opt.sessionMedium', hintKey: 'opt.sessionMedium.hint' },
  { id: 'evening', icon: 'moon', labelKey: 'opt.sessionEvening', hintKey: 'opt.sessionEvening.hint' },
];

/** Что важнее всего — до двух вариантов */
export const PRIORITY_OPTIONS = [
  { id: 'story', icon: 'book', labelKey: 'opt.priorityStory', hintKey: 'opt.priorityStory.hint' },
  { id: 'mechanics', icon: 'sliders', labelKey: 'opt.priorityMechanics', hintKey: 'opt.priorityMechanics.hint' },
  { id: 'freedom', icon: 'compass', labelKey: 'opt.priorityFreedom', hintKey: 'opt.priorityFreedom.hint' },
  { id: 'competition', icon: 'trophy', labelKey: 'opt.priorityCompetition', hintKey: 'opt.priorityCompetition.hint' },
];

/** Насколько свежая игра нужна */
export const NOVELTY_OPTIONS = [
  { id: 'new', icon: 'sparkles', labelKey: 'opt.noveltyNew', hintKey: 'opt.noveltyNew.hint' },
  { id: 'indie', icon: 'gem', labelKey: 'opt.noveltyIndie', hintKey: 'opt.noveltyIndie.hint' },
  { id: 'classic', icon: 'rewind', labelKey: 'opt.noveltyClassic', hintKey: 'opt.noveltyClassic.hint' },
  { id: 'any', icon: 'dice', labelKey: 'opt.noveltyAny' },
];

export const QUESTIONS = [
  {
    id: 'mood',
    key: 'q.mood',
    icon: 'sparkles',
    type: 'multi',
    min: 1,
    max: MOOD_LIMIT,
    options: byMood,
  },
  {
    id: 'modes',
    key: 'q.modes',
    icon: 'users',
    type: 'multi',
    min: 0,
    max: 4,
    options: () => [
      { id: 'solo', icon: 'user', labelKey: 'opt.solo', hintKey: 'opt.solo.hint' },
      { id: 'coop', icon: 'users', labelKey: 'opt.coop', hintKey: 'opt.coop.hint' },
      { id: 'pvp', icon: 'clash', labelKey: 'opt.pvp', hintKey: 'opt.pvp.hint' },
      { id: 'mmo', icon: 'infinity', labelKey: 'opt.mmo', hintKey: 'opt.mmo.hint' },
    ],
  },
  {
    id: 'players',
    key: 'q.players',
    icon: 'crowd',
    type: 'single',
    // вопрос нужен всегда, но формулировка особенно важна для компанейских игр
    options: () => [
      { id: 1, icon: 'user', labelKey: 'opt.players1' },
      { id: 2, icon: 'users', labelKey: 'opt.players2' },
      { id: 4, icon: 'usersPlus', labelKey: 'opt.players3' },
      { id: 8, icon: 'crowd', labelKey: 'opt.players5' },
    ],
  },
  {
    id: 'company',
    key: 'q.company',
    icon: 'heart',
    type: 'single',
    // спрашиваем только у тех, кто собирается играть с кем-то
    visible: (a) => answerList(a.modes).some((m) => m === 'coop' || m === 'pvp' || m === 'mmo') || (a.players || 1) > 1,
    // от каких ответов зависит видимость — нужно прогрессу, чтобы знаменатель не прыгал
    dependsOn: ['modes', 'players'],
    options: () => COMPANY_OPTIONS,
  },
  {
    id: 'platforms',
    key: 'q.platforms',
    icon: 'monitor',
    type: 'multi',
    min: 0,
    max: 6,
    options: byPlatform,
  },
  {
    id: 'time',
    key: 'q.time',
    icon: 'clock',
    type: 'single',
    options: () => [
      { id: 'tiny', icon: 'bolt', labelKey: 'opt.timeTiny', hintKey: 'opt.timeTiny.hint' },
      { id: 'short', icon: 'sun', labelKey: 'opt.timeShort', hintKey: 'opt.timeShort.hint' },
      { id: 'medium', icon: 'calendar', labelKey: 'opt.timeMedium', hintKey: 'opt.timeMedium.hint' },
      { id: 'long', icon: 'mountain', labelKey: 'opt.timeLong', hintKey: 'opt.timeLong.hint' },
      { id: 'any', icon: 'dice', labelKey: 'opt.timeAny' },
    ],
  },
  {
    id: 'session',
    key: 'q.session',
    icon: 'moon',
    type: 'single',
    // если человек выбрал «до 8 часов», спрашивать про длину сессии уже не нужно
    visible: (a) => a.time !== 'tiny',
    dependsOn: ['time'],
    options: () => SESSION_OPTIONS,
  },
  {
    id: 'difficulty',
    key: 'q.difficulty',
    icon: 'sliders',
    type: 'multi',
    min: 0,
    max: 4,
    options: () => [
      { id: 'easy', icon: 'leaf', labelKey: 'opt.diffEasy', hintKey: 'opt.diffEasy.hint' },
      { id: 'normal', icon: 'scale', labelKey: 'opt.diffNormal', hintKey: 'opt.diffNormal.hint' },
      { id: 'hard', icon: 'fire', labelKey: 'opt.diffHard', hintKey: 'opt.diffHard.hint' },
      { id: 'souls', icon: 'skull', labelKey: 'opt.diffSouls', hintKey: 'opt.diffSouls.hint' },
      { id: 'chill', icon: 'snowflake', labelKey: 'opt.diffChill', hintKey: 'opt.diffChill.hint' },
    ],
  },
  {
    id: 'genres',
    key: 'q.genres',
    icon: 'grid',
    type: 'multi',
    min: 0,
    max: GENRE_LIMIT,
    options: byGenre,
  },
  {
    id: 'vibes',
    key: 'q.vibes',
    icon: 'gem',
    type: 'multi',
    min: 0,
    max: VIBE_LIMIT,
    options: () => byTag(VIBE_TAGS),
  },
  {
    id: 'priority',
    key: 'q.priority',
    icon: 'target',
    type: 'multi',
    min: 0,
    max: PRIORITY_LIMIT,
    options: () => PRIORITY_OPTIONS,
  },
  {
    id: 'novelty',
    key: 'q.novelty',
    icon: 'calendar',
    type: 'single',
    options: () => NOVELTY_OPTIONS,
  },
  {
    id: 'price',
    key: 'q.price',
    icon: 'coins',
    type: 'single',
    options: () => [
      { id: 'any', icon: 'tag', labelKey: 'opt.priceAny' },
      { id: 'free', icon: 'gift', labelKey: 'opt.priceFree', hintKey: 'opt.priceFree.hint' },
      { id: 'upto1000', icon: 'coin', labelKey: 'opt.price1000', hintKey: 'opt.price1000.hint' },
      { id: 'upto2500', icon: 'coins', labelKey: 'opt.price2500', hintKey: 'opt.price2500.hint' },
    ],
  },
  {
    id: 'avoid',
    key: 'q.avoid',
    icon: 'ban',
    type: 'multi',
    min: 0,
    max: 5,
    options: () => AVOID_OPTIONS.map(({ id, icon }) => ({ id, icon, labelKey: `avoid.${id}` })),
  },
  {
    id: 'seed',
    key: 'q.seed',
    icon: 'star',
    type: 'games',
    min: 0,
    max: SEED_LIMIT,
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;

/** Вопросы, которые имеет смысл показывать при текущих ответах (задел на ветвление) */
export const visibleQuestions = (answers) => QUESTIONS.filter((q) => (q.visible ? q.visible(answers) : true));

/**
 * У вопроса есть осознанный ответ: непустой массив или непустой скаляр.
 * Пустой массив — это «ещё не отвечали» (именно он плюс дефолтные 'any' давали 71% на старте).
 */
export const hasValue = (value) => (Array.isArray(value)
  ? value.length > 0
  : value !== null && value !== undefined && value !== '');

/**
 * Мульти-ответ всегда должен быть массивом. Приходит он не только из квиза, но и из
 * localStorage, импорта JSON и аккаунта — там мог оказаться скаляр (старая версия сайта,
 * правка руками, чужой экспорт). Скаляр превращаем в массив из одного элемента,
 * чтобы один битый ответ не ронял рендер страницы целиком.
 */
export const answerList = (value) => (Array.isArray(value) ? value
  : value === null || value === undefined || value === '' ? [] : [value]);

/** Ключи вопросов с множественным выбором — по ним нормализуется профиль */
export const MULTI_KEYS = QUESTIONS.filter((q) => q.type === 'multi').map((q) => q.id);

/** Профиль из внешнего источника → ответы известной формы (мульти-ответы — массивы) */
export function normalizeAnswers(answers) {
  if (!answers || typeof answers !== 'object') return {};
  const out = { ...answers };
  for (const key of MULTI_KEYS) if (key in out) out[key] = answerList(out[key]);
  return out;
}

/**
 * Прогресс прохождения квиза: отвеченные / все вопросы, которые человеку предстоит увидеть.
 * Условные вопросы, которые уже точно не покажутся (например, «сессия» при времени «до 8 часов»),
 * из знаменателя исключаются; те, чья судьба ещё не решена, — остаются. Поэтому прогресс
 * никогда не уменьшается от ответов: знаменатель только сужается, числитель только растёт.
 */
export function progress(answers) {
  let done = 0;
  let decidedHidden = 0;
  for (const q of QUESTIONS) {
    if (hasValue(answers[q.id])) { done += 1; continue; }
    const shown = q.visible ? q.visible(answers) : true;
    if (shown) continue;
    const undetermined = (q.dependsOn || []).some((dep) => !hasValue(answers[dep]));
    if (!undetermined) decidedHidden += 1;
  }
  const total = Math.max(1, QUESTIONS.length - decidedHidden);
  return Math.min(100, Math.round((done / total) * 100));
}

/** Применяет ответ к объекту ответов квиза (иммутабельно) */
export function applyAnswer(answers, questionId, value) {
  return { ...answers, [questionId]: value };
}

/**
 * Разбор ответов для страницы «Мой вкус»:
 * возвращает структуру [{ key, dict, ids, raw }], которую легко отрендерить и локализовать.
 */
export function summarize(answers) {
  const a = normalizeAnswers(answers);
  const rows = [];
  const row = (key, ids, dict, raw) => {
    const list = answerList(ids).filter((x) => x !== null && x !== undefined && x !== '');
    if (list.length) rows.push({ key, ids: list, dict, raw });
  };
  row('q.mood', a.mood, 'MOODS');
  // ответы modes — это id квиза (solo/coop/pvp/mmo), а не id таксономии MODES:
  // подписи берём из ANSWER_LABELS, иначе в профиле показываются сырые id
  row('q.modes', a.modes, null);
  row('q.players', a.players ? [a.players] : [], null);
  row('q.platforms', a.platforms, 'PLATFORMS');
  row('q.time', a.time && a.time !== 'any' ? [a.time] : [], null);
  row('q.difficulty', a.difficulty, null);
  row('q.genres', a.genres, 'GENRES');
  row('q.vibes', a.vibes, 'TAGS');
  row('q.company', a.company ? [a.company] : [], null);
  row('q.session', a.session ? [a.session] : [], null);
  row('q.priority', a.priority, null);
  row('q.novelty', a.novelty && a.novelty !== 'any' ? [a.novelty] : [], null);
  row('q.price', a.price && a.price !== 'any' ? [a.price] : [], null);
  row('q.avoid', a.avoid, null);
  return rows;
}

/** Готовые подписи для ответов, у которых нет словаря в таксономии */
export const ANSWER_LABELS = {
  modes: { solo: 'opt.solo', coop: 'opt.coop', pvp: 'opt.pvp', mmo: 'opt.mmo' },
  players: { 1: 'opt.players1', 2: 'opt.players2', 4: 'opt.players3', 8: 'opt.players5' },
  time: { tiny: 'opt.timeTiny', short: 'opt.timeShort', medium: 'opt.timeMedium', long: 'opt.timeLong', any: 'opt.timeAny' },
  difficulty: { easy: 'opt.diffEasy', normal: 'opt.diffNormal', hard: 'opt.diffHard', souls: 'opt.diffSouls', chill: 'opt.diffChill' },
  price: { any: 'opt.priceAny', free: 'opt.priceFree', upto1000: 'opt.price1000', upto2500: 'opt.price2500' },
  avoid: {
    mtx: 'avoid.mtx', timegate: 'avoid.timegate', grind: 'avoid.grind', difficult: 'avoid.difficult',
    horror: 'avoid.horror', cutscenes: 'avoid.cutscenes', long: 'avoid.long', pvp: 'avoid.pvp',
  },
  company: { friends: 'opt.companyFriends', partner: 'opt.companyPartner', kids: 'opt.companyKids', randoms: 'opt.companyRandoms' },
  session: { quick: 'opt.sessionQuick', medium: 'opt.sessionMedium', evening: 'opt.sessionEvening' },
  priority: { story: 'opt.priorityStory', mechanics: 'opt.priorityMechanics', freedom: 'opt.priorityFreedom', competition: 'opt.priorityCompetition' },
  novelty: { new: 'opt.noveltyNew', indie: 'opt.noveltyIndie', classic: 'opt.noveltyClassic', any: 'opt.noveltyAny' },
};
