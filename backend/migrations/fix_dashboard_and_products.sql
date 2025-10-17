-- Migração para corrigir view produtos_com_alertas e criar função dashboard_resumo
-- Este script resolve os erros 500 relacionados a colunas/funções inexistentes

-- 1. Criar/atualizar a view produtos_com_alertas com coluna tipo
CREATE OR REPLACE VIEW public.produtos_com_alertas AS
SELECT 
  p.id,
  p.nome,
  p.sku,
  p.categoria_id,
  c.nome AS categoria_nome,
  c.tipo AS tipo,
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

-- 2. Criar função dashboard_resumo para estatísticas de ordens
CREATE OR REPLACE FUNCTION public.dashboard_resumo(
  p_de date DEFAULT (now()::date - interval '30 day')::date,
  p_ate date DEFAULT now()::date
) RETURNS TABLE(
  ordens_total bigint,
  ordens_abertas bigint,
  ordens_fechadas bigint,
  ticket_medio numeric
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE status IN ('aberta','andamento'))::bigint,
    COUNT(*) FILTER (WHERE status IN ('concluida','entregue'))::bigint,
    COALESCE(AVG(total),0)::numeric
  FROM public.ordens
  WHERE data_criacao::date BETWEEN p_de AND p_ate;
END;
$$;

-- 3. Criar função para estatísticas de produtos
CREATE OR REPLACE FUNCTION public.produtos_stats(
  p_categoria_id integer DEFAULT NULL
) RETURNS TABLE(
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

-- 4. Recarregar o cache de schema do PostgREST/Supabase
NOTIFY pgrst, 'reload schema';

-- 5. Comentários de verificação
DO $$
BEGIN
  -- Verificar se a view foi criada
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'produtos_com_alertas' AND table_schema = 'public') THEN
    RAISE NOTICE 'View produtos_com_alertas criada com sucesso!';
  ELSE
    RAISE EXCEPTION 'Falha ao criar view produtos_com_alertas';
  END IF;
  
  -- Verificar se as funções foram criadas
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'dashboard_resumo' AND routine_schema = 'public') THEN
    RAISE NOTICE 'Função dashboard_resumo criada com sucesso!';
  ELSE
    RAISE EXCEPTION 'Falha ao criar função dashboard_resumo';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'produtos_stats' AND routine_schema = 'public') THEN
    RAISE NOTICE 'Função produtos_stats criada com sucesso!';
  ELSE
    RAISE EXCEPTION 'Falha ao criar função produtos_stats';
  END IF;
  
  RAISE NOTICE 'Migração concluída com sucesso!';
END $$;