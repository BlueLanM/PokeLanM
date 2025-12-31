import express from "express";
import * as gameController from "../controllers/gameController.js";

const router = express.Router();

// 玩家相关 - 注册登录
router.post("/game/register", gameController.registerPlayer);
router.post("/game/login", gameController.loginPlayer);
router.post("/game/player", gameController.createPlayer);
router.get("/game/player/:playerId", gameController.getPlayerInfo);

// 探索模块
router.post("/game/explore", gameController.explore);
router.post("/game/select-starter", gameController.selectStarter); // 选择初始宝可梦
router.post("/game/catch", gameController.catchPokemon);

// 战斗模块
router.post("/game/attack", gameController.attack);

// 道馆模块
router.get("/game/gyms", gameController.getGyms);
router.get("/game/gym/:gymId", gameController.challengeGym);
router.post("/game/badge", gameController.earnBadge);

// 商店模块
router.get("/game/shop", gameController.getShopItems);
router.post("/game/shop/buy", gameController.buyItem);

// 背包和仓库
router.get("/game/party/:playerId", gameController.getParty);
router.get("/game/storage/:playerId", gameController.getStorage);
router.post("/game/switch-main", gameController.switchMainPokemon);

// 数据迁移
router.post("/game/migrate", gameController.migratePartyData);

// 排行榜
router.get("/game/leaderboard", gameController.getLeaderboard);

// 图鉴系统
router.get("/game/pokedex/:playerId", gameController.getPokedex);
router.get("/game/pokedex-stats/:playerId", gameController.getPokedexStats);
router.get("/game/special-badges/:playerId", gameController.getSpecialBadges);

// 管理员功能
router.post("/game/admin/set-money", gameController.adminSetPlayerMoney);
router.delete("/game/admin/player/:id", gameController.adminDeletePlayer);

// 管理员 - 商店物品管理
router.get("/game/admin/pokeballs", gameController.adminGetPokeballTypes);
router.get("/game/admin/pokeball/:id", gameController.adminGetPokeballType);
router.post("/game/admin/pokeball", gameController.adminAddPokeballType);
router.put("/game/admin/pokeball/:id", gameController.adminUpdatePokeballType);
router.delete("/game/admin/pokeball/:id", gameController.adminDeletePokeballType);

// 管理员 - 道馆管理
router.get("/game/admin/gyms", gameController.adminGetGyms);
router.get("/game/admin/gym/:id", gameController.adminGetGym);
router.post("/game/admin/gym", gameController.adminAddGym);
router.put("/game/admin/gym/:id", gameController.adminUpdateGym);
router.delete("/game/admin/gym/:id", gameController.adminDeleteGym);
router.get("/game/admin/gyms/export", gameController.exportGyms); // 导出道馆数据
router.post("/game/admin/gyms/import", gameController.importGyms); // 导入道馆数据

// 地图系统
router.get("/game/maps", gameController.getAllMaps);
router.get("/game/maps/:playerId", gameController.getPlayerMapsStatus);
router.post("/game/maps/unlock", gameController.unlockMap);
router.post("/game/maps/switch", gameController.switchMap);

// 管理员 - 地图管理
router.get("/game/admin/maps", gameController.getAllMaps);
router.get("/game/admin/map/:id", gameController.adminGetMap);
router.post("/game/admin/map", gameController.adminAddMap);
router.put("/game/admin/map/:id", gameController.adminUpdateMap);
router.delete("/game/admin/map/:id", gameController.adminDeleteMap);

// 经验值增长率系统
router.get("/game/exp-table", gameController.getExpTable);
router.get("/game/exp-for-level/:level", gameController.getExpForLevel);
router.get("/game/level-from-exp/:exp", gameController.getLevelFromExp);

// 宝可梦进化系统
router.get("/game/evolution/check/:partyId", gameController.checkPokemonEvolution);
router.post("/game/evolution/evolve/:partyId", gameController.evolvePokemon);

export default router;