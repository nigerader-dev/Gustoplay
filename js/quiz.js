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
  { id: 'mtx',       icon: '💳', tags: ['mtx'] },
  { id: 'timegate',  icon: '⏳', tags: ['timegate'] },
  { id: 'grind',     icon: '🔁', tags: ['grind'] },
  { id: 'difficult', icon: '💀', tags: ['difficult', 'soulslike', 'hardcoresim', 'bullethell'] },
  { id: 'horror',    icon: '👻', genres: ['horror'] },
  { id: 'cutscenes', icon: '🎬', tags: ['cutscenes'] },
  { id: 'long',      icon: '🕰️', long: true },
  { id: 'pvp',       icon: '🥊', pvpOnly: true },
];

export const MOOD_LIMIT = 3;
export const GENRE_LIMIT = 5;
export const VIBE_LIMIT = 6;
export const SEED_LIMIT = 10;
export const PRIORITY_LIMIT = 2;

/** Варианты для «с кем чаще играете» — влияют на мягкие веса движка */
export const COMPANY_OPTIONS = [
  { id: 'friends', icon: '🧑‍🤝‍🧑', labelKey: 'opt.companyFriends' },
  { id: 'partner', icon: '💞', labelKey: 'opt.companyPartner' },
  { id: 'kids', icon: '🧸', labelKey: 'opt.companyKids' },
  { id: 'randoms', icon: '🎧', labelKey: 'opt.companyRandoms' },
];

/** Длина одной игровой сессии */
export const SESSION_OPTIONS = [
  { id: 'quick', icon: '⏳', labelKey: 'opt.sessionQuick' },
  { id: 'medium', icon: '🕐', labelKey: 'opt.sessionMedium' },
  { id: 'evening', icon: '🌙', labelKey: 'opt.sessionEvening' },
];

/** Что важнее всего — до двух вариантов */
export const PRIORITY_OPTIONS = [
  { id: 'story', icon: '📖', labelKey: 'opt.priorityStory' },
  { id: 'mechanics', icon: '🧩', labelKey: 'opt.priorityMechanics' },
  { id: 'freedom', icon: '🗺️', labelKey: 'opt.priorityFreedom' },
  { id: 'competition', icon: '🏆', labelKey: 'opt.priorityCompetition' },
];

/** Насколько свежая игра нужна */
export const NOVELTY_OPTIONS = [
  { id: 'new', icon: '🆕', labelKey: 'opt.noveltyNew' },
  { id: 'indie', icon: '💎', labelKey: 'opt.noveltyIndie' },
  { id: 'classic', icon: '🏛️', labelKey: 'opt.noveltyClassic' },
  { id: 'any', icon: '🤷', labelKey: 'opt.noveltyAny' },
];

