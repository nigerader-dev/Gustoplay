/**
 * Блок «Подходит ли ваш ПК» на странице игры.
 *
 * Свёрнутый вид — вердикт и кнопка; развёрнутый — выбор комплектующих и таблица сравнения
 * «параметр · требуется · у вас · итог». Сравнение целиком живёт в js/pcfit.js (там же
 * объяснение, что сравнивается точно, а что приблизительно).
 *
 * Комплектующие хранятся в профиле устройства (meta.pc) — как тема и язык: один раз выбрали,
 * работает на всех играх. Ничего никуда не отправляется сверх обычной синхронизации профиля.
 *
 * При смене поля перерисовываются только вердикт, таблица и оговорки — сама форма остаётся,
 * поэтому страница не прыгает, а фокус не теряется.
 */
import { icon } from '../icons.js';
import { getLang, t } from '../i18n.js';
import { getProfile, setMeta } from '../store.js';
import { CPUS, GPUS, RAM_OPTIONS, DISK_OPTIONS, OS_OPTIONS, BITS_OPTIONS, UNKNOWN, findOs, osLabel, partLabel } from '../pcparts.js';
import { compareWithPc, normalizePc, pcFilled, emptyPc } from '../pcfit.js';
import { esc } from './components.js';

/** Игра, для которой сейчас нарисован блок — нужна при перерисовке после смены поля */
let currentGame = null;

/** Текущий профиль ПК пользователя (нормализованный) */
const readPc = () => normalizePc(getProfile().meta?.pc);

/** Подписи параметров для таблицы и формы */
const FIELD_LABELS = {
  os: 'pcfit.field.os',
  cpu: 'pcfit.field.cpu',
  ram: 'pcfit.field.ram',
  gpu: 'pcfit.field.gpu',
  dx: 'pcfit.field.dx',
  disk: 'pcfit.field.disk',
  bits: 'pcfit.field.bits',
};

const MARK_CLASS = { ok: 'ok', close: 'close', fail: 'fail', unknown: 'unknown' };
const MARK_ICON = { ok: 'check', close: 'minus', fail: 'x', unknown: 'help' };

/** Пункт списка «не хватает»: подпись параметра берём из словаря */
const listNames = (ids) => ids.map((id) => t(FIELD_LABELS[id])).join(', ');

/** Строка вердикта: короткая, без догадок — только то, что реально посчитано */
function verdictText(result) {
  switch (result.verdict) {
    case 'recommended': return t('pcfit.verdict.recommended');
    case 'minimum': return t('pcfit.verdict.minimum');
    case 'not-enough': return t('pcfit.verdict.notEnough', { list: listNames(result.missing) });
    default: return t('pcfit.verdict.unknown');
  }
}

/** Значение требования для ячейки: «мин 8 GB · рек 16 GB» (модели — на языке интерфейса) */
const needCell = (row, lang) => {
  const text = (value, partId) => (partId ? partLabel(partId, lang) : value);
  const parts = [];
  if (row.need.min) parts.push(`${t('pcfit.need.min')} ${text(row.need.min, row.needPart?.min)}`);
  if (row.need.rec) parts.push(`${t('pcfit.need.rec')} ${text(row.need.rec, row.needPart?.rec)}`);
  return parts.length ? parts.join(' · ') : t('pcfit.need.none');
};

/** Блок выбора: конкретные модели отдельно от серий — так список понятнее */
const partOptions = (list, selected) => {
  const lang = getLang();
  const models = list.filter((p) => !p.series);
  const series = list.filter((p) => p.series);
  const group = (label, items) => `<optgroup label="${esc(label)}">${items
    .map((p) => `<option value="${esc(p.id)}"${p.id === selected ? ' selected' : ''}>${esc(partLabel(p, lang))}</option>`)
    .join('')}</optgroup>`;
  return `<option value="${UNKNOWN}"${selected === UNKNOWN || !selected ? ' selected' : ''}>${esc(t('pcfit.unknown'))}</option>`
    + group(t('pcfit.group.models'), models)
    + group(t('pcfit.group.series'), series);
};

const numberOptions = (values, selected, unit) => `<option value="${UNKNOWN}"${selected === UNKNOWN ? ' selected' : ''}>${esc(t('pcfit.unknown'))}</option>`
  + values.map((v) => `<option value="${v}"${Number(selected) === v ? ' selected' : ''}>${v} ${unit}</option>`).join('');

const field = (id, control) => `<label class="pcfit-field">
  <span>${esc(t(FIELD_LABELS[id]))}</span>
  ${control}
</label>`;

