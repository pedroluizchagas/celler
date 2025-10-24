# Roadmap de Desenvolvimento — Celler

Este roadmap organiza o trabalho em fases, priorizando destravar o uso do sistema no mundo real com entregas incrementais e verificáveis. Baseado no estado atual do repositório.

## 1) Estado Atual

- Frontend React (Vite) já bem avançado em `apps/web` com páginas: Dashboard, Clientes, Ordens, Estoque, PDV, Vendas, Financeiro, Backup, Perfil (rotas em `apps/web/src/App.jsx:38`).
- Serviços do front chamam uma API REST em endpoints como `/clientes`, `/ordens`, `/produtos`, `/vendas`, `/financeiro` (ex.: `apps/web/src/services/ordemService.js:9`, `apps/web/src/services/produtoService.js:59`).
- Config de API centralizada em `apps/web/src/config/api.config.js:1` com fallback para `http://localhost:3001/api`, mas produção retorna placeholder `xxxxxxxxx`.
- Não há backend presente no repo (README menciona `cd backend`, mas a pasta não existe). Nginx para prod aponta para `http://backend:3001` (`apps/web/nginx.conf:66`).
- Supabase preparado no front para Auth opcional (`apps/web/src/lib/supabaseClient.js`), sem variáveis definidas por padrão.
- Documentação detalha domínios de Estoque e Financeiro com endpoints planejados (`docs/SISTEMA-ESTOQUE.md`, `docs/MODULO-FINANCEIRO.md`).
- Arquivo `env/.env.production` contém chaves sensíveis e deve ser removido do versionamento e rotacionado.

## 2) Lacunas e Riscos

- Backend ausente: bloqueia CRUDs de clientes/ordens/produtos/vendas/financeiro, upload de fotos e estatísticas.
- Segredos expostos: `env/.env.production` possui chaves (Supabase) — risco de segurança e compliance.
- Config de API em produção incompleta: `apps/web/src/config/api.config.js` retorna `xxxxxxxxx` quando detecta prod.
- Dev proxy: Vite não tem proxy para `/api`, dependemos de `VITE_API_URL` ou backend local em 3001.
- Caminhos Nginx locais com path de Windows em `nginx-local.conf` (não portável).

## 3) Decisão de Arquitetura (Proposta)

- Backend Node.js + Express em `apps/api`, usando Supabase (Postgres, Storage, Auth) como serviços gerenciados.
  - Persistência via Supabase (tabelas: clientes, ordens, ordem_status_history, ordem_fotos, produtos, categorias, movimentacoes_estoque, vendas, venda_itens, categorias_financeiras, fluxo_caixa, contas_pagar/receber).
  - Uploads: `multer` no Express com envio dos arquivos ao Supabase Storage; salvar path + metadados no DB.
  - Autenticação: Supabase Auth opcional no front; backend inicialmente público com CORS controlado. Evoluir para JWT de serviço ou RLS por etapas.
  - Testes de API com Vitest/Supertest.
- Deploy: Docker Compose (nginx + api + supabase local para dev) e opção de Render/Vercel para produção.

## 4) Roadmap por Fases

Fase 0 — Fundamentos e Segurança (1–2 dias)
- Remover segredos versionados e adicionar `.env.example` seguros; rotacionar chaves Supabase.
- Corrigir `apps/web/src/config/api.config.js` para priorizar `VITE_API_URL` e fallback para `/api` em dev; remover placeholder `xxxxxxxxx`.
- Adicionar Vite proxy opcional para `/api` em dev ou documentar `VITE_API_URL`.
- Padronizar CORS e `withCredentials` no backend (origens locais e produção).

Fase 1 — Backend Mínimo Viável: Clientes e Ordens (3–5 dias)
- Scaffold `apps/api` (Express, zod/validator, multer, supabase-js, pino/logger).
- Modelo e migrações Supabase: `clientes`, `ordens`, `ordem_status_history`, `ordem_fotos`.
- Endpoints:
  - `GET/POST /api/clientes`, `GET/PUT/DELETE /api/clientes/:id`, `GET /api/clientes/search`.
  - `GET/POST /api/ordens`, `GET/PUT/DELETE /api/ordens/:id`, `PATCH /api/ordens/:id/status`, `GET /api/ordens/:id/historico`.
  - Upload: `POST /api/ordens/:id/fotos` (até 5 fotos, 5MB, JPG/PNG/WEBP), salva no Storage e referencia no DB.
