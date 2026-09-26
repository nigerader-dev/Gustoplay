/**
 * Проверка блока «Подходит ли ваш ПК»: разбор требований магазина, сопоставление моделей,
 * сравнение с комплектующими пользователя и разметка блока.
 *
 * Без сети и без браузера: логика сравнения (js/pcfit.js) чистая, разметка собирается в jsdom.
 * Отдельно проверяется, что на РЕАЛЬНЫХ данных каталога (js/catalog/sysreq.js) распознаётся
 * подавляющая часть параметров — иначе блок показывал бы «не проверено» почти всегда.
 *
 * Запуск: npm run test:pcfit
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true });
const { window } = dom;
for (const key of ['document', 'localStorage', 'sessionStorage', 'CustomEvent', 'Event', 'HTMLElement', 'Node']) {
  try { globalThis[key] = window[key]; } catch { /* ignore */ }
}
globalThis.window = window;
try { Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true }); } catch { /* ignore */ }
window.scrollTo = () => {};

const failures = [];
let passed = 0;
const check = (name, condition, extra = '') => {
  if (condition) { passed += 1; console.log(`  ✅ ${name}${extra ? ` — ${extra}` : ''}`); }
  else { console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ''}`); failures.push(name); }
};

const {
  normalize, matchPart, splitAlternatives, requirementPart, parseGB, parseDx, parseOs,
  analyzeLevel, compareWithPc, normalizePc, pcFilled, emptyPc, COMPARED,
} = await import('../js/pcfit.js');
const { CPUS, GPUS, UNKNOWN } = await import('../js/pcparts.js');
const { SYSREQ } = await import('../js/catalog/sysreq.js');
const { STRINGS, setLang } = await import('../js/i18n.js');
const store = await import('../js/store.js');
const { pcfitBlock, mountPcfit } = await import('../js/views/pcfit.js');

console.log('\n1. Сопоставление моделей');
const cpu = (text) => matchPart(text, CPUS)?.name || null;
const gpu = (text) => matchPart(text, GPUS)?.name || null;
check('простая модель процессора', cpu('Intel Core i5-2500') === 'Intel Core i5-2500', cpu('Intel Core i5-2500'));
check('модель с частотой и лишними словами',
  cpu('Intel® Core™ i7-4790 CPU @ 3.60GHz') === 'Intel Core i7-4790K' || cpu('Intel® Core™ i7-4790 CPU @ 3.60GHz') === 'Intel Core i7-4790',
  cpu('Intel® Core™ i7-4790 CPU @ 3.60GHz'));
check('написание без дефиса', cpu('AMD Ryzen 5 3600X') === 'AMD Ryzen 5 3600' || cpu('amd ryzen 5 3600') === 'AMD Ryzen 5 3600', cpu('AMD Ryzen 5 3600X'));
check('серия вместо модели — когда модель не названа', cpu('Intel Core i5 or better') === 'Intel Core i5 (серия)', cpu('Intel Core i5 or better'));
check('серия по поколению («i5, 3rd gen»)', cpu('Intel i5, 3rd gen (or equivalent)')?.includes('3-го поколения'), cpu('Intel i5, 3rd gen (or equivalent)'));
check('видеокарта с приставкой производителя', gpu('NVIDIA® GeForce® GTX 1060 6GB') === 'GeForce GTX 1060', gpu('NVIDIA® GeForce® GTX 1060 6GB'));
check('версия с памятью отличается от базовой', gpu('GeForce GTX 1060 3GB') === 'GeForce GTX 1060 3 GB', gpu('GeForce GTX 1060 3GB'));
check('встроенная графика Intel распознаётся', gpu('Intel HD Graphics 4400') === 'Intel HD Graphics 4400', gpu('Intel HD Graphics 4400'));
check('«Intel Graphics 4400» тоже распознаётся', gpu('Intel Graphics 4400 or better') === 'Intel HD Graphics 4400', gpu('Intel Graphics 4400 or better'));
check('написание без пробела («GT730»)', gpu('NVIDIA GeForce GT730') === 'GeForce GT 730', gpu('NVIDIA GeForce GT730'));
check('модель в обратном порядке слов («670 GTX»)', gpu('NVIDIA GeForce 670 GTX') === 'GeForce GTX 670', gpu('NVIDIA GeForce 670 GTX'));
check('Radeon с производителем не путается с серией', gpu('AMD Radeon R7 370') === 'Radeon R7 370', gpu('AMD Radeon R7 370'));
check('Radeon без модели — серия', gpu('AMD Radeon R7 or better') === 'Radeon R7 (серия)', gpu('AMD Radeon R7 or better'));
check('чужой производитель не подменяет модель (Intel против Radeon)',
  gpu('ATI Radeon HD 4000 series') === null, String(gpu('ATI Radeon HD 4000 series')));
check('строки без модели честно не распознаются',
  cpu('2.8 Ghz Quad Core CPU') === null && gpu('2 GB Dedicated Memory') === null,
  `${cpu('2.8 Ghz Quad Core CPU')} / ${gpu('2 GB Dedicated Memory')}`);

console.log('\n2. Разбор значений требований');
check('память в гигабайтах', parseGB('8 GB RAM') === 8);
check('память в мегабайтах', Math.abs(parseGB('512 MB') - 0.5) < 1e-9, String(parseGB('512 MB')));
check('русские единицы («8 ГБ ОЗУ»)', parseGB('8 ГБ ОЗУ') === 8);
check('место на диске («30 GB available space»)', parseGB('30 GB available space') === 30);
check('несколько чисел — берётся максимум', parseGB('4 GB, 8 GB recommended') === 8);
check('DirectX читается числом («9.0c»)', parseDx('9.0c') === 9);
check('DirectX из строки видеокарты («Direct X 11.0 compatible»)',
  analyzeLevel({ gpu: 'Direct X 11.0 compatible video card' }).dx === 11,
  String(analyzeLevel({ gpu: 'Direct X 11.0 compatible video card' }).dx));
check('система: «Windows 10 64-bit»', parseOs('Windows 10 64-bit').rank === 10 && parseOs('Windows 10 64-bit').bit64 === true);
check('система со знаком ® и сокращением «Win 7»', parseOs('Windows® 10').rank === 10 && parseOs('Win 7 SP1').rank === 6.1);
check('перечисление версий — берётся самая старая', parseOs('Windows 7 32/64-bit / Vista / XP').rank === 5.1, String(parseOs('Windows 7 32/64-bit / Vista / XP').rank));
check('голый номер версии тоже читается', parseOs('10').rank === 10);
check('Linux/macOS распознаются как «другая система»', parseOs('Ubuntu 12.04').other === true);

console.log('\n3. Альтернативы: требование выполнимо любой из моделей');
check('строка делится по «или»', splitAlternatives('GTX 660 or RX 460').length === 2);
const alt = requirementPart('NVIDIA GeForce GTX 1060 or AMD Radeon RX 480', GPUS);
check('для сравнения берётся самая слабая распознанная альтернатива',
  alt?.id === 'gtx-1060', `${alt?.name} (${alt?.score})`);
const cpuAlt = requirementPart('Intel Core i5-2500 / AMD FX-6100', CPUS);
check('то же для процессоров', cpuAlt?.id === 'fx-6100', `${cpuAlt?.name} (${cpuAlt?.score})`);

console.log('\n4. Распознавание на реальных данных каталога (401 игра)');
const stats = { cpu: [0, 0], gpu: [0, 0], ram: [0, 0], os: [0, 0], dx: [0, 0], disk: [0, 0] };
let levels = 0;
for (const entry of Object.values(SYSREQ)) {
  for (const levelName of ['min', 'rec']) {
    const source = entry[levelName];
    if (!source) continue;
    levels += 1;
    const parsed = analyzeLevel(source);
    const recognized = {
      cpu: Boolean(parsed.cpu),
      gpu: Boolean(parsed.gpu),
      ram: parsed.ram !== null,
      os: parsed.osRank !== null || parsed.osOtherOnly,
      dx: parsed.dx !== null,
      disk: parsed.disk !== null,
    };
    for (const key of Object.keys(stats)) if (source[key]) { stats[key][1] += 1; if (recognized[key]) stats[key][0] += 1; }
  }
}
const rate = (key) => Math.round((100 * stats[key][0]) / Math.max(1, stats[key][1]));
check('память распознаётся всегда', rate('ram') === 100, `${stats.ram[0]}/${stats.ram[1]}`);
check('место на диске распознаётся всегда', rate('disk') === 100, `${stats.disk[0]}/${stats.disk[1]}`);
check('DirectX распознаётся всегда', rate('dx') === 100, `${stats.dx[0]}/${stats.dx[1]}`);
check('система распознаётся почти всегда (≥ 95%)', rate('os') >= 95, `${rate('os')}% (${stats.os[0]}/${stats.os[1]})`);
check('процессор распознаётся в большинстве строк (≥ 70%)', rate('cpu') >= 70, `${rate('cpu')}% (${stats.cpu[0]}/${stats.cpu[1]})`);
check('видеокарта распознаётся в большинстве строк (≥ 70%)', rate('gpu') >= 70, `${rate('gpu')}% (${stats.gpu[0]}/${stats.gpu[1]})`);
check('в каталоге есть и минимальные, и рекомендуемые уровни', levels > 700, `${levels} уровней требований`);
check('справочник не содержит дублей идентификаторов',
  new Set([...CPUS, ...GPUS].map((p) => p.id)).size === CPUS.length + GPUS.length,
  `${CPUS.length} процессоров, ${GPUS.length} видеокарт`);

console.log('\n5. Вердикты на живых требованиях');
const game = { sysreq: SYSREQ['it-takes-two'] };
const weak = compareWithPc(game, { cpu: 'i5-8250u', gpu: 'intel-uhd-620', ram: 8, disk: 30, os: 'win-10', bits: '64' });
check('слабый ПК: «может не пойти» с перечнем нехватки',
  weak.verdict === 'not-enough' && weak.missing.length > 0, `${weak.verdict}: ${weak.missing.join(', ')}`);
const strong = compareWithPc(game, { cpu: 'ryzen-7-5800x3d', gpu: 'rtx-4070', ram: 32, disk: 400, os: 'win-11', bits: '64' });
check('сильный ПК: «тянет рекомендуемые»', strong.verdict === 'recommended', strong.verdict);
// Синтетическое требование: минимум (GTX 660, 8 GB) пройден, рекомендуемые (RTX 3060, 16 GB) — нет.
// Так проверяется именно правило вердикта, а не характеристика конкретной игры.
const mid = compareWithPc(
  { sysreq: { min: { ram: '8 GB', gpu: 'NVIDIA GeForce GTX 660' }, rec: { ram: '16 GB', gpu: 'NVIDIA GeForce RTX 3060' } } },
  { cpu: UNKNOWN, gpu: 'gtx-1660', ram: 16, disk: UNKNOWN, os: UNKNOWN, bits: UNKNOWN },
);
check('средний ПК: минимум пройден, до рекомендуемых не дотягивает', mid.verdict === 'minimum', `${mid.verdict}: ${JSON.stringify(mid.rows.find((r) => r.id === 'gpu'))}`);
check('строки таблицы содержат требования и ответ пользователя',
  mid.rows.find((r) => r.id === 'ram')?.need.min === '8 GB' && mid.rows.find((r) => r.id === 'ram')?.have === '16 GB',
  JSON.stringify(mid.rows.find((r) => r.id === 'ram')));
check('все параметры сравнения присутствуют в результате',
  COMPARED.every((id) => mid.rows.some((r) => r.id === id)), COMPARED.join(', '));
const noSpecs = compareWithPc(game, emptyPc());
check('без комплектующих вердикт «не хватает данных»', noSpecs.verdict === 'unknown');
check('пути «не знаю» не превращаются в «подходит»',
  noSpecs.rows.every((r) => r.min !== 'ok' && r.rec !== 'ok'),
  noSpecs.rows.map((r) => `${r.id}:${r.min}`).join(' '));
const noReq = compareWithPc({ sysreq: null }, { cpu: 'i5-10400', gpu: 'gtx-1660', ram: 16, disk: 100, os: 'win-10', bits: '64' });
check('игра без требований: честное «нечего сравнивать»', noReq.hasData === false && noReq.verdict === 'unknown');
const linux = compareWithPc(game, { cpu: 'i5-10400', gpu: 'gtx-1660', ram: 16, disk: 100, os: 'other', bits: '64' });
check('другая система: система и DirectX не сравниваются, остальное — да',
  linux.rows.find((r) => r.id === 'os').min === 'unknown' && linux.rows.find((r) => r.id === 'ram').min === 'ok',
  `${linux.verdict}`);
const bits32 = compareWithPc({ sysreq: { min: { ram: '8 GB', bit64: true } } }, { cpu: UNKNOWN, gpu: UNKNOWN, ram: 16, disk: UNKNOWN, os: 'win-10', bits: '32' });
check('32-битная система не проходит требование 64-бит',
  bits32.rows.find((r) => r.id === 'bits').min === 'fail' && bits32.verdict === 'not-enough',
  `${bits32.verdict}: ${bits32.missing.join(', ')}`);
check('неизвестные модели не считаются пройденными',
  compareWithPc(game, { cpu: UNKNOWN, gpu: UNKNOWN, ram: 16, disk: 100, os: 'win-10', bits: '64' })
    .rows.filter((r) => ['cpu', 'gpu'].includes(r.id)).every((r) => r.min === 'unknown'));

console.log('\n6. Профиль пользователя');
const cleaned = normalizePc({ cpu: 'не-существует', gpu: 'gtx-1660', ram: '16', disk: -5, os: 'win-10', bits: '32' });
check('мусор в профиле отбрасывается',
  cleaned.cpu === UNKNOWN && cleaned.gpu === 'gtx-1660' && cleaned.ram === 16 && cleaned.disk === UNKNOWN && cleaned.bits === '32',
  JSON.stringify(cleaned));
check('пустой профиль не считается заполненным', pcFilled(emptyPc()) === false && pcFilled({ ...emptyPc(), ram: 8 }) === true);
store.setMeta({ pc: { gpu: 'rtx-4060', ram: 32 } });
check('выбор комплектующих сохраняется в профиле устройства',
  store.getProfile().meta?.pc?.gpu === 'rtx-4060' && store.getProfile().meta?.pc?.ram === 32,
  JSON.stringify(store.getProfile().meta?.pc));
store.setMeta({ pc: emptyPc() });

console.log('\n7. Разметка блока');
const blockGame = { sysreq: SYSREQ['it-takes-two'] };
setLang('ru');
store.setMeta({ pc: { cpu: 'i5-10400', gpu: 'rtx-3050', ram: 16, disk: 60, os: 'win-10', bits: '64' } });
const ruBlock = pcfitBlock(blockGame);
check('в блоке есть все поля выбора', ['cpu', 'gpu', 'ram', 'disk', 'os', 'bits'].every((f) => ruBlock.includes(`data-pcfield="${f}"`)));
check('поля подписаны (label оборачивает select)', (ruBlock.match(/<label class="pcfit-field">/g) || []).length === 6);
check('показан вердикт и таблица сравнения', ruBlock.includes('pcfit-table') && ruBlock.includes('pcfit-verdict'), '');
check('вердикт объявляется вспомогательным технологиям', ruBlock.includes('aria-live="polite"'));
check('в таблице есть строки «Требуется» и «У вас»', ruBlock.includes('У вас') && ruBlock.includes('Требуется'));
check('оговорки о приблизительности на месте',
  ruBlock.includes('ориентировочная') && ruBlock.includes('DirectX считаем по версии системы'));
setLang('en');
const enBlock = pcfitBlock(blockGame);
check('английская версия переведена', enBlock.includes('Will your PC run it?') && enBlock.includes('Required'), enBlock.slice(0, 60));
// Требования магазина бывают опубликованы по-русски — это данные, а не перевод интерфейса,
// поэтому проверяем на синтетической игре с латинскими требованиями: кириллицы быть не должно.
const latinGame = { sysreq: { min: { os: 'Windows 10', cpu: 'Intel Core i5-2500', ram: '8 GB', gpu: 'GeForce GTX 660' } } };
check('в английской разметке нет кириллицы',
  !/[А-Яа-яЁё]/.test(pcfitBlock(latinGame)), pcfitBlock(latinGame).slice(0, 80));
setLang('ru');
store.setMeta({ pc: emptyPc() });
const emptyBlock = pcfitBlock(blockGame);
check('без комплектующих форма раскрыта, а вердикта нет',
  emptyBlock.includes('data-expanded="true"') && !emptyBlock.includes('pcfit-verdict'));
check('для игры без требований блок честно говорит, что сравнивать не с чем',
  pcfitBlock({ sysreq: null }).includes('сравнивать не с чем'));
store.setMeta({ pc: { cpu: 'i5-10400', gpu: 'gtx-1660', ram: 16, disk: 100, os: 'win-10', bits: '64' } });
const noDataBlock = pcfitBlock({ sysreq: { min: { note: '2.8 GHz Quad Core CPU' } } });
check('нераспознанные требования не дают ложного вердикта',
  noDataBlock.includes('Не хватает данных для оценки'), noDataBlock.slice(0, 80));
store.setMeta({ pc: emptyPc() });

console.log('\n8. Реакция на смену комплектующих');
window.document.body.innerHTML = `<div id="app">${pcfitBlock(blockGame)}</div>`;
mountPcfit(window.document.getElementById('app'));
const select = window.document.querySelector('[data-pcfield="gpu"]');
select.value = 'intel-hd-4000';
select.dispatchEvent(new window.Event('change', { bubbles: true }));
check('после выбора комплектующих блок пересчитан без перерисовки страницы',
  window.document.querySelector('.pcfit-table') !== null
  && window.document.querySelector('.pcfit-form') !== null
  && store.getProfile().meta?.pc?.gpu === 'intel-hd-4000',
  `saved: ${store.getProfile().meta?.pc?.gpu}`);
check('вердикт изменился на «может не пойти» (слабая встроенная графика)',
  window.document.querySelector('.pcfit-verdict')?.textContent.includes('Может не пойти'),
  window.document.querySelector('.pcfit-verdict')?.textContent?.slice(0, 60));
const toggle = window.document.querySelector('[data-action="pcfit-toggle"]');
toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check('кнопка сворачивает и разворачивает форму',
  window.document.querySelector('[data-pcfit]').dataset.expanded === 'false',
  window.document.querySelector('[data-pcfit]').dataset.expanded);
window.document.querySelector('[data-action="pcfit-reset"]')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check('сброс очищает выбор', store.getProfile().meta?.pc?.gpu === UNKNOWN,
  JSON.stringify(store.getProfile().meta?.pc));
store.setMeta({ pc: emptyPc() });

console.log('\n9. Словари');
const keys = Object.keys(STRINGS.ru).filter((k) => k.startsWith('pcfit.'));
check('ключи блока есть в обоих языках',
  keys.length > 30 && keys.every((k) => STRINGS.ru[k] && STRINGS.en[k]),
  `${keys.length} ключей`);
check('в русских текстах нет подстановок, которых нет в английских',
  keys.every((k) => (STRINGS.ru[k].match(/\{\w+\}/g) || []).join() === (STRINGS.en[k].match(/\{\w+\}/g) || []).join()),
  '');

console.log(`\nПроверок: ${passed + failures.length} · ✅ ${passed} · ❌ ${failures.length}`);
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
