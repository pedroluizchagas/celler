import api from './api'
import { buildQuery, buildSafeFilters } from '../utils/http.js'

const toNullableString = (value) => {
  if (value === undefined || value === null) {
    return null
  }

  const normalized = String(value).trim()
  return normalized.length ? normalized : null
}

const toNumberOrZero = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const buildProdutoPayload = (dados) => ({
  nome: (dados.nome || '').trim(),
  tipo: dados.tipo === 'servico' ? 'servico' : 'peca',
  preco_custo: toNumberOrZero(dados.preco_custo),
  preco_venda: toNumberOrZero(dados.preco_venda),
  margem_lucro: toNumberOrZero(dados.margem_lucro),
  estoque_atual: toNumberOrZero(dados.estoque_atual),
  estoque_minimo: toNumberOrZero(dados.estoque_minimo),
  estoque_maximo: toNumberOrZero(dados.estoque_maximo),
  categoria_id: toNumberOrNull(dados.categoria_id),
  fornecedor_id: toNumberOrNull(dados.fornecedor_id),
  descricao: toNullableString(dados.descricao),
  codigo_barras: toNullableString(dados.codigo_barras),
  codigo_interno: toNullableString(dados.codigo_interno),
  localizacao: toNullableString(dados.localizacao),
  ativo: typeof dados.ativo === 'boolean' ? dados.ativo : true,
})

const extractApiError = (error, fallbackMessage = 'Falha ao salvar') => {
  const responseData = error?.response?.data || {}
  const message = responseData.message || fallbackMessage
  const details = Array.isArray(responseData.details) ? responseData.details : undefined

  const enrich = new Error(message)
  if (details) {
    enrich.details = details
  }
  return enrich
}

const produtoService = {
  async listar(filtros = {}) {
    const safeFilters = buildSafeFilters(filtros)
    const response = await api.get(`/produtos${buildQuery(safeFilters)}`)
    return response.data?.data || response.data || []
  },

  async buscarTodos(filtros = {}) {
    return this.listar(filtros)
  },

  async buscarPorId(id) {
    const response = await api.get(`/produtos/${id}`)
    return response.data
  },

  async buscarPorCodigo(codigo) {
    const response = await api.get(`/produtos/codigo/${codigo}`)
    return response.data
  },

  async criar(dadosProduto) {
    try {
      const payload = buildProdutoPayload(dadosProduto)
      const response = await api.post('/produtos', payload)
      return response.data?.data || response.data
    } catch (error) {
      throw extractApiError(error, 'Falha ao cadastrar produto')
    }
  },

  async atualizar(id, dadosProduto) {
    try {
      const payload = buildProdutoPayload(dadosProduto)
      const response = await api.put(`/produtos/${id}`, payload)
      return response.data?.data || response.data
    } catch (error) {
      throw extractApiError(error, 'Falha ao atualizar produto')
    }
  },

  async movimentarEstoque(id, dadosMovimentacao) {
    const response = await api.post(
      `/produtos/${id}/movimentar`,
      dadosMovimentacao
    )
    return response.data
  },

  async listarCategorias() {
    const response = await api.get('/categorias')
    return response.data?.data || response.data || []
  },

  async listarAlertas() {
    const response = await api.get('/produtos/alertas')
    return response.data?.data || response.data || []
  },

  async buscarAlertas() {
    return this.listarAlertas()
  },

  async resolverAlerta(alertaId) {
    const response = await api.put(`/produtos/alertas/${alertaId}/resolver`)
    return response.data
  },

  async buscarEstatisticas() {
    const response = await api.get('/produtos/stats')
    return response.data?.data || response.data
  },
}

export { produtoService }
