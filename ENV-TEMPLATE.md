# 🔧 Variáveis de Ambiente para Deploy

## 🔧 Backend (Railway/Render)

Copie e configure estas variáveis na plataforma de deploy:

```env
NODE_ENV=production
PORT=3001

# Supabase (copie do seu projeto Supabase)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# Segurança (gere uma chave forte)
JWT_SECRET=sua_chave_jwt_super_segura_aqui

# Upload (opcional)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# CORS (será a URL do seu frontend)
CORS_ORIGIN=https://seu-frontend.vercel.app
```

## 🌐 Frontend (Vercel/Netlify)

Configure estas variáveis de ambiente:

```env
# API (será a URL do seu backend)
REACT_APP_API_URL=https://seu-backend.railway.app/api

# Supabase (mesmas do backend)
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima_aqui

# App Info
REACT_APP_NAME=Sistema de Assistência Técnica
REACT_APP_VERSION=1.0.0
```

## 📋 Como Obter as Chaves Supabase

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **URL**: Project URL
   - **ANON_KEY**: anon public
   - **SERVICE_ROLE_KEY**: service_role (⚠️ mantenha secreta!)

## 🔐 Como Gerar JWT_SECRET

Execute no terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## ⚠️ Importante

- **NUNCA** commite arquivos `.env` no GitHub
- Use variáveis de ambiente da plataforma
- Mantenha `SERVICE_ROLE_KEY` secreta
- Teste todas as variáveis após deploy

## 🔄 Atualizando CORS

Após deploy do frontend, atualize no backend:
```env
CORS_ORIGIN=https://sua-url-frontend-real.vercel.app
```