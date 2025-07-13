const db = require('./src/utils/database')

async function debugProdutos() {
  try {
    console.log('=== DEBUG PRODUTOS ===\n')

    // 1. Listar todos os produtos
    const produtos = await db.all(`
      SELECT id, nome, estoque_atual, estoque_minimo, estoque_maximo, ativo 
      FROM produtos 
      ORDER BY id
    `)

    console.log('1. PRODUTOS CADASTRADOS:')
    produtos.forEach((p) => {
      const status =
        p.estoque_atual === 0
          ? 'SEM_ESTOQUE'
          : p.estoque_atual > p.estoque_minimo
          ? 'DISPONIVEL'
          : 'ESTOQUE_BAIXO'
      console.log(`   ID: ${p.id}, Nome: ${p.nome}`)
      console.log(
        `   Atual: ${p.estoque_atual}, Mínimo: ${p.estoque_minimo}, Status: ${status}, Ativo: ${p.ativo}`
      )
      console.log('')
    })

    // 2. Estatísticas manuais
    console.log('2. ESTATÍSTICAS CALCULADAS:')

    const total = await db.get(
      'SELECT COUNT(*) as total FROM produtos WHERE ativo = 1'
    )
    console.log(`   Total produtos ativos: ${total.total}`)

    const disponivel = await db.get(
      'SELECT COUNT(*) as total FROM produtos WHERE ativo = 1 AND estoque_atual > estoque_minimo'
    )
    console.log(`   Disponíveis: ${disponivel.total}`)

    const estoqueBaixo = await db.get(
      'SELECT COUNT(*) as total FROM produtos WHERE ativo = 1 AND estoque_atual > 0 AND estoque_atual <= estoque_minimo'
    )
    console.log(`   Estoque baixo: ${estoqueBaixo.total}`)

    const semEstoque = await db.get(
      'SELECT COUNT(*) as total FROM produtos WHERE ativo = 1 AND estoque_atual = 0'
    )
    console.log(`   Sem estoque: ${semEstoque.total}`)

    // 3. Verificar a API stats
    console.log('\n3. TESTANDO API /produtos/stats:')
    const ProdutoController = require('./src/controllers/produtoController')

    // Simular req/res
    const mockReq = {}
    const mockRes = {
      json: (data) => {
        console.log('   Resposta da API:')
        console.log(JSON.stringify(data, null, 4))
      },
      status: (code) => ({
        json: (data) => {
          console.log(`   Erro ${code}:`, data)
        },
      }),
    }

    await ProdutoController.stats(mockReq, mockRes)
  } catch (error) {
    console.error('Erro no debug:', error)
  } finally {
    process.exit()
  }
}

debugProdutos()
