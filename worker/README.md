# GustoPlay API — аккаунты, Google-вход, синхронизация

API реализован для Cloudflare Workers + D1. Этот репозиторий не подтверждает,
что API уже развёрнут, какие тарифы/лимиты доступны владельцу или сколько будет
стоить эксплуатация. Доменный маршрут `gustoplay.ru/api/*` описан как вариант
развёртывания; production-публикация и расходы требуют отдельного согласования.

## Что уже готово на сайте

- `#/account` — регистрация, вход, вход через Google, синхронизация профиля вкуса,
  список активных сессий, выход, удаление аккаунта (`js/views/account.js`).
- `js/api.js` — клиент API: Bearer-токен, авто-забывание при 401, Turnstile, Google Identity.
- `js/store.js` — автоотправка профиля на сервер через 4 секунды после изменения
  (debounce), только когда пользователь вошёл.
- Без настроенного API сайт работает в локальном режиме: профиль в localStorage.

## Настройка (операции ниже не выполнялись)

Это инструкция для владельца. Не создавать аккаунты/ключи, не применять remote D1
миграции и не публиковать Worker без согласования; проверьте актуальные тарифы и
условия Cloudflare и сторонних провайдеров перед включением.

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
| Подбор пароля | фиксированное окно: до 20 попыток/час на e-mail и до 30 запросов/мин на IP; одинаковый ответ на «нет пользователя» и «неверный пароль» |
| Кража сессии | срок 90 дней, список активных сессий с отзывом, выход удаляет текущую сессию |
| XSS | данные в HTML-контекстах экранируются (`esc()`), store URL ограничены HTTPS; JSON-LD защищён от закрывающего `</script>`; регрессия — `npm run test:functional` |
| SQL-инъекции | обработчики используют подготовленные D1-запросы с `bind`; API-тесты выполняются на локальном SQLite-эмуляторе, не на production D1 |
| Боты и перебор | Turnstile реализован опционально, но не работает без site key + `TURNSTILE_SECRET`; rate limit проверяется локально |
| CSRF / браузерные credentials | авторизация по `Authorization: Bearer`, fetch с `credentials: omit`, CORS без cookie credentials |
| Размер JSON | тело auth до 16 КиБ, профиль до 256 КиБ UTF-8; ошибки 400/413 |
| Ошибки | клиент получает общий текст 500; Worker пишет stack trace в журналы провайдера |

## Тарифы и расходы

Стоимость, лимиты, бесплатные квоты и прогноз пользователей не приводятся: они
зависят от аккаунта, региона, тарифов и реального трафика, а в этой среде не
проверялись. До включения сервиса владелец должен свериться с актуальными
официальными условиями Cloudflare и почтового провайдера и отдельно согласовать
любые расходы.

## Локальная проверка

```bash
npx wrangler dev                # API на http://localhost:8787
# в js/config.js: SITE.apiBase = 'http://localhost:8787'
# в wrangler.toml: ALLOWED_ORIGINS = "http://localhost:5173"
```
