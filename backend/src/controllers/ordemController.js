const db = require('../utils/database')
const path = require('path')
const fs = require('fs')

class OrdemController {
  // Listar todas as ordens
  async index(req, res) {
    try {
      const { status, cliente_id, prioridade, tecnico } = req.query

      let sql = `
        SELECT 
          o.id, o.cliente_id, o.equipamento, o.defeito, o.status, o.data_entrada,
          o.created_at, o.updated_at,
          COALESCE(o.marca, '') as marca,
          COALESCE(o.modelo, '') as modelo,
          COALESCE(o.numero_serie, '') as numero_serie,
          COALESCE(o.descricao, '') as descricao,
          COALESCE(o.diagnostico, '') as diagnostico,
          COALESCE(o.solucao, '') as solucao,
          COALESCE(o.prioridade, 'normal') as prioridade,
          COALESCE(o.valor_orcamento, 0) as valor_orcamento,
          COALESCE(o.valor_mao_obra, 0) as valor_mao_obra,
          COALESCE(o.valor_pecas, 0) as valor_pecas,
          COALESCE(o.valor_final, 0) as valor_final,
          COALESCE(o.desconto, 0) as desconto,
          o.data_prazo, o.data_finalizacao,
          COALESCE(o.tecnico_responsavel, '') as tecnico_responsavel,
          COALESCE(o.observacoes, '') as observacoes,
          COALESCE(o.observacoes_internas, '') as observacoes_internas,
          COALESCE(o.garantia_dias, 90) as garantia_dias,
          c.nome as cliente_nome, c.telefone as cliente_telefone, c.email as cliente_email
        FROM ordens o
        INNER JOIN clientes c ON o.cliente_id = c.id
      `

      const params = []
      const conditions = []

      if (status) {
        conditions.push('o.status = ?')
        params.push(status)
      }

      if (cliente_id) {
        conditions.push('o.cliente_id = ?')
        params.push(cliente_id)
      }

      if (prioridade) {
        conditions.push('o.prioridade = ?')
        params.push(prioridade)
      }

      if (tecnico) {
        conditions.push('o.tecnico_responsavel LIKE ?')
        params.push(`%${tecnico}%`)
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ')
      }

      sql += ' ORDER BY o.data_entrada DESC'

      const ordens = await db.all(sql, params)

      res.json({
        success: true,
        data: ordens,
        total: ordens.length,
      })
    } catch (error) {
      console.error('Erro ao listar ordens:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Buscar ordem por ID com dados completos
  async show(req, res) {
    try {
      const { id } = req.params
      console.log(`🔍 Buscando ordem ID: ${id}`)

      const ordem = await db.get(
        `
        SELECT 
          o.id, o.cliente_id, o.equipamento, o.defeito, o.status, o.data_entrada,
          o.created_at, o.updated_at,
          COALESCE(o.marca, '') as marca,
          COALESCE(o.modelo, '') as modelo,
          COALESCE(o.numero_serie, '') as numero_serie,
          COALESCE(o.descricao, '') as descricao,
          COALESCE(o.diagnostico, '') as diagnostico,
          COALESCE(o.solucao, '') as solucao,
          COALESCE(o.prioridade, 'normal') as prioridade,
          COALESCE(o.valor_orcamento, 0) as valor_orcamento,
          COALESCE(o.valor_mao_obra, 0) as valor_mao_obra,
          COALESCE(o.valor_pecas, 0) as valor_pecas,
          COALESCE(o.valor_final, 0) as valor_final,
          COALESCE(o.desconto, 0) as desconto,
          o.data_prazo, o.data_finalizacao,
          COALESCE(o.tecnico_responsavel, '') as tecnico_responsavel,
          COALESCE(o.observacoes, '') as observacoes,
          COALESCE(o.observacoes_internas, '') as observacoes_internas,
          COALESCE(o.garantia_dias, 90) as garantia_dias,
          c.nome as cliente_nome, c.telefone as cliente_telefone,
          c.email as cliente_email, c.endereco as cliente_endereco, c.cidade as cliente_cidade
        FROM ordens o
        INNER JOIN clientes c ON o.cliente_id = c.id
        WHERE o.id = ?
      `,
        [id]
      )

      if (!ordem) {
        console.log(`❌ Ordem ${id} não encontrada`)
        return res.status(404).json({
          success: false,
          error: 'Ordem de serviço não encontrada',
        })
      }

      console.log(`✅ Ordem encontrada: ${JSON.stringify(ordem, null, 2)}`)

      // Buscar fotos da ordem
      const fotos = await db.all(
        `
        SELECT id, nome_arquivo, caminho, created_at
        FROM ordem_fotos 
        WHERE ordem_id = ?
        ORDER BY created_at ASC
      `,
        [id]
      )

      // Buscar peças utilizadas
      const pecas = await db.all(
        `
        SELECT id, nome_peca, codigo_peca, quantidade, valor_unitario, 
               valor_total, fornecedor, observacoes, created_at
        FROM ordem_pecas 
        WHERE ordem_id = ?
        ORDER BY created_at ASC
      `,
        [id]
      )

      // Buscar serviços realizados
      const servicos = await db.all(
        `
        SELECT id, descricao_servico, tempo_gasto, valor_servico, 
               tecnico, data_execucao, observacoes
        FROM ordem_servicos 
        WHERE ordem_id = ?
        ORDER BY data_execucao ASC
      `,
        [id]
      )

      // Buscar histórico de alterações
      const historico = await db.all(
        `
        SELECT id, status_anterior, status_novo, observacoes, 
               usuario, data_alteracao
        FROM ordem_historico 
        WHERE ordem_id = ?
        ORDER BY data_alteracao DESC
      `,
        [id]
      )

      res.json({
        success: true,
        data: {
          ...ordem,
          fotos,
          pecas,
          servicos,
          historico,
        },
      })
    } catch (error) {
      console.error('Erro ao buscar ordem:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor: ' + error.message,
      })
    }
  }

  // Criar nova ordem
  async store(req, res) {
    try {
      const {
        cliente_id,
        equipamento,
        marca,
        modelo,
        numero_serie,
        defeito,
        descricao,
        diagnostico,
        solucao,
        status = 'recebido',
        prioridade = 'normal',
        valor_orcamento,
        valor_mao_obra,
        valor_pecas,
        valor_final,
        desconto = 0,
        data_prazo,
        tecnico_responsavel,
        observacoes,
        observacoes_internas,
        garantia_dias = 90,
      } = req.body

      // Validações básicas
      if (!cliente_id || !equipamento || !defeito) {
        return res.status(400).json({
          success: false,
          error: 'Cliente, equipamento e defeito são obrigatórios',
        })
      }

      // Processar pecas e servicos com melhor tratamento
      let pecas = []
      let servicos = []

      // Tratamento para peças
      if (req.body.pecas) {
        try {
          if (typeof req.body.pecas === 'string') {
            pecas = JSON.parse(req.body.pecas)
          } else if (Array.isArray(req.body.pecas)) {
            pecas = req.body.pecas
          }
        } catch (e) {
          console.warn('Erro ao processar peças:', e.message)
          pecas = []
        }
      }

      // Tratamento para serviços
      if (req.body.servicos) {
        try {
          if (typeof req.body.servicos === 'string') {
            servicos = JSON.parse(req.body.servicos)
          } else if (Array.isArray(req.body.servicos)) {
            servicos = req.body.servicos
          }
        } catch (e) {
          console.warn('Erro ao processar serviços:', e.message)
          servicos = []
        }
      }

      // Filtrar peças e serviços válidos
      pecas = pecas.filter(
        (peca) => peca && peca.nome_peca && peca.nome_peca.trim()
      )
      servicos = servicos.filter(
        (servico) =>
          servico &&
          servico.descricao_servico &&
          servico.descricao_servico.trim()
      )

      // Inserir ordem principal
      const result = await db.run(
        `
        INSERT INTO ordens (
          cliente_id, equipamento, marca, modelo, numero_serie,
          defeito, descricao, diagnostico, solucao, status, prioridade,
          valor_orcamento, valor_mao_obra, valor_pecas, valor_final, desconto,
          data_prazo, tecnico_responsavel, observacoes, observacoes_internas, garantia_dias
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          cliente_id,
          equipamento,
          marca || null,
          modelo || null,
          numero_serie || null,
          defeito,
          descricao || null,
          diagnostico || null,
          solucao || null,
          status,
          prioridade,
          valor_orcamento || null,
          valor_mao_obra || null,
          valor_pecas || null,
          valor_final || null,
          desconto,
          data_prazo || null,
          tecnico_responsavel || null,
          observacoes || null,
          observacoes_internas || null,
          garantia_dias,
        ]
      )

      const ordemId = result.id

      // Inserir peças se existirem
      if (pecas.length > 0) {
        for (const peca of pecas) {
          const valorTotal =
            (parseFloat(peca.quantidade) || 0) *
            (parseFloat(peca.valor_unitario) || 0)

          await db.run(
            `
            INSERT INTO ordem_pecas (
              ordem_id, nome_peca, codigo_peca, quantidade, 
              valor_unitario, valor_total, fornecedor, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              ordemId,
              peca.nome_peca,
              peca.codigo_peca || null,
              peca.quantidade || 1,
              peca.valor_unitario || null,
              valorTotal,
              peca.fornecedor || null,
              peca.observacoes || null,
            ]
          )
        }
      }

      // Inserir serviços se existirem
      if (servicos.length > 0) {
        for (const servico of servicos) {
          await db.run(
            `
            INSERT INTO ordem_servicos (
              ordem_id, descricao_servico, tempo_gasto, valor_servico, 
              tecnico, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
            [
              ordemId,
              servico.descricao_servico,
              servico.tempo_gasto || null,
              servico.valor_servico || null,
              servico.tecnico || tecnico_responsavel,
              servico.observacoes || null,
            ]
          )
        }
      }

      // Registrar no histórico
      await db.run(
        `
        INSERT INTO ordem_historico (ordem_id, status_novo, observacoes, usuario) 
        VALUES (?, ?, ?, ?)
      `,
        [ordemId, status, 'Ordem de serviço criada', 'Sistema']
      )

      // Processar upload de fotos se existirem
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await db.run(
            `
            INSERT INTO ordem_fotos (ordem_id, nome_arquivo, caminho) 
            VALUES (?, ?, ?)
          `,
            [ordemId, file.filename, file.path]
          )
        }
      }

      // Buscar a ordem criada com dados completos
      const ordemCriada = await db.get(
        `
        SELECT 
          o.*, 
          c.nome as cliente_nome, c.telefone as cliente_telefone
        FROM ordens o
        INNER JOIN clientes c ON o.cliente_id = c.id
        WHERE o.id = ?
      `,
        [ordemId]
      )

      res.status(201).json({
        success: true,
        message: 'Ordem de serviço criada com sucesso',
        data: ordemCriada,
      })
    } catch (error) {
      console.error('Erro ao criar ordem:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor: ' + error.message,
      })
    }
  }

  // Atualizar ordem
  async update(req, res) {
    try {
      const { id } = req.params
      const {
        equipamento,
        marca,
        modelo,
        numero_serie,
        defeito,
        descricao,
        diagnostico,
        solucao,
        status,
        prioridade,
        valor_orcamento,
        valor_mao_obra,
        valor_pecas,
        valor_final,
        desconto,
        data_prazo,
        data_finalizacao,
        tecnico_responsavel,
        observacoes,
        observacoes_internas,
        garantia_dias,
      } = req.body

      // Processar pecas e servicos com melhor tratamento
      let pecas = []
      let servicos = []

      // Tratamento para peças
      if (req.body.pecas) {
        try {
          if (typeof req.body.pecas === 'string') {
            pecas = JSON.parse(req.body.pecas)
          } else if (Array.isArray(req.body.pecas)) {
            pecas = req.body.pecas
          }
        } catch (e) {
          console.warn('Erro ao processar peças:', e.message)
          pecas = []
        }
      }

      // Tratamento para serviços
      if (req.body.servicos) {
        try {
          if (typeof req.body.servicos === 'string') {
            servicos = JSON.parse(req.body.servicos)
          } else if (Array.isArray(req.body.servicos)) {
            servicos = req.body.servicos
          }
        } catch (e) {
          console.warn('Erro ao processar serviços:', e.message)
          servicos = []
        }
      }

      // Filtrar peças e serviços válidos
      pecas = pecas.filter(
        (peca) => peca && peca.nome_peca && peca.nome_peca.trim()
      )
      servicos = servicos.filter(
        (servico) =>
          servico &&
          servico.descricao_servico &&
          servico.descricao_servico.trim()
      )

      // Verificar se ordem existe
      const ordemExistente = await db.get('SELECT * FROM ordens WHERE id = ?', [
        id,
      ])
      if (!ordemExistente) {
        return res.status(404).json({
          success: false,
          error: 'Ordem de serviço não encontrada',
        })
      }

      // Registrar mudança de status no histórico
      if (status && status !== ordemExistente.status) {
        await db.run(
          `
          INSERT INTO ordem_historico (ordem_id, status_anterior, status_novo, observacoes, usuario)
          VALUES (?, ?, ?, ?, ?)
        `,
          [
            id,
            ordemExistente.status,
            status,
            `Status alterado de ${ordemExistente.status} para ${status}`,
            'Sistema',
          ]
        )
      }

      // Atualizar ordem
      await db.run(
        `
        UPDATE ordens SET
          equipamento = ?, marca = ?, modelo = ?, numero_serie = ?,
          defeito = ?, descricao = ?, diagnostico = ?, solucao = ?,
          status = ?, prioridade = ?, valor_orcamento = ?, valor_mao_obra = ?,
          valor_pecas = ?, valor_final = ?, desconto = ?, data_prazo = ?,
          data_finalizacao = ?, tecnico_responsavel = ?, observacoes = ?,
          observacoes_internas = ?, garantia_dias = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [
          equipamento?.trim(),
          marca?.trim() || null,
          modelo?.trim() || null,
          numero_serie?.trim() || null,
          defeito?.trim(),
          descricao?.trim() || null,
          diagnostico?.trim() || null,
          solucao?.trim() || null,
          status,
          prioridade,
          valor_orcamento || null,
          valor_mao_obra || null,
          valor_pecas || null,
          valor_final || null,
          desconto || 0,
          data_prazo || null,
          data_finalizacao || null,
          tecnico_responsavel?.trim() || null,
          observacoes?.trim() || null,
          observacoes_internas?.trim() || null,
          garantia_dias || 90,
          id,
        ]
      )

      // Atualizar peças - remover existentes e inserir novas
      await db.run('DELETE FROM ordem_pecas WHERE ordem_id = ?', [id])
      if (pecas.length > 0) {
        for (const peca of pecas) {
          const valorTotal =
            (parseFloat(peca.quantidade) || 0) *
            (parseFloat(peca.valor_unitario) || 0)

          await db.run(
            `
            INSERT INTO ordem_pecas (
              ordem_id, nome_peca, codigo_peca, quantidade, 
              valor_unitario, valor_total, fornecedor, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              id,
              peca.nome_peca,
              peca.codigo_peca || null,
              peca.quantidade || 1,
              peca.valor_unitario || null,
              valorTotal,
              peca.fornecedor || null,
              peca.observacoes || null,
            ]
          )
        }
      }

      // Atualizar serviços - remover existentes e inserir novos
      await db.run('DELETE FROM ordem_servicos WHERE ordem_id = ?', [id])
      if (servicos.length > 0) {
        for (const servico of servicos) {
          await db.run(
            `
            INSERT INTO ordem_servicos (
              ordem_id, descricao_servico, tempo_gasto, 
              valor_servico, tecnico, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
            [
              id,
              servico.descricao_servico,
              servico.tempo_gasto || null,
              servico.valor_servico || null,
              servico.tecnico || tecnico_responsavel,
              servico.observacoes || null,
            ]
          )
        }
      }

      // Buscar ordem atualizada
      const ordemAtualizada = await db.get(
        `
        SELECT 
          o.*, 
          c.nome as cliente_nome, c.telefone as cliente_telefone
        FROM ordens o
        INNER JOIN clientes c ON o.cliente_id = c.id
        WHERE o.id = ?
      `,
        [id]
      )

      res.json({
        success: true,
        message: 'Ordem de serviço atualizada com sucesso',
        data: ordemAtualizada,
      })
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor: ' + error.message,
      })
    }
  }

  // Alterar status da ordem
  async alterarStatus(req, res) {
    try {
      const { id } = req.params
      const { status, observacoes } = req.body

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status é obrigatório',
        })
      }

