const { createClient } = require('@supabase/supabase-js')
const { sanitizeForDb } = require('./sanitize')
require('dotenv').config()

// Debug das variáveis de ambiente
console.log('🔍 Debug Supabase:')
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Configurado' : 'Não encontrado')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurado' : 'Não encontrado')

// Configuração do cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configurações do Supabase não encontradas. Verifique as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.')
  throw new Error('Configurações do Supabase são obrigatórias')
} else {
  console.log('✅ SERVICE ROLE ok')
}

// Cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

class SupabaseManager {
  constructor() {
    this.client = supabase
  }

  // Verificar se Supabase está configurado
  isReady() {
    return !!this.client
  }

  // Buscar todos os registros de uma tabela
  async all(table) {
    const { data, error } = await this.client
      .from(table)
      .select('*')
    
    if (error) throw error
    return data || []
  }

  // Buscar um registro por ID
  async get(table, id) {
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Registro não encontrado
      }
      throw error
    }
    return data
  }

  // Buscar registros com condições
  async find(table, conditions = {}) {
    let query = this.client.from(table).select('*')

    // Aplicar filtros
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  // Inserir dados em uma tabela
  async insert(table, data) {
    const payload = sanitizeForDb(data)
    const { data: result, error } = await this.client
      .from(table)
      .insert(payload)
      .select()

    if (error) throw error
    return result
  }

  // Atualizar dados em uma tabela
  async update(table, id, data) {
    const payload = sanitizeForDb(data)
    const { data: result, error } = await this.client
      .from(table)
      .update(payload)
      .eq('id', id)
      .select()

    if (error) throw error
    return result
  }

  // Deletar dados de uma tabela
  async delete(table, id) {
    const { error } = await this.client
      .from(table)
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }

  // Buscar com paginação
  async paginate(table, page = 1, limit = 10, conditions = {}) {
    const offset = (page - 1) * limit
    let query = this.client.from(table).select('*')

    // Aplicar filtros
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  // Contar registros
  async count(table, conditions = {}) {
    let query = this.client.from(table).select('*', { count: 'exact', head: true })

    // Aplicar filtros
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    const { count, error } = await query
    if (error) throw error
    return count || 0
  }

  // Executar RPC (stored procedures)
  async rpc(functionName, params = {}) {
    const { data, error } = await this.client.rpc(functionName, params)
    if (error) throw error
    return data
  }

  // Upload de arquivo
  async uploadFile(bucket, path, file) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file)

    if (error) throw error
    return data
  }

  // Obter URL pública de arquivo
  getPublicUrl(bucket, path) {
    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }

  // Buscar com relacionamentos usando select
  async findWithRelations(table, selectQuery, conditions = {}) {
    let query = this.client.from(table).select(selectQuery)

    // Aplicar filtros
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  // Buscar ordens com clientes (exemplo específico)
  async getOrdensWithClientes(limit = 10) {
    const { data, error } = await this.client
      .from('ordens')
      .select(`
        id, equipamento, defeito_relatado, status, prioridade, data_entrada, valor_final,
        clientes(nome)
      `)
      .order('data_entrada', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  }

  // Estatísticas de ordens por status
  async getOrdensStats() {
    const { data, error } = await this.client
      .from('ordens')
      .select('status')
    
    if (error) throw error
    
    // Agrupar por status
    const statusCount = {}
    data.forEach(row => {
      statusCount[row.status] = (statusCount[row.status] || 0) + 1
    })
    
    return Object.entries(statusCount).map(([status, total]) => ({ status, total }))
  }

  // Faturamento por status
  async getFaturamentoStats() {
    const { data, error } = await this.client
      .from('ordens')
      .select('valor_final, status')
      .not('valor_final', 'is', null)
    
    if (error) throw error
    
    const total = data.reduce((sum, row) => sum + (parseFloat(row.valor_final) || 0), 0)
    const entregue = data
      .filter(row => row.status === 'entregue')
      .reduce((sum, row) => sum + (parseFloat(row.valor_final) || 0), 0)
    const pendente = data
      .filter(row => ['aguardando', 'em_andamento', 'aguardando_peca', 'pronto'].includes(row.status))
      .reduce((sum, row) => sum + (parseFloat(row.valor_final) || 0), 0)
    
    return { total, entregue, pendente }
  }

  // Estatísticas de técnicos
  async getTecnicosStats() {
    const { data, error } = await this.client
      .from('ordens')
      .select('tecnico_responsavel, status')
      .not('tecnico_responsavel', 'is', null)
      .neq('tecnico_responsavel', '')
    
    if (error) throw error
    
    // Agrupar por técnico
    const tecnicoStats = {}
    data.forEach(row => {
      const tecnico = row.tecnico_responsavel
      if (!tecnicoStats[tecnico]) {
        tecnicoStats[tecnico] = { tecnico, total_ordens: 0, concluidas: 0 }
      }
      tecnicoStats[tecnico].total_ordens++
      if (row.status === 'entregue') {
        tecnicoStats[tecnico].concluidas++
      }
    })
    
    return Object.values(tecnicoStats)
      .sort((a, b) => b.total_ordens - a.total_ordens)
      .slice(0, 5)
  }
}

module.exports = new SupabaseManager()
