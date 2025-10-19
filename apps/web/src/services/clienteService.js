import api from './api'

export const clienteService = {
  // Listar todos os clientes
  async listar() {
    try {
      const response = await api.get('/clientes')
      console.log(' Resposta da API de clientes:', response.data)

      // Extrair dados corretamente
      const dados = response.data?.data || response.data || []
      console.log(' Clientes extraídos:', dados)

      return dados
    } catch (error) {
      console.error(' Erro ao listar clientes:', error)
      throw new Error(error.response?.data?.error || 'Erro ao listar clientes')
    }
  },

  // Buscar cliente por ID
  async buscarPorId(id) {
    try {
      // Validar ID
      if (!id || isNaN(parseInt(id))) {
        throw new Error('ID do cliente inválido')
      }

      console.log(' Buscando cliente ID:', id)
      const response = await api.get(`/clientes/${id}`)
      console.log(' Cliente encontrado:', response.data)
      
      return response.data?.data || response.data
    } catch (error) {
      console.error(' Erro ao buscar cliente:', error)
      
      if (error.response?.status === 404) {
        throw new Error('Cliente não encontrado')
      } else if (error.response?.status === 400) {
        throw new Error(error.response?.data?.error || 'Dados inválidos')
      }
      
      throw new Error(error.response?.data?.error || 'Erro ao buscar cliente')
    }
  },

  // Criar novo cliente
  async criar(cliente) {
    try {
      const response = await api.post('/clientes', cliente)
      return response.data?.data || response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao criar cliente')
    }
  },

  // Atualizar cliente
  async atualizar(id, cliente) {
    try {
      const response = await api.put(`/clientes/${id}`, cliente)
      return response.data?.data || response.data
    } catch (error) {
      throw new Error(
        error.response?.data?.error || 'Erro ao atualizar cliente'
      )
    }
  },

  // Excluir cliente
  async excluir(id) {
    try {
      const response = await api.delete(`/clientes/${id}`)
      return response.data?.data || response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao excluir cliente')
    }
  },

  // Buscar clientes por termo
  async buscar(termo) {
    try {
      const response = await api.get(
        `/clientes/search?q=${encodeURIComponent(termo)}`
      )
      return response.data?.data || response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao buscar clientes')
    }
  },
}
