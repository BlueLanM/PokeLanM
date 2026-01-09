import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./config/database.js";
import pokemonRoutes from "./routes/pokemonRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import { initGameTables } from "./models/gameModel.js";
import { preloadGrowthRateData } from "./services/growthRateService.js";

dotenv.config();

const app = express();

// CORS 配置 - 允许所有来源（适配 Vercel）
app.use(cors({
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: true,
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	optionsSuccessStatus: 200,
	origin: true
}));
app.use(express.json());

// 测试路由
app.get("/", (req, res) => {
	res.json({ message: "Pokemon API is running on Vercel!" });
});

app.get("/api", (req, res) => {
	res.json({ message: "Hello from Pokemon API!" });
});

// Pokemon API 路由
app.use("/api", pokemonRoutes);

// 游戏路由
app.use("/api", gameRoutes);

// 初始化标志（避免重复初始化）
let isInitialized = false;

// 初始化函数（只执行一次）
async function initialize() {
	if (isInitialized) return;
	
	try {
		console.log("🚀 Initializing Pokemon API...");
		// 测试数据库连接
		await testConnection();
		// 初始化游戏表
		await initGameTables();
		// 预加载增长率数据
		await preloadGrowthRateData();
		isInitialized = true;
		console.log("✅ Initialization complete!");
	} catch (error) {
		console.error("❌ Initialization failed:", error);
		// 不抛出错误，允许服务继续运行
	}
}

// 在第一次请求时初始化
app.use(async (req, res, next) => {
	if (!isInitialized) {
		await initialize();
	}
	next();
});

// Vercel Serverless 导出
export default app;

// 本地开发模式
if (process.env.NODE_ENV !== 'production') {
	const PORT = process.env.PORT || 5000;
	app.listen(PORT, async() => {
		console.log(`🚀 Server running on port ${PORT}`);
		await initialize();
	});
}
