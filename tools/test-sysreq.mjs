/**
 * Проверка сбора требований к ПК без сети: поднимаем локальную «заглушку Steam»
 * и прогоняем через неё настоящий tools/pull-system-requirements.mjs.
 *
 * Зачем: у песочницы и у CI нет гарантированного доступа к store.steampowered.com,
 * а сам сборщик — код с разбором HTML, слиянием ru/en и повторными проходами по
 * троттлингу. Заглушка отвечает ровно так, как отвечал магазин 26.09.2026
 * (проверено и прогонами в Actions, и запросами к живому API):
 *   • один appid — нормальный ответ; несколько appid — HTTP 400 (из-за этого
 *     первый прогон собрал 0 игр: сборщик запрашивал по 20 appid за раз);
 *   • filters=pc_requirements магазин принимает, но отдаёт успешный ответ с пустым
 *     data — `{"620":{"success":true,"data":[]}}` (проверено на 550 и 620);
 *     поэтому сборщик обязан НЕ тратить на него проходы;
 *   • ключ ответа не всегда равен запрошенному appid: appids=548430 отдаёт
 *     {"4207930":{…,"steam_appid":548430,…}} — карточку надо искать по данным;
 *   • pc_requirements бывает строкой HTML, а не объектом { minimum, recommended };
 *   • у части приложений карточка есть, а блока pc_requirements в ней нет;
 *   • троттлинг: успешный ответ с пустым data на первые запросы — повторные
 *     проходы должны такие игры добрать.
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
// Требования «строкой» (так магазин отдаёт старые приложения) и своя ОС, чтобы
// игру было видно в файле отдельно от остальных
const HTML_MIN_STR = 'Minimum:<br><strong>OS:</strong> Windows 8.1<br><strong>Processor:</strong> Intel Core i3<br>';
const HTML_MIN_STR_RU = 'Минимальные:<br><strong>ОС:</strong> Windows 8.1<br><strong>Процессор:</strong> Intel Core i3<br>';
const withOs = (html, os) => html.replace(/Windows 10 64-bit/, os);

// Требования «одной строкой»: так их публикуют старые приложения (например, Half-Life) —
// меток полей нет, а обе части (Minimum и Recommended) лежат в одном поле minimum
const PROSE_REQ_EN = '\n\t\t\tMinimum:</strong> 500 mhz processor, 96mb ram, 16mb video card, Windows XP, Mouse, Keyboard, Internet Connection</p>'
  + '\n\t\t\tRecommended:</strong> 800 mhz processor, 128mb ram, 32mb+ video card, Windows XP, Mouse, Keyboard, Internet Connection</p>\n\t\t\t';
const PROSE_REQ_RU = '\n\t\t\tМинимальные:</strong> 500 мгц процессор, 96 мб ОЗУ, 16 мб видеокарта, Windows XP, мышь, клавиатура</p>'
  + '\n\t\t\tРекомендуемые:</strong> 800 мгц процессор, 128 мб ОЗУ, 32 мб видеокарта, Windows XP, мышь, клавиатура</p>\n\t\t\t';

const HTML_REC_RU = 'Рекомендуемые:<br><strong>ОС:</strong> Windows 11<br>'
  + '<strong>Процессор:</strong> Ryzen 5 3600<br><strong>Оперативная память:</strong> 16 ГБ ОЗУ<br>'
  + '<strong>Видеокарта:</strong> RTX 2060<br><strong>Место на диске:</strong> 50 ГБ';

/*
 * Восемь игр — по одной на каждое поведение магазина:
 *   100 — полные требования, ключ ответа = appid             → соберётся в 1-м проходе
 *   200 — только рекомендуемые                               → соберётся в 1-м проходе
 *   300 — ключ ответа ЧУЖОЙ (как у 548430 → 4207930)         → должен собраться всё равно
 *   400 — карточка без блока pc_requirements                 → причины: «в карточке нет»
 *   500 — троттлинг: пустой data первые 4 запроса            → доберётся на 3-м проходе
 *   600 — success:false                                      → причины: «success=false»
 *   700 — pc_requirements строкой HTML (старые приложения)   → должен собраться
 *   800 — пустой data всегда                                 → «пустая карточка (троттлинг)»
 *   900 — требования одной строкой без меток (старые игры)    → должны попасть в примечания
 */
