import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';

import { TokenService } from '../../../src/modules/auth/token.service.ts';
import { CategoryRepository } from '../../../src/modules/categories/category.repository.ts';
import { useTestApp } from '../../helpers/app.ts';
import { bearerAuth } from '../../helpers/auth.ts';
import { createUser } from '../../helpers/factories.ts';

const { app, config, database } = useTestApp();
const tokens = new TokenService(config);
const categories = new CategoryRepository(database);
const authFor = (userId: number) => bearerAuth(tokens.issueTokenPair(userId).accessToken);

const findCategory = async (userId: number, type: 'expense' | 'income', title: string) =>
    (await categories.list(userId, type)).find((category) => category.title === title)!;

describe('POST /api/operations', () => {
    test('creates an operation and returns it with the category title and an empty comment intact', async () => {
        // создаёт операцию и возвращает её с названием категории; пустой comment не отбрасывается
        const user = await createUser(database);
        await categories.seedDefaults(user.id);
        const category = await findCategory(user.id, 'expense', 'Еда');

        const response = await request(app).post('/api/operations').set(authFor(user.id)).send({
            type: 'expense',
            category_id: category.id,
            amount: 30.25,
            date: '2026-02-12',
            comment: '',
        });

        assert.equal(response.status, 201);
        assert.equal(typeof response.body.id, 'number');
        assert.equal(response.body.amount, 30.25);
        assert.equal(typeof response.body.amount, 'number');
        assert.equal(response.body.date, '2026-02-12');
        assert.equal(response.body.comment, '');
        assert.equal(response.body.category, 'Еда');
        assert.equal(response.body.type, 'expense');
    });

    test('rejects a category_id belonging to another user and inserts nothing', async () => {
        // отклоняет category_id чужого пользователя, ничего не вставляет
        const owner = await createUser(database);
        await categories.seedDefaults(owner.id);
        const foreignCategory = await findCategory(owner.id, 'expense', 'Еда');
        const attacker = await createUser(database);

        const response = await request(app).post('/api/operations').set(authFor(attacker.id)).send({
            type: 'expense',
            category_id: foreignCategory.id,
            amount: 100,
            date: '2026-02-12',
        });

        assert.equal(response.status, 404);
        assert.equal(response.body.error, true);
        const { rows } = await database.query('select id from operations where user_id = $1', [attacker.id]);
        assert.deepEqual(rows, []);
    });

    test('rejects a category_id whose type does not match body.type', async () => {
        // отклоняет category_id, чей тип не совпадает с типом в теле запроса
        const user = await createUser(database);
        await categories.seedDefaults(user.id);
        const incomeCategory = await findCategory(user.id, 'income', 'Зарплата');

        const response = await request(app).post('/api/operations').set(authFor(user.id)).send({
            type: 'expense',
            category_id: incomeCategory.id,
            amount: 100,
            date: '2026-02-12',
        });

        assert.equal(response.status, 400);
        assert.equal(response.body.error, true);
    });
});
