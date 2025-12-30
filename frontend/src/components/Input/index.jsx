import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import './index.scss';

const Input = forwardRef((props, ref) => {
	const {
		size = 'middle',
		prefix,
		suffix,
		allowClear = false,
		status,
		width,
		bordered = true,
		disabled = false,
		className = '',
		value: propValue,
		defaultValue,
		onChange,
		onClear,
		addonBefore,
		addonAfter,
		...restProps
	} = props;

	const [value, setValue] = useState(defaultValue || '');
	const inputRef = useRef(null);

	useImperativeHandle(ref, () => inputRef.current);

	const isControlled = propValue !== undefined;
	const inputValue = isControlled ? propValue : value;

	const handleChange = (e) => {
		if (!isControlled) {
			setValue(e.target.value);
		}
		onChange?.(e);
	};

	const handleClear = () => {
		const event = {
			target: { value: '' },
		};

		if (!isControlled) {
			setValue('');
		}
		onChange?.(event);
		onClear?.();
		inputRef.current?.focus();
	};

	const showClear = allowClear && inputValue && !disabled;

	const wrapperClasses = [
		'custom-input-wrapper',
		`custom-input-${size}`,
		status && `custom-input-${status}`,
		!bordered && 'custom-input-borderless',
		disabled && 'custom-input-disabled',
		(addonBefore || addonAfter) && 'custom-input-group',
		className
	].filter(Boolean).join(' ');

	const inputNode = (
		<span className="custom-input-affix-wrapper">
			{prefix && <span className="custom-input-prefix">{prefix}</span>}
			<input
				ref={inputRef}
				className="custom-input"
				value={inputValue}
				disabled={disabled}
				onChange={handleChange}
				{...restProps}
			/>
			{showClear && (
				<span
					className="custom-input-clear-icon"
					onClick={handleClear}
					role="button"
				>
					✕
				</span>
			)}
			{suffix && <span className="custom-input-suffix">{suffix}</span>}
		</span>
	);

	if (addonBefore || addonAfter) {
		return (
			<span className={wrapperClasses}>
				{addonBefore && <span className="custom-input-addon-before">{addonBefore}</span>}
				{inputNode}
				{addonAfter && <span className="custom-input-addon-after">{addonAfter}</span>}
			</span>
		);
	}

	return <span className={wrapperClasses} style={{ width }}>{inputNode}</span>;
});

Input.displayName = 'Input';

export default Input;
