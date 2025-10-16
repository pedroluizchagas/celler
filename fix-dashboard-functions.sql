-- Script para criar funções de dashboard e estatísticas
-- Este script resolve os erros 500 relacionados a funções inexistentes

-- 1. Função principal do dashboard de ordens
CREATE OR REPLACE FUNCTION public.dashboard_resumo(
  p_de date DEFAULT (now()::date - interval '30 day')::date,
  p_ate date DEFAULT now()::date
) RETURNS TABLE (
  ordens_total bigint,
  ordens_abertas bigint,
  ordens_em_andamento bigint,
  ordens_concluidas bigint,
  ordens_entregues bigint,
  ticket_medio numeric,
  receita_total numeric,
  receita_mes_atual numeric,
  receita_mes_anterior numeric
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint AS ordens_total,
    COUNT(*) FILTER (WHERE status = 'aberta')::bigint AS ordens_abertas,
    COUNT(*) FILTER (WHERE status = 'andamento')::bigint AS ordens_em_andamento,
    COUNT(*) FILTER (WHERE status = 'concluida')::bigint AS ordens_concluidas,
    COUNT(*) FILTER (WHERE status = 'entregue')::bigint AS ordens_entregues,
    COALESCE(AVG(total), 0)::numeric AS ticket_medio,
    COALESCE(SUM(total), 0)::numeric AS receita_total,
    COALESCE(SUM(CASE WHEN data_criacao::date >= date_trunc('month', now())::date THEN total ELSE 0 END), 0)::numeric AS receita_mes_atual,
    COALESCE(SUM(CASE WHEN data_criacao::date >= date_trunc('month', now() - interval '1 month')::date 
                      AND data_criacao::date < date_trunc('month', now())::date THEN total ELSE 0 END), 0)::numeric AS receita_mes_anterior
  FROM public.ordens 
  WHERE data_criacao::date BETWEEN p_de AND p_ate;
END;
$$;

-- 2. Função para estatísticas de vendas
CREATE OR REPLACE FUNCTION public.vendas_estatisticas(
  p_de date DEFAULT (now()::date - interval '30 day')::date,
  p_ate date DEFAULT now()::date
) RETURNS TABLE (
  vendas_total bigint,
  vendas_hoje bigint,
  vendas_mes bigint,
  receita_total numeric,
  receita_hoje numeric,
  receita_mes numeric,
  ticket_medio numeric,
  produto_mais_vendido text,
  forma_pagamento_preferida text
) LANGUAGE plpgsql AS $$
DECLARE
  produto_top text;
  pagamento_top text;
BEGIN
  -- Buscar produto mais vendido
  SELECT p.nome INTO produto_top
  FROM public.vendas v
  JOIN public.produtos p ON p.id = v.produto_id
  WHERE v.data::date BETWEEN p_de AND p_ate
  GROUP BY p.id, p.nome
  ORDER BY SUM(v.quantidade) DESC
  LIMIT 1;
  
  -- Buscar forma de pagamento mais usada
  SELECT forma_pagamento INTO pagamento_top
  FROM public.vendas
  WHERE data::date BETWEEN p_de AND p_ate
  GROUP BY forma_pagamento
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint AS vendas_total,
    COUNT(*) FILTER (WHERE data::date = now()::date)::bigint AS vendas_hoje,
    COUNT(*) FILTER (WHERE data::date >= date_trunc('month', now())::date)::bigint AS vendas_mes,
    COALESCE(SUM(valor_total), 0)::numeric AS receita_total,
    COALESCE(SUM(CASE WHEN data::date = now()::date THEN valor_total ELSE 0 END), 0)::numeric AS receita_hoje,
    COALESCE(SUM(CASE WHEN data::date >= date_trunc('month', now())::date THEN valor_total ELSE 0 END), 0)::numeric AS receita_mes,
    COALESCE(AVG(valor_total), 0)::numeric AS ticket_medio,
    COALESCE(produto_top, 'N/A')::text AS produto_mais_vendido,
    COALESCE(pagamento_top, 'N/A')::text AS forma_pagamento_preferida
  FROM public.vendas 
  WHERE data::date BETWEEN p_de AND p_ate;
END;
$$;

-- 3. Função para estatísticas financeiras
CREATE OR REPLACE FUNCTION public.financeiro_dashboard(
  p_de date DEFAULT (now()::date - interval '30 day')::date,
  p_ate date DEFAULT now()::date
) RETURNS TABLE (
  saldo_atual numeric,
  entradas_total numeric,
  saidas_total numeric,
  contas_pagar_pendentes bigint,
  contas_receber_pendentes bigint,
  valor_pagar_pendente numeric,
  valor_receber_pendente numeric,
  fluxo_liquido numeric
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Saldo atual (entradas - saídas)
    COALESCE(
      (SELECT SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END) 
       FROM public.fluxo_caixa), 0
    )::numeric AS saldo_atual,
    
    -- Entradas no período
    COALESCE(
      (SELECT SUM(valor) FROM public.fluxo_caixa 
       WHERE tipo = 'entrada' AND data::date BETWEEN p_de AND p_ate), 0
    )::numeric AS entradas_total,
    
    -- Saídas no período
    COALESCE(
      (SELECT SUM(valor) FROM public.fluxo_caixa 
       WHERE tipo = 'saida' AND data::date BETWEEN p_de AND p_ate), 0
    )::numeric AS saidas_total,
    
    -- Contas a pagar pendentes
    COALESCE(
      (SELECT COUNT(*) FROM public.contas_pagar 
       WHERE status = 'pendente'), 0
    )::bigint AS contas_pagar_pendentes,
    
    -- Contas a receber pendentes
    COALESCE(
      (SELECT COUNT(*) FROM public.contas_receber 
       WHERE status = 'pendente'), 0
    )::bigint AS contas_receber_pendentes,
    
    -- Valor total a pagar
    COALESCE(
      (SELECT SUM(valor) FROM public.contas_pagar 
       WHERE status = 'pendente'), 0
    )::numeric AS valor_pagar_pendente,
    
    -- Valor total a receber
    COALESCE(
      (SELECT SUM(valor) FROM public.contas_receber 
       WHERE status = 'pendente'), 0
    )::numeric AS valor_receber_pendente,
    
    -- Fluxo líquido do período
    COALESCE(
      (SELECT SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END) 
       FROM public.fluxo_caixa WHERE data::date BETWEEN p_de AND p_ate), 0
    )::numeric AS fluxo_liquido;
