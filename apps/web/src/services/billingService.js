import api from './api'

const mockSummary = {
  plan: 'Starter',
  status: 'active',
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  next_billing_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  payment_method: 'credit_card',
  amount: 59.9,
  currency: 'BRL',
  invoices: [
    {
      id: 'inv_mock_1',
      status: 'paid',
      amount: 59.9,
      paid_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
    },
  ],
}

export const billingService = {
  async getSummary() {
    try {
      const res = await api.get('/billing/summary')
      return res.data?.data || res.data || mockSummary
    } catch (e) {
      // Fallback para mock enquanto backend não existe
      return mockSummary
    }
  },

  async cancelSubscription() {
    try {
      const res = await api.post('/billing/cancel')
      return res.data
    } catch (e) {
      throw new Error(e.response?.data?.error || 'Falha ao cancelar assinatura')
    }
  },

  async changePlan(plan) {
    try {
      const res = await api.post('/billing/change-plan', { plan })
      return res.data
    } catch (e) {
      throw new Error(e.response?.data?.error || 'Falha ao alterar plano')
    }
  },
  async getPortalLink() {
    try {
      const res = await api.get('/billing/portal')
      return res.data?.url || '#'
    } catch {
      return '#'
    }
  },
}

export default billingService
