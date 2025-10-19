import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Paper,
  Typography,
  TextField,
  Stack,
  CircularProgress,
  Alert,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material'
import {
  QrCodeScanner as QrCodeScannerIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  CameraAlt as CameraAltIcon,
  Stop as StopIcon,
} from '@mui/icons-material'
import { useQRScanner } from '../../hooks/useQRScanner'

const QuickScannerModal = ({
  open,
  onClose,
  onProductFound,
  title = 'Scanner Rápido',
  subtitle = 'Escaneie ou digite o código do produto',
}) => {
  // Estados locais
  const [manualCode, setManualCode] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  // Hook do scanner
  const {
    isScanning,
    loading,
    error,
    cameras,
    selectedCamera,
    videoRef,
    startScanning,
    stopScanning,
    switchCamera,
    clearError,
    searchByCode,
  } = useQRScanner()

  // Tratar resultado do scan
  const handleScanResult = (produto, success, errorMessage) => {
    if (success && produto) {
      setFeedback({ type: 'success', message: 'Produto encontrado!' })
      setTimeout(() => {
        onProductFound(produto)
        handleClose()
      }, 1000)
    } else {
      setFeedback({
        type: 'error',
        message: errorMessage || 'Produto não encontrado',
      })
      setTimeout(() => setFeedback({ type: '', message: '' }), 3000)
    }
  }

  // Iniciar scanner com callback
  const handleStartScanning = () => {
    startScanning(handleScanResult)
    clearError()
    setFeedback({ type: '', message: '' })
  }

  // Busca manual
  const handleManualSearch = async () => {
    if (!manualCode.trim()) {
      setFeedback({ type: 'warning', message: 'Digite um código para buscar' })
      return
    }

    try {
      await searchByCode(manualCode, handleScanResult)
    } catch (err) {
      setFeedback({ type: 'error', message: err.message })
    }
  }

  // Fechar modal
  const handleClose = () => {
    stopScanning()
    setManualCode('')
    setShowManualInput(false)
    setFeedback({ type: '', message: '' })
    clearError()
    onClose()
  }

  // Determinar altura do diálogo baseado no conteúdo
  const getDialogHeight = () => {
    if (showManualInput) return 'auto'
    return isScanning ? 500 : 350
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          height: getDialogHeight(),
          minHeight: 350,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QrCodeScannerIcon color="primary" />
          <Box>
            <Typography variant="h6">{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Controles */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {!isScanning ? (
              <Button
                variant="contained"
                startIcon={
                  loading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <QrCodeScannerIcon />
                  )
                }
                onClick={handleStartScanning}
                disabled={loading || cameras.length === 0}
                size="small"
              >
                {loading ? 'Iniciando...' : 'Iniciar Scanner'}
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="error"
                startIcon={<StopIcon />}
                onClick={stopScanning}
                size="small"
              >
                Parar
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<SearchIcon />}
              onClick={() => setShowManualInput(!showManualInput)}
              size="small"
            >
              Busca Manual
            </Button>

            {cameras.length > 1 && isScanning && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Câmera</InputLabel>
                <Select
                  value={selectedCamera}
                  onChange={(e) => switchCamera(e.target.value)}
                  label="Câmera"
                >
                  {cameras.map((camera, index) => (
                    <MenuItem key={camera.id} value={camera.id}>
                      Câmera {index + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </Box>

        {/* Entrada Manual */}
        {showManualInput && (
          <Box sx={{ px: 2, pb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Código de Barras ou Código Interno"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
              InputProps={{
                endAdornment: (
                  <Button
                    size="small"
                    onClick={handleManualSearch}
                    disabled={!manualCode.trim()}
                  >
                    Buscar
                  </Button>
                ),
              }}
            />
          </Box>
        )}

        {showManualInput && <Divider />}

        {/* Área do Scanner */}
        <Box sx={{ position: 'relative', minHeight: 250 }}>
          <Paper
            elevation={0}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              bgcolor: 'grey.100',
              minHeight: 250,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Vídeo do Scanner */}
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: 300,
                display: isScanning ? 'block' : 'none',
              }}
            />

            {/* Estado quando não está escaneando */}
            {!isScanning && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  p: 3,
                }}
              >
                <CameraAltIcon
                  sx={{ fontSize: 60, color: 'grey.400', mb: 2 }}
                />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  Scanner Desativado
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Clique em "Iniciar Scanner" ou use a busca manual
                </Typography>
              </Box>
            )}

            {/* Overlay de loading */}
            {loading && isScanning && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  zIndex: 1,
                }}
              >
                <CircularProgress color="primary" />
              </Box>
            )}
          </Paper>
        </Box>

        {/* Feedback */}
        {(feedback.message || error) && (
          <Box sx={{ p: 2, pt: 1 }}>
            {feedback.message && (
              <Alert
                severity={feedback.type}
                size="small"
                onClose={() => setFeedback({ type: '', message: '' })}
              >
                {feedback.message}
              </Alert>
            )}
            {error && !feedback.message && (
              <Alert severity="error" size="small" onClose={clearError}>
                {error}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ flexGrow: 1 }}
        >
          💡 Posicione o código no centro da tela
        </Typography>
        <Button onClick={handleClose}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  )
}

export default QuickScannerModal
