import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

export const router = Router()

// Listar clientes
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// Buscar clientes por termo (?q=)
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim()
  if (!q) return res.json([])
  const like = `%${q}%`
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .or(`nome.ilike.${like},telefone.ilike.${like}`)
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// Buscar cliente por ID
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Cliente não encontrado' })
  res.json(data)
})

// Criar cliente
router.post('/', async (req, res) => {
  const body = req.body || {}
  if (!body.nome) return res.status(400).json({ error: 'Nome é obrigatório' })
  const insert = {
    nome: String(body.nome).trim(),
    telefone: body.telefone ? String(body.telefone).trim() : null,
    email: body.email ? String(body.email).trim() : null,
    endereco: body.endereco ?? null,
  }
  const { data, error } = await supabase
    .from('clientes')
    .insert(insert)
    .select('*')
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// Atualizar cliente
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const body = req.body || {}
  const update = {
    nome: body.nome !== undefined ? String(body.nome).trim() : undefined,
    telefone: body.telefone !== undefined ? String(body.telefone).trim() : undefined,
    email: body.email !== undefined ? String(body.email).trim() : undefined,
    endereco: body.endereco !== undefined ? body.endereco : undefined,
  }
  const { data, error } = await supabase
    .from('clientes')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Cliente não encontrado' })
  res.json(data)
})

// Excluir cliente
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// fim
