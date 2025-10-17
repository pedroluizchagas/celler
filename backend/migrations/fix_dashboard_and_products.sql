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

-- 6. RPC transacionais (vendas_criar, ordens_criar, ordens_atualizar)

CREATE OR REPLACE FUNCTION public.vendas_criar(
  p_cliente_id integer,
  p_tipo_pagamento text,
  p_desconto numeric DEFAULT 0,
  p_observacoes text DEFAULT NULL,
  p_itens jsonb DEFAULT '[]'::jsonb
) RETURNS public.vendas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda public.vendas%ROWTYPE;
  v_id integer;
  v_total numeric := 0;
  v_item jsonb;
  v_prod record;
  v_qtd integer;
  v_preco numeric;
  v_preco_total numeric;
  v_numerovenda text;
BEGIN
  FOR v_item IN SELECT jsonb_array_elements(p_itens) LOOP
    v_qtd := COALESCE((v_item->>'quantidade')::int, 0);
    v_preco := COALESCE((v_item->>'preco_unitario')::numeric, 0);
    v_total := v_total + (v_qtd * v_preco);
  END LOOP;
  v_total := GREATEST(v_total - COALESCE(p_desconto, 0), 0);

  INSERT INTO public.vendas (cliente_id, tipo_pagamento, desconto, valor_total, observacoes)
  VALUES (p_cliente_id, p_tipo_pagamento, COALESCE(p_desconto,0), v_total, NULLIF(p_observacoes,''))
  RETURNING id INTO v_id;

  v_numerovenda := 'VD' || lpad(v_id::text, 6, '0');
  UPDATE public.vendas SET numero_venda = v_numerovenda WHERE id = v_id;

  FOR v_item IN SELECT jsonb_array_elements(p_itens) LOOP
    v_qtd := COALESCE((v_item->>'quantidade')::int, 0);
    v_preco := COALESCE((v_item->>'preco_unitario')::numeric, 0);
    v_preco_total := v_qtd * v_preco;

    SELECT * INTO v_prod FROM public.produtos WHERE id = (v_item->>'produto_id')::int FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto % não encontrado', (v_item->>'produto_id');
    END IF;
    IF COALESCE(v_prod.estoque_atual,0) < v_qtd THEN
      RAISE EXCEPTION 'Estoque insuficiente para produto %, disponível %', v_prod.nome, v_prod.estoque_atual;
    END IF;

    INSERT INTO public.venda_itens (venda_id, produto_id, quantidade, preco_unitario, preco_total)
    VALUES (v_id, v_prod.id, v_qtd, v_preco, v_preco_total);

    INSERT INTO public.movimentacoes_estoque (
      produto_id, tipo, quantidade, quantidade_anterior, quantidade_atual,
      preco_unitario, valor_total, motivo, observacoes, usuario,
      referencia_id, referencia_tipo
    ) VALUES (
      v_prod.id, 'saida', v_qtd, v_prod.estoque_atual, v_prod.estoque_atual - v_qtd,
      v_preco, v_preco_total, 'venda', 'Venda '||v_numerovenda, 'system', v_id, 'venda'
    );

    UPDATE public.produtos SET estoque_atual = estoque_atual - v_qtd, updated_at = now() WHERE id = v_prod.id;

    DELETE FROM public.alertas_estoque WHERE produto_id = v_prod.id;
    SELECT * INTO v_prod FROM public.produtos WHERE id = v_prod.id;
    IF COALESCE(v_prod.estoque_atual,0) <= COALESCE(v_prod.estoque_minimo,0) THEN
      INSERT INTO public.alertas_estoque (produto_id, tipo, mensagem, ativo)
      VALUES (
        v_prod.id,
        CASE WHEN COALESCE(v_prod.estoque_atual,0) = 0 THEN 'estoque_zerado' ELSE 'estoque_baixo' END,
        CASE WHEN COALESCE(v_prod.estoque_atual,0) = 0 THEN
          'Produto '||v_prod.nome||' está com estoque zerado após venda'
        ELSE
          'Produto '||v_prod.nome||' está com estoque baixo após venda ('||COALESCE(v_prod.estoque_atual,0)||' unidades)'
        END,
        true
      );
    END IF;
  END LOOP;

  IF p_tipo_pagamento <> 'dinheiro' THEN
    INSERT INTO public.contas_receber (descricao, valor, cliente_id, venda_id, data_vencimento, numero_documento, observacoes, status)
    VALUES ('Venda '||v_numerovenda, v_total, p_cliente_id, v_id, now()::date, v_numerovenda, NULLIF(p_observacoes,''), 'pendente');
  ELSE
    INSERT INTO public.fluxo_caixa (tipo, valor, descricao, cliente_id, venda_id, forma_pagamento, data_movimentacao, observacoes, usuario)
    VALUES ('entrada', v_total, 'Venda '||v_numerovenda, p_cliente_id, v_id, p_tipo_pagamento, now()::date, NULLIF(p_observacoes,''), 'system');
  END IF;

  SELECT * INTO v_venda FROM public.vendas WHERE id = v_id;
  RETURN v_venda;
