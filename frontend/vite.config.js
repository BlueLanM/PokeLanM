import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
	// GitHub Pages 部署配置
	base: process.env.NODE_ENV === 'production' ? '/pokemon-nodejs/' : '/',
	
	esbuild: {
		jsxInject: "import React from 'react'" // 自动注入 React 导入
	},
	plugins: [
		react({
			jsxRuntime: "automatic" // 使用自动 JSX 运行时，不需要手动导入 React
		})
	],
	
	// 构建配置
	build: {
		outDir: 'docs',
		assetsDir: 'assets',
		sourcemap: false,
	}
});