const GAMES = {
  100: { ru: { minimum: HTML_MIN_RU, recommended: HTML_REC_RU }, en: { minimum: HTML_MIN, recommended: HTML_REC } },
  200: { ru: { recommended: HTML_REC_RU }, en: { recommended: HTML_REC } },
  300: { ru: { minimum: HTML_MIN_RU, recommended: HTML_REC_RU }, en: { minimum: HTML_MIN_B, recommended: HTML_REC }, foreignKey: true },
  400: { noRequirements: true },
  500: { ru: { minimum: withOs(HTML_MIN_RU, 'Windows 7 SP1'), recommended: HTML_REC_RU }, en: { minimum: withOs(HTML_MIN, 'Windows 7 SP1'), recommended: HTML_REC }, throttleHits: 4 },
  600: { successFalse: true },
  700: { ru: HTML_MIN_STR_RU, en: HTML_MIN_STR, stringRequirements: true },
  800: { alwaysEmpty: true },
  900: { ru: PROSE_REQ_RU, en: PROSE_REQ_EN, proseRequirements: true },
};

const requests = [];
const hits = {};

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const ids = String(url.searchParams.get('appids') || '').split(',').filter(Boolean);
  const lang = url.searchParams.get('l') || 'english';
  const filters = url.searchParams.get('filters');
  const cc = url.searchParams.get('cc');
  requests.push({ ids, lang, filters, cc });

  const json = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  // Магазин отвечает 400, если в appids больше одного идентификатора
  if (ids.length !== 1) return json(400, { error: 'too many appids' });

  const id = ids[0];
  const game = GAMES[id];
  if (!game) return json(200, { [id]: { success: false } });

  // filters=pc_requirements: магазин отвечает успехом с ПУСТЫМ data (проверено на
  // живом API 26.09.2026: appids=620&filters=pc_requirements → {"620":{…,"data":[]}}).
  if (filters) return json(200, { [id]: { success: true, data: [] } });

  if (game.successFalse) return json(200, { [id]: { success: false } });
  // Троттлинг: магазин отвечает success:true и пустым data, пока не «остынет»
  if (game.throttleHits) {
    hits[id] = (hits[id] || 0) + 1;
    if (hits[id] <= game.throttleHits) return json(200, { [id]: { success: true, data: [] } });
  }
  if (game.alwaysEmpty) return json(200, { [id]: { success: true, data: [] } });
  // Карточка есть, но требований в ней нет
  if (game.noRequirements) return json(200, { [id]: { success: true, data: { type: 'game', name: `Game ${id}` } } });

  // Магазин понимает l=russian|english, в данных игры языки названы ru|en
  const raw = game[lang === 'russian' ? 'ru' : 'en'];
  if (!raw) return json(200, { [id]: { success: true, data: [] } });
  // Ключ ответа бывает ЧУЖИМ: так настоящий Steam отдал appids=548430 под ключом 4207930
  const cardKey = game.foreignKey ? String(Number(id) * 1000 + 1) : id;
  // Старые приложения кладут обе части требований в одно поле minimum, без меток полей
  if (game.proseRequirements) {
    return json(200, { [cardKey]: { success: true, data: { type: 'game', name: `Game ${id}`, steam_appid: Number(id), pc_requirements: { minimum: raw } } } });
  }
  // У части приложений требования приходят строкой HTML, а не парой minimum/recommended
  const pc = game.stringRequirements ? raw : ((raw.minimum || raw.recommended) ? raw : null);
  if (!pc) return json(200, { [id]: { success: true, data: [] } });
  return json(200, { [cardKey]: { success: true, data: { type: 'game', name: `Game ${id}`, steam_appid: Number(id), pc_requirements: pc } } });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

/* --- Каталог для прогона: подменяем часть игр своими slug/steamId --- */

const tmp = await mkdtemp(join(tmpdir(), 'gustoplay-sysreq-'));
const out = join(tmp, 'sysreq.js');
const review = join(tmp, 'review.txt');

