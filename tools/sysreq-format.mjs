/**
 * Единый формат файла требований к ПК (js/catalog/sysreq.js).
 * Используется и когда данные тянет tools/pull-system-requirements.mjs,
 * и когда их вкатывает снаружи tools/collect-sysreq-data.mjs из аннотаций прогона.
 */

export const SYSREQ_HEADER = `/**
 * Требования к ПК из Steam Store API (pc_requirements): минимальные и рекомендуемые.
 * Сгенерировано tools/pull-system-requirements.mjs (запуск — .github/workflows/sysreq.yml).
 *
 * Формат: строка — значение одинаково для ru и en; { ru, en } — отличается по языку.
 * Поля: os (ОС), cpu (процессор), ram (память), gpu (видеокарта), dx (DirectX),
 * disk (место на диске), sound, net, note (примечания), bit64 (нужна 64-битная система).
 *
 * Ручные правки не сохраняются — они живут в tools/sysreq-overrides.json.
 */
`;

/** Стабильная сериализация: ключи отсортированы, поэтому одинаковые данные дают одинаковый файл */
export function renderSysreqFile(result = {}) {
  const lines = Object.keys(result).sort().map((slug) => `  ${JSON.stringify(slug)}: ${JSON.stringify(result[slug])},`);
  return `${SYSREQ_HEADER}export const SYSREQ = {\n${lines.join('\n')}\n};\n`;
}
