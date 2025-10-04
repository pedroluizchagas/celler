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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  WhatsApp as WhatsAppIcon,
  QrCode as QrCodeIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'

// Importar componentes das abas
import WhatsAppStatus from '../../components/WhatsApp/WhatsAppStatus'
import WhatsAppMessages from '../../components/WhatsApp/WhatsAppMessages'
import WhatsAppSettings from '../../components/WhatsApp/WhatsAppSettings'
import WhatsAppReports from '../../components/WhatsApp/WhatsAppReports'

// Importar serviços
import whatsappService from '../../services/whatsappService'

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`whatsapp-tabpanel-${index}`}
      aria-labelledby={`whatsapp-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export default function WhatsApp() {
  const [tabValue, setTabValue] = useState(0)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrCode, setQrCode] = useState(null)
  const [stats, setStats] = useState(null)
  const [qrRefreshInterval, setQrRefreshInterval] = useState(null)

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData()
    // Atualizar status a cada 10 segundos
    const interval = setInterval(loadStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  // Gerenciar refresh automático do QR Code
  useEffect(() => {
    if (qrDialogOpen) {
      // Refresh automático a cada 30 segundos
      const interval = setInterval(() => {
        handleShowQR()
      }, 30000)
      setQrRefreshInterval(interval)
      
      return () => {
        if (interval) {
          clearInterval(interval)
        }
      }
    } else {
      // Limpar interval quando dialog fechar
      if (qrRefreshInterval) {
        clearInterval(qrRefreshInterval)
        setQrRefreshInterval(null)
      }
    }
  }, [qrDialogOpen])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      await Promise.all([loadStatus(), loadStats()])
    } catch (err) {
      setError('Erro ao carregar dados do WhatsApp')
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStatus = async () => {
    try {
      const response = await whatsappService.getStatus()
      setStatus(response.data)
    } catch (err) {
      console.error('Erro ao carregar status:', err)
    }
  }

  const loadStats = async () => {
    try {
      const response = await whatsappService.getStats()
      setStats(response.data)
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err)
    }
  }

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  const handleShowQR = async () => {
    try {
      const response = await whatsappService.getQRCode()
      setQrCode(response.data.qrBase64)
      setQrDialogOpen(true)
    } catch (err) {
      setError('Erro ao obter QR Code')
      console.error('Erro QR Code:', err)
    }
  }

  const handleCloseQR = () => {
    setQrDialogOpen(false)
    setQrCode(null)
  }

  const handleRefresh = () => {
    loadInitialData()
  }

  const getStatusColor = () => {
    if (!status) return 'default'
    return status.connected ? 'success' : 'error'
  }

  const getStatusText = () => {
    if (!status) return 'Carregando...'
    return status.connected ? 'Conectado' : 'Desconectado'
  }

  const getStatusIcon = () => {
    if (!status) return <CircularProgress size={20} />
    return status.connected ? <CheckCircleIcon /> : <ErrorIcon />
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
            Carregando WhatsApp...
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
            <WhatsAppIcon sx={{ fontSize: 40, color: '#25D366', mr: 2 }} />
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                WhatsApp Business
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Gerenciamento de mensagens e atendimento automatizado
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip
              icon={getStatusIcon()}
              label={getStatusText()}
              color={getStatusColor()}
              variant="outlined"
            />
            <Tooltip title="Atualizar">
              <IconButton onClick={handleRefresh} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Cards de estatísticas rápidas */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <MessageIcon
                    sx={{ fontSize: 40, color: 'primary.main', mb: 1 }}
                  />
                  <Typography variant="h4" component="div">
                    {stats.totalMessages || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mensagens Hoje
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CheckCircleIcon
                    sx={{ fontSize: 40, color: 'success.main', mb: 1 }}
                  />
                  <Typography variant="h4" component="div">
                    {stats.totalInteractions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Interações Bot
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <WarningIcon
                    sx={{ fontSize: 40, color: 'warning.main', mb: 1 }}
                  />
                  <Typography variant="h4" component="div">
                    {stats.queueCount || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Fila Atendimento
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <WhatsAppIcon
                    sx={{ fontSize: 40, color: '#25D366', mb: 1 }}
                  />
                  <Typography variant="h4" component="div">
                    {stats.activeChats || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Chats Ativos
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

        {!status?.connected && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleShowQR}>
                Conectar
              </Button>
            }
          >
            WhatsApp não está conectado. Clique em "Conectar" para escanear o QR
            Code.
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
          <Tab icon={<CheckCircleIcon />} label="Status" id="whatsapp-tab-0" />
          <Tab icon={<MessageIcon />} label="Mensagens" id="whatsapp-tab-1" />
          <Tab
            icon={<SettingsIcon />}
            label="Configurações"
            id="whatsapp-tab-2"
          />
          <Tab icon={<ReportIcon />} label="Relatórios" id="whatsapp-tab-3" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <WhatsAppStatus
            status={status}
            onRefresh={loadStatus}
            onShowQR={handleShowQR}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <WhatsAppMessages />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <WhatsAppSettings />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <WhatsAppReports />
        </TabPanel>
      </Paper>

      {/* Dialog QR Code */}
      <Dialog
        open={qrDialogOpen}
        onClose={handleCloseQR}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <QrCodeIcon sx={{ mr: 2 }} />
            Conectar WhatsApp Business
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Escaneie o QR Code abaixo com seu WhatsApp Business:
          </Typography>
          {qrCode ? (
            <Box display="flex" justifyContent="center" p={2}>
              <img
                src={qrCode}
                alt="QR Code WhatsApp"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            1. Abra o WhatsApp Business no seu celular
            <br />
            2. Toque em Menu → Dispositivos conectados
            <br />
            3. Toque em "Conectar um dispositivo"
            <br />
            4. Escaneie este código QR
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQR}>Fechar</Button>
          <Button onClick={handleShowQR} variant="contained">
            Atualizar QR
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
