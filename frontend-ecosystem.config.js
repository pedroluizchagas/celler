module.exports = {
  apps: [{
    name: 'assistencia-frontend',
    script: 'frontend-server.js',
    cwd: 'C:/Users/Pedro/Documents/SayTech/assistencia-tecnica',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '512M',
    error_file: 'logs/frontend-error.log',
    out_file: 'logs/frontend-out.log',
    log_file: 'logs/frontend-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};