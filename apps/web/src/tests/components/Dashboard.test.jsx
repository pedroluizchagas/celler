import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import Dashboard from '../../pages/Dashboard/Dashboard'
import { ordemService } from '../../services/ordemService'

// Mock do serviço de ordens
vi.mock('../../services/ordemService')

// Wrapper para testes com providers necessários
const TestWrapper = ({ children }) => {
  const theme = createTheme(testUtils.mockTheme)

  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </BrowserRouter>
  )
}

describe('Dashboard Component', () => {
  const mockStats = {
    total_ordens: 50,
    total_clientes: 25,
    faturamento_mensal: 5000.0,
    ordens_por_status: {
      recebido: 5,
      em_analise: 3,
      aguardando_pecas: 2,
      em_reparo: 8,
      pronto: 4,
      entregue: 25,
      cancelado: 3,
    },
    ultimas_ordens: [testUtils.mockOrdem],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar o título do dashboard', async () => {
    ordemService.buscarEstatisticas = vi.fn().mockResolvedValue({
      data: mockStats,
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Visão geral do sistema')).toBeInTheDocument()
  })

  it('deve exibir loading enquanto carrega dados', () => {
    ordemService.buscarEstatisticas = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('deve exibir estatísticas após carregamento', async () => {
    ordemService.buscarEstatisticas = vi.fn().mockResolvedValue({
      data: mockStats,
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument() // Total de ordens
      expect(screen.getByText('25')).toBeInTheDocument() // Total de clientes
      expect(screen.getByText('R$ 5.000,00')).toBeInTheDocument() // Faturamento
    })
  })

  it('deve exibir cards de estatísticas', async () => {
    ordemService.buscarEstatisticas = vi.fn().mockResolvedValue({
      data: mockStats,
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Total de Ordens')).toBeInTheDocument()
      expect(screen.getByText('Clientes')).toBeInTheDocument()
      expect(screen.getByText('Faturamento')).toBeInTheDocument()
      expect(screen.getByText('Em Reparo')).toBeInTheDocument()
    })
  })

  it('deve exibir tabela de status das ordens', async () => {
    ordemService.buscarEstatisticas = vi.fn().mockResolvedValue({
      data: mockStats,
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Ordens por Status')).toBeInTheDocument()
      expect(screen.getByText('Recebido')).toBeInTheDocument()
      expect(screen.getByText('Em Análise')).toBeInTheDocument()
      expect(screen.getByText('Em Reparo')).toBeInTheDocument()
    })
  })

  it('deve ter botão de atualizar', async () => {
    ordemService.buscarEstatisticas = vi.fn().mockResolvedValue({
      data: mockStats,
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Atualizar')).toBeInTheDocument()
    })
  })

  it('deve lidar com erro na API', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    ordemService.buscarEstatisticas = vi
      .fn()
      .mockRejectedValue(new Error('Erro na API'))

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Erro ao carregar estatísticas:',
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })

  it('deve formatar valores monetários corretamente', async () => {
    const statsComValores = {
      ...mockStats,
      faturamento_mensal: 1234.56,
    }

    ordemService.buscarEstatisticas = vi.fn().mockResolvedValue({
      data: statsComValores,
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('R$ 1.234,56')).toBeInTheDocument()
    })
  })
})
