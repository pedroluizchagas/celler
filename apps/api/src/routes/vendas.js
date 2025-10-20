import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { VendaCreateSchema, formatZodError } from '../validation/schemas.js'

export const router = Router()

// Estatísticas (definida antes de ":id" para evitar conflito com "/:id")
router.get('/estatisticas', async (_req, res) => {
  const now = new Date()
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const mes = await supabase
    .from('vendas')
    .select('valor_total', { count: 'exact' })
    .gte('data_venda', startMonth.toISOString())
    .lt('data_venda', endMonth.toISOString())
  if (mes.error) return res.status(500).json({ error: mes.error.message })
  const faturamento_mes = (mes.data || []).reduce((acc, v) => acc + (v.valor_total || 0), 0)

  const hoje = await supabase
    .from('vendas')
    .select('valor_total', { count: 'exact' })
    .gte('data_venda', startDay.toISOString())
    .lt('data_venda', endDay.toISOString())
  if (hoje.error) return res.status(500).json({ error: hoje.error.message })
  const faturamento_hoje = (hoje.data || []).reduce((acc, v) => acc + (v.valor_total || 0), 0)
  const total_vendas_hoje = hoje.count || 0
  const ticket_medio_hoje = total_vendas_hoje ? faturamento_hoje / total_vendas_hoje : 0

  res.json({
    mes: { total_vendas_mes: mes.count || 0, faturamento_mes },
    hoje: { total_vendas: total_vendas_hoje, ticket_medio_hoje },
  })
})

// Listar vendas (simples; suporta page/limit)
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)))
  const from = (page - 1) * limit
  const to = from + limit - 1

  let base = supabase.from('vendas').select('*', { count: 'exact' }).order('data_venda', { ascending: false })
  if (req.query.cliente_id) base = base.eq('cliente_id', Number(req.query.cliente_id))
  if (req.query.tipo_pagamento) base = base.eq('tipo_pagamento', String(req.query.tipo_pagamento))

  const { data, error, count } = await base.range(from, to)
  if (error) return res.status(500).json({ error: error.message })

  const vendas = await attachClienteVendas(data || [])
  const itensCount = await getItensCount(vendas.map((v) => v.id))
  const list = vendas.map((v) => ({
    id: v.id,
    numero_venda: v.numero_venda || `V${v.id}`,
    data_venda: v.data_venda,
    cliente_id: v.cliente_id,
    cliente_nome: v._cliente?.nome || null,
    tipo_pagamento: v.tipo_pagamento,
    valor_total: v.valor_total || 0,
    desconto: v.desconto || 0,
    total_itens: itensCount.get(v.id) || 0,
  }))

  res.json({ data: list, pagination: { page, limit, total: count || 0, pages: count ? Math.ceil(count / limit) : 1 } })
})

// Migração de vendas para financeiro (stub)
router.post('/migrar-financeiro', async (_req, res) => {
  // No futuro, este endpoint pode consolidar dados em fluxo_caixa.
  res.json({ ok: true, message: 'Migração executada (stub). Nenhuma alteração realizada.' })
})

// Detalhe da venda com itens
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const vendaQ = await supabase.from('vendas').select('*').eq('id', id).single()
  if (vendaQ.error && vendaQ.error.code !== 'PGRST116') return res.status(500).json({ error: vendaQ.error.message })
  if (!vendaQ.data) return res.status(404).json({ error: 'Venda não encontrada' })

  const venda = vendaQ.data
  const cliente = await supabase.from('clientes').select('id,nome').eq('id', venda.cliente_id).single()
  const itensQ = await supabase
    .from('venda_itens')
    .select('id, produto_id, quantidade, preco_unitario, total_item')
    .eq('venda_id', id)
    .order('id', { ascending: true })
  if (itensQ.error) return res.status(500).json({ error: itensQ.error.message })

  // enrich itens com produto nome (opcional)
  const prodIds = Array.from(new Set((itensQ.data || []).map((i) => i.produto_id)))
  let prodMap = new Map()
  if (prodIds.length) {
    const prods = await supabase.from('produtos').select('id,nome').in('id', prodIds)
    if (!prods.error) prodMap = new Map((prods.data || []).map((p) => [p.id, p]))
  }
  const itens = (itensQ.data || []).map((i) => ({ ...i, produto_nome: prodMap.get(i.produto_id)?.nome || null }))

  res.json({
    id: venda.id,
    numero_venda: venda.numero_venda || `V${venda.id}`,
    data_venda: venda.data_venda,
    cliente_id: venda.cliente_id,
    cliente_nome: cliente.data?.nome || null,
    tipo_pagamento: venda.tipo_pagamento,
    valor_total: venda.valor_total || 0,
    desconto: venda.desconto || 0,
    observacoes: venda.observacoes || null,
    itens,
  })
})

