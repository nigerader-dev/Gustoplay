/**
 * Статический аудит адаптива: разбирает css/styles.css и проверяет, что все
 * требования QA-PLAN §3 закодированы — брейкпоинты, бургер, шторка фильтров,
 * тач-цели 44px, защита от переполнения, фолбэки. Не заменяет просмотр
 * в браузере (см. tools/shots.mjs), но ловит регрессии в CI.
 *
 * Запуск: npm run test:css
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const css = require('css');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cssText = readFileSync(resolve(root, 'css/styles.css'), 'utf8');
const htmlText = readFileSync(resolve(root, 'index.html'), 'utf8');

const failures = [];
let passed = 0;
const check = (name, condition, extra = '') => {
  if (condition) { passed += 1; console.log(`  ✅ ${name}${extra ? ` — ${extra}` : ''}`); }
  else { console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ''}`); failures.push(name); }
};

let ast;
try {
  ast = css.parse(cssText);
  check('CSS парсится без ошибок', true, `${ast.stylesheet.rules.length} правил`);
} catch (e) {
  check('CSS парсится без ошибок', false, e.message);
  process.exit(1);
}

// плоский список: { selectors[], declarations[], media }
const flat = [];
const walk = (rules, media = '') => {
  for (const r of rules) {
    if (r.type === 'media') walk(r.rules, r.media);
    else if (r.type === 'rule') flat.push({ selectors: r.selectors || [], declarations: (r.declarations || []).filter((d) => d.type === 'declaration'), media });
  }
};
walk(ast.stylesheet.rules);

const hasDecl = (entry, prop, match) => entry.declarations.some((d) => d.property === prop && (!match || match(d.value)));
const inMedia = (entry, width) => entry.media.includes(`max-width: ${width}px`);
const minHeightPx = (entry) => {
  const d = entry.declarations.find((x) => x.property === 'min-height' || x.property === 'height');
  const m = d?.value.match(/(\d+)px/);
  return m ? Number(m[1]) : 0;
};

/* ---------- 1. Брейкпоинты ---------- */
console.log('\n1. Брейкпоинты');
for (const w of ['1080px', '900px', '640px', '480px']) {
  check(`брейкпоинт ${w} есть`, flat.some((e) => e.media.includes(`max-width: ${w}`)));
}

/* ---------- 2. Бургер-меню ---------- */
console.log('\n2. Бургер-меню');
check('.burger скрыт на десктопе', flat.some((e) => !e.media && e.selectors.includes('.burger') && hasDecl(e, 'display', (v) => v === 'none')));
check('.burger показан на планшете/телефоне', flat.some((e) => inMedia(e, '900') && e.selectors.includes('.burger') && hasDecl(e, 'display', (v) => v !== 'none')));
check('панель .nav.open выезжает', flat.some((e) => e.selectors.includes('.nav.open') && hasDecl(e, 'transform')));
check('оверлей .nav-overlay.show есть', flat.some((e) => e.selectors.includes('.nav-overlay.show')));
check('скролл фона блокируется (body.menu-open)', flat.some((e) => e.selectors.includes('body.menu-open') && hasDecl(e, 'overflow', (v) => v === 'hidden')));

/* ---------- 3. Панель фильтров (инлайн, без шторки) ---------- */
console.log('\n3. Панель фильтров каталога');
check('.filters-toggle скрыт на десктопе', flat.some((e) => !e.media && e.selectors.includes('.filters-toggle') && hasDecl(e, 'display', (v) => v === 'none')));
check('.filters-toggle показан до 900px', flat.some((e) => inMedia(e, '900') && e.selectors.includes('.filters-toggle') && hasDecl(e, 'display', (v) => v !== 'none')));
check('панель .filters.open раскрывается в потоке',
  flat.some((e) => e.selectors.includes('.filters.open') && hasDecl(e, 'display', (v) => v === 'grid')));
check('на мобиле панель по умолчанию скрыта (display:none)',
  flat.some((e) => inMedia(e, '900') && e.selectors.includes('.filters') && hasDecl(e, 'display', (v) => v === 'none')));
check('фильтры нигде не fixed (шторки нет)',
  !flat.some((e) => e.selectors.includes('.filters') && hasDecl(e, 'position', (v) => v === 'fixed')));
