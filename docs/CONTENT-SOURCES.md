# Источники каталога — снимок 2026-09-27

Журнал подтверждений для новых записей. Рейтинг и цена — изменяемые снимки, поэтому рядом указаны метод и дата. Оценки времени HLTB — пользовательские агрегаты, а не обещание точного времени прохождения. Цены, пересчитанные в рубли, не являются ценами магазина в BY/RU.

## Общий метод для четырёх игр

- Название, дата/год, разработчик, издатель, жанры, режим одиночной игры и базовая цена: Steam Store API `appdetails` на официальном домене `store.steampowered.com`, параметр `cc=us&l=english`. Цены взяты из поля `price_overview.initial` (обычная/list price до скидки), не из текущей скидочной цены.
- Показатель `rat` — доля положительных рекомендаций Steam: `round(total_positive / total_reviews × 100)`, округление до целого. Запрос `appreviews` использовал `language=all&review_type=all`; числа и рассчитанный результат сохранены ниже. Это пользовательский агрегат Steam, не Metascore и не «среднее по агрегаторам».
- `len` — округлённые до часа оценки HowLongToBeat: первая величина — Main Story, вторая — Completionist. Completionist не означает гарантированные 100 % для каждого игрока.
- Ценовая оценка в каталоге — обычная цена Steam в USD, умноженная на официальный курс ЦБ РФ 84,3414 ₽ за USD, опубликованный 26.09.2026; округлена до ближайших 10 ₽ (Blue Prince) или 100 ₽ (остальные). Магазинные цены `cc=ru` и `cc=by` для Indiana Jones, DOOM и Avowed вернули `success:false`; эти суммы нельзя считать локальными BY/RU ценами. Курс: [официальный XML ежедневных курсов ЦБ РФ за 26.09.2026](https://www.cbr.ru/scripts/XML_daily.asp?date_req=26/09/2026). Исходный курс: 84,3414 ₽.
- `dif` и `pace` оставлены `null`: в источниках нет сопоставимой проверенной числовой оценки по принятой внутренней шкале. UI и алгоритм не подменяют её нейтральным числом.
- Темы/настроения — ручная классификация каталога по перечисленным официальным описаниям, а не независимая оценка или статистика. Доступность GeForce NOW отдельно не подтверждена; автоматическая эвристика облака для этих новых записей отключена.

## Blue Prince

| Поле | Значение / доказательство |
|---|---|
| Steam AppID / Steam | `1569580` — [страница игры](https://store.steampowered.com/app/1569580/) |
| Метаданные Steam | [Steam Store API](https://store.steampowered.com/api/appdetails?appids=1569580&cc=us&l=english): Dogubomb, Raw Fury, релиз 10.04.2025, одиночная игра, жанры Adventure/Indie/Strategy, поддержка Windows/macOS; обычная цена $29.99. |
| Другие платформы и описание | [Raw Fury — запуск на PC, PS5 и Xbox Series X\|S](https://www.gamespress.com/en-US/Raw-Furys-Blue-Prince-Now-Available-on-PC-PlayStation-5-and-Xbox-Serie); [Nintendo Store — Nintendo Switch 2, разработчик, издатель, режим, описание и дата 03.03.2026](https://www.nintendo.com/us/store/products/blue-prince-switch-2/). Xbox Wire называет приключение состоящим из 45 меняющихся комнат: [Game Pass, апрель 2025](https://news.xbox.com/en-us/2025/04/02/xbox-game-pass-april-2025-wave-1/). |
| Время | [HowLongToBeat, game 136426](https://howlongtobeat.com/game/136426): Main Story около 18½ ч; Completionist около 104 ч → `[18, 104]`. |
| Steam-рейтинг | [Steam Reviews API](https://store.steampowered.com/appreviews/1569580?json=1&language=all&review_type=all), снимок 27.09.2026: 15 086 положительных из 17 544 → `86`. |
| Цена | Steam API: обычная цена $29.99; расчёт `29.99 × 84.3414 = 2529.40 ₽`, округлено → `2530 ₽` (`full`). Это расчётная оценка, не региональная цена магазина. |

## Indiana Jones and the Great Circle

| Поле | Значение / доказательство |
|---|---|
| Steam AppID / Steam | `2677660` — [страница игры](https://store.steampowered.com/app/2677660/) |
| Метаданные Steam | [Steam Store API](https://store.steampowered.com/api/appdetails?appids=2677660&cc=us&l=english): MachineGames, Bethesda Softworks, релиз 08.12.2024, одиночная игра, Action/Adventure; обычная цена $69.99. |
| Другие платформы и описание | [Xbox Wire — Xbox Series X\|S, Windows PC и Steam](https://news.xbox.com/en-us/2024/11/29/indiana-jones-great-circle-inside-indy-mind-interview/); [Bethesda — запуск на PS5](https://bethesda.net/en-US/news/indiana-jones-and-the-great-circle-playstation-5-launch); [Nintendo Store — Nintendo Switch 2, одиночная игра, разработчик/издатель, сюжет и дата 12.05.2026](https://www.nintendo.com/us/store/products/indiana-jones-and-the-great-circle-switch-2/). |
| Время | [HowLongToBeat, game 144234](https://howlongtobeat.com/game/144234): Main Story около 16 ч; Completionist около 39½ ч → `[16, 40]`. |
| Steam-рейтинг | [Steam Reviews API](https://store.steampowered.com/appreviews/2677660?json=1&language=all&review_type=all), снимок 27.09.2026: 11 687 положительных из 13 090 → `89`. |
| Цена | Steam API: обычная цена $69.99; расчёт `69.99 × 84.3414 = 5903.05 ₽`, округлено → `5900 ₽` (`full`). Региональная цена BY/RU не подтверждена. |

## DOOM: The Dark Ages

| Поле | Значение / доказательство |
|---|---|
| Steam AppID / Steam | `3017860` — [страница игры](https://store.steampowered.com/app/3017860/) |
| Метаданные Steam | [Steam Store API](https://store.steampowered.com/api/appdetails?appids=3017860&cc=us&l=english): id Software, Bethesda Softworks, релиз 14.05.2025, одиночная игра, жанр Action; обычная цена $49.99. |
| Платформы и описание | [Xbox Wire / id Software — Xbox Series X\|S, PC, PlayStation 5, одиночная игра, приквел и игровые механики](https://news.xbox.com/en-us/2025/01/23/doom-the-dark-ages-developer-direct-2025/). |
| Время | [HowLongToBeat, game 151986](https://howlongtobeat.com/game/151986): Main Story около 14½ ч; Completionist около 24½ ч → `[15, 25]`. |
| Steam-рейтинг | [Steam Reviews API](https://store.steampowered.com/appreviews/3017860?json=1&language=all&review_type=all), снимок 27.09.2026: 28 426 положительных из 32 287 → `88`. |
| Цена | Steam API: обычная цена $49.99; расчёт `49.99 × 84.3414 = 4216.23 ₽`, округлено → `4200 ₽` (`full`). Региональная цена BY/RU не подтверждена. |

## Avowed

| Поле | Значение / доказательство |
|---|---|
| Steam AppID / Steam | `2457220` — [страница игры](https://store.steampowered.com/app/2457220/) |
| Метаданные Steam | [Steam Store API](https://store.steampowered.com/api/appdetails?appids=2457220&cc=us&l=english): Obsidian Entertainment, Xbox Game Studios, релиз 18.02.2025, одиночная RPG; обычная/list price $49.99, на момент запроса финальная цена API была $29.99 со скидкой. |
| Другие платформы и описание | [Xbox Wire — релиз на Xbox Series X\|S, Windows PC, описание Living Lands/Eora и Game Pass на запуске](https://news.xbox.com/en-us/2025/02/18/avowed-available-now-your-journey-awaits/); [Obsidian — выпуск версии для PS5](https://www.obsidian.net/news/obsidian/avowed-is-coming-to-playstation-5). |
| Время | [HowLongToBeat, game 81115](https://howlongtobeat.com/game/81115): Main Story около 20 ч; Completionist около 68½ ч → `[20, 69]`. |
| Steam-рейтинг | [Steam Reviews API](https://store.steampowered.com/appreviews/2457220?json=1&language=all&review_type=all), снимок 27.09.2026: 9 728 положительных из 12 672 → `77`. |
| Цена | Использована обычная цена Steam API $49.99, а не временная скидка $29.99; расчёт `49.99 × 84.3414 = 4216.23 ₽`, округлено → `4200 ₽` (`full`). Региональная цена BY/RU не подтверждена. |

## Ограничения снимка

Счётчики отзывов Steam и цены со временем меняются: API показывает текущий агрегат, а не постоянную оценку. Перед обновлением цен или рейтингов нужно проверить актуальные данные магазина. `Steam appdetails` вернул `success:false` для `cc=ru` и `cc=by` у Indiana Jones, DOOM и Avowed; региональные суммы не подставлялись. Пересчёт Blue Prince из USD в RUB тоже является только конвертацией и не должен называться ценой BY/RU-магазина.

## Батч расширения каталога 27.09.2026 (52 кандидата, конвейер GitHub Actions)

Метод общий для всех записей батча; для каждой игры в `tools/catalog-batch-data.json`
лежит снимок ответов Steam, из которого взяты поля. Ничего не подставлялось руками.

- **AppID, название, год, разработчик, издатель, жанры, категории режимов, обычная
  цена (USD), поддержка контроллера**: Steam Store API `appdetails?cc=us&l=english`
  (и `l=russian` для русского короткого описания), официальная витрина
  `store.steampowered.com`, снимок 27.09.2026 17:33 UTC. AppID найден через
  Steam Store Search API **только по точному совпадению нормализованного названия**
  (код: `tools/pull-catalog-candidates.mjs`, тот же принцип, что у резолвера обложек).
- **Рейтинг `rat`** — доля положительных рекомендаций Steam:
  `round(total_positive / total_reviews × 100)` из Steam Reviews API
  (`appreviews/<id>?language=all&review_type=all&purchase_type=all`), снимок
  27.09.2026. Это пользовательский агрегат Steam, не Metascore.
- **Цена `pv`** — обычная цена Steam (USD, `price_overview.initial`, без скидки),
  пересчитанная по официальному курсу ЦБ РФ **84,3414 ₽/$ (публикация от
  26.09.2026, получена скриптом из cbr.ru 27.09.2026)**, округление до 100 ₽.
  Это расчётная конвертация, а не цена регионального магазина.
- **Время `len`** — оценки HowLongToBeat ([main story, completionist], округление
  до часа): собраны браузерным сборщиком `tools/pull-hltb-pages.mjs` со страниц
  поиска HLTB 27.09.2026 (страница — клиентское Next.js-приложение; API отдаёт
  403 датацентровым IP). HLTB — пользовательские агрегаты, не обещание точного
  времени. Для каждой игры в журнале ниже — ID страницы HLTB.
- **Режимы `md`** — прямое отражение категорий Steam: «Shared/Split Screen Co-op» →
  `coopLocal`, «Online Co-op» → `coopOnline`, «Shared/Split Screen PvP» →
  `pvpLocal`, «Online PvP» → `pvpOnline`, «Single-player» → `solo`. Remote Play
  Together не кодируется отдельным режимом.
- **Платформы `pf`** — `pc` подтверждена Steam (windows); консольные версии — по
  строке платформ на странице игры HowLongToBeat (краудсорс-агрегатор, не магазин);
  где HLTB платформ не разобрал — стоит только `pc`.
- **Субъективные поля** (`dif`, `pace`, `mood`, `coopQ`, теги, `pl` — макс. число
  игроков) — редакционная оценка этого батча по официальным описаниям Steam,
  единообразно со шкалами существующего каталога (docs/CONTENT.md); это оценка
  редакции, а не измерение. `pl` сверен с текстом описания Steam там, где число
  игроков названо явно.
- **Описания/особенности (`desc`, `about`, `feats`)** — написаны своими словами
  по фактам из официальных описаний Steam; формулировки редакции.
- Отклонён по результату сбора: **Get Packed: Fully Loaded** — доля положительных
  отзывов Steam 55% (снимок 27.09.2026), существенно ниже планки каталога.
- Не найден в Steam Search: **Scott Pilgrim vs. The World: The Game – Complete
  Edition** — страница не находится поиском магазина (снимок 27.09.2026);
  по правилам источников игра без страницы магазина в каталог не добавляется.

### Батч 27.09.2026 — дополнение по итогам записи в каталог (51 игра)

- **Итог**: каталог 440 → **491 запись**; кооп за одним экраном 79 → **118**;
  39 новых игр с `coopLocal`, 51 запись с `ratingSource` (рекомендации Steam,
  снимок 27.09.2026). Распределение: 42 → `part-a.js`, 8 → `part-c.js`,
  1 (Darkest Dungeon) → `part-b.js`.
- **`len` и консольные `pf`**: токен GitHub перестал действовать до сбора
  аннотаций прогона Actions, поэтому карточки HowLongToBeat собраны
  поисковыми сниппетами страниц howlongtobeat.com (и зеркал hl2b/ITAD) —
  файл `tools/hltb-manual.json` (51 игра, дата среза 27.09.2026, ID страниц
  HLTB сохранены). Значения — из карточки игры (Main Story / Completionist),
  половины округляются вниз. Исключения задокументированы в поле `note`
  файла: Catastronauts — второе значение Main+Extra (completionist не
  голосован); Unspottable — TrueAchievements modal 1–2 ч (HLTB main не
  голосован); Age of Mythology: Retold — карточка HLTB недоступна в
  сниппетах, числа 25/62 из IGN (данные HowLongToBeat).
- **Годы**: берутся из снимка Steam. Исключения (обе даты названы в about):
  Unravel Two — 2018 (1.0 Origin/PS4/Xbox 21.06–09.2018, HLTB NA 09.06.2018;
  Steam-страница показывает 04.06.2020 — порт), Sackboy: A Big Adventure —
  2020 (PS5 12.11.2020; Steam-порт 27.10.2022), Old World — 2021 (1.0
  01.07.2021 по HLTB NA; Steam-страница показывает 18.05.2022 — смена
  издателя), Wobbly Life — 2025 (выход из раннего доступа 18.09.2025).
- **`pl` с источником в описании Steam**: Overcooked 1–4, Boomerang Fu до 6,
  TMNT до 6, Worms W.M.D до 6 (пятеро противников), Tricky Towers 4
  («против троих»), Lethal League Blaze 4, Full Metal Furies 4, Lovers 4,
  Nine Parchments 4, Wingspan 1–5, Wobbly Life 4, SpeedRunners 4, Trine 4 4,
  Crawl 4, Biped 2, Death Squared 4, Chariot 1–2 («одному или с другом»),
  Sonic Mania 2 («с другом»). Числа игроков сетевых стратегий: Civ V — 12
  (хотсит, Arqade/CivFanatics), Age of Mythology: Retold — 12 (wiki
  Age of Empires: «кроме AoM — максимум 8»), Dune: Spice Wars — 4
  (официальный пост разработчика о мультиплеере), Old World — 10 (ответ
  разработчика в Steam-обсуждении).
- **`md`, исключения сверх категорий Steam**: Chariot — категории Steam не
  декларируют кооп, но описание магазина прямо называет игру couch co-op
  («can be played alone or with a friend») → `coopLocal` по описанию Steam;
  ibb & obb — категории не содержат «Shared/Split Screen», описание Steam
  называет «true local co-op couch fun or match up online» → `coopLocal` +
  `coopOnline`; Civilization V — сетевой мультиплеер подтверждён описанием
  Steam («Compete with players all over the world or locally in LAN»), хотсит
  упомянут только в feats.
- **Обложки**: 51 appid из снимка Steam вписаны в `tools/steam-overrides.json`
  (формат `{steamId, cover, src:'steam'}`), `js/catalog/steam-covers.js`
  сгенерирован резолвером локально (слияние без сети). Проверка URL и ремонт
  404 — шагом резолвера в Actions (`.github/workflows/covers.yml`);
  в песочнице CDN Steam недоступен (ECONNRESET), локальная проверка
  невозможна. После пуша: прогон covers.yml и перезапуск CI, если проверка
  обложек на коммите пакета упала до ремонтного коммита.
- **Требования к ПК**: для 51 новой игры подтянет `sysreq.yml` (триггеры
  расширены на `js/catalog/part-*.js` и ветку этой сессии — раньше в списке
  была чужая сессионная ветка, и workflow на push каталога не срабатывал).
- **Ветки-триггеры воркфлоу**: `covers.yml` и `sysreq.yml` ссылались на ветки
  прошлых сессий (`arena/01a0d952-…`, `arena/01a0ddd3-…`) — заменены на
  `arena/01a0e3da-gustoplay`; `catalog-batch.yml` уже был корректен.
- **Мелкий фикс**: CSS-переменная `--ad-h` → `--ad-height`
  (`js/views/components.js`, `css/styles.css`) — словарная проверка
  `check:text` считала «ad-h» опечаткой и роняла шаг CI.

### Батч 27.09.2026 — сверка с прогоном сборщика (после восстановления GitHub)

Прогон 36339299053 (коммит afd274c) завершился и закоммитил `tools/hltb-data.json`
(бот-коммиты `cb4be03`, `710ab53`): 38 записей с данными, 14 miss (таймауты
загрузки карточек: BattleBlock Theater, Castle Crashers, Rayman Legends,
Darkest Dungeon, Worms W.M.D, Civ V, Sackboy, Tools Up!, Unspottable,
ibb & obb, Bread & Fred, Lost Castle, Never Alone, Get Packed).

Правило слияния: **значения прогона каноничны** (карточка поиска HLTB,
воспроизводимый пайплайн, снимок 27.09.2026 18:06 UTC); ручной сбор
(`tools/hltb-manual.json`, карточки страниц игр) остаётся источником для 14 miss
и не расходится с прогоном по остальным. По сверке обновлены записи:
Moving Out [5, 19], Wobbly Life [14, 25] (completionist карточки страницы —
25), Nidhogg 2 [1, 11] (32 мин → 1 ч), Crawl [1, 14], Old World [23, 88],
Dome Keeper [5, 34]; платформы по строкам HLTB: Lovers in a Dangerous
Spacetime, Boomerang Fu, River City Girls, Degrees of Separation — +xbox.
Даты HLTB NA подтвердили годы каталога: Unravel Two 09.06.2018, Old World
01.07.2021; Wobbly Life: HLTB показывает 08.07.2020 (старт раннего доступа),
год каталога — 2025 (выход 1.0, Steam 18.09.2025).

## Football Manager 2024 — почему нет ссылки в магазин (27.09.2026)

Единственная игра каталога без ссылки на официальный магазин (490/491 в
`audit:readiness`). FM24 снят с продажи после выхода FM26: страницы удалены из
Steam и Epic (обсуждения сообщества: «The game will be removed from store
(Steam, Epic etc) after FM26 release», steamcommunity.com/app/2252570), а
страница footballmanager.com/games/football-manager-2024 отдаёт «Access denied»
и редиректит на архивную fm25 (проверено fetch_page 27.09.2026; сайт серии уже
посвящён следующему релизу). Ссылаться на перепродавцов ключей (Eneba, CDKeys)
сайт не может по правилам источников — только официальные страницы. Итог:
у записи честно нет ссылки, интерфейс скрывает кнопку (components.js рендерит
её только при наличии store URL/Steam ID).

## Батч расширения каталога 28.09.2026 (56 кандидатов, конвейер GitHub Actions)

Метод общий с батчем 27.09.2026; данные — снимок конвейера в
`tools/catalog-batch-data.json` (прогон 36350893652 по push a50f654, собрано
27.09.2026 21:13 UTC): Steam appdetails (cc=us, l=english + l=russian) и
Steam Reviews API, AppID — точное совпадение нормализованного имени через
Steam Store Search. Ничего не подставлялось руками.

- **Итог**: 48 записей (38 → `part-a.js`, 10 → `part-b.js`); каталог
  491 → **539**; кооп за одним экраном 118 → **147**; coopOnline 225 → 247;
  pvpLocal 48 → 68; pvpOnline 143 → 161; mmo 14 → 15 (ARK — жанр «Massively
  Multiplayer» в Steam, как у Fallout 76). Всем 48 проставлен ratingSource
  «Рекомендации игроков Steam, снимок 27.09.2026».
- **Отклонены по планке рейтинга** (минимум существующего каталога без
  eFootball — 68%): Payday 3 (46%), DIRT 5 (54%), NBA 2K25 (59%); для
  сравнения годовые спортсимы каталога — EA FC 25/26 (71%), WWE 2K24 (76%).
- **Отклонён F1 24**: в снимке Steam нет price_overview (снят с продажи
  после выхода F1 25, как FM24) — запись без цены и покупаемой страницы
  противоречит правилам источников.
- **Не найдены в Steam Search** (имена в магазине теперь другие — кандидаты
  на переименование в следующем батче): Haven, Outward (в Steam —
  Outward Definitive Edition), World War Z: Aftermath (база — World War Z),
  Conan Exiles (в Steam — Conan Exiles Enhanced).
- **Цена `pv`** — price_overview.initial (USD) × курс ЦБ РФ 84,3414 ₽/$
  (публикация от 26.09.2026), округление до 100 ₽; категории: <$10 — cheap,
  $10–25 — mid, >$25 — full. Brawlhalla и Killer Queen Black — free
  (снимок Steam).
- **Рейтинг `rat`** — round(positive/total×100) Steam Reviews API, снимок
  27.09.2026 (файл `reviews` в batch-data).
- **`len`** — карточки HowLongToBeat по сниппетам поисковой выдачи, снимок
  28.09.2026 (браузерный сборщик прогнала упёрся в таймауты: 30 карточек с
  данными, времена в основном не разобраны — см. `tools/hltb-data.json`).
  ID карточек: ARK 26629, Aliens 89300, B4B 67709, Blazing Chrome 65494,
  Brawlhalla 22766, Cake Bash 85367, DBFZ 48211, DD Gaiden 128171, Escape
  Academy 109211, Fight'N Rage 49758, Green Hell 60384, Guacamelee! 2
  59509, Guac STCE 19973, Hot Wheels 89344, Injustice 2 37862, KQB 71639,
  LEGO Batman 3 21254, LEGO HP 47803, LEGO Marvel 14130, MHR 83169,
  Magicka 2 25222, MK1 128891, Nidhogg 15968, NStW 90632, Octopath 53592,
  Ori DE 36755, Overcooked AYCE 89610, PHOGS! 85738, PICO PARK 2 155975,
  Pit People 38004, Pode 54684, Rayman Origins 7619, Redout 39800, Rivals
  21713, RCG2 94082, Salt and Sanctuary 25107, Samurai Gunn 2 96218,
  Skullgirls 39099, Team Sonic 67297, The Cave 9803, Jackbox PP1 23290,
  Jackbox PP3 40718, Outlast Trials 86515, Tick Tock 65505, Trine 5 127562,
  Goose 66086, V Rising 100069, WWHT 71166.
  Особые случаи: Jackbox PP1 [4, 23] и PP3 [6, 14] — PC-строка таблицы
  (Main / 100%), пак мультиплеерный; Killer Queen Black [4, 45] — main по
  карточке (ITAD/HLTB 4 ч), completionist не голосован, 45 ч — середина
  оценки TrueAchievements 40–50 ч (прецедент Unspottable); Samurai Gunn 2
  [1, 1] — completionist не голосован, второе значение = main; Brawlhalla
  [58, 451] — голосования HLTB (27/15 проголосовавших); Rivals of Aether
  [2, 45] — main 2 ч по карточке HLTB 21713 (снимок 28.09.2026),
  completionist не голосован → 45 ч как середина TrueAchievements
  «40–50 hours» (мода 13 завершивших; прецедент Killer Queen Black);
  ARK [73, 1105] —
  «сюжет» = все боссы, честное голосование 50/34 игроков; Pit People
  [9, 226] — карточка HLTB (completionist по 8 голосам, ачивки-гринд).
- **`pl` с источником**: описания Steam — Jackbox PP1 [1, 100] (теглайн;
  активных игроков до 8), PP3 [1, 8], PICO PARK 2 [2, 8], Team Sonic
  [1, 12] («12 players per race, 4 player split screen»), Hot Wheels
  [1, 12] («split screen … 2 players or face up to 12 opponents online»),
  Redout [1, 12] («match against 12 players»), B4B [1, 8] (кампания 4,
  Swarm 8), Aliens [1, 3] («up to two players or AI»), Outlast Trials
  [1, 4] («2, 3, or 4 players»), KQB [1, 8] («4v4»), Brawlhalla [1, 8]
  («up to 8 players online or local»), Goose [1, 2], LEGO [1, 2] (прецедент
  LEGO Skywalker Saga), Rayman Origins [1, 4] («four-player, jump-in/
  jump-out»), Guac 1/2 [1, 4], Fight'N Rage [1, 3], Nidhogg [1, 8]
  (турнир), Rivals [1, 4], Samurai Gunn 2 [1, 4] (adventure-кооп),
  The Cave [1, 3] (Co-Optimus: couch co-op 3), Salt and Sanctuary [1, 2]
  (Co-Optimus/Fextralife wiki: local co-op 2), ARK [1, 70] (слоты
  официальных серверов), V Rising [1, 60] (кэп официальных серверов,
  вики-документация сервера), MHR [1, 4], Green Hell [1, 4], Magicka 2
  [1, 4], Cake Bash [1, 4], Escape Academy [1, 2], PHOGS!/Pode/Tick Tock/
  WWHT [1, 2], Trine 5 [1, 4], Skullgirls/DBFZ/Injustice 2/MK1 [1, 2].
- **`md`**: прямое отражение категорий Steam («Shared/Split Screen Co-op» →
  coopLocal, «Online Co-op»/«Co-op» → coopOnline, PvP-категории → pvp*).
  Исключения сверх категорий: LEGO Batman 3 и LEGO Marvel Super Heroes —
  coopLocal по прецеденту LEGO Skywalker Saga (категории старых LEGO-игр
  сплитскрин не декларируют, кооп серии общеизвестен и заявлен в прессе);
  Team Sonic Racing — coopLocal по описанию Steam («Online Multiplayer &
  Local Co-Op Modes»); Salt and Sanctuary и The Cave — coopLocal по
  Co-Optimus; Samurai Gunn 2 — coopLocal/coopOnline по странице разработчика
  (Versus и Adventure — Local + Online).
- **Годы**: LEGO Harry Potter Collection — 2024 (Steam-релиз сборника;
  оригинальные игры 2010/2011 — Years 1-4 и Years 5-7); Samurai Gunn 2 —
  2021 (ранний доступ с 20.07.2021; 1.0 не выходила — год EA-старта, в
  about не утверждается обратное); V Rising — 2024 (выход из раннего
  доступа); остальные — из снимка Steam.
- **Субъективные поля** (`dif`, `pace`, `mood`, `coopQ`, теги) —
  редакционная оценка батча по официальным описаниям Steam, единообразно
  со шкалами каталога (docs/CONTENT.md); это оценка, а не измерение.
- **Обложки и требования к ПК** для 48 игр (491/539 и 456/456+48) после
  пуша part-файлов собирают конвейеры covers.yml и sysreq.yml (аппиды уже
  есть в batch-data); store-ссылки появятся вместе с обложками
  (steam-covers.js — источник и картинки, и ссылок).


## Батч 2026-09-29 — Steam wave 2 (54 записи)

- Steam-факты собраны Actions run 36433021843, коммит бота `a459eb7`: 54/55 кандидатов, Steam Store API appdetails/appreviews, цены и рейтинги. Один кандидат без точного совпадения не применён.
- Новые записи добавлены в `js/catalog/part-a.js` на основании полей `tools/catalog-batch-data.json`; режимы выведены только из официальных Steam categories.
- Для новых записей `len: [null, null]`: HLTB runner 36437110145 не получил карточки текущего batch. Длительность намеренно отображается как «Данных нет / No data»; числа не подставлялись.
- HLTB-защита: `.github/workflows/catalog-hltb.yml` удаляет устаревший файл и проверяет совпадение `batch` перед сохранением.
