const supabaseManager = require('../utils/supabase');

// Exportar o cliente Supabase para uso nos módulos
const supabase = supabaseManager.client;

// Verificar se está configurado
if (!supabase) {
  console.warn('⚠️ Cliente Supabase não está configurado. Verifique as variáveis de ambiente.');
}

// Exportar tanto o cliente quanto o manager
module.exports = { 
  supabase,
  supabaseManager
};