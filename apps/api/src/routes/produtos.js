import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { ProductCreateSchema, ProductUpdateSchema, MovimentacaoSchema, formatZodError } from '../validation/schemas.js'

export const router = Router()

// Listar produtos (com filtros simples)
router.get('/', async (req, res) => {
  const q = req.query || {}
  let query = supabase.from('produtos').select('*').order('created_at', { ascending: false })
  if (q.categoria_id) query = query.eq('categoria_id', Number(q.categoria_id))
  if (q.tipo) query = query.eq('tipo', String(q.tipo))
  if (q.busca) {
    const like = `%${String(q.busca).trim()}%`
    query = query.or(`nome.ilike.${like},codigo_barras.ilike.${like},codigo_interno.ilike.${like}`)
  }
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// Alertas ativos (definido antes de ":id" para evitar conflito)
router.get('/alertas', async (_req, res) => {
  const q = await supabase
    .from('alertas_estoque')
    .select('*')
    .eq('ativo', true)
    .order('data_alerta', { ascending: false })
  if (q.error) return res.status(500).json({ error: q.error.message })
  const rows = q.data || []
  const ids = Array.from(new Set(rows.map((r) => r.produto_id)))

  let produtosMap = new Map()
  if (ids.length) {
    const p = await supabase
      .from('produtos')
      .select('id,nome,estoque_atual,estoque_minimo')
      .in('id', ids)
    if (!p.error) produtosMap = new Map((p.data || []).map((x) => [x.id, x]))
  }

  const alertas = rows.map((r) => {
    const prod = produtosMap.get(r.produto_id)
    const tipoUi = r.tipo === 'sem_estoque' ? 'estoque_zero' : r.tipo
    const mensagem = prod
      ? tipoUi === 'estoque_zero'
        ? `Produto sem estoque (atual: ${prod.estoque_atual || 0})`
        : `Estoque baixo (atual: ${prod.estoque_atual || 0}, mínimo: ${prod.estoque_minimo || 0})`
      : 'Alerta de estoque'
    return {
      id: r.id,
      produto_id: r.produto_id,
      produto_nome: prod?.nome || `Produto #${r.produto_id}`,
      tipo: tipoUi,
      mensagem,
      ativo: r.ativo,
      data_alerta: r.data_alerta,
      data_resolvido: r.data_resolvido,
    }
  })

  res.json(alertas)
})

// Estatísticas simples do estoque (antes de ":id")
router.get('/stats', async (_req, res) => {
  const all = await supabase.from('produtos').select('id, estoque_atual, estoque_minimo')
  if (all.error) return res.status(500).json({ error: all.error.message })
  const rows = all.data || []
  const resumo = {
    total_produtos: rows.length,
    sem_estoque: rows.filter((p) => (p.estoque_atual || 0) === 0).length,
    estoque_baixo: rows.filter((p) => (p.estoque_atual || 0) > 0 && (p.estoque_atual || 0) <= (p.estoque_minimo || 0)).length,
    disponivel: rows.filter((p) => (p.estoque_atual || 0) > (p.estoque_minimo || 0)).length,
  }
  res.json({ resumo })
})

// Buscar produto por ID (com movimentações básicas)
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const { data, error } = await supabase.from('produtos').select('*').eq('id', id).single()
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Produto não encontrado' })

  const mov = await supabase
    .from('movimentacoes_estoque')
    .select('*')
    .eq('produto_id', id)
    .order('data_movimentacao', { ascending: false })
    .limit(25)

  res.json({ ...data, movimentacoes: mov.data || [] })
})

// Buscar por código de barras ou código interno
router.get('/codigo/:codigo', async (req, res) => {
  const codigo = String(req.params.codigo)
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .or(`codigo_barras.eq.${codigo},codigo_interno.eq.${codigo}`)
    .limit(1)
  if (error) return res.status(500).json({ error: error.message })
  res.json((data && data[0]) || null)
})

// Criar produto
router.post('/', async (req, res) => {
  const body = req.body || {}
  const parsed = ProductCreateSchema.safeParse(body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos', message: 'Dados inválidos', details: formatZodError(parsed.error) })
  }
  const insert = normalizeProduto(parsed.data)
  const { data, error } = await supabase.from('produtos').insert(insert).select('*').single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// Atualizar produto
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const parsed = ProductUpdateSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos', message: 'Dados inválidos', details: formatZodError(parsed.error) })
  }
  const update = normalizeProduto(parsed.data)
  const { data, error } = await supabase
    .from('produtos')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Produto não encontrado' })
  res.json(data)
})

