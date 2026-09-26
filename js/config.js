/**
 * Конфигурация GustoPlay. Это единственный файл, который нужно менять при деплое.
 *
 * Что настраивается здесь:
 *   1) бренд и домен             → SITE
 *   2) аккаунты и Google-вход    → AUTH (см. docs/ACCOUNTS.md)
 *   3) реклама (РСЯ / AdSense)   → ADS   (см. docs/MONETIZATION.md)
 *   4) аналитика                 → ANALYTICS
 *   5) поведение интерфейса      → FEATURES / CONTENT
 */

export const SITE = {
  name: 'GustoPlay',
  /** Короткая подпись в шапке и метатегах */
  tagline: { ru: 'Подбор игры по вкусу за 60 секунд', en: 'Find your next game in 60 seconds' },
  domain: 'gustoplay.ru',
  // Канонический адрес сайта (без завершающего слэша). Завершающий слэш в конце — стиль
  // адресов с «/» в конце (GitHub Pages делает 301 на /quiz/). При сборке для зеркала
  // перезаписывается флагом --site-url.
  url: 'https://gustoplay.ru',
  // Базовый путь деплоя: '' — корень домена, '/mydev' — подпапка (GitHub Pages).
  // Пусто — выводится из pathname у url. Заполняется сборкой флагом --site-url/--base.
  base: '',
  email: 'hello@gustoplay.ru',
  telegram: 'https://t.me/+K915edYs7C1iNTEy',
  languages: ['ru', 'en'],
  defaultLang: 'ru',
  /**
   * Адрес API для аккаунтов и синхронизации профиля.
   *  '' — тот же домен (рекомендуется: Cloudflare Worker на маршруте /api/*).
   *  'https://api.gustoplay.ru' — отдельный поддомен.
   * Если оставить пустым и не разворачивать Worker, сайт продолжит работать в локальном режиме:
   * профиль вкуса хранится только в браузере, вход и синхронизация просто скрыты.
   */
  apiBase: '',   // '/api' — после деплоя worker/ (см. docs/ACCOUNTS.md); пустая строка = локальный режим
  /** Ссылки на партнёрские программы магазинов. Пусто — обычные ссылки без меток. */
  affiliates: {
    steam: '',          // например: '&utm_source=gustoplay'
  },
};

export const AUTH = {
  /** Вход по e-mail и паролю: работает всегда, когда развёрнут API */
  emailPassword: true,
  /**
   * Google Sign-In (One Tap и кнопка). Вставьте OAuth Client ID из Google Cloud Console.
   * Пусто — кнопка Google не показывается, вход остаётся по e-mail.
   * Пошаговая инструкция: docs/ACCOUNTS.md
   */
  googleClientId: '',   // Client ID из Google Cloud → docs/ACCOUNTS.md
  /** Cloudflare Turnstile (защита от ботов). Site key виден в HTML, secret — только на сервере. */
  turnstileSiteKey: '', // Site key Cloudflare Turnstile → docs/SECURITY.md
  /**
   * Требовать подтверждение e-mail перед синхронизацией профиля.
   * Пока только задел: сервер это поле не читает (см. docs/ACCOUNTS.md) — включение
   * само по себе ничего не изменит, нужна доработка Worker'а и рассылки.
   */
  requireEmailVerification: false,
  /** Показывать пользователю список активных сессий с возможностью выхода */
  sessionsList: true,
  /** Автосинхронизация профиля вкуса при изменениях (в секундах) */
  syncDebounce: 4,
};

