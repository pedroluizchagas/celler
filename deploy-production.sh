#!/bin/bash

# ===================================
# SCRIPT DE DEPLOY EM PRODUÇÃO
# ===================================

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy em produção..."

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.production.yml" ]; then
    echo "❌ Erro: Execute este script no diretório raiz do projeto"
    exit 1
fi

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Erro: Docker não está rodando"
    exit 1
fi

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose -f docker-compose.production.yml down --remove-orphans || true

# Limpar imagens antigas (opcional)
echo "🧹 Limpando imagens antigas..."
docker system prune -f || true

# Build das imagens
echo "🔨 Construindo imagens Docker..."
docker-compose -f docker-compose.production.yml build --no-cache

# Verificar se os arquivos .env.production existem
if [ ! -f "backend/.env.production" ]; then
    echo "❌ Erro: Arquivo backend/.env.production não encontrado"
    echo "📝 Copie backend/.env.example para backend/.env.production e configure"
    exit 1
fi

if [ ! -f "frontend/.env.production" ]; then
    echo "❌ Erro: Arquivo frontend/.env.production não encontrado"
    echo "📝 Copie frontend/.env.example para frontend/.env.production e configure"
    exit 1
fi

# Criar diretórios necessários
echo "📁 Criando diretórios necessários..."
mkdir -p logs uploads ssl backups
chmod 755 logs uploads backups

# Iniciar containers
echo "🚀 Iniciando containers..."
docker-compose -f docker-compose.production.yml up -d

# Aguardar containers iniciarem
echo "⏳ Aguardando containers iniciarem..."
sleep 30

# Verificar status dos containers
echo "📊 Verificando status dos containers..."
docker-compose -f docker-compose.production.yml ps

# Verificar logs
echo "📋 Últimos logs do backend:"
docker-compose -f docker-compose.production.yml logs --tail=20 backend

echo "📋 Últimos logs do frontend:"
docker-compose -f docker-compose.production.yml logs --tail=20 frontend

# Verificar saúde dos serviços
echo "🏥 Verificando saúde dos serviços..."
sleep 10

# Teste de conectividade
echo "🔍 Testando conectividade..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend está respondendo"
else
    echo "⚠️  Backend não está respondendo - verifique os logs"
fi

if curl -f http://localhost/ > /dev/null 2>&1; then
    echo "✅ Frontend está respondendo"
else
    echo "⚠️  Frontend não está respondendo - verifique os logs"
fi

echo ""
echo "🎉 Deploy concluído!"
echo ""
echo "📍 URLs de acesso:"
echo "   Frontend: http://localhost/ (ou https://seu-dominio.com)"
echo "   Backend:  http://localhost:3001 (ou https://api.seu-dominio.com)"
echo ""
echo "📋 Comandos úteis:"
echo "   Ver logs:      docker-compose -f docker-compose.production.yml logs -f"
echo "   Parar:         docker-compose -f docker-compose.production.yml down"
echo "   Reiniciar:     docker-compose -f docker-compose.production.yml restart"
echo "   Status:        docker-compose -f docker-compose.production.yml ps"
echo ""
echo "⚠️  Lembre-se de:"
echo "   1. Configurar SSL/HTTPS para produção"
echo "   2. Configurar backup automático"
echo "   3. Monitorar logs e performance"
echo "   4. Configurar domínio e DNS"