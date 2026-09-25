#!/usr/bin/env node
/** Пробует закоммитить и запушить результат резолвера обложек из CI.
 * Никогда не роняет шаг: каждая стадия логируется аннотацией, итог пишется
 * в $GITHUB_OUTPUT (pushed=yes|no), чтобы шаг доставки данных знал, что делать.
 *
 *   node tools/commit-covers.mjs
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';

const notice = (m) => console.log(`::notice::covers-commit: ${m}`);
const setOutput = (v) => {
  const out = process.env.GITHUB_OUTPUT;
  if (out) appendFileSync(out, `pushed=${v}\n`);
};
const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const branch = process.env.GITHUB_REF_NAME || 'arena/01a0d952-gustoplay';

try {
  git(['config', 'user.name', 'gustoplay-bot']);
  git(['config', 'user.email', 'gustoplay-bot@users.noreply.github.com']);
  const targets = ['js/catalog/steam-covers.js', 'tools/cover-review.log'].filter(existsSync);
  notice(`файлы: ${targets.join(', ') || 'нет — резолвер ничего не записал'}`);
  if (targets.length) git(['add', '--', ...targets]);
  notice(`статус: ${git(['status', '--porcelain']).split('\n').filter(Boolean).slice(0, 4).join(' | ') || 'чисто'}`);

  let hasChanges = false;
  try {
    git(['diff', '--cached', '--quiet']);
  } catch {
    hasChanges = true;
  }
  if (!hasChanges) {
    notice('изменений нет — обложки уже сопоставлены');
    setOutput('yes');
    process.exit(0);
  }

  git(['commit', '-m', 'chore(covers): официальные арты каталога (авто-резолвер)']);
  notice(`создан коммит ${git(['rev-parse', '--short', 'HEAD'])}`);

  try {
    git(['push', 'origin', `HEAD:refs/heads/${branch}`]);
    notice(`запушено в ${branch}`);
    setOutput('yes');
  } catch (pushError) {
    notice(`пуш в ветку недоступен (токен только на чтение) — данные уйдут аннотациями: ${String(pushError?.stderr || pushError).split('\n')[0]?.slice(0, 200)}`);
    setOutput('no');
  }
} catch (error) {
  notice(`шаг завершился без коммита: ${String(error?.stderr || error?.message || error).split('\n')[0]?.slice(0, 200)}`);
  setOutput('no');
}
