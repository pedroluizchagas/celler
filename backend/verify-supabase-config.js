#!/usr/bin/env node

/**
 * Script de Verificação das Configurações Supabase
 * 
 * Este script verifica se todas as variáveis de ambiente necessárias
 * estão configuradas corretamente para o Render.
 */

require('dotenv').config()

console.log('🔍 Verificando Configurações Supabase para Render...\n')

// Variáveis obrigatórias
const requiredVars = {
  'NODE_ENV': process.env.NODE_ENV,
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
}

// Variáveis que NÃO devem estar presentes
const deprecatedVars = {
  'DATABASE_TYPE': process.env.DATABASE_TYPE
}

let allGood = true

// Verificar variáveis obrigatórias
console.log('✅ Verificando Variáveis Obrigatórias:')
for (const [key, value] of Object.entries(requiredVars)) {
  if (value) {
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
      console.log(`   ${key}: ✅ Configurado (${value.substring(0, 20)}...)`)
    } else {
      console.log(`   ${key}: ✅ ${value}`)
    }
  } else {
    console.log(`   ${key}: ❌ NÃO CONFIGURADO`)
    allGood = false
  }
}

// Verificar variáveis depreciadas
console.log('\n🗑️  Verificando Variáveis Depreciadas:')
for (const [key, value] of Object.entries(deprecatedVars)) {
  if (value) {
    console.log(`   ${key}: ⚠️  AINDA PRESENTE (deve ser removida)`)
    allGood = false
  } else {
    console.log(`   ${key}: ✅ Removida corretamente`)
  }
}

// Verificar se está usando apenas SERVICE_ROLE_KEY
console.log('\n🔐 Verificando Configuração de Segurança:')
if (process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('   ❌ ERRO: Usando ANON_KEY em vez de SERVICE_ROLE_KEY no backend!')
  allGood = false
} else if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('   ✅ Usando SERVICE_ROLE_KEY corretamente')
} else {
  console.log('   ❌ ERRO: Nenhuma chave Supabase configurada!')
  allGood = false
}

// Testar conexão com Supabase
console.log('\n🔌 Testando Conexão com Supabase:')
try {
  const { createClient } = require('@supabase/supabase-js')
  
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    console.log('   ✅ Cliente Supabase criado com sucesso')
    console.log('   ✅ SERVICE ROLE ok')
  } else {
    console.log('   ❌ Não foi possível criar cliente Supabase')
    allGood = false
  }
} catch (error) {
  console.log(`   ❌ Erro ao criar cliente Supabase: ${error.message}`)
  allGood = false
}

// Resultado final
console.log('\n' + '='.repeat(50))
if (allGood) {
  console.log('🎉 SUCESSO: Todas as configurações estão corretas!')
  console.log('✅ Pronto para deploy no Render')
  console.log('\n📋 Próximos passos:')
  console.log('   1. Configure as variáveis no Render Dashboard')
  console.log('   2. Faça deploy do código')
  console.log('   3. Verifique os logs: "✅ SERVICE ROLE ok"')
  console.log('   4. Teste o health check: /api/health')
  process.exit(0)
} else {
  console.log('❌ ERRO: Algumas configurações precisam ser corrigidas!')
  console.log('\n📋 Ações necessárias:')
  console.log('   1. Configure as variáveis obrigatórias')
  console.log('   2. Remova variáveis depreciadas')
  console.log('   3. Execute este script novamente')
  process.exit(1)
}