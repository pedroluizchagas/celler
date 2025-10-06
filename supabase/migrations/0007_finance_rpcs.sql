-- RPCs para relatórios financeiros (Postgres/Supabase)

-- 1) Comparativo entradas vs saídas por mês do ano
CREATE OR REPLACE FUNCTION finance_comparativo(ano integer, meses integer DEFAULT 12)
RETURNS TABLE (
  mes TEXT,
  entradas NUMERIC,
  saidas NUMERIC,
  saldo NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH meses_ref AS (
    SELECT generate_series(1, meses) AS m
  ),
  agg AS (
    SELECT date_trunc('month', data_movimentacao)::date AS mes_ref,
           SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) AS entradas,
           SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) AS saidas
    FROM fluxo_caixa
    WHERE EXTRACT(YEAR FROM data_movimentacao) = ano
    GROUP BY 1
  )
  SELECT to_char(make_date(ano, m, 1), 'MM/YYYY') AS mes,
         COALESCE(a.entradas, 0) AS entradas,
         COALESCE(a.saidas, 0) AS saidas,
         COALESCE(a.entradas, 0) - COALESCE(a.saidas, 0) AS saldo
  FROM meses_ref mr
  LEFT JOIN agg a
    ON a.mes_ref = date_trunc('month', make_date(ano, m, 1))::date
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2) Resumo rápido desde uma data (início do mês, por exemplo)
CREATE OR REPLACE FUNCTION finance_resumo_rapido(desde date)
RETURNS TABLE (
  saldo_atual NUMERIC,
  entradas_total NUMERIC,
  entradas_count INTEGER,
  saidas_total NUMERIC,
  saidas_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(
      (SELECT SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END) FROM fluxo_caixa), 0
    ) AS saldo_atual,
    COALESCE((SELECT SUM(valor) FROM fluxo_caixa WHERE tipo = 'entrada' AND data_movimentacao >= desde), 0) AS entradas_total,
    COALESCE((SELECT COUNT(*) FROM fluxo_caixa WHERE tipo = 'entrada' AND data_movimentacao >= desde), 0) AS entradas_count,
    COALESCE((SELECT SUM(valor) FROM fluxo_caixa WHERE tipo = 'saida' AND data_movimentacao >= desde), 0) AS saidas_total,
    COALESCE((SELECT COUNT(*) FROM fluxo_caixa WHERE tipo = 'saida' AND data_movimentacao >= desde), 0) AS saidas_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3) Contas vencendo hoje (pagar/receber)
CREATE OR REPLACE FUNCTION finance_vencendo_hoje(hoje date)
RETURNS TABLE (
  tipo TEXT,
  count INTEGER,
  total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'pagar'::text AS tipo, COUNT(*), COALESCE(SUM(valor),0)
  FROM contas_pagar 
  WHERE data_vencimento = hoje AND status = 'pendente'
  UNION ALL
  SELECT 'receber'::text AS tipo, COUNT(*), COALESCE(SUM(valor),0)
  FROM contas_receber 
  WHERE data_vencimento = hoje AND status = 'pendente';
END;
$$ LANGUAGE plpgsql STABLE;

-- 4) Estatísticas por período (mês, trimestre, ano)
CREATE OR REPLACE FUNCTION finance_estatisticas(periodo TEXT DEFAULT 'mes', limit_val INTEGER DEFAULT 12)
RETURNS TABLE (
  periodo_label TEXT,
  entradas NUMERIC,
  saidas NUMERIC,
  total_movimentacoes INTEGER
) AS $$
DECLARE
  trunc_unit TEXT;
  fmt TEXT;
BEGIN
  IF periodo = 'trimestre' THEN
    trunc_unit := 'quarter';
    fmt := 'YYYY-"Q"Q';
  ELSIF periodo = 'ano' THEN
    trunc_unit := 'year';
    fmt := 'YYYY';
  ELSE
    trunc_unit := 'month';
    fmt := 'YYYY-MM';
  END IF;

  RETURN QUERY
  SELECT to_char(date_trunc(trunc_unit, data_movimentacao), fmt) AS periodo_label,
         SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) AS entradas,
         SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) AS saidas,
         COUNT(*) AS total_movimentacoes
  FROM fluxo_caixa
  GROUP BY 1
  ORDER BY 1 DESC
  LIMIT limit_val;
END;
$$ LANGUAGE plpgsql STABLE;

