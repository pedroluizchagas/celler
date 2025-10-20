// Store em memória para desenvolvimento

let nextClienteId = 1
let nextOrdemId = 1

const clientes = []
const ordens = []

const nowIso = () => new Date().toISOString()

export const db = {
  // ==================== CLIENTES ====================
  createCliente(data) {
    const c = {
      id: nextClienteId++,
      nome: String(data?.nome || '').trim(),
      telefone: String(data?.telefone || '').trim(),
      email: String(data?.email || '').trim(),
      endereco: data?.endereco || null,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    clientes.push(c)
    return c
  },

  listClientes() {
    return [...clientes]
  },

  getCliente(id) {
    return clientes.find((c) => c.id === id) || null
  },

  updateCliente(id, data) {
    const c = clientes.find((x) => x.id === id)
    if (!c) return null
    c.nome = data?.nome !== undefined ? String(data.nome).trim() : c.nome
    c.telefone = data?.telefone !== undefined ? String(data.telefone).trim() : c.telefone
    c.email = data?.email !== undefined ? String(data.email).trim() : c.email
    c.endereco = data?.endereco !== undefined ? data.endereco : c.endereco
    c.updated_at = nowIso()
    return c
  },

  deleteCliente(id) {
    const idx = clientes.findIndex((c) => c.id === id)
    if (idx >= 0) clientes.splice(idx, 1)
    return true
  },

  searchClientes(q) {
    const t = (q || '').toString().toLowerCase()
    if (!t) return []
    return clientes.filter(
      (c) => c.nome.toLowerCase().includes(t) || c.telefone.toLowerCase().includes(t)
    )
  },

  // ==================== ORDENS ====================
  createOrdem(data) {
    const o = {
      id: nextOrdemId++,
      cliente_id: data?.cliente_id ? Number(data.cliente_id) : null,
      equipamento: String(data?.equipamento || '').trim(),
      problema: String(data?.problema || '').trim(),
      status: String(data?.status || 'Recebido'),
      valor_orcamento: data?.valor_orcamento ? Number(data.valor_orcamento) : null,
      valor_final: data?.valor_final ? Number(data.valor_final) : null,
      pecas: safeJsonArray(data?.pecas),
      servicos: safeJsonArray(data?.servicos),
      observacoes: data?.observacoes || null,
      created_at: nowIso(),
      updated_at: nowIso(),
      historico: [
        { data: nowIso(), acao: 'criada', status: 'Recebido', observacoes: 'Ordem criada' },
      ],
      fotos: [], // { filename, path, mimetype, size }
    }
    ordens.push(o)
    return o
  },

  listOrdens(filters = {}) {
    let result = [...ordens]
    if (filters.status) {
      const s = String(filters.status)
      result = result.filter((o) => o.status === s)
    }
    if (filters.cliente_id) {
      const id = Number(filters.cliente_id)
      result = result.filter((o) => o.cliente_id === id)
    }
    return result
  },

  getOrdem(id) {
    return ordens.find((o) => o.id === id) || null
  },

  updateOrdem(id, data) {
    const o = ordens.find((x) => x.id === id)
    if (!o) return null
    if (data.equipamento !== undefined) o.equipamento = String(data.equipamento).trim()
    if (data.problema !== undefined) o.problema = String(data.problema).trim()
    if (data.valor_orcamento !== undefined) o.valor_orcamento = toNumberOrNull(data.valor_orcamento)
    if (data.valor_final !== undefined) o.valor_final = toNumberOrNull(data.valor_final)
    if (data.pecas !== undefined) o.pecas = safeJsonArray(data.pecas)
    if (data.servicos !== undefined) o.servicos = safeJsonArray(data.servicos)
    if (data.observacoes !== undefined) o.observacoes = data.observacoes
    o.updated_at = nowIso()
    return o
  },

  deleteOrdem(id) {
    const idx = ordens.findIndex((o) => o.id === id)
    if (idx >= 0) ordens.splice(idx, 1)
    return true
  },

  pushStatus(id, status, observacoes = '') {
    const o = ordens.find((x) => x.id === id)
    if (!o) return null
    o.status = status
    o.historico.push({ data: nowIso(), acao: 'status', status, observacoes })
    o.updated_at = nowIso()
    return o
  },

  addFotos(id, fotos) {
    const o = ordens.find((x) => x.id === id)
    if (!o) return null
    o.fotos.push(...fotos)
    o.updated_at = nowIso()
    return o
  },

  historico(id) {
    const o = ordens.find((x) => x.id === id)
    if (!o) return []
    return o.historico
  },

  stats() {
    const por_status = {
      'Recebido': 0,
      'Em Análise': 0,
      'Aguardando Peças': 0,
      'Em Reparo': 0,
      'Pronto': 0,
      'Entregue': 0,
      'Cancelado': 0,
    }
    ordens.forEach((o) => {
      por_status[o.status] = (por_status[o.status] || 0) + 1
    })
    const ultimas_ordens = ordens.slice(-5).reverse()
    const faturamento_mensal = ordens
      .filter((o) => o.status === 'Entregue')
      .reduce((acc, o) => acc + (o.valor_final ?? o.valor_orcamento ?? 0), 0)
    return { por_status, ultimas_ordens, faturamento_mensal }
  },
}

function toNumberOrNull(v) {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function safeJsonArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

