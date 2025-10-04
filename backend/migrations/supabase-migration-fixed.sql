-- ===========================================
-- MIGRAÇÃO CORRIGIDA PARA SUPABASE (PostgreSQL)
-- Sistema Saymon Cell - Assistência Técnica
-- VERSÃO CORRIGIDA - USA SERIAL EM VEZ DE UUID
-- ===========================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- 1. TABELA DE CLIENTES
-- ===========================================
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    endereco TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);

-- ===========================================
-- 2. SISTEMA DE ESTOQUE (CRIADO PRIMEIRO PARA FOREIGN KEYS)
-- ===========================================

-- Categorias de produtos
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    descricao TEXT,
    icone VARCHAR(50),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produtos (peças e acessórios)
CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    codigo_barras VARCHAR(255) UNIQUE,
    codigo_interno VARCHAR(255) UNIQUE,
    categoria_id INTEGER REFERENCES categorias(id),
    tipo VARCHAR(50) DEFAULT 'peca' CHECK (tipo IN ('peca', 'acessorio', 'servico')),
    preco_custo DECIMAL(10,2) DEFAULT 0,
    preco_venda DECIMAL(10,2) DEFAULT 0,
    margem_lucro DECIMAL(5,2) DEFAULT 0,
    estoque_atual INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 0,
    estoque_maximo INTEGER DEFAULT 0,
    localizacao VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    quantidade INTEGER NOT NULL,
    quantidade_anterior INTEGER NOT NULL,
    quantidade_atual INTEGER NOT NULL,
    preco_unitario DECIMAL(10,2) DEFAULT 0,
    valor_total DECIMAL(10,2) DEFAULT 0,
    motivo VARCHAR(255),
    observacoes TEXT,
    usuario VARCHAR(255),
    referencia_id INTEGER,
    referencia_tipo VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alertas de estoque
CREATE TABLE IF NOT EXISTS alertas_estoque (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('estoque_baixo', 'estoque_zero', 'estoque_alto')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolvido_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(produto_id, tipo)
);

-- ===========================================
-- 3. TABELAS DE ORDENS DE SERVIÇO
-- ===========================================

-- Tabela principal de ordens
CREATE TABLE IF NOT EXISTS ordens (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    equipamento VARCHAR(255) NOT NULL,
    modelo VARCHAR(255),
    defeito_relatado TEXT NOT NULL,
    observacoes TEXT,
    status VARCHAR(50) DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'em_andamento', 'aguardando_peca', 'pronto', 'entregue', 'cancelado')),
    valor_orcamento DECIMAL(10,2) DEFAULT 0,
    valor_final DECIMAL(10,2) DEFAULT 0,
    data_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_previsao TIMESTAMP WITH TIME ZONE,
    data_conclusao TIMESTAMP WITH TIME ZONE,
    data_entrega TIMESTAMP WITH TIME ZONE,
    tecnico_responsavel VARCHAR(255),
    prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fotos das ordens
