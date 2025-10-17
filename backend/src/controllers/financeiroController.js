const db = require('../utils/database-adapter')
const { LoggerManager } = require('../utils/logger')

class FinanceiroController {
  // ==================== FLUXO DE CAIXA ====================

  // Listar movimentações do fluxo de caixa com paginação determinística
  async listarFluxoCaixa(req, res) {
    try {
      const {
        dataInicio,
        dataFim,
        tipo,
        categoria,
        formaPagamento,
      } = req.query

      const { extractPaginationParams, createPaginatedResponse } = require('../utils/pagination')
      const supabase = require('../utils/supabase')

      // Extrair parâmetros de paginação
      const pagination = extractPaginationParams(req.query, { defaultLimit: 25, maxLimit: 100 })

      // 1) Contagem
      let countQ = supabase.client.from('fluxo_caixa').select('*', { count: 'exact', head: true })
      if (dataInicio) countQ = countQ.gte('data_movimentacao', dataInicio)
      if (dataFim) countQ = countQ.lte('data_movimentacao', dataFim)
      if (tipo) countQ = countQ.eq('tipo', tipo)
      if (categoria) countQ = countQ.eq('categoria_id', parseInt(categoria))
      if (formaPagamento) countQ = countQ.eq('forma_pagamento', formaPagamento)
      const { count, error: countErr } = await countQ
      if (countErr) throw countErr
      const total = count || 0

      // 2) Dados com ordenação determinística
      const offset = pagination.offset
      let dataQ = supabase.client
        .from('fluxo_caixa')
        .select('id, tipo, valor, categoria_id, descricao, data_movimentacao, origem_tipo, origem_id, usuario, cliente_id, forma_pagamento, created_at, venda_id, conta_pagar_id, conta_receber_id')
      if (dataInicio) dataQ = dataQ.gte('data_movimentacao', dataInicio)
      if (dataFim) dataQ = dataQ.lte('data_movimentacao', dataFim)
      if (tipo) dataQ = dataQ.eq('tipo', tipo)
      if (categoria) dataQ = dataQ.eq('categoria_id', parseInt(categoria))
      if (formaPagamento) dataQ = dataQ.eq('forma_pagamento', formaPagamento)

      dataQ = dataQ.order('data_movimentacao', { ascending: false }).order('id', { ascending: false }).range(offset, offset + pagination.limit - 1)

      const { data, error } = await dataQ
      if (error) throw error

      res.json(createPaginatedResponse(data || [], total, pagination.page, pagination.limit))
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao listar fluxo de caixa')
    }
  }

  // ==================== CATEGORIAS FINANCEIRAS ====================

