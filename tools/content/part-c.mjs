/** Контент-батч C: стратегии, симуляторы, семейные и free-to-play (см. js/catalog/part-c.js).
 * Применяется скриптом: node tools/apply-content.mjs c */
export default [
  {
    slug: 'factorio', title: 'Factorio',
    about: {
      ru: 'Инженер строит фабрику на чужой планете: конвейеры, буры, логистика и автоматизация растут от пары линий до мегазавода, закрывающего горизонт. Эталон жанра, где «ещё чуть-чуть оптимизирую» превращается в рассвет.',
      en: 'An engineer builds a factory on an alien planet: conveyors, drills, logistics and automation grow from a few lines into a megabase covering the horizon. The genre benchmark where “just one more optimisation” turns into sunrise.',
    },
    feats: {
      ru: ['Глубочайшая автоматизация без микроменеджмента', 'Кооператив, где каждый берёт свой участок завода', 'Производительность на тысячи часов игры'],
      en: ['Deepest automation with zero micromanagement', 'Co-op where everyone owns a part of the factory', 'Performance that holds up for thousands of hours'],
    },
  },
  {
    slug: 'satisfactory', title: 'Satisfactory',
    about: {
      ru: 'Фабрика от первого лица в красивом открытом мире: конвейеры тянутся по столбам через горы, поезда возят руду, а джетпак открывает третий этаж стройки. Кооператив до четырёх инженеров в одном мире.',
      en: 'A first-person factory in a beautiful open world: conveyors climb poles across mountains, trains haul ore, and a jetpack unlocks the third floor of your build. Co-op for up to four engineers in one world.',
    },
    feats: {
      ru: ['Строительство от первого лица — залипательно и наглядно', 'Мир, который интересно исследовать не меньше, чем строить', 'Кооператив, где друзья достраивают вашу мечту'],
      en: ['First-person building is mesmerising and readable', 'A world as fun to explore as it is to build in', 'Co-op where friends complete your dream build'],
    },
  },
  {
    slug: 'rimworld', title: 'RimWorld',
    about: {
      ru: 'Симулятор колонии выживших на планете, где генератор историй устраивает то засуху, то рейд пиратов, то падение метеорита из токсичного мусора. Каждый колонист — личность с характером, и трагедии колонии становятся лучшими историями.',
      en: 'A colony sim of survivors on a planet where a story AI deals droughts, pirate raids and toxic-meteor strikes. Every colonist is a personality, and the colony’s tragedies become your best stories.',
    },
    feats: {
      ru: ['Генератор историй вместо скриптованного сюжета', 'Модов больше, чем у любой другой игры жанра', 'Истории колонии, которые пересказывают годами'],
      en: ['An AI storyteller instead of a scripted plot', 'More mods than any other game in the genre', 'Colony stories people retell for years'],
    },
  },
  {
    slug: 'dwarf-fortress', title: 'Dwarf Fortress',
    about: {
      ru: 'Легенда симуляторов: крепость гномов, где моделируется всё — от геологии слоёв до настроения каждого гнома. Версия в Steam получила графику и интерфейс, но глубина та же: двадцать лет разработки и целая энциклопедия механик.',
      en: 'A simulation legend: a dwarven fortress where everything is modelled — from rock strata geology to each dwarf’s mood. The Steam version brought graphics and a proper UI, but the depth is the same: twenty years of development and an encyclopedia of mechanics.',
    },
    feats: {
      ru: ['Самая глубокая симуляция в истории игр', '«Проигрывать — весело» как официальный девиз', 'Паровой интерфейс сделал классику доступной'],
      en: ['The deepest simulation in gaming history', '“Losing is fun” as an official motto', 'The Steam interface made the classic approachable'],
    },
  },
  {
    slug: 'oxygen-not-included', title: 'Oxygen Not Included',
    about: {
      ru: 'Колония внутри астероида: дубликантам нужны кислород, вода, еда и комфорт, а физика газов и жидкостей превращает каждую трубу в инженерную задачу. От создателей Don’t Starve — милая картинка при безжалостной термодинамике.',
      en: 'A colony inside an asteroid: duplicants need oxygen, water, food and comfort, and the gas-and-liquid physics turns every pipe into an engineering problem. From the creators of Don’t Starve — cute art, ruthless thermodynamics.',
    },
    feats: {
      ru: ['Настоящая симуляция газов, температур и жидкостей', 'Каждая колония — новый инженерный вызов', 'Юмор дубликантов среди сурового выживания'],
      en: ['Real simulation of gases, temperatures and liquids', 'Every colony is a fresh engineering challenge', 'Duplicant humour amid harsh survival'],
    },
  },
  {
    slug: 'cities-skylines-ii', title: 'Cities: Skylines II',
    about: {
      ru: 'Градостроительный симулятор нового поколения: города растут до масштабов, о которых первая часть не мечтала, а экономика, трафик и сезоны связаны в живую систему. Стройте мегаполис и наблюдайте, как он дышит.',
      en: 'A next-generation city builder: cities grow to scales the first game never dreamed of, with economy, traffic and seasons woven into a living system. Build a metropolis and watch it breathe.',
    },
    feats: {
      ru: ['Масштаб города без прежних ограничений', 'Глубокая экономическая модель района за районом', 'Дороги и трафик как главная головоломка'],
      en: ['City scale beyond previous limits', 'A deep economic model, district by district', 'Roads and traffic as the core puzzle'],
    },
  },
  {
    slug: 'frostpunk', title: 'Frostpunk',
    about: {
      ru: 'Градостроительный выживач в вечной мерзлоте: вокруг генератора тепла собирается последний город Земли, а каждое решение — детский труд, пайки, вера или порядок — имеет цену. Игра задаёт вопрос «стоило ли выживание такой цены» и ждёт ответа.',
      en: 'A city-builder survival in eternal frost: the last city on Earth gathers around a heat generator, and every decision — child labour, rations, faith or order — has a price. The game asks whether survival was worth it and waits for your answer.',
    },
    feats: {
      ru: ['Моральные решения тяжелее любой оптимизации', 'Атмосфера и саундтрек, от которых стынет кровь', 'Сценарии с разными условиями и финалами'],
      en: ['Moral choices heavier than any optimisation', 'An atmosphere and score that freeze your blood', 'Scenarios with different conditions and endings'],
    },
  },
  {
    slug: 'crusader-kings-iii', title: 'Crusader Kings III',
    about: {
      ru: 'Генератор средневековых династий: играете не страной, а родом — браки, интриги, наследники, предательства и крестовые походы на протяжении столетий. Каждая партия — роман о вашей семье, написанный вашими решениями.',
      en: 'A medieval dynasty generator: you play a family, not a country — marriages, intrigues, heirs, betrayals and crusades across centuries. Every campaign is a novel about your house, written by your decisions.',
    },
    feats: {
      ru: ['Истории династий смешнее и драматичнее сериалов', 'Новичкам теперь есть встроенные подсказки-уроки', 'Моды превращают игру в любую эпоху'],
      en: ['Dynasty stories funnier and more dramatic than TV', 'Built-in guided tutorials for newcomers', 'Mods turn it into any historical era'],
    },
  },
  {
    slug: 'stellaris', title: 'Stellaris',
    about: {
      ru: 'Космическая 4X-стратегия в реальном времени: создайте свою цивилизацию — от мирных торговцев до роя, пожирающего галактику, — и доведите её до конца игры, где просыпаются древние угрозы. Масштаб от одной планеты до всей галактики.',
      en: 'A real-time space 4X: create your civilisation — from peaceful traders to a galaxy-devouring swarm — and carry it to an endgame where ancient threats awaken. Scale from one planet to the whole galaxy.',
    },
    feats: {
      ru: ['Конструктор цивилизаций с сотнями параметров', 'Случайные события пишут сюжет каждой партии', 'Финальные кризисы против всей галактики'],
      en: ['A civilisation designer with hundreds of dials', 'Random events write the plot of every campaign', 'Endgame crises against the whole galaxy'],
    },
  },
  {
    slug: 'sid-meiers-civilization-vii', title: "Sid Meier\\u2019s Civilization VII",
    about: {
      ru: 'Новая глава легендарной серии: цивилизация теперь развивается эпохами, а между ними можно перерождаться в другую державу, сохранив наследие. Классическое «ещё один ход» на новой технической базе с перекрёстным сохранением.',
      en: 'The next chapter of the legendary series: your civilisation now advances through Ages, and between them you can re-emerge as a different power while keeping your legacy. The classic “one more turn” on a new technical base with cross-save.',
    },
    feats: {
      ru: ['Система эпох меняет правила по ходу партии', 'Наследие связывает три цивилизации в одну историю', 'Классика, в которую проваливаются на годы'],
      en: ['The Ages system changes the rules mid-game', 'Legacy ties three civilisations into one story', 'A classic that swallows years of your life'],
    },
  },
  {
    slug: 'xcom-2', title: 'XCOM 2',
    about: {
      ru: 'Земля проиграла войну с пришельцами двадцать лет назад, и отряд сопротивления ведёт партизанскую войну с орбитального штаба. Пошаговые бои, где промах в 95% всё равно ранит, и потери бойцов, к которым привязываешься.',
      en: 'Earth lost the war with aliens twenty years ago, and a resistance squad wages guerrilla war from an orbital HQ. Turn-based battles where a 95% shot still misses, and soldiers you grow attached to really die.',
    },
    feats: {
      ru: ['Знаменитые 95% — напряжение в каждом ходу', 'Генерация бойцов с кастомизацией до мелочей', 'Дополнение War of the Chosen удваивает игру'],
      en: ['The famous 95% shots — tension every turn', 'Soldier generation with granular customisation', 'The War of the Chosen expansion doubles the game'],
    },
  },
  {
    slug: 'total-war-warhammer-iii', title: 'Total War: Warhammer III',
    about: {
      ru: 'Финал трилогии: Великий Катай и царства хаоса сталкиваются в гигантской кампании, где сотни отрядов — от рыцарей до драконов — сходятся в боях в реальном времени. Самый масштабный Total War по числу фракций и юнитов.',
      en: 'The trilogy finale: Grand Cathay and the realms of Chaos collide in a giant campaign where hundreds of units — from knights to dragons — clash in real-time battles. The biggest Total War by factions and units.',
    },
    feats: {
      ru: ['Тысячи юнитов и десятки непохожих фракций', 'Битвы, где дракон решает исход фланга', 'Кампания «Бессмертные империи» объединяет всю трилогию'],
      en: ['Thousands of units and dozens of distinct factions', 'Battles where a dragon decides a flank', 'The Immortal Empires campaign unites the whole trilogy'],
    },
  },
  {
    slug: 'age-of-empires-iv', title: 'Age of Empires IV',
    about: {
      ru: 'Возвращение классической RTS: восемь цивилизаций с уникальными механиками, исторические кампании с документальными вставками и честный мультиплеер. Средневековые осады и экономика, которые читаются с одного взгляда.',
      en: 'The classic RTS returns: eight civilisations with unique mechanics, historical campaigns with documentary inserts and honest multiplayer. Medieval sieges and an economy readable at a glance.',
    },
    feats: {
      ru: ['Классическая RTS с современной графикой', 'Кампании-документалки об эпохе', 'Каждая цивилизация играет по-своему'],
      en: ['A classic RTS with modern visuals', 'Documentary-style campaigns about the era', 'Every civilisation plays differently'],
    },
  },
  {
    slug: 'company-of-heroes-3', title: 'Company of Heroes 3',
    about: {
      ru: 'Тактическая RTS о Второй мировой на итальянском и североафриканском фронтах: укрытия, разрушаемость и фланговые обходы решают больше, чем численность. Динамическая карта кампании связывает бои в целую операцию.',
      en: 'A WWII tactical RTS on the Italian and North African fronts: cover, destruction and flanking matter more than numbers. A dynamic campaign map ties battles into a full operation.',
    },
    feats: {
      ru: ['Разрушаемость, меняющая тактику на лету', 'Динамическая кампания на карте Италии', 'Пауза в реальном времени для обдуманных приказов'],
      en: ['Destruction that reshapes tactics on the fly', 'A dynamic campaign across the map of Italy', 'Real-time pause for thoughtful orders'],
    },
  },
  {
    slug: 'into-the-breach', title: 'Into the Breach',
    about: {
      ru: 'Пошаговая тактика на картах восемь на восемь: три меха против волн жуков, где враг показывает свой следующий ход, а вы решаете головоломку урона. От создателей FTL — идеальные партии по двадцать минут.',
      en: 'Turn-based tactics on eight-by-eight maps: three mechs against waves of bugs, where enemies telegraph their next move and you solve the damage puzzle. From the creators of FTL — perfect twenty-minute sessions.',
    },
    feats: {
      ru: ['Каждый ход — читаемая головоломка', 'Поражение не обнуляет прогресс: пилоты переходят дальше', 'Идеальный формат коротких сессий'],
      en: ['Every turn is a readable puzzle', 'Defeat keeps progress: pilots carry over', 'A perfect short-session format'],
    },
  },
  {
    slug: 'inscryption', title: 'Inscryption',
    about: {
      ru: 'Карточный рогалик, который начинается как партия против жуткого лесника в хижине, а дальше игра делает вещи, которые невозможно описать без спойлеров. Каждый акт ломает правила предыдущего.',
      en: 'A deck-building roguelike that begins as a match against a creepy gamemaster in a cabin, and then the game does things that cannot be described without spoilers. Every act breaks the rules of the previous one.',
    },
    feats: {
      ru: ['Игра, о которой нельзя говорить — только играть', 'Три акта, каждый со своим жанром', 'Секреты, которые ищут всем сообществом'],
      en: ['A game you cannot talk about — only play', 'Three acts, each its own genre', 'Secrets the whole community hunts together'],
    },
  },
  {
    slug: 'vampire-survivors', title: 'Vampire Survivors',
    about: {
      ru: 'Вы управляете только движением, а герой косит тысячи монстров сам: собирайте оружие и эволюции, переживите тридцать минут орды и откройте новых персонажей. Игра за три доллара, породившая целый жанр.',
      en: 'You control only movement while your hero mows down thousands of monsters: collect weapons and evolutions, survive thirty minutes of hordes and unlock new characters. A three-dollar game that spawned a genre.',
    },
    feats: {
      ru: ['Родоначальник жанра «хорды и прокачка»', 'Один забег — полчаса чистого дофамина', 'Секретных персонажей и режимов на десятки часов'],
      en: ['The originator of the horde-progression genre', 'One run is half an hour of pure dopamine', 'Secret characters and modes for dozens of hours'],
    },
  },
  {
    slug: 'the-sims-4', title: 'The Sims 4',
    about: {
      ru: 'Симулятор жизни, где базовая игра стала бесплатной: стройте дома, создавайте персонажей с характерами и управляйте их карьерами, отношениями и хаосом. Тысячи часов геймплея и гигантское сообщество моддеров.',
      en: 'The life sim, now with its base game free: build houses, create characters with personalities and steer their careers, relationships and chaos. Thousands of hours of gameplay and a giant modding community.',
    },
    feats: {
      ru: ['Базовая игра бесплатна — порог входа нулевой', 'Редактор строительства и создания симов лучший в жанре', 'Моды и галерея бесконечно расширяют игру'],
      en: ['Free base game — zero barrier to entry', 'Best-in-genre build and character editors', 'Mods and the gallery expand it endlessly'],
    },
  },
  {
    slug: 'animal-crossing-new-horizons', title: 'Animal Crossing: New Horizons',
    about: {
      ru: 'Пакет «Побег на необитаемый остров» от Nintendo: обустраивайте остров, ловите рыбу и бабочек, общайтесь с зверями-соседями и живите в реальном времени года. Уют как игровая механика, ставший культурным феноменом 2020 года.',
      en: 'Nintendo’s deserted-island getaway package: set up your island, fish and catch bugs, chat with animal neighbours and live in real-world seasons. Cosiness as a game mechanic — the cultural phenomenon of 2020.',
    },
    feats: {
      ru: ['Остров, который живёт по реальному календарю', 'Соседи-звери с характерами и историями', 'Дизайн острова под полный контроль игрока'],
      en: ['An island running on the real calendar', 'Animal neighbours with personalities and stories', 'Full player control over island design'],
    },
  },
  {
    slug: 'disney-dreamlight-valley', title: 'Disney Dreamlight Valley',
    about: {
      ru: 'Симулятор жизни в долине, где живут персонажи Диснея и Пиксара: выполняйте квесты Микки и Эльзы, обустраивайте дом и сад, открывайте миры. Уютная песочница, рассчитанная на всю семью.',
      en: 'A life sim in a valley inhabited by Disney and Pixar characters: do quests for Mickey and Elsa, decorate your home and garden, unlock realms. A cosy sandbox built for the whole family.',
    },
    feats: {
      ru: ['Десятки узнаваемых героев со своими историями', 'Квесты, сад и дизайн — всё в одном потоке', 'Играют дети и родители вместе'],
      en: ['Dozens of familiar heroes with their own stories', 'Quests, gardening and design in one flow', 'Kids and parents play it together'],
    },
  },
  {
    slug: 'my-time-at-sandrock', title: 'My Time at Sandrock',
    about: {
      ru: 'Строитель-новичок приезжает в пустынный городок Сэндрок и поднимает его мастерскую: заказы жителей, ферма, шахты и романтические линии. Тёплая ролевая игра о маленьком городе, где все друг друга знают.',
      en: 'A rookie builder arrives in the desert town of Sandrock and grows its workshop: resident commissions, farming, mines and romance lines. A warm RPG about a small town where everyone knows everyone.',
    },
    feats: {
      ru: ['Город меняется от ваших построек', 'Сотни заданий и отношений с жителями', 'Кооператив позволяет строить вместе'],
      en: ['The town changes because of your builds', 'Hundreds of quests and relationships', 'Co-op lets you build together'],
    },
  },
  {
    slug: 'powerwash-simulator', title: 'PowerWash Simulator',
    about: {
      ru: 'Мойка всего под давлением воды: грязные фургоны, дома и даже марсианские роверы очищаются до блеска под приятный шум воды. Кооператив до шести человек превращает уборку в медитативный вечер с друзьями.',
      en: 'Pressure-washing everything: dirty vans, houses and even Martian rovers cleaned to a shine over the soothing sound of water. Six-player co-op turns cleaning into a meditative evening with friends.',
    },
    feats: {
      ru: ['Удовлетворение от чистого результата — механика сама по себе', 'Кооператив, где уборка становится разговором по душам', 'Кроссоверы с Tomb Raider и Warhammer в виде уровней'],
      en: ['Satisfaction from a clean result is the mechanic itself', 'Co-op where cleaning becomes a heart-to-heart', 'Tomb Raider and Warhammer crossover levels'],
    },
  },
  {
    slug: 'euro-truck-simulator-2', title: 'Euro Truck Simulator 2',
    about: {
      ru: 'Дальнобойщик в Европе: грузы, своя автокомпания, тюнинг кабин и сотни тысяч километров дорог от Лиссабона до Хельсинки. Медитативный симулятор с рулём как идеальным компаньоном, живущий обновлениями уже больше десяти лет.',
      en: 'A long-haul trucker in Europe: cargo runs, your own trucking company, cab tuning and hundreds of thousands of kilometres from Lisbon to Helsinki. A meditative sim where a wheel is the perfect companion, updated for over a decade.',
    },
    feats: {
      ru: ['Дорога как терапия после тяжёлого дня', 'Своя компания: нанимайте водителей и покупайте гаражи', 'Годы бесплатных улучшений карты'],
      en: ['The road as therapy after a hard day', 'Your own company: hire drivers, buy garages', 'Years of free map improvements'],
    },
  },
  {
    slug: 'farming-simulator-25', title: 'Farming Simulator 25',
    about: {
      ru: 'Современная ферма с сотнями лицензированных машин: пашите, сейте рис, разводите буйволов и собирайте урожай на полях с динамической погодой. Кооператив до шестнадцати фермеров на одной карте.',
      en: 'A modern farm with hundreds of licensed machines: plough, plant rice, raise buffalo and harvest fields with dynamic weather. Co-op for up to sixteen farmers on one map.',
    },
    feats: {
      ru: ['Реальная техника John Deere, Fendt и сотен марок', 'Рис, шпинат и буйволы — новые культуры и животные', 'Шестнадцать игроков на одной ферме'],
      en: ['Real machinery from John Deere, Fendt and hundreds of brands', 'Rice, spinach and buffalo — new crops and animals', 'Sixteen players on one farm'],
    },
  },
  {
    slug: 'microsoft-flight-simulator', title: 'Microsoft Flight Simulator',
    about: {
      ru: 'Вся планета Земля, воссозданная по спутниковым данным: летайте над своим домом, садитесь в любом аэропорте мира и осваивайте реальные процедуры от взлёта до посадки. Технологическая витрина, ставшая полноценным симулятором.',
      en: 'The entire planet recreated from satellite data: fly over your own home, land at any airport on Earth and learn real procedures from take-off to touchdown. A tech showcase that became a full simulator.',
    },
    feats: {
      ru: ['Любая точка планеты — ваш аэродром', 'Реальная авиационная физика и навигация', 'Обновления мира добавляют регионы и города'],
      en: ['Every point on the planet is your airfield', 'Real aviation physics and navigation', 'World updates keep adding regions and cities'],
    },
  },
  {
    slug: 'forza-horizon-5', title: 'Forza Horizon 5',
    about: {
      ru: 'Автомобильный фестиваль в Мексике: гонки по пляжам, джунглям и вулканам, сотни машин и свобода ехать куда глаза глядят. Самый доступный и красивый аркадный гоночный мир, с кооперативной кампанией и сезонными событиями.',
      en: 'A car festival in Mexico: races across beaches, jungles and volcanoes, hundreds of cars and the freedom to drive anywhere. The most approachable and beautiful open-world racer, with a co-op campaign and seasonal events.',
    },
    feats: {
      ru: ['Мексика с одиннадцатью биомами выглядит потрясающе', 'Сотни машин и тюнинг под любой вкус', 'Сезоны меняют события каждую неделю'],
      en: ['Mexico’s eleven biomes look stunning', 'Hundreds of cars and tuning for every taste', 'Seasons rotate events every week'],
    },
  },
  {
    slug: 'gran-turismo-7', title: 'Gran Turismo 7',
    about: {
      ru: 'Автосимулятор-энциклопедия: от классики шестидесятых до современных гиперкаров, с тюнингом до последнего винта и школой вождения. Флагманский гоночный эксклюзив с фотографической точностью трасс и машин.',
      en: 'A racing simulator encyclopedia: from sixties classics to modern hypercars, with tuning down to the last bolt and a driving school. A flagship racing title with photographic precision for tracks and cars.',
    },
    feats: {
      ru: ['Коллекция машин как музей автоистории', 'Реалистичная физика с ассистами для новичков', 'Трассы, снятые с точностью до поребрика'],
      en: ['A car collection like an automotive museum', 'Realistic physics with assists for newcomers', 'Tracks scanned down to the last kerb'],
    },
  },
  {
    slug: 'ea-sports-fc-26', title: 'EA Sports FC 26',
    about: {
      ru: 'Новая глава футбольной серии после ухода от бренда FIFA: лицензированные лиги и клубы, обновлённый движок с более естественным движением игроков и режимы карьеры, клубов и Ultimate Team.',
      en: 'The next chapter of the football series after leaving the FIFA brand: licensed leagues and clubs, an updated engine with more natural player motion, and career, clubs and Ultimate Team modes.',
    },
    feats: {
      ru: ['Все главные лиги и турниры с лицензиями', 'Карьера тренера и игрока на годы', 'Кооперативные клубы с друзьями'],
      en: ['All major leagues and tournaments, licensed', 'Manager and player careers for years', 'Co-op clubs with friends'],
    },
  },
  {
    slug: 'football-manager-2024', title: 'Football Manager 2024',
    about: {
      ru: 'Вы — менеджер клуба: трансферы, тактика, тренировки, пресс-конференции и пятнадцатилетние карьеры, где из любителя растёт звезда. Глубочший футбольный симулятор, в котором «последний матч» всегда заканчивается в четыре утра.',
      en: 'You are the club manager: transfers, tactics, training, press conferences and fifteen-year careers where an amateur grows into a star. The deepest football sim, where “one last match” always ends at 4 a.m.',
    },
    feats: {
      ru: ['База игроков с реальными скаутскими данными', 'Тактическая глубина уровня тренерской лицензии', 'Карьеры, которые длятся десятилетия игрового времени'],
      en: ['A player database built on real scouting data', 'Tactical depth of a coaching licence', 'Careers spanning decades of in-game time'],
    },
  },
  {
    slug: 'two-point-museum', title: 'Two Point Museum',
    about: {
      ru: 'Менеджмент-комедия про свой музей: выставляйте скелеты динозавров, артефакты и космические диковины, управляйте персоналом и следите, чтобы посетители не трогали экспонаты. Фирменный юмор серии Two Point приложен.',
      en: 'A management comedy about running your own museum: display dinosaur skeletons, artefacts and space oddities, manage staff and keep visitors from touching the exhibits. The Two Point series’ signature humour included.',
    },
    feats: {
      ru: ['Выставки, которые проектируешь как дизайнер', 'Юмор серии — от вывесок до радиопередач', 'Разные типы музеев в одной кампании'],
      en: ['Exhibits you design like a real curator', 'Series humour — from signage to radio shows', 'Different museum types in one campaign'],
    },
  },
  {
    slug: 'planet-zoo', title: 'Planet Zoo',
    about: {
      ru: 'Постройте зоопарк мечты: реалистичные животные с потребностями, генетикой и поведением, и строительство вольеров до последнего камня. От создателей Planet Coaster — красота, зоология и менеджмент в одном.',
      en: 'Build the zoo of your dreams: realistic animals with needs, genetics and behaviour, and enclosure construction down to the last rock. From the creators of Planet Coaster — beauty, zoology and management in one.',
    },
    feats: {
      ru: ['Животные выглядят и ведутся как настоящие', 'Строительный редактор без границ фантазии', 'Программы разведения и возврата в природу'],
      en: ['Animals that look and behave like the real thing', 'A building editor with no limits', 'Breeding programmes and release to the wild'],
    },
  },
  {
    slug: 'among-us', title: 'Among Us',
    about: {
      ru: 'Экипаж космической станции чинит системы, а среди них один-три предателя, которые саботируют и устраняют. Обсуждения и голосования — настоящая игра: блеф, логика и предательства, которые запоминаются надолго.',
      en: 'A space-station crew fixes systems while one to three impostors sabotage and eliminate. The discussions and votes are the real game: bluff, logic and betrayals you remember for a long time.',
    },
    feats: {
      ru: ['Социальная дедукция в чистом виде', 'Правила объясняются за минуту', 'Кроссплатформа: телефоны, ПК и консоли вместе'],
      en: ['Social deduction in its purest form', 'Rules explained in a minute', 'Crossplay: phones, PC and consoles together'],
    },
  },
  {
    slug: 'minecraft-dungeons', title: 'Minecraft Dungeons',
    about: {
      ru: 'Диаблоид во вселенной Minecraft: подземелья, толпы мобов и снаряжение с чарами без сложных цифр. Идеальный вход в жанр для младших и уютный кооператив для семьи до четырёх героев.',
      en: 'A Diablo-like in the Minecraft universe: dungeons, mobs and gear with enchantments but no complicated numbers. A perfect entry point for younger players and a cosy co-op for a family of four.',
    },
    feats: {
      ru: ['Экшен-РПГ без порогов сложности понимания', 'Локальный и онлайн кооператив до четырёх', 'Знакомые мобы Майнкрафта в роли боссов'],
      en: ['Action RPG with no comprehension barriers', 'Local and online co-op for four', 'Familiar Minecraft mobs as bosses'],
    },
  },
  {
    slug: 'lego-star-wars-the-skywalker-saga', title: 'LEGO Star Wars: The Skywalker Saga',
    about: {
      ru: 'Все девять фильмов саги в одной игре: летайте по галактике, собирайте сотни персонажей и проходите знакомые сцены с фирменным лего-юмором. Самый большой и красивый лего-проект с кооперативом на одном экране.',
      en: 'All nine saga films in one game: fly across the galaxy, collect hundreds of characters and replay familiar scenes with signature LEGO humour. The biggest, best-looking LEGO project with same-screen co-op.',
    },
    feats: {
      ru: ['Вся сага Скайуокеров в одной коробке', 'Кооператив на одном диване', 'Галактика, открытая для свободного полёта'],
      en: ['The whole Skywalker saga in one box', 'Same-couch co-op', 'A galaxy open for free flight'],
    },
  },
  {
    slug: 'mario-kart-8-deluxe', title: 'Mario Kart 8 Deluxe',
    about: {
      ru: 'Главная гонка вечеринок: сорок восемь трасс, все любимые персонажи и предметы, превращающие последний круг в хаос. Версия для Switch собрала весь контент и стала самой продаваемой игрой консоли.',
      en: 'The ultimate party racer: forty-eight tracks, every beloved character and items that turn the last lap into chaos. The Switch edition gathered all the content and became the console’s best-selling game.',
    },
    feats: {
      ru: ['Лучшая игра для вечеринки — проверено десятилетиями', '48 трасс в комплекте', 'Гонки на восемь игроков локально и двенадцать онлайн'],
      en: ['The best party game — proven for decades', '48 tracks included', 'Eight-player local and twelve-player online races'],
    },
  },
  {
    slug: 'genshin-impact', title: 'Genshin Impact',
    about: {
      ru: 'Бесплатный аниме-экшен в открытом мире Тейвата: семь стран со своей культурой и стихией, отряды из четырёх героев и комбо из стихийных реакций. Обновления с новыми регионами выходят по расписанию уже годы.',
      en: 'A free-to-play anime action game in the open world of Teyvat: seven nations with their own culture and element, four-hero teams and elemental-reaction combos. New-region updates have shipped on schedule for years.',
    },
    feats: {
      ru: ['Огромный открытый мир без обязательных трат', 'Стихийные реакции делают бой изобретательным', 'Кооператив до четырёх исследователей'],
      en: ['A huge open world with no forced spending', 'Elemental reactions make combat inventive', 'Co-op for up to four explorers'],
    },
  },
  {
    slug: 'honkai-star-rail', title: 'Honkai: Star Rail',
    about: {
      ru: 'Пошаговая космоопера от создателей Genshin: экспресс везёт команду по мирам, каждый со своей историей, а бои строятся на пробитии слабостей и суперприёмах. Щедрый бесплатный режим и кинематографичные сюжетные арки.',
      en: 'A turn-based space opera from the creators of Genshin: an express carries your team between worlds, each with its own story, and battles are built on breaking weaknesses and ultimates. A generous free mode and cinematic story arcs.',
    },
    feats: {
      ru: ['Пошаговый бой с глубиной для стратегов', 'Сюжет уровня консольных JRPG', 'Красивейшие анимации приёмов в жанре'],
      en: ['Turn-based combat with depth for tacticians', 'A story at the level of console JRPGs', 'The most beautiful ultimate animations in the genre'],
    },
  },
  {
    slug: 'brawl-stars', title: 'Brawl Stars',
    about: {
      ru: 'Мобильный командный экшен: матчи по три минуты, десятки бойцов и режимы от захвата кристаллов до футбольного «броубола». Легко начать, интересно оттачивать мастерство — стандарт мобильного киберспорта.',
      en: 'A mobile team action game: three-minute matches, dozens of brawlers and modes from crystal grab to brawler football. Easy to start, rewarding to master — a mobile esports standard.',
    },
    feats: {
      ru: ['Идеальный формат матча на три минуты', 'Командная игра решает больше, чем прокачка', 'Постоянные сезоны и новые бойцы'],
      en: ['A perfect three-minute match format', 'Teamwork outweighs progression', 'Constant seasons and new brawlers'],
    },
  },
  {
    slug: 'roblox', title: 'Roblox',
    about: {
      ru: 'Платформа с миллионами игр, созданных самими игроками: от обби и тайкунов до хорроров и ролевых миров. Здесь играют и учатся делать игры — многие популярные жанры мобильной эры начались именно тут.',
      en: 'A platform of millions of player-made games: from obbies and tycoons to horrors and roleplay worlds. People play here and learn to make games — many genres of the mobile era started right here.',
    },
    feats: {
      ru: ['Миллионы игр в одной платформе', 'Социальные миры, где собираются компании', 'Собственный движок для первых игр'],
      en: ['Millions of games on one platform', 'Social worlds where friend groups hang out', 'Its own engine for making first games'],
    },
  },
  {
    slug: 'fortnite', title: 'Fortnite',
    about: {
      ru: 'Не просто батл-рояль, а игровая вселенная: стройка и стрельба в классическом режиме, нулевая стройка, творческий режим и концерты на сотни миллионов зрителей. Сезонные коллаборации меняют карту до неузнаваемости.',
      en: 'Not just a battle royale but a gaming universe: building and shooting in the classic mode, zero-build, creative mode and concerts watched by hundreds of millions. Seasonal crossovers reshape the map beyond recognition.',
    },
    feats: {
      ru: ['Культурный феномен с крупнейшими коллаборациями', 'Режимы на любой вкус без платы за вход', 'Постоянная эволюция карты и правил'],
      en: ['A cultural phenomenon with the biggest crossovers', 'Modes for every taste with no entry fee', 'Constant evolution of the map and rules'],
    },
  },
  {
    slug: 'monster-hunter-wilds', title: 'Monster Hunter Wilds',
    about: {
      ru: 'Новая глава охоты на гигантских монстров: бесшовные Запретные земли с динамической погодой и стаями хищников, отряд до четырёх охотников и оружие, у которого появились приёмы на лету. Охота, разделка и ковка брони из добычи.',
      en: 'The next chapter of giant-monster hunting: the seamless Forbidden Lands with dynamic weather and predator packs, squads of up to four hunters and weapons with new on-the-fly arts. Hunt, carve and forge armour from your prey.',
    },
    feats: {
      ru: ['Бесшовный мир вместо отдельных миссий', 'Каждое оружие — отдельная школа игры', 'Кооперативная охота — сердце серии'],
      en: ['A seamless world instead of separate missions', 'Every weapon is its own school of play', 'Co-op hunting is the heart of the series'],
    },
  },
  {
    slug: 'dune-awakening', title: 'Dune: Awakening',
    about: {
      ru: 'Выживание в открытом мире Арракиса: вода — главная валюта, песчаные черви рушат планы, а политики великих домов делят планету. Стройте базы, летайте на орнитоптерах и выжимайте пряность среди тысяч игроков на одном сервере.',
      en: 'Open-world survival on Arrakis: water is the true currency, sandworms ruin plans, and the great houses divide the planet. Build bases, fly ornithopters and harvest spice among thousands of players on one server.',
    },
    feats: {
      ru: ['Арракис как живой мир с экологией', 'Тысячи игроков в одной политической песочнице', 'Механика воды меняет каждое решение'],
      en: ['Arrakis as a living world with an ecology', 'Thousands of players in one political sandbox', 'Water mechanics change every decision'],
    },
  },
];
