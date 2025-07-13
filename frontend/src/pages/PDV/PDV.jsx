import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Avatar,
  Badge,
  Autocomplete,
  InputAdornment,
  Fade,
  Grow,
  CircularProgress,
} from '@mui/material'
import {
  ShoppingCart as ShoppingCartIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as PixIcon,
  AttachMoney as CashIcon,
  Clear as ClearIcon,
  QrCodeScanner as QrCodeScannerIcon,
} from '@mui/icons-material'
import { produtoService } from '../../services/produtoService'
import { vendaService } from '../../services/vendaService'
import { clienteService } from '../../services/clienteService'
import QuickScannerModal from '../../components/Shared/QuickScannerModal'

const PDV = () => {
  // Estados
  const [produtos, setProdutos] = useState([])
  const [clientes, setClientes] = useState([])
  const [produtosFiltrados, setProdutosFiltrados] = useState([])
  const [carrinho, setCarrinho] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  // Estados do modal de pagamento
  const [modalPagamento, setModalPagamento] = useState(false)
  const [formaPagamento, setFormaPagamento] = useState('dinheiro')
  const [valorPago, setValorPago] = useState('')
  const [desconto, setDesconto] = useState(0)
  const [observacoes, setObservacoes] = useState('')
  const [processandoVenda, setProcessandoVenda] = useState(false)

  // Estados do scanner
  const [scannerModal, setScannerModal] = useState(false)

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados()
  }, [])

  // Filtrar produtos conforme busca
  useEffect(() => {
    if (busca.trim()) {
      const filtrados = produtos.filter(
        (produto) =>
          produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
          produto.codigo_barras?.includes(busca) ||
          produto.codigo_interno?.includes(busca)
      )
      setProdutosFiltrados(filtrados)
    } else {
      setProdutosFiltrados(
        produtos.filter((p) => p.ativo && p.estoque_atual > 0)
      )
    }
  }, [busca, produtos])

  const carregarDados = async () => {
    try {
      setLoading(true)
      console.log('🔄 Carregando dados do PDV...')

      const [produtosRes, clientesRes] = await Promise.all([
        produtoService.listar(),
        clienteService.listar(),
      ])

      console.log('✅ Produtos carregados:', produtosRes?.length || 0)
      console.log('✅ Clientes carregados:', clientesRes?.length || 0)

      // Garantir que sempre sejam arrays
      const produtosArray = Array.isArray(produtosRes) ? produtosRes : []
      const clientesArray = Array.isArray(clientesRes) ? clientesRes : []

      console.log(
        '📋 Arrays finais - Produtos:',
        produtosArray.length,
        'Clientes:',
        clientesArray.length
      )

      setProdutos(produtosArray)
      setClientes(clientesArray)
      setProdutosFiltrados(
        produtosArray.filter((p) => p.ativo && p.estoque_atual > 0)
      )
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
      setErro('Erro ao carregar dados: ' + error.message)
      // Definir arrays vazios em caso de erro
      setProdutos([])
      setClientes([])
      setProdutosFiltrados([])
    } finally {
      setLoading(false)
    }
  }

  // Funções do carrinho
  const adicionarAoCarrinho = (produto) => {
    if (produto.estoque_atual <= 0) {
      setErro('Produto sem estoque')
      return
    }

    const itemExistente = carrinho.find((item) => item.id === produto.id)

    if (itemExistente) {
      if (itemExistente.quantidade >= produto.estoque_atual) {
        setErro('Quantidade máxima em estoque atingida')
        return
      }
      setCarrinho(
        carrinho.map((item) =>
          item.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        )
      )
    } else {
      setCarrinho([
        ...carrinho,
        {
          ...produto,
          quantidade: 1,
          preco_unitario: produto.preco_venda,
        },
      ])
    }

    // Limpar erro de sucesso
    setErro('')
  }

  const removerDoCarrinho = (produtoId) => {
    setCarrinho(carrinho.filter((item) => item.id !== produtoId))
  }

  const alterarQuantidade = (produtoId, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      removerDoCarrinho(produtoId)
      return
    }

    const produto = produtos.find((p) => p.id === produtoId)
    if (novaQuantidade > produto.estoque_atual) {
      setErro('Quantidade superior ao estoque disponível')
      return
    }

    setCarrinho(
      carrinho.map((item) =>
        item.id === produtoId ? { ...item, quantidade: novaQuantidade } : item
      )
    )
    setErro('')
  }

  const limparCarrinho = () => {
    setCarrinho([])
    setClienteSelecionado(null)
    setDesconto(0)
    setObservacoes('')
    setValorPago('')
    setFormaPagamento('dinheiro')
  }

  // Função para lidar com produto encontrado pelo scanner
  const handleProductoEncontrado = (produto) => {
    adicionarAoCarrinho(produto)
    setSucesso(`${produto.nome} adicionado ao carrinho!`)
    setTimeout(() => setSucesso(''), 3000)
  }

  const fecharModalPagamento = () => {
    setModalPagamento(false)
    setValorPago('')
    setFormaPagamento('dinheiro')
  }

  // Função para lidar com mudança de método de pagamento
  const handleFormaPagamentoChange = (novaForma) => {
    setFormaPagamento(novaForma)

    // Para cartão e PIX, o valor pago é automaticamente o total
    if (novaForma === 'cartao' || novaForma === 'pix') {
      setValorPago(total.toString())
    } else {
      setValorPago('')
    }
  }

  // Cálculos
  const subtotal = carrinho.reduce(
    (total, item) => total + item.preco_unitario * item.quantidade,
    0
  )
  const valorDesconto = (subtotal * desconto) / 100
  const total = subtotal - valorDesconto

  const troco = valorPago ? parseFloat(valorPago) - total : 0

  // Finalizar venda
  const finalizarVenda = async () => {
    if (carrinho.length === 0) {
      setErro('Carrinho vazio')
      return
    }

    // Validação específica por método de pagamento
    if (formaPagamento === 'dinheiro') {
      if (!valorPago || parseFloat(valorPago) <= 0) {
        setErro('Informe o valor recebido')
        return
      }
      if (parseFloat(valorPago) < total) {
        setErro(
          `Valor insuficiente! Faltam ${formatarMoeda(
            total - parseFloat(valorPago)
          )}`
        )
        return
      }
    }

    setProcessandoVenda(true)
    try {
      console.log('🛒 Finalizando venda...')

      const dadosVenda = {
        cliente_id: clienteSelecionado?.id || null,
        tipo_pagamento: formaPagamento,
        desconto: valorDesconto,
        observacoes,
        itens: carrinho.map((item) => ({
          produto_id: item.id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
        })),
      }

      console.log('📊 Dados da venda:', dadosVenda)

      const response = await vendaService.criar(dadosVenda)

      console.log('✅ Venda criada:', response)

      // Mensagem de sucesso personalizada por método
      let mensagemSucesso = 'Venda finalizada com sucesso!'

      if (formaPagamento === 'dinheiro' && troco > 0) {
        mensagemSucesso += ` Troco: ${formatarMoeda(troco)}`
      } else if (formaPagamento === 'cartao') {
        mensagemSucesso += ' Pagamento no cartão processado!'
      } else if (formaPagamento === 'pix') {
        mensagemSucesso += ' Aguarde a confirmação do PIX!'
      }

      setSucesso(mensagemSucesso)
      fecharModalPagamento()
      limparCarrinho()

      // Atualizar dados
      carregarDados()
    } catch (error) {
      console.error('❌ Erro ao finalizar venda:', error)
      setErro(
        'Erro ao finalizar venda: ' +
          (error.response?.data?.error || error.message || 'Erro desconhecido')
      )
    } finally {
      setProcessandoVenda(false)
    }
  }

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor || 0)
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4" display="flex" alignItems="center" gap={1}>
            🛒 PDV - Ponto de Venda
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            <Badge badgeContent={carrinho.length} color="primary">
              <ShoppingCartIcon />
            </Badge>
            <Typography variant="h6" color="primary">
              {formatarMoeda(total)}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                console.log('🔍 Debug clientes:', {
                  clientes,
                  length: clientes?.length,
                  sample: clientes?.[0],
                })
                alert(`Clientes: ${clientes?.length || 0}`)
              }}
            >
              Debug ({clientes?.length || 0})
            </Button>
          </Box>
        </Box>

        {/* Alertas */}
        {erro && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro('')}>
            {erro}
          </Alert>
        )}
        {sucesso && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSucesso('')}
          >
            {sucesso}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Coluna Esquerda - Produtos */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="h6">
                    Produtos Disponíveis ({produtosFiltrados.length})
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<QrCodeScannerIcon />}
                      onClick={() => setScannerModal(true)}
                    >
                      Scanner
                    </Button>
                    <TextField
                      size="small"
                      placeholder="Buscar por nome, código..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                        endAdornment: busca && (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setBusca('')}
                            >
                              <ClearIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{ minWidth: 300 }}
                    />
                  </Box>
                </Box>

                {loading ? (
                  <Typography textAlign="center" py={4}>
                    Carregando produtos...
                  </Typography>
                ) : produtosFiltrados.length === 0 ? (
                  <Alert severity="info">
                    {busca
                      ? 'Nenhum produto encontrado para a busca.'
                      : 'Nenhum produto disponível no momento.'}
                  </Alert>
                ) : (
                  <Grid container spacing={2}>
                    {produtosFiltrados.slice(0, 12).map((produto) => (
                      <Grid item xs={12} sm={6} md={4} key={produto.id}>
                        <Grow in timeout={500}>
                          <Card
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.3s',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: 4,
                              },
                            }}
                            onClick={() => adicionarAoCarrinho(produto)}
                          >
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                              <Avatar
                                sx={{
                                  mx: 'auto',
                                  mb: 1,
                                  bgcolor:
                                    produto.estoque_atual > 0
                                      ? 'success.main'
                                      : 'error.main',
                                }}
                              >
                                {produto.nome.charAt(0)}
                              </Avatar>
                              <Typography variant="subtitle2" noWrap>
                                {produto.nome}
                              </Typography>
                              <Typography variant="h6" color="primary">
                                {formatarMoeda(produto.preco_venda)}
                              </Typography>
                              <Chip
                                label={`Estoque: ${produto.estoque_atual}`}
                                size="small"
                                color={
                                  produto.estoque_atual > 0
                                    ? 'success'
                                    : 'error'
                                }
                              />
                            </CardContent>
                          </Card>
                        </Grow>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Coluna Direita - Carrinho */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: 'fit-content' }}>
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="h6">Carrinho de Vendas</Typography>
                  {carrinho.length > 0 && (
                    <IconButton onClick={limparCarrinho} color="error">
                      <ClearIcon />
                    </IconButton>
                  )}
                </Box>

                {/* Cliente */}
                <Box mb={2}>
                  <Autocomplete
                    options={clientes || []}
                    getOptionLabel={(cliente) => {
                      if (!cliente) return ''
                      return `${cliente.nome || 'Cliente'} - ${
                        cliente.telefone || 'Sem telefone'
                      }`
                    }}
                    value={clienteSelecionado}
                    onChange={(event, novoCliente) => {
                      console.log('🙋 Cliente selecionado:', novoCliente)
                      setClienteSelecionado(novoCliente)
                    }}
                    renderOption={(props, cliente) => (
                      <Box component="li" {...props}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {cliente.nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cliente.telefone}{' '}
                            {cliente.email && `• ${cliente.email}`}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={`Cliente (opcional) - ${
                          clientes?.length || 0
                        } disponíveis`}
                        size="small"
                        placeholder="Digite para buscar cliente..."
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonIcon sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                    noOptionsText="Nenhum cliente encontrado"
                    loadingText="Carregando clientes..."
                    clearText="Limpar seleção"
                    closeText="Fechar"
                    openText="Abrir lista de clientes"
                    filterOptions={(options, { inputValue }) => {
                      if (!inputValue) return options.slice(0, 50) // Mostrar apenas 50 primeiros

                      const filtered = options.filter(
                        (cliente) =>
                          cliente.nome
                            ?.toLowerCase()
                            .includes(inputValue.toLowerCase()) ||
                          cliente.telefone?.includes(inputValue) ||
                          cliente.email
                            ?.toLowerCase()
                            .includes(inputValue.toLowerCase())
                      )

                      return filtered.slice(0, 50) // Limitar a 50 resultados
                    }}
                  />

                  {/* Debug info */}
                  {process.env.NODE_ENV === 'development' && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: 'block' }}
                    >
                      Debug: {clientes?.length || 0} clientes carregados
                      {clienteSelecionado &&
                        ` | Selecionado: ${clienteSelecionado.nome}`}
                    </Typography>
                  )}
                </Box>

                {/* Lista de Itens */}
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {carrinho.length === 0 ? (
                    <ListItem>
                      <ListItemText
                        primary="Carrinho vazio"
                        secondary="Adicione produtos clicando neles"
                        sx={{ textAlign: 'center' }}
                      />
                    </ListItem>
                  ) : (
                    carrinho.map((item) => (
                      <ListItem key={item.id} divider>
                        <ListItemText
                          primary={item.nome}
                          secondary={
                            <React.Fragment>
                              <span style={{ display: 'block' }}>
                                {formatarMoeda(item.preco_unitario)} x{' '}
                                {item.quantidade}
                              </span>
                              <span
                                style={{
                                  display: 'block',
                                  color: 'var(--mui-palette-primary-main)',
                                  fontWeight: 'bold',
                                }}
                              >
                                ={' '}
                                {formatarMoeda(
                                  item.preco_unitario * item.quantidade
                                )}
                              </span>
                            </React.Fragment>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box display="flex" alignItems="center" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() =>
                                alterarQuantidade(item.id, item.quantidade - 1)
                              }
                            >
                              <RemoveIcon />
                            </IconButton>
                            <Typography
                              sx={{ minWidth: 20, textAlign: 'center' }}
                            >
                              {item.quantidade}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() =>
                                alterarQuantidade(item.id, item.quantidade + 1)
                              }
                            >
                              <AddIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removerDoCarrinho(item.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))
                  )}
                </List>

                {carrinho.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />

                    {/* Desconto */}
                    <TextField
                      fullWidth
                      size="small"
                      label="Desconto (%)"
                      type="number"
                      value={desconto}
                      onChange={(e) =>
                        setDesconto(
                          Math.max(
                            0,
                            Math.min(100, parseFloat(e.target.value) || 0)
                          )
                        )
                      }
                      sx={{ mb: 2 }}
                    />

                    {/* Totais */}
                    <Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography>Subtotal:</Typography>
                        <Typography>{formatarMoeda(subtotal)}</Typography>
                      </Box>
                      {desconto > 0 && (
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          color="error.main"
                        >
                          <Typography>Desconto ({desconto}%):</Typography>
                          <Typography>
                            -{formatarMoeda(valorDesconto)}
                          </Typography>
                        </Box>
                      )}
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        fontWeight="bold"
                      >
                        <Typography variant="h6">Total:</Typography>
                        <Typography
                          variant="h5"
                          fontWeight={700}
                          sx={{
                            color: 'primary.main',
                            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            fontSize: '1.5rem',
                          }}
                        >
                          {formatarMoeda(total)}
                        </Typography>
                      </Box>
                    </Box>

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<PaymentIcon />}
                      onClick={() => setModalPagamento(true)}
                      sx={{ mt: 2 }}
                    >
                      Finalizar Venda
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Modal de Pagamento */}
        <Dialog
          open={modalPagamento}
          onClose={fecharModalPagamento}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <PaymentIcon />
              Finalizar Pagamento
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {/* Resumo da Venda */}
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 3,
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(30, 30, 30, 0.8)'
                      : 'rgba(255, 255, 255, 0.95)',
                  border: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '1px solid rgba(255, 0, 0, 0.2)'
                      : '1px solid rgba(255, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 8px 32px rgba(255, 0, 0, 0.1)'
                      : '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: 'primary.main',
                    fontWeight: 600,
                    mb: 2,
                    pb: 1,
                    borderBottom: '2px solid',
                    borderColor: 'primary.main',
                  }}
                >
                  <ReceiptIcon />
                  Resumo da Venda
                </Typography>

                <Box
                  display="flex"
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="body1">Subtotal:</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {formatarMoeda(subtotal)}
                  </Typography>
                </Box>

                {desconto > 0 && (
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="body1" color="error.main">
                      Desconto ({desconto}%):
                    </Typography>
                    <Typography
                      variant="body1"
                      color="error.main"
                      fontWeight={500}
                    >
                      -{formatarMoeda(valorDesconto)}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="h6" fontWeight={700}>
                    Total:
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    sx={{
                      color: 'primary.main',
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      fontSize: '1.5rem',
                    }}
                  >
                    {formatarMoeda(total)}
                  </Typography>
                </Box>
              </Paper>

              {/* Método de Pagamento */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Método de Pagamento</InputLabel>
                <Select
                  value={formaPagamento}
                  onChange={(e) => handleFormaPagamentoChange(e.target.value)}
                  label="Método de Pagamento"
                >
                  <MenuItem value="dinheiro">
                    <Box display="flex" alignItems="center" gap={1}>
                      <CashIcon /> Dinheiro
                    </Box>
                  </MenuItem>
                  <MenuItem value="cartao">
                    <Box display="flex" alignItems="center" gap={1}>
                      <CreditCardIcon /> Cartão
                    </Box>
                  </MenuItem>
                  <MenuItem value="pix">
                    <Box display="flex" alignItems="center" gap={1}>
                      <PixIcon /> PIX
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Valor Recebido (apenas para dinheiro) */}
              {formaPagamento === 'dinheiro' ? (
                <TextField
                  fullWidth
                  label="Valor Recebido"
                  type="number"
                  value={valorPago}
                  onChange={(e) => setValorPago(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">R$</InputAdornment>
                    ),
                  }}
                  helperText="Digite o valor recebido do cliente para calcular o troco"
                />
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Valor a ser cobrado:</strong> {formatarMoeda(total)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formaPagamento === 'cartao' &&
                      'Processamento via máquina de cartão'}
                    {formaPagamento === 'pix' && 'Aguarde a confirmação do PIX'}
                  </Typography>
                </Alert>
              )}

              {/* Troco (apenas para dinheiro) */}
              {formaPagamento === 'dinheiro' && valorPago && (
                <Alert
                  severity={troco >= 0 ? 'success' : 'error'}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    Troco: {formatarMoeda(troco)}
                  </Typography>
                  {troco < 0 && (
                    <Typography variant="caption" color="error.main">
                      Valor insuficiente! Faltam{' '}
                      {formatarMoeda(Math.abs(troco))}
                    </Typography>
                  )}
                </Alert>
              )}

              {/* Observações */}
              <TextField
                fullWidth
                label="Observações (opcional)"
                multiline
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button onClick={fecharModalPagamento} size="large" sx={{ mr: 1 }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={finalizarVenda}
              disabled={
                processandoVenda ||
                (formaPagamento === 'dinheiro' &&
                  (!valorPago || parseFloat(valorPago) < total))
              }
              startIcon={
                processandoVenda ? (
                  <CircularProgress size={20} />
                ) : (
                  <ReceiptIcon />
                )
              }
              size="large"
              sx={{ minWidth: 180 }}
            >
              {processandoVenda
                ? 'Processando...'
                : formaPagamento === 'dinheiro'
                ? 'Confirmar Venda'
                : formaPagamento === 'cartao'
                ? 'Processar Cartão'
                : 'Gerar PIX'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Scanner Modal */}
        <QuickScannerModal
          open={scannerModal}
          onClose={() => setScannerModal(false)}
          onProductFound={handleProductoEncontrado}
          title="Scanner de Produtos - PDV"
          subtitle="Escaneie o código de barras do produto para adicionar ao carrinho"
        />
      </Box>
    </Container>
  )
}

export default PDV
