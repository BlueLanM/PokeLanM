import { useState, useEffect } from 'react';
import { getLeaderboard } from '../../api/gameAPI';
import Table from '../../components/Table';
import Button from '../../components/Button';
import './index.scss';


const Leaderboard = ({ currentPlayer }) => {
	const [leaderboard, setLeaderboard] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [sortBy, setSortBy] = useState('pokemon'); // pokemon, gyms 或 money

	useEffect(() => {
		loadLeaderboard();
	}, []);

	const loadLeaderboard = async () => {
		setLoading(true);
		setError('');
		
		try {
			const response = await getLeaderboard();
			if (response.success) {
				setLeaderboard(response.leaderboard);
			}
		} catch (err) {
			setError(err.message || '加载排行榜失败');
		} finally {
			setLoading(false);
		}
	};

	// 排序逻辑
	const sortedLeaderboard = [...leaderboard].sort((a, b) => {
		if (sortBy === 'pokemon') {
			// 按捕获数量排序,相同则按道馆数量
			if (b.pokemon_caught !== a.pokemon_caught) {
				return b.pokemon_caught - a.pokemon_caught;
			}
			return b.gyms_defeated - a.gyms_defeated;
		} else if (sortBy === 'gyms') {
			// 按道馆数量排序,相同则按捕获数量
			if (b.gyms_defeated !== a.gyms_defeated) {
				return b.gyms_defeated - a.gyms_defeated;
			}
			return b.pokemon_caught - a.pokemon_caught;
		} else {
			// 按金币排序(富豪榜),相同则按捕获数量
			if (b.money !== a.money) {
				return b.money - a.money;
			}
			return b.pokemon_caught - a.pokemon_caught;
		}
	});

	// 为表格数据添加 key 和排名
	const tableData = sortedLeaderboard.map((player, index) => ({
		...player,
		key: `${player.name}-${index}`,
		rank: index + 1,
		isCurrentPlayer: currentPlayer && player.name === currentPlayer.name
	}));

	// Table 列定义
	const columns = [
		{
			title: '排名',
			dataIndex: 'rank',
			render: (rank, record) => {
				const rankClass = rank <= 3 ? `rank-medal rank-${rank}` : '';
				return (
					<div className={rankClass}>
						{rank === 1 && '🥇'}
						{rank === 2 && '🥈'}
						{rank === 3 && '🥉'}
						{rank > 3 && `#${rank}`}
					</div>
				);
			}
		},
		{
			title: '玩家',
			dataIndex: 'name',
			render: (name, record) => (
				<div className="player-name">
					{name}
					{record.isCurrentPlayer && <span className="badge">你</span>}
				</div>
			)
		},
		{
			title: '捕获数',
			dataIndex: 'pokemon_caught',
			render: (count) => <span className="stat-value">{count}</span>
		},
		{
			title: '道馆数',
			dataIndex: 'gyms_defeated',
			render: (count) => <span className="stat-value">{count}</span>
		},
		{
			title: '金币',
			dataIndex: 'money',
			render: (money) => <span className="stat-value money">{money}</span>
		}
	];

	if (loading) {
		return (
			<div className="leaderboard-container">
				<div className="loading">加载中...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="leaderboard-container">
				<div className="error">
					<p>{error}</p>
					<Button onClick={loadLeaderboard}>重试</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="leaderboard-container">
			<div className="leaderboard-header">
				<h1>
					{sortBy === 'pokemon' && '🏆 图鉴排行榜'}
					{sortBy === 'gyms' && '⚔️ 道馆排行榜'}
					{sortBy === 'money' && '💰 富豪排行榜'}
				</h1>
				<div className="sort-buttons">
					<Button 
						className={sortBy === 'pokemon' ? 'active' : ''} 
						onClick={() => setSortBy('pokemon')}
					>
						🏆 训练家图鉴榜
					</Button>
					<Button 
						className={sortBy === 'gyms' ? 'active' : ''} 
						onClick={() => setSortBy('gyms')}
					>
						⚔️ 道馆挑战榜
					</Button>
					<Button 
						className={sortBy === 'money' ? 'active' : ''} 
						onClick={() => setSortBy('money')}
					>
						💰 富豪榜
					</Button>
				</div>
			</div>

			<div className="leaderboard-table-wrapper">
				<Table
					columns={columns}
					dataSource={tableData}
					loading={loading}
					rowKey="key"
					scrollY={500}
				/>
				
				{!loading && tableData.length === 0 && (
					<div className="no-data">暂无数据</div>
				)}
			</div>

			<div className="refresh-section">
				<button onClick={loadLeaderboard} className="refresh-btn">
					🔄 刷新排行榜
				</button>
			</div>
		</div>
	);
};

export default Leaderboard;
