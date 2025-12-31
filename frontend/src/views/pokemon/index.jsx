import { useState, useEffect } from 'react';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Popconfirm from '../../components/Popconfirm';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import message from "../../components/Message";
import { pokemonApi } from '../../api';
import * as gameAPI from '../../api/gameAPI';
import { useForm } from '../../hooks/useForm';

import "./index.scss"

const Pokemon = () => {
	// 页面视图状态
	const [currentView, setCurrentView] = useState('pokemons'); // 'pokemons' | 'players' | 'storage' | 'shop' | 'gyms'
	
	// 宝可梦管理相关状态
	const [pokemons, setPokemons] = useState([]);
	const [loading, setLoading] = useState(false);
	const [isAdding, setIsAdding] = useState(false);
	const [visible, setVisible] = useState(false);
	const [modalMode, setModalMode] = useState('add'); // 'add' | 'detail' | 'edit'
	const [currentId, setCurrentId] = useState(null);
	const [searchQuery, setSearchQuery] = useState(''); // 搜索关键词

	// 玩家管理相关状态
	const [players, setPlayers] = useState([]);
	const [selectedPlayer, setSelectedPlayer] = useState(null);
	const [playerModalVisible, setPlayerModalVisible] = useState(false);
	const [moneyModalVisible, setMoneyModalVisible] = useState(false);
	const [newMoney, setNewMoney] = useState(0);
	
	// 仓库管理相关状态
	const [storage, setStorage] = useState([]);
	const [party, setParty] = useState([]);
	
	// 商店物品管理相关状态
	const [shopItems, setShopItems] = useState([]);
	const [shopModalVisible, setShopModalVisible] = useState(false);
	const [shopModalMode, setShopModalMode] = useState('add'); // 'add' | 'edit' | 'detail'
	const [currentShopItem, setCurrentShopItem] = useState(null);
	const [shopFormData, setShopFormData] = useState({
		name: '',
		catchRate: 0,
		price: 0,
		image: ''
	});
	
	// 道馆管理相关状态
	const [gyms, setGyms] = useState([]);
	const [gymModalVisible, setGymModalVisible] = useState(false);
	const [gymModalMode, setGymModalMode] = useState('add'); // 'add' | 'edit' | 'detail'
	const [currentGym, setCurrentGym] = useState(null);
	const [gymFormData, setGymFormData] = useState({
		name: '',
		leader_name: '',
		pokemon_id: 0,
		pokemon_name: '',
		pokemon_sprite: '',
		level: 20,
		hp: 100,
		max_hp: 100,
		attack: 25,
		reward_money: 500,
		reward_exp: 100,
		badge_name: '',
		badge_image: ''
	});

	const { values, handleChange, reset, setValues } = useForm({
		name: '',
		type: ''
	});

	const columns = [
	{
		title: '编号',
		dataIndex: 'id',
	},
	{
		title: '名称',
		dataIndex: 'name',
	},
	{
		title: '属性',
		dataIndex: 'type',
	},
	{
		title: "操作",
		dataIndex: "action",
		render: (text, record) => (
			<div className="pokemon-action">
				<Button type="default" onClick={() => detailPokemon(record.id)}>详情详情详情</Button>
				<Button type="primary" onClick={() => editPokemon(record.id)}>编辑</Button>
				<Popconfirm
					title="确定要删除这个宝可梦吗？"
					description="删除后将无法恢复"
					onConfirm={() => removePokemon(record.id)}
					placement="top"
				>
					<Button type="primary" danger>删除</Button>
				</Popconfirm>
			</div>
		)
	}
]

	const fetchPokemons = async () => {
		try {
			setLoading(true);
			const data = await pokemonApi.getPokemons({ page: 1, limit: 10 });
			setPokemons(data?.data);
		} catch (err) {
			message.error('获取宝可梦列表失败！');
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async () => {
		if (!values.name || !values.type) {
			message.warning('请填写完整信息');
			return;
		}
		
		setIsAdding(true);
		
		try {
			if (modalMode === 'edit') {
				// 编辑模式：更新数据
				await pokemonApi.updatePokemon(currentId, values);
				message.success('更新成功！');
			} else {
				// 添加模式：创建新数据
				await pokemonApi.createPokemon(values);
				message.success('添加成功！');
			}
			
			setIsAdding(false);
			setVisible(false);
			reset();
			fetchPokemons(); // 刷新列表
		} catch (error) {
			setIsAdding(false);
			message.error(modalMode === 'edit' ? '更新宝可梦失败' : '添加宝可梦失败');
		}
	};

	const detailPokemon = async (id) => {
		try {
			const result = await pokemonApi.getPokemon(id);
			// 回显数据到表单
			setValues({
				name: result.data.name,
				type: result.data.type
			});
			setCurrentId(id);
			setModalMode('detail');
			setVisible(true);
		} catch (error) {
			message.error('获取宝可梦详情失败');
		}
	}

	const editPokemon = async (id) => {
		try {
			const result = await pokemonApi.getPokemon(id);
			// 回显数据到表单
			setValues({
				name: result.data.name,
				type: result.data.type
			});
			setCurrentId(id);
			setModalMode('edit');
			setVisible(true);
		} catch (error) {
			message.error('获取宝可梦详情失败');
		}
	}

	const removePokemon = async (id) => {
		try {
			await pokemonApi.deletePokemon(id);
			// 显示成功消息
			message.success('删除成功！');
			
			// 刷新数据
			fetchPokemons();
		} catch (error) {
			message.error('删除宝可梦失败');
		}
	}

	const close = () => {
		setVisible(false);
		reset();
		setModalMode('add');
		setCurrentId(null);
	};

	
	const handleSearch = (value) => {
		setSearchQuery(value);
	};

	const handleClearSearch = () => {
		setSearchQuery('');
	};

	// ========== 玩家管理功能 ==========
	const fetchPlayers = async () => {
		try {
			setLoading(true);
			const data = await gameAPI.getLeaderboard();
			setPlayers(data?.leaderboard || []);
		} catch (err) {
			message.error('获取玩家列表失败！');
		} finally {
			setLoading(false);
		}
	};

	const viewPlayerDetail = async (player) => {
		try {
			setLoading(true);
			const data = await gameAPI.getPlayerInfo(player.id);
			setSelectedPlayer(data.player);
			setParty(data.party || []);
			// 获取仓库数据
			const storageData = await gameAPI.getStorage(player.id);
			setStorage(storageData.storage || []);
			setPlayerModalVisible(true);
		} catch (err) {
			message.error('获取玩家详情失败！');
		} finally {
			setLoading(false);
		}
	};

	const handleSetMoney = async () => {
		if (!selectedPlayer) return;
		try {
			await gameAPI.adminSetPlayerMoney(selectedPlayer.id, newMoney);
			message.success('金币设置成功！');
			setMoneyModalVisible(false);
			fetchPlayers();
		} catch (err) {
			message.error('设置金币失败！');
		}
	};

	const handleDeletePlayer = async (player) => {
		try {
			await gameAPI.adminDeletePlayer(player.id);
			message.success(`已成功删除玩家 ${player.name}！`);
			fetchPlayers();
		} catch (error) {
			message.error(error.response?.data?.error || '删除失败！');
		}
	};

	const closePlayerModal = () => {
		setPlayerModalVisible(false);
		setSelectedPlayer(null);
		setParty([]);
		setStorage([]);
	};

	// ========== 商店物品管理功能 ==========
	const fetchShopItems = async () => {
		try {
			setLoading(true);
			const data = await gameAPI.adminGetPokeballTypes();
			setShopItems(data?.items || []);
		} catch (err) {
			message.error('获取商店物品失败！');
		} finally {
			setLoading(false);
		}
	};

	const handleAddShopItem = () => {
		setShopFormData({
			name: '',
			catchRate: 0,
			price: 0,
			image: ''
		});
		setShopModalMode('add');
		setShopModalVisible(true);
	};

	const handleEditShopItem = async (item) => {
		setShopFormData({
			name: item.name,
			catchRate: item.catch_rate,
			price: item.price,
			image: item.image || ''
		});
		setCurrentShopItem(item);
		setShopModalMode('edit');
		setShopModalVisible(true);
	};

	const handleDeleteShopItem = async (id) => {
		try {
			await gameAPI.adminDeletePokeballType(id);
			message.success('删除成功！');
			fetchShopItems();
		} catch (error) {
			message.error('删除失败！');
		}
	};

	const handleShopSubmit = async () => {
		if (!shopFormData.name || !shopFormData.price) {
			message.warning('请填写完整信息');
			return;
		}
		
		try {
			setIsAdding(true);
			if (shopModalMode === 'edit') {
				await gameAPI.adminUpdatePokeballType(currentShopItem.id, shopFormData);
				message.success('更新成功！');
			} else {
				await gameAPI.adminAddPokeballType(shopFormData);
				message.success('添加成功！');
			}
			setShopModalVisible(false);
			fetchShopItems();
		} catch (error) {
			message.error(shopModalMode === 'edit' ? '更新失败' : '添加失败');
		} finally {
			setIsAdding(false);
		}
	};

	// ========== 道馆管理功能 ==========
	const fetchGyms = async () => {
		try {
			setLoading(true);
			const data = await gameAPI.adminGetGyms();
			setGyms(data?.gyms || []);
		} catch (err) {
			message.error('获取道馆列表失败！');
		} finally {
			setLoading(false);
		}
	};

	// 导出道馆数据
	const handleExportGyms = async () => {
		try {
			const data = await gameAPI.exportGyms();
			
			// 创建Blob并下载
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `gyms-export-${Date.now()}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
			
			message.success('导出成功！');
		} catch (error) {
			message.error('导出失败！');
		}
	};

	// 导入道馆数据
	const handleImportGyms = () => {
		// 创建文件输入元素
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		
		input.onchange = async (e) => {
			const file = e.target.files[0];
			if (!file) return;
			
			try {
				setLoading(true);
				const reader = new FileReader();
				
				reader.onload = async (event) => {
					try {
						const jsonData = JSON.parse(event.target.result);
						
						// 验证数据格式
						let gymsToImport = [];
						if (Array.isArray(jsonData)) {
							gymsToImport = jsonData;
						} else if (jsonData.data && Array.isArray(jsonData.data)) {
							gymsToImport = jsonData.data;
						} else {
							message.error('导入文件格式错误！');
							setLoading(false);
							return;
						}
						
						if (gymsToImport.length === 0) {
							message.error('导入文件中没有道馆数据！');
							setLoading(false);
							return;
						}
						
						// 调用导入API
						const result = await gameAPI.importGyms(gymsToImport, 'merge');
						
						if (result.success) {
							message.success(result.message || '导入成功！');
							if (result.errors && result.errors.length > 0) {
								console.warn('导入时出现部分错误:', result.errors);
							}
							fetchGyms(); // 刷新列表
						} else {
							message.error(result.message || '导入失败！');
						}
					} catch (parseError) {
						message.error('解析JSON文件失败！请检查文件格式。');
						console.error('解析错误:', parseError);
					} finally {
						setLoading(false);
					}
				};
				
				reader.onerror = () => {
					message.error('读取文件失败！');
					setLoading(false);
				};
				
				reader.readAsText(file);
			} catch (error) {
				message.error('导入失败！');
				setLoading(false);
			}
		};
		
		input.click();
	};

	const handleAddGym = () => {
		setGymFormData({
			name: '',
			leader_name: '',
			pokemon_id: 0,
			pokemon_name: '',
			pokemon_sprite: '',
			level: 20,
			hp: 100,
			max_hp: 100,
			attack: 25,
			reward_money: 500,
			reward_exp: 100,
			badge_name: '',
			badge_image: ''
		});
		setGymModalMode('add');
		setGymModalVisible(true);
	};

	const handleEditGym = async (gym) => {
		setGymFormData({
			name: gym.name,
			leader_name: gym.leader_name,
			pokemon_id: gym.pokemon_id,
			pokemon_name: gym.pokemon_name,
			pokemon_sprite: gym.pokemon_sprite || '',
			level: gym.level,
			hp: gym.hp,
			max_hp: gym.max_hp,
			attack: gym.attack,
			reward_money: gym.reward_money,
			reward_exp: gym.reward_exp || 100,
			badge_name: gym.badge_name,
			badge_image: gym.badge_image || ''
		});
		setCurrentGym(gym);
		setGymModalMode('edit');
		setGymModalVisible(true);
	};

	const handleDeleteGym = async (id) => {
		try {
			await gameAPI.adminDeleteGym(id);
			message.success('删除成功！');
			fetchGyms();
		} catch (error) {
			message.error('删除失败！');
		}
	};

	const handleGymSubmit = async () => {
		if (!gymFormData.name || !gymFormData.leader_name || !gymFormData.badge_name) {
			message.warning('请填写完整信息');
			return;
		}
		
		try {
			setIsAdding(true);
			if (gymModalMode === 'edit') {
				await gameAPI.adminUpdateGym(currentGym.id, gymFormData);
				message.success('更新成功！');
			} else {
				await gameAPI.adminAddGym(gymFormData);
				message.success('添加成功！');
			}
			setGymModalVisible(false);
			fetchGyms();
		} catch (error) {
			message.error(gymModalMode === 'edit' ? '更新失败' : '添加失败');
		} finally {
			setIsAdding(false);
		}
	};

	useEffect(() => {
		if (currentView === 'pokemons') {
			fetchPokemons();
		} else if (currentView === 'players') {
			fetchPlayers();
		} else if (currentView === 'shop') {
			fetchShopItems();
		} else if (currentView === 'gyms') {
			fetchGyms();
		}
	}, [currentView]);

	// 玩家管理表格列
	const playerColumns = [
		{
			title: '玩家ID',
			dataIndex: 'id',
		},
		{
			title: '玩家名称',
			dataIndex: 'name',
		},
		{
			title: '金币',
			dataIndex: 'money',
			render: (text) => `💰 ${text}`
		},
		{
			title: '徽章数',
			dataIndex: 'badge_count',
			render: (text) => text || 0
		},
		{
			title: "操作",
			dataIndex: "action",
			render: (text, record) => (
				<div className="pokemon-action">
					<Button type="default" onClick={() => viewPlayerDetail(record)}>查看详情</Button>
					<Button type="primary" onClick={() => {
						setSelectedPlayer(record);
						setNewMoney(record.money);
						setMoneyModalVisible(true);
					}}>设置金币</Button>
					<Popconfirm
						title="确定要删除这个玩家吗？"
						description={`删除玩家后无法恢复`}
						onConfirm={() => handleDeletePlayer(record)}
						placement="top"
					>
						<Button type="primary" danger>删除玩家</Button>
					</Popconfirm>
				</div>
			)
		}
	];

	return (
		<div className="pokemon">
			<h2 className="pokemon-title">🎮 游戏管理系统</h2>
			
			{/* 视图切换按钮 */}
			<div className="pokemon-tabs">
				<Button 
					type={currentView === 'pokemons' ? 'primary' : 'default'}
					onClick={() => setCurrentView('pokemons')}
				>
					📦 宝可梦数据
				</Button>
				<Button 
					type={currentView === 'players' ? 'primary' : 'default'}
					onClick={() => setCurrentView('players')}
				>
					👤 玩家管理
				</Button>
				<Button 
					type={currentView === 'shop' ? 'primary' : 'default'}
					onClick={() => setCurrentView('shop')}
				>
					🏪 商店物品
				</Button>
				<Button 
					type={currentView === 'gyms' ? 'primary' : 'default'}
					onClick={() => setCurrentView('gyms')}
				>
					🏛️ 道馆管理
				</Button>
			</div>

			{/* 宝可梦管理视图 */}
			{currentView === 'pokemons' && (
				<>
					<div className="pokemon-header">
						<div className="pokemon-header-left">
							<Button type="primary" onClick={() => setVisible(true)}>添加宝可梦</Button>
						</div>
						<div className="pokemon-header-right">
							<Input
								placeholder="搜索宝可梦名称..."
								width={300}
								allowClear
								value={searchQuery}
								onChange={(e) => handleSearch(e.target.value)}
								onClear={handleClearSearch}
							/>
						</div>
					</div>
					<Table 
						rowKey="id" 
						dataSource={pokemons} 
						columns={columns}
						loading={loading} 
					/>
					<Modal
						title={modalMode === 'detail' ? "宝可梦详情" : modalMode === 'edit' ? "编辑宝可梦" : "添加宝可梦"}
						visible={visible}
						onOk={modalMode === 'detail' ? close : handleSubmit}
						onCancel={() => close()}
						confirmLoading={isAdding}
						okText={modalMode === 'detail' ? "关闭" : "确定"}
						cancelButtonVisible={modalMode !== 'detail'}
					>
						<div className="pokemon-modal-content">
							<div className="pokemon-flex">
								名称：<Input 
										placeholder="请输入内容" 
										width={420}
										value={values.name}
										onChange={(e) => handleChange('name', e.target.value)}
										disabled={modalMode === 'detail'}
									/>
							</div>
							<div className="pokemon-flex">
								属性：<Input 
										placeholder="请输入内容" 
										width={420}
										value={values.type}
										onChange={(e) => handleChange('type', e.target.value)}
										disabled={modalMode === 'detail'}
									/>
							</div>
						</div>
					</Modal>
				</>
			)}

			{/* 玩家管理视图 */}
			{currentView === 'players' && (
				<>
					<div className="pokemon-header">
						<div className="pokemon-header-left">
							<h3 style={{ margin: 0 }}>玩家列表 (共 {players.length} 人)</h3>
						</div>
					</div>
					<Table 
						rowKey="id" 
						dataSource={players} 
						columns={playerColumns}
						loading={loading} 
					/>
					
					{/* 玩家详情弹窗 */}
					<Modal
						title={`玩家详情 - ${selectedPlayer?.name || ''}`}
						visible={playerModalVisible}
						onOk={closePlayerModal}
						onCancel={closePlayerModal}
						okText="关闭"
						cancelButtonVisible={false}
						width={800}
					>
						{selectedPlayer && (
							<div className="player-detail-content">
								<div className="player-info-section">
									<h3>📊 基本信息</h3>
									<p><strong>玩家ID:</strong> {selectedPlayer.id}</p>
									<p><strong>玩家名称:</strong> {selectedPlayer.name}</p>
									<p><strong>金币:</strong> 💰 {selectedPlayer.money}</p>
									<p><strong>等级:</strong> Lv.{selectedPlayer.level || 1}</p>
									<p><strong>徽章数:</strong> {selectedPlayer.badge_count || 0}</p>
								</div>
								
								<div className="player-pokemon-section">
									<h3>🎒 背包 (主战精灵)</h3>
									{party.length > 0 ? (
										<div className="pokemon-cards">
											{party.map(p => (
												<div key={p.id} className="mini-pokemon-card">
													<img src={p.pokemon_sprite} alt={p.pokemon_name} style={{ width: '80px', height: '80px' }} />
													<p><strong>{p.pokemon_name}</strong></p>
													<p>Lv.{p.level}</p>
													<p>HP: {p.hp}/{p.max_hp}</p>
													<p>攻击: {p.attack}</p>
												</div>
											))}
										</div>
									) : (
										<p style={{ color: '#999' }}>背包为空</p>
									)}
								</div>
								
								<div className="player-pokemon-section">
									<h3>📦 仓库</h3>
									{storage.length > 0 ? (
										<div className="pokemon-cards">
											{storage.map(p => (
												<div key={p.id} className="mini-pokemon-card">
													<img src={p.pokemon_sprite} alt={p.pokemon_name} style={{ width: '80px', height: '80px' }} />
													<p><strong>{p.pokemon_name}</strong></p>
													<p>Lv.{p.level}</p>
													<p>HP: {p.hp}/{p.max_hp}</p>
													<p>攻击: {p.attack}</p>
												</div>
											))}
										</div>
									) : (
										<p style={{ color: '#999' }}>仓库为空</p>
									)}
								</div>
							</div>
						)}
					</Modal>

					{/* 设置金币弹窗 */}
					<Modal
						title="设置玩家金币"
						visible={moneyModalVisible}
						onOk={handleSetMoney}
						onCancel={() => setMoneyModalVisible(false)}
						okText="确定"
					>
						<div className="money-modal-content">
							<p>玩家: <strong>{selectedPlayer?.name}</strong></p>
							<p>当前金币: <strong>💰 {selectedPlayer?.money}</strong></p>
							<div style={{ marginTop: '20px' }}>
								<label>新金币数量：</label>
								<Input 
									type="number"
									placeholder="请输入金币数量" 
									width={300}
									value={newMoney}
									onChange={(e) => setNewMoney(Number(e.target.value))}
								/>
							</div>
						</div>
					</Modal>
				</>
			)}

			{/* 商店物品管理视图 */}
			{currentView === 'shop' && (
				<>
					<div className="pokemon-header">
						<div className="pokemon-header-left">
							<Button type="primary" onClick={handleAddShopItem}>添加物品</Button>
						</div>
						<div className="pokemon-header-right">
							<h3 style={{ margin: 0 }}>商店物品 (共 {shopItems.length} 个)</h3>
						</div>
					</div>
					<Table 
						rowKey="id" 
						dataSource={shopItems} 
						columns={[
							{
								title: 'ID',
								dataIndex: 'id',
							},
							{
								title: '物品名称',
								dataIndex: 'name',
							},
							{
								title: '捕获率',
								dataIndex: 'catch_rate',
								render: (text) => `${(text * 100).toFixed(0)}%`
							},
							{
								title: '价格',
								dataIndex: 'price',
								render: (text) => `💰 ${text}`
							},
							{
								title: '图片',
								dataIndex: 'image',
								render: (text) => text ? <img src={text} alt="item" style={{ width: '40px', height: '40px' }} /> : '-'
							},
							{
								title: "操作",
								dataIndex: "action",
								render: (text, record) => (
									<div className="pokemon-action">
										<Button type="primary" onClick={() => handleEditShopItem(record)}>编辑</Button>
										<Popconfirm
											title="确定要删除这个物品吗？"
											description="删除后将无法恢复"
											onConfirm={() => handleDeleteShopItem(record.id)}
											placement="top"
										>
											<Button type="primary" danger>删除</Button>
										</Popconfirm>
									</div>
								)
							}
						]}
						loading={loading} 
					/>
					
					{/* 商店物品弹窗 */}
					<Modal
						title={shopModalMode === 'edit' ? "编辑物品" : "添加物品"}
						visible={shopModalVisible}
						onOk={handleShopSubmit}
						onCancel={() => setShopModalVisible(false)}
						confirmLoading={isAdding}
						okText="确定"
					>
						<div className="pokemon-modal-content">
							<div className="pokemon-flex">
								物品名称：<Input 
										placeholder="例如: 精灵球" 
										width={420}
										value={shopFormData.name}
										onChange={(e) => setShopFormData({...shopFormData, name: e.target.value})}
									/>
							</div>
							<div className="pokemon-flex">
								捕获率：<Input 
										type="number"
										placeholder="0-1之间，例如: 0.3" 
										width={420}
										value={shopFormData.catchRate}
										onChange={(e) => setShopFormData({...shopFormData, catchRate: parseFloat(e.target.value)})}
									/>
							</div>
							<div className="pokemon-flex">
								价格：<Input 
										type="number"
										placeholder="例如: 100" 
										width={420}
										value={shopFormData.price}
										onChange={(e) => setShopFormData({...shopFormData, price: parseInt(e.target.value)})}
									/>
							</div>
							<div className="pokemon-flex">
								图片URL：<Input 
										placeholder="图片链接" 
										width={420}
										value={shopFormData.image}
										onChange={(e) => setShopFormData({...shopFormData, image: e.target.value})}
									/>
							</div>
						</div>
					</Modal>
				</>
			)}

			{/* 道馆管理视图 */}
			{currentView === 'gyms' && (
				<>
					<div className="pokemon-header">
						<div className="pokemon-header-left">
							<Button type="primary" onClick={handleAddGym}>添加道馆</Button>
							<Button type="default" onClick={handleExportGyms} style={{ marginLeft: '10px' }}>📤 导出数据</Button>
							<Button type="default" onClick={handleImportGyms} style={{ marginLeft: '10px' }}>📥 导入数据</Button>
						</div>
						<div className="pokemon-header-right">
							<h3 style={{ margin: 0 }}>道馆列表 (共 {gyms.length} 个)</h3>
						</div>
					</div>
					<Table 
						rowKey="id" 
						dataSource={gyms} 
						columns={[
							{
								title: 'ID',
								dataIndex: 'id',
							},
							{
								title: '道馆名称',
								dataIndex: 'name',
							},
							{
								title: '馆主',
								dataIndex: 'leader_name',
							},
							{
								title: '宝可梦',
								dataIndex: 'pokemon_name',
							},
							{
								title: '等级',
								dataIndex: 'level',
								render: (text) => `Lv.${text}`
							},
							{
								title: 'HP',
								dataIndex: 'max_hp',
							},
							{
								title: '攻击',
								dataIndex: 'attack',
							},
							{
								title: '奖励金币',
								dataIndex: 'reward_money',
								render: (text) => `💰 ${text}`
							},
							{
								title: '奖励经验',
								dataIndex: 'reward_exp',
								render: (text) => `⭐ ${text || 100}`
							},
							{
								title: '徽章',
								dataIndex: 'badge_name',
								render: (text, record) => (
									<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
										{record.badge_image ? (
											<img 
												src={record.badge_image} 
												alt={text} 
												style={{ width: '32px', height: '32px', objectFit: 'contain' }}
											/>
										) : (
											<span>🏅</span>
										)}
										<span>{text}</span>
									</div>
								)
							},
							{
								title: "操作",
								dataIndex: "action",
								render: (text, record) => (
									<div className="pokemon-action">
										<Button type="primary" onClick={() => handleEditGym(record)}>编辑</Button>
										<Popconfirm
											title="确定要删除这个道馆吗？"
											description="删除后将无法恢复"
											onConfirm={() => handleDeleteGym(record.id)}
											placement="top"
										>
											<Button type="primary" danger>删除</Button>
										</Popconfirm>
									</div>
								)
							}
						]}
						loading={loading} 
						scrollY={700}
					/>
					
					{/* 道馆弹窗 */}
					<Modal
						title={gymModalMode === 'edit' ? "编辑道馆" : "添加道馆"}
						visible={gymModalVisible}
						onOk={handleGymSubmit}
						onCancel={() => setGymModalVisible(false)}
						confirmLoading={isAdding}
						okText="确定"
						width={700}
					>
						<div className="pokemon-modal-content">
							<div className="pokemon-flex">
								道馆名称：<Input 
										placeholder="例如: 岩石道馆" 
										width={420}
										value={gymFormData.name}
										onChange={(e) => setGymFormData({...gymFormData, name: e.target.value})}
									/>
							</div>
							<div className="pokemon-flex">
								馆主名称：<Input 
										placeholder="例如: 小刚" 
										width={420}
										value={gymFormData.leader_name}
										onChange={(e) => setGymFormData({...gymFormData, leader_name: e.target.value})}
									/>
							</div>
							<div className="pokemon-flex">
								宝可梦ID：<Input 
										type="number"
										placeholder="例如: 74" 
										width={420}
										value={gymFormData.pokemon_id}
										onChange={(e) => setGymFormData({...gymFormData, pokemon_id: parseInt(e.target.value)})}
									/>
							</div>
							<div className="pokemon-flex">
								宝可梦名称：<Input 
										placeholder="例如: geodude" 
										width={420}
										value={gymFormData.pokemon_name}
										onChange={(e) => setGymFormData({...gymFormData, pokemon_name: e.target.value})}
									/>
							</div>
							<div className="pokemon-flex">
								精灵图片URL：<Input 
										placeholder="图片链接" 
										width={420}
										value={gymFormData.pokemon_sprite}
										onChange={(e) => setGymFormData({...gymFormData, pokemon_sprite: e.target.value})}
									/>
							</div>
							<div className="pokemon-flex">
								等级：<Input 
										type="number"
										placeholder="例如: 20" 
										width={420}
										value={gymFormData.level}
										onChange={(e) => setGymFormData({...gymFormData, level: parseInt(e.target.value)})}
									/>
							</div>
							<div className="pokemon-flex">
								HP：<Input 
										type="number"
										placeholder="例如: 100" 
										width={420}
										value={gymFormData.hp}
										onChange={(e) => {
											const val = parseInt(e.target.value);
											setGymFormData({...gymFormData, hp: val, max_hp: val});
										}}
									/>
							</div>
							<div className="pokemon-flex">
								攻击力：<Input 
										type="number"
										placeholder="例如: 25" 
										width={420}
										value={gymFormData.attack}
										onChange={(e) => setGymFormData({...gymFormData, attack: parseInt(e.target.value)})}
									/>
							</div>
							<div className="pokemon-flex">
								奖励金币：<Input 
										type="number"
										placeholder="例如: 500" 
										width={420}
										value={gymFormData.reward_money}
										onChange={(e) => setGymFormData({...gymFormData, reward_money: parseInt(e.target.value)})}
									/>
							</div>
							<div className="pokemon-flex">
								奖励经验：<Input 
										type="number"
										placeholder="例如: 100" 
										width={420}
										value={gymFormData.reward_exp}
										onChange={(e) => setGymFormData({...gymFormData, reward_exp: parseInt(e.target.value)})}
									/>
							</div>
							<div className="pokemon-flex">
								徽章名称：<Input 
										placeholder="例如: 灰色徽章" 
										width={420}
										value={gymFormData.badge_name}
										onChange={(e) => setGymFormData({...gymFormData, badge_name: e.target.value})}
									/>
							</div>
							<div className="pokemon-flex">
								徽章图片：<Input 
										placeholder="例如: https://raw.githubusercontent.com/BlueLanM/PokeLanM/main/images/Boulder_Badge.png" 
										width={420}
										value={gymFormData.badge_image}
										onChange={(e) => setGymFormData({...gymFormData, badge_image: e.target.value})}
									/>
							</div>
							{gymFormData.badge_image && (
								<div className="pokemon-flex" style={{ alignItems: 'center' }}>
									<span style={{ width: '100px' }}>图片预览：</span>
									<img 
										src={gymFormData.badge_image} 
										alt="徽章预览" 
										style={{ width: '60px', height: '60px', objectFit: 'contain' }}
										onError={(e) => {
											e.target.style.display = 'none';
											e.target.nextSibling.style.display = 'inline';
										}}
									/>
									<span style={{ display: 'none', color: '#999' }}>图片加载失败</span>
								</div>
							)}
						</div>
					</Modal>
				</>
			)}
		</div>
	)
}

export default Pokemon
