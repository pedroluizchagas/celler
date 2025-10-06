const supabaseManager = require('../utils/supabase')

/** @typedef {import('../orm/schema').Cliente} Cliente */

/**
 * Lista clientes (básico).
 * @returns {Promise<Cliente[]>}
 */
async function findAll() {
  const { data, error } = await supabaseManager.client
    .from('clientes')
    .select('*')
    .order('nome', { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * Busca cliente por ID.
 * @param {number} id
 * @returns {Promise<Cliente|null>}
 */
async function findById(id) {
  const { data, error } = await supabaseManager.client
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

module.exports = { findAll, findById }

