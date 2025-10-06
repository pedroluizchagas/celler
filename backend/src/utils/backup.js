const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const { exec } = require('child_process')
const execAsync = promisify(exec)
const supabase = require('./supabase')

// Logger simplificado para evitar dependência circular
const simpleLogger = {
  info: (message, context) => console.log(`[INFO] ${message}`, context || ''),
  error: (message, error) => console.error(`[ERROR] ${message}`, error || ''),
  warn: (message, context) => console.warn(`[WARN] ${message}`, context || ''),
}

class BackupManager {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups')
    this.maxBackups = 30 // Manter 30 backups por tipo

    this.ensureBackupDir()
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
      simpleLogger.info('📁 Diretório de backup criado:', this.backupDir)
    }
  }

  // Backup completo do banco Supabase
  async backupCompleto(tipo = 'manual') {
    try {
      if (!supabase.isReady()) {
        throw new Error('Supabase não está configurado')
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupName = `backup-completo-${timestamp}.json`
      const backupPath = path.join(this.backupDir, backupName)

      simpleLogger.info('🔄 Iniciando backup completo do Supabase...')

      // Lista de tabelas para backup
      const tabelas = [
        'clientes',
        'ordens',
        'produtos',
        'categorias',
        'movimentacoes_financeiras',
        'categorias_financeiras',
        // Tabelas WhatsApp removidas do sistema
      ]

      const backupData = {
        timestamp: new Date().toISOString(),
        tipo: 'completo',
        database: 'supabase',
        tabelas: {}
      }

      // Fazer backup de cada tabela
      for (const tabela of tabelas) {
        try {
          const dados = await supabase.query(`SELECT * FROM ${tabela}`, [])
          backupData.tabelas[tabela] = dados
          simpleLogger.info(`✅ Backup da tabela ${tabela}: ${dados.length} registros`)
        } catch (error) {
          simpleLogger.warn(`⚠️ Erro no backup da tabela ${tabela}:`, error.message)
          backupData.tabelas[tabela] = []
        }
      }

      // Salvar backup em arquivo JSON
      await fs.promises.writeFile(backupPath, JSON.stringify(backupData, null, 2))

      // Comprimir backup
      const compressedPath = `${backupPath}.gz`
      await this.compressFile(backupPath, compressedPath)

      // Remover arquivo não comprimido
      await fs.promises.unlink(backupPath)

      const stats = await fs.promises.stat(compressedPath)

      const backupInfo = {
        tipo: 'completo',
        arquivo: path.basename(compressedPath),
        caminho: compressedPath,
        tamanho: stats.size,
        timestamp: new Date().toISOString(),
        tabelas: Object.keys(backupData.tabelas).length,
        registros: Object.values(backupData.tabelas).reduce((total, dados) => total + dados.length, 0)
      }

      simpleLogger.info('✅ Backup completo criado:', backupInfo)

      // Limpar backups antigos
      await this.limparBackupsAntigos('completo')

      return backupInfo
    } catch (error) {
      simpleLogger.error('❌ Erro no backup completo:', error)
      throw error
    }
  }

  // Backup incremental (apenas dados modificados recentemente)
  async backupIncremental() {
    try {
      if (!supabase.isReady()) {
        throw new Error('Supabase não está configurado')
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupName = `backup-incremental-${timestamp}.json`
      const backupPath = path.join(this.backupDir, backupName)

      simpleLogger.info('🔄 Iniciando backup incremental do Supabase...')

      // Data de 24 horas atrás para backup incremental
      const dataLimite = new Date()
      dataLimite.setHours(dataLimite.getHours() - 24)
      const dataLimiteISO = dataLimite.toISOString()

      const backupData = {
        timestamp: new Date().toISOString(),
        tipo: 'incremental',
        database: 'supabase',
        dataLimite: dataLimiteISO,
        tabelas: {}
      }

      // Tabelas com campos de data para backup incremental
      const tabelasComData = [
        { nome: 'clientes', campoData: 'updated_at' },
        { nome: 'ordens', campoData: 'updated_at' },
        { nome: 'produtos', campoData: 'updated_at' },
        { nome: 'movimentacoes_financeiras', campoData: 'created_at' },
        // Tabela WhatsApp removida do sistema
      ]

      // Fazer backup incremental de cada tabela
      for (const { nome, campoData } of tabelasComData) {
        try {
          const dados = await supabase.query(
            `SELECT * FROM ${nome} WHERE ${campoData} >= $1`,
            [dataLimiteISO]
          )
          backupData.tabelas[nome] = dados
          simpleLogger.info(`✅ Backup incremental da tabela ${nome}: ${dados.length} registros`)
        } catch (error) {
          simpleLogger.warn(`⚠️ Erro no backup incremental da tabela ${nome}:`, error.message)
          backupData.tabelas[nome] = []
        }
      }

      // Salvar backup em arquivo JSON
      await fs.promises.writeFile(backupPath, JSON.stringify(backupData, null, 2))

      // Comprimir backup
      const compressedPath = `${backupPath}.gz`
      await this.compressFile(backupPath, compressedPath)

      // Remover arquivo não comprimido
      await fs.promises.unlink(backupPath)

      const stats = await fs.promises.stat(compressedPath)

      const backupInfo = {
        tipo: 'incremental',
        arquivo: path.basename(compressedPath),
        caminho: compressedPath,
        tamanho: stats.size,
        timestamp: new Date().toISOString(),
        dataLimite: dataLimiteISO,
        tabelas: Object.keys(backupData.tabelas).length,
        registros: Object.values(backupData.tabelas).reduce((total, dados) => total + dados.length, 0)
      }

      simpleLogger.info('✅ Backup incremental criado:', backupInfo)

      // Limpar backups antigos
      await this.limparBackupsAntigos('incremental')

      return backupInfo
    } catch (error) {
      simpleLogger.error('❌ Erro no backup incremental:', error)
      throw error
    }
  }

  // Comprimir arquivo usando gzip
  async compressFile(inputPath, outputPath) {
    try {
      const command = process.platform === 'win32' 
        ? `powershell -Command "& {Get-Content '${inputPath}' | Out-String | ForEach-Object {[System.Text.Encoding]::UTF8.GetBytes($_)} | Set-Content -Path '${outputPath}' -Encoding Byte}"`
        : `gzip -c "${inputPath}" > "${outputPath}"`
      
      await execAsync(command)
      simpleLogger.info('✅ Arquivo comprimido:', outputPath)
    } catch (error) {
      simpleLogger.warn('⚠️ Erro na compressão, mantendo arquivo original:', error.message)
      // Se falhar a compressão, manter o arquivo original
      await fs.promises.copyFile(inputPath, outputPath.replace('.gz', ''))
    }
  }

  // Verificar integridade do backup
  async verificarIntegridade(nomeArquivo) {
    try {
      const backupPath = path.join(this.backupDir, nomeArquivo)
      
      if (!fs.existsSync(backupPath)) {
        throw new Error('Arquivo de backup não encontrado')
      }

      const stats = await fs.promises.stat(backupPath)
      
      // Verificações básicas
      const integridade = {
        arquivo: nomeArquivo,
        existe: true,
        tamanho: stats.size,
        dataModificacao: stats.mtime,
        legivel: true,
        valido: true
      }

      // Tentar ler o arquivo para verificar se não está corrompido
      try {
        if (nomeArquivo.endsWith('.gz')) {
          // Para arquivos comprimidos, apenas verificar se existem
          integridade.comprimido = true
        } else {
          // Para arquivos JSON, tentar fazer parse
          const conteudo = await fs.promises.readFile(backupPath, 'utf8')
          const dados = JSON.parse(conteudo)
          integridade.formato = 'json'
          integridade.tabelas = Object.keys(dados.tabelas || {}).length
        }
      } catch (error) {
        integridade.legivel = false
        integridade.valido = false
        integridade.erro = error.message
      }

      return integridade
    } catch (error) {
      return {
        arquivo: nomeArquivo,
        existe: false,
        valido: false,
        erro: error.message
      }
    }
  }

  // Restaurar backup (funcionalidade limitada para Supabase)
  async restaurarBackup(nomeArquivo) {
    try {
      simpleLogger.warn('⚠️ Restauração de backup para Supabase não implementada por segurança')
      simpleLogger.info('💡 Para restaurar dados no Supabase, use o painel administrativo ou scripts específicos')
      
      return {
        success: false,
        message: 'Restauração automática não disponível para Supabase',
        recomendacao: 'Use o painel do Supabase ou scripts específicos para restauração'
      }
    } catch (error) {
      simpleLogger.error('❌ Erro na restauração:', error)
      throw error
    }
  }

  // Excluir backup
  async excluirBackup(nomeArquivo) {
    try {
      const backupPath = path.join(this.backupDir, nomeArquivo)
      
      if (!fs.existsSync(backupPath)) {
        throw new Error('Arquivo de backup não encontrado')
      }

      await fs.promises.unlink(backupPath)
      simpleLogger.info('🗑️ Backup excluído:', nomeArquivo)

      return {
        success: true,
        message: 'Backup excluído com sucesso'
      }
    } catch (error) {
      simpleLogger.error('❌ Erro ao excluir backup:', error)
      throw error
    }
  }

  // Listar todos os backups
  async listarBackups() {
    try {
      const arquivos = await fs.promises.readdir(this.backupDir)
      const backups = []

      for (const arquivo of arquivos) {
        if (arquivo.includes('backup-')) {
          const backupPath = path.join(this.backupDir, arquivo)
          const stats = await fs.promises.stat(backupPath)
          
          backups.push({
            nome: arquivo,
            tamanho: stats.size,
            dataModificacao: stats.mtime,
            tipo: arquivo.includes('completo') ? 'completo' : 'incremental'
          })
        }
      }

      // Ordenar por data de modificação (mais recente primeiro)
      backups.sort((a, b) => new Date(b.dataModificacao) - new Date(a.dataModificacao))

      return backups
    } catch (error) {
      simpleLogger.error('❌ Erro ao listar backups:', error)
      return []
    }
  }

  // Obter estatísticas dos backups
  async obterEstatisticas() {
    try {
      const backups = await this.listarBackups()
      
      const estatisticas = {
        total: backups.length,
        completos: backups.filter(b => b.tipo === 'completo').length,
        incrementais: backups.filter(b => b.tipo === 'incremental').length,
        tamanhoTotal: backups.reduce((total, backup) => total + backup.tamanho, 0),
        ultimoBackup: backups.length > 0 ? backups[0].dataModificacao : null
      }

      return estatisticas
    } catch (error) {
      simpleLogger.error('❌ Erro ao obter estatísticas:', error)
      return {
        total: 0,
        completos: 0,
        incrementais: 0,
        tamanhoTotal: 0,
        ultimoBackup: null
      }
    }
  }

  // Limpar backups antigos
  async limparBackupsAntigos(tipo) {
    try {
      const backups = await this.listarBackups()
      const backupsTipo = backups.filter(b => b.tipo === tipo)

      if (backupsTipo.length > this.maxBackups) {
        const backupsParaRemover = backupsTipo.slice(this.maxBackups)
        
        for (const backup of backupsParaRemover) {
          await this.excluirBackup(backup.nome)
        }

        simpleLogger.info(`🧹 ${backupsParaRemover.length} backups antigos do tipo ${tipo} removidos`)
      }
    } catch (error) {
      simpleLogger.error('❌ Erro ao limpar backups antigos:', error)
    }
  }

  // Agendar backups automáticos
  agendarBackups() {
    simpleLogger.info('📅 Sistema de backup automático iniciado para Supabase')
    
    // Backup completo diário às 2:00
    const agendarBackupCompleto = () => {
      const agora = new Date()
      const proximoBackup = new Date()
      proximoBackup.setHours(2, 0, 0, 0)
      
      if (proximoBackup <= agora) {
        proximoBackup.setDate(proximoBackup.getDate() + 1)
      }
      
      const tempoAteProximo = proximoBackup.getTime() - agora.getTime()
      
      setTimeout(async () => {
        try {
          await this.backupCompleto('automatico')
          simpleLogger.info('✅ Backup completo automático realizado')
        } catch (error) {
          simpleLogger.error('❌ Erro no backup completo automático:', error)
        }
        
        // Reagendar para o próximo dia
        agendarBackupCompleto()
      }, tempoAteProximo)
      
      simpleLogger.info(`⏰ Próximo backup completo agendado para: ${proximoBackup.toLocaleString()}`)
    }

    // Backup incremental a cada 6 horas
    const agendarBackupIncremental = () => {
      setInterval(async () => {
        try {
          await this.backupIncremental()
          simpleLogger.info('✅ Backup incremental automático realizado')
        } catch (error) {
          simpleLogger.error('❌ Erro no backup incremental automático:', error)
        }
      }, 6 * 60 * 60 * 1000) // 6 horas em milissegundos
    }

    agendarBackupCompleto()
    agendarBackupIncremental()
  }
}

module.exports = new BackupManager()
