#!/usr/bin/env node
/**
 * Offline inventory for launch readiness. This reports catalog fields only; it does
 * not claim that external cover/store URLs are reachable (use check:covers/check:stores
 * from a network-enabled runner for that).
 */
import { GAMES } from '../js/catalog/index.js';

const missing = (value) => !String(value ?? '').trim();
const missingRuEn = (value) => missing(value?.ru) || missing(value?.en);
const noCover = GAMES.filter((game) => missing(game.cover));
const noDescription = GAMES.filter((game) => missingRuEn(game.desc));
const noAbout = GAMES.filter((game) => missingRuEn(game.about));
const noFeatures = GAMES.filter((game) => !['ru', 'en'].every((lang) => game.feats?.[lang]?.length));
const noSteamId = GAMES.filter((game) => !game.steamId);
const noStore = GAMES.filter((game) => !game.links?.steam && !game.links?.official);
const steamGames = GAMES.filter((game) => game.steamId);
const noRequirements = steamGames.filter((game) => !game.sysreq);

const list = (games) => games.length ? games.map((game) => game.slug).join(', ') : '—';
console.log(`Каталог: ${GAMES.length} игр`);
console.log(`Steam ID: ${steamGames.length}/${GAMES.length}; без Steam ID: ${noSteamId.length}`);
console.log(`Обложка в данных: ${GAMES.length - noCover.length}/${GAMES.length}; нет: ${list(noCover)}`);
console.log(`Короткое описание RU+EN: ${GAMES.length - noDescription.length}/${GAMES.length}; нет: ${list(noDescription)}`);
console.log(`Полное описание RU+EN: ${GAMES.length - noAbout.length}/${GAMES.length}; нет: ${list(noAbout)}`);
console.log(`Особенности RU+EN: ${GAMES.length - noFeatures.length}/${GAMES.length}; нет: ${list(noFeatures)}`);
console.log(`Ссылка в магазин: ${GAMES.length - noStore.length}/${GAMES.length}; нет: ${list(noStore)}`);
console.log(`Требования к ПК: ${steamGames.length - noRequirements.length}/${steamGames.length} игр со Steam ID; нет: ${list(noRequirements)}`);
console.log(`Игры без Steam ID: ${list(noSteamId)}`);

if (noCover.length || noDescription.length || noAbout.length || noFeatures.length) {
  console.error('❌ В обязательных данных каталога есть пробелы.');
  process.exitCode = 1;
} else {
  console.log('✅ Все обязательные поля каталога заполнены; доступность внешних URL этим скриптом не проверяется.');
}
