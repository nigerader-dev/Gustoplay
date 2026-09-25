/**
 * Таксономия: жанры, теги, настроения, платформы, режимы.
 * Каждый id имеет подпись на русском (ru) и английском (en) + emoji для UI.
 * Данные каталога ссылаются ТОЛЬКО на id отсюда — это гарантирует консистентность
 * и позволяет делать SEO-лендинги по любому тегу/жанру.
 */

export const GENRES = {
  action:      { ru: 'Экшен',              en: 'Action',        icon: 'bolt' },
  shooter:     { ru: 'Шутер',              en: 'Shooter',       icon: 'crosshair' },
  rpg:         { ru: 'RPG',                en: 'RPG',           icon: 'die' },
  mmo:         { ru: 'MMO',                en: 'MMO',           icon: 'infinity' },
  strategy:    { ru: 'Стратегия',          en: 'Strategy',      icon: 'flag' },
  tactics:     { ru: 'Тактика',            en: 'Tactics',       icon: 'target' },
  survival:    { ru: 'Выживание',          en: 'Survival',      icon: 'tent' },
  horror:      { ru: 'Хоррор',             en: 'Horror',        icon: 'ghost' },
  adventure:   { ru: 'Приключение',        en: 'Adventure',     icon: 'compass' },
  puzzle:      { ru: 'Головоломка',        en: 'Puzzle',        icon: 'shapes' },
  platformer:  { ru: 'Платформер',         en: 'Platformer',    icon: 'layers' },
  racing:      { ru: 'Гонки',              en: 'Racing',        icon: 'gauge' },
  sandbox:     { ru: 'Песочница',          en: 'Sandbox',       icon: 'box' },
  roguelike:   { ru: 'Рогалик',            en: 'Roguelike',     icon: 'dice' },
  metroidvania:{ ru: 'Метроидвания',       en: 'Metroidvania',  icon: 'moon' },
  simulator:   { ru: 'Симулятор',          en: 'Simulator',     icon: 'sliders' },
  building:    { ru: 'Строительство',      en: 'Building',      icon: 'home' },
  card:        { ru: 'Карточные игры',     en: 'Card games',     icon: 'gem' },
  rhythm:      { ru: 'Ритм-игра',          en: 'Rhythm',        icon: 'music' },
  party:       { ru: 'Для вечеринки',      en: 'Party',         icon: 'sparkles' },
  fighting:    { ru: 'Файтинг',            en: 'Fighting',      icon: 'fire' },
  stealth:     { ru: 'Стелс',              en: 'Stealth',       icon: 'eye' },
  visual:      { ru: 'Визуальная новелла', en: 'Visual novel',  icon: 'book' },
  sports:      { ru: 'Спорт',              en: 'Sports',        icon: 'medal' },
  mystery:     { ru: 'Детектив',           en: 'Mystery',       icon: 'search' },
  moba:        { ru: 'MOBA',               en: 'MOBA',          icon: 'shield' },
  battle:      { ru: 'Королевская битва',  en: 'Battle royale', icon: 'clash' },
  idle:        { ru: 'Idle-игра',          en: 'Idle',          icon: 'hourglass' },
  boardgame:   { ru: 'Настольные игры',    en: 'Board games',   icon: 'grid' },
};

/**
 * Теги — «атомы вкуса». Из них собираются и вопросы квиза, и объяснения «почему подходит»,
 * и обучающиеся веса профиля.
 */
