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
