import multer from 'multer'

const MB = 1024 * 1024
const MAX_SIZE = 5 * MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

const storage = multer.memoryStorage()

export const uploadFotos = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new Error('Tipo de arquivo não permitido'))
    }
    cb(null, true)
  },
})

