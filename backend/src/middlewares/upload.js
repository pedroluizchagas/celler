const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Configuração do storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads')

    // Criar pasta se não existir
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }

    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const extension = path.extname(file.originalname)
    cb(null, 'ordem-' + uniqueSuffix + extension)
  },
})

// Filtro de tipos de arquivo
const fileFilter = (req, file, cb) => {
  // Aceita apenas imagens
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Apenas imagens são permitidas (JPG, PNG, GIF)'), false)
  }
}

// Configuração do upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB por arquivo
    files: 5, // Máximo 5 arquivos por vez
  },
})

// Middleware para upload de múltiplas fotos
const uploadFotos = upload.array('fotos', 5)

// Middleware com tratamento de erros
const handleUpload = (req, res, next) => {
  uploadFotos(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'Arquivo muito grande. Tamanho máximo: 5MB',
        })
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: 'Muitos arquivos. Máximo: 5 fotos por vez',
        })
      }
      return res.status(400).json({
        error: 'Erro no upload: ' + err.message,
      })
    } else if (err) {
      return res.status(400).json({
        error: err.message,
      })
    }

    next()
  })
}

module.exports = {
  handleUpload,
  uploadFotos,
}
