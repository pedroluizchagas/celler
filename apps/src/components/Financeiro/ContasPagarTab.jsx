import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Stack,
  Paper,
  Card,
  CardContent,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  CircularProgress,
  Fab,
  Alert,
} from '@mui/material'
import {
  Add as AddIcon,
  Payment as PaymentIcon,
  Schedule as ScheduleIcon,
  MonetizationOn as MonetizationOnIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material'
import financeiroService from '../../services/financeiroService'

const ContasPagarTab = ({ onRefresh }) => {
  const theme = useTheme()

  // Estados principais
  const [contas, setContas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [resumo, setResumo] = useState(null)

  // Estados de modal
  const [modalAberto, setModalAberto] = useState(false)
  const [modalPagamento, setModalPagamento] = useState(false)
  const [contaSelecionada, setContaSelecionada] = useState(null)

  // Estados de filtros
  const [filtros, setFiltros] = useState({
    status: '',
    categoria_id: '',
    fornecedor: '',
    data_inicio: '',
    data_fim: '',
  })

  // Estados de formulário
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    categoria_id: '',
    fornecedor: '',
    data_vencimento: '',
    numero_documento: '',
    observacoes: '',
    recorrente: false,
    tipo_recorrencia: '',
  })

  // Estados de pagamento
  const [dadosPagamento, setDadosPagamento] = useState({
    valor_pago: '',
    forma_pagamento: 'dinheiro',
    data_pagamento: new Date().toISOString().split('T')[0],
    juros: '0',
    multa: '0',
    desconto: '0',
    observacoes: '',
  })

  // Carregar dados
  const carregarDados = async () => {
    try {
      setLoading(true)

      const [contasResponse, categoriasResponse] = await Promise.all([
        financeiroService.listarContasPagar(filtros),
        financeiroService.listarCategorias(),
      ])

      setContas(contasResponse.data || [])
      setResumo(contasResponse.resumo || {})
      setCategorias(
        categoriasResponse.data?.filter((cat) => cat.tipo === 'despesa') || []
      )
    } catch (error) {
      console.error('Erro ao carregar contas a pagar:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [filtros])

  // Handlers
  const handleFiltroChange = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }))
  }

  const handleFormChange = (campo, valor) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }))
  }

  const handlePagamentoChange = (campo, valor) => {
    setDadosPagamento((prev) => ({ ...prev, [campo]: valor }))
  }

  const abrirModalNova = () => {
    setFormData({
      descricao: '',
      valor: '',
      categoria_id: '',
      fornecedor: '',
      data_vencimento: '',
      numero_documento: '',
      observacoes: '',
      recorrente: false,
      tipo_recorrencia: '',
    })
    setModalAberto(true)
  }

  const abrirModalPagamento = (conta) => {
    setContaSelecionada(conta)
    setDadosPagamento({
      valor_pago: conta.valor.toString(),
      forma_pagamento: 'dinheiro',
      data_pagamento: new Date().toISOString().split('T')[0],
      juros: '0',
      multa: '0',
      desconto: '0',
      observacoes: '',
    })
    setModalPagamento(true)
  }

  const salvarConta = async () => {
    try {
      if (!formData.descricao || !formData.valor || !formData.data_vencimento) {
        alert('Preencha todos os campos obrigatórios')
        return
      }

      await financeiroService.criarContaPagar({
        ...formData,
        valor: parseFloat(formData.valor),
      })

      setModalAberto(false)
      carregarDados()
      onRefresh && onRefresh()
    } catch (error) {
      console.error('Erro ao salvar conta:', error)
      alert('Erro ao salvar conta a pagar')
    }
  }

  const processarPagamento = async () => {
    try {
      if (!dadosPagamento.valor_pago) {
        alert('Valor do pagamento é obrigatório')
        return
      }

      await financeiroService.pagarConta(contaSelecionada.id, {
        ...dadosPagamento,
        valor_pago: parseFloat(dadosPagamento.valor_pago),
        juros: parseFloat(dadosPagamento.juros || 0),
        multa: parseFloat(dadosPagamento.multa || 0),
        desconto: parseFloat(dadosPagamento.desconto || 0),
      })

      setModalPagamento(false)
      setContaSelecionada(null)
      carregarDados()
      onRefresh && onRefresh()
    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      alert('Erro ao processar pagamento')
    }
  }

  const getStatusInfo = (conta) => {
    const status = financeiroService.getStatusConta(
      conta.data_vencimento,
      conta.status
    )
    return {
      status,
      cor: financeiroService.getCorStatus(status),
      texto: financeiroService.getTextoStatus(status),
      diasVencimento: financeiroService.calcularDiasVencimento(
        conta.data_vencimento
      ),
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={6}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Carregando contas a pagar...
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={3}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            💸 Contas a Pagar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Controle de fornecedores, vencimentos e pagamentos
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={abrirModalNova}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.5,
          }}
        >
          Nova Conta a Pagar
        </Button>
      </Stack>

      {/* Cards de Resumo */}
      {resumo && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <PaymentIcon sx={{ fontSize: 32, color: 'info.main' }} />
                </Box>
                <Typography variant="h5" fontWeight="bold" color="info.main">
                  {resumo.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Contas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <ScheduleIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                </Box>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {financeiroService.formatarMoeda(resumo.valor_pendente || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Valor Pendente
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <CheckCircleIcon
                    sx={{ fontSize: 32, color: 'success.main' }}
                  />
                </Box>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {financeiroService.formatarMoeda(resumo.valor_pago || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Valor Pago
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <WarningIcon sx={{ fontSize: 32, color: 'error.main' }} />
                </Box>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                  {financeiroService.formatarMoeda(resumo.valor_vencido || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Valor Vencido
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtros */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          🔍 Filtros
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Status"
              value={filtros.status}
              onChange={(e) => handleFiltroChange('status', e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              {(financeiroService.opcoesStatusConta || []).map((opcao) => (
                <MenuItem key={opcao.value} value={opcao.value}>
                  {opcao.label}
                </MenuItem>
              ))}
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
              label="Fornecedor"
              value={filtros.fornecedor}
              onChange={(e) => handleFiltroChange('fornecedor', e.target.value)}
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

      {/* Tabela de Contas */}
      <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.02)',
                }}
              >
                <TableCell sx={{ fontWeight: 600, py: 2 }}>
                  Vencimento
                </TableCell>
                <TableCell sx={{ fontWeight: 600, py: 2 }}>Descrição</TableCell>
                <TableCell sx={{ fontWeight: 600, py: 2 }}>
                  Fornecedor
                </TableCell>
                <TableCell sx={{ fontWeight: 600, py: 2 }}>Categoria</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, py: 2 }}>
                  Valor
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, py: 2 }}>
                  Status
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, py: 2 }}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Box>
                      <PaymentIcon
                        sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
                      />
                      <Typography
                        variant="h6"
                        color="text.secondary"
                        gutterBottom
                      >
                        Nenhuma conta a pagar encontrada
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 3 }}
                      >
                        {Object.values(filtros).some((v) => v)
                          ? 'Tente ajustar os filtros para encontrar contas'
                          : 'Clique em "Nova Conta a Pagar" para começar'}
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={abrirModalNova}
                        sx={{ borderRadius: 2 }}
                      >
                        Adicionar Primeira Conta
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                (contas || []).map((conta) => {
                  const statusInfo = getStatusInfo(conta)
                  return (
                    <TableRow key={conta.id} hover>
                      <TableCell sx={{ py: 2 }}>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {financeiroService.formatarData(
                              conta.data_vencimento
                            )}
                          </Typography>
                          {statusInfo.diasVencimento !== null && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {statusInfo.diasVencimento === 0
                                ? 'Vence hoje'
                                : statusInfo.diasVencimento > 0
                                ? `${statusInfo.diasVencimento} dias`
                                : `${Math.abs(
                                    statusInfo.diasVencimento
                                  )} dias em atraso`}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      <TableCell sx={{ py: 2 }}>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {conta.descricao}
                          </Typography>
                          {conta.numero_documento && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Doc: {conta.numero_documento}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2">
                          {conta.fornecedor || '-'}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 2 }}>
                        {conta.categoria_nome && (
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <Box component="span" sx={{ fontSize: '1.1rem' }}>
                              {conta.categoria_icone}
                            </Box>
                            <Typography variant="body2">
                              {conta.categoria_nome}
                            </Typography>
                          </Stack>
                        )}
                      </TableCell>

                      <TableCell align="right" sx={{ py: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {financeiroService.formatarMoeda(conta.valor)}
                        </Typography>
                        {conta.status === 'pago' &&
                          conta.valor_pago !== conta.valor && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              Pago:{' '}
                              {financeiroService.formatarMoeda(
                                conta.valor_pago
                              )}
                            </Typography>
                          )}
                      </TableCell>

                      <TableCell align="center" sx={{ py: 2 }}>
                        <Chip
                          label={statusInfo.texto}
                          color={statusInfo.cor}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>

                      <TableCell align="center" sx={{ py: 2 }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="center"
                        >
                          {conta.status === 'pendente' && (
                            <Tooltip title="Pagar conta">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => abrirModalPagamento(conta)}
                                sx={{ borderRadius: 2 }}
                              >
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          <Tooltip title="Editar conta">
                            <IconButton
                              size="small"
                              onClick={() => alert('Em breve: Editar conta')}
                              sx={{ borderRadius: 2 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal Nova Conta */}
      <Dialog
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            💸 Nova Conta a Pagar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Registre uma nova conta a ser paga
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Descrição *"
                value={formData.descricao}
                onChange={(e) => handleFormChange('descricao', e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                placeholder="Ex: Energia elétrica, Material de limpeza..."
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Valor *"
                value={formData.valor}
                onChange={(e) => handleFormChange('valor', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">R$</InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Categoria"
                value={formData.categoria_id}
                onChange={(e) =>
                  handleFormChange('categoria_id', e.target.value)
                }
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="">Selecione uma categoria</MenuItem>
                {(categorias || []).map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.icone} {cat.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fornecedor"
                value={formData.fornecedor}
                onChange={(e) => handleFormChange('fornecedor', e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                placeholder="Nome do fornecedor"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Data de Vencimento *"
                value={formData.data_vencimento}
                onChange={(e) =>
                  handleFormChange('data_vencimento', e.target.value)
                }
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Número do Documento"
                value={formData.numero_documento}
                onChange={(e) =>
                  handleFormChange('numero_documento', e.target.value)
                }
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                placeholder="Ex: 123456"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Observações"
                value={formData.observacoes}
                onChange={(e) =>
                  handleFormChange('observacoes', e.target.value)
                }
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                placeholder="Informações adicionais sobre a conta..."
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
            onClick={salvarConta}
            disabled={
              !formData.descricao ||
              !formData.valor ||
              !formData.data_vencimento
            }
            sx={{ borderRadius: 2, px: 3, fontWeight: 600 }}
          >
            Salvar Conta
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Pagamento */}
      <Dialog
        open={modalPagamento}
        onClose={() => setModalPagamento(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            ✅ Pagar Conta
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {contaSelecionada?.descricao}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Valor a Pagar *"
                value={dadosPagamento.valor_pago}
                onChange={(e) =>
                  handlePagamentoChange('valor_pago', e.target.value)
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">R$</InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                helperText={`Valor original: ${financeiroService.formatarMoeda(
                  contaSelecionada?.valor || 0
                )}`}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Forma de Pagamento *"
                value={dadosPagamento.forma_pagamento}
                onChange={(e) =>
                  handlePagamentoChange('forma_pagamento', e.target.value)
                }
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                {(financeiroService.opcoesFormaPagamento || []).map((opcao) => (
                  <MenuItem key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Data do Pagamento *"
                value={dadosPagamento.data_pagamento}
                onChange={(e) =>
                  handlePagamentoChange('data_pagamento', e.target.value)
                }
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Desconto"
                value={dadosPagamento.desconto}
                onChange={(e) =>
                  handlePagamentoChange('desconto', e.target.value)
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">R$</InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Juros"
                value={dadosPagamento.juros}
                onChange={(e) => handlePagamentoChange('juros', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">R$</InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Multa"
                value={dadosPagamento.multa}
                onChange={(e) => handlePagamentoChange('multa', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">R$</InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Observações do Pagamento"
                value={dadosPagamento.observacoes}
                onChange={(e) =>
                  handlePagamentoChange('observacoes', e.target.value)
                }
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                placeholder="Informações sobre o pagamento..."
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={() => setModalPagamento(false)}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={processarPagamento}
            disabled={!dadosPagamento.valor_pago}
            sx={{ borderRadius: 2, px: 3, fontWeight: 600 }}
          >
            Confirmar Pagamento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ContasPagarTab
