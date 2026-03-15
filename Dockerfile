FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY backend/package*.json ./backend/
RUN mkdir -p /ms-playwright \
  && cd backend \
  && npm ci --omit=dev \
  && npx playwright install chromium

COPY backend ./backend
COPY frontend ./frontend
COPY database ./database

ENV NODE_ENV=production

WORKDIR /app/backend

EXPOSE 3000

CMD ["sh", "scripts/start-service.sh"]
