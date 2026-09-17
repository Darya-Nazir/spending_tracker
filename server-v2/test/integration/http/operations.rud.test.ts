import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';

import { TokenService } from '../../../src/modules/auth/token.service.ts';
import { CategoryRepository } from '../../../src/modules/categories/category.repository.ts';
import { useTestApp } from '../../helpers/app.ts';
import { bearerAuth } from '../../helpers/auth.ts';
import { createUser } from '../../helpers/factories.ts';

// RUD —  Read, Update, Delete. Три операции над одной записью по id, без Create.

const { app, config, database } = useTestApp();
const tokens = new TokenService(config);
const categories = new CategoryRepository(database);
const authFor = (userId: number) => bearerAuth(tokens.issueTokenPair(userId).accessToken);

const findCategory = async (userId: number, type: 'expense' | 'income', title: string) =>
    (await categories.list(userId, type)).find((category) => category.title === title)!;

const seedUser = async (overrides: Parameters<typeof createUser>[1] = {}) => {
    const user = await createUser(database, overrides);
    await categories.seedDefaults(user.id);
    return user;
};

const createOperation = async (
    userId: number,
    body: { type: 'expense' | 'income'; category_id: number; amount: number; date: string; comment?: string },
) => {
    const response = await request(app).post('/api/operations').set(authFor(userId)).send(body);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body;
};

describe('GET/PUT/DELETE /api/operations/:id', () => {
    test('PUT changes type, category, amount, date and comment and returns the normalized operation', async () => {
        // PUT меняет type, category, amount, date и comment и возвращает нормализованный объект
        const user = await seedUser();
        const food = await findCategory(user.id, 'expense', 'Еда');
        const salary = await findCategory(user.id, 'income', 'Зарплата');
        const created = await createOperation(user.id, {
            type: 'expense', category_id: food.id, amount: 30.25, date: '2026-02-12', comment: 'Обед',
        });

        const response = await request(app).put(`/api/operations/${created.id}`).set(authFor(user.id)).send({
            type: 'income', category_id: salary.id, amount: 100.5, date: '2026-03-01', comment: 'Оклад',
        });

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, {
            id: created.id, type: 'income', amount: 100.5, date: '2026-03-01', comment: 'Оклад', category: 'Зарплата',
        });
        const { rows } = await database.query(
            'select type, category_id, amount, date, comment from operations where id = $1', [created.id],
        );
        assert.deepEqual(rows, [{
            type: 'income', category_id: salary.id, amount: 100.5, date: '2026-03-01', comment: 'Оклад',
        }]);
    });

    test('GET /:id on another user operation returns 404', async () => {
        // GET /:id чужой операции → 404
        const owner = await seedUser();
        const food = await findCategory(owner.id, 'expense', 'Еда');
        const created = await createOperation(owner.id, {
            type: 'expense', category_id: food.id, amount: 15, date: '2026-02-12',
        });
        const attacker = await seedUser();

        const response = await request(app).get(`/api/operations/${created.id}`).set(authFor(attacker.id));

        assert.equal(response.status, 404);
        assert.equal(response.body.error, true);
    });

    test('PUT to a non-existent id returns a 404 JSON body', async () => {
        // PUT по несуществующему id → 404 JSON
        const user = await seedUser();
        const food = await findCategory(user.id, 'expense', 'Еда');

        const response = await request(app).put('/api/operations/999999').set(authFor(user.id)).send({
            type: 'expense', category_id: food.id, amount: 10, date: '2026-02-12',
        });

        assert.equal(response.status, 404);
        assert.equal(response.type, 'application/json');
        assert.equal(response.body.error, true);
        assert.ok(response.body.message.trim());
    });

    test('DELETE returns {error:false,message} and the balance is recalculated', async () => {
        // DELETE → 200 {error:false,message}, баланс пересчитан
        const user = await seedUser({ initialBalance: 100 });
        const food = await findCategory(user.id, 'expense', 'Еда');
        const created = await createOperation(user.id, {
            type: 'expense', category_id: food.id, amount: 30.25, date: '2026-02-12',
        });
        const balanceAfterCreate = await request(app).get('/api/balance').set(authFor(user.id));
        assert.deepEqual(balanceAfterCreate.body, { balance: 69.75 });

        const response = await request(app).delete(`/api/operations/${created.id}`).set(authFor(user.id));

        assert.equal(response.status, 200);
        assert.equal(response.body.error, false);
        assert.equal(typeof response.body.message, 'string');
        assert.ok(response.body.message.trim());
        const { rows } = await database.query('select id from operations where id = $1', [created.id]);
        assert.deepEqual(rows, []);
        const balanceAfterDelete = await request(app).get('/api/balance').set(authFor(user.id));
        assert.deepEqual(balanceAfterDelete.body, { balance: 100 });
    });

    test('deleting the same operation twice returns a 404 JSON body on the second call', async () => {
        // DELETE дважды → второй 404 JSON
        const user = await seedUser();
        const food = await findCategory(user.id, 'expense', 'Еда');
        const created = await createOperation(user.id, {
            type: 'expense', category_id: food.id, amount: 10, date: '2026-02-12',
        });

        const first = await request(app).delete(`/api/operations/${created.id}`).set(authFor(user.id));
        const second = await request(app).delete(`/api/operations/${created.id}`).set(authFor(user.id));

        assert.equal(first.status, 200);
        assert.equal(second.status, 404);
        assert.equal(second.type, 'application/json');
        assert.equal(second.body.error, true);
    });
});
