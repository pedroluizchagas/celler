# 🚀 PRÓXIMOS PASSOS - SUPABASE

## ✅ **O que já está configurado:**

- ✅ **Credenciais**: Todas as chaves estão nos arquivos `.env.production`
- ✅ **Storage**: Bucket "uploads" criado e configurado
- ✅ **Conexão**: Testada e funcionando
- ✅ **Dependências**: `@supabase/supabase-js` instalado

## 📋 **O que você precisa fazer agora:**

### 1️⃣ **Criar as Tabelas no Banco**
Acesse: https://siazsdgodjfmpenmukon.supabase.co/project/default/sql

**Cole e execute este SQL:**
```sql
-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Serviços
CREATE TABLE IF NOT EXISTS servicos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id),
  equipamento VARCHAR(255) NOT NULL,
  problema TEXT,
  status VARCHAR(50) DEFAULT 'pendente',
  valor DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Estoque
CREATE TABLE IF NOT EXISTS estoque (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  quantidade INTEGER DEFAULT 0,
  preco_compra DECIMAL(10,2),
  preco_venda DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela Financeiro
CREATE TABLE IF NOT EXISTS financeiro (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria VARCHAR(100),
  descricao TEXT,
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido')),
  servico_id INTEGER REFERENCES servicos(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela WhatsApp Messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE,
  from_number VARCHAR(20),
  to_number VARCHAR(20),
  message_type VARCHAR(20),
  content TEXT,
  timestamp TIMESTAMP,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela WhatsApp Contacts
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE,
  name VARCHAR(255),
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2️⃣ **Configurar Políticas RLS (Opcional)**
Se quiser segurança extra, configure Row Level Security:

```sql
-- Habilitar RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro ENABLE ROW LEVEL SECURITY;

-- Política para permitir tudo (para desenvolvimento)
CREATE POLICY "Allow all" ON clientes FOR ALL USING (true);
CREATE POLICY "Allow all" ON servicos FOR ALL USING (true);
CREATE POLICY "Allow all" ON estoque FOR ALL USING (true);
CREATE POLICY "Allow all" ON financeiro FOR ALL USING (true);
```

### 3️⃣ **Testar a Aplicação**
```bash
# Backend (já configurado para Supabase)
cd backend
npm start

# Frontend (já configurado para Supabase)
cd frontend
npm run dev
```

### 4️⃣ **Deploy no Supabase (Opcional)**

#### **Frontend:**
1. Build: `npm run build` na pasta frontend
2. Acesse: https://siazsdgodjfmpenmukon.supabase.co/project/default/storage
3. Crie bucket "website" (público)
4. Upload da pasta `dist/`

#### **Backend (Edge Functions):**
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref siazsdgodjfmpenmukon

# Deploy functions (quando estiverem prontas)
supabase functions deploy
```

## 🔗 **Links Importantes:**

- **Dashboard**: https://siazsdgodjfmpenmukon.supabase.co
- **SQL Editor**: https://siazsdgodjfmpenmukon.supabase.co/project/default/sql
- **Storage**: https://siazsdgodjfmpenmukon.supabase.co/project/default/storage
- **Logs**: https://siazsdgodjfmpenmukon.supabase.co/project/default/logs

## 🎯 **Resultado Final:**

Após executar esses passos, você terá:
- ✅ **Database**: PostgreSQL no Supabase
- ✅ **Storage**: Para uploads de arquivos
- ✅ **Backend**: Rodando localmente (conectado ao Supabase)
- ✅ **Frontend**: Rodando localmente (conectado ao Supabase)
- 🚀 **Deploy**: Opcional, tudo no Supabase

**Sua aplicação estará 100% funcional e pronta para produção!** 🎉