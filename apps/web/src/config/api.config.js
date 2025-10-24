// Configuração centralizada da API
// Este arquivo garante que a URL correta seja sempre usada

const getApiUrl = () => {
  const viteUrl = import.meta.env.VITE_API_URL
  const reactUrl = import.meta.env.REACT_APP_API_URL
  if (viteUrl) return viteUrl
  if (reactUrl) return reactUrl

  const isBrowser = typeof window !== 'undefined'
  if (isBrowser) {
    const { hostname, origin } = window.location
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
    // Em produção, default: origin + /api
    if (!isLocal) return `${origin}/api`
  }
  // Fallback dev
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
  },
}

if (import.meta.env.DEV) {
  // Log somente em desenvolvimento
  // eslint-disable-next-line no-console
  console.log(' API Configuration:', API_CONFIG)
}
