import express from "express";
import * as gameController from "../controllers/gameController.js";

const router = express.Router();

// 玩家相关 - 注册登录
router.post("/game/register", gameController.registerPlayer);
router.post("/game/login", gameController.loginPlayer);
router.post("/game/player", gameController.createPlayer);
router.get("/game/player/:playerId", gameController.getPlayerInfo);

// 探索模块
router.get("/game/explore", gameController.explore);
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

export default router;