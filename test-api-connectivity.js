#!/usr/bin/env node

/**
 * Script para testar conectividade com a API e diagnosticar problemas de CORS
 */

const https = require('https');
const http = require('http');

async function testApiConnectivity() {
  console.log('🔍 Testando conectividade com a API...\n');
  
  const endpoints = [
    'https://assistencia-tecnica-1k5g.onrender.com/api/health',
    'https://assistencia-tecnica-1k5g.onrender.com/api/produtos/stats',
    'https://assistencia-tecnica-1k5g.onrender.com/api/produtos/alertas',
    'https://assistencia-tecnica-1k5g.onrender.com/api/ordens/stats',
    'https://assistencia-tecnica-1k5g.onrender.com/api/vendas/estatisticas'
  ];
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n📋 RESUMO DOS TESTES:');
  console.log('====================');
  console.log('Se todos os endpoints retornaram 200, o problema é de CORS no navegador.');
  console.log('Se retornaram 503, o servidor está indisponível.');
  console.log('Se retornaram outros códigos, há problemas específicos nos endpoints.');
  
  console.log('\n🔧 SOLUÇÕES SUGERIDAS:');
  console.log('1. Se 503: Verificar logs do Render e reiniciar o serviço');
  console.log('2. Se CORS: Verificar configuração de CORS no backend');
  console.log('3. Se 200: Problema é apenas no navegador, aguardar propagação');
}

function testEndpoint(url) {
  return new Promise((resolve) => {
    console.log(`🔗 Testando: ${url}`);
    
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'API-Test-Script/1.0',
        'Accept': 'application/json',
        'Origin': 'https://assistencia-tecnica-mu.vercel.app'
      },
      timeout: 10000
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const corsHeaders = {
          'access-control-allow-origin': res.headers['access-control-allow-origin'],
          'access-control-allow-methods': res.headers['access-control-allow-methods'],
          'access-control-allow-headers': res.headers['access-control-allow-headers']
        };
        
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   CORS Origin: ${corsHeaders['access-control-allow-origin'] || 'Não definido'}`);
        console.log(`   CORS Methods: ${corsHeaders['access-control-allow-methods'] || 'Não definido'}`);
        
        if (res.statusCode === 200) {
          console.log('   ✅ Endpoint funcionando');
        } else if (res.statusCode === 503) {
          console.log('   ❌ Servidor indisponível (503)');
        } else {
          console.log(`   ⚠️ Status inesperado: ${res.statusCode}`);
        }
        
        console.log('');
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Erro de conexão: ${error.message}`);
      console.log('');
      resolve();
    });
    
    req.on('timeout', () => {
      console.log('   ⏰ Timeout na conexão');
      console.log('');
      req.destroy();
      resolve();
    });
    
    req.end();
  });
}

// Função para testar CORS específico
async function testCorsSpecific() {
  console.log('\n🌐 Testando CORS específico...\n');
  
  const testCors = (url) => {
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      
      // Teste de preflight OPTIONS
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://assistencia-tecnica-mu.vercel.app',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      };
      
      const req = https.request(options, (res) => {
        console.log(`OPTIONS ${url}:`);
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin'] || 'Não definido'}`);
        console.log(`   Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods'] || 'Não definido'}`);
        console.log(`   Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers'] || 'Não definido'}`);
        console.log('');
        resolve();
      });
      
      req.on('error', (error) => {
        console.log(`   ❌ Erro no teste CORS: ${error.message}`);
        console.log('');
        resolve();
      });
      
      req.end();
    });
  };
  
  await testCors('https://assistencia-tecnica-1k5g.onrender.com/api/health');
}

// Executar testes
if (require.main === module) {
  testApiConnectivity()
    .then(() => testCorsSpecific())
    .catch(error => {
      console.error('❌ Erro nos testes:', error);
      process.exit(1);
    });
}

module.exports = { testApiConnectivity, testCorsSpecific };