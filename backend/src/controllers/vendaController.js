const db = require('../utils/database-adapter')
const { LoggerManager } = require('../utils/logger')

class VendaController {
  // Listar todas as vendas com paginação determinística (Supabase, sem SQL cru)
  async index(req, res) {
    try {
      const { data_inicio, data_fim, cliente_id } = req.query
      const { extractPaginationParams, createPaginatedResponse } = require('../utils/pagination')
      const supabase = require('../utils/supabase')

      // Extrair parâmetros de paginação
      const pagination = extractPaginationParams(req.query, { defaultLimit: 20, maxLimit: 100 })

      // Contagem com filtros
      let countQ = supabase.client.from('vendas').select('*', { count: 'exact', head: true })
      if (data_inicio) countQ = countQ.gte('data_venda', `${data_inicio} 00:00:00`)
      if (data_fim) countQ = countQ.lte('data_venda', `${data_fim} 23:59:59`)
      if (cliente_id) countQ = countQ.eq('cliente_id', parseInt(cliente_id))
      const { count, error: countErr } = await countQ
      if (countErr) throw countErr
      const total = count || 0

      // Dados com cliente relacionado
      let dataQ = supabase.client
        .from('vendas')
        .select(`
          id, numero_venda, data_venda, valor_total, tipo_pagamento, desconto, cliente_id,
          clientes:clientes (nome, telefone)
        `)
      if (data_inicio) dataQ = dataQ.gte('data_venda', `${data_inicio} 00:00:00`)
      if (data_fim) dataQ = dataQ.lte('data_venda', `${data_fim} 23:59:59`)
      if (cliente_id) dataQ = dataQ.eq('cliente_id', parseInt(cliente_id))

      const offset = pagination.offset
      dataQ = dataQ.order('data_venda', { ascending: false }).order('id', { ascending: false }).range(offset, offset + pagination.limit - 1)
      const { data, error } = await dataQ
      if (error) throw error

      const vendasBase = data || []

      // Contar itens por venda em lote
      const vendaIds = vendasBase.map(v => v.id)
      let itensCountMap = {}
      if (vendaIds.length > 0) {
        const { data: itensRows, error: itensErr } = await supabase.client
          .from('venda_itens')
          .select('venda_id')
          .in('venda_id', vendaIds)
        if (itensErr) throw itensErr
        itensCountMap = (itensRows || []).reduce((acc, row) => {
          acc[row.venda_id] = (acc[row.venda_id] || 0) + 1
          return acc
        }, {})
      }

      const vendas = vendasBase.map(v => ({
        ...v,
        cliente_nome: v.clientes?.nome || null,
        cliente_telefone: v.clientes?.telefone || null,
        total_itens: itensCountMap[v.id] || 0,
      }))

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

  // Criar nova venda (RPC transacional quando disponível, fallback Supabase)
  async store(req, res) {
    try {
      const { cliente_id, tipo_pagamento, desconto, observacoes, itens } = req.body
      if (!itens || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ success: false, error: 'É necessário informar pelo menos um item' })
      }

      // 1) Tenta usar RPC transacional vendas_criar
      try {
        const venda = await db.rpc('vendas_criar', {
          p_cliente_id: cliente_id || null,
          p_tipo_pagamento: tipo_pagamento,
          p_desconto: desconto || 0,
          p_observacoes: observacoes || null,
          p_itens: itens,
        })
        if (venda) {
          return res.status(201).json({ success: true, message: 'Venda realizada com sucesso', data: venda })
        }
      } catch (_) {
        // segue para fallback
      }

      // 2) Fallback: lógica Supabase (não-transacional)
      const supabase = require('../utils/supabase')

      const { data: lastRows, error: lastErr } = await supabase.client
        .from('vendas')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
      if (lastErr) throw lastErr
      const lastId = (lastRows && lastRows[0] && lastRows[0].id) || 0
      const numeroVenda = `VD${String((lastId || 0) + 1).padStart(6, '0')}`

      let valorTotal = 0
      const itensValidados = []
      for (const item of itens) {
        const { data: produto, error: prodErr } = await supabase.client
          .from('produtos')
          .select('*')
          .eq('id', item.produto_id)
          .eq('ativo', true)
          .single()
        if (prodErr || !produto) {
          return res.status(400).json({ success: false, error: `Produto ID ${item.produto_id} não encontrado` })
        }
        if ((produto.estoque_atual || 0) < item.quantidade) {
          return res.status(400).json({ success: false, error: `Estoque insuficiente para ${produto.nome}. Disponível: ${produto.estoque_atual}` })
        }
        const precoUnitario = item.preco_unitario || produto.preco_venda || 0
        const precoTotal = precoUnitario * item.quantidade
        itensValidados.push({ produto_id: item.produto_id, quantidade: item.quantidade, preco_unitario: precoUnitario, preco_total: precoTotal, produto })
        valorTotal += precoTotal
      }

      const descontoValor = desconto || 0
      valorTotal = Math.max(valorTotal - descontoValor, 0)

      const { data: vendaRow, error: vendaErr } = await supabase.client
        .from('vendas')
        .insert([{ cliente_id: cliente_id || null, numero_venda: numeroVenda, tipo_pagamento, desconto: descontoValor, valor_total: valorTotal, observacoes: (observacoes || '').trim() || null }])
        .select()
        .single()
      if (vendaErr) throw vendaErr

      for (const item of itensValidados) {
        const { error: itemErr } = await supabase.client.from('venda_itens').insert([{ venda_id: vendaRow.id, produto_id: item.produto_id, quantidade: item.quantidade, preco_unitario: item.preco_unitario, preco_total: item.preco_total }])
        if (itemErr) throw itemErr

        const quantidadeAnterior = item.produto.estoque_atual || 0
        const quantidadeAtual = quantidadeAnterior - item.quantidade

        const { error: movErr } = await supabase.client.from('movimentacoes_estoque').insert([{ produto_id: item.produto_id, tipo: 'saida', quantidade: item.quantidade, quantidade_anterior: quantidadeAnterior, quantidade_atual: quantidadeAtual, preco_unitario: item.preco_unitario || 0, valor_total: item.preco_total || 0, motivo: 'venda', observacoes: `Venda ${numeroVenda}`, usuario: 'system', referencia_id: vendaRow.id, referencia_tipo: 'venda' }])
        if (movErr) throw movErr

        const { error: updErr } = await supabase.client.from('produtos').update({ estoque_atual: quantidadeAtual }).eq('id', item.produto_id)
        if (updErr) throw updErr

        if (quantidadeAtual <= (item.produto.estoque_minimo || 0)) {
          await supabase.client.from('alertas_estoque').delete().eq('produto_id', item.produto_id)
          const tipo = quantidadeAtual === 0 ? 'estoque_zerado' : 'estoque_baixo'
          const mensagem = quantidadeAtual === 0 ? `Produto ${item.produto.nome} está com estoque zerado após venda` : `Produto ${item.produto.nome} está com estoque baixo após venda (${quantidadeAtual} unidades)`
          await supabase.client.from('alertas_estoque').insert([{ produto_id: item.produto_id, tipo, mensagem, ativo: true }])
        }
      }

      try {
        const hoje = new Date().toISOString().split('T')[0]
        if (tipo_pagamento !== 'dinheiro') {
          await supabase.client.from('contas_receber').insert([{ descricao: `Venda ${numeroVenda}`, valor: valorTotal, cliente_id: cliente_id || null, venda_id: vendaRow.id, data_vencimento: hoje, numero_documento: numeroVenda, observacoes: observacoes || null, status: 'pendente' }])
        } else {
          await supabase.client.from('fluxo_caixa').insert([{ tipo: 'entrada', valor: valorTotal, descricao: `Venda ${numeroVenda}`, cliente_id: cliente_id || null, venda_id: vendaRow.id, forma_pagamento: tipo_pagamento, data_movimentacao: hoje, observacoes: observacoes || null, usuario: 'system' }])
        }
      } catch (finErr) {
        LoggerManager.error('Erro na integração financeira da venda:', finErr)
      }

      res.status(201).json({ success: true, message: 'Venda realizada com sucesso', data: vendaRow })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao criar venda')
    }
  }

  // Estatísticas por período com tratamento robusto (Supabase)
  async estatisticasPorPeriodo(req, res) {
    try {
      const { de = null, ate = null } = req.query
      const supabase = require('../utils/supabase')

      const dataInicio = de || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const dataFim = ate || new Date().toISOString().split('T')[0]

      let q = supabase.client
        .from('vendas')
        .select('data_venda, valor_total')
        .gte('data_venda', `${dataInicio} 00:00:00`)
        .lte('data_venda', `${dataFim} 23:59:59`)

      const { data: rows, error } = await q
      if (error) throw error

      const byDay = {}
      for (const r of rows || []) {
        const dia = (r.data_venda || '').slice(0, 10)
        if (!byDay[dia]) byDay[dia] = { dia, qtd_vendas: 0, total: 0 }
        byDay[dia].qtd_vendas += 1
        byDay[dia].total += Number(r.valor_total || 0)
      }
      const data = Object.values(byDay).sort((a, b) => a.dia.localeCompare(b.dia))

      res.json({ success: true, data, periodo: { de: dataInicio, ate: dataFim } })
    } catch (error) {
      LoggerManager.error('Erro ao buscar estatísticas por período:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
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
