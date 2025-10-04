// Middleware de validação para clientes
const validateCliente = (req, res, next) => {
  const { nome, telefone } = req.body

  // Validações obrigatórias
  if (!nome || nome.trim().length < 2) {
    return res.status(400).json({
      error: 'Nome é obrigatório e deve ter pelo menos 2 caracteres',
    })
  }

  if (!telefone || telefone.trim().length < 10) {
    return res.status(400).json({
      error: 'Telefone é obrigatório e deve ter pelo menos 10 dígitos',
    })
  }

  // Validação de email se fornecido
  if (req.body.email && req.body.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(req.body.email)) {
      return res.status(400).json({
        error: 'Email deve ter um formato válido',
      })
    }
  }

  next()
}

// Middleware de validação para ordens de serviço
const validateOrdem = (req, res, next) => {
  const { cliente_id, equipamento, defeito } = req.body

  // Validações obrigatórias
  if (!cliente_id || isNaN(cliente_id)) {
    return res.status(400).json({
      error: 'Cliente é obrigatório e deve ser um ID válido',
    })
  }

  if (!equipamento || equipamento.trim().length < 2) {
    return res.status(400).json({
      error: 'Equipamento é obrigatório e deve ter pelo menos 2 caracteres',
    })
  }

  if (!defeito || defeito.trim().length < 5) {
    return res.status(400).json({
      error:
        'Descrição do defeito é obrigatória e deve ter pelo menos 5 caracteres',
    })
  }

  // Validação de status se fornecido
  const statusValidos = [
    'aguardando',
    'em_andamento',
    'aguardando_peca',
    'pronto',
    'entregue',
    'cancelado',
  ]
  if (req.body.status && !statusValidos.includes(req.body.status)) {
    return res.status(400).json({
      error: `Status deve ser um dos seguintes: ${statusValidos.join(', ')}`,
    })
  }

  // Validação de prioridade se fornecida
  const prioridadesValidas = ['baixa', 'normal', 'alta', 'urgente']
  if (
    req.body.prioridade &&
    !prioridadesValidas.includes(req.body.prioridade)
  ) {
    return res.status(400).json({
      error: `Prioridade deve ser uma das seguintes: ${prioridadesValidas.join(
        ', '
      )}`,
    })
  }

  // Validação de valores se fornecidos
  const camposNumericos = [
    'valor_orcamento',
    'valor_mao_obra',
    'valor_pecas',
    'valor_final',
    'desconto',
    'garantia_dias',
  ]

  for (const campo of camposNumericos) {
    if (
      req.body[campo] !== undefined &&
      req.body[campo] !== null &&
      req.body[campo] !== ''
    ) {
      const valor = parseFloat(req.body[campo])
      if (isNaN(valor) || valor < 0) {
        return res.status(400).json({
          error: `${campo.replace('_', ' ')} deve ser um número positivo`,
        })
      }
    }
  }

  // Validação específica para garantia_dias
  if (
    req.body.garantia_dias !== undefined &&
    req.body.garantia_dias !== null &&
    req.body.garantia_dias !== ''
  ) {
    const garantia = parseInt(req.body.garantia_dias)
    if (isNaN(garantia) || garantia < 0 || garantia > 365) {
      return res.status(400).json({
        error: 'Garantia deve ser um número entre 0 e 365 dias',
      })
    }
  }

  next()
}

// Middleware de validação para produtos
const validateProduto = (req, res, next) => {
  const { nome, categoria_id, tipo } = req.body

  // Validações obrigatórias
  if (!nome || nome.trim().length < 2) {
    return res.status(400).json({
      error: 'Nome é obrigatório e deve ter pelo menos 2 caracteres',
    })
  }

  if (!categoria_id || isNaN(categoria_id)) {
    return res.status(400).json({
      error: 'Categoria é obrigatória e deve ser um ID válido',
    })
  }

  // Validação de tipo
  const tiposValidos = ['peca', 'acessorio']
  if (!tipo || !tiposValidos.includes(tipo)) {
    return res.status(400).json({
      error: `Tipo deve ser um dos seguintes: ${tiposValidos.join(', ')}`,
    })
  }

  // Validação de valores numéricos
  const camposNumericos = [
    'preco_custo',
    'preco_venda',
    'margem_lucro',
    'estoque_atual',
    'estoque_minimo',
    'estoque_maximo',
  ]

  for (const campo of camposNumericos) {
    if (
      req.body[campo] !== undefined &&
      req.body[campo] !== null &&
      req.body[campo] !== ''
    ) {
      const valor = parseFloat(req.body[campo])
      if (isNaN(valor) || valor < 0) {
        return res.status(400).json({
          error: `${campo.replace('_', ' ')} deve ser um número positivo`,
        })
      }
    }
  }

  next()
}

// Middleware de validação de ID
const validateId = (req, res, next) => {
  const { id } = req.params

  if (!id || isNaN(id) || parseInt(id) <= 0) {
    return res.status(400).json({
      error: 'ID deve ser um número positivo válido',
    })
  }

  req.params.id = parseInt(id)
  next()
}

// Middleware de validação para atualizações de ordens de serviço
const validateOrdemUpdate = (req, res, next) => {
  const { cliente_id, equipamento, defeito, status, prioridade } = req.body

  // Validação de cliente_id se fornecido
  if (cliente_id !== undefined && (isNaN(cliente_id) || cliente_id <= 0)) {
    return res.status(400).json({
      error: 'Cliente deve ser um ID válido',
    })
  }

  // Validação de equipamento se fornecido
  if (equipamento !== undefined && (!equipamento || equipamento.trim().length < 2)) {
    return res.status(400).json({
      error: 'Equipamento deve ter pelo menos 2 caracteres',
    })
  }

  // Validação de defeito se fornecido
  if (defeito !== undefined && (!defeito || defeito.trim().length < 5)) {
    return res.status(400).json({
      error: 'Descrição do defeito deve ter pelo menos 5 caracteres',
    })
  }

  // Validação de status se fornecido
  if (status !== undefined) {
    const statusValidos = [
      'aguardando',
      'em_andamento',
      'aguardando_peca',
      'pronto',
      'entregue',
      'cancelado'
    ]
    if (!statusValidos.includes(status)) {
      return res.status(400).json({
        error: `Status deve ser um dos seguintes: ${statusValidos.join(', ')}`,
      })
    }
  }

  // Validação de prioridade se fornecida
  if (prioridade !== undefined) {
    const prioridadesValidas = ['baixa', 'normal', 'alta', 'urgente']
    if (!prioridadesValidas.includes(prioridade)) {
      return res.status(400).json({
        error: `Prioridade deve ser uma das seguintes: ${prioridadesValidas.join(', ')}`,
      })
    }
  }

  // Validação de campos numéricos se fornecidos
  const camposNumericos = ['valor_orcamento', 'valor_final']
  for (const campo of camposNumericos) {
    if (req.body[campo] !== undefined) {
      const valor = parseFloat(req.body[campo])
      if (isNaN(valor) || valor < 0) {
        return res.status(400).json({
          error: `${campo.replace('_', ' ')} deve ser um número positivo`,
        })
      }
    }
  }

  next()
}

module.exports = {
  validateCliente,
  validateOrdem,
  validateOrdemUpdate,
  validateProduto,
  validateId,
}