export const ADS = {
  /** 'mock' | 'rsya' | 'adsense' | 'both' — какая сеть реально показывается */
  mode: 'mock',
  /** Согласие на cookie: без него реклама не грузится, показывается баннер. */
  consentRequired: true,
  /** Сколько рекламных блоков на страницу максимум (защита от «рекламной простыни»). */
  maxPerPage: 3,
  /** Не показывать рекламу на этих страницах (удобство важнее денег). */
  excludeRoutes: ['/quiz', '/account'],

  /** Текст раскрытия партнёрских ссылок — выводится в условиях использования и на странице игры */
  affiliateDisclosure: {
    ru: 'Часть ссылок на магазины партнёрские: если вы купите игру по такой ссылке, магазин может поделиться с нами небольшой комиссией. Цена для вас не меняется.',
    en: 'Some store links are affiliate links: if you buy a game through one, the store may share a small commission with us. Your price stays the same.',
  },

  rsya: {
    /** ID аккаунта РСЯ, например 1234567 */
    clientId: 'R-A-000000-1',
    blocks: {
      'home-top': 'R-A-000000-1',
      'results-inline': 'R-A-000000-2',
      'game-side': 'R-A-000000-3',
      'catalog-inline': 'R-A-000000-4',
    },
  },

  adsense: {
    /** data-ad-client, например ca-pub-0000000000000000 */
    client: 'ca-pub-0000000000000000',
    blocks: {
      'home-top': '0000000000',
      'results-inline': '0000000000',
      'game-side': '0000000000',
      'catalog-inline': '0000000000',
    },
    /** Автоматические блоки AdSense, если включены в панели */
    autoAds: false,
  },

  /** Строки для ads.txt (генерируется в сборке). Заполните реальными ID перед деплоем. */
  adsTxt: [
    // 'yandex.com, 1234567, DIRECT',
    // 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0',
  ],

  /** Своя реклама (например, свой Telegram-канал) — показывается, если сеть не подключена. */
  house: {
    enabled: true,
    title: { ru: 'Новая подборка каждую неделю', en: 'Fresh picks every week' },
    text: {
      ru: 'Мы добавляем игры в каталог и публикуем разборы подборок. Загляните в наш Telegram.',
      en: 'We keep adding games and posting curated picks. Join our Telegram.',
    },
    url: 'https://t.me/+K915edYs7C1iNTEy',
    cta: { ru: 'Открыть Telegram', en: 'Open Telegram' },
  },
};

/** Слоты рекламы: где именно на страницах что показываем. */
export const AD_SLOTS = {
  'home-top':       { size: '970×90', formats: ['rsya', 'adsense'], label: { ru: 'Горизонтальный баннер', en: 'Leaderboard' } },
  'results-inline': { size: '728×90', formats: ['rsya', 'adsense'], label: { ru: 'Блок в ленте результатов', en: 'In-feed unit' } },
  'catalog-inline': { size: '728×90', formats: ['rsya', 'adsense'], label: { ru: 'Блок в каталоге', en: 'Catalog unit' } },
  'game-side':      { size: '300×250', formats: ['rsya', 'adsense'], label: { ru: 'Блок на странице игры', en: 'Game page unit' } },
};

/** Аналитика (необязательно). */
export const ANALYTICS = {
  plausibleDomain: '',   // например 'gustoplay.ru'
  umamiScript: '',       // полный URL скрипта umami
  yandexMetrika: '',     // номер счётчика Метрики, например '12345678'
};

export const FEATURES = {
  /** живой счётчик «подходящих игр» в квизе */
  livePoolCounter: true,
  /** Показывать блок «похожие игры» на странице игры */
  similar: true,
  /** Разрешить выгрузку профиля вкуса в JSON */
  exportProfile: true,
  /** Кнопка «обновить подбор» (перемешивает выдачу без изменения профиля) */
  reshuffle: true,
  /** Максимум игр в выдаче за раз */
  pageSize: 12,
  /** Блок «Почему подходит» в карточках и на странице игры. false — объяснения скрыты */
  scoreDebug: true,
  /** Показывать в интерфейсе пометки о партнёрских ссылках (нужно для честности и модерации) */
  affiliateLinks: true,
  /**
   * true — в папке /covers лежат файлы <slug>.jpg с официальными артами (нужны права!).
   * Такие файлы идут первыми, а при их отсутствии картинка тихо откатывается
   * на арт магазина и на сгенерированную обложку. false — сразу арт магазина:
   * для всех 436 игр он уже сопоставлен в js/catalog/steam-covers.js.
   */
  realCovers: false,
};

export const CONTENT = {
  /**
   * Лимит отметок в профиле вкуса. Держит профиль в пределах, которые принимает
   * сервер (256 КБ в worker/index.js), и защищает localStorage от переполнения.
   */
  maxMarks: 400,
};

/**
 * Настройки безопасности, которые видит фронтенд.
 * Серверная часть (сессии, пароли, rate limit) настраивается в wrangler.toml и docs/SECURITY.md.
 */
export const SECURITY = {
  /** Минимальная длина пароля (проверяется ещё и на сервере) */
  minPasswordLength: 10,
  /** Показывать индикатор надёжности пароля */
  passwordStrengthMeter: true,
  /**
   * Ориентир для интерфейса: сколько запросов в минуту допускает сервер.
   * Реальные лимиты живут в Worker'е (worker/index.js: AUTH_RATE_PER_MIN,
   * FAILED_LOGINS_PER_HOUR) и на клиенте не настраиваются.
   */
  sensitiveRateLimit: 10,
};
