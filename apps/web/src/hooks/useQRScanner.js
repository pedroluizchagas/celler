import { useState, useRef, useEffect, useCallback } from 'react'
import QrScanner from 'qr-scanner'
import { produtoService } from '../services/produtoService'

export const useQRScanner = () => {
  // Estados principais
  const [isScanning, setIsScanning] = useState(false)
  const [scanner, setScanner] = useState(null)
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanHistory, setScanHistory] = useState([])

  // Refs
  const videoRef = useRef(null)

  // Carregar câmeras disponíveis
  const loadCameras = useCallback(async () => {
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
  }, [])

  // Inicializar scanner
  useEffect(() => {
    loadCameras()

    // Cleanup
    return () => {
      if (scanner) {
        scanner.stop()
        scanner.destroy()
      }
    }
  }, [loadCameras])

  // Iniciar scanner
  const startScanning = useCallback(
    async (onResult) => {
      try {
        setError('')
        setLoading(true)

        if (!videoRef.current) {
          throw new Error('Elemento de vídeo não encontrado')
        }

        const qrScanner = new QrScanner(
          videoRef.current,
          (result) => handleScanResult(result.data, onResult),
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
    },
    [selectedCamera]
  )

  // Parar scanner
  const stopScanning = useCallback(() => {
    if (scanner) {
      scanner.stop()
      scanner.destroy()
      setScanner(null)
    }
    setIsScanning(false)
  }, [scanner])

  // Tratar resultado do scan
  const handleScanResult = useCallback(async (code, onResult) => {
    try {
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

        // Chamar callback se fornecido
        if (onResult) {
          onResult(response.data, true)
        }
      } else {
        if (onResult) {
          onResult(null, false, 'Produto não encontrado')
        }
      }

      // Atualizar histórico
      setScanHistory((prev) => [historyItem, ...prev.slice(0, 19)])
    } catch (err) {
      console.error('Erro ao processar código:', err)

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

      if (onResult) {
        onResult(null, false, err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Busca manual por código
  const searchByCode = useCallback(
    async (code, onResult) => {
      if (!code.trim()) {
        throw new Error('Código não fornecido')
      }

      await handleScanResult(code.trim(), onResult)
    },
    [handleScanResult]
  )

  // Trocar câmera
  const switchCamera = useCallback(
    async (cameraId) => {
      if (scanner && isScanning) {
        await scanner.setCamera(cameraId)
        setSelectedCamera(cameraId)
      } else {
        setSelectedCamera(cameraId)
      }
    },
    [scanner, isScanning]
  )

  // Limpar histórico
  const clearHistory = useCallback(() => {
    setScanHistory([])
  }, [])

  // Limpar erro
  const clearError = useCallback(() => {
    setError('')
  }, [])

  return {
    // Estados
    isScanning,
    loading,
    error,
    cameras,
    selectedCamera,
    scanHistory,

    // Refs
    videoRef,

    // Métodos
    startScanning,
    stopScanning,
    switchCamera,
    clearHistory,
    clearError,
    searchByCode,
    loadCameras,
  }
}
