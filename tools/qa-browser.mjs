/**
 * Где взять браузер для QA-скриптов (tools/shots.mjs и разовые проверки).
 *
 * Обычный случай — Chrome, скачанный самим puppeteer. Но в песочнице разработки
 * скачать его нельзя: браузер распаковывает tools/chromium-offline.mjs в /tmp.
 * Раньше для этого приходилось вручную задавать LD_LIBRARY_PATH и
 * PUPPETEER_EXECUTABLE_PATH при каждом запуске — легко забыть, и проверка молча
 * уходила в «SKIP». Теперь путь подхватывается сам.
 *
 * Ещё две ситуации:
 *   1) в CI браузер обычно уже стоит в системе (/usr/bin/google-chrome) — берём его;
 *   2) если проверку запустили там, где браузер обязан быть (CI), молчаливый «SKIP»
 *      врёт: шаг выглядел бы зелёным без единой проверки. Поэтому GUSTOPLAY_REQUIRE_BROWSER=1
 *      превращает пропуск в ошибку (браузерныйSkip() ниже).
 *
 * Использование:
 *   import { browserOptions, browserSkip } from './qa-browser.mjs';
 *   const browser = await puppeteer.launch(browserOptions());
 */
import { existsSync } from 'node:fs';

export const QA_BROWSER = process.env.GUSTOPLAY_QA_BROWSER || '/tmp/gustoplay-qa-bin/chromium';
export const QA_LIBS = process.env.GUSTOPLAY_QA_LIBS || '/tmp/gustoplay-qa-lib/lib';

/** Браузеры, которые обычно уже стоят в системе (образы GitHub Actions, Linux-машины) */
export const SYSTEM_BROWSERS = [
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium', '/usr/bin/chromium-browser',
];
export const detectSystemBrowser = () => SYSTEM_BROWSERS.find((path) => existsSync(path)) || null;

/** Пропуск обязан быть громким там, где браузер есть: так требует CI-режим */
export const REQUIRE_BROWSER = process.env.GUSTOPLAY_REQUIRE_BROWSER === '1';

/** Дополнительные ключи запуска: проверки hover/pointer должны видеть настоящую мышь */
export const HOVER_ARGS = [
  '--no-sandbox', '--disable-dev-shm-usage',
  '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4',
];

export function browserOptions({ hover = false } = {}) {
  const opts = {
    headless: true,
    args: hover ? [...HOVER_ARGS] : ['--no-sandbox', '--disable-dev-shm-usage'],
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return opts;   // puppeteer читает эту переменную сам
  if (existsSync(QA_BROWSER)) {
    opts.executablePath = QA_BROWSER;
    if (existsSync(QA_LIBS)) opts.env = { ...process.env, LD_LIBRARY_PATH: QA_LIBS };
    return opts;
  }
  const system = detectSystemBrowser();
  if (system) opts.executablePath = system;
  return opts;
}

/**
 * Браузера нет. В обычном запуске — вежливый пропуск (exit 0), в CI-режиме — ошибка:
 * «зелёный шаг без проверок» хуже, чем честный провал.
 */
export function browserSkip(check, reason) {
  const where = REQUIRE_BROWSER ? '❌' : 'SKIP';
  console.log(`${where} ${check} — ${reason}`);
  if (REQUIRE_BROWSER) {
    console.log('   Это CI-режим (GUSTOPLAY_REQUIRE_BROWSER=1): без браузера проверка не выполнена, шаг считается проваленным.');
    process.exit(1);
  }
  process.exit(0);
}

/** Короткая подсказка для вывода: откуда взят браузер (или пусто, если браузер свой) */
export const browserSource = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return '';
  if (existsSync(QA_BROWSER)) return ` (браузер из ${QA_BROWSER})`;
  const system = detectSystemBrowser();
  return system ? ` (системный ${system})` : '';
};