  // Listar categorias financeiras
  async listarCategorias(req, res) {
    try {
      const { tipo } = req.query
      const supabase = require('../utils/supabase')

      let q = supabase.client
        .from('categorias_financeiras')
        .select('id, nome, tipo, descricao, cor, ativo, created_at, updated_at')
        .eq('ativo', true)
      if (tipo) q = q.eq('tipo', tipo)
      q = q.order('tipo', { ascending: true }).order('nome', { ascending: true })

      const { data, error } = await q
      if (error) throw error

      res.json({
        success: true,
        data: data || [],
      })
    } catch (error) {
      LoggerManager.error('Erro ao listar categorias financeiras', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Resumo do fluxo de caixa
  async resumoFluxoCaixa(req, res) {
    try {
      const { periodo = 'mensal' } = req.query

      let dataInicio, dataFim
      const hoje = new Date()

      if (periodo === 'mensal') {
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      } else if (periodo === 'anual') {
        dataInicio = new Date(hoje.getFullYear(), 0, 1)
        dataFim = new Date(hoje.getFullYear(), 11, 31)
      } else if (periodo === 'hoje') {
        dataInicio = hoje
        dataFim = hoje
      }

      const formatDate = (date) => date.toISOString().split('T')[0]

      // Totais de entrada e saída
      const resumo = await db.get(
        `
        SELECT 
          COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as total_entradas,
          COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) as total_saidas,
          COUNT(CASE WHEN tipo = 'entrada' THEN 1 END) as qtd_entradas,
          COUNT(CASE WHEN tipo = 'saida' THEN 1 END) as qtd_saidas
        FROM fluxo_caixa 
        WHERE data_movimentacao BETWEEN ? AND ?
      `,
        [formatDate(dataInicio), formatDate(dataFim)]
      )

      const saldo = resumo.total_entradas - resumo.total_saidas

      // Entradas por forma de pagamento
      const entradasPorForma = await db.all(
        `
        SELECT 
          forma_pagamento,
          SUM(valor) as total,
          COUNT(*) as quantidade
        FROM fluxo_caixa 
        WHERE tipo = 'entrada' AND data_movimentacao BETWEEN ? AND ?
        GROUP BY forma_pagamento
        ORDER BY total DESC
      `,
        [formatDate(dataInicio), formatDate(dataFim)]
      )

      // Saídas por categoria
      const saidasPorCategoria = await db.all(
        `
        SELECT 
          cf.nome as categoria,
          SUM(fc.valor) as total,
          COUNT(fc.id) as quantidade
        FROM fluxo_caixa fc
        LEFT JOIN categorias_financeiras cf ON fc.categoria_id = cf.id
        WHERE fc.tipo = 'saida' AND fc.data_movimentacao BETWEEN ? AND ?
        GROUP BY fc.categoria_id, cf.nome
        ORDER BY total DESC
      `,
        [formatDate(dataInicio), formatDate(dataFim)]
      )

      res.json({
        success: true,
        data: {
          periodo,
          dataInicio: formatDate(dataInicio),
          dataFim: formatDate(dataFim),
          resumo: {
            ...resumo,
            saldo,
          },
          entradasPorForma,
          saidasPorCategoria,
        },
      })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao buscar resumo do fluxo de caixa')
    }
  }

  // Adicionar movimentação manual
  async adicionarMovimentacao(req, res) {
    try {
      const { tipo, valor, categoria_id, descricao, data_movimentacao } =
        req.body

      // Validação dos campos obrigatórios
      if (!tipo || !valor || !categoria_id) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: tipo, valor, categoria_id',
        })
      }

      if (!['entrada', 'saida'].includes(tipo)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo deve ser "entrada" ou "saida"',
        })
      }

