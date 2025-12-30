import pool from "../config/database.js";
import bcrypt from "bcrypt";

// 密码加密的盐值轮数
const SALT_ROUNDS = 10;

// 初始化游戏数据表
export const initGameTables = async() => {
	const connection = await pool.getConnection();
	try {
		// 玩家表
		await connection.query(`
      CREATE TABLE IF NOT EXISTS players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        money INT DEFAULT 1000,
        pokemon_caught INT DEFAULT 0,
        gyms_defeated INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

		// 修改密码字段长度（确保足够存储bcrypt哈希）
		try {
			await connection.query(`
        ALTER TABLE players 
        MODIFY COLUMN password VARCHAR(255) NOT NULL
      `);
		} catch (err) {
		}

		// 添加统计字段
		try {
			await connection.query(`
        ALTER TABLE players 
        ADD COLUMN pokemon_caught INT DEFAULT 0,
        ADD COLUMN gyms_defeated INT DEFAULT 0
      `);
		} catch (err) {
			// 字段已存在，忽略错误
		}

		// 添加管理员字段
		try {
			await connection.query(`
        ALTER TABLE players 
        ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
      `);
		} catch (err) {
			// 字段已存在，忽略错误
		}

		// 精灵球类型表
		await connection.query(`
      CREATE TABLE IF NOT EXISTS pokeball_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        catch_rate DECIMAL(3,2) NOT NULL,
        price INT NOT NULL,
        image VARCHAR(255)
      )
    `);

		// 添加 image 字段（如果表已存在但没有该字段）
		try {
			await connection.query(`
        ALTER TABLE pokeball_types 
        ADD COLUMN image VARCHAR(255)
      `);
		} catch (err) {
			// 字段已存在，忽略错误
		}

		// 插入初始精灵球数据
		await connection.query(`
      INSERT IGNORE INTO pokeball_types (id, name, catch_rate, price, image) VALUES
      (1, '精灵球', 0.30, 100, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'),
      (2, '超级球', 0.50, 300, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png'),
      (3, '高级球', 0.70, 500, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png'),
      (4, '大师球', 1.00, 10000, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png')
    `);

		// 更新现有记录的图片（如果图片为空）
		await connection.query(`
      UPDATE pokeball_types SET image = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' WHERE id = 1 AND (image IS NULL OR image = '')
    `);
		await connection.query(`
      UPDATE pokeball_types SET image = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png' WHERE id = 2 AND (image IS NULL OR image = '')
    `);
		await connection.query(`
      UPDATE pokeball_types SET image = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png' WHERE id = 3 AND (image IS NULL OR image = '')
    `);
		await connection.query(`
      UPDATE pokeball_types SET image = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png' WHERE id = 4 AND (image IS NULL OR image = '')
    `);

		// 玩家背包表（最多6只）
		await connection.query(`
      CREATE TABLE IF NOT EXISTS player_party (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player_id INT NOT NULL,
        pokemon_id INT NOT NULL,
        pokemon_name VARCHAR(100) NOT NULL,
        pokemon_sprite VARCHAR(255),
        level INT DEFAULT 5,
        exp INT DEFAULT 0,
        hp INT DEFAULT 50,
        max_hp INT DEFAULT 50,
        attack INT DEFAULT 10,
        position INT NOT NULL,
        caught_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        UNIQUE KEY unique_position (player_id, position)
      )
    `);

		// 添加exp字段（如果表已存在但没有该字段）
		try {
			await connection.query(`
        ALTER TABLE player_party 
        ADD COLUMN exp INT DEFAULT 0 AFTER level
      `);
		} catch (err) {
			// 字段已存在，忽略错误
		}

		// 玩家仓库表
		await connection.query(`
      CREATE TABLE IF NOT EXISTS player_storage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player_id INT NOT NULL,
        pokemon_id INT NOT NULL,
        pokemon_name VARCHAR(100) NOT NULL,
        pokemon_sprite VARCHAR(255),
        level INT DEFAULT 5,
        hp INT DEFAULT 50,
        max_hp INT DEFAULT 50,
        attack INT DEFAULT 10,
        caught_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `);

		// 玩家物品表
		await connection.query(`
      CREATE TABLE IF NOT EXISTS player_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player_id INT NOT NULL,
        pokeball_type_id INT NOT NULL,
        quantity INT DEFAULT 0,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY (pokeball_type_id) REFERENCES pokeball_types(id),
        UNIQUE KEY unique_item (player_id, pokeball_type_id)
      )
    `);

		// 道馆表
		await connection.query(`
      CREATE TABLE IF NOT EXISTS gyms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        leader_name VARCHAR(50) NOT NULL,
        pokemon_id INT NOT NULL,
        pokemon_name VARCHAR(100) NOT NULL,
        pokemon_sprite VARCHAR(255),
        level INT DEFAULT 20,
        hp INT DEFAULT 100,
        max_hp INT DEFAULT 100,
        attack INT DEFAULT 25,
        reward_money INT DEFAULT 500,
        badge_name VARCHAR(50) NOT NULL
      )
    `);

		// 添加 max_hp 字段（如果表已存在但没有该字段）
		try {
			await connection.query(`
        ALTER TABLE gyms 
        ADD COLUMN max_hp INT DEFAULT 100 AFTER hp
      `);
		} catch (err) {
			// 字段已存在，忽略错误
		}

		// 插入初始道馆数据
		await connection.query(`
      INSERT IGNORE INTO gyms (id, name, leader_name, pokemon_id, pokemon_name, pokemon_sprite, level, hp, max_hp, attack, reward_money, badge_name) VALUES
      (1, '岩石道馆', '小刚', 74, 'geodude', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/74.png', 15, 80, 80, 20, 500, '灰色徽章'),
      (2, '水系道馆', '小霞', 120, 'staryu', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/120.png', 20, 100, 100, 25, 800, '蓝色徽章'),
      (3, '电系道馆', '马志士', 25, 'pikachu', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', 25, 120, 120, 30, 1000, '橙色徽章')
    `);

		// 更新现有道馆数据的 max_hp（如果 max_hp 为空或0）
		await connection.query(`
      UPDATE gyms SET max_hp = hp WHERE max_hp IS NULL OR max_hp = 0
    `);

		// 玩家徽章表
		await connection.query(`
      CREATE TABLE IF NOT EXISTS player_badges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player_id INT NOT NULL,
        gym_id INT NOT NULL,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY (gym_id) REFERENCES gyms(id),
        UNIQUE KEY unique_badge (player_id, gym_id)
      )
    `);

		// 玩家图鉴表 - 记录捕获过的宝可梦种类
		await connection.query(`
      CREATE TABLE IF NOT EXISTS player_pokedex (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player_id INT NOT NULL,
        pokemon_id INT NOT NULL,
        pokemon_name VARCHAR(100) NOT NULL,
        pokemon_name_en VARCHAR(100),
        pokemon_sprite VARCHAR(255),
        first_caught_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_caught INT DEFAULT 1,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        UNIQUE KEY unique_pokedex_entry (player_id, pokemon_id)
      )
    `);

		// 特殊徽章表 - 用于全图鉴等特殊成就
		await connection.query(`
      CREATE TABLE IF NOT EXISTS special_badges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player_id INT NOT NULL,
        badge_type VARCHAR(50) NOT NULL,
        badge_name VARCHAR(100) NOT NULL,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        UNIQUE KEY unique_special_badge (player_id, badge_type)
      )
    `);
	} catch (error) {
		console.error("❌ Error initializing game tables:", error);
		throw error;
	} finally {
		connection.release();
	}
};

// 玩家相关操作 - 注册（带密码加密）
export const registerPlayer = async(name, password) => {
	// 使用 bcrypt 加密密码
	const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

	const [result] = await pool.query(
		"INSERT INTO players (name, password, money, pokemon_caught, gyms_defeated) VALUES (?, ?, 1000, 0, 0)",
		[name, hashedPassword]
	);
	// 给新玩家初始物品
	await pool.query(
		"INSERT INTO player_items (player_id, pokeball_type_id, quantity) VALUES (?, 1, 5)",
		[result.insertId]
	);
	return result.insertId;
};

// 玩家登录验证（使用 bcrypt 比对密码）
export const loginPlayer = async(name, password) => {
	// 先根据用户名查询玩家
	const [rows] = await pool.query(
		"SELECT * FROM players WHERE name = ?",
		[name]
	);

	if (rows.length === 0) {
		return null; // 用户不存在
	}

	const player = rows[0];

	// 使用 bcrypt 比对密码
	const isPasswordValid = await bcrypt.compare(password, player.password);

	if (!isPasswordValid) {
		return null; // 密码错误
	}

	return player; // 返回玩家信息
};

// 旧版本创建玩家（兼容性，无密码）
export const createPlayer = async(name) => {
	const [result] = await pool.query(
		"INSERT INTO players (name, password, money) VALUES (?, '', 1000)",
		[name]
	);
	// 给新玩家初始物品
	await pool.query(
		"INSERT INTO player_items (player_id, pokeball_type_id, quantity) VALUES (?, 1, 5)",
		[result.insertId]
	);
	return result.insertId;
};

export const getPlayer = async(playerId) => {
	const [rows] = await pool.query(
		"SELECT * FROM players WHERE id = ?",
		[playerId]
	);
	return rows[0];
};

export const updatePlayerMoney = async(playerId, amount) => {
	await pool.query(
		"UPDATE players SET money = money + ? WHERE id = ?",
		[amount, playerId]
	);
};

// 管理员设置玩家金币（直接设置，不是增加）
export const setPlayerMoney = async(playerId, amount) => {
	try {
		await pool.query(
			"UPDATE players SET money = ? WHERE id = ?",
			[amount, playerId]
		);
		return { success: true };
	} catch (error) {
		return { message: error.message, success: false };
	}
};

// 背包相关操作
export const getPlayerParty = async(playerId) => {
	const [rows] = await pool.query(
		"SELECT * FROM player_party WHERE player_id = ? ORDER BY position",
		[playerId]
	);
	return rows;
};

export const addToParty = async(playerId, pokemon) => {
	const [existing] = await pool.query(
		"SELECT COUNT(*) as count FROM player_party WHERE player_id = ?",
		[playerId]
	);

	if (existing[0].count >= 1) {
		return null; // 背包已满(只能有1只主战精灵)
	}

	const position = 1; // 固定为1,因为只有一只主战精灵
	const [result] = await pool.query(
		`INSERT INTO player_party (player_id, pokemon_id, pokemon_name, pokemon_sprite, level, hp, max_hp, attack, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[playerId, pokemon.id, pokemon.name, pokemon.sprite, pokemon.level, pokemon.hp, pokemon.max_hp, pokemon.attack, position]
	);

	// 更新捕获精灵数量
	await pool.query(
		"UPDATE players SET pokemon_caught = pokemon_caught + 1 WHERE id = ?",
		[playerId]
	);

	// 添加到图鉴
	await addToPokedex(playerId, pokemon);

	return result.insertId;
};

// 仓库相关操作
export const getPlayerStorage = async(playerId) => {
	const [rows] = await pool.query(
		"SELECT * FROM player_storage WHERE player_id = ? ORDER BY caught_at DESC",
		[playerId]
	);
	return rows;
};

export const addToStorage = async(playerId, pokemon) => {
	const [result] = await pool.query(
		`INSERT INTO player_storage (player_id, pokemon_id, pokemon_name, pokemon_sprite, level, hp, max_hp, attack)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		[playerId, pokemon.id, pokemon.name, pokemon.sprite, pokemon.level, pokemon.hp, pokemon.max_hp, pokemon.attack]
	);

	// 更新捕获精灵数量
	await pool.query(
		"UPDATE players SET pokemon_caught = pokemon_caught + 1 WHERE id = ?",
		[playerId]
	);

	// 添加到图鉴
	await addToPokedex(playerId, pokemon);

	return result.insertId;
};

// 物品相关操作
export const getPlayerItems = async(playerId) => {
	const [rows] = await pool.query(
		`SELECT pi.*, pt.name, pt.catch_rate, pt.price, pt.image
     FROM player_items pi
     JOIN pokeball_types pt ON pi.pokeball_type_id = pt.id
     WHERE pi.player_id = ?`,
		[playerId]
	);
	return rows;
};

export const updateItemQuantity = async(playerId, pokeballTypeId, quantity) => {
	await pool.query(
		`INSERT INTO player_items (player_id, pokeball_type_id, quantity)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
		[playerId, pokeballTypeId, quantity, quantity]
	);
};

export const useItem = async(playerId, pokeballTypeId) => {
	const [items] = await pool.query(
		"SELECT quantity FROM player_items WHERE player_id = ? AND pokeball_type_id = ?",
		[playerId, pokeballTypeId]
	);

	if (!items[0] || items[0].quantity <= 0) {
		return false;
	}

	await pool.query(
		"UPDATE player_items SET quantity = quantity - 1 WHERE player_id = ? AND pokeball_type_id = ?",
		[playerId, pokeballTypeId]
	);
	return true;
};

// 道馆相关操作
export const getAllGyms = async() => {
	const [rows] = await pool.query("SELECT * FROM gyms ORDER BY id");
	return rows;
};

export const getGym = async(gymId) => {
	const [rows] = await pool.query("SELECT * FROM gyms WHERE id = ?", [gymId]);
	return rows[0];
};

export const getPlayerBadges = async(playerId) => {
	const [rows] = await pool.query(
		`SELECT pb.*, g.name as gym_name, g.badge_name
     FROM player_badges pb
     JOIN gyms g ON pb.gym_id = g.id
     WHERE pb.player_id = ?`,
		[playerId]
	);
	return rows;
};

export const addBadge = async(playerId, gymId) => {
	try {
		await pool.query(
			"INSERT INTO player_badges (player_id, gym_id) VALUES (?, ?)",
			[playerId, gymId]
		);
		// 更新道馆击败数量
		await pool.query(
			"UPDATE players SET gyms_defeated = gyms_defeated + 1 WHERE id = ?",
			[playerId]
		);
		return true;
	} catch (error) {
		return false; // 已经有这个徽章
	}
};

// 商店相关操作
export const getAllPokeballTypes = async() => {
	const [rows] = await pool.query("SELECT * FROM pokeball_types ORDER BY id");
	return rows;
};

export const buyPokeball = async(playerId, pokeballTypeId, quantity) => {
	const [pokeball] = await pool.query(
		"SELECT price FROM pokeball_types WHERE id = ?",
		[pokeballTypeId]
	);

	if (!pokeball[0]) {
		return { message: "精灵球类型不存在", success: false };
	}

	const totalCost = pokeball[0].price * quantity;
	const player = await getPlayer(playerId);

	if (player.money < totalCost) {
		return { message: "金钱不足", success: false };
	}

	await updatePlayerMoney(playerId, -totalCost);
	await updateItemQuantity(playerId, pokeballTypeId, quantity);

	return { message: "购买成功", success: true };
};

// 数据迁移：将多余的背包精灵移到仓库(只保留position=1的)
export const migrateExtraPartyToStorage = async(playerId) => {
	try {
		await pool.query("START TRANSACTION");

		// 获取所有背包中position>1的精灵
		const [extraPokemon] = await pool.query(
			"SELECT * FROM player_party WHERE player_id = ? AND position > 1",
			[playerId]
		);

		// 将它们移到仓库
		for (const pokemon of extraPokemon) {
			await pool.query(
				`INSERT INTO player_storage (player_id, pokemon_id, pokemon_name, pokemon_sprite, level, hp, max_hp, attack)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[playerId, pokemon.pokemon_id, pokemon.pokemon_name,
					pokemon.pokemon_sprite, pokemon.level,
					pokemon.hp, pokemon.max_hp, pokemon.attack]
			);

			await pool.query(
				"DELETE FROM player_party WHERE id = ?",
				[pokemon.id]
			);
		}

		await pool.query("COMMIT");
		return { message: `已将 ${extraPokemon.length} 只精灵移到仓库`, success: true };
	} catch (error) {
		await pool.query("ROLLBACK");
		return { message: error.message, success: false };
	}
};

// 获取排行榜
export const getLeaderboard = async() => {
	const [rows] = await pool.query(
		`SELECT 
			id,
			name,
			pokemon_caught,
			gyms_defeated,
			money,
			created_at
		FROM players
		ORDER BY pokemon_caught DESC, gyms_defeated DESC, money DESC
		LIMIT 50`,
		[]
	);
	return rows;
};

// 经验值和升级系统
// 计算升级所需经验值（平衡版）
// 使用二次增长曲线，确保后期升级更有挑战性
export const getExpForLevel = (level) => {
	if (level <= 1) return 100;
	// 基础公式: 100 + (level - 1) * 15 + (level - 1)^2 * 2
	// 1级: 100, 5级: 232, 10级: 490, 20级: 1385, 50级: 6035, 100级: 25585
	const baseExp = 100;
	const linearGrowth = (level - 1) * 15;
	const quadraticGrowth = Math.pow(level - 1, 2) * 2;
	return Math.floor(baseExp + linearGrowth + quadraticGrowth);
};

// 给宝可梦添加经验值（满级100级）
export const addExpToPokemon = async(partyId, expGained) => {
	try {
		// 获取当前宝可梦信息
		const [pokemon] = await pool.query(
			"SELECT * FROM player_party WHERE id = ?",
			[partyId]
		);

		if (pokemon.length === 0) {
			return { message: "宝可梦不存在", success: false };
		}

		const poke = pokemon[0];
		const MAX_LEVEL = 100; // 满级设为100级

		// 如果已经满级，不再获得经验
		if (poke.level >= MAX_LEVEL) {
			return {
				attackGained: 0,
				expGained: 0,
				hpGained: 0,
				leveledUp: false,
				levelsGained: 0,
				message: `${poke.pokemon_name} 已经达到满级 ${MAX_LEVEL} 级！`,
				newAttack: poke.attack,
				newLevel: poke.level,
				newMaxHp: poke.max_hp,
				success: true
			};
		}

		let currentExp = (poke.exp || 0) + expGained;
		let currentLevel = poke.level;
		let currentMaxHp = poke.max_hp;
		let currentAttack = poke.attack;
		let leveledUp = false;
		let levelsGained = 0;
		const originalMaxHp = poke.max_hp;
		const originalAttack = poke.attack;

		// 检查是否升级（最高升到100级）
		while (currentLevel < MAX_LEVEL && currentExp >= getExpForLevel(currentLevel)) {
			currentExp -= getExpForLevel(currentLevel);
			currentLevel++;
			levelsGained++;
			leveledUp = true;

			// 升级时提升属性（随等级增加而增加）
			// HP增长: 基础 4-8，每10级额外+1（最高+14）
			const hpBonus = Math.floor(currentLevel / 10);
			const hpGain = Math.floor(Math.random() * 5) + 4 + hpBonus; // 4-8 + 等级加成
			currentMaxHp += hpGain;

			// 攻击力增长: 基础 2-4，每15级额外+1（最高+10）
			const attackBonus = Math.floor(currentLevel / 15);
			const attackGain = Math.floor(Math.random() * 3) + 2 + attackBonus; // 2-4 + 等级加成
			currentAttack += attackGain;
		}

		// 如果达到满级，清空多余经验
		if (currentLevel >= MAX_LEVEL) {
			currentExp = 0;
			currentLevel = MAX_LEVEL;
		}

		// 更新数据库
		await pool.query(
			`UPDATE player_party 
       SET exp = ?, level = ?, max_hp = ?, hp = ?, attack = ?
       WHERE id = ?`,
			[currentExp, currentLevel, currentMaxHp, currentMaxHp, currentAttack, partyId]
		);

		return {
			attackGained: currentAttack - originalAttack,
			expGained,
			hpGained: currentMaxHp - originalMaxHp,
			leveledUp,
			levelsGained,
			message: leveledUp
				? `${poke.pokemon_name} 升到了 Lv.${currentLevel}！HP +${currentMaxHp - originalMaxHp}, 攻击 +${currentAttack - originalAttack}`
				: `${poke.pokemon_name} 获得了 ${expGained} 经验值！`,
			newAttack: currentAttack,
			newLevel: currentLevel,
			newMaxHp: currentMaxHp,
			success: true
		};
	} catch (error) {
		return { message: error.message, success: false };
	}
};
// ========== 图鉴系统 ==========

// 添加到图鉴（捕获新宝可梦时调用）
export const addToPokedex = async(playerId, pokemon) => {
	try {
		// 检查是否已有该宝可梦
		const [existing] = await pool.query(
			"SELECT * FROM player_pokedex WHERE player_id = ? AND pokemon_id = ?",
			[playerId, pokemon.id]
		);

		if (existing.length > 0) {
			// 已有，更新捕获次数
			await pool.query(
				"UPDATE player_pokedex SET total_caught = total_caught + 1 WHERE player_id = ? AND pokemon_id = ?",
				[playerId, pokemon.id]
			);
			return { isNew: false };
		} else {
			// 新发现，插入记录
			await pool.query(
				`INSERT INTO player_pokedex (player_id, pokemon_id, pokemon_name, pokemon_name_en, pokemon_sprite, total_caught)
				 VALUES (?, ?, ?, ?, ?, 1)`,
				[playerId, pokemon.id, pokemon.name, pokemon.name_en || pokemon.name, pokemon.sprite]
			);

			// 检查是否完成全图鉴
			await checkAndAwardFullPokedex(playerId);

			return { isNew: true };
		}
	} catch (error) {
		console.error("Error adding to pokedex:", error);
		return { isNew: false };
	}
};

// 获取玩家图鉴
export const getPlayerPokedex = async(playerId) => {
	const [rows] = await pool.query(
		"SELECT * FROM player_pokedex WHERE player_id = ? ORDER BY pokemon_id ASC",
		[playerId]
	);
	return rows;
};

// 获取图鉴统计信息
export const getPokedexStats = async(playerId) => {
	const [stats] = await pool.query(
		`SELECT 
			COUNT(*) as discovered,
			SUM(total_caught) as total_caught
		FROM player_pokedex
		WHERE player_id = ?`,
		[playerId]
	);

	return {
		discovered: stats[0]?.discovered || 0,
		total: 1025, // 截至第9世代共1025只宝可梦
		totalCaught: stats[0]?.total_caught || 0
	};
};

// 检查并授予全图鉴徽章（假设全图鉴为所有1025只）
const checkAndAwardFullPokedex = async(playerId) => {
	const stats = await getPokedexStats(playerId);

	// 如果收集齐全所有宝可梦
	if (stats.discovered >= stats.total) {
		// 检查是否已有全图鉴徽章
		const [existing] = await pool.query(
			"SELECT * FROM special_badges WHERE player_id = ? AND badge_type = 'full_pokedex'",
			[playerId]
		);

		if (existing.length === 0) {
			// 授予全图鉴徽章
			await pool.query(
				"INSERT INTO special_badges (player_id, badge_type, badge_name) VALUES (?, 'full_pokedex', '全国图鉴大师')",
				[playerId]
			);

			// 奖励金币
			await updatePlayerMoney(playerId, 10000);

			return {
				awarded: true,
				badgeName: "全国图鉴大师",
				reward: 10000
			};
		}
	}

	return { awarded: false };
};

// 获取玩家的特殊徽章
export const getSpecialBadges = async(playerId) => {
	const [rows] = await pool.query(
		"SELECT * FROM special_badges WHERE player_id = ? ORDER BY earned_at DESC",
		[playerId]
	);
	return rows;
};

// 恢复宝可梦HP
export const restorePokemonHp = async(partyId) => {
	try {
		await pool.query(
			"UPDATE player_party SET hp = max_hp WHERE id = ?",
			[partyId]
		);
		return { success: true };
	} catch (error) {
		return { message: error.message, success: false };
	}
};

// 切换主战精灵 (背包和仓库互换)
export const switchMainPokemon = async(playerId, storagePokemonId) => {
	try {
		// 获取仓库中的精灵
		const [storagePokemon] = await pool.query(
			"SELECT * FROM player_storage WHERE id = ? AND player_id = ?",
			[storagePokemonId, playerId]
		);

		if (!storagePokemon || storagePokemon.length === 0) {
			return { message: "仓库中找不到该精灵", success: false };
		}

		const pokemon = storagePokemon[0];

		// 获取当前背包中的精灵
		const [currentParty] = await pool.query(
			"SELECT * FROM player_party WHERE player_id = ? LIMIT 1",
			[playerId]
		);

		// 开始事务
		await pool.query("START TRANSACTION");

		try {
			// 如果背包有精灵,先移到仓库
			if (currentParty && currentParty.length > 0) {
				const oldMainPokemon = currentParty[0];

				// 将背包精灵移到仓库
				await pool.query(
					`INSERT INTO player_storage (player_id, pokemon_id, pokemon_name, pokemon_sprite, level, hp, max_hp, attack)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
					[playerId, oldMainPokemon.pokemon_id, oldMainPokemon.pokemon_name,
						oldMainPokemon.pokemon_sprite, oldMainPokemon.level,
						oldMainPokemon.hp, oldMainPokemon.max_hp, oldMainPokemon.attack]
				);

				// 从背包删除
				await pool.query(
					"DELETE FROM player_party WHERE id = ?",
					[oldMainPokemon.id]
				);
			}

			// 将选中的仓库精灵移到背包 (position固定为1,因为只有一只)
			await pool.query(
				`INSERT INTO player_party (player_id, pokemon_id, pokemon_name, pokemon_sprite, level, hp, max_hp, attack, position)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
				[playerId, pokemon.pokemon_id, pokemon.pokemon_name,
					pokemon.pokemon_sprite, pokemon.level,
					pokemon.hp, pokemon.max_hp, pokemon.attack]
			);

			// 从仓库删除
			await pool.query(
				"DELETE FROM player_storage WHERE id = ?",
				[storagePokemonId]
			);

			// 提交事务
			await pool.query("COMMIT");

			return {
				message: `${pokemon.pokemon_name} 已设为主战精灵！`,
				success: true
			};
		} catch (error) {
			// 回滚事务
			await pool.query("ROLLBACK");
			throw error;
		}
	} catch (error) {
		return { message: error.message, success: false };
	}
};