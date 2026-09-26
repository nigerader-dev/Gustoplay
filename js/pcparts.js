/**
 * Справочник комплектующих для проверки «подойдёт ли мой ПК».
 *
 * ЧЕСТНАЯ ОГОВОРКА ПРО БАЛЛЫ (важно, не удалять):
 * score — условная относительная производительность. Это НЕ измерение FPS и не результат
 * замеров на конкретных настройках. Баллы нужны ровно для одного: сравнить две модели
 * между собой («эта видеокарта слабее той»), потому что требование магазина и комплектующие
 * пользователя ищутся в ОДНОЙ таблице. Сравнивать балл с чем-то вне этой таблицы нельзя.
 * Оценки приблизительные: у разных игр расклад может отличаться (одна любит частоту, другая —
 * ядра). Поэтому в интерфейсе прямо написано, что оценка ориентировочная.
 *
 * Если модели нет в справочнике — это не ошибка: проверка честно помечает пункт как
 * «не проверено», а не выдумывает результат (см. js/pcfit.js).
 *
 * Поля записи:
 *   id      — ключ для профиля пользователя и тестов (латиница, цифры, дефисы);
 *   name    — как модель называется в интерфейсе;
 *   score   — относительная производительность (см. оговорку выше);
 *   keys    — по каким написаниям модель узнаётся в тексте требований Steam;
 *   vendor  — производитель (nvidia/amd/intel): защита от ложных совпадений, когда в строке
 *             прямо назван другой производитель;
 *   series  — true у «серийных» записей для тех, кто знает серию, но не модель
 *             (в требованиях магазина такие записи срабатывают как обобщённые).
 *
 * Ключи пишутся в нормализованном виде: строчными буквами, без знаков, через пробелы
 * («i5 2500», «gtx 1060 3gb») — нормализацию текста делает matchPart() в js/pcfit.js.
 */

const cpu = (id, name, score, keys, extra = {}) => ({ id, name, score, keys: keys.split('|'), ...extra });

/**
 * У видеокарт к ключам добавляется написание с производителем: «radeon r7 370», «geforce gtx 660».
 * Это нужно не для красоты, а для точности: без такого ключа строка «Radeon R7 370» совпала бы
 * с обобщённой серией «radeon r7» (баллы ниже) и требование получилось бы слабее настоящего.
 */
const withVendorKeys = (part) => {
  const extra = [];
  for (const key of part.keys) {
    if (/^(r[579]|rx|vega|hd)\b/.test(key)) extra.push(`radeon ${key}`);
    if (/^(gtx|gts|gt)\b/.test(key)) extra.push(`geforce ${key}`);
  }
  return extra.length ? { ...part, keys: [...part.keys, ...extra] } : part;
};
const gpu = (id, name, score, keys, extra = {}) => withVendorKeys({ id, name, score, keys: keys.split('|'), ...extra });

/* ------------------------------------------------------------------ *
 * Процессоры
 * ------------------------------------------------------------------ */

