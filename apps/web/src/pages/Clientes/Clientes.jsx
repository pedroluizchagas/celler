import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton,
  Snackbar,
  Card,
  CardContent,
  Grow,
  Fade,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { clienteService } from '../../services/clienteService'
import ClienteModal from '../../components/Cliente/ClienteModal'

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [clienteEditando, setClienteEditando] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    cliente: null,
  })
  const [busca, setBusca] = useState('')
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'))
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    carregarClientes()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (busca.trim()) {
        handleBusca()
      } else {
        carregarClientes()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [busca])

  const carregarClientes = async () => {
    try {
      setLoading(true)
      setError('')
      console.log(' Carregando clientes...')
      const response = await clienteService.listar()
      console.log(' Resposta do serviço:', response)

      // O clienteService.listar() já retorna os dados diretamente
      setClientes(Array.isArray(response) ? response : [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar clientes')
      console.error(' Erro ao carregar clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBusca = async () => {
    if (!busca.trim()) {
      carregarClientes()
      return
    }

    try {
      setLoading(true)
      const response = await clienteService.buscar(busca)
      setClientes(Array.isArray(response) ? response : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNovoCliente = () => {
    setClienteEditando(null)
    setModalOpen(true)
  }

  const handleEditarCliente = (cliente) => {
    setClienteEditando(cliente)
    setModalOpen(true)
  }

  const handleSalvarCliente = async (dadosCliente) => {
    try {
      if (clienteEditando) {
        await clienteService.atualizar(clienteEditando.id, dadosCliente)
        setSnackbar({
          open: true,
          message: 'Cliente atualizado com sucesso!',
          severity: 'success',
        })
      } else {
        await clienteService.criar(dadosCliente)
        setSnackbar({
          open: true,
          message: 'Cliente criado com sucesso!',
          severity: 'success',
        })
      }
      carregarClientes()
    } catch (err) {
      throw err
    }
  }

  const handleConfirmarExclusao = (cliente) => {
    setConfirmDelete({ open: true, cliente })
  }

  const handleExcluirCliente = async () => {
    try {
      await clienteService.excluir(confirmDelete.cliente.id)
      setSnackbar({
        open: true,
        message: 'Cliente excluído com sucesso!',
        severity: 'success',
      })
      setConfirmDelete({ open: false, cliente: null })
      carregarClientes()
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message,
        severity: 'error',
      })
    }
  }

  const renderMobileCard = (cliente, index) => (
    <Grow key={cliente.id} in={!loading} timeout={800 + index * 100}>
      <Card
        className="glass-card modern-elevation"
        sx={{
          mb: 2,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(var(--accent-rgb), 0.15)',
          },
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="flex-start"
            mb={2}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <PersonIcon color="primary" sx={{ fontSize: 20 }} />
              <Typography variant="h6" fontWeight={600} color="primary">
                {cliente.nome}
              </Typography>
            </Box>
            <Box display="flex" gap={0.5}>
              <Tooltip title="Editar">
                <IconButton
                  size="small"
                  onClick={() => handleEditarCliente(cliente)}
                  sx={{
                    color: 'primary.main',
                    '&:hover': { backgroundColor: 'rgba(var(--accent-rgb), 0.1)' },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excluir">
                <IconButton
                  size="small"
                  onClick={() => handleConfirmarExclusao(cliente)}
                  sx={{
                    color: 'error.main',
                    '&:hover': { backgroundColor: 'rgba(var(--accent-rgb), 0.1)' },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box display="flex" flexDirection="column" gap={1}>
            {cliente.telefone && (
              <Box display="flex" alignItems="center" gap={1}>
                <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.primary">
                  {cliente.telefone}
                </Typography>
              </Box>
            )}

            {cliente.email && (
              <Box display="flex" alignItems="center" gap={1}>
                <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography
                  variant="body2"
                  color="text.primary"
                  sx={{ wordBreak: 'break-word' }}
                >
                  {cliente.email}
                </Typography>
              </Box>
            )}

            {cliente.endereco && (
              <Box display="flex" alignItems="flex-start" gap={1}>
                <LocationIcon
                  sx={{ fontSize: 16, color: 'text.secondary', mt: 0.2 }}
                />
                <Typography
                  variant="body2"
                  color="text.primary"
                  sx={{ lineHeight: 1.4 }}
                >
                  {cliente.endereco}
                </Typography>
              </Box>
            )}
          </Box>

          <Box mt={2} display="flex" justify="flex-end">
            <Chip
              label="Ativo"
              color="success"
              size="small"
              sx={{ fontSize: '0.7rem', fontWeight: 600 }}
            />
          </Box>
        </CardContent>
      </Card>
    </Grow>
  )

  const renderDesktopTable = () => (
    <TableContainer
      className="modern-table"
      sx={{
        maxHeight: { md: 600, lg: 700 },
        '&::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(var(--accent-rgb), 0.3)',
          borderRadius: 4,
        },
      }}
    >
      <Table stickyHeader>
        <TableHead className="modern-table-header">
          <TableRow>
            <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Nome</TableCell>
            <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>
              Telefone
            </TableCell>
            <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Email</TableCell>
            {!isTablet && (
              <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>
                Endereço
              </TableCell>
            )}
            <TableCell sx={{ fontWeight: 700, minWidth: 100 }}>
              Status
            </TableCell>
            <TableCell sx={{ fontWeight: 700, minWidth: 120 }} align="center">
              Ações
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clientes.map((cliente, index) => (
            <Grow key={cliente.id} in={!loading} timeout={1000 + index * 100}>
              <TableRow
                className="modern-table-row"
                hover
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(var(--accent-rgb), 0.02)',
                    transform: 'scale(1.001)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon color="primary" sx={{ fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={600}>
                      {cliente.nome}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {cliente.telefone || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-word',
                      maxWidth: 200,
                    }}
                  >
                    {cliente.email || '-'}
                  </Typography>
                </TableCell>
                {!isTablet && (
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={cliente.endereco}
                    >
                      {cliente.endereco || '-'}
                    </Typography>
                  </TableCell>
                )}
                <TableCell>
                  <Chip
                    label="Ativo"
                    color="success"
                    size="small"
                    className="modern-status"
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" gap={1} justifyContent="center">
                    <Tooltip title="Editar cliente">
                      <IconButton
                        size="small"
                        onClick={() => handleEditarCliente(cliente)}
                        sx={{
                          color: 'primary.main',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(var(--accent-rgb), 0.1)',
                            transform: 'scale(1.1)',
                          },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir cliente">
                      <IconButton
                        size="small"
                        onClick={() => handleConfirmarExclusao(cliente)}
                        sx={{
                          color: 'error.main',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(var(--accent-rgb), 0.1)',
                            transform: 'scale(1.1)',
                          },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            </Grow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Gestão de Clientes
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Cadastro e gerenciamento de clientes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNovoCliente}
          sx={{
            height: 'fit-content',
            background: (theme) => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
            '&:hover': {
              background: (theme) => `linear-gradient(45deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
            },
          }}
        >
          Novo Cliente
        </Button>
      </Box>

      <Fade in timeout={600}>
        <Card
          className="glass-card modern-elevation"
          sx={{
            mb: { xs: 3, sm: 4 },
            p: { xs: 2, sm: 3 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 2, sm: 3 },
              alignItems: { xs: 'stretch', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            <TextField
              placeholder="Buscar clientes..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
              }}
              sx={{
                flexGrow: 1,
                '& .MuiOutlinedInput-root': {
                  minHeight: { xs: 48, sm: 56 },
                  fontSize: { xs: '16px', sm: 'inherit' },
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 2,
                  },
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                    boxShadow: '0 0 0 3px rgba(var(--accent-rgb), 0.1)',
                  },
                },
              }}
            />

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={carregarClientes}
              disabled={loading}
              sx={{
                borderColor: 'primary.main',
                color: 'primary.main',
                minHeight: { xs: 48, sm: 44 },
                px: { xs: 2, sm: 3 },
                borderRadius: 6,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(var(--accent-rgb), 0.05)',
                  borderColor: 'primary.main',
                  transform: isMobile ? 'none' : 'translateY(-2px)',
                },
              }}
            >
              Atualizar
            </Button>
          </Box>
        </Card>
      </Fade>

      {error && (
        <Collapse in={!!error}>
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            onClose={() => setError('')}
            action={
              <IconButton size="small" onClick={() => setError('')}>
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        </Collapse>
      )}

      <Fade in timeout={800}>
        <Card className="glass-card modern-elevation">
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                flexDirection="column"
                p={6}
                gap={2}
              >
                <CircularProgress
                  size={60}
                  thickness={4}
                  sx={{
                    color: 'primary.main',
                    filter: 'drop-shadow(0 0 10px rgba(var(--accent-rgb), 0.3))',
                  }}
                />
                <Typography variant="body1" color="text.secondary">
                  Carregando clientes...
                </Typography>
              </Box>
            ) : clientes.length === 0 ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                flexDirection="column"
                p={6}
                gap={2}
              >
                <PersonIcon
                  sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5 }}
                />
                <Typography variant="h6" color="text.secondary">
                  Nenhum cliente encontrado
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                >
                  {busca
                    ? 'Tente ajustar os termos de busca'
                    : 'Comece adicionando seu primeiro cliente'}
                </Typography>
                {!busca && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleNovoCliente}
                    sx={{
                      mt: 2,
                      background: (theme) => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                      '&:hover': {
                        background: (theme) => `linear-gradient(45deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                      },
                    }}
                  >
                    Adicionar Cliente
                  </Button>
                )}
              </Box>
            ) : (
              <Box>
                <Box
                  sx={{
                    p: { xs: 2, sm: 3 },
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="h6" fontWeight={700}>
                    {clientes.length} Cliente{clientes.length !== 1 ? 's' : ''}{' '}
                    Encontrado{clientes.length !== 1 ? 's' : ''}
                  </Typography>
                  {busca && (
                    <Chip
                      label={`Busca: "${busca}"`}
                      size="small"
                      onDelete={() => setBusca('')}
                      deleteIcon={<CloseIcon />}
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        '& .MuiChip-deleteIcon': {
                          color: 'white',
                        },
                      }}
                    />
                  )}
                </Box>

                <Box sx={{ p: { xs: 1, sm: 0 } }}>
                  {isMobile ? (
                    <Box sx={{ p: 2 }}>
                      {clientes.map((cliente, index) =>
                        renderMobileCard(cliente, index)
                      )}
                    </Box>
                  ) : (
                    renderDesktopTable()
                  )}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Fade>

      <ClienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        cliente={clienteEditando}
        onSave={handleSalvarCliente}
      />

      <Dialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, cliente: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(26, 26, 26, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: { xs: 2, sm: 3 },
            border:
              theme.palette.mode === 'dark'
                ? '1px solid rgba(var(--accent-rgb), 0.1)'
                : '1px solid rgba(255, 255, 255, 0.2)',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700} color="error">
            Confirmar Exclusão
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Tem certeza que deseja excluir o cliente{' '}
            <strong>{confirmDelete.cliente?.nome}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={() => setConfirmDelete({ open: false, cliente: null })}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExcluirCliente}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2 }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Clientes
