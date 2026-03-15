FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend ./backend
COPY frontend ./frontend
COPY database ./database

ENV NODE_ENV=production

WORKDIR /app/backend

EXPOSE 3000

CMD ["sh", "scripts/start-service.sh"]