export const TAGS = {
  // --- атмосфера ---
  cozy:        { ru: 'Уютная',            en: 'Cozy',            group: 'vibe' },
  dark:        { ru: 'Мрачная',           en: 'Dark',            group: 'vibe' },
  epic:        { ru: 'Эпичная',           en: 'Epic',            group: 'vibe' },
  funny:       { ru: 'Весёлая',           en: 'Funny',           group: 'vibe' },
  sad:         { ru: 'Трогательная',      en: 'Emotional',       group: 'vibe' },
  tense:       { ru: 'Напряжённая',       en: 'Tense',           group: 'vibe' },
  relaxing:    { ru: 'Расслабляющая',     en: 'Relaxing',        group: 'vibe' },
  philosophical:{ ru: 'Со смыслом',       en: 'Thoughtful',      group: 'vibe' },
  wacky:       { ru: 'Отвязная',          en: 'Whacky',          group: 'vibe' },
  cute:        { ru: 'Милая',             en: 'Cute',            group: 'vibe' },

  // --- сеттинг ---
  fantasy:     { ru: 'Фэнтези',           en: 'Fantasy',         group: 'setting' },
  scifi:       { ru: 'Sci-fi',            en: 'Sci-fi',          group: 'setting' },
  cyberpunk:   { ru: 'Киберпанк',         en: 'Cyberpunk',       group: 'setting' },
  postapo:     { ru: 'Постапокалипсис',   en: 'Post-apocalyptic',group: 'setting' },
  space:       { ru: 'Космос',            en: 'Space',           group: 'setting' },
  historical:  { ru: 'Исторический',      en: 'Historical',      group: 'setting' },
  modern:      { ru: 'Современность',     en: 'Modern day',      group: 'setting' },
  zombie:      { ru: 'Зомби',             en: 'Zombies',         group: 'setting' },
  mythology:   { ru: 'Мифология',         en: 'Mythology',       group: 'setting' },
  underwater:  { ru: 'Подводный мир',     en: 'Underwater',      group: 'setting' },

  // --- структура и темп ---
  storyrich:   { ru: 'Сильный сюжет',     en: 'Story-rich',      group: 'flow' },
  openworld:   { ru: 'Открытый мир',      en: 'Open world',      group: 'flow' },
  linear:      { ru: 'Линейная',          en: 'Linear',          group: 'flow' },
  short:       { ru: 'Короткая (до 12 ч)',en: 'Short',           group: 'flow' },
  long:        { ru: 'Долгая (60+ ч)',    en: 'Long',            group: 'flow' },
  endless:     { ru: 'Бесконечная',       en: 'Endless',         group: 'flow' },
  replayable:  { ru: 'Высокая реиграбельность', en: 'Highly replayable', group: 'flow' },
  grind:       { ru: 'Гринд',             en: 'Grindy',          group: 'flow' },
  timegate:    { ru: 'Тайм-гейтинг (энергия/таймеры)', en: 'Time-gated', group: 'flow' },
  mtx:         { ru: 'Микроплатежи',      en: 'Microtransactions', group: 'flow' },
  cutscenes:   { ru: 'Много катсцен',     en: 'Lots of cutscenes', group: 'flow' },
  dialogheavy: { ru: 'Много диалогов',    en: 'Dialogue-heavy',  group: 'flow' },
  procedural:  { ru: 'Процедурная генерация', en: 'Procedural',  group: 'flow' },
  episodic:    { ru: 'Эпизодическая',     en: 'Episodic',        group: 'flow' },
  chapterbased:{ ru: 'По главам',         en: 'Chapter-based',   group: 'flow' },
  endlessloop: { ru: 'Петля «ещё один раз»', en: 'One more run', group: 'flow' },

  // --- новые сеттинги и механики ---
  pirates:     { ru: 'Пираты',             en: 'Pirates',         group: 'setting' },
  superhero:   { ru: 'Супергерои',         en: 'Superheroes',     group: 'setting' },
  vampires:    { ru: 'Вампиры',            en: 'Vampires',        group: 'setting' },
  dragons:     { ru: 'Драконы',            en: 'Dragons',         group: 'setting' },
  demons:      { ru: 'Демоны и ад',        en: 'Demons and hell', group: 'setting' },
  cthulhu:     { ru: 'Мифы Лавкрафта',     en: 'Lovecraftian', group: 'setting' },
  war:         { ru: 'Война',              en: 'War',             group: 'setting' },
  surreal:     { ru: 'Сюрреализм',         en: 'Surreal',         group: 'setting' },
  nostalgia:   { ru: 'Классика и ностальгия', en: 'Classic and nostalgic', group: 'vibe' },
  towerdefense:{ ru: 'Башенная оборона',   en: 'Tower defense',   group: 'mech' },
  heist:       { ru: 'Ограбления',         en: 'Heists',          group: 'mech' },
  espionage:   { ru: 'Шпионаж',            en: 'Espionage',       group: 'mech' },
  crime:       { ru: 'Криминал',           en: 'Crime',           group: 'mech' },
  timeloop:    { ru: 'Временная петля',    en: 'Time loop',       group: 'mech' },
  timetravel:  { ru: 'Путешествия во времени', en: 'Time travel', group: 'mech' },
  fishing:     { ru: 'Рыбалка',            en: 'Fishing',         group: 'mech' },
  cooking:     { ru: 'Готовка',            en: 'Cooking',         group: 'mech' },
  parkour:     { ru: 'Паркур',             en: 'Parkour',         group: 'mech' },
  arena:       { ru: 'Бои на арене',       en: 'Arena combat',    group: 'mech' },
  battleroyale:{ ru: 'Battle royale',      en: 'Battle royale',   group: 'mech' },
  extraction:  { ru: 'Экстракшн (выйти живым)', en: 'Extraction', group: 'mech' },
  clan:        { ru: 'Кланы и гильдии',    en: 'Clans and guilds',group: 'multi' },
  trading:     { ru: 'Торговля между игроками', en: 'Player trading', group: 'multi' },
  touch:       { ru: 'Удобно на телефоне', en: 'Great on mobile', group: 'tech' },
  offline:     { ru: 'Играется без интернета', en: 'Playable offline', group: 'tech' },

  // --- механики ---
  difficult:   { ru: 'Высокая сложность', en: 'Hard',            group: 'mech' },
  soulslike:   { ru: 'Соулслайк',         en: 'Souls-like',      group: 'mech' },
  permadeath:  { ru: 'Пермадет',          en: 'Permadeath',      group: 'mech' },
  easytolearn: { ru: 'Легко освоить',     en: 'Easy to learn',   group: 'mech' },
  hardcoresim: { ru: 'Хардкорный симулятор', en: 'Hardcore sim', group: 'mech' },
  basebuilding:{ ru: 'Строительство базы',en: 'Base building',   group: 'mech' },
  crafting:    { ru: 'Крафт',             en: 'Crafting',        group: 'mech' },
  loot:        { ru: 'Лут и билды',       en: 'Loot & builds',   group: 'mech' },
  deckbuilding:{ ru: 'Колодостроение',    en: 'Deckbuilding',    group: 'mech' },
  physics:     { ru: 'Песочница с физикой', en: 'Physics sandbox', group: 'mech' },
  puzzles:     { ru: 'Головоломки',       en: 'Puzzles',         group: 'mech' },
  exploration: { ru: 'Исследование',      en: 'Exploration',     group: 'mech' },
  bullethell:  { ru: 'Буллет-хелл',       en: 'Bullet hell',     group: 'mech' },
  squad:       { ru: 'Отряд и классы',     en: 'Squad & classes',group: 'mech' },
  bullettime:  { ru: 'Замедление времени',en: 'Bullet time',     group: 'mech' },
  management:  { ru: 'Экономика и менеджмент', en: 'Management',   group: 'mech' },
  automation:  { ru: 'Автоматизация',     en: 'Automation',      group: 'mech' },
  tbs:         { ru: 'Пошаговые бои',     en: 'Turn-based',      group: 'mech' },
  rts:         { ru: 'Стратегия в реальном времени', en: 'Real-time strategy', group: 'mech' },
  social:      { ru: 'Социальные механики',en: 'Social mechanics', group: 'mech' },
  driving:     { ru: 'Вождение',          en: 'Driving',         group: 'mech' },

  // --- кооп и мультиплеер ---
  coopfocused: { ru: 'Заточена под кооп', en: 'Co-op focused',   group: 'multi' },
  splitscreen: { ru: 'Сплитскрин/локально', en: 'Split-screen',  group: 'multi' },
  pvpfocused:  { ru: 'Заточена под PvP',  en: 'PvP focused',     group: 'multi' },
  voicechat:   { ru: 'Нужен голосовой чат', en: 'Voice chat needed', group: 'multi' },
  friendlier2: { ru: 'Специально для двоих', en: 'Made for two', group: 'multi' },
  lobby4:      { ru: 'Отлично на 3–4',    en: 'Great for 3–4',   group: 'multi' },
  lobbybig:    { ru: 'Для 5+ игроков',    en: 'Great for 5+',    group: 'multi' },
  mmosocial:   { ru: 'MMO-мир',              en: 'Persistent MMO world', group: 'multi' },
  crosplay:    { ru: 'Кроссплей',         en: 'Cross-play',      group: 'multi' },

  // --- стиль и подача ---
  cinematic:   { ru: 'Кинематографичная',  en: 'Cinematic',       group: 'vibe' },
  anime:       { ru: 'Аниме-стилистика',   en: 'Anime style',     group: 'vibe' },
  pixelart:    { ru: 'Пиксель-арт',        en: 'Pixel art',       group: 'vibe' },
  handdrawn:   { ru: 'Рисованная графика', en: 'Hand-drawn',      group: 'vibe' },
  realistic:   { ru: 'Реализм',            en: 'Realistic',       group: 'vibe' },
  colorful:    { ru: 'Яркая',              en: 'Colorful',        group: 'vibe' },
  soundtrack:  { ru: 'Отличная музыка',    en: 'Great soundtrack', group: 'vibe' },
  walkingsim:  { ru: 'Прогулочный симулятор', en: 'Walking sim',  group: 'vibe' },
  slow:        { ru: 'Размеренный темп',   en: 'Slow burn',       group: 'flow' },
  choices:     { ru: 'Выборы и последствия', en: 'Choices matter', group: 'flow' },

  // --- тематические системы ---
  jrpg:        { ru: 'Японская RPG',       en: 'JRPG',            group: 'mech' },
  mecha:       { ru: 'Мехи и роботы',      en: 'Mecha',           group: 'setting' },
  farming:     { ru: 'Фермерство',         en: 'Farming', group: 'mech' },
  colony:      { ru: 'Управление колонией', en: 'Colony sim',      group: 'mech' },
  grandstrategy:{ ru: 'Глобальная стратегия', en: 'Grand strategy', group: 'mech' },
  x4:          { ru: '4X-стратегия',         en: '4X',      group: 'mech' },
  tycoon:      { ru: 'Тайкун и бизнес',    en: 'Tycoon / business', group: 'mech' },
  gacha:       { ru: 'Гача',               en: 'Gacha',group: 'mech' },
  nonviolent:  { ru: 'Без насилия',        en: 'Non-violent',     group: 'tech' },
  family:      { ru: 'Можно играть с детьми', en: 'Family friendly', group: 'tech' },
  learn:       { ru: 'Развивающая',        en: 'Educational',  group: 'tech' },
  collect:     { ru: 'Коллекционирование',  en: 'Collecting',      group: 'mech' },

  // --- удобство и техника ---
  vr:          { ru: 'Есть VR-режим',     en: 'VR support',       group: 'tech' },
  controller:  { ru: 'Удобно на геймпаде',en: 'Gamepad friendly',group: 'tech' },
  steamdeck:   { ru: 'Отлично на Steam Deck', en: 'Great on Steam Deck', group: 'tech' },
  mods:        { ru: 'Моды и мастерская', en: 'Mod friendly',    group: 'tech' },
  lowsysreq:   { ru: 'Не требует мощного ПК', en: 'Low system requirements', group: 'tech' },
  photomode:   { ru: 'Красивая графика',  en: 'Gorgeous visuals',group: 'tech' },
  gpuheavy:    { ru: 'Требует мощного ПК',en: 'GPU heavy',       group: 'tech' },
};

