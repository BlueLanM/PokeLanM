import pool from "../server/config/database.js";
import bcrypt from "bcrypt";

/**
 * 数据库修复脚本
 * 1. 检查并修复 password 字段长度
 * 2. 重置被截断的密码
 */
async function fixDatabase() {
	const connection = await pool.getConnection();

	try {
		console.log("🔧 开始数据库修复...\n");

		// ===== 第1步: 检查字段信息 =====
		console.log("📋 第1步: 检查当前字段信息");
		const [fields] = await connection.query(`
			SHOW FULL COLUMNS FROM players WHERE Field = 'password'
		`);

		if (fields.length > 0) {
			console.log(`   当前类型: ${fields[0].Type}`);
			console.log(`   允许NULL: ${fields[0].Null}`);
			console.log(`   默认值: ${fields[0].Default}\n`);
		}

		// ===== 第2步: 修改字段长度 =====
		console.log("🔧 第2步: 修改字段长度为 VARCHAR(255)");
		try {
			await connection.query(`
				ALTER TABLE players 
				MODIFY COLUMN password VARCHAR(255) NOT NULL
			`);
			console.log("   ✅ 字段长度修改成功\n");
		} catch (error) {
			if (error.code === "ER_DUP_FIELDNAME") {
				console.log("   ℹ️  字段已是正确类型\n");
			} else {
				throw error;
			}
		}

		// ===== 第3步: 检查受影响的数据 =====
		console.log("📊 第3步: 检查受影响的玩家数据");
		const [players] = await connection.query(`
			SELECT id, name, LENGTH(password) as pwd_length, password
			FROM players 
			ORDER BY id
		`);

		console.log(`   共找到 ${players.length} 个玩家账户\n`);

		const affectedPlayers = players.filter(p =>
			p.password && p.password.length > 0 && p.password.length < 60
		);

		if (affectedPlayers.length > 0) {
			console.log("⚠️  发现密码可能被截断的账户:");
			affectedPlayers.forEach(player => {
				console.log(`   - ID: ${player.id}, 名称: ${player.name}, 密码长度: ${player.pwd_length}`);
			});
			console.log("");

			// ===== 第4步: 重置受影响的密码 =====
			console.log("🔄 第4步: 重置受影响账户的密码");
			console.log("   (密码将重置为: 账户名 + '123456')\n");

			for (const player of affectedPlayers) {
				const newPassword = player.name + "123456"; // 默认密码规则
				const hashedPassword = await bcrypt.hash(newPassword, 10);

				await connection.query(
					"UPDATE players SET password = ? WHERE id = ?",
					[hashedPassword, player.id]
				);

				console.log(`   ✅ 已重置账户: ${player.name} (新密码: ${newPassword})`);
			}
			console.log("");
		} else {
			console.log("✅ 没有发现被截断的密码\n");
		}

		// ===== 第5步: 验证修复结果 =====
		console.log("✅ 第5步: 验证修复结果");
		const [verifyFields] = await connection.query(`
			SHOW FULL COLUMNS FROM players WHERE Field = 'password'
		`);
		console.log(`   字段类型: ${verifyFields[0].Type}`);

		const [verifyPlayers] = await connection.query(`
			SELECT 
				COUNT(*) as total,
				MIN(LENGTH(password)) as min_length,
				MAX(LENGTH(password)) as max_length,
				AVG(LENGTH(password)) as avg_length
			FROM players
			WHERE password IS NOT NULL AND password != ''
		`);

		if (verifyPlayers[0].total > 0) {
			console.log(`   密码记录数: ${verifyPlayers[0].total}`);
			console.log(`   最小长度: ${verifyPlayers[0].min_length}`);
			console.log(`   最大长度: ${verifyPlayers[0].max_length}`);
			console.log(`   平均长度: ${Math.round(verifyPlayers[0].avg_length)}\n`);
		}

		console.log("🎉 修复完成！\n");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log("📝 重要提示:");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log("1. ⚠️  请不要在Railway管理界面直接编辑密码字段！");
		console.log("2. ✅ bcrypt加密后的密码长度固定为60字符");
		console.log("3. ✅ 密码字段已设置为VARCHAR(255)，足够存储");
		console.log("4. 🔑 如需修改密码，请使用以下方式:");
		console.log("   - 通过API接口修改");
		console.log("   - 或运行重置密码脚本");
		if (affectedPlayers.length > 0) {
			console.log("\n5. 🔐 受影响账户的临时密码已重置为: 用户名 + '123456'");
			console.log("   请通知用户登录后修改密码");
		}
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
	} catch (error) {
		console.error("❌ 修复过程出错:", error);
		throw error;
	} finally {
		connection.release();
		await pool.end();
	}
}

// 执行修复
fixDatabase().catch(error => {
	console.error("❌ 脚本执行失败:", error);
	process.exit(1);
});