END;
$$;

COMMENT ON FUNCTION public.vendas_criar(integer, text, numeric, text, jsonb) IS 'Cria venda transacional com itens, estoque, alertas e financeiro.';

CREATE OR REPLACE FUNCTION public.ordens_criar(p_payload jsonb)
RETURNS public.ordens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ord public.ordens%ROWTYPE;
  v_id integer;
  v_item jsonb;
BEGIN
  INSERT INTO public.ordens (
    cliente_id, equipamento, marca, modelo, numero_serie,
    defeito_relatado, observacoes, status, prioridade, valor_orcamento, valor_final,
    data_previsao, tecnico_responsavel
  ) VALUES (
    (p_payload->>'cliente_id')::int,
    NULLIF(p_payload->>'equipamento',''), NULLIF(p_payload->>'marca',''), NULLIF(p_payload->>'modelo',''), NULLIF(p_payload->>'numero_serie',''),
    NULLIF(p_payload->>'defeito',''), NULLIF(p_payload->>'observacoes',''), COALESCE(NULLIF(p_payload->>'status',''),'aguardando'), COALESCE(NULLIF(p_payload->>'prioridade',''),'normal'),
    NULLIF(p_payload->>'valor_orcamento','')::numeric, NULLIF(p_payload->>'valor_final','')::numeric,
    NULLIF(p_payload->>'data_previsao','')::date, NULLIF(p_payload->>'tecnico_responsavel','')
  ) RETURNING id INTO v_id;

  FOR v_item IN SELECT jsonb_array_elements(COALESCE(p_payload->'pecas','[]'::jsonb)) LOOP
    INSERT INTO public.ordem_pecas (ordem_id, nome_peca, codigo_peca, quantidade, valor_unitario, valor_total, fornecedor, observacoes)
    VALUES (
      v_id,
      NULLIF(v_item->>'nome_peca',''), NULLIF(v_item->>'codigo_peca',''),
      COALESCE((v_item->>'quantidade')::int,1),
      NULLIF(v_item->>'valor_unitario','')::numeric,
      (COALESCE((v_item->>'quantidade')::int,1) * COALESCE(NULLIF(v_item->>'valor_unitario','')::numeric,0)),
      NULLIF(v_item->>'fornecedor',''), NULLIF(v_item->>'observacoes','')
    );
  END LOOP;

  FOR v_item IN SELECT jsonb_array_elements(COALESCE(p_payload->'servicos','[]'::jsonb)) LOOP
    INSERT INTO public.ordem_servicos (ordem_id, descricao_servico, tempo_gasto, valor_servico, tecnico, observacoes)
    VALUES (
      v_id,
      NULLIF(v_item->>'descricao_servico',''), NULLIF(v_item->>'tempo_gasto',''), NULLIF(v_item->>'valor_servico','')::numeric,
      COALESCE(NULLIF(v_item->>'tecnico',''), NULLIF(p_payload->>'tecnico_responsavel','')), NULLIF(v_item->>'observacoes','')
    );
  END LOOP;

  INSERT INTO public.ordem_historico (ordem_id, status_novo, observacoes, usuario)
  VALUES (v_id, COALESCE(NULLIF(p_payload->>'status',''),'aguardando'), 'Ordem de serviço criada', 'Sistema');

  SELECT * INTO v_ord FROM public.ordens WHERE id = v_id;
  RETURN v_ord;
END;
$$;

