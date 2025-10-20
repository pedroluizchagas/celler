import { Router } from 'express'
import { supabase, storageBucket } from '../lib/supabase.js'
import { uploadFotos } from '../middleware/upload.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { OrderCreateSchema, OrderUpdateSchema, OrderStatusSchema, formatZodError } from '../validation/schemas.js'

export const router = Router()

// Listar ordens
router.get('/', async (req, res) => {
  const q = req.query || {}
  let query = supabase.from('ordens').select('*').order('created_at', { ascending: false })
  if (q.status) query = query.eq('status', mapStatus(String(q.status)))
  if (q.prioridade) query = query.eq('prioridade', String(q.prioridade))
  if (q.cliente_id) query = query.eq('cliente_id', Number(q.cliente_id))
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  const rows = Array.isArray(data) ? data : []
  const withClient = await attachCliente(rows)
  res.json(withClient.map(toFrontOrdem))
})

// Estatísticas (deve vir ANTES de ":id" para não conflitar)
router.get('/stats', async (_req, res) => {
  // total de ordens
  const totalOrdensRes = await supabase
    .from('ordens')
    .select('*', { count: 'exact', head: true })
  if (totalOrdensRes.error) return res.status(500).json({ error: totalOrdensRes.error.message })
  const total_ordens = totalOrdensRes.count || 0

  // total de clientes
  const totalClientesRes = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
  if (totalClientesRes.error) return res.status(500).json({ error: totalClientesRes.error.message })
  const total_clientes = totalClientesRes.count || 0

  // contagens por status (snake_case esperado no front)
  const statusMap = [
    ['recebido', 'Recebido'],
    ['em_analise', 'Em Análise'],
    ['aguardando_pecas', 'Aguardando Peças'],
    ['em_reparo', 'Em Reparo'],
    ['pronto', 'Pronto'],
    ['entregue', 'Entregue'],
    ['cancelado', 'Cancelado'],
  ]
  const ordens_por_status = {}
  for (const [snake, label] of statusMap) {
    const { count, error } = await supabase
      .from('ordens')
      .select('*', { count: 'exact', head: true })
      .eq('status', label)
    if (error) return res.status(500).json({ error: error.message })
    ordens_por_status[snake] = count || 0
  }

  // últimas ordens
  const { data: ultimas_ordens, error: e2 } = await supabase
    .from('ordens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  if (e2) return res.status(500).json({ error: e2.message })

  // faturamento mensal (ordens entregues no mês)
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const { data: entregues, error: e3 } = await supabase
    .from('ordens')
    .select('valor_final,valor_orcamento,updated_at')
    .eq('status', 'Entregue')
    .gte('updated_at', start.toISOString())
    .lt('updated_at', end.toISOString())
  if (e3) return res.status(500).json({ error: e3.message })
  const faturamento_mensal = (entregues || []).reduce((acc, o) => acc + (o.valor_final ?? o.valor_orcamento ?? 0), 0)

  res.json({ total_ordens, total_clientes, faturamento_mensal, ordens_por_status, ultimas_ordens: ultimas_ordens || [] })
})

// Relatório (colocar ANTES de ":id" para não conflitar)
router.get('/relatorio', async (req, res) => {
  const q = req.query || {}
  let query = supabase.from('ordens').select('*').order('created_at', { ascending: false })
  if (q.status) query = query.eq('status', mapStatus(String(q.status)))
  if (q.cliente_id) query = query.eq('cliente_id', Number(q.cliente_id))
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  const rows = Array.isArray(data) ? data : []
  const withClient = await attachCliente(rows)
  const list = withClient.map(toFrontOrdem)
  res.json({ total: list.length, ordens: list })
})

// Buscar por ID
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const { data, error } = await supabase
    .from('ordens')
    .select('*')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Ordem não encontrada' })
  const [withClient] = await attachCliente([data])
  res.json(toFrontOrdem(withClient))
})

// Criar ordem (suporta FormData com pecas/servicos serializados)
router.post('/', uploadFotos.array('fotos', 5), async (req, res, next) => {
  try {
    const body = normalizeOrdemBody(req.body)
    const parsed = OrderCreateSchema.safeParse(body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', message: 'Dados inválidos', details: formatZodError(parsed.error) })
    }
    const insert = {
      cliente_id: parsed.data.cliente_id,
      equipamento: parsed.data.equipamento,
      problema: parsed.data.problema,
      status: parsed.data.status || 'Recebido',
      prioridade: parsed.data.prioridade || 'normal',
      marca: parsed.data.marca || null,
      modelo: parsed.data.modelo || null,
      numero_serie: parsed.data.numero_serie || null,
      tecnico_responsavel: parsed.data.tecnico_responsavel || null,
      valor_orcamento: parsed.data.valor_orcamento,
      valor_final: parsed.data.valor_final,
      pecas: parsed.data.pecas,
      servicos: parsed.data.servicos,
      observacoes: parsed.data.observacoes ?? null,
    }
    const { data: created, error } = await supabase
      .from('ordens')
      .insert(insert)
      .select('*')
      .single()
    if (error) return res.status(500).json({ error: error.message })

    // histórico inicial
    await supabase.from('ordem_status_history').insert({
      ordem_id: created.id,
      status: created.status,
      observacoes: 'Ordem criada',
    })

    // uploads, se houver
    const fotosSaved = await saveFotosToStorage(created.id, req.files || [])
    if (fotosSaved.length) {
      await supabase.from('ordem_fotos').insert(
        fotosSaved.map((f) => ({
          ordem_id: created.id,
          storage_path: f.path,
          mimetype: f.mimetype,
          size: f.size,
        }))
      )
    }

    res.status(201).json(created)
  } catch (err) {
    next(err)
  }
})

