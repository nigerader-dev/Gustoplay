/**
 * Подборки под поисковые запросы: /top/:id, оглавление — /podborki
 * (не /top: файл top.html рядом с папкой top/ сервер путает с каталогом).
 *
 * Каждая подборка — это готовый набор фильтров каталога плюс заголовок и текст,
 * написанные под то, как люди ищут («кооп игры на ПК», «игры на двоих на одном ПК»).
 * Страницы жанров и тегов отвечают на запрос из одного слова; подборки закрывают
 * сочетания («кооп» + «слабый ПК», «бесплатно» + «с друзьями»), которых в каталоге
 * нет отдельными адресами.
 *
 * Правила (проверяются в tools/check-catalog.mjs):
 *  • id — транслит запроса через дефис: он виден в адресе и подсвечивается в выдаче;
 *  • никаких чисел в текстах — количество игр подставляется из каталога ({n});
 *  • у каждой подборки минимум 2 абзаца ru и не меньше 8 игр;
 *  • related — ссылки на другие подборки (top:…) или страницы таксономии.
 */
import { t, getLang } from '../i18n.js';
import { esc } from './components.js';
import { icon } from '../icons.js';

const COOP = ['coopOnline', 'coopLocal'];
const COUCH = ['coopLocal', 'pvpLocal'];

