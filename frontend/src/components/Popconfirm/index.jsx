import { useState, useRef, useEffect } from 'react';
import Button from '../Button';
import './index.scss';

const Popconfirm = ({
	title = '确定要删除吗？',
	description = '',
	onConfirm,
	onCancel,
	okText = '确定',
	cancelText = '取消',
	children,
	placement = 'top'
}) => {
	const [visible, setVisible] = useState(false);
	const [loading, setLoading] = useState(false);
	const [position, setPosition] = useState({ top: 0, left: 0 });
	const [ready, setReady] = useState(false);
	const popconfirmRef = useRef(null);
	const triggerRef = useRef(null);

	// 点击外部关闭
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (popconfirmRef.current && !popconfirmRef.current.contains(event.target)) {
				setVisible(false);
			}
		};

		if (visible) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [visible]);

	const calculatePosition = () => {
		if (!triggerRef.current) return;
		
		const rect = triggerRef.current.getBoundingClientRect();
		const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
		const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
		
		let top = 0;
		let left = 0;
		
		switch (placement) {
			case 'top':
				top = rect.top + scrollTop - 10;
				left = rect.left + scrollLeft + rect.width / 2;
				break;
			case 'bottom':
				top = rect.bottom + scrollTop + 10;
				left = rect.left + scrollLeft + rect.width / 2;
				break;
			case 'left':
				top = rect.top + scrollTop + rect.height / 2;
				left = rect.left + scrollLeft - 10;
				break;
			case 'right':
				top = rect.top + scrollTop + rect.height / 2;
				left = rect.right + scrollLeft + 10;
				break;
			default:
				top = rect.top + scrollTop - 10;
				left = rect.left + scrollLeft + rect.width / 2;
		}
		
		setPosition({ top, left });
		setReady(true);
	};

	const handleClick = (e) => {
		e.stopPropagation();
		
		if (!visible) {
			setVisible(true);
			setReady(false);
			requestAnimationFrame(() => {
				calculatePosition();
			});
		} else {
			setVisible(false);
			setReady(false);
		}
	};

	const handleConfirm = async (e) => {
		e.stopPropagation();
		if (onConfirm) {
			setLoading(true);
			try {
				await onConfirm();
				setVisible(false);
			} catch (error) {
				console.error(error);
			} finally {
				setLoading(false);
			}
		} else {
			setVisible(false);
		}
	};

	const handleCancel = (e) => {
		e.stopPropagation();
		setVisible(false);
		setReady(false);
		onCancel?.();
	};

	return (
		<div className="popconfirm-wrapper" ref={popconfirmRef}>
			<div ref={triggerRef} onClick={handleClick}>
				{children}
			</div>
			{visible && (
				<div 
					className={`popconfirm-content popconfirm-placement-${placement} ${ready ? 'popconfirm-ready' : ''}`}
					style={{
						top: `${position.top}px`,
						left: `${position.left}px`
					}}
				>
					<div className="popconfirm-inner">
						<div className="popconfirm-message">
							<span className="popconfirm-message-icon">
								<svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
									<path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440a48.01 48.01 0 0 1 0-96 48.01 48.01 0 0 1 0 96z" />
								</svg>
							</span>
							<div className="popconfirm-message-text">
								<div className="popconfirm-title">{title}</div>
								{description && <div className="popconfirm-description">{description}</div>}
							</div>
						</div>
						<div className="popconfirm-buttons">
							<Button size="small" onClick={handleCancel}>
								{cancelText}
							</Button>
							<Button size="small" type="primary" danger onClick={handleConfirm} loading={loading}>
								{okText}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Popconfirm;
