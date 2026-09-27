import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { CategoryTitleService } from '../../src/modules/categories/category-title.service.ts';
import { useTestDatabase } from '../helpers/db.ts';
import { createUser } from '../helpers/factories.ts';

const { database } = useTestDatabase();

const insertCategory = async (
    userId: number,
    type: string,
    title: string,
): Promise<number> => {
    const { rows } = await database.query<{ id: number }>(
        `INSERT INTO categories (user_id, type, title, title_normalized)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId, type, title, new CategoryTitleService().normalize(title)],
    );
    const category = rows[0];

    assert.ok(category);
    assert.equal(typeof category.id, 'number');
    return category.id;
};

describe('categories schema', () => {

    test('requires a normalized title on insert and update', async () => {
        // требует нормализованное название при создании и обновлении
        const user = await createUser(database);
        await assert.rejects(database.query(
            `INSERT INTO categories (user_id, type, title) VALUES ($1, 'expense', 'Еда')`,
            [user.id],
        ), { code: '23502', column: 'title_normalized' });
        const id = await insertCategory(user.id, 'expense', 'Еда');
        await assert.rejects(database.query(
            'UPDATE categories SET title_normalized = NULL WHERE id = $1', [id],
        ), { code: '23502', column: 'title_normalized' });
    });

    test('uses one full unique index for category titles', async () => {
        // использует один полный уникальный индекс для названий категорий
        const { rows } = await database.query(`
            SELECT indexname, indexdef FROM pg_indexes
            WHERE schemaname = 'public' AND tablename = 'categories'
              AND indexname IN ('categories_user_type_title_lower_unique',
                                'categories_user_type_title_normalized_unique')
        `);
        assert.equal(rows.length, 1);
        assert.ok(rows[0]);
        assert.equal(rows[0].indexname, 'categories_user_type_title_normalized_unique');
        assert.match(rows[0].indexdef, /CREATE UNIQUE INDEX.*\(user_id, type, title_normalized\)$/);
    });

    test('rejects a case-insensitive duplicate within the same user and type', async () => {
        // отвергает Еда и еда внутри одной пары пользователь–тип
        const user = await createUser(database);
        await insertCategory(user.id, 'expense', 'Еда');

        await assert.rejects(
            insertCategory(user.id, 'expense', 'еда'),
            (error: unknown) => {
                assert.equal((error as { code?: string }).code, '23505');
                assert.equal((error as { constraint?: string }).constraint,
                    'categories_user_type_title_normalized_unique');
                return true;
            },
        );
    });

    test('allows the same title for another type or user', async () => {
        // разрешает одно название для другого типа или другого пользователя
        const firstUser = await createUser(database);
        const secondUser = await createUser(database);

        const ids = [
            await insertCategory(firstUser.id, 'expense', 'Общее'),
            await insertCategory(firstUser.id, 'income', 'Общее'),
            await insertCategory(secondUser.id, 'expense', 'Общее'),
        ];

        assert.equal(new Set(ids).size, 3);
    });

    test('rejects a type other than income or expense', async () => {
        // разрешает только типы income и expense
        const user = await createUser(database);

        await assert.rejects(
            insertCategory(user.id, 'transfer', 'Перевод'),
            (error: unknown) => {
                assert.equal((error as { code?: string }).code, '22P02');
                return true;
            },
        );
    });
});
