import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Chip,
  Stack,
} from '@mui/material'
import {
  Save as SaveIcon,
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material'

const MovimentacaoModal = ({ open, produto, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    tipo: 'entrada',
    quantidade: '',
    motivo: '',
    preco_unitario: '',
    observacoes: '',
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (produto && open) {
      setFormData({
        tipo: 'entrada',
        quantidade: '',
        motivo: '',
        preco_unitario: produto.preco_custo || '',
        observacoes: '',
      })
      setErrors({})
    }
  }, [produto, open])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Limpar erro do campo
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.quantidade || formData.quantidade <= 0) {
      newErrors.quantidade = 'Quantidade deve ser maior que zero'
    }

    if (!formData.motivo) {
      newErrors.motivo = 'Motivo é obrigatório'
    }

    if (
      formData.tipo === 'saida' &&
      produto &&
      formData.quantidade > produto.estoque_atual
    ) {
      newErrors.quantidade = `Estoque insuficiente. Disponível: ${produto.estoque_atual}`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      await onSave({
        ...formData,
        quantidade: parseInt(formData.quantidade),
        preco_unitario: parseFloat(formData.preco_unitario) || 0,
      })
    } catch (error) {
      console.error('Erro ao movimentar estoque:', error)
    } finally {
      setLoading(false)
    }
  }

  const tipos = [
    {
      value: 'entrada',
      label: 'Entrada',
      icon: <TrendingUpIcon />,
      color: 'success',
    },
    {
      value: 'saida',
      label: 'Saída',
      icon: <TrendingDownIcon />,
      color: 'error',
    },
    {
      value: 'ajuste',
      label: 'Ajuste',
      icon: <TrendingUpIcon />,
      color: 'info',
    },
    {
      value: 'perda',
      label: 'Perda',
      icon: <TrendingDownIcon />,
      color: 'warning',
    },
  ]

  const motivos = {
    entrada: ['compra', 'devolucao', 'ajuste_inventario', 'transferencia'],
    saida: ['venda', 'uso_os', 'devolucao_fornecedor', 'transferencia'],
    ajuste: ['inventario', 'correcao', 'auditoria'],
    perda: ['avaria', 'roubo', 'vencimento', 'obsolescencia'],
  }

  const getNovoEstoque = () => {
    if (!produto || !formData.quantidade) return produto?.estoque_atual || 0

    const quantidade = parseInt(formData.quantidade) || 0
    const estoqueAtual = produto.estoque_atual

    if (formData.tipo === 'entrada' || formData.tipo === 'ajuste') {
      return estoqueAtual + quantidade
    } else {
      return Math.max(0, estoqueAtual - quantidade)
    }
  }

  if (!produto) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <TrendingUpIcon color="primary" />
          <Typography variant="h6">Movimentar Estoque</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Informações do Produto */}
        <Box mb={3} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="h6" gutterBottom>
            {produto.nome}
          </Typography>
          <Stack direction="row" spacing={1} mb={1}>
            <Chip
              size="small"
              color={produto.tipo === 'peca' ? 'primary' : 'secondary'}
              label={produto.tipo === 'peca' ? 'Peça' : 'Acessório'}
            />
            <Chip
              size="small"
              color={
                produto.estoque_atual <= produto.estoque_minimo
                  ? 'warning'
                  : 'success'
              }
              label={`Estoque: ${produto.estoque_atual}`}
            />
          </Stack>
          {produto.localizacao && (
            <Typography variant="body2" color="textSecondary">
              📍 {produto.localizacao}
            </Typography>
          )}
        </Box>

        <Grid container spacing={2}>
          {/* Tipo de Movimentação */}
          <Grid item xs={12}>
            <FormControl fullWidth error={!!errors.tipo}>
              <InputLabel>Tipo de Movimentação</InputLabel>
              <Select
                value={formData.tipo}
                label="Tipo de Movimentação"
                onChange={(e) => handleChange('tipo', e.target.value)}
              >
                {tipos.map((tipo) => (
                  <MenuItem key={tipo.value} value={tipo.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {tipo.icon}
                      {tipo.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Quantidade */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Quantidade"
              type="number"
              value={formData.quantidade}
              onChange={(e) => handleChange('quantidade', e.target.value)}
              error={!!errors.quantidade}
              helperText={errors.quantidade}
              inputProps={{ min: 1 }}
            />
          </Grid>

          {/* Preço Unitário */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Preço Unitário"
              type="number"
              value={formData.preco_unitario}
              onChange={(e) => handleChange('preco_unitario', e.target.value)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>,
              }}
            />
          </Grid>

          {/* Motivo */}
          <Grid item xs={12}>
            <FormControl fullWidth error={!!errors.motivo}>
              <InputLabel>Motivo</InputLabel>
              <Select
                value={formData.motivo}
                label="Motivo"
                onChange={(e) => handleChange('motivo', e.target.value)}
              >
                {(motivos[formData.tipo] || []).map((motivo) => (
                  <MenuItem key={motivo} value={motivo}>
                    {motivo.replace(/_/g, ' ').toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Observações */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Observações"
              value={formData.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              multiline
              rows={2}
              placeholder="Informações adicionais sobre a movimentação..."
            />
          </Grid>

          {/* Preview do resultado */}
          {formData.quantidade && (
            <Grid item xs={12}>
              <Alert
                severity={
                  formData.tipo === 'entrada' || formData.tipo === 'ajuste'
                    ? 'success'
                    : 'warning'
                }
                sx={{ mt: 1 }}
              >
                <Typography variant="body2">
                  <strong>Resultado da movimentação:</strong>
                </Typography>
                <Typography variant="body2">
                  Estoque atual: {produto.estoque_atual} → Novo estoque:{' '}
                  {getNovoEstoque()}
                </Typography>
                {formData.preco_unitario && (
                  <Typography variant="body2">
                    Valor total: R${' '}
                    {(
                      parseFloat(formData.preco_unitario) *
                      parseInt(formData.quantidade || 0)
                    ).toFixed(2)}
                  </Typography>
                )}
              </Alert>
            </Grid>
          )}

          {/* Aviso sobre integração financeira */}
          {formData.tipo === 'entrada' &&
            formData.motivo === 'compra' &&
            formData.preco_unitario && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>💰 Integração Financeira Automática:</strong>
                  </Typography>
                  <Typography variant="body2">
                    Esta compra será automaticamente registrada como uma Conta a
                    Pagar no módulo financeiro na categoria{' '}
                    <strong>"Compra de Estoque"</strong>, independente da
                    categoria específica do produto.
                  </Typography>
                </Alert>
              </Grid>
            )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={loading}
          color={formData.tipo === 'entrada' ? 'success' : 'primary'}
        >
          {loading ? 'Salvando...' : 'Confirmar Movimentação'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default MovimentacaoModal
