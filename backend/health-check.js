#!/usr/bin/env node

/**
 * Script de verificação de saúde do sistema
 * Verifica conectividade com banco de dados e serviços essenciais
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function checkHealth() {
  console.log('🔍 Verificando saúde do sistema...\n');
  
  const results = {
    environment: checkEnvironment(),
    database: await checkDatabase(),
    services: await checkServices()
  };
  
  console.log('\n📊 RESUMO DA VERIFICAÇÃO:');
  console.log('========================');
  
  Object.entries(results).forEach(([category, status]) => {
    const icon = status.success ? '✅' : '❌';
    console.log(`${icon} ${category.toUpperCase()}: ${status.message}`);
  });
  
  const allHealthy = Object.values(results).every(r => r.success);
  
  if (allHealthy) {
    console.log('\n🎉 Sistema saudável! Pronto para deploy.');
    process.exit(0);
  } else {
    console.log('\n⚠️ Problemas detectados. Verifique os logs acima.');
    process.exit(1);
  }
}

function checkEnvironment() {
  console.log('🔧 Verificando variáveis de ambiente...');
  
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'NODE_ENV'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log(`❌ Variáveis faltando: ${missing.join(', ')}`);
    return { success: false, message: `Variáveis faltando: ${missing.join(', ')}` };
  }
  
  console.log('✅ Todas as variáveis de ambiente estão configuradas');
  return { success: true, message: 'Variáveis de ambiente OK' };
}

async function checkDatabase() {
  console.log('🗄️ Verificando conexão com Supabase...');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Teste simples de conectividade
    const { data, error } = await supabase
      .from('clientes')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log(`❌ Erro na conexão: ${error.message}`);
      return { success: false, message: `Erro no banco: ${error.message}` };
    }
    
    console.log('✅ Conexão com Supabase estabelecida');
    return { success: true, message: 'Banco de dados conectado' };
    
  } catch (error) {
    console.log(`❌ Erro na verificação do banco: ${error.message}`);
    return { success: false, message: `Erro no banco: ${error.message}` };
  }
}

async function checkServices() {
  console.log('🔌 Verificando serviços...');
  
  const services = [];
  
  // WhatsApp removido do sistema
  services.push('WhatsApp: Removido permanentemente');
  
  // Verificar uploads
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, 'uploads');
  
  if (fs.existsSync(uploadsDir)) {
    services.push('Uploads: Diretório OK');
  } else {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      services.push('Uploads: Diretório criado');
    } catch (error) {
      services.push(`Uploads: Erro - ${error.message}`);
    }
  }
  
  console.log('📋 Status dos serviços:');
  services.forEach(service => console.log(`   ${service}`));
  
  return { success: true, message: 'Serviços verificados' };
}

// Executar verificação
if (require.main === module) {
  checkHealth().catch(error => {
    console.error('❌ Erro na verificação:', error);
    process.exit(1);
  });
}

module.exports = { checkHealth };