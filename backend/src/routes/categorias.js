const express = require('express')
const router = express.Router()
const categoriaController = require('../controllers/categoriaController')
const { normalizeListQuery } = require('../middlewares/normalizeQuery')
const { validateCategoriasQuery, validateIdParam } = require('../middlewares/zodValidation')

// Rotas de categorias
router.get('/', normalizeListQuery, validateCategoriasQuery, categoriaController.index)
router.post('/', categoriaController.store)
router.get('/:id', validateIdParam, categoriaController.show)
router.put('/:id', validateIdParam, categoriaController.update)
router.delete('/:id', validateIdParam, categoriaController.destroy)

module.exports = router
