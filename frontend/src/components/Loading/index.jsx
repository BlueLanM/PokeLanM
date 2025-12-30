import './index.scss';

const Loading = ({
	spinning = true,
	type = 'normal',
	tip,
	color = '#1890ff',
	size = 'default',
	fullscreen = false,
	children
}) => {
	const sizeMap = {
		small: 16,
		default: 32,
		large: 48
	};

	const iconSize = sizeMap[size];

	const renderLoading = () => {
		const iconStyle = {
			width: iconSize,
			height: iconSize,
			color: color
		};

		switch (type) {
			case 'normal':
				return (
					<div className="loading-normal" style={iconStyle}>
						<div className="normal-circle" style={{ borderTopColor: color }}></div>
					</div>
				);

			case 'dots':
				return (
					<div className="loading-dots" style={iconStyle}>
						<span style={{ backgroundColor: color }}></span>
						<span style={{ backgroundColor: color }}></span>
						<span style={{ backgroundColor: color }}></span>
					</div>
				);

			case 'bars':
				return (
					<div className="loading-bars" style={iconStyle}>
						<span style={{ backgroundColor: color }}></span>
						<span style={{ backgroundColor: color }}></span>
						<span style={{ backgroundColor: color }}></span>
						<span style={{ backgroundColor: color }}></span>
					</div>
				);

			case 'ring':
				return (
					<div className="loading-ring" style={iconStyle}>
						<div style={{ borderColor: `${color} transparent transparent transparent` }}></div>
						<div style={{ borderColor: `${color} transparent transparent transparent` }}></div>
						<div style={{ borderColor: `${color} transparent transparent transparent` }}></div>
						<div style={{ borderColor: `${color} transparent transparent transparent` }}></div>
					</div>
				);

			case 'pulse':
				return (
					<div className="loading-pulse" style={iconStyle}>
						<div style={{ backgroundColor: color }}></div>
						<div style={{ backgroundColor: color }}></div>
					</div>
				);

			default:
				return null;
		}
	};

	if (!spinning) {
		return <>{children}</>;
	}

	const spinner = (
		<div className={`loading-spinner loading-spinner-${size}`}>
			{renderLoading()}
			{tip && <div className="loading-tip" style={{ color }}>{tip}</div>}
		</div>
	);

	if (fullscreen) {
		return (
			<div className="loading-fullscreen">
				{spinner}
			</div>
		);
	}

	if (children) {
		return (
			<div className="loading-container">
				<div className="loading-blur">{children}</div>
				<div className="loading-mask">{spinner}</div>
			</div>
		);
	}

	return spinner;
};

export default Loading;
