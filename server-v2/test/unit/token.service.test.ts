import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import jwt from 'jsonwebtoken';

import { Config } from '../../src/config/config.ts';
import { UnauthorizedError } from '../../src/errors/app-error.ts';
import { TokenService } from '../../src/modules/identity/auth/token.service.ts';

/** Тесты этого файла к базе не ходят: адрес нужен только чтобы Config.load прошёл. */
const config = Config.load({
    NODE_ENV: 'test',
    PORT: '3000',
    LOG_LEVEL: 'debug',
    DATABASE_URL: 'postgres://spending:spending@localhost:5432/spending_test',
    JWT_ACCESS_SECRET: 'test-access-secret-with-enough-length',
    JWT_REFRESH_SECRET: 'test-refresh-secret-with-enough-length',
    ACCESS_TTL: '15m',
});

const tokens = new TokenService(config);

/** Разбирает часть JWT: 0 — заголовок, 1 — полезная нагрузка. */
const segment = (token: string, index: number): Record<string, unknown> => {
    const part = token.split('.')[index] ?? '';

    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
};

describe('TokenService', () => {

    test('issues an HS256 pair that verifies back to the user id', () => {
        // выдаёт пару HS256, которая проверяется обратно в id пользователя
        const pair = tokens.issueTokenPair(42);

        assert.equal(typeof pair.accessToken, 'string');
        assert.equal(typeof pair.refreshToken, 'string');
        assert.deepEqual(tokens.verifyAccess(pair.accessToken), { userId: 42 });
        assert.deepEqual(tokens.verifyRefresh(pair.refreshToken), { userId: 42 });

        assert.equal(segment(pair.accessToken, 0).alg, 'HS256');

        const payload = segment(pair.accessToken, 1);
        assert.equal(String(payload.sub), '42');
        // Срок берётся из ACCESS_TTL конфига, а не из захардкоженного значения.
        assert.equal(Number(payload.exp) - Number(payload.iat), 15 * 60);
        const refresh = segment(pair.refreshToken, 1);
        assert.equal(Number(refresh.exp) - Number(refresh.iat), 30 * 24 * 60 * 60);
    });

    test('rejects expired tokens, unsupported algorithms and invalid claims', () => {
        // отклоняет истёкшие токены, посторонние алгоритмы и некорректные поля
        const now = Math.floor(Date.now() / 1000);
        for (const [secret, verify] of [
            [config.jwt.accessSecret, (token: string) => tokens.verifyAccess(token)],
            [config.jwt.refreshSecret, (token: string) => tokens.verifyRefresh(token)],
        ] as const) {
            for (const payload of [
                { sub: '42', exp: now - 1 },
                { sub: '42', exp: now + 120, nbf: now + 60 },
                { sub: '42' },
                { exp: now + 60 },
                ...['0', '-1', '1.5', 'abc', '9007199254740992'].map((sub) => ({ sub, exp: now + 60 })),
            ]) {
                assert.throws(() => verify(jwt.sign(payload, secret)), UnauthorizedError);
            }
            for (const algorithm of ['HS384', 'none'] as const) {
                const token = jwt.sign({ sub: '42', exp: now + 60 }, secret, { algorithm });
                assert.throws(() => verify(token), UnauthorizedError);
            }
        }
    });

    test('uses configured lifetimes for both tokens', () => {
        // использует заданные в конфигурации сроки обоих токенов
        const custom = new TokenService(Config.load({
            DATABASE_URL: config.databaseUrl,
            JWT_ACCESS_SECRET: config.jwt.accessSecret,
            JWT_REFRESH_SECRET: config.jwt.refreshSecret,
            ACCESS_TTL: '10s',
            REFRESH_TTL: '2h',
        }));
        const pair = custom.issueTokenPair(42);
        const access = segment(pair.accessToken, 1);
        const refresh = segment(pair.refreshToken, 1);
        assert.equal(Number(access.exp) - Number(access.iat), 10);
        assert.equal(Number(refresh.exp) - Number(refresh.iat), 2 * 60 * 60);
    });

    test('issues distinct pairs for repeated calls within one second', () => {
        // выдаёт разные пары при повторных вызовах в течение одной секунды
        const first = tokens.issueTokenPair(42);
        const second = tokens.issueTokenPair(42);
        assert.notEqual(first.accessToken, second.accessToken);
        assert.notEqual(first.refreshToken, second.refreshToken);
    });

    test('rejects a token from the other secret or with a changed payload', () => {
        // отвергает токен от другого секрета или с изменённым пейлоадом
        const { accessToken, refreshToken } = tokens.issueTokenPair(42);

        // Секреты access и refresh разделены: подпись одним не проходит проверку другим.
        assert.throws(() => tokens.verifyRefresh(accessToken), UnauthorizedError);
        assert.throws(() => tokens.verifyAccess(refreshToken), UnauthorizedError);

        // Подмена sub в полезной нагрузке ломает подпись.
        const [header, , signature] = accessToken.split('.');
        const forged = Buffer.from(JSON.stringify({ sub: '999' })).toString('base64url');
        assert.throws(
            () => tokens.verifyAccess(`${header}.${forged}.${signature}`),
            UnauthorizedError,
        );

        assert.throws(() => tokens.verifyAccess('not-a-token'), UnauthorizedError);
    });
});
