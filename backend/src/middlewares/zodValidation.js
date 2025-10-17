const { z } = require('zod')
const { createValidationError } = require('./errorHandler')

/**
 * Schemas de validação para diferentes tipos de filtros
 */

// Schema base para paginação
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

// Schema para filtros de data
const dateRangeSchema = z.object({
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// Aceitar valores boolean-like vindos como string ("true","false","1","0") ou boolean
const booleanLike = z.preprocess((v) => {
  if (typeof v === 'string') {
    const lower = v.toLowerCase().trim()
    if (lower === 'true' || lower === '1') return true
    if (lower === 'false' || lower === '0') return false
    return v
  }
  if (v === 1) return true
  if (v === 0) return false
  return v
}, z.boolean())

// Schema para filtros de ordens
const ordensFilterSchema = paginationSchema.extend({
  status: z.enum(['aberta', 'andamento', 'concluida', 'entregue']).optional(),
  cliente_id: z.coerce.number().int().positive().optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
  tecnico: z.string().min(1).max(100).optional(),
}).merge(dateRangeSchema)

// Schema para filtros de produtos
const produtosFilterSchema = paginationSchema.extend({
  categoria: z.string().min(1).max(100).optional(),
  categoria_id: z.coerce.number().int().positive().optional(),
  tipo: z.enum(['peca', 'servico']).optional(),
  estoque_baixo: booleanLike.optional(),
  ativo: booleanLike.optional(),
  fornecedor_id: z.coerce.number().int().positive().optional(),
})

// Schema para filtros de vendas
const vendasFilterSchema = paginationSchema.extend({
  cliente_id: z.coerce.number().int().positive().optional(),
  tipo_pagamento: z.enum(['dinheiro', 'cartao_debito', 'cartao_credito', 'pix', 'transferencia', 'boleto', 'cheque']).optional(),
}).merge(dateRangeSchema)

// Schema para filtros financeiros
const financeiroFilterSchema = paginationSchema.extend({
  status: z.enum(['pendente', 'pago', 'vencido', 'cancelado']).optional(),
  tipo: z.enum(['entrada', 'saida']).optional(),
  categoria: z.string().min(1).max(100).optional(),
  forma_pagamento: z.enum(['dinheiro', 'cartao_debito', 'cartao_credito', 'pix', 'transferencia', 'boleto', 'cheque']).optional(),
}).merge(dateRangeSchema)

// Schema para filtros de categorias
const categoriasFilterSchema = paginationSchema.extend({
  tipo: z.enum(['produto', 'servico']).optional(),
  ativo: booleanLike.optional(),
})

// Schema para estatísticas/dashboard
const statsFilterSchema = dateRangeSchema.extend({
  periodo: z.enum(['hoje', 'semana', 'mes', 'ano']).optional(),
  categoria: z.string().min(1).max(100).optional(),
})

/**
 * Middleware factory para validação de query parameters
 * @param {z.ZodSchema} schema - Schema Zod para validação
 * @returns {Function} Middleware function
 */
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.query)
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: err.input,
        }))
        
        const error = createValidationError(
          'Parâmetros de consulta inválidos',
          errors
        )
        return next(error)
      }
      
      // Substituir req.query pelos dados validados e transformados
      req.query = result.data
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware factory para validação de request body
 * @param {z.ZodSchema} schema - Schema Zod para validação
 * @returns {Function} Middleware function
 */
function validateBody(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body)
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: err.input,
        }))
        
        const error = createValidationError(
          'Dados do corpo da requisição inválidos',
          errors
        )
        return next(error)
      }
      
      // Substituir req.body pelos dados validados e transformados
      req.body = result.data
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware factory para validação de parâmetros de rota
 * @param {z.ZodSchema} schema - Schema Zod para validação
 * @returns {Function} Middleware function
 */
function validateParams(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.params)
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: err.input,
        }))
        
        const error = createValidationError(
          'Parâmetros de rota inválidos',
          errors
        )
        return next(error)
      }
      
      // Substituir req.params pelos dados validados e transformados
      req.params = result.data
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Schemas específicos para validação de IDs
 */
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

/**
 * Middlewares pré-configurados para uso comum
 */
const validateOrdensQuery = validateQuery(ordensFilterSchema)
const validateProdutosQuery = validateQuery(produtosFilterSchema)
const validateVendasQuery = validateQuery(vendasFilterSchema)
const validateFinanceiroQuery = validateQuery(financeiroFilterSchema)
const validateCategoriasQuery = validateQuery(categoriasFilterSchema)
const validateStatsQuery = validateQuery(statsFilterSchema)
const validateIdParam = validateParams(idParamSchema)

/**
 * Função utilitária para criar schemas customizados
 */
function createCustomSchema(baseSchema, extensions = {}) {
  return baseSchema.extend(extensions)
}

/**
 * Função para validar dados sem middleware (uso direto)
 */
function validateData(schema, data) {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      received: err.input,
    }))
    
    throw createValidationError(
      'Dados inválidos',
      errors
    )
  }
  
  return result.data
}

module.exports = {
  // Middleware factories
  validateQuery,
  validateBody,
  validateParams,
  
  // Middlewares pré-configurados
  validateOrdensQuery,
  validateProdutosQuery,
  validateVendasQuery,
  validateFinanceiroQuery,
  validateCategoriasQuery,
  validateStatsQuery,
  validateIdParam,
  
  // Schemas para uso direto
  ordensFilterSchema,
  produtosFilterSchema,
  vendasFilterSchema,
  financeiroFilterSchema,
  categoriasFilterSchema,
  statsFilterSchema,
  paginationSchema,
  dateRangeSchema,
  idParamSchema,
  
  // Utilitários
  createCustomSchema,
  validateData,
}