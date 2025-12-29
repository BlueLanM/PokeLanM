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

import "./index.css"

const Pokemon = () => {
	// 页面视图状态
	const [currentView, setCurrentView] = useState('pokemons'); // 'pokemons' | 'players' | 'storage'
	
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

	const closePlayerModal = () => {
		setPlayerModalVisible(false);
		setSelectedPlayer(null);
		setParty([]);
		setStorage([]);
	};

	useEffect(() => {
		if (currentView === 'pokemons') {
			fetchPokemons();
		} else if (currentView === 'players') {
			fetchPlayers();
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
		</div>
	)
}

export default Pokemon