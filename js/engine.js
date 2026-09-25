/**
 * Движок подбора игр, версия 2.
 *
 * Идея: теги — это «атомы вкуса». Профиль = веса по тегам/жанрам/настроениям/режимам.
 * Веса складываются из ответов квиза и отметок «играл / понравилось / не понравилось».
 *
 * Что изменилось по сравнению с первой версией:
 *   1) IDF-веса: редкий тег («экстракшн», «вампиры») значит больше, чем «открытый мир»
 *      в половине каталога — иначе выдача съезжает к «популярным» тегам;
 *   2) похожесть на отмеченные игры (kNN): считаем косинусную близость вектора игры
 *      к векторам игр, которые пользователь лайкнул, и объясняем «похожа на Hades»;
 *   3) мягкие предпочтения из новых вопросов (компания, длина сессии, приоритет, свежесть);
 *   4) MMR-отбор в конце: в топе не может быть пять почти одинаковых игр — баланс
 *      «релевантность против разнообразия»;
 *   5) показы учитываются с затуханием: игра, показанная месяц назад, снова конкурентоспособна;
 *   6) уверенность выдачи (confidence) — сколько баллов отделяет топ от «середины пула».
 *
 * Все функции чистые: одинаковый профиль + seed → одинаковый список.
 */
import { GAMES, byId } from './catalog/index.js';
import { MODES, GENRES, TAGS, MOODS, PLATFORMS, PRICE } from './taxonomy.js';
import { AVOID_OPTIONS } from './quiz.js';

/* ------------------------------------------------------------------ *
 * Справочники требований
 * ------------------------------------------------------------------ */

/** Правила «чего не хочу»: берём из AVOID_OPTIONS, чтобы описание жило в одном месте */
export const AVOID_RULES = Object.fromEntries(
  AVOID_OPTIONS.map((o) => [o.id, { tags: o.tags || [], genres: o.genres || [], long: !!o.long, pvpOnly: !!o.pvpOnly }]),
);

/** Какие режимы подходят под запрос «во что играть» */
export const MODE_GROUPS = {
  solo: ['solo'],
  coop: ['coopOnline', 'coopLocal'],
  pvp: ['pvpOnline', 'pvpLocal'],
  mmo: ['mmo'],
};

/** Сколько всего часов есть на игру → допустимый диапазон длины */
export const TIME_RANGES = {
  tiny: { maxShort: 8, label: 'до 8 часов' },
  short: { maxShort: 20, label: 'до 20 часов' },
  medium: { maxShort: 60, label: '20–60 часов' },
  long: { maxShort: 1000, label: '60+ часов, я надолго' },
  any: { maxShort: 100000, label: 'не важно' },
};

/** Мягкие предпочтения, которые не режут пул, а двигают игры в нём. */
export const PREFERENCES = {
  /** С кем чаще играете (вопрос «company») */
  company: {
    friends: { tags: ['coopfocused', 'funny', 'voicechat', 'lobbybig', 'social'], genres: ['party'], mood: { laugh: 2, compete: 1 } },
    partner: { tags: ['cozy', 'storyrich', 'splitscreen', 'choices', 'relaxing'], mood: { feel: 2, story: 1.5 } },
    kids: { tags: ['family', 'cute', 'colorful', 'nonviolent', 'splitscreen'], mood: { relax: 2, laugh: 1 } },
    randoms: { tags: ['pvpfocused', 'voicechat', 'battleroyale', 'clan'], mood: { compete: 2.5, adrenaline: 1 } },
  },
  /** Сколько длится одна сессия (вопрос «session») */
  session: {
    quick: { tags: ['short', 'episodic', 'endlessloop', 'timeloop'], mood: { relax: 0.6 } },
    medium: { tags: ['replayable', 'coopfocused'] },
    evening: { tags: ['openworld', 'long', 'endless', 'storyrich'], mood: { escape: 1.2, progress: 0.8 } },
  },
  /** Что важнее всего в игре (вопрос «priority», можно два варианта) */
  priority: {
    story: { tags: ['storyrich', 'dialogheavy', 'choices', 'cinematic'], mood: { story: 3, feel: 1.5 } },
    mechanics: { tags: ['tbs', 'deckbuilding', 'automation', 'management', 'basebuilding'], mood: { think: 2.5 } },
    freedom: { tags: ['openworld', 'exploration', 'crafting', 'mods'], mood: { explore: 2.5, create: 2 } },
    competition: { tags: ['pvpfocused', 'arena', 'battleroyale', 'squad'], mood: { compete: 3 } },
  },
  /** Насколько свежая игра нужна (вопрос «novelty») */
  novelty: {
    new: { minYear: 2022, tags: ['epic', 'realistic'] },
    classic: { maxYear: 2016, tags: ['nostalgia', 'mods'] },
    indie: { tags: ['pixelart', 'handdrawn', 'short'], genres: ['roguelike'], price: ['cheap', 'free'] },
  },
};

