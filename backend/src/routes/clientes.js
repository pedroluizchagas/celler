const express = require('express')
const router = express.Router()
const clienteController = require('../controllers/clienteController')
const { validateCliente, validateId } = require('../middlewares/validation')

// GET /api/clientes - Listar todos os clientes
router.get('/', clienteController.index)

// GET /api/clientes/search?q=termo - Buscar clientes
router.get('/search', clienteController.search)

// GET /api/clientes/:id - Buscar cliente por ID
router.get('/:id', validateId, clienteController.show)

// POST /api/clientes - Criar novo cliente
router.post('/', validateCliente, clienteController.store)

// PUT /api/clientes/:id - Atualizar cliente
router.put('/:id', validateId, validateCliente, clienteController.update)

// DELETE /api/clientes/:id - Deletar cliente
router.delete('/:id', validateId, clienteController.destroy)

module.exports = router
