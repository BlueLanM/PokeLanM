import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./config/database.js";
import pokemonRoutes from "./routes/pokemonRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS 配置 - 允许 GitHub Pages 访问
const allowedOrigins = [
	"https://bluelanm.github.io",
	"http://localhost:5173",
	"http://localhost:3000"
];

const corsOptions = {
	credentials: true,
	optionsSuccessStatus: 200,
	origin: function(origin, callback) {
		// 允许没有 origin 的请求（比如移动应用、Postman）
		if (!origin) return callback(null, true);

		// 如果设置了 CORS_ORIGIN 环境变量，使用它
		if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== "*") {
			return callback(null, process.env.CORS_ORIGIN === origin);
		}

		// 检查是否在允许列表中
		if (allowedOrigins.indexOf(origin) !== -1 || process.env.CORS_ORIGIN === "*") {
			callback(null, true);
		} else {
			callback(null, true); // 暂时允许所有源，生产环境建议限制
		}
	}
};

// 中间件
app.use(cors(corsOptions));
app.use(express.json());

// 测试路由
app.get("/api", (req, res) => {
	res.json({ message: "Hello from Pokemon API!" });
});

// Pokemon API 路由
app.use("/api", pokemonRoutes);

app.listen(PORT, async() => {
	console.log(`🚀 Server running on port ${PORT}`);
	// 测试数据库连接
	await testConnection();
});