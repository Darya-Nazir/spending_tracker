# server-v2

## Аутентификация: этап 13

`POST /api/login` принимает `{email,password,rememberMe?}` и возвращает
`{tokens:{accessToken,refreshToken},user:{id,name}}`. Email приводится к канонической
форме. Ошибка учётных данных возвращает 401 с `message: "Invalid email or password"`.

JWT подписываются HS256 с разными ключами из `JWT_ACCESS_SECRET` и
`JWT_REFRESH_SECRET`. Каждый ключ содержит минимум 32 символа. Заполните оба
значения в `.env`, выполнив эту команду отдельно для каждого ключа:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`ACCESS_TTL=15m`, `REFRESH_TTL=30d` задают сроки по умолчанию. Допустимый формат:
положительное целое число и единица `s`, `m`, `h` или `d`.

`POST /api/refresh` принимает `{refreshToken}`, проверяет подпись и срок,
возвращает `{tokens:{accessToken,refreshToken}}`. Некорректный токен даёт 401,
ошибка структуры тела — 400. `POST /api/logout` проверяет ту же структуру тела
и возвращает `200 {error:false,message}`.

На этом этапе токены действуют до истечения срока, включая повторный refresh
и использование после logout. `rememberMe` принимается с общим сроком refresh.
Хранение сессий, ротация и отзыв относятся к этапу 21.

`Authenticate.requireAuth` проверяет `Authorization: Bearer <accessToken>`, заполняет
`req.auth.userId` и добавляет `userId` в лог запроса. Защищённые бизнес-маршруты
подключают этот middleware при реализации своих этапов.

Для браузерной проверки запустите API через `npm start`, клиент через
`npm run dev` в `client/`. `CORS_ORIGIN` по умолчанию равен `http://localhost:9000`.
Очистите localStorage клиента, зарегистрируйтесь и выполните вход. Главная
страница открывается; финансовые запросы на текущем этапе получают 404.

## Docker

Быстро проверить, что докер работает:
docker compose ps
логи в реальном времени:
docker compose logs -f postgres     

docker compose up -d 
эта команда приводит состояние докера в соответствие с compose.yaml. 

## PostgreSQL

Список всех таблиц
docker compose exec postgres psql -U spending -d spending_test -c '\dt'

Структура таблицы, например categories
docker compose exec postgres psql -U spending -d spending_test -c '\d categories'

Содержимое таблицы
docker compose exec postgres psql -U spending -d spending_test -c 'select * from categories;'


## SQL-логи PostgreSQL

SQL-запросы логирует сам PostgreSQL. PostgreSQL пишет их в
`stderr` контейнера, откуда их показывает Docker:

```bash
docker compose logs -f postgres
```

Режим задаётся в `.env` через `POSTGRES_LOG_MIN_DURATION_MS`:

- `-1` — SQL-логи выключены (значение по умолчанию);
- `0` — логируются все завершённые запросы;
- `100` — логируются запросы длительностью от 100 мс.

После изменения пересоздайте только контейнер PostgreSQL. Именованный volume с
базами при этом сохраняется:

```bash
docker compose up -d --force-recreate postgres
```

Значения bind-параметров в SQL-логи не попадают.
Docker хранит не более трёх файлов логов по 10 МБ для контейнера PostgreSQL.

## Миграции

Применить миграции или откатить последнюю:

```bash
npm run db:migrate
npm run db:rollback
```

Для тестовой базы:

```bash
npm run db:migrate:test
```
Посмотреть применённые миграции
docker compose exec postgres psql -U spending -d spending_dev \
  -c 'select * from pgmigrations order by id;'

docker compose exec postgres psql -U spending -d spending_test \
  -c 'select * from pgmigrations order by id;'

## Тесты

Полный прогон сам применяет миграции к `spending_test`, затем запускает файлы
последовательно:

```bash
npm test
```
запустить конкретный тест
Из папки server-v2:
npm run db:migrate:test && node --test --test-concurrency=1 {ptest path}

Если тестовая база уже мигрирована, достаточно:
node --test test/integration/isolation.test.ts
