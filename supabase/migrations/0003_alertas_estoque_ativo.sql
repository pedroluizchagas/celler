-- Adicionar coluna de status ativo em alertas_estoque, conforme uso no código
ALTER TABLE alertas_estoque ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Índice auxiliar para consultas por ativo
CREATE INDEX IF NOT EXISTS idx_alertas_estoque_ativo ON alertas_estoque(ativo);

