import api from './api'

const vendaService = {
  // Listar vendas (alias para buscarTodas)
  async listar(filtros = {}) {
    return this.buscarTodas(filtros)
  },

  // Listar vendas
  async buscarTodas(filtros = {}) {
    const params = new URLSearchParams()

    if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio)
    if (filtros.data_fim) params.append('data_fim', filtros.data_fim)
    if (filtros.cliente_id) params.append('cliente_id', filtros.cliente_id)
    if (filtros.page) params.append('page', filtros.page)
    if (filtros.limit) params.append('limit', filtros.limit)

    const response = await api.get(`/vendas?${params}`)
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
    const params = new URLSearchParams()

    if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio)
    if (filtros.data_fim) params.append('data_fim', filtros.data_fim)
    if (filtros.tipo_pagamento)
      params.append('tipo_pagamento', filtros.tipo_pagamento)

    const response = await api.get(`/vendas/relatorio?${params}`)
    return response.data
  },

  // Estatísticas de vendas
  async estatisticas() {
    const response = await api.get('/vendas/estatisticas')
    return response.data
  },
}

export { vendaService }
