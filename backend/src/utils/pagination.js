/**
 * Utilitários para paginação determinística
 * Garante ORDER BY consistente e paginação padrão
 */

/**
 * Extrai e valida parâmetros de paginação da query
 * @param {Object} query - req.query object
 * @param {Object} options - Opções de configuração
 * @param {number} options.defaultLimit - Limite padrão (default: 10)
 * @param {number} options.maxLimit - Limite máximo (default: 100)
 * @returns {Object} Parâmetros de paginação validados
 */
function extractPaginationParams(query, options = {}) {
  const {
    defaultLimit = 10,
    maxLimit = 100
  } = options

  const page = Math.max(1, parseInt(query.page) || 1)
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit) || defaultLimit))
  const offset = (page - 1) * limit

  return {
    page,
    limit,
    offset
  }
}

/**
 * Cria resposta paginada padronizada
 * @param {Array} data - Dados da página atual
 * @param {number} total - Total de registros
 * @param {number} page - Página atual
 * @param {number} limit - Limite por página
 * @returns {Object} Resposta paginada
 */
function createPaginatedResponse(data, total, page, limit) {
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  }
}

/**
 * Constrói SQL com ORDER BY determinístico
 * @param {string} baseQuery - Query base sem ORDER BY
 * @param {string} primarySort - Coluna principal para ordenação (ex: 'nome ASC')
 * @param {string} secondarySort - Coluna secundária para determinismo (ex: 'id ASC')
 * @param {number} limit - Limite de registros
 * @param {number} offset - Offset para paginação
 * @returns {string} Query completa com ORDER BY e LIMIT/OFFSET
 */
function buildPaginatedQuery(baseQuery, primarySort, secondarySort = 'id ASC', limit, offset) {
  return `${baseQuery} ORDER BY ${primarySort}, ${secondarySort} LIMIT ${limit} OFFSET ${offset}`
}

/**
 * Constrói query de contagem para paginação
 * @param {string} baseQuery - Query base
 * @returns {string} Query de contagem
 */
function buildCountQuery(baseQuery) {
  // Remove SELECT ... FROM e substitui por SELECT COUNT(*)
  const fromIndex = baseQuery.toUpperCase().indexOf('FROM')
  if (fromIndex === -1) {
    throw new Error('Query inválida: FROM não encontrado')
  }
  
  const fromPart = baseQuery.substring(fromIndex)
  
  // Remove ORDER BY, LIMIT, OFFSET se existirem
  const cleanFromPart = fromPart
    .replace(/\s+ORDER\s+BY\s+[^)]*$/i, '')
    .replace(/\s+LIMIT\s+\d+(\s+OFFSET\s+\d+)?$/i, '')
  
  return `SELECT COUNT(*) as total ${cleanFromPart}`
}

/**
 * Configurações padrão para diferentes tipos de listagem
 */
const PAGINATION_CONFIGS = {
  // Listagens gerais
  default: {
    defaultLimit: 10,
    maxLimit: 100,
    primarySort: 'created_at DESC',
    secondarySort: 'id DESC'
  },
  
  // Produtos
  produtos: {
    defaultLimit: 20,
    maxLimit: 100,
    primarySort: 'nome ASC',
    secondarySort: 'id ASC'
  },
  
  // Ordens de serviço
  ordens: {
    defaultLimit: 15,
    maxLimit: 100,
    primarySort: 'data_entrada DESC',
    secondarySort: 'id DESC'
  },
  
  // Vendas
  vendas: {
    defaultLimit: 20,
    maxLimit: 100,
    primarySort: 'data_venda DESC',
    secondarySort: 'id DESC'
  },
  
  // Financeiro
  financeiro: {
    defaultLimit: 25,
    maxLimit: 100,
    primarySort: 'data_movimentacao DESC',
    secondarySort: 'id DESC'
  },
  
  // Clientes
  clientes: {
    defaultLimit: 30,
    maxLimit: 100,
    primarySort: 'nome ASC',
    secondarySort: 'id ASC'
  },
  
  // Categorias
  categorias: {
    defaultLimit: 50,
    maxLimit: 100,
    primarySort: 'nome ASC',
    secondarySort: 'id ASC'
  }
}

/**
 * Aplica paginação usando configuração específica
 * @param {Object} query - req.query
 * @param {string} configType - Tipo de configuração (produtos, ordens, etc.)
 * @returns {Object} Configuração de paginação
 */
function applyPaginationConfig(query, configType = 'default') {
  const config = PAGINATION_CONFIGS[configType] || PAGINATION_CONFIGS.default
  
  const pagination = extractPaginationParams(query, {
    defaultLimit: config.defaultLimit,
    maxLimit: config.maxLimit
  })
  
  return {
    ...pagination,
    primarySort: config.primarySort,
    secondarySort: config.secondarySort
  }
}

/**
 * Middleware para aplicar paginação padrão automaticamente
 * @param {string} configType - Tipo de configuração
 * @returns {Function} Middleware function
 */
function paginationMiddleware(configType = 'default') {
  return (req, res, next) => {
    req.pagination = applyPaginationConfig(req.query, configType)
    next()
  }
}

/**
 * Valida se uma query tem ORDER BY determinístico
 * @param {string} query - SQL query
 * @returns {boolean} True se tem ORDER BY determinístico
 */
function hasDeterministicOrderBy(query) {
  const orderByMatch = query.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|\s*$)/i)
  if (!orderByMatch) return false
  
  const orderByClause = orderByMatch[1]
  
  // Verifica se tem pelo menos duas colunas ou inclui uma coluna única (como id)
  const hasMultipleColumns = orderByClause.includes(',')
  const hasUniqueColumn = /\bid\b/i.test(orderByClause)
  
  return hasMultipleColumns || hasUniqueColumn
}

module.exports = {
  extractPaginationParams,
  createPaginatedResponse,
  buildPaginatedQuery,
  buildCountQuery,
  applyPaginationConfig,
  paginationMiddleware,
  hasDeterministicOrderBy,
  PAGINATION_CONFIGS
}