export const CPUS = [
  // Старые и офисные
  cpu('p4', 'Pentium 4', 8, 'pentium 4|pentium4'),
  cpu('pentium-d', 'Pentium D', 12, 'pentium d'),
  cpu('athlon-64-x2', 'Athlon 64 X2', 20, 'athlon 64 x2'),
  cpu('c2d-e4300', 'Core 2 Duo E4300', 22, 'e4300'),
  cpu('c2d-e6600', 'Core 2 Duo E6600', 30, 'e6600'),
  cpu('c2d-e8400', 'Core 2 Duo E8400', 45, 'e8400'),
  cpu('c2q-q6600', 'Core 2 Quad Q6600', 55, 'q6600'),
  cpu('c2q-q9650', 'Core 2 Quad Q9650', 70, 'q9650'),
  cpu('athlon-ii-x2-250', 'Athlon II X2 250', 35, 'athlon ii x2 250'),
  cpu('athlon-ii-x4-640', 'Athlon II X4 640', 50, 'athlon ii x4 640'),
  cpu('phenom-ii-x4-955', 'Phenom II X4 955', 65, 'phenom ii x4 955'),
  cpu('fx-4100', 'AMD FX-4100', 55, 'fx 4100'),
  cpu('fx-4300', 'AMD FX-4300', 60, 'fx 4300'),
  cpu('fx-6100', 'AMD FX-6100', 70, 'fx 6100'),
  cpu('fx-6300', 'AMD FX-6300', 75, 'fx 6300'),
  cpu('fx-8120', 'AMD FX-8120', 80, 'fx 8120'),
  cpu('fx-8350', 'AMD FX-8350', 95, 'fx 8350'),

  // Intel Core, поколения 1–4
  cpu('i3-2100', 'Intel Core i3-2100', 70, 'i3 2100|i3-2100'),
  cpu('i3-2120', 'Intel Core i3-2120', 72, 'i3 2120'),
  cpu('i3-3220', 'Intel Core i3-3220', 80, 'i3 3220'),
  cpu('i3-4130', 'Intel Core i3-4130', 90, 'i3 4130'),
  cpu('i3-4160', 'Intel Core i3-4160', 95, 'i3 4160'),
  cpu('i5-750', 'Intel Core i5-750', 70, 'i5 750'),
  cpu('i5-2400', 'Intel Core i5-2400', 95, 'i5 2400'),
  cpu('i5-2500', 'Intel Core i5-2500', 100, 'i5 2500'),
  cpu('i5-2500k', 'Intel Core i5-2500K', 110, 'i5 2500k'),
  cpu('i5-3470', 'Intel Core i5-3470', 115, 'i5 3470'),
  cpu('i5-3550', 'Intel Core i5-3550', 118, 'i5 3550'),
  cpu('i5-4460', 'Intel Core i5-4460', 130, 'i5 4460'),
  cpu('i5-4570', 'Intel Core i5-4570', 132, 'i5 4570'),
  cpu('i5-4590', 'Intel Core i5-4590', 135, 'i5 4590'),
  cpu('i5-4690', 'Intel Core i5-4690', 142, 'i5 4690'),
  cpu('i7-870', 'Intel Core i7-870', 90, 'i7 870'),
  cpu('i7-2600', 'Intel Core i7-2600', 120, 'i7 2600'),
  cpu('i7-2600k', 'Intel Core i7-2600K', 130, 'i7 2600k'),
  cpu('i7-3770', 'Intel Core i7-3770', 135, 'i7 3770'),
  cpu('i7-4770', 'Intel Core i7-4770', 160, 'i7 4770'),
  cpu('i7-4790', 'Intel Core i7-4790', 170, 'i7 4790'),
  cpu('i7-4790k', 'Intel Core i7-4790K', 185, 'i7 4790k'),
  cpu('i7-5820k', 'Intel Core i7-5820K', 220, 'i7 5820k'),

  // Intel Core, поколения 6–9
  cpu('i3-6100', 'Intel Core i3-6100', 115, 'i3 6100'),
  cpu('i3-8100', 'Intel Core i3-8100', 145, 'i3 8100'),
  cpu('i5-6500', 'Intel Core i5-6500', 150, 'i5 6500'),
  cpu('i5-6600k', 'Intel Core i5-6600K', 165, 'i5 6600k'),
  cpu('i5-7400', 'Intel Core i5-7400', 160, 'i5 7400'),
  cpu('i5-7500', 'Intel Core i5-7500', 165, 'i5 7500'),
  cpu('i5-8400', 'Intel Core i5-8400', 200, 'i5 8400'),
  cpu('i5-8600k', 'Intel Core i5-8600K', 225, 'i5 8600k'),
  cpu('i5-9400', 'Intel Core i5-9400', 195, 'i5 9400'),
  cpu('i5-9600k', 'Intel Core i5-9600K', 230, 'i5 9600k'),
  cpu('i7-6700', 'Intel Core i7-6700', 195, 'i7 6700'),
  cpu('i7-6700k', 'Intel Core i7-6700K', 210, 'i7 6700k'),
  cpu('i7-7700', 'Intel Core i7-7700', 210, 'i7 7700'),
  cpu('i7-7700k', 'Intel Core i7-7700K', 225, 'i7 7700k'),
  cpu('i7-8700', 'Intel Core i7-8700', 280, 'i7 8700'),
  cpu('i7-8700k', 'Intel Core i7-8700K', 300, 'i7 8700k'),
  cpu('i7-9700', 'Intel Core i7-9700', 300, 'i7 9700'),
  cpu('i7-9700k', 'Intel Core i7-9700K', 320, 'i7 9700k'),
  cpu('i9-9900k', 'Intel Core i9-9900K', 380, 'i9 9900k'),

  // Intel Core, поколения 10–14
  cpu('i3-10100', 'Intel Core i3-10100', 175, 'i3 10100'),
  cpu('i3-12100', 'Intel Core i3-12100', 235, 'i3 12100'),
  cpu('i5-10400', 'Intel Core i5-10400', 230, 'i5 10400'),
  cpu('i5-11400', 'Intel Core i5-11400', 250, 'i5 11400'),
  cpu('i5-12400', 'Intel Core i5-12400', 300, 'i5 12400'),
  cpu('i5-13400', 'Intel Core i5-13400', 330, 'i5 13400'),
  cpu('i5-13600k', 'Intel Core i5-13600K', 430, 'i5 13600k'),
  cpu('i5-14600k', 'Intel Core i5-14600K', 445, 'i5 14600k'),
  cpu('i7-10700', 'Intel Core i7-10700', 340, 'i7 10700'),
  cpu('i7-11700', 'Intel Core i7-11700', 360, 'i7 11700'),
  cpu('i7-12700', 'Intel Core i7-12700', 440, 'i7 12700'),
  cpu('i7-13700', 'Intel Core i7-13700', 520, 'i7 13700'),
  cpu('i9-10900k', 'Intel Core i9-10900K', 420, 'i9 10900k'),
  cpu('i9-12900k', 'Intel Core i9-12900K', 560, 'i9 12900k'),
  cpu('i9-13900k', 'Intel Core i9-13900K', 700, 'i9 13900k'),
  cpu('i9-14900k', 'Intel Core i9-14900K', 730, 'i9 14900k'),

  // AMD Ryzen
  cpu('ryzen-3-1200', 'AMD Ryzen 3 1200', 130, 'ryzen 3 1200'),
  cpu('ryzen-3-2200g', 'AMD Ryzen 3 2200G', 150, 'ryzen 3 2200g'),
  cpu('ryzen-3-3100', 'AMD Ryzen 3 3100', 210, 'ryzen 3 3100'),
  cpu('ryzen-3-4100', 'AMD Ryzen 3 4100', 200, 'ryzen 3 4100'),
  cpu('ryzen-5-1400', 'AMD Ryzen 5 1400', 165, 'ryzen 5 1400'),
  cpu('ryzen-5-1600', 'AMD Ryzen 5 1600', 210, 'ryzen 5 1600'),
  cpu('ryzen-5-2600', 'AMD Ryzen 5 2600', 235, 'ryzen 5 2600'),
  cpu('ryzen-5-3600', 'AMD Ryzen 5 3600', 300, 'ryzen 5 3600'),
  cpu('ryzen-5-5500', 'AMD Ryzen 5 5500', 320, 'ryzen 5 5500'),
  cpu('ryzen-5-5600', 'AMD Ryzen 5 5600', 330, 'ryzen 5 5600'),
  cpu('ryzen-5-5600x', 'AMD Ryzen 5 5600X', 345, 'ryzen 5 5600x'),
  cpu('ryzen-5-7500f', 'AMD Ryzen 5 7500F', 400, 'ryzen 5 7500f'),
  cpu('ryzen-5-7600', 'AMD Ryzen 5 7600', 420, 'ryzen 5 7600'),
  cpu('ryzen-5-9600x', 'AMD Ryzen 5 9600X', 440, 'ryzen 5 9600x'),
  cpu('ryzen-7-1700', 'AMD Ryzen 7 1700', 230, 'ryzen 7 1700'),
  cpu('ryzen-7-2700x', 'AMD Ryzen 7 2700X', 265, 'ryzen 7 2700x'),
  cpu('ryzen-7-3700x', 'AMD Ryzen 7 3700X', 340, 'ryzen 7 3700x'),
  cpu('ryzen-7-5700x', 'AMD Ryzen 7 5700X', 370, 'ryzen 7 5700x'),
  cpu('ryzen-7-5800x', 'AMD Ryzen 7 5800X', 390, 'ryzen 7 5800x'),
  cpu('ryzen-7-5800x3d', 'AMD Ryzen 7 5800X3D', 430, 'ryzen 7 5800x3d'),
  cpu('ryzen-7-7700', 'AMD Ryzen 7 7700', 470, 'ryzen 7 7700'),
  cpu('ryzen-7-7800x3d', 'AMD Ryzen 7 7800X3D', 560, 'ryzen 7 7800x3d'),
  cpu('ryzen-7-9800x3d', 'AMD Ryzen 7 9800X3D', 620, 'ryzen 7 9800x3d'),
  cpu('ryzen-9-3900x', 'AMD Ryzen 9 3900X', 420, 'ryzen 9 3900x'),
  cpu('ryzen-9-5900x', 'AMD Ryzen 9 5900X', 460, 'ryzen 9 5900x'),
  cpu('ryzen-9-7900x', 'AMD Ryzen 9 7900X', 560, 'ryzen 9 7900x'),
  cpu('ryzen-9-7950x', 'AMD Ryzen 9 7950X', 640, 'ryzen 9 7950x'),

  // Ноутбучные, которые встречаются в требованиях
  cpu('i5-8250u', 'Intel Core i5-8250U', 140, 'i5 8250u'),
  cpu('i7-8750h', 'Intel Core i7-8750H', 240, 'i7 8750h'),
  cpu('i7-9750h', 'Intel Core i7-9750H', 260, 'i7 9750h'),
  cpu('ryzen-5-3500u', 'AMD Ryzen 5 3500U', 150, 'ryzen 5 3500u'),
  cpu('ryzen-7-4800h', 'AMD Ryzen 7 4800H', 330, 'ryzen 7 4800h'),

  // Серии: срабатывают, когда в требованиях названо только семейство
  // («Intel Core i5», «Ryzen 5») или когда модель неизвестна пользователю
  cpu('series-c2d', 'Core 2 Duo (серия)', 35, 'core 2 duo', { series: true, nameEn: 'Core 2 Duo (series)' }),
  cpu('series-c2q', 'Core 2 Quad (серия)', 60, 'core 2 quad', { series: true, nameEn: 'Core 2 Quad (series)' }),
  cpu('series-pentium', 'Pentium (серия)', 30, 'intel pentium', { series: true, nameEn: 'Pentium (series)' }),
  cpu('series-i3', 'Intel Core i3 (серия)', 90, 'core i3', { series: true, nameEn: 'Intel Core i3 (series)' }),
  cpu('series-i5', 'Intel Core i5 (серия)', 140, 'core i5', { series: true, nameEn: 'Intel Core i5 (series)' }),
  cpu('series-i7', 'Intel Core i7 (серия)', 240, 'core i7', { series: true, nameEn: 'Intel Core i7 (series)' }),
  cpu('series-i9', 'Intel Core i9 (серия)', 380, 'core i9', { series: true, nameEn: 'Intel Core i9 (series)' }),
  cpu('series-i3-2', 'Intel Core i3 2-го поколения', 70, 'i3 2nd gen|i3 2nd|i3 2 gen', { series: true, nameEn: null }),
  cpu('series-i3-3', 'Intel Core i3 3-го поколения', 80, 'i3 3rd gen|i3 3 gen', { series: true, nameEn: null }),
  cpu('series-i3-4', 'Intel Core i3 4-го поколения', 90, 'i3 4th gen|i3 4 gen', { series: true, nameEn: null }),
  cpu('series-i5-2', 'Intel Core i5 2-го поколения', 100, 'i5 2nd gen|i5 2 gen', { series: true, nameEn: null }),
  cpu('series-i5-3', 'Intel Core i5 3-го поколения', 115, 'i5 3rd gen|i5 3 gen', { series: true, nameEn: null }),
  cpu('series-i5-4', 'Intel Core i5 4-го поколения', 130, 'i5 4th gen|i5 4 gen', { series: true, nameEn: null }),
  cpu('series-i5-6', 'Intel Core i5 6-го поколения', 150, 'i5 6th gen|i5 6 gen', { series: true, nameEn: null }),
  cpu('series-i5-7', 'Intel Core i5 7-го поколения', 160, 'i5 7th gen|i5 7 gen', { series: true, nameEn: null }),
  cpu('series-i5-8', 'Intel Core i5 8-го поколения', 200, 'i5 8th gen|i5 8 gen', { series: true, nameEn: null }),
  cpu('series-i5-10', 'Intel Core i5 10-го поколения', 230, 'i5 10th gen', { series: true, nameEn: null }),
  cpu('series-i7-2', 'Intel Core i7 2-го поколения', 120, 'i7 2nd gen', { series: true, nameEn: null }),
  cpu('series-i7-3', 'Intel Core i7 3-го поколения', 135, 'i7 3rd gen', { series: true, nameEn: null }),
  cpu('series-i7-4', 'Intel Core i7 4-го поколения', 165, 'i7 4th gen', { series: true, nameEn: null }),
  cpu('series-i7-8', 'Intel Core i7 8-го поколения', 280, 'i7 8th gen', { series: true, nameEn: null }),
  cpu('series-ryzen3', 'AMD Ryzen 3 (серия)', 140, 'ryzen 3', { series: true, nameEn: 'AMD Ryzen 3 (series)' }),
  cpu('series-ryzen5', 'AMD Ryzen 5 (серия)', 220, 'ryzen 5', { series: true, nameEn: 'AMD Ryzen 5 (series)' }),
  cpu('series-ryzen7', 'AMD Ryzen 7 (серия)', 300, 'ryzen 7', { series: true, nameEn: 'AMD Ryzen 7 (series)' }),
  cpu('series-ryzen9', 'AMD Ryzen 9 (серия)', 420, 'ryzen 9', { series: true, nameEn: 'AMD Ryzen 9 (series)' }),
];

