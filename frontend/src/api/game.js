import request from "../utils/request";

// 玩家相关
export const createPlayer = (name) => {
  return request.post("/game/player", { name });
};

export const getPlayerInfo = (playerId) => {
  return request.get(`/game/player/${playerId}`);
};

// 探索模块
export const explore = (playerId, playerLevel) => {
  return request.post("/game/explore", { playerId, playerLevel });
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

// 地图系统
export const getAllMaps = () => {
  return request.get("/game/maps");
};

export const getPlayerMapsStatus = (playerId) => {
  return request.get(`/game/maps/${playerId}`);
};

export const unlockMap = (playerId, mapId) => {
  return request.post("/game/maps/unlock", { playerId, mapId });
};

export const switchMap = (playerId, mapId) => {
  return request.post("/game/maps/switch", { playerId, mapId });
};

// 经验值系统
export const getExpTable = (minLevel = 1, maxLevel = 100) => {
  return request.get(`/game/exp-table?minLevel=${minLevel}&maxLevel=${maxLevel}`);
};

export const getExpForLevel = (level) => {
  return request.get(`/game/exp-for-level/${level}`);
};

export const getLevelFromExp = (exp) => {
  return request.get(`/game/level-from-exp/${exp}`);
};

// 宝可梦进化系统
export const checkPokemonEvolution = (partyId) => {
  return request.get(`/game/evolution/check/${partyId}`);
};

export const evolvePokemon = (partyId, playerId) => {
  return request.post(`/game/evolution/evolve/${partyId}`, { playerId });
};