CREATE TABLE IF NOT EXISTS ordem_fotos (
    id SERIAL PRIMARY KEY,
    ordem_id INTEGER NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'entrada' CHECK (tipo IN ('entrada', 'durante', 'final')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Peças utilizadas nas ordens
CREATE TABLE IF NOT EXISTS ordem_pecas (
    id SERIAL PRIMARY KEY,
    ordem_id INTEGER NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
    nome_peca VARCHAR(255) NOT NULL,
    codigo_peca VARCHAR(255),
    quantidade INTEGER NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10,2) DEFAULT 0,
    valor_total DECIMAL(10,2) DEFAULT 0,
    fornecedor VARCHAR(255),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Histórico das ordens
CREATE TABLE IF NOT EXISTS ordem_historico (
    id SERIAL PRIMARY KEY,
    ordem_id INTEGER NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50) NOT NULL,
    observacoes TEXT,
    usuario VARCHAR(255),
    data_alteracao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Serviços realizados nas ordens
CREATE TABLE IF NOT EXISTS ordem_servicos (
    id SERIAL PRIMARY KEY,
    ordem_id INTEGER NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
    descricao_servico TEXT NOT NULL,
    tempo_gasto INTEGER, -- em minutos
    valor_servico DECIMAL(10,2) DEFAULT 0,
    tecnico VARCHAR(255),
    data_execucao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observacoes TEXT
);

-- ===========================================
-- 4. SISTEMA DE VENDAS
-- ===========================================

-- Vendas
CREATE TABLE IF NOT EXISTS vendas (
    id SERIAL PRIMARY KEY,
    numero_venda VARCHAR(50) UNIQUE NOT NULL,
    cliente_id INTEGER REFERENCES clientes(id),
    data_venda TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subtotal DECIMAL(10,2) DEFAULT 0,
    desconto DECIMAL(10,2) DEFAULT 0,
    valor_total DECIMAL(10,2) DEFAULT 0,
    tipo_pagamento VARCHAR(50) DEFAULT 'dinheiro',
    status VARCHAR(20) DEFAULT 'finalizada' CHECK (status IN ('orcamento', 'finalizada', 'cancelada')),
    observacoes TEXT,
    vendedor VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itens das vendas
CREATE TABLE IF NOT EXISTS venda_itens (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id),
    nome_produto VARCHAR(255) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(10,2) NOT NULL,
    preco_total DECIMAL(10,2) NOT NULL,
    desconto_item DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- 5. SISTEMA FINANCEIRO
-- ===========================================

-- Categorias financeiras
CREATE TABLE IF NOT EXISTS categorias_financeiras (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    descricao TEXT,
    cor VARCHAR(7) DEFAULT '#000000',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contas a receber
CREATE TABLE IF NOT EXISTS contas_receber (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorias_financeiras(id),
    cliente_id INTEGER REFERENCES clientes(id),
    ordem_id INTEGER REFERENCES ordens(id),
    venda_id INTEGER REFERENCES vendas(id),
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_recebimento DATE,
    numero_documento VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'vencido', 'cancelado')),
    forma_recebimento VARCHAR(50),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contas a pagar
CREATE TABLE IF NOT EXISTS contas_pagar (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorias_financeiras(id),
    fornecedor VARCHAR(255),
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
    forma_pagamento VARCHAR(50),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fluxo de caixa
CREATE TABLE IF NOT EXISTS fluxo_caixa (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    categoria_id INTEGER REFERENCES categorias_financeiras(id),
    cliente_id INTEGER REFERENCES clientes(id),
    ordem_id INTEGER REFERENCES ordens(id),
    venda_id INTEGER REFERENCES vendas(id),
    conta_receber_id INTEGER REFERENCES contas_receber(id),
    conta_pagar_id INTEGER REFERENCES contas_pagar(id),
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_movimentacao DATE NOT NULL,
    forma_pagamento VARCHAR(50),
    observacoes TEXT,
    usuario VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metas financeiras
CREATE TABLE IF NOT EXISTS metas_financeiras (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa', 'lucro')),
    valor_meta DECIMAL(10,2) NOT NULL,
    periodo VARCHAR(20) NOT NULL CHECK (periodo IN ('mensal', 'trimestral', 'semestral', 'anual')),
    mes_referencia INTEGER,
    ano_referencia INTEGER NOT NULL,
    valor_atual DECIMAL(10,2) DEFAULT 0,
    percentual_atingido DECIMAL(5,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- 6. SISTEMA WHATSAPP
-- ===========================================

-- Configurações do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QR Code do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_qr (
    id SERIAL PRIMARY KEY,
    qr_code TEXT,
    qr_base64 TEXT,
    status VARCHAR(50) DEFAULT 'disconnected',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mensagens do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    chat_id VARCHAR(255) NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20),
    message_type VARCHAR(50) DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    timestamp_sent TIMESTAMP WITH TIME ZONE,
    timestamp_received TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_from_me BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'received',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fila de atendimento humano
CREATE TABLE IF NOT EXISTS whatsapp_human_queue (
    id SERIAL PRIMARY KEY,
    chat_id VARCHAR(255) NOT NULL,
    customer_number VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'resolved', 'cancelled')),
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ===========================================
-- 7. TRIGGERS PARA UPDATED_AT
-- ===========================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para todas as tabelas com updated_at
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ordens_updated_at BEFORE UPDATE ON ordens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_financeiras_updated_at BEFORE UPDATE ON categorias_financeiras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contas_receber_updated_at BEFORE UPDATE ON contas_receber FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contas_pagar_updated_at BEFORE UPDATE ON contas_pagar FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metas_financeiras_updated_at BEFORE UPDATE ON metas_financeiras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_settings_updated_at BEFORE UPDATE ON whatsapp_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_qr_updated_at BEFORE UPDATE ON whatsapp_qr FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_human_queue_updated_at BEFORE UPDATE ON whatsapp_human_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 8. ÍNDICES PARA PERFORMANCE
-- ===========================================

-- Índices para ordens
CREATE INDEX IF NOT EXISTS idx_ordens_cliente_id ON ordens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordens_status ON ordens(status);
CREATE INDEX IF NOT EXISTS idx_ordens_data_entrada ON ordens(data_entrada);
CREATE INDEX IF NOT EXISTS idx_ordens_tecnico ON ordens(tecnico_responsavel);

-- Índices para produtos
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_id ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_interno ON produtos(codigo_interno);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);

-- Índices para vendas
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);

-- Índices para financeiro
CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente_id ON contas_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON contas_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_data ON fluxo_caixa(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_tipo ON fluxo_caixa(tipo);

-- Índices para WhatsApp
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_id ON whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_number ON whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp_received);

-- ===========================================
-- 9. DADOS INICIAIS
-- ===========================================

-- Categorias financeiras padrão
INSERT INTO categorias_financeiras (nome, tipo, descricao, cor) VALUES
('Vendas de Produtos', 'receita', 'Receitas provenientes da venda de produtos', '#4CAF50'),
('Serviços Técnicos', 'receita', 'Receitas de serviços de assistência técnica', '#2196F3'),
('Outras Receitas', 'receita', 'Outras fontes de receita', '#FF9800'),
('Fornecedores', 'despesa', 'Pagamentos a fornecedores', '#F44336'),
('Salários', 'despesa', 'Folha de pagamento', '#9C27B0'),
('Aluguel', 'despesa', 'Aluguel do estabelecimento', '#795548'),
('Energia Elétrica', 'despesa', 'Conta de energia elétrica', '#FFC107'),
('Telefone/Internet', 'despesa', 'Telecomunicações', '#607D8B'),
('Outras Despesas', 'despesa', 'Outras despesas operacionais', '#757575')
ON CONFLICT (nome) DO NOTHING;

-- Categorias de produtos padrão
INSERT INTO categorias (nome, descricao) VALUES
('Smartphones', 'Aparelhos celulares e smartphones'),
('Tablets', 'Tablets e iPads'),
('Acessórios', 'Capas, películas, carregadores, etc.'),
('Peças de Reposição', 'Telas, baterias, alto-falantes, etc.'),
('Ferramentas', 'Ferramentas para reparo'),
('Outros', 'Outros produtos diversos')
ON CONFLICT (nome) DO NOTHING;

-- Configurações padrão do WhatsApp
INSERT INTO whatsapp_settings (key, value, description) VALUES
('bot_enabled', 'true', 'Habilitar/desabilitar o bot do WhatsApp'),
('welcome_message', 'Olá! Bem-vindo ao *Saymon Cell*! 📱\n\nEu sou o assistente virtual e estou aqui para ajudá-lo.\n\nDigite *menu* para ver as opções disponíveis.', 'Mensagem de boas-vindas do bot'),
('business_hours', '08:00-18:00', 'Horário de funcionamento (formato HH:MM-HH:MM)'),
('auto_response_enabled', 'true', 'Habilitar respostas automáticas fora do horário'),
('human_handoff_enabled', 'true', 'Permitir transferência para atendimento humano')
ON CONFLICT (key) DO NOTHING;

-- Registro inicial do QR Code
INSERT INTO whatsapp_qr (id, status) VALUES (1, 'disconnected') ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- 10. VIEWS ÚTEIS
-- ===========================================

-- View para dashboard de ordens
CREATE OR REPLACE VIEW dashboard_ordens AS
SELECT 
    COUNT(*) as total_ordens,
    COUNT(*) FILTER (WHERE status = 'aguardando') as aguardando,
    COUNT(*) FILTER (WHERE status = 'em_andamento') as em_andamento,
    COUNT(*) FILTER (WHERE status = 'aguardando_peca') as aguardando_peca,
    COUNT(*) FILTER (WHERE status = 'pronto') as pronto,
    COUNT(*) FILTER (WHERE status = 'entregue') as entregue,
    COUNT(*) FILTER (WHERE status = 'cancelado') as cancelado,
    AVG(EXTRACT(EPOCH FROM (COALESCE(data_conclusao, NOW()) - data_entrada))/86400) as tempo_medio_dias
FROM ordens
WHERE data_entrada >= CURRENT_DATE - INTERVAL '30 days';

-- View para estoque baixo
CREATE OR REPLACE VIEW produtos_estoque_baixo AS
SELECT 
    p.id,
    p.nome,
    p.estoque_atual,
    p.estoque_minimo,
    c.nome as categoria
FROM produtos p
LEFT JOIN categorias c ON p.categoria_id = c.id
WHERE p.estoque_atual <= p.estoque_minimo
AND p.ativo = true;

-- View para financeiro mensal
CREATE OR REPLACE VIEW financeiro_mensal AS
SELECT 
    DATE_TRUNC('month', data_movimentacao) as mes,
    SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as receitas,
    SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) as despesas,
    SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END) as saldo
FROM fluxo_caixa
GROUP BY DATE_TRUNC('month', data_movimentacao)
ORDER BY mes DESC;

-- ===========================================
-- MIGRAÇÃO CONCLUÍDA
-- ===========================================

-- Comentário final
COMMENT ON SCHEMA public IS 'Sistema Saymon Cell - Assistência Técnica - Migrado para Supabase/PostgreSQL com SERIAL IDs';