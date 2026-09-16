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

const seedUser = async () => {
    const user = await createUser(database);
    await categories.seedDefaults(user.id);
    return { ...user, auth: bearerAuth(tokens.issueTokenPair(user.id).accessToken) };
};

describe('DELETE /api/categories', () => {
    test('deletes an empty category', async () => {
        // удаляет пустую категорию
        const user = await seedUser();

        for (const type of ['expense', 'income'] as const) {
            const before = await categories.list(user.id, type);
            const category = before.find(({ title }) => title === 'Общее')!;
            const response = await request(app)
                .delete(`/api/categories/${type}/${category.id}`).set(user.auth);

            assert.equal(response.body.error, false);
            assert.deepEqual(await categories.list(user.id, type), before.filter(({ id }) => id !== category.id));
        }
    });

    test('rejects deleting a category with operations and preserves all data', async () => {
        // отклоняет удаление категории с операциями и сохраняет все данные
        const user = await seedUser();
        await database.query(
            `insert into operations (user_id, category_id, type, amount, date)
             select user_id, id, type, 125.50, '2026-09-01'::date
               from categories where user_id = $1 and title = 'Общее'`,
            [user.id],
        );
        const { rows: beforeCategories } = await database.query('select * from categories order by id');
        const { rows: beforeOperations } = await database.query('select * from operations order by id');
        assert.equal(beforeOperations.length, 2);

        for (const operation of beforeOperations) {
            const response = await request(app)
                .delete(`/api/categories/${operation.type}/${operation.category_id}`).set(user.auth);

            assert.equal(response.status, 409);
            const { rows: afterCategories } = await database.query('select * from categories order by id');
            const { rows: afterOperations } = await database.query('select * from operations order by id');
            assert.deepEqual(afterCategories, beforeCategories);
            assert.deepEqual(afterOperations, beforeOperations);
        }
    });
});