// Atualizar ordem
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const body = normalizeOrdemBody(req.body)
  const parsed = OrderUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos', message: 'Dados inválidos', details: formatZodError(parsed.error) })
  }
  const update = { ...parsed.data }
  const { data, error } = await supabase
    .from('ordens')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Ordem não encontrada' })
  res.json(data)
})

// Excluir ordem
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const { error } = await supabase.from('ordens').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// Mudar status
router.patch('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const parsed = OrderStatusSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos', message: 'Dados inválidos', details: formatZodError(parsed.error) })
  }
  const { status, observacoes = '' } = parsed.data
  const { data, error } = await supabase
    .from('ordens')
    .update({ status: mapStatus(String(status)) })
    .eq('id', id)
    .select('*')
    .single()
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Ordem não encontrada' })

  await supabase.from('ordem_status_history').insert({
    ordem_id: id,
    status: mapStatus(String(status)),
    observacoes: String(observacoes || ''),
  })

  // Integração Financeiro: ao entregar, registrar entrada se não existir
  if (mapStatus(String(status)) === 'Entregue') {
    const valor = data.valor_final ?? data.valor_orcamento ?? 0
    if (valor && valor > 0) {
      const exists = await supabase
        .from('fluxo_caixa')
        .select('id', { head: true, count: 'exact' })
        .eq('origem_tipo', 'ordem')
        .eq('origem_id', id)
      if (!exists.error && (exists.count || 0) === 0) {
        await supabase.from('fluxo_caixa').insert({
          tipo: 'entrada',
          valor,
          descricao: `Recebimento OS #${id}`,
          origem_tipo: 'ordem',
          origem_id: id,
          data_movimentacao: new Date().toISOString(),
        })
      }
    }
  }

  res.json(data)
})

// Histórico
router.get('/:id/historico', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const { data, error } = await supabase
    .from('ordem_status_history')
    .select('*')
    .eq('ordem_id', id)
    .order('created_at', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// (rotas /stats e /relatorio movidas para cima)

// Upload de fotos
router.post('/:id/fotos', uploadFotos.array('fotos', 5), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
    const { data: ordem, error: e0 } = await supabase.from('ordens').select('id').eq('id', id).single()
    if (e0 && e0.code !== 'PGRST116') return res.status(500).json({ error: e0.message })
    if (!ordem) return res.status(404).json({ error: 'Ordem não encontrada' })

    const saved = await saveFotosToStorage(id, req.files || [])
    if (saved.length) {
      await supabase.from('ordem_fotos').insert(
        saved.map((f) => ({
          ordem_id: id,
          storage_path: f.path,
          mimetype: f.mimetype,
          size: f.size,
        }))
      )
    }

    res.status(201).json({ ok: true, fotos: saved })
  } catch (err) {
    next(err)
  }
})

// Listar fotos com URL assinada/pública
router.get('/:id/fotos', async (req, res) => {
  const id = Number(req.params.id)
  const { data, error } = await supabase
    .from('ordem_fotos')
    .select('id, storage_path, mimetype, size, created_at')
    .eq('ordem_id', id)
    .order('created_at', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })

  const fotos = await Promise.all(
    (data || []).map(async (f) => {
      const url = await getFileUrl(f.storage_path)
      return { id: f.id, path: f.storage_path, url, mimetype: f.mimetype, size: f.size, created_at: f.created_at }
    })
  )

  res.json(fotos)
})

// Excluir foto (remove do storage e do banco)
router.delete('/:id/fotos/:fotoId', async (req, res) => {
  const id = Number(req.params.id)
  const fotoId = Number(req.params.fotoId)
  const q = await supabase
    .from('ordem_fotos')
    .select('id, storage_path')
    .eq('id', fotoId)
    .eq('ordem_id', id)
    .single()
  if (q.error && q.error.code !== 'PGRST116') return res.status(500).json({ error: q.error.message })
  if (!q.data) return res.status(404).json({ error: 'Foto não encontrada' })

  const pathToRemove = q.data.storage_path
  const rm = await supabase.storage.from(storageBucket.ordens).remove([pathToRemove])
  if (rm.error) return res.status(500).json({ error: rm.error.message })

  const del = await supabase.from('ordem_fotos').delete().eq('id', fotoId).eq('ordem_id', id)
  if (del.error) return res.status(500).json({ error: del.error.message })
  res.json({ ok: true })
})

function mimetypeToExt(m) {
  switch (m) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    default:
      return ''
  }
}

