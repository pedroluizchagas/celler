const supabaseManager = require('../utils/supabase')

/** @typedef {import('../orm/schema').Ordem} Ordem */

/**
 * Lista ordens (básico).
 * @returns {Promise<Ordem[]>}
 */
async function findAll() {
  const { data, error } = await supabaseManager.client
    .from('ordens')
    .select('*')
    .order('data_entrada', { ascending: false })
  if (error) throw error
  return data || []
}

/**
 * Busca ordem por ID.
 * @param {number} id
 * @returns {Promise<Ordem|null>}
 */
async function findById(id) {
  const { data, error } = await supabaseManager.client
    .from('ordens')
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

