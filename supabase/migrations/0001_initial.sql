-- Baseline do schema atual (copiado do backend/migrations/supabase-migration-fixed.sql)
-- Este arquivo estabelece as tabelas principais para que o Supabase CLI
-- reconheça o estado inicial do banco ao versionar.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clientes
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

CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);

-- Categorias
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    descricao TEXT,
    icone VARCHAR(50),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produtos (versão base com tipo como VARCHAR, será padronizado em migração posterior)
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

-- Ordens
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

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_ordens_cliente_id ON ordens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordens_status ON ordens(status);
CREATE INDEX IF NOT EXISTS idx_ordens_data_entrada ON ordens(data_entrada);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_id ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_interno ON produtos(codigo_interno);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);

-- Função e triggers de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ordens_updated_at BEFORE UPDATE ON ordens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