/* ------------------------------------------------------------------ *
 * Профиль вкуса
 * ------------------------------------------------------------------ */

export const emptyProfile = () => ({
  version: 2,
  answers: {
    mood: [], modes: [], players: null, company: '', platforms: [], time: 'any', session: '',
    difficulty: [], genres: [], vibes: [], priority: [], novelty: '', price: 'any', avoid: [], partyMode: false,
  },
  /** отметки игр: { [slug]: { status, ts } }, status: liked | disliked | played | wishlist */
  marks: {},
  /** показы: { [slug]: number | { n, ts } } — чтобы не крутить одно и то же */
  impressions: {},
  /** история показов (слаги) */
  history: [],
  meta: { completedAt: null, quizVersion: 2, lang: 'ru', theme: 'light' },
});

const add = (obj, key, value) => { obj[key] = (obj[key] || 0) + value; };
const sum = (obj) => Object.values(obj).reduce((a, b) => a + Math.abs(b), 0);

/* ------------------------------------------------------------------ *
 * IDF: редкие теги весят больше
 * ------------------------------------------------------------------ */

const TAG_FREQ = (() => {
  const freq = {};
  for (const game of GAMES) for (const tag of game.tags) freq[tag] = (freq[tag] || 0) + 1;
  const total = Math.max(GAMES.length, 1);
  const idf = {};
  for (const [tag, count] of Object.entries(freq)) idf[tag] = Math.log(1 + total / count);
  return idf;
})();

/** Вес тега: редкость × значимость. «Открытый мир» в 200 играх весит меньше «вампиров» в 4. */
export const tagWeight = (tag) => TAG_FREQ[tag] ?? 1;
export const tagIdf = (tag) => TAG_FREQ[tag] ?? Math.log(2);

/* ------------------------------------------------------------------ *
 * Похожесть игр (косинус по тегам/жанрам/настроениям/режимам)
 * ------------------------------------------------------------------ */

const vectorOf = (game) => {
  const vec = {};
  for (const t of game.tags) add(vec, `t:${t}`, 1.4 * tagIdf(t));
  for (const g of game.genres) add(vec, `g:${g}`, 2.0);
  for (const m of game.moods) add(vec, `m:${m}`, 1.1);
  for (const m of game.modes) add(vec, `d:${m}`, 0.5);
  return vec;
};

const VECTORS = new Map(GAMES.map((game) => [game.slug, vectorOf(game)]));

const norm = (vec) => Math.sqrt(Object.values(vec).reduce((acc, v) => acc + v * v, 0)) || 1;

/** Косинусная близость двух игр: 0 — ничего общего, 1 — почти одно и то же */
export function similarity(a, b) {
  const va = VECTORS.get(a) || vectorOf(byId(a) || { tags: [], genres: [], moods: [], modes: [] });
  const vb = VECTORS.get(b) || vectorOf(byId(b) || { tags: [], genres: [], moods: [], modes: [] });
  let dot = 0;
  const [small, big] = Object.keys(va).length < Object.keys(vb).length ? [va, vb] : [vb, va];
  for (const [key, value] of Object.entries(small)) if (big[key]) dot += value * big[key];
  return dot / (norm(va) * norm(vb));
}

