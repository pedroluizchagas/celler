/**
 * Middleware para normalizar e sanitizar parâmetros de query
 * Remove parâmetros vazios, nulos ou indefinidos
 * Aplica validação segura para paginação
 */

/**
 * Normaliza parâmetros de query removendo valores vazios e aplicando defaults seguros
 * @param {Object} req - Request object
 * @param {Object} res - Response object  
 * @param {Function} next - Next middleware function
 */
function normalizeQuery(req, res, next) {
  const q = req.query;
  
  const cleaned = {};
  
  // Limpa parâmetros vazios, nulos ou indefinidos
  for (const [k, v] of Object.entries(q)) {
    if (v == null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    
    // Mantém apenas valores válidos
    cleaned[k] = v;
  }
  
  // Paginação segura
  const page = Math.max(1, parseInt(String(cleaned.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(cleaned.limit ?? '10'), 10) || 10));
  
  cleaned.page = page;
  cleaned.limit = limit;
  
  // Substitui req.query pelos parâmetros limpos
  req.query = cleaned;
  
  next();
}

/**
 * Middleware específico para rotas de listagem com paginação
 * Aplica normalização mais rigorosa para endpoints de listagem
 */
function normalizeListQuery(req, res, next) {
  const q = req.query;
  
  const cleaned = {};
  
  // Lista de parâmetros permitidos para listagem (pode ser customizada por rota)
  const allowedParams = [
    'page', 'limit', 'status', 'categoria', 'tipo', 'cliente_id', 
    'data_inicio', 'data_fim', 'de', 'ate', 'prioridade', 'tecnico',
    'ativo', 'estoque_baixo', 'categoria_id', 'fornecedor_id'
  ];
  
  // Filtra apenas parâmetros permitidos e válidos
  for (const [k, v] of Object.entries(q)) {
    if (!allowedParams.includes(k)) continue;
    if (v == null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    
    // Validação especial para datas
    if (['data_inicio', 'data_fim', 'de', 'ate'].includes(k)) {
      const dateValue = validateDate(v);
      if (dateValue) {
        cleaned[k] = dateValue;
      }
      continue;
    }
    
    // Validação especial para booleanos
    if (['ativo', 'estoque_baixo'].includes(k)) {
      const boolValue = validateBoolean(v);
      if (boolValue !== null) {
        cleaned[k] = boolValue;
      }
      continue;
    }
    
    // Validação especial para números
    if (['cliente_id', 'categoria_id', 'fornecedor_id'].includes(k)) {
      const numValue = validateNumber(v);
      if (numValue !== null) {
        cleaned[k] = numValue;
      }
      continue;
    }
    
    // Para outros valores, apenas limpa strings
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed) {
        cleaned[k] = trimmed;
      }
    } else {
      cleaned[k] = v;
    }
  }
  
  // Paginação segura
  const page = Math.max(1, parseInt(String(cleaned.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(cleaned.limit ?? '10'), 10) || 10));
  
  cleaned.page = page;
  cleaned.limit = limit;
  
  req.query = cleaned;
  
  next();
}

/**
 * Valida e formata uma string de data
 * @param {string} dateString - String de data
 * @returns {string|null} Data válida ou null
 */
function validateDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  
  const trimmed = dateString.trim();
  if (!trimmed) return null;
  
  // Verifica formato YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(trimmed)) return null;
  
  // Verifica se é uma data válida
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return null;
  
  return trimmed;
}

/**
 * Valida e converte valor para boolean
 * @param {any} value - Valor a ser convertido
 * @returns {boolean|null} Boolean válido ou null
 */
function validateBoolean(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return null;
}

/**
 * Valida e converte valor para número
 * @param {any} value - Valor a ser convertido
 * @returns {number|null} Número válido ou null
 */
function validateNumber(value) {
  if (typeof value === 'number' && !isNaN(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = parseInt(value.trim(), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return null;
}

/**
 * Middleware para endpoints de estatísticas/dashboard
 * Aplica validação específica para parâmetros de relatórios
 */
function normalizeStatsQuery(req, res, next) {
  const q = req.query;
  const cleaned = {};
  
  // Parâmetros comuns para estatísticas
  const allowedParams = ['de', 'ate', 'data_inicio', 'data_fim', 'periodo', 'categoria'];
  
  for (const [k, v] of Object.entries(q)) {
    if (!allowedParams.includes(k)) continue;
    if (v == null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    
    // Validação de datas
    if (['de', 'ate', 'data_inicio', 'data_fim'].includes(k)) {
      const dateValue = validateDate(v);
      if (dateValue) {
        cleaned[k] = dateValue;
      }
      continue;
    }
    
    // Para outros valores
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed) {
        cleaned[k] = trimmed;
      }
    } else {
      cleaned[k] = v;
    }
  }
  
  req.query = cleaned;
  next();
}

module.exports = {
  normalizeQuery,
  normalizeListQuery,
  normalizeStatsQuery
};