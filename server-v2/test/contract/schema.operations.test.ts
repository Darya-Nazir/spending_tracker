import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { useTestDatabase } from '../helpers/db.ts';
import { createUser } from '../helpers/factories.ts';

const { database } = useTestDatabase();

/** Создаёт категорию выбранного владельца и типа. */
const createCategory = async (
    userId: number,
    type: 'expense' | 'income',
    title: string,
): Promise<number> => {
    const { rows } = await database.query<{ id: number }>(
        `insert into finance.categories (user_id, type, title)
         values ($1, $2, $3)
         returning id`,
        [userId, type, title],
    );
    const category = rows[0];
    assert.ok(category);
    return category.id;
};

/** Вставляет операцию без предварительных проверок в коде. */
const insertOperation = (
    userId: number,
    categoryId: number,
    type: 'expense' | 'income',
): Promise<unknown> => database.query(
    `insert into finance.operations (user_id, category_id, type, amount, date, comment)
     values ($1, $2, $3, 100, '2026-09-01', '')`,
    [userId, categoryId, type],
);

/** Ожидает отказ Foreign Key на попытке записи. */
const assertForeignKeyViolation = (attempt: Promise<unknown>): Promise<void> => assert.rejects(
    attempt,
    (error: unknown) => {
        assert.equal((error as { code?: string }).code, '23503');
        return true;
    },
);

describe('operations schema', () => {

    test('rejects deleting a category while an operation references it', async () => {
        // Foreign Key запрещает удалять категорию, пока на неё ссылается операция
        const user = await createUser(database);
        const categoryId = await createCategory(user.id, 'expense', 'Еда');
        await insertOperation(user.id, categoryId, 'expense');

        await assertForeignKeyViolation(
            database.query('delete from finance.categories where id = $1', [categoryId]),
        );
    });

    test('rejects an operation whose category belongs to another user', async () => {
        // отклоняет операцию с категорией другого пользователя
        const owner = await createUser(database);
        const stranger = await createUser(database);
        const categoryId = await createCategory(owner.id, 'expense', 'Еда');

        await assertForeignKeyViolation(insertOperation(stranger.id, categoryId, 'expense'));
    });

    test('rejects an operation whose type differs from its category type', async () => {
        // отклоняет операцию, тип которой не совпадает с типом категории
        const user = await createUser(database);
        const categoryId = await createCategory(user.id, 'expense', 'Еда');

        await assertForeignKeyViolation(insertOperation(user.id, categoryId, 'income'));
    });
});
