-- align_sqlrun_schema.sql
-- Objetivo: alinhar o schema criado por SQL-run.md ao esperado pelo backend e RPCs
-- Este script é idempotente e seguro para rodar múltiplas vezes

-- 1) VENDAS: adicionar colunas esperadas pelo backend
ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS tipo_pagamento text,
  ADD COLUMN IF NOT EXISTS valor_total numeric,
  ADD COLUMN IF NOT EXISTS data_venda timestamptz DEFAULT now();

-- Migrar dados existentes (uma vez)
UPDATE public.vendas SET tipo_pagamento = forma_pagamento WHERE tipo_pagamento IS NULL AND forma_pagamento IS NOT NULL;
UPDATE public.vendas SET valor_total = total WHERE valor_total IS NULL AND total IS NOT NULL;
UPDATE public.vendas SET data_venda = created_at WHERE data_venda IS NULL AND created_at IS NOT NULL;

-- 2) VENDA_ITENS: compatibilizar coluna opcional usada no app
ALTER TABLE IF EXISTS public.venda_itens
  ADD COLUMN IF NOT EXISTS preco_total numeric;

-- 3) ORDEM_FOTOS: compatibilizar nome do caminho
ALTER TABLE IF EXISTS public.ordem_fotos
  ADD COLUMN IF NOT EXISTS caminho text;
UPDATE public.ordem_fotos SET caminho = caminho_arquivo WHERE caminho IS NULL AND caminho_arquivo IS NOT NULL;

-- 4) ORDEM_PECAS: compatibilizar colunas de app
ALTER TABLE IF EXISTS public.ordem_pecas
  ADD COLUMN IF NOT EXISTS nome_peca text,
  ADD COLUMN IF NOT EXISTS codigo_peca text,
  ADD COLUMN IF NOT EXISTS fornecedor text,
  ADD COLUMN IF NOT EXISTS observacoes text;

-- (opcional) Migrar descricao -> nome_peca quando aplicável
UPDATE public.ordem_pecas SET nome_peca = descricao WHERE nome_peca IS NULL AND descricao IS NOT NULL;

-- 5) ORDEM_SERVICOS: compatibilizar nomes
ALTER TABLE IF EXISTS public.ordem_servicos
  ADD COLUMN IF NOT EXISTS descricao_servico text,
  ADD COLUMN IF NOT EXISTS tempo_gasto integer,
  ADD COLUMN IF NOT EXISTS valor_servico numeric,
  ADD COLUMN IF NOT EXISTS observacoes text;

-- Migração básica dos campos quando existirem
UPDATE public.ordem_servicos
  SET descricao_servico = COALESCE(descricao_servico, descricao),
      valor_servico = COALESCE(valor_servico, valor)
WHERE TRUE;

-- 6) ORDEM_HISTORICO: adicionar data_alteracao compatível com o app
ALTER TABLE IF EXISTS public.ordem_historico
  ADD COLUMN IF NOT EXISTS data_alteracao timestamptz DEFAULT now();
UPDATE public.ordem_historico SET data_alteracao = created_at WHERE created_at IS NOT NULL;

-- 7) ALERTAS_ESTOQUE: app utiliza coluna ativo
ALTER TABLE IF EXISTS public.alertas_estoque
  ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- 8) VIEW produtos_com_alertas: garantir que a coluna tipo venha de produtos.tipo
DROP VIEW IF EXISTS public.produtos_com_alertas;
CREATE OR REPLACE VIEW public.produtos_com_alertas AS
SELECT 
  p.id,
  p.nome,
  p.sku,
  p.categoria_id,
  c.nome AS categoria_nome,
  p.tipo AS tipo,
  p.estoque_atual,
  p.estoque_minimo,
  p.estoque_maximo,
  p.preco_custo,
  p.preco_venda,
  p.ativo,
  p.created_at,
  p.updated_at,
  CASE 
    WHEN p.estoque_atual = 0 THEN 'SEM_ESTOQUE'
    WHEN p.estoque_atual <= p.estoque_minimo THEN 'BAIXO' 
    ELSE 'OK' 
  END AS alerta_estoque,
  CASE 
    WHEN p.estoque_atual <= p.estoque_minimo THEN true 
    ELSE false 
  END AS tem_alerta
FROM public.produtos p
LEFT JOIN public.categorias c ON c.id = p.categoria_id;

-- 9) Recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';