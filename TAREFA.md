Perfeito. Abaixo está um **prompt único, direto e “produção-first”** para você colar no **Trae (Claude 4 Sonic Max Mode)**. Ele está organizado em **Objetivo → Contexto → Escopo → Mudanças por arquivo (com diffs) → Migrações SQL → Ajustes no front → Testes e validação → Critérios de aceite**.
(O plano assume **CommonJS** no backend.)

---

## PROMPT PARA TRAE

Você é um engenheiro sênior responsável por estabilizar o backend e o frontend do projeto **Assistência Técnica**. Corrija **erros 400/500** das rotas API causados por querystrings vazias, funções SQL ausentes e SELECTs/view inconsistentes; adicione healthchecks; e padronize paginação e tratamento de erros. **Não escreva exemplos**. **Entregue patches prontos**.

### Objetivo

1. Eliminar 400 (“unexpected end of input…”) causados por **query params vazios**.
2. Eliminar 500 em `/api/produtos`, `/api/vendas/estatisticas`.
3. Eliminar 400 em `/api/ordens/stats` criando a função SQL **`public.dashboard_resumo(...)`** e recarregando o schema.
4. Adicionar rotas **`GET /healthz`**, **`GET /readyz`**, **`GET /` e `HEAD /`** para passar no health-check do Render.
5. No frontend, garantir que **nenhum parâmetro vazio** seja enviado (função `buildQuery`) e atualizar chamadas Axios.
6. Entregar **testes manuais (curl)** e **critérios de aceite**.

### Contexto de erros reais observados

* 400 em `/api/ordens`, `/api/categorias`, `/api/financeiro/fluxo-caixa` devido a `?` ou `status=` vazio.
* 400 em `/api/ordens/stats`: “Searched for function public.dashboard_resumo_*… no matches found”.
* 500 em `/api/produtos`: “Perhaps you meant to reference the column "produtos_com_alertas.tipo".”
* 500 em `/api/vendas/estatisticas`: agregação/joins com nulos/filtros não tratados.
* 404 `HEAD /` no Render health-check (não crítico, mas polui logs).

### Escopo e restrições

* Backend Node **CommonJS**. Não migrar para ESM.
* **Sem emojis**. **Sem placeholders vazios**. **Sem código de exemplo genérico**.
* Manter o estilo e estrutura do projeto.
* Criar **middlewares reutilizáveis** e **SQL idempotente** (CREATE OR REPLACE).
* Manter `errorHandler` e `notFoundHandler` existentes.

---

## MUDANÇAS POR ARQUIVO (PATCHES)

> Use diffs unificados. Ajuste caminhos se o repo diferir, mas preserve CommonJS.

### 1) `backend/src/middlewares/normalizeQuery.js` (novo ou sobrescrever)

```diff
+ // CommonJS middleware para limpar querystrings e padronizar paginação
+ function normalizeQuery(req, _res, next) {
+   const q = req.query || {};
+   const cleaned = {};
+   for (const [k, v] of Object.entries(q)) {
+     if (v == null) continue;
+     if (typeof v === 'string' && v.trim() === '') continue;
+     if (Array.isArray(v) && v.length === 0) continue;
+     cleaned[k] = v;
+   }
+   const page = Math.max(1, parseInt(String(cleaned.page ?? '1'), 10) || 1);
+   const limit = Math.min(100, Math.max(1, parseInt(String(cleaned.limit ?? '10'), 10) || 10));
+   cleaned.page = page;
+   cleaned.limit = limit;
+   req.query = cleaned;
+   next();
+ }
+ module.exports = { normalizeQuery };
```

### 2) `backend/src/server.js` — healthchecks e raiz (inserir antes do notFoundHandler)

```diff
 const express = require('express');
 const app = express();
 // ... middlewares globais existentes (cors, json, logger, etc.)
+ const { normalizeQuery } = require('./middlewares/normalizeQuery');

+ // aplicar normalização globalmente (opcional) ou nas rotas de listagem
+ app.use(normalizeQuery);

 // ... mounts de routers /api/*
 
+ // Healthchecks e raiz (Render health-check HEAD /)
+ app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok', service: 'assistencia-tecnica-backend' }));
+ app.get('/readyz', (_req, res) => res.status(200).json({ ready: true }));
+ app.get('/', (_req, res) => res.status(200).send('Assistência Técnica API'));
+ app.head('/', (_req, res) => res.sendStatus(200));
 
 // notFoundHandler e errorHandler devem permanecer por último
```

### 3) `backend/src/routes/ordens.js` — garantir CommonJS e uso correto

```diff
- import { normalizeQuery } from '../middlewares/normalizeQuery.js'
+ const { normalizeQuery } = require('../middlewares/normalizeQuery');

 const router = require('express').Router();
 
 // aplicar normalizeQuery apenas onde importa (se não for global)
 // router.use(normalizeQuery);
```

> Repita import CJS equivalente em `routes/produtos.js`, `routes/vendas.js`, `routes/financeiro.js` se necessário.

### 4) `backend/src/routes/produtos.js` — alinhar SELECT com view correta

* Se o handler seleciona `tipo` de `produtos`, mas a coluna está na **view** `produtos_com_alertas`, padronize para **ler da view** e **expor `tipo`** a partir dela.
* Caso a view não exponha `tipo`, ajuste a view (ver migração SQL abaixo) **ou** remova `tipo` do SELECT do handler.

```diff
- SELECT p.id, p.nome, p.sku, p.tipo, ...
- FROM public.produtos p
+ SELECT id, nome, sku, categoria_id, categoria_nome, tipo, estoque_atual, estoque_minimo, alerta
+ FROM public.produtos_com_alertas
+ -- filtros opcionais aqui, usando req.query limpo
```

