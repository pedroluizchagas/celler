-- Ativar RLS nas tabelas acessadas pelo frontend (mesmo que o acesso seja via backend)
-- Observação: service_role do backend possui bypass de RLS por padrão no Supabase.

ALTER TABLE clientes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias              ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores            ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_estoque         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordem_fotos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordem_pecas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordem_historico         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordem_servicos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE venda_itens             ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_financeiras  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_receber          ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_pagar            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxo_caixa             ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_financeiras       ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_qr             ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_human_queue    ENABLE ROW LEVEL SECURITY;

-- Sem políticas para anon/authenticated: sem permissões diretas.
-- O backend usa SERVICE ROLE (bypass RLS) conforme implementação.

