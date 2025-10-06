const express = require('express')

// Controllers
const { postProduto, listProdutos } = require('../../src/modules/produtos/produtos.controller')
const ordemController = require('../../src/controllers/ordemController')

function buildApp() {
  const app = express()
  app.use(express.json())

  // Rotas mínimas para os testes
  app.post('/api/produtos', postProduto)
  app.get('/api/produtos', listProdutos)
  app.get('/api/ordens/stats', ordemController.stats)

  return app
}

module.exports = { buildApp }

