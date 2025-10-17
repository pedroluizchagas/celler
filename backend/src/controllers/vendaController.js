const db = require('../utils/database-adapter')
const { LoggerManager } = require('../utils/logger')

class VendaController {
  // Listar todas as vendas com paginação determinística
  async index(req, res) {
    try {
      const { data_inicio, data_fim, cliente_id } = req.query
      const { extractPaginationParams, createPaginatedResponse } = require('../utils/pagination')

      // Extrair parâmetros de paginação
      const pagination = extractPaginationParams(req.query, { defaultLimit: 20, maxLimit: 100 })

      // Query base para dados
      let baseQuery = `
        SELECT 
          v.*,
          c.nome as cliente_nome,
          c.telefone as cliente_telefone,
          COUNT(vi.id) as total_itens
        FROM vendas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN venda_itens vi ON v.id = vi.venda_id
        WHERE 1=1
      `

      // Query para contagem
      let countQuery = 'SELECT COUNT(*) as total FROM vendas v WHERE 1=1'
      
      const params = []
      const countParams = []

      // Aplicar filtros
      if (data_inicio) {
        baseQuery += ' AND DATE(v.data_venda) >= ?'
        countQuery += ' AND DATE(v.data_venda) >= ?'
        params.push(data_inicio)
        countParams.push(data_inicio)
      }

      if (data_fim) {
        baseQuery += ' AND DATE(v.data_venda) <= ?'
        countQuery += ' AND DATE(v.data_venda) <= ?'
        params.push(data_fim)
        countParams.push(data_fim)
      }

      if (cliente_id) {
        baseQuery += ' AND v.cliente_id = ?'
        countQuery += ' AND v.cliente_id = ?'
        params.push(cliente_id)
        countParams.push(cliente_id)
      }

      // Executar query de contagem
      const { total } = await db.get(countQuery, countParams)

      // Adicionar GROUP BY, ORDER BY determinístico e paginação
      const dataQuery = baseQuery + 
        ' GROUP BY v.id' +
        ' ORDER BY v.data_venda DESC, v.id DESC' + 
        ` LIMIT ${pagination.limit} OFFSET ${pagination.offset}`

      // Executar query de dados
      const vendas = await db.all(dataQuery, params)

      // Retornar resposta paginada
      res.json(createPaginatedResponse(vendas, total, pagination.page, pagination.limit))
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao listar vendas')
    }
  }

  // Buscar venda por ID
  async show(req, res) {
    try {
      const { id } = req.params

      const venda = await db.get(
        `
        SELECT 
          v.*,
          c.nome as cliente_nome,
          c.telefone as cliente_telefone,
          c.email as cliente_email
        FROM vendas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        WHERE v.id = ?
      `,
        [id]
      )

      if (!venda) {
        return res.status(404).json({
          success: false,
          error: 'Venda não encontrada',
        })
      }

      // Buscar itens da venda
      const itens = await db.all(
        `
        SELECT 
          vi.*,
          p.nome as produto_nome,
          p.codigo_barras,
          p.codigo_interno,
          p.tipo as produto_tipo
        FROM venda_itens vi
        JOIN produtos p ON vi.produto_id = p.id
        WHERE vi.venda_id = ?
        ORDER BY p.nome ASC
      `,
        [id]
      )

      res.json({
        success: true,
        data: {
          ...venda,
          itens,
        },
      })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao buscar venda')
    }
  }

  // Criar nova venda
  async store(req, res) {
    try {
      const { cliente_id, tipo_pagamento, desconto, observacoes, itens } =
        req.body

      if (!itens || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'É necessário informar pelo menos um item',
        })
      }

      // Gerar número da venda
      const ultimaVenda = await db.get(
        'SELECT MAX(id) as ultimo_id FROM vendas'
      )
      const numeroVenda = `VD${String(
        (ultimaVenda.ultimo_id || 0) + 1
      ).padStart(6, '0')}`

      // Validar itens e calcular total
      let valorTotal = 0
      const itensValidados = []

