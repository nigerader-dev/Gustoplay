/**
 * Генератор обложек. Мы не используем официальные постеры (авторские права и лицензии),
 * поэтому рисуем детерминированную абстрактную обложку из названия игры: градиент + геометрия + иконка жанра.
 * У одной игры всегда одна и та же обложка — это создаёт узнаваемость каталога.
 *
 * Хотите настоящие арты? Положите файлы в /covers/<slug>.jpg — карточки подхватят их автоматически
 * (см. js/views/components.js → coverImage()).
 */
const cache = new Map();

/** Простой хеш строки → 32-битное число */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PALETTES = [
  ['#6d5efc', '#b39bff'], ['#0ea5e9', '#7dd3fc'], ['#f97316', '#fbbf24'],
  ['#10b981', '#6ee7b7'], ['#ef4444', '#fca5a5'], ['#8b5cf6', '#f0abfc'],
  ['#0f172a', '#334155'], ['#db2777', '#fbcfe8'], ['#0891b2', '#a5f3fc'],
  ['#65a30d', '#bef264'], ['#7c3aed', '#22d3ee'], ['#b45309', '#fde68a'],
];

/**
 * @param {{slug:string, t:string, genres:string[]}} game
 * @param {string[]} genreIcons иконки жанров (эмодзи)
 */
export function coverDataUri(game, emoji = '🎮') {
  const key = `${game.slug}|${emoji}`;
  if (cache.has(key)) return cache.get(key);

  const h = hash(game.slug);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const angle = (h % 60) + 15;
  const cx = 30 + (h % 40);
  const cy = 20 + (h % 30);
  const r = 18 + ((h >> 3) % 14);
  const rot = (h >> 5) % 360;
  const opacity = 0.16 + ((h >> 7) % 10) / 100;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640" width="480" height="640" role="img" aria-label="${escapeAttr(game.t)}">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${angle})">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${cx}%" cy="${cy}%" r="60%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(${rot})">
      <circle cx="3" cy="3" r="2" fill="#ffffff" opacity="${opacity}"/>
    </pattern>
  </defs>
  <rect width="480" height="640" fill="url(#g)"/>
  <rect width="480" height="640" fill="url(#glow)"/>
  <rect width="480" height="640" fill="url(#dots)"/>
  <g opacity="0.22" fill="#ffffff">
    <circle cx="${40 + (h % 400)}" cy="${360 + (h % 200)}" r="${r * 3}"/>
    <rect x="${-60 + (h % 300)}" y="${280 + ((h >> 4) % 220)}" width="${r * 5}" height="${r * 5}" rx="28" transform="rotate(${rot / 3} 200 400)"/>
  </g>
  <text x="240" y="330" font-size="150" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="40" y="590" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="30" font-weight="700" fill="#ffffff" opacity="0.92">${escapeText(game.t.slice(0, 22))}</text>
</svg>`;

  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  cache.set(key, uri);
  return uri;
}

const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s) => escapeText(s).replace(/"/g, '&quot;');

/** Небольшой цветной «бейдж» для плашек-тегов (стабильный цвет по id) */
export function tagColor(id) {
  const h = hash(id) % 360;
  return {
    bg: `hsl(${h} 82% 95%)`,
    fg: `hsl(${h} 62% 32%)`,
    solid: `hsl(${h} 72% 52%)`,
  };
}