check('кнопка «Показать N» (.filters-foot) есть', flat.some((e) => e.selectors.includes('.filters-foot .btn')));
check('бейдж числа фильтров (.filters-count) есть', flat.some((e) => e.selectors.includes('.filters-count')));

/* ---------- 4. Тач-цели ---------- */
console.log('\n4. Тач-цели не меньше 44px');
const targets = [
  ['.btn', 44], ['.mark', 44], ['.icon-btn', 44], ['.tab', 44], ['.opt', 44],
  ['.switch', 44], ['.input', 44], ['.seed-item', 44], ['.quick', 44], ['.btn-link', 44],
];
for (const [sel, need] of targets) {
  const best = Math.max(0, ...flat.filter((e) => e.selectors.includes(sel)).map(minHeightPx));
  check(`${sel} ≥ ${need}px`, best >= need, `${best}px`);
}
const chipEntry = flat.find((e) => e.selectors.includes('a.chip'));
check('кликабельные чипы ≥ 44px', chipEntry && minHeightPx(chipEntry) >= 44,
  chipEntry ? `${minHeightPx(chipEntry)}px` : 'правила нет');

/* ---------- 5. Защита от переполнения ---------- */
console.log('\n5. Защита от горизонтального переполнения');
const bareMinmax = [...cssText.matchAll(/minmax\((\d+)px/g)].map((m) => Number(m[1]));
check('нет голых minmax(Npx) шире 150px (только min(Npx,100%))',
  bareMinmax.every((n) => n < 150), bareMinmax.length ? bareMinmax.join(',') : 'чисто');
check('.main с overflow-x: clip', flat.some((e) => e.selectors.includes('.main') && hasDecl(e, 'overflow-x', (v) => v === 'clip')));
check('заголовки с overflow-wrap', flat.some((e) => e.selectors.includes('h1') && hasDecl(e, 'overflow-wrap')));
check('viewport в index.html', htmlText.includes('width=device-width'));
check('нет width: 100vw (ломает мобилы со скроллбаром)', !/width:\s*100vw/.test(cssText));

/* ---------- 6. Мобильные правила ---------- */
console.log('\n6. Ключевые мобильные правила');
check('hero-art НЕ прячется на мобиле', !flat.some((e) => e.selectors.includes('.hero-art') && hasDecl(e, 'display', (v) => v === 'none')));
check('квиз в одну колонку до 640px', flat.some((e) => inMedia(e, '640') && e.selectors.includes('.quiz-options') && hasDecl(e, 'grid-template-columns', (v) => v === '1fr')));
check('навигация квиза sticky до 640px', flat.some((e) => inMedia(e, '640') && e.selectors.includes('.quiz-nav') && hasDecl(e, 'position', (v) => v === 'sticky')));
check('карточки компактные на телефоне', flat.some((e) => inMedia(e, '640') && e.selectors.some((s) => s.includes('.card-chips'))));
check('кнопки переносят текст на телефоне', flat.some((e) => inMedia(e, '640') && e.selectors.includes('.btn') && hasDecl(e, 'white-space', (v) => v === 'normal')));

/* ---------- 7. Фолбэки современных функций ---------- */
console.log('\n7. Фолбэки color-mix / backdrop-filter');
const colorMixRules = flat.filter((e) => e.declarations.some((d) => d.value.includes('color-mix')));
const noFallback = colorMixRules.filter((e) => {
  // у каждого color-mix должен быть plain-дубль того же свойства выше по каскаду
  const idx = e.declarations.findIndex((d) => d.value.includes('color-mix'));
  const prop = e.declarations[idx].property;
  return !e.declarations.slice(0, idx).some((d) => d.property === prop && !d.value.includes('color-mix'));
});
check('у каждого color-mix есть plain-фолбэк', noFallback.length === 0,
  noFallback.map((e) => e.selectors.join(',')).join(' ') || `${colorMixRules.length} мест`);
check('@supports для backdrop-filter', cssText.includes('@supports not (backdrop-filter'));

console.log(`\nПроверок: ${passed + failures.length} · ✅ ${passed} · ❌ ${failures.length}`);
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
