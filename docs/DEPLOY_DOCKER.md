# Deploy com Docker Compose

Arquivos:
- `deploy/docker-compose.yml` — sobe `backend` (API) e `web` (Nginx + app estático)
- `apps/web/nginx.conf` — proxy `/api/` para `backend:3001`

## 1) Variáveis

Crie um arquivo `.env` dentro de `deploy/` com:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
REQUIRE_AUTH=true
```

No Supabase, aplique `docs/SUPABASE_SCHEMA.sql` antes.

## 2) Build & Run

No diretório `deploy/`:

```
docker compose up --build -d
```

Acesse:
- Web: http://localhost:8080
- API: http://localhost:3001/api/health

## 3) Notas
- O serviço `web` usa o Nginx configurado para proxy `/api/` → `backend:3001`.
- Ajuste `ALLOWED_ORIGINS` no serviço `backend` conforme seu domínio.

