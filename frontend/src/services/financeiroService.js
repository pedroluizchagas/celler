import api from './api'
import { buildQuery, buildSafeFilters } from '../utils/http.js'

class FinanceiroService {
  // ==================== OPÇÕES PARA FORMULÁRIOS ====================

  // Opções de status para contas
  opcoesStatusConta = [
    { value: '', label: 'Todos' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'pago', label: 'Pago' },
    { value: 'vencido', label: 'Vencido' },
    { value: 'cancelado', label: 'Cancelado' },
  ]

  // Opções de forma de pagamento
  opcoesFormaPagamento = [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'cartao_debito', label: 'Cartão de Débito' },
    { value: 'cartao_credito', label: 'Cartão de Crédito' },
    { value: 'pix', label: 'PIX' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'boleto', label: 'Boleto' },
    { value: 'cheque', label: 'Cheque' },
  ]

  // Opções de tipo de movimentação
  opcoesTipoMovimentacao = [
    { value: 'entrada', label: 'Entrada' },
    { value: 'saida', label: 'Saída' },
  ]

  // Opções de recorrência
  opcoesRecorrencia = [
    { value: '', label: 'Não recorrente' },
    { value: 'semanal', label: 'Semanal' },
    { value: 'quinzenal', label: 'Quinzenal' },
    { value: 'mensal', label: 'Mensal' },
    { value: 'bimestral', label: 'Bimestral' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'semestral', label: 'Semestral' },
    { value: 'anual', label: 'Anual' },
  ]

  // ==================== FLUXO DE CAIXA ====================

  // Listar movimentações do fluxo de caixa
  async listarFluxoCaixa(filtros = {}) {
    try {
      const safeFilters = buildSafeFilters(filtros)
      const response = await api.get(`/financeiro/fluxo-caixa${buildQuery(safeFilters)}`)
      return response.data
    } catch (error) {
      console.error('Erro ao listar fluxo de caixa:', error)
      throw error
    }
  }

  // Resumo do fluxo de caixa
  async resumoFluxoCaixa(dataInicio = null, dataFim = null) {
    try {
      const filtros = { data_inicio: dataInicio, data_fim: dataFim }
      const safeFilters = buildSafeFilters(filtros)
      const response = await api.get(`/financeiro/fluxo-caixa/resumo${buildQuery(safeFilters)}`)
      return response.data
    } catch (error) {
      console.error('Erro ao buscar resumo do fluxo de caixa:', error)
      throw error
    }
  }

  // Dashboard financeiro
  async dashboardFinanceiro() {
    try {
      const response = await api.get('/financeiro/dashboard')
      return response.data
    } catch (error) {
      console.error('Erro ao carregar dashboard financeiro:', error)
      throw error
    }
  }

  // Adicionar movimentação manual
  async adicionarMovimentacao(movimentacao) {
    try {
      const response = await api.post('/financeiro/fluxo-caixa', movimentacao)
      return response.data
    } catch (error) {
      console.error('Erro ao adicionar movimentação:', error)
      throw error
    }
  }

  // ==================== CONTAS A PAGAR ====================

  // Listar contas a pagar
  async listarContasPagar(filtros = {}) {
    try {
      const safeFilters = buildSafeFilters(filtros)
      const response = await api.get(`/financeiro/contas-pagar${buildQuery(safeFilters)}`)
      return response.data
    } catch (error) {
      console.error('Erro ao listar contas a pagar:', error)
      throw error
    }
  }

  // Criar conta a pagar
  async criarContaPagar(conta) {
    try {
      const response = await api.post('/financeiro/contas-pagar', conta)
      return response.data
    } catch (error) {
      console.error('Erro ao criar conta a pagar:', error)
      throw error
    }
  }

  // Pagar conta
  async pagarConta(id, pagamento) {
    try {
      const response = await api.post(
        `/financeiro/contas-pagar/${id}/pagar`,
        pagamento
      )
      return response.data
    } catch (error) {
      console.error('Erro ao pagar conta:', error)
      throw error
    }
  }

  // ==================== CONTAS A RECEBER ====================

  // Listar contas a receber
  async listarContasReceber(filtros = {}) {
    try {
      const safeFilters = buildSafeFilters(filtros)
      const response = await api.get(`/financeiro/contas-receber${buildQuery(safeFilters)}`)
      return response.data
    } catch (error) {
      console.error('Erro ao listar contas a receber:', error)
      throw error
    }
  }

  // Criar conta a receber
  async criarContaReceber(conta) {
    try {
      const response = await api.post('/financeiro/contas-receber', conta)
      return response.data
    } catch (error) {
      console.error('Erro ao criar conta a receber:', error)
      throw error
    }
  }

  // Receber conta
  async receberConta(id, recebimento) {
    try {
      const response = await api.post(
        `/financeiro/contas-receber/${id}/receber`,
        recebimento
      )
      return response.data
    } catch (error) {
      console.error('Erro ao receber conta:', error)
      throw error
    }
  }

  // ==================== CATEGORIAS FINANCEIRAS ====================

  // Listar categorias financeiras
  async listarCategorias(tipo = null) {
    try {
      const filtros = { tipo }
      const safeFilters = buildSafeFilters(filtros)
      const response = await api.get(`/financeiro/categorias${buildQuery(safeFilters)}`)
      return response.data
    } catch (error) {
      console.error('Erro ao listar categorias financeiras:', error)
      throw error
    }
  }

  // Criar categoria financeira
  async criarCategoria(categoria) {
    try {
      const response = await api.post('/financeiro/categorias', categoria)
      return response.data
    } catch (error) {
      console.error('Erro ao criar categoria financeira:', error)
      throw error
    }
  }

  // ==================== RELATÓRIOS ====================

  // Relatório mensal
  async relatorioMensal(mes = null, ano = null) {
    try {
      const filtros = { mes, ano }
      const safeFilters = buildSafeFilters(filtros)
      const response = await api.get(`/financeiro/relatorio-mensal${buildQuery(safeFilters)}`)
      return response.data
    } catch (error) {
      console.error('Erro ao gerar relatório mensal:', error)
      throw error
    }
  }

  // ==================== UTILITÁRIOS ====================

  // Formatar moeda brasileira
  formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor || 0)
  }

  // Formatar data brasileira
  formatarData(data) {
    if (!data) return ''
    return new Date(data).toLocaleDateString('pt-BR')
  }

  // Formatar data e hora brasileira
  formatarDataHora(data) {
    if (!data) return ''
    return new Date(data).toLocaleString('pt-BR')
  }

  // Calcular diferença de dias
  calcularDiasVencimento(dataVencimento) {
    const hoje = new Date()
    const vencimento = new Date(dataVencimento)
    const diffTime = vencimento - hoje
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Status da conta baseado no vencimento
  getStatusConta(dataVencimento, status = 'pendente') {
    if (status === 'pago' || status === 'recebido') {
      return status
    }

    if (status === 'cancelado') {
      return 'cancelado'
    }

    const diasVencimento = this.calcularDiasVencimento(dataVencimento)

    if (diasVencimento < 0) {
      return 'vencido'
    } else if (diasVencimento <= 3) {
      return 'vence_breve'
    } else {
      return 'pendente'
    }
  }

  // Cor baseada no status
  getCorStatus(status) {
    const cores = {
      pago: 'success',
      recebido: 'success',
      pendente: 'info',
      vencido: 'error',
      vence_breve: 'warning',
      cancelado: 'default',
    }
    return cores[status] || 'default'
  }

  // Texto baseado no status
  getTextoStatus(status) {
    const textos = {
      pago: 'Pago',
      recebido: 'Recebido',
      pendente: 'Pendente',
      vencido: 'Vencido',
      vence_breve: 'Vence em breve',
      cancelado: 'Cancelado',
    }
    return textos[status] || 'Pendente'
  }
}

export default new FinanceiroService()
