# Validação de Fluxos (ponta a ponta)

Este roteiro valida os principais fluxos após configurar Supabase.

## 1) Clientes
- Criar e listar clientes (CRUD básico).

```
# Criar
curl -s -X POST http://localhost:3001/api/clientes \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Ana Cliente","telefone":"11988887777"}'

# Buscar
curl -s http://localhost:3001/api/clientes
```

## 2) Ordens de Serviço (com fotos)
- Criar OS, mudar status, histórico, fotos.

```
# Criar OS
curl -s -X POST http://localhost:3001/api/ordens \
  -H 'Content-Type: application/json' \
  -d '{"cliente_id":1,"equipamento":"Xiaomi","problema":"Sem áudio","prioridade":"normal"}'

# Mudar status
curl -s -X PATCH http://localhost:3001/api/ordens/1/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"em_analise","observacoes":"Abrindo aparelho"}'

# Histórico
curl -s http://localhost:3001/api/ordens/1/historico
```

Upload de fotos: use o frontend (página Ordens → visualizar → enviar fotos) ou um cliente REST que suporte `multipart/form-data`.

## 3) Estoque
- Criar produto, movimentar estoque, alertas.

```
# Criar produto
curl -s -X POST http://localhost:3001/api/produtos \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Bateria Samsung","preco_custo":50,"preco_venda":149.9,"estoque_atual":0,"estoque_minimo":1}'

# Alertas
curl -s http://localhost:3001/api/produtos/alertas

# Movimentar estoque (entrada)
curl -s -X POST http://localhost:3001/api/produtos/1/movimentar \
  -H 'Content-Type: application/json' \
  -d '{"tipo":"entrada","quantidade":5,"motivo":"compra","preco_unitario":50}'

# Alertas após movimentação
curl -s http://localhost:3001/api/produtos/alertas
```

## 4) PDV → Vendas
- Criar venda e verificar baixa de estoque.

```
curl -s -X POST http://localhost:3001/api/vendas \
  -H 'Content-Type: application/json' \
  -d '{"cliente_id":null,"tipo_pagamento":"dinheiro","desconto":0,
        "itens":[{"produto_id":1,"quantidade":2,"preco_unitario":149.9}]}'

# Detalhe
curl -s http://localhost:3001/api/vendas/1
```

## 5) Financeiro
- Conferir entradas/saídas e resumo.

```
# Fluxo de caixa
curl -s http://localhost:3001/api/financeiro/fluxo-caixa

# Resumo
curl -s http://localhost:3001/api/financeiro/fluxo-caixa/resumo
```

## 6) Dashboard
- Estatísticas gerais: `GET /api/ordens/stats`.

```
curl -s http://localhost:3001/api/ordens/stats
```