// Criar venda com itens + baixar estoque
router.post('/', async (req, res) => {
  const body = req.body || {}
  const parsed = VendaCreateSchema.safeParse(body)
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', message: 'Dados inválidos', details: formatZodError(parsed.error) })
  const { cliente_id = null, tipo_pagamento, desconto = 0, observacoes = null, itens } = parsed.data

  // calcular totais
  const subtotal = itens.reduce((acc, it) => acc + it.preco_unitario * it.quantidade, 0)
  const valor_total = Math.max(0, subtotal - (desconto || 0))

  // cria venda básica
  const vendaIns = await supabase
    .from('vendas')
    .insert({ cliente_id, tipo_pagamento, desconto, valor_total, observacoes })
    .select('*')
    .single()
  if (vendaIns.error) return res.status(500).json({ error: vendaIns.error.message })

  const vendaId = vendaIns.data.id

  // cria itens e baixa estoque
  for (const it of itens) {
    // estoque
    const prod = await supabase.from('produtos').select('id, estoque_atual, estoque_minimo').eq('id', it.produto_id).single()
    if (prod.error && prod.error.code !== 'PGRST116') return res.status(500).json({ error: prod.error.message })
    if (!prod.data) return res.status(400).json({ error: `Produto ${it.produto_id} não encontrado` })
    const novoEstoque = Math.max(0, (prod.data.estoque_atual || 0) - it.quantidade)
    const up = await supabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', it.produto_id)
    if (up.error) return res.status(500).json({ error: up.error.message })

    // mov
    const mov = await supabase.from('movimentacoes_estoque').insert({
      produto_id: it.produto_id,
      tipo: 'venda',
      quantidade: it.quantidade,
      quantidade_anterior: prod.data.estoque_atual || 0,
      quantidade_atual: novoEstoque,
      preco_unitario: it.preco_unitario,
      valor_total: it.preco_unitario * it.quantidade,
      motivo: 'venda',
      referencia_id: vendaId,
      referencia_tipo: 'venda',
    })
    if (mov.error) return res.status(500).json({ error: mov.error.message })

    const itemIns = await supabase.from('venda_itens').insert({ venda_id: vendaId, produto_id: it.produto_id, quantidade: it.quantidade, preco_unitario: it.preco_unitario })
    if (itemIns.error) return res.status(500).json({ error: itemIns.error.message })
  }

  // numero_venda
  const nv = `V${String(vendaId).padStart(6, '0')}`
  await supabase.from('vendas').update({ numero_venda: nv }).eq('id', vendaId)

  // Integração Financeiro: registrar entrada
  await supabase.from('fluxo_caixa').insert({
    tipo: 'entrada',
    valor: valor_total,
    descricao: `Venda ${nv}`,
    origem_tipo: 'venda',
    origem_id: vendaId,
    data_movimentacao: new Date().toISOString(),
  })

  res.status(201).json({ id: vendaId, numero_venda: nv, valor_total })
})

// Relatório simples
router.get('/relatorio', async (req, res) => {
  const { data, error } = await supabase.from('vendas').select('id, data_venda, valor_total, desconto, tipo_pagamento').order('data_venda', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ total: (data || []).length, itens: data || [] })
})

// Estatísticas (hoje e mês)
router.get('/estatisticas', async (_req, res) => {
  const now = new Date()
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const mes = await supabase
    .from('vendas')
    .select('valor_total', { count: 'exact' })
    .gte('data_venda', startMonth.toISOString())
    .lt('data_venda', endMonth.toISOString())
  if (mes.error) return res.status(500).json({ error: mes.error.message })
  const faturamento_mes = (mes.data || []).reduce((acc, v) => acc + (v.valor_total || 0), 0)

  const hoje = await supabase
    .from('vendas')
    .select('valor_total', { count: 'exact' })
    .gte('data_venda', startDay.toISOString())
    .lt('data_venda', endDay.toISOString())
  if (hoje.error) return res.status(500).json({ error: hoje.error.message })
  const faturamento_hoje = (hoje.data || []).reduce((acc, v) => acc + (v.valor_total || 0), 0)
  const total_vendas_hoje = hoje.count || 0
  const ticket_medio_hoje = total_vendas_hoje ? faturamento_hoje / total_vendas_hoje : 0

  res.json({
    mes: { total_vendas_mes: mes.count || 0, faturamento_mes },
    hoje: { total_vendas: total_vendas_hoje, ticket_medio_hoje },
  })
})

async function attachClienteVendas(rows) {
  const ids = Array.from(new Set(rows.map((r) => r.cliente_id).filter(Boolean)))
  if (!ids.length) return rows
  const c = await supabase.from('clientes').select('id,nome').in('id', ids)
  if (c.error) return rows
  const map = new Map((c.data || []).map((x) => [x.id, x]))
  return rows.map((r) => ({ ...r, _cliente: map.get(r.cliente_id) }))
}

async function getItensCount(vendaIds) {
  if (!vendaIds.length) return new Map()
  const q = await supabase
    .from('venda_itens')
    .select('venda_id, quantidade')
    .in('venda_id', vendaIds)
  if (q.error) return new Map()
  const map = new Map()
  for (const r of q.data || []) {
    map.set(r.venda_id, (map.get(r.venda_id) || 0) + (r.quantidade || 0))
  }
  return map
}
