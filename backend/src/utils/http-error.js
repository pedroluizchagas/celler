const { LoggerManager } = require('./logger')

// Mapeia erros do Supabase/PostgREST para HTTP + mensagem consistente
function mapSupabaseError(err, fallbackMessage = 'Erro interno') {
  if (!err) {
    return { status: 500, message: fallbackMessage }
  }

  const code = err.code || err.status || err.hint || null
  const msg = (err.message || '').toLowerCase()
  const details = err.details || err.hint || err.description || undefined

  // Postgres error codes (via PostgREST)
  // 23505 unique_violation → 409
  if (err.code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return { status: 409, message: 'Registro já existe', code: err.code, details }
  }

  // 23503 foreign_key_violation → 404 (FK inexistente)
  if (err.code === '23503' || msg.includes('violates foreign key')) {
    return { status: 404, message: 'Registro relacionado não encontrado', code: err.code, details }
  }

  // 23502 not_null_violation → 400
  if (err.code === '23502') {
    return { status: 400, message: 'Campo obrigatório ausente', code: err.code, details }
  }

  // 23514 check_violation → 400
  if (err.code === '23514') {
    return { status: 400, message: 'Dados inválidos (restrição de verificação)', code: err.code, details }
  }

  // 22P02 invalid_text_representation → 400
  if (err.code === '22P02') {
    return { status: 400, message: 'Formato inválido de dados', code: err.code, details }
  }

  // PGRST116: No rows found for single() → 404
  if (err.code === 'PGRST116') {
    return { status: 404, message: 'Registro não encontrado', code: err.code, details }
  }

  // Outros PGRST* → 400 (erro de request no PostgREST)
  if (typeof err.code === 'string' && err.code.startsWith('PGRST')) {
    return { status: 400, message: 'Requisição inválida', code: err.code, details }
  }

  // Default
  return { status: 500, message: fallbackMessage, code: err.code, details }
}

function respondWithError(res, err, fallbackMessage = 'Erro interno') {
  const mapped = mapSupabaseError(err, fallbackMessage)
  const req = res && res.req ? res.req : undefined
  const requestId = (req && (req.headers['x-request-id'] || req.id)) || undefined

  try {
    // Log estruturado
    LoggerManager.error('DB_ERROR', err, { status: mapped.status, code: mapped.code })
  } catch (_) {
    // Fallback
    // eslint-disable-next-line no-console
    console.error('[DB_ERROR]', err)
  }

  const body = { message: mapped.message }
  if (mapped.details) {
    body.details = mapped.details
  }
  if (requestId) {
    body.requestId = requestId
  }

  return res.status(mapped.status).json(body)
}

module.exports = { mapSupabaseError, respondWithError }
