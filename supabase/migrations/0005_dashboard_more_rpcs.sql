-- RPCs auxiliares para dashboard

-- Prioridade no período
CREATE OR REPLACE FUNCTION dashboard_prioridade_mes(desde date)
RETURNS TABLE (
  prioridade TEXT,
  total INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(prioridade, 'normal')::text AS prioridade, COUNT(*) AS total
  FROM ordens
  WHERE data_entrada >= dashboard_prioridade_mes.desde
  GROUP BY COALESCE(prioridade, 'normal');
END;
$$ LANGUAGE plpgsql STABLE;

-- Ordens recentes (com nome do cliente)
CREATE OR REPLACE FUNCTION dashboard_ordens_recentes(lim INTEGER DEFAULT 10)
RETURNS TABLE (
  id INTEGER,
  equipamento TEXT,
  defeito TEXT,
  status TEXT,
  prioridade TEXT,
  data_criacao TIMESTAMPTZ,
  valor_final NUMERIC,
  cliente_nome TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.equipamento,
    o.defeito_relatado AS defeito,
    o.status,
    COALESCE(o.prioridade, 'normal') AS prioridade,
    o.data_entrada AS data_criacao,
    COALESCE(o.valor_final, 0) AS valor_final,
    c.nome AS cliente_nome
  FROM ordens o
  INNER JOIN clientes c ON c.id = o.cliente_id
  ORDER BY o.data_entrada DESC
  LIMIT dashboard_ordens_recentes.lim;
END;
$$ LANGUAGE plpgsql STABLE;

-- Técnicos mais ativos desde uma data
CREATE OR REPLACE FUNCTION dashboard_tecnicos_ativos(desde date, lim INTEGER DEFAULT 5)
RETURNS TABLE (
  tecnico TEXT,
  total_ordens INTEGER,
  concluidas INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.tecnico_responsavel AS tecnico,
    COUNT(*) AS total_ordens,
    COUNT(*) FILTER (WHERE o.status = 'entregue') AS concluidas
  FROM ordens o
  WHERE o.data_entrada >= dashboard_tecnicos_ativos.desde
    AND o.tecnico_responsavel IS NOT NULL
    AND LENGTH(TRIM(o.tecnico_responsavel)) > 0
  GROUP BY o.tecnico_responsavel
  ORDER BY total_ordens DESC
  LIMIT dashboard_tecnicos_ativos.lim;
END;
$$ LANGUAGE plpgsql STABLE;

