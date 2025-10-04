// ===================================
// CONFIGURAÇÃO DO SUPABASE
// ===================================

const SUPABASE_CONFIG = {
  // URLs e Credenciais
  url: 'https://siazsdgodjfmpenmukon.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYXpzZGdvZGpmbXBlbm11a29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODA1ODcsImV4cCI6MjA3NDU1NjU4N30.x0Iy1FXsmQLrBVpzDRbrPzO65znX04twwFI-A4qBJa8',
  serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYXpzZGdvZGpmbXBlbm11a29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk4MDU4NywiZXhwIjoyMDc0NTU2NTg3fQ.Y0kQ6t9TU1AmB9Av_rh-U60iN1iBiOP10iAUDWkOMzY',
  
  // URLs Específicas
  apiUrl: 'https://siazsdgodjfmpenmukon.supabase.co/functions/v1',
  storageUrl: 'https://siazsdgodjfmpenmukon.supabase.co/storage/v1/object/public',
  
  // Configurações de Storage
  storage: {
    bucket: 'uploads',
    maxSize: 10485760, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
  },
  
  // Configurações de Database
  database: {
    schema: 'public',
    tables: {
      clientes: 'clientes',
      servicos: 'servicos',
      estoque: 'estoque',
      financeiro: 'financeiro',
      whatsapp_messages: 'whatsapp_messages',
      whatsapp_contacts: 'whatsapp_contacts'
    }
  }
};

// Para uso no Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SUPABASE_CONFIG;
}

// Para uso no browser (frontend)
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = SUPABASE_CONFIG;
}

export default SUPABASE_CONFIG;