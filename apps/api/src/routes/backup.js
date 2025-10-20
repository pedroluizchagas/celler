import { Router } from 'express'

// Rotas de backup — stubs para desenvolvimento
// Essas rotas retornam dados mockados para evitar 404 no frontend

export const router = Router()

// Listar backups disponíveis
router.get('/', (_req, res) => {
  res.json({
    data: {
      backups: [],
      estatisticas: {
        total: 0,
        completo: 0,
        incremental: 0,
        tamanho_total_bytes: 0,
        ultimo_backup_em: null,
      },
    },
  })
})

// Criar backup completo
router.post('/completo', (_req, res) => {
  res.json({ message: 'Backup completo executado (stub).' })
})

// Criar backup incremental
router.post('/incremental', (_req, res) => {
  res.json({ message: 'Backup incremental executado (stub).' })
})

// Verificar integridade de um backup
router.get('/verificar/:arquivo', (req, res) => {
  res.json({ arquivo: req.params.arquivo, integro: true })
})

// Restaurar backup
router.post('/restaurar/:arquivo', (req, res) => {
  res.json({ message: `Restauração iniciada para ${req.params.arquivo} (stub).` })
})

// Excluir backup
router.delete('/:arquivo', (req, res) => {
  res.json({ message: `Backup ${req.params.arquivo} excluído (stub).` })
})

// Download (stub)
router.get('/download/:arquivo', (req, res) => {
  res.status(501).json({ error: 'Download não implementado em modo stub.' })
})

// Estatísticas
router.get('/estatisticas', (_req, res) => {
  res.json({
    total: 0,
    completo: 0,
    incremental: 0,
    tamanho_total_bytes: 0,
    ultimo_backup_em: null,
  })
})

