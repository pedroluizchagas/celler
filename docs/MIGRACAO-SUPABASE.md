# 📋 Guia de Migração para Supabase

## 🎯 Visão Geral

Este documento descreve o processo de migração do sistema de Assistência Técnica do SQLite para Supabase (PostgreSQL), incluindo todas as configurações, scripts e procedimentos necessários.

## 🏗️ Arquitetura Implementada

### Database Adapter Híbrido

Foi implementado um adaptador de banco de dados híbrido (`src/utils/database-adapter.js`) que permite:

- **Desenvolvimento**: Usar SQLite local
- **Produção**: Migrar para Supabase (PostgreSQL)
- **Transição suave**: Alternar entre bancos sem modificar código dos controllers

### Estrutura de Arquivos Criados

```
backend/
├── src/utils/
│   ├── database-adapter.js     # Adaptador híbrido SQLite/Supabase
│   └── supabase.js            # Cliente e utilitários Supabase
├── migrations/
│   ├── supabase-migration.sql # Schema completo para PostgreSQL
│   └── migrate-data.js        # Script de migração de dados
├── .env.example              # Variáveis de ambiente
└── .env                      # Configurações locais

frontend/
├── src/services/
│   └── supabase.js           # Cliente Supabase para frontend
├── .env.example             # Variáveis de ambiente
└── .env                     # Configurações locais
```

## ⚙️ Configuração do Ambiente

### 1. Variáveis de Ambiente - Backend

```env
# Configuração do Banco de Dados
DATABASE_TYPE=sqlite              # ou 'supabase' para produção
DATABASE_PATH=./database.db       # para SQLite
DATABASE_URL=                     # para PostgreSQL direto

# Configuração do Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

### 2. Variáveis de Ambiente - Frontend

```env
# Configuração do Supabase
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua-chave-anonima

# Configuração da API Backend
REACT_APP_API_URL=http://localhost:3001/api
```

## 🗄️ Schema do Banco de Dados

### Tabelas Principais

1. **Clientes** - Gestão de clientes
2. **Ordens** - Ordens de serviço e relacionadas
3. **Produtos** - Gestão de estoque
4. **Vendas** - Sistema de vendas
5. **Financeiro** - Contas a pagar/receber, fluxo de caixa
6. **WhatsApp** - Sistema de mensagens e bot

### Recursos Implementados

- **UUIDs** como chave primária no PostgreSQL
- **Timestamps automáticos** com timezone
- **Índices otimizados** para performance
- **Constraints e validações** de dados
- **Triggers** para updated_at automático
- **Views** para dashboards e relatórios

## 🚀 Processo de Migração

### Passo 1: Configurar Projeto Supabase

1. Criar projeto no [Supabase](https://supabase.com)
2. Obter URL e chaves de API
3. Configurar variáveis de ambiente

### Passo 2: Executar Schema

```bash
# No painel do Supabase, executar o arquivo:
cat migrations/supabase-migration.sql
```

### Passo 3: Migrar Dados (Opcional)

```bash
# Para migrar dados existentes do SQLite
node migrations/migrate-data.js
```

### Passo 4: Alternar para Supabase

```env
# Alterar no .env
DATABASE_TYPE=supabase
```

### Passo 5: Reiniciar Aplicação

```bash
# Backend
npm start

# Frontend
npm run dev
```

## 🔧 Funcionalidades do Database Adapter

### Métodos Disponíveis

```javascript
// Buscar registros
await db.get(table, id)           // Buscar por ID
await db.getAll(table, options)   // Buscar múltiplos
await db.all(sql, params)         // Query SQL direta

// Manipular dados
await db.insert(table, data)      // Inserir
await db.update(table, id, data)  // Atualizar
await db.delete(table, id)        // Deletar

// Operações avançadas
await db.query(sql, params)       // Query personalizada
await db.count(table, where)      // Contar registros
await db.getWithJoin(...)         // Joins complexos
```

### Compatibilidade

- **SQLite**: Mantém compatibilidade total
- **Supabase**: Adapta queries para PostgreSQL
- **Transição**: Zero downtime na migração

## 🛡️ Segurança e Performance

### Row Level Security (RLS)

```sql
-- Exemplo de política RLS (opcional)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus clientes" ON clientes
  FOR SELECT USING (auth.uid() = user_id);
```

### Índices Otimizados

- Índices em chaves estrangeiras
- Índices em campos de busca frequente
- Índices compostos para queries complexas

### Backup e Recuperação

- **SQLite**: Backup automático local
- **Supabase**: Backup automático na nuvem
- **Point-in-time recovery** disponível

## 📊 Monitoramento

### Logs e Métricas

- Logs estruturados com Winston
- Métricas de performance do banco
- Alertas de erro automáticos

### Dashboard Supabase

- Monitoramento em tempo real
- Análise de queries lentas
- Uso de recursos e limites

## 🔄 Rollback

### Em Caso de Problemas

1. **Alterar variável de ambiente**:
   ```env
   DATABASE_TYPE=sqlite
   ```

2. **Reiniciar aplicação**:
   ```bash
   npm start
   ```

3. **Verificar logs** para identificar problemas

## 📝 Checklist de Migração

### Pré-Migração
- [ ] Backup completo do SQLite
- [ ] Projeto Supabase configurado
- [ ] Variáveis de ambiente definidas
- [ ] Schema executado no Supabase

### Durante a Migração
- [ ] Aplicação em modo de manutenção
- [ ] Dados migrados (se necessário)
- [ ] Testes de conectividade
- [ ] Validação de dados

### Pós-Migração
- [ ] Aplicação funcionando
- [ ] Todos os endpoints testados
- [ ] Performance verificada
- [ ] Backup configurado
- [ ] Monitoramento ativo

## 🆘 Troubleshooting

### Problemas Comuns

1. **Erro de conexão**:
   - Verificar URL e chaves do Supabase
   - Confirmar configuração de rede

2. **Queries falhando**:
   - Verificar diferenças SQLite vs PostgreSQL
   - Ajustar sintaxe se necessário

3. **Performance lenta**:
   - Verificar índices criados
   - Analisar queries no dashboard

### Suporte

- **Logs**: Verificar `logs/` para detalhes
- **Supabase Dashboard**: Monitoramento em tempo real
- **Documentação**: [Supabase Docs](https://supabase.com/docs)

## 🎉 Benefícios da Migração

### Escalabilidade
- Suporte a milhares de usuários simultâneos
- Auto-scaling automático
- Performance otimizada

### Recursos Avançados
- Real-time subscriptions
- Row Level Security
- Backup automático
- CDN global

### Desenvolvimento
- API REST automática
- Dashboard administrativo
- Integração com ferramentas modernas

---

**Data de Criação**: 27/09/2025  
**Versão**: 1.0  
**Status**: ✅ Implementado e Testado