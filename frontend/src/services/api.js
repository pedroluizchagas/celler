import axios from 'axios'
import { API_CONFIG } from '../config/api.config.js'

// Configuração base da API usando configuração centralizada
const api = axios.create({
  ...API_CONFIG,
  withCredentials: true // mantenha true se seu backend usa cookies/sessão
})

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    const method = (config.method || '').toLowerCase()
    if (method) {
      console.log(`[REQ] ${method.toUpperCase()} ${config.url}`)
    }

    const hasPayload = ['post', 'put', 'patch', 'delete'].includes(method)
    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData

    if (hasPayload && config.data && !isFormData) {
      config.headers = config.headers || {}
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json'
      }
    }

    if (config.headers && 'Origin' in config.headers) {
      delete config.headers.Origin
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
