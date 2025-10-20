import { Router } from 'express'

export const router = Router()

// Mock simples para billing enquanto backend real não existe
router.get('/summary', (_req, res) => {
  const now = Date.now()
  const summary = {
    plan: 'Starter',
    status: 'active',
    current_period_start: new Date(now).toISOString(),
    current_period_end: new Date(now + 1000 * 60 * 60 * 24 * 30).toISOString(),
    next_billing_date: new Date(now + 1000 * 60 * 60 * 24 * 30).toISOString(),
    payment_method: 'credit_card',
    amount: 59.9,
    currency: 'BRL',
    invoices: [
      {
        id: 'inv_stub_1',
        status: 'paid',
        amount: 59.9,
        paid_at: new Date(now - 1000 * 60 * 60 * 24 * 28).toISOString(),
      },
    ],
  }
  res.json({ data: summary })
})

router.post('/cancel', (_req, res) => {
  res.json({ ok: true, message: 'Assinatura cancelada (stub).' })
})

router.post('/change-plan', (req, res) => {
  const { plan } = req.body || {}
  res.json({ ok: true, message: `Plano alterado para ${plan || 'desconhecido'} (stub).` })
})

router.get('/portal', (_req, res) => {
  res.json({ url: '#' })
})

