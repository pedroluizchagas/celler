import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Button,
  Avatar,
  LinearProgress,
} from '@mui/material'
import {
  SmartToy as BotIcon,
  Psychology as TrainingIcon,
  Analytics as AnalyticsIcon,
  Settings as ConfigIcon,
  PlayArrow as SimulatorIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material'

// Importar componentes das abas
import BotTraining from '../../components/BotIA/BotTraining'
import BotAnalytics from '../../components/BotIA/BotAnalytics'
import BotConfig from '../../components/BotIA/BotConfig'
import BotSimulator from '../../components/BotIA/BotSimulator'
import BotReports from '../../components/BotIA/BotReports'

// Importar serviços
import whatsappService from '../../services/whatsappService'

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`bot-tabpanel-${index}`}
      aria-labelledby={`bot-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export default function BotIA() {
  const [tabValue, setTabValue] = useState(0)
  const [botStats, setBotStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [whatsappStatus, setWhatsappStatus] = useState(null)

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData()
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(loadBotStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      await Promise.all([loadBotStats(), loadWhatsAppStatus()])
    } catch (err) {
      setError('Erro ao carregar dados do Bot IA')
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBotStats = async () => {
    try {
      const response = await whatsappService.getStats()
      setBotStats(response.data)
    } catch (err) {
      console.error('Erro ao carregar estatísticas do bot:', err)
    }
  }

  const loadWhatsAppStatus = async () => {
    try {
      const response = await whatsappService.getStatus()
      setWhatsappStatus(response.data)
    } catch (err) {
      console.error('Erro ao carregar status WhatsApp:', err)
    }
  }

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  const handleRefresh = () => {
    loadInitialData()
  }

  const getBotStatusColor = () => {
    if (!whatsappStatus) return 'default'
    return whatsappStatus.connected ? 'success' : 'error'
  }

  const getBotStatusText = () => {
    if (!whatsappStatus) return 'Verificando...'
    return whatsappStatus.connected ? 'Bot Ativo' : 'Bot Inativo'
  }

  const getBotStatusIcon = () => {
    if (!whatsappStatus) return <CircularProgress size={20} />
    return whatsappStatus.connected ? <CheckCircleIcon /> : <ErrorIcon />
  }

  const calculateEfficiency = () => {
    if (!botStats) return 0
    const total = botStats.totalInteractions || 0
    const resolved = botStats.resolvedByBot || 0
    return total > 0 ? Math.round((resolved / total) * 100) : 0
  }

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 80) return 'success'
    if (efficiency >= 60) return 'warning'
    return 'error'
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Carregando Bot IA...
          </Typography>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Cabeçalho */}
      <Box sx={{ mb: 3 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Box display="flex" alignItems="center">
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                width: 56,
                height: 56,
                mr: 2,
                background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
              }}
            >
              <BotIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Bot IA - Assistente Virtual
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Inteligência artificial para atendimento automatizado
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip
              icon={getBotStatusIcon()}
              label={getBotStatusText()}
              color={getBotStatusColor()}
              variant="outlined"
              size="medium"
            />
            <Tooltip title="Atualizar Dados">
              <IconButton onClick={handleRefresh} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Cards de métricas principais */}
        {botStats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <BotIcon
                    sx={{ fontSize: 40, color: 'primary.main', mb: 1 }}
                  />
                  <Typography variant="h4" component="div">
                    {botStats.totalInteractions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Interações Hoje
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <SpeedIcon
                    sx={{ fontSize: 40, color: 'success.main', mb: 1 }}
                  />
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    mb={1}
                  >
                    <Typography variant="h4" component="div">
                      {calculateEfficiency()}%
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Eficiência
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={calculateEfficiency()}
                    color={getEfficiencyColor(calculateEfficiency())}
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CheckCircleIcon
                    sx={{ fontSize: 40, color: 'info.main', mb: 1 }}
                  />
                  <Typography variant="h4" component="div">
                    {botStats.resolvedByBot || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Resolvidas pelo Bot
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <TrendingUpIcon
                    sx={{ fontSize: 40, color: 'warning.main', mb: 1 }}
                  />
                  <Typography variant="h4" component="div">
                    {botStats.averageResponseTime || '0.5'}s
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tempo de Resposta
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Alertas */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!whatsappStatus?.connected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            WhatsApp não está conectado. O Bot IA não pode funcionar sem conexão
            WhatsApp.
            <Button
              color="inherit"
              size="small"
              onClick={() => (window.location.href = '/whatsapp')}
              sx={{ ml: 2 }}
            >
              Conectar WhatsApp
            </Button>
          </Alert>
        )}

        {whatsappStatus?.connected && calculateEfficiency() < 60 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            A eficiência do bot está abaixo de 60%. Considere treinar o bot com
            mais respostas na aba "Treinamento".
          </Alert>
        )}
      </Box>

      {/* Abas */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<TrainingIcon />} label="Treinamento" id="bot-tab-0" />
          <Tab icon={<AnalyticsIcon />} label="Analytics" id="bot-tab-1" />
          <Tab icon={<ConfigIcon />} label="Configuração" id="bot-tab-2" />
          <Tab icon={<SimulatorIcon />} label="Simulador" id="bot-tab-3" />
          <Tab icon={<ReportIcon />} label="Relatórios" id="bot-tab-4" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <BotTraining />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <BotAnalytics botStats={botStats} />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <BotConfig />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <BotSimulator />
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <BotReports />
        </TabPanel>
      </Paper>
    </Container>
  )
}
