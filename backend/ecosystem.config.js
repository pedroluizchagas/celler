module.exports = {
  apps: [{
    name: 'assistencia-backend',
    script: 'src/server.js',
    cwd: 'C:/Users/Pedro/Documents/SayTech/assistencia-tecnica/backend',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_file: '.env.production',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: '../logs/backend-error.log',
    out_file: '../logs/backend-out.log',
    log_file: '../logs/backend-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};