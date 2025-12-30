import { useEffect } from 'react';
import Button from "../Button";
import './index.scss';

const Modal = ({
	visible = false,
	title = '标题',
	children,
	onOk,
	onCancel,
	okText = '确定',
	cancelText = '取消',
	width = 520,
	maskClosable = true,
	closable = true,
	footer = null,
	className = '',
	confirmLoading = false,
	cancelButtonVisible = true
}) => {
	// 处理ESC键关闭
	useEffect(() => {
		const handleEsc = (e) => {
			if (e.keyCode === 27 && visible && onCancel) {
				onCancel();
			}
		};

		if (visible) {
			document.addEventListener('keydown', handleEsc);
			document.body.style.overflow = 'hidden';
		}

		return () => {
			document.removeEventListener('keydown', handleEsc);
			document.body.style.overflow = 'unset';
		};
	}, [visible, onCancel]);

	if (!visible) return null;

	const handleMaskClick = (e) => {
		if (e.target === e.currentTarget && maskClosable && onCancel) {
			onCancel();
		}
	};

	const handleOk = () => {
		if (onOk) {
			onOk();
		}
	};

	const handleCancel = () => {
		if (onCancel) {
			onCancel();
		}
	};

	const renderFooter = () => {
		if (footer === null) {
			return (
				<div className="modal-footer">
					{cancelButtonVisible && (
						<Button type="default" onClick={handleCancel}>
							{cancelText}
						</Button>
					)}
					<Button type="primary" onClick={handleOk} loading={confirmLoading}>
						{okText}
					</Button>
				</div>
			);
		}
		return footer;
	};

	return (
		<div className="modal-mask" onClick={handleMaskClick}>
			<div className="modal-wrap">
				<div
					className={`modal ${className}`}
					style={{ width }}
				>
					<div className="modal-content">
						{/* 头部 */}
						<div className="modal-header">
							<div className="modal-title">{title}</div>
							{closable && (
								<button className="modal-close" onClick={handleCancel}>
									<span>×</span>
								</button>
							)}
						</div>

						{/* 内容 */}
						<div className="modal-body">
							{children}
						</div>

						{/* 底部 */}
						{renderFooter()}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Modal;