export const COLLECTIONS = {
  'koop-igry-na-pk': {
    icon: 'users',
    filters: { modes: COOP, platforms: ['pc'] },
    h1: { ru: 'Кооп игры на ПК', en: 'Co-op games on PC' },
    title: { ru: 'Кооп игры на ПК: кооперативные игры с друзьями', en: 'Co-op games on PC to play with friends' },
    meta: {
      ru: 'Кооперативные игры на ПК: по сети и на одном экране, на двоих и на компанию. Фильтры по цене, жанру и числу игроков.',
      en: 'Co-op games on PC, online and couch, for two players or a whole group. Filter by price, genre and player count.',
    },
    intro: {
      ru: [
        'Здесь собраны игры, где вы играете вместе, а не друг против друга: проходите сюжет, строите базу, выживаете или отбиваетесь от волн врагов. Есть и кооп по сети, и игры на одном компьютере с геймпадами.',
        'Список отсортирован по оценкам игроков. Если нужен конкретный вариант, сузьте его слева: жанр, цена, сколько вас и сколько времени готовы потратить. В карточке каждой игры видно, сколько игроков она поддерживает и есть ли русский язык.',
      ],
      en: ['Games where you play together rather than against each other: story campaigns, base building, survival and wave defence, both online and on one PC. Sorted by player ratings; narrow it down with the filters.'],
    },
    faq: {
      ru: [
        ['Чем кооп отличается от мультиплеера?', 'Мультиплеер — любая игра для нескольких человек, в том числе соревнования. Кооп — когда все играют в одной команде против игры. В этой подборке только кооп.'],
        ['Нужно ли каждому покупать игру?', 'Для игры по сети обычно да. Исключения — игры с Remote Play Together в Steam и бесплатные игры: их можно найти фильтром «Бесплатно».'],
      ],
    },
    related: ['top:igry-na-dvoih-na-odnom-pk', 'top:koop-dlya-slabyh-pk', 'top:besplatnye-koop-igry'],
  },

  'igry-na-dvoih-na-odnom-pk': {
    icon: 'gamepad',
    filters: { modes: COUCH, platforms: ['pc'] },
    h1: { ru: 'Игры на двоих на одном ПК', en: 'Two-player games on one PC' },
    title: { ru: 'Игры на двоих на одном ПК: за одним экраном и клавиатурой', en: 'Two-player games on one PC: couch and split-screen' },
    meta: {
      ru: 'Игры на двоих на одном компьютере: за одним экраном или с разделённым экраном. Кооп и соревнования, есть недорогие и бесплатные.',
      en: 'Games for two on one computer: shared screen or split-screen, co-op and versus, including cheap and free ones.',
    },
    intro: {
      ru: [
        'Игры, в которые вдвоём играют на одном компьютере: оба сидят перед одним монитором, второму не нужен свой ПК и своя копия игры. Подойдут для вечера с другом, девушкой или ребёнком.',
        'Удобнее всего с двумя геймпадами, но во многие можно играть и вдвоём за одной клавиатурой или клавиатура плюс геймпад. В подборке и кооп, и игры друг против друга — нужный режим отмечен на карточке.',
      ],
      en: ['Games two people can play on a single computer: one screen, one copy of the game. Best with two controllers, though many also work with one keyboard or keyboard plus controller.'],
    },
    faq: {
      ru: [
        ['Можно ли играть вдвоём на одной клавиатуре?', 'Во многие из этих игр — да, но удобнее с геймпадом: на клавиатуре двоим тесно. Подойдёт любой геймпад для ПК, включая от PlayStation и Xbox.'],
        ['А если друг далеко?', 'Многие игры для одного экрана работают через Remote Play Together в Steam: игру покупает один, второй подключается по ссылке.'],
      ],
    },
    related: ['top:igry-na-dvoih-po-seti', 'tag:splitscreen', 'top:igry-s-devushkoj'],
  },

  'igry-na-dvoih-po-seti': {
    icon: 'globe',
    filters: { modes: ['coopOnline'], tags: ['friendlier2', 'coopfocused'] },
    h1: { ru: 'Игры на двоих по сети', en: 'Online co-op for two' },
    title: { ru: 'Игры на двоих по сети: во что поиграть с другом онлайн', en: 'Online games for two: what to play with a friend' },
    meta: {
      ru: 'Во что поиграть с другом по сети: кооп-игры, которые задуманы для двоих или раскрываются именно в паре. С оценками и ценами.',
      en: 'What to play with a friend online: co-op games designed for two or at their best as a pair, with ratings and prices.',
    },
    intro: {
      ru: [
        'Игры для двоих по интернету, где кооп — главное, а не приложение к одиночной кампании. Часть из них сделана строго на двоих, остальные отлично играются вдвоём, хотя пускают и больше людей.',
        'Перед покупкой проверьте карточку: там видно, нужна ли копия игры каждому и на каких платформах она есть. Если вы с другом на разных платформах, ищите отметку о кроссплее.',
      ],
      en: ['Online games where co-op is the point, not an extra. Some are strictly for two, the rest are at their best as a pair. Check each card for platforms and whether both of you need a copy.'],
    },
    faq: {
      ru: [
        ['Во что поиграть с другом, если у нас разный вкус?', 'Пройдите подбор для компании: каждый отмечает, что ему нравится, и сайт покажет игры, которые подойдут обоим.'],
        ['Есть ли бесплатные игры на двоих по сети?', 'Есть — включите фильтр «Бесплатно» или откройте подборку бесплатных кооп-игр.'],
      ],
    },
    related: ['top:besplatnye-koop-igry', 'top:igry-na-dvoih-na-odnom-pk', 'tag:friendlier2'],
  },

  'igry-dlya-kompanii-druzej': {
    icon: 'crowd',
    filters: { modes: COOP, players: 4 },
    h1: { ru: 'Игры для компании друзей', en: 'Games for a group of friends' },
    title: { ru: 'Игры для компании друзей: кооп на 4 игрока и больше', en: 'Games for a group of friends: co-op for 4+' },
    meta: {
      ru: 'Кооп-игры для компании от четырёх человек: по сети и на одном экране. Подбор под вкус каждого, фильтры по цене и платформе.',
      en: 'Co-op games for four or more players, online and couch, with filters for price and platform.',
    },
    intro: {
      ru: [
        'Игры, в которые можно позвать троих и больше друзей сразу, и никто не будет ждать своей очереди. Здесь только кооп: вся компания играет за одну сторону.',
        'Если в компании разные вкусы, откройте подбор для компании: каждый отметит свои предпочтения, и сайт оставит игры, которые понравятся всем. Ещё стоит проверить цену: для большой компании бесплатная игра часто решает вопрос, во что играть.',
      ],
      en: ['Games you can play with three or more friends at once, all on the same side. If tastes differ, use the group picker so everyone adds their preferences.'],
    },
    faq: {
      ru: [
        ['Во что поиграть большой компанией на одном экране?', 'Включите фильтр «Кооп за одним экраном»: останутся игры, где все сидят перед одним телевизором или монитором.'],
        ['Как выбрать игру, чтобы понравилась всем?', 'Через подбор для компании: он учитывает отметки каждого и показывает пересечение.'],
      ],
    },
    related: ['tag:lobbybig', 'top:igry-dlya-vecherinki', 'top:besplatnye-koop-igry'],
  },

  'koop-dlya-slabyh-pk': {
    icon: 'gauge',
    filters: { modes: COOP, tags: ['lowsysreq'] },
    h1: { ru: 'Кооп игры для слабых ПК', en: 'Co-op games for low-end PCs' },
    title: { ru: 'Кооп игры для слабых ПК и ноутбуков', en: 'Co-op games for low-end PCs and laptops' },
    meta: {
      ru: 'Кооперативные игры, которые идут на слабом компьютере и ноутбуке: с низкими системными требованиями, на двоих и на компанию.',
      en: 'Co-op games that run on weak computers and laptops: low system requirements, for two or a group.',
    },
    intro: {
      ru: [
        'Кооп-игры с низкими системными требованиями: пойдут на старом компьютере, офисном ноутбуке или встроенной видеокарте. Удобно, когда у кого-то из компании слабое железо, а играть хочется всем вместе.',
        'На странице каждой игры есть минимальные требования и проверка «Потянет ли мой ПК»: укажите процессор, видеокарту и память — сайт сравнит их с требованиями игры.',
      ],
      en: ['Co-op games with low system requirements that run on old PCs, office laptops and integrated graphics. Each game page has a “Will my PC run it” check.'],
    },
    faq: {
      ru: [
        ['Как понять, потянет ли игру мой компьютер?', 'Откройте страницу игры и заполните проверку ПК: процессор, видеокарта и объём памяти. Сайт сравнит их с минимальными требованиями.'],
        ['Пойдут ли эти игры на ноутбуке без видеокарты?', 'Большинство — да, на встроенной графике при низких настройках. Точнее покажет проверка ПК на странице игры.'],
      ],
    },
    related: ['top:igry-dlya-slabyh-pk', 'top:besplatnye-koop-igry', 'top:koop-igry-na-pk'],
  },

  'besplatnye-koop-igry': {
    icon: 'gift',
    filters: { modes: COOP, price: 'free' },
    h1: { ru: 'Бесплатные кооп игры', en: 'Free co-op games' },
    title: { ru: 'Бесплатные кооп игры: во что поиграть с друзьями бесплатно', en: 'Free co-op games to play with friends' },
    meta: {
      ru: 'Бесплатные кооперативные игры для двоих и компании: на ПК, консолях и телефоне. Без покупки — только скачать и позвать друзей.',
      en: 'Free co-op games for two or a group on PC, consoles and mobile: download and invite your friends.',
    },
    intro: {
      ru: [
        'Кооп-игры, за которые не нужно платить: скачали, позвали друзей и играете. Лучший вариант, когда в компании никто не хочет покупать игру «на попробовать» или у всех разный бюджет.',
        'Бесплатные игры обычно зарабатывают на покупках внутри игры. Где они влияют на игру, а где только косметика, видно по меткам в карточке. Сюда же попадают игры, доступные по подписке.',
      ],
      en: ['Co-op games you do not have to pay for: download, invite friends, play. Most earn money from in-game purchases — the card tags show where they matter.'],
    },
    faq: {
      ru: [
        ['Правда ли эти игры бесплатные?', 'Да, сама игра бесплатна. Внутри могут быть покупки — обычно косметика или ускорение прогресса.'],
        ['Какие бесплатные кооп игры пойдут на слабом ПК?', 'Откройте подборку кооп-игр для слабых ПК и включите фильтр «Бесплатно».'],
      ],
    },
    related: ['top:besplatnye-igry-na-pk', 'top:koop-dlya-slabyh-pk', 'top:igry-na-dvoih-po-seti'],
  },

  'besplatnye-igry-na-pk': {
    icon: 'gift',
    filters: { platforms: ['pc'], price: 'free' },
    h1: { ru: 'Бесплатные игры на ПК', en: 'Free games on PC' },
    title: { ru: 'Бесплатные игры на ПК: лучшие по оценкам игроков', en: 'Free PC games ranked by player ratings' },
    meta: {
      ru: 'Бесплатные игры на компьютер: одиночные, кооп и онлайн, отсортированные по оценкам игроков. Фильтры по жанру и режиму.',
      en: 'Free games for PC — solo, co-op and online — sorted by player ratings, with genre and mode filters.',
    },
    intro: {
      ru: [
        'Игры на компьютер, которые можно скачать и играть без покупки. Тут и сетевые шутеры, и стратегии, и игры с друзьями, и несколько одиночных. Сначала идут игры с лучшими оценками игроков.',
        'Чтобы не листать всё подряд, выберите жанр или режим слева. Если хотите, чтобы сайт подобрал игру под ваш вкус, пройдите короткий опрос — это займёт около минуты.',
      ],
      en: ['PC games you can download and play without buying: online shooters, strategy, co-op and a few single-player titles, best-rated first.'],
    },
    faq: {
      ru: [
        ['Где скачать эти игры?', 'На странице игры есть ссылки на официальные магазины: Steam, Epic Games Store и другие. Скачивайте только оттуда.'],
        ['Есть ли бесплатные игры без доната?', 'Есть: ищите в карточке отсутствие метки о покупках внутри игры.'],
      ],
    },
    related: ['top:besplatnye-koop-igry', 'top:igry-dlya-slabyh-pk', 'platform:pc'],
  },

  'igry-dlya-slabyh-pk': {
    icon: 'gauge',
    filters: { platforms: ['pc'], tags: ['lowsysreq'] },
    h1: { ru: 'Игры для слабых ПК', en: 'Games for low-end PCs' },
    title: { ru: 'Игры для слабых ПК и ноутбуков: что пойдёт без мощной видеокарты', en: 'Games for low-end PCs and laptops' },
    meta: {
      ru: 'Хорошие игры для слабого компьютера и ноутбука: низкие системные требования, проверка «потянет ли мой ПК» на каждой странице.',
      en: 'Good games for weak computers and laptops: low system requirements and a “will my PC run it” check on each page.',
    },
    intro: {
      ru: [
        'Игры, которым не нужна мощная видеокарта: они идут на старых компьютерах, офисных ноутбуках и встроенной графике. При этом это не «игры попроще», а хиты с высокими оценками — просто нетребовательные.',
        'Для каждой игры можно проверить свой компьютер: укажите процессор, видеокарту и память на странице игры, и сайт сравнит их с минимальными требованиями.',
      ],
      en: ['Well-rated games that do not need a powerful graphics card: they run on old desktops, office laptops and integrated graphics.'],
    },
    faq: {
      ru: [
        ['Какой компьютер считается слабым?', 'Обычно это встроенная видеокарта или старая дискретная, до 8 ГБ памяти и процессор старше пяти-шести лет.'],
        ['Как проверить, пойдёт ли игра?', 'На странице игры есть проверка ПК: выберите свои комплектующие, и сайт покажет, хватит ли их.'],
      ],
    },
    related: ['top:koop-dlya-slabyh-pk', 'top:besplatnye-igry-na-pk', 'top:korotkie-igry-na-vecher'],
  },

  'igry-s-devushkoj': {
    icon: 'heart',
    filters: { modes: COOP, tags: ['friendlier2', 'cozy', 'easytolearn', 'funny'] },
    h1: { ru: 'Во что поиграть с девушкой', en: 'Games to play with your partner' },
    title: { ru: 'Во что поиграть с девушкой или парнем: игры на двоих', en: 'Games to play with your girlfriend or boyfriend' },
    meta: {
      ru: 'Игры для пары: уютный кооп, весёлые игры на двоих и игры, которые легко освоить, если второй человек играет редко.',
      en: 'Games for couples: cosy co-op, funny two-player games and easy-to-learn titles for partners who rarely play.',
    },
    intro: {
      ru: [
        'Игры для двоих, где не нужно соревноваться и быть опытным игроком: уютный кооп, смешные приключения и игры, которые легко освоить за пару минут. Хорошо подходят, если один из пары играет редко.',
        'Если хотите точнее, пройдите подбор для компании вдвоём: каждый отметит, что ему нравится, и сайт оставит игры, которые подойдут обоим.',
      ],
      en: ['Two-player games with no competition and no skill barrier: cosy co-op, funny adventures and games that take minutes to learn.'],
    },
    faq: {
      ru: [
        ['Во что поиграть, если девушка не играет в игры?', 'Начните с игр с меткой «Легко освоить»: управление простое, а ошибки не наказываются.'],
        ['Можно ли играть на одном компьютере?', 'Да, часть игр из подборки работает на одном экране — включите фильтр «Кооп за одним экраном».'],
      ],
    },
    related: ['top:igry-na-dvoih-na-odnom-pk', 'tag:cozy', 'top:igry-na-dvoih-po-seti'],
  },

  'koop-horrory': {
    icon: 'ghost',
    filters: { modes: COOP, genres: ['horror'] },
    h1: { ru: 'Кооп хорроры', en: 'Co-op horror games' },
    title: { ru: 'Кооп хорроры: страшные игры с друзьями', en: 'Co-op horror games to play with friends' },
    meta: {
      ru: 'Хорроры для игры с друзьями: кооп по сети и на одном экране. Страшно вместе — от лёгких страшилок до настоящего ужаса.',
      en: 'Horror games to play with friends online or on one screen, from light scares to real dread.',
    },
    intro: {
      ru: [
        'Страшные игры, в которые играют компанией: вместе исследуете заброшенные места, прячетесь от монстров и выполняете задания, пока кто-то кричит в микрофон. Вдвоём страшно по-другому — и обычно смешнее.',
        'Уровень страха разный: от лёгких игр с юмором до тяжёлых хорроров. Шкала напряжения и метки в карточке помогут выбрать по силам всей компании.',
      ],
      en: ['Scary games for groups: explore abandoned places, hide from monsters and complete objectives together. Scare levels vary — check the tension meter on each card.'],
    },
    faq: {
      ru: [
        ['Какие кооп хорроры подойдут новичкам?', 'Ищите метку «Легко освоить» или сортируйте по коротким играм — с них проще начать.'],
        ['Есть ли хорроры на двоих на одном ПК?', 'Есть, но их мало: большинство кооп-хорроров играется по сети.'],
      ],
    },
    related: ['genre:horror', 'mood:scare', 'top:koop-vyzhivanie'],
  },

  'koop-vyzhivanie': {
    icon: 'tent',
    filters: { modes: COOP, genres: ['survival'] },
    h1: { ru: 'Кооп выживание', en: 'Co-op survival games' },
    title: { ru: 'Кооп выживание: игры на выживание с друзьями', en: 'Co-op survival games with friends' },
    meta: {
      ru: 'Игры на выживание с друзьями: строите базу, добываете ресурсы и вместе переживаете ночи. По сети, на двоих и на компанию.',
      en: 'Survival games with friends: build a base, gather resources and make it through the night together.',
    },
    intro: {
      ru: [
        'Игры, где вы с друзьями начинаете с пустыми руками: собираете ресурсы, строите укрытие, следите за голодом и отбиваетесь от врагов. Вдвоём проще делить обязанности: один строит, другой добывает.',
        'В жанре много долгих игр на десятки часов — посмотрите длительность в карточке. Для вечера подойдут короткие сессии, для долгой компании — игры с выделенным сервером.',
      ],
      en: ['Start with nothing, gather resources, build shelter and fight off threats together. Many survival games run for dozens of hours — check the length on each card.'],
    },
    faq: {
      ru: [
        ['Можно ли играть, когда друга нет в сети?', 'В части игр можно поставить свой сервер, и мир живёт без хозяина. Об этом сказано на странице игры.'],
        ['Какие игры на выживание пойдут на слабом ПК?', 'Добавьте фильтр «Не требует мощного ПК» или откройте подборку кооп-игр для слабых ПК.'],
      ],
    },
    related: ['genre:survival', 'top:koop-pesochnicy', 'top:koop-horrory'],
  },

  'koop-rpg': {
    icon: 'shield',
    filters: { modes: COOP, genres: ['rpg'] },
    h1: { ru: 'Кооп RPG', en: 'Co-op RPGs' },
    title: { ru: 'Кооп RPG: ролевые игры с друзьями', en: 'Co-op RPGs to play with friends' },
    meta: {
      ru: 'Ролевые игры с кооперативом: проходите сюжет, качайте героев и собирайте снаряжение вместе с друзьями. На ПК и консолях.',
      en: 'Role-playing games with co-op: play the story, level heroes and collect gear together with friends.',
    },
    intro: {
      ru: [
        'Ролевые игры, где сюжет и прокачку можно проходить вместе: каждый ведёт своего героя, а бои и решения общие. Есть и классические RPG с видом сверху, и экшен-RPG, и игры про сбор снаряжения.',
        'Обратите внимание на длину: многие RPG рассчитаны на десятки часов, и вам понадобится общее расписание. Если времени мало, отфильтруйте игры покороче.',
      ],
      en: ['Role-playing games where you can share the story and the progression: each player has a hero, fights and choices are shared. Many are long — filter by length if time is short.'],
    },
    faq: {
      ru: [
        ['Сохраняется ли прогресс у обоих игроков?', 'Обычно у хозяина игры сохраняется сюжет, а у гостя — герой и снаряжение. Детали зависят от игры.'],
        ['Какие кооп RPG можно пройти за пару вечеров?', 'В фильтрах выберите длительность до 20 часов.'],
      ],
    },
    related: ['genre:rpg', 'top:syuzhetnye-koop-igry', 'top:koop-igry-na-pk'],
  },

  'koop-shutery': {
    icon: 'crosshair',
    filters: { modes: COOP, genres: ['shooter'] },
    h1: { ru: 'Кооп шутеры', en: 'Co-op shooters' },
    title: { ru: 'Кооп шутеры: стрелялки с друзьями против ботов и монстров', en: 'Co-op shooters with friends' },
    meta: {
      ru: 'Кооперативные шутеры: команда друзей против волн врагов, монстров и ботов. Без соревнований с другими игроками.',
      en: 'Co-op shooters: a team of friends against waves of enemies, monsters and bots, no player-versus-player.',
    },
    intro: {
      ru: [
        'Шутеры, где вы стреляете не друг в друга, а вместе: против зомби, пришельцев, роботов или солдат. Подходят тем, кто устал от соревновательных сетевых шутеров и хочет играть без давления.',
        'Большинству нужна команда из трёх-четырёх человек, но многие играются и вдвоём — недостающих напарников заменяют боты. Число игроков указано в карточке.',
      ],
      en: ['Shooters where you fight together rather than each other — against zombies, aliens, robots or soldiers. Most suit a squad of three or four, many also work as a pair.'],
    },
    faq: {
      ru: [
        ['Можно ли играть вдвоём, если игра на четверых?', 'Чаще всего да: свободные места занимают боты или подбираются случайные игроки.'],
        ['Есть ли бесплатные кооп шутеры?', 'Есть — включите фильтр «Бесплатно».'],
      ],
    },
    related: ['genre:shooter', 'top:koop-horrory', 'top:igry-dlya-kompanii-druzej'],
  },

  'koop-strategii': {
    icon: 'flag',
    filters: { modes: COOP, genres: ['strategy', 'tactics'] },
    h1: { ru: 'Кооп стратегии', en: 'Co-op strategy games' },
    title: { ru: 'Кооп стратегии: стратегии с другом против компьютера', en: 'Co-op strategy games with a friend' },
    meta: {
      ru: 'Стратегии и тактические игры с кооперативом: вдвоём против компьютера, общие кампании и совместное строительство.',
      en: 'Strategy and tactics games with co-op: team up against the AI, play shared campaigns and build together.',
    },
    intro: {
      ru: [
        'Стратегии, в которых можно воевать на одной стороне: общие кампании, оборона против компьютера, совместное развитие одной страны или базы. Хороший вариант для тех, кто любит думать, а не только реагировать.',
        'Здесь и пошаговые игры, и стратегии в реальном времени. Пошаговые удобнее для неторопливой игры по вечерам, в реальном времени — для тех, кто любит темп.',
      ],
      en: ['Strategy games where you fight on the same side: shared campaigns, defending against the AI, building one empire or base together. Both turn-based and real-time.'],
    },
    faq: {
      ru: [
        ['Есть ли стратегии на двоих на одном ПК?', 'Есть пошаговые игры с режимом «передай управление» — в карточке это видно по режиму «Кооп за одним экраном».'],
        ['Подойдут ли они новичкам?', 'Ищите метку «Легко освоить»: в таких играх понятное обучение.'],
      ],
    },
    related: ['genre:strategy', 'genre:tactics', 'top:koop-pesochnicy'],
  },

  'koop-pesochnicy': {
    icon: 'box',
    filters: { modes: COOP, genres: ['sandbox', 'building'] },
    h1: { ru: 'Кооп песочницы и строительство', en: 'Co-op sandbox and building games' },
    title: { ru: 'Кооп песочницы: строить и творить с друзьями', en: 'Co-op sandbox and building games' },
    meta: {
      ru: 'Песочницы и игры про строительство, где можно творить вместе: общий мир, база, ферма или завод. Без спешки и с друзьями.',
      en: 'Sandbox and building games you can share: one world, base, farm or factory, built together at your own pace.',
    },
    intro: {
      ru: [
        'Игры, где главное — не победить, а построить: общий мир, дом, ферму, завод или целый город. Каждый занимается своим делом, и вместе получается то, что одному строить долго.',
        'Такие игры хороши на долгую компанию: к общему миру удобно возвращаться неделями. Многие позволяют играть и тем, кто зашёл ненадолго.',
      ],
      en: ['Games where the goal is to build, not to win: a shared world, house, farm, factory or city. Great for long-running groups that return week after week.'],
    },
    faq: {
      ru: [
        ['Можно ли играть в общем мире без хозяина?', 'В некоторых играх — да, через выделенный сервер. Это указано на странице игры.'],
        ['Подходят ли они детям?', 'Многие да — смотрите метку «Можно играть с детьми».'],
      ],
    },
    related: ['genre:sandbox', 'genre:building', 'top:koop-vyzhivanie'],
  },

  'koop-rogaliki': {
    icon: 'dice',
    filters: { modes: COOP, genres: ['roguelike'] },
    h1: { ru: 'Кооп рогалики', en: 'Co-op roguelikes' },
    title: { ru: 'Кооп рогалики: забеги с друзьями на один вечер', en: 'Co-op roguelikes for short sessions with friends' },
    meta: {
      ru: 'Рогалики с кооперативом: короткие забеги, случайные уровни и новая сборка героя каждый раз. Для двоих и компании.',
      en: 'Co-op roguelikes: short runs, random levels and a new build every time, for two or a group.',
    },
    intro: {
      ru: [
        'Рогалики — игры из коротких забегов: уровни каждый раз новые, а после поражения начинаешь сначала, но чуть сильнее. Вместе это особенно весело: можно комбинировать способности и спасать напарника.',
        'Удобны, когда времени мало: один забег длится от пятнадцати минут до часа, и его не нужно сохранять.',
      ],
      en: ['Roguelikes are built from short runs with new levels each time. Together you can combine abilities and save each other; one run fits into an evening.'],
    },
    faq: {
      ru: [
        ['Чем рогалик отличается от обычной игры?', 'После смерти начинаешь заново, а уровни генерируются случайно. Зато каждый забег разный.'],
        ['Сколько длится одна партия?', 'Обычно от пятнадцати минут до часа.'],
      ],
    },
    related: ['genre:roguelike', 'top:korotkie-igry-na-vecher', 'top:koop-shutery'],
  },

  'syuzhetnye-koop-igry': {
    icon: 'book',
    filters: { modes: COOP, tags: ['storyrich'] },
    h1: { ru: 'Сюжетные кооп игры', en: 'Story-driven co-op games' },
    title: { ru: 'Сюжетные кооп игры: пройти историю вдвоём', en: 'Story-driven co-op games to play together' },
    meta: {
      ru: 'Кооп-игры с сильным сюжетом: проходите историю вместе с другом, обсуждаете решения и смотрите финал вдвоём.',
      en: 'Co-op games with a strong story: play through it with a friend, discuss choices and see the ending together.',
    },
    intro: {
      ru: [
        'Игры, где кооп — способ вместе пройти историю: с персонажами, диалогами, поворотами и финалом. Хорошо для пары или двух друзей, которые хотят не просто стрелять, а узнать, чем всё закончится.',
        'Лучше играть одним составом от начала до конца: если подключить нового игрока на середине, он пропустит важное. Длина сюжета указана в карточке.',
      ],
      en: ['Games where co-op is a way to experience a story together — characters, dialogue, twists and an ending. Best played with the same partner start to finish.'],
    },
    faq: {
      ru: [
        ['Есть ли сюжетные игры на двоих на одном экране?', 'Есть — добавьте фильтр «Кооп за одним экраном».'],
        ['Нужно ли проходить предыдущие части?', 'Обычно нет, но это указано в описании игры, если важно.'],
      ],
    },
    related: ['top:syuzhetnye-igry', 'top:koop-rpg', 'top:igry-s-devushkoj'],
  },

  'igry-na-dvoih-na-ps': {
    icon: 'brandPs',
    filters: { platforms: ['ps'], modes: COUCH },
    h1: { ru: 'Игры на двоих на PlayStation', en: 'Two-player games on PlayStation' },
    title: { ru: 'Игры на двоих на PS4 и PS5: на одном экране', en: 'Two-player couch games on PS4 and PS5' },
    meta: {
      ru: 'Игры на двоих на одной PlayStation: кооп и соревнования за одним телевизором, с двумя геймпадами.',
      en: 'Two-player games on one PlayStation: co-op and versus on one TV with two controllers.',
    },
    intro: {
      ru: [
        'Игры для двоих на одной PlayStation: оба сидят перед одним телевизором, нужен только второй геймпад. Здесь и кооп, и игры друг против друга.',
        'Проверьте в карточке, есть ли игра на вашей версии консоли: большинство игр с PS4 запускаются и на PS5.',
      ],
      en: ['Games for two on one PlayStation: one TV, two controllers, co-op and versus. Most PS4 games also run on PS5.'],
    },
    faq: {
      ru: [
        ['Нужна ли подписка PS Plus для игры вдвоём?', 'Для игры на одной консоли — нет. Подписка нужна только для игры по сети.'],
        ['Пойдут ли игры с PS4 на PS5?', 'Почти все — да.'],
      ],
    },
    related: ['top:igry-na-dvoih-na-switch', 'top:igry-na-dvoih-na-odnom-pk', 'platform:ps'],
  },

  'igry-na-dvoih-na-switch': {
    icon: 'brandSwitch',
    filters: { platforms: ['switch', 'switch2'], modes: COUCH },
    h1: { ru: 'Игры на двоих на Nintendo Switch', en: 'Two-player games on Nintendo Switch' },
    title: { ru: 'Игры на двоих на Nintendo Switch: на одной консоли', en: 'Two-player games on one Nintendo Switch' },
    meta: {
      ru: 'Игры на двоих на одной Nintendo Switch: можно играть даже на двух половинках одного контроллера. Кооп и соревнования.',
      en: 'Two-player games on one Nintendo Switch, often with one Joy-Con each: co-op and versus.',
    },
    intro: {
      ru: [
        'Игры на одной Switch для двоих: во многие можно играть, разделив пару контроллеров — каждому по половинке. Удобно в поездке и в гостях.',
        'В подборке есть и игры для детей с родителями, и соревнования для вечеринки. Режим указан в карточке каждой игры.',
      ],
      en: ['Games for two on one Switch — many work with one Joy-Con each, handy for trips and visits. Includes family co-op and party versus games.'],
    },
    faq: {
      ru: [
        ['Можно ли играть вдвоём на одном Joy-Con?', 'Каждому по одному Joy-Con — да, во многих играх это основной режим.'],
        ['Пойдут ли игры на Switch 2?', 'Большинство игр для первой Switch работают и на второй.'],
      ],
    },
    related: ['top:igry-na-dvoih-na-ps', 'tag:family', 'platform:switch'],
  },

  'igry-s-druzyami-na-telefone': {
    icon: 'smartphone',
    filters: { platforms: ['mobile'], modes: ['coopOnline', 'pvpOnline', 'mmo'] },
    h1: { ru: 'Игры с друзьями на телефоне', en: 'Mobile games to play with friends' },
    title: { ru: 'Игры с друзьями на телефон: Android и iPhone', en: 'Mobile games with friends on Android and iPhone' },
    meta: {
      ru: 'Мобильные игры, в которые можно играть с друзьями по сети: кооп и соревнования на Android и iPhone.',
      en: 'Mobile games you can play online with friends: co-op and versus on Android and iPhone.',
    },
    intro: {
      ru: [
        'Игры на телефон, в которые играют вместе с друзьями: кооп, командные бои и онлайн-миры. Удобно, когда компьютера под рукой нет, а друзья в другом городе.',
        'Многие мобильные игры бесплатны и зарабатывают на покупках внутри. Метки в карточке подскажут, где покупки влияют на игру.',
      ],
      en: ['Phone games you play with friends: co-op, team battles and online worlds. Many are free and earn from in-game purchases.'],
    },
    faq: {
      ru: [
        ['Можно ли играть с другом, у которого iPhone, если у меня Android?', 'В большинстве онлайн-игр — да: аккаунт и сервер общие.'],
        ['Есть ли игры без интернета?', 'Отфильтруйте по метке «Играется без интернета».'],
      ],
    },
    related: ['platform:mobile', 'top:besplatnye-koop-igry', 'tag:touch'],
  },

  'korotkie-igry-na-vecher': {
    icon: 'hourglass',
    filters: { time: 'tiny' },
    h1: { ru: 'Короткие игры на один вечер', en: 'Short games for one evening' },
    title: { ru: 'Короткие игры на один-два вечера: до 8 часов', en: 'Short games you can finish in an evening or two' },
    meta: {
      ru: 'Короткие игры, которые проходятся за вечер или выходные: до восьми часов, с хорошими оценками. Сюжетные, кооп и головоломки.',
      en: 'Short games you can finish in an evening or a weekend — under eight hours and well rated.',
    },
    intro: {
      ru: [
        'Игры, которые проходятся за один-два вечера: не нужно держать в голове сюжет неделями и бросать на середине. Сюда попали сюжетные игры, головоломки и короткий кооп.',
        'Длительность взята из оценок игроков, проходивших игру. Если любите проходить всё на сто процентов, рассчитывайте на чуть большее время.',
      ],
      en: ['Games you can finish in one or two evenings — story games, puzzles and short co-op. Length is based on player completion times.'],
    },
    faq: {
      ru: [
        ['Откуда известна длительность игры?', 'Из данных игроков, которые прошли игру: берётся типичное время прохождения сюжета.'],
        ['Есть ли короткие игры на двоих?', 'Есть — добавьте режим «Кооп за одним экраном» или «Кооп по сети».'],
      ],
    },
    related: ['tag:short', 'top:syuzhetnye-igry', 'top:koop-rogaliki'],
  },

  'syuzhetnye-igry': {
    icon: 'film',
    filters: { modes: ['solo'], tags: ['storyrich'] },
    h1: { ru: 'Сюжетные игры', en: 'Story-driven games' },
    title: { ru: 'Сюжетные игры: с сильной историей для одного игрока', en: 'Story-driven single-player games' },
    meta: {
      ru: 'Одиночные игры с сильным сюжетом: интересные персонажи, повороты и запоминающийся финал. По оценкам игроков.',
      en: 'Single-player games with a strong story: memorable characters, twists and endings, by player ratings.',
    },
    intro: {
      ru: [
        'Игры, в которые играют ради истории: персонажи, диалоги, выборы и финал, о котором думаешь потом. Все — для одного игрока, чтобы никто не торопил.',
        'Здесь разные жанры: от приключений и RPG до хорроров и интерактивного кино. Сузьте выбор жанром или настроением, а длительность подскажет, на сколько вечеров рассчитывать.',
      ],
      en: ['Games you play for the story: characters, dialogue, choices and an ending you keep thinking about. All single-player, across many genres.'],
    },
    faq: {
      ru: [
        ['Есть ли сюжетные игры для слабого ПК?', 'Есть — добавьте метку «Не требует мощного ПК».'],
        ['А сюжетные игры на двоих?', 'Для этого есть отдельная подборка сюжетных кооп-игр.'],
      ],
    },
    related: ['top:syuzhetnye-koop-igry', 'mood:story', 'top:korotkie-igry-na-vecher'],
  },

  'igry-dlya-vecherinki': {
    icon: 'music',
    filters: { genres: ['party'], modes: COUCH },
    h1: { ru: 'Игры для вечеринки на одном экране', en: 'Party games on one screen' },
    title: { ru: 'Игры для вечеринки: весёлые игры для компании на одном экране', en: 'Party games for a group on one screen' },
    meta: {
      ru: 'Весёлые игры для вечеринки и большой компании: на одном экране, с короткими раундами и простыми правилами.',
      en: 'Fun party games for a big group on one screen, with short rounds and simple rules.',
    },
    intro: {
      ru: [
        'Игры для гостей: короткие раунды, простые правила и много смеха. Подойдут даже тем, кто почти не играет, — объяснить правила можно за минуту.',
        'Все игры из подборки запускаются на одном экране. Некоторые позволяют гостям подключаться с телефонов, так что геймпады на всех не нужны.',
      ],
      en: ['Games for guests: short rounds, simple rules, lots of laughs. All run on one screen; some let guests join from their phones.'],
    },
    faq: {
      ru: [
        ['Нужен ли геймпад каждому гостю?', 'Не всегда: в части игр гости подключаются с телефона.'],
        ['Сколько человек может играть?', 'Обычно от четырёх до восьми, а в играх с телефонами — больше. Точное число указано в карточке.'],
      ],
    },
    related: ['genre:party', 'top:igry-dlya-kompanii-druzej', 'tag:lobbybig'],
  },
};

