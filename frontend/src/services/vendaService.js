import api from './api'
import { buildQuery, buildSafeFilters } from '../utils/http.js'

const vendaService = {
  // Listar vendas (alias para buscarTodas)
  async listar(filtros = {}) {
    return this.buscarTodas(filtros)
  },

  // Listar vendas
  async buscarTodas(filtros = {}) {
    const safeFilters = buildSafeFilters(filtros)
    const response = await api.get(`/vendas${buildQuery(safeFilters)}`)
    return response.data
  },

  // Buscar venda por ID
  async buscarPorId(id) {
    const response = await api.get(`/vendas/${id}`)
    return response.data
  },

  // Criar venda
  async criar(dadosVenda) {
    const response = await api.post('/vendas', dadosVenda)
    return response.data
  },

  // Relatório de vendas
  async relatorio(filtros = {}) {
    const safeFilters = buildSafeFilters(filtros)
    const response = await api.get(`/vendas/relatorio${buildQuery(safeFilters)}`)
    return response.data
  },

  // Estatísticas de vendas
  async estatisticas() {
    const response = await api.get('/vendas/estatisticas')
    return response.data
  },
}

export { vendaService }
