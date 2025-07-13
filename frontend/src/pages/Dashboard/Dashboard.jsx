import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Grow,
  Fade,
  useTheme,
  useMediaQuery,
  Stack,
  Container,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar,
  LinearProgress,
} from '@mui/material'
import {
  Assignment,
  AttachMoney,
  Build,
  People as PeopleIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  TrendingDown as TrendingDownIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Receipt as ReceiptIcon,
  Timeline as TimelineIcon,
  Store as StoreIcon,
  LocalShipping as LocalShippingIcon,
} from '@mui/icons-material'
import { ordemService } from '../../services/ordemService'
import { produtoService } from '../../services/produtoService'
import { vendaService } from '../../services/vendaService'

const statusColors = {
  recebido: 'info',
  em_analise: 'warning',
  aguardando_pecas: 'secondary',
  em_reparo: 'primary',
  pronto: 'success',
  entregue: 'default',
  cancelado: 'error',
}

const statusLabels = {
  recebido: 'Recebido',
  em_analise: 'Em Análise',
  aguardando_pecas: 'Aguardando Peças',
  em_reparo: 'Em Reparo',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const Dashboard = () => {
  const [estatisticas, setEstatisticas] = useState(null)
  const [estatisticasEstoque, setEstatisticasEstoque] = useState(null)
  const [estatisticasVendas, setEstatisticasVendas] = useState(null)
  const [alertasEstoque, setAlertasEstoque] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [erro, setErro] = useState('')

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))

  const carregarEstatisticas = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      const response = await ordemService.buscarEstatisticas()
      setEstatisticas(response.data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    carregarEstatisticas()
  }, [])

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)

      // Carregar dados em paralelo
      const [estoqueRes, vendasRes, alertasRes] = await Promise.all([
        produtoService.buscarEstatisticas(),
        vendaService.estatisticas(),
        produtoService.listarAlertas(),
      ])

      setEstatisticasEstoque(estoqueRes)
      setEstatisticasVendas(vendasRes.data)
      setAlertasEstoque(alertasRes)
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
      setErro('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor || 0)
  }

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const handleRefresh = () => {
    carregarEstatisticas(true)
  }

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Carregando dashboard...
          </Typography>
        </Box>
      </Container>
    )
  }

  const statsCards = [
    {
      title: 'Total de Ordens',
      value: estatisticas?.total_ordens || 0,
      icon: Assignment,
      color: 'primary',
    },
    {
      title: 'Clientes',
      value: estatisticas?.total_clientes || 0,
      icon: PeopleIcon,
      color: 'info',
    },
    {
      title: 'Faturamento',
      value: formatarMoeda(estatisticas?.faturamento_mensal),
      icon: AttachMoney,
      color: 'success',
    },
    {
      title: 'Em Reparo',
      value: estatisticas?.ordens_por_status?.em_reparo || 0,
      icon: Build,
      color: 'warning',
    },
  ]

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" gutterBottom>
            🏪 Dashboard - Saymon Cell
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Visão geral do sistema de assistência técnica
          </Typography>
        </Box>

        {/* Alertas */}
        {erro && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
            {erro}
          </Alert>
        )}

        {/* Cards Principais */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Vendas Hoje */}
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card modern-elevation">
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="h4" color="primary.main" gutterBottom>
                      {estatisticasVendas?.hoje?.total_vendas || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Vendas Hoje
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <ShoppingCartIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Faturamento Hoje */}
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card modern-elevation">
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="h5" color="success.main" gutterBottom>
                      {formatarMoeda(
                        estatisticasVendas?.hoje?.faturamento_hoje
                      )}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Faturamento Hoje
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <AttachMoney />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Produtos em Estoque */}
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card modern-elevation">
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="h4" color="info.main" gutterBottom>
                      {estatisticasEstoque?.resumo?.total_produtos || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Produtos Cadastrados
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <InventoryIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Alertas de Estoque */}
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card modern-elevation">
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="h4" color="warning.main" gutterBottom>
                      {alertasEstoque.length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Alertas de Estoque
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <WarningIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Seção de Integração Estoque-Vendas */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Card className="glass-card modern-elevation">
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <TimelineIcon />
                  Integração Estoque ↔ Vendas
                </Typography>

                <Typography variant="body2" color="textSecondary" paragraph>
                  Acompanhe como as vendas impactam o estoque em tempo real
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box textAlign="center" p={2}>
                      <TrendingDownIcon color="error" sx={{ fontSize: 40 }} />
                      <Typography variant="h6" color="error.main">
                        {estatisticasEstoque?.movimentacoes?.saidas_mes || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Saídas do Mês
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Box textAlign="center" p={2}>
                      <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
                      <Typography variant="h6" color="success.main">
                        {estatisticasEstoque?.movimentacoes?.entradas_mes || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Entradas do Mês
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Box textAlign="center" p={2}>
                      <CheckCircleIcon color="primary" sx={{ fontSize: 40 }} />
                      <Typography variant="h6" color="primary.main">
                        {estatisticasEstoque?.resumo?.disponivel || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Disponíveis
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Box textAlign="center" p={2}>
                      <WarningIcon color="warning" sx={{ fontSize: 40 }} />
                      <Typography variant="h6" color="warning.main">
                        {estatisticasEstoque?.resumo?.estoque_baixo || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Estoque Baixo
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Valor do Estoque
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Chip
                    icon={<AttachMoney />}
                    label={`Custo: ${formatarMoeda(
                      estatisticasEstoque?.financeiro?.valor_custo
                    )}`}
                    color="info"
                    variant="outlined"
                  />
                  <Chip
                    icon={<AttachMoney />}
                    label={`Venda: ${formatarMoeda(
                      estatisticasEstoque?.financeiro?.valor_venda
                    )}`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    icon={<TrendingUpIcon />}
                    label={`Margem: ${formatarMoeda(
                      estatisticasEstoque?.financeiro?.margem_potencial
                    )}`}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card className="glass-card modern-elevation">
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <WarningIcon />
                  Alertas de Estoque
                </Typography>

                {alertasEstoque.length === 0 ? (
                  <Box textAlign="center" py={3}>
                    <CheckCircleIcon
                      sx={{ fontSize: 48, color: 'success.main', mb: 1 }}
                    />
                    <Typography variant="body2" color="textSecondary">
                      Nenhum alerta ativo! 🎉
                    </Typography>
                  </Box>
                ) : (
                  <List dense>
                    {alertasEstoque.slice(0, 5).map((alerta, index) => (
                      <ListItem key={index} divider>
                        <ListItemIcon>
                          {alerta.tipo === 'estoque_zero' ? (
                            <WarningIcon color="error" />
                          ) : (
                            <WarningIcon color="warning" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={alerta.produto_nome}
                          secondary={
                            alerta.tipo === 'estoque_zero'
                              ? 'Sem estoque'
                              : `Estoque baixo (${alerta.estoque_atual})`
                          }
                        />
                      </ListItem>
                    ))}
                    {alertasEstoque.length > 5 && (
                      <ListItem>
                        <ListItemText
                          primary={`+ ${alertasEstoque.length - 5} alertas`}
                          sx={{ textAlign: 'center', color: 'text.secondary' }}
                        />
                      </ListItem>
                    )}
                  </List>
                )}

                <Box mt={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<InventoryIcon />}
                    onClick={() => (window.location.href = '/estoque')}
                  >
                    Ver Estoque Completo
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Produtos Mais Vendidos */}
        {estatisticasVendas?.produtos_populares_hoje?.length > 0 && (
          <Card className="glass-card modern-elevation" sx={{ mb: 4 }}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <TrendingUpIcon />
                Produtos Mais Vendidos Hoje
              </Typography>

              <Grid container spacing={2}>
                {estatisticasVendas.produtos_populares_hoje
                  .slice(0, 4)
                  .map((produto, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography
                            variant="h4"
                            color="primary.main"
                            gutterBottom
                          >
                            {produto.quantidade_vendida}
                          </Typography>
                          <Typography
                            variant="body1"
                            fontWeight={600}
                            gutterBottom
                          >
                            {produto.nome}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {formatarMoeda(produto.valor_total)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Botões de Ação Rápida */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<ShoppingCartIcon />}
              onClick={() => (window.location.href = '/pdv')}
              size="large"
            >
              Nova Venda
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ReceiptIcon />}
              onClick={() => (window.location.href = '/vendas')}
              size="large"
            >
              Ver Vendas
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<InventoryIcon />}
              onClick={() => (window.location.href = '/estoque')}
              size="large"
            >
              Gerenciar Estoque
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<StoreIcon />}
              onClick={() => (window.location.href = '/ordens')}
              size="large"
            >
              Ordens de Serviço
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Container>
  )
}

export default Dashboard
