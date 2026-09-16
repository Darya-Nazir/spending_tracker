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

const insertOperation = async (
    userId: number, categoryId: number, type: 'expense' | 'income', amount: number,
): Promise<void> => {
    await database.query(
        `insert into operations (user_id, category_id, type, amount, date)
         values ($1, $2, $3, $4, '2026-09-01')`,
        [userId, categoryId, type, amount],
    );
};

const findCategory = async (userId: number, type: 'expense' | 'income', title: string) =>
    (await categories.list(userId, type)).find((category) => category.title === title)!;

describe('DELETE /api/categories/:type/:id/operations', () => {
    test('deletes all operations of a category and keeps the category', async () => {
        // удаляет все операции категории и сохраняет саму категорию
        const user = await createUser(database);
        await categories.seedDefaults(user.id);
        const category = await findCategory(user.id, 'expense', 'Еда');
        await insertOperation(user.id, category.id, 'expense', 100);
        await insertOperation(user.id, category.id, 'expense', 200);

        const response = await request(app)
            .delete(`/api/categories/expense/${category.id}/operations`).set(authFor(user.id));

        assert.equal(response.status, 200);
        const { rows } = await database.query('select id from operations where user_id = $1', [user.id]);
        assert.deepEqual(rows, []);
    });
});

describe('PUT /api/categories/:type/:id/operations', () => {
    test('moves all operations to another category', async () => {
        // переносит все операции в другую категорию
        const user = await createUser(database);
        await categories.seedDefaults(user.id);
        const source = await findCategory(user.id, 'expense', 'Еда');
        const target = await findCategory(user.id, 'expense', 'Кафе');
        await insertOperation(user.id, source.id, 'expense', 100);

        const response = await request(app)
            .put(`/api/categories/expense/${source.id}/operations`)
            .set(authFor(user.id)).send({ targetCategoryId: target.id });

        assert.equal(response.status, 200);
        const { rows } = await database.query('select category_id from operations where user_id = $1', [user.id]);
        assert.deepEqual(rows, [{ category_id: target.id }]);
    });
});
