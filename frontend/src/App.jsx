import { useState, useEffect } from "react";
import "./App.css";
import Pokemon from "./views/pokemon";
import PokemonGame from "./views/game";
import Auth from "./views/auth";
import Leaderboard from "./views/leaderboard";
import Button from "./components/Button";

function App() {
	// 检查是否已登录
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [player, setPlayer] = useState(null);
	const [currentView, setCurrentView] = useState("game"); // game, pokemon, leaderboard

	useEffect(() => {
		// 检查 localStorage 中是否有玩家信息
		const savedPlayer = localStorage.getItem('player');
		if (savedPlayer) {
			try {
				const playerData = JSON.parse(savedPlayer);
				setPlayer(playerData);
				setIsLoggedIn(true);
			} catch (error) {
				console.error('解析玩家数据失败:', error);
				localStorage.removeItem('player');
			}
		}
	}, []);

	const handleLoginSuccess = (playerData) => {
		setPlayer(playerData);
		setIsLoggedIn(true);
	};

	const handleLogout = () => {
		localStorage.removeItem('player');
		localStorage.removeItem('playerId');
		setPlayer(null);
		setIsLoggedIn(false);
		setCurrentView('game');
	};

	// 如果未登录,显示登录界面
	if (!isLoggedIn) {
		return <Auth onLoginSuccess={handleLoginSuccess} />;
	}

	// 已登录,根据当前视图显示不同页面
	if (currentView === "pokemon") {
		return (
			<div className="app">
				<div className="app-header">
					<Button onClick={() => setCurrentView("game")}>← 返回游戏</Button>
					<Button onClick={() => setCurrentView("leaderboard")}>🏆 排行榜</Button>
					<Button onClick={handleLogout} className="logout-btn">退出登录</Button>
				</div>
				<Pokemon />
			</div>
		);
	}

	if (currentView === "leaderboard") {
		return (
			<div className="app">
				<div className="app-header">
					<Button onClick={() => setCurrentView("game")}>← 返回游戏</Button>
					<Button onClick={() => setCurrentView("pokemon")}>⚙️ 管理系统</Button>
					<Button onClick={handleLogout} className="logout-btn">退出登录</Button>
				</div>
				<Leaderboard currentPlayer={player} />
			</div>
		);
	}

	// 默认显示游戏页面
	return (
		<div className="app">
			<div className="app-header">
				<Button onClick={() => setCurrentView("pokemon")}>⚙️ 管理系统</Button>
				<Button onClick={() => setCurrentView("leaderboard")}>🏆 排行榜</Button>
				<Button onClick={handleLogout} className="logout-btn">退出登录</Button>
			</div>
			<PokemonGame />
		</div>
	);
}

export default App;
