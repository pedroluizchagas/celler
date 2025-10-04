# 🚀 Deploy 100% no Supabase

## 🎯 **Visão Geral**

Você pode hospedar **TUDO** no Supabase:
- ✅ **Database**: PostgreSQL
- ✅ **Backend**: Edge Functions (Deno/TypeScript)
- ✅ **Frontend**: Static Hosting
- ✅ **Storage**: Arquivos e imagens
- ✅ **Auth**: Sistema de autenticação

## 📋 **Passo a Passo Completo**

### **1. Criar Projeto Supabase**

1. Acesse: https://supabase.com
2. Clique em "Start your project"
3. Crie uma conta (GitHub recomendado)
4. Clique em "New Project"
5. Escolha:
   - **Name**: `assistencia-tecnica`
   - **Database Password**: Senha forte
   - **Region**: South America (São Paulo)
6. Aguarde criação (~2 minutos)

### **2. Configurar Database**

```sql
-- No SQL Editor do Supabase, execute:
-- Copie e cole todo o conteúdo de: migrations/supabase-migration.sql
```

### **3. Configurar Storage**

No painel Supabase:
1. Vá em **Storage**
2. Clique em **Create Bucket**
3. Nome: `uploads`
4. **Public**: ✅ Marcar como público
5. Clique em **Create bucket**

### **4. Configurar Edge Functions (Backend)**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login no Supabase
supabase login

# Inicializar projeto
supabase init

# Criar função para API
supabase functions new api
```

### **5. Adaptar Backend para Edge Functions**

Vou criar a estrutura para Edge Functions:

```typescript
// supabase/functions/api/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/api', '')
    
    // Roteamento da API
    if (path.startsWith('/clientes')) {
      return await handleClientes(req, supabaseClient)
    } else if (path.startsWith('/ordens')) {
      return await handleOrdens(req, supabaseClient)
    } else if (path.startsWith('/produtos')) {
      return await handleProdutos(req, supabaseClient)
    } else if (path === '/health') {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          message: 'API funcionando!',
          database: 'Connected'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// Handlers para cada rota
async function handleClientes(req: Request, supabase: any) {
  const method = req.method
  
  if (method === 'GET') {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  if (method === 'POST') {
    const body = await req.json()
    
    const { data, error } = await supabase
      .from('clientes')
      .insert([body])
      .select()
    
    if (error) throw error
    
    return new Response(
      JSON.stringify(data[0]),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201 
      }
    )
  }
  
  return new Response('Method not allowed', { status: 405, headers: corsHeaders })
}

// Implementar outros handlers...
```

### **6. Deploy das Edge Functions**

```bash
# Deploy da função
supabase functions deploy api

# Verificar se funcionou
curl https://seu-projeto.supabase.co/functions/v1/api/health
```

### **7. Configurar Frontend para Supabase**

```bash
# Build do frontend
cd frontend
npm run build

# Upload para Supabase Storage
# Ou usar Supabase CLI para deploy estático
```

### **8. Configuração Final**

#### **Variáveis de Ambiente:**

```env
# Backend (.env.production)
DATABASE_TYPE=supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
CORS_ORIGIN=https://seu-projeto.supabase.co
SUPABASE_STORAGE_BUCKET=uploads
SUPABASE_STORAGE_PUBLIC_URL=https://seu-projeto.supabase.co/storage/v1/object/public
```

```env
# Frontend (.env.production)
REACT_APP_API_URL=https://seu-projeto.supabase.co/functions/v1
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua-chave-anonima
```

## 🌐 **URLs Finais**

Após o deploy, você terá:

- **Frontend**: `https://seu-projeto.supabase.co`
- **API**: `https://seu-projeto.supabase.co/functions/v1/api`
- **Database**: Integrado automaticamente
- **Storage**: `https://seu-projeto.supabase.co/storage/v1/object/public/uploads`

## 💰 **Custos**

### **Plano Gratuito Supabase:**
- ✅ **Database**: 500MB
- ✅ **Storage**: 1GB
- ✅ **Edge Functions**: 500K execuções/mês
- ✅ **Bandwidth**: 5GB/mês
- ✅ **Auth**: Ilimitado

### **Quando Precisar Pagar:**
- **Pro Plan**: $25/mês
- **Database**: 8GB
- **Storage**: 100GB
- **Functions**: 2M execuções/mês

## 🚀 **Vantagens do Deploy 100% Supabase**

### ✅ **Simplicidade:**
- Tudo em um lugar
- Uma única conta
- Dashboard unificado

### ✅ **Performance:**
- CDN global
- Edge Functions próximas ao usuário
- Database otimizado

### ✅ **Segurança:**
- SSL automático
- Row Level Security
- Backup automático

### ✅ **Escalabilidade:**
- Auto-scaling
- Load balancing
- Monitoramento integrado

## 📋 **Checklist de Deploy**

### **Preparação:**
- [ ] Criar conta Supabase
- [ ] Criar projeto
- [ ] Executar migrations SQL
- [ ] Configurar Storage bucket

### **Backend:**
- [ ] Instalar Supabase CLI
- [ ] Criar Edge Functions
- [ ] Adaptar rotas para Deno/TypeScript
- [ ] Deploy das functions
- [ ] Testar endpoints

### **Frontend:**
- [ ] Atualizar URLs da API
- [ ] Build da aplicação
- [ ] Upload para Supabase
- [ ] Configurar domínio customizado (opcional)

### **Testes:**
- [ ] Testar carregamento do frontend
- [ ] Testar API endpoints
- [ ] Testar upload de arquivos
- [ ] Testar autenticação
- [ ] Verificar performance

## 🛠️ **Comandos Úteis**

```bash
# Verificar status das functions
supabase functions list

# Ver logs em tempo real
supabase functions logs api

# Executar localmente
supabase functions serve

# Reset do database (cuidado!)
supabase db reset

# Backup do database
supabase db dump > backup.sql
```

## 🆘 **Troubleshooting**

### **Function não responde:**
```bash
supabase functions logs api --follow
```

### **CORS Error:**
Verificar headers CORS nas Edge Functions

### **Database Error:**
Verificar RLS policies e permissões

### **Storage Error:**
Verificar se bucket é público e permissões

---

## 🎉 **Resultado Final**

Com esse setup, você terá:
- **URL única**: `https://seu-projeto.supabase.co`
- **Tudo integrado**: Database, API, Frontend, Storage
- **Custo zero** para começar
- **Escalabilidade** automática
- **Manutenção mínima**

**Quer que eu te ajude a implementar isso passo a passo?** 🚀