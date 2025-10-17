const db = require('../utils/database-adapter')
const path = require('path')
const fs = require('fs')

class OrdemController {
  // Listar todas as ordens com paginação determinística (compatível com Supabase)
  async index(req, res) {
    try {
      const { status, cliente_id, prioridade, tecnico } = req.query
      const { extractPaginationParams, createPaginatedResponse } = require('../utils/pagination')
      const supabase = require('../utils/supabase')

      // Extrair parâmetros de paginação
      const pagination = extractPaginationParams(req.query, { defaultLimit: 15, maxLimit: 100 })

      // Contagem total com filtros
      let countQuery = supabase.client.from('ordens').select('*', { count: 'exact', head: true })
      if (status) countQuery = countQuery.eq('status', status)
      if (cliente_id) countQuery = countQuery.eq('cliente_id', parseInt(cliente_id))
      if (prioridade) countQuery = countQuery.eq('prioridade', prioridade)
      if (tecnico) countQuery = countQuery.ilike('tecnico_responsavel', `%${tecnico}%`)

      const { count, error: countError } = await countQuery
      if (countError) throw countError
      const total = count || 0

      // Dados com relações (cliente) e ordenação determinística
      let dataQuery = supabase.client
        .from('ordens')
        .select(`
          id, cliente_id, equipamento, defeito_relatado, status, data_entrada,
          created_at, updated_at, modelo, prioridade, valor_orcamento, valor_final,
          data_previsao, data_conclusao, data_entrega, tecnico_responsavel, observacoes,
          clientes:clientes (nome, telefone, email)
        `)

      if (status) dataQuery = dataQuery.eq('status', status)
      if (cliente_id) dataQuery = dataQuery.eq('cliente_id', parseInt(cliente_id))
      if (prioridade) dataQuery = dataQuery.eq('prioridade', prioridade)
      if (tecnico) dataQuery = dataQuery.ilike('tecnico_responsavel', `%${tecnico}%`)

      const offset = pagination.offset
      dataQuery = dataQuery
        .order('data_entrada', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .range(offset, offset + pagination.limit - 1)

      const { data, error } = await dataQuery
      if (error) throw error

      // Mapear para a estrutura compatível com o frontend atual
      const ordens = (data || []).map((o) => ({
        id: o.id,
        cliente_id: o.cliente_id,
        equipamento: o.equipamento,
        defeito: o.defeito_relatado,
        status: o.status,
        data_entrada: o.data_entrada,
        created_at: o.created_at,
        updated_at: o.updated_at,
        modelo: o.modelo || '',
        prioridade: o.prioridade || 'normal',
        valor_orcamento: o.valor_orcamento || 0,
        valor_final: o.valor_final || 0,
        data_previsao: o.data_previsao,
        data_conclusao: o.data_conclusao,
        data_entrega: o.data_entrega,
        tecnico_responsavel: o.tecnico_responsavel || '',
        observacoes: o.observacoes || '',
        cliente_nome: o.clientes?.nome || null,
        cliente_telefone: o.clientes?.telefone || null,
        cliente_email: o.clientes?.email || null,
      }))

      res.json(createPaginatedResponse(ordens, total, pagination.page, pagination.limit))
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao listar ordens')
    }
  }

  // Buscar ordem por ID com dados completos (Supabase, sem SQL cru)
  async show(req, res) {
    try {
      const { id } = req.params
      const supabase = require('../utils/supabase')

      // Ordem + cliente (via relação)
      const { data: ordensRows, error: ordErr } = await supabase.client
        .from('ordens')
        .select(`
          id, cliente_id, equipamento, defeito_relatado, status, data_entrada,
          created_at, updated_at, modelo, prioridade, valor_orcamento, valor_final,
          data_previsao, data_conclusao, data_entrega, tecnico_responsavel, observacoes,
          clientes:clientes (nome, telefone, email, endereco, cidade)
        `)
        .eq('id', parseInt(id))
        .limit(1)
      if (ordErr) throw ordErr
      const o = (ordensRows || [])[0]
      if (!o) {
        return res.status(404).json({ success: false, error: 'Ordem de serviço não encontrada' })
      }

      // Entidades relacionadas
      const [fotosRes, pecasRes, servicosRes, histRes] = await Promise.all([
        supabase.client.from('ordem_fotos').select('id, nome_arquivo, caminho, created_at').eq('ordem_id', parseInt(id)).order('created_at', { ascending: true }),
        supabase.client.from('ordem_pecas').select('id, nome_peca, codigo_peca, quantidade, valor_unitario, valor_total, fornecedor, observacoes, created_at').eq('ordem_id', parseInt(id)).order('created_at', { ascending: true }),
        supabase.client.from('ordem_servicos').select('id, descricao_servico, tempo_gasto, valor_servico, tecnico, data_execucao, observacoes').eq('ordem_id', parseInt(id)).order('data_execucao', { ascending: true }),
        supabase.client.from('ordem_historico').select('id, status_anterior, status_novo, observacoes, usuario, data_alteracao').eq('ordem_id', parseInt(id)).order('data_alteracao', { ascending: false }),
      ])

      const fotos = fotosRes.data || []
      const pecas = pecasRes.data || []
      const servicos = servicosRes.data || []
      const historico = histRes.data || []

      res.json({
        success: true,
        data: {
          id: o.id,
          cliente_id: o.cliente_id,
          equipamento: o.equipamento,
          defeito: o.defeito_relatado,
          status: o.status,
          data_entrada: o.data_entrada,
          created_at: o.created_at,
          updated_at: o.updated_at,
          modelo: o.modelo || '',
          prioridade: o.prioridade || 'normal',
          valor_orcamento: o.valor_orcamento || 0,
          valor_final: o.valor_final || 0,
          data_previsao: o.data_previsao,
          data_conclusao: o.data_conclusao,
          data_entrega: o.data_entrega,
          tecnico_responsavel: o.tecnico_responsavel || '',
          observacoes: o.observacoes || '',
          cliente_nome: o.clientes?.nome || null,
          cliente_telefone: o.clientes?.telefone || null,
          cliente_email: o.clientes?.email || null,
          cliente_endereco: o.clientes?.endereco || null,
          cliente_cidade: o.clientes?.cidade || null,
          fotos,
          pecas,
          servicos,
          historico,
        },
      })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao buscar ordem')
    }
  }

  // Criar nova ordem (Supabase, sem SQL cru)
  async store(req, res) {
    try {
      const supabase = require('../utils/supabase')
      const {
        cliente_id,
        equipamento,
        marca,
        modelo,
        numero_serie,
        defeito,
        observacoes,
        status = 'aguardando',
        prioridade = 'normal',
        valor_orcamento,
        valor_final,
        data_previsao,
        tecnico_responsavel,
      } = req.body

      // Validações básicas
      if (!cliente_id || !equipamento || !defeito) {
        return res.status(400).json({ success: false, error: 'Cliente, equipamento e defeito são obrigatórios' })
      }

      // Validar cliente
      const { data: clienteRow, error: cliErr } = await supabase.client
        .from('clientes')
        .select('id')
        .eq('id', parseInt(cliente_id))
        .single()
      if (cliErr || !clienteRow) {
        return res.status(400).json({ success: false, error: 'Cliente não encontrado' })
      }

      // Parse peças e serviços
      let pecas = []
      let servicos = []
      try {
        if (req.body.pecas) {
          if (typeof req.body.pecas === 'string') pecas = JSON.parse(req.body.pecas)
          else if (Array.isArray(req.body.pecas)) pecas = req.body.pecas
        }
      } catch { pecas = [] }
      try {
        if (req.body.servicos) {
          if (typeof req.body.servicos === 'string') servicos = JSON.parse(req.body.servicos)
          else if (Array.isArray(req.body.servicos)) servicos = req.body.servicos
        }
      } catch { servicos = [] }
      pecas = pecas.filter((p) => p && p.nome_peca && p.nome_peca.trim())
      servicos = servicos.filter((s) => s && s.descricao_servico && s.descricao_servico.trim())

      // Criar ordem
      const { data: ordemRow, error: insErr } = await supabase.client
        .from('ordens')
        .insert([
          {
            cliente_id: parseInt(cliente_id),
            equipamento,
            marca: marca || null,
            modelo: modelo || null,
            numero_serie: numero_serie || null,
            defeito_relatado: defeito,
            observacoes: observacoes || null,
            status,
            prioridade,
            valor_orcamento: valor_orcamento || null,
            valor_final: valor_final || null,
            data_previsao: data_previsao || null,
            tecnico_responsavel: tecnico_responsavel || null,
          },
        ])
        .select()
        .single()
      if (insErr) throw insErr

      const ordemId = ordemRow.id

      // Inserir peças
      for (const p of pecas) {
        const valorTotal = (parseFloat(p.quantidade) || 0) * (parseFloat(p.valor_unitario) || 0)
        const { error } = await supabase.client.from('ordem_pecas').insert([
          {
            ordem_id: ordemId,
            nome_peca: p.nome_peca,
            codigo_peca: p.codigo_peca || null,
            quantidade: p.quantidade || 1,
            valor_unitario: p.valor_unitario || null,
            valor_total: valorTotal,
            fornecedor: p.fornecedor || null,
            observacoes: p.observacoes || null,
          },
        ])
        if (error) throw error
      }

      // Inserir serviços
      for (const s of servicos) {
        const { error } = await supabase.client.from('ordem_servicos').insert([
          {
            ordem_id: ordemId,
            descricao_servico: s.descricao_servico,
            tempo_gasto: s.tempo_gasto || null,
            valor_servico: s.valor_servico || null,
            tecnico: s.tecnico || tecnico_responsavel || null,
            observacoes: s.observacoes || null,
          },
        ])
        if (error) throw error
      }

      // Histórico inicial
      await supabase.client.from('ordem_historico').insert([
        {
          ordem_id: ordemId,
          status_novo: status,
          observacoes: 'Ordem de serviço criada',
          usuario: 'Sistema',
        },
      ])

      // Fotos (se houver)
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await supabase.client.from('ordem_fotos').insert([
            { ordem_id: ordemId, nome_arquivo: file.filename, caminho: file.path },
          ])
        }
      }

      // Buscar ordem com cliente
      const { data: ordensRows, error: selErr } = await supabase.client
        .from('ordens')
        .select(`
          id, cliente_id, equipamento, defeito_relatado, status, data_entrada,
          created_at, updated_at, modelo, prioridade, valor_orcamento, valor_final,
          data_previsao, data_conclusao, data_entrega, tecnico_responsavel, observacoes,
          clientes:clientes (nome, telefone)
        `)
        .eq('id', ordemId)
        .limit(1)
      if (selErr) throw selErr
      const o = ordensRows && ordensRows[0]

      res.status(201).json({
        success: true,
        message: 'Ordem de serviço criada com sucesso',
        data: {
          id: o.id,
          cliente_id: o.cliente_id,
          equipamento: o.equipamento,
          defeito: o.defeito_relatado,
          status: o.status,
          data_entrada: o.data_entrada,
          created_at: o.created_at,
          updated_at: o.updated_at,
          modelo: o.modelo || '',
          prioridade: o.prioridade || 'normal',
          valor_orcamento: o.valor_orcamento || 0,
          valor_final: o.valor_final || 0,
          data_previsao: o.data_previsao,
          data_conclusao: o.data_conclusao,
          data_entrega: o.data_entrega,
          tecnico_responsavel: o.tecnico_responsavel || '',
          observacoes: o.observacoes || '',
          cliente_nome: o.clientes?.nome || null,
          cliente_telefone: o.clientes?.telefone || null,
        },
      })
    } catch (error) {
      console.error('Erro ao criar ordem:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor: ' + error.message })
    }
  }

  // Alterar status da ordem (Supabase)
  async alterarStatus(req, res) {
    try {
      const supabase = require('../utils/supabase')
      const { id } = req.params
      const { status, observacoes } = req.body

      if (!status) {
        return res.status(400).json({ success: false, error: 'Status é obrigatório' })
      }

      // Verificar se ordem existe
      const { data: ordemExistente, error: ordErr } = await supabase.client
        .from('ordens')
        .select('id, status')
        .eq('id', parseInt(id))
        .single()
      if (ordErr || !ordemExistente) {
        return res.status(404).json({ success: false, error: 'Ordem de serviço não encontrada' })
      }

      // Atualizar status
      const { error: updErr } = await supabase.client
        .from('ordens')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', parseInt(id))
      if (updErr) throw updErr

      // Registrar no histórico
      await supabase.client.from('ordem_historico').insert([
        {
          ordem_id: parseInt(id),
          status_anterior: ordemExistente.status,
          status_novo: status,
          observacoes: observacoes || `Status alterado de ${ordemExistente.status} para ${status}`,
          usuario: 'Sistema',
        },
      ])

      res.json({ success: true, message: 'Status alterado com sucesso' })
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor: ' + error.message })
    }
  }

  // Deletar ordem (Supabase)
  async destroy(req, res) {
    try {
      const supabase = require('../utils/supabase')
      const { id } = req.params

      // Existência
      const { data: ord, error: ordErr } = await supabase.client
        .from('ordens')
        .select('id')
        .eq('id', parseInt(id))
        .single()
      if (ordErr || !ord) {
        return res.status(404).json({ success: false, error: 'Ordem de serviço não encontrada' })
      }

      // Fotos para remoção local
      const { data: fotos } = await supabase.client
        .from('ordem_fotos')
        .select('caminho')
        .eq('ordem_id', parseInt(id))

      // Deletar registros relacionados
      await supabase.client.from('ordem_fotos').delete().eq('ordem_id', parseInt(id))
      await supabase.client.from('ordem_pecas').delete().eq('ordem_id', parseInt(id))
      await supabase.client.from('ordem_servicos').delete().eq('ordem_id', parseInt(id))
      await supabase.client.from('ordem_historico').delete().eq('ordem_id', parseInt(id))
      await supabase.client.from('ordens').delete().eq('id', parseInt(id))

      // Remover arquivos no disco
      for (const f of fotos || []) {
        try {
          if (f.caminho && fs.existsSync(f.caminho)) fs.unlinkSync(f.caminho)
        } catch (e) { /* ignore */ }
      }

      res.json({ success: true, message: 'Ordem de serviço deletada com sucesso' })
    } catch (error) {
      console.error('Erro ao deletar ordem:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }

  // Estatísticas do dashboard (mantém RPCs do Supabase)
  async stats(req, res) {
    try {
      const fmt = (d) => d.toISOString().slice(0, 10)
      const now = new Date()
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)

      const [totalOrdens, totalClientes, resumoMesArr, resumoDiaArr, prioridadeMesArr, ordensRecentes, tecnicosAtivos] = await Promise.all([
        db.count('ordens'),
        db.count('clientes'),
        db.rpc('dashboard_resumo_mes', { desde: fmt(inicioMes) }),
        db.rpc('dashboard_resumo_do_dia', { data: fmt(now) }),
        db.rpc('dashboard_prioridade_mes', { desde: fmt(inicioMes) }),
        db.rpc('dashboard_ordens_recentes', { lim: 10 }),
        db.rpc('dashboard_tecnicos_ativos', { desde: fmt(inicioMes), lim: 5 }),
      ])

      const resumoMes = Array.isArray(resumoMesArr) ? (resumoMesArr[0] || {}) : (resumoMesArr || {})
      const statusArray = [
        { status: 'aguardando', total: resumoMes.aguardando || 0 },
        { status: 'em_andamento', total: resumoMes.em_andamento || 0 },
        { status: 'aguardando_peca', total: resumoMes.aguardando_peca || 0 },
        { status: 'pronto', total: resumoMes.pronto || 0 },
        { status: 'entregue', total: resumoMes.entregue || 0 },
        { status: 'cancelado', total: resumoMes.cancelado || 0 },
      ]

      const prioridadeArray = Array.isArray(prioridadeMesArr) ? prioridadeMesArr.map((r) => ({ prioridade: r.prioridade, total: r.total })) : []

      res.json({
        success: true,
        data: {
          totais: {
            ordens: totalOrdens || 0,
            clientes: totalClientes || 0,
            faturamento: resumoMes.valor_total || 0,
            faturamento_entregue: resumoMes.valor_entregue || 0,
            faturamento_pendente: resumoMes.valor_pendente || 0,
            resumo_dia: Array.isArray(resumoDiaArr) ? (resumoDiaArr[0] || null) : (resumoDiaArr || null),
          },
          breakdown: {
            status: statusArray,
            prioridade: prioridadeArray,
          },
          ordensRecentes: Array.isArray(ordensRecentes) ? ordensRecentes : [],
          tecnicosAtivos: Array.isArray(tecnicosAtivos) ? tecnicosAtivos : [],
        },
      })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao buscar estatísticas')
    }
  }

  // Upload de fotos para ordem existente (Supabase)
  async uploadFotos(req, res) {
    try {
      const supabase = require('../utils/supabase')
      const { id } = req.params

      const { data: ordem, error: ordErr } = await supabase.client
        .from('ordens')
        .select('id')
        .eq('id', parseInt(id))
        .single()
      if (ordErr || !ordem) {
        return res.status(404).json({ success: false, error: 'Ordem de serviço não encontrada' })
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhuma foto foi enviada' })
      }

      const fotosInseridas = []
      for (const file of req.files) {
        const { data, error } = await supabase.client
          .from('ordem_fotos')
          .insert([{ ordem_id: parseInt(id), nome_arquivo: file.filename, caminho: file.path }])
          .select()
        if (!error && data && data[0]) {
          fotosInseridas.push({ id: data[0].id, nome_arquivo: file.filename, caminho: file.path })
        }
      }

      res.json({ success: true, message: `${fotosInseridas.length} foto(s) adicionada(s) com sucesso`, data: fotosInseridas })
    } catch (error) {
      const { respondWithError } = require('../utils/http-error')
      return respondWithError(res, error, 'Erro ao fazer upload de fotos')
    }
  }

  // Relatório de ordens por período (sem SQL cru, usando Supabase)
  async relatorio(req, res) {
    try {
      const { data_inicio = null, data_fim = null, status = null, tecnico = null } = req.query
      const supabase = require('../utils/supabase')

      let q = supabase.client
        .from('ordens')
        .select(`
          id, equipamento, marca, modelo, defeito_relatado, diagnostico, solucao,
          status, prioridade, valor_orcamento, valor_final,
          data_entrada, data_conclusao, tecnico_responsavel,
          clientes:clientes (nome, telefone)
        `)

      if (data_inicio) q = q.gte('data_entrada', `${data_inicio} 00:00:00`)
      if (data_fim) q = q.lte('data_entrada', `${data_fim} 23:59:59`)
      if (status) q = q.eq('status', status)
      if (tecnico) q = q.ilike('tecnico_responsavel', `%${tecnico}%`)

      q = q.order('data_entrada', { ascending: false })

      const { data, error } = await q
      if (error) throw error

      const ordens = (data || []).map(o => ({
        id: o.id,
        equipamento: o.equipamento,
        marca: o.marca,
        modelo: o.modelo,
        defeito: o.defeito_relatado,
        diagnostico: o.diagnostico,
        solucao: o.solucao,
        status: o.status,
        prioridade: o.prioridade,
        valor_orcamento: o.valor_orcamento,
        valor_final: o.valor_final,
        data_entrada: o.data_entrada,
        data_finalizacao: o.data_conclusao,
        tecnico_responsavel: o.tecnico_responsavel,
        cliente_nome: o.clientes?.nome || null,
        cliente_telefone: o.clientes?.telefone || null,
      }))

      const totais = {
        quantidade: ordens.length,
        valor_orcamento: ordens.reduce((sum, o) => sum + (parseFloat(o.valor_orcamento) || 0), 0),
        valor_final: ordens.reduce((sum, o) => sum + (parseFloat(o.valor_final) || 0), 0),
        por_status: {},
      }

      for (const ordem of ordens) {
        totais.por_status[ordem.status] = (totais.por_status[ordem.status] || 0) + 1
      }

      res.json({ success: true, data: { ordens, totais, filtros: { data_inicio, data_fim, status, tecnico } } })
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }
}

module.exports = new OrdemController()
