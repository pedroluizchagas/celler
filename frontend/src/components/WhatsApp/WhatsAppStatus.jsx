import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  Avatar,
} from '@mui/material'
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PhoneAndroid as PhoneIcon,
  Schedule as ScheduleIcon,
  QrCode as QrCodeIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
} from '@mui/icons-material'

export default function WhatsAppStatus({ status, onRefresh, onShowQR }) {
  const [loading, setLoading] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    await onRefresh()
    setLoading(false)
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleString('pt-BR')
  }

  const getConnectionStatusColor = () => {
    if (!status) return 'default'
    return status.connected ? 'success' : 'error'
  }

  const getConnectionStatusText = () => {
    if (!status) return 'Verificando...'
    return status.connected ? 'Conectado' : 'Desconectado'
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Card principal de status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="between"
                mb={2}
              >
                <Typography variant="h6" component="h2">
                  Status da Conexão
                </Typography>
                <Button
                  size="small"
                  onClick={handleRefresh}
                  disabled={loading}
                  startIcon={
                    loading ? <CircularProgress size={16} /> : <RefreshIcon />
                  }
                >
                  Atualizar
                </Button>
              </Box>

              <Box display="flex" alignItems="center" mb={3}>
                <Avatar
                  sx={{
                    bgcolor: status?.connected ? 'success.main' : 'error.main',
                    mr: 2,
                    width: 56,
                    height: 56,
                  }}
                >
                  {status?.connected ? <CheckCircleIcon /> : <ErrorIcon />}
                </Avatar>
                <Box>
                  <Chip
                    label={getConnectionStatusText()}
                    color={getConnectionStatusColor()}
                    size="large"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Última verificação: {formatTimestamp(status?.timestamp)}
                  </Typography>
                </Box>
              </Box>

              {!status?.connected && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  WhatsApp não está conectado. Clique no botão abaixo para
                  conectar.
                </Alert>
              )}

              <Box display="flex" gap={2}>
                {!status?.connected && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<QrCodeIcon />}
                    onClick={onShowQR}
                    fullWidth
                  >
                    Conectar WhatsApp
                  </Button>
                )}
                {status?.connected && (
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    fullWidth
                    disabled
                  >
                    WhatsApp Conectado
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Informações do cliente conectado */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Informações do Dispositivo
              </Typography>

              {status?.clientInfo ? (
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Nome"
                      secondary={status.clientInfo.pushname || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Número"
                      secondary={status.clientInfo.wid?.user || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <BusinessIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Plataforma"
                      secondary={status.clientInfo.platform || 'WhatsApp Web'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <ScheduleIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Conectado em"
                      secondary={formatTimestamp(
                        status.clientInfo.connected_at
                      )}
                    />
                  </ListItem>
                </List>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="body2" color="text.secondary">
                    {status?.connected
                      ? 'Carregando informações do dispositivo...'
                      : 'Conecte o WhatsApp para ver as informações'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Instruções de conexão */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Como conectar o WhatsApp Business
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Para conectar seu WhatsApp Business ao sistema, siga os passos
              abaixo:
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center" p={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2 }}>
                    1
                  </Avatar>
                  <Typography variant="subtitle2" gutterBottom>
                    Abra o WhatsApp Business
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No seu smartphone
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center" p={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2 }}>
                    2
                  </Avatar>
                  <Typography variant="subtitle2" gutterBottom>
                    Acesse o Menu
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toque nos três pontos
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center" p={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2 }}>
                    3
                  </Avatar>
                  <Typography variant="subtitle2" gutterBottom>
                    Dispositivos Conectados
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toque na opção
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center" p={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2 }}>
                    4
                  </Avatar>
                  <Typography variant="subtitle2" gutterBottom>
                    Escaneie o QR Code
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Aponte para o código
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