COMMENT ON FUNCTION public.ordens_criar(jsonb) IS 'Cria ordem com peças, serviços e histórico em transação.';

CREATE OR REPLACE FUNCTION public.ordens_atualizar(p_id integer, p_payload jsonb)
RETURNS public.ordens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ord public.ordens%ROWTYPE;
  v_old_status text;
  v_new_status text;
  v_item jsonb;
BEGIN
  SELECT * INTO v_ord FROM public.ordens WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ordem % não encontrada', p_id; END IF;

  v_old_status := v_ord.status;

  UPDATE public.ordens SET
    equipamento = COALESCE(NULLIF(p_payload->>'equipamento',''), equipamento),
    marca = NULLIF(p_payload->>'marca',''),
    modelo = NULLIF(p_payload->>'modelo',''),
    numero_serie = NULLIF(p_payload->>'numero_serie',''),
    defeito_relatado = COALESCE(NULLIF(p_payload->>'defeito',''), defeito_relatado),
    observacoes = NULLIF(p_payload->>'observacoes',''),
    status = COALESCE(NULLIF(p_payload->>'status',''), status),
    prioridade = COALESCE(NULLIF(p_payload->>'prioridade',''), prioridade),
    valor_orcamento = NULLIF(p_payload->>'valor_orcamento','')::numeric,
    valor_final = NULLIF(p_payload->>'valor_final','')::numeric,
    data_previsao = NULLIF(p_payload->>'data_previsao','')::date,
    data_conclusao = NULLIF(p_payload->>'data_conclusao','')::date,
    data_entrega = NULLIF(p_payload->>'data_entrega','')::date,
    tecnico_responsavel = NULLIF(p_payload->>'tecnico_responsavel',''),
    updated_at = now()
  WHERE id = p_id;

  DELETE FROM public.ordem_pecas WHERE ordem_id = p_id;
  FOR v_item IN SELECT jsonb_array_elements(COALESCE(p_payload->'pecas','[]'::jsonb)) LOOP
    INSERT INTO public.ordem_pecas (ordem_id, nome_peca, codigo_peca, quantidade, valor_unitario, valor_total, fornecedor, observacoes)
    VALUES (
      p_id,
      NULLIF(v_item->>'nome_peca',''), NULLIF(v_item->>'codigo_peca',''),
      COALESCE((v_item->>'quantidade')::int,1),
      NULLIF(v_item->>'valor_unitario','')::numeric,
      (COALESCE((v_item->>'quantidade')::int,1) * COALESCE(NULLIF(v_item->>'valor_unitario','')::numeric,0)),
      NULLIF(v_item->>'fornecedor',''), NULLIF(v_item->>'observacoes','')
    );
  END LOOP;

  DELETE FROM public.ordem_servicos WHERE ordem_id = p_id;
  FOR v_item IN SELECT jsonb_array_elements(COALESCE(p_payload->'servicos','[]'::jsonb)) LOOP
    INSERT INTO public.ordem_servicos (ordem_id, descricao_servico, tempo_gasto, valor_servico, tecnico, observacoes)
    VALUES (
      p_id,
      NULLIF(v_item->>'descricao_servico',''), NULLIF(v_item->>'tempo_gasto',''), NULLIF(v_item->>'valor_servico','')::numeric,
      COALESCE(NULLIF(v_item->>'tecnico',''), NULLIF(p_payload->>'tecnico_responsavel','')), NULLIF(v_item->>'observacoes','')
    );
  END LOOP;

  SELECT status INTO v_new_status FROM public.ordens WHERE id = p_id;
  IF v_new_status IS DISTINCT FROM v_old_status THEN
    INSERT INTO public.ordem_historico (ordem_id, status_anterior, status_novo, observacoes, usuario)
    VALUES (p_id, v_old_status, v_new_status, 'Status atualizado via RPC', 'Sistema');
  END IF;

  SELECT * INTO v_ord FROM public.ordens WHERE id = p_id;
  RETURN v_ord;
END;
$$;

COMMENT ON FUNCTION public.ordens_atualizar(integer, jsonb) IS 'Atualiza ordem em transação, incluindo peças/serviços e histórico.';

-- 7. Recarregar o cache novamente após criar RPCs
NOTIFY pgrst, 'reload schema';