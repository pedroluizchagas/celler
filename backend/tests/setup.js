const path = require('path')
const fs = require('fs')

// Configurar ambiente de teste
process.env.NODE_ENV = 'test'
process.env.DATABASE_TYPE = 'supabase' // Usar Supabase para testes

// Timeout padrão para testes
jest.setTimeout(10000)

// Setup global para testes
beforeAll(async () => {
  console.log('🧪 Configurando ambiente de teste...')
})

afterAll(async () => {
  console.log('🧹 Limpando ambiente de teste...')
})

// Helpers globais para testes
global.testHelper = {
  // Cliente de exemplo para testes
  clienteExemplo: {
    nome: 'João Silva',
    telefone: '(11) 99999-9999',
    email: 'joao@email.com',
    endereco: 'Rua das Flores, 123',
    cidade: 'São Paulo',
  },

  // Ordem de exemplo para testes
  ordemExemplo: {
    equipamento: 'iPhone 12',
    marca: 'Apple',
    modelo: '12',
    numero_serie: 'ABC123456',
    defeito: 'Tela quebrada',
    descricao: 'Tela trincada após queda',
    status: 'recebido',
    prioridade: 'normal',
    valor_orcamento: 250.0,
  },
}
