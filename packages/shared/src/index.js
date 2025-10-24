// Constantes e utilidades compartilhadas

export const OS_STATUS = [
  'Recebido',
  'Em Análise',
  'Aguardando Peças',
  'Em Reparo',
  'Pronto',
  'Entregue',
  'Cancelado',
]

export const MAX_FOTOS_POR_ORDEM = 5
export const TAMANHO_MAX_FOTO_MB = 5
export const TIPOS_FOTO_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']

export const isProdHostname = (host) => {
  if (!host) return false
  const h = host.toLowerCase()
  if (h === 'localhost' || h === '127.0.0.1') return false
  return h.includes('vercel.app') || h.includes('netlify.app') || !h.includes('localhost')
}

