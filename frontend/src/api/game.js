import request from "../utils/request";

// 玩家相关
export const createPlayer = (name) => {
  return request.post("/game/player", { name });
};

export const getPlayerInfo = (playerId) => {
  return request.get(`/game/player/${playerId}`);
};

// 探索模块
export const explore = (playerLevel) => {
  return request.post("/game/explore", { playerLevel });
};

export const selectStarter = (playerId, pokemon) => {
	return request.post("/game/select-starter", { playerId, pokemon });
};

export const catchPokemon = (playerId, pokemon, pokeballTypeId, playerPokemonId) => {
	return request.post("/game/catch", { playerId, pokemon, pokeballTypeId, playerPokemonId });
};

// 战斗模块
export const attack = (playerPokemon, enemyPokemon, isGym = false, attackType = "random") => {
  return request.post("/game/attack", { playerPokemon, enemyPokemon, isGym, attackType });
};

// 道馆模块
export const getGyms = () => {
  return request.get("/game/gyms");
};

export const challengeGym = (gymId) => {
  return request.get(`/game/gym/${gymId}`);
};

export const earnBadge = (playerId, gymId) => {
  return request.post("/game/badge", { playerId, gymId });
};

// 商店模块
export const getShopItems = () => {
  return request.get("/game/shop");
};

export const buyItem = (playerId, pokeballTypeId, quantity) => {
  return request.post("/game/shop/buy", { playerId, pokeballTypeId, quantity });
};

// 背包和仓库
export const getParty = (playerId) => {
  return request.get(`/game/party/${playerId}`);
};

export const getStorage = (playerId) => {
  return request.get(`/game/storage/${playerId}`);
};

// 切换主战精灵
export const switchMainPokemon = (playerId, storagePokemonId) => {
  return request.post("/game/switch-main", { playerId, storagePokemonId });
};

// 数据迁移
export const migratePartyData = (playerId) => {
  return request.post("/game/migrate", { playerId });
};