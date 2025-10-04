# SQL-run.md - Estrutura Completa do Banco de Dados
## Sistema Saymon Cell - Assistência Técnica

**INSTRUÇÕES:**
1. Acesse o Supabase SQL Editor: https://supabase.com/dashboard/project/siazsdgodjfmpenmukon/sql/new
2. Apague todas as tabelas existentes (se houver)
3. Execute todo o SQL abaixo de uma só vez
4. Verifique se todas as tabelas foram criadas corretamente

---

```sql
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
    caminho_arquivo TEXT NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'entrada' CHECK (tipo IN ('entrada', 'durante', 'final')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Peças utilizadas nas ordens
CREATE TABLE IF NOT EXISTS ordem_pecas (
    id SERIAL PRIMARY KEY,
    ordem_id INTEGER NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id),
    descricao VARCHAR(255) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_total DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Serviços realizados nas ordens
CREATE TABLE IF NOT EXISTS ordem_servicos (
    id SERIAL PRIMARY KEY,
    ordem_id INTEGER NOT NULL REFERENCES ordens(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL DEFAULT 0,
    tempo_estimado INTEGER, -- em minutos
    tempo_real INTEGER, -- em minutos
    tecnico VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para estoque (criados junto com as tabelas)
CREATE INDEX IF NOT EXISTS idx_categorias_nome ON categorias(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_id ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_interno ON produtos(codigo_interno);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);

-- Índices para ordens
CREATE INDEX IF NOT EXISTS idx_ordens_cliente_id ON ordens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordens_status ON ordens(status);
CREATE INDEX IF NOT EXISTS idx_ordens_data_entrada ON ordens(data_entrada);
CREATE INDEX IF NOT EXISTS idx_ordens_tecnico ON ordens(tecnico_responsavel);
CREATE INDEX IF NOT EXISTS idx_ordem_fotos_ordem_id ON ordem_fotos(ordem_id);
CREATE INDEX IF NOT EXISTS idx_ordem_pecas_ordem_id ON ordem_pecas(ordem_id);
CREATE INDEX IF NOT EXISTS idx_ordem_historico_ordem_id ON ordem_historico(ordem_id);
CREATE INDEX IF NOT EXISTS idx_ordem_servicos_ordem_id ON ordem_servicos(ordem_id);

-- Movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'perda')),
    quantidade INTEGER NOT NULL,
    quantidade_anterior INTEGER NOT NULL,
    quantidade_atual INTEGER NOT NULL,
    preco_unitario DECIMAL(10,2),
    valor_total DECIMAL(10,2),
    motivo VARCHAR(50) NOT NULL,
    referencia_id INTEGER,
    referencia_tipo VARCHAR(20),
    observacoes TEXT,
    usuario VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alertas de estoque
CREATE TABLE IF NOT EXISTS alertas_estoque (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('estoque_baixo', 'estoque_zerado', 'vencimento')),
    mensagem TEXT NOT NULL,
    visualizado BOOLEAN DEFAULT false,
    data_alerta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para movimentações e alertas de estoque
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
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id),
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
    id SERIAL PRIMARY KEY,
    venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id),
    descricao VARCHAR(255) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    desconto_item DECIMAL(10,2) DEFAULT 0,
    total_item DECIMAL(10,2) GENERATED ALWAYS AS ((quantidade * preco_unitario) - desconto_item) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para vendas
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(created_at);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_venda_itens_venda_id ON venda_itens(venda_id);
CREATE INDEX IF NOT EXISTS idx_venda_itens_produto_id ON venda_itens(produto_id);

-- ===========================================
-- 5. MÓDULO FINANCEIRO
-- ===========================================

-- Categorias financeiras
CREATE TABLE IF NOT EXISTS categorias_financeiras (
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id),
    ordem_id INTEGER REFERENCES ordens(id),
    venda_id INTEGER REFERENCES vendas(id),
    categoria_id INTEGER REFERENCES categorias_financeiras(id),
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_recebimento DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'vencido', 'cancelado')),
    forma_recebimento VARCHAR(50),
    juros DECIMAL(10,2) DEFAULT 0,
    desconto DECIMAL(10,2) DEFAULT 0,
    multa DECIMAL(10,2) DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contas a pagar
CREATE TABLE IF NOT EXISTS contas_pagar (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorias_financeiras(id),
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
    forma_pagamento VARCHAR(50),
    juros DECIMAL(10,2) DEFAULT 0,
    desconto DECIMAL(10,2) DEFAULT 0,
    multa DECIMAL(10,2) DEFAULT 0,
    fornecedor VARCHAR(255),
    numero_documento VARCHAR(255),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fluxo de caixa
CREATE TABLE IF NOT EXISTS fluxo_caixa (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    valor DECIMAL(10,2) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    categoria_id INTEGER REFERENCES categorias_financeiras(id),
    conta_receber_id INTEGER REFERENCES contas_receber(id),
    conta_pagar_id INTEGER REFERENCES contas_pagar(id),
    ordem_id INTEGER REFERENCES ordens(id),
    venda_id INTEGER REFERENCES vendas(id),
    cliente_id INTEGER REFERENCES clientes(id),
    forma_pagamento VARCHAR(50) NOT NULL,
    data_movimentacao DATE NOT NULL,
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
    ano INTEGER NOT NULL,
    mes INTEGER, -- para metas mensais
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para financeiro
CREATE INDEX IF NOT EXISTS idx_categorias_financeiras_tipo ON categorias_financeiras(tipo);
CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente_id ON contas_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON contas_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_tipo ON fluxo_caixa(tipo);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_data ON fluxo_caixa(data_movimentacao);

-- ===========================================
-- 6. SISTEMA WHATSAPP
-- ===========================================

-- Mensagens do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE,
    from_number VARCHAR(20),
    to_number VARCHAR(20),
    message_type VARCHAR(20),
    content TEXT,
    media_url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20),
    direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interações do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_interactions (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    contact_name VARCHAR(255),
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fila de atendimento humano
CREATE TABLE IF NOT EXISTS whatsapp_human_queue (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    contact_name VARCHAR(255),
    reason TEXT,
    priority INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'resolved')),
    assigned_to VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para WhatsApp
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from ON whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to ON whatsapp_messages(to_number);
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

-- Triggers para updated_at
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ordens_updated_at BEFORE UPDATE ON ordens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_financeiras_updated_at BEFORE UPDATE ON categorias_financeiras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contas_receber_updated_at BEFORE UPDATE ON contas_receber FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contas_pagar_updated_at BEFORE UPDATE ON contas_pagar FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metas_financeiras_updated_at BEFORE UPDATE ON metas_financeiras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_interactions_updated_at BEFORE UPDATE ON whatsapp_interactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_human_queue_updated_at BEFORE UPDATE ON whatsapp_human_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_settings_updated_at BEFORE UPDATE ON whatsapp_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 8. DADOS INICIAIS
-- ===========================================

-- Categorias financeiras padrão
INSERT INTO categorias_financeiras (nome, tipo, descricao, cor) VALUES
('Serviços de Reparo', 'receita', 'Receitas de serviços de assistência técnica', '#4CAF50'),
('Venda de Peças', 'receita', 'Receitas de vendas de peças e acessórios', '#2196F3'),
('Venda de Acessórios', 'receita', 'Receitas de vendas de acessórios', '#FF9800'),
('Aluguel', 'despesa', 'Despesas com aluguel do estabelecimento', '#F44336'),
('Energia Elétrica', 'despesa', 'Despesas com energia elétrica', '#9C27B0'),
('Internet/Telefone', 'despesa', 'Despesas com telecomunicações', '#607D8B'),
('Compra de Peças', 'despesa', 'Despesas com compra de peças para estoque', '#795548'),
('Salários', 'despesa', 'Despesas com folha de pagamento', '#E91E63'),
('Impostos', 'despesa', 'Despesas com impostos e taxas', '#FF5722'),
('Marketing', 'despesa', 'Despesas com publicidade e marketing', '#3F51B5')
ON CONFLICT (nome) DO NOTHING;

-- Categorias de produtos padrão
INSERT INTO categorias (nome, descricao, icone) VALUES
('Telas', 'Telas para smartphones e tablets', 'smartphone'),
('Baterias', 'Baterias para dispositivos móveis', 'battery_charging_full'),
('Capas e Películas', 'Acessórios de proteção', 'security'),
('Carregadores', 'Carregadores e cabos', 'power'),
('Fones de Ouvido', 'Fones e acessórios de áudio', 'headphones'),
('Peças Internas', 'Componentes internos diversos', 'memory'),
('Ferramentas', 'Ferramentas para reparo', 'build'),
('Outros', 'Outros produtos e acessórios', 'category')
ON CONFLICT (nome) DO NOTHING;

-- Configurações iniciais do WhatsApp
INSERT INTO whatsapp_settings (key, value, description) VALUES
('webhook_url', '', 'URL do webhook para receber mensagens'),
('api_token', '', 'Token da API do WhatsApp'),
('phone_number', '', 'Número do telefone do WhatsApp Business'),
('welcome_message', 'Olá! Bem-vindo à Saymon Cell. Como posso ajudá-lo hoje?', 'Mensagem de boas-vindas automática'),
('business_hours_start', '08:00', 'Horário de início do atendimento'),
('business_hours_end', '18:00', 'Horário de fim do atendimento'),
('auto_reply_enabled', 'true', 'Habilitar respostas automáticas'),
('human_queue_enabled', 'true', 'Habilitar fila de atendimento humano')
ON CONFLICT (key) DO NOTHING;

-- ===========================================
-- 9. VIEWS ÚTEIS
-- ===========================================

-- View para dashboard de ordens
CREATE OR REPLACE VIEW dashboard_ordens AS
SELECT 
    o.id,
    o.equipamento,
    o.modelo,
    o.status,
    o.data_entrada,
    o.data_previsao,
    o.valor_orcamento,
    o.valor_final,
    c.nome as cliente_nome,
    c.telefone as cliente_telefone,
    CASE 
        WHEN o.data_previsao < CURRENT_DATE AND o.status NOT IN ('entregue', 'cancelado') THEN 'atrasado'
        WHEN o.data_previsao = CURRENT_DATE AND o.status NOT IN ('entregue', 'cancelado') THEN 'vence_hoje'
        ELSE 'normal'
    END as situacao_prazo
FROM ordens o
JOIN clientes c ON o.cliente_id = c.id
ORDER BY o.data_entrada DESC;

-- View para produtos com estoque baixo
CREATE OR REPLACE VIEW produtos_estoque_baixo AS
SELECT 
    p.id,
    p.nome,
    p.codigo_interno,
    p.estoque_atual,
    p.estoque_minimo,
    c.nome as categoria_nome,
    (p.estoque_minimo - p.estoque_atual) as quantidade_necessaria
FROM produtos p
LEFT JOIN categorias c ON p.categoria_id = c.id
WHERE p.estoque_atual <= p.estoque_minimo
AND p.ativo = true
ORDER BY (p.estoque_minimo - p.estoque_atual) DESC;

-- View para resumo financeiro mensal
CREATE OR REPLACE VIEW financeiro_mensal AS
SELECT 
    DATE_TRUNC('month', data_movimentacao) as mes,
    SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as total_receitas,
    SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) as total_despesas,
    SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END) as saldo_liquido
FROM fluxo_caixa
GROUP BY DATE_TRUNC('month', data_movimentacao)
ORDER BY mes DESC;

-- ===========================================
-- 10. POLÍTICAS DE SEGURANÇA RLS (ROW LEVEL SECURITY)
-- ===========================================

-- Habilitar RLS nas tabelas principais
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordem_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordem_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordem_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordem_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE venda_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxo_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_human_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver) e criar novas políticas "Allow all"
DROP POLICY IF EXISTS "Allow all" ON clientes;
DROP POLICY IF EXISTS "Allow all" ON ordens;
DROP POLICY IF EXISTS "Allow all" ON ordem_fotos;
DROP POLICY IF EXISTS "Allow all" ON ordem_pecas;
DROP POLICY IF EXISTS "Allow all" ON ordem_historico;
DROP POLICY IF EXISTS "Allow all" ON ordem_servicos;
DROP POLICY IF EXISTS "Allow all" ON categorias;
DROP POLICY IF EXISTS "Allow all" ON produtos;
DROP POLICY IF EXISTS "Allow all" ON movimentacoes_estoque;
DROP POLICY IF EXISTS "Allow all" ON alertas_estoque;
DROP POLICY IF EXISTS "Allow all" ON vendas;
DROP POLICY IF EXISTS "Allow all" ON venda_itens;
DROP POLICY IF EXISTS "Allow all" ON categorias_financeiras;
DROP POLICY IF EXISTS "Allow all" ON contas_receber;
DROP POLICY IF EXISTS "Allow all" ON contas_pagar;
DROP POLICY IF EXISTS "Allow all" ON fluxo_caixa;
DROP POLICY IF EXISTS "Allow all" ON metas_financeiras;
DROP POLICY IF EXISTS "Allow all" ON whatsapp_messages;
DROP POLICY IF EXISTS "Allow all" ON whatsapp_interactions;
DROP POLICY IF EXISTS "Allow all" ON whatsapp_human_queue;
DROP POLICY IF EXISTS "Allow all" ON whatsapp_settings;

-- Criar políticas "Allow all" para todas as tabelas (desenvolvimento/single-tenant)
CREATE POLICY "Allow all" ON clientes FOR ALL USING (true);
CREATE POLICY "Allow all" ON ordens FOR ALL USING (true);
CREATE POLICY "Allow all" ON ordem_fotos FOR ALL USING (true);
CREATE POLICY "Allow all" ON ordem_pecas FOR ALL USING (true);
CREATE POLICY "Allow all" ON ordem_historico FOR ALL USING (true);
CREATE POLICY "Allow all" ON ordem_servicos FOR ALL USING (true);
CREATE POLICY "Allow all" ON categorias FOR ALL USING (true);
CREATE POLICY "Allow all" ON produtos FOR ALL USING (true);
CREATE POLICY "Allow all" ON movimentacoes_estoque FOR ALL USING (true);
CREATE POLICY "Allow all" ON alertas_estoque FOR ALL USING (true);
CREATE POLICY "Allow all" ON vendas FOR ALL USING (true);
CREATE POLICY "Allow all" ON venda_itens FOR ALL USING (true);
CREATE POLICY "Allow all" ON categorias_financeiras FOR ALL USING (true);
CREATE POLICY "Allow all" ON contas_receber FOR ALL USING (true);
CREATE POLICY "Allow all" ON contas_pagar FOR ALL USING (true);
CREATE POLICY "Allow all" ON fluxo_caixa FOR ALL USING (true);
CREATE POLICY "Allow all" ON metas_financeiras FOR ALL USING (true);
CREATE POLICY "Allow all" ON whatsapp_messages FOR ALL USING (true);
CREATE POLICY "Allow all" ON whatsapp_interactions FOR ALL USING (true);
CREATE POLICY "Allow all" ON whatsapp_human_queue FOR ALL USING (true);
CREATE POLICY "Allow all" ON whatsapp_settings FOR ALL USING (true);

-- Comentário final
COMMENT ON SCHEMA public IS 'Sistema Saymon Cell - Assistência Técnica - Migrado para Supabase/PostgreSQL';
```

