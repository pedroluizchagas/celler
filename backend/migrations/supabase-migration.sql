-- ===========================================
-- MIGRAÇÃO COMPLETA PARA SUPABASE (PostgreSQL)
-- Sistema Saymon Cell - Assistência Técnica
-- ===========================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- 1. TABELA DE CLIENTES
-- ===========================================
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- 2. TABELAS DE ORDENS DE SERVIÇO
-- ===========================================

-- Tabela principal de ordens
CREATE TABLE IF NOT EXISTS ordens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ordem_id UUID NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'entrada' CHECK (tipo IN ('entrada', 'durante', 'final')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Peças utilizadas nas ordens
CREATE TABLE IF NOT EXISTS ordem_pecas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ordem_id UUID NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id),
    descricao VARCHAR(255) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_total DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Histórico das ordens
CREATE TABLE IF NOT EXISTS ordem_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ordem_id UUID NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50) NOT NULL,
    observacoes TEXT,
    usuario VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Serviços realizados nas ordens
CREATE TABLE IF NOT EXISTS ordem_servicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ordem_id UUID NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL DEFAULT 0,
    tempo_estimado INTEGER, -- em minutos
    tempo_real INTEGER, -- em minutos
    tecnico VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para ordens
CREATE INDEX IF NOT EXISTS idx_ordens_cliente_id ON ordens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordens_status ON ordens(status);
CREATE INDEX IF NOT EXISTS idx_ordens_data_entrada ON ordens(data_entrada);
CREATE INDEX IF NOT EXISTS idx_ordens_tecnico ON ordens(tecnico_responsavel);
CREATE INDEX IF NOT EXISTS idx_ordem_fotos_ordem_id ON ordem_fotos(ordem_id);
CREATE INDEX IF NOT EXISTS idx_ordem_pecas_ordem_id ON ordem_pecas(ordem_id);
CREATE INDEX IF NOT EXISTS idx_ordem_historico_ordem_id ON ordem_historico(ordem_id);
CREATE INDEX IF NOT EXISTS idx_ordem_servicos_ordem_id ON ordem_servicos(ordem_id);

-- ===========================================
-- 3. SISTEMA DE ESTOQUE
-- ===========================================

-- Categorias de produtos
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID REFERENCES categorias(id),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    codigo_barras VARCHAR(100) UNIQUE,
    preco_custo DECIMAL(10,2) DEFAULT 0,
    preco_venda DECIMAL(10,2) DEFAULT 0,
    estoque_atual INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 0,
    estoque_maximo INTEGER DEFAULT 0,
    unidade_medida VARCHAR(20) DEFAULT 'un',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'transferencia')),
    quantidade INTEGER NOT NULL,
    quantidade_anterior INTEGER NOT NULL,
    quantidade_atual INTEGER NOT NULL,
    motivo VARCHAR(255),
    observacoes TEXT,
    documento VARCHAR(100), -- nota fiscal, ordem de compra, etc.
    usuario VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alertas de estoque
CREATE TABLE IF NOT EXISTS alertas_estoque (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('estoque_baixo', 'estoque_zerado', 'estoque_alto')),
    mensagem TEXT NOT NULL,
    visualizado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para estoque
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_id ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto_id ON movimentacoes_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes_estoque(tipo);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_estoque(created_at);
CREATE INDEX IF NOT EXISTS idx_alertas_produto_id ON alertas_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_alertas_visualizado ON alertas_estoque(visualizado);

-- ===========================================
-- 4. SISTEMA DE VENDAS
-- ===========================================

-- Vendas
CREATE TABLE IF NOT EXISTS vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id),
    numero_venda VARCHAR(50) UNIQUE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    desconto DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    forma_pagamento VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'finalizada' CHECK (status IN ('pendente', 'finalizada', 'cancelada')),
    observacoes TEXT,
    vendedor VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itens das vendas
