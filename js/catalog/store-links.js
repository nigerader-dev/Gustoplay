/**
 * Официальные страницы магазинов для игр, которых нет в Steam.
 * Заполняется только проверенными адресами: tools/check-store-links.mjs открывает
 * каждую ссылку, сверяет заголовок страницы с названием игры, а затем
 * tools/pull-store-links.mjs --apply переносит сюда подтверждённое.
 * Обновлено: 2026-09-26 · ссылок: 19
 */
export const STORE_LINKS = {
  "alan-wake-2": { url: "https://www.alanwake.com/", label: "game.storeOfficial" },
  "alan-wake-remastered": { url: "https://www.alanwake.com/", label: "game.storeOfficial" },
  "arknights": { url: "https://arknights.global/", label: "game.storeOfficial" },
  "bloodborne": { url: "https://www.playstation.com/en-us/games/bloodborne/", label: "game.storePlaystation" },
  "brawl-stars": { url: "https://supercell.com/en/games/brawlstars/", label: "game.storeOfficial" },
  "call-of-duty-mobile": { url: "https://www.callofduty.com/mobile", label: "game.storeOfficial" },
  "clash-of-clans": { url: "https://supercell.com/en/games/clashofclans/", label: "game.storeOfficial" },
  "clash-royale": { url: "https://supercell.com/en/games/clashroyale/", label: "game.storeOfficial" },
  "gran-turismo-7": { url: "https://www.gran-turismo.com/us/products/gt7/", label: "game.storeOfficial" },
  "league-of-legends": { url: "https://www.leagueoflegends.com/", label: "game.storeOfficial" },
  "mobile-legends-bang-bang": { url: "https://m.mobilelegends.com/", label: "game.storeOfficial" },
  "monopoly-go": { url: "https://www.monopolygo.com/", label: "game.storeOfficial" },
  "project-sekai-colorful-stage": { url: "https://www.colorfulstage.com/", label: "game.storeOfficial" },
  "roblox": { url: "https://www.roblox.com/", label: "game.storeOfficial" },
  "starcraft-ii": { url: "https://starcraft2.blizzard.com/", label: "game.storeBattleNet" },
  "valorant": { url: "https://playvalorant.com/", label: "game.storeOfficial" },
  "warcraft-iii-reforged": { url: "https://warcraft3.blizzard.com/", label: "game.storeBattleNet" },
  "world-of-warcraft": { url: "https://worldofwarcraft.blizzard.com/", label: "game.storeBattleNet" },
  "xenoblade-chronicles-3": { url: "https://www.nintendo.com/us/store/products/xenoblade-chronicles-3-switch/", label: "game.storeNintendo" },
};
