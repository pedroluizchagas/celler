const express = require('express')
const financeiroController = require('../controllers/financeiroController')

const router = express.Router()

// ==================== FLUXO DE CAIXA ====================
router.get('/fluxo-caixa', financeiroController.listarFluxoCaixa)
router.post('/fluxo-caixa', financeiroController.adicionarMovimentacao)
router.get('/fluxo-caixa/resumo', financeiroController.resumoFluxoCaixa)
router.get('/dashboard', financeiroController.dashboardFinanceiro)

// Categorias financeiras
router.get('/categorias', financeiroController.listarCategorias)
router.post('/categorias', financeiroController.criarCategoria)

// ==================== CONTAS A PAGAR ====================

// Listar contas a pagar
router.get('/contas-pagar', financeiroController.listarContasPagar)

// Criar nova conta a pagar
router.post('/contas-pagar', financeiroController.criarContaPagar)

// Atualizar conta a pagar
router.put('/contas-pagar/:id', financeiroController.atualizarContaPagar)

// Processar pagamento de conta
router.post('/contas-pagar/:id/pagar', financeiroController.pagarConta)

// ==================== CONTAS A RECEBER ====================

// Listar contas a receber
router.get('/contas-receber', financeiroController.listarContasReceber)

// Criar nova conta a receber
router.post('/contas-receber', financeiroController.criarContaReceber)

// Processar recebimento de conta
router.post('/contas-receber/:id/receber', financeiroController.receberConta)

// ==================== RELATÓRIOS ====================

// Gerar relatório mensal
router.get('/relatorios/mensal', financeiroController.gerarRelatorioMensal)

// Exportar fluxo de caixa
router.get(
  '/relatorios/fluxo-caixa/exportar',
  financeiroController.exportarFluxoCaixa
)

// Comparativo entradas vs saídas
router.get('/relatorios/comparativo', async (req, res) => {
  try {
    const { ano = new Date().getFullYear(), meses = 12 } = req.query

    const dados = []

    for (let i = 0; i < meses; i++) {
      const data = new Date(ano, i, 1)
      const mes = (data.getMonth() + 1).toString().padStart(2, '0')
      const anoAtual = data.getFullYear()

      const resumo = await financeiroController.db.get(`
        SELECT 
          SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as entradas,
          SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) as saidas
        FROM fluxo_caixa 
        WHERE strftime('%Y-%m', data_movimentacao) = '${anoAtual}-${mes}'
      `)

      dados.push({
        mes: `${mes}/${anoAtual}`,
        entradas: resumo.entradas || 0,
        saidas: resumo.saidas || 0,
        saldo: (resumo.entradas || 0) - (resumo.saidas || 0),
      })
    }

    res.json({
      success: true,
      data: dados,
      periodo: `${ano} - Últimos ${meses} meses`,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar comparativo',
    })
  }
})

// ==================== UTILITÁRIOS ====================

// Atualizar status automático das contas (executar diariamente)
router.post(
  '/utilitarios/atualizar-status',
  financeiroController.atualizarStatusContas
)

// Resumo rápido para widgets
router.get('/resumo-rapido', async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0]
    const inicioMes = new Date().toISOString().substr(0, 8) + '01'

    // Saldo atual
    const saldoAtual = await financeiroController.db.get(`
      SELECT 
        SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) - 
        SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) as saldo
      FROM fluxo_caixa
    `)

    // Entradas do mês
    const entradas = await financeiroController.db.get(
      `
      SELECT SUM(valor) as total, COUNT(*) as count
      FROM fluxo_caixa 
      WHERE tipo = 'entrada' AND data_movimentacao >= ?
    `,
      [inicioMes]
    )

    // Saídas do mês
    const saidas = await financeiroController.db.get(
      `
      SELECT SUM(valor) as total, COUNT(*) as count
      FROM fluxo_caixa 
      WHERE tipo = 'saida' AND data_movimentacao >= ?
    `,
      [inicioMes]
    )

    // Contas vencendo hoje
    const contasVencendoHoje = await financeiroController.db.all(
      `
      SELECT 'pagar' as tipo, COUNT(*) as count, SUM(valor) as total
      FROM contas_pagar 
      WHERE data_vencimento = ? AND status = 'pendente'
      UNION ALL
      SELECT 'receber' as tipo, COUNT(*) as count, SUM(valor) as total
      FROM contas_receber 
      WHERE data_vencimento = ? AND status = 'pendente'
    `,
      [hoje, hoje]
    )

    res.json({
      success: true,
      data: {
        saldoAtual: saldoAtual.saldo || 0,
        entradasMes: {
          total: entradas.total || 0,
          count: entradas.count || 0,
        },
        saidasMes: {
          total: saidas.total || 0,
          count: saidas.count || 0,
        },
        contasVencendoHoje,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar resumo rápido',
    })
  }
})

// Estatísticas por período
router.get('/estatisticas', async (req, res) => {
  try {
    const { periodo = 'mes' } = req.query // 'mes', 'trimestre', 'ano'

    let groupBy
    switch (periodo) {
      case 'trimestre':
        groupBy =
          "strftime('%Y-Q', data_movimentacao, 'start of year', '+' || ((strftime('%m', data_movimentacao) - 1) / 3) || ' months')"
        break
      case 'ano':
        groupBy = "strftime('%Y', data_movimentacao)"
        break
      default:
        groupBy = "strftime('%Y-%m', data_movimentacao)"
    }

    const estatisticas = await financeiroController.db.all(`
      SELECT 
        ${groupBy} as periodo,
        SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as entradas,
        SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) as saidas,
        COUNT(*) as total_movimentacoes
      FROM fluxo_caixa 
      GROUP BY ${groupBy}
      ORDER BY periodo DESC
      LIMIT 12
    `)

    res.json({
      success: true,
      data: estatisticas.map((stat) => ({
        ...stat,
        saldo: stat.entradas - stat.saidas,
      })),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar estatísticas',
    })
  }
})

module.exports = router
