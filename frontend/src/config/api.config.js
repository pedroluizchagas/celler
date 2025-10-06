// Configuração centralizada da API
// Este arquivo garante que a URL correta seja sempre usada

const getApiUrl = () => {
  // Detectar se está em produção de forma mais robusta
  const isProduction = 
    typeof window !== 'undefined' && (
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('netlify.app') ||
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1' &&
      !window.location.hostname.includes('localhost')
    )
  
  // Em produção, sempre usar a URL do Render
  if (isProduction) {
    console.log('🌐 Ambiente de produção detectado, usando URL do Render')
    return 'https://assistencia-tecnica-1k5g.onrender.com/api'
  }
  
  // Tentar variáveis de ambiente primeiro
  const viteUrl = import.meta.env.VITE_API_URL
  const reactUrl = import.meta.env.REACT_APP_API_URL
  
  if (viteUrl) {
    console.log('🎯 Usando VITE_API_URL:', viteUrl)
    return viteUrl
  }
  
  if (reactUrl) {
    console.log('🎯 Usando REACT_APP_API_URL:', reactUrl)
    return reactUrl
  }
  
  // Fallback para desenvolvimento
  console.log('🎯 Ambiente de desenvolvimento, usando localhost')
  return 'http://localhost:3001/api'
}

const getApiTimeout = () => {
  const viteTimeout = import.meta.env.VITE_API_TIMEOUT
  const reactTimeout = import.meta.env.REACT_APP_API_TIMEOUT
  
  return parseInt(viteTimeout || reactTimeout) || 30000
}

export const API_CONFIG = {
  baseURL: getApiUrl(),
  timeout: getApiTimeout(),
  headers: {
    'Content-Type': 'application/json',
  }
}

// Log da configuração para debug
console.log('🔧 API Configuration:', API_CONFIG)