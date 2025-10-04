const db = require('../utils/database-adapter')

class ClienteController {
  // Listar todos os clientes
  async index(req, res) {
    try {
      const clientes = await db.all('clientes')

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

      const cliente = await db.get('clientes', id)

      if (!cliente) {
        return res.status(404).json({
          success: false,
          error: 'Cliente não encontrado',
        })
      }

      // Buscar ordens do cliente
      const ordens = await db.find('ordens', { cliente_id: id })

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
      const { nome, telefone, email, endereco, observacoes } = req.body

      // Verificar se já existe cliente com o mesmo telefone
      const clientesExistentes = await db.find('clientes', { telefone })

      if (clientesExistentes.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Já existe um cliente cadastrado com este telefone',
        })
      }

      const clienteData = {
        nome,
        telefone,
        email: email || null,
        endereco: endereco || null,
        observacoes: observacoes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const novoCliente = await db.insert('clientes', clienteData)

      res.status(201).json({
        success: true,
        data: novoCliente,
        message: 'Cliente criado com sucesso',
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
      const { nome, telefone, email, endereco, observacoes } = req.body

      // Verificar se o cliente existe
      const clienteExistente = await db.get('clientes', id)
      if (!clienteExistente) {
        return res.status(404).json({
          success: false,
          error: 'Cliente não encontrado',
        })
      }

      // Verificar se o telefone já está em uso por outro cliente
      if (telefone !== clienteExistente.telefone) {
        const clientesComTelefone = await db.find('clientes', { telefone })

        if (clientesComTelefone.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Já existe outro cliente cadastrado com este telefone',
          })
        }
      }

      const dadosAtualizacao = {
        nome,
        telefone,
        email: email || null,
        endereco: endereco || null,
        observacoes: observacoes || null,
        updated_at: new Date().toISOString()
      }

      const clienteAtualizado = await db.update('clientes', id, dadosAtualizacao)

      res.json({
        success: true,
        data: clienteAtualizado,
        message: 'Cliente atualizado com sucesso',
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

      // Verificar se o cliente existe
      const cliente = await db.get('clientes', id)
      if (!cliente) {
        return res.status(404).json({
          success: false,
          error: 'Cliente não encontrado',
        })
      }

      // Verificar se o cliente tem ordens associadas
      const ordensCount = await db.count('ordens', { cliente_id: id })
      if (ordensCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'Não é possível excluir cliente que possui ordens de serviço',
        })
      }

      await db.delete('clientes', id)

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

  // Buscar clientes
  async search(req, res) {
    try {
      const { q } = req.query

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Termo de busca deve ter pelo menos 2 caracteres',
        })
      }

      // Para SQLite e Supabase, usar query customizada para busca
      let clientes
      if (db.isUsingSupabase()) {
        clientes = await db.query(`
          SELECT id, nome, telefone, email, endereco, observacoes, created_at, updated_at
          FROM clientes 
          WHERE nome ILIKE $1 OR telefone ILIKE $1 OR email ILIKE $1
          ORDER BY nome ASC
          LIMIT 50
        `, [`%${q}%`])
      } else {
        clientes = await db.query(`
          SELECT id, nome, telefone, email, endereco, observacoes, created_at, updated_at
          FROM clientes 
          WHERE nome LIKE ? OR telefone LIKE ? OR email LIKE ?
          ORDER BY nome ASC
          LIMIT 50
        `, [`%${q}%`, `%${q}%`, `%${q}%`])
      }

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
