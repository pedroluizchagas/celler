const produtoController = require('./src/controllers/produtoController')

// Mock do request e response
const mockReq = {}
const mockRes = {
  json: (data) => {
    console.log('✅ Resposta da API stats:')
    console.log(JSON.stringify(data, null, 2))
  },
  status: (code) => ({
    json: (data) => {
      console.log(`❌ Erro ${code}:`)
      console.log(JSON.stringify(data, null, 2))
    }
  })
}

console.log('🧪 Testando API /api/produtos/stats...')

// Testar o método stats
produtoController.stats(mockReq, mockRes)
  .then(() => {
    console.log('✅ Teste concluído')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro no teste:', error)
    process.exit(1)
  })