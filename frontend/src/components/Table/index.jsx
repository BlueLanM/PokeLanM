import { useRef, useState } from 'react';
import Loading from '../Loading';
import './index.scss';

const Table = ({ columns, dataSource, rowKey = 'key', loading = false, scrollY = 350 }) => {
	const scrollRef = useRef(null);
	const leftBodyRef = useRef(null);
	const rightBodyRef = useRef(null);
	const [showShadow, setShowShadow] = useState(false);

	const leftFixedColumns = columns.filter(col => col.fixed === 'left');
	const rightFixedColumns = columns.filter(col => col.fixed === 'right');
	const normalColumns = columns.filter(col => !col.fixed);

	const handleScroll = (e) => {
		setShowShadow(e.target.scrollLeft > 0);
	};

	// 同步垂直滚动
	const handleBodyScroll = (e) => {
		const scrollTop = e.target.scrollTop;
		if (leftBodyRef.current) leftBodyRef.current.scrollTop = scrollTop;
		if (rightBodyRef.current) rightBodyRef.current.scrollTop = scrollTop;
		if (scrollRef.current?.querySelector('.table-body')) {
			scrollRef.current.querySelector('.table-body').scrollTop = scrollTop;
		}
	};

	// 渲染表格部分
	const renderTableSection = (cols, isFixed = false) => (
		<div className="table-wrapper">
			<table className="table-header">
				<thead>
					<tr>
						{cols.map(col => (
							<th key={col.dataIndex} style={{ width: col.width }}>
								{col.title}
							</th>
						))}
					</tr>
				</thead>
			</table>
			<div 
				className="table-body" 
				style={{ maxHeight: scrollY }}
				onScroll={handleBodyScroll}
				ref={isFixed === 'left' ? leftBodyRef : isFixed === 'right' ? rightBodyRef : null}
			>
				<table>
					<tbody>
						{dataSource.map((record, index) => (
							<tr key={record[rowKey]}>
								{cols.map(col => (
									<td key={col.dataIndex} style={{ width: col.width }}>
										{col.render
											? col.render(record[col.dataIndex], record, index)
											: record[col.dataIndex]}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{loading && (
				<div className="table-loading-overlay">
					<Loading spinning={true} type="dots" tip="加载中..." />
				</div>
			)}
		</div>
	);

	return (
		<div className="table">
			{leftFixedColumns.length > 0 && (
				<div className={`fixed-left ${showShadow ? 'shadow' : ''}`}>
					{renderTableSection(leftFixedColumns, 'left')}
				</div>
			)}

			<div className="scroll-container" ref={scrollRef} onScroll={handleScroll}>
				{renderTableSection(normalColumns)}
			</div>

			{rightFixedColumns.length > 0 && (
				<div className="fixed-right">
					{renderTableSection(rightFixedColumns, 'right')}
				</div>
			)}
		</div>
	);
};

export default Table;