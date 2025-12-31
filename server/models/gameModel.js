/* eslint-disable sort-keys */
/* eslint-disable camelcase */
import pool from "../config/database.js";
import bcrypt from "bcrypt";
import * as GrowthRateService from "../services/growthRateService.js";

// ========== 宝可梦进化系统 ==========

/**
 * 读取宝可梦进化链数据
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

		// 添加level_exp字段（当前等级进度经验）
		try {
			await connection.query(`
        ALTER TABLE player_party 
        ADD COLUMN level_exp INT DEFAULT 0 AFTER exp
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
        badge_name VARCHAR(50) NOT NULL,
        badge_image VARCHAR(255)
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

		// 添加 badge_image 字段（如果表已存在但没有该字段）
		try {
			await connection.query(`
        ALTER TABLE gyms 
        ADD COLUMN badge_image VARCHAR(255) AFTER badge_name
      `);
		} catch (err) {
			// 字段已存在，忽略错误
		}

		// 添加 reward_exp 字段（如果表已存在但没有该字段）
		try {
			await connection.query(`
        ALTER TABLE gyms 
        ADD COLUMN reward_exp INT DEFAULT 100 AFTER reward_money
      `);
		} catch (err) {
			// 字段已存在，忽略错误
		}

		// 插入初始道馆数据
		await connection.query(`
      INSERT IGNORE INTO gyms (id, name, leader_name, pokemon_id, pokemon_name, pokemon_sprite, level, hp, max_hp, attack, reward_money, badge_name, badge_image) VALUES
      (1, '岩石道馆', '小刚', 74, 'geodude', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/74.png', 15, 80, 80, 20, 500, '灰色徽章', 'https://raw.githubusercontent.com/BlueLanM/PokeLanM/main/images/Boulder_Badge.png'),
      (2, '水系道馆', '小霞', 120, 'staryu', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/120.png', 20, 100, 100, 25, 800, '蓝色徽章', 'https://raw.githubusercontent.com/BlueLanM/PokeLanM/main/images/Cascade_Badge.png'),
      (3, '电系道馆', '马志士', 25, 'pikachu', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', 25, 120, 120, 30, 1000, '橙色徽章', 'https://raw.githubusercontent.com/BlueLanM/PokeLanM/main/images/Thunder_Badge.png')
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

		// 地图表
		await connection.query(`
      CREATE TABLE IF NOT EXISTS maps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        min_level INT NOT NULL,
        max_level INT NOT NULL,
        unlock_condition VARCHAR(255),
        unlock_value INT DEFAULT 0,
        reward_multiplier DECIMAL(3,2) DEFAULT 1.00,
        background_image VARCHAR(255),
        map_order INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

		// 插入初始地图数据
		await connection.query(`
      INSERT IGNORE INTO maps (id, name, description, min_level, max_level, unlock_condition, unlock_value, reward_multiplier, background_image, map_order) VALUES
      (1, '新手村', '适合刚开始冒险的训练师', 1, 10, 'none', 0, 1.00, '', 1),
      (2, '森林深处', '茂密的森林，栖息着更强的宝可梦', 10, 20, 'level', 10, 1.50, '', 2),
      (3, '山脉地带', '险峻的山脉，需要一定实力才能探索', 20, 30, 'level', 20, 2.00, '', 3),
      (4, '海滨沙滩', '美丽的海滩，水系宝可梦的聚集地', 30, 40, 'level', 30, 2.50, '', 4),
      (5, '火山口', '炙热的火山，只有强者才能进入', 40, 50, 'level', 40, 3.00, '', 5),
      (6, '冰雪高原', '寒冷的高原，冰系宝可梦的天堂', 50, 60, 'level', 50, 3.50, '', 6),
      (7, '雷电峡谷', '雷声隆隆的峡谷，电系宝可梦横行', 60, 70, 'level', 60, 4.00, '', 7),
      (8, '黑暗洞窟', '深不见底的洞窟，危险重重', 70, 80, 'badges', 5, 4.50, '', 8),
      (9, '龙之谷', '传说中龙系宝可梦的栖息地', 80, 90, 'level', 80, 5.00, '', 9),
      (10, '冠军之路', '只有最强的训练师才能踏足的地方', 90, 100, 'badges', 8, 6.00, '', 10)
    `);

		// 玩家地图解锁表
		await connection.query(`
      CREATE TABLE IF NOT EXISTS player_map_unlocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player_id INT NOT NULL,
        map_id INT NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE,
        UNIQUE KEY unique_map_unlock (player_id, map_id)
      )
    `);

		// 给所有现有玩家解锁第一个地图
		await connection.query(`
      INSERT IGNORE INTO player_map_unlocks (player_id, map_id)
      SELECT id, 1 FROM players
    `);

		// 添加当前地图字段到玩家表
		try {
			await connection.query(`
        ALTER TABLE players 
        ADD COLUMN current_map_id INT DEFAULT 1
      `);
		} catch (err) {
			// 字段已存在，忽略错误
		}
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
		"INSERT INTO players (name, password, money, pokemon_caught, gyms_defeated, current_map_id) VALUES (?, ?, 1000, 0, 0, 1)",
		[name, hashedPassword]
	);
	// 给新玩家初始物品
	await pool.query(
		"INSERT INTO player_items (player_id, pokeball_type_id, quantity) VALUES (?, 1, 5)",
		[result.insertId]
	);
	// 给新玩家解锁第一个地图
	await pool.query(
		"INSERT INTO player_map_unlocks (player_id, map_id) VALUES (?, 1)",
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

// 管理员删除玩家（级联删除所有相关数据）
export const deletePlayer = async(playerId) => {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();

		// 删除玩家的背包精灵
		await connection.query(
			"DELETE FROM player_party WHERE player_id = ?",
			[playerId]
		);

		// 删除玩家的仓库精灵
		await connection.query(
			"DELETE FROM player_storage WHERE player_id = ?",
			[playerId]
		);

		// 删除玩家的物品
		await connection.query(
			"DELETE FROM player_items WHERE player_id = ?",
			[playerId]
		);

		// 删除玩家的徽章
		await connection.query(
			"DELETE FROM player_badges WHERE player_id = ?",
			[playerId]
		);

		// 删除玩家的图鉴记录
		await connection.query(
			"DELETE FROM player_pokedex WHERE player_id = ?",
			[playerId]
		);

		// 删除玩家的地图解锁记录
		await connection.query(
			"DELETE FROM player_map_unlocks WHERE player_id = ?",
			[playerId]
		);

		// 最后删除玩家本身
		await connection.query(
			"DELETE FROM players WHERE id = ?",
			[playerId]
		);

		await connection.commit();
		return { success: true };
	} catch (error) {
		await connection.rollback();
		return { message: error.message, success: false };
	} finally {
		connection.release();
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

	const position = 1; // 固定为1,因为只有一只参战精灵
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
		`SELECT pb.*, g.name as gym_name, g.badge_name, g.badge_image
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
			p.id,
			p.name,
			p.pokemon_caught,
			p.gyms_defeated,
			p.money,
			p.created_at,
			COUNT(pb.id) as badge_count
		FROM players p
		LEFT JOIN player_badges pb ON p.id = pb.player_id
		GROUP BY p.id
		ORDER BY p.pokemon_caught DESC, p.gyms_defeated DESC, p.money DESC
		LIMIT 50`,
		[]
	);
	return rows;
};

// 经验值和升级系统
// 计算升级所需经验值（平衡版）
// 使用二次增长曲线，确保后期升级更有挑战性
// 使用 PokeAPI 的 growth-rate 接口获取经验值
// 这个函数保留用于同步调用的兼容性
export const getExpForLevel = (level) => {
	if (level <= 1) return 0;
	// 使用回退计算（原有公式）
	const baseExp = 100;
	const linearGrowth = (level - 1) * 15;
	const quadraticGrowth = Math.pow(level - 1, 2) * 2;
	return Math.floor(baseExp + linearGrowth + quadraticGrowth);
};

// 使用 PokeAPI 异步获取经验值
export const getExpForLevelAsync = async(level) => {
	return await GrowthRateService.getExpForLevel(level);
};

// 给宝可梦添加经验值（满级100级）
// 使用 PokeAPI growth-rate/2 (medium) 的增长率
// 新机制：level_exp 存储当前等级进度，升级时清零
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
				levelExp: poke.level_exp || 0,
				leveledUp: false,
				levelsGained: 0,
				message: `${poke.pokemon_name} 已经达到满级 ${MAX_LEVEL} 级！`,
				newAttack: poke.attack,
				newLevel: poke.level,
				newMaxHp: poke.max_hp,
				success: true
			};
		}

		// 累积总经验（用于记录）
		const currentTotalExp = (poke.exp || 0) + expGained;
		// 当前等级进度经验
		let currentLevelExp = (poke.level_exp || 0) + expGained;
		let currentLevel = poke.level;
		let currentMaxHp = poke.max_hp;
		let currentAttack = poke.attack;
		let leveledUp = false;
		let levelsGained = 0;
		const originalMaxHp = poke.max_hp;
		const originalAttack = poke.attack;

		// 循环检查是否升级（可能连续升多级）
		while (currentLevel < MAX_LEVEL) {
			// 获取下一级所需经验
			const nextLevelRequiredExp = await GrowthRateService.getExpForLevel(currentLevel + 1);
			const currentLevelRequiredExp = await GrowthRateService.getExpForLevel(currentLevel);
			const expNeededForNextLevel = nextLevelRequiredExp - currentLevelRequiredExp;

			// 检查当前等级进度经验是否足够升级
			if (currentLevelExp >= expNeededForNextLevel) {
				// 升级！
				leveledUp = true;
				levelsGained++;
				currentLevel++;

				// 扣除本级所需经验，剩余经验继续累积
				currentLevelExp -= expNeededForNextLevel;

				// 使用增长率服务计算属性增长（每次升1级）
				const statGrowth = GrowthRateService.calculateStatGrowth(1, currentLevel);
				currentMaxHp += statGrowth.hpGained;
				currentAttack += statGrowth.attackGained;
			} else {
				// 经验不足，停止升级
				break;
			}
		}

		// 如果达到满级，清空 level_exp
		if (currentLevel >= MAX_LEVEL) {
			currentLevel = MAX_LEVEL;
			currentLevelExp = 0;
		}

		// 计算升级所需经验（用于前端显示进度条）
		let expNeededForNextLevel = 0;
		if (currentLevel < MAX_LEVEL) {
			const nextLevelRequiredExp = await GrowthRateService.getExpForLevel(currentLevel + 1);
			const currentLevelRequiredExp = await GrowthRateService.getExpForLevel(currentLevel);
			expNeededForNextLevel = nextLevelRequiredExp - currentLevelRequiredExp;
		}

		// 更新数据库
		// exp: 累积总经验（用于统计）
		// level_exp: 当前等级进度经验（用于显示）
		await pool.query(
			`UPDATE player_party 
       SET exp = ?, level_exp = ?, level = ?, max_hp = ?, hp = ?, attack = ?
       WHERE id = ?`,
			[currentTotalExp, currentLevelExp, currentLevel, currentMaxHp, currentMaxHp, currentAttack, partyId]
		);

		return {
			attackGained: currentAttack - originalAttack,
			currentLevelExp, // 当前等级的进度经验（例如：100）
			expGained,
			expNeededForNextLevel, // 升到下一级需要的总经验（例如：1000）
			hpGained: currentMaxHp - originalMaxHp,
			levelExp: currentLevelExp, // 保留兼容性
			leveledUp,
			levelsGained,
			message: leveledUp
				? `${poke.pokemon_name} 升到了 Lv.${currentLevel}！HP +${currentMaxHp - originalMaxHp}, 攻击 +${currentAttack - originalAttack}`
				: `${poke.pokemon_name} 获得了 ${expGained} 经验值！当前 ${currentLevelExp}/${expNeededForNextLevel}`,
			newAttack: currentAttack,
			newLevel: currentLevel,
			newMaxHp: currentMaxHp,
			success: true,
			totalExp: currentTotalExp
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

// ========== 管理员 - 商店物品管理 ==========

// 添加新的精灵球类型
export const addPokeballType = async(name, catchRate, price, image) => {
	try {
		const [result] = await pool.query(
			"INSERT INTO pokeball_types (name, catch_rate, price, image) VALUES (?, ?, ?, ?)",
			[name, catchRate, price, image]
		);
		return { id: result.insertId, success: true };
	} catch (error) {
		return { message: error.message, success: false };
	}
};

// 更新精灵球类型
export const updatePokeballType = async(id, name, catchRate, price, image) => {
	try {
		await pool.query(
			"UPDATE pokeball_types SET name = ?, catch_rate = ?, price = ?, image = ? WHERE id = ?",
			[name, catchRate, price, image, id]
		);
		return { success: true };
	} catch (error) {
		return { message: error.message, success: false };
	}
};

// 删除精灵球类型
export const deletePokeballType = async(id) => {
	try {
		// 检查是否有玩家拥有该类型物品
		const [items] = await pool.query(
			"SELECT COUNT(*) as count FROM player_items WHERE pokeball_type_id = ?",
			[id]
		);

		if (items[0].count > 0) {
			return { message: "无法删除，有玩家拥有该物品", success: false };
		}

		await pool.query("DELETE FROM pokeball_types WHERE id = ?", [id]);
		return { success: true };
	} catch (error) {
		return { message: error.message, success: false };
	}
};

// 获取单个精灵球类型详情
export const getPokeballType = async(id) => {
	const [rows] = await pool.query("SELECT * FROM pokeball_types WHERE id = ?", [id]);
	return rows[0];
};

// ========== 管理员 - 道馆管理 ==========

// 添加新道馆
export const addGym = async(gymData) => {
	try {
		const { name, leader_name, pokemon_id, pokemon_name, pokemon_sprite, level, hp, max_hp, attack, reward_money, reward_exp, badge_name, badge_image } = gymData;
		const [result] = await pool.query(
			`INSERT INTO gyms (name, leader_name, pokemon_id, pokemon_name, pokemon_sprite, level, hp, max_hp, attack, reward_money, reward_exp, badge_name, badge_image)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[name, leader_name, pokemon_id, pokemon_name, pokemon_sprite, level, hp, max_hp, attack, reward_money, reward_exp || 100, badge_name, badge_image]
		);
		return { id: result.insertId, success: true };
	} catch (error) {
		return { message: error.message, success: false };
	}
};

// 更新道馆
export const updateGym = async(id, gymData) => {
	try {
		const { name, leader_name, pokemon_id, pokemon_name, pokemon_sprite, level, hp, max_hp, attack, reward_money, reward_exp, badge_name, badge_image } = gymData;
		await pool.query(
			`UPDATE gyms SET name = ?, leader_name = ?, pokemon_id = ?, pokemon_name = ?, pokemon_sprite = ?, 
			 level = ?, hp = ?, max_hp = ?, attack = ?, reward_money = ?, reward_exp = ?, badge_name = ?, badge_image = ?
			 WHERE id = ?`,
			[name, leader_name, pokemon_id, pokemon_name, pokemon_sprite, level, hp, max_hp, attack, reward_money, reward_exp || 100, badge_name, badge_image, id]
		);
		return { success: true };
	} catch (error) {
		return { message: error.message, success: false };
	}
};

// 删除道馆
export const deleteGym = async(id) => {
	try {
		// 检查是否有玩家获得该道馆徽章
		const [badges] = await pool.query(
			"SELECT COUNT(*) as count FROM player_badges WHERE gym_id = ?",
			[id]
		);

		if (badges[0].count > 0) {
			return { message: "无法删除，有玩家已获得该道馆徽章", success: false };
		}

		await pool.query("DELETE FROM gyms WHERE id = ?", [id]);
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

// ========== 地图系统 ==========

// 获取所有地图
export const getAllMaps = async() => {
	const [rows] = await pool.query("SELECT * FROM maps ORDER BY map_order");
	return rows;
};

// 获取单个地图
export const getMap = async(mapId) => {
	const [rows] = await pool.query("SELECT * FROM maps WHERE id = ?", [mapId]);
	return rows[0];
};

// 获取玩家已解锁的地图
export const getPlayerUnlockedMaps = async(playerId) => {
	const [rows] = await pool.query(
		`SELECT m.* FROM maps m
     JOIN player_map_unlocks pmu ON m.id = pmu.map_id
     WHERE pmu.player_id = ?
     ORDER BY m.map_order`,
		[playerId]
	);
	return rows;
};

// 获取玩家所有地图状态（包含解锁状态）
export const getPlayerMapsStatus = async(playerId) => {
	// 获取所有地图
	const allMaps = await getAllMaps();

	// 获取玩家已解锁的地图ID
	const [unlockedMaps] = await pool.query(
		"SELECT map_id FROM player_map_unlocks WHERE player_id = ?",
		[playerId]
	);
	const unlockedMapIds = new Set(unlockedMaps.map(m => m.map_id));

	// 获取玩家信息（用于检查解锁条件和当前地图）
	const player = await getPlayer(playerId);
	const party = await getPlayerParty(playerId);
	const badges = await getPlayerBadges(playerId);

	// 玩家宝可梦等级和当前地图
	const playerLevel = party.length > 0 ? party[0].level : 1;
	const badgeCount = badges.length;
	const currentMapId = player?.current_map_id;

	// 为每个地图添加解锁状态和解锁条件
	const mapsWithStatus = allMaps.map(map => {
		const isUnlocked = unlockedMapIds.has(map.id);
		const isCurrent = map.id === currentMapId;
		let canUnlock = false;
		let unlockMessage = "";

		if (!isUnlocked) {
			// 检查是否满足解锁条件
			if (map.unlock_condition === "none") {
				canUnlock = true;
			} else if (map.unlock_condition === "level") {
				canUnlock = playerLevel >= map.unlock_value;
				unlockMessage = canUnlock
					? "可以解锁"
					: `需要宝可梦等级达到 ${map.unlock_value} 级`;
			} else if (map.unlock_condition === "badges") {
				canUnlock = badgeCount >= map.unlock_value;
				unlockMessage = canUnlock
					? "可以解锁"
					: `需要获得 ${map.unlock_value} 个徽章`;
			}
		}

		return {
			...map,
			canUnlock,
			isCurrent,
			isUnlocked,
			unlockMessage
		};
	});

	return mapsWithStatus;
};

// 解锁地图
export const unlockMap = async(playerId, mapId) => {
	try {
		// 检查地图是否存在
		const map = await getMap(mapId);
		if (!map) {
			return { message: "地图不存在", success: false };
		}

		// 检查是否已解锁
		const [existing] = await pool.query(
			"SELECT * FROM player_map_unlocks WHERE player_id = ? AND map_id = ?",
			[playerId, mapId]
		);

		if (existing.length > 0) {
			return { message: "地图已解锁", success: false };
		}

		// 检查解锁条件
		// const player = await getPlayer(playerId);
		const party = await getPlayerParty(playerId);
		const badges = await getPlayerBadges(playerId);
		const playerLevel = party.length > 0 ? party[0].level : 1;
		const badgeCount = badges.length;

		let canUnlock = false;
		let errorMessage = "";

		if (map.unlock_condition === "none") {
			canUnlock = true;
		} else if (map.unlock_condition === "level") {
			if (playerLevel >= map.unlock_value) {
				canUnlock = true;
			} else {
				errorMessage = `需要宝可梦等级达到 ${map.unlock_value} 级`;
			}
		} else if (map.unlock_condition === "badges") {
			if (badgeCount >= map.unlock_value) {
				canUnlock = true;
			} else {
				errorMessage = `需要获得 ${map.unlock_value} 个徽章`;
			}
		}

		if (!canUnlock) {
			return { message: errorMessage || "不满足解锁条件", success: false };
		}

		// 解锁地图
		await pool.query(
			"INSERT INTO player_map_unlocks (player_id, map_id) VALUES (?, ?)",
			[playerId, mapId]
		);

		return {
			message: `成功解锁地图：${map.name}！`,
			success: true
		};
	} catch (error) {
		return { message: error.message, success: false };
	}
};

// 切换当前地图
export const switchMap = async(playerId, mapId) => {
	try {
		// 检查地图是否解锁
		const [unlocked] = await pool.query(
			"SELECT * FROM player_map_unlocks WHERE player_id = ? AND map_id = ?",
			[playerId, mapId]
		);

		if (unlocked.length === 0) {
			return { message: "该地图尚未解锁", success: false };
		}

		// 更新当前地图
		await pool.query(
			"UPDATE players SET current_map_id = ? WHERE id = ?",
			[mapId, playerId]
		);

		const map = await getMap(mapId);
		return {
			map,
			message: `已切换到 ${map.name}`,
			success: true
		};
	} catch (error) {
		return { message: error.message, success: false };
	}
};

// 管理员 - 添加地图
export const addMap = async(mapData) => {
	try {
		const { name, description, min_level, max_level, unlock_condition, unlock_value, reward_multiplier, background_image, map_order } = mapData;
		const [result] = await pool.query(
			`INSERT INTO maps (name, description, min_level, max_level, unlock_condition, unlock_value, reward_multiplier, background_image, map_order)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[name, description, min_level, max_level, unlock_condition, unlock_value, reward_multiplier, background_image, map_order]
		);
		return { id: result.insertId, success: true };
	} catch (error) {
		return { message: error.message, success: false };
	}
};

// 管理员 - 更新地图
export const updateMap = async(id, mapData) => {
	try {
		const { name, description, min_level, max_level, unlock_condition, unlock_value, reward_multiplier, background_image, map_order } = mapData;
		await pool.query(
			`UPDATE maps SET name = ?, description = ?, min_level = ?, max_level = ?, 
			 unlock_condition = ?, unlock_value = ?, reward_multiplier = ?, background_image = ?, map_order = ?
			 WHERE id = ?`,
			[name, description, min_level, max_level, unlock_condition, unlock_value, reward_multiplier, background_image, map_order, id]
		);
		return { success: true };
	} catch (error) {
		return { message: error.message, success: false };
	}
};

// 管理员 - 删除地图
export const deleteMap = async(id) => {
	try {
		// 检查是否有玩家在该地图
		const [players] = await pool.query(
			"SELECT COUNT(*) as count FROM players WHERE current_map_id = ?",
			[id]
		);

		if (players[0].count > 0) {
			return { message: "无法删除，有玩家正在该地图", success: false };
		}

		// 删除地图解锁记录
		await pool.query("DELETE FROM player_map_unlocks WHERE map_id = ?", [id]);

		// 删除地图
		await pool.query("DELETE FROM maps WHERE id = ?", [id]);

		return { success: true };
	} catch (error) {
		return { message: error.message, success: false };
	}
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pokemonData = [];
try {
	const dataPath = path.join(__dirname, "../pokedex-main/pokemon.json");
	const rawData = fs.readFileSync(dataPath, "utf8");
	pokemonData = JSON.parse(rawData);
} catch (error) {
	console.error("❌ 读取宝可梦数据失败:", error);
}

/**
 * 获取宝可梦的进化信息
 * @param {number} pokemonId - 当前宝可梦ID
 * @returns {object} - 进化信息 { canEvolve, nextEvolution, evolutionChain, requiredLevel }
 */
