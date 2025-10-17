# Supabase SQL Editor — Guia de Aplicação/Verificação (Produção)

Este guia descreve exatamente o que verificar e, se necessário, executar no SQL Editor do Supabase para alinhar o banco com as mudanças feitas no backend.

Importante:
- Os scripts abaixo são idempotentes (usam `CREATE OR REPLACE`) e podem ser executados com segurança mais de uma vez.
- Se o backend estiver usando a Service Role key (recomendado), as funções RPC com `SECURITY DEFINER` funcionarão mesmo com RLS ligada.
- Após criar/alterar funções ou views, execute o `NOTIFY pgrst, 'reload schema'` para forçar o PostgREST (API do Supabase) a recarregar o schema.

## 1) Verificações rápidas

Execute no SQL Editor:

```sql
-- Views e RPCs esperados
SELECT EXISTS (
  SELECT 1 FROM information_schema.views
  WHERE table_schema = 'public' AND table_name = 'produtos_com_alertas'
) AS has_produtos_com_alertas;

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('dashboard_resumo_mes','dashboard_resumo_do_dia','vendas_relatorio_periodo');

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('vendas_criar','ordens_criar','ordens_atualizar');
```

Se algum item estiver ausente, aplique os patches das seções seguintes.

## 2) View de produtos com alertas (com coluna `tipo`)

```sql
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
```

## 3) RPCs de Dashboard (se necessário)

Em ambientes onde o runner de migração ainda não aplicou as funções do dashboard, garanta que estas existam (dos arquivos `0004_dashboard_rpcs_views.sql` e `0005_dashboard_more_rpcs.sql`). Se estiverem faltando, recrie ao menos as duas principais:

```sql
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
```

Opcionalmente, aplique também as demais RPCs de `0005_*` (prioridades do mês, ordens recentes, técnicos ativos) conforme necessidade.

## 4) RPCs transacionais (robustez máxima)

Estas funções tornam as operações de **vendas** e **ordens** atômicas. O backend já tenta usá-las; se não existirem, ele faz fallback. Recomendo criá-las.

```sql
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

-- ORDEM: criar
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

-- ORDEM: atualizar
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
```

### Permissões (se o backend NÃO usa Service Role)

Se o backend estiver usando uma API key de `authenticated` (em vez da Service Role), conceda `EXECUTE` para o papel correspondente:

```sql
GRANT EXECUTE ON FUNCTION public.vendas_criar(integer, text, numeric, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ordens_criar(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ordens_atualizar(integer, jsonb) TO authenticated;
```

## 5) Recarregar o schema do PostgREST

```sql
NOTIFY pgrst, 'reload schema';
-- ou
SELECT pg_notify('pgrst', 'reload schema');
```

## 6) Smoke tests (opcional) — com ROLLBACK

Para validar rapidamente sem persistir alterações, use transação manual e `ROLLBACK`.

```sql
BEGIN;
-- CUIDADO: ajuste IDs e itens de teste!
-- Exemplo de simulação de venda transacional
SELECT public.vendas_criar(
  p_cliente_id := NULL,
  p_tipo_pagamento := 'dinheiro',
  p_desconto := 0,
  p_observacoes := 'Teste via SQL Editor',
  p_itens := '[{"produto_id": 1, "quantidade": 1, "preco_unitario": 10}]'::jsonb
);
ROLLBACK;
```

## 7) Notas
- Se as funções do dashboard (`dashboard_resumo_mes`, `dashboard_resumo_do_dia`, etc.) já existirem, não há problema: este guia usa `CREATE OR REPLACE`.
- O backend já aplica automaticamente as migrações na subida (Render/produção). Use este guia apenas se quiser antecipar no SQL Editor, corrigir ambientes travados ou validar manualmente.
- Com RLS habilitado, `SECURITY DEFINER` e a Service Role key garantem execução sem bloqueios. Se usar outra API key, revise/políticas e `GRANT EXECUTE`.