const express = require('express')
const router = express.Router()
const vendaController = require('../controllers/vendaController')
const { normalizeListQuery, normalizeStatsQuery } = require('../middlewares/normalizeQuery')
const { validateVendasQuery, validateStatsQuery, validateIdParam } = require('../middlewares/zodValidation')

// Rotas de vendas
router.get('/', normalizeListQuery, validateVendasQuery, vendaController.index)
router.post('/', vendaController.store)
router.get('/relatorio', normalizeStatsQuery, validateStatsQuery, vendaController.relatorio)
router.get('/estatisticas', normalizeStatsQuery, validateStatsQuery, vendaController.estatisticas)
router.get('/:id', validateIdParam, vendaController.show)

// Migrar vendas existentes para o módulo financeiro
router.post('/migrar-financeiro', vendaController.migrarVendasParaFinanceiro)

module.exports = router