function form(pc) {
  return `<div class="pcfit-form" data-pcfit-form>
    ${field('os', `<select data-pcfield="os">${objectOptions(OS_OPTIONS, pc.os, (o) => osLabel(o, getLang()))}</select>`)}
    ${field('cpu', `<select data-pcfield="cpu">${partOptions(CPUS, pc.cpu)}</select>`)}
    ${field('ram', `<select data-pcfield="ram">${numberOptions(RAM_OPTIONS, pc.ram, 'GB')}</select>`)}
    ${field('gpu', `<select data-pcfield="gpu">${partOptions(GPUS, pc.gpu)}</select>`)}
    ${field('disk', `<select data-pcfield="disk">${numberOptions(DISK_OPTIONS, pc.disk, 'GB')}</select>`)}
    ${field('bits', `<select data-pcfield="bits">${bitsOptions(pc.bits)}</select>`)}
    <p class="pcfit-hint">${esc(t('pcfit.hint.unknown'))}</p>
  </div>`;
}

/** Системы: обычный список объектов {id, name} */
const objectOptions = (list, selected, label) => `<option value="${UNKNOWN}"${selected === UNKNOWN ? ' selected' : ''}>${esc(t('pcfit.unknown'))}</option>`
  + list.map((o) => `<option value="${esc(o.id)}"${o.id === selected ? ' selected' : ''}>${esc(label(o))}</option>`).join('');

const bitsOptions = (selected) => `<option value="${UNKNOWN}"${selected === UNKNOWN ? ' selected' : ''}>${esc(t('pcfit.unknown'))}</option>`
  + BITS_OPTIONS.map((o) => `<option value="${esc(o.id)}"${o.id === selected ? ' selected' : ''}>${esc(t(`pcfit.bits.${o.id}`))}</option>`).join('');

