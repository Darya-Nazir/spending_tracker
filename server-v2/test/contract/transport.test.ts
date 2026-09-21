import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import request from 'supertest';

import { ErrorHandler } from '../../src/http/middleware/error-handler.ts';
import { TokenService } from '../../src/modules/auth/token.service.ts';
import { CategoryRepository, type CategoryType } from '../../src/modules/categories/category.repository.ts';
import { useTestApp } from '../helpers/app.ts';
import { bearerAuth } from '../helpers/auth.ts';
import { createUser } from '../helpers/factories.ts';

const { app, config, database, logger } = useTestApp();
const tokens = new TokenService(config);
const categories = new CategoryRepository(database);

type RouteRequest = () => Promise<request.Response>;

type RouteCase = {
    name: string;
    status: number;
    success: RouteRequest;
    error?: RouteRequest;
    errorStatus?: number;
};

const assertSafeJson = (response: request.Response, name: string): void => {
    assert.equal(response.type, 'application/json', `${name} must answer JSON`);
    assert.ok(response.text.length > 0, `${name} must have a response body`);
    assert.doesNotThrow(() => JSON.parse(response.text), `${name} must contain valid JSON`);
    assert.doesNotMatch(
        response.text,
        /"(?:password_hash|token_hash|stack)"\s*:/i,
        `${name} must not expose internal fields`,
    );
};

const insertOperation = async (userId: number, categoryId: number, type: CategoryType): Promise<number> => {
    const { rows } = await database.query<{ id: number }>(
        `insert into operations (user_id, category_id, type, amount, date, comment)
         values ($1, $2, $3, 10, '2026-09-01', 'transport contract') returning id`,
        [userId, categoryId, type],
    );
    const id = rows[0]?.id;
    assert.ok(id !== undefined, 'PostgreSQL must return an operation ID');
    return id;
};

