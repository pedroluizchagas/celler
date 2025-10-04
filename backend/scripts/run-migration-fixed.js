const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

console.log('🚀 Iniciando migração corrigida para Supabase...')

// Verificar configurações
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configurações do Supabase não encontradas!')
  console.error('Verifique as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env')
  process.exit(1)
}

console.log('✅ Configurações do Supabase encontradas!')

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

async function executeMigration() {
  try {
    // Ler arquivo de migração corrigida
    const migrationPath = path.join(__dirname, '..', 'migrations', 'supabase-migration-fixed.sql')
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Arquivo de migração não encontrado: ${migrationPath}`)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    console.log('📄 Arquivo de migração carregado!')

    // Dividir o SQL em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))

    console.log(`📊 Total de comandos SQL a executar: ${commands.length}`)

    let successCount = 0
    let errorCount = 0

    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i] + ';'
      
      try {
        console.log(`\n🔄 Executando comando ${i + 1}/${commands.length}...`)
        console.log(`📝 SQL: ${command.substring(0, 100)}${command.length > 100 ? '...' : ''}`)

        // Executar comando via RPC
        const { data, error } = await supabase.rpc('exec', {
          sql: command
        })

        if (error) {
          console.error(`❌ Erro no comando ${i + 1}:`, error.message)
          errorCount++
          
          // Se for erro de tabela já existente, continuar
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key') ||
              error.message.includes('relation') && error.message.includes('already exists')) {
            console.log('⚠️ Tabela/objeto já existe, continuando...')
            successCount++
          }
        } else {
          console.log(`✅ Comando ${i + 1} executado com sucesso!`)
          successCount++
        }

        // Pequena pausa entre comandos
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (cmdError) {
        console.error(`❌ Erro inesperado no comando ${i + 1}:`, cmdError.message)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 RESUMO DA MIGRAÇÃO:')
    console.log(`✅ Comandos executados com sucesso: ${successCount}`)
    console.log(`❌ Comandos com erro: ${errorCount}`)
    console.log(`📈 Taxa de sucesso: ${((successCount / commands.length) * 100).toFixed(1)}%`)

    if (errorCount === 0) {
      console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!')
    } else if (successCount > errorCount) {
      console.log('\n⚠️ MIGRAÇÃO CONCLUÍDA COM ALGUNS ERROS')
      console.log('Verifique os erros acima e execute novamente se necessário.')
    } else {
      console.log('\n❌ MIGRAÇÃO FALHOU')
      console.log('Muitos erros encontrados. Verifique a configuração do Supabase.')
    }

    // Testar algumas tabelas principais
    console.log('\n🔍 Testando estrutura das tabelas...')
    
    const tablesToTest = ['clientes', 'ordens', 'produtos', 'vendas']
    
    for (const table of tablesToTest) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)

        if (error) {
          console.log(`❌ Erro ao testar tabela ${table}:`, error.message)
        } else {
          console.log(`✅ Tabela ${table} está funcionando!`)
        }
      } catch (testError) {
        console.log(`❌ Erro inesperado ao testar tabela ${table}:`, testError.message)
      }
    }

  } catch (error) {
    console.error('❌ Erro geral na migração:', error.message)
    process.exit(1)
  }
}

// Executar migração
executeMigration()
  .then(() => {
    console.log('\n🏁 Script de migração finalizado!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })