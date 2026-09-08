import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Request, Response } from 'express';
import express from 'express';
import request from 'supertest';

import { Config } from '../../src/config/config.ts';
import { AppError } from '../../src/errors/app-error.ts';
import { Authenticate } from '../../src/http/middleware/authenticate.ts';
import { TokenService } from '../../src/modules/auth/token.service.ts';
import { Logger } from '../../src/logging/logger.ts';
import { RequestContext } from '../../src/http/middleware/request-context.ts';
import { ErrorHandler } from '../../src/http/middleware/error-handler.ts';
import { MemorySink } from '../helpers/memory-sink.ts';

const config = Config.load({
    NODE_ENV: 'test',
    PORT: '3000',
    LOG_LEVEL: 'debug',
    DATABASE_URL: 'postgres://spending:spending@localhost:5432/spending_test',
    JWT_ACCESS_SECRET: 'test-access-secret-with-enough-length',
    JWT_REFRESH_SECRET: 'test-refresh-secret-with-enough-length',
});

const tokens = new TokenService(config);
const authenticate = new Authenticate(tokens);

// Middleware читает только заголовок authorization, поэтому в заглушке лежат
// headers и два поля, которые попадают в лог отказа.
const fakeRequest = (authorization?: string): Request =>
    ({
        headers: authorization === undefined ? {} : { authorization },
        method: 'GET',
        originalUrl: '/api/balance',
    } as unknown as Request);

const fakeResponse = (): Response => ({} as unknown as Response);

/** Возвращает аргумент next(): undefined на успехе, ошибку на отказе. */
const run = (req: Request): unknown => {
    let passed: unknown = 'next() не вызван';

    authenticate.require(req, fakeResponse(), (value) => { passed = value; });

    return passed;
};

describe('Authenticate', () => {

    test('protects an HTTP route and includes the verified user in its access log', async () => {
        // защищает HTTP маршрут и добавляет проверенного пользователя в журнал запросов
        const sink = new MemorySink();
        const logger = Logger.create(config, sink);
        const app = express();
        app.use(new RequestContext(logger).attach, express.json());
        app.post('/protected', authenticate.require, (req, res) => {
            res.json({ auth: req.auth, body: req.body });
        });
        app.use(new ErrorHandler(logger).respond);
        const body = { user: { userId: 999 } };
        const response = await request(app).post('/protected')
            .set('Authorization', `Bearer ${tokens.issue(7).accessToken}`)
            .set('x-request-id', 'authenticated-request').send(body);
        assert.equal(response.status, 200);
        assert.deepEqual(response.body, { auth: { userId: 7 }, body });
        const records = await sink.records();
        const completed = records.find((record) => record.msg === 'request completed');
        assert.equal(completed?.userId, 7);
        assert.equal(completed?.requestId, 'authenticated-request');

        const rejected = await request(app).post('/protected').send(body);
        assert.equal(rejected.status, 401);
        assert.equal(rejected.type, 'application/json');
        assert.equal(rejected.body.error, true);
    });

    test('puts the caller identity on req.auth', () => {
        // ставит личность вызывающего в req.auth
        const req = fakeRequest(`Bearer ${tokens.issue(7).accessToken}`);

        assert.equal(run(req), undefined, 'next() вызван без ошибки');
        assert.deepEqual(req.auth, { userId: 7 });
        assert.equal(req.body, undefined);
    });

    test('preserves the request body and accepts a case-insensitive Bearer scheme', () => {
        // сохраняет тело запроса и принимает схему Bearer в любом регистре
        const req = fakeRequest(`bearer ${tokens.issue(7).accessToken}`);
        const body = { user: { userId: 999 }, title: 'Еда' };
        req.body = body;
        assert.equal(run(req), undefined);
        assert.deepEqual(req.auth, { userId: 7 });
        assert.equal(req.body, body);
        assert.deepEqual(req.body.user, { userId: 999 });
    });

    test('rejects a missing, malformed or wrong-kind bearer token with 401', () => {
        // отвергает отсутствующий, битый и неподходящий bearer-токен со статусом 401
        const { accessToken, refreshToken } = tokens.issue(7);

        const headers = [
            undefined,
            'Bearer',
            'Bearer ',
            `Token ${accessToken}`,
            'Bearer not-a-token',
            `Bearer ${accessToken} extra`,
            `Bearer ${accessToken}, Bearer ${accessToken}`,
            // refresh-токен не открывает защищённые маршруты.
            `Bearer ${refreshToken}`,
        ];

        for (const header of headers) {
            const req = fakeRequest(header);
            const error = run(req);

            assert.ok(error instanceof AppError, `header: ${String(header)}`);
            assert.equal((error as AppError).status, 401);
            assert.equal(req.auth, undefined);
        }
    });
});