/** Таблица сравнения: параметр, требования мин/рек, что у пользователя, итог */
function table(result) {
  const lang = getLang();
  const rows = result.rows
    .filter((r) => r.need.min || r.need.rec || r.have)
    .map((r) => {
      // Итог по строке: строгий статус по минимальным требованиям, иначе по рекомендуемым
      const mark = r.min !== 'unknown' ? r.min : r.rec;
      const have = r.havePart ? partLabel(r.havePart, lang)
        : (r.haveOs ? osLabel(findOs(r.haveOs), lang)
          : (r.id === 'bits' && r.have ? `${r.have} ${t('pcfit.bits')}` : r.have));
      // data-label — те же подписи колонок, но их читает мобильная раскладка (CSS ::before):
      // на телефоне строка превращается в карточку, и колонка «Итог» больше не уезжает за край
      return `<tr>
        <th scope="row">${esc(t(FIELD_LABELS[r.id]))}</th>
        <td data-label="${esc(t('pcfit.col.need'))}">${esc(needCell(r, lang))}</td>
        <td data-label="${esc(t('pcfit.col.have'))}">${esc(have || t('pcfit.have.unknown'))}</td>
        <td data-label="${esc(t('pcfit.col.result'))}"><span class="pcfit-mark ${MARK_CLASS[mark]}">${icon(MARK_ICON[mark])} ${esc(t(`pcfit.mark.${mark}`))}</span></td>
      </tr>`;
    })
    .join('');
  return `<div class="pcfit-table-wrap">
    <table class="pcfit-table" aria-label="${esc(t('pcfit.table.caption'))}">
      <thead><tr>
        <th scope="col">${esc(t('pcfit.col.param'))}</th>
        <th scope="col">${esc(t('pcfit.col.need'))}</th>
        <th scope="col">${esc(t('pcfit.col.have'))}</th>
        <th scope="col">${esc(t('pcfit.col.result'))}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

/** Оговорки: что именно не проверяется и почему — без них блок выглядел бы точнее, чем он есть */
function notes(result, pc) {
  const items = [t('pcfit.note.approx'), t('pcfit.note.dx')];
  if (result.untested.length) items.push(t('pcfit.note.untested', { list: listNames(result.untested) }));
  if (pc.os === 'other') items.push(t('pcfit.note.otherOs'));
  items.push(t('pcfit.note.sound'));
  return `<ul class="pcfit-notes">${items.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
}

/** Внутренности блока, которые обновляются при смене комплектующих */
function body(result, pc) {
  if (!result.hasData) {
    return `<p class="pcfit-empty" data-pcfit-body>${esc(t('pcfit.noData'))}</p>`;
  }
  if (!pcFilled(pc)) {
    return `<p class="pcfit-empty" data-pcfit-body>${esc(t('pcfit.unfilled'))}</p>`;
  }
  return `<div data-pcfit-body>
    <div class="pcfit-result-live" aria-live="polite">
      <p class="pcfit-verdict-line">${esc(verdictText(result))}</p>
      ${result.verdict === 'minimum' && result.untested.length ? `<p class="pcfit-partial">${esc(t('pcfit.partial', { list: listNames(result.untested) }))}</p>` : ''}
    </div>
    ${table(result)}
    ${notes(result, pc)}
  </div>`;
}

/**
 * Разметка блока. `open` — раскрыта ли форма (по умолчанию: нет комплектующих → раскрыта).
 */
export function pcfitBlock(game, { open = null } = {}) {
  currentGame = game;
  const pc = readPc();
  const filled = pcFilled(pc);
  const result = compareWithPc(game, pc);
  const expanded = open === null ? !filled : open;
  return `<div class="pcfit" data-pcfit data-expanded="${expanded}">
    <div class="pcfit-head">
      <strong>${icon('monitor')} ${esc(t('pcfit.title'))}</strong>
      ${filled && result.hasData ? `<span class="pcfit-verdict ${result.verdict}">${esc(verdictText(result))}</span>` : ''}
    </div>
    <p class="pcfit-intro">${esc(t('pcfit.intro'))}</p>
    ${form(pc)}
    ${body(result, pc)}
    ${actions(pc, expanded)}
  </div>`;
}

/**
 * Кнопки блока. Пересобираются вместе с вердиктом: иначе после выбора комплектующих
 * в разметке остались бы кнопки «пустого» состояния — без «Изменить» и «Сбросить».
 */
function actions(pc, expanded = false) {
  const filled = pcFilled(pc);
  return `<div class="pcfit-actions" data-pcfit-actions>
    <button type="button" class="btn btn-outline btn-sm" data-action="pcfit-toggle">
      ${esc(expanded ? t('pcfit.hideForm') : (filled ? t('pcfit.edit') : t('pcfit.open')))}
    </button>
    ${filled ? `<button type="button" class="btn btn-ghost btn-sm" data-action="pcfit-reset">${esc(t('pcfit.reset'))}</button>` : ''}
  </div>`;
}

/** Пересобирает вердикт, таблицу и оговорки после смены комплектующих */
function refresh(block) {
  const pc = readPc();
  const result = compareWithPc(currentGame, pc);
  for (const el of block.querySelectorAll('[data-pcfit-body]')) el.outerHTML = body(result, pc);
  for (const el of block.querySelectorAll('[data-pcfit-actions]')) {
    el.outerHTML = actions(pc, block.dataset.expanded === 'true');
  }
  const head = block.querySelector('.pcfit-head');
  const showVerdict = Boolean(result.hasData && pcFilled(pc));
  let verdict = head?.querySelector('.pcfit-verdict');
  if (showVerdict) {
    if (!verdict) {
      head.insertAdjacentHTML('beforeend', `<span class="pcfit-verdict"></span>`);
      verdict = head.querySelector('.pcfit-verdict');
    }
    verdict.textContent = verdictText(result);
    verdict.className = `pcfit-verdict ${result.verdict}`;
  } else verdict?.remove();
}

/**
 * Обработчики блока: смена комплектующих и кнопки. Делегирование повешено на #app —
 * блок перерисовывается вместе со страницей, поэтому отдельные слушатели терялись бы.
 */
export function mountPcfit(root) {
  if (root.dataset.pcfitBound === '1') return;
  root.dataset.pcfitBound = '1';

  root.addEventListener('change', (event) => {
    const select = event.target.closest('[data-pcfield]');
    if (!select) return;
    const block = select.closest('[data-pcfit]');
    if (!block) return;
    const fieldId = select.dataset.pcfield;
    const pc = readPc();
    const value = select.value === UNKNOWN ? UNKNOWN : select.value;
    // Числовые поля храним числами, идентификаторы моделей — строками
    const next = ['ram', 'disk'].includes(fieldId) && value !== UNKNOWN ? Number(value) : value;
    setMeta({ pc: { ...(getProfile().meta?.pc || emptyPc()), ...pc, [fieldId]: next } });
    refresh(block);
  });

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="pcfit-toggle"], [data-action="pcfit-reset"]');
    if (!button) return;
    const block = button.closest('[data-pcfit]');
    if (!block) return;
    event.preventDefault();
    if (button.dataset.action === 'pcfit-reset') {
      setMeta({ pc: emptyPc() });
      block.outerHTML = pcfitBlock(currentGame, { open: true });
      return;
    }
    const expanded = block.dataset.expanded === 'true';
    block.dataset.expanded = String(!expanded);
    const label = button.textContent.trim();
    const filled = pcFilled(readPc());
    button.textContent = !expanded ? t('pcfit.hideForm') : (filled ? t('pcfit.edit') : t('pcfit.open'));
    if (!label) return;
  });
}
