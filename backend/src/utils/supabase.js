const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Debug das variáveis de ambiente
console.log('🔍 Debug Supabase:')
console.log('DATABASE_TYPE:', process.env.DATABASE_TYPE)
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Configurado' : 'Não encontrado')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurado' : 'Não encontrado')
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Configurado' : 'Não encontrado')

// Configuração do cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configurações do Supabase não encontradas. Verifique as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.')
  throw new Error('Configurações do Supabase são obrigatórias')
} else {
  console.log('✅ Configurações do Supabase encontradas!')
}

// Cliente Supabase (apenas se configurado)
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

class SupabaseManager {
  constructor() {
    this.client = supabase
    this.isConfigured = !!supabase
  }

  // Verificar se Supabase está configurado
  isReady() {
    return this.isConfigured
  }

  // Executar query SQL direta
  async query(sql, params = []) {
    console.log(`🔍 Supabase.query - SQL: ${sql}`)
    console.log(`🔍 Supabase.query - Params: ${JSON.stringify(params)}`)
    
    if (!this.isReady()) {
      throw new Error('Supabase não está configurado')
    }

    try {
      // Converter queries SQLite para Supabase
      console.log(`🔍 Supabase.query - Tentando converter query...`)
      const convertedQuery = await this.convertSQLiteToSupabaseAsync(sql, params)
      
      console.log(`🔍 Supabase.query - Resultado da conversão: ${convertedQuery ? 'Convertida' : 'Não convertida'}`)
      
      if (convertedQuery) {
        console.log(`🔍 Supabase.query - Executando query convertida...`)
        console.log(`🔍 Supabase.query - Resultado da query convertida: ${JSON.stringify(convertedQuery)}`)
        return convertedQuery
      }

      // Para queries que não podem ser convertidas, retornar array vazio
      console.warn('⚠️ Query SQL complexa não suportada no Supabase (sem RPC):', sql)
      console.log(`🔍 Supabase.query - Retornando array vazio para query não suportada`)
      return []
    } catch (error) {
      console.error('❌ Erro na query Supabase:', error)
      // Em caso de erro, retornar array vazio em vez de falhar
      console.log(`🔍 Supabase.query - Retornando array vazio devido ao erro`)
      return []
    }
  }

