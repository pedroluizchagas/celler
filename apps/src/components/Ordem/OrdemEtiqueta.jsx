import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Chip,
  Divider,
} from '@mui/material'
import { Print as PrintIcon, Close as CloseIcon } from '@mui/icons-material'

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

function OrdemEtiqueta({ open, onClose, ordem }) {
  const handlePrint = () => {
    window.print()
  }

  const formatarData = (data) => {
    if (!data) return '-'
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const gerarQRCode = (texto) => {
    // Simulação de QR Code - em produção, usar uma biblioteca como qrcode
    return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
      texto
    )}`
  }

  if (!ordem) return null

  const qrCodeData = `OS:${ordem.id}|Cliente:${ordem.cliente_nome}|Equipamento:${ordem.equipamento}|Status:${ordem.status}`

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Etiqueta - Ordem #{ordem.id}</Typography>
          <Button
            onClick={handlePrint}
            startIcon={<PrintIcon />}
            variant="contained"
            size="small"
          >
            Imprimir
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box className="etiqueta-print">
          {/* Etiqueta Principal */}
          <Box
            sx={{
              border: '2px solid #1976d2',
              borderRadius: 2,
              p: 2,
              mb: 3,
              bgcolor: 'background.paper',
            }}
          >
            {/* Cabeçalho */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Box>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  SAYMON CELL
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Assistência Técnica
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="h4" fontWeight="bold" color="primary">
                  #{ordem.id}
                </Typography>
                <Typography variant="caption">ORDEM DE SERVIÇO</Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* Informações Principais */}
            <Grid container spacing={1} mb={2}>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  CLIENTE:
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight="bold"
                  sx={{ fontSize: '1.1rem' }}
                >
                  {ordem.cliente_nome}
                </Typography>
              </Grid>

              <Grid item xs={8}>
                <Typography variant="body2" color="textSecondary">
                  EQUIPAMENTO:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {ordem.equipamento}
                </Typography>
                {ordem.marca && ordem.modelo && (
                  <Typography variant="body2" color="textSecondary">
                    {ordem.marca} - {ordem.modelo}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  ENTRADA:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatarData(ordem.data_entrada)}
                </Typography>
              </Grid>

              {ordem.numero_serie && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    N° SÉRIE:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {ordem.numero_serie}
                  </Typography>
                </Grid>
              )}

              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  PROBLEMA:
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '0.9rem' }}>
                  {ordem.defeito.length > 100
                    ? `${ordem.defeito.substring(0, 100)}...`
                    : ordem.defeito}
                </Typography>
              </Grid>
            </Grid>

            {/* Status e Prioridade */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Box>
                <Typography variant="body2" color="textSecondary" mb={0.5}>
                  STATUS:
                </Typography>
                <Chip
                  label={statusLabels[ordem.status]}
                  color={statusColors[ordem.status]}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary" mb={0.5}>
                  PRIORIDADE:
                </Typography>
                <Chip
                  label={prioridadeLabels[ordem.prioridade]}
                  color={prioridadeColors[ordem.prioridade]}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
            </Box>

            {/* Técnico e Prazo */}
            <Grid container spacing={1} mb={2}>
              {ordem.tecnico_responsavel && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    TÉCNICO:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {ordem.tecnico_responsavel}
                  </Typography>
                </Grid>
              )}
              {ordem.data_prazo && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    PRAZO:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatarData(ordem.data_prazo)}
                  </Typography>
                </Grid>
              )}
            </Grid>

            {/* QR Code e Contato */}
            <Divider sx={{ my: 1 }} />
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography variant="caption" color="textSecondary">
                  📱 (11) 99999-9999
                </Typography>
                <br />
                <Typography variant="caption" color="textSecondary">
                  📧 contato@saymoncell.com.br
                </Typography>
              </Box>
              <Box textAlign="center">
                <img
                  src={gerarQRCode(qrCodeData)}
                  alt="QR Code"
                  style={{ width: 60, height: 60 }}
                />
                <Typography
                  variant="caption"
                  display="block"
                  color="textSecondary"
                >
                  QR Code
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Etiqueta Pequena (Cópia) */}
          <Box
            sx={{
              border: '1px solid #1976d2',
              borderRadius: 1,
              p: 1,
              bgcolor: 'background.paper',
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Typography variant="h6" fontWeight="bold" color="primary">
                SAYMON CELL
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                #{ordem.id}
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              <strong>Cliente:</strong> {ordem.cliente_nome}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              <strong>Equipamento:</strong> {ordem.equipamento}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              <strong>Entrada:</strong> {formatarData(ordem.data_entrada)}
            </Typography>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mt={1}
            >
              <Chip
                label={statusLabels[ordem.status]}
                color={statusColors[ordem.status]}
                size="small"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
              <Typography variant="caption" color="textSecondary">
                📱 (11) 99999-9999
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          Fechar
        </Button>
        <Button
          onClick={handlePrint}
          startIcon={<PrintIcon />}
          variant="contained"
        >
          Imprimir Etiquetas
        </Button>
      </DialogActions>

      {/* CSS para impressão */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .etiqueta-print,
          .etiqueta-print * {
            visibility: visible;
          }
          .etiqueta-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </Dialog>
  )
}

export default OrdemEtiqueta
