/**
 * Тест live reload: поднимает настоящий server.js на временной папке и проверяет,
 * что браузер получит скрипт автообновления и события об изменённых файлах.
 *
 * Запуск: npm run test:reload
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

const failures = [];
let passed = 0;
const check = (name, condition, extra = '') => {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}${extra ? ` — ${extra}` : ''}`);
  } else {
    console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ''}`);
    failures.push(name);
  }
};

const freePort = () => new Promise((resolve) => {
  const srv = net.createServer();
  srv.listen(0, '127.0.0.1', () => {
    const port = srv.address().port;
    srv.close(() => resolve(port));
  });
});

async function waitFor(url, timeoutMs = 8000) {
  const start = Date.now();
  for (;;) {
    try {
      const res = await fetch(url);
      return res;
    } catch {
      if (Date.now() - start > timeoutMs) throw new Error(`не дождались ${url}`);
      await sleep(150);
    }
  }
}

function sseEvents(url, onData, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`SSE timeout: ${url}`)), timeoutMs);
    fetch(url).then(async (res) => {
      if (!res.ok || !res.body) throw new Error(`SSE status ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data:')) continue;
            try {
              if (onData(JSON.parse(line.slice(5).trim())) === true) {
                clearTimeout(timer);
                reader.cancel().catch(() => {});
                resolve(true);
                return;
              }
            } catch { /* ignore */ }
          }
        }
      }
    }).catch(reject);
  });
}

// временный «проект» с минимальной структурой
const dir = mkdtempSync(join(tmpdir(), 'gusto-reload-'));
mkdirSync(join(dir, 'css'), { recursive: true });
mkdirSync(join(dir, 'js'), { recursive: true });
writeFileSync(join(dir, 'index.html'), '<!doctype html><html><head><title>t</title></head><body>hi</body></html>');
writeFileSync(join(dir, 'css', 'a.css'), 'body{color:red}');
writeFileSync(join(dir, 'js', 'b.js'), 'console.log(1)');

const procs = [];
async function startServer(args) {
  const port = await freePort();
  const proc = spawn('node', ['server.js', `--dir=${dir}`, ...args], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  procs.push(proc);
  await waitFor(`http://127.0.0.1:${port}/`);
  return { proc, base: `http://127.0.0.1:${port}` };
}

try {
  console.log('\n1. Dev-режим: сниппет и события');
  {
    const { base } = await startServer(['--reload']);
    const html = await (await fetch(`${base}/`)).text();
    check('в index.html подмешан скрипт reload', html.includes('<script src="/__reload.js" defer></script>'));
    check('исходный контент цел', html.includes('>hi<'));
    const clientJs = await fetch(`${base}/__reload.js`);
    const clientText = await clientJs.text();
    check('виртуальный /__reload.js раздаётся', clientJs.status === 200 && clientText.includes('EventSource'));
    check('js/css в dev без кеша', (await fetch(`${base}/js/b.js`)).headers.get('cache-control') === 'no-store');

    // SSE: правим css — ждём событие с путём файла
    const got = sseEvents(`${base}/__reload/events`, (msg) => {
      if (msg.changed?.includes('css/a.css')) return true;
      return false;
    });
    await sleep(400); // даём подписке и вотчерам устаканиться
    appendFileSync(join(dir, 'css', 'a.css'), '\nbody{color:blue}');
    check('правка css присылает SSE-событие', await got);
  }

  console.log('\n2. Прод-режим: без сниппета');
  {
    const { base } = await startServer([]);
    const html = await (await fetch(`${base}/`)).text();
    check('в dist-режиме сниппета нет', !html.includes('__reload'));
    const sseRes = await fetch(`${base}/__reload/events`);
    check('SSE-эндпоинт недоступен', !sseRes.headers.get('content-type')?.includes('text/event-stream'));
  }

  console.log('\n3. SPA-fallback тоже с reload');
  {
    const { base } = await startServer(['--reload']);
    const html = await (await fetch(`${base}/catalog`)).text();
    check('неизвестный путь отдаёт index.html со сниппетом', html.includes('__reload.js') && html.includes('>hi<'));
  }
} finally {
  for (const proc of procs) proc.kill('SIGKILL');
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\nПроверок: ${passed + failures.length} · ✅ ${passed} · ❌ ${failures.length}`);
if (failures.length) {
  for (const f of failures) console.log(` - ${f}`);
  process.exit(1);
}
console.log('\n✅ Все проверки пройдены');
