import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Fade,
  CircularProgress,
  useTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar,
} from '@mui/material'
import {
  Receipt as ReceiptIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  ShoppingCart as ShoppingCartIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as PixIcon,
  Money as CashIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material'
import { vendaService } from '../../services/vendaService'

const Vendas = () => {
  const [vendas, setVendas] = useState([])
  const [loading, setLoading] = useState(false)
  const [detalhesVenda, setDetalhesVenda] = useState(null)
  const [modalDetalhes, setModalDetalhes] = useState(false)
  const [erro, setErro] = useState('')
  const [estatisticas, setEstatisticas] = useState({
    total_vendas: 0,
    valor_total: 0,
    vendas_hoje: 0,
    ticket_medio: 0,
  })

  // Filtros e paginação
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: '',
    cliente_id: '',
    tipo_pagamento: '',
  })
  const [paginacao, setPaginacao] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    carregarVendas()
    carregarEstatisticas()
  }, [filtros, paginacao.page])

  const carregarVendas = async () => {
    try {
      setLoading(true)
      console.log('🔄 Carregando vendas...')

      const params = {
        ...filtros,
        page: paginacao.page,
        limit: paginacao.limit,
      }

      const response = await vendaService.listar(params)
      console.log('✅ Vendas carregadas:', response)

      setVendas(response.data || [])

      if (response.pagination) {
        setPaginacao((prev) => ({
          ...prev,
          total: response.pagination.total,
          pages: response.pagination.pages,
        }))
      }
    } catch (error) {
      console.error('❌ Erro ao carregar vendas:', error)
      setErro('Erro ao carregar vendas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const carregarEstatisticas = async () => {
    try {
      const response = await vendaService.estatisticas()
      console.log('📊 Estatísticas carregadas:', response)

      if (response.data) {
        setEstatisticas({
          total_vendas: response.data.mes?.total_vendas_mes || 0,
          valor_total: response.data.mes?.faturamento_mes || 0,
          vendas_hoje: response.data.hoje?.total_vendas || 0,
          ticket_medio: response.data.hoje?.ticket_medio_hoje || 0,
        })
      }
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error)
    }
  }

  const verDetalhes = async (vendaId) => {
    try {
      setLoading(true)
      const response = await vendaService.buscarPorId(vendaId)
      console.log('📋 Detalhes da venda:', response)

      setDetalhesVenda(response.data)
      setModalDetalhes(true)
    } catch (error) {
      console.error('❌ Erro ao carregar detalhes:', error)
      setErro('Erro ao carregar detalhes da venda')
    } finally {
      setLoading(false)
    }
  }

  const handleFiltroChange = (campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor,
    }))
    setPaginacao((prev) => ({ ...prev, page: 1 }))
  }

  const limparFiltros = () => {
    setFiltros({
      data_inicio: '',
      data_fim: '',
      cliente_id: '',
      tipo_pagamento: '',
    })
    setPaginacao((prev) => ({ ...prev, page: 1 }))
  }

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor || 0)
  }

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPaymentIcon = (tipo) => {
    switch (tipo) {
      case 'dinheiro':
        return <CashIcon />
      case 'cartao':
        return <CreditCardIcon />
      case 'pix':
        return <PixIcon />
      default:
        return <AttachMoneyIcon />
    }
  }

  const getPaymentColor = (tipo) => {
    switch (tipo) {
      case 'dinheiro':
        return 'success'
      case 'cartao':
        return 'primary'
      case 'pix':
        return 'warning'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  const statsCards = [
    {
      title: 'Total de Vendas',
      value: estatisticas.total_vendas,
      icon: ReceiptIcon,
      color: 'primary',
    },
    {
      title: 'Faturamento Total',
      value: formatarMoeda(estatisticas.valor_total),
      icon: AttachMoneyIcon,
      color: 'success',
    },
    {
      title: 'Vendas Hoje',
      value: estatisticas.vendas_hoje,
      icon: ShoppingCartIcon,
      color: 'info',
    },
    {
      title: 'Ticket Médio',
      value: formatarMoeda(estatisticas.ticket_medio),
      icon: TrendingUpIcon,
      color: 'warning',
    },
  ]

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            💰 Vendas
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Histórico de vendas realizadas no PDV
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={carregarVendas}
            disabled={loading}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => (window.location.href = '/pdv')}
          >
            Nova Venda
          </Button>
        </Box>
      </Box>

      {/* Alertas */}
      {erro && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro('')}>
          {erro}
        </Alert>
      )}

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statsCards.map((item, index) => (
          <Grid item xs={6} md={3} key={index}>
            <Fade in timeout={600 + index * 100}>
              <Card className="glass-card modern-elevation">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <item.icon
                    sx={{
                      fontSize: { xs: 32, md: 40 },
                      color: `${item.color}.main`,
                      mb: 1,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {item.title}
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          </Grid>
        ))}
      </Grid>

      {/* Filtros */}
      <Card className="glass-card modern-elevation" sx={{ mb: 3 }}>
        <CardContent>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <FilterIcon />
            Filtros
          </Typography>

          <Grid container spacing={2} alignItems="end">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Data Início"
                type="date"
                value={filtros.data_inicio}
                onChange={(e) =>
                  handleFiltroChange('data_inicio', e.target.value)
                }
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Data Fim"
                type="date"
                value={filtros.data_fim}
                onChange={(e) => handleFiltroChange('data_fim', e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Método de Pagamento</InputLabel>
                <Select
                  value={filtros.tipo_pagamento}
                  onChange={(e) =>
                    handleFiltroChange('tipo_pagamento', e.target.value)
                  }
                  label="Método de Pagamento"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="dinheiro">💵 Dinheiro</MenuItem>
                  <MenuItem value="cartao">💳 Cartão</MenuItem>
                  <MenuItem value="pix">🏦 PIX</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  onClick={limparFiltros}
                  size="small"
                  fullWidth
                >
                  Limpar
                </Button>
                <Button
                  variant="contained"
                  onClick={carregarVendas}
                  size="small"
                  fullWidth
                  startIcon={<SearchIcon />}
                >
                  Buscar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela de Vendas */}
      <Card className="glass-card modern-elevation">
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">
              Histórico de Vendas ({paginacao.total || 0})
            </Typography>
            {loading && <CircularProgress size={20} />}
          </Box>

          {vendas.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              {loading
                ? 'Carregando vendas...'
                : 'Nenhuma venda encontrada. Realize vendas através do PDV para vê-las aqui.'}
            </Alert>
          ) : (
            <>
              <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Número</TableCell>
                      <TableCell>Data/Hora</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Itens</TableCell>
                      <TableCell>Pagamento</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vendas.map((venda) => (
                      <TableRow key={venda.id} hover>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color="primary"
                          >
                            {venda.numero_venda}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">
                            {formatarData(venda.data_venda)}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar
                              sx={{
                                width: 24,
                                height: 24,
                                bgcolor: 'primary.main',
                              }}
                            >
                              <PersonIcon sx={{ fontSize: 16 }} />
                            </Avatar>
                            <Typography variant="body2">
                              {venda.cliente_nome || 'Cliente não informado'}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">
                            {venda.total_itens || 0}{' '}
                            {venda.total_itens === 1 ? 'item' : 'itens'}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            icon={getPaymentIcon(venda.tipo_pagamento)}
                            label={venda.tipo_pagamento?.toUpperCase() || 'N/A'}
                            color={getPaymentColor(venda.tipo_pagamento)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color="success.main"
                          >
                            {formatarMoeda(venda.valor_total)}
                          </Typography>
                          {venda.desconto > 0 && (
                            <Typography variant="caption" color="error.main">
                              Desc: {formatarMoeda(venda.desconto)}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => verDetalhes(venda.id)}
                            color="primary"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Paginação */}
              {paginacao.pages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={paginacao.pages}
                    page={paginacao.page}
                    onChange={(e, page) =>
                      setPaginacao((prev) => ({ ...prev, page }))
                    }
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog
        open={modalDetalhes}
        onClose={() => setModalDetalhes(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <ReceiptIcon />
            Detalhes da Venda #{detalhesVenda?.numero_venda}
          </Box>
        </DialogTitle>

        <DialogContent>
          {detalhesVenda && (
            <Box>
              {/* Informações Gerais */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Data da Venda
                  </Typography>
                  <Typography variant="body1">
                    {formatarData(detalhesVenda.data_venda)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Cliente
                  </Typography>
                  <Typography variant="body1">
                    {detalhesVenda.cliente_nome || 'Cliente não informado'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Método de Pagamento
                  </Typography>
                  <Chip
                    icon={getPaymentIcon(detalhesVenda.tipo_pagamento)}
                    label={detalhesVenda.tipo_pagamento?.toUpperCase()}
                    color={getPaymentColor(detalhesVenda.tipo_pagamento)}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total da Venda
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatarMoeda(detalhesVenda.valor_total)}
                  </Typography>
                </Grid>
              </Grid>

              {/* Observações */}
              {detalhesVenda.observacoes && (
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle2"
                    color="textSecondary"
                    gutterBottom
                  >
                    Observações
                  </Typography>
                  <Typography variant="body2">
                    {detalhesVenda.observacoes}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Itens da Venda */}
              <Typography variant="h6" gutterBottom>
                Itens da Venda
              </Typography>

              {detalhesVenda.itens && detalhesVenda.itens.length > 0 ? (
                <List>
                  {detalhesVenda.itens.map((item, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={item.produto_nome}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {item.quantidade}x{' '}
                              {formatarMoeda(item.preco_unitario)} ={' '}
                              {formatarMoeda(item.preco_total)}
                            </Typography>
                            {item.codigo_barras && (
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                Código: {item.codigo_barras}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="warning">Itens da venda não encontrados</Alert>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setModalDetalhes(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Vendas
