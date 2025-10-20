import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim()
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim()
const SUPABASE_DB_SCHEMA = (process.env.SUPABASE_DB_SCHEMA || 'public').trim()

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[api] Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no apps/api/.env')
}

if (SUPABASE_DB_SCHEMA !== 'api') {
  console.warn(`[api] Usando schema "${SUPABASE_DB_SCHEMA}". O schema recomendado pelo projeto é "api" (veja docs/SUPABASE_SCHEMA.sql). Defina SUPABASE_DB_SCHEMA=api no .env.`)
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: SUPABASE_DB_SCHEMA,
  },
})

export const storageBucket = {
  ordens: 'ordens',
}
