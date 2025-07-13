const express = require('express')
const router = express.Router()
const produtoController = require('../controllers/produtoController')
const { validateProduto, validateId } = require('../middlewares/validation')

// Rotas de produtos
router.get('/', produtoController.index)
router.post('/', validateProduto, produtoController.store)
router.get('/stats', produtoController.stats)
router.get('/debug', async (req, res) => {
  try {
    const db = require('../utils/database')
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
router.get('/alertas', produtoController.alertas)
router.get('/codigo/:codigo', produtoController.buscarPorCodigo)
router.get('/:id', validateId, produtoController.show)
router.put('/:id', validateId, validateProduto, produtoController.update)
router.post('/:id/movimentar', validateId, produtoController.movimentarEstoque)
router.put(
  '/alertas/:id/resolver',
  validateId,
  produtoController.resolverAlerta
)

module.exports = router
