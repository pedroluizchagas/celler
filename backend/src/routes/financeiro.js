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
    const ano = parseInt(req.query.ano || new Date().getFullYear())
    const meses = parseInt(req.query.meses || 12)
    const dados = await financeiroController.db.rpc('finance_comparativo', { ano, meses })
    return res.json({ success: true, data: dados, periodo: `${ano} - últimos ${meses} meses` })
  } catch (error) {
    const { respondWithError } = require('../utils/http-error')
    return respondWithError(res, error, 'Erro ao gerar comparativo')
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
    const [resumoArr, vencendoHoje] = await Promise.all([
      financeiroController.db.rpc('finance_resumo_rapido', { desde: inicioMes }),
      financeiroController.db.rpc('finance_vencendo_hoje', { hoje }),
    ])
    const resumo = Array.isArray(resumoArr) ? (resumoArr[0] || {}) : (resumoArr || {})
    return res.json({
      success: true,
      data: {
        saldoAtual: resumo.saldo_atual || 0,
        entradasMes: { total: resumo.entradas_total || 0, count: resumo.entradas_count || 0 },
        saidasMes: { total: resumo.saidas_total || 0, count: resumo.saidas_count || 0 },
        contasVencendoHoje: Array.isArray(vencendoHoje) ? vencendoHoje : [],
      },
    })
  } catch (error) {
    const { respondWithError } = require('../utils/http-error')
    return respondWithError(res, error, 'Erro ao carregar resumo rápido')
  }
})


// Estatísticas por período

router.get('/estatisticas', async (req, res) => {
  try {
    const periodo = (req.query.periodo || 'mes').toString()
    const rows = await financeiroController.db.rpc('finance_estatisticas', { periodo, limit_val: 12 })
    const data = (rows || []).map((r) => ({
      periodo: r.periodo_label,
      entradas: Number(r.entradas || 0),
      saidas: Number(r.saidas || 0),
      total_movimentacoes: Number(r.total_movimentacoes || 0),
      saldo: Number(r.entradas || 0) - Number(r.saidas || 0),
    }))
    return res.json({ success: true, data })
  } catch (error) {
    const { respondWithError } = require('../utils/http-error')
    return respondWithError(res, error, 'Erro ao carregar estatísticas')
  }
})


module.exports = router