export const QUESTIONS = [
  {
    id: 'mood',
    key: 'q.mood',
    icon: '🎯',
    type: 'multi',
    min: 1,
    max: MOOD_LIMIT,
    options: byMood,
  },
  {
    id: 'modes',
    key: 'q.modes',
    icon: '👥',
    type: 'multi',
    min: 0,
    max: 4,
    options: () => [
      { id: 'solo', icon: '🧍', labelKey: 'opt.solo' },
      { id: 'coop', icon: '🤝', labelKey: 'opt.coop' },
      { id: 'pvp', icon: '⚔️', labelKey: 'opt.pvp' },
      { id: 'mmo', icon: '🌐', labelKey: 'opt.mmo' },
    ],
  },
  {
    id: 'players',
    key: 'q.players',
    icon: '🔢',
    type: 'single',
    // вопрос нужен всегда, но формулировка особенно важна для компанейских игр
    options: () => [
      { id: 1, icon: '🧍', labelKey: 'opt.players1' },
      { id: 2, icon: '👫', labelKey: 'opt.players2' },
      { id: 4, icon: '👨‍👩‍👧', labelKey: 'opt.players3' },
      { id: 8, icon: '🎉', labelKey: 'opt.players5' },
    ],
  },
  {
    id: 'company',
    key: 'q.company',
    icon: '🫂',
    type: 'single',
    // спрашиваем только у тех, кто собирается играть с кем-то
    visible: (a) => (a.modes || []).some((m) => m === 'coop' || m === 'pvp' || m === 'mmo') || (a.players || 1) > 1,
    options: () => COMPANY_OPTIONS,
  },
  {
    id: 'platforms',
    key: 'q.platforms',
    icon: '🖥️',
    type: 'multi',
    min: 0,
    max: 6,
    options: byPlatform,
  },
  {
    id: 'time',
    key: 'q.time',
    icon: '⏱️',
    type: 'single',
    options: () => [
      { id: 'tiny', icon: '⚡', labelKey: 'opt.timeTiny' },
      { id: 'short', icon: '🌤️', labelKey: 'opt.timeShort' },
      { id: 'medium', icon: '🗓️', labelKey: 'opt.timeMedium' },
      { id: 'long', icon: '🏔️', labelKey: 'opt.timeLong' },
      { id: 'any', icon: '🤷', labelKey: 'opt.timeAny' },
    ],
  },
  {
    id: 'session',
    key: 'q.session',
    icon: '⌛',
    type: 'single',
    // если человек выбрал «до 8 часов», спрашивать про длину сессии уже не нужно
    visible: (a) => a.time !== 'tiny',
    options: () => SESSION_OPTIONS,
  },
  {
    id: 'difficulty',
    key: 'q.difficulty',
    icon: '🎚️',
    type: 'multi',
    min: 0,
    max: 4,
    options: () => [
      { id: 'easy', icon: '🌿', labelKey: 'opt.diffEasy' },
      { id: 'normal', icon: '⚖️', labelKey: 'opt.diffNormal' },
      { id: 'hard', icon: '🔥', labelKey: 'opt.diffHard' },
      { id: 'souls', icon: '💀', labelKey: 'opt.diffSouls' },
      { id: 'chill', icon: '🧘', labelKey: 'opt.diffChill' },
    ],
  },
  {
    id: 'genres',
    key: 'q.genres',
    key: 'q.genres',
    icon: '🎮',
    type: 'multi',
    min: 0,
    max: GENRE_LIMIT,
    options: byGenre,
  },
  {
    id: 'vibes',
    key: 'q.vibes',
    icon: '✨',
    type: 'multi',
    min: 0,
    max: VIBE_LIMIT,
    options: () => byTag(VIBE_TAGS),
  },
  {
    id: 'priority',
    key: 'q.priority',
    icon: '🧭',
    type: 'multi',
    min: 0,
    max: PRIORITY_LIMIT,
    options: () => PRIORITY_OPTIONS,
  },
  {
    id: 'novelty',
    key: 'q.novelty',
    icon: '📅',
    type: 'single',
    options: () => NOVELTY_OPTIONS,
  },
  {
    id: 'price',
    key: 'q.price',
    icon: '💰',
    type: 'single',
    options: () => [
      { id: 'any', icon: '♾️', labelKey: 'opt.priceAny' },
      { id: 'free', icon: '🆓', labelKey: 'opt.priceFree' },
      { id: 'upto1000', icon: '🪙', labelKey: 'opt.price1000' },
      { id: 'upto2500', icon: '💵', labelKey: 'opt.price2500' },
    ],
  },
  {
    id: 'avoid',
    key: 'q.avoid',
    icon: '🚫',
    type: 'multi',
    min: 0,
    max: 5,
    options: () => AVOID_OPTIONS.map(({ id, icon }) => ({ id, icon, labelKey: `avoid.${id}` })),
  },
  {
    id: 'seed',
    key: 'q.seed',
    icon: '⭐',
    type: 'games',
    min: 0,
    max: SEED_LIMIT,
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;

/** Вопросы, которые имеет смысл показывать при текущих ответах (задел на ветвление) */
export const visibleQuestions = (answers) => QUESTIONS.filter((q) => (q.visible ? q.visible(answers) : true));

/**
 * Прогресс прохождения квиза: считаем вопросы, на которые пользователь ответил
 * (для multi-вопросов ответом считается даже пустой массив — «прошёл и ничего не выбрал»).
 */
export function progress(answers) {
  const visible = visibleQuestions(answers);
  let done = 0;
  for (const q of visible) {
    const value = answers[q.id];
    if (Array.isArray(value)) done += 1;
    else if (value !== null && value !== undefined && value !== '') done += 1;
  }
  return Math.min(100, Math.round((done / visible.length) * 100));
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
  const rows = [];
  const row = (key, ids, dict, raw) => {
    const list = (ids || []).filter((x) => x !== null && x !== undefined && x !== '');
    if (list.length) rows.push({ key, ids: list, dict, raw });
  };
  row('q.mood', answers.mood, 'MOODS');
  row('q.modes', answers.modes, 'MODES');
  row('q.players', answers.players ? [answers.players] : [], null);
  row('q.platforms', answers.platforms, 'PLATFORMS');
  row('q.time', answers.time && answers.time !== 'any' ? [answers.time] : [], null);
  row('q.difficulty', answers.difficulty, null);
  row('q.genres', answers.genres, 'GENRES');
  row('q.vibes', answers.vibes, 'TAGS');
  row('q.company', answers.company ? [answers.company] : [], null);
  row('q.session', answers.session ? [answers.session] : [], null);
  row('q.priority', answers.priority, null);
  row('q.novelty', answers.novelty && answers.novelty !== 'any' ? [answers.novelty] : [], null);
  row('q.price', answers.price && answers.price !== 'any' ? [answers.price] : [], null);
  row('q.avoid', answers.avoid, null);
  return rows;
}

/** Готовые подписи для ответов, у которых нет словаря в таксономии */
export const ANSWER_LABELS = {
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
