# Celler SaaS – Proposta Técnica (Supabase + Asaas)

## 1) Objetivos
- Transformar o Celler em um SaaS multi-tenant para assistência técnica em smartphones.
- Banco de dados gerenciado com Supabase (Postgres, Auth, Storage, Edge Functions).
- Cobranças e assinaturas com Asaas (cartão, PIX, boleto) e webhooks confiáveis.
- Segurança por padrão (RLS, RBAC, segregação por tenant, compliance LGPD).
- Arquitetura enxuta, escalável e amigável para desenvolvimento e operação.

## 2) Escopo do MVP
- Gestão de clientes, ordens, estoque, vendas e módulo financeiro (já existentes no front).
- Multi-tenant: isolar dados por `tenant_id` e gerenciar papéis de acesso.
- Autenticação Supabase Auth (email/senha e magic link).
- Assinaturas com Asaas: cadastro de cliente, plano, pagamento e webhooks.
- Painel de faturamento: status do plano, forma de pagamento, histórico de cobranças.
- PWA básico: shell offline e cache de assets críticos.

## 3) Arquitetura
- Frontend SPA: React + Vite + MUI (diretório `apps/` → `apps/web`).
- Backend serverless: Supabase Edge Functions (TypeScript) como BFF.
- Banco/Storage/Auth: Supabase (Postgres com RLS, buckets para fotos de ordens).
- Billing: Asaas (assinaturas, cobranças, portal), webhooks → Edge Function.
- Observabilidade: logs estruturados em Edge Functions, Sentry opcional.
- Deploy: Frontend (Vercel/Netlify), Supabase (gerenciado), DNS customizado.

```
[React SPA] ──(https)──> [Supabase Edge Functions]
                   └──> [Supabase Postgres (RLS)]
                   └──> [Supabase Storage]
                   └──> [Asaas API + Webhooks]
```

## 4) Multi‑Tenancy e RBAC
- Tabelas de domínio sempre com `tenant_id`. Índices por `tenant_id` e datas.
- Tabelas base:
  - `tenants(id, name, status, plan, created_at, ...)`
  - `profiles(user_id -> auth.users.id, name, phone, ...)`
  - `user_tenants(user_id, tenant_id, role)`
- Papéis: `owner`, `admin`, `tech`, `cashier`, `viewer`.
- Políticas RLS (exemplos):
  - Select: `using (tenant_id = auth.jwt()->>'tenant_id')`
  - Insert/Update/Delete: `with check ((auth.jwt()->>'role') in ('owner','admin',...) and tenant_id = auth.jwt()->>'tenant_id')`
- Claims no JWT: `tenant_id`, `role` e `plan`. Atualização via função de onboarding/troca de tenant.

## 5) Banco de Dados (Supabase)
- Domínio (todas com `tenant_id`, `created_at`, `updated_at`):
  - `clientes`, `ordens`, `ordem_status_history`, `ordem_fotos(storage_path)`
  - `produtos`, `categorias`, `movimentacoes_estoque`
  - `vendas`, `venda_itens`
  - `fluxo_caixa`, `categorias_financeiras`, `contas_pagar`, `contas_receber`
- Billing e auditoria:
  - `subscriptions(tenant_id, asaas_customer_id, asaas_subscription_id, plan, status, current_period_start, current_period_end, cancel_at, ...)`
  - `invoices(tenant_id, asaas_payment_id, amount, status, due_date, paid_at, method, ...)`
  - `audit_logs(tenant_id, user_id, action, entity, entity_id, meta, created_at)`
- Storage:
  - Buckets: `orders` e `tenants`.
  - Path padrão fotos: `orders/{tenant_id}/{ordem_id}/{uuid}.jpg`.

## 6) Integração com Asaas
- Conceitos:
  - Cliente Asaas ↔ `tenants`: criar/associar `asaas_customer_id`.
  - Assinatura: planos (Starter/Pro/Enterprise) → `asaas_subscription_id`.
  - Cobranças: pagamentos recorrentes (cartão), PIX e boleto; faturas em `invoices`.
- Fluxos principais:
  1. Onboarding do tenant: cria `tenant`, cria/associa cliente no Asaas, seleciona plano, cria assinatura.
  2. Atualização de plano: muda `plan` e ajusta assinatura (próximo ciclo ou imediato conforme política).
  3. Cobrança: geração/renovação pelo Asaas; o webhook atualiza `subscriptions`/`invoices`.
  4. Cancelamento: solicitado no app → cancela assinatura no Asaas → atualiza `subscriptions`.
- Webhooks (Edge Function `billing-webhook`):
  - Verificação de assinatura HMAC do Asaas (segredo do webhook).
  - Idempotência: armazenar `event_id` processado.
  - Eventos típicos: criação/atualização de pagamento, confirmado/recebido, vencido, cancelado/estornado e ciclo de assinatura. (Usar nomes oficiais do Asaas na implementação.)
  - Atualizações: sincronizar `invoices.status`, `subscriptions.status`, datas de ciclo e acesso do tenant.
- Dunning/retentativas:
  - Usar retentativas do Asaas; refletir no app com banners e e-mails.
  - Grace period configurável (ex.: 3–7 dias) antes de restringir acesso.
- Portal do assinante:
  - Página no app: exibir status do plano, método de pagamento, histórico e links de atualização/cancelamento.
  - Preferível usar links seguros do Asaas quando disponíveis ou fluxo mediado pela Edge Function.

