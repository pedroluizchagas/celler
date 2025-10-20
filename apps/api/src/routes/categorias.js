import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

export const router = Router()

// Listar categorias
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// Buscar por ID
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Categoria não encontrada' })
  res.json(data)
})

// Criar categoria
router.post('/', async (req, res) => {
  const body = req.body || {}
  const { valid, errors, payload } = validateCategoria(body)
  if (!valid) return res.status(400).json({ error: 'Dados inválidos', message: 'Dados inválidos', details: errors })

  const { data, error } = await supabase
    .from('categorias')
    .insert(payload)
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Nome de categoria já existe' })
    return res.status(500).json({ error: error.message })
  }
  res.status(201).json(data)
})

// Atualizar categoria
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const body = req.body || {}
  const { valid, errors, payload } = validateCategoria(body, true)
  if (!valid) return res.status(400).json({ error: 'Dados inválidos', message: 'Dados inválidos', details: errors })

  const { data, error } = await supabase
    .from('categorias')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()
  if (error && error.code !== 'PGRST116') {
    if (error.code === '23505') return res.status(409).json({ error: 'Nome de categoria já existe' })
    return res.status(500).json({ error: error.message })
  }
  if (!data) return res.status(404).json({ error: 'Categoria não encontrada' })
  res.json(data)
})

// Desativar categoria (soft delete)
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
  const { data, error } = await supabase
    .from('categorias')
    .update({ ativo: false })
    .eq('id', id)
    .select('id')
    .single()
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Categoria não encontrada' })
  res.json({ ok: true })
})

function validateCategoria(body = {}, isUpdate = false) {
  const errors = []
  const payload = {}

  if (!isUpdate) {
    if (!body.nome || typeof body.nome !== 'string' || !body.nome.trim()) {
      errors.push({ path: 'nome', message: 'Nome é obrigatório' })
    }
  }

  if (body.nome !== undefined) {
    if (typeof body.nome !== 'string' || !body.nome.trim()) {
      errors.push({ path: 'nome', message: 'Nome deve ser uma string não vazia' })
    } else {
      payload.nome = body.nome.trim()
    }
  }

  if (body.descricao !== undefined) {
    if (body.descricao !== null && typeof body.descricao !== 'string') {
      errors.push({ path: 'descricao', message: 'Descrição inválida' })
    } else {
      payload.descricao = body.descricao
    }
  }

  if (body.icone !== undefined) {
    if (body.icone !== null && typeof body.icone !== 'string') {
      errors.push({ path: 'icone', message: 'Ícone inválido' })
    } else {
      payload.icone = body.icone
    }
  }

  if (body.ativo !== undefined) {
    if (typeof body.ativo !== 'boolean') {
      errors.push({ path: 'ativo', message: 'Ativo deve ser booleano' })
    } else {
      payload.ativo = body.ativo
    }
  }

  return { valid: errors.length === 0, errors, payload }
}
