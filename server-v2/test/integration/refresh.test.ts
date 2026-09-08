import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import { useTestApp } from '../helpers/app.ts';
import { TokenService } from '../../src/modules/auth/token.service.ts';

const { app, config, database } = useTestApp();

const signup = {
    name: 'Дарья',
    email: 'darya@example.test',
    password: 'secret1',
    passwordRepeat: 'secret1',
};

type TokenPair = {
    accessToken: string;
    refreshToken: string;
};

/** Регистрация плюс вход: возвращает выданную пару токенов. */
const login = async (): Promise<TokenPair> => {
    const created = await request(app).post('/api/signup').send(signup);
    assert.equal(created.status, 201);

    const response = await request(app)
        .post('/api/login')
        .send({ email: signup.email, password: signup.password });
    assert.equal(response.status, 200);

    return response.body.tokens;
};

describe('POST /api/refresh', () => {

    test('issues a new token pair for a valid refresh token', async () => {
        // выдаёт новую пару токенов по действительному refresh-токену
        const { refreshToken } = await login();

        const response = await request(app)
            .post('/api/refresh')
            .send({ refreshToken });

        assert.equal(response.status, 200);
        assert.equal(response.type, 'application/json');
        assert.equal(typeof response.body.tokens?.accessToken, 'string');
        assert.equal(typeof response.body.tokens?.refreshToken, 'string');
        assert.notEqual(response.body.tokens.refreshToken, refreshToken);
        assert.deepEqual(new TokenService(config).verifyAccess(response.body.tokens.accessToken), { userId: 1 });
    });

    test('refreshes repeatedly using only the token and rejects an expired refresh', async () => {
        // обновляет пару повторно по одному токену и отклоняет истёкший refresh
        const { refreshToken } = await login();
        await database.query('delete from users');
        for (let i = 0; i < 2; i += 1) {
            const response = await request(app).post('/api/refresh').send({ refreshToken });
            assert.equal(response.status, 200);
        }
        const expired = jwt.sign({ sub: '1', exp: Math.floor(Date.now() / 1000) - 1 }, config.jwt.refreshSecret);
        const response = await request(app).post('/api/refresh').send({ refreshToken: expired });
        assert.equal(response.status, 401);
        assert.equal(response.body.error, true);
    });

    test('rejects a bad refresh token with a JSON body, never 200 and never 5xx', async () => {
        // отклоняет негодный refresh-токен с JSON-телом, никогда 200 и никогда 5xx
        const { accessToken } = await login();

        const cases = [
            { body: { refreshToken: 'garbage' }, status: 401 },
            // access-токен вместо refresh: секреты разные, подпись не подходит.
            { body: { refreshToken: accessToken }, status: 401 },
            { body: { refreshToken: '' }, status: 400 },
            { body: {}, status: 400 },
        ];

        for (const { body, status } of cases) {
            const response = await request(app).post('/api/refresh').send(body);

            // Клиент ретраит запрос через тот же обработчик ошибок, поэтому
            // отказ обязан быть немедленным и однозначным.
            assert.equal(response.status, status, JSON.stringify(body));
            assert.equal(response.type, 'application/json');
            assert.equal(response.body.error, true);
            assert.equal(typeof response.body.message, 'string');
        }
    });
});

describe('POST /api/logout', () => {

    test('validates the logout body', async () => {
        // проверяет тело запроса выхода
        for (const body of [{}, { refreshToken: '' }, { refreshToken: 123 }]) {
            const response = await request(app).post('/api/logout').send(body);
            assert.equal(response.status, 400);
            assert.equal(response.body.error, true);
        }
    });

    test('always answers 200 with a JSON body', async () => {
        // всегда отвечает 200 с JSON-телом
        const { refreshToken } = await login();

        for (const body of [{ refreshToken }, { refreshToken: 'garbage' }]) {
            const response = await request(app).post('/api/logout').send(body);

            assert.equal(response.status, 200);
            assert.equal(response.type, 'application/json');
            assert.equal(typeof response.body.message, 'string');
            assert.deepEqual(response.body, {
                error: false,
                message: response.body.message,
            });
        }
        const refreshed = await request(app).post('/api/refresh').send({ refreshToken });
        assert.equal(refreshed.status, 200);
    });
});
