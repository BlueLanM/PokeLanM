/* eslint-disable sort-keys */
import pg from "pg";
import mysql from "mysql2/promise";

const DB_TYPE = process.env.DB_TYPE || "mysql"; // 默认 MySQL

// MySQL 连接池
let mysqlPool = null;
if (DB_TYPE === "mysql") {
	mysqlPool = mysql.createPool({
		host: process.env.DB_HOST,
		port: parseInt(process.env.DB_PORT) || 3306,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0
	});
}

// PostgreSQL 连接池
let pgPool = null;
if (DB_TYPE === "postgresql") {
	pgPool = new pg.Pool({
		host: process.env.DB_HOST,
		port: parseInt(process.env.DB_PORT) || 5432,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		ssl: {
			rejectUnauthorized: false
		}
	});

	pgPool.on("error", (err) => {
		console.error("PostgreSQL pool error:", err);
	});
}

/**
 * 统一 query 接口
 * 兼容 MySQL 和 PostgreSQL
 */
async function query(sql, params = []) {
	if (DB_TYPE === "mysql") {
		// MySQL 直接返回 [rows, fields]
		return await mysqlPool.execute(sql, params);
	} else {
		// PostgreSQL: 将 ? 转为 $1, $2, $3...
		let index = 1;
		const pgSql = sql.replace(/\?/g, () => `$${index++}`);

		const result = await pgPool.query(pgSql, params);

		// 模拟 MySQL 的 insertId
		if (
			result.command === "INSERT"
			&& result.rows.length > 0
			&& result.rows[0].id
		) {
			result.insertId = result.rows[0].id;
		}

		return [result.rows, result];
	}
}

// 创建一个兼容层
const pool = DB_TYPE === "mysql"
	? {
		query,
		getConnection: () => mysqlPool.getConnection(),
		connect: async() => {
			// MySQL 兼容接口：返回一个包装了 query 方法的对象
			const connection = await mysqlPool.getConnection();
			return {
				query: async(sql, params) => {
					const [rows] = await connection.execute(sql, params);
					return { rows };
				},
				release: () => connection.release()
			};
		},
		end: () => mysqlPool.end()
	}
	: {
		...pgPool,
		query,
		connect: () => pgPool.connect(),
		end: () => pgPool.end(),
		on: (event, callback) => pgPool.on(event, callback)
	};

/**
 * 测试数据库连接
 */
async function testConnection() {
	try {
		if (DB_TYPE === "mysql") {
			const connection = await mysqlPool.getConnection();
			connection.release();
		} else {
			const client = await pgPool.connect();
			client.release();
		}
		return true;
	} catch (error) {
		console.error(
			`${DB_TYPE.toUpperCase()} connection failed:`,
			error.message
		);
		throw error;
	}
}

export default pool;
export { query, testConnection };