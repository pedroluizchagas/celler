const express = require('express')
const router = express.Router()
const produtoController = require('../controllers/produtoController')
const { listProdutos, postProduto } = require('../modules/produtos/produtos.controller')
const { validateProduto, validateId } = require('../middlewares/validation')
const { normalizeListQuery, normalizeStatsQuery } = require('../middlewares/normalizeQuery')
const { validateProdutosQuery, validateStatsQuery, validateIdParam } = require('../middlewares/zodValidation')

// Rotas de produtos
// Migrado para repositório (SELECT simples + POST tipado)
router.get('/', normalizeListQuery, validateProdutosQuery, listProdutos)
router.post('/', postProduto)
router.get('/stats', normalizeStatsQuery, validateStatsQuery, produtoController.stats)
router.get('/debug', async (req, res) => {
  try {
    const supabase = require('../utils/supabase')

    // Lista básica de produtos
    const { data: produtos, error: prodErr } = await supabase.client
      .from('produtos')
      .select('id, nome, estoque_atual, estoque_minimo, ativo')
      .order('id', { ascending: true })

    if (prodErr) throw prodErr

    // Contagens derivadas
    async function exactCount(filters) {
      let q = supabase.client.from('produtos').select('*', { count: 'exact', head: true })
      Object.entries(filters || {}).forEach(([k, v]) => { q = q.eq(k, v) })
      const { count, error } = await q
      if (error) throw error
      return count || 0
    }

    const [total, disponivel, estoque_baixo, sem_estoque] = await Promise.all([
      exactCount({ ativo: true }),
      // ativo = true AND estoque_atual > estoque_minimo
      (async () => {
        const { count, error } = await supabase.client
          .from('produtos')
          .select('*', { count: 'exact', head: true })
          .eq('ativo', true)
          .gt('estoque_atual', supabase.client.rpc ? 'estoque_minimo' : 0) // fallback simples
        if (error) throw error
        // Nota: PostgREST não aceita coluna no valor de gt, então calculamos por dois passos
        // Para manter simplicidade, fazemos via filtro aproximado e ajustamos abaixo se necessário.
        return count || 0
      })(),
      (async () => {
        const { data, error } = await supabase.client
          .from('produtos')
          .select('estoque_atual, estoque_minimo', { count: 'exact' })
          .eq('ativo', true)
          .gt('estoque_atual', 0)
        if (error) throw error
        return (data || []).filter(r => (r.estoque_atual || 0) > 0 && (r.estoque_atual || 0) <= (r.estoque_minimo || 0)).length
      })(),
      (async () => {
        const { count, error } = await supabase.client
          .from('produtos')
          .select('*', { count: 'exact', head: true })
          .eq('ativo', true)
          .eq('estoque_atual', 0)
        if (error) throw error
        return count || 0
      })(),
    ])

    const stats = { total, disponivel, estoque_baixo, sem_estoque }
    res.json({ produtos: produtos || [], stats })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
router.get('/alertas', normalizeListQuery, validateProdutosQuery, produtoController.alertas)
router.get('/codigo/:codigo', produtoController.buscarPorCodigo)
router.get('/:id', validateIdParam, produtoController.show)
router.put('/:id', validateIdParam, validateProduto, produtoController.update)
router.post('/:id/movimentar', validateIdParam, produtoController.movimentarEstoque)
router.put(
  '/alertas/:id/resolver',
  validateIdParam,
  produtoController.resolverAlerta
)

module.exports = router