      // Verificar se ordem existe
      const ordemExistente = await db.get('SELECT * FROM ordens WHERE id = ?', [
        id,
      ])
      if (!ordemExistente) {
        return res.status(404).json({
          success: false,
          error: 'Ordem de serviço não encontrada',
        })
      }

      // Atualizar status
      await db.run(
        `UPDATE ordens SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [status, id]
      )

      // Registrar no histórico
      await db.run(
        `
        INSERT INTO ordem_historico (ordem_id, status_anterior, status_novo, observacoes, usuario)
        VALUES (?, ?, ?, ?, ?)
      `,
        [
          id,
          ordemExistente.status,
          status,
          observacoes ||
            `Status alterado de ${ordemExistente.status} para ${status}`,
          'Sistema',
        ]
      )

      res.json({
        success: true,
        message: 'Status alterado com sucesso',
      })
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor: ' + error.message,
      })
    }
  }

  // Deletar ordem
  async destroy(req, res) {
    try {
      const { id } = req.params

      const ordem = await db.get('SELECT * FROM ordens WHERE id = ?', [id])
      if (!ordem) {
        return res.status(404).json({
          success: false,
          error: 'Ordem de serviço não encontrada',
        })
      }

      // Buscar fotos para deletar arquivos
      const fotos = await db.all(
        'SELECT caminho FROM ordem_fotos WHERE ordem_id = ?',
        [id]
      )

      // Deletar registros relacionados
      await db.run('DELETE FROM ordem_fotos WHERE ordem_id = ?', [id])
      await db.run('DELETE FROM ordem_pecas WHERE ordem_id = ?', [id])
      await db.run('DELETE FROM ordem_servicos WHERE ordem_id = ?', [id])
      await db.run('DELETE FROM ordem_historico WHERE ordem_id = ?', [id])
      await db.run('DELETE FROM ordens WHERE id = ?', [id])

      // Deletar arquivos de fotos
      fotos.forEach((foto) => {
        try {
          if (fs.existsSync(foto.caminho)) {
            fs.unlinkSync(foto.caminho)
          }
        } catch (err) {
          console.error('Erro ao deletar foto:', err)
        }
      })

      res.json({
        success: true,
        message: 'Ordem de serviço deletada com sucesso',
      })
    } catch (error) {
      console.error('Erro ao deletar ordem:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Estatísticas do dashboard
  async stats(req, res) {
    try {
      // Total de ordens
      const totalOrdens = await db.get('SELECT COUNT(*) as total FROM ordens')

      // Total de clientes
      const totalClientes = await db.get(
        'SELECT COUNT(*) as total FROM clientes'
      )

      // Ordens por status
      const ordemsPorStatus = await db.all(`
        SELECT status, COUNT(*) as total 
        FROM ordens 
        GROUP BY status
        ORDER BY total DESC
      `)

      // Ordens por prioridade
      const ordemsPorPrioridade = await db.all(`
        SELECT prioridade, COUNT(*) as total 
        FROM ordens 
        GROUP BY prioridade
        ORDER BY 
          CASE prioridade 
            WHEN 'urgente' THEN 1
            WHEN 'alta' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'baixa' THEN 4
          END
      `)

      // Faturamento total
      const faturamento = await db.get(`
        SELECT 
          SUM(valor_final) as total,
          SUM(CASE WHEN status = 'entregue' THEN valor_final ELSE 0 END) as entregue,
          SUM(CASE WHEN status IN ('recebido', 'em_analise', 'em_reparo', 'pronto') THEN valor_final ELSE 0 END) as pendente
        FROM ordens 
        WHERE valor_final IS NOT NULL
      `)

      // Ordens recentes (últimas 10)
      const ordensRecentes = await db.all(`
        SELECT 
          o.id, o.equipamento as dispositivo, o.defeito, o.status, o.prioridade,
          o.data_entrada as data_criacao, o.valor_final,
          c.nome as cliente_nome
        FROM ordens o
        INNER JOIN clientes c ON o.cliente_id = c.id
        ORDER BY o.data_entrada DESC
        LIMIT 10
      `)

      // Técnicos mais ativos
      const tecnicosAtivos = await db.all(`
        SELECT 
          tecnico_responsavel as tecnico,
          COUNT(*) as total_ordens,
          SUM(CASE WHEN status = 'entregue' THEN 1 ELSE 0 END) as concluidas
        FROM ordens 
        WHERE tecnico_responsavel IS NOT NULL AND tecnico_responsavel != ''
        GROUP BY tecnico_responsavel
        ORDER BY total_ordens DESC
        LIMIT 5
      `)

      res.json({
        success: true,
        data: {
          totais: {
            ordens: totalOrdens.total,
            clientes: totalClientes.total,
            faturamento: faturamento.total || 0,
            faturamento_entregue: faturamento.entregue || 0,
            faturamento_pendente: faturamento.pendente || 0,
          },
          breakdown: {
            status: ordemsPorStatus,
            prioridade: ordemsPorPrioridade,
          },
          ordensRecentes,
          tecnicosAtivos,
        },
      })
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Upload de fotos para ordem existente
  async uploadFotos(req, res) {
    try {
      const { id } = req.params

      const ordem = await db.get('SELECT id FROM ordens WHERE id = ?', [id])
      if (!ordem) {
        return res.status(404).json({
          success: false,
          error: 'Ordem de serviço não encontrada',
        })
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Nenhuma foto foi enviada',
        })
      }

      const fotosInseridas = []
      for (const file of req.files) {
        const resultado = await db.run(
          `
          INSERT INTO ordem_fotos (ordem_id, nome_arquivo, caminho)
          VALUES (?, ?, ?)
        `,
          [id, file.filename, file.path]
        )

        fotosInseridas.push({
          id: resultado.id,
          nome_arquivo: file.filename,
          caminho: file.path,
        })
      }

      res.json({
        success: true,
        message: `${fotosInseridas.length} foto(s) adicionada(s) com sucesso`,
        data: fotosInseridas,
      })
    } catch (error) {
      console.error('Erro ao fazer upload de fotos:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Relatório de ordens por período
  async relatorio(req, res) {
    try {
      const { data_inicio, data_fim, status, tecnico } = req.query

      let sql = `
        SELECT 
          o.id, o.equipamento, o.marca, o.modelo, o.defeito, o.diagnostico, o.solucao,
          o.status, o.prioridade, o.valor_orcamento, o.valor_final,
          o.data_entrada, o.data_finalizacao, o.tecnico_responsavel,
          c.nome as cliente_nome, c.telefone as cliente_telefone
        FROM ordens o
        INNER JOIN clientes c ON o.cliente_id = c.id
        WHERE 1=1
      `

      const params = []

      if (data_inicio) {
        sql += ' AND DATE(o.data_entrada) >= ?'
        params.push(data_inicio)
      }

      if (data_fim) {
        sql += ' AND DATE(o.data_entrada) <= ?'
        params.push(data_fim)
      }

      if (status) {
        sql += ' AND o.status = ?'
        params.push(status)
      }

      if (tecnico) {
        sql += ' AND o.tecnico_responsavel LIKE ?'
        params.push(`%${tecnico}%`)
      }

      sql += ' ORDER BY o.data_entrada DESC'

      const ordens = await db.all(sql, params)

      // Calcular totais
      const totais = {
        quantidade: ordens.length,
        valor_orcamento: ordens.reduce(
          (sum, o) => sum + (parseFloat(o.valor_orcamento) || 0),
          0
        ),
        valor_final: ordens.reduce(
          (sum, o) => sum + (parseFloat(o.valor_final) || 0),
          0
        ),
        por_status: {},
      }

      // Agrupar por status
      ordens.forEach((ordem) => {
        if (!totais.por_status[ordem.status]) {
          totais.por_status[ordem.status] = 0
        }
        totais.por_status[ordem.status]++
      })

      res.json({
        success: true,
        data: {
          ordens,
          totais,
          filtros: { data_inicio, data_fim, status, tecnico },
        },
      })
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }
}

module.exports = new OrdemController()
