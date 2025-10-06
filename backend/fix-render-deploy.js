#!/usr/bin/env node

/**
 * Script para diagnosticar e corrigir problemas de deploy no Render
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

async function checkRenderDeployment() {
  console.log('🔍 Verificando configuração de deploy no Render...\n');
  
  const issues = [];
  const fixes = [];
  
  // 1. Verificar package.json
  console.log('📦 Verificando package.json...');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!packageJson.scripts.start) {
      issues.push('Script "start" não encontrado no package.json');
      fixes.push('Adicionar script "start": "node src/server.js"');
    }
    
    if (!packageJson.engines) {
      issues.push('Versão do Node.js não especificada');
      fixes.push('Adicionar engines.node no package.json');
    }
    
    console.log('✅ package.json verificado');
  } catch (error) {
    issues.push(`Erro ao ler package.json: ${error.message}`);
  }
  
  // 2. Verificar variáveis de ambiente
  console.log('🔧 Verificando variáveis de ambiente...');
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NODE_ENV',
    'PORT'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    issues.push(`Variáveis de ambiente faltando: ${missingEnvVars.join(', ')}`);
    fixes.push('Configurar todas as variáveis de ambiente no Render');
  } else {
    console.log('✅ Variáveis de ambiente configuradas');
  }
  
  // 3. Verificar render.yaml
  console.log('📄 Verificando render.yaml...');
  try {
    if (fs.existsSync('render.yaml')) {
      const renderConfig = fs.readFileSync('render.yaml', 'utf8');
      
      if (!renderConfig.includes('healthCheckPath')) {
        issues.push('Health check não configurado no render.yaml');
        fixes.push('Adicionar healthCheckPath: /api/health');
      }
      
      if (!renderConfig.includes('startCommand')) {
        issues.push('Comando de start não configurado');
        fixes.push('Adicionar startCommand: npm start');
      }
      
      console.log('✅ render.yaml verificado');
    } else {
      issues.push('Arquivo render.yaml não encontrado');
      fixes.push('Criar arquivo render.yaml com configurações do Render');
    }
  } catch (error) {
    issues.push(`Erro ao verificar render.yaml: ${error.message}`);
  }
  
  // 4. Verificar estrutura de arquivos
  console.log('📁 Verificando estrutura de arquivos...');
  const requiredFiles = [
    'src/server.js',
    'package.json',
    '.env.production'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    issues.push(`Arquivos faltando: ${missingFiles.join(', ')}`);
    fixes.push('Verificar se todos os arquivos necessários estão no repositório');
  } else {
    console.log('✅ Estrutura de arquivos OK');
  }
  
  // 5. Testar conexão com Supabase
  console.log('🗄️ Testando conexão com Supabase...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase
      .from('clientes')
      .select('count')
      .limit(1);
    
    if (error) {
      issues.push(`Erro na conexão Supabase: ${error.message}`);
      fixes.push('Verificar credenciais do Supabase');
    } else {
      console.log('✅ Conexão com Supabase OK');
    }
  } catch (error) {
    issues.push(`Erro ao testar Supabase: ${error.message}`);
  }
  
  // Relatório final
  console.log('\n📊 RELATÓRIO DE DIAGNÓSTICO:');
  console.log('================================');
  
  if (issues.length === 0) {
    console.log('🎉 Nenhum problema encontrado! Deploy deve funcionar.');
  } else {
    console.log('❌ PROBLEMAS ENCONTRADOS:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    
    console.log('\n🔧 CORREÇÕES SUGERIDAS:');
    fixes.forEach((fix, index) => {
      console.log(`   ${index + 1}. ${fix}`);
    });
  }
  
  // Gerar arquivo de configuração corrigido se necessário
  if (issues.some(issue => issue.includes('render.yaml'))) {
    console.log('\n📝 Gerando render.yaml corrigido...');
    generateRenderConfig();
  }
  
  return { issues, fixes };
}

function generateRenderConfig() {
  const renderConfig = `services:
  - type: web
    name: assistencia-tecnica-backend
    env: node
    plan: free
    buildCommand: npm install --production
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: HOST
        value: 0.0.0.0
      - key: DATABASE_TYPE
        value: supabase
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: SESSION_SECRET
        sync: false
      - key: WHATSAPP_ENABLED
        value: true
      - key: LOG_LEVEL
        value: info
      - key: UPLOAD_MAX_SIZE
        value: 10485760
      - key: CORS_ORIGIN
        value: https://assistencia-tecnica-mu.vercel.app
    autoDeploy: true
    branch: main
    rootDir: backend
`;

  fs.writeFileSync('render-fixed.yaml', renderConfig);
  console.log('✅ Arquivo render-fixed.yaml criado');
}

// Executar diagnóstico
if (require.main === module) {
  checkRenderDeployment().catch(error => {
    console.error('❌ Erro no diagnóstico:', error);
    process.exit(1);
  });
}

module.exports = { checkRenderDeployment };