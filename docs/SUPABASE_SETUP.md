# Supabase — Configuração e Validação

Este guia ajuda a preparar o banco (Postgres + Storage) e validar o backend.

## 1) Criar projeto Supabase

1. Acesse supabase.com e crie um projeto.
2. Anote:
   - SUPABASE_URL (Settings → API)
   - SUPABASE_SERVICE_ROLE_KEY (Service role — nunca exponha no frontend)
   - (Opcional) SUPABASE_ANON_KEY (para uso no frontend, se desejar Auth)

> Segurança: rotacione quaisquer chaves que possam ter sido versionadas por engano.

## 2) Aplicar o schema do projeto

No SQL Editor do Supabase, execute o arquivo `docs/SUPABASE_SCHEMA.sql`.

- Ele cria o schema `api` e as tabelas usadas pelo sistema:
  - clientes, ordens, ordem_status_history, ordem_fotos
  - categorias, produtos, movimentacoes_estoque, alertas_estoque
  - vendas, venda_itens
  - categorias_financeiras, fluxo_caixa

## 3) Bucket de Storage

Crie o bucket `ordens` (Settings → Storage → New bucket).

- Pode ser público (o backend já tenta URL pública primeiro) ou privado (o backend gera URL assinada como fallback).

## 4) Backend (.env)

Copie `apps/api/.env.example` para `apps/api/.env` e preencha:

```
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

SUPABASE_URL=... (da API)
SUPABASE_SERVICE_ROLE_KEY=... (service role)
SUPABASE_DB_SCHEMA=api

# Opcional — exigir login para métodos mutativos
REQUIRE_AUTH=false
```

Inicie o backend: `npm run dev:api`

## 5) Validação rápida

Healthcheck:

```
curl -s http://localhost:3001/api/health
```

Clientes (vazio inicialmente):

```
curl -s http://localhost:3001/api/clientes
```

Criar cliente:

```
curl -s -X POST http://localhost:3001/api/clientes \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Cliente Teste","telefone":"11999999999"}'
```

Criar ordem (sem fotos):

```
curl -s -X POST http://localhost:3001/api/ordens \
  -H 'Content-Type: application/json' \
  -d '{"cliente_id":1,"equipamento":"iPhone","problema":"Troca de tela"}'
```

Upload de fotos: use um cliente REST ou o frontend (página Ordens) com FormData.

Estoque/Produto mínimo:

```
curl -s -X POST http://localhost:3001/api/produtos \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Tela iPhone","preco_custo":100,"preco_venda":300,"estoque_atual":10}'
```

PDV/Venda simples (ver `apps/api/src/routes/vendas.js` para payload completo):

```
curl -s -X POST http://localhost:3001/api/vendas \
  -H 'Content-Type: application/json' \
  -d '{"cliente_id":null,"tipo_pagamento":"dinheiro","desconto":0,
        "itens":[{"produto_id":1,"quantidade":1,"preco_unitario":300}]}'
```

Financeiro (fluxo de caixa):

```
curl -s http://localhost:3001/api/financeiro/fluxo-caixa
```

