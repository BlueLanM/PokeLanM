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
			jsxRuntime: "automatic" // 使用自动 JSX 运行时,不需要手动导入 React
		})
	],
	
	// CSS 预处理器配置
	css: {
		preprocessorOptions: {
			scss: {
				api: 'modern-compiler', // 使用现代编译器 API
				silenceDeprecations: ['legacy-js-api'] // 静默旧版 API 警告
			}
		}
	},
	
	// 构建配置
	build: {
		outDir: '../docs',  // 输出到项目根目录的 docs 文件夹
		assetsDir: 'assets',
		sourcemap: false,
		emptyOutDir: true,
	}
});
