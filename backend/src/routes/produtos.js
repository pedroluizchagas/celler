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
    const db = require('../utils/database-adapter')
    const produtos = await db.all(
      'SELECT id, nome, estoque_atual, estoque_minimo, ativo FROM produtos ORDER BY id'
    )

    const stats = {
      total: await db.get(
        'SELECT COUNT(*) as count FROM produtos WHERE ativo = 1'
      ),
      disponivel: await db.get(
        'SELECT COUNT(*) as count FROM produtos WHERE ativo = 1 AND estoque_atual > estoque_minimo'
      ),
      estoque_baixo: await db.get(
        'SELECT COUNT(*) as count FROM produtos WHERE ativo = 1 AND estoque_atual > 0 AND estoque_atual <= estoque_minimo'
      ),
      sem_estoque: await db.get(
        'SELECT COUNT(*) as count FROM produtos WHERE ativo = 1 AND estoque_atual = 0'
      ),
    }

    res.json({ produtos, stats })
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
