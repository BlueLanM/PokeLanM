import * as GameModel from "../models/gameModel.js";
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

// 探索 - 遇到随机宝可梦
export const explore = async(req, res) => {
	try {
		if (pokemonData.length === 0) {
			return res.status(500).json({ error: "宝可梦数据未加载" });
		}

		// 随机选择一只宝可梦（全部世代）
		const randomIndex = Math.floor(Math.random() * pokemonData.length);
		const pokemonInfo = pokemonData[randomIndex];

		const pokemon = {
			attack: Math.floor(Math.random() * 15) + 5,
			catchRate: pokemonInfo.catchRate || "5.9%",
			hp: Math.floor(Math.random() * 30) + 30,
			id: pokemonInfo.id,
			level: Math.floor(Math.random() * 10) + 1,
			max_hp: Math.floor(Math.random() * 30) + 30,
			name: pokemonInfo.name,
			name_en: pokemonInfo.name_en,
			sprite: `https://raw.githubusercontent.com/NightCatSama/pokedex/main/images/gif/${pokemonInfo.id}.gif`,
			sprite_pixel: `https://raw.githubusercontent.com/NightCatSama/pokedex/main/images/pixel/${pokemonInfo.id}.png`,
			type1: pokemonInfo.type1,
			type2: pokemonInfo.type2
		};

		pokemon.max_hp = pokemon.hp;

		res.json({
			message: `遇到了野生的 ${pokemon.name}！`,
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
		const finalCatchRate = Math.min(baseCatchRate + hpBonus, 0.98); // 最高98%捕捉率

		// 判断是否捕捉成功
		const randomValue = Math.random();
		const caught = randomValue <= finalCatchRate;

		if (caught) {
			// 尝试加入背包
			const partyId = await GameModel.addToParty(playerId, pokemon);

			// 计算捕捉经验值奖励 (基于野生宝可梦等级)
			let expResult = null;
			if (playerPokemonId) {
				const wildLevel = pokemon.level || 10;
				const expGained = wildLevel * 15; // 捕捉获得的经验值略少于击败
				expResult = await GameModel.addExpToPokemon(playerPokemonId, expGained);
			}

			// 计算捕捉金币奖励 (基于野生宝可梦等级)
			const wildLevel = pokemon.level || 10;
			const catchReward = Math.floor(wildLevel * 10 + Math.random() * 20 + 10); // 等级*10 + 10-30随机金币
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
		const { playerPokemon, enemyPokemon, isGym } = req.body;

		// 玩家宝可梦攻击
		const playerDamage = Math.floor(Math.random() * playerPokemon.attack) + 5;
		enemyPokemon.hp -= playerDamage;

		const playerName = playerPokemon.pokemon_name || playerPokemon.name;
		const enemyName = enemyPokemon.pokemon_name || enemyPokemon.name;
		const battleLog = [`你的 ${playerName} 造成了 ${playerDamage} 点伤害！`];

		if (enemyPokemon.hp <= 0) {
			enemyPokemon.hp = 0;
			const reward = isGym ? enemyPokemon.reward_money || 500 : Math.floor(Math.random() * 50) + 50;

			// 计算经验值奖励 (基于敌人等级)
			const enemyLevel = enemyPokemon.level || 10;
			const expGained = isGym ? enemyLevel * 50 : enemyLevel * 20; // 道馆给更多经验

			// 给玩家宝可梦添加经验值
			const expResult = await GameModel.addExpToPokemon(playerPokemon.id, expGained);

			// 战斗胜利后恢复HP
			await GameModel.restorePokemonHp(playerPokemon.id);

			// 更新玩家金币（添加奖励金币到数据库）
			// 从数据库获取该宝可梦对应的玩家ID
			const playerId = playerPokemon.player_id;
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
		const enemyDamage = Math.floor(Math.random() * enemyPokemon.attack) + 3;
		playerPokemon.hp -= enemyDamage;
		battleLog.push(`敌方 ${enemyName} 造成了 ${enemyDamage} 点伤害！`);

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