/** Серия/франшиза по первому слову названия — чтобы не предлагать пять Battlefield подряд */
const seriesOf = (game) => String(game.t || '').toLowerCase().split(/[:\u2013-]/)[0].trim().split(' ').slice(0, 2).join(' ');

/* ------------------------------------------------------------------ *
 * Веса профиля
 * ------------------------------------------------------------------ */

/**
 * Пересчитывает веса по ответам квиза и отметкам игр.
 * Чистая функция: результат не накапливается, а выводится заново.
 */
export function computeWeights(profile) {
  const tag = {}, genre = {}, mood = {}, mode = {};
  const a = profile.answers || {};

  // 1. Квиз: настроения и жанры — сильные сигналы, вайбы — средние
  for (const m of a.mood || []) add(mood, m, 3);
  for (const g of a.genres || []) add(genre, g, 2.5);
  for (const t of a.vibes || []) add(tag, t, 2);
  // режимы квиза (coop/pvp) раскрываем в режимы каталога: иначе вес висит на id,
  // которого нет ни у одной игры, и «кооп» никак не усиливает кооп-игры
  for (const m of a.modes || []) for (const real of MODE_GROUPS[m] || [m]) add(mode, real, 2);

  // 2. Мягкие предпочтения (компания, сессия, приоритеты, свежесть)
  const soft = PREFERENCES.company[a.company];
  if (soft) { for (const t of soft.tags || []) add(tag, t, 1.6); for (const g of soft.genres || []) add(genre, g, 1.4); for (const [m, w] of Object.entries(soft.mood || {})) add(mood, m, w); }

  const sessionPref = PREFERENCES.session[a.session];
  if (sessionPref) { for (const t of sessionPref.tags || []) add(tag, t, 1.2); for (const [m, w] of Object.entries(sessionPref.mood || {})) add(mood, m, w); }

  for (const id of a.priority || []) {
    const p = PREFERENCES.priority[id];
    if (!p) continue;
    for (const t of p.tags || []) add(tag, t, 1.8);
    for (const [m, w] of Object.entries(p.mood || {})) add(mood, m, w);
  }

  // 3. «Чего не хочу»: опускаем связанные теги ниже нуля (жёсткое исключение — в hardFilter)
  for (const id of a.avoid || []) {
    for (const t of AVOID_RULES[id]?.tags || []) {
      add(tag, t, -6);
      // тянем вниз и «соседние» теги по каталогу — если не хочется соулслайков,
      // не стоит предлагать и «хардкорные выживалки»
      for (const neighbor of NEIGHBOURS[t] || []) add(tag, neighbor, -1.4);
    }
  }

  // 4. Отметки игр: «понравилось» тянет похожие игры вверх, «не понравилось» — вниз
  for (const [slug, mark] of Object.entries(profile.marks || {})) {
    const game = byId(slug);
    if (!game) continue;
    const w = mark.status === 'liked' ? 1.6
      : mark.status === 'disliked' ? -1.8
      : mark.status === 'wishlist' ? 0.9
      : mark.status === 'played' ? 0.15
      : 0;
    if (!w) continue;
    for (const t of game.tags) add(tag, t, w * 1.2);
    for (const g of game.genres) add(genre, g, w * 0.8);
    for (const m of game.moods) add(mood, m, w * 0.6);
    for (const m of game.modes) add(mode, m, w * 0.5);
  }

  const top = (obj, n) => Object.entries(obj).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).slice(0, n).map(([k]) => k);
  return {
    tag, genre, mood, mode,
    topTags: top(tag, 12),
    topGenres: top(genre, 6),
    topMoods: top(mood, 6),
    negativeTags: Object.entries(tag).filter(([, v]) => v < 0).sort((x, y) => x[1] - y[1]).map(([k]) => k),
  };
}

/** Соседи тега по каталогу: часто встречаются вместе (для «мягких» минусов) */
const NEIGHBOURS = (() => {
  const pairs = {};
  for (const game of GAMES) {
    for (const a of game.tags) {
      const row = pairs[a] || (pairs[a] = {});
      for (const b of game.tags) if (a !== b) row[b] = (row[b] || 0) + 1;
    }
  }
  const result = {};
  for (const [a, counts] of Object.entries(pairs)) {
    result[a] = Object.entries(counts)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 5)
      .map(([b]) => b);
  }
  return result;
})();

