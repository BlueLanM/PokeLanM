import { useState, useEffect } from "react";
import * as gameAPI from "../../api/game";
import Tilt from 'react-parallax-tilt';
import Message from "../../components/Message";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import Pokedex from "../pokedex";
import "./index.scss";

// 经验值表缓存（从 PokeAPI growth-rate/2 加载）
let expTableCache = null;

// 加载经验值表
const loadExpTable = async () => {
	if (!expTableCache) {
		try {
			const data = await gameAPI.getExpTable(1, 100);
			expTableCache = data.expTable || [];
		} catch (error) {
			console.error('加载经验值表失败:', error);
			expTableCache = [];
		}
	}
	return expTableCache;
};

// 根据等级获取该等级所需的总经验值
const getExpForLevel = (level) => {
	if (!expTableCache || expTableCache.length === 0) return 0;
	const levelData = expTableCache.find(l => l.level === level);
	return levelData ? levelData.experience : 0;
};

// 格式化经验值显示（当前级别进度/升级所需经验）
// 显示方式：当前级别进度 / 本级升级所需经验
const formatExpDisplay = (levelExp, currentLevel) => {
	if (currentLevel >= 100) return '满级';
	
	// 如果经验值表还没加载，返回当前级别进度
	if (!expTableCache || expTableCache.length === 0) {
		return `${levelExp || 0}`;
	}
	
	// 获取当前等级和下一等级所需的累积总经验
	const currentLevelTotalExp = getExpForLevel(currentLevel);
	const nextLevelTotalExp = getExpForLevel(currentLevel + 1);
	
	// 如果获取不到数据，返回当前级别进度
	if (nextLevelTotalExp === 0) {
		return `${levelExp || 0}`;
	}
	
	// 计算本级升级所需经验（下一级总经验 - 当前级总经验）
	const expNeededForNextLevel = nextLevelTotalExp - currentLevelTotalExp;
	
	// 显示格式：当前级别进度 / 本级升级所需经验
	// 例如：level=10时，显示 100/1000 (表示当前级别有100经验，还需要900经验升到level 11)
	return `${levelExp || 0}/${expNeededForNextLevel}`;
};

