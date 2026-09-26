/**
 * Проверка сбора требований к ПК без сети: поднимаем локальную «заглушку Steam»
 * и прогоняем через неё настоящий tools/pull-system-requirements.mjs.
 *
 * Зачем: у песочницы и у CI нет гарантированного доступа к store.steampowered.com,
 * а сам сборщик — код с разбором HTML, слиянием ru/en и повторным запросом без
 * фильтра. Заглушка отвечает ровно так, как отвечал магазин 26.09.2026 (проверено
 * прогоном в Actions):
 *   • один appid — нормальный ответ;
 *   • несколько appid в запросе — HTTP 400 (именно из-за этого первый прогон
 *     собрал 0 игр: сборщик запрашивал по 20 appid за раз);
 *   • часть игр отдаёт данные только без filters=pc_requirements;
 *   • часть — только рекомендуемые требования;
 *   • приложение без требований — success:true, но pc_requirements отсутствует;
 *   • троттлинг: на первые запросы магазин отвечает success:true с пустым data
 *     (именно так отвечал прогон 3 на 293 игры из 401) — повторный проход должен
 *     такие игры добрать.
 *
 * Запуск: npm run test:sysreq
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const failures = [];
let passed = 0;
const check = (name, condition, extra = '') => {
  if (condition) { passed += 1; console.log(`  ✅ ${name}${extra ? ` — ${extra}` : ''}`); }
  else { console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ''}`); failures.push(name); }
};

/* --- Требования «как в магазине»: HTML с переносами и 64-битной плашкой --- */

const HTML_MIN = 'Minimum:<br><strong>OS:</strong> Windows 10 64-bit<br>'
  + '<strong>Processor:</strong> Intel Core i5-2500<br><strong>Memory:</strong> 8 GB RAM<br>'
  + '<strong>Graphics:</strong> NVIDIA GTX 760<br><strong>DirectX:</strong> Version 11<br>'
  + '<strong>Storage:</strong> 30 GB available space<br>'
  + '<strong>Additional Notes:</strong> Requires a 64-bit processor and operating system';
const HTML_MIN_B = HTML_MIN.replace(/<strong>Additional Notes:<\/strong>[^<]*/, '<strong>Additional Notes:</strong> Online play needs a free account');
const HTML_REC = 'Recommended:<br><strong>OS:</strong> Windows 11<br>'
  + '<strong>Processor:</strong> Ryzen 5 3600<br><strong>Memory:</strong> 16 GB RAM<br>'
  + '<strong>Graphics:</strong> RTX 2060<br><strong>Storage:</strong> 50 GB available space';

// Русская страница того же appid: единицы и тексты отличаются — проверяем слияние
const HTML_MIN_RU = 'Минимальные:<br><strong>ОС:</strong> Windows 10 64-bit<br>'
  + '<strong>Процессор:</strong> Intel Core i5-2500<br><strong>Оперативная память:</strong> 8 ГБ ОЗУ<br>'
  + '<strong>Видеокарта:</strong> NVIDIA GTX 760<br><strong>DirectX:</strong> Версия 11<br>'
  + '<strong>Место на диске:</strong> 30 ГБ<br>'
  + '<strong>Дополнительно:</strong> Требуется 64-битный процессор и операционная система';
const HTML_REC_RU = 'Рекомендуемые:<br><strong>ОС:</strong> Windows 11<br>'
  + '<strong>Процессор:</strong> Ryzen 5 3600<br><strong>Оперативная память:</strong> 16 ГБ ОЗУ<br>'
  + '<strong>Видеокарта:</strong> RTX 2060<br><strong>Место на диске:</strong> 50 ГБ';

/* Четыре игры: полные требования, только рекомендуемые, пусто с фильтром,
   и требования без 64-битной плашки. */
