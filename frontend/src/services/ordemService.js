import api from './api'

export const ordemService = {
  // Listar todas as ordens
  async listar(filtros = {}) {
    try {
      const params = new URLSearchParams()
      if (filtros.status) params.append('status', filtros.status)
      if (filtros.cliente_id) params.append('cliente_id', filtros.cliente_id)
      if (filtros.prioridade) params.append('prioridade', filtros.prioridade)
      if (filtros.tecnico) params.append('tecnico', filtros.tecnico)

      const response = await api.get(`/ordens?${params.toString()}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao listar ordens')
    }
  },

  // Buscar ordem por ID
  async buscarPorId(id) {
    try {
      const response = await api.get(`/ordens/${id}`)
      return response.data
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
      return response.data
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
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao atualizar ordem')
    }
  },

  // Excluir ordem
  async excluir(id) {
    try {
      const response = await api.delete(`/ordens/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao excluir ordem')
    }
  },

  // Buscar estatísticas para o dashboard
  async buscarEstatisticas() {
    try {
      const response = await api.get('/ordens/stats')
      return response.data
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
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao adicionar fotos')
    }
  },

  // Gerar relatório de ordens
  async gerarRelatorio(filtros = {}) {
    try {
      const params = new URLSearchParams()
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio)
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim)
      if (filtros.status) params.append('status', filtros.status)
      if (filtros.tecnico) params.append('tecnico', filtros.tecnico)

      const response = await api.get(`/ordens/relatorio?${params.toString()}`)
      return response.data
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
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao alterar status')
    }
  },

  // Buscar histórico da ordem
  async buscarHistorico(id) {
    try {
      const response = await api.get(`/ordens/${id}/historico`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao buscar histórico')
    }
  },
}