END;
$$;

-- 4. Função para estatísticas de produtos
CREATE OR REPLACE FUNCTION public.produtos_estatisticas() RETURNS TABLE (
  total_produtos bigint,
  produtos_ativos bigint,
  produtos_inativos bigint,
  produtos_estoque_baixo bigint,
  produtos_sem_estoque bigint,
  valor_estoque_total numeric,
  categorias_total bigint
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint AS total_produtos,
    COUNT(*) FILTER (WHERE ativo = true)::bigint AS produtos_ativos,
    COUNT(*) FILTER (WHERE ativo = false)::bigint AS produtos_inativos,
    COUNT(*) FILTER (WHERE ativo = true AND estoque_atual > 0 AND estoque_atual <= estoque_minimo)::bigint AS produtos_estoque_baixo,
    COUNT(*) FILTER (WHERE ativo = true AND estoque_atual = 0)::bigint AS produtos_sem_estoque,
    COALESCE(SUM(CASE WHEN ativo = true THEN (estoque_atual * preco_custo) ELSE 0 END), 0)::numeric AS valor_estoque_total,
    (SELECT COUNT(*) FROM public.categorias)::bigint AS categorias_total
  FROM public.produtos;
END;
$$;

-- 5. Função para relatório de vendas por período
CREATE OR REPLACE FUNCTION public.vendas_relatorio_periodo(
  p_data_inicio date,
  p_data_fim date,
  p_tipo_pagamento text DEFAULT NULL
) RETURNS TABLE (
  dia date,
  qtd_vendas bigint,
  valor_total numeric,
  ticket_medio numeric,
  forma_pagamento text
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.data::date AS dia,
    COUNT(*)::bigint AS qtd_vendas,
    COALESCE(SUM(v.valor_total), 0)::numeric AS valor_total,
    COALESCE(AVG(v.valor_total), 0)::numeric AS ticket_medio,
    v.forma_pagamento
  FROM public.vendas v
  WHERE 
    v.data::date BETWEEN COALESCE(p_data_inicio, now()::date - 30) AND COALESCE(p_data_fim, now()::date)
    AND (p_tipo_pagamento IS NULL OR v.forma_pagamento = p_tipo_pagamento)
  GROUP BY v.data::date, v.forma_pagamento
  ORDER BY v.data::date DESC, v.forma_pagamento;
END;
$$;

-- 6. Função para buscar ordens com filtros seguros
CREATE OR REPLACE FUNCTION public.ordens_listar(
  p_status text DEFAULT NULL,
  p_cliente_id integer DEFAULT NULL,
  p_prioridade text DEFAULT NULL,
  p_tecnico text DEFAULT NULL,
  p_limite integer DEFAULT 50,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
  id integer,
  numero_ordem text,
  cliente_nome text,
  equipamento text,
  problema text,
  status text,
  prioridade text,
  tecnico text,
  total numeric,
  data_criacao timestamp,
  data_atualizacao timestamp
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.numero_ordem,
    c.nome AS cliente_nome,
    o.equipamento,
    o.problema,
    o.status,
    o.prioridade,
    o.tecnico,
    o.total,
    o.data_criacao,
    o.data_atualizacao
  FROM public.ordens o
  LEFT JOIN public.clientes c ON c.id = o.cliente_id
  WHERE 
    (p_status IS NULL OR o.status = p_status)
    AND (p_cliente_id IS NULL OR o.cliente_id = p_cliente_id)
    AND (p_prioridade IS NULL OR o.prioridade = p_prioridade)
    AND (p_tecnico IS NULL OR o.tecnico = p_tecnico)
  ORDER BY o.data_criacao DESC
  LIMIT p_limite
  OFFSET p_offset;
END;
$$;

-- 7. Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';

-- 8. Comentários para documentação
COMMENT ON FUNCTION public.dashboard_resumo IS 'Função principal para estatísticas do dashboard de ordens';
COMMENT ON FUNCTION public.vendas_estatisticas IS 'Função para estatísticas de vendas com período';
COMMENT ON FUNCTION public.financeiro_dashboard IS 'Função para dashboard financeiro completo';
COMMENT ON FUNCTION public.produtos_estatisticas IS 'Função para estatísticas gerais de produtos';
COMMENT ON FUNCTION public.vendas_relatorio_periodo IS 'Função para relatório de vendas por período';
COMMENT ON FUNCTION public.ordens_listar IS 'Função para listar ordens com filtros seguros';

-- 9. Verificar se as tabelas necessárias existem
DO $$
BEGIN
  -- Verificar tabelas principais
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ordens' AND table_schema = 'public') THEN
    RAISE NOTICE 'AVISO: Tabela ordens não existe - algumas funções podem falhar';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendas' AND table_schema = 'public') THEN
    RAISE NOTICE 'AVISO: Tabela vendas não existe - algumas funções podem falhar';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fluxo_caixa' AND table_schema = 'public') THEN
    RAISE NOTICE 'AVISO: Tabela fluxo_caixa não existe - algumas funções podem falhar';
  END IF;
  
  RAISE NOTICE 'Funções de dashboard criadas com sucesso!';
END $$;