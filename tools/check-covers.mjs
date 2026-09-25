import { GAMES } from '../js/catalog/index.js';
const mapped = GAMES.filter((g) => g.cover);
const broken = [];
for (const game of mapped) {
  try { const res = await fetch(game.cover, { method: 'HEAD' }); if (!res.ok) broken.push(`${game.t}: HTTP ${res.status}`); }
  catch (error) { broken.push(`${game.t}: ${error.message}`); }
}
console.log(`Обложки: ${mapped.length}/${GAMES.length} имеют проверенный Steam URL`);
if (broken.length) { console.error(broken.join('\n')); process.exit(1); }
if (mapped.length < GAMES.length) console.warn('Покрытие неполное: запустите npm run covers:resolve в окружении с доступом к Steam Store API.');