/** Настроения — верхний уровень фильтра для квиза «что хочется сейчас?» */
export const MOODS = {
  relax:    { ru: 'Расслабиться', en: 'Relax', icon: 'waves' , hint: { ru: 'Спокойные игры без напряга', en: 'Calm games, no pressure' }},
  adrenaline:{ ru: 'Адреналин',      en: 'Adrenaline', icon: 'bolt' , hint: { ru: 'Скорость, взрывы, экшен без пауз', en: 'Speed, explosions, non-stop action' }},
  story:    { ru: 'Уйти в сюжет',         en: 'Get lost in a story', icon: 'book' , hint: { ru: 'Игры с героями, выборами и финалом — как хороший сериал', en: 'Heroes, choices and endings — like a good series' }},
  think:    { ru: 'Поломать голову', en: 'Tease your brain', icon: 'bulb' , hint: { ru: 'Тактика, загадки и непростые решения', en: 'Tactics, puzzles and tough decisions' }},
  laugh:    { ru: 'Посмеяться',   en: 'Have a laugh', icon: 'smile' , hint: { ru: 'Весёлые игры — одному или с друзьями', en: 'Funny games — solo or with friends' }},
  compete:  { ru: 'Соревноваться',  en: 'Compete', icon: 'trophy' , hint: { ru: 'Ранкеды, арены и победы над живыми соперниками', en: 'Ranks, arenas and wins over real opponents' }},
  create:   { ru: 'Строить и творить',       en: 'Build and create', icon: 'edit' , hint: { ru: 'Базы, города и фермы — создавать своё', en: 'Bases, cities and farms — make it yours' }},
  scare:    { ru: 'Испугаться',        en: 'Get scared', icon: 'ghost' , hint: { ru: 'Хорроры: скримеры, темнота и монстры', en: 'Horror: jumpscares, darkness and monsters' }},
  escape:   { ru: 'Сбежать от реальности',   en: 'Escape reality', icon: 'plane' , hint: { ru: 'Залипнуть в другом мире на весь вечер', en: 'Get lost in another world for the whole evening' }},
  progress: { ru: 'Качаться и расти',        en: 'Level up and grow', icon: 'chart' , hint: { ru: 'Уровни, лут и билды: видно, как становишься сильнее', en: 'Levels, loot and builds: you feel yourself getting stronger' }},
  explore:  { ru: 'Исследовать новый мир',   en: 'Explore a new world', icon: 'compass' , hint: { ru: 'Карта в тумане: открывать, находить, удивляться', en: 'Foggy map: uncover, find, be surprised' }},
  collect:  { ru: 'Собирать всё', en: 'Collect everything', icon: 'magnet' , hint: { ru: 'Ачивки, коллекции, прохождение на 100%', en: 'Achievements, collections, 100% completion' }},
  tense:    { ru: 'Понервничать',    en: 'Feel the tension', icon: 'alert' , hint: { ru: 'Триллеры и стелс: тревожно, но это не хоррор', en: 'Thrillers and stealth: tense, but not horror' }},
  learn:    { ru: 'Узнать что-то новое',     en: 'Learn something new', icon: 'cap' , hint: { ru: 'Игры, после которых знаешь больше', en: 'Games that leave you knowing more' }},
  feel:     { ru: 'Сильные эмоции',  en: 'Strong emotions', icon: 'heart' , hint: { ru: 'Истории, которые трогают и запоминаются надолго', en: 'Stories that move you and stay with you' }},
  nostalgia:{ ru: 'Ностальгия',    en: 'Nostalgia', icon: 'rewind' , hint: { ru: 'Классика и игры в духе старой школы', en: 'Classics and old-school-style games' }},
};

