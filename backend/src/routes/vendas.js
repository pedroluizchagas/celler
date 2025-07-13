const express = require('express')
const router = express.Router()
const vendaController = require('../controllers/vendaController')

// Rotas de vendas
router.get('/', vendaController.index)
router.post('/', vendaController.store)
router.get('/relatorio', vendaController.relatorio)
router.get('/estatisticas', vendaController.estatisticas)
router.get('/:id', vendaController.show)

// Migrar vendas existentes para o módulo financeiro
router.post('/migrar-financeiro', vendaController.migrarVendasParaFinanceiro)

module.exports = router
