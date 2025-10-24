FROM node:20-alpine
WORKDIR /app

# Copiar apenas a API
COPY package*.json /app/
COPY apps/api/package*.json /app/apps/api/
RUN npm install --workspaces --if-present --omit=dev && npm cache clean --force

COPY apps/api /app/apps/api

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "src/index.js"]

