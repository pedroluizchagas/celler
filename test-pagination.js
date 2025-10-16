#!/usr/bin/env node

/**
 * Script para testar paginação determinística
 * Verifica se todas as rotas estão retornando paginação consistente
 */

const axios = require('axios')

// Configuração da API
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api'

/**
 * Testa uma rota com paginação
 */
async function testPagination(endpoint, description) {
  console.log(`\n🔍 Testando: ${description}`)
  console.log(`   Endpoint: ${endpoint}`)
  
  try {
    // Teste 1: Primeira página
    const page1 = await axios.get(`${API_BASE_URL}${endpoint}?page=1&limit=5`)
    console.log(`   ✅ Página 1: ${page1.data.data?.length || 0} itens`)
    
    if (page1.data.pagination) {
      const { total, page, limit, pages } = page1.data.pagination
      console.log(`   📊 Total: ${total}, Página: ${page}/${pages}, Limit: ${limit}`)
      
      // Teste 2: Segunda página (se existir)
      if (pages > 1) {
        const page2 = await axios.get(`${API_BASE_URL}${endpoint}?page=2&limit=5`)
        console.log(`   ✅ Página 2: ${page2.data.data?.length || 0} itens`)
        
        // Verificar se não há sobreposição
        const ids1 = page1.data.data?.map(item => item.id) || []
        const ids2 = page2.data.data?.map(item => item.id) || []
        const overlap = ids1.filter(id => ids2.includes(id))
        
        if (overlap.length === 0) {
          console.log(`   ✅ Sem sobreposição entre páginas`)
        } else {
          console.log(`   ⚠️  Sobreposição detectada: ${overlap.length} itens`)
        }
      }
    } else {
      console.log(`   ⚠️  Resposta sem paginação estruturada`)
    }
    
    return true
  } catch (error) {
    console.log(`   ❌ Erro: ${error.response?.status || error.message}`)
    if (error.response?.data) {
      console.log(`   📝 Detalhes: ${JSON.stringify(error.response.data, null, 2)}`)
    }
    return false
  }
}

/**
 * Testa consistência de ordenação
 */
async function testOrderConsistency(endpoint, description) {
  console.log(`\n🔄 Testando consistência: ${description}`)
  
  try {
    // Fazer a mesma requisição 3 vezes
    const requests = await Promise.all([
      axios.get(`${API_BASE_URL}${endpoint}?page=1&limit=10`),
      axios.get(`${API_BASE_URL}${endpoint}?page=1&limit=10`),
      axios.get(`${API_BASE_URL}${endpoint}?page=1&limit=10`)
    ])
    
    const results = requests.map(r => r.data.data?.map(item => item.id) || [])
    
    // Verificar se todas as respostas são idênticas
    const isConsistent = results.every(result => 
      JSON.stringify(result) === JSON.stringify(results[0])
    )
    
    if (isConsistent) {
      console.log(`   ✅ Ordenação consistente`)
    } else {
      console.log(`   ❌ Ordenação inconsistente`)
      console.log(`   📝 Resultado 1: [${results[0].slice(0, 5).join(', ')}...]`)
      console.log(`   📝 Resultado 2: [${results[1].slice(0, 5).join(', ')}...]`)
      console.log(`   📝 Resultado 3: [${results[2].slice(0, 5).join(', ')}...]`)
    }
    
    return isConsistent
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`)
    return false
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando testes de paginação determinística')
  console.log(`📡 API Base URL: ${API_BASE_URL}`)
  console.log('')
  
  const endpoints = [
    { path: '/ordens', description: 'Ordens de Serviço' },
    { path: '/produtos', description: 'Produtos' },
    { path: '/vendas', description: 'Vendas' },
    { path: '/financeiro/fluxo-caixa', description: 'Fluxo de Caixa' },
    { path: '/categorias', description: 'Categorias' },
    { path: '/clientes', description: 'Clientes' },
  ]
  
  let successCount = 0
  let consistencyCount = 0
  
  // Testar paginação básica
  console.log('📋 === TESTE DE PAGINAÇÃO BÁSICA ===')
  for (const endpoint of endpoints) {
    const success = await testPagination(endpoint.path, endpoint.description)
    if (success) successCount++
  }
  
  // Testar consistência de ordenação
  console.log('\n📋 === TESTE DE CONSISTÊNCIA DE ORDENAÇÃO ===')
  for (const endpoint of endpoints) {
    const consistent = await testOrderConsistency(endpoint.path, endpoint.description)
    if (consistent) consistencyCount++
  }
  
  // Testar parâmetros de paginação
  console.log('\n📋 === TESTE DE PARÂMETROS DE PAGINAÇÃO ===')
  
  // Teste com limit alto
  console.log('\n🔍 Testando limite máximo')
  try {
    const highLimit = await axios.get(`${API_BASE_URL}/produtos?limit=200`)
    const actualLimit = highLimit.data.pagination?.limit || 0
    if (actualLimit <= 100) {
      console.log(`   ✅ Limite respeitado: ${actualLimit} (máx: 100)`)
    } else {
      console.log(`   ⚠️  Limite não respeitado: ${actualLimit}`)
    }
  } catch (error) {
    console.log(`   ❌ Erro no teste de limite: ${error.message}`)
  }
  
  // Teste com página inválida
  console.log('\n🔍 Testando página inválida')
  try {
    const invalidPage = await axios.get(`${API_BASE_URL}/produtos?page=0`)
    const actualPage = invalidPage.data.pagination?.page || 0
    if (actualPage >= 1) {
      console.log(`   ✅ Página corrigida: ${actualPage} (mín: 1)`)
    } else {
      console.log(`   ⚠️  Página não corrigida: ${actualPage}`)
    }
  } catch (error) {
    console.log(`   ❌ Erro no teste de página: ${error.message}`)
  }
  
  // Resumo final
  console.log('\n📊 === RESUMO DOS TESTES ===')
  console.log(`✅ Paginação funcionando: ${successCount}/${endpoints.length}`)
  console.log(`🔄 Ordenação consistente: ${consistencyCount}/${endpoints.length}`)
  
  if (successCount === endpoints.length && consistencyCount === endpoints.length) {
    console.log('\n🎉 Todos os testes passaram! Paginação determinística implementada com sucesso.')
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os logs acima.')
  }
  
  console.log('\n📝 Próximos passos:')
  console.log('   1. Verifique se o servidor está rodando')
  console.log('   2. Teste manualmente as rotas que falharam')
  console.log('   3. Verifique os logs do servidor para erros')
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro fatal:', error.message)
    process.exit(1)
  })
}

module.exports = { testPagination, testOrderConsistency, main }