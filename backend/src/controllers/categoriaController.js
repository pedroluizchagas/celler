const db = require('../utils/database-adapter')
const { LoggerManager } = require('../utils/logger')

class CategoriaController {
  // Listar todas as categorias
  async index(req, res) {
    try {
      const { ativo = '1' } = req.query

      const categorias = await db.all(
        `
        SELECT 
          c.*,
          COUNT(p.id) as total_produtos
        FROM categorias c
        LEFT JOIN produtos p ON c.id = p.categoria_id AND p.ativo = 1
        WHERE c.ativo = ?
        GROUP BY c.id
        ORDER BY c.nome ASC
      `,
        [ativo === '1' ? 1 : 0]
      )

      res.json({
        success: true,
        data: categorias,
        total: categorias.length,
      })
    } catch (error) {
      LoggerManager.error('Erro ao listar categorias:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Buscar categoria por ID
  async show(req, res) {
    try {
      const { id } = req.params

      const categoria = await db.get(
        `
        SELECT * FROM categorias WHERE id = ?
      `,
        [id]
      )

      if (!categoria) {
        return res.status(404).json({
          success: false,
          error: 'Categoria não encontrada',
        })
      }

      // Buscar produtos da categoria
      const produtos = await db.all(
        `
        SELECT id, nome, tipo, estoque_atual, estoque_minimo, preco_venda
        FROM produtos 
        WHERE categoria_id = ? AND ativo = 1
        ORDER BY nome ASC
      `,
        [id]
      )

      res.json({
        success: true,
        data: {
          ...categoria,
          produtos,
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao buscar categoria:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Criar nova categoria
  async store(req, res) {
    try {
      const { nome, descricao, icone } = req.body

      // Verificar se já existe categoria com o mesmo nome
      const categoriaExistente = await db.get(
        'SELECT id FROM categorias WHERE nome = ?',
        [nome]
      )

      if (categoriaExistente) {
        return res.status(400).json({
          success: false,
          error: 'Já existe uma categoria com este nome',
        })
      }

      const resultado = await db.run(
        `
        INSERT INTO categorias (nome, descricao, icone)
        VALUES (?, ?, ?)
      `,
        [nome.trim(), descricao?.trim(), icone?.trim()]
      )

      const novaCategoria = await db.get(
        'SELECT * FROM categorias WHERE id = ?',
        [resultado.id]
      )

      LoggerManager.audit('CATEGORIA_CRIADA', 'system', {
        categoriaId: resultado.id,
        nome: nome,
      })

      res.status(201).json({
        success: true,
        message: 'Categoria cadastrada com sucesso',
        data: novaCategoria,
      })
    } catch (error) {
      LoggerManager.error('Erro ao criar categoria:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Atualizar categoria
  async update(req, res) {
    try {
      const { id } = req.params
      const { nome, descricao, icone, ativo } = req.body

      const categoriaExistente = await db.get(
        'SELECT * FROM categorias WHERE id = ?',
        [id]
      )
      if (!categoriaExistente) {
        return res.status(404).json({
          success: false,
          error: 'Categoria não encontrada',
        })
      }

      // Verificar se nome já está em uso por outra categoria
      if (nome !== categoriaExistente.nome) {
        const nomeEmUso = await db.get(
          'SELECT id FROM categorias WHERE nome = ? AND id != ?',
          [nome, id]
        )
        if (nomeEmUso) {
          return res.status(400).json({
            success: false,
            error: 'Este nome já está em uso por outra categoria',
          })
        }
      }

      await db.run(
        `
        UPDATE categorias SET
          nome = ?, descricao = ?, icone = ?, ativo = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [nome.trim(), descricao?.trim(), icone?.trim(), ativo ? 1 : 0, id]
      )

      const categoriaAtualizada = await db.get(
        'SELECT * FROM categorias WHERE id = ?',
        [id]
      )

      LoggerManager.audit('CATEGORIA_ATUALIZADA', 'system', {
        categoriaId: id,
        nome: nome,
      })

      res.json({
        success: true,
        message: 'Categoria atualizada com sucesso',
        data: categoriaAtualizada,
      })
    } catch (error) {
      LoggerManager.error('Erro ao atualizar categoria:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Excluir categoria
  async destroy(req, res) {
    try {
      const { id } = req.params

      // Verificar se categoria existe
      const categoria = await db.get('SELECT * FROM categorias WHERE id = ?', [
        id,
      ])
      if (!categoria) {
        return res.status(404).json({
          success: false,
          error: 'Categoria não encontrada',
        })
      }

      // Verificar se há produtos vinculados
      const produtosVinculados = await db.get(
        'SELECT COUNT(*) as total FROM produtos WHERE categoria_id = ? AND ativo = 1',
        [id]
      )

      if (produtosVinculados.total > 0) {
        return res.status(400).json({
          success: false,
          error: `Não é possível excluir. Há ${produtosVinculados.total} produto(s) vinculado(s) a esta categoria.`,
        })
      }

      // Desativar ao invés de excluir
      await db.run(
        'UPDATE categorias SET ativo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      )

      LoggerManager.audit('CATEGORIA_DESATIVADA', 'system', {
        categoriaId: id,
        nome: categoria.nome,
      })

      res.json({
        success: true,
        message: 'Categoria desativada com sucesso',
      })
    } catch (error) {
      LoggerManager.error('Erro ao excluir categoria:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }
}

module.exports = new CategoriaController()