const GAMES = {
  100: { ru: { minimum: HTML_MIN_RU, recommended: HTML_REC_RU }, en: { minimum: HTML_MIN, recommended: HTML_REC } },
  200: { ru: { recommended: HTML_REC_RU }, en: { recommended: HTML_REC } },
  300: { ru: { minimum: HTML_MIN_RU, recommended: HTML_REC_RU }, en: { minimum: HTML_MIN_B, recommended: HTML_REC }, filterBroken: true },
  // 500 — троттлинг: первые два запроса по языку отдают success:true с пустым data,
  // данные появляются только с третьего (это и есть проверка повторного прохода)
  500: { ru: { minimum: HTML_MIN_RU, recommended: HTML_REC_RU }, en: { minimum: HTML_MIN, recommended: HTML_REC }, throttleUntil: 2 },
  // 300 отличается от 100 отсутствием примечания — по нему и ловим второй разбор
  400: { ru: { minimum: 'Минимальные:<br><strong>ОС:</strong> Windows 7<br><strong>Оперативная память:</strong> 4 ГБ ОЗУ' }, en: { minimum: 'Minimum:<br><strong>OS:</strong> Windows 7<br><strong>Memory:</strong> 4 GB RAM' } },
};

const requests = [];
const hits = {};

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const ids = String(url.searchParams.get('appids') || '').split(',').filter(Boolean);
  const lang = url.searchParams.get('l') || 'english';
  const filters = url.searchParams.get('filters');
  requests.push({ ids, lang, filters });

  const json = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  // Магазин отвечает 400, если в appids больше одного идентификатора
  if (ids.length !== 1) return json(400, { error: 'too many appids' });

  const id = ids[0];
  const game = GAMES[id];
  if (!game) return json(200, { [id]: { success: false } });
  // Троттлинг: магазин отвечает success:true и пустым data, пока не «остынет»
  if (game.throttleUntil) {
    hits[id] = (hits[id] || 0) + 1;
    if (hits[id] <= game.throttleUntil * 3) return json(200, { [id]: { success: true, data: [] } });
  }
  // Магазин понимает l=russian|english, в данных игры языки названы ru|en
  const reqs = game[lang === 'russian' ? 'ru' : 'en'] || {};
  if (!reqs.minimum && !reqs.recommended) return json(200, { [id]: { success: true, data: [] } });
  // У «сломанного фильтром» приложения appdetails с filters отдаёт пустой data
  if (game.filterBroken && filters) return json(200, { [id]: { success: true, data: [] } });
  return json(200, { [id]: { success: true, data: { type: 'game', name: `Game ${id}`, pc_requirements: reqs } } });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

/* --- Каталог для прогона: подменяем часть игр своими slug/steamId --- */

const tmp = await mkdtemp(join(tmpdir(), 'gustoplay-sysreq-'));
const out = join(tmp, 'sysreq.js');
const review = join(tmp, 'review.txt');

