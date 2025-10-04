# 🚀 Guia de Deploy em Produção

## 📋 Pré-requisitos

### Servidor
- **OS**: Ubuntu 20.04+ ou CentOS 8+
- **RAM**: Mínimo 2GB, recomendado 4GB+
- **CPU**: 2 cores mínimo
- **Disco**: 20GB+ SSD
- **Rede**: IP público com portas 80, 443, 3001 abertas

### Software
- Docker 20.10+
- Docker Compose 2.0+
- Nginx (opcional, se não usar container)
- Certbot para SSL (Let's Encrypt)

## 🔧 Configuração Inicial

### 1. Preparar Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reiniciar sessão para aplicar grupos
logout
```

### 2. Clonar Projeto

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/assistencia-tecnica.git
cd assistencia-tecnica

# Criar estrutura de diretórios
mkdir -p logs uploads ssl backups
chmod 755 logs uploads backups
```

### 3. Configurar SSL

```bash
# Instalar Certbot
sudo apt install certbot -y

# Gerar certificados (substitua seu-dominio.com)
sudo certbot certonly --standalone -d seu-dominio.com -d api.seu-dominio.com

# Copiar certificados
sudo cp /etc/letsencrypt/live/seu-dominio.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/seu-dominio.com/privkey.pem ./ssl/key.pem
sudo chown $USER:$USER ./ssl/*.pem
```

## ⚙️ Configuração de Ambiente

### 1. Backend (.env.production)

```bash
# Copiar template
cp backend/.env.production backend/.env.production.local

# Editar configurações
nano backend/.env.production.local
```

**Configurações obrigatórias:**
```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Segurança
JWT_SECRET=sua-chave-jwt-super-secreta
SESSION_SECRET=sua-chave-sessao-super-secreta
CORS_ORIGIN=https://seu-dominio.com

# Domínio
WHATSAPP_WEBHOOK_URL=https://api.seu-dominio.com/api/whatsapp/webhook
```

### 2. Frontend (.env.production)

```bash
# Copiar template
cp frontend/.env.production frontend/.env.production.local

# Editar configurações
nano frontend/.env.production.local
```

**Configurações obrigatórias:**
```env
# API
REACT_APP_API_URL=https://api.seu-dominio.com/api

# Supabase (mesmas do backend)
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua-chave-anonima
```

## 🐳 Deploy com Docker

### 1. Build das Imagens

```bash
# Backend
cd backend
docker build -f Dockerfile.production -t assistencia-backend .

# Frontend
cd ../frontend
docker build -f Dockerfile.production -t assistencia-frontend .
cd ..
```

### 2. Executar Containers

```bash
# Subir todos os serviços
docker-compose -f docker-compose.production.yml up -d

# Verificar status
docker-compose -f docker-compose.production.yml ps

# Verificar logs
docker-compose -f docker-compose.production.yml logs -f
```

### 3. Verificar Deploy

```bash
# Testar API
curl https://api.seu-dominio.com/api/health

# Testar Frontend
curl https://seu-dominio.com

# Verificar SSL
curl -I https://seu-dominio.com
```

## 🔄 Configuração de Proxy Reverso

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/assistencia-tecnica
server {
    listen 80;
    server_name seu-dominio.com api.seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.seu-dominio.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Monitoramento

### 1. Health Checks

```bash
# Script de monitoramento
cat > monitor.sh << 'EOF'
#!/bin/bash
API_URL="https://api.seu-dominio.com/api/health"
FRONTEND_URL="https://seu-dominio.com"

# Verificar API
if curl -f -s $API_URL > /dev/null; then
    echo "✅ API está funcionando"
else
    echo "❌ API com problemas"
    # Reiniciar container se necessário
    docker-compose -f docker-compose.production.yml restart backend
fi

# Verificar Frontend
if curl -f -s $FRONTEND_URL > /dev/null; then
    echo "✅ Frontend está funcionando"
else
    echo "❌ Frontend com problemas"
    docker-compose -f docker-compose.production.yml restart frontend
fi
EOF

chmod +x monitor.sh
```

### 2. Logs Centralizados

```bash
# Configurar logrotate
sudo cat > /etc/logrotate.d/assistencia-tecnica << 'EOF'
/home/user/assistencia-tecnica/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 user user
}
EOF
```

### 3. Alertas por Email

```bash
# Instalar mailutils
sudo apt install mailutils -y

# Script de alerta
cat > alert.sh << 'EOF'
#!/bin/bash
if ! curl -f -s https://api.seu-dominio.com/api/health > /dev/null; then
    echo "Sistema fora do ar em $(date)" | mail -s "ALERTA: Sistema Assistência Técnica" admin@seu-dominio.com
fi
EOF

# Adicionar ao crontab
echo "*/5 * * * * /home/user/assistencia-tecnica/alert.sh" | crontab -
```

## 🔄 Backup e Recuperação

### 1. Backup Automático

```bash
# Script de backup
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/user/assistencia-tecnica/backups"

# Backup do banco (se usando SQLite local)
if [ -f "./backend/database.db" ]; then
    cp ./backend/database.db $BACKUP_DIR/database_$DATE.db
fi

# Backup de uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz ./uploads/

# Backup de logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz ./logs/

# Limpar backups antigos (manter 30 dias)
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup concluído: $DATE"
EOF

chmod +x backup.sh

# Agendar backup diário
echo "0 2 * * * /home/user/assistencia-tecnica/backup.sh" | crontab -
```

### 2. Recuperação

```bash
# Parar serviços
docker-compose -f docker-compose.production.yml down

# Restaurar banco
cp backups/database_YYYYMMDD_HHMMSS.db backend/database.db

# Restaurar uploads
tar -xzf backups/uploads_YYYYMMDD_HHMMSS.tar.gz

# Reiniciar serviços
docker-compose -f docker-compose.production.yml up -d
```

## 🔧 Manutenção

### 1. Atualizações

```bash
# Backup antes da atualização
./backup.sh

# Atualizar código
git pull origin main

# Rebuild e restart
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d --force-recreate

# Verificar funcionamento
./monitor.sh
```

### 2. Limpeza

```bash
# Limpar imagens Docker antigas
docker system prune -a -f

# Limpar logs antigos
find logs/ -name "*.log" -mtime +30 -delete

# Limpar uploads temporários
find uploads/temp/ -mtime +7 -delete
```

## 🛡️ Segurança

### 1. Firewall

```bash
# Configurar UFW
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3001/tcp  # Bloquear acesso direto à API
```

### 2. Fail2Ban

```bash
# Instalar Fail2Ban
sudo apt install fail2ban -y

# Configurar para Nginx
sudo cat > /etc/fail2ban/jail.local << 'EOF'
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

sudo systemctl restart fail2ban
```

## 📈 Performance

### 1. Otimizações do Sistema

```bash
# Aumentar limites de arquivo
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Otimizar TCP
echo "net.core.somaxconn = 65536" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2. Monitoramento de Performance

```bash
# Instalar htop e iotop
sudo apt install htop iotop -y

# Script de monitoramento
cat > performance.sh << 'EOF'
#!/bin/bash
echo "=== CPU e Memória ==="
top -bn1 | head -5

echo "=== Uso de Disco ==="
df -h

echo "=== Containers Docker ==="
docker stats --no-stream

echo "=== Conexões de Rede ==="
netstat -an | grep :80 | wc -l
netstat -an | grep :443 | wc -l
netstat -an | grep :3001 | wc -l
EOF

chmod +x performance.sh
```

## 🆘 Troubleshooting

### Problemas Comuns

1. **Container não inicia**:
   ```bash
   docker-compose -f docker-compose.production.yml logs backend
   ```

2. **SSL não funciona**:
   ```bash
   sudo certbot renew --dry-run
   ```

3. **Performance lenta**:
   ```bash
   ./performance.sh
   ```

4. **Banco de dados corrompido**:
   ```bash
   # Restaurar backup mais recente
   cp backups/database_LATEST.db backend/database.db
   ```

### Contatos de Suporte

- **Logs**: `/home/user/assistencia-tecnica/logs/`
- **Monitoramento**: `https://seu-dominio.com/admin/monitoring`
- **Documentação**: `https://docs.seu-dominio.com`

---

**Data de Criação**: 27/09/2025  
**Versão**: 1.0  
**Status**: ✅ Pronto para Produção