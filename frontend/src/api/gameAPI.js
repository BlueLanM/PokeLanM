import request from '../utils/request';

// ========== 认证相关 ==========

// 注册玩家
export const registerPlayer = (name, password) => {
	return request({
		url: '/game/register',
		method: 'POST',
		data: { name, password }
	});
};

// 登录
export const loginPlayer = (name, password) => {
	return request({
		url: '/game/login',
		method: 'POST',
		data: { name, password }
	});
};

// ========== 玩家相关 ==========

// 创建玩家（旧版本兼容）
export const createPlayer = (name) => {
	return request({
		url: '/game/player',
		method: 'POST',
		data: { name }
	});
};

// 获取玩家信息
export const getPlayerInfo = (playerId) => {
	return request({
		url: `/game/player/${playerId}`,
		method: 'GET'
	});
};

// ========== 探索模块 ==========

// 探索 - 遇到随机宝可梦
export const explore = () => {
	return request({
		url: '/game/explore',
		method: 'GET'
	});
};

// 捕捉宝可梦
export const catchPokemon = (playerId, pokemon, pokeballTypeId, playerPokemonId) => {
	return request({
		url: '/game/catch',
		method: 'POST',
		data: { playerId, pokemon, pokeballTypeId, playerPokemonId }
	});
};

// ========== 战斗模块 ==========

// 攻击
export const attack = (playerPokemon, enemyPokemon, isGym = false) => {
	return request({
		url: '/game/attack',
		method: 'POST',
		data: { playerPokemon, enemyPokemon, isGym }
	});
};

// ========== 道馆模块 ==========

// 获取所有道馆
export const getGyms = () => {
	return request({
		url: '/game/gyms',
		method: 'GET'
	});
};

// 挑战道馆
export const challengeGym = (gymId) => {
	return request({
		url: `/game/gym/${gymId}`,
		method: 'GET'
	});
};

// 获得徽章
export const earnBadge = (playerId, gymId) => {
	return request({
		url: '/game/badge',
		method: 'POST',
		data: { playerId, gymId }
	});
};

// ========== 商店模块 ==========

// 获取商店商品
export const getShopItems = () => {
	return request({
		url: '/game/shop',
		method: 'GET'
	});
};

// 购买物品
export const buyItem = (playerId, pokeballTypeId, quantity) => {
	return request({
		url: '/game/shop/buy',
		method: 'POST',
		data: { playerId, pokeballTypeId, quantity }
	});
};

// ========== 背包和仓库 ==========

// 获取背包
export const getParty = (playerId) => {
	return request({
		url: `/game/party/${playerId}`,
		method: 'GET'
	});
};

// 获取仓库
export const getStorage = (playerId) => {
	return request({
		url: `/game/storage/${playerId}`,
		method: 'GET'
	});
};

// 切换主战精灵
export const switchMainPokemon = (playerId, storagePokemonId) => {
	return request({
		url: '/game/switch-main',
		method: 'POST',
		data: { playerId, storagePokemonId }
	});
};

// ========== 数据迁移 ==========

// 数据迁移：将多余的背包精灵移到仓库
export const migratePartyData = (playerId) => {
	return request({
		url: '/game/migrate',
		method: 'POST',
		data: { playerId }
	});
};

// ========== 排行榜 ==========

// 获取排行榜
export const getLeaderboard = () => {
	return request({
		url: '/game/leaderboard',
		method: 'GET'
	});
};

// ========== 图鉴系统 ==========

// 获取玩家图鉴
export const getPokedex = (playerId) => {
	return request({
		url: `/game/pokedex/${playerId}`,
		method: 'GET'
	});
};

// 获取图鉴统计
export const getPokedexStats = (playerId) => {
	return request({
		url: `/game/pokedex-stats/${playerId}`,
		method: 'GET'
	});
};

// 获取特殊徽章
export const getSpecialBadges = (playerId) => {
	return request({
		url: `/game/special-badges/${playerId}`,
		method: 'GET'
	});
};