// Movimentar estoque
router.post('/:id/movimentar', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const parsed = MovimentacaoSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos', message: 'Dados inválidos', details: formatZodError(parsed.error) })
  }
  const { tipo = 'ajuste', quantidade, motivo = null, preco_unitario = null, observacoes = null } = parsed.data
  const { data: produto, error: e0 } = await supabase.from('produtos').select('*').eq('id', id).single()
  if (e0 && e0.code !== 'PGRST116') return res.status(500).json({ error: e0.message })
  if (!produto) return res.status(404).json({ error: 'Produto não encontrado' })

  const qtdAnterior = produto.estoque_atual || 0
  const delta = Number(quantidade) || 0
  const qtdAtual = computeEstoque(tipo, qtdAnterior, delta)

  // Atualiza estoque
  const { error: e1 } = await supabase
    .from('produtos')
    .update({ estoque_atual: qtdAtual, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (e1) return res.status(500).json({ error: e1.message })

  // Registra movimentação
  const mov = {
    produto_id: id,
    tipo,
    quantidade: delta,
    quantidade_anterior: qtdAnterior,
    quantidade_atual: qtdAtual,
    preco_unitario: toNum(preco_unitario),
    valor_total: toNum(preco_unitario) != null ? toNum(preco_unitario) * delta : null,
    motivo,
    observacoes,
    data_movimentacao: new Date().toISOString(),
  }
  const { error: e2 } = await supabase.from('movimentacoes_estoque').insert(mov)
  if (e2) return res.status(500).json({ error: e2.message })

  // Alertas
  await atualizarAlertasProduto(id, qtdAtual, produto.estoque_minimo)

  res.json({ ok: true, estoque_atual: qtdAtual })
})

// Alertas ativos
// rota '/alertas' consolidada acima

// Resolver alerta
router.put('/alertas/:id/resolver', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const { data, error } = await supabase
    .from('alertas_estoque')
    .update({ ativo: false, data_resolvido: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .single()
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Alerta não encontrado' })
  res.json({ ok: true })
})

// Estatísticas simples do estoque
// rota '/stats' consolidada acima

function normalizeProduto(body = {}) {
  const toNum = (v, f = 0) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : f
  }
  const toNumOrNull = (v) => {
    if (v === undefined || v === null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return {
    nome: (body.nome || '').trim(),
    descricao: body.descricao ?? null,
    codigo_barras: body.codigo_barras ?? null,
    codigo_interno: body.codigo_interno ?? null,
    categoria_id: toNumOrNull(body.categoria_id),
    fornecedor_id: toNumOrNull(body.fornecedor_id),
    tipo: body.tipo === 'acessorio' || body.tipo === 'servico' ? body.tipo : 'peca',
    preco_custo: toNum(body.preco_custo),
    preco_venda: toNum(body.preco_venda),
    margem_lucro: toNum(body.margem_lucro),
    estoque_atual: toNum(body.estoque_atual),
    estoque_minimo: toNum(body.estoque_minimo, 0),
    estoque_maximo: toNum(body.estoque_maximo, 0),
    localizacao: body.localizacao ?? null,
    observacoes: body.observacoes ?? null,
    ativo: typeof body.ativo === 'boolean' ? body.ativo : true,
  }
}

function computeEstoque(tipo, atual, delta) {
  switch (String(tipo)) {
    case 'entrada':
      return Math.max(0, (atual || 0) + delta)
    case 'saida':
    case 'venda':
    case 'perda':
    case 'uso_os':
      return Math.max(0, (atual || 0) - Math.abs(delta))
    case 'ajuste':
    default:
      return Math.max(0, (atual || 0) + delta)
  }
}

async function atualizarAlertasProduto(produtoId, estoqueAtual, estoqueMinimo) {
  // Desativar alertas antigos
  await supabase
    .from('alertas_estoque')
    .update({ ativo: false, data_resolvido: new Date().toISOString() })
    .eq('produto_id', produtoId)
    .eq('ativo', true)

  // Criar alerta conforme situação
  let tipo = null
  if ((estoqueAtual || 0) === 0) tipo = 'sem_estoque'
  else if ((estoqueAtual || 0) > 0 && (estoqueAtual || 0) <= (estoqueMinimo || 0)) tipo = 'estoque_baixo'

  if (tipo) {
    await supabase.from('alertas_estoque').insert({ produto_id: produtoId, tipo })
  }
}

function toNum(v) {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
