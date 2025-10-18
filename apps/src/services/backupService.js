import api from './api'

export const backupService = {
  // Listar todos os backups
  async listarBackups() {
    const response = await api.get('/backup')
    return response.data
  },

  // Criar backup completo manual
  async criarBackupCompleto() {
    const response = await api.post('/backup/completo')
    return response.data
  },

  // Criar backup incremental manual
  async criarBackupIncremental() {
    const response = await api.post('/backup/incremental')
    return response.data
  },

  // Verificar integridade de um backup
  async verificarIntegridade(nomeArquivo) {
    const response = await api.get(`/backup/verificar/${nomeArquivo}`)
    return response.data
  },

  // Restaurar backup
  async restaurarBackup(nomeArquivo) {
    const response = await api.post(`/backup/restaurar/${nomeArquivo}`)
    return response.data
  },

  // Excluir backup
  async excluirBackup(nomeArquivo) {
    const response = await api.delete(`/backup/${nomeArquivo}`)
    return response.data
  },

  // Download de backup
  downloadBackup(nomeArquivo) {
    const url = `${api.defaults.baseURL}/backup/download/${nomeArquivo}`
    window.open(url, '_blank')
  },

  // Obter estatísticas de backup
  async obterEstatisticas() {
    const response = await api.get('/backup/estatisticas')
    return response.data
  },
}