CREATE TABLE IF NOT EXISTS venda_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id),
    descricao VARCHAR(255) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    desconto_item DECIMAL(10,2) DEFAULT 0,
    total_item DECIMAL(10,2) GENERATED ALWAYS AS ((quantidade * preco_unitario) - desconto_item) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para vendas
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_numero ON vendas(numero_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(created_at);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_venda_itens_venda_id ON venda_itens(venda_id);
CREATE INDEX IF NOT EXISTS idx_venda_itens_produto_id ON venda_itens(produto_id);

-- ===========================================
-- 5. MÓDULO FINANCEIRO
-- ===========================================

-- Categorias financeiras
CREATE TABLE IF NOT EXISTS categorias_financeiras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL UNIQUE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    descricao TEXT,
    cor VARCHAR(7), -- código hexadecimal da cor
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contas a receber
CREATE TABLE IF NOT EXISTS contas_receber (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id),
    ordem_id UUID REFERENCES ordens(id),
    venda_id UUID REFERENCES vendas(id),
    categoria_id UUID REFERENCES categorias_financeiras(id),
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_recebimento DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'vencido', 'cancelado')),
    forma_recebimento VARCHAR(50),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contas a pagar
CREATE TABLE IF NOT EXISTS contas_pagar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID REFERENCES categorias_financeiras(id),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    categoria_id UUID REFERENCES categorias_financeiras(id),
    conta_receber_id UUID REFERENCES contas_receber(id),
    conta_pagar_id UUID REFERENCES contas_pagar(id),
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_movimento DATE NOT NULL,
    forma_pagamento VARCHAR(50),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metas financeiras
CREATE TABLE IF NOT EXISTS metas_financeiras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa', 'lucro')),
    valor_meta DECIMAL(10,2) NOT NULL,
    periodo VARCHAR(20) NOT NULL CHECK (periodo IN ('mensal', 'trimestral', 'semestral', 'anual')),
    ano INTEGER NOT NULL,
    mes INTEGER, -- para metas mensais
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para financeiro
CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente_id ON contas_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON contas_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_tipo ON fluxo_caixa(tipo);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_data ON fluxo_caixa(data_movimento);

-- ===========================================
-- 6. SISTEMA WHATSAPP
-- ===========================================

-- Mensagens do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(255) UNIQUE NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    content TEXT,
    media_url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    is_from_me BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'received',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interações do bot
CREATE TABLE IF NOT EXISTS whatsapp_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    command VARCHAR(100),
    response TEXT,
    context JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fila de atendimento humano
CREATE TABLE IF NOT EXISTS whatsapp_human_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    client_name VARCHAR(255),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'resolved', 'cancelled')),
    assigned_to VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para WhatsApp
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from ON whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_phone ON whatsapp_interactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_human_queue(status);

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

-- Triggers para tabelas com updated_at
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ordens_updated_at BEFORE UPDATE ON ordens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_financeiras_updated_at BEFORE UPDATE ON categorias_financeiras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contas_receber_updated_at BEFORE UPDATE ON contas_receber FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contas_pagar_updated_at BEFORE UPDATE ON contas_pagar FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metas_financeiras_updated_at BEFORE UPDATE ON metas_financeiras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_human_queue_updated_at BEFORE UPDATE ON whatsapp_human_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 8. DADOS INICIAIS
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

-- ===========================================
-- 9. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ===========================================

-- Habilitar RLS nas tabelas principais (opcional, para multi-tenancy futuro)
-- ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ordens ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

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
    DATE_TRUNC('month', data_movimento) as mes,
    SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as receitas,
    SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) as despesas,
    SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END) as saldo
FROM fluxo_caixa
GROUP BY DATE_TRUNC('month', data_movimento)
ORDER BY mes DESC;

-- ===========================================
-- MIGRAÇÃO CONCLUÍDA
-- ===========================================

-- Comentário final
COMMENT ON SCHEMA public IS 'Sistema Saymon Cell - Assistência Técnica - Migrado para Supabase/PostgreSQL';