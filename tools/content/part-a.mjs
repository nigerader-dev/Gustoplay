/** Контент-батч A: игры для компании и сетевые (см. js/catalog/part-a.js).
 * Применяется скриптом: node tools/apply-content.mjs a
 * Факты — из метаданных каталога и общеизвестных сведений об играх; ничего выдуманного. */
export default [
  {
    slug: 'dont-starve-together', title: "Don't Starve Together",
    about: {
      ru: 'Выживание в рисованном мире Тима Бёртона: собирайте ресурсы, стройте лагерь и не дайте тьме, голоду и безумию съесть вас раньше зимы. Кооператив до шести выживших в мире, который не прощает ошибок и обожает сюрпризы.',
      en: 'Survival in a Tim-Burton-esque hand-drawn world: gather resources, build camp and don’t let darkness, hunger and sanity eat you before winter. Co-op for up to six survivors in a world that forgives nothing and loves surprises.',
    },
    feats: {
      ru: ['Стиль, который не спутать ни с чем', 'Кооператив до шести выживших', 'Сезоны и боссы, к которым нужно готовиться'],
      en: ['A style unlike anything else', 'Co-op for up to six survivors', 'Seasons and bosses that demand preparation'],
    },
  },
  {
    slug: 'deep-rock-galactic', title: 'Deep Rock Galactic',
    about: {
      ru: 'Кооперативный шутер про отряд космических гномов на службе горнодобывающей корпорации. Команда из четырёх классов спускается в процедурные пещеры, добывает минералы и отбивается от роев жуков. У каждого класса свой инструмент: бур, платформа, турель или фонарь — без слаженной работы миссию не закрыть.',
      en: 'A co-op shooter about a squad of space dwarves mining for a faceless corporation. Four class-based dwarves descend into procedural caves, mine objectives and fight off bug swarms. Every class brings a unique traversal or support tool, so missions only work as teamwork.',
    },
    feats: {
      ru: ['Четыре класса завязаны друг на друга: бурить, светить, строить и прикрывать нужно сообща', 'Процедурные пещеры — каждая вылазка не похожа на предыдущую', 'Одна из самых дружелюбных кооп-коммьюнити: новичков здесь встречают салютом «Rock and Stone!»'],
      en: ['Four classes built around each other: dig, light, build and cover together', 'Procedural caves make every drop different', 'One of the friendliest co-op communities around — newcomers get a “Rock and Stone!” salute'],
    },
  },
  {
    slug: 'helldivers-2', title: 'Helldivers 2',
    about: {
      ru: 'Сатирический кооперативный шутер от третьего лица: отряды адских десантников несут «управляемую демократию» на планеты, кишевшие жуками и роботами. Главное оружие против своих же — орбитальные удары, которые так же легко обрушить на товарищей, как и на врагов.',
      en: 'A satirical third-person co-op shooter: squads of Hell divers bring “managed democracy” to bug- and bot-infested planets. Orbital strikes are your biggest asset — and just as likely to flatten your squadmates as the enemy.',
    },
    feats: {
      ru: ['Френдли-файр включён всегда — хаос и есть веселье', 'Общая война всего комьюнити: игроки вместе двигают фронт галактической кампании', 'Зрелищные орбитальные удары и десант в капсулах с орбиты'],
      en: ['Friendly fire is always on — the chaos is the point', 'A shared galaxy-wide war the whole community fights together', 'Spectacular orbital strikes and dramatic pod drops from orbit'],
    },
  },
  {
    slug: 'left-4-dead-2', title: 'Left 4 Dead 2',
    about: {
      ru: 'Классика зомби-кооператива от Valve: четверо выживших прорываются через кампании на юге США, отбиваясь от орд заражённых. ИИ-режиссёр следит за действиями команды и подстраивает количество врагов, предметы и особые заражённые под её состояние.',
      en: 'Valve’s zombie co-op classic: four survivors push through Southern US campaigns against hordes of infected. The AI Director watches how the team is doing and adapts enemy spawns, items and special infected on the fly.',
    },
    feats: {
      ru: ['ИИ-режиссёр делает каждый забег непохожим на предыдущий', 'Особые заражённые наказывают за разобщённость — держитесь вместе', 'Огромная база модов в мастерской Steam: карты, оружие, модели'],
      en: ['The AI Director keeps every run different', 'Special infected punish anyone who strays from the group', 'A huge Steam Workshop scene: custom campaigns, weapons, models'],
    },
  },
  {
    slug: 'warhammer-end-times-vermintide-2', title: 'Warhammer: End Times – Vermintide 2',
    about: {
      ru: 'Кооперативный экшен от первого лица во вселенной Warhammer: пять героев против тысяч крысолюдей-скавенов и воинов Хаоса. Ближний бой построен на ощущении веса оружия: у каждого из пятнадцати героев свой арсенал и боевой стиль.',
      en: 'A first-person co-op action game set in the Warhammer world: five heroes cut through thousands of skaven ratmen and Chaos warriors. Melee combat is built around weapon weight and feel, with fifteen heroes each carrying their own arsenal.',
    },
    feats: {
      ru: ['Мясной ближний бой с ощущением тяжести каждого удара', 'Пятнадцать героев и системы подвигов — есть что открывать неделями', 'Командная зависимость: один отставший — и отряд падает'],
      en: ['Visceral melee where every swing has weight', 'Fifteen heroes plus feat progression for weeks of unlocks', 'Real team dependency: one straggler can wipe the group'],
    },
  },
  {
    slug: 'warhammer-40-000-darktide', title: 'Warhammer 40,000: Darktide',
    about: {
      ru: 'Кооперативный шутер от создателей Vermintide 2, перенёсший формулу в мрачный улей-город Тертиум. Четверо отверженных выполняют задания Инквизиции, прорубаясь через культы и заражённых чумой толпы. Огнестрел сочетается с тяжёлым ближним боем.',
      en: 'A co-op shooter from the makers of Vermintide 2, moving the formula to the grim hive city of Tertium. Four outcasts run errands for the Inquisition, carving through cultists and plague-ridden hordes with a mix of gunplay and heavy melee.',
    },
    feats: {
      ru: ['Атмосфера Вархаммера 40 000 без скидок: мрачно, пафосно, детально', 'Постоянное давление толпы — передышек почти не бывает', 'Сборка и улучшение собственного оружия'],
      en: ['Uncompromising Warhammer 40,000 atmosphere: grim, grand, detailed', 'Relentless crowd pressure with almost no breathing room', 'Weapon crafting and upgrades for long-term progression'],
    },
  },
  {
    slug: 'payday-2', title: 'Payday 2',
    about: {
      ru: 'Кооперативный шутер про ограбления: от тихого взлома сейфа за сорок секунд до штурма с десятками полицейских. Каждый контракт можно пройти стелсом или в лоб, а роли в банде — от танка до техника с турелью — определяют, кто что несёт и умеет.',
      en: 'A co-op heist shooter: from a silent forty-second safe crack to a loud assault with dozens of cops pouring in. Every contract can be played stealth or loud, and crew roles decide who carries what and which tools the team gets.',
    },
    feats: {
      ru: ['Две радикально разные манеры прохождения: стелс и громкое ограбление', 'Сотни контрактов и огромное древо навыков', 'Игра живёт и обновляется уже больше десяти лет'],
      en: ['Two radically different playstyles: stealth or loud', 'Hundreds of contracts and a massive skill tree', 'A live game with more than a decade of updates'],
    },
  },
  {
    slug: 'borderlands-3', title: 'Borderlands 3',
    about: {
      ru: 'Лутер-шутер с фирменным безумным юмором: четыре искателя Хранилищ на нескольких планетах, миллиарды стволов и бесконечный поток добычи. Кооператив до четырёх игроков поддерживает раздельный экран и общий прогресс.',
      en: 'A looter-shooter with the series’ signature madcap humour: four Vault Hunters, multiple planets, a billion guns and a constant flood of loot. Four-player co-op supports split screen and shared progression.',
    },
    feats: {
      ru: ['Миллиарды комбинаций оружия — каждый ствол со своим характером', 'Четыре героя с совершенно разными экшен-навыками', 'Кооп на диване: раздельный экран на консолях'],
      en: ['Billions of gun combinations, each with its own personality', 'Four heroes with wildly different action skills', 'Couch co-op with split screen on consoles'],
    },
  },
  {
    slug: 'monster-hunter-world', title: 'Monster Hunter: World',
    about: {
      ru: 'Охота на гигантских монстров в живых экосистемах: выследить, изучить повадки, победить и пустить трофеи на новую броню и оружие. Цикл «охота → крафт → охота на более крупную добычу» затягивает на сотни часов, а в кооперативе на четырёх охотников веселье только растёт.',
      en: 'Hunt giant monsters in living ecosystems: track them, learn their behaviour, slay them and turn the carcass into better armour and weapons. The hunt–craft–hunt-bigger loop eats hundreds of hours, and four-player co-op only makes it better.',
    },
    feats: {
      ru: ['Четырнадцать типов оружия — у каждого свой геймплей', 'Монстры с проработанными повадками и слабостями', 'Кооперативные охоты до четырёх человек'],
      en: ['Fourteen weapon types, each playing like a different game', 'Monsters with deep behaviour patterns and weaknesses', 'Co-operative hunts for up to four players'],
    },
  },
  {
    slug: 'it-takes-two', title: 'It Takes Two',
    about: {
      ru: 'Приключенческий кооператив строго на двоих: рассорившаяся пара превращается в кукол и чинит отношения, проходя причудливые испытания. Каждый уровень игры придуман заново — механики не повторяются, а всё действие построено на взаимодействии двух игроков.',
      en: 'A strict two-player co-op adventure: a feuding couple is turned into dolls and must repair their relationship through fantastical trials. Every level reinvents its mechanics, and everything is built around the two players working together.',
    },
    feats: {
      ru: ['Игра года 2021 по версии The Game Awards', 'Механики уровней не повторяются до самого финала', 'Друг без копии может присоединиться бесплатно через Friend’s Pass'],
      en: ['The Game Awards 2021 Game of the Year', 'Level mechanics never repeat all the way to the finale', 'A friend can join free with the Friend’s Pass'],
    },
  },
  {
    slug: 'split-fiction', title: 'Split Fiction',
    about: {
      ru: 'Кооперативное приключение от создателей It Takes Two: две писательницы — фантастка и фэнтезистка — застревают внутри собственных историй и сбегают из них, чередуя научную фантастику и фэнтези. Игра строго для двоих, с постоянным обменом способностями.',
      en: 'A co-op adventure from the creators of It Takes Two: two writers — one sci-fi, one fantasy — get trapped inside their own stories and escape by leaping between genres. Strictly two players, with constant ability-swapping.',
    },
    feats: {
      ru: ['Новая игра студии Hazelight после It Takes Two и A Way Out', 'Два переплетающихся жанра: фантастика и фэнтези', 'Кооп строится на взаимодействии, а не на одинаковых действиях'],
      en: ['The next game from Hazelight after It Takes Two and A Way Out', 'Two interwoven genres: sci-fi and fantasy', 'Co-op built on interaction, not mirrored actions'],
    },
  },
  {
    slug: 'a-way-out', title: 'A Way Out',
    about: {
      ru: 'Кинематографичный кооператив про побег из тюрьмы: двое заключённых, Винсент и Лео, действуют только сообща — пока один отвлекает, второй крадёт инструмент. Весь сюжет разбит на сцены, где роли игроков постоянно меняются.',
      en: 'A cinematic co-op prison-break story: two inmates, Vincent and Leo, can only succeed together — one distracts while the other steals the tool. The whole plot is built from scenes where the players’ roles keep swapping.',
    },
    feats: {
      ru: ['Ранняя работа Hazelight — студии It Takes Two', 'Сюжет, который невозможно пройти в одиночку', 'Второй игрок подключается бесплатно по приглашению'],
      en: ['An early Hazelight title — the studio behind It Takes Two', 'A story that literally cannot be played alone', 'The second player joins free via invite'],
    },
  },
  {
    slug: 'overcooked-2', title: 'Overcooked! 2',
    about: {
      ru: 'Аркадный кулинарный хаос на четверых: команда готовит заказы на кухнях, которые разъезжаются, горят и летают. Каждая карта — новая ловушка, а главный навык здесь — договариваться, кто режет, кто жарит и кто моет посуду.',
      en: 'Four-player culinary arcade chaos: a team rushes orders across kitchens that split apart, catch fire and even fly. Every level adds a new hazard, and the real skill is deciding who chops, who cooks and who washes up.',
    },
    feats: {
      ru: ['Мгновенно понятные правила, но настоящая проверка коммуникации', 'Сотни уровней и онлайн-кооператив', 'Идеальная «игра на вечер» для компании любого опыта'],
      en: ['Instantly clear rules that become a real communication test', 'Hundreds of levels plus online co-op', 'A perfect one-night party game for mixed-skill groups'],
    },
  },
  {
    slug: 'plateup', title: 'PlateUp!',
    about: {
      ru: 'Рогалайк про ресторан: компания готовит блюда, обслуживает гостей и обставляет кухню техникой, а между сменами прокачивает заведение по случайным апгрейдам. Каждый заход уникален — от меню до планировки зала.',
      en: 'A restaurant roguelite: a crew cooks dishes, serves guests and rigs the kitchen with gadgets, choosing random upgrades between shifts. Every run is different, from the menu to the dining-room layout.',
    },
    feats: {
      ru: ['Смесь Overcooked и рогалайка: каждая смена не похожа на прошлую', 'Автоматизация кухни — от блендеров до конвейеров', 'Кооператив до четырёх человек'],
      en: ['Overcooked meets roguelite: no two shifts alike', 'Kitchen automation, from blenders to conveyor belts', 'Co-op for up to four players'],
    },
  },
  {
    slug: 'cuphead', title: 'Cuphead',
    about: {
      ru: 'Платформер-«беги и стреляй», нарисованный и анимированный вручную в стиле мультфильмов 1930-х. Почти вся игра — зрелищные боссфайты с выверенными паттернами атак, где смерть всегда честная и заслуженная.',
      en: 'A run-and-gun platformer hand-drawn and animated like a 1930s cartoon. Almost the entire game is spectacular boss fights with precise attack patterns, where every death feels fair and earned.',
    },
    feats: {
      ru: ['Уникальная рисованная анимация с джазовым саундтреком', 'Боссфайты, отточенные до миллисекунд', 'Кооператив на двоих на одном экране'],
      en: ['One-of-a-kind hand-drawn animation with a jazz soundtrack', 'Boss fights tuned to the millisecond', 'Two-player local co-op on one screen'],
    },
  },
  {
    slug: 'human-fall-flat', title: 'Human: Fall Flat',
    about: {
      ru: 'Физическая головоломка про пластилинового человечка Боба, который карабкается, цепляется и падает сквозь сюрреалистичные сны. Управление нарочно неуклюжее — из-за этого даже простые задачи превращаются в комедию, особенно в компании.',
      en: 'A physics puzzler starring Bob, a wobbly dough figurine who climbs, grabs and flops through surreal dreams. The deliberately clumsy controls turn even simple tasks into comedy, especially with friends.',
    },
    feats: {
      ru: ['Физика как источник шуток: каждое движение потенциально смешное', 'Открытые уровни-головоломки с кучей способов решения', 'Кооператив до восьми игроков'],
      en: ['Physics as a comedy engine: every movement can go hilariously wrong', 'Open puzzle levels with many valid solutions', 'Co-op for up to eight players'],
    },
  },
  {
    slug: 'gang-beasts', title: 'Gang Beasts',
    about: {
      ru: 'Физическая потасовка желейных человечков на опасных аренах: крыши грузовиков, стройки, крутящиеся механизмы. Задача проста — выкинуть остальных за борт, удержавшись самому; управляются бойцы нарочно неповоротливо.',
      en: 'A physics brawler of jelly characters on hazardous arenas: truck rooftops, construction sites, spinning machinery. The goal is simple — throw everyone else off while staying on — and the fighters are deliberately unwieldy.',
    },
    feats: {
      ru: ['Правила объясняются за десять секунд', 'Каждый раунд — новый повод посмеяться', 'Лольный мультиплеер на одном экране и онлайн'],
      en: ['Rules explained in ten seconds', 'Every round is a new reason to laugh', 'Couch multiplayer and online matches'],
    },
  },
  {
    slug: 'pummel-party', title: 'Pummel Party',
    about: {
      ru: 'Виртуальная версия настольной вечеринки: до восьми игроков ходят по полю и сражаются в коротких мини-играх — от танковых боёв до королевской битвы. Итоги раундов решают, кто доберётся до финиша первым.',
      en: 'A virtual board-game party: up to eight players move around a board and battle in short minigames, from tank fights to a battle royale. Round results decide who reaches the finish first.',
    },
    feats: {
      ru: ['Формат «настолки» без подготовки: открыл и играешь', 'Десятки разножанровых мини-игр', 'До восьми игроков онлайн или за одним ПК'],
      en: ['Board-party format with zero setup: open and play', 'Dozens of minigames across genres', 'Up to eight players online or on one PC'],
    },
  },
  {
    slug: 'ultimate-chicken-horse', title: 'Ultimate Chicken Horse',
    about: {
      ru: 'Платформер с подвохом: перед каждым забегом игроки вместе строят уровень из ловушек и платформ, а потом пытаются пройти его первыми. Ставить ловушки нужно так, чтобы соперники погибли, а ты — нет.',
      en: 'A platformer with a twist: before every race the players build the level together from traps and platforms, then try to be first through it. Traps must kill your rivals but not you.',
    },
    feats: {
      ru: ['Уровень рождается прямо в партии: каждый раунд другой', 'Простая идея с глубоким соревновательным слоем', 'Локальный мультиплеер до четырёх игроков'],
      en: ['The level is born during the match: every round is different', 'A simple idea with a deep competitive layer', 'Local multiplayer for up to four players'],
    },
  },
  {
    slug: 'keep-talking-and-nobody-explodes', title: 'Keep Talking and Nobody Explodes',
    about: {
      ru: 'Асимметричная головоломка на общение: один игрок видит бомбу, остальные — инструкцию по её обезвреживанию, которой у сапёра нет. Обезвредить модули можно только словами — описывая, диктуя и уточняя.',
      en: 'An asymmetric communication puzzle: one player sees a bomb, the others hold the defusal manual that the defuser never gets. Modules can only be solved with words — describing, dictating and clarifying.',
    },
    feats: {
      ru: ['Игра-тренажёр точной коммуникации', 'Инструкцию можно распечатать или читать с любого устройства', 'Отлично работает в офисе, на вечеринке и в видеозвонке'],
      en: ['A precision-communication workout disguised as a game', 'The manual can be printed or read from any device', 'Works brilliantly at offices, parties and video calls'],
    },
  },
  {
    slug: 'valheim', title: 'Valheim',
    about: {
      ru: 'Выживание в мире скандинавских мифов: викинги строят длинные дома, выходят в море на драккарах и убивают божественных боссов, чтобы заслужить место в Вальхалле. Строительство, крафт и исследование рассчитаны на компанию до десяти игроков.',
      en: 'Survival in a Norse-mythology purgatory: vikings raise longhouses, sail longships and slay divine bosses to earn their place in Valhalla. Building, crafting and exploration are designed for crews of up to ten.',
    },
    feats: {
      ru: ['Одна из самых продаваемых игр раннего доступа в истории', 'Свободное строительство с физикой и системой опор', 'Эпичные боссы, к которым нужно готовиться всем хутором'],
      en: ['One of the best-selling early-access games ever', 'Free-form building with structural physics', 'Epic bosses that take a whole homestead to prepare for'],
    },
  },
  {
    slug: 'palworld', title: 'Palworld',
    about: {
      ru: 'Выживание с коллекцией существ: «палов» ловят, приручают и ставят на работу — они строят базу, носят ресурсы и сражаются рядом с хозяином. Мир открытый, с крафтом, боссами и кооперативом до четырёх игроков.',
      en: 'Open-world survival with creature collecting: “Pals” are caught, tamed and put to work — building bases, hauling resources and fighting alongside their owner. The world is open, with crafting, bosses and co-op for four.',
    },
    feats: {
      ru: ['Существа — и питомцы, и рабочая сила, и оружие', 'База живёт и работает, пока вы в рейде', 'Феномен 2024 года: миллионы игроков в первые недели'],
      en: ['Creatures are pets, workforce and weapons all at once', 'Your base keeps working while you are out raiding', 'The 2024 phenomenon: millions of players in its first weeks'],
    },
  },
  {
    slug: 'minecraft', title: 'Minecraft',
    about: {
      ru: 'Песочница, в которой мир собран из блоков и целиком подчиняется игроку: копать, строить, разводить фермы, спускаться в пещеры и побеждать дракона Края. Творческий режим — про стройку без границ, выживание — про прогресс и опасности.',
      en: 'The block-built sandbox that bends entirely to the player: dig, build, farm, spelunk and take down the Ender Dragon. Creative mode is limitless building; survival is about progression and danger.',
    },
    feats: {
      ru: ['Самая продаваемая игра в истории', 'Бесконечная свобода творчества из простых блоков', 'Моды, серверы и редстоун-механизмы — глубина на годы'],
      en: ['The best-selling video game of all time', 'Limitless creative freedom from simple blocks', 'Mods, servers and redstone engineering: depth for years'],
    },
  },
  {
    slug: 'terraria', title: 'Terraria',
    about: {
      ru: 'Двумерная песочница-приключение: копайте, стройте и сражайтесь с десятками боссов в мире, который генерируется заново для каждой партии. Огромное древо крафта — от медного меча до пулемётов и магических посохов.',
      en: 'A 2D sandbox-adventure: dig, build and battle dozens of bosses in a freshly generated world. The crafting tree is enormous — from copper swords to machine guns and magic staves.',
    },
    feats: {
      ru: ['Более десяти лет бесплатных обновлений с новым контентом', 'Сотни предметов и десятки боссов', 'Кооператив и совместные стройки до восьми игроков'],
      en: ['Over a decade of free content updates', 'Hundreds of items and dozens of bosses', 'Co-op and shared builds for up to eight players'],
    },
  },
  {
    slug: 'project-zomboid', title: 'Project Zomboid',
    about: {
      ru: 'Глубокий симулятор выживания в зомби-апокалипсисе: персонаж умирает навсегда, а до смерти его могут погубить голод, скука, простуда или одна царапина. Игроки обустраивают убежище, чинят машины и держат оборону — поодиночке или на общем сервере.',
      en: 'A deep zombie-apocalypse survival sim: characters die permanently, and hunger, boredom, a cold or a single scratch can finish them off. Players fortify shelters, fix cars and hold the line — alone or on shared servers.',
    },
    feats: {
      ru: ['Беспощадный реализм: каждая мелочь пытается вас убить', 'Историю каждой смерти хочется рассказать друзьям', 'Огромная база модов и мультиплеер'],
      en: ['Ruthless realism: every little thing is trying to kill you', 'Every death makes a story worth telling', 'A huge modding scene and multiplayer servers'],
    },
  },
  {
    slug: '7-days-to-die', title: '7 Days to Die',
    about: {
      ru: 'Выживание в открытом мире после апокалипсиса, где каждые семь суток на базу обрушивается орда зомби. Между волнами игроки добывают ресурсы, строят укрепления и ловушки, а в промежутках исследуют города и шахты.',
      en: 'Open-world post-apocalyptic survival where every seventh day a zombie horde descends on your base. Between waves you scavenge, build fortifications and traps, and explore ruined towns and mines.',
    },
    feats: {
      ru: ['Цикл «семь дней» держит в постоянном напряжении', 'Полностью разрушаемые постройки и ландшафт', 'Кооператив и выделенные серверы'],
      en: ['The seven-day cycle keeps the pressure constant', 'Fully destructible buildings and terrain', 'Co-op play and dedicated servers'],
    },
  },
  {
    slug: 'grounded', title: 'Grounded',
    about: {
      ru: 'Выживание в масштабе муравья: усаженные подростки исследуют двор собственного дома, где паук — босс уровня, а лужа — море. Игроки строят базу из травинок, приручают жуков и выясняют, кто и зачем их уменьшил.',
      en: 'Survival at ant scale: shrunk teenagers explore their own backyard, where a spider is a level boss and a puddle is an ocean. Players build bases from grass blades, tame bugs and unravel who shrank them and why.',
    },
    feats: {
      ru: ['Необычный сеттинг: обычный двор как огромный мир', 'Кооператив до четырёх человек с общим прогрессом', 'Дружелюбный тон и режим без пауков для арахнофобов'],
      en: ['A unique premise: an ordinary backyard as a vast world', 'Four-player co-op with shared progression', 'A friendly tone and an arachnophobia-friendly spider mode'],
    },
  },
  {
    slug: 'raft', title: 'Raft',
    about: {
      ru: 'Выживание посреди океана на крошечном плоту: крюком вылавливаете мусор из воды, расширяете судно, опресняете воду и отбиваетесь от акулы. Постепенно плот превращается в плавучий дом, а сюжет ведёт к затонувшим городам.',
      en: 'Ocean survival on a tiny raft: hook floating junk out of the water, expand your vessel, purify water and fend off the shark. Bit by bit the raft becomes a floating home while the story leads you to sunken cities.',
    },
    feats: {
      ru: ['Уютное выживание без жестокости и давления', 'Плот растёт от досочки до двухпалубного корабля', 'Кооператив до восьми игроков на одном плоту'],
      en: ['Cosy survival without cruelty or pressure', 'Your raft grows from a plank to a two-deck ship', 'Co-op for up to eight players on one raft'],
    },
  },
  {
    slug: 'the-forest', title: 'The Forest',
    about: {
      ru: 'Хоррор-выживание после авиакатастрофы на полуострове, населённом каннибалами. Днём игроки строят лагерь и исследуют пещеры, ночью — обороняются. У игры есть сюжет о поиске пропавшего сына, и у него есть финал.',
      en: 'Horror survival after a plane crash on a peninsula of cannibals. By day you build camp and explore caves; by night you defend it. There is a story about a missing son, and it actually has an ending.',
    },
    feats: {
      ru: ['По-настоящему жуткие пещеры и ночные атаки', 'Свободное строительство базы из брёвен и камней', 'Кооператив до восьми человек и сюжет на двоих'],
      en: ['Genuinely creepy caves and night raids', 'Free-form base building from logs and stone', 'Co-op for up to eight and a two-player story'],
    },
  },
  {
    slug: 'sea-of-thieves', title: 'Sea of Thieves',
    about: {
      ru: 'Пиратская песочница в общем онлайн-мире: команда поднимает паруса, ищет сокровища по картам, сражается с мегалодонами и другими кораблями. Каждую роль на судне — штурвал, пушки, паруса, музыка — исполняют сами игроки.',
      en: 'A pirate sandbox in a shared online world: a crew hoists the sails, hunts treasure with maps, and battles megalodons and rival ships. Every onboard role — helm, cannons, sails, music — is played by the players themselves.',
    },
    feats: {
      ru: ['Корабль — командный механизм: рулить в одиночку невозможно', 'Живой мир с другими экипажами — от торговли до абордажа', 'Игра-сервис с годами сезонов и событий'],
      en: ['The ship is a team machine: no one sails it alone', 'A living world of other crews, from trading to boarding', 'A live-service game with years of seasons and events'],
    },
  },
  {
    slug: 'phasmophobia', title: 'Phasmophobia',
    about: {
      ru: 'Кооперативный хоррор про бригаду охотников за привидениями: команда заходит в дом с паранормальной активностью, собирает улики приборами и определяет тип призрака. Ошибётся в отчёте — и охота пойдёт не по плану.',
      en: 'A co-op horror about a ghost-hunting crew: the team enters a haunted house, gathers evidence with instruments and identifies the ghost type. Get the report wrong and the hunt will go sideways.',
    },
    feats: {
      ru: ['Голосовой чат — часть механики: призрак слышит игроков', 'Каждый тип призрака распознаётся по своему набору улик', 'Напряжённая атмосфера даже без скримеров'],
      en: ['Voice chat is a mechanic: the ghost can hear you', 'Each ghost type is identified by its own evidence set', 'Tension that works even without jump scares'],
    },
  },
  {
    slug: 'lethal-company', title: 'Lethal Company',
    about: {
      ru: 'Кооперативный хоррор-рогалайк о сборщиках металлолома на заброшенных лунах: команда выносит хлам с предприятий, набитых монстрами, и сдаёт его Компании ради плана. Голосовой чат с затуханием по дистанции превращает каждую вылазку в триллер.',
      en: 'A co-op horror roguelike about scrap collectors on abandoned moons: the crew hauls junk out of monster-infested facilities to meet the Company’s quota. Proximity voice chat turns every expedition into a thriller.',
    },
    feats: {
      ru: ['Смешно и страшно одновременно — фирменный тон игры', 'Голос рядом/далеко создаёт ситуации, которые невозможно срежиссировать', 'Каждая вылазка короткая, но незабываемая'],
      en: ['Funny and terrifying at once — the game’s signature tone', 'Proximity voice creates moments no one could script', 'Every expedition is short but unforgettable'],
    },
  },
  {
    slug: 'dead-by-daylight', title: 'Dead by Daylight',
    about: {
      ru: 'Асимметричный мультиплеер «один против четырёх»: Маньяк охотится на выживших, которые чинят генераторы и пытаются сбежать. Роли и персонажи взяты из классики хоррора — от Майкла Майерса до созданий из фильмов и игр.',
      en: 'Asymmetric 4v1 multiplayer: the Killer hunts survivors who repair generators and try to escape. Killers and survivors are drawn from horror classics — from Michael Myers to creatures from films and games.',
    },
    feats: {
      ru: ['Легендарные злодеи хоррора в одной игре', 'Каждый матч — новая погоня с непредсказуемым финалом', 'Постоянные коллаборации и обновления годами'],
      en: ['Legendary horror villains under one roof', 'Every match is a fresh chase with an unpredictable ending', 'Years of collaborations and updates'],
    },
  },
  {
    slug: 'destiny-2', title: 'Destiny 2',
    about: {
      ru: 'Сетевой шутер от создателей Halo: стражи защищают последнюю цитадель человечества, зачищая планеты, налёты и рейды. Быстрый «ощущаемый» ганплей сочетается с лутом и сезонным контентом, а рейды требуют слаженной команды из шести.',
      en: 'An online shooter from the creators of Halo: Guardians defend humanity’s last city by clearing planets, strikes and raids. Fast, tactile gunplay meets loot and seasonal content, and raids demand a coordinated six-player team.',
    },
    feats: {
      ru: ['Один из лучших геймплеев стрельбы в жанре', 'Рейды и подземелья — эндгейм для настоящей команды', 'Бесплатный вход: попробовать можно без покупки'],
      en: ['Some of the best-feeling shooting in the genre', 'Raids and dungeons as true team endgame', 'Free-to-start: you can try it without paying'],
    },
  },
  {
    slug: 'warframe', title: 'Warframe',
    about: {
      ru: 'Бесплатный кооперативный экшен про космических ниндзя-варфреймов: стремительный паркур, сотни видов оружия и десятки уникальных боевых костюмов. Контент накапливался годами — от сюжетных квестов до клановых лабораторий.',
      en: 'A free-to-play co-op action game about space-ninja Warframes: breakneck parkour, hundreds of weapons and dozens of unique combat suits. A decade of content ranges from cinematic quests to clan laboratories.',
    },
    feats: {
      ru: ['Паркур и стрельба сливаются в один поток', 'Полноценная free-to-play без платы за победу', 'Огромный мир с сюжетом на сотни часов'],
      en: ['Parkour and shooting fused into one flow', 'A true free-to-play with no pay-to-win', 'A huge world with hundreds of hours of story'],
    },
  },
  {
    slug: 'final-fantasy-xiv', title: 'Final Fantasy XIV',
    about: {
      ru: 'Сюжетная MMORPG, где одиночная кампания не уступает одиночным JRPG, а подземелья и рейды рассчитаны на группы. Один персонаж осваивает все классы — переключаться можно в любой момент, просто сменив оружие.',
      en: 'A story-driven MMORPG whose solo campaign rivals standalone JRPGs, with dungeons and raids built for groups. One character learns every class — switch at any moment simply by changing weapons.',
    },
    feats: {
      ru: ['Одна из самых высоко оценённых MMO в истории', 'Все профессии на одном персонаже', 'Дружелюбное комьюнити и система наставничества'],
      en: ['One of the highest-rated MMOs ever', 'All classes on a single character', 'A welcoming community with a mentor system'],
    },
  },
  {
    slug: 'world-of-warcraft', title: 'World of Warcraft',
    about: {
      ru: 'MMORPG, определившая жанр: два враждующих альянса, десятки зон, подземелья и рейды на десятки игроков. Игра живёт и развивается больше двадцати лет, а вместе с классическими серверами доступна и её оригинальная версия.',
      en: 'The MMORPG that defined the genre: two warring factions, dozens of zones, dungeons and large-scale raids. The game has kept evolving for over twenty years, and Classic servers preserve its original form.',
    },
    feats: {
      ru: ['Эталон жанра, на который равняются все MMO', 'Рейды и арены — соревновательный контент на годы', 'Классические серверы для путешествия в историю игры'],
      en: ['The genre benchmark every MMO measures itself against', 'Raids and arenas as years-long competitive content', 'Classic servers as a trip through the game’s history'],
    },
  },
  {
    slug: 'guild-wars-2', title: 'Guild Wars 2',
    about: {
      ru: 'MMORPG без обязательной подписки: базовая игра бесплатна, а мир построен на динамических событиях, которые происходят сами по себе. Вертикального прогресса почти нет — экипировка десятилетней давности остаётся актуальной.',
      en: 'An MMORPG with no mandatory subscription: the base game is free, and the world runs on dynamic events that happen on their own. There is almost no gear treadmill — equipment from years ago stays relevant.',
    },
    feats: {
      ru: ['Без гонки экипировки и ежедневной обязаловки', 'Динамические события вовлекают всех игроков рядом', 'Бесплатный вход в огромный живой мир'],
      en: ['No gear race and no daily chores', 'Dynamic events pull in everyone nearby', 'Free entry into a huge living world'],
    },
  },
  {
    slug: 'path-of-exile-2', title: 'Path of Exile 2',
    about: {
      ru: 'Следующая глава хак-энд-слэш-саги: семь классов, сотни камней навыков и пассивное древо, в котором легко заблудиться на неделю. Боёвка стала медленнее и вдумчивее, уклонение и контроль толпы теперь решают не меньше урона.',
      en: 'The next chapter of the hack-and-slash saga: seven classes, hundreds of skill gems and a passive tree you can get lost in for a week. Combat is slower and more deliberate — dodging and crowd control matter as much as damage.',
    },
    feats: {
      ru: ['Глубочайшая система сборки персонажей в жанре', 'Бесплатная модель без платы за силу', 'Эндгейм с сотнями модификаторов сложности'],
      en: ['The deepest character-building system in the genre', 'A free model with nothing sold for power', 'An endgame with hundreds of difficulty modifiers'],
    },
  },
  {
    slug: 'diablo-iv', title: 'Diablo IV',
    about: {
      ru: 'Мрачный хак-энд-слэш с открытым миром: Санктуарий погружается в войну между ангелами и демонами, а пять классов вычищают подземелья и мировых боссов. Сезоны каждые три месяца перетряхивают механики и мету сборки.',
      en: 'A dark open-world hack-and-slash: Sanctuary sinks into a war between angels and demons while five classes clear dungeons and world bosses. Seasons every few months shake up the mechanics and build meta.',
    },
    feats: {
      ru: ['Возвращение к мрачному тону классических Diablo', 'Открытый мир с общими событиями и боссами', 'Сезонная модель с регулярным новым контентом'],
      en: ['A return to the grim tone of classic Diablo', 'An open world with shared events and bosses', 'Seasonal model with regular fresh content'],
    },
  },
  {
    slug: 'counter-strike-2', title: 'Counter-Strike 2',
    about: {
      ru: 'Легендарный тактический шутер «пять на пять»: спецназ против террористов, раунды без возрождений и экономика, в которой каждая покупка винтовки — решение. Наследник CS:GO на движке Source 2 с обновлёнными картами и дымом.',
      en: 'The legendary 5v5 tactical shooter: counter-terrorists versus terrorists, no respawns mid-round and an economy where every rifle purchase is a decision. The successor to CS:GO on Source 2, with rebuilt maps and volumetric smokes.',
    },
    feats: {
      ru: ['Эталон соревновательной стрельбы уже два десятилетия', 'Честная модель мастерства: решает только навык', 'Крупнейшая киберспортивная сцена в истории шутеров'],
      en: ['The benchmark of competitive shooting for two decades', 'A pure skill model: nothing but aim and brains wins rounds', 'The biggest esports scene in shooter history'],
    },
  },
  {
    slug: 'valorant', title: 'Valorant',
    about: {
      ru: 'Тактический шутер «пять на пять» от Riot: точная стрельба в стиле CS сочетается с агентами, у каждого из которых свои способности — дымы, флешки, разведка и ультимейты. Побеждает раунд тот, кто лучше стреляет и умнее пользуется навыками.',
      en: 'A 5v5 tactical shooter from Riot: CS-style gunplay meets agents with unique abilities — smokes, flashes, recon and ultimates. Rounds go to whoever shoots better and uses utility smarter.',
    },
    feats: {
      ru: ['Стрельба решает, способности — множитель', 'Регулярные обновления агентов и карт', 'Бесплатная игра с развитым киберспортом'],
      en: ['Gunplay decides, abilities multiply', 'Regular agent and map updates', 'Free to play with a thriving esport'],
    },
  },
  {
    slug: 'dota-2', title: 'Dota 2',
    about: {
      ru: 'Главная стратегия жанра MOBA: две команды по пять игроков сходятся на карте с тремя линиями, чтобы уничтожить трон противника. Больше ста героев с уникальными способностями и предметами создают, пожалуй, самый высокий потолок мастерства в жанре.',
      en: 'The defining MOBA: two teams of five meet on a three-lane map to destroy the enemy’s Ancient. Over a hundred heroes with unique abilities and items create arguably the highest skill ceiling in the genre.',
    },
    feats: {
      ru: ['Все герои бесплатны с первого дня', 'Глубина, которой учатся годами', 'The International — один из крупнейших призовых фондов в киберспорте'],
      en: ['Every hero free from day one', 'Depth that takes years to master', 'The International — one of esports’ biggest prize pools'],
    },
  },
  {
    slug: 'league-of-legends', title: 'League of Legends',
    about: {
      ru: 'Самая популярная MOBA мира: матчи на 25–35 минут, больше ста шестидесяти чемпионов и сцена, сделавшая жанр киберспортом мирового масштаба. Порог входа дружелюбнее, чем у конкурентов, а обновления выходят каждые две недели.',
      en: 'The world’s most-played MOBA: 25–35-minute matches, over 160 champions and the scene that turned the genre into a global esport. The entry ramp is friendlier than its rivals, and patches ship every two weeks.',
    },
    feats: {
      ru: ['Быстрые матчи — легко вписать в вечер', 'Постоянная ротация чемпионов и событий', 'Гигантская киберспортивная экосистема'],
      en: ['Quick matches that fit into an evening', 'Constant champion and event rotation', 'A gigantic esports ecosystem'],
    },
  },
  {
    slug: 'apex-legends', title: 'Apex Legends',
    about: {
      ru: 'Командная королевская битва от первого лица: отряды по три «легенды» с уникальными способностями сражаются за последний выживший на сжимающейся карте. Движение — подкаты, зиплайны, двойные прыжки — само по себе удовольствие.',
      en: 'A team-based first-person battle royale: squads of three “Legends” with unique abilities fight to be the last squad standing on a shrinking map. The movement — slides, ziplines, double jumps — is a joy in itself.',
    },
    feats: {
      ru: ['Лучший мувмент в жанре батл-роялей', 'Умная система пингов: играть можно вообще без микрофона', 'Харизматичные легенды с собственными историями'],
      en: ['The best movement in the battle-royale genre', 'A smart ping system: you can play with no mic at all', 'Charismatic Legends with their own stories'],
    },
  },
  {
    slug: 'overwatch-2', title: 'Overwatch 2',
    about: {
      ru: 'Командный герой-шутер «пять на пять»: танки, урон и поддержка с уникальными способностями сражаются за точки и грузы. Каждые пару недель появляется новый герой, а матчи держатся на комбинациях умений, а не только на меткости.',
      en: 'A 5v5 team hero shooter: tanks, damage and support heroes with unique abilities fight over objectives and payloads. New heroes arrive every few weeks, and matches hinge on ability combos, not just aim.',
    },
    feats: {
      ru: ['У каждого героя свой жанр внутри шутера', 'Читаемый командный бой с понятными целями', 'Бесплатная модель с регулярными сезонами'],
      en: ['Every hero feels like their own genre inside the shooter', 'Readable team fights with clear objectives', 'Free-to-play with regular seasons'],
    },
  },
  {
    slug: 'rocket-league', title: 'Rocket League',
    about: {
      ru: 'Футбол на машинах: реактивные автомобили гоняют гигантский мяч по арене, а физика превращает каждый удар в акробатику. Правила объясняются за минуту, а полёты и удары через себя игроки оттачивают годами.',
      en: 'Soccer with rocket cars: boost-powered vehicles chase a giant ball around an arena, and the physics turn every hit into acrobatics. The rules take a minute to learn, and aerial shots take years to master.',
    },
    feats: {
      ru: ['Чистый навык: нет ни прокачки, ни доната силы', 'Матчи по пять минут — идеально для вечера', 'Огромная киберспортивная сцена'],
      en: ['Pure skill: no progression, no pay-for-power', 'Five-minute matches, perfect for an evening', 'A massive esports scene'],
    },
  },
  {
    slug: 'fall-guys', title: 'Fall Guys',
    about: {
      ru: 'Бесплатное телешоу из мини-игр: десятки неуклюжих персонажей бегут, падают и хватаются на полосе препятствий, пока не останется победитель. Раунды короткие, правила мгновенные, а проигрывать здесь смешнее, чем выигрывать.',
      en: 'A free-to-play game show of minigames: dozens of clumsy characters run, tumble and grab across obstacle courses until one winner remains. Rounds are short, rules are instant, and losing is funnier than winning.',
    },
    feats: {
      ru: ['Вечеринка без подготовки: зашёл и играешь', 'Постоянные коллаборации с играми и сериалами', 'Кроссплатформенный мультиплеер'],
      en: ['A zero-setup party: jump in and play', 'Constant collaborations with games and shows', 'Cross-platform multiplayer'],
    },
  },
  {
    slug: 'pubg-battlegrounds', title: 'PUBG: Battlegrounds',
    about: {
      ru: 'Игра, популяризировавшая королевские битвы: сто человек высаживаются на остров, собирают оружие и экипировку и сражаются до последнего выжившего, пока зона сжимается. Темп реалистичный: стрельба с баллистикой, звук шагов и засады решают всё.',
      en: 'The game that popularised the battle royale: a hundred players drop on an island, scavenge weapons and gear and fight to the last one standing as the zone closes. The pace is realistic — bullet ballistics, footsteps and ambushes decide everything.',
    },
    feats: {
      ru: ['Прародитель жанра королевских битв', 'Напряжённые финалы, где каждый звук имеет значение', 'Десятки карт и режимов на любой темп'],
      en: ['The originator of the battle-royale genre', 'Tense finales where every sound matters', 'Dozens of maps and modes for any pace'],
    },
  },
];
