import pkg from "pg";
import dotenv from "dotenv";
const { Pool } = pkg;

dotenv.config();

// 创建 PostgreSQL 连接池
// 支持 Supabase 和 Render 的环境变量
const pool = new Pool({
	host: process.env.DB_HOST || "localhost",
	port: parseInt(process.env.DB_PORT) || 5432,
	user: process.env.DB_USER || "postgres",
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME || "postgres",
	ssl: process.env.DB_SSL === "true" ? {
		rejectUnauthorized: false,
		// Supabase 需要的额外配置
		require: true
	} : false,
	max: 10, // 最大连接数
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 10000, // 增加超时时间到 10 秒
	statement_timeout: 30000, // SQL 语句超时时间
	query_timeout: 30000,
	// Supabase Pooler 的额外配置
	keepAlive: true,
	keepAliveInitialDelayMillis: 10000
});

// 初始化数据库表
export async function initializeDatabase() {
	const client = await pool.connect();
	try {
		// 创建 pokemons 表
		const createTableSQL = `
			CREATE TABLE IF NOT EXISTS pokemons (
				id SERIAL PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				type VARCHAR(100),
				hp INTEGER,
				attack INTEGER,
				defense INTEGER,
				speed INTEGER,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`;

		await client.query(createTableSQL);
		console.log("✅ 数据表初始化成功!");

		// 检查是否有数据，如果没有则插入示例数据
		const countResult = await client.query("SELECT COUNT(*) as count FROM pokemons");
		if (parseInt(countResult.rows[0].count) === 0) {
			const insertSQL = `
				INSERT INTO pokemons (name, type, hp, attack, defense, speed) VALUES
				('皮卡丘', '电', 35, 55, 40, 90),
				('妙蛙种子', '草/毒', 45, 49, 49, 45),
				('小火龙', '火', 39, 52, 43, 65),
				('杰尼龟', '水', 44, 48, 65, 43)
			`;
			await client.query(insertSQL);
			console.log("✅ 示例数据插入成功!");
		}

		return true;
	} catch (error) {
		console.error("❌ 数据库初始化失败:", error.message);
		throw error;
	} finally {
		client.release();
	}
}

// 测试数据库连接
export async function testConnection() {
	try {
		const client = await pool.connect();
		console.log("✅ PostgreSQL 数据库连接成功!");
		const dbName = process.env.DB_NAME || "postgres";
		console.log(`📦 数据库: ${dbName}`);
		client.release();

		// 自动初始化数据库表
		await initializeDatabase();

		return true;
	} catch (error) {
		console.error("❌ PostgreSQL 数据库连接失败:", error.message);
		console.error("详细错误:", error);
		return false;
	}
}

// 执行查询 (兼容 mysql2 的接口)
export async function query(sql, params = []) {
	try {
		const result = await pool.query(sql, params);
		return result.rows;
	} catch (error) {
		console.error("数据库查询错误:", error);
		throw error;
	}
}

export default pool;