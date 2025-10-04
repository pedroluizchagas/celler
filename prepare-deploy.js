#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🚀 Preparando projeto para deploy...')

// Verificar se os arquivos necessários existem
const requiredFiles = [
  'backend/package.json',
  'backend/src/server.js',
  'backend/.env.production',
  'frontend/package.json',
  'frontend/dist/index.html'
]

console.log('\n📋 Verificando arquivos necessários...')
let allFilesExist = true

requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file)
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file} - FALTANDO!`)
    allFilesExist = false
  }
})

if (!allFilesExist) {
  console.log('\n❌ Alguns arquivos necessários estão faltando!')
  console.log('Execute: npm run build no frontend')
  process.exit(1)
}

// Verificar build do frontend
const distPath = path.join(__dirname, 'frontend/dist')
if (!fs.existsSync(distPath)) {
  console.log('\n❌ Build do frontend não encontrado!')
  console.log('Execute: cd frontend && npm run build')
  process.exit(1)
}

// Criar .gitignore se não existir
const gitignorePath = path.join(__dirname, '.gitignore')
const gitignoreContent = `
# Dependencies
node_modules/
*/node_modules/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Uploads
uploads/*
!uploads/.gitkeep

# Backups
backups/*
!backups/.gitkeep

# SSL certificates
ssl/*

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# PM2
.pm2/
`

if (!fs.existsSync(gitignorePath)) {
  fs.writeFileSync(gitignorePath, gitignoreContent.trim())
  console.log('✅ .gitignore criado')
}

// Verificar package.json do backend
const backendPackagePath = path.join(__dirname, 'backend/package.json')
const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'))

if (!backendPackage.scripts.start) {
  console.log('❌ Script "start" não encontrado no backend/package.json')
  process.exit(1)
}

console.log('\n🎉 Projeto pronto para deploy!')
console.log('\n📋 Próximos passos:')
console.log('1. Criar repositório no GitHub')
console.log('2. Fazer push do código')
console.log('3. Conectar Railway (backend)')
console.log('4. Conectar Vercel (frontend)')
console.log('5. Configurar variáveis de ambiente')

console.log('\n🔗 Links úteis:')
console.log('• Railway: https://railway.app')
console.log('• Vercel: https://vercel.com')
console.log('• GitHub: https://github.com')

console.log('\n📄 Documentação: DEPLOY-GUIDE.md')