# Supabase SQL Editor — Run Completa (Alinhamento + RPCs)

Este script unifica tudo que precisa ser aplicado no SQL Editor do Supabase para alinhar o schema com o backend atual, corrigir a view `produtos_com_alertas`, criar/atualizar RPCs (incluindo as transacionais) e recarregar o schema do PostgREST.

Instruções rápidas:
- Cole todo o bloco abaixo no SQL Editor e execute de uma vez.
- O script é idempotente (pode rodar mais de uma vez com segurança).
- Se seu backend usa a Service Role key, as funções SECURITY DEFINER funcionarão sem GRANT adicional; caso contrário, há GRANTs no final (comente/descomente conforme necessário).

```sql
-- ============================================================
-- 0) Extensões
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1) Ajustes de schema para compatibilidade com o backend
--    (Adiciona colunas esperadas e migra dados quando possível)
-- ============================================================

-- 1.1) VENDAS — colunas esperadas
ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS tipo_pagamento text,
  ADD COLUMN IF NOT EXISTS valor_total numeric,
  ADD COLUMN IF NOT EXISTS data_venda timestamptz DEFAULT now();

UPDATE public.vendas SET tipo_pagamento = forma_pagamento
WHERE tipo_pagamento IS NULL AND forma_pagamento IS NOT NULL;

UPDATE public.vendas SET valor_total = total
WHERE valor_total IS NULL AND total IS NOT NULL;

UPDATE public.vendas SET data_venda = created_at
WHERE data_venda IS NULL AND created_at IS NOT NULL;

-- 1.2) VENDA_ITENS — compatibilidade de nome
ALTER TABLE IF EXISTS public.venda_itens
  ADD COLUMN IF NOT EXISTS preco_total numeric;

-- Preenche preco_total a partir de total_item (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'venda_itens' AND column_name = 'total_item'
  ) THEN
    UPDATE public.venda_itens SET preco_total = total_item WHERE preco_total IS NULL;
  END IF;
END $$;

-- 1.3) ORDEM_FOTOS — compatibilidade de nome do caminho
ALTER TABLE IF EXISTS public.ordem_fotos
  ADD COLUMN IF NOT EXISTS caminho text;

UPDATE public.ordem_fotos SET caminho = caminho_arquivo
WHERE caminho IS NULL AND caminho_arquivo IS NOT NULL;

-- 1.4) ORDEM_PECAS — colunas adicionais usadas pelo app
ALTER TABLE IF EXISTS public.ordem_pecas
  ADD COLUMN IF NOT EXISTS nome_peca text,
  ADD COLUMN IF NOT EXISTS codigo_peca text,
  ADD COLUMN IF NOT EXISTS fornecedor text,
  ADD COLUMN IF NOT EXISTS observacoes text;

-- Migra descricao -> nome_peca, se necessário
UPDATE public.ordem_pecas SET nome_peca = descricao
WHERE nome_peca IS NULL AND descricao IS NOT NULL;

-- 1.5) ORDEM_SERVICOS — colunas adicionais usadas pelo app
ALTER TABLE IF EXISTS public.ordem_servicos
  ADD COLUMN IF NOT EXISTS descricao_servico text,
  ADD COLUMN IF NOT EXISTS tempo_gasto integer,
  ADD COLUMN IF NOT EXISTS valor_servico numeric,
  ADD COLUMN IF NOT EXISTS observacoes text;

-- Migração básica para novos nomes
UPDATE public.ordem_servicos
  SET descricao_servico = COALESCE(descricao_servico, descricao),
      valor_servico     = COALESCE(valor_servico, valor)
WHERE TRUE;

-- Opcional: preencher tempo_gasto com tempo_real (se existir), senão tempo_estimado
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ordem_servicos' AND column_name = 'tempo_real'
  ) THEN
    UPDATE public.ordem_servicos SET tempo_gasto = tempo_real WHERE tempo_gasto IS NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ordem_servicos' AND column_name = 'tempo_estimado'
  ) THEN
    UPDATE public.ordem_servicos SET tempo_gasto = COALESCE(tempo_gasto, tempo_estimado) WHERE tempo_gasto IS NULL;
  END IF;
END $$;

-- 1.6) ORDEM_HISTORICO — data de alteração compatível com o app
ALTER TABLE IF EXISTS public.ordem_historico
  ADD COLUMN IF NOT EXISTS data_alteracao timestamptz DEFAULT now();

UPDATE public.ordem_historico SET data_alteracao = created_at
WHERE created_at IS NOT NULL;

-- 1.7) ALERTAS_ESTOQUE — flag ativo usada pelo app
ALTER TABLE IF EXISTS public.alertas_estoque
  ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

UPDATE public.alertas_estoque SET ativo = true WHERE ativo IS NULL;

-- ============================================================
-- 2) View produtos_com_alertas
--    Corrige conflitos de nomes/estrutura e unifica definição
--    Esperada pelo backend: baseada em produtos, não em alertas
-- ============================================================

DROP VIEW IF EXISTS public.produtos_com_alertas CASCADE;

CREATE OR REPLACE VIEW public.produtos_com_alertas AS
SELECT 
  p.id,
  p.nome,
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

-- Herdar RLS das tabelas base (opcional, recomendado)
ALTER VIEW public.produtos_com_alertas SET (security_invoker = true);

-- ============================================================
-- 3) RPCs do dashboard (principais)
-- ============================================================

-- Resumo por mês
CREATE OR REPLACE FUNCTION public.dashboard_resumo_mes(desde date)
RETURNS TABLE (
  aguardando bigint,
  em_andamento bigint,
  aguardando_peca bigint,
  pronto bigint,
  entregue bigint,
  cancelado bigint,
  valor_total numeric,
  valor_entregue numeric,
  valor_pendente numeric
) LANGUAGE sql AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'aguardando'),
    COUNT(*) FILTER (WHERE status = 'em_andamento'),
    COUNT(*) FILTER (WHERE status = 'aguardando_peca'),
    COUNT(*) FILTER (WHERE status = 'pronto'),
    COUNT(*) FILTER (WHERE status = 'entregue'),
    COUNT(*) FILTER (WHERE status = 'cancelado'),
    COALESCE(SUM(valor_final), 0),
    COALESCE(SUM(CASE WHEN status = 'entregue' THEN valor_final ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status <> 'entregue' THEN valor_final ELSE 0 END), 0)
  FROM public.ordens
  WHERE data_entrada::date >= desde;
$$;

-- Resumo do dia
CREATE OR REPLACE FUNCTION public.dashboard_resumo_do_dia(data date)
RETURNS TABLE (
  total_hoje bigint,
  entregues_hoje bigint,
  faturamento_hoje numeric
) LANGUAGE sql AS $$
  SELECT
    COUNT(*) FILTER (WHERE o.data_entrada::date = data),
    COUNT(*) FILTER (WHERE o.data_conclusao::date = data AND o.status = 'entregue'),
    COALESCE(SUM(CASE WHEN o.data_conclusao::date = data AND o.status = 'entregue' THEN o.valor_final ELSE 0 END), 0)
  FROM public.ordens o;
$$;

-- ============================================================
-- 4) RPCs de relatórios/estatísticas de vendas
-- ============================================================

-- Relatório por período (usado na API)
CREATE OR REPLACE FUNCTION public.vendas_relatorio_periodo(
  p_data_inicio date DEFAULT NULL,
  p_data_fim    date DEFAULT NULL,
  p_tipo_pagamento text DEFAULT NULL
) RETURNS TABLE (
  dia date,
  qtd_vendas int,
  valor_total numeric,
  ticket_medio numeric
) LANGUAGE sql AS $$
  SELECT
    (COALESCE(p_data_inicio, (now() - interval '30 day')::date) + i)::date AS dia,
    COALESCE(v.cont, 0)::int AS qtd_vendas,
    COALESCE(v.total, 0)::numeric AS valor_total,
    CASE WHEN COALESCE(v.cont,0) > 0 THEN (COALESCE(v.total,0) / v.cont) ELSE 0 END AS ticket_medio
  FROM generate_series(0, GREATEST(0, (COALESCE(p_data_fim, now()::date) - COALESCE(p_data_inicio, (now() - interval '30 day')::date)))::int)) AS g(i)
  LEFT JOIN (
    SELECT
      (COALESCE(data_venda, created_at))::date AS dia,
      COUNT(*) AS cont,
      COALESCE(SUM(valor_total), 0) AS total
    FROM public.vendas
    WHERE (p_data_inicio IS NULL OR (COALESCE(data_venda, created_at))::date >= p_data_inicio)
      AND (p_data_fim    IS NULL OR (COALESCE(data_venda, created_at))::date <= p_data_fim)
      AND (p_tipo_pagamento IS NULL OR tipo_pagamento = p_tipo_pagamento)
    GROUP BY 1
  ) v ON v.dia = (COALESCE(p_data_inicio, (now() - interval '30 day')::date) + i)::date
  ORDER BY 1 DESC;
$$;

-- ============================================================
-- 5) RPCs transacionais (robustez máxima)
-- ============================================================

-- VENDAS: cria venda com itens, estoque, alertas e financeiro
CREATE OR REPLACE FUNCTION public.vendas_criar(
  p_cliente_id integer,
  p_tipo_pagamento text,
  p_desconto numeric DEFAULT 0,
  p_observacoes text DEFAULT NULL,
  p_itens jsonb DEFAULT '[]'::jsonb
) RETURNS public.vendas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto % não encontrado', (v_item->>'produto_id'); END IF;
    IF COALESCE(v_prod.estoque_atual,0) < v_qtd THEN RAISE EXCEPTION 'Estoque insuficiente para % (disp. %)', v_prod.nome, v_prod.estoque_atual; END IF;

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
        CASE WHEN COALESCE(v_prod.estoque_atual,0) = 0 THEN 'Produto '||v_prod.nome||' está com estoque zerado após venda'
             ELSE 'Produto '||v_prod.nome||' está com estoque baixo após venda ('||COALESCE(v_prod.estoque_atual,0)||' un)'
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
END; $$;

-- ORDENS: criar (transacional)
CREATE OR REPLACE FUNCTION public.ordens_criar(p_payload jsonb)
RETURNS public.ordens
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ord public.ordens%ROWTYPE; v_id integer; v_item jsonb;
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

  SELECT * INTO v_ord FROM public.ordens WHERE id = v_id; RETURN v_ord;
END; $$;

-- ORDENS: atualizar (transacional)
CREATE OR REPLACE FUNCTION public.ordens_atualizar(p_id integer, p_payload jsonb)
RETURNS public.ordens
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ord public.ordens%ROWTYPE; v_old_status text; v_new_status text; v_item jsonb;
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

  SELECT * INTO v_ord FROM public.ordens WHERE id = p_id; RETURN v_ord;
END; $$;

-- ============================================================
-- 6) Grants (somente se o backend NÃO usa Service Role)
--    Comente se for desnecessário
-- ============================================================
GRANT EXECUTE ON FUNCTION public.vendas_criar(integer, text, numeric, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ordens_criar(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ordens_atualizar(integer, jsonb) TO authenticated;

-- ============================================================
-- 7) Recarregar schema do PostgREST
-- ============================================================
SELECT pg_notify('pgrst', 'reload schema');
```

Notas:
- Este script substitui definições antigas da view `produtos_com_alertas` (incluindo versões que partiam de `alertas_estoque`). Agora a view é baseada em `produtos` e expõe `tipo` de `produtos.tipo` (como o backend espera).
- As RPCs transacionais permitem operações atômicas de vendas e ordens; o backend já tenta usá-las e faz fallback se ausentes.
- Caso tenha dependências fortes na view antiga, ajuste-as antes de rodar o DROP VIEW.