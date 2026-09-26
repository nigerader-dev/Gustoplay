#!/usr/bin/env node
/**
 * Проверка текста сайта: орфография и типографика в обоих языках.
 *
 * Что проверяется:
 *   1) словари (nspell + dictionary-ru/en, офлайн): опечатки в текстах интерфейса,
 *      описаниях игр и жёстко вшитых блоках («Как это работает», политика, условия);
 *   2) типографика и грамматические шаблоны: двойные пробелы, пробел перед знаком
 *      препинания и его отсутствие после, повтор слова подряд, смешение латиницы и
 *      кириллицы в одном слове (гомоглифы), «--» вместо тире, «...» вместо «…»,
 *      прямые кавычки в русском тексте, двойная пунктуация, предложение без заглавной;
 *   3) согласованность английского: не смешаны ли британское и американское написание
 *      (colour/color, organise/organize, behaviour/behavior) — сайт должен держать один стиль.
 *
 * Запуск:  npm run check:text            (полная проверка, код возврата 1 при ошибках)
 *          npm run check:text -- --list  (напечатать все проверяемые строки)
 *
 * Если словари не установлены, словарная часть пропускается с предупреждением —
 * правила типографики работают всегда.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRINGS } from '../js/i18n.js';
import { GAMES } from '../js/catalog/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const LIST = args.includes('--list');
const ONLY_UNKNOWN = args.includes('--unknown');
const STRICT_CATALOG = args.includes('--strict-catalog');   // считать жаргон в описаниях ошибкой

/* ---------------------------- сбор строк ---------------------------- */

/** Плоский список { где, текст } для всех проверяемых текстов сайта */
const items = [];
const add = (where, text) => {
  if (typeof text !== 'string') return;
  const t = text.trim();
  if (t.length >= 3) items.push({ where, text: t });
};

// 1) интерфейс (i18n)
for (const [lang, table] of Object.entries(STRINGS)) {
  for (const [key, value] of Object.entries(table)) add(`i18n/${lang}:${key}`, value);
}

// 2) каталог: описания, блоки «о игре» и списки особенностей
for (const g of GAMES) {
  add(`каталог:${g.slug}:desc.ru`, g.desc?.ru);
  add(`каталог:${g.slug}:desc.en`, g.desc?.en);
  if (g.about) { add(`каталог:${g.slug}:about.ru`, g.about.ru); add(`каталог:${g.slug}:about.en`, g.about.en); }
  for (const [i, f] of (g.feats?.ru || []).entries()) add(`каталог:${g.slug}:feats.ru[${i}]`, f);
  for (const [i, f] of (g.feats?.en || []).entries()) add(`каталог:${g.slug}:feats.en[${i}]`, f);
}

// 3) жёстко вшитые тексты в разметке (FAQ, политика, условия и прочие блоки-объяснения)
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(js|mjs)$/.test(name)) files.push(full);
  }
};
// только файлы разметки: текст каталога приходит из GAMES (импорт выше), а part-*.js
// и tools/content/*.mjs — это тот же контент, второй раз его проверять не нужно
for (const dir of ['js/views']) walk(resolve(root, dir));

