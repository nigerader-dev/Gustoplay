/**
 * Требования к ПК из Steam Store API (pc_requirements): минимальные и рекомендуемые.
 * Сгенерировано tools/pull-system-requirements.mjs (запуск — .github/workflows/sysreq.yml).
 *
 * Формат: строка — значение одинаково для ru и en; { ru, en } — отличается по языку.
 * Поля: os (ОС), cpu (процессор), ram (память), gpu (видеокарта), dx (DirectX),
 * disk (место на диске), sound, net, note (примечания), bit64 (нужна 64-битная система).
 *
 * Ручные правки не сохраняются — они живут в tools/sysreq-overrides.json.
 */
export const SYSREQ = {

};