/* ------------------------------------------------------------------ *
 * Жёсткие фильтры
 * ------------------------------------------------------------------ */

export function hardFilter(game, profile) {
  const a = profile.answers || {};
  const need = a.modes || [];

  // режимы: solo / coop / pvp / mmo — игра должна поддерживать хотя бы одну группу
  if (need.length) {
    const ok = need.some((group) => {
      if (group === 'solo') return game.modes.includes('solo') || game.players[0] === 1;
      if (group === 'coop') return game.modes.includes('coopOnline') || game.modes.includes('coopLocal');
      if (group === 'pvp') return game.modes.includes('pvpOnline') || game.modes.includes('pvpLocal');
      if (group === 'mmo') return game.modes.includes('mmo');
      return true;
    });
    if (!ok) return false;
  }

  // размер компании
  if (a.players && a.players > 1) {
    if (game.players[1] < a.players) return false;
    const teamOk = game.modes.some((m) => ['coopOnline', 'coopLocal', 'pvpOnline', 'pvpLocal', 'mmo'].includes(m));
    if (!teamOk) return false;
  } else if (a.players === 1 && !(game.modes.includes('solo') || game.players[0] === 1)) {
    return false;
  }

  // платформы
  if (a.platforms && a.platforms.length) {
    if (!a.platforms.some((p) => game.platforms.includes(p))) return false;
  }

  // время до финала: сравниваем по «часам до титров» (game.len[0])
  if (a.time === 'tiny' && game.len[0] > 8) return false;
  if (a.time === 'short' && game.len[0] > 20) return false;
  if (a.time === 'medium' && (game.len[0] > 60 || game.len[1] < 15)) return false;
  if (a.time === 'long' && game.len[1] < 40) return false;

  // «чего не хочу»: полностью исключаем такие игры
  for (const id of a.avoid || []) {
    const rule = AVOID_RULES[id];
    if (!rule) continue;
    if (rule.tags.length && game.tags.some((t) => rule.tags.includes(t))) return false;
    if (rule.genres.length && game.genres.some((g) => rule.genres.includes(g))) return false;
    if (rule.long && game.len[0] > 50 && !game.tags.includes('endless')) return false;
    if (rule.pvpOnly && !game.modes.some((m) => ['solo', 'coopOnline', 'coopLocal'].includes(m))) return false;
  }

  // цена
  const priceOk = {
    any: () => true,
    free: (g) => g.price === 'free' || g.price === 'subscription',
    upto1000: (g) => ['free', 'subscription', 'cheap'].includes(g.price) || g.priceRub <= 1000,
    upto2500: (g) => ['free', 'subscription', 'cheap', 'mid'].includes(g.price),
  };
  if (!priceOk[a.price || 'any'](game)) return false;

  return true;
}

/* ------------------------------------------------------------------ *
 * Скоринг
 * ------------------------------------------------------------------ */

/** Детерминированный псевдослучайный генератор (mulberry32) */
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Кандидаты «похоже на то, что вы лайкнули»: слаг → близость */
function likedNeighbours(profile, limit = 4) {
  const liked = Object.entries(profile.marks || {})
    .filter(([, m]) => m.status === 'liked' || m.status === 'wishlist')
    .map(([slug, m]) => ({ slug, weight: m.status === 'liked' ? 1 : 0.7 }))
    .filter((x) => byId(x.slug))
    .slice(-24);
  return liked.slice(0, limit);
}

/**
 * Основной скоринг: возвращает { score, reasons, neighbours }.
 * reasons используется для блока «почему подходит» на карточке.
 */
