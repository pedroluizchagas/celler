const db = require('../utils/database-adapter')
const { LoggerManager } = require('../utils/logger')

class ProdutoController {
  // Listar todos os produtos
  async index(req, res) {
    try {
      const { categoria, tipo, estoque_baixo, ativo = '1' } = req.query

      let sql = `
        SELECT 
          p.*,
          c.nome as categoria_nome,
          f.nome as fornecedor_nome,
          CASE 
            WHEN p.estoque_atual <= p.estoque_minimo THEN 1
            ELSE 0
          END as estoque_baixo_flag
        FROM produtos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
        WHERE p.ativo = ?
      `
      const params = [ativo === '1' ? 1 : 0]

      if (categoria) {
        sql += ' AND p.categoria_id = ?'
        params.push(categoria)
      }

      if (tipo && ['peca', 'acessorio'].includes(tipo)) {
        sql += ' AND p.tipo = ?'
        params.push(tipo)
      }

      if (estoque_baixo === '1') {
        sql += ' AND p.estoque_atual <= p.estoque_minimo'
      }

      sql += ' ORDER BY p.nome ASC'

      const produtos = await db.all(sql, params)

      // Buscar alertas ativos para cada produto
      const alertas = await db.all(`
        SELECT produto_id, COUNT(*) as total_alertas
        FROM alertas_estoque 
        WHERE ativo = 1 
        GROUP BY produto_id
      `)

      const alertasMap = {}
      alertas.forEach((alerta) => {
        alertasMap[alerta.produto_id] = alerta.total_alertas
      })

      const produtosComAlertas = produtos.map((produto) => ({
        ...produto,
        alertas_ativas: alertasMap[produto.id] || 0,
      }))

      res.json({
        success: true,
        data: produtosComAlertas,
        total: produtosComAlertas.length,
      })
    } catch (error) {
      LoggerManager.error('Erro ao listar produtos:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Buscar produto por ID
  async show(req, res) {
    try {
      const { id } = req.params

      const produto = await db.get(
        `
        SELECT 
          p.*,
          c.nome as categoria_nome,
          f.nome as fornecedor_nome,
          f.telefone as fornecedor_telefone
        FROM produtos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
        WHERE p.id = ?
      `,
        [id]
      )

      if (!produto) {
        return res.status(404).json({
          success: false,
          error: 'Produto não encontrado',
        })
      }

      // Buscar histórico de movimentações
      const movimentacoes = await db.all(
        `
        SELECT 
          tipo, quantidade, quantidade_anterior, quantidade_atual,
          preco_unitario, valor_total, motivo, observacoes,
          data_movimentacao, usuario, referencia_tipo, referencia_id
        FROM movimentacoes_estoque 
        WHERE produto_id = ?
        ORDER BY data_movimentacao DESC
        LIMIT 50
      `,
        [id]
      )

      // Buscar alertas ativos
      const alertas = await db.all(
        `
        SELECT tipo, data_alerta 
        FROM alertas_estoque 
        WHERE produto_id = ? AND ativo = 1
        ORDER BY data_alerta DESC
      `,
        [id]
      )

      res.json({
        success: true,
        data: {
          ...produto,
          movimentacoes,
          alertas,
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao buscar produto:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Criar novo produto
  async store(req, res) {
    try {
      console.log('🔄 Criando novo produto...')
      console.log('📋 Dados recebidos:', JSON.stringify(req.body, null, 2))

      const {
        nome,
        descricao,
        codigo_barras,
        codigo_interno,
        categoria_id,
        fornecedor_id,
        tipo,
        preco_custo,
        preco_venda,
        margem_lucro,
        estoque_atual,
        estoque_minimo,
        estoque_maximo,
        localizacao,
        observacoes,
      } = req.body

      // Validações básicas
      if (!nome || nome.trim() === '') {
        console.log('❌ Validação falhou: Nome é obrigatório')
        return res.status(400).json({
          success: false,
          error: 'Nome do produto é obrigatório',
        })
      }

      // Validar categoria_id se fornecido
      if (categoria_id && categoria_id !== '' && !isNaN(parseInt(categoria_id))) {
        try {
          const categoriaExiste = await db.get('SELECT id FROM categorias WHERE id = ?', [parseInt(categoria_id)])
          if (!categoriaExiste) {
            console.log('❌ Categoria não encontrada:', categoria_id)
            return res.status(400).json({
              success: false,
              error: 'Categoria não encontrada',
            })
          }
        } catch (categoriaError) {
          console.log('⚠️ Erro ao verificar categoria, continuando sem categoria:', categoriaError.message)
          // Continuar sem categoria em caso de erro
        }
      }

      // Verificar códigos únicos (apenas se não estiverem vazios)
      if (codigo_barras && codigo_barras.trim()) {
        const existeCodigoBarras = await db.get(
          'SELECT id FROM produtos WHERE codigo_barras = ? AND codigo_barras != ""',
          [codigo_barras.trim()]
        )
        if (existeCodigoBarras) {
          return res.status(400).json({
            success: false,
            error: 'Código de barras já existe',
          })
        }
      }

      if (codigo_interno && codigo_interno.trim()) {
        const existeCodigoInterno = await db.get(
          'SELECT id FROM produtos WHERE codigo_interno = ? AND codigo_interno != ""',
          [codigo_interno.trim()]
        )
        if (existeCodigoInterno) {
          return res.status(400).json({
            success: false,
            error: 'Código interno já existe',
          })
        }
      }

      console.log('💾 Inserindo produto na base de dados...')
      const resultado = await db.run(
        `
        INSERT INTO produtos (
          nome, descricao, codigo_barras, codigo_interno,
          categoria_id, tipo, preco_custo, preco_venda,
          margem_lucro, estoque_atual, estoque_minimo, estoque_maximo,
          localizacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          nome.trim(),
          descricao?.trim() || null,
          codigo_barras?.trim() || null,
          codigo_interno?.trim() || null,
          categoria_id || null,
          tipo || 'peca',
          preco_custo || 0,
          preco_venda || 0,
          margem_lucro || 0,
          estoque_atual || 0,
          estoque_minimo || 5,
          estoque_maximo || 100,
          localizacao?.trim() || null,
        ]
      )
      console.log('✅ Produto inserido com ID:', resultado.id)

      // Se há estoque inicial, criar movimentação
      if (estoque_atual > 0) {
        await db.run(
          `
          INSERT INTO movimentacoes_estoque (
            produto_id, tipo, quantidade, quantidade_anterior, quantidade_atual,
            preco_unitario, valor_total, motivo, observacoes, usuario
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            resultado.id,
            'entrada',
            estoque_atual,
            0,
            estoque_atual,
            preco_custo || 0,
            (preco_custo || 0) * estoque_atual,
            'estoque_inicial',
            'Estoque inicial do produto',
            'system',
          ]
        )

        // Integração financeira para estoque inicial
        if (preco_custo && preco_custo > 0) {
          try {
            const valorTotal = preco_custo * estoque_atual

            // Buscar categoria de "Compra de Estoque"
            const categoriaCompra = await db.get(
              'SELECT id FROM categorias_financeiras WHERE nome = ? AND tipo = ?',
              ['Compra de Estoque', 'despesa']
            )

            // Criar conta a pagar para o estoque inicial
            await db.run(
              `
              INSERT INTO contas_pagar (
                descricao, valor, categoria_id, fornecedor, data_vencimento,
                numero_documento, observacoes, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
              [
                `Estoque inicial - ${nome.trim()} (${estoque_atual} unidades)`,
                valorTotal,
                categoriaCompra?.id || null,
                'Fornecedor de Estoque',
                new Date().toISOString().split('T')[0],
                `EST-INICIAL-${Date.now()}`,
                `Estoque inicial do produto ${nome.trim()}`,
                'pendente',
              ]
            )

            LoggerManager.info(
              'Integração financeira do estoque inicial criada',
              {
                produtoId: resultado.id,
                valorTotal,
                quantidade: estoque_atual,
              }
            )
          } catch (error) {
            LoggerManager.error(
              'Erro na integração financeira do estoque inicial:',
              error
            )
            // Não falha a criação do produto por erro na integração financeira
          }
        }
      }

      // Verificar se precisa criar alerta
      const produto = await db.get('SELECT * FROM produtos WHERE id = ?', [
        resultado.id,
      ])
      if (produto && produto.estoque_atual <= produto.estoque_minimo) {
        const tipo =
          produto.estoque_atual === 0 ? 'estoque_zero' : 'estoque_baixo'
        await db.run(
          'INSERT INTO alertas_estoque (produto_id, tipo) VALUES (?, ?)',
          [resultado.id, tipo]
        )
      }

      const novoProduto = await db.get('SELECT * FROM produtos WHERE id = ?', [
        resultado.id,
      ])

      LoggerManager.audit('PRODUTO_CRIADO', 'system', {
        produtoId: resultado.id,
        nome: nome,
      })

      res.status(201).json({
        success: true,
        message: 'Produto cadastrado com sucesso',
        data: novoProduto,
      })
    } catch (error) {
      console.error('❌ Erro ao criar produto:', error)
      console.error('📋 Dados que causaram erro:', JSON.stringify(req.body, null, 2))
      console.error('🔍 Stack trace:', error.stack)
      
      LoggerManager.error('Erro ao criar produto:', error)
      LoggerManager.error('Stack trace:', error.stack)
      LoggerManager.error('Dados que causaram erro:', req.body)
      
      // Verificar se é erro de constraint/validação
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({
          success: false,
          error: 'Dados duplicados detectados',
          details: 'Código de barras ou código interno já existe',
        })
      }
      
      if (error.message && error.message.includes('NOT NULL constraint failed')) {
        return res.status(400).json({
          success: false,
          error: 'Dados obrigatórios não fornecidos',
          details: error.message,
        })
      }
      
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Erro ao processar dados do produto',
      })
    }
  }

  // Atualizar produto
  async update(req, res) {
    try {
      const { id } = req.params
      const {
        nome,
        descricao,
        codigo_barras,
        codigo_interno,
        categoria_id,
        fornecedor_id,
        tipo,
        preco_custo,
        preco_venda,
        margem_lucro,
        estoque_minimo,
        estoque_maximo,
        localizacao,
        observacoes,
        ativo,
      } = req.body

      const produtoExistente = await db.get(
        'SELECT * FROM produtos WHERE id = ?',
        [id]
      )
      if (!produtoExistente) {
        return res.status(404).json({
          success: false,
          error: 'Produto não encontrado',
        })
      }

      // Verificar códigos únicos (exceto o próprio produto)
      if (codigo_barras && codigo_barras !== produtoExistente.codigo_barras) {
        const existeCodigoBarras = await db.get(
          'SELECT id FROM produtos WHERE codigo_barras = ? AND id != ?',
          [codigo_barras, id]
        )
        if (existeCodigoBarras) {
          return res.status(400).json({
            success: false,
            error: 'Código de barras já existe',
          })
        }
      }

      if (
        codigo_interno &&
        codigo_interno !== produtoExistente.codigo_interno
      ) {
        const existeCodigoInterno = await db.get(
          'SELECT id FROM produtos WHERE codigo_interno = ? AND id != ?',
          [codigo_interno, id]
        )
        if (existeCodigoInterno) {
          return res.status(400).json({
            success: false,
            error: 'Código interno já existe',
          })
        }
      }

      await db.run(
        `
        UPDATE produtos SET
          nome = ?, descricao = ?, codigo_barras = ?, codigo_interno = ?,
          categoria_id = ?, fornecedor_id = ?, tipo = ?, preco_custo = ?,
          preco_venda = ?, margem_lucro = ?, estoque_minimo = ?,
          estoque_maximo = ?, localizacao = ?, observacoes = ?, ativo = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [
          nome.trim(),
          descricao?.trim(),
          codigo_barras?.trim(),
          codigo_interno?.trim(),
          categoria_id || null,
          fornecedor_id || null,
          tipo || 'peca',
          preco_custo || 0,
          preco_venda || 0,
          margem_lucro || 0,
          estoque_minimo || 5,
          estoque_maximo || 100,
          localizacao?.trim(),
          observacoes?.trim(),
          ativo ? 1 : 0,
          id,
        ]
      )

      // Verificar alertas após atualização
      const produtoVerificacao = await db.get(
        'SELECT * FROM produtos WHERE id = ?',
        [id]
      )
      if (produtoVerificacao) {
        // Remover alertas antigos
        await db.run('DELETE FROM alertas_estoque WHERE produto_id = ?', [id])

        // Verificar estoque baixo
        if (
          produtoVerificacao.estoque_atual <= produtoVerificacao.estoque_minimo
        ) {
          const tipoAlerta =
            produtoVerificacao.estoque_atual === 0
              ? 'estoque_zero'
              : 'estoque_baixo'
          await db.run(
            'INSERT INTO alertas_estoque (produto_id, tipo) VALUES (?, ?)',
            [id, tipoAlerta]
          )
        }

        // Verificar estoque alto (opcional)
        if (
          produtoVerificacao.estoque_atual >= produtoVerificacao.estoque_maximo
        ) {
          await db.run(
            'INSERT INTO alertas_estoque (produto_id, tipo) VALUES (?, ?)',
            [id, 'estoque_alto']
          )
        }
      }

      const produtoAtualizado = await db.get(
        'SELECT * FROM produtos WHERE id = ?',
        [id]
      )

      LoggerManager.audit('PRODUTO_ATUALIZADO', 'system', {
        produtoId: id,
        nome: nome,
      })

      res.json({
        success: true,
        message: 'Produto atualizado com sucesso',
        data: produtoAtualizado,
      })
    } catch (error) {
      LoggerManager.error('Erro ao atualizar produto:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Buscar produto por código
  async buscarPorCodigo(req, res) {
    try {
      const { codigo } = req.params

      const produto = await db.get(
        `
        SELECT 
          p.*,
          c.nome as categoria_nome,
          f.nome as fornecedor_nome
        FROM produtos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
        WHERE (p.codigo_barras = ? OR p.codigo_interno = ?) AND p.ativo = 1
      `,
        [codigo, codigo]
      )

      if (!produto) {
        return res.status(404).json({
          success: false,
          error: 'Produto não encontrado',
        })
      }

      res.json({
        success: true,
        data: produto,
      })
    } catch (error) {
      LoggerManager.error('Erro ao buscar produto por código:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Movimentar estoque
  async movimentarEstoque(req, res) {
    try {
      const { id } = req.params
      const {
        tipo,
        quantidade,
        motivo,
        observacoes,
        preco_unitario,
        referencia_id,
        referencia_tipo,
      } = req.body

      if (!['entrada', 'saida', 'ajuste', 'perda'].includes(tipo)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de movimentação inválido',
        })
      }

      const produto = await db.get('SELECT * FROM produtos WHERE id = ?', [id])
      if (!produto) {
        return res.status(404).json({
          success: false,
          error: 'Produto não encontrado',
        })
      }

      const quantidadeInt = parseInt(quantidade)
      if (quantidadeInt <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantidade deve ser maior que zero',
        })
      }

      let novaQuantidade = produto.estoque_atual

      if (tipo === 'entrada' || tipo === 'ajuste') {
        novaQuantidade += quantidadeInt
      } else if (tipo === 'saida' || tipo === 'perda') {
        novaQuantidade -= quantidadeInt
        if (novaQuantidade < 0) {
          return res.status(400).json({
            success: false,
            error: 'Estoque insuficiente',
          })
        }
      }

      // Criar movimentação
      await db.run(
        `
        INSERT INTO movimentacoes_estoque (
          produto_id, tipo, quantidade, quantidade_anterior, quantidade_atual,
          preco_unitario, valor_total, motivo, observacoes, usuario,
          referencia_id, referencia_tipo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          id,
          tipo,
          quantidadeInt,
          produto.estoque_atual,
          novaQuantidade,
          preco_unitario || produto.preco_custo || 0,
          (preco_unitario || produto.preco_custo || 0) * quantidadeInt,
          motivo,
          observacoes,
          'system',
          referencia_id,
          referencia_tipo,
        ]
      )

      // Atualizar estoque do produto
      await db.run(
        'UPDATE produtos SET estoque_atual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [novaQuantidade, id]
      )

      // Verificar alertas
      const produtoAtualizado = await db.get(
        'SELECT * FROM produtos WHERE id = ?',
        [id]
      )
      if (produtoAtualizado) {
        // Remover alertas antigos
        await db.run('DELETE FROM alertas_estoque WHERE produto_id = ?', [id])

        // Verificar estoque baixo
        if (
          produtoAtualizado.estoque_atual <= produtoAtualizado.estoque_minimo
        ) {
          const tipoAlerta =
            produtoAtualizado.estoque_atual === 0
              ? 'estoque_zero'
              : 'estoque_baixo'
          await db.run(
            'INSERT INTO alertas_estoque (produto_id, tipo) VALUES (?, ?)',
            [id, tipoAlerta]
          )
        }

        // Verificar estoque alto (opcional)
        if (
          produtoAtualizado.estoque_atual >= produtoAtualizado.estoque_maximo
        ) {
          await db.run(
            'INSERT INTO alertas_estoque (produto_id, tipo) VALUES (?, ?)',
            [id, 'estoque_alto']
          )
        }
      }

      // Integração com módulo financeiro para compras de estoque
      if (
        tipo === 'entrada' &&
        motivo === 'compra' &&
        preco_unitario &&
        preco_unitario > 0
      ) {
        try {
          const valorTotal =
            (preco_unitario || produto.preco_custo) * quantidadeInt

          // Buscar categoria de "Compra de Estoque"
          const categoriaCompra = await db.get(
            'SELECT id FROM categorias_financeiras WHERE nome = ? AND tipo = ?',
            ['Compra de Estoque', 'despesa']
          )

          // Criar conta a pagar para a compra de estoque
          await db.run(
            `
            INSERT INTO contas_pagar (
              descricao, valor, categoria_id, fornecedor, data_vencimento,
              numero_documento, observacoes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              `Compra de ${produto.nome} (${quantidadeInt} unidades)`,
              valorTotal,
              categoriaCompra?.id || null,
              'Fornecedor de Estoque',
              new Date().toISOString().split('T')[0], // Vencimento hoje
              `EST-${Date.now()}`,
              `Compra de estoque - ${observacoes || ''}`.trim(),
              'pendente',
            ]
          )

          LoggerManager.info('Integração financeira da compra criada', {
            produtoId: id,
            valorTotal,
            quantidade: quantidadeInt,
          })
        } catch (error) {
          LoggerManager.error('Erro na integração financeira da compra:', error)
          // Não falha a movimentação por erro na integração financeira
        }
      }

      LoggerManager.audit('ESTOQUE_MOVIMENTADO', 'system', {
        produtoId: id,
        tipo,
        quantidade: quantidadeInt,
        estoqueAnterior: produto.estoque_atual,
        estoqueAtual: novaQuantidade,
      })

      res.json({
        success: true,
        message: `Estoque ${
          tipo === 'entrada' ? 'adicionado' : 'removido'
        } com sucesso`,
        data: {
          produto_id: id,
          estoque_anterior: produto.estoque_atual,
          estoque_atual: novaQuantidade,
          quantidade_movimentada: quantidadeInt,
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao movimentar estoque:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Obter alertas de estoque
  async alertas(req, res) {
    try {
      const alertas = await db.all(`
        SELECT 
          a.*,
          p.nome as produto_nome,
          p.estoque_atual,
          p.estoque_minimo,
          c.nome as categoria_nome
        FROM alertas_estoque a
        JOIN produtos p ON a.produto_id = p.id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE a.ativo = 1
        ORDER BY a.data_alerta DESC
      `)

      res.json({
        success: true,
        data: alertas || [],
        total: (alertas && alertas.length) || 0,
      })
    } catch (error) {
      LoggerManager.error('Erro ao buscar alertas:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Resolver alerta
  async resolverAlerta(req, res) {
    try {
      const { id } = req.params

      await db.run(
        `
        UPDATE alertas_estoque 
        SET ativo = 0, data_resolvido = CURRENT_TIMESTAMP 
        WHERE id = ?
      `,
        [id]
      )

      res.json({
        success: true,
        message: 'Alerta resolvido com sucesso',
      })
    } catch (error) {
      LoggerManager.error('Erro ao resolver alerta:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Métodos auxiliares
  async criarMovimentacao(dados) {
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

    // Verificar estoque alto (opcional)
    if (produto.estoque_atual >= produto.estoque_maximo) {
      await db.run(
        `
        INSERT INTO alertas_estoque (produto_id, tipo)
        VALUES (?, 'estoque_alto')
      `,
        [produtoId]
      )
    }
  }

  // Estatísticas do estoque
  async stats(req, res) {
    try {
      // Total de produtos
      const totalProdutos = await db.get(`
        SELECT COUNT(*) as total 
        FROM produtos 
        WHERE ativo = 1
      `)

      // Produtos disponíveis (estoque > mínimo)
      const disponivel = await db.get(`
        SELECT COUNT(*) as total 
        FROM produtos 
        WHERE ativo = 1 AND estoque_atual > estoque_minimo
      `)

      // Produtos com estoque baixo (estoque > 0 e <= mínimo)
      const estoqueBaixo = await db.get(`
        SELECT COUNT(*) as total 
        FROM produtos 
        WHERE ativo = 1 
        AND estoque_atual > 0 
        AND estoque_atual <= estoque_minimo
      `)

      // Produtos sem estoque (estoque = 0)
      const semEstoque = await db.get(`
        SELECT COUNT(*) as total 
        FROM produtos 
        WHERE ativo = 1 AND estoque_atual = 0
      `)

      // Valor total do estoque
      const valorEstoque = await db.get(`
        SELECT 
          SUM(estoque_atual * preco_custo) as valor_custo,
          SUM(estoque_atual * preco_venda) as valor_venda
        FROM produtos 
        WHERE ativo = 1
      `)

      // Movimentações do mês atual
      const movimentacoesMes = await db.get(`
        SELECT 
          COUNT(*) as total_movimentacoes,
          SUM(CASE WHEN tipo = 'entrada' THEN quantidade ELSE 0 END) as entradas,
          SUM(CASE WHEN tipo = 'saida' THEN quantidade ELSE 0 END) as saidas
        FROM movimentacoes_estoque 
        WHERE date(data_movimentacao) >= date('now', 'start of month')
      `)

      // Produtos mais vendidos (por saídas)
      const maisVendidos = await db.all(`
        SELECT 
          p.nome,
          p.codigo_interno,
          SUM(m.quantidade) as total_vendas
        FROM produtos p
        JOIN movimentacoes_estoque m ON p.id = m.produto_id
        WHERE m.tipo = 'saida' 
        AND m.motivo IN ('venda_direta', 'ordem_servico')
        AND date(m.data_movimentacao) >= date('now', '-30 days')
        GROUP BY p.id
        ORDER BY total_vendas DESC
        LIMIT 5
      `)

      const estatisticas = {
        resumo: {
          total_produtos: totalProdutos.total || 0,
          disponivel: disponivel.total || 0,
          estoque_baixo: estoqueBaixo.total || 0,
          sem_estoque: semEstoque.total || 0,
        },
        financeiro: {
          valor_custo: (valorEstoque && valorEstoque.valor_custo) || 0,
          valor_venda: (valorEstoque && valorEstoque.valor_venda) || 0,
          margem_potencial:
            ((valorEstoque && valorEstoque.valor_venda) || 0) - ((valorEstoque && valorEstoque.valor_custo) || 0),
        },
        movimentacoes: {
          total_mes: (movimentacoesMes && movimentacoesMes.total_movimentacoes) || 0,
          entradas_mes: (movimentacoesMes && movimentacoesMes.entradas) || 0,
          saidas_mes: (movimentacoesMes && movimentacoesMes.saidas) || 0,
        },
        mais_vendidos: maisVendidos,
      }

      LoggerManager.info('Estatísticas do estoque consultadas')

      res.json({
        success: true,
        data: estatisticas,
      })
    } catch (error) {
      LoggerManager.error('Erro ao buscar estatísticas:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }
}

module.exports = new ProdutoController()
