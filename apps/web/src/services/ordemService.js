import api from './api'
import { buildQuery, buildSafeFilters } from '../utils/http.js'

export const ordemService = {
  // Listar todas as ordens
  async listar(filtros = {}) {
    try {
      const safeFilters = buildSafeFilters(filtros)
      const response = await api.get(`/ordens${buildQuery(safeFilters)}`)
      return { data: response.data }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao listar ordens')
    }
  },

  // Buscar ordem por ID
  async buscarPorId(id) {
    try {
      const response = await api.get(`/ordens/${id}`)
      return { data: response.data }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao buscar ordem')
    }
  },

  // Criar nova ordem
  async criar(ordem, fotos = []) {
    try {
      const formData = new FormData()

      // Adicionar dados da ordem
      Object.keys(ordem).forEach((key) => {
        if (ordem[key] !== null && ordem[key] !== undefined) {
          if (key === 'pecas' || key === 'servicos') {
            formData.append(key, JSON.stringify(ordem[key]))
          } else {
            formData.append(key, ordem[key])
          }
        }
      })

      // Adicionar fotos se existirem
      fotos.forEach((foto) => {
        formData.append('fotos', foto)
      })

      const response = await api.post('/ordens', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return { data: response.data }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao criar ordem')
    }
  },

  // Atualizar ordem
  async atualizar(id, ordem) {
    try {
      // Se tem peças ou serviços, serializar como JSON
      const dadosOrdem = { ...ordem }
      if (dadosOrdem.pecas) {
        dadosOrdem.pecas = JSON.stringify(dadosOrdem.pecas)
      }
      if (dadosOrdem.servicos) {
        dadosOrdem.servicos = JSON.stringify(dadosOrdem.servicos)
      }

      const response = await api.put(`/ordens/${id}`, dadosOrdem)
      return { data: response.data }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao atualizar ordem')
    }
  },

  // Excluir ordem
  async excluir(id) {
    try {
      const response = await api.delete(`/ordens/${id}`)
      return { data: response.data }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao excluir ordem')
    }
  },

  // Buscar estatísticas para o dashboard
  async buscarEstatisticas() {
    try {
      const response = await api.get('/ordens/stats')
      return { data: response.data }
    } catch (error) {
      throw new Error(
        error.response?.data?.error || 'Erro ao buscar estatísticas'
      )
    }
  },

  // Upload de fotos para ordem existente
  async adicionarFotos(id, fotos) {
    try {
      const formData = new FormData()
      fotos.forEach((foto) => {
        formData.append('fotos', foto)
      })

      const response = await api.post(`/ordens/${id}/fotos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return { data: response.data }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao adicionar fotos')
    }
  },

  // Excluir foto de uma ordem
  async excluirFoto(id, fotoId) {
    try {
      const response = await api.delete(`/ordens/${id}/fotos/${fotoId}`)
      return { data: response.data }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao excluir foto')
    }
  },

  // Gerar relatório de ordens
  async gerarRelatorio(filtros = {}) {
    try {
      const safeFilters = buildSafeFilters(filtros)
      const response = await api.get(`/ordens/relatorio${buildQuery(safeFilters)}`)
      return { data: response.data }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao gerar relatório')
    }
  },

  // Alterar status da ordem
  async alterarStatus(id, novoStatus, observacoes = '') {
    try {
      const response = await api.patch(`/ordens/${id}/status`, {
        status: novoStatus,
        observacoes,
      })
      return { data: response.data }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao alterar status')
    }
  },

  // Buscar histórico da ordem
  async buscarHistorico(id) {
    try {
      const response = await api.get(`/ordens/${id}/historico`)
      return { data: response.data }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao buscar histórico')
    }
  },

  // Buscar fotos da ordem (com URLs públicas/assinadas)
  async buscarFotos(id) {
    try {
      const response = await api.get(`/ordens/${id}/fotos`)
      return { data: response.data }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao buscar fotos')
    }
  },
}