export function scoreGame(game, profile, weights, context = {}) {
  const a = profile.answers || {};
  const reasons = [];
  let score = 0;

  // 0. Качество: базовый пол, чтобы случайный инди не обгонял хиты (ослабляем, если просили «инди»)
  const qualityWeight = a.novelty === 'indie' ? 0.22 : 0.35;
  score += (game.rating - 70) * qualityWeight;
  if (game.rating >= 90) reasons.push({ type: 'quality' });

  // 1. Настроения
  let moodHit = 0;
  for (const m of game.moods) {
    const w = weights.mood[m];
    if (w) { score += w * 2.4; moodHit += w; }
  }
  if (moodHit > 0) reasons.push({ type: 'mood', ids: game.moods.filter((m) => (weights.mood[m] || 0) > 0), weight: moodHit });
  else if ((a.mood || []).length) score -= 3;

  // 2. Жанры
  let genreHit = 0;
  for (const g of game.genres) {
    const w = weights.genre[g];
    if (w) { score += w * 1.5; genreHit += w; }
  }
  if (genreHit > 0) reasons.push({ type: 'genre', ids: game.genres.filter((g) => (weights.genre[g] || 0) > 0), weight: genreHit });

  // 3. Теги — основной сигнал. Нормируем по «плотности» тегов: у игры с 12 тегами
  //    больше шансов случайно совпасть, поэтому делим на корень их количества.
  const tagHits = [];
  let tagScore = 0;
  let tagRaw = 0;
  for (const t of game.tags) {
    const w = weights.tag[t];
    if (!w) continue;
    const weighted = w * (0.6 + 0.4 * tagIdf(t));
    tagRaw += weighted * 1.1;
    tagScore += weighted;
    if (w > 0) tagHits.push(t);
  }
  // у игры с 12 тегами больше шансов случайно совпасть — нормируем «плотность»
  const density = Math.sqrt(Math.max(game.tags.length, 4)) / 3;
  score += tagRaw / density;
  if (tagHits.length) reasons.push({ type: 'tag', ids: tagHits.slice(0, 4), weight: tagScore });

  // 4. Режимы: то, что человек просил, должно усиливать
  let modeHit = 0;
  for (const m of game.modes) {
    const w = weights.mode[m];
    if (w) { score += w * 1.8; modeHit += w; }
  }
  if (modeHit > 0) reasons.push({ type: 'mode', ids: game.modes.filter((m) => (weights.mode[m] || 0) > 0), weight: modeHit });

  // 5. Точность по числу игроков: просили кооп на 4 — игра ровно на 4 лучше, чем на 100
  if ((a.players || 1) > 1) {
    const maxPlayers = game.players[1];
    const wanted = a.players;
    if (maxPlayers >= wanted) {
      const tight = maxPlayers <= wanted * 2 ? 4 : maxPlayers <= wanted * 6 ? 2 : 0;
      score += tight;
      if (tight) reasons.push({ type: 'players', max: maxPlayers });
    }
    if (game.coopQ) score += (game.coopQ - 6) * 0.8;
  }

  // 6. Похожесть на отмеченные игры (kNN)
  const neighbours = context.neighbours ?? likedNeighbours(profile);
  let bestSimilar = null;
  let bestSim = 0;
  for (const seed of neighbours) {
    const sim = similarity(game.slug, seed.slug);
    if (sim > bestSim) { bestSim = sim; bestSimilar = seed.slug; }
  }
  if (bestSim > 0.12) {
    const bonus = bestSim * 14 * (neighbours.find((n) => n.slug === bestSimilar)?.weight ?? 1);
    score += bonus;
    if (bestSim > 0.3 && bestSimilar) reasons.push({ type: 'similar', slug: bestSimilar, weight: bestSim });
  } else if (neighbours.length >= 3) {
    // ни на что не похоже — если человек отмечал много игр, это скорее минус
    score -= 2;
  }

  // 7. Мягкие предпочтения: сессия, свежесть, цена-настроение
  const session = a.session;
  if (session === 'quick') {
    if (game.len[1] <= 12) { score += 5; reasons.push({ type: 'session', kind: 'quick' }); }
    else if (game.len[0] > 25) score -= 5;
  }
  if (session === 'evening' && game.len[1] >= 40) { score += 3; reasons.push({ type: 'session', kind: 'evening' }); }

  const novelty = PREFERENCES.novelty[a.novelty];
  if (novelty) {
    if (novelty.minYear && game.y >= novelty.minYear) { score += 3; reasons.push({ type: 'novelty', kind: 'new' }); }
    if (novelty.maxYear && game.y <= novelty.maxYear) { score += 3; reasons.push({ type: 'novelty', kind: 'classic' }); }
    if (novelty.price && novelty.price.includes(game.price)) score += 2;
    score += 0.8 * (novelty.tags || []).filter((t) => game.tags.includes(t)).length;
    score += 1.2 * (novelty.genres || []).filter((g) => game.genres.includes(g)).length;
  }

  // 8. Сложность и темп
  if ((a.difficulty || []).includes('easy') && game.difficulty >= 4) score -= 6;
  if ((a.difficulty || []).includes('hard') && game.difficulty <= 2) score -= 4;
  if ((a.difficulty || []).includes('chill') && game.pace >= 5 && game.difficulty >= 4) score -= 5;
  if ((a.difficulty || []).includes('souls') && game.difficulty >= 4) score += 4;

  // 9. Отметки
  const mark = profile.marks?.[game.slug];
  if (mark?.status === 'played') { score -= 30; reasons.push({ type: 'played' }); }
  if (mark?.status === 'disliked') score -= 120;
  if (mark?.status === 'wishlist') { score += 6; reasons.push({ type: 'wishlist' }); }
  if (mark?.status === 'liked') { score += 2; reasons.push({ type: 'liked' }); }

  // 10. Показы с затуханием: месяц назад показанная игра снова конкурентоспособна
  score -= impressionPenalty(profile.impressions?.[game.slug]);

  // 11. Негативные теги
  for (const t of weights.negativeTags || []) if (game.tags.includes(t)) score -= 7;

  return { score, reasons, neighbours: bestSimilar > 0.12 ? { slug: bestSimilar, sim: bestSim } : null };
}

