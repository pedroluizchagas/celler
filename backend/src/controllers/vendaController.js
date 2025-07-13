const db = require('../utils/database')
const { LoggerManager } = require('../utils/logger')

class VendaController {
  // Listar todas as vendas
  async index(req, res) {
    try {
      const { data_inicio, data_fim, cliente_id } = req.query
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const offset = (page - 1) * limit

      let sql = `
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
      const params = []

      if (data_inicio) {
        sql += ' AND DATE(v.data_venda) >= ?'
        params.push(data_inicio)
      }

      if (data_fim) {
        sql += ' AND DATE(v.data_venda) <= ?'
        params.push(data_fim)
      }

      if (cliente_id) {
        sql += ' AND v.cliente_id = ?'
        params.push(cliente_id)
      }

      sql += ' GROUP BY v.id ORDER BY v.data_venda DESC LIMIT ? OFFSET ?'
      params.push(limit, offset)

      const vendas = await db.all(sql, params)

      // Contar total para paginação
      let countSql = 'SELECT COUNT(*) as total FROM vendas v WHERE 1=1'
      const countParams = []

      if (data_inicio) {
        countSql += ' AND DATE(v.data_venda) >= ?'
        countParams.push(data_inicio)
      }

      if (data_fim) {
        countSql += ' AND DATE(v.data_venda) <= ?'
        countParams.push(data_fim)
      }

      if (cliente_id) {
        countSql += ' AND v.cliente_id = ?'
        countParams.push(cliente_id)
      }

      const { total } = await db.get(countSql, countParams)

      res.json({
        success: true,
        data: vendas,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao listar vendas:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
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
      LoggerManager.error('Erro ao buscar venda:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
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
                ? 'estoque_zero'
                : 'estoque_baixo'
            await db.run(
              `INSERT INTO alertas_estoque (produto_id, tipo) VALUES (?, ?)`,
              [item.produto_id, tipo]
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
      LoggerManager.error('Erro ao criar venda:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Estatísticas do PDV/Dashboard
  async estatisticas(req, res) {
    try {
      const hoje = new Date().toISOString().split('T')[0]
      const inicioMes = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      )
        .toISOString()
        .split('T')[0]

      // Vendas de hoje
      const vendasHoje = await db.get(
        `
        SELECT 
          COUNT(*) as total_vendas,
          COALESCE(SUM(valor_total), 0) as faturamento_hoje,
          COALESCE(AVG(valor_total), 0) as ticket_medio_hoje
        FROM vendas 
        WHERE DATE(data_venda) = ?
      `,
        [hoje]
      )

      // Vendas do mês
      const vendasMes = await db.get(
        `
        SELECT 
          COUNT(*) as total_vendas_mes,
          COALESCE(SUM(valor_total), 0) as faturamento_mes,
          COALESCE(AVG(valor_total), 0) as ticket_medio_mes
        FROM vendas 
        WHERE DATE(data_venda) >= ?
      `,
        [inicioMes]
      )

      // Métodos de pagamento mais utilizados
      const metodosPopulares = await db.all(
        `
        SELECT 
          tipo_pagamento,
          COUNT(*) as quantidade,
          SUM(valor_total) as valor_total
        FROM vendas 
        WHERE DATE(data_venda) >= ?
        GROUP BY tipo_pagamento 
        ORDER BY quantidade DESC
      `,
        [inicioMes]
      )

      // Produtos mais vendidos hoje
      const produtosPopularesHoje = await db.all(
        `
        SELECT 
          p.nome,
          p.tipo,
          SUM(vi.quantidade) as quantidade_vendida,
          SUM(vi.preco_total) as valor_total
        FROM venda_itens vi
        JOIN produtos p ON vi.produto_id = p.id
        JOIN vendas v ON vi.venda_id = v.id
        WHERE DATE(v.data_venda) = ?
        GROUP BY p.id
        ORDER BY quantidade_vendida DESC
        LIMIT 5
      `,
        [hoje]
      )

      res.json({
        success: true,
        data: {
          hoje: vendasHoje,
          mes: vendasMes,
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

  // Relatório de vendas
  async relatorio(req, res) {
    try {
      const { data_inicio, data_fim, tipo_pagamento } = req.query

      let sql = `
        SELECT 
          DATE(v.data_venda) as data,
          COUNT(v.id) as total_vendas,
          SUM(v.valor_total) as valor_total,
          AVG(v.valor_total) as ticket_medio
        FROM vendas v
        WHERE 1=1
      `
      const params = []

      if (data_inicio) {
        sql += ' AND DATE(v.data_venda) >= ?'
        params.push(data_inicio)
      }

      if (data_fim) {
        sql += ' AND DATE(v.data_venda) <= ?'
        params.push(data_fim)
      }

      if (tipo_pagamento) {
        sql += ' AND v.tipo_pagamento = ?'
        params.push(tipo_pagamento)
      }

      sql += ' GROUP BY DATE(v.data_venda) ORDER BY data DESC'

      const vendas = await db.all(sql, params)

      // Produtos mais vendidos
      let sqlProdutos = `
        SELECT 
          p.nome,
          p.tipo,
          SUM(vi.quantidade) as quantidade_vendida,
          SUM(vi.preco_total) as valor_total_produto
        FROM venda_itens vi
        JOIN produtos p ON vi.produto_id = p.id
        JOIN vendas v ON vi.venda_id = v.id
        WHERE 1=1
      `
      const paramsProdutos = []

      if (data_inicio) {
        sqlProdutos += ' AND DATE(v.data_venda) >= ?'
        paramsProdutos.push(data_inicio)
      }

      if (data_fim) {
        sqlProdutos += ' AND DATE(v.data_venda) <= ?'
        paramsProdutos.push(data_fim)
      }

      sqlProdutos += ' GROUP BY p.id ORDER BY quantidade_vendida DESC LIMIT 10'

      const produtosMaisVendidos = await db.all(sqlProdutos, paramsProdutos)

      // Resumo geral
      let sqlResumo = `
        SELECT 
          COUNT(v.id) as total_vendas,
          SUM(v.valor_total) as faturamento_total,
          AVG(v.valor_total) as ticket_medio,
          SUM(v.desconto) as total_descontos
        FROM vendas v
        WHERE 1=1
      `
      const paramsResumo = []

      if (data_inicio) {
        sqlResumo += ' AND DATE(v.data_venda) >= ?'
        paramsResumo.push(data_inicio)
      }

      if (data_fim) {
        sqlResumo += ' AND DATE(v.data_venda) <= ?'
        paramsResumo.push(data_fim)
      }

      const resumo = await db.get(sqlResumo, paramsResumo)

      res.json({
        success: true,
        data: {
          vendas_por_dia: vendas,
          produtos_mais_vendidos: produtosMaisVendidos,
          resumo: resumo,
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao gerar relatório de vendas:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
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
        produto.estoque_atual === 0 ? 'estoque_zero' : 'estoque_baixo'
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
      LoggerManager.error('Erro na migração de vendas para financeiro:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }
}

module.exports = new VendaController()
