-- Padronização de schema: enum para produtos.tipo, default de ativo,
-- chaves estrangeiras e tabela de fornecedores.

-- 1) Criar enum tipo_produto ('peca','servico') se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_produto') THEN
    CREATE TYPE tipo_produto AS ENUM ('peca','servico');
  END IF;
END$$;

-- 2) Preparar dados existentes em produtos.tipo para migração
-- Mapear quaisquer valores não suportados para 'peca'
UPDATE produtos SET tipo = 'peca' WHERE tipo IS NULL OR tipo NOT IN ('peca','servico');

-- Remover constraint de CHECK antiga, se existir
ALTER TABLE produtos DROP CONSTRAINT IF EXISTS produtos_tipo_check;

-- Alterar coluna para o novo enum
ALTER TABLE produtos
  ALTER COLUMN tipo TYPE tipo_produto USING (
    CASE WHEN tipo IN ('peca','servico') THEN tipo::tipo_produto ELSE 'peca'::tipo_produto END
  );

-- Definir default explícito
ALTER TABLE produtos ALTER COLUMN tipo SET DEFAULT 'peca'::tipo_produto;

-- 3) Garantir default de ativo = true
ALTER TABLE produtos ALTER COLUMN ativo SET DEFAULT true;
UPDATE produtos SET ativo = true WHERE ativo IS NULL;

-- 4) Criar tabela fornecedores (mínimo necessário) se não existir
CREATE TABLE IF NOT EXISTS fornecedores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger de updated_at para fornecedores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_fornecedores_updated_at'
  ) THEN
    CREATE TRIGGER update_fornecedores_updated_at
    BEFORE UPDATE ON fornecedores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- 5) Adicionar coluna fornecedor_id em produtos, se não existir
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS fornecedor_id INTEGER;

-- 6) Recriar FK de categoria com ON DELETE SET NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'produtos_categoria_id_fkey'
  ) THEN
    ALTER TABLE produtos DROP CONSTRAINT produtos_categoria_id_fkey;
  END IF;
  -- Adicionar constraint caso ainda não exista
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'produtos_categoria_id_fkey'
  ) THEN
    ALTER TABLE produtos
      ADD CONSTRAINT produtos_categoria_id_fkey
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 7) Criar FK de fornecedor com ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE
    WHERE CONSTRAINT_NAME = 'produtos_fornecedor_id_fkey'
  ) THEN
    ALTER TABLE produtos
      ADD CONSTRAINT produtos_fornecedor_id_fkey
      FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 8) Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_produtos_fornecedor_id ON produtos(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_produtos_tipo ON produtos(tipo);