      for (const item of itens) {
        const produto = await db.get(
          'SELECT * FROM produtos WHERE id = ? AND ativo = 1',
          [item.produto_id]
        )
        if (!produto) {
          return res.status(400).json({
            success: false,
            error: `Produto ID ${item.produto_id} não encontrado`,
          })
        }

        if (produto.estoque_atual < item.quantidade) {
          return res.status(400).json({
            success: false,
            error: `Estoque insuficiente para ${produto.nome}. Disponível: ${produto.estoque_atual}`,
          })
        }

        const precoUnitario = item.preco_unitario || produto.preco_venda
        const precoTotal = precoUnitario * item.quantidade

        itensValidados.push({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: precoUnitario,
          preco_total: precoTotal,
          produto: produto,
        })

        valorTotal += precoTotal
      }

      // Aplicar desconto
      const descontoValor = desconto || 0
      valorTotal -= descontoValor

      if (valorTotal < 0) {
        return res.status(400).json({
          success: false,
          error: 'Desconto não pode ser maior que o valor total',
        })
      }

      // Criar venda
      const resultadoVenda = await db.run(
        `
        INSERT INTO vendas (cliente_id, numero_venda, tipo_pagamento, desconto, valor_total, observacoes)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          cliente_id || null,
          numeroVenda,
          tipo_pagamento,
          descontoValor,
          valorTotal,
          observacoes?.trim(),
        ]
      )

      // Criar itens da venda
      for (const item of itensValidados) {
        await db.run(
          `
          INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, preco_total)
          VALUES (?, ?, ?, ?, ?)
        `,
          [
            resultadoVenda.id,
            item.produto_id,
            item.quantidade,
            item.preco_unitario,
            item.preco_total,
          ]
        )

        // Movimentar estoque - inserção direta
        await db.run(
          `
          INSERT INTO movimentacoes_estoque (
            produto_id, tipo, quantidade, quantidade_anterior, quantidade_atual,
            preco_unitario, valor_total, motivo, observacoes, usuario,
            referencia_id, referencia_tipo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            item.produto_id,
            'saida',
            item.quantidade,
            item.produto.estoque_atual,
            item.produto.estoque_atual - item.quantidade,
            item.preco_unitario || 0,
            item.preco_total || 0,
            'venda',
            `Venda ${numeroVenda}`,
            'system',
            resultadoVenda.id,
            'venda',
          ]
        )

        // Atualizar estoque
        await db.run(
          'UPDATE produtos SET estoque_atual = estoque_atual - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [item.quantidade, item.produto_id]
        )

        // Verificar alertas de estoque - inserção direta
        const produtoAtualizado = await db.get(
          'SELECT * FROM produtos WHERE id = ?',
          [item.produto_id]
        )

        if (produtoAtualizado) {
          // Remover alertas antigos
          await db.run('DELETE FROM alertas_estoque WHERE produto_id = ?', [
            item.produto_id,
          ])

          // Verificar estoque baixo
          if (
            produtoAtualizado.estoque_atual <= produtoAtualizado.estoque_minimo
          ) {
            const tipo =
              produtoAtualizado.estoque_atual === 0
                ? 'estoque_zerado'
                : 'estoque_baixo'
            const mensagem = 
              produtoAtualizado.estoque_atual === 0 
                ? `Produto ${produtoAtualizado.nome} está com estoque zerado após venda`
                : `Produto ${produtoAtualizado.nome} está com estoque baixo após venda (${produtoAtualizado.estoque_atual} unidades)`
            await db.run(
              `INSERT INTO alertas_estoque (produto_id, tipo, mensagem) VALUES (?, ?, ?)`,
              [item.produto_id, tipo, mensagem]
            )
          }
        }
      }

      LoggerManager.audit('VENDA_CRIADA', 'system', {
        vendaId: resultadoVenda.id,
        numeroVenda: numeroVenda,
        valorTotal: valorTotal,
        totalItens: itens.length,
      })

      // Integração com módulo financeiro
      try {
        // Criar conta a receber se não for pagamento à vista
        if (tipo_pagamento !== 'dinheiro') {
          await db.run(
            `
            INSERT INTO contas_receber (
              descricao, valor, cliente_id, venda_id, data_vencimento,
              numero_documento, observacoes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              `Venda ${numeroVenda}`,
              valorTotal,
              cliente_id || null,
              resultadoVenda.id,
              new Date().toISOString().split('T')[0], // Vencimento hoje para cartão/pix
              numeroVenda,
              observacoes || null,
              'pendente',
            ]
          )
        } else {
          // Para pagamento à vista, registrar direto no fluxo de caixa
          await db.run(
            `
            INSERT INTO fluxo_caixa (
              tipo, valor, descricao, cliente_id, venda_id,
              forma_pagamento, data_movimentacao, observacoes, usuario
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              'entrada',
              valorTotal,
              `Venda ${numeroVenda}`,
              cliente_id || null,
              resultadoVenda.id,
              tipo_pagamento,
              new Date().toISOString().split('T')[0],
              observacoes || null,
              'system',
            ]
          )
        }

        LoggerManager.info('Integração financeira da venda criada', {
          vendaId: resultadoVenda.id,
          tipo_pagamento,
          valorTotal,
        })
      } catch (error) {
        LoggerManager.error('Erro na integração financeira da venda:', error)
        // Não falha a venda por erro na integração financeira
      }

      const novaVenda = await db.get('SELECT * FROM vendas WHERE id = ?', [
        resultadoVenda.id,
      ])

      res.status(201).json({
        success: true,
        message: 'Venda realizada com sucesso',
        data: novaVenda,
      })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao criar venda')
    }
  }

  // Estatísticas por período com tratamento robusto
  async estatisticasPorPeriodo(req, res) {
    try {
      const { de = null, ate = null } = req.query
      
      // Usar defaults seguros se não fornecidos
      const dataInicio = de || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const dataFim = ate || new Date().toISOString().split('T')[0]

      const { data, error } = await db.query(`
        SELECT
          date_trunc('day', v.data_venda)::date AS dia,
          COUNT(*)::int AS qtd_vendas,
          COALESCE(SUM(v.valor_total), 0)::numeric AS total
        FROM vendas v
        WHERE v.data_venda::date BETWEEN $1::date AND $2::date
        GROUP BY 1
        ORDER BY 1
      `, [dataInicio, dataFim])

      if (error) throw error

      res.json({
        success: true,
        data: data || [],
        periodo: { de: dataInicio, ate: dataFim }
      })
    } catch (error) {
      LoggerManager.error('Erro ao buscar estatísticas por período:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Estatísticas do PDV/Dashboard (compatível com Supabase, sem SQL bruto)
  async estatisticas(req, res) {
    try {
      const supabase = require('../utils/supabase')

      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')

      const hojeStr = `${yyyy}-${mm}-${dd}`
      const inicioMesStr = `${yyyy}-${mm}-01`

      const startHoje = `${hojeStr} 00:00:00`
      const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')} 00:00:00`

      // Vendas de hoje
      const { data: vendasHojeRows, error: vendasHojeErr } = await supabase.client
        .from('vendas')
        .select('valor_total')
        .gte('data_venda', startHoje)
        .lt('data_venda', nextDayStr)

      if (vendasHojeErr) throw vendasHojeErr
      const totalVendasHoje = vendasHojeRows?.length || 0
      const faturamentoHoje = (vendasHojeRows || []).reduce((s, r) => s + (parseFloat(r.valor_total) || 0), 0)
      const ticketMedioHoje = totalVendasHoje ? (faturamentoHoje / totalVendasHoje) : 0

      // Vendas do mês
      const { data: vendasMesRows, error: vendasMesErr } = await supabase.client
        .from('vendas')
        .select('valor_total, tipo_pagamento')
        .gte('data_venda', `${inicioMesStr} 00:00:00`)

      if (vendasMesErr) throw vendasMesErr
      const totalVendasMes = vendasMesRows?.length || 0
      const faturamentoMes = (vendasMesRows || []).reduce((s, r) => s + (parseFloat(r.valor_total) || 0), 0)
      const ticketMedioMes = totalVendasMes ? (faturamentoMes / totalVendasMes) : 0

      // Métodos de pagamento mais utilizados (no mês)
      const metodosMap = {}
      for (const row of vendasMesRows || []) {
        const key = row.tipo_pagamento || 'indefinido'
        if (!metodosMap[key]) metodosMap[key] = { tipo_pagamento: key, quantidade: 0, valor_total: 0 }
        metodosMap[key].quantidade += 1
        metodosMap[key].valor_total += parseFloat(row.valor_total) || 0
      }
      const metodosPopulares = Object.values(metodosMap).sort((a, b) => b.quantidade - a.quantidade)

      // Produtos populares hoje (opcional, retornar vazio por enquanto para evitar joins complexos)
      const produtosPopularesHoje = []

      res.json({
        success: true,
        data: {
          hoje: {
            total_vendas: totalVendasHoje,
            faturamento_hoje: faturamentoHoje,
            ticket_medio_hoje: ticketMedioHoje,
          },
          mes: {
            total_vendas_mes: totalVendasMes,
            faturamento_mes: faturamentoMes,
            ticket_medio_mes: ticketMedioMes,
          },
          metodos_pagamento: metodosPopulares,
          produtos_populares_hoje: produtosPopularesHoje,
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao buscar estatísticas:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Relatório de vendas (usando RPC no Supabase, sem SQL cru)
  async relatorio(req, res) {
    try {
      const { data_inicio = null, data_fim = null, tipo_pagamento = null } = req.query

      // Chamar função SQL criada na migração: vendas_relatorio_periodo
      let vendasPorDia = []
      try {
        vendasPorDia = await db.rpc('vendas_relatorio_periodo', {
          p_data_inicio: data_inicio || null,
          p_data_fim: data_fim || null,
          p_tipo_pagamento: tipo_pagamento || null,
        })
      } catch (rpcError) {
        const { respondWithError } = require('../utils/http-error')
        return respondWithError(res, rpcError, 'Falha ao obter relatório (RPC)')
      }

      // Resumo geral a partir do resultado
      const resumo = (vendasPorDia || []).reduce((acc, r) => {
        const qtd = Number(r.qtd_vendas || 0)
        const val = Number(r.valor_total || 0)
        acc.total_vendas += qtd
        acc.faturamento_total += val
        acc.total_dias += 1
        return acc
      }, { total_vendas: 0, faturamento_total: 0, total_dias: 0 })
      resumo.ticket_medio = resumo.total_vendas ? (resumo.faturamento_total / resumo.total_vendas) : 0

      // Produtos mais vendidos — opcional por ora (evitar SELECTs complexos sem view/RPC)
      const produtosMaisVendidos = []

      res.json({
        success: true,
        data: {
          vendas_por_dia: vendasPorDia || [],
          produtos_mais_vendidos: produtosMaisVendidos,
          resumo,
        },
      })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao gerar relatório de vendas')
    }
  }

  // Métodos auxiliares
  async movimentarEstoque(dados) {
    return await db.run(
      `
      INSERT INTO movimentacoes_estoque (
        produto_id, tipo, quantidade, quantidade_anterior, quantidade_atual,
        preco_unitario, valor_total, motivo, observacoes, usuario,
        referencia_id, referencia_tipo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        dados.produto_id,
        dados.tipo,
        dados.quantidade,
        dados.quantidade_anterior,
        dados.quantidade_atual,
        dados.preco_unitario || 0,
        dados.valor_total || 0,
        dados.motivo,
        dados.observacoes,
        dados.usuario || 'system',
        dados.referencia_id,
        dados.referencia_tipo,
      ]
    )
  }

  async verificarAlertas(produtoId) {
    const produto = await db.get('SELECT * FROM produtos WHERE id = ?', [
      produtoId,
    ])
    if (!produto) return

    // Remover alertas antigos
    await db.run('DELETE FROM alertas_estoque WHERE produto_id = ?', [
      produtoId,
    ])

    // Verificar estoque baixo
    if (produto.estoque_atual <= produto.estoque_minimo) {
      const tipo =
          produto.estoque_atual === 0 ? 'estoque_zerado' : 'estoque_baixo'
      await db.run(
        `
        INSERT INTO alertas_estoque (produto_id, tipo)
        VALUES (?, ?)
      `,
        [produtoId, tipo]
      )
    }
  }

  // Migrar vendas existentes para o módulo financeiro
  async migrarVendasParaFinanceiro(req, res) {
    try {
      LoggerManager.info(
        'Iniciando migração de vendas para o módulo financeiro'
      )

      // Buscar todas as vendas que não estão no financeiro
      const vendas = await db.all(
        `
        SELECT v.* FROM vendas v
        LEFT JOIN contas_receber cr ON v.id = cr.venda_id
        LEFT JOIN fluxo_caixa fc ON v.id = fc.venda_id
        WHERE cr.id IS NULL AND fc.id IS NULL
        ORDER BY v.data_venda ASC
      `
      )

      let migradas = 0
      let erros = 0

      for (const venda of vendas) {
        try {
          if (venda.tipo_pagamento === 'dinheiro') {
            // Pagamento à vista - direto no fluxo de caixa
            await db.run(
              `
              INSERT INTO fluxo_caixa (
                tipo, valor, descricao, cliente_id, venda_id,
                forma_pagamento, data_movimentacao, observacoes, usuario
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
              [
                'entrada',
                venda.valor_total,
                `Venda ${venda.numero_venda} (Migração)`,
                venda.cliente_id || null,
                venda.id,
                venda.tipo_pagamento,
                venda.data_venda.split(' ')[0], // Pegar só a data
                `Migração automática - ${venda.observacoes || ''}`.trim(),
                'system',
              ]
            )
          } else {
            // Outros tipos de pagamento - criar conta a receber
            await db.run(
              `
              INSERT INTO contas_receber (
                descricao, valor, cliente_id, venda_id, data_vencimento,
                numero_documento, observacoes, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
              [
                `Venda ${venda.numero_venda} (Migração)`,
                venda.valor_total,
                venda.cliente_id || null,
                venda.id,
                venda.data_venda.split(' ')[0], // Vencimento na data da venda
                venda.numero_venda,
                `Migração automática - ${venda.observacoes || ''}`.trim(),
                'recebido', // Marcar como recebido já que é histórico
              ]
            )

            // Também registrar no fluxo de caixa como recebido
            await db.run(
              `
              INSERT INTO fluxo_caixa (
                tipo, valor, descricao, cliente_id, venda_id,
                forma_pagamento, data_movimentacao, observacoes, usuario
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
              [
                'entrada',
                venda.valor_total,
                `Venda ${venda.numero_venda} (Migração)`,
                venda.cliente_id || null,
                venda.id,
                venda.tipo_pagamento,
                venda.data_venda.split(' ')[0],
                `Migração automática - ${venda.observacoes || ''}`.trim(),
                'system',
              ]
            )
          }

          migradas++
        } catch (error) {
          LoggerManager.error(`Erro ao migrar venda ${venda.id}:`, error)
          erros++
        }
      }

      LoggerManager.audit('VENDAS_MIGRADAS_FINANCEIRO', 'admin', {
        totalVendas: vendas.length,
        migradas,
        erros,
      })

      res.json({
        success: true,
        message: `Migração concluída: ${migradas} vendas migradas, ${erros} erros`,
        data: {
          totalVendas: vendas.length,
          migradas,
          erros,
        },
      })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro na migração de vendas para financeiro')
    }
  }
}

module.exports = new VendaController()