      if (isNaN(valor) || valor <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valor deve ser um número positivo',
        })
      }

      // Verificar se a categoria existe
      const categoria = await db.get(
        'SELECT * FROM categorias_financeiras WHERE id = ? AND ativo = 1',
        [categoria_id]
      )

      if (!categoria) {
        return res.status(400).json({
          success: false,
          error: 'Categoria não encontrada',
        })
      }

      // Validar compatibilidade tipo vs categoria
      const tipoCategoria = tipo === 'entrada' ? 'receita' : 'despesa'
      if (categoria.tipo !== tipoCategoria) {
        return res.status(400).json({
          success: false,
          error: `Categoria do tipo "${categoria.tipo}" não é compatível com movimentação do tipo "${tipo}"`,
        })
      }

      const dataMovimentacao =
        data_movimentacao || new Date().toISOString().split('T')[0]

      // Inserir a movimentação
      const resultado = await db.run(
        `
        INSERT INTO fluxo_caixa (
          tipo, valor, categoria_id, descricao, data_movimentacao, 
          origem_tipo, origem_id, usuario_id
        )
        VALUES (?, ?, ?, ?, ?, 'manual', NULL, NULL)
      `,
        [
          tipo,
          parseFloat(valor),
          categoria_id,
          descricao?.trim() || null,
          dataMovimentacao,
        ]
      )

      // Buscar a movimentação criada com dados da categoria
      const novaMovimentacao = await db.get(
        `
        SELECT 
          fc.*,
          cf.nome as categoria_nome,
          cf.icone as categoria_icone,
          cf.cor as categoria_cor
        FROM fluxo_caixa fc
        LEFT JOIN categorias_financeiras cf ON fc.categoria_id = cf.id
        WHERE fc.id = ?
      `,
        [resultado.id]
      )

      LoggerManager.info('Nova movimentação adicionada', {
        id: resultado.id,
        tipo,
        valor,
        categoria: categoria.nome,
      })

      res.status(201).json({
        success: true,
        message: 'Movimentação adicionada com sucesso',
        data: novaMovimentacao,
      })
    } catch (error) {
      LoggerManager.error('Erro ao adicionar movimentação', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // ==================== CONTAS A PAGAR ====================

  // Listar contas a pagar
  async listarContasPagar(req, res) {
    try {
      const { status, vencidas, categoria, page = 1, limit = 50 } = req.query

      let whereClause = '1=1'
      let params = []

      if (status) {
        whereClause += ' AND cp.status = ?'
        params.push(status)
      }

      if (vencidas === 'true') {
        whereClause +=
          ' AND cp.data_vencimento < date("now") AND cp.status = "pendente"'
      }

      if (categoria) {
        whereClause += ' AND cp.categoria_id = ?'
        params.push(categoria)
      }

      const offset = (page - 1) * limit

      const contas = await db.all(
        `
        SELECT 
          cp.*,
          cf.nome as categoria_nome,
          CASE 
            WHEN cp.data_vencimento < date("now") AND cp.status = 'pendente' THEN 1
            ELSE 0
          END as vencida
        FROM contas_pagar cp
        LEFT JOIN categorias_financeiras cf ON cp.categoria_id = cf.id
        WHERE ${whereClause}
        ORDER BY cp.data_vencimento ASC
        LIMIT ? OFFSET ?
      `,
        [...params, limit, offset]
      )

      const totalResult = await db.get(
        `
        SELECT COUNT(*) as total 
        FROM contas_pagar cp 
        WHERE ${whereClause}
      `,
        params
      )

      res.json({
        success: true,
        data: contas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          pages: Math.ceil(totalResult.total / limit),
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao listar contas a pagar', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Criar conta a pagar
  async criarContaPagar(req, res) {
    try {
      const {
        descricao,
        valor,
        categoria_id,
        fornecedor,
        data_vencimento,
        numero_documento,
        observacoes,
        recorrente,
        tipo_recorrencia,
      } = req.body

      if (!descricao || !valor || !data_vencimento) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: descricao, valor, data_vencimento',
        })
      }

      const resultado = await db.run(
        `
        INSERT INTO contas_pagar (
          descricao, valor, categoria_id, fornecedor, data_vencimento,
          numero_documento, observacoes, recorrente, tipo_recorrencia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          descricao.trim(),
          parseFloat(valor),
          categoria_id || null,
          fornecedor?.trim() || null,
          data_vencimento,
          numero_documento?.trim() || null,
          observacoes?.trim() || null,
          recorrente || 0,
          tipo_recorrencia || null,
        ]
      )

      const novaConta = await db.get(
        'SELECT * FROM contas_pagar WHERE id = ?',
        [resultado.id]
      )

      LoggerManager.audit('CONTA_PAGAR_CRIADA', 'admin', {
        contaId: resultado.id,
        valor,
      })

      res.status(201).json({
        success: true,
        message: 'Conta a pagar criada com sucesso',
        data: novaConta,
      })
    } catch (error) {
      LoggerManager.error('Erro ao criar conta a pagar', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Pagar conta
  async pagarConta(req, res) {
    try {
      const { id } = req.params
      const {
        valor_pago,
        forma_pagamento,
        data_pagamento,
        juros = 0,
        multa = 0,
        desconto = 0,
        observacoes,
      } = req.body

      if (!valor_pago || !forma_pagamento || !data_pagamento) {
        return res.status(400).json({
          success: false,
          error:
            'Campos obrigatórios: valor_pago, forma_pagamento, data_pagamento',
        })
      }

      // Buscar a conta
      const conta = await db.get('SELECT * FROM contas_pagar WHERE id = ?', [
        id,
      ])
      if (!conta) {
        return res.status(404).json({
          success: false,
          error: 'Conta não encontrada',
        })
      }

      if (conta.status === 'pago') {
        return res.status(400).json({
          success: false,
          error: 'Esta conta já foi paga',
        })
      }

      // Atualizar a conta
      await db.run(
        `
        UPDATE contas_pagar 
        SET status = 'pago', data_pagamento = ?, valor_pago = ?, 
            forma_pagamento = ?, juros = ?, multa = ?, desconto = ?,
            observacoes = COALESCE(observacoes || ' | ', '') || ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [
          data_pagamento,
          parseFloat(valor_pago),
          forma_pagamento,
          parseFloat(juros),
          parseFloat(multa),
          parseFloat(desconto),
          observacoes || 'Pagamento realizado',
          id,
        ]
      )

      // Registrar no fluxo de caixa
      await db.run(
        `
        INSERT INTO fluxo_caixa (
          tipo, valor, descricao, categoria_id, conta_pagar_id,
          forma_pagamento, data_movimentacao, observacoes, usuario
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          'saida',
          parseFloat(valor_pago),
          `Pagamento: ${conta.descricao}`,
          conta.categoria_id,
          id,
          forma_pagamento,
          data_pagamento,
          observacoes || null,
          'admin',
        ]
      )

      LoggerManager.audit('CONTA_PAGAR_PAGA', 'admin', {
        contaId: id,
        valorPago: valor_pago,
      })

      res.json({
        success: true,
        message: 'Conta paga com sucesso',
      })
    } catch (error) {
      LoggerManager.error('Erro ao pagar conta', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // ==================== CONTAS A RECEBER ====================

  // Listar contas a receber
  async listarContasReceber(req, res) {
    try {
      const {
        status,
        vencidas,
        categoria,
        cliente,
        page = 1,
        limit = 50,
      } = req.query

      let whereClause = '1=1'
      let params = []

      if (status) {
        whereClause += ' AND cr.status = ?'
        params.push(status)
      }

      if (vencidas === 'true') {
        whereClause +=
          ' AND cr.data_vencimento < date("now") AND cr.status = "pendente"'
      }

      if (categoria) {
        whereClause += ' AND cr.categoria_id = ?'
        params.push(categoria)
      }

      if (cliente) {
        whereClause += ' AND cr.cliente_id = ?'
        params.push(cliente)
      }

      const offset = (page - 1) * limit

      const contas = await db.all(
        `
        SELECT 
          cr.*,
          cf.nome as categoria_nome,
          c.nome as cliente_nome,
          CASE 
            WHEN cr.data_vencimento < date("now") AND cr.status = 'pendente' THEN 1
            ELSE 0
          END as vencida
        FROM contas_receber cr
        LEFT JOIN categorias_financeiras cf ON cr.categoria_id = cf.id
        LEFT JOIN clientes c ON cr.cliente_id = c.id
        WHERE ${whereClause}
        ORDER BY cr.data_vencimento ASC
        LIMIT ? OFFSET ?
      `,
        [...params, limit, offset]
      )

      const totalResult = await db.get(
        `
        SELECT COUNT(*) as total 
        FROM contas_receber cr 
        WHERE ${whereClause}
      `,
        params
      )

      res.json({
        success: true,
        data: contas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          pages: Math.ceil(totalResult.total / limit),
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao listar contas a receber', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Criar conta a receber
  async criarContaReceber(req, res) {
    try {
      const {
        descricao,
        valor,
        categoria_id,
        cliente_id,
        ordem_id,
        venda_id,
        data_vencimento,
        numero_documento,
        observacoes,
        recorrente,
        tipo_recorrencia,
      } = req.body

      if (!descricao || !valor || !data_vencimento) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: descricao, valor, data_vencimento',
        })
      }

      const resultado = await db.run(
        `
        INSERT INTO contas_receber (
          descricao, valor, categoria_id, cliente_id, ordem_id, venda_id,
          data_vencimento, numero_documento, observacoes, recorrente, tipo_recorrencia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          descricao.trim(),
          parseFloat(valor),
          categoria_id || null,
          cliente_id || null,
          ordem_id || null,
          venda_id || null,
          data_vencimento,
          numero_documento?.trim() || null,
          observacoes?.trim() || null,
          recorrente || 0,
          tipo_recorrencia || null,
        ]
      )

      const novaConta = await db.get(
        'SELECT * FROM contas_receber WHERE id = ?',
        [resultado.id]
      )

      LoggerManager.audit('CONTA_RECEBER_CRIADA', 'admin', {
        contaId: resultado.id,
        valor,
      })

      res.status(201).json({
        success: true,
        message: 'Conta a receber criada com sucesso',
        data: novaConta,
      })
    } catch (error) {
      LoggerManager.error('Erro ao criar conta a receber', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Receber conta
  async receberConta(req, res) {
    try {
      const { id } = req.params
      const {
        valor_recebido,
        forma_recebimento,
        data_recebimento,
        juros = 0,
        multa = 0,
        desconto = 0,
        observacoes,
      } = req.body

      if (!valor_recebido || !forma_recebimento || !data_recebimento) {
        return res.status(400).json({
          success: false,
          error:
            'Campos obrigatórios: valor_recebido, forma_recebimento, data_recebimento',
        })
      }

      // Buscar a conta
      const conta = await db.get('SELECT * FROM contas_receber WHERE id = ?', [
        id,
      ])
      if (!conta) {
        return res.status(404).json({
          success: false,
          error: 'Conta não encontrada',
        })
      }

      if (conta.status === 'recebido') {
        return res.status(400).json({
          success: false,
          error: 'Esta conta já foi recebida',
        })
      }

      // Atualizar a conta
      await db.run(
        `
        UPDATE contas_receber 
        SET status = 'recebido', data_recebimento = ?, valor_recebido = ?, 
            forma_recebimento = ?, juros = ?, multa = ?, desconto = ?,
            observacoes = COALESCE(observacoes || ' | ', '') || ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [
          data_recebimento,
          parseFloat(valor_recebido),
          forma_recebimento,
          parseFloat(juros),
          parseFloat(multa),
          parseFloat(desconto),
          observacoes || 'Recebimento realizado',
          id,
        ]
      )

      // Registrar no fluxo de caixa
      await db.run(
        `
        INSERT INTO fluxo_caixa (
          tipo, valor, descricao, categoria_id, conta_receber_id, cliente_id,
          forma_pagamento, data_movimentacao, observacoes, usuario
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          'entrada',
          parseFloat(valor_recebido),
          `Recebimento: ${conta.descricao}`,
          conta.categoria_id,
          id,
          conta.cliente_id,
          forma_recebimento,
          data_recebimento,
          observacoes || null,
          'admin',
        ]
      )

      LoggerManager.audit('CONTA_RECEBER_RECEBIDA', 'admin', {
        contaId: id,
        valorRecebido: valor_recebido,
      })

      res.json({
        success: true,
        message: 'Conta recebida com sucesso',
      })
    } catch (error) {
      LoggerManager.error('Erro ao receber conta', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // ==================== CATEGORIAS FINANCEIRAS ====================

  // Listar categorias financeiras
  async listarCategorias(req, res) {
    try {
      const { tipo } = req.query

      let whereClause = 'ativo = 1'
      let params = []

      if (tipo) {
        whereClause += ' AND tipo = ?'
        params.push(tipo)
      }

      const categorias = await db.all(
        `
        SELECT * FROM categorias_financeiras 
        WHERE ${whereClause}
        ORDER BY tipo, nome
      `,
        params
      )

      res.json({
        success: true,
        data: categorias,
      })
    } catch (error) {
      LoggerManager.error('Erro ao listar categorias financeiras', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Criar categoria financeira
  async criarCategoria(req, res) {
    try {
      const { nome, descricao, tipo, icone, cor } = req.body

      if (!nome || !tipo) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: nome, tipo',
        })
      }

      if (!['receita', 'despesa'].includes(tipo)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo deve ser "receita" ou "despesa"',
        })
      }

      const resultado = await db.run(
        `
        INSERT INTO categorias_financeiras (nome, descricao, tipo, icone, cor)
        VALUES (?, ?, ?, ?, ?)
      `,
        [
          nome.trim(),
          descricao?.trim() || null,
          tipo,
          icone || null,
          cor || null,
        ]
      )

      const novaCategoria = await db.get(
        'SELECT * FROM categorias_financeiras WHERE id = ?',
        [resultado.id]
      )

      res.status(201).json({
        success: true,
        message: 'Categoria criada com sucesso',
        data: novaCategoria,
      })
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({
          success: false,
          error: 'Já existe uma categoria com este nome',
        })
      }

      LoggerManager.error('Erro ao criar categoria financeira', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // ==================== RELATÓRIOS ====================

  // Relatório mensal
  async relatorioMensal(req, res) {
    try {
      const { mes, ano } = req.query

      const mesAtual = mes || new Date().getMonth() + 1
      const anoAtual = ano || new Date().getFullYear()

      const dataInicio = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`
      const ultimoDiaMes = new Date(anoAtual, mesAtual, 0).getDate()
      const dataFim = `${anoAtual}-${String(mesAtual).padStart(
        2,
        '0'
      )}-${ultimoDiaMes}`

      // Resumo geral
      const resumoGeral = await db.get(
        `
        SELECT 
          COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as total_entradas,
          COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) as total_saidas
        FROM fluxo_caixa 
        WHERE data_movimentacao BETWEEN ? AND ?
      `,
        [dataInicio, dataFim]
      )

      // Entradas por categoria
      const entradasPorCategoria = await db.all(
        `
        SELECT 
          cf.nome as categoria,
          SUM(fc.valor) as total,
          COUNT(fc.id) as quantidade
        FROM fluxo_caixa fc
        LEFT JOIN categorias_financeiras cf ON fc.categoria_id = cf.id
        WHERE fc.tipo = 'entrada' AND fc.data_movimentacao BETWEEN ? AND ?
        GROUP BY fc.categoria_id, cf.nome
        ORDER BY total DESC
      `,
        [dataInicio, dataFim]
      )

      // Saídas por categoria
      const saidasPorCategoria = await db.all(
        `
        SELECT 
          cf.nome as categoria,
          SUM(fc.valor) as total,
          COUNT(fc.id) as quantidade
        FROM fluxo_caixa fc
        LEFT JOIN categorias_financeiras cf ON fc.categoria_id = cf.id
        WHERE fc.tipo = 'saida' AND fc.data_movimentacao BETWEEN ? AND ?
        GROUP BY fc.categoria_id, cf.nome
        ORDER BY total DESC
      `,
        [dataInicio, dataFim]
      )

      // Contas a pagar vencidas
      const contasVencidas = await db.get(`
        SELECT COUNT(*) as quantidade, COALESCE(SUM(valor), 0) as valor_total
        FROM contas_pagar 
        WHERE status = 'pendente' AND data_vencimento < date('now')
      `)

      // Contas a receber vencidas
      const receberVencidas = await db.get(`
        SELECT COUNT(*) as quantidade, COALESCE(SUM(valor), 0) as valor_total
        FROM contas_receber 
        WHERE status = 'pendente' AND data_vencimento < date('now')
      `)

      // Evolução diária do mês
      const evolucaoDiaria = await db.all(
        `
        SELECT 
          data_movimentacao,
          SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as entradas,
          SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) as saidas
        FROM fluxo_caixa 
        WHERE data_movimentacao BETWEEN ? AND ?
        GROUP BY data_movimentacao
        ORDER BY data_movimentacao
      `,
        [dataInicio, dataFim]
      )

      const saldo = resumoGeral.total_entradas - resumoGeral.total_saidas

      res.json({
        success: true,
        data: {
          periodo: {
            mes: mesAtual,
            ano: anoAtual,
            dataInicio,
            dataFim,
          },
          resumoGeral: {
            ...resumoGeral,
            saldo,
          },
          entradasPorCategoria,
          saidasPorCategoria,
          alertas: {
            contasVencidas,
            receberVencidas,
          },
          evolucaoDiaria,
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao gerar relatório mensal', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Dashboard financeiro
  async dashboardFinanceiro(req, res) {
    try {
      LoggerManager.info('🔍 Carregando dashboard financeiro...')

      // Verificar se a tabela fluxo_caixa existe
      try {
        await db.get('SELECT COUNT(*) FROM fluxo_caixa LIMIT 1')
        LoggerManager.info('✅ Tabela fluxo_caixa encontrada')
      } catch (tableError) {
        LoggerManager.warn('⚠️ Tabela fluxo_caixa não encontrada, retornando dados padrão')
        return res.json({
          success: true,
          data: {
            saldoAtual: 0,
            entradas: {
              total: 0,
            },
            saidas: {
              total: 0,
            },
            message: 'Sistema financeiro não configurado ainda'
          },
        })
      }

      // Saldo atual (até hoje)
      const saldoAtual = await db.get(`
        SELECT 
          COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as total_entradas,
          COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) as total_saidas
        FROM fluxo_caixa 
        WHERE data_movimentacao <= CURRENT_DATE
      `)

      const saldo = (saldoAtual?.total_entradas || 0) - (saldoAtual?.total_saidas || 0)

      LoggerManager.info('✅ Dashboard financeiro carregado com sucesso')

      res.json({
        success: true,
        data: {
          saldoAtual: saldo,
          entradas: {
            total: saldoAtual?.total_entradas || 0,
          },
          saidas: {
            total: saldoAtual?.total_saidas || 0,
          },
        },
      })
    } catch (error) {
      LoggerManager.error('❌ Erro ao carregar dashboard financeiro:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      })
    }
  }

  // ==================== FUNÇÕES ADICIONAIS ====================

  // Atualizar conta a pagar
  async atualizarContaPagar(req, res) {
    try {
      const { id } = req.params
      const {
        descricao,
        valor,
        categoria_id,
        fornecedor,
        data_vencimento,
        numero_documento,
        observacoes,
        status,
      } = req.body

      // Verificar se a conta existe
      const contaExistente = await db.get(
        'SELECT * FROM contas_pagar WHERE id = ?',
        [id]
      )

      if (!contaExistente) {
        return res.status(404).json({
          success: false,
          error: 'Conta a pagar não encontrada',
        })
      }

      // Atualizar a conta
      await db.run(
        `
        UPDATE contas_pagar SET
          descricao = ?,
          valor = ?,
          categoria_id = ?,
          fornecedor = ?,
          data_vencimento = ?,
          numero_documento = ?,
          observacoes = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [
          descricao || contaExistente.descricao,
          valor !== undefined ? parseFloat(valor) : contaExistente.valor,
          categoria_id || contaExistente.categoria_id,
          fornecedor || contaExistente.fornecedor,
          data_vencimento || contaExistente.data_vencimento,
          numero_documento || contaExistente.numero_documento,
          observacoes || contaExistente.observacoes,
          status || contaExistente.status,
          id,
        ]
      )

      res.json({
        success: true,
        message: 'Conta a pagar atualizada com sucesso',
      })

      LoggerManager.info('Conta a pagar atualizada', { id, usuario: 'sistema' })
    } catch (error) {
      LoggerManager.error('Erro ao atualizar conta a pagar', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Gerar relatório mensal (alias para relatorioMensal)
  async gerarRelatorioMensal(req, res) {
    return this.relatorioMensal(req, res)
  }

  // Exportar fluxo de caixa
  async exportarFluxoCaixa(req, res) {
    try {
      const { data_inicio, data_fim, formato = 'json' } = req.query

      let whereClause = '1=1'
      let params = []

      if (data_inicio) {
        whereClause += ' AND fc.data_movimentacao >= ?'
        params.push(data_inicio)
      }

      if (data_fim) {
        whereClause += ' AND fc.data_movimentacao <= ?'
        params.push(data_fim)
      }

      const movimentacoes = await db.all(
        `
        SELECT 
          fc.*,
          cf.nome as categoria_nome,
          cf.tipo as categoria_tipo,
          c.nome as cliente_nome
        FROM fluxo_caixa fc
        LEFT JOIN categorias_financeiras cf ON fc.categoria_id = cf.id
        LEFT JOIN clientes c ON fc.cliente_id = c.id
        WHERE ${whereClause}
        ORDER BY fc.data_movimentacao DESC, fc.created_at DESC
      `,
        params
      )

      if (formato === 'csv') {
        // Gerar CSV
        let csv =
          'Data,Tipo,Descrição,Categoria,Cliente,Valor,Forma Pagamento,Observações\n'

        movimentacoes.forEach((mov) => {
          const linha = [
            mov.data_movimentacao,
            mov.tipo,
            `"${(mov.descricao || '').replace(/"/g, '""')}"`,
            `"${(mov.categoria_nome || '').replace(/"/g, '""')}"`,
            `"${(mov.cliente_nome || '').replace(/"/g, '""')}"`,
            mov.valor,
            mov.forma_pagamento,
            `"${(mov.observacoes || '').replace(/"/g, '""')}"`,
          ].join(',')
          csv += linha + '\n'
        })

        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=fluxo_caixa_${Date.now()}.csv`
        )
        return res.send(csv)
      }

      // Retornar JSON
      res.json({
        success: true,
        data: movimentacoes,
        total: movimentacoes.length,
        periodo: { data_inicio, data_fim },
        gerado_em: new Date().toISOString(),
      })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao exportar fluxo de caixa')
    }
  }

  // Atualizar status das contas automaticamente
  async atualizarStatusContas(req, res) {
    try {
      const hoje = new Date().toISOString().split('T')[0]

      // Marcar contas a pagar vencidas
      const contasPagarVencidas = await db.run(
        `
        UPDATE contas_pagar 
        SET status = 'vencido', updated_at = CURRENT_TIMESTAMP
        WHERE data_vencimento < ? AND status = 'pendente'
      `,
        [hoje]
      )

      // Marcar contas a receber vencidas
      const contasReceberVencidas = await db.run(
        `
        UPDATE contas_receber 
        SET status = 'vencido', updated_at = CURRENT_TIMESTAMP
        WHERE data_vencimento < ? AND status = 'pendente'
      `,
        [hoje]
      )

      res.json({
        success: true,
        message: 'Status das contas atualizado com sucesso',
        data: {
          contas_pagar_atualizadas: contasPagarVencidas.changes || 0,
          contas_receber_atualizadas: contasReceberVencidas.changes || 0,
          data_execucao: hoje,
        },
      })

      LoggerManager.info('Status das contas atualizado automaticamente', {
        contas_pagar: contasPagarVencidas.changes || 0,
        contas_receber: contasReceberVencidas.changes || 0,
      })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao atualizar status das contas')
    }
  }
}

module.exports = new FinanceiroController()
