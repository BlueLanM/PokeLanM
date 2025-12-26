import { query } from "../config/database.js";

// 获取所有 Pokemon
export async function getAllPokemons() {
	const sql = "SELECT * FROM pokemons ORDER BY id";
	return await query(sql);
}

// 根据 ID 获取单个 Pokemon
export async function getPokemonById(id) {
	const sql = "SELECT * FROM pokemons WHERE id = ?";
	const results = await query(sql, [id]);
	return results[0];
}

// 创建新的 Pokemon
export async function createPokemon(pokemonData) {
	const { name, type, hp, attack, defense, speed } = pokemonData;
	const sql = `
    INSERT INTO pokemons (name, type, hp, attack, defense, speed)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
	const result = await query(sql, [name, type, hp, attack, defense, speed]);
	return result.insertId;
}

// 更新 Pokemon
export async function updatePokemon(id, pokemonData) {
	// 过滤掉 undefined 值，只更新提供的字段
	const fields = [];
	const values = [];

	if (pokemonData.name !== undefined) {
		fields.push("name = ?");
		values.push(pokemonData.name);
	}
	if (pokemonData.type !== undefined) {
		fields.push("type = ?");
		values.push(pokemonData.type);
	}
	if (pokemonData.hp !== undefined) {
		fields.push("hp = ?");
		values.push(pokemonData.hp);
	}
	if (pokemonData.attack !== undefined) {
		fields.push("attack = ?");
		values.push(pokemonData.attack);
	}
	if (pokemonData.defense !== undefined) {
		fields.push("defense = ?");
		values.push(pokemonData.defense);
	}
	if (pokemonData.speed !== undefined) {
		fields.push("speed = ?");
		values.push(pokemonData.speed);
	}

	if (fields.length === 0) {
		throw new Error("没有要更新的字段");
	}

	const sql = `UPDATE pokemons SET ${fields.join(", ")} WHERE id = ?`;
	values.push(id);

	await query(sql, values);
	return true;
}

// 删除 Pokemon
export async function deletePokemon(id) {
	const sql = "DELETE FROM pokemons WHERE id = ?";
	await query(sql, [id]);
	return true;
}