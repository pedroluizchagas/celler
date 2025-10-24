# Convenções de Nomenclatura e Estrutura

## Nomes de pacotes
- Raiz: `@celler/monorepo`
- Apps: `@celler/web`, `@celler/api`
- Pacotes compartilhados: `@celler/shared`

## Estrutura do Monorepo
- `apps/web` — Frontend (React + Vite)
- `apps/api` — Backend (Express)
- `packages/shared` — Utilidades/constantes comuns
- `docs` — Documentação

## Variáveis de Ambiente
- Web: `VITE_API_URL` para apontar API quando necessário
- API: `PORT`, `ALLOWED_ORIGINS` e variáveis do Supabase (quando habilitado)

## Endpoints (prefixo)
- API servida sob `/api/*` para manter SPA limpa no Nginx/hosting

## Logs
- Front: logs mais verbosos somente em `DEV`
- API: `pino` nível `info` por padrão

