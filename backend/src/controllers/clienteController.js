const db = require('../utils/database')

class ClienteController {
  // Listar todos os clientes
  async index(req, res) {
    try {
      const clientes = await db.all(`
        SELECT 
          id, nome, telefone, email, endereco, cidade,
          created_at, updated_at
        FROM clientes 
        ORDER BY nome ASC
      `)

      res.json({
        success: true,
        data: clientes,
        total: clientes.length,
      })
    } catch (error) {
      console.error('Erro ao listar clientes:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Buscar cliente por ID
  async show(req, res) {
    try {
      const { id } = req.params

      const cliente = await db.get(
        `
        SELECT 
          id, nome, telefone, email, endereco, cidade,
          created_at, updated_at
        FROM clientes 
        WHERE id = ?
      `,
        [id]
      )

      if (!cliente) {
        return res.status(404).json({
          success: false,
          error: 'Cliente não encontrado',
        })
      }

      // Buscar ordens do cliente
      const ordens = await db.all(
        `
        SELECT 
          id, equipamento, defeito, status, 
          data_entrada, data_prazo
        FROM ordens 
        WHERE cliente_id = ?
        ORDER BY data_entrada DESC
      `,
        [id]
      )

      res.json({
        success: true,
        data: {
          ...cliente,
          ordens,
        },
      })
    } catch (error) {
      console.error('Erro ao buscar cliente:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Criar novo cliente
  async store(req, res) {
    try {
      const { nome, telefone, email, endereco, cidade } = req.body

      // Verificar se já existe cliente com o mesmo telefone
      const clienteExistente = await db.get(
        'SELECT id FROM clientes WHERE telefone = ?',
        [telefone]
      )

      if (clienteExistente) {
        return res.status(400).json({
          success: false,
          error: 'Já existe um cliente cadastrado com este telefone',
        })
      }

      const resultado = await db.run(
        `
        INSERT INTO clientes (nome, telefone, email, endereco, cidade)
        VALUES (?, ?, ?, ?, ?)
      `,
        [
          nome.trim(),
          telefone.trim(),
          email?.trim() || null,
          endereco?.trim() || null,
          cidade?.trim() || null,
        ]
      )

      const novoCliente = await db.get('SELECT * FROM clientes WHERE id = ?', [
        resultado.id,
      ])

      res.status(201).json({
        success: true,
        message: 'Cliente cadastrado com sucesso',
        data: novoCliente,
      })
    } catch (error) {
      console.error('Erro ao criar cliente:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Atualizar cliente
  async update(req, res) {
    try {
      const { id } = req.params
      const { nome, telefone, email, endereco, cidade } = req.body

      // Verificar se cliente existe
      const clienteExistente = await db.get(
        'SELECT id FROM clientes WHERE id = ?',
        [id]
      )

      if (!clienteExistente) {
        return res.status(404).json({
          success: false,
          error: 'Cliente não encontrado',
        })
      }

      // Verificar se telefone já está em uso por outro cliente
      const telefoneEmUso = await db.get(
        'SELECT id FROM clientes WHERE telefone = ? AND id != ?',
        [telefone, id]
      )

      if (telefoneEmUso) {
        return res.status(400).json({
          success: false,
          error: 'Este telefone já está cadastrado para outro cliente',
        })
      }

      await db.run(
        `
        UPDATE clientes 
        SET nome = ?, telefone = ?, email = ?, endereco = ?, cidade = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [
          nome.trim(),
          telefone.trim(),
          email?.trim() || null,
          endereco?.trim() || null,
          cidade?.trim() || null,
          id,
        ]
      )

      const clienteAtualizado = await db.get(
        'SELECT * FROM clientes WHERE id = ?',
        [id]
      )

      res.json({
        success: true,
        message: 'Cliente atualizado com sucesso',
        data: clienteAtualizado,
      })
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Deletar cliente
  async destroy(req, res) {
    try {
      const { id } = req.params

      // Verificar se cliente existe
      const cliente = await db.get('SELECT id FROM clientes WHERE id = ?', [id])

      if (!cliente) {
        return res.status(404).json({
          success: false,
          error: 'Cliente não encontrado',
        })
      }

      // Verificar se cliente tem ordens de serviço
      const ordensAtivas = await db.get(
        'SELECT COUNT(*) as total FROM ordens WHERE cliente_id = ?',
        [id]
      )

      if (ordensAtivas.total > 0) {
        return res.status(400).json({
          success: false,
          error: 'Não é possível excluir cliente que possui ordens de serviço',
        })
      }

      await db.run('DELETE FROM clientes WHERE id = ?', [id])

      res.json({
        success: true,
        message: 'Cliente excluído com sucesso',
      })
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Buscar clientes por nome ou telefone
  async search(req, res) {
    try {
      const { q } = req.query

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Digite pelo menos 2 caracteres para buscar',
        })
      }

      const termo = `%${q.trim()}%`
      const clientes = await db.all(
        `
        SELECT 
          id, nome, telefone, email, cidade
        FROM clientes 
        WHERE nome LIKE ? OR telefone LIKE ?
        ORDER BY nome ASC
        LIMIT 20
      `,
        [termo, termo]
      )

      res.json({
        success: true,
        data: clientes,
        total: clientes.length,
      })
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }
}

module.exports = new ClienteController()
