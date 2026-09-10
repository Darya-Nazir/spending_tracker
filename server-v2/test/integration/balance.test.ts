import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';

import { TokenService } from '../../src/modules/identity/auth/token.service.ts';
import { useTestApp } from '../helpers/app.ts';
import { createUser } from '../helpers/factories.ts';
import { bearerAuth } from '../helpers/auth.ts';

const { app, config, database } = useTestApp();
const tokens = new TokenService(config);
const auth = (userId: number) => bearerAuth(tokens.issueTokenPair(userId).accessToken);

test('returns a numeric zero balance for a new user', async () => {
    // возвращает числовой нулевой баланс нового пользователя
    const user = await createUser(database);
    const response = await request(app).get('/api/balance')
        .set(auth(user.id)).expect(200);
    assert.equal(response.type, 'application/json');
    assert.deepEqual(response.body, { balance: 0 });
});

test('reads the starting balance of the authenticated user', async () => {
    // читает стартовый баланс аутентифицированного пользователя
    const owner = await createUser(database, { initialBalance: 123.45 });
    const other = await createUser(database, { initialBalance: 999 });
    const response = await request(app).get(`/api/balance?userId=${other.id}`)
        .set(auth(owner.id)).send({ user: { userId: other.id } }).expect(200);
    assert.deepEqual(response.body, { balance: 123.45 });
});

test('adds income and subtracts expenses using only the owners operations', async () => {
    // суммирует доходы и вычитает расходы только владельца баланса
    const owner = await createUser(database, { initialBalance: 10.1 });
    const other = await createUser(database);
    for (const [userId, type, amount] of [
        [owner.id, 'income', 100.2], [owner.id, 'expense', 130.4], [other.id, 'income', 999],
    ] as const) {
        const result = await database.query<{ id: number }>(
            'insert into finance.categories (user_id, type, title) values ($1, $2, $3) returning id',
            [userId, type, type],
        );
        await database.query(
            'insert into finance.operations (user_id, category_id, type, amount, date) values ($1, $2, $3, $4, current_date)',
            [userId, result.rows[0]!.id, type, amount],
        );
    }
    const response = await request(app).get('/api/balance').set(auth(owner.id)).expect(200);
    assert.deepEqual(response.body, { balance: -20.1 });
});

test('requires authentication on the balance route', async () => {
    // требует аутентификацию на маршруте баланса
    await request(app).get('/api/balance').expect(401);
});

test('returns 404 when the financial account has been deleted', async () => {
    // возвращает 404 после удаления финансового аккаунта
    const user = await createUser(database);
    const header = auth(user.id);
    await database.query('delete from finance.accounts where user_id = $1', [user.id]);
    const response = await request(app).get('/api/balance').set(header).expect(404);
    assert.equal(response.body.error, true);
});