export const PLATFORMS = {
  pc:     { ru: 'ПК (Steam/Epic)', en: 'PC (Steam/Epic)', icon: 'monitor' },
  ps:     { ru: 'PlayStation',     en: 'PlayStation',   icon: 'brandPs' },
  xbox:   { ru: 'Xbox',            en: 'Xbox',            icon: 'brandXbox' },
  switch: { ru: 'Nintendo Switch', en: 'Nintendo Switch', icon: 'brandSwitch' },
  mobile: { ru: 'Телефон и планшет', en: 'Phone & tablet',          icon: 'smartphone' },
  cloud:  { ru: 'Облако (GeForce NOW)', en: 'Cloud gaming', icon: 'cloud' },
};

/** Режимы игры: сколько человек и как — ядро фильтра «во что играть с друзьями» */
export const MODES = {
  solo:        { ru: 'Для одного игрока',  en: 'Single-player', icon: 'user' },
  coopLocal:   { ru: 'Кооп за одним экраном', en: 'Local co-op', icon: 'users' },
  coopOnline:  { ru: 'Кооп по сети',       en: 'Online co-op',    icon: 'globe' },
  pvpLocal:    { ru: 'PvP за одним экраном', en: 'Local PvP',     icon: 'clash' },
  pvpOnline:   { ru: 'PvP по сети',        en: 'Online PvP',      icon: 'trophy' },
  mmo:         { ru: 'Постоянный онлайн-мир', en: 'MMO world',    icon: 'crowd' },
  async:       { ru: 'Пошаговый мультиплеер', en: 'Turn-based online', icon: 'mail' },
};

export const PRICE = {
  free:        { ru: 'Бесплатно', en: 'Free to play' },
  cheap:       { ru: 'До 1000 ₽', en: 'Under $12' },
  mid:         { ru: '1000–2500 ₽', en: '$12–30' },
  full:        { ru: '2500 ₽ и выше', en: '$30+' },
  subscription:{ ru: 'По подписке (Game Pass/PS Plus)', en: 'Subscription (Game Pass)' },
};

export const label = (dict, id, lang = 'ru') => dict[id]?.[lang] ?? id;
export const icon = (dict, id) => dict[id]?.icon ?? '';

/** Быстрый доступ к подписям списка id */
export const labels = (dict, ids = [], lang = 'ru') => ids.map((id) => label(dict, id, lang));
