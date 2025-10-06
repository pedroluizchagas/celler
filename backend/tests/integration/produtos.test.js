const request = require('supertest')

// Mockar repositório antes de importar app/controle
jest.mock('../../src/repositories/produtos.repository.js', () => ({
  create: jest.fn(),
  findAll: jest.fn(),
}))
const repo = require('../../src/repositories/produtos.repository.js')
const { buildApp } = require('../helpers/testApp')

describe('Produtos API', () => {
  const app = buildApp()

  test('POST /api/produtos - happy path', async () => {
    const payload = {
      nome: 'Produto Teste',
      tipo: 'peca',
      preco_venda: 99.9,
    }

    const created = { id: 1, ...payload, ativo: true, estoque_atual: 0 }
    repo.create.mockResolvedValueOnce(created)

    const res = await request(app).post('/api/produtos').send(payload)

    expect(res.status).toBe(201)
    expect(res.body).toEqual(created)
    expect(repo.create).toHaveBeenCalled()
  })

  test('POST /api/produtos - validação Zod (400)', async () => {
    const badPayload = {
      nome: '',
      preco_venda: 'abc',
    }

    const res = await request(app).post('/api/produtos').send(badPayload)

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('message')
    expect(res.body).toHaveProperty('details')
    expect(Array.isArray(res.body.details)).toBe(true)
  })

  test('GET /api/produtos - lista com sucesso', async () => {
    const list = [
      { id: 1, nome: 'A', ativo: true, estoque_atual: 0 },
      { id: 2, nome: 'B', ativo: true, estoque_atual: 5 },
    ]
    repo.findAll.mockResolvedValueOnce(list)

    const res = await request(app).get('/api/produtos')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body).toHaveProperty('data')
    expect(res.body.data).toEqual(list)
    expect(res.body.total).toBe(list.length)
  })
})
