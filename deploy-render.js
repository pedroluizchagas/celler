#!/usr/bin/env node

/**
 * Script para preparar e fazer deploy no Render
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function deployToRender() {
  console.log('🚀 Preparando deploy para Render...\n');
  
  try {
    // 1. Verificar se estamos no diretório correto
    if (!fs.existsSync('backend/package.json')) {
      throw new Error('Execute este script na raiz do projeto');
    }
    
    // 2. Verificar se o git está configurado
    console.log('📋 Verificando configuração do Git...');
    try {
      execSync('git status', { stdio: 'pipe' });
      console.log('✅ Git configurado');
    } catch (error) {
      throw new Error('Git não está configurado ou não é um repositório Git');
    }
    
    // 3. Verificar se há mudanças não commitadas
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        console.log('⚠️ Há mudanças não commitadas:');
        console.log(status);
        console.log('Commitando mudanças automaticamente...');
        
        execSync('git add .', { stdio: 'inherit' });
        execSync('git commit -m "fix: Correções para deploy no Render - CORS, health check e robustez"', { stdio: 'inherit' });
        console.log('✅ Mudanças commitadas');
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar status do Git:', error.message);
    }
    
    // 4. Verificar configurações do backend
    console.log('🔧 Verificando configurações do backend...');
    const backendPackage = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
    
    if (!backendPackage.engines) {
      console.log('❌ Versão do Node.js não especificada no package.json');
      return;
    }
    
    if (!backendPackage.scripts.start) {
      console.log('❌ Script start não encontrado no package.json');
      return;
    }
    
    console.log('✅ Configurações do backend OK');
    
    // 5. Verificar arquivo render.yaml
    console.log('📄 Verificando render.yaml...');
    if (!fs.existsSync('backend/render.yaml')) {
      console.log('❌ Arquivo render.yaml não encontrado');
      return;
    }
    
    const renderConfig = fs.readFileSync('backend/render.yaml', 'utf8');
    if (!renderConfig.includes('healthCheckPath: /api/health')) {
      console.log('⚠️ Health check pode não estar configurado corretamente');
    }
    
    console.log('✅ render.yaml verificado');
    
    // 6. Fazer push para o repositório
    console.log('📤 Fazendo push para o repositório...');
    try {
      execSync('git push origin main', { stdio: 'inherit' });
      console.log('✅ Push realizado com sucesso');
    } catch (error) {
      console.log('⚠️ Erro no push:', error.message);
      console.log('Tentando push para master...');
      try {
        execSync('git push origin master', { stdio: 'inherit' });
        console.log('✅ Push para master realizado com sucesso');
      } catch (masterError) {
        throw new Error('Não foi possível fazer push. Verifique a configuração do Git.');
      }
    }
    
    // 7. Instruções finais
    console.log('\n🎉 Preparação para deploy concluída!');
    console.log('\n📋 PRÓXIMOS PASSOS NO RENDER:');
    console.log('1. Acesse https://render.com e faça login');
    console.log('2. Clique em "New +" e selecione "Web Service"');
    console.log('3. Conecte seu repositório GitHub');
    console.log('4. Configure as seguintes opções:');
    console.log('   - Name: assistencia-tecnica-backend');
    console.log('   - Environment: Node');
    console.log('   - Build Command: npm install --production');
    console.log('   - Start Command: npm start');
    console.log('   - Root Directory: backend');
    console.log('5. Configure as variáveis de ambiente:');
    console.log('   - NODE_ENV=production');
    console.log('   - PORT=3001');
    console.log('   - SUPABASE_URL=https://siazsdgodjfmpenmukon.supabase.co');
    console.log('   - SUPABASE_ANON_KEY=[sua-chave-anon]');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY=[sua-chave-service]');
    console.log('   - JWT_SECRET=[seu-jwt-secret]');
    console.log('   - SESSION_SECRET=[seu-session-secret]');
    console.log('   - CORS_ORIGIN=https://assistencia-tecnica-mu.vercel.app');
    console.log('   - WHATSAPP_ENABLED=true');
    console.log('6. Clique em "Create Web Service"');
    
    console.log('\n🔗 URLs importantes:');
    console.log('- Frontend: https://assistencia-tecnica-mu.vercel.app');
    console.log('- Backend (após deploy): https://assistencia-tecnica-1k5g.onrender.com');
    console.log('- Health Check: https://assistencia-tecnica-1k5g.onrender.com/api/health');
    
  } catch (error) {
    console.error('❌ Erro no deploy:', error.message);
    process.exit(1);
  }
}

// Executar deploy
if (require.main === module) {
  deployToRender();
}

module.exports = { deployToRender };