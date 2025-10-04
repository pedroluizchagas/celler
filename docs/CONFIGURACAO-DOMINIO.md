# 🌐 Configuração de Domínio e CORS

## 📍 Onde Definir o CORS_ORIGIN

O `CORS_ORIGIN` no arquivo `.env.production` deve ser configurado com o domínio onde seu frontend estará hospedado.

### 🎯 **Cenários Comuns:**

#### 1. **Hospedagem Gratuita (Recomendado para Início)**

**Vercel (Recomendado):**
```env
CORS_ORIGIN=https://assistencia-tecnica.vercel.app
```

**Netlify:**
```env
CORS_ORIGIN=https://assistencia-tecnica.netlify.app
```

**GitHub Pages:**
```env
CORS_ORIGIN=https://seu-usuario.github.io
```

#### 2. **Domínio Próprio**

**Domínio .com.br:**
```env
CORS_ORIGIN=https://assistencia.saytech.com.br
```

**Domínio .com:**
```env
CORS_ORIGIN=https://assistencia.saytech.com
```

#### 3. **Subdomínio Personalizado**

```env
CORS_ORIGIN=https://sistema.meusite.com.br
```

#### 4. **Múltiplos Domínios**

```env
CORS_ORIGIN=https://meusite.com.br,https://www.meusite.com.br,https://app.meusite.com.br
```

### 🚀 **Processo de Deploy Recomendado:**

#### **Opção 1: Vercel (Mais Fácil)**

1. **Criar conta no Vercel**: https://vercel.com
2. **Conectar repositório GitHub**
3. **Deploy automático**
4. **URL gerada**: `https://seu-projeto.vercel.app`

```bash
# Instalar Vercel CLI
npm i -g vercel

# No diretório frontend
cd frontend
vercel

# Seguir instruções e obter URL
```

#### **Opção 2: Netlify**

1. **Criar conta no Netlify**: https://netlify.com
2. **Arrastar pasta `frontend/dist` após build**
3. **URL gerada**: `https://seu-projeto.netlify.app`

```bash
# Build do frontend
cd frontend
npm run build

# Upload da pasta dist/ no Netlify
```

#### **Opção 3: Domínio Próprio**

1. **Registrar domínio** (Registro.br, GoDaddy, etc.)
2. **Configurar DNS** apontando para seu servidor
3. **Configurar SSL** (Let's Encrypt)

### 🔧 **Configuração Completa de Exemplo:**

```env
# Para produção com Vercel
CORS_ORIGIN=https://assistencia-saytech.vercel.app

# Para produção com domínio próprio
CORS_ORIGIN=https://sistema.saytech.com.br

# Para desenvolvimento
CORS_ORIGIN=http://localhost:3000
```

### 🛡️ **Configuração de Segurança:**

#### **Backend (.env.production):**
```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Seu domínio frontend
CORS_ORIGIN=https://assistencia-saytech.vercel.app

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Secrets (já configurados)
JWT_SECRET=e1glZ+qLoQFgJH9pXMygSjRcbUErkqFYTy9G6OKddWmuMUQM/KFgkmFE/2I/fz7izm3mSMVp7uKwZIWz36RWDg==
SESSION_SECRET=7KZCNO+H+AwfQpw8P/cZja8Vz1tzunyG0ayWvzygt9AvYKNUTyIZEdNbiqj1ETGQSkpfxQeVzff01xCOiroG7A==
```

#### **Frontend (.env.production):**
```env
# URL da sua API (onde o backend estará)
REACT_APP_API_URL=https://api.saytech.com.br/api

# Supabase (mesmas credenciais do backend)
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 📋 **Checklist de Deploy:**

#### **Antes do Deploy:**
- [ ] Definir onde hospedar frontend (Vercel/Netlify/próprio)
- [ ] Definir onde hospedar backend (VPS/Heroku/Railway)
- [ ] Criar projeto Supabase
- [ ] Obter domínio (se necessário)

#### **Configuração:**
- [ ] Configurar CORS_ORIGIN com URL do frontend
- [ ] Configurar REACT_APP_API_URL com URL do backend
- [ ] Configurar credenciais Supabase
- [ ] Testar conexão entre frontend e backend

#### **Pós-Deploy:**
- [ ] Verificar se frontend carrega
- [ ] Verificar se API responde
- [ ] Testar login/cadastro
- [ ] Verificar funcionalidades principais

### 🆘 **Exemplos de URLs Comuns:**

```bash
# Frontend hospedado no Vercel
CORS_ORIGIN=https://assistencia-tecnica-saytech.vercel.app

# Backend hospedado no Railway
REACT_APP_API_URL=https://assistencia-backend-production.up.railway.app/api

# Backend hospedado no Heroku
REACT_APP_API_URL=https://assistencia-saytech.herokuapp.com/api

# Backend em VPS próprio
REACT_APP_API_URL=https://api.saytech.com.br/api
```

### 💡 **Dica:**

Para começar rapidamente, recomendo:
1. **Frontend**: Vercel (gratuito, fácil)
2. **Backend**: Railway ou Render (gratuito para começar)
3. **Banco**: Supabase (gratuito até 500MB)

Assim você tem tudo funcionando sem custos iniciais!

---

**Próximo Passo**: Escolha onde vai hospedar e eu te ajudo a configurar as URLs corretas! 🚀