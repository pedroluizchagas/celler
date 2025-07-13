import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Typography,
  Alert,
  Paper,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
  Stack,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import {
  QrCodeScanner as QrCodeScannerIcon,
  CameraAlt as CameraAltIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Clear as ClearIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  Inventory as InventoryIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import QrScanner from 'qr-scanner'
import { produtoService } from '../../services/produtoService'

const QRCodeScanner = ({ onProductFound }) => {
  // Estados principais
  const [isScanning, setIsScanning] = useState(false)
  const [scanner, setScanner] = useState(null)
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const [lastResult, setLastResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Estados de resultados
  const [scanHistory, setScanHistory] = useState([])
  const [produto, setProduto] = useState(null)
  const [showProductDialog, setShowProductDialog] = useState(false)

  // Estados de entrada manual
  const [manualCode, setManualCode] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)

  // Estados de feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  // Refs
  const videoRef = useRef(null)

  // Carregar câmeras disponíveis ao montar o componente
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const hasCamera = await QrScanner.hasCamera()
        if (hasCamera) {
          const cameraList = await QrScanner.listCameras(true)
          setCameras(cameraList)
          if (cameraList.length > 0) {
            // Preferir câmera traseira se disponível
            const backCamera = cameraList.find(
              (camera) =>
                camera.label.toLowerCase().includes('back') ||
                camera.label.toLowerCase().includes('rear') ||
                camera.label.toLowerCase().includes('environment')
            )
            setSelectedCamera(backCamera ? backCamera.id : cameraList[0].id)
          }
        } else {
          setError('Nenhuma câmera disponível no dispositivo')
        }
      } catch (err) {
        console.error('Erro ao carregar câmeras:', err)
        setError('Erro ao acessar câmeras: ' + err.message)
      }
    }

    loadCameras()

    // Cleanup
    return () => {
      if (scanner) {
        scanner.stop()
        scanner.destroy()
      }
    }
  }, [])

  // Iniciar scanner
  const startScanning = async () => {
    try {
      setError('')
      setLoading(true)

      if (!videoRef.current) {
        throw new Error('Elemento de vídeo não encontrado')
      }

      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => handleScanResult(result.data),
        {
          onDecodeError: (err) => {
            // Ignorar erros comuns de decodificação durante o scan
            if (!err.message.includes('No QR code found')) {
              console.warn('Erro de decodificação:', err)
            }
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          preferredCamera: selectedCamera || 'environment',
        }
      )

      await qrScanner.start()
      setScanner(qrScanner)
      setIsScanning(true)
      setLoading(false)
    } catch (err) {
      console.error('Erro ao iniciar scanner:', err)
      setError('Erro ao iniciar scanner: ' + err.message)
      setLoading(false)
    }
  }

  // Parar scanner
  const stopScanning = () => {
    if (scanner) {
      scanner.stop()
      scanner.destroy()
      setScanner(null)
    }
    setIsScanning(false)
  }

  // Tratar resultado do scan
  const handleScanResult = async (code) => {
    try {
      setLastResult(code)

      // Adicionar ao histórico
      const historyItem = {
        code,
        timestamp: new Date(),
        success: false,
        produto: null,
      }

      // Buscar produto por código
      setLoading(true)
      const response = await produtoService.buscarPorCodigo(code)

      if (response.success && response.data) {
        historyItem.success = true
        historyItem.produto = response.data
        setProduto(response.data)
        setShowProductDialog(true)

        // Notificar callback se existir
        if (onProductFound) {
          onProductFound(response.data)
        }

        showSnackbar('Produto encontrado com sucesso!', 'success')
      } else {
        showSnackbar('Produto não encontrado para este código', 'warning')
      }

      // Atualizar histórico
      setScanHistory((prev) => [historyItem, ...prev.slice(0, 19)]) // Manter apenas 20 itens
    } catch (err) {
      console.error('Erro ao processar código:', err)
      showSnackbar('Erro ao buscar produto: ' + err.message, 'error')

      // Adicionar ao histórico como erro
      setScanHistory((prev) => [
        {
          code,
          timestamp: new Date(),
          success: false,
          error: err.message,
        },
        ...prev.slice(0, 19),
      ])
    } finally {
      setLoading(false)
    }
  }

  // Busca manual por código
  const handleManualSearch = async () => {
    if (!manualCode.trim()) {
      showSnackbar('Digite um código para buscar', 'warning')
      return
    }

    await handleScanResult(manualCode.trim())
    setManualCode('')
    setShowManualInput(false)
  }

  // Trocar câmera
  const switchCamera = async (cameraId) => {
    if (scanner && isScanning) {
      await scanner.setCamera(cameraId)
      setSelectedCamera(cameraId)
    } else {
      setSelectedCamera(cameraId)
    }
  }

  // Mostrar snackbar
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity })
  }

  // Limpar histórico
  const clearHistory = () => {
    setScanHistory([])
    showSnackbar('Histórico limpo', 'info')
  }

  return (
    <Box>
      {/* Cabeçalho */}
      <Typography
        variant="h5"
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <QrCodeScannerIcon color="primary" />
        Scanner de Código de Barras
      </Typography>

      <Grid container spacing={3}>
        {/* Coluna Principal - Scanner */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              {/* Controles do Scanner */}
              <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
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
                    onClick={startScanning}
                    disabled={loading || cameras.length === 0}
                  >
                    {loading ? 'Iniciando...' : 'Iniciar Scanner'}
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={stopScanning}
                  >
                    Parar Scanner
                  </Button>
                )}

                <Button
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={() => setShowManualInput(true)}
                >
                  Busca Manual
                </Button>

                {cameras.length > 1 && (
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Câmera</InputLabel>
                    <Select
                      value={selectedCamera}
                      onChange={(e) => switchCamera(e.target.value)}
                      label="Câmera"
                    >
                      {cameras.map((camera) => (
                        <MenuItem key={camera.id} value={camera.id}>
                          {camera.label ||
                            `Câmera ${cameras.indexOf(camera) + 1}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>

              {/* Área do Scanner */}
              <Paper
                elevation={2}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 2,
                  bgcolor: 'grey.100',
                  minHeight: 300,
                }}
              >
                {/* Vídeo do Scanner */}
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: isScanning ? 'block' : 'none',
                    borderRadius: 8,
                  }}
                />

                {/* Estado quando não está escaneando */}
                {!isScanning && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 300,
                      textAlign: 'center',
                      p: 3,
                    }}
                  >
                    <CameraAltIcon
                      sx={{ fontSize: 80, color: 'grey.400', mb: 2 }}
                    />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      Scanner Desativado
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Clique em "Iniciar Scanner" para começar a escanear
                      códigos
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

              {/* Último resultado */}
              {lastResult && (
                <Alert
                  severity="info"
                  sx={{ mt: 2 }}
                  action={
                    <IconButton
                      size="small"
                      onClick={() => setLastResult(null)}
                    >
                      <CloseIcon />
                    </IconButton>
                  }
                >
                  <Typography variant="body2">
                    <strong>Último código escaneado:</strong> {lastResult}
                  </Typography>
                </Alert>
              )}

              {/* Erro */}
              {error && (
                <Alert
                  severity="error"
                  sx={{ mt: 2 }}
                  action={
                    <IconButton size="small" onClick={() => setError('')}>
                      <CloseIcon />
                    </IconButton>
                  }
                >
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Coluna Lateral - Histórico */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'between',
                  mb: 2,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <HistoryIcon />
                  Histórico de Scans
                </Typography>
                {scanHistory.length > 0 && (
                  <IconButton
                    size="small"
                    onClick={clearHistory}
                    title="Limpar histórico"
                  >
                    <ClearIcon />
                  </IconButton>
                )}
              </Box>

              {scanHistory.length === 0 ? (
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ textAlign: 'center', py: 3 }}
                >
                  Nenhum código escaneado ainda
                </Typography>
              ) : (
                <List dense>
                  {scanHistory.map((item, index) => (
                    <div key={index}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              {item.success ? (
                                <CheckCircleIcon
                                  color="success"
                                  fontSize="small"
                                />
                              ) : (
                                <ErrorIcon color="error" fontSize="small" />
                              )}
                              <Typography variant="body2" noWrap>
                                {item.code}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                {item.timestamp.toLocaleTimeString()}
                              </Typography>
                              {item.produto && (
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="primary"
                                >
                                  {item.produto.nome}
                                </Typography>
                              )}
                              {item.error && (
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="error"
                                >
                                  {item.error}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        {item.produto && (
                          <ListItemSecondaryAction>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setProduto(item.produto)
                                setShowProductDialog(true)
                              }}
                            >
                              <InventoryIcon fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                      {index < scanHistory.length - 1 && <Divider />}
                    </div>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          {/* Dicas */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                💡 Dicas de Uso
              </Typography>
              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Posicione o código no centro da tela"
                    secondary="O scanner destacará automaticamente os códigos detectados"
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Iluminação adequada"
                    secondary="Certifique-se de ter boa iluminação para melhor leitura"
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Distância ideal"
                    secondary="Mantenha o código a 10-15cm da câmera"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog - Entrada Manual */}
      <Dialog
        open={showManualInput}
        onClose={() => setShowManualInput(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Busca Manual por Código</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Código de Barras ou Código Interno"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowManualInput(false)}>Cancelar</Button>
          <Button onClick={handleManualSearch} variant="contained">
            Buscar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog - Produto Encontrado */}
      <Dialog
        open={showProductDialog}
        onClose={() => setShowProductDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon color="success" />
          Produto Encontrado
        </DialogTitle>
        <DialogContent>
          {produto && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    {produto.nome}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    gutterBottom
                  >
                    {produto.descricao}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Chip
                      label={produto.categoria_nome || 'Categoria não definida'}
                      color="primary"
                      size="small"
                    />
                    <Chip
                      label={produto.tipo === 'peca' ? 'Peça' : 'Acessório'}
                      variant="outlined"
                      size="small"
                    />
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Informações do Estoque
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2">Estoque Atual:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {produto.estoque_atual} unidades
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2">Preço de Venda:</Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="primary"
                      >
                        R$ {Number(produto.preco_venda || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    {produto.localizacao && (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography variant="body2">Localização:</Typography>
                        <Typography variant="body2">
                          {produto.localizacao}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {produto.codigo_barras && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Código de Barras:</strong> {produto.codigo_barras}
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProductDialog(false)}>Fechar</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowProductDialog(false)
              // Aqui você pode adicionar lógica para editar o produto ou outras ações
            }}
            startIcon={<AddIcon />}
          >
            Usar Produto
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  )
}

export default QRCodeScanner
