import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material'

function ClienteModal({ open, onClose, cliente = null, onSave }) {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Resetar formulário quando modal abrir/fechar
  useEffect(() => {
    if (open) {
      if (cliente) {
        // Editando cliente existente
        setFormData({
          nome: cliente.nome || '',
          telefone: cliente.telefone || '',
          email: cliente.email || '',
          endereco: cliente.endereco || '',
          cidade: cliente.cidade || '',
        })
      } else {
        // Novo cliente
        setFormData({
          nome: '',
          telefone: '',
          email: '',
          endereco: '',
          cidade: '',
        })
      }
      setError('')
    }
  }, [open, cliente])

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }))
    setError('') // Limpar erro ao digitar
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validações básicas
      if (!formData.nome.trim()) {
        throw new Error('Nome é obrigatório')
      }
      if (!formData.telefone.trim()) {
        throw new Error('Telefone é obrigatório')
      }

      await onSave(formData)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{cliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome *"
                value={formData.nome}
                onChange={handleChange('nome')}
                disabled={loading}
                autoFocus
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefone *"
                value={formData.telefone}
                onChange={handleChange('telefone')}
                disabled={loading}
                placeholder="(11) 99999-9999"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                disabled={loading}
                placeholder="cliente@email.com"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Endereço"
                value={formData.endereco}
                onChange={handleChange('endereco')}
                disabled={loading}
                placeholder="Rua, número, bairro"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cidade"
                value={formData.cidade}
                onChange={handleChange('cidade')}
                disabled={loading}
                placeholder="São Paulo"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Salvando...' : cliente ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ClienteModal
