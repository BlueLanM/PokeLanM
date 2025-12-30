import './index.scss';

// type: 'default' | 'primary' | 'dashed' | 'link' | 'text';

const Button = ({
	type = 'default',
	size = 'middle',
	children,
	disabled = false,
	loading = false,
	icon,
	block = false,
	danger = false,
	ghost = false,
	shape = 'default',
	htmlType = 'button',
	onClick,
	className = '',
	style = {},
	...rest
}) => {
	const classNames = [
		'btn',
		`btn-${type}`,
		`btn-${size}`,
		shape === 'circle' ? 'btn-circle' : shape === 'round' ? 'btn-round' : '',
		block ? 'btn-block' : '',
		danger ? 'btn-danger' : '',
		ghost ? 'btn-ghost' : '',
		disabled || loading ? 'btn-disabled' : '',
		className
	].filter(Boolean).join(' ');

	const handleClick = (e) => {
		if (disabled || loading) {
			e.preventDefault();
			return;
		}
		onClick && onClick(e);
	};

	return (
		<button
			type={htmlType}
			className={classNames}
			disabled={disabled || loading}
			onClick={handleClick}
			style={style}
			{...rest}
		>
			{loading && (
				<span className="btn-loading-icon">
					<span className="spinner"></span>
				</span>
			)}
			{!loading && icon && <span className="btn-icon">{icon}</span>}
			{children && <span className="btn-text">{children}</span>}
		</button>
	);
};

export default Button;