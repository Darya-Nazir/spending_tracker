import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import { useTestApp } from '../../helpers/app.ts';
import { TokenService } from '../../../src/modules/auth/token.service.ts';

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

    test('rotates refresh tokens and revokes the session chain when an old token is reused', async () => {
        // ротирует refresh-токены и отзывает цепочку сессии при повторном использовании старого токена
        const { refreshToken } = await login();
        const otherLogin = await request(app).post('/api/login')
            .send({ email: signup.email, password: signup.password });
        assert.equal(otherLogin.status, 200);

        const response = await request(app)
            .post('/api/refresh')
            .send({ refreshToken });

        assert.equal(response.status, 200);
        assert.equal(response.type, 'application/json');
        assert.equal(typeof response.body.tokens?.accessToken, 'string');
        assert.equal(typeof response.body.tokens?.refreshToken, 'string');
        assert.notEqual(response.body.tokens.refreshToken, refreshToken);
        assert.deepEqual(new TokenService(config).verifyAccess(response.body.tokens.accessToken), { userId: 1 });

        const next = await request(app).post('/api/refresh')
            .send({ refreshToken: response.body.tokens.refreshToken });
        assert.equal(next.status, 200);
        assert.notEqual(next.body.tokens.refreshToken, response.body.tokens.refreshToken);

        // Повтор первого токена должен отозвать и последнего потомка цепочки.
        for (const token of [refreshToken, next.body.tokens.refreshToken]) {
            const rejected = await request(app).post('/api/refresh').send({ refreshToken: token });
            assert.equal(rejected.status, 401);
            assert.equal(rejected.body.error, true);
        }
        const otherRefreshed = await request(app).post('/api/refresh')
            .send({ refreshToken: otherLogin.body.tokens.refreshToken });
        assert.equal(otherRefreshed.status, 200);
    });

    test('allows only one concurrent refresh and revokes its successor on reuse', async () => {
        // допускает одно одновременное обновление и отзывает его потомка при переиспользовании
        const { refreshToken } = await login();
        const responses = await Promise.all([
            request(app).post('/api/refresh').send({ refreshToken }),
            request(app).post('/api/refresh').send({ refreshToken }),
        ]);
        assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 401]);
        const success = responses.find(({ status }) => status === 200);
        assert.ok(success);
        const rejected = await request(app).post('/api/refresh')
            .send({ refreshToken: success.body.tokens.refreshToken });
        assert.equal(rejected.status, 401);
    });

    test('preserves the original session expiry when rotating a temporary session', async () => {
        // сохраняет исходный срок временной сессии при ротации
        await login();
        const temporary = await request(app).post('/api/login')
            .send({ email: signup.email, password: signup.password, rememberMe: false });
        assert.equal(temporary.status, 200);
        // Приближаем окончание сессии, чтобы обнаружить продление срока при refresh.
        const { rows: [session] } = await database.query<{ expires_at: Date }>(
            `update sessions set expires_at = date_trunc('second', now()) + interval '5 minutes'
             where id = (select max(id) from sessions) returning expires_at`,
        );
        assert.ok(session);
        const refreshed = await request(app).post('/api/refresh')
            .send({ refreshToken: temporary.body.tokens.refreshToken });
        assert.equal(refreshed.status, 200);
        const { rows: [successor] } = await database.query<{ expires_at: Date }>(
            'select expires_at from sessions order by id desc limit 1',
        );
        assert.deepEqual(successor?.expires_at, session.expires_at);
        const payload = jwt.decode(refreshed.body.tokens.refreshToken);
        assert.ok(payload && typeof payload === 'object');
        assert.equal(payload.exp, session.expires_at.getTime() / 1000);
    });

    test('rejects refresh when the database session has expired while the JWT is valid', async () => {
        // отклоняет обновление при истёкшей сессии в БД и действительном JWT
        const { refreshToken } = await login();
        const expired = await database.query("update sessions set expires_at = now() - interval '1 second'");
        assert.equal(expired.rowCount, 1, 'Login must create a session to expire');
        assert.deepEqual(new TokenService(config).verifyRefresh(refreshToken), { userId: 1 });

        const response = await request(app).post('/api/refresh').send({ refreshToken });
        assert.equal(response.status, 401);
        assert.equal(response.body.error, true);
    });

    test('rejects a bad refresh token with a JSON body, never 200 and never 5xx', async () => {
        // отклоняет негодный refresh-токен с JSON-телом, никогда 200 и никогда 5xx
        const { accessToken } = await login();
        const expired = jwt.sign({ sub: '1', exp: Math.floor(Date.now() / 1000) - 1 }, config.jwt.refreshSecret);

        const cases = [
            { body: { refreshToken: 'garbage' }, status: 401 },
            { body: { refreshToken: expired }, status: 401 },
            { body: { refreshToken: new TokenService(config).issueTokenPair(1).refreshToken }, status: 401 },
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

    test('revokes the current session on logout and keeps another login active', async () => {
        // отзывает текущую сессию при выходе и сохраняет сессию другого входа
        const { refreshToken } = await login();
        const otherLogin = await request(app).post('/api/login')
            .send({ email: signup.email, password: signup.password });
        assert.equal(otherLogin.status, 200);
        assert.notEqual(otherLogin.body.tokens.refreshToken, refreshToken);

        const response = await request(app).post('/api/logout').send({ refreshToken });
        assert.equal(response.status, 200);
        assert.equal(response.type, 'application/json');
        assert.equal(typeof response.body.message, 'string');
        assert.deepEqual(response.body, {
            error: false,
            message: response.body.message,
        });
        const refreshed = await request(app).post('/api/refresh').send({ refreshToken });
        assert.equal(refreshed.status, 401);
        assert.equal(refreshed.body.error, true);

        const otherRefreshed = await request(app).post('/api/refresh')
            .send({ refreshToken: otherLogin.body.tokens.refreshToken });
        assert.equal(otherRefreshed.status, 200);
        assert.deepEqual(new TokenService(config).verifyAccess(otherRefreshed.body.tokens.accessToken), { userId: 1 });
    });
});
