/**
 * Бэкапы и безопасные коммиты. Защита от двух бед:
 *   1) потеря истории/файлов (окружение разработки может пересоздать .git или node_modules);
 *   2) случайный «массовый» коммит, который удаляет файлы (git add -A на неполном дереве).
 *
 * Команды:
 *   node tools/backup.mjs backup            создать бэкап (bundle + tar + манифест), оставить последние 10
 *   node tools/backup.mjs list              список бэкапов
 *   node tools/backup.mjs verify [метка]    проверить целостность (git bundle verify + sha256 + tar -t)
 *   node tools/backup.mjs restore <метка> [--into=dir]   распаковать снимок в каталог (по умолчанию ../restore/<метка>)
 *   node tools/backup.mjs status            сверить локальную ветку с origin (что нигде не разошлось)
 *   node tools/backup.mjs commit "сообщение"   бэкап → add -A → ЗАЩИТА от массовых удалений → commit → push
 *
 * Откат истории (вручную, осознанно):
 *   git clone ../backups/<метка>/repo.bundle restored-repo     # вся история из бандла
 *   git reset --hard <sha>                                     # или точечно по sha из MANIFEST.txt
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: toolDir, encoding: 'utf8' }).trim();
const backupsRoot = join(repoRoot, 'backups');
const KEEP = 10;

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: repoRoot, encoding: 'utf8', ...opts });
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const die = (message) => { console.error(`❌ ${message}`); process.exit(1); };
const ok = (message) => console.log(`  ✅ ${message}`);

/** Список бэкапов: самые свежие первыми */
function listBackups() {
  if (!existsSync(backupsRoot)) return [];
  return readdirSync(backupsRoot)
    .filter((name) => statSync(join(backupsRoot, name)).isDirectory())
    .sort()
    .reverse();
}

function createBackup() {
  const label = stamp();
  const dir = join(backupsRoot, label);
  mkdirSync(dir, { recursive: true });

  // 1) вся история git одним файлом — из него можно восстановить даже удалённый репозиторий
  sh('git', ['bundle', 'create', join(dir, 'repo.bundle'), '--all']);
  ok(`git-бандл со всей историей: backups/${label}/repo.bundle`);

  // 2) снимок рабочего дерева без тяжёлого и пересоздаваемого (.git, node_modules, dist, backups)
  const archive = join(dir, 'worktree.tar.gz');
  sh('tar', ['-czf', archive,
    '--exclude=./.git', '--exclude=./node_modules', 
    '--exclude=./dist', '--exclude=./backups',
    '-C', repoRoot, '.']);
  ok(`снимок рабочего дерева: backups/${label}/worktree.tar.gz`);

  // 3) манифест: что именно сохранено и как это проверить
  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  const head = sh('git', ['rev-parse', 'HEAD']).trim();
  let remote = 'нет связи с origin';
  try { remote = sh('git', ['ls-remote', 'origin', `refs/heads/${branch}`]).split('\t')[0] || 'ветки нет на origin'; } catch { /* офлайн */ }
  const lines = [
    `метка:      ${label}`,
    `дата:       ${new Date().toISOString()}`,
    `ветка:      ${branch}`,
    `HEAD:       ${head}`,
    `HEAD темы:  ${sh('git', ['log', '-1', '--format=%s', 'HEAD']).trim()}`,
    `origin/${branch}: ${remote}`,
    `файлов в снимке: ${sh('tar', ['-tzf', archive]).trim().split('\n').filter(Boolean).length}`,
    `sha256 repo.bundle:      ${sha256(join(dir, 'repo.bundle'))}`,
    `sha256 worktree.tar.gz:  ${sha256(archive)}`,
    '',
    'Откат:',
    `  git clone ${join('backups', label, 'repo.bundle')} restored-repo   # вся история`,
    `  mkdir restored && tar -xzf ${join('backups', label, 'worktree.tar.gz')} -C restored   # рабочее дерево`,
    `  npm run backup:restore -- ${label}                                  # то же самое скриптом`,
  ];
  writeFileSync(join(dir, 'MANIFEST.txt'), `${lines.join('\n')}\n`);
  ok(`манифест: backups/${label}/MANIFEST.txt (HEAD ${head.slice(0, 7)})`);

  // 4) чистим старьё, чтобы бэкапы не съедали место
  const stale = listBackups().slice(KEEP);
  for (const name of stale) {
    rmSync(join(backupsRoot, name), { recursive: true, force: true });
    console.log(`  🗑  удалён устаревший бэкап: ${name} (храним последние ${KEEP})`);
  }
  console.log(`✅ Бэкап готов: backups/${label}`);
  return label;
}

function verifyBackup(label) {
  const name = label || listBackups()[0];
  if (!name) die('бэкапов нет — сначала npm run backup');
  const dir = join(backupsRoot, name);
  if (!existsSync(dir)) die(`бэкап ${name} не найден в backups/`);

  console.log(`Проверка бэкапа ${name}:`);
  sh('git', ['bundle', 'verify', join(dir, 'repo.bundle')]);
  ok('git bundle verify — история цела');

  const manifest = readFileSync(join(dir, 'MANIFEST.txt'), 'utf8');
  for (const file of ['repo.bundle', 'worktree.tar.gz']) {
    const expected = new RegExp(`sha256 ${file.replace('.', '\\.')}:\\s+([0-9a-f]{64})`).exec(manifest)?.[1];
    if (!expected) die(`в манифесте нет sha256 для ${file}`);
    if (sha256(join(dir, file)) !== expected) die(`sha256 не совпал для ${file} — файл повреждён`);
    ok(`sha256 совпал: ${file}`);
  }
  const count = sh('tar', ['-tzf', join(dir, 'worktree.tar.gz')]).trim().split('\n').filter(Boolean).length;
  ok(`архив читается, записей: ${count}`);
  console.log(`✅ Бэкап ${name} пригоден для отката`);
}

