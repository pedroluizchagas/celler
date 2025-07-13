import api from './api'

const produtoService = {
  // Listar produtos
  async listar(filtros = {}) {
    const params = new URLSearchParams()

    if (filtros.categoria) params.append('categoria', filtros.categoria)
    if (filtros.tipo) params.append('tipo', filtros.tipo)
    if (filtros.estoque_baixo) params.append('estoque_baixo', '1')
    if (filtros.ativo !== undefined) params.append('ativo', filtros.ativo)

    const response = await api.get(`/produtos?${params}`)
    return response.data?.data || response.data || []
  },

  // Compatibilidade
  async buscarTodos(filtros = {}) {
    return this.listar(filtros)
  },

  // Buscar produto por ID
  async buscarPorId(id) {
    const response = await api.get(`/produtos/${id}`)
    return response.data
  },

  // Buscar produto por código
  async buscarPorCodigo(codigo) {
    const response = await api.get(`/produtos/codigo/${codigo}`)
    return response.data
  },

  // Criar produto
  async criar(dadosProduto) {
    const response = await api.post('/produtos', dadosProduto)
    return response.data?.data || response.data
  },

  // Atualizar produto
  async atualizar(id, dadosProduto) {
    const response = await api.put(`/produtos/${id}`, dadosProduto)
    return response.data?.data || response.data
  },

  // Movimentar estoque
  async movimentarEstoque(id, dadosMovimentacao) {
    const response = await api.post(
      `/produtos/${id}/movimentar`,
      dadosMovimentacao
    )
    return response.data
  },

  // Listar categorias
  async listarCategorias() {
    const response = await api.get('/categorias')
    return response.data?.data || response.data || []
  },

  // Listar alertas
  async listarAlertas() {
    const response = await api.get('/produtos/alertas')
    return response.data?.data || response.data || []
  },

  // Buscar alertas (compatibilidade)
  async buscarAlertas() {
    return this.listarAlertas()
  },

  // Resolver alerta
  async resolverAlerta(alertaId) {
    const response = await api.put(`/produtos/alertas/${alertaId}/resolver`)
    return response.data
  },

  // Buscar estatísticas do estoque
  async buscarEstatisticas() {
    const response = await api.get('/produtos/stats')
    return response.data?.data || response.data
  },
}

export { produtoService }