test('keeps every registered route within the JSON transport contract', async () => {
    // сохраняет каждый зарегистрированный маршрут в рамках транспортного JSON-контракта
    const user = await createUser(database);
    await categories.seedDefaults(user.id);
    const auth = bearerAuth(tokens.issueTokenPair(user.id).accessToken);
    const findCategory = async (type: CategoryType, title: string) => {
        const category = (await categories.list(user.id, type)).find((item) => item.title === title);
        assert.ok(category, `Missing ${type} category: ${title}`);
        return category;
    };

    const expense = {
        read: await findCategory('expense', 'Еда'),
        rename: await findCategory('expense', 'Жилье'),
        delete: await findCategory('expense', 'Здоровье'),
        deleteOperations: await findCategory('expense', 'Кафе'),
        moveSource: await findCategory('expense', 'Авто'),
        moveTarget: await findCategory('expense', 'Одежда'),
        operationRead: await findCategory('expense', 'Развлечения'),
        operationUpdate: await findCategory('expense', 'Счета'),
        operationDelete: await findCategory('expense', 'Спорт'),
        operationCreate: await findCategory('expense', 'Общее'),
    };
    const income = {
        read: await findCategory('income', 'Депозиты'),
        rename: await findCategory('income', 'Зарплата'),
        delete: await findCategory('income', 'Сбережения'),
        deleteOperations: await findCategory('income', 'Инвестиции'),
        moveSource: await findCategory('income', 'Общее'),
    };

    await insertOperation(user.id, expense.deleteOperations.id, 'expense');
    await insertOperation(user.id, expense.moveSource.id, 'expense');
    await insertOperation(user.id, income.deleteOperations.id, 'income');
    await insertOperation(user.id, income.moveSource.id, 'income');
    const operationReadId = await insertOperation(user.id, expense.operationRead.id, 'expense');
    const operationUpdateId = await insertOperation(user.id, expense.operationUpdate.id, 'expense');
    const operationDeleteId = await insertOperation(user.id, expense.operationDelete.id, 'expense');

    const credentials = {
        name: 'Contract User',
        email: 'contract-user@example.test',
        password: 'secret1',
        passwordRepeat: 'secret1',
    };
    let refreshToken = '';

    const protectedError = (method: 'get' | 'post' | 'put' | 'delete', path: string): RouteRequest =>
        async () => request(app)[method](path);

    const routes: RouteCase[] = [
        {
            name: 'GET /health', status: 200,
            success: async () => request(app).get('/health'),
        },
        {
            name: 'GET /ready', status: 200,
            success: async () => request(app).get('/ready'),
        },
        {
            name: 'POST /api/signup', status: 201,
            success: async () => request(app).post('/api/signup').send(credentials),
            error: async () => request(app).post('/api/signup').send({}), errorStatus: 400,
        },
        {
            name: 'POST /api/login', status: 200,
            success: async () => {
                const response = await request(app).post('/api/login').send({
                    email: credentials.email, password: credentials.password,
                });
                refreshToken = response.body.tokens?.refreshToken ?? '';
                return response;
            },
            error: async () => request(app).post('/api/login').send({}), errorStatus: 400,
        },
        {
            name: 'POST /api/refresh', status: 200,
            success: async () => {
                assert.ok(refreshToken, 'Login must return a refresh token');
                const response = await request(app).post('/api/refresh').send({ refreshToken });
                refreshToken = response.body.tokens?.refreshToken ?? '';
                return response;
            },
            error: async () => request(app).post('/api/refresh').send({}), errorStatus: 400,
        },
        {
            name: 'POST /api/logout', status: 200,
            success: async () => {
                assert.ok(refreshToken, 'Refresh must return a refresh token');
                return request(app).post('/api/logout').send({ refreshToken });
            },
            error: async () => request(app).post('/api/logout').send({}), errorStatus: 400,
        },
        {
            name: 'GET /api/categories/expense', status: 200,
            success: async () => request(app).get('/api/categories/expense').set(auth),
            error: protectedError('get', '/api/categories/expense'), errorStatus: 401,
        },
        {
            name: 'GET /api/categories/expense/:id', status: 200,
            success: async () => request(app).get(`/api/categories/expense/${expense.read.id}`).set(auth),
            error: protectedError('get', '/api/categories/expense/1'), errorStatus: 401,
        },
        {
            name: 'POST /api/categories/expense', status: 201,
            success: async () => request(app).post('/api/categories/expense').set(auth)
                .send({ title: 'Контрактный расход' }),
            error: protectedError('post', '/api/categories/expense'), errorStatus: 401,
        },
        {
            name: 'PUT /api/categories/expense/:id', status: 200,
            success: async () => request(app).put(`/api/categories/expense/${expense.rename.id}`).set(auth)
                .send({ title: 'Контрактное жилье' }),
            error: protectedError('put', '/api/categories/expense/1'), errorStatus: 401,
        },
        {
            name: 'DELETE /api/categories/expense/:id', status: 200,
            success: async () => request(app).delete(`/api/categories/expense/${expense.delete.id}`).set(auth),
            error: protectedError('delete', '/api/categories/expense/1'), errorStatus: 401,
        },
        {
            name: 'DELETE /api/categories/expense/:id/operations', status: 200,
            success: async () => request(app)
                .delete(`/api/categories/expense/${expense.deleteOperations.id}/operations`).set(auth),
            error: protectedError('delete', '/api/categories/expense/1/operations'), errorStatus: 401,
        },
        {
            name: 'PUT /api/categories/expense/:id/operations', status: 200,
            success: async () => request(app).put(`/api/categories/expense/${expense.moveSource.id}/operations`)
                .set(auth).send({ targetCategoryId: expense.moveTarget.id }),
            error: protectedError('put', '/api/categories/expense/1/operations'), errorStatus: 401,
        },
        {
            name: 'GET /api/categories/income', status: 200,
            success: async () => request(app).get('/api/categories/income').set(auth),
            error: protectedError('get', '/api/categories/income'), errorStatus: 401,
        },
        {
            name: 'GET /api/categories/income/:id', status: 200,
            success: async () => request(app).get(`/api/categories/income/${income.read.id}`).set(auth),
            error: protectedError('get', '/api/categories/income/1'), errorStatus: 401,
        },
        {
            name: 'POST /api/categories/income', status: 201,
            success: async () => request(app).post('/api/categories/income').set(auth)
                .send({ title: 'Контрактный доход' }),
            error: protectedError('post', '/api/categories/income'), errorStatus: 401,
        },
        {
            name: 'PUT /api/categories/income/:id', status: 200,
            success: async () => request(app).put(`/api/categories/income/${income.rename.id}`).set(auth)
                .send({ title: 'Контрактная зарплата' }),
            error: protectedError('put', '/api/categories/income/1'), errorStatus: 401,
        },
        {
            name: 'DELETE /api/categories/income/:id', status: 200,
            success: async () => request(app).delete(`/api/categories/income/${income.delete.id}`).set(auth),
            error: protectedError('delete', '/api/categories/income/1'), errorStatus: 401,
        },
        {
            name: 'DELETE /api/categories/income/:id/operations', status: 200,
            success: async () => request(app)
                .delete(`/api/categories/income/${income.deleteOperations.id}/operations`).set(auth),
            error: protectedError('delete', '/api/categories/income/1/operations'), errorStatus: 401,
        },
        {
            name: 'PUT /api/categories/income/:id/operations', status: 200,
            success: async () => request(app).put(`/api/categories/income/${income.moveSource.id}/operations`)
                .set(auth).send({ targetCategoryId: income.read.id }),
            error: protectedError('put', '/api/categories/income/1/operations'), errorStatus: 401,
        },
        {
            name: 'GET /api/balance', status: 200,
            success: async () => request(app).get('/api/balance').set(auth),
            error: protectedError('get', '/api/balance'), errorStatus: 401,
        },
        {
            name: 'PUT /api/balance', status: 200,
            success: async () => request(app).put('/api/balance').set(auth).send({ balance: 100 }),
            error: protectedError('put', '/api/balance'), errorStatus: 401,
        },
        {
            name: 'GET /api/operations', status: 200,
            success: async () => request(app).get('/api/operations?period=all').set(auth),
            error: protectedError('get', '/api/operations'), errorStatus: 401,
        },
        {
            name: 'GET /api/operations/:id', status: 200,
            success: async () => request(app).get(`/api/operations/${operationReadId}`).set(auth),
            error: protectedError('get', '/api/operations/1'), errorStatus: 401,
        },
        {
            name: 'POST /api/operations', status: 201,
            success: async () => request(app).post('/api/operations').set(auth).send({
                type: 'expense', category_id: expense.operationCreate.id,
                amount: 25, date: '2026-09-02', comment: '',
            }),
            error: protectedError('post', '/api/operations'), errorStatus: 401,
        },
        {
            name: 'PUT /api/operations/:id', status: 200,
            success: async () => request(app).put(`/api/operations/${operationUpdateId}`).set(auth).send({
                type: 'expense', category_id: expense.operationCreate.id,
                amount: 30, date: '2026-09-03', comment: 'updated',
            }),
            error: protectedError('put', '/api/operations/1'), errorStatus: 401,
        },
        {
            name: 'DELETE /api/operations/:id', status: 200,
            success: async () => request(app).delete(`/api/operations/${operationDeleteId}`).set(auth),
            error: protectedError('delete', '/api/operations/1'), errorStatus: 401,
        },
    ];

    assert.equal(routes.length, 27, 'The explicit route inventory must contain all 27 routes');

    for (const route of routes) {
        const response = await route.success();
        assert.equal(response.status, route.status, `${route.name} returned ${JSON.stringify(response.body)}`);
        assert.notEqual(response.status, 204, `${route.name} must have a JSON body`);
        assertSafeJson(response, route.name);
    }

    for (const route of routes) {
        if (route.error === undefined || route.errorStatus === undefined) continue;

        const response = await route.error();
        assert.equal(response.status, route.errorStatus, route.name);
        assert.notEqual(response.status, 204, route.name);
        assertSafeJson(response, `${route.name} error`);
        assert.equal(response.body.error, true, route.name);
        assert.equal(typeof response.body.message, 'string', route.name);
        assert.ok(response.body.message.trim().length > 0, route.name);
    }
});

test('turns an unhandled async controller rejection into a safe JSON 500', async () => {
    // превращает необработанный асинхронный reject контроллера в безопасный JSON 500
    const rejectedApp = express();
    rejectedApp.get('/reject', async () => {
        throw new Error('database password appeared in an internal failure');
    });
    rejectedApp.use(new ErrorHandler(logger).respond);

    const response = await request(rejectedApp).get('/reject');

    assert.equal(response.status, 500);
    assertSafeJson(response, 'unhandled controller rejection');
    assert.deepEqual(response.body, { error: true, message: 'Internal server error' });
    assert.doesNotMatch(response.text, /database password/);
});
