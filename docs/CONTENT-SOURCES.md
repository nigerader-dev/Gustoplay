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
