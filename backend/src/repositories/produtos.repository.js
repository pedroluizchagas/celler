const { sanitizeForDb } = require('../utils/sanitize')
const supabaseManager = require('../utils/supabase')

/** @typedef {import('../orm/schema').Produto} Produto */
/** @typedef {import('../orm/schema').NewProduto} NewProduto */

/**
 * Lista produtos com filtros opcionais e paginação.
 * @param {{ 
 *   ativo?: boolean, 
 *   categoria_id?: number, 
 *   tipo?: string,
 *   estoque_baixo?: boolean,
 *   page?: number, 
 *   limit?: number 
 * }} [filtros]
 * @returns {Promise<{data: Produto[], total: number, page: number, limit: number, pages: number}>}
 */
async function findAll(filtros = {}) {
  const { 
    ativo, 
    categoria_id, 
    tipo, 
    estoque_baixo,
    page = 1, 
    limit = 10 
  } = filtros

  // Query para contar total
  let countQuery = supabaseManager.client
    .from('produtos_com_alertas')
    .select('*', { count: 'exact', head: true })

  // Query para dados
  let dataQuery = supabaseManager.client
    .from('produtos_com_alertas')
    .select('*')

  // Aplicar filtros em ambas as queries
  if (typeof ativo === 'boolean') {
    countQuery = countQuery.eq('ativo', ativo)
    dataQuery = dataQuery.eq('ativo', ativo)
  }

  if (categoria_id) {
    countQuery = countQuery.eq('categoria_id', categoria_id)
    dataQuery = dataQuery.eq('categoria_id', categoria_id)
  }

  if (tipo && ['peca', 'servico'].includes(tipo)) {
    countQuery = countQuery.eq('tipo', tipo)
    dataQuery = dataQuery.eq('tipo', tipo)
  }

  if (estoque_baixo === true) {
    countQuery = countQuery.eq('tem_alerta', true)
    dataQuery = dataQuery.eq('tem_alerta', true)
  }

  // Executar query de contagem
  const { count, error: countError } = await countQuery
  if (countError) throw countError

  // Calcular offset
  const offset = (page - 1) * limit

  // Executar query de dados com paginação e ordenação determinística
  const { data, error } = await dataQuery
    .order('nome', { ascending: true })
    .order('id', { ascending: true }) // ORDER BY determinístico
    .range(offset, offset + limit - 1)

  if (error) throw error

  return {
    data: data || [],
    total: count || 0,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil((count || 0) / limit)
  }
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
