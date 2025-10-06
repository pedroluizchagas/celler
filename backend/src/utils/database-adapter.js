// Adaptador de banco baseado no cliente Supabase
// Em ambiente de teste, reexporta o stub para permitir mocking simples
if (process.env.NODE_ENV === 'test') {
  module.exports = require('./database')
} else {
  const supabase = require('./supabase')
  require('dotenv').config()

  class DatabaseAdapter {
    constructor() {
      console.log('🔍 Debug DatabaseAdapter:')
      console.log('supabase.isReady():', supabase.isReady())
      if (!supabase.isReady()) {
        throw new Error('❌ Supabase não está configurado corretamente. Verifique as variáveis de ambiente.')
      }
      console.log('🗄️ Usando banco de dados: Supabase (PostgreSQL)')
    }

    isReady() { return supabase.isReady() }
    async all(table) { return await supabase.all(table) }
    async get(table, id) { return await supabase.get(table, id) }
    async find(table, conditions = {}) { return await supabase.find(table, conditions) }
    async insert(table, data) { const result = await supabase.insert(table, data); return result[0] }
    async update(table, id, data) { const result = await supabase.update(table, id, data); return result[0] }
    async delete(table, id) { await supabase.delete(table, id); return { success: true } }
    async paginate(table, page = 1, limit = 10, conditions = {}) { return await supabase.paginate(table, page, limit, conditions) }
    async count(table, conditions = {}) { return await supabase.count(table, conditions) }
    async findWithRelations(table, selectQuery, conditions = {}) { return await supabase.findWithRelations(table, selectQuery, conditions) }
    async rpc(functionName, params = {}) { return await supabase.rpc(functionName, params) }
    async close() { console.log('✅ Database adapter finalizado (Supabase)') }
  }

  module.exports = new DatabaseAdapter()
}