/** Данные подборки по id (или null) */
export const collectionById = (id) => (Object.hasOwn(COLLECTIONS, id) ? COLLECTIONS[id] : null);

const pick = (obj) => (obj ? obj[getLang()] || obj.ru : '');

/** Заголовок H1/вкладки и описание для роутера */
export const collectionHeading = (id) => pick(collectionById(id)?.h1);
export const collectionTitle = (id) => pick(collectionById(id)?.title);
export const collectionMeta = (id) => pick(collectionById(id)?.meta);

/* ------------------------------------------------------------------ *
 * Страница-оглавление /podborki
 * ------------------------------------------------------------------ */

/** Ссылки на подборки — общий кусок для оглавления, главной и страниц подборок */
export function collectionLinks(ids = Object.keys(COLLECTIONS), { exclude = '' } = {}) {
  return ids
    .filter((id) => id !== exclude && COLLECTIONS[id])
    .map((id) => `<a class="quick" href="#/top/${id}" data-action="nav"><span>${icon(COLLECTIONS[id].icon)}</span>${esc(collectionHeading(id))}</a>`)
    .join('');
}

export function render() {
  return `
  <section class="section">
    <header class="section-head">
      <h1>${esc(t('top.title'))}</h1>
      <p>${esc(t('top.text'))}</p>
    </header>
    <div class="quick-picks collections-list">${collectionLinks()}</div>
    <div class="center"><a class="btn btn-outline" href="#/catalog" data-action="nav">${esc(t('home.cta.catalog'))} →</a></div>
  </section>`;
}

export const title = () => `${t('top.title')} — ${t('site.name')}`;
export const description = () => t('top.meta');
