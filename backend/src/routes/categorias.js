const express = require('express')
const router = express.Router()
const categoriaController = require('../controllers/categoriaController')

// Rotas de categorias
router.get('/', categoriaController.index)
router.post('/', categoriaController.store)
router.get('/:id', categoriaController.show)
router.put('/:id', categoriaController.update)
router.delete('/:id', categoriaController.destroy)

module.exports = router
