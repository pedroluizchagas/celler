const request = require('supertest')

// Mockar adapter de banco para RPCs do dashboard
jest.mock('../../src/utils/database-adapter.js', () => ({
  count: jest.fn(),
  rpc: jest.fn(),
}))
const db = require('../../src/utils/database-adapter.js')
const { buildApp } = require('../helpers/testApp')

describe('Dashboard Ordens (RPC)', () => {
  const app = buildApp()

  test('GET /api/ordens/stats - usa RPCs e retorna dados', async () => {
    db.count.mockImplementation(async (table) => (table === 'ordens' ? 12 : 7))

    db.rpc.mockImplementation(async (fn, params) => {
      switch (fn) {
        case 'dashboard_resumo_mes':
          return [
            {
              aguardando: 1,
              em_andamento: 2,
              aguardando_peca: 0,
              pronto: 3,
              entregue: 4,
              cancelado: 2,
              valor_total: 1000,
              valor_entregue: 600,
              valor_pendente: 400,
            },
          ]
        case 'dashboard_resumo_do_dia':
          return [
            {
              total_ordens: 2,
              aguardando: 0,
              em_andamento: 1,
              aguardando_peca: 0,
              pronto: 0,
              entregue: 1,
              cancelado: 0,
              valor_total: 150,
              valor_entregue: 100,
              valor_pendente: 50,
            },
          ]
        case 'dashboard_prioridade_mes':
          return [
            { prioridade: 'normal', total: 8 },
            { prioridade: 'alta', total: 4 },
          ]
        case 'dashboard_ordens_recentes':
          return [
            {
              id: 10,
              equipamento: 'iPhone 12',
              defeito: 'Tela',
              status: 'pronto',
              prioridade: 'normal',
              data_criacao: new Date().toISOString(),
              valor_final: 200,
              cliente_nome: 'João',
            },
          ]
        case 'dashboard_tecnicos_ativos':
          return [
            { tecnico: 'Pedro', total_ordens: 5, concluidas: 3 },
          ]
        default:
          return []
      }
    })

    const res = await request(app).get('/api/ordens/stats')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body).toHaveProperty('data')
    expect(res.body.data.totais).toHaveProperty('ordens', 12)
    expect(res.body.data.totais).toHaveProperty('clientes', 7)
    expect(Array.isArray(res.body.data.breakdown.status)).toBe(true)
    expect(Array.isArray(res.body.data.ordensRecentes)).toBe(true)
    expect(Array.isArray(res.body.data.tecnicosAtivos)).toBe(true)
  })
})
