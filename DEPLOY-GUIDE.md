# 🚀 Guia de Deploy - Sistema de Assistência Técnica

## ✅ Status Atual
- ✅ Sistema funcionando localmente
- ✅ Migração Supabase concluída
- ✅ Frontend e Backend testados
- ✅ CORS configurado

## 🎯 Deploy Recomendado (Gratuito)

### 1. 🔧 Backend - Railway

**Por que Railway?**
- ✅ Gratuito (500h/mês)
- ✅ Deploy automático do GitHub
- ✅ Suporte Node.js nativo
- ✅ Variáveis de ambiente fáceis

**Passos:**
1. Criar conta no [Railway](https://railway.app)
2. Conectar repositório GitHub
3. Selecionar pasta `backend`
4. Configurar variáveis de ambiente
5. Deploy automático!

### 2. 🌐 Frontend - Vercel

**Por que Vercel?**
- ✅ Gratuito ilimitado
- ✅ CDN global
- ✅ Deploy automático
- ✅ Domínio HTTPS grátis

**Passos:**
1. Criar conta no [Vercel](https://vercel.com)
2. Conectar repositório GitHub
3. Selecionar pasta `frontend`
4. Configurar build: `npm run build`
5. Deploy automático!

## 📁 Arquivos de Deploy Criados

### Railway (Backend)
- `railway.json` - Configuração do Railway
- `Procfile` - Comando de start
- `.env.example` - Template de variáveis

### Vercel (Frontend)
- `vercel.json` - Configuração do Vercel
- Build otimizado já configurado

## 🔧 Variáveis de Ambiente

### Backend (Railway)
```env
NODE_ENV=production
PORT=3001
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
JWT_SECRET=seu_jwt_secret_super_seguro
```

### Frontend (Vercel)
```env
REACT_APP_API_URL=https://seu-backend.railway.app/api
REACT_APP_SUPABASE_URL=sua_url_supabase
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima
```

## 🌍 URLs Finais

Após o deploy você terá:
- **Frontend**: `https://assistencia-tecnica.vercel.app`
- **Backend**: `https://seu-projeto.railway.app`
- **Banco**: Supabase (já configurado)

## 🚀 Deploy Alternativo - VPS

Se preferir VPS próprio, temos scripts prontos:
- `deploy-production.sh` (Linux)
- `deploy-production.ps1` (Windows)
- `docker-compose.production.yml` (Docker)

## 📞 Próximos Passos

1. **Escolher opção de deploy**
2. **Configurar contas (Railway + Vercel)**
3. **Fazer upload do código para GitHub**
4. **Configurar variáveis de ambiente**
5. **Testar aplicação em produção**

## 🆘 Suporte

Se precisar de ajuda:
- Railway: [Documentação](https://docs.railway.app)
- Vercel: [Documentação](https://vercel.com/docs)
- Supabase: [Documentação](https://supabase.com/docs)

---

**🎉 Em 30 minutos sua aplicação estará no ar!**