/* ------------------------------------------------------------------ *
 * Видеокарты
 * ------------------------------------------------------------------ */

export const GPUS = [
  // NVIDIA, старые
  gpu('gf-6600', 'GeForce 6600', 8, 'geforce 6600|nvidia 6600', { vendor: 'nvidia' }),
  gpu('gf-7600', 'GeForce 7600', 12, 'geforce 7600|nvidia 7600', { vendor: 'nvidia' }),
  gpu('gf-8600', 'GeForce 8600', 15, 'geforce 8600|8600gt|8600 gt', { vendor: 'nvidia' }),
  gpu('gf-8800', 'GeForce 8800 GT', 35, 'geforce 8800|8800gt|8800 gt', { vendor: 'nvidia' }),
  gpu('gf-9600', 'GeForce 9600 GT', 30, 'geforce 9600|9600gt|9600 gt', { vendor: 'nvidia' }),
  gpu('gts-250', 'GeForce GTS 250', 40, 'gts 250', { vendor: 'nvidia' }),
  gpu('gt-430', 'GeForce GT 430', 25, 'gt 430', { vendor: 'nvidia' }),
  gpu('gt-630', 'GeForce GT 630', 35, 'gt 630', { vendor: 'nvidia' }),
  gpu('gt-730', 'GeForce GT 730', 40, 'gt 730|gt730', { vendor: 'nvidia' }),
  gpu('gt-1030', 'GeForce GT 1030', 95, 'gt 1030|gt1030', { vendor: 'nvidia' }),
  gpu('gt-740', 'GeForce GT 740', 55, 'gt 740', { vendor: 'nvidia' }),
  gpu('gtx-460', 'GeForce GTX 460', 70, 'gtx 460', { vendor: 'nvidia' }),
  gpu('gtx-550ti', 'GeForce GTX 550 Ti', 55, 'gtx 550', { vendor: 'nvidia' }),
  gpu('gtx-560', 'GeForce GTX 560', 80, 'gtx 560', { vendor: 'nvidia' }),
  gpu('gtx-650', 'GeForce GTX 650', 60, 'gtx 650', { vendor: 'nvidia' }),
  gpu('gtx-650ti', 'GeForce GTX 650 Ti', 85, 'gtx 650 ti', { vendor: 'nvidia' }),
  gpu('gtx-660', 'GeForce GTX 660', 100, 'gtx 660', { vendor: 'nvidia' }),
  gpu('gtx-670', 'GeForce GTX 670', 125, 'gtx 670|670 gtx', { vendor: 'nvidia' }),
  gpu('gtx-680', 'GeForce GTX 680', 145, 'gtx 680', { vendor: 'nvidia' }),

  // NVIDIA 700–900
  gpu('gtx-750', 'GeForce GTX 750', 95, 'gtx 750', { vendor: 'nvidia' }),
  gpu('gtx-750ti', 'GeForce GTX 750 Ti', 110, 'gtx 750 ti', { vendor: 'nvidia' }),
  gpu('gtx-760', 'GeForce GTX 760', 130, 'gtx 760', { vendor: 'nvidia' }),
  gpu('gtx-770', 'GeForce GTX 770', 165, 'gtx 770', { vendor: 'nvidia' }),
  gpu('gtx-780', 'GeForce GTX 780', 195, 'gtx 780', { vendor: 'nvidia' }),
  gpu('gtx-950', 'GeForce GTX 950', 130, 'gtx 950', { vendor: 'nvidia' }),
  gpu('gtx-960', 'GeForce GTX 960', 165, 'gtx 960', { vendor: 'nvidia' }),
  gpu('gtx-970', 'GeForce GTX 970', 225, 'gtx 970', { vendor: 'nvidia' }),
  gpu('gtx-980', 'GeForce GTX 980', 265, 'gtx 980', { vendor: 'nvidia' }),
  gpu('gtx-980ti', 'GeForce GTX 980 Ti', 330, 'gtx 980 ti', { vendor: 'nvidia' }),

  // NVIDIA 10-й серии
  gpu('gtx-1050', 'GeForce GTX 1050', 175, 'gtx 1050', { vendor: 'nvidia' }),
  gpu('gtx-1050ti', 'GeForce GTX 1050 Ti', 200, 'gtx 1050 ti', { vendor: 'nvidia' }),
  gpu('gtx-1060-3', 'GeForce GTX 1060 3 GB', 245, 'gtx 1060 3gb|gtx 1060 3 gb', { vendor: 'nvidia' }),
  gpu('gtx-1060', 'GeForce GTX 1060', 265, 'gtx 1060', { vendor: 'nvidia' }),
  gpu('gtx-1070', 'GeForce GTX 1070', 355, 'gtx 1070', { vendor: 'nvidia' }),
  gpu('gtx-1070ti', 'GeForce GTX 1070 Ti', 390, 'gtx 1070 ti', { vendor: 'nvidia' }),
  gpu('gtx-1080', 'GeForce GTX 1080', 430, 'gtx 1080', { vendor: 'nvidia' }),
  gpu('gtx-1080ti', 'GeForce GTX 1080 Ti', 530, 'gtx 1080 ti', { vendor: 'nvidia' }),

  // NVIDIA 16-й и 20-й серий
  gpu('gtx-1650', 'GeForce GTX 1650', 250, 'gtx 1650', { vendor: 'nvidia' }),
  gpu('gtx-1650s', 'GeForce GTX 1650 Super', 290, 'gtx 1650 super', { vendor: 'nvidia' }),
  gpu('gtx-1660', 'GeForce GTX 1660', 310, 'gtx 1660', { vendor: 'nvidia' }),
  gpu('gtx-1660s', 'GeForce GTX 1660 Super', 340, 'gtx 1660 super', { vendor: 'nvidia' }),
  gpu('gtx-1660ti', 'GeForce GTX 1660 Ti', 350, 'gtx 1660 ti', { vendor: 'nvidia' }),
  gpu('rtx-2060', 'GeForce RTX 2060', 400, 'rtx 2060', { vendor: 'nvidia' }),
  gpu('rtx-2060s', 'GeForce RTX 2060 Super', 440, 'rtx 2060 super', { vendor: 'nvidia' }),
  gpu('rtx-2070', 'GeForce RTX 2070', 490, 'rtx 2070', { vendor: 'nvidia' }),
  gpu('rtx-2070s', 'GeForce RTX 2070 Super', 540, 'rtx 2070 super', { vendor: 'nvidia' }),
  gpu('rtx-2080', 'GeForce RTX 2080', 600, 'rtx 2080', { vendor: 'nvidia' }),
  gpu('rtx-2080s', 'GeForce RTX 2080 Super', 640, 'rtx 2080 super', { vendor: 'nvidia' }),
  gpu('rtx-2080ti', 'GeForce RTX 2080 Ti', 740, 'rtx 2080 ti', { vendor: 'nvidia' }),

  // NVIDIA 30-й и 40-й серий
  gpu('rtx-3050', 'GeForce RTX 3050', 380, 'rtx 3050', { vendor: 'nvidia' }),
  gpu('rtx-3060', 'GeForce RTX 3060', 480, 'rtx 3060', { vendor: 'nvidia' }),
  gpu('rtx-3060ti', 'GeForce RTX 3060 Ti', 570, 'rtx 3060 ti', { vendor: 'nvidia' }),
  gpu('rtx-3070', 'GeForce RTX 3070', 640, 'rtx 3070', { vendor: 'nvidia' }),
  gpu('rtx-3070ti', 'GeForce RTX 3070 Ti', 690, 'rtx 3070 ti', { vendor: 'nvidia' }),
  gpu('rtx-3080', 'GeForce RTX 3080', 830, 'rtx 3080', { vendor: 'nvidia' }),
  gpu('rtx-3080ti', 'GeForce RTX 3080 Ti', 900, 'rtx 3080 ti', { vendor: 'nvidia' }),
  gpu('rtx-3090', 'GeForce RTX 3090', 950, 'rtx 3090', { vendor: 'nvidia' }),
  gpu('rtx-4060', 'GeForce RTX 4060', 560, 'rtx 4060', { vendor: 'nvidia' }),
  gpu('rtx-4060ti', 'GeForce RTX 4060 Ti', 660, 'rtx 4060 ti', { vendor: 'nvidia' }),
  gpu('rtx-4070', 'GeForce RTX 4070', 830, 'rtx 4070', { vendor: 'nvidia' }),
  gpu('rtx-4070s', 'GeForce RTX 4070 Super', 900, 'rtx 4070 super', { vendor: 'nvidia' }),
  gpu('rtx-4070ti', 'GeForce RTX 4070 Ti', 980, 'rtx 4070 ti', { vendor: 'nvidia' }),
  gpu('rtx-4080', 'GeForce RTX 4080', 1200, 'rtx 4080', { vendor: 'nvidia' }),
  gpu('rtx-4090', 'GeForce RTX 4090', 1600, 'rtx 4090', { vendor: 'nvidia' }),

  // NVIDIA 50-й серии (2025)
  gpu('rtx-5060', 'GeForce RTX 5060', 700, 'rtx 5060', { vendor: 'nvidia' }),
  gpu('rtx-5060ti', 'GeForce RTX 5060 Ti', 780, 'rtx 5060 ti', { vendor: 'nvidia' }),
  gpu('rtx-5070', 'GeForce RTX 5070', 980, 'rtx 5070', { vendor: 'nvidia' }),
  gpu('rtx-5070ti', 'GeForce RTX 5070 Ti', 1200, 'rtx 5070 ti', { vendor: 'nvidia' }),
  gpu('rtx-5080', 'GeForce RTX 5080', 1400, 'rtx 5080', { vendor: 'nvidia' }),
  gpu('rtx-5090', 'GeForce RTX 5090', 1900, 'rtx 5090', { vendor: 'nvidia' }),

  // AMD Radeon
  gpu('hd-2600', 'Radeon HD 2600', 12, 'radeon hd 2600', { vendor: 'amd' }),
  gpu('hd-3850', 'Radeon HD 3850', 35, 'radeon hd 3850', { vendor: 'amd' }),
  gpu('hd-4670', 'Radeon HD 4670', 35, 'radeon hd 4670', { vendor: 'amd' }),
  gpu('hd-4850', 'Radeon HD 4850', 60, 'radeon hd 4850', { vendor: 'amd' }),
  gpu('hd-4870', 'Radeon HD 4870', 80, 'radeon hd 4870', { vendor: 'amd' }),
  gpu('hd-5670', 'Radeon HD 5670', 45, 'radeon hd 5670', { vendor: 'amd' }),
  gpu('hd-5770', 'Radeon HD 5770', 70, 'radeon hd 5770', { vendor: 'amd' }),
  gpu('hd-5850', 'Radeon HD 5850', 95, 'radeon hd 5850', { vendor: 'amd' }),
  gpu('hd-5870', 'Radeon HD 5870', 110, 'radeon hd 5870', { vendor: 'amd' }),
  gpu('hd-6570', 'Radeon HD 6570', 30, 'radeon hd 6570', { vendor: 'amd' }),
  gpu('hd-6670', 'Radeon HD 6670', 40, 'radeon hd 6670', { vendor: 'amd' }),
  gpu('hd-6750', 'Radeon HD 6750', 55, 'radeon hd 6750', { vendor: 'amd' }),
  gpu('hd-6770', 'Radeon HD 6770', 65, 'radeon hd 6770', { vendor: 'amd' }),
  gpu('hd-6850', 'Radeon HD 6850', 85, 'radeon hd 6850', { vendor: 'amd' }),
  gpu('hd-6870', 'Radeon HD 6870', 100, 'radeon hd 6870', { vendor: 'amd' }),
  gpu('hd-7750', 'Radeon HD 7750', 70, 'radeon hd 7750', { vendor: 'amd' }),
  gpu('hd-7770', 'Radeon HD 7770', 90, 'radeon hd 7770', { vendor: 'amd' }),
  gpu('hd-7850', 'Radeon HD 7850', 120, 'radeon hd 7850', { vendor: 'amd' }),
  gpu('hd-7870', 'Radeon HD 7870', 145, 'radeon hd 7870', { vendor: 'amd' }),
  gpu('r7-250', 'Radeon R7 250', 55, 'r7 250', { vendor: 'amd' }),
  gpu('r7-260x', 'Radeon R7 260X', 105, 'r7 260', { vendor: 'amd' }),
  gpu('r7-360', 'Radeon R7 360', 95, 'r7 360', { vendor: 'amd' }),
  gpu('r7-370', 'Radeon R7 370', 140, 'r7 370', { vendor: 'amd' }),
  gpu('r9-270x', 'Radeon R9 270X', 155, 'r9 270', { vendor: 'amd' }),
  gpu('r9-280x', 'Radeon R9 280X', 185, 'r9 280', { vendor: 'amd' }),
  gpu('r9-285', 'Radeon R9 285', 190, 'r9 285', { vendor: 'amd' }),
  gpu('r9-290', 'Radeon R9 290', 250, 'r9 290', { vendor: 'amd' }),
  gpu('r9-380', 'Radeon R9 380', 190, 'r9 380', { vendor: 'amd' }),
  gpu('r9-390', 'Radeon R9 390', 265, 'r9 390', { vendor: 'amd' }),
  gpu('rx-460', 'Radeon RX 460', 155, 'rx 460', { vendor: 'amd' }),
  gpu('rx-470', 'Radeon RX 470', 250, 'rx 470', { vendor: 'amd' }),
  gpu('rx-480', 'Radeon RX 480', 290, 'rx 480', { vendor: 'amd' }),
  gpu('rx-550', 'Radeon RX 550', 115, 'rx 550', { vendor: 'amd' }),
  gpu('rx-560', 'Radeon RX 560', 150, 'rx 560', { vendor: 'amd' }),
  gpu('rx-570', 'Radeon RX 570', 290, 'rx 570', { vendor: 'amd' }),
  gpu('rx-580', 'Radeon RX 580', 310, 'rx 580', { vendor: 'amd' }),
  gpu('rx-590', 'Radeon RX 590', 340, 'rx 590', { vendor: 'amd' }),
  gpu('vega-8', 'Radeon Vega 8 (встроенная)', 35, 'vega 8', { vendor: 'amd', nameEn: 'Radeon Vega 8 (integrated)' }),
  gpu('vega-11', 'Radeon Vega 11 (встроенная)', 45, 'vega 11', { vendor: 'amd', nameEn: 'Radeon Vega 11 (integrated)' }),
  gpu('vega-56', 'Radeon RX Vega 56', 420, 'vega 56', { vendor: 'amd' }),
  gpu('vega-64', 'Radeon RX Vega 64', 470, 'vega 64', { vendor: 'amd' }),
  gpu('rx-5500xt', 'Radeon RX 5500 XT', 330, 'rx 5500', { vendor: 'amd' }),
  gpu('rx-5600xt', 'Radeon RX 5600 XT', 430, 'rx 5600', { vendor: 'amd' }),
  gpu('rx-5700', 'Radeon RX 5700', 490, 'rx 5700', { vendor: 'amd' }),
  gpu('rx-5700xt', 'Radeon RX 5700 XT', 530, 'rx 5700 xt', { vendor: 'amd' }),
  gpu('rx-6500xt', 'Radeon RX 6500 XT', 330, 'rx 6500', { vendor: 'amd' }),
  gpu('rx-6600', 'Radeon RX 6600', 500, 'rx 6600', { vendor: 'amd' }),
  gpu('rx-6600xt', 'Radeon RX 6600 XT', 570, 'rx 6600 xt', { vendor: 'amd' }),
  gpu('rx-6700xt', 'Radeon RX 6700 XT', 700, 'rx 6700', { vendor: 'amd' }),
  gpu('rx-6800', 'Radeon RX 6800', 900, 'rx 6800', { vendor: 'amd' }),
  gpu('rx-6800xt', 'Radeon RX 6800 XT', 980, 'rx 6800 xt', { vendor: 'amd' }),
  gpu('rx-6900xt', 'Radeon RX 6900 XT', 1050, 'rx 6900', { vendor: 'amd' }),
  gpu('rx-7600', 'Radeon RX 7600', 640, 'rx 7600', { vendor: 'amd' }),
  gpu('rx-7700xt', 'Radeon RX 7700 XT', 880, 'rx 7700', { vendor: 'amd' }),
  gpu('rx-7800xt', 'Radeon RX 7800 XT', 1020, 'rx 7800', { vendor: 'amd' }),
  gpu('rx-7900xt', 'Radeon RX 7900 XT', 1250, 'rx 7900 xt', { vendor: 'amd' }),
  gpu('rx-7900xtx', 'Radeon RX 7900 XTX', 1450, 'rx 7900 xtx', { vendor: 'amd' }),
  gpu('rx-9070', 'Radeon RX 9070', 1100, 'rx 9070', { vendor: 'amd' }),
  gpu('rx-9070xt', 'Radeon RX 9070 XT', 1250, 'rx 9070 xt', { vendor: 'amd' }),

  // Встроенная графика Intel (ключ требует слова «intel» — иначе «Radeon HD 4000 series» ложно
  // совпал бы с «Intel HD 4000», и требование оказалось бы слабее, чем оно есть)
  gpu('intel-hd-3000', 'Intel HD Graphics 3000', 12, 'intel hd 3000|intel hd graphics 3000', { vendor: 'intel' }),
  gpu('intel-hd-4000', 'Intel HD Graphics 4000', 18, 'intel hd 4000|intel hd graphics 4000', { vendor: 'intel' }),
  gpu('intel-hd-4400', 'Intel HD Graphics 4400', 22, 'intel hd 4400|intel hd graphics 4400|intel graphics 4400', { vendor: 'intel' }),
  gpu('intel-hd-520', 'Intel HD Graphics 520', 28, 'intel hd 520|intel hd graphics 520', { vendor: 'intel' }),
  gpu('intel-uhd-610', 'Intel UHD Graphics 610', 30, 'intel uhd 610|intel uhd graphics 610', { vendor: 'intel' }),
  gpu('intel-hd-4600', 'Intel HD Graphics 4600', 25, 'intel hd 4600|intel hd graphics 4600', { vendor: 'intel' }),
  gpu('intel-hd-530', 'Intel HD Graphics 530', 30, 'intel hd 530|intel hd graphics 530', { vendor: 'intel' }),
  gpu('intel-uhd-620', 'Intel UHD Graphics 620', 32, 'intel uhd 620|intel uhd graphics 620', { vendor: 'intel' }),
  gpu('intel-uhd-630', 'Intel UHD Graphics 630', 38, 'intel uhd 630|intel uhd graphics 630', { vendor: 'intel' }),
  gpu('intel-iris-xe', 'Intel Iris Xe Graphics', 95, 'intel iris xe|iris xe graphics', { vendor: 'intel' }),

  // Intel Arc
  gpu('arc-a380', 'Intel Arc A380', 300, 'arc a380', { vendor: 'intel' }),
  gpu('arc-a750', 'Intel Arc A750', 560, 'arc a750', { vendor: 'intel' }),
  gpu('arc-a770', 'Intel Arc A770', 620, 'arc a770', { vendor: 'intel' }),
  gpu('arc-b580', 'Intel Arc B580', 700, 'arc b580', { vendor: 'intel' }),

  // Серии — для тех, кто знает линейку, но не модель
  gpu('series-gtx-700', 'GeForce GTX 700-й серии', 130, 'gtx 700', { series: true, vendor: 'nvidia', nameEn: null }),
  gpu('series-gtx-900', 'GeForce GTX 900-й серии', 200, 'gtx 900', { series: true, vendor: 'nvidia', nameEn: null }),
  gpu('series-gtx-10', 'GeForce GTX 10-й серии', 280, 'gtx 10', { series: true, vendor: 'nvidia', nameEn: null }),
  gpu('series-gtx-16', 'GeForce GTX 16-й серии', 300, 'gtx 16', { series: true, vendor: 'nvidia', nameEn: null }),
  gpu('series-rtx-20', 'GeForce RTX 20-й серии', 500, 'rtx 20', { series: true, vendor: 'nvidia', nameEn: null }),
  gpu('series-rtx-30', 'GeForce RTX 30-й серии', 650, 'rtx 30', { series: true, vendor: 'nvidia', nameEn: null }),
  gpu('series-rtx-40', 'GeForce RTX 40-й серии', 900, 'rtx 40', { series: true, vendor: 'nvidia', nameEn: null }),
  gpu('series-r7', 'Radeon R7 (серия)', 55, 'radeon r7', { series: true, vendor: 'amd', nameEn: null }),
  gpu('series-r9', 'Radeon R9 (серия)', 150, 'radeon r9', { series: true, vendor: 'amd', nameEn: null }),
  gpu('series-rx-500', 'Radeon RX 500-й серии', 280, 'rx 500', { series: true, vendor: 'amd', nameEn: null }),
  gpu('series-rx-5000', 'Radeon RX 5000-й серии', 450, 'rx 5000', { series: true, vendor: 'amd', nameEn: null }),
  gpu('series-rx-6000', 'Radeon RX 6000-й серии', 700, 'rx 6000', { series: true, vendor: 'amd', nameEn: null }),
  gpu('series-rx-7000', 'Radeon RX 7000-й серии', 950, 'rx 7000', { series: true, vendor: 'amd', nameEn: null }),
];

