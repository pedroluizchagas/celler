const { sanitizeForDb } = require('../utils/sanitize')
const supabaseManager = require('../utils/supabase')

/** @typedef {import('../orm/schema').Produto} Produto */
/** @typedef {import('../orm/schema').NewProduto} NewProduto */

/**
 * Lista produtos com filtros opcionais simples.
 * @param {{ ativo?: boolean }} [filtros]
 * @returns {Promise<Produto[]>}
 */
async function findAll(filtros = {}) {
  let query = supabaseManager.client.from('produtos_com_alertas').select('*')
  if (typeof filtros.ativo === 'boolean') {
    query = query.eq('ativo', filtros.ativo)
  }
  const { data, error } = await query.order('nome', { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * Busca um produto por ID.
 * @param {number} id
 * @returns {Promise<Produto|null>}
 */
async function findById(id) {
  const { data, error } = await supabaseManager.client
    .from('produtos')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

/**
 * Cria um novo produto.
 * @param {NewProduto} input
 * @returns {Promise<Produto>}
 */
async function create(input) {
  const payload = sanitizeForDb(input)
  const { data, error } = await supabaseManager.client
    .from('produtos')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return /** @type {Produto} */ (data)
}

/**
 * Atualiza um produto por ID.
 * @param {number} id
 * @param {Partial<NewProduto>} patch
 * @returns {Promise<Produto>}
 */
async function updateById(id, patch) {
  const payload = sanitizeForDb(patch)
  const { data, error } = await supabaseManager.client
    .from('produtos')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return /** @type {Produto} */ (data)
}

/**
 * Remove um produto por ID.
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function deleteById(id) {
  const { error } = await supabaseManager.client
    .from('produtos')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
}
