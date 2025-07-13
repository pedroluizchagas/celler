import api from './api'

class WhatsAppService {
  // Status e conexão
  async getStatus() {
    const response = await api.get('/whatsapp/status')
    return response.data
  }

  async getQRCode() {
    const response = await api.get('/whatsapp/qr')
    return response.data
  }

  // Mensagens
  async getMessages(params = {}) {
    const response = await api.get('/whatsapp/messages', { params })
    return response.data
  }

  async sendMessage(data) {
    const response = await api.post('/whatsapp/send', data)
    return response.data
  }

  async markAsRead(data) {
    const response = await api.put('/whatsapp/read', data)
    return response.data
  }

  async getConversationStats(phoneNumber) {
    const response = await api.get(
      `/whatsapp/conversation/${phoneNumber}/stats`
    )
    return response.data
  }

  // Chats
  async getChats() {
    const response = await api.get('/whatsapp/chats')
    return response.data
  }

  // Estatísticas
  async getStats() {
    const response = await api.get('/whatsapp/stats')
    return response.data
  }

  // Fila de atendimento
  async getHumanQueue() {
    const response = await api.get('/whatsapp/queue')
    return response.data
  }

  async updateQueueStatus(id, data) {
    const response = await api.put(`/whatsapp/queue/${id}`, data)
    return response.data
  }

  // Configurações
  async getSettings() {
    const response = await api.get('/whatsapp/settings')
    return response.data
  }

  async updateSettings(data) {
    const response = await api.put('/whatsapp/settings', data)
    return response.data
  }

  // Relatórios
  async getReport(params = {}) {
    const response = await api.get('/whatsapp/report', { params })
    return response.data
  }
}

export const whatsappService = new WhatsAppService()
export default whatsappService
