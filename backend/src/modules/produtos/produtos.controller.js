const { ProdutoSchema } = require('./produtos.schema.js')
const repo = require('../../repositories/produtos.repository')
const { respondWithError } = require('../../utils/http-error')

async function postProduto(req, res) {
  try {
    const payload = ProdutoSchema.parse(req.body)
    const novo = await repo.create(payload)
    return res.status(201).json(novo)
  } catch (err) {
    if (err?.issues) {
      return res.status(400).json({
        message: 'Dados invalidos',
        details: err.issues.map((issue) => ({
          path: issue.path?.join('.') || null,
          code: issue.code,
          message: issue.message,
        })),
      })
    }

    return respondWithError(res, err, 'Falha ao cadastrar produto')
  }
}

// SELECT com paginação e filtros usando repositório tipado
async function listProdutos(req, res) {
  try {
    const {
      ativo = true,
      categoria_id,
      tipo,
      estoque_baixo,
      page = 1,
      limit = 10
    } = req.query

    const filtros = {
      ativo: ativo === 'true' || ativo === true,
      page: parseInt(page),
      limit: parseInt(limit)
    }

    // Adicionar filtros opcionais apenas se fornecidos
    if (categoria_id) {
      filtros.categoria_id = parseInt(categoria_id)
    }

    if (tipo && ['peca', 'servico'].includes(tipo)) {
      filtros.tipo = tipo
    }

    // aceitar booleano direto ou strings 'true'/'1'
    if (estoque_baixo === true || estoque_baixo === 'true' || estoque_baixo === '1') {
      filtros.estoque_baixo = true
    }

    const result = await repo.findAll(filtros)
    
    return res.json({ 
      success: true, 
      ...result
    })
  } catch (error) {
    return respondWithError(res, error, 'Erro ao listar produtos')
  }
}

module.exports = { postProduto, listProdutos }
