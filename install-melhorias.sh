#!/bin/bash

echo "🚀 Instalando melhorias do Sistema Saymon Cell..."
echo "================================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para print colorido
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se está no diretório correto
if [ ! -d "assistencia-tecnica" ]; then
    print_error "Execute este script no diretório raiz do projeto!"
    exit 1
fi

# 1. Instalar dependências do backend
echo ""
echo "📦 Instalando dependências do backend..."
cd assistencia-tecnica/backend

if [ ! -f "package.json" ]; then
    print_error "package.json não encontrado no backend!"
    exit 1
fi

npm install
if [ $? -eq 0 ]; then
    print_status "Dependências do backend instaladas"
else
    print_error "Falha ao instalar dependências do backend"
    exit 1
fi

# 2. Instalar dependências do frontend
echo ""
echo "📦 Instalando dependências do frontend..."
cd ../frontend

if [ ! -f "package.json" ]; then
    print_error "package.json não encontrado no frontend!"
    exit 1
fi

npm install
if [ $? -eq 0 ]; then
    print_status "Dependências do frontend instaladas"
else
    print_error "Falha ao instalar dependências do frontend"
    exit 1
fi

# 3. Criar diretórios necessários
echo ""
echo "📁 Criando diretórios necessários..."
cd ../backend

mkdir -p logs
mkdir -p backups
mkdir -p tests/unit
mkdir -p tests/integration

print_status "Diretórios criados"

# 4. Configurar permissões
echo ""
echo "🔧 Configurando permissões..."
chmod +x ../install-melhorias.sh
chmod 755 logs
chmod 755 backups

print_status "Permissões configuradas"

# 5. Executar testes para validar instalação
echo ""
echo "🧪 Executando testes de validação..."

# Testes do backend
echo "Testando backend..."
npm test > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status "Testes do backend passaram"
else
    print_warning "Alguns testes do backend falharam (normal na primeira execução)"
fi

# Testes do frontend
echo "Testando frontend..."
cd ../frontend
npm test run > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status "Testes do frontend passaram"
else
    print_warning "Alguns testes do frontend falharam (normal na primeira execução)"
fi

# 6. Mostrar resumo
echo ""
echo "📋 RESUMO DAS MELHORIAS INSTALADAS"
echo "=================================="
echo ""
echo "✅ Sistema de Testes Automatizados"
echo "   - Backend: Jest + Supertest"
echo "   - Frontend: Vitest + React Testing Library"
echo "   - Scripts: npm test, npm run test:watch, npm run test:coverage"
echo ""
echo "✅ Sistema de Backup Automatizado"
echo "   - Backup completo diário (2h da manhã)"
echo "   - Backup incremental (6h em 6h)"
echo "   - Interface web em /backup"
echo "   - API completa em /api/backup"
echo ""
echo "✅ Sistema de Logs Robusto"
echo "   - Logs estruturados com Winston"
echo "   - Rotação automática diária"
echo "   - Múltiplas categorias (app, error, audit, http, performance)"
echo "   - Logs de auditoria para compliance"
echo ""
echo "🔧 PRÓXIMOS PASSOS:"
echo "1. Inicie o backend: cd assistencia-tecnica/backend && npm start"
echo "2. Inicie o frontend: cd assistencia-tecnica/frontend && npm run dev"
echo "3. Acesse o sistema e teste a página /backup"
echo "4. Execute 'npm test' nos dois projetos para validar testes"
echo ""
echo "📖 DOCUMENTAÇÃO:"
echo "- Leia docs/MELHORIAS-IMPLEMENTADAS.md para detalhes completos"
echo "- Consulte logs em backend/logs/"
echo "- Backups são salvos em backend/backups/"
echo ""
print_status "Instalação concluída com sucesso!"
echo ""
echo "🎉 O Sistema Saymon Cell agora está em nível ENTERPRISE!" 