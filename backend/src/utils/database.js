const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, '../../database.sqlite')

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Erro ao conectar com SQLite:', err.message)
      } else {
        console.log('✅ Conectado ao banco SQLite')
        await this.initTables()
      }
    })
  }

  async initTables() {
    // Tabela de Clientes
    this.db.run(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        telefone TEXT NOT NULL,
        email TEXT,
        endereco TEXT,
        cidade TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Tabela de Ordens de Serviço - Versão básica primeiro
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ordens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        equipamento TEXT NOT NULL,
        defeito TEXT NOT NULL,
        status TEXT DEFAULT 'recebido',
        data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
      )
    `)

    // Executar migrações para adicionar colunas que podem não existir
    await this.runMigrations()

    // Tabela de Fotos das Ordens
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ordem_fotos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ordem_id INTEGER NOT NULL,
        nome_arquivo TEXT NOT NULL,
        caminho TEXT NOT NULL,
        descricao TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ordem_id) REFERENCES ordens (id)
      )
    `)

    // Nova Tabela: Peças Utilizadas
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ordem_pecas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ordem_id INTEGER NOT NULL,
        nome_peca TEXT NOT NULL,
        codigo_peca TEXT,
        quantidade INTEGER NOT NULL DEFAULT 1,
        valor_unitario DECIMAL(10,2),
        valor_total DECIMAL(10,2),
        fornecedor TEXT,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ordem_id) REFERENCES ordens (id)
      )
    `)

    // Nova Tabela: Histórico de Status
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ordem_historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ordem_id INTEGER NOT NULL,
        status_anterior TEXT,
        status_novo TEXT NOT NULL,
        observacoes TEXT,
        usuario TEXT,
        data_alteracao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ordem_id) REFERENCES ordens (id)
      )
    `)

    // Nova Tabela: Serviços Realizados
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ordem_servicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ordem_id INTEGER NOT NULL,
        descricao_servico TEXT NOT NULL,
        tempo_gasto INTEGER, -- em minutos
        valor_servico DECIMAL(10,2),
        tecnico TEXT,
        data_execucao DATETIME DEFAULT CURRENT_TIMESTAMP,
        observacoes TEXT,
        FOREIGN KEY (ordem_id) REFERENCES ordens (id)
      )
    `)

    // ==================== SISTEMA DE ESTOQUE ====================

    // Tabela: Categorias de Produtos
    this.db.run(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        icone TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Tabela: Fornecedores
    this.db.run(`
      CREATE TABLE IF NOT EXISTS fornecedores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cnpj TEXT,
        telefone TEXT,
        email TEXT,
        endereco TEXT,
        cidade TEXT,
        estado TEXT,
        contato_responsavel TEXT,
        observacoes TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Tabela: Produtos (Peças + Acessórios)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        codigo_barras TEXT UNIQUE,
        codigo_interno TEXT UNIQUE,
        categoria_id INTEGER,
        fornecedor_id INTEGER,
        tipo TEXT NOT NULL DEFAULT 'peca', -- 'peca' ou 'acessorio'
        preco_custo DECIMAL(10,2) DEFAULT 0,
        preco_venda DECIMAL(10,2) DEFAULT 0,
        margem_lucro DECIMAL(5,2) DEFAULT 0,
        estoque_atual INTEGER DEFAULT 0,
        estoque_minimo INTEGER DEFAULT 5,
        estoque_maximo INTEGER DEFAULT 100,
        localizacao TEXT, -- Ex: "Prateleira A3"
        observacoes TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias (id),
        FOREIGN KEY (fornecedor_id) REFERENCES fornecedores (id)
      )
    `)

    // Tabela: Movimentações de Estoque
    this.db.run(`
      CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER NOT NULL,
        tipo TEXT NOT NULL, -- 'entrada', 'saida', 'ajuste', 'perda'
        quantidade INTEGER NOT NULL,
        quantidade_anterior INTEGER NOT NULL,
        quantidade_atual INTEGER NOT NULL,
        preco_unitario DECIMAL(10,2),
        valor_total DECIMAL(10,2),
        motivo TEXT NOT NULL, -- 'compra', 'venda', 'os', 'ajuste', 'perda'
        referencia_id INTEGER, -- ID da OS, venda, etc.
        referencia_tipo TEXT, -- 'ordem', 'venda', 'ajuste'
        observacoes TEXT,
        usuario TEXT,
        data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (produto_id) REFERENCES produtos (id)
      )
    `)

    // Tabela: Vendas Diretas (não vinculadas a OS)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS vendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        numero_venda TEXT UNIQUE,
        tipo_pagamento TEXT, -- 'dinheiro', 'cartao', 'pix', 'fiado'
        desconto DECIMAL(10,2) DEFAULT 0,
        valor_total DECIMAL(10,2) NOT NULL,
        observacoes TEXT,
        data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
      )
    `)

    // Tabela: Itens da Venda
    this.db.run(`
      CREATE TABLE IF NOT EXISTS venda_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venda_id INTEGER NOT NULL,
        produto_id INTEGER NOT NULL,
        quantidade INTEGER NOT NULL,
        preco_unitario DECIMAL(10,2) NOT NULL,
        preco_total DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (venda_id) REFERENCES vendas (id),
        FOREIGN KEY (produto_id) REFERENCES produtos (id)
      )
    `)

    // Tabela: Alertas de Estoque
    this.db.run(`
      CREATE TABLE IF NOT EXISTS alertas_estoque (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER NOT NULL,
        tipo TEXT NOT NULL, -- 'estoque_baixo', 'estoque_zero', 'estoque_alto'
        ativo BOOLEAN DEFAULT 1,
        data_alerta DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_resolvido DATETIME,
        FOREIGN KEY (produto_id) REFERENCES produtos (id)
      )
    `)

    // ==================== SISTEMA FINANCEIRO ====================

    // Tabela: Categorias Financeiras
    this.db.run(`
      CREATE TABLE IF NOT EXISTS categorias_financeiras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        tipo TEXT NOT NULL, -- 'receita' ou 'despesa'
        icone TEXT,
        cor TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Tabela: Contas a Pagar
    this.db.run(`
      CREATE TABLE IF NOT EXISTS contas_pagar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descricao TEXT NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        categoria_id INTEGER,
        fornecedor TEXT,
        data_vencimento DATE NOT NULL,
        data_pagamento DATE,
        valor_pago DECIMAL(10,2),
        juros DECIMAL(10,2) DEFAULT 0,
        desconto DECIMAL(10,2) DEFAULT 0,
        multa DECIMAL(10,2) DEFAULT 0,
        status TEXT DEFAULT 'pendente', -- 'pendente', 'pago', 'vencido', 'cancelado'
        forma_pagamento TEXT, -- 'dinheiro', 'cartao', 'pix', 'transferencia', 'boleto'
        numero_documento TEXT,
        observacoes TEXT,
        recorrente BOOLEAN DEFAULT 0,
        tipo_recorrencia TEXT, -- 'mensal', 'anual', 'semanal'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras (id)
      )
    `)

    // Tabela: Contas a Receber
    this.db.run(`
      CREATE TABLE IF NOT EXISTS contas_receber (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descricao TEXT NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        categoria_id INTEGER,
        cliente_id INTEGER,
        ordem_id INTEGER,
        venda_id INTEGER,
        data_vencimento DATE NOT NULL,
        data_recebimento DATE,
        valor_recebido DECIMAL(10,2),
        juros DECIMAL(10,2) DEFAULT 0,
        desconto DECIMAL(10,2) DEFAULT 0,
        multa DECIMAL(10,2) DEFAULT 0,
        status TEXT DEFAULT 'pendente', -- 'pendente', 'recebido', 'vencido', 'cancelado'
        forma_recebimento TEXT, -- 'dinheiro', 'cartao', 'pix', 'transferencia', 'boleto'
        numero_documento TEXT,
        observacoes TEXT,
        recorrente BOOLEAN DEFAULT 0,
        tipo_recorrencia TEXT, -- 'mensal', 'anual', 'semanal'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras (id),
        FOREIGN KEY (cliente_id) REFERENCES clientes (id),
        FOREIGN KEY (ordem_id) REFERENCES ordens (id),
        FOREIGN KEY (venda_id) REFERENCES vendas (id)
      )
    `)

    // Tabela: Movimentações do Fluxo de Caixa
    this.db.run(`
      CREATE TABLE IF NOT EXISTS fluxo_caixa (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL, -- 'entrada' ou 'saida'
        valor DECIMAL(10,2) NOT NULL,
        descricao TEXT NOT NULL,
        categoria_id INTEGER,
        conta_pagar_id INTEGER,
        conta_receber_id INTEGER,
        ordem_id INTEGER,
        venda_id INTEGER,
        cliente_id INTEGER,
        forma_pagamento TEXT NOT NULL, -- 'dinheiro', 'cartao', 'pix', 'transferencia', 'boleto'
        data_movimentacao DATE NOT NULL,
        observacoes TEXT,
        usuario TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras (id),
        FOREIGN KEY (conta_pagar_id) REFERENCES contas_pagar (id),
        FOREIGN KEY (conta_receber_id) REFERENCES contas_receber (id),
        FOREIGN KEY (ordem_id) REFERENCES ordens (id),
        FOREIGN KEY (venda_id) REFERENCES vendas (id),
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
      )
    `)

    // Tabela: Metas Financeiras
    this.db.run(`
      CREATE TABLE IF NOT EXISTS metas_financeiras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        tipo TEXT NOT NULL, -- 'receita', 'lucro', 'vendas'
        valor_meta DECIMAL(10,2) NOT NULL,
        periodo TEXT NOT NULL, -- 'mensal', 'anual', 'trimestral'
        mes INTEGER, -- 1-12 para metas mensais
        ano INTEGER NOT NULL,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // ==================== SISTEMA DE WHATSAPP ====================

    // Tabela: QR Code do WhatsApp
    this.db.run(`
      CREATE TABLE IF NOT EXISTS whatsapp_qr (
        id INTEGER PRIMARY KEY,
        qr_code TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Tabela: Mensagens do WhatsApp
    this.db.run(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        phone_number TEXT NOT NULL,
        contact_name TEXT,
        message_id TEXT UNIQUE,
        direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
        message_type TEXT NOT NULL,
        message_body TEXT,
        timestamp DATETIME NOT NULL,
        is_forwarded BOOLEAN DEFAULT 0,
        has_media BOOLEAN DEFAULT 0,
        chat_name TEXT,
        read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
      )
    `)

    // Coluna read_at já está incluída na criação da tabela acima

    // Tabela: Interações do Bot
    this.db.run(`
      CREATE TABLE IF NOT EXISTS whatsapp_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        phone_number TEXT NOT NULL,
        message_received TEXT NOT NULL,
        message_response TEXT NOT NULL,
        intent TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
      )
    `)

    // Tabela: Fila de Atendimento Humano
    this.db.run(`
      CREATE TABLE IF NOT EXISTS whatsapp_human_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        phone_number TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'attending', 'resolved')),
        assigned_to TEXT,
        priority INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        attended_at DATETIME,
        resolved_at DATETIME,
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
      )
    `)

    // Tabela: Configurações do WhatsApp
    this.db.run(`
      CREATE TABLE IF NOT EXISTS whatsapp_settings (
        id INTEGER PRIMARY KEY,
        business_name TEXT DEFAULT 'Saymon Cell',
        business_phone TEXT DEFAULT '(37) 9 9999-9999',
        business_email TEXT DEFAULT 'contato@saymon-cell.com',
        business_address TEXT DEFAULT '[Endereço da loja]',
        auto_reply_enabled BOOLEAN DEFAULT 1,
        business_hours_start INTEGER DEFAULT 8,
        business_hours_end INTEGER DEFAULT 18,
        business_days TEXT DEFAULT '[1,2,3,4,5,6]',
        welcome_message TEXT DEFAULT 'Bem-vindo à Saymon Cell! Como posso ajudá-lo?',
        away_message TEXT DEFAULT 'No momento estamos fora do horário comercial. Retornaremos em breve!',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Inserir configurações padrão se não existirem
    this.db.run(`
      INSERT OR IGNORE INTO whatsapp_settings (id) VALUES (1)
    `)

    console.log(
      '📁 Tabelas do banco criadas/verificadas (incluindo Estoque e Financeiro)'
    )

    // Inserir dados iniciais se for a primeira execução
    await this.verificarDadosIniciais()
  }

  async verificarDadosIniciais() {
    try {
      // Verificar se já existem categorias
      const categoriasExistentes = await this.get(
        'SELECT COUNT(*) as total FROM categorias'
      )

      if (categoriasExistentes.total === 0) {
        console.log(
          '🌱 Primeira execução detectada - inserindo dados iniciais...'
        )
        const { inserirDadosIniciais } = require('./dadosIniciais')
        await inserirDadosIniciais()
      }
    } catch (error) {
      console.error('❌ Erro ao verificar dados iniciais:', error)
    }
  }

  async runMigrations() {
    console.log('🔄 Executando migrações...')

    // Lista de colunas que devem existir na tabela ordens
    const colunasNecessarias = [
      { nome: 'marca', tipo: 'TEXT' },
      { nome: 'modelo', tipo: 'TEXT' },
      { nome: 'numero_serie', tipo: 'TEXT' },
      { nome: 'descricao', tipo: 'TEXT' },
      { nome: 'diagnostico', tipo: 'TEXT' },
      { nome: 'solucao', tipo: 'TEXT' },
      { nome: 'prioridade', tipo: 'TEXT', default: "'normal'" },
      { nome: 'valor_orcamento', tipo: 'DECIMAL(10,2)' },
      { nome: 'valor_mao_obra', tipo: 'DECIMAL(10,2)' },
      { nome: 'valor_pecas', tipo: 'DECIMAL(10,2)' },
      { nome: 'valor_final', tipo: 'DECIMAL(10,2)' },
      { nome: 'desconto', tipo: 'DECIMAL(10,2)', default: '0' },
      { nome: 'data_prazo', tipo: 'DATETIME' },
      { nome: 'data_finalizacao', tipo: 'DATETIME' },
      { nome: 'tecnico_responsavel', tipo: 'TEXT' },
      { nome: 'observacoes', tipo: 'TEXT' },
      { nome: 'observacoes_internas', tipo: 'TEXT' },
      { nome: 'garantia_dias', tipo: 'INTEGER', default: '90' },
    ]

    try {
      // Verificar quais colunas existem
      const colunas = await this.all('PRAGMA table_info(ordens)')
      const colunasExistentes = colunas.map((col) => col.name)

      console.log(
        `📋 Colunas existentes na tabela ordens: ${colunasExistentes.join(
          ', '
        )}`
      )

      let colunasAdicionadas = 0

      // Adicionar colunas que não existem
      for (const coluna of colunasNecessarias) {
        if (!colunasExistentes.includes(coluna.nome)) {
          let sql = `ALTER TABLE ordens ADD COLUMN ${coluna.nome} ${coluna.tipo}`
          if (coluna.default) {
            sql += ` DEFAULT ${coluna.default}`
          }

          try {
            await this.run(sql)
            console.log(`✅ Coluna '${coluna.nome}' adicionada à tabela ordens`)
            colunasAdicionadas++
          } catch (err) {
            // Se a coluna já existe, o erro é esperado
            if (err.message.includes('duplicate column name')) {
              console.log(`⚠️ Coluna '${coluna.nome}' já existe`)
            } else {
              console.error(
                `❌ Erro ao adicionar coluna '${coluna.nome}':`,
                err.message
              )
            }
          }
        }
      }

      if (colunasAdicionadas > 0) {
        console.log(
          `🎉 ${colunasAdicionadas} colunas foram adicionadas à tabela ordens`
        )
      } else {
        console.log('✅ Todas as colunas necessárias já existem')
      }

      console.log('✅ Migrações concluídas')
    } catch (err) {
      console.error('❌ Erro durante migrações:', err.message)
    }
  }

  // Método para executar queries
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err)
        } else {
          resolve({ id: this.lastID, changes: this.changes })
        }
      })
    })
  }

  // Método para buscar um registro
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  // Método para buscar múltiplos registros
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  // Fechar conexão
  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Erro ao fechar banco:', err.message)
        } else {
          console.log('🔒 Conexão SQLite fechada')
        }
        resolve()
      })
    })
  }
}

module.exports = new Database()
