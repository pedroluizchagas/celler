const db = require('../utils/database-adapter')
const { LoggerManager } = require('../utils/logger')

class CategoriaController {
  // Listar todas as categorias
  async index(req, res) {
    try {
      const { ativo = '1' } = req.query
      const supabase = require('../utils/supabase')

      // 1) Buscar categorias (Supabase, sem SQL cru)
      const ativoBool = ativo === '1' || ativo === true
      const { data: categoriasRows, error: catErr } = await supabase.client
        .from('categorias')
        .select('id, nome, descricao, icone, ativo, created_at, updated_at')
        .eq('ativo', ativoBool)
        .order('nome', { ascending: true })
      if (catErr) throw catErr

      const categorias = categoriasRows || []
      const ids = categorias.map(c => c.id)

      // 2) Contagem de produtos por categoria (ativo=true)
      let totalPorCategoria = {}
      if (ids.length) {
        const { data: produtosRows, error: prodErr } = await supabase.client
          .from('produtos')
          .select('id, categoria_id, ativo')
          .in('categoria_id', ids)
        if (prodErr) {
          LoggerManager.warn('Falha ao contar produtos por categoria:', prodErr.message)
        } else {
          totalPorCategoria = produtosRows
            .filter(p => p.ativo === true || p.ativo === 1)
            .reduce((acc, p) => {
              acc[p.categoria_id] = (acc[p.categoria_id] || 0) + 1
              return acc
            }, {})
        }
      }

      // 3) Montar resposta com total_produtos
      const out = categorias.map(c => ({
        ...c,
        total_produtos: totalPorCategoria[c.id] || 0,
      }))

      res.json({
        success: true,
        data: out,
        total: out.length,
      })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao listar categorias')
    }
  }

  // Buscar categoria por ID
  async show(req, res) {
    try {
      const { id } = req.params
      const supabase = require('../utils/supabase')

      const { data: catRows, error: catErr } = await supabase.client
        .from('categorias')
        .select('*')
        .eq('id', parseInt(id))
        .limit(1)
      if (catErr) throw catErr
      const categoria = (catRows || [])[0]

      if (!categoria) {
        return res.status(404).json({
          success: false,
          error: 'Categoria não encontrada',
        })
      }

      const { data: produtos, error: prodErr } = await supabase.client
        .from('produtos')
        .select('id, nome, tipo, estoque_atual, estoque_minimo, preco_venda, ativo')
        .eq('categoria_id', parseInt(id))
        .eq('ativo', true)
        .order('nome', { ascending: true })
      if (prodErr) throw prodErr

      res.json({
        success: true,
        data: {
          ...categoria,
          produtos: produtos || [],
        },
      })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao buscar categoria')
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
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao criar categoria')
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
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao atualizar categoria')
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
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao excluir categoria')
    }
  }
}

module.exports = new CategoriaController()
