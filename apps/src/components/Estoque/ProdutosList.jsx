import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  SwapHoriz as SwapHorizIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Inventory as InventoryIcon,
  QrCode as QrCodeIcon,
  Visibility as VisibilityIcon,
  ShoppingCart as ShoppingCartIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
  History as HistoryIcon,
  Error as ErrorIcon,
} from '@mui/icons-material'

const ProdutosList = ({
  produtos = [],
  loading = false,
  onProdutoClick,
  onEditarClick,
  onMovimentarClick,
  onNovoProduto,
  categorias = [],
  estatisticas = null,
  onVisualizarProduto,
}) => {
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  const [historico, setHistorico] = useState({
    aberto: false,
    produto: null,
    movimentacoes: [],
  })

  const handleMenuClick = (event, produto) => {
    setMenuAnchor(event.currentTarget)
    setProdutoSelecionado(produto)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setProdutoSelecionado(null)
  }

  // Filtrar produtos
  const produtosFiltrados = produtos.filter((produto) => {
    const matchBusca =
      !busca ||
      produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
      produto.codigo_interno?.toLowerCase().includes(busca.toLowerCase()) ||
      produto.codigo_barras?.toLowerCase().includes(busca.toLowerCase())

    const matchCategoria =
      !filtroCategoria || produto.categoria_id === parseInt(filtroCategoria)
    const matchTipo = !filtroTipo || produto.tipo === filtroTipo

    let matchStatus = true
    if (filtroStatus === 'sem_estoque') {
      matchStatus = produto.estoque_atual === 0
    } else if (filtroStatus === 'estoque_baixo') {
      matchStatus =
        produto.estoque_atual > 0 &&
        produto.estoque_atual <= produto.estoque_minimo
    } else if (filtroStatus === 'disponivel') {
      matchStatus = produto.estoque_atual > produto.estoque_minimo
    }

    return matchBusca && matchCategoria && matchTipo && matchStatus
  })

  const getStatusChip = (produto) => {
    if (produto.estoque_atual === 0) {
      return (
        <Chip
          size="small"
          color="error"
          label="Sem Estoque"
          icon={<WarningIcon />}
        />
      )
    }
    if (produto.estoque_atual <= produto.estoque_minimo) {
      return (
        <Chip
          size="small"
          color="warning"
          label="Estoque Baixo"
          icon={<WarningIcon />}
        />
      )
    }
    return (
      <Chip
        size="small"
        color="success"
        label="Disponível"
        icon={<CheckCircleIcon />}
      />
    )
  }

  const getTipoChip = (tipo) => {
    const config = {
      peca: { color: 'primary', label: 'Peça' },
      acessorio: { color: 'secondary', label: 'Acessório' },
    }
    const { color, label } = config[tipo] || config.peca
    return <Chip size="small" color={color} label={label} />
  }

  const getCategoriaIcon = (categoriaId) => {
    const icones = {
      1: '📱',
      2: '🔋',
      3: '🔌',
      4: '🔧',
      5: '🛡️',
      6: '🎧',
      7: '⚡',
      8: '🔨',
    }
    return icones[categoriaId] || '📦'
  }

  const verHistorico = async (produto) => {
    try {
      // Usar o serviço de produtos para buscar o histórico
      const { produtoService } = await import('../../services/produtoService')
      const response = await produtoService.buscarPorId(produto.id)

      if (response.success) {
        setHistorico({
          aberto: true,
          produto,
          movimentacoes: response.data.movimentacoes || [],
        })
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error)
      // Fallback: mostrar modal vazio com mensagem de erro
      setHistorico({
        aberto: true,
        produto,
        movimentacoes: [],
      })
    }
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

  const getStatusEstoque = (produto) => {
    if (produto.estoque_atual === 0) {
      return { label: 'Sem Estoque', color: 'error', icon: <ErrorIcon /> }
    } else if (produto.estoque_atual <= produto.estoque_minimo) {
      return { label: 'Estoque Baixo', color: 'warning', icon: <WarningIcon /> }
    } else {
      return {
        label: 'Disponível',
        color: 'success',
        icon: <CheckCircleIcon />,
      }
    }
  }

  const getIconeMovimentacao = (tipo) => {
    switch (tipo) {
      case 'entrada':
        return <TrendingUpIcon color="success" />
      case 'saida':
        return <TrendingDownIcon color="error" />
      case 'venda':
        return <ShoppingCartIcon color="primary" />
      default:
        return <SwapHorizIcon />
    }
  }

  const getMotivoLabel = (motivo) => {
    const motivos = {
      venda: '🛒 Venda',
      compra: '📦 Compra',
      ajuste: '⚖️ Ajuste',
      perda: '❌ Perda',
      uso_os: '🔧 Ordem de Serviço',
      estoque_inicial: '🏁 Estoque Inicial',
    }
    return motivos[motivo] || motivo
  }

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Carregando produtos...
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header com filtros */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Buscar por nome, código interno ou código de barras..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoria</InputLabel>
              <Select
                value={filtroCategoria}
                label="Categoria"
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {categorias.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {getCategoriaIcon(cat.id)} {cat.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filtroTipo}
                label="Tipo"
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="peca">Peças</MenuItem>
                <MenuItem value="acessorio">Acessórios</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filtroStatus}
                label="Status"
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="disponivel">Disponível</MenuItem>
                <MenuItem value="estoque_baixo">Estoque Baixo</MenuItem>
                <MenuItem value="sem_estoque">Sem Estoque</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onNovoProduto}
              size="large"
            >
              Novo Produto
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Estatísticas rápidas */}
      <Box mb={3}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Card
              sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}
            >
              <CardContent sx={{ py: 1 }}>
                <Typography variant="h4" component="div">
                  {estatisticas?.resumo?.total_produtos || produtos.length}
                </Typography>
                <Typography variant="body2">Total de Produtos</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card
              sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}
            >
              <CardContent sx={{ py: 1 }}>
                <Typography variant="h4" component="div">
                  {estatisticas?.resumo?.disponivel ||
                    produtos.filter((p) => p.estoque_atual > p.estoque_minimo)
                      .length}
                </Typography>
                <Typography variant="body2">Disponíveis</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card
              sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}
            >
              <CardContent sx={{ py: 1 }}>
                <Typography variant="h4" component="div">
                  {estatisticas?.resumo?.estoque_baixo ||
                    produtos.filter(
                      (p) =>
                        p.estoque_atual > 0 &&
                        p.estoque_atual <= p.estoque_minimo
                    ).length}
                </Typography>
                <Typography variant="body2">Estoque Baixo</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
              <CardContent sx={{ py: 1 }}>
                <Typography variant="h4" component="div">
                  {estatisticas?.resumo?.sem_estoque ||
                    produtos.filter((p) => p.estoque_atual === 0).length}
                </Typography>
                <Typography variant="body2">Sem Estoque</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Lista de produtos */}
      {produtosFiltrados.length === 0 ? (
        <Alert
          severity={produtos.length === 0 ? 'info' : 'warning'}
          icon={<InventoryIcon />}
        >
          {produtos.length === 0
            ? 'Nenhum produto cadastrado. Clique em "Novo Produto" para começar.'
            : `Nenhum produto encontrado com os filtros aplicados. Mostrando 0 de ${produtos.length} produtos.`}
        </Alert>
      ) : (
        <>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Mostrando {produtosFiltrados.length} de {produtos.length} produtos
          </Typography>

          <Grid container spacing={2}>
            {produtosFiltrados.map((produto) => {
              const categoria = categorias.find(
                (c) => c.id === produto.categoria_id
              )

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={produto.id}>
                  <Card
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4,
                      },
                      border:
                        produto.estoque_atual === 0 ? '2px solid' : 'none',
                      borderColor: 'error.main',
                    }}
                    onClick={() => onProdutoClick?.(produto)}
                  >
                    <CardContent>
                      {/* Header do Card */}
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        mb={2}
                      >
                        <Box flex={1}>
                          <Typography
                            variant="h6"
                            gutterBottom
                            noWrap
                            title={produto.nome}
                          >
                            {produto.nome}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            mb={1}
                            flexWrap="wrap"
                          >
                            {getTipoChip(produto.tipo)}
                            {getStatusChip(produto)}
                          </Stack>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMenuClick(e, produto)
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>

                      {/* Informações do produto */}
                      <Box mb={2}>
                        {categoria && (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            gutterBottom
                          >
                            {getCategoriaIcon(categoria.id)} {categoria.nome}
                          </Typography>
                        )}
                        {produto.codigo_interno && (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            gutterBottom
                          >
                            🏷️ {produto.codigo_interno}
                          </Typography>
                        )}
                        {produto.codigo_barras && (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            gutterBottom
                          >
                            <QrCodeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            {produto.codigo_barras}
                          </Typography>
                        )}
                        {produto.localizacao && (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            gutterBottom
                          >
                            📍 {produto.localizacao}
                          </Typography>
                        )}
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      {/* Estoque e preços */}
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box textAlign="center">
                            <Typography variant="body2" color="textSecondary">
                              📦 Estoque
                            </Typography>
                            <Typography
                              variant="h5"
                              fontWeight={600}
                              color={
                                produto.estoque_atual === 0
                                  ? 'error.main'
                                  : produto.estoque_atual <=
                                    produto.estoque_minimo
                                  ? 'warning.main'
                                  : 'success.main'
                              }
                            >
                              {produto.estoque_atual}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box textAlign="center">
                            <Typography variant="body2" color="textSecondary">
                              💰 Preço
                            </Typography>
                            <Typography
                              variant="h6"
                              color="success.main"
                              fontWeight={600}
                            >
                              R$ {Number(produto.preco_venda || 0).toFixed(2)}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      {/* Ações rápidas */}
                      <Box mt={2.5}>
                        {/* Ação principal */}
                        <Button
                          size="medium"
                          variant="contained"
                          startIcon={<EditIcon />}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditarClick?.(produto)
                          }}
                          fullWidth
                          sx={{
                            mb: 1.5,
                            py: 1,
                            fontWeight: 600,
                            borderRadius: 2,
                          }}
                        >
                          Editar Produto
                        </Button>

                        {/* Ações secundárias */}
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<SwapHorizIcon />}
                              onClick={(e) => {
                                e.stopPropagation()
                                onMovimentarClick?.(produto)
                              }}
                              color="secondary"
                              fullWidth
                              sx={{
                                borderRadius: 2,
                                fontWeight: 500,
                              }}
                            >
                              Movimentar
                            </Button>
                          </Grid>
                          <Grid item xs={6}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<HistoryIcon />}
                              onClick={(e) => {
                                e.stopPropagation()
                                verHistorico(produto)
                              }}
                              color="info"
                              fullWidth
                              sx={{
                                borderRadius: 2,
                                fontWeight: 500,
                              }}
                            >
                              Histórico
                            </Button>
                          </Grid>
                        </Grid>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </>
      )}

      {/* Menu de contexto */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            onProdutoClick?.(produtoSelecionado)
            handleMenuClose()
          }}
        >
          Ver Detalhes
        </MenuItem>
        <MenuItem
          onClick={() => {
            onEditarClick?.(produtoSelecionado)
            handleMenuClose()
          }}
        >
          Editar Produto
        </MenuItem>
        <MenuItem
          onClick={() => {
            onMovimentarClick?.(produtoSelecionado)
            handleMenuClose()
          }}
        >
          Movimentar Estoque
        </MenuItem>
        <MenuItem
          onClick={() => {
            verHistorico(produtoSelecionado)
            handleMenuClose()
          }}
        >
          Ver Histórico
        </MenuItem>
      </Menu>

      {/* Modal de Histórico */}
      <Dialog
        open={historico.aberto}
        onClose={() =>
          setHistorico({ aberto: false, produto: null, movimentacoes: [] })
        }
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <HistoryIcon />
            Histórico de Movimentações - {historico.produto?.nome}
          </Box>
        </DialogTitle>

        <DialogContent>
          {historico.movimentacoes.length === 0 ? (
            <Box textAlign="center" py={4}>
              <HistoryIcon
                sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
              />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Nenhuma movimentação encontrada
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Este produto ainda não possui histórico de movimentações
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Motivo</TableCell>
                    <TableCell align="center">Qtd</TableCell>
                    <TableCell align="center">Anterior</TableCell>
                    <TableCell align="center">Atual</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell>Observações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historico.movimentacoes.map((mov, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {formatarData(mov.data_movimentacao)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getIconeMovimentacao(mov.tipo)}
                          <Typography
                            variant="body2"
                            textTransform="capitalize"
                          >
                            {mov.tipo}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {getMotivoLabel(mov.motivo)}
                          </Typography>
                          {mov.referencia_tipo === 'venda' && (
                            <Chip
                              icon={<ReceiptIcon />}
                              label={`Venda #${mov.referencia_id}`}
                              size="small"
                              color="primary"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          color={
                            mov.tipo === 'entrada'
                              ? 'success.main'
                              : 'error.main'
                          }
                          fontWeight={600}
                        >
                          {mov.tipo === 'entrada' ? '+' : '-'}
                          {mov.quantidade}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Typography variant="body2">
                          {mov.quantidade_anterior}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600}>
                          {mov.quantidade_atual}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatarMoeda(mov.valor_total)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {mov.observacoes || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setHistorico({ aberto: false, produto: null, movimentacoes: [] })
            }
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ProdutosList
