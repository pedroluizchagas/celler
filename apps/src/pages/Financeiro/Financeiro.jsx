import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Button,
  useTheme,
  useMediaQuery,
  Stack,
  Chip,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as AttachMoneyIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import financeiroService from '../../services/financeiroService'

// Componentes das abas
import FluxoCaixaTab from '../../components/Financeiro/FluxoCaixaTab'
import ContasPagarTab from '../../components/Financeiro/ContasPagarTab'
import ContasReceberTab from '../../components/Financeiro/ContasReceberTab'
import RelatoriosTab from '../../components/Financeiro/RelatoriosTab'

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`financeiro-tabpanel-${index}`}
      aria-labelledby={`financeiro-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

const Financeiro = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [tabAtual, setTabAtual] = useState(0)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [erro, setErro] = useState('')

  const carregarDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setErro('')

      const response = await financeiroService.dashboardFinanceiro()
      setDashboard(response.data)
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
      setErro('Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    carregarDashboard()
  }, [])

  const handleTabChange = (event, newValue) => {
    setTabAtual(newValue)
  }

  const handleRefresh = () => {
    carregarDashboard(true)
  }

  // Cards do resumo financeiro
  const renderResumoCards = () => {
    if (!dashboard) return null

    const cards = [
      {
        titulo: 'Saldo Atual',
        valor: financeiroService.formatarMoeda(dashboard.saldoAtual),
        icon: AccountBalanceIcon,
        cor: dashboard.saldoAtual >= 0 ? 'success' : 'error',
        trend: dashboard.saldoAtual >= 0 ? 'up' : 'down',
        descricao:
          dashboard.saldoAtual >= 0
            ? 'Situação positiva'
            : 'Atenção necessária',
      },
      {
        titulo: 'Entradas do Mês',
        valor: financeiroService.formatarMoeda(dashboard.entradas.total),
        icon: TrendingUpIcon,
        cor: 'success',
        trend: 'up',
        descricao: 'Receitas registradas',
      },
      {
        titulo: 'Saídas do Mês',
        valor: financeiroService.formatarMoeda(dashboard.saidas.total),
        icon: TrendingDownIcon,
        cor: 'error',
        trend: 'down',
        descricao: 'Despesas registradas',
      },
    ]

    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              elevation={3}
              sx={{
                background:
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(26, 26, 26, 0.9), rgba(50, 50, 50, 0.8))'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8))',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: theme.shadows[12],
                  border: `1px solid ${theme.palette[card.cor].main}33`,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      bgcolor: `${card.cor}.main`,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 2,
                    }}
                  >
                    <card.icon sx={{ fontSize: 28 }} />
                  </Box>
                  <Box flex={1}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5, fontWeight: 500 }}
                    >
                      {card.titulo}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
                      {card.valor}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      {card.descricao}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    )
  }

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
          spacing={2}
        >
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, fontWeight: 500 }}>
            Carregando módulo financeiro...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aguarde enquanto carregamos seus dados
          </Typography>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Principal */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={3}
        sx={{ mb: 5 }}
      >
        <Box>
          <Typography
            variant="h3"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #ff0000, #ff0040)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            💰 Financeiro
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ fontWeight: 400, lineHeight: 1.4 }}
          >
            Gestão completa do fluxo de caixa e controle financeiro
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, opacity: 0.8 }}
          >
            Controle suas receitas, despesas e acompanhe o crescimento do seu
            negócio
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <Tooltip title="Atualizar dados financeiros">
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              color="primary"
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                '&:hover': {
                  backgroundColor: 'rgba(255, 0, 0, 0.05)',
                },
              }}
            >
              {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Alert de Erro */}
      {erro && (
        <Alert
          severity="error"
          sx={{
            mb: 4,
            borderRadius: 2,
            '& .MuiAlert-message': {
              fontSize: '0.95rem',
            },
          }}
          onClose={() => setErro('')}
        >
          {erro}
        </Alert>
      )}

      {/* Cards de Resumo */}
      {renderResumoCards()}

      {/* Área das Abas */}
      <Paper
        elevation={4}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          background:
            theme.palette.mode === 'dark'
              ? 'rgba(26, 26, 26, 0.6)'
              : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Barra de Abas */}
        <Box
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(26, 26, 26, 0.8), rgba(50, 50, 50, 0.6))'
                : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8), rgba(255, 255, 255, 0.9))',
          }}
        >
          <Tabs
            value={tabAtual}
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'fullWidth'}
            scrollButtons={isMobile ? 'auto' : false}
            sx={{
              '& .MuiTab-root': {
                minHeight: 72,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                py: 2,
                px: 3,
                '&.Mui-selected': {
                  color: 'primary.main',
                  background: 'rgba(255, 0, 0, 0.05)',
                },
                '&:hover': {
                  background: 'rgba(255, 0, 0, 0.02)',
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab
              icon={<AccountBalanceIcon />}
              label="Fluxo de Caixa"
              iconPosition="start"
            />
            <Tab
              icon={<PaymentIcon />}
              label="Contas a Pagar"
              iconPosition="start"
            />
            <Tab
              icon={<ReceiptIcon />}
              label="Contas a Receber"
              iconPosition="start"
            />
            <Tab
              icon={<AssessmentIcon />}
              label="Relatórios"
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Conteúdo das Abas */}
        <Box sx={{ minHeight: 400 }}>
          <TabPanel value={tabAtual} index={0}>
            <FluxoCaixaTab onRefresh={handleRefresh} />
          </TabPanel>

          <TabPanel value={tabAtual} index={1}>
            <ContasPagarTab onRefresh={handleRefresh} />
          </TabPanel>

          <TabPanel value={tabAtual} index={2}>
            <ContasReceberTab onRefresh={handleRefresh} />
          </TabPanel>

          <TabPanel value={tabAtual} index={3}>
            <RelatoriosTab dashboard={dashboard} />
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  )
}

export default Financeiro
