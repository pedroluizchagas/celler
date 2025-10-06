const produtoController = require('./src/controllers/produtoController');

// Mock do request e response
const mockReq = {
  body: {
    nome: 'Produto Teste Sem Categoria',
    descricao: 'Produto para testar validação sem categoria',
    preco_custo: 50.00,
    preco_venda: 80.00,
    quantidade_estoque: 10,
    estoque_minimo: 5,
    tipo: 'peca'
    // categoria_id não fornecido intencionalmente
  }
};

const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log('Status:', this.statusCode);
    console.log('Response:', JSON.stringify(data, null, 2));
    return this;
  }
};

async function testarCriacaoProdutoSemCategoria() {
  console.log('🧪 Testando criação de produto sem categoria...');
  console.log('Dados do produto:', JSON.stringify(mockReq.body, null, 2));
  
  try {
    await produtoController.store(mockReq, mockRes);
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testarCriacaoProdutoSemCategoria();