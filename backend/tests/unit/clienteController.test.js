const request = require('supertest')
const express = require('express')
const clientesRoutes = require('../../src/routes/clientes')
// Mock do banco de dados (adapter unificado)
jest.mock('../../src/utils/database-adapter')
const db = require('../../src/utils/database-adapter')

describe('Cliente Controller - Testes Unitários', () => {
  let app

  beforeAll(() => {
    app = express()
    app.use(express.json())
    app.use('/api/clientes', clientesRoutes)
  })

  beforeEach(() => {
    jest.clearAllMocks()
    db.all = jest.fn()
    db.get = jest.fn()
    db.find = jest.fn()
    db.insert = jest.fn()
    db.update = jest.fn()
    db.delete = jest.fn()
    db.count = jest.fn()
    db.query = jest.fn()
    db.find.mockResolvedValue([])
    db.count.mockResolvedValue(0)
  })

  describe('GET /api/clientes', () => {
    it('deve retornar lista de clientes', async () => {
      const clientesMock = [
        {
          id: 1,
          nome: 'João Silva',
          telefone: '(11) 99999-9999',
          email: 'joao@email.com',
        },
      ]

      db.all.mockResolvedValue(clientesMock)

      const response = await request(app).get('/api/clientes').expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].nome).toBe('João Silva')
    })

    it('deve lidar com erro do banco de dados', async () => {
      db.all.mockRejectedValue(new Error('Erro do banco'))

      const response = await request(app).get('/api/clientes').expect(500)

      expect(response.body.message).toBeDefined()
    })
  })

  describe('POST /api/clientes', () => {
    it('deve criar um novo cliente', async () => {
      const novoCliente = testHelper.clienteExemplo

      // Nenhum cliente com mesmo telefone
      db.find.mockResolvedValueOnce([])
      // Insert devolve o cliente criado
      db.insert.mockResolvedValue({ id: 1, ...novoCliente })

      const response = await request(app)
        .post('/api/clientes')
        .send(novoCliente)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Cliente cadastrado com sucesso')
      expect(response.body.data.nome).toBe(novoCliente.nome)
    })

    it('deve rejeitar cliente com telefone duplicado', async () => {
      const clienteExistente = { id: 1 }
      db.find.mockResolvedValue([clienteExistente])

      const response = await request(app)
        .post('/api/clientes')
        .send(testHelper.clienteExemplo)
        .expect(400)

      expect(response.body.error).toBeDefined()
      expect(response.body.error).toContain('telefone')
    })

    it('deve validar campos obrigatórios', async () => {
      const response = await request(app)
        .post('/api/clientes')
        .send({}) // Sem dados obrigatórios
        .expect(400)

      expect(response.body.error).toBeDefined()
    })
  })

  describe('GET /api/clientes/:id', () => {
    it('deve retornar cliente específico', async () => {
      const clienteMock = {
        id: 1,
        nome: 'João Silva',
        telefone: '(11) 99999-9999',
      }

      db.get.mockResolvedValue(clienteMock)
      db.find.mockResolvedValue([]) // Ordens do cliente

      const response = await request(app).get('/api/clientes/1').expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.nome).toBe('João Silva')
    })

    it('deve retornar 404 para cliente inexistente', async () => {
      db.get.mockResolvedValue(null)

      const response = await request(app).get('/api/clientes/999').expect(404)

      expect(response.body.error).toBeDefined()
    })
  })

  describe('PUT /api/clientes/:id', () => {
    it('deve atualizar cliente existente', async () => {
      const clienteAtualizado = {
        ...testHelper.clienteExemplo,
        nome: 'João Silva Santos',
      }

      db.get.mockResolvedValueOnce({ id: 1 }) // Cliente existe
      db.get.mockResolvedValueOnce(null) // Telefone não está em uso
      db.run.mockResolvedValue({ changes: 1 })
      db.get.mockResolvedValueOnce({ id: 1, ...clienteAtualizado })

      const response = await request(app)
        .put('/api/clientes/1')
        .send(clienteAtualizado)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Cliente atualizado com sucesso')
    })
  })

  describe('DELETE /api/clientes/:id', () => {
    it('deve deletar cliente sem ordens', async () => {
      db.get.mockResolvedValueOnce({ id: 1 }) // Cliente existe
      db.count.mockResolvedValueOnce(0) // Sem ordens associadas
      db.delete.mockResolvedValue({ success: true })

      const response = await request(app).delete('/api/clientes/1').expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('excluído')
    })

    it('deve impedir exclusão de cliente com ordens', async () => {
      db.get.mockResolvedValueOnce({ id: 1 }) // Cliente existe
      db.count.mockResolvedValueOnce(2) // Tem ordens associadas

      const response = await request(app).delete('/api/clientes/1').expect(400)

      expect(response.body.error).toBeDefined()
      expect(response.body.error).toContain('ordens')
    })
  })
})
