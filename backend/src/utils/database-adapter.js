const supabase = require('./supabase')
require('dotenv').config()

class DatabaseAdapter {
  constructor() {
    console.log('🔍 Debug DatabaseAdapter:')
    console.log('DATABASE_TYPE:', process.env.DATABASE_TYPE)
    console.log('supabase.isReady():', supabase.isReady())
    
    if (!supabase.isReady()) {
      throw new Error('❌ Supabase não está configurado corretamente. Verifique as variáveis de ambiente.')
    }
    
    console.log('🗄️ Usando banco de dados: Supabase (PostgreSQL)')
  }

  // Executar query no Supabase
  async query(sql, params = []) {
    try {
      const result = await supabase.query(sql, params)
      return result || []
    } catch (error) {
      console.error('❌ Erro na query:', error)
      throw error
    }
  }

  // Executar comando no Supabase (INSERT, UPDATE, DELETE)
  async run(sql, params = []) {
    try {
      return await supabase.run(sql, params)
    } catch (error) {
      console.error('❌ Erro no comando:', error)
      throw error
    }
  }

  // Buscar todos os registros de uma tabela
  async all(tableOrSql, idOrParams = []) {
    try {
      if (typeof tableOrSql === 'string' && !tableOrSql.toLowerCase().includes('select')) {
        // É nome de tabela
        const result = await supabase.query(`SELECT * FROM ${tableOrSql}`, [])
        return result || []
      } else {
        // É uma query SQL
        const params = Array.isArray(idOrParams) ? idOrParams : []
        const result = await supabase.query(tableOrSql, params)
        return result || []
      }
    } catch (error) {
      console.error('❌ Erro ao buscar registros:', error)
      throw error
    }
  }

  // Buscar um registro por ID ou executar query SQL
  async get(tableOrSql, idOrParams = null) {
    try {
      if (typeof tableOrSql === 'string' && tableOrSql.toLowerCase().includes('select')) {
        // É uma query SQL completa
        const params = Array.isArray(idOrParams) ? idOrParams : (idOrParams !== null ? [idOrParams] : [])
        const result = await supabase.query(tableOrSql, params)
        return result && result.length > 0 ? result[0] : null
      } else {
        // É nome de tabela + ID - usar método get do Supabase
        return await supabase.get(tableOrSql, idOrParams)
      }
    } catch (error) {
      console.error('❌ Erro ao buscar registro:', error)
      throw error
    }
  }

  // Buscar registros com condições
  async find(table, conditions = {}, params = []) {
    try {
      if (typeof conditions === 'string') {
        // conditions é uma string WHERE - usar query SQL
        let sql = `SELECT * FROM ${table} WHERE ${conditions}`
        const result = await supabase.query(sql, params)
        return result || []
      } else {
        // conditions é um objeto - usar método find do Supabase
        const result = await supabase.find(table, conditions)
        return result || []
      }
    } catch (error) {
      console.error('❌ Erro ao buscar com condições:', error)
      throw error
    }
  }

  // Inserir registro
  async insert(table, data) {
    try {
      const result = await supabase.insert(table, data)
      return result[0]
    } catch (error) {
      console.error('❌ Erro ao inserir:', error)
      throw error
    }
  }

  // Atualizar registro
  async update(table, id, data) {
    try {
      const result = await supabase.update(table, id, data)
      return result[0]
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error)
      throw error
    }
  }

  // Deletar registro
  async delete(table, id) {
    try {
      await supabase.delete(table, id)
      return { success: true }
    } catch (error) {
      console.error('❌ Erro ao deletar:', error)
      throw error
    }
  }

  // Buscar com paginação
  async paginate(table, page = 1, limit = 10, conditions = '', params = []) {
    try {
      const offset = (page - 1) * limit
      let sql = `SELECT * FROM ${table}`
      
      if (conditions) {
        sql += ` WHERE ${conditions}`
      }
      
      sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      params.push(limit, offset)
      
      return await supabase.query(sql, params)
    } catch (error) {
      console.error('❌ Erro na paginação:', error)
      throw error
    }
  }

  // Executar query customizada
  async execute(sql, params = []) {
    try {
      return await supabase.run(sql, params)
    } catch (error) {
      console.error('❌ Erro na execução:', error)
      throw error
    }
  }

  // Buscar com relacionamentos (JOIN)
  async findWithRelations(mainTable, relations = [], conditions = '', params = []) {
    try {
      let sql = `SELECT * FROM ${mainTable}`
      
      // Adicionar JOINs
      relations.forEach(relation => {
        sql += ` LEFT JOIN ${relation.table} ON ${relation.on}`
      })
      
      if (conditions) {
        sql += ` WHERE ${conditions}`
      }
      
      return await supabase.query(sql, params)
    } catch (error) {
      console.error('❌ Erro na busca com relacionamentos:', error)
      throw error
    }
  }

  // Contar registros
  async count(table, conditions = '', params = []) {
    try {
      let sql = `SELECT COUNT(*) as total FROM ${table}`
      
      if (conditions) {
        sql += ` WHERE ${conditions}`
      }
      
      const result = await supabase.query(sql, params)
      return parseInt(result[0].total)
    } catch (error) {
      console.error('❌ Erro ao contar registros:', error)
      throw error
    }
  }

  // Fechar conexão (não necessário para Supabase, mas mantido para compatibilidade)
  async close() {
    console.log('✅ Database adapter finalizado (Supabase)')
  }
}

module.exports = new DatabaseAdapter()