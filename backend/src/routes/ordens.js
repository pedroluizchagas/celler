const express = require('express')
const router = express.Router()
const ordemController = require('../controllers/ordemController')
const { validateOrdem, validateOrdemUpdate, validateId } = require('../middlewares/validation')
const { handleUpload } = require('../middlewares/upload')
const { normalizeListQuery, normalizeStatsQuery } = require('../middlewares/normalizeQuery')
const { validateOrdensQuery, validateStatsQuery, validateIdParam } = require('../middlewares/zodValidation')

// GET /api/ordens - Listar todas as ordens
router.get('/', normalizeListQuery, validateOrdensQuery, ordemController.index)

// GET /api/ordens/stats - Estatísticas do dashboard
router.get('/stats', normalizeStatsQuery, validateStatsQuery, ordemController.stats)

// GET /api/ordens/relatorio - Relatório de ordens por período
router.get('/relatorio', normalizeStatsQuery, validateStatsQuery, ordemController.relatorio)

// GET /api/ordens/:id - Buscar ordem por ID
router.get('/:id', validateIdParam, ordemController.show)

// POST /api/ordens - Criar nova ordem (com upload de fotos)
router.post('/', handleUpload, validateOrdem, ordemController.store)

// PUT /api/ordens/:id - Atualizar ordem
router.put('/:id', validateIdParam, validateOrdemUpdate, ordemController.update)

// PATCH /api/ordens/:id/status - Alterar apenas o status da ordem
router.patch('/:id/status', validateIdParam, ordemController.alterarStatus)

// DELETE /api/ordens/:id - Deletar ordem
router.delete('/:id', validateIdParam, ordemController.destroy)

// POST /api/ordens/:id/fotos - Upload de fotos para ordem existente
router.post('/:id/fotos', validateIdParam, handleUpload, ordemController.uploadFotos)

module.exports = router
