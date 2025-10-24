# Celler - Sistema de Assistência Técnica

Sistema completo de gestão para assistência técnica de celulares e dispositivos eletrônicos.

## Funcionalidades

### Gestão de Clientes

- ✅ Cadastro completo de clientes
- ✅ Busca por nome e telefone
- ✅ Edição e exclusão de registros
- ✅ Histórico de ordens por cliente

### Ordens de Serviço

- ✅ Criação de ordens com upload de fotos
- ✅ 7 status de acompanhamento
- ✅ Orçamento e valor final
- ✅ Controle de prazos
- ✅ Observações detalhadas

### Dashboard Inteligente

- ✅ Estatísticas em tempo real
- ✅ Faturamento mensal automático
- ✅ Ordens por status
- ✅ Histórico de faturamento

### Upload de Fotos

- ✅ Até 5 fotos por ordem
- ✅ Máximo 5MB por foto
- ✅ Formatos: JPG, PNG, WEBP

## Tecnologias

- **Node.js** + Express
- **Supabase** (banco de dados)
- **Multer** (upload de arquivos)
- **CORS** + Helmet (segurança)
- **React** + Vite
- **Material-UI** (interface)
- **Axios** (API calls)
- **React Router** (navegação)

## Status das Ordens

1. **Recebido** - Equipamento chegou
2. **Em Análise** - Diagnosticando problema
3. **Aguardando Peças** - Esperando componentes
4. **Em Reparo** - Consertando equipamento
5. **Pronto** - Reparo finalizado
6. **Entregue** - Cliente retirou
7. **Cancelado** - Ordem cancelada

## Sistema de Faturamento

- Conta apenas ordens **"Entregues"**
- Usa **valor final** quando disponível
- Fallback para **valor do orçamento**
- Relatório mensal automático

## Como Usar

Monorepo com workspaces: `apps/api` (backend) e `apps/web` (frontend).

### 1. Pré‑requisitos

- Node.js 20.x (arquivo `.nvmrc` ajuda a fixar a versão)
- Variáveis de ambiente:
  - Backend: copie `apps/api/.env.example` para `apps/api/.env` e preencha `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DB_SCHEMA=api` (opcional para começar, mas necessário para persistência real).
  - Frontend: opcionalmente defina `apps/web/.env` com `VITE_API_URL=http://localhost:3001/api`.

### 2. Instalar dependências

```bash
npm install
```

### 3. Iniciar serviços em desenvolvimento

Em dois terminais:

```bash
# Backend (Express)
npm run dev:api

# Frontend (Vite)
npm run dev:web
```

### 4. Acessar Sistema

- Frontend: `http://localhost:5173` (ou `http://localhost:3000` conforme Vite)
- API: `http://localhost:3001/api` (healthcheck em `/api/health`)



## Segurança

- ✅ Validação de dados no backend
- ✅ Sanitização de uploads
- ✅ Controle de CORS
- ✅ Headers de segurança

## PWA Ready

Sistema preparado para funcionar como aplicativo móvel:

- ✅ Service Worker configurado
- ✅ Manifest.json criado
- ✅ Interface responsiva
- ✅ Funciona offline (básico)

## Personalização

- **Cores:** Personalizável pelo o usuário
- **Logo:** Upload pelo usuário
- **Tema:** Material Design moderno
- **Tipografia:** Roboto

## Suporte

Sistema desenvolvido Por Celler Tech.

---

**© 2025 (Usuário) - Assistência Técnica Especializada**
# celler
