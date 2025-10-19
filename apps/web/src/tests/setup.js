import '@testing-library/jest-dom'
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Limpar após cada teste
afterEach(() => {
  cleanup()
})

// Mock das APIs globais que não existem no jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Mock de ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Helpers para testes
global.testUtils = {
  // Mock de cliente para testes
  mockCliente: {
    id: 1,
    nome: 'João Silva',
    telefone: '(11) 99999-9999',
    email: 'joao@email.com',
    endereco: 'Rua das Flores, 123',
    cidade: 'São Paulo',
  },

  // Mock de ordem para testes
  mockOrdem: {
    id: 1,
    cliente_id: 1,
    equipamento: 'iPhone 12',
    marca: 'Apple',
    modelo: '12',
    defeito: 'Tela quebrada',
    status: 'recebido',
    valor_orcamento: 250.0,
    cliente_nome: 'João Silva',
    cliente_telefone: '(11) 99999-9999',
  },

  // Mock do tema
  mockTheme: {
    palette: {
      mode: 'light',
      primary: { main: '#ff0000' },
      secondary: { main: '#8b8680' },
    },
    spacing: (factor) => `${factor * 8}px`,
    breakpoints: {
      down: () => false,
      up: () => true,
    },
  },
}
