/**
 * Официальные страницы магазинов для игр, которых нет в Steam.
 * Заполняется только проверенными адресами: tools/check-store-links.mjs открывает
 * каждую ссылку, сверяет заголовок страницы с названием игры, а затем
 * tools/pull-store-links.mjs --apply переносит сюда подтверждённое.
 * Обновлено: 2026-09-26 · ссылок: 34
 */
export const STORE_LINKS = {
  "alan-wake-2": { url: "https://www.alanwake.com/", label: "game.storeOfficial" },
  "alan-wake-remastered": { url: "https://www.alanwake.com/", label: "game.storeOfficial" },
  "animal-crossing-new-horizons": { url: "https://www.nintendo.com/us/store/products/animal-crossing-new-horizons-switch/", label: "game.storeNintendo" },
  "arknights": { url: "https://arknights.global/", label: "game.storeOfficial" },
  "bloodborne": { url: "https://www.playstation.com/en-us/games/bloodborne/", label: "game.storePlaystation" },
  "brawl-stars": { url: "https://supercell.com/en/games/brawlstars/", label: "game.storeOfficial" },
  "call-of-duty-mobile": { url: "https://www.callofduty.com/mobile", label: "game.storeOfficial" },
  "castlevania-symphony-of-the-night": { url: "https://www.konami.com/games/castlevania/us/en-us/page/history_2020_son", label: "game.storeOfficial" },
  "clash-of-clans": { url: "https://supercell.com/en/games/clashofclans/", label: "game.storeOfficial" },
  "clash-royale": { url: "https://supercell.com/en/games/clashroyale/", label: "game.storeOfficial" },
  "fire-emblem-three-houses": { url: "https://www.nintendo.com/us/store/products/fire-emblem-three-houses-switch/", label: "game.storeNintendo" },
  "fortnite": { url: "https://www.xbox.com/en-US/games/store/fortnite/bt5p2x999vh2", label: "game.storeXbox" },
  "free-fire": { url: "https://ff.garena.com/", label: "game.storeOfficial" },
  "genshin-impact": { url: "https://genshin.hoyoverse.com/", label: "game.storeOfficial" },
  "gran-turismo-7": { url: "https://www.gran-turismo.com/us/products/gt7/", label: "game.storeOfficial" },
  "honkai-star-rail": { url: "https://hsr.hoyoverse.com/", label: "game.storeOfficial" },
  "league-of-legends": { url: "https://www.leagueoflegends.com/", label: "game.storeOfficial" },
  "mario-kart-8-deluxe": { url: "https://www.nintendo.com/us/store/products/mario-kart-8-deluxe-switch/", label: "game.storeNintendo" },
  "metroid-dread": { url: "https://www.nintendo.com/us/store/products/metroid-dread-switch/", label: "game.storeNintendo" },
  "minecraft": { url: "https://www.minecraft.net/", label: "game.storeOfficial" },
  "mobile-legends-bang-bang": { url: "https://m.mobilelegends.com/", label: "game.storeOfficial" },
  "monopoly-go": { url: "https://www.monopolygo.com/", label: "game.storeOfficial" },
  "pok-mon-tcg-pocket": { url: "https://apps.apple.com/us/app/pok%C3%A9mon-tcg-pocket/id6479970832", label: "game.storeAppStore" },
  "project-sekai-colorful-stage": { url: "https://www.colorfulstage.com/", label: "game.storeOfficial" },
  "pubg-mobile": { url: "https://apps.apple.com/us/app/pubg-mobile/id1330123889", label: "game.storeAppStore" },
  "roblox": { url: "https://www.roblox.com/", label: "game.storeOfficial" },
  "starcraft-ii": { url: "https://starcraft2.blizzard.com/", label: "game.storeBattleNet" },
  "super-mario-party-jamboree": { url: "https://www.nintendo.com/us/store/products/super-mario-party-jamboree-switch/", label: "game.storeNintendo" },
  "super-smash-bros-ultimate": { url: "https://www.nintendo.com/us/store/products/super-smash-bros-ultimate-switch/", label: "game.storeNintendo" },
  "valorant": { url: "https://playvalorant.com/", label: "game.storeOfficial" },
  "warcraft-iii-reforged": { url: "https://warcraft3.blizzard.com/", label: "game.storeBattleNet" },
  "whiteout-survival": { url: "https://apps.apple.com/us/app/whiteout-survival/id6443575749", label: "game.storeAppStore" },
  "world-of-warcraft": { url: "https://worldofwarcraft.blizzard.com/", label: "game.storeBattleNet" },
  "xenoblade-chronicles-3": { url: "https://www.nintendo.com/us/store/products/xenoblade-chronicles-3-switch/", label: "game.storeNintendo" },
};
