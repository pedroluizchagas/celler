# Deploy Manual - Sistema de Assistência Técnica

## Status Atual
✅ Migração para Supabase concluída  
✅ Sistema funcionando localmente (Backend: 3001, Frontend: 5173)  
✅ Build de produção do frontend testado  
❌ Docker daemon com problemas  

## Opções de Deploy

### Opção 1: Resolver Docker e usar containers (Recomendado)

#### Problema Identificado
O Docker daemon não está respondendo corretamente, mesmo com o Docker Desktop em execução.

#### Soluções para tentar:

1. **Reiniciar Docker Desktop:**
   ```powershell
   # Fechar Docker Desktop completamente
   Stop-Process -Name "Docker Desktop" -Force
   
   # Aguardar alguns segundos e reabrir
   Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
   ```

2. **Verificar WSL2 (se usando):**
   ```powershell
   wsl --status
   wsl --update
   ```

3. **Reiniciar serviços Docker:**
   ```powershell
   Restart-Service docker
   ```

#### Após resolver Docker:
```powershell
# Testar Docker
docker --version
docker ps

# Build das imagens
docker-compose -f docker-compose.production.yml build

# Iniciar containers
docker-compose -f docker-compose.production.yml up -d

# Verificar status
docker-compose -f docker-compose.production.yml ps
```

### Opção 2: Deploy Manual sem Docker

#### Backend (Node.js)

1. **Instalar PM2 globalmente:**
   ```powershell
   npm install -g pm2
   ```

2. **Configurar backend para produção:**
   ```powershell
   cd backend
   npm install --production
   ```

3. **Criar arquivo ecosystem.config.js:**
   ```javascript
   module.exports = {
     apps: [{
       name: 'assistencia-backend',
       script: 'src/server.js',
       env: {
         NODE_ENV: 'production',
         PORT: 3001
       },
       env_file: '.env.production',
       instances: 1,
       exec_mode: 'cluster',
       watch: false,
       max_memory_restart: '1G',
       error_file: '../logs/backend-error.log',
       out_file: '../logs/backend-out.log',
       log_file: '../logs/backend-combined.log'
     }]
   }
   ```

4. **Iniciar backend:**
   ```powershell
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

#### Frontend (Nginx)

1. **Instalar Nginx:**
   - Baixar de: https://nginx.org/en/download.html
   - Extrair em C:\nginx

2. **Configurar nginx.conf:**
   ```nginx
   server {
       listen 80;
       server_name localhost;
       root C:/Users/Pedro/Documents/SayTech/assistencia-tecnica/frontend/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api/ {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Iniciar Nginx:**
   ```powershell
   cd C:\nginx
   start nginx
   ```

### Opção 3: Deploy em Servidor VPS

#### Preparação do servidor:
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Instalar Nginx
sudo apt install nginx -y

# Instalar Certbot para SSL
sudo apt install certbot python3-certbot-nginx -y
```

#### Upload e configuração:
```bash
# Fazer upload dos arquivos
scp -r ./backend usuario@servidor:/var/www/assistencia-tecnica/
scp -r ./frontend/dist usuario@servidor:/var/www/assistencia-tecnica/frontend/

# No servidor
cd /var/www/assistencia-tecnica/backend
npm install --production

# Configurar PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configurar Nginx
sudo nano /etc/nginx/sites-available/assistencia-tecnica
sudo ln -s /etc/nginx/sites-available/assistencia-tecnica /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Configurar SSL
sudo certbot --nginx -d seu-dominio.com
```

## Configurações Necessárias

### Variáveis de Ambiente (.env.production)

**Backend:**
```env
NODE_ENV=production
PORT=3001
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
JWT_SECRET=seu_jwt_secret_super_seguro
UPLOAD_DIR=./uploads
```

**Frontend:**
```env
REACT_APP_API_URL=https://seu-dominio.com/api
REACT_APP_SUPABASE_URL=sua_url_supabase
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima
```

## Próximos Passos

1. **Escolher opção de deploy**
2. **Configurar domínio e DNS**
3. **Configurar SSL/HTTPS**
4. **Testar funcionamento completo**
5. **Configurar backups automáticos**

## Monitoramento

### Logs importantes:
- Backend: `logs/backend-*.log`
- Nginx: `/var/log/nginx/`
- PM2: `pm2 logs`

### Comandos úteis:
```powershell
# Status dos serviços
pm2 status
pm2 logs assistencia-backend

# Reiniciar serviços
pm2 restart assistencia-backend
nginx -s reload
```