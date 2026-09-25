// Runtime fallback for official Steam artwork when the catalog mapping is not bundled yet.
// It asks Steam Store Search for the exact title, then uses Steam's CDN image.
const cache = new Map();
const key = (title) => `gustoplay-steam-cover:${title}`;

export async function hydrateSteamCovers(root = document) {
  const images = [...root.querySelectorAll('img[data-steam-title]')]
    .filter((img) => !img.dataset.steamLoaded);
  for (const img of images) {
    const title = img.dataset.steamTitle;
    img.dataset.steamLoaded = '1';
    try {
      const saved = localStorage.getItem(key(title));
      const cover = saved || await findCover(title);
      if (cover && img.isConnected) img.src = cover;
    } catch { /* generated SVG remains a reliable offline fallback */ }
  }
}

async function findCover(title) {
  if (cache.has(title)) return cache.get(title);
  const response = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=us`);
  if (!response.ok) return '';
  const data = await response.json();
  const exact = (data.items || []).find((item) => item.type === 'app' && item.name.trim().toLowerCase() === title.trim().toLowerCase());
  if (!exact?.id) return '';
  const cover = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${exact.id}/library_600x900_2x.jpg`;
  cache.set(title, cover);
  try { localStorage.setItem(key(title), cover); } catch {}
  return cover;
}