---

## ✅ Verificação Pós-Execução

Após executar o SQL acima, verifique se as seguintes tabelas foram criadas:

### Tabelas Principais:
- ✅ `clientes` (com coluna `observacoes`)
- ✅ `ordens` (com todas as colunas necessárias)
- ✅ `ordem_fotos`
- ✅ `ordem_pecas`
- ✅ `ordem_historico`
- ✅ `ordem_servicos`

### Sistema de Estoque:
- ✅ `categorias`
- ✅ `produtos`
- ✅ `movimentacoes_estoque`
- ✅ `alertas_estoque`

### Sistema de Vendas:
- ✅ `vendas`
- ✅ `venda_itens`

### Sistema Financeiro:
- ✅ `categorias_financeiras`
- ✅ `contas_receber`
- ✅ `contas_pagar`
- ✅ `fluxo_caixa`
- ✅ `metas_financeiras`

### Sistema WhatsApp:
- ✅ `whatsapp_messages`
- ✅ `whatsapp_interactions`
- ✅ `whatsapp_human_queue`
- ✅ `whatsapp_settings`

### Views e Dados Iniciais:
- ✅ Views de dashboard criadas
- ✅ Categorias financeiras inseridas
- ✅ Categorias de produtos inseridas
- ✅ Configurações WhatsApp inseridas

**Após executar, teste a API novamente para verificar se os erros foram resolvidos!**