function restoreBackup(label, intoArg) {
  const name = label || listBackups()[0];
  if (!name) die('бэкапов нет');
  const dir = join(backupsRoot, name);
  const archive = join(dir, 'worktree.tar.gz');
  if (!existsSync(archive)) die(`нет worktree.tar.gz в backups/${name}`);
  verifyBackup(name);

  const into = resolve(repoRoot, intoArg || join('restore', name));
  if (existsSync(into) && readdirSync(into).length) {
    die(`каталог ${into} не пуст — укажите другой через --into=..., ничего не перезаписываю`);
  }
  mkdirSync(into, { recursive: true });
  sh('tar', ['-xzf', archive, '-C', into]);
  console.log(`✅ Рабочее дерево из бэкапа ${name} распаковано в ${into}`);
  console.log('   Сравните с текущим (git diff --no-index) и переносите нужное вручную —');
  console.log('   скрипт специально не перезаписывает текущие файлы.');
}

function showStatus() {
  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  const head = sh('git', ['rev-parse', 'HEAD']).trim();
  let remote = '';
  try { remote = sh('git', ['ls-remote', 'origin', `refs/heads/${branch}`]).split('\t')[0] || ''; } catch { die('нет связи с origin'); }
  const dirty = sh('git', ['status', '--porcelain']).trim();
  console.log(`Ветка:    ${branch}`);
  console.log(`HEAD:     ${head}${sh('git', ['log', '-1', '--format=  %s']).trimEnd()}`);
  console.log(`origin:   ${remote || 'ветки нет на origin'}`);
  console.log(`Изменения в рабочем дереве: ${dirty ? `\n${dirty}` : 'нет'}`);
  if (remote && remote !== head) console.log('⚠️  Локальный HEAD отличается от origin — сверьте перед пушем');
  else if (remote) ok('локальный HEAD совпадает с origin');
}

/**
 * Безопасный коммит: сначала бэкап, потом проверка, что мы не удаляем полпроекта.
 * Защита сработала в реальности: git add -A на неполном рабочем дереве однажды
 * закоммитил удаление 70 файлов.
 */
function safeCommit(message, allowDelete) {
  if (!message) die('нужно сообщение коммита: npm run commit -- "сообщение"');
  createBackup();

  sh('git', ['add', '-A']);
  const staged = sh('git', ['diff', '--cached', '--name-status']).trim();
  if (!staged) { console.log('Нечего коммитить — рабочее дерево совпадает с HEAD'); return; }

  const files = staged.split('\n').filter(Boolean);
  const deleted = files.filter((line) => line.startsWith('D\t')).map((line) => line.slice(2));
  console.log(`В коммите: ${files.length} файл(ов), из них удалений: ${deleted.length}`);
  if (deleted.length && !allowDelete) {
    console.error(`\n❌ Остановлено: коммит удаляет ${deleted.length} файл(ов). Примеры:`);
    deleted.slice(0, 10).forEach((f) => console.error(`     - ${f}`));
    console.error('\nЕсли это не ошибка (файлы действительно больше не нужны) — повторите с флагом:');
    console.error('   node tools/backup.mjs commit "сообщение" --allow-delete');
    console.error('Отменить подготовленное: git reset');
    process.exit(1);
  }
  if (deleted.length) console.log(`  ⚠️  Удаления разрешены флагом --allow-delete (${deleted.length} шт.)`);

  sh('git', ['commit', '-m', message]);
  ok(`коммит создан: ${sh('git', ['rev-parse', '--short', 'HEAD']).trim()}`);
  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  sh('git', ['push', 'origin', branch], { stdio: 'inherit' });
  ok(`отправлено в origin/${branch}`);
}

/* ------------------------------------------------------------------ */

const [command, ...rest] = process.argv.slice(2);
const flags = rest.filter((a) => a.startsWith('--'));
const args = rest.filter((a) => !a.startsWith('--'));

switch (command) {
  case 'backup': createBackup(); break;
  case 'list': {
    const all = listBackups();
    if (!all.length) console.log('Бэкапов нет — выполните npm run backup');
    for (const name of all) {
      const dir = join(backupsRoot, name);
      const head = /HEAD:\s+(\w+)/.exec(readFileSync(join(dir, 'MANIFEST.txt'), 'utf8'))?.[1] || '?';
      console.log(`  ${name}  HEAD ${head.slice(0, 7)}  (${(statSync(join(dir, 'repo.bundle')).size / 1024).toFixed(0)} КБ бандл)`);
    }
    break;
  }
  case 'verify': verifyBackup(args[0]); break;
  case 'restore': restoreBackup(args[0], flags.find((f) => f.startsWith('--into='))?.slice(7)); break;
  case 'status': showStatus(); break;
  case 'commit': safeCommit(args[0], flags.includes('--allow-delete')); break;
  default:
    console.log(`Использование: node tools/backup.mjs ${'{backup|list|verify|restore|status|commit "сообщение"}'}`);
    process.exit(command ? 1 : 0);
}
