-- Schema mínimo para Fase 1 (Clientes e Ordens)

-- Garantir que o schema "api" exista e direcionar o DDL para ele
create schema if not exists api;
set local search_path to api, public;

create table if not exists clientes (
  id bigserial primary key,
  nome text not null,
  telefone text,
  email text,
  endereco jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ordens (
  id bigserial primary key,
  cliente_id bigint references clientes(id) on delete set null,
  equipamento text not null,
  problema text not null,
  status text not null default 'Recebido',
  -- Colunas opcionais esperadas pela UI
  prioridade text default 'normal',
  marca text,
  modelo text,
  numero_serie text,
  tecnico_responsavel text,
  diagnostico text,
  solucao text,
  valor_orcamento numeric(10,2),
  valor_final numeric(10,2),
  pecas jsonb default '[]'::jsonb,
  servicos jsonb default '[]'::jsonb,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Se a tabela já existir, garantir colunas opcionais
alter table if exists ordens add column if not exists prioridade text default 'normal';
alter table if exists ordens add column if not exists marca text;
alter table if exists ordens add column if not exists modelo text;
alter table if exists ordens add column if not exists numero_serie text;
alter table if exists ordens add column if not exists tecnico_responsavel text;
alter table if exists ordens add column if not exists diagnostico text;
alter table if exists ordens add column if not exists solucao text;

create index if not exists ordens_cliente_id_idx on ordens(cliente_id);
create index if not exists ordens_status_idx on ordens(status);
create index if not exists ordens_created_at_idx on ordens(created_at);

create table if not exists ordem_status_history (
  id bigserial primary key,
  ordem_id bigint not null references ordens(id) on delete cascade,
  status text not null,
  observacoes text,
  created_at timestamptz default now()
);

create index if not exists ordem_status_history_ordem_id_idx on ordem_status_history(ordem_id);

create table if not exists ordem_fotos (
  id bigserial primary key,
  ordem_id bigint not null references ordens(id) on delete cascade,
  storage_path text not null,
  mimetype text,
  size bigint,
  created_at timestamptz default now()
);

-- Bucket de Storage recomendado: 'ordens'
-- Configure como público se desejar carregar imagens diretamente pelo front
-- ou mantenha privado e gere URLs assinadas via Edge Functions/API.

-- ==============================
-- ESTOQUE (Produtos/Categorias)
-- ==============================

create table if not exists categorias (
  id bigserial primary key,
  nome text not null unique,
  descricao text,
  icone text,
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists produtos (
  id bigserial primary key,
  nome text not null,
  descricao text,
  codigo_barras text,
  codigo_interno text,
  categoria_id bigint references categorias(id) on delete set null,
  fornecedor_id bigint,
  tipo text not null default 'peca', -- peca | acessorio | servico
  preco_custo numeric(10,2) default 0,
  preco_venda numeric(10,2) default 0,
  margem_lucro numeric(10,2) default 0,
  estoque_atual integer default 0,
  estoque_minimo integer default 0,
  estoque_maximo integer default 0,
  localizacao text,
  observacoes text,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists produtos_codigo_barras_idx on produtos(codigo_barras);
create index if not exists produtos_codigo_interno_idx on produtos(codigo_interno);
create index if not exists produtos_categoria_id_idx on produtos(categoria_id);

create table if not exists movimentacoes_estoque (
  id bigserial primary key,
  produto_id bigint not null references produtos(id) on delete cascade,
  tipo text not null, -- entrada | saida | ajuste | perda | venda | uso_os | estoque_inicial
  quantidade integer not null,
  quantidade_anterior integer,
  quantidade_atual integer,
  preco_unitario numeric(10,2),
  valor_total numeric(10,2),
  motivo text,
  referencia_id bigint,
  referencia_tipo text,
  observacoes text,
  usuario text,
  data_movimentacao timestamptz default now()
);

create index if not exists mov_estoque_produto_id_idx on movimentacoes_estoque(produto_id);
create index if not exists mov_estoque_tipo_idx on movimentacoes_estoque(tipo);

create table if not exists alertas_estoque (
  id bigserial primary key,
  produto_id bigint not null references produtos(id) on delete cascade,
  tipo text not null, -- sem_estoque | estoque_baixo | estoque_alto
  ativo boolean default true,
  data_alerta timestamptz default now(),
  data_resolvido timestamptz
);

create index if not exists alertas_estoque_produto_id_idx on alertas_estoque(produto_id);
create index if not exists alertas_estoque_tipo_idx on alertas_estoque(tipo);

-- ==============================
-- Constraints e Triggers (prod)
-- ==============================

-- Constraints de domínio
alter table if exists produtos
  add constraint produtos_tipo_chk check (tipo in ('peca','acessorio','servico'));

alter table if exists ordens
  add constraint ordens_prioridade_chk check (prioridade in ('baixa','normal','alta','urgente'));

-- Opcional: garantir unicidade quando informado
create unique index if not exists produtos_codigo_interno_uniq on produtos(codigo_interno) where codigo_interno is not null;
create unique index if not exists produtos_codigo_barras_uniq on produtos(codigo_barras) where codigo_barras is not null;

-- Trigger de updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_set_updated_at_ordens'
  ) then
    create trigger trg_set_updated_at_ordens
    before update on ordens
    for each row execute procedure set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_set_updated_at_produtos'
  ) then
    create trigger trg_set_updated_at_produtos
    before update on produtos
    for each row execute procedure set_updated_at();
  end if;
end $$;

-- ==============================
-- VENDAS (PDV)
-- ==============================

create table if not exists vendas (
  id bigserial primary key,
  numero_venda text unique,
  cliente_id bigint references clientes(id) on delete set null,
  tipo_pagamento text not null check (tipo_pagamento in ('dinheiro','cartao','pix','outro')) default 'dinheiro',
  desconto numeric(10,2) default 0,
  valor_total numeric(10,2) default 0,
  observacoes text,
  data_venda timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists vendas_cliente_id_idx on vendas(cliente_id);
create index if not exists vendas_data_venda_idx on vendas(data_venda);

create table if not exists venda_itens (
  id bigserial primary key,
  venda_id bigint not null references vendas(id) on delete cascade,
  produto_id bigint not null references produtos(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10,2) not null check (preco_unitario >= 0),
  total_item numeric(10,2) generated always as (quantidade * preco_unitario) stored
);

create index if not exists venda_itens_venda_id_idx on venda_itens(venda_id);
create index if not exists venda_itens_produto_id_idx on venda_itens(produto_id);

-- ==============================
-- FINANCEIRO (Fluxo de Caixa)
-- ==============================

create table if not exists categorias_financeiras (
  id bigserial primary key,
  nome text not null unique,
  descricao text,
  tipo text not null check (tipo in ('receita','despesa')),
  icone text,
  cor text,
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists fluxo_caixa (
  id bigserial primary key,
  tipo text not null check (tipo in ('entrada','saida')),
  valor numeric(10,2) not null check (valor >= 0),
  categoria_id bigint references categorias_financeiras(id) on delete set null,
  descricao text,
  data_movimentacao timestamptz not null default now(),
  origem_tipo text, -- 'venda' | 'ordem' | 'manual'
  origem_id bigint,
  usuario_id bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists fluxo_caixa_data_idx on fluxo_caixa(data_movimentacao);
create index if not exists fluxo_caixa_tipo_idx on fluxo_caixa(tipo);
create index if not exists fluxo_caixa_origem_idx on fluxo_caixa(origem_tipo, origem_id);
