// Utilidades de sanitização para payloads enviados ao banco

// Converte undefined -> null para uso em colunas opcionais
function toNull(value) {
  return value === undefined ? null : value
}

// Sanitiza objetos/arrays antes de insert/update no Supabase
function sanitizeForDb(input) {
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForDb(item))
  }

  if (input && typeof input === 'object') {
    const out = {}
    for (const [key, val] of Object.entries(input)) {
      if (val && typeof val === 'object' && !Buffer.isBuffer(val)) {
        out[key] = sanitizeForDb(val)
      } else {
        out[key] = toNull(val)
      }
    }
    return out
  }

  return toNull(input)
}

module.exports = { toNull, sanitizeForDb }

