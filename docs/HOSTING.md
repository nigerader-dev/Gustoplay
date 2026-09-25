# Хостинг, домен и инфраструктура

## Короткий ответ

**Cloudflare Pages + домен .com.** Это бесплатно, без лимита трафика, с глобальным CDN, бесплатным SSL и
автоматическим деплоем из GitHub. Для сайта, который живёт на рекламе, лимиты важнее удобства: у Vercel/Netlify
на бесплатных тарифах есть ограничение по трафику (~100 ГБ/мес), а превышение лимита = отключение сайта.
У Cloudflare Pages лимит трафика отсутствует, а статика отдаётся с ближайшей к пользователю точки.

---

## Вариант 1 (рекомендуется): Cloudflare Pages

### Шаг 1. Репозиторий

```bash
cd <папка репозитория>
git init                       # если репозитория ещё нет
git add .
git commit -m "GustoPlay: сайт подбора игр"
git remote add origin https://github.com/<ваш-аккаунт>/gustoplay.git
git push -u origin main
```

### Шаг 2. Подключение к Pages

1. Зарегистрируйтесь на [dash.cloudflare.com](https://dash.cloudflare.com) (нужна почта).
2. **Workers & Pages → Create → Pages → Connect to Git** → выберите репозиторий.
3. Настройки сборки:
   - Framework preset: **None**
   - Build command: `npm install && npm run build`
   - Build output directory: `dist`
4. Deploy. Через ~1 минуту сайт доступен на `https://<project>.pages.dev`.

> Нужен ли шаг сборки? Он делает **пре-рендер 562 страницы** (каждая страница получает готовый HTML —
> это важно для SEO) и генерирует `sitemap.xml`, `robots.txt`, `ads.txt`, `_headers`, `_redirects`.
> Если не хотите зависимости — можно вообще не собирать: укажите Build command пустым и Output directory `/`.
> Сайт будет работать, но страницы станут «пустыми» для роботов до выполнения JS.

### Шаг 3. Свой домен

1. **Купить домен**: для `.ru` — аккредитованный регистратор (reg.ru, nic.ru, timeweb; Cloudflare Registrar зоны `.ru` не продаёт); для `.com`/`.games` — Cloudflare Registrar (по себестоимости, ~$10/год) либо Namecheap/Porkbun.
2. В Pages → **Custom domains → Set up a custom domain** → введите домен.
3. Если домен куплен у Cloudflare — DNS настроится сам; иначе пропишите CNAME на `<project>.pages.dev`.
4. SSL/TLS: режим **Full (strict)**, включите «Always Use HTTPS».
5. Привяжите и `www`: **Redirect Rules** → `www.example.com/*` → `https://example.com/$1` (301).

### Шаг 4. Правила кеша и фолбэк

Файлы `_headers` и `_redirects` уже генерируются сборкой:
- `/js/*` и `/css/*` кешируются на год (у нас есть версионирование через имя файла при желании);
- HTML — без кеша, чтобы правки появлялись сразу;
- SPA-фолбэк `/* → /index.html 200` нужен для ЧПУ вида `/game/balatro` (History API).

### Шаг 5. Аналитика и мониторинг

- **Cloudflare Web Analytics** — бесплатно, без cookie (включается в панели).
- **Plausible/Umami** — впишите домен в `ANALYTICS.plausibleDomain` в `js/config.js`.
- **Яндекс.Метрика** — `ANALYTICS.yandexMetrika = '12345678'` (важен «Вебвизор» и карта кликов для рекламы).
- Внешний аптайм-мониторинг: UptimeRobot / Better Stack (бесплатные тарифы), пинг раз в 5 минут.

---

## Вариант 2: Netlify / Vercel

Те же шаги: подключить репозиторий, build `npm run build`, publish `dist`. Плюс — удобные превью-ветки.
Минус — лимиты трафика на бесплатном тарифе. Подойдёт на старте, но при выходе на 50–100 тыс. визитов/мес
лучше переехать на Cloudflare (переезд = смена NS, 10 минут).

## Вариант 3: GitHub Pages

Поддерживается из коробки: процесс `.github/workflows/pages.yml` при каждом push собирает сайт
с адресом зеркала (`node tools/build-static.mjs --site-url=https://<owner>.github.io/<repo> --trailing-slash`)
и публикует его на GitHub Pages. Все canonical/sitemap/JSON-LD при этом указывают на адрес зеркала —
сайт сам канонизируется и не конкурирует с основным доменом в поиске.

Один раз: **Settings → Pages → Source: GitHub Actions** (workflow попытается включить это сам
на шаге «Включить GitHub Pages»).

Что отличается от Cloudflare Pages:
- нет SPA-фолбэка — роль фолбэка играет `404.html` (уже собирается), пре-рендеренные страницы
  отдаются как обычные файлы, а `/quiz` GitHub сам редиректит на `/quiz/` (поэтому у зеркала
  слэшевые адреса);
- нет своих заголовков (CSP/HSTS из `_headers` не работают — они остаются для Cloudflare);
- `robots.txt`/`ads.txt` живут в `/<repo>/`, а не в корне `*.github.io` — поисковики их не читают,
  sitemap нужно добавлять в Search Console вручную;
- реклама на `*.github.io` работает хуже: у домена нет «своего» доверия, а некоторые сети требуют
  свой домен — для дохода основным хостингом остаётся Cloudflare.

## Вариант 4: VPS + nginx (когда появится backend)

Нужен, если добавляем аккаунты, синхронизацию профиля, свой поиск или парсинг цен.
Ориентир по стоимости: 200–500 ₽/мес (Timeweb, Aeza, Hetzner CX22 ~€4).

```nginx
server {
  listen 443 ssl http2;
  server_name gustoplay.ru;

  root /var/www/gustoplay/dist;
  index index.html;

  # ЧПУ: любые пути отдаём приложению
  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(js|css|svg|webp|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  add_header X-Content-Type-Options nosniff;
  add_header Referrer-Policy strict-origin-when-cross-origin;
}
```

SSL: `certbot --nginx -d gustoplay.ru -d www.gustoplay.ru` (Let's Encrypt, обновляется автоматом).

## Куда расти дальше (без переписывания сайта)

| Задача | Решение | Стоимость |
|---|---|---|
| Аккаунты и синхронизация профиля | Cloudflare Workers + D1 (SQLite) или Supabase | бесплатные тарифы хватает |
| Цены и наличие в магазинах | Steam Web API + CheapShark (парсинг цен) на Workers с кешем в KV | бесплатно |
| «Подборки для друга» (шареная ссылка) | Cloudflare KV: сохраняем профиль по короткому коду | бесплатно до 100k чтений/день |
| Картинки игр | Cloudflare Images или собственный арт по лицензии студий | от $5/мес |
| Поиск по каталогу | Meilisearch / Cloudflare Vectorize (по описаниям) | бесплатный тариф / от $5 |

## Чек-лист перед запуском

- [ ] Домен куплен, SSL включён, `www` → 301 на основной домен.
- [ ] В `js/config.js` заменён `SITE.domain/url/email`, включена аналитика.
- [ ] Собрано `npm run build`, `dist/` залит, `ads.txt` открывается по адресу.
- [ ] Проверены `robots.txt`, `sitemap.xml`, 404-страница.
- [ ] Открыты в мобильном Chrome и Safari: навигация, квиз, скролл, кнопки отметок.
- [ ] Прогнаны `npm run check` и `npm run test` (каталог и интерфейс без ошибок).
- [ ] Проверена почта для рекламных сетей и обратной связи.
