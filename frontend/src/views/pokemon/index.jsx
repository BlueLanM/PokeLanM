import { useState, useEffect } from 'react';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Popconfirm from '../../components/Popconfirm';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import message from "../../components/Message";
import { pokemonApi } from '../../api';
import { useForm } from '../../hooks/useForm';

import "./index.css"

const Pokemon = () => {
	const [pokemons, setPokemons] = useState([]);
	const [loading, setLoading] = useState(false);
	const [isAdding, setIsAdding] = useState(false);
	const [visible, setVisible] = useState(false);
	const [modalMode, setModalMode] = useState('add'); // 'add' | 'detail' | 'edit'
	const [currentId, setCurrentId] = useState(null);
	const [searchQuery, setSearchQuery] = useState(''); // 搜索关键词

	const { values, handleChange, reset, setValues } = useForm({
		name: '',
		type: ''
	});

	const columns = [
	{
		title: '编号',
		dataIndex: 'id',
	},
	{
		title: '名称',
		dataIndex: 'name',
	},
	{
		title: '属性',
		dataIndex: 'type',
	},
	{
		title: "操作",
		dataIndex: "action",
		render: (text, record) => (
			<div className="pokemon-action">
				<Button type="default" onClick={() => detailPokemon(record.id)}>详情详情详情</Button>
				<Button type="primary" onClick={() => editPokemon(record.id)}>编辑</Button>
				<Popconfirm
					title="确定要删除这个宝可梦吗？"
					description="删除后将无法恢复"
					onConfirm={() => removePokemon(record.id)}
					placement="top"
				>
					<Button type="primary" danger>删除</Button>
				</Popconfirm>
			</div>
		)
	}
]

	const fetchPokemons = async () => {
		try {
			setLoading(true);
			const data = await pokemonApi.getPokemons({ page: 1, limit: 10 });
			setPokemons(data?.data);
		} catch (err) {
			message.error('获取宝可梦列表失败！');
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async () => {
		if (!values.name || !values.type) {
			message.warning('请填写完整信息');
			return;
		}
		
		setIsAdding(true);
		
		try {
			if (modalMode === 'edit') {
				// 编辑模式：更新数据
				await pokemonApi.updatePokemon(currentId, values);
				message.success('更新成功！');
			} else {
				// 添加模式：创建新数据
				await pokemonApi.createPokemon(values);
				message.success('添加成功！');
			}
			
			setIsAdding(false);
			setVisible(false);
			reset();
			fetchPokemons(); // 刷新列表
		} catch (error) {
			setIsAdding(false);
			message.error(modalMode === 'edit' ? '更新宝可梦失败' : '添加宝可梦失败');
		}
	};

	const detailPokemon = async (id) => {
		try {
			const result = await pokemonApi.getPokemon(id);
			// 回显数据到表单
			setValues({
				name: result.data.name,
				type: result.data.type
			});
			setCurrentId(id);
			setModalMode('detail');
			setVisible(true);
		} catch (error) {
			message.error('获取宝可梦详情失败');
		}
	}

	const editPokemon = async (id) => {
		try {
			const result = await pokemonApi.getPokemon(id);
			// 回显数据到表单
			setValues({
				name: result.data.name,
				type: result.data.type
			});
			setCurrentId(id);
			setModalMode('edit');
			setVisible(true);
		} catch (error) {
			message.error('获取宝可梦详情失败');
		}
	}

	const removePokemon = async (id) => {
		try {
			await pokemonApi.deletePokemon(id);
			// 显示成功消息
			message.success('删除成功！');
			
			// 刷新数据
			fetchPokemons();
		} catch (error) {
			message.error('删除宝可梦失败');
		}
	}

	const close = () => {
		setVisible(false);
		reset();
		setModalMode('add');
		setCurrentId(null);
	};

	
	const handleSearch = (value) => {
		setSearchQuery(value);
	};

	const handleClearSearch = () => {
		setSearchQuery('');
	};


	useEffect(() => {
		fetchPokemons();
	}, []);

	return (
		<div className="pokemon">
			<h2 className="pokemon-title">宝可梦API</h2>
			<div className="pokemon-header">
				<div className="pokemon-header-left">
					<Button type="primary" onClick={() => setVisible(true)}>添加</Button>
				</div>
				<div className="pokemon-header-right">
					<Input
						placeholder="搜索游戏名称..."
						width={300}
						allowClear
						value={searchQuery}
						onChange={(e) => handleSearch(e.target.value)}
						onClear={handleClearSearch}
					/>
				</div>
			</div>
			<Table 
				rowKey="id" 
				dataSource={pokemons} 
				columns={columns}
				loading={loading} 
			/>
			<Modal
				title={modalMode === 'detail' ? "宝可梦详情" : modalMode === 'edit' ? "编辑宝可梦" : "添加宝可梦"}
				visible={visible}
				onOk={modalMode === 'detail' ? close : handleSubmit}
				onCancel={() => close()}
				confirmLoading={isAdding}
				okText={modalMode === 'detail' ? "关闭" : "确定"}
				cancelButtonVisible={modalMode !== 'detail'}
			>
				<div className="pokemon-modal-content">
					<div className="pokemon-flex">
						名称：<Input 
								placeholder="请输入内容" 
								width={420}
								value={values.name}
								onChange={(e) => handleChange('name', e.target.value)}
								disabled={modalMode === 'detail'}
							/>
					</div>
					<div className="pokemon-flex">
						属性：<Input 
								placeholder="请输入内容" 
								width={420}
								value={values.type}
								onChange={(e) => handleChange('type', e.target.value)}
								disabled={modalMode === 'detail'}
							/>
					</div>
				</div>
			</Modal>
		</div>
	)
}

export default Pokemon