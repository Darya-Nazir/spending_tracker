import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';

import { useTestApp } from '../../helpers/app.ts';

const { app } = useTestApp();

// Столько неудачных попыток логина в окне ещё проходят как 401; следующая — 429.
const LOGIN_ATTEMPT_LIMIT = 5;

const password = 'secret1';

const register = async (email: string): Promise<void> => {
    const response = await request(app).post('/api/signup')
        .send({ name: 'Test User', email, password, passwordRepeat: password });
    assert.equal(response.status, 201);
};

const failLogin = (email: string) => request(app)
    .post('/api/login')
    .send({ email, password: 'wrong-password' });

describe('rate limiting on /api/login', () => {

    test('blocks the 6th failed attempt in the window with 429 JSON', async () => {
        // 6-я неудачная попытка логина в окне → 429; тело использует ключ message
        const email = 'attacker@example.test';
        await register(email);

        for (let attempt = 1; attempt <= LOGIN_ATTEMPT_LIMIT; attempt += 1) {
            const response = await failLogin(email);
            assert.equal(response.status, 401, `attempt ${attempt} must still be 401`);
        }

        const blocked = await failLogin(email);
        assert.equal(blocked.status, 429);
        assert.equal(blocked.type, 'application/json');
        assert.equal(blocked.body.error, true);
        assert.equal(typeof blocked.body.message, 'string');
    });

    test('keys the limiter by email so a locked account does not block another on the same IP', async () => {
        // лимитер ключуется по email+IP: залоченный аккаунт не блокирует соседний на том же IP
        const locked = 'locked@example.test';
        const neighbor = 'neighbor@example.test';
        await register(locked);
        await register(neighbor);

        for (let attempt = 1; attempt <= LOGIN_ATTEMPT_LIMIT; attempt += 1) {
            await failLogin(locked);
        }
        assert.equal((await failLogin(locked)).status, 429);

        const response = await request(app).post('/api/login').send({ email: neighbor, password });
        assert.equal(response.status, 200, 'a different account on the same IP must still log in');
    });
});

