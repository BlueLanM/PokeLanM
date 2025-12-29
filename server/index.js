import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./config/database.js";
import pokemonRoutes from "./routes/pokemonRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import { initGameTables } from "./models/gameModel.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS 配置 - 允许 GitHub Pages 访问
app.use(cors({

	allowedHeaders: ["Content-Type", "Authorization"],
	// 在开发阶段允许所有来源
	credentials: true,
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	optionsSuccessStatus: 200,
	origin: true
}));
app.use(express.json());

// 测试路由
app.get("/api", (req, res) => {
	res.json({ message: "Hello from Pokemon API!" });
});

// Pokemon API 路由
app.use("/api", pokemonRoutes);

// 游戏路由
app.use("/api", gameRoutes);

app.listen(PORT, async() => {
	console.log(`🚀 Server running on port ${PORT}`);
	// 测试数据库连接
	await testConnection();
	// 初始化游戏表
	await initGameTables();
});