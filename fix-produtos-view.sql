-- Script para corrigir view produtos_com_alertas e funções relacionadas
-- Este script resolve os erros 500 relacionados a colunas/funções inexistentes

-- 1. Primeiro, vamos dropar a view existente se ela existir
DROP VIEW IF EXISTS public.produtos_com_alertas;

-- 2. Criar a view produtos_com_alertas corrigida
CREATE OR REPLACE VIEW public.produtos_com_alertas AS
SELECT 
  p.id,
  p.nome,
  p.sku,
  p.codigo_barras,
  p.codigo_interno,
  p.descricao,
  p.tipo,
  p.preco_custo,
  p.preco_venda,
  p.margem_lucro,
  p.categoria_id,
  c.nome AS categoria_nome,
  -- Garantir que a coluna 'tipo' da categoria existe
  COALESCE(c.tipo, 'produto') AS categoria_tipo,
  p.fornecedor_id,
  p.estoque_atual,
  p.estoque_minimo,
  p.estoque_maximo,
  p.localizacao,
  p.ativo,
  p.data_criacao,
  p.data_atualizacao,
  -- Calcular o status do alerta de estoque
  CASE 
    WHEN p.estoque_atual <= 0 THEN 'SEM_ESTOQUE'
    WHEN p.estoque_atual <= p.estoque_minimo THEN 'BAIXO'
    ELSE 'OK'
  END AS alerta_estoque,
  -- Indicador booleano para estoque baixo
  (p.estoque_atual <= p.estoque_minimo) AS tem_alerta
FROM public.produtos p
LEFT JOIN public.categorias c ON c.id = p.categoria_id
WHERE p.ativo = true;

-- 3. Criar função para dashboard de produtos
CREATE OR REPLACE FUNCTION public.produtos_dashboard_stats(
  p_categoria_id integer DEFAULT NULL
) RETURNS TABLE (
  total_produtos bigint,
  produtos_ativos bigint,
  produtos_com_estoque bigint,
  produtos_estoque_baixo bigint,
  produtos_sem_estoque bigint,
  valor_total_estoque numeric
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint AS total_produtos,
    COUNT(*) FILTER (WHERE ativo = true)::bigint AS produtos_ativos,
    COUNT(*) FILTER (WHERE ativo = true AND estoque_atual > 0)::bigint AS produtos_com_estoque,
    COUNT(*) FILTER (WHERE ativo = true AND estoque_atual > 0 AND estoque_atual <= estoque_minimo)::bigint AS produtos_estoque_baixo,
    COUNT(*) FILTER (WHERE ativo = true AND estoque_atual = 0)::bigint AS produtos_sem_estoque,
    COALESCE(SUM(CASE WHEN ativo = true THEN (estoque_atual * preco_custo) ELSE 0 END), 0)::numeric AS valor_total_estoque
  FROM public.produtos
  WHERE (p_categoria_id IS NULL OR categoria_id = p_categoria_id);
END;
$$;

-- 4. Criar função para listar produtos com alertas
CREATE OR REPLACE FUNCTION public.produtos_com_alertas_list(
  p_limite integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_categoria_id integer DEFAULT NULL,
  p_tipo text DEFAULT NULL
) RETURNS TABLE (
  id integer,
  nome text,
  sku text,
  categoria_nome text,
  estoque_atual integer,
  estoque_minimo integer,
  alerta_estoque text,
  preco_venda numeric
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pca.id,
    pca.nome,
    pca.sku,
    pca.categoria_nome,
    pca.estoque_atual,
    pca.estoque_minimo,
    pca.alerta_estoque,
    pca.preco_venda
  FROM public.produtos_com_alertas pca
  WHERE 
    (p_categoria_id IS NULL OR pca.categoria_id = p_categoria_id)
    AND (p_tipo IS NULL OR pca.tipo = p_tipo)
    AND pca.tem_alerta = true
  ORDER BY 
    CASE pca.alerta_estoque
      WHEN 'SEM_ESTOQUE' THEN 1
      WHEN 'BAIXO' THEN 2
      ELSE 3
    END,
    pca.nome
  LIMIT p_limite
  OFFSET p_offset;
END;
$$;

-- 5. Criar função para buscar produto por código (código de barras ou interno)
CREATE OR REPLACE FUNCTION public.buscar_produto_por_codigo(
  p_codigo text
) RETURNS TABLE (
  id integer,
  nome text,
  sku text,
  codigo_barras text,
  codigo_interno text,
  tipo text,
  preco_venda numeric,
  estoque_atual integer,
  categoria_nome text,
  ativo boolean
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.nome,
    p.sku,
    p.codigo_barras,
    p.codigo_interno,
    p.tipo,
    p.preco_venda,
    p.estoque_atual,
    c.nome AS categoria_nome,
    p.ativo
  FROM public.produtos p
  LEFT JOIN public.categorias c ON c.id = p.categoria_id
  WHERE 
    p.ativo = true
    AND (
      p.codigo_barras = p_codigo 
      OR p.codigo_interno = p_codigo
      OR p.sku = p_codigo
    )
  LIMIT 1;
END;
$$;

-- 6. Garantir que a tabela categorias tem a coluna 'tipo' (se não existir, criar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categorias' 
    AND column_name = 'tipo' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.categorias ADD COLUMN tipo text DEFAULT 'produto';
    UPDATE public.categorias SET tipo = 'produto' WHERE tipo IS NULL;
  END IF;
END $$;

-- 7. Recarregar cache do PostgREST (se aplicável)
NOTIFY pgrst, 'reload schema';

-- 8. Comentários para documentação
COMMENT ON VIEW public.produtos_com_alertas IS 'View que combina produtos com suas categorias e calcula alertas de estoque';
COMMENT ON FUNCTION public.produtos_dashboard_stats IS 'Função que retorna estatísticas do dashboard de produtos';
COMMENT ON FUNCTION public.produtos_com_alertas_list IS 'Função que lista produtos com alertas de estoque';
COMMENT ON FUNCTION public.buscar_produto_por_codigo IS 'Função que busca produto por código de barras, interno ou SKU';

-- 9. Criar índices para melhorar performance (se não existirem)
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON public.produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_id ON public.produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_estoque_alerta ON public.produtos(estoque_atual, estoque_minimo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON public.produtos(codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_interno ON public.produtos(codigo_interno) WHERE codigo_interno IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_sku ON public.produtos(sku) WHERE sku IS NOT NULL;

-- 10. Verificar se as tabelas principais existem e têm as colunas necessárias
DO $$
BEGIN
  -- Verificar tabela produtos
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Tabela produtos não existe';
  END IF;
  
  -- Verificar tabela categorias
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categorias' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Tabela categorias não existe';
  END IF;
  
  RAISE NOTICE 'View produtos_com_alertas e funções relacionadas criadas com sucesso!';
END $$;