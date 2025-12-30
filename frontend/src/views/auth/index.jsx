import { useState } from 'react';
import { registerPlayer, loginPlayer } from '../../api/gameAPI';
import './index.scss';

const Auth = ({ onLoginSuccess }) => {
	const [isLogin, setIsLogin] = useState(true); // true: 登录, false: 注册
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState('');

	const handleSubmit = async (e) => {
		e.preventDefault();
		setMessage('');

		// 验证
		if (!username.trim()) {
			setMessage('用户名不能为空');
			return;
		}

		if (!password) {
			setMessage('密码不能为空');
			return;
		}

		if (!isLogin) {
			// 注册时验证确认密码
			if (password !== confirmPassword) {
				setMessage('两次输入的密码不一致');
				return;
			}

			if (password.length < 4) {
				setMessage('密码长度至少4位');
				return;
			}
		}

		setLoading(true);

		try {
			let response;
			if (isLogin) {
				// 登录
				response = await loginPlayer(username, password);
			} else {
				// 注册
				response = await registerPlayer(username, password);
			}

				if (response.success) {
					// 清除旧的玩家数据
					localStorage.clear();
					
					// 保存玩家信息到 localStorage
					localStorage.setItem('player', JSON.stringify(response.player));
					localStorage.setItem('playerId', response.player.id);
					localStorage.setItem('pokemonGamePlayerId', response.player.id); // 兼容游戏组件
					
					setMessage(response.message);
					
					// 登录成功回调
					setTimeout(() => {
						onLoginSuccess(response.player);
					}, 500);
				}
		} catch (error) {
			setMessage(error.message || (isLogin ? '登录失败' : '注册失败'));
		} finally {
			setLoading(false);
		}
	};

	const toggleMode = () => {
		setIsLogin(!isLogin);
		setMessage('');
		setPassword('');
		setConfirmPassword('');
	};

	return (
		<div className="auth-container">
			<div className="auth-box">
				<h1 className="auth-title">宝可梦游戏</h1>
				<h2 className="auth-subtitle">{isLogin ? '登录' : '注册'}</h2>

				<form onSubmit={handleSubmit} className="auth-form">
					<div className="form-group">
						<label htmlFor="username">用户名</label>
						<input
							type="text"
							id="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder="请输入用户名"
							disabled={loading}
						/>
					</div>

					<div className="form-group">
						<label htmlFor="password">密码</label>
						<input
							type="password"
							id="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder={isLogin ? '请输入密码' : '请输入密码（至少4位）'}
							disabled={loading}
						/>
					</div>

					{!isLogin && (
						<div className="form-group">
							<label htmlFor="confirmPassword">确认密码</label>
							<input
								type="password"
								id="confirmPassword"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="请再次输入密码"
								disabled={loading}
							/>
						</div>
					)}

					{message && (
						<div className={`message ${message.includes('成功') ? 'success' : 'error'}`}>
							{message}
						</div>
					)}

					<button type="submit" className="submit-button" disabled={loading}>
						{loading ? '处理中...' : (isLogin ? '登录' : '注册')}
					</button>
				</form>

				<div className="toggle-mode">
					<span>{isLogin ? '还没有账号?' : '已有账号?'}</span>
					<button type="button" onClick={toggleMode} disabled={loading}>
						{isLogin ? '去注册' : '去登录'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default Auth;