const IMPRESSION_HALF_LIFE_DAYS = 10;

/** Штраф за показы: поддержаны и число, и { n, ts } */
function impressionPenalty(value) {
  if (!value) return 0;
  const count = typeof value === 'number' ? value : (value.n || 0);
  if (!count) return 0;
  const ts = typeof value === 'object' ? value.ts : null;
  const ageDays = ts ? (Date.now() - ts) / 86400000 : 0;
  const decay = Math.pow(0.5, ageDays / IMPRESSION_HALF_LIFE_DAYS);
  return Math.min(count * 1.2 * decay, 9);
}

/** «Похожие игры» для страницы игры */
export function similarTo(slug, limit = 6) {
  const base = byId(slug);
  if (!base) return [];
  return GAMES
    .filter((g) => g.slug !== slug)
    .map((g) => {
      let s = similarity(slug, g.slug) * 20;
      if (base.players[1] > 1) s += Math.min(g.players[1], base.players[1]) * 0.25;
      if (seriesOf(g) === seriesOf(base)) s += 1.5;
      return { game: g, s: s + (g.rating - 70) * 0.03 };
    })
    .sort((x, y) => y.s - x.s)
    .slice(0, limit)
    .map((x) => x.game);
}

/* ------------------------------------------------------------------ *
 * Выдача
 * ------------------------------------------------------------------ */

/**
 * @param {object} profile профиль вкуса
 * @param {object} [opts] { limit, seed, includePlayed, minScore, diversify }
 * @returns {{ list, poolSize, relaxed, weights, confidence, facets }}
 */
