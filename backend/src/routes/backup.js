const express = require('express')
const router = express.Router()
const backupManager = require('../utils/backup')
const logger = require('../utils/logger')

// Listar todos os backups
router.get('/', async (req, res) => {
  try {
    const backups = await backupManager.listarBackups()
    const estatisticas = await backupManager.obterEstatisticas()

    res.json({
      success: true,
      data: {
        backups,
        estatisticas,
      },
    })
  } catch (error) {
    logger.error('Erro ao listar backups:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    })
  }
})

// Criar backup completo manual
router.post('/completo', async (req, res) => {
  try {
    const backup = await backupManager.backupCompleto('manual')

    res.json({
      success: true,
      message: 'Backup completo criado com sucesso',
      data: backup,
    })
  } catch (error) {
    logger.error('Erro ao criar backup completo:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao criar backup completo',
    })
  }
})

// Criar backup incremental manual
router.post('/incremental', async (req, res) => {
  try {
    const backup = await backupManager.backupIncremental()

    res.json({
      success: true,
      message: 'Backup incremental criado com sucesso',
      data: backup,
    })
  } catch (error) {
    logger.error('Erro ao criar backup incremental:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao criar backup incremental',
    })
  }
})

// Verificar integridade de um backup
router.get('/verificar/:arquivo', async (req, res) => {
  try {
    const { arquivo } = req.params
    const resultado = await backupManager.verificarIntegridade(arquivo)

    res.json({
      success: true,
      data: resultado,
    })
  } catch (error) {
    logger.error('Erro ao verificar integridade:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar integridade do backup',
    })
  }
})

// Restaurar backup
router.post('/restaurar/:arquivo', async (req, res) => {
  try {
    const { arquivo } = req.params

    // Verificar integridade antes de restaurar
    const integridade = await backupManager.verificarIntegridade(arquivo)
    if (!integridade.valido) {
      return res.status(400).json({
        success: false,
        error: `Backup inválido: ${integridade.erro}`,
      })
    }

    const resultado = await backupManager.restaurarBackup(arquivo)

    res.json({
      success: true,
      message: 'Backup restaurado com sucesso',
      data: resultado,
    })
  } catch (error) {
    logger.error('Erro ao restaurar backup:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao restaurar backup',
    })
  }
})

// Excluir backup
router.delete('/:arquivo', async (req, res) => {
  try {
    const { arquivo } = req.params
    const resultado = await backupManager.excluirBackup(arquivo)

    res.json({
      success: true,
      message: 'Backup excluído com sucesso',
      data: resultado,
    })
  } catch (error) {
    logger.error('Erro ao excluir backup:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao excluir backup',
    })
  }
})

// Download de backup
router.get('/download/:arquivo', async (req, res) => {
  try {
    const { arquivo } = req.params
    const path = require('path')
    const fs = require('fs')

    const backupPath = path.join(__dirname, '../../backups', arquivo)

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        error: 'Arquivo de backup não encontrado',
      })
    }

    res.download(backupPath, arquivo, (error) => {
      if (error) {
        logger.error('Erro ao fazer download do backup:', error)
        res.status(500).json({
          success: false,
          error: 'Erro ao fazer download do backup',
        })
      }
    })
  } catch (error) {
    logger.error('Erro ao processar download:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    })
  }
})

// Obter estatísticas de backup
router.get('/estatisticas', async (req, res) => {
  try {
    const estatisticas = await backupManager.obterEstatisticas()

    res.json({
      success: true,
      data: estatisticas,
    })
  } catch (error) {
    logger.error('Erro ao obter estatísticas:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao obter estatísticas de backup',
    })
  }
})

module.exports = router
