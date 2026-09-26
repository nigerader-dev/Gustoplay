/**
 * Где взять браузер для QA-скриптов (tools/shots.mjs и разовые проверки).
 *
 * Обычный случай — Chrome, скачанный самим puppeteer. Но в песочнице разработки
 * скачать его нельзя: браузер распаковывает tools/chromium-offline.mjs в /tmp.
 * Раньше для этого приходилось вручную задавать LD_LIBRARY_PATH и
 * PUPPETEER_EXECUTABLE_PATH при каждом запуске — легко забыть, и проверка молча
 * уходила в «SKIP». Теперь путь подхватывается сам.
 *
 * Использование:
 *   import { browserOptions } from './qa-browser.mjs';
 *   const browser = await puppeteer.launch(browserOptions());
 */
import { existsSync } from 'node:fs';

export const QA_BROWSER = process.env.GUSTOPLAY_QA_BROWSER || '/tmp/gustoplay-qa-bin/chromium';
export const QA_LIBS = process.env.GUSTOPLAY_QA_LIBS || '/tmp/gustoplay-qa-lib/lib';

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
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return opts;
  if (existsSync(QA_BROWSER)) {
    opts.executablePath = QA_BROWSER;
    if (existsSync(QA_LIBS)) opts.env = { ...process.env, LD_LIBRARY_PATH: QA_LIBS };
  }
  return opts;
}

/** Короткая подсказка для вывода: откуда взят браузер (или пусто, если браузер свой) */
export const browserSource = () => (process.env.PUPPETEER_EXECUTABLE_PATH
  ? ''
  : (existsSync(QA_BROWSER) ? ` (браузер из ${QA_BROWSER})` : ''));