export const getPokemonEvolutionInfo = (pokemonId) => {
	const pokemon = pokemonData.find(p => p.id === pokemonId);

	if (!pokemon || !pokemon.chain) {
		return { canEvolve: false };
	}

	// 解析进化链 "1,2,3" -> [1, 2, 3]
	const evolutionChain = pokemon.chain.split(",").map(id => parseInt(id.trim()));

	// 找到当前宝可梦在进化链中的位置
	const currentIndex = evolutionChain.indexOf(pokemonId);

	if (currentIndex === -1 || currentIndex === evolutionChain.length - 1) {
		// 不在进化链中或已经是最终形态
		return {
			canEvolve: false,
			evolutionChain,
			isMaxEvolution: true
		};
	}

	// 下一个进化形态的ID
	const nextEvolutionId = evolutionChain[currentIndex + 1];
	const nextEvolution = pokemonData.find(p => p.id === nextEvolutionId);

	// 进化等级要求（可以根据实际需求调整）
	// 第一段进化：16级，第二段进化：36级
	const requiredLevel = currentIndex === 0 ? 16 : 36;

	return {
		canEvolve: true,
		currentStage: currentIndex + 1,
		evolutionChain,
		nextEvolution: {
			id: nextEvolution.id,
			name: nextEvolution.name,
			name_en: nextEvolution.name_en,
			sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${nextEvolution.id}.gif`
		},
		requiredLevel,
		totalStages: evolutionChain.length
	};
};

/**
 * 执行宝可梦进化
 * @param {number} partyId - 背包中宝可梦的ID
 * @returns {object} - 进化结果
 */
export const evolvePokemon = async(partyId, playerId = null) => {
	try {
		// 先在背包中查找
		let query = "SELECT * FROM player_party WHERE id = ?";
		let params = [partyId];
		let tableName = "player_party";

		// 如果提供了playerId，验证所有权
		if (playerId) {
			query = "SELECT * FROM player_party WHERE id = ? AND player_id = ?";
			params = [partyId, playerId];
		}

		let [pokemon] = await pool.query(query, params);

		// 如果背包中没有,在仓库中查找
		if (pokemon.length === 0) {
			tableName = "player_storage";
			query = "SELECT * FROM player_storage WHERE id = ?";
			params = [partyId];

			if (playerId) {
				query = "SELECT * FROM player_storage WHERE id = ? AND player_id = ?";
				params = [partyId, playerId];
			}

			[pokemon] = await pool.query(query, params);
		}

		if (pokemon.length === 0) {
			return { message: playerId ? "宝可梦不存在或无权操作" : "宝可梦不存在", success: false };
		}

		const poke = pokemon[0];

		const evolutionInfo = getPokemonEvolutionInfo(poke.pokemon_id);

		// 检查是否可以进化
		if (!evolutionInfo.canEvolve) {
			return {
				message: `${poke.pokemon_name} 已经是最终形态，无法进化！`,
				success: false
			};
		}

		// 检查等级是否满足
		if (poke.level < evolutionInfo.requiredLevel) {
			return {
				message: `${poke.pokemon_name} 需要达到 ${evolutionInfo.requiredLevel} 级才能进化！当前等级：${poke.level}`,
				success: false
			};
		}

		// 获取进化后的宝可梦数据
		const nextEvolution = evolutionInfo.nextEvolution;

		if (!nextEvolution || !nextEvolution.id) {
			console.error("❌ 进化数据错误:", nextEvolution);
			return {
				message: "进化数据异常，请联系管理员",
				success: false
			};
		}

		// 计算属性增长（进化时属性提升）
		const hpBonus = 20;
		const attackBonus = 10;

		console.log("✅ 开始进化:", poke.pokemon_name, "->", nextEvolution.name, "表:", tableName);

		// 更新为进化后的宝可梦 (使用动态表名)
		await pool.query(
			`UPDATE ${tableName} 
       SET pokemon_id = ?, 
           pokemon_name = ?, 
           pokemon_sprite = ?,
           max_hp = max_hp + ?,
           hp = hp + ?,
           attack = attack + ?
       WHERE id = ?`,
			[
				nextEvolution.id,
				nextEvolution.name,
				nextEvolution.sprite,
				hpBonus,
				hpBonus,
				attackBonus,
				partyId
			]
		);

		// 添加到图鉴（如果是新宝可梦）
		await addToPokedex(poke.player_id, {
			id: nextEvolution.id,
			name: nextEvolution.name,
			name_en: nextEvolution.name_en,
			sprite: nextEvolution.sprite
		});

		return {
			evolution: {
				bonusStats: {
					attack: attackBonus,
					hp: hpBonus
				},
				from: {
					id: poke.pokemon_id,
					name: poke.pokemon_name
				},
				to: {
					id: nextEvolution.id,
					name: nextEvolution.name,
					sprite: nextEvolution.sprite
				}
			},
			message: `恭喜！${poke.pokemon_name} 进化成了 ${nextEvolution.name}！`,
			success: true
		};
	} catch (error) {
		console.error("进化失败:", error);
		return { message: error.message, success: false };
	}
};

/**
 * 检查宝可梦是否可以进化（用于前端显示）
 * @param {number} partyId - 背包中宝可梦的ID
 * @returns {object} - 进化检查结果
 */
export const checkEvolution = async(partyId) => {
	try {
		// 先在背包中查找
		let [pokemon] = await pool.query(
			"SELECT * FROM player_party WHERE id = ?",
			[partyId]
		);

		// 如果背包中没有,在仓库中查找
		if (pokemon.length === 0) {
			[pokemon] = await pool.query(
				"SELECT * FROM player_storage WHERE id = ?",
				[partyId]
			);
		}

		if (pokemon.length === 0) {
			return { message: "宝可梦不存在", success: false };
		}

		const poke = pokemon[0];
		const evolutionInfo = getPokemonEvolutionInfo(poke.pokemon_id);

		if (!evolutionInfo.canEvolve) {
			return {
				canEvolve: false,
				isMaxEvolution: true,
				message: `${poke.pokemon_name} 已经是最终形态`,
				success: true
			};
		}

		const canEvolveNow = poke.level >= evolutionInfo.requiredLevel;

		return {
			canEvolve: evolutionInfo.canEvolve,
			canEvolveNow,
			currentLevel: poke.level,
			currentStage: evolutionInfo.currentStage,
			message: canEvolveNow
				? `${poke.pokemon_name} 可以进化成 ${evolutionInfo.nextEvolution.name}！`
				: `${poke.pokemon_name} 还需要 ${evolutionInfo.requiredLevel - poke.level} 级才能进化`,
			nextEvolution: evolutionInfo.nextEvolution,
			requiredLevel: evolutionInfo.requiredLevel,
			success: true,
			totalStages: evolutionInfo.totalStages
		};
	} catch (error) {
		return { message: error.message, success: false };
	}
};