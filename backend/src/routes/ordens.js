const express = require('express')
const router = express.Router()
const ordemController = require('../controllers/ordemController')
const { validateOrdem, validateId } = require('../middlewares/validation')
const { handleUpload } = require('../middlewares/upload')

// GET /api/ordens - Listar todas as ordens
router.get('/', ordemController.index)

// GET /api/ordens/stats - Estatísticas do dashboard
router.get('/stats', ordemController.stats)

// GET /api/ordens/relatorio - Relatório de ordens por período
router.get('/relatorio', ordemController.relatorio)

// GET /api/ordens/:id - Buscar ordem por ID
router.get('/:id', validateId, ordemController.show)

// POST /api/ordens - Criar nova ordem (com upload de fotos)
router.post('/', handleUpload, validateOrdem, ordemController.store)

// PUT /api/ordens/:id - Atualizar ordem
router.put('/:id', validateId, validateOrdem, ordemController.update)

// PATCH /api/ordens/:id/status - Alterar apenas o status da ordem
router.patch('/:id/status', validateId, ordemController.alterarStatus)

// DELETE /api/ordens/:id - Deletar ordem
router.delete('/:id', validateId, ordemController.destroy)

// POST /api/ordens/:id/fotos - Upload de fotos para ordem existente
router.post('/:id/fotos', validateId, handleUpload, ordemController.uploadFotos)

module.exports = router
