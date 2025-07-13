import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
} from '@mui/material'
import {
  Close as CloseIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material'

const VendaModal = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ShoppingCartIcon color="primary" />
          <Typography variant="h6">Nova Venda</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info">
          <Typography variant="h6" gutterBottom>
            Sistema de Vendas
          </Typography>
          <Typography variant="body2">
            Esta funcionalidade está em desenvolvimento. Em breve você poderá
            registrar vendas diretas diretamente pelo sistema.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default VendaModal
