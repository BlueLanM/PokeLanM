import * as GameModel from "../models/gameModel.js";
import * as GrowthRateService from "../services/growthRateService.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 pokemon.json
let pokemonData = [];
try {
	const pokemonJsonPath = join(__dirname, "../pokedex-main/pokemon.json");
	const data = readFileSync(pokemonJsonPath, "utf-8");
	pokemonData = JSON.parse(data);
} catch (error) {
	console.error("加载 pokemon.json 失败:", error);
}

// 注册玩家
export const registerPlayer = async(req, res) => {
	try {
		const { name, password } = req.body;
		if (!name || !password) {
			return res.status(400).json({ error: "用户名和密码不能为空" });
		}

		if (password.length < 4) {
			return res.status(400).json({ error: "密码长度至少4位" });
		}

		const playerId = await GameModel.registerPlayer(name, password);
		const player = await GameModel.getPlayer(playerId);

		// 不返回密码
		delete player.password;

		res.json({
			message: "注册成功",
			player,
			success: true
		});
	} catch (error) {
		if (error.code === "ER_DUP_ENTRY") {
			return res.status(400).json({ error: "用户名已存在" });
		}
		res.status(500).json({ error: error.message });
	}
};

// 登录
export const loginPlayer = async(req, res) => {
	try {
		const { name, password } = req.body;
		if (!name || !password) {
			return res.status(400).json({ error: "用户名和密码不能为空" });
		}

		const player = await GameModel.loginPlayer(name, password);

		if (!player) {
			return res.status(401).json({ error: "用户名或密码错误" });
		}

		// 不返回密码
		delete player.password;

		res.json({
			message: "登录成功",
			player,
			success: true
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 创建玩家（旧版本兼容）
export const createPlayer = async(req, res) => {
	try {
		const { name } = req.body;
		if (!name) {
			return res.status(400).json({ error: "玩家名称不能为空" });
		}

		const playerId = await GameModel.createPlayer(name);
		const player = await GameModel.getPlayer(playerId);

		res.json({
			message: "玩家创建成功",
			player,
			success: true
		});
	} catch (error) {
		if (error.code === "ER_DUP_ENTRY") {
			return res.status(400).json({ error: "玩家名称已存在" });
		}
		res.status(500).json({ error: error.message });
	}
};

// 获取玩家信息
export const getPlayerInfo = async(req, res) => {
	try {
		const { playerId } = req.params;
		const player = await GameModel.getPlayer(playerId);

		if (!player) {
			return res.status(404).json({ error: "玩家不存在" });
		}

		const party = await GameModel.getPlayerParty(playerId);
		const items = await GameModel.getPlayerItems(playerId);
		const badges = await GameModel.getPlayerBadges(playerId);

		res.json({
			badges,
			items,
			party,
			player
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 探索 - 遇到随机宝可梦（根据当前地图）
export const explore = async(req, res) => {
	try {
		if (pokemonData.length === 0) {
			return res.status(500).json({ error: "宝可梦数据未加载" });
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { playerId, playerLevel } = req.body; // 接收玩家ID和宝可梦等级

		// 获取玩家当前地图
		const player = await GameModel.getPlayer(playerId);
		const currentMapId = player?.current_map_id || 1;
		const currentMap = await GameModel.getMap(currentMapId);

		if (!currentMap) {
			return res.status(500).json({ error: "地图不存在" });
		}

		// 随机选择一只宝可梦（全部世代）
		const randomIndex = Math.floor(Math.random() * pokemonData.length);
		const pokemonInfo = pokemonData[randomIndex];

		// 根据地图等级范围生成野生宝可梦等级
		const minLevel = currentMap.min_level;
		const maxLevel = currentMap.max_level;
		const wildLevel = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;

		// 基于等级计算血量和攻击力
		const baseHp = 25;
		const hpPerLevel = 3;
		const maxHp = baseHp + (wildLevel * hpPerLevel) + Math.floor(Math.random() * 15);

		const baseAttack = 3;
		const attackPerLevel = 1.5;
		const attack = Math.floor(baseAttack + (wildLevel * attackPerLevel) + Math.random() * 3);

		const pokemon = {
			attack,
			catchRate: pokemonInfo.catchRate || "5.9%",
			hp: maxHp,
			id: pokemonInfo.id,
			level: wildLevel,
			max_hp: maxHp,
			name: pokemonInfo.name,
			name_en: pokemonInfo.name_en,
			sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemonInfo.id}.gif`,
			sprite_pixel: `https://raw.githubusercontent.com/NightCatSama/pokedex/main/images/pixel/${pokemonInfo.id}.png`,
			type1: pokemonInfo.type1,
			type2: pokemonInfo.type2
		};

		res.json({
			currentMap: {
				id: currentMap.id,
				name: currentMap.name
			},
			message: `在 ${currentMap.name} 遇到了野生的 ${pokemon.name}！(Lv.${wildLevel})`,
			pokemon,
			success: true
		});
	} catch (error) {
		res.status(500).json({ error: "探索失败: " + error.message });
	}
};

// 选择初始宝可梦（100%成功，不消耗精灵球）
export const selectStarter = async(req, res) => {
	try {
		const { playerId, pokemon } = req.body;

		// 检查玩家是否已经有宝可梦（防止重复选择）
		const party = await GameModel.getPlayerParty(playerId);
		if (party.length > 0) {
			return res.status(400).json({
				error: "你已经选择过初始宝可梦了！",
				success: false
			});
		}

		// 直接加入背包，100%成功
		const partyId = await GameModel.addToParty(playerId, pokemon);

		if (partyId) {
			return res.json({
				caught: true,
				location: "party",
				message: `恭喜！你选择了 ${pokemon.name} 作为初始宝可梦！`,
				success: true
			});
		} else {
			return res.status(500).json({
				error: "选择初始宝可梦失败",
				success: false
			});
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 捕捉宝可梦
export const catchPokemon = async(req, res) => {
	try {
		const { playerId, pokemon, pokeballTypeId, playerPokemonId } = req.body;

		// 检查宝可梦血量是否大于0
		if (pokemon.hp <= 0) {
			return res.json({
				message: "宝可梦已经失去战斗能力，无法捕捉！",
				success: false
			});
		}

		// 检查玩家是否有精灵球
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const hasItem = await GameModel.useItem(playerId, pokeballTypeId);
		if (!hasItem) {
			return res.json({
				message: "你没有足够的精灵球！",
				success: false
			});
		}

		// 获取精灵球捕捉率
		const items = await GameModel.getPlayerItems(playerId);
		const pokeball = items.find(item => item.pokeball_type_id === pokeballTypeId);

		// 计算基于血量的捕捉率加成
		// 从pokemon.json获取该宝可梦的catchRate作为普通球的基础捕捉率
		const pokemonCatchRate = parseFloat(pokemon.catchRate) / 100 || 0.059; // 将"5.9%"转为0.059

		// 根据精灵球类型计算倍率
		// 普通球: 1倍, 超级球: 1.5倍, 高级球: 2倍, 大师球: 100倍
		const ballMultipliers = {
			1: 1.0, // 普通球
			2: 1.5, // 超级球
			3: 2.0, // 高级球
			4: 100.0 // 大师球(必中)
		};
		const ballMultiplier = ballMultipliers[pokeballTypeId] || 1.0;

		// 血量百分比越低,捕捉率越高
		const hpPercentage = pokemon.hp / pokemon.max_hp; // 0.0 到 1.0
		const hpBonus = (1 - hpPercentage) * 0.3; // 血量为0时最多增加30%捕捉率

		// 最终捕捉率 = (宝可梦基础捕捉率 * 精灵球倍率) + 血量加成
		const baseCatchRate = pokemonCatchRate * ballMultiplier;
		// 大师球必中，其他球最高98%捕捉率
		const finalCatchRate = pokeballTypeId === 4 ? 1.0 : Math.min(baseCatchRate + hpBonus, 0.98);

		// 判断是否捕捉成功
		const randomValue = Math.random();
		const caught = randomValue <= finalCatchRate;

		if (caught) {
			// 捕获成功后回复满血
			pokemon.hp = pokemon.max_hp;

			// 尝试加入背包
			const partyId = await GameModel.addToParty(playerId, pokemon);

			// 获取玩家当前地图的奖励倍率
			const player = await GameModel.getPlayer(playerId);
			const currentMapId = player?.current_map_id || 1;
			const currentMap = await GameModel.getMap(currentMapId);
			const rewardMultiplier = currentMap?.reward_multiplier || 1.0;

			// 计算捕捉经验值奖励 (基于野生宝可梦等级和地图倍率)
			let expResult = null;
			if (playerPokemonId) {
				const wildLevel = pokemon.level || 10;
				const baseExp = wildLevel * 5; // 捕捉获得的经验值略少于击败
				const expGained = Math.floor(baseExp * rewardMultiplier);
				expResult = await GameModel.addExpToPokemon(playerPokemonId, expGained);
			}

			// 计算捕捉金币奖励 (基于野生宝可梦等级和地图倍率)
			const wildLevel = pokemon.level || 10;
			const baseMoney = Math.floor(wildLevel * 5 + Math.random() * 20 + 10);
			const catchReward = Math.floor(baseMoney * rewardMultiplier);
			await GameModel.updatePlayerMoney(playerId, catchReward);

			if (partyId) {
				return res.json({
					catchReward,
					caught: true,
					expResult,
					location: "party",
					message: `使用${pokeball.name}成功捕捉 ${pokemon.name}！已加入背包。`,
					pokeball: pokeball.name,
					success: true
				});
			} else {
				// 背包满了，放入仓库
				await GameModel.addToStorage(playerId, pokemon);
				return res.json({
					catchReward,
					caught: true,
					expResult,
					location: "storage",
					message: `使用${pokeball.name}成功捕捉 ${pokemon.name}！背包已满，已放入仓库。`,
					pokeball: pokeball.name,
					success: true
				});
			}
		} else {
			return res.json({
				caught: false,
				message: `${pokemon.name} 挣脱了${pokeball.name}！`,
				pokeball: pokeball.name,
				success: true
			});
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 战斗 - 攻击
export const attack = async(req, res) => {
	try {
		const { playerPokemon, enemyPokemon, isGym, attackType } = req.body;

		// 防止重复结算：如果敌人已经被击败，直接返回
		if (enemyPokemon.hp <= 0) {
			return res.status(400).json({
				error: "战斗已结束",
				success: false
			});
		}

		// 玩家宝可梦攻击
		let playerDamage = 0;
		let attackName = "攻击";

		// 根据攻击类型计算伤害
		if (attackType === "fixed") {
			// 宽恕伤害攻击 - 随机0-9点伤害
			playerDamage = Math.floor(Math.random() * 20); // 0 到 19
			attackName = "宽恕攻击";
		} else {
			// 随机攻击 - 0到最大攻击力之间随机
			playerDamage = Math.floor(Math.random() * (playerPokemon.attack + 1)); // 0 到 attack
			attackName = "攻击";
		}

		enemyPokemon.hp -= playerDamage;

		const playerName = playerPokemon.pokemon_name || playerPokemon.name;
		const enemyName = enemyPokemon.pokemon_name || enemyPokemon.name;

		// 根据伤害值显示不同的战斗日志
		const battleLog = playerDamage === 0
			? [`你的 ${playerName} 使用了【${attackName}】，但攻击未命中！`]
			: [`你的 ${playerName} 使用了【${attackName}】，造成了 ${playerDamage} 点伤害！`];

		if (enemyPokemon.hp <= 0) {
			enemyPokemon.hp = 0;

			// 获取玩家当前地图的奖励倍率（只对野生宝可梦战斗生效）
			const playerId = playerPokemon.player_id;
			let rewardMultiplier = 1.0;

			if (!isGym && playerId) {
				const player = await GameModel.getPlayer(playerId);
				const currentMapId = player?.current_map_id || 1;
				const currentMap = await GameModel.getMap(currentMapId);
				rewardMultiplier = currentMap?.reward_multiplier || 1.0;
			}

			// 计算金币奖励（道馆固定奖励，野生宝可梦受地图倍率影响）
			let reward;
			if (isGym) {
				reward = enemyPokemon.reward_money || 500;
			} else {
				const baseReward = Math.floor(Math.random() * 50) + 50;
				reward = Math.floor(baseReward * rewardMultiplier);
			}

			// 计算经验值奖励（道馆固定，野生宝可梦受地图倍率影响）
			const enemyLevel = enemyPokemon.level || 10;
			let expGained;
			if (isGym) {
				// 道馆使用配置的奖励经验值，如果没有配置则使用默认计算
				expGained = enemyPokemon.reward_exp || (enemyLevel * 50);
			} else {
				const baseExp = enemyLevel * 5;
				expGained = Math.floor(baseExp * rewardMultiplier);
			}

			// 给玩家宝可梦添加经验值
			const expResult = await GameModel.addExpToPokemon(playerPokemon.id, expGained);

			// 战斗胜利后恢复HP
			await GameModel.restorePokemonHp(playerPokemon.id);

			// 更新玩家金币（添加奖励金币到数据库）
			if (playerId) {
				await GameModel.updatePlayerMoney(playerId, reward);
			}

			const expLog = expResult.leveledUp
				? [expResult.message]
				: [`${playerName} 获得了 ${expGained} 经验值！`];

			return res.json({
				battleEnd: true,
				battleLog: [...battleLog, `${enemyName} 被击败了！`, `获得 ${reward} 金币！`, ...expLog],
				enemyPokemon,
				expResult,
				playerId,
				reward,
				success: true,
				victory: true
			});
		}

		// 敌方宝可梦反击
		// 5%几率闪避（造成0伤害）
		const dodgeChance = Math.random();
		let enemyDamage = 0;

		if (dodgeChance < 0.05) {
			// 5%几率闪避
			enemyDamage = 0;
			battleLog.push(`敌方 ${enemyName} 发起攻击，但你的 ${playerName} 成功闪避了！`);
		} else {
			// 95%几率正常攻击
			enemyDamage = Math.floor(Math.random() * enemyPokemon.attack) + 3;
			playerPokemon.hp -= enemyDamage;
			battleLog.push(`敌方 ${enemyName} 造成了 ${enemyDamage} 点伤害！`);
		}

		if (playerPokemon.hp <= 0) {
			playerPokemon.hp = 0;
			return res.json({
				battleEnd: true,
				battleLog: [...battleLog, `你的 ${playerName} 失去了战斗能力！`],
				enemyPokemon,
				playerPokemon,
				success: true,
				victory: false
			});
		}

		res.json({
			battleEnd: false,
			battleLog,
			enemyPokemon,
			playerPokemon,
			success: true
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 获取所有道馆
export const getGyms = async(req, res) => {
	try {
		const gyms = await GameModel.getAllGyms();
		res.json({ gyms, success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 挑战道馆
export const challengeGym = async(req, res) => {
	try {
		const { gymId } = req.params;
		const gym = await GameModel.getGym(gymId);

		if (!gym) {
			return res.status(404).json({ error: "道馆不存在" });
		}

		res.json({
			gym,
			message: `${gym.leader_name} 派出了 ${gym.pokemon_name}！`,
			success: true
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 获得徽章
export const earnBadge = async(req, res) => {
	try {
		const { playerId, gymId } = req.body;

		const gym = await GameModel.getGym(gymId);
		const success = await GameModel.addBadge(playerId, gymId);

		if (success) {
			await GameModel.updatePlayerMoney(playerId, gym.reward_money);
			res.json({
				badge: gym.badge_name,
				message: `恭喜！获得了 ${gym.badge_name}！`,
				reward: gym.reward_money,
				success: true
			});
		} else {
			res.json({
				message: "你已经拥有这个徽章了",
				success: false
			});
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 获取商店商品
export const getShopItems = async(req, res) => {
	try {
		const pokeballs = await GameModel.getAllPokeballTypes();
		res.json({ items: pokeballs, success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 购买物品
export const buyItem = async(req, res) => {
	try {
		const { playerId, pokeballTypeId, quantity } = req.body;

		if (!quantity || quantity <= 0) {
			return res.status(400).json({ error: "购买数量必须大于0" });
		}

		const result = await GameModel.buyPokeball(playerId, pokeballTypeId, quantity);

		if (result.success) {
			const player = await GameModel.getPlayer(playerId);
			res.json({
				message: result.message,
				money: player.money,
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 获取背包
export const getParty = async(req, res) => {
	try {
		const { playerId } = req.params;
		const party = await GameModel.getPlayerParty(playerId);
		res.json({ party, success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 获取仓库
export const getStorage = async(req, res) => {
	try {
		const { playerId } = req.params;
		const storage = await GameModel.getPlayerStorage(playerId);
		res.json({ storage, success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 切换主战精灵
export const switchMainPokemon = async(req, res) => {
	try {
		const { playerId, storagePokemonId } = req.body;

		const result = await GameModel.switchMainPokemon(playerId, storagePokemonId);

		if (result.success) {
			res.json({
				message: result.message,
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 数据迁移：将多余的背包精灵移到仓库
export const migratePartyData = async(req, res) => {
	try {
		const { playerId } = req.body;
		const result = await GameModel.migrateExtraPartyToStorage(playerId);

		if (result.success) {
			res.json({
				message: result.message,
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 获取排行榜
export const getLeaderboard = async(req, res) => {
	try {
		const leaderboard = await GameModel.getLeaderboard();
		res.json({ leaderboard, success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// ========== 图鉴相关 ==========

// 获取玩家图鉴
export const getPokedex = async(req, res) => {
	try {
		const { playerId } = req.params;

		// 获取图鉴数据
		const pokedex = await GameModel.getPlayerPokedex(playerId);

		// 获取统计信息
		const stats = await GameModel.getPokedexStats(playerId);

		res.json({
			pokedex,
			stats,
			success: true
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 获取图鉴统计
export const getPokedexStats = async(req, res) => {
	try {
		const { playerId } = req.params;
		const stats = await GameModel.getPokedexStats(playerId);

		res.json({
			stats,
			success: true
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 获取特殊徽章
export const getSpecialBadges = async(req, res) => {
	try {
		const { playerId } = req.params;
		const badges = await GameModel.getSpecialBadges(playerId);

		res.json({
			badges,
			success: true
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// ========== 管理员功能 ==========

// 管理员设置玩家金币
export const adminSetPlayerMoney = async(req, res) => {
	try {
		const { playerId, money } = req.body;

		if (!playerId || money === undefined) {
			return res.status(400).json({ error: "玩家ID和金币数量不能为空" });
		}

		if (money < 0) {
			return res.status(400).json({ error: "金币数量不能为负数" });
		}

		const result = await GameModel.setPlayerMoney(playerId, money);

		if (result.success) {
			const player = await GameModel.getPlayer(playerId);
			res.json({
				message: `已将玩家 ${player.name} 的金币设置为 ${money}`,
				money: player.money,
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 管理员删除玩家
export const adminDeletePlayer = async(req, res) => {
	try {
		const { id } = req.params;

		if (!id) {
			return res.status(400).json({ error: "玩家ID不能为空" });
		}

		// 检查玩家是否存在
		const player = await GameModel.getPlayer(id);
		if (!player) {
			return res.status(404).json({ error: "玩家不存在" });
		}

		// 防止删除管理员账号
		if (player.is_admin) {
			return res.status(403).json({ error: "不能删除管理员账号" });
		}

		const result = await GameModel.deletePlayer(id);

		if (result.success) {
			res.json({
				message: `已成功删除玩家 ${player.name}`,
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// ========== 管理员 - 商店物品管理 ==========

// 获取所有精灵球类型
export const adminGetPokeballTypes = async(req, res) => {
	try {
		const pokeballs = await GameModel.getAllPokeballTypes();
		res.json({ items: pokeballs, success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 获取单个精灵球类型
export const adminGetPokeballType = async(req, res) => {
	try {
		const { id } = req.params;
		const pokeball = await GameModel.getPokeballType(id);
		if (!pokeball) {
			return res.status(404).json({ error: "精灵球类型不存在" });
		}
		res.json({ data: pokeball, success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 添加精灵球类型
export const adminAddPokeballType = async(req, res) => {
	try {
		const { name, catchRate, price, image } = req.body;

		if (!name || catchRate === undefined || !price) {
			return res.status(400).json({ error: "名称、捕获率和价格不能为空" });
		}

		const result = await GameModel.addPokeballType(name, catchRate, price, image || "");

		if (result.success) {
			res.json({
				id: result.id,
				message: "添加成功",
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 更新精灵球类型
export const adminUpdatePokeballType = async(req, res) => {
	try {
		const { id } = req.params;
		const { name, catchRate, price, image } = req.body;

		if (!name || catchRate === undefined || !price) {
			return res.status(400).json({ error: "名称、捕获率和价格不能为空" });
		}

		const result = await GameModel.updatePokeballType(id, name, catchRate, price, image || "");

		if (result.success) {
			res.json({
				message: "更新成功",
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 删除精灵球类型
export const adminDeletePokeballType = async(req, res) => {
	try {
		const { id } = req.params;

		const result = await GameModel.deletePokeballType(id);

		if (result.success) {
			res.json({
				message: "删除成功",
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// ========== 管理员 - 道馆管理 ==========

// 获取所有道馆
export const adminGetGyms = async(req, res) => {
	try {
		const gyms = await GameModel.getAllGyms();
		res.json({ gyms, success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 导出道馆数据为JSON
export const exportGyms = async(req, res) => {
	try {
		const gyms = await GameModel.getAllGyms();

		// 设置响应头，让浏览器下载文件
		res.setHeader("Content-Type", "application/json");
		res.setHeader("Content-Disposition", `attachment; filename=gyms-export-${Date.now()}.json`);

		res.json({
			data: gyms,
			exportDate: new Date().toISOString(),
			totalCount: gyms.length
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 导入道馆数据
export const importGyms = async(req, res) => {
	try {
		const { gyms, mode = "merge" } = req.body; // mode: 'merge'(合并) 或 'replace'(替换)

		if (!Array.isArray(gyms) || gyms.length === 0) {
			return res.status(400).json({ error: "导入数据格式错误或为空" });
		}

		let successCount = 0;
		let errorCount = 0;
		const errors = [];

		// 如果是替换模式，先删除所有现有道馆（可选，根据需求）
		// 注意：这里不删除，以避免数据丢失风险

		// 遍历导入的道馆数据
		for (const gym of gyms) {
			try {
				// 验证必填字段
				if (!gym.name || !gym.leader_name || !gym.badge_name) {
					errorCount++;
					errors.push(`道馆 "${gym.name || "未知"}" 缺少必填字段`);
					continue;
				}

				// 检查是否已存在相同ID的道馆
				if (gym.id) {
					const existing = await GameModel.getGym(gym.id);
					if (existing) {
						// 如果存在，更新
						const result = await GameModel.updateGym(gym.id, gym);
						if (result.success) {
							successCount++;
						} else {
							errorCount++;
							errors.push(`更新道馆 "${gym.name}" 失败: ${result.message}`);
						}
					} else {
						// 如果不存在，添加（不指定ID，让数据库自动生成）
						const gymDataWithoutId = { ...gym };
						delete gymDataWithoutId.id;
						const result = await GameModel.addGym(gymDataWithoutId);
						if (result.success) {
							successCount++;
						} else {
							errorCount++;
							errors.push(`添加道馆 "${gym.name}" 失败: ${result.message}`);
						}
					}
				} else {
					// 没有ID，直接添加
					const result = await GameModel.addGym(gym);
					if (result.success) {
						successCount++;
					} else {
						errorCount++;
						errors.push(`添加道馆 "${gym.name}" 失败: ${result.message}`);
					}
				}
			} catch (error) {
				errorCount++;
				errors.push(`处理道馆 "${gym.name || "未知"}" 时出错: ${error.message}`);
			}
		}

		res.json({
			errorCount,
			errors: errors.length > 0 ? errors : undefined,
			message: `导入完成！成功: ${successCount}, 失败: ${errorCount}`,
			success: true,
			successCount
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 获取单个道馆
export const adminGetGym = async(req, res) => {
	try {
		const { id } = req.params;
		const gym = await GameModel.getGym(id);
		if (!gym) {
			return res.status(404).json({ error: "道馆不存在" });
		}
		res.json({ data: gym, success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 添加道馆
export const adminAddGym = async(req, res) => {
	try {
		const gymData = req.body;

		if (!gymData.name || !gymData.leader_name || !gymData.badge_name) {
			return res.status(400).json({ error: "道馆名称、馆主和徽章名称不能为空" });
		}

		const result = await GameModel.addGym(gymData);

		if (result.success) {
			res.json({
				id: result.id,
				message: "添加成功",
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 更新道馆
export const adminUpdateGym = async(req, res) => {
	try {
		const { id } = req.params;
		const gymData = req.body;

		if (!gymData.name || !gymData.leader_name || !gymData.badge_name) {
			return res.status(400).json({ error: "道馆名称、馆主和徽章名称不能为空" });
		}

		const result = await GameModel.updateGym(id, gymData);

		if (result.success) {
			res.json({
				message: "更新成功",
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 删除道馆
export const adminDeleteGym = async(req, res) => {
	try {
		const { id } = req.params;

		const result = await GameModel.deleteGym(id);

		if (result.success) {
			res.json({
				message: "删除成功",
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// ========== 地图系统 ==========

// 获取所有地图
export const getAllMaps = async(req, res) => {
	try {
		const maps = await GameModel.getAllMaps();
		res.json({ maps, success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 获取玩家地图状态
export const getPlayerMapsStatus = async(req, res) => {
	try {
		const { playerId } = req.params;
		const mapsStatus = await GameModel.getPlayerMapsStatus(playerId);
		res.json({ maps: mapsStatus, success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 解锁地图
export const unlockMap = async(req, res) => {
	try {
		const { playerId, mapId } = req.body;
		const result = await GameModel.unlockMap(playerId, mapId);

		if (result.success) {
			res.json({
				message: result.message,
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 切换当前地图
export const switchMap = async(req, res) => {
	try {
		const { playerId, mapId } = req.body;
		const result = await GameModel.switchMap(playerId, mapId);

		if (result.success) {
			res.json({
				map: result.map,
				message: result.message,
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 管理员 - 获取单个地图
export const adminGetMap = async(req, res) => {
	try {
		const { id } = req.params;
		const map = await GameModel.getMap(id);
		if (!map) {
			return res.status(404).json({ error: "地图不存在" });
		}
		res.json({ data: map, success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 管理员 - 添加地图
export const adminAddMap = async(req, res) => {
	try {
		const mapData = req.body;

		if (!mapData.name || !mapData.min_level || !mapData.max_level) {
			return res.status(400).json({ error: "地图名称、最小等级和最大等级不能为空" });
		}

		const result = await GameModel.addMap(mapData);

		if (result.success) {
			res.json({
				id: result.id,
				message: "添加成功",
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 管理员 - 更新地图
export const adminUpdateMap = async(req, res) => {
	try {
		const { id } = req.params;
		const mapData = req.body;

		if (!mapData.name || !mapData.min_level || !mapData.max_level) {
			return res.status(400).json({ error: "地图名称、最小等级和最大等级不能为空" });
		}

		const result = await GameModel.updateMap(id, mapData);

		if (result.success) {
			res.json({
				message: "更新成功",
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 管理员 - 删除地图
export const adminDeleteMap = async(req, res) => {
	try {
		const { id } = req.params;

		const result = await GameModel.deleteMap(id);

		if (result.success) {
			res.json({
				message: "删除成功",
				success: true
			});
		} else {
			res.status(400).json({ error: result.message });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// ========== 经验值增长率系统 ==========

// 获取经验值表（用于查看和调试）
export const getExpTable = async(req, res) => {
	try {
		const { minLevel = 1, maxLevel = 100 } = req.query;
		const expTable = await GrowthRateService.getExpTable(
			parseInt(minLevel),
			parseInt(maxLevel)
		);

		res.json({
			expTable,
			growthRate: "medium (growth-rate/2)",
			maxLevel: parseInt(maxLevel),
			minLevel: parseInt(minLevel),
			success: true,
			totalLevels: expTable.length
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 获取指定等级所需的经验值
export const getExpForLevel = async(req, res) => {
	try {
		const { level } = req.params;
		const exp = await GrowthRateService.getExpForLevel(parseInt(level));

		res.json({
			exp,
			growthRate: "medium (growth-rate/2)",
			level: parseInt(level),
			success: true
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// 根据经验值计算等级
export const getLevelFromExp = async(req, res) => {
	try {
		const { exp } = req.params;
		const levelInfo = await GrowthRateService.getLevelFromExp(parseInt(exp));

		res.json({
			...levelInfo,
			growthRate: "medium (growth-rate/2)",
			success: true,
			totalExp: parseInt(exp)
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};