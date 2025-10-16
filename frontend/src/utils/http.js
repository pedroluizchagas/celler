/**
 * Constrói uma query string de forma segura, ignorando valores vazios, nulos ou indefinidos
 * @param {Record<string, any>} params - Objeto com os parâmetros da query
 * @returns {string} Query string formatada (ex: "?param1=value1&param2=value2") ou string vazia
 */
export function buildQuery(params = {}) {
  const qp = new URLSearchParams();
  
  Object.entries(params).forEach(([k, v]) => {
    // Ignora valores undefined ou null
    if (v === undefined || v === null) return;
    
    // Ignora strings vazias ou apenas com espaços
    if (typeof v === 'string' && v.trim() === '') return;
    
    // Ignora arrays vazios
    if (Array.isArray(v) && v.length === 0) return;
    
    // Adiciona o parâmetro convertido para string
    qp.append(k, String(v));
  });
  
  const s = qp.toString();
  return s ? `?${s}` : '';
}

/**
 * Constrói parâmetros de paginação seguros
 * @param {number} page - Número da página (mínimo 1)
 * @param {number} limit - Limite de itens por página (mínimo 1, máximo 100)
 * @returns {object} Objeto com page e limit validados
 */
export function buildPagination(page = 1, limit = 10) {
  const safePage = Math.max(1, parseInt(String(page), 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
  
  return {
    page: safePage,
    limit: safeLimit
  };
}

/**
 * Valida e formata filtros de data
 * @param {string} dateString - String de data no formato YYYY-MM-DD
 * @returns {string|null} Data formatada ou null se inválida
 */
export function validateDateFilter(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  
  const trimmed = dateString.trim();
  if (!trimmed) return null;
  
  // Verifica se está no formato YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(trimmed)) return null;
  
  // Verifica se é uma data válida
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return null;
  
  return trimmed;
}

/**
 * Constrói filtros seguros para APIs
 * @param {object} filters - Objeto com filtros
 * @returns {object} Objeto com filtros validados
 */
export function buildSafeFilters(filters = {}) {
  const safeFilters = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    // Ignora valores vazios
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    
    // Validação especial para datas
    if (key.includes('data') || key === 'de' || key === 'ate') {
      const validDate = validateDateFilter(value);
      if (validDate) {
        safeFilters[key] = validDate;
      }
      return;
    }
    
    // Para outros valores, apenas converte para string
    safeFilters[key] = String(value).trim();
  });
  
  return safeFilters;
}