export function recommend(profile, opts = {}) {
  const { limit = 12, seed = 1, includePlayed = false, diversify = true } = opts;
  const weights = computeWeights(profile);
  const neighbours = likedNeighbours(profile);
  const context = { neighbours };

  let pool = GAMES.filter((g) => hardFilter(g, profile));
  let relaxed = false;

  const hidden = (g) => {
    const m = profile.marks?.[g.slug];
    return !includePlayed && (m?.status === 'played' || m?.status === 'disliked');
  };

  let visible = pool.filter((g) => !hidden(g));
  if (visible.length < limit) {
    // показываем не строгое совпадение — интерфейс обязан честно сказать об этом
    // (раньше при пустом пуле фильтры игнорировались молча)
    relaxed = true;
    visible = pool.length >= limit ? pool : GAMES.filter((g) => !hidden(g));
  }

  const random = rng(seed);
  const scored = visible.map((g) => {
    const { score, reasons } = scoreGame(g, profile, weights, context);
    const jitter = (random() - 0.5) * 4;
    return { game: g, score: score + jitter, rawScore: score, reasons };
  });
  scored.sort((a, b) => b.score - a.score);

  const ordered = diversify ? mmr(scored, limit) : scored.slice(0, limit);
  const list = ordered.map((item) => ({ ...item, why: explain(item, profile, weights) }));

  // Уверенность: насколько топ оторвался от «середины»
  const scores = scored.map((x) => x.score);
  const top = scores[0] ?? 0;
  const median = scores[Math.floor(scores.length / 2)] ?? 0;
  const spread = scores.length > 3 ? Math.max(1, Math.abs(scores[0] - scores[scores.length - 1])) : 1;
  const confidence = Math.round(Math.min(100, Math.max(0, ((top - median) / spread) * 160)));

  return {
    weights,
    list,
    poolSize: pool.length,
    relaxed,
    confidence,
    facets: facetCounts(pool),
  };
}

/**
 * MMR (maximal marginal relevance): берём самые релевантные игры, но штрафуем
 * за похожесть на уже выбранные. λ = 0.72 — баланс релевантности и разнообразия.
 */
function mmr(items, limit, lambda = 0.72) {
  const selected = [];
  const used = new Set();
  const pool = items.slice(0, Math.max(limit * 4, 40));
  const scale = Math.max(...pool.map((x) => Math.abs(x.score)), 1);

  while (selected.length < limit && used.size < pool.length) {
    let best = null;
    let bestValue = -Infinity;
    for (const item of pool) {
      if (used.has(item.game.slug)) continue;
      let maxSim = 0;
      for (const s of selected) {
        let sim = similarity(item.game.slug, s.game.slug);
        if (seriesOf(item.game) === seriesOf(s.game)) sim = Math.max(sim, 0.62);
        if (sim > maxSim) maxSim = sim;
      }
      const value = lambda * (item.score / scale) - (1 - lambda) * maxSim;
      if (value > bestValue) { bestValue = value; best = item; }
    }
    if (!best) break;
    used.add(best.game.slug);
    selected.push(best);
  }

  // остаток — по убыванию релевантности (для «показать ещё»)
  for (const item of pool) if (!used.has(item.game.slug)) { used.add(item.game.slug); selected.push(item); }
  for (const item of items) if (!used.has(item.game.slug) && selected.length < 120) { used.add(item.game.slug); selected.push(item); }
  return selected;
}

/** Сколько игр пула попадает в каждый жанр/настроение — для подсказок в интерфейсе */
function facetCounts(pool) {
  const genres = {}, modes = {};
  for (const g of pool) {
    for (const id of g.genres) genres[id] = (genres[id] || 0) + 1;
    for (const id of g.modes) modes[id] = (modes[id] || 0) + 1;
  }
  return { genres, modes };
}

