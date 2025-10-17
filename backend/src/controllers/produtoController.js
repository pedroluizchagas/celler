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
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao listar produtos')
    }
  }

  // Buscar produto por ID (compatível com Supabase, sem SQL cru)
  async show(req, res) {
    try {
      const { id } = req.params
      const supabase = require('../utils/supabase')

      // Produto base
      const { data: produtos, error: prodErr } = await supabase.client
        .from('produtos')
        .select('*')
        .eq('id', parseInt(id))
        .limit(1)

      if (prodErr) throw prodErr
      const produto = (produtos || [])[0]

      if (!produto) {
        return res.status(404).json({ success: false, error: 'Produto não encontrado' })
      }

      // Enriquecer com categoria/fornecedor, se disponíveis
      let categoria_nome = null
      let fornecedor_nome = null
      let fornecedor_telefone = null

      if (produto.categoria_id) {
        const { data: catRows } = await supabase.client
          .from('categorias')
          .select('nome')
          .eq('id', produto.categoria_id)
          .limit(1)
        categoria_nome = (catRows && catRows[0] && catRows[0].nome) || null
      }

      if (produto.fornecedor_id) {
        const { data: fornRows } = await supabase.client
          .from('fornecedores')
          .select('nome, telefone')
          .eq('id', produto.fornecedor_id)
          .limit(1)
        fornecedor_nome = (fornRows && fornRows[0] && fornRows[0].nome) || null
        fornecedor_telefone = (fornRows && fornRows[0] && fornRows[0].telefone) || null
      }

      // Histórico de movimentações (limite 50)
      const { data: movimentacoesRows, error: movErr } = await supabase.client
        .from('movimentacoes_estoque')
        .select('tipo, quantidade, quantidade_anterior, quantidade_atual, preco_unitario, valor_total, motivo, observacoes, data_movimentacao, usuario, referencia_tipo, referencia_id')
        .eq('produto_id', parseInt(id))
        .order('data_movimentacao', { ascending: false })
        .limit(50)
      if (movErr) throw movErr

      // Alertas ativos
      const { data: alertasRows, error: alertasErr } = await supabase.client
        .from('alertas_estoque')
        .select('tipo, data_alerta')
        .eq('produto_id', parseInt(id))
        .eq('ativo', true)
        .order('data_alerta', { ascending: false })
      if (alertasErr) throw alertasErr

      res.json({
        success: true,
        data: {
          ...produto,
          categoria_nome,
          fornecedor_nome,
          fornecedor_telefone,
          movimentacoes: movimentacoesRows || [],
          alertas: alertasRows || [],
        },
      })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao buscar produto')
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
          produto.estoque_atual === 0 ? 'estoque_zerado' : 'estoque_baixo'
        const mensagem = 
          produto.estoque_atual === 0 
            ? `Produto ${produto.nome} está com estoque zerado`
            : `Produto ${produto.nome} está com estoque baixo (${produto.estoque_atual} unidades)`
        await db.run(
          'INSERT INTO alertas_estoque (produto_id, tipo, mensagem) VALUES (?, ?, ?)',
          [resultado.id, tipo, mensagem]
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
              ? 'estoque_zerado'
              : 'estoque_baixo'
          const mensagemAlerta = 
            produtoVerificacao.estoque_atual === 0 
              ? `Produto ${produtoVerificacao.nome} está com estoque zerado`
              : `Produto ${produtoVerificacao.nome} está com estoque baixo (${produtoVerificacao.estoque_atual} unidades)`
          await db.run(
            'INSERT INTO alertas_estoque (produto_id, tipo, mensagem) VALUES (?, ?, ?)',
            [id, tipoAlerta, mensagemAlerta]
          )
        }

        // Verificar estoque alto (opcional)
        if (
          produtoVerificacao.estoque_atual >= produtoVerificacao.estoque_maximo
        ) {
          const mensagemEstoqueAlto = `Produto ${produtoVerificacao.nome} está com estoque alto (${produtoVerificacao.estoque_atual} unidades)`
          await db.run(
            'INSERT INTO alertas_estoque (produto_id, tipo, mensagem) VALUES (?, ?, ?)',
            [id, 'estoque_alto', mensagemEstoqueAlto]
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
              ? 'estoque_zerado'
              : 'estoque_baixo'
          const mensagemAlerta = 
            produtoAtualizado.estoque_atual === 0 
              ? `Produto ${produtoAtualizado.nome} está com estoque zerado`
              : `Produto ${produtoAtualizado.nome} está com estoque baixo (${produtoAtualizado.estoque_atual} unidades)`
          await db.run(
            'INSERT INTO alertas_estoque (produto_id, tipo, mensagem) VALUES (?, ?, ?)',
            [id, tipoAlerta, mensagemAlerta]
          )
        }

        // Verificar estoque alto (opcional)
        if (
          produtoAtualizado.estoque_atual >= produtoAtualizado.estoque_maximo
        ) {
          const mensagemEstoqueAlto = `Produto ${produtoAtualizado.nome} está com estoque alto (${produtoAtualizado.estoque_atual} unidades)`
          await db.run(
            'INSERT INTO alertas_estoque (produto_id, tipo, mensagem) VALUES (?, ?, ?)',
            [id, 'estoque_alto', mensagemEstoqueAlto]
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
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao movimentar estoque')
    }
  }

  // Obter alertas de estoque (compatível com Supabase)
  async alertas(req, res) {
    try {
      const supabase = require('../utils/supabase')

      // Buscar alertas ativos
      const { data: alertasRows, error: alertasErr } = await supabase.client
        .from('alertas_estoque')
        .select('id, produto_id, tipo, mensagem, data_alerta, ativo')
        .eq('ativo', true)
        .order('data_alerta', { ascending: false })

      if (alertasErr) throw alertasErr

      const produtoIds = Array.from(new Set((alertasRows || []).map(a => a.produto_id).filter(Boolean)))
      let produtosMap = {}
      let categoriasMap = {}

      if (produtoIds.length > 0) {
        const { data: produtosRows, error: prodErr } = await supabase.client
          .from('produtos')
          .select('id, nome, estoque_atual, estoque_minimo, categoria_id')
          .in('id', produtoIds)
        if (prodErr) throw prodErr
        produtosMap = Object.fromEntries((produtosRows || []).map(p => [p.id, p]))

        const categoriaIds = Array.from(new Set((produtosRows || []).map(p => p.categoria_id).filter(Boolean)))
        if (categoriaIds.length > 0) {
          const { data: categoriasRows, error: catErr } = await supabase.client
            .from('categorias')
            .select('id, nome')
            .in('id', categoriaIds)
          if (catErr) throw catErr
          categoriasMap = Object.fromEntries((categoriasRows || []).map(c => [c.id, c.nome]))
        }
      }

      const alertas = (alertasRows || []).map(a => {
        const p = produtosMap[a.produto_id] || {}
        const categoriaNome = p.categoria_id ? (categoriasMap[p.categoria_id] || null) : null
        return {
          id: a.id,
          produto_id: a.produto_id,
          tipo: a.tipo,
          mensagem: a.mensagem,
          data_alerta: a.data_alerta,
          ativo: a.ativo,
          produto_nome: p.nome || null,
          estoque_atual: p.estoque_atual || 0,
          estoque_minimo: p.estoque_minimo || 0,
          categoria_nome: categoriaNome,
        }
      })

      res.json({
        success: true,
        data: alertas,
        total: alertas.length,
      })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao buscar alertas')
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
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao resolver alerta')
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
          produto.estoque_atual === 0 ? 'estoque_zerado' : 'estoque_baixo'
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
      // Usar queries simples compatíveis com Supabase
      let produtos = []
      let movimentacoes = []

      try {
        // Buscar produtos usando query simples
        produtos = await db.all('SELECT * FROM produtos')
        produtos = produtos.filter(p => p.ativo === 1 || p.ativo === true)
      } catch (prodError) {
        LoggerManager.warn('Erro ao buscar produtos:', prodError.message)
        produtos = []
      }

      try {
        // Buscar movimentações usando query simples
        movimentacoes = await db.all('SELECT * FROM movimentacoes_estoque')
      } catch (movError) {
        LoggerManager.warn('Tabela movimentacoes_estoque não encontrada:', movError.message)
        movimentacoes = []
      }

      // Calcular estatísticas básicas
      const totalProdutos = produtos.length
      const disponivel = produtos.filter(p => (p.estoque_atual || 0) > (p.estoque_minimo || 0)).length
      const estoqueBaixo = produtos.filter(p => {
        const atual = p.estoque_atual || 0
        const minimo = p.estoque_minimo || 0
        return atual > 0 && atual <= minimo
      }).length
      const semEstoque = produtos.filter(p => (p.estoque_atual || 0) === 0).length

      // Calcular valores financeiros
      let valorCusto = 0
      let valorVenda = 0
      produtos.forEach(produto => {
        const estoque = produto.estoque_atual || 0
        const custo = produto.preco_custo || 0
        const venda = produto.preco_venda || 0
        valorCusto += estoque * custo
        valorVenda += estoque * venda
      })

      // Calcular movimentações do mês
      const agora = new Date()
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
      
      const movimentacoesMes = movimentacoes.filter(m => {
        const dataMovimentacao = new Date(m.created_at || m.data_movimentacao)
        return dataMovimentacao >= inicioMes
      })

      const totalMovimentacoes = movimentacoesMes.length
      const entradas = movimentacoesMes
        .filter(m => m.tipo === 'entrada')
        .reduce((sum, m) => sum + (m.quantidade || 0), 0)
      const saidas = movimentacoesMes
        .filter(m => m.tipo === 'saida')
        .reduce((sum, m) => sum + (m.quantidade || 0), 0)

      const estatisticas = {
        resumo: {
          total_produtos: totalProdutos,
          disponivel: disponivel,
          estoque_baixo: estoqueBaixo,
          sem_estoque: semEstoque,
        },
        financeiro: {
          valor_custo: Math.round(valorCusto * 100) / 100,
          valor_venda: Math.round(valorVenda * 100) / 100,
          margem_potencial: Math.round((valorVenda - valorCusto) * 100) / 100,
        },
        movimentacoes: {
          total_mes: totalMovimentacoes,
          entradas_mes: entradas,
          saidas_mes: saidas,
        },
        mais_vendidos: [], // Simplificado por enquanto
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
        details: error.message
      })
    }
  }
}

module.exports = new ProdutoController()
