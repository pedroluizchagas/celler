# Deploy em Producao - Windows
param(
    [switch]$SkipBuild = $false,
    [switch]$SkipCleanup = $false
)

$ErrorActionPreference = "Stop"

Write-Host "Iniciando deploy em producao..." -ForegroundColor Green

# Verificar se estamos no diretorio correto
if (-not (Test-Path "docker-compose.production.yml")) {
    Write-Host "Erro: Execute este script no diretorio raiz do projeto" -ForegroundColor Red
    exit 1
}

# Verificar se Docker esta rodando
try {
    docker info | Out-Null
} catch {
    Write-Host "Erro: Docker nao esta rodando" -ForegroundColor Red
    exit 1
}

# Parar containers existentes
Write-Host "Parando containers existentes..." -ForegroundColor Yellow
try {
    docker-compose -f docker-compose.production.yml down --remove-orphans
} catch {
    Write-Host "Nenhum container estava rodando" -ForegroundColor Yellow
}

# Build das imagens
if (-not $SkipBuild) {
    Write-Host "Construindo imagens Docker..." -ForegroundColor Cyan
    docker-compose -f docker-compose.production.yml build --no-cache
}

# Verificar arquivos .env.production
if (-not (Test-Path "backend\.env.production")) {
    Write-Host "Erro: Arquivo backend\.env.production nao encontrado" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "frontend\.env.production")) {
    Write-Host "Erro: Arquivo frontend\.env.production nao encontrado" -ForegroundColor Red
    exit 1
}

# Criar diretorios necessarios
Write-Host "Criando diretorios necessarios..." -ForegroundColor Cyan
$directories = @("logs", "uploads", "ssl", "backups")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Criado: $dir" -ForegroundColor Green
    }
}

# Iniciar containers
Write-Host "Iniciando containers..." -ForegroundColor Green
docker-compose -f docker-compose.production.yml up -d

# Aguardar containers iniciarem
Write-Host "Aguardando containers iniciarem..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Verificar status dos containers
Write-Host "Verificando status dos containers..." -ForegroundColor Cyan
docker-compose -f docker-compose.production.yml ps

Write-Host "Deploy concluido!" -ForegroundColor Green