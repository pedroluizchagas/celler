import { createClient } from '@supabase/supabase-js'

// Configurações do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Verificar se as configurações estão presentes
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Configurações do Supabase não encontradas no frontend')
}

// Cliente Supabase
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Verificar se Supabase está configurado
export const isSupabaseConfigured = () => {
  return !!supabase
}

// Serviços de autenticação (para futuro uso)
export const authService = {
  // Login
  async signIn(email, password) {
    if (!supabase) throw new Error('Supabase não configurado')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  },

  // Registro
  async signUp(email, password, metadata = {}) {
    if (!supabase) throw new Error('Supabase não configurado')
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    
    if (error) throw error
    return data
  },

  // Logout
  async signOut() {
    if (!supabase) throw new Error('Supabase não configurado')
    
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Obter usuário atual
  async getCurrentUser() {
    if (!supabase) throw new Error('Supabase não configurado')
    
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Escutar mudanças de autenticação
  onAuthStateChange(callback) {
    if (!supabase) throw new Error('Supabase não configurado')
    
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Serviços de storage (para upload de arquivos)
export const storageService = {
  // Upload de arquivo
  async uploadFile(bucket, path, file) {
    if (!supabase) throw new Error('Supabase não configurado')
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file)
    
    if (error) throw error
    return data
  },

  // Obter URL pública
  getPublicUrl(bucket, path) {
    if (!supabase) throw new Error('Supabase não configurado')
    
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return data.publicUrl
  },

  // Deletar arquivo
  async deleteFile(bucket, path) {
    if (!supabase) throw new Error('Supabase não configurado')
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])
    
    if (error) throw error
  }
}

// Serviços de banco de dados
export const databaseService = {
  // Inserir dados
  async insert(table, data) {
    if (!supabase) throw new Error('Supabase não configurado')
    
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
    
    if (error) throw error
    return result
  },

  // Buscar dados
  async select(table, options = {}) {
    if (!supabase) throw new Error('Supabase não configurado')
    
    let query = supabase.from(table).select(options.select || '*')
    
    // Aplicar filtros
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
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
    
    const { data, error } = await query
    
    if (error) throw error
    return data
  },

  // Atualizar dados
  async update(table, id, data) {
    if (!supabase) throw new Error('Supabase não configurado')
    
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return result
  },

  // Deletar dados
  async delete(table, id) {
    if (!supabase) throw new Error('Supabase não configurado')
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Escutar mudanças em tempo real
  subscribe(table, callback, filter = '*') {
    if (!supabase) throw new Error('Supabase não configurado')
    
    return supabase
      .channel(`public:${table}`)
      .on('postgres_changes', 
        { event: filter, schema: 'public', table }, 
        callback
      )
      .subscribe()
  }
}

export default supabase