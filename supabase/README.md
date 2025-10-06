Supabase Migrations

Como usar a CLI para versionar e aplicar schema:

1) Pré‑requisitos
- Instale a CLI: https://supabase.com/docs/guides/cli
- Tenha as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` configuradas (já usadas no backend).

2) Linkar o projeto

```
supabase link --project-ref siazsdgodjfmpenmukon
```

3) Conferir diferenças do schema

```
supabase db diff --linked
```

4) Aplicar migrações ao projeto

```
supabase db push --linked
```

Estrutura
- `supabase/migrations/0001_initial.sql`: baseline com tabelas principais.
- `supabase/migrations/0002_produtos_enum_fk_fornecedores.sql`: enum `tipo_produto`, default `ativo`, FKs, e tabela `fornecedores`.
- `supabase/migrations/0003_alertas_estoque_ativo.sql`: coluna `ativo` em `alertas_estoque`.
- `supabase/migrations/0004_dashboard_rpcs_views.sql`: view `produtos_com_alertas` e RPCs `dashboard_resumo_do_dia`, `dashboard_resumo_mes`.
- `supabase/migrations/0005_dashboard_more_rpcs.sql`: RPCs `dashboard_prioridade_mes`, `dashboard_ordens_recentes`, `dashboard_tecnicos_ativos`.

Objetivo de consistência
- `produtos.tipo` agora usa enum `'peca' | 'servico'` (default `'peca'`).
- `produtos.ativo` com default `true`.
- `produtos.categoria_id` → `categorias(id)` (ON DELETE SET NULL).
- `produtos.fornecedor_id` → `fornecedores(id)` (ON DELETE SET NULL).

Após aplicar, `supabase db diff` deve retornar sem mudanças pendentes.
