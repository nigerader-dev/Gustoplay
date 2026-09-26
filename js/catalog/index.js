/**
 * Схема каталога + нормализация.
 *
 * Компактный формат (чтобы каталог легко читался и правился руками):
 *   t     — название            y — год выхода              dev — студия
 *   gr    — жанры (id из taxonomy.GENRES)
 *   tg    — теги  (id из taxonomy.TAGS)   ← это «атомы вкуса», на них работает обучение
 *   md    — режимы (id из taxonomy.MODES)
 *   pl    — [мин, макс] игроков
 *   pf    — платформы (id из PLATFORMS)
 *   pr    — ценовая категория (PRICE), pv — примерная цена в ₽ (для сортировки и фильтра бюджета)
 *   len   — [часов до финала, часов на 100%] (для «бесконечных» — второе число большое)
 *   dif   — сложность 1..5, pace — темп 1..5 (1 спокойно, 5 мясорубка)
 *   rat   — рейтинг 0..100 (усреднённый агрегатор)
 *   mood  — настроения (id из MOODS) ← верхний слой квиза
 *   coopQ — 0..10, насколько хороша игра именно в компании (если применимо)
 *   gp / psp — есть ли в Game Pass / PS Plus каталоге
 *   desc  — { ru, en } одно предложение (карточки, анонсы, SEO)
 *   about — { ru, en } полное описание: 2–4 предложения (страница игры и JSON-LD)
 *   feats — { ru: [...], en: [...] } 2–4 буллета «особенности / за что любят»
 *
 * Обложки: официальный арт магазинов. Сопоставление «игра → Steam AppID»
 * хранится в ./steam-covers.js (генерирует tools/resolve-steam-covers.mjs,
 * ручные правки — в tools/steam-overrides.json). Игры вне Steam берутся из
 * того же файла с пометкой источника (GOG / Epic / официальный сайт).
 */
import { GENRES, TAGS, MODES, PLATFORMS, MOODS, PRICE } from '../taxonomy.js';
import { PART_A } from './part-a.js';
import { PART_B } from './part-b.js';
import { PART_C } from './part-c.js';
import { PART_D } from './part-d.js';
import { PART_E } from './part-e.js';
import { PART_F } from './part-f.js';
import { PART_G } from './part-g.js';
import { PART_H } from './part-h.js';
import { PART_I } from './part-i.js';
import { STEAM_COVERS } from './steam-covers.js';
import { STORE_LINKS } from './store-links.js';
import { SYSREQ } from './sysreq.js';

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '');

const raw = [...PART_A, ...PART_B, ...PART_C, ...PART_D, ...PART_E, ...PART_F, ...PART_G, ...PART_H, ...PART_I];