  // Converter queries SQLite comuns para sintaxe Supabase
  convertSQLiteToSupabase(sql, params = []) {
     // Converter placeholders SQLite (?) para PostgreSQL ($1, $2, etc.)
     let convertedQuery = sql;
     let paramIndex = 1;
     
     // Substituir ? por $1, $2, etc.
     convertedQuery = convertedQuery.replace(/\?/g, () => `$${paramIndex++}`);
     
     // Converter CURRENT_TIMESTAMP para NOW()
     convertedQuery = convertedQuery.replace(/CURRENT_TIMESTAMP/g, 'NOW()');
     
     // Converter DATETIME para TIMESTAMP
     convertedQuery = convertedQuery.replace(/DATETIME/g, 'TIMESTAMP');
     
     // Converter AUTOINCREMENT para SERIAL (apenas para CREATE TABLE)
     convertedQuery = convertedQuery.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
     
     // Converter funções de data SQLite para PostgreSQL
     convertedQuery = convertedQuery.replace(/datetime\('now'\)/g, 'NOW()');
     convertedQuery = convertedQuery.replace(/date\('now'\)/g, 'CURRENT_DATE');
     convertedQuery = convertedQuery.replace(/strftime\('%Y-%m-%d', 'now'\)/g, 'CURRENT_DATE');
     convertedQuery = convertedQuery.replace(/strftime\('%Y-%m-%d %H:%M:%S', 'now'\)/g, 'NOW()');
     
     // Converter LIMIT com OFFSET para sintaxe PostgreSQL
     convertedQuery = convertedQuery.replace(/LIMIT\s+(\d+)\s+OFFSET\s+(\d+)/gi, 'LIMIT $1 OFFSET $2');
     
     // Converter operadores de concatenação
     convertedQuery = convertedQuery.replace(/\|\|/g, '||');
     
     // Converter ILIKE para busca case-insensitive (PostgreSQL específico)
     convertedQuery = convertedQuery.replace(/LIKE\s+(['"]%[^'"]*%['"])/gi, 'ILIKE $1');
     
     // Converter BOOLEAN values (evitando placeholders $1, $2, etc.)
     convertedQuery = convertedQuery.replace(/(?<!\$)\b1\b(?=\s*(,|\)|$|AND|OR|WHERE))/g, 'true');
     convertedQuery = convertedQuery.replace(/(?<!\$)\b0\b(?=\s*(,|\)|$|AND|OR|WHERE))/g, 'false');
     
     return { query: convertedQuery, params };
  }

  // Converter queries SQLite comuns para sintaxe Supabase (método async para compatibilidade)
  async convertSQLiteToSupabaseAsync(sql, params = []) {
      const sqlLower = sql.toLowerCase().trim()

    // Queries SELECT simples (SELECT * FROM tabela)
    if (sqlLower.match(/^select \* from (\w+)$/)) {
      const tableName = this.extractTableName(sql)
      if (tableName) {
        console.log(`🔍 Supabase.convertSQLiteToSupabase - SELECT simples da tabela: ${tableName}`)
        const { data, error } = await this.client
          .from(tableName)
          .select('*')
        
        if (error) {
          console.log(`🔍 Supabase.convertSQLiteToSupabase - Erro na query SELECT simples:`, error)
          throw error
        }
        
        console.log(`🔍 Supabase.convertSQLiteToSupabase - Resultado SELECT simples:`, data)
        return data || []
      }
    }

    // Queries SELECT com WHERE (SELECT * FROM tabela WHERE id = ?)
    if (sqlLower.match(/^select \* from (\w+) where (.+)$/)) {
      const tableMatch = sql.match(/FROM\s+(\w+)/i)
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s*$)/i)
      
      if (tableMatch && whereMatch) {
        const tableName = tableMatch[1]
        const whereClause = whereMatch[1]
        
        // Parse da condição WHERE (assumindo id = ?)
        const idMatch = whereClause.match(/id\s*=\s*\?/)
        if (idMatch && params.length > 0) {
          const id = params[0]
          
          console.log(`🔍 Supabase.convertSQLiteToSupabase - SELECT com WHERE da tabela: ${tableName}, id: ${id}`)
          const { data, error } = await this.client
            .from(tableName)
            .select('*')
            .eq('id', id)
          
          if (error) {
            console.log(`🔍 Supabase.convertSQLiteToSupabase - Erro na query SELECT com WHERE:`, error)
            throw error
          }
          
          console.log(`🔍 Supabase.convertSQLiteToSupabase - Resultado SELECT com WHERE:`, data)
          return data || []
        }
      }
    }

    // Queries de contagem simples
    if (sqlLower.includes('select count(*)') && sqlLower.includes('from')) {
      const tableName = this.extractTableName(sql)
      if (tableName) {
        const { count, error } = await this.client
          .from(tableName)
          .select('*', { count: 'exact', head: true })
        
        if (error) throw error
        return [{ total: count || 0 }]
      }
    }

    // Queries de estatísticas de ordens
    if (sqlLower.includes('select status, count(*)') && sqlLower.includes('from ordens')) {
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

    // Queries de faturamento
    if (sqlLower.includes('sum(valor_final)') && sqlLower.includes('from ordens')) {
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
        .filter(row => ['recebido', 'em_analise', 'em_reparo', 'pronto'].includes(row.status))
        .reduce((sum, row) => sum + (parseFloat(row.valor_final) || 0), 0)
      
      return [{ total, entregue, pendente }]
    }

    // Queries de ordens recentes com JOIN
    if (sqlLower.includes('from ordens o') && sqlLower.includes('inner join clientes c')) {
      const { data, error } = await this.client
        .from('ordens')
        .select(`
          id, equipamento, defeito_relatado, status, prioridade, data_entrada, valor_final,
          clientes(nome)
        `)
        .order('data_entrada', { ascending: false })
        .limit(10)
      
      if (error) throw error
      
      return data.map(row => ({
        ...row,
        defeito: row.defeito_relatado,
        dispositivo: row.equipamento,
        data_criacao: row.data_entrada,
        cliente_nome: row.clientes?.nome
      }))
    }

    // Queries de técnicos ativos
    if (sqlLower.includes('tecnico_responsavel') && sqlLower.includes('group by')) {
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

    // Queries da tabela whatsapp_qr
    if (sqlLower.includes('whatsapp_qr')) {
      console.log('🔍 Supabase.convertSQLiteToSupabase - Detectada query whatsapp_qr')
      
      // Query específica para buscar QR code por ID
      if (sqlLower.includes('select qr_code, qr_base64') && sqlLower.includes('where id =')) {
        const { data, error } = await this.client
          .from('whatsapp_qr')
          .select('qr_code, qr_base64')
          .eq('id', 1)
          .single()
        
        if (error) {
          console.log('🔍 Supabase.convertSQLiteToSupabase - Erro na query whatsapp_qr:', error)
          return null
        }
        
        console.log('🔍 Supabase.convertSQLiteToSupabase - Resultado whatsapp_qr:', data)
        return data ? [data] : null
      }
      
      // Query para buscar todos os registros da tabela whatsapp_qr
      if (sqlLower.includes('select * from whatsapp_qr')) {
        const { data, error } = await this.client
          .from('whatsapp_qr')
          .select('*')
        
        if (error) {
          console.log('🔍 Supabase.convertSQLiteToSupabase - Erro na query whatsapp_qr (all):', error)
          return null
        }
        
        console.log('🔍 Supabase.convertSQLiteToSupabase - Resultado whatsapp_qr (all):', data)
        return data
      }
    }

    // Queries de UPDATE
    if (sqlLower.includes('update ') && sqlLower.includes(' set ') && sqlLower.includes(' where ')) {
      console.log('🔍 Supabase.convertSQLiteToSupabase - Detectada query UPDATE')
      
      // Extrair nome da tabela
      const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET/i)
      if (updateMatch) {
        const tableName = updateMatch[1]
        
        // Extrair campos e valores do SET
        const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i)
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+RETURNING|\s*$)/i)
        
        if (setMatch && whereMatch) {
          const setClause = setMatch[1]
          const whereClause = whereMatch[1]
          
          // Parse dos campos SET (formato: campo = $1, campo2 = $2)
          const updateData = {}
          const setFields = setClause.split(',').map(field => field.trim())
          
          setFields.forEach((field, index) => {
            const fieldMatch = field.match(/(\w+)\s*=\s*\$(\d+)/)
            if (fieldMatch && params[index] !== undefined) {
              updateData[fieldMatch[1]] = params[index]
            }
          })
          
          // Parse da condição WHERE (assumindo id = $last)
          const whereMatch2 = whereClause.match(/id\s*=\s*\$(\d+)/)
          if (whereMatch2) {
            const idParamIndex = parseInt(whereMatch2[1]) - 1
            const id = params[idParamIndex]
            
            console.log('🔍 Supabase.convertSQLiteToSupabase - UPDATE:', { tableName, id, updateData })
            
            const { data, error } = await this.client
              .from(tableName)
              .update(updateData)
              .eq('id', id)
              .select()
            
            if (error) {
              console.log('🔍 Supabase.convertSQLiteToSupabase - Erro na query UPDATE:', error)
              return null
            }
            
            console.log('🔍 Supabase.convertSQLiteToSupabase - Resultado UPDATE:', data)
            return data
          }
        }
      }
    }

    return null
  }

  // Extrair nome da tabela de uma query SQL simples
  extractTableName(sql) {
    const match = sql.match(/FROM\s+(\w+)/i)
    return match ? match[1] : null
  }

  // Inserir dados em uma tabela
  async insert(table, data) {
    if (!this.isReady()) {
      throw new Error('Supabase não está configurado')
    }

    try {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select()

      if (error) throw error
      return result
    } catch (error) {
      console.error(`❌ Erro ao inserir em ${table}:`, error)
      throw error
    }
  }

  // Buscar dados de uma tabela
  async select(table, options = {}) {
    if (!this.isReady()) {
      throw new Error('Supabase não está configurado')
    }

    try {
      console.log(`🔍 Supabase.select - Tabela: ${table}`)
      console.log(`🔍 Supabase.select - Options:`, JSON.stringify(options, null, 2))
      
      let query = this.client.from(table).select(options.select || '*')

      // Aplicar filtros
      if (options.where) {
        console.log(`🔍 Supabase.select - Aplicando filtros:`, options.where)
        Object.entries(options.where).forEach(([key, value]) => {
          console.log(`🔍 Supabase.select - Filtro: ${key} = ${value}`)
          query = query.eq(key, value)
        })
      }

      // Aplicar ordenação
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending !== false 
        })
      }

      // Aplicar limite
      if (options.limit) {
        query = query.limit(options.limit)
      }

      console.log(`🔍 Supabase.select - Executando query...`)
      const { data, error } = await query

      console.log(`🔍 Supabase.select - Resultado:`)
      console.log(`🔍 Supabase.select - Data:`, data)
      console.log(`🔍 Supabase.select - Error:`, error)

      if (error) throw error
      return data
    } catch (error) {
      console.error(`❌ Erro ao buscar em ${table}:`, error)
      throw error
    }
  }

  // Atualizar dados em uma tabela
  async update(table, id, data) {
    if (!this.isReady()) {
      throw new Error('Supabase não está configurado')
    }

    try {
      const { data: result, error } = await this.client
        .from(table)
        .update(data)
        .eq('id', id)
        .select()

      if (error) throw error
      return result
    } catch (error) {
      console.error(`❌ Erro ao atualizar ${table}:`, error)
      throw error
    }
  }

  // Deletar dados de uma tabela
  async delete(table, id) {
    if (!this.isReady()) {
      throw new Error('Supabase não está configurado')
    }

    try {
      const { error } = await this.client
        .from(table)
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error(`❌ Erro ao deletar de ${table}:`, error)
      throw error
    }
  }

  // Buscar registros com condições
  async find(table, conditions = {}) {
    if (!this.isReady()) {
      throw new Error('Supabase não está configurado')
    }

    try {
      let query = this.client.from(table).select('*')

      // Aplicar filtros
      if (typeof conditions === 'object' && Object.keys(conditions).length > 0) {
        Object.entries(conditions).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error(`❌ Erro ao buscar em ${table}:`, error)
      throw error
    }
  }

  // Buscar um registro por ID
  async get(table, id) {
    if (!this.isReady()) {
      throw new Error('Supabase não está configurado')
    }

    try {
      const { data, error } = await this.client
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Registro não encontrado
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      console.error(`❌ Erro ao buscar registro em ${table}:`, error)
      throw error
    }
  }

  // Upload de arquivo
  async uploadFile(bucket, path, file) {
    if (!this.isReady()) {
      throw new Error('Supabase não está configurado')
    }

    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(path, file)

      if (error) throw error
      return data
    } catch (error) {
      console.error('❌ Erro no upload:', error)
      throw error
    }
  }

  // Executar comandos SQL (INSERT, UPDATE, DELETE) que retornam informações
  async run(sql, params = []) {
    if (!this.isReady()) {
      throw new Error('Supabase não está configurado')
    }

    try {
      console.log(`🔍 Supabase.run - SQL Original: ${sql}`)
      console.log(`🔍 Supabase.run - Params: ${JSON.stringify(params)}`)

      // Converter query SQLite para PostgreSQL
      const { query: convertedQuery, params: convertedParams } = this.convertSQLiteToSupabase(sql, params)
      
      console.log(`🔍 Supabase.run - SQL Convertido: ${convertedQuery}`)
      console.log(`🔍 Supabase.run - Params Convertidos: ${JSON.stringify(convertedParams)}`)

      // Detectar tipo de comando
      const sqlLower = convertedQuery.toLowerCase().trim()
      
      if (sqlLower.startsWith('insert into')) {
        return await this.handleInsertCommand(convertedQuery, convertedParams)
      } else if (sqlLower.startsWith('update')) {
        return await this.handleUpdateCommand(convertedQuery, convertedParams)
      } else if (sqlLower.startsWith('delete')) {
        return await this.handleDeleteCommand(convertedQuery, convertedParams)
      }

      // Para outros comandos, retornar resultado padrão
      console.warn('⚠️ Comando SQL não suportado (sem RPC):', convertedQuery)
      return { id: null, changes: 0 }
    } catch (error) {
      console.error('❌ Erro no comando Supabase:', error)
      throw error
    }
  }

  // Tratar comando INSERT
  async handleInsertCommand(sql, params) {
    // Extrair nome da tabela
    const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i)
    if (!tableMatch) throw new Error('Não foi possível extrair o nome da tabela')
    
    const tableName = tableMatch[1]
    
    // Extrair campos
    const fieldsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i)
    if (!fieldsMatch) throw new Error('Não foi possível extrair os campos')
    
    const fields = fieldsMatch[1].split(',').map(f => f.trim())
    
    // Construir objeto de dados
    const data = {}
    fields.forEach((field, index) => {
      if (params[index] !== undefined) {
        data[field] = params[index]
      }
    })

    console.log(`🔍 Supabase.run - INSERT em ${tableName}:`, data)

    const { data: result, error } = await this.client
      .from(tableName)
      .insert(data)
      .select()
      .single()

    if (error) throw error
    
    return { id: result.id, changes: 1, data: result }
  }

  // Tratar comando UPDATE
  async handleUpdateCommand(sql, params) {
    // Extrair nome da tabela
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i)
    if (!tableMatch) throw new Error('Não foi possível extrair o nome da tabela')
    
    const tableName = tableMatch[1]
    
    // Extrair campos SET e WHERE
    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i)
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s*$)/i)
    
    if (!setMatch || !whereMatch) {
      throw new Error('Não foi possível extrair SET ou WHERE')
    }

    // Parse dos campos SET
    const updateData = {}
    const setFields = setMatch[1].split(',').map(field => field.trim())
    
    setFields.forEach((field, index) => {
      const fieldMatch = field.match(/(\w+)\s*=\s*\?/)
      if (fieldMatch && params[index] !== undefined) {
        updateData[fieldMatch[1]] = params[index]
      }
    })

    // Parse da condição WHERE - mais flexível
    const whereClause = whereMatch[1].trim()
    let query = this.client.from(tableName).update(updateData)
    
    // Suporte para diferentes tipos de WHERE (tanto ? quanto $n)
    if (whereClause.includes('id = ?') || whereClause.match(/id\s*=\s*\$\d+/)) {
      const id = params[setFields.length]
      query = query.eq('id', id)
    } else if (whereClause.includes('=')) {
      // Parse genérico para campo = ? ou campo = $n
      const fieldMatch = whereClause.match(/(\w+)\s*=\s*(?:\?|\$\d+)/)
      if (fieldMatch) {
        const fieldName = fieldMatch[1]
        const fieldValue = params[setFields.length]
        query = query.eq(fieldName, fieldValue)
      } else {
        throw new Error(`Condição WHERE não suportada: ${whereClause}`)
      }
    } else {
      throw new Error(`Condição WHERE não suportada: ${whereClause}`)
    }

    console.log(`🔍 Supabase.run - UPDATE em ${tableName}:`, { whereClause, updateData, params })

    const { data: result, error } = await query.select()

    if (error) throw error
    
    return { changes: result.length, data: result }
  }

  // Tratar comando DELETE
  async handleDeleteCommand(sql, params) {
    // Extrair nome da tabela
    const tableMatch = sql.match(/DELETE FROM\s+(\w+)/i)
    if (!tableMatch) throw new Error('Não foi possível extrair o nome da tabela')
    
    const tableName = tableMatch[1]
    
    // Extrair WHERE
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s*$)/i)
    if (!whereMatch) throw new Error('DELETE deve ter WHERE')

    // Parse da condição WHERE (assumindo id = ? ou id = $n)
    const whereClause = whereMatch[1].trim()
    const idMatch = whereClause.match(/id\s*=\s*(?:\?|\$\d+)/)
    if (!idMatch) throw new Error(`WHERE deve usar id = ? ou id = $n, recebido: ${whereClause}`)
    
    const id = params[0]

    console.log(`🔍 Supabase.run - DELETE em ${tableName}:`, { id })

    const { error } = await this.client
      .from(tableName)
      .delete()
      .eq('id', id)

    if (error) throw error
    
    return { id: id, changes: 1 }
  }

  // Obter URL pública de arquivo
  getPublicUrl(bucket, path) {
    if (!this.isReady()) {
      throw new Error('Supabase não está configurado')
    }

    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }
}

module.exports = new SupabaseManager()