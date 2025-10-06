RLS e Papéis de Acesso

Objetivo
- Ativar Row Level Security (RLS) para tabelas expostas via Supabase e garantir que somente o backend (service role) tenha acesso direto.
- O frontend consome dados apenas via API do backend, evitando 401 inesperado.

Implementação
- Migration: `supabase/migrations/0006_rls_enable.sql` ativa RLS nas tabelas principais (clientes, categorias, produtos, ordens, vendas, etc.).
- Não foram criadas policies para `anon`/`authenticated` — sem políticas, não há acesso direto (negado por padrão com RLS ON).
- O backend utiliza `SUPABASE_SERVICE_ROLE_KEY` (service role), que bypassa RLS e mantém a aplicação funcionando normalmente.

Verificações
1) Backend usa service role:
   - Verifique `backend/src/utils/supabase.js`: o cliente é criado com `SUPABASE_SERVICE_ROLE_KEY`.
2) Frontend não chama Supabase diretamente:
   - As chamadas de UI vão para a API Express (`frontend/src/services/*.js`).
3) Aplicar migrações e conferir diff:
   - `supabase link --project-ref <ref>`
   - `supabase db push --linked`
   - `supabase db diff --linked` → sem pendências.

Cenários futuros (multi-tenant / por usuário)
- Caso seja necessário acesso direto do frontend com chaves públicas, adicione colunas de ownership (ex.: `org_id`, `user_id`) e políticas mínimas, por exemplo:

```
-- Exemplo (ilustrativo): permitir SELECT apenas do tenant do usuário
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_read_produtos ON produtos
  FOR SELECT
  TO authenticated
  USING (org_id = auth.jwt() ->> 'org_id');
```

Enquanto não houver esse requisito, manter sem policies evita exposição indevida.

