import { useState, useEffect } from 'react';
import { getPokedex, getSpecialBadges } from '../../api/gameAPI';
import './index.css';

const Pokedex = ({ playerId }) => {
	const [pokedex, setPokedex] = useState([]);
	const [stats, setStats] = useState({ discovered: 0, total: 1025, totalCaught: 0 });
	const [specialBadges, setSpecialBadges] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		if (playerId) {
			loadPokedex();
			loadSpecialBadges();
		}
	}, [playerId]);

	const loadPokedex = async () => {
		setLoading(true);
		setError('');

		try {
			const response = await getPokedex(playerId);
			if (response.success) {
				setPokedex(response.pokedex);
				setStats(response.stats);
			}
		} catch (err) {
			setError(err.message || '加载图鉴失败');
		} finally {
			setLoading(false);
		}
	};

	const loadSpecialBadges = async () => {
		try {
			const response = await getSpecialBadges(playerId);
			if (response.success) {
				setSpecialBadges(response.badges);
			}
		} catch (err) {
			console.error('加载特殊徽章失败:', err);
		}
	};

	// 计算完成度百分比
	const completionRate = stats.total > 0 ? ((stats.discovered / stats.total) * 100).toFixed(2) : 0;

	if (loading) {
		return (
			<div className="pokedex-container">
				<div className="loading">加载中...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="pokedex-container">
				<div className="error">
					<p>{error}</p>
					<button onClick={loadPokedex}>重试</button>
				</div>
			</div>
		);
	}

	return (
		<div className="pokedex-container">
			<div className="pokedex-header">
				<h1>📖 训练家图鉴</h1>

				{/* 统计信息 */}
				<div className="stats-panel">
					<div className="stat-card">
						<div className="stat-icon">🔍</div>
						<div className="stat-info">
							<div className="stat-label">已发现</div>
							<div className="stat-value">{stats.discovered} / {stats.total}</div>
						</div>
					</div>
					<div className="stat-card">
						<div className="stat-icon">⚡</div>
						<div className="stat-info">
							<div className="stat-label">总捕获</div>
							<div className="stat-value">{stats.totalCaught}</div>
						</div>
					</div>
					<div className="stat-card">
						<div className="stat-icon">📊</div>
						<div className="stat-info">
							<div className="stat-label">完成度</div>
							<div className="stat-value">{completionRate}%</div>
						</div>
					</div>
				</div>

				{/* 进度条 */}
				<div className="progress-bar">
					<div className="progress-fill" style={{ width: `${completionRate}%` }}></div>
				</div>

				{/* 特殊徽章 */}
				{specialBadges.length > 0 && (
					<div className="special-badges">
						<h3>🏅 特殊成就</h3>
						<div className="badges-list">
							{specialBadges.map((badge, index) => (
								<div key={index} className="special-badge">
									<span className="badge-icon">🏆</span>
									<span className="badge-name">{badge.badge_name}</span>
									<span className="badge-date">
										{new Date(badge.earned_at).toLocaleDateString()}
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* 图鉴列表 */}
			<div className="pokedex-grid">
				{pokedex.length === 0 ? (
					<div className="empty-state">
						<p>📭 还没有捕获任何宝可梦</p>
						<p className="tip">快去探索吧！</p>
					</div>
				) : (
					pokedex.map((entry) => (
						<div key={entry.id} className="pokedex-card">
							<div className="pokemon-number">#{String(entry.pokemon_id).padStart(4, '0')}</div>
							<img
								src={entry.pokemon_sprite}
								alt={entry.pokemon_name}
								className="pokemon-sprite"
								loading="lazy"
							/>
							<div className="pokemon-info">
								<div className="pokemon-name">{entry.pokemon_name}</div>
								{entry.pokemon_name_en && (
									<div className="pokemon-name-en">{entry.pokemon_name_en}</div>
								)}
								<div className="catch-count">捕获: {entry.total_caught} 次</div>
								<div className="first-caught">
									首次: {new Date(entry.first_caught_at).toLocaleDateString()}
								</div>
							</div>
						</div>
					))
				)}
			</div>

			<div className="refresh-section">
				<button onClick={loadPokedex} className="refresh-btn">
					🔄 刷新图鉴
				</button>
			</div>
		</div>
	);
};

export default Pokedex;
