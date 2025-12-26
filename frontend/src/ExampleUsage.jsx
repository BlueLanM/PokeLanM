import { useState, useEffect } from 'react';
import { pokemonApi } from './api';

/**
 * 使用示例组件
 * 展示如何在 React 组件中使用封装的 API
 */
function ExampleUsage() {
	const [pokemons, setPokemons] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// 示例 1: 获取宝可梦列表
	const fetchPokemons = async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await pokemonApi.getPokemons({ page: 1, limit: 10 });
			setPokemons(data?.data);
		} catch (err) {
			setError(err.message);
			console.error('获取宝可梦列表失败:', err);
		} finally {
			setLoading(false);
		}
	};

	// 示例 2: 获取单个宝可梦
	const fetchPokemon = async (id) => {
		try {
			setLoading(true);
			setError(null);
			const data = await pokemonApi.getPokemon(id);
			console.log('获取到的宝可梦:', data);
		} catch (err) {
			setError(err.message);
			console.error('获取宝可梦失败:', err);
		} finally {
			setLoading(false);
		}
	};

	// 示例 3: 创建新宝可梦
	const createPokemon = async () => {
		try {
			setLoading(true);
			setError(null);
			const newPokemon = {
				name: '皮卡丘',
				type: '电',
				hp: 35,
				attack: 55,
				defense: 40,
				speed: 90,
			};
			const data = await pokemonApi.createPokemon(newPokemon);
			console.log('创建成功:', data);
			// 重新获取列表
			await fetchPokemons();
		} catch (err) {
			setError(err.message);
			console.error('创建宝可梦失败:', err);
		} finally {
			setLoading(false);
		}
	};

	// 示例 4: 更新宝可梦
	const updatePokemon = async (id) => {
		try {
			setLoading(true);
			setError(null);
			const updateData = {
				name: '皮卡丘（进化）',
				hp: 45,
			};
			const data = await pokemonApi.updatePokemon(id, updateData);
			console.log('更新成功:', data);
			// 重新获取列表
			await fetchPokemons();
		} catch (err) {
			setError(err.message);
			console.error('更新宝可梦失败:', err);
		} finally {
			setLoading(false);
		}
	};

	// 示例 5: 删除宝可梦
	const deletePokemon = async (id) => {
		try {
			setLoading(true);
			setError(null);
			await pokemonApi.deletePokemon(id);
			console.log('删除成功');
			// 重新获取列表
			await fetchPokemons();
		} catch (err) {
			setError(err.message);
			console.error('删除宝可梦失败:', err);
		} finally {
			setLoading(false);
		}
	};

	// 组件加载时获取数据
	useEffect(() => {
		fetchPokemons();
	}, []);

	return (
		<div>
			<h1>Pokemon API 使用示例</h1>

			{loading && <p>加载中...</p>}
			{error && <p style={{ color: 'red' }}>错误: {error}</p>}

			<div>
				<button onClick={fetchPokemons} disabled={loading}>
					刷新列表
				</button>
				<button onClick={createPokemon} disabled={loading}>
					创建新宝可梦
				</button>
			</div>

			<div>
				<h2>宝可梦列表</h2>
				<ul>
					{pokemons.map((pokemon) => (
						<li key={pokemon.id}>
							{pokemon.name} - {pokemon.type}
							<button onClick={() => fetchPokemon(pokemon.id)}>查看详情</button>
							<button onClick={() => updatePokemon(pokemon.id)}>更新</button>
							<button onClick={() => deletePokemon(pokemon.id)}>删除</button>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

export default ExampleUsage;

/**
 * 其他使用方式示例:
 * 
 * 1. 在普通函数中使用:
 * async function someFunction() {
 *   try {
 *     const data = await pokemonApi.getPokemons();
 *     console.log(data);
 *   } catch (error) {
 *     console.error(error.message);
 *   }
 * }
 * 
 * 2. 使用 .then() 链式调用:
 * pokemonApi.getPokemons()
 *   .then(data => {
 *     console.log(data);
 *   })
 *   .catch(error => {
 *     console.error(error.message);
 *   });
 * 
 * 3. 带查询参数:
 * pokemonApi.getPokemons({ 
 *   page: 1, 
 *   limit: 20, 
 *   search: 'pikachu' 
 * });
 * 
 * 4. 并发请求:
 * Promise.all([
 *   pokemonApi.getPokemon(1),
 *   pokemonApi.getPokemon(2),
 *   pokemonApi.getPokemon(3)
 * ]).then(results => {
 *   console.log('所有请求完成:', results);
 * });
 */