- Estatísticas iniciais: `GET /api/ordens/stats` (contagem por status, últimos X dias, faturamento simples de entregues).
- Conectar front já existente (`clienteService`, `ordemService`).

Fase 2 — Estoque e PDV (4–7 dias)
- Tabelas: `produtos`, `categorias`, `movimentacoes_estoque`, `alertas_estoque`.
- Endpoints de `docs/SISTEMA-ESTOQUE.md`: produtos, categorias, movimentação, alertas, busca por código.
- Integração PDV com baixa de estoque e preço.
- Métricas simples de estoque (baixos/zerados).

Fase 3 — Vendas (3–4 dias)
- Tabelas: `vendas`, `venda_itens`.
- Endpoints: `GET/POST /api/vendas`, `GET /api/vendas/:id`, `GET /api/vendas/relatorio`, `GET /api/vendas/estatisticas`.
- Integração PDV → cria venda + baixa estoque; vínculo opcional com ordem.

Fase 4 — Financeiro (4–7 dias)
- Tabelas: `categorias_financeiras`, `fluxo_caixa`, `contas_pagar`, `contas_receber`.
- Endpoints conforme `docs/MODULO-FINANCEIRO.md` (fluxo de caixa, dashboard, categorias, relatórios; placeholders para pagar/receber).
- Integrações: registrar `fluxo_caixa` automático em entregas de ordens e finalização de vendas.

Fase 5 — Autenticação e Políticas (2–4 dias)
- Ativar Supabase Auth no front e proteger rotas sensíveis no backend com verificação de JWT.
- Políticas RLS nas tabelas (multi-tenant opcional para futuro).

Fase 6 — Observabilidade, Qualidade e PWA (2–4 dias)
- Logs estruturados (pino) + correlação de requisições.
- Testes de API (Supertest) e ampliar testes de UI (Vitest + RTL).
- PWA: refinar cache, manifest, experiência offline básica (listar últimas ordens/clientes).

Fase 7 — Deploy (1–3 dias)
- Docker Compose para dev; pipeline de build para web + api.
- Deploy: nginx servindo web, proxy para `api/`; Render/EC2 para `api`; Vercel/Netlify para `web` (ou full Docker).
- Variáveis de ambiente seguras em cada ambiente.

## 5) Entregáveis e Critérios de Aceite por Fase

Fase 0
- Segredos removidos do git; chaves rotacionadas; `.env.example` criado.
- `api.config.js` sem placeholder e com logs apenas em dev.

Fase 1
- CRUD de Clientes/Ordens funcional via UI; upload de até 5 fotos/ordem validado.
- `GET /api/ordens/stats` alimenta cards do Dashboard.

Fase 2
- Página Estoque funcional: criar/editar produto, movimentar estoque, alertas listando corretamente.
- PDV consumindo produtos e refletindo estoque.

Fase 3
- Lista de Vendas e criação via PDV com itens e totais corretos.
- Relatório e estatísticas respondendo filtros básicos.

Fase 4
- Fluxo de caixa listando e somando entradas/saídas; categorias gerenciáveis.
- Integrações automáticas funcionando (venda/ordem → fluxo_caixa).

Fase 5
- Login com magic link (Supabase) no ambiente; endpoints críticos protegidos por JWT.

Fase 6
- Testes mínimos cobrindo rotas principais; logs consistentes; PWA com cache básico.

Fase 7
- Ambiente de produção acessível; rollback strategy simples; documentação de variáveis.

## 6) Ajustes Rápidos Recomendados

- Remover/rotacionar segredos: `env/.env.production` (mover para gerenciador seguro). Não versionar.
- Corrigir URL de produção: `apps/web/src/config/api.config.js` — usar `VITE_API_URL` em produção; fallback para `/api` em dev.
- Avaliar adicionar proxy em `apps/web/vite.config.js` para `/api` em dev.
- Revisar `nginx-local.conf` (paths de Windows) e alinhar com `apps/web/nginx.conf` padrão Linux.

## 7) Próximos Passos (semana atual)

1. Aprovar arquitetura do backend e fases.
2. Criar skeleton `apps/api` (Express) + configuração Supabase + CORS + healthcheck.
3. Implementar Clientes e Ordens (incluindo upload e stats) e integrar com o front.
4. Sanitizar repo de segredos e atualizar `.env.example` (web e api).

Se preferir, posso iniciar imediatamente pela Fase 0 e o skeleton da API.

