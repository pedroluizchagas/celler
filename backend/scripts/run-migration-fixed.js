const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

console.log(' Iniciando migração corrigida para Supabase...')

// Verificar configurações
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(' Configurações do Supabase não encontradas!')
  console.error('Verifique as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env')
  process.exit(1)
}

console.log(' Configurações do Supabase encontradas!')

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

function loadSqlFiles() {
  const files = []
  // Somente arquivos simples (schema/views leves) — evitar PL/pgSQL pesados
  const base = path.join(__dirname, '..', 'migrations', 'supabase-migration-fixed.sql')
  if (fs.existsSync(base)) files.push(base)

  const align = path.join(__dirname, '..', 'migrations', 'align_sqlrun_schema.sql')
  if (fs.existsSync(align)) files.push(align)

  // NÃO incluir arquivos com funções PL/pgSQL (ex.: 0004/0005, fix_dashboard_and_products)
  return files
}

function splitSql(sql) {
  // Split ingênuo por ';' mantendo simples e compatível com a função exec
  return sql
    .split(';')
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd.length > 0 && !cmd.startsWith('--'))
    .map((cmd) => cmd + ';')
}

async function executeSqlCommand(command, idx, total) {
  console.log(`\n Executando comando ${idx}/${total}...`)
  console.log(` SQL: ${command.substring(0, 120)}${command.length > 120 ? '...' : ''}`)

  const { error } = await supabase.rpc('exec', { sql: command })
  if (error) {
    console.error(` Erro no comando ${idx}:`, error.message)
    // Tolerar objetos já existentes
    if (
      /already exists|duplicate key|relation .* already exists/i.test(error.message)
    ) {
      console.log(' Objeto já existe, continuando...')
      return true
    }
    return false
  }
  console.log(` Comando ${idx} executado com sucesso!`)
  return true
}

async function executeMigration() {
  try {
    const files = loadSqlFiles()
    console.log(' Arquivos de migração a aplicar:')
    files.forEach((f) => console.log(' -', f))

    let total = 0
    let ok = 0

    for (const file of files) {
      if (!fs.existsSync(file)) {
        console.warn(' Arquivo não encontrado, ignorando:', file)
        continue
      }
      const sql = fs.readFileSync(file, 'utf8')
      const commands = splitSql(sql)
      total += commands.length

      for (let i = 0; i < commands.length; i++) {
        const success = await executeSqlCommand(commands[i], ok + i + 1, total)
        if (success) ok++
        await new Promise((r) => setTimeout(r, 60))
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log(' RESUMO DA MIGRAÇÃO:')
    console.log(` Comandos executados com sucesso: ${ok}`)
    console.log(` Total de comandos processados: ${total}`)

    if (ok === total) {
      console.log('\n MIGRAÇÃO CONCLUÍDA COM SUCESSO!')
    } else {
      console.log('\n MIGRAÇÃO CONCLUÍDA COM ALGUNS ERROS — verifique os logs acima')
    }

    // Verificação rápida de objetos centrais
    console.log('\n Verificando funções do dashboard...')
    const probe = await supabase.rpc('dashboard_resumo_mes', { desde: new Date().toISOString().slice(0, 10) })
    if (probe.error) {
      console.warn(' dashboard_resumo_mes ainda indisponível:', probe.error.message)
    } else {
      console.log(' dashboard_resumo_mes disponível')
    }
  } catch (error) {
    console.error(' Erro geral na migração:', error.message)
    process.exit(1)
  }
}

executeMigration()
  .then(() => {
    console.log('\n🏁 Script de migração finalizado!')
    process.exit(0)
  })
  .catch((error) => {
    console.error(' Erro fatal:', error)
    process.exit(1)
  })