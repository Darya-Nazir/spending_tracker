# Spending Tracker

Приложение для учёта доходов и расходов. Пользователь может управлять операциями и категориями, 
смотреть баланс и аналитику за выбранный период.

## Структура проекта

- `client/` — клиент на TypeScript с Webpack, HTML-шаблонами, собственным роутером и Chart.js.
- `server-v2/` — актуальный REST API на Node.js 24, TypeScript и Express 5 с PostgreSQL 17.
- `server/` — прежняя версия API с хранением данных в памяти.

## Актуальный сервер

`server-v2` предоставляет:

- регистрацию, вход, обновление и отзыв JWT-сессий;
- CRUD для категорий и операций;
- перенос и удаление операций при удалении категории;
- расчёт и изменение баланса;
- фильтрацию операций по периодам;
- валидацию запросов, CORS, rate limiting и структурированные логи;
- миграции PostgreSQL, health checks, unit-, integration- и contract-тесты.

API доступен по адресу `http://localhost:3000/api`. Эндпоинты состояния: `GET /health` и `GET /ready`.

## Локальный запуск

Требуются Docker и Node.js 24+.

### Сервер и PostgreSQL

```bash
cd server-v2
cp .env.example .env
```

Заполните в `.env` разные значения `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` длиной от 32 символов, затем запустите контейнеры:

```bash
docker compose up --build
```

Миграции применяются при запуске контейнера сервера и перед тестами. Дополнительные команды для базы, 
миграций и тестов описаны в [`server-v2/README.md`](server-v2/README.md).

### Клиент

```bash
cd client
npm ci
npm run dev
```

Клиент откроется на `http://localhost:9000` и будет обращаться к API на порту `3000`.

## Проверки

```bash
cd server-v2 && npm ci && npm run check
cd client && npm ci && npm test
```
