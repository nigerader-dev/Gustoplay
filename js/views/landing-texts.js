/**
 * Уникальные тексты для SEO-лендингов таксономии (/genre/:id, /mode/:id, /mood/:id).
 * Ключ — «kind:id». Каждый лендинг жанра, режима и настроения имеет собственный
 * текст (2 абзаца) и мета-описание на ru и en — это защита от «тонкого» контента
 * и ответ на шаг 7 контент-плана (уникальный контент жанров/подборок).
 *
 * Правила:
 *  • никаких захардкоженных чисел (количества игр меняются — их подставляет каталог);
 *  • только проверяемые формулировки о жанрах и механиках, без оценок «лучшая игра»;
 *  • ru и en — самостоятельные тексты, не дословный перевод;
 *  • related — 2–3 ссылки на смежные лендинги (внутренняя перелинковка).
 *
 * Проверяется в tools/check-catalog.mjs: покрытие всех жанров/режимов/настроений,
 * уникальность текстов и длина мета-описаний.
 */

export const LANDING_TEXTS = {
  /* ------------------------------- жанры ------------------------------- */

  'genre:action': {
    meta: { ru: 'Экшен-игры в каталоге GustoPlay: динамичные игры для одного и компании — фильтры по платформе, цене и числу игроков.', en: 'Action games in the GustoPlay catalogue: dynamic titles for solo play and groups, with filters for platform, price and player count.' },
    body: {
      ru: [
        'Экшен — игры, где всё решает реакция: драки, перестрелки, погони и паркур идут потоком, а паузы между ними короткие. Внутри жанра очень разный темп — от медитативных слэшеров до хаоса на экране, поэтому фильтр сложности и темпа в карточке каждой игры помогает выбрать заранее.',
        'Фильтрами можно сузить выбор: платформа, число игроков за одним экраном, цена и длина сюжета. Если хочется конкретного ощущения — добавьте настроение сверху: «Адреналин» оставит только самое быстрое, «Расслабиться» — экшен без стресса.',
      ],
      en: [
        'Action is where reflexes decide everything: fights, shootouts, chases and parkour arrive in a steady stream with short pauses. The pace inside the genre varies enormously — from meditative slashers to on-screen chaos — so the difficulty and pace meters on every game card help you know what to expect.',
        'Use the filters to narrow things down: platform, couch player count, price and story length. For a specific feeling, add a mood at the top — “Adrenaline” keeps only the fastest, while “Relax” leaves action without the stress.',
      ],
    },
    related: ['mood:adrenaline', 'genre:platformer', 'mode:coopLocal'],
  },

  'genre:adventure': {
    meta: { ru: 'Приключенческие игры: истории, миры и исследование на любой вкус — от коротких сказок до эпопей на десятки часов.', en: 'Adventure games: stories, worlds and exploration for every taste, from short tales to epics lasting dozens of hours.' },
    body: {
      ru: [
        'Приключения — жанр про дорогу: игра ведёт через историю, а геймплей строится вокруг исследования, диалогов и загадок вместо чистого экшена. Это самая широкая полка каталога: тут и уютные прогулки, и детективы, и большие сюжетные кампании.',
        'Чтобы не потеряться, фильтруйте по длине сюжета и настроению: «Уйти в сюжет» оставит истории с выборами, «Сбежать от реальности» — игры, в которых легко провести весь вечер. Короткие приключения до 8 часов удобно искать фильтром времени.',
      ],
      en: [
        'Adventure is a genre about the road itself: the game walks you through a story built on exploration, dialogue and puzzles rather than pure action. It is the widest shelf in the catalogue — cozy walking sims sit next to detective mysteries and huge story campaigns.',
        'To keep your bearings, filter by story length and mood: “Get lost in a story” keeps choice-driven histories, while “Escape reality” gathers games that swallow whole evenings. Adventures under eight hours are one click away in the time filter.',
      ],
    },
    related: ['mood:story', 'mood:explore', 'genre:mystery'],
  },

  'genre:battle': {
    meta: { ru: 'Королевские битвы: десятки игроков на одной карте, сжимающаяся зона и один победитель — выбор по платформе и числу игроков в отряде.', en: 'Battle royale games: dozens of players, a shrinking zone and a single winner — pick by platform and squad size.' },
    body: {
      ru: [
        'Королевская битва — формат, где на карту выбрасываются десятки игроков, зона сжимается, а побеждает один отряд. Ключевое удовольствие — риск и поздние стадии партии, когда каждая встреча может стать последней.',
        'В выборе важнее число игроков в отряде и платформа — фильтры каталога показывают и то и другое. Для вечеринки с друзьями отметьте кооп по сети и решите, кто в команде будет снайпером.',
      ],
      en: [
        'Battle royale drops dozens of players onto one map, shrinks the zone and crowns a single squad. The core pleasure is risk and the late game, where every encounter might be your last.',
        'Squad size and platform matter most when choosing — the catalogue filters show both. For a games night, tick online co-op and figure out who on the team is the sniper.',
      ],
    },
    related: ['mode:pvpOnline', 'genre:shooter', 'mood:compete'],
  },

  'genre:boardgame': {
    meta: { ru: 'Цифровые настольные игры: точные адаптации карточных и настольных хитов — партии с друзьями онлайн и за одним столом.', en: 'Digital board games: faithful adaptations of card and tabletop hits, playable online or around one screen.' },
    body: {
      ru: [
        'Цифровые настольные — это точные адаптации известных карточных и настольных игр: правила считает компьютер, никто не теряет кубик, а партия начинается за минуту. Многие адаптации включают кампании против ИИ и туториал, который объясняет правила лучше любого правила-буклета.',
        'Главный фильтр здесь — число игроков и режим: за одним экраном или по сети. Если ищете что-то спокойное на двоих — добавьте настроение «Расслабиться», для азартных партий — «Соревноваться».',
      ],
      en: [
        'Digital board games are faithful adaptations of well-known card and tabletop titles: the computer enforces the rules, nobody loses a die, and a match starts within a minute. Many include campaigns against AI and tutorials that explain rules better than any rulebook.',
        'The filters that matter most here are player count and mode: one screen or online. Add the “Relax” mood for calm two-player evenings, or “Compete” when the table wants blood.',
      ],
    },
    related: ['genre:card', 'mode:coopLocal', 'mood:think'],
  },

  'genre:building': {
    meta: { ru: 'Строительство и градостроение: города, замки и фабрики — игры, где главная радость в том, что построил сам.', en: 'Building games: cities, castles and factories — games whose main joy is what you built yourself.' },
    body: {
      ru: [
        'Строительные игры — про созидание: вы поднимаете города, замки или производственные линии, и результат остаётся стоять. Часть жанра — спокойное творчество без проигрыша, часть — экономическая задача, где каждый дом должен окупиться.',
        'Если хочется без давления — фильтруйте по настроению «Строить и творить» и «Расслабиться». Тем, кому нужен вызов, подойдут градостроительные стратегии с менеджментом: их легко узнать по тегу «Экономика и менеджмент».',
      ],
      en: [
        'Building games are about creation: you raise cities, castles or production lines, and the result stays standing. Part of the genre is calm sandbox creativity with no fail state; the rest is an economic puzzle where every house must pay for itself.',
        'For pressure-free sessions, filter by the “Build and create” and “Relax” moods. If you want a challenge, city-builders with real management are easy to spot by the “Management” tag.',
      ],
    },
    related: ['mood:create', 'genre:simulator', 'tag:basebuilding'],
  },

  'genre:card': {
    meta: { ru: 'Карточные игры: колодостроение, дуэли и адаптации настольных хитов — от коротких партий до рогаликов на сотни часов.', en: 'Card games: deckbuilding, duels and tabletop adaptations, from quick matches to roguelikes lasting hundreds of hours.' },
    body: {
      ru: [
        'Карточные игры в цифре — это и дуэли живых игроков, и одиночные рогалики, где колода собирается на ходу, и бережные адаптации настольных хитов. Общая механика — синергия: карты усиливают друг друга, и красивая комбинация важнее любой отдельной карты.',
        'Выбирайте по формату: короткая партия на вечер — фильтр длительности «≤ 20 ч», долгий гринд — тег «Гринд». Любителям тактики без сетевого стресса подойдут одиночные игры с построением колоды — такие есть и в коопе.',
      ],
      en: [
        'Digital card games span live duels, solo roguelikes where the deck is built on the fly, and loving tabletop adaptations. The shared mechanic is synergy: cards empower each other, and a beautiful combo beats any single card.',
        'Pick by format: a short evening match means the “under 20 hours” time filter, while long-term grinding means the “Grindy” tag. Players who want tactics without online stress will find solo games about building a deck — some of them even in co-op.',
      ],
    },
    related: ['tag:deckbuilding', 'genre:roguelike', 'genre:boardgame'],
  },

  'genre:fighting': {
    meta: { ru: 'Файтинги: дуэли один на один, комбо и локальный мультиплеер — от классики аркад до современных кроссоверов.', en: 'Fighting games: one-on-one duels, combos and local multiplayer, from arcade classics to modern crossovers.' },
    body: {
      ru: [
        'Файтинг — жанр дуэлей: два бойца, полоска здоровья и честная схватка, где выигрывает тот, кто лучше читает соперника. Порог входа разный: некоторые игры прощают ошибки новичкам, другие требуют месяцев практики — уровень сложности указан в каждой карточке.',
        'Почти все файтинги лучше всего играются за одним экраном: включите режим «PvP за одним экраном» и зовите друга. Для одиночной практики у большинства есть обучение и аркадный режим с сюжетом.',
      ],
      en: [
        'Fighting games are duels: two fighters, a health bar and a fair fight won by whoever reads the opponent better. The entry barrier varies — some games forgive beginners, others demand months of practice; every card here shows its difficulty level.',
        'Nearly all fighters shine on one screen: switch on “Local PvP” and call a friend over. For solo practice, most titles include training modes and story-driven arcade ladders.',
      ],
    },
    related: ['mode:pvpLocal', 'mood:compete', 'genre:party'],
  },

  'genre:horror': {
    meta: { ru: 'Хорроры: страх, атмосфера и выживание — от тихой тревоги до скримеров, с честными пометками о тоне каждой игры.', en: 'Horror games: fear, atmosphere and survival, from quiet dread to jumpscares, with honest notes on each game’s tone.' },
    body: {
      ru: [
        'Хоррор строится на беспомощности и звуке: вы не знаете, что за дверью, и обычно не можете это остановить. Внутри жанра большой разброс — психологические истории без монстров, выживание с ограниченными ресурсами и честные скримерные аттракционы.',
        'Настроение «Испугаться» собирает их вместе, а теги в карточке подскажут тон: «Мрачная» — про атмосферу, «Высокая сложность» — про то, что можно сопротивляться. Если страшно одному — часть хорроров поддерживает кооп: вдвоём не так страшно, но так же весело.',
      ],
      en: [
        'Horror is built on helplessness and sound: you never know what is behind the door, and usually you cannot stop it. The range inside the genre is wide — psychological stories without monsters, resource-scarce survival, and honest jumpscare rides.',
        'The “Get scared” mood gathers them all, while tags on each card hint at tone: “Dark” means atmosphere, “Hard” means you can fight back. If solo is too much, some horrors support co-op — less scary with a friend, just as fun.',
      ],
    },
    related: ['mood:scare', 'genre:survival', 'mood:tense'],
  },

  'genre:idle': {
    meta: { ru: 'Idle-игры: прогресс, который идёт сам — цифры растут, пока вы заняты своими делами, а вечером вас ждёт апгрейд.', en: 'Idle games: progress that runs itself — numbers grow while you are busy, and an upgrade waits for you in the evening.' },
    body: {
      ru: [
        'Idle-игры устроены как тихий двигатель: процесс продолжается без вас, а возвращение игрока ускоряет его. Классический цикл — купить улучшение, которое покупает следующие улучшения, и в какой-то момент обнаружить, что прошли уже сутки.',
        'Жанр честно предупреждает о своих ловушках: тайм-гейтинг и микроплатежи отмечены тегами в карточках. Похожие игры с видимым ростом собирает настроение «Качаться и расти».',
      ],
      en: [
        'Idle games run like a quiet engine: progress continues without you, and your return accelerates it. The classic loop is buying an upgrade that buys the next upgrades — until you suddenly notice a whole day has passed.',
        'The genre warns you honestly about its traps: time-gating and microtransactions are marked with tags on the cards. The “Level up and grow” mood gathers similar games with visible growth.',
      ],
    },
    related: ['mood:progress', 'tag:timegate', 'tag:grind'],
  },

  'genre:metroidvania': {
    meta: { ru: 'Метроидвании: связанные миры, запертые двери и способности, которые открывают путь назад — карта, которую изучаешь.', en: 'Metroidvanias: interconnected worlds, locked doors and abilities that reopen old paths — maps worth studying.' },
    body: {
      ru: [
        'Метроидвания — это карта-головоломка: мир связан в единое целое, часть дверей заперта, а новая способность внезапно делает доступными коридоры, которые вы видели час назад. Жанр требует любви к исследованию и картографии — и щедро платит находками.',
        'Выбирайте по сложности: часть игр жанра нарочито требовательна, и это честно отмечено в карточке. Длина сюжета бывает разной — от компактных приключений до долгих экспедиций, время прохождения указано в карточке.',
      ],
      en: [
        'A metroidvania is a puzzle of a map: the world is one connected whole, some doors are locked, and a new ability suddenly reopens corridors you passed an hour ago. The genre asks for a love of exploration and cartography — and pays generously in discoveries.',
        'Choose by difficulty: some entries are deliberately demanding, and the cards say so honestly. Story length varies from compact adventures to long expeditions — the playtime on each card says which.',
      ],
    },
    related: ['genre:platformer', 'tag:exploration', 'mood:explore'],
  },

  'genre:moba': {
    meta: { ru: 'MOBA: командные бои 5×5 на одной карте, роли героев и матчи, где решает слаженность, а не рефлексы одного игрока.', en: 'MOBA games: five-on-five battles on one map, hero roles and matches decided by teamwork rather than one player’s reflexes.' },
    body: {
      ru: [
        'MOBA — командный жанр: каждый игрок ведёт героя с ролью, а партия — это серия мелких стычек, торгов и решений, которые складываются в победу или поражение к финалу. Обучение занимает время: это жанр «выучить за сотню часов».',
        'Крупные MOBA обычно бесплатны, поэтому фильтруйте по платформе и PvP по сети. Если хочется той же тактики, но короче и спокойнее, посмотрите тактические жанры — партия там короче в разы.',
      ],
      en: [
        'MOBA is a team genre: every player pilots a hero with a role, and a match is a chain of small skirmishes, trades and decisions that add up to a win or a loss. Learning takes time — this is a “hundred hours to learn” genre.',
        'Major MOBAs are usually free-to-play, so filter by platform and online PvP instead. For similar tactics in shorter, calmer matches, try the tactics genre — its rounds are several times shorter.',
      ],
    },
    related: ['mode:pvpOnline', 'genre:tactics', 'mood:compete'],
  },

  'genre:mmo': {
    meta: { ru: 'MMO: постоянные миры с тысячами игроков — гильдии, рейды и экономика, которая живёт, пока вы спите.', en: 'MMO games: persistent worlds with thousands of players — guilds, raids and an economy that lives while you sleep.' },
    body: {
      ru: [
        'MMO — это миры, которые не выключаются: города населены живыми людьми, экономика реагирует на действия игроков, а контент рассчитан на месяцы. Большинство игр жанра — долгие проекты с подпиской или бесплатным входом и покупками внутри.',
        'Здесь важен социальный слой: тег «Кланы и гильдии» отметит игры, где смысл — играть с постоянной группой. Если хочется большой мир без обязательств, смотрите одиночные приключения с открытым миром.',
      ],
      en: [
        'MMOs are worlds that never switch off: cities are populated by real people, the economy reacts to players, and the content is designed for months. Most games in the genre are long-term projects with subscriptions or free entry and in-game purchases.',
        'The social layer matters most here: the “Clans and guilds” tag marks games built around a steady group. If you want a big world without the commitment, look at open-world solo adventures instead.',
      ],
    },
    related: ['mode:mmo', 'tag:clan', 'tag:grind'],
  },

  'genre:mystery': {
    meta: { ru: 'Детективы: улики, допросы и версии — игры, где главное оружие не пистолет, а блокнот и внимание.', en: 'Mystery games: clues, interrogations and theories — games where your main weapon is a notebook, not a gun.' },
    body: {
      ru: [
        'Детектив — жанр про восстановление картины: вы собираете улики, сопоставляете показания и делаете выводы, которые игра либо подтверждает, либо честно рушит. Лучшие представители жанра позволяют ошибиться и дойти до неверного финала.',
        'Такие игры почти всегда одиночные и сюжетные — фильтруйте по настроению «Уйти в сюжет». Время прохождения обычно умеренное: детектив редко тянут искусственно, а фильтр длительности подберёт формат на вечер.',
      ],
      en: [
        'Mystery is a genre of reconstruction: you gather evidence, cross-reference testimony and draw conclusions the game either confirms or honestly demolishes. The best entries let you be wrong and reach an incorrect ending.',
        'These games are almost always solo and story-driven — filter by the “Get lost in a story” mood. Playtime is usually moderate: mysteries are rarely stretched artificially, and the length filter picks an evening-sized case.',
      ],
    },
    related: ['mood:think', 'mood:story', 'genre:adventure'],
  },

  'genre:party': {
    meta: { ru: 'Игры для вечеринки: 4 и больше человек, один экран и правила, которые объясняются за минуту — вечер готов.', en: 'Party games: four or more players, one screen and rules explained in a minute — the evening is ready.' },
    body: {
      ru: [
        'Вечериночные игры созданы для компании: правила объясняются за минуту, партия длится считанные минуты, а проигравший смеётся громче победителя. Это лучший жанр для встречи, где играют не только «геймеры».',
        'Ключевой фильтр — число игроков: уточните, сколько вас, и каталог оставит только подходящее. Почти всё здесь — игры за одним экраном; у сетевых игр с голосовым чатом есть отдельная пометка в тегах.',
      ],
      en: [
        'Party games are made for groups: rules are explained in a minute, rounds last minutes, and the loser laughs loudest. This is the best genre for a hangout where not everyone calls themselves a gamer.',
        'The key filter is player count: set how many you are and the catalogue keeps only what fits. Almost everything here is played on one screen; online games needing voice chat carry their own tag.',
      ],
    },
    related: ['mode:coopLocal', 'mode:pvpLocal', 'mood:laugh'],
  },

  'genre:platformer': {
    meta: { ru: 'Платформеры: прыжки, тайминг и точность — от уютных прогулок до хардкорных челленджей, в одиночку и на двоих.', en: 'Platformers: jumps, timing and precision, from cozy strolls to hardcore challenges, solo or for two.' },
    body: {
      ru: [
        'Платформер — жанр про прыжок: дистанция, тайминг и скорость реакции. Здесь соседствуют детские прогулки без угрозы смерти и игры, где один неверный шаг отбрасывает к началу уровня — шкала сложности в карточке покажет, что вас ждёт.',
        'Многие современные платформеры — кооперативные: фильтр «Кооп за одним экраном» оставит игры, где напарник может помогать, мешать и падать вместе с вами. Для соревновательного духа есть и PvP-режимы.',
      ],
      en: [
        'A platformer is a genre about the jump: distance, timing and reaction speed. Cozy strolls without a threat of death live here next to games where one wrong step sends you back to the start of the level — the difficulty meter on each card says which is which.',
        'Many modern platformers are cooperative: the “Local co-op” filter keeps games where a partner can help, hinder and fall together with you. For competitive spirits there are PvP modes too.',
      ],
    },
    related: ['mode:coopLocal', 'genre:metroidvania', 'mood:adrenaline'],
  },

  'genre:puzzle': {
    meta: { ru: 'Головоломки: логика, механики и «эврика» — от пятиминутных загадок до игр, которые не отпускают весь вечер.', en: 'Puzzle games: logic, mechanics and the eureka moment, from five-minute riddles to games that hold you all evening.' },
    body: {
      ru: [
        'Головоломка — жанр чистого мышления: игра даёт правила и уровень, а удовольствие — в моменте «понял, как решается». Поджанры очень разные: расслабляющие пазлы, кооперативные головоломки на двоих и логические игры с сюжетом.',
        'Для вечера вдвоём отмечайте «Кооп за одним экраном»: совместные головоломки — один из самых честных жанров для двоих, потому что решать нужно вслух. Если хочется спокойно и одному — добавьте «Расслабиться».',
      ],
      en: [
        'A puzzle game is pure thinking: the game gives you rules and a level, and the pleasure is the “now I see it” moment. Subgenres vary widely: meditative puzzles, two-player co-op puzzles and story-driven logic games.',
        'For an evening for two, tick “Local co-op”: cooperative puzzles are one of the most honest genres for pairs, because solving has to happen out loud. For calm solo play, add the “Relax” mood.',
      ],
    },
    related: ['mode:coopLocal', 'mood:think', 'mood:relax'],
  },

  'genre:racing': {
    meta: { ru: 'Гонки: аркады, симуляторы и сплит-скрин — от серьёзной физики до весёлых заездов на диване.', en: 'Racing games: arcades, simulators and split-screen, from serious physics to silly couch races.' },
    body: {
      ru: [
        'Гонки делятся на два больших мира: аркады, где дрифт прощает всё, и симуляторы, где шины честно остывают. Внутри — поджанры на любой вкус: картинг, ралли, футуристические гонки и просто весёлые заезды на четверых.',
        'Для компании включайте «PvP за одним экраном» — сплит-скрин до сих пор главное удовольствие жанра. Симуляторы ищите по тегу «Хардкорный симулятор», доступные аркады — по «Легко освоить».',
      ],
      en: [
        'Racing splits into two big worlds: arcades where drifting forgives everything, and simulators where tyres honestly go cold. Inside there are subgenres for every taste — karting, rally, futuristic racers and plain fun four-player rides.',
        'For group play, switch on “Local PvP” — split-screen remains the genre’s greatest pleasure. Look for the “Hardcore sim” tag for simulators and “Easy to learn” for approachable arcades.',
      ],
    },
    related: ['mode:pvpLocal', 'tag:driving', 'mood:adrenaline'],
  },

  'genre:rhythm': {
    meta: { ru: 'Ритм-игры: музыка как механика — нажимать в такт, попадать в ноты и двигаться вместе с саундтреком.', en: 'Rhythm games: music as the mechanic — hit on beat, land the notes and move with the soundtrack.' },
    body: {
      ru: [
        'Ритм-игры превращают трек в уровень: ноты летят, а ваша задача — нажимать точно в такт. Порог входа низкий, потолок мастерства — очень высокий, поэтому жанр отлично подходит и для пяти минут, и для сотни часов тренировок.',
        'Многие ритм-игры — про музыку конкретных исполнителей, и это часто видно в описании. Для игры без геймпада проверьте платформу: часть жанра живёт на телефонах и с клавиатурой.',
      ],
      en: [
        'Rhythm games turn a track into a level: notes fly in, and your job is to press exactly on beat. The entry bar is low and the skill ceiling is very high, so the genre suits both five minutes and a hundred hours of practice.',
        'Many rhythm games are built around particular artists, which the descriptions usually make clear. To play without a gamepad, check the platform: part of the genre lives on phones and keyboards.',
      ],
    },
    related: ['tag:soundtrack', 'mood:adrenaline', 'platform:mobile'],
  },

  'genre:rpg': {
    meta: { ru: 'RPG: персонажи, билды и выборы с последствиями — от коротких инди-историй до эпопей на сотни часов.', en: 'RPG games: characters, builds and choices with consequences, from short indie stories to hundred-hour epics.' },
    body: {
      ru: [
        'Ролевые игры — про рост: вы ведёте персонажа или отряд, прокачиваете способности и принимаете решения, которые меняют историю. Внутри жанра — от изометрической классики по настольным правилам до больших открытых миров.',
        'Два фильтра помогают сразу: длина (короткая RPG на вечер или эпопея на 100 часов) и «Много диалогов» — для тех, кто приходит за историей. Кооперативные RPG отмечены режимом «Кооп по сети»: сюжетные кампании можно проходить вдвоём.',
      ],
      en: [
        'Role-playing games are about growth: you steer a character or a party, develop abilities and make decisions that reshape the story. The genre spans isometric classics built on tabletop rules and huge open worlds alike.',
        'Two filters help instantly: length (an evening RPG or a hundred-hour epic) and “Dialogue-heavy” for those who come for the story. Co-op RPGs carry the “Online co-op” mode — story campaigns you can finish together.',
      ],
    },
    related: ['mood:story', 'mood:progress', 'tag:choices'],
  },

  'genre:roguelike': {
    meta: { ru: 'Рогалики: случайные забеги, перманентная смерть и «ещё один раз» — жанр, из которого не выходят по расписанию.', en: 'Roguelikes: randomised runs, permadeath and “one more try” — a genre nobody exits on schedule.' },
    body: {
      ru: [
        'Рогалик — жанр коротких попыток: уровень генерируется заново, смерть обнуляет забег, а между ними открываются новые предметы и персонажи, делающие следующую попытку другой. Старт за минуту — и та самая петля «ещё один раз».',
        'Разброс по сложности большой, поэтому смотрите на шкалу в карточке. Если хочется совместных страданий — в жанре много кооперативных игр по сети и за одним экраном; отмечено режимами.',
      ],
      en: [
        'A roguelike is a genre of short attempts: the level regenerates, death resets the run, and in between you unlock items and characters that make the next attempt feel different. A run starts in a minute — and then comes the loop.',
        'Difficulty varies a lot, so check the meter on the card. For shared suffering, the genre has plenty of co-op titles online and on one couch; the modes mark which is which.',
      ],
    },
    related: ['tag:permadeath', 'tag:endlessloop', 'mood:adrenaline'],
  },

  'genre:sandbox': {
    meta: { ru: 'Песочницы: мир без сценария — строй, ломай и изобретай свои правила в играх с физикой и без границ.', en: 'Sandbox games: a world without a script — build, break and invent your own rules in physics-driven, boundless games.' },
    body: {
      ru: [
        'Песочница — жанр без обязательств: игра даёт мир и инструменты, а цели вы придумываете сами. Это территория строителей, изобретателей и тех, кто хочет просто повозиться с физикой.',
        'Многие песочницы — кооперативные, и в компании жанр раскрывается вдвое: совместное строительство и общий хаос. Отметьте нужный режим и число игроков, а для тишины добавьте «Расслабиться».',
      ],
      en: [
        'A sandbox is a genre without obligations: the game hands you a world and tools, and the goals are yours to invent. This is the land of builders, tinkerers and anyone who just wants to poke at physics.',
        'Many sandboxes are cooperative, and the genre doubles in company: shared construction and shared chaos. Tick the mode and player count you need; for quiet sessions add the “Relax” mood.',
      ],
    },
    related: ['mood:create', 'genre:building', 'tag:physics'],
  },

  'genre:shooter': {
    meta: { ru: 'Шутеры: от сюжетных кампаний до командных сетевых боёв — киберпанк, война, космос и зомби на любой вкус.', en: 'Shooters: from story campaigns to team-based online battles — cyberpunk, war, space and zombies for every taste.' },
    body: {
      ru: [
        'Шутер — жанр стрельбы от первого или третьего лица: прицел, отдача и позиция решают больше, чем беготня. Половина жанра — одиночные кампании с сюжетом, половина — командные сетевые бои, где важна роль в отряде.',
        'Разделите выбор режимом: «Для одного игрока» оставит кампании, «PvP по сети» — соревновательные карты. Для игры с друзьями против ботов есть кооперативные шутеры — отмечены «Кооп по сети».',
      ],
      en: [
        'A shooter is a genre of first- or third-person gunplay: aim, recoil and positioning matter more than sprinting. Half the genre is solo story campaigns, the other half is team-based online battles where your squad role counts.',
        'Split the choice by mode: “Single-player” keeps the campaigns, “Online PvP” the competitive maps. For playing with friends against bots there are co-op shooters — marked with “Online co-op”.',
      ],
    },
    related: ['mood:adrenaline', 'mode:pvpOnline', 'mode:coopOnline'],
  },

  'genre:simulator': {
    meta: { ru: 'Симуляторы: фермы, поезда, грузовики и самолёты — честные модели мира для тех, кто любит разбираться.', en: 'Simulators: farms, trains, trucks and planes — honest models of the world for those who like to understand things.' },
    body: {
      ru: [
        'Симулятор честно моделирует часть мира: физику машины, экономику фермы или расписание железной дороги. Часть жанра — медитативная работа без спешки, часть — хардкорные модели, где перед стартом читают мануал.',
        'Тег «Хардкорный симулятор» отделяет серьёзные модели от доступных, а «Расслабиться» собирает спокойные. Обратите внимание на поддержку модов: у больших симуляторов сообщество расширяет игру годами.',
      ],
      en: [
        'A simulator models a slice of the world honestly: a car’s physics, a farm’s economy or a railway’s timetable. Part of the genre is meditative work without hurry, part is hardcore modelling where you read the manual before starting.',
        'The “Hardcore sim” tag separates serious models from approachable ones, while “Relax” gathers the calm ones. Check mod support: big simulators have communities expanding them for years.',
      ],
    },
    related: ['tag:hardcoresim', 'mood:relax', 'tag:mods'],
  },

  'genre:sports': {
    meta: { ru: 'Спортивные игры: футбол, хоккей, баскетбол и скейтбординг — сезоны, карьеры и матчи на диване.', en: 'Sports games: football, hockey, basketball and skateboarding — seasons, careers and couch matches.' },
    body: {
      ru: [
        'Спортивные игры делятся на ежегодные симуляторы лицензионных лиг и аркады, где правила — повод для веселья. Симуляторы живут сезонами и карьерами, аркады — партией на десять минут и смехом.',
        'Матч на диване — главное удовольствие жанра: включите «PvP за одним экраном». Микроплатежи и тайм-гейтинг в карточках честно отмечены тегами.',
      ],
      en: [
        'Sports games split into annual licensed simulators and arcades where the rules are an excuse for fun. Simulators live on seasons and career modes; arcades live on ten-minute matches and laughter.',
        'A couch match is the genre’s core pleasure: switch on “Local PvP”. Microtransactions and time-gating are honestly marked with tags on the cards.',
      ],
    },
    related: ['mode:pvpLocal', 'mood:compete', 'tag:mtx'],
  },

  'genre:stealth': {
    meta: { ru: 'Стелс: тени, маршруты охраны и терпение — игры, где лучший бой тот, которого не было.', en: 'Stealth games: shadows, patrol routes and patience — games where the best fight is the one that never happens.' },
    body: {
      ru: [
        'Стелс — жанр незаметности: вы изучаете маршруты, ждёте в тени и проскальзываете мимо. Напряжение здесь другое, чем в экшене, — медленное, когда один неверный шаг значит перезапуск эпизода.',
        'Стелсы почти всегда одиночные и сюжетные, поэтому настроение «Понервничать» подходит лучше всего. В некоторых играх жанра можно пройти всю кампанию, не тронув никого — это обычно отмечено в особенностях.',
      ],
      en: [
        'Stealth is the genre of staying unseen: you study patrol routes, wait in shadow and slip past. The tension is different from action — slow, where one wrong step means restarting the episode.',
        'Stealth games are almost always solo and story-driven, so the “Feel the tension” mood fits best. In some of them you can finish the whole campaign touching no one — usually noted among the features.',
      ],
    },
    related: ['mood:tense', 'mood:think', 'genre:action'],
  },

  'genre:strategy': {
    meta: { ru: 'Стратегии: империи, армии и долгие планы — пошаговые классики, RTS и глобальные песочницы истории.', en: 'Strategy games: empires, armies and long plans — turn-based classics, RTS and grand historical sandboxes.' },
    body: {
      ru: [
        'Стратегия — жанр больших решений: вы распоряжаетесь экономикой, армией и наукой, а партия — это история, которую вы написали сами. Пошаговые стратегии дают время подумать, стратегии в реальном времени — темп и давление.',
        'Начните с поджанра: «4X» — про развитие цивилизации, «Глобальная стратегия» — про века истории, «Стратегия в реальном времени» — про скорость. Часть стратегий поддерживает хотсит и кооп против ИИ — отмечено режимами.',
      ],
      en: [
        'Strategy is a genre of big decisions: you command the economy, the army and science, and a match is a story you wrote yourself. Turn-based games give you time to think; real-time ones give tempo and pressure.',
        'Start with a subgenre: “4X” is about growing a civilisation, “Grand strategy” about centuries of history, “Real-time strategy” about speed. Some strategy games support hot-seat and co-op versus AI — the modes say so.',
      ],
    },
    related: ['tag:tbs', 'tag:x4', 'mode:coopLocal'],
  },

  'genre:survival': {
    meta: { ru: 'Выживание: голод, холод и крафт — миры, где сначала нужно не победить, а дожить до утра.', en: 'Survival games: hunger, cold and crafting — worlds where the first goal is not winning but living until morning.' },
    body: {
      ru: [
        'Выживание начинается с базовых потребностей: еда, тепло, укрытие. Игра не спешит вас убивать — она медленно проверяет, надолго ли вы спланировали. Крафт и строительство здесь не украшение, а способ дожить.',
        'Выживание бывает одиночным и кооперативным — совместная база меняет жанр до неузнаваемости, поэтому проверьте режимы. Про суровые миры без зомби и с зомби честно говорят теги карточек.',
      ],
      en: [
        'Survival starts with basic needs: food, warmth, shelter. The game is in no hurry to kill you — it slowly checks how far ahead you planned. Crafting and building are not decoration here but the way to survive.',
        'Survival comes solo and co-op — a shared base changes the genre beyond recognition, so check the modes. Tags on the cards say honestly whether the harsh world has zombies or not.',
      ],
    },
    related: ['tag:crafting', 'tag:basebuilding', 'mode:coopOnline'],
  },

  'genre:tactics': {
    meta: { ru: 'Тактика: отряды, укрытия и ходы — жанр шахматного напряжения, где одна позиция решает бой.', en: 'Tactics games: squads, cover and turns — a genre of chess-like tension where one position decides the fight.' },
    body: {
      ru: [
        'Тактика — жанр отдельного боя: вы ведёте отряд по клеткам или укрытиям, и каждая позиция стоит жизни. Это шахматное напряжение с персонажами, которых жалко терять.',
        'Тактические игры часто входят в состав RPG и стратегий — смотрите жанры в карточке. Кооперативная тактика на двоих за одним экраном в каталоге есть — отмечено режимом.',
      ],
      en: [
        'Tactics is a genre of the single battle: you lead a squad across tiles or cover, and every position costs a life. It is chess-grade tension with characters you hate to lose.',
        'Tactical games often ship inside RPGs and strategies — check the card’s genres. Two-player tactical co-op on one screen is here too; the mode marks it.',
      ],
    },
    related: ['tag:tbs', 'genre:strategy', 'mood:think'],
  },

  'genre:visual': {
    meta: { ru: 'Визуальные новеллы: текст, выборы и ветвящиеся истории — интерактивная литература на вечер.', en: 'Visual novels: text, choices and branching stories — interactive literature for an evening.' },
    body: {
      ru: [
        'Визуальная новелла — это книга с музыкой и выборами: вы читаете, в важных местах решаете за героя, и история ветвится. Обычно такие игры нетребовательны к компьютеру.',
        'Новеллы почти всегда сюжетные и умеренно длинные, фильтруйте по «Много диалогов». Для первого знакомства подойдут короткие истории: они честно проходят за вечер.',
      ],
      en: [
        'A visual novel is a book with music and choices: you read, decide for the hero at key moments, and the story branches. These games usually ask little of your hardware.',
        'Novels are almost always story-driven and moderately long; filter by “Dialogue-heavy”. Short stories make a good first acquaintance — they honestly fit into one evening.',
      ],
    },
    related: ['mood:story', 'mood:feel', 'tag:lowsysreq'],
  },

  /* ------------------------------- режимы ------------------------------- */

  'mode:solo': {
    meta: { ru: 'Игры для одного: сюжетные кампании и сольные вызовы — каталог с фильтрами по длине, сложности и настроению.', en: 'Single-player games: story campaigns and solo challenges, with filters for length, difficulty and mood.' },
    body: {
      ru: [
        'Одиночные игры — это история, темп и тишина: никто не ждёт, пока вы разберётесь, и никто не портит катсцену. Подавляющая часть больших сюжетных игр создана именно для одного игрока.',
        'Каталог умеет сузить выбор за секунды: длина сюжета, сложность, настроение и платформа. Если не знаете, с чего начать, — квиз на главной предложит несколько вариантов под ваше сегодняшнее настроение.',
      ],
      en: [
        'Single-player games are about story, pacing and quiet: nobody rushes you and nobody spoils the cutscene. The majority of big story games are built for exactly one player.',
        'The catalogue narrows the choice in seconds: story length, difficulty, mood and platform. If you don’t know where to start, the quiz on the home page suggests options for tonight’s mood.',
      ],
    },
    related: ['mood:story', 'mood:relax', 'genre:adventure'],
  },

  'mode:coopLocal': {
    meta: { ru: 'Кооп за одним экраном: игры для двоих и больше на диване — от головоломок на двоих до хаоса на четверых.', en: 'Local co-op games: titles for two or more on one couch, from two-player puzzles to four-player chaos.' },
    body: {
      ru: [
        'Кооп за одним экраном — самый «живой» формат: вы сидите рядом, советуетесь вслух и вместе переживаете провалы. Это главная подборка сайта: от головоломок, где решение нужно проговорить, до кулинарного хаоса на четверых.',
        'Фильтр по числу игроков сразу отсекает лишнее: на двоих, на четверых, на большую компанию. Проверьте платформы: одним играм нужны два геймпада, другим хватит одной клавиатуры — это указано в описании.',
      ],
      en: [
        'Local co-op is the most alive format: you sit side by side, talk out loud and fail together. This is the site’s flagship collection — from puzzles you have to talk through to four-player kitchen chaos.',
        'The player-count filter cuts the noise instantly: for two, for four, for a big group. Check platforms too — some games want two gamepads, others share one keyboard; the descriptions say which.',
      ],
    },
    related: ['genre:party', 'tag:friendlier2', 'tag:splitscreen'],
  },

  'mode:coopOnline': {
    meta: { ru: 'Кооп по сети: сюжетные кампании и рейды с друзьями на расстоянии — игры, где без команды не пройти.', en: 'Online co-op games: story campaigns and raids with friends far away — games you cannot finish without a team.' },
    body: {
      ru: [
        'Сетевой кооп — это совместная игра на расстоянии: кампании, которые проходят вдвоём по голосовому чату, и рейды, где у каждого своя роль. Такой формат спасает дружбу в разных городах и часовых поясах.',
        'Обратите внимание на тег «Нужен голосовой чат» — он отмечает игры, где без переговоров не обойтись. Для спокойных вечеров без расписания подойдут кооперативные игры без хардкорного гринда.',
      ],
      en: [
        'Online co-op is playing together from afar: campaigns finished over voice chat and raids where everyone has a role. The format saves friendships across cities and time zones.',
        'Note the “Voice chat needed” tag — it marks games where negotiation is essential. For calm evenings without a schedule, co-op games without hardcore grinding fit best.',
      ],
    },
    related: ['tag:voicechat', 'mode:coopLocal', 'tag:coopfocused'],
  },

  'mode:pvpLocal': {
    meta: { ru: 'PvP за одним экраном: дуэли и турниры на диване — файтинги, гонки и вечеринки, где победитель один.', en: 'Local PvP games: couch duels and tournaments — fighters, racers and party games with a single champion.' },
    body: {
      ru: [
        'PvP за одним экраном — самый честный формат соревнования: соперник сидит рядом, реакция видна вживую, а поражение нельзя списать на лаги. Здесь файтинги, аркадные дуэли и семейные турниры.',
        'Число игроков — ключевой фильтр: на двоих найдутся дуэли, на четверых — турниры по кругу. Часть игр поддерживает и кооп, и PvP одновременно — это удобно для разной компании.',
      ],
      en: [
        'Local PvP is the most honest competition: the opponent sits beside you, reactions are visible live, and a loss cannot be blamed on lag. Fighters, arcade duels and family tournaments live here.',
        'Player count is the key filter: duels for two, round-robin tournaments for four. Some games support co-op and PvP at once — handy for mixed company.',
      ],
    },
    related: ['genre:fighting', 'genre:party', 'mood:compete'],
  },

  'mode:pvpOnline': {
    meta: { ru: 'PvP по сети: рейтинговые матчи и турниры против живых игроков — от шахмат до шутеров.', en: 'Online PvP games: ranked matches and tournaments against real players, from chess to shooters.' },
    body: {
      ru: [
        'Сетевой PvP — соревнование с живым соперником: рейтинги, сезоны и матчи, где каждый раунд другой. Это жанр для тех, кому интересно расти против людей, а не против сценариев.',
        'Если хочется соревновательного духа без токсичности рейтинговых матчей — посмотрите кооперативные игры с командным PvP или тактические жанры на двоих. Время партии указывает, сколько займёт один матч.',
      ],
      en: [
        'Online PvP is competing against a live opponent: ranks, seasons and matches where every round is different. It is a genre for those who enjoy growing against people rather than scripts.',
        'For a competitive spirit without ranked toxicity, try co-op games with team PvP or two-player tactics genres. The playtime field shows how long one match takes.',
      ],
    },
    related: ['mood:compete', 'mode:pvpLocal', 'genre:tactics'],
  },

  'mode:mmo': {
    meta: { ru: 'Постоянные онлайн-миры: MMO с тысячами игроков, гильдиями и экономикой, которая живёт сама.', en: 'Persistent online worlds: MMOs with thousands of players, guilds and a living player-driven economy.' },
    body: {
      ru: [
        'MMO — миры, которые не выключаются на выходные: города, рейды, экономика и люди, которые играют здесь годами. Это жанр-обязательство, и главное в выборе — найти свою компанию.',
        'Фильтруйте по цене (бесплатные или по подписке) и темпу: одни MMO про рейды по расписанию, другие про спокойную жизнь ремесленника. Оба варианта честно отмечены в описаниях.',
      ],
      en: [
        'MMOs are worlds that do not switch off for the weekend: cities, raids, an economy and people who have played for years. It is a commitment genre, and finding your crowd matters most.',
        'Filter by price (free or subscription) and by pace: some MMOs are about scheduled raids, others about the quiet life of a crafter. The descriptions say honestly which is which.',
      ],
    },
    related: ['tag:clan', 'tag:grind', 'genre:mmo'],
  },

  'mode:async': {
    meta: { ru: 'Пошаговый онлайн: ходы в удобное время — шахматы, стратегии и слова с другом без договорённостей о часе игры.', en: 'Turn-based online games: moves whenever suits you — chess, strategy and word games with a friend, no scheduling.' },
    body: {
      ru: [
        'Пошаговый мультиплеер — это партии без договорённостей: вы делаете ход, закрываете игру, соперник отвечает вечером. Формат, который вписывает большую стратегию в жизнь с работой.',
        'Такой режим есть у настольных адаптаций и больших пошаговых стратегий — уточняйте режимы в карточке. Это лучший способ играть с другом в другом часовом поясе.',
      ],
      en: [
        'Turn-based online play means matches without scheduling: you make a move, close the game, and your friend answers in the evening. A format that fits grand strategy into a life with a job.',
        'Board adaptations and big turn-based strategies carry this mode — check the card. It is the best way to play with a friend in another time zone.',
      ],
    },
    related: ['genre:strategy', 'genre:boardgame', 'mood:think'],
  },

  /* ------------------------------ настроения ------------------------------ */

  'mood:relax': {
    meta: { ru: 'Игры, чтобы расслабиться: без таймеров, стресса и поражений — спокойные миры на вечер.', en: 'Games to relax with: no timers, no stress, no losing — calm worlds for the evening.' },
    body: {
      ru: [
        'Подборка для вечера без напряжения: здесь нет таймеров, рейтингов и честного риска потерять всё. Фермы, прогулки, головоломки и уютные симуляторы — игры, после которых спится лучше.',
        'Если хочется совсем без вызова — смотрите тег «Легко освоить». Любителям спокойного созидания подойдёт связка с настроением «Строить и творить».',
      ],
      en: [
        'A collection for an evening without pressure: no timers, no ratings, no honest risk of losing everything. Farms, strolls, puzzles and cozy simulators — games after which you sleep better.',
        'For zero challenge, check the “Easy to learn” tag. Calm creation lovers will like pairing it with the “Build and create” mood.',
      ],
    },
    related: ['mood:create', 'tag:cozy', 'genre:simulator'],
  },

  'mood:adrenaline': {
    meta: { ru: 'Игры с адреналином: скорость, взрывы и боссфайты — подборка для тех, кому нужен пульс повыше.', en: 'Adrenaline games: speed, explosions and boss fights — a collection for those who want a higher pulse.' },
    body: {
      ru: [
        'Здесь живёт скорость: гонки, слэшеры, рогалики и шутеры, где решения принимаются за доли секунды. Подборка собирает игры с высоким темпом — шкала темпа в карточке показывает, насколько.',
        'Совместный адреналин запоминается лучше одиночного: добавьте фильтр по числу игроков и найдите кооп, где кричат все. Если хочется напряжения без скорости — это настроение «Понервничать».',
      ],
      en: [
        'Speed lives here: racers, slashers, roguelikes and shooters where decisions take split seconds. The collection gathers high-tempo games — the pace meter on each card shows how high.',
        'Shared adrenaline is more memorable than solo: add a player-count filter and find the co-op where everybody screams. For tension without speed, see the “Feel the tension” mood.',
      ],
    },
    related: ['mood:compete', 'genre:action', 'mood:tense'],
  },

  'mood:story': {
    meta: { ru: 'Игры с сильным сюжетом: герои, выборы и финалы, которые запоминаются — как хороший сериал.', en: 'Story-rich games: heroes, choices and endings that stay with you — like a good series.' },
    body: {
      ru: [
        'Сюжетные игры держат так же, как сериал: нужно узнать, что дальше. В этой подборке — игры с выборами и последствиями, ветвящимися диалогами и финалами, о которых хочется говорить.',
        'Длина сюжета — главный вопрос при выборе: короткая история на два вечера или эпопея на месяц. Время прохождения указано в каждой карточке, а тег «Много катсцен» подскажет формат.',
      ],
      en: [
        'Story games grip you exactly like a series: you need to know what happens next. This collection holds games with choices and consequences, branching dialogue and endings worth discussing.',
        'Story length is the main question when choosing: a two-evening tale or a month-long epic. Playtime is on every card, and the “Lots of cutscenes” tag hints at the format.',
      ],
    },
    related: ['mood:feel', 'tag:choices', 'genre:rpg'],
  },

  'mood:think': {
    meta: { ru: 'Игры поломать голову: загадки, тактика и непростые решения — подборка для любителей подумать.', en: 'Games to tease your brain: puzzles, tactics and hard decisions — a collection for thinkers.' },
    body: {
      ru: [
        'Подборка для тех, кто играет, чтобы думать: логические загадки, тактические бои, детективы и стратегии, где план важнее рефлексов. Здесь удовольствие — из серии «на полчаса задумался и понял».',
        'Совместное мышление — отдельное удовольствие: кооперативные головоломки и тактика на двоих отмечены режимами. Для спокойного формата без соперников подойдёт настроение «Расслабиться».',
      ],
      en: [
        'A collection for those who play to think: logic puzzles, tactical battles, detective cases and strategies where the plan beats reflexes. The pleasure here is of the “thought for half an hour, then saw it” kind.',
        'Thinking together is its own pleasure: co-op puzzles and two-player tactics carry their modes. For a calmer format without opponents, pair with the “Relax” mood.',
      ],
    },
    related: ['genre:puzzle', 'genre:tactics', 'genre:mystery'],
  },

  'mood:laugh': {
    meta: { ru: 'Весёлые игры: физика, абсурд и совместные провалы — подборка, где смеются чаще, чем побеждают.', en: 'Funny games: physics, absurdity and shared failures — a collection where laughing beats winning.' },
    body: {
      ru: [
        'Здесь смех — главная механика: физические песочницы, где падают все, абсурдные вечеринки и коопы, где поражение смешнее победы. Такие игры — лучший способ познакомить друзей с играми вообще.',
        'Фильтруйте по числу игроков: самое смешное начинается от двух человек за одним экраном. Если хочется и посмеяться, и посоревноваться — смотрите «Соревноваться».',
      ],
      en: [
        'Laughter is the core mechanic here: physics sandboxes where everyone falls, absurd party games and co-ops where losing is funnier than winning. The best way to introduce friends to games at all.',
        'Filter by player count: the funniest things start with two people on one couch. To laugh and compete at once, see the “Compete” mood.',
      ],
    },
    related: ['genre:party', 'tag:funny', 'mode:coopLocal'],
  },

  'mood:compete': {
    meta: { ru: 'Игры для соревнования: дуэли, турниры и рейтинги — подборка для тех, кто играет на победу.', en: 'Games for competition: duels, tournaments and rankings — a collection for those who play to win.' },
    body: {
      ru: [
        'Соревновательные игры — про победителя: дуэли один на один, турниры по кругу и сетевые матчи с рейтингом. Подборка собирает и честный киберспорт, и весёлые семейные турниры.',
        'Выбирайте формат: PvP за одним экраном — для дивана, PvP по сети — для соперников на расстоянии. Время партии в карточке покажет, укладываетесь ли вы в вечер.',
      ],
      en: [
        'Competitive games are about the winner: one-on-one duels, round-robin tournaments and online ranked matches. The collection holds both honest esports and cheerful family tournaments.',
        'Pick the format: local PvP for the couch, online PvP for rivals far away. Playtime on the card shows whether the match fits your evening.',
      ],
    },
    related: ['mode:pvpLocal', 'mode:pvpOnline', 'genre:fighting'],
  },

  'mood:create': {
    meta: { ru: 'Игры строить и творить: города, базы и фермы — подборка, где результат остаётся после выключения.', en: 'Games to build and create: cities, bases and farms — a collection where the result stays after shutdown.' },
    body: {
      ru: [
        'Подборка для созидателей: города, заводы, базы и целые миры, которые вы спроектировали сами. Часть игр — спокойное творчество, часть — экономические задачи, где каждая постройка должна окупиться.',
        'Совместное строительство — отдельный жанр радости: многие строительные игры поддерживают кооп. Любителям порядка и оптимизации подойдёт тег «Автоматизация».',
      ],
      en: [
        'A collection for creators: cities, factories, bases and whole worlds you designed yourself. Some games are calm creativity, others economic puzzles where every building must pay off.',
        'Building together is a separate kind of joy: many builder games support co-op. For lovers of order and optimisation there is the “Automation” tag.',
      ],
    },
    related: ['genre:building', 'tag:automation', 'mood:relax'],
  },

  'mood:scare': {
    meta: { ru: 'Игры испугаться: темнота, скримеры и тишину, которая страшнее монстров — подборка хорроров.', en: 'Games to get scared with: darkness, jumpscares and silence scarier than monsters — a horror collection.' },
    body: {
      ru: [
        'Хоррор-подборка для тех, кто ищет страх: темные коридоры, звук шагов за спиной и момент, когда свет гаснет. Внутри — и психологические истории, и честные аттракционы со скримерами.',
        'Тон подскажут теги: «Мрачная» — про атмосферу, «Высокая сложность» — про то, что можно сопротивляться. Вдвоём менее страшно: часть хорроров поддерживает кооп, отметьте режим.',
      ],
      en: [
        'A horror collection for those seeking fear: dark corridors, footsteps behind you and the moment the lights go out. Inside are both psychological stories and honest jumpscare rides.',
        'Tags hint at tone: “Dark” for atmosphere, “Hard” for fighting back. It is less scary together: some horrors support co-op — check the mode.',
      ],
    },
    related: ['genre:horror', 'mood:tense', 'tag:dark'],
  },

  'mood:escape': {
    meta: { ru: 'Игры сбежать от реальности: большие миры и долгие истории, в которых легко потерять вечер.', en: 'Games to escape reality with: big worlds and long stories where an evening disappears easily.' },
    body: {
      ru: [
        'Подборка для вечеров, когда нужен другой мир: открытые пространства, длинные истории и игры, куда погружаешься с головой. Здесь время идёт по-другому — это и есть цель.',
        'Если хотите мир без спешки — добавьте «Расслабиться». Длину сюжета смотрите в карточке: подборка намеренно включает и короткие, и очень долгие игры.',
      ],
      en: [
        'A collection for evenings when you need another world: open spaces, long stories and games to sink into. Time runs differently here — and that is the point.',
        'For a world without hurry, add the “Relax” mood. Check playtime on the card: the collection deliberately includes both short and very long games.',
      ],
    },
    related: ['mood:explore', 'mood:story', 'tag:openworld'],
  },

  'mood:progress': {
    meta: { ru: 'Игры, где видно рост: уровни, лут и билды — подборка, где каждый вечер оставляет след.', en: 'Games where growth is visible: levels, loot and builds — a collection where every evening leaves a trace.' },
    body: {
      ru: [
        'Прогрессия — удовольствие, которое осталось из детства: цифры растут, билды собираются, и вчерашний босс становится разминкой. Подборка собирает игры с честной прокачкой и развитием.',
        'Если прогресс нужен без гринда — избегайте тега «Гринд». Совместная прокачка веселее: многие игры подборки поддерживают кооп по сети.',
      ],
      en: [
        'Progression is a pleasure straight from childhood: numbers grow, builds come together, and yesterday’s boss becomes a warm-up. The collection gathers games with honest levelling and development.',
        'If you want progress without grind, avoid the “Grindy” tag. Levelling together is more fun: many games here support online co-op.',
      ],
    },
    related: ['tag:loot', 'tag:grind', 'mode:coopOnline'],
  },

  'mood:explore': {
    meta: { ru: 'Игры исследовать мир: туман на карте, секреты и виды, ради которых хочется зайти за холм.', en: 'Games to explore new worlds: fog on the map, secrets and views worth walking over the hill for.' },
    body: {
      ru: [
        'Исследование — движок этих игр: карта в тумане, пещера за водопадом и надежда, что за следующим холмом что-то стоит. Сюжет здесь часто вторичен — первично любопытство.',
        'Открытые миры ищите по тегу, метроидвании — в соответствующем жанре: у них исследование построено иначе, через запертые двери. И то и другое есть в этой подборке.',
      ],
      en: [
        'Exploration is the engine of these games: fog on the map, a cave behind the waterfall and the hope that something waits over the next hill. Story is often secondary here — curiosity comes first.',
        'Look for open worlds by tag and metroidvanias in their genre: their exploration works differently, through locked doors. Both are in this collection.',
      ],
    },
    related: ['tag:exploration', 'tag:openworld', 'genre:metroidvania'],
  },

  'mood:collect': {
    meta: { ru: 'Игры собирать всё: ачивки, коллекции и 100% — подборка для перфекционистов.', en: 'Games to collect everything: achievements, collections and 100% — a collection for perfectionists.' },
    body: {
      ru: [
        'Подборка для тех, кому нужен идеальный сейв: коллекционные предметы, ачивки и цели полного прохождения, до которых доходят единицы. Второе число в карточке — оценка времени на 100% прохождение.',
        'Совет: разница между сюжетом и 100% иногда достигает десяти раз — проверяйте оба числа, прежде чем начинать. Собирать вместе веселее: часть игр подборки кооперативная.',
      ],
      en: [
        'A collection for those who need a perfect save: collectibles, achievements and completionist goals only a few reach. The second number on each card is the estimated time to 100%.',
        'A tip: the gap between the story and 100% is sometimes tenfold — check both numbers before starting. Collecting together is more fun: some games here are co-op.',
      ],
    },
    related: ['tag:collect', 'mood:progress', 'mood:think'],
  },

  'mood:tense': {
    meta: { ru: 'Игры понервничать: тревога, стелс и одно неверное решение — напряжение без хоррора.', en: 'Games to feel the tension: dread, stealth and one wrong move — suspense without horror.' },
    body: {
      ru: [
        'Тревога — отдельное удовольствие: эти игры держат в напряжении без скримеров. Стелс, выживание с ограниченными ресурсами и решения, которые нельзя отменить. Играть — как идти по канату.',
        'Если напряжение хочется разбавить смехом — смотрите «Посмеяться». Часть игр подборки поддерживает кооп: страх делится на двоих, и это работает.',
      ],
      en: [
        'Dread is its own pleasure: these games keep you tense without jumpscares. Stealth, survival on scarce resources and decisions you cannot undo. Playing feels like walking a tightrope.',
        'If you want tension mixed with laughter, see “Have a laugh”. Some games here support co-op: fear splits in two, and it works.',
      ],
    },
    related: ['genre:stealth', 'mood:scare', 'tag:tense'],
  },

  'mood:learn': {
    meta: { ru: 'Игры, после которых знаешь больше: история, наука и культура — подборка с реальными знаниями.', en: 'Games that leave you knowing more: history, science and culture — a collection with real knowledge.' },
    body: {
      ru: [
        'Эти игры учат, не называя себя обучающими: исторические кампании, научные механики и культуры, снятые вместе с их носителями. После таких игр хочется проверить факты — и они подтверждаются.',
        'Ищите по тегам «Исторический» и «Развивающая». Отдельный подарок жанра — документальные вставки, как в играх о культуре коренных народов: такие вещи отмечены в особенностях.',
      ],
      en: [
        'These games teach without calling themselves educational: historical campaigns, scientific mechanics and cultures made together with the people who live them. After them you want to check the facts — and they check out.',
        'Search by the “Historical” and “Educational” tags. The genre’s special gift is documentary interludes, like games about indigenous cultures — such things are noted among the features.',
      ],
    },
    related: ['tag:learn', 'tag:historical', 'mood:story'],
  },

  'mood:feel': {
    meta: { ru: 'Игры с сильными эмоциями: истории, которые трогают и остаются с вами надолго.', en: 'Games with strong emotions: stories that move you and stay for a long time.' },
    body: {
      ru: [
        'Подборка игр, которые бьют точно в сердце: про дружбу, потерю и людей, которые остаются с вами после титров. Это истории, о которых пишут друзья в два часа ночи.',
        'Настройтесь заранее: часть игр подборки — короткие, но тяжёлые истории. Время и тон подскажет карточка, а тег «Трогательная» встречается здесь чаще всего.',
      ],
      en: [
        'A collection of games that hit straight for the heart: about friendship, loss and people who stay with you after the credits. The stories friends text each other about at two in the morning.',
        'Prepare yourself: some of these are short but heavy stories. The card shows time and tone; the “Emotional” tag appears here more than anywhere.',
      ],
    },
    related: ['mood:story', 'tag:sad', 'genre:adventure'],
  },

  'mood:nostalgia': {
    meta: { ru: 'Игры для ностальгии: классика и новые игры в духе старой школы — пиксели, MIDI и «как тогда».', en: 'Games for nostalgia: classics and new old-school-style titles — pixels, MIDI and the way it was.' },
    body: {
      ru: [
        'Подборка для тех, кто помнит: воссозданные классики, ретро-стилистика и игры, сделанные из любви к девяностым и двухтысячным. Часть — те самые игры, часть — честные современные «как тогда».',
        'Тег «Не требует мощного ПК» поможет подобрать игру даже для скромного ноутбука. А совместная классика за одним экраном — лучший способ показать детям, во что играли вы.',
      ],
      en: [
        'A collection for those who remember: recreated classics, retro aesthetics and games made out of love for the nineties and noughties. Some are the very games; others are honest modern “like it was”.',
        'The “Low system requirements” tag helps pick a game for even a modest laptop. And classic couch play is the best way to show your kids what you played.',
      ],
    },
    related: ['tag:nostalgia', 'tag:pixelart', 'mode:coopLocal'],
  },
};
