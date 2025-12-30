import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.scss';

// 单条消息组件
const MessageItem = ({ content, type, duration, onClose, id }) => {
	useEffect(() => {
		if (duration > 0) {
			const timer = setTimeout(() => {
				onClose(id);
			}, duration);
			return () => clearTimeout(timer);
		}
	}, [duration, onClose, id]);

	const icons = {
		success: '✓',
		error: '✕',
		info: 'ℹ',
		warning: '⚠'
	};

	return (
		<div className={`message-item message-${type}`}>
			<span className="message-icon">{icons[type]}</span>
			<span className="message-content">{content}</span>
		</div>
	);
};

// 消息容器组件
const MessageContainer = ({ messages, onClose }) => {
	return (
		<div className="message-container">
			{messages.map(msg => (
				<MessageItem key={msg.id} {...msg} onClose={onClose} />
			))}
		</div>
	);
};

// 消息管理器
class MessageManager {
	constructor() {
		this.messages = [];
		this.container = null;
		this.root = null;
		this.listeners = [];
	}

	init() {
		if (!this.container) {
			this.container = document.createElement('div');
			document.body.appendChild(this.container);
			this.root = createRoot(this.container);
			this.render();
		}
	}

	subscribe(callback) {
		this.listeners.push(callback);
		return () => {
			this.listeners = this.listeners.filter(cb => cb !== callback);
		};
	}

	notify() {
		// 创建新数组引用，确保 React 能检测到变化
		const newMessages = [...this.messages];
		this.listeners.forEach(callback => callback(newMessages));
	}

	render() {
		const MessageWrapper = () => {
			const [messages, setMessages] = useState(this.messages);

			useEffect(() => {
				const unsubscribe = this.subscribe((newMessages) => {
					setMessages(newMessages);
				});
				return unsubscribe;
			}, []);

			const handleClose = (id) => {
				this.remove(id);
			};

			return <MessageContainer messages={messages} onClose={handleClose} />;
		};

		this.root.render(<MessageWrapper />);
	}

	add(config) {
		const id = Date.now() + Math.random();
		const message = {
			id,
			content: config.content,
			type: config.type || 'info',
			duration: config.duration ?? 3000
		};

		this.messages = [...this.messages, message];
		this.notify();

		return () => this.remove(id);
	}

	remove(id) {
		this.messages = this.messages.filter(msg => msg.id !== id);
		this.notify();
	}

	destroy() {
		if (this.container) {
			this.root.unmount();
			document.body.removeChild(this.container);
			this.container = null;
			this.root = null;
			this.messages = [];
			this.listeners = [];
		}
	}
}

const messageManager = new MessageManager();

// 对外暴露的 API
const message = {
	success(content, duration) {
		messageManager.init();
		return messageManager.add({ content, type: 'success', duration });
	},
	error(content, duration) {
		messageManager.init();
		return messageManager.add({ content, type: 'error', duration });
	},
	info(content, duration) {
		messageManager.init();
		return messageManager.add({ content, type: 'info', duration });
	},
	warning(content, duration) {
		messageManager.init();
		return messageManager.add({ content, type: 'warning', duration });
	},
	destroy() {
		messageManager.destroy();
	}
};

export default message;