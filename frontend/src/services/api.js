import axios from 'axios'
import { API_CONFIG } from '../config/api.config.js'

// Configuração base da API usando configuração centralizada
const api = axios.create(API_CONFIG)

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('❌ Erro na requisição:', error)
    return Promise.reject(error)
  }
)

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error('❌ Erro na resposta:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default api
