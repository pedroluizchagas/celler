import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material'
import {
  Assessment as ReportIcon,
  TrendingUp as TrendingUpIcon,
  Message as MessageIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material'
import whatsappService from '../../services/whatsappService'

export default function WhatsAppReports() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('today')
  const [queue, setQueue] = useState([])

  const periods = [
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: 'Esta Semana' },
    { value: 'month', label: 'Este Mês' },
    { value: 'year', label: 'Este Ano' },
  ]

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async () => {
    try {
      setLoading(true)
      const [reportResponse, queueResponse] = await Promise.all([
        whatsappService.getReport({ period }),
        whatsappService.getHumanQueue(),
      ])

      setReport(reportResponse.data)
      setQueue(queueResponse.data || [])
    } catch (err) {
      setError('Erro ao carregar relatórios')
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodChange = (event) => {
    setPeriod(event.target.value)
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('pt-BR')
  }

  const getQueueStatusColor = (status) => {
    switch (status) {
      case 'waiting':
        return 'warning'
      case 'attending':
        return 'info'
      case 'resolved':
        return 'success'
      default:
        return 'default'
    }
  }

  const getQueueStatusText = (status) => {
    switch (status) {
      case 'waiting':
        return 'Aguardando'
      case 'attending':
        return 'Em Atendimento'
      case 'resolved':
        return 'Resolvido'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Carregando relatórios...
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Controles */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Período</InputLabel>
          <Select value={period} onChange={handlePeriodChange} label="Período">
            {periods.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                {p.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => window.print()}
        >
          Exportar Relatório
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Cards de estatísticas */}
        {report && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <MessageIcon
                    sx={{ fontSize: 40, color: 'primary.main', mb: 2 }}
                  />
                  <Typography variant="h4" component="div">
                    {report.totalMessages || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total de Mensagens
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <PersonIcon
                    sx={{ fontSize: 40, color: 'success.main', mb: 2 }}
                  />
                  <Typography variant="h4" component="div">
                    {report.uniqueContacts || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Contatos Únicos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CheckCircleIcon
                    sx={{ fontSize: 40, color: 'info.main', mb: 2 }}
                  />
                  <Typography variant="h4" component="div">
                    {report.botInteractions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Interações do Bot
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <TrendingUpIcon
                    sx={{ fontSize: 40, color: 'warning.main', mb: 2 }}
                  />
                  <Typography variant="h4" component="div">
                    {report.responseRate || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Taxa de Resposta
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Comandos mais utilizados */}
        {report?.topCommands && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Comandos Mais Utilizados
                </Typography>
                <List>
                  {report.topCommands.map((command, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Chip label={index + 1} size="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={command.intent}
                        secondary={`${command.count} vezes`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Horários de pico */}
        {report?.peakHours && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Horários de Pico
                </Typography>
                <List>
                  {report.peakHours.map((hour, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <ScheduleIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${hour.hour}:00 - ${hour.hour + 1}:00`}
                        secondary={`${hour.count} mensagens`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Fila de Atendimento Humano */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Fila de Atendimento Humano ({queue.length})
              </Typography>

              {queue.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <CheckCircleIcon
                    sx={{ fontSize: 64, color: 'success.main', mb: 2 }}
                  />
                  <Typography variant="h6" color="success.main">
                    Nenhum cliente na fila!
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Todos os atendimentos foram resolvidos
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Telefone</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Prioridade</TableCell>
                        <TableCell>Criado em</TableCell>
                        <TableCell>Atendido por</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {queue.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.cliente_nome || 'Cliente não identificado'}
                          </TableCell>
                          <TableCell>{item.phone_number}</TableCell>
                          <TableCell>
                            <Chip
                              label={getQueueStatusText(item.status)}
                              color={getQueueStatusColor(item.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`Prioridade ${item.priority}`}
                              color={
                                item.priority >= 3
                                  ? 'error'
                                  : item.priority >= 2
                                  ? 'warning'
                                  : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {formatTimestamp(item.created_at)}
                          </TableCell>
                          <TableCell>{item.assigned_to || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Resumo do período */}
        {report && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Resumo do Período
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h5" color="primary">
                      {report.messagesReceived || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mensagens Recebidas
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h5" color="secondary">
                      {report.messagesSent || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mensagens Enviadas
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h5" color="success.main">
                      {report.autoResponses || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Respostas Automáticas
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h5" color="warning.main">
                      {report.humanHandovers || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Encaminhamentos Humanos
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}