function normalizeOrdemBody(body = {}) {
  const parseArr = (v) => {
    if (!v) return []
    if (Array.isArray(v)) return v
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  const toNum = (v) => (v === '' || v === undefined || v === null ? null : Number(v))
  return {
    cliente_id: body.cliente_id ? Number(body.cliente_id) : null,
    equipamento: (body.equipamento || body.marca || body.modelo) ? String(body.equipamento || `${body.marca || ''} ${body.modelo || ''}` ).trim() : '',
    problema: String(body.defeito || body.problema || '').trim(),
    status: mapStatus(body.status),
    prioridade: (body.prioridade || 'normal').toString().toLowerCase(),
    marca: body.marca ? String(body.marca).trim() : null,
    modelo: body.modelo ? String(body.modelo).trim() : null,
    numero_serie: body.numero_serie ? String(body.numero_serie).trim() : null,
    tecnico_responsavel: body.tecnico_responsavel ? String(body.tecnico_responsavel).trim() : null,
    diagnostico: body.diagnostico ? String(body.diagnostico).trim() : null,
    solucao: body.solucao ? String(body.solucao).trim() : null,
    valor_orcamento: toNum(body.valor_orcamento),
    valor_final: toNum(body.valor_final),
    pecas: parseArr(body.pecas),
    servicos: parseArr(body.servicos),
    observacoes: body.observacoes || body.descricao || null,
  }
}

function mapStatus(s) {
  if (!s) return 'Recebido'
  const v = String(s).toLowerCase()
  switch (v) {
    case 'recebido':
      return 'Recebido'
    case 'em_analise':
    case 'em análise':
      return 'Em Análise'
    case 'aguardando_pecas':
    case 'aguardando peças':
      return 'Aguardando Peças'
    case 'em_reparo':
      return 'Em Reparo'
    case 'pronto':
      return 'Pronto'
    case 'entregue':
      return 'Entregue'
    case 'cancelado':
      return 'Cancelado'
    default:
      return s
  }
}

async function saveFotosToStorage(ordemId, files) {
  const saved = []
  for (const file of files) {
    const ext = mimetypeToExt(file.mimetype)
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    const storagePath = `${ordemId}/${name}`
    const { error } = await supabase
      .storage
      .from(storageBucket.ordens)
      .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false })
    if (error) throw error
    saved.push({ filename: name, path: storagePath, mimetype: file.mimetype, size: file.size })
  }
  return saved
}

function snakifyStatus(s) {
  if (!s) return 'recebido'
  const v = String(s).toLowerCase()
  switch (v) {
    case 'recebido':
      return 'recebido'
    case 'em análise':
    case 'em analise':
    case 'em_analise':
      return 'em_analise'
    case 'aguardando peças':
    case 'aguardando pecas':
    case 'aguardando_pecas':
      return 'aguardando_pecas'
    case 'em reparo':
    case 'em_reparo':
      return 'em_reparo'
    case 'pronto':
      return 'pronto'
    case 'entregue':
      return 'entregue'
    case 'cancelado':
      return 'cancelado'
    default:
      return v.replace(/\s+/g, '_')
  }
}

function toFrontOrdem(row) {
  const statusSnake = snakifyStatus(row.status)
  return {
    id: row.id,
    cliente_id: row.cliente_id,
    cliente_nome: row._cliente?.nome || row.cliente_nome || '',
    cliente_telefone: row._cliente?.telefone || row.cliente_telefone || '',
    equipamento: row.equipamento || '',
    marca: row.marca || '',
    modelo: row.modelo || '',
    numero_serie: row.numero_serie || '',
    defeito: row.problema || row.defeito || '',
    descricao: row.observacoes || row.descricao || '',
    diagnostico: row.diagnostico || '',
    solucao: row.solucao || '',
    status: statusSnake,
    prioridade: row.prioridade || 'normal',
    valor_orcamento: row.valor_orcamento ?? null,
    valor_final: row.valor_final ?? null,
    data_entrada: row.created_at,
    tecnico_responsavel: row.tecnico_responsavel || '',
    pecas: row.pecas || [],
    servicos: row.servicos || [],
    updated_at: row.updated_at,
    created_at: row.created_at,
  }
}

async function attachCliente(rows) {
  const ids = Array.from(new Set(rows.map((r) => r.cliente_id).filter(Boolean)))
  if (!ids.length) return rows
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id,nome,telefone')
    .in('id', ids)
  if (error) return rows
  const map = new Map((clientes || []).map((c) => [c.id, c]))
  return rows.map((r) => ({ ...r, _cliente: map.get(r.cliente_id) }))
}

async function getFileUrl(storagePath) {
  // Tenta URL pública (caso bucket seja público)
  const pub = supabase.storage.from(storageBucket.ordens).getPublicUrl(storagePath)
  if (pub?.data?.publicUrl) return pub.data.publicUrl
  // Fallback: URL assinada (1h)
  const signed = await supabase.storage.from(storageBucket.ordens).createSignedUrl(storagePath, 3600)
  if (signed?.data?.signedUrl) return signed.data.signedUrl
  return null
}