/** Человекочитаемое «почему подходит» */
function explain(item, profile, weights) {
  const { game, reasons } = item;
  const a = profile.answers || {};
  const out = [];

  for (const id of (reasons.find((r) => r.type === 'mood')?.ids || []).slice(0, 2)) {
    out.push({ ru: `Настроение «${MOODS[id].ru}»`, en: `Mood: ${MOODS[id].en}` });
  }
  for (const id of (reasons.find((r) => r.type === 'genre')?.ids || []).slice(0, 2)) {
    out.push({ ru: `Жанр «${GENRES[id].ru}» — как вы любите`, en: `${GENRES[id].en} — a genre you like` });
  }
  for (const id of (reasons.find((r) => r.type === 'tag')?.ids || []).slice(0, 3)) {
    out.push({ ru: TAGS[id].ru, en: TAGS[id].en });
  }

  const neighbour = reasons.find((r) => r.type === 'similar');
  if (neighbour) {
    const original = byId(neighbour.slug);
    if (original) out.push({ ru: `Похожа на «${original.t}»`, en: `Similar to “${original.t}”` });
  }

  if (a.players > 1 && game.coopQ >= 8) out.push({ ru: `Хорошо играется компанией до ${game.players[1]}`, en: `Great with up to ${game.players[1]} players` });
  else if (a.players > 1 && game.players[1] <= a.players * 2) out.push({ ru: `Как раз на ${game.players[1]} игроков`, en: `Fits exactly ${game.players[1]} players` });
  if (a.players > 1 && game.modes.includes('coopLocal') && (a.platforms || []).length) out.push({ ru: 'Есть кооп за одним экраном', en: 'Has local co-op' });
  if (a.session === 'quick' && game.len[1] <= 12) out.push({ ru: `Короткая: около ${game.len[0]}–${game.len[1]} ч`, en: `Short: about ${game.len[0]}–${game.len[1]} h` });
  if (a.novelty === 'classic' && game.y <= 2016) out.push({ ru: `Проверенная классика (${game.y})`, en: `A proven classic (${game.y})` });
  if (a.novelty === 'new' && game.y >= 2022) out.push({ ru: `Свежая игра (${game.y})`, en: `Recent release (${game.y})` });
  if (game.price === 'free') out.push({ ru: 'Бесплатная', en: 'Free to play' });
  if (game.price === 'subscription' && (a.price === 'free' || a.price === 'subscription')) out.push({ ru: 'Доступна по подписке (Game Pass / PS Plus)', en: 'Available on Game Pass / PS Plus' });
  if (reasons.some((r) => r.type === 'wishlist')) out.push({ ru: 'Уже в вашем вишлисте', en: 'Already on your wishlist' });
  if (game.rating >= 88) out.push({ ru: `Рейтинг ${game.rating}/100`, en: `Rated ${game.rating}/100` });

  return out.slice(0, 4);
}

/** Пул по «компании»: во что поиграть вместе */
export function recommendForParty({ players = 2, platforms = [], freeOnly = false, limit = 8, seed = 7, lang = 'ru' }) {
  const pool = GAMES.filter((g) => {
    if (g.players[1] < players) return false;
    const team = g.modes.some((m) => ['coopOnline', 'coopLocal', 'pvpOnline', 'pvpLocal', 'mmo'].includes(m));
    if (!team) return false;
    if (platforms.length && !platforms.some((p) => g.platforms.includes(p))) return false;
    if (freeOnly && g.price !== 'free') return false;
    return true;
  });
  const random = rng(seed + players * 13);
  return pool
    .map((g) => ({
      game: g,
      score: g.coopQ * 4 + (g.rating - 70) * 0.4 + Math.min(g.players[1], 8) * 0.6 + random() * 6,
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.game);
}

/** Статистика профиля вкуса для страницы «Мой профиль» */
export function tasteSummary(profile) {
  const w = computeWeights(profile);
  const marks = Object.values(profile.marks || {});
  return {
    liked: marks.filter((m) => m.status === 'liked').length,
    disliked: marks.filter((m) => m.status === 'disliked').length,
    played: marks.filter((m) => m.status === 'played').length,
    wishlist: marks.filter((m) => m.status === 'wishlist').length,
    topTags: w.topTags,
    topGenres: w.topGenres,
    topMoods: w.topMoods,
    negativeTags: w.negativeTags,
    weights: w,
  };
}

/** Краткая сводка: сколько сигналов у движка (для плашки «профиль уточняется») */
export function signalStrength(profile) {
  const marks = Object.values(profile.marks || {}).length;
  const answers = Object.entries(profile.answers || {})
    .filter(([key, value]) => !['partyMode'].includes(key))
    .filter(([, value]) => (Array.isArray(value) ? value.length : Boolean(value))).length;
  return Math.min(100, answers * 6 + marks * 4);
}

export { PRICE, MODES, GENRES, TAGS, MOODS, PLATFORMS };
