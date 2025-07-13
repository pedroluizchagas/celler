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
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
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

function OrdemComprovante({ open, onClose, ordem }) {
  const handlePrint = () => {
    window.print()
  }

  const formatarData = (data) => {
    if (!data) return '-'
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const formatarMoeda = (valor) => {
    if (!valor) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  if (!ordem) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Comprovante - Ordem #{ordem.id}</Typography>
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
        <Box className="comprovante-print" sx={{ p: 2 }}>
          {/* Cabeçalho da Empresa */}
          <Box textAlign="center" mb={3}>
            <Typography variant="h4" fontWeight="bold" color="primary">
              SAYMON CELL
            </Typography>
            <Typography variant="h6" color="textSecondary">
              Assistência Técnica Especializada
            </Typography>
            <Typography variant="body2">
              📱 (11) 99999-9999 | 📧 contato@saymoncell.com.br
            </Typography>
            <Typography variant="body2">
              📍 Rua das Tecnologias, 123 - Centro - São Paulo/SP
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Informações da Ordem */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                ORDEM DE SERVIÇO #{ordem.id}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                Data de Entrada:
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {formatarData(ordem.data_entrada)}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                Status:
              </Typography>
              <Chip
                label={statusLabels[ordem.status]}
                color={statusColors[ordem.status]}
                size="small"
              />
            </Grid>

            {ordem.data_prazo && (
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Prazo Previsto:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatarData(ordem.data_prazo)}
                </Typography>
              </Grid>
            )}

            {ordem.tecnico_responsavel && (
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Técnico Responsável:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {ordem.tecnico_responsavel}
                </Typography>
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Dados do Cliente */}
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              DADOS DO CLIENTE
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <Typography variant="body2" color="textSecondary">
                  Nome:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {ordem.cliente_nome}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="textSecondary">
                  Telefone:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {ordem.cliente_telefone}
                </Typography>
              </Grid>
              {ordem.cliente_email && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    E-mail:
                  </Typography>
                  <Typography variant="body1">{ordem.cliente_email}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Dados do Equipamento */}
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              EQUIPAMENTO
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Equipamento:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {ordem.equipamento}
                </Typography>
              </Grid>
              {ordem.marca && (
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Marca:
                  </Typography>
                  <Typography variant="body1">{ordem.marca}</Typography>
                </Grid>
              )}
              {ordem.modelo && (
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Modelo:
                  </Typography>
                  <Typography variant="body1">{ordem.modelo}</Typography>
                </Grid>
              )}
              {ordem.numero_serie && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    Número de Série:
                  </Typography>
                  <Typography variant="body1">{ordem.numero_serie}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Descrição do Problema */}
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              PROBLEMA RELATADO
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {ordem.defeito}
            </Typography>
            {ordem.descricao && (
              <Box mt={1}>
                <Typography variant="body2" color="textSecondary">
                  Observações:
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {ordem.descricao}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Diagnóstico e Solução */}
          {(ordem.diagnostico || ordem.solucao) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  DIAGNÓSTICO E SOLUÇÃO
                </Typography>
                {ordem.diagnostico && (
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Diagnóstico:
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {ordem.diagnostico}
                    </Typography>
                  </Box>
                )}
                {ordem.solucao && (
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Solução Aplicada:
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {ordem.solucao}
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          )}

          {/* Peças Utilizadas */}
          {ordem.pecas && ordem.pecas.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  PEÇAS UTILIZADAS
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Peça</TableCell>
                        <TableCell align="center">Qtd</TableCell>
                        <TableCell align="right">Valor Unit.</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ordem.pecas.map((peca, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {peca.nome_peca}
                            {peca.codigo_peca && (
                              <Typography
                                variant="caption"
                                display="block"
                                color="textSecondary"
                              >
                                Cód: {peca.codigo_peca}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {peca.quantidade}
                          </TableCell>
                          <TableCell align="right">
                            {formatarMoeda(peca.valor_unitario)}
                          </TableCell>
                          <TableCell align="right" fontWeight="bold">
                            {formatarMoeda(peca.valor_total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </>
          )}

          {/* Valores */}
          <Divider sx={{ my: 2 }} />
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              VALORES
            </Typography>
            <Grid container spacing={2}>
              {ordem.valor_mao_obra && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Mão de Obra:
                  </Typography>
                  <Typography variant="body1">
                    {formatarMoeda(ordem.valor_mao_obra)}
                  </Typography>
                </Grid>
              )}
              {ordem.valor_pecas && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Peças:
                  </Typography>
                  <Typography variant="body1">
                    {formatarMoeda(ordem.valor_pecas)}
                  </Typography>
                </Grid>
              )}
              {ordem.desconto > 0 && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Desconto:
                  </Typography>
                  <Typography variant="body1" color="error">
                    - {formatarMoeda(ordem.desconto)}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Box
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    p: 2,
                    borderRadius: 1,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h6" fontWeight="bold">
                    VALOR TOTAL: {formatarMoeda(ordem.valor_final)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Garantia */}
          {ordem.garantia_dias && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  GARANTIA
                </Typography>
                <Typography variant="body1">
                  Este serviço possui garantia de{' '}
                  <strong>{ordem.garantia_dias} dias</strong> a partir da data
                  de entrega.
                </Typography>
                <Typography variant="body2" color="textSecondary" mt={1}>
                  A garantia cobre apenas o serviço realizado e peças
                  substituídas, não incluindo danos causados por mau uso ou
                  acidentes.
                </Typography>
              </Box>
            </>
          )}

          {/* Observações */}
          {ordem.observacoes && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  OBSERVAÇÕES
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {ordem.observacoes}
                </Typography>
              </Box>
            </>
          )}

          {/* Rodapé */}
          <Divider sx={{ my: 2 }} />
          <Box textAlign="center" mt={3}>
            <Typography variant="body2" color="textSecondary">
              Documento gerado em {new Date().toLocaleString('pt-BR')}
            </Typography>
            <Typography variant="body2" color="textSecondary" mt={1}>
              Saymon Cell - Sua confiança é nossa prioridade
            </Typography>
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
          Imprimir
        </Button>
      </DialogActions>

      {/* CSS para impressão */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .comprovante-print,
          .comprovante-print * {
            visibility: visible;
          }
          .comprovante-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            font-size: 12px;
          }
          .MuiDialog-container {
            position: static !important;
          }
          .MuiDialog-paper {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: none !important;
            max-height: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </Dialog>
  )
}

export default OrdemComprovante
