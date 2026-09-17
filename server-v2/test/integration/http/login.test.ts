import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, test } from 'node:test';
import request from 'supertest';

import { useTestApp } from '../../helpers/app.ts';
import { TokenService } from '../../../src/modules/auth/token.service.ts';

const { app, config, database } = useTestApp();

const signup = {
    name: 'Дарья',
    email: 'Darya@Example.test',
    password: 'secret1',
    passwordRepeat: 'secret1',
};

/** Регистрирует пользователя через боевой эндпоинт и возвращает его id. */
const register = async (): Promise<number> => {
    const response = await request(app).post('/api/signup').send(signup);

    assert.equal(response.status, 201);

    return response.body.user.id;
};

describe('POST /api/login', () => {

    test('returns a token pair and only public user data', async () => {
        // возвращает пару токенов и только публичные данные пользователя
        const userId = await register();

        // Регистрация приводит email к нижнему регистру, вход обязан делать то же.
        const response = await request(app)
            .post('/api/login')
            .send({ email: 'dARYA@eXAMPLE.TEST', password: signup.password });

        assert.equal(response.status, 200);
        assert.equal(response.type, 'application/json');
        assert.equal(typeof response.body.tokens?.accessToken, 'string');
        assert.equal(typeof response.body.tokens?.refreshToken, 'string');
        // Полное сравнение: в теле нет ни email, ни password_hash, ни лишних полей.
        assert.deepEqual(response.body, {
            tokens: {
                accessToken: response.body.tokens.accessToken,
                refreshToken: response.body.tokens.refreshToken,
            },
            user: { id: userId, name: 'Дарья' },
        });
    });

    test('stores the SHA-256 hash of the refresh token in the user session', async () => {
        // сохраняет SHA-256-хеш refresh-токена в сессии пользователя
        const userId = await register();
        const response = await request(app).post('/api/login')
            .send({ email: signup.email, password: signup.password });
        assert.equal(response.status, 200);

        const tokens = new TokenService(config);
        assert.deepEqual(tokens.verifyAccess(response.body.tokens.accessToken), { userId });
        assert.deepEqual(tokens.verifyRefresh(response.body.tokens.refreshToken), { userId });
        const tokenHash = createHash('sha256').update(response.body.tokens.refreshToken).digest('hex');
        const { rows } = await database.query(
            'select user_id, token_hash, revoked_at from sessions',
        );
        assert.deepEqual(rows, [{ user_id: userId, token_hash: tokenHash, revoked_at: null }]);
    });

    test('gives remembered sessions a longer lifetime', async () => {
        // продлевает срок запоминаемых сессий
        const userId = await register();
        for (const rememberMe of [true, false]) {
            const response = await request(app).post('/api/login')
                .send({ email: signup.email, password: signup.password, rememberMe });
            assert.equal(response.status, 200);
        }
        const { rows } = await database.query<{ expires_at: Date }>(
            'select expires_at from sessions where user_id = $1 order by id',
            [userId],
        );
        assert.equal(rows.length, 2, 'Each login must create a session');
        const [remembered, temporary] = rows;
        assert.ok(remembered && temporary);
        assert.ok(temporary.expires_at.getTime() > Date.now());
        assert.ok(remembered.expires_at > temporary.expires_at, 'rememberMe=false must shorten the session lifetime');
    });

    test('validates login input and returns 401 for a short incorrect password', async () => {
        // проверяет данные входа и возвращает 401 для короткого неверного пароля
        await register();
        for (const body of [{}, { email: 'broken', password: 'secret1' },
            { email: signup.email, password: 123 },
            { email: signup.email, password: signup.password, rememberMe: 'true' }]) {
            const response = await request(app).post('/api/login').send(body);
            assert.equal(response.status, 400);
            assert.equal(response.body.error, true);
        }
        const response = await request(app).post('/api/login').send({ email: signup.email, password: 'x' });
        assert.equal(response.status, 401);
        assert.match(response.body.message, /email or password/i);
    });

    test('answers the same 401 to a wrong password and to an unknown email', async () => {
        // отвечает одинаковым 401 на неверный пароль и на неизвестный email
        await register();

        const wrongPassword = await request(app)
            .post('/api/login')
            .send({ email: signup.email, password: 'another-password' });
        const unknownEmail = await request(app)
            .post('/api/login')
            .send({ email: 'nobody@example.test', password: signup.password });

        for (const response of [wrongPassword, unknownEmail]) {
            assert.equal(response.status, 401);
            assert.equal(response.type, 'application/json');
            assert.equal(response.body.error, true);
            // Подстроку ищет клиент: client/src/components/login.ts.
            assert.match(response.body.message, /email or password/i);
        }

        // Тексты совпадают, иначе по ответу видно, зарегистрирован ли email.
        assert.equal(unknownEmail.body.message, wrongPassword.body.message);
    });
});
