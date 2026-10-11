/**
 * Заголовки страниц таксономии так, как их ищут: «Хорроры», «Игры для слабых ПК»,
 * «Кооп по сети» — вместо служебных «Игры в жанре «Хоррор»» или «Тег: подборка игр».
 *
 * Значение — H1 на русском (строка) или { h1, title }, если заголовок вкладки
 * должен отличаться сильнее. Английская версия остаётся на шаблонах catalog.js.
 */
export const TAXONOMY_SEO_RU = {
  'genre:action': 'Экшен игры',
  'genre:shooter': 'Шутеры',
  'genre:rpg': 'RPG игры',
  'genre:mmo': 'MMO игры',
  'genre:strategy': 'Стратегии',
  'genre:tactics': 'Тактические игры',
  'genre:survival': 'Игры на выживание',
  'genre:horror': { h1: 'Хорроры', title: 'Хорроры: лучшие страшные игры по оценкам игроков' },
  'genre:adventure': 'Приключенческие игры',
  'genre:puzzle': 'Головоломки',
  'genre:platformer': 'Платформеры',
  'genre:racing': 'Гонки',
  'genre:sandbox': 'Песочницы',
  'genre:roguelike': 'Рогалики',
  'genre:metroidvania': 'Метроидвании',
  'genre:simulator': 'Симуляторы',
  'genre:building': 'Игры про строительство',
  'genre:card': 'Карточные игры',
  'genre:rhythm': 'Ритм-игры',
  'genre:party': 'Игры для вечеринки',
  'genre:fighting': 'Файтинги',
  'genre:stealth': 'Стелс игры',
  'genre:visual': 'Визуальные новеллы',
  'genre:sports': 'Спортивные игры',
  'genre:mystery': 'Детективные игры',
  'genre:moba': 'MOBA игры',
  'genre:battle': 'Королевские битвы',
  'genre:boardgame': 'Настольные игры на ПК и консолях',

  'mode:solo': { h1: 'Одиночные игры', title: 'Одиночные игры: лучшие игры для одного игрока' },
  'mode:coopLocal': { h1: 'Кооп за одним экраном', title: 'Кооп на одном экране: игры с друзьями на одном ПК или консоли' },
  'mode:coopOnline': { h1: 'Кооп по сети', title: 'Кооп по сети: онлайн-игры с друзьями в одной команде' },
  'mode:pvpLocal': { h1: 'Игры друг против друга на одном экране', title: 'PvP на одном экране: игры друг против друга за одним ПК или консолью' },
  'mode:pvpOnline': { h1: 'Онлайн PvP игры', title: 'Онлайн PvP: игры против других игроков по сети' },
  'mode:mmo': { h1: 'Онлайн-игры с постоянным миром', title: 'MMO и онлайн-миры: игры с постоянным миром' },

  'platform:pc': 'Игры на ПК',
  'platform:ps': 'Игры на PlayStation',
  'platform:xbox': 'Игры на Xbox',
  'platform:switch': 'Игры на Nintendo Switch',
  'platform:switch2': 'Игры на Nintendo Switch 2',
  'platform:mobile': 'Игры на телефон и планшет',
  'platform:cloud': { h1: 'Игры в облаке', title: 'Игры в облаке GeForce NOW: без мощного ПК' },

  'tag:lowsysreq': { h1: 'Нетребовательные игры', title: 'Нетребовательные игры: пойдут без мощной видеокарты' },
  'tag:splitscreen': { h1: 'Игры с разделённым экраном', title: 'Игры с разделённым экраном и локальным кооперативом' },
  'tag:coopfocused': { h1: 'Игры, созданные для коопа', title: 'Игры, созданные для коопа: проходить только вместе' },
  'tag:friendlier2': { h1: 'Игры на двоих', title: 'Игры на двоих: созданы для двух игроков' },
  'tag:lobby4': 'Игры на 4 игрока',
  'tag:lobbybig': { h1: 'Игры для большой компании', title: 'Игры для большой компании: от 5 игроков' },
  'tag:cozy': { h1: 'Уютные игры', title: 'Уютные игры: спокойные и добрые игры для отдыха' },
  'tag:storyrich': 'Игры с глубоким сюжетом',
  'tag:openworld': 'Игры с открытым миром',
  'tag:difficult': { h1: 'Сложные игры', title: 'Сложные игры: настоящий вызов для опытных игроков' },
  'tag:soulslike': { h1: 'Соулслайки', title: 'Соулслайки: игры в духе Dark Souls' },
  'tag:short': 'Короткие игры',
  'tag:long': 'Длинные игры на десятки часов',
  'tag:steamdeck': { h1: 'Игры для Steam Deck', title: 'Игры для Steam Deck: хорошо работают на портативной консоли' },
  'tag:family': { h1: 'Игры для детей и всей семьи', title: 'Игры для детей и всей семьи: можно играть вместе' },
  'tag:offline': 'Игры без интернета',
  'tag:vr': 'VR игры',
  'tag:mods': 'Игры с поддержкой модов',
  'tag:zombie': 'Игры про зомби',
  'tag:anime': 'Аниме игры',
  'tag:pixelart': 'Пиксельные игры',
  'tag:space': 'Игры про космос',
  'tag:cyberpunk': 'Игры в стиле киберпанк',
  'tag:postapo': 'Игры про постапокалипсис',
  'tag:crafting': 'Игры с крафтом',
  'tag:basebuilding': 'Игры со строительством базы',
  'tag:farming': 'Игры про ферму',
  'tag:battleroyale': 'Королевские битвы',
  'tag:towerdefense': 'Игры в жанре Tower Defense',
  'tag:pirates': 'Игры про пиратов',
  'tag:war': 'Игры про войну',
  'tag:historical': 'Исторические игры',
  'tag:fishing': 'Игры про рыбалку',
  'tag:cooking': 'Игры про готовку',
  'tag:heist': 'Игры про ограбления',
  'tag:driving': 'Игры про вождение',
  'tag:management': 'Игры-менеджеры',
  'tag:tycoon': 'Экономические стратегии',
  'tag:colony': 'Симуляторы колонии',
  'tag:funny': 'Смешные игры',
  'tag:dark': 'Мрачные игры',
  'tag:fantasy': 'Фэнтези игры',
  'tag:scifi': 'Научно-фантастические игры',
  'tag:choices': 'Игры с выбором и последствиями',
  'tag:replayable': 'Игры, в которые хочется переигрывать',
  'tag:controller': 'Игры для геймпада',
};

/** Хвост заголовка вкладки, когда в словаре только H1 */
const SUFFIX = {
  genre: 'лучшие игры жанра по оценкам игроков',
  mode: 'список игр с оценками',
  platform: 'лучшие игры по оценкам игроков',
  tag: 'список с оценками и фильтрами',
};

/** { h1, title } для страницы таксономии на русском или null */
export function taxonomySeo(kind, id) {
  const entry = TAXONOMY_SEO_RU[`${kind}:${id}`];
  if (!entry) return null;
  if (typeof entry === 'string') return { h1: entry, title: `${entry}: ${SUFFIX[kind] || SUFFIX.tag}` };
  return entry;
}