/* ------------------------------------------------------------------ *
 * Остальные комплектующие и система
 * ------------------------------------------------------------------ */

/** Объёмы оперативной памяти, ГБ */
export const RAM_OPTIONS = [4, 6, 8, 12, 16, 24, 32, 48, 64];

/** Свободное место на диске, ГБ */
export const DISK_OPTIONS = [10, 20, 30, 50, 80, 120, 200, 350, 500, 1000];

/**
 * Версии Windows по возрастанию. `dx` — максимальная версия DirectX, которую даёт система,
 * `rank` — номер для сравнения. Порядок важен: сравнение идёт по rank.
 */
export const OS_OPTIONS = [
  { id: 'win-xp', name: 'Windows XP', rank: 5.1, dx: 9, bit64: false },
  { id: 'win-vista', name: 'Windows Vista', rank: 6.0, dx: 10, bit64: true },
  { id: 'win-7', name: 'Windows 7', rank: 6.1, dx: 11, bit64: true },
  { id: 'win-8', name: 'Windows 8', rank: 6.2, dx: 11.1, bit64: true },
  { id: 'win-8-1', name: 'Windows 8.1', rank: 6.3, dx: 11.2, bit64: true },
  { id: 'win-10', name: 'Windows 10', rank: 10, dx: 12, bit64: true },
  { id: 'win-11', name: 'Windows 11', rank: 11, dx: 12, bit64: true },
  {
    id: 'other', name: 'Другая система (Linux, macOS)', nameEn: 'Other OS (Linux, macOS)',
    rank: null, dx: null, bit64: true, other: true,
  },
];

