-- RPCs e Views para Dashboard e Relatórios

-- View: produtos_com_alertas
CREATE OR REPLACE VIEW produtos_com_alertas AS
SELECT 
  p.id,
  p.nome,
  p.descricao,
  p.codigo_barras,
  p.codigo_interno,
  p.categoria_id,
  c.nome AS categoria_nome,
  p.tipo,
  p.preco_custo,
  p.preco_venda,
  p.margem_lucro,
  p.estoque_atual,
  p.estoque_minimo,
  p.estoque_maximo,
  p.localizacao,
  p.ativo,
  COALESCE(a.alertas_ativas, 0) AS alertas_ativas,
  a.ultimo_alerta,
  p.created_at,
  p.updated_at
FROM produtos p
LEFT JOIN categorias c ON c.id = p.categoria_id
LEFT JOIN (
  SELECT 
    produto_id,
    COUNT(*) FILTER (WHERE ativo = true) AS alertas_ativas,
    MAX(created_at) AS ultimo_alerta
  FROM alertas_estoque
  GROUP BY produto_id
) a ON a.produto_id = p.id;

-- RPC: dashboard_resumo_do_dia(data date)
CREATE OR REPLACE FUNCTION dashboard_resumo_do_dia(data date)
RETURNS TABLE (
  total_ordens INTEGER,
  aguardando INTEGER,
  em_andamento INTEGER,
  aguardando_peca INTEGER,
  pronto INTEGER,
  entregue INTEGER,
  cancelado INTEGER,
  valor_total NUMERIC,
  valor_entregue NUMERIC,
  valor_pendente NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT * FROM ordens WHERE DATE(data_entrada) = dashboard_resumo_do_dia.data
  )
  SELECT 
    COUNT(*) AS total_ordens,
    COUNT(*) FILTER (WHERE status = 'aguardando') AS aguardando,
    COUNT(*) FILTER (WHERE status = 'em_andamento') AS em_andamento,
    COUNT(*) FILTER (WHERE status = 'aguardando_peca') AS aguardando_peca,
    COUNT(*) FILTER (WHERE status = 'pronto') AS pronto,
    COUNT(*) FILTER (WHERE status = 'entregue') AS entregue,
    COUNT(*) FILTER (WHERE status = 'cancelado') AS cancelado,
    COALESCE(SUM(COALESCE(valor_final,0)),0) AS valor_total,
    COALESCE(SUM(COALESCE(valor_final,0)) FILTER (WHERE status = 'entregue'),0) AS valor_entregue,
    COALESCE(SUM(COALESCE(valor_final,0)) FILTER (WHERE status IN ('aguardando','em_andamento','aguardando_peca','pronto')),0) AS valor_pendente
  FROM base;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC: dashboard_resumo_mes(desde date)
CREATE OR REPLACE FUNCTION dashboard_resumo_mes(desde date)
RETURNS TABLE (
  total_ordens INTEGER,
  aguardando INTEGER,
  em_andamento INTEGER,
  aguardando_peca INTEGER,
  pronto INTEGER,
  entregue INTEGER,
  cancelado INTEGER,
  valor_total NUMERIC,
  valor_entregue NUMERIC,
  valor_pendente NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT * FROM ordens WHERE data_entrada >= dashboard_resumo_mes.desde
  )
  SELECT 
    COUNT(*) AS total_ordens,
    COUNT(*) FILTER (WHERE status = 'aguardando') AS aguardando,
    COUNT(*) FILTER (WHERE status = 'em_andamento') AS em_andamento,
    COUNT(*) FILTER (WHERE status = 'aguardando_peca') AS aguardando_peca,
    COUNT(*) FILTER (WHERE status = 'pronto') AS pronto,
    COUNT(*) FILTER (WHERE status = 'entregue') AS entregue,
    COUNT(*) FILTER (WHERE status = 'cancelado') AS cancelado,
    COALESCE(SUM(COALESCE(valor_final,0)),0) AS valor_total,
    COALESCE(SUM(COALESCE(valor_final,0)) FILTER (WHERE status = 'entregue'),0) AS valor_entregue,
    COALESCE(SUM(COALESCE(valor_final,0)) FILTER (WHERE status IN ('aguardando','em_andamento','aguardando_peca','pronto')),0) AS valor_pendente
  FROM base;
END;
$$ LANGUAGE plpgsql STABLE;

