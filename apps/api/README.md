## @celler/api — Backend (Express)

Backend Express que expõe serviços REST usados pelo frontend.

Scripts:
- `npm run dev` — inicia em modo desenvolvimento
- `npm run start` — inicia em produção

Rotas principais:
- `GET /api/health` — healthcheck
- `... /api/clientes` — CRUD de clientes (Supabase)
- `... /api/ordens` — OS + fotos + estatísticas (Supabase)
- `... /api/produtos` — estoque + alertas (Supabase)
- `... /api/categorias` — categorias de produtos (Supabase)
- `... /api/vendas` — PDV + estatísticas (Supabase)
- `... /api/financeiro` — fluxo de caixa e categorias financeiras (Supabase)
- `... /api/backup` — stubs para evitar 404 no front
- `... /api/billing` — stubs para evitar 404 no front

Ambiente (`apps/api/.env`):
- `PORT` (default 3001)
- `ALLOWED_ORIGINS` — lista separada por vírgula
- `SUPABASE_URL` — URL do seu projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — chave service role (NUNCA expor no frontend)
- `SUPABASE_DB_SCHEMA` — schema a usar. Nosso SQL utiliza `api`. Defina `api` aqui

Setup do banco (Supabase):
1. Abra o SQL Editor do seu projeto e rode `docs/SUPABASE_SCHEMA.sql`.
   - O script cria as tabelas no schema `api` (veja a primeira linha: `create schema if not exists api;`).
2. Configure o `.env` do backend com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DB_SCHEMA=api`.
   - Usar a service role evita erros de "permission denied" causados por RLS nas tabelas.
3. (Opcional) Crie o bucket de Storage `ordens` para upload de fotos de OS.

Dica: se não configurar o Supabase, as rotas que consultam o banco retornarão 500 (por permissão/ausência de schema). As rotas `backup` e `billing` existem apenas como stub para desenvolvimento.