### 5) `backend/src/routes/vendas.js` — estatísticas robustas

```diff
- // consulta atual (potencialmente sem tratar nulos)
+ // Use parâmetros e trate nulos/intervalos
  const { de = null, ate = null } = req.query;
  const { data } = await db.query(`
    SELECT
      date_trunc('day', v.data)::date AS dia,
      COUNT(*)::int                 AS qtd_vendas,
      COALESCE(SUM(v.valor_total),0)::numeric AS total
    FROM public.vendas v
    WHERE v.data::date BETWEEN COALESCE($1::date, now()::date - 30)
                           AND COALESCE($2::date, now()::date)
    GROUP BY 1
    ORDER BY 1
  `, [de, ate]);
```

### 6) `backend/src/routes/ordensStats.js` ou onde expõe `/api/ordens/stats`

* Se está chamando RPC/PostgREST, troque para `SELECT * FROM public.dashboard_resumo($1,$2)` com defaults.
* **Importante:** após criar a função SQL, **recarregar schema** do PostgREST (ver migração).

---

## MIGRAÇÕES SQL (idempotentes)

Crie um arquivo de migração (ex.: `backend/migrations/xxx_dashboard_produtos.sql`) e rode no Supabase/DB.

### A) View de produtos com alertas (expondo `tipo`)

```sql
CREATE OR REPLACE VIEW public.produtos_com_alertas AS
SELECT
  p.id,
  p.nome,
  p.sku,
  p.categoria_id,
  c.nome AS categoria_nome,
  /* Caso o front espere 'tipo', garanta aqui. Se não existir em categorias, ajuste conforme seu schema */
  c.tipo AS tipo,
  p.estoque_atual,
  p.estoque_minimo,
  CASE WHEN p.estoque_atual <= p.estoque_minimo THEN 'BAIXO' ELSE 'OK' END AS alerta
FROM public.produtos p
LEFT JOIN public.categorias c ON c.id = p.categoria_id;
```

> Se **não existir `c.tipo`**, remova a coluna do SELECT e **garanta** que o handler do backend **não** selecione `tipo`.

### B) Função do dashboard

```sql
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

-- Recarregar o cache de schema do PostgREST/Supabase:
NOTIFY pgrst, 'reload schema';
```

---

## AJUSTES NO FRONTEND

### 1) `frontend/src/utils/http.ts` (ou util equivalente) — construir query sem params vazios

```diff
+ export function buildQuery(params: Record<string, any> = {}) {
+   const qp = new URLSearchParams();
+   for (const [k, v] of Object.entries(params)) {
+     if (v == null) continue;
+     if (typeof v === 'string' && v.trim() === '') continue;
+     if (Array.isArray(v) && v.length === 0) continue;
+     qp.append(k, String(v));
+   }
+   const s = qp.toString();
+   return s ? `?${s}` : '';
+ }
```

### 2) Atualizar todas as chamadas Axios

```diff
- axios.get(`/api/ordens?${new URLSearchParams(filtros)}`)
+ axios.get(`/api/ordens${buildQuery(filtros)}`)

- axios.get('/api/financeiro/fluxo-caixa?')
+ axios.get(`/api/financeiro/fluxo-caixa${buildQuery({ de, ate, categoria })}`)
```

> Revisar endpoints: `/api/ordens`, `/api/produtos`, `/api/produtos/alertas`, `/api/categorias`, `/api/vendas`, `/api/vendas/estatisticas`, `/api/financeiro/fluxo-caixa`.

---

## TESTES E VALIDAÇÃO (manuais)

```bash
# Health
curl -i https://assistencia-tecnica-1k5g.onrender.com/
curl -i https://assistencia-tecnica-1k5g.onrender.com/healthz
curl -i https://assistencia-tecnica-1k5g.onrender.com/readyz

# Ordens — sem filtros vazios
curl -i "https://assistencia-tecnica-1k5g.onrender.com/api/ordens?page=1&limit=10"

# Erro anterior: "?" vazio (deve não existir mais no front; se bater, backend ignora)
curl -i "https://assistencia-tecnica-1k5g.onrender.com/api/ordens?"

# Dashboard (após criar função e reload schema)
curl -i "https://assistencia-tecnica-1k5g.onrender.com/api/ordens/stats"

# Vendas/estatísticas (com defaults de data)
curl -i "https://assistencia-tecnica-1k5g.onrender.com/api/vendas/estatisticas"

# Produtos pela view (com 'tipo' se existir)
curl -i "https://assistencia-tecnica-1k5g.onrender.com/api/produtos"
```

---

## CRITÉRIOS DE ACEITE

1. **Nenhuma** chamada do frontend envia `?` isolado ou parâmetros vazios (`status=`, `categoria=`).
2. `/api/ordens/stats` retorna 200 e dados válidos (função `public.dashboard_resumo` presente e schema recarregado).
3. `/api/produtos` retorna 200; **sem** erro “Perhaps you meant to reference … tipo”.
4. `/api/vendas/estatisticas` retorna 200 com agregações por dia, usando `COALESCE`.
5. `GET /`, `HEAD /`, `GET /healthz`, `GET /readyz` retornam 200. Health-check do Render sem 404 nos logs.
6. Logs do backend **sem** “unexpected end of input expecting 'not' or operator (eq, gt, …)”.
7. Nenhum 400/500 no dashboard ao carregar ordens, vendas, produtos, categorias, fluxo de caixa.

---

**Execute as mudanças, aplique as migrações SQL e confirme os critérios de aceite. Se algum arquivo tiver nome/caminho levemente diferente, adapte mantendo CommonJS e o conteúdo acima.**
