#!/usr/bin/env node
/** Пробует закоммитить и запушить js/catalog/sysreq.js из CI.
 * Никогда не роняет шаг: стадии логируются аннотациями, итог пишется в
 * $GITHUB_OUTPUT (pushed=yes|no) — шаг доставки данных по этому решает,
 * нужны ли аннотации (см. tools/emit-sysreq-data.mjs).
 *
 *   node tools/commit-sysreq.mjs
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';

const notice = (m) => console.log(`::notice::sysreq-commit: ${m}`);
const setOutput = (v) => {
  const out = process.env.GITHUB_OUTPUT;
  if (out) appendFileSync(out, `pushed=${v}\n`);
};
const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const branch = process.env.GITHUB_REF_NAME || 'main';

try {
  git(['config', 'user.name', 'gustoplay-bot']);
  git(['config', 'user.email', 'gustoplay-bot@users.noreply.github.com']);
  const targets = ['js/catalog/sysreq.js', 'tools/sysreq-review.txt'].filter(existsSync);
  notice(`файлы: ${targets.join(', ') || 'нет — инструмент ничего не записал'}`);
  if (targets.length) git(['add', '--', ...targets]);
  notice(`статус: ${git(['status', '--porcelain']).split('\n').filter(Boolean).slice(0, 4).join(' | ') || 'чисто'}`);

  let hasChanges = false;
  try {
    git(['diff', '--cached', '--quiet']);
  } catch {
    hasChanges = true;
  }
  if (!hasChanges) {
    notice('изменений нет — требования уже собраны');
    setOutput('yes');
    process.exit(0);
  }

  git(['commit', '-m', 'chore(sysreq): требования к ПК из Steam (авто-резолвер)']);
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
