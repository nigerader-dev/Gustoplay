/**
 * GustoPlay — минималистичный статический сервер для локальной разработки и предпросмотра.
 * Без зависимостей. Слушает 0.0.0.0, не ставит X-Frame-Options (нужно для live-preview в iframe).
 *
 *   node server.js                 # раздаёт текущую папку на http://0.0.0.0:5173
 *   PORT=8080 node server.js       # свой порт
 *   node server.js --dir=dist      # раздаёт собранную статику (после npm run build)
 */
import http from 'node:http';
import { createReadStream, statSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), process.argv.find((a) => a.startsWith('--dir='))?.slice(6) || '.');
const port = Number(process.env.PORT || 5173);
const host = '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function serveFile(res, file) {
  const ext = extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=60',
    'Content-Length': statSync(file).size,
  });
  createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let target = normalize(join(root, urlPath));

  // защита от выхода за пределы корня
  if (!target.startsWith(root)) return send(res, 403, 'Forbidden');

  if (existsSync(target) && statSync(target).isDirectory()) {
    const idx = join(target, 'index.html');
    if (existsSync(idx)) return serveFile(res, idx);
    // простая листинг-страница (индексов нет — только для /docs)
    const items = readdirSync(target).map((f) => `<li><a href="${join(urlPath, f)}">${f}</a></li>`).join('');
    return send(res, 200, `<!doctype html><meta charset=utf-8><h1>${urlPath}</h1><ul>${items}</ul>`, MIME['.html']);
  }

  if (existsSync(target) && statSync(target).isFile()) return serveFile(res, target);

  // Ассеты из вложенных путей: при ЧПУ вида /catalog относительные ссылки превращаются
  // в /catalog/css/styles.css. Если файла там нет — ищем его от корня (как это делает Cloudflare Pages).
  if (extname(target)) {
    const segments = urlPath.split('/').filter(Boolean);
    for (let i = 1; i < segments.length; i++) {
      const candidate = normalize(join(root, ...segments.slice(i)));
      if (candidate.startsWith(root) && existsSync(candidate) && statSync(candidate).isFile()) return serveFile(res, candidate);
    }
  }

  // SPA-fallback: любой неизвестный путь отдаёт index.html
  const fallback = join(root, 'index.html');
  if (existsSync(fallback)) return serveFile(res, fallback);
  return send(res, 404, 'Not found');
});

server.listen(port, host, () => {
  console.log(`GustoPlay dev server → http://${host}:${port}  (root: ${root})`);
  console.log('Для превью в браузере открой прокси-адрес порта из панели Arena.');
});
