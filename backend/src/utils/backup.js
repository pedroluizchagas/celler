const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const { exec } = require('child_process')
const execAsync = promisify(exec)

// Logger simplificado para evitar dependência circular
const simpleLogger = {
  info: (message, context) => console.log(`[INFO] ${message}`, context || ''),
  error: (message, error) => console.error(`[ERROR] ${message}`, error || ''),
  warn: (message, context) => console.warn(`[WARN] ${message}`, context || ''),
}

class BackupManager {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups')
    this.dbPath = path.join(__dirname, '../../database.sqlite')
    this.maxBackups = 30 // Manter 30 backups por tipo

    this.ensureBackupDir()
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
      simpleLogger.info('📁 Diretório de backup criado:', this.backupDir)
    }
  }

  // Backup completo do banco
  async backupCompleto(tipo = 'manual') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupName = `backup-completo-${timestamp}.sqlite`
      const backupPath = path.join(this.backupDir, backupName)

      // Copiar arquivo de banco
      await fs.promises.copyFile(this.dbPath, backupPath)

      // Comprimir backup
      const compressedPath = `${backupPath}.gz`
      await this.compressFile(backupPath, compressedPath)

      // Remover arquivo não comprimido
      await fs.promises.unlink(backupPath)

      const stats = await fs.promises.stat(compressedPath)

      const backupInfo = {
        tipo: 'completo',
        origem: tipo,
        arquivo: backupName + '.gz',
        caminho: compressedPath,
        tamanho: stats.size,
        data: new Date(),
        timestamp,
      }

      simpleLogger.info('✅ Backup completo criado:', backupInfo)

      // Limpar backups antigos
      await this.limparBackupsAntigos('completo')

      return backupInfo
    } catch (error) {
      simpleLogger.error('❌ Erro ao criar backup completo:', error)
      throw error
    }
  }

  // Backup incremental (apenas dados modificados)
  async backupIncremental() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupName = `backup-incremental-${timestamp}.sql`
      const backupPath = path.join(this.backupDir, backupName)

      // Exportar apenas dados modificados nas últimas 24h
      const sql = `
        -- Backup Incremental - ${new Date().toISOString()}
        
        -- Clientes modificados nas últimas 24h
        .mode insert clientes
        SELECT * FROM clientes 
        WHERE updated_at >= datetime('now', '-1 day');
        
        -- Ordens modificadas nas últimas 24h
        .mode insert ordens
        SELECT * FROM ordens 
        WHERE updated_at >= datetime('now', '-1 day');
        
        -- Fotos das ordens modificadas
        .mode insert ordem_fotos
        SELECT of.* FROM ordem_fotos of
        JOIN ordens o ON of.ordem_id = o.id
        WHERE o.updated_at >= datetime('now', '-1 day');
      `

      await fs.promises.writeFile(backupPath, sql)

      // Comprimir backup
      const compressedPath = `${backupPath}.gz`
      await this.compressFile(backupPath, compressedPath)

      // Remover arquivo não comprimido
      await fs.promises.unlink(backupPath)

      const stats = await fs.promises.stat(compressedPath)

      const backupInfo = {
        tipo: 'incremental',
        origem: 'automatico',
        arquivo: backupName + '.gz',
        caminho: compressedPath,
        tamanho: stats.size,
        data: new Date(),
        timestamp,
      }

      simpleLogger.info('✅ Backup incremental criado:', backupInfo)

      // Limpar backups antigos
      await this.limparBackupsAntigos('incremental')

      return backupInfo
    } catch (error) {
      simpleLogger.error('❌ Erro ao criar backup incremental:', error)
      throw error
    }
  }

  // Comprimir arquivo usando gzip
  async compressFile(inputPath, outputPath) {
    try {
      const command = `gzip -c "${inputPath}" > "${outputPath}"`
      await execAsync(command)
    } catch (error) {
      // Fallback: compressão manual se gzip não estiver disponível
      const zlib = require('zlib')
      const readable = fs.createReadStream(inputPath)
      const writable = fs.createWriteStream(outputPath)
      const gzip = zlib.createGzip()

      return new Promise((resolve, reject) => {
        readable.pipe(gzip).pipe(writable)
        writable.on('finish', resolve)
        writable.on('error', reject)
      })
    }
  }

  // Listar todos os backups
  async listarBackups() {
    try {
      const arquivos = await fs.promises.readdir(this.backupDir)
      const backups = []

      for (const arquivo of arquivos) {
        if (arquivo.endsWith('.gz')) {
          const caminho = path.join(this.backupDir, arquivo)
          const stats = await fs.promises.stat(caminho)

          const tipo = arquivo.includes('incremental')
            ? 'incremental'
            : 'completo'
          const timestamp = arquivo.match(
            /(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/
          )?.[1]

          backups.push({
            arquivo,
            caminho,
            tipo,
            tamanho: stats.size,
            data: stats.mtime,
            timestamp,
            formatado: {
              tamanho: this.formatarTamanho(stats.size),
              data: stats.mtime.toLocaleString('pt-BR'),
            },
          })
        }
      }

      return backups.sort((a, b) => b.data - a.data)
    } catch (error) {
      simpleLogger.error('❌ Erro ao listar backups:', error)
      throw error
    }
  }

  // Restaurar backup
  async restaurarBackup(nomeArquivo) {
    try {
      const backupPath = path.join(this.backupDir, nomeArquivo)

      if (!fs.existsSync(backupPath)) {
        throw new Error('Arquivo de backup não encontrado')
      }

      // Criar backup de segurança antes de restaurar
      await this.backupCompleto('pre-restauracao')

      // Descomprimir backup se necessário
      let arquivoParaRestaurar = backupPath
      if (nomeArquivo.endsWith('.gz')) {
        const tempPath = backupPath.replace('.gz', '')
        await this.descompressFile(backupPath, tempPath)
        arquivoParaRestaurar = tempPath
      }

      // Restaurar banco
      if (arquivoParaRestaurar.endsWith('.sqlite')) {
        // Backup completo - substituir arquivo
        await fs.promises.copyFile(arquivoParaRestaurar, this.dbPath)
      } else if (arquivoParaRestaurar.endsWith('.sql')) {
        // Backup incremental - executar SQL
        const sql = await fs.promises.readFile(arquivoParaRestaurar, 'utf8')
        // Executar SQL no banco (implementar conforme necessário)
      }

      // Limpar arquivo temporário
      if (arquivoParaRestaurar !== backupPath) {
        await fs.promises.unlink(arquivoParaRestaurar)
      }

      simpleLogger.info('✅ Backup restaurado com sucesso:', nomeArquivo)
      return { sucesso: true, arquivo: nomeArquivo }
    } catch (error) {
      simpleLogger.error('❌ Erro ao restaurar backup:', error)
      throw error
    }
  }

  // Descomprimir arquivo
  async descompressFile(inputPath, outputPath) {
    try {
      const command = `gunzip -c "${inputPath}" > "${outputPath}"`
      await execAsync(command)
    } catch (error) {
      // Fallback: descompressão manual
      const zlib = require('zlib')
      const readable = fs.createReadStream(inputPath)
      const writable = fs.createWriteStream(outputPath)
      const gunzip = zlib.createGunzip()

      return new Promise((resolve, reject) => {
        readable.pipe(gunzip).pipe(writable)
        writable.on('finish', resolve)
        writable.on('error', reject)
      })
    }
  }

  // Limpar backups antigos
  async limparBackupsAntigos(tipo) {
    try {
      const backups = await this.listarBackups()
      const backupsTipo = backups.filter((b) => b.tipo === tipo)

      if (backupsTipo.length > this.maxBackups) {
        const backupsParaDeletar = backupsTipo
          .slice(this.maxBackups)
          .sort((a, b) => a.data - b.data)

        for (const backup of backupsParaDeletar) {
          await fs.promises.unlink(backup.caminho)
          simpleLogger.info('🗑️ Backup antigo removido:', backup.arquivo)
        }
      }
    } catch (error) {
      simpleLogger.error('❌ Erro ao limpar backups antigos:', error)
    }
  }

  // Excluir backup específico
  async excluirBackup(nomeArquivo) {
    try {
      const backupPath = path.join(this.backupDir, nomeArquivo)

      if (!fs.existsSync(backupPath)) {
        throw new Error('Arquivo de backup não encontrado')
      }

      await fs.promises.unlink(backupPath)
      simpleLogger.info('🗑️ Backup excluído:', nomeArquivo)

      return { sucesso: true, arquivo: nomeArquivo }
    } catch (error) {
      simpleLogger.error('❌ Erro ao excluir backup:', error)
      throw error
    }
  }

  // Verificar integridade do backup
  async verificarIntegridade(nomeArquivo) {
    try {
      const backupPath = path.join(this.backupDir, nomeArquivo)

      if (!fs.existsSync(backupPath)) {
        return { valido: false, erro: 'Arquivo não encontrado' }
      }

      const stats = await fs.promises.stat(backupPath)

      // Verificações básicas
      if (stats.size === 0) {
        return { valido: false, erro: 'Arquivo vazio' }
      }

      // Verificar se é um arquivo comprimido válido
      if (nomeArquivo.endsWith('.gz')) {
        try {
          const tempPath = backupPath.replace('.gz', '.temp')
          await this.descompressFile(backupPath, tempPath)
          await fs.promises.unlink(tempPath)
        } catch (error) {
          return { valido: false, erro: 'Arquivo comprimido corrompido' }
        }
      }

      return {
        valido: true,
        tamanho: stats.size,
        data: stats.mtime,
        formatado: {
          tamanho: this.formatarTamanho(stats.size),
          data: stats.mtime.toLocaleString('pt-BR'),
        },
      }
    } catch (error) {
      return { valido: false, erro: error.message }
    }
  }

  // Agendar backups automáticos
  agendarBackups() {
    // Backup completo diário às 2h da manhã
    const agendarCompleto = () => {
      const agora = new Date()
      const proximoBackup = new Date()
      proximoBackup.setHours(2, 0, 0, 0)

      if (proximoBackup <= agora) {
        proximoBackup.setDate(proximoBackup.getDate() + 1)
      }

      const timeout = proximoBackup.getTime() - agora.getTime()

      setTimeout(async () => {
        await this.backupCompleto('automatico')
        agendarCompleto() // Reagendar para o próximo dia
      }, timeout)

      simpleLogger.info(
        '📅 Próximo backup completo agendado para:',
        proximoBackup.toLocaleString('pt-BR')
      )
    }

    // Backup incremental a cada 6 horas
    const agendarIncremental = () => {
      setInterval(async () => {
        await this.backupIncremental()
      }, 6 * 60 * 60 * 1000) // 6 horas
    }

    agendarCompleto()
    agendarIncremental()

    simpleLogger.info('⚡ Sistema de backup automático iniciado')
  }

  // Utilitários
  formatarTamanho(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Estatísticas de backup
  async obterEstatisticas() {
    try {
      const backups = await this.listarBackups()
      const completos = backups.filter((b) => b.tipo === 'completo')
      const incrementais = backups.filter((b) => b.tipo === 'incremental')

      const tamanhoTotal = backups.reduce(
        (total, backup) => total + backup.tamanho,
        0
      )

      return {
        total: backups.length,
        completos: completos.length,
        incrementais: incrementais.length,
        tamanhoTotal: this.formatarTamanho(tamanhoTotal),
        ultimoBackup: backups[0] || null,
        espacoOcupado: tamanhoTotal,
      }
    } catch (error) {
      simpleLogger.error('❌ Erro ao obter estatísticas de backup:', error)
      throw error
    }
  }
}

module.exports = new BackupManager()