const PokemonGame = () => {
	const [player, setPlayer] = useState(null);
	const [currentView, setCurrentView] = useState("home");
	const [wildPokemon, setWildPokemon] = useState(null);
	const [inBattle, setInBattle] = useState(false);
	const [battleLog, setBattleLog] = useState([]);
	const [playerParty, setPlayerParty] = useState([]);
	const [selectedPokemon, setSelectedPokemon] = useState(null);
	const [storage, setStorage] = useState([]);
	const [items, setItems] = useState([]);
	const [badges, setBadges] = useState([]); // 玩家徽章
	const [gyms, setGyms] = useState([]);
	const [currentGym, setCurrentGym] = useState(null);
	const [shopItems, setShopItems] = useState([]);
	const [showModal, setShowModal] = useState(false);
	const [loading, setLoading] = useState(false);
	const [catchAttempts, setCatchAttempts] = useState(0); // 捕捉尝试次数
	const [isAttacking, setIsAttacking] = useState(false); // 防止重复攻击
	const [isCatching, setIsCatching] = useState(false); // 防止重复捕捉
	const [isSelectingStarter, setIsSelectingStarter] = useState(false); // 防止重复选择初始精灵
	const [maps, setMaps] = useState([]); // 地图列表
	const [currentMap, setCurrentMapState] = useState(null); // 当前地图

	// 初始化或加载玩家
	useEffect(() => {
		// 加载经验值表
		loadExpTable();
		
		// 优先使用新的 playerId，兼容旧的 pokemonGamePlayerId
		const savedPlayerId = localStorage.getItem("playerId") || localStorage.getItem("pokemonGamePlayerId");
		if (savedPlayerId) {
			// 检查是否需要数据迁移（针对当前玩家）
			const migrated = localStorage.getItem(`partyDataMigrated_${savedPlayerId}`);
			if (!migrated) {
				loadPlayer(savedPlayerId, true); // 第一次加载时进行迁移
				localStorage.setItem(`partyDataMigrated_${savedPlayerId}`, "true");
			} else {
				loadPlayer(savedPlayerId);
			}
			
			// 加载道馆数据以获取总数
			loadGymsData();
		}
	}, []);

	const loadPlayer = async (playerId, needMigrate = false) => {
		try {
			// 如果需要迁移,先执行迁移
			if (needMigrate) {
				await gameAPI.migratePartyData(playerId);
			}

			const data = await gameAPI.getPlayerInfo(playerId);
			setPlayer(data.player);
			setPlayerParty(data.party || []);
			setItems(data.items || []);
			setBadges(data.badges || []); // 加载徽章数据

			// 同时加载地图状态
			await loadMaps(playerId);
		} catch (error) {
			console.error("加载玩家数据错误:", error);
			Message.error("加载玩家数据失败");
		}
	};

	// 加载地图列表和状态
	const loadMaps = async (playerId) => {
		try {
			const data = await gameAPI.getPlayerMapsStatus(playerId);
			setMaps(data.maps || []);
			// 找到当前选中的地图
			const current = data.maps?.find(m => m.isCurrent);
			if (current) {
				setCurrentMapState(current);
			} else {
				// 如果没有当前地图，自动选择新手村（第一个已解锁的地图）
				const firstUnlockedMap = data.maps?.find(m => m.isUnlocked);
				if (firstUnlockedMap) {
					try {
						const switchResult = await gameAPI.switchMap(playerId, firstUnlockedMap.id);
						if (switchResult.success) {
							setCurrentMapState(switchResult.map);
						}
					} catch (error) {
						console.error("自动切换地图失败:", error);
					}
				}
			}
		} catch (error) {
			console.error("加载地图失败:", error);
		}
	};

	// 切换地图
	const handleSwitchMap = async (mapId) => {
		try {
			const data = await gameAPI.switchMap(player.id, mapId);
			if (data.success) {
				Message.success(data.message);
				setCurrentMapState(data.map);
				await loadMaps(player.id);
			}
		} catch (error) {
			Message.error(error.error || "切换地图失败");
		}
	};

	// 尝试解锁地图
	const handleUnlockMap = async (mapId) => {
		try {
			const data = await gameAPI.unlockMap(player.id, mapId);
			if (data.success) {
				Message.success(data.message);
				await loadMaps(player.id);
			}
		} catch (error) {
			Message.error(error.error || "解锁失败");
		}
	};


	// 探索功能
	const handleExplore = async () => {
		setLoading(true);
		try {
			// 传递玩家ID和宝可梦等级
			const playerLevel = playerParty.length > 0 ? playerParty[0].level : 5;
			const data = await gameAPI.explore(player.id, playerLevel);
			setWildPokemon(data.pokemon);
			setInBattle(true);
			setCatchAttempts(0); // 重置捕捉次数

			// 更新当前地图信息(如果返回了地图数据)
			if (data.currentMap) {
				setCurrentMapState(data.currentMap);
			}

			// 如果玩家有宝可梦，进入战斗模式
			if (playerParty.length > 0) {
				setBattleLog([data.message]);
				setSelectedPokemon({ ...playerParty[0] }); // 背包只有一只精灵
			} else {
				// 如果没有宝可梦，只能捕捉
				setBattleLog([data.message, "你还没有宝可梦，只能尝试捕捉！"]);
				setSelectedPokemon(null);
			}

			setCurrentView("battle");
		} catch (error) {
			Message.error("探索失败");
		} finally {
			setLoading(false);
		}
	};

	// 捕捉宝可梦
	const handleCatch = async (pokeballTypeId) => {
		// 防止重复捕捉
		if (isCatching) {
			return;
		}

		setIsCatching(true);
		try {
			// 检查宝可梦血量是否大于0
			if (wildPokemon.hp <= 0) {
				Message.error("宝可梦已经失去战斗能力，无法捕捉！");
				setIsCatching(false);
				return;
			}
			const data = await gameAPI.catchPokemon(player.id, wildPokemon, pokeballTypeId, selectedPokemon?.id);

			if (data.success) {
				if (data.caught) {
					// 捕捉成功 - 构建包含经验和金币奖励的信息
					let catchMessage = data.message;

					// 显示金币奖励
					if (data.catchReward) {
						catchMessage += `\n💰 获得 ${data.catchReward} 金币`;
					}

					// 显示经验奖励
					if (data.expResult && selectedPokemon) {
						catchMessage += `\n⭐ ${selectedPokemon.pokemon_name} 获得 ${data.expResult.expGained} 经验值`;
						if (data.expResult.leveledUp) {
							catchMessage += `\n🎊 升到了 Lv.${data.expResult.newLevel}！`;
							catchMessage += `\n📈 HP +${data.expResult.hpGained}, 攻击 +${data.expResult.attackGained}`;
						}
					}

					// 更新战斗日志,显示完整信息
					setBattleLog([...battleLog, catchMessage]);
					Message.success(catchMessage);
					setInBattle(false);
					setWildPokemon(null);
					setCatchAttempts(0);
					setCurrentView("home");
					await loadPlayer(player.id);
				} else {
					// 捕捉失败
					const newAttempts = catchAttempts + 1;
					setCatchAttempts(newAttempts);

					if (newAttempts >= 3) {
						// 三次都失败,返回主页
						setBattleLog([...battleLog, data.message, "宝可梦逃跑了！"]);
						Message.warning("捕捉失败，宝可梦逃跑了！");
						setInBattle(false);
						setWildPokemon(null);
						setCatchAttempts(0);
						setCurrentView("home");
						await loadPlayer(player.id);
					} else {
						// 还有机会，继续尝试
						setBattleLog([...battleLog, data.message]);
						Message.warning(data.message);
						await loadPlayer(player.id);
					}
				}
			} else {
				// 没有精灵球等错误
				Message.error(data.message);
				await loadPlayer(player.id);
			}
		} catch (error) {
			Message.error("捕捉失败: " + (error.message || "未知错误"));
			console.error("捕捉错误:", error);
		} finally {
			setIsCatching(false);
		}
	};

	// 攻击
	const handleAttack = async (isGym = false, attackType = "random") => {
		// 防止重复点击
		if (isAttacking) {
			return;
		}

		setIsAttacking(true);
		try {
			const data = await gameAPI.attack(
				selectedPokemon,
				isGym ? currentGym : wildPokemon,
				isGym,
				attackType
			);

			setBattleLog([...battleLog, ...data.battleLog]);

			if (data.battleEnd) {
				if (data.victory) {
					// 构建胜利信息
					const expInfo = data.expResult;
					let victoryMessage = `🎉 战斗胜利！\n💰 获得 ${data.reward} 金币`;

					if (expInfo) {
						victoryMessage += `\n⭐ 获得 ${expInfo.expGained} 经验值`;
						if (expInfo.leveledUp) {
							victoryMessage += `\n🎊 ${selectedPokemon.pokemon_name} 升到了 Lv.${expInfo.newLevel}！`;
							victoryMessage += `\n📈 HP +${expInfo.newMaxHp - selectedPokemon.max_hp}, 攻击 +${expInfo.newAttack - selectedPokemon.attack}`;
						}
					}

					Message.success(victoryMessage);

					if (isGym) {
						await gameAPI.earnBadge(player.id, currentGym.id);
					}
					// 不再在前端直接更新金币，而是从服务器重新加载数据
				} else {
					Message.error("战斗失败！");
				}
				// 战斗结束后返回主页
				setInBattle(false);
				setCurrentView("home");
				if (isGym) {
					setCurrentGym(null);
				} else {
					setWildPokemon(null);
				}
				// 重新加载玩家数据，从数据库获取更新后的金币
				await loadPlayer(player.id);
			} else {
				setSelectedPokemon(data.playerPokemon);
				if (isGym) {
					setCurrentGym(data.enemyPokemon);
				} else {
					setWildPokemon(data.enemyPokemon);
				}
			}
		} catch (error) {
			Message.error("攻击失败");
			// 攻击失败时也返回主页
			setInBattle(false);
			setCurrentView("home");
			setCurrentGym(null);
			setWildPokemon(null);
		} finally {
			// 确保释放锁定状态
			setIsAttacking(false);
		}
	};

	// 逃跑
	const handleRun = () => {
		setInBattle(false);
		setWildPokemon(null);
		setCurrentGym(null);
		setBattleLog([]);
		setCatchAttempts(0);
		setCurrentView("home");
		Message.info("你逃跑了！");
	};

	// 加载道馆数据(仅获取数据,不切换视图)
	const loadGymsData = async () => {
		try {
			const data = await gameAPI.getGyms();
			setGyms(data.gyms);
		} catch (error) {
			console.error("加载道馆数据失败:", error);
		}
	};

	// 加载道馆(切换到道馆视图)
	const loadGyms = async () => {
		try {
			const data = await gameAPI.getGyms();
			setGyms(data.gyms);
			setCurrentView("gyms");
		} catch (error) {
			Message.error("加载道馆失败");
		}
	};

	// 挑战道馆
	const handleChallengeGym = async (gym) => {
		if (playerParty.length === 0) {
			Message.error("你需要至少一只宝可梦才能挑战道馆！");
			return;
		}

		try {
			const data = await gameAPI.challengeGym(gym.id);
			setCurrentGym({ ...data.gym });
			setSelectedPokemon({ ...playerParty[0] }); // 背包只有一只精灵
			setInBattle(true);
			setBattleLog([data.message]);
			setCurrentView("battle");
		} catch (error) {
			Message.error("挑战道馆失败");
		}
	};

	// 加载商店
	const loadShop = async () => {
		try {
			const data = await gameAPI.getShopItems();
			setShopItems(data.items);
			setCurrentView("shop");
		} catch (error) {
			Message.error("加载商店失败");
		}
	};

	// 购买物品
	const handleBuy = async (item, quantity) => {
		try {
			const data = await gameAPI.buyItem(player.id, item.id, quantity);
			Message.success(data.message, 1000);
			setPlayer({ ...player, money: data.money });
			loadPlayer(player.id);
		} catch (error) {
			Message.error(error.error || "购买失败");
		}
	};

	// 加载仓库
	const loadStorage = async () => {
		try {
			const data = await gameAPI.getStorage(player.id);
			setStorage(data.storage);
			setCurrentView("storage");
		} catch (error) {
			Message.error("加载仓库失败");
		}
	};

	// 切换主战精灵(从仓库)
	const handleSwitchMainPokemon = async (storagePokemon) => {
		try {
			// 调用API进行切换
			const data = await gameAPI.switchMainPokemon(player.id, storagePokemon.id);
			Message.success(data.message);
			// 刷新数据
			await loadPlayer(player.id);
			await loadStorage();
		} catch (error) {
			Message.error(error.error || "切换失败");
		}
	};

	// 选择初始宝可梦
	const handleSelectStarter = async (starter) => {
		// 防止重复选择
		if (isSelectingStarter) {
			return;
		}

		setIsSelectingStarter(true);
		try {
			const starterPokemon = {
				id: starter.id,
				name: starter.name,
				sprite: `https://raw.githubusercontent.com/NightCatSama/pokedex/main/images/gif/${starter.id}.gif`,
				level: 5,
				hp: 45,
				max_hp: 45,
				attack: 15
			};

			// 使用专门的选择初始精灵API，100%成功，不消耗精灵球
			const result = await gameAPI.selectStarter(player.id, starterPokemon);

			if (result.success && result.caught) {
				Message.success(`恭喜！你选择了 ${starter.name}！`);
				// 重新加载玩家数据，确保背包更新
				await loadPlayer(player.id);
			} else {
				Message.error(result.error || "选择失败，请重试");
			}
		} catch (error) {
			console.error("选择初始精灵错误:", error);
			Message.error(error.error || "选择失败，请重试");
		} finally {
			setIsSelectingStarter(false);
		}
	};

	// 如果没有玩家数据，显示加载中（正常情况下不会出现，因为已经通过登录界面）
	if (!player) {
		return (
			<div className="pokemon-game">
				<div className="create-player">
					<h1>🎮 宝可梦游戏</h1>
					<p>正在加载游戏数据...</p>
				</div>
			</div>
		);
	}

	// 渲染选择初始宝可梦界面
	if (player && playerParty.length === 0 && items.length > 0) {
		const starters = [
			{ id: 4, name: "小火龙", nameEn: "Charmander", sprite: "https://raw.githubusercontent.com/NightCatSama/pokedex/main/images/gif/4.gif", type: "火系", desc: "尾巴上的火焰是它生命力的象征" },
			{ id: 1, name: "妙蛙种子", nameEn: "Bulbasaur", sprite: "https://raw.githubusercontent.com/NightCatSama/pokedex/main/images/gif/1.gif", type: "草系", desc: "背上背着的种子储存着营养" },
			{ id: 7, name: "杰尼龟", nameEn: "Squirtle", sprite: "https://raw.githubusercontent.com/NightCatSama/pokedex/main/images/gif/7.gif", type: "水系", desc: "龟壳可以减轻受到的伤害" }
		];

		return (
			<div className="pokemon-game">
				<div className="starter-selection">
					<h1>🎮 选择你的初始宝可梦</h1>
					<p className="starter-intro">在开始冒险之前，请选择一只宝可梦作为你的伙伴！</p>

					<div className="starters-grid">
						{starters.map((starter) => (
							<div key={starter.id} className="starter-card">
								<div className="starter-header">
									<h2>{starter.name}</h2>
									<span className="starter-type">{starter.type}</span>
								</div>
								<img src={starter.sprite} alt={starter.name} className="starter-image" />
								<p className="starter-name-en">{starter.nameEn}</p>
								<p className="starter-desc">{starter.desc}</p>
								<Button onClick={() => handleSelectStarter(starter)}>
									选择 {starter.name}
								</Button>
							</div>
						))}
					</div>

					<p className="starter-tip">💡 提示：每只宝可梦都有独特的特点，选择你最喜欢的吧！</p>
				</div>
			</div>
		);
	}

	// 渲染战斗界面
	if (inBattle && currentView === "battle") {
		const enemy = currentGym || wildPokemon;
		const isGym = !!currentGym;
		const hasPlayerPokemon = selectedPokemon !== null;

		return (
			<div className="pokemon-game">
				<div className="battle-screen">
					<h2>{hasPlayerPokemon ? '⚔️ 战斗中' : '🎯 遇到野生宝可梦'}</h2>

					<div className={hasPlayerPokemon ? "battle-area" : "battle-area-single"}>
						<div className="pokemon-display enemy">
							<h3>{enemy.pokemon_name || enemy.name} <span style={{ fontSize: '14px', color: '#888' }}>Lv.{enemy.level || 10}</span></h3>
							<img src={enemy.pokemon_sprite || enemy.sprite} alt={enemy.name} />
							<div className="hp-bar">
								<div className="hp-fill" style={{ width: `${(enemy.hp / enemy.max_hp) * 100}%` }}></div>
							</div>
							<p>HP: {enemy.hp} / {enemy.max_hp}</p>
							<p>攻击: {enemy.attack}</p>
						</div>

						{hasPlayerPokemon && (
							<div className="pokemon-display player">
								<h3>{selectedPokemon.pokemon_name} <span style={{ fontSize: '14px', color: '#888' }}>Lv.{selectedPokemon.level || 5}</span></h3>
								<img src={selectedPokemon.pokemon_sprite || `https://raw.githubusercontent.com/NightCatSama/pokedex/main/images/gif/${selectedPokemon.pokemon_id}.gif`} alt={selectedPokemon.pokemon_name} />
								<div className="hp-bar">
									<div className="hp-fill" style={{ width: `${(selectedPokemon.hp / selectedPokemon.max_hp) * 100}%` }}></div>
								</div>
								<p>HP: {selectedPokemon.hp} / {selectedPokemon.max_hp}</p>
								<p>攻击: {selectedPokemon.attack}</p>
								<p>EXP: {formatExpDisplay(selectedPokemon.level_exp || 0, selectedPokemon.level || 5)}</p>
							</div>
						)}
					</div>

					<div className="battle-log">
						{battleLog.map((log, index) => (
							<p key={index}>{log}</p>
						))}
					</div>

					<div className="battle-actions">
						{hasPlayerPokemon && (
							<>
								<Button onClick={() => handleAttack(isGym, "random")}>⚔️ 攻击</Button>
								<Button onClick={() => handleAttack(isGym, "fixed")}>🎯 宽恕</Button>
							</>
						)}
						{!isGym && (
							<Button onClick={() => {
								setShowModal(true);
							}}>💫 捕捉</Button>
						)}
						<Button onClick={handleRun}>🏃 {hasPlayerPokemon ? '逃跑' : '离开'}</Button>
					</div>
				</div>

			<Modal
				visible={showModal}
				title="选择精灵球"
				onCancel={() => setShowModal(false)}
				footer={false}
			>
				<div className="pokeball-list">
					{wildPokemon && items.filter(item => item.quantity > 0).length > 0 ? (
							items.filter(item => item.quantity > 0).map((item) => {
								// 计算实际捕捉概率（与后端逻辑保持一致）
								const ballMultiplierValues = {
									1: 1.0,   // 精灵球
									2: 1.5,   // 超级球
									3: 2.0,   // 高级球
									4: 100.0  // 大师球
								};
								const ballMultiplier = ballMultiplierValues[item.pokeball_type_id] || 1.0;
								
								// 获取宝可梦基础捕捉率（从pokemon对象）
								// catchRate 格式为 "5.9%" 这样的字符串，parseFloat会提取数字部分
								const catchRateStr = wildPokemon.catchRate || "5.9%";
								const pokemonCatchRate = parseFloat(catchRateStr) / 100 || 0.059;
								
								// 计算血量加成
								const hpPercentage = wildPokemon.hp / wildPokemon.max_hp;
								const hpBonus = (1 - hpPercentage) * 0.3;
								
								// 计算最终捕捉率（与后端逻辑一致）
								const baseCatchRate = pokemonCatchRate * ballMultiplier;
								// 大师球必中，其他球最高98%捕捉率
								const finalCatchRate = item.pokeball_type_id === 4 ? 1.0 : Math.min(baseCatchRate + hpBonus, 0.98);
								const catchPercentage = (finalCatchRate * 100).toFixed(1);
								
								// 显示倍率文本
								const ballMultipliers = {
									1: "1.0倍",
									2: "1.5倍",
									3: "2.0倍",
									4: "必中"
								};
								const multiplier = ballMultipliers[item.pokeball_type_id] || "1.0倍";
							
							return (
								<div key={item.pokeball_type_id} className="pokeball-item">
									{item.image && (
										<img 
											src={item.image} 
											alt={item.name} 
											className="pokeball-image"
											style={{ width: '48px', height: '48px', margin: '0 auto 10px' }}
										/>
									)}
									<p><strong>{item.name}</strong> (x{item.quantity})</p>
									<p>捕捉加成: {multiplier}</p>
									<p style={{ color: '#4CAF50', fontWeight: 'bold' }}>
										实际成功率: {item.pokeball_type_id === 4 ? '100%' : `${catchPercentage}%`}
									</p>
									<Button
										onClick={() => {
											handleCatch(item.pokeball_type_id);
											setShowModal(false);
										}}
									>
										使用
									</Button>
								</div>
							);
						})
					) : (
						<p style={{ padding: "20px", textAlign: "center" }}>
							你没有精灵球了！<br />
							请先去商店购买精灵球。
						</p>
					)}
				</div>
			</Modal>
			</div>
		);
	}

	// 渲染主界面
	return (
		<div className="pokemon-game">
			<div className="game-header">
				<h1>🎮 宝可梦冒险</h1>
				<div className="player-info">
					<p>👤 {player.name}</p>
					<p>💰 {player.money} 金币</p>
				</div>
			</div>

			{currentView === "home" && (
				<div className="home-view">
					<div className="home-main-content">
						<div className="home-left">
							<div className="menu-grid">
								<Button onClick={handleExplore} loading={loading}>
									🔍 探索
								</Button>
								<Button onClick={loadGyms}>🏛️ 道馆</Button>
								<Button onClick={loadShop}>🏪 商店</Button>
								<Button onClick={() => setCurrentView("party")}>
									🎒 背包 ({playerParty.length}/1)
								</Button>
								<Button onClick={loadStorage}>📦 仓库</Button>
								<Button onClick={() => setCurrentView("pokedex")}>📖 图鉴</Button>
							</div>

							<div className="info-section">
								<h3>我的精灵球</h3>
								<div className="items-list">
									{items.map((item) => (
										<div key={item.pokeball_type_id} className="item-display">
											{item.image && (
												<img 
													src={item.image} 
													alt={item.name} 
													style={{ width: '32px', height: '32px', marginRight: '10px', verticalAlign: 'middle' }}
												/>
											)}
											<span>{item.name}: {item.quantity}</span>
										</div>
									))}
								</div>
							</div>

							<div className="info-section">
								<h3>🏆 我的徽章 ({badges.length}/{gyms.length || 5})</h3>
								{badges.length > 0 ? (
									<div className="badges-list">
										{badges.map((badge) => (
											<Tilt  
												tiltMaxAngleX={15}
												iltMaxAngleY={15} 
												transitionSpeed={400} 
												perspective={600}
												glareEnable={true} 
												glareMaxOpacity={0.9} 
												glareColor="white" 
												glarePosition="all" 
												glareBorderRadius="12px"
												key={badge.id} 
												className="badge-item"
											>
												{badge.badge_image ? (
													<img 
														src={badge.badge_image} 
														alt={badge.badge_name}
														className="badge-item-icon"
														style={{ 
															width: "60px", 
															height: "60px", 
															
														}}
													/>
												) : (
													<span className="badge-item-icon">🏅</span>
												)}
												<div className="badge-info">
													<strong>{badge.badge_name}</strong>
													<p className="badge-gym">{badge.gym_name}</p>
													<p className="badge-date">{new Date(badge.earned_at).toLocaleDateString('zh-CN')}</p>
												</div>
											</Tilt>
										))}
									</div>
								) : (
									<p style={{ padding: "10px", color: "#999", textAlign: "center" }}>
										还没有获得徽章，去挑战道馆吧！
									</p>
								)}
							</div>
						</div>

						<div className="home-right">
							<div className="maps-section">
								<h3>🗺️ 冒险地图</h3>
								{currentMap && (
									<div className="current-map-info">
										<p><strong>当前地图:</strong> {currentMap.name}</p>
										<p><small>{currentMap.description}</small></p>
										<p>🎯 等级范围: Lv.{currentMap.min_level} - Lv.{currentMap.max_level}</p>
										<p>💰 奖励倍率: {currentMap.reward_multiplier}x</p>
									</div>
								)}
								
									<div className="maps-list">
										{maps.map((map) => {
											const isCurrentMap = currentMap?.id === map.id;
											const canSwitch = map.isUnlocked && !isCurrentMap;
											
											// 解析解锁条件文本和检查是否可以解锁
											let unlockText = "";
											let canUnlock = false;
											if (!map.isUnlocked) {
												if (map.unlock_condition === "level") {
													const mainLevel = playerParty.length > 0 ? playerParty[0].level : 0;
													canUnlock = mainLevel >= map.unlock_value;
													unlockText = canUnlock 
														? `满足等级要求！点击解锁` 
														: `需要等级${map.unlock_value} (当前: ${mainLevel})`;
												} else if (map.unlock_condition === "badges") {
													canUnlock = badges.length >= map.unlock_value;
													unlockText = canUnlock
														? `满足徽章要求！点击解锁`
														: `需要${map.unlock_value}个徽章 (当前: ${badges.length})`;
												} else if (map.unlock_condition === "none") {
													canUnlock = true;
													unlockText = "点击解锁";
												}
											}
											
											return (
												<div 
													key={map.id} 
													className={`map-card ${isCurrentMap ? 'map-current' : ''} ${!map.isUnlocked ? 'map-locked' : ''}`}
												>
													{isCurrentMap && <span className="map-badge-current">📍 当前</span>}
													{map.isUnlocked && !isCurrentMap && <span className="map-badge-unlocked">✅</span>}
													{!map.isUnlocked && <span className="map-badge-locked">🔒</span>}
												
												<h4>{map.name}</h4>
												<p style={{ fontSize: '12px', color: '#888', margin: '5px 0' }}>{map.description}</p>
												<p style={{ fontSize: '13px' }}>
													<span style={{ color: '#4CAF50' }}>Lv.{map.min_level}-{map.max_level}</span>
													{' | '}
													<span style={{ color: '#FFA726' }}>{map.reward_multiplier}x奖励</span>
												</p>
													
													{!map.isUnlocked && (
														<>
															<p style={{ fontSize: '12px', color: canUnlock ? '#4CAF50' : '#ff9800', marginTop: '5px' }}>
																{unlockText}
															</p>
															{canUnlock && (
																<Button 
																	size="small" 
																	onClick={() => handleUnlockMap(map.id)}
																	style={{ marginTop: '8px', width: '100%' }}
																>
																	🔓 解锁地图
																</Button>
															)}
														</>
													)}
												
												{canSwitch && (
													<Button 
														size="small" 
														onClick={() => handleSwitchMap(map.id)}
														style={{ marginTop: '8px', width: '100%' }}
													>
														切换到此地图
													</Button>
												)}
											</div>
										);
									})}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{currentView === "party" && (
					<div className="party-view">
						<h2>🎒 我的背包 (主战精灵)</h2>
						<Button onClick={() => setCurrentView("home")}>返回</Button>
						<div className="pokemon-grid">
							{playerParty.length > 0 ? (
								<Tilt tiltMaxAngleX={15} tiltMaxAngleY={15} scale={1} transitionSpeed={400} perspective={600} className="pokemon-card main-pokemon">
									<div className="main-badge">⭐ 主战</div>
									<img src={playerParty[0].pokemon_sprite || `https://raw.githubusercontent.com/NightCatSama/pokedex/main/images/gif/${playerParty[0].pokemon_id}.gif`} alt={playerParty[0].pokemon_name} />
									<h3>{playerParty[0].pokemon_name}</h3>
									<p>等级: Lv.{playerParty[0].level}</p>
									<p>HP: {playerParty[0].hp}/{playerParty[0].max_hp}</p>
									<p>攻击: {playerParty[0].attack}</p>
									<p>经验: {formatExpDisplay(playerParty[0].level_exp || 0, playerParty[0].level)}</p>
									{playerParty[0].level >= 100 && <p className="max-level">⭐ 满级</p>}
								</Tilt>
						) : (
							<p style={{ padding: "20px", textAlign: "center", color: "#999" }}>
								背包为空，请先捕捉或从仓库选择一只宝可梦
							</p>
						)}
					</div>
				</div>
			)}

			{currentView === "storage" && (
				<div className="storage-view">
					<h2>📦 仓库</h2>
					<Button onClick={() => setCurrentView("home")}>返回</Button>
					{storage.length > 0 ? (
						<div className="pokemon-grid">
							{storage.map((pokemon) => {
								// 仓库使用正常图片
								const normalSprite = pokemon.pokemon_sprite || `https://raw.githubusercontent.com/NightCatSama/pokedex/main/images/detail/${pokemon.pokemon_id}.png`;
								return (
									<Tilt 
										tiltMaxAngleX={15} 
										tiltMaxAngleY={15} 
										transitionSpeed={400} 
										perspective={500} 
										key={pokemon.id} 
										className="pokemon-card"
									>
										<img src={normalSprite} alt={pokemon.pokemon_name} />
										<h3>{pokemon.pokemon_name}</h3>
										<p>HP: {pokemon.hp}/{pokemon.max_hp}</p>
										<p>攻击: {pokemon.attack}</p>
										<Button
											size="small"
											onClick={() => handleSwitchMainPokemon(pokemon)}
										>
											设为主战
										</Button>
									</Tilt>
								);
							})}
						</div>
					) : (
						<p style={{ padding: "20px", textAlign: "center", color: "#999" }}>
							仓库为空
						</p>
					)}
				</div>
			)}

			{currentView === "gyms" && (
				<div className="gyms-view">
					<h2>🏛️ 道馆挑战</h2>
					<Button onClick={() => setCurrentView("home")}>返回</Button>
					<div className="gyms-list">
						{gyms.map((gym) => {
							// 检查是否已获得此道馆的徽章
							const hasBadge = badges.some(badge => badge.gym_id === gym.id);
							
							return (
								<Tilt
									tiltMaxAngleX={0} 
									tiltMaxAngleY={0} 
									transitionSpeed={400} 
									perspective={500}
									key={gym.id} 
									className={`gym-card ${hasBadge ? 'gym-completed' : ''}`}
								>
									{hasBadge && <div className="gym-completed-badge">✅ 已完成</div>}
									<h3>{gym.name}</h3>
									<p>馆主: {gym.leader_name}</p>
									<img className="gym-pokemon" src={gym.pokemon_sprite || `https://raw.githubusercontent.com/NightCatSama/pokedex/main/images/gif/${gym.pokemon_id}.gif`} alt={gym.pokemon_name} />
									<p>宝可梦: {gym.pokemon_name}</p>
									<p>奖励: {gym.reward_money} 金币</p>
									<div 
										className="gym-badge"
									>
										{gym.badge_image && (
											<img 
												className="gym-badge-img"
												src={gym.badge_image} 
												alt={gym.badge_name}
												style={{ 
													width: "50px", 
													height: "50px", 
													objectFit: "contain"
												}}
											/>
										)}
										<span>徽章: {gym.badge_name}</span>
									</div>
									<Button onClick={() => handleChallengeGym(gym)}>
										{hasBadge ? '再次挑战' : '挑战'}
									</Button>
								</Tilt>
							);
						})}
					</div>
				</div>
			)}

			{currentView === "shop" && (
				<div className="shop-view">
					<h2>🏪 精灵球商店</h2>
					<Button onClick={() => setCurrentView("home")}>返回</Button>
					<div className="shop-items">
						{shopItems.map((item) => {
							// 计算捕捉倍率
							const ballMultipliers = {
								1: "基础",
								2: "1.5倍加成",
								3: "2倍加成",
								4: "必中"
							};
							const description = ballMultipliers[item.id] || "基础";
							
							return (
								<div key={item.id} className="shop-item">
									{item.image && (
										<img 
											src={item.image} 
											alt={item.name} 
											className="shop-item-image"
											style={{ width: '64px', height: '64px', margin: '0 auto 10px', display: 'block' }}
										/>
									)}
									<h3>{item.name}</h3>
									<p>价格: {item.price} 金币</p>
									<p>效果: {description}</p>
									<p style={{ fontSize: '12px', color: '#999' }}>💡 实际捕捉率受宝可梦等级和血量影响</p>
									<div className="buy-controls">
										<input
											type="number"
											min="1"
											defaultValue="1"
											id={`quantity-${item.id}`}
											style={{ width: "60px", marginRight: "10px" }}
										/>
										<Button
											onClick={() => {
												const quantity = parseInt(
													document.getElementById(`quantity-${item.id}`).value
												);
												handleBuy(item, quantity);
											}}
										>
											购买
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{currentView === "pokedex" && (
				<div className="pokedex-view">
					<Button onClick={() => setCurrentView("home")} style={{ marginBottom: "20px" }}>
						返回
					</Button>
					<Pokedex playerId={player.id} />
				</div>
			)}
		</div>
	);
};

export default PokemonGame;
