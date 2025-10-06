import axios from 'axios'
import { API_CONFIG } from '../config/api.config.js'

// Configuração base da API usando configuração centralizada
const api = axios.create({
  ...API_CONFIG,
  // Configurações adicionais para melhor compatibilidade
  withCredentials: false, // Desabilitar cookies para evitar problemas de CORS
  headers: {
    ...API_CONFIG.headers,
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
  }
})

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`)
    
    // Adicionar headers específicos para cada requisição
    config.headers = {
      ...config.headers,
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': window.location.origin,
    }
    
    return config
  },
  (error) => {
    console.error('❌ Erro na requisição:', error)
    return Promise.reject(error)
  }
)

// Interceptor para responses com retry automático
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`)
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    console.error('❌ Erro na resposta:', error.response?.data || error.message)
    
    // Se for erro de rede e não foi tentativa de retry
    if (error.code === 'ERR_NETWORK' && !originalRequest._retry) {
      originalRequest._retry = true
      
      console.log('🔄 Tentando novamente em 2 segundos...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      try {
        return await api(originalRequest)
      } catch (retryError) {
        console.error('❌ Falha no retry:', retryError.message)
      }
    }
    
    // Se for erro 503 (Service Unavailable), tentar novamente após delay
    if (error.response?.status === 503 && !originalRequest._retry503) {
      originalRequest._retry503 = true
      
      console.log('⏳ Servidor indisponível, tentando novamente em 5 segundos...')
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      try {
        return await api(originalRequest)
      } catch (retryError) {
        console.error('❌ Servidor ainda indisponível:', retryError.message)
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
