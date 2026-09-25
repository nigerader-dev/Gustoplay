# GustoPlay API — аккаунты, Google-вход, синхронизация

Небольшой API на Cloudflare Workers + D1. Разворачивается на бесплатном тарифе
(Workers Free: 100 000 запросов в сутки, D1 Free: 5 ГБ). Домен тот же —
`gustoplay.ru/api/*`, поэтому CORS, cookie и CSP остаются простыми.

## Что уже готово на сайте

- `#/account` — регистрация, вход, вход через Google, синхронизация профиля вкуса,
  список активных сессий, выход, удаление аккаунта (`js/views/account.js`).
- `js/api.js` — клиент API: Bearer-токен, авто-забывание при 401, Turnstile, Google Identity.
- `js/store.js` — автоотправка профиля на сервер через 4 секунды после изменения
  (debounce), только когда пользователь вошёл.
- Без настроенного API сайт работает в локальном режиме: профиль в localStorage.

## Развёртывание за 10 минут

```bash
cd worker

# 1. База данных
npx wrangler d1 create gustoplay
#    → скопируйте database_id в wrangler.toml
npx wrangler d1 execute gustoplay --file=schema.sql --remote

# 2. Секреты (значения запрашиваются интерактивно, в git не попадают)
npx wrangler secret put TURNSTILE_SECRET   # секретный ключ Turnstile
npx wrangler secret put GOOGLE_CLIENT_ID   # Client ID из Google Cloud
npx wrangler secret put RESEND_API_KEY     # письма сброса пароля (необязательно)
npx wrangler secret put MAIL_FROM          # "GustoPlay <no-reply@gustoplay.ru>"

# 3. Деплой
npx wrangler deploy
#    → API доступен по адресу https://gustoplay.ru/api/* (маршрут добавится сам)
```

В `js/config.js` укажите `SITE.apiBase: '/api'` — и форма аккаунта включится.

## Google-вход: пошагово

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
   **Create credentials → OAuth client ID → Web application**.
2. **Authorized JavaScript origins** — домены без пути:
   `https://gustoplay.ru`, `https://www.gustoplay.ru`, для теста `http://localhost:5173`.
   Redirect URI не нужен: используется Google Identity Services (кнопка «Продолжить с Google»).
3. Скопируйте **Client ID** (`…apps.googleusercontent.com`):
   - в `worker/` → `npx wrangler secret put GOOGLE_CLIENT_ID`;
   - в `js/config.js` → `AUTH.googleClientId`.
4. **OAuth consent screen**: тип External, название GustoPlay, ссылки на политику
   конфиденциальности и условия (`#/about`), scopes — только `email`, `profile`, `openid`.
   Для публичного доступа пройдите верификацию Google (нужны privacy policy и домен).

Worker проверяет ID-токен Google полностью: подпись RS256 по JWKS, `aud`, `iss`, `exp`.
Секрет клиента на фронтенде не нужен и не должен там появляться.

### Привязка Google к существующему аккаунту

Если человек вошёл по e-mail и паролю, а потом нажимает «Продолжить с Google» с тем же
адресом — аккаунт объединяется автоматически (адрес уже подтверждён Google),
пароль остаётся рабочим как второй способ входа.

## Turnstile: защита форм от ботов

1. Cloudflare dashboard → **Turnstile → Add site**: домен `gustoplay.ru`, виджет Managed.
2. **Site key** → `js/config.js` → `AUTH.turnstileSiteKey`.
3. **Secret key** → `npx wrangler secret put TURNSTILE_SECRET`.

Пока ключи не заданы, Turnstile просто не подключается, а API пропускает проверку —
удобно для локальной разработки.

## Схема базы

`users` (e-mail или Google), `sessions` (только хеши токенов), `profiles` (JSON профиля вкуса),
`reset_tokens` (одноразовые ссылки сброса пароля, тоже только хеши), `rate_limits`
(счётчики попыток). Полная схема — `schema.sql`.

## Эндпоинты

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/health` | проверка живости |
| POST | `/auth/register` | регистрация (e-mail + пароль) |
| POST | `/auth/login` | вход по паролю |
| POST | `/auth/google` | вход/регистрация через Google ID-токен |
| POST | `/auth/reset-request` | письмо со ссылкой сброса пароля |
| POST | `/auth/reset-confirm` | установка нового пароля по токену |
| POST | `/auth/logout` | выход (текущая сессия) |
| GET/DELETE | `/me` | профиль пользователя / удаление аккаунта |
| GET/PUT | `/me/profile` | синхронизация профиля вкуса |
| GET | `/me/sessions` | активные сессии |
| DELETE | `/me/sessions/:id` | отзыв сессии |

## Правила безопасности, зашитые в код

| Угроза | Что сделано |
|---|---|
| Утечка базы | пароли — PBKDF2-SHA256, 210 000 итераций, индивидуальная соль; токены сессий хранятся как SHA-256 |
| Подбор пароля | rate limit 20 неудачных попыток/час на e-mail, 30 запросов/мин на IP, одинаковый ответ на «нет пользователя» и «неверный пароль» |
| Кража сессии | срок 90 дней, список активных сессий с отзывом, выход удаляет только текущий токен |
| XSS | в каталоге и интерфейсе нет `innerHTML` с пользовательскими данными: только `textContent`/экранирование (`esc()`), CSP в `_headers` |
| SQL-инъекции | только параметризованные запросы D1 (`bind`), ни одной конкатенации |
| Боты и перебор | Turnstile на формах, rate limit на IP и на e-mail |
| Угон запроса (CSRF) | авторизация по `Authorization: Bearer`, а не по cookie; CORS ограничен своим доменом |
| Слишком большой payload | профиль ограничен 256 КБ, тело запроса парсится с обработкой ошибок |
| Утечка деталей об ошибках | наружу — общий текст, подробности только в логи Worker |

## Стоимость

| Компонент | Лимит Free | Когда перерастёт |
|---|---|---|
| Workers | 100 000 запросов/сутки | ~2 000 активных пользователей в день; дальше $5/мес |
| D1 | 5 ГБ, 5 млн чтений/сутки | десятки тысяч аккаунтов |
| Turnstile | 1 млн проверок/мес бесплатно | практически никогда |

## Локальная проверка

```bash
npx wrangler dev                # API на http://localhost:8787
# в js/config.js: SITE.apiBase = 'http://localhost:8787'
# в wrangler.toml: ALLOWED_ORIGINS = "http://localhost:5173"
```
