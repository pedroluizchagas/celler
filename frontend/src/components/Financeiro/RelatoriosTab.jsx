import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Stack,
  Grid,
  Card,
  CardContent,
  useTheme,
  Paper,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material'
import {
  GetApp as GetAppIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  FileDownload as FileDownloadIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material'
import financeiroService from '../../services/financeiroService'

const RelatoriosTab = ({ dashboard }) => {
  const theme = useTheme()

  // Estados
  const [relatorioSelecionado, setRelatorioSelecionado] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dadosRelatorio, setDadosRelatorio] = useState(null)
  const [comparativo, setComparativo] = useState(null)
  const [estatisticas, setEstatisticas] = useState(null)

  // Parâmetros para relatórios
  const [parametros, setParametros] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    dataInicio: '',
    dataFim: '',
    formato: 'json',
    periodo: 'mes',
  })

  // Configuração dos relatórios
  const relatorios = [
    {
      id: 'mensal',
      titulo: 'Relatório Mensal',
      descricao: 'Resumo completo das movimentações do mês',
      icon: AssessmentIcon,
      cor: 'primary',
      requerParametros: true,
      campos: ['mes', 'ano'],
    },
    {
      id: 'fluxo-caixa',
      titulo: 'Fluxo de Caixa',
      descricao: 'Exportar histórico completo do fluxo de caixa',
      icon: AccountBalanceIcon,
      cor: 'info',
      requerParametros: true,
      campos: ['dataInicio', 'dataFim', 'formato'],
    },
    {
      id: 'comparativo',
      titulo: 'Entradas vs Saídas',
      descricao: 'Comparativo de receitas e despesas por período',
      icon: BarChartIcon,
      cor: 'success',
      requerParametros: true,
      campos: ['ano', 'periodo'],
    },
    {
      id: 'estatisticas',
      titulo: 'Estatísticas Gerais',
      descricao: 'Análise estatística do desempenho financeiro',
      icon: TimelineIcon,
      cor: 'warning',
      requerParametros: true,
      campos: ['periodo'],
    },
  ]

  // Carregar dados iniciais
  useEffect(() => {
    carregarComparativo()
    carregarEstatisticas()
  }, [])

  const carregarComparativo = async () => {
    try {
      const response = await financeiroService.gerarComparativo(
        new Date().getFullYear(),
        12
      )
      setComparativo(response.data)
    } catch (error) {
      console.error('Erro ao carregar comparativo:', error)
    }
  }

  const carregarEstatisticas = async () => {
    try {
      const response = await financeiroService.estatisticas('mes')
      setEstatisticas(response.data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const abrirModalRelatorio = (relatorio) => {
    setRelatorioSelecionado(relatorio)

    // Resetar parâmetros baseado no relatório
    if (relatorio.id === 'mensal') {
      setParametros((prev) => ({
        ...prev,
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
      }))
    } else if (relatorio.id === 'fluxo-caixa') {
      const hoje = new Date()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      setParametros((prev) => ({
        ...prev,
        dataInicio: inicioMes.toISOString().split('T')[0],
        dataFim: hoje.toISOString().split('T')[0],
        formato: 'json',
      }))
    }

    setModalAberto(true)
  }

  const gerarRelatorio = async () => {
    try {
      setLoading(true)
      setDadosRelatorio(null)

      let response

      switch (relatorioSelecionado.id) {
        case 'mensal':
          response = await financeiroService.gerarRelatorioMensal(
            parametros.mes,
            parametros.ano
          )
          break

        case 'fluxo-caixa':
          response = await financeiroService.exportarFluxoCaixa(
            parametros.dataInicio,
            parametros.dataFim,
            parametros.formato
          )
          break

        case 'comparativo':
          response = await financeiroService.gerarComparativo(
            parametros.ano,
            12
          )
          break

        case 'estatisticas':
          response = await financeiroService.estatisticas(parametros.periodo)
          break

        default:
          throw new Error('Tipo de relatório não reconhecido')
      }

      setDadosRelatorio(response.data)
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      alert('Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  const exportarRelatorio = () => {
    if (!dadosRelatorio) return

    const dataStr = JSON.stringify(dadosRelatorio, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio_${relatorioSelecionado.id}_${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const formatarRelatorioMensal = (dados) => {
    if (!dados) return null

    return (
      <Box>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          📊 Relatório Mensal - {dados.periodo}
        </Typography>

        {/* Resumo Geral */}
        <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            💰 Resumo Geral
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h5" color="success.main" fontWeight="bold">
                  {financeiroService.formatarMoeda(dados.resumo.total_entradas)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Entradas
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h5" color="error.main" fontWeight="bold">
                  {financeiroService.formatarMoeda(dados.resumo.total_saidas)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Saídas
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography
                  variant="h5"
                  color={
                    dados.resumo.saldo_liquido >= 0
                      ? 'success.main'
                      : 'error.main'
                  }
                  fontWeight="bold"
                >
                  {financeiroService.formatarMoeda(dados.resumo.saldo_liquido)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Saldo Líquido
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Por Categoria */}
        {dados.porCategoria && dados.porCategoria.length > 0 && (
          <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              🏷️ Movimentações por Categoria
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Categoria</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Quantidade</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(dados.porCategoria || []).map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{item.categoria}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={item.tipo === 'receita' ? 'Entrada' : 'Saída'}
                          color={item.tipo === 'receita' ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{item.quantidade}</TableCell>
                      <TableCell align="right">
                        {financeiroService.formatarMoeda(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Contas */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                💸 Contas Pagas
              </Typography>
              <Typography variant="h6" color="error.main">
                {dados.contasPagas.quantidade} contas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total:{' '}
                {financeiroService.formatarMoeda(dados.contasPagas.total)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                💰 Contas Recebidas
              </Typography>
              <Typography variant="h6" color="success.main">
                {dados.contasRecebidas.quantidade} contas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total:{' '}
                {financeiroService.formatarMoeda(dados.contasRecebidas.total)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    )
  }

  const formatarFluxoCaixa = (dados) => {
    if (!dados || !dados.data) return null

    return (
      <Box>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          💹 Fluxo de Caixa - {dados.periodo?.data_inicio} a{' '}
          {dados.periodo?.data_fim}
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          Total de {dados.total} movimentações encontradas
        </Alert>

        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Forma Pagamento</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(dados.data || []).slice(0, 50).map((mov, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    {financeiroService.formatarData(mov.data_movimentacao)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      color={mov.tipo === 'entrada' ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{mov.descricao}</TableCell>
                  <TableCell>{mov.categoria_nome || '-'}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color:
                        mov.tipo === 'entrada' ? 'success.main' : 'error.main',
                      fontWeight: 'bold',
                    }}
                  >
                    {financeiroService.formatarMoeda(mov.valor)}
                  </TableCell>
                  <TableCell>{mov.forma_pagamento}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {dados.data.length > 50 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Mostrando apenas as primeiras 50 movimentações. Use a exportação
            para ver todos os dados.
          </Alert>
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header da seção */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={3}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            📊 Relatórios Financeiros
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gere relatórios detalhados e analise o desempenho financeiro
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            carregarComparativo()
            carregarEstatisticas()
          }}
          sx={{ borderRadius: 2 }}
        >
          Atualizar Dados
        </Button>
      </Stack>

      {/* Cards de Relatórios */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          📋 Relatórios Disponíveis
        </Typography>

        <Grid container spacing={3}>
          {(relatorios || []).map((relatorio, index) => (
            <Grid item xs={12} sm={6} md={6} key={index}>
              <Card
                elevation={3}
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background:
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(26, 26, 26, 0.9), rgba(50, 50, 50, 0.8))'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8))',
                  backdropFilter: 'blur(20px)',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: theme.shadows[12],
                    border: `1px solid ${theme.palette[relatorio.cor].main}33`,
                  },
                }}
                onClick={() => abrirModalRelatorio(relatorio)}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      bgcolor: `${relatorio.cor}.main`,
                      color: 'white',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 2,
                      mb: 3,
                    }}
                  >
                    <relatorio.icon sx={{ fontSize: 32 }} />
                  </Box>

                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontWeight: 600, mb: 2 }}
                  >
                    {relatorio.titulo}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3, lineHeight: 1.5 }}
                  >
                    {relatorio.descricao}
                  </Typography>

                  <Button
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    size="medium"
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 3,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      abrirModalRelatorio(relatorio)
                    }}
                  >
                    Gerar Relatório
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Resumo Rápido do Dashboard */}
      {dashboard && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            ⚡ Resumo Rápido
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  textAlign: 'center',
                  border: `1px solid ${theme.palette.success.main}33`,
                  background:
                    theme.palette.mode === 'dark'
                      ? 'rgba(76, 175, 80, 0.05)'
                      : 'rgba(76, 175, 80, 0.02)',
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'success.main',
                    color: 'white',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <TrendingUpIcon sx={{ fontSize: 24 }} />
                </Box>

                <Typography
                  variant="h5"
                  color="success.main"
                  fontWeight="bold"
                  sx={{ mb: 1 }}
                >
                  {dashboard.entradas?.total
                    ? financeiroService.formatarMoeda(dashboard.entradas.total)
                    : 'R$ 0,00'}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                >
                  Total de Entradas
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: 'block' }}
                >
                  Receitas do período
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  textAlign: 'center',
                  border: `1px solid ${theme.palette.error.main}33`,
                  background:
                    theme.palette.mode === 'dark'
                      ? 'rgba(244, 67, 54, 0.05)'
                      : 'rgba(244, 67, 54, 0.02)',
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'error.main',
                    color: 'white',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <TrendingDownIcon sx={{ fontSize: 24 }} />
                </Box>

                <Typography
                  variant="h5"
                  color="error.main"
                  fontWeight="bold"
                  sx={{ mb: 1 }}
                >
                  {dashboard.saidas?.total
                    ? financeiroService.formatarMoeda(dashboard.saidas.total)
                    : 'R$ 0,00'}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                >
                  Total de Saídas
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: 'block' }}
                >
                  Despesas do período
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  textAlign: 'center',
                  border: `1px solid ${
                    dashboard.saldoAtual >= 0
                      ? theme.palette.success.main
                      : theme.palette.error.main
                  }33`,
                  background:
                    theme.palette.mode === 'dark'
                      ? `rgba(${
                          dashboard.saldoAtual >= 0
                            ? '76, 175, 80'
                            : '244, 67, 54'
                        }, 0.05)`
                      : `rgba(${
                          dashboard.saldoAtual >= 0
                            ? '76, 175, 80'
                            : '244, 67, 54'
                        }, 0.02)`,
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor:
                      dashboard.saldoAtual >= 0 ? 'success.main' : 'error.main',
                    color: 'white',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <AccountBalanceIcon sx={{ fontSize: 24 }} />
                </Box>

                <Typography
                  variant="h5"
                  color={
                    dashboard.saldoAtual >= 0 ? 'success.main' : 'error.main'
                  }
                  fontWeight="bold"
                  sx={{ mb: 1 }}
                >
                  {financeiroService.formatarMoeda(dashboard.saldoAtual || 0)}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                >
                  Saldo Atual
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: 'block' }}
                >
                  {dashboard.saldoAtual >= 0
                    ? 'Situação positiva'
                    : 'Atenção necessária'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Modal de Relatório */}
      <Dialog
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1, minHeight: '60vh' } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            {relatorioSelecionado && (
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: `${relatorioSelecionado.cor}.main`,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <relatorioSelecionado.icon sx={{ fontSize: 24 }} />
              </Box>
            )}
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {relatorioSelecionado?.titulo}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {relatorioSelecionado?.descricao}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {/* Parâmetros do Relatório */}
          {relatorioSelecionado?.requerParametros && (
            <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                ⚙️ Parâmetros do Relatório
              </Typography>

              <Grid container spacing={3}>
                {relatorioSelecionado.campos.includes('mes') && (
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Mês"
                      value={parametros.mes}
                      onChange={(e) =>
                        setParametros((prev) => ({
                          ...prev,
                          mes: e.target.value,
                        }))
                      }
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>
                          {new Date(2023, i).toLocaleDateString('pt-BR', {
                            month: 'long',
                          })}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}

                {relatorioSelecionado.campos.includes('ano') && (
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Ano"
                      value={parametros.ano}
                      onChange={(e) =>
                        setParametros((prev) => ({
                          ...prev,
                          ano: e.target.value,
                        }))
                      }
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const ano = new Date().getFullYear() - i
                        return (
                          <MenuItem key={ano} value={ano}>
                            {ano}
                          </MenuItem>
                        )
                      })}
                    </TextField>
                  </Grid>
                )}

                {relatorioSelecionado.campos.includes('dataInicio') && (
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Data Início"
                      value={parametros.dataInicio}
                      onChange={(e) =>
                        setParametros((prev) => ({
                          ...prev,
                          dataInicio: e.target.value,
                        }))
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                )}

                {relatorioSelecionado.campos.includes('dataFim') && (
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Data Fim"
                      value={parametros.dataFim}
                      onChange={(e) =>
                        setParametros((prev) => ({
                          ...prev,
                          dataFim: e.target.value,
                        }))
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                )}

                {relatorioSelecionado.campos.includes('formato') && (
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Formato"
                      value={parametros.formato}
                      onChange={(e) =>
                        setParametros((prev) => ({
                          ...prev,
                          formato: e.target.value,
                        }))
                      }
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      <MenuItem value="json">JSON</MenuItem>
                      <MenuItem value="csv">CSV</MenuItem>
                    </TextField>
                  </Grid>
                )}

                {relatorioSelecionado.campos.includes('periodo') && (
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Período"
                      value={parametros.periodo}
                      onChange={(e) =>
                        setParametros((prev) => ({
                          ...prev,
                          periodo: e.target.value,
                        }))
                      }
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      <MenuItem value="mes">Mensal</MenuItem>
                      <MenuItem value="trimestre">Trimestral</MenuItem>
                      <MenuItem value="ano">Anual</MenuItem>
                    </TextField>
                  </Grid>
                )}
              </Grid>
            </Paper>
          )}

          {/* Dados do Relatório */}
          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              py={6}
            >
              <CircularProgress size={40} />
              <Typography variant="body1" sx={{ ml: 2 }}>
                Gerando relatório...
              </Typography>
            </Box>
          ) : dadosRelatorio ? (
            <Box>
              {relatorioSelecionado?.id === 'mensal' &&
                formatarRelatorioMensal(dadosRelatorio)}
              {relatorioSelecionado?.id === 'fluxo-caixa' &&
                formatarFluxoCaixa(dadosRelatorio)}
              {relatorioSelecionado?.id === 'comparativo' && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    📈 Comparativo de Entradas vs Saídas
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Dados carregados: {dadosRelatorio.length} períodos
                  </Alert>
                  {/* Aqui você pode adicionar gráficos com uma biblioteca como Chart.js */}
                </Box>
              )}
              {relatorioSelecionado?.id === 'estatisticas' && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    📊 Estatísticas Financeiras
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Dados estatísticos carregados com sucesso
                  </Alert>
                  {/* Aqui você pode mostrar as estatísticas */}
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="info">
              Configure os parâmetros e clique em "Gerar Relatório" para
              visualizar os dados
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={() => setModalAberto(false)}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Fechar
          </Button>

          {dadosRelatorio && (
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={exportarRelatorio}
              sx={{ borderRadius: 2, px: 3 }}
            >
              Exportar
            </Button>
          )}

          <Button
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={16} /> : <AssessmentIcon />
            }
            onClick={gerarRelatorio}
            disabled={loading}
            sx={{ borderRadius: 2, px: 3, fontWeight: 600 }}
          >
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default RelatoriosTab
