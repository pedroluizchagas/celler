const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 8080;

// Configurar proxy para API
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Backend não disponível' });
  }
}));

// Servir arquivos estáticos do frontend
const frontendPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(frontendPath));

// Configurar headers de segurança
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// SPA - todas as rotas retornam index.html
app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Frontend server rodando em http://localhost:${PORT}`);
  console.log(`📁 Servindo arquivos de: ${frontendPath}`);
  console.log(`🔗 Proxy API: http://localhost:${PORT}/api -> http://localhost:3001/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Parando servidor frontend...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Parando servidor frontend...');
  process.exit(0);
});