const run = spawn('node', [
  'tools/pull-system-requirements.mjs',
  '--limit=5',
  '--passes=3',
  '--delay=1',
  // --ids подменяет appid первых игр каталога на тестовые (ключ для проверок)
  `--ids=${Object.keys(GAMES).join(',')}`,
  `--out=${out}`,
  `--review=${review}`,
], {
  cwd: root,
  env: { ...process.env, SYSREQ_API_BASE: `http://127.0.0.1:${port}` },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stdout = '';
let stderr = '';
run.stdout.on('data', (d) => { stdout += d; });
run.stderr.on('data', (d) => { stderr += d; });
const code = await new Promise((r) => run.on('close', r));

console.log('\n1. Сборщик и заглушка магазина');
check('сборщик завершился без ошибок', code === 0, `код ${code}${stderr ? `, stderr: ${stderr.slice(0, 200)}` : ''}`);
check('сборщик не запрашивает больше одного appid за раз',
  requests.every((r) => r.ids.length === 1),
  `${requests.filter((r) => r.ids.length !== 1).length} пакетных запросов из ${requests.length}`);
check('каждый appid запрошен на обоих языках',
  new Set(requests.filter((r) => r.lang === 'russian').map((r) => r.ids[0])).size === 5
  && new Set(requests.filter((r) => r.lang === 'english').map((r) => r.ids[0])).size === 5);
const app300 = requests.filter((r) => r.ids[0] === '300');
check('повтор без фильтра делается только там, где фильтр вернул пусто',
  app300.length === 4 && app300.some((r) => r.filters) && app300.some((r) => !r.filters)
  && requests.filter((r) => r.ids[0] === '100').length === 2,
  `300: ${app300.length} запросов, 100: ${requests.filter((r) => r.ids[0] === '100').length}`);

const expectedCollected = Object.keys(GAMES).length;

console.log('\n2. Разбор и запись файла');
const file = await readFile(out, 'utf8');
const sysreq = (await import(`file://${out}?t=${Date.now()}`)).SYSREQ;
check('в файле есть заголовок с источником данных', file.includes('Steam Store API'), file.slice(0, 60).replace(/\n/g, ' '));
check('собраны все пять игр, включая «троттлящуюся»', Object.keys(sysreq).length === 5, Object.keys(sysreq).join(', '));
check('игра с пустыми ответами добрана повторным проходом',
  Object.values(sysreq).some((e) => e.min?.os === 'Windows 7')
  && Object.values(sysreq).filter((e) => e.min?.os === 'Windows 10 64-bit').length === 3,
  JSON.stringify(Object.values(sysreq).map((e) => e.min?.os || e.rec?.os || null)));

// Повторный проход не должен работать вечно: игра без требований остаётся без них
check('повторные проходы не запрашивают уже собранные игры повторно',
  requests.filter((r) => r.ids[0] === '100').length === 2
  && requests.filter((r) => r.ids[0] === '500').length > 2,
  `100: ${requests.filter((r) => r.ids[0] === '100').length}, 500: ${requests.filter((r) => r.ids[0] === '500').length}`);

// Игры ищем по содержимому: в файле ключи отсортированы по slug, порядок запросов
// на него не влияет (id тестовые, slug — настоящие из каталога).
const entries = Object.values(sysreq);
const full = entries.find((e) => e.min?.os === 'Windows 10 64-bit' && !/account/i.test(String(e.min.note || '')));
const filterBroken = entries.find((e) => /account/i.test(String(e.min?.note || '')));
const recOnly = entries.find((e) => e.rec && !e.min);
const minor = entries.find((e) => e.min?.os === 'Windows 7');
check('каждая игра нашлась по своим данным',
  Boolean(full && filterBroken && recOnly && minor),
  `full=${Boolean(full)} filterBroken=${Boolean(filterBroken)} recOnly=${Boolean(recOnly)} minor=${Boolean(minor)}`);
check('минимальные и рекомендуемые разобраны по полям',
  full.min.os === 'Windows 10 64-bit' && full.min.ram === '8 GB'
  && full.rec.cpu === 'Ryzen 5 3600' && full.rec.disk === '50 GB',
  JSON.stringify(full.min));
check('русские единицы измерения приведены к общим («8 ГБ ОЗУ» → «8 GB RAM»)',
  full.min.ram === '8 GB RAM' || full.min.ram === '8 GB',
  String(full.min.ram));
check('DirectX хранится коротко, без слова «Version»/«Версия»',
  full.min.dx === '11', String(full.min.dx));
check('64-битная плашка распознана и записана флагом',
  full.min.bit64 === true);
check('«Requires a 64-bit…» не попало в текст примечаний',
  !/64-bit processor/i.test(String(full.min.note || '')),
  String(full.min.note || '—'));
check('игра только с рекомендуемыми не выдумывает минимальные',
  recOnly.rec && !recOnly.min, JSON.stringify(recOnly).slice(0, 120));
check('приложение, у которого filters отдаёт пустой data, дочитано без фильтра',
  filterBroken.min.os === 'Windows 10 64-bit' && filterBroken.rec && /account/i.test(String(filterBroken.min.note)),
  JSON.stringify(filterBroken.min).slice(0, 140));
check('игра без 64-битной плашки остаётся без флага bit64',
  minor.min.bit64 === undefined);
check('в файле нет HTML-тегов', !/<br|<strong|<li/i.test(file));

console.log('\n3. Отчёт сборщика');
const report = await readFile(review, 'utf8');
check('отчёт называет число игр с требованиями',
  new RegExp(`Требования к ПК: ${expectedCollected} из 401`).test(report), report.split('\n')[0]);
// Отчёт считается по ВСЕМУ каталогу (401 игра со steamId), даже когда порция
// запросов маленькая: иначе порционный прогон стирал бы чужие данные.
const missing = Number((report.match(/Данные не получены[^:]*: (\d+)/) || [])[1]);
check('отчёт считает покрытие по всему каталогу, а не по порции',
  new RegExp(`Требования к ПК: ${expectedCollected} из 401 игр со steamId`).test(report)
  && missing === 401 - expectedCollected,
  (report.split('\n').slice(0, 3).join(' | ')).slice(0, 120));
check('приложения без требований перечислены строками MISS',
  /^MISS /m.test(report)
  && !/^MISS (deep-rock-galactic|helldivers-2|left-4-dead-2|warhammer-end-times-vermintide-2) /m.test(report),
  `${(report.match(/^MISS /gm) || []).length} строк MISS`);
check('отчёт не содержит ошибок сети', /Запросов, которые не прошли \(сеть\/HTTP\/разбор JSON\): 0/.test(report),
  (report.split('\n').find((l) => l.startsWith('Запросов, которые не прошли')) || '').slice(0, 80));
check('в отчёте видно, сколько игр добавил каждый проход',
  /По проходам: проход 1 — \d+ игр/.test(report),
  (report.split('\n').find((l) => l.startsWith('По проходам')) || '').slice(0, 90));
check('отчёт объясняет, как получены требования',
  /Как получены: /.test(report), (report.split('\n').find((l) => l.startsWith('Как получены')) || '').slice(0, 100));

console.log('\n4. Разбор русских и английских страниц по отдельности');
const { parseSteamRequirements } = await import('../tools/pull-system-requirements.mjs');
const ru = parseSteamRequirements(HTML_MIN_RU);
const en = parseSteamRequirements(HTML_MIN);
check('русская страница разобрана', ru.os === 'Windows 10 64-bit' && /i5-2500/.test(ru.cpu), JSON.stringify(ru).slice(0, 120));
check('английская страница разобрана', en.os === 'Windows 10 64-bit' && en.ram === '8 GB RAM', JSON.stringify(en).slice(0, 120));
check('перенос строки внутри значения не теряется',
  parseSteamRequirements('OS: Windows 10<br>Processor: Core i3').cpu === 'Core i3');
check('пустой вход не выдумывает полей',
  parseSteamRequirements('') === null && parseSteamRequirements(null) === null);

// Качество значений: магазин пишет метки со звёздочкой и подмешивает чужие строки
const messy = parseSteamRequirements('Minimum:<br><strong>OS *:</strong> Windows 10 64-bit<br>'
  + '<strong>Storage:</strong> 60 GB<br>VR Support: 10GB VRAM GPU<br>or better<br>'
  + '<strong>Additional Notes:</strong> /');
check('метка со звёздочкой («OS *:») распознаётся', messy.os === 'Windows 10 64-bit', JSON.stringify(messy.os));
check('неизвестная метка не приклеивается к предыдущему полю',
  messy.disk === '60 GB' && !/VR|better/.test(JSON.stringify(messy)), JSON.stringify(messy));
check('значение из одного разделителя («/») не попадает в данные',
  messy.note === undefined && messy.sound === undefined);
check('русские метки со звёздочкой тоже распознаются',
  parseSteamRequirements('ОС *: Windows 10<br>Поддержка VR: 10 ГБ<br>Оперативная память: 8 ГБ ОЗУ').ram === '8 ГБ ОЗУ');

server.close();
await rm(tmp, { recursive: true, force: true });

console.log(`\nПроверок: ${passed + failures.length} · ✅ ${passed} · ❌ ${failures.length}`);
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
