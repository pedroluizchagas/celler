# 📱 Saymon Cell - Sistema de Assistência Técnica

Sistema completo de gestão para assistência técnica de celulares e dispositivos eletrônicos.

## 🚀 Funcionalidades

### 👥 Gestão de Clientes

- ✅ Cadastro completo de clientes
- ✅ Busca por nome e telefone
- ✅ Edição e exclusão de registros
- ✅ Histórico de ordens por cliente

### 🔧 Ordens de Serviço

- ✅ Criação de ordens com upload de fotos
- ✅ 7 status de acompanhamento
- ✅ Orçamento e valor final
- ✅ Controle de prazos
- ✅ Observações detalhadas

### 📊 Dashboard Inteligente

- ✅ Estatísticas em tempo real
- ✅ Faturamento mensal automático
- ✅ Ordens por status
- ✅ Histórico de faturamento

### 📸 Upload de Fotos

- ✅ Até 5 fotos por ordem
- ✅ Máximo 5MB por foto
- ✅ Formatos: JPG, PNG, WEBP

## 🛠️ Tecnologias

### Backend

- **Node.js** + Express
- **SQLite** (banco local)
- **Multer** (upload de arquivos)
- **CORS** + Helmet (segurança)

### Frontend

- **React** + Vite
- **Material-UI** (interface)
- **Axios** (API calls)
- **React Router** (navegação)

## 📋 Status das Ordens

1. **Recebido** - Equipamento chegou
2. **Em Análise** - Diagnosticando problema
3. **Aguardando Peças** - Esperando componentes
4. **Em Reparo** - Consertando equipamento
5. **Pronto** - Reparo finalizado
6. **Entregue** - Cliente retirou
7. **Cancelado** - Ordem cancelada

## 💰 Sistema de Faturamento

- Conta apenas ordens **"Entregues"**
- Usa **valor final** quando disponível
- Fallback para **valor do orçamento**
- Relatório mensal automático

## 🚀 Como Usar

### 1. Iniciar Backend

```bash
cd backend
npm start
```

### 2. Iniciar Frontend

```bash
cd frontend
npm run dev
```

### 3. Acessar Sistema

- **URL:** http://localhost:5173
- **API:** http://localhost:3001

## 📁 Estrutura do Projeto

```
assistencia-tecnica/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   └── utils/
│   ├── uploads/
│   └── database.sqlite
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── theme/
│   └── public/
└── docs/
```

## 🔒 Segurança

- ✅ Validação de dados no backend
- ✅ Sanitização de uploads
- ✅ Controle de CORS
- ✅ Headers de segurança

## 📱 PWA Ready

Sistema preparado para funcionar como aplicativo móvel:

- ✅ Service Worker configurado
- ✅ Manifest.json criado
- ✅ Interface responsiva
- ✅ Funciona offline (básico)

## 🎨 Personalização

- **Cores:** Azul profissional + Laranja tecnológico
- **Logo:** Ícone de celular
- **Tema:** Material Design moderno
- **Tipografia:** Roboto

## 📞 Suporte

Sistema desenvolvido especialmente para **Saymon Cell**.

---

**© 2025 Saymon Cell - Assistência Técnica Especializada**
# celler
