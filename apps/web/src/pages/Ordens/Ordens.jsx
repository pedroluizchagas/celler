import { useState, useEffect } from 'react'
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Badge,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  Label as LabelIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material'
import { ordemService } from '../../services/ordemService'
import OrdemModal from '../../components/Ordem/OrdemModal'
import OrdemComprovante from '../../components/Ordem/OrdemComprovante'
import OrdemEtiqueta from '../../components/Ordem/OrdemEtiqueta'

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

const prioridadeColors = {
  baixa: 'success',
  normal: 'info',
  alta: 'warning',
  urgente: 'error',
}

const prioridadeLabels = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
}

function Ordens() {
  const [ordens, setOrdens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [ordemEditando, setOrdemEditando] = useState(null)
  const [ordemVisualizando, setOrdemVisualizando] = useState(null)
  const [fotosVisualizando, setFotosVisualizando] = useState([])
  const [fotosLoading, setFotosLoading] = useState(false)
  const [comprovanteOpen, setComprovanteOpen] = useState(false)
  const [etiquetaOpen, setEtiquetaOpen] = useState(false)
  const [ordemSelecionada, setOrdemSelecionada] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    ordem: null,
  })
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroPrioridade, setFiltroPrioridade] = useState('')
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  })
  const [stats, setStats] = useState({
    total: 0,
    por_status: {},
    por_prioridade: {},
  })

  // Carregar ordens
  const carregarOrdens = async () => {
    try {
      setLoading(true)
      setError('')
      const filtros = {}
      if (filtroStatus) filtros.status = filtroStatus
      if (filtroPrioridade) filtros.prioridade = filtroPrioridade

      const response = await ordemService.listar(filtros)
      setOrdens(response.data || [])

      // Calcular estatísticas
      const ordensData = response.data || []
      const statsData = {
        total: ordensData.length,
        por_status: {},
        por_prioridade: {},
      }

      ordensData.forEach((ordem) => {
        // Contar por status
        if (!statsData.por_status[ordem.status]) {
          statsData.por_status[ordem.status] = 0
        }
        statsData.por_status[ordem.status]++

        // Contar por prioridade
        if (!statsData.por_prioridade[ordem.prioridade]) {
          statsData.por_prioridade[ordem.prioridade] = 0
        }
        statsData.por_prioridade[ordem.prioridade]++
      })

      setStats(statsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Carregar ordens na inicialização
  useEffect(() => {
    carregarOrdens()
  }, [])

  // Aplicar filtros
  useEffect(() => {
    carregarOrdens()
  }, [filtroStatus, filtroPrioridade])

  // Abrir modal para nova ordem
  const handleNovaOrdem = () => {
    setOrdemEditando(null)
    setModalOpen(true)
  }

  // Abrir modal para editar ordem
  const handleEditarOrdem = async (ordem) => {
    try {
      // Buscar dados completos da ordem
      const response = await ordemService.buscarPorId(ordem.id)
      setOrdemEditando(response.data)
      setModalOpen(true)
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Erro ao carregar dados da ordem',
        severity: 'error',
      })
    }
  }

  // Visualizar ordem
  const handleVisualizarOrdem = async (ordem) => {
    try {
      console.log('🔍 Buscando ordem ID:', ordem.id)
      const response = await ordemService.buscarPorId(ordem.id)
      console.log('✅ Dados recebidos:', response)
      setOrdemVisualizando(response.data)
      // Carregar fotos
      setFotosLoading(true)
      try {
        const fotosRes = await ordemService.buscarFotos(ordem.id)
        setFotosVisualizando(Array.isArray(fotosRes.data) ? fotosRes.data : [])
      } catch (e) {
        console.warn('Não foi possível carregar fotos:', e)
        setFotosVisualizando([])
      } finally {
        setFotosLoading(false)
      }
    } catch (err) {
      console.error('❌ Erro ao buscar ordem:', err)
      setSnackbar({
        open: true,
        message: `Erro ao carregar dados da ordem: ${err.message}`,
        severity: 'error',
      })
    }
  }

  // Imprimir comprovante
  const handleImprimirComprovante = async (ordem) => {
    try {
      const response = await ordemService.buscarPorId(ordem.id)
      setOrdemSelecionada(response.data)
      setComprovanteOpen(true)
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Erro ao carregar dados da ordem',
        severity: 'error',
      })
    }
  }

  // Imprimir etiqueta
  const handleImprimirEtiqueta = async (ordem) => {
    try {
      const response = await ordemService.buscarPorId(ordem.id)
      setOrdemSelecionada(response.data)
      setEtiquetaOpen(true)
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Erro ao carregar dados da ordem',
        severity: 'error',
      })
    }
  }

  // Excluir foto da ordem visualizada
  const handleExcluirFoto = async (foto) => {
    if (!ordemVisualizando) return
    const ok = window.confirm('Deseja excluir esta foto?')
    if (!ok) return
    try {
      await ordemService.excluirFoto(ordemVisualizando.id, foto.id)
      setFotosVisualizando((prev) => prev.filter((f) => f.id !== foto.id))
      setSnackbar({ open: true, message: 'Foto excluída', severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    }
  }

  // Salvar ordem (criar ou atualizar)
  const handleSalvarOrdem = async (dadosOrdem, fotos) => {
    try {
      if (ordemEditando) {
        // Atualizar ordem existente
        await ordemService.atualizar(ordemEditando.id, dadosOrdem)
        setSnackbar({
          open: true,
          message: 'Ordem atualizada com sucesso!',
          severity: 'success',
        })
      } else {
        // Criar nova ordem
        await ordemService.criar(dadosOrdem, fotos)
        setSnackbar({
          open: true,
          message: 'Ordem criada com sucesso!',
          severity: 'success',
        })
      }

      carregarOrdens() // Recarregar lista
    } catch (err) {
      throw err // Repassar erro para o modal
    }
  }

  // Confirmar exclusão
  const handleConfirmarExclusao = (ordem) => {
    setConfirmDelete({ open: true, ordem })
  }

  // Excluir ordem
  const handleExcluirOrdem = async () => {
    try {
      await ordemService.excluir(confirmDelete.ordem.id)
      setSnackbar({
        open: true,
        message: 'Ordem excluída com sucesso!',
        severity: 'success',
      })
      setConfirmDelete({ open: false, ordem: null })
      carregarOrdens()
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message,
        severity: 'error',
      })
    }
  }

  const formatarData = (dataString) => {
    if (!dataString) return '-'
    return new Date(dataString).toLocaleDateString('pt-BR')
  }

  const formatarValor = (valor) => {
    if (!valor) return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  const limparFiltros = () => {
    setFiltroStatus('')
    setFiltroPrioridade('')
  }

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
            Ordens de Serviço
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Gerencie as ordens de serviço do sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNovaOrdem}
          sx={{ height: 'fit-content' }}
        >
          Nova Ordem
        </Button>
      </Box>

      {/* Cards de Estatísticas */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total de Ordens
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {Object.entries(stats.por_status).map(([status, count]) => (
          <Grid item xs={6} sm={3} md={2} key={status}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Badge
                  badgeContent={count}
                  color={statusColors[status]}
                  sx={{ mb: 1 }}
                >
                  <Chip
                    label={statusLabels[status]}
                    color={statusColors[status]}
                    size="small"
                  />
                </Badge>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <FilterIcon color="action" />
          <Typography variant="subtitle1">Filtros:</Typography>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="">Todos</MenuItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  <Chip
                    label={label}
                    color={statusColors[value]}
                    size="small"
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Prioridade</InputLabel>
            <Select
              value={filtroPrioridade}
              onChange={(e) => setFiltroPrioridade(e.target.value)}
              label="Prioridade"
            >
              <MenuItem value="">Todas</MenuItem>
              {Object.entries(prioridadeLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  <Chip
                    label={label}
                    color={prioridadeColors[value]}
                    size="small"
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            onClick={limparFiltros}
            variant="outlined"
            size="small"
            disabled={!filtroStatus && !filtroPrioridade}
          >
            Limpar Filtros
          </Button>

          <Button
            onClick={carregarOrdens}
            startIcon={<RefreshIcon />}
            variant="outlined"
            size="small"
          >
            Atualizar
          </Button>
        </Box>
      </Paper>

      {/* Tabela de Ordens */}
      <Paper>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Equipamento</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Prioridade</TableCell>
                  <TableCell>Data Entrada</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Técnico</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ordens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">
                        Nenhuma ordem encontrada
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  ordens.map((ordem) => (
                    <TableRow key={ordem.id} hover>
                      <TableCell>#{ordem.id}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {ordem.cliente_nome}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {ordem.cliente_telefone}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {ordem.equipamento}
                          </Typography>
                          {ordem.marca && ordem.modelo && (
                            <Typography variant="caption" color="textSecondary">
                              {ordem.marca} - {ordem.modelo}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusLabels[ordem.status]}
                          color={statusColors[ordem.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={prioridadeLabels[ordem.prioridade]}
                          color={prioridadeColors[ordem.prioridade]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatarData(ordem.data_entrada)}</TableCell>
                      <TableCell>{formatarValor(ordem.valor_final)}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {ordem.tecnico_responsavel || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" gap={1}>
                          <Tooltip title="Visualizar">
                            <IconButton
                              size="small"
                              onClick={() => handleVisualizarOrdem(ordem)}
                              color="info"
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => handleEditarOrdem(ordem)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Comprovante">
                            <IconButton
                              size="small"
                              onClick={() => handleImprimirComprovante(ordem)}
                              color="secondary"
                            >
                              <PrintIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Etiqueta">
                            <IconButton
                              size="small"
                              onClick={() => handleImprimirEtiqueta(ordem)}
                              color="warning"
                            >
                              <LabelIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              onClick={() => handleConfirmarExclusao(ordem)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Modal de Ordem */}
      <OrdemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        ordem={ordemEditando}
        onSave={handleSalvarOrdem}
        onPrint={handleImprimirComprovante}
        onPrintLabel={handleImprimirEtiqueta}
      />

      {/* Modal de Comprovante */}
      <OrdemComprovante
        open={comprovanteOpen}
        onClose={() => setComprovanteOpen(false)}
        ordem={ordemSelecionada}
      />

      {/* Modal de Etiqueta */}
      <OrdemEtiqueta
        open={etiquetaOpen}
        onClose={() => setEtiquetaOpen(false)}
        ordem={ordemSelecionada}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, ordem: null })}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a ordem #{confirmDelete.ordem?.id}?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDelete({ open: false, ordem: null })}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExcluirOrdem}
            color="error"
            variant="contained"
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Visualização */}
      {ordemVisualizando && (
        <Dialog
          open={!!ordemVisualizando}
          onClose={() => { setOrdemVisualizando(null); setFotosVisualizando([]) }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Ordem #{ordemVisualizando.id} - {ordemVisualizando.equipamento}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Cliente:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {ordemVisualizando.cliente_nome}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Telefone:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {ordemVisualizando.cliente_telefone}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Problema Relatado:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {ordemVisualizando.defeito}
                </Typography>
              </Grid>

              {ordemVisualizando.diagnostico && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Diagnóstico:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {ordemVisualizando.diagnostico}
                  </Typography>
                </Grid>
              )}

              {ordemVisualizando.solucao && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Solução:
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {ordemVisualizando.solucao}
                  </Typography>
                </Grid>
              )}

              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status:
                </Typography>
                <Chip
                  label={statusLabels[ordemVisualizando.status]}
                  color={statusColors[ordemVisualizando.status]}
                  size="small"
                />
              </Grid>

              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Valor Final:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatarValor(ordemVisualizando.valor_final)}
                </Typography>
              </Grid>

              {/* Galeria de Fotos */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Fotos da Ordem
                </Typography>
                {fotosLoading ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="textSecondary">Carregando fotos...</Typography>
                  </Box>
                ) : fotosVisualizando.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Nenhuma foto enviada para esta ordem.
                  </Typography>
                ) : (
                  <Grid container spacing={2}>
                    {fotosVisualizando.map((foto) => (
                      <Grid key={foto.id || foto.path} item xs={6} sm={4} md={3}>
                        <Box position="relative">
                          <a href={foto.url || '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <Box
                              component="img"
                              src={foto.url}
                              alt={foto.path}
                              sx={{
                                width: '100%',
                                height: 140,
                                objectFit: 'cover',
                                borderRadius: 1,
                                boxShadow: 1,
                              }}
                            />
                          </a>
                          <IconButton size="small" onClick={() => handleExcluirFoto(foto)} sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOrdemVisualizando(null)}>Fechar</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Snackbar para feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Ordens
