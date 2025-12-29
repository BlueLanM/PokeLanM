import { useState } from "react";
import "./App.css";
import Pokemon from "./views/pokemon";
import PokemonGame from "./views/game";
import Button from "./components/Button";

function App() {
	// 默认显示游戏页面
	const [currentView, setCurrentView] = useState("game");

	if (currentView === "pokemon") {
		return (
			<div className="app">
				<div className="app-header">
					<Button onClick={() => setCurrentView("game")}>← 返回游戏</Button>
				</div>
				<Pokemon />
			</div>
		);
	}

	// 默认显示游戏页面
	return (
		<div className="app">
			<div className="app-header">
				<Button onClick={() => setCurrentView("pokemon")}>
					⚙️ 管理系统
				</Button>
			</div>
			<PokemonGame />
		</div>
	);
}

export default App;