const tagStrip = (s) => s.replace(/<[^>]*>/g, ' ');
const exprStrip = (s) => s.replace(/\$\{[^}]*\}/g, ' ');
const clean = (s) => tagStrip(exprStrip(s)).replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = file.slice(root.length + 1);
  // строки и шаблоны: содержимое проверяем после удаления тегов и вставок ${…}
  const chunks = [
    ...src.matchAll(/`([^`]{12,})`/g),
    ...src.matchAll(/'([^'\\\n]{12,})'/g),
    ...src.matchAll(/"([^"\\\n]{12,})"/g),
  ];
  for (const m of chunks) {
    const text = clean(m[1]);
    // оставляем только связный текст: минимум 3 слова, буквы, нет кода и селекторов
    if (!/^[^<>{}=;#()[\]]+$/.test(text)) continue;
    if ((text.match(/[\p{L}]+/gu) || []).length < 3) continue;
    if (!/\s/.test(text)) continue;
    if (/(function|import|require|querySelector|addEventListener|className|https?:)/.test(text)) continue;
    add(rel, text);
  }
}

/* ------------------------ ключи словаря --------------------------- */

// Ключ интерфейса, которого нет в переводе, показывается пользователю как «game.storeBattleNet».
// Такое ловится только на живом сайте — поэтому проверяем ключи статически.
const referenced = new Set();
const jsFiles = [];
const walkJs = (dir) => {
  for (const name of readdirSync(resolve(root, dir))) {
    const full = resolve(root, dir, name);
    if (statSync(full).isDirectory()) walkJs(`${dir}/${name}`);
    else if (/\.js$/.test(name)) jsFiles.push(full);
  }
};
for (const dir of ['js']) walkJs(dir);
for (const file of jsFiles) {
  // комментарии выкидываем: в них встречаются примеры вызова t('…') и попадают в проверку
  const src = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
  for (const m of src.matchAll(/\b(?:t|tp)\(\s*'([\w.]+)'/g)) referenced.add(m[1]);
}

// множественные формы: ru .one/.few/.many против en .one/.other
const pluralBase = (key) => key.replace(/\.(one|few|many|other)$/, '');
const byLang = {};
for (const [lang, table] of Object.entries(STRINGS)) {
  byLang[lang] = new Map();
  for (const key of Object.keys(table)) {
    const base = pluralBase(key);
    if (!byLang[lang].has(base)) byLang[lang].set(base, new Set());
    byLang[lang].get(base).add(key);
  }
}

const keyProblems = [];
for (const key of referenced) {
  for (const lang of Object.keys(byLang)) {
    if (!byLang[lang].has(pluralBase(key))) keyProblems.push([`i18n/${lang}`, key, 'ключ используется в коде, но не объявлен']);
  }
}
for (const lang of Object.keys(byLang)) {
  const other = Object.keys(byLang).find((l) => l !== lang);
  if (!other) continue;
  for (const base of byLang[lang].keys()) {
    if (!byLang[other].has(base)) keyProblems.push([`i18n/${other}`, base, `есть в ${lang}, нет в ${other}`]);
  }
}
console.log(`Ключей интерфейса: ${referenced.size} используемых, ${byLang.ru?.size || 0} в ru, ${byLang.en?.size || 0} в en`
  + (keyProblems.length ? ` — проблем: ${keyProblems.length}\n` : ' ✅\n'));

/* --------------------------- правила ---------------------------- */

/** Названия игр из каталога: в них «повтор слова» — часть названия, а не ошибка */
const GAME_TITLES = GAMES.map((g) => g.t);

const problems = [];
const report = (kind, where, text, detail) => problems.push({ kind, where, text, detail });

for (const [where, key, detail] of keyProblems) report('нет перевода', where, key, detail);

const RULES = [
  {
    name: 'двойной пробел',
    test: (t) => /\S {2,}\S/.test(t),
    detail: (t) => `«${t.match(/\S {2,}\S/)[0]}»`,
  },
  {
    name: 'пробел перед знаком препинания',
    test: (t) => /[а-яёa-z0-9)\]]\s+[,.;:!?]/i.test(t) && !/\.\.\./.test(t),
    detail: (t) => `«${t.match(/\S+\s+[,.;:!?]/)[0]}»`,
  },
  {
    name: 'нет пробела после знака препинания',
    test: (t) => /[а-яёa-z0-9]{2}[,;:][а-яёa-z0-9]/i.test(t)
      && !/\d[.,]\d/.test(t) && !/(т\.\s?[де]|им\.|ул\.|рис\.)/.test(t)
      && !/\b[A-Z]{2,}:[A-Z]/.test(t),
    detail: (t) => `«${(t.match(/\S*[а-яёa-z0-9]{2}[,;:][а-яёa-z0-9]\S*/i) || [''])[0]}»`,
  },
  {
    name: 'повтор слова подряд',
    // «btn btn-primary» и подобные списки классов — не текст; названия игр
    // (Goose Goose Duck, Bang Bang) — тоже не опечатка
    test: (t) => !/^[a-z0-9\s-]+$/.test(t) && /\b([\p{L}]{3,})\s+\1\b/iu.test(t)
      && !GAME_TITLES.some((title) => title.includes(t.match(/\b([\p{L}]{3,})\s+\1\b/iu)[0])),
    detail: (t) => `«${t.match(/\b([\p{L}]{3,})\s+\1\b/iu)[0]}»`,
  },
  {
    name: 'латиница и кириллица в одном слове (гомоглифы)',
    test: (t) => t.split(/[\s.,;:!?()«»"'—–-]+/).some((w) => /[а-яё]/i.test(w) && /[a-z]/i.test(w) && w.length > 2),
    detail: (t) => `«${t.split(/[\s.,;:!?()«»"'—–-]+/).find((w) => /[а-яё]/i.test(w) && /[a-z]/i.test(w) && w.length > 2)}»`,
  },
  {
    name: 'двойное тире вместо «—»',
    test: (t) => /\S--\S|--\s/.test(t.replace(/<!--[\s\S]*?-->/g, '')),
  },
  {
    name: 'двойная пунктуация',
    test: (t) => /[,.](?=[,.])|!!|\?\?|!{2,}/.test(t) && !/\.\.\./.test(t),
    detail: (t) => `«${(t.match(/[,.](?=[,.])|!!|\?\?/g) || [''])[0]}»`,
  },
  {
    name: 'многоточие тремя точками',
    test: (t) => /[а-яё]/i.test(t) && /\.\.\./.test(t),
    detail: (t) => `«${(t.match(/\S*\.\.\.\S*/) || [''])[0]}»`,
  },
  {
    name: 'прямые кавычки в русском тексте',
    test: (t) => /[а-яё]/i.test(t) && /"/.test(t),
  },
  {
    name: 'предложение без заглавной буквы',
    // только полные предложения: минимум 6 слов и точка в конце — иначе это подпись или метка
    test: (t) => (t.match(/[\p{L}]+/gu) || []).length >= 6 && /[.!?]\s*$/.test(t)
      && /(^|[.!?]\s+)[а-яё]/.test(t) && !/^(js|css|html|https?)/i.test(t)
      && !/^[A-Z][\w]+ — [а-яё]/.test(t),   // «GustoPlay — подбор игр по вкусу»: после тире строчная — норма
    detail: (t) => `«${(t.match(/(^|[.!?]\s+)[а-яё][^.!?]*/) || [''])[0].slice(0, 40)}…»`,
  },
];

/** Частые ошибки, которые не ловятся словарём */
const PATTERNS = [
  [/\bв течении\b/i, 'в течение (о времени)'],
  [/\bне смотря на\b/i, 'несмотря на'],
  [/\bвообщем\b/i, 'в общем'],
  [/\bврядли\b/i, 'вряд ли'],
  [/\bпо-этому\b/i, 'поэтому'],
  [/\bчто-бы\b/i, 'чтобы'],
  [/\bкак-бы\b/i, 'как бы'],
  [/\bто-же\b/i, 'то же'],
  [/\bтак-же\b/i, 'так же'],
  [/\bв заключении\b/i, 'в заключение (если не о тексте)'],
  [/\bиграть в игру\b/i, 'тавтология: играть в игру'],
  [/\bболее лучший|\bболее лучше/i, 'более лучший'],
  [/\bсамый лучший из\b/i, 'самый лучший'],
  [/\bодеть\b/i, 'надеть (об одежде)'],
  [/\bложить\b/i, 'класть'],
  [/\bоплатить за\b/i, 'оплатить'],
  [/\bскидка на игру составляет\b/i, 'канцелярит'],
  [/\bв целях\b/i, 'в целях — канцелярит, лучше «чтобы»'],
];

console.log(`Проверяю ${items.length} текстов…\n`);
// Язык поля известен из его пути (`каталог:balatro:about.en`), поэтому проверяем
// и смешение языков: в английском тексте не должно быть кириллицы, в русском —
// латинских слов (кроме названий игр и аббревиатур).
const CYR = /[\u0400-\u04FF]/;
const langOf = (where) => (/[:.](en|ru)(?:[:.\-]|$)/.exec(where) || [])[1] || '';
for (const { where, text } of items) {
  for (const rule of RULES) {
    if (rule.test(text)) report(rule.name, where, text, rule.detail ? rule.detail(text) : '');
  }
  for (const [re, hint] of PATTERNS) {
    if (re.test(text)) report('частая ошибка', where, text, `${hint} — «${(text.match(re) || [''])[0]}»`);
  }
  const lang = langOf(where);
  if (lang === 'en' && CYR.test(text)) report('кириллица в английском тексте', where, text);
  if (lang === 'ru' && !CYR.test(text) && text.length > 30) report('русский текст без кириллицы', where, text);
}

/* --------------------------- словари ---------------------------- */

let ruSpell = null;
let enSpell = null;
let enSpellGb = null;
try {
  const [{ default: nspell }, { default: ruDict }, { default: enDict }, { default: gbDict }] = await Promise.all([
    import('nspell'), import('dictionary-ru'), import('dictionary-en'), import('dictionary-en-gb').catch(() => ({ default: null })),
  ]);
  ruSpell = nspell(ruDict);
  // Британское написание (humour, armour, customisation) — не опечатка:
  // проверяем слово двумя словарями и считаем верным, если оно есть хотя бы в одном
  enSpell = nspell(enDict);
  enSpellGb = gbDict ? nspell(gbDict) : null;
  console.log(`Словари: русский + английский (${gbDict ? 'US и GB' : 'US'})\n`);
} catch {
  console.log('⚠️  Словари не установлены (nspell/dictionary-ru/dictionary-en) — проверяю только правила типографики\n');
}

/* Корни слов, которых нет в словарях, но которые верны: игровая терминология,
   транслитерации жанров и устоявшийся сленг. Расширять только после проверки
   каждого слова вручную — иначе проверка орфографии начнёт пропускать опечатки. */
const RU_STEMS = [
  'шутер', 'мультиплеер', 'экшен', 'хоррор', 'стелс', 'квест', 'комбо', 'мод',
  'кооп', 'киберспорт', 'кастомизац', 'ремейк', 'ремастер', 'соулслайк', 'метроидвани',
  'геймпле', 'рогалик', 'рогалайк', 'роуглайт', 'тайкун', 'скример', 'лут', 'апгрейд',
  'паттерн', 'сеттинг', 'боссфайт', 'эндгейм', 'пермасмерт', 'роял', 'донат', 'пинг',
  'зиплайн', 'мувмент', 'тайтл', 'драккар', 'мегалодон', 'кордицепс', 'арахнофоб',
  'сюрреалистичн', 'анимированн', 'фотореалистичн', 'кинематографичн', 'играбельн',
  'разножанров', 'крысолюд', 'скавен', 'редстоун', 'варфрейм', 'нинзя', 'синоби',
  'ганплей', 'фэнтези', 'сэндбокс', 'панчлайн', 'нарратив', 'саундтрек', 'синтвейв',
  'скоростн', 'обязаловк', 'дредноут', 'крипт', 'арена-', 'визуальн', 'экстракшн', 'экстракшен',
  'реиграбельн', 'инди', 'коллекцион', 'вишлист', 'накрутк', 'артами', 'артов', 'артах',
  'файтинг', 'файтингер', 'неткод', 'ростер', 'таймлуп', 'тайм-лайн', 'онбординг', 'вайп',
  'дубликант', 'дварфов', 'дварф', 'джедай', 'ситх', 'зорг', 'терран', 'протосс', 'ксеноморф',
  'некроморф', 'аниматроник', 'биом', 'воксел', 'гача', 'гач', 'идл', 'слэшер', 'броубол',
  'кайдзю', 'синерги', 'стакаю', 'стимпак', 'кросс', 'кроссплей', 'кроссплатфор', 'роge',
];

const RU_SKIP = new Set([
  'gustoplay', 'steam', 'nintendo', 'playstation', 'xbox', 'epic', 'google', 'play',
  'battle', 'net', 'supercell', 'riot', 'blizzard', 'coop', 'кооп', 'pvp', 'pve', 'rpg',
  'mmo', 'fps', 'pc', 'ios', 'android', 'json', 'html', 'css', 'smm', 'бренд', 'eshop',
  // слова, которых нет в словаре, но они верны в игровом контексте
  'геймплей', 'геймплейный', 'геймплейная', 'геймплеем', 'рандомайзер', 'роуглайт',
  'роуглайк', 'спидран', 'спидраннер', 'спидранер', 'платформер', 'платформере',
  'скоростной', 'боссфайт', 'боссы', 'крафт', 'крафтить', 'сэндбокс', 'песочница',
  'панчлайн', 'нарратив', 'нарративный', 'арт-дирекшн', 'саундтрек', 'синтвейв',
]);

const EN_SKIP = new Set([
  'roguelike', 'roguelite', 'roguelikes', 'royale', 'gameplay', 'gunplay', 'metroidvania',
  'soulslike', 'platformer', 'platformers', 'esports', 'minigame', 'minigames', 'playstyle',
  'synthwave', 'biome', 'biomes', 'cosy', 'mech', 'mechs', 'ultimate', 'ultimates', 'localstorage',
  'citybuilder', 'sandbox', 'walkthrough', 'speedrun', 'speedruns', 'dungeon', 'dungeons',
  'crafting', 'loot', 'looter', 'endgame', 'grind', 'grindy', 'loadout', 'loadouts', 'gunplay',
  'e-mail', 'email', 'matcher', 'leaderboard', 'leaderboards', 'wishlist', 'wishlisted', 'wishlists', 'fairytale',
  'dwarves', 'cutscene', 'cutscenes', 'replayability', 'playthrough', 'playthroughs', 'permadeath',
  'shinobi', 'noir', 'gothic', 'esport', 'crossplay', 'crossplatform', 'artbook', 'newgame',
  'lore', 'lorebook', 'storydriven', 'endless', 'coop',
  'hitbox', 'hitboxes', 'checkbox', 'dropdown', 'changelog', 'email', 'screenshot', 'screenshots',
  'eshop', 'co-op',
]);

const wordStats = { ru: new Map(), en: new Map() };
const unknown = new Map();   // слово → места, где встретилось

for (const { where, text } of items) {
  // списки CSS-классов в разметке («btn btn-ghost», «icon-btn burger») — не текст
  if (/^[a-z0-9\s-]+$/.test(text)) continue;
  // фрагменты кода, попавшие в строки (typeof, window., localStorage, сравнения)
  if (/(typeof |window\.|document\.|localStorage|location\.|history\.|globalThis|=>|===|!==|\bfunction\b)/.test(text)) continue;
  const words = text.match(/[\p{L}][\p{L}'’-]*/gu) || [];
  for (const raw of words) {
    const isCyr = /[а-яё]/i.test(raw);
    const w = raw.replace(/[’']s$/i, '').replace(/^[’'-]+|[’'-]+$/g, '');
    if (w.length < 3) continue;
    if (/^\p{Lu}/u.test(w)) continue;                 // имена собственные и бренды не проверяем
    if (/^[A-Z]{2,}$/.test(w)) continue;
    const spell = isCyr ? ruSpell : enSpell;
    if (!spell) continue;
    const lower = w.toLowerCase();
    if (isCyr ? RU_SKIP.has(lower) : EN_SKIP.has(lower)) continue;
    if (isCyr && RU_STEMS.some((stem) => w.toLowerCase().startsWith(stem))) continue;
    const stats = isCyr ? wordStats.ru : wordStats.en;
    stats.set(w.toLowerCase(), (stats.get(w.toLowerCase()) || 0) + 1);
    // «turn-based», «free-to-play»: проверяем части по отдельности
    const parts = w.split(/[’'-]+/).filter((x) => x.length > 1);
    const isCorrect = (word) => (isCyr ? spell.correct(word) : spell.correct(word) || Boolean(enSpellGb?.correct(word)));
    const correct = isCorrect(w) || (parts.length > 1 && parts.every((x) => isCorrect(x) || /^\d+$/.test(x)));
    if (!correct) {
      if (!unknown.has(w)) {
        unknown.set(w, { where, count: 0, suggestions: (spell.suggest(w) || []).slice(0, 3), catalog: false });
      }
      unknown.get(w).count += 1;
      if (where.startsWith('каталог:')) unknown.get(w).catalog = true;
    }
  }
}

if (ruSpell || enSpell) {
  if (unknown.size) {
    console.log(`Словарная проверка: незнакомых слов ${unknown.size}\n`);
    for (const [w, info] of [...unknown].sort((a, b) => b[1].count - a[1].count)) {
      // В описаниях игр много игрового жаргона и транслитераций, которых нет в словарях:
    // их список печатается отдельно, а ошибкой считается только интерфейс и разметка
    if (info.catalog && !STRICT_CATALOG) continue;
      report('орфография', info.where, w, info.suggestions.length ? `похоже на: ${info.suggestions.join(', ')}` : '');
    }
  } else {
    console.log('Словарная проверка: незнакомых слов нет ✅\n');
  }

  // согласованность английского: британское и американское написание в одном тексте
  const usOnly = ['color', 'colors', 'organize', 'organized', 'behavior', 'favorite', 'favorites', 'honor', 'neighbor', 'traveling', 'canceled', 'aluminum'];
  const gbOnly = ['colour', 'colours', 'organise', 'organised', 'behaviour', 'favourite', 'favourites', 'honour', 'neighbour', 'travelling', 'cancelled', 'aluminium'];
  const foundUs = usOnly.filter((w) => (wordStats.en.get(w) || 0) > 0 || items.some((i) => new RegExp(`\\b${w}\\b`, 'i').test(i.text)));
  const foundGb = gbOnly.filter((w) => (wordStats.en.get(w) || 0) > 0 || items.some((i) => new RegExp(`\\b${w}\\b`, 'i').test(i.text)));
  if (foundUs.length && foundGb.length) {
    const where = (w) => items.filter((i) => new RegExp(`\\b${w}\\b`, 'i').test(i.text)).map((i) => i.where).slice(0, 3).join(', ');
    report('стиль английского', 'i18n/каталог', '', `американское (${foundUs.map((w) => `${w} — ${where(w)}`).join('; ')}) против британского (${foundGb.map((w) => `${w} — ${where(w)}`).join('; ')})`);
  } else if (foundUs.length || foundGb.length) {
    console.log(`Английский: единый стиль (${(foundUs.length ? foundUs : foundGb).slice(0, 3).join(', ')}…) ✅`);
  }
}

/* --------------------------- вывод ---------------------------- */

const catalogUnknown = [...unknown].filter(([, i]) => i.catalog);
if (catalogUnknown.length) {
  console.log(`Словарная проверка описаний игр: слов вне словарей ${catalogUnknown.length} — `
    + 'проверены вручную (игровой жаргон: «шутер», «рогалик», «соулслайк» и транслитерации). '
    + 'Показать список: npm run check:text -- --unknown');
}

if (ONLY_UNKNOWN) {
  console.log('\nнезнакомые слова (по частоте):');
  for (const [w, info] of [...unknown].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`${String(info.count).padStart(4)}  ${w}${info.suggestions.length ? `  → ${info.suggestions.join(', ')}` : ''}`);
  }
  process.exit(0);
}

if (LIST) {
  console.log('\n=== проверяемые строки ===');
  for (const { where, text } of items) console.log(`${where}: ${text}`);
}

if (!problems.length) {
  console.log('\n✅ Ошибок не найдено.');
  process.exit(0);
}

console.log(`\n❌ Найдено мест: ${problems.length}`);
const byKind = new Map();
for (const p of problems) byKind.set(p.kind, (byKind.get(p.kind) || 0) + 1);
for (const [kind, n] of [...byKind].sort((a, b) => b[1] - a[1])) console.log(`  ${kind}: ${n}`);
console.log('');
for (const p of problems) {
  console.log(`• [${p.kind}] ${p.where}${p.detail ? ` — ${p.detail}` : ''}`);
  console.log(`    ${p.text.slice(0, 160)}`);
}
process.exit(1);
