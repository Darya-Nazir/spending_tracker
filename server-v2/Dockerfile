FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src

COPY migrations/current ./migrations/current
CMD ["sh", "-c", "npm run db:migrate && npm start"]
