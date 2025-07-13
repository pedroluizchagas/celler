import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material'
import {
  Backup as BackupIcon,
  CloudDownload as DownloadIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  AccountBalance as FinanceIcon,
  Sync as SyncIcon,
} from '@mui/icons-material'
import { backupService } from '../../services/backupService'
import api from '../../services/api'

const Backup = () => {
  const [backups, setBackups] = useState([])
  const [estatisticas, setEstatisticas] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [operacao, setOperacao] = useState(null)
  const [backupSelecionado, setBackupSelecionado] = useState(null)
  const [mensagem, setMensagem] = useState(null)

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const carregarDados = async () => {
    try {
      setLoading(true)
      const response = await backupService.listarBackups()
      setBackups(response.data.backups)
      setEstatisticas(response.data.estatisticas)
    } catch (error) {
      setMensagem({
        tipo: 'error',
        texto: 'Erro ao carregar backups: ' + error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleCriarBackup = async (tipo) => {
    try {
      setProcessando(true)
      let response

      if (tipo === 'completo') {
        response = await backupService.criarBackupCompleto()
      } else {
        response = await backupService.criarBackupIncremental()
      }

      setMensagem({
        tipo: 'success',
        texto: response.message,
      })

      await carregarDados()
    } catch (error) {
      setMensagem({
        tipo: 'error',
        texto: 'Erro ao criar backup: ' + error.message,
      })
    } finally {
      setProcessando(false)
    }
  }

  const handleRestaurarBackup = async () => {
    try {
      setProcessando(true)
      const response = await backupService.restaurarBackup(
        backupSelecionado.arquivo
      )

      setMensagem({
        tipo: 'success',
        texto: response.message,
      })

      setDialogAberto(false)
      await carregarDados()
    } catch (error) {
      setMensagem({
        tipo: 'error',
        texto: 'Erro ao restaurar backup: ' + error.message,
      })
    } finally {
      setProcessando(false)
    }
  }

  const handleExcluirBackup = async () => {
    try {
      setProcessando(true)
      const response = await backupService.excluirBackup(
        backupSelecionado.arquivo
      )

      setMensagem({
        tipo: 'success',
        texto: response.message,
      })

      setDialogAberto(false)
      await carregarDados()
    } catch (error) {
      setMensagem({
        tipo: 'error',
        texto: 'Erro ao excluir backup: ' + error.message,
      })
    } finally {
      setProcessando(false)
    }
  }

  const handleDownloadBackup = (backup) => {
    backupService.downloadBackup(backup.arquivo)
  }

  const handleMigrarVendas = async () => {
    try {
      setProcessando(true)
      setMensagem({
        tipo: 'info',
        texto: 'Migrando vendas para o módulo financeiro...',
      })

      const response = await api.post('/vendas/migrar-financeiro')

      setMensagem({
        tipo: 'success',
        texto: response.data.message,
      })
    } catch (error) {
      setMensagem({
        tipo: 'error',
        texto:
          'Erro na migração: ' + (error.response?.data?.error || error.message),
      })
    } finally {
      setProcessando(false)
    }
  }

  const abrirDialog = (op, backup = null) => {
    setOperacao(op)
    setBackupSelecionado(backup)
    setDialogAberto(true)
  }

  const fecharDialog = () => {
    setDialogAberto(false)
    setOperacao(null)
    setBackupSelecionado(null)
  }

  const formatarTipo = (tipo) => {
    return tipo === 'completo' ? 'Completo' : 'Incremental'
  }

  const getChipColor = (tipo) => {
    return tipo === 'completo' ? 'primary' : 'secondary'
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
            Gerenciamento de Backup
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Gerencie backups automáticos e manuais do sistema
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={carregarDados}
          disabled={processando}
        >
          Atualizar
        </Button>
      </Box>

      {/* Mensagem de feedback */}
      {mensagem && (
        <Alert
          severity={mensagem.tipo}
          sx={{ mb: 3 }}
          onClose={() => setMensagem(null)}
        >
          {mensagem.texto}
        </Alert>
      )}

      {/* Estatísticas */}
      {estatisticas && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <StorageIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    Total de Backups
                  </Typography>
                </Box>
                <Typography variant="h6">{estatisticas.total}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <BackupIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    Completos
                  </Typography>
                </Box>
                <Typography variant="h6">{estatisticas.completos}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <ScheduleIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    Incrementais
                  </Typography>
                </Box>
                <Typography variant="h6">
                  {estatisticas.incrementais}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <StorageIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    Espaço Usado
                  </Typography>
                </Box>
                <Typography variant="h6">
                  {estatisticas.tamanhoTotal}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Botões de ação */}
      <Box>
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
          <Button
            variant="contained"
            startIcon={<BackupIcon />}
            onClick={() => handleCriarBackup('completo')}
            disabled={processando}
            size={isMobile ? 'small' : 'medium'}
          >
            Backup Completo
          </Button>
          <Button
            variant="outlined"
            startIcon={<BackupIcon />}
            onClick={() => handleCriarBackup('incremental')}
            disabled={processando}
            size={isMobile ? 'small' : 'medium'}
          >
            Backup Incremental
          </Button>
          <Button
            variant="text"
            startIcon={<RefreshIcon />}
            onClick={carregarDados}
            disabled={processando}
            size={isMobile ? 'small' : 'medium'}
          >
            Atualizar
          </Button>
        </Stack>
      </Box>

      {/* Seção de Migração Financeira */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <FinanceIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Integração Financeira</Typography>
          </Box>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Migre vendas existentes para o módulo financeiro. Esta operação é
            necessária apenas uma vez para integrar vendas antigas.
          </Typography>
          <Button
            variant="contained"
            color="success"
            startIcon={<SyncIcon />}
            onClick={handleMigrarVendas}
            disabled={processando}
            size={isMobile ? 'small' : 'medium'}
          >
            {processando ? 'Migrando...' : 'Migrar Vendas para Financeiro'}
          </Button>
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      {/* Tabela de backups */}
      <Card className="glass-card">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Backups Disponíveis
          </Typography>

          {backups.length === 0 ? (
            <Typography color="textSecondary" textAlign="center" py={3}>
              Nenhum backup encontrado
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Arquivo</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Tamanho</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.arquivo}>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {backup.arquivo}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={formatarTipo(backup.tipo)}
                          color={getChipColor(backup.tipo)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{backup.formatado?.tamanho}</TableCell>
                      <TableCell>{backup.formatado?.data}</TableCell>
                      <TableCell align="center">
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="center"
                        >
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadBackup(backup)}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Restaurar">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => abrirDialog('restaurar', backup)}
                            >
                              <RestoreIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => abrirDialog('excluir', backup)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação */}
      <Dialog open={dialogAberto} onClose={fecharDialog}>
        <DialogTitle>
          {operacao === 'restaurar' ? 'Restaurar Backup' : 'Excluir Backup'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {operacao === 'restaurar'
              ? `Tem certeza que deseja restaurar o backup "${backupSelecionado?.arquivo}"? Esta ação irá sobrescrever os dados atuais.`
              : `Tem certeza que deseja excluir o backup "${backupSelecionado?.arquivo}"? Esta ação não pode ser desfeita.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharDialog} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={
              operacao === 'restaurar'
                ? handleRestaurarBackup
                : handleExcluirBackup
            }
            color={operacao === 'restaurar' ? 'warning' : 'error'}
            variant="contained"
            disabled={processando}
          >
            {processando ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Backup
