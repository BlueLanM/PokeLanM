import dotenv from "dotenv";
import bcrypt from "bcrypt";
import readline from "readline";
import mysql from "mysql2/promise";

// 加载环境变量
dotenv.config({ path: "./server/.env" });

/**
 * 重置指定用户的密码
 */
async function resetPassword() {
	// 直接创建数据库连接
	const pool = mysql.createPool({
		connectionLimit: 10,
		database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
		host: process.env.MYSQLHOST || process.env.DB_HOST,
		password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
		port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
		queueLimit: 0,
		user: process.env.MYSQLUSER || process.env.DB_USER,
		waitForConnections: true
	});

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	const question = (query) => new Promise((resolve) => rl.question(query, resolve));

	try {
		console.log("\n🔑 密码重置工具\n");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

		// 获取用户名
		const username = await question("请输入要重置密码的用户名: ");

		if (!username) {
			console.log("❌ 用户名不能为空");
			rl.close();
			await pool.end();
			return;
		}

		// 查询用户
		const [users] = await pool.query(
			"SELECT id, name FROM players WHERE name = ?",
			[username]
		);

		if (users.length === 0) {
			console.log(`❌ 未找到用户: ${username}`);
			rl.close();
			await pool.end();
			return;
		}

		const user = users[0];
		console.log(`\n✅ 找到用户: ${user.name} (ID: ${user.id})`);

		// 获取新密码
		const newPassword = await question("\n请输入新密码 (至少4位): ");

		if (!newPassword || newPassword.length < 4) {
			console.log("❌ 密码长度至少4位");
			rl.close();
			await pool.end();
			return;
		}

		// 确认密码
		const confirmPassword = await question("请再次输入新密码确认: ");

		if (newPassword !== confirmPassword) {
			console.log("❌ 两次输入的密码不一致");
			rl.close();
			await pool.end();
			return;
		}

		// 加密并更新密码
		console.log("\n🔄 正在加密密码...");
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		console.log(`   原密码: ${newPassword}`);
		console.log(`   加密后: ${hashedPassword}`);
		console.log(`   长度: ${hashedPassword.length} 字符\n`);

		await pool.query(
			"UPDATE players SET password = ? WHERE id = ?",
			[hashedPassword, user.id]
		);

		console.log("✅ 密码重置成功！\n");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log(`用户名: ${user.name}`);
		console.log(`新密码: ${newPassword}`);
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
	} catch (error) {
		console.error("❌ 重置密码失败:", error);
	} finally {
		rl.close();
		await pool.end();
	}
}

// 执行重置
resetPassword();