const run = spawn('node', [
  'tools/pull-system-requirements.mjs',
  `--limit=${Object.keys(GAMES).length}`,
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

const perGame = (id) => requests.filter((r) => r.ids[0] === id);

console.log('\n1. Сборщик и заглушка магазина');
check('сборщик завершился без ошибок', code === 0, `код ${code}${stderr ? `, stderr: ${stderr.slice(0, 200)}` : ''}`);
check('сборщик не запрашивает больше одного appid за раз',
  requests.every((r) => r.ids.length === 1),
  `${requests.filter((r) => r.ids.length !== 1).length} пакетных запросов из ${requests.length}`);
check('каждый appid запрошен на обоих языках',
  new Set(requests.filter((r) => r.lang === 'russian').map((r) => r.ids[0])).size === Object.keys(GAMES).length
  && new Set(requests.filter((r) => r.lang === 'english').map((r) => r.ids[0])).size === Object.keys(GAMES).length);
const req100 = perGame('100');
check('первый проход запрашивает по одной карточке на язык',
  req100.length === 2 && new Set(req100.map((r) => r.lang)).size === 2,
  `100: ${req100.length} запроса (языков ${new Set(req100.map((r) => r.lang)).size})`);
check('ни один запрос не уходит с filters=pc_requirements (магазин отдаёт по нему пустой data)',
  requests.every((r) => !r.filters),
  `${requests.filter((r) => r.filters).length} запросов с фильтром из ${requests.length}`);
check('первый проход не тащит витрину, повторный — идёт с явным cc',
  req100.every((r) => !r.cc) && perGame('500').some((r) => r.cc),
  `100 без cc: ${req100.filter((r) => !r.cc).length}/${req100.length}, 500 с cc: ${perGame('500').filter((r) => r.cc).length}`);
check('повторный проход не повторяет собранную в первом проходе игру',
  req100.length === 2 && perGame('200').length === 2,
  `100: ${req100.length}, 200: ${perGame('200').length} (по два языка, без повторов)`);
check('троттлящаяся игра опрашивается и в повторных проходах',
  perGame('500').length > 2, `500: ${perGame('500').length} запросов`);

const expectedCollected = 6; // 100, 200, 300, 500, 700, 900

console.log('\n2. Разбор и запись файла');
const file = await readFile(out, 'utf8');
const sysreq = (await import(`file://${out}?t=${Date.now()}`)).SYSREQ;
check('в файле есть заголовок с источником данных', file.includes('Steam Store API'), file.slice(0, 60).replace(/\n/g, ' '));
check('собраны все игры, у которых магазин отдал требования', Object.keys(sysreq).length === expectedCollected,
  `${Object.keys(sysreq).length} из ${expectedCollected}: ${Object.keys(sysreq).join(', ')}`);
const throttled = Object.values(sysreq).find((e) => e.min?.os === 'Windows 7 SP1');
check('игра с троттлингом добрана повторным проходом',
  Boolean(throttled && throttled.rec) && perGame('500').length === 6,
  `500: ${perGame('500').length} запросов, данные: ${throttled ? 'есть' : 'нет'}`);

// Игры ищем по содержимому: в файле ключи отсортированы по slug, порядок запросов
// на него не влияет (id тестовые, slug — настоящие из каталога).
const entries = Object.values(sysreq);
const full = entries.find((e) => e.min?.os === 'Windows 10 64-bit' && !/account/i.test(String(e.min.note || '')) && e.rec?.cpu === 'Ryzen 5 3600');
const foreignKey = entries.find((e) => /account/i.test(String(e.min?.note || '')));
const recOnly = entries.find((e) => e.rec && !e.min);
const stringReq = entries.find((e) => e.min?.os === 'Windows 8.1');
check('каждая игра нашлась по своим данным',
  Boolean(full && foreignKey && recOnly),
  `full=${Boolean(full)} foreignKey=${Boolean(foreignKey)} recOnly=${Boolean(recOnly)}`);
check('минимальные и рекомендуемые разобраны по полям',
  full.min.os === 'Windows 10 64-bit' && full.min.ram === '8 GB'
  && full.rec.cpu === 'Ryzen 5 3600' && full.rec.disk === '50 GB',
  JSON.stringify(full.min));
check('русские единицы измерения приведены к общим («8 ГБ ОЗУ» → «8 GB RAM»)', full.min.ram === '8 GB RAM' || full.min.ram === '8 GB', String(full.min.ram));
check('DirectX хранится коротко, без слова «Version»/«Версия»', full.min.dx === '11', String(full.min.dx));
check('64-битная плашка распознана и записана флагом', full.min.bit64 === true);
check('«Requires a 64-bit…» не попало в текст примечаний',
  !/64-bit processor/i.test(String(full.min.note || '')), String(full.min.note || '—'));
check('игра только с рекомендуемыми не выдумывает минимальные',
  recOnly.rec && !recOnly.min, JSON.stringify(recOnly).slice(0, 120));
check('карточка под чужим ключом всё равно прочитана (steam_appid внутри ответа)',
  foreignKey.min.os === 'Windows 10 64-bit' && foreignKey.rec && /account/i.test(String(foreignKey.min.note)),
  JSON.stringify(foreignKey.min).slice(0, 140));
check('требования, пришедшие строкой HTML, не теряются',
  Boolean(stringReq), stringReq ? JSON.stringify(stringReq.min).slice(0, 120) : 'игры нет в файле');

// Значение поля бывает строкой (одинаково ru/en) или парой { ru, en }
const noteText = (v) => (typeof v === 'string' ? v : `${v?.ru || ''} ${v?.en || ''}`);
const prose = entries.find((e) => e.min?.note && /500/.test(noteText(e.min.note)));
check('требования одной строкой (старые игры) не теряются',
  Boolean(prose) && /500/.test(noteText(prose.min.note)) && /800/.test(noteText(prose.rec?.note)),
  prose ? noteText(prose.min.note).slice(0, 90) : 'игры нет в файле');
check('в требованиях одной строкой не остаётся пробела перед запятой',
  Boolean(prose) && !/\s,/.test(`${noteText(prose.min.note)} ${noteText(prose.rec?.note || '')}`),
  prose ? noteText(prose.min.note).slice(0, 80) : '—');
check('у требований одной строкой снят служебный префикс Minimum/Recommended',
  Boolean(prose) && !/minimum|recommended|минимальные|рекомендуемые/i.test(`${noteText(prose.min.note)} ${noteText(prose.rec?.note || '')}`),
  prose ? noteText(prose.min.note).slice(0, 60) : '—');
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
check('отчёт не содержит ошибок сети', /Запросов, которые не прошли \(сеть\/HTTP\/разбор JSON\): 0/.test(report),
  (report.split('\n').find((l) => l.startsWith('Запросов, которые не прошли')) || '').slice(0, 80));
check('в отчёте видно, сколько игр добавил каждый проход',
  /По проходам: проход 1 — \d+ игр/.test(report),
  (report.split('\n').find((l) => l.startsWith('По проходам')) || '').slice(0, 90));
check('отчёт объясняет, как получены требования',
  /Как получены: /.test(report), (report.split('\n').find((l) => l.startsWith('Как получены')) || '').slice(0, 100));
const reasonsLine = report.split('\n').find((l) => l.startsWith('Причины:')) || '';
check('отчёт различает причины «нет данных» (троттлинг, success=false, нет блока)',
  /в карточке нет pc_requirements/.test(reasonsLine) && /success=false/.test(reasonsLine) && /троттлинг/.test(reasonsLine),
  reasonsLine.slice(0, 160));
check('в отчёте названы игры, оставшиеся без данных',
  /^MISS /m.test(report), `${(report.match(/^MISS /gm) || []).length} строк MISS`);
check('DIAG показывает, нашлась ли карточка в ответе',
  /^DIAG /m.test(report) && /найдено=/.test(report),
  (report.split('\n').find((l) => l.startsWith('DIAG')) || '').slice(0, 150));

console.log('\n4. Разбор русских и английских страниц по отдельности');
const { parseSteamRequirements, readCardForTest } = await import('../tools/pull-system-requirements.mjs');
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
const proseUnit = parseSteamRequirements(PROSE_REQ_EN);
check('прозаичные требования старых игр попадают в примечания',
  Boolean(proseUnit) && /500 mhz/.test(String(proseUnit.note)) && !/minimum/i.test(String(proseUnit.note)),
  JSON.stringify(proseUnit));
check('разделитель-мусор не считается прозаичными требованиями',
  parseSteamRequirements('Minimum: <br>/') === null && parseSteamRequirements('Minimum: Windows') === null);
check('русские метки со звёздочкой тоже распознаются',
  parseSteamRequirements('ОС *: Windows 10<br>Поддержка VR: 10 ГБ<br>Оперативная память: 8 ГБ ОЗУ').ram === '8 ГБ ОЗУ');

// Поиск карточки в ответе магазина: ключ appid, чужой ключ с steam_appid, мусор
const card1 = readCardForTest({ '100': { success: true, data: { steam_appid: 100 } } }, 100);
const card2 = readCardForTest({ '900100': { success: true, data: { steam_appid: 100 } } }, 100);
const card3 = readCardForTest({ '900100': { success: true, data: { steam_appid: 999 } } }, 100);
const card4 = readCardForTest({ '100': { success: true, data: [] } }, 100);
check('карточка ищется по ключу appid', card1.app?.data?.steam_appid === 100 && card1.via === 'ключ appid', card1.via);
check('карточка с чужим ключом находится по steam_appid', card2.app?.data?.steam_appid === 100 && /steam_appid/.test(card2.via), card2.via);
check('единственная карточка в ответе используется, даже если appid не совпал', card3.app?.data?.steam_appid === 999, card3.via);
check('пустая карточка троттлинга не выдаётся за данные', Boolean(card4.app) && Array.isArray(card4.app.data), card4.via);

server.close();
await rm(tmp, { recursive: true, force: true });

console.log(`\nПроверок: ${passed + failures.length} · ✅ ${passed} · ❌ ${failures.length}`);
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
