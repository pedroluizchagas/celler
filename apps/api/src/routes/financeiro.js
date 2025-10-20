import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

export const router = Router()

// Fluxo de caixa - listar
router.get('/fluxo-caixa', async (req, res) => {
  const q = req.query || {}
  let query = supabase.from('fluxo_caixa').select('*').order('data_movimentacao', { ascending: false })
  if (q.tipo) query = query.eq('tipo', String(q.tipo))
  if (q.categoria_id) query = query.eq('categoria_id', Number(q.categoria_id))
  if (q.data_inicio) query = query.gte('data_movimentacao', new Date(String(q.data_inicio)).toISOString())
  if (q.data_fim) query = query.lte('data_movimentacao', new Date(String(q.data_fim)).toISOString())
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// Fluxo de caixa - criar movimentação manual
router.post('/fluxo-caixa', async (req, res) => {
  const body = req.body || {}
  if (!['entrada', 'saida'].includes(String(body.tipo))) {
    return res.status(400).json({ error: 'Tipo inválido' })
  }
  const valor = Number(body.valor)
  if (!Number.isFinite(valor) || valor < 0) return res.status(400).json({ error: 'Valor inválido' })
  const insert = {
    tipo: String(body.tipo),
    valor,
    categoria_id: body.categoria_id ? Number(body.categoria_id) : null,
    descricao: body.descricao || null,
    data_movimentacao: body.data_movimentacao ? new Date(body.data_movimentacao).toISOString() : new Date().toISOString(),
    origem_tipo: body.origem_tipo || 'manual',
    origem_id: body.origem_id || null,
  }
  const { data, error } = await supabase.from('fluxo_caixa').insert(insert).select('*').single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// Resumo do fluxo de caixa
router.get('/fluxo-caixa/resumo', async (req, res) => {
  const q = req.query || {}
  let query = supabase.from('fluxo_caixa').select('tipo, valor, data_movimentacao')
  if (q.data_inicio) query = query.gte('data_movimentacao', new Date(String(q.data_inicio)).toISOString())
  if (q.data_fim) query = query.lte('data_movimentacao', new Date(String(q.data_fim)).toISOString())
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  const entradas = (data || []).filter((r) => r.tipo === 'entrada').reduce((acc, r) => acc + (r.valor || 0), 0)
  const saidas = (data || []).filter((r) => r.tipo === 'saida').reduce((acc, r) => acc + (r.valor || 0), 0)
  res.json({ entradas, saidas, saldo: entradas - saidas })
})

// Dashboard financeiro
router.get('/dashboard', async (_req, res) => {
  const all = await supabase.from('fluxo_caixa').select('tipo, valor').order('data_movimentacao', { ascending: false })
  if (all.error) return res.status(500).json({ error: all.error.message })
  const entradas = (all.data || []).filter((r) => r.tipo === 'entrada').reduce((acc, r) => acc + (r.valor || 0), 0)
  const saidas = (all.data || []).filter((r) => r.tipo === 'saida').reduce((acc, r) => acc + (r.valor || 0), 0)
  const ultimas_movimentacoes = (all.data || []).slice(0, 10)
  res.json({ saldo_atual: entradas - saidas, ultimas_movimentacoes })
})

// Categorias financeiras
router.get('/categorias', async (req, res) => {
  const tipo = req.query.tipo ? String(req.query.tipo) : null
  let q = supabase.from('categorias_financeiras').select('*').eq('ativo', true).order('nome', { ascending: true })
  if (tipo) q = q.eq('tipo', tipo)
  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post('/categorias', async (req, res) => {
  const b = req.body || {}
  if (!b.nome || !b.tipo) return res.status(400).json({ error: 'Nome e tipo são obrigatórios' })
  const { data, error } = await supabase
    .from('categorias_financeiras')
    .insert({ nome: String(b.nome).trim(), tipo: String(b.tipo), descricao: b.descricao || null, icone: b.icone || null, cor: b.cor || null })
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Categoria financeira já existe' })
    return res.status(500).json({ error: error.message })
  }
  res.status(201).json(data)
})

// Relatório mensal simples
router.get('/relatorio-mensal', async (req, res) => {
  const mes = parseInt(String(req.query.mes || ''), 10)
  const ano = parseInt(String(req.query.ano || ''), 10)
  const base = new Date(ano || new Date().getFullYear(), (isNaN(mes) ? new Date().getMonth() : mes - 1), 1)
  const start = new Date(base.getFullYear(), base.getMonth(), 1)
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1)
  const q = await supabase
    .from('fluxo_caixa')
    .select('tipo, valor')
    .gte('data_movimentacao', start.toISOString())
    .lt('data_movimentacao', end.toISOString())
  if (q.error) return res.status(500).json({ error: q.error.message })
  const entradas = (q.data || []).filter((r) => r.tipo === 'entrada').reduce((acc, r) => acc + (r.valor || 0), 0)
  const saidas = (q.data || []).filter((r) => r.tipo === 'saida').reduce((acc, r) => acc + (r.valor || 0), 0)
  res.json({ mes: start.getMonth() + 1, ano: start.getFullYear(), entradas, saidas, saldo: entradas - saidas })
})
