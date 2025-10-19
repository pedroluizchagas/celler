import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  CircularProgress,
  InputAdornment,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Search as SearchIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
} from '@mui/icons-material'
import financeiroService from '../../services/financeiroService'

const FluxoCaixaTab = ({ onRefresh }) => {
  const [movimentacoes, setMovimentacoes] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [filtros, setFiltros] = useState({
    tipo: '',
    categoria_id: '',
    data_inicio: '',
    data_fim: '',
    descricao: '',
  })

  const [formData, setFormData] = useState({
    tipo: 'entrada',
    valor: '',
    categoria_id: '',
    descricao: '',
    data_movimentacao: new Date().toISOString().split('T')[0],
  })

  const carregarDados = async () => {
    try {
      setLoading(true)

      // Carregar movimentações e categorias em paralelo
      const [movResponse, catResponse] = await Promise.all([
        financeiroService.listarFluxoCaixa(filtros),
        financeiroService.listarCategorias(),
      ])

      // Normaliza formatos diferentes de resposta (array direto ou { data: [] })
      const movs = movResponse?.data ?? movResponse ?? []
      const cats = catResponse?.data ?? catResponse ?? []

      setMovimentacoes(Array.isArray(movs) ? movs : movs.data ?? [])
      setCategorias(Array.isArray(cats) ? cats : cats.data ?? [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setMovimentacoes([])
      setCategorias([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [filtros])

  const handleFiltroChange = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }))
  }

  const handleFormChange = (campo, valor) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }))
  }

  const handleSalvar = async () => {
    try {
      const dados = {
        ...formData,
        valor: parseFloat(formData.valor),
      }

      await financeiroService.adicionarMovimentacao(dados)

      setModalAberto(false)
      setFormData({
        tipo: 'entrada',
        valor: '',
        categoria_id: '',
        descricao: '',
        data_movimentacao: new Date().toISOString().split('T')[0],
      })

      carregarDados()
      onRefresh && onRefresh()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar movimentação')
    }
  }

  const abrirModal = () => {
    setFormData({
      tipo: 'entrada',
      valor: '',
      categoria_id: '',
      descricao: '',
      data_movimentacao: new Date().toISOString().split('T')[0],
    })
    setModalAberto(true)
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={6}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Carregando movimentações...
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header com título e botão */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={3}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
             Fluxo de Caixa
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Controle de entradas e saídas financeiras
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={abrirModal}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.5,
          }}
        >
          Nova Movimentação
        </Button>
      </Stack>

      {/* Seção de Filtros */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.02)'
              : 'rgba(0, 0, 0, 0.02)',
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
           Filtros
        </Typography>

        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Tipo"
              value={filtros.tipo}
              onChange={(e) => handleFiltroChange('tipo', e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="entrada">💰 Entradas</MenuItem>
              <MenuItem value="saida">💸 Saídas</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Categoria"
              value={filtros.categoria_id}
              onChange={(e) =>
                handleFiltroChange('categoria_id', e.target.value)
              }
              SelectProps={{
                MenuProps: {
                  keepMounted: true,
                  disablePortal: false,
                  PaperProps: { sx: { zIndex: 2000, maxHeight: 320 } },
                },
                displayEmpty: true,
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="">Todas</MenuItem>
              {(categorias || []).map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.icone} {cat.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Data Início"
              value={filtros.data_inicio}
              onChange={(e) =>
                handleFiltroChange('data_inicio', e.target.value)
              }
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Data Fim"
              value={filtros.data_fim}
              onChange={(e) => handleFiltroChange('data_fim', e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Buscar descrição"
              value={filtros.descricao}
              onChange={(e) => handleFiltroChange('descricao', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Resumo Rápido */}
      {movimentacoes.length > 0 && (
        <Paper
          elevation={1}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(0, 255, 0, 0.05)'
                : 'rgba(0, 150, 0, 0.05)',
          }}
        >
          <Typography variant="body2" color="text.secondary" textAlign="center">
            📊 Exibindo <strong>{movimentacoes.length}</strong>{' '}
            movimentação(ões) encontrada(s)
          </Typography>
        </Paper>
      )}

      {/* Tabela de Movimentações */}
      <Paper
        elevation={3}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.02)',
                }}
              >
                <TableCell sx={{ fontWeight: 600, py: 2 }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 600, py: 2 }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 600, py: 2 }}>Categoria</TableCell>
                <TableCell sx={{ fontWeight: 600, py: 2 }}>Descrição</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, py: 2 }}>
                  Valor
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, py: 2 }}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(movimentacoes || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Box>
                      <AccountBalanceWalletIcon
                        sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
                      />
                      <Typography
                        variant="h6"
                        color="text.secondary"
                        gutterBottom
                      >
                        Nenhuma movimentação encontrada
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 3 }}
                      >
                        {Object.values(filtros).some((v) => v)
                          ? 'Tente ajustar os filtros'
                          : 'Adicione sua primeira movimentação'}
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={abrirModal}
                        sx={{ borderRadius: 2 }}
                      >
                        Nova Movimentação
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                (movimentacoes || []).map((mov) => (
                  <TableRow
                    key={mov.id}
                    hover
                    sx={{
                      '&:hover': {
                        backgroundColor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.02)'
                            : 'rgba(0, 0, 0, 0.02)',
                      },
                    }}
                  >
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {financeiroService.formatarData(mov.data_movimentacao)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        icon={
                          mov.tipo === 'entrada' ? (
                            <TrendingUpIcon />
                          ) : (
                            <TrendingDownIcon />
                          )
                        }
                        label={mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        color={mov.tipo === 'entrada' ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box component="span" sx={{ fontSize: '1.1rem' }}>
                          {mov.categoria_icone}
                        </Box>
                        <Typography variant="body2" fontWeight={500}>
                          {mov.categoria_nome}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {mov.descricao || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2 }}>
                      <Typography
                        variant="subtitle2"
                        color={
                          mov.tipo === 'entrada' ? 'success.main' : 'error.main'
                        }
                        fontWeight="bold"
                        sx={{ fontSize: '0.95rem' }}
                      >
                        {mov.tipo === 'entrada' ? '+' : '-'}{' '}
                        {financeiroService.formatarMoeda(mov.valor)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 2 }}>
                      <Tooltip title="Editar movimentação">
                        <IconButton
                          size="small"
                          onClick={() => alert('Em breve: Editar movimentação')}
                          sx={{
                            borderRadius: 2,
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            },
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal de Nova Movimentação */}
      <Dialog
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            💰 Nova Movimentação
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Registre uma entrada ou saída no fluxo de caixa
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Tipo de Movimentação"
                value={formData.tipo}
                onChange={(e) => handleFormChange('tipo', e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="entrada">💰 Entrada (Receita)</MenuItem>
                <MenuItem value="saida">💸 Saída (Despesa)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Valor"
                value={formData.valor}
                onChange={(e) => handleFormChange('valor', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">R$</InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                helperText="Digite apenas números"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Categoria"
                value={formData.categoria_id}
                onChange={(e) =>
                  handleFormChange('categoria_id', e.target.value)
                }
                onOpen={() => {
                  try {
                    console.log('[FluxoCaixa] Abrindo Select de categorias – total:', (categorias || []).length)
                  } catch (_) {}
                }}
                SelectProps={{
                  MenuProps: {
                    keepMounted: true,
                    disablePortal: false,
                    PaperProps: { sx: { zIndex: 2000, maxHeight: 320 } },
                  },
                  displayEmpty: true,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                helperText={`Categorias disponíveis para ${
                  formData.tipo === 'entrada' ? 'receitas' : 'despesas'
                }`}
              >
                {(() => {
                  const tiposEntrada = ['receita', 'entrada', 'income']
                  const tiposSaida = ['despesa', 'saida', 'expense']
                  const desejados =
                    formData.tipo === 'entrada' ? tiposEntrada : tiposSaida

                  const lista = (categorias || []).filter((cat) => {
                    const tipo = String(cat.tipo || cat.type || '')
                      .toLowerCase()
                      .trim()
                    if (!tipo) return true
                    return desejados.includes(tipo)
                  })

                  if (lista.length === 0) {
                    return (
                      <MenuItem disabled value="">
                        Nenhuma categoria disponível
                      </MenuItem>
                    )
                  }

                  return lista.map((cat) => {
                    const id = cat.id ?? cat.categoria_id ?? cat.value
                    const nome =
                      cat.nome ?? cat.name ?? cat.descricao ?? 'Categoria'
                    const icone = cat.icone ?? cat.icon ?? ''
                    const descricao = cat.descricao ?? ''
                    return (
                      <MenuItem key={id} value={id}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <span>{icone}</span>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {nome}
                            </Typography>
                            {descricao && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {descricao}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </MenuItem>
                    )
                  })
                })()}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição (Opcional)"
                value={formData.descricao}
                onChange={(e) => handleFormChange('descricao', e.target.value)}
                multiline
                rows={3}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                placeholder="Ex: Pagamento do cliente João, Compra de peças, etc."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Data da Movimentação"
                value={formData.data_movimentacao}
                onChange={(e) =>
                  handleFormChange('data_movimentacao', e.target.value)
                }
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={() => setModalAberto(false)}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSalvar}
            disabled={!formData.valor || !formData.categoria_id}
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 600,
            }}
          >
            Salvar Movimentação
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default FluxoCaixaTab