## 7) Edge Functions (BFF)
- Linguagem: TypeScript, validação com `zod`, logs estruturados.
- Middlewares: autenticação (sessão Supabase), verificação de role, rate limiting e correlation-id.
- Endpoints (exemplos):
  - `POST /billing/create-subscription` – cria cliente/assinatura no Asaas para o `tenant_id` da sessão.
  - `POST /billing/webhook` – recebe eventos do Asaas (verificação HMAC + idempotência).
  - `POST /billing/cancel` – cancela a assinatura.
  - `GET  /billing/summary` – resumo de assinatura e últimas faturas.
  - `POST /storage/sign-url` – gera URL assinada para upload seguro de fotos.
- Transações: operações que tocam múltiplas tabelas (ex.: venda + itens + fluxo de caixa) com `BEGIN/COMMIT` atômicos.

## 8) Frontend
- Autenticação: provider com sessão Supabase; troca de tenant (se usuário pertencer a vários).
- Billing UI: seleção de plano, status da assinatura, atualizar pagamento e histórico.
- Integração de uploads: substituir `FormData` por fluxo com URLs assinadas para Storage.
- PWA: manifest, service worker (vite-plugin-pwa), cache shell e placeholders offline.
- Env: padronizar apenas `VITE_*` e carregar config via `import.meta.env`.

## 9) Segurança e Conformidade
- RLS em todas as tabelas (deny-by-default), policies específicas por papel.
- Segredos de produção somente em providers (Vercel/Supabase) – nunca commitados.
- Webhook Asaas: assinatura HMAC obrigatória e allowlist de IPs se aplicável.
- LGPD:
  - Minimização de dados (PII apenas necessária), retenção e descarte por política.
  - Exportação e exclusão de dados do cliente sob demanda.
  - Registro/Auditoria: `audit_logs` para ações sensíveis.
- Aplicar CSP, HSTS e headers de segurança no host do SPA e Nginx quando aplicável.

## 10) Observabilidade e Operação
- Logs e métricas: status das Edge Functions, erros de webhook e taxa de sucesso.
- Alertas: integrações com Sentry/Slack para falhas em billing e operações críticas.
- Backups: snapshots do Supabase, exportações periódicas e testes de restauração.

## 11) Qualidade, DevEx e CI/CD
- Lint (ESLint) + formatação (Prettier) + hooks (Husky) + commit lint.
- Testes:
  - Frontend: unit e integração (Vitest + RTL), mocks de `supabase-js`.
  - Edge Functions: unit de validação e integração contra DB local (`supabase-cli db start`).
- CI em PRs: lint, testes, migrações (dry run) e checagem de policies RLS básicas.

## 12) Variáveis de Ambiente
- Frontend (`VITE_*`):
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `VITE_PWA_ENABLED`, `VITE_APP_NAME`, `VITE_APP_VERSION`
- Edge Functions (server-side):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`
  - `ASAAS_API_KEY`, `ASAAS_ENV` (sandbox|production), `ASAAS_API_BASE`
  - `ASAAS_WEBHOOK_SECRET`, `BILLING_PLAN_*` (ids/códigos de planos)
- Observação: chaves `service_role` e `ASAAS_*` nunca vão para o cliente.

## 13) Roadmap de Implementação
- Fase 0 – Fundações (1–2 semanas)
  - Estruturar monorepo: `apps/frontend`, `supabase/` (migrations, seeds, policies), `supabase/functions`.
  - Autenticação e perfis, RLS e RBAC mínimos, buckets de Storage.
- Fase 1 – Domínio e APIs (2–3 semanas)
  - Ordens/clientes/estoque/vendas/financeiro com Edge Functions e queries tipadas.
  - Upload seguro com URL assinada.
- Fase 2 – Billing Asaas (1–2 semanas)
  - Onboarding, criação de assinatura, resumo de billing e portal do assinante.
  - Webhook com HMAC + idempotência, dunning e grace period.
- Fase 3 – PWA e Observabilidade (1 semana)
  - Manifest + SW, otimizações de performance e Sentry.
- Fase 4 – Endurecimento e QA (1–2 semanas)
  - Testes E2E críticos, revisão de policies RLS e checklist LGPD.

## 14) Critérios de Aceite (MVP)
- Usuário cria conta, organiza um `tenant`, escolhe plano e efetiva pagamento pelo Asaas.
- Acesso e dados isolados por tenant, com papéis respeitando permissões.
- CRUDs principais operam com RLS e logs de auditoria base.
- Webhooks atualizam assinatura e faturas de forma idempotente.
- PWA funcional (instalável) e headers de segurança aplicados.

## 15) Riscos e Mitigações
- Falhas de webhook/billing: idempotência + DLQ (tabela de dead-letters) + reprocessamento manual.
- Escopo de RLS incorreto: testes automáticos para policies e revisão por par.
- Vazamento de segredos: somente providers, monitoramento de commits e CI com detecção.
- Dependência de terceiros: monitorar status do Asaas/Supabase e fallback de comunicação ao cliente.

---

### Próximos Passos
1) Aprovar a proposta e o roadmap.
2) Iniciar Fase 0: estrutura de diretórios, migrations iniciais e policies RLS.
3) Definir planos comerciais e mapear para produtos/planos no Asaas (sandbox primeiro).
4) Configurar ambientes (Supabase, Vercel/Netlify) e segredos.

> Observação: a lista de eventos e campos específicos do Asaas será alinhada durante a Fase 2 conforme documentação oficial (sandbox), garantindo compatibilidade e testes end‑to‑end antes do go‑live.

