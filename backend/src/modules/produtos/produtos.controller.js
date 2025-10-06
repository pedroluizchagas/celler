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

// SELECT simples com repositório tipado
async function listProdutos(_req, res) {
  try {
    const data = await repo.findAll({ ativo: true })
    return res.json({ success: true, data, total: data.length })
  } catch (error) {
    return respondWithError(res, error, 'Erro ao listar produtos')
  }
}

module.exports = { postProduto, listProdutos }
