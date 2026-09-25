/**
 * Генератор обложек. Официальные постеры не используем (авторские права),
 * вместо этого рисуем детерминированную «премиальную» обложку: глубокий
 * градиент + свечение + крупный полупрозрачный глиф жанра + типографика.
 * У одной игры всегда одна и та же обложка — узнаваемость каталога.
 *
 * Хотите настоящие арты? Положите файлы в /covers/<slug>.jpg — карточки
 * подхватят их автоматически (см. js/views/components.js → coverImage()).
 */
import { ICONS } from './icons.js';
import { GENRES } from './taxonomy.js';

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

/** Глубокие насыщенные дуэты: тёмная база → живой акцент */
const PALETTES = [
  ['#1e1b4b', '#6d28d9'], ['#0c4a6e', '#0ea5e9'], ['#7c2d12', '#f97316'],
  ['#064e3b', '#10b981'], ['#7f1d1d', '#ef4444'], ['#4a044e', '#d946ef'],
  ['#0f172a', '#64748b'], ['#831843', '#ec4899'], ['#164e63', '#22d3ee'],
  ['#3f6212', '#84cc16'], ['#581c87', '#8b5cf6'], ['#78350f', '#f59e0b'],
];

export function coverDataUri(game) {
  const key = game.slug;
  if (cache.has(key)) return cache.get(key);

  const h = hash(game.slug);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const angle = 120 + (h % 90);
  const gx = 25 + (h % 50);
  const gy = 15 + (h % 25);
  const rot = (h >> 5) % 360;
  const glyph = ICONS[GENRES[game.genres[0]]?.icon] || ICONS.controller;
  const title = escapeText(game.t.length > 26 ? `${game.t.slice(0, 25)}…` : game.t);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640" width="480" height="640" role="img" aria-label="${escapeAttr(game.t)}">
  <defs>
    <linearGradient id="bg" gradientTransform="rotate(${angle} 240 320)">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${gx}%" cy="${gy}%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.62"/>
    </linearGradient>
    <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(${rot})">
      <circle cx="3" cy="3" r="1.6" fill="#ffffff" opacity="0.14"/>
    </pattern>
  </defs>
  <rect width="480" height="640" fill="url(#bg)"/>
  <rect width="480" height="640" fill="url(#glow)"/>
  <rect width="480" height="640" fill="url(#dots)"/>
  <g transform="translate(240 265) scale(8.5) translate(-12 -12)" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.2">${glyph}</g>
  <rect width="480" height="640" fill="url(#scrim)"/>
  <text x="36" y="600" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="21" font-weight="600" letter-spacing="3" fill="#ffffff" opacity="0.78">${game.y} · ${escapeText(game.dev.toUpperCase().slice(0, 24))}</text>
  <text x="32" y="560" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="37" font-weight="800" fill="#ffffff">${title}</text>
</svg>`;

  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  cache.set(key, uri);
  return uri;
}

const escapeText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