function normalize(g) {
  const slug = g.slug || slugify(g.t);
  const cover = STEAM_COVERS[slug] || {};
  // ВАЖНО: appid приходит из steam-covers.js и подмешивается ниже, поэтому читать его
  // из сырой записи нельзя — так ссылка «Открыть в Steam» превращалась в поиск по названию
  // (баг, из-за которого кнопка вела не на страницу игры).
  const steamId = cover.steamId || g.steamId || null;
  // официальный магазин/сайт для игр без страницы в Steam (см. js/catalog/store-links.js)
  const storeLink = STORE_LINKS[slug] || null;
  const modes = (g.md || []).filter((m) => MODES[m]);
  const platforms = (g.pf || []).filter((p) => PLATFORMS[p]);
  // облачный гейминг доступен почти для всех крупных ПК-игр
  if (platforms.includes('pc') && g.rat >= 80 && !platforms.includes('cloud')) platforms.push('cloud');

  const len = g.len || [10, 20];
  const tags = (g.tg || []).filter((t) => TAGS[t]);
  const genres = (g.gr || []).filter((x) => GENRES[x]);

  return {
    ...g,
    ...cover,
    steamId,
    slug,
    genres: [...new Set(genres)],
    tags: [...new Set(tags)],
    modes: [...new Set(modes)],
    platforms: [...new Set(platforms)],
    len,
    players: g.pl || [1, 1],
    price: g.pr || 'mid',
    priceRub: g.pv ?? 0,
    difficulty: g.dif ?? 3,
    pace: g.pace ?? 3,
    rating: g.rat ?? 75,
    moods: [...new Set((g.mood || []).filter((m) => MOODS[m]))],
    desc: g.desc || { ru: '', en: '' },
    // полное описание и буллеты: появятся у всех игр; пока поле может отсутствовать
    about: g.about || null,
    feats: { ru: g.feats?.ru || [], en: g.feats?.en || [] },
    // требования к ПК: собраны из Steam Store API (js/catalog/sysreq.js).
    // null — магазин их не публикует; выдумывать значения нельзя, страница честно об этом скажет.
    sysreq: g.req || SYSREQ[slug] || null,
    coopQ: g.coopQ ?? (modes.includes('coopOnline') || modes.includes('coopLocal') ? 6 : 0),
    // теги, которые генерируются автоматически (пригодятся для SEO-страниц и фильтров)
    allTags: [
      ...tags,
      ...(len[1] <= 12 || tags.includes('short') ? ['short'] : []),
      ...(len[1] >= 60 ? ['long'] : []),
    ],
    // Ссылки на конкретные страницы магазинов. Поисковых ссылок-заглушек нет:
    // если страницы игры в Steam нет (Nintendo, мобильные, Battle.net), кнопка Steam
    // не показывается, а вместо неё идёт официальный магазин/сайт издателя.
    links: {
      steam: steamId ? `https://store.steampowered.com/app/${steamId}/` : null,
      official: storeLink?.url || null,
      officialLabel: storeLink?.label || 'game.official',
    },
  };
}

/** Полный нормализованный каталог */
export const GAMES = raw.map(normalize);

/** Быстрый доступ по slug/id */
export const BY_ID = new Map(GAMES.map((g) => [g.slug, g]));

export const byId = (slug) => BY_ID.get(slug) || null;

/** Проверка целостности данных — падает громко, если в каталоге опечатка */
export function validate() {
  const problems = [];
  const seen = new Set();
  for (const g of GAMES) {
    if (seen.has(g.slug)) problems.push(`Дубль slug: ${g.slug}`);
    seen.add(g.slug);
    if (!g.genres.length) problems.push(`${g.t}: нет валидных жанров`);
    if (!g.tags.length) problems.push(`${g.t}: нет валидных тегов`);
    if (!g.moods.length) problems.push(`${g.t}: нет валидных настроений`);
    if (g.players[0] > g.players[1]) problems.push(`${g.t}: pl перепутаны`);
    if (!g.desc.ru || !g.desc.en) problems.push(`${g.t}: нет описания`);
    if (g.about && (!g.about.ru || !g.about.en)) problems.push(`${g.t}: about заполнен не на обоих языках`);
    for (const lang of ['ru', 'en']) {
      const feats = g.feats?.[lang] || [];
      if (feats.length && (feats.length < 2 || feats.length > 4)) problems.push(`${g.t}: feats.${lang} должно быть 2–4 буллета`);
    }
  }
  if (GAMES.length < 300) problems.push(`Слишком мало игр: ${GAMES.length} (ожидаем 300+)`);
  return problems;
}

export const STATS = {
  total: GAMES.length,
  coop: GAMES.filter((g) => g.modes.some((m) => m.startsWith('coop'))).length,
  pvp: GAMES.filter((g) => g.modes.some((m) => m.startsWith('pvp')) || g.modes.includes('mmo')).length,
  solo: GAMES.filter((g) => g.modes.includes('solo') || g.players[0] === 1).length,
  byGenre: Object.fromEntries(
    Object.keys(GENRES).map((gid) => [gid, GAMES.filter((g) => g.genres.includes(gid)).length]),
  ),
};
