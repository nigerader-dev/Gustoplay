# Развёртывание GustoPlay

Всё развёртывание — это один скрипт `npm run deploy`. Он идемпотентный: повторный
запуск обновляет сайт и ничего не ломает.

```
npm run deploy:check     # что готово, чего не хватает (можно без ключей)
npm run deploy           # развернуть: база, API, домен, сайт
```

---

## 1. Что нужно от вас один раз

| Что | Где взять | Зачем |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | панель Cloudflare → My Profile → API Tokens → Create Token → шаблон **Edit Cloudflare Workers** + права `Account → D1 → Edit`, `Account → Cloudflare Pages → Edit`, `Zone → DNS → Edit`, `Zone → Cache Purge` | публикация API и сайта |
| `CLOUDFLARE_ACCOUNT_ID` | панель Cloudflare, правый сайдбар | привязка к аккаунту |
| Домен (по желанию) | регистратор → перенести NS на Cloudflare | адрес `gustoplay.ru` вместо `gustoplay.pages.dev` |
| `GOOGLE_CLIENT_ID` (по желанию) | Google Cloud → Credentials → OAuth Client ID (Web), Authorized JavaScript origins = адрес сайта | кнопка «Войти через Google» |
| `RESEND_API_KEY` (по желанию) | resend.com → API Keys, домен подтверждён DNS-записями | письма сброса пароля |

Секреты для воркера кладутся в `worker/.dev.vars` (файл в git не попадает):

```bash
cp worker/.dev.vars.example worker/.dev.vars
# впишите значения — их загрузит npm run deploy
```

Базу D1, маршрут `/api/*`, Turnstile и подключение домена скрипт создаёт сам —
вручную ничего делать не нужно, если токен имеет перечисленные права.

---

## 2. Два способа запустить

### А. Локально, одной командой

```bash
cd <папка репозитория>
npm ci
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npm run deploy
```

Скрипт по шагам: проверит окружение → создаст/найдёт базу `gustoplay` и применит схему →
проверит домен, добавит маршрут `/api/*`, создаст Turnstile → соберёт сайт с адресом API →
загрузит секреты → опубликует воркер → опубликует сайт в Pages → подключит домен и DNS.

### Б. Через GitHub Actions (совсем без терминала)

Репозиторий уже содержит готовый процесс `.github/workflows/deploy.yml`:

1. Settings → Secrets and variables → Actions → добавьте `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID`
   (по желанию: `GOOGLE_CLIENT_ID`, `RESEND_API_KEY`, `MAIL_FROM`);
2. вкладка Actions → «GustoPlay — деплой в Cloudflare» → **Run workflow**.

Дальше сайт обновляется сам при каждом push. Процесс сначала прогоняет все тесты
(каталог, интерфейс, API, сквозной сценарий) и публикует только то, что их прошло.

---

## 3. Что получается на выходе

| Адрес | Что это |
|---|---|
| `https://gustoplay.pages.dev` | сайт (статика из `dist/`, 625 страниц) |
| `https://gustoplay.ru` | тот же сайт на своём домене (после подключения домена) |
| `https://gustoplay.ru/api/*` | API аккаунтов (воркер `gustoplay-api` + база D1) |
| `https://gustoplay.ru/api/health` | проверка, что API отвечает: `{"ok":true}` |

Проверка после деплоя:

```bash
curl -s https://gustoplay.ru/api/health          # {"ok":true,...}
curl -sI https://gustoplay.ru/ | head -3         # 200, strict-transport-security
```

Затем откройте сайт → «Аккаунт» → зарегистрируйтесь: профиль вкуса начнёт
синхронизироваться между устройствами.

---

## 4. Если что-то не так

| Симптом | Причина и что делать |
|---|---|
| `CLOUDFLARE_API_TOKEN` не принят | токен без прав: проверьте список прав токена или создайте новый по шаблону |
| `Invalid database_id` | в `wrangler.toml` остался placeholder — уберите его, скрипт создаст базу и впишет id сам |
| Сайт открывается, аккаунт пишет «Нет связи с сервером» | маршрут `/api/*` не настроен: домен должен быть добавлен в Cloudflare, затем `npm run deploy` снова |
| `/api/health` отвечает 404 | тот же случай: воркер опубликован, но запросы `/api/*` к нему не направлены |
| Письмо сброса не приходит | не задан `RESEND_API_KEY` или домен не подтверждён в Resend; пока можно включить `ALLOW_RESET_DEBUG = "true"` в `wrangler.toml` — ссылка вернётся в ответе |
| Кнопка Google не появляется | пустой `GOOGLE_CLIENT_ID` в `worker/.dev.vars`/сборке (docs/ACCOUNTS.md) |
| Нужно посмотреть логи API | `cd worker && npx wrangler tail` |
| Нужно откатиться | Cloudflare → Workers & Pages → `gustoplay` → Deployments → предыдущая версия → Rollback |

---

## 5. После первого деплоя (SEO и деньги)

1. `https://<домен>/sitemap.xml` → Google Search Console и Яндекс.Вебмастер (добавить сайт, подтвердить).
2. Реклама: `js/config.js` → `ADS.mode = 'rsya' | 'adsense' | 'both'` после одобрения площадки,
   затем `npm run deploy` (docs/MONETIZATION.md).
3. Аналитика: `ANALYTICS` в `js/config.js` — Яндекс.Метрика (после согласия cookie) и Plausible.
4. Раз в месяц: `npm run audit` — проверка полноты каталога; `npm run test:all` — все тесты.

Полный чек-лист запуска: docs/LAUNCH.md.

---

## 6. Зеркало на GitHub Pages

Репозиторий содержит готовый процесс `.github/workflows/pages.yml`: при push в `master`/`main`
он прогоняет все тесты, собирает сайт с адресом зеркала и публикует на GitHub Pages
(`https://<owner>.github.io/<repo>`). Настройка — один раз:

1. **Settings → Pages → Source: GitHub Actions** (workflow тоже пробует включить сам);
2. **Settings → Environments → `github-pages` → Deployment branches**: по умолчанию окружение
   пускает только защищённые ветки (`master`). Для деплоя из другой ветки (проверка до мержа)
   переключите на «Selected branches» и добавьте её, не убрав `master`;
3. при желании адрес зеркала меняется в одном шаге процесса «Адрес зеркала»:
   `site="https://gustoplay.ru"` — тогда canonical останется на боевом домене,
   а GitHub Pages станет чистым зеркалом (флаг `--trailing-slash` в этом случае уберите).

Сборка для зеркала вручную:

```bash
node tools/build-static.mjs --site-url=https://<owner>.github.io/<repo> --trailing-slash
npm run verify:build
npm run preview   # локальная проверка: http://localhost:5173/mydev/quiz/
```

Чего на GitHub Pages нет: своих заголовков (CSP/HSTS), корневых `robots.txt`/`ads.txt`,
service worker и аккаунтовый API — подробности и ограничения в docs/HOSTING.md (Вариант 3).
