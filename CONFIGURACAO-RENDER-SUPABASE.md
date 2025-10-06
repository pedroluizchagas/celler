# Configuração das Chaves Supabase no Render

## 📋 Variáveis de Ambiente Obrigatórias

Para que o backend funcione corretamente no Render, você deve configurar as seguintes variáveis de ambiente:

### 🔑 Variáveis Principais

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `NODE_ENV` | `production` | Define o ambiente como produção |
| `SUPABASE_URL` | `https://siazsdgodjfmpenmukon.supabase.co` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Chave de serviço do Supabase (SECRETA) |

### ⚠️ Importante sobre Segurança

- **NUNCA** use `SUPABASE_ANON_KEY` no backend
- **SEMPRE** use `SUPABASE_SERVICE_ROLE_KEY` no backend
- **NUNCA** exponha a `SERVICE_ROLE_KEY` ao frontend
- A `SERVICE_ROLE_KEY` bypassa RLS (Row Level Security) e tem acesso total

## 🚀 Como Configurar no Render

### 1. Acesse o Dashboard do Render
- Vá para [render.com](https://render.com)
- Faça login na sua conta
- Selecione o serviço do backend

### 2. Configure as Variáveis de Ambiente
- Vá para a aba **Environment**
- Adicione as seguintes variáveis:

```
NODE_ENV=production
SUPABASE_URL=https://siazsdgodjfmpenmukon.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYXpzZGdvZGpmbXBlbm11a29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk4MDU4NywiZXhwIjoyMDc0NTU2NTg3fQ.Y0kQ6t9TU1AmB9Av_rh-U60iN1iBiOP10iAUDWkOMzY
```

### 3. Variáveis Opcionais (mas Recomendadas)
```
JWT_SECRET=e1glZ+qLoQFgJH9pXMygSjRcbUErkqFYTy9G6OKddWmuMUQM/KFgkmFE/2I/fz7izm3mSMVp7uKwZIWz36RWDg==
CORS_ORIGIN=https://assistencia-tecnica-mu.vercel.app
LOG_LEVEL=info
UPLOAD_MAX_SIZE=10485760
WHATSAPP_ENABLED=false
```

## ✅ Verificação de Sucesso

Após configurar as variáveis, o backend deve:

1. **Iniciar sem erros**
2. **Mostrar no log**: `✅ SERVICE ROLE ok`
3. **NÃO mostrar**: `DATABASE_TYPE: undefined`
4. **Health check** em `/api/health` deve retornar:
   ```json
   {
     "status": "OK",
     "services": {
       "database": "connected"
     }
   }
   ```

## 🔧 Troubleshooting

### Erro: "Configurações do Supabase não encontradas"
- Verifique se `SUPABASE_URL` está configurada
- Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada
- Certifique-se de que não há espaços extras nas variáveis

### Erro: "DATABASE_TYPE: undefined"
- ✅ **Correto**: Esta variável foi removida do sistema
- O sistema agora usa apenas Supabase diretamente

### Erro de Conexão com Banco
- Verifique se a `SUPABASE_SERVICE_ROLE_KEY` está correta
- Confirme se o projeto Supabase está ativo
- Verifique se a URL do Supabase está correta

## 📝 Notas Importantes

1. **Segurança**: A `SERVICE_ROLE_KEY` tem acesso total ao banco
2. **Frontend**: Use apenas `SUPABASE_ANON_KEY` no frontend
3. **RLS**: Configure Row Level Security no Supabase para proteger dados
4. **Logs**: Monitore os logs do Render para verificar a inicialização

## 🔄 Deploy Automático

O arquivo `render.yaml` já está configurado para deploy automático. Após fazer push para o branch `main`, o Render irá:

1. Instalar dependências
2. Configurar variáveis de ambiente
3. Iniciar o servidor
4. Verificar health check em `/api/health`

---

**✅ Configuração Concluída**: Seu backend agora está configurado para usar Supabase no Render com máxima segurança!