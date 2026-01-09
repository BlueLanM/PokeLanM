/**
 * Growth Rate Service
 * 使用 PokeAPI 的 growth-rate 接口来计算经验值升级逻辑
 * 默认使用 growth-rate/2 (medium 增长率)
 */

// 缓存增长率数据，避免重复请求API
let growthRateCache = null;
let lastFetchTime = null;
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24小时缓存

/**
 * 从 PokeAPI 获取增长率数据
 * @param {number} growthRateId - 增长率ID，默认为2 (medium)
 * @returns {Promise<Object>} 增长率数据
 */
export const fetchGrowthRateData = async(growthRateId = 2) => {
	try {
		// 检查缓存是否有效
		if (growthRateCache && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
			return growthRateCache;
		}

		const fetch = (await import("node-fetch")).default;
		const response = await fetch(`https://pokeapi.co/api/v2/growth-rate/${growthRateId}/`);

		if (!response.ok) {
			throw new Error(`获取增长率失败: ${response.statusText}`);
		}

		const data = await response.json();

		// 更新缓存
		growthRateCache = data;
		lastFetchTime = Date.now();

		return data;
	} catch (error) {
		console.error("获取 PokeAPI 增长率数据失败:", error.message);
		// 如果有缓存，返回缓存数据
		if (growthRateCache) {
			return growthRateCache;
		}
		throw error;
	}
};

/**
 * 根据等级获取升到该等级所需的总经验值
 * @param {number} level - 目标等级
 * @returns {Promise<number>} 所需的总经验值
 */
export const getExpForLevel = async(level) => {
	try {
		const growthData = await fetchGrowthRateData();

		// 在 levels 数组中查找对应等级的数据
		const levelData = growthData.levels.find(l => l.level === level);

		if (levelData) {
			return levelData.experience;
		}

		// 如果找不到，返回回退值
		console.warn(`未找到等级 ${level} 的经验值数据，使用回退计算`);
		return getExpForLevelFallback(level);
	} catch (error) {
		console.error("获取等级经验值失败，使用回退计算:", error.message);
		return getExpForLevelFallback(level);
	}
};

/**
 * 回退的经验值计算方法（当API调用失败时使用）
 * 使用原有的计算公式
 * @param {number} level - 等级
 * @returns {number} 所需经验值
 */
const getExpForLevelFallback = (level) => {
	if (level <= 1) return 0;
	const baseExp = 100;
	const linearGrowth = (level - 1) * 15;
	const quadraticGrowth = Math.pow(level - 1, 2) * 2;
	return Math.floor(baseExp + linearGrowth + quadraticGrowth);
};

/**
 * 根据当前总经验值计算等级
 * @param {number} totalExp - 当前总经验值
 * @param {number} maxLevel - 最大等级（默认100）
 * @returns {Promise<Object>} { level: 等级, expForCurrentLevel: 当前等级所需经验, expForNextLevel: 下一级所需经验 }
 */
export const getLevelFromExp = async(totalExp, maxLevel = 100) => {
	try {
		const growthData = await fetchGrowthRateData();

		// 从高到低查找当前等级
		let currentLevel = 1;
		let expForCurrentLevel = 0;
		let expForNextLevel = 0;

		for (let i = maxLevel; i >= 1; i--) {
			const levelData = growthData.levels.find(l => l.level === i);
			if (levelData && totalExp >= levelData.experience) {
				currentLevel = i;
				expForCurrentLevel = levelData.experience;

				// 获取下一级所需经验
				if (i < maxLevel) {
					const nextLevelData = growthData.levels.find(l => l.level === i + 1);
					expForNextLevel = nextLevelData ? nextLevelData.experience : expForCurrentLevel;
				}
				break;
			}
		}

		return {
			expForCurrentLevel,
			expForNextLevel: currentLevel < maxLevel ? expForNextLevel : expForCurrentLevel,
			level: currentLevel
		};
	} catch (error) {
		console.error("从经验值计算等级失败:", error.message);
		// 回退到简单计算
		return {
			expForCurrentLevel: 0,
			expForNextLevel: 100,
			level: 1
		};
	}
};

/**
 * 计算升级后的属性增长
 * @param {number} levelsGained - 升了多少级
 * @param {number} newLevel - 新等级
 * @returns {Object} 属性增长 { hpGained, attackGained }
 */
export const calculateStatGrowth = (levelsGained, newLevel) => {
	let totalHpGained = 0;
	let totalAttackGained = 0;

	for (let i = 0; i < levelsGained; i++) {
		const level = newLevel - levelsGained + i + 1;

		// HP增长: 基础 4-8，每10级额外+1（最高+14）
		const hpBonus = Math.floor(level / 10);
		const hpGain = Math.floor(Math.random() * 5) + 4 + hpBonus; // 4-8 + 等级加成
		totalHpGained += hpGain;

		// 攻击力增长: 基础 2-4，每15级额外+1（最高+10）
		const attackBonus = Math.floor(level / 15);
		const attackGain = Math.floor(Math.random() * 3) + 2 + attackBonus; // 2-4 + 等级加成
		totalAttackGained += attackGain;
	}

	return {
		attackGained: totalAttackGained,
		hpGained: totalHpGained
	};
};

/**
 * 获取等级范围的经验值表
 * @param {number} minLevel - 最小等级
 * @param {number} maxLevel - 最大等级
 * @returns {Promise<Array>} 经验值表
 */
export const getExpTable = async(minLevel = 1, maxLevel = 100) => {
	try {
		const growthData = await fetchGrowthRateData();

		return growthData.levels
			.filter(l => l.level >= minLevel && l.level <= maxLevel)
			.map(l => ({
				experience: l.experience,
				level: l.level
			}));
	} catch (error) {
		console.error("获取经验值表失败:", error.message);
		return [];
	}
};

/**
 * 预加载增长率数据（在服务器启动时调用）
 */
export const preloadGrowthRateData = async() => {
	try {
		await fetchGrowthRateData();
	} catch (error) {
		console.warn("增长率数据预加载失败，将在使用时重试:", error.message);
	}
};