export const BITS_OPTIONS = [
  { id: '64', name: '64 бита', bits: 64 },
  { id: '32', name: '32 бита', bits: 32 },
];

/** Записи вида «не знаю» — общие для всех полей */
export const UNKNOWN = 'unknown';

/* ------------------------------------------------------------------ *
 * Локализация названий
 * ------------------------------------------------------------------ */

/**
 * Английские названия там, где русская подпись отличается от технической:
 * серии и поколения. Остальные модели называются одинаково в обоих языках
 * (это заводские имена), поэтому перевод им не нужен.
 */
const localize = (name) => name
  .replace(/\((серия|встроенная)\)$/, (m, kind) => (kind === 'серия' ? '(series)' : '(integrated)'))
  .replace(/(\d+)-го поколения$/, '$1th gen')
  .replace(/(\d+)-й серии$/, '$1 series')
  .replace(/Radeon R7 \(series\)/, 'Radeon R7 (series)');

/** Название записи на нужном языке */
export const partLabel = (partOrId, lang = 'ru') => {
  const part = typeof partOrId === 'string'
    ? (CPUS.find((c) => c.id === partOrId) || GPUS.find((g) => g.id === partOrId))
    : partOrId;
  if (!part) return null;
  if (lang === 'en') return part.nameEn ?? localize(part.name);
  return part.name;
};

export const findCpu = (id) => CPUS.find((c) => c.id === id) || null;
export const findGpu = (id) => GPUS.find((g) => g.id === id) || null;
export const findOs = (id) => OS_OPTIONS.find((o) => o.id === id) || null;

/** Название системы на нужном языке (версии Windows совпадают, «другая система» — нет) */
export const osLabel = (os, lang = 'ru') => (lang === 'en' ? (os?.nameEn ?? os?.name) : os?.name) || null;
